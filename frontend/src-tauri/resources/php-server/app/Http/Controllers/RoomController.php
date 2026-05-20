<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $rooms = Room::all();
        } elseif ($user->isManager()) {
            $rooms = $user->rooms()->get();
            if ($rooms->isEmpty() && $user->room_id) {
                $rooms = Room::where('id', $user->room_id)->get();
            }
        } else {
            // Operators only see their assigned room
            $rooms = $user->room ? collect([$user->room]) : collect([]);
        }

        return response()->json($rooms);
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $room = Room::create($request->all());

        return response()->json($room, 201);
    }

    public function show(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $user = $request->user();

        if (!$user->canAccessRoom($room->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($room);
    }

    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $room->update($request->only(['name', 'description']));

        return response()->json($room);
    }

    public function destroy(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $user = $request->user();

        // Only admins can delete rooms
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted successfully']);
    }
}

