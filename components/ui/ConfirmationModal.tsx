import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Check } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    const variantStyles = {
        danger: {
            icon: <AlertCircle className="w-8 h-8 text-rose-600" />,
            button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100 text-white',
            bg: 'bg-rose-50'
        },
        warning: {
            icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100 text-white',
            bg: 'bg-amber-50'
        },
        info: {
            icon: <AlertCircle className="w-8 h-8 text-indigo-600" />,
            button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 text-white',
            bg: 'bg-indigo-50'
        }
    };

    const style = variantStyles[variant];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white rounded-[2.5rem] p-8 w-full max-w-md relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden"
                    >
                        {/* Decorative background element */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${style.bg} rounded-full -mr-16 -mt-16 opacity-50 blur-3xl`} />

                        <div className="flex flex-col items-center text-center">
                            <div className={`w-16 h-16 ${style.bg} rounded-3xl flex items-center justify-center mb-6 relative`}>
                                {style.icon}
                            </div>

                            <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 px-4">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-10 px-6">
                                {message}
                            </p>

                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onConfirm();
                                    }}
                                    className={`w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] ${style.button}`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <Check className="w-4 h-4" />
                                        {confirmLabel}
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onCancel();
                                    }}
                                    className="w-full py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[12px] uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-[0.98] border border-slate-100"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <X className="w-4 h-4" />
                                        {cancelLabel}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
