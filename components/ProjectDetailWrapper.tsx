
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectDetail from './ProjectDetail';
import { Project, Task, Activity } from '../types';

interface ProjectDetailWrapperProps {
    projects: Project[];
    tasks: Task[];
    activities: Activity[];
}

const ProjectDetailWrapper: React.FC<ProjectDetailWrapperProps> = ({ projects, tasks, activities }) => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const project = projects.find((p) => p.id === projectId);

    if (!project) {
        return (
            <div className="p-10 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Proyecto no encontrado</h2>
                <button
                    onClick={() => navigate('/projects')}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                >
                    Volver a Proyectos
                </button>
            </div>
        );
    }

    return (
        <ProjectDetail
            project={project}
            tasks={tasks}
            activities={activities}
            onBack={() => navigate('/projects')}
            onSelectTask={(taskId) => navigate(`/tasks/${taskId}`)}
        />
    );
};

export default ProjectDetailWrapper;
