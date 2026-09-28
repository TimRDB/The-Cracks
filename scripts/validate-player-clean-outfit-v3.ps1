param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
public static class ValidateExactCleanOutfit {
  static bool Skin(Color c){return c.A>0&&c.R>80&&c.R>c.G*1.13&&c.R>c.B*1.18&&c.G>35;}
  static bool Sock(Color c){int hi=Math.Max(c.R,Math.Max(c.G,c.B)),lo=Math.Min(c.R,Math.Min(c.G,c.B));return c.A>0&&!Skin(c)&&hi>95&&hi-lo<34;}
  static long Check(string sourcePath,string outputPath,bool socks){
    using(Bitmap source=new Bitmap(sourcePath))using(Bitmap output=new Bitmap(outputPath)){
      if(source.Width!=1619||source.Height!=971||output.Width!=source.Width||output.Height!=source.Height)throw new Exception("Unexpected sheet dimensions");
      long alphaMismatch=0,protectedMismatch=0,sockMismatch=0;double rowHeight=source.Height/3.0;
      for(int y=0;y<source.Height;y++)for(int x=0;x<source.Width;x++){
        Color a=source.GetPixel(x,y),b=output.GetPixel(x,y);if(a.A!=b.A)alphaMismatch++;
        double local=y-Math.Floor(y/rowHeight)*rowHeight;
        if(Skin(a)&&(local<rowHeight*.33||local>rowHeight*.62)&&a.ToArgb()!=b.ToArgb())protectedMismatch++;
        if(socks&&local>=rowHeight*.68&&Sock(a)&&a.ToArgb()!=b.ToArgb())sockMismatch++;
      }
      if(alphaMismatch>0)throw new Exception("Alpha geometry differs from proven source: "+alphaMismatch);
      if(protectedMismatch>0)throw new Exception("Face, hand, finger, leg or foot pixels changed: "+protectedMismatch);
      if(sockMismatch>0)throw new Exception("Proven sock pixels changed: "+sockMismatch);
      return source.Width*(long)source.Height;
    }
  }
  public static string Run(string bareSource,string socksSource,string bareOutput,string socksOutput){long a=Check(bareSource,bareOutput,false),b=Check(socksSource,socksOutput,true);return String.Format("validated {0} pixels per sheet; alpha exact; exposed character exact; socks exact",a);}
}
"@
$assets=Join-Path $ProjectRoot 'assets'
[ValidateExactCleanOutfit]::Run((Join-Path $assets 'unused/player-sheet-clothes-barefoot-v1.png'),(Join-Path $assets 'unused/player-sheet-clothes-socks-v1.png'),(Join-Path $assets 'unused/player-sheet-clean-barefoot-v3.png'),(Join-Path $assets 'unused/player-sheet-clean-socks-v3.png'))