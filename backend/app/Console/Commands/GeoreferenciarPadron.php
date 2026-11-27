<?php

namespace App\Console\Commands;

use App\Support\PadronCache;
use App\Support\SubscriberGeocoder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('padron:georeferenciar {--force : Recalcular solo coordenadas estimadas}')]
#[Description('Georreferencia determinísticamente las líneas del padrón desde su celda/zona')]
class GeoreferenciarPadron extends Command
{
    public function handle(): int
    {
        $consulta = DB::table('abonados_lineas as a')
            ->join('celdas as cel', 'cel.id', '=', 'a.id_celda')
            ->select(
                'a.nro',
                'a.numero_telefono',
                'a.zona_origen',
                'cel.latitud as celda_lat',
                'cel.longitud as celda_lng',
                'cel.radio_cobertura_km as radio_km'
            );

        if ($this->option('force')) {
            $consulta->whereIn('a.precision_gps', ['SIN_DATO', 'CENTROIDE_ZONA', 'CATASTRO_ESTIMADO']);
        } else {
            $consulta->whereNull('a.lat')->whereNull('a.lng');
        }

        $filas = $consulta->orderBy('a.nro')->get();
        $conteo = ['CENTROIDE_ZONA' => 0, 'CATASTRO_ESTIMADO' => 0];
        $omitidas = 0;

        DB::transaction(function () use ($filas, &$conteo, &$omitidas): void {
            foreach ($filas as $fila) {
                if ($fila->celda_lat === null || $fila->celda_lng === null) {
                    $omitidas++;

                    continue;
                }

                $coordenadas = SubscriberGeocoder::calcular([
                    'nro' => (int) $fila->nro,
                    'numero' => (string) $fila->numero_telefono,
                    'zona' => $fila->zona_origen,
                    'celda_lat' => (float) $fila->celda_lat,
                    'celda_lng' => (float) $fila->celda_lng,
                    'radio_km' => (float) $fila->radio_km,
                ]);

                DB::table('abonados_lineas')->where('nro', $fila->nro)->update([
                    'lat' => $coordenadas['lat'],
                    'lng' => $coordenadas['lng'],
                    'distancia_km' => $coordenadas['distancia_km'],
                    'azimut_grados' => $coordenadas['azimut_grados'],
                    'precision_gps' => $coordenadas['precision_gps'],
                    'updated_at' => now(),
                ]);

                $conteo[$coordenadas['precision_gps']]++;
            }
        });

        PadronCache::clear();

        $this->info(sprintf(
            'Georreferenciadas %d líneas (centroide de zona: %d, celda: %d); omitidas: %d.',
            array_sum($conteo),
            $conteo['CENTROIDE_ZONA'],
            $conteo['CATASTRO_ESTIMADO'],
            $omitidas
        ));

        return self::SUCCESS;
    }
}
