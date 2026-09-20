<?php

use App\Domain\Audit\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;

test('audit log records the forwarded client ip behind the proxy', function () {
    $doctor = User::factory()->create(['role' => 'doctor']);
    $this->actingAs($doctor);

    $this->withServerVariables(['REMOTE_ADDR' => '172.18.0.5'])
        ->get(route('doctor.consultations.index'), ['X-Forwarded-For' => '203.0.113.7'])
        ->assertOk();

    $log = AuditLog::where('action', AuditAction::ConsultationListViewed->value)->firstOrFail();

    expect($log->ip_address)->toBe('203.0.113.7');
});
