
import React from 'react';
import { Task, Project, Comment, TaskStatus, Activity, Priority, Profile, IssueAttachment } from '../types';
import { supabase } from '../services/supabase';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import TaskAttachments from './TaskAttachments';
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
    Share2,
    Layers,
    Circle,
    Loader2,
    Trash2
} from 'lucide-react';

interface TaskDetailProps {
    task: Task;
    project?: Project;
    comments: Comment[];
    activities: Activity[];
    onBack: () => void;
    onRefresh: (isRefresh?: boolean) => Promise<void>;
    onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
    onDelete?: (taskId: string) => Promise<void>;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, project, comments, activities, onBack, onRefresh, onUpdateStatus, onDelete }) => {
    const [newComment, setNewComment] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedTitle, setEditedTitle] = React.useState(task.title);
    const [editedDescription, setEditedDescription] = React.useState(task.description || '');
    const [editedProjectId, setEditedProjectId] = React.useState(task.projectId);
    const [editedPriority, setEditedPriority] = React.useState<Priority>(task.priority);
    const [editedDueDate, setEditedDueDate] = React.useState(task.dueDate || '');
    const [editedAssignee, setEditedAssignee] = React.useState(task.assignees?.[0] || '');
    const [allProjects, setAllProjects] = React.useState<Project[]>([]);
    const [projectUsers, setProjectUsers] = React.useState<Profile[]>([]);
    const [attachments, setAttachments] = React.useState<IssueAttachment[]>([]);

    const { showToast } = useVisualFeedback();

    const fetchAttachments = async () => {
        const { data, error } = await supabase
            .from('issue_attachments')
            .select('*')
            .eq('issue_id', task.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching attachments:', error);
            return;
        }

        setAttachments(data.map(d => ({
            id: d.id,
            issueId: d.issue_id,
            projectId: d.project_id,
            fileName: d.file_name,
            filePath: d.file_path,
            fileType: d.file_type,
            fileSize: d.file_size,
            createdAt: d.created_at,
            createdBy: d.created_by
        })));
    };

    React.useEffect(() => {
        const fetchProjects = async () => {
            const { data } = await supabase.from('projects').select('*').order('name');
            if (data) {
                setAllProjects(data.map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    status: p.status,
                    progress: p.progress,
                    repository_url: p.repository_url,
                    created_at: p.created_at,
                    updated_at: p.updated_at
                })));
            }
        };

        const fetchProjectUsers = async () => {
            if (!task.projectId) return;

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
                .eq('project_id', task.projectId);

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

        fetchProjects();
        fetchProjectUsers();
        fetchAttachments();
    }, [task.projectId, task.id]);

    const taskComments = comments.filter(c => c.issueId === task.id);
    const taskActivities = activities.filter(a => a.issueId === task.id);

    // Merge comments and activities for a unified timeline
    const timelineItems = [
        ...taskComments.map(c => ({ type: 'comment' as const, date: new Date(c.createdAt), data: c })),
        ...taskActivities.map(a => ({ type: 'activity' as const, date: new Date(a.timestamp), data: a }))
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await supabase.from('comments').insert([{
                issue_id: task.id,
                author_name: 'Alexis Tomaselli', // In a real app, this would come from auth
                content: newComment.trim()
            }]);

            // Log activity
            await supabase.from('activities').insert([{
                project_id: task.projectId,
                issue_id: task.id,
                action: 'commented',
                details: { comment: newComment.trim().slice(0, 50) }
            }]);

            setNewComment('');
            onRefresh();
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };
    const commentAreaRef = React.useRef<HTMLDivElement>(null);

    const handleUpdateTask = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('issues')
                .update({
                    title: editedTitle.trim(),
                    description: editedDescription.trim(),
                    project_id: editedProjectId,
                    priority: editedPriority,
                    due_date: editedDueDate || null,
                    assigned_to: editedAssignee ? [editedAssignee] : []
                })
                .eq('id', task.id);

            if (error) throw error;

            // Log activity
            await supabase.from('activities').insert([{
                project_id: editedProjectId,
                issue_id: task.id,
                action: 'task_updated',
                details: {
                    title: editedTitle.trim(),
                    changes: 'Campos editados desde el detalle'
                }
            }]);

            setIsEditing(false);
            showToast('Tarea actualizada', 'Los cambios se han guardado exitosamente.', 'success');
            onRefresh();
        } catch (error) {
            console.error('Error updating task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (newStatus: TaskStatus) => {
        setIsSubmitting(true);
        try {
            await onUpdateStatus(task.id, newStatus);
            onRefresh(true);
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (onDelete) {
            await onDelete(task.id);
            onBack();
        }
    };

    const scrollToComments = () => {
        commentAreaRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'todo': return 'bg-slate-100 text-slate-600 border-slate-200';
            case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'review': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
            case 'done': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-rose-600 bg-rose-50';
            case 'medium': return 'text-amber-600 bg-amber-50';
            case 'low': return 'text-emerald-600 bg-emerald-50';
            case 'urgent': return 'text-rose-700 bg-rose-100';
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
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 border border-rose-100 bg-rose-50/50 rounded-2xl px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                    </button>
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

                        {isEditing ? (
                            <div className="space-y-4 mb-8">
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="w-full text-4xl font-extrabold text-slate-900 leading-tight border-b-2 border-indigo-600 outline-none bg-transparent"
                                />
                                <textarea
                                    value={editedDescription}
                                    onChange={(e) => setEditedDescription(e.target.value)}
                                    className="w-full text-slate-600 text-lg leading-relaxed min-h-[150px] p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500"
                                    placeholder="Descripción del issue..."
                                />

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proyecto</label>
                                        <select
                                            value={editedProjectId}
                                            onChange={(e) => setEditedProjectId(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-400"
                                        >
                                            {allProjects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
                                        <select
                                            value={editedPriority}
                                            onChange={(e) => setEditedPriority(e.target.value as Priority)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-400"
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
                                            value={editedDueDate ? new Date(editedDueDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditedDueDate(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-400"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
                                        <select
                                            value={editedAssignee}
                                            onChange={(e) => setEditedAssignee(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-400"
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
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleUpdateTask}
                                        disabled={isSubmitting}
                                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Guardar Cambios
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditedTitle(task.title);
                                            setEditedDescription(task.description || '');
                                        }}
                                        className="text-slate-500 font-bold hover:text-slate-800"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">
                                        {task.title}
                                    </h2>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-indigo-600 text-xs font-black uppercase tracking-widest hover:underline"
                                    >
                                        Editar
                                    </button>
                                </div>

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
                            </>
                        )}

                        <div className="space-y-4 pt-8 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cambiar Estado</p>
                            <div className="flex flex-wrap items-center gap-3">
                                {[
                                    { id: 'todo', label: 'Por Hacer', icon: Circle, color: 'hover:border-slate-300 hover:bg-slate-50 text-slate-600', active: 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm' },
                                    { id: 'in_progress', label: 'En Progreso', icon: Clock, color: 'hover:border-amber-200 hover:bg-amber-50 text-amber-600', active: 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm' },
                                    { id: 'review', label: 'En Revisión', icon: AlertCircle, color: 'hover:border-indigo-200 hover:bg-indigo-50 text-indigo-600', active: 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-sm' },
                                    { id: 'done', label: 'Completado', icon: CheckCircle2, color: 'hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600', active: 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm' },
                                ].map((status) => (
                                    <button
                                        key={status.id}
                                        onClick={() => handleUpdateStatus(status.id as TaskStatus)}
                                        disabled={isSubmitting}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border transition-all disabled:opacity-50 ${task.status === status.id ? status.active : `bg-white border-slate-100 ${status.color}`
                                            }`}
                                    >
                                        <status.icon className="w-4 h-4" />
                                        <span>{status.label}</span>
                                        {task.status === status.id && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse ml-1" />}
                                    </button>
                                ))}

                                <div className="h-8 w-[1px] bg-slate-100 mx-2" />

                                <button
                                    onClick={scrollToComments}
                                    className="flex items-center gap-2 border border-slate-200 text-slate-600 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all hover:bg-slate-50"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Comentar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div ref={commentAreaRef} className="glass-card p-10 bg-white border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-indigo-500" />
                            Discusión & Actividad
                        </h3>


                        <div className="space-y-6">
                            {timelineItems.length > 0 ? timelineItems.map((item, idx) => (
                                item.type === 'comment' ? (
                                    <div key={`comment-${item.data.id}`} className="flex gap-4 animate-slide-up">
                                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                            {item.data.authorName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl flex-1 border border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-slate-900">{item.data.authorName}</span>
                                                <span className="text-xs text-slate-400">{item.date.toLocaleString()}</span>
                                            </div>
                                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{item.data.content}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={`activity-${item.data.id}`} className="flex gap-4 items-center animate-slide-up pl-4 py-2 border-l-2 border-slate-100 ml-5">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${item.data.action === 'status_updated' ? 'bg-amber-100 text-amber-600' :
                                            item.data.action === 'commented' ? 'bg-blue-100 text-blue-600' :
                                                'bg-indigo-100 text-indigo-600'
                                            }`}>
                                            {item.data.action === 'status_updated' ? <Clock className="w-4 h-4" /> :
                                                item.data.action === 'commented' ? <MessageSquare className="w-4 h-4" /> :
                                                    <AlertCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 text-sm">
                                            <span className="font-bold text-slate-700 capitalize">
                                                {item.data.action.replace('_', ' ')}:
                                            </span>
                                            <span className="text-slate-500 ml-2">
                                                {item.data.action === 'status_updated' && (item.data as any).details?.new_status ?
                                                    `a ${(item.data as any).details.new_status}` :
                                                    item.data.action === 'issue_created' ? 'Tarea iniciada' :
                                                        'Actividad registrada'}
                                            </span>
                                            <span className="text-[10px] text-slate-300 ml-3 font-mono">
                                                {item.date.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                )
                            )) : (
                                <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <p className="text-sm font-bold">No hay trazabilidad registrada.</p>
                                    <p className="text-[10px] uppercase tracking-widest mt-1">Realiza una acción para iniciar el historial</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="relative">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Escribe un comentario técnico o actualización..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all min-h-[120px] resize-none"
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={isSubmitting || !newComment.trim()}
                                    className="absolute bottom-4 right-4 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Enviar Comentario'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="col-span-4 space-y-6">
                    <div className="glass-card p-8 bg-white border-slate-100">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Detalles Técnicos</h4>

                        <div className="space-y-6">
                            <InfoRow
                                icon={<User />}
                                label="Asignados"
                                value={
                                    <div className="flex flex-col gap-2 mt-2">
                                        {task.assignees && task.assignees.length > 0 ? (
                                            task.assignees.map((assignee, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-100 border border-slate-200">
                                                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${assignee}`} alt="avatar" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{assignee}</span>
                                                </div>
                                            ))
                                        ) : 'Sin asignar'}
                                    </div>
                                }
                            />
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
                        <TaskAttachments
                            taskId={task.id}
                            projectId={task.projectId}
                            attachments={attachments}
                            onAttachmentsChange={fetchAttachments}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 18 }) : icon}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="text-sm font-extrabold text-slate-800">{value}</div>
        </div>
    </div>
);

export default TaskDetail;
