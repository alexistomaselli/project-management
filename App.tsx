import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  Layers,
  CheckSquare,
  History as HistoryIcon,
  Plus,
  Search,
  Bell,
  BrainCircuit,
  Terminal,
  ChevronRight,
  Loader2,
  Menu,
  X,
  BookOpen,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import TasksPage from './components/TasksPage';
import HistoryView from './components/HistoryView';
import McpChat from './components/McpChat';
import AiAssistantView from './components/AiAssistantView';
import SettingsView from './components/SettingsView';
import ProjectDetailWrapper from './components/ProjectDetailWrapper';
import TaskDetailWrapper from './components/TaskDetailWrapper';
import DocsView from './components/DocsView';
import Auth from './components/Auth';
import { Project, Task, Activity, Profile, TaskStatus, Priority, Message } from './types';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { useVisualFeedback } from './context/VisualFeedbackContext';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectRepo, setNewProjectRepo] = useState('');

  const { showToast, confirmAction } = useVisualFeedback();

  const activeTab = location.pathname.split('/')[1] || 'dashboard';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name,
          avatar_url: session.user.user_metadata?.avatar_url
        });
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const { data: projData } = await supabase.from('projects').select('*').order('updated_at', { ascending: false });
      const { data: taskData } = await supabase.from('issues').select('*').order('created_at', { ascending: false });
      const { data: actData } = await supabase.from('activities').select('*, projects(name)').order('created_at', { ascending: false });
      const { data: commData } = await supabase.from('comments').select('*').order('created_at', { ascending: true });

      if (projData) setProjects(projData as any);
      if (commData) setComments(commData.map(c => ({
        id: c.id,
        issueId: c.issue_id,
        authorName: c.author_name,
        content: c.content,
        createdAt: c.created_at
      })));
      if (taskData) {
        // Map issues to tasks type if necessary, here we assume they match enough
        setTasks(taskData.map(t => ({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignees: t.assigned_to,
          dueDate: t.due_date,
          createdAt: t.created_at
        })) as any);
      }
      if (actData) {
        setActivities(actData.map(a => ({
          id: a.id,
          projectId: a.project_id,
          issueId: a.issue_id,
          projectName: (a.projects as any)?.name || 'Unknown',
          action: a.action,
          timestamp: a.created_at,
          user: 'System',
          details: a.details
        })) as any);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    confirmAction({
      title: 'Eliminar Proyecto',
      message: '¿Estás seguro de que deseas eliminar este proyecto? Esta acción borrará todas sus tareas y actividades de forma permanente.',
      confirmLabel: 'Eliminar Proyecto',
      variant: 'danger',
      onConfirm: async () => {
        try {
          setLoading(true);
          // Delete activities first (foreign key constraints)
          await supabase.from('activities').delete().eq('project_id', projectId);
          // Delete issues
          await supabase.from('issues').delete().eq('project_id', projectId);
          // Delete project
          const { error } = await supabase.from('projects').delete().eq('id', projectId);

          if (error) throw error;

          await fetchData();
          showToast('Proyecto eliminado', 'La infraestructura ha sido removida del servidor.', 'success');
          navigate('/projects');
        } catch (error: any) {
          console.error('Error deleting project:', error);
          showToast('Error al eliminar', error.message || 'No se pudo completar la operación.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCreateIssue = async (projectId: string, title: string, description: string, priority: Priority = 'medium', assignees: string[] = [], dueDate: string = '') => {
    try {
      const { data: issue, error } = await supabase
        .from('issues')
        .insert([{
          project_id: projectId,
          title: title.trim(),
          description: description.trim(),
          status: 'todo',
          priority,
          assigned_to: assignees,
          due_date: dueDate || null
        }])
        .select()
        .single();

      if (error) throw error;

      if (issue) {
        await supabase.from('activities').insert([{
          project_id: projectId,
          issue_id: issue.id,
          action: 'issue_created',
          details: { title: issue.title }
        }]);
      }

      await fetchData();
      showToast('Tarea creada', `Se ha generado la tarea "${title}" exitosamente.`, 'success');
    } catch (error: any) {
      console.error('Error creating issue:', error);
      showToast('Error', error.message || 'Error al crear la tarea.', 'error');
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to changes
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!session) {
    return <Auth onSuccess={() => fetchData()} />;
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert([{
          name: newProjectName.trim(),
          repository_url: newProjectRepo.trim(),
          status: 'active',
          progress: 0
        }])
        .select()
        .single();

      if (error) throw error;

      if (project) {
        await supabase.from('activities').insert([{
          project_id: project.id,
          action: 'project_created',
          details: { name: project.name }
        }]);
      }

      setIsCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectRepo('');
      fetchData();
      showToast('Proyecto creado', `El proyecto "${project?.name}" está listo.`, 'success');
    } catch (error: any) {
      console.error('Error creating project:', error);
      showToast('Error', error.message || 'No se pudo crear el proyecto.', 'error');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      // Optimistic update
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      setTasks(updatedTasks);

      const { data: task, error } = await supabase
        .from('issues')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select('project_id, title')
        .single();

      if (error) throw error;

      // Log activity
      if (task) {
        await supabase.from('activities').insert([{
          project_id: task.project_id,
          issue_id: taskId,
          action: 'status_updated',
          details: { title: task.title, status: newStatus }
        }]);
      }

      // We don't need full fetchData because of real-time subscription, 
      // but if real-time fails, this is a safety net.
    } catch (error) {
      console.error('Error updating task status:', error);
      fetchData(); // Rollback on error
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    confirmAction({
      title: 'Eliminar Tarea',
      message: '¿Estás seguro de que deseas eliminar esta tarea de forma permanente? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar Definitivamente',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('issues').delete().eq('id', taskId);
          if (error) throw error;
          await fetchData();
          showToast('Tarea eliminada', 'El issue ha sido removido del backlog.', 'success');
        } catch (error: any) {
          console.error('Error deleting task:', error);
          showToast('Error al eliminar', error.message || 'No se pudo borrar la tarea.', 'error');
        }
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-[#F1F5F9] px-6 py-8 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-slate-200' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">ProjectCentral</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-1">
          <NavItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            to="/dashboard"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<Sparkles className="w-5 h-5" />}
            label="AI Assistant"
            active={activeTab === 'chat'}
            to="/chat"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<SettingsIcon className="w-5 h-5" />}
            label="Configuración"
            active={activeTab === 'settings'}
            to="/settings"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<Layers className="w-5 h-5" />}
            label="Proyectos"
            active={activeTab === 'projects'}
            to="/projects"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<CheckSquare className="w-5 h-5" />}
            label="Tareas & Issues"
            active={activeTab === 'tasks'}
            to="/tasks"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<HistoryIcon className="w-5 h-5" />}
            label="Historial"
            active={activeTab === 'history'}
            to="/history"
            onClick={() => setIsSidebarOpen(false)}
          />
          <NavItem
            icon={<BookOpen className="w-5 h-5" />}
            label="Documentación"
            active={activeTab === 'docs'}
            to="/docs"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>

        <div className="mt-auto pt-8">
          <div className="p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Modo MCP Activado</p>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-4">Usa lenguaje natural desde el asistente para controlar tus proyectos.</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-medium text-slate-500">Servidor Online</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 p-6 lg:p-10 pb-32 w-full max-w-[100vw] overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-slide-up">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-11 h-11 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
                <span>Workspace</span>
                <ChevronRight className="w-4 h-4" />
                <Link
                  to={`/${activeTab}`}
                  className="hover:text-indigo-800 transition-colors capitalize"
                >
                  {activeTab}
                </Link>
                {location.pathname.includes('/detalle/') || (location.pathname.split('/').length > 2 && activeTab !== 'dashboard') ? (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-400">Detalles</span>
                  </>
                ) : null}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                <HeaderTitle
                  pathname={location.pathname}
                  projects={projects}
                  tasks={tasks}
                  activeTab={activeTab}
                />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-white border border-[#E2E8F0] rounded-2xl pl-10 pr-4 py-2.5 text-sm w-32 md:w-64 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              />
            </div>

            <div className="h-11 px-4 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-3 shadow-sm shrink-0">
              <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Usuario</p>
                <p className="text-[11px] font-bold text-slate-700 leading-none truncate max-w-[100px]">{profile?.email.split('@')[0]}</p>
              </div>
            </div>

            <button
              onClick={() => supabase.auth.signOut()}
              className="w-11 h-11 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all shadow-sm hover:shadow-md shrink-0 group"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 md:px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Nuevo Proyecto</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
            <p className="font-medium animate-pulse">Cargando tu espacio de trabajo...</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="w-full space-y-8 animate-fadeIn">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard projects={projects} tasks={tasks} activities={activities} />} />
                <Route path="/chat" element={<AiAssistantView projects={projects} tasks={tasks} activities={activities} profile={profile} onRefresh={fetchData} />} />
                <Route path="/settings" element={<SettingsView profile={profile} />} />
                <Route path="/projects" element={<ProjectList projects={projects} onSelect={(id) => navigate(`/projects/${id}`)} />} />
                <Route
                  path="/projects/:projectId"
                  element={
                    <ProjectDetailWrapper
                      projects={projects}
                      tasks={tasks}
                      activities={activities}
                      onDeleteProject={handleDeleteProject}
                      onCreateIssue={handleCreateIssue}
                      onDeleteTask={handleDeleteTask}
                    />
                  }
                />
                <Route path="/tasks" element={
                  <TasksPage
                    tasks={tasks}
                    projects={projects}
                    onSelectTask={(id) => navigate(`/tasks/${id}`)}
                    onUpdateTaskStatus={handleUpdateTaskStatus}
                    onDeleteTask={handleDeleteTask}
                  />
                } />
                <Route
                  path="/tasks/:taskId"
                  element={
                    <TaskDetailWrapper
                      tasks={tasks}
                      projects={projects}
                      comments={comments}
                      activities={activities}
                      onRefresh={fetchData}
                      onUpdateStatus={handleUpdateTaskStatus}
                      onDeleteTask={handleDeleteTask}
                    />
                  }
                />
                <Route path="/history" element={<HistoryView activities={activities} />} />
                <Route path="/docs" element={<DocsView />} />
              </Routes>
            </div>

            {/* Floating MCP Interactive */}
            <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-4 pointer-events-none">
              <motion.div
                initial={false}
                animate={{
                  scale: isMcpOpen ? 1 : 0,
                  opacity: isMcpOpen ? 1 : 0,
                  y: isMcpOpen ? 0 : 100,
                  pointerEvents: isMcpOpen ? 'auto' : 'none'
                }}
                className="glass-card p-0 border-indigo-100 bg-white/95 backdrop-blur-xl shadow-2xl w-[400px] overflow-hidden rounded-[3rem] pointer-events-auto"
              >
                <div className="bg-gradient-to-br from-indigo-50 to-white p-6 border-b border-indigo-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">MCP Interactive</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Bridge Enabled</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMcpOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400"
                  >
                    <Plus className="w-5 h-5 rotate-45" />
                  </button>
                </div>

                <div className="h-[550px]">
                  <McpChat
                    projects={projects}
                    setProjects={setProjects}
                    tasks={tasks}
                    setTasks={setTasks}
                    activities={activities}
                    setActivities={setActivities}
                    onRefresh={fetchData}
                  />
                </div>
              </motion.div>

              {/* Launcher Button */}
              <button
                onClick={() => setIsMcpOpen(!isMcpOpen)}
                className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 active:scale-95 group pointer-events-auto ${isMcpOpen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                {isMcpOpen ? (
                  <MessageSquare className="w-6 h-6" />
                ) : (
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  >
                    <Terminal className="w-6 h-6" />
                  </motion.div>
                )}

                {/* Notification Badge */}
                {!isMcpOpen && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 border-2 border-slate-50 rounded-full animate-bounce"></div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        <AnimatePresence>
          {isCreateProjectOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreateProjectOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-10 w-full max-w-lg relative z-10 shadow-2xl border border-slate-100"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <Plus className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nuevo Proyecto</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Inicia un nuevo desarrollo</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre del Proyecto</label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ej: K-Tracker Dashboard"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">URL Repositorio (Opcional)</label>
                    <input
                      type="text"
                      value={newProjectRepo}
                      onChange={(e) => setNewProjectRepo(e.target.value)}
                      placeholder="https://github.com/usuario/repo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={handleCreateProject}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    Crear Proyecto
                  </button>
                  <button
                    onClick={() => setIsCreateProjectOpen(false)}
                    className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div >
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  to: string;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, to, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${active
      ? 'bg-indigo-50 text-indigo-600'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </div>
    <span className={`font-bold text-sm ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
      {label}
    </span>
    {active && <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
  </Link>
);

const HeaderTitle: React.FC<{ pathname: string, projects: Project[], tasks: Task[], activeTab: string }> = ({ pathname, projects, tasks, activeTab }) => {
  if (pathname.startsWith('/projects/')) {
    const id = pathname.split('/')[2];
    return <>{projects.find(p => p.id === id)?.name || 'Cargando Proyecto...'}</>;
  }
  if (pathname.startsWith('/tasks/')) {
    const id = pathname.split('/')[2];
    return <>{tasks.find(t => t.id === id)?.title || 'Cargando Tarea...'}</>;
  }

  switch (activeTab) {
    case 'dashboard': return <>Bienvenido, Alex</>;
    case 'chat': return <>Asistente Inteligente MCP</>;
    case 'settings': return <>Configuración Core AI</>;
    case 'projects': return <>Repositorios y Proyectos</>;
    case 'tasks': return <>Backlog de Tareas</>;
    case 'docs': return <>Documentación de Comandos MCP</>;
    default: return <>Trazabilidad de Actividad</>;
  }
};

export default App;
