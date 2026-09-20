param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path $ProjectRoot 'assets\lighting\hard-states-v7'
$correctedRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-states-v11'
$outputRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-door-states'
$referencePath = Join-Path $ProjectRoot 'assets\lighting\bedroom-door-clean-reference-v9.png'
[IO.Directory]::CreateDirectory($correctedRoot) | Out-Null
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null
if (-not (Test-Path -LiteralPath $referencePath)) { throw "Missing clean door reference: $referencePath" }

# Place the complete generated door and its matching frame as one nearly
# uniformly scaled assembly. The source and destination ratios differ by less
# than one tenth of one percent, so neither the hinges nor the leaf are warped.
$frameSource = [Drawing.Rectangle]::new(24, 32, 818, 1674)
$frameX = 1200
$frameY = 111
$frameWidth = 196
$frameHeight = 401

# Exact leaf inside that placed assembly. The animation samples these same
# pixels, rather than independently scaling a second door or hinge strip.
$panelX = 1220
$panelY = 131
$panelWidth = 159
$panelHeight = 381

$couchBoundaryPoints = @(
  @(1200, 504), @(1237, 504), @(1257, 512), @(1277, 516),
  @(1297, 524), @(1317, 528), @(1337, 532), @(1357, 532),
  @(1378, 534)
)

function Get-CouchBoundary([int]$x) {
  if ($x -le $couchBoundaryPoints[0][0]) { return $couchBoundaryPoints[0][1] }
  for ($index = 0; $index -lt $couchBoundaryPoints.Count - 1; $index++) {
    $a = $couchBoundaryPoints[$index]
    $b = $couchBoundaryPoints[$index + 1]
    if ($x -le $b[0]) {
      $amount = ($x - $a[0]) / [double]($b[0] - $a[0])
      return [int][Math]::Round($a[1] + ($b[1] - $a[1]) * $amount)
    }
  }
  return [int]::MaxValue
}

function Scale-Patch([Drawing.Bitmap]$reference, [Drawing.Rectangle]$sourceRect, [int]$width, [int]$height) {
  $patch = [Drawing.Bitmap]::new($width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($patch)
  $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $attributes = [Drawing.Imaging.ImageAttributes]::new()
  $attributes.SetWrapMode([Drawing.Drawing2D.WrapMode]::TileFlipXY)
  $destination = [Drawing.Rectangle]::new(0, 0, $width, $height)
  $graphics.DrawImage($reference, $destination, $sourceRect.X, $sourceRect.Y, $sourceRect.Width, $sourceRect.Height, [Drawing.GraphicsUnit]::Pixel, $attributes)
  $attributes.Dispose()
  $graphics.Dispose()
  return $patch
}

function Clamp-Channel([double]$value) {
  return [Math]::Max(0, [Math]::Min(255, [int][Math]::Round($value)))
}

function Apply-Patch(
  [Drawing.Bitmap]$destination,
  [Drawing.Bitmap]$stateSource,
  [Drawing.Bitmap]$referenceState,
  [Drawing.Bitmap]$patch,
  [int]$x,
  [int]$y,
  [bool]$preserveCouch
) {
  for ($py = 0; $py -lt $patch.Height; $py++) {
    for ($px = 0; $px -lt $patch.Width; $px++) {
      $absoluteX = $x + $px
      $absoluteY = $y + $py
      if ($preserveCouch -and $absoluteY -ge (Get-CouchBoundary $absoluteX)) { continue }
      $clean = $patch.GetPixel($px, $py)
      $statePixel = $stateSource.GetPixel($absoluteX, $absoluteY)
      $referencePixel = $referenceState.GetPixel($absoluteX, $absoluteY)
      $red = Clamp-Channel ($clean.R + $statePixel.R - $referencePixel.R)
      $green = Clamp-Channel ($clean.G + $statePixel.G - $referencePixel.G)
      $blue = Clamp-Channel ($clean.B + $statePixel.B - $referencePixel.B)
      $destination.SetPixel($absoluteX, $absoluteY, [Drawing.Color]::FromArgb(255, $red, $green, $blue))
    }
  }
}

$generatedReference = [Drawing.Bitmap]::FromFile($referencePath)
$framePatch = Scale-Patch $generatedReference $frameSource $frameWidth $frameHeight
$cleanLeaf = $framePatch.Clone(
  [Drawing.Rectangle]::new($panelX - $frameX, $panelY - $frameY, $panelWidth, $panelHeight),
  [Drawing.Imaging.PixelFormat]::Format32bppArgb
)

# The reference screenshot contains the foreground couch. Reconstruct only the
# concealed bottom of the moving leaf; the real couch remains untouched in all
# room backgrounds and is layered in front during the animation.
for ($px = 0; $px -lt $panelWidth; $px++) {
  $boundary = [Math]::Min($panelHeight, (Get-CouchBoundary ($panelX + $px)) - $panelY)
  for ($py = $boundary; $py -lt $panelHeight; $py++) {
    $sourceY = [Math]::Max(0, $boundary - 8 - [int](($py - $boundary) / 2))
    $cleanLeaf.SetPixel($px, $py, $cleanLeaf.GetPixel($px, $sourceY))
  }
}

$referenceState = [Drawing.Bitmap]::FromFile((Join-Path $sourceRoot 'bedroom-c0-l1-m0.png'))

foreach ($curtains in 0,1) {
  foreach ($lamp in 0,1) {
    foreach ($main in 0,1) {
      $name = "bedroom-c$curtains-l$lamp-m$main.png"
      $sourcePath = Join-Path $sourceRoot $name
      if (-not (Test-Path -LiteralPath $sourcePath)) { throw "Missing source state: $sourcePath" }

      $source = [Drawing.Bitmap]::FromFile($sourcePath)
      $corrected = New-Object Drawing.Bitmap $source
      Apply-Patch $corrected $source $referenceState $framePatch $frameX $frameY $true
      $corrected.Save((Join-Path $correctedRoot $name), [Drawing.Imaging.ImageFormat]::Png)

      $panel = New-Object Drawing.Bitmap $corrected
      Apply-Patch $panel $source $referenceState $cleanLeaf $panelX $panelY $false
      $panel.Save((Join-Path $outputRoot $name), [Drawing.Imaging.ImageFormat]::Png)

      $panel.Dispose()
      $corrected.Dispose()
      $source.Dispose()
    }
  }
}

$referenceState.Dispose()
$cleanLeaf.Dispose()
$framePatch.Dispose()
$generatedReference.Dispose()

Write-Host "Built 8 exact-reference bedroom states in $correctedRoot"
Write-Host "Built 8 full-canvas clean bedroom door states in $outputRoot"
