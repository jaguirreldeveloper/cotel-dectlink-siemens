<?php

namespace Tests\Feature;

use App\Support\CellCsvImporter;
use App\Support\CellStateMachine;
use Tests\TestCase;

/** Parsea el listado real de celdas: DMS, decimales, rangos y estados. */
class CellCsvImporterTest extends TestCase
{
    /** @return array<string, array<string, mixed>> */
    private function registros(): array
    {
        return CellCsvImporter::leer(base_path('database/data/celdas_reales.csv'));
    }

    public function test_lee22_registros_y_marca_a03_y_a04_como_no_importables(): void
    {
        $registros = $this->registros();

        $this->assertCount(22, $registros);
        $this->assertCount(20, array_filter($registros, fn (array $r): bool => $r['importar']));
        $this->assertFalse($registros['EL ALTO:3']['importar']);
        $this->assertFalse($registros['EL ALTO:4']['importar']);
    }

    public function test_convierte_coordenadas_dms_decimales_comas_y_rangos(): void
    {
        $a05 = $this->registros()['EL ALTO:5'];

        $this->assertSame('URB. MERCEDARIO', $a05['nombre']);
        $this->assertSame('6_5', $a05['codigo_dpi']);
        $this->assertSame('440846', $a05['numero_medidor']);
        $this->assertSame(24.9, $a05['resistencia_tierra_ohm']);
        $this->assertSame(1.4, $a05['corriente_flotante_a']);
        $this->assertNull($a05['corriente_carga_a']); // S/AUTONOMIA
        $this->assertSame(-16.521111, $a05['latitud']);
        $this->assertSame(-68.233333, $a05['longitud']);
        $this->assertSame([
            ['desde' => 2806500, 'hasta' => 2806859],
            ['desde' => 2808000, 'hasta' => 2808119],
        ], $a05['rangos_numeracion']);
    }

    public function test_convierte_variantes_de_grados_y_mapea_estados(): void
    {
        $registros = $this->registros();

        $this->assertSame(-16.576944, $registros['EL ALTO:17']['latitud']);
        $this->assertSame(-68.227222, $registros['EL ALTO:17']['longitud']);
        $this->assertSame(CellStateMachine::ENCENDIDA, $registros['EL ALTO:5']['estado_energia']);
        $this->assertSame(CellStateMachine::APAGADA, $registros['EL ALTO:2']['estado_energia']);
        $this->assertSame(CellStateMachine::SIN_ENERGIA, $registros['LA PAZ:3']['estado_energia']);
        $this->assertSame(CellStateMachine::SUSPENDIDA, $registros['EL ALTO:2']['estado']);
        $this->assertSame(CellStateMachine::RETIRADA, $registros['EL ALTO:20']['estado']);
        $this->assertSame(CellStateMachine::BAJA, $registros['EL ALTO:22']['estado']);
        $this->assertSame(CellStateMachine::SUSPENDIDA, $registros['LA PAZ:3']['estado']);
        $this->assertFalse($registros['EL ALTO:20']['activo']);
    }

    public function test_la_paz_tiene_dos_registros_con_offset_de_ciudad(): void
    {
        $registros = $this->registros();

        $this->assertSame('LA PAZ', $registros['LA PAZ:3']['municipio']);
        $this->assertSame(3, $registros['LA PAZ:3']['numero_celda']);
        $this->assertSame('ACHACHICALA', $registros['LA PAZ:3']['nombre']);
        $this->assertSame(1.5, $registros['LA PAZ:3']['corriente_flotante_a']);
    }
}
