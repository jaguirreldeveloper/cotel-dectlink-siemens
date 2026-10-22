<?php

namespace Tests\Concerns;

use App\Models\Cell;
use App\Models\Client;
use App\Models\Subscriber;
use App\Models\Zone;

/**
 * Seeds mínimos del padrón normalizado para pruebas: celda (RFP), zona,
 * cliente y abonado con sus relaciones FK — construidos con los factories
 * de los modelos del dominio.
 */
trait SeedsCotelPatron
{
    /**
     * @return array{id: int, nombre: string}
     */
    protected function seedCelda(int $id = 17, string $nombre = 'CELDA A-17 TILATA'): array
    {
        Cell::query()->updateOrCreate(['id' => $id], [
            'nombre' => $nombre,
            'tecnologia' => 'DECT-Link',
            'banda_frecuencia' => '1880 - 1900 MHz (DECT GAP)',
        ]);

        return ['id' => $id, 'nombre' => $nombre];
    }

    protected function seedZona(string $nombre = 'TILATA'): int
    {
        return (int) Zone::query()->firstOrCreate(['nombre' => $nombre])->id;
    }

    /**
     * Crea un titular y devuelve su id.
     */
    protected function seedCliente(string $nombre = 'MAMANI RAMOS SAMUEL', ?int $idZona = null): int
    {
        $cliente = Client::factory()->createOne([
            'nombre_completo' => $nombre,
            'direccion' => 'CALLE 0 Nro. 264 Mzno C',
            'id_zona' => $idZona,
        ]);

        return (int) $cliente->id;
    }

    /**
     * Inserta una línea completa y devuelve su `nro` (identificador de negocio).
     *
     * @param  array<string, mixed>  $attrs  sobrescrituras de columnas
     */
    protected function seedAbonado(array $attrs = []): int
    {
        $this->seedCelda($attrs['id_celda'] ?? 17);

        $fila = array_merge([
            'nro' => 1,
            'numero_telefono' => '2880001',
            'codigo_area' => 'EAI',
            'contrato' => 80000001,
            'id_cliente' => $this->seedCliente(),
            'id_celda' => 17,
            'estado_servicio' => 'C/SERV.',
            'estado_operativo' => 'C/SERV.',
        ], $attrs);

        Subscriber::factory()->createOne($fila);

        return (int) $fila['nro'];
    }
}
