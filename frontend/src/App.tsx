/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AppSidebar, visibleTabIds } from '@/widgets/AppSidebar';
import { UnifiedHeader } from '@/widgets/UnifiedHeader';
import { AppFooter } from '@/widgets/AppFooter';
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
import { UserManagementView } from '@/features/users';
import { InfraestructuraView } from '@/features/infraestructura';
import { PadronCargasView } from '@/features/padron-cargas';
import { ExecutiveReport } from '@/widgets/ExecutiveReport';
import { VisualCharts } from '@/widgets/VisualCharts';
import { buildSubscribersCsv, subscribersCsvFilename } from '@/entities/subscriber/exportCsv';
import { useSubscriberData } from '@/entities/subscriber/hooks/useSubscriberData';
import { useAuth, BrandedLoginView } from '@/features/auth';
import { AppTabId } from '@/widgets/AppTabs';
import { Radio } from 'lucide-react';

export default function App() {
  const auth = useAuth();
  const data = useSubscriberData();

  const [activeTab, setActiveTab] = useState<AppTabId>('gps-calibration');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  const [externalCeldaFilter, setExternalCeldaFilter] = useState('');
  const [externalZoneFilter, setExternalZoneFilter] = useState('');
  const [externalYearFilter, setExternalYearFilter] = useState<number | undefined>(undefined);

  // Si el tab activo no es visible para el rol de la sesión (o la sesión es
  // de solo lectura), redirigir al primer módulo visible y sin 403 a ciegas.
  useEffect(() => {
    const visibles = visibleTabIds(auth.operador?.role);
    if (!visibles.includes(activeTab) && visibles.length > 0) {
      setActiveTab(visibles[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.operador?.role]);

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

  const renderActiveView = () => {
    switch (activeTab) {
      case 'gps-calibration':
        return (
          <GpsCalibrationView
            records={data.records}
            onUpdateCoordinates={data.updateCoordinates}
            onSelectRecord={data.selectRecord}
          />
        );
      case 'field-crews':
        return <WorkOrdersKanbanView records={data.records} />;
      case 'rf-simulation':
        return <RfLineOfSightView records={data.records} />;
      case 'tech-migration':
        return <TechMigrationPlannerView records={data.records} />;
      case 'official-sheets':
        return <OfficialTechnicalSheetsView records={data.records} />;
      case 'database':
        return <DatabaseExplorerView onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)} />;
      case 'map':
        return (
          <GisCoverageMapView
            records={data.records}
            onSelectRecord={data.selectRecord}
            onUpdateStatus={data.updateStatus}
          />
        );
      case 'dect':
        return (
          <DectLinkOperationsView
            records={data.records}
            onUpdateStatus={data.updateStatus}
            onSelectRecord={data.selectRecord}
          />
        );
      case 'overview':
        return (
          <div className='space-y-6'>
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
        );
      case 'table':
        return (
          <div className='space-y-4'>
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
        );
      case 'audit':
        return (
          <DataAuditView
            issues={data.auditIssues}
            records={data.records}
            onSelectRecordNro={data.selectRecordByNro}
            onApplyAllFixes={data.toggleNormalization}
            isNormalizedApplied={data.isNormalizedApplied}
          />
        );
      case 'institutional':
        return (
          <InstitutionalView
            records={data.records}
            onSelectRecord={data.selectRecord}
          />
        );
      case 'users':
        return <UserManagementView currentOperador={auth.operador} />;
      case 'infraestructura':
        return <InfraestructuraView operador={auth.operador} />;
      case 'padron-cargas':
        return <PadronCargasView currentOperador={auth.operador} />;
      case 'qa':
        return <QaView />;
      default:
        return null;
    }
  };

  if (auth.isLoading) {
    return (
      <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6'>
        <div className='w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 animate-pulse'>
          <Radio className='w-6 h-6' />
        </div>
        <div className='flex items-center gap-2 text-sm font-semibold text-white mb-1'>
          <span>COTEL R.L.</span>
          <span className='text-slate-600'>·</span>
          <span className='text-indigo-400'>Siemens DECTlink</span>
        </div>
        <p className='text-xs text-slate-500'>Verificando sesión de operador...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated && !auth.isDemoMode) {
    return (
      <ErrorBoundary>
        <BrandedLoginView
          onLogin={auth.login}
          onEnterDemo={auth.enterDemoMode}
          isLoading={auth.isLoading}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className='min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white'>
        <UnifiedHeader
          dataSource={data.dataSource}
          rawCount={data.rawRecords.length}
          loadAttempt={data.loadAttempt}
          maxLoadAttempts={data.maxLoadAttempts}
          backendError={data.backendError}
          onDismissError={data.dismissError}
          onReload={data.loadSubscribersFromDb}
          isNormalizedApplied={data.isNormalizedApplied}
          onToggleNormalization={data.toggleNormalization}
          dbProvider={data.dbProvider}
          onOpenUploader={() => setIsUploaderOpen(true)}
          onExportCsv={handleExportCsv}
          onPrint={handlePrint}
          onOpenDatabase={() => setActiveTab('database')}
          onOpenSupabaseMigration={() => setIsSupabaseModalOpen(true)}
          onOpenGitMigration={() => setIsGitModalOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
          sidebarCollapsed={sidebarCollapsed}
          onOpenMobileSidebar={() => {}}
          operador={auth.operador}
          onLogout={auth.logout}
          isDemoMode={auth.isDemoMode}
          onOpenLogin={auth.logout}
        />

        <div className='flex flex-1 overflow-hidden'>
          <AppSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            recordCount={data.records.length}
            auditIssueCount={data.auditIssues.length}
            operadorRole={auth.operador?.role ?? null}
          />

          <main className='flex-1 overflow-auto bg-slate-100 dark:bg-slate-950'>
            <div className='max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6'>
              {renderActiveView()}
            </div>
          </main>
        </div>

        <AppFooter
          dataSource={data.dataSource}
          rawCount={data.rawRecords.length}
          loadAttempt={data.loadAttempt}
          maxLoadAttempts={data.maxLoadAttempts}
        />

        <RecordDetailModal
          record={data.selectedRecord}
          onClose={data.clearSelection}
          allRecords={data.records}
          onSelectRelatedRecord={data.selectRecord}
          onUpdateStatus={data.updateStatus}
        />

        <CsvUploaderModal
          isOpen={isUploaderOpen}
          onClose={() => setIsUploaderOpen(false)}
          onLoadData={handleLoadCsvData}
        />

        <SupabaseMigrationModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          onConnected={data.connectDatabase}
        />

        <GitMigrationModal
          isOpen={isGitModalOpen}
          onClose={() => setIsGitModalOpen(false)}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />
      </div>
    </ErrorBoundary>
  );
}