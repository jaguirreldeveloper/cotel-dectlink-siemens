<?php

namespace App\Support;

/**
 * Metadatos de la conexión activa (paridad con getCurrentConnectionInfo de
 * src/db/index.ts): proveedor, host, región AWS y ref del proyecto Supabase
 * derivados de la configuración de Laravel (config/database.php).
 */
class ConnectionInfo
{
    /**
     * @return array{provider: string, isSupabase: bool, hasCustomUrl: bool, host: string, database: string, region: ?string, projectRef: ?string}
     */
    public static function current(): array
    {
        $host = (string) config('database.connections.pgsql.host', '127.0.0.1');
        $database = (string) config('database.connections.pgsql.database', 'cotel_dectlink');
        $username = (string) config('database.connections.pgsql.username', 'postgres');

        $isSupabase = str_contains($host, 'supabase.com')
            || str_contains($host, 'supabase.co')
            || str_contains($host, 'pooler.supabase.com');

        $provider = $isSupabase ? 'Supabase PostgreSQL' : 'Custom PostgreSQL';

        $region = null;
        $projectRef = null;

        if (preg_match('/^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$/', $host, $pooler)) {
            $region = $pooler[1];
        }

        if (preg_match('/^db\.([^.]+)\.supabase\.co$/', $host, $direct)) {
            $projectRef = $direct[1];
        }

        // Usuario del pooler: "postgres.<ref>" (lookahead para no cortar la clave).
        if (preg_match('/^postgres\.([^:@\/]+)(?=[:@\/]|$)/', $username, $fromUser)) {
            $projectRef ??= $fromUser[1];
        }

        return [
            'provider' => $provider,
            'isSupabase' => $isSupabase,
            'hasCustomUrl' => false,
            'host' => $host,
            'database' => $database,
            'region' => $region,
            'projectRef' => $projectRef,
        ];
    }
}
