$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$RuntimeDir = Join-Path $Root ".runtime"
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

function Test-Port {
    param([int]$Port)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $Port)
        return $true
    }
    catch {
        return $false
    }
    finally {
        $client.Close()
    }
}

if (-not (Test-Path $BackendPython)) {
    Write-Host "Criando ambiente virtual do backend..."
    Push-Location $BackendDir
    python -m venv .venv
    Pop-Location
}

Write-Host "Conferindo dependencias Python..."
Push-Location $BackendDir
& $BackendPython -m pip install -r requirements.txt
Pop-Location

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Instalando dependencias do frontend..."
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

if (Test-Port 8000) {
    Write-Host "Backend ja esta respondendo em http://127.0.0.1:8000"
}
else {
    Write-Host "Subindo backend..."
    $backendProcess = Start-Process `
        -FilePath $BackendPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000") `
        -WorkingDirectory $BackendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $RuntimeDir "backend.out.log") `
        -RedirectStandardError (Join-Path $RuntimeDir "backend.err.log") `
        -PassThru
    Set-Content -Path (Join-Path $RuntimeDir "backend.pid") -Value $backendProcess.Id
}

if (Test-Port 5173) {
    Write-Host "Frontend ja esta respondendo em http://127.0.0.1:5173"
}
else {
    Write-Host "Subindo frontend..."
    $frontendProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev", "--", "--port", "5173") `
        -WorkingDirectory $FrontendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $RuntimeDir "frontend.out.log") `
        -RedirectStandardError (Join-Path $RuntimeDir "frontend.err.log") `
        -PassThru
    Set-Content -Path (Join-Path $RuntimeDir "frontend.pid") -Value $frontendProcess.Id
}

Write-Host ""
Write-Host "Sistema iniciado."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Backend:  http://127.0.0.1:8000"
