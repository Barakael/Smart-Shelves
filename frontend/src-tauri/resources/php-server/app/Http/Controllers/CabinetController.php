<?php

namespace App\Http\Controllers;

use App\Models\Cabinet;
use App\Models\Room;
use App\Models\Shelf;
use App\Models\ActionLog;
use App\Services\CabinetSocketService;
use App\Support\HexCommandFormatter;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;
use Exception;

class CabinetController extends Controller
{
    /**
     * Get all cabinets (admin only).
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Cabinet::class);

        $cabinets = Cabinet::with(['room', 'shelves' => fn ($query) => $query->orderBy('column_index')])
            ->orderBy('name')
            ->get();

        return response()->json($cabinets);
    }

    /**
     * Get cabinets for a specific room.
     */
    public function getByRoom(Room $room): JsonResponse
    {
        $this->authorize('view', $room);

        $cabinets = $room->cabinets()
            ->with(['shelves' => fn ($query) => $query->orderBy('column_index')])
            ->orderBy('name')
            ->get();

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
            'shelf_count' => 'required|integer|min:1|max:50',
            'total_rows' => 'sometimes|integer|min:1|max:20',
            'total_columns' => 'sometimes|integer|min:1|max:20',
            'controller_row' => 'nullable|integer|min:0',
            'controller_column' => 'nullable|integer|min:0',
            'room_id' => 'required|exists:rooms,id',
            'macro_close_command' => 'nullable|string',
            'macro_lock_command' => 'nullable|string',
            'macro_vent_command' => 'nullable|string',
        ]);

        $validated = $this->normalizeMacroFields($validated);
        $this->assertControllerWithinGrid($validated);

        $validated['shelf_count'] = $validated['shelf_count'] ?? 1;
        $validated['total_rows'] = $validated['total_rows'] ?? 1;
        $validated['total_columns'] = $validated['total_columns'] ?? 1;

        // Test connection before saving
        if (!CabinetSocketService::testConnection($validated['ip_address'], $validated['port'])) {
            return response()->json([
                'message' => 'Unable to establish connection to cabinet. Please check IP address and port.',
                'error' => 'connection_failed',
            ], 422);
        }

        $cabinet = DB::transaction(function () use ($validated) {
            $cabinet = Cabinet::create($validated);
            $this->provisionShelves($cabinet);

            return $cabinet;
        });

        return response()->json($cabinet->load('shelves'), 201);
    }

    /**
     * Get a single cabinet.
     */
    public function show(Cabinet $cabinet): JsonResponse
    {
        $this->authorize('view', $cabinet);

        return response()->json($cabinet->load(['room', 'shelves' => fn ($query) => $query->orderBy('column_index')]));
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
            'shelf_count' => 'sometimes|integer|min:1|max:50',
            'total_rows' => 'sometimes|integer|min:1|max:20',
            'total_columns' => 'sometimes|integer|min:1|max:20',
            'controller_row' => 'nullable|integer|min:0',
            'controller_column' => 'nullable|integer|min:0',
            'macro_close_command' => 'nullable|string',
            'macro_lock_command' => 'nullable|string',
            'macro_vent_command' => 'nullable|string',
        ]);

        $validated = $this->normalizeMacroFields($validated);
        $this->assertControllerWithinGrid($validated, $cabinet);

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

        if ($cabinet->wasChanged(['shelf_count', 'total_rows', 'total_columns'])) {
            $cabinet->shelves()->delete();
            $this->provisionShelves($cabinet, true);
        }

        return response()->json($cabinet->load(['room', 'shelves' => fn ($query) => $query->orderBy('column_index')]));
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

    /**
     * Send a manual hex command to a cabinet for testing.
     */
    public function sendTestCommand(Request $request, Cabinet $cabinet): JsonResponse
    {
        $this->authorize('view', $cabinet);

        $validated = $request->validate([
            'hex_command' => 'required|string',
        ]);

        try {
            $normalized = HexCommandFormatter::normalize($validated['hex_command']);
            if ($normalized === null) {
                throw new InvalidArgumentException('Hex command cannot be empty.');
            }
            CabinetSocketService::sendHexString($cabinet, $normalized);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'hex_command' => $e->getMessage(),
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to send command to cabinet',
                'error' => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Command sent successfully',
            'hex_command' => $normalized,
        ]);
    }

    public function openShelf(Request $request, Cabinet $cabinet, Shelf $shelf): JsonResponse
    {
        $this->authorize('view', $cabinet);
        $this->assertShelfOwnership($cabinet, $shelf);

        try {
            CabinetSocketService::sendShelfCommand($shelf, 'open');
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to send open command to cabinet',
                'error' => $e->getMessage(),
            ], 500);
        }

        $shelf->update(['is_open' => true]);

        $this->logShelfAction($request->user()->id, $cabinet, $shelf, 'open_shelf', [
            'hex_command' => $shelf->open_command,
            'column_index' => $shelf->column_index,
        ]);

        return response()->json([
            'message' => 'Shelf opening command sent',
            'shelf' => $shelf->fresh(),
        ]);
    }

    public function closeShelf(Request $request, Cabinet $cabinet, Shelf $shelf): JsonResponse
    {
        $this->authorize('view', $cabinet);
        $this->assertShelfOwnership($cabinet, $shelf);

        try {
            CabinetSocketService::sendShelfCommand($shelf, 'close');
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to send close command to cabinet',
                'error' => $e->getMessage(),
            ], 500);
        }

        $shelf->update(['is_open' => false]);

        $this->logShelfAction($request->user()->id, $cabinet, $shelf, 'close_shelf', [
            'hex_command' => $shelf->close_command,
            'column_index' => $shelf->column_index,
        ]);

        return response()->json([
            'message' => 'Shelf closing command sent',
            'shelf' => $shelf->fresh(),
        ]);
    }

    private function normalizeMacroFields(array $data): array
    {
        $fields = ['macro_close_command', 'macro_lock_command', 'macro_vent_command'];

        foreach ($fields as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            $value = $data[$field];
            if ($value === null || trim((string) $value) === '') {
                $data[$field] = null;
                continue;
            }

            try {
                $data[$field] = HexCommandFormatter::normalize((string) $value);
            } catch (InvalidArgumentException $e) {
                throw ValidationException::withMessages([
                    $field => $e->getMessage(),
                ]);
            }
        }

        return $data;
    }

    private function assertControllerWithinGrid(array $data, ?Cabinet $existing = null): void
    {
        $rows = $data['total_rows'] ?? $existing?->total_rows;
        $columns = $data['total_columns'] ?? $existing?->total_columns;
        $controllerRow = $data['controller_row'] ?? $existing?->controller_row;
        $controllerColumn = $data['controller_column'] ?? $existing?->controller_column;

        if ($controllerRow !== null && $rows !== null && $controllerRow >= $rows) {
            throw ValidationException::withMessages([
                'controller_row' => 'Controller row must be within the configured total rows.',
            ]);
        }

        if ($controllerColumn !== null && $columns !== null && $controllerColumn >= $columns) {
            throw ValidationException::withMessages([
                'controller_column' => 'Controller column must be within the configured total columns.',
            ]);
        }
    }

    private function assertShelfOwnership(Cabinet $cabinet, Shelf $shelf): void
    {
        if ($shelf->cabinet_id !== $cabinet->id) {
            abort(404, 'Shelf does not belong to this cabinet');
        }
    }

    private function logShelfAction(int $userId, Cabinet $cabinet, Shelf $shelf, string $action, array $payload): void
    {
        $shelfLabel = $shelf->shelf_number ?? (($shelf->column_index ?? 0) + 1);

        ActionLog::create([
            'user_id' => $userId,
            'room_id' => $cabinet->room_id,
            'cabinet_id' => $cabinet->id,
            'shelf_id' => $shelf->id,
            'action_type' => $action,
            'payload' => $payload,
            'description' => sprintf('%s shelf %s (%s) in cabinet %s',
                ucfirst(str_replace('_', ' ', $action)),
                $shelfLabel,
                $shelf->name,
                $cabinet->name
            ),
        ]);
    }

    private function provisionShelves(Cabinet $cabinet, bool $force = false): void
    {
        if (!$cabinet->shelf_count) {
            return;
        }

        if (!$force && $cabinet->shelves()->exists()) {
            return;
        }

        $shelfCount = max(1, (int) $cabinet->shelf_count);
        $rowsPerShelf = max(1, (int) ($cabinet->total_rows ?? 1));
        $columnsPerShelf = max(1, (int) ($cabinet->total_columns ?? 1));
        $timestamp = now();
        $payload = [];

        for ($index = 0; $index < $shelfCount; $index++) {
            $panelId = $index + 1;

            $payload[] = [
                'name' => 'Shelf ' . $panelId,
                'ip_address' => $cabinet->ip_address,
                'rows' => $rowsPerShelf,
                'columns' => $columnsPerShelf,
                'controller' => null,
                'room_id' => $cabinet->room_id,
                'panel_id' => null,
                'cabinet_id' => $cabinet->id,
                'row_index' => 0,
                'column_index' => $index,
                'is_controller' => false,
                'shelf_number' => $panelId,
                'is_first' => $panelId === 1,
                'open_direction' => 'right',
                'is_open' => false,
                'open_command' => $this->buildOpenCommandString($cabinet, $panelId),
                'close_command' => $this->buildCloseCommandString($cabinet, $panelId),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }

        if (!empty($payload)) {
            Shelf::insert($payload);
        }
    }

    private function buildOpenCommandString(Cabinet $cabinet, int $panelId): string
    {
        $functionByte = strtoupper(str_pad($cabinet->function_byte, 2, '0', STR_PAD_LEFT));
        $panelByte = $this->formatHexByte($panelId);
        $checksum = $this->formatHexByte($panelId + (int) $cabinet->checksum_offset);

        return "68 04 09 {$functionByte} {$panelByte} {$checksum}";
    }

    private function buildCloseCommandString(Cabinet $cabinet, int $panelId): string
    {
        $functionByte = strtoupper(str_pad($cabinet->function_byte, 2, '0', STR_PAD_LEFT));
        $panelByte = $this->formatHexByte($panelId);

        return "68 03 08 {$functionByte} {$panelByte}";
    }

    private function formatHexByte(int $value): string
    {
        return strtoupper(str_pad(dechex($value & 0xFF), 2, '0', STR_PAD_LEFT));
    }
}
