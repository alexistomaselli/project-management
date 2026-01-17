
import React from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { CheckCircle2, Circle, Clock, AlertTriangle, User } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onSelectTask?: (taskId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onSelectTask }) => {
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'review': return <Clock className="w-5 h-5 text-indigo-500" />;
      case 'todo': return <Circle className="w-5 h-5 text-slate-300" />;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Issue / Tarea</th>
                <th className="px-8 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Prioridad</th>
                <th className="px-8 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Responsable</th>
                <th className="px-8 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-6 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask?.(task.id)}
                  className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(task.status)}
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">
                          ID: {task.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${getPriorityBadge(task.priority)}`}>
                      {task.priority || 'medium'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-sm">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee || 'Un'}`} alt="avatar" />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{task.assignee || 'Sin asignar'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-400">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Próximamente'}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-emerald-500' :
                        task.status === 'in_progress' ? 'bg-amber-500' :
                          task.status === 'review' ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}></span>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                        {task.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400">
          <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold">No hay issues registrados.</p>
          <p className="text-sm">Todo está en orden.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;
