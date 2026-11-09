$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$packetRoot = Split-Path -Parent $PSScriptRoot
$packetData = Get-Content -LiteralPath (Join-Path $packetRoot 'research/nevir-system/first-pass-structure-prompts.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$packetDir = Join-Path $packetRoot 'research/nevir-system/figures'
New-Item -ItemType Directory -Path $packetDir -Force | Out-Null
$packetFonts=@{}
foreach($packetSize in @(17,19,21,24,28,34,42)){ $packetFonts[$packetSize]=[System.Drawing.Font]::new('Microsoft YaHei UI',$packetSize,[System.Drawing.FontStyle]::Regular,[System.Drawing.GraphicsUnit]::Pixel) }
function Write-PacketText([string]$Content,[float]$X,[float]$Y,[int]$Size=24,[string]$Color='#292b31'){
    $packetBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
    $packetGraphics.DrawString($Content,$packetFonts[$Size],$packetBrush,$X,$Y)
    $packetBrush.Dispose()
}
function Draw-PacketBox([float]$X,[float]$Y,[float]$Width,[float]$Height,[string]$Fill='#ffffff',[string]$Outline='#e5e6ea'){
    $packetBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Fill))
    $packetPen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($Outline),1.5)
    $packetPath=[System.Drawing.Drawing2D.GraphicsPath]::new()
    $packetRadius=18
    $packetPath.AddArc($X,$Y,$packetRadius,$packetRadius,180,90)
    $packetPath.AddArc($X+$Width-$packetRadius,$Y,$packetRadius,$packetRadius,270,90)
    $packetPath.AddArc($X+$Width-$packetRadius,$Y+$Height-$packetRadius,$packetRadius,$packetRadius,0,90)
    $packetPath.AddArc($X,$Y+$Height-$packetRadius,$packetRadius,$packetRadius,90,90)
    $packetPath.CloseFigure()
    $packetGraphics.FillPath($packetBrush,$packetPath);$packetGraphics.DrawPath($packetPen,$packetPath)
    $packetBrush.Dispose();$packetPen.Dispose();$packetPath.Dispose()
}
function Card-PacketFace([string]$Id){return $Id.Substring(0,1)+@{s='♠';h='♥';d='♦';c='♣'}[$Id.Substring(1,1)]}
function Draw-PacketCard([string]$Id,[float]$X,[float]$Y,[float]$Width=92,[float]$Height=112){
    Draw-PacketBox $X $Y $Width $Height '#ffffff' '#dfe1e7'
    $packetColor=if($Id.Substring(1,1) -in @('h','d')){'#b64761'}else{'#30333b'}
    Write-PacketText (Card-PacketFace $Id) ($X+17) ($Y+($Height-55)/2) 42 $packetColor
}
$packetSeats=@(
    @{name='UTG';x=400;y=195},@{name='HJ';x=800;y=195},@{name='CO';x=1030;y=360},
    @{name='BTN';x=800;y=550},@{name='SB';x=400;y=550},@{name='BB';x=170;y=360}
)
foreach($packetCase in $packetData.cases){
    $packetBitmap=[System.Drawing.Bitmap]::new(1200,1300)
    $packetGraphics=[System.Drawing.Graphics]::FromImage($packetBitmap)
    $packetGraphics.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $packetGraphics.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $packetGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
    Draw-PacketBox 35 30 1130 1240 '#ffffff' '#ffffff'
    Write-PacketText ('状态卡 '+$packetCase.id) 80 65 34
    Write-PacketText '只判断当前流程 · 不考最佳策略' 82 117 21 '#737780'
    $packetBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#f5f5f8'))
    $packetGraphics.FillEllipse($packetBrush,220,235,760,260);$packetBrush.Dispose()
    foreach($packetSeat in $packetSeats){
        $packetActive=$packetSeat.name -notin $packetCase.state.foldedSeats
        $packetSelf=$packetSeat.name -eq $packetCase.hero
        $packetFill=if($packetSelf){'#eeeaf9'}else{'#fafafa'}
        $packetOutline=if($packetSelf){'#b5a7d7'}else{'#e9e9ed'}
        Draw-PacketBox ($packetSeat.x-82) ($packetSeat.y-48) 164 96 $packetFill $packetOutline
        $packetName=$packetSeat.name+$(if($packetSelf){' · 自己'}else{''})
        Write-PacketText $packetName ($packetSeat.x-63) ($packetSeat.y-39) 24 $(if($packetActive){'#30333b'}else{'#9599a1'})
        $packetSeatInfo=if($packetActive){'后手 '+$packetCase.state.stacksBB.($packetSeat.name).ToString()+' BB'}else{'已弃牌'}
        Write-PacketText $packetSeatInfo ($packetSeat.x-63) ($packetSeat.y-6) 19 '#737780'
        if($packetActive){Write-PacketText ('本街已投 '+$packetCase.state.streetPaidBB.($packetSeat.name).ToString()+' BB') ($packetSeat.x-63) ($packetSeat.y+25) 17 '#737780'}
    }
    $packetStreet=@{flop='翻牌';turn='转牌';river='河牌'}[$packetCase.state.street]
    Write-PacketText ($packetStreet+' · 桌上 '+$packetCase.state.potBB.ToString()+' BB') 449 266 24
    $packetStartX=600-($packetCase.state.board.Count*106-14)/2
    for($packetIndex=0;$packetIndex -lt $packetCase.state.board.Count;$packetIndex++){
        Draw-PacketCard $packetCase.state.board[$packetIndex] ($packetStartX+$packetIndex*106) 321
    }
    Write-PacketText '你的底牌' 537 622 21 '#737780'
    Draw-PacketCard $packetCase.heroHole[0] 480 665 110 130
    Draw-PacketCard $packetCase.heroHole[1] 610 665 110 130
    if($packetCase.revealedVillainHole){
        Write-PacketText '对方已亮牌' 812 638 19 '#737780'
        Draw-PacketCard $packetCase.revealedVillainHole[0] 812 675 92 112
        Draw-PacketCard $packetCase.revealedVillainHole[1] 918 675 92 112
    }
    Write-PacketText '本手经过' 81 833 21 '#737780'
    $packetHistory='翻前：BTN到2.5，SB弃，BB跟。翻后：'+($packetCase.state.history -join ' → ')
    foreach($packetSuitId in @('s','h','d','c')){
        $packetSuit=@{s='♠';h='♥';d='♦';c='♣'}[$packetSuitId]
        $packetHistory=$packetHistory -creplace ('([2-9TJQKA])'+$packetSuitId+'\b'),('$1'+$packetSuit)
    }
    $packetBrush=[System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#444852'))
    $packetGraphics.DrawString($packetHistory,$packetFonts[21],$packetBrush,[System.Drawing.RectangleF]::new(82,873,1030,170))
    $packetBrush.Dispose()
    Write-PacketText '下一步，先点哪里？' 81 1060 28
    $packetChoices=@('自己','对手','公共牌','底池','我不知道')
    for($packetIndex=0;$packetIndex -lt $packetChoices.Count;$packetIndex++){
        $packetX=82+$packetIndex*210
        Draw-PacketBox $packetX 1116 190 54 '#f7f7f9' '#f7f7f9'
        Write-PacketText $packetChoices[$packetIndex] ($packetX+27) 1128 24
    }
    Write-PacketText '若轮到你：圈出合法动作，写待补额。' 83 1200 21 '#737780'
    $packetOutput=Join-Path $packetDir ('structure-'+$packetCase.id+'.png')
    $packetBitmap.Save($packetOutput,[System.Drawing.Imaging.ImageFormat]::Png)
    $packetGraphics.Dispose();$packetBitmap.Dispose()
}
foreach($packetFont in $packetFonts.Values){$packetFont.Dispose()}
Write-Output ('Rendered '+$packetData.cases.Count+' static document cards in '+$packetDir)
