$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$env:PATH = "$cargoBin;$userPath;$machinePath"

Set-Location $PSScriptRoot\..
npx tauri icon .\src-tauri\app-icon.svg --output .\src-tauri\icons