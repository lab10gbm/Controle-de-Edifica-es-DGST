import React, { useState, useEffect, useRef } from 'react';
import { 
  BuildingNotification, 
  StatusType, 
  DocumentType 
} from '../types';
import { OBM_LIST, STATUS_LIST, LOCALIZACAO_LIST, TIPOS_PROCESSO_LIST } from '../data/initialData';
import { getTodayISO, getDiasPrazoPorTipo, adicionarDiasAData, formatDateBR, formatCpfCnpj, PRAZOS_POR_TIPO, parseProcessoE27, extractProcessoNumero, CODIGOS_PROCESSO_LIST, getCodigoPorTipo, getTipoPorCodigo, getDescricaoCodigoSST } from '../utils/helpers';
import { cleanProcessLinkValue } from '../utils/processLinks';
import { 
  X, 
  Save, 
  Building, 
  MapPin, 
  FileText, 
  User, 
  Calendar, 
  Plus, 
  Trash2, 
  AlertCircle,
  ShieldCheck,
  Check,
  Clock,
  Link2,
  ArrowLeftRight
} from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: BuildingNotification, isEditing: boolean) => void;
  editingRecord: BuildingNotification | null;
  nextNumber: number;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  nextNumber,
}) => {
  const isEditing = Boolean(editingRecord);

  // Form State
  const [numero, setNumero] = useState<number>(nextNumber);
  const [processo, setProcesso] = useState<string>('');
  const [is4BlocksMode, setIs4BlocksMode] = useState<boolean>(true);
  const [blocoPrefixo, setBlocoPrefixo] = useState<string>('E27');
  const [blocoNumero, setBlocoNumero] = useState<string>('');
  const [blocoCodigo, setBlocoCodigo] = useState<string>('');
  const [blocoAno, setBlocoAno] = useState<string>(() => getTodayISO().slice(0, 4));
  const blocoPrefixoRef = useRef<HTMLInputElement>(null);
  const blocoNumeroRef = useRef<HTMLInputElement>(null);
  const blocoCodigoRef = useRef<HTMLInputElement>(null);
  const blocoAnoRef = useRef<HTMLInputElement>(null);
  const [codigoDocumento, setCodigoDocumento] = useState('');
  const [edificacao, setEdificacao] = useState('');
  const [requerente, setRequerente] = useState('');
  const [requerenteCpfCnpj, setRequerenteCpfCnpj] = useState('');
  const [tipoProcesso, setTipoProcesso] = useState<string>('CERTIFICADO DE APROVAÇÃO');
  const [origem, setOrigem] = useState('10º GBM - ANGRA DOS REIS');
  const [localizacao, setLocalizacao] = useState('PROTOCOLO');
  const [docGerado, setDocGerado] = useState('');
  const [dataAoDiretor, setDataAoDiretor] = useState('');
  const [dataPronto, setDataPronto] = useState('');
  const [outrosBilhetes, setOutrosBilhetes] = useState('');
  const [processoAntigo, setProcessoAntigo] = useState('');
  const [numDocAntigo, setNumDocAntigo] = useState('');
  const [processoSeguinte, setProcessoSeguinte] = useState('');
  const [status, setStatus] = useState<StatusType>('Notificação');
  const [tipoDocumento, setTipoDocumento] = useState<DocumentType>('Notificação');
  const [obm, setObm] = useState('10º GBM - ANGRA DOS REIS');
  const [dataExpedicao, setDataExpedicao] = useState(() => getTodayISO());
  const [dataValidade, setDataValidade] = useState('');
  
  // Localização (Opcional - usuário pode preencher livremente quando houver)
  const [logradouro, setLogradouro] = useState('');
  const [numeroEndereco, setNumeroEndereco] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('Angra dos Reis');
  const [cep, setCep] = useState('');
  const [pontoReferencia, setPontoReferencia] = useState('');

  // Proprietário / Responsável Legal / Síndico (Opcional)
  const [repetirRequerente, setRepetirRequerente] = useState<boolean>(false);
  const [proprietarioTipoVinculo, setProprietarioTipoVinculo] = useState('Proprietário / Responsável Legal');
  const [proprietarioNome, setProprietarioNome] = useState('');
  const [proprietarioDoc, setProprietarioDoc] = useState('');
  const [proprietarioTelefone, setProprietarioTelefone] = useState('');
  const [proprietarioEmail, setProprietarioEmail] = useState('');
  const [sindicoNome, setSindicoNome] = useState('');
  const [sindicoCpf, setSindicoCpf] = useState('');
  const [sindicoTelefone, setSindicoTelefone] = useState('');

  // Fiscalização (Totalmente editável pelo usuário sem dados inventados)
  const [fiscalResponsavel, setFiscalResponsavel] = useState('');
  const [matriculaFiscal, setMatriculaFiscal] = useState('');
  const [processoAdministrativo, setProcessoAdministrativo] = useState('');
  
  // Exigências & Obs (Totalmente editável pelo usuário)
  const [exigencias, setExigencias] = useState<string[]>([]);
  const [novaExigencia, setNovaExigencia] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Justificativa para log de auditoria
  const [justificativaAlteracao, setJustificativaAlteracao] = useState('');
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const syncTipoByCodigo = (codigoDigits: string, baseDate = dataExpedicao) => {
    const matchedTipo = getTipoPorCodigo(codigoDigits, tipoProcesso);
    if (matchedTipo && matchedTipo !== tipoProcesso) {
      setTipoProcesso(matchedTipo);
      const dias = getDiasPrazoPorTipo(matchedTipo);
      const prazoCalc = adicionarDiasAData(baseDate, dias);
      if (prazoCalc.dataISO) {
        setDataValidade(prazoCalc.dataISO);
      }
    }
  };

  const handleTipoProcessoChange = (novoTipo: string) => {
    const prevDefaultCode = getCodigoPorTipo(tipoProcesso, dataExpedicao);
    const nextDefaultCode = getCodigoPorTipo(novoTipo, dataExpedicao);
    setTipoProcesso(novoTipo);

    const dias = getDiasPrazoPorTipo(novoTipo);
    const prazoCalc = adicionarDiasAData(dataExpedicao, dias);
    if (prazoCalc.dataISO) {
      setDataValidade(prazoCalc.dataISO);
    }

    const curCod = blocoCodigo.trim();
    const shouldSyncCode =
      !curCod ||
      curCod === prevDefaultCode ||
      getTipoPorCodigo(curCod, novoTipo) !== null;

    if (shouldSyncCode) {
      setBlocoCodigo(nextDefaultCode);
      if (!is4BlocksMode && nextDefaultCode) {
        const parsedProc = parseProcessoE27(processo);
        if (parsedProc?.isE27 && parsedProc.ano) {
          setProcesso(`E27/${parsedProc.numeroPadded}/${nextDefaultCode}/${parsedProc.ano}`);
        }
      }
    }
  };

  const handleBlocoCodigoChange = (raw: string) => {
    const hasSlash = raw.includes('/');
    const digits = raw.replace(/[^\d]/g, '').slice(0, 6);
    setBlocoCodigo(digits);
    syncTipoByCodigo(digits);
    if (hasSlash) {
      blocoAnoRef.current?.focus();
    }
  };

  const handleDataEntradaChange = (novaData: string) => {
    const prevDefaultCode = getCodigoPorTipo(tipoProcesso, dataExpedicao);
    const nextDefaultCode = getCodigoPorTipo(tipoProcesso, novaData);
    setDataExpedicao(novaData);
    if (/^\d{4}-\d{2}-\d{2}$/.test(novaData) && !isEditing) {
      setBlocoAno(novaData.slice(0, 4));
      if (nextDefaultCode && (!blocoCodigo.trim() || blocoCodigo.trim() === prevDefaultCode)) {
        setBlocoCodigo(nextDefaultCode);
      }
    }
    const dias = getDiasPrazoPorTipo(tipoProcesso);
    const prazoCalc = adicionarDiasAData(novaData, dias);
    if (prazoCalc.dataISO) {
      setDataValidade(prazoCalc.dataISO);
    }
  };

  const composeFromBlocks = (pref: string, num: string, cod: string, ano: string): string => {
    const numDigits = num.replace(/[^\d]/g, '');
    if (!numDigits) return '';
    const prefClean = pref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'E27';
    const codDigits = cod.replace(/[^\d]/g, '');
    const anoDigits = ano.replace(/[^\d]/g, '');
    const anoFinal =
      anoDigits.length === 4
        ? anoDigits
        : anoDigits.length === 2
        ? `20${anoDigits}`
        : (dataExpedicao ? dataExpedicao.slice(0, 4) : String(new Date().getFullYear()));
    if (codDigits) {
      const numPadded = numDigits.length >= 4 ? numDigits : numDigits.padStart(4, '0');
      return `${prefClean}/${numPadded}/${codDigits}/${anoFinal}`;
    }
    return numDigits.padStart(5, '0');
  };

  const applyValueToBlocks = (
    rawVal: string,
    fallbackCodigo?: string,
    fallbackAno?: string,
    syncTipoFromCode = false
  ) => {
    const trimmed = rawVal.trim().toUpperCase();
    const partsMatch = trimmed.match(/^([A-Z]-?\d+)\s*\/\s*(\d{1,7})\s*\/\s*(\d{0,6})\s*\/\s*(\d{2,4})$/);
    if (partsMatch) {
      const codExtracted = partsMatch[3] || fallbackCodigo || '';
      setBlocoPrefixo(partsMatch[1].replace('-', ''));
      setBlocoNumero(partsMatch[2]);
      setBlocoCodigo(codExtracted);
      const y = partsMatch[4];
      setBlocoAno(y.length === 2 ? `20${y}` : y);
      if (syncTipoFromCode && codExtracted) {
        syncTipoByCodigo(codExtracted);
      }
      return true;
    }

    const parsed = parseProcessoE27(trimmed, {
      codigo: fallbackCodigo,
      ano: fallbackAno,
    });
    if (parsed) {
      const codExtracted = parsed.codigo || fallbackCodigo || '';
      setBlocoPrefixo('E27');
      setBlocoNumero(parsed.numeroBruto || String(parsed.numero));
      setBlocoCodigo(codExtracted);
      setBlocoAno(parsed.ano || fallbackAno || getTodayISO().slice(0, 4));
      if (syncTipoFromCode && codExtracted) {
        syncTipoByCodigo(codExtracted);
      }
      return true;
    }

    const onlyDigits = trimmed.replace(/[^\d]/g, '');
    setBlocoPrefixo('E27');
    setBlocoNumero(onlyDigits);
    setBlocoCodigo(fallbackCodigo || '');
    setBlocoAno(fallbackAno || getTodayISO().slice(0, 4));
    return false;
  };

  const handleToggleCadastroLineMode = () => {
    if (is4BlocksMode) {
      const composed = composeFromBlocks(blocoPrefixo, blocoNumero, blocoCodigo, blocoAno);
      setProcesso(composed);
      setIs4BlocksMode(false);
    } else {
      const fallbackAno = dataExpedicao ? dataExpedicao.slice(0, 4) : getTodayISO().slice(0, 4);
      applyValueToBlocks(
        processo,
        blocoCodigo || editingRecord?.detalhesSST?.codigo || getCodigoPorTipo(tipoProcesso, dataExpedicao),
        fallbackAno,
        true
      );
      setIs4BlocksMode(true);
    }
  };

  useEffect(() => {
    if (editingRecord) {
      setNumero(editingRecord.numero);
      const rawProcVal =
        editingRecord.processo !== undefined
          ? (editingRecord.processo || '')
          : (editingRecord.numero ? String(editingRecord.numero).padStart(5, '0') : '');
      setProcesso(rawProcVal);

      const fallbackAnoEdit =
        editingRecord.anoExercicio ||
        (editingRecord.dataEntrada || editingRecord.dataExpedicao || '').match(/\b(20\d{2})\b/)?.[1] ||
        getTodayISO().slice(0, 4);
      const fallbackCodEdit = editingRecord.detalhesSST?.codigo || '';
      const parsedEdit = parseProcessoE27(rawProcVal, {
        codigo: fallbackCodEdit,
        ano: fallbackAnoEdit,
      });

      const isNonStandardText =
        Boolean(rawProcVal.trim()) &&
        rawProcVal.trim().toUpperCase() !== 'S/N' &&
        !parsedEdit;

      setIs4BlocksMode(!isNonStandardText);
      applyValueToBlocks(rawProcVal, fallbackCodEdit, fallbackAnoEdit);

      const reqNomeEdit = editingRecord.requerente || editingRecord.edificacao || '';
      const propNomeEdit = editingRecord.proprietario?.nomeOuRazaoSocial || '';
      const propDocEdit = editingRecord.proprietario?.cpfOuCnpj || '';
      const reqDocEdit =
        editingRecord.requerenteCpfCnpj !== undefined
          ? (editingRecord.requerenteCpfCnpj || '')
          : (propDocEdit && (!propNomeEdit.trim() || propNomeEdit.trim().toUpperCase() === reqNomeEdit.trim().toUpperCase())
              ? propDocEdit
              : '');

      setCodigoDocumento(editingRecord.codigoDocumento || '');
      setEdificacao(editingRecord.edificacao || '');
      setRequerente(reqNomeEdit);
      setRequerenteCpfCnpj(reqDocEdit);
      const tipo = editingRecord.tipoProcesso || editingRecord.tipoDocumento || 'CERTIFICADO DE APROVAÇÃO';
      setTipoProcesso(tipo);
      setOrigem(editingRecord.origem || editingRecord.obm || '10º GBM - ANGRA DOS REIS');
      const rawLoc = (editingRecord.detalhesSST?.localizacao || '').trim();
      const normLoc = rawLoc.toUpperCase().replace(/\s+/g, ' ');
      const normalizedLoc =
        normLoc === 'PASTA INTERNET' || normLoc === 'PRANCHETA'
          ? 'INTERNET'
          : rawLoc || 'PROTOCOLO';
      setLocalizacao(normalizedLoc);
      setDocGerado(editingRecord.detalhesSST?.docGerado || '');
      setDataAoDiretor(editingRecord.detalhesSST?.dataAoDiretor || editingRecord.detalhesSST?.aoDiretor || '');
      setDataPronto(editingRecord.detalhesSST?.dataPronto || '');
      setOutrosBilhetes(editingRecord.detalhesSST?.outrosBilhetes || '');
      setProcessoAntigo(cleanProcessLinkValue(editingRecord.detalhesSST?.processoAntigo));
      setNumDocAntigo(cleanProcessLinkValue(editingRecord.detalhesSST?.numDocAntigo));
      setProcessoSeguinte(cleanProcessLinkValue(editingRecord.detalhesSST?.processoSeguinte));
      setStatus(editingRecord.status);
      setTipoDocumento(editingRecord.tipoDocumento);
      setObm(editingRecord.obm || '10º GBM - ANGRA DOS REIS');
      
      const rawEntrada =
        editingRecord.detalhesSST?.entradaSST ||
        editingRecord.dataEntrada ||
        editingRecord.dataExpedicao ||
        '';
      const parsedEntradaISO = rawEntrada ? adicionarDiasAData(rawEntrada, 0).dataISO : '';
      const entradaISO = /^\d{4}-\d{2}-\d{2}$/.test(parsedEntradaISO)
        ? parsedEntradaISO
        : getTodayISO();
      setDataExpedicao(entradaISO);

      const rawValidade = editingRecord.dataTramite || editingRecord.dataValidade || '';
      const parsedValidadeISO = rawValidade ? adicionarDiasAData(rawValidade, 0).dataISO : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(parsedValidadeISO)) {
        setDataValidade(parsedValidadeISO);
      } else {
        const prazo = adicionarDiasAData(entradaISO, getDiasPrazoPorTipo(tipo));
        setDataValidade(prazo.dataISO);
      }
      
      setLogradouro(editingRecord.endereco?.logradouro || '');
      setNumeroEndereco(editingRecord.endereco?.numero || '');
      setComplemento(editingRecord.endereco?.complemento || '');
      setBairro(editingRecord.endereco?.bairro || '');
      setMunicipio(editingRecord.endereco?.municipio || 'Angra dos Reis');
      setCep(editingRecord.endereco?.cep || '');
      setPontoReferencia(editingRecord.endereco?.pontoReferencia || '');

      setProprietarioTipoVinculo(editingRecord.proprietario?.tipoVinculo || 'Proprietário / Responsável Legal');
      setProprietarioNome(propNomeEdit);
      setProprietarioDoc(propDocEdit);
      setProprietarioTelefone(editingRecord.proprietario?.telefone || '');
      setProprietarioEmail(editingRecord.proprietario?.email || '');
      setSindicoNome(editingRecord.proprietario?.sindicoNome || '');
      setSindicoCpf(editingRecord.proprietario?.sindicoCpf || '');
      setSindicoTelefone(editingRecord.proprietario?.sindicoTelefone || '');

      const isSameAsRequerente =
        Boolean(reqNomeEdit.trim()) &&
        propNomeEdit.trim().toUpperCase() === reqNomeEdit.trim().toUpperCase() &&
        reqDocEdit.trim().toUpperCase() === propDocEdit.trim().toUpperCase();
      setRepetirRequerente(isSameAsRequerente);

      setFiscalResponsavel(editingRecord.fiscalResponsavel || '');
      setMatriculaFiscal(editingRecord.matriculaFiscal || '');
      setProcessoAdministrativo(editingRecord.processoAdministrativo || '');

      setExigencias(editingRecord.exigencias || []);
      setObservacoes(editingRecord.observacoes || '');
      setJustificativaAlteracao('');
    } else {
      // New record - limpo e pronto para preenchimento, SEM inventar dados
      const hojeISO = getTodayISO();
      const anoAtual = hojeISO.slice(0, 4);
      setNumero(nextNumber);
      setProcesso('');
      setIs4BlocksMode(true);
      setBlocoPrefixo('E27');
      setBlocoNumero('');
      setBlocoCodigo(getCodigoPorTipo('CERTIFICADO DE APROVAÇÃO'));
      setBlocoAno(anoAtual);
      setCodigoDocumento('');
      setEdificacao('');
      setRequerente('');
      setRequerenteCpfCnpj('');
      setTipoProcesso('CERTIFICADO DE APROVAÇÃO');
      setOrigem('10º GBM - ANGRA DOS REIS');
      setLocalizacao('PROTOCOLO');
      setDocGerado('');
      setDataAoDiretor('');
      setDataPronto('');
      setOutrosBilhetes('');
      setProcessoAntigo('');
      setNumDocAntigo('');
      setProcessoSeguinte('');
      setStatus('Notificação');
      setTipoDocumento('Notificação');
      setObm('10º GBM - ANGRA DOS REIS');
      setDataExpedicao(hojeISO);
      
      const prazoInicial = adicionarDiasAData(hojeISO, getDiasPrazoPorTipo('CERTIFICADO DE APROVAÇÃO'));
      setDataValidade(prazoInicial.dataISO);
      
      setLogradouro('');
      setNumeroEndereco('');
      setComplemento('');
      setBairro('');
      setMunicipio('Angra dos Reis');
      setCep('');
      setPontoReferencia('');

      setRepetirRequerente(false);
      setProprietarioTipoVinculo('Proprietário / Responsável Legal');
      setProprietarioNome('');
      setProprietarioDoc('');
      setProprietarioTelefone('');
      setProprietarioEmail('');
      setSindicoNome('');
      setSindicoCpf('');
      setSindicoTelefone('');

      setFiscalResponsavel('');
      setMatriculaFiscal('');
      setProcessoAdministrativo('');

      setExigencias([]);
      setObservacoes('');
      setJustificativaAlteracao('');
    }
    setErrors({});
  }, [editingRecord, nextNumber, isOpen]);

  if (!isOpen) return null;

  const handleAddExigencia = () => {
    if (!novaExigencia.trim()) return;
    setExigencias((prev) => [...prev, novaExigencia.trim()]);
    setNovaExigencia('');
  };

  const handleRemoveExigencia = (index: number) => {
    setExigencias((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!edificacao.trim()) {
      newErrors.edificacao = 'O nome do requerente / edificação é obrigatório.';
    }
    if (!dataExpedicao) {
      newErrors.dataExpedicao = 'A data de entrada na SST é obrigatória.';
    }
    if (!obm) {
      newErrors.obm = 'Selecione a Unidade / OBM responsável.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanProcesso = is4BlocksMode
      ? composeFromBlocks(blocoPrefixo, blocoNumero, blocoCodigo, blocoAno)
      : processo.trim().toUpperCase();
    const parsedE27 = parseProcessoE27(cleanProcesso);
    const formattedProcesso = parsedE27?.formattedE27
      ? parsedE27.formattedE27
      : cleanProcesso
      ? (/^\d+$/.test(cleanProcesso) ? cleanProcesso.padStart(5, '0') : cleanProcesso)
      : '';
    const extractedNum = is4BlocksMode
      ? (parseInt(blocoNumero.replace(/[^\d]/g, ''), 10) || numero)
      : (extractProcessoNumero(formattedProcesso) || numero);
    const finalCodigoSST = is4BlocksMode
      ? blocoCodigo.replace(/[^\d]/g, '')
      : (parsedE27?.codigo || editingRecord?.detalhesSST?.codigo || '');
    const finalProcAdm =
      processoAdministrativo.trim() ||
      (parsedE27?.formattedE27 ? parsedE27.formattedE27 : undefined);

    const updatedRecord: BuildingNotification = {
      id: editingRecord ? editingRecord.id : `notif-${Date.now()}`,
      numero: extractedNum,
      processo: formattedProcesso,
      codigoDocumento: codigoDocumento || (formattedProcesso ? `Processo ${formattedProcesso}` : 'S/N'),
      edificacao: (requerente.trim() || edificacao.trim()),
      requerente: (requerente.trim() || edificacao.trim()),
      requerenteCpfCnpj: requerenteCpfCnpj.trim(),
      tipoProcesso: tipoProcesso.trim() || 'Processo de Regularização',
      origem: origem.trim() || obm,
      status,
      tipoDocumento,
      obm,
      dataExpedicao,
      dataEntrada: dataExpedicao,
      dataValidade: dataValidade ? dataValidade : null,
      dataTramite: dataValidade ? dataValidade : null,
      oculto: editingRecord ? editingRecord.oculto : false,
      endereco: {
        logradouro: logradouro.trim(),
        numero: numeroEndereco.trim() || '',
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim(),
        municipio: municipio.trim(),
        cep: cep.trim() || undefined,
        pontoReferencia: pontoReferencia.trim() || undefined,
      },
      proprietario: {
        nomeOuRazaoSocial: repetirRequerente
          ? (requerente.trim() || edificacao.trim())
          : proprietarioNome.trim(),
        cpfOuCnpj: repetirRequerente
          ? requerenteCpfCnpj.trim()
          : proprietarioDoc.trim(),
        telefone: proprietarioTelefone.trim(),
        email: proprietarioEmail.trim(),
        tipoVinculo: proprietarioTipoVinculo.trim() || undefined,
        sindicoNome: sindicoNome.trim() || undefined,
        sindicoCpf: sindicoCpf.trim() || undefined,
        sindicoTelefone: sindicoTelefone.trim() || undefined,
      },
      fiscalResponsavel: fiscalResponsavel.trim(),
      matriculaFiscal: matriculaFiscal.trim(),
      processoAdministrativo: finalProcAdm,
      exigencias,
      observacoes: observacoes.trim(),
      historico: editingRecord
        ? [
            {
              id: `log-${Date.now()}`,
              data: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
              autor: fiscalResponsavel.trim() || 'Operador do Sistema',
              acao: 'Alteração de Processo',
              detalhes: justificativaAlteracao.trim()
                ? `Edição de ${formattedProcesso ? `processo ${formattedProcesso}` : 'processo (S/N)'}: ${justificativaAlteracao}. Status atual: ${status}.`
                : `Dados do ${formattedProcesso ? `processo ${formattedProcesso}` : 'processo (S/N)'} atualizados. Novo status: ${status}.`,
            },
            ...(editingRecord.historico || []),
          ]
        : [
            {
              id: `log-${Date.now()}`,
              data: `${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
              autor: fiscalResponsavel.trim() || 'Operador do Sistema',
              acao: 'Abertura de Processo',
              detalhes: `${formattedProcesso ? `Processo ${formattedProcesso}` : 'Processo (S/N)'} autuado. Requerente: ${requerente || edificacao}. Status: ${status}.`,
            },
          ],
      criadoEm: editingRecord ? editingRecord.criadoEm : new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      anoExercicio: /^\d{4}/.test(dataExpedicao)
        ? dataExpedicao.slice(0, 4)
        : editingRecord?.anoExercicio,
      ownerUid: editingRecord?.ownerUid,
      detalhesSST: {
        ...(editingRecord?.detalhesSST || {}),
        codigo: finalCodigoSST,
        entradaSST: formatDateBR(dataExpedicao),
        localizacao: localizacao.trim(),
        docGerado: docGerado.trim() || editingRecord?.detalhesSST?.docGerado || '',
        dataAoDiretor: dataAoDiretor.trim() || editingRecord?.detalhesSST?.dataAoDiretor || '',
        aoDiretor: dataAoDiretor.trim() || editingRecord?.detalhesSST?.aoDiretor || '',
        dataPronto: dataPronto.trim(),
        outrosBilhetes: outrosBilhetes.trim() || editingRecord?.detalhesSST?.outrosBilhetes || '',
        processoAntigo: cleanProcessLinkValue(processoAntigo),
        numDocAntigo: cleanProcessLinkValue(numDocAntigo).toUpperCase(),
        processoSeguinte: cleanProcessLinkValue(processoSeguinte),
      },
    };

    onSave(updatedRecord, isEditing);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {isEditing 
                  ? (processo.trim() ? `Editar Processo nº ${processo.trim()}` : 'Editar Processo (S/N)') 
                  : 'Autuar Novo Processo / Requerente'}
              </h2>
              <p className="text-xs text-slate-300">
                {isEditing
                  ? `Atualizando informações de ${requerente || edificacao}`
                  : 'Preencha os dados do processo e do requerente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Identificação Básica */}
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Building className="w-4 h-4 text-red-600" />
              <span>1. Identificação do Processo e Requerente</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-5">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Número do Processo <span className="text-slate-400 font-normal text-[11px]">(opcional)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleCadastroLineMode}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-blue-800 bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded transition-colors cursor-pointer"
                      title={
                        is4BlocksMode
                          ? 'Alternar para linha única de cadastro (campo livre)'
                          : 'Separar em 4 blocos: E27 / Processo / Código / Ano'
                      }
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>{is4BlocksMode ? 'Alterar linha (Campo único)' : 'Alterar linha (4 blocos)'}</span>
                    </button>

                    {(is4BlocksMode ? blocoNumero : processo) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProcesso('');
                          setBlocoNumero('');
                          setBlocoCodigo('');
                        }}
                        className="text-[11px] text-red-600 hover:text-red-700 hover:underline cursor-pointer font-medium"
                        title="Zerar campo do processo"
                      >
                        Zerar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const sug = String(nextNumber).padStart(5, '0');
                          setProcesso(sug);
                          setBlocoNumero(sug);
                        }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
                        title="Preencher com sugestão sequencial"
                      >
                        Sugerir ({String(nextNumber).padStart(5, '0')})
                      </button>
                    )}
                  </div>
                </div>

                {is4BlocksMode ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-red-600 focus-within:border-red-600 transition-colors">
                      <input
                        ref={blocoPrefixoRef}
                        type="text"
                        maxLength={6}
                        value={blocoPrefixo}
                        aria-label="Órgão / Prefixo do Processo"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw.includes('/')) {
                            const [head, ...rest] = raw.split('/');
                            if (rest.some((r) => r.trim().length > 0)) {
                              applyValueToBlocks(raw, blocoCodigo, blocoAno, true);
                              return;
                            }
                            setBlocoPrefixo(head.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                            blocoNumeroRef.current?.focus();
                            return;
                          }
                          setBlocoPrefixo(raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (text.includes('/')) {
                            e.preventDefault();
                            applyValueToBlocks(text, blocoCodigo, blocoAno, true);
                          }
                        }}
                        placeholder="E27"
                        className="w-12 px-1.5 py-1 text-center text-xs sm:text-sm bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 focus:outline-none focus:border-red-500"
                      />
                      <span className="text-slate-400 font-mono font-bold select-none">/</span>
                      <input
                        ref={blocoNumeroRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={32}
                        value={blocoNumero}
                        aria-label="Número do Processo"
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw.includes('/')) {
                            const cleanParts = raw.split('/').map((s) => s.trim()).filter(Boolean);
                            if (cleanParts.length >= 3) {
                              applyValueToBlocks(raw, blocoCodigo, blocoAno, true);
                              return;
                            }
                            setBlocoNumero(cleanParts[0]?.replace(/[^\d]/g, '').slice(0, 7) || '');
                            blocoCodigoRef.current?.focus();
                            return;
                          }
                          setBlocoNumero(raw.replace(/[^\d]/g, '').slice(0, 7));
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (text.includes('/')) {
                            e.preventDefault();
                            applyValueToBlocks(text, blocoCodigo, blocoAno, true);
                          }
                        }}
                        placeholder="73510"
                        className="min-w-0 flex-1 px-2 py-1 text-center text-xs sm:text-sm bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                      />
                      <span className="text-slate-400 font-mono font-bold select-none">/</span>
                      <input
                        ref={blocoCodigoRef}
                        type="text"
                        inputMode="numeric"
                        list="sst-codigos-sugeridos"
                        maxLength={6}
                        value={blocoCodigo}
                        aria-label="Código SST"
                        onChange={(e) => handleBlocoCodigoChange(e.target.value)}
                        placeholder="11075"
                        title="Código vinculado ao Tipo de Processo (ex: 11075 = Autorização de Evento)"
                        className="w-[68px] px-1.5 py-1 text-center text-xs sm:text-sm bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                      />
                      <span className="text-slate-400 font-mono font-bold select-none">/</span>
                      <input
                        ref={blocoAnoRef}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={blocoAno}
                        aria-label="Ano do Processo"
                        onChange={(e) => setBlocoAno(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                        placeholder="2026"
                        className="w-[54px] px-1.5 py-1 text-center text-xs sm:text-sm bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <datalist id="sst-codigos-sugeridos">
                      {CODIGOS_PROCESSO_LIST.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          {item.codigo} - {item.titulo}{item.observacao ? ` (${item.observacao})` : ''}
                        </option>
                      ))}
                    </datalist>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                      <span>Órgão / Nº Processo / Cód. / Ano</span>
                      {blocoNumero.trim() && (
                        <span className="font-mono font-semibold text-blue-800">
                          {composeFromBlocks(blocoPrefixo, blocoNumero, blocoCodigo, blocoAno)}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const infoCod = getDescricaoCodigoSST(blocoCodigo);
                      if (!infoCod) return null;
                      return (
                        <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 leading-snug">
                          <span className="font-mono font-bold text-slate-800">{infoCod.codigo}</span>: {infoCod.titulo}
                          {infoCod.observacao && (
                            <span className="text-slate-500"> ({infoCod.observacao})</span>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      maxLength={32}
                      value={processo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 32);
                        setProcesso(val);
                      }}
                      onBlur={() => {
                        if (processo.trim()) {
                          const parsed = parseProcessoE27(processo);
                          if (parsed?.formattedE27) {
                            setProcesso(parsed.formattedE27);
                            if (parsed.codigo) {
                              setBlocoCodigo(parsed.codigo);
                              syncTipoByCodigo(parsed.codigo);
                            }
                          } else if (/^\d+$/.test(processo.trim())) {
                            setProcesso(processo.trim().padStart(5, '0'));
                          }
                        }
                      }}
                      placeholder="Ex: 73510 ou E27/73510/11075/2026"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-900 font-mono font-bold placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Digite apenas o número (ex: <code className="font-mono">73510</code>) e clique em <strong>Alterar linha (4 blocos)</strong> se quiser separar.
                    </p>
                  </div>
                )}
              </div>

              <div className="sm:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requerente (Nome / Razão Social) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={edificacao}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEdificacao(val);
                        setRequerente(val);
                        if (repetirRequerente) {
                          setProprietarioNome(val);
                        }
                      }}
                      placeholder="Ex: CONDOMÍNIO ITAGUAÍ SHOPPING CENTER"
                      className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-900 uppercase font-medium ${
                        errors.edificacao ? 'border-red-500' : 'border-slate-300'
                      }`}
                    />
                    {errors.edificacao && (
                      <p className="text-xs text-red-600 mt-1">{errors.edificacao}</p>
                    )}
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CNPJ / CPF do Requerente
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={requerenteCpfCnpj}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRequerenteCpfCnpj(val);
                        if (repetirRequerente) {
                          setProprietarioDoc(val);
                        }
                      }}
                      onBlur={() => {
                        const trimmed = requerenteCpfCnpj.trim();
                        if (trimmed) {
                          const formatted = formatCpfCnpj(trimmed);
                          if (formatted && formatted !== '-') {
                            setRequerenteCpfCnpj(formatted);
                            if (repetirRequerente) {
                              setProprietarioDoc(formatted);
                            }
                          }
                        }
                      }}
                      placeholder="00.000.000/0000-00"
                      className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600/20 text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Processo (TIPO) <span className="text-red-600">*</span>
                </label>
                <select
                  value={tipoProcesso}
                  onChange={(e) => handleTipoProcessoChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 font-semibold cursor-pointer"
                >
                  {TIPOS_PROCESSO_LIST.map((item) => (
                    <option key={item} value={item}>
                      {item} ({PRAZOS_POR_TIPO[item]} dias)
                    </option>
                  ))}
                  {!TIPOS_PROCESSO_LIST.includes(tipoProcesso as any) && (
                    <option value={tipoProcesso}>{tipoProcesso}</option>
                  )}
                </select>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] mt-1">
                  <span className="text-blue-700 font-medium">
                    Prazo legal: <strong>{getDiasPrazoPorTipo(tipoProcesso)} dias</strong>
                  </span>
                  {getCodigoPorTipo(tipoProcesso, dataExpedicao) && (
                    <span className="text-slate-600 font-mono">
                      Cód. E27: <strong className="text-slate-900">{getCodigoPorTipo(tipoProcesso, dataExpedicao)}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Origem do Processo (ORIGEM)
                </label>
                <input
                  type="text"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  placeholder="Ex: 10º GBM - ANGRA DOS REIS, Protocolo Digital..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unidade / OBM <span className="text-red-600">*</span>
                </label>
                <select
                  value={obm}
                  onChange={(e) => setObm(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-800 font-medium cursor-pointer"
                >
                  {OBM_LIST.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Seção 2: Status, Prazos e Trâmite SST */}
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>2. Datas, Prazos e Trâmite da SST</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data de Entrada na SST <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dataExpedicao}
                  onChange={(e) => handleDataEntradaChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 font-mono font-bold"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Marco inicial para contagem do prazo</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prazo Limite Legal <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-blue-50/60 border border-blue-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-blue-950 font-mono font-bold"
                  required
                />
                <p className="text-[11px] text-blue-700 font-medium mt-1">
                  {formatDateBR(dataExpedicao)} + {getDiasPrazoPorTipo(tipoProcesso)}d = {formatDateBR(dataValidade)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DOC. GERADO
                </label>
                <input
                  type="text"
                  value={docGerado}
                  onChange={(e) => setDocGerado(e.target.value.toUpperCase())}
                  placeholder="Ex: DI-1029, LE-112, CAA-345"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-900 font-mono font-bold uppercase"
                />
                <p className="text-[11px] text-slate-500 mt-1">Documento emitido na SST</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do DOC. GERADO / Ao Diretor
                </label>
                <input
                  type="text"
                  value={dataAoDiretor}
                  onChange={(e) => setDataAoDiretor(e.target.value)}
                  placeholder="Ex: 13/01/2026 ou 13/01"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-900 font-mono font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">Data que figura abaixo do DOC. GERADO</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data do Pronto (Fim da contagem)
                </label>
                <input
                  type="text"
                  value={dataPronto}
                  onChange={(e) => setDataPronto(e.target.value)}
                  placeholder="Ex: 13/01/2026 ou 13/01"
                  className="w-full px-3 py-2 text-xs bg-emerald-50/60 border border-emerald-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 text-emerald-950 font-mono font-semibold"
                />
                <p className="text-[11px] text-emerald-700 font-medium mt-1">Interrompe a contagem dos dias</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Atual (Situação) <span className="text-red-600">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusType)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-800 font-bold cursor-pointer"
                >
                  {STATUS_LIST.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  OUTROS BILHETES / Parecer
                </label>
                <input
                  type="text"
                  value={outrosBilhetes}
                  onChange={(e) => setOutrosBilhetes(e.target.value.toUpperCase())}
                  placeholder="Ex: GERADO DI, FINALIZADO, RETORNO..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-900 font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">Figura abaixo do Status na tabela</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Localização do Processo <span className="text-red-600">*</span>
                </label>
                <select
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-slate-800 font-bold cursor-pointer"
                >
                  {localizacao && !LOCALIZACAO_LIST.includes(localizacao) && (
                    <option value={localizacao}>{localizacao}</option>
                  )}
                  {LOCALIZACAO_LIST.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Informações da Regra Oficial de Prazo */}
            <div className="mt-3 p-2.5 rounded-lg bg-blue-50/80 border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Regra de Prazo:</strong> Tipo <strong>{tipoProcesso}</strong> ({getDiasPrazoPorTipo(tipoProcesso)} dias) · Entrada na SST: <strong>{formatDateBR(dataExpedicao)}</strong> → Prazo Limite: <strong>{formatDateBR(dataValidade)}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const dias = getDiasPrazoPorTipo(tipoProcesso);
                  const calc = adicionarDiasAData(dataExpedicao, dias);
                  if (calc.dataISO) setDataValidade(calc.dataISO);
                }}
                className="text-[11px] font-semibold text-blue-800 hover:text-blue-950 underline cursor-pointer shrink-0"
              >
                Recalcular Automaticamente
              </button>
            </div>

            {/* Vínculos de Continuidade (Processo Anterior / Processo Seguinte) */}
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Vínculos de Continuidade entre Processos</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Conecta processos indeferidos/anteriores ao novo processo na plataforma
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Processo Anterior (PROCESSO ANTIGO)
                  </label>
                  <input
                    type="text"
                    value={processoAntigo}
                    onChange={(e) => setProcessoAntigo(e.target.value.toUpperCase())}
                    placeholder="Ex: 0075/26"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº do Doc. Anterior
                  </label>
                  <input
                    type="text"
                    value={numDocAntigo}
                    onChange={(e) => setNumDocAntigo(e.target.value.toUpperCase())}
                    placeholder="Ex: DI-1029, LE-112"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 font-mono font-semibold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Próximo Processo (PROCESSO SEGUINTE)
                  </label>
                  <input
                    type="text"
                    value={processoSeguinte}
                    onChange={(e) => setProcessoSeguinte(e.target.value.toUpperCase())}
                    placeholder="Ex: 2394"
                    className="w-full px-3 py-1.5 text-xs bg-blue-50/50 border border-blue-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-blue-950 font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 3: Proprietário / Responsável Legal e Síndico */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                <span>3. Proprietário e Responsável Legal <span className="text-slate-400 font-normal lowercase">(opcional)</span></span>
              </div>

              <label className="inline-flex items-center gap-2 text-[11px] font-semibold normal-case tracking-normal text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-md cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={repetirRequerente}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRepetirRequerente(checked);
                    if (checked) {
                      setProprietarioNome(requerente || edificacao);
                      setProprietarioDoc(requerenteCpfCnpj);
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-purple-300 text-purple-700 focus:ring-purple-500 cursor-pointer"
                />
                <span>Mesmo do Requerente (repetir Nome e CNPJ/CPF)</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Qualificação / Vínculo
                </label>
                <select
                  value={proprietarioTipoVinculo}
                  onChange={(e) => setProprietarioTipoVinculo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 text-slate-800 font-medium cursor-pointer"
                >
                  <option value="Proprietário / Responsável Legal">Proprietário / Resp. Legal</option>
                  <option value="Proprietário">Proprietário</option>
                  <option value="Responsável Legal">Responsável Legal</option>
                  <option value="Síndico">Síndico</option>
                  <option value="Administrador / Procurador">Administrador / Procurador</option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome / Razão Social
                </label>
                <input
                  type="text"
                  value={proprietarioNome}
                  onChange={(e) => {
                    setProprietarioNome(e.target.value);
                    if (repetirRequerente) setRepetirRequerente(false);
                  }}
                  placeholder="Nome do Proprietário, Resp. Legal ou Síndico"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNPJ ou CPF
                </label>
                <input
                  type="text"
                  maxLength={32}
                  value={proprietarioDoc}
                  onChange={(e) => {
                    setProprietarioDoc(e.target.value);
                    if (repetirRequerente) setRepetirRequerente(false);
                  }}
                  onBlur={() => {
                    const trimmed = proprietarioDoc.trim();
                    if (trimmed) {
                      const formatted = formatCpfCnpj(trimmed);
                      if (formatted && formatted !== '-') {
                        setProprietarioDoc(formatted);
                      }
                    }
                  }}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={proprietarioTelefone}
                  onChange={(e) => setProprietarioTelefone(e.target.value)}
                  placeholder="(24) 3365-0000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-purple-50/40 border border-purple-200/70">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 mb-2">
                Síndico / Contato Complementar <span className="text-slate-500 font-normal lowercase">(opcional — útil quando o requerente é condomínio ou empresa)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome do Síndico / Representante
                  </label>
                  <input
                    type="text"
                    value={sindicoNome}
                    onChange={(e) => setSindicoNome(e.target.value)}
                    placeholder="Nome completo do Síndico ou Responsável"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 uppercase"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF do Síndico
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={sindicoCpf}
                    onChange={(e) => setSindicoCpf(e.target.value)}
                    onBlur={() => {
                      const trimmed = sindicoCpf.trim();
                      if (trimmed) {
                        const formatted = formatCpfCnpj(trimmed);
                        if (formatted && formatted !== '-') {
                          setSindicoCpf(formatted);
                        }
                      }
                    }}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone Síndico
                  </label>
                  <input
                    type="text"
                    value={sindicoTelefone}
                    onChange={(e) => setSindicoTelefone(e.target.value)}
                    placeholder="(24) 99999-0000"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={proprietarioEmail}
                    onChange={(e) => setProprietarioEmail(e.target.value)}
                    placeholder="contato@email.com"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 4: Endereço & Localização (Opcional) */}
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>4. Endereço e Localização <span className="text-slate-400 font-normal lowercase">(opcional)</span></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logradouro <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  placeholder="Ex: Rua Cel. Carvalho ou Rodovia Rio-Santos"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={numeroEndereco}
                  onChange={(e) => setNumeroEndereco(e.target.value)}
                  placeholder="Ex: 150 ou s/n"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complemento
                </label>
                <input
                  type="text"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Ex: Loja 1, Bloco A"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bairro <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Centro, Bracuí, Portogalo"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Município
                </label>
                <input
                  type="text"
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  placeholder="Angra dos Reis ou Itaguaí"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  placeholder="23900-000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ponto de Referência
                </label>
                <input
                  type="text"
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  placeholder="Próximo à Praça ou Cais"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Seção 5: Fiscalização & Processo Administrativo (Opcional) */}
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <ShieldCheck className="w-4 h-4 text-red-600" />
              <span>5. Fiscalização e Processo Administrativo CBMERJ <span className="text-slate-400 font-normal lowercase">(opcional)</span></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fiscal Responsável / Vistoriante
                </label>
                <input
                  type="text"
                  value={fiscalResponsavel}
                  onChange={(e) => setFiscalResponsavel(e.target.value)}
                  placeholder="Nome do fiscal (deixe em branco ou preencha)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">Livre para preenchimento ou vazio</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Matrícula do Fiscal
                </label>
                <input
                  type="text"
                  value={matriculaFiscal}
                  onChange={(e) => setMatriculaFiscal(e.target.value)}
                  placeholder="Ex: 142.339-1 (opcional)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Processo Administrativo CBMERJ
                </label>
                <input
                  type="text"
                  value={processoAdministrativo}
                  onChange={(e) => setProcessoAdministrativo(e.target.value)}
                  placeholder="Ex: E-27/010/2026-00075"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Seção 6: Exigências e Observações Técnicas */}
          <div>
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>6. Exigências de Segurança Contra Incêndio & Observações</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Itens Notificados / Exigências Técnicas
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novaExigencia}
                    onChange={(e) => setNovaExigencia(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExigencia();
                      }
                    }}
                    placeholder="Adicionar exigência (ex: recarga de extintores, sinalização de rota de fuga...)"
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddExigencia}
                    className="px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {exigencias.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {exigencias.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs"
                      >
                        <span className="text-slate-800 font-medium">
                          {idx + 1}. {item}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExigencia(idx)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Gerais / Parecer Técnico
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações complementares registradas pelos fiscais vistoriantes..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-600 text-slate-800"
                />
              </div>

              {isEditing && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Motivo da Alteração / Justificativa para o Histórico
                  </label>
                  <input
                    type="text"
                    value={justificativaAlteracao}
                    onChange={(e) => setJustificativaAlteracao(e.target.value)}
                    placeholder="Ex: Prorrogação de prazo deferida pelo Comando / Re-vistoria realizada / Defesa acolhida"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-800"
                  />
                  <p className="text-[11px] text-blue-700 mt-1">
                    Esta anotação será gravada automaticamente no log cronológico de histórico do registro.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 active:bg-red-900 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Registro'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
