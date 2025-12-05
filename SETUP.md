# Setup Guide

## Quick Start

### 1. Backend Setup

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

**Configure Database in `.env`:**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smart_shelves
DB_USERNAME=root
DB_PASSWORD=your_password
```

**Run Migrations and Seeders:**
```bash
php artisan migrate --seed
```

**Start the Server:**
```bash
php artisan serve
```

The API will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Create `.env` file:**
```env
VITE_API_URL=http://localhost:8000/api
```

**Start Development:**
```bash
npm run tauri:dev
```

### 3. Default Login Credentials

After running the seeder:

**Admin:**
- Email: `admin@smartshelves.com`
- Password: `password`

**Operator:**
- Email: `operator@smartshelves.com`
- Password: `password`

## Prerequisites

- **Node.js** 18+ and npm
- **PHP** 8.1+ and Composer
- **MySQL** database
- **Rust** (for Tauri) - Install from [rustup.rs](https://rustup.rs/)

### Installing Rust (for Tauri)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal or run:
```bash
source $HOME/.cargo/env
```

## Building for Production

### Frontend
```bash
cd frontend
npm run tauri:build
```

The built application will be in:
- macOS: `frontend/src-tauri/target/release/bundle/macos/`
- Windows: `frontend/src-tauri/target/release/bundle/msi/`

### Backend
Deploy following standard Laravel deployment practices.

## Troubleshooting

### Tauri Build Issues
- Ensure Rust is properly installed: `rustc --version`
- On macOS, you may need Xcode Command Line Tools: `xcode-select --install`
- On Windows, ensure you have Visual Studio Build Tools

### Laravel Issues
- Ensure PHP extensions are installed: `php -m`
- Check database connection: `php artisan migrate:status`
- Clear cache: `php artisan config:clear`

### Frontend Issues
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

