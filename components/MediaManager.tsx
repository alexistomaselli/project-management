
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Upload,
    Image as ImageIcon,
    Loader2,
    Trash2,
    Check,
    Copy,
    Maximize2,
    Link as LinkIcon,
    AlertTriangle,
    FileText,
    Paperclip
} from 'lucide-react';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import { v4 as uuidv4 } from 'uuid';
import FileViewer from './FileViewer';

interface MediaManagerProps {
    projectId: string;
    onClose?: () => void;
    onSelectImage: (markdown: string) => void;
    isInline?: boolean;
}

interface MediaFile {
    name: string;
    url: string;
    created_at: string;
    size: number;
    metadata: any;
    attachedToTask?: string;
    type: string;
}

const MediaManager: React.FC<MediaManagerProps> = ({ projectId, onClose, onSelectImage, isInline = false }) => {
    const [files, setFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [viewedImage, setViewedImage] = useState<MediaFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast, confirmAction } = useVisualFeedback();

    useEffect(() => {
        fetchFiles();
    }, [projectId]);

    const fetchFiles = async () => {
        try {
            setLoading(true);

            // 1. Fetch storage files
            const { data: storageFiles, error: storageError } = await supabase.storage
                .from('project-assets')
                .list(projectId + '/', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'created_at', order: 'desc' },
                });

            if (storageError) throw storageError;

            // 2. Fetch issue attachments metadata
            const { data: attachmentsData, error: dbError } = await supabase
                .from('issue_attachments')
                .select('*')
                .eq('project_id', projectId);

            if (dbError) console.error("Error fetching attachments metadata", dbError);

            // 3. Map storage files to include attachment info
            const mappedFiles = storageFiles.map(file => {
                const attachmentInfo = attachmentsData?.find(att => att.file_name === file.name);
                return {
                    name: file.name,
                    id: file.id,
                    updated_at: file.updated_at,
                    created_at: file.created_at,
                    last_accessed_at: file.last_accessed_at,
                    metadata: file.metadata,
                    size: file.metadata?.size || 0,
                    type: file.metadata?.mimetype || 'image/jpeg',
                    url: supabase.storage.from('project-assets').getPublicUrl(`${projectId}/${file.name}`).data.publicUrl,
                    // Add custom property for attachment context
                    attachedToTask: attachmentInfo ? attachmentInfo.issue_id : undefined
                };
            });

            setFiles(mappedFiles);
        } catch (error: any) {
            showToast('Error', 'No se pudieron cargar las imágenes.', 'error');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${projectId}/${uuidv4()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            showToast('Imagen subida', 'La imagen se añadió a la galería.', 'success');
            await fetchFiles();
        } catch (error: any) {
            console.error('Error uploading:', error);
            showToast('Error de subida', error.message, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const checkImageUsage = async (fileName: string): Promise<string[]> => {
        try {
            const { data: docs } = await supabase
                .from('project_docs')
                .select('title, content')
                .eq('project_id', projectId);

            if (!docs) return [];
            // Check if the filename is present in the document content
            // Filenames in storage are typically part of the URL stored in markdown
            return docs.filter(doc => doc.content && doc.content.includes(fileName)).map(doc => doc.title);
        } catch (err) {
            console.error("Error checking image usage", err);
            return [];
        }
    };

    const handleDelete = async (fileName: string) => {
        // First check if the image is used in any document
        const usedInDocs = await checkImageUsage(fileName);

        // Check if it's attached to a task (we need to find the file object first or pass it)
        // Since we are inside MediaManager and files state has the info:
        const fileRecord = files.find(f => f.name === fileName);
        const attachedToTask = fileRecord?.attachedToTask;

        const hasUsage = usedInDocs.length > 0 || !!attachedToTask;

        let message = '¿Estás seguro de borrar este archivo? Esta acción no se puede deshacer.';

        if (hasUsage) {
            message = `⚠️ ADVERTENCIA: Este archivo está en uso:\n`;
            if (usedInDocs.length > 0) {
                message += `\n- Documentos: ${usedInDocs.join(', ')}`;
            }
            if (attachedToTask) {
                message += `\n- Adjunto en una tarea (ID: ${attachedToTask.toString().slice(0, 4)}...)`;
            }
            message += `\n\nSi eliminas este archivo, se romperán los enlaces.`;
        }

        confirmAction({
            title: hasUsage ? '¡Archivo en Uso!' : 'Eliminar Archivo',
            message: message,
            confirmLabel: 'Borrar definitivamente',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    // 1. Remove from storage
                    const { error } = await supabase.storage
                        .from('project-assets')
                        .remove([`${projectId}/${fileName}`]);

                    if (error) throw error;

                    // 2. If it was an attachment, remove from DB record too (cascade might not handle storage deletion, but normally DB record should be deleted if we want to keep consistency. But here we are deleting the FILE. The DB record will point to nowhere. Ideally we delete DB record too.)
                    if (attachedToTask && fileRecord) {
                        // We'd need the attachment ID, but we usually map issues to get that.
                        // For now, let's just delete by filename/project
                        await supabase.from('issue_attachments')
                            .delete()
                            .eq('project_id', projectId)
                            .eq('file_name', fileName);
                    }

                    setFiles(prev => prev.filter(f => f.name !== fileName));
                    if (viewedImage?.name === fileName) setViewedImage(null);
                    showToast('Eliminado', 'Archivo borrado correctamente.', 'success');
                } catch (error: any) {
                    showToast('Error', error.message, 'error');
                }
            }
        });
    };

    const copyToClipboard = (text: string, type: 'url' | 'markdown') => {
        navigator.clipboard.writeText(text);
        showToast('Copiado', type === 'url' ? 'URL copiada al portapapeles' : 'Markdown copiado', 'success');
    };

    const getPreview = (file: MediaFile) => {
        if (file.type.startsWith('image/')) {
            return (
                <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
            );
        }
        return (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 group-hover:bg-slate-100 transition-colors">
                <FileText className="w-12 h-12 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>
        );
    };

    const GalleryContent = () => (
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 min-h-[400px]">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cargando galería...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-[2rem]">
                    <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="text-slate-900 font-bold">No hay archivos</p>
                    <p className="text-slate-400 text-sm mt-1">Sube archivos para usarlos en tus documentos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {files.map((file) => (
                        <div key={file.name} className="group relative bg-white p-3 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100">
                            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative mb-3 group-hover:ring-4 ring-indigo-50 transition-all">
                                {getPreview(file)}
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                    <button
                                        onClick={() => onSelectImage(
                                            file.type.startsWith('image/')
                                                ? `![${file.name}](${file.url})`
                                                : `[${file.name}](${file.url})`
                                        )}
                                        className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <Copy className="w-3 h-3" /> Insertar
                                    </button>
                                    <div className="flex w-full gap-2">
                                        <button
                                            onClick={() => setViewedImage(file)}
                                            className="flex-1 bg-white/20 backdrop-blur-md text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center justify-center"
                                            title="Ver detalles"
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(file.url, 'url')}
                                            className="flex-1 bg-white/20 backdrop-blur-md text-white px-3 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center justify-center"
                                            title="Copiar URL"
                                        >
                                            <LinkIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Badges */}
                                <div className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                                    {file.attachedToTask && (
                                        <div className="bg-indigo-500/90 text-white p-1.5 rounded-lg shadow-sm" title="Adjunto en Tarea">
                                            <Paperclip className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-1 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px] block" title={file.name}>
                                    {file.name}
                                </span>
                                <button
                                    onClick={() => handleDelete(file.name)}
                                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const Header = () => (
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900">Gestor de Medios</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Galería del Proyecto</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    <span>Subir Archivo</span>
                </button>
                {!isInline && (
                    <>
                        <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    return (
        <>
            {isInline ? (
                <div className="w-full h-full flex flex-col bg-white rounded-[2.5rem] overflow-hidden">
                    <Header />
                    <GalleryContent />
                </div>
            ) : (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <Header />
                        <GalleryContent />
                    </motion.div>
                </div>
            )}

            {/* File Viewer */}
            {viewedImage && (
                <FileViewer
                    file={{
                        url: viewedImage.url,
                        name: viewedImage.name,
                        type: viewedImage.type
                    }}
                    onClose={() => setViewedImage(null)}
                />
            )}
        </>
    );
};

export default MediaManager;
