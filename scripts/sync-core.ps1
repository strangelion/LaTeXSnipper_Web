# sync-core.ps1
# 将 latexsnipper-core 子模块同步到 core.lock.json 固定的发布提交。
# 此脚本只更新本地工作树；提交与推送由维护者显式完成。

param(
    [switch]$Fetch
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path $scriptRoot -Parent
$corePath = Join-Path $repoRoot "latexsnipper-core"
$lockPath = Join-Path $repoRoot "core.lock.json"

if (-not (Test-Path -LiteralPath $lockPath)) {
    throw "Missing core.lock.json: $lockPath"
}

$lock = Get-Content -LiteralPath $lockPath -Raw | ConvertFrom-Json
$targetCommit = [string]$lock.commit
if ($targetCommit -notmatch '^[0-9a-f]{40}$') {
    throw "core.lock.json contains an invalid commit SHA: $targetCommit"
}

Write-Host "=== Sync latexsnipper-core to locked release ===" -ForegroundColor Cyan
Write-Host "  Core $($lock.coreVersion) / $($lock.releaseTag)"
Write-Host "  $targetCommit"

Push-Location $corePath
try {
    if ($Fetch) {
        Write-Host "`nFetching the locked commit from origin..." -ForegroundColor Yellow
        git fetch origin $targetCommit --quiet
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to fetch locked Core commit $targetCommit"
        }
    }

    git cat-file -e "$targetCommit^{commit}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Locked commit is unavailable locally. Re-run with -Fetch."
    }

    $before = (git rev-parse HEAD).Trim()
    if ($before -eq $targetCommit) {
        Write-Host "`nAlready at the locked release." -ForegroundColor Green
        exit 0
    }

    git checkout --detach $targetCommit --quiet
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to checkout locked Core commit $targetCommit"
    }

    Write-Host "`nUpdated local submodule:" -ForegroundColor Green
    Write-Host "  $before -> $targetCommit"
}
finally {
    Pop-Location
}

Write-Host "`nReview the change, then commit the submodule pointer explicitly." -ForegroundColor Cyan
