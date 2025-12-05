# Smart Shelves Desktop Application

A beautifully designed cross-platform desktop application for managing electronic shelves, built with React, Laravel, and Tauri.

## Features

- 🎨 **Modern UI Design**: Purple-themed interface with gradient effects and smooth animations
- 🌓 **Light/Dark Mode**: Seamless theme switching with purple color schemes
- 🔐 **Role-Based Access Control**: Admin and Operator roles with different permissions
- 📦 **Shelves Management**: Configure IP addresses, rows, columns, and controllers
- 🏠 **Room Management**: Organize shelves by rooms (Admin only)
- ⚡ **Smooth Animations**: Framer Motion powered transitions
- 🖥️ **Cross-Platform**: Windows and macOS support via Tauri

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Zustand
- Axios
- Tauri

### Backend
- Laravel 10
- Laravel Sanctum (Authentication)
- MySQL

## Project Structure

```
Smart-shelves/
├── frontend/          # React + Tauri application
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── ...
│   └── src-tauri/     # Tauri Rust code
└── backend/           # Laravel API
    ├── app/
    ├── database/
    └── routes/
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PHP 8.1+ and Composer
- MySQL
- Rust (for Tauri) - Install from [rustup.rs](https://rustup.rs/)

### Installation

1. **Clone the repository** (if applicable)

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   composer install
   ```

4. **Setup Backend Environment**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

5. **Configure Database**
   - Update `backend/.env` with your database credentials
   - Run migrations and seeders:
     ```bash
     php artisan migrate --seed
     ```

6. **Start Backend Server**
   ```bash
   php artisan serve
   ```
   The API will be available at `http://localhost:8000`

7. **Start Frontend Development**
   ```bash
   cd frontend
   npm run tauri:dev
   ```

### Default Login Credentials

After running the seeder, you can login with:

**Admin:**
- Email: `admin@smartshelves.com`
- Password: `password`

**Operator:**
- Email: `operator@smartshelves.com`
- Password: `password`

## Building for Production

### Frontend (Tauri)
```bash
cd frontend
npm run tauri:build
```

The built application will be in `frontend/src-tauri/target/release/`

### Backend
Deploy the Laravel backend to your preferred hosting service following standard Laravel deployment practices.

## Features Overview

### Admin Role
- Full access to all shelves
- Manage all rooms
- Create, edit, and delete shelves and rooms
- View all system statistics

### Operator Role
- Access only to assigned rooms
- Manage shelves within assigned rooms
- View limited statistics

## Development

### Frontend Development
- Hot reload is enabled during development
- Tauri dev mode runs the React app with Tauri bindings

### Backend Development
- API endpoints are prefixed with `/api`
- Sanctum handles authentication
- CORS is configured for Tauri and localhost

## License

MIT

