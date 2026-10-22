<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\SeedsCotelPatron;
use Tests\TestCase;

/**
 * CRUD de órdenes de trabajo: códigos OT-YYYYMMDD-NNN, validaciones 400/404
 * de paridad, puente de materiales y bitácora al cambiar estado.
 */
class WorkOrdersCrudTest extends TestCase
{
    use RefreshDatabase;
    use SeedsCotelPatron;

    private const TOKEN = 'cotel-test-admin-token';

    private int $ordenSeq = 0;

    /** @var list<string> */
    private const EXPECTED_KEYS = [
        'id', 'codigo', 'titulo', 'descripcion', 'tipoTrabajo', 'prioridad',
        'estado', 'cuadrillaId', 'cuadrillaNombre', 'tecnicoLider', 'abonadoNro',
        'materiales', 'fechaProgramada', 'resultadoTecnico', 'fechaCreacion',
        'fechaActualizacion', 'fechaCierre',
    ];

    public function test_index_returns_empty_array_when_there_are_no_orders(): void
    {
        $this->getJson('/api/work-orders')->assertOk()->assertExactJson([]);
    }

    public function test_index_returns_rows_with_parity_keys(): void
    {
        $this->crearOrden(['titulo' => 'Reubicación antena A-17']);

        $response = $this->getJson('/api/work-orders')->assertOk();

        $this->assertSame(self::EXPECTED_KEYS, array_keys($response->json()[0]));
    }

    public function test_index_orders_by_fecha_creacion_descending(): void
    {
        $this->crearOrden(['titulo' => 'Más antigua']);
        $this->crearOrden(['titulo' => 'Más nueva']);

        DB::table('work_orders')->where('titulo', 'Más antigua')
            ->update(['fecha_creacion' => '2026-01-01T00:00:00Z']);
        DB::table('work_orders')->where('titulo', 'Más nueva')
            ->update(['fecha_creacion' => '2026-06-01T00:00:00Z']);

        $titulos = array_column($this->getJson('/api/work-orders')->json(), 'titulo');

        $this->assertSame(['Más nueva', 'Más antigua'], $titulos);
    }

    public function test_store_creates_order_with_sequential_code_and_materials(): void
    {
        $esperado = sprintf('OT-%s-001', now()->format('Ymd'));

        $response = $this->withHeader('x-admin-token', self::TOKEN)->postJson('/api/work-orders', [
            'titulo' => 'Medición RSSI sector norte',
            'descripcion' => 'Campaña de mediciones',
            'prioridad' => 'ALTA',
            'materiales' => [['nombre' => 'Repetidor Siemens', 'cantidad' => 2]],
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('workOrder.codigo', $esperado);
        $response->assertJsonPath('workOrder.estado', 'PENDIENTE');
        $response->assertJsonPath('workOrder.materiales.0.nombre', 'Repetidor Siemens');
        $response->assertJsonPath('workOrder.materiales.0.cantidad', 2);

        // El material se dio de alta en el catálogo.
        $this->assertSame(1, DB::table('materiales')->where('nombre', 'Repetidor Siemens')->count());

        // Siguiente orden del mismo día continúa la numeración.
        $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/work-orders', ['titulo' => 'Segunda OT'])
            ->assertJsonPath('workOrder.codigo', sprintf('OT-%s-002', now()->format('Ymd')));
    }

    public function test_store_forces_en_progreso_when_completado_is_requested(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/work-orders', ['titulo' => 'Sin resultado aún', 'estado' => 'COMPLETADO']);

        $response->assertJsonPath('workOrder.estado', 'EN_PROGRESO');
        $this->assertNull($response->json('workOrder.fechaCierre'));
    }

    public function test_store_rejects_empty_title_with_parity_message(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/work-orders', ['titulo' => '   ']);

        $response->assertStatus(400);
        $this->assertSame('El título de la orden de trabajo es obligatorio', $response->json('error'));
        $this->assertSame(0, DB::table('work_orders')->count());
    }

    public function test_store_rejects_unknown_abonado_with_parity_message(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/work-orders', ['titulo' => 'OT válida', 'abonadoNro' => 999999]);

        $response->assertStatus(400);
        $this->assertSame('No existe un abonado con NRO 999999', $response->json('error'));
    }

    public function test_store_rejects_unknown_cuadrilla_with_parity_message(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->postJson('/api/work-orders', ['titulo' => 'OT válida', 'cuadrillaId' => 'inexistente']);

        $response->assertStatus(400);
        $this->assertSame('No existe una cuadrilla con id inexistente', $response->json('error'));
    }

    public function test_store_requires_admin_token(): void
    {
        $this->postJson('/api/work-orders', ['titulo' => 'Sin token'])->assertStatus(401);

        $this->assertSame(0, DB::table('work_orders')->count());
    }

    public function test_update_patches_fields_and_refreshes_fecha_actualizacion(): void
    {
        $id = $this->crearOrden(['titulo' => 'Título original']);

        // Fija una marca temporal vieja: el PATCH debe refrescarla.
        DB::table('work_orders')->where('id', $id)
            ->update(['fecha_actualizacion' => '2020-01-01T00:00:00Z']);

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", ['titulo' => 'Título corregido', 'prioridad' => 'ALTA']);

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonPath('workOrder.titulo', 'Título corregido');
        $response->assertJsonPath('workOrder.prioridad', 'ALTA');

        $orden = DB::table('work_orders')->where('id', $id)->first();
        $this->assertSame('Título corregido', $orden->titulo);
        $this->assertNotSame('2020-01-01T00:00:00Z', $orden->fecha_actualizacion);
        $this->assertNull($orden->fecha_cierre, 'Sin cambio de estado no se toca la fecha de cierre');
    }

    public function test_update_completado_sets_fecha_cierre_and_writes_bitacora(): void
    {
        $nro = $this->seedAbonado();
        $id = $this->crearOrden(['abonado_nro' => $nro]);

        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", ['estado' => 'COMPLETADO', 'resultadoTecnico' => 'OK']);

        $response->assertOk();
        $this->assertNotNull($response->json('workOrder.fechaCierre'));
        $this->assertSame('OK', $response->json('workOrder.resultadoTecnico'));

        $bitacora = DB::table('bitacora')->where('abonado_nro', $nro)->first();
        $this->assertNotNull($bitacora, 'Completar la OT debe auditar en bitácora');
        $this->assertSame('EN_PROGRESO', $bitacora->estado_anterior);
        $this->assertSame('ORDEN_TRABAJO', $bitacora->nuevo_estado);
        $this->assertSame('Orden de trabajo actualizada', $bitacora->detalle);
    }

    public function test_update_reopening_order_clears_fecha_cierre(): void
    {
        $id = $this->crearOrden();

        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", ['estado' => 'COMPLETADO'])
            ->assertOk();
        $this->assertNotNull(DB::table('work_orders')->where('id', $id)->value('fecha_cierre'));

        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", ['estado' => 'EN_CAMINO'])
            ->assertOk();
        $this->assertNull(DB::table('work_orders')->where('id', $id)->value('fecha_cierre'));
    }

    public function test_update_replaces_materials_upserting_quantities(): void
    {
        $id = $this->crearOrden(['titulo' => 'Con materiales']);

        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", [
                'materiales' => [
                    ['nombre' => 'Cable DECT 50m', 'cantidad' => 3],
                    ['nombre' => 'FAU Siemens', 'cantidad' => 1],
                ],
            ])
            ->assertOk()
            ->assertJsonCount(2, 'workOrder.materiales');

        $cable = DB::table('materiales')->where('nombre', 'Cable DECT 50m')->first();
        $this->assertSame(
            3,
            (int) DB::table('work_order_materiales')
                ->where('work_order_id', $id)
                ->where('material_id', $cable->id)
                ->value('cantidad')
        );
    }

    public function test_update_missing_order_returns_parity_404(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson('/api/work-orders/no-existe', ['titulo' => 'Nada']);

        $response->assertStatus(404);
        $this->assertSame('Orden de trabajo no encontrada', $response->json('error'));
    }

    public function test_update_and_delete_require_admin_token(): void
    {
        $id = $this->crearOrden();

        $this->patchJson("/api/work-orders/{$id}", ['titulo' => 'Bloqueado'])->assertStatus(401);
        $this->deleteJson("/api/work-orders/{$id}")->assertStatus(401);

        $this->assertNotNull(DB::table('work_orders')->find($id));
    }

    public function test_delete_removes_order_and_materials(): void
    {
        $id = $this->crearOrden();
        $this->withHeader('x-admin-token', self::TOKEN)
            ->patchJson("/api/work-orders/{$id}", ['materiales' => [['nombre' => 'Antena DECT', 'cantidad' => 1]]]);

        $response = $this->withHeader('x-admin-token', self::TOKEN)->deleteJson("/api/work-orders/{$id}");

        $response->assertOk()->assertExactJson(['success' => true]);
        $this->assertNull(DB::table('work_orders')->find($id));
        $this->assertSame(0, DB::table('work_order_materiales')->where('work_order_id', $id)->count());
    }

    public function test_delete_missing_order_returns_parity_404(): void
    {
        $response = $this->withHeader('x-admin-token', self::TOKEN)->deleteJson('/api/work-orders/no-existe');

        $response->assertStatus(404);
        $this->assertSame('Orden de trabajo no encontrada', $response->json('error'));
    }

    /**
     * Crea una orden directamente en BD (id UUID autogenerado por el esquema).
     *
     * @param  array<string, mixed>  $overrides
     */
    private function crearOrden(array $overrides = []): string
    {
        $codigo = $overrides['codigo'] ?? sprintf('TEST-ORD-%03d', ++$this->ordenSeq);

        DB::table('work_orders')->insert(array_merge([
            'codigo' => $codigo,
            'titulo' => 'Orden de prueba',
            'estado' => 'PENDIENTE',
            'prioridad' => 'MEDIA',
            'tipo_trabajo' => 'REUBICACION_ANTENA',
        ], $overrides));

        return (string) DB::table('work_orders')->where('codigo', $codigo)->value('id');
    }
}
