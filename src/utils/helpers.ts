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
  const currentYear = new Date().getFullYear();
  let ano = currentYear;
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
    ano = currentYear;
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

function diffDaysISO(startISO?: string | null, endISO?: string | null): number {
  if (!startISO || !endISO) return 0;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO) || !/^\d{4}-\d{2}-\d{2}$/.test(endISO)) return 0;
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const startUTC = Date.UTC(sy, sm - 1, sd);
  const endUTC = Date.UTC(ey, em - 1, ed);
  return Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24));
}

export interface InfoPrazoProcesso {
  tipoNormalizado: string;
  diasPrazo: number;
  diasPrazoEfetivo: number;
  diasBonusBilhetes: number;
  prazoBilheteAtivo: boolean;
  bilheteAtivoRotulo?: string;
  bilheteAtivoDataBR?: string;
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
}

/**
 * Calcula todas as informações consolidadas de prazo de um processo.
 * REGRA OFICIAL DE PRAZO:
 * - Data de Entrada na SST + Prazo do Tipo = Prazo Limite Base.
 * - BILHETES & RETORNO:
 *   - Cada bilhete cadastrado permite aumento de prazo de até 15 dias a partir da data do bilhete.
 *   - Quando há um BILHETE em aberto (sem retorno posterior), o prazo limite ativo exibido
 *     passa a ser Data do Bilhete + 15 dias (evidenciando a proximidade do limite antes de indeferimento).
 *   - Quando o bilhete é alterado para RETORNO (ou recebe um RETORNO), mantém-se a continuidade
 *     do prazo (computando os dias suspensos até o retorno, limitados a 15 dias por bilhete,
 *     sem regressão abaixo do prazo estendido pelo bilhete).
 * - MARCO INTERRUPTOR DA CONTAGEM: A contagem de dias do processo é interrompida
 *   na "DATA DO PRONTO" (coluna DATA DO PRONTO da planilha).
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
    '';

  if (!entradaCrua || entradaCrua === '-' || entradaCrua === '- - - -' || entradaCrua.trim() === '') {
    return {
      tipoNormalizado: item.tipoProcesso || item.tipoDocumento || '',
      diasPrazo,
      diasPrazoEfetivo: diasPrazo,
      diasBonusBilhetes: 0,
      prazoBilheteAtivo: false,
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
    };
  }

  const entradaConvertida = adicionarDiasAData(entradaCrua, 0);
  const entradaBR = entradaConvertida.dataBR;
  const entradaISO = entradaConvertida.dataISO;

  // Prazo Limite Legal Base = Entrada na SST + dias do tipo de processo
  const prazoBase = adicionarDiasAData(entradaCrua, diasPrazo);
  const dataLimiteBaseBR = prazoBase.dataBR;
  const dataLimiteBaseISO = prazoBase.dataISO;

  let dataLimiteBR = dataLimiteBaseBR;
  let dataLimiteISO = dataLimiteBaseISO;
  let prazoBilheteAtivo = false;
  let bilheteAtivoRotulo: string | undefined;
  let bilheteAtivoDataBR: string | undefined;
  let hasRetornoContinuo = false;
  let ultimoRetornoDataBR: string | undefined;
  let diasBonusBilhetes = 0;
  let diasPrazoEfetivo = diasPrazo;

  // Analisa bilhetes e retornos para extensão (+15d) e continuidade do prazo
  const sst: SSTProcessDetails | undefined = item.detalhesSST;
  const hasAnyBilheteData = Boolean(
    sst &&
      ((sst.listaBilhetes && sst.listaBilhetes.length > 0) ||
        (sst.dataBilhete && sst.dataBilhete !== '-' && sst.dataBilhete !== '- - - -') ||
        (sst.bilhetes && sst.bilhetes !== '-' && sst.bilhetes !== '- - - -') ||
        (sst.ultimoBilhete && sst.ultimoBilhete !== '-' && sst.ultimoBilhete !== '- - - -'))
  );

  if (hasAnyBilheteData && dataLimiteBaseISO) {
    const bilhetesLista = deriveListaBilhetes('calc', sst);
    const outrosUpper = String(sst?.outrosBilhetes || '').toUpperCase().trim();

    let currentDeadlineISO = dataLimiteBaseISO;
    let openBilheteStartISO: string | null = null;
    let openBilheteRotulo = '';

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
      if (
        b.tipoDetalhe === 'RETORNO' ||
        effectiveSt.includes('RETORNO') ||
        rotUpper.startsWith('RETORNO')
      ) {
        return 'RETORNO';
      }
      if (
        b.tipoDetalhe === 'BILHETE' ||
        effectiveSt.includes('BILHETE') ||
        rotUpper.includes('BILHETE')
      ) {
        return 'BILHETE';
      }
      if (b.tipo === 'ultimo') {
        return 'RETORNO';
      }
      return 'BILHETE';
    };

    bilhetesLista.forEach((b) => {
      const itemConv = adicionarDiasAData(b.data, 0);
      const itemISO = itemConv.dataISO;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(itemISO)) return;

      const origemConv = b.dataBilheteOrigem ? adicionarDiasAData(b.dataBilheteOrigem, 0) : null;
      const origemISO =
        origemConv && /^\d{4}-\d{2}-\d{2}$/.test(origemConv.dataISO) ? origemConv.dataISO : '';

      const kind = classifyItem(b, bilhetesLista.length);

      if (kind === 'BILHETE') {
        openBilheteStartISO = itemISO;
        openBilheteRotulo = (b.statusOuParecer || b.rotulo || 'BILHETE').toUpperCase().trim();
      } else if (kind === 'RETORNO') {
        const bilheteStart = openBilheteStartISO || origemISO || null;
        if (bilheteStart) {
          const elapsedOnBilhete = Math.max(0, diffDaysISO(bilheteStart, itemISO));
          const addedDays = Math.min(15, elapsedOnBilhete);
          const extendedByElapsed = adicionarDiasAData(currentDeadlineISO, addedDays).dataISO;
          const bilhete15CapISO = adicionarDiasAData(bilheteStart, 15).dataISO;

          currentDeadlineISO =
            bilhete15CapISO > extendedByElapsed ? bilhete15CapISO : extendedByElapsed;
        }
        openBilheteStartISO = null;
        openBilheteRotulo = '';
        hasRetornoContinuo = true;
        ultimoRetornoDataBR = itemConv.dataBR;
      } else {
        // FINAL (GERADO DI / FINALIZADO)
        if (openBilheteStartISO) {
          const elapsedOnBilhete = Math.max(0, diffDaysISO(openBilheteStartISO, itemISO));
          const addedDays = Math.min(15, elapsedOnBilhete);
          currentDeadlineISO = adicionarDiasAData(currentDeadlineISO, addedDays).dataISO;
        }
        openBilheteStartISO = null;
        openBilheteRotulo = '';
      }
    });

    if (openBilheteStartISO) {
      // Bilhete em aberto: prazo limite ativo passa a ser Data do Bilhete + 15 dias
      const bilhetePrazo = adicionarDiasAData(openBilheteStartISO, 15);
      dataLimiteBR = bilhetePrazo.dataBR;
      dataLimiteISO = bilhetePrazo.dataISO;
      prazoBilheteAtivo = true;
      bilheteAtivoRotulo = openBilheteRotulo || 'BILHETE';
      bilheteAtivoDataBR = adicionarDiasAData(openBilheteStartISO, 0).dataBR;
      diasBonusBilhetes = 15;
      diasPrazoEfetivo = 15;
    } else if (currentDeadlineISO && currentDeadlineISO !== dataLimiteBaseISO) {
      dataLimiteISO = currentDeadlineISO;
      dataLimiteBR = adicionarDiasAData(currentDeadlineISO, 0).dataBR;
      diasBonusBilhetes = Math.max(0, diffDaysISO(dataLimiteBaseISO, currentDeadlineISO));
      diasPrazoEfetivo = diasPrazo + diasBonusBilhetes;
    }
  }

  // DATA DO PRONTO (Marco interruptor da contagem)
  const rawDataPronto = item.detalhesSST?.dataPronto;
  const hasDataPronto = Boolean(
    rawDataPronto &&
    rawDataPronto !== '-' &&
    rawDataPronto !== '- - - -' &&
    rawDataPronto.trim() !== ''
  );

  let dataProntoBR = '';
  let dataProntoISO = '';
  if (hasDataPronto) {
    const prontoConv = adicionarDiasAData(rawDataPronto, 0);
    dataProntoBR = prontoConv.dataBR;
    dataProntoISO = prontoConv.dataISO;
  }

  // Identifica se o processo está concluído pelo status administrativo
  const stUpper = String(item.status || '').toUpperCase();
  const isStatusConcluido =
    stUpper === 'ENCERRADO' ||
    stUpper.includes('ENTREGU') ||
    stUpper.includes('DEFERID') ||
    item.detalhesSST?.situacaoDocGerado === 'ENTREGUE';

  let diasRestantes: number | null = null;
  let diasEmAtraso = 0;
  let isVencido = false;
  const isConcluido = hasDataPronto || isStatusConcluido;
  let concluidoNoPrazo = false;
  let diasNaSST = 0;

  const todayISO = getTodayISO();

  if (hasDataPronto && dataProntoISO) {
    // A CONTAGEM FOI INTERROMPIDA NA DATA DO PRONTO
    if (entradaISO) {
      diasNaSST = Math.max(0, diffDaysISO(entradaISO, dataProntoISO));
    }

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
    // PROCESSO EM ANDAMENTO (Sem Data do Pronto - contagem ativa até a data atual)
    if (entradaISO) {
      diasNaSST = Math.max(0, diffDaysISO(entradaISO, todayISO));
    }

    if (dataLimiteISO) {
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
    diasPrazo,
    diasPrazoEfetivo,
    diasBonusBilhetes,
    prazoBilheteAtivo,
    bilheteAtivoRotulo,
    bilheteAtivoDataBR,
    hasRetornoContinuo,
    ultimoRetornoDataBR,
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
  if (!dataRegistro || dataRegistro === '-' || dataRegistro === '- - - -' || dataRegistro.trim() === '') {
    return 0;
  }
  const regISO = adicionarDiasAData(dataRegistro, 0).dataISO;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(regISO)) return 0;

  let endISO = getTodayISO();
  if (
    dataPronto &&
    dataPronto !== '-' &&
    dataPronto !== '- - - -' &&
    dataPronto.trim() !== ''
  ) {
    const prontoISO = adicionarDiasAData(dataPronto, 0).dataISO;
    if (/^\d{4}-\d{2}-\d{2}$/.test(prontoISO) && prontoISO >= regISO) {
      endISO = prontoISO;
    }
  }

  const startMs = new Date(`${regISO}T00:00:00`).getTime();
  const endMs = new Date(`${endISO}T00:00:00`).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
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
      const isCopiadoErrado =
        b.statusOuParecer &&
        b.statusOuParecer === outrosBilhetesVal &&
        outrosBilhetesVal.toUpperCase() !== 'BILHETE 1';
      const statusPrimeiro =
        !b.statusOuParecer || isCopiadoErrado ? 'BILHETE 1' : b.statusOuParecer;
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

