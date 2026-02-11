
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Calendar,
    ChevronRight,
    Loader2,
    Check,
    Download,
    BarChart,
    Sparkles,
    Bot,
    Printer,
    ChevronLeft,
    DollarSign,
    Save,
    CheckCircle,
    FileText as FileIcon,
    User,
    Clock
} from 'lucide-react';
import { Project, Profile } from '../types';
import { reportService } from '../services/reportService';

interface ReportBotProps {
    projects: Project[];
    profile: Profile | null;
}

type BotStep = 'START' | 'SELECT_MODE' | 'SELECT_PROJECT' | 'SELECT_TYPE' | 'SELECT_DATES' | 'INPUT_AMOUNT' | 'GENERATING' | 'PREVIEW';
type ReportMode = 'project' | 'personal';

const ReportBot: React.FC<ReportBotProps> = ({ projects, profile }) => {
    const [step, setStep] = useState<BotStep>('START');
    const [mode, setMode] = useState<ReportMode>('project');
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [reportType, setReportType] = useState<'activity' | 'estimate'>('activity');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [amount, setAmount] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportHtml, setReportHtml] = useState<string>('');
    const [reportMarkdown, setReportMarkdown] = useState<string>('');
    const [isSaving, setIsGeneratingDoc] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handleStart = () => setStep('SELECT_MODE');

    const handleModeSelect = (m: ReportMode) => {
        setMode(m);
        if (m === 'personal') {
            setReportType('activity');
            setStep('SELECT_DATES');
        } else {
            setStep('SELECT_PROJECT');
        }
    };

    const handleProjectSelect = (project: Project) => {
        setSelectedProject(project);
        setStep('SELECT_TYPE');
    };

    const handleTypeSelect = (type: 'activity' | 'estimate') => {
        setReportType(type);
        setStep('SELECT_DATES');
    };

    const handleDatesSubmit = () => {
        if (mode === 'project' && reportType === 'estimate') {
            setStep('INPUT_AMOUNT');
        } else {
            generateReport();
        }
    };

    const applyShortcut = (shortcut: 'this-week' | 'this-month' | 'last-month') => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (shortcut === 'this-week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            start = new Date(today.setDate(diff));
            end = new Date();
        } else if (shortcut === 'this-month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date();
        } else if (shortcut === 'last-month') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
        }

        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const generateReport = async () => {
        setIsGenerating(true);
        setStep('GENERATING');

        try {
            let activities = [];
            if (mode === 'project' && selectedProject) {
                activities = await reportService.fetchActivities(
                    selectedProject.id,
                    `${dateRange.start}T00:00:00Z`,
                    `${dateRange.end}T23:59:59Z`
                );
            } else if (mode === 'personal' && profile) {
                activities = await reportService.fetchGlobalActivities(
                    profile.id,
                    `${dateRange.start}T00:00:00Z`,
                    `${dateRange.end}T23:59:59Z`
                );
            }

            const summary = await reportService.summarizeActivities(
                activities,
                reportType,
                profile?.id,
                amount > 0 ? amount : undefined,
                mode,
                dateRange.start,
                dateRange.end
            );

            const displayProjectName = mode === 'personal' ? 'Mi Historial Laboral' : (selectedProject?.name || '');

            const html = reportService.generateReportHtml({
                projectName: displayProjectName,
                summary,
                activities,
                startDate: dateRange.start,
                endDate: dateRange.end,
                totalAmount: amount > 0 ? amount : undefined,
                type: reportType
            });

            setReportHtml(html);
            setReportMarkdown(summary);
            setStep('PREVIEW');
        } catch (error) {
            console.error("Error generating report:", error);
            setStep('START');
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => {
        if (iframeRef.current) {
            iframeRef.current.contentWindow?.print();
        }
    };

    const handleSaveToDocs = async () => {
        if (!selectedProject || !reportMarkdown) return;

        setIsGeneratingDoc(true);
        setSaveSuccess(false);

        try {
            const title = `${reportType === 'activity' ? 'Reporte' : 'Presupuesto'} - ${selectedProject.name} (${new Date().toLocaleDateString()})`;

            // Construir un documento Markdown formateado
            const fullMarkdown = `# ${title}\n\n` +
                `**Proyecto:** ${selectedProject.name}\n` +
                `**Periodo:** ${new Date(dateRange.start).toLocaleDateString()} al ${new Date(dateRange.end).toLocaleDateString()}\n` +
                (amount > 0 ? `**Monto Estimado:** $${amount} USD\n` : '') +
                `\n---\n\n` +
                reportMarkdown;

            await reportService.saveReportAsDoc(selectedProject.id, title, fullMarkdown);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error("Error saving document:", error);
        } finally {
            setIsGeneratingDoc(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 min-h-[70vh] flex flex-col items-center">
            <AnimatePresence mode="wait">
                {step === 'START' && (
                    <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-8"
                    >
                        <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 rotate-6">
                            <Bot className="text-white w-12 h-12" />
                        </div>
                        <div className="space-y-4">
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Report Bot Automated</h1>
                            <p className="text-lg text-slate-500 max-w-md mx-auto">
                                Genera reportes profesionales de actividad o presupuestos para tus clientes en segundos.
                            </p>
                        </div>
                        <button
                            onClick={handleStart}
                            className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                        >
                            Comenzar <ChevronRight className="w-6 h-6" />
                        </button>
                    </motion.div>
                )}

                {step === 'SELECT_MODE' && (
                    <motion.div
                        key="mode"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full space-y-8"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <button onClick={() => setStep('START')} className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft /></button>
                            <h2 className="text-2xl font-black text-slate-900">¿Qué tipo de análisis haremos?</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => handleModeSelect('project')}
                                className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-center space-y-4 group"
                            >
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <FileIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Reporte de Proyecto</h3>
                                    <p className="text-sm text-slate-400 mt-2">Resumen ejecutivo para clientes o seguimiento de hitos.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleModeSelect('personal')}
                                className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-center space-y-4 group"
                            >
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Mi Historial Laboral</h3>
                                    <p className="text-sm text-slate-400 mt-2">Responde "¿Qué hice en estas fechas?" entre todos mis proyectos.</p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'SELECT_PROJECT' && (
                    <motion.div
                        key="projects"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full space-y-8"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <button onClick={() => setStep('START')} className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft /></button>
                            <h2 className="text-2xl font-black text-slate-900">¿Para qué proyecto es el reporte?</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleProjectSelect(p)}
                                    className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-left flex items-center justify-between group"
                                >
                                    <div>
                                        <h3 className="font-bold text-slate-800">{p.name}</h3>
                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-black mt-1">Status: {p.status}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'SELECT_TYPE' && (
                    <motion.div
                        key="type"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full space-y-8"
                    >
                        <div className="flex items-center gap-4 mb-10">
                            <button onClick={() => setStep('SELECT_PROJECT')} className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft /></button>
                            <h2 className="text-2xl font-black text-slate-900">Tipo de Reporte</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => handleTypeSelect('activity')}
                                className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-center space-y-4 group"
                            >
                                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <BarChart className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Resumen de Actividad</h3>
                                    <p className="text-sm text-slate-400 mt-2">Muestra el progreso y tareas completadas en un periodo.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => handleTypeSelect('estimate')}
                                className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 hover:border-indigo-500 transition-all text-center space-y-4 group"
                            >
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <DollarSign className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Presupuesto / Estimación</h3>
                                    <p className="text-sm text-slate-400 mt-2">Ideal para propuestas comerciales y cobros por hitos.</p>
                                </div>
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 'SELECT_DATES' && (
                    <motion.div
                        key="dates"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50"
                    >
                        <div className="space-y-2 text-center mb-8">
                            <Calendar className="w-12 h-12 text-indigo-600 mx-auto" />
                            <h2 className="text-2xl font-black text-slate-900">Rango de Fechas</h2>
                            <p className="text-sm text-slate-400">¿Qué periodo quieres analizar?</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6 justify-center">
                            <button onClick={() => applyShortcut('this-week')} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">Esta semana</button>
                            <button onClick={() => applyShortcut('this-month')} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">Este mes</button>
                            <button onClick={() => applyShortcut('last-month')} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-full text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all">Mes anterior</button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Desde</label>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Hasta</label>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={handleDatesSubmit}
                                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                            >
                                Continuar <ChevronRight className="w-4 h-4" />
                            </button>
                            <button onClick={() => setStep(mode === 'personal' ? 'SELECT_MODE' : 'SELECT_TYPE')} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600">Atrás</button>
                        </div>
                    </motion.div>
                )}

                {step === 'INPUT_AMOUNT' && (
                    <motion.div
                        key="amount"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md space-y-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-50"
                    >
                        <div className="space-y-2 text-center mb-8">
                            <DollarSign className="w-12 h-12 text-emerald-600 mx-auto" />
                            <h2 className="text-2xl font-black text-slate-900">Total Presupuestado</h2>
                            <p className="text-sm text-slate-400">Ingresa el monto para el reporte.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="relative">
                                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-14 pr-6 py-5 text-xl font-black focus:border-emerald-500 outline-none transition-all"
                                />
                            </div>
                            <button
                                onClick={generateReport}
                                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                            >
                                Generar Reporte <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setStep('SELECT_DATES')} className="w-full text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600">Atrás</button>
                        </div>
                    </motion.div>
                )}

                {step === 'GENERATING' && (
                    <motion.div
                        key="generating"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8"
                    >
                        <div className="relative">
                            <div className="w-32 h-32 bg-slate-900 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl relative z-10">
                                <Sparkles className="text-indigo-400 w-12 h-12 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse"></div>
                            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 text-indigo-600/20 animate-spin-slow z-0" />
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-slate-900">El Cerebro está trabajando...</h2>
                            <p className="text-slate-500 font-medium">Analizando actividades y redactando el resumen ejecutivo.</p>
                            <div className="flex justify-center gap-2">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                        className="w-2 h-2 bg-indigo-600 rounded-full"
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'PREVIEW' && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full h-full flex flex-col gap-6"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setStep('START')} className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft /></button>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900">Vista Previa del Reporte</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Listo para exportar</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveToDocs}
                                    disabled={isSaving || saveSuccess}
                                    className={`${saveSuccess ? 'bg-emerald-500' : 'bg-indigo-600'} text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50`}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Guardando...' : saveSuccess ? 'Guardado' : 'Guardar en Proyecto'}
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-2 hover:bg-black transition-all"
                                >
                                    <Printer className="w-4 h-4" /> Imprimir / PDF
                                </button>
                                <button
                                    onClick={() => setStep('START')}
                                    className="bg-white text-slate-600 border border-slate-100 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all"
                                >
                                    Nuevo Reporte
                                </button>
                            </div>
                        </div>

                        <div className="w-full h-[85vh] relative group rounded-2xl overflow-hidden">
                            <iframe
                                ref={iframeRef}
                                title="Report Preview"
                                srcDoc={reportHtml}
                                className="w-full h-full border-none"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default ReportBot;
