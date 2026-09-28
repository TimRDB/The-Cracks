param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
public static class CleanOutfitRecolorV3 {
  static int Clamp(double value) { return Math.Max(0,Math.Min(255,(int)Math.Round(value))); }
  static bool Skin(Color c) { return c.R>65 && c.R>c.G*1.16 && c.R>c.B*1.25; }
  static bool Blue(Color c) { return c.A>0 && c.B>52 && c.B>c.R*1.06 && c.B>c.G*1.01 && c.B-c.R>6; }
  static bool ShirtCandidate(Color c) {
    int high=Math.Max(c.R,Math.Max(c.G,c.B));
    return c.A>0 && high>72 && !Skin(c) && c.B>=c.R*.88 && c.B>=c.G*.88;
  }
  static bool DarkCloth(Color c) {
    int high=Math.Max(c.R,Math.Max(c.G,c.B)),low=Math.Min(c.R,Math.Min(c.G,c.B));
    return c.A>0 && high<170 && high-low<38 && !Skin(c);
  }
  static void FillShortGaps(bool[,] mask,int x0,int x1,int y0,int y1,int gap) {
    for(int y=y0;y<=y1;y++) { int last=-1000; for(int x=x0;x<=x1;x++) if(mask[x,y]) { if(last>=x0&&x-last-1<=gap) for(int xx=last+1;xx<x;xx++) mask[xx,y]=true; last=x; } }
    for(int x=x0;x<=x1;x++) { int last=-1000; for(int y=y0;y<=y1;y++) if(mask[x,y]) { if(last>=y0&&y-last-1<=gap) for(int yy=last+1;yy<y;yy++) mask[x,yy]=true; last=y; } }
  }
  static void FindShirt(bool[,] candidate,bool[,] blue,bool[,] shirt,bool[,] torso,bool[,] stripe,int x0,int x1,int y0,int y1,int width) {
    bool[,] seen=new bool[x1-x0+1,y1-y0+1]; List<int> largest=new List<int>();
    int[] dx={1,-1,0,0},dy={0,0,1,-1};
    for(int sy=y0;sy<=y1;sy++) for(int sx=x0;sx<=x1;sx++) {
      if(!candidate[sx,sy]||seen[sx-x0,sy-y0]) continue;
      var comp=new List<int>();var queue=new Queue<int>();bool containsBlue=false;
      queue.Enqueue(sy*width+sx);seen[sx-x0,sy-y0]=true;
      while(queue.Count>0) {
        int value=queue.Dequeue(),x=value%width,y=value/width;comp.Add(value);containsBlue|=blue[x,y];
        for(int i=0;i<4;i++){int nx=x+dx[i],ny=y+dy[i];if(nx<x0||nx>x1||ny<y0||ny>y1||seen[nx-x0,ny-y0]||!candidate[nx,ny])continue;seen[nx-x0,ny-y0]=true;queue.Enqueue(ny*width+nx);}
      }
      if(!containsBlue) continue;
      foreach(int value in comp) shirt[value%width,value/width]=true;
      if(comp.Count>largest.Count) largest=comp;
    }
    foreach(int value in largest) torso[value%width,value/width]=true;
    FillShortGaps(shirt,x0,x1,y0,y1,6);FillShortGaps(shirt,x0,x1,y0,y1,3);
    FillShortGaps(torso,x0,x1,y0,y1,5);
    int min=x1+1,max=x0-1;
    foreach(int value in largest){int x=value%width;min=Math.Min(min,x);max=Math.Max(max,x);}
    if(max-min>=14) {
      int s1=(int)Math.Round(min+(max-min)*.18),s2=(int)Math.Round(min+(max-min)*.38),s3=(int)Math.Round(min+(max-min)*.58),s4=(int)Math.Round(min+(max-min)*.78);
      for(int y=y0;y<=y1;y++) for(int x=x0;x<=x1;x++) if(shirt[x,y]&&x>=min&&x<=max&&(x==s1||x==s2||x==s3||x==s4)) stripe[x,y]=true;
    }
  }
  public static void Build(string sourcePath,string outputPath) {
    using(Bitmap source=new Bitmap(sourcePath)) using(Bitmap output=source.Clone(new Rectangle(0,0,source.Width,source.Height),PixelFormat.Format32bppArgb)) {
      int width=source.Width,height=source.Height;
      bool[,] shirt=new bool[width,height],torso=new bool[width,height],stripe=new bool[width,height],pants=new bool[width,height],added=new bool[width,height];
      for(int row=0;row<3;row++) for(int col=0;col<5;col++) {
        int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1;
        int y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1;
        bool[,] candidate=new bool[width,height],blue=new bool[width,height];
        for(int y=y0;y<=y1;y++){double fy=(y-y0)/(double)fh;if(fy<.10||fy>.64)continue;for(int x=x0;x<=x1;x++){Color c=source.GetPixel(x,y);blue[x,y]=Blue(c);candidate[x,y]=ShirtCandidate(c);}}
        FindShirt(candidate,blue,shirt,torso,stripe,x0,x1,y0,y1,width);
        int seedTop=y0+(int)(fh*.68),seedBottom=Math.Min(y1,y0+(int)(fh*.88)),top=y0+(int)(fh*.46),bottom=Math.Min(y1,y0+(int)(fh*.94));
        for(int y=seedTop;y<=seedBottom;y++)for(int x=x0;x<=x1;x++){Color c=source.GetPixel(x,y);if(DarkCloth(c)&&!shirt[x,y])pants[x,y]=true;}
        for(int y=seedTop-1;y>=top;y--)for(int x=x0;x<=x1;x++){Color c=source.GetPixel(x,y);if(!DarkCloth(c)||shirt[x,y])continue;for(int xx=Math.Max(x0,x-1);xx<=Math.Min(x1,x+1);xx++)if(pants[xx,y+1]){pants[x,y]=true;break;}}
        for(int y=seedBottom+1;y<=bottom;y++)for(int x=x0;x<=x1;x++){Color c=source.GetPixel(x,y);if(!DarkCloth(c)||shirt[x,y])continue;for(int xx=Math.Max(x0,x-1);xx<=Math.Min(x1,x+1);xx++)if(pants[xx,y-1]){pants[x,y]=true;break;}}
        for(int pass=0;pass<2;pass++){
          var additions=new List<int>();
          for(int y=top;y<=bottom;y++)for(int x=x0;x<=x1;x++)if(!pants[x,y]){Color c=source.GetPixel(x,y);if(c.A==0||Skin(c)||shirt[x,y])continue;int high=Math.Max(c.R,Math.Max(c.G,c.B));if(high>190)continue;bool near=false;for(int yy=Math.Max(top,y-1);yy<=Math.Min(bottom,y+1)&&!near;yy++)for(int xx=Math.Max(x0,x-1);xx<=Math.Min(x1,x+1);xx++)if(pants[xx,yy]){near=true;break;}if(near)additions.Add(y*width+x);}
          foreach(int value in additions)pants[value%width,value/width]=true;
        }
        int hem=y0+(int)(fh*.61),torsoMin=x1+1,torsoMax=x0-1,hipMin=x1+1,hipMax=x0-1;
        for(int y=y0;y<=y1;y++)for(int x=x0;x<=x1;x++)if(torso[x,y]){torsoMin=Math.Min(torsoMin,x);torsoMax=Math.Max(torsoMax,x);}
        for(int y=hem;y<=Math.Min(y1,hem+(int)(fh*.06));y++)for(int x=x0;x<=x1;x++)if(pants[x,y]){hipMin=Math.Min(hipMin,x);hipMax=Math.Max(hipMax,x);}
        if(hipMax>=hipMin){
          double hipCenter=(hipMin+hipMax)/2.0,hipHalf=(hipMax-hipMin+1)/2.0;
          double shirtCenter=torsoMax>=torsoMin?(torsoMin+torsoMax)/2.0:hipCenter,shirtHalf=torsoMax>=torsoMin?Math.Max(5,(torsoMax-torsoMin+1)*.48):Math.Max(5,hipHalf*.45);
          int upper=row==2?y0+(int)(fh*.58):top;
          for(int y=upper;y<hem;y++){
            double progress=Math.Max(0,Math.Min(1,(y-upper)/(double)Math.Max(1,hem-upper)));
            double center=shirtCenter+(hipCenter-shirtCenter)*progress,half=shirtHalf+(hipHalf-shirtHalf)*progress;
            int left=(int)Math.Floor(center-half),right=(int)Math.Ceiling(center+half);
            for(int x=x0;x<=x1;x++)if(x<left||x>right)pants[x,y]=false;
          }
          if(row==2)for(int y=top;y<upper;y++)for(int x=x0;x<=x1;x++)pants[x,y]=false;
        }
        for(int y=y0+(int)(fh*.57);y<=Math.Min(bottom,y0+(int)(fh*.90));y++){
          int min=x1+1,max=x0-1,count=0;for(int x=x0;x<=x1;x++)if(pants[x,y]){min=Math.Min(min,x);max=Math.Max(max,x);count++;}if(count<6)continue;
          double fy=(y-y0)/(double)fh;int widen=fy<.72?1:2;
          for(int d=1;d<=widen;d++){int left=min-d,right=max+d;if(left>=x0&&source.GetPixel(left,y).A==0){pants[left,y]=true;added[left,y]=true;}if(right<=x1&&source.GetPixel(right,y).A==0){pants[right,y]=true;added[right,y]=true;}}
        }
      }
      for(int y=0;y<height;y++)for(int x=0;x<width;x++){
        Color c=source.GetPixel(x,y);double lum=c.R*.299+c.G*.587+c.B*.114;
        if(shirt[x,y]){
          double tone=Math.Max(148,Math.Min(202,172+(lum-140)*.22));
          if(stripe[x,y]){int white=Clamp(224+(lum-140)*.08);output.SetPixel(x,y,Color.FromArgb(255,white,white,Clamp(white-4)));}
          else output.SetPixel(x,y,Color.FromArgb(255,Clamp(tone*.80),Clamp(tone*1.04),Clamp(tone*.83)));
        }else if(pants[x,y]){
          if(added[x,y]){int nearest=-1;for(int d=1;d<=4&&nearest<0;d++){if(x-d>=0&&pants[x-d,y]&&!added[x-d,y])nearest=x-d;else if(x+d<width&&pants[x+d,y]&&!added[x+d,y])nearest=x+d;}if(nearest>=0){Color e=source.GetPixel(nearest,y);lum=e.R*.299+e.G*.587+e.B*.114;}else lum=45;}
          double baseTone=Math.Max(128,Math.Min(168,115+lum*.52));
          output.SetPixel(x,y,Color.FromArgb(255,Clamp(baseTone+18),Clamp(baseTone*.86),Clamp(baseTone*.62)));
        }else{
          int row=(int)Math.Min(2,Math.Floor(y/(height/3.0))),y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1;double fy=(y-y0)/(double)(y1-y0+1);
          int high=Math.Max(c.R,Math.Max(c.G,c.B)),low=Math.Min(c.R,Math.Min(c.G,c.B));bool jacket=c.A>0&&fy>.11&&fy<.62&&high<155&&high-low<55&&!Skin(c);
          if(jacket){double target=50+(lum-50)*.68,scale=lum>1?target/lum:1;output.SetPixel(x,y,Color.FromArgb(c.A,Clamp(c.R*scale),Clamp(c.G*scale),Clamp(c.B*scale)));}
        }
      }
      output.Save(outputPath,ImageFormat.Png);
    }
  }
  public static void AddSocks(string cleanBarePath,string originalBarePath,string sockSourcePath,string outputPath) {
    using(Bitmap clean=new Bitmap(cleanBarePath)) using(Bitmap originalBare=new Bitmap(originalBarePath)) using(Bitmap socks=new Bitmap(sockSourcePath))
    using(Bitmap output=clean.Clone(new Rectangle(0,0,clean.Width,clean.Height),PixelFormat.Format32bppArgb)) {
      int width=clean.Width,height=clean.Height;bool[,] mask=new bool[width,height];
      for(int row=0;row<3;row++)for(int col=0;col<5;col++){
        int x0=(int)Math.Round(col*width/5.0),x1=(int)Math.Round((col+1)*width/5.0)-1;
        int y0=(int)Math.Round(row*height/3.0),y1=(int)Math.Round((row+1)*height/3.0)-1,fh=y1-y0+1,start=y0+(int)(fh*.70);
        for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++){
          Color c=socks.GetPixel(x,y);int high=Math.Max(c.R,Math.Max(c.G,c.B)),low=Math.Min(c.R,Math.Min(c.G,c.B));double lum=c.R*.299+c.G*.587+c.B*.114;
          if(c.A>0&&lum>112&&high-low<28&&!Skin(c))mask[x,y]=true;
        }
        for(int pass=0;pass<4;pass++){
          var additions=new List<int>();
          for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++)if(!mask[x,y]){
            Color c=socks.GetPixel(x,y);int high=Math.Max(c.R,Math.Max(c.G,c.B)),low=Math.Min(c.R,Math.Min(c.G,c.B));
            if(c.A==0||Skin(c)||high-low>52)continue;bool near=false;
            for(int yy=Math.Max(start,y-1);yy<=Math.Min(y1,y+1)&&!near;yy++)for(int xx=Math.Max(x0,x-1);xx<=Math.Min(x1,x+1);xx++)if(mask[xx,yy]){near=true;break;}
            if(near)additions.Add(y*width+x);
          }
          foreach(int value in additions)mask[value%width,value/width]=true;
        }
        int minX=x1+1,maxX=x0-1,minY=y1+1;
        for(int y=start;y<=y1;y++)for(int x=x0;x<=x1;x++)if(mask[x,y]){minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);}
        if(maxX>=minX)for(int y=Math.Max(start,minY-2);y<=y1;y++)for(int x=Math.Max(x0,minX-3);x<=Math.Min(x1,maxX+3);x++){
          Color bare=clean.GetPixel(x,y);
          if(mask[x,y])output.SetPixel(x,y,socks.GetPixel(x,y));
          else if(Skin(originalBare.GetPixel(x,y)))output.SetPixel(x,y,Color.FromArgb(0,0,0,0));
        }
      }
      output.Save(outputPath,ImageFormat.Png);
    }
  }
}
"@
$assets=Join-Path $ProjectRoot 'assets'
[CleanOutfitRecolorV3]::Build((Join-Path $assets 'unused/player-sheet-clothes-barefoot-v1.png'),(Join-Path $assets 'unused/player-sheet-clean-barefoot-v1.png'))
[CleanOutfitRecolorV3]::AddSocks((Join-Path $assets 'unused/player-sheet-clean-barefoot-v1.png'),(Join-Path $assets 'unused/player-sheet-clothes-barefoot-v1.png'),(Join-Path $assets 'unused/player-sheet-clothes-socks-v1.png'),(Join-Path $assets 'unused/player-sheet-clean-socks-v1.png'))
$sheet=[Drawing.Bitmap]::FromFile((Join-Path $assets 'unused/player-sheet-clean-barefoot-v1.png'));try{$cellW=[int][Math]::Floor($sheet.Width/5.0);$cellH=[int][Math]::Floor($sheet.Height/3.0);$icon=$sheet.Clone((New-Object Drawing.Rectangle(0,$cellH,$cellW,$cellH)),[Drawing.Imaging.PixelFormat]::Format32bppArgb);try{$icon.Save((Join-Path $assets 'used/clean-clothes-icon-v1.png'),[Drawing.Imaging.ImageFormat]::Png)}finally{$icon.Dispose()}}finally{$sheet.Dispose()}
Write-Host 'Built clean outfit v3 at native resolution.'