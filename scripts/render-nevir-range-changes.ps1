$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$chartRoot=Split-Path -Parent $PSScriptRoot
$chartData=Get-Content -LiteralPath (Join-Path $chartRoot 'research/nevir-system/range-chart-contract-packet.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$chartOut=Join-Path $chartRoot 'research/nevir-system/figures'
[void][System.IO.Directory]::CreateDirectory($chartOut)
function Range-Text([string]$Text,[float]$X,[float]$Y,[int]$Size=22,[string]$Color='#29313c'){
 $chartFont=[System.Drawing.Font]::new('Microsoft YaHei UI',$Size,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
 $chartBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $chartGraphics.DrawString($Text,$chartFont,$chartBrush,$X,$Y);$chartBrush.Dispose();$chartFont.Dispose()
}
function Range-Box([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Color){
 $chartBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color));$chartGraphics.FillRectangle($chartBrush,$X,$Y,$W,$H);$chartBrush.Dispose()
}
$chartLabels=@('K♣ K♦','7♣ 7♦','A♣ K♥','Q♣ Q♦','Q♥ T♣')
$chartCells=@('KK','77','AKo','QQ','QTo')
$chartDescriptions=@(
 @('先看清：这是BTN的范围','五个具体组合，来自本例给定模型。','不是在展示BTN的真实底牌。'),
 @('QQ不走这条下注分支','其余四种牌保留，质量从10变为9。','不能因为下注就把所有弱牌删掉。'),
 @('我们行动了，对手还没回应','已知自己拿9♣9♦，仅仅加到45，','不会凭空知道对手又少了哪些牌。'),
 @('看到全下，才得到新信息','本例只有KK和77会这样再全下。','KK数量没增加，占比却升至33.3%。')
)
for($chartIndex=0;$chartIndex -lt 4;$chartIndex++){
 $chartFrame=$chartData.frames[$chartIndex]
 $chartBitmap=[System.Drawing.Bitmap]::new(1200,1050);$chartGraphics=[System.Drawing.Graphics]::FromImage($chartBitmap)
 $chartGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $chartGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $chartGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f8f9fb'))
 Range-Text ('范围怎样变化   '+($chartIndex+1)+' / 4') 45 30 32
 Range-Text ('BTN的范围 · '+$chartFrame.label) 45 83 27
 Range-Text '从SB视角看；自己 9♣9♦     公共牌 K♠9♥2♦3♣7♥' 45 128 23
 Range-Text ('池 '+$chartFrame.state.pot+' BB    SB剩 '+$chartFrame.state.heroStack+'    BTN剩 '+$chartFrame.state.villainStack+'    轮到 '+$chartFrame.actor) 45 170 19 '#727b87'
 Range-Text '示范图｜已展示答案｜仅为五组合指定模型' 45 201 15 '#727b87'
 Range-Text '同一坐标：上方同花，下方不同花' 45 221 19 '#727b87'
 for($chartCellIndex=0;$chartCellIndex -lt 169;$chartCellIndex++){
  $chartCell=$chartFrame.matrix[$chartCellIndex];$chartX=45+($chartCellIndex%13)*45;$chartY=260+[math]::Floor($chartCellIndex/13)*45
  $chartSupported=$chartCell.mass -gt 0
  $chartWasPresent=$chartData.frames[0].matrix[$chartCellIndex].mass -gt 0
  $chartFill=if($chartSupported){'#e2e9f0'}elseif($chartWasPresent){'#eef0f3'}else{'#f2f4f6'}
  Range-Box $chartX $chartY 43 43 $chartFill
  $chartColor=if($chartSupported){'#263b52'}elseif($chartWasPresent){'#8d96a2'}else{'#a6aeb9'}
  Range-Text $chartCell.cell ($chartX+4) ($chartY+3) 14 $chartColor
  if($chartSupported){Range-Box ($chartX+3) ($chartY+28) ([single](37*$chartCell.baselineShare)) 9 '#607e9c'}
  if($chartWasPresent -and -not $chartSupported){Range-Text '×' ($chartX+15) ($chartY+19) 18 '#8d96a2'}
  if($chartCell.legalPhysicalCombos -eq 0){
   $chartPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#a6aeb9'),1)
   $chartGraphics.DrawLine($chartPen,($chartX+3),($chartY+39),($chartX+39),($chartY+3));$chartPen.Dispose()
  }
 }
 Range-Text '深色条 = 占最初10份质量的比例；四图尺度相同' 45 863 17 '#727b87'
 Range-Text '淡灰格 = 本模型未给正权重，不代表现实中不可能' 45 894 17 '#727b87'
 Range-Text '斜线 = 与已知牌冲突，本格已无合法组合' 45 923 17 '#727b87'
 Range-Text '本例实际保留的具体花色' 680 221 23
 Range-Text '具体组合' 680 266 18 '#727b87';Range-Text '剩余质量' 870 266 18 '#727b87';Range-Text '当前占比' 1010 266 18 '#727b87'
 for($chartRow=0;$chartRow -lt 5;$chartRow++){
  $chartValue=$chartFrame.matrix | Where-Object { $_.cell -eq $chartCells[$chartRow] }
  $chartY=310+$chartRow*63
  Range-Box 675 ($chartY-3) 465 49 '#ffffff'
  Range-Text $chartLabels[$chartRow] 687 $chartY 23
  Range-Text ([string]$chartValue.mass) 906 $chartY 23
  Range-Text (($chartValue.conditionalProbability*100).ToString('0.0')+'%') 1020 $chartY 23
 }
 Range-Text ('合计剩余 '+$chartFrame.totalRelativeMass+' / 最初10份') 680 646 25
 Range-Text $chartDescriptions[$chartIndex][0] 680 710 25
 Range-Text $chartDescriptions[$chartIndex][1] 680 754 20
 Range-Text $chartDescriptions[$chartIndex][2] 680 790 20
 Range-Text '质量是相对权重，不能当成实体牌的副本数。' 45 960 20 '#727b87'
 Range-Text '此为研究图稿；完整课程范围与真实学习效果仍待验证。' 45 995 18 '#727b87'
 $chartBitmap.Save((Join-Path $chartOut ('range-change-'+($chartIndex+1)+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $chartGraphics.Dispose();$chartBitmap.Dispose()
}
Write-Output 'Rendered four range-change research figures (1200x1050).'
