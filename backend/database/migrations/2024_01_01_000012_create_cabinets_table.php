<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cabinets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ip_address');
            $table->integer('port')->default(8080);
            $table->string('function_byte')->comment('Hex byte for command function (e.g., 01 for Cabinet A, 03 for Cabinet B)');
            $table->integer('checksum_offset')->comment('Offset added to panel_id for checksum calculation (e.g., 0x0A for Cabinet A, 0x0C for Cabinet B)');
            $table->foreignId('room_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_seen')->nullable();
            $table->timestamps();

            $table->unique(['ip_address', 'room_id']);
            $table->index('room_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cabinets');
    }
};
