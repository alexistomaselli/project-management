
import React from 'react';
import { Project, Task, Activity } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import {
  FolderLock,
  ListTodo,
  Target,
  Zap,
  ArrowUpRight,
  PlusCircle
} from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, tasks, activities }) => {
  const stats = [
    { label: 'Proyectos Totales', value: projects.length, icon: <FolderLock className="w-6 h-6" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Tareas Activas', value: tasks.filter(t => t.status !== 'done').length, icon: <ListTodo className="w-6 h-6" />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Logros / Metas', value: projects.filter(p => p.progress === 100).length, icon: <Target className="w-6 h-6" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Eventos Recientes', value: activities.length, icon: <Zap className="w-6 h-6" />, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const chartData = projects.length > 0 ? projects.map(p => ({
    name: p.name.length > 10 ? p.name.slice(0, 10) + '...' : p.name,
    progress: p.progress,
  })) : [{ name: 'Sin proyectos', progress: 0 }];

  const statusDistribution = [
    { name: 'Activos', value: projects.filter(p => p.status === 'active').length, color: '#6366f1' },
    { name: 'En Pausa', value: projects.filter(p => p.status === 'on_hold').length, color: '#f59e0b' },
    { name: 'Archivados', value: projects.filter(p => p.status === 'archived').length, color: '#94a3b8' },
  ].filter(i => i.value > 0);

  if (statusDistribution.length === 0) statusDistribution.push({ name: 'Vacío', value: 1, color: '#e2e8f0' });

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-card p-8 bg-white border-slate-100 hover-glow group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                {stat.icon}
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Bar Chart Summary */}
        <div className="lg:col-span-2 glass-card p-8 bg-white border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Progreso por Proyecto</h3>
            <button className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest hover:text-indigo-700">Actualizar</button>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                />
                <Bar dataKey="progress" radius={[10, 10, 0, 0]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart Distribution */}
        <div className="glass-card p-8 bg-white border-slate-100">
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mb-10">Distribución de Estado</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[10%] text-center pointer-events-none">
              <span className="text-4xl font-black text-slate-900 leading-none">{projects.length}</span>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Total</p>
            </div>
          </div>
          <div className="mt-10 space-y-4">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.name}</span>
                </div>
                <span className="text-sm font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity Mini List */}
      <div className="glass-card p-8 bg-white border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Actividad en Tiempo Real</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Traza de cambios en tus desarrollos</p>
          </div>
          <button className="flex items-center gap-2 text-xs font-extrabold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-all">
            Ver todo <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {activities.length > 0 ? activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="flex items-center gap-6 p-4 rounded-3xl hover:bg-slate-50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                <Zap className="w-5 h-5 text-slate-400 group-hover:text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-black text-slate-800">
                    {activity.action === 'created_issue' ? 'Nuevo Issue' :
                      activity.action === 'project_created' ? 'Proyecto Iniciado' :
                        activity.action === 'status_updated' ? 'Estado Actualizado' : activity.action}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-300">{new Date(activity.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Sistema registró actividad en <span className="text-indigo-600 font-bold">{activity.projectName}</span>
                </p>
              </div>
            </div>
          )) : (
            <div className="py-10 text-center text-slate-300">
              <PlusCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-bold">Sin actividad reciente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
