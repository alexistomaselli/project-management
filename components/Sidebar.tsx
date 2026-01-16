
import React from 'react';

interface SidebarProps {
  activeTab: 'dashboard' | 'projects' | 'tasks' | 'history';
  setActiveTab: (tab: 'dashboard' | 'projects' | 'tasks' | 'history') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'projects', label: 'Projects', icon: 'fa-folder' },
    { id: 'tasks', label: 'Tasks', icon: 'fa-check-double' },
    { id: 'history', label: 'Activity', icon: 'fa-clock-rotate-left' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <i className="fa-solid fa-cube text-white"></i>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">NovaProject</span>
      </div>
      
      <nav className="flex-1 mt-6 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-800">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/50">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <i className="fa-solid fa-user text-blue-400"></i>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-white truncate">AntiGravity User</span>
            <span className="text-xs text-slate-500 truncate">Premium Account</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
