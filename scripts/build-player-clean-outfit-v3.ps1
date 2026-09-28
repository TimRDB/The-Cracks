param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
public static class ExactCharacterCleanOutfit {
  static int Clamp(double v){return Math.Max(0,Math.Min(255,(int)Math.Round(v)));}
  static bool Skin(Color c){return c.A>0&&c.R>80&&c.R>c.G*1.13&&c.R>c.B*1.18&&c.G>35;}
  static bool Blue(Color c){return c.A>0&&!Skin(c)&&c.B>58&&c.B>c.R*1.05&&c.B>=c.G*.98&&c.B-c.R>5;}
  static bool NeutralCloth(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&!Skin(c)&&hi<190&&hi-lo<48;}
  static bool LightNeutral(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&!Skin(c)&&hi>105&&hi-lo<38;} static bool SockFabric(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&!Skin(c)&&hi>95&&hi-lo<34;}
  static bool Near(bool[,] mask,int x,int y,int x0,int x1,int y0,int y1,int radius){for(int yy=Math.Max(y0,y-radius);yy<=Math.Min(y1,y+radius);yy++)for(int xx=Math.Max(x0,x-radius);xx<=Math.Min(x1,x+radius);xx++)if(mask[xx,yy])return true;return false;}
  static void BuildOne(string sourcePath,string outputPath,bool keepSocks){
    using(Bitmap source=new Bitmap(sourcePath))using(Bitmap output=source.Clone(new Rectangle(0,0,source.Width,source.Height),PixelFormat.Format32bppArgb)){
      int width=source.Width,height=source.Height;
      for(int row=0;row<3;row++)for(int col=0;col<5;col++){
        int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1;
        int y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1;
        bool[,] shirt=new bool[width,height],stripe=new bool[width,height],pants=new bool[width,height];
        int torsoTop=y0+(int)(fh*.10),torsoBottom=y0+(int)(fh*.62);
        for(int y=torsoTop;y<=torsoBottom;y++)for(int x=x0;x<=x1;x++)if(Blue(source.GetPixel(x,y)))shirt[x,y]=true;
        for(int pass=0;pass<2;pass++){
          var add=new List<int>();
          for(int y=torsoTop;y<=torsoBottom;y++)for(int x=x0;x<=x1;x++)if(!shirt[x,y]){
            Color c=source.GetPixel(x,y);int hi=Math.Max(c.R,Math.Max(c.G,c.B));
            if(c.A>0&&!Skin(c)&&hi>62&&Near(shirt,x,y,x0,x1,torsoTop,torsoBottom,1))add.Add(y*width+x);
          }
          foreach(int v in add)shirt[v%width,v/width]=true;
        }
        for(int y=torsoTop;y<=torsoBottom;y++)for(int x=x0;x<=x1;x++)if(!shirt[x,y]&&LightNeutral(source.GetPixel(x,y))&&Near(shirt,x,y,x0,x1,torsoTop,torsoBottom,2)){shirt[x,y]=true;}
        bool[,] skinSeen=new bool[width,height];int skinTop=y0+(int)(fh*.33);int[] ndx={1,-1,0,0},ndy={0,0,1,-1};
        for(int sy=skinTop;sy<=torsoBottom;sy++)for(int sx=x0;sx<=x1;sx++)if(!skinSeen[sx,sy]&&Skin(source.GetPixel(sx,sy))){
          var comp=new List<int>();var queue=new Queue<int>();bool touchesShirt=false;queue.Enqueue(sy*width+sx);skinSeen[sx,sy]=true;
          while(queue.Count>0){int v=queue.Dequeue(),cx=v%width,cy=v/width;comp.Add(v);if(Near(shirt,cx,cy,x0,x1,torsoTop,torsoBottom,2))touchesShirt=true;for(int n=0;n<4;n++){int nx=cx+ndx[n],ny=cy+ndy[n];if(nx<x0||nx>x1||ny<skinTop||ny>torsoBottom||skinSeen[nx,ny]||!Skin(source.GetPixel(nx,ny)))continue;skinSeen[nx,ny]=true;queue.Enqueue(ny*width+nx);}}
          if(touchesShirt&&comp.Count<=40)foreach(int v in comp)shirt[v%width,v/width]=true;
        }
        for(int pass=0;pass<2;pass++){var pinholes=new List<int>();for(int y=skinTop;y<=torsoBottom;y++)for(int x=x0+2;x<=x1-2;x++)if(!shirt[x,y]&&Skin(source.GetPixel(x,y))){int support=0;for(int yy=Math.Max(torsoTop,y-2);yy<=Math.Min(torsoBottom,y+2);yy++)for(int xx=Math.Max(x0,x-2);xx<=Math.Min(x1,x+2);xx++)if(shirt[xx,yy])support++;if(support>=12)pinholes.Add(y*width+x);}foreach(int v in pinholes)shirt[v%width,v/width]=true;}
        int shirtMin=x1+1,shirtMax=x0-1;for(int y=torsoTop;y<=torsoBottom;y++)for(int x=x0;x<=x1;x++)if(shirt[x,y]){shirtMin=Math.Min(shirtMin,x);shirtMax=Math.Max(shirtMax,x);} if(shirtMax>=shirtMin)for(int y=torsoTop;y<=torsoBottom;y++)for(int x=x0;x<=x1;x++)if(shirt[x,y]&&((x-shirtMin-3)%11+11)%11==0)stripe[x,y]=true;
        int hipY0=y0+(int)(fh*.63),hipY1=y0+(int)(fh*.69),hipMin=x1+1,hipMax=x0-1;
        for(int y=hipY0;y<=hipY1;y++)for(int x=x0;x<=x1;x++)if(NeutralCloth(source.GetPixel(x,y))&&!shirt[x,y]){hipMin=Math.Min(hipMin,x);hipMax=Math.Max(hipMax,x);}
        int pantTop=y0+(int)(fh*(row==0?.55:.53)),pantFree=y0+(int)(fh*.65),pantBottom=y0+(int)(fh*.94);
        if(hipMax<hipMin){hipMin=x0;hipMax=x1;}
        for(int y=pantTop;y<=Math.Min(y1,pantBottom);y++)for(int x=x0;x<=x1;x++){
          Color c=source.GetPixel(x,y);if(!NeutralCloth(c)||shirt[x,y]||(keepSocks&&y>=y0+(int)(fh*.68)&&SockFabric(c)))continue;
          if(y<pantFree&&(x<hipMin-2||x>hipMax+2))continue;
          pants[x,y]=true;
        }
        for(int pass=0;pass<2;pass++){
          var add=new List<int>();
          for(int y=pantTop;y<=Math.Min(y1,pantBottom);y++)for(int x=x0;x<=x1;x++)if(!pants[x,y]&&!shirt[x,y]){
            Color c=source.GetPixel(x,y);int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));
            if(c.A==0||Skin(c)||hi>210||hi-lo>62||(keepSocks&&y>=y0+(int)(fh*.68)&&SockFabric(c))||(y<pantFree&&(x<hipMin-2||x>hipMax+2)))continue;
            if(Near(pants,x,y,x0,x1,pantTop,Math.Min(y1,pantBottom),1))add.Add(y*width+x);
          }
          foreach(int v in add)pants[v%width,v/width]=true;
        }
        for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++){
          Color c=source.GetPixel(x,y);double lum=c.R*.299+c.G*.587+c.B*.114;
          if(shirt[x,y]){
            if(stripe[x,y]){int v=Clamp(218+(lum-140)*.12);output.SetPixel(x,y,Color.FromArgb(c.A,v,v,Clamp(v-3)));}
            else {double t=Math.Max(128,Math.Min(205,157+(lum-118)*.34));output.SetPixel(x,y,Color.FromArgb(c.A,Clamp(t*.83),Clamp(t*1.08),Clamp(t*.86)));}
          }else if(pants[x,y]){
            double t=Math.Max(88,Math.Min(174,92+lum*.82));output.SetPixel(x,y,Color.FromArgb(c.A,Clamp(t+24),Clamp(t*.86),Clamp(t*.62)));
          }else{
            double fy=(y-y0)/(double)fh;int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));
            if(c.A>0&&fy>.12&&fy<.61&&!Skin(c)&&hi<150&&hi-lo<48){double t=48+(lum-48)*.55,scale=lum>1?t/lum:1;output.SetPixel(x,y,Color.FromArgb(c.A,Clamp(c.R*scale),Clamp(c.G*scale),Clamp(c.B*scale)));}
          }
        }
      }
      output.Save(outputPath,ImageFormat.Png);
    }
  }
  public static string Build(string bareSource,string socksSource,string bareOutput,string socksOutput){BuildOne(bareSource,bareOutput,false);BuildOne(socksSource,socksOutput,true);using(Bitmap a=new Bitmap(bareSource))using(Bitmap b=new Bitmap(bareOutput)){for(int y=0;y<a.Height;y++)for(int x=0;x<a.Width;x++)if(a.GetPixel(x,y).A!=b.GetPixel(x,y).A)throw new Exception("Alpha geometry changed");return String.Format("{0}x{1}; native alpha geometry preserved",b.Width,b.Height);}}
}
"@
$assets=Join-Path $ProjectRoot 'assets'
$result=[ExactCharacterCleanOutfit]::Build((Join-Path $assets 'unused/player-sheet-clothes-barefoot-v1.png'),(Join-Path $assets 'unused/player-sheet-clothes-socks-v1.png'),(Join-Path $assets 'unused/player-sheet-clean-barefoot-v3.png'),(Join-Path $assets 'unused/player-sheet-clean-socks-v3.png'))
$sheet=[Drawing.Bitmap]::FromFile((Join-Path $assets 'unused/player-sheet-clean-barefoot-v3.png'));try{$cw=[int][Math]::Floor($sheet.Width/5.0);$ch=[int][Math]::Floor($sheet.Height/3.0);$icon=$sheet.Clone((New-Object Drawing.Rectangle(0,$ch,$cw,$ch)),[Drawing.Imaging.PixelFormat]::Format32bppArgb);try{$icon.Save((Join-Path $assets 'used/clean-clothes-icon-v1.png'),[Drawing.Imaging.ImageFormat]::Png)}finally{$icon.Dispose()}}finally{$sheet.Dispose()}
Write-Host $result