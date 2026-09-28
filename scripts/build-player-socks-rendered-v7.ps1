param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
public static class RenderedSockComposite {
  static bool StrongKey(Color c){int other=Math.Max(c.R,c.B);return c.G>170&&c.G-other>78&&c.G>c.R*1.35&&c.G>c.B*1.35;}
  static bool EdgeKey(Color c){int other=Math.Max(c.R,c.B);return c.G>145&&c.G-other>58&&c.G>c.R*1.22&&c.G>c.B*1.22;}
  static bool Skin(Color c){return c.A>0&&c.R>105&&c.R-c.G>22&&c.R-c.B>32&&c.B>42&&c.B>c.G*.56;}
  static bool Neutral(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&hi>72&&hi-lo<54;}
  static bool Seed(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&lo>128&&hi-lo<36;}
  static Bitmap Key(string sourcePath){using(Bitmap loaded=new Bitmap(sourcePath)){Bitmap output=new Bitmap(1619,971,PixelFormat.Format32bppArgb);using(Graphics g=Graphics.FromImage(output))g.DrawImageUnscaled(loaded,0,0);bool[,] removed=new bool[output.Width,output.Height];for(int y=0;y<output.Height;y++)for(int x=0;x<output.Width;x++)if(StrongKey(output.GetPixel(x,y)))removed[x,y]=true;for(int pass=0;pass<2;pass++){var add=new List<int>();for(int y=0;y<output.Height;y++)for(int x=0;x<output.Width;x++)if(!removed[x,y]&&EdgeKey(output.GetPixel(x,y))){bool near=false;for(int yy=Math.Max(0,y-1);yy<=Math.Min(output.Height-1,y+1)&&!near;yy++)for(int xx=Math.Max(0,x-1);xx<=Math.Min(output.Width-1,x+1);xx++)if(removed[xx,yy]){near=true;break;}if(near)add.Add(y*output.Width+x);}foreach(int v in add)removed[v%output.Width,v/output.Width]=true;}for(int y=0;y<output.Height;y++)for(int x=0;x<output.Width;x++)if(removed[x,y])output.SetPixel(x,y,Color.Transparent);return output;}}
  static bool Near(bool[,] mask,int x,int y,int x0,int x1,int y0,int y1,int radius){for(int yy=Math.Max(y0,y-radius);yy<=Math.Min(y1,y+radius);yy++)for(int xx=Math.Max(x0,x-radius);xx<=Math.Min(x1,x+radius);xx++)if(mask[xx,yy])return true;return false;}
  static string BuildOne(string renderPath,string barePath,string outputPath){
    using(Bitmap rendered=Key(renderPath))using(Bitmap bare=new Bitmap(barePath))using(Bitmap output=bare.Clone(new Rectangle(0,0,bare.Width,bare.Height),PixelFormat.Format32bppArgb)){
      int width=bare.Width,height=bare.Height,total=0;
      for(int row=0;row<3;row++)for(int col=0;col<5;col++){
        int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1,y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1,start=y0+(int)(fh*.66);
        bool[,] mask=new bool[width,height],seen=new bool[width,height],skin=new bool[width,height];
        for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++){if(Seed(rendered.GetPixel(x,y)))mask[x,y]=true;if(Skin(bare.GetPixel(x,y)))skin[x,y]=true;}
        for(int pass=0;pass<4;pass++){var add=new List<int>();for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++)if(!mask[x,y]&&Neutral(rendered.GetPixel(x,y))&&Near(mask,x,y,x0,x1,start,y1,1))add.Add(y*width+x);foreach(int v in add)mask[v%width,v/width]=true;}
        int[] dx={1,-1,0,0},dy={0,0,1,-1};
        for(int sy=start;sy<=y1;sy++)for(int sx=x0;sx<=x1;sx++)if(mask[sx,sy]&&!seen[sx,sy]){
          var comp=new List<int>();var q=new Queue<int>();q.Enqueue(sy*width+sx);seen[sx,sy]=true;int minX=sx,maxX=sx,minY=sy,maxY=sy;
          while(q.Count>0){int v=q.Dequeue(),x=v%width,y=v/width;comp.Add(v);minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);for(int n=0;n<4;n++){int nx=x+dx[n],ny=y+dy[n];if(nx<x0||nx>x1||ny<start||ny>y1||seen[nx,ny]||!mask[nx,ny])continue;seen[nx,ny]=true;q.Enqueue(ny*width+nx);}}
          if(comp.Count<120)continue;
          int left=Math.Max(x0,minX-8),right=Math.Min(x1,maxX+8),top=Math.Max(start,minY-2),bottom=Math.Min(y1,maxY+5);
          for(int y=top;y<=bottom;y++)for(int x=left;x<=right;x++){output.SetPixel(x,y,rendered.GetPixel(x,y));total++;}
        }
      }
      if(total<12000)throw new Exception("Sock extraction incomplete: "+total);
      output.Save(outputPath,ImageFormat.Png);
      return System.IO.Path.GetFileName(outputPath)+": "+total+" rendered sock pixels";
    }
  }
  public static string Build(string assets){
    return BuildOne(assets+"/unused/player-socks-underwear-render-v2.png",assets+"/used/player-sheet-keyed-v1.png",assets+"/used/player-sheet-underwear-socks-v6.png")+Environment.NewLine+
      BuildOne(assets+"/unused/player-socks-crumpled-render-v2.png",assets+"/unused/player-sheet-clothes-barefoot-v8.png",assets+"/unused/player-sheet-clothes-socks-v11.png")+Environment.NewLine+
      BuildOne(assets+"/unused/player-socks-clean-render-v2.png",assets+"/unused/player-sheet-clean-barefoot-v10.png",assets+"/unused/player-sheet-clean-socks-v13.png");
  }
}
"@
[RenderedSockComposite]::Build((Join-Path $ProjectRoot 'assets'))
