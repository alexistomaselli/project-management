
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { IssueAttachment } from '../types';
import { useVisualFeedback } from '../context/VisualFeedbackContext';
import {
    Paperclip,
    X,
    Download,
    Trash2,
    Loader2,
    FileText,
    Image as ImageIcon,
    File
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import FileViewer from './FileViewer';

interface TaskAttachmentsProps {
    taskId: string;
    projectId: string;
    attachments?: IssueAttachment[];
    onAttachmentsChange: () => void;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskId, projectId, attachments = [], onAttachmentsChange }) => {
    const [uploading, setUploading] = useState(false);
    const [viewedAttachment, setViewedAttachment] = useState<IssueAttachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showToast, confirmAction } = useVisualFeedback();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${projectId}/${uuidv4()}.${fileExt}`;
            const filePath = fileName;

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('project-assets')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            // 2. Create Record in issue_attachments table
            // We need to get the user ID first
            const { data: { user } } = await supabase.auth.getUser();

            const { error: dbError } = await supabase
                .from('issue_attachments')
                .insert([{
                    issue_id: taskId,
                    project_id: projectId,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    created_by: user?.id
                }]);

            if (dbError) {
                // Rollback: delete the uploaded file if DB insert fails
                await supabase.storage.from('project-assets').remove([filePath]);
                throw dbError;
            }

            showToast('Archivo adjuntado', 'El archivo se ha subido correctamente.', 'success');
            onAttachmentsChange();
        } catch (error: any) {
            console.error('Error uploading attachment:', error);
            showToast('Error', error.message || 'No se pudo adjuntar el archivo.', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = (attachment: IssueAttachment) => {
        confirmAction({
            title: 'Eliminar Adjunto',
            message: '¿Estás seguro de eliminar este archivo? Se eliminará de la tarea y del gestor de medios.',
            confirmLabel: 'Eliminar',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    // 1. Delete from Storage
                    const { error: storageError } = await supabase.storage
                        .from('project-assets')
                        .remove([attachment.filePath]);

                    if (storageError) throw storageError;

                    // 2. Delete from DB
                    const { error: dbError } = await supabase
                        .from('issue_attachments')
                        .delete()
                        .eq('id', attachment.id);

                    if (dbError) throw dbError;

                    showToast('Eliminado', 'Archivo eliminado correctamente.', 'success');
                    onAttachmentsChange();
                } catch (error: any) {
                    console.error('Error deleting attachment:', error);
                    showToast('Error', 'No se pudo eliminar el archivo.', 'error');
                }
            }
        });
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-purple-500" />;
        if (type.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
        return <File className="w-4 h-4 text-slate-400" />;
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const handleDownload = async (attachment: IssueAttachment) => {
        try {
            const { data } = supabase.storage
                .from('project-assets')
                .getPublicUrl(attachment.filePath);

            if (data?.publicUrl) {
                window.open(data.publicUrl, '_blank');
            }
        } catch (error) {
            console.error("Error downloading", error);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Adjuntos</h4>
                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                    <span>Añadir</span>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    className="hidden"
                />
            </div>

            <div className="space-y-3">
                {attachments.length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Sin archivos adjuntos</p>
                    </div>
                )}
                {attachments.map((att) => (
                    <div key={att.id} className="group flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                        <div
                            className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
                            onClick={() => setViewedAttachment(att)}
                        >
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0">
                                {getFileIcon(att.fileType)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors" title={att.fileName}>{att.fileName}</p>
                                <span className="text-[10px] text-slate-400 uppercase font-black">{formatSize(att.fileSize)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(att);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Descargar"
                            >
                                <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(att);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Eliminar"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {viewedAttachment && (
                <FileViewer
                    file={{
                        url: supabase.storage.from('project-assets').getPublicUrl(viewedAttachment.filePath).data.publicUrl,
                        name: viewedAttachment.fileName,
                        type: viewedAttachment.fileType || 'application/octet-stream' // fallback
                    }}
                    onClose={() => setViewedAttachment(null)}
                />
            )}
        </div>
    );
};

export default TaskAttachments;
