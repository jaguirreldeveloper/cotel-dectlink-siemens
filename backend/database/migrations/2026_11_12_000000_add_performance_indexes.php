<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Añade índices de rendimiento para optimizar consultas frecuentes.
     * 
     * Índices añadidos:
     * - abonados_lineas: índices compuestos para búsquedas comunes
     * - clientes: índice para nombre_completo (búsquedas de texto)
     * - zonas: índice para nombre (búsquedas de texto)
     * - bitacora: índice compuesto para búsquedas por abonado + fecha
     * - celdas: índices para nombre y coordenadas
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return; // Solo para PostgreSQL
        }

        // ====================================================================
        // abonados_lineas: Índices para consultas frecuentes
        // ====================================================================
        
        // Índice compuesto: estado_servicio + estado_operativo (para filtros de estado)
        Schema::table('abonados_lineas', function (Blueprint $table) {
            $table->index(['estado_servicio', 'estado_operativo']);
        });

        // Índice compuesto: id_celda + estado_operativo (para "Abonados por Celda")
        Schema::table('abonados_lineas', function (Blueprint $table) {
            $table->index(['id_celda', 'estado_operativo']);
        });

        // Índice para número_telefono (búsquedas exactas)
        Schema::table('abonados_lineas', function (Blueprint $table) {
            $table->index('numero_telefono');
        });

        // Índice para contrato (búsquedas por número de contrato)
        Schema::table('abonados_lineas', function (Blueprint $table) {
            $table->index('contrato');
        });

        // Índice para fecha_servicio (ordenamiento y filtros por fecha)
        Schema::table('abonados_lineas', function (Blueprint $table) {
            $table->index('fecha_servicio');
        });

        // ====================================================================
        // clientes: Índices para búsquedas
        // ====================================================================
        
        // Índice para nombre_completo (búsquedas de texto)
        Schema::table('clientes', function (Blueprint $table) {
            $table->index('nombre_completo');
        });

        // Índice para direccion (búsquedas de texto)
        Schema::table('clientes', function (Blueprint $table) {
            $table->index('direccion');
        });

        // ====================================================================
        // zonas: Índices para búsquedas
        // ====================================================================
        
        // Índice para nombre (búsquedas de texto)
        Schema::table('zonas', function (Blueprint $table) {
            $table->index('nombre');
        });

        // ====================================================================
        // bitacora: Índices para consultas de auditoría
        // ====================================================================
        
        // Índice compuesto: abonado_nro + timestamp (para historial de un abonado)
        Schema::table('bitacora', function (Blueprint $table) {
            $table->index(['abonado_nro', 'timestamp']);
        });

        // ====================================================================
        // celdas: Índices para búsquedas
        // ====================================================================
        
        // Índice para nombre (búsquedas de texto)
        Schema::table('celdas', function (Blueprint $table) {
            $table->index('nombre');
        });

        // Índice para tecnología (filtros por tipo de tecnología)
        Schema::table('celdas', function (Blueprint $table) {
            $table->index('tecnologia');
        });

        // Índice para coordenadas (búsquedas geoespaciales)
        Schema::table('celdas', function (Blueprint $table) {
            $table->index(['latitud', 'longitud']);
        });

        // ====================================================================
        // work_orders: Índices para gestión de OTs
        // ====================================================================
        
        // Índice para abonado_nro (relación con abonados)
        Schema::table('work_orders', function (Blueprint $table) {
            $table->index('abonado_nro');
        });

        // Índice para estado (filtros por estado de OT)
        Schema::table('work_orders', function (Blueprint $table) {
            $table->index('estado');
        });

        // Índice para fecha_creacion (ordenamiento cronológico)
        Schema::table('work_orders', function (Blueprint $table) {
            $table->index('created_at');
        });

        // ====================================================================
        // users: Índices para autenticación
        // ====================================================================
        
        // Índice para email (login por email)
        Schema::table('users', function (Blueprint $table) {
            $table->index('email');
        });

        // Índice para role (filtros por rol)
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        // ====================================================================
        // infraestructura: Índices para tablas jerárquicas
        // ====================================================================
        
        // Centrales
        if (Schema::hasTable('centrales')) {
            Schema::table('centrales', function (Blueprint $table) {
                $table->index('nombre');
            });
        }

        // Subcentrales
        if (Schema::hasTable('subcentrales')) {
            Schema::table('subcentrales', function (Blueprint $table) {
                $table->index('nombre');
                $table->index('id_central');
            });
        }

        // Shelters
        if (Schema::hasTable('shelters')) {
            Schema::table('shelters', function (Blueprint $table) {
                $table->index('nombre');
                $table->index('id_subcentral');
            });
        }

        // Armarios
        if (Schema::hasTable('armarios')) {
            Schema::table('armarios', function (Blueprint $table) {
                $table->index('nombre');
                $table->index('id_shelter');
            });
        }

        // ====================================================================
        // Analizar la base de datos para recomendar más optimizaciones
        // ====================================================================
        
        DB::statement("-- ============================================================================");
        DB::statement("-- Análisis de índices recomendado (ejecutar en psql):");
        DB::statement("-- ============================================================================");
        DB::statement("SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch FROM pg_stat_user_indexes WHERE schemaname = 'public' ORDER BY idx_scan DESC;");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        // Eliminar índices en orden inverso al de creación
        $indexesToDrop = [
            // users
            ['users', 'users_role_index'],
            ['users', 'users_email_index'],
            
            // work_orders
            ['work_orders', 'work_orders_created_at_index'],
            ['work_orders', 'work_orders_estado_index'],
            ['work_orders', 'work_orders_abonado_nro_index'],
            
            // celdas
            ['celdas', 'celdas_latitud_longitud_index'],
            ['celdas', 'celdas_tecnologia_index'],
            ['celdas', 'celdas_nombre_index'],
            
            // bitacora
            ['bitacora', 'bitacora_abonado_nro_timestamp_index'],
            
            // zonas
            ['zonas', 'zonas_nombre_index'],
            
            // clientes
            ['clientes', 'clientes_direccion_index'],
            ['clientes', 'clientes_nombre_completo_index'],
            
            // abonados_lineas
            ['abonados_lineas', 'abonados_lineas_fecha_servicio_index'],
            ['abonados_lineas', 'abonados_lineas_contrato_index'],
            ['abonados_lineas', 'abonados_lineas_numero_telefono_index'],
            ['abonados_lineas', 'abonados_lineas_id_celda_estado_operativo_index'],
            ['abonados_lineas', 'abonados_lineas_estado_servicio_estado_operativo_index'],
        ];

        foreach ($indexesToDrop as $index) {
            $table = $index[0];
            $indexName = $index[1];
            
            try {
                Schema::table($table, function (Blueprint $table) use ($indexName) {
                    $table->dropIndex($indexName);
                });
            } catch (\Exception $e) {
                // Índice no existe, continuar
            }
        }

        // Infraestructura
        $infraTables = ['centrales', 'subcentrales', 'shelters', 'armarios'];
        foreach ($infraTables as $table) {
            if (Schema::hasTable($table)) {
                try {
                    Schema::table($table, function (Blueprint $table) {
                        $table->dropIndexIfExists('nombre');
                    });
                } catch (\Exception $e) {
                    // Ignorar
                }
            }
        }
    }
};
