<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabinets', function (Blueprint $table) {
            $table->unsignedTinyInteger('total_rows')->default(1)->after('checksum_offset');
            $table->unsignedTinyInteger('total_columns')->default(1)->after('total_rows');
            $table->unsignedTinyInteger('controller_row')->nullable()->after('total_columns');
            $table->unsignedTinyInteger('controller_column')->nullable()->after('controller_row');
        });

        Schema::table('shelves', function (Blueprint $table) {
            $table->text('open_command')->nullable()->after('is_open');
            $table->text('close_command')->nullable()->after('open_command');
        });
    }

    public function down(): void
    {
        Schema::table('shelves', function (Blueprint $table) {
            $table->dropColumn(['open_command', 'close_command']);
        });

        Schema::table('cabinets', function (Blueprint $table) {
            $table->dropColumn(['total_rows', 'total_columns', 'controller_row', 'controller_column']);
        });
    }
};
