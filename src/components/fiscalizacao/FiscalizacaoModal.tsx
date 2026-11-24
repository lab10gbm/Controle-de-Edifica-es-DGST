import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  FileWarning,
  Calendar,
  Building2,
  MapPin,
  FileText,
  UserCheck,
  History,
} from 'lucide-react';
import {
  FISCALIZACAO_STATUS_LIST,
  FiscalizacaoAto,
  FiscalizacaoRecord,
  FiscalizacaoStatus,
} from '../../types/fiscalizacao';

interface FiscalizacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: FiscalizacaoRecord, isEditing: boolean) => Promise<void>;
  editingRecord: FiscalizacaoRecord | null;
  nextCodigo: number;
}

export const FiscalizacaoModal: React.FC<FiscalizacaoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  nextCodigo,
}) => {
  const isEditing = Boolean(editingRecord);

  const [codigo, setCodigo] = useState<number>(nextCodigo);
  const [edificacao, setEdificacao] = useState('');
  const [documentoCpfCnpj, setDocumentoCpfCnpj] = useState('');
  const [enderecoCompleto, setEnderecoCompleto] = useState('');
  const [municipio, setMunicipio] = useState('Angra dos Reis');
  const [processoVinculado, setProcessoVinculado] = useState('');
  const [status, setStatus] = useState<FiscalizacaoStatus>('Notificação');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [dataValidade, setDataValidade] = useState('');
  const [rgFiscal, setRgFiscal] = useState('');
  const [fiscalResponsavel, setFiscalResponsavel] = useState('');
  const [redacao, setRedacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [historicoAtos, setHistoricoAtos] = useState<FiscalizacaoAto[]>([]);

  // Novo ato rápido
  const [newAtoData, setNewAtoData] = useState(() =>
    new Date().toLocaleDateString('pt-BR')
  );
  const [newAtoTipo, setNewAtoTipo] = useState('Notificação');
  const [newAtoNumero, setNewAtoNumero] = useState('');
  const [newAtoOrgao, setNewAtoOrgao] = useState('DGST');
  const [newAtoObs, setNewAtoObs] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setCodigo(editingRecord.codigo);
      setEdificacao(editingRecord.edificacao);
      setDocumentoCpfCnpj(editingRecord.documentoCpfCnpj);
      setEnderecoCompleto(editingRecord.enderecoCompleto);
      setMunicipio(editingRecord.municipio || 'Angra dos Reis');
      setProcessoVinculado(editingRecord.processoVinculado);
      setStatus(editingRecord.status);
      setDataExpedicao(editingRecord.dataExpedicao);
      setDataValidade(editingRecord.dataValidade);
      setRgFiscal(editingRecord.rgFiscal);
      setFiscalResponsavel(editingRecord.fiscalResponsavel);
      setRedacao(editingRecord.redacao);
      setObservacoes(editingRecord.observacoes);
      setHistoricoAtos(editingRecord.historicoAtos || []);
    } else {
      const todayBR = new Date().toLocaleDateString('pt-BR');
      setCodigo(nextCodigo);
      setEdificacao('');
      setDocumentoCpfCnpj('');
      setEnderecoCompleto('');
      setMunicipio('Angra dos Reis');
      setProcessoVinculado('');
      setStatus('Notificação');
      setDataExpedicao(todayBR);
      setDataValidade('');
      setRgFiscal('');
      setFiscalResponsavel('');
      setRedacao('');
      setObservacoes('');
      setHistoricoAtos([]);
    }
  }, [isOpen, editingRecord, nextCodigo]);

  if (!isOpen) return null;

  const handleAddAto = () => {
    if (!newAtoTipo.trim() && !newAtoNumero.trim()) return;
    const ato: FiscalizacaoAto = {
      id: `ato-${Date.now()}`,
      data: newAtoData.trim() || new Date().toLocaleDateString('pt-BR'),
      tipoAto: newAtoTipo.trim() || 'Ato Fiscal',
      numeroAto: newAtoNumero.trim(),
      orgao: newAtoOrgao.trim() || 'DGST',
      ...(newAtoObs.trim() ? { observacao: newAtoObs.trim() } : {}),
    };
    setHistoricoAtos((prev) => [...prev, ato]);
    setNewAtoNumero('');
    setNewAtoObs('');
  };

  const handleRemoveAto = (id: string) => {
    setHistoricoAtos((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edificacao.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const nowISO = new Date().toISOString();
      const rebuiltHistTexto = historicoAtos
        .map((a) =>
          [a.data, a.tipoAto, a.numeroAto, a.orgao, a.observacao]
            .filter(Boolean)
            .join(' - ')
        )
        .join(' ');

      const lastAto = historicoAtos[historicoAtos.length - 1];
      const yearMatch =
        dataExpedicao.match(/\b(19\d{2}|20\d{2})\b/) ||
        historicoAtos.find((a) => /\b(19\d{2}|20\d{2})\b/.test(a.data))?.data.match(
          /\b(19\d{2}|20\d{2})\b/
        );

      const safeCodigo = Number.isFinite(codigo) && codigo > 0 ? codigo : nextCodigo;
      const payload: FiscalizacaoRecord = {
        id:
          editingRecord?.id ||
          `fisc-${String(safeCodigo).padStart(4, '0')}`,
        ownerUid: editingRecord?.ownerUid,
        codigo: safeCodigo,
        edificacao: edificacao.trim(),
        documentoCpfCnpj: documentoCpfCnpj.trim(),
        enderecoCompleto: enderecoCompleto.trim(),
        municipio: municipio.trim() || 'Não Informado',
        processoVinculado: processoVinculado.trim(),
        status,
        dataExpedicao: dataExpedicao.trim(),
        dataValidade: dataValidade.trim(),
        anoExpedicao: yearMatch ? yearMatch[1] : editingRecord?.anoExpedicao || '',
        rgFiscal: rgFiscal.trim(),
        fiscalResponsavel: fiscalResponsavel.trim(),
        orgaoPrincipal: lastAto?.orgao || historicoAtos[0]?.orgao || editingRecord?.orgaoPrincipal || 'DGST',
        ultimoNumeroAto: lastAto?.numeroAto || historicoAtos[0]?.numeroAto || editingRecord?.ultimoNumeroAto || '',
        historicoAtos,
        historicoTexto:
          rebuiltHistTexto || editingRecord?.historicoTexto || '',
        redacao: redacao.trim(),
        observacoes: observacoes.trim(),
        criadoEm: editingRecord?.criadoEm || nowISO,
        atualizadoEm: nowISO,
      };

      await onSave(payload, isEditing);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
              <FileWarning className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing
                  ? `Editar Notificação / Auto #${editingRecord?.codigo}`
                  : 'Nova Notificação / Auto de Fiscalização'}
              </h2>
              <p className="text-xs text-slate-300">
                Registro de Notificação, Auto de Infração, Interdição ou TAC · 10º GBM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Linha 1: Código, Status, Data Expedição, Data Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código / Número *
              </label>
              <input
                type="number"
                min={1}
                required
                value={codigo}
                onChange={(e) => setCodigo(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Situação / Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FiscalizacaoStatus)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 bg-white font-medium"
              >
                {FISCALIZACAO_STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data de Expedição
              </label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={dataExpedicao}
                onChange={(e) => setDataExpedicao(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Data Limite / Validade
              </label>
              <input
                type="text"
                placeholder="DD/MM/AAAA (opcional)"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>
          </div>

          {/* Linha 2: Edificação, CNPJ/CPF, Processo SEI */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                Edificação / Razão Social *
              </label>
              <input
                type="text"
                required
                value={edificacao}
                onChange={(e) => setEdificacao(e.target.value)}
                placeholder="Nome da edificação, condomínio ou empresa..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CPF / CNPJ
              </label>
              <input
                type="text"
                value={documentoCpfCnpj}
                onChange={(e) => setDocumentoCpfCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Processo Vinculado (SEI / E27)
              </label>
              <input
                type="text"
                value={processoVinculado}
                onChange={(e) => setProcessoVinculado(e.target.value)}
                placeholder="SEI-270107/..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>
          </div>

          {/* Linha 3: Endereço e Município */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Endereço Completo
              </label>
              <input
                type="text"
                value={enderecoCompleto}
                onChange={(e) => setEnderecoCompleto(e.target.value)}
                placeholder="Logradouro, número, complemento e bairro..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Município / Área
              </label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Angra dos Reis, Mangaratiba, Itaguaí..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Linha 4: Fiscal Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                RG do Fiscal
              </label>
              <input
                type="text"
                value={rgFiscal}
                onChange={(e) => setRgFiscal(e.target.value)}
                placeholder="Ex: 48079"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 font-mono"
              />
            </div>
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Militar / Fiscal Responsável
              </label>
              <input
                type="text"
                value={fiscalResponsavel}
                onChange={(e) => setFiscalResponsavel(e.target.value)}
                placeholder="Nome completo do vistoriante..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Linha 5: Histórico Cronológico de Atos */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-600" />
                Histórico de Atos (Notificação / Autos / Interdição)
              </h3>
              <span className="text-[11px] text-slate-500">
                {historicoAtos.length} ato(s) registrado(s)
              </span>
            </div>

            {historicoAtos.length > 0 && (
              <div className="space-y-1.5">
                {historicoAtos.map((ato, i) => (
                  <div
                    key={ato.id || i}
                    className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-semibold text-slate-700">
                        {ato.data || 'S/Data'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        {ato.tipoAto}
                      </span>
                      {ato.numeroAto && (
                        <span className="font-mono text-slate-700">
                          Nº {ato.numeroAto}
                        </span>
                      )}
                      {ato.orgao && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                          {ato.orgao}
                        </span>
                      )}
                      {ato.observacao && (
                        <span className="text-slate-600 italic">{ato.observacao}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAto(ato.id)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer"
                      title="Remover este ato"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={newAtoData}
                onChange={(e) => setNewAtoData(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              />
              <select
                value={newAtoTipo}
                onChange={(e) => setNewAtoTipo(e.target.value)}
                className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="Notificação">Notificação</option>
                <option value="1º Auto de Infração">1º Auto de Infração</option>
                <option value="2º Auto de Infração">2º Auto de Infração</option>
                <option value="Auto de Interdição">Auto de Interdição</option>
                <option value="TAC">TAC</option>
                <option value="Encerramento">Encerramento</option>
                <option value="Cancelamento">Cancelamento</option>
              </select>
              <input
                type="text"
                value={newAtoNumero}
                onChange={(e) => setNewAtoNumero(e.target.value)}
                placeholder="Nº do Documento"
                className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              />
              <input
                type="text"
                value={newAtoOrgao}
                onChange={(e) => setNewAtoOrgao(e.target.value)}
                placeholder="Órgão (DGST/DDP)"
                className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
              />
              <input
                type="text"
                value={newAtoObs}
                onChange={(e) => setNewAtoObs(e.target.value)}
                placeholder="Obs. (opcional)"
                className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleAddAto}
                className="sm:col-span-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer"
                title="Adicionar ato ao histórico"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Linha 6: Redação e Observações */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Redação / Texto da Notificação ou Despacho
              </label>
              <textarea
                rows={4}
                value={redacao}
                onChange={(e) => setRedacao(e.target.value)}
                placeholder="Descreva as exigências técnicas, irregularidades ou motivo de encerramento/cancelamento..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações Complementares (SST / 10º GBM)
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações internas de acompanhamento, prazos ou diligências..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60 rounded-lg shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Registro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
