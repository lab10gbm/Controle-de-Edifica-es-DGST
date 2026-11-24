import React, { useMemo, useRef, useState } from 'react';
import { BuildingNotification } from '../types';
import { OBM_LIST } from '../data/initialData';
import { formatDateBR, formatProcesso } from '../utils/helpers';
import {
  buildStatisticalMatrix,
  exportStatisticalMatrixCSV,
  formatMonthsListPT,
  MONTH_ABBR,
  MONTH_FULL_PT,
  PERIOD_OPTIONS,
  PeriodType,
  REPORT_CATEGORIES,
  ReportCategory,
  ReportDateBasis,
} from '../utils/statisticalReport';
import { generateStatisticalPdfReport } from '../utils/statisticalReportPdf';
import { StatisticalPrintModal } from './StatisticalPrintModal';
import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  FileDown,
  FileText,
  Filter,
  Loader2,
  Printer,
  ShieldCheck,
  Table2,
  X,
  Eye,
} from 'lucide-react';

interface StatisticalReportDashboardProps {
  notifications: BuildingNotification[];
  selectedYear: string;
  availableYears: string[];
  onEditRecord: (record: BuildingNotification) => void;
}

const MONTH_SERIES_COLORS = [
  '#3B75AF', // Azul (1º mês do período)
  '#C0504D', // Vermelho (2º mês)
  '#8EB04E', // Verde oliva (3º mês)
  '#7D649E', // Roxo (4º mês)
  '#3E9BA8', // Ciano/Petróleo (5º mês - semestral)
  '#D98236', // Âmbar (6º mês - semestral)
];

const CATEGORY_MULTILINE_LABELS: Record<string, string[]> = {
  'CERTIFICADO DE APROVAÇÃO': ['CERTIFICADO', 'DE', 'APROVAÇÃO'],
  'LAUDO DE EXIGÊNCIAS': ['LAUDO DE', 'EXIGÊNCIAS'],
  'DESPACHO INDEFERIDO': ['DESPACHO', 'INDEFERIDO'],
  'AUTORIZAÇÕES': ['AUTORIZAÇÕES'],
  OUTROS: ['OUTROS'],
  TOTAL: ['TOTAL'],
};

function computeNiceScale(maxValue: number): { maxTick: number; ticks: number[] } {
  const safeMax = Math.max(maxValue, 5);
  const rawStep = safeMax / 6;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceNormalized = 1;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 2.5) niceNormalized = 2.5;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;

  const step = Math.max(1, Math.ceil(niceNormalized * magnitude));
  const maxTick = Math.ceil(safeMax / step) * step;

  const ticks: number[] = [];
  for (let v = 0; v <= maxTick; v += step) {
    ticks.push(v);
  }
  return { maxTick: ticks[ticks.length - 1] || maxTick, ticks };
}

export const StatisticalReportDashboard: React.FC<StatisticalReportDashboardProps> = ({
  notifications,
  selectedYear,
  availableYears,
  onEditRecord,
}) => {
  const currentYearNum = new Date().getFullYear();

  const [periodType, setPeriodType] = useState<PeriodType>('quadrimestral');
  const [periodIndex, setPeriodIndex] = useState<number>(1);
  const [reportYear, setReportYear] = useState<number>(() =>
    /^\d{4}$/.test(selectedYear) ? parseInt(selectedYear, 10) : currentYearNum
  );
  const [dateBasis, setDateBasis] = useState<ReportDateBasis>('entrada');
  const [obmFilter, setObmFilter] = useState<string>('');
  const [includeTotalInChart, setIncludeTotalInChart] = useState<boolean>(true);
  const [showBarValues, setShowBarValues] = useState<boolean>(true);
  const [hiddenMonths, setHiddenMonths] = useState<Set<number>>(new Set());
  const [hoveredBar, setHoveredBar] = useState<{
    groupLabel: string;
    month: number;
    value: number;
    monthTotal: number;
    xPct: number;
    yPct: number;
  } | null>(null);
  const [drilldownCell, setDrilldownCell] = useState<{
    key: string;
    title: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfGeneratedNotice, setPdfGeneratedNotice] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  // Sincroniza quando o usuário troca o ano global no cabeçalho
  React.useEffect(() => {
    if (/^\d{4}$/.test(selectedYear)) {
      setReportYear(parseInt(selectedYear, 10));
    }
  }, [selectedYear]);

  const currentPeriodOptions = PERIOD_OPTIONS[periodType];
  const activePeriod =
    currentPeriodOptions.find((p) => p.index === periodIndex) || currentPeriodOptions[0];

  const handleChangePeriodType = (nextType: PeriodType) => {
    setPeriodType(nextType);
    setPeriodIndex(1);
    setHiddenMonths(new Set());
    setDrilldownCell(null);
  };

  const handleChangePeriodIndex = (idx: number) => {
    setPeriodIndex(idx);
    setHiddenMonths(new Set());
    setDrilldownCell(null);
  };

  const matrix = useMemo(() => {
    return buildStatisticalMatrix(
      notifications,
      activePeriod.months,
      reportYear,
      dateBasis,
      {
        includeHidden: true,
        obmFilter,
      }
    );
  }, [notifications, activePeriod.months, reportYear, dateBasis, obmFilter]);

  const visibleMonths = useMemo(
    () => activePeriod.months.filter((m) => !hiddenMonths.has(m)),
    [activePeriod.months, hiddenMonths]
  );

  const toggleMonthSeries = (month: number) => {
    setHiddenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        // Evita ocultar todos os meses ao mesmo tempo
        if (next.size < activePeriod.months.length - 1) {
          next.add(month);
        }
      }
      return next;
    });
  };

  // KPI metrics
  const kpis = useMemo(() => {
    const sortedCats = [...matrix.rows].sort((a, b) => b.total - a.total);
    const topCategory = sortedCats[0];

    let peakMonth = activePeriod.months[0];
    let peakMonthCount = -1;
    for (const m of activePeriod.months) {
      const val = matrix.totalsByMonth[m] || 0;
      if (val > peakMonthCount) {
        peakMonthCount = val;
        peakMonth = m;
      }
    }

    const indeferidosCount =
      matrix.rows.find((r) => r.category === 'DESPACHO INDEFERIDO')?.total || 0;
    const indeferidosPct =
      matrix.grandTotal > 0
        ? ((indeferidosCount / matrix.grandTotal) * 100).toFixed(1).replace('.', ',')
        : '0,0';

    const topCatPct =
      matrix.grandTotal > 0 && topCategory
        ? ((topCategory.total / matrix.grandTotal) * 100).toFixed(1).replace('.', ',')
        : '0,0';

    return {
      topCategory,
      topCatPct,
      peakMonth,
      peakMonthCount: Math.max(0, peakMonthCount),
      indeferidosCount,
      indeferidosPct,
    };
  }, [matrix, activePeriod.months]);

  // Chart geometry & groups
  const chartGroups = useMemo(() => {
    const groups: Array<{
      key: string;
      label: string;
      valuesByMonth: Record<number, number>;
    }> = matrix.rows.map((row) => ({
      key: row.category,
      label: row.category,
      valuesByMonth: row.byMonth,
    }));

    if (includeTotalInChart) {
      groups.push({
        key: 'TOTAL',
        label: 'TOTAL',
        valuesByMonth: matrix.totalsByMonth,
      });
    }

    return groups;
  }, [matrix, includeTotalInChart]);

  const maxChartValue = useMemo(() => {
    let maxVal = 0;
    for (const grp of chartGroups) {
      for (const m of visibleMonths) {
        const val = grp.valuesByMonth[m] || 0;
        if (val > maxVal) maxVal = val;
      }
    }
    return maxVal;
  }, [chartGroups, visibleMonths]);

  const { maxTick, ticks } = useMemo(() => computeNiceScale(maxChartValue), [maxChartValue]);

  const drilldownRecords = useMemo(() => {
    if (!drilldownCell) return [];
    return matrix.recordsByCell[drilldownCell.key] || [];
  }, [drilldownCell, matrix]);

  const monthsSubtitle = formatMonthsListPT(activePeriod.months);
  const yearOptions = useMemo(() => {
    const set = new Set<number>(availableYears.map((y) => parseInt(y, 10)).filter((n) => !isNaN(n)));
    set.add(reportYear);
    return Array.from(set).sort((a, b) => a - b);
  }, [availableYears, reportYear]);

  // SVG layout constants
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
    setIsGeneratingPdf(true);
    setPdfGeneratedNotice(null);
    try {
      await generateStatisticalPdfReport({
        matrix,
        officialTitle: activePeriod.officialTitle,
        reportYear,
        monthsSubtitle,
        hiddenMonths,
        monthColors: MONTH_SERIES_COLORS,
        svgElement: chartSvgRef.current,
        options: {
          order: 'table-first',
        },
      });
      setPdfGeneratedNotice(
        `PDF do Quadro + Gráfico (${activePeriod.officialTitle} / ${reportYear}) baixado com sucesso. Abra o arquivo .pdf para imprimir.`
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReport = () => {
    setPdfGeneratedNotice(null);
    setIsPrintModalOpen(true);
  };

  return (
    <>
    <div className={isPrintModalOpen ? 'space-y-5 print:hidden' : 'space-y-5'}>
      {/* Control Toolbar (hidden when printing) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-4 sm:p-5 space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200/80 text-red-700 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Relatórios Estatísticos e Gráficos de Solicitações
              </h2>
              <p className="text-xs text-slate-500">
                Consolidação trimestral, quadrimestral e semestral a partir dos processos cadastrados no Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                exportStatisticalMatrixCSV(matrix, activePeriod.officialTitle, reportYear)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV Estatístico</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isGeneratingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Imprimir Quadro + Gráfico'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Baixar arquivo PDF A4 pronto com Gráfico + Quadro Oficial"
            >
              <FileText className="w-3.5 h-3.5 text-red-700" />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>

        {pdfGeneratedNotice && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{pdfGeneratedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfGeneratedNotice(null)}
              className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer shrink-0"
              aria-label="Fechar confirmação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Period Type + Specific Period + Secondary Filters */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-end">
          {/* Tipo de Relatório */}
          <div className="xl:col-span-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Periodicidade do Relatório
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
              {(
                [
                  { id: 'trimestral', label: 'Trimestral' },
                  { id: 'quadrimestral', label: 'Quadrimestral' },
                  { id: 'semestral', label: 'Semestral' },
                ] as const
              ).map((opt) => {
                const active = periodType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleChangePeriodType(opt.id)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subperíodo */}
          <div className="xl:col-span-4">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
              <span>Período de Apuração</span>
            </label>
            <select
              value={activePeriod.index}
              onChange={(e) => handleChangePeriodIndex(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-800 cursor-pointer"
            >
              {currentPeriodOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ano + Data Base + OBM */}
          <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ano</label>
              <select
                value={reportYear}
                onChange={(e) => {
                  setReportYear(Number(e.target.value));
                  setDrilldownCell(null);
                }}
                className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-800 cursor-pointer"
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Data Considerada
              </label>
              <select
                value={dateBasis}
                onChange={(e) => {
                  setDateBasis(e.target.value as ReportDateBasis);
                  setDrilldownCell(null);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-800 cursor-pointer"
              >
                <option value="entrada">Entrada na SST</option>
                <option value="diretor">Ao Diretor</option>
                <option value="pronto">Data do Pronto</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-600 mb-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>OBM / Origem</span>
              </label>
              <select
                value={obmFilter}
                onChange={(e) => {
                  setObmFilter(e.target.value);
                  setDrilldownCell(null);
                }}
                className="w-full px-2.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-800 cursor-pointer"
              >
                <option value="">Todas</option>
                {OBM_LIST.map((obm) => (
                  <option key={obm} value={obm}>
                    {obm}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Display toggles */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTotalInChart}
                onChange={(e) => setIncludeTotalInChart(e.target.checked)}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Incluir barra TOTAL no gráfico</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showBarValues}
                onChange={(e) => setShowBarValues(e.target.checked)}
                className="rounded border-slate-300 text-red-700 focus:ring-red-600"
              />
              <span>Exibir números sobre as barras</span>
            </label>
          </div>

          <span className="text-[11px] text-slate-500">
            Dica: clique em qualquer valor da tabela oficial para listar os processos daquele mês e tipo.
          </span>
        </div>
      </div>

      {/* KPI Strip (hidden in print to preserve clean official form sheet) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total de Solicitações ({activePeriod.officialTitle})</p>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums font-mono">
            {matrix.grandTotal}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Meses: {monthsSubtitle} · {reportYear}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Maior Demanda no Período</p>
          <p className="text-sm font-bold text-slate-900 mt-1.5 truncate" title={kpis.topCategory?.category}>
            {kpis.topCategory && kpis.topCategory.total > 0 ? kpis.topCategory.category : 'Sem dados'}
          </p>
          <p className="text-xs text-slate-600 mt-1 tabular-nums">
            <strong className="font-mono text-slate-900">{kpis.topCategory?.total || 0}</strong> processos ({kpis.topCatPct}%)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Mês de Pico</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {kpis.peakMonthCount > 0 ? MONTH_FULL_PT[kpis.peakMonth] : '—'}
          </p>
          <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
            <strong className="font-mono text-slate-900">{kpis.peakMonthCount}</strong> entrada(s) registrada(s)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Despachos Indeferidos (DI)</p>
          <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums font-mono">
            {kpis.indeferidosCount}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {kpis.indeferidosPct}% do total no período
          </p>
        </div>
      </div>

      {/* Main Content: Official Statistical Table First, Grouped Bar Chart Second */}
      <div className="space-y-5 print:space-y-6">
        {/* Card 1: Official Statistical Matrix + Distribution Share */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Official Table (modeled on attached table image) */}
          <section className="xl:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs p-5 sm:p-6 print:col-span-12 print:border-slate-300 print:shadow-none print:break-inside-avoid">
            {/* Institutional Official Header */}
            <div className="text-center space-y-1 pb-4">
              <div className="w-11 h-11 mx-auto rounded-full bg-red-800 text-white flex items-center justify-center shadow-xs mb-2">
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
                  {activePeriod.officialTitle} / {reportYear}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-200/80 text-slate-900">
                    <th className="border border-slate-800 py-2.5 px-3 text-center font-bold uppercase tracking-wide min-w-[190px]">
                      PROCESSO
                    </th>
                    {activePeriod.months.map((m) => (
                      <th
                        key={m}
                        className="border border-slate-800 py-2.5 px-3 text-center font-bold uppercase w-20"
                      >
                        {MONTH_ABBR[m]}
                      </th>
                    ))}
                    <th className="border border-slate-800 py-2.5 px-3 text-center font-bold uppercase w-24">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.category} className="hover:bg-slate-50/80 transition-colors">
                      <td className="border border-slate-800 py-2.5 px-3 text-center font-bold text-slate-900 uppercase text-xs">
                        {row.category}
                      </td>
                      {activePeriod.months.map((m) => {
                        const val = row.byMonth[m] || 0;
                        const cellKey = `${row.category}::${m}`;
                        const isSelected = drilldownCell?.key === cellKey;
                        return (
                          <td
                            key={m}
                            className={`border border-slate-800 py-2.5 px-2 text-center font-mono tabular-nums ${
                              isSelected ? 'bg-red-50' : ''
                            }`}
                          >
                            {val > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setDrilldownCell({
                                    key: cellKey,
                                    title: `${row.category} · ${MONTH_FULL_PT[m]} / ${reportYear}`,
                                  })
                                }
                                title={`Listar ${val} processo(s) de ${row.category} em ${MONTH_FULL_PT[m]}`}
                                className="w-full py-0.5 rounded font-medium text-slate-900 hover:text-red-700 hover:underline cursor-pointer print:no-underline"
                              >
                                {val}
                              </button>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                        );
                      })}
                      <td
                        className={`border border-slate-800 py-2.5 px-2 text-center font-mono font-bold tabular-nums ${
                          drilldownCell?.key === `${row.category}::TOTAL` ? 'bg-red-50' : ''
                        }`}
                      >
                        {row.total > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDrilldownCell({
                                key: `${row.category}::TOTAL`,
                                title: `${row.category} · ${activePeriod.officialTitle} / ${reportYear}`,
                              })
                            }
                            className="w-full py-0.5 rounded font-bold text-slate-900 hover:text-red-700 hover:underline cursor-pointer print:no-underline"
                          >
                            {row.total}
                          </button>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* TOTAL Row */}
                  <tr className="bg-slate-100/90 font-bold text-slate-900">
                    <td className="border border-slate-800 py-2.5 px-3 text-center uppercase text-xs font-bold">
                      TOTAL
                    </td>
                    {activePeriod.months.map((m) => {
                      const val = matrix.totalsByMonth[m] || 0;
                      const cellKey = `TOTAL::${m}`;
                      return (
                        <td
                          key={m}
                          className={`border border-slate-800 py-2.5 px-2 text-center font-mono font-bold tabular-nums ${
                            drilldownCell?.key === cellKey ? 'bg-red-50' : ''
                          }`}
                        >
                          {val > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDrilldownCell({
                                  key: cellKey,
                                  title: `Todos os tipos · ${MONTH_FULL_PT[m]} / ${reportYear}`,
                                })
                              }
                              className="w-full py-0.5 rounded font-bold text-slate-900 hover:text-red-700 hover:underline cursor-pointer print:no-underline"
                            >
                              {val}
                            </button>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-slate-800 py-2.5 px-2 text-center font-mono font-bold tabular-nums">
                      {matrix.grandTotal > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDrilldownCell({
                              key: 'TOTAL::TOTAL',
                              title: `Todos os processos · ${activePeriod.officialTitle} / ${reportYear}`,
                            })
                          }
                          className="w-full py-0.5 rounded font-bold text-slate-900 hover:text-red-700 hover:underline cursor-pointer print:no-underline"
                        >
                          {matrix.grandTotal}
                        </button>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Participação Percentual por Categoria (hidden in print or compact side panel) */}
          <section className="xl:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4 print:hidden">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Table2 className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Distribuição no Período
              </h3>
            </div>

            <div className="space-y-3.5">
              {REPORT_CATEGORIES.map((category) => {
                const row = matrix.rows.find((r) => r.category === category);
                const count = row?.total || 0;
                const pct = matrix.grandTotal > 0 ? (count / matrix.grandTotal) * 100 : 0;
                const barColor =
                  category === 'CERTIFICADO DE APROVAÇÃO'
                    ? 'bg-blue-600'
                    : category === 'LAUDO DE EXIGÊNCIAS'
                    ? 'bg-emerald-600'
                    : category === 'DESPACHO INDEFERIDO'
                    ? 'bg-rose-600'
                    : category === 'AUTORIZAÇÕES'
                    ? 'bg-amber-600'
                    : 'bg-slate-600';

                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-700 truncate">{category}</span>
                      <span className="font-mono tabular-nums text-slate-600 shrink-0">
                        <strong className="text-slate-900">{count}</strong> ({pct.toFixed(1).replace('.', ',')}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
              Classificação automática baseada na coluna <strong>GRÁFICO</strong> (CAA, LE, DI, AUT, OUT/CDA), com fallback para <strong>DOC. GERADO</strong>, <strong>SITUAÇÃO</strong> e <strong>TIPO</strong>.
            </div>
          </section>
        </div>

        {/* Card 2: Official Grouped Bar Chart (modeled on attached chart image) */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 sm:p-6 print:border-slate-300 print:shadow-none print:break-inside-avoid">
          <div className="text-center space-y-0.5 mb-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-tight">
              Gráfico da Estatística de Solicitações de Processos
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase">
              {activePeriod.officialTitle} / {reportYear}
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 sm:p-5 bg-white relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <span className="text-sm sm:text-base font-medium text-slate-600">
                {monthsSubtitle}
              </span>

              {/* Interactive Legend */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {activePeriod.months.map((m, idx) => {
                  const color = MONTH_SERIES_COLORS[idx % MONTH_SERIES_COLORS.length];
                  const isHidden = hiddenMonths.has(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonthSeries(m)}
                      title={
                        isHidden
                          ? `Clique para exibir ${MONTH_FULL_PT[m]}`
                          : `Clique para ocultar ${MONTH_FULL_PT[m]}`
                      }
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-opacity cursor-pointer print:cursor-default ${
                        isHidden ? 'opacity-35 line-through text-slate-400' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{MONTH_ABBR[m]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {matrix.grandTotal === 0 ? (
              <div className="py-16 text-center space-y-2 text-slate-500">
                <p className="text-sm font-semibold text-slate-700">
                  Sem processos encontrados para {activePeriod.officialTitle} / {reportYear}
                </p>
                <p className="text-xs max-w-md mx-auto">
                  Nenhum registro possui data correspondente neste período. Selecione outro trimestre/quadrimestre/semestre ou importe a planilha CSV atualizada.
                </p>
              </div>
            ) : (
              <div className="relative w-full overflow-x-auto print:overflow-visible">
                <svg
                  ref={chartSvgRef}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[680px] print:min-w-0 h-auto select-none"
                  role="img"
                  aria-label={`Gráfico de solicitações de processos — ${activePeriod.officialTitle} de ${reportYear}`}
                >
                  {/* Horizontal Gridlines & Y-Axis Labels */}
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

                  {/* Grouped Bars per Category */}
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
                    const labelLines = CATEGORY_MULTILINE_LABELS[group.key] || [group.label];

                    return (
                      <g key={group.key}>
                        {visibleMonths.map((month, visIdx) => {
                          const origMonthIdx = activePeriod.months.indexOf(month);
                          const color =
                            MONTH_SERIES_COLORS[origMonthIdx % MONTH_SERIES_COLORS.length];
                          const val = group.valuesByMonth[month] || 0;
                          const ratio = maxTick > 0 ? val / maxTick : 0;
                          const barH = val > 0 ? Math.max(3, ratio * plotHeight) : 0;
                          const bx = barsStartX + visIdx * (barW + barGap);
                          const by = padTop + plotHeight - barH;
                          const monthTotal = matrix.totalsByMonth[month] || 0;

                          return (
                            <g
                              key={month}
                              className="cursor-pointer"
                              onMouseEnter={() =>
                                setHoveredBar({
                                  groupLabel: group.label,
                                  month,
                                  value: val,
                                  monthTotal,
                                  xPct: ((bx + barW / 2) / svgWidth) * 100,
                                  yPct: (by / svgHeight) * 100,
                                })
                              }
                              onMouseLeave={() => setHoveredBar(null)}
                              onClick={() => {
                                if (val > 0) {
                                  const cellKey = `${group.key}::${month}`;
                                  setDrilldownCell({
                                    key: cellKey,
                                    title: `${group.label} · ${MONTH_FULL_PT[month]} / ${reportYear}`,
                                  });
                                }
                              }}
                            >
                              <rect
                                x={bx}
                                y={by}
                                width={barW}
                                height={barH}
                                rx={2.5}
                                ry={2.5}
                                fill={color}
                                className="transition-opacity duration-150 hover:opacity-85"
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

                        {/* Multi-line centered Category Label */}
                        <text
                          x={slotCenter}
                          y={padTop + plotHeight + 18}
                          textAnchor="middle"
                          className="fill-slate-700 text-[10.5px] font-semibold uppercase"
                        >
                          {labelLines.map((line, lineIdx) => (
                            <tspan
                              key={lineIdx}
                              x={slotCenter}
                              dy={lineIdx === 0 ? 0 : 13}
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })}

                  {/* X-Axis Caption ("PROCESSO") */}
                  <text
                    x={padLeft + plotWidth / 2}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-bold uppercase tracking-wider"
                  >
                    PROCESSO
                  </text>
                </svg>

                {/* Hover Tooltip */}
                {hoveredBar && (
                  <div
                    className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap print:hidden"
                    style={{
                      left: `${Math.min(88, Math.max(12, hoveredBar.xPct))}%`,
                      top: `${Math.max(16, hoveredBar.yPct)}%`,
                    }}
                  >
                    <p className="font-bold text-slate-100">{hoveredBar.groupLabel}</p>
                    <p className="text-slate-300 text-[11px] mt-0.5 tabular-nums">
                      {MONTH_FULL_PT[hoveredBar.month]}: <strong className="text-white font-mono">{hoveredBar.value}</strong>{' '}
                      {hoveredBar.groupLabel !== 'TOTAL' && hoveredBar.monthTotal > 0 && (
                        <span>
                          ({((hoveredBar.value / hoveredBar.monthTotal) * 100).toFixed(1).replace('.', ',')}%)
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Drilldown Drawer: Audit exact records behind a clicked table cell or bar */}
        {drilldownCell && (
          <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden print:hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Eye className="w-4 h-4 text-red-700" />
                <span className="font-bold text-slate-800">{drilldownCell.title}</span>
                <span className="text-slate-400" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-slate-700">
                  {drilldownRecords.length} registro(s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownCell(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors cursor-pointer"
                aria-label="Fechar detalhamento"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0">
                    <th className="py-2 px-3">Processo</th>
                    <th className="py-2 px-3">Requerente</th>
                    <th className="py-2 px-3">Tipo</th>
                    <th className="py-2 px-3">Entrada na SST</th>
                    <th className="py-2 px-3">Situação</th>
                    <th className="py-2 px-3">Gráfico / Doc.</th>
                    <th className="py-2 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatProcesso(rec.processo !== undefined ? rec.processo : rec.numero, { codigo: rec.detalhesSST?.codigo, ano: rec.anoExercicio })}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {rec.requerente || rec.edificacao}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {rec.tipoProcesso || rec.tipoDocumento || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatDateBR(rec.detalhesSST?.entradaSST || rec.dataEntrada || rec.dataExpedicao)}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {rec.status}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {rec.detalhesSST?.grafico || '—'}
                        {rec.detalhesSST?.docGerado ? ` · ${rec.detalhesSST.docGerado}` : ''}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditRecord(rec)}
                          className="text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                        >
                          Abrir Ficha
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>

    <StatisticalPrintModal
      isOpen={isPrintModalOpen}
      onClose={() => setIsPrintModalOpen(false)}
      matrix={matrix}
      officialTitle={activePeriod.officialTitle}
      reportYear={reportYear}
      monthsSubtitle={monthsSubtitle}
      hiddenMonths={hiddenMonths}
      monthColors={MONTH_SERIES_COLORS}
      chartGroups={chartGroups}
      visibleMonths={visibleMonths}
      ticks={ticks}
      maxTick={maxTick}
      showBarValues={showBarValues}
      categoryMultilineLabels={CATEGORY_MULTILINE_LABELS}
    />
    </>
  );
};
