$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$turnRoot = Split-Path -Parent $PSScriptRoot
$turnData = Get-Content -LiteralPath (Join-Path $turnRoot 'research/nevir-system/turn-transfer-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$turnExample = $turnData.pairs | Where-Object {$_.id -eq 'own_improvement'}
$turnBitmap = [System.Drawing.Bitmap]::new(1200,1060)
$turnGraphics = [System.Drawing.Graphics]::FromImage($turnBitmap)
$turnGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$turnGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$turnGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$turnFonts=@{}
foreach($turnSize in @(19,22,25,30,34)){ $turnFonts[$turnSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$turnSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-TurnText([string]$Content,[float]$X,[float]$Y,[int]$Size=25,[string]$Color='#292b31'){
 $turnBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $turnGraphics.DrawString($Content,$turnFonts[$Size],$turnBrush,$X,$Y);$turnBrush.Dispose()
}
function Draw-TurnBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#ffffff'){
 $turnPath=[System.Drawing.Drawing2D.GraphicsPath]::new();$turnRadius=22
 $turnPath.AddArc($X,$Y,$turnRadius,$turnRadius,180,90);$turnPath.AddArc(($X+$W-$turnRadius),$Y,$turnRadius,$turnRadius,270,90)
 $turnPath.AddArc(($X+$W-$turnRadius),($Y+$H-$turnRadius),$turnRadius,$turnRadius,0,90);$turnPath.AddArc($X,($Y+$H-$turnRadius),$turnRadius,$turnRadius,90,90);$turnPath.CloseFigure()
 $turnBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$turnGraphics.FillPath($turnBrush,$turnPath)
 $turnBrush.Dispose();$turnPath.Dispose()
}
function Draw-TurnCards([object[]]$Cards,[float]$X,[float]$Y,[string]$Highlight=''){
 $turnLabels=@{s='♠';h='♥';d='♦';c='♣'}
 for($turnCardIndex=0;$turnCardIndex -lt $Cards.Count;$turnCardIndex++){
  $turnId=[string]$Cards[$turnCardIndex];$turnCardX=$X+$turnCardIndex*83
  $turnFill=if($turnId -eq $Highlight){'#e8e2f4'}else{'#f1f2f5'}
  Draw-TurnBox $turnCardX $Y 72 91 $turnFill
  $turnRank=$turnId.Substring(0,1);if($turnRank -eq 'T'){$turnRank='10'}
  $turnSuit=$turnId.Substring(1,1);$turnColor=if($turnSuit -in @('h','d')){'#ad4c56'}else{'#30343b'}
  Write-TurnText ($turnRank+$turnLabels[$turnSuit]) ($turnCardX+9) ($Y+28) 25 $turnColor
 }
}
Write-TurnText '自己变强了，为什么还可能输？' 54 40 34
Write-TurnText '只核对当前最佳五张 · 指定亮牌对照 · 不代表下注或跟注答案' 56 97 19 '#737780'
Draw-TurnBox 35 153 550 755
Draw-TurnBox 615 153 550 755
Write-TurnText '翻牌' 65 179 30
Write-TurnText '转牌：来了 A♠' 645 179 30
Draw-TurnCards @('Qs','Th','5s') 65 235
Draw-TurnCards @('Qs','Th','5s','As') 645 235 'As'
Write-TurnText '自己 A♣ Q♥' 65 362 25
Write-TurnText '自己 A♣ Q♥' 645 362 25
Draw-TurnCards @($turnExample.before.heroBestCards) 65 413
Draw-TurnCards @($turnExample.heroBestCards) 645 413 'As'
Write-TurnText '一对 Q' 65 523 25
Write-TurnText 'A 和 Q 两对' 645 523 25
Write-TurnText '对照 K♣ J♣' 65 595 25
Write-TurnText '对照 K♣ J♣' 645 595 25
Draw-TurnCards @($turnExample.before.opponentBestCards) 65 646
# Sort the straight explicitly so the five consecutive ranks are visible.
Draw-TurnCards @('Th','Jc','Qs','Kc','As') 645 646 'As'
Write-TurnText 'K 高牌' 65 756 25
Write-TurnText '10 → J → Q → K → A，顺子' 645 756 25
Write-TurnText '现在：自己领先' 65 835 25 '#377a69'
Write-TurnText '现在：对照牌领先' 645 835 25 '#ad4c56'
Write-TurnText '比较的是双方最好的五张；不能只看自己的一对变成了两对。' 56 946 25
Write-TurnText '下一步仍要回到真实范围、价格和合法选择；一组亮牌不能代替整个范围。' 56 1000 19 '#737780'
$turnOutput=Join-Path $turnRoot 'research/nevir-system/figures/turn-improvement-comparison.png'
$turnBitmap.Save($turnOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($turnFont in $turnFonts.Values){$turnFont.Dispose()}
$turnGraphics.Dispose();$turnBitmap.Dispose();Write-Output $turnOutput
