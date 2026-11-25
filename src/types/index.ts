export type DocumentType = 
  | 'Notificação'
  | 'Auto de Infração'
  | 'Notificação Preventiva'
  | 'Interdição'
  | 'TAC';

export type StatusType = 
  | 'Notificação'
  | 'Auto de Infração'
  | 'Interdição'
  | 'Encerrado'
  | 'Notificação Preventiva'
  | 'TAC'
  | 'INDEFERIDO'
  | 'DEFERIDO'
  | 'ENTREGUE'
  | 'EM ANDAMENTO'
  | (string & {});

export type ExpirationFilter = 'todos' | 'vencidos' | 'no_prazo' | 'sem_validade';

export interface AuditLog {
  id: string;
  data: string; // ISO ou DD/MM/YYYY HH:mm
  autor: string;
  acao: string;
  detalhes: string;
}

export interface BilheteItem {
  id: string;
  ordem: number; // 1, 2, 3...
  tipo: 'primeiro' | 'intermediario' | 'ultimo';
  tipoDetalhe?: 'BILHETE' | 'RETORNO';
  rotulo: string; // Ex: '1º Bilhete (Data do Bilhete)', 'Último Bilhete', 'Bilhete Intermediário'
  data?: string; // DD/MM/AAAA ou DD/MM
  dias?: string | number; // Dias decorridos
  statusOuParecer?: string; // Ex: 'GERADO DI', 'FINALIZADO'
  despacho?: string;
  autor?: string;
}

export interface SSTProcessDetails {
  codigo?: string; // CÓDIGO (ex: 11220)
  dataBase?: string; // DATA BASE (ex: 15)
  entradaSST?: string; // ENTRADA NA SST (ex: 05/01)
  entradaOBM?: string; // ENTRADA DA OBM (ex: 05/01)
  diasEntrada?: string | number; // DIAS (ex: 0)
  processoAntigo?: string; // PROCESSO ANTIGO (ex: - - - -)
  numDocAntigo?: string; // Nº DO DOC. ANTIGO (ex: - - - -)
  envioDirDivisao?: string; // ENVIO AO DIR. DIVISÃO (ex: 05/01)
  diasEnvioDivisao?: string | number; // DIAS (ex: 0)
  situacao?: string; // SITUAÇÃO (ex: INDEFERIDO)
  bilhetes?: string; // BILHETES (ex: 05/01)
  diasBilhetes?: string | number; // DIAS do 1º bilhete (ex: 0)
  aoDiretor?: string; // AO DIRETOR (ex: GERADO DI)
  dataAoDiretor?: string; // DATA AO DIRETOR (ex: 05/01)
  diasAoDiretor?: string | number; // DIAS (ex: 0)
  grafico?: string; // GRÁFICO (ex: DI)
  docGerado?: string; // DOC. GERADO (ex: DI-1029)
  situacaoDocGerado?: string; // SITUAÇÃO (ex: ENTREGUE)
  previsaoPronto?: string; // PREVISÃO PARA O PRONTO (ex: 13/01)
  diasPrevisao?: string | number; // DIAS (ex: 8)
  dataPronto?: string; // DATA DO PRONTO (ex: 28/01 ou 13/01)
  processoSeguinte?: string; // PROCESSO SEGUINTE (ex: 2394)
  dataEntregue?: string; // DATA DE ENTREGUE (ex: 15/01)
  diasEntrega?: string | number; // DIAS (ex: 2)
  diasEmAtraso?: string | number; // DIAS EM ATRASO (ex: 0)
  diasNaSST?: string | number; // DIAS NA SST (ex: 2)
  noGeral?: string | number; // NO GERAL (ex: 10)
  localizacao?: string; // LOCALIZAÇÃO (ex: PASTA INTERNET)
  dataBilhete?: string; // DATA DO BILHETE (1º bilhete)
  diasBilhete?: string | number; // DIAS (1º bilhete)
  outrosBilhetes?: string; // OUTROS BILHETES / PARECERES INTERMEDIÁRIOS
  ultimoBilhete?: string; // ÚLTIMO BILHETE (data do último bilhete)
  diasUltimoBilhete?: string | number; // DIAS DO ÚLTIMO BILHETE
  listaBilhetes?: BilheteItem[]; // Coleção de bilhetes (1º bilhete, intermediários, último)
}

export interface BuildingNotification {
  id: string;
  numero: number;
  processo?: string; // 5 dígitos, ex: "00075"
  codigoDocumento: string; // Ex: NOT-10GBM-2026/001
  edificacao: string; // REQUERENTE / Edificação
  requerente?: string; // REQUERENTE
  requerenteCpfCnpj?: string; // CPF ou CNPJ do Requerente
  tipoProcesso?: string; // TIPO (ex: Certificado de Aprovação, Notificação, Auto de Vistoria)
  origem?: string; // ORIGEM (ex: ANGRA DOS REIS, SST 10º GBM)
  status: StatusType;
  tipoDocumento: DocumentType;
  obm: string; // Ex: 10º GBM - ANGRA DOS REIS
  dataExpedicao: string; // YYYY-MM-DD (Data de Entrada / Expedição)
  dataEntrada?: string; // YYYY-MM-DD
  dataValidade: string | null; // YYYY-MM-DD or null (Data Trâmite / Validade)
  dataTramite?: string | null; // YYYY-MM-DD
  oculto: boolean;
  
  // Detalhes completos extraídos da planilha de controle SST
  detalhesSST?: SSTProcessDetails;
  
  // Endereço e Localização
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    cep?: string;
    pontoReferencia?: string;
  };

  // Responsável / Proprietário / Síndico
  proprietario: {
    nomeOuRazaoSocial: string;
    cpfOuCnpj: string;
    telefone: string;
    email: string;
    tipoVinculo?: string;
    sindicoNome?: string;
    sindicoCpf?: string;
    sindicoTelefone?: string;
  };

  // Fiscal e Tramitação
  fiscalResponsavel: string;
  matriculaFiscal: string;
  processoAdministrativo?: string;
  
  // Exigências e Itens Vistoriados
  exigencias: string[];
  observacoes: string;
  
  // Histórico de alterações
  historico: AuditLog[];
  
  criadoEm: string;
  atualizadoEm: string;
  anoExercicio?: string;
  ownerUid?: string;
}

export interface FilterState {
  dataInicial: string;
  dataFinal: string;
  obm: string;
  status: string;
  localizacao?: string;
  vencimento: ExpirationFilter;
  ordenacaoCampo: 'dataExpedicao' | 'dataValidade' | 'numero' | 'edificacao';
  ordenacaoDirecao: 'asc' | 'desc';
  termoBusca: string;
  mostrarOcultos: boolean;
}
