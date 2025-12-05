<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        if (DB::getDriverName() === 'sqlite') {
            // Create new table with nullable columns
            Schema::create('shelves_new', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('ip_address');
                $table->integer('rows')->nullable();
                $table->integer('columns')->nullable();
                $table->string('controller')->nullable();
                $table->foreignId('room_id')->nullable()->constrained()->onDelete('set null');
                $table->foreignId('panel_id')->nullable()->constrained()->onDelete('cascade');
                $table->integer('row_index')->nullable();
                $table->integer('column_index')->nullable();
                $table->boolean('is_controller')->default(false);
                $table->timestamps();
            });

            // Copy data from old table to new table
            DB::statement('INSERT INTO shelves_new (id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at)
                SELECT id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at FROM shelves');

            // Drop old table
            Schema::drop('shelves');

            // Rename new table
            Schema::rename('shelves_new', 'shelves');
        } else {
            // For other databases, use standard ALTER
            Schema::table('shelves', function (Blueprint $table) {
                $table->integer('rows')->nullable()->change();
                $table->integer('columns')->nullable()->change();
                $table->string('controller')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // Recreate with NOT NULL constraints
            Schema::create('shelves_old', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('ip_address');
                $table->integer('rows');
                $table->integer('columns');
                $table->string('controller');
                $table->foreignId('room_id')->nullable()->constrained()->onDelete('set null');
                $table->foreignId('panel_id')->nullable()->constrained()->onDelete('cascade');
                $table->integer('row_index')->nullable();
                $table->integer('column_index')->nullable();
                $table->boolean('is_controller')->default(false);
                $table->timestamps();
            });

            DB::statement('INSERT INTO shelves_old (id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at)
                SELECT id, name, ip_address, COALESCE(rows, 1), COALESCE(columns, 1), COALESCE(controller, ""), room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at FROM shelves');

            Schema::drop('shelves');
            Schema::rename('shelves_old', 'shelves');
        } else {
            Schema::table('shelves', function (Blueprint $table) {
                $table->integer('rows')->nullable(false)->change();
                $table->integer('columns')->nullable(false)->change();
                $table->string('controller')->nullable(false)->change();
            });
        }
    }
};

