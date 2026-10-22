/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Navbar } from '@/widgets/Navbar';
import { AppTabs, AppTabId } from '@/widgets/AppTabs';
import { DataSourceBar } from '@/widgets/DataSourceBar';
import { AppFooter } from '@/widgets/AppFooter';
import { MetricCards } from '@/widgets/MetricCards';
import { ExecutiveReport } from '@/widgets/ExecutiveReport';
import { VisualCharts } from '@/widgets/VisualCharts';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import { downloadTextFile } from '@/shared/utils/downloadTextFile';
import { DataTable } from '@/features/subscriber-table/DataTable';
import { DataAuditView } from '@/features/data-audit/DataAuditView';
import { InstitutionalView } from '@/features/institutional/InstitutionalView';
import { DectLinkOperationsView } from '@/features/dect-operations/DectLinkOperationsView';
import { GisCoverageMapView } from '@/features/gis-coverage/GisCoverageMapView';
import { RecordDetailModal } from '@/features/record-detail/RecordDetailModal';
import { CsvUploaderModal } from '@/features/csv-upload/CsvUploaderModal';
import { DatabaseExplorerView } from '@/features/database-explorer/DatabaseExplorerView';
import { GpsCalibrationView } from '@/features/gps-calibration/GpsCalibrationView';
import { WorkOrdersKanbanView } from '@/features/work-orders/WorkOrdersKanbanView';
import { RfLineOfSightView } from '@/features/rf-line-of-sight/RfLineOfSightView';
import { TechMigrationPlannerView } from '@/features/tech-migration/TechMigrationPlannerView';
import { OfficialTechnicalSheetsView } from '@/features/technical-sheets/OfficialTechnicalSheetsView';
import { SupabaseMigrationModal } from '@/features/supabase-migration/SupabaseMigrationModal';
import { GitMigrationModal } from '@/features/git-migration/GitMigrationModal';
import { QaView } from '@/features/qa/QaView';
import { buildSubscribersCsv, subscribersCsvFilename } from '@/entities/subscriber/exportCsv';
import { useSubscriberData } from '@/entities/subscriber/hooks/useSubscriberData';

export default function App() {
  // Toda la lógica de datos del padrón (carga con reintentos, SSE en vivo,
  // enriquecimiento/auditoría y mutaciones optimistas) vive en el hook de la
  // entidad subscriber; aquí solo queda la composición de la aplicación.
  const data = useSubscriberData();

  const [activeTab, setActiveTab] = useState<AppTabId>('gps-calibration');
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  // External filters for cross-chart navigation to table
  const [externalZoneFilter, setExternalZoneFilter] = useState('');
  const [externalYearFilter, setExternalYearFilter] = useState<number | undefined>(undefined);
  const [externalCeldaFilter, setExternalCeldaFilter] = useState('');

  // Handlers for cross-component drilldowns
  const handleFilterByZone = (zone: string) => {
    setExternalZoneFilter(zone);
    setExternalYearFilter(undefined);
    setExternalCeldaFilter('');
    setActiveTab('table');
  };

  const handleFilterByYear = (year: number) => {
    setExternalYearFilter(year);
    setExternalZoneFilter('');
    setExternalCeldaFilter('');
    setActiveTab('table');
  };

  const handleFilterByCelda = (celda: string) => {
    setExternalCeldaFilter(celda);
    setExternalZoneFilter('');
    setExternalYearFilter(undefined);
    setActiveTab('table');
  };

  const handleClearExternalFilters = () => {
    setExternalZoneFilter('');
    setExternalYearFilter(undefined);
    setExternalCeldaFilter('');
  };

  const handleExportCsv = () => {
    downloadTextFile(subscribersCsvFilename(), buildSubscribersCsv(data.records, data.isNormalizedApplied));
  };

  const handlePrint = () => {
    setActiveTab('official-sheets');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleLoadCsvData = (csvText: string) => {
    data.loadCsvData(csvText);
    handleClearExternalFilters();
  };

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        totalRecords={data.records.length}
        auditIssuesCount={data.auditIssues.length}
        onOpenUploader={() => setIsUploaderOpen(true)}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        onOpenDatabase={() => setActiveTab('database')}
        onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)}
        onOpenGitMigration={() => setIsGitModalOpen(true)}
        dbProvider={data.dbProvider}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banners de estado + barra de origen de datos */}
        <DataSourceBar
          dataSource={data.dataSource}
          rawCount={data.rawRecords.length}
          loadAttempt={data.loadAttempt}
          maxLoadAttempts={data.maxLoadAttempts}
          backendError={data.backendError}
          onDismissError={data.dismissError}
          onReload={data.loadSubscribersFromDb}
          isNormalizedApplied={data.isNormalizedApplied}
          onToggleNormalization={data.toggleNormalization}
        />

        {/* Navigation Tabs — agrupadas en Módulos Estratégicos y Herramientas Base */}
        <AppTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          recordCount={data.records.length}
          auditIssueCount={data.auditIssues.length}
        />

        {/* Global Key Metrics Bar */}
        <MetricCards
          records={data.records}
          auditIssues={data.auditIssues}
          onSelectTab={tab => setActiveTab(tab as AppTabId)}
        />

        {/* Module 1: Calibración y Captura GPS Interactiva */}
        {activeTab === 'gps-calibration' && (
          <GpsCalibrationView
            records={data.records}
            onUpdateCoordinates={data.updateCoordinates}
            onSelectRecord={data.selectRecord}
          />
        )}

        {/* Module 2: Cuadrillas Técnicas & Órdenes de Trabajo Kanban */}
        {activeTab === 'field-crews' && (
          <WorkOrdersKanbanView records={data.records} />
        )}

        {/* Module 3: Simulador de Línea de Vista y Perfil RF (ITU-R P.525) */}
        {activeTab === 'rf-simulation' && (
          <RfLineOfSightView records={data.records} />
        )}

        {/* Module 4: Planificador de Migración Tecnológica */}
        {activeTab === 'tech-migration' && (
          <TechMigrationPlannerView records={data.records} />
        )}

        {/* Module 5: Generador de Fichas Oficiales y Reportes ATT */}
        {activeTab === 'official-sheets' && (
          <OfficialTechnicalSheetsView records={data.records} />
        )}

        {/* Active Tab: PostgreSQL Cloud SQL Database Explorer & Live Console */}
        {activeTab === 'database' && (
          <DatabaseExplorerView onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)} />
        )}

        {/* Active Tab: GIS Coverage Map */}
        {activeTab === 'map' && (
          <GisCoverageMapView
            records={data.records}
            onSelectRecord={data.selectRecord}
            onUpdateStatus={data.updateStatus}
          />
        )}

        {/* Active Tab: Siemens DECT Link Operations Console */}
        {activeTab === 'dect' && (
          <DectLinkOperationsView
            records={data.records}
            onUpdateStatus={data.updateStatus}
            onSelectRecord={data.selectRecord}
          />
        )}

        {/* Active Tab: Executive Overview & Charts */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ExecutiveReport
              records={data.records}
              auditIssues={data.auditIssues}
              onGoToTab={tab => setActiveTab(tab as AppTabId)}
            />
            <VisualCharts
              records={data.records}
              onFilterByZone={handleFilterByZone}
              onFilterByYear={handleFilterByYear}
              onFilterByCelda={handleFilterByCelda}
            />
          </div>
        )}

        {/* Active Tab: Filterable Data Table */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            <DataTable
              records={data.records}
              onSelectRecord={data.selectRecord}
              externalZoneFilter={externalZoneFilter}
              externalYearFilter={externalYearFilter}
              externalCeldaFilter={externalCeldaFilter}
              onClearExternalFilters={handleClearExternalFilters}
              onUpdateStatus={data.updateStatus}
            />
          </div>
        )}

        {/* Active Tab: Data Audit & Cleansing */}
        {activeTab === 'audit' && (
          <DataAuditView
            issues={data.auditIssues}
            records={data.records}
            onSelectRecordNro={data.selectRecordByNro}
            onApplyAllFixes={data.toggleNormalization}
            isNormalizedApplied={data.isNormalizedApplied}
          />
        )}

        {/* Active Tab: Institutional Accounts & Multi-lines */}
        {activeTab === 'institutional' && (
          <InstitutionalView
            records={data.records}
            onSelectRecord={data.selectRecord}
          />
        )}

        {/* Active Tab: Quick Q&A */}
        {activeTab === 'qa' && <QaView />}
      </main>

      {/* Footer */}
      <AppFooter
        dataSource={data.dataSource}
        rawCount={data.rawRecords.length}
        loadAttempt={data.loadAttempt}
        maxLoadAttempts={data.maxLoadAttempts}
      />

      {/* Modal Inspector */}
      <RecordDetailModal
        record={data.selectedRecord}
        onClose={data.clearSelection}
        allRecords={data.records}
        onSelectRelatedRecord={data.selectRecord}
        onUpdateStatus={data.updateStatus}
      />

      {/* CSV Uploader Modal */}
      <CsvUploaderModal
        isOpen={isUploaderOpen}
        onClose={() => setIsUploaderOpen(false)}
        onLoadData={handleLoadCsvData}
      />

      {/* Supabase Migration & Guided Setup Modal */}
      <SupabaseMigrationModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnected={data.connectDatabase}
      />

      {/* Git & GitHub Version Control Modal */}
      <GitMigrationModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />
    </div>
    </ErrorBoundary>
  );
}
