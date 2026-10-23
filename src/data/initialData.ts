import { BuildingNotification } from '../types';
import sstNotifications from './sstNotifications.json';

export const OBM_LIST = [
  '10º GBM - ANGRA DOS REIS',
  '26º GBM - ITAGUAÍ',
  'DBM 1/10 - PARATY',
  'DBM 2/10 - ILHA GRANDE',
  'DBM 1/26 - MANGARATIBA',
  '2º GSFMA - MARÍTIMO',
];

export const STATUS_LIST = [
  'INDEFERIDO',
  'DEFERIDO',
  'APROVADO',
  'ENTREGUE',
  'EM ANÁLISE',
  'AGUARDANDO',
  'RETORNANDO',
  'GERADO DI',
  'EM ANDAMENTO',
  'PRONTO',
  'ASSINANDO',
  'Encerrado',
  'Notificação',
  'Auto de Infração',
  'Interdição',
  'Notificação Preventiva',
  'TAC',
];

export const LOCALIZACAO_LIST = [
  'PROTOCOLO',
  'DIR. DIVISÃO',
  'DIRETOR',
  'PRONTO',
  'ENTREGUE NET',
  'PASTA INTERNET',
  'INTERNET',
  'PRANCHETA',
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

export const INITIAL_NOTIFICATIONS: BuildingNotification[] = sstNotifications as BuildingNotification[];
