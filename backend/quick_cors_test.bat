@echo off
echo ================================================
echo Quick CORS Test
echo ================================================
echo.
echo Testing CORS implementation...
echo.
echo Note: If curl is not available, install it or use the browser test:
echo   http://localhost/backend/test_cors_manual.html
echo.
echo ================================================
echo.

REM Try to find curl
where curl.exe >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo curl.exe not found in PATH
    echo.
    echo Alternative: Open browser to:
    echo   http://localhost/backend/api/cors_test.php
    echo.
    echo To test manually:
    echo 1. Open browser DevTools (F12)
    echo 2. Go to Console tab
    echo 3. Run this JavaScript:
    echo.
    echo fetch('http://localhost/backend/api/cors_test.php', {
    echo   method: 'GET',
    echo   credentials: 'include'
    echo }).then(r => r.json()).then(d => console.log(d))
    echo.
    pause
    exit /b
)

echo TEST 1: Allowed Origin
echo ------------------------
curl.exe -s -i -H "Origin: http://localhost:5173" http://localhost/backend/api/cors_test.php | findstr /i "HTTP Access-Control"
echo.
echo.

echo TEST 2: Disallowed Origin
echo ------------------------
curl.exe -s -i -H "Origin: https://evil.com" http://localhost/backend/api/cors_test.php | findstr /i "HTTP Access-Control"
echo.
echo (Should show NO Access-Control-Allow-Origin header)
echo.
echo.

echo TEST 3: OPTIONS Preflight (Allowed)
echo ------------------------
curl.exe -s -i -X OPTIONS -H "Origin: http://localhost:5173" http://localhost/backend/api/cors_test.php | findstr /i "HTTP/1 Access-Control"
echo.
echo.

echo TEST 4: OPTIONS Preflight (Disallowed - SHOULD RETURN 403)
echo ------------------------
curl.exe -s -i -X OPTIONS -H "Origin: https://evil.com" http://localhost/backend/api/cors_test.php
echo.
echo (Should show 403 Forbidden with NO CORS headers)
echo.
echo.

echo ================================================
echo Tests complete!
echo For detailed testing, use:
echo   http://localhost/backend/test_cors_manual.html
echo ================================================
pause
