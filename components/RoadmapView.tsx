
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { Task, TaskStatus, Activity } from '../types';
import { motion } from 'framer-motion';
import {
    Calendar,
    Circle,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    MessageSquare,
    PlusCircle,
    Activity as ActivityIcon,
    ArrowRight,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

interface RoadmapViewProps {
    tasks: Task[];
    activities: Activity[];
    onSelectTask: (taskId: string) => void;
}

interface TimelineEvent {
    id: string;
    type: 'activity' | 'creation';
    timestamp: Date;
    action: string;
    details: any;
    user: string;
    issueId?: string;
}

const RoadmapView: React.FC<RoadmapViewProps> = ({ tasks, activities, onSelectTask }) => {
    // Merge tasks and activities into a single stream of events
    const allEvents: TimelineEvent[] = [];

    // 1. Add activities
    activities.forEach(act => {
        allEvents.push({
            id: act.id,
            type: 'activity',
            timestamp: new Date(act.timestamp),
            action: act.action,
            details: act.details,
            user: act.user,
            issueId: act.issueId
        });
    });

    // 2. Add task creations if not already covered by activities
    tasks.forEach(task => {
        const hasActivity = activities.find(a => a.issueId === task.id && a.action === 'issue_created');
        if (!hasActivity) {
            allEvents.push({
                id: `creation-${task.id}`,
                type: 'creation',
                timestamp: new Date(task.createdAt),
                action: 'issue_created',
                details: { title: task.title },
                user: 'System',
                issueId: task.id
            });
        }
    });

    // Helper to get Monday of the week
    const getMonday = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    // Group events by week
    const eventGroups: Record<number, TimelineEvent[]> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    allEvents.forEach(event => {
        const monday = getMonday(event.timestamp);
        const time = monday.getTime();
        if (!eventGroups[time]) eventGroups[time] = [];
        eventGroups[time].push(event);

        if (!minDate || monday < minDate) minDate = monday;
        if (!maxDate || monday > maxDate) maxDate = monday;
    });

    // Generate weekly sections
    const weekSections: { monday: Date; events: TimelineEvent[] }[] = [];

    if (minDate && maxDate) {
        const current = new Date(minDate);
        while (current <= maxDate) {
            const time = current.getTime();
            weekSections.push({
                monday: new Date(current),
                events: (eventGroups[time] || []).sort((a, b) =>
                    a.timestamp.getTime() - b.timestamp.getTime()
                )
            });
            current.setDate(current.getDate() + 7);
        }
        // Future buffer
        weekSections.push({ monday: new Date(current), events: [] });
    } else {
        const monday = getMonday(new Date());
        weekSections.push({ monday, events: [] });
    }

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'issue_created': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
            case 'status_updated': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'commented': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'project_created': return <Calendar className="w-4 h-4 text-indigo-500" />;
            default: return <ActivityIcon className="w-4 h-4 text-slate-400" />;
        }
    };

    const getActivityLabel = (action: string) => {
        switch (action) {
            case 'issue_created': return 'Inauguración';
            case 'status_updated': return 'Transición';
            case 'commented': return 'Discusión';
            case 'project_created': return 'Génesis del Proyecto';
            default: return 'Registro';
        }
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollAmount = 400;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const currentScroll = scrollContainerRef.current.scrollLeft;
            const targetScroll = direction === 'left'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [weekSections]);

    let globalIndex = 0;

    return (
        <div className="relative bg-slate-50/30 rounded-[3rem] p-8 mt-4 overflow-hidden">
            {/* Legend Header (Fixed at top) */}
            <div className="flex flex-col md:flex-row gap-6 px-10 mb-8 border-b border-slate-100 pb-6 justify-between items-start md:items-center">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <ActivityIcon className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Leyenda de Trazabilidad</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold ml-7 uppercase tracking-tight">Guía de eventos y estados del proyecto</p>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4">
                    <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse"></div>
                        <div className="flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Inauguración</span>
                            <span className="text-[9px] font-extrabold text-slate-500 lowercase opacity-80">(creación)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-lg shadow-amber-200"></div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-600" />
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Transición</span>
                            <span className="text-[9px] font-extrabold text-slate-500 lowercase opacity-80">(estado)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-lg shadow-blue-200"></div>
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Discusión</span>
                            <span className="text-[9px] font-extrabold text-slate-500 lowercase opacity-80">(feedback)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Génesis</span>
                            <span className="text-[9px] font-extrabold text-slate-500 lowercase opacity-80">(inicio)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="relative h-[800px] overflow-x-auto w-full pb-10"
            >
                {/* Fixed Timeline Line (The "Pivot") */}
                <div className="absolute top-[350px] left-0 right-0 h-0.5 bg-slate-100 z-10"></div>

                <div className="flex relative z-20 px-10 pr-[400px]">
                    {weekSections.map((section, idx) => (
                        <div key={idx} className="flex">
                            {/* Week Label */}
                            <div className="flex flex-col items-center min-w-[100px] relative">
                                <div className="absolute top-[350px] -translate-y-1/2 w-px h-[600px] bg-slate-100/50"></div>

                                <div className="absolute top-[280px] flex flex-col items-center">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-3">
                                        {section.monday.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}
                                    </span>
                                    <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm z-30">
                                        <span className="text-sm font-black text-slate-700">{section.monday.getDate()}</span>
                                    </div>
                                </div>

                                {section.events.length === 0 && (
                                    <div className="absolute top-[350px] -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200 z-30"></div>
                                )}
                            </div>

                            {/* Event Cards */}
                            <div className="flex gap-1 items-start mt-[350px] relative">
                                {section.events.map((event) => {
                                    const isEven = globalIndex % 2 === 0;
                                    globalIndex++;

                                    return (
                                        <div key={event.id} className="relative w-48 h-0 flex items-center justify-center group">
                                            {/* Vertical Connector Line to Card */}
                                            <div className={`absolute left-1/2 -translate-x-1/2 w-px bg-slate-100 group-hover:bg-indigo-200 transition-colors z-0 ${isEven ? 'bottom-0 h-[100px]' : 'top-0 h-[100px]'
                                                }`}></div>

                                            {/* Intersection Dot on the Timeline */}
                                            <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-4 border-white shadow-md z-40 transition-transform hover:scale-150 ${event.action === 'issue_created' ? 'bg-emerald-500' :
                                                event.action === 'status_updated' ? 'bg-amber-500' :
                                                    event.action === 'commented' ? 'bg-blue-500' : 'bg-indigo-500'
                                                }`}></div>

                                            {/* Card */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, x: '-50%' }}
                                                animate={{ opacity: 1, scale: 1, x: '-50%' }}
                                                onClick={() => event.issueId && onSelectTask(event.issueId)}
                                                className={`absolute w-72 p-6 bg-white border border-slate-200 rounded-[3rem] shadow-sm hover:shadow-xl transition-all cursor-pointer z-[100] left-1/2 ${isEven ? 'bottom-[100px]' : 'top-[100px]'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-9 h-9 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                                                            {getActivityIcon(event.action)}
                                                        </div>
                                                        <div>
                                                            <span className="text-[10px] font-black uppercase text-indigo-500 block">
                                                                {getActivityLabel(event.action)}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-slate-300">
                                                                {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.user}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <h4 className="text-slate-900 font-extrabold text-base mb-2 leading-tight">
                                                    {event.details?.title ? (
                                                        <span className="group-hover:text-indigo-600 transition-colors">
                                                            <span className="text-slate-300 mr-2 font-mono text-[10px]">#{event.issueId?.slice(0, 4)}</span>
                                                            {event.details.title}
                                                        </span>
                                                    ) : (
                                                        event.details?.name || 'Evento de Proyecto'
                                                    )}
                                                </h4>

                                                <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-2">
                                                    {event.action === 'status_updated' ?
                                                        `El estado evolucionó de "${event.details?.old_status || '?'}" a "${event.details?.new_status || '?'}"` :
                                                        event.action === 'commented' ?
                                                            `Feedback: "${event.details?.comment_body || '...'}"` :
                                                            event.action === 'issue_created' ?
                                                                'Se ha registrado el nacimiento de este hito.' :
                                                                'Hito maestro de la trazabilidad.'}
                                                </p>

                                                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3" />
                                                        {event.timestamp.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                                    </div>
                                                    <ArrowRight className="w-3.5 h-3.5 text-slate-100 group-hover:text-indigo-200 transition-colors" />
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}

                                {section.events.length === 0 && <div className="w-16"></div>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Floating Navigation Controls */}
            <div className="absolute bottom-12 right-12 flex gap-3 z-[200]">
                <button
                    onClick={() => scroll('left')}
                    className="w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-slate-800 hover:scale-110 active:scale-95 transition-all border border-slate-700/50 group"
                    title="Desplazar a la izquierda"
                >
                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all border border-indigo-500/50 group"
                    title="Desplazar a la derecha"
                >
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </div>
    );
};

export default RoadmapView;
