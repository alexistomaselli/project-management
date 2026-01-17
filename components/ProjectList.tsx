
import React from 'react';
import { Project, ProjectStatus } from '../types';
import { Layers, MoreVertical, Calendar, Globe } from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onSelect: (projectId: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelect }) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'on_hold': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'archived': return 'bg-slate-50 text-slate-700 border-slate-100';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onSelect(project.id)}
            className="glass-card hover-glow overflow-hidden group border-slate-100 bg-white cursor-pointer transition-transform active:scale-[0.98]"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getStatusColor(project.status)}`}>
                  {project.status}
                </div>
                <button className="text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
              </div>

              <p className="text-slate-500 text-sm leading-relaxed mb-8 line-clamp-2 h-10">
                {project.description || 'Sin descripción disponible.'}
              </p>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-400 font-bold uppercase tracking-tight">Progreso del Backend</span>
                    <span className="font-extrabold text-slate-900">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                    <Globe className="w-4 h-4" />
                    <span className="truncate max-w-[120px]">{project.repository_url ? 'GitHub Repo' : 'No Repo'}</span>
                  </div>
                  <div className="flex -space-x-3">
                    {[1, 2].map(i => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-2xl border-4 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden"
                      >
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Alex${i}`} alt="user" />
                      </div>
                    ))}
                    <div className="w-10 h-10 rounded-2xl border-4 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                      +
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center p-20 bg-white border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400">
          <Layers className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-bold">No hay proyectos activos.</p>
          <p className="text-sm">Usa el comando "add_project" en el chat MCP para empezar.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
