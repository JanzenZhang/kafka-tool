import React, { useState } from 'react';
import {
    Cable,
    Send,
    Radio,
    ChevronRight,
    Zap,
} from 'lucide-react';
import { ToastProvider } from './components/Toast';
import ConnectionManager from './pages/ConnectionManager';
import Producer from './pages/Producer';
import Consumer from './pages/Consumer';

const NAV_ITEMS = [
    { id: 'connections', label: 'Connections', icon: Cable, desc: 'Manage clusters' },
    { id: 'producer', label: 'Producer', icon: Send, desc: 'Send messages' },
    { id: 'consumer', label: 'Consumer', icon: Radio, desc: 'Listen to topics' },
];

export default function App() {
    const [activePage, setActivePage] = useState('connections');

    return (
        <ToastProvider>
            <div className="flex h-screen">
                {/* ── Sidebar ── */}
                <aside className="w-64 flex-shrink-0 bg-surface-secondary border-r border-border flex flex-col">
                    {/* App Title (draggable region for macOS) */}
                    <div className="drag-region px-5 pt-8 pb-6">
                        <div className="flex items-center gap-3 no-drag">
                            <div className="w-9 h-9 gradient-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/30">
                                <Zap size={18} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-gray-100 leading-tight">
                                    Kafka Tool
                                </h1>
                                <p className="text-[11px] text-gray-500 font-medium">
                                    Desktop Client
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const isActive = activePage === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActivePage(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-smooth group
                    ${isActive
                                            ? 'bg-accent/10 text-accent-hover border border-accent/20'
                                            : 'text-gray-400 hover:text-gray-200 hover:bg-surface-hover border border-transparent'
                                        }`}
                                >
                                    <Icon
                                        size={18}
                                        className={isActive ? 'text-accent' : 'text-gray-500 group-hover:text-gray-400'}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.label}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{item.desc}</p>
                                    </div>
                                    {isActive && (
                                        <ChevronRight size={14} className="text-accent/60" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-border">
                        <p className="text-[11px] text-gray-600">
                            Kafka Tool v1.0.0
                        </p>
                    </div>
                </aside>

                {/* ── Main Content ── */}
                <main className="flex-1 overflow-hidden bg-surface relative">
                    {/* All pages stay mounted; only the active one is visible */}
                    <div className={activePage === 'connections' ? 'h-full' : 'hidden'}>
                        <ConnectionManager />
                    </div>
                    <div className={activePage === 'producer' ? 'h-full' : 'hidden'}>
                        <Producer />
                    </div>
                    <div className={activePage === 'consumer' ? 'h-full' : 'hidden'}>
                        <Consumer />
                    </div>
                </main>
            </div>
        </ToastProvider>
    );
}
