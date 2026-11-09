$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$sizeRoot = Split-Path -Parent $PSScriptRoot
$sizeData = Get-Content -LiteralPath (Join-Path $sizeRoot 'research/nevir-system/size-comparison-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$sizeExample = $sizeData.examples.equityFallsButLargeWins
$sizeDir = Join-Path $sizeRoot 'research/nevir-system/figures'
New-Item -ItemType Directory -Path $sizeDir -Force | Out-Null
$sizeOutput = Join-Path $sizeDir 'size-comparison-example.png'
$sizeBitmap = [System.Drawing.Bitmap]::new(1200,1100)
$sizeGraphics = [System.Drawing.Graphics]::FromImage($sizeBitmap)
$sizeGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$sizeGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$sizeGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$sizeFonts=@{}
foreach($sizeSize in @(19,21,24,28,32,34)){ $sizeFonts[$sizeSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$sizeSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-SizeText([string]$Content,[float]$X,[float]$Y,[int]$Size=24,[string]$Color='#292b31'){
    $sizeBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
    $sizeGraphics.DrawString($Content,$sizeFonts[$Size],$sizeBrush,$X,$Y);$sizeBrush.Dispose()
}
function Draw-SizeBox([float]$X,[float]$Y,[float]$Width,[float]$Height,[string]$Fill='#ffffff'){
    $sizeBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill))
    $sizeGraphics.FillRectangle($sizeBrush,$X,$Y,$Width,$Height);$sizeBrush.Dispose()
}
Draw-SizeBox 35 30 1130 1040 '#ffffff'
Write-SizeText '被跟时更难赢，大注为什么仍可能更好？' 80 67 34
Write-SizeText '完整给定模型 · 从同一决定时点计平均收益 · 不是课程策略答案' 82 122 19 '#737780'
Write-SizeText '自己 Q♠ Q♣    河牌 K♠ 7♥ 2♦ 3♣ 9♥    池 10 BB' 82 178 24
$sizeActions=@($sizeExample.actions | Where-Object {$_.id -ne 'check'})
for($sizeIndex=0;$sizeIndex -lt 2;$sizeIndex++){
    $sizeAction=$sizeActions[$sizeIndex];$sizeX=82+$sizeIndex*530
    Draw-SizeBox $sizeX 238 500 164 '#f5f3fa'
    Write-SizeText ('下注 '+$sizeAction.bet.ToString()+' BB') ($sizeX+26) 259 28
    Write-SizeText ('被跟时权益 '+($sizeAction.calledEquity*100).ToString('0.00')+'%') ($sizeX+26) 312 24 '#737780'
    Write-SizeText ('全部结果平均收益 '+$sizeAction.evBB.ToString('0.0')+' BB') ($sizeX+26) 354 24 '#675583'
}
Write-SizeText '从小注改成大注，变化来自哪里' 82 451 28
$sizeRows=@(
    @{id='JJ';reason='仍跟，多收付款'},
    @{id='66';reason='改弃，少收小注付款'},
    @{id='KJ';reason='改弃，原本赢你的牌退出'},
    @{id='KK';reason='仍跟，输时多付钱'}
)
$sizeTotal=0
for($sizeIndex=0;$sizeIndex -lt $sizeRows.Count;$sizeIndex++){
    $sizeRow=$sizeRows[$sizeIndex];$sizeY=516+$sizeIndex*77
    $sizeSmall=$sizeActions[0].contributions | Where-Object {$_.group -eq $sizeRow.id}
    $sizeLarge=$sizeActions[1].contributions | Where-Object {$_.group -eq $sizeRow.id}
    $sizeDelta=$sizeLarge.weightedEVBB-$sizeSmall.weightedEVBB;$sizeTotal+=$sizeDelta
    Draw-SizeBox 82 $sizeY 1030 63 '#f8f8fa'
    Write-SizeText $sizeRow.id 107 ($sizeY+16) 24
    Write-SizeText $sizeRow.reason 238 ($sizeY+16) 24
    $sizeSign=if($sizeDelta -gt 0){'+'}else{''}
    Write-SizeText ($sizeSign+$sizeDelta.ToString('0.0')+' BB') 934 ($sizeY+16) 24
}
Write-SizeText ('合计：大注多 '+$sizeTotal.ToString('0.0')+' BB') 82 853 28 '#675583'
Write-SizeText 'AJ 两种都弃，对这次差额没有贡献。过牌的平均收益是 8 BB。' 82 908 21 '#737780'
Write-SizeText '给定质量：JJ 2份 · 66 3份 · KJ 1份 · KK 1份 · AJ 3份' 82 950 21 '#737780'
Write-SizeText '“被跟”只看了一部分；比较收益必须把退出与继续一起算。' 82 1009 24
$sizeBitmap.Save($sizeOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($sizeFont in $sizeFonts.Values){$sizeFont.Dispose()}
$sizeGraphics.Dispose();$sizeBitmap.Dispose()
Write-Output $sizeOutput
