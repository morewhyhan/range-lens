$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$guideRoot = Split-Path -Parent $PSScriptRoot
$guideData = Get-Content -LiteralPath (Join-Path $guideRoot 'research/nevir-system/first-hand-lesson-prompts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$guideBitmap = [System.Drawing.Bitmap]::new(1200,1360)
$guideGraphics = [System.Drawing.Graphics]::FromImage($guideBitmap)
$guideGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$guideGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$guideGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$guideFonts=@{}
foreach($guideSize in @(19,22,25,29,34)){ $guideFonts[$guideSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$guideSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-GuideText([string]$Content,[float]$X,[float]$Y,[int]$Size=25,[string]$Color='#292b31'){
 $guideBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $guideGraphics.DrawString($Content,$guideFonts[$Size],$guideBrush,$X,$Y);$guideBrush.Dispose()
}
function Draw-GuideBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#ffffff'){
 $guidePath=[System.Drawing.Drawing2D.GraphicsPath]::new();$guideRadius=22
 $guidePath.AddArc($X,$Y,$guideRadius,$guideRadius,180,90);$guidePath.AddArc(($X+$W-$guideRadius),$Y,$guideRadius,$guideRadius,270,90)
 $guidePath.AddArc(($X+$W-$guideRadius),($Y+$H-$guideRadius),$guideRadius,$guideRadius,0,90);$guidePath.AddArc($X,($Y+$H-$guideRadius),$guideRadius,$guideRadius,90,90);$guidePath.CloseFigure()
 $guideBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$guideGraphics.FillPath($guideBrush,$guidePath)
 $guideBrush.Dispose();$guidePath.Dispose()
}
function Draw-GuideCards([object[]]$Cards,[float]$X,[float]$Y,[string]$Highlight=''){
 $guideLabels=@{s='♠';h='♥';d='♦';c='♣'}
 for($guideIndex=0;$guideIndex -lt $Cards.Count;$guideIndex++){
  $guideId=[string]$Cards[$guideIndex];$guideX=$X+$guideIndex*91
  $guideFill=if($guideId -eq $Highlight){'#e8e2f4'}else{'#eef0f4'}
  Draw-GuideBox $guideX $Y 77 91 $guideFill
  $guideSuit=$guideId.Substring(1,1);$guideColor=if($guideSuit -in @('h','d')){'#ad4c56'}else{'#30343b'}
  Write-GuideText ($guideId.Substring(0,1)+$guideLabels[$guideSuit]) ($guideX+11) ($Y+28) 25 $guideColor
 }
}
Write-GuideText '一手牌里，同样四步走三次' 54 36 34
Write-GuideText '结构导览结束后的回顾图 · 不作为每街最佳策略答案' 56 93 19 '#737780'
Write-GuideText '自己的牌一直保留' 56 145 22
Draw-GuideCards @('Ac','Qd') 790 108
$guideStages=@(@{id='S03';label='翻牌';new='';note='先看清谁行动，再比较过牌与下注'},@{id='S08';label='转牌';new='7s';note='带着刚才的跟注，重新看清变化'},@{id='S12';label='河牌';new='4d';note='没有下一张公共牌，仍然可能要行动'})
for($guideIndex=0;$guideIndex -lt 3;$guideIndex++){
 $guideStage=$guideStages[$guideIndex];$guideFrame=$guideData.frames | Where-Object {$_.id -eq $guideStage.id};$guideY=235+$guideIndex*323
 Draw-GuideBox 35 $guideY 1130 278
 Write-GuideText $guideStage.label 63 ($guideY+20) 29
 Draw-GuideCards @($guideFrame.state.board) 63 ($guideY+76) $guideStage.new
 Write-GuideText ('底池 '+$guideFrame.state.potBB.ToString()+' BB') 690 ($guideY+83) 25
 Write-GuideText ('双方后手 '+$guideFrame.state.stacksBB.SB.ToString()+' BB') 690 ($guideY+132) 22 '#737780'
 Write-GuideText '看清 → 比较 → 执行 → 更新' 63 ($guideY+194) 25 '#675583'
 Write-GuideText $guideStage.note 63 ($guideY+236) 19 '#737780'
 if($guideIndex -lt 2){ Write-GuideText '↓ 对手回应、本街结束，再发下一张' 63 ($guideY+287) 19 '#737780' }
}
Write-GuideText '自己的行动结束后，要等对手；下一街也不会清空过去。' 56 1233 25
Write-GuideText '主线与回看分开；关闭岔路后，回到原来的牌、钱与历史。' 56 1291 19 '#737780'
$guideOutput=Join-Path $guideRoot 'research/nevir-system/figures/first-hand-route-summary.png'
$guideBitmap.Save($guideOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($guideFont in $guideFonts.Values){$guideFont.Dispose()}
$guideGraphics.Dispose();$guideBitmap.Dispose();Write-Output $guideOutput
