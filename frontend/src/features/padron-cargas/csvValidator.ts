/**
 * Validación de archivos CSV para carga de padrón
 * 
 * Este módulo proporciona funciones para validar la estructura y contenido
 * de archivos CSV antes de enviarlos al backend, evitando errores y
 * mejorando la experiencia de usuario.
 */

/**
 * Columnas esperadas en el CSV del padrón COTEL DECTlink
 */
export const EXPECTED_COLUMNS = [
  'NRO',
  'NUMERO',
  'NRO_ABONADO',
  'NOMBRE',
  'DIRECCION',
  'CELDA',
  'ZONA',
  'CIUDAD',
  'TELEFONO',
  'CONTRATO',
  'ESTADO_SERVICIO',
  'ESTADO_OPERATIVO',
  'SEÑAL_DECT',
  'FAU_MODEL',
  'LATITUD',
  'LONGITUD',
  'DISTANCIA_KM',
  'AZIMUT_GRADOS',
  'FALLA_DESCRIPCION',
  'DEUDA_MESES',
  'TIEMPO_DEPOSITO_MESES',
] as const;

/**
 * Columnas obligatorias que deben estar presentes
 */
export const REQUIRED_COLUMNS = [
  'NRO',
  'NUMERO',
  'NOMBRE',
  'DIRECCION',
  'CELDA',
] as const;

/**
 * Valores válidos para ESTADO_SERVICIO
 */
export const VALID_ESTADOS_SERVICIO = [
  'ACTIVO',
  'INACTIVO',
  'SUSPENDIDO',
  'CORTADO',
  'RECONEXION',
  'DEPOSITO',
  'DEUDA',
  'SIN DATO',
] as const;

/**
 * Valores válidos para ESTADO_OPERATIVO
 */
export const VALID_ESTADOS_OPERATIVO = [
  'OPERATIVO',
  'NO OPERATIVO',
  'EN MANTENIMIENTO',
  'SIN DATO',
] as const;

/**
 * Resultado de la validación
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  columnCount: number;
  rowCount: number;
  missingColumns: string[];
  extraColumns: string[];
}

/**
 * Valida el contenido de un CSV antes de enviarlo
 */
export function validateCsvContent(csvText: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Limpiar el CSV (eliminar BOM si existe)
  const cleanCsv = csvText.charCodeAt(0) === 0xFEFF ? csvText.slice(1) : csvText;
  
  if (!cleanCsv.trim()) {
    return {
      valid: false,
      errors: ['El archivo CSV está vacío'],
      warnings: [],
      columnCount: 0,
      rowCount: 0,
      missingColumns: [],
      extraColumns: [],
    };
  }

  // Dividir en líneas
  const lines = cleanCsv.split('\n').filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    return {
      valid: false,
      errors: ['El archivo CSV está vacío'],
      warnings: [],
      columnCount: 0,
      rowCount: 0,
      missingColumns: [],
      extraColumns: [],
    };
  }

  // Procesar la primera línea como encabezados
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  
  const columnCount = headers.length;
  const rowCount = lines.length - 1; // Restar el header

  // Verificar columnas presentes
  const headersUpper = headers.map(h => h.trim().toUpperCase());
  const presentColumns = new Set(headersUpper);
  
  // Columnas faltantes
  const missingColumns: string[] = [];
  for (const col of REQUIRED_COLUMNS) {
    if (!presentColumns.has(col)) {
      missingColumns.push(col);
    }
  }
  
  if (missingColumns.length > 0) {
    errors.push(`Columnas obligatorias faltantes: ${missingColumns.join(', ')}`);
  }

  // Columnas adicionales no esperadas (solo warning)
  const extraColumns: string[] = [];
  for (const col of headersUpper) {
    if (!EXPECTED_COLUMNS.includes(col as typeof EXPECTED_COLUMNS[number]) && col !== '') {
      extraColumns.push(col);
    }
  }
  
  if (extraColumns.length > 0) {
    warnings.push(`Columnas adicionales no esperadas: ${extraColumns.join(', ')}`);
  }

  // Validar que hay al menos datos
  if (rowCount === 0) {
    errors.push('El archivo CSV no contiene filas de datos');
  }

  // Validar formato de algunas columnas en las filas de datos
  const sampleRowsToCheck = Math.min(10, rowCount); // Validar primeras 10 filas
  for (let i = 1; i <= sampleRowsToCheck; i++) {
    const row = parseCsvLine(lines[i]);
    const rowData = createRowObject(headersUpper, row);
    
    // Validar NRO (debe ser numérico)
    if (rowData['NRO'] && !/^\d+$/.test(rowData['NRO'].toString().trim())) {
      errors.push(`Fila ${i + 1}: NRO debe ser numérico (valor: "${rowData['NRO']}")`);
    }
    
    // Validar NUMERO (debe ser numérico)
    if (rowData['NUMERO'] && !/^\d+$/.test(rowData['NUMERO'].toString().trim())) {
      errors.push(`Fila ${i + 1}: NUMERO debe ser numérico (valor: "${rowData['NUMERO']}")`);
    }
    
    // Validar ESTADO_SERVICIO
    if (rowData['ESTADO_SERVICIO']) {
      const estado = rowData['ESTADO_SERVICIO'].toString().trim().toUpperCase();
      if (estado && !VALID_ESTADOS_SERVICIO.includes(estado as typeof VALID_ESTADOS_SERVICIO[number])) {
        warnings.push(`Fila ${i + 1}: ESTADO_SERVICIO "${estado}" no es un valor estándar`);
      }
    }
    
    // Validar ESTADO_OPERATIVO
    if (rowData['ESTADO_OPERATIVO']) {
      const estado = rowData['ESTADO_OPERATIVO'].toString().trim().toUpperCase();
      if (estado && !VALID_ESTADOS_OPERATIVO.includes(estado as typeof VALID_ESTADOS_OPERATIVO[number])) {
        warnings.push(`Fila ${i + 1}: ESTADO_OPERATIVO "${estado}" no es un valor estándar`);
      }
    }
    
    // Validar CELDA (debe ser numérico o vacío)
    if (rowData['CELDA'] && rowData['CELDA'].toString().trim() !== '' && !/^\d+$/.test(rowData['CELDA'].toString().trim())) {
      warnings.push(`Fila ${i + 1}: CELDA debe ser numérico (valor: "${rowData['CELDA']}")`);
    }
    
    // Validar TELEFONO
    if (rowData['TELEFONO']) {
      const telefono = rowData['TELEFONO'].toString().trim();
      if (telefono && !/^\d{6,12}$/.test(telefono)) {
        warnings.push(`Fila ${i + 1}: TELEFONO debe tener 6-12 dígitos (valor: "${telefono}")`);
      }
    }
    
    // Validar LATITUD y LONGITUD (si están presentes)
    if (rowData['LATITUD'] && rowData['LATITUD'].toString().trim() !== '') {
      const lat = parseFloat(rowData['LATITUD'].toString());
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push(`Fila ${i + 1}: LATITUD debe ser un número entre -90 y 90 (valor: "${rowData['LATITUD']}")`);
      }
    }
    
    if (rowData['LONGITUD'] && rowData['LONGITUD'].toString().trim() !== '') {
      const lng = parseFloat(rowData['LONGITUD'].toString());
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push(`Fila ${i + 1}: LONGITUD debe ser un número entre -180 y 180 (valor: "${rowData['LONGITUD']}")`);
      }
    }
  }

  // Validar tamaño del archivo
  if (cleanCsv.length > 5 * 1024 * 1024) { // 5MB
    errors.push('El archivo CSV es demasiado grande (máximo 5MB)');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    columnCount,
    rowCount,
    missingColumns,
    extraColumns,
  };
}

/**
 * Valida un archivo File antes de subirlo
 */
export function validateCsvFile(file: File): Promise<ValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(validateCsvContent(content));
    };
    
    reader.onerror = () => {
      resolve({
        valid: false,
        errors: ['Error al leer el archivo'],
        warnings: [],
        columnCount: 0,
        rowCount: 0,
        missingColumns: [],
        extraColumns: [],
      });
    };
    
    reader.readAsText(file);
  });
}

/**
 * Formato de mensaje de error amigable para mostrar al usuario
 */
export function formatValidationMessage(result: ValidationResult): string {
  if (result.valid) {
    if (result.warnings.length > 0) {
      return `⚠️ ${result.rowCount} filas a procesar (${result.warnings.length} advertencias)`;
    }
    return `✅ ${result.rowCount} filas listas para procesar`;
  }
  
  const errorMessages = result.errors.map(e => `• ${e}`).join('\n');
  return `❌ Errores de validación:\n${errorMessages}`;
}

/**
 * Divide una línea CSV en campos (considerando campos entre comillas)
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Añadir el último campo
  result.push(current.trim());
  
  return result;
}

/**
 * Crea un objeto a partir de encabezados y valores
 */
function createRowObject(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  
  for (let i = 0; i < Math.min(headers.length, values.length); i++) {
    row[headers[i]] = values[i];
  }
  
  return row;
}

/**
 * Verifica si el CSV tiene un formato válido (encabezados correctos)
 */
export function hasValidCsvFormat(csvText: string): boolean {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length === 0) return false;
  
  const headers = parseCsvLine(lines[0]);
  const headersUpper = headers.map(h => h.trim().toUpperCase());
  
  // Verificar que tiene al menos las columnas obligatorias
  const presentColumns = new Set(headersUpper);
  for (const col of REQUIRED_COLUMNS) {
    if (!presentColumns.has(col)) {
      return false;
    }
  }
  
  return true;
}
