
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { supabase } from '../services/supabase';
import { Whiteboard } from '../types';
import { ArrowLeft, Save, Loader2, Share2, X } from 'lucide-react';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

interface WhiteboardEditorProps {
    whiteboard: Whiteboard;
    onBack: () => void;
}

const WhiteboardEditor: React.FC<WhiteboardEditorProps> = ({ whiteboard: initialWhiteboard, onBack }) => {
    const editorRef = useRef<Editor | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [currentData, setCurrentData] = useState<any>(initialWhiteboard.data);
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [showDebug, setShowDebug] = useState(true);

    const { showToast } = useVisualFeedback();

    const fetchLatestData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .select('data')
                .eq('id', initialWhiteboard.id)
                .single();

            if (error) throw error;
            if (data?.data && editorRef.current) {
                console.group('Whiteboard Sync');
                const rawData = data.data;
                let snapshotToLoad: any = null;

                // Flexible extraction of the tldraw snapshot structure
                if (rawData.store && rawData.schema) {
                    snapshotToLoad = rawData;
                } else if (rawData.document && rawData.document.store) {
                    console.log('Detected wrapped "document" structure');
                    snapshotToLoad = rawData.document;
                } else if (rawData.store) {
                    snapshotToLoad = { store: rawData.store, schema: rawData.schema || { schemaVersion: 2, sequences: {} } };
                }

                if (snapshotToLoad) {
                    const shapes = Object.keys(snapshotToLoad.store).filter(k => k.startsWith('shape:'));
                    setDebugInfo(`Visto en base: ${shapes.length} formas (${shapes.slice(0, 2).join(', ')}...)`);

                    try {
                        // @ts-ignore
                        editorRef.current.loadSnapshot(snapshotToLoad);

                        if (shapes.length > 0) {
                            setTimeout(() => {
                                if (editorRef.current) {
                                    // @ts-ignore
                                    editorRef.current.zoomToFit();
                                }
                            }, 300);
                        }

                        setLastSaved(new Date());
                        showToast('Sincronizado', `Cargadas ${shapes.length} formas.`, 'success');
                    } catch (loadErr: any) {
                        console.error('Snapshot load error:', loadErr);
                        setDebugInfo(`Error al cargar snapshot: ${loadErr.message}`);
                    }
                } else {
                    setDebugInfo('No se encontró estructura compatible en el JSON');
                }
                console.groupEnd();
            }
        } catch (error: any) {
            console.error('Fetch error:', error);
            setDebugInfo(`Error fetching: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [initialWhiteboard.id, showToast]);

    const handleSave = useCallback(async () => {
        if (!editorRef.current) return;
        setIsSaving(true);
        try {
            // @ts-ignore
            const snapshot = editorRef.current.getSnapshot();
            const { error } = await supabase
                .from('whiteboards')
                .update({
                    data: snapshot,
                    updated_at: new Date().toISOString()
                })
                .eq('id', initialWhiteboard.id);

            if (error) throw error;
            setLastSaved(new Date());
            showToast('Guardado', 'Copia sincronizada en la nube.', 'success');
        } catch (error: any) {
            console.error('Save error:', error);
            showToast('Error', 'No se pudo guardar.', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [initialWhiteboard.id, showToast]);

    const handleMount = useCallback((editor: Editor) => {
        editorRef.current = editor;
        console.log('Tldraw editor mounted');

        if (currentData) {
            try {
                let snapshot = currentData;
                if (currentData.document && currentData.document.store) snapshot = currentData.document;
                if (snapshot.store) {
                    // @ts-ignore
                    editor.loadSnapshot(snapshot);
                    setTimeout(() => {
                        // @ts-ignore
                        editor.zoomToFit();
                    }, 500);
                }
            } catch (err) {
                console.error('Mount load error:', err);
            }
        }
        return () => { };
    }, [currentData]);

    useEffect(() => {
        const timer = setTimeout(fetchLatestData, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className="fixed inset-0 bg-white flex flex-col overflow-hidden animate-fadeIn"
            style={{ zIndex: 999999 }}
        >
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 transition-all hover:text-indigo-600 border border-slate-100"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 leading-none">{initialWhiteboard.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {isSaving ? (
                                    <span className="flex items-center gap-1.5 text-indigo-500">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Guardando...
                                    </span>
                                ) : isLoading ? (
                                    <span className="flex items-center gap-1.5 text-amber-500">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Sincronizando...
                                    </span>
                                ) : (
                                    lastSaved ? `Guardado a las ${lastSaved.toLocaleTimeString()}` : 'Listo para dibujar'
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLatestData}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all border border-slate-100"
                    >
                        <Share2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>Refrescar Nube</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Guardar</span>
                    </button>
                    <button
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 transition-all border border-slate-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative w-full bg-slate-50">
                <Tldraw
                    onMount={handleMount}
                    inferDarkMode={false}
                    autoFocus
                />

                {/* DEBUG PANEL */}
                {debugInfo && showDebug && (
                    <div className="absolute bottom-6 left-6 right-6 bg-slate-900/95 text-white p-4 rounded-2xl text-[10px] font-mono border border-white/10 z-[10000] shadow-2xl animate-slideUp backdrop-blur-md group">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                Soporte Tecnico Antigravity:
                            </div>
                            <button
                                onClick={() => setShowDebug(false)}
                                className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                                title="Ocultar Panel de Soporte"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="text-slate-300 leading-relaxed">
                            {debugInfo}
                        </div>
                    </div>
                )}

                {/* SHOW DEBUG TOGGLE (ONLY IF HIDDEN AND INFO EXISTS) */}
                {debugInfo && !showDebug && (
                    <button
                        onClick={() => setShowDebug(true)}
                        className="absolute bottom-6 right-6 w-10 h-10 bg-slate-900 text-white rounded-xl shadow-2xl flex items-center justify-center border border-white/10 hover:bg-slate-800 transition-all z-[10000]"
                        title="Mostrar Panel de Soporte"
                    >
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default WhiteboardEditor;
