<?php

use App\Http\Controllers\Api\CellsController;
use App\Http\Controllers\Api\CuadrillasController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\EventsController;
use App\Http\Controllers\Api\GitController;
use App\Http\Controllers\Api\LogsController;
use App\Http\Controllers\Api\MaterialesController;
use App\Http\Controllers\Api\SubscribersController;
use App\Http\Controllers\Api\WorkOrdersController;
use App\Http\Middleware\AdminToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API COTEL DECTlink (paths idénticos al backend Express original)
|--------------------------------------------------------------------------
| server.ts (Express) → este archivo. Los payloads son de paridad exacta:
| el frontend React no requiere cambios.
*/

// Tiempo real (SSE)
Route::get('events', [EventsController::class, 'stream']);

// Padrón y celdas (lectura pública)
Route::get('subscribers', [SubscribersController::class, 'index']);
Route::get('cells', [CellsController::class, 'index']);

// Órdenes de trabajo (lectura pública)
Route::get('work-orders', [WorkOrdersController::class, 'index']);
Route::get('cuadrillas', [CuadrillasController::class, 'index']);
Route::get('materiales', [MaterialesController::class, 'index']);

// Bitácora (lectura pública)
Route::get('logs', [LogsController::class, 'index']);

// Metadatos de base de datos (lectura pública)
Route::get('database/status', [DatabaseController::class, 'status']);
Route::get('database/schema', [DatabaseController::class, 'schema']);
Route::get('database/connection-info', [DatabaseController::class, 'connectionInfo']);
Route::get('database/export-sql', [DatabaseController::class, 'exportSql']);
Route::get('database/tables/{table}/data', [DatabaseController::class, 'tableData']);

// Estado Git (stub no administrativo: solo informa que no está disponible)
Route::get('git/status', [GitController::class, 'status']);

// Escrituras y herramientas administrativas (header x-admin-token)
Route::middleware(AdminToken::class)->group(function (): void {
    Route::patch('subscribers/{nro}/status', [SubscribersController::class, 'updateStatus']);
    Route::patch('subscribers/{nro}/coordinates', [SubscribersController::class, 'updateCoordinates']);

    Route::post('work-orders', [WorkOrdersController::class, 'store']);
    Route::patch('work-orders/{id}', [WorkOrdersController::class, 'update']);
    Route::delete('work-orders/{id}', [WorkOrdersController::class, 'destroy']);

    Route::post('cuadrillas', [CuadrillasController::class, 'store']);
    Route::patch('cuadrillas/{id}', [CuadrillasController::class, 'update']);
    Route::delete('cuadrillas/{id}', [CuadrillasController::class, 'destroy']);

    Route::post('materiales', [MaterialesController::class, 'store']);
    Route::patch('materiales/{id}', [MaterialesController::class, 'update']);
    Route::delete('materiales/{id}', [MaterialesController::class, 'destroy']);

    Route::post('database/query', [DatabaseController::class, 'query']);
    Route::post('database/test-connection', [DatabaseController::class, 'testConnection']);
    Route::post('database/apply-connection', [DatabaseController::class, 'applyConnection']);

    Route::post('git/init', [GitController::class, 'init']);
    Route::post('git/remote', [GitController::class, 'remote']);
});
