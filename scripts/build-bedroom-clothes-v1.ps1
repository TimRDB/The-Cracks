param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$type = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

public static class BedroomClothesBuilder {
  static byte Clamp(double value) {
    return (byte)Math.Max(0, Math.Min(255, (int)Math.Round(value)));
  }

  public static Bitmap ExtractChromaKey(string path) {
    using (Bitmap keyed = new Bitmap(path)) {
      // The generated key plate is nearly uniform. Averaging the four corners
      // avoids baking its tiny compression variation into the garment edge.
      Color[] corners = {
        keyed.GetPixel(0, 0), keyed.GetPixel(keyed.Width - 1, 0),
        keyed.GetPixel(0, keyed.Height - 1), keyed.GetPixel(keyed.Width - 1, keyed.Height - 1)
      };
      double keyR = 0, keyG = 0, keyB = 0;
      foreach (Color c in corners) { keyR += c.R; keyG += c.G; keyB += c.B; }
      keyR /= 4; keyG /= 4; keyB /= 4;

      Bitmap full = new Bitmap(keyed.Width, keyed.Height, PixelFormat.Format32bppArgb);
      int minX = keyed.Width, minY = keyed.Height, maxX = -1, maxY = -1;
      for (int y = 0; y < keyed.Height; y++) {
        for (int x = 0; x < keyed.Width; x++) {
          Color c = keyed.GetPixel(x, y);
          double distance = Math.Sqrt(
            (c.R - keyR) * (c.R - keyR) +
            (c.G - keyG) * (c.G - keyG) +
            (c.B - keyB) * (c.B - keyB));
          // Key noise stays below 18; a 75-value feather retains the original
          // antialiasing while removing the green plate and its edge spill.
          double alpha = Math.Max(0, Math.Min(1, (distance - 18) / 75));
          if (alpha <= .06) { full.SetPixel(x, y, Color.Transparent); continue; }
          double inv = 1 - alpha;
          byte r = Clamp((c.R - inv * keyR) / alpha);
          byte g = Clamp((c.G - inv * keyG) / alpha);
          byte b = Clamp((c.B - inv * keyB) / alpha);
          byte a = Clamp(alpha * 255);
          full.SetPixel(x, y, Color.FromArgb(a, r, g, b));
          if (a > 32) { minX = Math.Min(minX, x); minY = Math.Min(minY, y); maxX = Math.Max(maxX, x); maxY = Math.Max(maxY, y); }
        }
      }
      if (maxX < minX || maxY < minY) throw new InvalidDataException("No foreground found on the chroma-key plate.");
      const int padding = 24;
      Rectangle crop = Rectangle.FromLTRB(
        Math.Max(0, minX - padding), Math.Max(0, minY - padding),
        Math.Min(full.Width, maxX + padding + 1), Math.Min(full.Height, maxY + padding + 1));
      Bitmap result = full.Clone(crop, PixelFormat.Format32bppArgb);
      full.Dispose();
      return result;
    }
  }

  public static double[] AverageFloor(string path) {
    using (Bitmap room = new Bitmap(path)) {
      int left = (int)Math.Round(room.Width * .205);
      int top = (int)Math.Round(room.Height * .665);
      int right = (int)Math.Round(room.Width * .385);
      int bottom = (int)Math.Round(room.Height * .825);
      double r = 0, g = 0, b = 0, count = 0;
      // Sparse regular sampling is deterministic and averages the carpet weave.
      for (int y = top; y < bottom; y += 3) {
        for (int x = left; x < right; x += 3) {
          Color c = room.GetPixel(x, y);
          r += c.R; g += c.G; b += c.B; count++;
        }
      }
      return new double[] { r / count, g / count, b / count };
    }
  }

  public static Bitmap Light(Bitmap source, double red, double green, double blue) {
    Bitmap result = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb);
    for (int y = 0; y < source.Height; y++) {
      for (int x = 0; x < source.Width; x++) {
        Color c = source.GetPixel(x, y);
        if (c.A == 0) { result.SetPixel(x, y, Color.Transparent); continue; }
        result.SetPixel(x, y, Color.FromArgb(c.A, Clamp(c.R * red), Clamp(c.G * green), Clamp(c.B * blue)));
      }
    }
    return result;
  }
}
'@

Add-Type -TypeDefinition $type -ReferencedAssemblies System.Drawing

$keyPath = Join-Path $ProjectRoot 'assets\bedroom-crumpled-clothes-key-v1.png'
$basePath = Join-Path $ProjectRoot 'assets\bedroom-crumpled-clothes-v1.png'
$roomRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-states-v14'
$outputRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-clothes-v1'
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null

$base = [BedroomClothesBuilder]::ExtractChromaKey($keyPath)
$base.Save($basePath, [Drawing.Imaging.ImageFormat]::Png)
$reference = [BedroomClothesBuilder]::AverageFloor((Join-Path $roomRoot 'bedroom-c1-l1-m1.png'))

foreach ($curtains in 0,1) {
  foreach ($lamp in 0,1) {
    foreach ($main in 0,1) {
      $name = "bedroom-c$curtains-l$lamp-m$main.png"
      $sample = [BedroomClothesBuilder]::AverageFloor((Join-Path $roomRoot $name))
      $red = [Math]::Max(.30, [Math]::Min(1.08, $sample[0] / $reference[0]))
      $green = [Math]::Max(.30, [Math]::Min(1.08, $sample[1] / $reference[1]))
      $blue = [Math]::Max(.30, [Math]::Min(1.08, $sample[2] / $reference[2]))
      $rendered = [BedroomClothesBuilder]::Light($base, $red, $green, $blue)
      $rendered.Save((Join-Path $outputRoot $name), [Drawing.Imaging.ImageFormat]::Png)
      $rendered.Dispose()
      Write-Host "$name floor RGB $([Math]::Round($sample[0],1)),$([Math]::Round($sample[1],1)),$([Math]::Round($sample[2],1)) scale $([Math]::Round($red,3)),$([Math]::Round($green,3)),$([Math]::Round($blue,3))"
    }
  }
}

$base.Dispose()
Write-Host "Built the transparent clothes prop and 8 bedroom-light variants in $outputRoot"
