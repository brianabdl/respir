<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

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

        $installed = DB::selectOne("SELECT 1 FROM pg_extension WHERE extname = 'vector'");

        if ($installed === null) {
            DB::statement('CREATE EXTENSION vector');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // The extension is shared and managed by the database administrator.
    }
};
