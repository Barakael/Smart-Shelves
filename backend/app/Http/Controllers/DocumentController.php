<?php

namespace App\Http\Controllers;

use App\Models\Cabinet;
use App\Models\Document;
use App\Models\Room;
use App\Models\Shelf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DocumentController extends Controller
{
    private const STATUSES = ['available', 'taken', 'returned', 'removed'];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('rooms');

        $query = Document::with(['cabinet', 'shelf', 'room'])
            ->orderByDesc('updated_at');

        if ($user->isOperator()) {
            $roomIds = $user->rooms->pluck('id');
            if ($roomIds->isEmpty()) {
                return response()->json($query->whereRaw('1 = 0')->paginate($this->perPage($request)));
            }
            $query->whereIn('room_id', $roomIds);
        }

        if ($request->filled('room_id')) {
            $roomId = (int) $request->room_id;
            if ($response = $this->guardRoomAccess($request, $roomId)) {
                return $response;
            }
            $query->where('room_id', $roomId);
        }

        if ($request->filled('cabinet_id')) {
            $query->where('cabinet_id', $request->cabinet_id);
        }

        if ($request->filled('shelf_id')) {
            $query->where('shelf_id', $request->shelf_id);
        }

        if ($request->filled('status') && in_array($request->status, self::STATUSES, true)) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('updated_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('updated_at', '<=', $request->to_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($subQuery) use ($search) {
                $subQuery->where('reference', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($this->perPage($request)));
    }

    public function store(Request $request)
    {
        $data = $this->validateDocument($request);
        $cabinet = Cabinet::findOrFail($data['cabinet_id']);

        if ($response = $this->guardRoomAccess($request, $cabinet->room_id)) {
            return $response;
        }

        $this->enforceShelfOwnership($data, $cabinet);
        $data['room_id'] = $cabinet->room_id;
        $data['status'] = $data['status'] ?? 'available';

        $document = Document::create($data);

        return response()->json($document->load(['cabinet', 'shelf', 'room']), 201);
    }

    public function show(Request $request, Document $document)
    {
        if ($response = $this->guardRoomAccess($request, $document->room_id)) {
            return $response;
        }

        return response()->json($document->load(['cabinet', 'shelf', 'room']));
    }

    public function update(Request $request, Document $document)
    {
        $data = $this->validateDocument($request, $document);
        $cabinetId = $data['cabinet_id'] ?? $document->cabinet_id;
        $cabinet = Cabinet::findOrFail($cabinetId);

        if ($response = $this->guardRoomAccess($request, $cabinet->room_id)) {
            return $response;
        }

        $this->enforceShelfOwnership($data, $cabinet);
        $data['room_id'] = $cabinet->room_id;
        $data['status'] = $data['status'] ?? $document->status;

        $document->update($data);

        return response()->json($document->fresh()->load(['cabinet', 'shelf', 'room']));
    }

    public function destroy(Request $request, Document $document)
    {
        if ($response = $this->guardRoomAccess($request, $document->room_id)) {
            return $response;
        }

        $document->delete();

        return response()->json(['message' => 'Document removed']);
    }

    public function filters(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('rooms');
        $roomQuery = Room::query()->orderBy('name');

        if ($user->isOperator()) {
            $roomIds = $user->rooms->pluck('id');
            if ($roomIds->isEmpty()) {
                return response()->json([
                    'rooms' => [],
                    'cabinets' => [],
                    'statuses' => self::STATUSES,
                ]);
            }
            $roomQuery->whereIn('id', $roomIds);
        }

        $rooms = $roomQuery->get();

        $cabinetQuery = Cabinet::with(['shelves' => fn ($query) => $query->orderBy('name')])
            ->orderBy('name');

        if ($user->isOperator()) {
            $cabinetQuery->whereIn('room_id', $rooms->pluck('id'));
        }

        $cabinets = $cabinetQuery->get(['id', 'name', 'room_id']);

        return response()->json([
            'rooms' => $rooms,
            'cabinets' => $cabinets,
            'statuses' => self::STATUSES,
        ]);
    }

    private function validateDocument(Request $request, ?Document $document = null): array
    {
        $cabinetId = $request->get('cabinet_id', $document?->cabinet_id);

        $uniqueRule = Rule::unique('documents')
            ->ignore($document?->id);

        if ($cabinetId) {
            $uniqueRule = $uniqueRule->where(fn ($query) => $query->where('cabinet_id', $cabinetId));
        }

        $rules = [
            'reference' => ['required', 'string', 'max:255', $uniqueRule],
            'name' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(self::STATUSES)],
            'shelf_label' => ['nullable', 'string', 'max:255'],
            'docket' => ['nullable', 'integer', 'min:0'],
            'side' => ['nullable', Rule::in(['L', 'R'])],
            'row_index' => ['nullable', 'integer', 'min:0'],
            'column_index' => ['nullable', 'integer', 'min:0'],
            'cabinet_id' => [$document ? 'sometimes' : 'required', 'exists:cabinets,id'],
            'shelf_id' => ['nullable', 'exists:shelves,id'],
            'metadata' => ['nullable', 'array'],
        ];

        return $request->validate($rules);
    }

    private function enforceShelfOwnership(array &$data, Cabinet $cabinet): void
    {
        $shelfId = $data['shelf_id'] ?? null;
        if (!$shelfId) {
            return;
        }

        $shelf = Shelf::where('cabinet_id', $cabinet->id)->find($shelfId);
        if (!$shelf) {
            throw ValidationException::withMessages([
                'shelf_id' => ['Shelf does not belong to the selected cabinet.'],
            ]);
        }

        $data['shelf_label'] = $data['shelf_label'] ?? $shelf->name;
        $data['row_index'] = $data['row_index'] ?? $shelf->row_index;
        $data['column_index'] = $data['column_index'] ?? $shelf->column_index;
    }

    private function guardRoomAccess(Request $request, ?int $roomId): ?JsonResponse
    {
        $user = $request->user()->loadMissing('rooms');
        if (!$user->isOperator() || $roomId === null) {
            return null;
        }

        $rooms = $user->rooms->pluck('id');
        if ($rooms->isEmpty() || !$rooms->contains($roomId)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return null;
    }

    private function perPage(Request $request): int
    {
        $perPage = (int) $request->get('per_page', 10);
        return max(1, min(50, $perPage));
    }
}
