import React, { useState } from 'react';
import { ShieldCheck, LogIn, Cloud, Lock, CalendarRange, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface AuthGateProps {
  onError?: (message: string) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'Não foi possível concluir o login com o Google.';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        msg = 'A janela de login do Google foi fechada antes da conclusão. Clique novamente para entrar.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'O navegador bloqueou a janela pop-up de login. Permita pop-ups para este site e tente novamente.';
      } else {
        console.error('Erro ao autenticar com Google:', err);
        if (err?.message) {
          msg = err.message;
        }
      }
      setErrorMsg(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-700 flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-red-300">
                CBMERJ · 10º GBM Angra dos Reis
              </span>
              <h1 className="text-lg font-bold leading-tight">
                Controle de Edificações e Notificações SST
              </h1>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900">
              Acesso Autenticado ao Banco em Nuvem (Firestore)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Entre com sua conta Google institucional ou autorizada para sincronizar os processos
              dos exercícios de <strong>2026</strong>, <strong>2027</strong> e próximos anos com
              segurança e backup automático na nuvem gratuita.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Cache Local Offline + Plano Gratuito</p>
                <p className="text-slate-500">
                  Dados armazenados no navegador e sincronizados no Firestore Spark sem desperdício de
                  cota diária de leitura.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <CalendarRange className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Separação por Ano de Exercício</p>
                <p className="text-slate-500">
                  O histórico de 2026 permanece preservado enquanto você trabalha no exercício de
                  2027.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Acesso Privado e Protegido</p>
                <p className="text-slate-500">
                  Somente o usuário autenticado com e-mail verificado acessa e altera os registros.
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-bold text-white bg-red-700 hover:bg-red-800 active:bg-red-900 disabled:opacity-60 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Conectando ao Google...' : 'Entrar com Conta Google'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
