import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play,
    Square,
    RefreshCw,
    Trash2,
    Radio,
    Shuffle,
    ArrowDown,
    Eye,
    Users,
} from 'lucide-react';
import { Button, Input, Select, Badge } from '../components/UI';
import { useToast } from '../components/Toast';
import DateTimePicker from '../components/DateTimePicker';
import SearchableSelect from '../components/SearchableSelect';

export default function Consumer() {
    const [connections, setConnections] = useState([]);
    const [selectedConn, setSelectedConn] = useState('');
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [topic, setTopic] = useState('');
    const [mode, setMode] = useState('browse'); // 'browse' or 'group'
    const [groupId, setGroupId] = useState(`kafka-tool-${crypto.randomUUID().slice(0, 8)}`);
    const [startFrom, setStartFrom] = useState('latest'); // 'earliest', 'latest', 'specific', 'timestamp'
    const [customOffset, setCustomOffset] = useState('0');
    const [startTimestamp, setStartTimestamp] = useState('');
    const [listening, setListening] = useState(false);
    const [starting, setStarting] = useState(false);
    const [messages, setMessages] = useState([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const [consumerKey, setConsumerKey] = useState(null);
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const cleanupRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        if (window.kafkaAPI) {
            window.kafkaAPI.getConnections().then(setConnections);
        }
    }, []);

    const fetchTopics = useCallback(async () => {
        if (!selectedConn || !window.kafkaAPI) return;
        setLoadingTopics(true);
        try {
            const result = await window.kafkaAPI.listTopics(selectedConn);
            if (result.success) {
                setTopics(result.topics);
            } else {
                toast.error(result.error, 'Failed to load topics');
            }
        } catch (err) {
            toast.error(err.message);
        }
        setLoadingTopics(false);
    }, [selectedConn, toast]);

    useEffect(() => {
        if (selectedConn) fetchTopics();
    }, [selectedConn, fetchTopics]);

    // Auto-scroll
    useEffect(() => {
        if (autoScroll && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, autoScroll]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
        setAutoScroll(isAtBottom);
    };

    const generateGroupId = () => {
        setGroupId(`kafka-tool-${crypto.randomUUID().slice(0, 8)}`);
    };

    const handleStart = async () => {
        if (!selectedConn || !topic) {
            toast.error('Please select a connection and topic');
            return;
        }
        if (mode === 'group' && !groupId.trim()) {
            toast.error('Please set a Consumer Group ID');
            return;
        }

        setStarting(true);
        try {
            if (!window.kafkaAPI) return;

            // Set up message listener
            const cleanup = window.kafkaAPI.onConsumerMessage((msg) => {
                setMessages((prev) => [...prev, { ...msg, _id: Date.now() + Math.random() }]);
            });
            cleanupRef.current = cleanup;

            let result;
            if (mode === 'browse') {
                let offset = startFrom;
                if (startFrom === 'specific') offset = customOffset;
                else if (startFrom === 'timestamp' && startTimestamp) offset = `ts:${new Date(startTimestamp).getTime()}`;
                result = await window.kafkaAPI.browseConsumer(selectedConn, topic, offset);
            } else {
                result = await window.kafkaAPI.startConsumer(selectedConn, topic, groupId);
            }

            if (result.success) {
                setListening(true);
                setConsumerKey(result.consumerKey);
                const modeLabel = mode === 'browse' ? 'Browse' : 'Group';
                const extra = result.partitions ? ` (${result.partitions} partitions)` : '';
                toast.success(`${modeLabel} mode on "${topic}"${extra}`, 'Consumer started');
            } else {
                cleanup();
                cleanupRef.current = null;
                toast.error(result.error, 'Consumer start failed');
            }
        } catch (err) {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
            toast.error(err.message);
        } finally {
            setStarting(false);
        }
    };

    const handleStop = async () => {
        try {
            if (window.kafkaAPI && consumerKey) {
                await window.kafkaAPI.stopConsumer(selectedConn, consumerKey);
            }
        } catch (_) { }

        if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = null;
        }
        setListening(false);
        setConsumerKey(null);
        toast.info('Consumer stopped');
    };

    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        const date = new Date(Number(ts));
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
        });
    };

    const truncateValue = (val, max = 120) => {
        if (!val) return '—';
        return val.length > max ? val.slice(0, max) + '…' : val;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="drag-region px-8 pt-8 pb-6">
                <div className="no-drag flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-100">Consumer</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Listen to Kafka topics in real time
                        </p>
                    </div>
                    {listening && (
                        <Badge variant="success" className="animate-pulse-soft">
                            <Radio size={12} className="mr-1" />
                            Listening
                        </Badge>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 pb-4">
                <div className="glass rounded-xl p-5 relative z-10">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-medium text-gray-500 mr-1">Mode:</span>
                        <button
                            onClick={() => !listening && setMode('browse')}
                            disabled={listening}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border
                                ${mode === 'browse'
                                    ? 'bg-accent/15 text-accent border-accent/30'
                                    : 'bg-surface text-gray-400 border-border hover:border-gray-600'
                                } ${listening ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Eye size={12} />
                            Browse
                        </button>
                        <button
                            onClick={() => !listening && setMode('group')}
                            disabled={listening}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border
                                ${mode === 'group'
                                    ? 'bg-accent/15 text-accent border-accent/30'
                                    : 'bg-surface text-gray-400 border-border hover:border-gray-600'
                                } ${listening ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Users size={12} />
                            Consumer Group
                        </button>
                        <span className="text-[11px] text-gray-600 ml-2">
                            {mode === 'browse'
                                ? 'Read-only, no offset commits'
                                : 'Standard group consumption with offset tracking'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Select
                            label="Connection"
                            placeholder="Select a connection..."
                            value={selectedConn}
                            onChange={(e) => {
                                setSelectedConn(e.target.value);
                                setTopic('');
                                setTopics([]);
                            }}
                            options={connections.map((c) => ({
                                value: c.id,
                                label: `${c.name} — ${c.brokers}`,
                            }))}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-gray-300">
                                    Topic
                                </label>
                                {selectedConn && (
                                    <button
                                        onClick={fetchTopics}
                                        className="text-gray-500 hover:text-gray-300 transition-smooth"
                                        disabled={loadingTopics}
                                    >
                                        <RefreshCw
                                            size={14}
                                            className={loadingTopics ? 'animate-spin' : ''}
                                        />
                                    </button>
                                )}
                            </div>
                            <SearchableSelect
                                placeholder={loadingTopics ? 'Loading topics...' : 'Search a topic...'}
                                value={topic}
                                onChange={setTopic}
                                options={topics.map((t) => ({ value: t, label: t }))}
                                disabled={!selectedConn || loadingTopics}
                            />
                        </div>
                    </div>

                    {/* Mode-specific controls */}
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            {mode === 'browse' ? (
                                /* Browse mode: start offset selection */
                                <div>
                                    <label className="text-sm font-medium text-gray-300 block mb-1.5">
                                        Start From
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[
                                            { value: 'latest', label: 'Latest' },
                                            { value: 'earliest', label: 'Earliest' },
                                            { value: 'timestamp', label: 'By Time' },
                                            { value: 'specific', label: 'By Offset' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => !listening && setStartFrom(opt.value)}
                                                disabled={listening}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth border
                                                    ${startFrom === opt.value
                                                        ? 'bg-accent/15 text-accent border-accent/30'
                                                        : 'bg-surface text-gray-400 border-border hover:border-gray-600'
                                                    } ${listening ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    {startFrom === 'timestamp' && (
                                        <DateTimePicker
                                            value={startTimestamp}
                                            onChange={setStartTimestamp}
                                            disabled={listening}
                                        />
                                    )}
                                    {startFrom === 'specific' && (
                                        <input
                                            type="number"
                                            min="0"
                                            value={customOffset}
                                            onChange={(e) => setCustomOffset(e.target.value)}
                                            disabled={listening}
                                            className="mt-2 w-32 px-3 py-1.5 bg-surface rounded-lg border border-border text-xs text-gray-100 font-mono
                                                focus:outline-none focus:ring-2 focus:ring-accent/50 transition-smooth"
                                            placeholder="0"
                                        />
                                    )}
                                </div>
                            ) : (
                                /* Group mode: group ID input */
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-sm font-medium text-gray-300">
                                            Consumer Group ID
                                        </label>
                                        <button
                                            onClick={generateGroupId}
                                            className="text-xs text-gray-500 hover:text-accent flex items-center gap-1 transition-smooth"
                                        >
                                            <Shuffle size={12} />
                                            Random
                                        </button>
                                    </div>
                                    <Input
                                        placeholder="my-consumer-group"
                                        value={groupId}
                                        onChange={(e) => setGroupId(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            {listening ? (
                                <Button variant="danger" size="lg" onClick={handleStop}>
                                    <Square size={14} />
                                    Stop
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    onClick={handleStart}
                                    disabled={!selectedConn || !topic || starting}
                                >
                                    {starting ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} />
                                            Start
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Table */}
            <div className="flex-1 px-8 pb-8 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold text-gray-300">
                            Messages
                        </h2>
                        <Badge variant="accent">{messages.length}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setAutoScroll(true);
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`p-1.5 rounded-lg transition-smooth ${autoScroll
                                ? 'text-accent bg-accent/10'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-surface-hover'
                                }`}
                            title={autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
                        >
                            <ArrowDown size={14} />
                        </button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setMessages([])}
                            disabled={messages.length === 0}
                        >
                            <Trash2 size={14} />
                            Clear
                        </Button>
                    </div>
                </div>

                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface-secondary"
                >
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-16">
                            <Radio size={32} className="text-gray-700 mb-3" />
                            <p className="text-sm text-gray-500">
                                {listening
                                    ? 'Waiting for messages...'
                                    : 'Start a consumer to see messages here'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface-secondary border-b border-border z-10">
                                <tr className="text-left">
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                                        Timestamp
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                                        Partition
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                                        Offset
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                                        Key
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {messages.map((msg) => (
                                    <tr
                                        key={msg._id}
                                        className="hover:bg-surface-hover/50 transition-smooth animate-fade-in"
                                    >
                                        <td className="px-4 py-2 font-mono text-xs text-gray-400">
                                            {formatTimestamp(msg.timestamp)}
                                        </td>
                                        <td className="px-4 py-2">
                                            <Badge variant="accent">{msg.partition}</Badge>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-gray-300">
                                            {msg.offset}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-gray-400 truncate max-w-[144px]">
                                            {msg.key || '—'}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-xs text-gray-200 break-all">
                                            {truncateValue(msg.value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    );
}
