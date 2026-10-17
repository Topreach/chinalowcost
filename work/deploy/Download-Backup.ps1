param([string]$ServerHost='173.249.34.3',[int]$Port=2222,[string]$User='root',[string]$Destination=(Join-Path $PSScriptRoot '..\..\..\private-backups'))
$ErrorActionPreference='Stop'
$remoteUser = "$User@$ServerHost"
$latestName = (& ssh -p $Port $remoteUser 'cat /opt/chinalowcost/data/backups/latest-encrypted.txt').Trim()
if ($LASTEXITCODE -ne 0 -or $latestName -notmatch '^backup-[0-9TZ-]+\.clcb$') { throw 'A valid encrypted backup is not available' }
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
& scp -P $Port ("{0}:/opt/chinalowcost/data/backups/{1}" -f $remoteUser,$latestName) $Destination
if ($LASTEXITCODE -ne 0) { throw 'Backup download failed' }
Write-Output ('Encrypted backup downloaded to '+(Join-Path $Destination $latestName))
