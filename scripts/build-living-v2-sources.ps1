param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [string]$RefreshFieldsFrom = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$type = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class LivingV2SourceBuilder {
  static int Clamp(int value, int minimum, int maximum) {
    return Math.Max(minimum, Math.Min(maximum, value));
  }

  static Bitmap Resize(Bitmap source, int width, int height) {
    Bitmap result = new Bitmap(width, height, PixelFormat.Format32bppArgb);
    using (Graphics graphics = Graphics.FromImage(result)) {
      graphics.CompositingQuality = CompositingQuality.HighQuality;
      graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
      graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
      // Bicubic sampling reaches beyond the source at the canvas boundary.
      // Mirroring real edge pixels prevents transparent-black samples from
      // producing a four-sided illumination seam after the field is enlarged.
      using (ImageAttributes attributes = new ImageAttributes()) {
        attributes.SetWrapMode(WrapMode.TileFlipXY);
        graphics.DrawImage(source, new Rectangle(0, 0, width, height),
          0, 0, source.Width, source.Height, GraphicsUnit.Pixel, attributes);
      }
    }
    return result;
  }

  static double SmoothStep(double edge0, double edge1, double value) {
    double t = Math.Max(0, Math.Min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  static double SoftBox(double value, double minimum, double maximum, double feather) {
    return SmoothStep(minimum, minimum + feather, value)
      * (1 - SmoothStep(maximum - feather, maximum, value));
  }

  static double HallStrength(double x, double y) {
    // Keep a restrained pool of light within the recessed hall while removing
    // most of its broad spill across the main room. Extra feathered reductions
    // protect the kitchen bench and bathroom door without creating mask edges.
    double hallway = SmoothStep(.78, .87, x);
    double strength = .35 + .37 * hallway;
    double bathroomDoor = SoftBox(x, .655, .805, .035) * SoftBox(y, .08, .61, .06);
    double kitchenBench = SoftBox(x, .25, .69, .06) * SoftBox(y, .16, .62, .08);
    strength *= 1 - .58 * bathroomDoor;
    strength *= 1 - .42 * kitchenBench;
    return strength;
  }

  static double BenchStrength(double x, double y) {
    // The countertop blocks most downward spill across the green cabinetry.
    // Keep the transition feathered at the worktop edge, strongly reduce the
    // unrelated bathroom-door wash, and preserve the useful coffee-table glow.
    double underBench = SoftBox(x, .43, .675, .025)
      * SmoothStep(.365, .39, y)
      * (1 - SmoothStep(.64, .68, y));
    double bathroomDoor = SoftBox(x, .655, .805, .035) * SoftBox(y, .08, .61, .06);
    double coffeeTable = SoftBox(x, .40, .65, .025) * SoftBox(y, .58, .76, .025);
    double strength = 1;
    strength *= 1 - .92 * underBench;
    strength *= 1 - .75 * bathroomDoor;
    strength += (1 - strength) * coffeeTable;
    return strength;
  }

  static double BenchRightSpread(double x, double y) {
    return SoftBox(x, .57, .70, .025) * SoftBox(y, .19, .41, .035);
  }

  static double MainStrength(double x, double y) {
    // Remove the main ceiling light's pale wash from the same green drawer
    // faces while leaving the benchtop, floor and foreground illumination alone.
    double underBench = SoftBox(x, .43, .675, .025)
      * SmoothStep(.365, .39, y)
      * (1 - SmoothStep(.55, .59, y));
    return 1 - .75 * underBench;
  }

  static double ExtendPositiveDelta(double current, double sample, double amount) {
    return sample > current && sample > 0 ? current + (sample - current) * amount : current;
  }

  static void IlluminateMainBulb(Bitmap output) {
    // Fill only the exposed glass globe. Its core is deliberately opaque like
    // the bedroom bulb, while a two-pixel feather preserves the painted rim.
    const double centerX = 832;
    const double centerY = 62.5;
    const double radiusX = 9;
    const double radiusY = 10.5;
    // y=55 is immediately below the shade's painted lower rim. Starting there
    // keeps the upper globe hidden behind that rim instead of painting over it.
    for (int y = 55; y <= 73; y++) {
      for (int x = 823; x <= 841; x++) {
        double dx = (x - centerX) / radiusX;
        double dy = (y - centerY) / radiusY;
        double distance = Math.Sqrt(dx * dx + dy * dy);
        if (distance >= 1) continue;
        double amount = .97 * (1 - SmoothStep(.78, 1, distance));
        Color from = output.GetPixel(x, y);
        int r = Clamp((int)Math.Round(from.R + (255 - from.R) * amount), 0, 255);
        int g = Clamp((int)Math.Round(from.G + (244 - from.G) * amount), 0, 255);
        int b = Clamp((int)Math.Round(from.B + (205 - from.B) * amount), 0, 255);
        output.SetPixel(x, y, Color.FromArgb(from.A, r, g, b));
      }
    }
  }

  public static void BuildField(string[] onPaths, string[] offPaths, string output, int width, int height) {
    if (onPaths.Length != offPaths.Length || onPaths.Length == 0) throw new ArgumentException("Lighting reference pairs are required.");
    Bitmap field = new Bitmap(width, height, PixelFormat.Format32bppArgb);
    var onImages = new List<Bitmap>();
    var offImages = new List<Bitmap>();
    try {
      for (int i = 0; i < onPaths.Length; i++) {
        using (Bitmap on = new Bitmap(onPaths[i]))
        using (Bitmap off = new Bitmap(offPaths[i])) {
          onImages.Add(Resize(on, width, height));
          offImages.Add(Resize(off, width, height));
        }
      }
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          double dr = 0, dg = 0, db = 0;
          for (int i = 0; i < onImages.Count; i++) {
            Color on = onImages[i].GetPixel(x, y);
            Color off = offImages[i].GetPixel(x, y);
            dr += on.R - off.R;
            dg += on.G - off.G;
            db += on.B - off.B;
          }
          int r = Clamp(128 + (int)Math.Round(dr / onImages.Count), 8, 248);
          int g = Clamp(128 + (int)Math.Round(dg / onImages.Count), 8, 248);
          int b = Clamp(128 + (int)Math.Round(db / onImages.Count), 8, 248);
          field.SetPixel(x, y, Color.FromArgb(255, r, g, b));
        }
      }
      field.Save(output, ImageFormat.Png);
    } finally {
      field.Dispose();
      foreach (Bitmap image in onImages) image.Dispose();
      foreach (Bitmap image in offImages) image.Dispose();
    }
  }

  public static Bitmap ApplyPatch(string sourcePath, string patchPath, int left, int top, int feather) {
    using (Bitmap source = new Bitmap(sourcePath))
    using (Bitmap patch = new Bitmap(patchPath)) {
      Bitmap result = source.Clone(new Rectangle(0, 0, source.Width, source.Height), PixelFormat.Format32bppArgb);
      for (int py = 0; py < patch.Height; py++) {
        for (int px = 0; px < patch.Width; px++) {
          int edge = Math.Min(Math.Min(px, patch.Width - 1 - px), Math.Min(py, patch.Height - 1 - py));
          double amount = feather <= 0 ? 1 : Math.Max(0, Math.Min(1, (double)edge / feather));
          amount = amount * amount * (3 - 2 * amount);
          if (amount <= 0) continue;
          Color from = result.GetPixel(left + px, top + py);
          Color to = patch.GetPixel(px, py);
          int r = Clamp((int)Math.Round(from.R + (to.R - from.R) * amount), 0, 255);
          int g = Clamp((int)Math.Round(from.G + (to.G - from.G) * amount), 0, 255);
          int b = Clamp((int)Math.Round(from.B + (to.B - from.B) * amount), 0, 255);
          result.SetPixel(left + px, top + py, Color.FromArgb(from.A, r, g, b));
        }
      }
      return result;
    }
  }

  public static Bitmap Relight(Bitmap source, string[] fieldPaths) {
    Bitmap output = source.Clone(new Rectangle(0, 0, source.Width, source.Height), PixelFormat.Format32bppArgb);
    if (fieldPaths.Length == 0) return output;
    var fields = new List<Bitmap>();
    var hallFields = new List<bool>();
    var benchFields = new List<bool>();
    var mainFields = new List<bool>();
    try {
      foreach (string path in fieldPaths) {
        using (Bitmap small = new Bitmap(path)) fields.Add(Resize(small, source.Width, source.Height));
        hallFields.Add(String.Equals(Path.GetFileName(path), "hall.png", StringComparison.OrdinalIgnoreCase));
        benchFields.Add(String.Equals(Path.GetFileName(path), "bench.png", StringComparison.OrdinalIgnoreCase));
        mainFields.Add(String.Equals(Path.GetFileName(path), "main.png", StringComparison.OrdinalIgnoreCase));
      }
      Rectangle bounds = new Rectangle(0, 0, output.Width, output.Height);
      BitmapData targetData = output.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      int bytes = Math.Abs(targetData.Stride) * output.Height;
      byte[] target = new byte[bytes];
      Marshal.Copy(targetData.Scan0, target, 0, bytes);
      var fieldBytes = new List<byte[]>();
      var fieldData = new List<BitmapData>();
      foreach (Bitmap field in fields) {
        BitmapData data = field.LockBits(bounds, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] pixels = new byte[bytes];
        Marshal.Copy(data.Scan0, pixels, 0, bytes);
        fieldData.Add(data);
        fieldBytes.Add(pixels);
      }
      for (int y = 0; y < output.Height; y++) {
        for (int x = 0; x < output.Width; x++) {
          int index = y * targetData.Stride + x * 4;
          int db = 0, dg = 0, dr = 0;
          for (int fieldIndex = 0; fieldIndex < fieldBytes.Count; fieldIndex++) {
            byte[] pixels = fieldBytes[fieldIndex];
            double normalizedX = (double)x / (output.Width - 1);
            double normalizedY = (double)y / (output.Height - 1);
            double strength = hallFields[fieldIndex]
              ? HallStrength(normalizedX, normalizedY)
              : benchFields[fieldIndex] ? BenchStrength(normalizedX, normalizedY)
              : mainFields[fieldIndex] ? MainStrength(normalizedX, normalizedY) : 1;
            double fieldB = pixels[index] - 128;
            double fieldG = pixels[index+1] - 128;
            double fieldR = pixels[index+2] - 128;
            if (benchFields[fieldIndex]) {
              double spread = BenchRightSpread(normalizedX, normalizedY);
              int sampleX = Math.Max(0, x - (int)Math.Round(output.Width * .025));
              int sampleIndex = y * targetData.Stride + sampleX * 4;
              fieldB = ExtendPositiveDelta(fieldB, pixels[sampleIndex] - 128, .42 * spread);
              fieldG = ExtendPositiveDelta(fieldG, pixels[sampleIndex+1] - 128, .42 * spread);
              fieldR = ExtendPositiveDelta(fieldR, pixels[sampleIndex+2] - 128, .42 * spread);
            }
            db += (int)Math.Round(fieldB * strength);
            dg += (int)Math.Round(fieldG * strength);
            dr += (int)Math.Round(fieldR * strength);
          }
          target[index] = (byte)Clamp(target[index] + db, 0, 255);
          target[index+1] = (byte)Clamp(target[index+1] + dg, 0, 255);
          target[index+2] = (byte)Clamp(target[index+2] + dr, 0, 255);
        }
      }
      Marshal.Copy(target, 0, targetData.Scan0, bytes);
      output.UnlockBits(targetData);
      for (int i = 0; i < fields.Count; i++) fields[i].UnlockBits(fieldData[i]);
      if (mainFields.Contains(true)) IlluminateMainBulb(output);
      return output;
    } finally {
      foreach (Bitmap field in fields) field.Dispose();
    }
  }

  public static Bitmap Crop(Bitmap source, int left, int top, int width, int height) {
    return source.Clone(new Rectangle(left, top, width, height), PixelFormat.Format32bppArgb);
  }
}
'@

Add-Type -TypeDefinition $type -ReferencedAssemblies System.Drawing

$lightingRoot = Join-Path $ProjectRoot 'assets\lighting'
$masterPath = Join-Path $lightingRoot 'living-master-v2.png'
$cleanPatchPath = Join-Path $lightingRoot 'living-master-v2-clean-patch.png'
$fieldRoot = Join-Path $lightingRoot 'living-light-fields-v2'
$sourceRoot = Join-Path $lightingRoot 'living-source-states-v2'
$cleanPatchRoot = Join-Path $lightingRoot 'toaster-clean-patches-v2'
New-Item -ItemType Directory -Force -Path $fieldRoot,$sourceRoot,$cleanPatchRoot | Out-Null

if ($RefreshFieldsFrom) {
  $referenceRoot = (Resolve-Path $RefreshFieldsFrom).Path
  $path = { param($key) Join-Path $referenceRoot "living-m$($key.Substring(0,1))-b$($key.Substring(1,1))-h$($key.Substring(2,1)).png" }
  [LivingV2SourceBuilder]::BuildField(
    @((&$path '100'),(&$path '101'),(&$path '110'),(&$path '111')),
    @((&$path '000'),(&$path '001'),(&$path '010'),(&$path '011')),
    (Join-Path $fieldRoot 'main.png'), 96, 54)
  [LivingV2SourceBuilder]::BuildField(
    @((&$path '010'),(&$path '011'),(&$path '110'),(&$path '111')),
    @((&$path '000'),(&$path '001'),(&$path '100'),(&$path '101')),
    (Join-Path $fieldRoot 'bench.png'), 96, 54)
  [LivingV2SourceBuilder]::BuildField(
    @((&$path '001'),(&$path '011'),(&$path '101'),(&$path '111')),
    @((&$path '000'),(&$path '010'),(&$path '100'),(&$path '110')),
    (Join-Path $fieldRoot 'hall.png'), 96, 54)
}

foreach ($required in @('main.png','bench.png','hall.png')) {
  if (-not (Test-Path -LiteralPath (Join-Path $fieldRoot $required))) {
    throw "Missing living light field $required. Supply -RefreshFieldsFrom once to create it."
  }
}

$master = [Drawing.Bitmap]::FromFile($masterPath)
$cleanMaster = [LivingV2SourceBuilder]::ApplyPatch($masterPath, $cleanPatchPath, 742, 276, 4)
try {
  foreach ($main in @($false,$true)) {
    foreach ($bench in @($false,$true)) {
      foreach ($hall in @($false,$true)) {
        $fields = @()
        if ($main) { $fields += (Join-Path $fieldRoot 'main.png') }
        if ($bench) { $fields += (Join-Path $fieldRoot 'bench.png') }
        if ($hall) { $fields += (Join-Path $fieldRoot 'hall.png') }
        $name = 'living-m{0}-b{1}-h{2}.png' -f [int]$main,[int]$bench,[int]$hall
        $source = [LivingV2SourceBuilder]::Relight($master, $fields)
        $source.Save((Join-Path $sourceRoot $name), [Drawing.Imaging.ImageFormat]::Png)
        $source.Dispose()
        $clean = [LivingV2SourceBuilder]::Relight($cleanMaster, $fields)
        $patch = [LivingV2SourceBuilder]::Crop($clean, 742, 276, 82, 82)
        $patch.Save((Join-Path $cleanPatchRoot $name), [Drawing.Imaging.ImageFormat]::Png)
        $patch.Dispose()
        $clean.Dispose()
      }
    }
  }
} finally {
  $master.Dispose()
  $cleanMaster.Dispose()
}

Write-Host "Built eight fixed-geometry living-room source states and clean toaster patches."
