@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

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
php artisan migrate:fresh --force

echo Seeding database...
php artisan db:seed --force

REM Mark as initialized
type nul > "%INIT_MARKER%"
echo Database initialized successfully!

:END
echo Ready to serve!
exit /b 0
