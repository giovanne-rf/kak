#!/usr/bin/env bash
set -euo pipefail

if ! command -v powershell.exe >/dev/null 2>&1; then
  echo "Este script remove regras do Firewall do Windows e precisa do Git Bash no Windows."
  echo "Em PowerShell como Administrador, remova manualmente as regras:"
  echo "Remove-NetFirewallRule -DisplayName 'KAK Frontend 5173'"
  echo "Remove-NetFirewallRule -DisplayName 'KAK Backend 8000'"
  exit 1
fi

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command '
$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    Write-Host "Abra o Git Bash ou PowerShell como Administrador e rode novamente:"
    Write-Host "bash ./derrubar-firewall.sh"
    exit 1
}

$rules = @(
    "KAK Frontend 5173",
    "KAK Backend 8000"
)

foreach ($rule in $rules) {
    $existingRule = Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName $rule
        Write-Host "Regra removida: $rule"
    }
    else {
        Write-Host "Regra nao encontrada: $rule"
    }
}

Write-Host "Regras de firewall do sistema KAK removidas."
'
