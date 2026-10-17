import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';
import {
  requireAdmin,
  isSafeRemoteUrl,
  getSqlRejectionReason,
  isAllowedDatabaseHost,
} from './src/server/adminAuth.ts';

const execFileAsync = promisify(execFile);
import {
  getAllSubscribers,
  updateSubscriberStatusInDb,
  updateSubscriberCoordinatesInDb,
  getOperationLogs,
  seedSubscribersIfEmpty,
} from './src/db/subscribersRepo.ts';
import {
  listWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  subscriberExists,
  WorkOrderInput,
  WorkOrderPatch,
} from './src/db/workOrdersRepo.ts';
import {
  listCuadrillas,
  createCuadrilla,
  updateCuadrilla,
  deleteCuadrilla,
  cuadrillaExists,
  CuadrillaInput,
  CuadrillaPatch,
} from './src/db/cuadrillasRepo.ts';
import {
  listMateriales,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  MaterialInput,
  MaterialPatch,
} from './src/db/materialesRepo.ts';
import {
  db,
  pool,
  getPool,
  getDb,
  testConnection,
  switchActiveDatabase,
  getCurrentConnectionInfo,
} from './src/db/index.ts';
import { celdasDect } from './src/db/schema.ts';
import { EXPANDED_DECT_RECORDS } from './src/data/initialData.ts';
import { enrichRecords } from './src/utils/analysis.ts';
import {
  generateFullSupabaseScript,
  generateSupabaseDDL,
  generateSupabaseSeed,
} from './src/utils/supabaseSqlGenerator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // SSE client pool for real-time synchronization between operators and technicians
  const sseClients: express.Response[] = [];

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    req.on('close', () => {
      const index = sseClients.indexOf(res);
      if (index !== -1) {
        sseClients.splice(index, 1);
      }
    });
  });

  // Heartbeat: mantiene vivas las conexiones a través de proxies y detecta clientes caídos
  setInterval(() => {
    for (let i = sseClients.length - 1; i >= 0; i--) {
      const client = sseClients[i];
      if (client.writableEnded || client.destroyed) {
        sseClients.splice(i, 1);
        continue;
      }
      try {
        client.write(': ping\n\n');
      } catch {
        sseClients.splice(i, 1);
      }
    }
  }, 25000);

  const broadcastEvent = (eventType: string, data: any) => {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach(client => {
      try {
        client.write(payload);
      } catch (err) {
        console.error('Error writing to SSE client:', err);
      }
    });
  };

  // 1. Get all subscribers from PostgreSQL
  app.get('/api/subscribers', async (_req, res) => {
    try {
      const subs = await getAllSubscribers();
      res.json(subs);
    } catch (err: any) {
      console.error('Failed to get subscribers:', err);
      res.status(500).json({ error: 'Error al consultar la base de datos PostgreSQL' });
    }
  });

  // 2. Get base stations
  app.get('/api/cells', async (_req, res) => {
    try {
      const cells = await getDb().select().from(celdasDect);
      res.json(cells);
    } catch (err: any) {
      console.error('Failed to get cells:', err);
      res.status(500).json({ error: 'Error al consultar celdas en PostgreSQL' });
    }
  });

  // 3. Update status in PostgreSQL and broadcast to all connected operators & crews in real-time
  app.patch('/api/subscribers/:nro/status', requireAdmin, async (req, res) => {
    try {
      const nro = parseInt(req.params.nro, 10);
      const { status, details, tecnico } = req.body;
      const updated = await updateSubscriberStatusInDb(nro, status, { ...details, tecnico });

      // Realtime push notification to all open browsers/crew tablets
      broadcastEvent('subscriber_updated', updated);

      res.json({ success: true, subscriber: updated });
    } catch (err: any) {
      console.error('Failed to update status in PostgreSQL:', err);
      res.status(500).json({ error: 'Error al actualizar estado en PostgreSQL' });
    }
  });

  // 3b. Update GPS coordinates from calibration module or field crew
  app.patch('/api/subscribers/:nro/coordinates', requireAdmin, async (req, res) => {
    try {
      const nro = parseInt(req.params.nro, 10);
      const { lat, lng, precision, tecnico } = req.body;
      const updated = await updateSubscriberCoordinatesInDb(nro, lat, lng, { precision, tecnico });

      // Realtime push notification
      broadcastEvent('subscriber_coordinates_calibrated', updated);

      res.json({ success: true, subscriber: updated });
    } catch (err: any) {
      console.error('Failed to update coordinates in PostgreSQL:', err);
      res.status(500).json({ error: 'Error al calibrar coordenadas en PostgreSQL' });
    }
  });

  // 3c. Work orders (Kanban de cuadrillas): listado público, escritura protegida
  app.get('/api/work-orders', async (_req, res) => {
    try {
      const orders = await listWorkOrders();
      res.json(orders);
    } catch (err: any) {
      console.error('Failed to get work orders:', err);
      res.status(500).json({ error: 'Error al consultar órdenes de trabajo' });
    }
  });

  app.post('/api/work-orders', requireAdmin, async (req, res) => {
    try {
      const input: WorkOrderInput = req.body || {};
      if (!input.titulo || typeof input.titulo !== 'string' || !input.titulo.trim()) {
        return res.status(400).json({ error: 'El título de la orden de trabajo es obligatorio' });
      }

      if (input.abonadoNro != null && !(await subscriberExists(input.abonadoNro))) {
        return res.status(400).json({ error: `No existe un abonado con NRO ${input.abonadoNro}` });
      }

      if (input.cuadrillaId && input.cuadrillaId.trim() && !(await cuadrillaExists(input.cuadrillaId.trim()))) {
        return res.status(400).json({ error: `No existe una cuadrilla con id ${input.cuadrillaId}` });
      }

      const created = await createWorkOrder(input);

      broadcastEvent('work_order_updated', { action: 'created', workOrder: created });

      res.json({ success: true, workOrder: created });
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      res.status(500).json({ error: 'Error al crear la orden de trabajo' });
    }
  });

  app.patch('/api/work-orders/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const patch: WorkOrderPatch = req.body || {};

      if (patch.abonadoNro != null && !(await subscriberExists(patch.abonadoNro))) {
        return res.status(400).json({ error: `No existe un abonado con NRO ${patch.abonadoNro}` });
      }

      if (patch.cuadrillaId && patch.cuadrillaId.trim() && !(await cuadrillaExists(patch.cuadrillaId.trim()))) {
        return res.status(400).json({ error: `No existe una cuadrilla con id ${patch.cuadrillaId}` });
      }

      const updated = await updateWorkOrder(id, patch);
      if (!updated) {
        return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
      }

      broadcastEvent('work_order_updated', { action: 'updated', workOrder: updated });

      res.json({ success: true, workOrder: updated });
    } catch (err: any) {
      console.error('Failed to update work order:', err);
      res.status(500).json({ error: 'Error al actualizar la orden de trabajo' });
    }
  });

  app.delete('/api/work-orders/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await deleteWorkOrder(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Orden de trabajo no encontrada' });
      }

      broadcastEvent('work_order_updated', { action: 'deleted', workOrderId: id });

      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to delete work order:', err);
      res.status(500).json({ error: 'Error al eliminar la orden de trabajo' });
    }
  });

  // 3d. Catálogo de cuadrillas: lectura pública, escritura protegida
  app.get('/api/cuadrillas', async (_req, res) => {
    try {
      res.json(await listCuadrillas());
    } catch (err: any) {
      console.error('Failed to get cuadrillas:', err);
      res.status(500).json({ error: 'Error al consultar cuadrillas' });
    }
  });

  app.post('/api/cuadrillas', requireAdmin, async (req, res) => {
    try {
      const input: CuadrillaInput = req.body || {};
      if (!input.nombre || typeof input.nombre !== 'string' || !input.nombre.trim()) {
        return res.status(400).json({ error: 'El nombre de la cuadrilla es obligatorio' });
      }
      const created = await createCuadrilla(input);
      broadcastEvent('work_order_updated', { action: 'cuadrilla_created', cuadrilla: created });
      res.json({ success: true, cuadrilla: created });
    } catch (err: any) {
      console.error('Failed to create cuadrilla:', err);
      res.status(500).json({ error: 'Error al crear la cuadrilla' });
    }
  });

  app.patch('/api/cuadrillas/:id', requireAdmin, async (req, res) => {
    try {
      const patch: CuadrillaPatch = req.body || {};
      const updated = await updateCuadrilla(req.params.id, patch);
      if (!updated) return res.status(404).json({ error: 'Cuadrilla no encontrada' });
      broadcastEvent('work_order_updated', { action: 'cuadrilla_updated', cuadrilla: updated });
      res.json({ success: true, cuadrilla: updated });
    } catch (err: any) {
      console.error('Failed to update cuadrilla:', err);
      res.status(500).json({ error: 'Error al actualizar la cuadrilla' });
    }
  });

  app.delete('/api/cuadrillas/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await deleteCuadrilla(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Cuadrilla no encontrada' });
      broadcastEvent('work_order_updated', { action: 'cuadrilla_deleted', cuadrillaId: req.params.id });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to delete cuadrilla:', err);
      res.status(500).json({ error: 'Error al eliminar la cuadrilla' });
    }
  });

  // 3e. Catálogo de materiales: lectura pública, escritura protegida
  app.get('/api/materiales', async (_req, res) => {
    try {
      res.json(await listMateriales());
    } catch (err: any) {
      console.error('Failed to get materiales:', err);
      res.status(500).json({ error: 'Error al consultar materiales' });
    }
  });

  app.post('/api/materiales', requireAdmin, async (req, res) => {
    try {
      const input: MaterialInput = req.body || {};
      if (!input.nombre || typeof input.nombre !== 'string' || !input.nombre.trim()) {
        return res.status(400).json({ error: 'El nombre del material es obligatorio' });
      }
      const created = await createMaterial(input);
      res.json({ success: true, material: created });
    } catch (err: any) {
      console.error('Failed to create material:', err);
      res.status(500).json({ error: 'Error al crear el material' });
    }
  });

  app.patch('/api/materiales/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Id de material inválido' });
      const patch: MaterialPatch = req.body || {};
      const updated = await updateMaterial(id, patch);
      if (!updated) return res.status(404).json({ error: 'Material no encontrado' });
      res.json({ success: true, material: updated });
    } catch (err: any) {
      console.error('Failed to update material:', err);
      res.status(500).json({ error: 'Error al actualizar el material' });
    }
  });

  app.delete('/api/materiales/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Id de material inválido' });
      const deleted = await deleteMaterial(id);
      if (!deleted) return res.status(404).json({ error: 'Material no encontrado' });
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to delete material:', err);
      res.status(500).json({ error: 'Error al eliminar el material' });
    }
  });

  // 4. Get recent operation logs
  app.get('/api/logs', async (_req, res) => {
    try {
      const logs = await getOperationLogs();
      res.json(logs);
    } catch (err: any) {
      console.error('Failed to get logs:', err);
      res.status(500).json({ error: 'Error al consultar bitácora' });
    }
  });

  // 5. Database status & metadata (PostgreSQL Cloud SQL / Supabase)
  app.get('/api/database/status', async (_req, res) => {
    try {
      const startTime = Date.now();
      const versionResult = await getPool().query('SELECT version();');
      const latency = Date.now() - startTime;

      const dbInfoResult = await getPool().query(`
        SELECT 
          current_database() as database_name,
          current_user as user_name,
          pg_size_pretty(pg_database_size(current_database())) as total_size;
      `);

      const countsResult = await getPool().query(`
        SELECT 
          (SELECT COUNT(*) FROM celdas_dect) as celdas_count,
          (SELECT COUNT(*) FROM abonados_dect) as abonados_count,
          (SELECT COUNT(*) FROM bitacora_dect) as bitacora_count;
      `);

      const connectionInfo = getCurrentConnectionInfo();

      res.json({
        connected: true,
        provider: connectionInfo.provider,
        isSupabase: connectionInfo.isSupabase,
        host: connectionInfo.host,
        region: connectionInfo.region,
        instance: connectionInfo.projectRef,
        database: dbInfoResult.rows[0]?.database_name || process.env.SQL_DB_NAME,
        user: dbInfoResult.rows[0]?.user_name || process.env.SQL_USER,
        version: versionResult.rows[0]?.version || 'PostgreSQL',
        size: dbInfoResult.rows[0]?.total_size || 'N/A',
        latencyMs: latency,
        counts: {
          celdas: parseInt(countsResult.rows[0]?.celdas_count || '0', 10),
          abonados: parseInt(countsResult.rows[0]?.abonados_count || '0', 10),
          bitacora: parseInt(countsResult.rows[0]?.bitacora_count || '0', 10),
        },
      });
    } catch (err: any) {
      console.error('Failed to get database status:', err);
      res.status(500).json({
        connected: false,
        error: err.message || 'Error al conectar con PostgreSQL',
      });
    }
  });

  // 6. Schema metadata: tables, columns, counts
  app.get('/api/database/schema', async (_req, res) => {
    try {
      const tablesResult = await getPool().query(`
        SELECT 
          table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      const columnsResult = await getPool().query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);

      const countsResult = await getPool().query(`
        SELECT 
          (SELECT COUNT(*) FROM celdas_dect) as celdas_dect,
          (SELECT COUNT(*) FROM abonados_dect) as abonados_dect,
          (SELECT COUNT(*) FROM bitacora_dect) as bitacora_dect,
          (SELECT COUNT(*) FROM users) as users;
      `);
      const countsMap: Record<string, number> = {
        celdas_dect: parseInt(countsResult.rows[0]?.celdas_dect || '0', 10),
        abonados_dect: parseInt(countsResult.rows[0]?.abonados_dect || '0', 10),
        bitacora_dect: parseInt(countsResult.rows[0]?.bitacora_dect || '0', 10),
        users: parseInt(countsResult.rows[0]?.users || '0', 10),
      };

      const tables = tablesResult.rows.map((t: any) => {
        const cols = columnsResult.rows.filter((c: any) => c.table_name === t.table_name);
        return {
          name: t.table_name,
          rowCount: countsMap[t.table_name] ?? 0,
          columns: cols.map((c: any) => ({
            name: c.column_name,
            dataType: c.data_type,
            isNullable: c.is_nullable === 'YES',
            default: c.column_default,
            ordinal: c.ordinal_position,
          })),
        };
      });

      res.json({ tables });
    } catch (err: any) {
      console.error('Failed to get schema:', err);
      res.status(500).json({ error: 'Error al inspeccionar esquema de PostgreSQL' });
    }
  });

  // 7. Paginated table data viewer
  app.get('/api/database/tables/:table/data', async (req, res) => {
    try {
      const allowedTables = ['celdas_dect', 'abonados_dect', 'bitacora_dect', 'users'];
      const tableName = req.params.table;

      if (!allowedTables.includes(tableName)) {
        return res.status(400).json({ error: `Tabla no permitida o inexistente: ${tableName}` });
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();

      const colsResult = await getPool().query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public' ORDER BY ordinal_position`,
        [tableName]
      );
      const columns = colsResult.rows;

      let whereClause = '';
      const params: any[] = [];
      if (search) {
        const textCols = columns.filter((c: any) => ['character varying', 'text', 'character'].includes(c.data_type));
        if (textCols.length > 0) {
          const conditions = textCols.map((c: any) => `"${c.column_name}"::text ILIKE $1`);
          whereClause = `WHERE ${conditions.join(' OR ')}`;
          params.push(`%${search}%`);
        }
      }

      const countSql = `SELECT COUNT(*) FROM "${tableName}" ${whereClause}`;
      const countRes = await getPool().query(countSql, params);
      const total = parseInt(countRes.rows[0].count, 10);

      const dataSql = `SELECT * FROM "${tableName}" ${whereClause} ORDER BY 1 ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const dataRes = await getPool().query(dataSql, [...params, limit, offset]);

      res.json({
        table: tableName,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        columns: columns.map((c: any) => c.column_name),
        rows: dataRes.rows,
      });
    } catch (err: any) {
      console.error(`Failed to get data for table ${req.params.table}:`, err);
      res.status(500).json({ error: `Error al leer registros de ${req.params.table}` });
    }
  });

  // 8. Live interactive SQL query console runner (read-only, admin token required)
  app.post('/api/database/query', requireAdmin, async (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return res.status(400).json({ error: 'La consulta SQL no puede estar vacía' });
      }

      const rejection = getSqlRejectionReason(sql);
      if (rejection) {
        return res.status(403).json({ success: false, error: rejection });
      }

      const trimmed = sql.trim().replace(/;+\s*$/, '');
      const startTime = performance.now();

      const queryResult = await getPool().query(trimmed);
      const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

      res.json({
        success: true,
        command: queryResult.command,
        rowCount: queryResult.rowCount ?? queryResult.rows?.length ?? 0,
        durationMs,
        fields: (queryResult.fields || []).map((f: any) => ({
          name: f.name,
          dataTypeId: f.dataTypeID,
        })),
        rows: queryResult.rows || [],
      });
    } catch (err: any) {
      console.error('SQL query execution error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Error en la ejecución de la consulta SQL',
        detail: err.detail || null,
        hint: err.hint || null,
        position: err.position || null,
      });
    }
  });

  // 9. Current connection information & provider
  app.get('/api/database/connection-info', async (_req, res) => {
    try {
      const info = getCurrentConnectionInfo();
      res.json({
        ...info,
        host: info.host,
        database: info.database,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Test connection to Supabase or external PostgreSQL without saving (admin token required)
  app.post('/api/database/test-connection', requireAdmin, async (req, res) => {
    try {
      const { connectionString } = req.body;
      if (!connectionString || typeof connectionString !== 'string') {
        return res.status(400).json({ error: 'La cadena de conexión es requerida' });
      }

      if (!isAllowedDatabaseHost(connectionString.trim())) {
        return res.status(403).json({
          success: false,
          error: 'Host de base de datos no permitido. Configure ALLOWED_DB_HOSTS en el servidor para ampliar la lista.',
        });
      }

      const result = await testConnection(connectionString.trim());
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Hot-switch active database to Supabase (admin token required)
  app.post('/api/database/apply-connection', requireAdmin, async (req, res) => {
    try {
      const { connectionString, seedIfEmpty } = req.body;
      if (!connectionString || typeof connectionString !== 'string') {
        return res.status(400).json({ error: 'La cadena de conexión es requerida' });
      }

      if (!isAllowedDatabaseHost(connectionString.trim())) {
        return res.status(403).json({
          success: false,
          error: 'Host de base de datos no permitido. Configure ALLOWED_DB_HOSTS en el servidor para ampliar la lista.',
        });
      }

      const switchResult = await switchActiveDatabase(connectionString.trim());
      if (!switchResult.success) {
        return res.status(400).json(switchResult);
      }

      // Automatically seed sample data if requested
      if (seedIfEmpty) {
        const enrichedInitial = enrichRecords(EXPANDED_DECT_RECORDS);
        await seedSubscribersIfEmpty(enrichedInitial);
      }

      broadcastEvent('database_switched', {
        provider: switchResult.provider,
        database: switchResult.database,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Conexión a Supabase establecida y conmutada exitosamente',
        provider: switchResult.provider,
        database: switchResult.database,
      });
    } catch (err: any) {
      console.error('Error switching database connection:', err);
      res.status(500).json({ success: false, error: err.message || 'Error al conmutar base de datos' });
    }
  });

  // 12. Export SQL DDL + Seed scripts for Supabase
  app.get('/api/database/export-sql', async (_req, res) => {
    try {
      const fullScript = generateFullSupabaseScript();
      const ddl = generateSupabaseDDL();
      const seed = generateSupabaseSeed();

      res.json({
        fullScript,
        ddl,
        seed,
        filename: 'cotel_supabase_schema_seed.sql',
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al generar script SQL de Supabase' });
    }
  });

  // 13. Git status endpoint
  app.get('/api/git/status', async (_req, res) => {
    try {
      const isGit = await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'])
        .then(() => true)
        .catch(() => false);

      if (!isGit) {
        return res.json({
          initialized: false,
          branch: null,
          lastCommit: null,
          remoteUrl: null,
          changedFiles: 0,
        });
      }

      const branch = await execFileAsync('git', ['branch', '--show-current'])
        .then(r => r.stdout.trim())
        .catch(() => 'main');

      const lastCommit = await execFileAsync('git', ['log', '-1', '--pretty=format:%h - %s (%ci)'])
        .then(r => r.stdout.trim())
        .catch(() => 'Sin commits aún');

      const remoteUrl = await execFileAsync('git', ['remote', 'get-url', 'origin'])
        .then(r => r.stdout.trim())
        .catch(() => null);

      const statusOutput = await execFileAsync('git', ['status', '--porcelain'])
        .then(r => r.stdout.trim())
        .catch(() => '');

      const changedFiles = statusOutput ? statusOutput.split('\n').filter(Boolean).length : 0;

      res.json({
        initialized: true,
        branch: branch || 'main',
        lastCommit,
        remoteUrl,
        changedFiles,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al consultar estado de Git' });
    }
  });

  // 14. Git init and initial commit endpoint
  app.post('/api/git/init', requireAdmin, async (_req, res) => {
    try {
      await execFileAsync('git', ['config', 'user.name', 'COTEL Telecom Operator']).catch(() => {});
      await execFileAsync('git', ['config', 'user.email', 'operaciones@cotel.bo']).catch(() => {});

      await execFileAsync('git', ['init', '-b', 'main']);
      await execFileAsync('git', ['add', '.']);
      await execFileAsync('git', ['commit', '-m', 'feat: COTEL Siemens DECTlink telecom platform & Supabase migrations']);

      const lastCommit = await execFileAsync('git', ['log', '-1', '--pretty=format:%h - %s (%ci)'])
        .then(r => r.stdout.trim())
        .catch(() => 'Commit inicial creado');

      res.json({
        success: true,
        message: 'Repositorio Git inicializado con rama main y primer commit.',
        lastCommit,
      });
    } catch (err: any) {
      console.error('Git init error:', err);
      res.status(500).json({ success: false, error: err.message || 'Error al inicializar Git' });
    }
  });

  // 15. Git set remote URL endpoint (solo GitHub HTTPS, sin shell interpolation)
  app.post('/api/git/remote', requireAdmin, async (req, res) => {
    try {
      const { remoteUrl } = req.body;
      if (!remoteUrl || typeof remoteUrl !== 'string') {
        return res.status(400).json({ error: 'La URL remota es requerida' });
      }

      if (!isSafeRemoteUrl(remoteUrl)) {
        return res
          .status(400)
          .json({ error: 'URL inválida: se admite únicamente HTTPS de GitHub (https://github.com/usuario/repositorio).' });
      }

      await execFileAsync('git', ['remote', 'remove', 'origin']).catch(() => {});
      await execFileAsync('git', ['remote', 'add', 'origin', remoteUrl.trim()]);

      res.json({
        success: true,
        remoteUrl: remoteUrl.trim(),
        message: 'Remoto origin configurado exitosamente',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error al configurar remoto Git' });
    }
  });

  // Automatically seed initial data on first launch if empty
  const enrichedInitial = enrichRecords(EXPANDED_DECT_RECORDS);
  seedSubscribersIfEmpty(enrichedInitial).catch(err => {
    console.error('Initial database seed check failed:', err);
  });

  // Mount Vite in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COTEL Siemens DECTlink Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
});
