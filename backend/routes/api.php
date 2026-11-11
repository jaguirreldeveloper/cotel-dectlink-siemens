<?php

use App\Http\Controllers\Api\ArmariosController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CellsController;
use App\Http\Controllers\Api\CentralesController;
use App\Http\Controllers\Api\CuadrillasController;
use App\Http\Controllers\Api\DatabaseController;
use App\Http\Controllers\Api\EventsController;
use App\Http\Controllers\Api\GitController;
use App\Http\Controllers\Api\LogsController;
use App\Http\Controllers\Api\MaterialesController;
use App\Http\Controllers\Api\OperadoresController;
use App\Http\Controllers\Api\PadronCargasController;
use App\Http\Controllers\Api\SheltersController;
use App\Http\Controllers\Api\SubcentralesController;
use App\Http\Controllers\Api\SubscribersController;
use App\Http\Controllers\Api\WorkOrdersController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API COTEL DECTlink (paths idénticos al backend Express original)
|--------------------------------------------------------------------------
| server.ts (Express) → este archivo. Los payloads son de paridad exacta:
| el frontend React no requiere cambios.
|
| Seguridad: el login está limitado a 6 intentos/minuto. Todas las lecturas
| exigen sesión de operador (`operator`); las escrituras siguen protegidas
| por rol (RBAC).
*/

// Autenticación de Operadores
// Rate limiting: login (6/min), logout (10/min)
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::get('auth/me', [AuthController::class, 'me']);
Route::post('auth/logout', [AuthController::class, 'logout'])->middleware('throttle:auth');

// Tiempo real (SSE): `EventSource` no admite cabeceras, así que el token viaja
// como query param (?token=...). El controlador valida ese token o las
// cabeceras habituales y responde 401 si no hay sesión válida.
Route::get('events', [EventsController::class, 'stream']);

// ===========================================================================
// LECTURAS AUTENTICADAS
// El middleware `operator` acepta el token de sesión o, para CLI, el
// x-admin-token de servidor. Sin credenciales válidas responde 401.
// ===========================================================================
Route::middleware('operator')->group(function (): void {
    // Gestión de Operadores y Matriz de Roles (lectura)
    Route::get('operadores/permissions', [OperadoresController::class, 'permissions']);
    Route::get('operadores', [OperadoresController::class, 'index']);

    // Padrón y celdas
    Route::get('subscribers', [SubscribersController::class, 'index']);
    Route::get('cells', [CellsController::class, 'index']);
    Route::get('cells/{id}/bitacora', [CellsController::class, 'bitacora']);

    // Órdenes de trabajo, cuadrillas y materiales
    Route::get('work-orders', [WorkOrdersController::class, 'index']);
    Route::get('cuadrillas', [CuadrillasController::class, 'index']);
    Route::get('materiales', [MaterialesController::class, 'index']);

    // Bitácora
    Route::get('logs', [LogsController::class, 'index']);

    // Metadatos de base de datos
    Route::get('database/status', [DatabaseController::class, 'status']);
    Route::get('database/schema', [DatabaseController::class, 'schema']);
    Route::get('database/connection-info', [DatabaseController::class, 'connectionInfo']);
    Route::get('database/export-sql', [DatabaseController::class, 'exportSql']);
    Route::get('database/tables/{table}/data', [DatabaseController::class, 'tableData']);

    // Estado Git (stub no administrativo: solo informa que no está disponible)
    Route::get('git/status', [GitController::class, 'status']);

    // Catálogos de infraestructura
    Route::get('centrales', [CentralesController::class, 'index']);
    Route::get('subcentrales', [SubcentralesController::class, 'index']);
    Route::get('shelters', [SheltersController::class, 'index']);
    Route::get('armarios', [ArmariosController::class, 'index']);
});

// ===========================================================================
// ESCRITURAS Y HERRAMIENTAS ADMINISTRATIVAS — RBAC
// El header x-admin-token (token de servidor) conserva acceso total para CLI.
// ===========================================================================

// Calibración GPS y estados de servicio: Jefatura / Administración Operativa / Ingeniería.
// Rate limiting: 10 solicitudes/minuto para cambios de estado y coordenadas
Route::middleware(['role:superadmin,admin,supervisor', 'throttle:padron-write'])->group(function (): void {
    Route::patch('subscribers/{nro}/status', [SubscribersController::class, 'updateStatus']);
    Route::patch('subscribers/{nro}/coordinates', [SubscribersController::class, 'updateCoordinates']);
});

// Despacho de cuadrillas, órdenes de trabajo y materiales: Jefatura / Administración Operativa / Ingeniería / Despacho.
// Rate limiting: 20 solicitudes/minuto para OTs, 30 para recursos
Route::middleware(['role:superadmin,admin,supervisor,despachador', 'throttle:work-orders-write'])->group(function (): void {
    Route::post('work-orders', [WorkOrdersController::class, 'store']);
    Route::patch('work-orders/{id}', [WorkOrdersController::class, 'update']);
    Route::delete('work-orders/{id}', [WorkOrdersController::class, 'destroy']);
});

Route::middleware(['role:superadmin,admin,supervisor,despachador', 'throttle:resources-write'])->group(function (): void {
    Route::post('cuadrillas', [CuadrillasController::class, 'store']);
    Route::patch('cuadrillas/{id}', [CuadrillasController::class, 'update']);
    Route::delete('cuadrillas/{id}', [CuadrillasController::class, 'destroy']);

    Route::post('materiales', [MaterialesController::class, 'store']);
    Route::patch('materiales/{id}', [MaterialesController::class, 'update']);
    Route::delete('materiales/{id}', [MaterialesController::class, 'destroy']);
});

// Gestión de usuarios, consola SQL, conexión y Git: exclusivo de SUPERADMIN.
// Rate limiting: 8/min para operadores, 5/min para consultas SQL
Route::middleware(['role:superadmin', 'throttle:operadores-write'])->group(function (): void {
    Route::post('operadores', [OperadoresController::class, 'store']);
    Route::patch('operadores/{id}', [OperadoresController::class, 'update']);
    Route::delete('operadores/{id}', [OperadoresController::class, 'destroy']);
});

Route::middleware(['role:superadmin', 'throttle:database-query'])->group(function (): void {
    Route::post('database/query', [DatabaseController::class, 'query']);
    Route::post('database/test-connection', [DatabaseController::class, 'testConnection']);
    Route::post('database/apply-connection', [DatabaseController::class, 'applyConnection']);

    Route::post('git/init', [GitController::class, 'init']);
    Route::post('git/remote', [GitController::class, 'remote']);
});

// ===========================================================================
// INFRAESTRUCTURA JERÁRQUICA (centrales → subcentrales → shelters → armarios)
// Escritura SUPERADMIN/ADMIN (crear/editar/desactivar) y borrado físico
// exclusivo de SUPERADMIN. Celdas ← asignar subcentral: ADMIN+.
// Rate limiting: 15 solicitudes/minuto para operaciones de infraestructura
// ===========================================================================
Route::middleware(['role:superadmin,admin', 'throttle:infraestructura-write'])->group(function (): void {
    Route::post('centrales', [CentralesController::class, 'store']);
    Route::patch('centrales/{central}', [CentralesController::class, 'update']);
    Route::post('centrales/{central}/deactivate', [CentralesController::class, 'deactivate']);

    Route::post('subcentrales', [SubcentralesController::class, 'store']);
    Route::patch('subcentrales/{subcentral}', [SubcentralesController::class, 'update']);
    Route::post('subcentrales/{subcentral}/deactivate', [SubcentralesController::class, 'deactivate']);

    Route::post('shelters', [SheltersController::class, 'store']);
    Route::patch('shelters/{shelter}', [SheltersController::class, 'update']);
    Route::post('shelters/{shelter}/deactivate', [SheltersController::class, 'deactivate']);

    Route::post('armarios', [ArmariosController::class, 'store']);
    Route::patch('armarios/{armario}', [ArmariosController::class, 'update']);
    Route::post('armarios/{armario}/deactivate', [ArmariosController::class, 'deactivate']);

    // Asignación de la subcentral de servicio de una celda (RFP)
    Route::patch('cells/{id}/subcentral', [CellsController::class, 'asignarSubcentral']);

    // CRUD de celdas (RFP): crear y editar (ADMIN+)
    Route::post('cells', [CellsController::class, 'store']);
    Route::patch('cells/{id}', [CellsController::class, 'update']);
});

// Borrado físico de infraestructura: exclusivo de SUPERADMIN (jamás ADMIN).
Route::middleware('role:superadmin')->group(function (): void {
    Route::delete('centrales/{central}', [CentralesController::class, 'destroy']);
    Route::delete('subcentrales/{subcentral}', [SubcentralesController::class, 'destroy']);
    Route::delete('shelters/{shelter}', [SheltersController::class, 'destroy']);
    Route::delete('armarios/{armario}', [ArmariosController::class, 'destroy']);
    Route::delete('cells/{id}', [CellsController::class, 'destroy']);
});

// ===========================================================================
// CARGA DEL PADRÓN POR LOTE (dry-run + aplicación)
// Lectura de lotes (index/show): SUPERADMIN/ADMIN, sin rate limit — son
// consultas baratas y el límite por IP bloqueaba a varios operadores detrás
// de la misma NAT al listar lotes.
// Escritura (subida, anulación): 10/min por IP. Sigue siendo una operación
// pesada, pero un flujo legítimo (cargar → aplicar → recargar → anular)
// superaba el límite anterior de 3/min.
// ===========================================================================
Route::middleware('role:superadmin,admin')->group(function (): void {
    Route::get('padron/cargas', [PadronCargasController::class, 'index']);
    Route::get('padron/cargas/{id}', [PadronCargasController::class, 'show']);
});

Route::middleware(['role:superadmin,admin', 'throttle:padron-cargas'])->group(function (): void {
    Route::post('padron/cargas', [PadronCargasController::class, 'store']);
    Route::post('padron/cargas/{id}/anular', [PadronCargasController::class, 'anular']);
});

// Aplicar el lote: exclusivo de SUPERADMIN.
Route::middleware(['role:superadmin', 'throttle:padron-cargas'])->group(function (): void {
    Route::post('padron/cargas/{id}/apply', [PadronCargasController::class, 'apply']);
});
