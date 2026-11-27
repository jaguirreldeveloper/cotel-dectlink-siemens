<?php

namespace App\Support;

/** Catálogos cerrados de las celdas RFP, compartidos por API y validación. */
final class CellCatalog
{
    /** @var list<string> */
    public const TECNOLOGIAS = ['DECT-Link'];

    /** @var list<string> */
    public const MODELOS_RFP = ['Siemens C500'];

    /** @var list<string> */
    public const BANDAS_FRECUENCIA = ['1880 - 1900 MHz (DECT GAP)'];

    /** @var list<string> */
    public const DEPARTAMENTOS = ['LA PAZ'];

    /** @var list<string> Motivos sugeridos en la UI; el campo sigue siendo texto libre. */
    public const MOTIVOS_SUGERIDOS = [
        'APAGADO',
        'RETIRADO',
        'S/RECTIFICADOR',
        'NO HAY ING.',
        'LISTADO_REAL',
        'REFERENCIA',
    ];

    /** @var array<string, string> Textos heredados del CSV mapeados a códigos cortos. */
    public const MOTIVOS_LEGADOS = [
        'Celda identificada en el listado real de planta externa' => 'LISTADO_REAL',
        'Referencia de numeración; sin registro real en campo' => 'REFERENCIA',
    ];
}
