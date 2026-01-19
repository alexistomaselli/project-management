
import React, { useState } from 'react';
import { Task, TaskStatus, Project } from '../types';
import TaskList from './TaskList';
import KanbanView from './KanbanView';
import { LayoutGrid, List, Filter, ChevronDown } from 'lucide-react';

interface TasksPageProps {
    tasks: Task[];
    projects: Project[];
    onSelectTask: (taskId: string) => void;
    onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
    onDeleteTask: (taskId: string) => Promise<void>;
}

const TasksPage: React.FC<TasksPageProps> = ({ tasks, projects, onSelectTask, onUpdateTaskStatus, onDeleteTask }) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

    const filteredTasks = selectedProjectId === 'all'
        ? tasks
        : tasks.filter(t => t.projectId === selectedProjectId);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vista de Tareas</p>
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <Filter className="w-4 h-4" />
                        </div>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl pl-11 pr-10 py-2.5 text-sm font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm hover:border-slate-300 min-w-[200px]"
                        >
                            <option value="all">Todos los Proyectos</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <ChevronDown className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm self-start md:self-auto">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <List className="w-4 h-4" />
                        Lista
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Kanban
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <TaskList
                    tasks={filteredTasks}
                    projects={projects}
                    onSelectTask={onSelectTask}
                    onDeleteTask={onDeleteTask}
                />
            ) : (
                <KanbanView
                    tasks={filteredTasks}
                    projects={projects}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                    onSelectTask={onSelectTask}
                    onDeleteTask={onDeleteTask}
                />
            )}
        </div>
    );
};

export default TasksPage;
