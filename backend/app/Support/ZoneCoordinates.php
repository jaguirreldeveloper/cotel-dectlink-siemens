<?php

namespace App\Support;

/** Centroides de barrios/urbanizaciones de El Alto, espejo del catálogo de la UI. */
final class ZoneCoordinates
{
    /** @var array<string, array{lat: float, lng: float}> */
    private const ANCHORS = [
        'NUEVA TILATA' => ['lat' => -16.578, 'lng' => -68.236],
        'TILATA' => ['lat' => -16.574, 'lng' => -68.231],
        'URB. TILATA MAGISTERIO' => ['lat' => -16.582, 'lng' => -68.241],
        'URB TILATA MAGI' => ['lat' => -16.582, 'lng' => -68.241],
        'MAGISTERIO' => ['lat' => -16.582, 'lng' => -68.241],
        'URB JARDIN' => ['lat' => -16.579, 'lng' => -68.228],
        'URB. JARDIN' => ['lat' => -16.579, 'lng' => -68.228],
        'SENKATA' => ['lat' => -16.57, 'lng' => -68.175],
        'MARISCAL SANTA CRUZ' => ['lat' => -16.496, 'lng' => -68.212],
        'PUCHUKOLLO' => ['lat' => -16.516, 'lng' => -68.249],
        'PUCHOCOLLO' => ['lat' => -16.516, 'lng' => -68.249],
        'URKUPIÑA II' => ['lat' => -16.565, 'lng' => -68.238],
        'URKUPINA II' => ['lat' => -16.565, 'lng' => -68.238],
        'SAN MARTIN DE PORRES' => ['lat' => -16.558, 'lng' => -68.205],
        'SAN MARTIN' => ['lat' => -16.558, 'lng' => -68.205],
        'NUEVO AMANECER' => ['lat' => -16.562, 'lng' => -68.218],
        'SAN SALVADOR' => ['lat' => -16.592, 'lng' => -68.252],
        'VILLA ESPERANZA' => ['lat' => -16.488, 'lng' => -68.192],
        'VENTILLA' => ['lat' => -16.586, 'lng' => -68.168],
        'URB INTI' => ['lat' => -16.584, 'lng' => -68.239],
        'URB. INTI' => ['lat' => -16.584, 'lng' => -68.239],
        'CUMARAVI' => ['lat' => -16.602, 'lng' => -68.261],
        'SAN LORENZO' => ['lat' => -16.615, 'lng' => -68.272],
        'VILLA MERCEDES' => ['lat' => -16.545, 'lng' => -68.182],
        '16 DE JULIO' => ['lat' => -16.502, 'lng' => -68.167],
        'CHIJINI CHICO' => ['lat' => -16.525, 'lng' => -68.21],
        'VIACHA CENTRO' => ['lat' => -16.653, 'lng' => -68.3],
        'MERCEDARIO' => ['lat' => -16.521, 'lng' => -68.235],
        'URB. MERCEDARIO' => ['lat' => -16.52, 'lng' => -68.233],
        'MERCEDARIO 2' => ['lat' => -16.523, 'lng' => -68.238],
        'MERCEDARIO 3' => ['lat' => -16.519, 'lng' => -68.24],
        'MERCEDARIO 4' => ['lat' => -16.517, 'lng' => -68.243],
        'MERCEDARIO 4A' => ['lat' => -16.5165, 'lng' => -68.2435],
        'MERCEDARIO SECTOR I' => ['lat' => -16.522, 'lng' => -68.236],
        'VILLA MERCEDARIO' => ['lat' => -16.5205, 'lng' => -68.2335],
        'COSMOS 79' => ['lat' => -16.548, 'lng' => -68.218],
        'SAN FELIPE DE SEQUE' => ['lat' => -16.554, 'lng' => -68.246],
        'JUANA AZURDUY DE PADILLA' => ['lat' => -16.539, 'lng' => -68.217],
        'KISWARAS' => ['lat' => -16.551, 'lng' => -68.224],
        'CRUZ DEL SUR' => ['lat' => -16.544, 'lng' => -68.224],
        'LIBERTAD' => ['lat' => -16.536, 'lng' => -68.222],
        'MERCURIO' => ['lat' => -16.556, 'lng' => -68.232],
        'SANTA BARBARA' => ['lat' => -16.547, 'lng' => -68.231],
        'VILLA INGAVI' => ['lat' => -16.51, 'lng' => -68.196],
        'VILLA SANTIAGO II' => ['lat' => -16.533, 'lng' => -68.209],
        'BARRIO LINDO' => ['lat' => -16.542, 'lng' => -68.247],
        'CHIJINI ALTO' => ['lat' => -16.524, 'lng' => -68.211],
        '6 DE AGOSTO' => ['lat' => -16.53, 'lng' => -68.215],
        'ALTO LIMA' => ['lat' => -16.485, 'lng' => -68.18],
        'GERMAN BUSCH' => ['lat' => -16.512, 'lng' => -68.19],
        'URB MERCURIO' => ['lat' => -16.556, 'lng' => -68.232],
        'VILLA REMEDIOS' => ['lat' => -16.525, 'lng' => -68.195],
        'EL KENKO' => ['lat' => -16.535, 'lng' => -68.175],
        'VILLA ADELA' => ['lat' => -16.54, 'lng' => -68.185],
        'INST.S.TORIBIO' => ['lat' => -16.542, 'lng' => -68.188],
    ];

    /** @var array<string, string> */
    private const ALIASES = [
        'COSMO 79' => 'COSMOS 79',
        'CO0SMOS 79' => 'COSMOS 79',
        'COSMOS 79 UND/F' => 'COSMOS 79',
        'URB.MERCEDARIO' => 'URB. MERCEDARIO',
        'URB MERCEDARIO' => 'URB. MERCEDARIO',
        'VILLA SANTIAGO' => 'VILLA SANTIAGO II',
    ];

    public static function normalizar(?string $zona): string
    {
        $valor = mb_strtoupper(trim((string) $zona), 'UTF-8');
        $valor = preg_replace('/\s+/u', ' ', $valor) ?? '';
        $valor = strtr($valor, [
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U', 'Ñ' => 'N',
        ]);

        return self::ALIASES[$valor] ?? $valor;
    }

    /**
     * @return array{lat: float, lng: float}|null
     */
    public static function centroide(?string $zona): ?array
    {
        return self::ANCHORS[self::normalizar($zona)] ?? null;
    }
}
