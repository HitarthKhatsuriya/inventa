<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CheckRole
{
    /**
     * Handle an incoming request.
     * Usage in routes: ->middleware('role:admin') or ->middleware('role:admin,doctor')
     */
    public function handle(Request $request, Closure $next, ...$roles): mixed
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!in_array($request->user()->role, $roles)) {
            return response()->json(['message' => 'Unauthorized. Required role: ' . implode(' or ', $roles)], 403);
        }

        if (!$request->user()->is_active) {
            return response()->json(['message' => 'Account is deactivated.'], 403);
        }

        return $next($request);
    }
}
