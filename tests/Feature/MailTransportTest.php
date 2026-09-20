<?php

use Illuminate\Mail\Transport\ResendTransport;
use Illuminate\Support\Facades\Mail;

test('resend mailer resolves the Resend transport from the configured API key', function () {
    config(['services.resend.key' => 're_test_key']);

    $transport = Mail::mailer('resend')->getSymfonyTransport();

    expect($transport)->toBeInstanceOf(ResendTransport::class);
});
