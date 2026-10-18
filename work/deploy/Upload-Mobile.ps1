param([string]$Server = '173.249.34.3', [int]$Port = 2222)
$ErrorActionPreference = 'Stop'
$mobileWorkspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$mobileApk = Join-Path $mobileWorkspace 'mobile\artifacts\ChinaLowCost-0.1.0-brand-debug.apk'
if (-not (Test-Path -LiteralPath $mobileApk -PathType Leaf)) { throw "Build the Android APK first: $mobileApk" }
Write-Host 'Uploading the Android test APK. This does not deploy backend source or change the database.'
Write-Host ('SHA256: ' + (Get-FileHash -LiteralPath $mobileApk -Algorithm SHA256).Hash.ToLowerInvariant())
& scp -P $Port $mobileApk "root@${Server}:/root/chinalowcost-mobile.apk"
if ($LASTEXITCODE -ne 0) { throw 'APK upload failed; no server installation attempted.' }
Write-Host 'Uploaded to /root/chinalowcost-mobile.apk. Follow mobile/Server-Download.md to install it.'
