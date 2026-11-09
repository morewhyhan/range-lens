$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$lessonRoot=Split-Path -Parent $PSScriptRoot
$lessonData=Get-Content -LiteralPath (Join-Path $lessonRoot 'research/nevir-system/visual-river-lesson-packet.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$lessonFonts=@{}
foreach($lessonSize in @(16,18,20,23,26,30,34,38)){ $lessonFonts[$lessonSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$lessonSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-LessonText([string]$Text,[float]$X,[float]$Y,[int]$Size=23,[string]$Color='#272a30'){
 $lessonBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $lessonGraphics.DrawString($Text,$lessonFonts[$Size],$lessonBrush,$X,$Y);$lessonBrush.Dispose()
}
function Draw-LessonBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#f3f4f6',[float]$Radius=20){
 $lessonPath=[System.Drawing.Drawing2D.GraphicsPath]::new();$lessonD=2*$Radius
 $lessonPath.AddArc($X,$Y,$lessonD,$lessonD,180,90);$lessonPath.AddArc($X+$W-$lessonD,$Y,$lessonD,$lessonD,270,90)
 $lessonPath.AddArc($X+$W-$lessonD,$Y+$H-$lessonD,$lessonD,$lessonD,0,90);$lessonPath.AddArc($X,$Y+$H-$lessonD,$lessonD,$lessonD,90,90);$lessonPath.CloseFigure()
 $lessonBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$lessonGraphics.FillPath($lessonBrush,$lessonPath);$lessonBrush.Dispose();$lessonPath.Dispose()
}
function Draw-LessonCard([string]$Card,[float]$X,[float]$Y,[float]$W=77,[float]$H=103){
 Draw-LessonBox $X $Y $W $H '#ffffff' 14
 if($Card -eq '--'){Write-LessonText '待发' ($X+13) ($Y+36) 20 '#9298a2';return}
 $lessonRank=$Card.Substring(0,1);if($lessonRank -eq 'T'){$lessonRank='10'}
 $lessonSuit=switch($Card.Substring(1,1)){'s'{'♠'}'h'{'♥'}'d'{'♦'}'c'{'♣'}}
 $lessonColor=if($Card.EndsWith('h') -or $Card.EndsWith('d')){'#b45b66'}else{'#303b49'}
 Write-LessonText $lessonRank ($X+12) ($Y+8) 30 $lessonColor
 Write-LessonText $lessonSuit ($X+12) ($Y+48) 30 $lessonColor
}
for($lessonPage=1;$lessonPage -le 6;$lessonPage++){
 $lessonFrame=$lessonData.frames[$lessonPage-1]
 $lessonBitmap=[System.Drawing.Bitmap]::new(1100,1000);$lessonGraphics=[System.Drawing.Graphics]::FromImage($lessonBitmap)
 $lessonGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;$lessonGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
 $lessonGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'));Draw-LessonBox 32 25 1036 950 '#ffffff' 30
 $lessonTag=if($lessonPage -eq 5){'可选预演 / 从第2张展开，关闭回原位'}elseif($lessonPage -eq 6){'按需拆一步 / 从第3张展开，关闭回原位'}else{('0'+$lessonPage+' / 同一手牌，顺着往下看')}
 Write-LessonText $lessonTag 72 60 20 '#777e89';Write-LessonText $lessonFrame.title 72 104 38
 Write-LessonText $lessonFrame.subtitle 72 170 23
 Draw-LessonBox 72 228 956 310 '#f1f4f5' 30
 Write-LessonText '对手 BTN · 底牌未亮' 110 250 20 '#68717c'
 Write-LessonText ('剩 '+$lessonFrame.state.villainStack+' BB') 795 250 23
 $lessonBoard=@($lessonFrame.board);if($lessonBoard.Count -eq 4){$lessonBoard+='--'}
 for($lessonIndex=0;$lessonIndex -lt 5;$lessonIndex++){Draw-LessonCard $lessonBoard[$lessonIndex] (332+$lessonIndex*91) 303}
 Write-LessonText ('底池 '+$lessonFrame.state.pot+' BB') 110 350 26
 Write-LessonText '自己 SB' 110 449 23
 Draw-LessonCard 'As' 332 433 65 88;Draw-LessonCard 'Qs' 409 433 65 88
 Write-LessonText ('剩 '+$lessonFrame.state.heroStack+' BB') 795 466 23
 if($lessonPage -in @(3,5)){
  Write-LessonText '下面是可能牌，不是已亮出的实际底牌。' 72 564 20 '#777e89'
  $lessonCandidates=if($lessonPage -eq 3){@(@('KK','Kh','Kd','4份','三条K，自己输'),@('KJ','Kc','Jc','16份','一对K，自己输'),@('JT','Js','Ts','4份','J高，自己赢'))}else{@(@('KK','Kh','Kd','4份','葫芦，自己输'),@('JT','Js','Ts','4份','较小同花，自己赢'))}
  $lessonRow=0
  foreach($lessonCandidate in $lessonCandidates){
   $lessonY=603+$lessonRow*80;Draw-LessonBox 72 $lessonY 956 68 '#f5f5f7' 15
   $lessonSymbols=($lessonCandidate[1]+' '+$lessonCandidate[2]).Replace('h','♥').Replace('d','♦').Replace('s','♠').Replace('c','♣')
   Write-LessonText $lessonSymbols 100 ($lessonY+17) 23
   Write-LessonText $lessonCandidate[3] 370 ($lessonY+17) 23
   $lessonResultColor=if($lessonCandidate[4].Contains('自己赢')){'#35755d'}else{'#a45562'}
   Write-LessonText $lessonCandidate[4] 650 ($lessonY+17) 23 $lessonResultColor
   $lessonRow++
  }
  if($lessonPage -eq 5){Write-LessonText 'KJ在这张河牌会过牌，所以不在本次下注候选中。' 100 783 20 '#777e89'}
 }elseif($lessonPage -eq 6){
  Write-LessonText '这是等质量示意，不是承诺接下来6次会这样发生。' 72 568 20 '#777e89'
  for($lessonCell=0;$lessonCell -lt 6;$lessonCell++){
   $lessonX=72+$lessonCell*161;$lessonFill=if($lessonCell -eq 0){'#eaf4ee'}else{'#f8ecef'}
   $lessonText=if($lessonCell -eq 0){'赢 +63'}else{'输 -21'}
   $lessonColor=if($lessonCell -eq 0){'#35755d'}else{'#a45562'}
   Draw-LessonBox $lessonX 620 145 102 $lessonFill 18
   Write-LessonText $lessonText ($lessonX+17) 652 23 $lessonColor
  }
  Write-LessonText '6份合计：63 - 105 = -42；每份平均 -7。' 100 761 26
 }else{
  $lessonMain=switch($lessonPage){1{'下一步：发河牌，再回到“看清现在”。'}2{'此刻还没遇到下注，先完成本段给定的过牌。'}4{'退21 → 收池42 → 本手结束。'}}
  Draw-LessonBox 72 601 956 124 '#f3f5f7' 22;Write-LessonText $lessonMain 101 643 26
  $lessonSecondary=switch($lessonPage){1{'跟注不是买一张“自动摊牌券”。'}2{'若他下注，还要按当时的范围和价格重新比较。'}4{'这里说的是眼前这次弃牌，不是抹掉转牌历史。'}}
  Write-LessonText $lessonSecondary 100 769 23 '#68717c'
 }
 Write-LessonText $lessonFrame.footer 72 871 20
 Write-LessonText '答后解释图 · 候选与回应为作者给定模型 · 不是真实对手统计' 72 925 16 '#8b919b'
 $lessonFile=Join-Path $lessonRoot ('research/nevir-system/'+$lessonFrame.image)
 $lessonBitmap.Save($lessonFile,[System.Drawing.Imaging.ImageFormat]::Png);$lessonGraphics.Dispose();$lessonBitmap.Dispose();Write-Output $lessonFile
}
foreach($lessonFont in $lessonFonts.Values){$lessonFont.Dispose()}
