
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Profile } from '../types';
import {
    Settings as SettingsIcon,
    Key,
    Cpu,
    Bot,
    Save,
    Zap,
    ShieldCheck,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SettingsViewProps {
    profile: Profile | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [config, setConfig] = useState({
        mode: 'deterministic',
        provider: 'openai',
        model_name: 'gpt-4o',
        api_key: ''
    });
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    const providerModels: Record<string, string[]> = {
        openai: ['gpt-5.2', 'gpt-5.1', 'o1-preview', 'o1-mini', 'gpt-4o', 'gpt-4o-mini'],
        google: ['gemini-3.0-ultra', 'gemini-2.5-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        anthropic: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
        perplexity: ['llama-3-sonar-huge-online', 'llama-3-sonar-large-128k-online', 'llama-3-sonar-small-128k-online']
    };

    useEffect(() => {
        const fetchConfig = async () => {
            if (!profile?.id) return;
            const { data } = await supabase
                .from('ai_config')
                .select('*')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (data) {
                setConfig({
                    mode: data.mode,
                    provider: data.provider,
                    model_name: data.model_name,
                    api_key: data.api_key || ''
                });
            }
            setLoading(false);
        };
        fetchConfig();
    }, [profile?.id]);

    const handleProviderChange = (newProvider: string) => {
        const defaultModel = providerModels[newProvider]?.[0] || '';
        setConfig(prev => ({
            ...prev,
            provider: newProvider,
            model_name: defaultModel
        }));
    };

    const handleModelChange = (newModel: string) => {
        setConfig(prev => ({ ...prev, model_name: newModel }));
    };

    const handleTestConnection = async () => {
        if (!config.api_key) return;
        setTestStatus('testing');

        try {
            const { data, error } = await supabase.functions.invoke('ai-brain', {
                body: {
                    message: "Hola, responde solo con la palabra OK si recibes esto.",
                    user_id: profile?.id,
                    session_id: 'test-connection-session'
                }
            });

            if (!error && data?.response) {
                setTestStatus('success');
            } else {
                console.error("Test connection error:", error || data?.error);
                setTestStatus('error');
            }
        } catch (err) {
            console.error("Test connection catch:", err);
            setTestStatus('error');
        }
        setTimeout(() => setTestStatus('idle'), 4000);
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSave = async () => {
        if (!profile?.id) return;
        setSaving(true);
        setSuccess(false);
        setErrorMsg(null);

        // Forzar upsert basado en user_id para evitar conflictos 409
        const { error } = await supabase
            .from('ai_config')
            .upsert({
                user_id: profile.id,
                mode: config.mode,
                provider: config.provider,
                model_name: config.model_name,
                api_key: config.api_key,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        setSaving(false);
        if (!error) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } else {
            console.error("Save error:", error);
            setErrorMsg(error.message);
            setTimeout(() => setErrorMsg(null), 5000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Cpu className="w-10 h-10 text-indigo-500" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-20">
            <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <SettingsIcon className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configuración del Core AI</h1>
                    <p className="text-slate-500 font-medium">Gestiona la potencia inteligente de DyD Labs</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                        <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-6 tracking-tight">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Modo de Operación
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, mode: 'deterministic' }))}
                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 text-left relative overflow-hidden group ${config.mode === 'deterministic'
                                    ? 'border-indigo-600 bg-indigo-50/30'
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${config.mode === 'deterministic' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Bot Predictivo (MCP)</h3>
                                    <p className="text-xs text-slate-500 mt-1">Lógica robusta basada en reglas directas.</p>
                                </div>
                                {config.mode === 'deterministic' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-indigo-600" /></div>}
                            </button>

                            <button
                                onClick={() => setConfig(prev => ({ ...prev, mode: 'ai' }))}
                                className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 text-left relative overflow-hidden group ${config.mode === 'ai'
                                    ? 'border-indigo-600 bg-indigo-50/30'
                                    : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${config.mode === 'ai' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">IA Inteligente (LLM)</h3>
                                    <p className="text-xs text-slate-500 mt-1">Razonamiento profundo y autónomo.</p>
                                </div>
                                {config.mode === 'ai' && <div className="absolute top-4 right-4"><CheckCircle2 className="w-5 h-5 text-indigo-600" /></div>}
                            </button>
                        </div>
                    </section>

                    {config.mode === 'ai' && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                                    <Key className="w-5 h-5 text-indigo-500" />
                                    Credenciales de la Inteligencia
                                </h2>
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testStatus === 'testing' || !config.api_key}
                                    className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${testStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                        testStatus === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                            'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    {testStatus === 'testing' ? 'Testeando...' :
                                        testStatus === 'success' ? '¡Conexión Exitosa!' :
                                            testStatus === 'error' ? 'Error de Link' : 'Testear Conexión'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor AI</label>
                                    <select
                                        value={config.provider}
                                        onChange={(e) => handleProviderChange(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="openai">OpenAI (ChatGPT)</option>
                                        <option value="google">Google (Gemini)</option>
                                        <option value="anthropic">Anthropic (Claude)</option>
                                        <option value="perplexity">Perplexity AI</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                                    <select
                                        key={config.provider}
                                        value={config.model_name}
                                        onChange={(e) => handleModelChange(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all cursor-pointer"
                                    >
                                        {providerModels[config.provider]?.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    API Key
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full lowercase font-bold">Safe Storage</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={config.api_key}
                                        onChange={(e) => setConfig(prev => ({ ...prev, api_key: e.target.value }))}
                                        placeholder="sk-..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all pr-12"
                                    />
                                    <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                </div>
                            </div>
                        </motion.section>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <Zap className="w-24 h-24 rotate-12" />
                        </div>

                        <h3 className="text-xl font-black mb-4 relative z-10 tracking-tight">Estado del Cluster</h3>
                        <div className="space-y-4 relative z-10">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Modo Actual</span>
                                <span className={`px-3 py-1 rounded-full font-black ${config.mode === 'ai' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-300'}`}>
                                    {config.mode === 'ai' ? 'IA ACTIVA' : 'MODO MCP'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold uppercase tracking-wider">Proveedor</span>
                                <span className="font-bold text-white capitalize">{config.provider}</span>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider">Modelo Activo</span>
                                    <span className="text-indigo-300 font-black">{config.model_name}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-full mt-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${success
                                ? 'bg-emerald-500 text-white'
                                : 'bg-white text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Cpu className="w-4 h-4" /></motion.div> : success ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Guardando...' : success ? '¡Listo!' : 'Guardar Cambios'}
                        </button>

                        {errorMsg && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-200 text-[10px] font-bold text-center"
                            >
                                {errorMsg}
                            </motion.div>
                        )}
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] flex gap-4">
                        <AlertCircle className="w-6 h-6 text-slate-400 shrink-0" />
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            Asegúrate de que tu API Key tenga permisos para el modelo seleccionado. Los modelos de última generación (GPT-5/Gemini 3) pueden requerir acceso anticipado.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
