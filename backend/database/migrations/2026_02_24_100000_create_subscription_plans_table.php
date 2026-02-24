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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // e.g., 'Standard', 'Pro', 'Enterprise'
            $table->decimal('price', 10, 2)->default(0); // Price in currency (tracked for reference)
            $table->integer('period_days')->default(365); // Subscription period in days
            $table->json('features')->nullable(); // Feature set as JSON, e.g., {"users": 5, "cabinets": 10}
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
