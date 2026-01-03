@echo off
setlocal

rem Try to find git
set "GIT_PATH=git"

if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_PATH=C:\Program Files\Git\cmd\git.exe"
) else if exist "C:\Program Files\Git\bin\git.exe" (
    set "GIT_PATH=C:\Program Files\Git\bin\git.exe"
) else if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd\git.exe" (
    set "GIT_PATH=C:\Users\%USERNAME%\AppData\Local\Programs\Git\cmd\git.exe"
) else if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Git\bin\git.exe" (
    set "GIT_PATH=C:\Users\%USERNAME%\AppData\Local\Programs\Git\bin\git.exe"
)

echo Using git at: "%GIT_PATH%"

"%GIT_PATH%" checkout frontend/src/pages/Dashboard.css
"%GIT_PATH%" checkout frontend/src/pages/StudentDashboard.css

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Git command failed.
) else (
    echo.
    echo DONE! Reverted CSS files.
)
