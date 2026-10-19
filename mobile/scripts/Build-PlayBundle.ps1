param([switch]$CreateUploadKey, [switch]$IncludeTestApk)
$ErrorActionPreference = 'Stop'
$mobileRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$privateDirectory = Join-Path $mobileRoot '.signing'
$keyStore = Join-Path $privateDirectory 'chinalowcost-upload.jks'
$passwordFile = Join-Path $privateDirectory 'upload-password.txt'
$javaDirectory = 'C:\Program Files\Android\Android Studio\jbr'
if (-not (Test-Path -LiteralPath $javaDirectory)) { throw 'Android Studio Java 21 is required.' }
if ($CreateUploadKey) {
  if ((Test-Path -LiteralPath $keyStore) -or (Test-Path -LiteralPath $passwordFile)) { throw 'Signing material already exists. It will not be replaced.' }
  New-Item -ItemType Directory -Force -Path $privateDirectory | Out-Null
  $signingIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & icacls $privateDirectory /inheritance:r /grant:r "${signingIdentity}:(OI)(CI)F" | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Cannot restrict signing directory permissions.' }
  $randomBytes = New-Object byte[] 48
  $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $randomGenerator.GetBytes($randomBytes) } finally { $randomGenerator.Dispose() }
  [IO.File]::WriteAllText($passwordFile, [Convert]::ToBase64String($randomBytes), [Text.Encoding]::ASCII)
  & (Join-Path $javaDirectory 'bin\keytool.exe') -genkeypair -keystore $keyStore -storetype JKS -alias upload -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=ChinaLowCost upload key' '-storepass:file' $passwordFile '-keypass:file' $passwordFile
  if ($LASTEXITCODE -ne 0) { throw 'Upload key generation failed. Inspect the private signing directory before retrying.' }
}
if (-not (Test-Path -LiteralPath $keyStore) -or -not (Test-Path -LiteralPath $passwordFile)) { throw 'Upload signing material is missing. Run with -CreateUploadKey once, or configure signing using your existing upload key.' }
$signingVariables = @('JAVA_HOME','ANDROID_HOME','CLC_UPLOAD_STORE_FILE','CLC_UPLOAD_STORE_PASSWORD','CLC_UPLOAD_KEY_ALIAS','CLC_UPLOAD_KEY_PASSWORD')
$savedVariables = @{}
foreach ($name in $signingVariables) { $savedVariables[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
Push-Location $mobileRoot
try {
  $env:JAVA_HOME=$javaDirectory
  $env:ANDROID_HOME=Join-Path $env:LOCALAPPDATA 'Android\Sdk'
  $env:CLC_UPLOAD_STORE_FILE=$keyStore
  $env:CLC_UPLOAD_STORE_PASSWORD=[IO.File]::ReadAllText($passwordFile).Trim()
  $env:CLC_UPLOAD_KEY_ALIAS='upload'
  $env:CLC_UPLOAD_KEY_PASSWORD=$env:CLC_UPLOAD_STORE_PASSWORD
  & npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Mobile build failed.' }
  & npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw 'Android sync failed.' }
  Push-Location android
  try { $buildTasks=@('bundleRelease'); if ($IncludeTestApk) { $buildTasks+='assembleDebug' }; & .\gradlew.bat @buildTasks --no-daemon; if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' } } finally { Pop-Location }
  New-Item -ItemType Directory -Force artifacts | Out-Null
  $bundle=Join-Path $mobileRoot 'artifacts\ChinaLowCost-0.2.0-internal.aab'
  Copy-Item -LiteralPath 'android\app\build\outputs\bundle\release\app-release.aab' -Destination $bundle
  $signatureOutput=& (Join-Path $javaDirectory 'bin\jarsigner.exe') -verify $bundle
  $signatureExit=$LASTEXITCODE
  $signatureOutput | Where-Object { $_ -notmatch '^- Entry ' } | Select-Object -First 12 | ForEach-Object { Write-Host $_ }
  if ($signatureExit -ne 0) { throw 'Bundle signature verification failed.' }
  if ($IncludeTestApk) { Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination (Join-Path $mobileRoot 'artifacts\ChinaLowCost-0.2.0-debug.apk') }
  Write-Host "Signed internal-test candidate: $bundle"
  Write-Host 'This build is not approved for public release. Complete mobile/Play-Release.md first.'
} finally {
  foreach ($name in $signingVariables) { [Environment]::SetEnvironmentVariable($name, $savedVariables[$name], 'Process') }
  Pop-Location
}
