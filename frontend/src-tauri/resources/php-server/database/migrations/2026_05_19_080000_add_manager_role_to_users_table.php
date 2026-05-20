<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','operator') NOT NULL DEFAULT 'operator'");
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=OFF');
            DB::statement("
                CREATE TABLE users_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    name VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    email_verified_at DATETIME NULL,
                    password VARCHAR NOT NULL,
                    role VARCHAR CHECK (role IN ('admin','manager','operator')) NOT NULL DEFAULT 'operator',
                    phone VARCHAR NULL,
                    room_id INTEGER NULL REFERENCES rooms(id) ON DELETE SET NULL,
                    remember_token VARCHAR NULL,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL
                )
            ");
            DB::statement('CREATE UNIQUE INDEX users_new_email_unique ON users_new (email)');
            DB::statement('INSERT INTO users_new (id, name, email, email_verified_at, password, role, phone, room_id, remember_token, created_at, updated_at) SELECT id, name, email, email_verified_at, password, role, phone, room_id, remember_token, created_at, updated_at FROM users');
            DB::statement('DROP TABLE users');
            DB::statement('ALTER TABLE users_new RENAME TO users');
            DB::statement('PRAGMA foreign_keys=ON');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin','operator') NOT NULL DEFAULT 'operator'");
            return;
        }

        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys=OFF');
            DB::statement("
                CREATE TABLE users_old (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    name VARCHAR NOT NULL,
                    email VARCHAR NOT NULL,
                    email_verified_at DATETIME NULL,
                    password VARCHAR NOT NULL,
                    role VARCHAR CHECK (role IN ('admin','operator')) NOT NULL DEFAULT 'operator',
                    phone VARCHAR NULL,
                    room_id INTEGER NULL REFERENCES rooms(id) ON DELETE SET NULL,
                    remember_token VARCHAR NULL,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL
                )
            ");
            DB::statement('CREATE UNIQUE INDEX users_old_email_unique ON users_old (email)');
            DB::statement("INSERT INTO users_old (id, name, email, email_verified_at, password, role, phone, room_id, remember_token, created_at, updated_at) SELECT id, name, email, email_verified_at, password, CASE WHEN role = 'manager' THEN 'operator' ELSE role END, phone, room_id, remember_token, created_at, updated_at FROM users");
            DB::statement('DROP TABLE users');
            DB::statement('ALTER TABLE users_old RENAME TO users');
            DB::statement('PRAGMA foreign_keys=ON');
        }
    }
};

