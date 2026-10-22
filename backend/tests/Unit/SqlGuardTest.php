<?php

namespace Tests\Unit;

use App\Support\SqlGuard;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * Consola SQL en vivo: una sola instrucción de solo lectura y
 * sin funciones peligrosas de servidor (paridad con adminAuth.ts).
 */
class SqlGuardTest extends TestCase
{
    #[DataProvider('consultasPermitidas')]
    public function test_acepta_consultas_de_lectura(string $sql): void
    {
        $this->assertNull(SqlGuard::rejectionReason($sql));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function consultasPermitidas(): iterable
    {
        yield 'select simple' => ['SELECT * FROM abonados_lineas LIMIT 10'];
        yield 'select con where' => ["SELECT nro, estado_operativo FROM abonados_lineas WHERE estado_operativo = 'C/SERV.'"];
        yield 'with cte' => ['WITH activas AS (SELECT * FROM abonados_lineas) SELECT count(*) FROM activas'];
        yield 'explain' => ['EXPLAIN SELECT * FROM work_orders'];
        yield 'show' => ['SHOW search_path'];
        yield 'punto y coma final' => ['SELECT 1;'];
    }

    #[DataProvider('consultasRechazadas')]
    public function test_rechaza_consultas_no_permitidas(string $sql): void
    {
        $this->assertNotNull(SqlGuard::rejectionReason($sql));
    }

    /**
     * @return iterable<string, array{string}>
     */
    public static function consultasRechazadas(): iterable
    {
        yield 'vacía' => ['   '];
        yield 'múltiples sentencias' => ['SELECT 1; DROP TABLE abonados_lineas'];
        yield 'insert' => ['INSERT INTO abonados_lineas (nro) VALUES (999)'];
        yield 'update' => ["UPDATE abonados_lineas SET estado_operativo = 'C/SERV.'"];
        yield 'ddl' => ['DROP TABLE abonados_lineas'];
        yield 'pg_read_file' => ['SELECT pg_read_file(\'/etc/passwd\')'];
        yield 'copy program' => ["COPY (SELECT 1) TO PROGRAM 'rm -rf /'"];
        yield 'grant' => ['GRANT ALL ON abonados_lineas TO public'];
        yield 'set role' => ['SET ROLE service_role'];
        yield 'dblink' => ["SELECT * FROM dblink('host=x', 'SELECT 1')"];
    }
}
