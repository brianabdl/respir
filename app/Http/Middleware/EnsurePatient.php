<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatient
{
    /**
     * Doctors are handled by the review console, never the patient consult flow.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isDoctor()) {
            abort(403, 'Doctors do not have access to the consult flow.');
        }

        return $next($request);
    }
}
