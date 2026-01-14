<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use Illuminate\Http\Request;

class ActionLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = ActionLog::with(['user', 'room', 'panel', 'shelf'])
            ->orderBy('created_at', 'desc');

        // Filter by room if operator
        if ($user->isOperator()) {
            $roomIds = $user->rooms->pluck('id');
            $query->whereIn('room_id', $roomIds);
        }

        // Filter by room if specified
        if ($request->has('room_id')) {
            $roomId = $request->room_id;
            // Check access
            if ($user->isOperator() && !$user->rooms->contains($roomId)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $query->where('room_id', $roomId);
        }

        // Filter by panel if specified
        if ($request->has('panel_id')) {
            $query->where('panel_id', $request->panel_id);
        }

        // Filter by action type
        if ($request->has('action_type')) {
            $query->where('action_type', $request->action_type);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $perPage = $request->get('per_page', 50);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $log = ActionLog::with(['user', 'room', 'panel', 'shelf'])->findOrFail($id);

        // Check access
        if ($user->isOperator() && $log->room_id && !$user->rooms->contains($log->room_id)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($log);
    }
}






