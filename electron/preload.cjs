const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kafkaAPI', {
    // Connection management
    getConnections: () => ipcRenderer.invoke('connections:getAll'),
    saveConnection: (conn) => ipcRenderer.invoke('connections:save', conn),
    deleteConnection: (id) => ipcRenderer.invoke('connections:delete', id),
    testConnection: (config) => ipcRenderer.invoke('connections:test', config),
    connectCluster: (id) => ipcRenderer.invoke('connections:connect', id),
    disconnectCluster: (id) => ipcRenderer.invoke('connections:disconnect', id),

    // Topics
    listTopics: (connId) => ipcRenderer.invoke('topics:list', connId),

    // Producer
    produce: (connId, topic, key, value) =>
        ipcRenderer.invoke('producer:send', connId, topic, key, value),

    // Consumer
    startConsumer: (connId, topic, groupId) =>
        ipcRenderer.invoke('consumer:start', connId, topic, groupId),
    browseConsumer: (connId, topic, startFrom) =>
        ipcRenderer.invoke('consumer:browse', connId, topic, startFrom),
    stopConsumer: (connId, consumerKey) =>
        ipcRenderer.invoke('consumer:stop', connId, consumerKey),
    onConsumerMessage: (callback) => {
        const listener = (_event, message) => callback(message);
        ipcRenderer.on('consumer:message', listener);
        return () => ipcRenderer.removeListener('consumer:message', listener);
    },
});
