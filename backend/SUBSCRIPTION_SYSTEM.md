# Smart Shelves Subscription System Implementation

## Overview

The Smart Shelves backend now includes a comprehensive subscription management system that allows you to:
- Create subscription plans with different features and pricing
- Assign subscriptions to rooms (locations)
- Automatically track subscription status and expiration
- Enforce access control based on subscription status
- Automatically renew subscriptions on a schedule
- Monitor subscription health and upcoming expirations

## Architecture

### Database Schema

#### subscription_plans
Stores subscription plan definitions:
- `id` - Primary key
- `name` - Unique plan name (e.g., "Standard", "Professional", "Enterprise")
- `price` - Price in decimal currency (tracked for reference)
- `period_days` - Duration of subscription in days (default: 365)
- `features` - JSON field containing feature limits (e.g., `{"users": 10, "cabinets": 5}`)
- `description` - Human-readable description
- `is_active` - Whether plan is available for new subscriptions
- `created_at`, `updated_at` - Timestamps

#### subscriptions
Tracks active subscriptions for each room:
- `id` - Primary key
- `room_id` - Foreign key to rooms table (unique constraint - one subscription per room)
- `plan_id` - Foreign key to subscription_plans
- `status` - Enum: `active`, `expired`, `cancelled`
- `created_at` - When subscription was created
- `starts_at` - When subscription begins (usually now)
- `ends_at` - When subscription expires
- `renewed_at` - Last renewal timestamp (nullable)
- `renewal_due_at` - When renewal should trigger (nullable)
- `updated_at` - Last modification timestamp

#### rooms table updates
Added columns for fast subscription status caching:
- `subscription_status` - Enum: `active`, `grace_period`, `expired`, `no_subscription`
- `subscription_status_checked_at` - Last time status was validated

## Models

### SubscriptionPlan
Represents a subscription plan template.

**Key Methods:**
- `subscriptions()` - Relationship to all subscriptions using this plan

### Subscription
Represents an active subscription for a room.

**Key Methods:**
- `room()` - Relationship to the room
- `plan()` - Relationship to the subscription plan
- `isActive()` - Returns true if subscription is currently active
- `isExpired()` - Returns true if subscription has expired
- `isInGracePeriod()` - Returns true if expired but within 7-day grace period
- `daysUntilExpiration()` - Returns days until expiration (negative if expired)
- `daysRemainingInGracePeriod()` - Returns days left in grace period (0 if not in grace period)
- `shouldAutoRenew()` - Returns true if renewal is due

### Room
Updated to include subscription relationship.

**New Methods:**
- `subscription()` - One-to-one relationship to subscription

### User
Updated with subscription helper methods.

**New Methods:**
- `hasActiveSubscription()` - Check if user's room has active subscription
- `isInSubscriptionGracePeriod()` - Check if in grace period
- `subscriptionDaysRemaining()` - Get days remaining (null if no subscription)
- `getSubscriptionStatus()` - Get detailed subscription status array

## Services

### SubscriptionService
Core business logic for subscription management.

**Key Methods:**
- `activateSubscription(Room $room, int $planId): Subscription`
  - Creates a new subscription for a room
  - Cancels any existing subscription
  - Sets end date to now + plan period_days
  - Updates room subscription status cache

- `renewSubscription(Subscription $subscription): Subscription`
  - Extends subscription by plan period_days
  - Updates renewal and status timestamps
  - Updates room subscription status cache

- `expireSubscription(Subscription $subscription): Subscription`
  - Marks subscription as expired
  - Updates room subscription status cache

- `cancelSubscription(Subscription $subscription): Subscription`
  - Marks subscription as cancelled
  - Updates room subscription status cache

- `updateRoomSubscriptionStatus(Room $room): void`
  - Recalculates room's subscription status (active/grace_period/expired/no_subscription)
  - Caches result on room model for quick access

- `ensureActiveSubscription(Room $room): void`
  - Validates that room has active subscription
  - Throws exception if expired (code 403) or in grace period (code 402)
  - Refreshes cache if older than 1 hour

- `isInGracePeriod(Room $room): bool`
- `daysRemainingInGracePeriod(Room $room): int`
- `getRoomsExpiringSoon()` - Rooms expiring within 30 days
- `getSubscriptionsToAutoRenew()` - Due for renewal
- `getSubscriptionsToDeactivate()` - Expired past grace period
- `getSubscriptionDetails(Subscription $subscription): array` - Format for API response

## Middleware

### ValidateSubscription
Checks subscription status on protected API routes.

**Behavior:**
- Only applied to authenticated routes (auth middleware runs first)
- Retrieves user's room (via `$user->room` or pivot table)
- Calls `SubscriptionService->ensureActiveSubscription($room)`
- Returns 403 if subscription is expired
- Returns 402 if in grace period
- Returns 403 if no subscription found
- Allows 401 from auth middleware to take precedence

**Usage:**
Add to route groups that should enforce subscription:
```php
Route::middleware('auth:sanctum', 'validate_subscription')->group(function () {
    // Protected routes here
});
```

**Note:** Currently not applied globally. Add to route groups as needed.

## Controllers

### SubscriptionController (Admin Only)
Manages subscriptions for administrators.

**Endpoints:**
All endpoints require `admin` middleware. See API Routes section below.

## API Routes

All subscription endpoints require authentication and admin role.

### Admin Subscription Management

**POST** `/api/admin/rooms/{id}/subscriptions`
- Activate subscription for a room
- Request: `{ "plan_id": 1 }`
- Response: 201, subscription object
- Cancels any existing subscription

**GET** `/api/admin/rooms/{id}/subscription`
- Get current subscription for a room
- Response: 200 or 404, subscription object

**PUT** `/api/admin/rooms/{id}/subscription/renew`
- Manually renew a subscription
- Response: 200, subscription object

**DELETE** `/api/admin/rooms/{id}/subscription`
- Cancel a subscription
- Response: 200, subscription object

**GET** `/api/admin/subscriptions/overview`
- Dashboard view of all rooms and subscription statuses
- Response: 200, object with counts and per-room details

**GET** `/api/admin/subscriptions/expiring-soon`
- List rooms with subscriptions expiring within 30 days
- Response: 200, array of rooms with subscription details

**GET** `/api/admin/subscriptions/plans`
- List available subscription plans
- Response: 200, array of active plans

## Artisan Commands

### `subscriptions:process-expired`
Processes subscriptions that have expired past the 7-day grace period.
- Marks them as expired in database
- Updates room subscription_status cache
- Scheduled to run daily at 2:00 AM

**Usage:**
```bash
php artisan subscriptions:process-expired
```

### `subscriptions:auto-renew`
Automatically renews subscriptions that are due for renewal.
- Checks for subscriptions with `renewal_due_at` <= now
- Extends subscription by plan period_days
- Updates renewal timestamps
- Scheduled to run daily at 3:00 AM

**Usage:**
```bash
php artisan subscriptions:auto-renew
```

## Subscription Lifecycle

### Active State
- `status = 'active'`
- `ends_at > now`
- `subscription_status = 'active'`
- User has full access to protected resources

### Grace Period (7 days after expiration)
- `status = 'active'`
- `ends_at < now`
- `ends_at + 7 days > now`
- `subscription_status = 'grace_period'`
- User can access but receives 402 Payment Required warning
- Allows time for payment retry

### Expired
- `status = 'expired'`
- `ends_at + 7 days < now`
- `subscription_status = 'expired'`
- User cannot access protected resources (403 Forbidden)

### Cancelled
- `status = 'cancelled'`
- Manual admin action
- No access to protected resources

## Usage Guide

### For Administrators

#### 1. View Subscription Plans
```bash
curl -H "Authorization: Bearer {token}" \
  https://your-api.com/api/admin/subscriptions/plans
```

#### 2. Activate Subscription for a Room
```bash
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"plan_id": 1}' \
  https://your-api.com/api/admin/rooms/5/subscriptions
```

#### 3. View All Subscriptions Overview
```bash
curl -H "Authorization: Bearer {token}" \
  https://your-api.com/api/admin/subscriptions/overview
```

#### 4. Monitor Expiring Subscriptions
```bash
curl -H "Authorization: Bearer {token}" \
  https://your-api.com/api/admin/subscriptions/expiring-soon
```

#### 5. Manually Renew a Subscription
```bash
curl -X PUT -H "Authorization: Bearer {token}" \
  https://your-api.com/api/admin/rooms/5/subscription/renew
```

### For End Users

#### 1. Check Your Subscription Status
In login response or profile endpoint, check `subscription_status` array:
```json
{
  "subscription_status": "active",
  "days_remaining": 250,
  "expires_at": "2026-12-02T10:30:00Z",
  "is_in_grace_period": false,
  "plan_name": "Standard"
}
```

#### 2. Handle Subscription Errors
- **401 Unauthorized**: Authentication failed
- **402 Payment Required**: Subscription in grace period (7 days left)
- **403 Forbidden**: Subscription expired or no subscription

## Testing

### Unit Tests
```bash
./vendor/bin/phpunit tests/Unit/SubscriptionServiceTest.php
```

Tests subscription service business logic:
- Activation, renewal, expiration, cancellation
- Status calculations and grace period logic
- Subscription detail formatting

### Feature Tests
```bash
./vendor/bin/phpunit tests/Feature/SubscriptionControllerTest.php
```

Tests API endpoints and access control:
- Admin-only endpoint protection
- Subscription activation and management
- Middleware enforcement
- User access control based on subscription status

### Run All Tests
```bash
./vendor/bin/phpunit
```

## Data Seeding

Default subscription plans are seeded by `DatabaseSeeder`:
1. **Standard** - $99.99/year, 10 users, 5 cabinets
2. **Professional** - $199.99/year, 25 users, 15 cabinets
3. **Enterprise** - $499.99/year, unlimited users and cabinets

Seed with:
```bash
php artisan migrate:fresh --seed
```

## Integration with Payment Processing

This implementation tracks subscription status but does not process payments directly. To integrate with a payment provider:

1. **Payment Provider Webhook Handler**
   - Listen for payment success events (Stripe, PayPal, etc.)
   - Extract `room_id` and `plan_id` from webhook payload

2. **Activate Subscription**
   - Call `SubscriptionController->activateSubscription()` endpoint
   - OR call `SubscriptionService->activateSubscription()` directly

3. **Handle Renewal**
   - Listen for renewal/subscription expiring events from provider
   - Call `renewSubscription()` to extend subscription

4. **Handle Failed Payments**
   - Grace period provides 7-day window for payment retry
   - After grace period, `subscriptions:process-expired` marks as expired
   - Consider cancelling or demoting after multiple failures

## Security Considerations

1. **Authentication First**: All subscription checks assume authenticated user
2. **Authorization**: Only admins can manage subscriptions
3. **Room Assignment**: Users must have a room to have a subscription
4. **Audit Trail**: Consider adding logging to subscription changes
5. **Status Caching**: Cache expires after 1 hour to prevent stale status blocking legitimate users

## Performance Optimizations

1. **Subscription Status Caching**: Room.subscription_status prevents recalculating status on every request
2. **Eager Loading**: Load subscriptions and plans with rooms in overview queries
3. **Indexed Queries**: Subscriptions table has indexes on room_id, status, and ends_at

## Future Enhancements

1. **Multiple Subscription Tiers**: Extend SubscriptionPlan with feature limits
2. **Usage Tracking**: Monitor feature usage against plan limits
3. **Trial Periods**: Add trial_days field to plans with free trial logic
4. **Billing History**: Add subscription_payments table for payment tracking
5. **Discount Codes**: Add coupon/discount support
6. **Team Management**: Support multiple users sharing one subscription
7. **Email Notifications**: Notify admins of expiring subscriptions
8. **API for External Processing**: Expose renewal/activation endpoints for payment processors

## Troubleshooting

### Subscription Not Found Errors
- Ensure room exists
- Ensure subscription was activated (check subscriptions table)
- Run `subscription:update-cache` to refresh room.subscription_status

### Users Blocked Despite Active Subscription
- Check room.subscription_status cache
- Cache refreshes after 1 hour or manually via service
- Check subscription.ends_at date

### Commands Not Running
- Ensure Laravel scheduler is running: `php artisan schedule:work` (dev) or cron for production
- Check logs for command execution errors

### Tests Failing
- Ensure factories exist and are discoverable
- Verify test database is created and migrated
- Check that SubscriptionPlan::factory() can create plans

## Support

For issues or questions:
1. Check test files for usage examples
2. Review SubscriptionService for available methods
3. Check API routes for endpoint definitions
4. Consult database migrations for schema details
