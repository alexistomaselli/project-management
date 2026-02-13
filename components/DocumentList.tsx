import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ProjectDoc, DocType } from '../types';
import {
    Plus,
    FileText,
    MoreVertical,
    Trash2,
    Edit2,
    Clock,
    Search,
    Loader2,
    ExternalLink,
    FileType,
    Calendar,
    Upload,
    Play,
    Pause,
    Volume2,
    AlertCircle,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import * as mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';

interface DocumentListProps {
    projectId: string;
    onSelectDoc: (doc: ProjectDoc) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ projectId, onSelectDoc }) => {
    const [docs, setDocs] = useState<ProjectDoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<DocType>('draft');
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [playingDocId, setPlayingDocId] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const audioRefList = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { showToast, confirmAction } = useVisualFeedback();

    useEffect(() => {
        fetchDocs();
    }, [projectId]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_docs')
                .select('*')
                .eq('project_id', projectId)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setDocs((data || []).map(d => ({
                id: d.id,
                projectId: d.project_id,
                taskId: d.task_id,
                title: d.title,
                content: d.content || '',
                type: d.type as DocType,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
                audio_url: d.audio_url,
                audio_generated_at: d.audio_generated_at
            })));
        } catch (error) {
            console.error('Error fetching docs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        showToast('Procesando DOCX', 'Extrayendo texto e imágenes...', 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();

            // Custom image handler to upload images to Supabase
            const options = {
                convertImage: mammoth.images.imgElement(async (image) => {
                    const buffer = await image.read();
                    const contentType = image.contentType;
                    const extension = contentType.split('/')[1] || 'png';
                    const fileName = `${projectId}/${uuidv4()}.${extension}`;

                    const { data, error } = await supabase.storage
                        .from('project-assets')
                        .upload(fileName, buffer, { contentType });

                    if (error) {
                        console.error('Error uploading image:', error);
                        return { src: "" };
                    }

                    const { data: { publicUrl } } = supabase.storage
                        .from('project-assets')
                        .getPublicUrl(fileName);

                    return {
                        src: publicUrl
                    };
                })
            };

            const result = await mammoth.convertToHtml({ arrayBuffer }, options);
            const html = result.value;
            const docTitle = file.name.replace('.docx', '');

            // Convert HTML to simple Markdown-ish structure or just keep as HTML (the editor handles HTML too since it's prose)
            // But let's wrap it nicely
            const finalContent = `# ${docTitle}\n\n${html}`;

            const { data: newDocData, error } = await supabase
                .from('project_docs')
                .insert([{
                    project_id: projectId,
                    title: docTitle,
                    content: finalContent,
                    type: 'draft'
                }])
                .select()
                .limit(1);

            if (error) throw error;
            const newDoc = newDocData && newDocData.length > 0 ? newDocData[0] : null;

            showToast('DOCX Importado', `"${docTitle}" se ha cargado con éxito con sus imágenes.`, 'success');
            await fetchDocs();
            if (newDoc) {
                onSelectDoc({
                    id: newDoc.id,
                    projectId: newDoc.project_id,
                    taskId: newDoc.task_id,
                    title: newDoc.title,
                    content: newDoc.content,
                    type: newDoc.type as DocType,
                    createdAt: newDoc.created_at,
                    updatedAt: newDoc.updated_at
                });
            }

        } catch (err: any) {
            console.error('Error importing DOCX:', err);
            showToast('Error de importación', err.message || 'No se pudo procesar el archivo.', 'error');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('project_docs')
                .insert([{
                    project_id: projectId,
                    title: newName.trim(),
                    content: '# ' + newName.trim() + '\n\nEscribe aquí el contenido...',
                    type: newType
                }])
                .select()
                .limit(1);

            if (error) throw error;
            const docData = data && data.length > 0 ? data[0] : null;
            setIsCreateOpen(false);
            setNewName('');
            await fetchDocs();

            // Record activity
            if (docData) {
                await supabase.from('activities').insert([{
                    project_id: projectId,
                    action: 'doc_created',
                    details: {
                        title: docData.title,
                        type: docData.type,
                        doc_id: docData.id
                    }
                }]);

                showToast('Documento creado', `Se ha generado "${docData?.title}" exitosamente.`, 'success');
                onSelectDoc({
                    id: docData.id,
                    projectId: docData.project_id,
                    taskId: docData.task_id,
                    title: docData.title,
                    content: docData.content,
                    type: docData.type as DocType,
                    createdAt: docData.created_at,
                    updatedAt: docData.updated_at
                });
            }
        } catch (error: any) {
            console.error('Error creating doc:', error);
            showToast('Error', error.message || 'No se pudo crear el documento.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        confirmAction({
            title: 'Eliminar Documento',
            message: '¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('project_docs')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    fetchDocs();
                    showToast('Documento eliminado', 'El documento ha sido removido.', 'success');
                } catch (error: any) {
                    console.error('Error deleting doc:', error);
                    showToast('Error', error.message || 'No se pudo eliminar.', 'error');
                }
            }
        });
    };

    const filteredDocs = docs.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleQuickPlay = (e: React.MouseEvent, doc: ProjectDoc) => {
        e.stopPropagation();

        if (playingDocId === doc.id) {
            if (audioRefList.current?.paused) {
                audioRefList.current.play();
            } else {
                audioRefList.current?.pause();
            }
            return;
        }

        if (audioRefList.current) {
            audioRefList.current.pause();
            audioRefList.current.ontimeupdate = null;
            audioRefList.current.onloadedmetadata = null;
        }

        if (doc.audio_url) {
            if (!audioRefList.current) {
                audioRefList.current = new Audio(doc.audio_url);
            } else {
                audioRefList.current.src = doc.audio_url;
            }

            audioRefList.current.playbackRate = playbackSpeed;
            audioRefList.current.onended = () => {
                setPlayingDocId(null);
                setCurrentTime(0);
            };

            audioRefList.current.ontimeupdate = () => {
                if (audioRefList.current) {
                    setCurrentTime(audioRefList.current.currentTime);
                }
            };

            audioRefList.current.onloadedmetadata = () => {
                if (audioRefList.current) {
                    setDuration(audioRefList.current.duration);
                }
            };

            audioRefList.current.play();
            setPlayingDocId(doc.id);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRefList.current) {
            audioRefList.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const togglePlaybackSpeed = () => {
        const speeds = [1, 1.5, 2];
        const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
        if (audioRefList.current) {
            audioRefList.current.playbackRate = nextSpeed;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const playingDoc = docs.find(d => d.id === playingDocId);

    return (
        <div className="space-y-8">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".docx"
                onChange={handleDocxUpload}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight text-premium-indigo-gradient">DraftDocs</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Conocimiento Centralizado del Proyecto</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar doc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-2 bg-white border-2 border-slate-100 text-slate-600 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>Importar DOCX</span>
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Doc</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">Sincronizando biblioteca...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-900 font-black text-xl">Sin documentos</h3>
                    <p className="text-slate-400 mt-2 max-w-xs mx-auto text-sm font-medium">Define el alcance, arquitectura o minutas de este proyecto para centralizar el conocimiento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all group relative cursor-pointer"
                            onClick={() => onSelectDoc(doc)}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-inner ${doc.type === 'scope' ? 'bg-emerald-50 text-emerald-600' :
                                    doc.type === 'technical' ? 'bg-indigo-50 text-indigo-600' :
                                        doc.type === 'requirements' ? 'bg-amber-50 text-amber-600' :
                                            'bg-slate-50 text-slate-600'
                                    }`}>
                                    <FileType className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => handleDelete(e, doc.id)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    {doc.audio_url && (
                                        <button
                                            onClick={(e) => handleQuickPlay(e, doc)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all shadow-sm ${playingDocId === doc.id
                                                ? 'bg-indigo-600 text-white animate-pulse'
                                                : 'bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-50'
                                                }`}
                                            title={playingDocId === doc.id ? 'Pausar' : 'Reproducir Audio'}
                                        >
                                            {playingDocId === doc.id && !audioRefList.current?.paused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                                        </button>
                                    )}
                                    {doc.audio_url && doc.audio_generated_at && new Date(doc.updatedAt) > new Date(doc.audio_generated_at) && (
                                        <div
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm"
                                            title="El texto ha cambiado desde la última generación audio"
                                        >
                                            <AlertCircle className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="inline-flex px-2 py-0.5 rounded-md bg-slate-50 text-[8px] font-black uppercase tracking-wider text-slate-400 mb-3 border border-slate-100">
                                {doc.type}
                            </div>

                            <h4 className="text-lg font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">{doc.title}</h4>

                            <div className="space-y-2 mt-4 pb-2">
                                <div className="flex items-center justify-between text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.15em]">Creado</span>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500">{new Date(doc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-[0.15em]">Modificado</span>
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-500">{new Date(doc.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                </div>
                                {doc.taskId && (
                                    <div className="flex items-center gap-1.5 text-indigo-500 bg-indigo-50/50 px-2 py-1 rounded-lg w-fit mt-2">
                                        <Edit2 className="w-2.5 h-2.5" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Enlazado a Tarea</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-slate-300 font-black text-[9px] uppercase tracking-widest group-hover:text-indigo-400">
                                <span>Ver Contenido</span>
                                <div className="flex items-center gap-4">
                                    {doc.audio_url && <Volume2 className={`w-3 h-3 ${playingDocId === doc.id ? 'text-indigo-600 animate-bounce' : 'text-slate-300'}`} />}
                                    <ExternalLink className="w-3 h-3" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Floating Player */}
            <AnimatePresence>
                {playingDocId && playingDoc && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-2xl"
                    >
                        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2.5rem] p-4 md:p-6 flex flex-col md:flex-row items-center gap-4 md:gap-8">
                            {/* Doc Info */}
                            <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                                    <Volume2 className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="text-sm font-black text-slate-900 truncate tracking-tight">{playingDoc.title}</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Reproduciendo Documento</p>
                                </div>
                            </div>

                            {/* Main Controls */}
                            <div className="flex-1 flex flex-col gap-2 w-full">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (audioRefList.current?.paused) audioRefList.current.play();
                                            else audioRefList.current?.pause();
                                            // Force state refresh if needed, but listeners should handle it
                                            setDocs([...docs]);
                                        }}
                                        className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-200"
                                    >
                                        {audioRefList.current?.paused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
                                    </button>

                                    <div className="flex-1 flex flex-col gap-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 0}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-[10px] font-black text-slate-400 tabular-nums">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={togglePlaybackSpeed}
                                        className="w-12 h-10 border-2 border-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all font-mono"
                                    >
                                        {playbackSpeed}x
                                    </button>
                                </div>
                            </div>

                            {/* Close */}
                            <button
                                onClick={() => {
                                    audioRefList.current?.pause();
                                    setPlayingDocId(null);
                                }}
                                className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-rose-50 text-slate-300 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100 group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Nuevo Documento</h3>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-8">Centraliza el alcance de tu proyecto</p>

                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Ej: Alcance de Fase 1"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Documento</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as DocType)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="scope">Alcance (Scope)</option>
                                        <option value="requirements">Requerimientos</option>
                                        <option value="technical">Arquitectura Técnica</option>
                                        <option value="meeting">Minuta de Reunión</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isCreating}
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isCreating ? 'Iniciando...' : 'Crear Documento'}
                                </button>
                                <button
                                    onClick={() => setIsCreateOpen(false)}
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

export default DocumentList;
