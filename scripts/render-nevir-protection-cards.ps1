$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$protectRoot = Split-Path -Parent $PSScriptRoot
$protectModel = (Get-Content -LiteralPath (Join-Path $protectRoot 'research/nevir-system/active-plan-models.json') -Raw -Encoding UTF8 | ConvertFrom-Json).protection
$protectDir = Join-Path $protectRoot 'research/nevir-system/figures'
New-Item -ItemType Directory -Path $protectDir -Force | Out-Null
$protectFonts=@{}
foreach($protectFontSize in @(18,21,24,28,32,36)){ $protectFonts[$protectFontSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$protectFontSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-ProtectText([string]$Content,[float]$X,[float]$Y,[int]$Size=24,[string]$Color='#282a30'){
 $protectBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $protectGraphics.DrawString($Content,$protectFonts[$Size],$protectBrush,$X,$Y);$protectBrush.Dispose()
}
function Draw-ProtectBox([float]$X,[float]$Y,[float]$Width,[float]$Height,[string]$Fill='#f5f5f7',[float]$Radius=20){
 $protectPath=[System.Drawing.Drawing2D.GraphicsPath]::new();$protectDiameter=2*$Radius
 $protectPath.AddArc($X,$Y,$protectDiameter,$protectDiameter,180,90);$protectPath.AddArc($X+$Width-$protectDiameter,$Y,$protectDiameter,$protectDiameter,270,90)
 $protectPath.AddArc($X+$Width-$protectDiameter,$Y+$Height-$protectDiameter,$protectDiameter,$protectDiameter,0,90);$protectPath.AddArc($X,$Y+$Height-$protectDiameter,$protectDiameter,$protectDiameter,90,90);$protectPath.CloseFigure()
 $protectBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$protectGraphics.FillPath($protectBrush,$protectPath);$protectBrush.Dispose();$protectPath.Dispose()
}
for($protectPage=1;$protectPage -le 3;$protectPage++){
 $protectBitmap=[System.Drawing.Bitmap]::new(1100,950);$protectGraphics=[System.Drawing.Graphics]::FromImage($protectBitmap)
 $protectGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;$protectGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $protectGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'));Draw-ProtectBox 35 30 1030 890 '#ffffff' 28
 Write-ProtectText ('0'+$protectPage+'  /  按顺序打开，一次只看这张') 78 70 21 '#7b7f88'
 $protectTitle=switch($protectPage){1{'先只看 AJ：保护确实有好处'}2{'再加上 KK：好处还要抵过成本'}3{'最后合起来：比较完整计划'}}
 Write-ProtectText $protectTitle 78 119 36
 Write-ProtectText '自己 Q♠ Q♣    转牌 K♠ 7♠ 2♦ 3♦    池 21 BB · 双方 90 BB' 78 185 24
 Write-ProtectText '作者给定候选与回应；示例牌不代表已看见对手真实底牌。' 78 231 18 '#7b7f88'
 if($protectPage -eq 1){
  Draw-ProtectBox 78 292 944 90 '#f5f5f7';Write-ProtectText '可能牌 A♠ J♣：现在输给 QQ，但河牌还有机会反超。' 102 320 24
  for($protectCell=0;$protectCell -lt 44;$protectCell++){
   $protectX=80+($protectCell%11)*86;$protectY=418+[math]::Floor($protectCell/11)*64
   $protectFill=if($protectCell -lt 3){'#fce9ec'}else{'#f1f3f5'}
   Draw-ProtectBox $protectX $protectY 72 51 $protectFill 14
   $protectLabel=if($protectCell -lt 3){'A'}else{'赢'};Write-ProtectText $protectLabel ($protectX+22) ($protectY+9) 24
  }
  Write-ProtectText '44 张合法河牌：3 张 A 让 AJ 反超，另外 41 张自己赢。' 78 708 24
  Write-ProtectText '让 AJ 现在退出，可以消除这 3 张牌的机会。' 78 762 28 '#36725b'
  Write-ProtectText '先记住这一组的好处，暂不选最终动作。' 78 825 24 '#7b7f88'
 }elseif($protectPage -eq 2){
  Write-ProtectText '给定范围：AJ 3 份，KK 1 份。份额不是不同牌数。' 78 306 24
  Draw-ProtectBox 78 380 944 140 '#eef6f1';Write-ProtectText 'AJ 面对 10.5 全弃' 104 402 28
  Write-ProtectText '消除反超机会，对整体平均收益的贡献' 104 454 21 '#63716b'
  Write-ProtectText ('+'+$protectModel.denialGainContribution.ToString('0.000')+' BB') 784 431 28 '#36725b'
  Draw-ProtectBox 78 552 944 140 '#fbeef0';Write-ProtectText 'KK 面对 10.5 再全下，自己弃牌' 104 574 28
  Write-ProtectText '碰到这组强牌，会损失已经投入的首注' 104 626 21 '#79696c'
  Write-ProtectText ('−'+$protectModel.strongRangeCostContribution.ToString('0.000')+' BB') 784 603 28 '#a24b5e'
  Write-ProtectText '保护收益是真的；但这里只覆盖了一部分结果。' 78 756 28
  Write-ProtectText '下一张再合并，不能只看绿色这行就判下注。' 78 824 24 '#7b7f88'
 }else{
  Write-ProtectText '同一个决定起点，同一套候选和明确给定后续。' 78 307 24
  Write-ProtectText '过牌计划' 78 395 28;Draw-ProtectBox 320 397 555 45 '#e4e9f3' 15
  Write-ProtectText $protectModel.checkEV.ToString('0.000') 905 399 24
  Write-ProtectText '下注 10.5' 78 492 28;Draw-ProtectBox 320 494 496 45 '#eceef2' 15
  Write-ProtectText $protectModel.weakFolds.evFromRootBB.ToString('0.000') 905 496 24
  Write-ProtectText '单位：从现在计的平均净收益，BB' 322 560 21 '#7b7f88'
  Draw-ProtectBox 78 633 944 119 '#f5f5f7'
  Write-ProtectText '保护 +1.074  加上强端成本 −2.625' 104 651 28
  Write-ProtectText '这版下注比给定过牌计划少约 1.551 BB。' 104 700 24
  Write-ProtectText '若 AJ 改为愿意跟注，比较结果会改变。' 78 796 24
  Write-ProtectText '限定计划的教学比较，不是现实对手频率或 NL50 策略表。' 78 852 18 '#7b7f88'
 }
 $protectFile=Join-Path $protectDir ('protection-step-'+$protectPage+'.png');$protectBitmap.Save($protectFile,[System.Drawing.Imaging.ImageFormat]::Png)
 $protectGraphics.Dispose();$protectBitmap.Dispose();Write-Output $protectFile
}
foreach($protectFont in $protectFonts.Values){$protectFont.Dispose()}
