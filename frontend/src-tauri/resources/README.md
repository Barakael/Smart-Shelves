# Smart Shelves - Portable Desktop Application

## 📦 What's Included

This is a **fully self-contained** desktop application that includes:

- ✅ Complete frontend (React + Tauri)
- ✅ Complete backend (Laravel PHP)
- ✅ SQLite database with auto-initialization
- ✅ All migrations and seeders pre-configured
- ✅ Zero manual setup required

## 🚀 First Launch

When you run Smart Shelves for the first time:

1. **Automatic database creation** - A fresh SQLite database is created
2. **Auto-migration** - All database tables are created automatically
3. **Auto-seeding** - Sample data is populated:
   - Default admin account: `admin` / `12341234Q`
   - Default operator account: `operator` / `12341234Q`
   - Pre-configured rooms, panels, cabinets, and shelves

The entire initialization happens in the background. Just wait a few seconds after launch!

## 💻 System Requirements

### Required:
- **PHP 8.1 or higher** must be installed and accessible via command line
  - macOS: `brew install php`
  - Windows: Download from [php.net](https://www.php.net/downloads)
  - Linux: `sudo apt install php8.1-cli php8.1-sqlite3`

### Included:
- All PHP dependencies (Laravel + packages)
- SQLite database engine
- Complete application code

## 🔧 How It Works

1. **Launch the app** - Double-click the Smart Shelves icon
2. **Background startup**:
   - PHP development server starts automatically on `http://127.0.0.1:8765`
   - Database initialization runs (only first time)
   - Frontend connects to local backend
3. **Use the app** - Everything works offline!

## 📁 Data Location

All application data is stored inside the app bundle:
- **Database**: `[App Resources]/php-server/database/database.sqlite`
- **Logs**: `[App Resources]/php-server/storage/logs/`
- **Cache**: `[App Resources]/php-server/storage/framework/`

## 🔐 Default Credentials

### Administrator
- Username: `admin`
- Password: `12341234Q`
- Access: Full system control

### Operator
- Username: `operator`
- Password: `12341234Q`
- Access: Assigned room management

## 🐛 Troubleshooting

### "PHP not found" error
**Solution**: Install PHP and ensure it's in your system PATH
```bash
# Test PHP installation
php -v
```

### Database doesn't initialize
**Solution**: Delete the `.initialized` marker and restart
```bash
# Navigate to app resources and remove marker
rm [App Resources]/php-server/database/.initialized
```

### Server won't start
**Solution**: Port 8765 might be in use
```bash
# Check what's using the port (macOS/Linux)
lsof -i :8765

# Kill the process using the port
kill -9 [PID]
```

## 🎯 Features

- **Offline Operation**: No internet required
- **Portable**: Copy to any machine with PHP installed
- **Self-contained**: Database and backend included
- **Auto-updates**: Database schema updates on app update

## 📞 Support

For issues or questions, check the logs:
- **macOS**: `~/Library/Logs/Smart Shelves/`
- **Windows**: `%APPDATA%/Smart Shelves/logs/`

## 🔄 Resetting the Database

To start fresh with a clean database:

1. Close the Smart Shelves app
2. Navigate to: `[App Resources]/php-server/database/`
3. Delete: `database.sqlite` and `.initialized`
4. Restart the app - database will be recreated with seeders

---

**Version**: 1.0.0  
**Build Date**: January 2026  
**Powered by**: Tauri + React + Laravel + SQLite
