param([Parameter(Mandatory=$true)][string]$WebRoot)
$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot '..\web\universal-themes'
$WebRoot=(Resolve-Path $WebRoot).Path
if (!(Test-Path (Join-Path $WebRoot 'index.html'))) { throw 'That folder is not the Jellyfin web root: index.html not found.' }
if (!(Test-Path (Join-Path $source 'index.html'))) { throw 'Missing extracted v0.6 web files.' }
$dest=Join-Path $WebRoot 'universal-themes'
if (Test-Path $dest) { $backup="$dest.backup-$(Get-Date -Format yyyyMMdd-HHmmss)";Copy-Item $dest $backup -Recurse -ErrorAction Stop;Write-Host "Backed up previous viewer: $backup" }
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item (Join-Path $source '*') $dest -Force -Recurse -ErrorAction Stop
Write-Host 'Viewer copied. Open http://127.0.0.1:8096/web/universal-themes/index.html' -ForegroundColor Green
Write-Host 'This adds a separate viewer page; it does not replace the default Jellyfin home screen.'
