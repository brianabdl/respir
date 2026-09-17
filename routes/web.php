<?php

use App\Http\Controllers\Consult\ConsultationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Doctor\ConsultationReviewController;
use App\Http\Middleware\EnsureDoctor;
use App\Http\Middleware\EnsurePatient;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsurePatient::class])->group(function () {
    Route::get('consult', [ConsultationController::class, 'index'])->name('consult');
    Route::post('consult', [ConsultationController::class, 'store'])->name('consult.store');
    Route::post('consult/{consultation}/consent', [ConsultationController::class, 'consent'])->name('consult.consent');
    Route::post('consult/{consultation}/chat', [ConsultationController::class, 'chat'])
        ->middleware('throttle:consult-chat')
        ->name('consult.chat');
    Route::post('consult/{consultation}/voice', [ConsultationController::class, 'voice'])
        ->middleware('throttle:consult-voice')
        ->name('consult.voice');
    Route::get('consult/{consultation}/live/token', [ConsultationController::class, 'liveToken'])->name('consult.live.token');
    Route::get('consult/{consultation}/context', [ConsultationController::class, 'conversationContext'])
        ->middleware('throttle:consult-context')
        ->name('consult.context');
    Route::post('consult/{consultation}/sessions', [ConsultationController::class, 'sessionLog'])->name('consult.sessions.log');
    Route::post('consult/{consultation}/cough', [ConsultationController::class, 'cough'])
        ->middleware('throttle:consult-cough')
        ->name('consult.cough');
    Route::post('consult/{consultation}/captures', [ConsultationController::class, 'capture'])->name('consult.captures.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('consult/{consultation}/captures/{capture}/download', [ConsultationController::class, 'captureDownload'])
        ->middleware('signed')
        ->name('consult.captures.download');
});

Route::middleware(['auth', 'verified', EnsureDoctor::class])->group(function () {
    Route::get('doctor/consultations', [ConsultationReviewController::class, 'index'])->name('doctor.consultations.index');
    Route::get('doctor/consultations/{consultation}', [ConsultationReviewController::class, 'show'])
        ->name('doctor.consultations.show');
    Route::post('doctor/consultations/{consultation}/briefing', [ConsultationReviewController::class, 'briefing'])
        ->name('doctor.consultations.briefing');
    Route::get('doctor/consultations/{consultation}/similar', [ConsultationReviewController::class, 'similar'])
        ->name('doctor.consultations.similar');
});

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

require __DIR__.'/settings.php';
