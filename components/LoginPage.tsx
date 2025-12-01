
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { AlertCircle, HelpCircle, Mail, ArrowRight, Globe, Copy, Check, Info } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    // 1. Captura a URL base (Origin) - Para evitar erro 404, usamos a raiz como callback
    const origin = window.location.origin;
    setCurrentOrigin(origin);

    // 2. Verifica erros na URL (Hash/Query) vindos do Google/GitHub
    const handleAuthReturn = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      
      let foundError = false;

      // Procura erro na hash (#error=...)
      if (hash && hash.includes('error_description')) {
        const params = new URLSearchParams(hash.substring(1));
        const errorDesc = params.get('error_description');
        if (errorDesc) {
          setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
          window.history.replaceState(null, '', window.location.pathname); // Limpa URL
          foundError = true;
        }
      }
      
      // Procura erro na query (?error=...) - comum em alguns provedores
      if (search && search.includes('error=')) {
        const params = new URLSearchParams(search);
        const errorDesc = params.get('error_description') || params.get('error');
        if (errorDesc) {
          setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
          window.history.replaceState(null, '', window.location.pathname);
          foundError = true;
        }
      }

      // Se encontrou erro, abre a ajuda automaticamente para mostrar a URL correta
      if (foundError) {
        setShowHelp(true);
      }
    };

    handleAuthReturn();
  }, []);

  // SIMPLIFICAÇÃO: Callback é a própria raiz para evitar 404
  const getCallbackUrl = () => currentOrigin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu e-mail.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: currentOrigin, 
        },
      });

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err: any) {
      console.error("Erro Magic Link:", err);
      setError(err.message || 'Erro ao enviar o link. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: getCallbackUrl(),
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
    } catch (err: any) {
      console.error("Erro no login social:", err);
      setShowHelp(true); // Abre a ajuda automaticamente no erro
      if (err.message && err.message.includes('Unsupported provider')) {
        setError(`O provedor ${provider} não está ativado (Enabled) no painel do Supabase.`);
      } else {
        setError(err.message || 'Erro de configuração. Verifique as URLs no Diagnóstico abaixo.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center animate-in zoom-in-95 duration-300">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Verifique seu E-mail!</h2>
          <p className="text-slate-600 mb-6">
            Enviamos um link mágico para <strong>{email}</strong>.<br/>
            Clique no link para entrar automaticamente.
          </p>
          <button 
            onClick={() => setMagicLinkSent(false)}
            className="text-brand-600 font-medium hover:underline"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* Header - Agora BRANCO para destacar a Logo Colorida */}
        <div className="bg-white p-8 text-center relative border-b border-slate-100">
          <div className="flex justify-center mb-2">
            <BrandLogo className="h-12 w-auto" />
          </div>
          <p className="text-slate-400 text-sm mt-2">Acesse sua conta para continuar</p>
          
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="absolute top-4 right-4 text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1 text-[10px] bg-slate-50 px-2 py-1 rounded-full border border-slate-200"
          >
            <HelpCircle size={12} /> Ajuda Config
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnóstico de Configuração */}
          {showHelp && (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-700 animate-in slide-in-from-top-2 shadow-inner">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-900 border-b pb-2">
                <Globe size={16} /> Configuração Obrigatória
              </h3>
              
              <div className="p-2 mb-3 bg-blue-50 text-blue-800 border border-blue-200 rounded text-xs">
                Para corrigir erros (400/404), copie a URL abaixo e cole em <strong>TODOS</strong> os campos de configuração no Supabase, Google e GitHub.
              </div>

              <div className="space-y-4">
                {/* Site URL / Origin */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold uppercase text-slate-500">SUA URL HOME (Copie e cole)</p>
                    {copied === 'origin' && <span className="text-[10px] text-green-600 flex items-center gap-1"><Check size={10}/> Copiado</span>}
                  </div>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white p-3 rounded border-2 border-brand-200 text-xs text-brand-800 break-all font-mono leading-tight font-bold">
                      {currentOrigin}
                    </code>
                    <button onClick={() => copyToClipboard(currentOrigin, 'origin')} className="p-2 bg-brand-50 border border-brand-200 rounded hover:bg-brand-100 text-brand-600">
                      <Copy size={16} />
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>Supabase:</strong> Site URL & Redirect URLs</p>
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> <strong>Google:</strong> Origens JS & URIs de Redirecionamento</p>
                    <p className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-800"></span> <strong>GitHub:</strong> Homepage & Callback URL</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opção 1: Magic Link */}
          <form onSubmit={handleMagicLinkLogin} className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5 ml-1">Entrar com E-mail (Link Mágico)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-brand-600 hover:bg-brand-700 text-white p-2.5 rounded-xl transition-all shadow-md shadow-brand-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={20} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">Receba um link de acesso no seu e-mail.</p>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400 uppercase font-medium tracking-wider">Ou login social</span></div>
          </div>

          {/* Opção 2: OAuth */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 text-sm group"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" />
                <path fill="#EA4335" d="M12 4.36c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <button
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-[#24292F] hover:bg-[#24292F]/90 text-white font-medium py-2.5 px-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
