import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';
import { ProjectDoc, Profile } from '../types';
import MediaManager from './MediaManager';
import {
    X,
    Save,
    Eye,
    Edit3,
    FileDown,
    Wand2,
    Clock,
    ArrowLeft,
    Check,
    Cloud,
    Loader2,
    FileSpreadsheet,
    Sparkles,
    Zap,
    Cpu,
    Bot,
    Send,
    Calendar,
    Layout as RoadmapIcon,
    Image as ImageIcon,
    Volume2,
    Square,
    PauseCircle,
    PlayCircle,
    SkipBack,
    SkipForward
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
import { useVisualFeedback } from '../context/VisualFeedbackContext';

interface DocumentEditorProps {
    doc: ProjectDoc;
    onBack: () => void;
    onSaveSuccess?: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ doc, onBack, onSaveSuccess }) => {
    const [content, setContent] = useState(doc.content);
    const [title, setTitle] = useState(doc.title);
    const [mode, setMode] = useState<'editor' | 'preview' | 'split'>('split');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [aiConfig, setAiConfig] = useState<any>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [showAiPrompt, setShowAiPrompt] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [showMediaManager, setShowMediaManager] = useState(false);

    // TTS State
    const [isTtsLoading, setIsTtsLoading] = useState(false);
    const [isTtsPlaying, setIsTtsPlaying] = useState(false);
    const [ttsProgress, setTtsProgress] = useState(0);
    const [ttsCurrentTime, setTtsCurrentTime] = useState(0);
    const [ttsDuration, setTtsDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { showToast } = useVisualFeedback();

    // Fetch AI Config and Profile
    useEffect(() => {
        const fetchAll = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileList } = await supabase.from('profiles').select('*').eq('id', user.id).limit(1);
            const profileData = profileList && profileList.length > 0 ? profileList[0] : null;
            setProfile(profileData);

            const { data: configList } = await supabase.from('ai_config').select('*').eq('user_id', user.id).limit(1);
            const config = configList && configList.length > 0 ? configList[0] : null;
            setAiConfig(config || { mode: 'deterministic' });
        };
        fetchAll();
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('project_docs')
                .update({
                    content,
                    title,
                    updated_at: new Date().toISOString()
                })
                .eq('id', doc.id);

            if (error) throw error;

            // Record activity
            await supabase.from('activities').insert([{
                project_id: doc.projectId,
                action: 'doc_updated',
                details: {
                    title: title,
                    type: doc.type,
                    doc_id: doc.id
                }
            }]);

            setLastSaved(new Date());
            onSaveSuccess?.();
        } catch (error: any) {
            console.error('Error saving document:', error);
            showToast('Error al guardar', error.message || 'No se pudo sincronizar.', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [content, title, doc.id, onSaveSuccess, showToast]);

    // Auto-save debounced
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== doc.content || title !== doc.title) {
                handleSave();
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [content, title, handleSave, doc.content, doc.title]);

    const handleExportPDF = () => {
        const originalMode = mode;
        const originalTitle = document.title;

        // 1. Force Enter Preview Mode if needed
        if (mode === 'editor') {
            setMode('preview');
        }

        document.title = title || 'Documento';

        // 2. Wait for render
        setTimeout(() => {
            const contentElement = document.getElementById('printable-content');

            if (contentElement) {
                // 3. Clone the content to isolate it from the app's DOM hierarchy
                const printContainer = document.createElement('div');
                printContainer.id = 'print-container-portal';

                // Clone the node
                const clonedContent = contentElement.cloneNode(true) as HTMLElement;

                // Remove the 'overflow-y-auto' which hides content in print
                clonedContent.style.overflow = 'visible';
                clonedContent.style.height = 'auto';

                const wrapper = document.createElement('div');
                wrapper.className = 'print-wrapper-reset';
                wrapper.appendChild(clonedContent);

                printContainer.appendChild(wrapper);
                document.body.appendChild(printContainer);
                document.body.classList.add('is-printing');

                // 4. Print
                window.print();

                // 5. Cleanup
                document.body.classList.remove('is-printing');
                document.body.removeChild(printContainer);
            } else {
                showToast('Error', 'No se pudo generar la vista de impresión.', 'error');
            }

            // Restore state
            document.title = originalTitle;
            if (originalMode === 'editor') {
                setMode('editor');
            }
        }, 300);
    };

    const handleExportCSV = () => {
        // Basic extraction of tables from markdown to CSV
        const tables = content.match(/\|(.+)\|/g);
        if (!tables) {
            showToast('No hay tablas', 'No se encontraron tablas Markdown en el documento.', 'info');
            return;
        }

        const csvContent = tables.map(row =>
            row.split('|').map(cell => cell.trim()).filter(cell => cell !== '').join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.csv`;
        a.click();
        showToast('CSV Generado', 'La tabla ha sido extraída exitosamente.', 'success');
    };

    const handleAIExtractTasks = () => {
        showToast('IA Procesando', 'Extrayendo tareas detectadas en el documento...', 'info');
        // This would call a specialized tool or prompt. 
        console.log('Solicitando a la IA extraer tareas de:', content);
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim() || !profile?.id) return;

        setIsAiGenerating(true);
        showToast('IA Generando', 'El Core AI está redactando tu solicitud...', 'info');

        try {
            const { data, error } = await supabase.functions.invoke('ai-brain', {
                body: {
                    message: `En el contexto del documento "${title}", realiza lo siguiente: ${aiPrompt}. \n\nContenido actual como referencia:\n${content}`,
                    user_id: profile.id,
                    session_id: `doc_editor_${doc.id}`
                }
            });

            if (error) throw error;
            if (!data?.response) throw new Error('No hay respuesta de la IA');

            setContent(prev => prev + '\n\n' + data.response);
            setAiPrompt('');
            setShowAiPrompt(false);
            showToast('Generación Exitosa', 'El contenido ha sido agregado al documento.', 'success');
        } catch (err: any) {
            console.error('Error generating AI content:', err);
            showToast('Error de IA', err.message || 'No se pudo generar el texto.', 'error');
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handleTtsToggle = async () => {
        if (isTtsPlaying) {
            audioRef.current?.pause();
            setIsTtsPlaying(false);
            return;
        }

        if (audioRef.current && audioRef.current.paused && audioRef.current.src) {
            audioRef.current.play();
            setIsTtsPlaying(true);
            return;
        }

        // Start new TTS
        if (!content.trim()) return;

        setIsTtsLoading(true);
        showToast('IA Generando Voz', 'Preparando lectura con voz humana...', 'info');

        try {
            // Remove markdown syntax for cleaner reading
            const plainText = content
                .replace(/[#*`_~]/g, '') // Remove headlines, bold, code, etc.
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Keep link text, remove URL
                .trim();

            console.log('Calling text-to-speech function via fetch...');
            const startTime = Date.now();

            // Get the session to use the access token
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                        text: plainText.slice(0, 1000), // BALANCE: 1000 characters for good range and speed
                        voice: 'nova' // 'nova' usually sounds better for Spanish than 'alloy'
                    })
                }
            );

            console.log(`TTS Fetch finished in ${Date.now() - startTime}ms. Status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS Function Error: ${response.status} - ${errorText}`);
            }

            const data = await response.arrayBuffer();
            console.log('TTS response received, buffer size:', data.byteLength);

            const blob = new Blob([data], { type: 'audio/mpeg' });
            console.log('Blob created, size:', blob.size);
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = url;
            } else {
                audioRef.current = new Audio(url);
            }

            audioRef.current.ontimeupdate = () => {
                if (audioRef.current) {
                    setTtsCurrentTime(audioRef.current.currentTime);
                    setTtsProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }
            };

            audioRef.current.onloadedmetadata = () => {
                if (audioRef.current) {
                    setTtsDuration(audioRef.current.duration);
                }
            };

            audioRef.current.onended = () => {
                console.log('Audio playback ended');
                setIsTtsPlaying(false);
                setTtsProgress(0);
                setTtsCurrentTime(0);
            };

            console.log('Attempting to play audio...');
            await audioRef.current.play();
            console.log('Audio playing successfully');
            setIsTtsPlaying(true);
            showToast('Lectura Iniciada', 'Escuchando documento...', 'success');
        } catch (err: any) {
            console.error('Error in TTS:', err);
            showToast('Error de Voz', 'No se pudo generar la lectura.', 'error');
        } finally {
            setIsTtsLoading(false);
        }
    };

    const handleTtsSkip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
            setTtsCurrentTime(audioRef.current.currentTime);
            setTtsProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
    };

    const handleTtsSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const percent = parseFloat(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            const newTime = (percent / 100) * audioRef.current.duration;
            audioRef.current.currentTime = newTime;
            setTtsProgress(percent);
            setTtsCurrentTime(newTime);
        }
    };

    const formatTtsTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTtsStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setIsTtsPlaying(false);
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleAiDiagram = async () => {
        if (!profile?.id) return;
        setIsAiGenerating(true);

        const useNotebookLM = aiConfig?.notebooklm_cookies && aiConfig?.notebooklm_id;

        showToast(
            useNotebookLM ? 'NotebookLM Deep Analysis' : 'IA Analizando',
            useNotebookLM ? 'Solicitando razonamiento profundo a tu cuaderno...' : 'Extrayendo conceptos clave para el diagrama...',
            'info'
        );

        try {
            let textResponse = "";

            if (useNotebookLM) {
                // Flow A: Use NotebookLM via MCP Server (Python Bridge)
                try {
                    const mcpUrl = window.location.origin.replace(':3001', ':3002'); // Dynamic derivation
                    const response = await fetch(`${mcpUrl}/messages/invoke`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tool: 'notebooklm_extract_concept_map',
                            arguments: {
                                user_id: profile.id,
                                notebook_id: aiConfig.notebooklm_id,
                                doc_id: doc.id
                            }
                        })
                    });

                    if (!response.ok) throw new Error("MCP Server unreachable. Falling back to standard AI.");
                    const data = await response.json();
                    textResponse = data.content?.[0]?.text || "";
                } catch (mcpErr) {
                    console.warn("MCP/NotebookLM failed, trying fallback:", mcpErr);
                }
            }

            // Flow B: Standard AI / Fallback
            if (!textResponse) {
                const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-brain', {
                    body: {
                        message: `Analiza el siguiente documento y extrae una lista de 5 a 8 conceptos o hitos clave para un mapa mental. Responde ÚNICAMENTE con una lista separada por comas. \n\nDocumento:\n${content}`,
                        user_id: profile.id,
                        session_id: `diagram_${doc.id}`
                    }
                });
                if (aiError) throw aiError;
                textResponse = aiResponse?.response || "";
            }

            console.log('AI Diagram Concept Extraction:', textResponse);

            // Smarter split: by commas, newlines, or bullets
            const concepts = textResponse
                .split(/[,\n•*-]/)
                .map((c: string) => c.trim())
                .filter((c: string) => c.length > 2 && c.length < 100)
                .slice(0, 10);

            if (concepts.length === 0) {
                throw new Error("La IA no devolvió conceptos claros. Intenta de nuevo.");
            }

            showToast('Pizarra en Construcción', `Dibujando ${concepts.length} conceptos extraídos por ${useNotebookLM ? 'NotebookLM' : 'Bridge AI'}...`, 'info');

            // Step 2: Build tldraw JSON structure (simplified mindmap)
            const centerX = 500;
            const centerY = 400;
            const store: any = {
                "document:document": {
                    "id": "document:document",
                    "typeName": "document",
                    "meta": {},
                    "gridSize": 10,
                    "name": title
                },
                "page:page": {
                    "id": "page:page",
                    "typeName": "page",
                    "name": "Page 1",
                    "index": "a1",
                    "meta": {}
                },
                "instance:instance": {
                    "id": "instance:instance",
                    "typeName": "instance",
                    "currentPageId": "page:page",
                    "followingUserId": null,
                    "brush": null,
                    "opacityForNextShape": 1,
                    "stylesForNextShape": {},
                    "cursor": { "type": "default", "rotation": 0 },
                    "isEditing": false,
                    "isFocused": true,
                    "isHelpOpen": false,
                    "isReadOnly": false,
                    "screenBounds": { "x": 0, "y": 0, "w": 1000, "h": 800 },
                    "zoomLevel": 1,
                    "chatMessage": "",
                    "isChatting": false,
                    "isMenuOpen": false,
                    "isSidebarOpen": false,
                    "canMoveCamera": true,
                    "isPenMode": false,
                    "isGridMode": false,
                    "isMobile": false,
                    "meta": {}
                },
                "instance_page_state:page:page": {
                    "id": "instance_page_state:page:page",
                    "typeName": "instance_page_state",
                    "instanceId": "instance:instance",
                    "pageId": "page:page",
                    "focusedShapeId": null,
                    "selectedShapeIds": [],
                    "meta": {}
                },
                "camera:page:page": {
                    "id": "camera:page:page",
                    "typeName": "camera",
                    "x": 0,
                    "y": 0,
                    "z": 1,
                    "meta": {}
                }
            };

            // Central Node
            const centralId = `shape:central_${Date.now()}`;
            store[centralId] = {
                id: centralId,
                typeName: 'shape',
                type: 'geo',
                x: centerX - 100,
                y: centerY - 40,
                parentId: 'page:page',
                index: 'a1',
                props: {
                    geo: 'ellipse',
                    w: 200,
                    h: 80,
                    text: title,
                    font: 'draw',
                    align: 'middle',
                    verticalAlign: 'middle',
                    color: 'blue',
                    fill: 'pattern',
                    dash: 'draw',
                    size: 'm'
                },
                meta: {}
            };

            // Concept Nodes
            concepts.forEach((concept: string, i: number) => {
                const angle = (i / concepts.length) * Math.PI * 2;
                const radius = 280;
                const branchX = centerX + Math.cos(angle) * radius;
                const branchY = centerY + Math.sin(angle) * radius;

                const branchId = `shape:concept_${i}_${Date.now()}`;
                store[branchId] = {
                    id: branchId,
                    typeName: 'shape',
                    type: 'geo',
                    x: branchX - 80,
                    y: branchY - 30,
                    parentId: 'page:page',
                    index: `a${i + 2}`,
                    props: {
                        geo: 'rectangle',
                        w: 160,
                        h: 60,
                        text: concept,
                        font: 'draw',
                        align: 'middle',
                        verticalAlign: 'middle',
                        color: 'violet',
                        fill: 'none',
                        dash: 'draw',
                        size: 's'
                    },
                    meta: {}
                };

                // Arrow
                const arrowId = `shape:arrow_${i}_${Date.now()}`;
                store[arrowId] = {
                    id: arrowId,
                    typeName: 'shape',
                    type: 'arrow',
                    x: centerX,
                    y: centerY,
                    parentId: 'page:page',
                    index: `b${i + 1}`,
                    props: {
                        start: { x: 0, y: 0 },
                        end: { x: branchX - centerX, y: branchY - centerY },
                        arrowheadStart: 'none',
                        arrowheadEnd: 'arrow',
                        color: 'grey',
                        dash: 'draw',
                        size: 'm'
                    },
                    meta: {}
                };
            });

            const whiteboardData = {
                store,
                schema: {
                    schemaVersion: 2,
                    sequences: {
                        "com.tldraw.store": 4,
                        "com.tldraw.asset": 1,
                        "com.tldraw.camera": 3,
                        "com.tldraw.document": 2,
                        "com.tldraw.instance": 24,
                        "com.tldraw.instance_page_state": 5,
                        "com.tldraw.page": 1,
                        "com.tldraw.shape": 4,
                        "com.tldraw.user": 1,
                        "com.tldraw.user_document": 3,
                        "com.tldraw.user_presence": 7
                    }
                }
            };

            // Step 3: Insert into Supabase
            const { data: boardData, error: bErr } = await supabase
                .from('whiteboards')
                .insert([{
                    project_id: doc.projectId,
                    name: `Diagrama: ${title}`,
                    data: whiteboardData
                }])
                .select()
                .limit(1);

            if (bErr) throw bErr;
            const board = boardData && boardData.length > 0 ? boardData[0] : null;

            // Record activity
            await supabase.from('activities').insert([{
                project_id: doc.projectId,
                action: 'whiteboard_created',
                details: { name: board.name, source_doc: title }
            }]);

            showToast('¡Éxito!', 'Se ha generado un Mapa Mental en la sección de Pizarras.', 'success');
        } catch (err: any) {
            console.error('Error in AiDiagram:', err);
            showToast('Error', err.message || 'Error al diagramar.', 'error');
        } finally {
            setIsAiGenerating(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-50 flex flex-col print:bg-white print:relative print:z-0"
        >
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-[210] print:hidden">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-xl font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 w-64 md:w-96"
                        />
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                <span>Creado: {new Date(doc.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <div className="h-2 w-[1px] bg-slate-200" />
                            {isSaving ? (
                                <div className="flex items-center gap-1.5 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>Sincronizando...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                                    <Clock className="w-3 h-3" />
                                    <span>{lastSaved ? `Guardado ${lastSaved.toLocaleTimeString()}` : `Visto: ${new Date(doc.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* IA Indicator */}
                    <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all h-9 ${aiConfig?.mode === 'ai'
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-100'
                        : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                        {aiConfig?.mode === 'ai' ? <Sparkles className="w-3.5 h-3.5 fill-white/20" /> : <Cpu className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">
                            {aiConfig?.mode === 'ai' ? `Bridge AI: ${aiConfig.model_name}` : 'Bridge MCP Mode'}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${aiConfig?.mode === 'ai' ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                    </div>

                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
                        <button
                            onClick={() => setMode('editor')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Editor
                        </button>
                        <button
                            onClick={() => setMode('split')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'split' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Divido
                        </button>
                        <button
                            onClick={() => setMode('preview')}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Vista Previa
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 mx-2" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowMediaManager(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Galería</span>
                        </button>

                        <div className={`flex items-center gap-1 p-1 pr-3 rounded-2xl transition-all border ${isTtsPlaying ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-transparent'}`}>
                            {isTtsPlaying && (
                                <>
                                    <button
                                        onClick={() => handleTtsSkip(-5)}
                                        className="p-2 hover:bg-white rounded-xl text-indigo-400 transitioning active:scale-95"
                                        title="Retroceder 5 segundos"
                                    >
                                        <SkipBack className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}

                            <button
                                onClick={handleTtsToggle}
                                disabled={isTtsLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border disabled:opacity-50 ${isTtsPlaying
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                            >
                                {isTtsLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isTtsPlaying ? (
                                    <PauseCircle className="w-3.5 h-3.5" />
                                ) : (
                                    <Volume2 className="w-3.5 h-3.5" />
                                )}
                                <span>{isTtsPlaying ? 'Cerrar' : 'Leer'}</span>
                            </button>

                            {isTtsPlaying && (
                                <>
                                    <button
                                        onClick={() => handleTtsSkip(5)}
                                        className="p-2 hover:bg-white rounded-xl text-indigo-400 transitioning active:scale-95"
                                        title="Adelantar 5 segundos"
                                    >
                                        <SkipForward className="w-3.5 h-3.5" />
                                    </button>

                                    <div className="h-4 w-[1px] bg-indigo-200 mx-1" />

                                    <div className="flex flex-col gap-1 min-w-[120px] px-2">
                                        <div className="flex justify-between text-[8px] font-black text-indigo-400 uppercase tracking-tighter">
                                            <span>{formatTtsTime(ttsCurrentTime)}</span>
                                            <span>{formatTtsTime(ttsDuration)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={ttsProgress}
                                            onChange={handleTtsSeek}
                                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <button
                                        onClick={handleTtsStop}
                                        className="p-2 hover:bg-red-50 rounded-xl text-red-400 transitioning active:scale-95 ml-1"
                                        title="Detener Lectura"
                                    >
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </>
                            )}
                        </div>

                        <button
                            onClick={handleAiDiagram}
                            disabled={isAiGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all border border-amber-100 disabled:opacity-50"
                        >
                            {isAiGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RoadmapIcon className="w-3.5 h-3.5" />}
                            <span>Diagramar con IA</span>
                        </button>

                        <button
                            onClick={handleAIExtractTasks}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Extraer Tareas</span>
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100 hover:border-emerald-100"
                            title="Exportar Tablas a CSV"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden bg-slate-50 print:block print:overflow-visible print:bg-white">
                <AnimatePresence mode="popLayout">
                    {(mode === 'editor' || mode === 'split') && (
                        <motion.div
                            key="editor-pane"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            className={`flex-1 flex flex-col bg-slate-950 p-8 pt-4 print:hidden ${mode === 'split' ? 'border-r border-slate-800' : ''}`}
                        >
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                                <span>Markdown Source</span>
                                <span>Líneas: {content.split('\n').length}</span>
                            </div>

                            {/* AI Quick Prompt */}
                            <div className="mb-4 relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        onClick={() => setShowAiPrompt(!showAiPrompt)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showAiPrompt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                                    >
                                        <Wand2 className="w-3.5 h-3.5" />
                                        <span>Escritura Inteligente</span>
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {showAiPrompt && (
                                        <motion.div
                                            key="ai-prompt-area"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden mb-4"
                                        >
                                            <div className="relative">
                                                <textarea
                                                    value={aiPrompt}
                                                    onChange={(e) => setAiPrompt(e.target.value)}
                                                    placeholder="Dime qué quieres redactar o mejorar... (ej: 'Escribe un resumen del alcance')"
                                                    className="w-full bg-slate-900 border border-indigo-500/30 rounded-2xl px-5 py-4 text-xs font-bold text-slate-200 focus:border-indigo-500 outline-none min-h-[100px] resize-none pr-14"
                                                    onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleAiGenerate()}
                                                />
                                                <button
                                                    onClick={handleAiGenerate}
                                                    disabled={isAiGenerating || !aiPrompt.trim()}
                                                    className="absolute bottom-4 right-4 w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                                                >
                                                    {isAiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                </button>
                                            </div>
                                            <div className="mt-2 text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 px-2">
                                                <Zap className="w-3 h-3" />
                                                <span>Ctrl + Enter para enviar al Core AI</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="flex-1 bg-transparent text-slate-300 font-mono text-sm resize-none outline-none selection:bg-indigo-500/30 w-full"
                                placeholder="Empieza a redactar usando Markdown..."
                            />
                        </motion.div>
                    )}

                    {(mode === 'preview' || mode === 'split') && (
                        <motion.div
                            key="preview-pane"
                            id="printable-content"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                            className="flex-1 overflow-y-auto bg-white p-12 md:p-20 print:p-0 print:overflow-visible"
                        >
                            <div className="max-w-3xl mx-auto prose prose-slate prose-indigo prose-img:rounded-3xl prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 prose-pre:bg-slate-900 prose-pre:rounded-2xl print:max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        margin: 1.5cm;
                        size: A4 portrait;
                    }

                    /* 
                       CRITICAL FIX: Hide the MAIN app content when in printing mode.
                       The 'body.is-printing' class is added by our JS handler.
                       This prevents the "Ghost Page 1" caused by the app's layout wrapper.
                    */
                    body.is-printing > *:not(#print-container-portal) {
                        display: none !important;
                    }

                    /* Ensure the body behaves as a simple document page */
                    body.is-printing {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                    }

                    /* Style the portal container to be the only visible thing */
                    #print-container-portal {
                        display: block !important;
                        width: 100% !important;
                        height: auto !important;
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    
                    /* Reset styles for the wrapper we injected */
                    .print-wrapper-reset {
                        width: 100%;
                        height: auto;
                    }

                    /* Ensure styling inside the clone is correct and reset layout props */
                    #print-container-portal #printable-content {
                        position: relative !important; /* No longer absolute needed as it is the only child */
                        top: auto !important;
                        left: auto !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        display: block !important;
                        overflow: visible !important;
                        height: auto !important;
                        transform: none !important;
                    }

                    /* Reset specific internal styles that might conflict */
                    .prose {
                        max-width: 100% !important;
                    }
                    
                    /* Typography consistency */
                    .prose p, .prose h1, .prose h2, .prose h3, .prose li {
                        page-break-inside: avoid;
                    }

                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    /* Hide scrollbars explicitly */
                    ::-webkit-scrollbar { display: none; }
                }
            ` }} />

            {showMediaManager && (
                <MediaManager
                    projectId={doc.projectId}
                    onClose={() => setShowMediaManager(false)}
                    onSelectImage={(markdown) => {
                        setContent(prev => prev + '\n\n' + markdown + '\n\n');
                        setShowMediaManager(false);
                        showToast('Imagen Insertada', 'Se ha agregado al final del documento.', 'success');
                    }}
                />
            )}

            {/* TTS Control Overlay */}
            <AnimatePresence>
                {isTtsPlaying && (
                    <motion.div
                        key="tts-overlay"
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[2rem] flex items-center gap-6 shadow-2xl shadow-indigo-500/20"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                                <Volume2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Lectura en curso</h4>
                                <p className="text-white text-xs font-bold mt-1 truncate max-w-[150px]">{title}</p>
                            </div>
                        </div>

                        <div className="h-8 w-[1px] bg-white/10" />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleTtsToggle}
                                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center justify-center transition-all"
                            >
                                <PauseCircle className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleTtsStop}
                                className="w-10 h-10 bg-white/10 hover:bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center transition-all"
                                title="Detener"
                            >
                                <Square className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default DocumentEditor;
