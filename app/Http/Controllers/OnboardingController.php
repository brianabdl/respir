<?php

namespace App\Http\Controllers;

use App\Http\Requests\Onboarding\CompleteProfileRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    /**
     * Show the post-registration personalization form.
     */
    public function edit(): Response
    {
        return Inertia::render('onboarding/profile');
    }

    /**
     * Save the patient's personalization details and mark the profile complete.
     */
    public function update(CompleteProfileRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        unset($validated['privacy_policy_accepted']);

        $request->user()->fill([
            ...$validated,
            'profile_completed_at' => now(),
            'privacy_policy_accepted_at' => now(),
        ])->save();

        return to_route('dashboard');
    }
}
