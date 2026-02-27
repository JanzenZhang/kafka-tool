import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    Wifi,
    WifiOff,
    Server,
    Shield,
    CheckCircle2,
    Loader2,
    PlugZap,
    Unplug,
} from 'lucide-react';
import { Button, Input, Badge } from '../components/UI';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

const EMPTY_FORM = {
    id: '',
    name: '',
    brokers: '',
    authType: 'NONE',
    username: '',
    password: '',
    ssl: false,
};

export default function ConnectionManager() {
    const [connections, setConnections] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [editing, setEditing] = useState(false);
    const [testing, setTesting] = useState(null); // connId being tested
    const [connecting, setConnecting] = useState(null);
    const [connectedIds, setConnectedIds] = useState(new Set());
    const toast = useToast();

    const loadConnections = useCallback(async () => {
        if (window.kafkaAPI) {
            const conns = await window.kafkaAPI.getConnections();
            setConnections(conns);
        }
    }, []);

    useEffect(() => {
        loadConnections();
    }, [loadConnections]);

    const openAddModal = () => {
        setForm({ ...EMPTY_FORM, id: crypto.randomUUID() });
        setEditing(false);
        setShowModal(true);
    };

    const openEditModal = (conn) => {
        setForm({
            ...conn,
            // If ssl is undefined (old config), default to true if SASL, else false
            ssl: conn.ssl !== undefined
                ? conn.ssl
                : conn.authType === 'SASL_PLAIN',
        });
        setEditing(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.brokers.trim()) {
            toast.error('Please fill in Cluster Name and Brokers');
            return;
        }
        if (window.kafkaAPI) {
            await window.kafkaAPI.saveConnection(form);
            await loadConnections();
            toast.success(
                editing ? 'Connection updated' : 'Connection added',
                form.name
            );
        }
        setShowModal(false);
    };

    const handleDelete = async (conn) => {
        if (window.kafkaAPI) {
            await window.kafkaAPI.deleteConnection(conn.id);
            setConnectedIds((prev) => {
                const next = new Set(prev);
                next.delete(conn.id);
                return next;
            });
            await loadConnections();
            toast.info(`"${conn.name}" deleted`);
        }
    };

    const handleTest = async (conn) => {
        setTesting(conn.id);
        try {
            if (window.kafkaAPI) {
                const result = await window.kafkaAPI.testConnection(conn);
                if (result.success) {
                    toast.success(
                        `${result.brokers} broker(s) found, controller: ${result.controller}`,
                        'Connection successful'
                    );
                } else {
                    toast.error(result.error, 'Connection failed');
                }
            }
        } catch (err) {
            toast.error(err.message, 'Connection test error');
        }
        setTesting(null);
    };

    const handleConnect = async (conn) => {
        setConnecting(conn.id);
        try {
            if (window.kafkaAPI) {
                const result = await window.kafkaAPI.connectCluster(conn.id);
                if (result.success) {
                    setConnectedIds((prev) => new Set(prev).add(conn.id));
                    toast.success(`Connected to "${conn.name}"`);
                } else {
                    toast.error(result.error, 'Connect failed');
                }
            }
        } catch (err) {
            toast.error(err.message);
        }
        setConnecting(null);
    };

    const handleDisconnect = async (conn) => {
        if (window.kafkaAPI) {
            await window.kafkaAPI.disconnectCluster(conn.id);
            setConnectedIds((prev) => {
                const next = new Set(prev);
                next.delete(conn.id);
                return next;
            });
            toast.info(`Disconnected from "${conn.name}"`);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="drag-region px-8 pt-8 pb-6">
                <div className="no-drag flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-100">Connections</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage your Kafka cluster connections
                        </p>
                    </div>
                    <Button onClick={openAddModal}>
                        <Plus size={16} />
                        Add Connection
                    </Button>
                </div>
            </div>

            {/* Connection List */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {connections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mb-4">
                            <Server size={28} className="text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-300 mb-1">
                            No connections yet
                        </h3>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm">
                            Add your first Kafka cluster connection to get started with producing and consuming messages.
                        </p>
                        <Button onClick={openAddModal}>
                            <Plus size={16} />
                            Add Connection
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                        {connections.map((conn) => {
                            const isConnected = connectedIds.has(conn.id);
                            const isTesting = testing === conn.id;
                            const isConnecting = connecting === conn.id;

                            return (
                                <div
                                    key={conn.id}
                                    className="glass rounded-xl p-5 transition-smooth hover:border-accent/20 group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : 'bg-surface-tertiary text-gray-500'
                                                    }`}
                                            >
                                                <Server size={18} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-100">
                                                    {conn.name}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">
                                                    {conn.brokers}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {isConnected ? (
                                                <Badge variant="success">Connected</Badge>
                                            ) : (
                                                <Badge>Disconnected</Badge>
                                            )}
                                            {conn.authType === 'SASL_PLAIN' && (
                                                <Badge variant="accent">
                                                    <Shield size={10} className="mr-1" />
                                                    SASL
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                                        {isConnected ? (
                                            <Button
                                                size="sm"
                                                variant="danger"
                                                onClick={() => handleDisconnect(conn)}
                                            >
                                                <Unplug size={14} />
                                                Disconnect
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleConnect(conn)}
                                                loading={isConnecting}
                                            >
                                                <PlugZap size={14} />
                                                Connect
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleTest(conn)}
                                            loading={isTesting}
                                        >
                                            {isTesting ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Wifi size={14} />
                                            )}
                                            Test
                                        </Button>
                                        <div className="flex-1" />
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => openEditModal(conn)}
                                        >
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDelete(conn)}
                                        >
                                            <Trash2 size={14} className="text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Add/Edit Modal ── */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title={editing ? 'Edit Connection' : 'New Connection'}
            >
                <div className="space-y-4">
                    <Input
                        label="Cluster Name"
                        placeholder="e.g. Production Cluster"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    <Input
                        label="Brokers"
                        placeholder="localhost:9092, broker2:9092"
                        value={form.brokers}
                        onChange={(e) =>
                            setForm((f) => ({ ...f, brokers: e.target.value }))
                        }
                    />

                    {/* Auth Type */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-300">
                            Authentication
                        </label>
                        <div className="flex gap-2">
                            {['NONE', 'SASL_PLAIN'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() =>
                                        setForm((f) => ({ ...f, authType: type }))
                                    }
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border
                    ${form.authType === type
                                            ? 'bg-accent/15 text-accent border-accent/30'
                                            : 'bg-surface text-gray-400 border-border hover:border-gray-600'
                                        }`}
                                >
                                    {type === 'NONE' ? 'None' : 'SASL/PLAIN'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.authType === 'SASL_PLAIN' && (
                        <div className="space-y-3 pl-3 border-l-2 border-accent/20">
                            <Input
                                label="Username"
                                placeholder="SASL username"
                                value={form.username}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, username: e.target.value }))
                                }
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="SASL password"
                                value={form.password}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, password: e.target.value }))
                                }
                            />
                        </div>
                    )}

                    {/* SSL/TLS Toggle */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-300">
                            Enable SSL/TLS
                        </label>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.ssl}
                            onClick={() => setForm((f) => ({ ...f, ssl: !f.ssl }))}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 ${form.ssl ? 'bg-accent' : 'bg-surface-tertiary border border-border'
                                }`}
                        >
                            <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${form.ssl ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button
                            variant="secondary"
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {editing ? 'Update' : 'Save Connection'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
