# Simple CORS Verification Script
Write-Host "================================================"
Write-Host "CORS SECURITY VERIFICATION"
Write-Host "================================================"
Write-Host ""

$baseUrl = "http://localhost/backend/api/cors_test.php"

Write-Host "Testing $baseUrl ..."
Write-Host ""

# Test 1: Allowed Origin
Write-Host "TEST 1: Allowed Origin" -ForegroundColor Cyan
try {
    $headers = @{"Origin" = "http://localhost:5173"}
    $resp = Invoke-WebRequest -Uri $baseUrl -Headers $headers -UseBasicParsing
    $cors = $resp.Headers["Access-Control-Allow-Origin"]
    Write-Host "  Status: $($resp.StatusCode)"
    Write-Host "  CORS Header: $cors"
    if ($cors -eq "http://localhost:5173") {
        Write-Host "  Result: PASS" -ForegroundColor Green
    } else {
        Write-Host "  Result: FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Disallowed Origin
Write-Host "TEST 2: Disallowed Origin" -ForegroundColor Cyan
try {
    $headers = @{"Origin" = "https://evil.com"}
    $resp = Invoke-WebRequest -Uri $baseUrl -Headers $headers -UseBasicParsing
    $cors = $resp.Headers["Access-Control-Allow-Origin"]
    Write-Host "  Status: $($resp.StatusCode)"
    if ([string]::IsNullOrEmpty($cors)) {
        Write-Host "  CORS Header: (not set)"
        Write-Host "  Result: PASS" -ForegroundColor Green
    } else {
        Write-Host "  CORS Header: $cors"
        Write-Host "  Result: FAIL - should not have CORS header" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Preflight Disallowed (Critical)
Write-Host "TEST 3: Preflight Disallowed (CRITICAL)" -ForegroundColor Cyan
try {
    $headers = @{
        "Origin" = "https://evil.com"
        "Access-Control-Request-Method" = "POST"
    }
    $resp = Invoke-WebRequest -Uri $baseUrl -Method OPTIONS -Headers $headers -UseBasicParsing
    Write-Host "  Status: $($resp.StatusCode)"
    Write-Host "  Result: FAIL - should be 403" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "  Status: 403 Forbidden"
        Write-Host "  Result: PASS" -ForegroundColor Green
    } else {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

Write-Host "================================================"
Write-Host "Done! For full tests, open in browser:"
Write-Host "  http://localhost/backend/test_cors_manual.html"
Write-Host "================================================"
