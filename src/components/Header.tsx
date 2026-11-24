import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BellRing,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  UserCheck,
  LogOut,
  Cloud,
  CalendarRange,
} from 'lucide-react';
import { BuildingNotification } from '../types';
import { calcularPrazoProcesso, getTodayFormattedExtenso } from '../utils/helpers';

interface HeaderProps {
  notifications: BuildingNotification[];
  userEmail?: string | null;
  onSignOut?: () => void;
  selectedYear?: string;
  availableYears?: string[];
  onSelectYear?: (year: string) => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  userEmail,
  onSignOut,
  selectedYear = String(new Date().getFullYear()),
  availableYears = ['2026', '2027'],
  onSelectYear,
  isSyncing = false,
}) => {
  const [todayLabel, setTodayLabel] = useState(() => getTodayFormattedExtenso());

  useEffect(() => {
    const updateDate = () => setTodayLabel(getTodayFormattedExtenso());
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const total = notifications.length;
  const ativas = notifications.filter((n) => n.status === 'Notificação').length;
  const autos = notifications.filter((n) => n.status === 'Auto de Infração').length;
  const encerrados = notifications.filter(
    (n) => n.status === 'Encerrado' || n.status === 'ENTREGUE'
  ).length;
  const vencidos = notifications.filter(
    (n) => calcularPrazoProcesso(n).isVencido
  ).length;

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

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-300 text-[11px]">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            {todayLabel}
          </span>

          <span
            className="flex items-center gap-1.5 text-emerald-300 bg-emerald-950/60 border border-emerald-800/70 px-2 py-0.5 rounded"
            title="Sincronização ativa com Firebase Firestore + Cache Local"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isSyncing ? 'Sincronizando...' : 'Firestore Ativo'}</span>
          </span>

          <span className="flex items-center gap-1.5 font-mono text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            {userEmail || 'sst10gbm@gmail.com'}
          </span>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Encerrar sessão do Google"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Brand Title & Statistics Bar */}
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 py-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-700 text-white flex items-center justify-center shadow-md shadow-red-950/20 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-red-700 tracking-wider uppercase bg-red-50 border border-red-200/80 px-2 py-0.5 rounded">
                  Módulo de Fiscalização & Notificações
                </span>
                <span className="text-xs text-slate-600 font-medium">Versão 3.0 · Nuvem</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                Controle de Edificações e Notificações
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Seção de Segurança Contra Incêndio e Pânico · Fiscalização de Estabelecimentos e
                Prazos Legais
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

        {/* Multi-Year Exercise Switcher (Economia de Cota Spark + Preservação 2026/2027) */}
        {onSelectYear && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 mr-1">
                <CalendarRange className="w-4 h-4 text-red-700" />
                <span>Ano de Exercício:</span>
              </span>
              {availableYears.map((yr) => {
                const isActive = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => onSelectYear(yr)}
                    className={`px-3 py-1 rounded-md font-semibold border transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onSelectYear('TODOS')}
                className={`px-3 py-1 rounded-md font-semibold border transition-colors cursor-pointer ${
                  selectedYear === 'TODOS'
                    ? 'bg-red-700 text-white border-red-700 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Todos os Anos
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              {selectedYear === 'TODOS'
                ? 'Exibindo todos os exercícios arquivados e ativos.'
                : `Consultando exclusivamente o exercício ${selectedYear} (preserva histórico dos demais anos e economiza cota gratuita).`}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
