param([string]$Server = 'http://127.0.0.1:8096')
$ErrorActionPreference = 'Stop'
$uri = $Server.TrimEnd('/') + '/System/Info/Public'
try {
    $r = Invoke-RestMethod -Uri $uri -TimeoutSec 10
    Write-Host 'Jellyfin responded successfully.' -ForegroundColor Green
    Write-Host "Server name: $($r.ServerName)"
    Write-Host "Jellyfin version: $($r.Version)"
    Write-Host "Server ID: $($r.Id)"
    Write-Host 'No libraries or settings have been changed.'
} catch {
    Write-Warning "Could not reach $uri"
    Write-Host 'Confirm Jellyfin is running and check its server address and port.'
    exit 1
}
