import React from 'react';

// ── Button ──
export function Button({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    className = '',
    ...props
}) {
    const base =
        'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'gradient-accent text-white hover:opacity-90 shadow-lg shadow-accent/20',
        secondary: 'bg-surface-tertiary text-gray-200 hover:bg-surface-hover border border-border',
        danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20',
        ghost: 'text-gray-400 hover:text-gray-200 hover:bg-surface-hover',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-2.5 text-sm',
    };

    return (
        <button
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            )}
            {children}
        </button>
    );
}

// ── Input ──
export function Input({ label, error, className = '', ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <input
                className={`w-full px-3 py-2 bg-surface rounded-lg border text-sm text-gray-100 placeholder-gray-500 
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-smooth
          ${error ? 'border-red-500/50' : 'border-border'} ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

// ── TextArea ──
export function TextArea({ label, error, className = '', ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <textarea
                className={`w-full px-3 py-2 bg-surface rounded-lg border text-sm text-gray-100 placeholder-gray-500 font-mono
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-smooth resize-none
          ${error ? 'border-red-500/50' : 'border-border'} ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

// ── Select ──
export function Select({ label, options = [], placeholder, className = '', ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-gray-300">
                    {label}
                </label>
            )}
            <select
                className={`w-full px-3 py-2 bg-surface rounded-lg border border-border text-sm text-gray-100 
          focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-smooth
          appearance-none cursor-pointer ${className}`}
                {...props}
            >
                {placeholder && (
                    <option value="" className="text-gray-500">
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-surface">
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// ── Badge ──
export function Badge({ children, variant = 'default', className = '' }) {
    const variants = {
        default: 'bg-gray-500/15 text-gray-400',
        success: 'bg-emerald-500/15 text-emerald-400',
        danger: 'bg-red-500/15 text-red-400',
        warning: 'bg-amber-500/15 text-amber-400',
        accent: 'bg-indigo-500/15 text-indigo-400',
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}
        >
            {children}
        </span>
    );
}
