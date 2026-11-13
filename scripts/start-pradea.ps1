param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project '.local-tools\node\node.exe'
$stateFile = Join-Path $project '.local-tools\frontend-session.json'
$url = 'http://localhost:4200/auth/login'
$probeUrl = 'http://127.0.0.1:4200/auth/login'
try {
    $probe = New-Object System.Net.Sockets.TcpClient
    $listener = $false
    try { $probe.Connect('127.0.0.1', 4200); $listener = $true } catch { } finally { $probe.Dispose() }
    if ($listener) {
        $response = Invoke-WebRequest -Uri $probeUrl -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -ne 200 -or $response.Content -notmatch '<title>Pradea') {
            throw 'Port 4200 digunakan aplikasi lain. Tutup aplikasi tersebut terlebih dahulu.'
        }
    } else {
        if (-not (Test-Path -LiteralPath (Join-Path $project 'apps\frontend\.next\BUILD_ID'))) {
            throw 'Build belum tersedia. Jalankan pnpm-local.cmd build:frontend dahulu.'
        }
        $logs = Join-Path $project '.local-tools\logs'
        New-Item -ItemType Directory -Path $logs -Force | Out-Null
        $entry = Join-Path $project 'scripts\frontend-local.cjs'
        $server = Start-Process -FilePath $runtime -ArgumentList ('"' + $entry + '"') -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'frontend.log') -RedirectStandardError (Join-Path $logs 'frontend-error.log') -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if ($server.HasExited) { throw 'Frontend berhenti. Periksa .local-tools\logs\frontend-error.log.' }
            try {
                $response = Invoke-WebRequest -Uri $probeUrl -UseBasicParsing -TimeoutSec 5
                if ($response.StatusCode -eq 200 -and $response.Content -match '<title>Pradea' -and -not $server.HasExited) { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw 'Frontend belum siap. Periksa .local-tools\logs.' }
        @{ pid = $server.Id; started = $server.StartTime.ToUniversalTime().ToString('o'); runtime = $runtime } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
    }
    Write-Host "Pradea aktif: $url"
    Write-Host 'Jendela ini boleh ditutup. Gunakan Stop-Pradea.cmd untuk menghentikan frontend.'
    if (-not $NoBrowser) { Start-Process $url }
} catch {
    Write-Error $_
    exit 1
}
