#!/usr/bin/env bash
# Cross-build the UIA sidecar for Windows FROM Linux/macOS (or on Windows).
# Requires the .NET 8 SDK. On Linux/macOS the -p:EnableWindowsTargeting=true flag
# restores the Windows ref packs so FlaUI (WinForms dep) compiles off-Windows.
#
# No sudo needed to get the SDK:
#   curl -fsSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 8.0
#   export PATH="$HOME/.dotnet:$PATH"
#   sidecar/build.sh
set -e
here="$(cd "$(dirname "$0")" && pwd)"
dotnet publish "$here/Manufactura.Sidecar.csproj" \
  -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true -p:EnableWindowsTargeting=true \
  -o "$here/out"
echo "Done -> $here/out/Manufactura.Sidecar.exe"
