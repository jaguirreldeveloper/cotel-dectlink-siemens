<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ConnectionInfo;
use App\Support\SqlGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Herramientas de base de datos (paridad con los endpoints 5–12 de server.ts).
 * La conmutación de BD (test-connection / apply-connection) queda deshabilitada
 * en la nube: la conexión la fija Laravel Cloud vía variables de entorno.
 */
class DatabaseController extends Controller
{
    private const TABLE_ALLOWLIST = [
        'celdas', 'zonas', 'clientes', 'abonados_lineas', 'bitacora',
        'work_orders', 'work_order_materiales', 'cuadrillas', 'materiales', 'users',
    ];

    /**
     * GET /api/database/status
     */
    public function status(): JsonResponse
    {
        try {
            $start = microtime(true);

            $version = DB::selectOne('SELECT version() AS version');
            $dbInfo = DB::selectOne('
                SELECT
                    current_database() AS database_name,
                    current_user AS user_name,
                    pg_size_pretty(pg_database_size(current_database())) AS total_size
            ');
            $counts = DB::selectOne('
                SELECT
                    (SELECT COUNT(*) FROM celdas) AS celdas_count,
                    (SELECT COUNT(*) FROM abonados_lineas) AS abonados_count,
                    (SELECT COUNT(*) FROM bitacora) AS bitacora_count
            ');

            $latencyMs = (int) round((microtime(true) - $start) * 1000);
            $info = ConnectionInfo::current();

            return response()->json([
                'connected' => true,
                'provider' => $info['provider'],
                'isSupabase' => $info['isSupabase'],
                'host' => $info['host'],
                'region' => $info['region'],
                'instance' => $info['projectRef'],
                'database' => $dbInfo->database_name ?? config('database.connections.pgsql.database'),
                'user' => $dbInfo->user_name ?? config('database.connections.pgsql.username'),
                'version' => $version->version ?? 'PostgreSQL',
                'size' => $dbInfo->total_size ?? 'N/A',
                'latencyMs' => $latencyMs,
                'counts' => [
                    'celdas' => (int) ($counts->celdas_count ?? 0),
                    'abonados' => (int) ($counts->abonados_count ?? 0),
                    'bitacora' => (int) ($counts->bitacora_count ?? 0),
                ],
            ]);
        } catch (\Throwable $err) {
            return response()->json([
                'connected' => false,
                'error' => $err->getMessage() ?: 'Error al conectar con PostgreSQL',
            ], 500);
        }
    }

    /**
     * GET /api/database/schema — tablas, columnas y conteos del esquema public.
     */
    public function schema(): JsonResponse
    {
        try {
            $tables = DB::select('
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\'
                ORDER BY table_name
            ');

            $columns = DB::select('
                SELECT table_name, column_name, data_type, is_nullable, column_default, ordinal_position
                FROM information_schema.columns
                WHERE table_schema = \'public\'
                ORDER BY table_name, ordinal_position
            ');

            $countRow = DB::selectOne('
                SELECT
                    (SELECT COUNT(*) FROM celdas) AS celdas,
                    (SELECT COUNT(*) FROM zonas) AS zonas,
                    (SELECT COUNT(*) FROM clientes) AS clientes,
                    (SELECT COUNT(*) FROM abonados_lineas) AS abonados_lineas,
                    (SELECT COUNT(*) FROM bitacora) AS bitacora,
                    (SELECT COUNT(*) FROM work_orders) AS work_orders,
                    (SELECT COUNT(*) FROM cuadrillas) AS cuadrillas,
                    (SELECT COUNT(*) FROM materiales) AS materiales,
                    (SELECT COUNT(*) FROM work_order_materiales) AS work_order_materiales,
                    (SELECT COUNT(*) FROM users) AS users
            ');
            $countsMap = array_map(fn ($value): int => (int) $value, (array) $countRow);

            $porTabla = [];
            foreach ($columns as $column) {
                $porTabla[$column->table_name][] = $column;
            }

            $resultado = array_map(function (object $table) use ($porTabla, $countsMap): array {
                $cols = $porTabla[$table->table_name] ?? [];

                return [
                    'name' => $table->table_name,
                    'rowCount' => $countsMap[$table->table_name] ?? 0,
                    'columns' => array_map(fn (object $column): array => [
                        'name' => $column->column_name,
                        'dataType' => $column->data_type,
                        'isNullable' => $column->is_nullable === 'YES',
                        'default' => $column->column_default,
                        'ordinal' => (int) $column->ordinal_position,
                    ], $cols),
                ];
            }, $tables);

            return response()->json(['tables' => $resultado]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al inspeccionar esquema de PostgreSQL'], 500);
        }
    }

    /**
     * GET /api/database/tables/:table/data — visor paginado con búsqueda.
     */
    public function tableData(Request $request, string $table): JsonResponse
    {
        try {
            if (! in_array($table, self::TABLE_ALLOWLIST, true)) {
                return response()->json(['error' => "Tabla no permitida o inexistente: {$table}"], 400);
            }

            $page = max(1, (int) $request->query('page', 1));
            $limit = min(100, max(1, (int) $request->query('limit', 25)));
            $offset = ($page - 1) * $limit;
            $search = trim((string) $request->query('search', ''));

            $cols = DB::select(
                "SELECT column_name, data_type FROM information_schema.columns
                 WHERE table_name = ? AND table_schema = 'public' ORDER BY ordinal_position",
                [$table]
            );

            $where = '';
            $params = [];

            if ($search !== '') {
                $textCols = array_filter(
                    $cols,
                    fn (object $column): bool => in_array($column->data_type, ['character varying', 'text', 'character'], true)
                );

                if ($textCols !== []) {
                    $conditions = array_map(
                        fn (object $column): string => "\"{$column->column_name}\"::text ILIKE ?",
                        $textCols
                    );
                    $where = 'WHERE '.implode(' OR ', $conditions);
                    $params = array_fill(0, count($conditions), "%{$search}%");
                }
            }

            $total = (int) (DB::selectOne("SELECT COUNT(*) AS total FROM \"{$table}\" {$where}", $params)->total ?? 0);

            $filas = DB::select(
                "SELECT * FROM \"{$table}\" {$where} ORDER BY 1 ASC LIMIT ? OFFSET ?",
                array_merge($params, [$limit, $offset])
            );

            return response()->json([
                'table' => $table,
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
                'columns' => array_map(fn (object $column): string => $column->column_name, $cols),
                'rows' => $filas,
            ]);
        } catch (\Throwable) {
            return response()->json(['error' => "Error al leer registros de {$table}"], 500);
        }
    }

    /**
     * POST /api/database/query — consola SQL de solo lectura (admin).
     */
    public function query(Request $request): JsonResponse
    {
        $sql = $request->input('sql');

        if (! is_string($sql) || trim($sql) === '') {
            return response()->json(['error' => 'La consulta SQL no puede estar vacía'], 400);
        }

        $rejection = SqlGuard::rejectionReason($sql);
        if ($rejection !== null) {
            return response()->json(['success' => false, 'error' => $rejection], 403);
        }

        $limpia = trim((string) preg_replace('/;+\s*$/', '', $sql));

        try {
            $start = microtime(true);

            $pdo = DB::connection()->getPdo();
            $statement = $pdo->query($limpia);
            $rows = $statement->fetchAll(\PDO::FETCH_ASSOC);

            $durationMs = round((microtime(true) - $start) * 1000, 1);

            $fields = [];
            for ($i = 0; $i < $statement->columnCount(); $i++) {
                $meta = $statement->getColumnMeta($i);
                $fields[] = [
                    'name' => $meta['name'] ?? null,
                    'dataTypeId' => null, // PDO no expone el OID nativo; la UI solo usa el nombre.
                ];
            }

            $command = strtoupper(strtok($limpia, " \t\n\r"));

            return response()->json([
                'success' => true,
                'command' => $command,
                'rowCount' => count($rows),
                'durationMs' => $durationMs,
                'fields' => $fields,
                'rows' => $rows,
            ]);
        } catch (\Throwable $err) {
            return response()->json([
                'success' => false,
                'error' => $err->getMessage() ?: 'Error en la ejecución de la consulta SQL',
                'detail' => null,
                'hint' => null,
                'position' => null,
            ], 400);
        }
    }

    /**
     * GET /api/database/connection-info
     */
    public function connectionInfo(): JsonResponse
    {
        try {
            return response()->json(ConnectionInfo::current());
        } catch (\Throwable $err) {
            return response()->json(['error' => $err->getMessage()], 500);
        }
    }

    /**
     * POST /api/database/test-connection — deshabilitado en Laravel Cloud.
     */
    public function testConnection(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'La conmutación de base de datos está deshabilitada en Laravel Cloud: la conexión la fija la plataforma mediante variables de entorno (DB_*).',
        ], 501);
    }

    /**
     * POST /api/database/apply-connection — deshabilitado en Laravel Cloud.
     */
    public function applyConnection(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'error' => 'La conmutación de base de datos está deshabilitada en Laravel Cloud: la conexión la fija la plataforma mediante variables de entorno (DB_*).',
        ], 501);
    }

    /**
     * GET /api/database/export-sql — consolida el DDL desde database/sql/ (paridad
     * con generateFullSupabaseScript de src/utils/supabaseSqlGenerator.ts).
     */
    public function exportSql(): JsonResponse
    {
        try {
            return response()->json([
                'fullScript' => $this->generarDdl()."\n\n".$this->generarSeed(),
                'ddl' => $this->generarDdl(),
                'seed' => $this->generarSeed(),
                'filename' => 'cotel_supabase_schema_seed.sql',
            ]);
        } catch (\Throwable) {
            return response()->json(['error' => 'Error al generar script SQL de Supabase'], 500);
        }
    }

    private function generarDdl(): string
    {
        $dir = database_path('sql');

        $files = is_dir($dir)
            ? array_values(array_filter(scandir($dir) ?: [], fn (string $file): bool => str_ends_with(strtolower($file), '.sql')))
            : [];

        sort($files);

        if ($files === []) {
            return '-- No hay archivos .sql en database/sql.';
        }

        $sections = array_map(function (string $file) use ($dir): string {
            $content = trim((string) file_get_contents($dir.DIRECTORY_SEPARATOR.$file));

            return "-- ====================================================================\n"
                ."-- MIGRACIÓN: {$file}\n"
                ."-- ====================================================================\n"
                .$content;
        }, $files);

        $header = "-- ====================================================================\n"
            ."-- SISTEMA DE AUDITORÍA Y GESTIÓN DE PLANTA EXTERNA COTEL R.L.\n"
            .'-- DDL consolidado desde database/sql ('.count($files)." archivo(s))\n"
            .'-- Compatibilidad: Drizzle ORM, Supabase Studio, PostgreSQL 15+'."\n"
            .'-- ====================================================================';

        return $header."\n\n".implode("\n\n", $sections);
    }

    private function generarseedPlaceholder(): string
    {
        return '';
    }

    private function generarSeed(): string
    {
        return <<<'SQL'
-- ====================================================================
-- SEED / CARGA DE DATOS: esquema normalizado de planta externa
-- ====================================================================
-- Las semillas de estructura (4 celdas reales + 41 zonas canónicas) viajan
-- en la migración 20261017000000_modelo_normalizado_abonados.sql.
--
-- El padrón real de líneas NO se siembra desde aquí: se carga desde el CSV
-- consolidado de campo con el ETL versionado en el repositorio:
--
--   npm run db:load        (scripts/load-consolidado.ts)
--
-- Verificación de recuentos finales:
SELECT
  (SELECT COUNT(*) FROM public.celdas) AS total_celdas,
  (SELECT COUNT(*) FROM public.zonas) AS total_zonas,
  (SELECT COUNT(*) FROM public.clientes) AS total_clientes,
  (SELECT COUNT(*) FROM public.abonados_lineas) AS total_lineas,
  (SELECT COUNT(*) FROM public.bitacora) AS total_bitacora;
SQL;
    }
}
