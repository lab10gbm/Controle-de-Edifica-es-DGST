import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Download,
  FileSpreadsheet,
  FileWarning,
  Filter,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  FISCALIZACAO_STATUS_LIST,
  FiscalizacaoFilterState,
  FiscalizacaoRecord,
  FiscalizacaoStatus,
} from '../../types/fiscalizacao';
import {
  FISCALIZACAO_SEED_CSV_URL,
  exportFiscalizacoesToCSV,
  parseFiscalizacaoCsv,
} from '../../utils/fiscalizacaoCsvParser';
import { FiscalizacaoRow } from './FiscalizacaoRow';
import { FiscalizacaoModal } from './FiscalizacaoModal';
import { FiscalizacaoPrintModal } from './FiscalizacaoPrintModal';

interface FiscalizacoesWorkspaceProps {
  records: FiscalizacaoRecord[];
  isLoading: boolean;
  onSaveRecord: (record: FiscalizacaoRecord, isEditing: boolean) => Promise<void>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onBatchImport: (
    records: FiscalizacaoRecord[],
    replaceExisting: boolean,
    onProgress?: (completed: number, total: number) => void
  ) => Promise<number>;
  onClearAll: () => Promise<number>;
  onNotify: (type: 'success' | 'info' | 'warning', title: string, message?: string) => void;
}

const CURRENT_YEAR = String(new Date().getFullYear());

const DEFAULT_FILTERS: FiscalizacaoFilterState = {
  termoBusca: '',
  status: '',
  municipio: '',
  orgao: '',
  ano: CURRENT_YEAR,
  ordenacaoCampo: 'codigo',
  ordenacaoDirecao: 'asc',
};

const PAGE_SIZE = 50;

export const FiscalizacoesWorkspace: React.FC<FiscalizacoesWorkspaceProps> = ({
  records,
  isLoading,
  onSaveRecord,
  onDeleteRecord,
  onBatchImport,
  onClearAll,
  onNotify,
}) => {
  const [filters, setFilters] = useState<FiscalizacaoFilterState>(DEFAULT_FILTERS);

  // Dashboard collapse & pagination state
  const [isActiveExpanded, setIsActiveExpanded] = useState(true);
  const [isClosedExpanded, setIsClosedExpanded] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FiscalizacaoRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FiscalizacaoRecord | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Print Modal
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [singlePrintRecord, setSinglePrintRecord] = useState<FiscalizacaoRecord | null>(null);

  // Import / Seed state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importReplaceMode, setImportReplaceMode] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Clear All Confirm
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Registros filtrados pelo ano selecionado (base reativa para os cards KPI e dropdowns)
  const recordsInSelectedYear = useMemo(() => {
    if (!filters.ano) return records;
    return records.filter((r) => r.anoExpedicao === filters.ano);
  }, [records, filters.ano]);

  // KPI Metrics reativos ao filtro de ano aplicado
  const stats = useMemo(() => {
    let notificacoes = 0;
    let primeiroAuto = 0;
    let segundoAuto = 0;
    let interdicoesTac = 0;
    let encerradosCancelados = 0;

    for (const r of recordsInSelectedYear) {
      if (r.status === 'Notificação') notificacoes++;
      else if (r.status === '1º Auto de Infração') primeiroAuto++;
      else if (r.status === '2º Auto de Infração') segundoAuto++;
      else if (
        r.status === 'Auto de Interdição por Inércia' ||
        r.status === 'Auto de Interdição por Perigo iminente' ||
        r.status === 'TAC em Andamento'
      ) {
        interdicoesTac++;
      } else {
        encerradosCancelados++;
      }
    }

    return {
      total: recordsInSelectedYear.length,
      notificacoes,
      primeiroAuto,
      segundoAuto,
      interdicoesTac,
      encerradosCancelados,
      ativasTotal: notificacoes + primeiroAuto + segundoAuto + interdicoesTac,
    };
  }, [recordsInSelectedYear]);

  // Dynamic Filter Options (contagens reativas ao ano selecionado)
  const availableMunicipios = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recordsInSelectedYear) {
      const m = r.municipio || 'Não Informado';
      counts.set(m, (counts.get(m) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [recordsInSelectedYear]);

  const availableOrgaos = useMemo(() => {
    const set = new Set<string>();
    for (const r of recordsInSelectedYear) {
      if (r.orgaoPrincipal) set.add(r.orgaoPrincipal);
    }
    return Array.from(set).sort();
  }, [recordsInSelectedYear]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    if (records.length > 0) {
      set.add(CURRENT_YEAR);
    }
    for (const r of records) {
      if (r.anoExpedicao && /^\d{4}$/.test(r.anoExpedicao)) {
        set.add(r.anoExpedicao);
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const nextCodigo = useMemo(() => {
    if (records.length === 0) return 1;
    return Math.max(...records.map((r) => r.codigo || 0)) + 1;
  }, [records]);

  // Filtering + Strict Ordering
  const filteredRecords = useMemo(() => {
    const term = filters.termoBusca.trim().toLowerCase();
    const termDigits = term.replace(/[^\d]/g, '');

    return records
      .filter((r) => {
        if (term) {
          const matchCodigo =
            String(r.codigo).includes(term) ||
            String(r.codigo).padStart(4, '0').includes(term) ||
            `#${r.codigo}`.includes(term);
          const matchEdif = r.edificacao.toLowerCase().includes(term);
          const matchDoc =
            r.documentoCpfCnpj.toLowerCase().includes(term) ||
            (termDigits.length >= 4 &&
              r.documentoCpfCnpj.replace(/[^\d]/g, '').includes(termDigits));
          const matchEnd = r.enderecoCompleto.toLowerCase().includes(term);
          const matchMuni = r.municipio.toLowerCase().includes(term);
          const matchProc = r.processoVinculado.toLowerCase().includes(term);
          const matchRedacao = r.redacao.toLowerCase().includes(term);
          const matchHist = r.historicoTexto.toLowerCase().includes(term);
          const matchFiscal =
            r.fiscalResponsavel.toLowerCase().includes(term) ||
            r.rgFiscal.toLowerCase().includes(term);
          const matchNumAto = r.ultimoNumeroAto.toLowerCase().includes(term);

          if (
            !matchCodigo &&
            !matchEdif &&
            !matchDoc &&
            !matchEnd &&
            !matchMuni &&
            !matchProc &&
            !matchRedacao &&
            !matchHist &&
            !matchFiscal &&
            !matchNumAto
          ) {
            return false;
          }
        }

        if (filters.status === 'ATIVAS') {
          if (r.status === 'Encerrado' || r.status === 'Cancelado') return false;
        } else if (filters.status === 'INTERDICOES_TAC') {
          if (
            r.status !== 'Auto de Interdição por Inércia' &&
            r.status !== 'Auto de Interdição por Perigo iminente' &&
            r.status !== 'TAC em Andamento'
          ) {
            return false;
          }
        } else if (filters.status === 'ENCERRADAS_CANCELADAS') {
          if (r.status !== 'Encerrado' && r.status !== 'Cancelado') return false;
        } else if (filters.status && r.status !== filters.status) {
          return false;
        }

        if (filters.municipio && r.municipio !== filters.municipio) {
          return false;
        }

        if (filters.orgao && r.orgaoPrincipal !== filters.orgao) {
          return false;
        }

        if (filters.ano && r.anoExpedicao !== filters.ano) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dir = filters.ordenacaoDirecao === 'asc' ? 1 : -1;
        if (filters.ordenacaoCampo === 'codigo') {
          return (a.codigo - b.codigo) * dir;
        }
        if (filters.ordenacaoCampo === 'edificacao') {
          return a.edificacao.localeCompare(b.edificacao, 'pt-BR') * dir;
        }
        if (filters.ordenacaoCampo === 'status') {
          return a.status.localeCompare(b.status, 'pt-BR') * dir;
        }
        const isoA = a.dataExpedicao.split('/').reverse().join('-');
        const isoB = b.dataExpedicao.split('/').reverse().join('-');
        if (isoA !== isoB) return isoA.localeCompare(isoB) * dir;
        return (a.codigo - b.codigo) * dir;
      });
  }, [records, filters]);

  const activeRecords = useMemo(
    () =>
      filteredRecords.filter(
        (r) => r.status !== 'Encerrado' && r.status !== 'Cancelado'
      ),
    [filteredRecords]
  );

  const closedRecords = useMemo(
    () =>
      filteredRecords.filter(
        (r) => r.status === 'Encerrado' || r.status === 'Cancelado'
      ),
    [filteredRecords]
  );

  // Paginated slices
  const activeTotalPages = Math.max(1, Math.ceil(activeRecords.length / PAGE_SIZE));
  const safeActivePage = Math.min(activePage, activeTotalPages);
  const activePageItems = activeRecords.slice(
    (safeActivePage - 1) * PAGE_SIZE,
    safeActivePage * PAGE_SIZE
  );

  const closedTotalPages = Math.max(1, Math.ceil(closedRecords.length / PAGE_SIZE));
  const safeClosedPage = Math.min(closedPage, closedTotalPages);
  const closedPageItems = closedRecords.slice(
    (safeClosedPage - 1) * PAGE_SIZE,
    safeClosedPage * PAGE_SIZE
  );

  const updateFilter = <K extends keyof FiscalizacaoFilterState>(
    key: K,
    val: FiscalizacaoFilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setActivePage(1);
    setClosedPage(1);
    if (
      key === 'status' &&
      (val === 'Encerrado' ||
        val === 'Cancelado' ||
        val === 'ENCERRADAS_CANCELADAS')
    ) {
      setIsClosedExpanded(true);
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActivePage(1);
    setClosedPage(1);
  };

  const handleLoadSeedCsv = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportProgress(null);
    try {
      const resp = await fetch(FISCALIZACAO_SEED_CSV_URL);
      if (!resp.ok) {
        throw new Error(`Erro ao ler arquivo CSV base (${resp.status}).`);
      }
      const csvText = await resp.text();
      const parsed = parseFiscalizacaoCsv(csvText);
      if (parsed.length === 0) {
        throw new Error('Nenhum registro válido encontrado no CSV base.');
      }

      setImportProgress({ completed: 0, total: parsed.length });
      const count = await onBatchImport(parsed, importReplaceMode, (completed, total) => {
        setImportProgress({ completed, total });
      });

      setIsImportModalOpen(false);
      onNotify(
        'success',
        'Planilha de Notificações sincronizada!',
        `${count} registro(s) estruturados e gravados no Firestore.`
      );
    } catch (err) {
      onNotify(
        'warning',
        'Falha ao carregar CSV base',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsImporting(true);
    setImportProgress(null);

    try {
      const text = await file.text();
      const parsed = parseFiscalizacaoCsv(text);
      if (parsed.length === 0) {
        throw new Error(
          'Não foi possível identificar notificações no arquivo CSV selecionado.'
        );
      }

      setImportProgress({ completed: 0, total: parsed.length });
      const count = await onBatchImport(parsed, importReplaceMode, (completed, total) => {
        setImportProgress({ completed, total });
      });

      setIsImportModalOpen(false);
      onNotify(
        'success',
        'Arquivo CSV importado para o Firestore!',
        `${count} registro(s) de "${file.name}" sincronizados com sucesso.`
      );
    } catch (err) {
      onNotify(
        'warning',
        'Erro na importação do CSV',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const handleQuickStatusChange = async (
    record: FiscalizacaoRecord,
    newStatus: FiscalizacaoStatus
  ) => {
    const todayBR = new Date().toLocaleDateString('pt-BR');
    const newAto = {
      id: `ato-${Date.now()}`,
      data: todayBR,
      tipoAto: newStatus,
      numeroAto: '',
      orgao: record.orgaoPrincipal || 'DGST',
      observacao: `Situação atualizada de "${record.status}" para "${newStatus}".`,
    };
    const nextAtos = [...(record.historicoAtos || []), newAto].slice(0, 50);
    const updated: FiscalizacaoRecord = {
      ...record,
      status: newStatus,
      historicoAtos: nextAtos,
      historicoTexto: `${record.historicoTexto ? record.historicoTexto + ' ' : ''}${todayBR} - ${newStatus} - ${record.orgaoPrincipal || 'DGST'}`.slice(
        0,
        2000
      ),
      atualizadoEm: new Date().toISOString(),
    };

    await onSaveRecord(updated, true);
    onNotify(
      'success',
      'Status atualizado!',
      `Registro #${String(record.codigo).padStart(4, '0')} alterado para "${newStatus}".`
    );
  };

  const executeDeleteSingle = async () => {
    if (!deletingRecord || isDeletingSingle) return;
    setIsDeletingSingle(true);
    const target = deletingRecord;
    try {
      await onDeleteRecord(target.id);
      setDeletingRecord(null);
      onNotify(
        'warning',
        'Registro excluído!',
        `Notificação #${String(target.codigo).padStart(4, '0')} (${target.edificacao}) removida do Firestore.`
      );
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const executeClearAll = async () => {
    if (isClearingAll) return;
    setIsClearingAll(true);
    try {
      const removed = await onClearAll();
      setIsClearConfirmOpen(false);
      onNotify(
        'warning',
        'Base de Notificações limpa',
        `${removed} registro(s) removidos do Firestore.`
      );
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Banner Introdutório & KPI Cards Clicáveis */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Módulo de Notificações, Autos de Infração e Interdições
                </h2>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Fiscalização · 10º GBM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Controle independente de notificações fiscais, 1º e 2º autos de infração, interdições, TACs e histórico DGST/DDP em ordem numérica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Base CSV / Sincronizar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingRecord(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Notificação</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={() => updateFilter('status', '')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === ''
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="text-[11px] font-medium opacity-80">
              {filters.ano ? `Total (${filters.ano})` : 'Total (Todos)'}
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.total}</div>
          </button>

          <button
            type="button"
            onClick={() => updateFilter('status', 'Notificação')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === 'Notificação'
                ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                : 'bg-sky-50/70 border-sky-200 hover:bg-sky-100/80 text-sky-950'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium opacity-85">
              <span>Notificações</span>
              <BellRing className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.notificacoes}</div>
          </button>

          <button
            type="button"
            onClick={() => updateFilter('status', '1º Auto de Infração')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === '1º Auto de Infração'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/80 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium opacity-85">
              <span>1º Auto Infração</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.primeiroAuto}</div>
          </button>

          <button
            type="button"
            onClick={() => updateFilter('status', '2º Auto de Infração')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === '2º Auto de Infração'
                ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/80 text-orange-950'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium opacity-85">
              <span>2º Auto Infração</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.segundoAuto}</div>
          </button>

          <button
            type="button"
            onClick={() => updateFilter('status', 'INTERDICOES_TAC')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === 'INTERDICOES_TAC'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/80 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium opacity-85">
              <span>Interdições & TAC</span>
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.interdicoesTac}</div>
          </button>

          <button
            type="button"
            onClick={() => updateFilter('status', 'ENCERRADAS_CANCELADAS')}
            className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
              filters.status === 'ENCERRADAS_CANCELADAS'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/80 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-medium opacity-85">
              <span>Encerradas / Canc.</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold mt-0.5">{stats.encerradosCancelados}</div>
          </button>
        </div>
      </div>

      {/* Card de Carga Inicial quando a base estiver vazia */}
      {!isLoading && records.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma notificação sincronizada ainda no Firestore
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Carregue automaticamente todos os <strong>1.196 registros estruturados</strong> da planilha enviada (Notificações, 1º/2º Autos de Infração, Interdições, TACs, CNPJs, Endereços, Processos SEI e Históricos completos) diretamente para o banco em nuvem.
            </p>
          </div>
          {isImporting && importProgress && (
            <div className="max-w-md mx-auto space-y-1.5 pt-1">
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-700 h-2 transition-all duration-200"
                  style={{
                    width: `${Math.round(
                      (importProgress.completed / Math.max(1, importProgress.total)) * 100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs font-semibold text-amber-900">
                Sincronizando lote {importProgress.completed} de {importProgress.total}...
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              disabled={isImporting}
              onClick={handleLoadSeedCsv}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-xl shadow-xs cursor-pointer"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span>
                {isImporting
                  ? 'Gravando no Firestore...'
                  : 'Carregar Planilha Base (1.196 registros)'}
              </span>
            </button>
            <button
              type="button"
              disabled={isImporting}
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Selecionar Outro CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Busca e Filtros (espelhando o estilo da Listagem de Processos) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-4 h-4 text-red-700" />
            <span>Pesquisa e Filtros de Fiscalização</span>
            <span className="ml-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono normal-case">
              {filteredRecords.length} de {recordsInSelectedYear.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportFiscalizacoesToCSV(
                  filteredRecords,
                  `notificacoes-fiscalizacao-${new Date().toISOString().split('T')[0]}.csv`
                );
                onNotify(
                  'success',
                  'CSV exportado!',
                  `${filteredRecords.length} registro(s) exportados com filtros aplicados.`
                );
              }}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 border border-slate-300 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSinglePrintRecord(null);
                setIsPrintOpen(true);
              }}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            {records.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                title="Excluir toda a base de notificações"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Base</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Busca Global */}
          <div className="lg:col-span-4 relative">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Busca Geral (Nº, Edificação, CNPJ, Endereço, SEI, Redação, Fiscal)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.termoBusca}
                onChange={(e) => updateFilter('termoBusca', e.target.value)}
                placeholder="Ex: Condomínio, 130901, SEI-270107, CNPJ..."
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600/20 focus:border-red-700 bg-white"
              />
              {filters.termoBusca && (
                <button
                  type="button"
                  onClick={() => updateFilter('termoBusca', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro Status */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Situação / Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
            >
              <option value="">Todos os Status ({stats.total})</option>
              <option value="ATIVAS">Somente Ativas / Pendentes ({stats.ativasTotal})</option>
              <option value="INTERDICOES_TAC">Interdições & TAC ({stats.interdicoesTac})</option>
              <option value="ENCERRADAS_CANCELADAS">
                Encerradas & Canceladas ({stats.encerradosCancelados})
              </option>
              {FISCALIZACAO_STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Município */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Município
            </label>
            <select
              value={filters.municipio}
              onChange={(e) => updateFilter('municipio', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
            >
              <option value="">Todos</option>
              {availableMunicipios.map(([muni, count]) => (
                <option key={muni} value={muni}>
                  {muni} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Órgão / Ano */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Órgão
            </label>
            <select
              value={filters.orgao}
              onChange={(e) => updateFilter('orgao', e.target.value)}
              className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
            >
              <option value="">Todos</option>
              {availableOrgaos.map((org) => (
                <option key={org} value={org}>
                  {org}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Ordenar por
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={filters.ordenacaoCampo}
                onChange={(e) =>
                  updateFilter(
                    'ordenacaoCampo',
                    e.target.value as FiscalizacaoFilterState['ordenacaoCampo']
                  )
                }
                className="flex-1 px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-600/20 focus:border-red-700"
              >
                <option value="codigo">Nº Código</option>
                <option value="edificacao">Edificação</option>
                <option value="status">Status</option>
                <option value="dataExpedicao">Data Expedição</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  updateFilter(
                    'ordenacaoDirecao',
                    filters.ordenacaoDirecao === 'asc' ? 'desc' : 'asc'
                  )
                }
                title={
                  filters.ordenacaoDirecao === 'asc'
                    ? 'Ordem crescente'
                    : 'Ordem decrescente'
                }
                className="px-2.5 py-2 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                {filters.ordenacaoDirecao === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Chips opcionais de Ano quando houver anos cadastrados */}
        {availableYears.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
            <span className="font-semibold text-slate-500 mr-1">Ano do Ato:</span>
            <button
              type="button"
              onClick={() => updateFilter('ano', '')}
              className={`px-2.5 py-0.5 rounded-md font-semibold border cursor-pointer ${
                filters.ano === ''
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => updateFilter('ano', filters.ano === yr ? '' : yr)}
                className={`px-2.5 py-0.5 rounded-md font-semibold font-mono border cursor-pointer ${
                  filters.ano === yr
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Painel 1: Fiscalizações Ativas / Pendentes de Cumprimento */}
      {records.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsActiveExpanded((prev) => !prev)}
            className="w-full px-4 sm:px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-800/95 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                Notificações, Autos de Infração, Interdições e TACs Ativos
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-400/30 font-mono text-xs font-bold">
                {activeRecords.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span>{isActiveExpanded ? 'Recolher' : 'Expandir'}</span>
              {isActiveExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isActiveExpanded && (
            <>
              {activeRecords.length === 0 ? (
                <div className="p-8 text-center text-xs sm:text-sm text-slate-500">
                  Nenhuma notificação ativa encontrada para os filtros selecionados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <th className="px-3 py-2.5">Nº</th>
                        <th className="px-3 py-2.5">Edificação / CNPJ-CPF</th>
                        <th className="px-3 py-2.5">Município / Endereço</th>
                        <th className="px-3 py-2.5">Processo Vinculado</th>
                        <th className="px-3 py-2.5">Status / Fiscal</th>
                        <th className="px-3 py-2.5">Expedição / Atos</th>
                        <th className="px-3 py-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activePageItems.map((rec) => (
                        <FiscalizacaoRow
                          key={rec.id}
                          record={rec}
                          onEdit={(r) => {
                            setEditingRecord(r);
                            setIsModalOpen(true);
                          }}
                          onDelete={(r) => setDeletingRecord(r)}
                          onPrintSingle={(r) => {
                            setSinglePrintRecord(r);
                            setIsPrintOpen(true);
                          }}
                          onQuickStatusChange={handleQuickStatusChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTotalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Página <strong>{safeActivePage}</strong> de{' '}
                    <strong>{activeTotalPages}</strong> ({activeRecords.length} registros ativos)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeActivePage <= 1}
                      onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <button
                      type="button"
                      disabled={safeActivePage >= activeTotalPages}
                      onClick={() =>
                        setActivePage((p) => Math.min(activeTotalPages, p + 1))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Painel 2: Encerradas & Canceladas (Minimizado por padrão) */}
      {records.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsClosedExpanded((prev) => !prev)}
            className="w-full px-4 sm:px-5 py-3.5 bg-slate-100 hover:bg-slate-200/70 text-slate-800 flex flex-wrap items-center justify-between gap-2 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                Notificações Encerradas e Canceladas
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono text-xs font-bold">
                {closedRecords.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>{isClosedExpanded ? 'Recolher' : 'Expandir histórico encerrado'}</span>
              {isClosedExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {isClosedExpanded && (
            <>
              {closedRecords.length === 0 ? (
                <div className="p-8 text-center text-xs sm:text-sm text-slate-500">
                  Nenhum registro encerrado ou cancelado encontrado para os filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <th className="px-3 py-2.5">Nº</th>
                        <th className="px-3 py-2.5">Edificação / CNPJ-CPF</th>
                        <th className="px-3 py-2.5">Município / Endereço</th>
                        <th className="px-3 py-2.5">Processo Vinculado</th>
                        <th className="px-3 py-2.5">Status / Fiscal</th>
                        <th className="px-3 py-2.5">Expedição / Atos</th>
                        <th className="px-3 py-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedPageItems.map((rec) => (
                        <FiscalizacaoRow
                          key={rec.id}
                          record={rec}
                          onEdit={(r) => {
                            setEditingRecord(r);
                            setIsModalOpen(true);
                          }}
                          onDelete={(r) => setDeletingRecord(r)}
                          onPrintSingle={(r) => {
                            setSinglePrintRecord(r);
                            setIsPrintOpen(true);
                          }}
                          onQuickStatusChange={handleQuickStatusChange}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {closedTotalPages > 1 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>
                    Página <strong>{safeClosedPage}</strong> de{' '}
                    <strong>{closedTotalPages}</strong> ({closedRecords.length} registros encerrados/cancelados)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safeClosedPage <= 1}
                      onClick={() => setClosedPage((p) => Math.max(1, p - 1))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Anterior</span>
                    </button>
                    <button
                      type="button"
                      disabled={safeClosedPage >= closedTotalPages}
                      onClick={() =>
                        setClosedPage((p) => Math.min(closedTotalPages, p + 1))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <span>Próxima</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Modal Criar / Editar Notificação */}
      {isModalOpen && (
        <FiscalizacaoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={onSaveRecord}
          editingRecord={editingRecord}
          nextCodigo={nextCodigo}
        />
      )}

      {/* Modal de Impressão */}
      {isPrintOpen && (
        <FiscalizacaoPrintModal
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          singleRecord={singlePrintRecord}
          recordsList={filteredRecords}
        />
      )}

      {/* Modal de Importação / Sincronização de Planilha CSV */}
      {isImportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">
                  Importar / Sincronizar Planilha de Notificações
                </h3>
              </div>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm text-slate-700">
              <p>
                Você pode carregar a planilha base estruturada (<strong>1.196 registros DGST/DDP</strong>) ou enviar um novo arquivo <code>.csv</code> delimitado por ponto-e-vírgula.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importReplaceMode}
                    onChange={() => setImportReplaceMode(true)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Substituir base atual</strong> (limpa registros antigos e grava exatamente a planilha importada)
                  </span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={!importReplaceMode}
                    onChange={() => setImportReplaceMode(false)}
                    className="mt-0.5"
                  />
                  <span>
                    <strong>Mesclar / Atualizar pelo código</strong> (atualiza registros existentes e adiciona novos)
                  </span>
                </label>
              </div>

              {isImporting && importProgress && (
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-red-700 h-2 transition-all duration-200"
                      style={{
                        width: `${Math.round(
                          (importProgress.completed / Math.max(1, importProgress.total)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 text-center">
                    Enviando {importProgress.completed} de {importProgress.total} registros para o Firestore...
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleLoadSeedCsv}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  <span>Carregar Base Inicial (1.196)</span>
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Escolher Arquivo .CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual */}
      {deletingRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />
                <h3 className="text-sm font-bold">Confirmar Exclusão de Notificação</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                disabled={isDeletingSingle}
                className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-rose-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700">
              <p>
                Tem certeza de que deseja <strong>excluir permanentemente</strong> este registro do Firestore?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                <p>
                  <span className="text-slate-500">Código:</span>{' '}
                  <strong className="font-mono text-slate-900">
                    #{String(deletingRecord.codigo).padStart(4, '0')}
                  </strong>
                </p>
                <p className="truncate">
                  <span className="text-slate-500">Edificação:</span>{' '}
                  <strong className="text-slate-900 uppercase">
                    {deletingRecord.edificacao}
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Situação:</span>{' '}
                  <span className="font-semibold text-slate-800">
                    {deletingRecord.status}
                  </span>
                </p>
              </div>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingRecord(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void executeDeleteSingle()}
                disabled={isDeletingSingle}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {isDeletingSingle ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingSingle ? 'Excluindo...' : 'Sim, Excluir Registro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Limpeza Total da Base de Notificações */}
      {isClearConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />
                <h3 className="text-sm font-bold">Limpar Base de Notificações</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearingAll}
                className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-rose-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2 text-xs sm:text-sm text-slate-700">
              <p>
                Tem certeza de que deseja remover todos os{' '}
                <strong>{records.length} registro(s)</strong> da aba Notificações?
              </p>
              <p className="text-xs text-slate-500">
                Os processos da aba &quot;Listagem de Processos&quot; não serão afetados.
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearingAll}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void executeClearAll()}
                disabled={isClearingAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {isClearingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isClearingAll ? 'Removendo...' : 'Sim, Limpar Base'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
