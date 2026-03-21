#Requires -Version 5.1
# Push infra/aws/vercel-aws.env to Vercel production (stdin per line; handles = in values)
$ErrorActionPreference = "Continue"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root
$EnvFile = Join-Path $PSScriptRoot "vercel-aws.env"
if (-not (Test-Path $EnvFile)) { Write-Error "Missing $EnvFile"; exit 1 }

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { return }
  $name = $line.Substring(0, $idx).Trim()
  $value = $line.Substring($idx + 1).Trim().Trim([char]0xFEFF)
  $sensitive = $false
  if ($name -match 'SECRET|ACCESS_KEY|PASSWORD|TOKEN' -and $name -ne 'NODE_ENV') { $sensitive = $true }
  Write-Host "Adding $name ..."
  if ($sensitive) {
    & vercel env add $name production --value "$value" --sensitive --yes --force 2>&1
  } else {
    & vercel env add $name production --value "$value" --yes --force 2>&1
  }
  Start-Sleep -Milliseconds 400
}
Write-Host "Done."
