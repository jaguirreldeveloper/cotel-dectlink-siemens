<?php

namespace Tests\Unit;

use App\Support\CellCatalog;
use App\Support\CellDescription;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/** Normalización de descripción y motivos heredados del CSV de celdas. */
class CellDescriptionTest extends TestCase
{
    #[DataProvider('descripciones')]
    public function test_normaliza_descripcion(?string $descripcion, ?string $dpi, ?string $esperado): void
    {
        $this->assertSame($esperado, CellDescription::normalizar($descripcion, $dpi));
    }

    /**
     * @return iterable<string, array{?string, ?string, ?string}>
     */
    public static function descripciones(): iterable
    {
        yield 'celda real con DPI' => ['Celda real ACHACHICALA · DPI 3_03', '3_03', 'Celda real · DPI 3_03'];
        yield 'celda real sin DPI' => ['Celda real Sin DPI', null, 'Celda real'];
        yield 'referencia intacta' => [
            'Referencia de numeración; sin registro real en campo',
            null,
            'Referencia de numeración; sin registro real en campo',
        ];
        yield 'sin descripción' => [null, '6_1', null];
    }

    public function test_motivos_heredados_se_codifican(): void
    {
        $this->assertSame(
            'LISTADO_REAL',
            CellCatalog::MOTIVOS_LEGADOS['Celda identificada en el listado real de planta externa']
        );
        $this->assertSame(
            'REFERENCIA',
            CellCatalog::MOTIVOS_LEGADOS['Referencia de numeración; sin registro real en campo']
        );
    }
}
