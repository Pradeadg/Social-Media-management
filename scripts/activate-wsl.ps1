$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$logFolder = Join-Path $project '.local-tools\logs'
New-Item -ItemType Directory -Path $logFolder -Force | Out-Null
$reportPath = Join-Path $logFolder 'wsl-setup.json'
$isAdmin = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw 'Administrator diperlukan. Jalankan Aktifkan-WSL.cmd dengan Run as administrator.'
}
$report = [ordered]@{ time = (Get-Date).ToString('o'); complete = $false; restartNeeded = $false; features = @(); error = $null }
try {
    foreach ($name in @('Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform')) {
        $before = (Get-WindowsOptionalFeature -Online -FeatureName $name).State.ToString()
        if ($before -ne 'Enabled' -and $before -ne 'EnablePending') {
            $result = Enable-WindowsOptionalFeature -Online -FeatureName $name -All -NoRestart
            if ($result.RestartNeeded) { $report.restartNeeded = $true }
        }
        $after = (Get-WindowsOptionalFeature -Online -FeatureName $name).State.ToString()
        if ($after -eq 'EnablePending') { $report.restartNeeded = $true }
        $report.features += @{ name = $name; before = $before; after = $after }
        $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding UTF8
    }
    $report.complete = $true
} catch {
    $report.error = $_.Exception.Message
} finally {
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding UTF8
}
if ($report.error) { Write-Error $report.error; exit 1 }
Write-Host 'Pemeriksaan/aktivasi fitur WSL selesai. Tidak melakukan restart otomatis.'
Write-Host "Restart diperlukan: $($report.restartNeeded)"
