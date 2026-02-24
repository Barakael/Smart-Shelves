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
            $table->foreignId('plan_id')->constrained('subscription_plans')->onDelete('restrict');
            
            // Subscription status: active, expired, cancelled
            $table->enum('status', ['active', 'expired', 'cancelled'])->default('active');
            
            // Timestamps for subscription lifecycle
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('starts_at')->useCurrent();
            $table->timestamp('ends_at'); // When subscription expires
            $table->timestamp('renewed_at')->nullable(); // Last renewal timestamp
            $table->timestamp('renewal_due_at')->nullable(); // When renewal should happen
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            
            // Indexes for common queries
            $table->index('room_id');
            $table->index('status');
            $table->index('ends_at');
            $table->unique('room_id'); // One active subscription per room
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
