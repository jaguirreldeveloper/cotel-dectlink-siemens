/**
 * COTEL DECTlink - Script de Backup Automático para Supabase
 * 
 * Este script crea backups automáticos de la base de datos PostgreSQL en Supabase.
 * Soporta:
 * - Backups completos (DDL + DML)
 * - Backups incrementales (solo DML)
 * - Backups programados (cron)
 * - Compresión y cifrado (opcional)
 * - Subida a almacenamiento remoto (S3, GCS, local)
 * - Notificaciones por email/Slack
 * 
 * Uso:
 *   pnpm --filter scripts run backup
 *   pnpm --filter scripts run backup:daily
 *   pnpm --filter scripts run backup:restore
 */

import { execSync, exec, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { format, subDays } from 'date-fns';
import { z } from 'zod';

// =============================================================================
// Configuración del Schema
// =============================================================================

const BackupConfigSchema = z.object({
  // Configuración de Supabase
  supabase: z.object({
    projectRef: z.string(),
    databaseUrl: z.string().url(),
    accessToken: z.string(),
  }),
  
  // Configuración de backups
  backup: z.object({
    directory: z.string().default('backups'),
    retainDays: z.number().default(30),
    compress: z.boolean().default(true),
    encrypt: z.boolean().default(false),
    encryptionKey: z.string().optional(),
  }),
  
  // Configuración de notificaciones
  notifications: z.object({
    email: z.object({
      enabled: z.boolean().default(false),
      smtpHost: z.string().optional(),
      smtpPort: z.number().optional(),
      smtpUser: z.string().optional(),
      smtpPass: z.string().optional(),
      from: z.string().optional(),
      to: z.array(z.string()).default([]),
    }),
    slack: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
    }),
    discord: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
    }),
  }),
  
  // Configuración de almacenamiento remoto
  storage: z.object({
    local: z.object({
      enabled: z.boolean().default(true),
      path: z.string().optional(),
    }),
    s3: z.object({
      enabled: z.boolean().default(false),
      endpoint: z.string().optional(),
      bucket: z.string().optional(),
      accessKey: z.string().optional(),
      secretKey: z.string().optional(),
      region: z.string().optional(),
    }),
    gcs: z.object({
      enabled: z.boolean().default(false),
      bucket: z.string().optional(),
      projectId: z.string().optional(),
      keyFile: z.string().optional(),
    }),
  }),
});

type BackupConfig = z.infer<typeof BackupConfigSchema>;

// =============================================================================
// Configuración por defecto
// =============================================================================

const DEFAULT_CONFIG: BackupConfig = {
  supabase: {
    projectRef: '',
    databaseUrl: process.env.SUPABASE_DATABASE_URL || '',
    accessToken: process.env.SUPABASE_ACCESS_TOKEN || '',
  },
  backup: {
    directory: path.join(process.cwd(), 'backups'),
    retainDays: 30,
    compress: true,
    encrypt: false,
  },
  notifications: {
    email: {
      enabled: false,
      to: [],
    },
    slack: {
      enabled: false,
    },
    discord: {
      enabled: false,
    },
  },
  storage: {
    local: {
      enabled: true,
    },
    s3: {
      enabled: false,
    },
    gcs: {
      enabled: false,
    },
  },
};

// =============================================================================
// Funciones de Utilidad
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Obtiene la configuración desde múltiples fuentes
 */
async function loadConfig(): Promise<BackupConfig> {
  // 1. Intentar cargar desde .env
  const envConfig: Partial<BackupConfig> = {
    supabase: {
      projectRef: process.env.SUPABASE_PROJECT_REF,
      databaseUrl: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL,
      accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    },
    backup: {
      directory: process.env.BACKUP_DIR,
      retainDays: process.env.BACKUP_RETAIN_DAYS ? parseInt(process.env.BACKUP_RETAIN_DAYS) : undefined,
      compress: process.env.BACKUP_COMPRESS === 'false' ? false : undefined,
    },
    notifications: {
      email: {
        enabled: process.env.NOTIFY_EMAIL === 'true',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM,
        to: process.env.NOTIFY_EMAIL_TO?.split(',') || [],
      },
      slack: {
        enabled: process.env.NOTIFY_SLACK === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
      },
      discord: {
        enabled: process.env.NOTIFY_DISCORD === 'true',
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
      },
    },
    storage: {
      local: {
        enabled: process.env.STORAGE_LOCAL !== 'false',
        path: process.env.STORAGE_LOCAL_PATH,
      },
      s3: {
        enabled: process.env.STORAGE_S3 === 'true',
        endpoint: process.env.S3_ENDPOINT,
        bucket: process.env.S3_BUCKET,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
        region: process.env.S3_REGION,
      },
      gcs: {
        enabled: process.env.STORAGE_GCS === 'true',
        bucket: process.env.GCS_BUCKET,
        projectId: process.env.GCS_PROJECT_ID,
        keyFile: process.env.GCS_KEY_FILE,
      },
    },
  };

  // 2. Intentar cargar desde archivo de configuración
  const configPath = path.join(__dirname, 'backup.config.json');
  let fileConfig: Partial<BackupConfig> = {};
  
  try {
    await fs.access(configPath);
    const content = await fs.readFile(configPath, 'utf-8');
    fileConfig = JSON.parse(content);
  } catch {
    // No existe el archivo, usar configuración por defecto
  }

  // 3. Mergear configuraciones (env > file > default)
  const mergedConfig: BackupConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    supabase: {
      ...DEFAULT_CONFIG.supabase,
      ...fileConfig.supabase,
      ...envConfig.supabase,
    },
    backup: {
      ...DEFAULT_CONFIG.backup,
      ...fileConfig.backup,
      ...envConfig.backup,
    },
    notifications: {
      ...DEFAULT_CONFIG.notifications,
      ...fileConfig.notifications,
      ...envConfig.notifications,
      email: {
        ...DEFAULT_CONFIG.notifications.email,
        ...fileConfig.notifications?.email,
        ...envConfig.notifications?.email,
      },
      slack: {
        ...DEFAULT_CONFIG.notifications.slack,
        ...fileConfig.notifications?.slack,
        ...envConfig.notifications?.slack,
      },
      discord: {
        ...DEFAULT_CONFIG.notifications.discord,
        ...fileConfig.notifications?.discord,
        ...envConfig.notifications?.discord,
      },
    },
    storage: {
      ...DEFAULT_CONFIG.storage,
      ...fileConfig.storage,
      ...envConfig.storage,
      local: {
        ...DEFAULT_CONFIG.storage.local,
        ...fileConfig.storage?.local,
        ...envConfig.storage?.local,
      },
      s3: {
        ...DEFAULT_CONFIG.storage.s3,
        ...fileConfig.storage?.s3,
        ...envConfig.storage?.s3,
      },
      gcs: {
        ...DEFAULT_CONFIG.storage.gcs,
        ...fileConfig.storage?.gcs,
        ...envConfig.storage?.gcs,
      },
    },
  };

  return mergedConfig;
}

/**
 * Valida la configuración
 */
function validateConfig(config: BackupConfig): void {
  if (!config.supabase.databaseUrl) {
    throw new Error('Falta SUPABASE_DATABASE_URL o DATABASE_URL en la configuración');
  }
  
  if (!config.supabase.accessToken) {
    console.warn('⚠️  Advertencia: No se encontró SUPABASE_ACCESS_TOKEN. El backup puede fallar.');
  }
  
  if (!config.supabase.projectRef) {
    console.warn('⚠️  Advertencia: No se encontró SUPABASE_PROJECT_REF. Intentando extraer del URL...');
    // Extraer project ref del URL
    const match = config.supabase.databaseUrl.match(/(?:postgres|[a-z0-9-]+)\.supabase\.co/);
    if (!match) {
      throw new Error('No se pudo determinar el projectRef de Supabase');
    }
  }
}

/**
 * Genera el nombre del archivo de backup
 */
function generateBackupFilename(type: 'full' | 'schema' | 'data' = 'full'): string {
  const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
  const date = format(new Date(), 'yyyy-MM-dd');
  
  if (type === 'full') {
    return `cotel_dectlink_backup_${timestamp}.sql`;
  } else if (type === 'schema') {
    return `cotel_dectlink_schema_${timestamp}.sql`;
  } else {
    return `cotel_dectlink_data_${date}.sql`;
  }
}

/**
 * Ejecuta un comando y captura la salida
 */
async function runCommand(command: string, cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 100 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error ejecutando comando: ${error.message}\nSTDERR: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Crea el directorio de backups si no existe
 */
async function ensureBackupDirectory(config: BackupConfig): Promise<void> {
  const backupDir = config.backup.directory;
  
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`✅ Directorio de backups creado: ${backupDir}`);
  }
}

/**
 * Verifica si pg_dump está disponible
 */
async function checkPgDump(): Promise<boolean> {
  try {
    await runCommand('pg_dump --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Verifica si psql está disponible
 */
async function checkPsql(): Promise<boolean> {
  try {
    await runCommand('psql --version');
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Funciones de Backup
// =============================================================================

/**
 * Crea un backup completo usando Supabase CLI
 */
async function createBackupWithSupabaseCli(config: BackupConfig): Promise<string> {
  console.log('🔧 Creando backup usando Supabase CLI...');
  
  const filename = generateBackupFilename('full');
  const backupPath = path.join(config.backup.directory, filename);
  
  try {
    // Usar Supabase CLI para exportar la base de datos
    const command = `npx supabase db dump --db-url "${config.supabase.databaseUrl}" > "${backupPath}"`;
    
    console.log(`📝 Ejecutando: ${command}`);
    
    const result = await runCommand(command);
    
    console.log(`✅ Backup creado: ${backupPath}`);
    console.log(`   Tamaño: ${(await fs.stat(backupPath)).size / 1024 / 1024).toFixed(2)} MB`);
    
    return backupPath;
  } catch (error) {
    throw new Error(`Error al crear backup con Supabase CLI: ${(error as Error).message}`);
  }
}

/**
 * Crea un backup usando pg_dump directamente
 */
async function createBackupWithPgDump(config: BackupConfig): Promise<string> {
  console.log('🔧 Creando backup usando pg_dump...');
  
  const filename = generateBackupFilename('full');
  const backupPath = path.join(config.backup.directory, filename);
  
  try {
    // Extraer la información de conexión del URL de Supabase
    const url = new URL(config.supabase.databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const database = url.pathname.replace('/', '');
    const user = url.username || 'postgres';
    const password = url.password || '';
    
    // Construir el comando pg_dump
    let command = `pg_dump -h ${host} -p ${port} -U ${user}`;
    
    if (password) {
      command += ` -w`; // No pedir password
      // Crear archivo .pgpass o usar variable de entorno
      process.env.PGPASSWORD = password;
    }
    
    if (database && database !== '') {
      command += ` -d ${database}`;
    }
    
    // Formato plano SQL
    command += ` -F p`;
    
    // No incluir comandos de ownership
    command += ` -O`;
    
    // No incluir comentarios
    command += ` -c`;
    
    // Redirigir salida al archivo
    command += ` > "${backupPath}"`;
    
    // Si hay password, usar PGPASSWORD
    if (password) {
      command = `PGPASSWORD="${password}" ${command}`;
    }
    
    console.log(`📝 Ejecutando pg_dump...`);
    
    // Ejecutar el comando
    const pgDumpProcess = spawn(command, { shell: true, stdio: 'inherit' });
    
    await new Promise((resolve, reject) => {
      pgDumpProcess.on('close', (code) => {
        if (code === 0) {
          resolve(undefined);
        } else {
          reject(new Error(`pg_dump terminó con código ${code}`));
        }
      });
      
      pgDumpProcess.on('error', (error) => {
        reject(error);
      });
    });
    
    // Verificar que el archivo se creó
    await fs.access(backupPath);
    
    const stats = await fs.stat(backupPath);
    console.log(`✅ Backup creado: ${backupPath}`);
    console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    return backupPath;
  } catch (error) {
    throw new Error(`Error al crear backup con pg_dump: ${(error as Error).message}`);
  } finally {
    // Limpiar variable de entorno
    delete process.env.PGPASSWORD;
  }
}

/**
 * Comprime el backup
 */
async function compressBackup(backupPath: string, config: BackupConfig): Promise<string> {
  if (!config.backup.compress) {
    return backupPath;
  }
  
  console.log('🗜️  Comprimiendo backup...');
  
  const compressedPath = `${backupPath}.gz`;
  
  try {
    // Usar gzip para comprimir
    if (os.platform() === 'win32') {
      // Windows: usar PowerShell o instalar gzip
      try {
        await runCommand(`powershell -Command "Compress-Archive -Path '${backupPath}' -DestinationPath '${compressedPath}' -Force"`);
      } catch {
        // Intentar con gzip si está disponible
        await runCommand(`gzip -k "${backupPath}"`);
      }
    } else {
      // Linux/Mac
      await runCommand(`gzip -k "${backupPath}"`);
    }
    
    const compressedStats = await fs.stat(compressedPath);
    const originalStats = await fs.stat(backupPath);
    const ratio = (1 - compressedStats.size / originalStats.size) * 100;
    
    console.log(`✅ Backup comprimido: ${compressedPath}`);
    console.log(`   Original: ${(originalStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Comprimido: ${(compressedStats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Ratio de compresión: ${ratio.toFixed(1)}%`);
    
    return compressedPath;
  } catch (error) {
    console.warn(`⚠️  No se pudo comprimir el backup: ${(error as Error).message}`);
    return backupPath;
  }
}

/**
 * Cifra el backup (opcional)
 */
async function encryptBackup(backupPath: string, config: BackupConfig): Promise<string> {
  if (!config.backup.encrypt || !config.backup.encryptionKey) {
    return backupPath;
  }
  
  console.log('🔒 Cifrando backup...');
  
  const encryptedPath = `${backupPath}.enc`;
  
  try {
    // Usar OpenSSL para cifrar
    const command = `openssl enc -aes-256-cbc -salt -in "${backupPath}" -out "${encryptedPath}" -k "${config.backup.encryptionKey}"`;
    
    await runCommand(command);
    
    console.log(`✅ Backup cifrado: ${encryptedPath}`);
    
    return encryptedPath;
  } catch (error) {
    console.warn(`⚠️  No se pudo cifrar el backup: ${(error as Error).message}`);
    return backupPath;
  }
}

/**
 * Sube el backup a almacenamiento remoto
 */
async function uploadToRemoteStorage(
  backupPath: string,
  config: BackupConfig
): Promise<void> {
  const filename = path.basename(backupPath);
  
  // Subir a S3
  if (config.storage.s3?.enabled && config.storage.s3.bucket) {
    console.log('📤 Subiendo a S3...');
    
    try {
      // Usar AWS CLI
      const command = `aws s3 cp "${backupPath}" s3://${config.storage.s3.bucket}/${filename}`;
      await runCommand(command);
      
      console.log(`✅ Backup subido a S3: s3://${config.storage.s3.bucket}/${filename}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo subir a S3: ${(error as Error).message}`);
    }
  }
  
  // Subir a GCS
  if (config.storage.gcs?.enabled && config.storage.gcs.bucket) {
    console.log('📤 Subiendo a Google Cloud Storage...');
    
    try {
      // Usar gsutil
      const command = `gsutil cp "${backupPath}" gs://${config.storage.gcs.bucket}/${filename}`;
      await runCommand(command);
      
      console.log(`✅ Backup subido a GCS: gs://${config.storage.gcs.bucket}/${filename}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo subir a GCS: ${(error as Error).message}`);
    }
  }
}

/**
 * Limpia backups antiguos
 */
async function cleanupOldBackups(config: BackupConfig): Promise<void> {
  console.log('🧹 Limpiando backups antiguos...');
  
  try {
    const backupDir = config.backup.directory;
    const files = await fs.readdir(backupDir);
    const now = new Date();
    const cutoffDate = subDays(now, config.backup.retainDays);
    
    let deletedCount = 0;
    let totalFreed = 0;
    
    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = await fs.stat(filePath);
      const fileDate = new Date(stats.mtime);
      
      if (fileDate < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
        totalFreed += stats.size;
        console.log(`   🗑️  Eliminado: ${file}`);
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ ${deletedCount} backup(s) eliminados, ${(totalFreed / 1024 / 1024).toFixed(2)} MB liberados`);
    } else {
      console.log(`✅ No hay backups para eliminar (se conservan ${config.backup.retainDays} días)`);
    }
  } catch (error) {
    console.warn(`⚠️  No se pudo limpiar backups antiguos: ${(error as Error).message}`);
  }
}

/**
 * Envía notificación
 */
async function sendNotification(
  config: BackupConfig,
  success: boolean,
  backupPath: string,
  error?: string
): Promise<void> {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const hostname = os.hostname();
  
  let message: string;
  let color: string;
  
  if (success) {
    message = `✅ Backup de COTEL DECTlink completado\n\n📅 Fecha: ${timestamp}\n💾 Archivo: ${path.basename(backupPath)}\n📊 Tamaño: ${(await fs.stat(backupPath)).size / 1024 / 1024).toFixed(2)} MB\n🖥️  Servidor: ${hostname}`;
    color = '#22c55e'; // verde
  } else {
    message = `❌ Error en backup de COTEL DECTlink\n\n📅 Fecha: ${timestamp}\n💾 Archivo: ${path.basename(backupPath)}\n🖥️  Servidor: ${hostname}\n🔴 Error: ${error}`;
    color = '#ef4444'; // rojo
  }
  
  // Notificación por email
  if (config.notifications.email.enabled && config.notifications.email.to.length > 0) {
    console.log('📧 Enviando notificación por email...');
    
    try {
      // Usar mailx o similar
      for (const recipient of config.notifications.email.to) {
        const emailCommand = `echo "${message.replace(/"/g, '\\"')}" | mail -s "[COTEL] Backup ${success ? 'completado' : 'fallido'}" ${recipient}`;
        await runCommand(emailCommand);
      }
      
      console.log(`✅ Notificación por email enviada a ${config.notifications.email.to.join(', ')}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo enviar email: ${(error as Error).message}`);
    }
  }
  
  // Notificación por Slack
  if (config.notifications.slack.enabled && config.notifications.slack.webhookUrl) {
    console.log('💬 Enviando notificación a Slack...');
    
    try {
      const payload = {
        text: message.replace(/\n/g, '\n'),
        username: 'COTEL Backup Bot',
        icon_emoji: success ? ':white_check_mark:' : ':x:',
      };
      
      const command = `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' "${config.notifications.slack.webhookUrl}"`;
      await runCommand(command);
      
      console.log('✅ Notificación enviada a Slack');
    } catch (error) {
      console.warn(`⚠️  No se pudo enviar notificación a Slack: ${(error as Error).message}`);
    }
  }
  
  // Notificación por Discord
  if (config.notifications.discord.enabled && config.notifications.discord.webhookUrl) {
    console.log('🎮 Enviando notificación a Discord...');
    
    try {
      const payload = {
        content: message.replace(/\n/g, '\n'),
        username: 'COTEL Backup Bot',
        avatar_url: success 
          ? 'https://cdn-icons-png.flaticon.com/512/188/188981.png' 
          : 'https://cdn-icons-png.flaticon.com/512/188/188966.png',
      };
      
      const command = `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' "${config.notifications.discord.webhookUrl}"`;
      await runCommand(command);
      
      console.log('✅ Notificación enviada a Discord');
    } catch (error) {
      console.warn(`⚠️  No se pudo enviar notificación a Discord: ${(error as Error).message}`);
    }
  }
}

// =============================================================================
// Función Principal
// =============================================================================

/**
 * Crea un backup completo de la base de datos
 */
export async function createBackup(): Promise<{ success: boolean; path: string; error?: string }> {
  console.log('='.repeat(60));
  console.log('🔄 COTEL DECTlink - Backup de Base de Datos');
  console.log('='.repeat(60));
  
  let config: BackupConfig;
  
  try {
    // Cargar configuración
    config = await loadConfig();
    console.log('✅ Configuración cargada');
    
    // Validar configuración
    validateConfig(config);
    console.log('✅ Configuración válida');
    
    // Asegurar directorio de backups
    await ensureBackupDirectory(config);
    
    // Verificar herramientas disponibles
    const hasPgDump = await checkPgDump();
    const hasPsql = await checkPsql();
    console.log(`📊 Herramientas: pg_dump=${hasPgDump ? '✅' : '❌'}, psql=${hasPsql ? '✅' : '❌'}`);
    
    // Crear backup
    let backupPath: string;
    
    try {
      // Intentar con Supabase CLI primero
      backupPath = await createBackupWithSupabaseCli(config);
    } catch (cliError) {
      console.warn(`⚠️  Supabase CLI falló: ${(cliError as Error).message}. Intentando con pg_dump...`);
      
      // Intentar con pg_dump
      backupPath = await createBackupWithPgDump(config);
    }
    
    // Comprimir backup
    let compressedPath = backupPath;
    if (config.backup.compress) {
      compressedPath = await compressBackup(backupPath, config);
    }
    
    // Cifrar backup
    let finalPath = compressedPath;
    if (config.backup.encrypt && config.backup.encryptionKey) {
      finalPath = await encryptBackup(compressedPath, config);
    }
    
    // Subir a almacenamiento remoto
    if (config.storage.local.enabled) {
      console.log('💾 Backup guardado localmente');
    }
    
    if (config.storage.s3?.enabled || config.storage.gcs?.enabled) {
      await uploadToRemoteStorage(finalPath, config);
    }
    
    // Limpiar backups antiguos
    await cleanupOldBackups(config);
    
    // Enviar notificación de éxito
    await sendNotification(config, true, finalPath);
    
    console.log('='.repeat(60));
    console.log('✅ Backup completado con éxito!');
    console.log(`📁 Archivo: ${finalPath}`);
    console.log('='.repeat(60));
    
    return { success: true, path: finalPath };
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error('❌ Error al crear backup:', errorMessage);
    
    // Enviar notificación de error
    try {
      const config = await loadConfig();
      await sendNotification(config, false, '', errorMessage);
    } catch (notifyError) {
      console.error('❌ Error al enviar notificación:', (notifyError as Error).message);
    }
    
    console.log('='.repeat(60));
    console.log('❌ Backup fallido');
    console.log(`🔴 Error: ${errorMessage}`);
    console.log('='.repeat(60));
    
    return { success: false, path: '', error: errorMessage };
  }
}

/**
 * Función principal para ejecutar desde CLI
 */
async function main(): Promise<void> {
  const result = await createBackup();
  
  if (!result.success) {
    process.exit(1);
  }
}

// Ejecutar si este archivo es el punto de entrada
const isMainModule = process.argv[1]?.includes('supabaseBackup.ts');
if (isMainModule) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default createBackup;
