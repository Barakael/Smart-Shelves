<?php

namespace App\Http\Controllers;

use App\Models\Shelf;
use App\Models\ActionLog;
use App\Support\HexCommandFormatter;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

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
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip',
            'rows' => 'sometimes|integer|min:1',
            'columns' => 'sometimes|integer|min:1',
            'controller' => 'sometimes|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'panel_id' => 'nullable|exists:panels,id',
            'cabinet_id' => 'nullable|exists:cabinets,id',
            'row_index' => 'nullable|integer|min:0',
            'column_index' => 'nullable|integer|min:0',
            'is_controller' => 'sometimes|boolean',
            'shelf_number' => 'nullable|integer|min:1',
            'is_first' => 'sometimes|boolean',
            'open_direction' => 'sometimes|in:left,right,up,down',
            'is_open' => 'sometimes|boolean',
            'open_command' => 'nullable|string',
            'close_command' => 'nullable|string',
        ]);

        // Check access if panel_id is provided
        if ($validated['panel_id'] ?? null) {
            $panel = \App\Models\Panel::findOrFail($validated['panel_id']);
            if ($user->isOperator() && $panel->room_id && !$user->rooms->contains($panel->room_id)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $payload = $this->applyHexCommands($validated, $request);

        $shelf = Shelf::create($payload);

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

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'ip_address' => 'sometimes|required|ip',
            'rows' => 'sometimes|integer|min:1',
            'columns' => 'sometimes|integer|min:1',
            'controller' => 'sometimes|string|max:255',
            'room_id' => 'nullable|exists:rooms,id',
            'panel_id' => 'nullable|exists:panels,id',
            'cabinet_id' => 'nullable|exists:cabinets,id',
            'row_index' => 'nullable|integer|min:0',
            'column_index' => 'nullable|integer|min:0',
            'is_controller' => 'sometimes|boolean',
            'shelf_number' => 'nullable|integer|min:1',
            'is_first' => 'sometimes|boolean',
            'open_direction' => 'sometimes|in:left,right,up,down',
            'is_open' => 'sometimes|boolean',
            'open_command' => 'nullable|string',
            'close_command' => 'nullable|string',
        ]);

        $payload = $this->applyHexCommands($validated, $request);

        $shelf->update($payload);

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

        private function applyHexCommands(array $payload, Request $request): array
        {
            foreach (['open_command', 'close_command'] as $field) {
                if ($request->exists($field)) {
                    try {
                        $payload[$field] = HexCommandFormatter::normalize($request->input($field));
                    } catch (InvalidArgumentException $e) {
                        throw ValidationException::withMessages([
                            $field => $e->getMessage(),
                        ]);
                    }
                }
            }

            return $payload;
        }
}

