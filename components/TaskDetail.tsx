
import React from 'react';
import { Task, Project } from '../types';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Hash,
    User,
    Calendar,
    Flag,
    MessageSquare,
    MoreVertical,
    Paperclip,
    Share2,
    Layers
} from 'lucide-react';

interface TaskDetailProps {
    task: Task;
    project?: Project;
    onBack: () => void;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, project, onBack }) => {
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return 'bg-sky-50 text-sky-700 border-sky-100';
            case 'in_progress': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'closed': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-rose-600 bg-rose-50';
            case 'medium': return 'text-amber-600 bg-amber-50';
            case 'low': return 'text-emerald-600 bg-emerald-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            {/* Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
                >
                    <div className="w-10 h-10 border border-slate-200 rounded-2xl flex items-center justify-center group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span>Cerrar Detalle</span>
                </button>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        <Share2 className="w-4 h-4" />
                        <span>Compartir</span>
                    </button>
                    <button className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-10">
                {/* Main Content */}
                <div className="col-span-8 space-y-8">
                    <div className="glass-card p-10 bg-white border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                <Hash className="w-3 h-3" />
                                ISSUE-{task.id?.toString().slice(0, 4)}
                            </span>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(task.status)}`}>
                                {task.status.replace('_', ' ')}
                            </div>
                        </div>

                        <h2 className="text-4xl font-extrabold text-slate-900 mb-6 leading-tight">
                            {task.title}
                        </h2>

                        <div className="prose prose-slate max-w-none mb-10">
                            <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                                {task.description || 'No hay una descripción detallada para este issue.'}
                            </p>
                            {!task.description && (
                                <>
                                    <h4 className="font-bold text-slate-800 mt-6 mb-3">Recomendaciones:</h4>
                                    <p className="text-slate-500 text-sm italic">
                                        Considera usar el asistente MCP para agregar más contexto a este issue.
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-4 pt-8 border-t border-slate-50">
                            <button className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Marcar como Completada</span>
                            </button>
                            <button className="flex items-center gap-2 border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold transition-all hover:bg-slate-50">
                                <MessageSquare className="w-5 h-5" />
                                <span>Agregar Comentario</span>
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-10 bg-white border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-indigo-500" />
                            Discusión & Actividad
                        </h3>

                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">AT</div>
                                <div className="bg-slate-50 p-6 rounded-3xl flex-1 border border-slate-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-slate-900">Alexis Tomaselli</span>
                                        <span className="text-xs text-slate-400">Hace 2 horas</span>
                                    </div>
                                    <p className="text-slate-600 leading-relaxed">Trabajando en el fix de este issue. El problema parece estar en la respuesta del webhook de Supabase.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-span-4 space-y-6">
                    <div className="glass-card p-8 bg-white border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Detalles Técnicos</h4>

                        <div className="space-y-6">
                            <InfoRow icon={<User />} label="Asignado a" value={task.assignee || 'Sin asignar'} />
                            <InfoRow
                                icon={<Flag />}
                                label="Prioridad"
                                value={
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getPriorityStyle(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                }
                            />
                            <InfoRow icon={<Calendar />} label="Fecha Límite" value={task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Pendiente'} />
                            {project && <InfoRow icon={<Layers />} label="Proyecto" value={project.name} />}
                        </div>
                    </div>

                    <div className="glass-card p-8 bg-white border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Adjuntos</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Paperclip className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">error-logs.txt</span>
                                </div>
                                <span className="text-[10px] text-slate-400 uppercase font-black">12 KB</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-4.5 h-4.5' })}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="text-sm font-extrabold text-slate-800">{value}</div>
        </div>
    </div>
);

export default TaskDetail;
