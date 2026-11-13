param([switch]$NoBrowser, [switch]$UseRunningContainers)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project '.local-tools\node\node.exe'
$logs = Join-Path $project '.local-tools\logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
function Start-LocalService([string]$role, [int]$port, [string]$healthPath) {
    $statePath = Join-Path $project ".local-tools\$role-session.json"
    $server = $null
    if (Test-Path -LiteralPath $statePath) {
        $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
        $candidate = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
        if ($candidate -and $candidate.Path -eq $runtime -and ($candidate.StartTime.ToUniversalTime().Ticks -eq ([datetime]$saved.started).ToUniversalTime().Ticks)) { $server = $candidate }
    }
    if (-not $server) {
        $probe = New-Object System.Net.Sockets.TcpClient
        $occupied = $false
        try { $probe.Connect('127.0.0.1', $port); $occupied = $true } catch {} finally { $probe.Dispose() }
        if ($occupied) { throw "Port $port digunakan proses lain. Tidak menjalankan $role ganda." }
        $main = Join-Path $project "apps\$role\dist\apps\$role\src\main.js"
        if (-not (Test-Path -LiteralPath $main)) { throw "Build $role belum ada. Jalankan pnpm-local.cmd build:$role." }
        $dotenv = Join-Path $project 'node_modules\dotenv\config.js'
        $env:DOTENV_CONFIG_PATH = Join-Path $project '.env'
        $server = Start-Process -FilePath $runtime -ArgumentList @('--require', ('"' + $dotenv + '"'), ('"' + $main + '"')) -WorkingDirectory (Join-Path $project "apps\$role") -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "$role.log") -RedirectStandardError (Join-Path $logs "$role-error.log") -PassThru
        @{ pid = $server.Id; started = $server.StartTime.ToUniversalTime().ToString('o'); runtime = $runtime } | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
    }
    for ($attempt = 0; $attempt -lt 240; $attempt++) {
        if ($server.HasExited) { throw "$role berhenti. Periksa .local-tools\logs\$role-error.log." }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port$healthPath" -TimeoutSec 3
            if ($response.StatusCode -eq 200) { Write-Host "$role siap di port $port"; return }
        } catch {}
        Start-Sleep -Seconds 1
    }
    throw "$role belum siap. Periksa .local-tools\logs\$role.log."
}
try {
    Write-Host 'Menyiapkan PostgreSQL, Redis, dan Temporal dari container yang sudah ada.'
    if (-not $UseRunningContainers) {
        & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start-existing-services.ps1')
        if ($LASTEXITCODE -ne 0) { throw 'Container layanan belum siap. Lihat pesan Docker di atas.' }
    }
    & $runtime (Join-Path $PSScriptRoot 'check-services.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Layanan belum siap. Jalankan Siapkan-Layanan.cmd terlebih dahulu.' }
    & $runtime (Join-Path $PSScriptRoot 'setup-social-management.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Tabel Social Hub belum siap. Periksa koneksi PostgreSQL.' }
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stop-demo.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Sesi demo tidak dapat dihentikan dengan aman.' }
    Start-LocalService 'backend' 3000 '/auth/can-register'
    Start-LocalService 'orchestrator' 3002 '/health/status'
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'start-pradea.ps1') -NoBrowser
    if ($LASTEXITCODE -ne 0) { throw 'Frontend gagal dijalankan.' }
    Write-Host 'PRADEA SIAP: http://localhost:4200'
    Write-Host 'Gunakan Stop-Pradea-Lengkap.cmd untuk berhenti. Database Docker tetap tersimpan.'
    if (-not $NoBrowser) { Start-Process 'http://localhost:4200' }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

