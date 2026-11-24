import { AuditLog, BuildingNotification, StatusType } from '../types';
import { parseCSV } from './csvParser';
import {
  adicionarDiasAData,
  calcularPrazoProcesso,
  formatDateBR,
  parseProcessoE27,
} from './helpers';

export interface DgstReportRow {
  seq: number;
  dataEntradaBR: string;
  processoOriginal: string;
  e27Processo: string;
  numero: number;
  codigo: string;
  ano: string;
  requerente: string;
  enderecoRaw: string;
  enderecoParsed: {
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    cep?: string;
  };
  dataProntoBR: string; // DD/MM/YYYY ou ''
  prontoExtraidoDoEndereco: boolean;
  enderecoExtraidoDoRequerente: boolean;
}

export interface DgstParseResult {
  obm: string;
  dataEmissao: string;
  totalDeclarado?: number;
  rows: DgstReportRow[];
  anomaliesFixed: {
    prontoNoEndereco: number;
    enderecoNoRequerente: number;
    totalStripped: number;
  };
}

export interface DgstSyncOptions {
  updateE27Format: boolean;
  updateProntoDates: boolean;
  overwriteDifferingProntoDates: boolean;
  moveReadyToProntoLocation: boolean;
  fillMissingAddresses: boolean;
  standardizeLegacyUnmatchedE27: boolean;
  includeNewProcesses: boolean;
}

export const DEFAULT_DGST_SYNC_OPTIONS: DgstSyncOptions = {
  updateE27Format: true,
  updateProntoDates: true,
  overwriteDifferingProntoDates: true,
  moveReadyToProntoLocation: true,
  fillMissingAddresses: true,
  standardizeLegacyUnmatchedE27: true,
  includeNewProcesses: true,
};

export interface MatchedCorrelationItem {
  existing: BuildingNotification;
  dgst: DgstReportRow;
  updated: BuildingNotification;
  previousProcesso: string;
  nextProcesso: string;
  previousPronto: string;
  nextPronto: string;
  previousLocalizacao: string;
  nextLocalizacao: string;
  hadNoProntoBefore: boolean;
  hasProntoDateDiff: boolean;
  addressUpdated: boolean;
  processoUpdated: boolean;
  hasAnyChange: boolean;
}

export interface LegacyNormalizedItem {
  existing: BuildingNotification;
  updated: BuildingNotification;
  previousProcesso: string;
  nextProcesso: string;
}

export interface DgstCorrelationPlan {
  matched: MatchedCorrelationItem[];
  legacyNormalized: LegacyNormalizedItem[];
  unmatchedNew: Array<{
    dgst: DgstReportRow;
    record: BuildingNotification;
  }>;
  stats: {
    totalDgstRows: number;
    matchedCount: number;
    matchedWithChangesCount: number;
    newlyReadyCount: number;
    prontoDateDiffCount: number;
    processoFormatUpdatedCount: number;
    addressFilledCount: number;
    movedToProntoCount: number;
    legacyNormalizedCount: number;
    unmatchedNewCount: number;
    unmatchedNewWithProntoCount: number;
  };
}

export const BUNDLED_DGST_CSV_PATH = '/assets/aistudio/PROCESSOS_SST_2026_66816034.csv';

/**
 * Detecta rapidamente se o conteúdo CSV corresponde a um "Relatório de Processos por OBM" (DGST/CBMERJ)
 * com colunas Seq., Data, Processo (E27/...), Requerente, Endereço, Pronto.
 */
export function isDgstReportCSV(text: string): boolean {
  const sample = text.slice(0, 2000).toUpperCase();
  const hasHeader =
    sample.includes('SEQ.') &&
    sample.includes('PROCESSO') &&
    sample.includes('REQUERENTE') &&
    sample.includes('PRONTO');
  const hasE27 = /E-?27\/\d+\/\d+\/\d{4}/i.test(sample);
  return hasHeader || (sample.includes('RELATÓRIO DE PROCESSOS POR OBM') && hasE27) || hasE27;
}

export function inferTipoProcessoPorCodigo(codigo?: string): string {
  switch ((codigo || '').trim()) {
    case '11220':
      return 'CERTIFICADO DE APROVAÇÃO';
    case '11210':
      return 'LAUDO DE EXIGENCIAS';
    case '11075':
      return 'AUTORIZAÇÃO DE EVENTO';
    case '11213':
      return 'PRORROGAÇÃO DE PRAZO';
    case '11215':
      return 'BAIXA DE NOTIFICAÇÃO';
    default:
      return 'CERTIFICADO DE APROVAÇÃO';
  }
}

function splitMergedAddressFromRequerente(
  rawReq: string,
  rawEnd: string
): { requerente: string; endereco: string; extracted: boolean } {
  const req = rawReq.trim();
  const end = rawEnd.trim();
  if (end.length > 0 || !req) {
    return { requerente: req, endereco: end, extracted: false };
  }

  // Detecta quando o endereço foi digitado/concatenado dentro da coluna Requerente
  const match = req.match(
    /\s+((?:RUA|AVENIDA|AV\.?|TRAVESSA|RODOVIA|ROD\.?|ESTRADA|ALAMEDA|PRAÇA|PRACA|LARGO)\s+.+)$/i
  );
  if (match && match.index && match.index > 3) {
    return {
      requerente: req.slice(0, match.index).trim(),
      endereco: match[1].trim(),
      extracted: true,
    };
  }

  return { requerente: req, endereco: end, extracted: false };
}

const KNOWN_MUNICIPIOS = [
  'ANGRA DOS REIS',
  'ITAGUAI',
  'ITAGUAÍ',
  'MANGARATIBA',
  'PARATY',
  'RIO CLARO',
  'SEROPEDICA',
  'SEROPÉDICA',
  'RIO DE JANEIRO',
];

function canonicalMunicipio(raw: string): string {
  const norm = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (norm === 'ITAGUAI') return 'Itaguaí';
  if (norm === 'ANGRA DOS REIS') return 'Angra dos Reis';
  if (norm === 'MANGARATIBA') return 'Mangaratiba';
  if (norm === 'PARATY') return 'Paraty';
  if (norm === 'RIO CLARO') return 'Rio Claro';
  if (norm === 'SEROPEDICA') return 'Seropédica';
  return raw;
}

export function parseDgstAddress(
  rawAddress: string,
  fallbackMunicipio = 'Angra dos Reis'
): {
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  cep?: string;
} {
  let text = (rawAddress || '').replace(/\s+/g, ' ').trim();
  if (!text) {
    return {
      logradouro: '',
      numero: '',
      bairro: '',
      municipio: '',
    };
  }

  let cep = '';
  const cepMatch = text.match(/\b(\d{5})-?(\d{3})\b\s*$/);
  if (cepMatch) {
    cep = `${cepMatch[1]}-${cepMatch[2]}`;
    text = text.slice(0, cepMatch.index).trim();
  }

  // Remove UF final "RJ"
  text = text.replace(/\s+RJ\s*$/i, '').trim();

  // Tenta extrair Município conhecido no final
  let municipio = '';
  const textNorm = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  for (const mun of KNOWN_MUNICIPIOS) {
    const munNorm = mun
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    if (textNorm.endsWith(` ${munNorm}`) || textNorm === munNorm) {
      municipio = canonicalMunicipio(mun);
      text = text.slice(0, text.length - mun.length).trim();
      break;
    }
  }

  // Tenta separar logradouro + numero + bairro
  // Padrão frequente DGST: "RUA XYZ 123 CENTRO" ou "AVENIDA ABC S/Nº VEROLME"
  let logradouro = text;
  let numero = '';
  let bairro = '';

  const numMatch = text.match(/^(.*?)\s+(S\/Nº|S\/N|SN|KM\s*\d+(?:[.,]\d+)?|\d+[A-Z]?)\s+(.+)$/i);
  if (numMatch) {
    logradouro = numMatch[1].trim();
    numero = numMatch[2].trim();
    bairro = numMatch[3].trim();
  } else {
    const trailNum = text.match(/^(.*?)\s+(S\/Nº|S\/N|SN|\d+[A-Z]?)$/i);
    if (trailNum) {
      logradouro = trailNum[1].trim();
      numero = trailNum[2].trim();
    }
  }

  return {
    logradouro: (logradouro || text).slice(0, 240),
    numero: numero.slice(0, 40),
    bairro: bairro.slice(0, 120),
    municipio: (municipio || fallbackMunicipio).slice(0, 120),
    ...(cep ? { cep: cep.slice(0, 20) } : {}),
  };
}

/**
 * Faz o parse do CSV oficial DGST ("Relatório de Processos por OBM"),
 * tratando todas as anomalias reais encontradas na exportação.
 */
export function parseDgstReportCSV(csvText: string): DgstParseResult {
  const matrix = parseCSV(csvText);
  let obm = '10º GBM - ANGRA DOS REIS';
  let dataEmissao = '';
  let totalDeclarado: number | undefined;

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const row = matrix[i];
    const joined = row.join(' ').toUpperCase();
    if (joined.includes('OBM:')) {
      const obmCell = row.find((c, idx) => idx > 0 && c.trim().length > 0);
      if (obmCell) obm = obmCell.trim();
    }
    if (joined.includes('DATA DA EMISS')) {
      const dateCell = row.find((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
      if (dateCell) dataEmissao = dateCell.trim();
    }
    if (
      row.some((c) => /^SEQ\.?$/i.test(c.trim())) &&
      row.some((c) => /PROCESSO/i.test(c.trim())) &&
      row.some((c) => /REQUERENTE/i.test(c.trim()))
    ) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: encontra a primeira linha que contenha E27/...
    const firstDataIdx = matrix.findIndex((r) => r.some((c) => /^E-?27\/\d+\/\d+\/\d{4}$/i.test(c.trim())));
    if (firstDataIdx === -1) {
      throw new Error(
        'Não foi possível localizar o cabeçalho (Seq., Data, Processo, Requerente, Endereço, Pronto) nem registros no formato E27/PROCESSO/COD/ANO.'
      );
    }
    headerRowIdx = Math.max(0, firstDataIdx - 1);
  }

  const headerRow = matrix[headerRowIdx].map((h) => h.trim().toLowerCase());
  const findCol = (needle: string, fallback: number) => {
    const idx = headerRow.findIndex((h) => h.includes(needle));
    return idx >= 0 ? idx : fallback;
  };

  const colSeq = findCol('seq', 0);
  const colData = findCol('data', 1);
  const colProc = findCol('processo', 2);
  const colReq = findCol('requerente', 3);
  const colEnd = findCol('endere', 4);
  const colPronto = findCol('pronto', 5);

  const rows: DgstReportRow[] = [];
  let prontoNoEndereco = 0;
  let enderecoNoRequerente = 0;
  let totalStripped = 0;

  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 3) continue;

    const rawSeq = (row[colSeq] || '').trim();
    const rawProc = (row[colProc] || '').trim();
    if (!/^\d+$/.test(rawSeq) && !/^E-?27\//i.test(rawProc)) {
      continue;
    }

    const parsedProc = parseProcessoE27(rawProc);
    if (!parsedProc || !parsedProc.isE27 || !parsedProc.formattedE27) {
      continue;
    }

    const rawData = (row[colData] || '').trim();
    const rawReq = (row[colReq] || '').trim();
    const rawEnd = (row[colEnd] || '').trim();
    let rawPronto = (row[colPronto] || '').trim();

    // Limpa rodapé ",Total:   493" concatenado na última linha
    if (/total\s*:/i.test(rawPronto)) {
      const mTotal = rawPronto.match(/total\s*:\s*(\d+)/i);
      if (mTotal) totalDeclarado = parseInt(mTotal[1], 10);
      rawPronto = '';
      totalStripped++;
    }
    for (let c = colPronto + 1; c < row.length; c++) {
      const extra = (row[c] || '').trim();
      const mTotal = extra.match(/total\s*:\s*(\d+)/i);
      if (mTotal) {
        totalDeclarado = parseInt(mTotal[1], 10);
        totalStripped++;
      }
    }

    // Corrige caso em que a data do pronto veio colada no final da coluna Endereço
    let enderecoLimpo = rawEnd;
    let prontoExtraidoDoEndereco = false;
    if (!rawPronto && enderecoLimpo) {
      const mDate = enderecoLimpo.match(/\s+(\d{2}\/\d{2}\/\d{4})\s*$/);
      if (mDate) {
        rawPronto = mDate[1];
        enderecoLimpo = enderecoLimpo.slice(0, mDate.index).trim();
        prontoExtraidoDoEndereco = true;
        prontoNoEndereco++;
      }
    }

    // Corrige caso em que o endereço foi colado dentro de Requerente e Endereço veio vazio
    const splitReqEnd = splitMergedAddressFromRequerente(rawReq, enderecoLimpo);
    if (splitReqEnd.extracted) {
      enderecoNoRequerente++;
    }

    const dataEntradaFmt = rawData ? formatDateBR(rawData) : '';
    const dataProntoFmt = rawPronto && /^\d{2}\/\d{2}\/\d{4}$/.test(rawPronto)
      ? rawPronto
      : rawPronto
      ? formatDateBR(rawPronto)
      : '';

    rows.push({
      seq: parseInt(rawSeq, 10) || rows.length + 1,
      dataEntradaBR: dataEntradaFmt === '-' ? '' : dataEntradaFmt,
      processoOriginal: rawProc,
      e27Processo: parsedProc.formattedE27,
      numero: parsedProc.numero,
      codigo: parsedProc.codigo || '',
      ano: parsedProc.ano || '2026',
      requerente: splitReqEnd.requerente,
      enderecoRaw: splitReqEnd.endereco,
      enderecoParsed: parseDgstAddress(splitReqEnd.endereco),
      dataProntoBR: dataProntoFmt === '-' ? '' : dataProntoFmt,
      prontoExtraidoDoEndereco,
      enderecoExtraidoDoRequerente: splitReqEnd.extracted,
    });
  }

  return {
    obm,
    dataEmissao,
    totalDeclarado,
    rows,
    anomaliesFixed: {
      prontoNoEndereco,
      enderecoNoRequerente,
      totalStripped,
    },
  };
}

function isPlaceholderAddress(addr?: BuildingNotification['endereco']): boolean {
  const log = (addr?.logradouro || '').trim();
  if (!log) return true;
  const norm = log.toLowerCase();
  return (
    norm === 'endereço registrado no processo' ||
    norm === 'endereco registrado no processo' ||
    norm === '-' ||
    norm === '- - - -'
  );
}

function isPlaceholderRequerente(req?: string): boolean {
  const val = (req || '').trim();
  if (!val) return true;
  return /^processo\s*n[ºo°]?\s*\d+$/i.test(val) || val === '-' || val === '- - - -';
}

function normalizeProntoDate(val?: string | null): string {
  const clean = (val || '').trim();
  if (!clean || clean === '-' || clean === '- - - -') return '';
  const fmt = formatDateBR(clean);
  return fmt === '-' ? '' : fmt;
}

function isMutableToProntoLocation(loc?: string): boolean {
  const norm = (loc || '').trim().toUpperCase().replace(/\s+/g, ' ');
  return (
    norm === '' ||
    norm === 'PROTOCOLO' ||
    norm === 'DIR. DIVISÃO' ||
    norm === 'DIR. DIVISAO' ||
    norm === 'DIRETOR' ||
    norm === 'EM ANÁLISE'
  );
}

/**
 * Correlaciona os registros do relatório DGST com os processos existentes na plataforma,
 * calculando exatamente o plano de atualização e criação antes do envio ao Firestore.
 */
export function buildDgstCorrelationPlan(
  dgstRows: DgstReportRow[],
  existingNotifications: BuildingNotification[],
  options: DgstSyncOptions = DEFAULT_DGST_SYNC_OPTIONS
): DgstCorrelationPlan {
  const existingByYearAndNum = new Map<string, BuildingNotification>();
  const existingByNumOnly = new Map<number, BuildingNotification>();

  for (const rec of existingNotifications) {
    const parsed = parseProcessoE27(rec.processo !== undefined ? rec.processo : rec.numero);
    const num = parsed?.numero || rec.numero || 0;
    if (num <= 0) continue;
    const yr =
      rec.anoExercicio ||
      parsed?.ano ||
      (rec.dataEntrada?.match(/(\d{4})/)?.[1] ?? '') ||
      (rec.dataExpedicao?.match(/(\d{4})/)?.[1] ?? '') ||
      '2026';

    const key = `${yr}::${num}`;
    if (!existingByYearAndNum.has(key)) {
      existingByYearAndNum.set(key, rec);
    }
    if (!existingByNumOnly.has(num)) {
      existingByNumOnly.set(num, rec);
    }
  }

  const matchedIds = new Set<string>();
  const matched: MatchedCorrelationItem[] = [];
  const unmatchedNew: Array<{ dgst: DgstReportRow; record: BuildingNotification }> = [];

  const todayBR = new Date().toLocaleDateString('pt-BR');
  const nowTimeBR = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const nowISO = new Date().toISOString();

  for (const dgst of dgstRows) {
    const existing =
      existingByYearAndNum.get(`${dgst.ano}::${dgst.numero}`) ||
      existingByNumOnly.get(dgst.numero);

    if (existing) {
      matchedIds.add(existing.id);

      const prevProcesso = existing.processo || String(existing.numero).padStart(5, '0');
      const prevPronto = normalizeProntoDate(existing.detalhesSST?.dataPronto);
      const prevLocalizacao = (existing.detalhesSST?.localizacao || 'PROTOCOLO').trim();

      const nextProcesso = options.updateE27Format ? dgst.e27Processo : prevProcesso;
      const processoUpdated = options.updateE27Format && (
        existing.processo !== dgst.e27Processo ||
        existing.processoAdministrativo !== dgst.e27Processo
      );

      const hadNoProntoBefore = !prevPronto && Boolean(dgst.dataProntoBR);
      const hasProntoDateDiff =
        Boolean(prevPronto) &&
        Boolean(dgst.dataProntoBR) &&
        prevPronto.slice(0, 5) !== dgst.dataProntoBR.slice(0, 5);

      let nextPronto = prevPronto;
      if (options.updateProntoDates && dgst.dataProntoBR) {
        if (!prevPronto) {
          nextPronto = dgst.dataProntoBR;
        } else if (options.overwriteDifferingProntoDates && prevPronto !== dgst.dataProntoBR) {
          nextPronto = dgst.dataProntoBR;
        }
      }

      let nextLocalizacao = prevLocalizacao || 'PROTOCOLO';
      if (
        options.moveReadyToProntoLocation &&
        nextPronto &&
        isMutableToProntoLocation(prevLocalizacao)
      ) {
        nextLocalizacao = 'PRONTO';
      } else if (
        dgst.numero === 64442 &&
        !nextPronto &&
        ['PASTA INTERNET', 'INTERNET', 'PRANCHETA'].includes(prevLocalizacao.toUpperCase())
      ) {
        nextLocalizacao = 'DIR. DIVISÃO';
      }

      const shouldUpdateAddress =
        options.fillMissingAddresses &&
        Boolean(dgst.enderecoRaw) &&
        isPlaceholderAddress(existing.endereco);

      const nextEndereco = shouldUpdateAddress
        ? {
            ...existing.endereco,
            logradouro: dgst.enderecoParsed.logradouro || dgst.enderecoRaw.slice(0, 240),
            numero: dgst.enderecoParsed.numero || '',
            bairro: dgst.enderecoParsed.bairro || '',
            municipio: dgst.enderecoParsed.municipio || existing.endereco?.municipio || 'Angra dos Reis',
            ...(dgst.enderecoParsed.cep ? { cep: dgst.enderecoParsed.cep } : {}),
          }
        : existing.endereco;

      const nextRequerente = isPlaceholderRequerente(existing.requerente || existing.edificacao)
        ? dgst.requerente
        : (existing.requerente || existing.edificacao);

      const nextEntradaSST =
        existing.detalhesSST?.entradaSST ||
        existing.dataEntrada ||
        dgst.dataEntradaBR;

      const nextDetalhesSST = {
        ...(existing.detalhesSST || {}),
        codigo: dgst.codigo || existing.detalhesSST?.codigo || '',
        entradaSST: nextEntradaSST || '',
        ...(nextPronto ? { dataPronto: nextPronto } : {}),
        localizacao: nextLocalizacao,
      };

      const tipoFinal = existing.tipoProcesso || inferTipoProcessoPorCodigo(dgst.codigo);
      const dataEntradaFinal = existing.dataEntrada || existing.dataExpedicao || dgst.dataEntradaBR;

      const prazoCalc = calcularPrazoProcesso({
        dataEntrada: dataEntradaFinal,
        tipoProcesso: tipoFinal,
        status: existing.status,
        detalhesSST: nextDetalhesSST,
      });

      const nextDataLimite =
        prazoCalc.dataLimiteBR && prazoCalc.dataLimiteBR !== '-'
          ? prazoCalc.dataLimiteBR
          : existing.dataValidade;

      const changesSummary: string[] = [];
      if (processoUpdated) changesSummary.push(`Processo padronizado para ${dgst.e27Processo}`);
      if (hadNoProntoBefore && nextPronto) changesSummary.push(`Data do Pronto lançada: ${nextPronto}`);
      else if (nextPronto !== prevPronto && nextPronto) {
        changesSummary.push(`Data do Pronto atualizada (${prevPronto} → ${nextPronto})`);
      }
      if (nextLocalizacao !== prevLocalizacao) {
        changesSummary.push(`Localização: ${prevLocalizacao} → ${nextLocalizacao}`);
      }
      if (shouldUpdateAddress) {
        changesSummary.push(`Endereço DGST vinculado`);
      }

      const hasAnyChange = changesSummary.length > 0;

      const newLog: AuditLog | null = hasAnyChange
        ? {
            id: `log-dgst-${dgst.numero}-${Date.now()}`,
            data: `${todayBR} ${nowTimeBR}`,
            autor: 'Sincronização DGST',
            acao: 'Correlação Relatório OBM',
            detalhes: `${changesSummary.join(' · ')}.`,
          }
        : null;

      const updated: BuildingNotification = {
        ...existing,
        numero: dgst.numero,
        processo: nextProcesso,
        processoAdministrativo: options.updateE27Format
          ? dgst.e27Processo
          : existing.processoAdministrativo,
        codigoDocumento: options.updateE27Format
          ? `Processo ${dgst.e27Processo}`
          : existing.codigoDocumento,
        edificacao: nextRequerente,
        requerente: nextRequerente,
        tipoProcesso: tipoFinal,
        dataExpedicao: existing.dataExpedicao || dgst.dataEntradaBR,
        dataEntrada: dataEntradaFinal,
        dataValidade: nextDataLimite,
        dataTramite: nextDataLimite,
        detalhesSST: nextDetalhesSST,
        endereco: nextEndereco,
        historico: newLog
          ? [newLog, ...(existing.historico || [])].slice(0, 150)
          : existing.historico || [],
        atualizadoEm: nowISO,
      };

      matched.push({
        existing,
        dgst,
        updated,
        previousProcesso: prevProcesso,
        nextProcesso,
        previousPronto: prevPronto,
        nextPronto,
        previousLocalizacao: prevLocalizacao,
        nextLocalizacao,
        hadNoProntoBefore,
        hasProntoDateDiff,
        addressUpdated: shouldUpdateAddress,
        processoUpdated,
        hasAnyChange,
      });
    } else {
      // Processo novo da planilha DGST que ainda não existe na plataforma
      const tipoInferido = inferTipoProcessoPorCodigo(dgst.codigo);
      const entradaDate = dgst.dataEntradaBR || todayBR;
      const prontoDate = dgst.dataProntoBR || '';
      const statusNovo: StatusType = prontoDate ? 'PRONTO' : 'EM ANÁLISE';
      const localizacaoNova = prontoDate ? 'PRONTO' : 'PROTOCOLO';

      const prazoNovo = calcularPrazoProcesso({
        dataEntrada: entradaDate,
        tipoProcesso: tipoInferido,
        status: statusNovo,
        detalhesSST: {
          entradaSST: entradaDate,
          dataPronto: prontoDate || undefined,
        },
      });

      const dataLimiteNova =
        prazoNovo.dataLimiteBR !== '-'
          ? prazoNovo.dataLimiteBR
          : adicionarDiasAData(entradaDate, 15).dataBR;

      const obmOrigem =
        dgst.enderecoParsed.municipio === 'Itaguaí'
          ? '26º GBM - ITAGUAÍ'
          : dgst.enderecoParsed.municipio === 'Mangaratiba'
          ? 'DBM 1/26 - MANGARATIBA'
          : dgst.enderecoParsed.municipio === 'Paraty'
          ? 'DBM 1/10 - PARATY'
          : '10º GBM - ANGRA DOS REIS';

      const newRecord: BuildingNotification = {
        id: `proc-${String(dgst.numero).padStart(5, '0')}-${dgst.codigo}-${dgst.ano}`,
        numero: dgst.numero,
        processo: dgst.e27Processo,
        codigoDocumento: `Processo ${dgst.e27Processo}`,
        edificacao: dgst.requerente,
        requerente: dgst.requerente,
        tipoProcesso: tipoInferido,
        origem: dgst.enderecoParsed.municipio
          ? dgst.enderecoParsed.municipio.toUpperCase()
          : 'ANGRA DOS REIS',
        status: statusNovo,
        tipoDocumento: 'Notificação',
        obm: obmOrigem,
        dataExpedicao: entradaDate,
        dataEntrada: entradaDate,
        dataValidade: dataLimiteNova !== '-' ? dataLimiteNova : null,
        dataTramite: dataLimiteNova !== '-' ? dataLimiteNova : null,
        oculto: false,
        detalhesSST: {
          codigo: dgst.codigo,
          dataBase: String(prazoNovo.diasPrazo),
          entradaSST: entradaDate,
          entradaOBM: entradaDate,
          situacao: statusNovo,
          ...(prontoDate ? { dataPronto: prontoDate } : {}),
          localizacao: localizacaoNova,
        },
        endereco: dgst.enderecoParsed.logradouro
          ? dgst.enderecoParsed
          : {
              logradouro: '',
              numero: '',
              bairro: '',
              municipio: 'Angra dos Reis',
            },
        proprietario: {
          nomeOuRazaoSocial: dgst.requerente,
          cpfOuCnpj: '',
          telefone: '',
          email: '',
        },
        fiscalResponsavel: '',
        matriculaFiscal: '',
        processoAdministrativo: dgst.e27Processo,
        exigencias: [],
        observacoes: '',
        historico: [
          {
            id: `log-dgst-new-${dgst.numero}-${Date.now()}`,
            data: `${todayBR} ${nowTimeBR}`,
            autor: 'Sincronização DGST',
            acao: 'Importação Relatório OBM',
            detalhes: `Processo ${dgst.e27Processo} incorporado via Relatório DGST.${prontoDate ? ` Pronto em ${prontoDate}.` : ''}`,
          },
        ],
        criadoEm: nowISO,
        atualizadoEm: nowISO,
        anoExercicio: dgst.ano,
      };

      unmatchedNew.push({ dgst, record: newRecord });
    }
  }

  // Padroniza processos legados que estavam na base e não constaram no CSV (ex: 00075 -> E27/0075/11220/2026)
  const legacyNormalized: LegacyNormalizedItem[] = [];
  if (options.standardizeLegacyUnmatchedE27) {
    for (const existing of existingNotifications) {
      if (matchedIds.has(existing.id)) continue;
      const parsed = parseProcessoE27(
        existing.processo !== undefined ? existing.processo : existing.numero,
        {
          codigo: existing.detalhesSST?.codigo,
          ano: existing.anoExercicio,
        }
      );
      if (
        parsed?.formattedE27 &&
        (existing.processo !== parsed.formattedE27 ||
          existing.processoAdministrativo !== parsed.formattedE27)
      ) {
        const updated: BuildingNotification = {
          ...existing,
          processo: parsed.formattedE27,
          processoAdministrativo: parsed.formattedE27,
          codigoDocumento: `Processo ${parsed.formattedE27}`,
          atualizadoEm: nowISO,
        };
        legacyNormalized.push({
          existing,
          updated,
          previousProcesso: existing.processo || String(existing.numero).padStart(5, '0'),
          nextProcesso: parsed.formattedE27,
        });
      }
    }
  }

  return {
    matched,
    legacyNormalized,
    unmatchedNew,
    stats: {
      totalDgstRows: dgstRows.length,
      matchedCount: matched.length,
      matchedWithChangesCount: matched.filter((m) => m.hasAnyChange).length,
      newlyReadyCount: matched.filter((m) => m.hadNoProntoBefore && Boolean(m.nextPronto)).length,
      prontoDateDiffCount: matched.filter((m) => m.hasProntoDateDiff).length,
      processoFormatUpdatedCount: matched.filter((m) => m.processoUpdated).length,
      addressFilledCount: matched.filter((m) => m.addressUpdated).length,
      movedToProntoCount: matched.filter(
        (m) => m.nextLocalizacao === 'PRONTO' && m.previousLocalizacao !== 'PRONTO'
      ).length,
      legacyNormalizedCount: legacyNormalized.length,
      unmatchedNewCount: unmatchedNew.length,
      unmatchedNewWithProntoCount: unmatchedNew.filter((u) => Boolean(u.dgst.dataProntoBR)).length,
    },
  };
}
