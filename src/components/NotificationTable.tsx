import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BuildingNotification } from '../types';
import { NotificationRow } from './NotificationRow';
import { calcularPrazoProcesso } from '../utils/helpers';
import { buildProcessLinkIndex } from '../utils/processLinks';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FolderOpen,
  Layers,
  Maximize2,
  Minimize2,
  PlusCircle,
  UploadCloud,
} from 'lucide-react';

interface NotificationTableProps {
  notifications: BuildingNotification[];
  allNotifications?: BuildingNotification[];
  onEdit: (notification: BuildingNotification) => void;
  onDelete?: (notification: BuildingNotification) => void;
  onAddQuickNote: (id: string, noteText: string, author: string) => void;
  onPrintSingle: (notification: BuildingNotification) => void;
  onResetFilters: () => void;
  onUpdateLocalizacao?: (id: string, newLoc: string) => void;
  onUpdateNotification?: (notification: BuildingNotification) => void;
  onEnsureProcessVisible?: (target: BuildingNotification) => void;
  onOpenImportModal?: () => void;
  onOpenNewRecordModal?: () => void;
  selectedLocalizacao?: string;
}

const normalizeLocalizacao = (loc?: string) =>
  (loc || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');

const isInternetLocation = (loc?: string) => {
  const val = normalizeLocalizacao(loc);
  return val === 'INTERNET' || val === 'PASTA INTERNET' || val === 'PRANCHETA';
};

const isCxAutorizacoesLocation = (loc?: string) => {
  const val = normalizeLocalizacao(loc);
  return (
    val === 'CX AUTORIZACOES' ||
    val === 'CX DE AUTORIZACOES' ||
    val === 'CAIXA AUTORIZACOES' ||
    val === 'CAIXA DE AUTORIZACOES'
  );
};

const isNaturalArchiveLocation = (loc?: string) =>
  isInternetLocation(loc) || isCxAutorizacoesLocation(loc);

const isProntoLocation = (loc?: string) => normalizeLocalizacao(loc) === 'PRONTO';

const NotificationTableHead: React.FC = () => (
  <thead>
    <tr className="bg-slate-100/90 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
      <th scope="col" className="py-3 px-3 text-center w-20 min-w-[75px]">
        Código
      </th>
      <th scope="col" className="py-3 px-3 min-w-[280px]">
        Processo / Requerente
      </th>
      <th
        scope="col"
        className="py-3 px-3 w-36 min-w-[115px]"
        title="Origem dos dados: Coluna 'ENTRADA NA SST' da planilha"
      >
        Entrada na SST
      </th>
      <th
        scope="col"
        className="py-3 px-3 w-36 min-w-[130px]"
        title="Origem dos dados: Coluna 'SITUAÇÃO' e 'OUTROS BILHETES' da planilha"
      >
        Situação (Status)
      </th>
      <th
        scope="col"
        className="py-3 px-3 w-44 min-w-[150px]"
        title="Prazo limite legal calculado: Entrada na SST + dias do tipo de processo"
      >
        Prazo Limite / Trâmite
      </th>
      <th
        scope="col"
        className="py-3 px-3 w-32 min-w-[110px]"
        title="Origem dos dados: Coluna 'DOC. GERADO' da planilha (ex: DI-1029, LE-112, CAA-345)"
      >
        DOC. GERADO
      </th>
      <th
        scope="col"
        className="py-3 px-3 w-40 min-w-[130px]"
        title="Origem dos dados: Coluna 'LOCALIZAÇÃO' da planilha"
      >
        Localização
      </th>
      <th scope="col" className="py-3 px-4 text-center w-36 min-w-[130px]">
        Ações
      </th>
    </tr>
  </thead>
);

export const NotificationTable: React.FC<NotificationTableProps> = ({
  notifications,
  allNotifications,
  onEdit,
  onDelete,
  onAddQuickNote,
  onPrintSingle,
  onResetFilters,
  onUpdateLocalizacao,
  onUpdateNotification,
  onEnsureProcessVisible,
  onOpenImportModal,
  onOpenNewRecordModal,
  selectedLocalizacao,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isActiveExpanded, setIsActiveExpanded] = useState(true);
  const [isProntoExpanded, setIsProntoExpanded] = useState(false);
  const [isArchiveExpanded, setIsArchiveExpanded] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedLocalizacao) return;
    if (isProntoLocation(selectedLocalizacao)) {
      setIsProntoExpanded(true);
    } else if (isNaturalArchiveLocation(selectedLocalizacao)) {
      setIsArchiveExpanded(true);
    } else {
      setIsActiveExpanded(true);
    }
  }, [selectedLocalizacao]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const linkIndex = useMemo(
    () => buildProcessLinkIndex(allNotifications && allNotifications.length > 0 ? allNotifications : notifications),
    [allNotifications, notifications]
  );

  const handleNavigateToProcess = (target: BuildingNotification) => {
    const loc = target.detalhesSST?.localizacao;
    if (isNaturalArchiveLocation(loc)) {
      setIsArchiveExpanded(true);
    } else if (isProntoLocation(loc)) {
      setIsProntoExpanded(true);
    } else {
      setIsActiveExpanded(true);
    }

    onEnsureProcessVisible?.(target);

    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(target.id);
      return next;
    });

    setHighlightedId(target.id);
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedId(null);
    }, 2800);

    window.setTimeout(() => {
      const el = document.getElementById(`process-row-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 90);
  };

  const {
    activeNotifications,
    prontoNotifications,
    archivedNotifications,
    internetOnlyCount,
    cxAutorizacoesCount,
    legacyPastaInternetCount,
    vencidosCount,
    alertaPrazoCount,
    noPrazoCount,
  } = useMemo(() => {
    const active: BuildingNotification[] = [];
    const pronto: BuildingNotification[] = [];
    const archived: BuildingNotification[] = [];
    let internetOnly = 0;
    let cxAuth = 0;
    let legacyCount = 0;
    let vencidos = 0;
    let alerta = 0;
    let noPrazo = 0;

    for (const item of notifications) {
      const loc = item.detalhesSST?.localizacao;
      if (isNaturalArchiveLocation(loc)) {
        archived.push(item);
        if (isCxAutorizacoesLocation(loc)) {
          cxAuth += 1;
        } else {
          internetOnly += 1;
          const normLoc = normalizeLocalizacao(loc);
          if (normLoc === 'PASTA INTERNET' || normLoc === 'PRANCHETA') {
            legacyCount += 1;
          }
        }
      } else if (isProntoLocation(loc)) {
        pronto.push(item);
      } else {
        active.push(item);
        const prazo = calcularPrazoProcesso(item);
        if (!prazo.hasDataPronto && !prazo.isConcluido) {
          if (prazo.isVencido) {
            vencidos += 1;
          } else if (prazo.diasRestantes !== null && prazo.diasRestantes <= 5) {
            alerta += 1;
          } else {
            noPrazo += 1;
          }
        }
      }
    }

    // Todos os dashboards preservam exatamente a ordenação numérica/selecionada vinda dos filtros (independente do DOC gerado ou tipo)
    return {
      activeNotifications: active,
      prontoNotifications: pronto,
      archivedNotifications: archived,
      internetOnlyCount: internetOnly,
      cxAutorizacoesCount: cxAuth,
      legacyPastaInternetCount: legacyCount,
      vencidosCount: vencidos,
      alertaPrazoCount: alerta,
      noPrazoCount: noPrazo,
    };
  }, [notifications]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSectionAllExpanded = (items: BuildingNotification[]) =>
    items.length > 0 && items.every((item) => expandedIds.has(item.id));

  const handleToggleSectionExpandAll = (items: BuildingNotification[]) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const currentlyAllExpanded = items.length > 0 && items.every((item) => next.has(item.id));
      if (currentlyAllExpanded) {
        items.forEach((item) => next.delete(item.id));
      } else {
        items.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const allActiveExpanded = isSectionAllExpanded(activeNotifications);
  const allProntoExpanded = isSectionAllExpanded(prontoNotifications);
  const allArchiveExpanded = isSectionAllExpanded(archivedNotifications);

  return (
    <div className="space-y-4">
      {/* Expandable Dashboard 1: Processos em Tramitação (Foco em Prazo) */}
      <section
        aria-label="Processos em tramitação com foco em prazo"
        className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setIsActiveExpanded((prev) => !prev)}
          aria-expanded={isActiveExpanded}
          className="w-full px-4 py-3.5 bg-slate-50/90 hover:bg-slate-100/70 transition-colors flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-200/80 text-red-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  Listagem Geral · Processos em Tramitação
                </h2>
                <span className="text-slate-400 text-xs" aria-hidden="true">·</span>
                <span className="text-xs font-semibold text-slate-800 tabular-nums">
                  {activeNotifications.length} {activeNotifications.length === 1 ? 'processo' : 'processos'}
                </span>
                {vencidosCount > 0 && (
                  <>
                    <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded tabular-nums">
                      <AlertTriangle className="w-3 h-3" />
                      {vencidosCount} {vencidosCount === 1 ? 'vencido' : 'vencidos'}
                    </span>
                  </>
                )}
                {alertaPrazoCount > 0 && (
                  <>
                    <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded tabular-nums">
                      <Clock className="w-3 h-3" />
                      {alertaPrazoCount} até 5 dias
                    </span>
                  </>
                )}
                {noPrazoCount > 0 && (
                  <>
                    <span className="text-slate-300 text-xs" aria-hidden="true">·</span>
                    <span className="text-xs font-medium text-blue-700 tabular-nums">
                      {noPrazoCount} no prazo
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Ordenado numericamente por processo e ano (independente de DOC gerado ou tipo) · {prontoNotifications.length} em pronto · {archivedNotifications.length} em arquivamento natural
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            <span>{isActiveExpanded ? 'Minimizar' : 'Expandir'}</span>
            {isActiveExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </button>

        {isActiveExpanded && (
          <div className="border-t border-slate-200">
            {activeNotifications.length > 0 && (
              <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex flex-wrap items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Exibindo <strong className="text-slate-800 tabular-nums">{activeNotifications.length}</strong> processo(s) em tramitação em <strong className="text-slate-700">ordem numérica</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSectionExpandAll(activeNotifications)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {allActiveExpanded ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Recolher Todos</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expandir Todos</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <NotificationTableHead />
                <tbody className="divide-y divide-slate-100">
                  {activeNotifications.length > 0 ? (
                    activeNotifications.map((notif) => (
                      <NotificationRow
                        key={notif.id}
                        notification={notif}
                        isExpanded={expandedIds.has(notif.id)}
                        onToggleExpand={handleToggleExpand}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAddQuickNote={onAddQuickNote}
                        onPrintSingle={onPrintSingle}
                        onUpdateLocalizacao={onUpdateLocalizacao}
                        onUpdateNotification={onUpdateNotification}
                        linkInfo={linkIndex.get(notif.id)}
                        onNavigateToProcess={handleNavigateToProcess}
                        isHighlighted={highlightedId === notif.id}
                      />
                    ))
                  ) : notifications.length > 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 px-4 text-center">
                        <div className="max-w-lg mx-auto space-y-3">
                          <div className="w-11 h-11 mx-auto rounded-full bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                            <Archive className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">
                              Nenhum processo pendente em tramitação
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              Todos os <span className="tabular-nums font-semibold text-slate-700">{notifications.length}</span> registro(s) correspondentes aos filtros atuais estão com localização em <strong>Pronto</strong> ou em <strong>Arquivamento Natural</strong> nos painéis abaixo.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            {prontoNotifications.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setIsProntoExpanded(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Abrir Pronto ({prontoNotifications.length})</span>
                              </button>
                            )}
                            {archivedNotifications.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setIsArchiveExpanded(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Abrir Arquivamento Natural ({archivedNotifications.length})</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 px-4 text-center">
                        <div className="max-w-md mx-auto text-center space-y-3.5">
                          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                            <FolderOpen className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-800">
                              Plataforma Limpa & Pronta para Uso
                            </h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              Nenhum registro ativo no banco de dados. Você pode fazer o upload da sua planilha CSV atualizada ou cadastrar novos processos. O sistema importará estritamente os dados do arquivo, sem inventar informações.
                            </p>
                          </div>
                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            {onOpenImportModal && (
                              <button
                                type="button"
                                onClick={onOpenImportModal}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer transition-colors"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Fazer Upload da Planilha CSV</span>
                              </button>
                            )}
                            {onOpenNewRecordModal && (
                              <button
                                type="button"
                                onClick={onOpenNewRecordModal}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs cursor-pointer transition-colors"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                                <span>Novo Processo Manual</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={onResetFilters}
                              className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              Redefinir Filtros
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Expandable Dashboard 2: Localização "Pronto" (starts minimized, ordered by numero + ano) */}
      <section
        aria-label="Processos com localização Pronto"
        className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setIsProntoExpanded((prev) => !prev)}
          aria-expanded={isProntoExpanded}
          className="w-full px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 transition-colors flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  Processos Prontos
                </h2>
                <span className="text-slate-400 text-xs" aria-hidden="true">·</span>
                <span className="text-xs font-semibold text-emerald-800 tabular-nums">
                  {prontoNotifications.length} {prontoNotifications.length === 1 ? 'processo' : 'processos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Localização: Pronto · Ordenado por número do processo e ano
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            <span>{isProntoExpanded ? 'Minimizar' : 'Expandir'}</span>
            {isProntoExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </button>

        {isProntoExpanded && (
          <div className="border-t border-slate-200">
            {prontoNotifications.length > 0 ? (
              <>
                <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Exibindo <strong className="text-slate-800 tabular-nums">{prontoNotifications.length}</strong> registro(s) com localização <strong className="text-slate-700">PRONTO</strong> (ordem numérica + ano)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleSectionExpandAll(prontoNotifications)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {allProntoExpanded ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Recolher Todos</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Expandir Todos</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <NotificationTableHead />
                    <tbody className="divide-y divide-slate-100">
                      {prontoNotifications.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isExpanded={expandedIds.has(notif.id)}
                          onToggleExpand={handleToggleExpand}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onAddQuickNote={onAddQuickNote}
                          onPrintSingle={onPrintSingle}
                          onUpdateLocalizacao={onUpdateLocalizacao}
                          onUpdateNotification={onUpdateNotification}
                          linkInfo={linkIndex.get(notif.id)}
                          onNavigateToProcess={handleNavigateToProcess}
                          isHighlighted={highlightedId === notif.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-slate-500">
                Nenhum processo com localização <strong>Pronto</strong> para os filtros aplicados.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Expandable Dashboard 3: Arquivamento Natural — "Internet" (incl. "Pasta Internet", "Prancheta") e "Cx. Autorizações" (starts minimized, ordered by numero + ano) */}
      <section
        aria-label="Arquivamento natural de processos na Internet e Caixa de Autorizações"
        className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
      >
        <button
          type="button"
          onClick={() => setIsArchiveExpanded((prev) => !prev)}
          aria-expanded={isArchiveExpanded}
          className="w-full px-4 py-3.5 bg-slate-50/80 hover:bg-slate-100/70 transition-colors flex flex-wrap items-center justify-between gap-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center shrink-0">
              <Archive className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  Arquivamento Natural · Internet &amp; Cx. Autorizações
                </h2>
                <span className="text-slate-400 text-xs" aria-hidden="true">·</span>
                <span className="text-xs font-semibold text-sky-800 tabular-nums">
                  {archivedNotifications.length} {archivedNotifications.length === 1 ? 'processo' : 'processos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Agrupa Internet (inclui &quot;Pasta Internet&quot; e &quot;Prancheta&quot;) e &quot;CX AUTORIZAÇÕES&quot; · Ordenado por número e ano
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 whitespace-nowrap shrink-0">
            <span>{isArchiveExpanded ? 'Minimizar' : 'Expandir'}</span>
            {isArchiveExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </button>

        {isArchiveExpanded && (
          <div className="border-t border-slate-200">
            {archivedNotifications.length > 0 ? (
              <>
                <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Exibindo <strong className="text-slate-800 tabular-nums">{archivedNotifications.length}</strong> registro(s) arquivado(s) (ordem numérica + ano)
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="tabular-nums text-slate-600">
                      {internetOnlyCount} em <strong>INTERNET</strong>
                    </span>
                    {cxAutorizacoesCount > 0 && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="tabular-nums text-amber-800">
                          {cxAutorizacoesCount} em <strong>CX AUTORIZAÇÕES</strong>
                        </span>
                      </>
                    )}
                    {legacyPastaInternetCount > 0 && (
                      <>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span className="text-slate-500 tabular-nums">
                          {legacyPastaInternetCount} agrupado(s) de &quot;Pasta Internet&quot; / &quot;Prancheta&quot;
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSectionExpandAll(archivedNotifications)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {allArchiveExpanded ? (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Recolher Todos</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Expandir Todos</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <NotificationTableHead />
                    <tbody className="divide-y divide-slate-100">
                      {archivedNotifications.map((notif) => (
                        <NotificationRow
                          key={notif.id}
                          notification={notif}
                          isExpanded={expandedIds.has(notif.id)}
                          onToggleExpand={handleToggleExpand}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onAddQuickNote={onAddQuickNote}
                          onPrintSingle={onPrintSingle}
                          onUpdateLocalizacao={onUpdateLocalizacao}
                          onUpdateNotification={onUpdateNotification}
                          linkInfo={linkIndex.get(notif.id)}
                          onNavigateToProcess={handleNavigateToProcess}
                          isHighlighted={highlightedId === notif.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-slate-500">
                Nenhum processo arquivado em <strong>Internet</strong> (&quot;Pasta Internet&quot;, &quot;Prancheta&quot;) ou <strong>CX AUTORIZAÇÕES</strong> para os filtros aplicados.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
