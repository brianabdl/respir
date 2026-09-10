<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        Schema::create('cough_embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('capture_id')->nullable()->constrained('consult_captures')->cascadeOnDelete();
            $table->vector('embedding', 512);
            $table->string('risk_level', 15)->nullable();
            $table->string('model', 120)->nullable();
            $table->timestamps();

            $table->unique('capture_id');
            $table->vectorIndex('embedding');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cough_embeddings');
    }
};
