$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$RuntimeDir = Join-Path $Root ".runtime"
$BackendPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
$FrontendVite = Join-Path $FrontendDir "node_modules\vite\bin\vite.js"
$HostAddress = "0.0.0.0"
$LocalIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown"
} | Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $LocalIp) {
    $LocalIp = "127.0.0.1"
}

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

function Get-PortOwnerId {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($connection) {
        return [int]$connection.OwningProcess
    }
    return $null
}

function Test-ManagedPid {
    param(
        [string]$PidFile,
        [int]$Port
    )
    if (-not (Test-Path $PidFile)) {
        return $false
    }

    $expectedPid = Get-Content $PidFile | Select-Object -First 1
    if (-not $expectedPid) {
        return $false
    }

    return [bool](Get-Process -Id $expectedPid -ErrorAction SilentlyContinue)
}

function Assert-PortAvailableOrManaged {
    param(
        [int]$Port,
        [string]$PidFile,
        [string]$ServiceName
    )

    if (-not (Test-Port $Port)) {
        return $true
    }

    if (Test-ManagedPid -PidFile $PidFile -Port $Port) {
        Write-Host "$ServiceName ja esta respondendo em http://127.0.0.1:$Port"
        return $false
    }

    $portPid = Get-PortOwnerId $Port
    Write-Host "$ServiceName nao foi iniciado porque a porta $Port ja esta em uso pelo processo $portPid."
    Write-Host "Execute .\derrubar-sistema.ps1 e depois rode .\subir-sistema.ps1 novamente."
    exit 1
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

if (Assert-PortAvailableOrManaged -Port 8000 -PidFile (Join-Path $RuntimeDir "backend.pid") -ServiceName "Backend") {
    Write-Host "Subindo backend..."
    $backendProcess = Start-Process `
        -FilePath $BackendPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", $HostAddress, "--port", "8000") `
        -WorkingDirectory $BackendDir `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $RuntimeDir "backend.out.log") `
        -RedirectStandardError (Join-Path $RuntimeDir "backend.err.log") `
        -PassThru
    Set-Content -Path (Join-Path $RuntimeDir "backend.pid") -Value $backendProcess.Id
}

if (Assert-PortAvailableOrManaged -Port 5173 -PidFile (Join-Path $RuntimeDir "frontend.pid") -ServiceName "Frontend") {
    Write-Host "Subindo frontend..."
    $frontendProcess = Start-Process `
        -FilePath "node.exe" `
        -ArgumentList @($FrontendVite, "--host", $HostAddress, "--port", "5173") `
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
Write-Host "Rede:     http://$LocalIp`:5173"
