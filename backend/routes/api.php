<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\ShelfController;
use App\Http\Controllers\PanelController;
use App\Http\Controllers\CabinetController;
use App\Http\Controllers\ActionLogController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('shelves', ShelfController::class);
    Route::apiResource('rooms', RoomController::class);
    
    // Cabinet routes
    Route::get('/cabinets', [CabinetController::class, 'index']);
    Route::post('/cabinets', [CabinetController::class, 'store']);
    Route::post('/cabinets/test-connection', [CabinetController::class, 'testConnection']);
    Route::get('/cabinets/{cabinet}', [CabinetController::class, 'show']);
    Route::get('/cabinets/{cabinet}/status', [CabinetController::class, 'status']);
    Route::post('/cabinets/{cabinet}/commands/test', [CabinetController::class, 'sendTestCommand']);
    Route::post('/cabinets/{cabinet}/shelves/{shelf}/open', [CabinetController::class, 'openShelf']);
    Route::post('/cabinets/{cabinet}/shelves/{shelf}/close', [CabinetController::class, 'closeShelf']);
    Route::put('/cabinets/{cabinet}', [CabinetController::class, 'update']);
    Route::delete('/cabinets/{cabinet}', [CabinetController::class, 'destroy']);
    Route::get('/rooms/{room}/cabinets', [CabinetController::class, 'getByRoom']);
    
    // User management (admin only)
    Route::apiResource('users', UserController::class);
    
    // Panel routes nested under rooms
    Route::prefix('rooms/{roomId}')->group(function () {
        Route::get('/panels', [PanelController::class, 'index']);
        Route::post('/panels', [PanelController::class, 'store']);
        Route::get('/panels/{id}', [PanelController::class, 'show']);
        Route::put('/panels/{id}', [PanelController::class, 'update']);
        Route::delete('/panels/{id}', [PanelController::class, 'destroy']);
        Route::get('/panels/{id}/shelves', [PanelController::class, 'getShelves']);
        Route::post('/panels/{panelId}/rows/{rowIndex}/open', [PanelController::class, 'openRow']);
        Route::post('/panels/{panelId}/rows/{rowIndex}/close', [PanelController::class, 'closeRow']);
        Route::post('/panels/{panelId}/shelves/{shelfId}/open', [PanelController::class, 'openShelf']);
        Route::post('/panels/{panelId}/shelves/{shelfId}/close', [PanelController::class, 'closeShelf']);
    });

    // Action logs
    Route::get('/action-logs', [ActionLogController::class, 'index']);
    Route::get('/action-logs/{id}', [ActionLogController::class, 'show']);

    // Documents
    Route::get('/documents/filters', [DocumentController::class, 'filters']);
    Route::get('/documents/{document}/status-history', [DocumentController::class, 'statusHistory']);
    Route::apiResource('documents', DocumentController::class)->except(['create', 'edit']);
});

