@echo off
REM PHP CodeSniffer wrapper for Windows
REM Usage: lint.bat [api|includes|all]

SET PHP_PATH=E:\XAMP\php\php.exe
SET PHPCS_PATH=%~dp0vendor\bin\phpcs

IF "%1"=="" (
    echo Running PHP CodeSniffer on api and includes...
    "%PHP_PATH%" "%PHPCS_PATH%" api includes --standard=PSR12 --report=summary
) ELSE IF "%1"=="all" (
    echo Running full PHP CodeSniffer report...
    "%PHP_PATH%" "%PHPCS_PATH%" api includes --standard=PSR12 --report=full
) ELSE IF "%1"=="fix" (
    echo Running PHP Code Beautifier to fix issues...
    "%PHP_PATH%" "%~dp0vendor\bin\phpcbf" api includes --standard=PSR12
) ELSE (
    echo Running PHP CodeSniffer on %1...
    "%PHP_PATH%" "%PHPCS_PATH%" %1 --standard=PSR12 --report=summary
)
