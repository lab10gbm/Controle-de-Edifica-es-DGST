import React from 'react';
import { BuildingNotification } from '../types';
import { formatDateBR, formatProcesso } from '../utils/helpers';
import { Printer, X, Shield, Calendar, MapPin, User, FileText } from 'lucide-react';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  singleRecord: BuildingNotification | null;
  recordsList: BuildingNotification[];
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  singleRecord,
  recordsList,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white animate-in fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-semibold">
              {singleRecord
                ? `Espelho de Notificação — Registro nº ${singleRecord.numero}`
                : `Relatório de Fiscalização de Edificações (${recordsList.length} registros)`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Documento</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 font-sans text-slate-900 bg-white print:overflow-visible print:p-4">
          {/* Official Document Header */}
          <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Shield className="w-8 h-8 text-red-800" />
            </div>
            <p className="text-xs font-semibold tracking-wider uppercase text-slate-600">
              Governo do Estado do Rio de Janeiro · Secretaria de Estado de Defesa Civil
            </p>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase">
              Corpo de Bombeiros Militar do Estado do Rio de Janeiro
            </h1>
            <p className="text-xs font-semibold text-slate-700 uppercase">
              Diretoria Geral de Serviços Técnicos · 10º GBM - Angra dos Reis / SST
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Single Record View */}
          {singleRecord ? (
            <div className="pt-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">Tipo de Ato / Documento</span>
                  <span className="text-base font-bold text-slate-900">{singleRecord.tipoDocumento}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">Número do Registro</span>
                  <span className="text-base font-mono font-bold text-slate-900">Nº {singleRecord.numero}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">Código Oficial</span>
                  <span className="text-base font-mono font-bold text-slate-900">{singleRecord.codigoDocumento}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block">Status Atual</span>
                  <span className="text-base font-bold text-red-800 uppercase">{singleRecord.status}</span>
                </div>
              </div>

              {/* Edificação e Endereço */}
              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 border-b pb-1">
                  1. Dados da Edificação Notificada
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Razão Social / Nome:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{singleRecord.edificacao}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Unidade Responsável (OBM):</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{singleRecord.obm}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500">Endereço Completo:</span>{' '}
                    <span className="text-slate-800">
                      {singleRecord.endereco.logradouro}, nº {singleRecord.endereco.numero}
                      {singleRecord.endereco.complemento ? ` (${singleRecord.endereco.complemento})` : ''},{' '}
                      {singleRecord.endereco.bairro} — {singleRecord.endereco.municipio}
                      {singleRecord.endereco.cep ? ` · CEP: ${singleRecord.endereco.cep}` : ''}
                    </span>
                  </div>
                  {singleRecord.endereco.pontoReferencia && (
                    <div className="sm:col-span-2 text-slate-600">
                      <span className="text-slate-500">Ponto de Referência:</span> {singleRecord.endereco.pontoReferencia}
                    </div>
                  )}
                </div>
              </div>

              {/* Proprietário e Responsável Legal */}
              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 border-b pb-1">
                  2. Proprietário / Responsável Notificado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Nome / Razão Social:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{singleRecord.proprietario.nomeOuRazaoSocial}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">CPF / CNPJ:</span>{' '}
                    <span className="font-mono text-slate-800 block mt-0.5">{singleRecord.proprietario.cpfOuCnpj || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contato:</span>{' '}
                    <span className="text-slate-800 block mt-0.5">{singleRecord.proprietario.telefone || '—'} {singleRecord.proprietario.email ? `· ${singleRecord.proprietario.email}` : ''}</span>
                  </div>
                </div>
              </div>

              {/* Prazos e Tramitação SST */}
              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 border-b pb-1">
                  3. Tramitação SST e Datas de Controle
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Entrada na SST:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{formatDateBR(singleRecord.detalhesSST?.entradaSST || singleRecord.dataEntrada)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Entrada na OBM:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{formatDateBR(singleRecord.detalhesSST?.entradaOBM || singleRecord.dataEntrada)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Envio Dir. Divisão:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{formatDateBR(singleRecord.detalhesSST?.envioDirDivisao || '05/01')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Situação:</span>{' '}
                    <strong className="text-red-800 block mt-0.5">{singleRecord.status || singleRecord.detalhesSST?.situacao}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">1º Bilhete (Data):</span>{' '}
                    <strong className="text-blue-900 block mt-0.5 font-mono">
                      {formatDateBR(singleRecord.detalhesSST?.dataBilhete || singleRecord.detalhesSST?.bilhetes)}
                      {singleRecord.detalhesSST?.diasBilhetes !== undefined && ` (${singleRecord.detalhesSST.diasBilhetes}d)`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Último Bilhete (Data):</span>{' '}
                    <strong className="text-indigo-900 block mt-0.5 font-mono">
                      {formatDateBR(singleRecord.detalhesSST?.ultimoBilhete)}
                      {singleRecord.detalhesSST?.diasUltimoBilhete !== undefined && ` (${singleRecord.detalhesSST.diasUltimoBilhete}d)`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Outros Bilhetes / Parecer:</span>{' '}
                    <span className="text-slate-800 block mt-0.5 font-medium">{singleRecord.detalhesSST?.outrosBilhetes || 'Nenhum'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Ao Diretor / Gráfico:</span>{' '}
                    <span className="text-slate-900 block mt-0.5">{singleRecord.detalhesSST?.aoDiretor || 'GERADO DI'} ({singleRecord.detalhesSST?.grafico || 'DI'})</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Doc. Gerado:</span>{' '}
                    <span className="font-mono text-blue-900 font-bold block mt-0.5">{singleRecord.detalhesSST?.docGerado || 'DI-1029'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Data do Pronto:</span>{' '}
                    <strong className="text-slate-900 block mt-0.5">{formatDateBR(singleRecord.detalhesSST?.dataPronto || singleRecord.dataTramite)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Data de Entrega:</span>{' '}
                    <strong className="text-emerald-800 block mt-0.5">{formatDateBR(singleRecord.detalhesSST?.dataEntregue || '15/01')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Localização:</span>{' '}
                    <span className="font-bold text-purple-900 block mt-0.5">{singleRecord.detalhesSST?.localizacao || 'PASTA INTERNET'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fiscal Responsável:</span>{' '}
                    <span className="text-slate-900 block mt-0.5 font-medium">{singleRecord.fiscalResponsavel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Matrícula CBMERJ:</span>{' '}
                    <span className="font-mono text-slate-800 block mt-0.5">{singleRecord.matriculaFiscal}</span>
                  </div>
                </div>
              </div>

              {/* Exigências */}
              <div className="border border-slate-300 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold uppercase text-slate-700 border-b pb-1">
                  4. Medidas de Segurança Contra Incêndio e Pânico Exigidas
                </h3>
                {singleRecord.exigencias.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800 pt-1">
                    {singleRecord.exigencias.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-500 italic">Sem exigências discriminadas.</p>
                )}

                {singleRecord.observacoes && (
                  <div className="mt-3 pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 font-semibold block">Observações Técnicas:</span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">{singleRecord.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Signatures Field */}
              <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-900">{singleRecord.fiscalResponsavel}</p>
                  <p className="text-[11px] text-slate-500">Fiscal Vistoriante · Matrícula {singleRecord.matriculaFiscal}</p>
                  <p className="text-[11px] text-slate-400">SST / 10º GBM</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-semibold text-slate-900">Assinatura do Responsável / Notificado</p>
                  <p className="text-[11px] text-slate-500">Ciente da Notificação e Prazo Fixado</p>
                  <p className="text-[11px] text-slate-400">Data: ____/____/2026</p>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-Record Summary Table */
            <div className="pt-6 space-y-4">
              <h2 className="text-sm font-bold uppercase text-slate-800 tracking-wider">
                Relatório Geral de Notificações e Edificações Fiscalizadas ({recordsList.length} itens)
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-20 text-center">Processo</th>
                    <th className="p-2 border-r border-slate-300">Requerente</th>
                    <th className="p-2 border-r border-slate-300 w-28">Data Entrada</th>
                    <th className="p-2 border-r border-slate-300 w-28">Status</th>
                    <th className="p-2 border-r border-slate-300 w-28">Data Trâmite</th>
                    <th className="p-2 w-36">Tipo – Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsList.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                        {formatProcesso(item.processo !== undefined ? item.processo : item.numero, { codigo: item.detalhesSST?.codigo, ano: item.anoExercicio })}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <strong className="block text-slate-900 uppercase">{item.requerente || item.edificacao}</strong>
                        <span className="text-[10px] text-slate-500 block">
                          {item.endereco.bairro} — {item.endereco.municipio}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-700">
                        {formatDateBR(item.dataEntrada || item.dataExpedicao)}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-800">
                        {item.status}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-700">
                        {formatDateBR(item.dataTramite || item.dataValidade)}
                      </td>
                      <td className="p-2 text-slate-700 text-[11px]">
                        {item.tipoProcesso || 'Processo'} – {item.origem || item.obm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-8 text-right text-xs text-slate-500">
                <p>Relatório emitido pela Seção de Segurança Contra Incêndio e Pânico - SST / 10º GBM</p>
                <p className="font-mono text-[11px]">Total de registros contidos nesta emissão: {recordsList.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
