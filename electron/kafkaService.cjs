const { Kafka, logLevel } = require('kafkajs');

class KafkaService {
    constructor() {
        // Map<connId, { client, admin, producer, consumers: Map<string, consumer> }>
        this.clients = new Map();
    }

    _buildConfig(connConfig) {
        const brokers = connConfig.brokers
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean);

        const config = {
            clientId: 'kafka-tool-desktop',
            brokers,
            logLevel: logLevel.WARN,
            connectionTimeout: 10000,
            requestTimeout: 30000,
        };

        if (connConfig.authType === 'SASL_PLAIN') {
            config.sasl = {
                mechanism: 'plain',
                username: connConfig.username || '',
                password: connConfig.password || '',
            };
            config.ssl = connConfig.ssl !== false;
        }

        return config;
    }

    async testConnection(connConfig) {
        const kafka = new Kafka(this._buildConfig(connConfig));
        const admin = kafka.admin();
        try {
            await admin.connect();
            const clusterInfo = await admin.describeCluster();
            await admin.disconnect();
            return {
                success: true,
                brokers: clusterInfo.brokers.length,
                controller: clusterInfo.controller,
            };
        } catch (err) {
            try {
                await admin.disconnect();
            } catch (_) { }
            return { success: false, error: err.message };
        }
    }

    async connect(connId, connConfig) {
        if (this.clients.has(connId)) {
            return { success: true };
        }

        const kafka = new Kafka(this._buildConfig(connConfig));
        const admin = kafka.admin();
        const producer = kafka.producer();

        try {
            await admin.connect();
            await producer.connect();
            this.clients.set(connId, {
                kafka,
                admin,
                producer,
                consumers: new Map(),
            });
            return { success: true };
        } catch (err) {
            try {
                await admin.disconnect();
            } catch (_) { }
            try {
                await producer.disconnect();
            } catch (_) { }
            return { success: false, error: err.message };
        }
    }

    async disconnect(connId) {
        const entry = this.clients.get(connId);
        if (!entry) return;

        // Stop all consumers for this connection
        for (const [, consumer] of entry.consumers) {
            try {
                await consumer.disconnect();
            } catch (_) { }
        }

        try {
            await entry.producer.disconnect();
        } catch (_) { }
        try {
            await entry.admin.disconnect();
        } catch (_) { }

        this.clients.delete(connId);
    }

    async listTopics(connId) {
        const entry = this.clients.get(connId);
        if (!entry) throw new Error('Not connected. Please connect first.');

        const topics = await entry.admin.listTopics();
        return topics.sort();
    }

    async produce(connId, topic, key, value) {
        const entry = this.clients.get(connId);
        if (!entry) throw new Error('Not connected. Please connect first.');

        const messages = [
            {
                key: key || null,
                value: value,
            },
        ];

        const result = await entry.producer.send({
            topic,
            messages,
        });

        return {
            success: true,
            topicName: result[0].topicName,
            partition: result[0].partition,
            baseOffset: result[0].baseOffset,
        };
    }

    async startConsumer(connId, connConfig, topic, groupId, onMessage) {
        let entry = this.clients.get(connId);
        if (!entry) {
            const kafka = new Kafka(this._buildConfig(connConfig));
            const admin = kafka.admin();
            const producer = kafka.producer();
            await admin.connect();
            await producer.connect();
            entry = { kafka, admin, producer, consumers: new Map() };
            this.clients.set(connId, entry);
        }

        const consumerKey = `group:${topic}:${groupId}`;

        if (entry.consumers.has(consumerKey)) {
            try {
                await entry.consumers.get(consumerKey).disconnect();
            } catch (_) { }
            entry.consumers.delete(consumerKey);
        }

        const consumer = entry.kafka.consumer({ groupId });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                onMessage({
                    topic,
                    partition,
                    offset: message.offset,
                    key: message.key ? message.key.toString() : null,
                    value: message.value ? message.value.toString() : null,
                    timestamp: message.timestamp,
                });
            },
        });

        entry.consumers.set(consumerKey, consumer);
        return { success: true };
    }

    async startBrowseConsumer(connId, connConfig, topic, startFrom, onMessage) {
        let entry = this.clients.get(connId);
        if (!entry) {
            const kafka = new Kafka(this._buildConfig(connConfig));
            const admin = kafka.admin();
            const producer = kafka.producer();
            await admin.connect();
            await producer.connect();
            entry = { kafka, admin, producer, consumers: new Map() };
            this.clients.set(connId, entry);
        }

        const browseKey = `browse:${topic}`;

        if (entry.consumers.has(browseKey)) {
            try {
                await entry.consumers.get(browseKey).disconnect();
            } catch (_) { }
            entry.consumers.delete(browseKey);
        }

        // Ephemeral random group — never reused, offsets never committed
        const browseGroupId = `kafka-tool-browse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const consumer = entry.kafka.consumer({ groupId: browseGroupId });
        await consumer.connect();

        // Subscribe — fromBeginning only matters if no seek overrides it
        await consumer.subscribe({ topic, fromBeginning: true });

        // Get partition info for seeking
        const offsets = await entry.admin.fetchTopicOffsets(topic);
        const partitionCount = offsets.length;

        // Start consumer FIRST — KafkaJS v2 requires run() before seek()
        await consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                onMessage({
                    topic,
                    partition,
                    offset: message.offset,
                    key: message.key ? message.key.toString() : null,
                    value: message.value ? message.value.toString() : null,
                    timestamp: message.timestamp,
                });
            },
        });

        // Now seek to requested position (takes effect on next fetch cycle)
        if (startFrom === 'latest') {
            for (const o of offsets) {
                consumer.seek({ topic, partition: o.partition, offset: o.high });
            }
        } else if (typeof startFrom === 'string' && startFrom.startsWith('ts:')) {
            const timestamp = Number(startFrom.slice(3));
            const offsetsByTime = await entry.admin.fetchTopicOffsetsByTimestamp(topic, timestamp);
            for (const o of offsetsByTime) {
                const seekOffset = o.offset === '-1'
                    ? offsets.find(x => x.partition === o.partition)?.high || '0'
                    : o.offset;
                consumer.seek({ topic, partition: o.partition, offset: seekOffset });
            }
        } else if (startFrom !== 'earliest') {
            const specificOffset = String(startFrom);
            for (const o of offsets) {
                consumer.seek({ topic, partition: o.partition, offset: specificOffset });
            }
        }
        // 'earliest' — fromBeginning: true handles it, no seek needed

        // Store consumer with its groupId for cleanup
        entry.consumers.set(browseKey, { consumer, groupId: browseGroupId });
        return { success: true, partitions: partitionCount };
    }

    async stopConsumer(connId, consumerKey) {
        const entry = this.clients.get(connId);
        if (!entry) return;

        const stored = entry.consumers.get(consumerKey);
        if (!stored) return;

        // Browse consumers are stored as { consumer, groupId }, group consumers as raw consumer
        const isBrowse = stored.consumer && stored.groupId;
        const consumer = isBrowse ? stored.consumer : stored;

        await consumer.disconnect();
        entry.consumers.delete(consumerKey);

        // Clean up ephemeral browse group from Kafka metadata
        if (isBrowse && entry.admin) {
            try {
                await entry.admin.deleteGroups([stored.groupId]);
            } catch (_) { }
        }
    }

    async disconnectAll() {
        for (const [connId] of this.clients) {
            await this.disconnect(connId);
        }
    }
}

module.exports = new KafkaService();
