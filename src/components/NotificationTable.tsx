import React, { useState } from 'react';
import { BuildingNotification } from '../types';
import { NotificationRow } from './NotificationRow';
import { ChevronsUpDown, FolderOpen, Layers, Maximize2, Minimize2 } from 'lucide-react';

interface NotificationTableProps {
  notifications: BuildingNotification[];
  onEdit: (notification: BuildingNotification) => void;
  onToggleHide: (id: string) => void;
  onAddQuickNote: (id: string, noteText: string, author: string) => void;
  onPrintSingle: (notification: BuildingNotification) => void;
  onResetFilters: () => void;
  onUpdateLocalizacao?: (id: string, newLoc: string) => void;
  onUpdateNotification?: (notification: BuildingNotification) => void;
}

export const NotificationTable: React.FC<NotificationTableProps> = ({
  notifications,
  onEdit,
  onToggleHide,
  onAddQuickNote,
  onPrintSingle,
  onResetFilters,
  onUpdateLocalizacao,
  onUpdateNotification,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandedIds.size === notifications.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const allExpanded = notifications.length > 0 && expandedIds.size === notifications.length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Table Actions Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800">
            Listagem Geral de Edificações Notificadas
          </span>
          <span className="text-slate-400">·</span>
          <span>{notifications.length} registros listados</span>
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleExpandAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded shadow-2xs transition-colors cursor-pointer"
          >
            {allExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Recolher Todos</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Expandir Todos</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th scope="col" className="py-3 px-3 text-center w-24">
                Código
              </th>
              <th scope="col" className="py-3 px-3 min-w-[240px]">
                Processo / Requerente
              </th>
              <th scope="col" className="py-3 px-3 w-40 min-w-[130px]" title="Origem dos dados: Coluna 'ENTRADA NA SST' da planilha">
                Entrada na SST
              </th>
              <th scope="col" className="py-3 px-3 w-36" title="Origem dos dados: Coluna 'SITUAÇÃO' da planilha">
                Situação (Status)
              </th>
              <th scope="col" className="py-3 px-3 w-40 min-w-[140px]" title="Prazo limite legal calculado: Entrada na SST + dias do tipo de processo">
                Prazo Limite / Trâmite
              </th>
              <th scope="col" className="py-3 px-3 w-40 min-w-[130px]" title="Origem dos dados: Coluna 'LOCALIZAÇÃO' da planilha">
                Localização
              </th>
              <th scope="col" className="py-3 px-3 text-center w-28">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <NotificationRow
                  key={notif.id}
                  notification={notif}
                  isExpanded={expandedIds.has(notif.id)}
                  onToggleExpand={handleToggleExpand}
                  onEdit={onEdit}
                  onToggleHide={onToggleHide}
                  onAddQuickNote={onAddQuickNote}
                  onPrintSingle={onPrintSingle}
                  onUpdateLocalizacao={onUpdateLocalizacao}
                  onUpdateNotification={onUpdateNotification}
                />
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Não existem notificações ou edificações correspondentes aos filtros aplicados.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Limpar Filtros e Mostrar Todos
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
