import React, { useState } from 'react';
import {
  X,
  Phone,
  Radio,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { EnrichedSubscriberRecord, OperationalStatus } from '@/entities/subscriber/types';
import { resolveCellName, useCells } from '@/entities/cell/useCells';
import { statusTextClass } from '@/shared/ui/StatusBadge';
import { GeoBadge } from '@/shared/ui/GeoBadge';
import { Modal } from '@/shared/ui/Modal';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { buildMapsUrl, formatCoords } from '@/shared/utils/geo';

interface RecordDetailModalProps {
  record: EnrichedSubscriberRecord | null;
  onClose: () => void;
  allRecords: EnrichedSubscriberRecord[];
  onSelectRelatedRecord: (record: EnrichedSubscriberRecord) => void;
  onUpdateStatus?: (
    nro: number,
    newStatus: OperationalStatus,
    details?: { fallaDescripcion?: string; deudaMeses?: number; tiempoDepositoMeses?: number }
  ) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  allRecords,
  onSelectRelatedRecord,
  onUpdateStatus,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OperationalStatus>('C/SERV.');
  const [fallaText, setFallaText] = useState('');
  const [deudaInput, setDeudaInput] = useState<number>(3);
  const [depositoInput, setDepositoInput] = useState<number>(6);
  const { byId: cellsById } = useCells();

  if (!record) return null;

  const cellInfo = cellsById.get(Number(record.celda));
  const cellName = resolveCellName(record.celda, record.celdaNombre, cellsById);

  const relatedRecords = allRecords.filter(
    r =>
      r.nro !== record.nro &&
      (r.nombre.trim().toUpperCase() === record.nombre.trim().toUpperCase() ||
        r.direccion.trim().toLowerCase() === record.direccion.trim().toLowerCase())
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveStatusChange = () => {
    if (!onUpdateStatus) return;

    if (targetStatus === 'FALLA TECNICA') {
      onUpdateStatus(record.nro, targetStatus, {
        fallaDescripcion: fallaText.trim() || 'Falla de enlace radio DECT con estación base Siemens',
      });
    } else if (targetStatus === 'CORTE X MORA') {
      onUpdateStatus(record.nro, targetStatus, { deudaMeses: Number(deudaInput) || 3 });
    } else if (targetStatus === 'EN DEPOSITO') {
      onUpdateStatus(record.nro, targetStatus, { tiempoDepositoMeses: Number(depositoInput) || 6 });
    } else {
      onUpdateStatus(record.nro, targetStatus);
    }
    setEditingStatus(false);
  };

  return (
    <Modal
      isOpen={!!record}
      onClose={onClose}
      panelClassName="max-w-xl p-0 max-h-[90vh] flex flex-col overflow-hidden"
      header={
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">Registro NRO {record.nro}</span>
              <span className="text-slate-300">·</span>
              <span className={`text-xs font-semibold ${statusTextClass(record.estadoOperativo)}`}>
                {record.estadoOperativo}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              Ficha Técnica del Abonado · Siemens DECTlink
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar diálogo"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      }
    >
      {/* Content Body */}
      <div className="p-5 space-y-4 text-xs flex-1 overflow-y-auto">
          {/* Main Identifier Box */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Número Asignado (Línea Inalámbrica DECT)
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                {record.numero}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Central EAI · Nodo {cellName}
              </div>
            </div>
            <button
              onClick={() => handleCopy(record.numero)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Siemens DECTlink Technology Details */}
          <div className="p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-indigo-500" />
                <span>Parámetros de Enlace Siemens DECTlink</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">1880 - 1900 MHz</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-slate-400 text-[10px] block">Unidad de Abonado (FAU):</span>
                <strong className="text-slate-800 dark:text-slate-200">{record.fauModel}</strong>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-slate-400 text-[10px] block">Nivel de Señal RF:</span>
                <strong
                  className={
                    record.signalDect === 'EXCELENTE'
                      ? 'text-emerald-600'
                      : record.signalDect === 'BUENO'
                      ? 'text-blue-600'
                      : record.signalDect === 'DEBIL'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }
                >
                  {record.signalDect}
                </strong>
              </div>
            </div>

            {/* Operational State Details banner */}
            {record.estadoOperativo === 'FALLA TECNICA' && (
              <div className="p-2.5 rounded bg-rose-100/70 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs">
                <strong>Falla de Radio DECT:</strong> {record.fallaDescripcion || 'Pérdida de sincronismo con la celda Siemens'}
              </div>
            )}
            {record.estadoOperativo === 'CORTE X MORA' && (
              <div className="p-2.5 rounded bg-amber-100/70 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex justify-between items-center">
                <span>
                  <strong>Corte Comercial:</strong> Deuda acumulada de {record.deudaMeses} facturas mensuales.
                </span>
              </div>
            )}
            {record.estadoOperativo === 'EN DEPOSITO' && (
              <div className="p-2.5 rounded bg-blue-100/70 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
                <strong>En Custodia:</strong> {record.tiempoDepositoMeses} meses en depósito según estatuto de socios COTEL.
              </div>
            )}

            {/* Quick Status Modifier Form */}
            {onUpdateStatus && (
              <div className="pt-2 border-t border-brand-100 dark:border-brand-900/40">
                {!editingStatus ? (
                  <button
                    onClick={() => {
                      setTargetStatus(record.estadoOperativo);
                      setEditingStatus(true);
                    }}
                    className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Cambiar Estado Operativo (Depósito / Mora / Falla / Reconexión)</span>
                  </button>
                ) : (
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 mt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Seleccionar Nuevo Estado Operativo:
                    </label>
                    <Select
                      size="sm"
                      className="w-full font-medium"
                      value={targetStatus}
                      onChange={e => setTargetStatus(e.target.value as OperationalStatus)}
                      aria-label="Seleccionar nuevo estado operativo"
                    >
                      <option value="C/SERV.">Activo (C/SERV. - Con Servicio)</option>
                      <option value="EN DEPOSITO">En Depósito (Custodia)</option>
                      <option value="CORTE X MORA">Corte por Mora (Falta de Pago)</option>
                      <option value="FALLA TECNICA">Falla Técnica DECT / Avería</option>
                      <option value="S/SERV.">Sin Servicio / Baja</option>
                    </Select>

                    {targetStatus === 'FALLA TECNICA' && (
                      <div>
                        <span className="text-[10px] text-slate-400">Descripción de avería DECT:</span>
                        <Input
                          size="sm"
                          type="text"
                          value={fallaText}
                          onChange={e => setFallaText(e.target.value)}
                          placeholder="Ej: Antena Yagi desorientada por viento"
                          aria-label="Descripción de avería DECT"
                          className="mt-0.5"
                        />
                      </div>
                    )}

                    {targetStatus === 'CORTE X MORA' && (
                      <div>
                        <span className="text-[10px] text-slate-400">Meses adeudados:</span>
                        <Input
                          size="sm"
                          type="number"
                          min={1}
                          max={36}
                          value={deudaInput}
                          onChange={e => setDeudaInput(Number(e.target.value))}
                          aria-label="Meses adeudados"
                          className="mt-0.5"
                        />
                      </div>
                    )}

                    {targetStatus === 'EN DEPOSITO' && (
                      <div>
                        <span className="text-[10px] text-slate-400">Meses solicitados en depósito:</span>
                        <Input
                          size="sm"
                          type="number"
                          min={1}
                          max={60}
                          value={depositoInput}
                          onChange={e => setDepositoInput(Number(e.target.value))}
                          aria-label="Meses solicitados en depósito"
                          className="mt-0.5"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingStatus(false)}
                        className="px-2.5 py-1 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveStatusChange}
                        className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 font-semibold"
                      >
                        Aplicar Cambio
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400 block mb-0.5">Titular Registrado</span>
              <div className="font-semibold text-slate-900 dark:text-white break-words">
                {record.nombre}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Tipo: {record.clientType}</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400 block mb-0.5">Código Contrato (CTO)</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white">{record.cto}</div>
              <div className="text-[11px] text-slate-500 mt-1">Área técnica: {record.area}</div>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400 block mb-0.5">Zona y Cobertura</span>
              <div className="font-semibold text-slate-900 dark:text-white">
                {record.normalizedZona}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400 block mb-0.5">Celda Técnica / Estación Base</span>
              <div className="font-bold text-violet-600 dark:text-violet-400 truncate" title={cellName}>
                {cellName}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                RFP {record.celda}
                {cellInfo ? ` · ${cellInfo.capacidad} canales` : ''}
              </div>
            </div>

            <div className="col-span-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400 block mb-0.5">Dirección de Instalación</span>
              <div className="text-slate-800 dark:text-slate-200 font-medium">{record.direccion}</div>
            </div>

            {/* Geolocation Coordinates & Radio Distance */}
            <div className="col-span-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Geolocalización GPS
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatCoords(record.lat, record.lng)}
                  </span>
                  <GeoBadge coordsReales={record.coordsReales} />
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Distancia Radio / Azimut
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {record.distanciaKm} km · {record.azimutGrados}°
                </span>
              </div>
              <a
                href={buildMapsUrl(record.lat, record.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                Ver en Google Maps
              </a>
            </div>

            <div className="col-span-2 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">Fecha de Servicio (Alta)</span>
                <div className="font-mono font-semibold text-slate-900 dark:text-white">
                  {record.fechServ}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <span>Antigüedad: {new Date().getFullYear() - record.year} años</span>
              </div>
            </div>
          </div>

          {/* Audit Notes */}
          {record.auditIssues.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold text-xs mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Observaciones de Registro y Auditoría ({record.auditIssues.length})</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-300 text-[11px]">
                {record.auditIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Related lines if multi-line */}
          {relatedRecords.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
                Otras líneas vinculadas al mismo predio o titular ({relatedRecords.length})
              </div>
              <div className="space-y-1.5">
                {relatedRecords.map(rel => (
                  <div
                    key={rel.nro}
                    onClick={() => onSelectRelatedRecord(rel)}
                    className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <strong className="text-slate-900 dark:text-white">{rel.numero}</strong>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 text-[11px]">{rel.fechServ}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-violet-600 text-[11px]">
                        {resolveCellName(rel.celda, rel.celdaNombre, cellsById)}
                      </span>
                    </div>
                    <span className="text-emerald-600 text-[11px] font-medium">Ver →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700 transition"
          >
            Cerrar Ficha
          </button>
        </div>
    </Modal>
  );
};
