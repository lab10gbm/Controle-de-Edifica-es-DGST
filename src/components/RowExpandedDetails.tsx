import React, { useState } from 'react';
import { 
  BuildingNotification, 
  AuditLog,
  BilheteItem
} from '../types';
import { 
  formatDateBR, 
  formatProcesso,
  formatProcessoNumeroAno,
  formatCpfCnpj,
  isExpired, 
  getDaysRemaining,
  calcularPrazoProcesso 
} from '../utils/helpers';
import { cleanProcessLinkValue, ProcessLinkInfo } from '../utils/processLinks';
import { 
  User, 
  Clock, 
  AlertCircle, 
  Plus,
  PlusCircle,
  MinusCircle,
  History, 
  Printer, 
  Edit3, 
  FolderOpen, 
  CheckCircle2, 
  FileCheck2, 
  Timer, 
  Hash, 
  Copy,
  Check,
  Calendar,
  FileSignature,
  FileText,
  Tag,
  Layers,
  ChevronRight,
  Send,
  Link2,
  ArrowRight,
  CornerDownRight,
  Trash2,
  AlertTriangle,
  X,
  Loader2
} from 'lucide-react';

interface RowExpandedDetailsProps {
  notification: BuildingNotification;
  onEdit: (notification: BuildingNotification) => void;
  onAddQuickNote: (id: string, noteText: string, author: string) => void;
  onPrintSingle: (notification: BuildingNotification) => void;
  onUpdateNotification?: (notification: BuildingNotification) => void;
  linkInfo?: ProcessLinkInfo;
  onNavigateToProcess?: (target: BuildingNotification) => void;
}

export const RowExpandedDetails: React.FC<RowExpandedDetailsProps> = ({
  notification,
  onEdit,
  onAddQuickNote,
  onPrintSingle,
  onUpdateNotification,
  linkInfo,
  onNavigateToProcess,
}) => {
  const [activeTab, setActiveTab] = useState<'requerente' | 'tramite' | 'documentos' | 'historico'>('requerente');
  const [newNote, setNewNote] = useState('');
  const [authorName, setAuthorName] = useState('Fiscal SST 10º GBM');
  const [isQuickNoteExpanded, setIsQuickNoteExpanded] = useState(false);
  const [deletingLogTarget, setDeletingLogTarget] = useState<{ log: AuditLog; index: number } | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // States para cadastro de novo bilhete (presente e futuro)
  const [isAddingBilhete, setIsAddingBilhete] = useState(false);
  const [novoDetalheTipo, setNovoDetalheTipo] = useState<'BILHETE' | 'RETORNO'>('BILHETE');
  const [novoBilheteData, setNovoBilheteData] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [novoBilheteDias, setNovoBilheteDias] = useState<string>('0');
  const [novoBilheteStatus, setNovoBilheteStatus] = useState<string>('EM ANÁLISE');
  const [novoBilheteAutor, setNovoBilheteAutor] = useState<string>(
    () => notification.fiscalResponsavel?.trim() || 'Fiscal SST 10º GBM'
  );
  const [novoBilheteDespacho, setNovoBilheteDespacho] = useState<string>('');

  const sst = notification.detalhesSST || {};
  const prazoInfo = calcularPrazoProcesso(notification);

  // Formatações precisas dos bilhetes
  const dataBilheteFmt = formatDateBR(sst.dataBilhete || sst.bilhetes);
  const ultimoBilheteFmt = formatDateBR(sst.ultimoBilhete);
  const diasBilheteVal = sst.diasBilhetes !== undefined && sst.diasBilhetes !== '' ? sst.diasBilhetes : (sst.diasBilhete ?? 0);
  const diasUltimoBilheteVal = sst.diasUltimoBilhete !== undefined && sst.diasUltimoBilhete !== '' ? sst.diasUltimoBilhete : 0;
  const outrosBilhetesVal = sst.outrosBilhetes || '';

  // Lista estruturada de bilhetes: prioriza sst.listaBilhetes ou deriva do 1º e último bilhete
  const rawLista: BilheteItem[] = (sst.listaBilhetes && sst.listaBilhetes.length > 0)
    ? sst.listaBilhetes
    : [
        ...(dataBilheteFmt !== '-' ? [{
          id: `b-1-${notification.id}`,
          ordem: 1,
          tipo: 'primeiro' as const,
          tipoDetalhe: 'BILHETE' as const,
          rotulo: '1º Bilhete',
          data: dataBilheteFmt,
          dias: diasBilheteVal,
          statusOuParecer: 'BILHETE 1',
          despacho: `Primeiro bilhete lançado com ${diasBilheteVal} dia(s) decorridos.`,
          autor: 'Fiscal SST 10º GBM'
        }] : []),
        ...(ultimoBilheteFmt !== '-' ? [{
          id: `b-ultimo-${notification.id}`,
          ordem: 2,
          tipo: 'ultimo' as const,
          tipoDetalhe: 'RETORNO' as const,
          rotulo: 'Último Bilhete',
          data: ultimoBilheteFmt,
          dias: diasUltimoBilheteVal,
          statusOuParecer: outrosBilhetesVal || 'Último Bilhete',
          despacho: outrosBilhetesVal ? `Parecer: ${outrosBilhetesVal}` : `Último bilhete registrado com ${diasUltimoBilheteVal} dia(s) decorridos.`,
          autor: 'Fiscal SST 10º GBM'
        }] : [])
      ];

  // Garante que o 1º Bilhete (ordem 1 / tipo primeiro) tenha sempre a situação própria (BILHETE 1)
  // e não copie erroneamente a situação da coluna OUTROS BILHETES (ex: BILHETE 3, RETORNO, GERADO DI)
  const listaBilhetes: BilheteItem[] = rawLista.map((b, idx) => {
    if (idx === 0 || b.tipo === 'primeiro' || b.ordem === 1) {
      const isCopiadoErrado = b.statusOuParecer && b.statusOuParecer === outrosBilhetesVal && outrosBilhetesVal.toUpperCase() !== 'BILHETE 1';
      const statusPrimeiro = (!b.statusOuParecer || isCopiadoErrado) ? 'BILHETE 1' : b.statusOuParecer;
      return {
        ...b,
        rotulo: b.rotulo || '1º Bilhete',
        statusOuParecer: statusPrimeiro,
        despacho: (b.despacho && !b.despacho.includes(outrosBilhetesVal))
          ? b.despacho
          : `Primeiro bilhete lançado com ${b.dias || 0} dia(s) decorridos.`
      };
    }
    if ((idx === rawLista.length - 1 || b.tipo === 'ultimo') && (!b.statusOuParecer || b.statusOuParecer === 'Concluído')) {
      return {
        ...b,
        rotulo: b.rotulo || 'Último Bilhete',
        statusOuParecer: outrosBilhetesVal || b.statusOuParecer || 'Último Bilhete',
        despacho: outrosBilhetesVal ? `Parecer: ${outrosBilhetesVal}` : b.despacho
      };
    }
    return b;
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddQuickNote(notification.id, newNote.trim(), authorName.trim() || 'Fiscal SST 10º GBM');
    setNewNote('');
  };

  const handleConfirmDeleteLog = async () => {
    if (!deletingLogTarget || !onUpdateNotification || isDeletingLog) return;
    setIsDeletingLog(true);
    try {
      const currentLogs = notification.historico || [];
      const nextHistorico = currentLogs.filter(
        (item, idx) => !(idx === deletingLogTarget.index && item.id === deletingLogTarget.log.id)
      );
      await onUpdateNotification({
        ...notification,
        historico: nextHistorico,
        atualizadoEm: new Date().toISOString(),
      });
      setDeletingLogTarget(null);
    } finally {
      setIsDeletingLog(false);
    }
  };

  const handleSaveNovoBilhete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBilheteData.trim()) return;

    const dataFormatada = formatDateBR(novoBilheteData.trim());
    const proximoNumero = listaBilhetes.length + 1;
    const detalheRotulo = novoDetalheTipo === 'RETORNO' ? `Retorno ${proximoNumero}B` : `Bilhete ${proximoNumero}`;
    const autorRegistro = novoBilheteAutor.trim() || 'Fiscal SST 10º GBM';

    const novoItem: BilheteItem = {
      id: `b-manual-${Date.now()}`,
      ordem: proximoNumero,
      tipo: novoDetalheTipo === 'RETORNO' ? 'ultimo' : 'intermediario',
      tipoDetalhe: novoDetalheTipo,
      rotulo: detalheRotulo,
      data: dataFormatada,
      dias: novoBilheteDias.trim() || '0',
      statusOuParecer: novoBilheteStatus.trim() || 'Registrado',
      despacho: novoBilheteDespacho.trim() || `Bilhete registrado por ${autorRegistro}.`,
      autor: autorRegistro,
    };

    const novaLista = [...listaBilhetes, novoItem];

    const updatedSST = {
      ...sst,
      listaBilhetes: novaLista,
      ...(novoDetalheTipo === 'RETORNO' ? {
        ultimoBilhete: dataFormatada,
        diasUltimoBilhete: novoBilheteDias.trim() || '0',
      } : {}),
      outrosBilhetes: novoBilheteStatus.trim() || sst.outrosBilhetes,
    };

    const newLog: AuditLog = {
      id: `log-b-${Date.now()}`,
      data: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      autor: autorRegistro,
      acao: novoDetalheTipo === 'RETORNO' ? 'Atualização de Retorno' : 'Registro de Bilhete',
      detalhes: `${novoDetalheTipo === 'RETORNO' ? 'Retorno' : 'Bilhete'} registrado em ${dataFormatada} (${novoBilheteDias} dias decorridos). Situação: ${novoBilheteStatus}. ${novoBilheteDespacho ? `Despacho: ${novoBilheteDespacho}` : ''}`,
    };

    if (onUpdateNotification) {
      onUpdateNotification({
        ...notification,
        detalhesSST: updatedSST,
        historico: [newLog, ...(notification.historico || [])],
        atualizadoEm: new Date().toISOString(),
      });
    } else {
      onAddQuickNote(
        notification.id,
        `${novoDetalheTipo === 'RETORNO' ? 'Retorno' : 'Bilhete'} registrado (${dataFormatada}, ${novoBilheteDias} dias decorridos): ${novoBilheteStatus}. ${novoBilheteDespacho}`,
        autorRegistro
      );
    }

    setIsAddingBilhete(false);
    setNovoBilheteDespacho('');
  };

  return (
    <div className="bg-slate-50/95 border-t border-b border-blue-200/70 p-4 sm:p-6 text-slate-800 transition-all">
      {/* Top Details Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-blue-900 text-white rounded shadow-2xs">
              PROCESSO Nº {formatProcesso(notification.processo !== undefined ? notification.processo : notification.numero, { codigo: notification.detalhesSST?.codigo, ano: notification.anoExercicio })}
            </span>
            <span className="text-xs text-slate-700 font-medium">
              {notification.tipoProcesso || notification.tipoDocumento} – <strong className="text-slate-900">{notification.origem || notification.obm}</strong>
            </span>
          </div>

          {sst.localizacao && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded shadow-2xs">
              <FolderOpen className="w-3.5 h-3.5 text-purple-700" />
              <span>LOCALIZAÇÃO: {sst.localizacao}</span>
            </span>
          )}

          {/* Badge de Prazos */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {prazoInfo.hasDataPronto ? (
              prazoInfo.concluidoNoPrazo ? (
                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Pronto no Prazo Legal · Data do Pronto: {prazoInfo.dataProntoBR} (Limite: {prazoInfo.dataLimiteBR})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded font-bold border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Pronto com Atraso ({prazoInfo.diasEmAtraso}d após prazo limite) · Data do Pronto: {prazoInfo.dataProntoBR}
                </span>
              )
            ) : prazoInfo.isConcluido ? (
              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Concluído / Entregue (Prazo: {prazoInfo.diasPrazo} dias)
              </span>
            ) : prazoInfo.isVencido ? (
              <span
                className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded font-bold border border-rose-200"
                title={`Entrada na SST: ${prazoInfo.dataEntradaBR} + ${prazoInfo.diasPrazo} dias = Limite: ${prazoInfo.dataLimiteBR}`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Prazo Vencido ({prazoInfo.diasEmAtraso} dia(s) em atraso) · Limite: {prazoInfo.dataLimiteBR}
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded font-medium border border-blue-200"
                title={`Entrada na SST: ${prazoInfo.dataEntradaBR} + ${prazoInfo.diasPrazo} dias = Limite: ${prazoInfo.dataLimiteBR}`}
              >
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                No Prazo ({prazoInfo.diasRestantes} dias restantes) · Limite: {prazoInfo.dataLimiteBR} ({prazoInfo.diasPrazo} dias)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Internal Tab Controls */}
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('requerente')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'requerente'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Requerente</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tramite')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'tramite'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trâmite & Cronologia
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documentos')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'documentos'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Documentos & Vínculos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-3 py-1 font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'historico'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Bilhetes & Pareceres</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'historico' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-800'
              }`}>
                {listaBilhetes.length > 0 ? listaBilhetes.length : notification.historico.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onPrintSingle(notification)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors shadow-2xs cursor-pointer"
            title="Imprimir espelho oficial do processo"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Imprimir</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(notification)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
            title="Editar processo"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* Cadeia Visual de Continuidade entre Processos */}
      {linkInfo?.hasAnyLink && (
        <div className="mt-3 p-3 bg-white rounded-xl border border-blue-200/80 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Link2 className="w-3.5 h-3.5 text-blue-700" />
              <span>Cadeia de Continuidade do Processo</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Clique em qualquer processo vinculado para navegar diretamente até ele
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(() => {
              const root = linkInfo.chain[0];
              const rootAnt = cleanProcessLinkValue(root?.detalhesSST?.processoAntigo);
              const rootDocAnt = cleanProcessLinkValue(root?.detalhesSST?.numDocAntigo);
              const showRootExternal =
                linkInfo.chain.length > 0 &&
                rootAnt &&
                linkInfo.chain.length === 1 &&
                linkInfo.externalPrevRef;
              const externalToRender = showRootExternal
                ? linkInfo.externalPrevRef
                : linkInfo.prevLinks.length === 0 && linkInfo.externalPrevRef
                ? linkInfo.externalPrevRef
                : rootAnt && !linkInfo.chain.some((c) => {
                    const numStr = String(c.numero);
                    return rootAnt.startsWith(numStr);
                  })
                ? { processo: rootAnt, doc: rootDocAnt || undefined }
                : null;

              if (!externalToRender) return null;
              return (
                <>
                  <div className="px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-slate-600 flex flex-col">
                    <span className="text-[10px] font-semibold uppercase text-slate-400">Histórico Anterior</span>
                    <span className="font-mono font-bold text-slate-700">
                      {externalToRender.processo}
                      {externalToRender.doc ? ` · ${externalToRender.doc}` : ''}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </>
              );
            })()}

            {linkInfo.chain.map((step, idx) => {
              const isCurrent = step.id === notification.id;
              const stepNumAno = formatProcessoNumeroAno(
                step.processo !== undefined ? step.processo : step.numero,
                { ano: step.anoExercicio, dataRef: step.dataEntrada || step.dataExpedicao }
              );
              const stepStatus = cleanProcessLinkValue(step.detalhesSST?.situacao || step.status) || 'EM ANÁLISE';
              const stepDoc = cleanProcessLinkValue(step.detalhesSST?.docGerado);
              const stepLoc = cleanProcessLinkValue(step.detalhesSST?.localizacao);

              return (
                <React.Fragment key={step.id}>
                  {idx > 0 && <ArrowRight className="w-4 h-4 text-blue-500 shrink-0" />}
                  {isCurrent ? (
                    <div className="px-3 py-1.5 rounded-lg border border-blue-900 bg-blue-900 text-white shadow-xs flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                          Atual
                        </span>
                        <span className="font-mono font-bold">{stepNumAno}</span>
                      </div>
                      <span className="text-[10.5px] text-blue-100 mt-0.5">
                        {stepStatus}
                        {stepDoc ? ` · ${stepDoc}` : ''}
                        {stepLoc ? ` · ${stepLoc}` : ''}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateToProcess?.(step)}
                      title={`Abrir processo ${stepNumAno} — ${step.requerente || step.edificacao}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-400 text-slate-800 hover:text-blue-950 transition-colors text-left cursor-pointer flex flex-col"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue-800">{stepNumAno}</span>
                        {stepDoc && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700">
                            {stepDoc}
                          </span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-slate-600 mt-0.5">
                        {stepStatus}
                        {stepLoc ? ` · ${stepLoc}` : ''}
                      </span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}

            {linkInfo.nextLinks.length === 0 && linkInfo.externalNextRef && (
              <>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="px-2.5 py-1.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/40 text-blue-800 flex flex-col">
                  <span className="text-[10px] font-semibold uppercase text-blue-600">Próximo Indicado</span>
                  <span className="font-mono font-bold">{linkInfo.externalNextRef}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Tab Content Panel */}
      <div className="pt-4">
        {activeTab === 'requerente' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Requerente & Identificação */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>Identificação do Requerente</span>
                </h4>
                <span className="font-mono text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">
                  Nº {formatProcesso(notification.processo !== undefined ? notification.processo : notification.numero, { codigo: notification.detalhesSST?.codigo, ano: notification.anoExercicio })}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Nome / Razão Social:</span>
                <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                  {notification.requerente || notification.edificacao}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">CPF / CNPJ do Requerente:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-slate-900 font-bold text-xs">
                    {formatCpfCnpj(notification.requerenteCpfCnpj || notification.proprietario?.cpfOuCnpj) || 'Não informado'}
                  </span>
                  {(notification.requerenteCpfCnpj || notification.proprietario?.cpfOuCnpj) && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(notification.requerenteCpfCnpj || notification.proprietario.cpfOuCnpj, 'cpf-req')}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer inline-flex items-center"
                      title="Copiar CPF/CNPJ"
                    >
                      {copiedField === 'cpf-req' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Origem / Município:</span>
                <strong className="text-xs font-semibold text-slate-900 block mt-0.5">
                  {notification.origem || notification.obm || 'Não informado'}
                </strong>
              </div>

              {(notification.proprietario?.nomeOuRazaoSocial ||
                notification.proprietario?.cpfOuCnpj ||
                notification.proprietario?.telefone ||
                notification.proprietario?.email) && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-purple-800 block text-[10px] font-bold uppercase tracking-wider">
                    {notification.proprietario?.tipoVinculo || 'Proprietário / Responsável Legal'}
                  </span>
                  {notification.proprietario?.nomeOuRazaoSocial && (
                    <div className="text-slate-900 font-semibold text-xs">
                      {notification.proprietario.nomeOuRazaoSocial}
                    </div>
                  )}
                  {notification.proprietario?.cpfOuCnpj && (
                    <div className="font-mono text-[11px] text-slate-600">
                      Doc: {formatCpfCnpj(notification.proprietario.cpfOuCnpj)}
                    </div>
                  )}
                  {(notification.proprietario?.telefone || notification.proprietario?.email) && (
                    <div className="text-slate-700 font-medium text-[11px]">
                      {[notification.proprietario?.telefone, notification.proprietario?.email].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              )}

              {(notification.proprietario?.sindicoNome ||
                notification.proprietario?.sindicoCpf ||
                notification.proprietario?.sindicoTelefone) && (
                <div className="pt-2 border-t border-slate-100 space-y-0.5">
                  <span className="text-indigo-800 block text-[10px] font-bold uppercase tracking-wider">
                    Síndico / Representante
                  </span>
                  {notification.proprietario?.sindicoNome && (
                    <div className="text-slate-900 font-semibold text-xs">
                      {notification.proprietario.sindicoNome}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
                    {notification.proprietario?.sindicoCpf && (
                      <span className="font-mono">CPF: {formatCpfCnpj(notification.proprietario.sindicoCpf)}</span>
                    )}
                    {notification.proprietario?.sindicoTelefone && (
                      <span>Tel: {notification.proprietario.sindicoTelefone}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Endereço & Localização */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-emerald-600" />
                  <span>Endereço do Imóvel</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onEdit(notification)}
                  className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Editar
                </button>
              </div>

              {notification.endereco?.logradouro ? (
                <>
                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Logradouro / Número:</span>
                    <strong className="text-xs font-bold text-slate-900 block mt-0.5">
                      {notification.endereco.logradouro}{notification.endereco.numero ? `, ${notification.endereco.numero}` : ''}
                      {notification.endereco.complemento ? ` (${notification.endereco.complemento})` : ''}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px] font-medium">Bairro / Município:</span>
                    <span className="text-slate-800 font-medium block mt-0.5">
                      {notification.endereco.bairro ? `${notification.endereco.bairro} - ` : ''}{notification.endereco.municipio || notification.origem || 'RJ'}
                    </span>
                  </div>

                  {notification.endereco.cep && (
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">CEP:</span>
                      <span className="text-slate-800 font-mono">{notification.endereco.cep}</span>
                    </div>
                  )}

                  {notification.endereco.pontoReferencia && (
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Referência:</span>
                      <span className="text-slate-700 italic">{notification.endereco.pontoReferencia}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-4 text-center text-slate-400 space-y-2">
                  <p className="italic">Nenhum endereço cadastrado para este processo.</p>
                  <button
                    type="button"
                    onClick={() => onEdit(notification)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Endereço</span>
                  </button>
                </div>
              )}
            </div>

            {/* Card 3: Fiscalização & Processo Administrativo */}
            <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Fiscalização & Processo Adm.</span>
                </h4>
                <button
                  type="button"
                  onClick={() => onEdit(notification)}
                  className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                >
                  Editar
                </button>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Fiscal Responsável:</span>
                <strong className="text-xs font-semibold text-slate-900 block mt-0.5">
                  {notification.fiscalResponsavel || 'Não informado'}
                </strong>
                {notification.matriculaFiscal && (
                  <span className="text-[11px] text-slate-500 font-mono block">Matrícula: {notification.matriculaFiscal}</span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Proc. Administrativo CBMERJ:</span>
                <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                  {notification.processoAdministrativo || 'Não informado'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] font-medium">Exigências Registradas:</span>
                {notification.exigencias && notification.exigencias.length > 0 ? (
                  <ul className="mt-1 space-y-1 list-disc list-inside text-slate-700">
                    {notification.exigencias.map((ex, idx) => (
                      <li key={idx} className="truncate" title={ex}>{ex}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic block mt-0.5">Nenhuma exigência cadastrada</span>
                )}
              </div>

              {notification.observacoes && (
                <div className="pt-1.5 border-t border-slate-100">
                  <span className="text-slate-500 block text-[11px] font-medium">Observações:</span>
                  <p className="text-slate-700 italic mt-0.5 line-clamp-2">{notification.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tramite' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50/30 shadow-2xs">
                <span className="text-[11px] font-semibold text-blue-900 block uppercase">Prazo do Tipo</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-xl font-bold font-mono text-blue-700">{prazoInfo.diasPrazo}</span>
                  <span className="text-xs text-slate-500">dias ({notification.tipoProcesso || 'Processo'})</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Entrada na SST</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-sm font-bold font-mono text-slate-900">{prazoInfo.dataEntradaBR}</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">{prazoInfo.diasNaSST} dia(s) decorridos</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Prazo Limite</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-sm font-bold font-mono text-indigo-900">{prazoInfo.dataLimiteBR}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Entrada + {prazoInfo.diasPrazo} dias</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block uppercase">Situação do Prazo</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  {prazoInfo.hasDataPronto ? (
                    prazoInfo.concluidoNoPrazo ? (
                      <span className="text-sm font-bold text-emerald-700">Pronto no Prazo</span>
                    ) : (
                      <span className="text-sm font-bold font-mono text-amber-800">
                        Pronto ({prazoInfo.diasEmAtraso}d atraso)
                      </span>
                    )
                  ) : prazoInfo.isConcluido ? (
                    <span className="text-base font-bold text-emerald-700">Concluído</span>
                  ) : prazoInfo.isVencido ? (
                    <span className="text-base font-bold font-mono text-rose-700">
                      {prazoInfo.diasEmAtraso}d em atraso
                    </span>
                  ) : (
                    <span className="text-base font-bold font-mono text-blue-700">
                      {prazoInfo.diasRestantes}d restantes
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {prazoInfo.hasDataPronto
                    ? `Contagem parada em ${prazoInfo.dataProntoBR}`
                    : prazoInfo.isConcluido
                    ? 'Finalizado'
                    : prazoInfo.isVencido
                    ? 'Vencido em andamento'
                    : 'No prazo legal'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-purple-200 bg-purple-50/40 shadow-2xs">
                <span className="text-[11px] font-semibold text-purple-700 block uppercase">Localização / Pasta</span>
                <span className="text-xs font-bold text-purple-900 block mt-1 truncate">
                  {sst.localizacao || 'PROTOCOLO'}
                </span>
                <span className="text-[10px] text-purple-600 block mt-0.5">Controle do acervo</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Timer className="w-4 h-4 text-blue-600" />
                <span>Rastreio Cronológico de Tramitação (Dados SST & OBM)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>1. Recepção & Entrada</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Entrada na SST:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatDateBR(sst.entradaSST || notification.dataEntrada || notification.dataExpedicao)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Entrada na OBM:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatDateBR(sst.entradaOBM || notification.dataEntrada || notification.dataExpedicao)}</strong>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex justify-between">
                    <span>Dias de Recepção:</span>
                    <strong className="text-slate-800 font-mono">{sst.diasEntrada ?? 0} dia(s)</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    <span>2. Despacho Divisão / Diretor</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Envio ao Dir. Divisão:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatDateBR(sst.envioDirDivisao || sst.entradaSST || notification.dataEntrada)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Ao Diretor:</span>
                    <strong className="text-slate-900">{sst.aoDiretor || '-'}</strong>
                    {sst.dataAoDiretor && sst.dataAoDiretor !== sst.aoDiretor && (
                      <span className="text-[11px] text-slate-500 font-mono ml-1">({formatDateBR(sst.dataAoDiretor)})</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex justify-between">
                    <span>Dias no Despacho:</span>
                    <strong className="text-slate-800 font-mono">{sst.diasEnvioDivisao ?? sst.diasAoDiretor ?? 0} dia(s)</strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>3. Prazos & Conclusão Técnica</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Previsão para o Pronto:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatDateBR(sst.previsaoPronto)}</strong>
                    {sst.diasPrevisao !== undefined && (
                      <span className="text-[11px] text-slate-500 ml-1">({sst.diasPrevisao} dias)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data do Pronto (Fim da contagem):</span>
                    <strong className="text-slate-900 font-mono text-xs">
                      {formatDateBR(sst.dataPronto)}
                    </strong>
                    {prazoInfo.hasDataPronto && (
                      <span className={`text-[10.5px] ml-1 font-semibold ${prazoInfo.concluidoNoPrazo ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {prazoInfo.concluidoNoPrazo ? '(no prazo)' : `(${prazoInfo.diasEmAtraso}d atraso)`}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex justify-between">
                    <span>Situação Técnica:</span>
                    <strong className={`font-semibold ${String(sst.situacao || notification.status).includes('INDEFERID') ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {sst.situacao || notification.status}
                    </strong>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>4. Entrega ao Requerente</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Doc. Gerado:</span>
                    <strong className="text-blue-900 font-mono text-xs">{sst.docGerado || '-'}</strong>
                    {sst.situacaoDocGerado && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1 py-0.2 ml-1 rounded font-bold border border-emerald-200">
                        {sst.situacaoDocGerado}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data de Entrega:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatDateBR(sst.dataEntregue)}</strong>
                    {sst.diasEntrega !== undefined && (
                      <span className="text-[11px] text-slate-500 ml-1">({sst.diasEntrega} dias)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span>Processo Seguinte:</span>
                    {linkInfo && linkInfo.nextLinks.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {linkInfo.nextLinks.map((nx) => {
                          const numAno = formatProcessoNumeroAno(nx.processo ?? nx.numero, {
                            ano: nx.anoExercicio,
                            dataRef: nx.dataEntrada || nx.dataExpedicao,
                          });
                          return (
                            <button
                              key={nx.id}
                              type="button"
                              onClick={() => onNavigateToProcess?.(nx)}
                              className="inline-flex items-center gap-1 font-mono font-bold text-blue-800 hover:text-blue-950 underline cursor-pointer"
                            >
                              <span>{numAno}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <strong className="text-blue-800 font-mono">
                        {cleanProcessLinkValue(sst.processoSeguinte) || '-'}
                      </strong>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documentos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-blue-600" />
                <span>Documentos Gerados</span>
              </h4>
              <div>
                <span className="text-slate-500 block">Doc. Gerado:</span>
                <strong className="text-sm font-mono text-blue-900 block mt-0.5">
                  {sst.docGerado && sst.docGerado !== '- - - -' && sst.docGerado !== '-' ? sst.docGerado : 'Não informado'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Situação do Documento:</span>
                <span className="inline-block mt-0.5 font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  {sst.situacaoDocGerado || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Gráfico / Identificador:</span>
                <span className="font-mono text-slate-800 font-semibold">{sst.grafico || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Código Interno SST:</span>
                <span className="font-mono text-slate-800 font-semibold">{sst.codigo || '-'}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-purple-600" />
                <span>Histórico de Numeração</span>
              </h4>
              <div>
                <span className="text-slate-500 block">Processo Antigo:</span>
                {linkInfo && linkInfo.prevLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {linkInfo.prevLinks.map((pv) => {
                      const numAno = formatProcessoNumeroAno(pv.processo ?? pv.numero, {
                        ano: pv.anoExercicio,
                        dataRef: pv.dataEntrada || pv.dataExpedicao,
                      });
                      return (
                        <button
                          key={pv.id}
                          type="button"
                          onClick={() => onNavigateToProcess?.(pv)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 font-mono font-bold text-slate-900 hover:text-blue-900 cursor-pointer transition-colors"
                        >
                          <CornerDownRight className="w-3 h-3 text-slate-500" />
                          <span>{numAno}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="font-mono text-slate-800 font-medium">
                    {cleanProcessLinkValue(sst.processoAntigo) || '-'}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Nº do Doc. Antigo:</span>
                <span className="font-mono text-slate-800 font-medium">
                  {cleanProcessLinkValue(sst.numDocAntigo) || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Processo Seguinte:</span>
                {linkInfo && linkInfo.nextLinks.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {linkInfo.nextLinks.map((nx) => {
                      const numAno = formatProcessoNumeroAno(nx.processo ?? nx.numero, {
                        ano: nx.anoExercicio,
                        dataRef: nx.dataEntrada || nx.dataExpedicao,
                      });
                      return (
                        <button
                          key={nx.id}
                          type="button"
                          onClick={() => onNavigateToProcess?.(nx)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-400 font-mono font-bold text-blue-900 cursor-pointer transition-colors"
                        >
                          <span>{numAno}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span className="font-mono text-blue-900 font-bold">
                    {cleanProcessLinkValue(sst.processoSeguinte) || '-'}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Data Base / Referência:</span>
                <span className="font-mono text-slate-800 font-semibold">{sst.dataBase || '-'}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider border-b pb-1.5 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <span>Armazenamento & Pasta</span>
              </h4>
              <div>
                <span className="text-slate-500 block">Localização no Acervo:</span>
                <span className="font-bold text-purple-900 block mt-0.5">{sst.localizacao || 'Não informado'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Proc. Administrativo CBMERJ:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {notification.processoAdministrativo || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Fiscal Responsável:</span>
                <span className="text-slate-800 font-medium">{notification.fiscalResponsavel || 'Não informado'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-blue-100 mb-2">
                  <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-700" />
                    <span>1º Bilhete (Data do Bilhete)</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Inicial
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data de Registro:</span>
                    <strong className="text-base font-bold font-mono text-slate-900">
                      {dataBilheteFmt !== '-' ? dataBilheteFmt : 'Não informado'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Dias Decorridos:</span>
                    <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                      {diasBilheteVal} dia(s)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Origem: Planilha SST (Coluna 15)</span>
                  <span className="font-semibold text-blue-700">Entrada na Análise</span>
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100 mb-2">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Data do Último Bilhete</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Último
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data de Registro:</span>
                    <strong className="text-base font-bold font-mono text-slate-900">
                      {ultimoBilheteFmt !== '-' ? ultimoBilheteFmt : 'Não informado'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[11px]">Dias Decorridos:</span>
                    <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded border border-indigo-200">
                      {diasUltimoBilheteVal} dia(s)
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Origem: Planilha SST (Coluna 18)</span>
                  <span className="font-semibold text-indigo-700">Despacho Mais Recente</span>
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-purple-100 mb-2">
                  <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-purple-700" />
                    <span>Outros Bilhetes / Pareceres</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                    Intermediários
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-500 block text-[11px]">Parecer / Despacho:</span>
                  <strong className="text-sm font-bold text-purple-900 block truncate" title={outrosBilhetesVal || 'Nenhum'}>
                    {outrosBilhetesVal || 'Nenhum parecer registrado'}
                  </strong>
                </div>
                <p className="text-[11px] text-slate-500 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                  <span>Total de Bilhetes: <strong className="text-slate-800">{listaBilhetes.length}</strong></span>
                  <span className="font-semibold text-purple-700">Pronto p/ N Bilhetes</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Controle & Relação de Bilhetes do Processo</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Histórico sequencial dos bilhetes e despachos emitidos pela Seção de Serviços Técnicos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingBilhete((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingBilhete ? 'Fechar Formulário' : '+ Adicionar Novo Bilhete'}</span>
                </button>
              </div>

              {isAddingBilhete && (
                <form onSubmit={handleSaveNovoBilhete} className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                      <span>Cadastrar Novo Bilhete / Despacho no Processo</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-medium">Permite múltiplos bilhetes intermediários</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tipo de Detalhe</label>
                      <select
                        value={novoDetalheTipo}
                        onChange={(e) => setNovoDetalheTipo(e.target.value as 'BILHETE' | 'RETORNO')}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="BILHETE">Bilhete</option>
                        <option value="RETORNO">Retorno</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Data do Bilhete (DD/MM/AAAA)</label>
                      <input
                        type="text"
                        value={novoBilheteData}
                        onChange={(e) => setNovoBilheteData(e.target.value)}
                        placeholder="Ex: 05/01/2026 ou 05/01"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Dias Decorridos</label>
                      <input
                        type="number"
                        value={novoBilheteDias}
                        onChange={(e) => setNovoBilheteDias(e.target.value)}
                        min={0}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Parecer / Status</label>
                      <input
                        type="text"
                        value={novoBilheteStatus}
                        onChange={(e) => setNovoBilheteStatus(e.target.value)}
                        placeholder="Ex: GERADO DI, FINALIZADO"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Autor do Registro</label>
                      <input
                        type="text"
                        list={`bilhete-autores-${notification.id}`}
                        value={novoBilheteAutor}
                        onChange={(e) => setNovoBilheteAutor(e.target.value)}
                        placeholder="Ex: Fiscal SST 10º GBM"
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        required
                      />
                      <datalist id={`bilhete-autores-${notification.id}`}>
                        {notification.fiscalResponsavel?.trim() && (
                          <option value={notification.fiscalResponsavel.trim()} />
                        )}
                        <option value="Fiscal SST 10º GBM" />
                        <option value="Protocolo SST 10º GBM" />
                        <option value="Diretor de Divisão" />
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Conteúdo do Despacho / Observações Técnicas</label>
                    <textarea
                      rows={2}
                      value={novoBilheteDespacho}
                      onChange={(e) => setNovoBilheteDespacho(e.target.value)}
                      placeholder="Descreva as determinações, cumprimento de exigências ou encaminhamentos deste bilhete..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingBilhete(false)}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Bilhete no Processo</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">#</th>
                      <th className="py-2 px-3 w-48">Identificação do Bilhete</th>
                      <th className="py-2 px-3 w-36">Data do Bilhete</th>
                      <th className="py-2 px-3 w-28 text-center">Dias Decorridos</th>
                      <th className="py-2 px-3 w-40">Parecer / Situação</th>
                      <th className="py-2 px-3">Despacho / Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {listaBilhetes.map((bilhete, bIdx) => (
                      <tr key={bilhete.id || bIdx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-500">
                          {bIdx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              bilhete.tipoDetalhe === 'RETORNO' ? 'bg-indigo-600' : bilhete.tipo === 'ultimo' ? 'bg-indigo-600' : 'bg-purple-600'
                            }`} />
                            <strong className="text-slate-900 font-semibold">
                              {bilhete.rotulo || (bIdx === 0 ? '1º Bilhete (Data do Bilhete)' : 'Último Bilhete')}
                            </strong>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {bilhete.data ? formatDateBR(bilhete.data) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                            {bilhete.dias ?? 0}d
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2.5 py-0.5 rounded border inline-block text-xs font-semibold ${
                            (bilhete.statusOuParecer || '').toUpperCase() === 'BILHETE 1'
                              ? 'text-blue-900 bg-blue-50 border-blue-200 font-bold'
                              : (bilhete.statusOuParecer || '').toUpperCase().startsWith('BILHETE')
                              ? 'text-purple-900 bg-purple-50 border-purple-200 font-bold'
                              : (bilhete.statusOuParecer || '').toUpperCase() === 'GERADO DI'
                              ? 'text-red-900 bg-red-50 border-red-200 font-bold'
                              : (bilhete.statusOuParecer || '').toUpperCase() === 'FINALIZADO'
                              ? 'text-slate-800 bg-slate-100 border-slate-300 font-bold'
                              : (bilhete.statusOuParecer || '').toUpperCase().includes('RETORNO')
                              ? 'text-amber-900 bg-amber-50 border-amber-200 font-bold'
                              : 'text-slate-800 bg-slate-50 border-slate-200'
                          }`}>
                            {bilhete.statusOuParecer || (bIdx === 0 ? 'BILHETE 1' : 'Registrado')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          <div>
                            {bilhete.despacho || (bIdx === 0 ? `Bilhete inicial lançado com ${bilhete.dias || 0} dias.` : `Despacho com ${bilhete.dias || 0} dias.`)}
                          </div>
                          {bilhete.autor && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Autor: <span className="font-semibold text-slate-600">{bilhete.autor}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {listaBilhetes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                          Nenhum bilhete registrado para este processo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-start gap-4">
              <div className="flex-1 w-full min-w-0 bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Linha do Tempo & Histórico de Tramitação</span>
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(notification.historico || []).length} evento(s)
                  </span>
                </div>

                {(notification.historico || []).length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {(notification.historico || []).map((log, idx) => (
                      <div key={`${log.id}-${idx}`} className="relative group">
                        <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          log.acao.includes('Último') ? 'bg-indigo-600' : log.acao.includes('1º') || log.acao.includes('Bilhete') ? 'bg-blue-600' : 'bg-slate-400'
                        }`} />
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                              <span className="font-semibold text-slate-900">{log.acao}</span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500 font-mono text-[11px]">{log.data}</span>
                            </div>
                            <div className="text-slate-600 text-xs mt-0.5">
                              {log.detalhes}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Registrado por: <strong className="text-slate-600">{log.autor}</strong>
                            </div>
                          </div>
                          {onUpdateNotification && (
                            <button
                              type="button"
                              onClick={() => setDeletingLogTarget({ log, index: idx })}
                              title="Excluir registro do histórico"
                              aria-label={`Excluir registro ${log.acao} de ${log.data}`}
                              className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum evento registrado no histórico.</p>
                )}
              </div>

              <div
                className={`bg-white border border-slate-200 self-start shrink-0 transition-all ${
                  isQuickNoteExpanded
                    ? 'w-full lg:w-80 xl:w-96 p-4 rounded-xl'
                    : 'w-auto px-2.5 py-1.5 rounded-lg shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsQuickNoteExpanded((prev) => !prev)}
                  aria-expanded={isQuickNoteExpanded}
                  title={isQuickNoteExpanded ? 'Minimizar anotação rápida' : 'Expandir anotação rápida / despacho'}
                  className={`w-full flex items-center justify-between gap-2 text-left cursor-pointer group ${
                    isQuickNoteExpanded ? 'mb-2 pb-2 border-b border-slate-100' : ''
                  }`}
                >
                  <h4
                    className={`font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 ${
                      isQuickNoteExpanded ? 'text-xs' : 'text-[11px] whitespace-nowrap'
                    }`}
                  >
                    <Send
                      className={`text-emerald-600 shrink-0 ${
                        isQuickNoteExpanded ? 'w-4 h-4' : 'w-3.5 h-3.5'
                      }`}
                    />
                    <span>Anotação Rápida / Despacho</span>
                  </h4>
                  {isQuickNoteExpanded ? (
                    <MinusCircle className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                  ) : (
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-700 shrink-0 transition-colors" />
                  )}
                </button>
                {isQuickNoteExpanded && (
                  <>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Insere uma anotação imediata no histórico do processo.
                    </p>
                    <form onSubmit={handleAddNoteSubmit} className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Autor do Despacho
                        </label>
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Conteúdo do Parecer / Anotação
                        </label>
                        <textarea
                          rows={3}
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Ex: Minuta de despacho enviada ao Diretor de Divisão para assinatura..."
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Gravar no Histórico</span>
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {deletingLogTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-100 shrink-0" />
                <h3 className="text-sm font-bold">Excluir Registro do Histórico</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingLogTarget(null)}
                disabled={isDeletingLog}
                className="p-1 rounded-lg text-rose-100 hover:text-white hover:bg-rose-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs sm:text-sm text-slate-700">
              <p>
                Tem certeza de que deseja <strong>excluir permanentemente</strong> este registro da linha do tempo?
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                <p>
                  <span className="text-slate-500">Ação:</span>{' '}
                  <strong className="text-slate-900">{deletingLogTarget.log.acao}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Data:</span>{' '}
                  <span className="font-mono text-slate-800">{deletingLogTarget.log.data}</span>
                </p>
                <p>
                  <span className="text-slate-500">Autor:</span>{' '}
                  <span className="font-semibold text-slate-800">{deletingLogTarget.log.autor}</span>
                </p>
                {deletingLogTarget.log.detalhes && (
                  <p className="text-slate-600 pt-1 border-t border-slate-200/70">
                    {deletingLogTarget.log.detalhes}
                  </p>
                )}
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingLogTarget(null)}
                disabled={isDeletingLog}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDeleteLog()}
                disabled={isDeletingLog}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-60 rounded-lg cursor-pointer"
              >
                {isDeletingLog ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isDeletingLog ? 'Excluindo...' : 'Sim, Excluir Registro'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
