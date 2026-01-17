
import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  Layers,
  CheckSquare,
  History,
  Plus,
  Search,
  Bell,
  BrainCircuit,
  Terminal,
  ChevronRight,
  Loader2,
  Menu,
  X,
  BookOpen
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import McpChat from './components/McpChat';
import ProjectDetail from './components/ProjectDetail';
import TaskDetail from './components/TaskDetail';
import DocsView from './components/DocsView';
import { Project, Task, Activity } from './types';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'history' | 'docs'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
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
          assignee: t.assigned_to,
          dueDate: t.due_date
        })) as any);
      }
      if (actData) {
        setActivities(actData.map(a => ({
          id: a.id,
          projectId: a.project_id,
          projectName: (a.projects as any)?.name || 'Unknown',
          action: a.action,
          timestamp: a.created_at,
          user: 'System'
        })) as any);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
            onClick={() => { setActiveTab('dashboard'); setSelectedProjectId(null); setSelectedTaskId(null); setIsSidebarOpen(false); }}
          />
          <NavItem
            icon={<Layers className="w-5 h-5" />}
            label="Proyectos"
            active={activeTab === 'projects'}
            onClick={() => { setActiveTab('projects'); setSelectedProjectId(null); setSelectedTaskId(null); setIsSidebarOpen(false); }}
          />
          <NavItem
            icon={<CheckSquare className="w-5 h-5" />}
            label="Tareas & Issues"
            active={activeTab === 'tasks'}
            onClick={() => { setActiveTab('tasks'); setSelectedProjectId(null); setSelectedTaskId(null); setIsSidebarOpen(false); }}
          />
          <NavItem
            icon={<History className="w-5 h-5" />}
            label="Historial"
            active={activeTab === 'history'}
            onClick={() => { setActiveTab('history'); setSelectedProjectId(null); setSelectedTaskId(null); setIsSidebarOpen(false); }}
          />
          <NavItem
            icon={<BookOpen className="w-5 h-5" />}
            label="Documentación"
            active={activeTab === 'docs'}
            onClick={() => { setActiveTab('docs'); setSelectedProjectId(null); setSelectedTaskId(null); setIsSidebarOpen(false); }}
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
                <button
                  onClick={() => { setSelectedProjectId(null); setSelectedTaskId(null); }}
                  className="hover:text-indigo-800 transition-colors capitalize"
                >
                  {activeTab}
                </button>
                {(selectedProjectId || selectedTaskId) && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                    <span className="text-slate-400">Detalles</span>
                  </>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {selectedProjectId ? (projects.find(p => p.id === selectedProjectId)?.name) :
                  selectedTaskId ? (tasks.find(t => t.id === selectedTaskId)?.title) :
                    activeTab === 'dashboard' ? 'Bienvenido, Alex' :
                      activeTab === 'projects' ? 'Repositorios y Proyectos' :
                        activeTab === 'tasks' ? 'Backlog de Tareas' : 'Trazabilidad de Actividad'}
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
            <button className="w-11 h-11 bg-white border border-[#E2E8F0] rounded-2xl flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md shrink-0">
              <Bell className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 md:px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 shrink-0 whitespace-nowrap">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-8 space-y-8 animate-fadeIn">
              {selectedProjectId ? (
                <ProjectDetail
                  project={projects.find(p => p.id === selectedProjectId)!}
                  tasks={tasks}
                  activities={activities}
                  onBack={() => setSelectedProjectId(null)}
                  onSelectTask={(id) => { setSelectedTaskId(id); setSelectedProjectId(null); }}
                />
              ) : selectedTaskId ? (
                <TaskDetail
                  task={tasks.find(t => t.id === selectedTaskId)!}
                  project={projects.find(p => p.id === tasks.find(t => t.id === selectedTaskId)?.projectId)}
                  comments={comments}
                  onBack={() => setSelectedTaskId(null)}
                  onRefresh={fetchData}
                />
              ) : (
                <>
                  {activeTab === 'dashboard' && <Dashboard projects={projects} tasks={tasks} activities={activities} />}
                  {activeTab === 'projects' && <ProjectList projects={projects} onSelect={setSelectedProjectId} />}
                  {activeTab === 'tasks' && <TaskList tasks={tasks} onSelectTask={setSelectedTaskId} />}
                  {activeTab === 'history' && <HistoryView activities={activities} />}
                  {activeTab === 'docs' && <DocsView />}
                </>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4">
              <div className="sticky top-10 space-y-8">
                <div className="glass-card p-6 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">MCP Interactive</h3>
                      <p className="text-xs text-slate-500 font-medium tracking-tight">Antigravity Bridge Enabled</p>
                    </div>
                  </div>

                  <div className="h-[600px]">
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
                </div>
              </div>
            </div>
          </div>
        )}
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
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
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
  </button>
);

export default App;
