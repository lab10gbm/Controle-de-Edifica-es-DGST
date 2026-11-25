import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Printer,
  MapPin,
  FileText,
  History,
  UserCheck,
  Building2,
  Hash,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  BellRing,
  Ban,
  Scale,
} from 'lucide-react';
import { FiscalizacaoRecord, FiscalizacaoStatus } from '../../types/fiscalizacao';

interface FiscalizacaoRowProps {
  record: FiscalizacaoRecord;
  displayNumero?: string;
  onEdit: (record: FiscalizacaoRecord) => void;
  onDelete: (record: FiscalizacaoRecord) => void;
  onPrintSingle: (record: FiscalizacaoRecord) => void;
  onQuickStatusChange?: (
    record: FiscalizacaoRecord,
    newStatus: FiscalizacaoStatus
  ) => Promise<void>;
}

export function getFiscalizacaoStatusBadge(status: FiscalizacaoStatus) {
  switch (status) {
    case 'Notificação':
      return {
        bg: 'bg-sky-50 text-sky-800 border-sky-200',
        icon: BellRing,
      };
    case '1º Auto de Infração':
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: AlertTriangle,
      };
    case '2º Auto de Infração':
      return {
        bg: 'bg-orange-50 text-orange-800 border-orange-200',
        icon: AlertTriangle,
      };
    case 'Auto de Interdição por Inércia':
    case 'Auto de Interdição por Perigo iminente':
      return {
        bg: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: ShieldAlert,
      };
    case 'TAC em Andamento':
      return {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        icon: Scale,
      };
    case 'Encerrado':
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'Cancelado':
      return {
        bg: 'bg-slate-100 text-slate-600 border-slate-300',
        icon: Ban,
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: FileText,
      };
  }
}

function getAtoBadgeClass(tipoAto: string): string {
  const norm = String(tipoAto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (norm.includes('encerrad') || norm.includes('encerrament')) {
    return 'text-emerald-800 bg-emerald-50 border-emerald-200';
  }
  if (norm.includes('cancelad') || norm.includes('cancelament')) {
    return 'text-slate-700 bg-slate-200 border-slate-300';
  }
  if (norm.includes('interdic')) {
    return 'text-rose-800 bg-rose-50 border-rose-200';
  }
  if (norm.includes('tac')) {
    return 'text-indigo-800 bg-indigo-50 border-indigo-200';
  }
  if (norm.includes('notificac')) {
    return 'text-sky-800 bg-sky-50 border-sky-200';
  }
  return 'text-amber-800 bg-amber-50 border-amber-200';
}

export const FiscalizacaoRow: React.FC<FiscalizacaoRowProps> = ({
  record,
  displayNumero,
  onEdit,
  onDelete,
  onPrintSingle,
  onQuickStatusChange,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const badge = getFiscalizacaoStatusBadge(record.status);
  const StatusIcon = badge.icon;
  const lastAto =
    record.historicoAtos && record.historicoAtos.length > 0
      ? record.historicoAtos[record.historicoAtos.length - 1]
      : null;

  const isClosed = record.status === 'Encerrado' || record.status === 'Cancelado';

  const handleQuickStatus = async (next: FiscalizacaoStatus) => {
    if (!onQuickStatusChange || isUpdatingStatus || record.status === next) return;
    setIsUpdatingStatus(true);
    try {
      await onQuickStatusChange(record, next);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <>
      <tr
        onClick={() => setExpanded((prev) => !prev)}
        className={`group border-b border-slate-100 transition-colors cursor-pointer ${
          expanded
            ? 'bg-amber-50/40'
            : isClosed
            ? 'bg-white hover:bg-slate-50/90'
            : 'bg-white hover:bg-sky-50/40'
        }`}
      >
        {/* Expand + Código */}
        <td className="px-3 py-3 whitespace-nowrap align-top">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((prev) => !prev);
              }}
              className="p-1 rounded hover:bg-slate-200/70 text-slate-500 cursor-pointer"
              aria-label={expanded ? 'Recolher detalhes' : 'Expandir detalhes'}
            >
              {expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <span
              title={
                displayNumero
                  ? `Sequencial anual ${displayNumero} · Registro geral #${String(record.codigo).padStart(4, '0')}`
                  : `Registro geral #${String(record.codigo).padStart(4, '0')}`
              }
              className="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded"
            >
              {displayNumero || `#${String(record.codigo).padStart(4, '0')}`}
            </span>
          </div>
        </td>

        {/* Edificação + Documento */}
        <td className="px-3 py-3 align-top max-w-[300px]">
          <div className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 uppercase">
            {record.edificacao || 'EM BRANCO'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {record.documentoCpfCnpj && (
              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                {record.documentoCpfCnpj}
              </span>
            )}
            {record.orgaoPrincipal && (
              <span className="font-mono font-semibold text-slate-600">
                {record.orgaoPrincipal}
              </span>
            )}
          </div>
        </td>

        {/* Município + Endereço */}
        <td className="px-3 py-3 align-top max-w-[290px]">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{record.municipio || 'Não Informado'}</span>
          </div>
          {record.enderecoCompleto && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
              {record.enderecoCompleto}
            </p>
          )}
        </td>

        {/* Processo Vinculado */}
        <td className="px-3 py-3 align-top whitespace-nowrap">
          {record.processoVinculado ? (
            <span className="inline-block font-mono text-[11px] font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {record.processoVinculado}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Sem SEI vinculado</span>
          )}
          {record.ultimoNumeroAto && (
            <div className="text-[11px] text-slate-500 font-mono mt-1">
              Doc: {record.ultimoNumeroAto}
            </div>
          )}
        </td>

        {/* Status */}
        <td className="px-3 py-3 align-top whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${badge.bg}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{record.status}</span>
          </span>
          {record.fiscalResponsavel && (
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate max-w-[180px]">
              <UserCheck className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{record.fiscalResponsavel}</span>
            </div>
          )}
        </td>

        {/* Expedição / Último Ato */}
        <td className="px-3 py-3 align-top whitespace-nowrap text-xs">
          <div className="font-mono font-semibold text-slate-800">
            {record.dataExpedicao && record.dataExpedicao !== '00/00/0000'
              ? record.dataExpedicao
              : '00/00/0000'}
          </div>
          {lastAto && lastAto.data && lastAto.data !== record.dataExpedicao && (
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Último: {lastAto.data}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-0.5">
            {record.historicoAtos?.length || 0} ato(s)
          </div>
        </td>

        {/* Ações */}
        <td
          className="px-3 py-3 align-top whitespace-nowrap text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="inline-flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onPrintSingle(record)}
              title="Imprimir ficha de fiscalização"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(record)}
              title="Editar notificação / adicionar ato"
              className="p-1.5 rounded-lg text-sky-700 hover:text-sky-900 hover:bg-sky-50 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(record)}
              title="Excluir registro de fiscalização"
              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-50/85 border-b border-slate-200">
          <td colSpan={7} className="px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Redação Completa + Dados Cadastrais */}
              <div className="lg:col-span-7 space-y-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-red-700" />
                      Redação da Notificação / Despacho
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      ID: {record.id}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {record.redacao || 'Nenhuma redação registrada.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="font-semibold text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Identificação e Endereço
                    </div>
                    <p className="font-bold text-slate-900">{record.edificacao}</p>
                    {record.documentoCpfCnpj && (
                      <p className="font-mono text-slate-600">
                        CNPJ/CPF: {record.documentoCpfCnpj}
                      </p>
                    )}
                    <p className="text-slate-600">
                      {record.enderecoCompleto || 'Endereço não informado'}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1">
                    <div className="font-semibold text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      Vistoriante / Vinculação
                    </div>
                    <p className="text-slate-800 font-semibold">
                      {record.fiscalResponsavel || 'Fiscal não especificado na base'}
                    </p>
                    {record.rgFiscal && (
                      <p className="font-mono text-slate-600">RG: {record.rgFiscal}</p>
                    )}
                    <p className="font-mono text-slate-700">
                      Processo: {record.processoVinculado || '—'}
                    </p>
                    {record.observacoes && (
                      <p className="text-slate-600 pt-1 border-t border-slate-100">
                        Obs: {record.observacoes}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Linha do Tempo de Atos & Ações Rápidas */}
              <div className="lg:col-span-5 space-y-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-600" />
                      Histórico Cronológico de Atos
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {record.historicoAtos?.length || 0} registro(s)
                    </span>
                  </div>

                  {record.historicoAtos && record.historicoAtos.length > 0 ? (
                    <ol className="space-y-2">
                      {record.historicoAtos.map((ato, idx) => (
                        <li
                          key={ato.id || idx}
                          className="flex items-start gap-2.5 text-xs bg-slate-50 border border-slate-200/80 rounded-lg p-2.5"
                        >
                          <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900">
                                {ato.data || '00/00/0000'}
                              </span>
                              <span
                                className={`font-semibold border px-1.5 py-0.5 rounded text-[11px] ${getAtoBadgeClass(ato.tipoAto)}`}
                              >
                                {ato.tipoAto}
                              </span>
                              {ato.numeroAto && (
                                <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-slate-700">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  {ato.numeroAto}
                                </span>
                              )}
                              {ato.orgao && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                  {ato.orgao}
                                </span>
                              )}
                            </div>
                            {ato.observacao && (
                              <p className="text-[11px] text-slate-600 leading-snug">
                                {ato.observacao}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      {record.historicoTexto || 'Sem histórico de atos detalhado.'}
                    </p>
                  )}

                  {onQuickStatusChange && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <p className="text-[11px] font-semibold text-slate-500">
                        Alteração Rápida de Situação:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {!isClosed && record.status === 'Notificação' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleQuickStatus('1º Auto de Infração')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                          >
                            Lavrar 1º Auto
                          </button>
                        )}
                        {!isClosed && record.status === '1º Auto de Infração' && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleQuickStatus('2º Auto de Infração')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 cursor-pointer"
                          >
                            Lavrar 2º Auto
                          </button>
                        )}
                        {!isClosed && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleQuickStatus('Encerrado')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                          >
                            Marcar Encerrado
                          </button>
                        )}
                        {isClosed && (
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={() => handleQuickStatus('Notificação')}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                          >
                            Reabrir como Notificação
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};
