param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\bedroom_player.png'),
  [string]$Output = (Join-Path $PSScriptRoot '..\assets\player-sheet-keyed-v1.png')
)

$ErrorActionPreference = 'Stop'

# Bakes the former runtime SVG chroma key (#sprite-green-key) into the sheet.
# That filter set alpha to 4R - 8G + 4B + A and then thresholded it at one
# half, so a pixel was kept exactly when 4R - 8G + 4B + A >= 127.5 (0-255).
# Applying the same rule once, at native resolution, removes the live filter
# that had to re-render the character on every pose, size and room change.
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class PlayerSheetKeyer {
  public static string Build(string sourcePath, string outputPath) {
    using (var loaded = new Bitmap(sourcePath))
    using (var sheet = loaded.Clone(new Rectangle(0, 0, loaded.Width, loaded.Height), PixelFormat.Format32bppArgb)) {
      var bounds = new Rectangle(0, 0, sheet.Width, sheet.Height);
      var data = sheet.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var pixels = new byte[data.Stride * sheet.Height];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      int kept = 0, removed = 0;
      for (int y = 0; y < sheet.Height; y++) {
        for (int x = 0; x < sheet.Width; x++) {
          int i = y * data.Stride + x * 4;
          int b = pixels[i], g = pixels[i + 1], r = pixels[i + 2], a = pixels[i + 3];
          if (4 * r - 8 * g + 4 * b + a >= 127.5) { pixels[i + 3] = 255; kept++; }
          else { pixels[i] = pixels[i + 1] = pixels[i + 2] = pixels[i + 3] = 0; removed++; }
        }
      }
      Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
      sheet.UnlockBits(data);
      sheet.Save(outputPath, ImageFormat.Png);
      return String.Format("{0}x{1}: kept {2}, keyed out {3}", sheet.Width, sheet.Height, kept, removed);
    }
  }
}
'@

[PlayerSheetKeyer]::Build((Resolve-Path $Source).Path, [IO.Path]::GetFullPath($Output))
