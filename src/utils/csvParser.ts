import { BuildingNotification, DocumentType, StatusType, SSTProcessDetails, BilheteItem } from '../types';
import { formatDateBR, formatProcesso, formatCpfCnpj, adicionarDiasAData, getDiasPrazoPorTipo, calcularPrazoProcesso } from './helpers';
import { cleanProcessLinkValue, computeLinkBackfillUpdates } from './processLinks';

/**
 * Robust CSV / TSV parser that accurately handles quotes, escaped quotes, line breaks,
 * and detects delimiters (semicolon, comma, tab) based on multiple sample rows.
 */
export function parseCSV(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM
  if (!cleanText) return [];

  // Determine delimiter: inspect first 5 lines for robust frequency analysis
  const sampleLines = cleanText.split(/\r\n|\n|\r/).slice(0, 5).join('\n');
  const tabCount = (sampleLines.match(/\t/g) || []).length;
  const semicolonCount = (sampleLines.match(/;/g) || []).length;
  const commaCount = (sampleLines.match(/,/g) || []).length;

  let delimiter = ';';
  if (tabCount > semicolonCount && tabCount > commaCount) {
    delimiter = '\t';
  } else if (commaCount > semicolonCount) {
    delimiter = ',';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes string for fuzzy header matching (removes accents, spaces, special chars)
 */
export function cleanHeader(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Intelligent field mapper matching column headers from Google Sheets spreadsheets.
 * Supports primary headers and optional secondary sub-headers row.
 */
export function mapHeadersToIndexes(headers: string[], subHeaders?: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const norm = cleanHeader(h);
    const subNorm = subHeaders && subHeaders[idx] ? cleanHeader(subHeaders[idx]) : '';
    const prevNorm = idx > 0 ? cleanHeader(headers[idx - 1]) : '';

    // PROCESSO (não confundir com Código, Processo Antigo ou Processo Seguinte)
    if (norm.includes('processo') && !norm.includes('antigo') && !norm.includes('seguinte') && !norm.includes('adm')) {
      if (map.processo === undefined) map.processo = idx;
    } else if (norm === 'proc' || norm === 'numproc' || norm === 'nprocesso' || norm === 'numerodoprocesso') {
      if (map.processo === undefined) map.processo = idx;
    }

    // TIPO (Certificado de Aprovação, Laudo de Exigências, etc.)
    if (norm === 'tipo' || norm.includes('tipoprocesso') || norm.includes('tipodeprocesso') || norm.includes('tipodocumento')) {
      if (map.tipoProcesso === undefined) map.tipoProcesso = idx;
    }

    // CÓDIGO (11220, 11210, etc.)
    if (norm === 'codigo' || norm === 'cod' || norm.includes('codigosst') || norm === 'codinterno') {
      if (map.codigoSST === undefined) map.codigoSST = idx;
    }

    // DATA BASE (15, 30, etc.)
    if (norm.includes('database') || norm === 'base' || norm === 'prazodias' || norm === 'prazo') {
      if (map.dataBase === undefined) map.dataBase = idx;
    }

    // ORIGEM (ANGRA DOS REIS, ITAGUAÍ, MANGARATIBA, etc.)
    if (norm.includes('origem') || norm.includes('procedencia') || norm.includes('setororigem') || norm.includes('municipio') || norm.includes('cidade')) {
      if (map.origem === undefined) map.origem = idx;
    }

    // REQUERENTE / EDIFICAÇÃO (Nome / Razão Social)
    if (norm.includes('requerente') || norm.includes('interessado') || norm.includes('razaosocial') || norm.includes('edificacao') || norm.includes('estabelecimento')) {
      if (map.requerente === undefined) map.requerente = idx;
      if (map.edificacao === undefined) map.edificacao = idx;
    }

    // CPF / CNPJ
    if (norm.includes('cpf') || norm.includes('cnpj') || norm.includes('cpfcnpj') || norm.includes('documento')) {
      if (!norm.includes('antigo') && !norm.includes('gerado')) {
        if (map.cpfOuCnpj === undefined) map.cpfOuCnpj = idx;
      }
    }

    // ENTRADA NA SST (inclui "ENTRADA NA SST PROTOCOLO")
    if (
      norm.includes('entradasst') ||
      (norm.includes('entrada') && norm.includes('sst')) ||
      (norm.includes('entrada') && (norm.includes('protocolo') || subNorm.includes('protocolo')))
    ) {
      if (map.entradaSST === undefined) map.entradaSST = idx;
      if (map.dataEntrada === undefined) map.dataEntrada = idx;
    }

    // ENTRADA DA OBM
    if (norm.includes('entradaobm') || (norm.includes('entrada') && (norm.includes('obm') || subNorm.includes('obm')))) {
      if (map.entradaOBM === undefined) map.entradaOBM = idx;
    }

    // PROCESSO ANTIGO
    if (norm.includes('processoantigo') || norm.includes('procantigo')) {
      if (map.processoAntigo === undefined) map.processoAntigo = idx;
    }

    // Nº DO DOC. ANTIGO
    if (norm.includes('docantigo') || norm.includes('documentoantigo') || norm.includes('numdocantigo')) {
      if (map.numDocAntigo === undefined) map.numDocAntigo = idx;
    }

    // ENVIO AO DIR. DIVISÃO
    if (norm.includes('divisao') || (norm.includes('envio') && (norm.includes('dir') || norm.includes('div')))) {
      if (map.envioDirDivisao === undefined) map.envioDirDivisao = idx;
    }

    // SITUAÇÃO / STATUS
    if (norm.includes('situacao') || norm === 'status' || norm === 'estado') {
      if (map.situacao === undefined) {
        map.situacao = idx;
        map.status = idx;
      } else {
        // Segunda coluna "SITUAÇÃO" na planilha refere-se à Situação do Doc. Gerado
        map.situacaoDocGerado = idx;
      }
    }

    // BILHETES (DATA DO BILHETE / OUTROS BILHETES / ÚLTIMO BILHETE)
    if (norm.includes('bilhete') || subNorm.includes('bilhete')) {
      if (subNorm.includes('outro') || norm.includes('outros')) {
        map.outrosBilhetes = idx;
      } else if (subNorm.includes('ultimo') || norm.includes('ultimo')) {
        map.ultimoBilhete = idx;
      } else if (map.dataBilhete === undefined) {
        map.dataBilhete = idx;
        map.bilhetes = idx;
      }
    }

    // AO DIRETOR
    if (norm.includes('aodiretor') || (norm.includes('diretor') && !norm.includes('divisao') && !norm.includes('envio'))) {
      if (map.aoDiretor === undefined) map.aoDiretor = idx;
    }

    // GRÁFICO
    if (norm.includes('grafico')) {
      if (map.grafico === undefined) map.grafico = idx;
    }

    // DOC. GERADO
    if (norm.includes('docgerado') || norm.includes('documentogerado') || norm.includes('numdocgerado')) {
      if (map.docGerado === undefined) map.docGerado = idx;
    }

    // PREVISÃO PARA O PRONTO
    if (norm.includes('previsao')) {
      if (map.previsaoPronto === undefined) map.previsaoPronto = idx;
    }

    // DATA DO PRONTO
    if (norm.includes('datapronto') || norm.includes('datadopronto') || (norm.includes('pronto') && !norm.includes('previsao'))) {
      if (map.dataPronto === undefined) map.dataPronto = idx;
      if (map.dataTramite === undefined) map.dataTramite = idx;
    }

    // PROCESSO SEGUINTE
    if (norm.includes('processoseguinte') || norm.includes('procseguinte') || norm.includes('seguinte')) {
      if (map.processoSeguinte === undefined) map.processoSeguinte = idx;
    }

    // DATA DE ENTREGUE
    if (norm.includes('dataentregue') || norm.includes('datadeentregue') || norm.includes('entregue') || norm.includes('dataentrega')) {
      if (map.dataEntregue === undefined) map.dataEntregue = idx;
    }

    // DIAS EM ATRASO
    if (norm.includes('atraso')) {
      if (map.diasEmAtraso === undefined) map.diasEmAtraso = idx;
    }

    // DIAS NA SST
    if ((norm.includes('dias') && norm.includes('sst')) || norm === 'diasnasst') {
      if (map.diasNaSST === undefined) map.diasNaSST = idx;
    }

    // NO GERAL ATÉ ENTREGA
    if (norm.includes('nogeral') || norm.includes('geral')) {
      if (map.noGeral === undefined) map.noGeral = idx;
    }

    // LOCALIZAÇÃO (PASTA INTERNET, PRANCHETA, etc.)
    if (norm.includes('localizacao') || norm.includes('pasta') || norm.includes('acervo')) {
      if (map.localizacao === undefined) map.localizacao = idx;
    }

    // DIAS (Colunas com nome 'DIAS' repetido de acordo com coluna anterior ou sub-header)
    if (norm === 'dias' || norm === 'dia' || subNorm === 'dias' || subNorm === 'dia') {
      if (prevNorm.includes('obm') || prevNorm.includes('entrada') || idx === 9) {
        map.diasEntrada = idx;
      } else if (prevNorm.includes('divisao') || prevNorm.includes('envio') || idx === 13) {
        map.diasEnvioDivisao = idx;
      } else if (subNorm.includes('ultimo') || prevNorm.includes('ultimo') || idx === 19) {
        map.diasUltimoBilhete = idx;
      } else if (prevNorm.includes('bilhete') || subNorm.includes('bilhete') || idx === 16) {
        map.diasBilhetes = idx;
      } else if (prevNorm.includes('diretor') || idx === 21) {
        map.diasAoDiretor = idx;
      } else if (prevNorm.includes('previsao') || prevNorm.includes('pronto')) {
        map.diasPrevisao = idx;
      } else if (prevNorm.includes('entregue') || prevNorm.includes('entrega') || idx === 29) {
        map.diasEntrega = idx;
      } else if (map.diasEntrada === undefined) {
        map.diasEntrada = idx;
      }
    }

    // Outros dados cadastrais opcionais
    if (norm.includes('obm') || norm.includes('unidade') || norm.includes('batalhao') || norm.includes('gbm')) {
      if (!map.obm) map.obm = idx;
    }
    if (norm.includes('endereco') || norm.includes('logradouro') || norm.includes('rua') || norm.includes('av')) {
      if (!map.logradouro) map.logradouro = idx;
    }
    if (norm.includes('numend') || norm.includes('numeroend') || norm.includes('predial')) {
      if (!map.numeroEndereco) map.numeroEndereco = idx;
    }
    if (norm.includes('bairro')) {
      if (!map.bairro) map.bairro = idx;
    }
    if (norm.includes('cep')) {
      if (!map.cep) map.cep = idx;
    }
    if (norm.includes('telefone') || norm.includes('contato') || norm.includes('tel') || norm.includes('celular')) {
      if (!map.telefone) map.telefone = idx;
    }
    if (norm.includes('email') || norm.includes('correio')) {
      if (!map.email) map.email = idx;
    }
    if (norm.includes('fiscal') || norm.includes('vistoriante') || norm.includes('militar')) {
      if (!map.fiscal) map.fiscal = idx;
    }
    if (norm.includes('processoadm') || norm.includes('procadm')) {
      if (!map.processoAdm) map.processoAdm = idx;
    }
    if (norm.includes('exigencia') || norm.includes('irregularidade') || norm.includes('itens')) {
      if (!map.exigencias) map.exigencias = idx;
    }
    if (norm.includes('observacao') || norm.includes('obs') || norm.includes('parecer') || norm.includes('despacho')) {
      if (!map.observacoes) map.observacoes = idx;
    }
  });

  // Fallback para layout padrão de controle de processos SST (34 colunas)
  if (headers.length >= 20) {
    if (map.dataBilhete === undefined) map.dataBilhete = 15;
    if (map.bilhetes === undefined) map.bilhetes = 15;
    if (map.diasBilhetes === undefined) map.diasBilhetes = 16;
    if (map.outrosBilhetes === undefined) map.outrosBilhetes = 17;
    if (map.ultimoBilhete === undefined) map.ultimoBilhete = 18;
    if (map.diasUltimoBilhete === undefined) map.diasUltimoBilhete = 19;
  }

  return map;
}

/**
 * Converts raw parsed CSV matrix into structured BuildingNotification array.
 * Intelligently identifies the real header row (bypassing section title banners like '2026, PROTOCOLO...'),
 * handles sub-header lines, maps all columns, and discards blank template rows.
 */
export function convertRowsToNotifications(
  rows: string[][],
  startNumber = 1
): { items: BuildingNotification[]; warnings: string[] } {
  if (rows.length < 2) {
    return { items: [], warnings: ['A planilha deve conter pelo menos 1 linha de cabeçalho e 1 linha de dados.'] };
  }

  // 1. Detect the real header row index (scanning first 10 rows for recognizable column names)
  const KEYWORDS = [
    'processo', 'requerente', 'edificacao', 'tipo', 'codigo', 'codigosst',
    'database', 'origem', 'entradasst', 'entrada', 'situacao', 'status',
    'cpf', 'cnpj', 'localizacao', 'bilhete', 'diretor', 'grafico', 'docgerado', 'pronto'
  ];

  let headerRowIndex = 0;
  let maxHeaderScore = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    let score = 0;
    for (const cell of row) {
      const norm = cleanHeader(cell);
      if (KEYWORDS.some((k) => norm.includes(k))) {
        score++;
      }
    }
    if (score > maxHeaderScore) {
      maxHeaderScore = score;
      headerRowIndex = i;
    }
  }

  const headers = rows[headerRowIndex];
  let startDataRow = headerRowIndex + 1;
  let subHeaders: string[] | undefined = undefined;

  // 2. Check if the row immediately following is a sub-header row (e.g. DATA DO BILHETE, OUTROS BILHETES...)
  if (rows[startDataRow]) {
    const nextRowWords = rows[startDataRow].map(cleanHeader).filter((w) => w.length > 0);
    const isSubheader =
      nextRowWords.some((w) => w.includes('bilhete') || w.includes('outros') || w.includes('ultimo') || w.includes('dias')) &&
      nextRowWords.length < headers.length / 2;
    if (isSubheader) {
      subHeaders = rows[startDataRow];
      startDataRow++;
    }
  }

  const dataRows = rows.slice(startDataRow);
  const map = mapHeadersToIndexes(headers, subHeaders);
  const warnings: string[] = [];
  const items: BuildingNotification[] = [];

  // Check if standard SST 34-column layout
  const isStandardSSTSequence =
    (map.processo === 0 || cleanHeader(headers[0] || '').includes('processo')) &&
    (map.tipoProcesso === 1 || cleanHeader(headers[1] || '').includes('tipo'));

  dataRows.forEach((row, rowIdx) => {
    if (!row || row.length === 0) return;

    // Helper to get value by mapped index or positional fallback
    const val = (idx?: number, fallbackIdx?: number): string => {
      if (idx !== undefined && row[idx] !== undefined) return row[idx].trim();
      if (isStandardSSTSequence && fallbackIdx !== undefined && row[fallbackIdx] !== undefined) {
        return row[fallbackIdx].trim();
      }
      return '';
    };

    const rawProc = val(map.processo, 0);
    const rawTipo = val(map.tipoProcesso, 1);
    const rawCodigo = val(map.codigoSST, 2);
    const rawDataBase = val(map.dataBase, 3);
    const rawOrigem = val(map.origem, 4);
    const rawRequerente = val(map.requerente, 5) || val(map.edificacao);
    const rawCpfCnpj = val(map.cpfOuCnpj, 6);

    // CRITICAL: Filter out empty or template rows!
    const procDigits = rawProc.replace(/[^\d]/g, '');
    const cleanReq = rawRequerente.replace(/[-_\s]/g, '');

    if (!procDigits && !cleanReq) {
      // Discard empty template row
      return;
    }

    // Requerente: estritamente o que estiver na planilha
    const requerenteFinal = rawRequerente && rawRequerente !== '- - - -' && rawRequerente !== '-'
      ? rawRequerente
      : (procDigits ? `Processo nº ${procDigits.padStart(5, '0')}` : (rawProc || ''));

    // Dates: estritamente o que estiver na planilha
    const rawEntradaSST = (map.entradaSST !== undefined ? row[map.entradaSST]?.trim() : '') || val(map.dataEntrada, 7);
    const rawEntradaOBM = val(map.entradaOBM, 8);
    const rawDiasEntrada = val(map.diasEntrada, 9);

    const rawProcAntigo = val(map.processoAntigo, 10);
    const rawDocAntigo = val(map.numDocAntigo, 11);
    const rawEnvioDivisao = val(map.envioDirDivisao, 12);
    const rawDiasEnvio = val(map.diasEnvioDivisao, 13);

    // Status / Situação: estritamente o que estiver na planilha
    const rawSituacao = (map.situacao !== undefined ? row[map.situacao]?.trim() : '') || val(map.status, 14);
    const rawBilhetes = val(map.bilhetes, 15);
    const rawDiasBilhetes = val(map.diasBilhetes, 16);
    const rawOutrosBilhetes = val(map.outrosBilhetes, 17);
    const rawUltimoBilhete = val(map.ultimoBilhete, 18);
    const rawDiasUltimoBilhete = val(map.diasUltimoBilhete, 19);

    const rawAoDiretor = val(map.aoDiretor, 20);
    const rawDiasAoDiretor = val(map.diasAoDiretor, 21);

    const rawGrafico = val(map.grafico, 22);
    const rawDocGerado = val(map.docGerado, 23);
    const rawSituacaoDoc = val(map.situacaoDocGerado, 24);

    const rawPrevisao = val(map.previsaoPronto, 25);
    const rawDataPronto = val(map.dataPronto, 26);
    const rawProcSeguinte = val(map.processoSeguinte, 27);
    const rawDataEntregue = val(map.dataEntregue, 28);
    const rawDiasEntrega = val(map.diasEntrega, 29);
    const rawDiasAtraso = val(map.diasEmAtraso, 30);
    const rawDiasSST = val(map.diasNaSST, 31);
    const rawNoGeral = val(map.noGeral, 32);
    const rawLocalizacao = val(map.localizacao, 33);

    // Number & Processo format (ex: 00075)
    let parsedNumber = startNumber + items.length;
    let processoStr = '';
    if (procDigits) {
      parsedNumber = parseInt(procDigits, 10);
      processoStr = procDigits.padStart(5, '0');
    } else if (rawProc) {
      processoStr = rawProc;
    }

    // Format Dates (DD/MM/AAAA) - Apenas se houver data fornecida no CSV
    const rawEntrada = rawEntradaSST || rawEntradaOBM;
    const dataEntradaFormatada = rawEntrada ? formatDateBR(rawEntrada) : '';

    // Consolidated legal deadline calculation
    const prazoCalc = calcularPrazoProcesso({
      dataEntrada: dataEntradaFormatada || undefined,
      tipoProcesso: rawTipo || undefined,
      status: rawSituacao || undefined,
      detalhesSST: {
        entradaSST: rawEntradaSST || undefined,
        dataPronto: rawDataPronto || undefined,
      },
    });

    const dataTramiteFormatada = prazoCalc.dataLimiteBR !== '-' ? prazoCalc.dataLimiteBR : null;

    // Status
    const statusFinal: StatusType = (rawSituacao || 'EM ANÁLISE') as StatusType;

    // Document Type baseado no tipo informado
    let docTypeFinal: DocumentType = 'Notificação';
    const tipoLower = (rawTipo || '').toLowerCase();
    if (tipoLower.includes('infracao') || tipoLower.includes('infração')) docTypeFinal = 'Auto de Infração';
    else if (tipoLower.includes('interd')) docTypeFinal = 'Interdição';
    else if (tipoLower.includes('tac')) docTypeFinal = 'TAC';
    else if (tipoLower.includes('preventiv')) docTypeFinal = 'Notificação Preventiva';

    // OBM Unit (apenas o que estiver na planilha)
    const obmNome = rawOrigem || (val(map.obm) || '');

    // Endereço / Localização (apenas dados presentes na planilha, sem inventar)
    const rawEndereco = val(map.logradouro) || '';
    const rawNumEnd = val(map.numeroEndereco) || '';
    const bairro = val(map.bairro) || '';
    const municipio = val(map.municipio) || (rawOrigem || '');

    // Fiscal (apenas dados presentes na planilha)
    const fiscal = val(map.fiscal) || '';
    const matricula = val(map.matriculaFiscal) || '';
    const processoAdm = val(map.processoAdm) || '';

    // Exigências (apenas se fornecidas na planilha)
    let exigencias: string[] = [];
    const rawExig = val(map.exigencias);
    if (rawExig) {
      exigencias = rawExig
        .split(/;|\n|\|/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    // Bilhetes Estruturados (apenas quando presentes na planilha)
    const dataBilheteFormatada = rawBilhetes ? formatDateBR(rawBilhetes) : '';
    const ultimoBilheteFormatada = rawUltimoBilhete ? formatDateBR(rawUltimoBilhete) : '';

    const listaBilhetes: BilheteItem[] = [];
    if (rawBilhetes && rawBilhetes !== '- - - -' && rawBilhetes !== '-') {
      // O 1º Bilhete é sempre identificado como BILHETE 1 (não copia a situação dos outros bilhetes)
      listaBilhetes.push({
        id: `bilhete-1-${processoStr || rowIdx}`,
        ordem: 1,
        tipo: 'primeiro',
        tipoDetalhe: 'BILHETE',
        rotulo: '1º Bilhete',
        data: dataBilheteFormatada,
        dias: rawDiasBilhetes || '0',
        statusOuParecer: 'BILHETE 1',
        despacho: `Primeiro bilhete lançado com ${rawDiasBilhetes || 0} dia(s) decorridos.`,
        autor: fiscal || '',
      });
    }

    if (rawUltimoBilhete && rawUltimoBilhete !== '- - - -' && rawUltimoBilhete !== '-') {
      const isDiferente = rawUltimoBilhete !== rawBilhetes || rawDiasUltimoBilhete !== rawDiasBilhetes;
      if (isDiferente || listaBilhetes.length === 0) {
        // O Último Bilhete recebe a situação da coluna OUTROS BILHETES (ex: BILHETE 3, RETORNO, GERADO DI, FINALIZADO)
        listaBilhetes.push({
          id: `bilhete-ultimo-${processoStr || rowIdx}`,
          ordem: listaBilhetes.length + 1,
          tipo: 'ultimo',
          tipoDetalhe: 'RETORNO',
          rotulo: 'Último Bilhete',
          data: ultimoBilheteFormatada,
          dias: rawDiasUltimoBilhete || '0',
          statusOuParecer: rawOutrosBilhetes || 'Último Bilhete',
          despacho: rawOutrosBilhetes ? `Parecer: ${rawOutrosBilhetes}` : `Último bilhete registrado com ${rawDiasUltimoBilhete || 0} dia(s) decorridos.`,
          autor: fiscal || '',
        });
      }
    }

    const sstDetails: SSTProcessDetails = {
      codigo: rawCodigo || '',
      dataBase: rawDataBase || '',
      entradaSST: rawEntradaSST || '',
      entradaOBM: rawEntradaOBM || '',
      diasEntrada: rawDiasEntrada || '',
      processoAntigo: cleanProcessLinkValue(rawProcAntigo),
      numDocAntigo: cleanProcessLinkValue(rawDocAntigo),
      envioDirDivisao: rawEnvioDivisao || '',
      diasEnvioDivisao: rawDiasEnvio || '',
      situacao: rawSituacao || '',
      bilhetes: rawBilhetes || '',
      dataBilhete: rawBilhetes || '',
      diasBilhetes: rawDiasBilhetes || '',
      diasBilhete: rawDiasBilhetes || '',
      outrosBilhetes: rawOutrosBilhetes || '',
      ultimoBilhete: rawUltimoBilhete || '',
      diasUltimoBilhete: rawDiasUltimoBilhete || '',
      listaBilhetes,
      aoDiretor: rawAoDiretor || '',
      dataAoDiretor: rawAoDiretor || '',
      diasAoDiretor: rawDiasAoDiretor || '',
      grafico: rawGrafico || '',
      docGerado: rawDocGerado || '',
      situacaoDocGerado: rawSituacaoDoc || '',
      previsaoPronto: rawPrevisao || '',
      diasPrevisao: val(map.diasPrevisao) || '',
      dataPronto: rawDataPronto || '',
      processoSeguinte: cleanProcessLinkValue(rawProcSeguinte),
      dataEntregue: rawDataEntregue || '',
      diasEntrega: rawDiasEntrega || '',
      diasEmAtraso: rawDiasAtraso || '',
      diasNaSST: rawDiasSST || '',
      noGeral: rawNoGeral || '',
      localizacao: rawLocalizacao || '',
    };

    // Histórico de auditoria real
    const historicoInicial: any[] = [];
    if (dataEntradaFormatada) {
      historicoInicial.push({
        id: `h-import-${Date.now()}-${rowIdx}`,
        data: dataEntradaFormatada,
        autor: 'Importação CSV',
        acao: 'Entrada Registrada',
        detalhes: `Entrada registrada em ${dataEntradaFormatada}.${rawTipo ? ` Tipo: ${rawTipo}.` : ''}${rawOrigem ? ` Origem: ${rawOrigem}.` : ''}`,
      });
    }

    const safeProcPart = (processoStr || String(rowIdx)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const yearMatch = dataEntradaFormatada.match(/(\d{4})/);
    const anoExercicioInferido = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

    const item: BuildingNotification = {
      id: `proc-${safeProcPart}-${Date.now()}-${rowIdx}`,
      numero: parsedNumber,
      processo: processoStr || undefined,
      codigoDocumento: processoStr ? `Processo nº ${processoStr}` : (rawCodigo ? `Código: ${rawCodigo}` : 'S/N'),
      edificacao: requerenteFinal,
      requerente: requerenteFinal,
      tipoProcesso: rawTipo || '',
      origem: rawOrigem || '',
      status: statusFinal,
      tipoDocumento: docTypeFinal,
      obm: obmNome,
      dataExpedicao: dataEntradaFormatada,
      dataEntrada: dataEntradaFormatada,
      dataValidade: dataTramiteFormatada,
      dataTramite: dataTramiteFormatada,
      oculto: false,
      detalhesSST: sstDetails,
      endereco: {
        logradouro: rawEndereco,
        numero: rawNumEnd,
        bairro,
        municipio,
      },
      proprietario: {
        nomeOuRazaoSocial: requerenteFinal,
        cpfOuCnpj: formatCpfCnpj(rawCpfCnpj),
        telefone: val(map.telefone) || '',
        email: val(map.email) || '',
      },
      fiscalResponsavel: fiscal,
      matriculaFiscal: matricula,
      processoAdministrativo: processoAdm || undefined,
      exigencias,
      observacoes: val(map.observacoes) || '',
      historico: historicoInicial,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      anoExercicio: anoExercicioInferido,
    };

    items.push(item);
  });

  // Consolida vínculos bidirecionais (PROCESSO ANTIGO <-> PROCESSO SEGUINTE) nos registros importados
  const backfilled = computeLinkBackfillUpdates(items);
  if (backfilled.length > 0) {
    const patchMap = new Map(backfilled.map((u) => [u.id, u]));
    for (let i = 0; i < items.length; i++) {
      const patched = patchMap.get(items[i].id);
      if (patched) {
        items[i] = {
          ...items[i],
          detalhesSST: patched.detalhesSST,
        };
      }
    }
  }

  return { items, warnings };
}

/**
 * Returns an example CSV template matching the exact format specified by the user
 */
export function getExampleCSV(): string {
  const headers = [
    'PROCESSO',
    'TIPO',
    'CÓDIGO',
    'DATA BASE',
    'ORIGEM',
    'REQUERENTE',
    'CPF / CNPJ',
    'ENTRADA NA SST',
    'ENTRADA DA OBM',
    'DIAS',
    'PROCESSO ANTIGO',
    'Nº DO DOC. ANTIGO',
    'ENVIO AO DIR. DIVISÃO',
    'DIAS',
    'SITUAÇÃO',
    'BILHETES',
    'AO DIRETOR',
    'GRÁFICO',
    'DOC. GERADO',
    'DATA DO PRONTO',
    'DATA DE ENTREGUE',
    'LOCALIZAÇÃO',
  ];

  const rows = [
    [
      '00075',
      'Certificado de Aprovação',
      '11220',
      '15',
      'ANGRA DOS REIS',
      'RONEY MARCHTEIN',
      '4579497830',
      '05/01/2026',
      '05/01/2026',
      '0',
      '- - - -',
      '- - - -',
      '05/01/2026',
      '0',
      'INDEFERIDO',
      '05/01/2026',
      '13/01/2026',
      'DI',
      'DI-1029',
      '13/01/2026',
      '15/01/2026',
      'PASTA INTERNET',
    ],
  ];

  return '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\r\n');
}
