<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('room_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('panel_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('shelf_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action_type'); // 'open_row', 'close_row', 'open_shelf', 'close_shelf', 'config_change', etc.
            $table->json('payload')->nullable(); // Additional action data
            $table->text('description')->nullable();
            $table->timestamps();
            
            $table->index(['user_id', 'created_at']);
            $table->index(['room_id', 'created_at']);
            $table->index(['action_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('action_logs');
    }
};






