
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
    AlertCircle,
    Bell,
    Mail,
    Send,
    Smartphone,
    MessageSquare,
    Globe,
    Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

interface SettingsViewProps {
    profile: Profile | null;
}

const SettingsView: React.FC<SettingsViewProps> = ({ profile }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<'ai' | 'notifications'>('ai');
    const { showToast } = useVisualFeedback();
    const [config, setConfig] = useState(() => {
        const saved = localStorage.getItem('dyd_settings_draft');
        if (saved) return JSON.parse(saved);
        return {
            mode: 'deterministic',
            provider: 'openai',
            model_name: 'gpt-4o',
            api_key: '',
            notebooklm_id: '',
            notebooklm_cookies: ''
        };
    });

    const [platformSettings, setPlatformSettings] = useState({
        notification_channels: { email: true, push: true, whatsapp: false },
        smtp_config: { host: '', port: '465', user: '', password: '', from: '' },
        api_info: { url: '', service_role_key: '' }
    });

    useEffect(() => {
        localStorage.setItem('dyd_settings_draft', JSON.stringify(config));
    }, [config]);

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
            setLoading(true);

            // Fetch AI Config
            const { data: aiData } = await supabase
                .from('ai_config')
                .select('*')
                .eq('user_id', profile.id)
                .single();

            if (aiData) {
                setConfig({
                    mode: aiData.mode,
                    provider: aiData.provider,
                    model_name: aiData.model_name,
                    api_key: aiData.api_key || '',
                    notebooklm_id: aiData.notebooklm_id || '',
                    notebooklm_cookies: aiData.notebooklm_cookies || ''
                });
            }

            // Fetch Platform Settings
            const { data: pData } = await supabase
                .from('platform_settings')
                .select('*');

            if (pData) {
                const settings: any = { ...platformSettings };
                pData.forEach(item => {
                    if (item.key === 'notification_channels') settings.notification_channels = item.value;
                    if (item.key === 'smtp_config') settings.smtp_config = item.value;
                    if (item.key === 'api_info') settings.api_info = item.value;
                });
                setPlatformSettings(settings);
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

    const handleTestSmtp = async () => {
        if (!platformSettings.smtp_config.host || !platformSettings.smtp_config.user) {
            showToast('Faltan Datos', 'Completa los campos de SMTP para probar la conexión.', 'error');
            return;
        }

        setTestStatus('testing');
        try {
            const { data, error } = await supabase.functions.invoke('process-reminders', {
                body: { test_smtp: true, config: platformSettings.smtp_config }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            setTestStatus('success');
            showToast('Conexión SMTP Exitosa', 'El servidor de correo respondió correctamente.', 'success');
        } catch (err: any) {
            console.error("Test SMTP error:", err);
            setTestStatus('error');
            showToast('Error de Conexión', err.message || 'No se pudo conectar con el servidor SMTP.', 'error');
        }
        setTimeout(() => setTestStatus('idle'), 4000);
    };

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSave = async () => {
        if (!profile?.id) return;
        setSaving(true);
        setSuccess(false);
        setErrorMsg(null);

        try {
            if (activeTab === 'ai') {
                const { error } = await supabase
                    .from('ai_config')
                    .upsert({
                        user_id: profile.id,
                        mode: config.mode,
                        provider: config.provider,
                        model_name: config.model_name,
                        api_key: config.api_key,
                        notebooklm_id: config.notebooklm_id,
                        notebooklm_cookies: config.notebooklm_cookies,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id' });
                if (error) throw error;
            } else {
                // Save Platform Settings
                const updates = [
                    { key: 'notification_channels', value: platformSettings.notification_channels },
                    { key: 'smtp_config', value: platformSettings.smtp_config },
                    { key: 'api_info', value: platformSettings.api_info }
                ];

                for (const item of updates) {
                    const { error } = await supabase
                        .from('platform_settings')
                        .upsert(item, { onConflict: 'key' });
                    if (error) throw error;
                }
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error: any) {
            console.error("Save error:", error);
            setErrorMsg(error.message);
            setTimeout(() => setErrorMsg(null), 5000);
        } finally {
            setSaving(false);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <SettingsIcon className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Configuración del Sistema</h1>
                        <p className="text-slate-500 font-medium">Gestiona DyD Labs y sus integraciones</p>
                    </div>
                </div>

                <div className="flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm self-start md:self-auto">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ai'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Bot className="w-4 h-4" />
                        IA Core
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'notifications'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Bell className="w-4 h-4" />
                        Notificaciones
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'ai' ? (
                    <motion.div
                        key="ai-tab"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
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
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all pr-12"
                                            />
                                            <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                        </div>
                                    </div>
                                </motion.section>
                            )}

                            {/* NotebookLM Configuration Section */}
                            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                                        <Bot className="w-5 h-5 text-indigo-500" />
                                        NotebookLM Connection
                                        <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full uppercase font-black">Experimental</span>
                                    </h2>
                                </div>

                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Vincula tu instancia de NotebookLM para dotar a la IA de contexto profundo sobre tus documentos. Requiere los tokens de sesión de tu navegador.
                                </p>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Notebook ID (Opcional)</label>
                                    <input
                                        type="text"
                                        value={config.notebooklm_id || ''}
                                        onChange={(e) => setConfig(prev => ({ ...prev, notebooklm_id: e.target.value }))}
                                        placeholder="ID del cuaderno principal..."
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Cookies (JSON)</label>
                                    <textarea
                                        value={config.notebooklm_cookies || ''}
                                        onChange={(e) => setConfig(prev => ({ ...prev, notebooklm_cookies: e.target.value }))}
                                        placeholder='[{"name": "SID", "value": "..."}, ...]'
                                        rows={3}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-5 py-3.5 text-[10px] font-mono focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1 italic">Vuelca aquí el export de cookies de tu navegador con acceso a notebooklm.google.com</p>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="notifications-tab"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        <div className="md:col-span-2 space-y-6">
                            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 mb-6 tracking-tight">
                                    <Globe className="w-5 h-5 text-indigo-500" />
                                    Canales de Envío
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {(['email', 'push', 'whatsapp'] as const).map(channel => (
                                        <div
                                            key={channel}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col gap-3 relative ${platformSettings.notification_channels[channel]
                                                ? 'border-indigo-600 bg-indigo-50/30'
                                                : 'border-slate-100 bg-white opacity-60'
                                                } ${channel === 'whatsapp' ? 'grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                            onClick={async () => {
                                                if (channel === 'whatsapp') return;

                                                if (channel === 'push' && !platformSettings.notification_channels.push) {
                                                    const permission = await Notification.requestPermission();
                                                    if (permission !== 'granted') {
                                                        showToast('Permiso Denegado', 'Debes permitir las notificaciones en el navegador para activar este canal.', 'error');
                                                        return;
                                                    }
                                                }

                                                setPlatformSettings(prev => ({
                                                    ...prev,
                                                    notification_channels: {
                                                        ...prev.notification_channels,
                                                        [channel]: !prev.notification_channels[channel]
                                                    }
                                                }));
                                            }}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platformSettings.notification_channels[channel] ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {channel === 'email' ? <Mail className="w-5 h-5" /> :
                                                    channel === 'push' ? <Smartphone className="w-5 h-5" /> :
                                                        <MessageSquare className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 capitalize">{channel === 'email' ? 'Correo' : channel}</h3>
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    {channel === 'whatsapp' ? 'Próximamente' : 'Activado para avisos'}
                                                </p>
                                            </div>
                                            {channel !== 'whatsapp' && (
                                                <div className="absolute top-4 right-4 h-5 w-10 bg-slate-100 rounded-full flex items-center p-1 cursor-pointer">
                                                    <div className={`h-3 w-3 rounded-full transition-all ${platformSettings.notification_channels[channel] ? 'translate-x-5 bg-indigo-600' : 'bg-slate-400'}`} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                                    <Send className="w-5 h-5 text-indigo-500" />
                                    Configuración SMTP (Email)
                                </h2>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 font-medium">Define la cuenta desde la que se enviarán los recordatorios.</p>
                                    <button
                                        onClick={handleTestSmtp}
                                        disabled={testStatus === 'testing'}
                                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${testStatus === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                            testStatus === 'error' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                                            }`}
                                    >
                                        {testStatus === 'testing' ? 'Testeando...' :
                                            testStatus === 'success' ? '¡SMTP OK!' :
                                                testStatus === 'error' ? 'Error SMTP' : 'Probar Conexión'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Servidor SMTP</label>
                                        <input
                                            type="text"
                                            value={platformSettings.smtp_config.host}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, smtp_config: { ...prev.smtp_config, host: e.target.value } }))}
                                            placeholder="smtp.gmail.com"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Puerto</label>
                                        <input
                                            type="text"
                                            value={platformSettings.smtp_config.port}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, smtp_config: { ...prev.smtp_config, port: e.target.value } }))}
                                            placeholder="465"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Remitente</label>
                                    <input
                                        type="email"
                                        value={platformSettings.smtp_config.from}
                                        onChange={(e) => setPlatformSettings(prev => ({ ...prev, smtp_config: { ...prev.smtp_config, from: e.target.value } }))}
                                        placeholder="no-reply@tuempresa.com"
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario / Email</label>
                                        <input
                                            type="text"
                                            value={platformSettings.smtp_config.user}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, smtp_config: { ...prev.smtp_config, user: e.target.value } }))}
                                            placeholder="tu-email@gmail.com"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password / App Key</label>
                                        <input
                                            type="password"
                                            value={platformSettings.smtp_config.password}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, smtp_config: { ...prev.smtp_config, password: e.target.value } }))}
                                            placeholder="••••••••••••••••"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
                                <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2 tracking-tight">
                                    <Cloud className="w-5 h-5 text-indigo-500" />
                                    Información del Proyecto (Supabase)
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">Requerido para la automatización (Cron Jobs).</p>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Project URL</label>
                                        <input
                                            type="text"
                                            value={platformSettings.api_info?.url || ''}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, api_info: { ...prev.api_info, url: e.target.value } }))}
                                            placeholder="https://xxxx.supabase.co"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Role Key</label>
                                        <input
                                            type="password"
                                            value={platformSettings.api_info?.service_role_key || ''}
                                            onChange={(e) => setPlatformSettings(prev => ({ ...prev, api_info: { ...prev.api_info, service_role_key: e.target.value } }))}
                                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ik..."
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-indigo-200 outline-none transition-all"
                                        />
                                        <p className="text-[9px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">⚠️ Usa solo el Service Role Key, no el Anon Key.</p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                    <Send className="w-24 h-24 rotate-12" />
                                </div>
                                <h3 className="text-xl font-black mb-4 relative z-10 tracking-tight">Resumen Notificaciones</h3>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-indigo-300 font-bold uppercase tracking-wider">Email</span>
                                        <span className={`px-3 py-1 rounded-full font-black ${platformSettings.notification_channels.email ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                                            {platformSettings.notification_channels.email ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-indigo-300 font-bold uppercase tracking-wider">Push (Local)</span>
                                        <span className={`px-3 py-1 rounded-full font-black ${platformSettings.notification_channels.push ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                                            {platformSettings.notification_channels.push ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`w-full mt-8 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${success
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-white text-indigo-900 hover:bg-slate-50'
                                        }`}
                                >
                                    {saving ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Cpu className="w-4 h-4" /></motion.div> : success ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Guardando...' : success ? '¡Listo!' : 'Guardar Config'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsView;
