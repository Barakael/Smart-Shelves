<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shelves', function (Blueprint $table) {
            $table->foreignId('panel_id')->nullable()->after('room_id')->constrained()->onDelete('cascade');
            $table->integer('row_index')->nullable()->after('panel_id');
            $table->integer('column_index')->nullable()->after('row_index');
            $table->boolean('is_controller')->default(false)->after('column_index');
        });
    }

    public function down(): void
    {
        Schema::table('shelves', function (Blueprint $table) {
            $table->dropForeign(['panel_id']);
            $table->dropColumn(['panel_id', 'row_index', 'column_index', 'is_controller']);
        });
    }
};






