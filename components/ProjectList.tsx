
import React from 'react';
import { Project, ProjectStatus } from '../types';

interface ProjectListProps {
  projects: Project[];
}

const ProjectList: React.FC<ProjectListProps> = ({ projects }) => {
  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE: return 'bg-blue-100 text-blue-700 border-blue-200';
      case ProjectStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case ProjectStatus.ON_HOLD: return 'bg-amber-100 text-amber-700 border-amber-200';
      case ProjectStatus.PLANNING: return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
          <i className="fa-solid fa-plus"></i> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <button className="text-slate-400 hover:text-slate-600">
                  <i className="fa-solid fa-ellipsis-vertical"></i>
                </button>
              </div>
              <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors mb-2">{project.name}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-6 h-10">{project.description}</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500 font-medium">Progress</span>
                    <span className="font-bold">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <i className="fa-regular fa-calendar-check"></i>
                    <span>{project.deadline}</span>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <img 
                        key={i}
                        src={`https://picsum.photos/seed/${project.id}${i}/40/40`} 
                        className="w-8 h-8 rounded-full border-2 border-white"
                        alt="Assignee"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectList;
