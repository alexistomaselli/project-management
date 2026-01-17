
import React, { useState } from 'react';
import { Activity } from '../types';
import { Clock, History as HistoryIcon, User, Search, Filter, List, Layout } from 'lucide-react';
import GlobalTimelineView from './GlobalTimelineView';

interface HistoryViewProps {
  activities: Activity[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ activities }) => {
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('timeline');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Trazabilidad de Actividad</h2>
          <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest opacity-70">Control de cambios y flujo global de proyectos</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <List className="w-4 h-4" />
              <span>Listado</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'timeline'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <Layout className="w-4 h-4" />
              <span>Timeline</span>
            </button>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar eventos..."
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none w-64 shadow-sm transition-all"
              />
            </div>
            <button className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-3 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm uppercase tracking-widest active:scale-95">
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        <GlobalTimelineView activities={activities} />
      ) : (
        <div className="glass-card bg-white border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="p-2">
            {activities.length > 0 ? [...activities].reverse().map((activity, idx) => (
              <div key={activity.id} className={`flex gap-8 p-10 ${idx !== activities.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/30 transition-all group relative overflow-hidden`}>
                {/* Decorative background element for hover */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="flex flex-col items-center shrink-0">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center border-2 border-white shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-indigo-200 group-hover:shadow-xl transition-all duration-300">
                    <HistoryIcon className="w-7 h-7 text-slate-400 group-hover:text-white" />
                  </div>
                  {idx !== activities.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-4 rounded-full"></div>}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-100">
                        {activity.projectName}
                      </div>
                      <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Event ID: {activity.id.slice(0, 12)}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-lg">
                      <Clock className="w-4 h-4 text-indigo-400" />
                      {new Date(activity.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <h4 className="text-2xl font-black text-slate-800 mb-5 group-hover:text-indigo-600 transition-colors">
                    {activity.action === 'issue_created' ? '🚀 Nueva tarea creada' :
                      activity.action === 'status_updated' ? '🔄 Estado de hito actualizado' :
                        activity.action === 'project_created' ? '🆕 Nuevo proyecto registrado' :
                          activity.action === 'task_updated' ? '📝 Modificación de descripción' :
                            activity.action === 'commented' ? '💬 Feedback añadido' : activity.action}
                  </h4>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2.5 px-5 py-2 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100 shadow-sm group-hover:bg-white group-hover:border-indigo-100 transition-all">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-slate-700">{activity.user}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Procedencia:</span>
                      <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Agentic Pipeline</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-60 text-center flex flex-col items-center justify-center text-slate-300">
                <div className="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8">
                  <HistoryIcon className="w-16 h-16 opacity-10" />
                </div>
                <p className="text-2xl font-black text-slate-900 mb-2">Historial Silencioso</p>
                <p className="text-sm font-bold opacity-50 uppercase tracking-widest">Toda la actividad de la organización se centralizará aquí</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
