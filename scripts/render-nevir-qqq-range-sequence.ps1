$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$qqqRoot=Split-Path -Parent $PSScriptRoot
$qqqPacket=Get-Content -LiteralPath (Join-Path $qqqRoot 'research/nevir-system/qqq-range-lesson-packet.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$qqqOut=Join-Path $qqqRoot 'research/nevir-system/figures'
function Qqq-Text([string]$Text,[float]$X,[float]$Y,[int]$Size=22,[string]$Color='#252932'){
 $qqqFont=[System.Drawing.Font]::new('Microsoft YaHei UI',$Size,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel)
 $qqqBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $qqqGraphics.DrawString($Text,$qqqFont,$qqqBrush,$X,$Y);$qqqFont.Dispose();$qqqBrush.Dispose()
}
function Qqq-Round([float]$X,[float]$Y,[float]$W,[float]$H,[float]$R,[string]$Color,[string]$Border=''){
 $qqqPath=[System.Drawing.Drawing2D.GraphicsPath]::new();$qqqD=$R*2
 $qqqPath.AddArc($X,$Y,$qqqD,$qqqD,180,90);$qqqPath.AddArc($X+$W-$qqqD,$Y,$qqqD,$qqqD,270,90)
 $qqqPath.AddArc($X+$W-$qqqD,$Y+$H-$qqqD,$qqqD,$qqqD,0,90);$qqqPath.AddArc($X,$Y+$H-$qqqD,$qqqD,$qqqD,90,90);$qqqPath.CloseFigure()
 $qqqBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color));$qqqGraphics.FillPath($qqqBrush,$qqqPath);$qqqBrush.Dispose()
 if($Border){$qqqPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($Border),1.5);$qqqGraphics.DrawPath($qqqPen,$qqqPath);$qqqPen.Dispose()};$qqqPath.Dispose()
}
function Qqq-Card([string]$Id,[float]$X,[float]$Y,[bool]$Cross=$false){
 Qqq-Round $X $Y 57 78 9 '#ffffff' '#d9dde5'
 $qqqSuit=@{s='♠';h='♥';d='♦';c='♣'}[$Id.Substring(1,1)]
 $qqqColor=if($Id.EndsWith('h') -or $Id.EndsWith('d')){'#bf5b65'}else{'#343a46'}
 Qqq-Text $Id.Substring(0,1) ($X+8) ($Y+5) 26 $qqqColor;Qqq-Text $qqqSuit ($X+24) ($Y+38) 27 $qqqColor
 if($Cross){$qqqPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#9b6f79'),2);$qqqGraphics.DrawLine($qqqPen,($X+7),($Y+70),($X+50),($Y+8));$qqqPen.Dispose()}
}
function Qqq-Example($Example,[float]$Y,[string]$Label,[string]$Detail,[bool]$Cross=$false){
 Qqq-Round 831 $Y 642 126 18 '#ffffff'
 $qqqCrossFirst=$Cross -and ($qqqFrame.hero -contains $Example.hole[0]);$qqqCrossSecond=$Cross -and ($qqqFrame.hero -contains $Example.hole[1])
 Qqq-Card $Example.hole[0] 851 ($Y+22) $qqqCrossFirst;Qqq-Card $Example.hole[1] 918 ($Y+22) $qqqCrossSecond
 Qqq-Text $Label 1004 ($Y+22) 22;Qqq-Text $Detail 1004 ($Y+66) 19 '#737b89'
}
$qqqTitles=@('先看这份候选清单','已知底牌，先排除冲突','自己的动作，没有新的对手回应','看见回应，再按给定规则筛选')
$qqqLines=@(
 @('先把BB输入表中的牌摆出来。','这里还未去掉我们手里的牌，','只是计算的起点，还没有算完。','下一张把冲突的具体牌划掉。'),
 @('我们拿着A♠和K♦。','对方不能再拿同一张实体牌。','47种候选被排除，权重少了40。','这不是对手弃牌，也不是新发牌。'),
 @('SB下注1.98BB，BB还没有回应。','从已知自己底牌的SB视角，','BB的候选与上一张完全相同。','对方怎样看我们，是另一个视角。'),
 @('BB按这份给定模型选择跟注。','每手原权重 × 这手跟注频率，','才得到跟注分支里的剩余权重。','不能简单理解成“只剩下强牌”。')
)
for($qqqIndex=0;$qqqIndex -lt 4;$qqqIndex++){
 $qqqFrame=$qqqPacket.frames[$qqqIndex]
 $qqqBitmap=[System.Drawing.Bitmap]::new(1540,1180);$qqqGraphics=[System.Drawing.Graphics]::FromImage($qqqBitmap)
 $qqqGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;$qqqGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $qqqGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f6f8'))
 Qqq-Text ('范围怎样留下来   '+($qqqIndex+1)+' / 4') 55 27 35
 Qqq-Text '六人桌，其他四家弃牌 · SB开到3BB，BB跟注 · 每家起始100BB' 58 82 20 '#737b89'
 Qqq-Text '公共牌' 58 119 18 '#737b89';Qqq-Text '自己 SB' 345 119 18 '#737b89'
 for($qqqCardIndex=0;$qqqCardIndex -lt 3;$qqqCardIndex++){Qqq-Card $qqqFrame.board[$qqqCardIndex] (58+67*$qqqCardIndex) 148}
 for($qqqCardIndex=0;$qqqCardIndex -lt 2;$qqqCardIndex++){Qqq-Card $qqqFrame.hero[$qqqCardIndex] (345+67*$qqqCardIndex) 148}
 Qqq-Text ('底池 '+$qqqFrame.state.potBB.ToString('0.##')+' BB') 556 148 25
 Qqq-Text ('SB剩 '+$qqqFrame.state.SBStackBB.ToString('0.##')+'  ·  BB剩 '+$qqqFrame.state.BBStackBB.ToString('0.##')) 556 188 20 '#737b89'
 Qqq-Text $qqqFrame.label 58 253 24
 Qqq-Text '只看BB候选 · 格子位置不移动' 843 253 22 '#737b89'
 for($qqqCellIndex=0;$qqqCellIndex -lt 169;$qqqCellIndex++){
  $qqqCell=$qqqFrame.matrix[$qqqCellIndex];$qqqX=58+($qqqCellIndex%13)*55;$qqqY=303+[math]::Floor($qqqCellIndex/13)*55
  $qqqChanged=$false
  if($qqqIndex -gt 0){$qqqChanged=[math]::Abs($qqqCell.mass-$qqqPacket.frames[$qqqIndex-1].matrix[$qqqCellIndex].mass) -gt 0.00001}
  $qqqFill=if($qqqCell.mass -gt 0){'#e5edf9'}else{'#eceff3'}
  $qqqBorder=if($qqqChanged){'#6c91ca'}else{''}
  Qqq-Round $qqqX $qqqY 52 52 7 $qqqFill $qqqBorder
  $qqqInk=if($qqqCell.mass -gt 0){'#344f78'}else{'#969faa'}
  Qqq-Text $qqqCell.cell ($qqqX+4) ($qqqY+3) 15 $qqqInk
  if($qqqCell.mass -gt 0){
   $qqqMassLabel=if($qqqCell.mass -lt 0.1){'<0.1'}else{$qqqCell.mass.ToString('0.#')}
   Qqq-Text $qqqMassLabel ($qqqX+4) ($qqqY+22) 12 '#607796'
   Qqq-Round ($qqqX+4) ($qqqY+43) ([math]::Max(1,44*$qqqCell.barFraction)) 4 1 '#7c9cc9'
  }
  if($qqqCell.legalPhysicalCombos -eq 0){$qqqPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#a2aab5'),1);$qqqGraphics.DrawLine($qqqPen,($qqqX+8),($qqqY+44),($qqqX+44),($qqqY+8));$qqqPen.Dispose()}
 }
 Qqq-Round 831 303 642 182 19 '#ffffff'
 Qqq-Text 'BB剩余权重' 852 321 20 '#737b89';Qqq-Text ($qqqFrame.totalWeight.ToString('0.##')) 851 355 42
 Qqq-Text ($qqqFrame.positivePhysicalCombos.ToString()+'种有正权重的具体牌') 1063 370 20 '#737b89'
 Qqq-Round 854 427 586 12 5 '#edf0f5';Qqq-Round 854 427 ([single](586*$qqqFrame.totalWeight/361)) 12 5 '#8da8d0'
 Qqq-Text '四张图统一以最初361份权重为尺度' 854 452 17 '#737b89'
 Qqq-Text $qqqTitles[$qqqIndex] 841 514 25
 for($qqqLine=0;$qqqLine -lt 4;$qqqLine++){Qqq-Text $qqqLines[$qqqIndex][$qqqLine] 843 (560+37*$qqqLine) 23}
 $qqqExamples=$qqqFrame.examples
 if($qqqIndex -eq 0){
  Qqq-Example $qqqExamples.removedByAs 739 '输入表包含这一手' '下一步再排除自己的牌'
  Qqq-Example $qqqExamples.removedByKd 880 '输入表还包含这一手' '不是说此时对手真能拿到它'
 }elseif($qqqIndex -eq 1){
  Qqq-Example $qqqExamples.removedByAs 739 '因为自己拿着A♠' '移除：不是预测对方会弃牌' $true
  Qqq-Example $qqqExamples.removedByKd 880 '因为自己拿着K♦' '移除：同一张牌不能出现两次' $true
 }elseif($qqqIndex -eq 2){
  Qqq-Example $qqqExamples.legalSurvivor 739 '仍然保留' '我们下注，本身不替我们筛掉对手'
  Qqq-Round 831 880 642 126 18 '#ffffff';Qqq-Text '上一张与这一张，BB矩阵完全一样。' 852 916 23
 }else{
  Qqq-Example $qqqExamples.leavesGivenCallBranch 739 '给定规则：跟注频率为0' '只从跟注分支移除；实体牌仍合法'
  Qqq-Example $qqqExamples.staysInGivenCallBranch 880 '本模型：跟注频率大于0' '保留原权重 × 给定跟注频率'
 }
 Qqq-Text '细蓝边：相对上一图改变的格子；斜线：与已知牌冲突，整格已无合法组合。' 58 1040 17 '#737b89'
 Qqq-Text '格内数字为剩余权重；条长固定按口袋对6、同花4、不同花12种组合为上限。灰格也可能只是本模型未给权重。' 58 1072 17 '#737b89'
 Qqq-Text '研究示范，已展示解释｜候选策略精度未达标；只教物理移除和给定规则筛选，不判最佳动作。' 58 1124 18 '#737b89'
 $qqqBitmap.Save((Join-Path $qqqOut ('qqq-range-sequence-'+($qqqIndex+1)+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
 $qqqGraphics.Dispose();$qqqBitmap.Dispose()
}
