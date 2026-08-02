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

if ($fileName -notmatch '^[A-Za-z0-9._-]+$') {
    throw "文件名只能包含英文字母、数字、点、短横线和下划线。请先重命名：$fileName"
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    $releaseManifestPath = Join-Path $repoRoot "public/release-manifest.json"
    if (Test-Path -LiteralPath $releaseManifestPath) {
        $releaseManifest = Get-Content -LiteralPath $releaseManifestPath -Raw | ConvertFrom-Json
        $Version = [string]$releaseManifest.version
    }
}

if ([string]::IsNullOrWhiteSpace($Version)) {
    throw "未能确定整合包版本。请使用 -Version 指定，例如 -Version 2.6.0。"
}

$hash = (Get-FileHash -LiteralPath $fullPath -Algorithm SHA256).Hash.ToLowerInvariant()
$bytes = [double]$fileItem.Length
$culture = [System.Globalization.CultureInfo]::InvariantCulture

if ($bytes -ge 1GB) {
    $size = [string]::Format($culture, "{0:0.0} GB", $bytes / 1GB)
}
elseif ($bytes -ge 1MB) {
    $size = [string]::Format($culture, "{0:0.0} MB", $bytes / 1MB)
}
elseif ($bytes -ge 1KB) {
    $size = [string]::Format($culture, "{0:0.0} KB", $bytes / 1KB)
}
else {
    $size = [string]::Format($culture, "{0:0} B", $bytes)
}

$metadata = [ordered]@{
    schemaVersion = 1
    enabled = $true
    id = "windows-x86_64-bundle"
    label = "Windows 一键整合包（含模型）"
    version = $Version
    architecture = "x86_64"
    requirements = "Windows 10 / 11，x86_64，已包含本地模型和必要运行环境，无需另外下载模型"
    owner = "SakuraMathcraft 提供 · 本站 R2 托管 · GPL-3.0"
    downloadText = "下载 Windows 一键整合包"
    href = "/dl/$fileName"
    sha256 = $hash
    size = $size
    publishedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$metadataPath = Join-Path (Split-Path -Parent $fullPath) "windows-bundle.json"
$json = $metadata | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText(
    $metadataPath,
    $json + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "已生成整合包元数据：$metadataPath"
Write-Host "文件名：$fileName"
Write-Host "版本：$Version"
Write-Host "大小：$size"
Write-Host "SHA256：$hash"

if ($Upload) {
    $rclone = Get-Command rclone -ErrorAction SilentlyContinue
    if (-not $rclone) {
        throw "未找到 rclone。大型整合包建议使用 rclone 上传到 Cloudflare R2。"
    }

    if (-not $MetadataOnly) {
        $packageTarget = "${RcloneRemote}:$Bucket/$fileName"
        Write-Host "正在上传整合包到 $packageTarget"
        & $rclone.Source copyto $fullPath $packageTarget --progress
        if ($LASTEXITCODE -ne 0) {
            throw "整合包上传失败，rclone 退出码：$LASTEXITCODE"
        }
    }

    $metadataTarget = "${RcloneRemote}:$Bucket/windows-bundle.json"
    Write-Host "正在上传元数据到 $metadataTarget"
    & $rclone.Source copyto $metadataPath $metadataTarget --progress
    if ($LASTEXITCODE -ne 0) {
        throw "元数据上传失败，rclone 退出码：$LASTEXITCODE"
    }

    Write-Host "上传完成。网页会在最多约 5 分钟内显示整合包卡片。"
}
else {
    Write-Host "尚未上传。请将以下两个文件上传到 R2 Bucket '$Bucket' 的根目录："
    Write-Host "  1. $fullPath"
    Write-Host "  2. $metadataPath（对象名必须为 windows-bundle.json）"
    Write-Host "也可以重新运行并添加 -Upload，由已配置的 rclone 自动上传。"
}

Write-Host "整合包地址：https://latexsnipper.interknot.dpdns.org/dl/$fileName"
Write-Host "元数据地址：https://latexsnipper.interknot.dpdns.org/dl/windows-bundle.json"
