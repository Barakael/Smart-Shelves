<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $actor = $request->user();
        if (!$actor->canManageOperators()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $users = User::with('room:id,name')
            ->select('id', 'name', 'email', 'role', 'room_id', 'created_at')
            ->orderBy('created_at', 'desc')
            ->when($actor->isManager(), function ($query) use ($actor) {
                $roomIds = $actor->accessibleRoomIds();
                $query->where('role', 'operator')
                    ->where(function ($subQuery) use ($roomIds) {
                        $subQuery->whereNull('room_id');
                        if (!empty($roomIds)) {
                            $subQuery->orWhereIn('room_id', $roomIds);
                        }
                    });
            })
            ->get();

        return response()->json($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $actor = $request->user();
        if (!$actor->canManageOperators()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => ['nullable', Rule::in(['admin', 'manager', 'operator'])],
            'room_id' => 'nullable|exists:rooms,id',
        ]);

        // Default to operator role if not specified
        $role = $validated['role'] ?? 'operator';

        if ($actor->isManager() && $role !== 'operator') {
            return response()->json([
                'message' => 'Managers can only create operator accounts.'
            ], 403);
        }

        // Security: Prevent creating multiple admin accounts
        // Only admin@smartshelves.com should be admin
        if ($role === 'admin' && $validated['email'] !== 'admin@smartshelves.com') {
            return response()->json([
                'message' => 'Only admin@smartshelves.com can have admin role. New users must be operators.'
            ], 403);
        }

        if ($actor->isManager() && !empty($validated['room_id']) && !$actor->canAccessRoom((int) $validated['room_id'])) {
            return response()->json([
                'message' => 'Managers can only assign operators to their own rooms.'
            ], 403);
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'room_id' => $validated['room_id'] ?? null,
        ]);

        if ($user->room_id) {
            $user->rooms()->sync([$user->room_id]);
        }

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor->canManageOperators()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::with('room:id,name')
            ->select('id', 'name', 'email', 'role', 'room_id', 'created_at')
            ->findOrFail($id);

        if ($actor->isManager() && ($user->role !== 'operator' || ($user->room_id && !$actor->canAccessRoom($user->room_id)))) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor->canManageOperators()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|nullable|string|min:6',
            'role' => ['sometimes', 'required', Rule::in(['admin', 'manager', 'operator'])],
            'room_id' => 'sometimes|nullable|exists:rooms,id',
        ]);

        if ($actor->isManager()) {
            if ($user->role !== 'operator') {
                return response()->json(['message' => 'Managers can only edit operators.'], 403);
            }

            if (isset($validated['role']) && $validated['role'] !== 'operator') {
                return response()->json(['message' => 'Managers cannot change role away from operator.'], 403);
            }

            if (array_key_exists('room_id', $validated) && !empty($validated['room_id']) && !$actor->canAccessRoom((int) $validated['room_id'])) {
                return response()->json([
                    'message' => 'Managers can only assign operators to their own rooms.'
                ], 403);
            }
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }

        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        if (isset($validated['password']) && !empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if (isset($validated['role'])) {
            $user->role = $validated['role'];
        }

        if (array_key_exists('room_id', $validated)) {
            $user->room_id = $validated['room_id'];
        }

        $user->save();

        if (array_key_exists('room_id', $validated)) {
            if ($user->room_id) {
                $user->rooms()->sync([$user->room_id]);
            } else {
                $user->rooms()->detach();
            }
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, $id)
    {
        $actor = $request->user();
        if (!$actor->canManageOperators()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Prevent self-deletion
        if ($actor->id == $id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }

        $user = User::findOrFail($id);

        if ($actor->isManager()) {
            if ($user->role !== 'operator') {
                return response()->json(['message' => 'Managers can only delete operators.'], 403);
            }

            if ($user->room_id && !$actor->canAccessRoom($user->room_id)) {
                return response()->json(['message' => 'Operator is outside your managed rooms.'], 403);
            }
        }

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }
}
