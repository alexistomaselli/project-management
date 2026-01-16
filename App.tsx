
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import TaskList from './components/TaskList';
import HistoryView from './components/HistoryView';
import McpChat from './components/McpChat';
import { INITIAL_PROJECTS, INITIAL_TASKS, INITIAL_ACTIVITIES } from './constants';
import { Project, Task, Activity } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'history'>('dashboard');
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8 pb-32">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
            <p className="text-slate-500 font-medium">Welcome back to NovaProject workspace.</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm">
              <i className="fa-regular fa-bell"></i>
            </button>
            <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm">
              <i className="fa-solid fa-gear"></i>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="xl:col-span-3">
            {activeTab === 'dashboard' && <Dashboard projects={projects} tasks={tasks} activities={activities} />}
            {activeTab === 'projects' && <ProjectList projects={projects} />}
            {activeTab === 'tasks' && <TaskList tasks={tasks} />}
            {activeTab === 'history' && <HistoryView activities={activities} />}
          </div>
          
          <div className="xl:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl shadow-xl shadow-blue-200/50 text-white overflow-hidden relative group">
                <div className="relative z-10">
                  <h4 className="text-lg font-bold mb-2">MCP Natural Language</h4>
                  <p className="text-blue-100 text-xs mb-4">Controla tu espacio de trabajo con comandos de voz o texto.</p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">Enabled</span>
                    <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">v2.4.0</span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 text-white/10 text-8xl transition-transform group-hover:scale-110 duration-500">
                  <i className="fa-solid fa-microchip"></i>
                </div>
              </div>
              
              <div className="h-[calc(100vh-280px)]">
                <McpChat 
                  projects={projects} 
                  setProjects={setProjects}
                  tasks={tasks}
                  setTasks={setTasks}
                  activities={activities}
                  setActivities={setActivities}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
