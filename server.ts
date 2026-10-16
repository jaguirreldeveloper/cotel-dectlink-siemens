import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

const execAsync = promisify(exec);
import {
  getAllSubscribers,
  updateSubscriberStatusInDb,
  updateSubscriberCoordinatesInDb,
  getOperationLogs,
  seedSubscribersIfEmpty,
} from './src/db/subscribersRepo.ts';
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
  app.patch('/api/subscribers/:nro/status', async (req, res) => {
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
  app.patch('/api/subscribers/:nro/coordinates', async (req, res) => {
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
        host: process.env.SQL_HOST || 'localhost',
        region: 'us-west1',
        instance: 'ai-studio-76427571',
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

  // 8. Live interactive SQL query console runner
  app.post('/api/database/query', async (req, res) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string' || !sql.trim()) {
        return res.status(400).json({ error: 'La consulta SQL no puede estar vacía' });
      }

      const trimmed = sql.trim();
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
        host: process.env.SQL_HOST || 'localhost',
        database: process.env.SQL_DB_NAME || 'cotel_dectlink',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Test connection to Supabase or external PostgreSQL without saving
  app.post('/api/database/test-connection', async (req, res) => {
    try {
      const { connectionString } = req.body;
      if (!connectionString || typeof connectionString !== 'string') {
        return res.status(400).json({ error: 'La cadena de conexión es requerida' });
      }

      const result = await testConnection(connectionString.trim());
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Hot-switch active database to Supabase
  app.post('/api/database/apply-connection', async (req, res) => {
    try {
      const { connectionString, seedIfEmpty } = req.body;
      if (!connectionString || typeof connectionString !== 'string') {
        return res.status(400).json({ error: 'La cadena de conexión es requerida' });
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
      const isGit = await execAsync('git rev-parse --is-inside-work-tree')
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

      const branch = await execAsync('git branch --show-current')
        .then(r => r.stdout.trim())
        .catch(() => 'main');

      const lastCommit = await execAsync('git log -1 --pretty=format:"%h - %s (%ci)"')
        .then(r => r.stdout.trim())
        .catch(() => 'Sin commits aún');

      const remoteUrl = await execAsync('git remote get-url origin')
        .then(r => r.stdout.trim())
        .catch(() => null);

      const statusOutput = await execAsync('git status --porcelain')
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
  app.post('/api/git/init', async (_req, res) => {
    try {
      await execAsync('git config user.name "COTEL Telecom Operator"').catch(() => {});
      await execAsync('git config user.email "operaciones@cotel.bo"').catch(() => {});

      await execAsync('git init -b main');
      await execAsync('git add .');
      await execAsync('git commit -m "feat: COTEL Siemens DECTlink telecom platform & Supabase migrations"');

      const lastCommit = await execAsync('git log -1 --pretty=format:"%h - %s (%ci)"')
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

  // 15. Git set remote URL endpoint
  app.post('/api/git/remote', async (req, res) => {
    try {
      const { remoteUrl } = req.body;
      if (!remoteUrl || typeof remoteUrl !== 'string') {
        return res.status(400).json({ error: 'La URL remota es requerida' });
      }

      await execAsync('git remote remove origin').catch(() => {});
      await execAsync(`git remote add origin ${remoteUrl.trim()}`);

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
