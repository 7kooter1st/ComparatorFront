# Cloudflare Quick Tunnel -> local Vite (port 5173)
# Requires: npm run dev

$ErrorActionPreference = "Stop"
$Port = if ($env:VITE_PORT) { $env:VITE_PORT } else { "5173" }
$Target = "http://127.0.0.1:$Port"

function Resolve-Cloudflared {
    if ($env:CLOUDFLARED -and (Test-Path $env:CLOUDFLARED)) {
        return (Resolve-Path $env:CLOUDFLARED).Path
    }

    $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $candidates = @(
        "$PSScriptRoot\..\..\Qwen\.tools\cloudflared\cloudflared.exe",
        "$env:USERPROFILE\Desktop\Qwen\.tools\cloudflared\cloudflared.exe",
        "$env:LOCALAPPDATA\cloudflared\cloudflared.exe"
    )

    foreach ($path in $candidates) {
        if (Test-Path $path) {
            return (Resolve-Path $path).Path
        }
    }

    Write-Host ""
    Write-Host "cloudflared not found." -ForegroundColor Red
    Write-Host "Install: winget install Cloudflare.cloudflared"
    Write-Host "Or set: `$env:CLOUDFLARED = 'C:\path\to\cloudflared.exe'"
    exit 1
}

$cloudflared = Resolve-Cloudflared
$Protocol = if ($env:CLOUDFLARED_PROTOCOL) { $env:CLOUDFLARED_PROTOCOL } else { "http2" }

Write-Host ""
Write-Host "Cloudflare Tunnel -> $Target (protocol: $Protocol)" -ForegroundColor Cyan
Write-Host "Start backend on :5000 and frontend: npm run dev" -ForegroundColor DarkGray
Write-Host "Public URL will appear below (trycloudflare.com):" -ForegroundColor DarkGray
Write-Host ""

& $cloudflared tunnel --url $Target --protocol $Protocol
