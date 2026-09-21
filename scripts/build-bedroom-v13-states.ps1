param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$type = @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class BedroomV13Builder {
  static int Clamp(double value) {
    return Math.Max(0, Math.Min(255, (int)Math.Round(value)));
  }

  public static Bitmap CompositeChair(string sourcePath, string chairPath, bool illuminateCushion) {
    using (Bitmap source = new Bitmap(sourcePath))
    using (Bitmap chair = new Bitmap(chairPath)) {
      Bitmap output = source.Clone(new Rectangle(0, 0, source.Width, source.Height), PixelFormat.Format32bppArgb);

      if (illuminateCushion) {
        int shadeBottom = (int)Math.Round(chair.Height * .30);
        for (int y = 0; y < shadeBottom; y++) {
          for (int x = 0; x < chair.Width; x++) {
            Color color = chair.GetPixel(x, y);
            if (color.A < 8) continue;
            chair.SetPixel(x, y, Color.FromArgb(
              color.A,
              Clamp(color.R * 1.08 + 42),
              Clamp(color.G * 1.02 + 25),
              Clamp(color.B * .88 + 5)
            ));
          }
        }
      }

      using (Graphics graphics = Graphics.FromImage(output)) {
        graphics.CompositingMode = CompositingMode.SourceOver;
        graphics.CompositingQuality = CompositingQuality.HighQuality;
        graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
        graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
        int width = Math.Max(1, (int)Math.Round(output.Width * .122));
        int naturalHeight = Math.Max(1, (int)Math.Round(width * (double)chair.Height / chair.Width));
        int height = Math.Max(1, (int)Math.Round(naturalHeight * 1.10));
        int left = (int)Math.Round(output.Width * .545);
        int top = (int)Math.Round(output.Height * .652);

        int firstOpaqueRow = 0;
        bool found = false;
        for (int y = 0; y < chair.Height && !found; y++) {
          for (int x = 0; x < chair.Width; x++) {
            if (chair.GetPixel(x, y).A >= 8) {
              firstOpaqueRow = y;
              found = true;
              break;
            }
          }
        }
        top -= (int)Math.Round((height - naturalHeight) * (double)firstOpaqueRow / chair.Height);
        graphics.DrawImage(chair, new Rectangle(left, top, width, height));
      }
      return output;
    }
  }

  public static void ApplyClosedCurtainAmbient(Bitmap bitmap) {
    Rectangle bounds = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
    BitmapData data = bitmap.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int bytes = Math.Abs(data.Stride) * bitmap.Height;
    byte[] pixels = new byte[bytes];
    Marshal.Copy(data.Scan0, pixels, 0, bytes);
    for (int y = 0; y < bitmap.Height; y++) {
      for (int x = 0; x < bitmap.Width; x++) {
        int index = y * data.Stride + x * 4;
        if (pixels[index + 3] == 0) continue;
        pixels[index] = (byte)Clamp(pixels[index] * .78);
        pixels[index + 1] = (byte)Clamp(pixels[index + 1] * .78);
        pixels[index + 2] = (byte)Clamp(pixels[index + 2] * .78);
      }
    }
    Marshal.Copy(pixels, 0, data.Scan0, bytes);
    bitmap.UnlockBits(data);
  }
}
'@

Add-Type -TypeDefinition $type -ReferencedAssemblies System.Drawing

$lightingRoot = Join-Path $ProjectRoot 'assets\lighting'
$sourceRoot = Join-Path $lightingRoot 'bedroom-source-v13'
$outputRoot = Join-Path $lightingRoot 'bedroom-states-v13'
$chairPath = Join-Path $lightingRoot 'bedroom-stool.png'
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null

foreach ($curtains in 0,1) {
  foreach ($lamp in 0,1) {
    foreach ($main in 0,1) {
      $sourceName = "bedroom-c1-l$lamp-m$main.png"
      $sourcePath = Join-Path $sourceRoot $sourceName
      if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Missing v13 source: $sourcePath" }

      $rendered = [BedroomV13Builder]::CompositeChair($sourcePath, $chairPath, ($lamp -eq 1 -or $main -eq 1))
      if ($curtains -eq 0) { [BedroomV13Builder]::ApplyClosedCurtainAmbient($rendered) }
      $name = "bedroom-c$curtains-l$lamp-m$main.png"
      $rendered.Save((Join-Path $outputRoot $name), [Drawing.Imaging.ImageFormat]::Png)
      $rendered.Dispose()
    }
  }
}

Write-Host "Built 8 regenerated bedroom states in $outputRoot"
