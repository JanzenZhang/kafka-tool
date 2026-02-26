import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
    return useContext(ToastContext);
}

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const COLORS = {
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    error: 'text-red-400 bg-red-500/10 border-red-500/20',
    info: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
};

function Toast({ toast, onDismiss }) {
    const Icon = ICONS[toast.type] || Info;

    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border animate-slide-up ${COLORS[toast.type]}`}
        >
            <Icon size={18} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className="text-sm font-medium text-gray-100">{toast.title}</p>
                )}
                <p className="text-sm text-gray-300">{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-500 hover:text-gray-300 transition-smooth"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((type, message, title) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, type, message, title }]);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = {
        success: (message, title) => addToast('success', message, title),
        error: (message, title) => addToast('error', message, title),
        info: (message, title) => addToast('info', message, title),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-96">
                {toasts.map((t) => (
                    <Toast key={t.id} toast={t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}
