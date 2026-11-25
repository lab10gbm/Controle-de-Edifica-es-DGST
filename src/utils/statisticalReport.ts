import { BuildingNotification } from '../types';
import { FiscalizacaoRecord, FiscalizacaoStatus } from '../types/fiscalizacao';

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

export interface GenericStatisticalMatrixRow<Cat extends string = string> {
  category: Cat;
  byMonth: Record<number, number>;
  total: number;
}

export interface GenericStatisticalMatrixResult<
  Rec = BuildingNotification,
  Cat extends string = string,
> {
  months: number[];
  rows: Array<GenericStatisticalMatrixRow<Cat>>;
  totalsByMonth: Record<number, number>;
  grandTotal: number;
  matchedRecords: Rec[];
  recordsByCell: Record<string, Rec[]>; // key: `${category}::${month}` or `${category}::TOTAL` or `TOTAL::${month}`
}

export type StatisticalMatrixResult = GenericStatisticalMatrixResult<
  BuildingNotification,
  ReportCategory
>;

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

// ============================================================================
// MÓDULO INDEPENDENTE DE ESTATÍSTICA PARA FISCALIZAÇÕES
// (Notificações, 1º e 2º Autos de Infração, Interdições/TAC, Encerrados/Canc.)
// ============================================================================

export type FiscalizacaoReportCategory =
  | 'NOTIFICAÇÃO'
  | '1º AUTO DE INFRAÇÃO'
  | '2º AUTO DE INFRAÇÃO'
  | 'INTERDIÇÃO / TAC'
  | 'ENCERRADO / CANCELADO';

export const FISCALIZACAO_REPORT_CATEGORIES: readonly FiscalizacaoReportCategory[] = [
  'NOTIFICAÇÃO',
  '1º AUTO DE INFRAÇÃO',
  '2º AUTO DE INFRAÇÃO',
  'INTERDIÇÃO / TAC',
  'ENCERRADO / CANCELADO',
] as const;

export type FiscalizacaoDateBasis = 'expedicao' | 'atos';

export type FiscalizacaoStatisticalMatrixResult = GenericStatisticalMatrixResult<
  FiscalizacaoRecord,
  FiscalizacaoReportCategory
>;

export function parseBrOrIsoMonthYear(
  rawDate?: string
): { month: number; year: number } | null {
  const clean = String(rawDate || '').trim();
  if (!clean || clean === '-' || clean === '00/00/0000' || clean === '0000-00-00') {
    return null;
  }

  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    if (year > 1900 && month >= 1 && month <= 12) return { month, year };
  }

  const brMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && year > 1900 && month >= 1 && month <= 12) {
      return { month, year };
    }
  }

  return null;
}

export function classifyFiscalizacaoStatus(
  status: FiscalizacaoStatus | string
): FiscalizacaoReportCategory {
  if (status === 'Notificação') return 'NOTIFICAÇÃO';
  if (status === '1º Auto de Infração') return '1º AUTO DE INFRAÇÃO';
  if (status === '2º Auto de Infração') return '2º AUTO DE INFRAÇÃO';
  if (
    status === 'Auto de Interdição por Inércia' ||
    status === 'Auto de Interdição por Perigo iminente' ||
    status === 'TAC em Andamento'
  ) {
    return 'INTERDIÇÃO / TAC';
  }
  return 'ENCERRADO / CANCELADO';
}

export function classifyFiscalizacaoAto(
  tipoAto: string,
  fallbackStatus: FiscalizacaoStatus | string
): FiscalizacaoReportCategory {
  const norm = String(tipoAto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if ((norm.includes('2O') || norm.includes('2º') || norm.includes('SEGUNDO')) && norm.includes('AUTO')) {
    return '2º AUTO DE INFRAÇÃO';
  }
  if (
    norm.includes('1O') ||
    norm.includes('1º') ||
    norm.includes('PRIMEIRO') ||
    norm.includes('AUTO DE INFRACAO')
  ) {
    return '1º AUTO DE INFRAÇÃO';
  }
  if (norm.includes('INTERDIC') || norm.includes('TAC')) {
    return 'INTERDIÇÃO / TAC';
  }
  if (norm.includes('ENCERRAD') || norm.includes('CANCEL') || norm.includes('ARQUIV')) {
    return 'ENCERRADO / CANCELADO';
  }
  if (norm.includes('NOTIFIC')) {
    return 'NOTIFICAÇÃO';
  }
  return classifyFiscalizacaoStatus(fallbackStatus);
}

export function extractFiscalizacaoExpedicaoMonthYear(
  record: FiscalizacaoRecord
): { month: number; year: number } | null {
  const direct = parseBrOrIsoMonthYear(record.dataExpedicao);
  if (direct) return direct;

  for (const ato of record.historicoAtos || []) {
    const parsed = parseBrOrIsoMonthYear(ato.data);
    if (parsed) return parsed;
  }

  return null;
}

export function buildFiscalizacaoStatisticalMatrix(
  records: FiscalizacaoRecord[],
  months: number[],
  targetYear: number,
  dateBasis: FiscalizacaoDateBasis,
  options?: {
    municipioFilter?: string;
    orgaoFilter?: string;
  }
): FiscalizacaoStatisticalMatrixResult {
  const municipioFilter = (options?.municipioFilter || '').trim().toLowerCase();
  const orgaoFilter = (options?.orgaoFilter || '').trim().toLowerCase();

  const matrix: Record<FiscalizacaoReportCategory, Record<number, number>> = {
    NOTIFICAÇÃO: {},
    '1º AUTO DE INFRAÇÃO': {},
    '2º AUTO DE INFRAÇÃO': {},
    'INTERDIÇÃO / TAC': {},
    'ENCERRADO / CANCELADO': {},
  };

  const totalsByMonth: Record<number, number> = {};
  for (const m of months) {
    totalsByMonth[m] = 0;
    for (const cat of FISCALIZACAO_REPORT_CATEGORIES) {
      matrix[cat][m] = 0;
    }
  }

  const matchedRecordIds = new Set<string>();
  const matchedRecords: FiscalizacaoRecord[] = [];
  const recordsByCell: Record<string, FiscalizacaoRecord[]> = {};
  const cellSeen = new Set<string>();

  const pushCellUnique = (key: string, rec: FiscalizacaoRecord) => {
    const dedupe = `${key}::${rec.id}`;
    if (cellSeen.has(dedupe)) return;
    cellSeen.add(dedupe);
    if (!recordsByCell[key]) recordsByCell[key] = [];
    recordsByCell[key].push(rec);
  };

  const registerOccurrence = (
    category: FiscalizacaoReportCategory,
    month: number,
    rec: FiscalizacaoRecord
  ) => {
    matrix[category][month] = (matrix[category][month] || 0) + 1;
    totalsByMonth[month] = (totalsByMonth[month] || 0) + 1;

    if (!matchedRecordIds.has(rec.id)) {
      matchedRecordIds.add(rec.id);
      matchedRecords.push(rec);
    }

    pushCellUnique(`${category}::${month}`, rec);
    pushCellUnique(`${category}::TOTAL`, rec);
    pushCellUnique(`TOTAL::${month}`, rec);
    pushCellUnique('TOTAL::TOTAL', rec);
  };

  for (const rec of records) {
    if (municipioFilter && (rec.municipio || 'Não Informado').toLowerCase() !== municipioFilter) {
      continue;
    }
    if (orgaoFilter && (rec.orgaoPrincipal || '').toLowerCase() !== orgaoFilter) {
      continue;
    }

    if (dateBasis === 'expedicao') {
      const my = extractFiscalizacaoExpedicaoMonthYear(rec);
      if (!my || my.year !== targetYear || !months.includes(my.month)) continue;
      const category = classifyFiscalizacaoStatus(rec.status);
      registerOccurrence(category, my.month, rec);
    } else {
      const atos = rec.historicoAtos || [];
      if (atos.length === 0) {
        const my = extractFiscalizacaoExpedicaoMonthYear(rec);
        if (my && my.year === targetYear && months.includes(my.month)) {
          registerOccurrence(classifyFiscalizacaoStatus(rec.status), my.month, rec);
        }
        continue;
      }

      for (const ato of atos) {
        const my = parseBrOrIsoMonthYear(ato.data);
        if (!my || my.year !== targetYear || !months.includes(my.month)) continue;
        const category = classifyFiscalizacaoAto(ato.tipoAto, rec.status);
        registerOccurrence(category, my.month, rec);
      }
    }
  }

  let grandTotal = 0;
  const rows = FISCALIZACAO_REPORT_CATEGORIES.map((category) => {
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

export function exportFiscalizacaoStatisticalCSV(
  matrix: FiscalizacaoStatisticalMatrixResult,
  periodTitle: string,
  year: number
) {
  const headers = ['MODALIDADE / SITUAÇÃO', ...matrix.months.map((m) => MONTH_ABBR[m]), 'TOTAL'];
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
  link.setAttribute('download', `estatistica-fiscalizacoes-${slug}-${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
