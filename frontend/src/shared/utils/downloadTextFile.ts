/**
 * Descarga un archivo de texto (CSV, JSON, SQL, KML, GeoJSON) desde el navegador.
 * Centraliza la lógica de Blob + <a download> antes reimplementada en 5 vistas.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mime: string = 'text/csv;charset=utf-8;'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
