import React from 'react';
import { ShieldCheck, BellRing, AlertTriangle, Ban, CheckCircle2, Clock, CalendarDays, UserCheck } from 'lucide-react';
import { BuildingNotification } from '../types';
import { isExpired, calcularPrazoProcesso, CURRENT_DATE_STR, formatDateBR } from '../utils/helpers';

interface HeaderProps {
  notifications: BuildingNotification[];
}

export const Header: React.FC<HeaderProps> = ({ notifications }) => {
  const total = notifications.length;
  const ativas = notifications.filter((n) => !n.oculto && n.status === 'Notificação').length;
  const autos = notifications.filter((n) => !n.oculto && n.status === 'Auto de Infração').length;
  const interdicoes = notifications.filter((n) => !n.oculto && n.status === 'Interdição').length;
  const encerrados = notifications.filter((n) => !n.oculto && (n.status === 'Encerrado' || n.status === 'ENTREGUE')).length;
  const vencidos = notifications.filter((n) => !n.oculto && calcularPrazoProcesso(n).isVencido).length;

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs">
      {/* Top Governmental Bar */}
      <div className="bg-slate-900 text-slate-100 text-xs px-4 sm:px-6 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-semibold tracking-wide uppercase text-slate-200">
            CBMERJ · Diretoria Geral de Serviços Técnicos
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300 font-mono text-[11px]">
            10º GBM - Angra dos Reis / SST
          </span>
        </div>
        <div className="flex items-center gap-4 text-slate-300 text-[11px]">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            13 de Outubro de 2026
          </span>
          <span className="flex items-center gap-1.5 font-mono text-slate-400">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            sst10gbm@gmail.com
          </span>
        </div>
      </div>

      {/* Main Brand Title & Statistics Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-700 text-white flex items-center justify-center shadow-md shadow-red-950/20 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-red-700 tracking-wider uppercase bg-red-50 border border-red-200/80 px-2 py-0.5 rounded">
                  Módulo de Fiscalização & Notificações
                </span>
                <span className="text-xs text-slate-600 font-medium">Versão 2.4</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Controle de Edificações e Notificações
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Seção de Segurança Contra Incêndio e Pânico · Fiscalização de Estabelecimentos e Prazos Legais
              </p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 lg:pt-0">
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>Total Registros</span>
                <span className="text-slate-400">#</span>
              </div>
              <div className="text-lg font-bold text-slate-800 mt-0.5">{total}</div>
            </div>

            <div className="bg-sky-50/60 border border-sky-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-sky-700 text-xs">
                <span>Notificações</span>
                <BellRing className="w-3.5 h-3.5 text-sky-500" />
              </div>
              <div className="text-lg font-bold text-sky-900 mt-0.5">{ativas}</div>
            </div>

            <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-amber-700 text-xs">
                <span>Autos Infração</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-amber-900 mt-0.5">{autos}</div>
            </div>

            <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-rose-700 text-xs">
                <span>Vencidos</span>
                <Clock className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div className="text-lg font-bold text-rose-900 mt-0.5">{vencidos}</div>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5">
              <div className="flex items-center justify-between text-emerald-700 text-xs">
                <span>Encerrados</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5">{encerrados}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
