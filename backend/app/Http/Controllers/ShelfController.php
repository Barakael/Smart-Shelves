<?php

namespace App\Http\Controllers;

use App\Models\Shelf;
use App\Models\ActionLog;
use Illuminate\Http\Request;

class ShelfController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $shelves = Shelf::all();
        } else {
            $roomIds = $user->rooms->pluck('id');
            $shelves = Shelf::whereIn('room_id', $roomIds)->get();
        }

        return response()->json($shelves);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'rows' => 'sometimes|integer|min:1',
            'columns' => 'sometimes|integer|min:1',
            'controller' => 'sometimes|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'panel_id' => 'nullable|exists:panels,id',
            'row_index' => 'nullable|integer|min:0',
            'column_index' => 'nullable|integer|min:0',
            'is_controller' => 'sometimes|boolean',
        ]);

        // Check access if panel_id is provided
        if ($request->panel_id) {
            $panel = \App\Models\Panel::findOrFail($request->panel_id);
            if ($user->isOperator() && $panel->room_id && !$user->rooms->contains($panel->room_id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $shelf = Shelf::create($request->all());

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $shelf->room_id,
            'panel_id' => $shelf->panel_id,
            'shelf_id' => $shelf->id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'create_shelf', 'shelf_name' => $shelf->name],
            'description' => "Created shelf '{$shelf->name}'",
        ]);

        return response()->json($shelf, 201);
    }

    public function show(Request $request, $id)
    {
        $shelf = Shelf::findOrFail($id);
        $user = $request->user();

        if ($user->isOperator() && $shelf->room_id && !$user->rooms->contains($shelf->room_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($shelf);
    }

    public function update(Request $request, $id)
    {
        $shelf = Shelf::findOrFail($id);
        $user = $request->user();

        if ($user->isOperator() && $shelf->room_id && !$user->rooms->contains($shelf->room_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'ip_address' => 'sometimes|required|ip',
            'rows' => 'sometimes|integer|min:1',
            'columns' => 'sometimes|integer|min:1',
            'controller' => 'sometimes|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'panel_id' => 'nullable|exists:panels,id',
            'row_index' => 'nullable|integer|min:0',
            'column_index' => 'nullable|integer|min:0',
            'is_controller' => 'sometimes|boolean',
        ]);

        $shelf->update($request->all());

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $shelf->room_id,
            'panel_id' => $shelf->panel_id,
            'shelf_id' => $shelf->id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'update_shelf', 'shelf_name' => $shelf->name],
            'description' => "Updated shelf '{$shelf->name}'",
        ]);

        return response()->json($shelf);
    }

    public function destroy(Request $request, $id)
    {
        $shelf = Shelf::findOrFail($id);
        $user = $request->user();

        if ($user->isOperator() && $shelf->room_id && !$user->rooms->contains($shelf->room_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $shelfName = $shelf->name;
        $shelf->delete();

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $shelf->room_id,
            'panel_id' => $shelf->panel_id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'delete_shelf', 'shelf_name' => $shelfName],
            'description' => "Deleted shelf '{$shelfName}'",
        ]);

        return response()->json(['message' => 'Shelf deleted successfully']);
    }
}

