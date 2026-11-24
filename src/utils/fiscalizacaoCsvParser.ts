import {
  FISCALIZACAO_STATUS_LIST,
  FiscalizacaoAto,
  FiscalizacaoRecord,
  FiscalizacaoStatus,
} from '../types/fiscalizacao';

export const FISCALIZACAO_SEED_CSV_URL =
  '/assets/aistudio/processos_dgst_10gbm_estruturado_15a0f907.csv';

/**
 * Parser RFC-4180 para CSV delimitado por ponto-e-vírgula (ou vírgula fallback),
 * preservando quebras de linha e separadores dentro de campos entre aspas.
 */
export function parseSemicolonCsv(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semiCount >= commaCount ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        row.push(field);
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        if (row.some((cell) => cell.trim() !== '')) {
          rows.push(row);
        }
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

export function normalizeFiscalizacaoStatus(raw?: string): FiscalizacaoStatus {
  const clean = (raw || '').trim();
  const exact = FISCALIZACAO_STATUS_LIST.find(
    (s) => s.toLowerCase() === clean.toLowerCase()
  );
  if (exact) return exact;

  const norm = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (norm.includes('perigo iminente')) return 'Auto de Interdição por Perigo iminente';
  if (norm.includes('inercia') || norm.includes('interdicao')) {
    return 'Auto de Interdição por Inércia';
  }
  if (norm.includes('2') && norm.includes('auto')) return '2º Auto de Infração';
  if (norm.includes('1') && norm.includes('auto')) return '1º Auto de Infração';
  if (norm.includes('tac')) return 'TAC em Andamento';
  if (norm.includes('cancelad')) return 'Cancelado';
  if (norm.includes('encerrad') || norm.includes('cumprid')) return 'Encerrado';
  return 'Notificação';
}

export function normalizeMunicipio(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean || clean === '*' || clean === '-' || clean === 'A') {
    return 'Não Informado';
  }
  const norm = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');

  if (norm.includes('ANGRA')) return 'Angra dos Reis';
  if (norm.includes('MANGAR') || norm.includes('MANGART')) return 'Mangaratiba';
  if (norm.includes('ITAGUA')) return 'Itaguaí';
  if (norm.includes('ILHA GRANDE')) return 'Ilha Grande';
  if (norm.includes('RIO DE JANEIRO')) return 'Rio de Janeiro';
  if (norm.includes('CANCELAD') || norm.includes('EM BRANCO')) return 'Não Informado';
  if (norm === 'PRAIA DO JARDIM') return 'Angra dos Reis';
  if (norm === 'CENTRO') return 'Não Informado';

  return clean
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function normalizeTipoAtoLabel(raw: string): string {
  const clean = raw.trim();
  const norm = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (norm.includes('notificacao')) return 'Notificação';
  if (norm.includes('1') && norm.includes('infracao')) return '1º Auto de Infração';
  if (norm.includes('2') && norm.includes('infracao')) return '2º Auto de Infração';
  if (norm.includes('interdicao')) return 'Auto de Interdição';
  if (norm.includes('tac')) return 'TAC';
  return clean || 'Ato Fiscal';
}

export function parseHistoricoAtos(historicoTexto: string): FiscalizacaoAto[] {
  const text = (historicoTexto || '').trim();
  if (!text) return [];

  // Divide em segmentos iniciados por DD/MM/YYYY - ...
  const segments = text
    .split(/(?=\b\d{2}\/\d{2}\/\d{4}\s*-)/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return [
      {
        id: 'ato-1',
        data: '',
        tipoAto: 'Registro',
        numeroAto: '',
        orgao: '',
        observacao: text.slice(0, 400),
      },
    ];
  }

  return segments.slice(0, 50).map((seg, idx) => {
    // Ex: "25/11/2013 - Notificacao - 50772 - DGST - CANCELADA Nota 149..."
    const parts = seg.split(/\s+-\s+/);
    const data = (parts[0] || '').trim();
    const tipoAto = normalizeTipoAtoLabel(parts[1] || '');
    const numeroAto = (parts[2] || '').trim();
    const orgaoPart = (parts[3] || '').trim();

    let orgao = orgaoPart;
    let obsTail = parts.slice(4).join(' - ').trim();

    // Caso o 4º bloco tenha "DGST texto extra..."
    const orgaoMatch = orgaoPart.match(/^(DGST|DDP|CBMERJ|OBM|10º\s*GBM|SST)\b(.*)$/i);
    if (orgaoMatch) {
      orgao = orgaoMatch[1].toUpperCase();
      const remainder = orgaoMatch[2].trim();
      if (remainder) {
        obsTail = obsTail ? `${remainder} - ${obsTail}` : remainder;
      }
    }

    return {
      id: `ato-${idx + 1}`,
      data: data.slice(0, 20),
      tipoAto: tipoAto.slice(0, 80),
      numeroAto: numeroAto.slice(0, 40),
      orgao: orgao.slice(0, 40),
      ...(obsTail ? { observacao: obsTail.slice(0, 400) } : {}),
    };
  });
}

function extractHeadFields(
  headText: string,
  summaryEdificacao?: string
): {
  edificacao: string;
  documentoCpfCnpj: string;
  enderecoCompleto: string;
  municipio: string;
} {
  const head = (headText || '').replace(/\s+/g, ' ').trim();
  const cleanSummary = (summaryEdificacao || '').replace(/\s+/g, ' ').trim();

  let edificacao = cleanSummary;
  let documentoCpfCnpj = '';
  let enderecoCompleto = '';

  // 1) Tenta localizar CNPJ/CPF (inclusive formatos legados com ruído de pontuação)
  const docMatch = head.match(/\s(\d[\d.\-\/]{6,22}\d)\s*/);
  if (docMatch && docMatch.index !== undefined) {
    const before = head.slice(0, docMatch.index).trim();
    const after = head.slice(docMatch.index + docMatch[0].length).trim();
    documentoCpfCnpj = docMatch[1].trim();
    enderecoCompleto = after;

    if (!edificacao) {
      edificacao = before;
    } else if (
      before &&
      before.length > edificacao.length &&
      before.toLowerCase().includes(edificacao.toLowerCase())
    ) {
      // Ex: summary="Marina Verolme", before="Verolme Marina Verolme" -> mantém o mais informativo ou limpo
      edificacao = edificacao;
    } else if (!cleanSummary) {
      edificacao = before;
    }
  } else {
    // 2) Tenta separadores legados ("CA.NCE.LAD/O" ou " * ")
    const specialSep = head.match(/\s(CA\.NCE\.LAD\/O|\*)\s*/);
    if (specialSep && specialSep.index !== undefined) {
      const before = head.slice(0, specialSep.index).trim();
      const after = head.slice(specialSep.index + specialSep[0].length).trim();
      documentoCpfCnpj = specialSep[1] === '*' ? '' : specialSep[1];
      enderecoCompleto = after;
      if (!edificacao) edificacao = before;
    } else {
      if (!edificacao) edificacao = head;
      enderecoCompleto = head;
    }
  }

  // Limpa asteriscos e repetições tipo "CANCELADO CANCELADO - CANCELADO"
  if (!edificacao || edificacao === '*') {
    edificacao = 'EM BRANCO';
  }

  let municipio = 'Não Informado';
  const muniMatch = (enderecoCompleto || head).match(/-\s*([^-]+)$/);
  if (muniMatch) {
    municipio = normalizeMunicipio(muniMatch[1]);
  }

  return {
    edificacao: edificacao.slice(0, 300),
    documentoCpfCnpj: documentoCpfCnpj.slice(0, 40),
    enderecoCompleto: (enderecoCompleto === '* * * * - *' ? '' : enderecoCompleto).slice(0, 400),
    municipio: municipio.slice(0, 120),
  };
}

function resolveExpeditionDate(
  rawDate: string,
  atos: FiscalizacaoAto[]
): { dataExpedicao: string; anoExpedicao: string } {
  const cleanRaw = (rawDate || '').trim();
  const validRaw =
    /^\d{2}\/\d{2}\/\d{4}$/.test(cleanRaw) && cleanRaw !== '00/00/0000'
      ? cleanRaw
      : '';

  let chosen = validRaw;
  if (!chosen) {
    const validFromAto = atos.find(
      (a) => /^\d{2}\/\d{2}\/\d{4}$/.test(a.data) && a.data !== '00/00/0000'
    );
    if (validFromAto) {
      chosen = validFromAto.data;
    }
  }

  const yearMatch = chosen.match(/\b(19\d{2}|20\d{2})\b/);
  return {
    dataExpedicao: chosen || (cleanRaw === '00/00/0000' ? '00/00/0000' : ''),
    anoExpedicao: yearMatch ? yearMatch[1] : '',
  };
}

function parseBlob(blob: string): {
  head: string;
  processoVinculado: string;
  historicoTexto: string;
  redacao: string;
} {
  const pIdx = blob.indexOf('Processo:');
  const hIdx = blob.indexOf('Histórico:');
  const rIdx = blob.indexOf('Redação:');

  const head = pIdx >= 0 ? blob.slice(0, pIdx).trim() : blob.trim();
  const processoVinculado =
    pIdx >= 0 && hIdx > pIdx ? blob.slice(pIdx + 9, hIdx).trim() : '';
  const historicoTexto =
    hIdx >= 0 && rIdx > hIdx
      ? blob.slice(hIdx + 10, rIdx).trim()
      : hIdx >= 0
      ? blob.slice(hIdx + 10).trim()
      : '';
  const redacao = rIdx >= 0 ? blob.slice(rIdx + 8).trim() : '';

  return { head, processoVinculado, historicoTexto, redacao };
}

export function isRecordAlreadyStructuredRow(
  header: string[],
  row: string[]
): boolean {
  const lower = header.map((h) => h.trim().toLowerCase());
  return (
    lower.includes('codigo') &&
    lower.includes('edificacao') &&
    lower.includes('municipio') &&
    lower.includes('redacao') &&
    row.length >= 10 &&
    row[1] !== '-' &&
    !row[1].startsWith('RG:')
  );
}

export function parseFiscalizacaoCsv(rawText: string): FiscalizacaoRecord[] {
  const allRows = parseSemicolonCsv(rawText);
  if (allRows.length <= 1) return [];

  const header = allRows[0].map((h) => h.trim().toLowerCase());
  const dataRows = allRows.slice(1);
  const nowISO = new Date().toISOString();

  // Caso seja um CSV já exportado pela própria aba (estruturado completo)
  const isExportedCleanCsv =
    header.includes('municipio') &&
    header.includes('rg_fiscal') &&
    header.includes('fiscal_responsavel');

  if (isExportedCleanCsv) {
    const idx = (name: string) => header.indexOf(name);
    const records: FiscalizacaoRecord[] = [];
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      const codigo = parseInt(r[idx('codigo')] || '0', 10) || i + 1;
      const histText = (r[idx('historico')] || '').trim();
      const atos = parseHistoricoAtos(histText);
      const exp = resolveExpeditionDate(r[idx('data_expedicao')] || '', atos);
      const lastAto = atos[atos.length - 1];

      records.push({
        id: `fisc-${String(codigo).padStart(4, '0')}`,
        codigo,
        edificacao: (r[idx('edificacao')] || 'EM BRANCO').slice(0, 300),
        documentoCpfCnpj: (r[idx('documento_identidade_cnpj')] || '').slice(0, 40),
        enderecoCompleto: (r[idx('endereco')] || '').slice(0, 400),
        municipio: normalizeMunicipio(r[idx('municipio')] || ''),
        processoVinculado: (r[idx('processo')] || '').slice(0, 120),
        status: normalizeFiscalizacaoStatus(r[idx('status')]),
        dataExpedicao: exp.dataExpedicao.slice(0, 40),
        dataValidade: (r[idx('data_validade')] || '').slice(0, 40),
        anoExpedicao: exp.anoExpedicao,
        rgFiscal: (r[idx('rg_fiscal')] || '').slice(0, 40),
        fiscalResponsavel: (r[idx('fiscal_responsavel')] || '').slice(0, 160),
        orgaoPrincipal: (lastAto?.orgao || atos[0]?.orgao || '').slice(0, 40),
        ultimoNumeroAto: (lastAto?.numeroAto || atos[0]?.numeroAto || '').slice(0, 40),
        historicoAtos: atos,
        historicoTexto: histText.slice(0, 2000),
        redacao: (r[idx('redacao')] || '').slice(0, 4000),
        observacoes: (r[idx('observacoes')] || '').slice(0, 2000),
        criadoEm: nowISO,
        atualizadoEm: nowISO,
      });
    }
    return records.sort((a, b) => a.codigo - b.codigo);
  }

  // Formato original DGST CBMERJ (linhas resumo + linhas detalhe "-" ou "RG: ... Número: ...")
  const recordsByCodigo = new Map<number, FiscalizacaoRecord>();
  let pendingSummary: {
    codigoOrProcesso: string;
    edificacao: string;
    status: string;
    dataExpedicao: string;
  } | null = null;

  for (let i = 0; i < dataRows.length; i++) {
    const r = dataRows[i];
    const c0 = (r[0] || '').trim();
    const c1 = (r[1] || '').trim();
    const c2 = (r[2] || '').trim();
    const c3 = (r[3] || '').trim();
    const c4 = (r[4] || '').trim();

    const isDetailShape2 = c1 === '-';
    const isDetailShape4 = !c0 && /^RG:\s*/i.test(c1) && c2 === '-';

    if (!isDetailShape2 && !isDetailShape4) {
      // Linha resumo que precede a linha detalhe
      pendingSummary = {
        codigoOrProcesso: c0,
        edificacao: c1,
        status: c2,
        dataExpedicao: c3,
      };
      continue;
    }

    let codigo = 0;
    let rgFiscal = '';
    let fiscalResponsavel = '';
    let blob = '';
    let rawStatus = '';
    let rawDate = '';

    if (isDetailShape2) {
      codigo = parseInt(c0, 10) || 0;
      blob = c2;
      rawStatus = c3;
      rawDate = c4;
    } else {
      const rgMatch = c1.match(/^RG:\s*(\d+)\s*(.*?)\s*N[úu]mero:\s*(\d+)/i);
      if (rgMatch) {
        rgFiscal = rgMatch[1].trim();
        fiscalResponsavel = rgMatch[2].trim();
        codigo = parseInt(rgMatch[3], 10) || 0;
      }
      blob = c3;
      rawStatus = c4;
      rawDate = (r[5] || '').trim();
    }

    if (!codigo) {
      codigo = recordsByCodigo.size + 1;
    }

    const parsed = parseBlob(blob);
    const atos = parseHistoricoAtos(parsed.historicoTexto);
    const lastAto = atos[atos.length - 1];

    const summaryEdif = pendingSummary?.edificacao;
    const summaryProc =
      pendingSummary && !/^\d+$/.test(pendingSummary.codigoOrProcesso)
        ? pendingSummary.codigoOrProcesso
        : '';
    const summaryDate = pendingSummary?.dataExpedicao || '';
    const summaryStatus = pendingSummary?.status || '';

    const headInfo = extractHeadFields(parsed.head, summaryEdif);
    const { dataExpedicao, anoExpedicao } = resolveExpeditionDate(
      rawDate || summaryDate,
      atos
    );

    const processoVinculado = (parsed.processoVinculado || summaryProc || '').slice(0, 120);
    const status = normalizeFiscalizacaoStatus(rawStatus || summaryStatus);

    const record: FiscalizacaoRecord = {
      id: `fisc-${String(codigo).padStart(4, '0')}`,
      codigo,
      edificacao: headInfo.edificacao,
      documentoCpfCnpj: headInfo.documentoCpfCnpj,
      enderecoCompleto: headInfo.enderecoCompleto,
      municipio: headInfo.municipio,
      processoVinculado,
      status,
      dataExpedicao: dataExpedicao.slice(0, 40),
      dataValidade: '',
      anoExpedicao,
      rgFiscal: rgFiscal.slice(0, 40),
      fiscalResponsavel: fiscalResponsavel.slice(0, 160),
      orgaoPrincipal: (lastAto?.orgao || atos[0]?.orgao || '').slice(0, 40),
      ultimoNumeroAto: (lastAto?.numeroAto || atos[0]?.numeroAto || '').slice(0, 40),
      historicoAtos: atos,
      historicoTexto: parsed.historicoTexto.slice(0, 2000),
      redacao: parsed.redacao.slice(0, 4000),
      observacoes: '',
      criadoEm: nowISO,
      atualizadoEm: nowISO,
    };

    recordsByCodigo.set(codigo, record);
    pendingSummary = null;
  }

  return Array.from(recordsByCodigo.values()).sort((a, b) => a.codigo - b.codigo);
}

export function exportFiscalizacoesToCSV(
  records: FiscalizacaoRecord[],
  filename: string
): void {
  const headers = [
    'codigo',
    'edificacao',
    'documento_identidade_cnpj',
    'endereco',
    'municipio',
    'processo',
    'status',
    'data_expedicao',
    'data_validade',
    'rg_fiscal',
    'fiscal_responsavel',
    'historico',
    'redacao',
    'observacoes',
  ];

  const escapeCell = (val: unknown) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [
    headers.join(';'),
    ...records.map((r) =>
      [
        r.codigo,
        r.edificacao,
        r.documentoCpfCnpj,
        r.enderecoCompleto,
        r.municipio,
        r.processoVinculado,
        r.status,
        r.dataExpedicao,
        r.dataValidade,
        r.rgFiscal,
        r.fiscalResponsavel,
        r.historicoTexto,
        r.redacao,
        r.observacoes,
      ]
        .map(escapeCell)
        .join(';')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
