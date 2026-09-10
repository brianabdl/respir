<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    /**
     * Demo accounts: patient and doctor for local/demo review sessions.
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'patient@demo.test'],
            [
                'name' => 'Demo Patient',
                'password' => Hash::make('password'),
                'role' => 'patient',
                'email_verified_at' => now(),
            ],
        );

        User::query()->firstOrCreate(
            ['email' => 'doctor@demo.test'],
            [
                'name' => 'Dr. Demo',
                'password' => Hash::make('password'),
                'role' => 'doctor',
                'email_verified_at' => now(),
            ],
        );
    }
}
