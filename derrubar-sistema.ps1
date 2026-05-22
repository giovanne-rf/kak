$ErrorActionPreference = "SilentlyContinue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $Root ".runtime"

function Stop-PidFile {
    param([string]$Path)
    if (Test-Path $Path) {
        $processId = Get-Content $Path | Select-Object -First 1
        if ($processId) {
            Stop-Process -Id $processId -Force
        }
        Remove-Item $Path -Force
    }
}

function Stop-Port {
    param([int]$Port)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen
    foreach ($connection in $connections) {
        Stop-Process -Id $connection.OwningProcess -Force
    }
}

Stop-PidFile (Join-Path $RuntimeDir "backend.pid")
Stop-PidFile (Join-Path $RuntimeDir "frontend.pid")
Stop-Port 8000
Stop-Port 5173

Write-Host "Sistema derrubado."
