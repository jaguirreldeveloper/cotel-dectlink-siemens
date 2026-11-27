<?php

namespace App\Support;

/** Georreferenciación estimada y determinista de líneas a partir de su celda/zona. */
final class SubscriberGeocoder
{
    /**
     * @param  array{nro: int, numero: string, zona: ?string, celda_lat: ?float, celda_lng: ?float, radio_km: ?float}  $datos
     * @return array{lat: float, lng: float, distancia_km: float, azimut_grados: int, precision_gps: string}
     */
    public static function calcular(array $datos): array
    {
        $celdaLat = (float) ($datos['celda_lat'] ?? 0);
        $celdaLng = (float) ($datos['celda_lng'] ?? 0);
        $radioKm = max(0.3, (float) ($datos['radio_km'] ?? 2.5));

        $centroide = ZoneCoordinates::centroide($datos['zona'] ?? null);
        $usaZona = $centroide !== null
            && self::distanciaKm($centroide['lat'], $centroide['lng'], $celdaLat, $celdaLng) <= $radioKm;

        $anclaLat = $usaZona ? $centroide['lat'] : $celdaLat;
        $anclaLng = $usaZona ? $centroide['lng'] : $celdaLng;

        $ultimos = (int) substr((string) ($datos['numero'] ?? ''), -4);
        $ultimos = $ultimos === 0 ? 1000 : $ultimos;
        $semilla = (((int) $datos['nro']) * 1337 + $ultimos) % 10000;
        $angulo = ($semilla / 10000) * 2 * M_PI;
        $radioGrados = 0.0015 + (($semilla % 100) / 100) * 0.0035;
        $radioMaximo = $radioKm / 111.32;
        if ($usaZona) {
            $distanciaAncla = self::distanciaKm($anclaLat, $anclaLng, $celdaLat, $celdaLng);
            $radioMaximo = max(0.0002, ($radioKm - $distanciaAncla) / 111.32);
        }
        $radioGrados = min($radioGrados, $radioMaximo);

        $lat = $anclaLat + sin($angulo) * $radioGrados;
        $lng = $anclaLng + cos($angulo) * $radioGrados / max(0.2, cos(deg2rad($anclaLat)));

        return [
            'lat' => round($lat, 6),
            'lng' => round($lng, 6),
            'distancia_km' => round(self::distanciaKm($celdaLat, $celdaLng, $lat, $lng), 3),
            'azimut_grados' => self::azimutGrados($celdaLat, $celdaLng, $lat, $lng),
            'precision_gps' => $usaZona ? 'CENTROIDE_ZONA' : 'CATASTRO_ESTIMADO',
        ];
    }

    public static function distanciaKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $radio = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $radio * asin(min(1.0, sqrt($a)));
    }

    public static function azimutGrados(float $lat1, float $lng1, float $lat2, float $lng2): int
    {
        $dLng = deg2rad($lng2 - $lng1);
        $y = sin($dLng) * cos(deg2rad($lat2));
        $x = cos(deg2rad($lat1)) * sin(deg2rad($lat2))
            - sin(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos($dLng);

        return ((int) round(rad2deg(atan2($y, $x))) + 360) % 360;
    }
}
