#!/bin/bash
cd "$(dirname "$0")"
php artisan serve --host=127.0.0.1 --port=8765 --no-reload
