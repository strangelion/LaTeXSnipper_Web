[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$File,

    [string]$Version = "",

    [string]$RcloneRemote = "r2",

    [string]$Bucket = "release",

    [switch]$Upload,

    [switch]$MetadataOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Split-Path -Parent $PSScriptRoot
$fileItem = Get-Item -LiteralPath $File
$fileName = $fileItem.Name
$fullPath = $fileItem.FullName

$RcloneRemote = $RcloneRemote.TrimEnd([char]':')
$Bucket = $Bucket -replace '^/+|/+$', ''

if ([string]::IsNullOrWhiteSpace($RcloneRemote)) {
    throw "RcloneRemote cannot be empty. Run 'rclone listremotes' to find the configured remote name."
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
    throw "Bucket cannot be empty."
}

if ($fileName -notmatch '^[A-Za-z0-9._-]+$') {
    throw "The file name may contain only ASCII letters, numbers, dots, hyphens, and underscores: $fileName"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $releaseManifestPath = Join-Path $repoRoot "public/release-manifest.json"
    if (Test-Path -LiteralPath $releaseManifestPath) {
        $releaseManifest = Get-Content -LiteralPath $releaseManifestPath -Raw | ConvertFrom-Json
        $Version = [string]$releaseManifest.version
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "Unable to determine the bundle version. Pass -Version, for example: -Version 2.6.0"
}

if ($Version -notmatch '^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$') {
    throw "Version is not valid: $Version"
}

$hash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
$bytes = [double]$fileItem.Length
$culture = [System.Globalization.CultureInfo]::InvariantCulture

if ($bytes -ge 1GB) {
    $size = [string]::Format($culture, '{0:0.0} GB', ($bytes / 1GB))
}
elseif ($bytes -ge 1MB) {
    $size = [string]::Format($culture, '{0:0.0} MB', ($bytes / 1MB))
}
elseif ($bytes -ge 1KB) {
    $size = [string]::Format($culture, '{0:0.0} KB', ($bytes / 1KB))
}
else {
    $size = [string]::Format($culture, '{0:0} B', $bytes)
}

$metadata = [ordered]@{
    schemaVersion = 1
    enabled = $true
    id = "windows-x86_64-bundle"
    version = $Version
    architecture = "x86_64"
    href = "/dl/$fileName"
    sha256 = $hash
    size = $size
    publishedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$metadataPath = Join-Path (Split-Path -Parent $fullPath) "windows-bundle.json"
$json = $metadata | ConvertTo-Json -Depth 5
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText(
    $metadataPath,
    $json + [Environment]::NewLine,
    $utf8NoBom
)

Write-Host "Bundle metadata created: $metadataPath"
Write-Host "File: $fileName"
Write-Host "Version: $Version"
Write-Host "Size: $size"
Write-Host "SHA256: $hash"

if ($Upload) {
    $rclone = Get-Command rclone -ErrorAction SilentlyContinue
    if (-not $rclone) {
        throw "rclone was not found. Install it and configure a Cloudflare R2 remote first."
    }

    $remoteOutput = @(& $rclone.Source listremotes 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read rclone remotes. Run 'rclone config' and try again."
    }

    $expectedRemote = "${RcloneRemote}:"
    if (-not ($remoteOutput -contains $expectedRemote)) {
        $available = ($remoteOutput | ForEach-Object { [string]$_ }) -join ', '
        throw "rclone remote '$expectedRemote' was not found. Available remotes: $available"
    }

    if (-not $MetadataOnly) {
        $packageTarget = "${RcloneRemote}:$Bucket/$fileName"
        Write-Host "Uploading bundle to $packageTarget"
        & $rclone.Source copyto $fullPath $packageTarget --progress
        if ($LASTEXITCODE -ne 0) {
            throw "Bundle upload failed with rclone exit code $LASTEXITCODE"
        }
    }

    $metadataTarget = "${RcloneRemote}:$Bucket/windows-bundle.json"
    Write-Host "Uploading metadata to $metadataTarget"
    & $rclone.Source copyto $metadataPath $metadataTarget --progress
    if ($LASTEXITCODE -ne 0) {
        throw "Metadata upload failed with rclone exit code $LASTEXITCODE"
    }

    Write-Host "Upload completed. The website should show the bundle within about five minutes."
}
else {
    Write-Host "Nothing was uploaded. Upload both files to the root of R2 bucket '$Bucket':"
    Write-Host "  1. $fullPath"
    Write-Host "  2. $metadataPath as windows-bundle.json"
    Write-Host "Or run this script again with -Upload after rclone is configured."
}

Write-Host "Bundle URL: https://latexsnipper.interknot.dpdns.org/dl/$fileName"
Write-Host "Metadata URL: https://latexsnipper.interknot.dpdns.org/dl/windows-bundle.json"
