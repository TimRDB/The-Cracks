param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'build-lighting-states.ps1') -ProjectRoot $ProjectRoot | Out-Null

Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class ToasterDiffCheck {
  public static string Check(Bitmap original, Bitmap clean) {
    Rectangle bounds = new Rectangle(0, 0, original.Width, original.Height);
    BitmapData a = original.LockBits(bounds, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    BitmapData b = clean.LockBits(bounds, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    int bytes = Math.Abs(a.Stride) * original.Height;
    byte[] x = new byte[bytes], y = new byte[bytes];
    Marshal.Copy(a.Scan0, x, 0, bytes);
    Marshal.Copy(b.Scan0, y, 0, bytes);
    original.UnlockBits(a);
    clean.UnlockBits(b);
    int count = 0, outside = 0, minX = original.Width, minY = original.Height, maxX = -1, maxY = -1;
    for (int py = 0; py < original.Height; py++) {
      for (int px = 0; px < original.Width; px++) {
        int index = py * a.Stride + px * 4;
        if (x[index] == y[index] && x[index+1] == y[index+1] && x[index+2] == y[index+2] && x[index+3] == y[index+3]) continue;
        count++;
        if (px < 742 || px >= 824 || py < 276 || py >= 358) outside++;
        minX = Math.Min(minX, px); minY = Math.Min(minY, py);
        maxX = Math.Max(maxX, px); maxY = Math.Max(maxY, py);
      }
    }
    return count + "|" + outside + "|" + minX + "," + minY + "," + maxX + "," + maxY;
  }
}
'@ -ReferencedAssemblies System.Drawing

$checked = 0
foreach ($key in $livingSources.Keys) {
  $prepared = [LightingStateBuilder]::Prepare($livingSources[$key], '', 'living', $false)
  foreach ($curtains in @($false, $true)) {
    $main = [int]$key.Substring(0, 1)
    $bench = [int]$key.Substring(1, 1)
    $hall = [int]$key.Substring(2, 1)
    $original = [LightingStateBuilder]::Render($prepared, 'living', $curtains, $false, [bool]$main, [bool]$bench, [bool]$hall)
    $name = 'living-c{0}-m{1}-b{2}-h{3}.png' -f [int]$curtains,$main,$bench,$hall
    $clean = [Drawing.Bitmap]::FromFile((Join-Path $outputRoot $name))
    $result = [ToasterDiffCheck]::Check($original, $clean).Split('|')
    if ([int]$result[0] -le 0 -or [int]$result[1] -ne 0) {
      throw "Pixel-scope failure for $($name): $($result -join '|')"
    }
    $clean.Dispose()
    $original.Dispose()
    $checked++
  }
  $prepared.Dispose()
}

Write-Host "Verified $checked living states: every changed pixel is confined to x=742..823, y=276..357."
