
import React from 'react';
import { Activity } from '../types';
import { Clock, History as HistoryIcon, User, Search, Filter } from 'lucide-react';

interface HistoryViewProps {
  activities: Activity[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ activities }) => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Registro de Auditoría</h2>
          <p className="text-sm text-slate-400 font-bold mt-1">Control de cambios y trazabilidad de proyectos</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar eventos..."
              className="bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>
      </div>

      <div className="glass-card bg-white border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-2">
          {activities.length > 0 ? activities.map((activity, idx) => (
            <div key={activity.id} className={`flex gap-8 p-10 ${idx !== activities.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/30 transition-all group`}>
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-[1.25rem] bg-indigo-50 flex items-center justify-center border-2 border-white shadow-md group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <HistoryIcon className="w-6 h-6 text-indigo-500 group-hover:text-white" />
                </div>
                {idx !== activities.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-4 rounded-full"></div>}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                      {activity.projectName}
                    </span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Event ID: {activity.id.slice(0, 12)}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>

                <h4 className="text-xl font-extrabold text-slate-800 mb-4 group-hover:text-indigo-600 transition-colors">
                  {activity.action === 'created_issue' ? '🚀 Nueva tarea creada' :
                    activity.action === 'status_updated' ? '🔄 Estado de issue actualizado' :
                      activity.action === 'project_created' ? '🆕 Nuevo proyecto registrado' : activity.action}
                </h4>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 shadow-sm">
                    <User className="w-3 h-3" />
                    {activity.user}
                  </div>
                  <div className="h-1 w-1 bg-slate-200 rounded-full"></div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Source: MCP Agent Pipeline
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-40 text-center flex flex-col items-center justify-center text-slate-300">
              <HistoryIcon className="w-16 h-16 mb-6 opacity-10" />
              <p className="text-xl font-black">Historial vacío</p>
              <p className="text-sm font-bold opacity-50">Toda actividad será registrada aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
