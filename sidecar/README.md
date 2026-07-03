# Manufactura Connect — UIA Sidecar (Tier 4)

Native Windows automation engine for **element-based** desktop automation
(Win32 / WinForms / WPF / UIA) using **FlaUI (UIA3)**. The Node robot drives it
over JSON-RPC on stdio; nodes target elements by **AutomationId / Name /
ControlType** — robust and resolution-independent (unlike Tier 2 coordinates).

## Build (Windows, one-time)

Requires the **.NET 8 SDK** (https://dotnet.microsoft.com/download).

```powershell
powershell -ExecutionPolicy Bypass -File sidecar\build.ps1
```

Output: `sidecar\dist\Manufactura.Sidecar.exe` (self-contained single .exe — the
target machine needs no .NET runtime). electron-builder ships this via
`extraResources`.

## Run manually (debug)

```powershell
sidecar\dist\Manufactura.Sidecar.exe
# then type a JSON line:
{"id":1,"cmd":"health"}
{"id":2,"cmd":"launch","params":{"path":"notepad.exe"}}
{"id":3,"cmd":"setText","params":{"selector":"class:Edit","text":"hello"}}
```

## Protocol (one JSON object per line)

Request:  `{ "id": <n>, "cmd": "<name>", "params": { ... } }`
Response: `{ "id": <n>, "ok": true, "result": {...} }` or `{ "id": <n>, "ok": false, "error": "..." }`

| cmd | params | result |
|---|---|---|
| `health` | — | `{ ok, engine }` |
| `launch` | `path`, `args?`, `timeoutMs?` | `{ pid, title }` |
| `attach` | `process` or `pid`, `title?` | `{ pid, title }` |
| `click` | `selector`, `button?`, `double?`, `timeoutMs?` | `{ clicked }` |
| `setText` | `selector`, `text`, `timeoutMs?` | `{ set }` |
| `getText` / `getValue` | `selector`, `timeoutMs?` | `{ text }` |
| `exists` | `selector`, `timeoutMs?` | `{ exists }` |
| `waitFor` | `selector`, `state?` (visible/hidden), `timeoutMs?` | `{ ok }` |
| `close` | — | `{ closed }` |

## Selector grammar

`automationId:<id>` · `name:<text>` · `controlType:<Button|Edit|...>` ·
`class:<className>` · optional `#<index>` (1-based) · chain with ` > ` for
descendants.

Examples: `automationId:okButton` · `name:OK` · `controlType:Edit#2` ·
`name:File > name:Save`

## Resolving the sidecar path (Node side)

`DesktopProvider` looks up, in order:
1. `process.env.MC_SIDECAR_PATH`
2. packaged: `<resources>/sidecar/Manufactura.Sidecar.exe`
3. dev: `sidecar/dist/Manufactura.Sidecar.exe`

If none exists (or non-Windows), desktop UIA nodes fail with a clear message.
