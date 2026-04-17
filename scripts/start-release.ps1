$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$exePath = Join-Path $root "src-tauri\target\release\perch-tasks.exe"

if (-not (Test-Path $exePath)) {
  Write-Error "Release executable not found at $exePath. Run 'npm run app:build' first."
  exit 1
}

Start-Process -FilePath $exePath