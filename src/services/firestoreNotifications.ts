import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AuditLog,
  BilheteItem,
  BuildingNotification,
  DocumentType,
  SSTProcessDetails,
} from '../types';

export interface FiscalYearBucket {
  year: string;
  ownerUid: string;
  label: string;
}

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'Notificação',
  'Auto de Infração',
  'Notificação Preventiva',
  'Interdição',
  'TAC',
];

export function sanitizeDocId(rawId: string | undefined | null): string {
  const cleaned = String(rawId || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (cleaned.length > 0) return cleaned;
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampStr(val: unknown, maxLen: number): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function clampStrOrNumber(val: unknown, maxLen: number): string | number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return clampStr(val, maxLen);
}

export function extractYearFromDateString(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  const isoMatch = s.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[1];

  const brFullMatch = s.match(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-](\d{4})$/);
  if (brFullMatch) return brFullMatch[1];

  const brShortMatch = s.match(/^\d{1,2}[\/\.-]\d{1,2}[\/\.-](\d{2})$/);
  if (brShortMatch) return `20${brShortMatch[1]}`;

  return null;
}

export function inferAnoExercicio(
  record: Partial<BuildingNotification>,
  fallbackYear?: string
): string {
  if (record.anoExercicio && /^\d{4}$/.test(record.anoExercicio)) {
    return record.anoExercicio;
  }

  const fromDetails = extractYearFromDateString(record.detalhesSST?.entradaSST);
  if (fromDetails) return fromDetails;

  const fromEntrada = extractYearFromDateString(record.dataEntrada);
  if (fromEntrada) return fromEntrada;

  const fromExpedicao = extractYearFromDateString(record.dataExpedicao);
  if (fromExpedicao) return fromExpedicao;

  const fromCreated = extractYearFromDateString(record.criadoEm);
  if (fromCreated) return fromCreated;

  if (fallbackYear && /^\d{4}$/.test(fallbackYear)) {
    return fallbackYear;
  }

  return String(new Date().getFullYear());
}

function sanitizeBilhetesList(list?: BilheteItem[]): BilheteItem[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 50).map((b, idx) => {
    const item: BilheteItem = {
      id: clampStr(b?.id || `b-${idx + 1}`, 120),
      ordem: typeof b?.ordem === 'number' && Number.isFinite(b.ordem) ? b.ordem : idx + 1,
      tipo:
        b?.tipo === 'primeiro' || b?.tipo === 'intermediario' || b?.tipo === 'ultimo'
          ? b.tipo
          : 'intermediario',
      rotulo: clampStr(b?.rotulo || 'Bilhete', 100),
      data: clampStr(b?.data || '', 40),
      dias: clampStrOrNumber(b?.dias ?? '', 20),
      statusOuParecer: clampStr(b?.statusOuParecer || '', 120),
      despacho: clampStr(b?.despacho || '', 500),
      autor: clampStr(b?.autor || '', 120),
    };
    if (b?.tipoDetalhe === 'BILHETE' || b?.tipoDetalhe === 'RETORNO') {
      item.tipoDetalhe = b.tipoDetalhe;
    }
    if (b?.dataBilheteOrigem) {
      const origem = clampStr(b.dataBilheteOrigem, 40);
      if (origem) item.dataBilheteOrigem = origem;
    }
    if (typeof b?.autoContagemDias === 'boolean') {
      item.autoContagemDias = b.autoContagemDias;
    }
    return item;
  });
}

function sanitizeDetalhesSST(raw?: SSTProcessDetails): Record<string, unknown> {
  const det = raw || {};
  const result: Record<string, unknown> = {};

  const strLimits: Array<[keyof SSTProcessDetails, number]> = [
    ['codigo', 60],
    ['dataBase', 40],
    ['entradaSST', 40],
    ['entradaOBM', 40],
    ['processoAntigo', 80],
    ['numDocAntigo', 80],
    ['envioDirDivisao', 40],
    ['situacao', 120],
    ['bilhetes', 60],
    ['aoDiretor', 120],
    ['dataAoDiretor', 60],
    ['grafico', 60],
    ['docGerado', 80],
    ['situacaoDocGerado', 80],
    ['previsaoPronto', 40],
    ['dataPronto', 40],
    ['processoSeguinte', 80],
    ['dataEntregue', 40],
    ['localizacao', 120],
    ['dataBilhete', 40],
    ['outrosBilhetes', 200],
    ['ultimoBilhete', 40],
  ];

  const strOrNumKeys: Array<keyof SSTProcessDetails> = [
    'diasEntrada',
    'diasEnvioDivisao',
    'diasBilhetes',
    'diasAoDiretor',
    'diasPrevisao',
    'diasEntrega',
    'diasEmAtraso',
    'diasNaSST',
    'noGeral',
    'diasBilhete',
    'diasUltimoBilhete',
  ];

  for (const [key, limit] of strLimits) {
    if (det[key] !== undefined && det[key] !== null) {
      const clamped = clampStr(det[key], limit);
      if (clamped.length > 0) {
        result[key] = clamped;
      }
    }
  }

  for (const key of strOrNumKeys) {
    if (det[key] !== undefined && det[key] !== null) {
      const val = clampStrOrNumber(det[key], 20);
      if (typeof val === 'number' || val.length > 0) {
        result[key] = val;
      }
    }
  }

  if (Array.isArray(det.listaBilhetes) && det.listaBilhetes.length > 0) {
    result.listaBilhetes = sanitizeBilhetesList(det.listaBilhetes);
  }

  return result;
}

function sanitizeEndereco(raw?: BuildingNotification['endereco']): Record<string, string> {
  const end = raw || { logradouro: '', numero: '', bairro: '', municipio: '' };
  const result: Record<string, string> = {
    logradouro: clampStr(end.logradouro, 240),
    numero: clampStr(end.numero, 40),
    bairro: clampStr(end.bairro, 120),
    municipio: clampStr(end.municipio, 120),
  };
  if (end.complemento) result.complemento = clampStr(end.complemento, 120);
  if (end.cep) result.cep = clampStr(end.cep, 20);
  if (end.pontoReferencia) result.pontoReferencia = clampStr(end.pontoReferencia, 200);
  return result;
}

function sanitizeProprietario(
  raw?: BuildingNotification['proprietario']
): Record<string, string> {
  const prop = raw || {
    nomeOuRazaoSocial: '',
    cpfOuCnpj: '',
    telefone: '',
    email: '',
  };
  const result: Record<string, string> = {
    nomeOuRazaoSocial: clampStr(prop.nomeOuRazaoSocial, 300),
    cpfOuCnpj: clampStr(prop.cpfOuCnpj, 32),
    telefone: clampStr(prop.telefone, 40),
    email: clampStr(prop.email, 200),
  };
  if (prop.tipoVinculo) result.tipoVinculo = clampStr(prop.tipoVinculo, 60);
  if (prop.sindicoNome) result.sindicoNome = clampStr(prop.sindicoNome, 300);
  if (prop.sindicoCpf) result.sindicoCpf = clampStr(prop.sindicoCpf, 32);
  if (prop.sindicoTelefone) result.sindicoTelefone = clampStr(prop.sindicoTelefone, 40);
  return result;
}

function sanitizeExigencias(raw?: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, 100)
    .map((item) => clampStr(item, 500))
    .filter((item) => item.length > 0);
}

function sanitizeHistorico(raw?: AuditLog[]): AuditLog[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 150).map((h, idx) => ({
    id: clampStr(h?.id || `log-${idx + 1}`, 120),
    data: clampStr(h?.data || '', 40),
    autor: clampStr(h?.autor || 'Operador', 120),
    acao: clampStr(h?.acao || 'Registro', 120),
    detalhes: clampStr(h?.detalhes || '', 1000),
  }));
}

function buildUpdatableNotificationFields(
  record: BuildingNotification,
  nowISO: string
): Record<string, unknown> {
  const docType: DocumentType = VALID_DOCUMENT_TYPES.includes(record.tipoDocumento)
    ? record.tipoDocumento
    : 'Notificação';

  const numeroLimpo = Number.isFinite(Number(record.numero))
    ? Math.max(0, Number(record.numero))
    : 0;

  return {
    numero: numeroLimpo,
    processo: clampStr(record.processo || '', 64),
    codigoDocumento: clampStr(record.codigoDocumento || 'S/N', 120),
    edificacao: clampStr(record.edificacao || record.requerente || '', 300),
    requerente: clampStr(record.requerente || record.edificacao || '', 300),
    requerenteCpfCnpj: clampStr(record.requerenteCpfCnpj || '', 32),
    tipoProcesso: clampStr(record.tipoProcesso || '', 120),
    origem: clampStr(record.origem || '', 160),
    status: clampStr(record.status || 'EM ANÁLISE', 120),
    tipoDocumento: docType,
    obm: clampStr(record.obm || '', 160),
    dataExpedicao: clampStr(record.dataExpedicao || '', 40),
    dataEntrada: clampStr(record.dataEntrada || record.dataExpedicao || '', 40),
    dataValidade: record.dataValidade ? clampStr(record.dataValidade, 40) : null,
    dataTramite: record.dataTramite ? clampStr(record.dataTramite, 40) : null,
    oculto: Boolean(record.oculto),
    detalhesSST: sanitizeDetalhesSST(record.detalhesSST),
    endereco: sanitizeEndereco(record.endereco),
    proprietario: sanitizeProprietario(record.proprietario),
    fiscalResponsavel: clampStr(record.fiscalResponsavel || '', 160),
    matriculaFiscal: clampStr(record.matriculaFiscal || '', 60),
    processoAdministrativo: clampStr(record.processoAdministrativo || '', 120),
    exigencias: sanitizeExigencias(record.exigencias),
    observacoes: clampStr(record.observacoes || '', 4000),
    historico: sanitizeHistorico(record.historico),
    atualizadoEm: clampStr(record.atualizadoEm || nowISO, 64),
  };
}

function fromFirestoreDoc(data: Record<string, any>, docId: string, yearId: string): BuildingNotification {
  return {
    id: docId,
    ownerUid: data.ownerUid,
    anoExercicio: yearId,
    numero: typeof data.numero === 'number' ? data.numero : 0,
    processo: data.processo || undefined,
    codigoDocumento: data.codigoDocumento || 'S/N',
    edificacao: data.edificacao || '',
    requerente: data.requerente || data.edificacao || '',
    requerenteCpfCnpj: data.requerenteCpfCnpj || '',
    tipoProcesso: data.tipoProcesso || '',
    origem: data.origem || '',
    status: data.status || 'EM ANÁLISE',
    tipoDocumento: (VALID_DOCUMENT_TYPES.includes(data.tipoDocumento)
      ? data.tipoDocumento
      : 'Notificação') as DocumentType,
    obm: data.obm || '',
    dataExpedicao: data.dataExpedicao || '',
    dataEntrada: data.dataEntrada || data.dataExpedicao || '',
    dataValidade: data.dataValidade ?? null,
    dataTramite: data.dataTramite ?? null,
    oculto: Boolean(data.oculto),
    detalhesSST: data.detalhesSST || {},
    endereco: data.endereco || { logradouro: '', numero: '', bairro: '', municipio: '' },
    proprietario: data.proprietario || {
      nomeOuRazaoSocial: '',
      cpfOuCnpj: '',
      telefone: '',
      email: '',
    },
    fiscalResponsavel: data.fiscalResponsavel || '',
    matriculaFiscal: data.matriculaFiscal || '',
    processoAdministrativo: data.processoAdministrativo || undefined,
    exigencias: Array.isArray(data.exigencias) ? data.exigencias : [],
    observacoes: data.observacoes || '',
    historico: Array.isArray(data.historico) ? data.historico : [],
    criadoEm: data.criadoEm || new Date().toISOString(),
    atualizadoEm: data.atualizadoEm || new Date().toISOString(),
  };
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  try {
    const snap = await getDocFromServer(userRef);
    const displayName = clampStr(user.displayName || user.email || 'Operador SST', 160);
    const email = clampStr(user.email || '', 200);
    const photoURL = user.photoURL ? clampStr(user.photoURL, 500) : undefined;

    if (!snap.exists()) {
      const role =
        email.toLowerCase() === 'sst10gbm@gmail.com' && user.emailVerified ? 'admin' : 'operator';
      const payload: Record<string, unknown> = {
        uid: user.uid,
        email,
        displayName,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (photoURL) payload.photoURL = photoURL;
      await setDoc(userRef, payload);
    } else {
      const existing = snap.data() as Record<string, any>;
      if (
        existing.email !== email ||
        existing.displayName !== displayName ||
        (photoURL && existing.photoURL !== photoURL)
      ) {
        const updatePayload: Record<string, unknown> = {
          email,
          displayName,
          updatedAt: serverTimestamp(),
        };
        if (photoURL) updatePayload.photoURL = photoURL;
        await updateDoc(userRef, updatePayload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureYearBucket(uid: string, yearId: string): Promise<void> {
  if (!/^\d{4}$/.test(yearId)) {
    throw new Error(`Ano de exercício inválido: ${yearId}`);
  }
  const yearRef = doc(db, 'users', uid, 'years', yearId);
  const path = `users/${uid}/years/${yearId}`;
  try {
    const snap = await getDocFromServer(yearRef);
    if (!snap.exists()) {
      if (auth.currentUser && auth.currentUser.uid === uid) {
        await ensureUserProfile(auth.currentUser);
      }
      await setDoc(yearRef, {
        year: yearId,
        ownerUid: uid,
        label: `Exercício ${yearId}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToYearBuckets(
  uid: string,
  onData: (years: string[]) => void
): Unsubscribe {
  const path = `users/${uid}/years`;
  const q = query(collection(db, 'users', uid, 'years'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const years = snapshot.docs
        .map((d) => String(d.data()?.year || d.id))
        .filter((y) => /^\d{4}$/.test(y))
        .sort();
      onData(years);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToNotificationsForYear(
  uid: string,
  yearId: string,
  onData: (records: BuildingNotification[]) => void
): Unsubscribe {
  const path = `users/${uid}/years/${yearId}/notifications`;
  const q = query(
    collection(db, 'users', uid, 'years', yearId, 'notifications'),
    where('ownerUid', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => fromFirestoreDoc(d.data(), d.id, yearId));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

const ALLOWED_NOTIFICATION_KEYS = new Set([
  'id',
  'ownerUid',
  'anoExercicio',
  'numero',
  'processo',
  'codigoDocumento',
  'edificacao',
  'requerente',
  'requerenteCpfCnpj',
  'tipoProcesso',
  'origem',
  'status',
  'tipoDocumento',
  'obm',
  'dataExpedicao',
  'dataEntrada',
  'dataValidade',
  'dataTramite',
  'oculto',
  'detalhesSST',
  'endereco',
  'proprietario',
  'fiscalResponsavel',
  'matriculaFiscal',
  'processoAdministrativo',
  'exigencias',
  'observacoes',
  'historico',
  'criadoEm',
  'atualizadoEm',
  'createdAt',
  'updatedAt',
]);

const REQUIRED_NOTIFICATION_KEYS = [
  'id',
  'ownerUid',
  'anoExercicio',
  'numero',
  'processo',
  'codigoDocumento',
  'edificacao',
  'requerente',
  'tipoProcesso',
  'origem',
  'status',
  'tipoDocumento',
  'obm',
  'dataExpedicao',
  'dataEntrada',
  'dataValidade',
  'dataTramite',
  'oculto',
  'detalhesSST',
  'endereco',
  'proprietario',
  'fiscalResponsavel',
  'matriculaFiscal',
  'processoAdministrativo',
  'exigencias',
  'observacoes',
  'historico',
  'criadoEm',
  'atualizadoEm',
  'createdAt',
  'updatedAt',
];

function isFirestoreTimestampLike(val: unknown): boolean {
  return Boolean(
    val &&
      typeof val === 'object' &&
      typeof (val as { toMillis?: unknown }).toMillis === 'function'
  );
}

function hasLegacyNotificationSchemaMismatch(
  existingData: Record<string, any>,
  uid: string,
  yearId: string,
  docId: string
): boolean {
  if (existingData.id !== docId) return true;
  if (existingData.ownerUid !== uid) return true;
  if (existingData.anoExercicio !== yearId) return true;
  if (typeof existingData.criadoEm !== 'string' || !existingData.criadoEm || existingData.criadoEm.length > 64) return true;
  if (!isFirestoreTimestampLike(existingData.createdAt)) return true;

  for (const reqKey of REQUIRED_NOTIFICATION_KEYS) {
    if (!(reqKey in existingData)) return true;
  }
  for (const key of Object.keys(existingData)) {
    if (!ALLOWED_NOTIFICATION_KEYS.has(key)) return true;
  }
  return false;
}

const ALLOWED_DETALHES_SST_KEYS = new Set([
  'codigo', 'dataBase', 'entradaSST', 'entradaOBM', 'diasEntrada',
  'processoAntigo', 'numDocAntigo', 'envioDirDivisao', 'diasEnvioDivisao',
  'situacao', 'bilhetes', 'diasBilhetes', 'aoDiretor', 'dataAoDiretor',
  'diasAoDiretor', 'grafico', 'docGerado', 'situacaoDocGerado',
  'previsaoPronto', 'diasPrevisao', 'dataPronto', 'processoSeguinte',
  'dataEntregue', 'diasEntrega', 'diasEmAtraso', 'diasNaSST', 'noGeral',
  'localizacao', 'dataBilhete', 'diasBilhete', 'outrosBilhetes',
  'ultimoBilhete', 'diasUltimoBilhete', 'listaBilhetes',
]);

const ALLOWED_ENDERECO_KEYS = new Set([
  'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'cep', 'pontoReferencia',
]);

const ALLOWED_PROPRIETARIO_KEYS = new Set([
  'nomeOuRazaoSocial', 'cpfOuCnpj', 'telefone', 'email',
  'tipoVinculo', 'sindicoNome', 'sindicoCpf', 'sindicoTelefone',
]);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return Boolean(val && typeof val === 'object' && !Array.isArray(val));
}

function findNotificationRuleViolations(
  data: Record<string, unknown>,
  uid: string,
  yearId: string,
  docId: string
): string[] {
  const violations: string[] = [];
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) violations.push('invalid_uid');
  if (!/^[0-9]{4}$/.test(yearId)) violations.push('invalid_yearId');
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(docId)) violations.push('invalid_docId');

  for (const reqKey of REQUIRED_NOTIFICATION_KEYS) {
    if (reqKey === 'createdAt' || reqKey === 'updatedAt') continue;
    if (!(reqKey in data)) violations.push(`missing:${reqKey}`);
  }
  for (const key of Object.keys(data)) {
    if (!ALLOWED_NOTIFICATION_KEYS.has(key)) violations.push(`extra:${key}`);
  }

  if (data.id !== docId) violations.push('mismatch:id');
  if (data.ownerUid !== uid) violations.push('mismatch:ownerUid');
  if (data.anoExercicio !== yearId) violations.push('mismatch:anoExercicio');
  if (typeof data.numero !== 'number' || !Number.isFinite(data.numero) || data.numero < 0) {
    violations.push('invalid:numero');
  }

  const checkStr = (field: string, max: number) => {
    const val = data[field];
    if (typeof val !== 'string' || val.length > max) violations.push(`invalid:${field}`);
  };
  checkStr('processo', 64);
  checkStr('codigoDocumento', 120);
  checkStr('edificacao', 300);
  checkStr('requerente', 300);
  if ('requerenteCpfCnpj' in data && (typeof data.requerenteCpfCnpj !== 'string' || data.requerenteCpfCnpj.length > 32)) {
    violations.push('invalid:requerenteCpfCnpj');
  }
  checkStr('tipoProcesso', 120);
  checkStr('origem', 160);
  checkStr('status', 120);
  if (typeof data.tipoDocumento !== 'string' || !VALID_DOCUMENT_TYPES.includes(data.tipoDocumento as DocumentType)) {
    violations.push('invalid:tipoDocumento');
  }
  checkStr('obm', 160);
  checkStr('dataExpedicao', 40);
  checkStr('dataEntrada', 40);
  if (data.dataValidade !== null && (typeof data.dataValidade !== 'string' || data.dataValidade.length > 40)) {
    violations.push('invalid:dataValidade');
  }
  if (data.dataTramite !== null && (typeof data.dataTramite !== 'string' || data.dataTramite.length > 40)) {
    violations.push('invalid:dataTramite');
  }
  if (typeof data.oculto !== 'boolean') violations.push('invalid:oculto');
  checkStr('fiscalResponsavel', 160);
  checkStr('matriculaFiscal', 60);
  checkStr('processoAdministrativo', 120);
  checkStr('observacoes', 4000);
  checkStr('criadoEm', 64);
  checkStr('atualizadoEm', 64);

  if (!isPlainObject(data.detalhesSST)) {
    violations.push('invalid:detalhesSST');
  } else {
    const det = data.detalhesSST;
    const detKeys = Object.keys(det);
    if (detKeys.length > 34) violations.push('invalid:detalhesSST_size');
    for (const k of detKeys) {
      if (!ALLOWED_DETALHES_SST_KEYS.has(k)) violations.push(`invalid:detalhesSST_key:${k}`);
    }
    if ('situacao' in det && (typeof det.situacao !== 'string' || det.situacao.length > 120)) {
      violations.push('invalid:detalhesSST.situacao');
    }
    if ('dataPronto' in det && (typeof det.dataPronto !== 'string' || det.dataPronto.length > 40)) {
      violations.push('invalid:detalhesSST.dataPronto');
    }
    if ('listaBilhetes' in det) {
      if (!Array.isArray(det.listaBilhetes) || det.listaBilhetes.length > 50) {
        violations.push('invalid:detalhesSST.listaBilhetes');
      } else if (det.listaBilhetes.length > 0 && !isPlainObject(det.listaBilhetes[0])) {
        violations.push('invalid:detalhesSST.listaBilhetes[0]');
      }
    }
  }

  if (!isPlainObject(data.endereco)) {
    violations.push('invalid:endereco');
  } else {
    const end = data.endereco;
    for (const req of ['logradouro', 'numero', 'bairro', 'municipio']) {
      if (!(req in end)) violations.push(`missing:endereco.${req}`);
    }
    for (const k of Object.keys(end)) {
      if (!ALLOWED_ENDERECO_KEYS.has(k)) violations.push(`extra:endereco.${k}`);
    }
    const endLimits: Record<string, number> = {
      logradouro: 240,
      numero: 40,
      complemento: 120,
      bairro: 120,
      municipio: 120,
      cep: 20,
      pontoReferencia: 200,
    };
    for (const [k, max] of Object.entries(endLimits)) {
      if (k in end && (typeof end[k] !== 'string' || (end[k] as string).length > max)) {
        violations.push(`invalid:endereco.${k}`);
      }
    }
  }

  if (!isPlainObject(data.proprietario)) {
    violations.push('invalid:proprietario');
  } else {
    const prop = data.proprietario;
    for (const req of ['nomeOuRazaoSocial', 'cpfOuCnpj', 'telefone', 'email']) {
      if (!(req in prop)) violations.push(`missing:proprietario.${req}`);
    }
    for (const k of Object.keys(prop)) {
      if (!ALLOWED_PROPRIETARIO_KEYS.has(k)) violations.push(`extra:proprietario.${k}`);
    }
    const propLimits: Record<string, number> = {
      nomeOuRazaoSocial: 300,
      cpfOuCnpj: 32,
      telefone: 40,
      email: 200,
      tipoVinculo: 60,
      sindicoNome: 300,
      sindicoCpf: 32,
      sindicoTelefone: 40,
    };
    for (const [k, max] of Object.entries(propLimits)) {
      if (k in prop && (typeof prop[k] !== 'string' || (prop[k] as string).length > max)) {
        violations.push(`invalid:proprietario.${k}`);
      }
    }
  }

  if (!Array.isArray(data.exigencias) || data.exigencias.length > 100) {
    violations.push('invalid:exigencias');
  } else if (data.exigencias.length > 0 && (typeof data.exigencias[0] !== 'string' || data.exigencias[0].length > 500)) {
    violations.push('invalid:exigencias[0]');
  }

  if (!Array.isArray(data.historico) || data.historico.length > 150) {
    violations.push('invalid:historico');
  } else if (data.historico.length > 0 && !isPlainObject(data.historico[0])) {
    violations.push('invalid:historico[0]');
  }

  return violations;
}

async function updateNotificationDocWithRepair(
  uid: string,
  yearId: string,
  docId: string,
  updatable: Record<string, unknown>,
  fallbackRecord: BuildingNotification,
  nowISO: string
): Promise<void> {
  const targetRef = doc(db, 'users', uid, 'years', yearId, 'notifications', docId);
  try {
    await updateDoc(targetRef, {
      ...updatable,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const msg = error instanceof Error ? error.message : String(error);
    const isRecoverableRuleOrMissing =
      code === 'permission-denied' ||
      code === 'not-found' ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('No document to update');

    if (!isRecoverableRuleOrMissing) {
      throw error;
    }

    const snap = await getDocFromServer(targetRef);
    if (!snap.exists()) {
      await setDoc(targetRef, {
        ...updatable,
        id: docId,
        ownerUid: uid,
        anoExercicio: yearId,
        criadoEm: clampStr(fallbackRecord.criadoEm || nowISO, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const existingData = snap.data() as Record<string, any>;
    const resolvedCriadoEm = clampStr(
      (typeof existingData.criadoEm === 'string' && existingData.criadoEm) ||
        fallbackRecord.criadoEm ||
        nowISO,
      64
    );

    const candidateDoc: Record<string, unknown> = {
      ...updatable,
      id: docId,
      ownerUid: uid,
      anoExercicio: yearId,
      criadoEm: resolvedCriadoEm,
    };

    const violations = findNotificationRuleViolations(candidateDoc, uid, yearId, docId);
    if (violations.length > 0) {
      console.error('Firestore notification payload rule violations:', {
        docId,
        yearId,
        violations,
      });
      throw error;
    }

    const legacyMismatch = hasLegacyNotificationSchemaMismatch(
      existingData,
      uid,
      yearId,
      docId
    );
    const isOwnedDoc = !existingData.ownerUid || existingData.ownerUid === uid;

    if (legacyMismatch || isOwnedDoc) {
      // Sequential delete + set avoids Firestore single-batch conflicts and
      // any update-only resource mismatch while still enforcing allow delete + allow create rules.
      await deleteDoc(targetRef);
      await setDoc(targetRef, {
        ...candidateDoc,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    throw error;
  }
}

export async function saveNotificationToFirestore(
  uid: string,
  record: BuildingNotification,
  isEditing: boolean,
  selectedYearFallback: string,
  previousYearId?: string
): Promise<BuildingNotification> {
  const safeId = sanitizeDocId(record.id);
  const targetYear = inferAnoExercicio(record, selectedYearFallback);
  const nowISO = new Date().toISOString();

  await ensureYearBucket(uid, targetYear);

  const updatable = buildUpdatableNotificationFields(record, nowISO);
  const targetPath = `users/${uid}/years/${targetYear}/notifications/${safeId}`;
  const targetRef = doc(db, 'users', uid, 'years', targetYear, 'notifications', safeId);

  try {
    if (isEditing && previousYearId && previousYearId !== targetYear) {
      // Processo mudou de ano (ex: usuário corrigiu data de entrada de 2026 -> 2027)
      const oldRef = doc(db, 'users', uid, 'years', previousYearId, 'notifications', safeId);
      await updateNotificationDocWithRepair(
        uid,
        targetYear,
        safeId,
        updatable,
        record,
        nowISO
      );
      await deleteDoc(oldRef);
    } else if (isEditing) {
      await updateNotificationDocWithRepair(
        uid,
        targetYear,
        safeId,
        updatable,
        record,
        nowISO
      );
    } else {
      await setDoc(targetRef, {
        ...updatable,
        id: safeId,
        ownerUid: uid,
        anoExercicio: targetYear,
        criadoEm: clampStr(record.criadoEm || nowISO, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      ...record,
      id: safeId,
      ownerUid: uid,
      anoExercicio: targetYear,
      atualizadoEm: String(updatable.atualizadoEm),
    };
  } catch (error) {
    handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, targetPath);
  }
}

export async function toggleHideNotificationInFirestore(
  uid: string,
  record: BuildingNotification,
  willHide: boolean,
  fallbackYear: string
): Promise<void> {
  const safeId = sanitizeDocId(record.id);
  const yearId = inferAnoExercicio(record, fallbackYear);
  const path = `users/${uid}/years/${yearId}/notifications/${safeId}`;
  const docRef = doc(db, 'users', uid, 'years', yearId, 'notifications', safeId);
  const nowISO = new Date().toISOString();
  try {
    await updateDoc(docRef, {
      oculto: willHide,
      atualizadoEm: nowISO,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const msg = error instanceof Error ? error.message : String(error);
    if (
      code === 'permission-denied' ||
      code === 'not-found' ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('No document to update')
    ) {
      try {
        await ensureYearBucket(uid, yearId);
        const updatable = buildUpdatableNotificationFields(
          { ...record, oculto: willHide },
          nowISO
        );
        await updateNotificationDocWithRepair(uid, yearId, safeId, updatable, record, nowISO);
        return;
      } catch (repairError) {
        handleFirestoreError(repairError, OperationType.UPDATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateHistoricoAndDetailsInFirestore(
  uid: string,
  record: BuildingNotification,
  newHistorico: AuditLog[],
  fallbackYear: string
): Promise<void> {
  const safeId = sanitizeDocId(record.id);
  const yearId = inferAnoExercicio(record, fallbackYear);
  const path = `users/${uid}/years/${yearId}/notifications/${safeId}`;
  const docRef = doc(db, 'users', uid, 'years', yearId, 'notifications', safeId);
  const nowISO = new Date().toISOString();
  try {
    await updateDoc(docRef, {
      historico: sanitizeHistorico(newHistorico),
      detalhesSST: sanitizeDetalhesSST(record.detalhesSST),
      atualizadoEm: nowISO,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const msg = error instanceof Error ? error.message : String(error);
    if (
      code === 'permission-denied' ||
      code === 'not-found' ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('No document to update')
    ) {
      try {
        await ensureYearBucket(uid, yearId);
        const updatable = buildUpdatableNotificationFields(
          { ...record, historico: newHistorico },
          nowISO
        );
        await updateNotificationDocWithRepair(uid, yearId, safeId, updatable, record, nowISO);
        return;
      } catch (repairError) {
        handleFirestoreError(repairError, OperationType.UPDATE, path);
      }
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotificationFromFirestore(
  uid: string,
  record: BuildingNotification,
  fallbackYear: string
): Promise<void> {
  const safeId = sanitizeDocId(record.id);
  const yearId = inferAnoExercicio(record, fallbackYear);
  const path = `users/${uid}/years/${yearId}/notifications/${safeId}`;
  const docRef = doc(db, 'users', uid, 'years', yearId, 'notifications', safeId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function deleteDocRefsInBatches(refs: ReturnType<typeof doc>[], logPath: string): Promise<void> {
  const CHUNK_SIZE = 30;
  for (let i = 0; i < refs.length; i += CHUNK_SIZE) {
    const chunk = refs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, logPath);
    }
  }
}

export async function clearYearNotificationsInFirestore(
  uid: string,
  yearsToClear: string[]
): Promise<number> {
  let totalDeleted = 0;
  for (const yearId of yearsToClear) {
    if (!/^\d{4}$/.test(yearId)) continue;
    const path = `users/${uid}/years/${yearId}/notifications`;
    try {
      const q = query(
        collection(db, 'users', uid, 'years', yearId, 'notifications'),
        where('ownerUid', '==', uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await deleteDocRefsInBatches(
          snap.docs.map((d) => d.ref),
          path
        );
        totalDeleted += snap.size;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
  return totalDeleted;
}

export async function batchImportNotificationsToFirestore(
  uid: string,
  items: BuildingNotification[],
  replaceExisting: boolean,
  targetYearScope: string,
  existingRecords: BuildingNotification[]
): Promise<{ importedCount: number; yearsTouched: string[] }> {
  const fallbackYear = /^\d{4}$/.test(targetYearScope)
    ? targetYearScope
    : String(new Date().getFullYear());

  // Agrupa os registros por ano de exercício
  const byYear = new Map<string, BuildingNotification[]>();
  for (const item of items) {
    const yearId = inferAnoExercicio(item, fallbackYear);
    const arr = byYear.get(yearId) || [];
    arr.push(item);
    byYear.set(yearId, arr);
  }

  const yearsTouched = Array.from(byYear.keys()).sort();

  // Garante existência dos contêineres de ano antes de gravar
  for (const yearId of yearsTouched) {
    await ensureYearBucket(uid, yearId);
  }

  // Se replaceExisting === true, limpa os documentos existentes dos anos afetados (ou do ano selecionado)
  if (replaceExisting) {
    const yearsToWipe = new Set<string>(yearsTouched);
    if (/^\d{4}$/.test(targetYearScope)) {
      yearsToWipe.add(targetYearScope);
    }
    await clearYearNotificationsInFirestore(uid, Array.from(yearsToWipe));
  }

  // Mapa para preservar IDs/createdAt quando for importação em modo "Mesclar / Adicionar"
  const existingByYearAndNum = new Map<string, BuildingNotification>();
  if (!replaceExisting) {
    for (const rec of existingRecords) {
      const y = inferAnoExercicio(rec, fallbackYear);
      existingByYearAndNum.set(`${y}::${rec.numero}`, rec);
    }
  }

  const CONCURRENCY = 8;
  const nowISO = new Date().toISOString();
  const usedDocIds = new Set<string>();

  for (const [yearId, yearItems] of byYear.entries()) {
    const writeTasks: Array<() => Promise<void>> = [];

    for (const rawItem of yearItems) {
      const existingMatch = !replaceExisting
        ? existingByYearAndNum.get(`${yearId}::${rawItem.numero}`)
        : undefined;

      let docId = existingMatch
        ? sanitizeDocId(existingMatch.id)
        : sanitizeDocId(rawItem.id);

      if (usedDocIds.has(`${yearId}::${docId}`)) {
        docId = sanitizeDocId(`${docId}_${Math.random().toString(36).slice(2, 6)}`);
      }
      usedDocIds.add(`${yearId}::${docId}`);

      const docPath = `users/${uid}/years/${yearId}/notifications/${docId}`;
      const docRef = doc(db, 'users', uid, 'years', yearId, 'notifications', docId);
      const updatable = buildUpdatableNotificationFields(rawItem, nowISO);
      const shouldUpdate = Boolean(existingMatch && !usedDocIds.has(`updated::${yearId}::${docId}`));
      if (shouldUpdate) {
        usedDocIds.add(`updated::${yearId}::${docId}`);
      }

      writeTasks.push(async () => {
        try {
          if (shouldUpdate) {
            await updateNotificationDocWithRepair(
              uid,
              yearId,
              docId,
              updatable,
              rawItem,
              nowISO
            );
          } else {
            await setDoc(docRef, {
              ...updatable,
              id: docId,
              ownerUid: uid,
              anoExercicio: yearId,
              criadoEm: clampStr(rawItem.criadoEm || nowISO, 64),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(
            error,
            shouldUpdate ? OperationType.UPDATE : OperationType.CREATE,
            docPath
          );
        }
      });
    }

    for (let i = 0; i < writeTasks.length; i += CONCURRENCY) {
      const wave = writeTasks.slice(i, i + CONCURRENCY);
      await Promise.all(wave.map((run) => run()));
    }
  }

  return { importedCount: items.length, yearsTouched };
}

export async function syncDgstCorrelationToFirestore(
  uid: string,
  updates: BuildingNotification[],
  creates: BuildingNotification[],
  targetYearScope: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ updatedCount: number; createdCount: number; yearsTouched: string[] }> {
  const fallbackYear = /^\d{4}$/.test(targetYearScope)
    ? targetYearScope
    : String(new Date().getFullYear());

  const allRecords = [...updates, ...creates];
  const yearsSet = new Set<string>();
  for (const item of allRecords) {
    yearsSet.add(inferAnoExercicio(item, fallbackYear));
  }
  const yearsTouched = Array.from(yearsSet).sort();

  for (const yearId of yearsTouched) {
    await ensureYearBucket(uid, yearId);
  }

  const total = updates.length + creates.length;
  let completed = 0;
  const CONCURRENCY = 8;
  const nowISO = new Date().toISOString();

  const tasks: Array<() => Promise<void>> = [];

  for (const record of updates) {
    const safeId = sanitizeDocId(record.id);
    const yearId = inferAnoExercicio(record, fallbackYear);
    const docPath = `users/${uid}/years/${yearId}/notifications/${safeId}`;
    const updatable = buildUpdatableNotificationFields(record, nowISO);

    tasks.push(async () => {
      try {
        await updateNotificationDocWithRepair(uid, yearId, safeId, updatable, record, nowISO);
        completed += 1;
        onProgress?.(completed, total);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    });
  }

  const usedNewIds = new Set<string>();
  for (const record of creates) {
    const yearId = inferAnoExercicio(record, fallbackYear);
    let safeId = sanitizeDocId(record.id);
    if (usedNewIds.has(`${yearId}::${safeId}`)) {
      safeId = sanitizeDocId(`${safeId}_${Math.random().toString(36).slice(2, 6)}`);
    }
    usedNewIds.add(`${yearId}::${safeId}`);

    const docPath = `users/${uid}/years/${yearId}/notifications/${safeId}`;
    const docRef = doc(db, 'users', uid, 'years', yearId, 'notifications', safeId);
    const updatable = buildUpdatableNotificationFields(record, nowISO);

    tasks.push(async () => {
      try {
        await setDoc(docRef, {
          ...updatable,
          id: safeId,
          ownerUid: uid,
          anoExercicio: yearId,
          criadoEm: clampStr(record.criadoEm || nowISO, 64),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        completed += 1;
        onProgress?.(completed, total);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    });
  }

  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const wave = tasks.slice(i, i + CONCURRENCY);
    await Promise.all(wave.map((run) => run()));
  }

  return {
    updatedCount: updates.length,
    createdCount: creates.length,
    yearsTouched,
  };
}
