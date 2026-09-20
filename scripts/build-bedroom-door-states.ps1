param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-states-v11'
$correctedRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-states-v12'
$outputRoot = Join-Path $ProjectRoot 'assets\lighting\bedroom-door-states'
$referencePath = Join-Path $ProjectRoot 'assets\lighting\bedroom-door-fresh-reference-v12.png'
[IO.Directory]::CreateDirectory($correctedRoot) | Out-Null
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null
if (-not (Test-Path -LiteralPath $referencePath)) { throw "Missing clean door reference: $referencePath" }

# Place the complete generated door and its matching frame as one nearly
# uniformly scaled assembly. The source and destination ratios differ by less
# than one tenth of one percent, so neither the hinges nor the leaf are warped.
# The crop and destination have matching proportions, keeping the leaf,
# panels, jambs, and hinges undistorted. Its final row is the existing
# bedroom threshold, so no generated floor or plinth enters the scene.
$frameSource = [Drawing.Rectangle]::new(16, 0, 775, 1668)
$frameX = 1200
$frameY = 111
$frameWidth = 196
$frameHeight = 422

# Exact leaf inside that placed assembly. The animation samples these same
# pixels, rather than independently scaling a second door or hinge strip.
$panelX = 1219
$panelY = 131
$panelWidth = 158
$panelHeight = 401

# Immediately right of the frame, the source photography has a plinth block
# sitting flush against the wall with a hard, unfeathered rectangular edge
# where it meets the floor -- it reads as the doorframe overshooting onto the
# carpet. Feathering its lowest rows into the real floor pixels just below
# lets the floor read as sitting over the trim instead.
$plinthX = 1396
$plinthWidth = 16
$plinthBlendStart = 527
$plinthBottom = 534
$plinthFloorDonorY = 540

function Merge-PlinthIntoFloor([Drawing.Bitmap]$bitmap) {
  for ($x = $plinthX; $x -lt ($plinthX + $plinthWidth); $x++) {
    $floorPixel = $bitmap.GetPixel($x, $plinthFloorDonorY)
    for ($y = $plinthBlendStart; $y -lt $plinthBottom; $y++) {
      $blockPixel = $bitmap.GetPixel($x, $y)
      $t = ($y - $plinthBlendStart + 1) / [double]($plinthBottom - $plinthBlendStart + 1)
      $red = Clamp-Channel ($blockPixel.R + ($floorPixel.R - $blockPixel.R) * $t)
      $green = Clamp-Channel ($blockPixel.G + ($floorPixel.G - $blockPixel.G) * $t)
      $blue = Clamp-Channel ($blockPixel.B + ($floorPixel.B - $blockPixel.B) * $t)
      $bitmap.SetPixel($x, $y, [Drawing.Color]::FromArgb(255, $red, $green, $blue))
    }
  }
}

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

# The reference screenshot contains the foreground couch. Substituting a clean
# patch pixel there is not enough on its own: Apply-Patch also reads the real
# per-state background at that same absolute position to work out how much
# darker or lighter to make the clean pixel, and the real background there is
# the couch, not a door, so its own lighting swing bleeds through as a ghost
# regardless of what the clean patch contains. The fix has to happen after
# relighting, using an already-lit, verified-clean donor row (destination
# y=420) instead.
$safeBandCenter = 420

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

      # A per-column edge sample rides the diagonal boundary line, so natural
      # film-grain noise differs row-to-row across neighbouring columns and a
      # per-column blend reads as vertical streaking. Average both the edge
      # tone and the fill tone across the whole width instead, so every
      # column eases into the exact same flat, grain-free color and no
      # streaking or ghosting can appear.
      $edgeTotal = @(0.0, 0.0, 0.0)
      $fillTotal = @(0.0, 0.0, 0.0)
      for ($px = 0; $px -lt $panelWidth; $px++) {
        $absoluteX = $panelX + $px
        $boundaryY = [Math]::Min($panelY + $panelHeight, (Get-CouchBoundary $absoluteX))
        $edgeSample = $panel.GetPixel($absoluteX, [Math]::Max($panelY, $boundaryY - 1))
        $fillSample = $panel.GetPixel($absoluteX, $safeBandCenter)
        $edgeTotal[0] += $edgeSample.R; $edgeTotal[1] += $edgeSample.G; $edgeTotal[2] += $edgeSample.B
        $fillTotal[0] += $fillSample.R; $fillTotal[1] += $fillSample.G; $fillTotal[2] += $fillSample.B
      }
      $edgeColor = [Drawing.Color]::FromArgb(255, [int]($edgeTotal[0]/$panelWidth), [int]($edgeTotal[1]/$panelWidth), [int]($edgeTotal[2]/$panelWidth))
      $fillColor = [Drawing.Color]::FromArgb(255, [int]($fillTotal[0]/$panelWidth), [int]($fillTotal[1]/$panelWidth), [int]($fillTotal[2]/$panelWidth))
      $fadeLength = 16
      for ($px = 0; $px -lt $panelWidth; $px++) {
        $absoluteX = $panelX + $px
        $boundaryY = [Math]::Min($panelY + $panelHeight, (Get-CouchBoundary $absoluteX))
        for ($absoluteY = $boundaryY; $absoluteY -lt ($panelY + $panelHeight); $absoluteY++) {
          $depth = $absoluteY - $boundaryY
          $t = [Math]::Min(1.0, ($depth + 1) / [double]($fadeLength + 1))
          $red = Clamp-Channel ($edgeColor.R + ($fillColor.R - $edgeColor.R) * $t)
          $green = Clamp-Channel ($edgeColor.G + ($fillColor.G - $edgeColor.G) * $t)
          $blue = Clamp-Channel ($edgeColor.B + ($fillColor.B - $edgeColor.B) * $t)
          $panel.SetPixel($absoluteX, $absoluteY, [Drawing.Color]::FromArgb(255, $red, $green, $blue))
        }
      }
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
