
import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import TaskList from './TaskList';
import KanbanView from './KanbanView';
import { LayoutGrid, List } from 'lucide-react';

interface TasksPageProps {
    tasks: Task[];
    onSelectTask: (taskId: string) => void;
    onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

const TasksPage: React.FC<TasksPageProps> = ({ tasks, onSelectTask, onUpdateTaskStatus }) => {
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vista de Tareas</p>
                </div>

                <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
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
                <TaskList tasks={tasks} onSelectTask={onSelectTask} />
            ) : (
                <KanbanView
                    tasks={tasks}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                    onSelectTask={onSelectTask}
                />
            )}
        </div>
    );
};

export default TasksPage;
