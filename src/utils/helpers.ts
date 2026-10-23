import { BuildingNotification } from '../types';

export const CURRENT_DATE_STR = '2026-10-13';

// Mapeamento oficial de prazos por Tipo de Processo definido pelo usuário
export const PRAZOS_POR_TIPO: Record<string, number> = {
  'AUTORIZAÇÃO DE EVENTO': 10,
  'CERTIFICADO DE APROVAÇÃO': 15,
  'LAUDO DE EXIGENCIAS': 30,
  'MODIFICAÇÃO ITEM DE LE': 11,
  'CERTIFICADO DE DESPACHO': 11,
  'EMPRESTIMO DE PLANTA': 5,
  'ACRESCIMO DE AREA': 5,
  'PRORROGAÇÃO DE PRAZO': 60,
  'BAIXA DE NOTIFICAÇÃO': 6,
};

export const TIPOS_PROCESSO_OFICIAIS = [
  'AUTORIZAÇÃO DE EVENTO',
  'CERTIFICADO DE APROVAÇÃO',
  'LAUDO DE EXIGENCIAS',
  'MODIFICAÇÃO ITEM DE LE',
  'CERTIFICADO DE DESPACHO',
  'EMPRESTIMO DE PLANTA',
  'ACRESCIMO DE AREA',
  'PRORROGAÇÃO DE PRAZO',
  'BAIXA DE NOTIFICAÇÃO',
] as const;

/**
 * Normaliza e identifica os dias de prazo legal a partir do Tipo de Processo.
 * Trata variações com e sem acentos, maiúsculas e minúsculas.
 */
export function getDiasPrazoPorTipo(tipo?: string | null): number {
  if (!tipo) return 15;
  const norm = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (norm.includes('AUTORIZACAO DE EVENTO') || norm.includes('EVENTO')) {
    return 10;
  }
  if (norm.includes('CERTIFICADO DE APROVACAO') || norm.includes('APROVACAO')) {
    return 15;
  }
  if (norm.includes('LAUDO DE EXIGENCIA') || norm.includes('LAUDO')) {
    return 30;
  }
  if (norm.includes('MODIFICACAO ITEM') || norm.includes('ITEM DE LE')) {
    return 11;
  }
  if (norm.includes('CERTIFICADO DE DESPACHO') || norm.includes('DESPACHO')) {
    return 11;
  }
  if (norm.includes('EMPRESTIMO DE PLANTA') || norm.includes('PLANTA')) {
    return 5;
  }
  if (norm.includes('ACRESCIMO DE AREA') || norm.includes('ACRESCIMO')) {
    return 5;
  }
  if (norm.includes('PRORROGACAO DE PRAZO') || norm.includes('PRORROGACAO')) {
    return 60;
  }
  if (norm.includes('BAIXA DE NOTIFICACAO') || norm.includes('BAIXA')) {
    return 6;
  }

  return 15;
}

/**
 * Adiciona uma quantidade de dias a uma data (suporta DD/MM/AAAA, YYYY-MM-DD e DD/MM).
 * Garante fidelidade ao exemplo: 01/10/2026 + 30 dias = 31/10/2026.
 */
export function adicionarDiasAData(
  dataStr?: string | null,
  dias: number = 0
): { dataBR: string; dataISO: string } {
  if (!dataStr || dataStr === '-' || dataStr === '- - - -' || dataStr.trim() === '') {
    return { dataBR: '-', dataISO: '' };
  }

  const str = dataStr.trim();
  let ano = 2026;
  let mes = 1;
  let dia = 1;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.slice(0, 10).split('-');
    ano = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    dia = parseInt(parts[2], 10);
  } else if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    ano = parseInt(parts[2], 10);
  } else if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    ano = 2000 + parseInt(parts[2], 10);
  } else if (/^\d{1,2}[\/\.-]\d{1,2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    ano = 2026;
  } else {
    return { dataBR: str, dataISO: str };
  }

  // Cria objeto Date no fuso horário local evitando desvios UTC
  const dataObj = new Date(ano, mes - 1, dia);
  dataObj.setDate(dataObj.getDate() + dias);

  const resDia = String(dataObj.getDate()).padStart(2, '0');
  const resMes = String(dataObj.getMonth() + 1).padStart(2, '0');
  const resAno = dataObj.getFullYear();

  return {
    dataBR: `${resDia}/${resMes}/${resAno}`,
    dataISO: `${resAno}-${resMes}-${resDia}`,
  };
}

export interface InfoPrazoProcesso {
  tipoNormalizado: string;
  diasPrazo: number;
  dataEntradaBR: string;
  dataEntradaISO: string;
  dataLimiteBR: string;
  dataLimiteISO: string;
  diasRestantes: number | null;
  diasEmAtraso: number;
  isVencido: boolean;
  isConcluido: boolean;
  diasNaSST: number;
}

/**
 * Calcula todas as informações consolidadas de prazo de um processo
 * segundo a regra oficial: Data de Entrada na SST + Prazo do Tipo.
 */
export function calcularPrazoProcesso(item: {
  dataEntrada?: string | null;
  dataExpedicao?: string | null;
  tipoProcesso?: string | null;
  tipoDocumento?: string | null;
  status?: string | null;
  dataTramite?: string | null;
  dataValidade?: string | null;
  detalhesSST?: any;
}): InfoPrazoProcesso {
  const tipo = item.tipoProcesso || item.tipoDocumento || 'CERTIFICADO DE APROVAÇÃO';
  const diasPrazo = getDiasPrazoPorTipo(tipo);

  // Data de Entrada na SST (prioriza detalhesSST.entradaSST, dataEntrada, dataExpedicao)
  const entradaCrua =
    item.detalhesSST?.entradaSST ||
    item.dataEntrada ||
    item.dataExpedicao ||
    '01/10/2026';

  const entradaConvertida = adicionarDiasAData(entradaCrua, 0);
  const entradaBR = entradaConvertida.dataBR;
  const entradaISO = entradaConvertida.dataISO;

  // Prazo Limite = Entrada na SST + dias do tipo
  const prazoCalculado = adicionarDiasAData(entradaCrua, diasPrazo);
  const dataLimiteBR = prazoCalculado.dataBR;
  const dataLimiteISO = prazoCalculado.dataISO;

  // Verifica se o processo está concluído/entregue
  const stUpper = String(item.status || '').toUpperCase();
  const isConcluido =
    stUpper === 'ENCERRADO' ||
    stUpper.includes('ENTREGU') ||
    stUpper.includes('DEFERID') ||
    item.detalhesSST?.situacaoDocGerado === 'ENTREGUE';

  // Cálculos de dias restantes e atraso
  let diasRestantes: number | null = null;
  let diasEmAtraso = 0;
  let isVencido = false;
  let diasNaSST = 0;

  if (entradaISO) {
    const dataEntradaTime = new Date(entradaISO).getTime();
    const currentTime = new Date(CURRENT_DATE_STR).getTime();
    diasNaSST = Math.max(0, Math.ceil((currentTime - dataEntradaTime) / (1000 * 60 * 60 * 24)));
  }

  if (dataLimiteISO && !isConcluido) {
    const targetTime = new Date(dataLimiteISO).getTime();
    const currentTime = new Date(CURRENT_DATE_STR).getTime();
    const diff = Math.ceil((targetTime - currentTime) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      isVencido = true;
      diasEmAtraso = Math.abs(diff);
      diasRestantes = 0;
    } else {
      isVencido = false;
      diasRestantes = diff;
      diasEmAtraso = 0;
    }
  }

  return {
    tipoNormalizado: tipo,
    diasPrazo,
    dataEntradaBR: entradaBR,
    dataEntradaISO: entradaISO,
    dataLimiteBR,
    dataLimiteISO,
    diasRestantes,
    diasEmAtraso,
    isVencido,
    isConcluido,
    diasNaSST,
  };
}

export function formatProcesso(num?: number | string | null): string {
  if (num === undefined || num === null || num === '' || num === '-' || num === 'S/N' || num === 's/n') {
    return 'S/N';
  }
  const str = String(num).trim();
  if (str === '' || str === '-' || str.toUpperCase() === 'S/N') return 'S/N';
  const digits = str.replace(/[^\d]/g, '');
  if (!digits) return str;
  return digits.padStart(5, '0');
}

export function formatDateBR(dateString?: string | null): string {
  if (!dateString || dateString === '-' || dateString === '- - - -' || dateString.trim() === '') return '-';
  const str = dateString.trim();

  // If ISO with or without time (YYYY-MM-DD or YYYY-MM-DDTHH:mm...)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // If DD/MM (without year, e.g. 05/01) -> format as DD/MM/2026 (data completa)
  if (/^\d{1,2}[\/\.-]\d{1,2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${day}/${month}/2026`;
  }

  // If DD/MM/YY -> format as DD/MM/20YY
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${day}/${month}/20${parts[2]}`;
  }

  // If DD/MM/YYYY
  if (/^\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${day}/${month}/${parts[2]}`;
  }

  return dateString;
}

export function formatCpfCnpj(val?: string | null): string {
  if (!val || val === '-' || val === '- - - -') return '-';
  const clean = String(val).replace(/[^\d]/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 10) {
    const padded = clean.padStart(11, '0');
    return padded.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return val;
}

export function isExpired(dataValidade?: string | null): boolean {
  if (!dataValidade || dataValidade === '-') return false;
  let iso = dataValidade;
  if (dataValidade.includes('/')) {
    const [d, m, y] = dataValidade.split('/');
    iso = `${y}-${m}-${d}`;
  }
  return iso < CURRENT_DATE_STR;
}

export function getDaysRemaining(dataValidade?: string | null): number | null {
  if (!dataValidade || dataValidade === '-') return null;
  let iso = dataValidade;
  if (dataValidade.includes('/')) {
    const [d, m, y] = dataValidade.split('/');
    iso = `${y}-${m}-${d}`;
  }
  const target = new Date(iso).getTime();
  const current = new Date(CURRENT_DATE_STR).getTime();
  const diffDays = Math.ceil((target - current) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function exportToCSV(items: BuildingNotification[], filename = 'processos-requerentes.csv') {
  const headers = [
    'PROCESSO',
    'REQUERENTE',
    'TIPO',
    'ORIGEM',
    'DATA DE ENTRADA',
    'STATUS',
    'PRAZO LIMITE (DIAS)',
    'DATA LIMITE',
    'OBM',
    'ENDEREÇO',
    'NÚMERO',
    'BAIRRO',
    'MUNICÍPIO',
    'RESPONSÁVEL',
    'CPF/CNPJ',
    'EXIGÊNCIAS',
  ];

  const rows = items.map((item) => {
    const prazo = calcularPrazoProcesso(item);
    return [
      `"${formatProcesso(item.processo !== undefined ? item.processo : item.numero)}"`,
      `"${(item.requerente || item.edificacao).replace(/"/g, '""')}"`,
      `"${(item.tipoProcesso || item.tipoDocumento || 'Processo').replace(/"/g, '""')}"`,
      `"${(item.origem || item.obm).replace(/"/g, '""')}"`,
      `"${prazo.dataEntradaBR}"`,
      `"${item.status}"`,
      `"${prazo.diasPrazo} dias"`,
      `"${prazo.dataLimiteBR}"`,
      `"${item.obm}"`,
      `"${item.endereco.logradouro.replace(/"/g, '""')}"`,
      `"${item.endereco.numero}"`,
      `"${item.endereco.bairro}"`,
      `"${item.endereco.municipio}"`,
      `"${item.proprietario.nomeOuRazaoSocial.replace(/"/g, '""')}"`,
      `"${item.proprietario.cpfOuCnpj}"`,
      `"${item.exigencias.join('; ').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
