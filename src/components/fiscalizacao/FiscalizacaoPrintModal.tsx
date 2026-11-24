import React, { useState } from 'react';
import { X, Printer, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { FiscalizacaoRecord } from '../../types/fiscalizacao';

interface FiscalizacaoPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  singleRecord: FiscalizacaoRecord | null;
  recordsList: FiscalizacaoRecord[];
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const FiscalizacaoPrintModal: React.FC<FiscalizacaoPrintModalProps> = ({
  isOpen,
  onClose,
  singleRecord,
  recordsList,
}) => {
  const [title, setTitle] = useState(
    singleRecord
      ? `Ficha de Fiscalização #${String(singleRecord.codigo).padStart(4, '0')}`
      : 'Relatório de Notificações e Autos de Fiscalização · 10º GBM'
  );
  const [includeRedacao, setIncludeRedacao] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const itemsToRender = singleRecord ? [singleRecord] : recordsList.slice(0, 300);

  const buildPrintableHtml = () => {
    const today = new Date().toLocaleDateString('pt-BR');
    const rowsHtml = itemsToRender
      .map(
        (r) => `
      <tr>
        <td style="font-family:monospace;font-weight:700;text-align:center;">#${String(r.codigo).padStart(4, '0')}</td>
        <td>
          <strong>${escapeHtml(r.edificacao)}</strong>
          ${r.documentoCpfCnpj ? `<div style="font-size:10px;color:#475569;font-family:monospace;">${escapeHtml(r.documentoCpfCnpj)}</div>` : ''}
        </td>
        <td>
          <strong>${escapeHtml(r.municipio)}</strong>
          ${r.enderecoCompleto ? `<div style="font-size:10px;color:#475569;">${escapeHtml(r.enderecoCompleto)}</div>` : ''}
        </td>
        <td style="font-family:monospace;">${escapeHtml(r.processoVinculado || '—')}</td>
        <td><strong>${escapeHtml(r.status)}</strong></td>
        <td style="font-family:monospace;">${escapeHtml(r.dataExpedicao || '—')}</td>
        ${includeRedacao ? `<td style="font-size:10px;">${escapeHtml(r.redacao || r.historicoTexto || '—')}</td>` : ''}
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #991b1b; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { margin: 4px 0; font-size: 14px; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 10px; }
    @media print { @page { size: landscape; margin: 10mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO · 10º GBM (ANGRA DOS REIS)</h1>
    <p><strong>${escapeHtml(title)}</strong> · Emitido em ${today} · ${itemsToRender.length} registro(s)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:65px;text-align:center;">Nº</th>
        <th>Edificação / CNPJ-CPF</th>
        <th>Município / Endereço</th>
        <th style="width:140px;">Processo</th>
        <th style="width:130px;">Status</th>
        <th style="width:85px;">Expedição</th>
        ${includeRedacao ? '<th>Redação / Resumo</th>' : ''}
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
  };

  const handlePrintIframe = () => {
    try {
      const html = buildPrintableHtml();
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            handleDownloadHtml();
          } finally {
            setTimeout(() => document.body.removeChild(iframe), 1500);
          }
        }, 250);
      }
    } catch {
      handleDownloadHtml();
    }
  };

  const handleDownloadHtml = () => {
    const html = buildPrintableHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notificacoes-10gbm-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Arquivo HTML pronto para impressão baixado com sucesso.');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="text-sm font-bold">Ambiente de Impressão · Notificações SST</h3>
              <p className="text-[11px] text-slate-300">
                {itemsToRender.length} registro(s) preparados para impressão
                {!singleRecord && recordsList.length > 300
                  ? ` (exibindo os 300 primeiros de ${recordsList.length} filtrados)`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[260px] px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
            />
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRedacao}
                onChange={(e) => setIncludeRedacao(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Incluir Redação / Histórico</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar HTML</span>
            </button>
            <button
              type="button"
              onClick={handlePrintIframe}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 bg-slate-100">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="text-center border-b-2 border-red-800 pb-3">
              <p className="text-xs font-bold uppercase text-slate-900">
                CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO · 10º GBM
              </p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{title}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Nº</th>
                    <th className="border border-slate-300 px-2 py-1.5">Edificação / CNPJ-CPF</th>
                    <th className="border border-slate-300 px-2 py-1.5">Município / Endereço</th>
                    <th className="border border-slate-300 px-2 py-1.5">Processo</th>
                    <th className="border border-slate-300 px-2 py-1.5">Status</th>
                    <th className="border border-slate-300 px-2 py-1.5">Expedição</th>
                    {includeRedacao && (
                      <th className="border border-slate-300 px-2 py-1.5">Redação / Resumo</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {itemsToRender.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="border border-slate-300 px-2 py-1.5 font-mono font-bold text-center whitespace-nowrap">
                        #{String(r.codigo).padStart(4, '0')}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <div className="font-semibold">{r.edificacao}</div>
                        {r.documentoCpfCnpj && (
                          <div className="text-[10px] font-mono text-slate-500">
                            {r.documentoCpfCnpj}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <div className="font-semibold">{r.municipio}</div>
                        <div className="text-[10px] text-slate-500">{r.enderecoCompleto}</div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono whitespace-nowrap">
                        {r.processoVinculado || '—'}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-semibold whitespace-nowrap">
                        {r.status}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono whitespace-nowrap">
                        {r.dataExpedicao || '—'}
                      </td>
                      {includeRedacao && (
                        <td className="border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700">
                          {r.redacao || r.historicoTexto || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
