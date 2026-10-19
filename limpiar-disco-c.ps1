# limpiar-disco-c.ps1 — libera espacio en C: de forma conservadora.
# Solo borra: temporales de usuario/Windows, cachés de npm/Composer/pip y la papelera.
# Uso:  powershell -ExecutionPolicy Bypass -File D:\cotel-dectlink-siemens\limpiar-disco-c.ps1

$antes = (Get-PSDrive C).Free

# 1. Temporales de usuario (ignora archivos en uso)
Get-ChildItem "$env:LOCALAPPDATA\Temp" -Recurse -Force -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 2. Temporales de Windows
Get-ChildItem 'C:\Windows\Temp' -Recurse -Force -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# 3. Cachés de herramientas (se regeneran solas)
foreach ($ruta in @(
    "$env:LOCALAPPDATA\npm-cache",
    "$env:APPDATA\Composer",
    "$env:LOCALAPPDATA\pip\cache",
    "$env:LOCALAPPDATA\Microsoft\Windows\INetCache"
  )) {
  if (Test-Path $ruta) {
    Get-ChildItem $ruta -Recurse -Force -ErrorAction SilentlyContinue |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# 4. Papelera de reciclaje
Clear-RecycleBin -Force -ErrorAction SilentlyContinue

# 5. Prefetch de Windows (se regenera)
Get-ChildItem 'C:\Windows\Prefetch\*' -Force -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue

$despues = (Get-PSDrive C).Free
$liberado = [math]::Round(($despues - $antes) / 1MB, 1)
"C: libre antes: $([math]::Round($antes / 1MB, 1)) MB"
"C: libre ahora: $([math]::Round($despues / 1MB, 1)) MB  (liberado: $liberado MB)"

if ($despues -lt 500MB) {
  Write-Warning "Sigue con menos de 500 MB libres. Revisa manualmente estas carpetas grandes:"
  Write-Warning "  - C:\Users\JAGUIRREL\Downloads"
  Write-Warning "  - C:\Users\JAGUIRREL\AppData\Local (navegadores, WSL, Docker)"
  Write-Warning "  - C:\wamp64\logs (logs de WAMP)"
}
