$ErrorActionPreference = 'Stop'
if (-not ('NevirMemoryProbe' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class NevirMemoryProbe {
 [StructLayout(LayoutKind.Sequential)] public struct MemoryStatus { public uint length; public uint load; public ulong totalPhysical; public ulong availablePhysical; public ulong totalPage; public ulong availablePage; public ulong totalVirtual; public ulong availableVirtual; public ulong extended; }
 [DllImport("kernel32.dll", SetLastError=true)] public static extern bool GlobalMemoryStatusEx(ref MemoryStatus status);
 public static MemoryStatus Read() { var s=new MemoryStatus(); s.length=(uint)Marshal.SizeOf(s); if(!GlobalMemoryStatusEx(ref s)) throw new Exception("GlobalMemoryStatusEx failed"); return s; }
}
'@
}
$nevirMemory = [NevirMemoryProbe]::Read()
$nevirSnapshot = [ordered]@{
 observedUtc = [DateTime]::UtcNow.ToString('o')
 source = 'Windows GlobalMemoryStatusEx; instantaneous, not a future reservation'
 totalPhysicalBytes = $nevirMemory.totalPhysical
 availablePhysicalBytes = $nevirMemory.availablePhysical
 loadPercent = $nevirMemory.load
}
$nevirSnapshot | ConvertTo-Json | Set-Content -LiteralPath 'research/nevir-system/memory-snapshot.json' -Encoding utf8
$nevirSnapshot | ConvertTo-Json
