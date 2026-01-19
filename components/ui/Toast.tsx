import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
    id: string;
    message: string;
    description?: string;
    variant: ToastVariant;
    onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, description, variant, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    const variantStyles = {
        success: {
            icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
            bg: 'bg-white',
            border: 'border-emerald-100',
            accent: 'bg-emerald-500'
        },
        error: {
            icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
            bg: 'bg-white',
            border: 'border-rose-100',
            accent: 'bg-rose-500'
        },
        info: {
            icon: <Info className="w-5 h-5 text-indigo-500" />,
            bg: 'bg-white',
            border: 'border-indigo-100',
            accent: 'bg-indigo-500'
        }
    };

    const style = variantStyles[variant];

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
            className={`w-80 pointer-events-auto relative overflow-hidden bg-white rounded-3xl shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border ${style.border} p-5 flex items-start gap-4`}
        >
            <div className={`mt-0.5 shrink-0 w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center border ${style.border} shadow-sm`}>
                {style.icon}
            </div>

            <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-none mb-1 capitalize">
                    {message}
                </h4>
                {description && (
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
                        {description}
                    </p>
                )}
            </div>

            <button
                onClick={() => onClose(id)}
                className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Progress bar */}
            <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: "linear" }}
                className={`absolute bottom-0 left-0 h-1 ${style.accent} opacity-20`}
            />
        </motion.div>
    );
};

export default Toast;
