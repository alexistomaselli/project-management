import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import Toast, { ToastVariant } from '../components/ui/Toast';

interface ConfirmConfig {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel?: () => void;
}

interface ToastData {
    id: string;
    message: string;
    description?: string;
    variant: ToastVariant;
}

interface VisualFeedbackContextType {
    showToast: (message: string, description?: string, variant?: ToastVariant) => void;
    confirmAction: (config: ConfirmConfig) => void;
}

const VisualFeedbackContext = createContext<VisualFeedbackContextType | undefined>(undefined);

export const VisualFeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig & { isOpen: boolean }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const showToast = useCallback((message: string, description?: string, variant: ToastVariant = 'success') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, description, variant }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const confirmAction = useCallback((config: ConfirmConfig) => {
        setConfirmConfig({ ...config, isOpen: true });
    }, []);

    const handleConfirm = useCallback(() => {
        confirmConfig.onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }, [confirmConfig]);

    const handleCancel = useCallback(() => {
        if (confirmConfig.onCancel) confirmConfig.onCancel();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    }, [confirmConfig]);

    return (
        <VisualFeedbackContext.Provider value={{ showToast, confirmAction }}>
            {children}

            {/* Global Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmLabel={confirmConfig.confirmLabel}
                cancelLabel={confirmConfig.cancelLabel}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                variant={confirmConfig.variant}
            />

            {/* Global Toast Container */}
            <div className="fixed top-6 right-6 z-[300] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            id={toast.id}
                            message={toast.message}
                            description={toast.description}
                            variant={toast.variant}
                            onClose={removeToast}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </VisualFeedbackContext.Provider>
    );
};

export const useVisualFeedback = () => {
    const context = useContext(VisualFeedbackContext);
    if (!context) {
        throw new Error('useVisualFeedback must be used within a VisualFeedbackProvider');
    }
    return context;
};
