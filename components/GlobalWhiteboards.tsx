
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Whiteboard, Project } from '../types';
import {
    Plus,
    Layout,
    Trash2,
    Clock,
    Loader2,
    Palette,
    Search,
    Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WhiteboardEditor from './WhiteboardEditor';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import { createPortal } from 'react-dom';

interface GlobalWhiteboardsProps {
    searchQuery: string;
}

const GlobalWhiteboards: React.FC<GlobalWhiteboardsProps> = ({ searchQuery: globalSearchQuery }) => {
    const [whiteboards, setWhiteboards] = useState<(Whiteboard & { projectName?: string })[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBoard, setSelectedBoard] = useState<Whiteboard | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState('');

    const { showToast, confirmAction } = useVisualFeedback();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch projects first for the dropdown
            const { data: projData } = await supabase.from('projects').select('id, name');
            if (projData) setProjects(projData as any);

            // Fetch whiteboards with project info
            const { data: boardData, error } = await supabase
                .from('whiteboards')
                .select('*, projects(name)')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            setWhiteboards((boardData || []).map(b => ({
                id: b.id,
                projectId: b.project_id,
                projectName: b.projects?.name,
                name: b.name,
                data: b.data,
                createdAt: b.created_at,
                updatedAt: b.updated_at
            })));
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim() || !selectedProjectId) {
            showToast('Campos requeridos', 'Debes elegir un nombre y un proyecto.', 'error');
            return;
        }
        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .insert([{
                    project_id: selectedProjectId,
                    name: newName.trim(),
                    data: {}
                }])
                .select()
                .limit(1);

            if (error) throw error;
            const createdBoard = data && data.length > 0 ? data[0] : null;
            setIsCreateOpen(false);
            setNewName('');
            await fetchData();
            showToast('Pizarra creada', `Se ha generado el lienzo "${createdBoard?.name}" exitosamente.`, 'success');
        } catch (error: any) {
            console.error('Error creating whiteboard:', error);
            showToast('Error', error.message || 'No se pudo crear la pizarra.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        confirmAction({
            title: 'Eliminar Pizarra',
            message: '¿Estás seguro de que deseas eliminar esta pizarra de forma permanente? Esta acción borrará todos los diagramas y no se puede deshacer.',
            confirmLabel: 'Eliminar Pizarra',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('whiteboards')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    await fetchData();
                    showToast('Pizarra eliminada', 'El lienzo ha sido removido del sistema.', 'success');
                } catch (error: any) {
                    console.error('Error deleting whiteboard:', error);
                    showToast('Error al eliminar', error.message || 'No se pudo completar la operación.', 'error');
                }
            }
        });
    };

    const filteredBoards = whiteboards.filter(b => {
        const matchesGlobal = b.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            b.projectName?.toLowerCase().includes(globalSearchQuery.toLowerCase());
        return matchesGlobal;
    });

    return (
        <div className="space-y-8 animate-fadeIn">
            {selectedBoard && createPortal(
                <WhiteboardEditor
                    whiteboard={selectedBoard}
                    onBack={() => {
                        setSelectedBoard(null);
                        fetchData();
                    }}
                />,
                document.body
            )}

            <div className="flex justify-end mb-6">
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Pizarra</span>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 grayscale opacity-50">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Sincronizando el taller creativo...</p>
                </div>
            ) : filteredBoards.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <Palette className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-black text-2xl">Lienzo en Blanco</h3>
                    <p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm font-bold uppercase tracking-wide">
                        {globalSearchQuery || localSearchQuery ? 'No encontramos pizarras con ese nombre.' : 'Aún no tienes pizarras globales. Crea una conectada a un proyecto para empezar.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredBoards.map((board) => (
                        <motion.div
                            key={board.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-[3rem] p-8 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all group relative cursor-pointer overflow-hidden"
                            onClick={() => setSelectedBoard(board)}
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(board.id);
                                    }}
                                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white shadow-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                <Palette className="w-7 h-7" />
                            </div>

                            <h4 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{board.name}</h4>

                            <div className="flex flex-col gap-3 mt-4">
                                <div className="flex items-center gap-2">
                                    <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none block">{board.projectName || 'Sin Proyecto'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{new Date(board.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">A</div>
                                </div>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">v2.0 Stable</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreateOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 30 }}
                            className="bg-white rounded-[4rem] p-12 w-full max-w-lg relative z-[121] shadow-2xl border border-slate-100"
                        >
                            <div className="flex items-center gap-5 mb-10">
                                <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-100">
                                    <Plus className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Nueva Pizarra</h3>
                                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Conecta tu idea a un proyecto</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Título del Lienzo</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Ej: Flujo de Autenticación"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-8 py-5 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Asociar a Proyecto</label>
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] px-8 py-5 text-sm font-black focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecciona un proyecto...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 mt-12">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || !selectedProjectId || isCreating}
                                    className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? 'Sincronizando...' : 'Empezar a Dibujar'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setNewName('');
                                    }}
                                    className="flex-1 bg-slate-50 text-slate-600 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalWhiteboards;
