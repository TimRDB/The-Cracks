param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
public static class RegeneratedSockLayer {
  static bool Skin(Color c){return c.A>0&&c.R>95&&c.R>c.G*1.10&&c.R>c.B*1.14&&c.G>40;}
  static bool Seed(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return hi>145&&hi-lo<34&&!Skin(c);}
  static bool Fabric(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return hi>82&&hi-lo<42&&!Skin(c);}
  static bool Near(bool[,] mask,int x,int y,int x0,int x1,int y0,int y1){for(int yy=Math.Max(y0,y-1);yy<=Math.Min(y1,y+1);yy++)for(int xx=Math.Max(x0,x-1);xx<=Math.Min(x1,x+1);xx++)if(mask[xx,yy])return true;return false;}
  static bool[,] Extract(Bitmap reference,Bitmap layer){
    int width=layer.Width,height=layer.Height;bool[,] mask=new bool[width,height];
    for(int row=0;row<3;row++)for(int col=0;col<5;col++){
      int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1;
      int y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1,start=y0+(int)(fh*.70);
      for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++)if(Seed(reference.GetPixel(x,y)))mask[x,y]=true;
      for(int pass=0;pass<3;pass++){var add=new List<int>();for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++)if(!mask[x,y]&&Fabric(reference.GetPixel(x,y))&&Near(mask,x,y,x0,x1,start,y1))add.Add(y*width+x);foreach(int v in add)mask[v%width,v/width]=true;}
      bool[,] seen=new bool[width,height];int[] dx={1,-1,0,0},dy={0,0,1,-1};
      for(int sy=start;sy<=y1;sy++)for(int sx=x0;sx<=x1;sx++)if(mask[sx,sy]&&!seen[sx,sy]){
        var comp=new List<int>();var q=new Queue<int>();q.Enqueue(sy*width+sx);seen[sx,sy]=true;
        while(q.Count>0){int v=q.Dequeue(),cx=v%width,cy=v/width;comp.Add(v);for(int n=0;n<4;n++){int nx=cx+dx[n],ny=cy+dy[n];if(nx<x0||nx>x1||ny<start||ny>y1||seen[nx,ny]||!mask[nx,ny])continue;seen[nx,ny]=true;q.Enqueue(ny*width+nx);}}
        if(comp.Count<35){foreach(int v in comp)mask[v%width,v/width]=false;continue;}foreach(int v in comp){int x=v%width,y=v/width;layer.SetPixel(x,y,reference.GetPixel(x,y));}
      }
    }
    return mask;
  }
  static void Apply(string barefootPath,string outputPath,Bitmap layer,bool[,] mask){
    using(Bitmap barefoot=new Bitmap(barefootPath))using(Bitmap output=barefoot.Clone(new Rectangle(0,0,barefoot.Width,barefoot.Height),PixelFormat.Format32bppArgb)){
      int width=output.Width,height=output.Height;
      for(int row=0;row<3;row++)for(int col=0;col<5;col++){
        int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1;
        int y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1,start=y0+(int)(fh*.70);
        bool[,] seen=new bool[width,height];int[] dx={1,-1,0,0},dy={0,0,1,-1};
        for(int sy=start;sy<=y1;sy++)for(int sx=x0;sx<=x1;sx++)if(mask[sx,sy]&&!seen[sx,sy]){
          var comp=new List<int>();var q=new Queue<int>();q.Enqueue(sy*width+sx);seen[sx,sy]=true;int minX=sx,maxX=sx,minY=sy,maxY=sy;
          while(q.Count>0){int v=q.Dequeue(),cx=v%width,cy=v/width;comp.Add(v);minX=Math.Min(minX,cx);maxX=Math.Max(maxX,cx);minY=Math.Min(minY,cy);maxY=Math.Max(maxY,cy);for(int n=0;n<4;n++){int nx=cx+dx[n],ny=cy+dy[n];if(nx<x0||nx>x1||ny<start||ny>y1||seen[nx,ny]||!mask[nx,ny])continue;seen[nx,ny]=true;q.Enqueue(ny*width+nx);}}
          for(int y=minY;y<=Math.Min(y1,maxY+1);y++)for(int x=Math.Max(x0,minX-1);x<=Math.Min(x1,maxX+1);x++)if(Skin(barefoot.GetPixel(x,y)))output.SetPixel(x,y,Color.Transparent);
          foreach(int v in comp){int x=v%width,y=v/width;output.SetPixel(x,y,layer.GetPixel(x,y));}
        }
      }
      output.Save(outputPath,ImageFormat.Png);
    }
  }
  public static string Build(string referencePath,string underwear,string crumpled,string clean,string assets){
    using(Bitmap loaded=new Bitmap(referencePath))using(Bitmap reference=loaded.Clone(new Rectangle(0,0,Math.Min(1619,loaded.Width),Math.Min(971,loaded.Height)),PixelFormat.Format32bppArgb))using(Bitmap layer=new Bitmap(reference.Width,reference.Height,PixelFormat.Format32bppArgb)){
      bool[,] mask=Extract(reference,layer);string layerPath=assets+"/unused/player-socks-layer-v1.png";layer.Save(layerPath,ImageFormat.Png);
      Apply(underwear,assets+"/unused/player-sheet-underwear-socks-v3.png",layer,mask);Apply(crumpled,assets+"/unused/player-sheet-clothes-socks-v6.png",layer,mask);Apply(clean,assets+"/unused/player-sheet-clean-socks-v8.png",layer,mask);
      int count=0;for(int y=0;y<layer.Height;y++)for(int x=0;x<layer.Width;x++)if(mask[x,y])count++;return String.Format("sock layer {0}x{1}; isolated pixels={2}",layer.Width,layer.Height,count);
    }
  }
}
"@
$assets=Join-Path $ProjectRoot 'assets'
[RegeneratedSockLayer]::Build((Join-Path $assets 'unused/player-socks-regenerated-reference-v1.png'),(Join-Path $assets 'used/player-sheet-keyed-v1.png'),(Join-Path $assets 'unused/player-sheet-clothes-barefoot-v6.png'),(Join-Path $assets 'unused/player-sheet-clean-barefoot-v8.png'),$assets)