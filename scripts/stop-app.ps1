$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project '.local-tools\node\node.exe'
foreach ($role in @('orchestrator', 'backend')) {
    $statePath = Join-Path $project ".local-tools\$role-session.json"
    if (-not (Test-Path -LiteralPath $statePath)) { continue }
    $saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $server = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
    if ($server) {
        if ($server.Path -ne $runtime -or ($server.StartTime.ToUniversalTime().Ticks -ne ([datetime]$saved.started).ToUniversalTime().Ticks)) { throw "Identitas proses $role berubah; proses lain tidak dihentikan." }
        Stop-Process -Id $server.Id
        if (-not $server.WaitForExit(5000)) { throw "$role belum berhenti." }
    }
    Remove-Item -LiteralPath $statePath
    Write-Host "$role dihentikan."
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'stop-pradea.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host 'Aplikasi berhenti. Container, database, dan konfigurasi tetap tersimpan.'

