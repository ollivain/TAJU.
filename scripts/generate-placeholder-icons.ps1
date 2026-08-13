param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public\icons")
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.Color]::FromArgb(40, 118, 74))

  $inset = [int]($size * 0.14)
  $circleSize = $size - ($inset * 2)
  $creamBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 243, 237))
  $graphics.FillEllipse($creamBrush, $inset, $inset, $circleSize, $circleSize)

  $fontSize = [single]($size * 0.42)
  $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $inkBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(24, 37, 31))
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString("T", $font, $inkBrush, [System.Drawing.RectangleF]::new(0, 0, $size, $size), $format)

  $target = Join-Path $resolvedOutput "taju-$size.png"
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

  $format.Dispose()
  $inkBrush.Dispose()
  $font.Dispose()
  $creamBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}
