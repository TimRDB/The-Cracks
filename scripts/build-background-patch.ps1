param(
  [Parameter(Mandatory = $true)][string]$Base,
  [Parameter(Mandatory = $true)][string]$Patch,
  [Parameter(Mandatory = $true)][string]$Output,
  [ValidateRange(0, 1)][double]$BlendStart = 0.80,
  [ValidateRange(0, 1)][double]$SolidStart = 0.845,
  [ValidateRange(0, 1)][double]$Sharpen = 0.22
)

$ErrorActionPreference = 'Stop'

$basePath = (Resolve-Path -LiteralPath $Base).Path
$patchPath = (Resolve-Path -LiteralPath $Patch).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)

if ($outputPath -eq $basePath -or $outputPath -eq $patchPath) {
  throw 'Output must be a new file. Master and patch assets are read-only inputs.'
}
if ($SolidStart -le $BlendStart) {
  throw 'SolidStart must be greater than BlendStart.'
}

Add-Type -AssemblyName System.Drawing

if (-not ('BackgroundPatchBuilder' -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class BackgroundPatchBuilder {
  public static void Sharpen(Bitmap bitmap, double amount) {
    if (amount <= 0) return;
    var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
    var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int bytes = Math.Abs(data.Stride) * data.Height;
    byte[] source = new byte[bytes];
    byte[] target = new byte[bytes];
    Marshal.Copy(data.Scan0, source, 0, bytes);
    Buffer.BlockCopy(source, 0, target, 0, bytes);

    for (int y = 1; y < bitmap.Height - 1; y++) {
      for (int x = 1; x < bitmap.Width - 1; x++) {
        int i = y * data.Stride + x * 4;
        for (int channel = 0; channel < 3; channel++) {
          int center = source[i + channel];
          int laplacian = 4 * center
            - source[i - 4 + channel] - source[i + 4 + channel]
            - source[i - data.Stride + channel] - source[i + data.Stride + channel];
          int value = (int)Math.Round(center + amount * laplacian);
          target[i + channel] = (byte)Math.Max(0, Math.Min(255, value));
        }
      }
    }

    Marshal.Copy(target, 0, data.Scan0, bytes);
    bitmap.UnlockBits(data);
  }
}
'@
}

$baseImage = [System.Drawing.Bitmap]::FromFile($basePath)
$patchImage = [System.Drawing.Bitmap]::FromFile($patchPath)
try {
  if ($baseImage.Width -ne $patchImage.Width -or $baseImage.Height -ne $patchImage.Height) {
    throw 'Base and patch images must have identical pixel dimensions.'
  }

  $result = [System.Drawing.Bitmap]::new($baseImage.Width, $baseImage.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [System.Drawing.Graphics]::FromImage($result)
    try {
      $graphics.DrawImageUnscaled($baseImage, 0, 0)
      $blendX = [int]($result.Width * $BlendStart)
      $solidX = [int]($result.Width * $SolidStart)

      for ($x = $blendX; $x -lt $solidX; $x++) {
        $alpha = [single](($x - $blendX) / ($solidX - $blendX))
        $matrix = [System.Drawing.Imaging.ColorMatrix]::new()
        $matrix.Matrix00 = 1
        $matrix.Matrix11 = 1
        $matrix.Matrix22 = 1
        $matrix.Matrix33 = $alpha
        $matrix.Matrix44 = 1
        $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
        try {
          $attributes.SetColorMatrix($matrix)
          $destination = [System.Drawing.Rectangle]::new($x, 0, 1, $result.Height)
          $graphics.DrawImage($patchImage, $destination, $x, 0, 1, $result.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
        } finally {
          $attributes.Dispose()
        }
      }

      $solidDestination = [System.Drawing.Rectangle]::new($solidX, 0, $result.Width - $solidX, $result.Height)
      $graphics.DrawImage($patchImage, $solidDestination, $solidX, 0, $result.Width - $solidX, $result.Height, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }

    [BackgroundPatchBuilder]::Sharpen($result, $Sharpen)
    $result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $result.Dispose()
  }
} finally {
  $baseImage.Dispose()
  $patchImage.Dispose()
}

$written = Get-Item -LiteralPath $outputPath
Write-Output ("Created {0} ({1} bytes) without modifying either source image." -f $written.FullName, $written.Length)
