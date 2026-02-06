
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
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
    MoreVertical,
    MessageSquare,
    Activity as ActivityIcon,
    Trash2,
    Plus,
    X,
    Layout,
    User,
    Flag,
    Palette,
    FileText
} from 'lucide-react';
import TaskList from './TaskList';
import RoadmapView from './RoadmapView';
import WhiteboardList from './WhiteboardList';
import DocumentList from './DocumentList';
import DocumentEditor from './DocumentEditor';
import { Project, Task, Activity, Priority, Profile, ProjectDoc } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import { createPortal } from 'react-dom';

interface ProjectDetailProps {
    project: Project;
    projects: Project[];
    tasks: Task[];
    activities: Activity[];
    onBack: () => void;
    onSelectTask: (taskId: string) => void;
    onDelete?: () => void;
    onDeleteTask?: (taskId: string) => Promise<void>;
    onCreateIssue: (projectId: string, title: string, description: string, priority: Priority, assignees: string[], dueDate: string) => void;
    onRenameProject: (projectId: string, newName: string) => Promise<void>;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({
    project,
    projects,
    tasks,
    activities,
    onBack,
    onSelectTask,
    onDelete,
    onDeleteTask,
    onCreateIssue,
    onRenameProject
}) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'history' | 'roadmap' | 'whiteboard' | 'docs'>('tasks');
    const [selectedDoc, setSelectedDoc] = useState<ProjectDoc | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState(project.name);

    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    // New task form state
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [projectUsers, setProjectUsers] = useState<Profile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { showToast } = useVisualFeedback();

    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const projectActivities = activities.filter(a => a.projectId === project.id);

    // Debugging state
    useEffect(() => {
        if (isCreateTaskOpen) {
            console.log('✅ Modal de tarea abierto');
            fetchProjectUsers();
        }
    }, [isCreateTaskOpen]);

    const fetchProjectUsers = async () => {
        // 1. Fetch all superadmins globally
        const { data: superAdmins } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'superadmin');

        // 2. Fetch users via project_teams -> team_members
        const { data: teamData } = await supabase
            .from('project_teams')
            .select(`
                team_id,
                teams (
                    team_members (
                        profiles (*)
                    )
                )
            `)
            .eq('project_id', project.id);

        const users: Profile[] = [];
        const seen = new Set();

        // Add superadmins first
        if (superAdmins) {
            superAdmins.forEach(u => {
                if (!seen.has(u.id)) {
                    users.push(u);
                    seen.add(u.id);
                }
            });
        }

        // Add team members
        if (teamData) {
            teamData.forEach((pTeam: any) => {
                pTeam.teams?.team_members?.forEach((member: any) => {
                    if (member.profiles && !seen.has(member.profiles.id)) {
                        users.push(member.profiles);
                        seen.add(member.profiles.id);
                    }
                });
            });
        }
        setProjectUsers(users);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'on_hold': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'archived': return <AlertCircle className="w-5 h-5 text-slate-400" />;
            default: return null;
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        setIsSubmitting(true);
        try {
            const assignees = newTaskAssignee.trim() ? newTaskAssignee.split(',').map(a => a.trim()) : [];
            await onCreateIssue(
                project.id,
                newTaskTitle,
                newTaskDescription,
                newTaskPriority,
                assignees,
                newTaskDueDate
            );
            setIsCreateTaskOpen(false);
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('medium');
            setNewTaskAssignee('');
            setNewTaskDueDate('');
        } catch (err: any) {
            console.error('Error in handleCreateTask:', err);
            showToast('Error al crear tarea', err.message || 'No se pudo generar el issue.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        setEditedName(project.name);
    }, [project.name]);


    const handleRename = async () => {
        if (!editedName.trim() || editedName === project.name) {
            setIsEditingName(false);
            return;
        }

        try {
            await onRenameProject(project.id, editedName.trim());
            setIsEditingName(false);
            showToast('Proyecto Renombrado', 'El nombre se actualizó correctamente.', 'success');
        } catch (err: any) {
            console.error('Error renaming project:', err);
            showToast('Error', 'No se pudo renombrar el proyecto.', 'error');
        }
    };

    return (
        <div className="space-y-10 animate-fadeIn relative">
            {selectedDoc && createPortal(
                <DocumentEditor
                    doc={selectedDoc}
                    onBack={() => setSelectedDoc(null)}
                />,
                document.body
            )}
            {/* Create Task Modal */}
            <AnimatePresence>
                {isCreateTaskOpen && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateTaskOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden z-[100000]"
                        >
                            <div className="bg-gradient-to-br from-indigo-50 to-white px-10 py-8 border-b border-indigo-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                                        <Layout className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900">Nueva Tarea</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Hito para: {project.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCreateTaskOpen(false)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white text-slate-400 transition-colors shadow-sm"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateTask} className="p-10 space-y-8">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Título de la Tarea</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            placeholder="Ej: Implementar sistema de auth"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Descripción Detallada</label>
                                        <textarea
                                            rows={3}
                                            value={newTaskDescription}
                                            onChange={(e) => setNewTaskDescription(e.target.value)}
                                            placeholder="Explica qué se debe lograr con esta tarea..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-800 font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-slate-300"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Prioridad</label>
                                        <div className="flex gap-2">
                                            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setNewTaskPriority(p)}
                                                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${newTaskPriority === p
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                                        : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Fecha de Entrega</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                value={newTaskDueDate}
                                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-6 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Responsable</label>
                                        <div className="relative">
                                            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select
                                                value={newTaskAssignee}
                                                onChange={(e) => setNewTaskAssignee(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-6 py-3 text-sm font-bold text-slate-800 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                            >
                                                <option value="">Sin asignar</option>
                                                {projectUsers.map(u => (
                                                    <option key={u.id} value={u.full_name || u.email}>
                                                        {u.full_name || u.email.split('@')[0]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateTaskOpen(false)}
                                        className="flex-1 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newTaskTitle.trim() || isSubmitting}
                                        className="flex-[2] bg-indigo-600 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Creando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4" />
                                                <span>Crear Issue</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

                <div className="flex items-center gap-3 relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className={`w-11 h-11 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all ${isMenuOpen ? 'bg-slate-50 border-indigo-200 text-indigo-600 shadow-inner' : ''}`}
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {isMenuOpen && (
                        <div className="absolute top-14 right-0 w-56 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl z-[150] overflow-hidden animate-slide-up">
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        setIsEditingName(true);
                                        setEditedName(project.name);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>Renombrar Proyecto</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        onDelete?.();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Eliminar Proyecto</span>
                                </button>
                                <button
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors opacity-50 cursor-not-allowed"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    <span>Archivar Proyecto</span>
                                </button>
                            </div>
                        </div>
                    )}

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
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                {isEditingName ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editedName}
                                        onChange={(e) => setEditedName(e.target.value)}
                                        onBlur={handleRename}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                        className="text-4xl font-extrabold text-slate-900 bg-transparent border-b-2 border-indigo-500 outline-none w-full max-w-md"
                                    />
                                ) : (
                                    <h2 className="text-4xl font-extrabold text-slate-900">{project.name}</h2>
                                )}
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
                        <StatItem icon={<CheckCircle2 />} label="Tareas Completas" value={`${projectTasks.filter(t => t.status === 'done').length}/${projectTasks.length}`} />
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 mb-8">
                        <div className="flex items-center gap-8">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`pb-4 border-b-2 font-bold text-sm transition-all ${activeTab === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Tareas & Tickets
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`pb-4 border-b-2 font-bold text-sm transition-all ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Historial de Desarrollo
                            </button>
                            <button
                                onClick={() => setActiveTab('roadmap')}
                                className={`pb-4 border-b-2 font-bold text-sm transition-all ${activeTab === 'roadmap' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Hoja de Ruta (Timeline)
                            </button>
                            <button
                                onClick={() => setActiveTab('whiteboard')}
                                className={`pb-4 border-b-2 font-bold text-sm transition-all ${activeTab === 'whiteboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Palette className="w-4 h-4" />
                                    <span>Pizarras</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('docs')}
                                className={`pb-4 border-b-2 font-bold text-sm transition-all ${activeTab === 'docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    <span>Documentos</span>
                                </div>
                            </button>
                        </div>

                        <div className="pb-4">
                            <button
                                id="btn-nueva-tarea"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Botón Nueva Tarea cliqueado');
                                    setIsCreateTaskOpen(true);
                                }}
                                className="relative z-30 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Nueva Tarea</span>
                            </button>
                        </div>
                    </div>

                    <div className="animate-slide-up">
                        {activeTab === 'tasks' ? (
                            <TaskList
                                tasks={projectTasks}
                                projects={projects}
                                onSelectTask={onSelectTask}
                                onDeleteTask={onDeleteTask}
                            />
                        ) : activeTab === 'history' ? (
                            <div className="space-y-6 max-w-4xl">
                                {projectActivities.length > 0 ? projectActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((activity) => (
                                    <div key={activity.id} className="flex gap-6 relative group">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border-2 border-white relative z-10 ${activity.action === 'status_updated' ? 'bg-amber-100 text-amber-600' :
                                                activity.action === 'commented' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                {activity.action === 'status_updated' ? <Clock className="w-5 h-5" /> :
                                                    activity.action === 'commented' ? <MessageSquare className="w-5 h-5" /> :
                                                        <ActivityIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="w-0.5 h-full bg-slate-100 group-last:hidden"></div>
                                        </div>
                                        <div className="pb-8 flex-1">
                                            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                                                            {activity.action.replace('_', ' ')}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            {new Date(activity.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <h4 className="text-slate-900 font-bold mb-1">
                                                    {activity.details?.title ? (
                                                        <>
                                                            <span className="text-indigo-600 hover:underline cursor-pointer" onClick={() => onSelectTask(activity.issueId!)}>
                                                                #{activity.issueId?.slice(0, 4)}: {activity.details.title}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        activity.projectName
                                                    )}
                                                </h4>
                                                <p className="text-slate-500 text-sm leading-relaxed">
                                                    {activity.action === 'status_updated' && activity.details?.new_status ?
                                                        `El estado cambió a "${activity.details.new_status}"` :
                                                        activity.action === 'issue_created' ? 'Se creó una nueva tarea para el equipo.' :
                                                            activity.action === 'doc_created' ? `Se creó el documento "${activity.details?.title || 'Sin título'}".` :
                                                                activity.action === 'doc_updated' ? `Se actualizó el contenido de "${activity.details?.title || 'Sin título'}".` :
                                                                    activity.action === 'commented' ? 'Se agregó un nuevo comentario con feedback.' :
                                                                        'Actividad general registrada en el sistema.'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
                                            <ActivityIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-slate-900 font-extrabold text-xl">Sin historial aún</h3>
                                        <p className="text-slate-400 mt-2 max-w-xs mx-auto">Toda la actividad del equipo aparecerá aquí cronológicamente.</p>
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'whiteboard' ? (
                            <WhiteboardList projectId={project.id} />
                        ) : activeTab === 'docs' ? (
                            <DocumentList
                                projectId={project.id}
                                onSelectDoc={(doc) => setSelectedDoc(doc)}
                            />
                        ) : (
                            <RoadmapView tasks={projectTasks} activities={projectActivities} onSelectTask={onSelectTask} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-extrabold text-slate-900">{value}</p>
        </div>
    </div>
);

export default ProjectDetail;
