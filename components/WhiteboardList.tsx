
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Whiteboard } from '../types';
import {
    Plus,
    Layout,
    MoreVertical,
    Trash2,
    Edit2,
    Clock,
    Search,
    Loader2,
    Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WhiteboardEditor from './WhiteboardEditor';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

interface WhiteboardListProps {
    projectId: string;
}

import { createPortal } from 'react-dom';

const WhiteboardList: React.FC<WhiteboardListProps> = ({ projectId }) => {
    const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBoard, setSelectedBoard] = useState<Whiteboard | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const { showToast, confirmAction } = useVisualFeedback();

    useEffect(() => {
        fetchWhiteboards();
    }, [projectId]);

    const fetchWhiteboards = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .select('*')
                .eq('project_id', projectId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setWhiteboards((data || []).map(b => ({
                id: b.id,
                projectId: b.project_id,
                name: b.name,
                data: b.data,
                createdAt: b.created_at,
                updatedAt: b.updated_at
            })));
        } catch (error) {
            console.error('Error fetching whiteboards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .insert([{
                    project_id: projectId,
                    name: newName.trim(),
                    data: {}
                }])
                .select()
                .limit(1);

            if (error) throw error;
            const createdBoard = data && data.length > 0 ? data[0] : null;
            setIsCreateOpen(false);
            setNewName('');
            await fetchWhiteboards();
            showToast('Pizarra creada', `Se ha generado el lienzo "${createdBoard?.name}" exitosamente.`, 'success');
        } catch (error: any) {
            console.error('Error creating whiteboard:', error);
            showToast('Error', error.message || 'No se pudo crear la pizarra.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDuplicate = async (board: Whiteboard) => {
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .insert([{
                    project_id: projectId,
                    name: `${board.name} (Copia)`,
                    data: board.data
                }])
                .select()
                .limit(1);

            if (error) throw error;
            const duplicatedBoard = data && data.length > 0 ? data[0] : null;
            await fetchWhiteboards();
            showToast('Pizarra duplicada', `Se ha creado una copia de "${board.name}".`, 'success');
        } catch (error: any) {
            console.error('Error duplicating whiteboard:', error);
            showToast('Error al duplicar', error.message || 'No se pudo duplicar la pizarra.', 'error');
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
                    fetchWhiteboards();
                    showToast('Pizarra eliminada', 'El lienzo ha sido removido del sistema.', 'success');
                } catch (error: any) {
                    console.error('Error deleting whiteboard:', error);
                    showToast('Error al eliminar', error.message || 'No se pudo completar la operación.', 'error');
                }
            }
        });
    };

    return (
        <div className="space-y-8">
            {selectedBoard && createPortal(
                <WhiteboardEditor
                    whiteboard={selectedBoard}
                    onBack={() => {
                        setSelectedBoard(null);
                        fetchWhiteboards();
                    }}
                />,
                document.body
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Pizarras del Proyecto</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Lluvia de ideas y diagramas</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    <span>Crear Pizarra</span>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Sincronizando lienzos...</p>
                </div>
            ) : whiteboards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Layout className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl">No hay pizarras</h3>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm font-medium">Crea tu primera pizarra para empezar a diagramar la arquitectura del proyecto.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {whiteboards.map((board) => (
                        <div
                            key={board.id}
                            className="bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all group relative cursor-pointer"
                            onClick={() => setSelectedBoard(board)}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                                    <Layout className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDuplicate(board);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-indigo-50 text-slate-300 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                                        title="Duplicar Pizarra"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(board.id);
                                        }}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                                        title="Eliminar Pizarra"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <h4 className="text-lg font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{board.name}</h4>

                            <div className="flex items-center gap-4 text-slate-400">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{new Date(board.updatedAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Status: Ready</span>
                                <div className="flex -space-x-2">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="w-6 h-6 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                                            A
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
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
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-[3rem] p-10 w-full max-w-md relative z-[121] shadow-2xl border border-slate-100"
                        >
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Nueva Pizarra</h3>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-8">Nombra este nuevo lienzo</p>

                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej: Arquitectura Cloud v2"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 mb-8"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />

                            <div className="flex gap-4">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isCreating}
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? 'Iniciando...' : 'Crear Lienzo'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setNewName('');
                                    }}
                                    className="flex-1 bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhiteboardList;
