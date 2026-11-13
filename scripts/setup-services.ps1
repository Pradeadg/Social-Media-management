$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
$logs = Join-Path $project '.local-tools\logs'
New-Item -ItemType Directory -Path $logs -Force | Out-Null
$reportPath = Join-Path $logs 'services-setup.json'
$report = [ordered]@{ time = (Get-Date).ToString('o'); complete = $false; stage = 'docker'; error = $null }
$transcribing = $false
try {
    Start-Transcript -LiteralPath (Join-Path $logs 'services-setup.log') -Force | Out-Null
    $transcribing = $true
    $docker = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
    if (-not (Test-Path -LiteralPath $docker)) {
        $docker = (Get-Command docker.exe -ErrorAction Stop).Source
    }
    & $docker version --format '{{.Server.Version}}'
    if ($LASTEXITCODE -ne 0) { throw 'Docker Engine belum dapat diakses. Buka Docker Desktop dan tunggu Engine running.' }
    & $docker compose -f docker-compose.dev.yaml config --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Konfigurasi Compose tidak valid.' }
    # Reuse existing containers and volumes. Never reset or delete data.
    $report.stage = 'containers'
    Write-Host 'Mengunduh image dan menjalankan PostgreSQL, Redis, serta Temporal. Unduhan pertama dapat memakan waktu.'
    & $docker compose -f docker-compose.dev.yaml up -d postiz-postgres postiz-redis temporal
    if ($LASTEXITCODE -ne 0) { throw 'Container belum berhasil dijalankan; lihat pesan Docker di atas.' }
    $report.stage = 'readiness'
    & (Join-Path $project '.local-tools\node\node.exe') (Join-Path $PSScriptRoot 'check-services.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Layanan belum siap. Tunggu sebentar lalu jalankan file ini kembali.' }
    $report.stage = 'schema'
    Write-Host 'Menyiapkan skema database dengan Prisma lokal. Jika ada peringatan kehilangan data, batalkan dan laporkan ke chat.'
    & (Join-Path $project 'pnpm-local.cmd') prisma-db-push
    if ($LASTEXITCODE -ne 0) { throw 'Skema belum siap. Tidak ada reset atau persetujuan kehilangan data otomatis.' }
    & $docker compose -f docker-compose.dev.yaml ps
    if ($LASTEXITCODE -ne 0) { throw 'Pemeriksaan status container gagal.' }
    $report.stage = 'ready'
    $report.complete = $true
    Write-Host 'LAYANAN PRADEA SIAP. Kembali ke chat untuk melanjutkan pengujian backend dan login.' -ForegroundColor Green
} catch {
    $report.error = $_.Exception.Message
    Write-Host $report.error -ForegroundColor Red
} finally {
    $report | ConvertTo-Json | Set-Content -LiteralPath $reportPath -Encoding UTF8
    if ($transcribing) { Stop-Transcript | Out-Null }
}
if (-not $report.complete) { exit 1 }
exit 0
