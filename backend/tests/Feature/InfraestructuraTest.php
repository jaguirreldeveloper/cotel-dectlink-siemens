<?php

namespace Tests\Feature;

use App\Models\Cell;
use App\Models\Central;
use App\Models\InfraestructuraBitacora;
use App\Models\Operador;
use App\Support\OperatorToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InfraestructuraTest extends TestCase
{
    use RefreshDatabase;

    private function token(Operador $op): string
    {
        return OperatorToken::generate($op);
    }

    public function test_crea_jerarquia_completa_central_subcentral_shelter_armario(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        $central = $this->postJson('/api/centrales', ['codigo' => 'CEN-T', 'nombre' => 'Central T'], $h);
        $central->assertCreated()->assertJsonPath('fila.activo', true);

        $sub = $this->postJson('/api/subcentrales', [
            'codigo' => 'SUB-T', 'nombre' => 'Sub T', 'id_central' => $central->json('fila.id'),
        ], $h);
        $sub->assertCreated()->assertJsonPath('fila.central', 'Central T');

        $shelter = $this->postJson('/api/shelters', [
            'codigo' => 'SHE-T-01', 'nombre' => 'Shelter T 01', 'id_subcentral' => $sub->json('fila.id'),
            'kva_rectificador' => '2.5', 'autonomia_baterias_horas' => 4,
        ], $h);
        $shelter->assertCreated()->assertJsonPath('fila.estadoClima', 'AIRE');

        $armario = $this->postJson('/api/armarios', [
            'codigo' => 'ARM-T-01', 'nombre' => 'Armario T 01', 'id_shelter' => $shelter->json('fila.id'), 'tipo' => 'RFP',
        ], $h);
        $armario->assertCreated();

        // Auditoría: 4 acciones CREAR
        $this->assertSame(4, InfraestructuraBitacora::query()->where('accion', 'CREAR')->count());
    }

    public function test_admin_puede_escribir_pero_no_eliminar(): void
    {
        $admin = Operador::factory()->admin()->create();
        $h = ['Authorization' => "Bearer {$this->token($admin)}"];

        $central = $this->postJson('/api/centrales', ['codigo' => 'CEN-A', 'nombre' => 'Central A'], $h);
        $central->assertCreated();

        $edit = $this->patchJson("/api/centrales/{$central->json('fila.id')}", ['nombre' => 'Central A2'], $h);
        $edit->assertOk()->assertJsonPath('fila.nombre', 'Central A2');

        // Borrado físico jamás para ADMIN
        $this->deleteJson("/api/centrales/{$central->json('fila.id')}", [], $h)
            ->assertStatus(403);

        // Desactivar (baja lógica) sí es permitida
        $this->postJson("/api/centrales/{$central->json('fila.id')}/deactivate", [], $h)
            ->assertOk()->assertJsonPath('fila.activo', false);
    }

    public function test_superadmin_puede_eliminar_y_queda_auditoria(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        $central = $this->postJson('/api/centrales', ['codigo' => 'CEN-X', 'nombre' => 'Central X'], $h);
        $id = $central->json('fila.id');

        $this->deleteJson("/api/centrales/{$id}", [], $h)->assertOk();

        $this->assertNull(Central::query()->find($id));
        $this->assertTrue(InfraestructuraBitacora::query()->where('tabla', 'centrales')->where('registro_id', $id)->where('accion', 'ELIMINAR')->exists());
    }

    public function test_codigo_duplicado_rechazado(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        Central::factory()->create(['codigo' => 'CEN-DUP']);

        $this->postJson('/api/centrales', ['codigo' => 'CEN-DUP', 'nombre' => 'Dup'], $h)
            ->assertStatus(422);
    }

    public function test_asigna_subcentral_a_celda(): void
    {
        $super = Operador::factory()->superadmin()->create();
        $h = ['Authorization' => "Bearer {$this->token($super)}"];

        $central = $this->postJson('/api/centrales', ['codigo' => 'CEN-C', 'nombre' => 'Central C'], $h);
        $sub = $this->postJson('/api/subcentrales', [
            'codigo' => 'SUB-C', 'nombre' => 'Sub C', 'id_central' => $central->json('fila.id'),
        ], $h);

        $cell = Cell::factory()->create();

        $this->patchJson("/api/cells/{$cell->id}/subcentral", ['id_subcentral' => $sub->json('fila.id')], $h)
            ->assertOk()
            ->assertJsonPath('celda.idSubcentral', $sub->json('fila.id'));

        // Desasignar
        $this->patchJson("/api/cells/{$cell->id}/subcentral", ['id_subcentral' => null], $h)
            ->assertOk()
            ->assertJsonPath('celda.idSubcentral', null);
    }

    public function test_tecnico_no_puede_escribir_infraestructura(): void
    {
        $tecnico = Operador::factory()->tecnico()->create();
        $h = ['Authorization' => "Bearer {$this->token($tecnico)}"];

        $this->postJson('/api/centrales', ['codigo' => 'CEN-Z', 'nombre' => 'Z'], $h)
            ->assertStatus(403);
    }
}
