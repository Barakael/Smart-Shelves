@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set PHP_BIN=%~1
if "%PHP_BIN%"=="" (
    set BUNDLED_PHP=%~dp0..\php\php.exe
    if exist "%BUNDLED_PHP%" (
        set PHP_BIN=%BUNDLED_PHP%
    ) else (
        for %%I in (php.exe) do set PHP_BIN=%%~$PATH:I
    )
)

if "%PHP_BIN%"=="" (
    echo PHP binary not found for database initialization.
    exit /b 2
)

echo Initializing Smart Shelves Database...

REM Ensure database directory exists
if not exist "database" mkdir database

REM Check if database exists and is initialized
set DB_FILE=database\database.sqlite
set INIT_MARKER=database\.initialized

if not exist "%DB_FILE%" (
    goto INITIALIZE
)

if not exist "%INIT_MARKER%" (
    goto INITIALIZE
)

echo Database already initialized
goto END

:INITIALIZE
echo Creating fresh database...

REM Remove old database if exists
if exist "%DB_FILE%" del /f /q "%DB_FILE%"

REM Create new database file
type nul > "%DB_FILE%"

echo Running migrations...
"%PHP_BIN%" artisan migrate:fresh --force
if errorlevel 1 exit /b %errorlevel%

echo Seeding database...
"%PHP_BIN%" artisan db:seed --force
if errorlevel 1 exit /b %errorlevel%

REM Mark as initialized
type nul > "%INIT_MARKER%"
echo Database initialized successfully!

:END
echo Ready to serve!
exit /b 0
