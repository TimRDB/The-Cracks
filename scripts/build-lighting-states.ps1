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

public static class LightingStateBuilder {
  static double Clamp(double value, double minimum, double maximum) {
    return Math.Max(minimum, Math.Min(maximum, value));
  }

  static Bitmap PrepareBitmap(Bitmap original, string fixture, string room, bool fixtureOn) {
    Bitmap result = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb);
    using (Graphics graphics = Graphics.FromImage(result)) {
      graphics.CompositingMode = CompositingMode.SourceOver;
      graphics.CompositingQuality = CompositingQuality.HighQuality;
      graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
      graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
      graphics.DrawImageUnscaled(original, 0, 0);
      if (!String.IsNullOrEmpty(fixture)) {
        if (room == "bedroom") DrawPercent(graphics, fixture, 54.5, 65.2, 12.2, fixtureOn, 1.10);
      }
    }
    return result;
  }

  public static Bitmap Prepare(string source, string fixture, string room, bool fixtureOn) {
    using (Bitmap original = new Bitmap(source)) {
      return PrepareBitmap(original, fixture, room, fixtureOn);
    }
  }

  public static Bitmap PreparePatched(string source, string patchPath, string fixture, string room, bool fixtureOn, int left, int top, int feather) {
    using (Bitmap original = new Bitmap(source))
    using (Bitmap patch = new Bitmap(patchPath))
    using (Bitmap clean = original.Clone(new Rectangle(0, 0, original.Width, original.Height), PixelFormat.Format32bppArgb)) {
      for (int py = 0; py < patch.Height; py++) {
        for (int px = 0; px < patch.Width; px++) {
          int edge = Math.Min(Math.Min(px, patch.Width - 1 - px), Math.Min(py, patch.Height - 1 - py));
          double amount = feather <= 0 ? 1 : Clamp((double)edge / feather, 0, 1);
          amount = amount * amount * (3 - 2 * amount);
          if (amount <= 0) continue;
          Color from = clean.GetPixel(left + px, top + py);
          Color to = patch.GetPixel(px, py);
          int r = (int)Math.Round(from.R + (to.R - from.R) * amount);
          int g = (int)Math.Round(from.G + (to.G - from.G) * amount);
          int b = (int)Math.Round(from.B + (to.B - from.B) * amount);
          clean.SetPixel(left + px, top + py, Color.FromArgb(from.A, r, g, b));
        }
      }
      return PrepareBitmap(clean, fixture, room, fixtureOn);
    }
  }

  public static Bitmap Crop(Bitmap source, int left, int top, int width, int height) {
    return source.Clone(new Rectangle(left, top, width, height), PixelFormat.Format32bppArgb);
  }

  static void DrawPercent(Graphics graphics, string path, double left, double top, double width, bool illuminateShade) {
    DrawPercent(graphics, path, left, top, width, illuminateShade, 1.0);
  }

  static void DrawPercent(Graphics graphics, string path, double left, double top, double width, bool illuminateShade, double heightScale) {
    using (Bitmap sprite = new Bitmap(path)) {
      if (illuminateShade) {
        int shadeBottom = (int)Math.Round(sprite.Height*.30);
        for (int shadeY = 0; shadeY < shadeBottom; shadeY++) {
          for (int shadeX = 0; shadeX < sprite.Width; shadeX++) {
            Color color = sprite.GetPixel(shadeX,shadeY);
            if (color.A < 8) continue;
            int r = (int)Clamp(color.R*1.08 + 42, 0, 255);
            int g = (int)Clamp(color.G*1.02 + 25, 0, 255);
            int b = (int)Clamp(color.B*.88 + 5, 0, 255);
            sprite.SetPixel(shadeX,shadeY,Color.FromArgb(color.A,r,g,b));
          }
        }
      }
      int targetWidth = Math.Max(1, (int)Math.Round(graphics.VisibleClipBounds.Width * width / 100));
      int naturalHeight = Math.Max(1, (int)Math.Round(targetWidth * (double)sprite.Height / sprite.Width));
      int targetHeight = Math.Max(1, (int)Math.Round(naturalHeight * heightScale));
      int x = (int)Math.Round(graphics.VisibleClipBounds.Width * left / 100);
      int y = (int)Math.Round(graphics.VisibleClipBounds.Height * top / 100);
      if (heightScale != 1.0) {
        int firstOpaqueRow = 0;
        bool foundOpaqueRow = false;
        for (int spriteY = 0; spriteY < sprite.Height && !foundOpaqueRow; spriteY++) {
          for (int spriteX = 0; spriteX < sprite.Width; spriteX++) {
            if (sprite.GetPixel(spriteX, spriteY).A >= 8) {
              firstOpaqueRow = spriteY;
              foundOpaqueRow = true;
              break;
            }
          }
        }
        y -= (int)Math.Round((targetHeight-naturalHeight) * (double)firstOpaqueRow / sprite.Height);
      }
      graphics.DrawImage(sprite, new Rectangle(x, y, targetWidth, targetHeight));
    }
  }

  public static Bitmap Render(Bitmap prepared, string room, bool curtains, bool lamp, bool main, bool bench, bool hall) {
    Bitmap output = prepared.Clone(new Rectangle(0, 0, prepared.Width, prepared.Height), PixelFormat.Format32bppArgb);
    Rectangle bounds = new Rectangle(0, 0, output.Width, output.Height);
    BitmapData data = output.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int bytes = Math.Abs(data.Stride) * output.Height;
    byte[] pixels = new byte[bytes];
    Marshal.Copy(data.Scan0, pixels, 0, bytes);
    for (int py = 0; py < output.Height; py++) {
      double y = (double)py / (output.Height-1);
      for (int px = 0; px < output.Width; px++) {
        double x = (double)px / (output.Width-1);
        int index = py*data.Stride + px*4;
        if (pixels[index+3] == 0) continue;

        bool bathroomStage = x >= .213 && x <= .787 && y >= .145 && y <= .82;
        if (room == "bathroom" && !bathroomStage) continue;

        double ambient = room == "living"
          ? (curtains ? 1.00 : .86)
          : room == "bedroom"
            ? (curtains ? 1.00 : .78)
            : curtains ? 1.00 : .88;
        double illumination = ambient;
        double warm = 0;
        double cool = curtains ? .025 : 0;
        int b = pixels[index], g = pixels[index+1], r = pixels[index+2];

        double luminanceResponse = .42 + .58*((r+g+b)/(3.0*255));
        r = (int)Clamp(r*illumination + (255-r)*warm*luminanceResponse, 0, 255);
        g = (int)Clamp(g*illumination + (226-g)*warm*.62*luminanceResponse, 0, 255);
        b = (int)Clamp(b*illumination + (225-b)*cool*luminanceResponse, 0, 255);

        if (room == "bathroom" && x >= .432 && x <= .515 && y >= .24 && y <= .46) {
          double mx = (x-.432)/(.515-.432), my = (y-.24)/(.46-.24);
          if (curtains) {
            bool frame = Math.Abs(mx-.5) < .035 || Math.Abs(my-.52) < .035;
            Color reflection = frame ? Color.FromArgb(80,88,96) : Color.FromArgb(151,169,181);
            double alpha = frame ? .32 : .20;
            r = (int)(r*(1-alpha) + reflection.R*alpha);
            g = (int)(g*(1-alpha) + reflection.G*alpha);
            b = (int)(b*(1-alpha) + reflection.B*alpha);
          } else {
            double fold = .5 + .5*Math.Sin(mx*Math.PI*10);
            Color reflection = Color.FromArgb((int)(36+fold*15),(int)(40+fold*16),(int)(49+fold*19));
            double alpha = .22;
            r = (int)(r*(1-alpha) + reflection.R*alpha);
            g = (int)(g*(1-alpha) + reflection.G*alpha);
            b = (int)(b*(1-alpha) + reflection.B*alpha);
          }
        }

        pixels[index] = (byte)b;
        pixels[index+1] = (byte)g;
        pixels[index+2] = (byte)r;
      }
    }

    Marshal.Copy(pixels, 0, data.Scan0, bytes);
    output.UnlockBits(data);
    return output;
  }
}
'@

Add-Type -TypeDefinition $type -ReferencedAssemblies System.Drawing

$assetRoot = Join-Path $ProjectRoot 'assets'
$lightingRoot = Join-Path $assetRoot 'lighting'
$outputRoot = Join-Path $lightingRoot 'hard-states-v7'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$bedroomSourceRoot = Join-Path $lightingRoot 'bedroom-source-states'
$bedroomStool = Join-Path $lightingRoot 'bedroom-stool.png'
$bedroomSources = @{
  '00' = Join-Path $bedroomSourceRoot 'bedroom-l0-m0.png'
  '01' = Join-Path $bedroomSourceRoot 'bedroom-l0-m1.png'
  '10' = Join-Path $bedroomSourceRoot 'bedroom-l1-m0.png'
  '11' = Join-Path $bedroomSourceRoot 'bedroom-l1-m1.png'
}
foreach ($curtains in @($false, $true)) {
  foreach ($lamp in @($false, $true)) {
    foreach ($main in @($false, $true)) {
      $sourceKey = '{0}{1}' -f [int]$lamp,[int]$main
      $prepared = [LightingStateBuilder]::Prepare($bedroomSources[$sourceKey], $bedroomStool, 'bedroom', ($lamp -or $main))
      $rendered = [LightingStateBuilder]::Render($prepared, 'bedroom', $curtains, $lamp, $main, $false, $false)
      $name = 'bedroom-c{0}-l{1}-m{2}.png' -f [int]$curtains,[int]$lamp,[int]$main
      $rendered.Save((Join-Path $outputRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
      $rendered.Dispose(); $prepared.Dispose()
    }
  }
}

$livingSourceRoot = Join-Path $lightingRoot 'living-source-states-v2'
$toasterPatchRoot = Join-Path $lightingRoot 'toaster-clean-patches-v2'
$toasterStateRoot = Join-Path $lightingRoot 'toaster-states-v2'
New-Item -ItemType Directory -Path $toasterStateRoot -Force | Out-Null
$livingSources = @{
  '000' = Join-Path $livingSourceRoot 'living-m0-b0-h0.png'
  '001' = Join-Path $livingSourceRoot 'living-m0-b0-h1.png'
  '010' = Join-Path $livingSourceRoot 'living-m0-b1-h0.png'
  '011' = Join-Path $livingSourceRoot 'living-m0-b1-h1.png'
  '100' = Join-Path $livingSourceRoot 'living-m1-b0-h0.png'
  '101' = Join-Path $livingSourceRoot 'living-m1-b0-h1.png'
  '110' = Join-Path $livingSourceRoot 'living-m1-b1-h0.png'
  '111' = Join-Path $livingSourceRoot 'living-m1-b1-h1.png'
}
$livingCleanPatches = @{}
foreach ($key in $livingSources.Keys) {
  $livingCleanPatches[$key] = Join-Path $toasterPatchRoot (Split-Path -Leaf $livingSources[$key])
}
$livingPrepared = @{}
$livingOriginalPrepared = @{}
foreach ($key in $livingSources.Keys) {
  $livingPrepared[$key] = [LightingStateBuilder]::PreparePatched($livingSources[$key], $livingCleanPatches[$key], '', 'living', $false, 742, 276, 4)
  $livingOriginalPrepared[$key] = [LightingStateBuilder]::Prepare($livingSources[$key], '', 'living', $false)
}
foreach ($curtains in @($false, $true)) {
  foreach ($main in @($false, $true)) {
    foreach ($bench in @($false, $true)) {
      foreach ($hall in @($false, $true)) {
        $circuitKey = '{0}{1}{2}' -f [int]$main,[int]$bench,[int]$hall
        $rendered = [LightingStateBuilder]::Render($livingPrepared[$circuitKey], 'living', $curtains, $false, $main, $bench, $hall)
        $name = 'living-c{0}-m{1}-b{2}-h{3}.png' -f [int]$curtains,[int]$main,[int]$bench,[int]$hall
        $rendered.Save((Join-Path $outputRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
        $rendered.Dispose()
        $originalRendered = [LightingStateBuilder]::Render($livingOriginalPrepared[$circuitKey], 'living', $curtains, $false, $main, $bench, $hall)
        $toaster = [LightingStateBuilder]::Crop($originalRendered, 742, 276, 82, 82)
        $toaster.Save((Join-Path $toasterStateRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
        $toaster.Dispose(); $originalRendered.Dispose()
      }
    }
  }
}
foreach ($prepared in $livingPrepared.Values) { $prepared.Dispose() }
foreach ($prepared in $livingOriginalPrepared.Values) { $prepared.Dispose() }

$bathroomSourceRoot = Join-Path $lightingRoot 'bathroom-source-states'
$bathroomSources = @{
  $false = Join-Path $bathroomSourceRoot 'bathroom-m0.png'
  $true = Join-Path $bathroomSourceRoot 'bathroom-m1.png'
}
foreach ($curtains in @($false, $true)) {
  foreach ($main in @($false, $true)) {
    $bathroomPrepared = [LightingStateBuilder]::Prepare($bathroomSources[$main], '', 'bathroom', $false)
    $rendered = [LightingStateBuilder]::Render($bathroomPrepared, 'bathroom', $curtains, $false, $main, $false, $false)
    $name = 'bathroom-c{0}-m{1}.png' -f [int]$curtains,[int]$main
    $rendered.Save((Join-Path $outputRoot $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $rendered.Dispose(); $bathroomPrepared.Dispose()
  }
}

$manifest = [ordered]@{
  version = 5
  width = 1672
  height = 941
  method = 'complete versioned hard renders; living circuits share one high-detail fixed-geometry master and an 82x82 toaster clean plate'
  files = [ordered]@{}
}
Get-ChildItem -LiteralPath $outputRoot -Filter '*.png' | Sort-Object Name | ForEach-Object {
  $manifest.files[$_.Name] = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLower()
}
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $outputRoot 'manifest.json'), $manifestJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "Built $($manifest.files.Count) lossless lighting states in $outputRoot"
