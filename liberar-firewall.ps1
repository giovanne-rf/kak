$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Host "Abra o PowerShell como Administrador e rode novamente:"
    Write-Host ".\liberar-firewall.ps1"
    exit 1
}

$rules = @(
    @{ Name = "KAK Frontend 5173"; Port = 5173 },
    @{ Name = "KAK Backend 8000"; Port = 8000 }
)

foreach ($rule in $rules) {
    $existingRule = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if ($existingRule) {
        Write-Host "Regra ja existe: $($rule.Name)"
        continue
    }

    New-NetFirewallRule `
        -DisplayName $rule.Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalPort $rule.Port `
        -Profile Any | Out-Null

    Write-Host "Regra criada: $($rule.Name) na porta $($rule.Port)"
}

Write-Host "Firewall liberado para o sistema KAK."
