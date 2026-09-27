param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class WhiteSockRecolor {
  static bool Skin(Color c) {
    return c.R > 105 && c.G > 42 && c.G < 210 && c.B < 175 && c.R > c.G * 1.08 && c.R > c.B * 1.14;
  }
  static bool NearSkin(Bitmap bare, int x, int y) {
    for (int yy=Math.Max(0,y-4); yy<=Math.Min(bare.Height-1,y+4); yy++)
      for (int xx=Math.Max(0,x-4); xx<=Math.Min(bare.Width-1,x+4); xx++)
        if (Skin(bare.GetPixel(xx,yy))) return true;
    return false;
  }
  static bool ChangedFromBare(Bitmap bare, Color sock, int x, int y) {
    Color original=bare.GetPixel(x,y);
    int difference=Math.Max(Math.Abs(sock.R-original.R),Math.Max(Math.Abs(sock.G-original.G),Math.Abs(sock.B-original.B)));
    return difference>18;
  }
  public static void Build(string darkPath, string barePath, string outputPath) {
    using (Bitmap dark=new Bitmap(darkPath))
    using (Bitmap bare=new Bitmap(barePath))
    using (Bitmap output=dark.Clone(new Rectangle(0,0,dark.Width,dark.Height),PixelFormat.Format32bppArgb)) {
      double rowHeight=dark.Height/3.0;
      int cellWidth=(int)Math.Ceiling(dark.Width/5.0);
      bool[,] fabric=new bool[dark.Width,dark.Height];
      for(int y=0;y<dark.Height;y++) {
        double local=y-Math.Floor(y/rowHeight)*rowHeight;
        if(local<rowHeight*.64) continue;
        for(int x=0;x<dark.Width;x++) {
          Color c=dark.GetPixel(x,y);
          int high=Math.Max(c.R,Math.Max(c.G,c.B)), low=Math.Min(c.R,Math.Min(c.G,c.B));
          double sourceLum=c.R*.299+c.G*.587+c.B*.114;
          if(c.R>=118 || c.G>=118 || c.B>=128 || high-low>32 || Skin(c) || c.G>Math.Max(c.R,c.B)*1.25+6 || sourceLum<32 || !NearSkin(bare,x,y) || !ChangedFromBare(bare,c,x,y)) continue;
          fabric[x,y]=true;
        }
      }
      for(int y=0;y<dark.Height;y++) {
        for(int x=0;x<dark.Width;x++) {
          if(!fabric[x,y]) continue;
          int cellStart=(x/cellWidth)*cellWidth, cellEnd=Math.Min(dark.Width-1,cellStart+cellWidth-1), support=0;
          for(int xx=Math.Max(cellStart,x-4);xx<=Math.Min(cellEnd,x+4);xx++) if(fabric[xx,y]) support++;
          if(support<4) continue; // do not recolour thin leg or silhouette edge runs
          Color c=dark.GetPixel(x,y);
          // Lift the original dark fabric into an off-white range with one
          // continuous curve. Keeping the source luminance differences avoids
          // the flat, cut-out appearance produced by a thresholded recolour.
          double lum=c.R*.299+c.G*.587+c.B*.114;
          int v=Math.Max(70,Math.Min(218,(int)Math.Round(65+lum*1.65)));
          output.SetPixel(x,y,Color.FromArgb(c.A,Math.Min(255,v+4),Math.Min(255,v+4),Math.Min(255,v+2)));
        }
      }      output.Save(outputPath,ImageFormat.Png);
    }
  }
}
'@
$assets=Join-Path $ProjectRoot 'assets'
[WhiteSockRecolor]::Build((Join-Path $assets 'player-underwear-socks-dark-source-v1.png'),(Join-Path $assets 'bedroom_player.png'),(Join-Path $assets 'player-underwear-socks-key-v1.png'))
[WhiteSockRecolor]::Build((Join-Path $assets 'player-clothes-socks-dark-source-v1.png'),(Join-Path $assets 'player-clothes-barefoot-key-v1.png'),(Join-Path $assets 'player-clothes-socks-key-v1.png'))
Write-Host 'Recolored only sock pixels to white; dimensions, poses and alpha geometry were unchanged.'
