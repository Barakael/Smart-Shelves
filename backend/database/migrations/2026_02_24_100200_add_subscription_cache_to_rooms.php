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
        Schema::table('rooms', function (Blueprint $table) {
            // Cache field for quick status checks (active, expired, grace_period, no_subscription)
            $table->enum('subscription_status', ['active', 'grace_period', 'expired', 'no_subscription'])
                ->default('no_subscription')
                ->after('updated_at');
            
            $table->timestamp('subscription_status_checked_at')
                ->nullable()
                ->after('subscription_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rooms', function (Blueprint $table) {
            $table->dropColumn(['subscription_status', 'subscription_status_checked_at']);
        });
    }
};
