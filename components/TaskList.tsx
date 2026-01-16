
import React from 'react';
import { Task, TaskStatus } from '../types';

interface TaskListProps {
  tasks: Task[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.DONE: return 'bg-emerald-500';
      case TaskStatus.IN_PROGRESS: return 'bg-blue-500';
      case TaskStatus.TODO: return 'bg-slate-300';
      case TaskStatus.BLOCKED: return 'bg-rose-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Active Tasks</h2>
        <div className="flex gap-2">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Filter tasks..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Task</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Project ID</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Assignee</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusStyle(task.status)}`}></div>
                    <span className="font-semibold">{task.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 uppercase font-mono">{task.projectId}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <img src={`https://picsum.photos/seed/${task.assignee}/32/32`} className="w-6 h-6 rounded-full" alt="" />
                    <span className="text-sm font-medium">{task.assignee}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{task.dueDate}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                    task.status === TaskStatus.DONE ? 'bg-emerald-100 text-emerald-700' :
                    task.status === TaskStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
