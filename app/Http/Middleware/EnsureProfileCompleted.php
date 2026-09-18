<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileCompleted
{
    /**
     * Patients must complete the personalization step before reaching the
     * dashboard or consult flow. Doctors are exempt.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->needsProfileCompletion()) {
            return redirect()->route('onboarding.profile.edit');
        }

        return $next($request);
    }
}
