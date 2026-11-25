<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operador;
use App\Support\OperatorToken;
use Carbon\Carbon;
use Carbon\CarbonInterface;
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
                'lastLoginAt' => ($v = $op->getAttribute('last_login_at')) !== null ? Carbon::parse($v)->toISOString() : null,
                'createdAt' => $op->created_at instanceof CarbonInterface ? $op->created_at->toISOString() : null,
                'updatedAt' => $op->updated_at instanceof CarbonInterface ? $op->updated_at->toISOString() : null,
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
                'createdAt' => $operador->created_at instanceof CarbonInterface ? $operador->created_at->toISOString() : null,
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
                'lastLoginAt' => ($v = $operador->getAttribute('last_login_at')) !== null ? Carbon::parse($v)->toISOString() : null,
                'updatedAt' => $operador->updated_at instanceof CarbonInterface ? $operador->updated_at->toISOString() : null,
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
        $modulos = [];
        foreach (config('permissions.modulos', []) as $modulo) {
            $permisos = [];
            foreach ($modulo['permisos'] as $permiso) {
                $mapa = array_fill_keys(Operador::ROLES, false);
                foreach ($permiso['roles'] as $rol) {
                    $mapa[$rol] = true;
                }
                $permisos[] = [
                    'clave' => $permiso['clave'],
                    'descripcion' => $permiso['descripcion'],
                    'detalle' => $permiso['detalle'],
                    'roles' => $mapa,
                ];
            }
            $modulos[] = ['categoria' => $modulo['categoria'], 'permisos' => $permisos];
        }

        return response()->json([
            'roles' => config('permissions.roles', []),
            'modulos' => $modulos,
        ]);
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
