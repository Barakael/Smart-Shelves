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
        } else {
            $rooms = $user->rooms;
        }

        return response()->json($rooms);
    }

    public function store(Request $request)
    {
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

        if ($user->isOperator() && !$user->rooms->contains($room->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($room);
    }

    public function update(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $user = $request->user();

        if ($user->isOperator() && !$user->rooms->contains($room->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $room->update($request->all());

        return response()->json($room);
    }

    public function destroy(Request $request, $id)
    {
        $room = Room::findOrFail($id);
        $user = $request->user();

        if ($user->isOperator() && !$user->rooms->contains($room->id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted successfully']);
    }
}

