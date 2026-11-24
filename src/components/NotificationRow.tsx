import React from 'react';
import { BuildingNotification } from '../types';
import { formatDateBR, formatProcesso, formatProcessoNumeroAno, calcularPrazoProcesso } from '../utils/helpers';
import { cleanProcessLinkValue, ProcessLinkInfo } from '../utils/processLinks';
import { RowExpandedDetails } from './RowExpandedDetails';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, FileText, Clock, Link2, ArrowRight, CornerDownRight } from 'lucide-react';

interface NotificationRowProps {
  notification: BuildingNotification;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (notification: BuildingNotification) => void;
  onAddQuickNote: (id: string, noteText: string, author: string) => void;
  onPrintSingle: (notification: BuildingNotification) => void;
  onUpdateLocalizacao?: (id: string, newLoc: string) => void;
  onUpdateNotification?: (notification: BuildingNotification) => void;
  linkInfo?: ProcessLinkInfo;
  onNavigateToProcess?: (target: BuildingNotification) => void;
  isHighlighted?: boolean;
}

const isLocalizacaoContinuacao = (loc?: string) => {
  const val = (loc || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
  return [
    'PROTOCOLO',
    'INTERNET',
    'PASTA INTERNET',
    'PRANCHETA',
    'ENTREGUE NET',
    'PRONTO',
    'CX AUTORIZACOES',
    'CX DE AUTORIZACOES',
    'CAIXA AUTORIZACOES',
    'CAIXA DE AUTORIZACOES',
  ].includes(val);
};

const getUrgencyClasses = (notification: BuildingNotification) => {
  const prazo = calcularPrazoProcesso(notification);

  // Processos com DATA DO PRONTO já tiveram sua contagem encerrada
  if (prazo.hasDataPronto) {
    if (prazo.concluidoNoPrazo) {
      return {
        row: 'bg-emerald-50/70 border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        text: 'text-emerald-800',
        date: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        label: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    }
    // Concluído após o limite mas já com contagem encerrada (não é pendência urgente)
    return {
      row: 'bg-slate-50 border-slate-200 hover:bg-slate-100/60',
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      text: 'text-slate-800',
      date: 'bg-slate-50 text-slate-800 border-slate-200',
      label: 'bg-amber-100 text-amber-900 border-amber-200',
    };
  }

  // Outros processos concluídos / entregues
  if (prazo.isConcluido || isLocalizacaoContinuacao(notification.detalhesSST?.localizacao)) {
    return {
      row: 'bg-emerald-50/80 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      text: 'text-emerald-700',
      date: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  }

  // Processos em andamento com prazo vencido -> Vermelho Claro (Topo)
  if (prazo.isVencido || (prazo.diasRestantes !== null && prazo.diasRestantes <= 0)) {
    return {
      row: 'bg-red-50 border-red-200 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]',
      badge: 'bg-red-100 text-red-700 border-red-300',
      text: 'text-red-700',
      date: 'bg-red-50 text-red-700 border-red-200',
      label: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  // Processos em andamento com prazo próximo de vencer (5 dias até 0) -> Laranja (Topo)
  if (prazo.diasRestantes !== null && prazo.diasRestantes <= 5) {
    return {
      row: 'bg-orange-50 border-orange-200 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.15)]',
      badge: 'bg-orange-100 text-orange-700 border-orange-300',
      text: 'text-orange-700',
      date: 'bg-orange-50 text-orange-700 border-orange-200',
      label: 'bg-orange-100 text-orange-700 border-orange-200',
    };
  }

  return {
    row: 'bg-white border-slate-200 hover:bg-sky-50/40',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    text: 'text-slate-900',
    date: 'bg-slate-50 text-slate-900 border-slate-200',
    label: 'bg-blue-50 text-blue-700 border-blue-200',
  };
};

export const NotificationRow: React.FC<NotificationRowProps> = ({
  notification,
  isExpanded,
  onToggleExpand,
  onEdit,
  onAddQuickNote,
  onPrintSingle,
  onUpdateLocalizacao,
  onUpdateNotification,
  linkInfo,
  onNavigateToProcess,
  isHighlighted = false,
}) => {
  const prazoInfo = calcularPrazoProcesso(notification);
  const urgency = getUrgencyClasses(notification);

  const getLocalizacaoStyle = (loc?: string) => {
    const val = (loc || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/\s+/g, ' ');
    if (val === 'DIRETOR') return 'bg-red-700 text-white border-red-800 font-bold';
    if (val === 'PRONTO') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (val === 'INTERNET' || val === 'ENTREGUE NET' || val === 'PASTA INTERNET' || val === 'PRANCHETA') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (val === 'CX AUTORIZACOES' || val === 'CX DE AUTORIZACOES' || val === 'CAIXA AUTORIZACOES' || val === 'CAIXA DE AUTORIZACOES') return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    if (val === 'DIR. DIVISAO' || val === 'PROTOCOLO') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
    return 'bg-slate-100 text-slate-800 border-slate-200 font-medium';
  };

  const getDocGeradoStyle = (doc?: string) => {
    if (!doc || doc === '-' || doc === '- - - -' || doc.trim() === '') {
      return 'text-slate-400 bg-slate-50 border-slate-200';
    }
    const val = doc.trim().toUpperCase();
    if (val.startsWith('DI')) {
      return 'text-red-900 bg-red-50/80 border-red-200 font-bold font-mono';
    }
    if (val.startsWith('CAA')) {
      return 'text-blue-900 bg-blue-50/80 border-blue-200 font-bold font-mono';
    }
    if (val.startsWith('LE') || val.startsWith('A-')) {
      return 'text-sky-900 bg-sky-50/80 border-sky-200 font-bold font-mono';
    }
    if (val.startsWith('CD')) {
      return 'text-indigo-900 bg-indigo-50/80 border-indigo-200 font-bold font-mono';
    }
    return 'text-slate-900 bg-slate-50 border-slate-200 font-bold font-mono';
  };

  const getOutrosBilhetesStyle = (val?: string) => {
    if (!val) return 'text-slate-600 font-medium';
    const upper = val.toUpperCase().trim();
    if (upper === 'GERADO DI') return 'text-red-700 font-bold';
    if (upper === 'FINALIZADO') return 'text-slate-700 font-semibold';
    if (upper.includes('RETORNO')) return 'text-amber-800 font-semibold';
    if (upper.includes('BILHETE')) return 'text-blue-800 font-semibold';
    return 'text-slate-700 font-medium';
  };

  const renderStatus = () => {
    const st = String(notification.status || '').toUpperCase();
    if (st.includes('INDEFERID')) {
      return (
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs font-bold">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>INDEFERIDO</span>
        </span>
      );
    }
    if (st.includes('DEFERID') || st.includes('APROVAD')) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{st.includes('APROVAD') ? 'APROVADO' : 'DEFERIDO'}</span>
        </span>
      );
    }
    if (st.includes('AGUARD')) {
      return (
        <span className="inline-flex items-center gap-1 text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs font-semibold">
          <span>{notification.status}</span>
        </span>
      );
    }
    if (st.includes('RETORN')) {
      return (
        <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
          <span>{notification.status}</span>
        </span>
      );
    }
    if (st.includes('ENTREGU')) {
      return (
        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>ENTREGUE</span>
        </span>
      );
    }
    if (st.includes('PRONTO')) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>PRONTO</span>
        </span>
      );
    }
    if (st.includes('ENCERRAD')) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Encerrado</span>
        </span>
      );
    }
    if (st.includes('GERADO DI')) {
      return (
        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs font-bold">
          <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>GERADO DI</span>
        </span>
      );
    }
    if (st.includes('ANDAMENTO')) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>EM ANDAMENTO</span>
        </span>
      );
    }
    if (st.includes('INFRACAO') || st.includes('INFRAÇÃO')) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Auto de Infração</span>
        </span>
      );
    }
    if (st.includes('INTERD')) {
      return (
        <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-xs font-bold">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Interdição</span>
        </span>
      );
    }
    if (st.includes('TAC')) {
      return (
        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-xs font-semibold">
          <span>TAC</span>
        </span>
      );
    }
    if (st.includes('PREVENTIV')) {
      return (
        <span className="inline-flex items-center gap-1 text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-xs font-medium">
          <span>Notificação Preventiva</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
        {notification.status || 'Notificação'}
      </span>
    );
  };

  return (
    <>
      <tr
        id={`process-row-${notification.id}`}
        data-process-id={notification.id}
        className={`border-b border-slate-200 text-xs sm:text-sm transition-all duration-300 ${
          isHighlighted
            ? 'bg-sky-100/90 ring-2 ring-blue-600 shadow-sm'
            : `${urgency.row} ${isExpanded ? 'ring-1 ring-sky-200' : ''}`
        }`}
      >
        <td className="py-2.5 px-3 text-center align-middle whitespace-nowrap w-24">
          <button
            type="button"
            onClick={() => onToggleExpand(notification.id)}
            className={`inline-flex items-center justify-center gap-1 px-3 py-1 text-xs font-normal border rounded shadow-2xs transition-colors cursor-pointer select-none ${
              isExpanded ? 'bg-blue-700 text-white border-blue-800' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <span>{isExpanded ? 'Ver menos' : 'Ver mais'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>
        </td>

        <td className="py-2.5 px-3 align-middle">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-3.5">
            <div
              className={`text-xs whitespace-nowrap leading-tight shrink-0 flex flex-col items-start border rounded px-2 py-1 ${urgency.label}`}
              title={`Processo completo: ${formatProcesso(notification.processo !== undefined ? notification.processo : notification.numero, {
                codigo: notification.detalhesSST?.codigo,
                ano: notification.anoExercicio,
              })}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">PROCESSO</span>
              <strong className="font-bold font-mono text-xs mt-0.5">
                {formatProcessoNumeroAno(notification.processo !== undefined ? notification.processo : notification.numero, {
                  ano: notification.anoExercicio,
                  dataRef: notification.dataEntrada || notification.dataExpedicao,
                })}
              </strong>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 uppercase tracking-tight block truncate sm:whitespace-normal">
                {notification.requerente || notification.edificacao}
              </span>
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                {notification.tipoProcesso || notification.tipoDocumento || 'Processo'} – {notification.origem || notification.obm}
              </span>

              {linkInfo?.hasAnyLink && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {linkInfo.prevLinks.map((prev) => {
                    const prevNumAno = formatProcessoNumeroAno(
                      prev.processo !== undefined ? prev.processo : prev.numero,
                      { ano: prev.anoExercicio, dataRef: prev.dataEntrada || prev.dataExpedicao }
                    );
                    const prevDoc = cleanProcessLinkValue(prev.detalhesSST?.docGerado);
                    const prevStatus = cleanProcessLinkValue(prev.detalhesSST?.situacao || prev.status);
                    const summary = [prevStatus, prevDoc].filter(Boolean).join(' · ');

                    return (
                      <button
                        key={`prev-${prev.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToProcess?.(prev);
                        }}
                        title={`Ir para o processo anterior ${prevNumAno} (${prev.requerente || prev.edificacao}${summary ? ` — ${summary}` : ''})`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-300 bg-slate-100/90 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 text-[10.5px] leading-tight transition-colors cursor-pointer"
                      >
                        <CornerDownRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>Originado de</span>
                        <strong className="font-mono font-bold text-slate-900">{prevNumAno}</strong>
                        {summary && (
                          <span className="text-slate-500 font-medium hidden sm:inline">
                            ({summary})
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {linkInfo.prevLinks.length === 0 && linkInfo.externalPrevRef && (
                    <span
                      title={`Processo anterior registrado na planilha${linkInfo.externalPrevRef.doc ? `: Documento ${linkInfo.externalPrevRef.doc}` : ''}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 text-[10.5px] leading-tight"
                    >
                      <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Ant.:</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {linkInfo.externalPrevRef.processo}
                      </span>
                      {linkInfo.externalPrevRef.doc && (
                        <span className="font-mono text-slate-500">
                          · {linkInfo.externalPrevRef.doc}
                        </span>
                      )}
                    </span>
                  )}

                  {linkInfo.nextLinks.map((next) => {
                    const nextNumAno = formatProcessoNumeroAno(
                      next.processo !== undefined ? next.processo : next.numero,
                      { ano: next.anoExercicio, dataRef: next.dataEntrada || next.dataExpedicao }
                    );
                    const nextDoc = cleanProcessLinkValue(next.detalhesSST?.docGerado);
                    const nextStatus = cleanProcessLinkValue(next.detalhesSST?.situacao || next.status);
                    const summary = [nextStatus, nextDoc].filter(Boolean).join(' · ');

                    return (
                      <button
                        key={`next-${next.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToProcess?.(next);
                        }}
                        title={`Ir para o processo seguinte ${nextNumAno} (${next.requerente || next.edificacao}${summary ? ` — ${summary}` : ''})`}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50/90 hover:bg-blue-100 hover:border-blue-400 text-blue-900 text-[10.5px] leading-tight font-medium transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3 h-3 text-blue-700 shrink-0" />
                        <span>Continua em</span>
                        <strong className="font-mono font-bold">{nextNumAno}</strong>
                        {summary && (
                          <span className="text-blue-700 font-medium hidden sm:inline">
                            ({summary})
                          </span>
                        )}
                        <ArrowRight className="w-3 h-3 text-blue-700 shrink-0" />
                      </button>
                    );
                  })}

                  {linkInfo.nextLinks.length === 0 && linkInfo.externalNextRef && (
                    <span
                      title={`Processo seguinte indicado na planilha: ${linkInfo.externalNextRef}`}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-blue-200/70 bg-blue-50/40 text-blue-800 text-[10.5px] leading-tight"
                    >
                      <ArrowRight className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>Seg.:</span>
                      <span className="font-mono font-semibold">{linkInfo.externalNextRef}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </td>

        <td className="py-2.5 px-3 align-middle whitespace-nowrap font-mono text-xs">
          <div className="font-bold text-slate-900 tracking-tight">
            {formatDateBR(notification.dataEntrada || notification.dataExpedicao)}
          </div>
          {notification.detalhesSST?.entradaOBM && formatDateBR(notification.detalhesSST.entradaOBM) !== formatDateBR(notification.dataEntrada || notification.dataExpedicao) && (
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              OBM: {formatDateBR(notification.detalhesSST.entradaOBM)}
            </div>
          )}
        </td>

        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
          <div className="flex flex-col items-start">
            {renderStatus()}

            {/* Linha abaixo da Situação com as informações de OUTROS BILHETES */}
            {(() => {
              const outros = (notification.detalhesSST?.outrosBilhetes || '').trim();
              if (!outros || outros === '-' || outros === '- - - -') return null;

              return (
                <div
                  className={`text-[10.5px] font-sans mt-0.5 tracking-tight ${getOutrosBilhetesStyle(outros)}`}
                  title={`Outros Bilhetes / Parecer: ${outros}`}
                >
                  {outros}
                </div>
              );
            })()}
          </div>
        </td>

        <td className="py-2.5 px-3 align-middle whitespace-nowrap text-xs">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono font-bold tracking-tight px-1.5 py-0.5 rounded border ${
                  prazoInfo.hasDataPronto
                    ? prazoInfo.concluidoNoPrazo
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-amber-800 bg-amber-50 border-amber-200'
                    : prazoInfo.isConcluido
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : prazoInfo.isVencido || (prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 0)
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 5
                    ? 'text-orange-700 bg-orange-50 border-orange-200'
                    : 'text-slate-900 bg-slate-50 border-slate-200'
                }`}
                title={`Entrada na SST: ${prazoInfo.dataEntradaBR} + ${prazoInfo.diasPrazo} dias = Prazo Limite: ${prazoInfo.dataLimiteBR}${prazoInfo.hasDataPronto ? ` · Pronto em ${prazoInfo.dataProntoBR}` : ''}`}
              >
                {prazoInfo.dataLimiteBR}
              </span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200 shrink-0">
                {prazoInfo.diasPrazo}d
              </span>
            </div>

            <div className="text-[10.5px] font-sans mt-0.5">
              {prazoInfo.hasDataPronto ? (
                prazoInfo.concluidoNoPrazo ? (
                  <span className="text-emerald-700 font-medium" title={`Pronto em ${prazoInfo.dataProntoBR} (${prazoInfo.diasNaSST}d na SST)`}>
                    Pronto em {prazoInfo.dataProntoBR} (no prazo)
                  </span>
                ) : (
                  <span className="text-amber-800 font-medium" title={`Pronto em ${prazoInfo.dataProntoBR} (${prazoInfo.diasNaSST}d na SST, ${prazoInfo.diasEmAtraso}d após limite)`}>
                    Pronto em {prazoInfo.dataProntoBR} ({prazoInfo.diasEmAtraso}d atraso)
                  </span>
                )
              ) : prazoInfo.isConcluido ? (
                <span className="text-emerald-700 font-medium">Concluído / Entregue</span>
              ) : prazoInfo.isVencido || (prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 0) ? (
                <span className="text-red-700 font-bold">Vencido ({prazoInfo.diasEmAtraso}d em atraso)</span>
              ) : prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 5 ? (
                <span className="text-orange-700 font-bold">{prazoInfo.diasRestantes} dias restantes</span>
              ) : (
                <span className="text-blue-700 font-medium">{prazoInfo.diasRestantes !== null ? `${prazoInfo.diasRestantes} dias restantes` : 'No prazo'}</span>
              )}
            </div>
          </div>
        </td>

        {/* Coluna DOC. GERADO (com a data do documento abaixo, extraída de AO DIRETOR) */}
        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
          <div className="flex flex-col items-start">
            {notification.detalhesSST?.docGerado && notification.detalhesSST.docGerado !== '- - - -' && notification.detalhesSST.docGerado !== '-' ? (
              <span
                title={`Documento Gerado: ${notification.detalhesSST.docGerado}${notification.detalhesSST.situacaoDocGerado ? ` (${notification.detalhesSST.situacaoDocGerado})` : ''}`}
                className={`inline-flex items-center px-2 py-0.5 text-xs rounded border tracking-wide select-none ${getDocGeradoStyle(
                  notification.detalhesSST.docGerado
                )}`}
              >
                {notification.detalhesSST.docGerado}
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-xs select-none">
                —
              </span>
            )}

            {/* Data do documento abaixo (coluna AO DIRETOR) */}
            {(() => {
              const rawDataDoc = notification.detalhesSST?.dataAoDiretor || notification.detalhesSST?.aoDiretor;
              const formattedDataDoc = rawDataDoc && rawDataDoc !== '- - - -' && rawDataDoc !== '-' ? formatDateBR(rawDataDoc) : '';
              if (!formattedDataDoc || formattedDataDoc === '-') return null;

              return (
                <div
                  className="text-[10.5px] font-mono text-slate-600 font-medium mt-0.5"
                  title={`Data ao Diretor / Emissão do Documento: ${formattedDataDoc}${notification.detalhesSST?.diasAoDiretor !== undefined ? ` (${notification.detalhesSST.diasAoDiretor} dias)` : ''}`}
                >
                  {formattedDataDoc}
                </div>
              );
            })()}
          </div>
        </td>

        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
          {(() => {
            const rawLoc = (notification.detalhesSST?.localizacao || '').trim();
            const normLoc = rawLoc.toUpperCase().replace(/\s+/g, ' ');
            const isLegacyInternet =
              normLoc === 'PASTA INTERNET' || normLoc === 'PRANCHETA';
            const displayLoc = isLegacyInternet ? 'INTERNET' : rawLoc || 'PROTOCOLO';

            return (
              <span
                title={
                  isLegacyInternet
                    ? `Localização atual: INTERNET (termo original na planilha: ${rawLoc})`
                    : 'Localização do processo (altere através do botão Editar)'
                }
                className={`inline-flex items-center px-2.5 py-1 text-xs rounded-md border select-none ${getLocalizacaoStyle(
                  displayLoc
                )}`}
              >
                {displayLoc}
              </span>
            );
          })()}
        </td>

        <td className="py-2.5 px-4 align-middle text-center whitespace-nowrap">
          <div className="inline-flex items-center justify-center gap-2 text-xs">
            <button type="button" onClick={() => onEdit(notification)} className="text-blue-700 hover:text-blue-900 font-medium hover:underline cursor-pointer">
              Editar
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <RowExpandedDetails
              notification={notification}
              onEdit={onEdit}
              onAddQuickNote={onAddQuickNote}
              onPrintSingle={onPrintSingle}
              onUpdateNotification={onUpdateNotification}
              linkInfo={linkInfo}
              onNavigateToProcess={onNavigateToProcess}
            />
          </td>
        </tr>
      )}
    </>
  );
};
