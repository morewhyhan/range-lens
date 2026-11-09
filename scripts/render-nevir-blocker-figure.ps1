$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$diagramRoot = Split-Path -Parent $PSScriptRoot
$diagramData = Get-Content -LiteralPath (Join-Path $diagramRoot 'research/nevir-system/blocker-teaching-evidence.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$diagramDir = Join-Path $diagramRoot 'research/nevir-system/figures'
New-Item -ItemType Directory -Path $diagramDir -Force | Out-Null
$diagramOutput = Join-Path $diagramDir 'blocker-at-suit-example.png'
$diagramBitmap = [System.Drawing.Bitmap]::new(1200, 1000)
$diagramGraphics = [System.Drawing.Graphics]::FromImage($diagramBitmap)
$diagramGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$diagramGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$diagramGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f5f5f7'))
$diagramFonts = @{}
foreach ($diagramSize in @(17,20,23,25,30,36)) { $diagramFonts[$diagramSize] = [System.Drawing.Font]::new('Microsoft YaHei UI', $diagramSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel) }
function Write-DiagramText([string]$Content, [float]$X, [float]$Y, [int]$Size = 23, [string]$Color = '#25262b') {
    $diagramBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
    $diagramGraphics.DrawString($Content, $diagramFonts[$Size], $diagramBrush, $X, $Y)
    $diagramBrush.Dispose()
}
function Draw-DiagramBox([float]$X, [float]$Y, [float]$Width, [float]$Height, [string]$Color, [string]$Outline = '#e3e4e8') {
    $diagramBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($Color))
    $diagramPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($Outline), 1.5)
    $diagramGraphics.FillRectangle($diagramBrush,$X,$Y,$Width,$Height)
    $diagramGraphics.DrawRectangle($diagramPen,$X,$Y,$Width,$Height)
    $diagramBrush.Dispose(); $diagramPen.Dispose()
}
Draw-DiagramBox 35 30 1130 940 '#ffffff' '#ffffff'
Write-DiagramText '同一张 A♥，究竟占掉谁？' 85 72 36
Write-DiagramText '组合事实图 · 不代表下注建议' 87 130 20 '#737780'
Write-DiagramText '公共牌  T♥  8♦  5♣      自己  A♥  4♥' 87 184 25
Write-DiagramText '对方 AT：按具体花色展开' 87 255 23
$diagramRows = @('♠','♥','♦','♣')
$diagramColumns = @('♠','♦','♣')
for ($diagramColumn = 0; $diagramColumn -lt 3; $diagramColumn++) {
    Write-DiagramText ('T' + $diagramColumns[$diagramColumn]) (360 + $diagramColumn*225) 311 25
}
for ($diagramRow = 0; $diagramRow -lt 4; $diagramRow++) {
    $diagramY = 360 + $diagramRow*86
    $diagramSuit = $diagramRows[$diagramRow]
    Write-DiagramText ('A' + $diagramSuit) 160 ($diagramY+20) 30 $(if($diagramSuit -in @('♥','♦')) {'#ba5264'} else {'#30333b'})
    for ($diagramColumn = 0; $diagramColumn -lt 3; $diagramColumn++) {
        $diagramX = 275 + $diagramColumn*225
        $diagramIsSuited = $diagramSuit -eq $diagramColumns[$diagramColumn]
        $diagramIsRemoved = $diagramSuit -eq '♥'
        $diagramFill = if ($diagramIsRemoved) {'#f1f2f4'} elseif ($diagramIsSuited) {'#eeeaf9'} else {'#fafafa'}
        Draw-DiagramBox $diagramX $diagramY 205 68 $diagramFill
        Write-DiagramText ('A' + $diagramSuit + '  T' + $diagramColumns[$diagramColumn]) ($diagramX+24) ($diagramY+17) 25 $(if($diagramIsRemoved) {'#9a9ca3'} else {'#30333b'})
        if($diagramIsSuited){Write-DiagramText '同花' ($diagramX+143) ($diagramY+22) 17 '#756197'}
        if($diagramIsRemoved){
            $diagramPen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#9c9fa8'),2.5)
            $diagramGraphics.DrawLine($diagramPen, $diagramX+15, $diagramY+55, $diagramX+188, $diagramY+13)
            $diagramPen.Dispose()
        }
    }
}
Write-DiagramText 'A♥ 这一行被自己的牌占用了。' 87 732 23
$diagramGroups = @('AT','ATs','ATo')
$diagramLabels = @('全部 AT','同花 AT','不同花 AT')
for($diagramIndex=0;$diagramIndex -lt 3;$diagramIndex++){
    $diagramGroup = $diagramData.groups | Where-Object { $_.group -eq $diagramGroups[$diagramIndex] }
    $diagramX=87+$diagramIndex*338
    Draw-DiagramBox $diagramX 788 307 90 '#f7f7f9' '#f7f7f9'
    Write-DiagramText $diagramLabels[$diagramIndex] ($diagramX+20) 802 20 '#737780'
    Write-DiagramText ($diagramGroup.physicalBefore.ToString()+' → '+$diagramGroup.physicalAfter.ToString()) ($diagramX+20) 831 30
}
Write-DiagramText 'T♥ 已在桌上，A♥T♥ 原本就不可能。' 87 908 20 '#62666f'
Write-DiagramText '因此，持 A♥ 并没有减少任何同花 AT。' 87 937 20 '#62666f'
$diagramBitmap.Save($diagramOutput,[System.Drawing.Imaging.ImageFormat]::Png)
foreach($diagramFont in $diagramFonts.Values){$diagramFont.Dispose()}
$diagramGraphics.Dispose(); $diagramBitmap.Dispose()
Write-Output $diagramOutput
