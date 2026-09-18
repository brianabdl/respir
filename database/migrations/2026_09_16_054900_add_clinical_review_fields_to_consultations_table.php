<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->text('clinical_notes')->nullable()->after('report');
            $table->json('follow_up_actions')->nullable()->after('clinical_notes');
            $table->boolean('is_reviewed')->default(false)->after('follow_up_actions');
            $table->timestamp('reviewed_at')->nullable()->after('is_reviewed');
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
        });
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropColumn([
                'clinical_notes',
                'follow_up_actions',
                'is_reviewed',
                'reviewed_at',
                'reviewed_by',
            ]);
        });
    }
};
