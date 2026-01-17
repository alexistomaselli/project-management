
import React from 'react';
import { Terminal, Code, Book, Search, ChevronRight, Copy, Check } from 'lucide-react';

const DocsView: React.FC = () => {
    const [copied, setCopied] = React.useState<string | null>(null);

    const tools = [
        {
            name: "add_project",
            description: "Añade un nuevo proyecto de software al sistema de gestión central.",
            params: {
                name: "Nombre del proyecto (Obligatorio)",
                description: "Descripción detallada",
                repository_url: "URL del repositorio (GitHub/GitLab)"
            },
            example: 'Añade un nuevo proyecto llamado "Sistema de Logística" con la URL https://github.com/user/repo'
        },
        {
            name: "add_issue",
            description: "Crea un nuevo issue, bug o tarea para un proyecto específico.",
            params: {
                project_name: "Nombre exacto o parcial del proyecto",
                title: "Título del issue",
                description: "Descripción detallada",
                priority: "low | medium | high | urgent"
            },
            example: 'Crea un issue de prioridad alta en el proyecto Logística titulado "Error en autenticación"'
        },
        {
            name: "update_issue_status",
            description: "Actualiza el estado de un issue existente.",
            params: {
                issue_id: "ID (UUID) del issue",
                status: "todo | in_progress | review | done"
            },
            example: 'Pasa el issue 550e8400-e29b-41d4-a716-446655440000 a estado done'
        },
        {
            name: "list_all_projects",
            description: "Lista todos los proyectos de software gestionados actualmente.",
            params: {},
            example: 'Muéstrame todos mis proyectos activos'
        },
        {
            name: "get_project_details",
            description: "Obtén información detallada de un proyecto, incluyendo issues y actividad reciente.",
            params: {
                project_name: "Nombre del proyecto"
            },
            example: 'Dame los detalles del proyecto Sistema de Logística'
        },
        {
            name: "add_issue_comment",
            description: "Añade un comentario técnico o sugerencia a un issue específico.",
            params: {
                issue_id: "ID (UUID) del issue",
                author_name: "Tu nombre o 'Assistant'",
                content: "Contenido del comentario"
            },
            example: 'Añade un comentario al issue del login diciendo que el fix ya está en producción'
        }
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-10 animate-fadeIn">
            <div className="glass-card p-10 bg-white border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Book className="w-64 h-64 -rotate-12" />
                </div>

                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                            <Terminal className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Documentación de Comandos MCP</h2>
                    </div>
                    <p className="text-slate-500 text-lg leading-relaxed">
                        ProjectCentral utiliza el estándar <span className="text-indigo-600 font-bold underline decoration-indigo-200">Model Context Protocol</span> para permitir que la IA interactúe directamente con tu base de datos. Puedes usar estos comandos en lenguaje natural desde el chat lateral.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {tools.map((tool) => (
                    <div key={tool.name} className="glass-card p-8 bg-white border-slate-100 hover:shadow-2xl hover:shadow-indigo-100 transition-all group">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-mono">
                                    <Code className="w-5 h-5" />
                                </div>
                                <h3 className="text-lg font-black text-slate-800">{tool.name}</h3>
                            </div>
                            <button
                                onClick={() => copyToClipboard(tool.name)}
                                className="text-slate-300 hover:text-indigo-600 transition-colors"
                            >
                                {copied === tool.name ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>

                        <p className="text-sm text-slate-500 leading-relaxed mb-6 font-medium">
                            {tool.description}
                        </p>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Parámetros Inteligentes</h4>
                            {Object.keys(tool.params).length > 0 ? (
                                <div className="grid grid-cols-1 gap-2">
                                    {Object.entries(tool.params).map(([key, val]) => (
                                        <div key={key} className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-xs font-black text-indigo-600 font-mono">{key}</span>
                                            <span className="text-[11px] text-slate-500 font-medium">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No requiere parámetros adicionales.</p>
                            )}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Ejemplo de Uso Natural</p>
                            <div className="p-4 bg-indigo-600 rounded-2xl text-white text-xs font-medium relative group-hover:shadow-lg group-hover:shadow-indigo-200 transition-all">
                                <div className="flex gap-2">
                                    <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />
                                    <span>"{tool.example}"</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DocsView;
