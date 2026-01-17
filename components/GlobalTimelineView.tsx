
import React, { useRef, useLayoutEffect } from 'react';
import { Activity } from '../types';
import { motion } from 'framer-motion';
import {
    Calendar,
    ChevronRight,
    Circle,
    CheckCircle2,
    Clock,
    AlertCircle,
    User,
    MessageSquare,
    PlusCircle,
    Activity as ActivityIcon,
    ArrowRight,
    Rocket,
    RefreshCw,
    Layers,
    Layout
} from 'lucide-react';

interface GlobalTimelineViewProps {
    activities: Activity[];
}

interface TimelineEvent {
    id: string;
    timestamp: Date;
    action: string;
    details: any;
    user: string;
    projectName: string;
    projectId: string;
    issueId?: string;
}

const GlobalTimelineView: React.FC<GlobalTimelineViewProps> = ({ activities }) => {
    // Transform activities into timeline events
    const allEvents: TimelineEvent[] = activities.map(act => ({
        id: act.id,
        timestamp: new Date(act.timestamp),
        action: act.action,
        details: act.details,
        user: act.user,
        projectName: act.projectName,
        projectId: act.projectId,
        issueId: act.issueId
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Group events by day for a more granular global view
    const getStartOfDay = (date: Date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const eventGroups: Record<number, TimelineEvent[]> = {};
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    allEvents.forEach(event => {
        const day = getStartOfDay(event.timestamp);
        const time = day.getTime();
        if (!eventGroups[time]) eventGroups[time] = [];
        eventGroups[time].push(event);

        if (!minDate || day < minDate) minDate = day;
        if (!maxDate || day > maxDate) maxDate = day;
    });

    const daySections: { date: Date; events: TimelineEvent[] }[] = [];

    if (minDate && maxDate) {
        const current = new Date(maxDate);
        current.setDate(current.getDate() + 1); // Buffer future
        const start = new Date(minDate);
        start.setDate(start.getDate() - 2); // Buffer past

        let iter = new Date(start);
        while (iter <= current) {
            const time = getStartOfDay(iter).getTime();
            daySections.push({
                date: new Date(iter),
                events: (eventGroups[time] || []).sort((a, b) =>
                    a.timestamp.getTime() - b.timestamp.getTime()
                )
            });
            iter.setDate(iter.getDate() + 1);
        }
    } else {
        const today = getStartOfDay(new Date());
        daySections.push({ date: today, events: [] });
    }

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'issue_created': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
            case 'status_updated': return <RefreshCw className="w-4 h-4 text-amber-500" />;
            case 'commented': return <MessageSquare className="w-4 h-4 text-blue-500" />;
            case 'project_created': return <Rocket className="w-4 h-4 text-indigo-500" />;
            case 'task_updated': return <Layout className="w-4 h-4 text-violet-500" />;
            default: return <ActivityIcon className="w-4 h-4 text-slate-400" />;
        }
    };

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
    }, [daySections.length]);

    let globalIndex = 0;

    return (
        <div className="relative w-full overflow-hidden bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 mt-8 mb-12">
            {/* Header info */}
            <div className="bg-slate-50/50 border-b border-slate-100 p-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Timeline Global de Actividad</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Visión transversal de todos los proyectos</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">En Tiempo Real</span>
                    </div>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="relative h-[650px] overflow-x-auto overflow-y-hidden hide-scrollbar select-none p-12 bg-slate-50/20"
            >
                {/* Master Timeline Path */}
                <div className="absolute top-[300px] left-0 right-0 h-1 bg-slate-100 z-10 mx-10 rounded-full"></div>

                <div className="flex relative z-20 px-10 pr-[300px]">
                    {daySections.map((section, idx) => (
                        <div key={idx} className="flex">
                            {/* Day Node */}
                            <div className="flex flex-col items-center min-w-[120px] relative">
                                <div className="absolute top-[300px] -translate-y-1/2 w-0.5 h-[500px] bg-slate-100/50"></div>

                                <div className="absolute top-[220px] flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        {section.date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
                                    </span>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg z-30 transition-all ${section.events.length > 0 ? 'bg-indigo-600 text-white scale-110' : 'bg-white border border-slate-100 text-slate-400'
                                        }`}>
                                        <div className="flex flex-col items-center leading-none">
                                            <span className="text-xs font-black">{section.date.getDate()}</span>
                                            <span className="text-[8px] font-bold uppercase">{section.date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Burst */}
                            <div className="flex gap-6 items-start mt-[300px] relative px-4">
                                {section.events.map((event) => {
                                    const isEvenInBurst = globalIndex % 2 === 0;
                                    globalIndex++;

                                    return (
                                        <div key={event.id} className="relative w-40 h-0 flex items-center justify-center group">
                                            {/* Connector */}
                                            <div className={`absolute left-1/2 -translate-x-1/2 w-px bg-slate-200 group-hover:bg-indigo-400 transition-colors z-0 ${isEvenInBurst ? 'bottom-0 h-[100px]' : 'top-0 h-[100px]'
                                                }`}></div>

                                            {/* Glow effect on the node */}
                                            <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-500/10 blur-md group-hover:bg-indigo-500/20 z-0"></div>

                                            {/* Timeline Node */}
                                            <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-white shadow-xl z-40 transition-all group-hover:scale-125 ${event.action === 'project_created' ? 'bg-indigo-600' :
                                                    event.action === 'issue_created' ? 'bg-emerald-500' :
                                                        event.action === 'status_updated' ? 'bg-amber-500' : 'bg-blue-500'
                                                }`}></div>

                                            {/* Minimalist Premium Card */}
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, y: isEvenInBurst ? 20 : -20, x: '-50%' }}
                                                animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                                                className={`absolute w-64 p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-2xl transition-all z-[100] left-1/2 ${isEvenInBurst ? 'bottom-[100px]' : 'top-[100px]'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                                                        {getActivityIcon(event.action)}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <span className="text-[10px] font-black text-indigo-600 block truncate uppercase tracking-tighter">
                                                            {event.projectName}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-300 uppercase">
                                                            {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <h4 className="text-slate-900 font-bold text-sm leading-tight mb-2 line-clamp-2">
                                                    {event.details?.title || event.details?.name || event.action.replace('_', ' ')}
                                                </h4>

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                    <div className="flex items-center gap-1.5 opacity-60">
                                                        <User className="w-2.5 h-2.5 text-slate-400" />
                                                        <span className="text-[8px] font-black text-slate-500 uppercase">{event.user}</span>
                                                    </div>
                                                    <ChevronRight className="w-3 h-3 text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </motion.div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Footer View */}
            <div className="bg-slate-50/50 p-6 flex justify-center gap-8 border-t border-slate-100 overflow-x-auto select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nacimiento Proyecto</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hitos Creados</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cambios de Estado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Anotaciones IA/User</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalTimelineView;
