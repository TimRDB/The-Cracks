# Pixel-level regression checks for the Bluestar visual fix.
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
public static class BluestarVisualChecks {
  public static void Run(string root) {
    using(var a=new Bitmap(root+"/assets/street_bg.png"))
    using(var b=new Bitmap(root+"/assets/street_bg_counter_v2.png")) {
      if(a.Size!=b.Size) throw new Exception("Street resolution changed.");
      int same=0,changed=0;
      for(int y=0;y<a.Height;y++) for(int x=0;x<a.Width;x++) {
        bool window=(x>=916&&x<979&&y>=458&&y<594)||(x>=987&&x<1032&&y>=459&&y<595);
        bool poster=x>=922&&x<973&&y>=467&&y<543;
        if(a.GetPixel(x,y).ToArgb()!=b.GetPixel(x,y).ToArgb()) {
          if(!window||poster) throw new Exception("Unapproved change at "+x+","+y);
          changed++;
        } else same++;
      }
      Console.WriteLine("Background: "+same+" unchanged pixels; "+changed+" changed counter-window pixels; native resolution "+a.Width+" x "+a.Height+".");
    }
    foreach(string side in new[]{"left","right"}) {
      using(var frame=new Bitmap(root+"/assets/bluestar-door-"+side+"-v2.png")) {
        int count=0;
        // Broad glass regions must be truly empty, not sampled store shelves.
        for(int y=15;y<130;y++) for(int x=12;x<40;x++) {
          if(frame.GetPixel(x,y).A!=0) throw new Exception("Store pixels leaked into moving glass.");
          count++;
        }
        Console.WriteLine(side+" door: "+count+" checked glass pixels are fully transparent.");
      }
    }
    using(var closed=new Bitmap(root+"/output/bluestar-v2-closed.png"))
    using(var half=new Bitmap(root+"/output/bluestar-v2-half-open.png")) {
      double difference=0;int count=0,max=0;
      foreach(var r in new[]{new Rectangle(1072,498,8,21),new Rectangle(1110,568,8,23)}) {
        for(int y=r.Top;y<r.Bottom;y++) for(int x=r.Left;x<r.Right;x++) {
          var a=closed.GetPixel(x,y);var b=half.GetPixel(x,y);
          int dr=Math.Abs(a.R-b.R),dg=Math.Abs(a.G-b.G),db=Math.Abs(a.B-b.B);
          max=Math.Max(max,Math.Max(dr,Math.Max(dg,db)));
          difference+=dr+dg+db;count+=3;
        }
      }
      double mean=difference/count;
      // Allow only the faint glass reflection, never translated shelf imagery.
      if(mean>3 || max>12) throw new Exception("Interior moved during animation: mean="+mean+", maximum="+max);
      Console.WriteLine("Closed versus halfway-open interior: mean channel difference "+mean.ToString("F3")+", maximum "+max+" (reflection only).");
    }
  }
}
'@
[BluestarVisualChecks]::Run($root)
