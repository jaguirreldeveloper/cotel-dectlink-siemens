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
}
