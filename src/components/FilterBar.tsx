import React from 'react';
import { 
  Search, 
  PlusCircle, 
  RotateCcw, 
  FileDown, 
  Printer, 
  Filter, 
  Eye, 
  EyeOff, 
  Calendar,
  Building,
  Activity,
  ArrowUpDown,
  UploadCloud
} from 'lucide-react';
import { FilterState, ExpirationFilter } from '../types';
import { OBM_LIST, STATUS_LIST } from '../data/initialData';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onResetFilters: () => void;
  onOpenNewRecordModal: () => void;
  onOpenImportModal: () => void;
  onOpenPrintModal: () => void;
  onExportCSV: () => void;
  hiddenCount: number;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  onResetFilters,
  onOpenNewRecordModal,
  onOpenImportModal,
  onOpenPrintModal,
  onExportCSV,
  hiddenCount,
  totalFilteredCount,
}) => {
  const handleInputChange = (field: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
      {/* Top Filter Bar Section */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-slate-50/70 to-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Global Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Processo (ex: 00075), Requerente, Tipo, Origem ou Endereço..."
              value={filters.termoBusca}
              onChange={(e) => handleInputChange('termoBusca', e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all placeholder:text-slate-400"
            />
            {filters.termoBusca && (
              <button
                type="button"
                onClick={() => handleInputChange('termoBusca', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Action Buttons: Importar CSV, Novo Registro, Listar Todos, etc */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenImportModal}
              title="Importar dados de planilha do Google Sheets (.CSV)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 active:bg-emerald-200 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-emerald-700" />
              <span>Importar CSV</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewRecordModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 active:bg-red-900 rounded-lg shadow-xs shadow-red-900/10 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>

            <button
              type="button"
              onClick={onResetFilters}
              title="Restaurar visualização original de todos os registros ativos"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Listar Todos</span>
            </button>

            <button
              type="button"
              onClick={onExportCSV}
              title="Exportar planilha CSV da lista atual"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Exportar</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrintModal}
              title="Gerar e imprimir relatório oficial"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structured Filters Controls Grid */}
      <div className="p-4 sm:p-5 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Período: Data Inicial */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Entrada Inicial
            </label>
            <input
              type="date"
              value={filters.dataInicial}
              onChange={(e) => handleInputChange('dataInicial', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800"
            />
          </div>

          {/* Período: Data Final */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Entrada Final
            </label>
            <input
              type="date"
              value={filters.dataFinal}
              onChange={(e) => handleInputChange('dataFinal', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800"
            />
          </div>

          {/* Seleção de Unidade / OBM */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              Unidade / OBM
            </label>
            <select
              value={filters.obm}
              onChange={(e) => handleInputChange('obm', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800 font-medium"
            >
              <option value="">Todas as Unidades</option>
              {OBM_LIST.map((obm) => (
                <option key={obm} value={obm}>
                  {obm}
                </option>
              ))}
            </select>
          </div>

          {/* Seleção de Status */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800 font-medium"
            >
              <option value="">Todos os Status</option>
              {STATUS_LIST.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro de Vencimento / Trâmite */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Vencimento / Trâmite
            </label>
            <select
              value={filters.vencimento}
              onChange={(e) => handleInputChange('vencimento', e.target.value as ExpirationFilter)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800 font-medium"
            >
              <option value="todos">Todos</option>
              <option value="vencidos">Vencidos (Sim)</option>
              <option value="no_prazo">No Prazo (Não)</option>
              <option value="sem_validade">Sem Prazo Fixado</option>
            </select>
          </div>

          {/* Ordenação por Data / Critério */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              Ordenar por
            </label>
            <div className="flex gap-1.5">
              <select
                value={filters.ordenacaoCampo}
                onChange={(e) => handleInputChange('ordenacaoCampo', e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600 text-slate-800"
              >
                <option value="numero">Processo (Cód.)</option>
                <option value="edificacao">Requerente</option>
                <option value="dataExpedicao">Data de Entrada</option>
                <option value="dataValidade">Data Trâmite</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  handleInputChange(
                    'ordenacaoDirecao',
                    filters.ordenacaoDirecao === 'asc' ? 'desc' : 'asc'
                  )
                }
                title={filters.ordenacaoDirecao === 'asc' ? 'Ordem Crescente (A-Z ou Mais Antigo)' : 'Ordem Decrescente (Z-A ou Mais Recente)'}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md text-slate-700 transition-colors cursor-pointer"
              >
                {filters.ordenacaoDirecao === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer of filter bar: counters and toggle hidden items */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span>
              Exibindo <strong className="text-slate-800 font-semibold">{totalFilteredCount}</strong> registro(s) correspondente(s)
            </span>
            {(filters.termoBusca || filters.dataInicial || filters.dataFinal || filters.obm || filters.status || filters.vencimento !== 'todos') && (
              <span className="text-[11px] bg-red-50 text-red-700 font-medium px-2 py-0.5 rounded border border-red-200/60">
                Filtros ativos
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleInputChange('mostrarOcultos', !filters.mostrarOcultos)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer border ${
                filters.mostrarOcultos
                  ? 'bg-amber-50 text-amber-900 border-amber-300 font-medium'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {filters.mostrarOcultos ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ocultando registros arquivados</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exibir ocultos ({hiddenCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
