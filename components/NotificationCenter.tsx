
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Reminder } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    X,
    Clock,
    CheckCircle2,
    Mail,
    Send,
    BellRing,
    Smartphone
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DbReminder {
    id: string;
    user_id: string;
    project_id?: string;
    issue_id?: string;
    title: string;
    description: string;
    remind_at: string;
    is_sent: boolean;
    is_read: boolean;
    channels: string[];
    created_at: string;
}

const NotificationCenter: React.FC = () => {
    const navigate = useNavigate();
    const [reminders, setReminders] = useState<DbReminder[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriptionLoading, setSubscriptionLoading] = useState(false);

    useEffect(() => {
        fetchReminders();
        registerServiceWorker();

        // Request notification permission on mount
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Subscribe to reminders changes
        const channel = supabase
            .channel('reminders_changes')
            .on('postgres_changes', {
                event: '*', // Listen to all changes to catch both new and processed ones
                schema: 'public',
                table: 'reminders'
            }, (payload) => {
                console.log('🔔 EVENTO REALTIME:', payload.eventType, {
                    id: payload.new?.id,
                    title: payload.new?.title,
                    is_sent: payload.new?.is_sent,
                    old_is_sent: payload.old?.is_sent
                });

                if (payload.eventType === 'INSERT') {
                    const newR = payload.new as DbReminder;
                    console.log('✅ INSERT detectado.');
                    setReminders(prev => [newR, ...prev]);
                    if (new Date(newR.remind_at) <= new Date()) {
                        setUnreadCount(prev => prev + 1);
                    }
                } else if (payload.eventType === 'UPDATE') {
                    const oldR = payload.old as DbReminder;
                    const newR = payload.new as DbReminder;

                    console.log('🔄 UPDATE detectado:', {
                        id: newR.id,
                        transition: `${oldR?.is_sent} -> ${newR.is_sent}`
                    });

                    // Si acaba de ser enviado y confirmamos que antes NO estaba enviado
                    if (newR.is_sent && oldR && oldR.is_sent === false && !newR.is_read) {

                        // Guard de seguridad: Ignorar si se creó hace menos de 10 segundos
                        const createdTime = new Date(newR.created_at).getTime();
                        const nowTime = new Date().getTime();
                        const diffInSeconds = (nowTime - createdTime) / 1000;

                        console.log('⚖️ Antigüedad del recordatorio:', diffInSeconds, 'segundos');

                        if (diffInSeconds < 10) {
                            console.warn('⚠️ Ignorando notificación Push inmediata (guard de 10s activo).');
                            return;
                        }

                        console.log('🚀 DISPARANDO NOTIFICACIÓN PUSH!');
                        setUnreadCount(prev => prev + 1);
                        setReminders(prev => {
                            const exists = prev.find(r => r.id === newR.id);
                            if (exists) {
                                return prev.map(r => r.id === newR.id ? newR : r);
                            }
                            return [newR, ...prev];
                        });

                        // Show browser notification
                        if (Notification.permission === 'granted') {
                            try {
                                const iconUrl = `${window.location.origin}/logo.png`;
                                const n = new Notification(`¡Recordatorio!: ${newR.title}`, {
                                    body: newR.description,
                                    icon: iconUrl
                                });

                                n.onclick = async (event) => {
                                    event.preventDefault();
                                    window.focus();

                                    // Navegar al recordatorio (Ruta Pública)
                                    navigate(`/r/${newR.id}`);

                                    // Marcar como leído en DB
                                    await supabase
                                        .from('reminders')
                                        .update({ is_read: true })
                                        .eq('id', newR.id);
                                };
                            } catch (err) {
                                console.error('❌ Error al mostrar notificación:', err);
                            }
                        }
                    } else {
                        setReminders(prev => prev.map(r => r.id === newR.id ? newR : r));
                    }
                }
            })
            .subscribe((status) => {
                console.log('Estado de suscripción Realtime:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const registerServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('SW registrado satisfactoriamente:', registration.scope);

                // Verificar si ya está suscrito
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (err) {
                console.error('Fallo al registrar SW:', err);
            }
        }
    };

    const subscribeToPush = async () => {
        setSubscriptionLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: 'BJGXTQ5BV8hsGQOngNJvqc3nT3epMa1XzDxqZ0g6k9aGQBd-EqFfCJnhetRpp9nBB9xea6SpVQHEeCwnsaqjIzg'
            });

            // Guardar en Supabase
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('push_subscriptions')
                    .upsert({
                        user_id: user.id,
                        subscription_json: JSON.parse(JSON.stringify(subscription)),
                        user_agent: navigator.userAgent
                    });

                if (error) throw error;
                setIsSubscribed(true);
                console.log('Suscripción Push guardada en Supabase');
            }
        } catch (err) {
            console.error('Error al suscribirse a Push:', err);
        } finally {
            setSubscriptionLoading(false);
        }
    };

    const fetchReminders = async () => {
        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .order('remind_at', { ascending: false })
            .limit(10);

        if (data) {
            setReminders(data);
            // Count unread that are already due
            setUnreadCount(data.filter(r => !r.is_read && new Date(r.remind_at) <= new Date()).length);
        }
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('reminders')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setReminders(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 z-[9998] bg-transparent"
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden z-[9999] origin-top-right"
                        >
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                        <Bell className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">Notificaciones</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Push Subscription Banner */}
                            {!isSubscribed && (
                                <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="w-5 h-5 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-indigo-200">Mobile Push</span>
                                            <span className="text-xs font-bold leading-tight">Activa avisos en tu móvil</span>
                                        </div>
                                    </div>
                                    <button
                                        disabled={subscriptionLoading}
                                        onClick={subscribeToPush}
                                        className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shadow-lg active:scale-95 disabled:opacity-50 shrink-0"
                                    >
                                        {subscriptionLoading ? '...' : 'Activar'}
                                    </button>
                                </div>
                            )}

                            <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                {reminders.length > 0 ? (
                                    <div className="divide-y divide-slate-50">
                                        {reminders.map((reminder) => (
                                            <div
                                                key={reminder.id}
                                                className={`p-6 transition-colors hover:bg-slate-50/50 relative overflow-hidden group ${!reminder.is_read && new Date(reminder.remind_at) <= new Date() ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                {!reminder.is_read && new Date(reminder.remind_at) <= new Date() && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                                )}

                                                <div className="flex items-start gap-4">
                                                    <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!reminder.is_read && new Date(reminder.remind_at) <= new Date() ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {reminder.channels.includes('email') ? <Mail className="w-3.5 h-3.5" /> :
                                                            reminder.channels.includes('push') ? <Smartphone className="w-3.5 h-3.5" /> :
                                                                <Clock className="w-3.5 h-3.5" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <h4 className="text-sm font-bold text-slate-800 truncate">{reminder.title}</h4>
                                                            <span className="text-[10px] font-medium text-slate-400 shrink-0">
                                                                {format(new Date(reminder.remind_at), 'HH:mm', { locale: es })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                                            {reminder.description}
                                                        </p>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex gap-1">
                                                                {reminder.channels.map(c => (
                                                                    <span key={c} className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                                        {c}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            {!reminder.is_read && new Date(reminder.remind_at) <= new Date() && (
                                                                <button
                                                                    onClick={() => markAsRead(reminder.id)}
                                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Leído
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                            <Bell className="w-8 h-8 text-slate-200" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-800">Todo al día</p>
                                        <p className="text-xs text-slate-400 mt-1">No tienes recordatorios pendientes</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button
                                    className="w-full py-2.5 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:bg-white hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200"
                                >
                                    Ver todo el historial
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
