
import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, Activity, Profile, Message, Priority } from '../types';
import { supabase } from '../services/supabase';
import {
    Send,
    Bot,
    User as UserIcon,
    Loader2,
    Sparkles,
    Zap,
    Terminal,
    Cpu,
    History,
    Trash2,
    X,
    Plus,
    Check,
    ChevronUp,
    FolderPlus,
    MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AiAssistantViewProps {
    projects: Project[];
    tasks: Task[];
    activities: Activity[];
    profile: Profile | null;
    onRefresh?: () => void;
}

const AiAssistantView: React.FC<AiAssistantViewProps> = ({ projects, tasks, activities, profile, onRefresh }) => {
    const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
        const saved = localStorage.getItem('dyd_ai_current_session');
        return saved || `web_${profile?.id}_${Date.now()}`;
    });

    useEffect(() => {
        if (currentSessionId) {
            localStorage.setItem('dyd_ai_current_session', currentSessionId);
        }
    }, [currentSessionId]);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: '¡Bienvenido al Centro de Control de IA! 🚀\n\nEstoy conectado a tu servidor MCP en DyD Labs. Puedo monitorear proyectos, crear tareas y automatizar flujos de trabajo.\n\nPrueba decirme: "Listame los proyectos activos"',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Quick Task Form State
    const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
    const [quickTaskTitle, setQuickTaskTitle] = useState('');
    const [quickTaskProjectId, setQuickTaskProjectId] = useState('');
    const [quickTaskPriority, setQuickTaskPriority] = useState<Priority>('medium');
    const [quickTaskDueDate, setQuickTaskDueDate] = useState('');

    // Quick Project Form State
    const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
    const [isQuickProjectOpen, setIsQuickProjectOpen] = useState(false);
    const [quickProjectName, setQuickProjectName] = useState('');

    // 1. Cargar historial y CONFIGURACIÓN de Supabase
    useEffect(() => {
        const fetchAll = async () => {
            if (!profile?.id) return;

            // Cargar Config
            const { data: config } = await supabase
                .from('ai_config')
                .select('*')
                .eq('user_id', profile.id)
                .maybeSingle();
            setAiConfig(config || { mode: 'deterministic' });

            // Cargar Historial para la SESIÓN ACTUAL
            const { data } = await supabase
                .from('ai_chat_history')
                .select('*')
                .eq('session_id', currentSessionId)
                .order('created_at', { ascending: true });

            if (data && data.length > 0) {
                setMessages(data.map(m => ({
                    role: m.role as any,
                    content: m.content,
                    timestamp: new Date(m.created_at)
                })));
            } else {
                // Si es sesión nueva, resetear a bienvenida
                setMessages([{
                    role: 'assistant',
                    content: 'Sesión iniciada. 🚀\n\nEl contexto está limpio. ¿Qué operación deseas realizar en el servidor?',
                    timestamp: new Date()
                }]);
            }
        };
        fetchAll();
    }, [profile?.id, currentSessionId]);

    const handleNewChat = () => {
        const newId = `web_${profile?.id}_${Date.now()}`;
        setCurrentSessionId(newId);
    };

    const handleQuickTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickTaskTitle || !quickTaskProjectId) return;

        const project = projects.find(p => p.id === quickTaskProjectId);
        if (!project) return;

        let command = `Crea la tarea "${quickTaskTitle}" en el proyecto "${project.name}"`;
        if (quickTaskPriority && quickTaskPriority !== 'medium') command += ` con prioridad ${quickTaskPriority}`;
        if (quickTaskDueDate) command += ` para el ${quickTaskDueDate}`;

        setIsQuickTaskOpen(false);
        setQuickTaskTitle('');
        setQuickTaskProjectId('');
        setQuickTaskPriority('medium');
        setQuickTaskDueDate('');

        await handleSendMessage(command);
    };

    const handleQuickProjectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickProjectName) return;

        const command = `Agrega un nuevo proyecto llamado "${quickProjectName}"`;
        setIsQuickProjectOpen(false);
        setQuickProjectName('');

        await handleSendMessage(command);
    };

    const handleSendMessage = async (textOverride?: string) => {
        const text = textOverride || inputValue.trim();
        if (!text || isTyping || !profile?.id) return;

        await supabase.from('ai_chat_history').insert([{
            user_id: profile.id,
            session_id: currentSessionId,
            role: 'user',
            content: text
        }]);

        setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
        if (!textOverride) setInputValue('');
        setIsTyping(true);

        try {
            const { data: memory } = await supabase
                .from('ai_memories')
                .select('*')
                .eq('session_id', currentSessionId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const { data: currentConfig } = await supabase
                .from('ai_config')
                .select('*')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (currentConfig?.mode === 'ai' && currentConfig?.api_key) {
                try {
                    const { data, error } = await supabase.functions.invoke('ai-brain', {
                        body: {
                            message: text,
                            session_id: currentSessionId,
                            user_id: profile.id
                        }
                    });

                    if (error) throw new Error(error.message);
                    if (!data?.response) throw new Error(data?.error || 'No hay respuesta del cerebro');

                    const aiMsg = data.response;
                    await supabase.from('ai_chat_history').insert([{
                        user_id: profile.id,
                        session_id: currentSessionId,
                        role: 'assistant',
                        content: aiMsg
                    }]);

                    setMessages(prev => [...prev, { role: 'assistant', content: aiMsg, timestamp: new Date() }]);
                    setIsTyping(false);

                    const normalizedMsg = aiMsg.toLowerCase();
                    const triggerKeywords = ['exito', 'éxito', 'creada', 'actualizada', 'confirmado', 'completada', 'eliminada', 'borrada'];
                    if (triggerKeywords.some(kw => normalizedMsg.includes(kw))) {
                        if (onRefresh) (onRefresh as any)(true);
                    }
                    return;
                } catch (err: any) {
                    console.error("Error calling AI Brain:", err);
                    const errMsg = `⚠️ El Core AI tuvo un problema: ${err.message}`;
                    setMessages(prev => [...prev, { role: 'assistant', content: errMsg, timestamp: new Date() }]);
                    setIsTyping(false);
                    return;
                }
            }

            // --- CASO B: MODO DETERMINISTICO ---
            setTimeout(async () => {
                let response = "";
                const lowerText = text.toLowerCase().trim();
                let nextAction = null;
                let nextData = null;

                if (memory?.current_action === 'awaiting_confirmation') {
                    if (['si', 'yes', 'confirmado', 'procede', 'ok'].some(k => lowerText.includes(k))) {
                        const lastCommand = memory.context_data?.command;
                        if (lastCommand === 'list_projects') {
                            const projectList = projects.map(p => `- **${p.name}** [${p.status}]`).join('\n');
                            response = `🏗️ **Infraestructura:**\n\n${projectList}`;
                        } else {
                            response = "✅ ¡Confirmado! He procesado tu solicitud.";
                        }
                        await supabase.from('ai_memories').delete().eq('session_id', currentSessionId);
                    } else {
                        response = "Operación cancelada.";
                        await supabase.from('ai_memories').delete().eq('session_id', currentSessionId);
                    }
                }
                else if (memory?.current_action === 'awaiting_assignment') {
                    const taskId = memory.context_data?.task_id;
                    const taskTitle = memory.context_data?.title;
                    const { error } = await supabase.from('issues').update({ assigned_to: [text] }).eq('id', taskId);
                    if (!error) {
                        response = `🎯 Asignado **"${text}"** a **"${taskTitle}"**.`;
                        await supabase.from('ai_memories').delete().eq('session_id', currentSessionId);
                    } else {
                        response = `❌ Error: ${error.message}`;
                    }
                }
                else if (memory?.current_action === 'awaiting_project') {
                    const lastOptions = memory.context_data?.last_options || [];
                    const ordinalMap: any = { 'primero': 0, '1': 0, 'segundo': 1, '2': 1, 'tercero': 2, '3': 2 };
                    const idx = ordinalMap[lowerText] ?? (parseInt(lowerText) - 1);
                    let selectedProject = (idx >= 0 && lastOptions[idx]) ? projects.find(p => p.name === lastOptions[idx]) : projects.find(p => p.name.toLowerCase().includes(lowerText));

                    if (selectedProject) {
                        const title = memory.context_data?.title || 'Nueva Tarea';
                        const { data: nt, error } = await supabase.from('issues').insert([{ project_id: selectedProject.id, title, status: 'todo' }]).select().single();
                        if (!error && nt) {
                            response = `✅ Tarea creada en **${selectedProject.name}**. ¿A quién se la asigno?`;
                            nextAction = 'awaiting_assignment';
                            nextData = { title, task_id: nt.id };
                        } else {
                            response = `⚠️ Error: ${error?.message}`;
                        }
                    } else {
                        response = "No encontré el proyecto. Dime el nombre exacto.";
                        nextAction = 'awaiting_project';
                        nextData = memory.context_data;
                    }
                }
                else if (memory?.current_action === 'awaiting_project_doc') {
                    const lastOptions = memory.context_data?.last_options || [];
                    const ordinalMap: any = { 'primero': 0, '1': 0, 'segundo': 1, '2': 1 };
                    const idx = ordinalMap[lowerText] ?? (parseInt(lowerText) - 1);
                    let selectedProject = (idx >= 0 && lastOptions[idx]) ? projects.find(p => p.name === lastOptions[idx]) : projects.find(p => p.name.toLowerCase().includes(lowerText));

                    if (selectedProject) {
                        const title = memory.context_data?.title || 'Nuevo Documento';
                        const docType = memory.context_data?.docType || 'draft';
                        const { data: nd, error } = await supabase.from('project_docs').insert([{ project_id: selectedProject.id, title, content: '# ' + title, type: docType }]).select().single();
                        if (!error && nd) {
                            response = `✅ Documento **"${title}"** creado en **${selectedProject.name}**.`;
                            await supabase.from('ai_memories').delete().eq('session_id', currentSessionId);
                        } else {
                            response = `⚠️ Error: ${error?.message}`;
                        }
                    } else {
                        response = "No encontré el proyecto. Dime el nombre exacto.";
                        nextAction = 'awaiting_project_doc';
                        nextData = memory.context_data;
                    }
                }
                else {
                    const isDoc = /(documento|doc|archivo|alcance|minuta|requerimiento|technical|scope|técnico)/i.test(lowerText);
                    const isTask = /(tarea|task|issue|backlog|pendiente)/i.test(lowerText);
                    const isCreation = /(crea|nuevo|new|genera|agrega|crear|añadir)/i.test(lowerText);

                    if (isCreation && isDoc) {
                        const titleMatch = text.match(/(?:documento|doc|llamado|alcance|minuta|archivo|llamada)\s+["']?([^"']+)["']?/i);
                        let title = titleMatch ? titleMatch[1].trim() : 'Documento IA';
                        let docType = 'draft';
                        if (lowerText.includes('alcance') || lowerText.includes('scope')) docType = 'scope';
                        else if (lowerText.includes('tecnico') || lowerText.includes('technical')) docType = 'technical';

                        const projectMatch = text.match(/(?:proyecto|project|en)\s+["']?([^"']+)["']?/i);
                        const targetProject = projectMatch ? projects.find(p => p.name.toLowerCase().includes(projectMatch[1].trim().toLowerCase())) : null;

                        if (targetProject) {
                            const { error } = await supabase.from('project_docs').insert([{ project_id: targetProject.id, title, content: '# ' + title, type: docType }]);
                            response = error ? `⚠️ Error: ${error.message}` : `📄 Documento **"${title}"** creado en **${targetProject.name}**.`;
                        } else {
                            const pNames = projects.map(p => p.name);
                            response = `¿En qué proyecto guardo el documento **"${title}"**?\n\n` + pNames.map((n, i) => `${i + 1}. **${n}**`).join('\n');
                            nextAction = 'awaiting_project_doc';
                            nextData = { title, docType, last_options: pNames };
                        }
                    }
                    else if (isCreation && isTask) {
                        const titleMatch = text.match(/(?:tarea|task|llamada)\s+["']?([^"']+)["']?/i);
                        let title = titleMatch ? titleMatch[1].trim() : 'Tarea IA';
                        const projectMatch = text.match(/(?:proyecto|project|en)\s+["']?([^"']+)["']?/i);
                        const targetProject = projectMatch ? projects.find(p => p.name.toLowerCase().includes(projectMatch[1].trim().toLowerCase())) : null;

                        if (targetProject) {
                            const { data: nt, error } = await supabase.from('issues').insert([{ project_id: targetProject.id, title, status: 'todo' }]).select().single();
                            if (!error && nt) {
                                response = `✅ Tarea **"${title}"** creada en **${targetProject.name}**. ¿Deseas asignársela a alguien?`;
                                nextAction = 'awaiting_assignment';
                                nextData = { title, task_id: nt.id };
                            } else {
                                response = `⚠️ Error: ${error?.message}`;
                            }
                        } else {
                            const pNames = projects.map(p => p.name);
                            response = `¿En qué proyecto creo la tarea **"${title}"**?\n\n` + pNames.map((n, i) => `${i + 1}. **${n}**`).join('\n');
                            nextAction = 'awaiting_project';
                            nextData = { title, last_options: pNames };
                        }
                    } else if (lowerText.includes('proyecto')) {
                        const list = projects.map(p => `- **${p.name}**`).join('\n');
                        response = `🏗️ **Proyectos:**\n\n${list}`;
                    } else if (lowerText.includes('tarea') || lowerText.includes('backlog')) {
                        const list = tasks.filter(t => t.status !== 'done').slice(0, 5).map(t => `- **${t.title}**`).join('\n');
                        response = `📋 **Pendientes:**\n\n${list || 'No hay tareas.'}`;
                    } else {
                        response = "Hola! Soy el asistente MCP. Puedo crear tareas y documentos. ¿En qué te ayudo?";
                    }
                }

                if (nextAction) {
                    await supabase.from('ai_memories').upsert({ user_id: profile.id, session_id: currentSessionId, current_action: nextAction, context_data: nextData, updated_at: new Date().toISOString() });
                }
                await supabase.from('ai_chat_history').insert([{ user_id: profile.id, session_id: currentSessionId, role: 'assistant', content: response }]);
                setMessages(prev => [...prev, { role: 'assistant', content: response, timestamp: new Date() }]);
                setIsTyping(false);
                if (onRefresh) (onRefresh as any)(true);
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'assistant', content: `❌ Error: ${err.message}`, timestamp: new Date() }]);
            setIsTyping(false);
        }
    };

    const handleClearHistory = async () => {
        if (!profile?.id) return;

        const { error } = await supabase
            .from('ai_chat_history')
            .delete()
            .eq('session_id', currentSessionId);

        if (!error) {
            setMessages([{
                role: 'assistant',
                content: '¡Memoria borrada! 🧠✨\n\nHe vaciado el historial de esta sesión. Podemos empezar un nuevo flujo desde cero. ¿En qué te ayudo ahora?',
                timestamp: new Date()
            }]);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 rotate-3 transition-transform hover:rotate-0">
                        {aiConfig?.mode === 'ai' ? <Sparkles className="text-white w-6 h-6" /> : <Cpu className="text-white w-6 h-6" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Core AI Assistant
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${aiConfig?.mode === 'ai'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100'
                                }`}>
                                {aiConfig?.mode === 'ai' ? `LLM: ${aiConfig.model_name}` : 'MCP DETERMINISTIC'}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">DyD Labs Intelligent Controller</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Nuevo Chat
                    </button>
                    <button
                        onClick={handleClearHistory}
                        className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Borrar memoria de esta sesión"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Bridge Active</span>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/20"
            >
                <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform hover:scale-110 ${msg.role === 'user' ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-white text-slate-400 border border-slate-100'
                                    }`}>
                                    {msg.role === 'user' ? <UserIcon className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                </div>
                                <div className={`relative px-6 py-4 rounded-[2rem] shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                    }`}>
                                    <div className={`prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-1 ${msg.role === 'user'
                                        ? 'prose-invert prose-headings:text-white prose-strong:text-white text-white'
                                        : 'prose-slate prose-headings:text-indigo-900 prose-headings:font-black prose-strong:text-indigo-600'
                                        }`}>
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                    <div className={`text-[9px] mt-3 font-bold uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-right' : 'text-left'
                                        }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start pl-14"
                    >
                        <div className="bg-white border border-slate-100 rounded-full px-6 py-3 flex items-center gap-3 shadow-md shadow-slate-100">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MCP Processing</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-white border-t border-slate-100">
                <div className="max-w-4xl mx-auto">
                    <div className="relative mb-4">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Escribe un comando para el servidor MCP..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-8 py-5 text-sm font-semibold focus:bg-white focus:border-indigo-400 outline-none pr-20 transition-all"
                        />
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={isTyping}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-indigo-200"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center relative">
                        <button
                            onClick={() => handleSendMessage('Listar proyectos activos')}
                            className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-200 transition-all uppercase tracking-widest active:scale-95"
                        >
                            <Terminal className="w-3.5 h-3.5" /> Listar Proyectos
                        </button>
                        <button
                            onClick={() => handleSendMessage('Reporte de tareas pendientes')}
                            className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 text-[10px] font-black text-slate-500 hover:bg-slate-900 hover:text-white border border-slate-200 transition-all uppercase tracking-widest active:scale-95"
                        >
                            <History className="w-3.5 h-3.5" /> Ver Backlog
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
                                className={`relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all uppercase tracking-widest active:scale-95 border ${isNewMenuOpen
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white border-slate-200'
                                    } text-[10px] font-black`}
                            >
                                <Plus className={`w-3.5 h-3.5 transition-transform ${isNewMenuOpen ? 'rotate-45' : ''}`} /> Nuevo
                                <ChevronUp className={`w-3 h-3 transition-transform ${isNewMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isNewMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: -10, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute bottom-full right-0 mb-4 w-56 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden z-[110] p-2"
                                    >
                                        <button
                                            onClick={() => {
                                                setIsNewMenuOpen(false);
                                                setIsQuickTaskOpen(true);
                                                setIsQuickProjectOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">Nueva Tarea</span>
                                                <span className="block text-[9px] text-slate-400 font-bold uppercase transition-colors">Crear Issue</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsNewMenuOpen(false);
                                                setIsQuickProjectOpen(true);
                                                setIsQuickTaskOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                                <FolderPlus className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">Nuevo Proyecto</span>
                                                <span className="block text-[9px] text-slate-400 font-bold uppercase">Base Operativa</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                setIsNewMenuOpen(false);
                                                handleSendMessage('Quiero agregar un comentario');
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-2xl transition-colors text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="block text-xs font-black text-slate-800 uppercase tracking-widest">Comentario</span>
                                                <span className="block text-[9px] text-slate-400 font-bold uppercase">Feedback Directo</span>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {isQuickTaskOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: -10, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        className="absolute bottom-full right-0 mb-4 w-80 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-[120]"
                                    >
                                        <div className="bg-indigo-600 p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <Plus className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-widest">Nueva Tarea IA</span>
                                            </div>
                                            <button
                                                onClick={() => setIsQuickTaskOpen(false)}
                                                className="text-white/60 hover:text-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleQuickTaskSubmit} className="p-6 space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título</label>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={quickTaskTitle}
                                                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                                                    placeholder="Ej: Fix login bug..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proyecto Target</label>
                                                <select
                                                    value={quickTaskProjectId}
                                                    onChange={(e) => setQuickTaskProjectId(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all cursor-pointer"
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {projects.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
                                                    <select
                                                        value={quickTaskPriority}
                                                        onChange={(e) => setQuickTaskPriority(e.target.value as Priority)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="low">Baja</option>
                                                        <option value="medium">Media</option>
                                                        <option value="high">Alta</option>
                                                        <option value="urgent">Urgente</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vencimiento</label>
                                                    <input
                                                        type="date"
                                                        value={quickTaskDueDate}
                                                        onChange={(e) => setQuickTaskDueDate(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-indigo-400 outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!quickTaskTitle || !quickTaskProjectId}
                                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Confirmar al MCP
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {isQuickProjectOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: -10, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                        className="absolute bottom-full right-0 mb-4 w-80 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden z-[120]"
                                    >
                                        <div className="bg-amber-600 p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <FolderPlus className="w-4 h-4 text-white" />
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-widest">Nuevo Proyecto IA</span>
                                            </div>
                                            <button
                                                onClick={() => setIsQuickProjectOpen(false)}
                                                className="text-white/60 hover:text-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <form onSubmit={handleQuickProjectSubmit} className="p-6 space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Proyecto</label>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={quickProjectName}
                                                    onChange={(e) => setQuickProjectName(e.target.value)}
                                                    placeholder="Ej: Sistema Logístico..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:bg-white focus:border-amber-400 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-tight">
                                                    💡 El servidor configurará los parámetros base de forma automática para el despliegue inicial.
                                                </p>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!quickProjectName}
                                                className="w-full py-4 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Inicializar en MCP
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAssistantView;
