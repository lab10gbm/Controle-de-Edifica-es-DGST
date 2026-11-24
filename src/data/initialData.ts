import { BuildingNotification } from '../types';

export const OBM_LIST = [
  '10º GBM - ANGRA DOS REIS',
  '26º GBM - ITAGUAÍ',
  'DBM 1/10 - PARATY',
  'DBM 2/10 - ILHA GRANDE',
  'DBM 1/26 - MANGARATIBA',
  '2º GSFMA - MARÍTIMO',
];

export const STATUS_LIST = [
  'EM ANÁLISE',
  'INDEFERIDO',
  'APROVADO',
];

export const DETALHE_STATUS_LIST = [
  'BILHETE 1',
  'RETORNO 1B',
  'BILHETE 2',
  'RETORNO 2B',
  'BILHETE 3',
  'RETORNO 3B',
  'BILHETE 4',
  'RETORNO 4B',
  'BILHETE 5',
  'RETORNO 5B',
];

export const LOCALIZACAO_LIST = [
  'PROTOCOLO',
  'DIR. DIVISÃO',
  'DIRETOR',
  'PRONTO',
  'INTERNET',
  'CX AUTORIZAÇÕES',
];

export const TIPOS_PROCESSO_LIST = [
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

export { PRAZOS_POR_TIPO } from '../utils/helpers';

// Base de dados limpa (0 registros por padrão)
export const INITIAL_NOTIFICATIONS: BuildingNotification[] = [];
