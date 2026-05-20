# Application Status

## ✅ Application is Running!

Both the backend and frontend servers are now running:

### Backend Server
- **Status**: ✅ Running
- **URL**: http://localhost:8000
- **API Base**: http://localhost:8000/api
- **Database**: SQLite (backend/database/database.sqlite)

### Frontend/Tauri App
- **Status**: ✅ Running
- **Mode**: Development (Tauri Dev)
- **Port**: 1420 (Vite dev server)

### Bulk PDF Service
- **Status**: ⚙️ Optional (start when ingesting manifests)
- **Tech**: FastAPI + SQLAlchemy + pandas
- **Port**: 8100 (recommended)
- **Command**:
   ```bash
   cd bulk_pdf_service
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   BULK_DATABASE_URL="sqlite:///../backend/database/database.sqlite" \
   BULK_UPLOADS_ROOT="../storage/uploads/documents" \
   uvicorn app.main:app --reload --port 8100
   ```
- **Endpoints**:
  - `POST /api/bulk-import` – upload a ZIP containing PDFs plus `manifest.csv`/`manifest.xlsx`. Every manifest row must include `filename`, `document_title`, and `shelf_id`. Optional columns: `docket`, `side`, `row_index`, `column_index`. Filenames must exist in the archive and `shelf_id` must map to a shelf with a configured GPIO pin.
   - `POST /api/shelves/{shelf_identifier}/open` – trigger the shelved solenoid via GPIO/relay (uses real `RPi.GPIO` hardware when available, otherwise logs a mock pulse).
- **Cleanup**: The service extracts archives into `storage/tmp/` and automatically wipes the directory after each successful import.

## Login Credentials

### Admin Account
- **Email**: `admin@smartshelves.com`
- **Password**: `password`
- **Access**: Full access to all shelves and rooms

### Operator Account
- **Email**: `operator@smartshelves.com`
- **Password**: `password`
- **Access**: Limited to assigned rooms (Room A and Room B)

## Sample Data

The database has been seeded with:
- 2 users (1 admin, 1 operator)
- 2 rooms (Room A, Room B)
- 3 shelves (assigned to rooms)

## Next Steps

1. **Access the Application**: The Tauri window should open automatically. If not, check the terminal for any errors.

2. **Login**: Use the admin credentials above to log in.

3. **Explore Features**:
   - Dashboard: View system overview
   - Shelves Config: Manage electronic shelves (IP, rows, columns, controllers)
   - Rooms: Manage rooms (Admin only)

## Stopping the Servers

To stop the servers:
- Press `Ctrl+C` in the terminal where they're running
- Or kill the processes:
  ```bash
  pkill -f "php artisan serve"
  pkill -f "tauri dev"
  ```

## Troubleshooting

If you encounter issues:

1. **Backend not responding**:
   ```bash
   cd backend
   php artisan serve
   ```

2. **Frontend not starting**:
   ```bash
   cd frontend
   npm run tauri:dev
   ```

3. **Database issues**:
   ```bash
   cd backend
   php artisan migrate:fresh --seed
   ```

4. **Clear cache**:
   ```bash
   cd backend
   php artisan config:clear
   php artisan cache:clear
   ```

## Building for Production

When ready to build:

```bash
# Frontend
cd frontend
npm run tauri:build

# The built app will be in:
# macOS: frontend/src-tauri/target/release/bundle/macos/
# Windows: frontend/src-tauri/target/release/bundle/msi/
```

## Registry Seeder Verification Checklist

After seeding, verify the Registry structure and commands:

1. Run seed:
   ```bash
   cd backend
   php artisan db:seed
   ```

2. Optional full Registry reset (forces shelf regeneration):
   ```bash
   cd backend
   FORCE_REGISTRY_RESEED=true php artisan db:seed
   ```

3. Validate room/cabinet/shelf counts:
   ```bash
   cd backend
   sqlite3 database/database.sqlite "
   SELECT id, name FROM rooms WHERE name='Registry';
   SELECT c.name, c.ip_address, c.function_byte, c.checksum_offset, c.shelf_count
   FROM cabinets c
   JOIN rooms r ON r.id = c.room_id
   WHERE r.name='Registry'
   ORDER BY c.name;
   SELECT c.name AS cabinet, COUNT(s.id) AS shelves
   FROM cabinets c
   LEFT JOIN shelves s ON s.cabinet_id = c.id
   JOIN rooms r ON r.id = c.room_id
   WHERE r.name='Registry'
   GROUP BY c.id, c.name
   ORDER BY c.name;
   "
   ```

4. Validate Area-1 command pattern:
   ```bash
   cd backend
   sqlite3 database/database.sqlite "
   SELECT shelf_number, open_command, close_command
   FROM shelves s
   JOIN cabinets c ON c.id = s.cabinet_id
   JOIN rooms r ON r.id = c.room_id
   WHERE r.name='Registry' AND c.name='Area-1'
   ORDER BY shelf_number;
   "
   ```

