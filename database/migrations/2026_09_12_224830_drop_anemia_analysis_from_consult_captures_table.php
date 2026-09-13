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
        Schema::table('consult_captures', function (Blueprint $table) {
            $table->dropIndex('consult_captures_risk_level_index');
            $table->dropColumn(['analysis', 'risk_level', 'analyzed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consult_captures', function (Blueprint $table) {
            $table->jsonb('analysis')->nullable();
            $table->string('risk_level', 15)->nullable()->index();
            $table->timestamp('analyzed_at')->nullable();
        });
    }
};