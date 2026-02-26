import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

const PRESETS = [
    { label: '5 分钟前', minutes: 5 },
    { label: '15 分钟前', minutes: 15 },
    { label: '30 分钟前', minutes: 30 },
    { label: '1 小时前', minutes: 60 },
    { label: '3 小时前', minutes: 180 },
    { label: '6 小时前', minutes: 360 },
    { label: '12 小时前', minutes: 720 },
    { label: '24 小时前', minutes: 1440 },
];

function toLocalISOString(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function DateTimePicker({ value, onChange, disabled }) {
    const [showPresets, setShowPresets] = useState(false);

    const handlePreset = (minutes) => {
        const d = new Date(Date.now() - minutes * 60 * 1000);
        onChange(toLocalISOString(d));
        setShowPresets(false);
    };

    // Display label
    const displayLabel = value
        ? new Date(value).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        : '选择时间...';

    return (
        <div className="relative mt-2">
            <div className="flex gap-2 items-stretch">
                {/* Main datetime input styled as a button-like control */}
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        <Clock size={14} />
                    </div>
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                        step="1"
                        className="w-full pl-9 pr-3 py-2 bg-surface rounded-lg border border-border text-sm text-gray-100
                            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-smooth
                            disabled:opacity-50 disabled:cursor-not-allowed
                            [color-scheme:dark]"
                    />
                </div>

                {/* Quick preset dropdown */}
                <div className="relative">
                    <button
                        onClick={() => !disabled && setShowPresets(!showPresets)}
                        disabled={disabled}
                        className={`h-full px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-smooth
                            ${showPresets
                                ? 'bg-accent/15 text-accent border-accent/30'
                                : 'bg-surface text-gray-400 border-border hover:border-gray-600 hover:text-gray-300'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        快捷选择
                        <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
                    </button>

                    {showPresets && (
                        <>
                            {/* Invisible backdrop to close dropdown */}
                            <div
                                className="fixed inset-0 z-30"
                                onClick={() => setShowPresets(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-40 w-36 bg-surface-secondary border border-border rounded-lg shadow-xl overflow-hidden animate-fade-in">
                                {PRESETS.map((preset) => (
                                    <button
                                        key={preset.minutes}
                                        onClick={() => handlePreset(preset.minutes)}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-surface-hover hover:text-gray-100 transition-smooth"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
