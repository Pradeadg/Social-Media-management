param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project '.local-tools\node\node.exe'
$stateFile = Join-Path $project '.local-tools\demo-session.json'
$probe = New-Object System.Net.Sockets.TcpClient
$occupied = $false
try { $probe.Connect('127.0.0.1', 3000); $occupied = $true } catch { } finally { $probe.Dispose() }
if ($occupied) {
    $health = Invoke-RestMethod 'http://127.0.0.1:3000/demo/health' -TimeoutSec 5
    if ($health.mode -ne 'pradea-local-demo') { throw 'Port 3000 dipakai backend lain. Demo tidak dijalankan.' }
} else {
    $logs = Join-Path $project '.local-tools\logs'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $entry = Join-Path $project 'scripts\demo-api.cjs'
    $server = Start-Process -FilePath $runtime -ArgumentList ('"' + $entry + '"') -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs 'demo.log') -RedirectStandardError (Join-Path $logs 'demo-error.log') -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        if ($server.HasExited) { throw 'Demo gagal. Periksa .local-tools\logs\demo-error.log.' }
        try {
            $health = Invoke-RestMethod 'http://127.0.0.1:3000/demo/health' -TimeoutSec 2
            if ($health.mode -eq 'pradea-local-demo') { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'Demo belum siap.' }
    @{ pid = $server.Id; started = $server.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
}
& (Join-Path $PSScriptRoot 'start-pradea.ps1') -NoBrowser:$NoBrowser
Write-Host 'DEMO AKTIF. Data contoh, tidak terhubung medsos. Stop-Demo.cmd untuk kembali ke backend asli.'
