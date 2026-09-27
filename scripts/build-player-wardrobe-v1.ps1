param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$assets=Join-Path $ProjectRoot 'assets'
& (Join-Path $PSScriptRoot 'recolor-player-socks-white-v1.ps1') -ProjectRoot $ProjectRoot
& (Join-Path $PSScriptRoot 'build-player-keyed-sheet.ps1') -Source (Join-Path $assets 'player-clothes-barefoot-key-v1.png') -Output (Join-Path $assets 'player-sheet-clothes-barefoot-v1.png')
& (Join-Path $PSScriptRoot 'build-player-keyed-sheet.ps1') -Source (Join-Path $assets 'player-clothes-socks-key-v1.png') -Output (Join-Path $assets 'player-sheet-clothes-socks-v1.png')
& (Join-Path $PSScriptRoot 'build-player-keyed-sheet.ps1') -Source (Join-Path $assets 'player-underwear-socks-key-v1.png') -Output (Join-Path $assets 'player-sheet-underwear-socks-v1.png')
$sheet=New-Object Drawing.Bitmap((Join-Path $assets 'player-sheet-underwear-socks-v1.png'))
$cellW=[int]($sheet.Width/5);$cellH=[int]($sheet.Height/3);$top=$cellH+[int]($cellH*.68)
$icon=New-Object Drawing.Bitmap($cellW,[int]($cellH*.32),[Drawing.Imaging.PixelFormat]::Format32bppArgb)
for($y=0;$y -lt $icon.Height;$y++){for($x=0;$x -lt $icon.Width;$x++){
  $c=$sheet.GetPixel($x,$top+$y)
  if($c.A -gt 0 -and $c.R -gt 135 -and $c.G -gt 135 -and $c.B -gt 135 -and ([Math]::Max($c.R,[Math]::Max($c.G,$c.B))-[Math]::Min($c.R,[Math]::Min($c.G,$c.B))) -lt 38){$icon.SetPixel($x,$y,$c)}
}}
$icon.Save((Join-Path $assets 'socks-icon-v1.png'),[Drawing.Imaging.ImageFormat]::Png)
$icon.Dispose();$sheet.Dispose()
Write-Host 'Built three keyed wardrobe sheets and the socks inventory icon.'
