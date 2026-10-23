import React from 'react';
import { BuildingNotification } from '../types';
import { formatDateBR, formatProcesso, calcularPrazoProcesso } from '../utils/helpers';
import { RowExpandedDetails } from './RowExpandedDetails';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, FileText, Clock } from 'lucide-react';

interface NotificationRowProps {
  notification: BuildingNotification;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (notification: BuildingNotification) => void;
  onToggleHide: (id: string) => void;
  onAddQuickNote: (id: string, noteText: string, author: string) => void;
  onPrintSingle: (notification: BuildingNotification) => void;
  onUpdateLocalizacao?: (id: string, newLoc: string) => void;
  onUpdateNotification?: (notification: BuildingNotification) => void;
}

const isLocalizacaoContinuacao = (loc?: string) => {
  const val = (loc || '').trim().toUpperCase();
  return [
    'PROTOCOLO',
    'INTERNET',
    'PASTA INTERNET',
    'ENTREGUE NET',
    'PRONTO',
  ].includes(val);
};

const getUrgencyClasses = (notification: BuildingNotification) => {
  const prazo = calcularPrazoProcesso(notification);

  if (prazo.isConcluido || isLocalizacaoContinuacao(notification.detalhesSST?.localizacao)) {
    return {
      row: 'bg-emerald-50/80 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      text: 'text-emerald-700',
      date: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
  }

  if (prazo.isVencido || (prazo.diasRestantes !== null && prazo.diasRestantes <= 0)) {
    return {
      row: 'bg-red-50 border-red-200 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.15)]',
      badge: 'bg-red-100 text-red-700 border-red-300',
      text: 'text-red-700',
      date: 'bg-red-50 text-red-700 border-red-200',
      label: 'bg-red-100 text-red-700 border-red-200',
    };
  }

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
  onToggleHide,
  onAddQuickNote,
  onPrintSingle,
  onUpdateLocalizacao,
  onUpdateNotification,
}) => {
  const prazoInfo = calcularPrazoProcesso(notification);
  const urgency = getUrgencyClasses(notification);

  const getLocalizacaoStyle = (loc?: string) => {
    const val = (loc || '').trim().toUpperCase();
    if (val === 'DIRETOR') return 'bg-red-700 text-white border-red-800 font-bold';
    if (val === 'PRONTO') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (val === 'INTERNET' || val === 'ENTREGUE NET' || val === 'PASTA INTERNET') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
    if (val === 'CX AUTORIZAÇÕES' || val === 'CX AUTORIZACOES') return 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    if (val === 'DIR. DIVISÃO' || val === 'DIR. DIVISAO' || val === 'PROTOCOLO') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold';
    return 'bg-slate-100 text-slate-800 border-slate-200 font-medium';
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
    if (st.includes('DEFERID')) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>DEFERIDO</span>
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
        className={`border-b border-slate-200 text-xs sm:text-sm transition-all duration-200 ${
          notification.oculto
            ? 'bg-slate-100/70 text-slate-400 opacity-60'
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
            <div className={`text-xs whitespace-nowrap leading-tight shrink-0 flex flex-col items-start border rounded px-2 py-1 ${urgency.label}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider">PROCESSO</span>
              <strong className="font-bold font-mono text-xs mt-0.5">
                {formatProcesso(notification.processo !== undefined ? notification.processo : notification.numero)}
              </strong>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-slate-900 uppercase tracking-tight block truncate sm:whitespace-normal">
                {notification.requerente || notification.edificacao}
              </span>
              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                {notification.tipoProcesso || notification.tipoDocumento || 'Processo'} – {notification.origem || notification.obm}
              </span>
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
          {renderStatus()}
        </td>

        <td className="py-2.5 px-3 align-middle whitespace-nowrap text-xs">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono font-bold tracking-tight px-1.5 py-0.5 rounded border ${
                  prazoInfo.isConcluido
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : prazoInfo.isVencido || (prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 0)
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : prazoInfo.diasRestantes !== null && prazoInfo.diasRestantes <= 5
                    ? 'text-orange-700 bg-orange-50 border-orange-200'
                    : 'text-slate-900 bg-slate-50 border-slate-200'
                }`}
                title={`Entrada na SST: ${prazoInfo.dataEntradaBR} + ${prazoInfo.diasPrazo} dias = Prazo Limite: ${prazoInfo.dataLimiteBR}`}
              >
                {prazoInfo.dataLimiteBR}
              </span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200 shrink-0">
                {prazoInfo.diasPrazo}d
              </span>
            </div>

            <div className="text-[10.5px] font-sans mt-0.5">
              {prazoInfo.isConcluido ? (
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

        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
          <span
            title="Localização do processo (altere através do botão Editar)"
            className={`inline-flex items-center px-2.5 py-1 text-xs rounded-md border select-none ${getLocalizacaoStyle(
              notification.detalhesSST?.localizacao
            )}`}
          >
            {notification.detalhesSST?.localizacao || 'PROTOCOLO'}
          </span>
        </td>

        <td className="py-2.5 px-3 align-middle text-right sm:text-center whitespace-nowrap">
          <div className="inline-flex items-center gap-1.5 text-xs">
            <button type="button" onClick={() => onEdit(notification)} className="text-blue-700 hover:text-blue-900 font-medium hover:underline cursor-pointer">
              Editar
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onToggleHide(notification.id)}
              className="text-blue-700 hover:text-blue-900 font-medium hover:underline cursor-pointer"
              title={notification.oculto ? 'Restaurar registro para a lista principal' : 'Ocultar registro da exibição padrão'}
            >
              {notification.oculto ? 'Exibir' : 'Ocultar'}
            </button>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            <RowExpandedDetails
              notification={notification}
              onEdit={onEdit}
              onAddQuickNote={onAddQuickNote}
              onPrintSingle={onPrintSingle}
              onUpdateNotification={onUpdateNotification}
            />
          </td>
        </tr>
      )}
    </>
  );
};
