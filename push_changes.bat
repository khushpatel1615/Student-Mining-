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

"%GIT_PATH%" add .
"%GIT_PATH%" commit -m "chore: formatting and cleanup"
"%GIT_PATH%" push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Git command failed. Please ensure Git is installed.
) else (
    echo.
    echo DONE! Changes pushed successfully.
)

