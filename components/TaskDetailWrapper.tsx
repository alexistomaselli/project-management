
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TaskDetail from './TaskDetail';
import { Project, Task } from '../types';

interface TaskDetailWrapperProps {
    tasks: Task[];
    projects: Project[];
    comments: any[];
    onRefresh: () => void;
}

const TaskDetailWrapper: React.FC<TaskDetailWrapperProps> = ({ tasks, projects, comments, onRefresh }) => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const task = tasks.find((t) => t.id === taskId);
    const project = task ? projects.find((p) => p.id === task.projectId) : undefined;

    if (!task) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Tarea no encontrada</h2>
                <button
                    onClick={() => navigate('/tasks')}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                >
                    Volver a Tareas
                </button>
            </div>
        );
    }

    return (
        <TaskDetail
            task={task}
            project={project}
            comments={comments}
            onBack={() => navigate(-1)}
            onRefresh={onRefresh}
        />
    );
};

export default TaskDetailWrapper;
