@echo off
cd /d "%~dp0"

set PHP_BIN=
set BUNDLED_PHP=%~dp0..\php\php.exe
if exist "%BUNDLED_PHP%" (
    set PHP_BIN=%BUNDLED_PHP%
) else (
    for %%I in (php.exe) do set PHP_BIN=%%~$PATH:I
)

if "%PHP_BIN%"=="" (
    echo PHP binary not found. Install PHP or bundle runtime at resources\php\php.exe
    exit /b 2
)

REM Initialize database on first launch
call init-database.bat "%PHP_BIN%"
if errorlevel 1 exit /b %errorlevel%

REM Start the server
"%PHP_BIN%" -S 127.0.0.1:8765 -t "%~dp0public" "%~dp0public\index.php"
