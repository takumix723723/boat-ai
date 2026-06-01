# 競艇AIアナリスト - 開発サーバー一括起動
# 使い方: .\scripts\start-dev.ps1

$nodeDir = "${env:ProgramFiles}\nodejs"
if (-not (Test-Path "$nodeDir\npm.cmd")) {
  Write-Error "Node.js が見つかりません。https://nodejs.org/ から LTS をインストールしてください。"
  exit 1
}

$env:Path = "$nodeDir;$env:Path"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "Backend:  http://localhost:3001"
Write-Host "Frontend: http://localhost:5173"
Write-Host ""

Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$root\backend'; `$env:Path='$nodeDir;' + `$env:Path; npm run dev"
)
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  "Set-Location '$root\frontend'; `$env:Path='$nodeDir;' + `$env:Path; npm run dev"
)
