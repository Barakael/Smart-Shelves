<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // SQLite doesn't support ALTER COLUMN, so we recreate
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
                $table->integer('shelf_number')->nullable(); // 1-12 based on position
                $table->boolean('is_first')->default(false); // Which shelf is "number 1"
                $table->string('open_direction')->default('right'); // left, right, up, down
                $table->boolean('is_open')->default(false);
                $table->timestamps();
            });

            DB::statement('INSERT INTO shelves_new (id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at)
                SELECT id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at FROM shelves');

            Schema::drop('shelves');
            Schema::rename('shelves_new', 'shelves');
        } else {
            Schema::table('shelves', function (Blueprint $table) {
                $table->integer('shelf_number')->nullable()->after('column_index');
                $table->boolean('is_first')->default(false)->after('shelf_number');
                $table->string('open_direction')->default('right')->after('is_first');
                $table->boolean('is_open')->default(false)->after('open_direction');
            });
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            Schema::create('shelves_old', function (Blueprint $table) {
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

            DB::statement('INSERT INTO shelves_old (id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at)
                SELECT id, name, ip_address, rows, columns, controller, room_id, panel_id, row_index, column_index, is_controller, created_at, updated_at FROM shelves');

            Schema::drop('shelves');
            Schema::rename('shelves_old', 'shelves');
        } else {
            Schema::table('shelves', function (Blueprint $table) {
                $table->dropColumn(['shelf_number', 'is_first', 'open_direction', 'is_open']);
            });
        }
    }
};






