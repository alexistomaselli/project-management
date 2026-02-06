import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import * as mammoth from 'mammoth';

interface FileViewerProps {
    file: {
        url: string;
        name: string;
        type: string;
    } | null;
    onClose: () => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ file, onClose }) => {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (file) {
            loadContent();
            setIsMinimized(false);
        } else {
            setContent(null);
            setError(null);
        }
    }, [file]);

    const loadContent = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setContent(null);

        try {
            if (file.type.includes('word') || file.name.endsWith('.docx')) {
                // Handle DOCX
                const response = await fetch(file.url);
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setContent(result.value); // The generated HTML
            } else if (file.type.includes('pdf')) {
                // Handle PDF - No special processing needed for iframe, but good to know
                setContent('pdf');
            } else if (file.type.startsWith('image/')) {
                // Handle Images
                setContent('image');
            } else {
                setError('Vista previa no disponible para este tipo de archivo.');
            }
        } catch (err: any) {
            console.error("Error loading file content:", err);
            setError('Error al cargar el archivo. Por favor intenta descargarlo.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    if (!file) return null;

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-64">
                    <Loader2 className="w-10 h-10 animate-spin text-white/50 mb-4" />
                    <p className="text-white/70 font-medium">Cargando vista previa...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-white/70" />
                    </div>
                    <p className="text-white font-bold text-lg mb-2">No se pudo mostrar el archivo</p>
                    <p className="text-white/60 mb-6 max-w-md">{error}</p>
                    <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Descargar Archivo
                    </a>
                </div>
            );
        }

        if (content === 'image') {
            return (
                <div className="flex items-center justify-center h-full">
                    <img
                        src={file.url}
                        alt={file.name}
                        className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            );
        }

        if (content === 'pdf') {
            return (
                <iframe
                    src={file.url}
                    className="w-full h-full rounded-lg bg-white"
                    title={file.name}
                />
            );
        }

        if (content) {
            // DOCX HTML content
            return (
                <div className="bg-white text-slate-900 p-8 md:p-12 rounded-lg shadow-2xl max-w-4xl w-full mx-auto h-full overflow-y-auto prose prose-slate">
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                </div>
            );
        }

        return null; // Should be handled by error state theoretically
    };

    return (
        <AnimatePresence>
            <div className={`fixed z-[500] transition-all duration-300 ${isMinimized ? 'bottom-4 right-4 w-96 h-14' : 'inset-0 flex items-center justify-center p-2 md:p-4'}`}>
                {/* Backdrop - only when not minimized */}
                {!isMinimized && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                        onClick={onClose}
                    />
                )}

                <motion.div
                    layout
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={isMinimized ? {
                        scale: 1,
                        opacity: 1,
                        y: 0
                    } : {
                        scale: 1,
                        opacity: 1,
                        y: 0
                    }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className={`relative flex flex-col bg-slate-900 border border-white/10 shadow-2xl overflow-hidden
                        ${isMinimized
                            ? 'w-full h-full rounded-xl cursor-pointer hover:bg-slate-800 transition-colors'
                            : 'w-full h-full max-w-[95vw] md:max-w-[1600px] md:h-[95vh] rounded-[2rem] pointer-events-none'
                        }
                    `}
                    onClick={isMinimized ? toggleMinimize : undefined}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-6 py-4 pointer-events-auto shrink-0 ${!isMinimized && 'border-b border-white/5'}`}>
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className={`rounded-xl bg-white/10 flex items-center justify-center shrink-0 transition-all ${isMinimized ? 'w-8 h-8' : 'w-12 h-12'}`}>
                                <FileText className={`text-white transition-all ${isMinimized ? 'w-4 h-4' : 'w-6 h-6'}`} />
                            </div>
                            <div className="min-w-0 flex flex-col">
                                <h3 className={`text-white font-bold truncate transition-all ${isMinimized ? 'text-sm max-w-[180px]' : 'text-xl max-w-2xl'}`}>{file.name}</h3>
                                {!isMinimized && <p className="text-white/50 text-xs uppercase tracking-wider font-bold">Vista Previa</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!isMinimized && (
                                <a
                                    href={file.url}
                                    download={file.name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all"
                                    title="Descargar"
                                >
                                    <Download className="w-5 h-5" />
                                </a>
                            )}
                            <button
                                onClick={toggleMinimize}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white hover:bg-white/10 transition-all"
                                title={isMinimized ? "Maximizar" : "Minimizar"}
                            >
                                <div className="w-4 h-0.5 bg-white rounded-full" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-500 transition-all"
                                title="Cerrar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content Area - Hidden when minimized */}
                    {!isMinimized && (
                        <div className="flex-1 min-h-0 pointer-events-auto bg-slate-50/5 relative">
                            {/* Background pattern or subtle texture could go here */}
                            {renderContent()}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FileViewer;
