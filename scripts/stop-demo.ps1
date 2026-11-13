$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$stateFile = Join-Path $project '.local-tools\demo-session.json'
if (-not (Test-Path -LiteralPath $stateFile)) { Write-Host 'Tidak ada sesi demo.'; exit 0 }
$saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$server = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
if ($server) {
    $expected = [IO.Path]::GetFullPath((Join-Path $project '.local-tools\node\node.exe'))
    if ($server.Path -ne $expected -or ($server.StartTime.ToUniversalTime().Ticks -ne ([datetime]$saved.started).ToUniversalTime().Ticks)) { throw 'Identitas proses berubah; proses lain tidak dihentikan.' }
    Stop-Process -Id $server.Id
    $server.WaitForExit(5000) | Out-Null
}
Remove-Item -LiteralPath $stateFile
Write-Host 'Backend demo berhenti. Frontend dan database tetap utuh.'

