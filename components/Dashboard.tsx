
import React from 'react';
import { Project, Task, Activity, ProjectStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  projects: Project[];
  tasks: Task[];
  activities: Activity[];
}

const Dashboard: React.FC<DashboardProps> = ({ projects, tasks, activities }) => {
  const stats = [
    { label: 'Total Projects', value: projects.length, icon: 'fa-folder', color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'Done').length, icon: 'fa-list-check', color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Completed', value: projects.filter(p => p.status === ProjectStatus.COMPLETED).length, icon: 'fa-circle-check', color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Upcoming Deadlines', value: 2, icon: 'fa-calendar-day', color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  const chartData = projects.map(p => ({
    name: p.name,
    progress: p.progress,
  }));

  const statusDistribution = [
    { name: 'Active', value: projects.filter(p => p.status === ProjectStatus.ACTIVE).length, color: '#2563eb' },
    { name: 'On Hold', value: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length, color: '#f59e0b' },
    { name: 'Planning', value: projects.filter(p => p.status === ProjectStatus.PLANNING).length, color: '#6366f1' },
    { name: 'Completed', value: projects.filter(p => p.status === ProjectStatus.COMPLETED).length, color: '#10b981' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center text-xl`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6">Project Progress (%)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563eb' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6">Status Distribution</h3>
          <div className="h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-800">{projects.length}</span>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {statusDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Recent Activities</h3>
          <button className="text-sm text-blue-600 font-semibold hover:underline">View all</button>
        </div>
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-bolt text-slate-400 text-sm"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  <span className="text-blue-600">{activity.user}</span> {activity.action} in <span className="font-bold">{activity.projectName}</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
