import React, { useState, useRef } from 'react';
import { BuildingNotification } from '../types';
import { 
  parseCSV, 
  convertRowsToNotifications, 
  getExampleCSV 
} from '../utils/csvParser';
import { isDgstReportCSV } from '../utils/dgstSync';
import { formatDateBR, formatProcesso } from '../utils/helpers';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  FileText, 
  ClipboardPaste,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: BuildingNotification[], replaceExisting: boolean) => void;
  onOpenDgstSyncWithText?: (csvText: string, fileName: string) => void;
  currentCount: number;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onOpenDgstSyncWithText,
  currentCount,
}) => {
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [replaceMode, setReplaceMode] = useState<boolean>(true); // true = replace, false = append
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [detectedDgst, setDetectedDgst] = useState<boolean>(false);
  
  // Parsed state
  const [previewItems, setPreviewItems] = useState<BuildingNotification[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessText = (text: string, sourceName = 'Dados colados') => {
    setErrorMsg('');
    setWarnings([]);
    setCsvContent(text);
    setFileName(sourceName);
    setDetectedDgst(isDgstReportCSV(text));

    if (!text.trim()) {
      setPreviewItems([]);
      setDetectedDgst(false);
      return;
    }

    try {
      setIsProcessing(true);
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setErrorMsg('O arquivo deve conter pelo menos uma linha de cabeçalho e ao menos um registro de dados.');
        setPreviewItems([]);
        setIsProcessing(false);
        return;
      }

      const { items, warnings: parseWarnings } = convertRowsToNotifications(rows);
      if (items.length === 0) {
        setErrorMsg('Nenhuma edificação válida pôde ser extraída. Verifique se há uma coluna com o nome do estabelecimento.');
      }
      setPreviewItems(items);
      setWarnings(parseWarnings);
    } catch (err: any) {
      setErrorMsg(`Erro ao analisar CSV: ${err.message || 'Formato inválido'}`);
      setPreviewItems([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessText(text, file.name);
    };
    reader.onerror = () => {
      setErrorMsg('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplate = () => {
    const template = getExampleCSV();
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_importacao_notificacoes.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return;
    onImport(previewItems, replaceMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Importar Dados da Planilha (Google Sheets / CSV)
              </h2>
              <p className="text-xs text-slate-300">
                Carregue seus registros diretamente do Google Sheets para o banco de dados do sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Instructions & Download Template */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-emerald-950">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                <span>Como exportar do Google Sheets:</span>
              </div>
              <p className="text-emerald-800">
                1. No Google Sheets: <strong>Arquivo &gt; Fazer download &gt; Valores separados por vírgula (.csv)</strong>.
              </p>
              <p className="text-emerald-800">
                2. Suba o arquivo aqui ou copie e cole o texto no campo abaixo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Baixar Modelo CSV</span>
            </button>
          </div>

          {/* Mode Switcher: Upload or Paste */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Selecionar Arquivo .CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors cursor-pointer ${
                  inputMode === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Colar Texto Diretamente</span>
              </button>
            </div>

            {/* Replace / Merge Choice */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Modo de Gravação:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="replaceMode"
                  checked={replaceMode}
                  onChange={() => setReplaceMode(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-semibold">Substituir todos ({currentCount} existentes)</span>
              </label>
              <span className="text-slate-300">|</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="replaceMode"
                  checked={!replaceMode}
                  onChange={() => setReplaceMode(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700">Adicionar/Acrescentar</span>
              </label>
            </div>
          </div>

          {/* Upload Area */}
          {inputMode === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-slate-50/70 hover:bg-emerald-50/20 rounded-xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Clique para selecionar seu arquivo .CSV do Google Sheets
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Aceita arquivos codificados em UTF-8 exportados com vírgula (,) ou ponto e vírgula (;)
                  </p>
                </div>
                {fileName && (
                  <div className="inline-flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-slate-200 text-xs font-mono text-emerald-800">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Arquivo carregado: <strong>{fileName}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Paste Direct Text */
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cole o conteúdo copiado do Google Sheets ou CSV abaixo:
              </label>
              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => handleProcessText(e.target.value, 'Texto colado')}
                placeholder="PROCESSO;TIPO;CÓDIGO;DATA BASE;ORIGEM;REQUERENTE;CPF / CNPJ;ENTRADA NA SST;ENTRADA DA OBM;ENVIO AO DIR. DIVISÃO;SITUAÇÃO;BILHETES;AO DIRETOR;GRÁFICO;DOC. GERADO;DATA DO PRONTO;DATA DE ENTREGUE;LOCALIZAÇÃO&#10;00075;Certificado de Aprovação;11220;15;ANGRA DOS REIS;RONEY MARCHTEIN;4579497830;05/01;05/01;05/01;INDEFERIDO;05/01;GERADO DI;DI;DI-1029;28/01;15/01;PASTA INTERNET"
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-slate-900"
              />
            </div>
          )}

          {/* DGST Report Auto-Detection Notice */}
          {detectedDgst && onOpenDgstSyncWithText && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-xs text-indigo-950 space-y-1">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-indigo-700" />
                  <span>Relatório Oficial DGST Detectado (E27 / Prontos)</span>
                </div>
                <p className="text-indigo-800">
                  Este arquivo está no padrão <strong>Relatório de Processos por OBM</strong>. Use a Correlação DGST para atualizar os números <code className="font-mono font-bold">E27/...</code>, endereços e <strong>Datas do Pronto</strong> preservando seus bilhetes e históricos existentes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDgstSyncWithText(csvContent, fileName || 'Relatório DGST.csv');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Abrir Correlação DGST</span>
              </button>
            </div>
          )}

          {/* Parsing Errors */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 text-xs text-amber-900">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Avisos de processamento ({warnings.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                {warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {warnings.length > 3 && (
                  <li>...e mais {warnings.length - 3} aviso(s).</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview of Parsed Items */}
          {previewItems.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">
                    Pré-visualização: {previewItems.length} registros prontos para importação
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">
                  Mostrando os primeiros {Math.min(previewItems.length, 5)} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="p-2 text-center w-20">Processo</th>
                      <th className="p-2">Requerente</th>
                      <th className="p-2">Tipo – Origem</th>
                      <th className="p-2">Data Entrada</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">DOC. GERADO</th>
                      <th className="p-2">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewItems.slice(0, 5).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="p-2 text-center font-mono font-bold text-slate-900">
                          {formatProcesso(item.processo !== undefined ? item.processo : item.numero, { codigo: item.detalhesSST?.codigo, ano: item.anoExercicio })}
                        </td>
                        <td className="p-2 font-medium text-slate-900 uppercase">
                          {item.requerente || item.edificacao}
                        </td>
                        <td className="p-2 text-slate-600 text-[11px]">
                          {item.tipoProcesso || 'Processo'} – {item.origem || item.obm}
                        </td>
                        <td className="p-2 font-mono text-slate-600">
                          {formatDateBR(item.dataEntrada || item.dataExpedicao)}
                        </td>
                        <td className="p-2">
                          <span className="font-medium text-slate-800">{item.status}</span>
                        </td>
                        <td className="p-2 font-mono font-bold text-slate-800">
                          {item.detalhesSST?.docGerado || '—'}
                        </td>
                        <td className="p-2 font-medium text-slate-700">
                          {item.detalhesSST?.localizacao || 'PROTOCOLO'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={previewItems.length === 0}
            onClick={handleConfirmImport}
            className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors cursor-pointer ${
              previewItems.length > 0
                ? 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {replaceMode
                ? `Confirmar e Substituir Tudo (${previewItems.length} registros)`
                : `Confirmar e Adicionar (${previewItems.length} novos)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
