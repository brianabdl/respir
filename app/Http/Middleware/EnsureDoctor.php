<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDoctor
{
    /**
     * Only doctors may pass through.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isDoctor()) {
            abort(403, 'Only doctors can access the review console.');
        }

        return $next($request);
    }
}
