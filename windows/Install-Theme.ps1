param(
  [ValidateSet('cinema-dark','ocean-blue','midnight-purple')]
  [string]$Theme = 'cinema-dark',
  [switch]$ShowOnly
)
$ErrorActionPreference = 'Stop'
$base = 'https://raw.githubusercontent.com/duderz2011/jellyfin-universal-themes/main/themes'
$url = "$base/$Theme.css"
Write-Host "Fetching $Theme from GitHub..."
try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
    $css = [string]$response.Content
    if ($response.StatusCode -ne 200 -or $css.Length -lt 30) { throw 'The downloaded CSS is incomplete.' }
    if ($ShowOnly) { Write-Output $css; return }
    Set-Clipboard -Value $css
    Write-Host 'Theme CSS has been copied to your clipboard.' -ForegroundColor Green
    Write-Host 'Sign in to Jellyfin Web as an administrator.'
    Write-Host 'Go to Dashboard > Branding > Custom CSS (location may vary by Jellyfin version).'
    Write-Host 'BACK UP existing CSS first, then paste with Ctrl+V and save.'
    Write-Host 'Reload Jellyfin Web with Ctrl+F5.'
    Write-Host 'Native TV apps are NOT restyled by server CSS.'
} catch {
    Write-Error "Could not retrieve theme. Jellyfin settings have not been modified. $($_.Exception.Message)"
    exit 1
}
