<?php

namespace App\Policies;

use App\Models\Cabinet;
use App\Models\User;

class CabinetPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // Admins can view all cabinets; operators can view cabinets for their assigned room
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Cabinet $cabinet): bool
    {
        // Admins can view any cabinet; operators can only view cabinets in their assigned room
        return $user->isAdmin() || $user->room_id === $cabinet->room_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Cabinet $cabinet): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Cabinet $cabinet): bool
    {
        return $user->isAdmin();
    }
}
