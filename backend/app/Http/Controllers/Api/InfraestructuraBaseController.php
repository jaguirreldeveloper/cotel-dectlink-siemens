<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Base de los 4 CRUDs de Infraestructura jerárquica (RBAC).
 *
 * Reglas de negocio comunes:
 *  - Escritura reservada por el middleware de ruta a SUPERADMIN y ADMIN.
 *  - El borrado físico queda en rutas exclusivas de SUPERADMIN; el flujo
 *    normal de baja es `activo=false` (DESACTIVAR en bitácora).
 *  - Toda escritura queda registrada en infraestructura_bitacora.
 */
abstract class InfraestructuraBaseController extends Controller
{
    /**
     * Serializa una fila de cualquiera de las 4 tablas del módulo.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return array<string, mixed>
     */
    abstract protected function serializar(Model $model): array;

    /**
     * Clase del modelo gestionado (p. ej. Central::class).
     */
    abstract protected function modelo(): string;

    /**
     * Nombre de la tabla para la bitácora (p. ej. 'centrales').
     */
    abstract protected function nombreTabla(): string;

    public function index(): JsonResponse
    {
        $clase = $this->modelo();

        /** @var Model $modelo */
        $modelo = new $clase;

        $filas = $modelo->newQuery()
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn (Model $f): array => $this->serializar($f))
            ->values();

        return response()->json($filas);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request);

        $clase = $this->modelo();
        /** @var Model $fila */
        $fila = $clase::create($validated);
        $this->registrar(InfraestructuraBitacora::ACCION_CREAR, $fila, $this->resolveOperador($request));

        return response()->json([
            'message' => $this->etiqueta().' creado exitosamente.',
            'fila' => $this->serializar($fila),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $clase = $this->modelo();
        /** @var Model $fila */
        $fila = $clase::query()->findOrFail($id);

        $validated = $this->validate($request, true);
        $antes = $this->serializar($fila);

        $fila->fill($validated);
        $fila->save();

        $this->registrar(InfraestructuraBitacora::ACCION_MODIFICAR, $fila, $this->resolveOperador($request), $antes);

        return response()->json([
            'message' => $this->etiqueta().' actualizado exitosamente.',
            'fila' => $this->serializar($fila),
        ]);
    }

    /**
     * Baja lógica (activo=false). Accesible a SUPERADMIN y ADMIN.
     */
    public function deactivate(Request $request, int $id): JsonResponse
    {
        $clase = $this->modelo();
        /** @var Model $fila */
        $fila = $clase::query()->findOrFail($id);

        $antes = $this->serializar($fila);

        $fila->fill(['activo' => false]);
        $fila->save();

        $this->registrar(InfraestructuraBitacora::ACCION_DESACTIVAR, $fila, $this->resolveOperador($request), $antes);

        return response()->json([
            'message' => $this->etiqueta().' desactivado exitosamente.',
            'fila' => $this->serializar($fila),
        ]);
    }

    /**
     * Borrado físico. Exclusivo de SUPERADMIN (middleware de ruta role:superadmin).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $clase = $this->modelo();
        /** @var Model $fila */
        $fila = $clase::query()->findOrFail($id);

        if (method_exists($this, 'autorizarBorrado')) {
            $this->autorizarBorrado($request, $id);
        }

        $antes = $this->serializar($fila);

        $fila->delete();

        $op = $this->resolveOperador($request);
        InfraestructuraBitacora::create([
            'tabla' => $this->nombreTabla(),
            'registro_id' => $id,
            'accion' => InfraestructuraBitacora::ACCION_ELIMINAR,
            'operador_id' => $op?->id,
            'payload' => ['antes' => $antes],
        ]);

        return response()->json([
            'message' => $this->etiqueta().' eliminado fisicamente.',
        ]);
    }

    /**
     * Reglas de validación por tabla. $idActual > 0 en edición, para excluir
     * el propio registro en las reglas UNIQUE.
     *
     * @return array<string, mixed>
     */
    abstract protected function reglas(bool $soloOpcionales, int $idActual = 0): array;

    /**
     * Marca los campos obligatorios del nivel: `required` en creación,
     * `sometimes` en edición.
     *
     * @param  array<string, list<string>>  $reglas
     * @param  list<string>  $obligatorios
     * @return array<string, mixed>
     */
    protected function obligatorios(array $reglas, array $obligatorios, bool $soloOpcionales): array
    {
        foreach ($obligatorios as $campo) {
            $reglas[$campo] = [$soloOpcionales ? 'sometimes' : 'required', ...($reglas[$campo] ?? [])];
        }

        return $reglas;
    }

    /**
     * @return array<string, mixed>
     */
    protected function validate(Request $request, bool $soloOpcionales = false): array
    {
        $idActual = (int) ($request->route($this->paramRuta()) ?? 0);

        return $request->validate($this->reglas($soloOpcionales, $idActual));
    }

    /** Nombre del parámetro de ruta del id (p. ej. 'central' en central/{central}). */
    abstract protected function paramRuta(): string;

    /** Etiqueta legible para mensajes (p. ej. 'Central'). */
    abstract protected function etiqueta(): string;

    protected function resolveOperador(Request $request): ?Operador
    {
        return OperatorToken::resolve($request);
    }

    /**
     * @param  array<string, mixed>  $antes
     */
    protected function registrar(string $accion, Model $fila, ?Operador $operador, array $antes = []): void
    {
        InfraestructuraBitacora::create([
            'tabla' => $this->nombreTabla(),
            'registro_id' => (int) $fila->getKey(),
            'accion' => $accion,
            'operador_id' => $operador?->id,
            'payload' => $antes === [] ? ['despues' => $this->serializar($fila)] : ['antes' => $antes, 'despues' => $this->serializar($fila)],
        ]);
    }
}
