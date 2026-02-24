<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use Closure;
use Exception;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateSubscription
{
    /**
     * Create a new middleware instance.
     */
    public function __construct(private SubscriptionService $subscriptionService)
    {
    }

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        // If user is not authenticated, let auth middleware handle it (will return 401)
        if (!$user) {
            return $next($request);
        }

        // Admins are exempt from subscription checks (super users)
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Get user's primary room assignment
        $room = $user->room; // Direct room assignment

        if (!$room) {
            // If no primary room, try to get first room from pivot table
            $room = $user->rooms()->first();
        }

        // If user has no room assignment, block access
        if (!$room) {
            return response()->json(
                ['message' => 'User has no room assignment.'],
                403
            );
        }

        try {
            $this->subscriptionService->ensureActiveSubscription($room);
        } catch (Exception $e) {
            $statusCode = $e->getCode() ?: 403;
            return response()->json(
                ['message' => $e->getMessage()],
                $statusCode
            );
        }

        return $next($request);
    }
}
