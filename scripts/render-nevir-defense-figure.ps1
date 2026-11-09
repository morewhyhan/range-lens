$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$defenseRoot = Split-Path -Parent $PSScriptRoot
$defenseData = Get-Content -LiteralPath (Join-Path $defenseRoot 'research/nevir-system/defense-tree-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if(($defenseData.holdings | Where-Object {$_.id -eq 'KK'}).wins.Count -ne 7){throw 'Unexpected KK outcome count'}
$defenseBitmap = [System.Drawing.Bitmap]::new(1200,1140)
$defenseGraphics = [System.Drawing.Graphics]::FromImage($defenseBitmap)
$defenseGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$defenseGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$defenseGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$defenseFonts=@{}
foreach($defenseSize in @(19,22,25,29,34)){ $defenseFonts[$defenseSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$defenseSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-DefenseText([string]$Content,[float]$X,[float]$Y,[int]$Size=25,[string]$Color='#292b31'){
 $defenseBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $defenseGraphics.DrawString($Content,$defenseFonts[$Size],$defenseBrush,$X,$Y);$defenseBrush.Dispose()
}
function Draw-DefenseBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#ffffff'){
 $defensePath=[System.Drawing.Drawing2D.GraphicsPath]::new();$defenseRadius=22
 $defensePath.AddArc($X,$Y,$defenseRadius,$defenseRadius,180,90);$defensePath.AddArc(($X+$W-$defenseRadius),$Y,$defenseRadius,$defenseRadius,270,90)
 $defensePath.AddArc(($X+$W-$defenseRadius),($Y+$H-$defenseRadius),$defenseRadius,$defenseRadius,0,90);$defensePath.AddArc($X,($Y+$H-$defenseRadius),$defenseRadius,$defenseRadius,90,90);$defensePath.CloseFigure()
 $defenseBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$defenseGraphics.FillPath($defenseBrush,$defensePath)
 $defenseBrush.Dispose();$defensePath.Dispose()
}
function Draw-DefenseCards([object[]]$Cards,[float]$X,[float]$Y,[float]$Gap=91,[string]$Tint=''){
 $defenseLabels=@{s='♠';h='♥';d='♦';c='♣'}
 for($defenseIndex=0;$defenseIndex -lt $Cards.Count;$defenseIndex++){
  $defenseId=[string]$Cards[$defenseIndex];$defenseX=$X+$defenseIndex*$Gap
  $defenseFill=if($Tint -eq 'dirty' -and $defenseId -in @('2s','3s')){'#f8e8ea'}else{'#eef0f4'}
  Draw-DefenseBox $defenseX $Y 76 91 $defenseFill
  $defenseRank=$defenseId.Substring(0,1);if($defenseRank -eq 'T'){$defenseRank='10'}
  $defenseSuit=$defenseId.Substring(1,1);$defenseColor=if($defenseSuit -in @('h','d')){'#ad4c56'}else{'#30343b'}
  Write-DefenseText ($defenseRank+$defenseLabels[$defenseSuit]) ($defenseX+10) ($Y+27) 25 $defenseColor
 }
}
Write-DefenseText '九张能成花，只有七张赢这手 KK' 54 36 34
Write-DefenseText '明示对手 K♥ K♦ 的读牌对照 · 只核对跑牌结果，不给跟弃指令' 56 92 19 '#737780'
Draw-DefenseBox 35 145 1130 184
Write-DefenseText '现在的公共牌' 62 163 22
Draw-DefenseCards @('Ks','7s','2d','3d') 62 209
Write-DefenseText '自己' 631 163 22
Draw-DefenseCards @('As','Qs') 631 209
Write-DefenseText '自己已知六张牌后，九张未见黑桃' 56 369 25
Draw-DefenseCards @('2s','3s','4s','5s','6s','8s','9s','Ts','Js') 56 420 122 'dirty'
Write-DefenseText '成花仍输' 56 526 19 '#ad4c56'
Write-DefenseText '成花仍输' 178 526 19 '#ad4c56'
Write-DefenseText '其余七张：对这手 KK 获胜' 344 526 22 '#377a69'
Write-DefenseText '看一个具体结果：河牌发 2♠' 56 596 29
Draw-DefenseBox 35 654 550 276
Draw-DefenseBox 615 654 550 276
Write-DefenseText '自己的最佳五张' 62 680 22
Write-DefenseText '对手的最佳五张' 642 680 22
Draw-DefenseCards @('As','Ks','Qs','7s','2s') 62 728 99
Draw-DefenseCards @('Kh','Kd','Ks','2d','2s') 642 728 99
Write-DefenseText 'A 高同花' 62 851 25
Write-DefenseText 'K 满 2 葫芦，更大' 642 851 25 '#ad4c56'
Write-DefenseText '“让自己成牌”和“让自己获胜”，不是同一个计数。' 56 978 25
Write-DefenseText '对手换成其他牌，获胜集合会变化；真实决定还要比较整个范围与后续。' 56 1041 19 '#737780'
$defenseOutput=Join-Path $defenseRoot 'research/nevir-system/figures/defense-dirty-outs.png'
$defenseBitmap.Save($defenseOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($defenseFont in $defenseFonts.Values){$defenseFont.Dispose()}
$defenseGraphics.Dispose();$defenseBitmap.Dispose();Write-Output $defenseOutput
