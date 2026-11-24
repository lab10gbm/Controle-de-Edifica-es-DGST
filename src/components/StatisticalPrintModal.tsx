import React, { useRef, useState } from 'react';
import {
  StatisticalMatrixResult,
  MONTH_ABBR,
  REPORT_CATEGORIES,
} from '../utils/statisticalReport';
import {
  generateStatisticalPdfReport,
  PrintStudioOptions,
} from '../utils/statisticalReportPdf';
import {
  ArrowUpDown,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface ChartGroup {
  key: string;
  label: string;
  valuesByMonth: Record<number, number>;
}

interface StatisticalPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrix: StatisticalMatrixResult;
  officialTitle: string;
  reportYear: number;
  monthsSubtitle: string;
  hiddenMonths: Set<number>;
  monthColors: string[];
  chartGroups: ChartGroup[];
  visibleMonths: number[];
  ticks: number[];
  maxTick: number;
  showBarValues: boolean;
  categoryMultilineLabels: Record<string, string[]>;
}

export const StatisticalPrintModal: React.FC<StatisticalPrintModalProps> = ({
  isOpen,
  onClose,
  matrix,
  officialTitle,
  reportYear,
  monthsSubtitle,
  hiddenMonths,
  monthColors,
  chartGroups,
  visibleMonths,
  ticks,
  maxTick,
  showBarValues,
  categoryMultilineLabels,
}) => {
  const [options, setOptions] = useState<PrintStudioOptions>({
    order: 'table-first',
    orientation: 'portrait',
    showTable: true,
    showChart: true,
    showOfficialHeader: true,
    showDistribution: false,
    showSignature: false,
    pageBreakBetween: false,
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const printSvgRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const svgWidth = 960;
  const svgHeight = 390;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 86;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;
  const groupSlotWidth = plotWidth / Math.max(1, chartGroups.length);

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    if (!options.showTable && !options.showChart) return;
    setIsGeneratingPdf(true);
    setNotice(null);
    try {
      await generateStatisticalPdfReport({
        matrix,
        officialTitle,
        reportYear,
        monthsSubtitle,
        hiddenMonths,
        monthColors,
        svgElement: printSvgRef.current,
        options,
      });
      setNotice(
        `PDF gerado conforme sua organização (${officialTitle} / ${reportYear}).`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleNativePrint = () => {
    if (!options.showTable && !options.showChart) return;
    setNotice(null);

    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    if (isInIframe) {
      void handleDownloadPdf();
      return;
    }

    let didTriggerBeforePrint = false;
    const onBeforePrint = () => {
      didTriggerBeforePrint = true;
    };
    window.addEventListener('beforeprint', onBeforePrint, { once: true });

    const startTs = performance.now();
    try {
      window.print();
    } catch {
      // ignore sandbox block
    }
    const elapsedMs = performance.now() - startTs;

    window.setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
      if (!didTriggerBeforePrint && elapsedMs < 60) {
        void handleDownloadPdf();
      }
    }, 220);
  };

  const toggleOption = (key: keyof Pick<
    PrintStudioOptions,
    'showTable' | 'showChart' | 'showOfficialHeader' | 'showDistribution' | 'showSignature' | 'pageBreakBetween'
  >) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const tableSection = (
    <section
      key="table-section"
      className="bg-white border border-slate-300 rounded-xl p-5 sm:p-6 print:border-slate-300 print:shadow-none print:break-inside-avoid"
    >
      {options.showOfficialHeader ? (
        <div className="text-center space-y-1 pb-4">
          <div className="w-11 h-11 mx-auto rounded-full bg-red-800 text-white flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
            CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO
          </p>
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase">
            COMANDO DE BOMBEIRO DA ÁREA DA COSTA VERDE
          </p>
          <p className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase">
            10º GRUPAMENTO DE BOMBEIRO MILITAR
          </p>
          <div className="pt-2">
            <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
              ESTATÍSTICA DE SOLICITAÇÕES DE PROCESSOS
            </p>
            <p className="text-xs font-bold text-slate-700 uppercase">
              {officialTitle} / {reportYear}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-0.5 pb-4">
          <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
            ESTATÍSTICA DE SOLICITAÇÕES DE PROCESSOS
          </p>
          <p className="text-xs font-bold text-slate-700 uppercase">
            {officialTitle} / {reportYear}
          </p>
        </div>
      )}

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-slate-800 text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-200/80 text-slate-900">
              <th className="border border-slate-800 py-2 px-3 text-center font-bold uppercase tracking-wide min-w-[180px]">
                PROCESSO
              </th>
              {matrix.months.map((m) => (
                <th
                  key={m}
                  className="border border-slate-800 py-2 px-2.5 text-center font-bold uppercase w-16"
                >
                  {MONTH_ABBR[m]}
                </th>
              ))}
              <th className="border border-slate-800 py-2 px-2.5 text-center font-bold uppercase w-20">
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row.category}>
                <td className="border border-slate-800 py-2 px-3 text-center font-bold text-slate-900 uppercase text-xs">
                  {row.category}
                </td>
                {matrix.months.map((m) => {
                  const val = row.byMonth[m] || 0;
                  return (
                    <td
                      key={m}
                      className={`border border-slate-800 py-2 px-2 text-center font-mono tabular-nums ${
                        val > 0 ? 'text-slate-900 font-medium' : 'text-slate-400'
                      }`}
                    >
                      {val}
                    </td>
                  );
                })}
                <td className="border border-slate-800 py-2 px-2 text-center font-mono font-bold tabular-nums text-slate-900">
                  {row.total}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100/90 font-bold text-slate-900">
              <td className="border border-slate-800 py-2 px-3 text-center uppercase text-xs font-bold">
                TOTAL
              </td>
              {matrix.months.map((m) => (
                <td
                  key={m}
                  className="border border-slate-800 py-2 px-2 text-center font-mono font-bold tabular-nums"
                >
                  {matrix.totalsByMonth[m] || 0}
                </td>
              ))}
              <td className="border border-slate-800 py-2 px-2 text-center font-mono font-bold tabular-nums">
                {matrix.grandTotal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {options.showDistribution && (
        <div className="mt-4 pt-3 border-t border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
            Distribuição Percentual no Período
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs">
            {REPORT_CATEGORIES.map((category) => {
              const row = matrix.rows.find((r) => r.category === category);
              const count = row?.total || 0;
              const pct =
                matrix.grandTotal > 0
                  ? ((count / matrix.grandTotal) * 100).toFixed(1).replace('.', ',')
                  : '0,0';
              return (
                <div key={category} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700 truncate">{category}</span>
                  <span className="font-mono text-slate-900 shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );

  const chartSection = (
    <section
      key="chart-section"
      className="bg-white border border-slate-300 rounded-xl p-5 sm:p-6 print:border-slate-300 print:shadow-none print:break-inside-avoid"
    >
      <div className="text-center space-y-0.5 mb-3">
        <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-tight">
          Gráfico da Estatística de Solicitações de Processos
        </h3>
        <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase">
          {officialTitle} / {reportYear}
        </p>
      </div>

      <div className="border border-slate-200 rounded-lg p-3 sm:p-4 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs sm:text-sm font-medium text-slate-600">
            {monthsSubtitle}
          </span>
          <div className="flex flex-wrap items-center gap-2.5">
            {visibleMonths.map((m) => {
              const origIdx = matrix.months.indexOf(m);
              const color = monthColors[origIdx % monthColors.length];
              return (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                >
                  <span
                    className="w-3 h-3 rounded-xs shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span>{MONTH_ABBR[m]}</span>
                </span>
              );
            })}
          </div>
        </div>

        {matrix.grandTotal === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Sem processos encontrados para {officialTitle} / {reportYear}.
          </div>
        ) : (
          <svg
            ref={printSvgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label={`Gráfico estatístico para impressão — ${officialTitle} / ${reportYear}`}
          >
            {ticks.map((tick) => {
              const ratio = maxTick > 0 ? tick / maxTick : 0;
              const y = padTop + plotHeight - ratio * plotHeight;
              const isBaseline = tick === 0;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={isBaseline ? '#475569' : '#E2E8F0'}
                    strokeWidth={isBaseline ? 1.5 : 1}
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-600 text-[11px] font-mono"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {chartGroups.map((group, gIdx) => {
              const slotStart = padLeft + gIdx * groupSlotWidth;
              const slotCenter = slotStart + groupSlotWidth / 2;
              const innerPad = Math.min(26, groupSlotWidth * 0.16);
              const usableGroupW = Math.max(24, groupSlotWidth - innerPad * 2);
              const numBars = Math.max(1, visibleMonths.length);
              const barGap = numBars >= 5 ? 3 : 5;
              const barW = Math.min(
                26,
                Math.max(8, (usableGroupW - barGap * (numBars - 1)) / numBars)
              );
              const totalBarsW = numBars * barW + (numBars - 1) * barGap;
              const barsStartX = slotCenter - totalBarsW / 2;
              const labelLines = categoryMultilineLabels[group.key] || [group.label];

              return (
                <g key={group.key}>
                  {visibleMonths.map((month, visIdx) => {
                    const origMonthIdx = matrix.months.indexOf(month);
                    const color = monthColors[origMonthIdx % monthColors.length];
                    const val = group.valuesByMonth[month] || 0;
                    const ratio = maxTick > 0 ? val / maxTick : 0;
                    const barH = val > 0 ? Math.max(3, ratio * plotHeight) : 0;
                    const bx = barsStartX + visIdx * (barW + barGap);
                    const by = padTop + plotHeight - barH;

                    return (
                      <g key={month}>
                        <rect
                          x={bx}
                          y={by}
                          width={barW}
                          height={barH}
                          rx={2.5}
                          ry={2.5}
                          fill={color}
                        />
                        {showBarValues && val > 0 && (
                          <text
                            x={bx + barW / 2}
                            y={Math.max(12, by - 5)}
                            textAnchor="middle"
                            className="fill-slate-700 text-[10px] font-bold font-mono"
                          >
                            {val}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  <text
                    x={slotCenter}
                    y={padTop + plotHeight + 18}
                    textAnchor="middle"
                    className="fill-slate-700 text-[10.5px] font-semibold uppercase"
                  >
                    {labelLines.map((line, lineIdx) => (
                      <tspan key={lineIdx} x={slotCenter} dy={lineIdx === 0 ? 0 : 13}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}

            <text
              x={padLeft + plotWidth / 2}
              y={svgHeight - 8}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-bold uppercase tracking-wider"
            >
              PROCESSO
            </text>
          </svg>
        )}
      </div>
    </section>
  );

  const orderedSections =
    options.order === 'table-first'
      ? [
          ...(options.showTable ? [{ id: 'table', node: tableSection }] : []),
          ...(options.showChart ? [{ id: 'chart', node: chartSection }] : []),
        ]
      : [
          ...(options.showChart ? [{ id: 'chart', node: chartSection }] : []),
          ...(options.showTable ? [{ id: 'table', node: tableSection }] : []),
        ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-2xs flex items-center justify-center p-2 sm:p-5 print:static print:inset-auto print:overflow-visible print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:max-w-none print:shadow-none print:border-none print:rounded-none">
        {/* Top Modal Header (Hidden when printing) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-700 flex items-center justify-center shrink-0">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">
                Ambiente de Impressão — Quadro + Gráfico Estatístico
              </h3>
              <p className="text-[11px] text-slate-300">
                Organize a ordem, orientação e componentes do relatório antes de imprimir ou gerar o PDF ({officialTitle} / {reportYear})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={isGeneratingPdf || orderedSections.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleNativePrint}
              disabled={isGeneratingPdf || orderedSections.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Agora</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Fechar ambiente de impressão"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Organization Controls Toolbar (Hidden when printing) */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-2.5 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Order Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <SlidersHorizontal className="w-3.5 h-3.5 text-red-700" />
                <span>Ordem na Folha:</span>
              </span>
              <div className="inline-flex items-center gap-1 p-0.5 bg-white border border-slate-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOptions((p) => ({ ...p, order: 'table-first' }))}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    options.order === 'table-first'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1º Quadro → 2º Gráfico
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((p) => ({ ...p, order: 'chart-first' }))}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    options.order === 'chart-first'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1º Gráfico → 2º Quadro
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOptions((p) => ({
                    ...p,
                    order: p.order === 'table-first' ? 'chart-first' : 'table-first',
                  }))
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                title="Inverter rapidamente a ordem entre Quadro e Gráfico"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Inverter</span>
              </button>
            </div>

            {/* Orientation & Page Break */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 p-0.5 bg-white border border-slate-300 rounded-lg">
                <button
                  type="button"
                  onClick={() => setOptions((p) => ({ ...p, orientation: 'portrait' }))}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    options.orientation === 'portrait'
                      ? 'bg-red-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Retrato
                </button>
                <button
                  type="button"
                  onClick={() => setOptions((p) => ({ ...p, orientation: 'landscape' }))}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    options.orientation === 'landscape'
                      ? 'bg-red-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Paisagem
                </button>
              </div>

              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.pageBreakBetween}
                  onChange={() => toggleOption('pageBreakBetween')}
                  className="rounded border-slate-300 text-red-700 focus:ring-red-600"
                />
                <span>Separar em 2 páginas</span>
              </label>
            </div>
          </div>

          {/* Component Visibility Checkboxes */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-700 pt-1 border-t border-slate-200/70">
            <span className="font-semibold text-slate-500">Componentes:</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.showTable}
                onChange={() => toggleOption('showTable')}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Quadro Estatístico</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.showChart}
                onChange={() => toggleOption('showChart')}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Gráfico de Barras</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.showOfficialHeader}
                onChange={() => toggleOption('showOfficialHeader')}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Cabeçalho Oficial CBMERJ</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.showDistribution}
                onChange={() => toggleOption('showDistribution')}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Distribuição (%)</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={options.showSignature}
                onChange={() => toggleOption('showSignature')}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Campos de Assinatura</span>
            </label>
          </div>

          {notice && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{notice}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                aria-label="Fechar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Live Paper Preview Desk */}
        <div className="flex-1 overflow-y-auto bg-slate-200/75 p-4 sm:p-7 print:p-0 print:bg-white print:overflow-visible">
          {orderedSections.length === 0 ? (
            <div className="max-w-lg mx-auto my-12 bg-white border border-slate-300 rounded-xl p-8 text-center text-xs text-slate-600">
              Selecione ao menos um componente (<strong>Quadro Estatístico</strong> ou{' '}
              <strong>Gráfico de Barras</strong>) acima para visualizar a folha de impressão.
            </div>
          ) : (
            <div
              className={`mx-auto bg-white shadow-lg border border-slate-300 rounded-xl p-5 sm:p-8 space-y-5 print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none ${
                options.orientation === 'landscape' ? 'max-w-[1040px]' : 'max-w-[820px]'
              }`}
            >
              {orderedSections.map((sec, idx) => (
                <React.Fragment key={sec.id}>
                  {idx > 0 && options.pageBreakBetween && (
                    <div className="relative py-2 print:py-0 print:break-before-page">
                      <div className="border-t-2 border-dashed border-slate-300 print:hidden" />
                      <span className="absolute left-1/2 -translate-x-1/2 -top-1 bg-white px-2 text-[10px] font-mono uppercase text-slate-400 print:hidden">
                        Quebra de Página (Página 2)
                      </span>
                    </div>
                  )}
                  {sec.node}
                </React.Fragment>
              ))}

              {options.showSignature && (
                <div className="pt-8 grid grid-cols-2 gap-10 text-center text-xs print:break-inside-avoid">
                  <div className="border-t border-slate-500 pt-2">
                    <p className="font-bold text-slate-900">Chefe da SST / 10º GBM</p>
                    <p className="text-[11px] text-slate-500">Seção de Serviços Técnicos</p>
                  </div>
                  <div className="border-t border-slate-500 pt-2">
                    <p className="font-bold text-slate-900">Diretor / Comandante</p>
                    <p className="text-[11px] text-slate-500">CBMERJ · 10º GBM Angra dos Reis</p>
                  </div>
                </div>
              )}

              <div className="pt-2 text-center text-[11px] text-slate-500 font-mono">
                CBMERJ · 10º GBM (Angra dos Reis) · SST · Emitido em{' '}
                {new Date().toLocaleDateString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
