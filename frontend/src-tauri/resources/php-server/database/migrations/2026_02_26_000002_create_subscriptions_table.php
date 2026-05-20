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
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->onDelete('cascade');
            $table->foreignId('plan_id')->constrained()->onDelete('restrict');
            $table->enum('status', ['active', 'expired', 'grace_period'])->default('active');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->timestamp('grace_ends_at')->nullable();
            $table->boolean('auto_renew')->default(false);
            $table->timestamps();

            // Indexes for performance
            $table->index('room_id');
            $table->index('status');
            $table->index('ends_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
