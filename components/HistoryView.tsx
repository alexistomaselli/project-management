
import React from 'react';
import { Activity } from '../types';

interface HistoryViewProps {
  activities: Activity[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ activities }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-1">
          {activities.map((activity, idx) => (
            <div key={activity.id} className={`flex gap-6 p-6 ${idx !== activities.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group hover:border-blue-200 hover:bg-blue-50 transition-all">
                  <i className="fa-solid fa-clock-rotate-left text-slate-400 group-hover:text-blue-500"></i>
                </div>
                {idx !== activities.length - 1 && <div className="w-px h-full bg-slate-100 mt-2"></div>}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">{activity.projectName}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <i className="fa-regular fa-clock"></i>
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                <h4 className="text-lg font-medium text-slate-800">{activity.action}</h4>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                    <i className="fa-solid fa-user-pen"></i>
                    {activity.user}
                  </div>
                  <div className="text-xs text-slate-400">ID: {activity.id}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;
