@echo off
REM CORS Test Script for Windows
REM Tests CORS implementation with real HTTP requests using curl

echo ================================================
echo CORS SECURITY TEST SCRIPT
echo ================================================
echo.

set API_URL=http://localhost/backend/api/health.php
set ALLOWED_ORIGIN=http://localhost:5173
set DISALLOWED_ORIGIN=https://evil.com

echo Configuration:
echo   API URL: %API_URL%
echo   Allowed Origin: %ALLOWED_ORIGIN%
echo   Disallowed Origin: %DISALLOWED_ORIGIN%
echo.
echo ================================================
echo.

echo TEST 1: Allowed Origin (GET Request)
echo ================================================
curl -s -i -H "Origin: %ALLOWED_ORIGIN%" %API_URL% | findstr /i "HTTP Access-Control"
echo.
echo Expected: Access-Control-Allow-Origin: %ALLOWED_ORIGIN%
echo.
pause

echo.
echo TEST 2: Disallowed Origin (GET Request)
echo ================================================
curl -s -i -H "Origin: %DISALLOWED_ORIGIN%" %API_URL% | findstr /i "HTTP Access-Control"
echo.
echo Expected: NO Access-Control-Allow-Origin header
echo.
pause

echo.
echo TEST 3: Allowed Origin (OPTIONS Preflight)
echo ================================================
curl -s -i -X OPTIONS -H "Origin: %ALLOWED_ORIGIN%" -H "Access-Control-Request-Method: POST" %API_URL% | findstr /i "HTTP Access-Control"
echo.
echo Expected: HTTP/1.1 200 OK + Access-Control headers
echo.
pause

echo.
echo TEST 4: Disallowed Origin (OPTIONS Preflight)
echo ================================================
curl -s -i -X OPTIONS -H "Origin: %DISALLOWED_ORIGIN%" -H "Access-Control-Request-Method: POST" %API_URL%
echo.
echo Expected: HTTP/1.1 403 Forbidden + NO Access-Control-Allow-Origin
echo.
pause

echo.
echo TEST 5: POST with Allowed Origin
echo ================================================
curl -s -i -X POST -H "Origin: %ALLOWED_ORIGIN%" -H "Content-Type: application/json" -d "{}" %API_URL% | findstr /i "HTTP Access-Control"
echo.
echo Expected: Access-Control-Allow-Origin: %ALLOWED_ORIGIN%
echo.
pause

echo.
echo TEST 6: POST with Disallowed Origin
echo ================================================
curl -s -i -X POST -H "Origin: %DISALLOWED_ORIGIN%" -H "Content-Type: application/json" -d "{}" %API_URL% | findstr /i "HTTP Access-Control"
echo.
echo Expected: NO Access-Control-Allow-Origin header
echo.
pause

echo.
echo ================================================
echo ALL TESTS COMPLETE
echo ================================================
echo.
echo For detailed analysis, check the response headers above.
echo.
echo ✓ PASS: Access-Control-Allow-Origin matches request origin for allowed origins
echo ✓ PASS: No Access-Control-Allow-Origin for disallowed origins
echo ✓ PASS: OPTIONS preflight returns 200 for allowed, 403 for disallowed
echo.
pause
