$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$recipeRoot = Split-Path -Parent $PSScriptRoot
$recipeData = Get-Content -LiteralPath (Join-Path $recipeRoot 'research/nevir-system/course-prescription-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($recipeData.cases.Count -ne 960){throw 'Unexpected source-rule case count'}
$recipeBitmap = [System.Drawing.Bitmap]::new(1200,1140)
$recipeGraphics = [System.Drawing.Graphics]::FromImage($recipeBitmap)
$recipeGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$recipeGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$recipeGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$recipeFonts=@{}
foreach($recipeSize in @(19,22,25,29,34)){ $recipeFonts[$recipeSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$recipeSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-RecipeText([string]$Content,[float]$X,[float]$Y,[int]$Size=25,[string]$Color='#292b31'){
 $recipeBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $recipeGraphics.DrawString($Content,$recipeFonts[$Size],$recipeBrush,$X,$Y);$recipeBrush.Dispose()
}
function Draw-RecipeBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#ffffff'){
 $recipePath=[System.Drawing.Drawing2D.GraphicsPath]::new();$recipeRadius=22
 $recipePath.AddArc($X,$Y,$recipeRadius,$recipeRadius,180,90);$recipePath.AddArc(($X+$W-$recipeRadius),$Y,$recipeRadius,$recipeRadius,270,90)
 $recipePath.AddArc(($X+$W-$recipeRadius),($Y+$H-$recipeRadius),$recipeRadius,$recipeRadius,0,90);$recipePath.AddArc($X,($Y+$H-$recipeRadius),$recipeRadius,$recipeRadius,90,90);$recipePath.CloseFigure()
 $recipeBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$recipeGraphics.FillPath($recipeBrush,$recipePath)
 $recipeBrush.Dispose();$recipePath.Dispose()
}
function Draw-RecipeCards([object[]]$Cards,[float]$X,[float]$Y){
 $recipeLabels=@{s='♠';h='♥';d='♦';c='♣'}
 for($recipeIndex=0;$recipeIndex -lt $Cards.Count;$recipeIndex++){
  $recipeId=[string]$Cards[$recipeIndex];$recipeX=$X+$recipeIndex*91
  Draw-RecipeBox $recipeX $Y 77 91 '#eef0f4'
  $recipeSuit=$recipeId.Substring(1,1);$recipeColor=if($recipeSuit -in @('h','d')){'#ad4c56'}else{'#30343b'}
  Write-RecipeText ($recipeId.Substring(0,1)+$recipeLabels[$recipeSuit]) ($recipeX+11) ($Y+28) 25 $recipeColor
 }
}
Write-RecipeText '同一桌面，先确认采用哪一版' 54 36 34
Write-RecipeText '规则对照回顾 · 实际跟练先固定一个版本 · 不是新求解结果' 56 94 19 '#737780'
Draw-RecipeCards @('As','7h','2d') 56 151
Write-RecipeText 'BTN 对 BB，BB 已过牌' 470 177 25
Draw-RecipeBox 35 291 550 369
Draw-RecipeBox 615 291 550 369
Write-RecipeText '原文基础简化' 63 314 29
Write-RecipeText '原文后段调整简化' 643 314 29
Write-RecipeText '不附加后段对手偏差调整' 63 362 19 '#737780'
Write-RecipeText '题设采用弃牌偏多、过牌加注偏少的假设' 643 362 19 '#737780'
$recipeRows=@(@{label='KQs';hole=@('Kc','Qc')},@{label='KQo';hole=@('Ks','Qh')},@{label='Q3s';hole=@('Qc','3c')})
for($recipeIndex=0;$recipeIndex -lt 3;$recipeIndex++){
 $recipeRow=$recipeRows[$recipeIndex];$recipeY=423+$recipeIndex*73
 foreach($recipePanel in @(0,1)){
  $recipeProfile=if($recipePanel -eq 0){'baseline'}else{'adjusted'}
  $recipeSample=$recipeData.cases | Where-Object {$_.profile -eq $recipeProfile -and $_.handClass -eq $recipeRow.label} | Select-Object -First 1
  $recipeAction=if($recipeSample.answer.action -eq 'check'){'过牌'}else{'小注'}
  $recipeX=63+$recipePanel*580
  Write-RecipeText $recipeRow.label $recipeX $recipeY 29
  Draw-RecipeBox ($recipeX+271) ($recipeY-4) 191 48 '#f1eef7'
  Write-RecipeText $recipeAction ($recipeX+307) ($recipeY+3) 25 '#675583'
 }
}
Write-RecipeText '两手都能后门成顺，动作不只看这个标签' 56 706 29
Draw-RecipeCards @('Kc','Qc') 63 772
Draw-RecipeCards @('Qc','3c') 643 772
Write-RecipeText '后门成顺：16 种跑牌' 63 888 22 '#737780'
Write-RecipeText '后门成顺：16 种跑牌' 643 888 22 '#737780'
Write-RecipeText '面对 Q♦ T♣，当前领先' 63 935 25 '#377a69'
Write-RecipeText '面对 Q♦ T♣，当前落后' 643 935 25 '#ad4c56'
Write-RecipeText '它们是同一人的两种替换手牌；当前大小不等于最终权益。' 56 1023 22
Write-RecipeText '只展示已编译的手牌类；其他格子未给答案，也不代表过牌。' 56 1082 19 '#737780'
$recipeOutput=Join-Path $recipeRoot 'research/nevir-system/figures/course-prescription-versions.png'
$recipeBitmap.Save($recipeOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($recipeFont in $recipeFonts.Values){$recipeFont.Dispose()}
$recipeGraphics.Dispose();$recipeBitmap.Dispose();Write-Output $recipeOutput
