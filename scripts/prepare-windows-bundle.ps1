[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string]$File,

    [string]$Version = "",

    [string]$RcloneRemote = "r2",

    [string]$Bucket = "release",

    [string]$PublicBaseUrl = "https://latexsnipper.interknot.dpdns.org/dl",

    [string]$Label = "Windows 一键整合包",

    [string]$Requirements = "Windows 10 / 11，x86_64，已包含本地模型和必要运行环境",

    [string]$Owner = "SakuraMathcraft · 单独上传的 Windows 整合发布",

    [string]$DownloadText = "下载 Windows 一键整合包",

    [switch]$Upload,

    [switch]$MetadataOnly
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$fileItem = Get-Item -LiteralPath $File
$fileName = $fileItem.Name
$fullPath = $fileItem.FullName

$RcloneRemote = $RcloneRemote.TrimEnd([char]':')
$Bucket = $Bucket -replace '^/+|/+$', ''
$PublicBaseUrl = $PublicBaseUrl.TrimEnd([char]'/')

if ([string]::IsNullOrWhiteSpace($RcloneRemote)) {
    throw "RcloneRemote cannot be empty. Run 'rclone listremotes' to find the configured remote name."
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
    throw "Bucket cannot be empty."
}

if ([string]::IsNullOrWhiteSpace($PublicBaseUrl)) {
    throw "PublicBaseUrl cannot be empty."
}

[Uri]$publicBaseUri = $null
if (
    -not [Uri]::TryCreate($PublicBaseUrl, [UriKind]::Absolute, [ref]$publicBaseUri) -or
    $publicBaseUri.Scheme -ne [Uri]::UriSchemeHttps -or
    -not [string]::IsNullOrEmpty($publicBaseUri.Query) -or
    -not [string]::IsNullOrEmpty($publicBaseUri.Fragment)
) {
    throw "PublicBaseUrl must be an absolute HTTPS URL without a query or fragment: $PublicBaseUrl"
}
$PublicBaseUrl = $publicBaseUri.AbsoluteUri.TrimEnd([char]'/')

$displayFields = [ordered]@{
    Label = $Label
    Requirements = $Requirements
    Owner = $Owner
    DownloadText = $DownloadText
}
foreach ($field in $displayFields.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace([string]$field.Value)) {
        throw "$($field.Key) cannot be empty."
    }
}
$Label = $Label.Trim()
$Requirements = $Requirements.Trim()
$Owner = $Owner.Trim()
$DownloadText = $DownloadText.Trim()

if ($MetadataOnly -and -not $Upload) {
    throw "-MetadataOnly requires -Upload. Omit both switches to generate metadata without uploading."
}

if ($fileName -notmatch '^[A-Za-z0-9._-]+$') {
    throw "The file name may contain only ASCII letters, numbers, dots, hyphens, and underscores: $fileName"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $versionMatch = [regex]::Match($fileItem.BaseName, '(?<!\d)(?<version>\d+\.\d+\.\d+)(?!\d)')
    if ($versionMatch.Success) {
        $Version = $versionMatch.Groups['version'].Value
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "Unable to infer a stable bundle version from the file name. Pass -Version, for example: -Version 2.6.0"
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
    label = $Label
    requirements = $Requirements
    owner = $Owner
    downloadText = $DownloadText
    href = "/dl/$fileName"
    publicUrl = "$PublicBaseUrl/$fileName"
    sha256 = $hash
    size = $size
    publishedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$metadataPath = Join-Path (Split-Path -Parent $fullPath) "windows-bundle.json"
$json = $metadata | ConvertTo-Json -Depth 5
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
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
Write-Host "Public URL: $PublicBaseUrl/$fileName"

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

    function Assert-RemoteObjectSize {
        param(
            [Parameter(Mandatory = $true)]
            [string]$RemotePath,

            [Parameter(Mandatory = $true)]
            [long]$ExpectedSize,

            [Parameter(Mandatory = $true)]
            [string]$Description
        )

        $statOutput = @(& $rclone.Source lsjson $RemotePath --stat 2>&1)
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to verify $Description at '$RemotePath'. rclone exited with code $LASTEXITCODE."
        }

        try {
            $remoteStat = (($statOutput | ForEach-Object { [string]$_ }) -join [Environment]::NewLine) | ConvertFrom-Json
        }
        catch {
            throw "Unable to parse the remote verification response for $Description at '$RemotePath'."
        }

        if ($null -eq $remoteStat.Size -or [long]$remoteStat.Size -ne $ExpectedSize) {
            $actualSize = if ($null -eq $remoteStat.Size) { "unknown" } else { [string]$remoteStat.Size }
            throw "Remote $Description size mismatch at '$RemotePath'. Expected $ExpectedSize bytes, got $actualSize."
        }

        Write-Host "Verified remote ${Description}: $RemotePath ($ExpectedSize bytes)"
    }

    $packageTarget = "${RcloneRemote}:$Bucket/$fileName"
    if (-not $MetadataOnly) {
        Write-Host "Uploading bundle to $packageTarget"
        & $rclone.Source copyto $fullPath $packageTarget --progress --s3-no-check-bucket
        if ($LASTEXITCODE -ne 0) {
            throw "Bundle upload failed with rclone exit code $LASTEXITCODE"
        }
    }
    else {
        Write-Host "Metadata-only mode: verifying the existing bundle before publishing metadata."
    }

    Assert-RemoteObjectSize -RemotePath $packageTarget -ExpectedSize $fileItem.Length -Description "bundle"

    $metadataTarget = "${RcloneRemote}:$Bucket/windows-bundle.json"
    Write-Host "Uploading metadata to $metadataTarget"
    & $rclone.Source copyto $metadataPath $metadataTarget --progress --s3-no-check-bucket
    if ($LASTEXITCODE -ne 0) {
        throw "Metadata upload failed with rclone exit code $LASTEXITCODE"
    }

    $metadataBytes = (Get-Item -LiteralPath $metadataPath).Length
    Assert-RemoteObjectSize -RemotePath $metadataTarget -ExpectedSize $metadataBytes -Description "metadata"

    Write-Host "Upload completed. The website should show the bundle within about five minutes."
}
else {
    Write-Host "Nothing was uploaded. Upload both files to the root of R2 bucket '$Bucket':"
    Write-Host "  1. $fullPath"
    Write-Host "  2. $metadataPath as windows-bundle.json"
    Write-Host "Or run this script again with -Upload after rclone is configured."
}

Write-Host "Bundle URL: $PublicBaseUrl/$fileName"
Write-Host "Metadata URL: $PublicBaseUrl/windows-bundle.json"
