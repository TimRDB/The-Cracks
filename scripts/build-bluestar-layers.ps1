# Rebuild the street changes without resampling a single unaffected master pixel.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
public static class BluestarLayers {
  static bool Window(int x,int y) {
    return (x>=916 && x<979 && y>=458 && y<594) ||
           (x>=987 && x<1032 && y>=459 && y<595);
  }
  static bool Poster(int x,int y) {return x>=922 && x<973 && y>=467 && y<543;}
  public static void Build(string root) {
    using(var original=new Bitmap(root+"/assets/street_bg.png"))
    using(var open=new Bitmap(root+"/assets/street_doors_open.png"))
    using(var generated=new Bitmap(root+"/assets/street-counter-source-v2.png"))
    using(var patch=new Bitmap(447,201,PixelFormat.Format32bppArgb))
    using(var result=original.Clone(new Rectangle(0,0,original.Width,original.Height),PixelFormat.Format32bppArgb)) {
      using(var g=Graphics.FromImage(patch)) {
        g.InterpolationMode=System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode=System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
        g.DrawImage(generated,new Rectangle(0,0,447,201),0,0,generated.Width,generated.Height,GraphicsUnit.Pixel);
      }
      int changed=0;
      for(int y=458;y<595;y++) for(int x=916;x<1032;x++) {
        if(Window(x,y) && !Poster(x,y)) result.SetPixel(x,y,patch.GetPixel(x-902,y-427));
      }
      for(int y=0;y<original.Height;y++) for(int x=0;x<original.Width;x++) {
        if(result.GetPixel(x,y).ToArgb()!=original.GetPixel(x,y).ToArgb()) {
          if(!Window(x,y)||Poster(x,y)) throw new Exception("Unexpected background pixel change.");
          changed++;
        }
      }
      result.Save(root+"/assets/street_bg_counter_v2.png",ImageFormat.Png);
      Console.WriteLine("Changed "+changed+" window pixels; all other pixels, including the milk poster, are identical.");
      // The static interior remains untransformed, including during partial opening.
      using(var interior=open.Clone(new Rectangle(1040,461,110,154),PixelFormat.Format32bppArgb)) {
        // Counter return and opaque coffee-machine side: mask only the small
        // visible return at the left edge, never the aisle or distant shelves.
        for(int y=484;y<600;y++) for(int x=1043;x<1057;x++)
          interior.SetPixel(x-1040,y-461,patch.GetPixel(x-902,y-427));
        interior.Save(root+"/assets/bluestar-interior-v2.png",ImageFormat.Png);
      }
      for(int leaf=0;leaf<2;leaf++) {
        int left=1040+leaf*55;
        using(var frame=new Bitmap(55,154,PixelFormat.Format32bppArgb)) {
          for(int y=0;y<154;y++) for(int x=0;x<55;x++) {
            int gx=left+x,gy=461+y;
            bool glass=leaf==0 ? gx>=1046 && gx<1089 && gy>=469 && gy<601
                              : gx>=1102 && gx<1146 && gy>=469 && gy<601;
            bool handle=leaf==0 ? gx>=1085 && gx<1092 && gy>=530 && gy<553
                               : gx>=1100 && gx<1106 && gy>=530 && gy<553;
            // Exact original metal pixels; the glass contains no background RGB.
            frame.SetPixel(x,y,glass&&!handle?Color.Transparent:original.GetPixel(gx,gy));
          }
          frame.Save(root+"/assets/bluestar-door-"+(leaf==0?"left":"right")+"-v2.png",ImageFormat.Png);
        }
      }
    }
  }
}
'@
[BluestarLayers]::Build($root)
