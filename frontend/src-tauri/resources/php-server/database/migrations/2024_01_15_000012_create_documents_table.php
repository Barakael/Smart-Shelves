<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('cabinet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shelf_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference');
            $table->string('name');
            $table->string('status')->default('available');
            $table->string('shelf_label')->nullable();
            $table->unsignedInteger('docket')->nullable();
            $table->enum('side', ['L', 'R'])->nullable();
            $table->unsignedInteger('row_index')->nullable();
            $table->unsignedInteger('column_index')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index('reference');
            $table->index('name');
            $table->index('status');
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
