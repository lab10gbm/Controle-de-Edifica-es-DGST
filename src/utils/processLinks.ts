import { BuildingNotification } from '../types';
import { extractProcessoNumero, formatProcessoNumeroAno, parseProcessoE27 } from './helpers';

export interface ParsedProcessLinkRef {
  raw: string;
  numero: number;
  numero5: string;
  ano: string;
  formatted: string;
  isMatchableNumeric: boolean;
}

export interface ProcessLinkInfo {
  prevLinks: BuildingNotification[];
  nextLinks: BuildingNotification[];
  externalPrevRef: { processo: string; doc?: string } | null;
  externalNextRef: string | null;
  chain: BuildingNotification[];
  hasAnyLink: boolean;
}

const KNOWN_TYPO_NEXT_MAP: Record<number, number> = {
  2142: 13330,  // MARCUS/MARCOS JOSÉ MARCATTI: "11330" -> "13330"
  37192: 46745, // VINICIUS DA SILVA RIGUINI: "46475" -> "46745"
};

// Processo 16519/2026 copiou erroneamente o processoAntigo 6473/26 da linha 16518/2026 (Curumin)
const KNOWN_INVALID_PREV_PAIRS = new Set<string>(['16519->6473']);

export function cleanProcessLinkValue(val?: string | null): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed) return '';
  const stripped = trimmed.replace(/[-\s_.]/g, '');
  if (!stripped) return '';
  if (trimmed.toUpperCase() === 'S/N') return '';
  return trimmed;
}

export function getRecordYearAndNumber(
  item: BuildingNotification,
  defaultYear = '2026'
): { numero: number; ano: string; formatted: string } {
  const parsed = parseProcessoE27(item.processo !== undefined ? item.processo : item.numero, {
    codigo: item.detalhesSST?.codigo,
    ano: item.anoExercicio,
  });

  const numero =
    item.numero > 0 ? item.numero : parsed?.numero || extractProcessoNumero(item.processo);

  const dataRefMatch = (item.dataEntrada || item.dataExpedicao || '').match(/\b(20\d{2}|19\d{2})\b/);
  const ano =
    parsed?.ano ||
    (item.anoExercicio && /^\d{4}$/.test(item.anoExercicio) ? item.anoExercicio : '') ||
    (dataRefMatch ? dataRefMatch[1] : '') ||
    defaultYear;

  const formatted =
    numero > 0
      ? `${String(numero).padStart(5, '0')}/${ano}`
      : formatProcessoNumeroAno(item.processo ?? item.numero, { ano });

  return { numero, ano, formatted };
}

export function parseProcessLinkRef(
  raw?: string | null,
  defaultYear = '2026'
): ParsedProcessLinkRef | null {
  const clean = cleanProcessLinkValue(raw);
  if (!clean) return null;

  // Padrão E27/PROC/COD/ANO
  const e27 = parseProcessoE27(clean);
  if (e27?.isE27 && e27.numero > 0) {
    const ano = e27.ano || defaultYear;
    const numero5 = String(e27.numero).padStart(5, '0');
    return {
      raw: clean,
      numero: e27.numero,
      numero5,
      ano,
      formatted: `${numero5}/${ano}`,
      isMatchableNumeric: true,
    };
  }

  // Referência com prefixo literal antigo (ex: "V-9402/14")
  if (/^[A-Za-z]-/.test(clean)) {
    const m = clean.match(/^([A-Za-z]-\d+)(?:\/(\d{2,4}))?$/i);
    if (m) {
      const anoRaw = m[2];
      const ano = anoRaw ? (anoRaw.length === 2 ? `20${anoRaw}` : anoRaw) : defaultYear;
      return {
        raw: clean,
        numero: 0,
        numero5: '',
        ano,
        formatted: `${m[1].toUpperCase()}/${ano}`,
        isMatchableNumeric: false,
      };
    }
    return {
      raw: clean,
      numero: 0,
      numero5: '',
      ano: defaultYear,
      formatted: clean,
      isMatchableNumeric: false,
    };
  }

  // Referência numérica simples ou com ano ("2394", "0075/26", "28627/20", "13905/2026")
  const numYearMatch = clean.match(/^(\d{1,7})(?:\s*\/\s*(\d{2,4}))?$/);
  if (numYearMatch) {
    const numero = parseInt(numYearMatch[1], 10) || 0;
    if (numero <= 0) return null;
    const anoRaw = numYearMatch[2];
    const ano = anoRaw ? (anoRaw.length === 2 ? `20${anoRaw}` : anoRaw) : defaultYear;
    const numero5 = String(numero).padStart(5, '0');
    return {
      raw: clean,
      numero,
      numero5,
      ano,
      formatted: `${numero5}/${ano}`,
      isMatchableNumeric: true,
    };
  }

  return {
    raw: clean,
    numero: 0,
    numero5: '',
    ano: defaultYear,
    formatted: clean,
    isMatchableNumeric: false,
  };
}

function normalizeTextTokens(text?: string): string[] {
  if (!text) return [];
  const stopWords = new Set(['LTDA', 'EIRELI', 'ME', 'EPP', 'SA', 'S', 'A', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'COM', 'COMERCIO', 'SERVICOS', 'SERVICO', 'ENGENHARIA', 'LOGISTICA', 'CONDOMINIO']);
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
}

export function isLikelyRelatedEntity(a: BuildingNotification, b: BuildingNotification): boolean {
  const numA = getRecordYearAndNumber(a).numero;
  const numB = getRecordYearAndNumber(b).numero;
  if (KNOWN_INVALID_PREV_PAIRS.has(`${numA}->${numB}`) || KNOWN_INVALID_PREV_PAIRS.has(`${numB}->${numA}`)) {
    return false;
  }

  const docA = (a.proprietario?.cpfOuCnpj || '').replace(/[^\d]/g, '');
  const docB = (b.proprietario?.cpfOuCnpj || '').replace(/[^\d]/g, '');
  if (docA.length >= 8 && docB.length >= 8) {
    return docA === docB;
  }

  const nameA = (a.requerente || a.edificacao || '').trim();
  const nameB = (b.requerente || b.edificacao || '').trim();
  // Registros genéricos como "Processo nº 24088" (antigo erro de preenchimento) são aceitos se não houver conflito explícito
  if (/^Processo n/i.test(nameA) || /^Processo n/i.test(nameB)) {
    return true;
  }

  const tokensA = normalizeTextTokens(nameA);
  const tokensB = new Set(normalizeTextTokens(nameB));
  if (tokensA.length === 0 || tokensB.size === 0) return true;

  return tokensA.some((t) => tokensB.has(t));
}

export function buildProcessLinkIndex(records: BuildingNotification[]): Map<string, ProcessLinkInfo> {
  const result = new Map<string, ProcessLinkInfo>();
  if (!records || records.length === 0) return result;

  const byYearNum = new Map<string, BuildingNotification>();
  const byNum2026Fallback = new Map<number, BuildingNotification>();
  const recordMeta = new Map<string, { numero: number; ano: string }>();

  for (const rec of records) {
    const meta = getRecordYearAndNumber(rec);
    recordMeta.set(rec.id, { numero: meta.numero, ano: meta.ano });
    if (meta.numero > 0) {
      byYearNum.set(`${meta.ano}::${meta.numero}`, rec);
      if (meta.ano === '2026' || !byNum2026Fallback.has(meta.numero)) {
        byNum2026Fallback.set(meta.numero, rec);
      }
    }
  }

  const resolveRef = (ref: ParsedProcessLinkRef | null): BuildingNotification | undefined => {
    if (!ref || !ref.isMatchableNumeric || ref.numero <= 0) return undefined;
    return (
      byYearNum.get(`${ref.ano}::${ref.numero}`) ||
      (ref.ano === '2026' ? byNum2026Fallback.get(ref.numero) : undefined)
    );
  };

  const prevMap = new Map<string, Map<string, BuildingNotification>>();
  const nextMap = new Map<string, Map<string, BuildingNotification>>();
  const extPrevMap = new Map<string, { processo: string; doc?: string } | null>();
  const extNextMap = new Map<string, string | null>();

  for (const rec of records) {
    prevMap.set(rec.id, new Map());
    nextMap.set(rec.id, new Map());
    extPrevMap.set(rec.id, null);
    extNextMap.set(rec.id, null);
  }

  const addDirectedEdge = (parent: BuildingNotification, child: BuildingNotification) => {
    if (!parent || !child || parent.id === child.id) return;
    const pNum = recordMeta.get(parent.id)?.numero || 0;
    const cNum = recordMeta.get(child.id)?.numero || 0;
    if (KNOWN_INVALID_PREV_PAIRS.has(`${cNum}->${pNum}`)) return;
    nextMap.get(parent.id)?.set(child.id, child);
    prevMap.get(child.id)?.set(parent.id, parent);
  };

  for (const rec of records) {
    const meta = recordMeta.get(rec.id)!;
    const sst = rec.detalhesSST || {};

    // 1. PROCESSO ANTIGO -> liga parent -> rec
    const antRef = parseProcessLinkRef(sst.processoAntigo, meta.ano);
    if (antRef) {
      const parentRec = resolveRef(antRef);
      if (parentRec && parentRec.id !== rec.id) {
        if (!KNOWN_INVALID_PREV_PAIRS.has(`${meta.numero}->${recordMeta.get(parentRec.id)?.numero}`)) {
          addDirectedEdge(parentRec, rec);
        }
      } else if (!parentRec) {
        const docAnt = cleanProcessLinkValue(sst.numDocAntigo);
        extPrevMap.set(rec.id, {
          processo: antRef.formatted,
          doc: docAnt || undefined,
        });
      }
    }

    // 2. PROCESSO SEGUINTE -> liga rec -> child
    let segRef = parseProcessLinkRef(sst.processoSeguinte, meta.ano);
    if (segRef && segRef.isMatchableNumeric) {
      // Ignora auto-referência (ex: 11353 -> 11353)
      if (segRef.numero === meta.numero && segRef.ano === meta.ano) {
        segRef = null;
      } else if (KNOWN_TYPO_NEXT_MAP[meta.numero]) {
        const corrected = KNOWN_TYPO_NEXT_MAP[meta.numero];
        const correctedTarget = byYearNum.get(`${meta.ano}::${corrected}`) || byNum2026Fallback.get(corrected);
        if (correctedTarget && !resolveRef(segRef)) {
          segRef = parseProcessLinkRef(String(corrected), meta.ano);
        }
      }
    }

    if (segRef) {
      const childRec = resolveRef(segRef);
      if (childRec && childRec.id !== rec.id) {
        addDirectedEdge(rec, childRec);
      } else if (!childRec) {
        extNextMap.set(rec.id, segRef.formatted);
      }
    }
  }

  const compareChrono = (a: BuildingNotification, b: BuildingNotification) => {
    const ma = recordMeta.get(a.id) || { ano: '2026', numero: 0 };
    const mb = recordMeta.get(b.id) || { ano: '2026', numero: 0 };
    if (ma.ano !== mb.ano) return ma.ano.localeCompare(mb.ano);
    return ma.numero - mb.numero;
  };

  for (const rec of records) {
    const prevLinks = Array.from(prevMap.get(rec.id)?.values() || []).sort(compareChrono);
    const nextLinks = Array.from(nextMap.get(rec.id)?.values() || []).sort(compareChrono);

    // Reconstrói cadeia completa conectada (ancestrais + atual + descendentes)
    const visited = new Set<string>([rec.id]);
    const queue: BuildingNotification[] = [rec];
    const component: BuildingNotification[] = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      component.push(curr);
      const neighbors = [
        ...Array.from(prevMap.get(curr.id)?.values() || []),
        ...Array.from(nextMap.get(curr.id)?.values() || []),
      ];
      for (const nb of neighbors) {
        if (!visited.has(nb.id)) {
          visited.add(nb.id);
          queue.push(nb);
        }
      }
    }

    component.sort(compareChrono);
    const externalPrevRef = extPrevMap.get(rec.id) || null;
    const externalNextRef = extNextMap.get(rec.id) || null;

    result.set(rec.id, {
      prevLinks,
      nextLinks,
      externalPrevRef,
      externalNextRef,
      chain: component,
      hasAnyLink:
        prevLinks.length > 0 ||
        nextLinks.length > 0 ||
        Boolean(externalPrevRef) ||
        Boolean(externalNextRef),
    });
  }

  return result;
}

/**
 * Calcula atualizações idempotentes para corrigir erros de digitação conhecidos na planilha
 * e preencher bidirecionalmente PROCESSO SEGUINTE / PROCESSO ANTIGO nos registros existentes.
 */
export function computeLinkBackfillUpdates(records: BuildingNotification[]): BuildingNotification[] {
  if (!records || records.length === 0) return [];

  const byYearNum = new Map<string, BuildingNotification>();
  const byNumFallback = new Map<number, BuildingNotification>();

  for (const rec of records) {
    const meta = getRecordYearAndNumber(rec);
    if (meta.numero > 0) {
      byYearNum.set(`${meta.ano}::${meta.numero}`, rec);
      if (meta.ano === '2026' || !byNumFallback.has(meta.numero)) {
        byNumFallback.set(meta.numero, rec);
      }
    }
  }

  const draftPatches = new Map<
    string,
    { processoAntigo?: string; numDocAntigo?: string; processoSeguinte?: string; notes: string[] }
  >();

  const ensureDraft = (id: string) => {
    let d = draftPatches.get(id);
    if (!d) {
      d = { notes: [] };
      draftPatches.set(id, d);
    }
    return d;
  };

  // 1. Correções explícitas de erros de digitação conhecidos na planilha base
  for (const rec of records) {
    const meta = getRecordYearAndNumber(rec);
    const sst = rec.detalhesSST || {};
    const segRaw = cleanProcessLinkValue(sst.processoSeguinte);
    const antRaw = cleanProcessLinkValue(sst.processoAntigo);

    // Self-loop 11353 -> 11353
    if (meta.numero === 11353 && segRaw === '11353') {
      const d = ensureDraft(rec.id);
      d.processoSeguinte = '';
      d.notes.push('Removida autorreferência em PROCESSO SEGUINTE (11353 -> 11353).');
    }

    // Typo 02142: 11330 -> 13330
    if (meta.numero === 2142 && segRaw === '11330') {
      const d = ensureDraft(rec.id);
      d.processoSeguinte = '13330';
      d.notes.push('Corrigido PROCESSO SEGUINTE de 11330 para 13330 (MARCOS JOSÉ MARCATTI).');
    }

    // Typo 37192: 46475 -> 46745
    if (meta.numero === 37192 && segRaw === '46475') {
      const d = ensureDraft(rec.id);
      d.processoSeguinte = '46745';
      d.notes.push('Corrigido PROCESSO SEGUINTE de 46475 para 46745 (VINICIUS DA SILVA RIGUINI).');
    }

    // Copy-paste errado em 16519 (RETA DE ITAGUAÍ copiou 6473/26 de 16518 CURUMIN)
    if (meta.numero === 16519 && /^0?6473\/(26|2026)$/.test(antRaw)) {
      const d = ensureDraft(rec.id);
      d.processoAntigo = '';
      d.numDocAntigo = '';
      d.notes.push('Removido vínculo copiado incorretamente da linha 16518 (06473/26 pertence ao CURUMIN).');
    }
  }

  // 2. Inferência bidirecional:
  // (a) Quando filho tem PROCESSO ANTIGO no mesmo ano, garante PROCESSO SEGUINTE no pai
  for (const child of records) {
    const childMeta = getRecordYearAndNumber(child);
    const draftChild = draftPatches.get(child.id);
    const effectiveAnt =
      draftChild?.processoAntigo !== undefined
        ? draftChild.processoAntigo
        : cleanProcessLinkValue(child.detalhesSST?.processoAntigo);

    const antRef = parseProcessLinkRef(effectiveAnt, childMeta.ano);
    if (!antRef || !antRef.isMatchableNumeric || antRef.numero <= 0 || antRef.numero === childMeta.numero) {
      continue;
    }
    if (KNOWN_INVALID_PREV_PAIRS.has(`${childMeta.numero}->${antRef.numero}`)) {
      continue;
    }

    const parent =
      byYearNum.get(`${antRef.ano}::${antRef.numero}`) ||
      (antRef.ano === '2026' ? byNumFallback.get(antRef.numero) : undefined);

    if (!parent || parent.id === child.id) continue;
    if (!isLikelyRelatedEntity(parent, child)) continue;

    const parentDraft = draftPatches.get(parent.id);
    const currentParentSeg =
      parentDraft?.processoSeguinte !== undefined
        ? parentDraft.processoSeguinte
        : cleanProcessLinkValue(parent.detalhesSST?.processoSeguinte);

    if (!currentParentSeg) {
      const pd = ensureDraft(parent.id);
      pd.processoSeguinte = String(childMeta.numero);
      pd.notes.push(`PROCESSO SEGUINTE preenchido automaticamente para ${String(childMeta.numero).padStart(5, '0')}/${childMeta.ano} via vínculo reverso.`);
    }
  }

  // (b) Quando pai tem PROCESSO SEGUINTE no mesmo ano, garante PROCESSO ANTIGO e Nº DOC. ANTIGO no filho
  for (const parent of records) {
    const parentMeta = getRecordYearAndNumber(parent);
    const parentDraft = draftPatches.get(parent.id);
    const effectiveSeg =
      parentDraft?.processoSeguinte !== undefined
        ? parentDraft.processoSeguinte
        : cleanProcessLinkValue(parent.detalhesSST?.processoSeguinte);

    const segRef = parseProcessLinkRef(effectiveSeg, parentMeta.ano);
    if (!segRef || !segRef.isMatchableNumeric || segRef.numero <= 0 || segRef.numero === parentMeta.numero) {
      continue;
    }

    const child =
      byYearNum.get(`${segRef.ano}::${segRef.numero}`) ||
      (segRef.ano === '2026' ? byNumFallback.get(segRef.numero) : undefined);

    if (!child || child.id === parent.id) continue;

    const childDraft = draftPatches.get(child.id);
    const currentChildAnt =
      childDraft?.processoAntigo !== undefined
        ? childDraft.processoAntigo
        : cleanProcessLinkValue(child.detalhesSST?.processoAntigo);

    const currentChildDocAnt =
      childDraft?.numDocAntigo !== undefined
        ? childDraft.numDocAntigo
        : cleanProcessLinkValue(child.detalhesSST?.numDocAntigo);

    const parentDocGerado = cleanProcessLinkValue(parent.detalhesSST?.docGerado);
    const shortParentRef = `${parentMeta.numero}/${parentMeta.ano.slice(-2)}`;

    if (!currentChildAnt) {
      const cd = ensureDraft(child.id);
      cd.processoAntigo = shortParentRef;
      if (!currentChildDocAnt && parentDocGerado) {
        cd.numDocAntigo = parentDocGerado;
      }
      cd.notes.push(`PROCESSO ANTIGO vinculado automaticamente ao processo pai ${String(parentMeta.numero).padStart(5, '0')}/${parentMeta.ano}.`);
    } else if (!currentChildDocAnt && parentDocGerado) {
      const parsedAnt = parseProcessLinkRef(currentChildAnt, child.anoExercicio || '2026');
      if (parsedAnt?.numero === parentMeta.numero) {
        const cd = ensureDraft(child.id);
        cd.numDocAntigo = parentDocGerado;
        cd.notes.push(`Nº DO DOC. ANTIGO preenchido com ${parentDocGerado}.`);
      }
    }
  }

  const nowISO = new Date().toISOString();
  const todayBR = new Date().toLocaleDateString('pt-BR');
  const timeBR = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const updates: BuildingNotification[] = [];

  for (const rec of records) {
    const patch = draftPatches.get(rec.id);
    if (!patch) continue;

    const currentSST = rec.detalhesSST || {};
    const nextSST = { ...currentSST };
    let changed = false;

    if (patch.processoSeguinte !== undefined && (currentSST.processoSeguinte || '') !== patch.processoSeguinte) {
      nextSST.processoSeguinte = patch.processoSeguinte;
      changed = true;
    }
    if (patch.processoAntigo !== undefined && (currentSST.processoAntigo || '') !== patch.processoAntigo) {
      nextSST.processoAntigo = patch.processoAntigo;
      changed = true;
    }
    if (patch.numDocAntigo !== undefined && (currentSST.numDocAntigo || '') !== patch.numDocAntigo) {
      nextSST.numDocAntigo = patch.numDocAntigo;
      changed = true;
    }

    if (!changed) continue;

    updates.push({
      ...rec,
      detalhesSST: nextSST,
      historico: [
        {
          id: `log-link-${Date.now()}-${rec.numero}`,
          data: `${todayBR} ${timeBR}`,
          autor: 'Vínculo de Processos',
          acao: 'Conexão entre Processos Atualizada',
          detalhes: patch.notes.join(' '),
        },
        ...(rec.historico || []),
      ].slice(0, 150),
      atualizadoEm: nowISO,
    });
  }

  return updates;
}
