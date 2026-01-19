
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Mail, Lock, BrainCircuit, ArrowRight, ShieldCheck } from 'lucide-react';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

interface AuthProps {
    onSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const { showToast } = useVisualFeedback();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                showToast('¡Registro exitoso!', 'Por favor revisa tu email para confirmar tu cuenta.', 'success');
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Error al autenticar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#F8FAFC] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60 animate-pulse"></div>

            <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 relative z-10 animate-slide-up">

                {/* Left Side: Brand & Visual */}
                <div className="hidden lg:flex flex-col justify-between p-16 bg-slate-900 border-r border-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <BrainCircuit className="text-white w-7 h-7" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter text-white">ProjectCentral</span>
                        </div>

                        <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
                            Gestiona tus proyectos con <span className="text-indigo-400">Inteligencia Agentica.</span>
                        </h2>
                        <p className="text-slate-400 text-lg leading-relaxed max-w-md">
                            La plataforma definitiva que conecta tus repositorios, base de datos y flujos de trabajo en un solo lugar impulsado por MCP.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Seguridad de Grado Empresarial</p>
                                <p className="text-slate-500 text-xs">Protección de datos mediante Supabase Auth.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-10 lg:p-20 flex flex-col justify-center">
                    <div className="max-w-[400px] mx-auto w-full">
                        <div className="mb-10 text-center lg:text-left">
                            <h3 className="text-3xl font-black text-slate-900 mb-2">
                                {isSignUp ? 'Crear mi cuenta' : '¡Hola de nuevo!'}
                            </h3>
                            <p className="text-slate-500 font-medium">
                                {isSignUp ? 'Únete a ProjectCentral hoy mismo.' : 'Ingresa tus credenciales para continuar.'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-fadeIn">
                                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 font-medium"
                                    />
                                </div>
                            </div>

                            {!isSignUp && (
                                <div className="flex justify-end">
                                    <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                </div>
                            )}

                            <button
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>{isSignUp ? 'Registrarme' : 'Entrar ahora'}</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-10 text-center">
                            <button
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="text-slate-500 font-bold hover:text-indigo-600 transition-colors"
                            >
                                {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿Aún no tienes cuenta? Regístrate'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
