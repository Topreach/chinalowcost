$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$project = Split-Path $PSScriptRoot -Parent
$source = [System.Drawing.Image]::FromFile((Join-Path $project 'assets/brand/chinalowcost-master.png'))
function Save-BrandIcon([string]$RelativePath, [int]$Size) {
  $target = Join-Path $project $RelativePath
  [System.IO.Directory]::CreateDirectory((Split-Path $target -Parent)) | Out-Null
  $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, $Size, $Size)
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose() }
}
try {
  foreach ($size in @(32,48,180,192,512)) { Save-BrandIcon "backend/public/brand-$size.png" $size }
  Save-BrandIcon 'mobile/ios/App/App/Assets.xcassets/AppIcon.appiconset/ChinaLowCost-icon.png' 1024
  foreach ($entry in @(@('mdpi',48),@('hdpi',72),@('xhdpi',96),@('xxhdpi',144),@('xxxhdpi',192))) {
    Save-BrandIcon "mobile/android/app/src/main/res/mipmap-$($entry[0])/clc_brand.png" $entry[1]
  }
} finally { $source.Dispose() }
