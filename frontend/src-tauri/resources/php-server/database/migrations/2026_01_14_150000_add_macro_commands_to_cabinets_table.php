<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cabinets', function (Blueprint $table) {
            $table->text('macro_close_command')->nullable()->after('controller_column');
            $table->text('macro_lock_command')->nullable()->after('macro_close_command');
            $table->text('macro_vent_command')->nullable()->after('macro_lock_command');
        });
    }

    public function down(): void
    {
        Schema::table('cabinets', function (Blueprint $table) {
            $table->dropColumn([
                'macro_close_command',
                'macro_lock_command',
                'macro_vent_command',
            ]);
        });
    }
};
