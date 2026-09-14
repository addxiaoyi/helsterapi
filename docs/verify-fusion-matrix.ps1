param(
    [string]$Path = "$PSScriptRoot\fusion-audit-matrix.md"
)

$allowed = @(
    "complete",
    "partial",
    "frontend_missing",
    "backend_missing",
    "contract_mismatch",
    "blocked_by_dependency",
    "not_applicable"
)

if (-not (Test-Path -LiteralPath $Path)) {
    throw "Audit matrix not found: $Path"
}

$rows = @()
foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\| F\d{3} \|') {
        $rows += $line
        continue
    }
    if ($rows.Count -gt 0 -and $line.Trim() -and $line -notmatch '^\| ---') {
        $rows[$rows.Count - 1] += " " + $line.Trim()
    }
}
$ids = @($rows | ForEach-Object {
    if ($_ -match '^\| (F\d{3}) \|') { $Matches[1] }
})

if ($ids.Count -ne 139) {
    throw "Expected 139 matrix rows, found $($ids.Count)"
}

$duplicates = @($ids | Group-Object | Where-Object Count -gt 1)
if ($duplicates.Count -gt 0) {
    throw "Duplicate matrix IDs: $($duplicates.Name -join ', ')"
}

if ((Get-Content -LiteralPath $Path | Select-String '待核对功能').Count -gt 0) {
    throw "Placeholder features remain in the audit matrix"
}

foreach ($row in $rows) {
    $statusMatch = [regex]::Match($row, '\|\s+(' + ($allowed -join '|') + ')\s+\|')
    if (-not $statusMatch.Success) {
        throw "Missing or invalid status in row: $row"
    }
}

Write-Output "Fusion matrix valid: $($ids.Count) unique rows"
