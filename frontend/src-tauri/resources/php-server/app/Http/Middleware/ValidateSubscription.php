<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateSubscription
{
    protected $subscriptionService;

    public function __construct(SubscriptionService $subscriptionService)
    {
        $this->subscriptionService = $subscriptionService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If no user is authenticated, let auth middleware handle it
        if (!$user) {
            return $next($request);
        }

        // Admins are exempt from subscription checks
        if ($user->isAdmin()) {
            return $next($request);
        }

        // Check if user can access the system
        if (!$this->subscriptionService->canAccessSystem($user)) {
            return response()->json([
                'message' => 'Subscription required. Please contact your administrator to renew your subscription.',
                'redirect' => '/payment-required',
                'subscription_expired' => true,
            ], 402); // 402 Payment Required
        }

        return $next($request);
    }
}
