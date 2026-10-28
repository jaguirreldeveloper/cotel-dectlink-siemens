<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Operador;
use App\Models\PadronCarga;
use App\Models\Subscriber;
use App\Models\Subcentral;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PadronCargasTest extends TestCase
{
    use RefreshDatabase;

    private int $secuenciaCeldas = 900;

    private function token(Operador $op): string
    {
        return OperatorToken::generate($op);
    }

    private function headers(Operador $op): array
    {
        return ['Authorization' => "Bearer {$this->token($op)}"];
    }

    /**
     * Subcentral con la dirección que denota su ciudad + 1 celda asignada.
     *
     * @return array<array-key, mixed> {sub: Subcentral, celda: string}
     */
    private function subcentralConCelda(string $codigo, string $direccion): array
    {
        $sub = Subcentral::factory()->create(['codigo' => $codigo, 'direccion' => strtoupper($direccion)]);
        ++$this->secuenciaCeldas;
        $celda = Cell::factory()->create(['id' => $this->secuenciaCeldas, 'nombre' => "CELDA RFP {$this->secuenciaCeldas}", 'id_subcentral' => $sub->id]);

        return ['sub' => $sub, 'nombreCelda' => $celda->nombre];
    }

    public function test_admin_crea_lote_dry_run_con_conteos_por_accion_y_ciudad(): void
    {
        $senkata = $this->subcentralConCelda('SUB-SENKATA', 'Senkata - El Alto');
        $tilata = $this->subcentralConCelda('SUB-TILATA', 'Tilata - La Paz');
        $existente = Subscriber::factory()->create();
        $existente->cliente->fill(['direccion' => 'MERCEDES NUMERO 79'])->save();

        $admin = Operador::factory()->admin()->create();

        $csv = implode("\n", [
            'nro,numero_telefono,nombre_completo,direccion,celda,estado_servicio',
            sprintf('9101,28801001,Marza Quispe,"Z. Senkata, EL ALTO",%s,', $senkata['nombreCelda']),
            sprintf('9102,28801002,Juan Poma,"C. Tilata, LA PAZ",%s,', $tilata['nombreCelda']),
            sprintf('%d,%s,%s,%s,,', $existente->nro, $existente->numero_telefono, $existente->cliente->nombre_completo, $existente->cliente->direccion),
            // Duplicado del 9101 → rechazado
            '9101,28801099,Duplicado,"EL ALTO",,',
            // Celda desconocida → rechazado
            '9105,28801005,Otra Persona,"EL ALTO",CELDA-RFP-NO-EXISTE,',
        ]);

        $respuesta = $this->postJson('/api/padron/cargas', ['csv' => $csv, 'archivo' => 'padron.csv'], $this->headers($admin));
        $respuesta->assertCreated();

        $carga = PadronCarga::query()->sole();
        $this->assertSame(2, $carga->nuevos);
        $this->assertSame(0, $carga->actualizar);
        $this->assertSame(1, $carga->sin_cambios);
        $this->assertSame(2, $carga->rechazados);
        $this->assertSame(5, $carga->total_filas);
        $this->assertSame(1, $carga->la_paz);
        $this->assertSame(1, $carga->el_alto);
        $this->assertSame(3, $carga->sin_ciudad);
        $this->assertSame(PadronCarga::ESTADO_PENDIENTE, $carga->estado);

        // El dry-run no toca el padrón: sigue en exactamente 1 línea
        $this->assertSame(1, Subscriber::query()->count());
    }

    public function test_show_expone_detalles_y_motivos(): void
    {
        $senkata = $this->subcentralConCelda('SUB-SENKATA', 'Senkata - El Alto');
        $existente = Subscriber::factory()->create();

        $admin = Operador::factory()->admin()->create();
        $csv = implode("\n", [
            'nro,numero_telefono,nombre_completo,direccion,celda',
            sprintf('9201,28802001,Nueva Marza,"EL ALTO",%s', $senkata['nombreCelda']),
            sprintf('%d,%s,%s,%s,,', $existente->nro, $existente->numero_telefono, $existente->cliente->nombre_completo, $existente->cliente->direccion),
            '9201,28802101,Duplicado,"EL ALTO",',
        ]);

        $id = $this->postJson('/api/padron/cargas', ['csv' => $csv], $this->headers($admin))
            ->assertCreated()
            ->json('lote.id');

        $detalles = $this->getJson("/api/padron/cargas/{$id}", $this->headers($admin))
            ->assertOk()
            ->json('detalles');
        $this->assertCount(2, $detalles);

        $this->assertSame([
            PadronCarga::ACCION_NUEVO,
            PadronCarga::ACCION_ACTUALIZAR,
        ], array_column($detalles, 'accion'));

        // El nuevo queda con la ciudad de su celda (Senkata → El Alto)
        $this->assertSame(PadronCarga::CIUDAD_EL_ALTO, $detalles[0]['ciudad']);
    }

    public function test_superadmin_aplica_y_admin_o_tecnico_no(): void
    {
        $senkata = $this->subcentralConCelda('SUB-SENKATA', 'Senkata - El Alto');
        $existente = Subscriber::factory()->create();

        $admin = Operador::factory()->admin()->create();
        $super = Operador::factory()->superadmin()->create();
        $tecnico = Operador::factory()->tecnico()->create();

        $csv = implode("\n", [
            'nro,numero_telefono,nombre_completo,direccion,celda',
            sprintf('9301,28803001,Alta Nueva,"EL ALTO",%s', $senkata['nombreCelda']),
            sprintf('%d,28899999,%s,%s,,', $existente->nro, $existente->cliente->nombre_completo, $existente->cliente->direccion),
        ]);

        $id = $this->postJson('/api/padron/cargas', ['csv' => $csv], $this->headers($admin))
            ->assertCreated()
            ->json('lote.id');

        // Técnico (solo lectura del sistema público) no ve el lote
        $this->getJson("/api/padron/cargas/{$id}", $this->headers($tecnico))->assertForbidden();
        // Admin no puede aplicar
        $this->postJson("/api/padron/cargas/{$id}/apply", [], $this->headers($admin))->assertForbidden();

        $aplicado = $this->postJson("/api/padron/cargas/{$id}/apply", [], $this->headers($super))->assertOk();
        $this->assertSame(1, $aplicado->json('altas'));
        $this->assertSame(1, $aplicado->json('actualizados'));
        $this->assertSame(PadronCarga::ESTADO_APLICADO, $aplicado->json('lote.estado'));

        $alta = Subscriber::query()->where('nro', 9301)->sole();
        $this->assertSame('28803001', $alta->numero_telefono);
        $this->assertSame('Alta Nueva', $alta->cliente->nombre_completo);

        $modificada = Subscriber::query()->where('nro', $existente->nro)->sole();
        $this->assertSame('28899999', $modificada->numero_telefono);

        // Bitácora del padrón: 1 registro por alta + 1 por actualización
        $this->assertSame(2, DB::table('bitacora')->where('detalle', 'like', 'Carga por lote%')->count());
    }

    public function test_apply_segunda_vez_y_anulacion(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $existente = Subscriber::factory()->create();

        $csv = implode("\n", [
            'nro,numero_telefono,nombre_completo,direccion,celda',
            sprintf('%d,%s,%s,%s,,', $existente->nro, $existente->numero_telefono, $existente->cliente->nombre_completo, $existente->cliente->direccion),
        ]);
        $id = $this->postJson('/api/padron/cargas', ['csv' => $csv], $this->headers($super))->assertCreated()->json('lote.id');

        $this->postJson("/api/padron/cargas/{$id}/apply", [], $this->headers($super))->assertOk();
        // Segunda aplicación → 409 (estado APLICADO)
        $this->postJson("/api/padron/cargas/{$id}/apply", [], $this->headers($super))->assertStatus(409);

        // Anular un lote pendiente + al padrón no le pasa nada
        $id2 = $this->postJson('/api/padron/cargas', ['csv' => $csv], $this->headers($super))->assertCreated()->json('lote.id');
        $this->postJson("/api/padron/cargas/{$id2}/anular", [], $this->headers($super))
            ->assertOk()
            ->assertJsonPath('lote.estado', PadronCarga::ESTADO_ANULADO);

        $this->assertSame(1, Subscriber::query()->count());
    }

    public function test_csv_sin_filas_rechazado_con_422(): void
    {
        $admin = Operador::factory()->admin()->create();

        $this->postJson('/api/padron/cargas', ['csv' => "nro,numero_telefono\n"], $this->headers($admin))
            ->assertStatus(422);
    }
}
