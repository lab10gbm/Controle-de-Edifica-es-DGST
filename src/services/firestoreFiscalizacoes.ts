import {
  collection,
  deleteDoc,
  doc,
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
  FISCALIZACAO_STATUS_LIST,
  FiscalizacaoAto,
  FiscalizacaoRecord,
  FiscalizacaoStatus,
} from '../types/fiscalizacao';
import { ensureUserProfile, sanitizeDocId } from './firestoreNotifications';

function clampStr(val: unknown, maxLen: number): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function sanitizeHistoricoAtos(list?: FiscalizacaoAto[]): FiscalizacaoAto[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 50).map((a, idx) => {
    const item: FiscalizacaoAto = {
      id: clampStr(a?.id || `ato-${idx + 1}`, 60),
      data: clampStr(a?.data || '', 20),
      tipoAto: clampStr(a?.tipoAto || 'Ato Fiscal', 80),
      numeroAto: clampStr(a?.numeroAto || '', 40),
      orgao: clampStr(a?.orgao || '', 40),
    };
    if (a?.observacao) {
      item.observacao = clampStr(a.observacao, 400);
    }
    return item;
  });
}

function buildUpdatableFiscalizacaoFields(
  record: FiscalizacaoRecord,
  nowISO: string
): Record<string, unknown> {
  const status: FiscalizacaoStatus = FISCALIZACAO_STATUS_LIST.includes(record.status)
    ? record.status
    : 'Notificação';

  const codigo = Number.isFinite(Number(record.codigo))
    ? Math.max(0, Number(record.codigo))
    : 0;

  return {
    codigo,
    edificacao: clampStr(record.edificacao || 'EM BRANCO', 300),
    documentoCpfCnpj: clampStr(record.documentoCpfCnpj || '', 40),
    enderecoCompleto: clampStr(record.enderecoCompleto || '', 400),
    municipio: clampStr(record.municipio || 'Não Informado', 120),
    processoVinculado: clampStr(record.processoVinculado || '', 120),
    status,
    dataExpedicao: clampStr(record.dataExpedicao || '', 40),
    dataValidade: clampStr(record.dataValidade || '', 40),
    anoExpedicao: clampStr(record.anoExpedicao || '', 4),
    rgFiscal: clampStr(record.rgFiscal || '', 40),
    fiscalResponsavel: clampStr(record.fiscalResponsavel || '', 160),
    orgaoPrincipal: clampStr(record.orgaoPrincipal || '', 40),
    ultimoNumeroAto: clampStr(record.ultimoNumeroAto || '', 40),
    historicoAtos: sanitizeHistoricoAtos(record.historicoAtos),
    historicoTexto: clampStr(record.historicoTexto || '', 2000),
    redacao: clampStr(record.redacao || '', 4000),
    observacoes: clampStr(record.observacoes || '', 2000),
    atualizadoEm: clampStr(record.atualizadoEm || nowISO, 64),
  };
}

function fromFirestoreFiscalizacaoDoc(
  data: Record<string, any>,
  docId: string
): FiscalizacaoRecord {
  const status: FiscalizacaoStatus = FISCALIZACAO_STATUS_LIST.includes(data.status)
    ? data.status
    : 'Notificação';

  return {
    id: String(data.id || docId),
    ownerUid: data.ownerUid,
    codigo: typeof data.codigo === 'number' ? data.codigo : 0,
    edificacao: data.edificacao || '',
    documentoCpfCnpj: data.documentoCpfCnpj || '',
    enderecoCompleto: data.enderecoCompleto || '',
    municipio: data.municipio || 'Não Informado',
    processoVinculado: data.processoVinculado || '',
    status,
    dataExpedicao: data.dataExpedicao || '',
    dataValidade: data.dataValidade || '',
    anoExpedicao: data.anoExpedicao || '',
    rgFiscal: data.rgFiscal || '',
    fiscalResponsavel: data.fiscalResponsavel || '',
    orgaoPrincipal: data.orgaoPrincipal || '',
    ultimoNumeroAto: data.ultimoNumeroAto || '',
    historicoAtos: Array.isArray(data.historicoAtos) ? data.historicoAtos : [],
    historicoTexto: data.historicoTexto || '',
    redacao: data.redacao || '',
    observacoes: data.observacoes || '',
    criadoEm: data.criadoEm || new Date().toISOString(),
    atualizadoEm: data.atualizadoEm || new Date().toISOString(),
  };
}

export function subscribeToFiscalizacoes(
  uid: string,
  onData: (records: FiscalizacaoRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/fiscalizacoes`;
  const q = query(
    collection(db, 'users', uid, 'fiscalizacoes'),
    where('ownerUid', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        fromFirestoreFiscalizacaoDoc(d.data(), d.id)
      );
      items.sort((a, b) => a.codigo - b.codigo);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveFiscalizacaoToFirestore(
  uid: string,
  record: FiscalizacaoRecord,
  isEditing: boolean
): Promise<FiscalizacaoRecord> {
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await ensureUserProfile(auth.currentUser);
  }
  const safeId = sanitizeDocId(record.id);
  const nowISO = new Date().toISOString();
  const updatable = buildUpdatableFiscalizacaoFields(record, nowISO);
  const docPath = `users/${uid}/fiscalizacoes/${safeId}`;
  const docRef = doc(db, 'users', uid, 'fiscalizacoes', safeId);

  try {
    if (isEditing) {
      await updateDoc(docRef, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ...updatable,
        id: safeId,
        ownerUid: uid,
        criadoEm: clampStr(record.criadoEm || nowISO, 64),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      ...record,
      id: safeId,
      ownerUid: uid,
      atualizadoEm: String(updatable.atualizadoEm),
    };
  } catch (error) {
    handleFirestoreError(
      error,
      isEditing ? OperationType.UPDATE : OperationType.CREATE,
      docPath
    );
  }
}

export async function deleteFiscalizacaoFromFirestore(
  uid: string,
  recordId: string
): Promise<void> {
  const safeId = sanitizeDocId(recordId);
  const docPath = `users/${uid}/fiscalizacoes/${safeId}`;
  const docRef = doc(db, 'users', uid, 'fiscalizacoes', safeId);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function clearAllFiscalizacoesInFirestore(uid: string): Promise<number> {
  const path = `users/${uid}/fiscalizacoes`;
  try {
    const q = query(
      collection(db, 'users', uid, 'fiscalizacoes'),
      where('ownerUid', '==', uid)
    );
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    const CHUNK = 100;
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchImportFiscalizacoesToFirestore(
  uid: string,
  records: FiscalizacaoRecord[],
  replaceExisting: boolean,
  existingIds: Set<string>,
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await ensureUserProfile(auth.currentUser);
  }

  const activeExistingIds = new Set(existingIds);
  if (replaceExisting && activeExistingIds.size > 0) {
    await clearAllFiscalizacoesInFirestore(uid);
    activeExistingIds.clear();
  }

  const nowISO = new Date().toISOString();
  const BATCH_SIZE = 100;
  let completed = 0;
  const path = `users/${uid}/fiscalizacoes`;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const rec of chunk) {
      const safeId = sanitizeDocId(rec.id || `fisc-${String(rec.codigo).padStart(4, '0')}`);
      const docRef = doc(db, 'users', uid, 'fiscalizacoes', safeId);
      const updatable = buildUpdatableFiscalizacaoFields(rec, nowISO);

      if (!replaceExisting && activeExistingIds.has(safeId)) {
        batch.update(docRef, {
          ...updatable,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(docRef, {
          ...updatable,
          id: safeId,
          ownerUid: uid,
          criadoEm: clampStr(rec.criadoEm || nowISO, 64),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        activeExistingIds.add(safeId);
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }

    completed += chunk.length;
    onProgress?.(completed, records.length);
  }

  return records.length;
}
