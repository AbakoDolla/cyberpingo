param(
  [string]$Source = "$PSScriptRoot\..\public\images\cyberpingo-official.png",
  [string]$Destination = "$PSScriptRoot\..\public\images\cyberpingo-transparent.png"
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class LogoBackground {
  public static void Remove(string source, string destination) {
    using (var original = new Bitmap(source))
    using (var image = new Bitmap(original.Width, original.Height, PixelFormat.Format32bppArgb)) {
      using (var graphics = Graphics.FromImage(image)) graphics.DrawImageUnscaled(original, 0, 0);
      int w = image.Width, h = image.Height;
      // The black plumage touches the backdrop, so flood-fill alone eats the mascot.
      // Preserve its silhouette in the supplied 1536px artwork; scale for other sizes.
      using (var subject = new GraphicsPath()) {
      var outline = new PointF[] {
        new PointF(587,430), new PointF(614,397), new PointF(630,340),
        new PointF(665,292), new PointF(718,260), new PointF(791,241),
        new PointF(767,261), new PointF(838,248), new PointF(789,282),
        new PointF(846,279), new PointF(813,301), new PointF(869,322),
        new PointF(907,360), new PointF(931,400), new PointF(951,418),
        new PointF(954,475), new PointF(965,511), new PointF(1000,529),
        new PointF(1020,574), new PointF(1007,630), new PointF(1030,697),
        new PointF(1020,763), new PointF(994,829), new PointF(979,877),
        new PointF(943,933), new PointF(891,953), new PointF(551,948),
        new PointF(502,910), new PointF(469,864), new PointF(444,806),
        new PointF(450,757), new PointF(472,711), new PointF(518,660),
        new PointF(514,606), new PointF(533,552), new PointF(582,520)
      };
      for (int i = 0; i < outline.Length; i++) outline[i] = new PointF(outline[i].X * w / 1536f, outline[i].Y * h / 1536f);
      subject.AddPolygon(outline);
      var bounds = new Rectangle(0, 0, w, h);
      var data = image.LockBits(bounds, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
      var pixels = new byte[data.Stride * h];
      Marshal.Copy(data.Scan0, pixels, 0, pixels.Length);
      var protectedPixels = new byte[pixels.Length];
      using (var mask = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
        using (var graphics = Graphics.FromImage(mask)) graphics.FillPath(Brushes.White, subject);
        var maskData = mask.LockBits(bounds, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(maskData.Scan0, protectedPixels, 0, protectedPixels.Length);
        mask.UnlockBits(maskData);
      }
      var seen = new bool[w * h];
      var queue = new Queue<int>();
      for (int x = 0; x < w; x++) { queue.Enqueue(x); queue.Enqueue((h - 1) * w + x); }
      for (int y = 0; y < h; y++) { queue.Enqueue(y * w); queue.Enqueue(y * w + w - 1); }
      while (queue.Count > 0) {
        int p = queue.Dequeue();
        if (seen[p]) continue;
        seen[p] = true;
        int x = p % w, y = p / w;
        int offset = y * data.Stride + x * 4;
        if (protectedPixels[offset + 3] > 0) continue;
        // Only near-black pixels connected to the outside, never enclosed subject details.
        if (Math.Max(pixels[offset], Math.Max(pixels[offset + 1], pixels[offset + 2])) > 24) continue;
        pixels[offset + 3] = 0;
        if (x > 0) queue.Enqueue(p - 1);
        if (x < w - 1) queue.Enqueue(p + 1);
        if (y > 0) queue.Enqueue(p - w);
        if (y < h - 1) queue.Enqueue(p + w);
      }
      Marshal.Copy(pixels, 0, data.Scan0, pixels.Length);
      image.UnlockBits(data);
      image.Save(destination, ImageFormat.Png);
      }
    }
  }
}
'@

[LogoBackground]::Remove([System.IO.Path]::GetFullPath($Source), [System.IO.Path]::GetFullPath($Destination))
Write-Output "Logo transparent créé : $Destination"
