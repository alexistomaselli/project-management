
import React from 'react';
import { Project, Task, Activity } from '../types';
import {
    ArrowLeft,
    Layers,
    ExternalLink,
    Calendar,
    CheckCircle2,
    Clock,
    AlertCircle,
    Users,
    GitBranch,
    MoreVertical
} from 'lucide-react';
import TaskList from './TaskList';
import HistoryView from './HistoryView';

interface ProjectDetailProps {
    project: Project;
    tasks: Task[];
    activities: Activity[];
    onBack: () => void;
    onSelectTask: (taskId: string) => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
    project,
    tasks,
    activities,
    onBack,
    onSelectTask
}) => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectActivities = activities.filter(a => a.projectId === project.id);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'on_hold': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'archived': return <AlertCircle className="w-5 h-5 text-slate-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            {/* Header / Actions */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all group"
                >
                    <div className="w-10 h-10 border border-slate-200 rounded-2xl flex items-center justify-center group-hover:border-indigo-100 group-hover:bg-indigo-50 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span>Volver a Proyectos</span>
                </button>

                <div className="flex items-center gap-3">
                    <button className="w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                    {project.repository_url && (
                        <a
                            href={project.repository_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-slate-200 hover:bg-black transition-all"
                        >
                            <GitBranch className="w-4 h-4" />
                            <span>Ver Repo</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                        </a>
                    )}
                </div>
            </div>

            {/* Hero Card */}
            <div className="glass-card p-10 bg-white border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                    <Layers className="w-64 h-64 -rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-start gap-6 mb-8">
                        <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                            <Layers className="w-10 h-10" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-4xl font-extrabold text-slate-900">{project.name}</h2>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {getStatusIcon(project.status)}
                                    <span>{project.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                                {project.description || 'Sin descripción detallada disponible.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 pt-8 border-t border-slate-50">
                        <StatItem icon={<Calendar />} label="Actualizado" value={new Date(project.updated_at).toLocaleDateString()} />
                        <StatItem icon={<CheckCircle2 />} label="Tareas Completas" value={`${projectTasks.filter(t => t.status === 'closed').length}/${projectTasks.length}`} />
                        <StatItem icon={<Users />} label="Equipo" value="3 Miembros" />
                        <div>
                            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400 mb-2">
                                <span>Progreso General</span>
                                <span className="text-indigo-600">{project.progress}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                                <div
                                    className="h-full bg-indigo-600 rounded-full shadow-sm transition-all duration-1000"
                                    style={{ width: `${project.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs / Content */}
            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12">
                    <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
                        <button className="pb-4 border-b-2 border-indigo-600 text-indigo-600 font-bold text-sm">Tareas & Tickets</button>
                        <button className="pb-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Historial de Desarrollo</button>
                        <button className="pb-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">Archivos</button>
                    </div>

                    <div className="animate-slide-up">
                        <TaskList tasks={projectTasks} onSelectTask={onSelectTask} />
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-extrabold text-slate-900">{value}</p>
        </div>
    </div>
);

export default ProjectDetail;
