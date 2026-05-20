<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('taken_to_name')->nullable()->after('metadata');
            $table->string('taken_to_title')->nullable()->after('taken_to_name');
            $table->string('taken_destination')->nullable()->after('taken_to_title');
            $table->timestamp('taken_at')->nullable()->after('taken_destination');
            $table->foreignId('taken_by_user_id')
                ->nullable()
                ->after('taken_at')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('taken_by_user_id');
            $table->dropColumn([
                'taken_to_name',
                'taken_to_title',
                'taken_destination',
                'taken_at',
            ]);
        });
    }
};

