<?php

namespace Database\Seeders;

use App\Models\Cell;
use App\Models\Client;
use App\Models\Subscriber;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Padrón definitivo exportado de «CELDAS DECT LINK.xls»: 522 líneas reales
 * repartidas en 11 celdas de El Alto. Reemplaza las líneas demo.
 */
class PadronRealSeeder extends Seeder
{
    private const ARCHIVO = 'padron_celdas_dect_link.csv';

    public function run(): void
    {
        $ruta = database_path('data/'.self::ARCHIVO);
        if (! is_readable($ruta)) {
            throw new RuntimeException("No se puede leer {$ruta}");
        }

        $manejador = fopen($ruta, 'rb');
        if ($manejador === false) {
            throw new RuntimeException("No se puede abrir {$ruta}");
        }

        $celdas = Cell::query()->pluck('id', 'id');

        try {
            DB::transaction(function () use ($manejador, $celdas): void {
                Subscriber::query()->whereNull('archivo_origen')->delete();
                Subscriber::query()->where('archivo_origen', self::ARCHIVO)->delete();

                fgetcsv($manejador);

                while (($fila = fgetcsv($manejador)) !== false) {
                    if (count($fila) < 10 || $fila[0] === null || $fila[0] === '') {
                        continue;
                    }

                    $celdaId = (int) $fila[5];
                    if (! isset($celdas[$celdaId])) {
                        throw new RuntimeException("La celda {$celdaId} del padrón no existe.");
                    }

                    $cliente = Client::firstOrCreate([
                        'nombre_completo' => trim((string) $fila[3]),
                        'direccion' => trim((string) $fila[4]) ?: null,
                    ]);

                    Subscriber::create([
                        'nro' => (int) $fila[0],
                        'numero_telefono' => trim((string) $fila[1]),
                        'codigo_area' => 'EAI',
                        'contrato' => $fila[2] !== '' ? (int) $fila[2] : null,
                        'id_cliente' => $cliente->id,
                        'id_celda' => $celdaId,
                        'estado_servicio' => trim((string) $fila[6]) ?: 'C/SERV.',
                        'estado_operativo' => trim((string) $fila[6]) ?: 'C/SERV.',
                        'fecha_servicio' => trim((string) $fila[7]) ?: null,
                        'nro_registro_origen' => (int) $fila[9],
                        'archivo_origen' => self::ARCHIVO,
                        'zona_origen' => trim((string) $fila[8]) ?: null,
                    ]);
                }
            });
        } finally {
            fclose($manejador);
        }
    }
}
