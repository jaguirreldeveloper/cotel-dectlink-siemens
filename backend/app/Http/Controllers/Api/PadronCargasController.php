<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cell;
use App\Models\Client;
use App\Models\Operador;
use App\Models\PadronCarga;
use App\Models\PadronCargaDetalle;
use App\Models\Subscriber;
use App\Models\Zone;
use App\Support\OperatorToken;
use App\Support\PadronBatchLoader;
use App\Support\PadronCache;
use App\Support\SseHub;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

/**
 * Carga del padrón por lote (dry-run + aplicación).
 *
 * Flujo: SUPERADMIN/ADMIN sube el CSV → el lote queda en PENDIENTE con las
 * sugerencias (NUEVO/ACTUALIZAR/SIN_CAMBIOS/RECHAZADO) y conteos por acción
 * y ciudad; solo SUPERADMIN aplica (crea/actualiza abonados_lineas) o anula.
 * Las filas RECHAZADO y SIN_CAMBIOS jamás se traducen en escrituras.
 */
class PadronCargasController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(PadronCarga::query()
            ->orderByDesc('id')
            ->get()
            ->map(fn (PadronCarga $carga): array => $this->serializarCarga($carga))
            ->values());
    }

    /**
     * POST /api/padron/cargas — sube el CSV (multipart `archivo` o campo `csv`)
     * y crea el lote en PENDIENTE con el dry-run completo.
     */
    #[OA\Post(path: '/api/padron/cargas', tags: ['Padron'], summary: 'Cargar CSV del padrón y crear lote en PENDIENTE (SUPERADMIN/ADMIN)')]
    #[OA\RequestBody(required: true, content: new OA\JsonContent(properties: [
        new OA\Property(property: 'csv', type: 'string', description: 'Contenido del CSV (alternativa al multipart `archivo`)'),
        new OA\Property(property: 'archivo', type: 'string', description: 'Nombre del archivo de origen'),
    ]))]
    #[OA\Response(response: 201, description: 'Lote creado con sugerencias dry-run')]
    #[OA\Response(response: 422, description: 'CSV vacío o sin filas válidas')]
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'csv' => ['required_without:archivo', 'string'],
            'archivo' => ['required_without:csv'],
        ]);

        $subido = $request->file('archivo');
        $csv = (string) ($subido?->getContent() ?? $request->string('csv'));
        $nombreArchivo = $subido?->getClientOriginalName() ?? (string) $request->input('archivo', 'lote-mano.csv');

        $resultado = PadronBatchLoader::procesar($csv);
        if ($resultado['filas'] === []) {
            return response()->json(['message' => 'El CSV no contiene filas procesables'], 422);
        }

        $lote = DB::transaction(function () use ($nombreArchivo, $request, $resultado): PadronCarga {
            $conteo = $resultado['conteo'];
            $acciones = $conteo[PadronCarga::ACCION_NUEVO]
                + $conteo[PadronCarga::ACCION_ACTUALIZAR]
                + $conteo[PadronCarga::ACCION_SIN_CAMBIOS]
                + $conteo[PadronCarga::ACCION_RECHAZADO];

            $lote = PadronCarga::create([
                'archivo' => $nombreArchivo,
                'operador_id' => $this->resolveOperador($request)?->id,
                'total_filas' => $acciones,
                'nuevos' => $conteo[PadronCarga::ACCION_NUEVO],
                'actualizar' => $conteo[PadronCarga::ACCION_ACTUALIZAR],
                'sin_cambios' => $conteo[PadronCarga::ACCION_SIN_CAMBIOS],
                'rechazados' => $conteo[PadronCarga::ACCION_RECHAZADO],
                'la_paz' => $conteo[PadronCarga::CIUDAD_LA_PAZ],
                'el_alto' => $conteo[PadronCarga::CIUDAD_EL_ALTO],
                'sin_ciudad' => $conteo[PadronCarga::CIUDAD_SIN],
                'estado' => PadronCarga::ESTADO_PENDIENTE,
            ]);

            foreach ($resultado['filas'] as $fila) {
                // Las filas RECHAZADO solo afectan los conteos del lote;
                // no se persisten como detalle porque no producen escrituras.
                if ($fila['accion'] === PadronCarga::ACCION_RECHAZADO) {
                    continue;
                }
                $lote->detalles()->create($fila);
            }

            return $lote;
        });

        return response()->json([
            'message' => sprintf(
                'Lote procesado en dry-run: %d nuevos, %d a actualizar, %d sin cambios, %d rechazados.',
                $lote->nuevos, $lote->actualizar, $lote->sin_cambios, $lote->rechazados
            ),
            'lote' => $this->serializarCarga($lote->fresh()),
        ], 201);
    }

    /**
     * GET /api/padron/cargas/{id} — lote + detalle de sugerencias.
     */
    #[OA\Get(path: '/api/padron/cargas/{id}', tags: ['Padron'], summary: 'Detalle del lote con sugerencias')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Lote con su detalle')]
    public function show(int $id): JsonResponse
    {
        $lote = PadronCarga::query()->findOrFail($id);

        return response()->json([
            'lote' => $this->serializarCarga($lote),
            'detalles' => $lote->detalles()
                ->orderBy('id')
                ->get()
                ->map(fn (PadronCargaDetalle $d): array => [
                    'id' => $d->id,
                    'nro' => $d->nro,
                    'numero' => $d->numero,
                    'nombre' => $d->nombre,
                    'direccion' => $d->direccion,
                    'celda' => $d->celda,
                    'ciudad' => $d->ciudad,
                    'accion' => $d->accion,
                    'motivo' => $d->motivo,
                    'camposCambiados' => $d->campos_cambiados,
                ]),
        ]);
    }

    /**
     * POST /api/padron/cargas/{id}/apply — aplica el lote (solo SUPERADMIN).
     *
     * Crea las líneas NUEVO (con su titular) y aplica los cambios ACTUALIZAR
     * sobre abonados_lineas (y clientes.direccion si cambió). Registra cada
     * escritura en la bitácora del padrón y marca el lote APLICADO.
     */
    #[OA\Post(path: '/api/padron/cargas/{id}/apply', tags: ['Padron'], summary: 'Aplicar el lote sobre el padrón (solo SUPERADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Lote aplicado')]
    #[OA\Response(response: 403, description: 'Rol sin permiso')]
    #[OA\Response(response: 409, description: 'Lote no está PENDIENTE o fue modificado')]
    public function apply(Request $request, int $id): JsonResponse
    {
        $lote = PadronCarga::query()->findOrFail($id);

        if ($lote->estado !== PadronCarga::ESTADO_PENDIENTE) {
            return response()->json([
                'message' => "Solo se pueden aplicar lotes PENDIENTE (estado actual: {$lote->estado})",
            ], 409);
        }

        $operador = $this->resolveOperador($request);
        $altas = 0;
        $actualizados = 0;

        DB::transaction(function () use ($lote, $operador, &$altas, &$actualizados): void {
            foreach ($lote->detalles()->where('accion', PadronCarga::ACCION_NUEVO)->get() as $detalle) {
                $this->alta($operador, $detalle);
                $altas++;
            }

            foreach ($lote->detalles()->where('accion', PadronCarga::ACCION_ACTUALIZAR)->get() as $detalle) {
                $this->actualizar($detalle);
                $actualizados++;
            }

            $lote->fill([
                'estado' => PadronCarga::ESTADO_APLICADO,
                'aplicado_por' => $operador?->id,
                'aplicado_en' => now(),
            ])->save();
        });

        // Limpiar cache del padrón ya que se aplicaron cambios
        PadronCache::clear();
        
        SseHub::emit('subscriber_updated', [
            'tipo' => 'lote_aplicado',
            'loteId' => $lote->id,
            'altas' => $altas,
            'actualizados' => $actualizados,
        ]);

        return response()->json([
            'message' => "Lote aplicado: {$altas} altas, {$actualizados} actualizaciones. Cache del padrón limpiado.",
            'lote' => $this->serializarCarga($lote->fresh()),
            'altas' => $altas,
            'actualizados' => $actualizados,
        ]);
    }

    /**
     * POST /api/padron/cargas/{id}/anular — descarta el lote sin aplicar nada.
     */
    #[OA\Post(path: '/api/padron/cargas/{id}/anular', tags: ['Padron'], summary: 'Anular el lote sin aplicarlo (SUPERADMIN/ADMIN)')]
    #[OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))]
    #[OA\Response(response: 200, description: 'Lote anulado')]
    #[OA\Response(response: 409, description: 'Lote no está PENDIENTE')]
    public function anular(int $id): JsonResponse
    {
        $lote = PadronCarga::query()->findOrFail($id);

        if ($lote->estado !== PadronCarga::ESTADO_PENDIENTE) {
            return response()->json([
                'message' => "Solo se pueden anular lotes PENDIENTE (estado actual: {$lote->estado})",
            ], 409);
        }

        $lote->fill(['estado' => PadronCarga::ESTADO_ANULADO])->save();
        
        // No es necesario limpiar el cache al anular, ya que no se aplicaron cambios

        return response()->json([
            'message' => 'Lote anulado sin aplicar cambios.',
            'lote' => $this->serializarCarga($lote->fresh()),
        ]);
    }

    /**
     * Alta de línea + titular, con registro en bitacora.
     */
    private function alta(?Operador $operador, PadronCargaDetalle $detalle): void
    {
        $celda = null;
        if ($detalle->celda !== null) {
            $celda = is_numeric($detalle->celda)
                ? Cell::query()->find((int) $detalle->celda)
                : Cell::query()->where('nombre', $detalle->celda)->first();
        }

        if ($celda === null && isset($detalle->campos_cambiados['id_celda'])) {
            $celda = Cell::query()->find((int) $detalle->campos_cambiados['id_celda']);
        }

        if ($celda === null) {
            throw new \RuntimeException("No se encontró la celda para el abonado: {$detalle->celda}");
        }

        $zonaNombre = $detalle->campos_cambiados['zona'] ?? null;
        $idZona = null;
        if ($zonaNombre) {
            $zona = Zone::query()->firstOrCreate(['nombre' => mb_strtoupper((string) $zonaNombre)]);
            $idZona = $zona->id;
        }

        $titular = Client::query()->firstOrCreate(
            ['nombre_completo' => (string) $detalle->nombre],
            ['direccion' => $detalle->direccion, 'id_zona' => $idZona],
        );
        if ($idZona && ! $titular->id_zona) {
            $titular->id_zona = $idZona;
            $titular->save();
        }

        $nroNuevo = (int) (Subscriber::query()->max('nro') ?? 0) + 1;

        $estadoServicio = $detalle->campos_cambiados['estado_servicio'] ?? 'C/SERV.';
        if ($estadoServicio === 'C/SERV') {
            $estadoServicio = 'C/SERV.';
        } elseif ($estadoServicio === 'S/SERV') {
            $estadoServicio = 'S/SERV.';
        }

        $linea = Subscriber::create([
            'nro' => $nroNuevo,
            'numero_telefono' => $detalle->numero,
            'codigo_area' => $detalle->campos_cambiados['codigo_area'] ?? 'EAI',
            'contrato' => $detalle->campos_cambiados['contrato'] ?? null,
            'id_cliente' => $titular->id,
            'id_celda' => $celda->id,
            'estado_servicio' => $estadoServicio,
            'estado_operativo' => 'C/SERV.',
            'fecha_servicio' => $detalle->campos_cambiados['fecha_servicio'] ?? null,
            'lat' => $this->coordenadaDeCambios($detalle, 'lat'),
            'lng' => $this->coordenadaDeCambios($detalle, 'lng'),
            'nro_registro_origen' => $detalle->nro,
            'archivo_origen' => $detalle->carga?->archivo,
            'zona_origen' => $zonaNombre,
        ]);

        DB::table('bitacora')->insert([
            'abonado_nro' => $linea->nro,
            'estado_anterior' => null,
            'nuevo_estado' => $linea->estado_servicio,
            'detalle' => sprintf('Carga por lote #%d: alta desde padrón (%s)', $detalle->id_carga, $detalle->carga?->archivo),
            'tecnico' => $operador instanceof Operador ? $operador->nombre : 'sistema',
            'timestamp' => now(),
        ]);
    }

    /**
     * Actualización de línea existente con los campos_cambiados del dry-run,
     * pero solo con los valores del lote (el padrón vigente manda si el lote
     * omitió el campo).
     */
    private function actualizar(PadronCargaDetalle $detalle): void
    {
        $linea = Subscriber::query()->where('nro', (int) $detalle->nro)->first();
        if ($linea === null) {
            return; // el padrón cambió desde el dry-run; no se inventa alta
        }

        $cambios = (array) $detalle->campos_cambiados;
        if ($cambios === []) {
            return;
        }

        foreach ($cambios as $campo => $dif) {
            if (! is_array($dif) || ! array_key_exists('despues', $dif)) {
                continue;
            }
            if ($campo === 'direccion') {
                $titular = Client::query()->find($linea->id_cliente);
                $titular?->fill(['direccion' => $dif['despues']])->save();

                continue;
            }
            if ($campo === 'id_celda') {
                $linea->fill(['id_celda' => (int) $dif['despues']]);

                continue;
            }
            $linea->fill([$campo => $dif['despues']]);
        }

        $linea->save();

        DB::table('bitacora')->insert([
            'abonado_nro' => $linea->nro,
            'estado_anterior' => (string) ($cambios['estado_servicio']['antes'] ?? $linea->estado_servicio),
            'nuevo_estado' => (string) ($cambios['estado_servicio']['despues'] ?? $linea->estado_servicio),
            'detalle' => sprintf('Carga por lote #%d: campos actualizados (%s)', $detalle->id_carga, implode(', ', array_keys($cambios))),
            'tecnico' => 'sistema',
            'timestamp' => now(),
        ]);
    }

    /**
     * Coordenada "después" que el lote trajo (solo existe en ACTUALIZAR).
     */
    private function coordenadaDeCambios(PadronCargaDetalle $detalle, string $eje): ?float
    {
        $dif = (array) $detalle->campos_cambiados;

        return isset($dif[$eje]['despues']) && is_numeric($dif[$eje]['despues'])
            ? (float) $dif[$eje]['despues']
            : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializarCarga(PadronCarga $lote): array
    {
        return [
            'id' => $lote->id,
            'archivo' => $lote->archivo,
            'operadorId' => $lote->operador_id,
            'totalFilas' => $lote->total_filas,
            'nuevos' => $lote->nuevos,
            'actualizar' => $lote->actualizar,
            'sinCambios' => $lote->sin_cambios,
            'rechazados' => $lote->rechazados,
            'laPaz' => $lote->la_paz,
            'elAlto' => $lote->el_alto,
            'sinCiudad' => $lote->sin_ciudad,
            'estado' => $lote->estado,
            'aplicadoPor' => $lote->aplicado_por,
            'aplicadoEn' => ($a = $lote->getAttribute('aplicado_en')) instanceof \Carbon\CarbonInterface ? $a->toIso8601String() : null,
            'createdAt' => ($c = $lote->getAttribute('created_at')) instanceof \Carbon\CarbonInterface ? $c->toIso8601String() : null,
        ];
    }

    private function resolveOperador(Request $request): ?Operador
    {
        return OperatorToken::resolve($request);
    }
}
