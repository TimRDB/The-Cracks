$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public static class WakeupBedBuilder {
  public static void Build(string root) {
    using(var master=new Bitmap(root+"/assets/lighting/bedroom-states-v14/bedroom-c0-l0-m0.png"))
    using(var art=new Bitmap(root+"/assets/wakeup-sleeper-source-v1.png"))
    using(var patch=new Bitmap(630,220,PixelFormat.Format32bppArgb))
    using(var result=master.Clone(new Rectangle(0,0,master.Width,master.Height),PixelFormat.Format32bppArgb))
    using(var path=new GraphicsPath()) {
      using(var g=Graphics.FromImage(patch)) {
        g.InterpolationMode=InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode=PixelOffsetMode.HighQuality;
        g.DrawImage(art,new Rectangle(0,0,630,220),0,0,art.Width,art.Height,GraphicsUnit.Pixel);
      }
      // Matte stays within the pillow and bedding, away from the headboard,
      // bedside table, mattress edge, wood frame, wall and room geometry.
      PointF[] outline={new PointF(13,74),new PointF(25,59),new PointF(51,50),
        new PointF(78,40),new PointF(112,38),new PointF(137,43),new PointF(158,56),
        new PointF(194,45),new PointF(242,50),new PointF(281,59),new PointF(360,64),
        new PointF(455,71),new PointF(535,75),new PointF(593,73),new PointF(608,88),
        new PointF(608,135),new PointF(560,145),new PointF(455,151),new PointF(359,159),
        new PointF(260,156),new PointF(183,145),new PointF(117,139),new PointF(83,126),
        new PointF(35,115),new PointF(14,96)};
      path.AddPolygon(outline);
      int changed=0;
      for(int y=0;y<220;y++) for(int x=0;x<630;x++) {
        if(!path.IsVisible(x+.5f,y+.5f)) continue;
        double distance=10000;
        for(int i=0;i<outline.Length;i++) {
          PointF a=outline[i],b=outline[(i+1)%outline.Length];
          double dx=b.X-a.X,dy=b.Y-a.Y;
          double t=Math.Max(0,Math.Min(1,((x-a.X)*dx+(y-a.Y)*dy)/(dx*dx+dy*dy)));
          double ex=x-a.X-t*dx,ey=y-a.Y-t*dy;
          distance=Math.Min(distance,Math.Sqrt(ex*ex+ey*ey));
        }
        double alpha=Math.Min(1,distance/3);
        var aColor=master.GetPixel(x+115,y+345);var bColor=patch.GetPixel(x,y);
        result.SetPixel(x+115,y+345,Color.FromArgb(255,
          (int)Math.Round(aColor.R+(bColor.R-aColor.R)*alpha),
          (int)Math.Round(aColor.G+(bColor.G-aColor.G)*alpha),
          (int)Math.Round(aColor.B+(bColor.B-aColor.B)*alpha)));
      }
      for(int y=0;y<master.Height;y++) for(int x=0;x<master.Width;x++) {
        if(master.GetPixel(x,y).ToArgb()!=result.GetPixel(x,y).ToArgb()) {
          if(!path.IsVisible(x-115+.5f,y-345+.5f)) throw new Exception("Pixel changed outside bed matte.");
          changed++;
        }
      }
      result.Save(root+"/assets/bedroom-wakeup-v1.png",ImageFormat.Png);
      Console.WriteLine("Native "+master.Width+" x "+master.Height+": "+changed+" changed bed pixels; "+(master.Width*master.Height-changed)+" pixels identical to the existing bedroom.");
    }
  }
}
'@
[WakeupBedBuilder]::Build($root)
