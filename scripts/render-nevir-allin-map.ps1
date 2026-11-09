$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$mapRoot=Split-Path -Parent $PSScriptRoot
$mapData=Get-Content -LiteralPath (Join-Path $mapRoot 'research/nevir-system/allin-map-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$mapCase=$mapData.displayCase
$mapBitmap=[System.Drawing.Bitmap]::new(1100,760)
$mapGraphics=[System.Drawing.Graphics]::FromImage($mapBitmap)
$mapGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$mapGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$mapGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f8f9fb'))
function Map-Text([string]$Text,[float]$X,[float]$Y,[int]$Size=24,[string]$Color='#2b3039'){
 $mapFont=[System.Drawing.Font]::new('Microsoft YaHei UI',$Size,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
 $mapBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $mapGraphics.DrawString($Text,$mapFont,$mapBrush,$X,$Y);$mapBrush.Dispose();$mapFont.Dispose()
}
Map-Text '对手已全下：只看这次跟注与弃牌' 70 52 36
Map-Text '自己 9♣ 9♦    公共牌 K♠ 9♥ 2♦ 3♣ 7♥' 70 118 25
Map-Text '当前池 163       还需补 38       跟完池 201' 70 190 28
Map-Text '先找分界：38 ÷ 201 = 18.91%' 70 256 30
Map-Text '再定位自己：给定 KK : 77 = 1 : 2，自己赢其中2份，约66.67%。' 70 320 23
$mapLeft=100;$mapWidth=900;$mapY=425;$mapThreshold=$mapLeft+$mapWidth*$mapCase.price;$mapMarker=$mapLeft+$mapWidth*$mapCase.equityShare
$mapRed=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f2dfe4'))
$mapGreen=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#dceee4'))
$mapGraphics.FillRectangle($mapRed,$mapLeft,$mapY,($mapThreshold-$mapLeft),48)
$mapGraphics.FillRectangle($mapGreen,$mapThreshold,$mapY,($mapLeft+$mapWidth-$mapThreshold),48)
$mapRed.Dispose();$mapGreen.Dispose()
Map-Text '弃牌较高' 126 435 22 '#985262';Map-Text '跟注较高' 438 435 22 '#3e725a'
$mapPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#636c7b'),2)
$mapPen.DashStyle=[System.Drawing.Drawing2D.DashStyle]::Dash;$mapGraphics.DrawLine($mapPen,$mapThreshold,398,$mapThreshold,516);$mapPen.Dispose()
$mapDot=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#3e725a'));$mapGraphics.FillEllipse($mapDot,($mapMarker-10),($mapY-9),20,20);$mapDot.Dispose()
Map-Text '自己在这里：66.67%' ($mapMarker-95) 380 22 '#3e725a'
foreach($mapPct in @(0,25,50,75,100)){Map-Text ($mapPct.ToString()+'%') ($mapLeft+$mapWidth*$mapPct/100-12) 484 18 '#7c8491'}
Map-Text '分界处两者相同；精确判分使用原数，不用四舍五入后的百分比。' 70 550 20 '#69717e'
Map-Text '范围变了，点会动；价格变了，分界会动。' 70 605 27
Map-Text '前提：两人、全下后无后续下注、给定范围、零抽水。胜出份额计入平分。' 70 668 18 '#7c8491'
Map-Text '答后方法图；未取得普通有后续下注局面的完整动作表。' 70 706 18 '#7c8491'
$mapFile=Join-Path $mapRoot 'research/nevir-system/figures/allin-decision-boundary.png'
$mapBitmap.Save($mapFile,[System.Drawing.Imaging.ImageFormat]::Png)
$mapGraphics.Dispose();$mapBitmap.Dispose();Write-Output $mapFile
