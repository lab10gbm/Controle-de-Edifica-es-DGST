export type FiscalizacaoStatus =
  | 'Notificação'
  | '1º Auto de Infração'
  | '2º Auto de Infração'
  | 'Auto de Interdição por Inércia'
  | 'Auto de Interdição por Perigo iminente'
  | 'TAC em Andamento'
  | 'Encerrado'
  | 'Cancelado';

export const FISCALIZACAO_STATUS_LIST: FiscalizacaoStatus[] = [
  'Notificação',
  '1º Auto de Infração',
  '2º Auto de Infração',
  'Auto de Interdição por Inércia',
  'Auto de Interdição por Perigo iminente',
  'TAC em Andamento',
  'Encerrado',
  'Cancelado',
];

export interface FiscalizacaoAto {
  id: string;
  data: string;
  tipoAto: string;
  numeroAto: string;
  orgao: string;
  observacao?: string;
}

export interface FiscalizacaoRecord {
  id: string;
  ownerUid?: string;
  codigo: number;
  edificacao: string;
  documentoCpfCnpj: string;
  enderecoCompleto: string;
  municipio: string;
  processoVinculado: string;
  status: FiscalizacaoStatus;
  dataExpedicao: string;
  dataValidade: string;
  anoExpedicao: string;
  rgFiscal: string;
  fiscalResponsavel: string;
  orgaoPrincipal: string;
  ultimoNumeroAto: string;
  historicoAtos: FiscalizacaoAto[];
  historicoTexto: string;
  redacao: string;
  observacoes: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface FiscalizacaoFilterState {
  termoBusca: string;
  status: string; // '' | 'ATIVAS' | FiscalizacaoStatus
  municipio: string;
  orgao: string;
  ano: string;
  ordenacaoCampo: 'codigo' | 'edificacao' | 'status' | 'dataExpedicao';
  ordenacaoDirecao: 'asc' | 'desc';
}
