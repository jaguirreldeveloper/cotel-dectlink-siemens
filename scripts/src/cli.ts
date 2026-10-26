#!/usr/bin/env tsx
/**
 * COTEL DECTlink - CLI para herramientas de base de datos
 * 
 * Comandos disponibles:
 *   load-consolidado  - Carga el padrón real desde CSV consolidado
 *   db-check          - Detecta deriva schema.ts ↔ BD viva
 *   db-verify         - Smoke test de integridad en vivo
 *   cleanup-pruebas   - Elimina restos de datos de prueba
 *   smoke             - Verifica que el backend sirve el padrón real
 */

import { Command } from 'commander';
import { loadConsolidadoCommand } from './commands/load-consolidado.js';
import { dbCheckCommand } from './commands/db-check.js';
import { dbVerifyCommand } from './commands/db-verify.js';
import { cleanupPruebasCommand } from './commands/cleanup-pruebas.js';
import { smokeCommand } from './commands/smoke.js';

const program = new Command();

program
  .name('cotel-db')
  .description('COTEL DECTlink - Herramientas de base de datos y ETL')
  .version('0.0.0');

program
  .command('load-consolidado')
  .description('Carga el padrón real desde CSV consolidado (idempotente, conserva estados/GPS/auditoría)')
  .argument('[csvPath]', 'Ruta al CSV consolidado (default: F:\\CD-INAL-EA\\CONSOLIDADO_CELDAS_INALAMBRICAS.csv)')
  .option('--limpio', 'Recarga total descartando estados/GPS/auditoría previos')
  .action(loadConsolidadoCommand);

program
  .command('db-check')
  .description('Detector de deriva schema.ts ↔ BD viva (tablas, columnas, tipos, CHECK/FK)')
  .action(dbCheckCommand);

program
  .command('db-verify')
  .description('Smoke test de integridad en vivo (usa datos temporales que se auto-limpian)')
  .action(dbVerifyCommand);

program
  .command('cleanup-pruebas')
  .description('Elimina restos de datos de prueba conocidos y audita sospechosos')
  .action(cleanupPruebasCommand);

program
  .command('smoke')
  .description('Verificación de despliegue: el backend sirve el padrón real')
  .option('-u, --url <url>', 'URL del backend (default: http://127.0.0.1:8010)')
  .option('-e, --expected <number>', 'Número esperado de líneas (opcional)')
  .action(smokeCommand);

program.parseAsync(process.argv).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});