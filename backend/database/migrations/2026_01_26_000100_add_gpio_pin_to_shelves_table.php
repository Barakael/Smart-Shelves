<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shelves', function (Blueprint $table) {
            if (!Schema::hasColumn('shelves', 'gpio_pin')) {
                $table->unsignedSmallInteger('gpio_pin')
                    ->nullable()
                    ->after('controller')
                    ->unique();
            }
        });
    }

    public function down(): void
    {
        Schema::table('shelves', function (Blueprint $table) {
            if (Schema::hasColumn('shelves', 'gpio_pin')) {
                $table->dropUnique('shelves_gpio_pin_unique');
                $table->dropColumn('gpio_pin');
            }
        });
    }
};
