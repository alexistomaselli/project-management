
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Reminder, Project, Task } from '../types';
import {
    Bell,
    Clock,
    CheckCircle2,
    Trash2,
    Search,
    Filter,
    Calendar as CalendarIcon,
    ArrowRight,
    Layers,
    Loader2,
    Mail,
    Smartphone,
    MessageSquare,
    ExternalLink,
    Plus,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

const RemindersView: React.FC = () => {
    const [reminders, setReminders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'sent'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newReminder, setNewReminder] = useState({
        title: '',
        description: '',
        remind_at: '',
        channels: ['email', 'push'] as ('email' | 'push' | 'whatsapp')[]
    });
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const reminderRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const { showToast } = useVisualFeedback();

    useEffect(() => {
        fetchReminders();
    }, [filter]);

    useEffect(() => {
        if (highlightId && !loading) {
            const timer = setTimeout(() => {
                const element = reminderRefs.current[highlightId];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Auto-open detail if highligted
                    const found = reminders.find(r => r.id === highlightId);
                    if (found) setSelectedReminder(found);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [highlightId, loading, reminders]);

    const fetchReminders = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('reminders')
                .select(`
                    *,
                    projects (id, name),
                    issues (id, title)
                `)
                .order('remind_at', { ascending: false });

            if (filter === 'pending') {
                query = query.eq('is_sent', false);
            } else if (filter === 'sent') {
                query = query.eq('is_sent', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setReminders(data || []);
        } catch (error) {
            console.error('Error fetching reminders:', error);
            showToast('Error', 'No se pudieron cargar los recordatorios.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateReminder = async () => {
        if (!newReminder.title || !newReminder.remind_at) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            const { error } = await supabase.from('reminders').insert([{
                user_id: user.id,
                title: newReminder.title,
                description: newReminder.description,
                remind_at: new Date(newReminder.remind_at).toISOString(),
                channels: newReminder.channels,
                is_sent: false,
                is_read: false
            }]);

            if (error) throw error;

            showToast('Creado', 'Recordatorio independiente creado con éxito.', 'success');
            setIsCreateOpen(false);
            setNewReminder({ title: '', description: '', remind_at: '', channels: ['email', 'push'] });
            fetchReminders();
        } catch (error) {
            console.error('Error creating reminder:', error);
            showToast('Error', 'No se pudo crear el recordatorio.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (!error) {
            setReminders(prev => prev.filter(r => r.id !== id));
            showToast('Eliminado', 'Recordatorio eliminado correctamente.', 'success');
        }
    };

    const filteredReminders = reminders.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <Bell className="w-6 h-6 text-white" />
                        </div>
                        Centro de Recordatorios
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Gestiona y programa alertas para tus tareas y proyectos.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Recordatorio
                    </button>

                    <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex gap-1">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'pending', label: 'Pendientes' },
                            { id: 'sent', label: 'Enviados' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setFilter(t.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === t.id
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Buscar en recordatorios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border-2 border-slate-100 rounded-[2rem] pl-14 pr-6 py-4 text-sm font-bold shadow-sm focus:border-indigo-300 outline-none transition-all"
                />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Sincronizando alertas...</p>
                </div>
            ) : filteredReminders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredReminders.map((reminder) => (
                        <div
                            key={reminder.id}
                            ref={el => { reminderRefs.current[reminder.id] = el; }}
                            onClick={() => setSelectedReminder(reminder)}
                            className={`group glass-card bg-white p-6 transition-all relative overflow-hidden cursor-pointer ${highlightId === reminder.id
                                ? 'border-indigo-500 ring-4 ring-indigo-500/10 shadow-2xl scale-[1.02] z-10'
                                : 'border-slate-100 hover:border-indigo-200 hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-indigo-100/50'
                                }`}
                        >
                            {!reminder.is_sent && (
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors" />
                            )}

                            <div className="flex items-start gap-5">
                                <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 shadow-sm ${reminder.is_sent ? 'bg-slate-50 text-slate-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                    <Bell className="w-6 h-6" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className={`font-extrabold text-lg truncate ${reminder.is_sent ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                            {reminder.title}
                                        </h3>
                                        <button
                                            onClick={() => handleDelete(reminder.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 font-medium leading-relaxed">
                                        {reminder.description || 'Sin descripción adicional.'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <CalendarIcon className="w-3.5 h-3.5" />
                                            {format(new Date(reminder.remind_at), "d 'de' MMMM, HH:mm", { locale: es })}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {reminder.channels.map((c: string) => (
                                                <div key={c} className="bg-slate-50 text-slate-400 p-1.5 rounded-lg border border-slate-100" title={c}>
                                                    {c === 'email' ? <Mail size={12} /> : c === 'push' ? <Smartphone size={12} /> : <MessageSquare size={12} />}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex-1" />

                                        {reminder.is_read ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Leído
                                            </span>
                                        ) : reminder.is_sent ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Enviado
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                                                <Clock className="w-3 h-3" />
                                                Programado
                                            </span>
                                        )}
                                    </div>

                                    {(reminder.projects || reminder.issues) && (
                                        <div className="mt-4 flex gap-2">
                                            {reminder.projects && (
                                                <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50/50 text-indigo-500 rounded-lg text-[9px] font-bold border border-indigo-100/50">
                                                    <ExternalLink size={10} />
                                                    {reminder.projects.name}
                                                </span>
                                            )}
                                            {reminder.issues && (
                                                <span className="flex items-center gap-1 px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-bold border border-slate-200">
                                                    <MessageSquare size={10} />
                                                    {reminder.issues.title}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Bell className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800">No hay recordatorios</h3>
                    <p className="text-slate-400 mt-2 font-medium">No se encontraron recordatorios que coincidan con tu búsqueda.</p>
                </div>
            )}

            {/* Create Reminder Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Recordatorio</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Standalone Alert</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Título del Recordatorio</label>
                                    <input
                                        type="text"
                                        value={newReminder.title}
                                        onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                                        placeholder="Ej: Revisar despliegue de producción"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descripción (Opcional)</label>
                                    <textarea
                                        value={newReminder.description}
                                        onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                                        placeholder="Detalles adicionales..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all min-h-[100px] resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Fecha y Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={newReminder.remind_at}
                                            onChange={(e) => setNewReminder({ ...newReminder, remind_at: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Canales</label>
                                        <div className="flex gap-2">
                                            {['email', 'push'].map((channel) => (
                                                <button
                                                    key={channel}
                                                    onClick={() => {
                                                        const current = newReminder.channels;
                                                        const updated = current.includes(channel as any)
                                                            ? current.filter(c => c !== channel)
                                                            : [...current, channel as any];
                                                        setNewReminder({ ...newReminder, channels: updated });
                                                    }}
                                                    className={`flex-1 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-wider border-2 transition-all ${newReminder.channels.includes(channel as any)
                                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-600'
                                                        : 'bg-white border-slate-100 text-slate-400'}`}
                                                >
                                                    {channel}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={handleCreateReminder}
                                    disabled={isSubmitting || !newReminder.title || !newReminder.remind_at}
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Creando...' : 'Crear Recordatorio'}
                                </button>
                                <button onClick={() => setIsCreateOpen(false)} className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all">
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Reminder Detail Modal */}
            <AnimatePresence>
                {selectedReminder && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedReminder(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${selectedReminder.is_sent ? 'bg-slate-400' : 'bg-indigo-600'}`}>
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Detalle del Recordatorio</h3>
                                        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">
                                            {selectedReminder.is_sent ? 'Enviado' : 'Programado'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReminder(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título</label>
                                    <h2 className="text-xl font-extrabold text-slate-800 mt-1">{selectedReminder.title}</h2>
                                </div>

                                {selectedReminder.description && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                                        <p className="text-slate-600 mt-1 leading-relaxed">{selectedReminder.description}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</label>
                                        <div className="flex items-center gap-2 mt-1 text-slate-700 font-bold">
                                            <CalendarIcon size={16} className="text-indigo-500" />
                                            {format(new Date(selectedReminder.remind_at), "d 'de' MMM, HH:mm", { locale: es })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canales</label>
                                        <div className="flex gap-2 mt-1">
                                            {selectedReminder.channels.map((c: string) => (
                                                <span key={c} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-slate-100">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {(selectedReminder.projects || selectedReminder.issues) && (
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vínculos</label>
                                        {selectedReminder.projects && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    <Layers size={14} className="text-indigo-400" />
                                                    {selectedReminder.projects.name}
                                                </div>
                                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                                    Ir al proyecto <ArrowRight size={10} />
                                                </button>
                                            </div>
                                        )}
                                        {selectedReminder.issues && (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                    <CheckCircle2 size={14} className="text-slate-400" />
                                                    {selectedReminder.issues.title}
                                                </div>
                                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                                                    Ver tarea <ArrowRight size={10} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => handleDelete(selectedReminder.id).then(() => setSelectedReminder(null))}
                                    className="flex-1 bg-rose-50 text-rose-600 py-4 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Eliminar
                                </button>
                                <button
                                    onClick={() => setSelectedReminder(null)}
                                    className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-xl shadow-slate-200"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>

    );
};

export default RemindersView;
