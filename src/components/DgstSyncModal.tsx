import React, { useMemo, useRef, useState } from 'react';
import { BuildingNotification } from '../types';
import {
  BUNDLED_DGST_CSV_PATH,
  DEFAULT_DGST_SYNC_OPTIONS,
  DgstCorrelationPlan,
  DgstParseResult,
  DgstSyncOptions,
  buildDgstCorrelationPlan,
  parseDgstReportCSV,
} from '../utils/dgstSync';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CloudUpload,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';

interface DgstSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingNotifications: BuildingNotification[];
  initialCsvText?: string;
  initialFileName?: string;
  onSyncToFirestore: (
    updates: BuildingNotification[],
    creates: BuildingNotification[],
    onProgress: (completed: number, total: number) => void
  ) => Promise<void>;
}

type PreviewTab = 'novos_prontos' | 'divergencias' | 'todos_correlacionados' | 'novos_dgst';

export const DgstSyncModal: React.FC<DgstSyncModalProps> = ({
  isOpen,
  onClose,
  existingNotifications,
  initialCsvText,
  initialFileName,
  onSyncToFirestore,
}) => {
  const [fileName, setFileName] = useState<string>(initialFileName || '');
  const [parseResult, setParseResult] = useState<DgstParseResult | null>(() => {
    if (!initialCsvText) return null;
    try {
      return parseDgstReportCSV(initialCsvText);
    } catch {
      return null;
    }
  });
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });

  const [options, setOptions] = useState<DgstSyncOptions>(DEFAULT_DGST_SYNC_OPTIONS);
  const [activeTab, setActiveTab] = useState<PreviewTab>('novos_prontos');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const correlationPlan: DgstCorrelationPlan | null = useMemo(() => {
    if (!parseResult) return null;
    return buildDgstCorrelationPlan(parseResult.rows, existingNotifications, options);
  }, [parseResult, existingNotifications, options]);

  const updatesToSend = useMemo(() => {
    if (!correlationPlan) return [];
    const matchedUpdates = correlationPlan.matched
      .filter((m) => m.hasAnyChange)
      .map((m) => m.updated);
    const legacyUpdates = options.standardizeLegacyUnmatchedE27
      ? correlationPlan.legacyNormalized.map((l) => l.updated)
      : [];
    return [...matchedUpdates, ...legacyUpdates];
  }, [correlationPlan, options.standardizeLegacyUnmatchedE27]);

  const createsToSend = useMemo(() => {
    if (!correlationPlan || !options.includeNewProcesses) return [];
    return correlationPlan.unmatchedNew.map((u) => u.record);
  }, [correlationPlan, options.includeNewProcesses]);

  const newlyReadyRows = useMemo(
    () => correlationPlan?.matched.filter((m) => m.hadNoProntoBefore && Boolean(m.nextPronto)) || [],
    [correlationPlan]
  );

  const divergingProntoRows = useMemo(
    () => correlationPlan?.matched.filter((m) => m.hasProntoDateDiff) || [],
    [correlationPlan]
  );

  if (!isOpen) return null;

  const totalOperations = updatesToSend.length + createsToSend.length;

  const processCsvText = (text: string, sourceLabel: string) => {
    setErrorMsg('');
    try {
      const parsed = parseDgstReportCSV(text);
      if (parsed.rows.length === 0) {
        setErrorMsg('Nenhum processo no formato E27/PROCESSO/COD/ANO foi encontrado no arquivo.');
        setParseResult(null);
        return;
      }
      setParseResult(parsed);
      setFileName(sourceLabel);

      // Seleciona automaticamente a aba mais informativa
      const quickPlan = buildDgstCorrelationPlan(parsed.rows, existingNotifications, options);
      if (quickPlan.stats.newlyReadyCount > 0) {
        setActiveTab('novos_prontos');
      } else if (quickPlan.stats.matchedCount > 0) {
        setActiveTab('todos_correlacionados');
      } else {
        setActiveTab('novos_dgst');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao analisar o relatório DGST.');
      setParseResult(null);
    }
  };

  const handleLoadBundledCsv = async () => {
    setIsLoadingFile(true);
    setErrorMsg('');
    try {
      const resp = await fetch(BUNDLED_DGST_CSV_PATH);
      if (!resp.ok) {
        throw new Error(`Falha ao carregar o arquivo (${resp.status}).`);
      }
      const text = await resp.text();
      processCsvText(text, 'PROCESSOS SST 2026.csv (DGST 19/11/2026)');
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Não foi possível carregar a planilha anexada. Selecione o arquivo CSV manualmente.'
      );
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoadingFile(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      processCsvText(text, file.name);
      setIsLoadingFile(false);
    };
    reader.onerror = () => {
      setErrorMsg('Não foi possível ler o arquivo selecionado.');
      setIsLoadingFile(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePushToFirestore = async () => {
    if (totalOperations === 0 || isPushing) return;
    setIsPushing(true);
    setErrorMsg('');
    setProgress({ completed: 0, total: totalOperations });
    try {
      await onSyncToFirestore(updatesToSend, createsToSend, (completed, total) => {
        setProgress({ completed, total });
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao enviar atualizações para o Firestore.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[93vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Correlação DGST &amp; Atualização de Prontos / E27 no Firestore
              </h2>
              <p className="text-xs text-slate-300">
                Padroniza o nº E27/PROCESSO/COD/ANO, vincula endereços e atualiza Datas do Pronto sem perder seus bilhetes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Source Selector */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-indigo-950">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
                <span>Fonte do Relatório de Processos por OBM (DGST)</span>
              </div>
              <p className="text-indigo-800 leading-relaxed">
                Carregue diretamente o arquivo <strong>PROCESSOS SST 2026.csv</strong> já analisado ou selecione um novo relatório CSV exportado pela DGST.
              </p>
              {fileName && (
                <p className="text-[11px] font-mono text-indigo-900 bg-white/90 inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-indigo-200 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Arquivo carregado: {fileName}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLoadBundledCsv}
                disabled={isLoadingFile || isPushing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isLoadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Carregar Planilha DGST Anexada (493)</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoadingFile || isPushing}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-900 bg-white hover:bg-indigo-100/70 border border-indigo-300 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-700" />
                <span>Outro Arquivo .CSV</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parseResult && correlationPlan && (
            <>
              {/* Anomalies Fixed Notice */}
              {(parseResult.anomaliesFixed.prontoNoEndereco > 0 ||
                parseResult.anomaliesFixed.enderecoNoRequerente > 0) && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <FileCheck2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Saneamento automático aplicado na planilha:</strong>{' '}
                    {parseResult.anomaliesFixed.prontoNoEndereco > 0 && (
                      <span>
                        {parseResult.anomaliesFixed.prontoNoEndereco} data(s) do Pronto estavam coladas dentro da coluna Endereço e foram resgatadas;{' '}
                      </span>
                    )}
                    {parseResult.anomaliesFixed.enderecoNoRequerente > 0 && (
                      <span>
                        {parseResult.anomaliesFixed.enderecoNoRequerente} endereço(s) misturado(s) ao campo Requerente foram separados automaticamente.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {existingNotifications.length === 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>
                    Sua base atual no Firestore está com <strong>0 registros</strong> para o filtro de ano selecionado. Ao confirmar, todos os <strong>{correlationPlan.stats.unmatchedNewCount}</strong> processos do relatório DGST serão gravados no Firestore já padronizados em <code className="font-mono font-bold">E27/PROCESSO/COD/ANO</code>.
                  </span>
                </div>
              )}

              {/* Correlation Stats Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                    Relatório DGST ({parseResult.dataEmissao || '2026'})
                  </span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
                    {correlationPlan.stats.totalDgstRows}
                  </div>
                  <span className="text-[11px] text-slate-600 block mt-0.5 truncate" title={parseResult.obm}>
                    {parseResult.obm}
                  </span>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold uppercase text-indigo-800 block">
                    Correlacionados na Base
                  </span>
                  <div className="text-xl font-bold font-mono text-indigo-950 mt-0.5">
                    {correlationPlan.stats.matchedCount}
                  </div>
                  <span className="text-[11px] text-indigo-700 block mt-0.5">
                    {correlationPlan.stats.processoFormatUpdatedCount} p/ formato E27 · {correlationPlan.stats.addressFilledCount} endereços
                  </span>
                </div>

                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold uppercase text-emerald-800 block">
                    Recém-Prontos / Datas
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-900 mt-0.5">
                    +{correlationPlan.stats.newlyReadyCount}
                  </div>
                  <span className="text-[11px] text-emerald-800 block mt-0.5">
                    {correlationPlan.stats.newlyReadyCount} sem pronto antes · {correlationPlan.stats.prontoDateDiffCount} datas corrigidas
                  </span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <span className="text-[11px] font-semibold uppercase text-amber-800 block">
                    Novos Processos DGST
                  </span>
                  <div className="text-xl font-bold font-mono text-amber-950 mt-0.5">
                    {correlationPlan.stats.unmatchedNewCount}
                  </div>
                  <span className="text-[11px] text-amber-800 block mt-0.5">
                    {correlationPlan.stats.unmatchedNewWithProntoCount} já prontos · {correlationPlan.stats.legacyNormalizedCount} legados E27
                  </span>
                </div>
              </div>

              {/* Reconciliation Rules / Options */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Regras de Atualização e Sincronização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-slate-700">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.updateE27Format}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, updateE27Format: e.target.checked }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Padronizar número oficial <strong className="font-mono">E27/PROCESSO/COD/ANO</strong> (atualiza <code className="font-mono">processo</code> e <code className="font-mono">processoAdministrativo</code>)
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.updateProntoDates}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, updateProntoDates: e.target.checked }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Preencher <strong>Data do Pronto</strong> dos processos recém-concluídos ({correlationPlan.stats.newlyReadyCount} processos)
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.overwriteDifferingProntoDates}
                      disabled={!options.updateProntoDates}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          overwriteDifferingProntoDates: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                    />
                    <span>
                      Corrigir Datas do Pronto divergentes / completar ano <code className="font-mono">/2026</code> pela planilha DGST ({correlationPlan.stats.prontoDateDiffCount} divergências)
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.moveReadyToProntoLocation}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          moveReadyToProntoLocation: e.target.checked,
                        }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Mover processos em tramitação (Protocolo / Dir. Divisão / Diretor) para localização <strong>PRONTO</strong> ao receber Data do Pronto (preserva Internet)
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.fillMissingAddresses}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, fillMissingAddresses: e.target.checked }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Alimentar endereço completo nos processos sem logradouro cadastrado ({correlationPlan.stats.addressFilledCount} processos)
                    </span>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeNewProcesses}
                      onChange={(e) =>
                        setOptions((prev) => ({ ...prev, includeNewProcesses: e.target.checked }))
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      Criar os <strong>{correlationPlan.stats.unmatchedNewCount}</strong> novos processos da planilha DGST que ainda não estão na base
                    </span>
                  </label>
                </div>
              </div>

              {/* Filterable Preview Tabs */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('novos_prontos')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        activeTab === 'novos_prontos'
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      Recém-Prontos ({newlyReadyRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('divergencias')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        activeTab === 'divergencias'
                          ? 'bg-amber-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      Datas Divergentes ({divergingProntoRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('todos_correlacionados')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        activeTab === 'todos_correlacionados'
                          ? 'bg-indigo-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      Todos Correlacionados ({correlationPlan.matched.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('novos_dgst')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        activeTab === 'novos_dgst'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      Novos da DGST ({correlationPlan.unmatchedNew.length})
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Prévia (até 80 linhas)
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  {activeTab !== 'novos_dgst' ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <tr>
                          <th className="p-2.5">Processo (Antes → E27)</th>
                          <th className="p-2.5">Requerente (Plataforma / DGST)</th>
                          <th className="p-2.5">Data do Pronto</th>
                          <th className="p-2.5">Localização</th>
                          <th className="p-2.5">Endereço</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(activeTab === 'novos_prontos'
                          ? newlyReadyRows
                          : activeTab === 'divergencias'
                          ? divergingProntoRows
                          : correlationPlan.matched
                        )
                          .slice(0, 80)
                          .map((m) => (
                            <tr key={m.existing.id} className="hover:bg-slate-50/70">
                              <td className="p-2.5 font-mono whitespace-nowrap">
                                <span className="text-slate-400 line-through mr-1">
                                  {m.previousProcesso}
                                </span>
                                <ArrowRight className="w-3 h-3 inline text-slate-400 mr-1" />
                                <strong className="text-indigo-800">{m.nextProcesso}</strong>
                              </td>
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-900 uppercase truncate max-w-[240px]">
                                  {m.existing.requerente || m.existing.edificacao}
                                </div>
                                {m.dgst.requerente &&
                                  m.dgst.requerente.toUpperCase() !==
                                    (m.existing.requerente || m.existing.edificacao).toUpperCase() && (
                                    <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                                      DGST: {m.dgst.requerente}
                                    </div>
                                  )}
                              </td>
                              <td className="p-2.5 font-mono whitespace-nowrap">
                                {m.previousPronto ? (
                                  <span className="text-slate-500 mr-1">{m.previousPronto} →</span>
                                ) : (
                                  <span className="text-slate-400 mr-1">(vazio) →</span>
                                )}
                                <strong
                                  className={
                                    m.nextPronto ? 'text-emerald-700' : 'text-slate-400'
                                  }
                                >
                                  {m.nextPronto || '—'}
                                </strong>
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className="text-slate-500">{m.previousLocalizacao}</span>
                                {m.nextLocalizacao !== m.previousLocalizacao && (
                                  <>
                                    <ArrowRight className="w-3 h-3 inline mx-1 text-emerald-600" />
                                    <strong className="text-emerald-700">
                                      {m.nextLocalizacao}
                                    </strong>
                                  </>
                                )}
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-600 truncate max-w-[220px]" title={m.dgst.enderecoRaw}>
                                {m.dgst.enderecoRaw || '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <tr>
                          <th className="p-2.5">Processo E27</th>
                          <th className="p-2.5">Entrada</th>
                          <th className="p-2.5">Requerente</th>
                          <th className="p-2.5">Pronto</th>
                          <th className="p-2.5">Endereço</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {correlationPlan.unmatchedNew.slice(0, 80).map(({ dgst, record }) => (
                          <tr key={record.id} className="hover:bg-slate-50/70">
                            <td className="p-2.5 font-mono font-bold text-indigo-800 whitespace-nowrap">
                              {dgst.e27Processo}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                              {dgst.dataEntradaBR}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900 uppercase truncate max-w-[220px]">
                              {dgst.requerente}
                            </td>
                            <td className="p-2.5 font-mono whitespace-nowrap">
                              {dgst.dataProntoBR ? (
                                <strong className="text-emerald-700">{dgst.dataProntoBR}</strong>
                              ) : (
                                <span className="text-slate-400">Em aberto</span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600 truncate max-w-[240px]" title={dgst.enderecoRaw}>
                              {dgst.enderecoRaw || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Live Push Progress Bar */}
          {isPushing && progress.total > 0 && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-700" />
                  <span>Enviando correlação e atualizações para o Firebase Firestore...</span>
                </span>
                <span className="font-mono">
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-700 transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.round((progress.completed / progress.total) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPushing}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={!correlationPlan || totalOperations === 0 || isPushing}
            onClick={handlePushToFirestore}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors ${
              correlationPlan && totalOperations > 0 && !isPushing
                ? 'bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed opacity-70'
            }`}
          >
            {isPushing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gravando no Firestore...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>
                  Empurrar para o Firestore ({updatesToSend.length} atualizações
                  {createsToSend.length > 0 ? ` + ${createsToSend.length} novos` : ''})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
