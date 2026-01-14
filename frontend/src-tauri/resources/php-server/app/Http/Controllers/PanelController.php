<?php

namespace App\Http\Controllers;

use App\Models\Panel;
use App\Models\Room;
use App\Models\Shelf;
use App\Models\ActionLog;
use App\Services\CabinetSocketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PanelController extends Controller
{
    public function index(Request $request, $roomId)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $panels = $room->panels;
        return response()->json($panels);
    }

    public function store(Request $request, $roomId)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'ip_address' => 'nullable|ip',
            'columns' => 'required|integer|min:4|max:14', // 4-6 columns, 8-14 shelves
        ]);

        $panel = $room->panels()->create($request->only(['name', 'ip_address', 'rows', 'columns']));

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'create_panel', 'panel_name' => $panel->name],
            'description' => "Created panel '{$panel->name}' in room '{$room->name}'",
        ]);

        return response()->json($panel, 201);
    }

    public function show(Request $request, $roomId, $id)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($id);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $panel->load('shelves');
        return response()->json($panel);
    }

    public function update(Request $request, $roomId, $id)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($id);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'ip_address' => 'nullable|ip',
            'columns' => 'sometimes|required|integer|min:4|max:14',
        ]);

        $panel->update($request->only(['name', 'ip_address', 'rows', 'columns']));

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'update_panel', 'panel_name' => $panel->name],
            'description' => "Updated panel '{$panel->name}' in room '{$room->name}'",
        ]);

        return response()->json($panel);
    }

    public function destroy(Request $request, $roomId, $id)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($id);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $panelName = $panel->name;
        $panel->delete();

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'action_type' => 'config_change',
            'payload' => ['action' => 'delete_panel', 'panel_name' => $panelName],
            'description' => "Deleted panel '{$panelName}' from room '{$room->name}'",
        ]);

        return response()->json(['message' => 'Panel deleted successfully']);
    }

    public function getShelves(Request $request, $roomId, $id)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($id);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get shelves organized by column_index (for column-based layout)
        $shelves = $panel->shelves()
            ->orderBy('column_index')
            ->get()
            ->groupBy('column_index')
            ->map(function ($columnShelves) {
                return $columnShelves->first(); // Get first shelf in each column
            });

        return response()->json([
            'panel' => $panel,
            'shelves' => $shelves,
        ]);
    }

    public function openShelf(Request $request, $roomId, $panelId, $shelfId)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($panelId);
        $shelf = Shelf::where('panel_id', $panelId)->findOrFail($shelfId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // If shelf has a cabinet, send TCP command
        if ($shelf->cabinet_id) {
            try {
                CabinetSocketService::sendShelfCommand($shelf, 'open');
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Failed to send open command to cabinet',
                    'error' => $e->getMessage(),
                ], 500);
            }
        }

        $shelf->update(['is_open' => true]);

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'shelf_id' => $shelf->id,
            'cabinet_id' => $shelf->cabinet_id,
            'action_type' => 'open_shelf',
            'payload' => [
                'shelf_number' => $shelf->shelf_number,
                'direction' => $shelf->open_direction,
                'cabinet_id' => $shelf->cabinet_id,
            ],
            'description' => "Opened shelf {$shelf->shelf_number} ({$shelf->name}) in panel '{$panel->name}'",
        ]);

        return response()->json([
            'message' => 'Shelf opening command sent',
            'shelf' => $shelf,
        ]);
    }

    public function closeShelf(Request $request, $roomId, $panelId, $shelfId)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($panelId);
        $shelf = Shelf::where('panel_id', $panelId)->findOrFail($shelfId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($shelf->cabinet_id) {
            try {
                CabinetSocketService::sendShelfCommand($shelf, 'close');
            } catch (\Exception $e) {
                return response()->json([
                    'message' => 'Failed to send close command to cabinet',
                    'error' => $e->getMessage(),
                ], 500);
            }
        }

        $shelf->update(['is_open' => false]);

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'shelf_id' => $shelf->id,
            'cabinet_id' => $shelf->cabinet_id,
            'action_type' => 'close_shelf',
            'payload' => [
                'shelf_number' => $shelf->shelf_number,
                'cabinet_id' => $shelf->cabinet_id,
            ],
            'description' => "Closed shelf {$shelf->shelf_number} ({$shelf->name}) in panel '{$panel->name}'",
        ]);

        return response()->json([
            'message' => 'Shelf closing command sent',
            'shelf' => $shelf,
        ]);
    }

    public function openRow(Request $request, $roomId, $panelId, $rowIndex)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($panelId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get controller shelf for this row
        $controllerShelf = $panel->getControllerShelfForRow($rowIndex);
        
        if (!$controllerShelf) {
            return response()->json(['message' => 'No controller found for this row'], 404);
        }

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'action_type' => 'open_row',
            'payload' => [
                'row_index' => $rowIndex,
                'controller_ip' => $controllerShelf->ip_address,
            ],
            'description' => "Opened row {$rowIndex} in panel '{$panel->name}'",
        ]);

        return response()->json([
            'message' => 'Row opening command sent',
            'row_index' => $rowIndex,
            'controller_ip' => $controllerShelf->ip_address,
        ]);
    }

    public function closeRow(Request $request, $roomId, $panelId, $rowIndex)
    {
        $user = $request->user();
        $room = Room::findOrFail($roomId);
        $panel = Panel::where('room_id', $roomId)->findOrFail($panelId);

        // Check access
        if ($user->isOperator() && $user->room_id != $room->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get controller shelf for this row
        $controllerShelf = $panel->getControllerShelfForRow($rowIndex);
        
        if (!$controllerShelf) {
            return response()->json(['message' => 'No controller found for this row'], 404);
        }

        // Log action
        ActionLog::create([
            'user_id' => $user->id,
            'room_id' => $room->id,
            'panel_id' => $panel->id,
            'action_type' => 'close_row',
            'payload' => [
                'row_index' => $rowIndex,
                'controller_ip' => $controllerShelf->ip_address,
            ],
            'description' => "Closed row {$rowIndex} in panel '{$panel->name}'",
        ]);

        return response()->json([
            'message' => 'Row closing command sent',
            'row_index' => $rowIndex,
            'controller_ip' => $controllerShelf->ip_address,
        ]);
    }
}

