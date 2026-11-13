$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$stateFile = Join-Path $project '.local-tools\frontend-session.json'
if (-not (Test-Path -LiteralPath $stateFile)) { Write-Host 'Tidak ada sesi Pradea dari launcher ini.'; exit 0 }
$saved = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
$server = Get-Process -Id $saved.pid -ErrorAction SilentlyContinue
if ($server) {
    $expected = [IO.Path]::GetFullPath((Join-Path $project '.local-tools\node\node.exe'))
    if ($server.Path -ne $expected -or ($server.StartTime.ToUniversalTime().Ticks -ne ([datetime]$saved.started).ToUniversalTime().Ticks)) {
        throw 'Identitas proses berubah. Tidak menghentikan proses lain.'
    }
    Stop-Process -Id $server.Id
    if (-not $server.WaitForExit(5000)) { throw 'Frontend belum berhenti. Coba lagi setelah beberapa detik.' }
}
Remove-Item -LiteralPath $stateFile
Write-Host 'Frontend Pradea dihentikan. Data dan database tetap tersimpan.'

