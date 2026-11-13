$ErrorActionPreference = 'Stop'
try {
    $docker = Join-Path $env:LOCALAPPDATA 'Programs\DockerDesktop\resources\bin\docker.exe'
    if (-not (Test-Path -LiteralPath $docker)) { $docker = (Get-Command docker.exe -ErrorAction Stop).Source }
    & $docker version --format '{{.Server.Version}}' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Docker belum dapat diakses. Buka Docker Desktop, tunggu Engine running, lalu jalankan launcher langsung dari Windows.' }
    # Existing containers only: never create a new database or replace its volumes here.
    $requiredContainers = @('postiz-postgres', 'postiz-redis', 'temporal-postgresql', 'temporal-elasticsearch', 'temporal')
    $stoppedContainers = @()
    foreach ($containerName in $requiredContainers) {
        $running = & $docker inspect --type container --format '{{.State.Running}}' $containerName 2>$null
        if ($LASTEXITCODE -ne 0) { throw "Container $containerName belum tersedia. Jalankan Siapkan-Layanan.cmd dari folder project asli terlebih dahulu." }
        if (($running | Out-String).Trim() -ne 'true') { $stoppedContainers += $containerName }
    }
    # Persist restart behavior for the Temporal containers created by the earlier setup.
    & $docker update --restart unless-stopped temporal-postgresql temporal-elasticsearch temporal | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Tidak dapat mengatur startup Temporal. Periksa Docker Desktop.' }
    foreach ($containerName in $stoppedContainers) {
        Write-Host "Menyalakan container: $containerName"
        & $docker start $containerName | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Container $containerName gagal dinyalakan. Buka Docker Desktop > Containers > $containerName > Logs." }
    }
    Write-Host 'Container layanan sudah dinyalakan. Memeriksa kesiapan aplikasi...'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
exit 0
