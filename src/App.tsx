import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Unsubscribe } from 'firebase/firestore';
import { BuildingNotification, FilterState } from './types';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { NotificationTable } from './components/NotificationTable';
import { RecordModal } from './components/RecordModal';
import { PrintReportModal } from './components/PrintReportModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { DgstSyncModal } from './components/DgstSyncModal';
import { StatisticalReportDashboard } from './components/StatisticalReportDashboard';
import { AuthGate } from './components/AuthGate';
import { ToastContainer, ToastMessage } from './components/Toast';
import { exportToCSV, calcularPrazoProcesso, formatCpfCnpj, extractProcessoNumero, formatProcesso, formatProcessoNumeroAno, adicionarDiasAData } from './utils/helpers';
import {
  cleanProcessLinkValue,
  computeLinkBackfillUpdates,
  getRecordYearAndNumber,
  parseProcessLinkRef,
} from './utils/processLinks';
import { auth, isAuthorizedUser, signOutFirebase } from './firebase';
import {
  batchImportNotificationsToFirestore,
  clearYearNotificationsInFirestore,
  ensureUserProfile,
  inferAnoExercicio,
  saveNotificationToFirestore,
  subscribeToNotificationsForYear,
  subscribeToYearBuckets,
  syncDgstCorrelationToFirestore,
  updateHistoricoAndDetailsInFirestore,
} from './services/firestoreNotifications';
import {
  ShieldCheck,
  Trash2,
  AlertTriangle,
  X,
  CloudUpload,
  Loader2,
  BarChart3,
  Layers,
} from 'lucide-react';

const STORAGE_KEY = 'cbmerj_sst_notificacoes_v8_clean';

const getUrgencyPriority = (item: BuildingNotification) => {
  const prazo = calcularPrazoProcesso(item);

  if (prazo.hasDataPronto || prazo.isConcluido) {
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
  // Auth State
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  // Year Partitioning State (preserva 2026, prepara 2027+, economiza leituras diárias no Spark)
  const currentYear = String(new Date().getFullYear());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [remoteYears, setRemoteYears] = useState<string[]>([]);

  // Cloud Notifications State
  const [notifications, setNotifications] = useState<BuildingNotification[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Legacy localStorage detection for one-click cloud migration
  const [legacyLocalRecords, setLegacyLocalRecords] = useState<BuildingNotification[]>(() => {
    try {
      localStorage.removeItem('cbmerj_sst_notificacoes_v7');
      localStorage.removeItem('cbmerj_sst_notificacoes_v6');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });
  const [isMigratingLocal, setIsMigratingLocal] = useState(false);

  const availableYears = useMemo(() => {
    const set = new Set<string>(['2026', '2027', currentYear, ...remoteYears]);
    return Array.from(set)
      .filter((y) => /^\d{4}$/.test(y))
      .sort();
  }, [remoteYears, currentYear]);

  // Monitor Firebase Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !isAuthorizedUser(firebaseUser)) {
        await signOutFirebase().catch(() => {});
        setUser(null);
        setAuthReady(true);
        setNotifications([]);
        setRemoteYears([]);
        return;
      }

      setUser(firebaseUser);
      setAuthReady(true);

      if (firebaseUser) {
        try {
          await ensureUserProfile(firebaseUser);
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      } else {
        setNotifications([]);
        setRemoteYears([]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to existing year buckets after auth is ready
  useEffect(() => {
    if (!authReady || !user) return;
    let unsub: Unsubscribe | undefined;
    try {
      unsub = subscribeToYearBuckets(user.uid, (years) => {
        setRemoteYears(years);
      });
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
    return () => {
      unsub?.();
    };
  }, [authReady, user]);

  // Listen to notifications for the selected year (or all discovered years) ONLY when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    setIsSyncing(true);
    const unsubs: Unsubscribe[] = [];
    const recordsByYear = new Map<string, BuildingNotification[]>();

    const targetYears =
      selectedYear === 'TODOS'
        ? Array.from(new Set([...remoteYears, '2026', '2027', currentYear])).filter((y) =>
            /^\d{4}$/.test(y)
          )
        : [selectedYear];

    try {
      targetYears.forEach((yr) => {
        const unsub = subscribeToNotificationsForYear(user.uid, yr, (items) => {
          recordsByYear.set(yr, items);
          const merged: BuildingNotification[] = [];
          recordsByYear.forEach((arr) => merged.push(...arr));
          setNotifications(merged);
          setIsSyncing(false);
        });
        unsubs.push(unsub);
      });

      if (targetYears.length === 0) {
        setNotifications([]);
        setIsSyncing(false);
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, user, selectedYear, remoteYears, currentYear]);

  // Aplica no Firestore os 2 ajustes solicitados do confronto (64442 -> DIR. DIVISÃO e cadastro 73456/2026)
  const hasAppliedOpen42FixRef = useRef(false);
  useEffect(() => {
    if (!authReady || !user || isSyncing || notifications.length === 0) return;
    if (selectedYear !== '2026' && selectedYear !== 'TODOS') return;
    if (hasAppliedOpen42FixRef.current) return;

    const normLoc = (s?: string) =>
      (s || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ');

    const rec64442 = notifications.find(
      (n) => n.numero === 64442 || extractProcessoNumero(n.processo) === 64442
    );
    const loc64442 = normLoc(rec64442?.detalhesSST?.localizacao);
    const needsFix64442 = Boolean(
      rec64442 &&
        !rec64442.detalhesSST?.dataPronto &&
        ['PASTA INTERNET', 'INTERNET', 'PRANCHETA'].includes(loc64442)
    );

    const has73456 = notifications.some(
      (n) => n.numero === 73456 || extractProcessoNumero(n.processo) === 73456
    );
    let alreadyCreated73456 = false;
    try {
      alreadyCreated73456 = localStorage.getItem('cbmerj_sst_open42_73456_created') === '1';
    } catch {
      alreadyCreated73456 = false;
    }
    const needsCreate73456 = !has73456 && !alreadyCreated73456;

    if (!needsFix64442 && !needsCreate73456) {
      hasAppliedOpen42FixRef.current = true;
      return;
    }

    hasAppliedOpen42FixRef.current = true;

    (async () => {
      const appliedActions: string[] = [];
      const todayBR = new Date().toLocaleDateString('pt-BR');
      const nowTimeBR = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const nowISO = new Date().toISOString();

      try {
        if (needsFix64442 && rec64442) {
          const updated64442: BuildingNotification = {
            ...rec64442,
            detalhesSST: {
              ...(rec64442.detalhesSST || {}),
              localizacao: 'DIR. DIVISÃO',
            },
            observacoes: (rec64442.observacoes || '').replace(/PASTA INTERNET/gi, 'DIR. DIVISÃO'),
            historico: [
              {
                id: `log-fix-64442-${Date.now()}`,
                data: `${todayBR} ${nowTimeBR}`,
                autor: 'Confronto DGST',
                acao: 'Ajuste de Localização',
                detalhes:
                  'Localização alterada de PASTA INTERNET para DIR. DIVISÃO conforme Relatório de Processos em Aberto DGST (19/11/2026).',
              },
              ...(rec64442.historico || []),
            ].slice(0, 150),
            atualizadoEm: nowISO,
          };
          const yr64442 = inferAnoExercicio(rec64442, '2026');
          await saveNotificationToFirestore(user.uid, updated64442, true, yr64442, yr64442);
          appliedActions.push('64442/2026 movido para DIR. DIVISÃO');
        }

        if (needsCreate73456) {
          const entradaBR = '19/11/2026';
          const prazoLimiteBR = adicionarDiasAData(entradaBR, 30).dataBR;
          const record73456: BuildingNotification = {
            id: 'proc-73456-11220-2026',
            numero: 73456,
            processo: 'E27/73456/11220/2026',
            processoAdministrativo: 'E27/73456/11220/2026',
            codigoDocumento: 'Processo E27/73456/11220/2026',
            edificacao: 'GISELE SPERANDIO DOS',
            requerente: 'GISELE SPERANDIO DOS',
            tipoProcesso: 'LAUDO DE EXIGENCIAS',
            origem: 'ANGRA DOS REIS',
            status: 'EM ANÁLISE',
            tipoDocumento: 'Notificação',
            obm: '10º GBM - ANGRA DOS REIS',
            dataExpedicao: entradaBR,
            dataEntrada: entradaBR,
            dataValidade: prazoLimiteBR,
            dataTramite: prazoLimiteBR,
            oculto: false,
            detalhesSST: {
              codigo: '11220',
              dataBase: '30',
              entradaSST: entradaBR,
              entradaOBM: entradaBR,
              situacao: 'EM ANÁLISE',
              localizacao: 'PROTOCOLO',
            },
            endereco: {
              logradouro: '',
              numero: '',
              bairro: '',
              municipio: 'Angra dos Reis',
            },
            proprietario: {
              nomeOuRazaoSocial: 'GISELE SPERANDIO DOS',
              cpfOuCnpj: '',
              telefone: '',
              email: '',
            },
            fiscalResponsavel: '',
            matriculaFiscal: '',
            exigencias: [],
            observacoes:
              'Incluído via Relatório de Processos em Aberto DGST (19/11/2026). Status no sistema DGST: Arquivo.',
            historico: [
              {
                id: `log-new-73456-${Date.now()}`,
                data: `${todayBR} ${nowTimeBR}`,
                autor: 'Confronto DGST',
                acao: 'Cadastro de Processo em Aberto',
                detalhes:
                  'Processo E27/73456/11220/2026 (GISELE SPERANDIO DOS) incluído a partir do Relatório de Processos em Aberto (19/11/2026).',
              },
            ],
            criadoEm: nowISO,
            atualizadoEm: nowISO,
            anoExercicio: '2026',
          };
          await saveNotificationToFirestore(user.uid, record73456, false, '2026');
          try {
            localStorage.setItem('cbmerj_sst_open42_73456_created', '1');
          } catch {
            // ignore
          }
          appliedActions.push('73456/2026 cadastrado');
        }

        if (appliedActions.length > 0) {
          addToast(
            'success',
            'Ajustes aplicados no Firestore!',
            appliedActions.join(' · ')
          );
        }
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  }, [authReady, user, isSyncing, notifications, selectedYear]);

  // Sincronização idempotente de vínculos bidirecionais (PROCESSO ANTIGO <-> PROCESSO SEGUINTE) no Firestore
  const hasAppliedProcessLinksRef = useRef(false);
  useEffect(() => {
    if (!authReady || !user || isSyncing || notifications.length === 0) return;
    if (selectedYear !== '2026' && selectedYear !== 'TODOS') return;
    if (hasAppliedProcessLinksRef.current) return;

    let alreadyDone = false;
    try {
      alreadyDone = localStorage.getItem('cbmerj_sst_process_links_backfill_v1') === '1';
    } catch {
      alreadyDone = false;
    }

    const updates = computeLinkBackfillUpdates(notifications);
    if (updates.length === 0) {
      hasAppliedProcessLinksRef.current = true;
      if (!alreadyDone) {
        try {
          localStorage.setItem('cbmerj_sst_process_links_backfill_v1', '1');
        } catch {
          // ignore
        }
      }
      return;
    }

    hasAppliedProcessLinksRef.current = true;

    (async () => {
      try {
        const res = await syncDgstCorrelationToFirestore(user.uid, updates, [], selectedYear);
        try {
          localStorage.setItem('cbmerj_sst_process_links_backfill_v1', '1');
        } catch {
          // ignore
        }
        if (res.updatedCount > 0) {
          addToast(
            'success',
            'Vínculos entre processos sincronizados!',
            `${res.updatedCount} processo(s) conectado(s) bidirecionalmente no Firestore.`
          );
        }
      } catch (err) {
        setFatalError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  }, [authReady, user, isSyncing, notifications, selectedYear]);

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

  // Active Workspace View ('listagem' | 'relatorios')
  const [activeView, setActiveView] = useState<'listagem' | 'relatorios'>('listagem');

  // Modals & Print State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BuildingNotification | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDgstSyncModalOpen, setIsDgstSyncModalOpen] = useState(false);
  const [dgstSeedCsv, setDgstSeedCsv] = useState<{ text: string; fileName: string } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [singlePrintRecord, setSinglePrintRecord] = useState<BuildingNotification | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isClearingRemote, setIsClearingRemote] = useState(false);

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
        if (filters.termoBusca.trim()) {
          const term = filters.termoBusca.toLowerCase().trim();
          const termDigits = term.replace(/[^\d]/g, '');

          const matchEdificacao = item.edificacao.toLowerCase().includes(term);
          const matchRequerente = item.requerente ? item.requerente.toLowerCase().includes(term) : false;
          const formattedProc = formatProcesso(
            item.processo !== undefined ? item.processo : item.numero,
            { codigo: item.detalhesSST?.codigo, ano: item.anoExercicio }
          ).toLowerCase();
          const formattedProcSimples = formatProcessoNumeroAno(
            item.processo !== undefined ? item.processo : item.numero,
            { ano: item.anoExercicio, dataRef: item.dataEntrada || item.dataExpedicao }
          ).toLowerCase();
          const matchProcesso =
            (item.processo ? item.processo.toLowerCase().includes(term) : false) ||
            formattedProc.includes(term) ||
            formattedProcSimples.includes(term) ||
            (item.processoAdministrativo ? item.processoAdministrativo.toLowerCase().includes(term) : false);
          const matchTipo = item.tipoProcesso ? item.tipoProcesso.toLowerCase().includes(term) : false;
          const matchOrigem = item.origem ? item.origem.toLowerCase().includes(term) : false;
          const matchCodigo = item.codigoDocumento.toLowerCase().includes(term);
          const matchNumero =
            String(item.numero).includes(term) ||
            String(item.numero).padStart(5, '0').includes(term) ||
            String(item.numero).padStart(4, '0').includes(term);
          const matchLogradouro = item.endereco.logradouro.toLowerCase().includes(term);
          const matchBairro = item.endereco.bairro.toLowerCase().includes(term);
          const matchMunicipio = item.endereco.municipio.toLowerCase().includes(term);
          const matchProprietario = item.proprietario.nomeOuRazaoSocial.toLowerCase().includes(term);
          const matchFiscal = item.fiscalResponsavel.toLowerCase().includes(term);

          const rawCpfCnpj = (item.proprietario?.cpfOuCnpj || '').trim();
          const cleanItemCpfCnpj = rawCpfCnpj.replace(/[^\d]/g, '');
          const formattedCpfCnpj = formatCpfCnpj(rawCpfCnpj).toLowerCase();

          const matchCpfText =
            rawCpfCnpj.toLowerCase().includes(term) || formattedCpfCnpj.includes(term);

          const matchCpfDigits =
            termDigits.length >= 3 && cleanItemCpfCnpj.length >= 3
              ? cleanItemCpfCnpj.includes(termDigits)
              : termDigits.length > 0 && cleanItemCpfCnpj.length > 0 && cleanItemCpfCnpj === termDigits;

          const matchCpfCnpj = matchCpfText || matchCpfDigits;

          const reqDigits = (item.requerente || '').replace(/[^\d]/g, '');
          const matchReqDigits = termDigits.length >= 6 && reqDigits.includes(termDigits);

          const matchLinkedProc =
            cleanProcessLinkValue(item.detalhesSST?.processoAntigo).toLowerCase().includes(term) ||
            cleanProcessLinkValue(item.detalhesSST?.numDocAntigo).toLowerCase().includes(term) ||
            cleanProcessLinkValue(item.detalhesSST?.processoSeguinte).toLowerCase().includes(term) ||
            cleanProcessLinkValue(item.detalhesSST?.docGerado).toLowerCase().includes(term);

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
            !matchFiscal &&
            !matchCpfCnpj &&
            !matchReqDigits &&
            !matchLinkedProc
          ) {
            return false;
          }
        }

        if (filters.obm && item.obm !== filters.obm && item.origem !== filters.obm) {
          return false;
        }

        if (filters.status && item.status !== filters.status) {
          return false;
        }

        const entrada = item.dataEntrada || item.dataExpedicao;
        if (filters.dataInicial && entrada < filters.dataInicial) {
          return false;
        }

        if (filters.dataFinal && entrada > filters.dataFinal) {
          return false;
        }

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
          valA = a.numero > 0 ? a.numero : extractProcessoNumero(a.processo);
          valB = b.numero > 0 ? b.numero : extractProcessoNumero(b.processo);
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

  const handleSaveRecord = async (record: BuildingNotification, isEditing: boolean) => {
    if (!user) return;
    const fallbackYear = selectedYear === 'TODOS' ? currentYear : selectedYear;
    const prevYear = editingRecord ? inferAnoExercicio(editingRecord, fallbackYear) : undefined;
    try {
      const saved = await saveNotificationToFirestore(
        user.uid,
        record,
        isEditing,
        fallbackYear,
        prevYear
      );

      // Mantém vínculo recíproco atualizado no processo relacionado quando editado manualmente
      const savedMeta = getRecordYearAndNumber(saved, saved.anoExercicio || fallbackYear);
      const segRef = parseProcessLinkRef(saved.detalhesSST?.processoSeguinte, savedMeta.ano);
      const antRef = parseProcessLinkRef(saved.detalhesSST?.processoAntigo, savedMeta.ano);

      const reciprocalUpdates: BuildingNotification[] = [];
      const todayBR = new Date().toLocaleDateString('pt-BR');
      const timeBR = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (segRef?.isMatchableNumeric && segRef.numero > 0 && segRef.numero !== savedMeta.numero) {
        const child = notifications.find((n) => {
          const m = getRecordYearAndNumber(n, fallbackYear);
          return n.id !== saved.id && m.numero === segRef.numero && m.ano === segRef.ano;
        });
        if (child && !cleanProcessLinkValue(child.detalhesSST?.processoAntigo)) {
          const docGer = cleanProcessLinkValue(saved.detalhesSST?.docGerado);
          reciprocalUpdates.push({
            ...child,
            detalhesSST: {
              ...(child.detalhesSST || {}),
              processoAntigo: `${savedMeta.numero}/${savedMeta.ano.slice(-2)}`,
              ...(!cleanProcessLinkValue(child.detalhesSST?.numDocAntigo) && docGer
                ? { numDocAntigo: docGer }
                : {}),
            },
            historico: [
              {
                id: `log-link-rec-${Date.now()}`,
                data: `${todayBR} ${timeBR}`,
                autor: 'Vínculo Automático',
                acao: 'Processo Anterior Vinculado',
                detalhes: `Vinculado automaticamente ao processo ${savedMeta.formatted}.`,
              },
              ...(child.historico || []),
            ].slice(0, 150),
            atualizadoEm: new Date().toISOString(),
          });
        }
      }

      if (antRef?.isMatchableNumeric && antRef.numero > 0 && antRef.numero !== savedMeta.numero) {
        const parent = notifications.find((n) => {
          const m = getRecordYearAndNumber(n, fallbackYear);
          return n.id !== saved.id && m.numero === antRef.numero && m.ano === antRef.ano;
        });
        if (parent && !cleanProcessLinkValue(parent.detalhesSST?.processoSeguinte)) {
          reciprocalUpdates.push({
            ...parent,
            detalhesSST: {
              ...(parent.detalhesSST || {}),
              processoSeguinte: String(savedMeta.numero),
            },
            historico: [
              {
                id: `log-link-fwd-${Date.now()}`,
                data: `${todayBR} ${timeBR}`,
                autor: 'Vínculo Automático',
                acao: 'Processo Seguinte Vinculado',
                detalhes: `Continuação vinculada automaticamente para o processo ${savedMeta.formatted}.`,
              },
              ...(parent.historico || []),
            ].slice(0, 150),
            atualizadoEm: new Date().toISOString(),
          });
        }
      }

      if (reciprocalUpdates.length > 0) {
        await syncDgstCorrelationToFirestore(user.uid, reciprocalUpdates, [], fallbackYear);
      }

      if (selectedYear !== 'TODOS' && saved.anoExercicio && saved.anoExercicio !== selectedYear) {
        setSelectedYear(saved.anoExercicio);
      }
      if (isEditing) {
        addToast(
          'success',
          'Registro atualizado no Firestore!',
          `As alterações em "${record.edificacao}" foram gravadas na nuvem (Exercício ${saved.anoExercicio}).`
        );
      } else {
        addToast(
          'success',
          'Novo registro gravado na nuvem!',
          `Edificação "${record.edificacao}" inserida no exercício ${saved.anoExercicio} como Registro nº ${record.numero}.`
        );
      }
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleAddQuickNote = async (id: string, noteText: string, author: string) => {
    if (!user) return;
    const target = notifications.find((n) => n.id === id);
    if (!target) return;

    const timestamp = `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const newLog = {
      id: `log-${Date.now()}`,
      data: timestamp,
      autor: author,
      acao: 'Despacho Técnico / Parecer',
      detalhes: noteText,
    };
    const newHistorico = [newLog, ...(target.historico || [])];
    const fallbackYear = selectedYear === 'TODOS' ? currentYear : selectedYear;

    try {
      await updateHistoricoAndDetailsInFirestore(user.uid, target, newHistorico, fallbackYear);
      addToast('success', 'Despacho salvo no Firestore!', 'Novo evento gravado na linha do tempo do processo.');
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
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
    exportToCSV(
      filteredNotifications,
      `notificacoes-edificacoes-${selectedYear}-${new Date().toISOString().split('T')[0]}.csv`
    );
    addToast('success', 'Planilha exportada com sucesso!', 'Arquivo CSV gerado com todos os campos e filtros aplicados.');
  };

  const handleImportCsv = async (items: BuildingNotification[], replaceExisting: boolean) => {
    if (!user) return;
    if (items.length > 10) {
      addToast(
        'info',
        'Gravando registros no Firestore...',
        `Enviando ${items.length} registro(s) em lotes seguros para a nuvem.`
      );
    }
    try {
      const result = await batchImportNotificationsToFirestore(
        user.uid,
        items,
        replaceExisting,
        selectedYear,
        notifications
      );

      if (
        selectedYear !== 'TODOS' &&
        result.yearsTouched.length === 1 &&
        result.yearsTouched[0] !== selectedYear
      ) {
        setSelectedYear(result.yearsTouched[0]);
      }

      addToast(
        'success',
        replaceExisting ? 'Base sincronizada no Firestore!' : 'Registros incorporados no Firestore!',
        `${result.importedCount} registro(s) gravados na nuvem (Exercício(s): ${result.yearsTouched.join(', ')}).`
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleDgstSyncToFirestore = async (
    updates: BuildingNotification[],
    creates: BuildingNotification[],
    onProgress: (completed: number, total: number) => void
  ) => {
    if (!user) return;
    const result = await syncDgstCorrelationToFirestore(
      user.uid,
      updates,
      creates,
      selectedYear,
      onProgress
    );

    if (
      selectedYear !== 'TODOS' &&
      result.yearsTouched.length === 1 &&
      result.yearsTouched[0] !== selectedYear
    ) {
      setSelectedYear(result.yearsTouched[0]);
    }

    addToast(
      'success',
      'Correlação DGST gravada no Firestore!',
      `${result.updatedCount} processo(s) atualizado(s) e ${result.createdCount} novo(s) inserido(s) (Exercício(s): ${result.yearsTouched.join(', ')}).`
    );
  };

  const handleMigrateLocalToFirestore = async () => {
    if (!user || legacyLocalRecords.length === 0) return;
    setIsMigratingLocal(true);
    try {
      const result = await batchImportNotificationsToFirestore(
        user.uid,
        legacyLocalRecords,
        false,
        selectedYear,
        notifications
      );
      localStorage.removeItem(STORAGE_KEY);
      setLegacyLocalRecords([]);
      addToast(
        'success',
        'Migração concluída com sucesso!',
        `${result.importedCount} registro(s) locais foram enviados ao Firestore (Exercício(s): ${result.yearsTouched.join(', ')}).`
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsMigratingLocal(false);
    }
  };

  const handleDiscardLocalDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setLegacyLocalRecords([]);
    addToast('info', 'Rascunho local descartado', 'A plataforma utiliza exclusivamente os dados do Firestore.');
  };

  const handleClearAllData = () => {
    setIsClearConfirmOpen(true);
  };

  const executeClearAllData = async () => {
    if (!user) return;
    setIsClearingRemote(true);
    const yearsToClear =
      selectedYear === 'TODOS'
        ? availableYears
        : [selectedYear];

    try {
      const deletedCount = await clearYearNotificationsInFirestore(user.uid, yearsToClear);
      setFilters(defaultFilters);
      setEditingRecord(null);
      setSinglePrintRecord(null);
      setIsClearConfirmOpen(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('cbmerj_sst_notificacoes_v7');
        localStorage.removeItem('cbmerj_sst_notificacoes_v6');
        localStorage.removeItem('cbmerj_sst_notificacoes_v5');
        setLegacyLocalRecords([]);
      } catch {
        // ignore
      }
      addToast(
        'warning',
        'Registros excluídos do Firestore!',
        `${deletedCount} registro(s) removidos de ${selectedYear === 'TODOS' ? 'todos os exercícios' : `exercício ${selectedYear}`}. Base pronta para nova planilha CSV.`
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsClearingRemote(false);
    }
  };

  const handleUpdateNotification = async (updated: BuildingNotification) => {
    if (!user) return;
    const fallbackYear = selectedYear === 'TODOS' ? currentYear : selectedYear;
    const prevYear = inferAnoExercicio(updated, fallbackYear);
    try {
      await saveNotificationToFirestore(user.uid, updated, true, fallbackYear, prevYear);
      addToast(
        'success',
        'Processo atualizado no Firestore!',
        `Bilhetes e dados de "${updated.requerente || updated.edificacao}" salvos na nuvem.`
      );
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  // Loading auth screen
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="w-8 h-8 animate-spin text-red-700" />
          <p className="text-sm font-medium">Conectando ao Firebase Firestore...</p>
        </div>
      </div>
    );
  }

  // Google Sign-In Gate
  if (!user) {
    return (
      <AuthGate
        onError={(msg) => addToast('warning', 'Autenticação necessária', msg)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans print:bg-white">
      {/* Top Header with Year Selector & Auth Status */}
      <div className="print:hidden">
        <Header
          notifications={notifications}
          userEmail={user.email}
          onSignOut={handleSignOut}
          selectedYear={selectedYear}
          availableYears={availableYears}
          onSelectYear={setSelectedYear}
          isSyncing={isSyncing}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5 print:p-0 print:max-w-none">
        {/* Segmented Workspace Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView('listagem')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'listagem'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Listagem de Processos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('relatorios')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'relatorios'
                  ? 'bg-red-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Gráficos e Relatórios Estatísticos</span>
            </button>
          </div>
        </div>
        {/* Banner opcional de migração caso existam registros locais salvos antes do Firestore */}
        {legacyLocalRecords.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <CloudUpload className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-950">
                <p className="font-bold">
                  Foram encontrados {legacyLocalRecords.length} registro(s) salvos localmente neste
                  navegador.
                </p>
                <p className="text-blue-800 text-xs mt-0.5">
                  Deseja enviá-los para o banco de dados Firestore na nuvem ou descartar a cópia local?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDiscardLocalDraft}
                disabled={isMigratingLocal}
                className="px-3 py-1.5 text-xs font-medium text-blue-800 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors cursor-pointer"
              >
                Descartar local
              </button>
              <button
                type="button"
                onClick={handleMigrateLocalToFirestore}
                disabled={isMigratingLocal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {isMigratingLocal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Enviar para o Firestore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeView === 'listagem' ? (
          <>
            {/* Filter Bar */}
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              onResetFilters={handleResetFilters}
              onOpenNewRecordModal={handleOpenNewRecordModal}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenDgstSyncModal={() => {
                setDgstSeedCsv(null);
                setIsDgstSyncModalOpen(true);
              }}
              onOpenPrintModal={handleOpenPrintReport}
              onExportCSV={handleExportCSV}
              totalFilteredCount={filteredNotifications.length}
              totalRecords={notifications.length}
              onClearAllData={handleClearAllData}
              onOpenReports={() => setActiveView('relatorios')}
            />

            {/* Data Table with Expandable Rows */}
            <NotificationTable
              notifications={filteredNotifications}
              allNotifications={notifications}
              onEdit={handleEdit}
              onAddQuickNote={handleAddQuickNote}
              onPrintSingle={handlePrintSingle}
              onResetFilters={handleResetFilters}
              onUpdateNotification={handleUpdateNotification}
              onEnsureProcessVisible={(target) => {
                const isVisible = filteredNotifications.some((n) => n.id === target.id);
                if (!isVisible) {
                  setFilters(defaultFilters);
                  addToast(
                    'info',
                    'Filtro ajustado',
                    `Exibindo o processo vinculado ${formatProcessoNumeroAno(target.processo ?? target.numero, { ano: target.anoExercicio })}.`
                  );
                }
              }}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onOpenNewRecordModal={handleOpenNewRecordModal}
            />
          </>
        ) : (
          <StatisticalReportDashboard
            notifications={notifications}
            selectedYear={selectedYear}
            availableYears={availableYears}
            onEditRecord={handleEdit}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-5 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-red-700" />
            <span className="font-semibold text-slate-700">
              Corpo de Bombeiros Militar do Estado do Rio de Janeiro · CBMERJ
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>SST - 10º GBM (Angra dos Reis)</span>
            <span>·</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllData}
                className="text-rose-600 hover:text-rose-800 font-semibold underline inline-flex items-center gap-1 cursor-pointer"
                title="Excluir todos os registros cadastrados da plataforma"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Todos os Registros</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Record Creation / Edition Modal */}
      {isRecordModalOpen && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          onSave={handleSaveRecord}
          editingRecord={editingRecord}
          nextNumber={nextNumber}
        />
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <ImportCsvModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportCsv}
          onOpenDgstSyncWithText={(csvText, fileName) => {
            setDgstSeedCsv({ text: csvText, fileName });
            setIsDgstSyncModalOpen(true);
          }}
          currentCount={notifications.length}
        />
      )}

      {/* DGST Reconciliation & Push to Firestore Modal */}
      {isDgstSyncModalOpen && (
        <DgstSyncModal
          key={dgstSeedCsv ? dgstSeedCsv.fileName : 'dgst-default'}
          isOpen={isDgstSyncModalOpen}
          onClose={() => {
            setIsDgstSyncModalOpen(false);
            setDgstSeedCsv(null);
          }}
          existingNotifications={notifications}
          initialCsvText={dgstSeedCsv?.text}
          initialFileName={dgstSeedCsv?.fileName}
          onSyncToFirestore={handleDgstSyncToFirestore}
        />
      )}

      {/* Print Document Modal */}
      {isPrintModalOpen && (
        <PrintReportModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          singleRecord={singlePrintRecord}
          recordsList={filteredNotifications}
        />
      )}

      {/* Modal de Confirmação de Exclusão Total (compatível com iFrame, sem window.confirm) */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />
                <h3 className="text-sm font-bold">Excluir Registros do Firestore</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearingRemote}
                className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-rose-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700">
              <p>
                Tem certeza de que deseja{' '}
                <strong>excluir todos os {notifications.length} registro(s)</strong>{' '}
                {selectedYear === 'TODOS'
                  ? 'de todos os anos de exercício'
                  : `do exercício ${selectedYear}`}{' '}
                no banco de dados Firestore?
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {selectedYear === 'TODOS'
                  ? 'Atenção: todos os exercícios exibidos serão apagados permanentemente da nuvem.'
                  : `Apenas os registros do exercício ${selectedYear} serão apagados; os demais anos cadastrados permanecem preservados.`}
              </p>
            </div>
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                disabled={isClearingRemote}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeClearAllData}
                disabled={isClearingRemote}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 active:bg-rose-900 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isClearingRemote ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isClearingRemote ? 'Excluindo...' : 'Sim, Excluir Tudo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Feedback */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
