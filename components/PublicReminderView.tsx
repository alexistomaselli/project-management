
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Bell, Calendar as CalendarIcon, Clock, Layers, CheckCircle2, ArrowRight, BrainCircuit, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const PublicReminderView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [reminder, setReminder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicReminder = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('reminders')
                    .select('*, projects(name), issues(title)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setReminder(data);
            } catch (err: any) {
                console.error('Error fetching public reminder:', err);
                setError('No pudimos encontrar el recordatorio o no tienes permiso para verlo.');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicReminder();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-400 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Cargando Recordatorio Público...</p>
            </div>
        );
    }

    if (error || !reminder) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-rose-100">
                    <Bell className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 mb-2">¡Oops!</h1>
                <p className="text-slate-500 max-w-sm mb-8 font-medium">{error || 'El recordatorio ya no está disponible.'}</p>
                <Link to="/reminders" className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                    Ir a mis recordatorios
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-60"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-xl w-full bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 relative z-10"
            >
                <div className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <BrainCircuit className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-black tracking-tighter text-slate-900">ProjectCentral</span>
                    </div>
                    <div className="bg-indigo-50 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        Vista Pública
                    </div>
                </div>

                <div className="flex items-center gap-6 mb-10">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl ${reminder.is_sent ? 'bg-slate-400' : 'bg-indigo-600'}`}>
                        <Bell className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                            {reminder.is_sent ? 'Recordatorio Enviado' : 'Recordatorio Programado'}
                        </h3>
                        <h1 className="text-3xl font-black text-slate-900 leading-none tracking-tight">
                            Detalle del Aviso
                        </h1>
                    </div>
                </div>

                <div className="space-y-10">
                    <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Información</label>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-4">{reminder.title}</h2>
                        {reminder.description && (
                            <p className="text-slate-600 text-lg leading-relaxed font-medium">{reminder.description}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-8 px-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Fecha Programada</label>
                            <div className="flex items-center gap-3 text-slate-800 font-bold">
                                <CalendarIcon size={20} className="text-indigo-500" />
                                <span>{format(new Date(reminder.remind_at), "d 'de' MMM", { locale: es })}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Hora del Aviso</label>
                            <div className="flex items-center gap-3 text-slate-800 font-bold">
                                <Clock size={20} className="text-indigo-500" />
                                <span>{format(new Date(reminder.remind_at), "HH:mm", { locale: es })}</span>
                            </div>
                        </div>
                    </div>

                    {(reminder.projects || reminder.issues) && (
                        <div className="p-8 bg-indigo-50/30 rounded-[2rem] border border-indigo-50 flex flex-col gap-4">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Contexto del Trabajo</label>
                            {reminder.projects && (
                                <div className="flex items-center gap-3 text-slate-700 font-bold">
                                    <Layers size={18} className="text-indigo-400" />
                                    <span>Proyecto: {reminder.projects.name}</span>
                                </div>
                            )}
                            {reminder.issues && (
                                <div className="flex items-center gap-3 text-slate-700 font-bold">
                                    <CheckCircle2 size={18} className="text-slate-400" />
                                    <span>Tarea: {reminder.issues.title}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-12 pt-10 border-t border-slate-100 text-center">
                    <p className="text-sm text-slate-400 font-medium mb-6">
                        Para ver todos tus recordatorios o gestionar proyectos:
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black shadow-2xl hover:bg-black transition-all active:scale-95 group"
                    >
                        <span>Entrar a ProjectCentral</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default PublicReminderView;
