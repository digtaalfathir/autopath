# Build the Manufactura Connect UIA sidecar (Windows, requires .NET 8 SDK).
#
#   powershell -ExecutionPolicy Bypass -File sidecar\build.ps1
#
# Produces a self-contained single .exe (no .NET runtime needed on the target)
# at sidecar\out\Manufactura.Sidecar.exe — this is what electron-builder ships.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path $here "out"

Write-Host "Building UIA sidecar (net8.0-windows, self-contained win-x64)..."
dotnet publish (Join-Path $here "Manufactura.Sidecar.csproj") `
  -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true `
  -o $out

Write-Host "Done → $out\Manufactura.Sidecar.exe"
