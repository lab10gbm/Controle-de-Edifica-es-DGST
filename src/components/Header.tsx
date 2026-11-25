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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BuildingNotification } from '../types';
import { FiscalizacaoRecord } from '../types/fiscalizacao';
import {
  calcularPrazoProcesso,
  getTodayFormattedExtenso,
  getTodayISO,
} from '../utils/helpers';

interface HeaderProps {
  notifications: BuildingNotification[];
  fiscalizacoes?: FiscalizacaoRecord[];
  userEmail?: string | null;
  onSignOut?: () => void;
  selectedYear?: string;
  availableYears?: string[];
  onSelectYear?: (year: string) => void;
  yearFilterLabel?: string;
  yearScopeHint?: string;
  isSyncing?: boolean;
}

function normalizeLocHeader(loc?: string): string {
  return (loc || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function isProcessConcludedHeader(n: BuildingNotification): boolean {
  const prazo = calcularPrazoProcesso(n);
  if (prazo.isConcluido) return true;
  const loc = normalizeLocHeader(n.detalhesSST?.localizacao);
  return [
    'PRONTO',
    'INTERNET',
    'PASTA INTERNET',
    'PRANCHETA',
    'ENTREGUE NET',
    'CX AUTORIZACOES',
    'CX DE AUTORIZACOES',
    'CAIXA AUTORIZACOES',
    'CAIXA DE AUTORIZACOES',
  ].includes(loc);
}

function parseFiscalizacaoValidadeISO(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean || clean === '-' || clean === '00/00/0000') return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  const m = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return '';
}

function getNotificationYearHeader(n: BuildingNotification): string {
  if (n.anoExercicio && /^\d{4}$/.test(n.anoExercicio)) return n.anoExercicio;
  const rawDate = (n.detalhesSST?.entradaSST || n.dataEntrada || n.dataExpedicao || '').trim();
  const iso = rawDate.match(/^(\d{4})-\d{2}-\d{2}/);
  if (iso) return iso[1];
  const br = rawDate.match(/^\d{1,2}\/\d{1,2}\/(\d{4})/);
  if (br) return br[1];
  return '';
}

function getFiscalizacaoYearHeader(f: FiscalizacaoRecord): string {
  if (f.anoExpedicao && /^\d{4}$/.test(f.anoExpedicao)) return f.anoExpedicao;
  const raw = (f.dataExpedicao || '').trim();
  const m = raw.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? m[1] : '';
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  fiscalizacoes = [],
  userEmail,
  onSignOut,
  selectedYear = String(new Date().getFullYear()),
  availableYears = ['2026', '2027'],
  onSelectYear,
  yearFilterLabel = 'Ano de Exercício:',
  yearScopeHint,
  isSyncing = false,
}) => {
  const [todayLabel, setTodayLabel] = useState(() => getTodayFormattedExtenso());
  const [showAllYears, setShowAllYears] = useState(false);

  useEffect(() => {
    const updateDate = () => setTodayLabel(getTodayFormattedExtenso());
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const latestThreeYears = React.useMemo(() => {
    return new Set([...availableYears].sort((a, b) => b.localeCompare(a)).slice(0, 3));
  }, [availableYears]);

  const hasMoreYears = availableYears.length > 3;

  const visibleYears = React.useMemo(() => {
    if (!hasMoreYears || showAllYears) return availableYears;
    return availableYears.filter((yr) => latestThreeYears.has(yr) || yr === selectedYear);
  }, [availableYears, hasMoreYears, showAllYears, latestThreeYears, selectedYear]);

  const hiddenYearsCount = Math.max(0, availableYears.length - visibleYears.length);

  const todayISO = getTodayISO();

  const isAllYears = selectedYear === 'TODOS' || !selectedYear;
  const scopedNotifications = React.useMemo(() => {
    if (isAllYears) return notifications;
    return notifications.filter((n) => getNotificationYearHeader(n) === selectedYear);
  }, [notifications, isAllYears, selectedYear]);

  const scopedFiscalizacoes = React.useMemo(() => {
    if (isAllYears) return fiscalizacoes;
    return fiscalizacoes.filter((f) => getFiscalizacaoYearHeader(f) === selectedYear);
  }, [fiscalizacoes, isAllYears, selectedYear]);

  // Contagens referentes ao Ano de Exercício em vigor (ou todos quando TODOS estiver selecionado)
  const totalProcessos = scopedNotifications.length;
  const totalFiscalizacoes = scopedFiscalizacoes.length;
  const total = totalProcessos + totalFiscalizacoes;

  const fiscNotificacoes = scopedFiscalizacoes.filter(
    (f) => f.status === 'Notificação'
  ).length;
  const procNotificacoes = scopedNotifications.filter(
    (n) => n.status === 'Notificação'
  ).length;
  const ativas = fiscNotificacoes + procNotificacoes;

  const fiscAutos1 = scopedFiscalizacoes.filter(
    (f) => f.status === '1º Auto de Infração'
  ).length;
  const fiscAutos2 = scopedFiscalizacoes.filter(
    (f) => f.status === '2º Auto de Infração'
  ).length;
  const procAutos = scopedNotifications.filter(
    (n) => n.status === 'Auto de Infração'
  ).length;
  const autos = fiscAutos1 + fiscAutos2 + procAutos;

  let procEncerrados = 0;
  let procVencidos = 0;
  for (const n of scopedNotifications) {
    const concluded = isProcessConcludedHeader(n);
    if (concluded) {
      procEncerrados++;
    } else if (calcularPrazoProcesso(n).isVencido) {
      procVencidos++;
    }
  }

  let fiscEncerrados = 0;
  let fiscVencidas = 0;
  let fiscInterdicoesTac = 0;
  for (const f of scopedFiscalizacoes) {
    if (f.status === 'Encerrado' || f.status === 'Cancelado') {
      fiscEncerrados++;
    } else {
      if (
        f.status === 'Auto de Interdição por Inércia' ||
        f.status === 'Auto de Interdição por Perigo iminente' ||
        f.status === 'TAC em Andamento'
      ) {
        fiscInterdicoesTac++;
      }
      const valISO = parseFiscalizacaoValidadeISO(f.dataValidade);
      if (valISO && valISO < todayISO) {
        fiscVencidas++;
      }
    }
  }

  const vencidos = procVencidos + fiscVencidas;
  const encerrados = procEncerrados + fiscEncerrados;
  const yearLabelContext = isAllYears ? 'Todos os anos' : `Exercício ${selectedYear}`;

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

          {/* Quick Stats Grid (Reativo ao Ano de Exercício em vigor) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 lg:pt-0">
            <div
              className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5"
              title={`${yearLabelContext}: ${totalProcessos} processo(s) administrativo(s) + ${totalFiscalizacoes} registro(s) de fiscalização`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs gap-2">
                <span>Total Registros</span>
                <span className="text-slate-400">#</span>
              </div>
              <div className="text-lg font-bold text-slate-800 mt-0.5 tabular-nums">{total}</div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {totalProcessos} proc. · {totalFiscalizacoes} fisc.
              </div>
            </div>

            <div
              className="bg-sky-50/60 border border-sky-100 rounded-lg p-2.5"
              title={`Notificações fiscais ativas (${yearLabelContext}): ${ativas}${fiscInterdicoesTac > 0 ? ` (+ ${fiscInterdicoesTac} interdições/TAC)` : ''}`}
            >
              <div className="flex items-center justify-between text-sky-700 text-xs gap-2">
                <span>Notificações</span>
                <BellRing className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-sky-900 mt-0.5 tabular-nums">{ativas}</div>
              <div className="text-[10px] text-sky-700/80 truncate">
                {isAllYears ? 'Ativas (todos os anos)' : `Ativas em ${selectedYear}`}
              </div>
            </div>

            <div
              className="bg-amber-50/60 border border-amber-100 rounded-lg p-2.5"
              title={`Autos de Infração (${yearLabelContext}): ${fiscAutos1} de 1º Auto + ${fiscAutos2} de 2º Auto${fiscInterdicoesTac > 0 ? ` · ${fiscInterdicoesTac} Interdições/TAC` : ''}`}
            >
              <div className="flex items-center justify-between text-amber-700 text-xs gap-2">
                <span>Autos Infração</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-amber-900 mt-0.5 tabular-nums">{autos}</div>
              <div className="text-[10px] text-amber-800/80 font-mono truncate">
                {fiscAutos1} (1º) · {fiscAutos2} (2º)
              </div>
            </div>

            <div
              className="bg-rose-50/60 border border-rose-100 rounded-lg p-2.5"
              title={`Registros em andamento fora do prazo legal (${yearLabelContext}): ${procVencidos} processo(s) + ${fiscVencidas} fiscalização(ões)`}
            >
              <div className="flex items-center justify-between text-rose-700 text-xs gap-2">
                <span>Vencidos</span>
                <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-rose-900 mt-0.5 tabular-nums">{vencidos}</div>
              <div className="text-[10px] text-rose-700/80 truncate">
                {isAllYears ? 'Em aberto vencidos' : `Vencidos em ${selectedYear}`}
              </div>
            </div>

            <div
              className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5"
              title={`Total encerrado/concluído (${yearLabelContext}): ${procEncerrados} processo(s) pronto(s)/entregue(s) + ${fiscEncerrados} fiscalização(ões) encerrada(s)/cancelada(s)`}
            >
              <div className="flex items-center justify-between text-emerald-700 text-xs gap-2">
                <span>Encerrados</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
              <div className="text-lg font-bold text-emerald-900 mt-0.5 tabular-nums">{encerrados}</div>
              <div className="text-[10px] text-emerald-800/80 font-mono truncate">
                {procEncerrados} proc. · {fiscEncerrados} fisc.
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Year Exercise Switcher (Padronizado entre Listagem de Processos e Fiscalizações) */}
        {onSelectYear && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 mr-1">
                <CalendarRange className="w-4 h-4 text-red-700" />
                <span>{yearFilterLabel}</span>
              </span>
              {visibleYears.map((yr) => {
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
              {hasMoreYears && (
                <button
                  type="button"
                  onClick={() => setShowAllYears((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title={
                    showAllYears
                      ? 'Recolher anos anteriores'
                      : `Exibir mais ${hiddenYearsCount} ano(s) anterior(es)`
                  }
                >
                  <span>{showAllYears ? 'Ver menos' : `Ver mais (${hiddenYearsCount})`}</span>
                  {showAllYears ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-500">
              {yearScopeHint ??
                (selectedYear === 'TODOS'
                  ? 'Exibindo todos os exercícios arquivados e ativos.'
                  : `Consultando exclusivamente o exercício ${selectedYear} (preserva histórico dos demais anos e economiza cota gratuita).`)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
