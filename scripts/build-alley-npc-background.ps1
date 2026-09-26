param(
  [string]$Original = (Join-Path $PSScriptRoot '..\assets\alley-bg-v1.png'),
  [string]$CleanSource = (Join-Path $PSScriptRoot '..\assets\alley-clean-source-v1.png'),
  [string]$Output = (Join-Path $PSScriptRoot '..\assets\alley-bg-npc-v2.png')
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class AlleyNpcBackgroundBuilder {
  static readonly PointF[] Mask = new PointF[] {
    new PointF(805, 365), new PointF(890, 365), new PointF(945, 405),
    new PointF(975, 485), new PointF(970, 565), new PointF(925, 610),
    new PointF(835, 625), new PointF(755, 605), new PointF(720, 550),
    new PointF(735, 475), new PointF(770, 410)
  };

  static bool Inside(float x, float y) {
    bool inside = false;
    for (int i = 0, j = Mask.Length - 1; i < Mask.Length; j = i++) {
      PointF a = Mask[i], b = Mask[j];
      if (((a.Y > y) != (b.Y > y)) &&
          x < (b.X - a.X) * (y - a.Y) / (b.Y - a.Y) + a.X) inside = !inside;
    }
    return inside;
  }

  static float EdgeDistance(float x, float y) {
    float best = float.MaxValue;
    for (int i = 0, j = Mask.Length - 1; i < Mask.Length; j = i++) {
      PointF a = Mask[j], b = Mask[i];
      float dx = b.X - a.X, dy = b.Y - a.Y;
      float t = Math.Max(0, Math.Min(1, ((x - a.X) * dx + (y - a.Y) * dy) / (dx * dx + dy * dy)));
      float px = a.X + dx * t, py = a.Y + dy * t;
      best = Math.Min(best, (float)Math.Sqrt((x - px) * (x - px) + (y - py) * (y - py)));
    }
    return best;
  }

  public static string Build(string originalPath, string cleanPath, string outputPath) {
    using (var original = new Bitmap(originalPath))
    using (var clean = new Bitmap(cleanPath)) {
      if (original.Width != clean.Width || original.Height != clean.Height)
        throw new InvalidOperationException("Both alley sources must have identical native dimensions.");

      var result = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);
      result.SetResolution(original.HorizontalResolution, original.VerticalResolution);
      var rect = new Rectangle(0, 0, original.Width, original.Height);
      var sourceData = original.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var cleanData = clean.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
      var resultData = result.LockBits(rect, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      int stride = Math.Abs(sourceData.Stride), length = stride * original.Height;
      byte[] sourcePixels = new byte[length], cleanPixels = new byte[length], outputPixels = new byte[length];
      Marshal.Copy(sourceData.Scan0, sourcePixels, 0, length);
      Marshal.Copy(cleanData.Scan0, cleanPixels, 0, length);
      Buffer.BlockCopy(sourcePixels, 0, outputPixels, 0, length);

      const float feather = 14f;
      long changed = 0;
      int minX = original.Width, minY = original.Height, maxX = -1, maxY = -1;
      for (int y = 0; y < original.Height; y++) {
        for (int x = 0; x < original.Width; x++) {
          if (!Inside(x + .5f, y + .5f)) continue;
          float mix = Math.Min(1f, EdgeDistance(x + .5f, y + .5f) / feather);
          int index = y * stride + x * 4;
          bool pixelChanged = false;
          for (int channel = 0; channel < 3; channel++) {
            byte value = (byte)Math.Round(sourcePixels[index + channel] * (1f - mix) + cleanPixels[index + channel] * mix);
            pixelChanged |= value != sourcePixels[index + channel];
            outputPixels[index + channel] = value;
          }
          outputPixels[index + 3] = 255;
          if (pixelChanged) {
            changed++;
            minX = Math.Min(minX, x); minY = Math.Min(minY, y);
            maxX = Math.Max(maxX, x); maxY = Math.Max(maxY, y);
          }
        }
      }

      Marshal.Copy(outputPixels, 0, resultData.Scan0, length);
      original.UnlockBits(sourceData);
      clean.UnlockBits(cleanData);
      result.UnlockBits(resultData);
      result.Save(outputPath, ImageFormat.Png);
      return String.Format("changed={0}; bounds={1},{2}-{3},{4}; canvas={5}x{6}",
        changed, minX, minY, maxX, maxY, original.Width, original.Height);
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

$originalPath = [System.IO.Path]::GetFullPath($Original)
$cleanPath = [System.IO.Path]::GetFullPath($CleanSource)
$outputPath = [System.IO.Path]::GetFullPath($Output)
[AlleyNpcBackgroundBuilder]::Build($originalPath, $cleanPath, $outputPath)
