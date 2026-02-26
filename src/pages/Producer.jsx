import React, { useState, useEffect, useCallback } from 'react';
import {
    Send,
    RefreshCw,
    CheckCircle2,
    FileJson,
    Key,
    MessageSquare,
} from 'lucide-react';
import { Button, Input, Select, TextArea, Badge } from '../components/UI';
import { useToast } from '../components/Toast';
import SearchableSelect from '../components/SearchableSelect';

export default function Producer() {
    const [connections, setConnections] = useState([]);
    const [selectedConn, setSelectedConn] = useState('');
    const [topics, setTopics] = useState([]);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [topic, setTopic] = useState('');
    const [customTopic, setCustomTopic] = useState('');
    const [useCustomTopic, setUseCustomTopic] = useState(false);
    const [messageKey, setMessageKey] = useState('');
    const [messageValue, setMessageValue] = useState('');
    const [jsonError, setJsonError] = useState('');
    const [sending, setSending] = useState(false);
    const [lastResult, setLastResult] = useState(null);
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
                setTopics([]);
            }
        } catch (err) {
            toast.error(err.message);
            setTopics([]);
        }
        setLoadingTopics(false);
    }, [selectedConn, toast]);

    useEffect(() => {
        if (selectedConn) {
            fetchTopics();
        }
    }, [selectedConn, fetchTopics]);

    const validateJSON = () => {
        if (!messageValue.trim()) {
            setJsonError('');
            return true;
        }
        try {
            const parsed = JSON.parse(messageValue);
            setMessageValue(JSON.stringify(parsed, null, 2));
            setJsonError('');
            toast.success('Valid JSON');
            return true;
        } catch (err) {
            setJsonError(err.message);
            return false;
        }
    };

    const handleSend = async () => {
        const targetTopic = useCustomTopic ? customTopic.trim() : topic;
        if (!selectedConn) {
            toast.error('Please select a connection');
            return;
        }
        if (!targetTopic) {
            toast.error('Please select or enter a topic');
            return;
        }
        if (!messageValue.trim()) {
            toast.error('Please enter a message value');
            return;
        }

        setSending(true);
        setLastResult(null);
        try {
            if (window.kafkaAPI) {
                const result = await window.kafkaAPI.produce(
                    selectedConn,
                    targetTopic,
                    messageKey,
                    messageValue
                );
                if (result.success) {
                    setLastResult(result);
                    toast.success(
                        `Partition: ${result.partition}, Offset: ${result.baseOffset}`,
                        'Message sent'
                    );
                } else {
                    toast.error(result.error, 'Send failed');
                }
            }
        } catch (err) {
            toast.error(err.message, 'Send error');
        }
        setSending(false);
    };

    const activeTopic = useCustomTopic ? customTopic : topic;

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="drag-region px-8 pt-8 pb-6">
                <div className="no-drag">
                    <h1 className="text-2xl font-bold text-gray-100">Producer</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Send messages to Kafka topics
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
                <div className="max-w-2xl space-y-6">
                    {/* Cluster Selection */}
                    <div className="glass rounded-xl p-5 space-y-4 relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={16} className="text-accent" />
                            <h2 className="text-sm font-semibold text-gray-200">
                                Target
                            </h2>
                        </div>

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

                        {/* Topic Selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300">
                                    Topic
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setUseCustomTopic(!useCustomTopic)}
                                        className={`text-xs px-2 py-1 rounded transition-smooth ${useCustomTopic
                                            ? 'bg-accent/15 text-accent'
                                            : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                    >
                                        {useCustomTopic ? 'Use dropdown' : 'Custom topic'}
                                    </button>
                                    {!useCustomTopic && selectedConn && (
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
                            </div>

                            {useCustomTopic ? (
                                <Input
                                    placeholder="Enter topic name..."
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                />
                            ) : (
                                <SearchableSelect
                                    placeholder={loadingTopics ? 'Loading topics...' : 'Search a topic...'}
                                    value={topic}
                                    onChange={setTopic}
                                    options={topics.map((t) => ({ value: t, label: t }))}
                                    disabled={!selectedConn || loadingTopics}
                                />
                            )}
                        </div>
                    </div>

                    {/* Message */}
                    <div className="glass rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Key size={16} className="text-accent" />
                            <h2 className="text-sm font-semibold text-gray-200">
                                Message
                            </h2>
                        </div>

                        <Input
                            label="Message Key (optional)"
                            placeholder="Enter message key..."
                            value={messageKey}
                            onChange={(e) => setMessageKey(e.target.value)}
                        />

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-gray-300">
                                    Message Value
                                </label>
                                <Button size="sm" variant="ghost" onClick={validateJSON}>
                                    <FileJson size={14} />
                                    Validate JSON
                                </Button>
                            </div>
                            <TextArea
                                placeholder='{"key": "value"}'
                                value={messageValue}
                                onChange={(e) => {
                                    setMessageValue(e.target.value);
                                    setJsonError('');
                                }}
                                rows={10}
                                error={jsonError}
                            />
                        </div>
                    </div>

                    {/* Send Button & Result */}
                    <div className="flex items-center gap-4">
                        <Button
                            size="lg"
                            onClick={handleSend}
                            loading={sending}
                            disabled={!selectedConn || !activeTopic || !messageValue.trim()}
                        >
                            <Send size={16} />
                            Send Message
                        </Button>

                        {lastResult && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                                <span className="text-sm text-gray-300">
                                    Sent to{' '}
                                    <span className="text-gray-100 font-mono">
                                        partition {lastResult.partition}
                                    </span>
                                    , offset{' '}
                                    <span className="text-gray-100 font-mono">
                                        {lastResult.baseOffset}
                                    </span>
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
