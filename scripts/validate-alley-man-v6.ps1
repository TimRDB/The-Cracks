param(
  [string]$Sprite = (Join-Path $PSScriptRoot '..\assets\alley-man-sprite-v6.png')
)

$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;

public static class AlleyManV6Validator {
  static bool InEyes(int x, int y) {
    return (x >= 620 && x <= 646 && y >= 318 && y <= 343) ||
           (x >= 668 && x <= 698 && y >= 319 && y <= 344);
  }
  public static string Validate(string path) {
    using (var sheet = new Bitmap(path)) {
      if (sheet.Width % 2 != 0) throw new Exception("Sprite width must contain two equal frames.");
      int width = sheet.Width / 2, height = sheet.Height, count = width * height;
      int different = 0, outsideEyes = 0, transparent = 0, partialAlpha = 0;
      bool[] clear = new bool[count], exterior = new bool[count];
      var queue = new Queue<int>();
      for (int y = 0; y < height; y++) for (int x = 0; x < width; x++) {
        Color open = sheet.GetPixel(x, y), closed = sheet.GetPixel(x + width, y);
        int index = y * width + x;
        if (open.A == 0) { clear[index] = true; transparent++; }
        else if (open.A < 255) partialAlpha++;
        if (open.ToArgb() != closed.ToArgb()) { different++; if (!InEyes(x, y)) outsideEyes++; }
      }
      Action<int,int> seed = (x,y) => { int i=y*width+x; if(clear[i]&&!exterior[i]){exterior[i]=true;queue.Enqueue(i);} };
      for(int x=0;x<width;x++){seed(x,0);seed(x,height-1);}
      for(int y=0;y<height;y++){seed(0,y);seed(width-1,y);}
      while(queue.Count>0){int i=queue.Dequeue(),x=i%width,y=i/width;if(x>0)seed(x-1,y);if(x+1<width)seed(x+1,y);if(y>0)seed(x,y-1);if(y+1<height)seed(x,y+1);}
      int internalHoles=0; for(int i=0;i<count;i++)if(clear[i]&&!exterior[i])internalHoles++;
      if(different==0)throw new Exception("Blink frame has no changed pixels.");
      if(outsideEyes!=0)throw new Exception(outsideEyes+" changed pixels occur outside the eye regions.");
      if(internalHoles!=0)throw new Exception(internalHoles+" fully transparent pixels form internal holes.");
      return String.Format("sprite={0}x{1}; frames=2; changed pixels={2}; changes outside eyes={3}; transparent={4}; partial-alpha edge pixels={5}; internal transparent holes={6}",sheet.Width,height,different,outsideEyes,transparent,partialAlpha,internalHoles);
    }
  }
}
'@ -ReferencedAssemblies System.Drawing

[AlleyManV6Validator]::Validate([System.IO.Path]::GetFullPath($Sprite))
