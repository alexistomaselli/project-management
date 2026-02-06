import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { Project } from '../types';
import MediaManager from './MediaManager';
import { Folder, Film, Loader2 } from 'lucide-react';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

const GlobalMediaView: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { showToast } = useVisualFeedback();

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                setProjects(data || []);

                // Auto-select first project if available
                if (data && data.length > 0) {
                    setSelectedProjectId(data[0].id);
                }
            } catch (err) {
                console.error('Error fetching projects for media:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Enlace Copiado', 'El código Markdown ha sido copiado al portapapeles.', 'success');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 w-full h-[calc(100vh-140px)] flex gap-6"
        >
            {/* Sidebar de Proyectos */}
            <div className="w-72 bg-white rounded-[2rem] border border-[#F1F5F9] shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-indigo-500" />
                        <span>Carpetas</span>
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {isLoading ? (
                        <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${selectedProjectId === project.id
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <span className="truncate">{project.name}</span>
                            {selectedProjectId === project.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Area Principal */}
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-xl shadow-slate-100/50 border border-[#F1F5F9] overflow-hidden flex flex-col relative">
                {selectedProjectId ? (
                    <MediaManager
                        projectId={selectedProjectId}
                        onSelectImage={copyToClipboard}
                        isInline={true}
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                            <Film className="w-10 h-10" />
                        </div>
                        <p className="font-bold text-lg">Selecciona un proyecto</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default GlobalMediaView;
