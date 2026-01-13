<?php

namespace App\Http\Controllers;

use App\Models\Cabinet;
use App\Models\Room;
use App\Services\CabinetSocketService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class CabinetController extends Controller
{
    /**
     * Get all cabinets (admin only).
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Cabinet::class);

        $cabinets = Cabinet::with('room')->orderBy('name')->get();

        return response()->json($cabinets);
    }

    /**
     * Get cabinets for a specific room.
     */
    public function getByRoom(Room $room): JsonResponse
    {
        $this->authorize('view', $room);

        $cabinets = $room->cabinets()->orderBy('name')->get();

        return response()->json($cabinets);
    }

    /**
     * Store a new cabinet.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Cabinet::class);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'ip_address' => 'required|ip|unique:cabinets,ip_address',
            'port' => 'required|integer|between:1,65535',
            'function_byte' => 'required|regex:/^[0-9A-Fa-f]{2}$/',
            'checksum_offset' => 'required|integer|between:0,255',
            'room_id' => 'required|exists:rooms,id',
        ]);

        // Test connection before saving
        if (!CabinetSocketService::testConnection($validated['ip_address'], $validated['port'])) {
            return response()->json([
                'message' => 'Unable to establish connection to cabinet. Please check IP address and port.',
                'error' => 'connection_failed',
            ], 422);
        }

        $cabinet = Cabinet::create($validated);

        return response()->json($cabinet, 201);
    }

    /**
     * Get a single cabinet.
     */
    public function show(Cabinet $cabinet): JsonResponse
    {
        $this->authorize('view', $cabinet);

        return response()->json($cabinet->load('room'));
    }

    /**
     * Update a cabinet.
     */
    public function update(Request $request, Cabinet $cabinet): JsonResponse
    {
        $this->authorize('update', $cabinet);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'ip_address' => 'sometimes|ip|unique:cabinets,ip_address,' . $cabinet->id,
            'port' => 'sometimes|integer|between:1,65535',
            'function_byte' => 'sometimes|regex:/^[0-9A-Fa-f]{2}$/',
            'checksum_offset' => 'sometimes|integer|between:0,255',
            'is_active' => 'sometimes|boolean',
            'room_id' => 'sometimes|exists:rooms,id',
        ]);

        // If IP or port changed, test the new connection
        if (isset($validated['ip_address']) || isset($validated['port'])) {
            $ip = $validated['ip_address'] ?? $cabinet->ip_address;
            $port = $validated['port'] ?? $cabinet->port;

            if (!CabinetSocketService::testConnection($ip, $port)) {
                return response()->json([
                    'message' => 'Unable to establish connection to cabinet. Please check IP address and port.',
                    'error' => 'connection_failed',
                ], 422);
            }

            // Close old connection if IP changed
            if (isset($validated['ip_address']) && $validated['ip_address'] !== $cabinet->ip_address) {
                CabinetSocketService::closeConnection($cabinet);
            }
        }

        $cabinet->update($validated);

        return response()->json($cabinet);
    }

    /**
     * Delete a cabinet.
     */
    public function destroy(Cabinet $cabinet): JsonResponse
    {
        $this->authorize('delete', $cabinet);

        CabinetSocketService::closeConnection($cabinet);
        $cabinet->delete();

        return response()->json(['message' => 'Cabinet deleted successfully']);
    }

    /**
     * Test connection to a cabinet.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $this->authorize('create', Cabinet::class);

        $validated = $request->validate([
            'ip_address' => 'required|ip',
            'port' => 'required|integer|between:1,65535',
        ]);

        $success = CabinetSocketService::testConnection($validated['ip_address'], $validated['port']);

        return response()->json([
            'success' => $success,
            'message' => $success ? 'Connection successful' : 'Connection failed',
        ]);
    }

    /**
     * Get cabinet connection status.
     */
    public function status(Cabinet $cabinet): JsonResponse
    {
        $this->authorize('view', $cabinet);

        $isConnected = CabinetSocketService::testConnection($cabinet->ip_address, $cabinet->port);

        return response()->json([
            'id' => $cabinet->id,
            'name' => $cabinet->name,
            'ip_address' => $cabinet->ip_address,
            'port' => $cabinet->port,
            'is_active' => $cabinet->is_active,
            'is_connected' => $isConnected,
            'last_seen' => $cabinet->last_seen,
        ]);
    }
}
