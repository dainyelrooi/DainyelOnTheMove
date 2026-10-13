[CmdletBinding()]
param(
  [string]$Reason = 'Manual pre-change snapshot'
)

$ErrorActionPreference = 'Stop'
$siteRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backupRoot = Join-Path (Split-Path -Path $siteRoot -Parent) 'backups'
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$destination = Join-Path $backupRoot ("website_" + $stamp)

New-Item -ItemType Directory -Path $destination -Force | Out-Null
& robocopy $siteRoot $destination /E /XD .git .firebase node_modules private /XF firebase-debug.log /NFL /NDL /NJH /NJS /NP | Out-Null
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -gt 7) {
  throw "Backup failed with Robocopy exit code $robocopyExit."
}

$commit = (& git -C $siteRoot rev-parse --short HEAD 2>$null).Trim()
@(
  "Created: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
  "Source commit: $commit"
  "Reason: $Reason"
  "Contents: complete website source excluding Git metadata, Firebase cache, dependencies and private notes"
) | Set-Content -LiteralPath (Join-Path $destination 'backup-info.txt') -Encoding utf8

Write-Output "Backup created: $destination"
