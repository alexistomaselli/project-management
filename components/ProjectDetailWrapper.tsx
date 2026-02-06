
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectDetail from './ProjectDetail';
import { Project, Task, Activity, Priority } from '../types';

interface ProjectDetailWrapperProps {
    projects: Project[];
    tasks: Task[];
    activities: Activity[];
    onDeleteProject: (id: string) => void;
    onCreateIssue: (projectId: string, title: string, description: string, priority: Priority, assignees: string[], dueDate: string) => void;
    onDeleteTask: (taskId: string) => Promise<void>;
    onRenameProject: (projectId: string, newName: string) => Promise<void>;
}

const ProjectDetailWrapper: React.FC<ProjectDetailWrapperProps> = ({
    projects,
    tasks,
    activities,
    onDeleteProject,
    onCreateIssue,
    onDeleteTask,
    onRenameProject
}) => {
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
            projects={projects}
            tasks={tasks}
            activities={activities}
            onBack={() => navigate('/projects')}
            onSelectTask={(taskId) => navigate(`/tasks/${taskId}`)}
            onDelete={() => onDeleteProject(project.id)}
            onCreateIssue={onCreateIssue}
            onDeleteTask={onDeleteTask}
            onRenameProject={onRenameProject}
        />
    );
};

export default ProjectDetailWrapper;
