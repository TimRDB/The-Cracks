param(
  [string]$Source = (Join-Path $PSScriptRoot '..\assets\alley-man-open-source-v6.png'),
  [string]$Output = (Join-Path $PSScriptRoot '..\assets\alley-man-sprite-v6.png')
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class AlleyManV6Builder {
  static bool GreenBackground(Color c, Color key) {
    int dr=c.R-key.R, dg=c.G-key.G, db=c.B-key.B;
    return dr*dr+dg*dg+db*db < 140*140 && c.G > c.R*1.12 && c.G > c.B*1.08;
  }

  public static string Build(string sourcePath, string outputPath) {
    using (var source = new Bitmap(sourcePath)) {
      int width=source.Width, height=source.Height, count=width*height;
      Color key=source.GetPixel(2,2);
      bool[] background=new bool[count];
      var queue=new Queue<int>();
      Action<int,int> seed=(x,y)=>{int i=y*width+x;if(!background[i]&&GreenBackground(source.GetPixel(x,y),key)){background[i]=true;queue.Enqueue(i);}};
      for(int x=0;x<width;x++){seed(x,0);seed(x,height-1);}
      for(int y=0;y<height;y++){seed(0,y);seed(width-1,y);}
      int[] ox={-1,1,0,0},oy={0,0,-1,1};
      while(queue.Count>0){int i=queue.Dequeue(),x=i%width,y=i/width;for(int n=0;n<4;n++){int nx=x+ox[n],ny=y+oy[n];if(nx<0||ny<0||nx>=width||ny>=height)continue;int ni=ny*width+nx;if(!background[ni]&&GreenBackground(source.GetPixel(nx,ny),key)){background[ni]=true;queue.Enqueue(ni);}}}

      using(var open=new Bitmap(width,height,PixelFormat.Format32bppArgb)){
        for(int y=0;y<height;y++)for(int x=0;x<width;x++){
          int i=y*width+x;
          if(background[i]){open.SetPixel(x,y,Color.Transparent);continue;}
          Color c=source.GetPixel(x,y);
          bool edge=false;
          for(int yy=Math.Max(0,y-1);yy<=Math.Min(height-1,y+1)&&!edge;yy++)
            for(int xx=Math.Max(0,x-1);xx<=Math.Min(width-1,x+1);xx++)
              if(background[yy*width+xx]){edge=true;break;}
          if(edge && c.G>c.R*1.05 && c.G>c.B*1.05){
            double dr=c.R-key.R,dg=c.G-key.G,db=c.B-key.B;
            double distance=Math.Sqrt(dr*dr+dg*dg+db*db);
            double alpha=Math.Max(.08,Math.Min(1,(distance-105)/80));
            int r=(int)Math.Max(0,Math.Min(255,(c.R-(1-alpha)*key.R)/alpha));
            int g=(int)Math.Max(0,Math.Min(255,(c.G-(1-alpha)*key.G)/alpha));
            int b=(int)Math.Max(0,Math.Min(255,(c.B-(1-alpha)*key.B)/alpha));
            open.SetPixel(x,y,Color.FromArgb((int)Math.Round(alpha*255),r,g,b));
          } else open.SetPixel(x,y,Color.FromArgb(255,c.R,c.G,c.B));
        }

        using(var closed=(Bitmap)open.Clone()){
          using(var graphics=Graphics.FromImage(closed)){
            graphics.SmoothingMode=SmoothingMode.AntiAlias;
            Color leftSkin=open.GetPixel(632,341);
            Color rightSkin=open.GetPixel(683,342);
            using(var leftFill=new SolidBrush(Color.FromArgb(255,leftSkin.R,leftSkin.G,leftSkin.B)))
            using(var rightFill=new SolidBrush(Color.FromArgb(255,rightSkin.R,rightSkin.G,rightSkin.B)))
            using(var lid=new Pen(Color.FromArgb(255,78,43,37),3.2f)){
              graphics.FillEllipse(leftFill,623,322,20,17);
              graphics.FillEllipse(rightFill,672,323,22,17);
              graphics.DrawBezier(lid,new PointF(625,330),new PointF(630,333),new PointF(636,333),new PointF(641,330));
              graphics.DrawBezier(lid,new PointF(674,331),new PointF(679,334),new PointF(686,334),new PointF(692,331));
            }
          }

          using(var sheet=new Bitmap(width*2,height,PixelFormat.Format32bppArgb)){
            using(var graphics=Graphics.FromImage(sheet)){
              graphics.CompositingMode=CompositingMode.SourceCopy;
              graphics.DrawImageUnscaled(open,0,0);
              graphics.DrawImageUnscaled(closed,width,0);
            }
            sheet.SetResolution(source.HorizontalResolution,source.VerticalResolution);
            sheet.Save(outputPath,ImageFormat.Png);
          }
        }
      }
      return String.Format("source={0}x{1}; sheet={2}x{1}; frames=2; keyed=edge-connected background only; blink edits=eye regions only",width,height,width*2);
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

[AlleyManV6Builder]::Build(
  [System.IO.Path]::GetFullPath($Source),
  [System.IO.Path]::GetFullPath($Output)
)
