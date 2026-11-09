$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$roleRoot = Split-Path -Parent $PSScriptRoot
$roleData = Get-Content -LiteralPath (Join-Path $roleRoot 'research/nevir-system/j95-hand-role-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$roleBitmap = [System.Drawing.Bitmap]::new(1200,1360)
$roleGraphics = [System.Drawing.Graphics]::FromImage($roleBitmap)
$roleGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$roleGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$roleGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$roleFonts=@{}
foreach($roleSize in @(19,22,25,29,34)){ $roleFonts[$roleSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$roleSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-RoleText([string]$Content,[float]$X,[float]$Y,[int]$Size=25,[string]$Color='#292b31'){
 $roleBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
 $roleGraphics.DrawString($Content,$roleFonts[$Size],$roleBrush,$X,$Y);$roleBrush.Dispose()
}
function Draw-RoleBox([float]$X,[float]$Y,[float]$W,[float]$H,[string]$Fill='#ffffff'){
 $rolePath=[System.Drawing.Drawing2D.GraphicsPath]::new();$roleRadius=22
 $rolePath.AddArc($X,$Y,$roleRadius,$roleRadius,180,90);$rolePath.AddArc(($X+$W-$roleRadius),$Y,$roleRadius,$roleRadius,270,90)
 $rolePath.AddArc(($X+$W-$roleRadius),($Y+$H-$roleRadius),$roleRadius,$roleRadius,0,90);$rolePath.AddArc($X,($Y+$H-$roleRadius),$roleRadius,$roleRadius,90,90);$rolePath.CloseFigure()
 $roleBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill));$roleGraphics.FillPath($roleBrush,$rolePath)
 $roleBrush.Dispose();$rolePath.Dispose()
}
function Draw-RoleCards([object[]]$Cards,[float]$X,[float]$Y,[int]$PairRank=0){
 $roleLabels=@{s='♠';h='♥';d='♦';c='♣'}
 for($roleIndex=0;$roleIndex -lt $Cards.Count;$roleIndex++){
  $roleId=[string]$Cards[$roleIndex];$roleX=$X+$roleIndex*91
  $roleRank=$roleId.Substring(0,1);$roleFill=if($PairRank -gt 0 -and $roleRank -eq ([string]$PairRank)){'#e8e2f4'}else{'#eef0f4'}
  Draw-RoleBox $roleX $Y 77 91 $roleFill
  if($roleRank -eq 'T'){$roleRank='10'}
  $roleSuit=$roleId.Substring(1,1);$roleColor=if($roleSuit -in @('h','d')){'#ad4c56'}else{'#30343b'}
  Write-RoleText ($roleRank+$roleLabels[$roleSuit]) ($roleX+11) ($Y+28) 25 $roleColor
 }
}
Write-RoleText '先认成牌，再看听牌，最后用规则' 54 36 34
Write-RoleText '同一人的替换手牌对照 · 当前成牌更强，不等于已经知道该下注' 56 94 19 '#737780'
Draw-RoleCards @('Js','9d','5d') 56 151
Write-RoleText '当前公共牌：J♠ 9♦ 5♦' 470 171 25
Write-RoleText '以下每行分别换一手底牌' 470 217 19 '#737780'
$roleRows=@(
 @{id='plain_J7';label='底牌 J♣ 7♣';cards=@('Js','Jc','9d','7c','5d');title='一对 J，另一张是 7';note='本题采用的基础简化：过牌'},
 @{id='two_pair_J5';label='底牌 J♣ 5♣';cards=@('Js','Jc','5d','5c','9d');title='J 和 5 两对';note='这是两对，不能当弱顶对处理'},
 @{id='set_99';label='底牌 9♠ 9♣';cards=@('9s','9c','9d','Js','5d');title='三条 9';note='三条 9 大于一对 J'},
 @{id='J7_flush_draw';label='底牌 J♦ 7♦';cards=@('Js','Jd','9d','7d','5d');title='一对 J ＋ 直接同花听牌';note='保留听花信息，不只按踢脚判断'}
)
for($roleIndex=0;$roleIndex -lt 4;$roleIndex++){
 $roleRow=$roleRows[$roleIndex];$roleCheck=$roleData.diagnostics | Where-Object {$_.id -eq $roleRow.id};if($null -eq $roleCheck){throw 'Missing diagnostic'}
 $roleY=292+$roleIndex*211
 Draw-RoleBox 35 $roleY 1130 191
 Write-RoleText $roleRow.label 63 ($roleY+15) 22
 Draw-RoleCards @($roleRow.cards) 63 ($roleY+62)
 Write-RoleText $roleRow.title 588 ($roleY+58) 29
 Write-RoleText $roleRow.note 588 ($roleY+112) 22 '#675583'
}
Write-RoleText '同样是一对 J7，当前成牌大小相同，听牌关系却不同。' 56 1182 25
Write-RoleText 'J♦7♦ 有 9 张名义成花牌；尚未证明都是获胜补牌。' 56 1235 22 '#737780'
Write-RoleText '先把当前的牌认清，收起这一层，再回到原来的行动决定。' 56 1290 22
$roleOutput=Join-Path $roleRoot 'research/nevir-system/figures/j95-hand-role-comparison.png'
$roleBitmap.Save($roleOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($roleFont in $roleFonts.Values){$roleFont.Dispose()}
$roleGraphics.Dispose();$roleBitmap.Dispose();Write-Output $roleOutput
