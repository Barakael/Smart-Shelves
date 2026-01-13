# TCP/IP Cabinet Controller - Quick Start Guide

## 30-Second Overview

This system controls up to 10 smart cabinets over TCP/IP:
- **Open Command**: Frontend → Backend → TCP Hex Packet → Cabinet
- **Close Notification**: Cabinet → TCP Notification → Listener → WebSocket → Frontend UI
- **Config**: IP, port, function byte, checksum offset per cabinet

## Installation

### 1. Backend Setup

```bash
cd backend

# Install dependencies (if needed)
composer install

# Run migrations
php artisan migrate

# Clear cache
php artisan cache:clear
php artisan config:clear
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies (if needed)
npm install

# Build
npm run build

# Start dev server
npm run dev
```

### 3. Start Listener (Terminal 1)

```bash
cd backend
php artisan cabinet:listen
```

You should see:
```
Cabinet Listener started...
Listening to X cabinet(s)...
✓ Listener initialized for cabinet Cabinet A (192.168.10.11)
✓ Listener initialized for cabinet Cabinet B (192.168.10.12)
```

### 4. Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

### 5. Configure Cabinets in UI

1. Login as admin at `http://localhost:5173`
2. Click "Cabinets" in sidebar
3. Click "Add Cabinet"
4. Fill in details:
   - **Name**: Cabinet A
   - **IP**: 192.168.10.11
   - **Port**: 8080
   - **Function Byte**: 01
   - **Checksum Offset**: 10
   - **Room**: Select a room
5. Click "Test" to verify connectivity
6. Click "Add Cabinet"

Repeat for Cabinet B with:
- **Function Byte**: 03
- **Checksum Offset**: 12

### 6. Link Shelves to Cabinet

For each shelf you want to control:
1. Go to a panel's shelf configuration
2. Add/edit a shelf
3. Set **Cabinet** to the cabinet
4. Set **Column Index** to the panel ID (0-14)

### 7. Test It!

1. Go to Dashboard or PanelConfig
2. Click "Open" on a shelf
3. Watch the hex command sent to the cabinet
4. When cabinet closes the door, UI updates automatically

## File Structure

**Backend Created:**
```
backend/
├── app/
│   ├── Models/Cabinet.php                    # Cabinet model
│   ├── Services/CabinetSocketService.php     # TCP socket logic
│   ├── Http/Controllers/CabinetController.php
│   ├── Policies/CabinetPolicy.php            # Authorization
│   ├── Console/Commands/
│   │   └── CabinetListenerCommand.php        # Background listener
│   └── Providers/AppServiceProvider.php      # Policy registration
├── database/migrations/
│   ├── 2024_01_01_000012_create_cabinets_table.php
│   ├── 2024_01_01_000013_add_cabinet_id_to_shelves_table.php
│   └── 2024_01_01_000014_add_cabinet_id_to_action_logs_table.php
└── routes/api.php                            # Cabinet endpoints

**Frontend Created:**
```
frontend/
├── src/
│   ├── contexts/SocketContext.tsx             # WebSocket client
│   ├── pages/Cabinets.tsx                     # Cabinet management UI
│   ├── components/PanelGrid.tsx               # Updated with real-time
│   └── App.tsx                                # SocketProvider wrapper
```

## API Endpoints

### Cabinet Management

```bash
# List all cabinets
GET /api/cabinets

# Get cabinets in a room
GET /api/rooms/{roomId}/cabinets

# Create cabinet
POST /api/cabinets
{
  "name": "Cabinet A",
  "ip_address": "192.168.10.11",
  "port": 8080,
  "function_byte": "01",
  "checksum_offset": 10,
  "room_id": 1,
  "is_active": true
}

# Get cabinet
GET /api/cabinets/{id}

# Update cabinet
PUT /api/cabinets/{id}
{ ...updates... }

# Delete cabinet
DELETE /api/cabinets/{id}

# Check cabinet status
GET /api/cabinets/{id}/status

# Test connection
POST /api/cabinets/test-connection
{
  "ip_address": "192.168.10.11",
  "port": 8080
}
```

### Panel Control (Updated)

```bash
# Open a shelf (sends TCP command if cabinet_id set)
POST /api/rooms/{roomId}/panels/{panelId}/shelves/{shelfId}/open

# Close a shelf
POST /api/rooms/{roomId}/panels/{panelId}/shelves/{shelfId}/close
```

## Hex Packet Reference

### Command Packet Structure
```
[0x68] [0x04] [0x09] [Function] [Panel_ID] [Checksum]
 Header  Len   Group  Cabinet    Panel     Panel+Offset
```

### Examples

**Cabinet A (01/0x0A) opens Panel 11 (0x0B):**
```
68 04 09 01 0B 15
Checksum = 0x0B + 0x0A = 0x15
```

**Cabinet B (03/0x0C) opens Panel 1 (0x01):**
```
68 04 09 03 01 0D
Checksum = 0x01 + 0x0C = 0x0D
```

### Notification Packet
Cabinet sends when door closes:
```
68 03 08 [Function] [Panel_ID]
```

**Cabinet A Panel 11 closes:**
```
68 03 08 01 0B
```

## Monitoring

### Check Listener Status

```bash
# See running processes
ps aux | grep cabinet

# View logs (real-time)
tail -f backend/storage/logs/laravel.log

# Tinker - test connection
php artisan tinker
>>> $cab = \App\Models\Cabinet::first();
>>> \App\Services\CabinetSocketService::testConnection($cab->ip_address, $cab->port);
```

### Frontend WebSocket

Open browser console:
```javascript
// Check connection
window.__SOCKET_CONNECTED__ // true/false

// Subscribe manually
fetch('/api/cabinets').then(r => r.json()).then(data => console.log(data))
```

## Troubleshooting

### Listener won't start
```bash
# Check for syntax errors
php -l app/Console/Commands/CabinetListenerCommand.php

# Run with debug output
php artisan cabinet:listen -v
```

### Connection test fails
```bash
# Check if IP is reachable
ping 192.168.10.11

# Check if port is open
nc -zv 192.168.10.11 8080

# Test from artisan tinker
php artisan tinker
>>> \App\Services\CabinetSocketService::testConnection('192.168.10.11', 8080);
```

### No real-time updates
```bash
# Check WebSocket connection in browser console
window.location.protocol === 'https:' ? 'wss:' : 'ws:'

# Verify listener is reading
tail -f storage/logs/laravel.log | grep "Panel closure"
```

### Shelf stays open
1. Verify cabinet closing actually sends `68 03 08` packet
2. Check listener is receiving: add verbose logging
3. Verify cabinet_id is set on shelf
4. Check WebSocket is connected (browser DevTools)

## Production Deployment

### Using Supervisord

Create `/etc/supervisor/conf.d/cabinet-listener.conf`:

```ini
[program:cabinet-listener]
process_name=%(program_name)s_%(process_num)02d
command=php /home/user/smart-shelves/backend/artisan cabinet:listen
autostart=true
autorestart=true
numprocs=1
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/cabinet-listener.log
stderr_logfile=/var/log/cabinet-listener-error.log
```

Then:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start cabinet-listener:*

# Monitor
sudo supervisorctl tail cabinet-listener
```

### Using Systemd

Create `/etc/systemd/system/cabinet-listener.service`:

```ini
[Unit]
Description=Smart Shelves Cabinet Listener
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/user/smart-shelves/backend
ExecStart=/usr/bin/php artisan cabinet:listen
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cabinet-listener
sudo systemctl start cabinet-listener
sudo systemctl status cabinet-listener
```

## Next Steps

1. **Scale to 10 Cabinets**: Repeat cabinet addition process
2. **Configure Rooms**: Assign multiple cabinets to rooms
3. **Create Panels**: Within each room, create panels
4. **Link Shelves**: Map shelves to cabinet panels
5. **Test All**: Use Dashboard to open/close and verify
6. **Deploy**: Move to production with Supervisord/Systemd

## Key Numbers

- **Max Cabinets**: 10 (unlimited with scaling)
- **Panels per Cabinet**: 1-14 (column-based)
- **Connection Pool Size**: 1 per cabinet
- **Listener Check Interval**: ~1 second
- **TCP Timeout**: 30 seconds
- **Retry Attempts**: 3 with exponential backoff
- **Command Latency**: <100ms (network dependent)

## Support

Check logs:
```bash
tail -f backend/storage/logs/laravel.log
tail -f backend/storage/logs/cabinet-listener.log  # if supervisord
```

Enable debug in `.env`:
```
APP_DEBUG=true
LOG_LEVEL=debug
```

Check ActionLog table for all commands sent:
```bash
php artisan tinker
>>> \App\Models\ActionLog::latest()->first();
```
