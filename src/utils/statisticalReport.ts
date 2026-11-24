import { BuildingNotification } from '../types';

export type ReportCategory =
  | 'CERTIFICADO DE APROVAÇÃO'
  | 'LAUDO DE EXIGÊNCIAS'
  | 'DESPACHO INDEFERIDO'
  | 'AUTORIZAÇÕES'
  | 'OUTROS';

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
  'CERTIFICADO DE APROVAÇÃO',
  'LAUDO DE EXIGÊNCIAS',
  'DESPACHO INDEFERIDO',
  'AUTORIZAÇÕES',
  'OUTROS',
] as const;

export type PeriodType = 'quadrimestral' | 'trimestral' | 'semestral';
export type ReportDateBasis = 'entrada' | 'diretor' | 'pronto';

export interface PeriodOption {
  index: number;
  label: string;
  officialTitle: string;
  months: number[]; // 1-12
}

export const MONTH_ABBR: Record<number, string> = {
  1: 'JAN',
  2: 'FEV',
  3: 'MAR',
  4: 'ABR',
  5: 'MAI',
  6: 'JUN',
  7: 'JUL',
  8: 'AGO',
  9: 'SET',
  10: 'OUT',
  11: 'NOV',
  12: 'DEZ',
};

export const MONTH_FULL_PT: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};

export const PERIOD_OPTIONS: Record<PeriodType, PeriodOption[]> = {
  quadrimestral: [
    {
      index: 1,
      label: '1º Quadrimestre (Jan–Abr)',
      officialTitle: '1º QUADRIMESTRE',
      months: [1, 2, 3, 4],
    },
    {
      index: 2,
      label: '2º Quadrimestre (Mai–Ago)',
      officialTitle: '2º QUADRIMESTRE',
      months: [5, 6, 7, 8],
    },
    {
      index: 3,
      label: '3º Quadrimestre (Set–Dez)',
      officialTitle: '3º QUADRIMESTRE',
      months: [9, 10, 11, 12],
    },
  ],
  trimestral: [
    {
      index: 1,
      label: '1º Trimestre (Jan–Mar)',
      officialTitle: '1º TRIMESTRE',
      months: [1, 2, 3],
    },
    {
      index: 2,
      label: '2º Trimestre (Abr–Jun)',
      officialTitle: '2º TRIMESTRE',
      months: [4, 5, 6],
    },
    {
      index: 3,
      label: '3º Trimestre (Jul–Set)',
      officialTitle: '3º TRIMESTRE',
      months: [7, 8, 9],
    },
    {
      index: 4,
      label: '4º Trimestre (Out–Dez)',
      officialTitle: '4º TRIMESTRE',
      months: [10, 11, 12],
    },
  ],
  semestral: [
    {
      index: 1,
      label: '1º Semestre (Jan–Jun)',
      officialTitle: '1º SEMESTRE',
      months: [1, 2, 3, 4, 5, 6],
    },
    {
      index: 2,
      label: '2º Semestre (Jul–Dez)',
      officialTitle: '2º SEMESTRE',
      months: [7, 8, 9, 10, 11, 12],
    },
  ],
};

export function classifyProcessCategory(item: BuildingNotification): ReportCategory {
  const grafico = (item.detalhesSST?.grafico || '').trim().toUpperCase();
  if (grafico === 'CAA') return 'CERTIFICADO DE APROVAÇÃO';
  if (grafico === 'LE') return 'LAUDO DE EXIGÊNCIAS';
  if (grafico === 'DI') return 'DESPACHO INDEFERIDO';
  if (grafico === 'AUT') return 'AUTORIZAÇÕES';
  if (grafico === 'OUT' || grafico === 'CDA' || grafico === 'CD') return 'OUTROS';

  const docGerado = (item.detalhesSST?.docGerado || '').trim().toUpperCase();
  if (docGerado && docGerado !== '-' && docGerado !== '- - - -') {
    if (docGerado.startsWith('DI')) return 'DESPACHO INDEFERIDO';
    if (docGerado.startsWith('CAA')) return 'CERTIFICADO DE APROVAÇÃO';
    if (docGerado.startsWith('LE')) return 'LAUDO DE EXIGÊNCIAS';
    if (docGerado.startsWith('A-') || docGerado.startsWith('AUT')) return 'AUTORIZAÇÕES';
    if (docGerado.startsWith('CDA') || docGerado.startsWith('CD') || docGerado.startsWith('OUT')) {
      return 'OUTROS';
    }
  }

  const statusUpper = String(item.status || item.detalhesSST?.situacao || '').toUpperCase();
  if (statusUpper.includes('INDEFERID')) {
    return 'DESPACHO INDEFERIDO';
  }

  const tipoNorm = String(item.tipoProcesso || item.tipoDocumento || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (tipoNorm.includes('CERTIFICADO DE APROVACAO') || tipoNorm.includes('APROVACAO')) {
    return 'CERTIFICADO DE APROVAÇÃO';
  }
  if (tipoNorm.includes('LAUDO DE EXIGENCIA') || tipoNorm.includes('LAUDO')) {
    return 'LAUDO DE EXIGÊNCIAS';
  }
  if (tipoNorm.includes('AUTORIZACAO') || tipoNorm.includes('EVENTO')) {
    return 'AUTORIZAÇÕES';
  }

  return 'OUTROS';
}

export function extractMonthYear(
  item: BuildingNotification,
  dateBasis: ReportDateBasis,
  fallbackYear: number
): { month: number; year: number } | null {
  let raw = '';
  if (dateBasis === 'entrada') {
    raw =
      item.detalhesSST?.entradaSST ||
      item.dataEntrada ||
      item.dataExpedicao ||
      '';
  } else if (dateBasis === 'diretor') {
    raw = item.detalhesSST?.dataAoDiretor || item.detalhesSST?.aoDiretor || '';
  } else {
    raw = item.detalhesSST?.dataPronto || '';
  }

  const clean = String(raw || '').trim();
  if (!clean || clean === '-' || clean === '- - - -') {
    return null;
  }

  const itemYear =
    item.anoExercicio && /^\d{4}$/.test(item.anoExercicio)
      ? parseInt(item.anoExercicio, 10)
      : fallbackYear;

  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (month >= 1 && month <= 12) return { month, year };
  }

  const brFullMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (brFullMatch) {
    const month = parseInt(brFullMatch[2], 10);
    let year = parseInt(brFullMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12) return { month, year };
  }

  const brShortMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})$/);
  if (brShortMatch) {
    const month = parseInt(brShortMatch[2], 10);
    // Tenta inferir ano de dataEntrada/dataExpedicao se entradaSST vier só como DD/MM
    let inferredYear = itemYear;
    const altDate = item.dataEntrada || item.dataExpedicao || '';
    const altIso = altDate.match(/^(\d{4})-/);
    const altBr = altDate.match(/[\/\.-](\d{4})$/);
    if (altIso) inferredYear = parseInt(altIso[1], 10);
    else if (altBr) inferredYear = parseInt(altBr[1], 10);

    if (month >= 1 && month <= 12) return { month, year: inferredYear };
  }

  return null;
}

export interface StatisticalMatrixResult {
  months: number[];
  rows: Array<{
    category: ReportCategory;
    byMonth: Record<number, number>;
    total: number;
  }>;
  totalsByMonth: Record<number, number>;
  grandTotal: number;
  matchedRecords: BuildingNotification[];
  recordsByCell: Record<string, BuildingNotification[]>; // key: `${category}::${month}` or `${category}::TOTAL` or `TOTAL::${month}`
}

export function buildStatisticalMatrix(
  notifications: BuildingNotification[],
  months: number[],
  targetYear: number,
  dateBasis: ReportDateBasis,
  options?: {
    includeHidden?: boolean;
    obmFilter?: string;
  }
): StatisticalMatrixResult {
  const includeHidden = options?.includeHidden ?? false;
  const obmFilter = (options?.obmFilter || '').trim();

  const matrix: Record<ReportCategory, Record<number, number>> = {
    'CERTIFICADO DE APROVAÇÃO': {},
    'LAUDO DE EXIGÊNCIAS': {},
    'DESPACHO INDEFERIDO': {},
    'AUTORIZAÇÕES': {},
    OUTROS: {},
  };

  const totalsByMonth: Record<number, number> = {};
  for (const m of months) {
    totalsByMonth[m] = 0;
    for (const cat of REPORT_CATEGORIES) {
      matrix[cat][m] = 0;
    }
  }

  const matchedRecords: BuildingNotification[] = [];
  const recordsByCell: Record<string, BuildingNotification[]> = {};

  const pushCell = (key: string, item: BuildingNotification) => {
    if (!recordsByCell[key]) recordsByCell[key] = [];
    recordsByCell[key].push(item);
  };

  for (const item of notifications) {
    if (!includeHidden && item.oculto) continue;
    if (obmFilter && item.obm !== obmFilter && item.origem !== obmFilter) continue;

    const my = extractMonthYear(item, dateBasis, targetYear);
    if (!my) continue;
    if (my.year !== targetYear) continue;
    if (!months.includes(my.month)) continue;

    const category = classifyProcessCategory(item);
    matrix[category][my.month] = (matrix[category][my.month] || 0) + 1;
    totalsByMonth[my.month] = (totalsByMonth[my.month] || 0) + 1;
    matchedRecords.push(item);

    pushCell(`${category}::${my.month}`, item);
    pushCell(`${category}::TOTAL`, item);
    pushCell(`TOTAL::${my.month}`, item);
    pushCell('TOTAL::TOTAL', item);
  }

  let grandTotal = 0;
  const rows = REPORT_CATEGORIES.map((category) => {
    const byMonth = matrix[category];
    const total = months.reduce((acc, m) => acc + (byMonth[m] || 0), 0);
    grandTotal += total;
    return {
      category,
      byMonth,
      total,
    };
  });

  return {
    months,
    rows,
    totalsByMonth,
    grandTotal,
    matchedRecords,
    recordsByCell,
  };
}

export function formatMonthsListPT(months: number[]): string {
  const names = months.map((m) => MONTH_ABBR[m]);
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

export function exportStatisticalMatrixCSV(
  matrix: StatisticalMatrixResult,
  periodTitle: string,
  year: number
) {
  const headers = ['PROCESSO', ...matrix.months.map((m) => MONTH_ABBR[m]), 'TOTAL'];
  const csvRows = [
    headers.join(';'),
    ...matrix.rows.map((r) =>
      [`"${r.category}"`, ...matrix.months.map((m) => r.byMonth[m] || 0), r.total].join(';')
    ),
    ['"TOTAL"', ...matrix.months.map((m) => matrix.totalsByMonth[m] || 0), matrix.grandTotal].join(';'),
  ];

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const slug = periodTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `estatistica-cbmerj-${slug}-${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
