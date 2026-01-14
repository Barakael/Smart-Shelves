<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('cabinets', 'shelf_count')) {
            Schema::table('cabinets', function (Blueprint $table) {
                $table->unsignedInteger('shelf_count')->default(1)->after('checksum_offset');
            });
        }

        DB::table('cabinets')->orderBy('id')->chunkById(100, function ($cabinets) {
            foreach ($cabinets as $cabinet) {
                $rows = max(1, (int) ($cabinet->total_rows ?? 1));
                $columns = max(1, (int) ($cabinet->total_columns ?? 1));
                DB::table('cabinets')
                    ->where('id', $cabinet->id)
                    ->update(['shelf_count' => $rows * $columns]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('cabinets', function (Blueprint $table) {
            $table->dropColumn('shelf_count');
        });
    }
};
