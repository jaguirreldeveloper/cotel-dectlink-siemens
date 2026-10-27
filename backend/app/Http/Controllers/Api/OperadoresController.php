<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestión de Operadores y Matriz de Accesos por Rol (RBAC).
 *
 * La escritura (alta/baja/cambio de operadores) está reservada a SUPERADMIN,
 * exigido además por el middleware `role:superadmin` de la ruta. El método
 * `ensureAdmin` aporta defensa en profundidad y resuelve al operador actual
 * para las autoprotecciones (no auto-desactivarse / no auto-bajarse de rol).
 */
class OperadoresController extends Controller
{
    /**
     * Listar todos los operadores registrados.
     */
    public function index(Request $request): JsonResponse
    {
        $operadores = Operador::query()
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn (Operador $op): array => [
                'id' => $op->id,
                'email' => $op->email,
                'nombre' => $op->nombre,
                'role' => $op->rolCanonico(),
                'activo' => (bool) $op->activo,
                'lastLoginAt' => $op->last_login_at?->toISOString(),
                'createdAt' => $op->created_at?->toISOString(),
                'updatedAt' => $op->updated_at?->toISOString(),
            ]);

        return response()->json($operadores);
    }

    /**
     * Crear un nuevo operador.
     */
    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', 'unique:operadores,email'],
            'nombre' => ['nullable', 'string', 'max:255'],
            'role' => ['required', 'string', Rule::in(Operador::ROLES)],
            'password' => ['required', 'string', 'min:8'],
            'activo' => ['nullable', 'boolean'],
        ], [
            'email.required' => 'El correo electrónico es requerido.',
            'email.email' => 'Ingrese un correo electrónico válido.',
            'email.unique' => 'Ya existe un operador con este correo electrónico.',
            'role.in' => 'El rol no es válido. Roles válidos: '.implode(', ', Operador::ROLES).'.',
            'password.required' => 'La contraseña es requerida.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ]);

        $operador = Operador::create([
            'email' => strtolower(trim((string) $validated['email'])),
            'nombre' => isset($validated['nombre']) && trim((string) $validated['nombre']) !== '' ? trim((string) $validated['nombre']) : null,
            'role' => strtoupper((string) $validated['role']),
            'password' => (string) $validated['password'],
            'activo' => $validated['activo'] ?? true,
        ]);

        return response()->json([
            'message' => 'Operador creado exitosamente.',
            'operador' => [
                'id' => $operador->id,
                'email' => $operador->email,
                'nombre' => $operador->nombre,
                'role' => $operador->rolCanonico(),
                'activo' => (bool) $operador->activo,
                'lastLoginAt' => null,
                'createdAt' => $operador->created_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * Actualizar datos, rol o contraseña de un operador.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $currentAuth = $this->ensureAdmin($request);

        $operador = Operador::query()->findOrFail($id);

        $validated = $request->validate([
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('operadores', 'email')->ignore($operador->id)],
            'nombre' => ['nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'string', Rule::in(Operador::ROLES)],
            'password' => ['nullable', 'string', 'min:8'],
            'activo' => ['sometimes', 'boolean'],
        ], [
            'email.email' => 'Ingrese un correo electrónico válido.',
            'email.unique' => 'Ese correo ya está registrado por otro operador.',
            'role.in' => 'El rol no es válido. Roles válidos: '.implode(', ', Operador::ROLES).'.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
        ]);

        // Evitar que el administrador se desactive o se quite su rol a sí mismo
        if ($currentAuth instanceof Operador && $currentAuth->id === $operador->id) {
            if (isset($validated['activo']) && ! $validated['activo']) {
                return response()->json([
                    'message' => 'No puede desactivar su propia cuenta de administrador.',
                ], 422);
            }
            if (isset($validated['role']) && strtoupper((string) $validated['role']) !== Operador::ROLE_SUPERADMIN) {
                return response()->json([
                    'message' => 'No puede revocar su propio rol de SUPERADMIN.',
                ], 422);
            }
        }

        $rotarNonce = false;

        if (isset($validated['email'])) {
            $operador->email = strtolower(trim((string) $validated['email']));
        }
        if (array_key_exists('nombre', $validated)) {
            $operador->nombre = $validated['nombre'] ? trim((string) $validated['nombre']) : null;
        }
        if (isset($validated['role'])) {
            $operador->role = strtoupper((string) $validated['role']);
        }
        if (isset($validated['activo'])) {
            $operador->activo = (bool) $validated['activo'];
        }
        if (! empty($validated['password'])) {
            $operador->password = (string) $validated['password'];
            $rotarNonce = true; // El restablecimiento de clave revoca las sesiones activas
        }

        $operador->save();

        if ($rotarNonce) {
            $operador->rotarNonceDeTokens();
        }

        return response()->json([
            'message' => 'Operador actualizado exitosamente.',
            'operador' => [
                'id' => $operador->id,
                'email' => $operador->email,
                'nombre' => $operador->nombre,
                'role' => $operador->rolCanonico(),
                'activo' => (bool) $operador->activo,
                'lastLoginAt' => $operador->last_login_at?->toISOString(),
                'updatedAt' => $operador->updated_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Eliminar o desactivar un operador.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $currentAuth = $this->ensureAdmin($request);

        $operador = Operador::query()->findOrFail($id);

        if ($currentAuth instanceof Operador && $currentAuth->id === $operador->id) {
            return response()->json([
                'message' => 'No puede eliminar su propia cuenta de administrador activa.',
            ], 422);
        }

        $email = $operador->email;
        $operador->delete();

        return response()->json([
            'message' => "Operador {$email} eliminado exitosamente.",
        ]);
    }

    /**
     * Retorna la matriz canónica de roles y permisos del sistema (RBAC).
     *
     * Cada permiso indica, por rol canónico, si está permitido (true/false),
     * para que el frontend renderice una columna por rol dinámicamente.
     */
    public function permissions(): JsonResponse
    {
        $matrix = [
            'roles' => [
                [
                    'id' => Operador::ROLE_SUPERADMIN,
                    'nombre' => 'Jefatura Técnica & Sistemas',
                    'descripcion' => 'Control total del sistema: gestión de operadores, consola SQL, calibración de planta externa y despacho de OTs.',
                    'nivel' => 'Nivel 1 · Acceso Total',
                    'color' => 'amber',
                ],
                [
                    'id' => Operador::ROLE_SUPERVISOR,
                    'nombre' => 'Ingeniero de Red DECTlink & Regulación ATT',
                    'descripcion' => 'Ingeniería de red: calibración GPS, estados de servicio, despacho de OTs y auditoría técnica de planta externa.',
                    'nivel' => 'Nivel 2 · Ingeniería',
                    'color' => 'violet',
                ],
                [
                    'id' => Operador::ROLE_DESPACHADOR,
                    'nombre' => 'Coordinador de Cuadrillas & Despacho de OTs',
                    'descripcion' => 'Despacho operativo: creación y seguimiento de órdenes de trabajo, gestión de cuadrillas y materiales.',
                    'nivel' => 'Nivel 3 · Operativo',
                    'color' => 'indigo',
                ],
                [
                    'id' => Operador::ROLE_TECNICO,
                    'nombre' => 'Técnico de Planta Externa & Instalador FAU',
                    'descripcion' => 'Acceso operativo y de consulta: mapas GIS, simulación de enlaces RF, visualización del padrón y fichas ATT.',
                    'nivel' => 'Nivel 4 · Campo',
                    'color' => 'sky',
                ],
                [
                    'id' => Operador::ROLE_AUDITOR,
                    'nombre' => 'Auditor Regulatorio ATT & Consulta Comercial',
                    'descripcion' => 'Consulta regulatoria y comercial: padrón, fichas oficiales, mapas GIS y reportes para la ATT.',
                    'nivel' => 'Nivel 5 · Consulta',
                    'color' => 'slate',
                ],
            ],
            'modulos' => [
                [
                    'categoria' => 'Planta Externa & Abonados DECTlink',
                    'permisos' => [
                        $this->permiso(
                            'subscribers.view',
                            'Consulta y búsqueda en el padrón maestro de abonados (216 líneas)',
                            'Visualización de datos técnicos de contrato, celular, modelo FAU y señal DECT.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'subscribers.export',
                            'Exportación de datos de abonados a CSV y reportes técnicos',
                            'Descarga de datos tabulares para análisis externo.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'subscribers.status',
                            'Modificación de estados de servicio y operativos (C/SERV, FALLA, etc.)',
                            'Impacta la bitácora transaccional y el estado comercial de la línea en Supabase.',
                            [Operador::ROLE_SUPERADMIN, Operador::ROLE_SUPERVISOR]
                        ),
                        $this->permiso(
                            'subscribers.gps',
                            'Calibración y registro de nuevas coordenadas GPS en mapa',
                            'Recalcula distancia geodésica y azimut a la celda RFP Siemens.',
                            [Operador::ROLE_SUPERADMIN, Operador::ROLE_SUPERVISOR]
                        ),
                    ],
                ],
                [
                    'categoria' => 'Cuadrillas de Campo & Órdenes de Trabajo',
                    'permisos' => [
                        $this->permiso(
                            'work_orders.view',
                            'Visualización del tablero Kanban de órdenes de trabajo en tiempo real (SSE)',
                            'Seguimiento de OTs pendientes, en proceso y completadas en el área EAI.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'work_orders.manage',
                            'Creación, asignación, modificación y cierre de órdenes de trabajo',
                            'Despacho formal de cuadrillas a terreno con asignación de materiales.',
                            [Operador::ROLE_SUPERADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR]
                        ),
                        $this->permiso(
                            'cuadrillas.manage',
                            'Administración del catálogo de cuadrillas de planta externa',
                            'Alta, baja y actualización de vehículos y técnicos asignados.',
                            [Operador::ROLE_SUPERADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR]
                        ),
                        $this->permiso(
                            'materiales.manage',
                            'Control de inventario y catálogo de materiales (cables, antenas, conectores)',
                            'Registro de insumos de telecomunicaciones y control de existencias.',
                            [Operador::ROLE_SUPERADMIN, Operador::ROLE_SUPERVISOR, Operador::ROLE_DESPACHADOR]
                        ),
                    ],
                ],
                [
                    'categoria' => 'Herramientas de Ingeniería RF & Regulación',
                    'permisos' => [
                        $this->permiso(
                            'rf.simulate',
                            'Simulador de Línea de Vista RF (ITU-R P.525, zona de Fresnel, FSL)',
                            'Cálculo de propagación electromagnética para enlaces en banda 1880–1900 MHz.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'tech_migration.simulate',
                            'Planificador y calculador financiero de migración a GPON / LTE',
                            'Modelado de CAPEX, OPEX y retorno de inversión por abonado.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'official_sheets.print',
                            'Generación de fichas oficiales ATT con código IPEI Siemens y QR',
                            'Documentación técnica oficial exigida por la entidad regulatoria.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'gis.coverage',
                            'Visualización de cobertura GIS de celdas RFP Siemens y exportación KML/GeoJSON',
                            'Inspección de radios de cobertura de celdas Mercedario, Cosmos 79, Senkata y Tilata.',
                            Operador::ROLES
                        ),
                    ],
                ],
                [
                    'categoria' => 'Base de Datos & Seguridad del Sistema',
                    'permisos' => [
                        $this->permiso(
                            'database.schema_view',
                            'Exploración de tablas, columnas e información del esquema PostgreSQL',
                            'Inspección técnica de metadatos de Supabase Cloud.',
                            Operador::ROLES
                        ),
                        $this->permiso(
                            'database.sql_console',
                            'Consola interactiva SQL (consultas protegidas por SqlGuard)',
                            'Solo SUPERADMIN para diagnósticos directos sobre el esquema COTEL.',
                            [Operador::ROLE_SUPERADMIN]
                        ),
                        $this->permiso(
                            'database.csv_upload',
                            'Carga y consolidación masiva de padrón desde archivo CSV',
                            'Actualiza el padrón completo normalizando zonas y titulares.',
                            [Operador::ROLE_SUPERADMIN]
                        ),
                        $this->permiso(
                            'users.manage',
                            'Módulo de Usuarios: crear operadores, asignar roles y restablecer claves',
                            'Administración de cuentas con acceso al sistema COTEL DECTlink.',
                            [Operador::ROLE_SUPERADMIN]
                        ),
                    ],
                ],
            ],
        ];

        return response()->json($matrix);
    }

    /**
     * Construye un ítem de permiso con el mapa de roles permitido/bloqueado.
     *
     * @param  array<int, string>  $permitidos
     * @return array{clave: string, descripcion: string, detalle: string, roles: array<string, bool>}
     */
    private function permiso(string $clave, string $descripcion, string $detalle, array $permitidos): array
    {
        $roles = array_fill_keys(Operador::ROLES, false);
        foreach ($permitidos as $rol) {
            $roles[$rol] = true;
        }

        return [
            'clave' => $clave,
            'descripcion' => $descripcion,
            'detalle' => $detalle,
            'roles' => $roles,
        ];
    }

    /**
     * Garantiza que la petición tenga privilegios de SUPERADMIN.
     *
     * Aporta defensa en profundidad al middleware `role:superadmin` de la ruta
     * y resuelve al operador actual para las autoprotecciones. El token
     * administrativo de servidor (x-admin-token) tiene acceso total para CLI.
     */
    private function ensureAdmin(Request $request): ?Operador
    {
        $operador = OperatorToken::resolve($request);

        if ($operador !== null && $operador->esSuperadmin()) {
            return $operador;
        }

        $expected = config('cotel.admin_token');
        $provided = $request->header('x-admin-token', '');

        if ($expected && $provided !== '' && hash_equals($expected, $provided)) {
            return null; // Autenticado vía token administrativo de servidor
        }

        if ($operador !== null) {
            abort(403, 'Acceso denegado: se requiere rol de SUPERADMIN.');
        }

        abort(401, 'No autenticado o sesión inválida.');
    }
}
