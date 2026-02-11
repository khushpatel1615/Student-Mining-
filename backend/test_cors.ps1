# CORS Test Script for PowerShell
# Tests CORS implementation using Invoke-WebRequest

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "CORS SECURITY TEST" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost/backend/api/cors_test.php"
$allowedOrigin = "http://localhost:5173"
$disallowedOrigin = "https://evil.com"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $baseUrl"
Write-Host "  Allowed Origin: $allowedOrigin"
Write-Host "  Disallowed Origin: $disallowedOrigin"
Write-Host ""

# Test 1: Allowed Origin (GET)
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST 1: Allowed Origin (GET Request)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Headers @{"Origin" = $allowedOrigin} -UseBasicParsing
    $allowOriginHeader = $response.Headers["Access-Control-Allow-Origin"]
    $credentialsHeader = $response.Headers["Access-Control-Allow-Credentials"]
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Access-Control-Allow-Origin: $allowOriginHeader"
    Write-Host "Access-Control-Allow-Credentials: $credentialsHeader"
    
    if ($allowOriginHeader -eq $allowedOrigin) {
        Write-Host "✓ PASS - Correct origin header" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL - Expected: $allowedOrigin, Got: $allowOriginHeader" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Disallowed Origin (GET)
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST 2: Disallowed Origin (GET Request)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Headers @{"Origin" = $disallowedOrigin} -UseBasicParsing
    $allowOriginHeader = $response.Headers["Access-Control-Allow-Origin"]
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    
    if ([string]::IsNullOrEmpty($allowOriginHeader)) {
        Write-Host "Access-Control-Allow-Origin: NOT SET" -ForegroundColor Green
        Write-Host "✓ PASS - No CORS header for disallowed origin" -ForegroundColor Green
    } else {
        Write-Host "Access-Control-Allow-Origin: $allowOriginHeader" -ForegroundColor Red
        Write-Host "✗ FAIL - Should NOT have CORS header" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 3: OPTIONS Preflight (Allowed)
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST 3: OPTIONS Preflight (Allowed Origin)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method OPTIONS -Headers @{
        "Origin" = $allowedOrigin
        "Access-Control-Request-Method" = "POST"
    } -UseBasicParsing
    
    $allowOriginHeader = $response.Headers["Access-Control-Allow-Origin"]
    $allowMethodsHeader = $response.Headers["Access-Control-Allow-Methods"]
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Access-Control-Allow-Origin: $allowOriginHeader"
    Write-Host "Access-Control-Allow-Methods: $allowMethodsHeader"
    
    if ($response.StatusCode -eq 200 -and $allowOriginHeader -eq $allowedOrigin) {
        Write-Host "✓ PASS - Preflight allowed correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL - Preflight not working correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 4: OPTIONS Preflight (Disallowed) - CRITICAL TEST
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST 4: OPTIONS Preflight (Disallowed Origin)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🔴 CRITICAL SECURITY TEST" -ForegroundColor Red
try {
    $response = Invoke-WebRequest -Uri $baseUrl -Method OPTIONS -Headers @{
        "Origin" = $disallowedOrigin
        "Access-Control-Request-Method" = "POST"
    } -UseBasicParsing
    
    $allowOriginHeader = $response.Headers["Access-Control-Allow-Origin"]
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Yellow
    
    if ([string]::IsNullOrEmpty($allowOriginHeader)) {
        Write-Host "Access-Control-Allow-Origin: NOT SET" -ForegroundColor Green
    } else {
        Write-Host "Access-Control-Allow-Origin: $allowOriginHeader" -ForegroundColor Red
    }
    
    if ($response.StatusCode -ne 200) {
        Write-Host "✗ FAIL - Expected 403, got $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    # Check if it's a 403
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "Status: 403 Forbidden" -ForegroundColor Green
        Write-Host "✓ PASS - Correctly rejected with 403" -ForegroundColor Green
    } else {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}

# Test 5: POST with Allowed Origin
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST 5: POST Request (Allowed Origin)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
try {
    $body = "{}"
    $response = Invoke-WebRequest -Uri $baseUrl -Method POST -Headers @{
        "Origin" = $allowedOrigin
        "Content-Type" = "application/json"
    } -Body $body -UseBasicParsing
    
    $allowOriginHeader = $response.Headers["Access-Control-Allow-Origin"]
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Access-Control-Allow-Origin: $allowOriginHeader"
    
    if ($allowOriginHeader -eq $allowedOrigin) {
        Write-Host "✓ PASS - POST allowed correctly" -ForegroundColor Green
    } else {
        Write-Host "✗ FAIL - Wrong origin header" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Check the results above" -ForegroundColor Green
Write-Host ""
Write-Host "Key Security Checks:" -ForegroundColor Yellow
Write-Host "  1. Allowed origins get proper CORS headers" -ForegroundColor White
Write-Host "  2. Disallowed origins get NO CORS headers" -ForegroundColor White
Write-Host "  3. OPTIONS preflight returns 200 for allowed" -ForegroundColor White
Write-Host "  4. OPTIONS preflight returns 403 for disallowed" -ForegroundColor White
Write-Host ""
Write-Host "For interactive testing, open:" -ForegroundColor Cyan
Write-Host "  http://localhost/backend/test_cors_manual.html" -ForegroundColor White
Write-Host ""
