
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

    const sanitizeRecords = useCallback((records: any[]) => {
        return records.map(record => {
            if (record.id && record.id.startsWith('shape:')) {
                // Clone the record and its props to avoid mutating the original
                const newRecord = JSON.parse(JSON.stringify(record));
                if (newRecord.props) {
                    // Attempt to rescue text from legacy properties
                    if (newRecord.props.text === undefined || newRecord.props.text === '') {
                        if (newRecord.props.richText) {
                            if (typeof newRecord.props.richText === 'string') {
                                newRecord.props.text = newRecord.props.richText;
                            } else if (typeof newRecord.props.richText === 'object') {
                                if (newRecord.props.richText.text) {
                                    newRecord.props.text = newRecord.props.richText.text;
                                } else if (newRecord.props.richText.type === 'doc' && newRecord.props.richText.content) {
                                    // Deep rescue from Tiptap-like structure
                                    let fullText = '';
                                    const extractText = (content: any[]) => {
                                        content.forEach(item => {
                                            if (item.text) fullText += item.text;
                                            if (item.content) extractText(item.content);
                                        });
                                    };
                                    extractText(newRecord.props.richText.content);
                                    newRecord.props.text = fullText;
                                }
                            }
                        } else if (newRecord.props.label) {
                            newRecord.props.text = newRecord.props.label;
                        }
                    }

                    // Global legacy property cleanup - delete after rescuing info
                    delete newRecord.props.richText;
                    delete newRecord.props.label;

                    // Fix image shapes
                    if (newRecord.type === 'image') {
                        delete newRecord.props.altText;
                        if (newRecord.props.crop) {
                            delete newRecord.props.crop.isCircle;
                        }
                    }

                    // Fix geo, arrow and note shapes (ensure text property exists)
                    if ((newRecord.type === 'geo' || newRecord.type === 'arrow' || newRecord.type === 'note') && newRecord.props.text === undefined) {
                        newRecord.props.text = '';
                    }

                    if (newRecord.type === 'note') {
                        delete newRecord.props.labelColor;
                    }

                    if (newRecord.type === 'arrow') {
                        delete newRecord.props.kind;
                        delete newRecord.props.elbowMidPoint;
                    }
                    // General coordinate safety
                    if (newRecord.x === undefined) newRecord.x = 0;
                    if (newRecord.y === undefined) newRecord.y = 0;
                }
                return newRecord;
            }
            return record;
        });
    }, []);

    const fetchLatestData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('whiteboards')
                .select('data')
                .eq('id', initialWhiteboard.id)
                .limit(1);

            if (error) throw error;
            const singleData = data && data.length > 0 ? data[0] : null;

            if (singleData?.data && editorRef.current) {
                console.group('Whiteboard Sync');
                const rawData = singleData.data;
                let snapshotToLoad: any = null;

                // Improved extraction of the tldraw snapshot structure
                let store = rawData.store;
                let schema = rawData.schema;

                if (rawData.document && rawData.document.store) {
                    console.log('Detected legacy "document" wrapped structure');
                    store = rawData.document.store;
                    schema = rawData.document.schema || schema;
                }

                if (store) {
                    // Ensure we have a valid schema structure
                    if (!schema || !schema.schemaVersion) {
                        console.warn('Snapshot missing or invalid schema. Using current editor schema as fallback.');
                        // @ts-ignore
                        schema = editorRef.current.store.schema.serialize();
                    }
                    snapshotToLoad = { store, schema };
                }

                if (snapshotToLoad) {
                    const shapes = Object.keys(snapshotToLoad.store).filter(k => k.startsWith('shape:'));
                    setDebugInfo(`Visto en base: ${shapes.length} formas (${shapes.slice(0, 2).join(', ')}...)`);

                    try {
                        try {
                            // @ts-ignore
                            editorRef.current.loadSnapshot(snapshotToLoad);
                        } catch (loadErr: any) {
                            console.error('Initial loadSnapshot failed, attempting repair:', loadErr);

                            // FAILOVER: Manual merge of records if snapshot load fails
                            const storeRecords = snapshotToLoad.store;
                            const cleanupRecords = Object.fromEntries(
                                Object.entries(storeRecords).filter(([id]) =>
                                    id.startsWith('shape:') ||
                                    id.startsWith('asset:') ||
                                    id.startsWith('page:') ||
                                    id.startsWith('document:')
                                )
                            );

                            // @ts-ignore
                            editorRef.current.store.mergeRemoteChanges(() => {
                                // @ts-ignore
                                editorRef.current.store.put(sanitizeRecords(Object.values(cleanupRecords)));
                            });

                            console.log('Manual merge with sanitization completed as failover');
                        }

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
                    } catch (err: any) {
                        console.error('Critical sync error:', err);
                        setDebugInfo(`Error crítico: ${err.message}`);
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
                let store = currentData.store;
                let schema = currentData.schema;

                if (currentData.document && currentData.document.store) {
                    store = currentData.document.store;
                    schema = currentData.document.schema || schema;
                }

                if (store) {
                    if (!schema || !schema.schemaVersion) {
                        // @ts-ignore
                        schema = editor.store.schema.serialize();
                    }

                    const snapshot = { store, schema };
                    console.log('Mount: Loading snapshot into store');

                    try {
                        // @ts-ignore
                        editor.loadSnapshot(snapshot);
                    } catch (err) {
                        console.error('Mount loadSnapshot failed, attempting repair:', err);
                        // Apply manual shape merge as fallback
                        const shapes = Object.values(store).filter((r: any) =>
                            r.id.startsWith('shape:') ||
                            r.id.startsWith('asset:') ||
                            r.id.startsWith('page:')
                        );

                        // @ts-ignore
                        editor.store.mergeRemoteChanges(() => {
                            // @ts-ignore
                            editor.store.put(sanitizeRecords(shapes));
                        });
                    }

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

            <div
                className="flex-1 relative w-full bg-slate-50"
                style={{
                    height: 'calc(100vh - 120px)',
                    minHeight: '600px'
                }}
            >
                <Tldraw
                    onMount={handleMount}
                    inferDarkMode={false}
                    autoFocus
                    // @ts-ignore - locale exists in runtime but might have type conflicts in this version
                    locale="es"
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

                {/* SHOW DEBUG TOGGLE */}
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
