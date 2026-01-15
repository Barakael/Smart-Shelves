@echo off
cd /d "%~dp0"

REM Initialize database on first launch
call init-database.bat

REM Start the server
php artisan serve --host=127.0.0.1 --port=8765 --no-reload
