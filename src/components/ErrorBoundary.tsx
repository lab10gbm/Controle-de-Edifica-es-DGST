import React from 'react';
import { AlertTriangle, RotateCw, ExternalLink } from 'lucide-react';
import { firebaseConfig } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isPermissionError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = error?.message || String(error);
    const isQuota =
      msg.includes('Quota exceeded') ||
      msg.includes('Free daily read units') ||
      msg.includes('resource-exhausted');
    const isPermission =
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied');
    return {
      hasError: true,
      errorMessage: msg,
      isQuotaError: isQuota,
      isPermissionError: isPermission,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary capturou erro:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const upgradeUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-rose-700 text-white flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h2 className="text-base font-bold">
                {this.state.isQuotaError
                  ? 'Limite Diário Gratuito do Firestore Atingido'
                  : this.state.isPermissionError
                    ? 'Erro de Permissão no Banco de Dados'
                    : 'Erro na Comunicação com o Firestore'}
              </h2>
              <p className="text-xs text-rose-100">
                CBMERJ · SST - 10º GBM (Angra dos Reis)
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4 text-sm text-slate-700">
            {this.state.isQuotaError ? (
              <div className="space-y-2">
                <p>
                  A cota gratuita diária do plano Spark do Firestore foi atingida. A cota é
                  reiniciada automaticamente no dia seguinte.
                </p>
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                >
                  <span>Verificar painel do Firestore no Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : this.state.isPermissionError ? (
              <p>
                Sua conta autenticada não possui permissão para esta operação ou as regras de
                segurança bloquearam uma consulta inválida. Verifique se está conectado com a
                conta verificada correta.
              </p>
            ) : (
              <p>
                Ocorreu uma falha inesperada ao sincronizar os dados com o banco de dados em
                nuvem.
              </p>
            )}

            <details className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <summary className="font-semibold cursor-pointer text-slate-700">
                Detalhes técnicos do diagnóstico
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[11px]">
                {this.state.errorMessage}
              </pre>
            </details>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Recarregar Plataforma</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
