import { BilheteItem, BuildingNotification, SSTProcessDetails } from '../types';

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayFormattedExtenso(): string {
  const now = new Date();
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const d = String(now.getDate()).padStart(2, '0');
  const mes = meses[now.getMonth()];
  const y = now.getFullYear();
  return `${d} de ${mes} de ${y}`;
}

export const CURRENT_DATE_STR = getTodayISO();

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

export const CODIGO_POR_TIPO: Record<string, string> = {
  'AUTORIZAÇÃO DE EVENTO': '11075',
  'CERTIFICADO DE APROVAÇÃO': '11220',
  'LAUDO DE EXIGENCIAS': '11220',
  'MODIFICAÇÃO ITEM DE LE': '11220',
  'CERTIFICADO DE DESPACHO': '11210',
  'EMPRESTIMO DE PLANTA': '',
  'ACRESCIMO DE AREA': '11220',
  'PRORROGAÇÃO DE PRAZO': '11220',
  'BAIXA DE NOTIFICAÇÃO': '11220',
};

export interface CodigoProcessoCatalogo {
  codigo: string;
  titulo: string;
  observacao?: string;
}

export const CODIGOS_PROCESSO_LIST: ReadonlyArray<CodigoProcessoCatalogo> = [
  { codigo: '00116', titulo: 'LPCI' },
  { codigo: '11070', titulo: 'Certificado de Vistoria Anual' },
  { codigo: '11075', titulo: 'Autorização (Autorização de Evento)' },
  { codigo: '11077', titulo: 'FARE' },
  {
    codigo: '11210',
    titulo: 'Análise prévia / Parecer Técnico, 2ª via de LE, CA parcial, Quiosque, Modificação de item/projeto e regularização física',
    observacao: 'Site telefonia até 31/03/2026; Acréscimo/Decréscimo até 28/02/2026; Análise de projeto até 31/01/2026; CA até 31/10/2025',
  },
  {
    codigo: '11213',
    titulo: 'Prorrogação de prazo de notificação',
    observacao: 'Válido até 30/04/2026 (após: Portal 11220)',
  },
  {
    codigo: '11215',
    titulo: 'Desinterdição, impugnação/recurso, baixa de notificação ou etapa de cronograma',
    observacao: 'Válido até 30/04/2026 (após: Portal 11220)',
  },
  {
    codigo: '11217',
    titulo: 'Processos simplificados',
    observacao: 'Somente via JUCERJA ou RCPJ',
  },
  {
    codigo: '11218',
    titulo: 'Termo de Ajustamento de Conduta (TAC)',
    observacao: 'Válido até 30/04/2026 (após: Portal 11220)',
  },
  {
    codigo: '11219',
    titulo: 'Cadastramento de profissionais e empresas via Portal do Requerente',
  },
  {
    codigo: '11220',
    titulo: 'Processo Digital (novo Portal do Requerente)',
    observacao: 'Entrada exclusivamente pelo Portal do Requerente',
  },
];

export function getDescricaoCodigoSST(codigo?: string | null): CodigoProcessoCatalogo | null {
  const digits = String(codigo || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  return CODIGOS_PROCESSO_LIST.find((item) => item.codigo === digits) || null;
}

function toIsoDateSafe(dataStr?: string | null): string {
  if (!dataStr) return '';
  const trimmed = dataStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

/**
 * Retorna o código padrão do segmento E27/PROC/COD/ANO correspondente ao Tipo de Processo,
 * considerando as datas-limite de transição da DGST para o Portal do Requerente (11220).
 */
export function getCodigoPorTipo(tipo?: string | null, dataEntrada?: string | null): string {
  if (!tipo) return '';
  const norm = tipo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  const dataISO = toIsoDateSafe(dataEntrada) || getTodayISO();

  if (norm.includes('AUTORIZACAO DE EVENTO') || norm.includes('EVENTO')) {
    return '11075';
  }
  if (norm.includes('PRORROGACAO DE PRAZO') || norm.includes('PRORROGACAO')) {
    return dataISO <= '2026-04-30' ? '11213' : '11220';
  }
  if (norm.includes('BAIXA DE NOTIFICACAO') || norm.includes('BAIXA')) {
    return dataISO <= '2026-04-30' ? '11215' : '11220';
  }
  if (norm.includes('CERTIFICADO DE DESPACHO') || norm.includes('DESPACHO')) {
    return '11210';
  }
  if (norm.includes('EMPRESTIMO DE PLANTA') || norm.includes('PLANTA')) {
    return '';
  }
  if (norm.includes('CERTIFICADO DE APROVACAO') || norm.includes('APROVACAO')) {
    return dataISO <= '2025-10-31' ? '11210' : '11220';
  }
  if (norm.includes('LAUDO DE EXIGENCIA') || norm.includes('LAUDO')) {
    return dataISO <= '2026-01-31' ? '11210' : '11220';
  }
  if (norm.includes('ACRESCIMO DE AREA') || norm.includes('ACRESCIMO')) {
    return dataISO <= '2026-02-28' ? '11210' : '11220';
  }
  if (norm.includes('MODIFICACAO ITEM') || norm.includes('ITEM DE LE')) {
    return '11220';
  }

  return '';
}

/**
 * Dado o código numérico do 3º bloco (ex: 11075), retorna o Tipo de Processo correspondente.
 * Quando um código abrange múltiplos tipos (ex: 11210 ou 11220) e o tipo atual
 * já é compatível com esse código, retorna null para preservar a seleção do usuário.
 */
export function getTipoPorCodigo(
  codigo?: string | null,
  currentTipo?: string | null
): string | null {
  const digits = String(codigo || '').replace(/[^\d]/g, '');
  if (!digits) return null;

  const normCurrent = String(currentTipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (digits === '11075') {
    return 'AUTORIZAÇÃO DE EVENTO';
  }
  if (digits === '11213') {
    return 'PRORROGAÇÃO DE PRAZO';
  }
  if (digits === '11215') {
    return 'BAIXA DE NOTIFICAÇÃO';
  }
  if (digits === '11210') {
    if (
      normCurrent.includes('LAUDO') ||
      normCurrent.includes('DESPACHO') ||
      normCurrent.includes('MODIFICACAO') ||
      normCurrent.includes('ACRESCIMO') ||
      normCurrent.includes('APROVACAO')
    ) {
      return null;
    }
    return 'LAUDO DE EXIGENCIAS';
  }
  if (digits === '11220') {
    if (
      normCurrent.includes('APROVACAO') ||
      normCurrent.includes('LAUDO') ||
      normCurrent.includes('MODIFICACAO') ||
      normCurrent.includes('ACRESCIMO') ||
      normCurrent.includes('DESPACHO') ||
      normCurrent.includes('PRORROGACAO') ||
      normCurrent.includes('BAIXA')
    ) {
      return null;
    }
    return 'CERTIFICADO DE APROVAÇÃO';
  }

  return null;
}

/**
 * Converte uma data em string (YYYY-MM-DD, YYYY-MM-DDTHH:mm, DD/MM/AAAA, DD/MM/AA, DD/MM)
 * para ISO puro YYYY-MM-DD zerando qualquer componente de hora/minuto/fuso horário.
 */
export function normalizeToISODate(
  dataStr?: string | null,
  fallbackYear?: number
): string {
  if (!dataStr || dataStr === '-' || dataStr === '- - - -' || dataStr.trim() === '') {
    return '';
  }

  const str = dataStr.trim();
  const refYear = fallbackYear && Number.isFinite(fallbackYear) ? fallbackYear : new Date().getFullYear();

  let ano = 0;
  let mes = 0;
  let dia = 0;

  // ISO com ou sem horário (ex: 2026-11-18T16:45:00Z -> pega apenas 2026-11-18)
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    ano = parseInt(isoMatch[1], 10);
    mes = parseInt(isoMatch[2], 10);
    dia = parseInt(isoMatch[3], 10);
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
    ano = refYear;
  } else {
    return '';
  }

  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return '';
  }

  const utcDate = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    utcDate.getUTCFullYear() !== ano ||
    utcDate.getUTCMonth() !== mes - 1 ||
    utcDate.getUTCDate() !== dia
  ) {
    return '';
  }

  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function isoToDateBR(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Adiciona uma quantidade de dias corridos a uma data usando aritmética UTC pura (00:00:00Z),
 * evitando qualquer distorção de fuso horário ou horário de verão.
 */
export function adicionarDiasAData(
  dataStr?: string | null,
  dias: number = 0,
  fallbackYear?: number
): { dataBR: string; dataISO: string } {
  if (!dataStr || dataStr === '-' || dataStr === '- - - -' || dataStr.trim() === '') {
    return { dataBR: '-', dataISO: '' };
  }

  const baseISO = normalizeToISODate(dataStr, fallbackYear);
  if (!baseISO) {
    const trimmed = dataStr.trim();
    return { dataBR: trimmed, dataISO: trimmed };
  }

  const [ano, mes, dia] = baseISO.split('-').map(Number);
  const utcObj = new Date(Date.UTC(ano, mes - 1, dia + dias));

  const resDia = String(utcObj.getUTCDate()).padStart(2, '0');
  const resMes = String(utcObj.getUTCMonth() + 1).padStart(2, '0');
  const resAno = utcObj.getUTCFullYear();
  const dataISO = `${resAno}-${resMes}-${resDia}`;

  return {
    dataBR: `${resDia}/${resMes}/${resAno}`,
    dataISO,
  };
}

/**
 * Diferença calendário pura entre duas datas ISO (YYYY-MM-DD), sempre em dias inteiros UTC (00:00:00).
 */
export function diffDaysISO(startISO?: string | null, endISO?: string | null): number {
  if (!startISO || !endISO) return 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO) || !/^\d{4}-\d{2}-\d{2}$/.test(endISO)) return 0;
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const startUTC = Date.UTC(sy, sm - 1, sd);
  const endUTC = Date.UTC(ey, em - 1, ed);
  return Math.round((endUTC - startUTC) / 86_400_000);
}

/**
 * Contagem INCLUSIVA de dias corridos entre duas datas ISO:
 * Fórmula: (Data Fim - Data Início) + 1
 */
export function calcularDiasInclusivosISO(startISO?: string | null, endISO?: string | null): number {
  if (!startISO || !endISO) return 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO) || !/^\d{4}-\d{2}-\d{2}$/.test(endISO)) return 0;
  return diffDaysISO(startISO, endISO) + 1;
}

export const LIMITE_MAX_BILHETES_PROCESSO = 5;
export const PRAZO_MAX_BILHETE_DIAS = 15;
export const STATUS_INDEFERIDO_DECURSO_BILHETE = 'Alerta: Prazo do bilhete excedido (> 15d) — passível de indeferimento';

export interface BlocoHistoricoPrazo {
  ordem: number;
  tipo: 'TRAMITE' | 'BILHETE_PAUSA' | 'BILHETE_ABERTO' | 'BILHETE_EXPIRADO' | 'TRAMITE_FINAL';
  titulo: string;
  descricao: string;
  dataInicioBR: string;
  dataInicioISO: string;
  dataFimBR: string;
  dataFimISO: string;
  dias: number;
  limiteBilheteBR?: string;
  limiteBilheteISO?: string;
  dataIndeferimentoBR?: string;
  dataIndeferimentoISO?: string;
  saldoAntes?: number;
  saldoApos?: number;
  excedeuLimite?: boolean;
}

export interface EventoBilheteEntrada {
  dataBilhete: string;
  dataRetorno?: string | null;
  rotuloBilhete?: string;
  rotuloRetorno?: string;
  isFinal?: boolean;
  finalRotulo?: string;
}

export interface CalculoPrazoDetalhadoInput {
  dataEntrada: string;
  prazoTotalDias?: number;
  bilhetes?: EventoBilheteEntrada[];
  dataReferencia?: string | null;
  dataPronto?: string | null;
  isConcluidoExterno?: boolean;
}

export interface CalculoPrazoDetalhadoResult {
  statusProcesso: string;
  diasPrazoTotal: number;
  diasConsumidosTotal: number;
  saldoDiasRestantes: number;
  dataLimiteFinal: string;
  dataLimiteFinalBR: string;
  dataLimiteFinalISO: string;
  dataIndeferimento: string | null;
  dataIndeferimentoBR?: string;
  dataIndeferimentoISO?: string;
  indeferidoPorDecursoBilhete: boolean;
  prazoBilheteAtivo: boolean;
  bilheteAtivoRotulo?: string;
  bilheteAtivoDataBR?: string;
  bilheteAtivoDataISO?: string;
  bilheteAtivoLimiteBR?: string;
  bilheteAtivoLimiteISO?: string;
  bilheteAtivoDiasDecorridos?: number;
  ultimoRetornoDataBR?: string;
  hasRetornoContinuo: boolean;
  diasBonusBilhetes: number;
  bilhetesCount: number;
  historicoBlocos: BlocoHistoricoPrazo[];
}

/**
 * Engine pura de cálculo de prazos por contagem inclusiva, pausas por bilhete (máx 5, até 15 dias cada)
 * e retomada no retorno.
 *
 * Regras:
 * 1. Contagem inclusiva: Dias = (Data Fim - Data Início) + 1 (sempre com horas zeradas em UTC).
 * 2. Entrada inicia o relógio principal (ex: 10 dias ou prazo legal do tipo).
 * 3. Bilhete pausa o relógio principal na data da emissão (o dia do bilhete é consumido no bloco atual)
 *    e abre sub-relógio paralelo de até 15 dias corridos inclusivos (limite no 15º dia = bilhete + 14d).
 * 4. Se o retorno (ou a data atual se aberto) ultrapassar 15 dias (> 15), gera alerta de decurso no 16º dia
 *    (passível de indeferimento manual, sem alterar o status automaticamente) e trava o relógio principal.
 * 5. No retorno dentro dos 15 dias, o bilhete encerra e o relógio principal retoma na própria data do retorno
 *    consumindo o saldo restante até zerar (Data Limite Final = Data Início Bloco + (Saldo - 1)).
 */
export function calcularPrazoDetalhado(input: CalculoPrazoDetalhadoInput): CalculoPrazoDetalhadoResult {
  const prazoTotalDias = Math.max(1, Math.floor(input.prazoTotalDias ?? 10));
  const entradaISO = normalizeToISODate(input.dataEntrada);

  if (!entradaISO) {
    return {
      statusProcesso: 'Sem data de entrada',
      diasPrazoTotal: prazoTotalDias,
      diasConsumidosTotal: 0,
      saldoDiasRestantes: prazoTotalDias,
      dataLimiteFinal: '-',
      dataLimiteFinalBR: '-',
      dataLimiteFinalISO: '',
      dataIndeferimento: null,
      indeferidoPorDecursoBilhete: false,
      prazoBilheteAtivo: false,
      hasRetornoContinuo: false,
      diasBonusBilhetes: 0,
      bilhetesCount: 0,
      historicoBlocos: [],
    };
  }

  const entradaYear = parseInt(entradaISO.slice(0, 4), 10);
  const todayISO = getTodayISO();
  const dataProntoISO = normalizeToISODate(input.dataPronto, entradaYear);
  const dataRefISO =
    normalizeToISODate(input.dataReferencia, entradaYear) ||
    dataProntoISO ||
    todayISO;
  const isConcluidoExterno = Boolean(input.isConcluidoExterno || dataProntoISO);

  const rawEventos = (input.bilhetes || []).slice(0, LIMITE_MAX_BILHETES_PROCESSO);
  const historicoBlocos: BlocoHistoricoPrazo[] = [];

  let cursorInicioISO = entradaISO;
  let saldoClock = prazoTotalDias;
  let diasConsumidosClock = 0;
  let totalDiasEmPausa = 0;
  let hasRetornoContinuo = false;
  let ultimoRetornoDataBR: string | undefined;

  let indeferidoPorDecursoBilhete = false;
  let dataIndeferimentoISO = '';
  let dataLimiteFinalISO = '';
  let prazoBilheteAtivo = false;
  let bilheteAtivoRotulo: string | undefined;
  let bilheteAtivoDataISO: string | undefined;
  let bilheteAtivoLimiteISO: string | undefined;
  let bilheteAtivoDiasDecorridos: number | undefined;
  let blocoSeq = 1;
  let tramBlocoNum = 1;
  let bilheteNum = 1;
  let clockExhaustedBeforeEnd = false;

  for (let evIdx = 0; evIdx < rawEventos.length; evIdx++) {
    const ev = rawEventos[evIdx];
    const bISO = normalizeToISODate(ev.dataBilhete, entradaYear);
    if (!bISO) continue;

    // 1) Consumo do relógio principal até a data do bilhete (inclusivo)
    const saldoAntes = saldoClock;
    let diasBloco = 0;

    if (bISO >= cursorInicioISO) {
      diasBloco = calcularDiasInclusivosISO(cursorInicioISO, bISO);
    }

    if (saldoAntes > 0 && diasBloco > saldoAntes && !clockExhaustedBeforeEnd) {
      // Relógio principal zerou antes da emissão deste bilhete
      const dataZerouISO = adicionarDiasAData(cursorInicioISO, saldoAntes - 1).dataISO;
      dataLimiteFinalISO = dataZerouISO;
      clockExhaustedBeforeEnd = true;
    }

    const diasConsumidosEfetivos = Math.min(saldoAntes, diasBloco);
    diasConsumidosClock += diasConsumidosEfetivos;
    saldoClock = Math.max(0, saldoAntes - diasBloco);

    if (saldoClock === 0 && !dataLimiteFinalISO && diasBloco > 0) {
      dataLimiteFinalISO = bISO;
      clockExhaustedBeforeEnd = true;
    }

    historicoBlocos.push({
      ordem: blocoSeq++,
      tipo: 'TRAMITE',
      titulo: `Bloco ${tramBlocoNum} (${tramBlocoNum === 1 ? 'Entrada' : `Retorno ${tramBlocoNum - 1}`} até ${ev.rotuloBilhete || `Bilhete ${bilheteNum}`})`,
      descricao: `${isoToDateBR(cursorInicioISO)} a ${isoToDateBR(bISO)} = ${diasBloco} dia(s) consumido(s). Saldo restante: ${saldoClock} dia(s).`,
      dataInicioBR: isoToDateBR(cursorInicioISO),
      dataInicioISO: cursorInicioISO,
      dataFimBR: isoToDateBR(bISO),
      dataFimISO: bISO,
      dias: diasBloco,
      saldoAntes,
      saldoApos: saldoClock,
    });
    tramBlocoNum++;

    // 2) Sub-relógio paralelo do bilhete (máximo 15 dias inclusivos)
    const limiteBilheteISO = adicionarDiasAData(bISO, PRAZO_MAX_BILHETE_DIAS - 1).dataISO; // 15º dia
    const dataIndefPrevistaISO = adicionarDiasAData(bISO, PRAZO_MAX_BILHETE_DIAS).dataISO; // 16º dia
    const rISO = normalizeToISODate(ev.dataRetorno, entradaYear);
    const nextEv = rawEventos
      .slice(evIdx + 1)
      .find((n) => Boolean(normalizeToISODate(n.dataBilhete, entradaYear)));
    const nextBISO = nextEv ? normalizeToISODate(nextEv.dataBilhete, entradaYear) : '';

    if (rISO) {
      const diasBilhete = rISO >= bISO ? calcularDiasInclusivosISO(bISO, rISO) : 1;

      if (diasBilhete > PRAZO_MAX_BILHETE_DIAS && !isConcluidoExterno && !nextEv) {
        indeferidoPorDecursoBilhete = true;
        dataIndeferimentoISO = dataIndefPrevistaISO;
        dataLimiteFinalISO = dataIndefPrevistaISO;

        historicoBlocos.push({
          ordem: blocoSeq++,
          tipo: 'BILHETE_EXPIRADO',
          titulo: `${ev.rotuloBilhete || `Bilhete ${bilheteNum}`} (Prazo de 15d excedido)`,
          descricao: `${isoToDateBR(bISO)} a ${isoToDateBR(rISO)} = ${diasBilhete} dia(s) (limite: ${isoToDateBR(limiteBilheteISO)}). Prazo de 15d excedido em ${isoToDateBR(dataIndefPrevistaISO)} — passível de indeferimento manual.`,
          dataInicioBR: isoToDateBR(bISO),
          dataInicioISO: bISO,
          dataFimBR: isoToDateBR(rISO),
          dataFimISO: rISO,
          dias: diasBilhete,
          limiteBilheteBR: isoToDateBR(limiteBilheteISO),
          limiteBilheteISO,
          dataIndeferimentoBR: isoToDateBR(dataIndefPrevistaISO),
          dataIndeferimentoISO: dataIndefPrevistaISO,
          saldoAntes: saldoClock,
          saldoApos: saldoClock,
          excedeuLimite: true,
        });
        break;
      }

      // Retorno válido (ou seguido de novo bilhete / já concluído): encerra pausa e retoma relógio na data do retorno
      const diasPausaEfetiva = Math.max(0, diffDaysISO(bISO, rISO));
      totalDiasEmPausa += diasPausaEfetiva;
      hasRetornoContinuo = true;
      ultimoRetornoDataBR = isoToDateBR(rISO);

      historicoBlocos.push({
        ordem: blocoSeq++,
        tipo: 'BILHETE_PAUSA',
        titulo: `${ev.rotuloBilhete || `Bilhete ${bilheteNum}`} → ${ev.rotuloRetorno || `Retorno ${bilheteNum}`}`,
        descricao: `Pausa de ${isoToDateBR(bISO)} a ${isoToDateBR(rISO)} = ${diasBilhete} dia(s) no sub-relógio (máx. 15d -> ${diasBilhete > PRAZO_MAX_BILHETE_DIAS ? 'excedido, seguido por novo bilhete' : diasBilhete === 15 ? 'no limite exato' : 'OK'}). Retoma com saldo de ${saldoClock} dia(s).`,
        dataInicioBR: isoToDateBR(bISO),
        dataInicioISO: bISO,
        dataFimBR: isoToDateBR(rISO),
        dataFimISO: rISO,
        dias: diasBilhete,
        limiteBilheteBR: isoToDateBR(limiteBilheteISO),
        limiteBilheteISO,
        saldoAntes: saldoClock,
        saldoApos: saldoClock,
        excedeuLimite: diasBilhete > PRAZO_MAX_BILHETE_DIAS,
      });

      cursorInicioISO = rISO;
      bilheteNum++;
    } else if (ev.isFinal) {
      // Despacho final direto (ex: GERADO DI / FINALIZADO sem retorno intermediário)
      historicoBlocos.push({
        ordem: blocoSeq++,
        tipo: 'BILHETE_PAUSA',
        titulo: `${ev.rotuloBilhete || `Bilhete ${bilheteNum}`} (${ev.finalRotulo || 'Despacho Final'})`,
        descricao: `Encerramento registrado em ${isoToDateBR(bISO)}.`,
        dataInicioBR: isoToDateBR(bISO),
        dataInicioISO: bISO,
        dataFimBR: isoToDateBR(bISO),
        dataFimISO: bISO,
        dias: 1,
        limiteBilheteBR: isoToDateBR(limiteBilheteISO),
        limiteBilheteISO,
        saldoAntes: saldoClock,
        saldoApos: saldoClock,
        excedeuLimite: false,
      });
      cursorInicioISO = bISO;
      bilheteNum++;
    } else if (nextEv && nextBISO) {
      // Bilhete anterior sem retorno registrado, porém sucedido diretamente por um novo bilhete (ex: Bilhete 1 -> Bilhete 2)
      const diasEntreBilhetes = nextBISO >= bISO ? calcularDiasInclusivosISO(bISO, nextBISO) : 1;
      totalDiasEmPausa += Math.max(0, diffDaysISO(bISO, nextBISO));

      historicoBlocos.push({
        ordem: blocoSeq++,
        tipo: 'BILHETE_PAUSA',
        titulo: `${ev.rotuloBilhete || `Bilhete ${bilheteNum}`} → ${nextEv.rotuloBilhete || `Bilhete ${bilheteNum + 1}`}`,
        descricao: `Emitido em ${isoToDateBR(bISO)} e sucedido por ${nextEv.rotuloBilhete || `Bilhete ${bilheteNum + 1}`} em ${isoToDateBR(nextBISO)} (sem retorno intermediário registrado).`,
        dataInicioBR: isoToDateBR(bISO),
        dataInicioISO: bISO,
        dataFimBR: isoToDateBR(nextBISO),
        dataFimISO: nextBISO,
        dias: diasEntreBilhetes,
        limiteBilheteBR: isoToDateBR(limiteBilheteISO),
        limiteBilheteISO,
        saldoAntes: saldoClock,
        saldoApos: saldoClock,
        excedeuLimite: false,
      });

      cursorInicioISO = nextBISO >= bISO ? nextBISO : bISO;
      bilheteNum++;
    } else {
      // Bilhete ainda em aberto (sem retorno)
      const diasBilheteAtual = dataRefISO >= bISO ? calcularDiasInclusivosISO(bISO, dataRefISO) : 1;

      if (!isConcluidoExterno && diasBilheteAtual > PRAZO_MAX_BILHETE_DIAS) {
        indeferidoPorDecursoBilhete = true;
        dataIndeferimentoISO = dataIndefPrevistaISO;
        dataLimiteFinalISO = dataIndefPrevistaISO;

        historicoBlocos.push({
          ordem: blocoSeq++,
          tipo: 'BILHETE_EXPIRADO',
          titulo: `${ev.rotuloBilhete || `Bilhete ${bilheteNum}`} (Sem retorno após 15d)`,
          descricao: `Iniciado em ${isoToDateBR(bISO)} (${diasBilheteAtual} dias até ${isoToDateBR(dataRefISO)}). Limite era ${isoToDateBR(limiteBilheteISO)}. Prazo de 15d excedido em ${isoToDateBR(dataIndefPrevistaISO)} — passível de indeferimento manual.`,
          dataInicioBR: isoToDateBR(bISO),
          dataInicioISO: bISO,
          dataFimBR: isoToDateBR(dataRefISO),
          dataFimISO: dataRefISO,
          dias: diasBilheteAtual,
          limiteBilheteBR: isoToDateBR(limiteBilheteISO),
          limiteBilheteISO,
          dataIndeferimentoBR: isoToDateBR(dataIndefPrevistaISO),
          dataIndeferimentoISO: dataIndefPrevistaISO,
          saldoAntes: saldoClock,
          saldoApos: saldoClock,
          excedeuLimite: true,
        });
      } else {
        prazoBilheteAtivo = !isConcluidoExterno;
        bilheteAtivoRotulo = ev.rotuloBilhete || `Bilhete ${bilheteNum}`;
        bilheteAtivoDataISO = bISO;
        bilheteAtivoLimiteISO = limiteBilheteISO;
        bilheteAtivoDiasDecorridos = diasBilheteAtual;
        if (!isConcluidoExterno) {
          dataLimiteFinalISO = limiteBilheteISO;
        }

        historicoBlocos.push({
          ordem: blocoSeq++,
          tipo: 'BILHETE_ABERTO',
          titulo: `${bilheteAtivoRotulo} (Pausa em andamento)`,
          descricao: `Iniciado em ${isoToDateBR(bISO)}: ${diasBilheteAtual}/15 dia(s) decorrido(s) até ${isoToDateBR(dataRefISO)}. Limite para retorno: ${isoToDateBR(limiteBilheteISO)} (alerta de excesso no 16º dia: ${isoToDateBR(dataIndefPrevistaISO)}).`,
          dataInicioBR: isoToDateBR(bISO),
          dataInicioISO: bISO,
          dataFimBR: isoToDateBR(dataRefISO),
          dataFimISO: dataRefISO,
          dias: diasBilheteAtual,
          limiteBilheteBR: isoToDateBR(limiteBilheteISO),
          limiteBilheteISO,
          dataIndeferimentoBR: isoToDateBR(dataIndefPrevistaISO),
          dataIndeferimentoISO: dataIndefPrevistaISO,
          saldoAntes: saldoClock,
          saldoApos: saldoClock,
          excedeuLimite: false,
        });
      }
      // Bilhete aberto interrompe a projeção do relógio principal até haver retorno
      break;
    }
  }

  // 3) Se não foi indeferido por bilhete e não está pausado em bilhete aberto, calcula o bloco final do relógio principal
  let diasConsumidosAteReferencia = diasConsumidosClock;
  let saldoDiasRestantesAtual = saldoClock;

  if (!indeferidoPorDecursoBilhete && !prazoBilheteAtivo) {
    if (!clockExhaustedBeforeEnd && saldoClock > 0) {
      dataLimiteFinalISO = adicionarDiasAData(cursorInicioISO, saldoClock - 1).dataISO;

      historicoBlocos.push({
        ordem: blocoSeq++,
        tipo: 'TRAMITE_FINAL',
        titulo: `Bloco ${tramBlocoNum} (${tramBlocoNum === 1 ? 'Entrada' : `Retorno ${tramBlocoNum - 1}`} até Vencimento)`,
        descricao: `Retoma em ${isoToDateBR(cursorInicioISO)} consumindo os ${saldoClock} dia(s) restante(s) → Data Limite Final: ${isoToDateBR(dataLimiteFinalISO)}.`,
        dataInicioBR: isoToDateBR(cursorInicioISO),
        dataInicioISO: cursorInicioISO,
        dataFimBR: isoToDateBR(dataLimiteFinalISO),
        dataFimISO: dataLimiteFinalISO,
        dias: saldoClock,
        saldoAntes: saldoClock,
        saldoApos: 0,
      });
    } else if (!dataLimiteFinalISO) {
      dataLimiteFinalISO = cursorInicioISO;
    }

    // Calcula dias consumidos e saldo restante exatamente na data de referência (dataPronto ou hoje)
    if (dataRefISO < cursorInicioISO) {
      diasConsumidosAteReferencia = diasConsumidosClock;
      saldoDiasRestantesAtual = saldoClock;
    } else if (dataRefISO >= dataLimiteFinalISO) {
      diasConsumidosAteReferencia = prazoTotalDias;
      saldoDiasRestantesAtual = 0;
    } else {
      const consumidoNoBloco = calcularDiasInclusivosISO(cursorInicioISO, dataRefISO);
      diasConsumidosAteReferencia = Math.min(prazoTotalDias, diasConsumidosClock + consumidoNoBloco);
      saldoDiasRestantesAtual = Math.max(0, prazoTotalDias - diasConsumidosAteReferencia);
    }
  }

  // Determina statusProcesso textual detalhado
  let statusProcesso = 'Em andamento';
  if (indeferidoPorDecursoBilhete) {
    statusProcesso = STATUS_INDEFERIDO_DECURSO_BILHETE;
  } else if (isConcluidoExterno) {
    if (dataProntoISO && dataLimiteFinalISO) {
      statusProcesso = dataProntoISO <= dataLimiteFinalISO ? 'Concluído no prazo' : 'Concluído com atraso';
    } else {
      statusProcesso = 'Concluído';
    }
  } else if (prazoBilheteAtivo) {
    statusProcesso = `Aguardando retorno (${bilheteAtivoDiasDecorridos ?? 1}/15 dias)`;
  } else if (dataLimiteFinalISO && dataRefISO > dataLimiteFinalISO) {
    statusProcesso = 'Prazo vencido';
  } else {
    statusProcesso = 'No prazo';
  }

  const dataLimiteBaseISO = adicionarDiasAData(entradaISO, prazoTotalDias - 1).dataISO;
  const diasBonusBilhetes = prazoBilheteAtivo
    ? PRAZO_MAX_BILHETE_DIAS
    : dataLimiteFinalISO && dataLimiteBaseISO
    ? Math.max(0, totalDiasEmPausa || diffDaysISO(dataLimiteBaseISO, dataLimiteFinalISO))
    : 0;

  return {
    statusProcesso,
    diasPrazoTotal: prazoTotalDias,
    diasConsumidosTotal: diasConsumidosAteReferencia,
    saldoDiasRestantes: saldoDiasRestantesAtual,
    dataLimiteFinal: indeferidoPorDecursoBilhete
      ? isoToDateBR(dataIndeferimentoISO)
      : isoToDateBR(dataLimiteFinalISO),
    dataLimiteFinalBR: isoToDateBR(dataLimiteFinalISO),
    dataLimiteFinalISO,
    dataIndeferimento: dataIndeferimentoISO ? isoToDateBR(dataIndeferimentoISO) : null,
    dataIndeferimentoBR: dataIndeferimentoISO ? isoToDateBR(dataIndeferimentoISO) : undefined,
    dataIndeferimentoISO: dataIndeferimentoISO || undefined,
    indeferidoPorDecursoBilhete,
    prazoBilheteAtivo,
    bilheteAtivoRotulo,
    bilheteAtivoDataBR: bilheteAtivoDataISO ? isoToDateBR(bilheteAtivoDataISO) : undefined,
    bilheteAtivoDataISO,
    bilheteAtivoLimiteBR: bilheteAtivoLimiteISO ? isoToDateBR(bilheteAtivoLimiteISO) : undefined,
    bilheteAtivoLimiteISO,
    bilheteAtivoDiasDecorridos,
    ultimoRetornoDataBR,
    hasRetornoContinuo,
    diasBonusBilhetes,
    bilhetesCount: rawEventos.length,
    historicoBlocos,
  };
}

export interface InfoPrazoProcesso {
  tipoNormalizado: string;
  statusProcesso: string;
  diasPrazo: number;
  diasPrazoEfetivo: number;
  diasBonusBilhetes: number;
  diasConsumidosTotal: number;
  saldoDiasRestantes: number;
  prazoBilheteAtivo: boolean;
  bilheteAtivoRotulo?: string;
  bilheteAtivoDataBR?: string;
  bilheteAtivoLimiteBR?: string;
  bilheteAtivoDiasDecorridos?: number;
  indeferidoPorDecursoBilhete: boolean;
  dataIndeferimentoBR?: string;
  dataIndeferimentoISO?: string;
  hasRetornoContinuo: boolean;
  ultimoRetornoDataBR?: string;
  dataEntradaBR: string;
  dataEntradaISO: string;
  dataLimiteBaseBR: string;
  dataLimiteBaseISO: string;
  dataLimiteBR: string;
  dataLimiteISO: string;
  dataProntoBR?: string;
  dataProntoISO?: string;
  hasDataPronto: boolean;
  diasRestantes: number | null;
  diasEmAtraso: number;
  isVencido: boolean;
  isConcluido: boolean;
  concluidoNoPrazo: boolean;
  diasNaSST: number;
  historicoBlocos: BlocoHistoricoPrazo[];
}

function extrairCiclosBilhetesParaCalculo(
  sst: SSTProcessDetails | undefined,
  entradaYear: number
): EventoBilheteEntrada[] {
  if (!sst) return [];
  const hasAny = Boolean(
    (sst.listaBilhetes && sst.listaBilhetes.length > 0) ||
      (sst.dataBilhete && sst.dataBilhete !== '-' && sst.dataBilhete !== '- - - -') ||
      (sst.bilhetes && sst.bilhetes !== '-' && sst.bilhetes !== '- - - -') ||
      (sst.ultimoBilhete && sst.ultimoBilhete !== '-' && sst.ultimoBilhete !== '- - - -')
  );
  if (!hasAny) return [];

  const bilhetesLista = deriveListaBilhetes('calc', sst);
  const outrosUpper = String(sst.outrosBilhetes || '').toUpperCase().trim();

  const classifyItem = (b: BilheteItem, total: number): 'BILHETE' | 'RETORNO' | 'FINAL' => {
    const stUpper = String(b.statusOuParecer || '').toUpperCase().trim();
    const rotUpper = String(b.rotulo || '').toUpperCase().trim();

    const effectiveSt =
      total === 1 && !b.tipoDetalhe && (outrosUpper === 'FINALIZADO' || outrosUpper === 'GERADO DI')
        ? outrosUpper
        : stUpper;

    if (
      effectiveSt === 'FINALIZADO' ||
      effectiveSt === 'GERADO DI' ||
      effectiveSt.includes('DEFERID') ||
      effectiveSt.includes('INDEFERID') ||
      effectiveSt.includes('ENTREGU')
    ) {
      return 'FINAL';
    }
    if (b.tipoDetalhe === 'RETORNO') {
      return 'RETORNO';
    }
    if (b.tipoDetalhe === 'BILHETE') {
      return 'BILHETE';
    }
    if (b.tipo === 'primeiro' && rotUpper.includes('BILHETE')) {
      return 'BILHETE';
    }
    if (effectiveSt.includes('RETORNO') || rotUpper.startsWith('RETORNO')) {
      return 'RETORNO';
    }
    if (effectiveSt.includes('BILHETE') || rotUpper.includes('BILHETE')) {
      return 'BILHETE';
    }
    if (b.tipo === 'ultimo') {
      return 'RETORNO';
    }
    return 'BILHETE';
  };

  const eventos: EventoBilheteEntrada[] = [];
  let openEvent: EventoBilheteEntrada | null = null;

  for (const b of bilhetesLista) {
    const itemISO = normalizeToISODate(b.data, entradaYear);
    if (!itemISO) continue;

    const origemISO = b.dataBilheteOrigem ? normalizeToISODate(b.dataBilheteOrigem, entradaYear) : '';
    const kind = classifyItem(b, bilhetesLista.length);

    if (kind === 'BILHETE') {
      if (openEvent) {
        eventos.push(openEvent);
      }
      openEvent = {
        dataBilhete: itemISO,
        rotuloBilhete: (b.rotulo || b.statusOuParecer || `Bilhete ${eventos.length + 1}`).trim(),
      };
    } else if (kind === 'RETORNO') {
      if (openEvent) {
        openEvent.dataRetorno = itemISO;
        openEvent.rotuloRetorno = (b.rotulo || b.statusOuParecer || `Retorno ${eventos.length + 1}`).trim();
        eventos.push(openEvent);
        openEvent = null;
      } else if (origemISO) {
        eventos.push({
          dataBilhete: origemISO,
          dataRetorno: itemISO,
          rotuloBilhete: `Bilhete ${eventos.length + 1}`,
          rotuloRetorno: (b.rotulo || b.statusOuParecer || `Retorno ${eventos.length + 1}`).trim(),
        });
      }
    } else {
      // FINAL (GERADO DI / FINALIZADO)
      const finalRotulo = (b.statusOuParecer || b.rotulo || 'FINALIZADO').trim();
      if (openEvent) {
        openEvent.dataRetorno = itemISO;
        openEvent.rotuloRetorno = finalRotulo;
        openEvent.isFinal = true;
        openEvent.finalRotulo = finalRotulo;
        eventos.push(openEvent);
        openEvent = null;
      } else {
        eventos.push({
          dataBilhete: itemISO,
          rotuloBilhete: (b.rotulo || finalRotulo).trim(),
          isFinal: true,
          finalRotulo,
        });
      }
    }
  }

  if (openEvent) {
    eventos.push(openEvent);
  }

  return eventos.slice(0, LIMITE_MAX_BILHETES_PROCESSO);
}

/**
 * Calcula todas as informações consolidadas de prazo de um processo.
 * REGRA OFICIAL DE PRAZO (Contagem Inclusiva + Pausa por Bilhete + Retomada no Retorno):
 * - Contagem inclusiva: Dias = (Data Fim - Data Início) + 1 (em UTC puro 00:00:00).
 * - Cada Bilhete pausa imediatamente o relógio principal na data de sua emissão e abre
 *   um sub-relógio paralelo de até 15 dias corridos (inclusivos) para o Retorno.
 * - Se o Retorno (ou a Data Atual em aberto) ultrapassar 15 dias (> 15), dispara alerta de prazo excedido
 *   no 16º dia (passível de indeferimento manual pelo operador).
 * - No Retorno dentro dos 15 dias, o relógio principal retoma na própria data do retorno
 *   descontando o saldo restante de dias até zerar.
 * - MARCO INTERRUPTOR DA CONTAGEM: "DATA DO PRONTO" (ou status concluído/entregue/deferido).
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
  dataReferenciaCalculo?: string | null;
}): InfoPrazoProcesso {
  const tipo = item.tipoProcesso || item.tipoDocumento || 'CERTIFICADO DE APROVAÇÃO';
  const diasPrazo = getDiasPrazoPorTipo(tipo);

  const entradaCrua =
    item.detalhesSST?.entradaSST ||
    item.dataEntrada ||
    item.dataExpedicao ||
    '';

  const entradaISO = normalizeToISODate(entradaCrua);

  if (!entradaISO) {
    return {
      tipoNormalizado: item.tipoProcesso || item.tipoDocumento || '',
      statusProcesso: 'Sem data de entrada',
      diasPrazo,
      diasPrazoEfetivo: diasPrazo,
      diasBonusBilhetes: 0,
      diasConsumidosTotal: 0,
      saldoDiasRestantes: diasPrazo,
      prazoBilheteAtivo: false,
      indeferidoPorDecursoBilhete: false,
      hasRetornoContinuo: false,
      dataEntradaBR: '-',
      dataEntradaISO: '',
      dataLimiteBaseBR: '-',
      dataLimiteBaseISO: '',
      dataLimiteBR: '-',
      dataLimiteISO: '',
      dataProntoBR: undefined,
      dataProntoISO: undefined,
      hasDataPronto: false,
      diasRestantes: null,
      diasEmAtraso: 0,
      isVencido: false,
      isConcluido: false,
      concluidoNoPrazo: false,
      diasNaSST: 0,
      historicoBlocos: [],
    };
  }

  const entradaYear = parseInt(entradaISO.slice(0, 4), 10);
  const entradaBR = isoToDateBR(entradaISO);

  // Prazo Limite Legal Base (contagem inclusiva: entrada + (diasPrazo - 1))
  const prazoBase = adicionarDiasAData(entradaISO, Math.max(0, diasPrazo - 1));
  const dataLimiteBaseBR = prazoBase.dataBR;
  const dataLimiteBaseISO = prazoBase.dataISO;

  // DATA DO PRONTO (Marco interruptor da contagem)
  const rawDataPronto = item.detalhesSST?.dataPronto;
  const dataProntoISO = normalizeToISODate(rawDataPronto, entradaYear);
  const hasDataPronto = Boolean(dataProntoISO);
  const dataProntoBR = hasDataPronto ? isoToDateBR(dataProntoISO) : '';

  // Identifica se o processo já está concluído pelo status administrativo (deferido/aprovado/entregue/encerrado)
  const stUpper = String(item.status || '').toUpperCase();
  const isStatusConcluido =
    stUpper === 'ENCERRADO' ||
    stUpper.includes('ENTREGU') ||
    stUpper.includes('APROVAD') ||
    (stUpper.includes('DEFERID') && !stUpper.includes('INDEFERID')) ||
    item.detalhesSST?.situacaoDocGerado === 'ENTREGUE';

  const isConcluido = hasDataPronto || isStatusConcluido;
  const todayISO = normalizeToISODate(item.dataReferenciaCalculo, entradaYear) || getTodayISO();

  const eventosBilhetes = extrairCiclosBilhetesParaCalculo(item.detalhesSST, entradaYear);

  const calc = calcularPrazoDetalhado({
    dataEntrada: entradaISO,
    prazoTotalDias: diasPrazo,
    bilhetes: eventosBilhetes,
    dataReferencia: hasDataPronto ? dataProntoISO : todayISO,
    dataPronto: dataProntoISO || undefined,
    isConcluidoExterno: isConcluido,
  });

  const dataLimiteISO = calc.dataLimiteFinalISO || dataLimiteBaseISO;
  const dataLimiteBR = isoToDateBR(dataLimiteISO);

  let diasRestantes: number | null = null;
  let diasEmAtraso = 0;
  let isVencido = false;
  let concluidoNoPrazo = false;
  let diasNaSST = 0;

  if (hasDataPronto && dataProntoISO) {
    diasNaSST = dataProntoISO >= entradaISO ? calcularDiasInclusivosISO(entradaISO, dataProntoISO) : 0;

    if (dataLimiteISO) {
      const diffPronto = diffDaysISO(dataProntoISO, dataLimiteISO);
      if (diffPronto >= 0) {
        concluidoNoPrazo = true;
        isVencido = false;
        diasEmAtraso = 0;
        diasRestantes = diffPronto;
      } else {
        concluidoNoPrazo = false;
        isVencido = true;
        diasEmAtraso = Math.abs(diffPronto);
        diasRestantes = 0;
      }
    }
  } else {
    diasNaSST = todayISO >= entradaISO ? calcularDiasInclusivosISO(entradaISO, todayISO) : 0;

    if (calc.indeferidoPorDecursoBilhete) {
      isVencido = true;
      diasRestantes = 0;
      diasEmAtraso = calc.dataIndeferimentoISO
        ? Math.max(1, diffDaysISO(calc.dataIndeferimentoISO, todayISO) + 1)
        : 1;
    } else if (dataLimiteISO) {
      const diff = diffDaysISO(todayISO, dataLimiteISO);
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
  }

  return {
    tipoNormalizado: tipo,
    statusProcesso: calc.statusProcesso,
    diasPrazo,
    diasPrazoEfetivo: calc.prazoBilheteAtivo ? PRAZO_MAX_BILHETE_DIAS : diasPrazo + calc.diasBonusBilhetes,
    diasBonusBilhetes: calc.diasBonusBilhetes,
    diasConsumidosTotal: calc.diasConsumidosTotal,
    saldoDiasRestantes: calc.saldoDiasRestantes,
    prazoBilheteAtivo: calc.prazoBilheteAtivo,
    bilheteAtivoRotulo: calc.bilheteAtivoRotulo,
    bilheteAtivoDataBR: calc.bilheteAtivoDataBR,
    bilheteAtivoLimiteBR: calc.bilheteAtivoLimiteBR,
    bilheteAtivoDiasDecorridos: calc.bilheteAtivoDiasDecorridos,
    indeferidoPorDecursoBilhete: calc.indeferidoPorDecursoBilhete,
    dataIndeferimentoBR: calc.dataIndeferimentoBR,
    dataIndeferimentoISO: calc.dataIndeferimentoISO,
    hasRetornoContinuo: calc.hasRetornoContinuo,
    ultimoRetornoDataBR: calc.ultimoRetornoDataBR,
    dataEntradaBR: entradaBR,
    dataEntradaISO: entradaISO,
    dataLimiteBaseBR,
    dataLimiteBaseISO,
    dataLimiteBR,
    dataLimiteISO,
    dataProntoBR: hasDataPronto ? dataProntoBR : undefined,
    dataProntoISO: hasDataPronto ? dataProntoISO : undefined,
    hasDataPronto,
    diasRestantes,
    diasEmAtraso,
    isVencido,
    isConcluido,
    concluidoNoPrazo,
    diasNaSST,
    historicoBlocos: calc.historicoBlocos,
  };
}

export interface ParsedProcessoE27 {
  isE27: boolean;
  numero: number;
  numeroBruto: string;
  numeroPadded: string;
  codigo?: string;
  ano?: string;
  formattedE27?: string;
}

/**
 * Analisa uma string ou número de processo, reconhecendo o padrão oficial DGST:
 * E27/PROCESSO/COD/ANO (ex: E27/0134/11210/2026) ou formatos numéricos legados (00134).
 */
export function parseProcessoE27(
  raw?: number | string | null,
  fallbackMeta?: { codigo?: string | null; ano?: string | null }
): ParsedProcessoE27 | null {
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  if (!str || str === '-' || str.toUpperCase() === 'S/N') return null;

  const e27Match = str.match(/^E-?27\/(\d{1,7})\/(\d{3,6})\/(\d{4})$/i);
  if (e27Match) {
    const numeroBruto = e27Match[1];
    const numero = parseInt(numeroBruto, 10) || 0;
    const numeroPadded = numero > 0 ? String(numero).padStart(numeroBruto.length >= 4 ? numeroBruto.length : 4, '0') : numeroBruto;
    const codigo = e27Match[2];
    const ano = e27Match[3];
    return {
      isE27: true,
      numero,
      numeroBruto,
      numeroPadded,
      codigo,
      ano,
      formattedE27: `E27/${numeroPadded}/${codigo}/${ano}`,
    };
  }

  const digits = str.replace(/[^\d]/g, '');
  if (!digits) return null;

  const numero = parseInt(digits, 10) || 0;
  if (numero <= 0) return null;

  const codigoLimpo = String(fallbackMeta?.codigo || '').replace(/[^\d]/g, '');
  const anoLimpo = String(fallbackMeta?.ano || '').replace(/[^\d]/g, '').slice(0, 4);
  const numeroPadded4 = String(numero).padStart(4, '0');

  if (codigoLimpo) {
    const anoFinal = /^\d{4}$/.test(anoLimpo) ? anoLimpo : String(new Date().getFullYear());
    return {
      isE27: true,
      numero,
      numeroBruto: digits,
      numeroPadded: numeroPadded4,
      codigo: codigoLimpo,
      ano: anoFinal,
      formattedE27: `E27/${numeroPadded4}/${codigoLimpo}/${anoFinal}`,
    };
  }

  return {
    isE27: false,
    numero,
    numeroBruto: digits,
    numeroPadded: String(numero).padStart(5, '0'),
  };
}

/**
 * Extrai o número inteiro do processo para ordenação e correlação,
 * funcionando tanto para "00134" quanto para "E27/0134/11210/2026".
 */
export function extractProcessoNumero(raw?: number | string | null): number {
  const parsed = parseProcessoE27(raw);
  if (parsed) return parsed.numero;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return 0;
}

export function formatProcesso(
  num?: number | string | null,
  fallbackMeta?: { codigo?: string | null; ano?: string | null }
): string {
  if (num === undefined || num === null || num === '' || num === '-' || num === 'S/N' || num === 's/n') {
    return 'S/N';
  }
  const str = String(num).trim();
  if (str === '' || str === '-' || str.toUpperCase() === 'S/N') return 'S/N';

  const parsed = parseProcessoE27(str, fallbackMeta);
  if (!parsed) return str;
  if (parsed.formattedE27) return parsed.formattedE27;
  return parsed.numeroPadded;
}

/**
 * Formata o número cru do processo acompanhado do ano de exercício (ex: 56463/2026 ou 00075/2026)
 * para exibição compacta na coluna de Processo da listagem geral.
 */
export function formatProcessoNumeroAno(
  num?: number | string | null,
  meta?: { ano?: string | null; dataRef?: string | null }
): string {
  if (num === undefined || num === null || num === '' || num === '-' || num === 'S/N' || num === 's/n') {
    return 'S/N';
  }
  const str = String(num).trim();
  if (str === '' || str === '-' || str.toUpperCase() === 'S/N') return 'S/N';

  const parsed = parseProcessoE27(str, { ano: meta?.ano });
  if (!parsed || parsed.numero <= 0) return str;

  const numero5 = String(parsed.numero).padStart(5, '0');
  const anoMeta = String(meta?.ano || '').replace(/[^\d]/g, '').slice(0, 4);
  const anoDataMatch = String(meta?.dataRef || '').match(/\b(20\d{2}|19\d{2})\b/);
  const ano =
    parsed.ano ||
    (/^\d{4}$/.test(anoMeta) ? anoMeta : '') ||
    (anoDataMatch ? anoDataMatch[1] : '') ||
    String(new Date().getFullYear());

  return `${numero5}/${ano}`;
}

export function formatDateBR(dateString?: string | null): string {
  if (!dateString || dateString === '-' || dateString === '- - - -' || dateString.trim() === '') return '-';
  const str = dateString.trim();

  // If ISO with or without time (YYYY-MM-DD or YYYY-MM-DDTHH:mm...)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [year, month, day] = str.slice(0, 10).split('-');
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }

  // If DD/MM (without year, e.g. 05/01) -> format as DD/MM/YYYY usando o ano corrente
  if (/^\d{1,2}[\/\.-]\d{1,2}$/.test(str)) {
    const parts = str.split(/[\/\.-]/);
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${day}/${month}/${new Date().getFullYear()}`;
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
  return iso < getTodayISO();
}

export function getDaysRemaining(dataValidade?: string | null): number | null {
  if (!dataValidade || dataValidade === '-') return null;
  let iso = dataValidade;
  if (dataValidade.includes('/')) {
    const [d, m, y] = dataValidade.split('/');
    iso = `${y}-${m}-${d}`;
  }
  const target = new Date(iso).getTime();
  const current = new Date(getTodayISO()).getTime();
  const diffDays = Math.ceil((target - current) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function exportToCSV(items: BuildingNotification[], filename = 'processos-requerentes.csv') {
  const headers = [
    'PROCESSO',
    'REQUERENTE',
    'CNPJ/CPF REQUERENTE',
    'TIPO',
    'ORIGEM',
    'DATA DE ENTRADA',
    'STATUS',
    'PRAZO LIMITE (DIAS)',
    'DATA LIMITE',
    'DATA DO PRONTO',
    'DOC. GERADO',
    'LOCALIZAÇÃO',
    'OBM',
    'ENDEREÇO',
    'NÚMERO',
    'BAIRRO',
    'MUNICÍPIO',
    'RESPONSÁVEL',
    'VÍNCULO',
    'CPF/CNPJ RESPONSÁVEL',
    'SÍNDICO',
    'CPF SÍNDICO',
    'EXIGÊNCIAS',
  ];

  const rows = items.map((item) => {
    const prazo = calcularPrazoProcesso(item);
    return [
      `"${formatProcesso(item.processo !== undefined ? item.processo : item.numero, { codigo: item.detalhesSST?.codigo, ano: item.anoExercicio })}"`,
      `"${(item.requerente || item.edificacao).replace(/"/g, '""')}"`,
      `"${(item.requerenteCpfCnpj || item.proprietario.cpfOuCnpj || '').replace(/"/g, '""')}"`,
      `"${(item.tipoProcesso || item.tipoDocumento || 'Processo').replace(/"/g, '""')}"`,
      `"${(item.origem || item.obm).replace(/"/g, '""')}"`,
      `"${prazo.dataEntradaBR}"`,
      `"${item.status}"`,
      `"${prazo.diasPrazo} dias"`,
      `"${prazo.dataLimiteBR}"`,
      `"${prazo.dataProntoBR || ''}"`,
      `"${item.detalhesSST?.docGerado || ''}"`,
      `"${item.detalhesSST?.localizacao || 'PROTOCOLO'}"`,
      `"${item.obm}"`,
      `"${item.endereco.logradouro.replace(/"/g, '""')}"`,
      `"${item.endereco.numero}"`,
      `"${item.endereco.bairro}"`,
      `"${item.endereco.municipio}"`,
      `"${item.proprietario.nomeOuRazaoSocial.replace(/"/g, '""')}"`,
      `"${(item.proprietario.tipoVinculo || '').replace(/"/g, '""')}"`,
      `"${item.proprietario.cpfOuCnpj}"`,
      `"${(item.proprietario.sindicoNome || '').replace(/"/g, '""')}"`,
      `"${(item.proprietario.sindicoCpf || '').replace(/"/g, '""')}"`,
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

export function calcularDiasDecorridosBilhete(
  dataRegistro?: string | null,
  dataPronto?: string | null
): number {
  const regISO = normalizeToISODate(dataRegistro);
  if (!regISO) return 0;

  let endISO = getTodayISO();
  const prontoISO = normalizeToISODate(dataPronto, parseInt(regISO.slice(0, 4), 10));
  if (prontoISO && prontoISO >= regISO) {
    endISO = prontoISO;
  }

  if (endISO < regISO) return 0;
  return calcularDiasInclusivosISO(regISO, endISO);
}

export function deriveListaBilhetes(
  recordId: string,
  sst?: SSTProcessDetails
): BilheteItem[] {
  const details = sst || {};
  const dataBilheteFmt = formatDateBR(details.dataBilhete || details.bilhetes);
  const ultimoBilheteFmt = formatDateBR(details.ultimoBilhete);
  const diasBilheteVal =
    details.diasBilhetes !== undefined && details.diasBilhetes !== ''
      ? details.diasBilhetes
      : (details.diasBilhete ?? 0);
  const diasUltimoBilheteVal =
    details.diasUltimoBilhete !== undefined && details.diasUltimoBilhete !== ''
      ? details.diasUltimoBilhete
      : 0;
  const outrosBilhetesVal = details.outrosBilhetes || '';

  const rawLista: BilheteItem[] =
    details.listaBilhetes && details.listaBilhetes.length > 0
      ? details.listaBilhetes
      : [
          ...(dataBilheteFmt !== '-'
            ? [
                {
                  id: `b-1-${recordId}`,
                  ordem: 1,
                  tipo: 'primeiro' as const,
                  tipoDetalhe: 'BILHETE' as const,
                  rotulo: '1º Bilhete',
                  data: dataBilheteFmt,
                  dias: diasBilheteVal,
                  statusOuParecer: 'BILHETE 1',
                  despacho: `Primeiro bilhete lançado com ${diasBilheteVal} dia(s) decorridos.`,
                  autor: 'Fiscal SST 10º GBM',
                },
              ]
            : []),
          ...(ultimoBilheteFmt !== '-'
            ? [
                {
                  id: `b-ultimo-${recordId}`,
                  ordem: 2,
                  tipo: 'ultimo' as const,
                  tipoDetalhe: 'RETORNO' as const,
                  rotulo: 'Último Bilhete',
                  data: ultimoBilheteFmt,
                  dias: diasUltimoBilheteVal,
                  statusOuParecer: outrosBilhetesVal || 'Último Bilhete',
                  despacho: outrosBilhetesVal
                    ? `Parecer: ${outrosBilhetesVal}`
                    : `Último bilhete registrado com ${diasUltimoBilheteVal} dia(s) decorridos.`,
                  autor: 'Fiscal SST 10º GBM',
                },
              ]
            : []),
        ];

  return rawLista.map((b, idx) => {
    if (b.autoContagemDias) {
      return b;
    }
    if (idx === 0 || b.tipo === 'primeiro' || b.ordem === 1) {
      const stUpper = (b.statusOuParecer || '').toUpperCase().trim();
      const rotUpper = (b.rotulo || '').toUpperCase().trim();
      const isLegacyRetornoNoPrimeiro =
        !b.tipoDetalhe &&
        (stUpper === 'RETORNO' ||
          (b.statusOuParecer &&
            b.statusOuParecer === outrosBilhetesVal &&
            outrosBilhetesVal.toUpperCase() !== 'BILHETE 1') ||
          (rotUpper.includes('BILHETE') && stUpper !== 'BILHETE 1' && stUpper !== 'FINALIZADO' && stUpper !== 'GERADO DI'));
      const statusPrimeiro =
        !b.statusOuParecer || isLegacyRetornoNoPrimeiro ? 'BILHETE 1' : b.statusOuParecer;
      return {
        ...b,
        rotulo: b.rotulo || '1º Bilhete',
        statusOuParecer: statusPrimeiro,
        despacho:
          b.despacho && (!outrosBilhetesVal || !b.despacho.includes(outrosBilhetesVal))
            ? b.despacho
            : `Primeiro bilhete lançado com ${b.dias || 0} dia(s) decorridos.`,
      };
    }
    if (
      (idx === rawLista.length - 1 || b.tipo === 'ultimo') &&
      (!b.statusOuParecer || b.statusOuParecer === 'Concluído')
    ) {
      return {
        ...b,
        rotulo: b.rotulo || 'Último Bilhete',
        statusOuParecer: outrosBilhetesVal || b.statusOuParecer || 'Último Bilhete',
        despacho: outrosBilhetesVal ? `Parecer: ${outrosBilhetesVal}` : b.despacho,
      };
    }
    return b;
  });
}

export function buildDetalhesSSTWithBilhetes(
  currentSST: SSTProcessDetails | undefined,
  nextLista: BilheteItem[],
  explicitOutrosBilhetes?: string
): SSTProcessDetails {
  const base = { ...(currentSST || {}) };
  const normalized = nextLista.map((b, idx) => ({
    ...b,
    ordem: idx + 1,
  }));

  if (normalized.length === 0) {
    return {
      ...base,
      listaBilhetes: [],
      dataBilhete: '',
      bilhetes: '',
      diasBilhete: '',
      diasBilhetes: '',
      ultimoBilhete: '',
      diasUltimoBilhete: '',
      ...(explicitOutrosBilhetes !== undefined
        ? { outrosBilhetes: explicitOutrosBilhetes }
        : {}),
    };
  }

  const first = normalized[0];
  const retornoItems = normalized.filter(
    (b) => b.tipo === 'ultimo' || b.tipoDetalhe === 'RETORNO'
  );
  const lastRetorno =
    retornoItems.length > 0 ? retornoItems[retornoItems.length - 1] : undefined;

  return {
    ...base,
    listaBilhetes: normalized,
    dataBilhete: first?.data ? formatDateBR(first.data) : '',
    bilhetes: first?.data ? formatDateBR(first.data) : '',
    diasBilhete: first?.dias ?? '',
    diasBilhetes: first?.dias ?? '',
    ultimoBilhete: lastRetorno?.data ? formatDateBR(lastRetorno.data) : '',
    diasUltimoBilhete: lastRetorno ? (lastRetorno.dias ?? '') : '',
    ...(explicitOutrosBilhetes !== undefined
      ? { outrosBilhetes: explicitOutrosBilhetes }
      : {}),
  };
}

