import React, { useState, useEffect, useMemo } from 'react';
import { 
  BuildingNotification, 
  FilterState, 
  ExpirationFilter 
} from './types';
import { INITIAL_NOTIFICATIONS } from './data/initialData';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { NotificationTable } from './components/NotificationTable';
import { RecordModal } from './components/RecordModal';
import { PrintReportModal } from './components/PrintReportModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { exportToCSV, isExpired, calcularPrazoProcesso } from './utils/helpers';
import { RotateCw, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'cbmerj_sst_notificacoes_v7';

const getUrgencyPriority = (item: BuildingNotification) => {
  const prazo = calcularPrazoProcesso(item);

  if (prazo.isConcluido) {
    return 3;
  }

  if (prazo.isVencido) {
    return 0;
  }

  if (prazo.diasRestantes !== null && prazo.diasRestantes <= 5) {
    return 1;
  }

  return 2;
};

export default function App() {
  // Database State with LocalStorage
  const [notifications, setNotifications] = useState<BuildingNotification[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Falha ao recuperar dados do localStorage:', err);
    }
    return INITIAL_NOTIFICATIONS;
  });

  // Persist whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }
  }, [notifications]);

  // Filters State
  const defaultFilters: FilterState = {
    dataInicial: '',
    dataFinal: '',
    obm: '',
    status: '',
    vencimento: 'todos',
    ordenacaoCampo: 'numero',
    ordenacaoDirecao: 'asc',
    termoBusca: '',
    mostrarOcultos: false,
  };

  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  // Modals & Print State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BuildingNotification | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [singlePrintRecord, setSinglePrintRecord] = useState<BuildingNotification | null>(null);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'info' | 'warning', title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Next sequential number for new records
  const nextNumber = useMemo(() => {
    if (notifications.length === 0) return 1;
    const maxNum = Math.max(...notifications.map((n) => n.numero || 0));
    return maxNum + 1;
  }, [notifications]);

  // Filtered & Sorted notifications
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((item) => {
        // Oculto filter
        if (!filters.mostrarOcultos && item.oculto) {
          return false;
        }

        // Global Search Term
        if (filters.termoBusca.trim()) {
          const term = filters.termoBusca.toLowerCase().trim();
          const matchEdificacao = item.edificacao.toLowerCase().includes(term);
          const matchRequerente = item.requerente ? item.requerente.toLowerCase().includes(term) : false;
          const matchProcesso = item.processo ? item.processo.toLowerCase().includes(term) : false;
          const matchTipo = item.tipoProcesso ? item.tipoProcesso.toLowerCase().includes(term) : false;
          const matchOrigem = item.origem ? item.origem.toLowerCase().includes(term) : false;
          const matchCodigo = item.codigoDocumento.toLowerCase().includes(term);
          const matchNumero = String(item.numero).includes(term);
          const matchLogradouro = item.endereco.logradouro.toLowerCase().includes(term);
          const matchBairro = item.endereco.bairro.toLowerCase().includes(term);
          const matchMunicipio = item.endereco.municipio.toLowerCase().includes(term);
          const matchProprietario = item.proprietario.nomeOuRazaoSocial.toLowerCase().includes(term);
          const matchFiscal = item.fiscalResponsavel.toLowerCase().includes(term);

          if (
            !matchEdificacao &&
            !matchRequerente &&
            !matchProcesso &&
            !matchTipo &&
            !matchOrigem &&
            !matchCodigo &&
            !matchNumero &&
            !matchLogradouro &&
            !matchBairro &&
            !matchMunicipio &&
            !matchProprietario &&
            !matchFiscal
          ) {
            return false;
          }
        }

        // OBM Filter
        if (filters.obm && item.obm !== filters.obm && item.origem !== filters.obm) {
          return false;
        }

        // Status Filter
        if (filters.status && item.status !== filters.status) {
          return false;
        }

        // Data Inicial (Entrada)
        const entrada = item.dataEntrada || item.dataExpedicao;
        if (filters.dataInicial && entrada < filters.dataInicial) {
          return false;
        }

        // Data Final (Entrada)
        if (filters.dataFinal && entrada > filters.dataFinal) {
          return false;
        }

        // Vencimento / Trâmite Filter (baseado no prazo legal calculado)
        const prazo = calcularPrazoProcesso(item);
        if (filters.vencimento === 'vencidos') {
          if (!prazo.isVencido) {
            return false;
          }
        } else if (filters.vencimento === 'no_prazo') {
          if (prazo.isVencido) {
            return false;
          }
        } else if (filters.vencimento === 'sem_validade') {
          const tramite = item.dataTramite || item.dataValidade;
          if (tramite && tramite !== '-') {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const urgA = getUrgencyPriority(a);
        const urgB = getUrgencyPriority(b);

        if (urgA !== urgB) {
          return urgA - urgB;
        }

        let valA: any = a[filters.ordenacaoCampo];
        let valB: any = b[filters.ordenacaoCampo];

        if (filters.ordenacaoCampo === 'numero') {
          valA = a.processo || a.numero;
          valB = b.processo || b.numero;
        } else if (filters.ordenacaoCampo === 'edificacao') {
          valA = (a.requerente || a.edificacao).toLowerCase();
          valB = (b.requerente || b.edificacao).toLowerCase();
        } else if (filters.ordenacaoCampo === 'dataExpedicao') {
          valA = a.dataEntrada || a.dataExpedicao;
          valB = b.dataEntrada || b.dataExpedicao;
        } else if (filters.ordenacaoCampo === 'dataValidade') {
          valA = calcularPrazoProcesso(a).dataLimiteISO || '9999-99-99';
          valB = calcularPrazoProcesso(b).dataLimiteISO || '9999-99-99';
        }

        if (valA < valB) return filters.ordenacaoDirecao === 'asc' ? -1 : 1;
        if (valA > valB) return filters.ordenacaoDirecao === 'asc' ? 1 : -1;
        return 0;
      });
  }, [notifications, filters]);

  const hiddenCount = useMemo(() => {
    return notifications.filter((n) => n.oculto).length;
  }, [notifications]);

  // Handlers
  const handleResetFilters = () => {
    setFilters(defaultFilters);
    addToast('info', 'Filtros redefinidos', 'Visualizando todos os registros ativos em ordem numérica.');
  };

  const handleOpenNewRecordModal = () => {
    setEditingRecord(null);
    setIsRecordModalOpen(true);
  };

  const handleEdit = (notification: BuildingNotification) => {
    setEditingRecord(notification);
    setIsRecordModalOpen(true);
  };

  const handleSaveRecord = (record: BuildingNotification, isEditing: boolean) => {
    if (isEditing) {
      setNotifications((prev) =>
        prev.map((item) => (item.id === record.id ? record : item))
      );
      addToast(
        'success',
        'Registro atualizado com sucesso!',
        `As alterações em "${record.edificacao}" foram salvas no banco de dados.`
      );
    } else {
      setNotifications((prev) => [record, ...prev]);
      addToast(
        'success',
        'Novo registro cadastrado!',
        `Edificação "${record.edificacao}" inserida como Registro nº ${record.numero}.`
      );
    }
  };

  const handleToggleHide = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const willHide = !target.oculto;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, oculto: willHide } : n))
    );

    if (willHide) {
      addToast(
        'warning',
        'Registro ocultado da listagem principal',
        `"${target.edificacao}" foi arquivado. Ative "Exibir ocultos" nos filtros para visualizá-lo.`
      );
    } else {
      addToast(
        'success',
        'Registro restaurado',
        `"${target.edificacao}" agora está visível normalmente na lista principal.`
      );
    }
  };

  const handleAddQuickNote = (id: string, noteText: string, author: string) => {
    const timestamp = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newLog = {
            id: `log-${Date.now()}`,
            data: timestamp,
            autor: author,
            acao: 'Despacho Técnico / Parecer',
            detalhes: noteText,
          };
          return {
            ...item,
            historico: [newLog, ...(item.historico || [])],
            atualizadoEm: new Date().toISOString(),
          };
        }
        return item;
      })
    );
    addToast('success', 'Despacho registrado no histórico!', 'Novo evento gravado na linha do tempo do processo.');
  };

  const handleOpenPrintReport = () => {
    setSinglePrintRecord(null);
    setIsPrintModalOpen(true);
  };

  const handlePrintSingle = (notification: BuildingNotification) => {
    setSinglePrintRecord(notification);
    setIsPrintModalOpen(true);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredNotifications, `notificacoes-edificacoes-${new Date().toISOString().split('T')[0]}.csv`);
    addToast('success', 'Planilha exportada com sucesso!', 'Arquivo CSV gerado com todos os campos e filtros aplicados.');
  };

  const handleImportCsv = (items: BuildingNotification[], replaceExisting: boolean) => {
    if (replaceExisting) {
      setNotifications(items);
      addToast(
        'success',
        'Base de dados atualizada!',
        `${items.length} registro(s) importados da planilha com sucesso. A base anterior foi substituída.`
      );
    } else {
      // Merge: update existing by number, add new ones
      setNotifications((prev) => {
        const existingMap = new Map(prev.map((item) => [item.numero, item]));
        items.forEach((newItem) => {
          existingMap.set(newItem.numero, newItem);
        });
        const merged = Array.from(existingMap.values()).sort((a, b) => a.numero - b.numero);
        return merged;
      });
      addToast(
        'success',
        'Registros incorporados!',
        `${items.length} registro(s) foram adicionados/atualizados no banco de dados.`
      );
    }
  };

  const handleRestoreInitialData = () => {
    if (window.confirm('Deseja restaurar a base de dados padrão original? Quaisquer alterações locais serão substituídas.')) {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      addToast('info', 'Banco de dados restaurado', 'Dados originais da fiscalização recarregados.');
    }
  };

  const handleUpdateNotification = (updated: BuildingNotification) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    addToast('success', 'Processo atualizado!', `Bilhetes e dados de "${updated.requerente || updated.edificacao}" foram salvos com sucesso.`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header notifications={notifications} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          onResetFilters={handleResetFilters}
          onOpenNewRecordModal={handleOpenNewRecordModal}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenPrintModal={handleOpenPrintReport}
          onExportCSV={handleExportCSV}
          hiddenCount={hiddenCount}
          totalFilteredCount={filteredNotifications.length}
        />

        {/* Data Table with Expandable Rows */}
        <NotificationTable
          notifications={filteredNotifications}
          onEdit={handleEdit}
          onToggleHide={handleToggleHide}
          onAddQuickNote={handleAddQuickNote}
          onPrintSingle={handlePrintSingle}
          onResetFilters={handleResetFilters}
          onUpdateNotification={handleUpdateNotification}
        />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-700" />
            <span className="font-semibold text-slate-700">
              Corpo de Bombeiros Militar do Estado do Rio de Janeiro · CBMERJ
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>SST - 10º GBM (Angra dos Reis)</span>
            <span>·</span>
            <button
              type="button"
              onClick={handleRestoreInitialData}
              className="text-slate-500 hover:text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
              title="Restaurar registros padrão demonstrativos"
            >
              <RotateCw className="w-3 h-3" />
              <span>Restaurar Dados Padrão</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Record Creation / Edition Modal */}
      <RecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSave={handleSaveRecord}
        editingRecord={editingRecord}
        nextNumber={nextNumber}
      />

      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportCsv}
        currentCount={notifications.length}
      />

      {/* Print Document Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        singleRecord={singlePrintRecord}
        recordsList={filteredNotifications}
      />

      {/* Toast Alert Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
