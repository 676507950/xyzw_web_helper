/**
 * WebSocket连接池管理器
 * 
 * 功能:
 * - 限制最大并发连接数
 * - 连接排队机制
 * - 自动连接分配和释放
 * - 连接超时检测和清理
 * - 支持长期挂机稳定运行
 */

export class ConnectionPoolManager {
    constructor(tokenStore, options = {}) {
        this.tokenStore = tokenStore;

        // 配置参数
        this.config = {
            maxConnections: options.maxConnections || 3,           // 最大并发连接数
            connectionTimeout: options.connectionTimeout || 30000,  // 连接超时时间(ms)
            idleTimeout: options.idleTimeout || 60000,             // 空闲超时时间(ms)
            queueTimeout: options.queueTimeout || 120000,          // 队列等待超时(ms)
            reconnectDelay: options.reconnectDelay || 1000,        // 重连延迟(ms)
            maxRetries: options.maxRetries || 3,                   // 最大重试次数
        };

        // 连接池状态
        this.activeConnections = new Map();  // tokenId -> connection info
        this.connectionQueue = [];           // 等待队列
        this.connectionLocks = new Map();    // tokenId -> lock info
        this.isProcessingQueue = false;      // 是否正在处理队列

        // 统计信息
        this.stats = {
            totalAcquired: 0,      // 总获取次数
            totalReleased: 0,      // 总释放次数
            totalTimeout: 0,       // 总超时次数
            totalFailed: 0,        // 总失败次数
            queueWaitTime: [],     // 队列等待时间记录
            connectionDuration: [] // 连接持续时间记录
        };

        // 启动自动清理定时器
        this.startAutoCleanup();

        console.log('[ConnectionPool] 连接池管理器已初始化', this.config);
    }

    /**
     * 获取连接 (主方法)
     * @param {string} tokenId - Token ID
     * @param {number} priority - 优先级 (0-10, 数字越大优先级越高)
     * @returns {Promise<boolean>} 是否成功获取连接
     */
    async acquire(tokenId, priority = 5) {
        const startTime = Date.now();
        console.log(`[ConnectionPool] 请求获取连接: ${tokenId}, 优先级: ${priority}`);

        try {
            // 1. 检查是否已经在活跃连接中
            if (this.activeConnections.has(tokenId)) {
                const conn = this.activeConnections.get(tokenId);

                // 检查连接是否健康
                const status = this.tokenStore.getWebSocketStatus(tokenId);
                if (status === 'connected') {
                    console.log(`[ConnectionPool] 连接已存在且健康: ${tokenId}`);
                    conn.lastUsed = Date.now();
                    return true;
                } else {
                    // 连接不健康，先释放
                    console.log(`[ConnectionPool] 连接不健康，先释放: ${tokenId}, 状态: ${status}`);
                    await this.release(tokenId, false);
                }
            }

            // 2. 检查是否有可用槽位
            if (this.activeConnections.size < this.config.maxConnections) {
                // 直接建立连接
                const success = await this._createConnection(tokenId);

                if (success) {
                    this.stats.totalAcquired++;
                    const waitTime = Date.now() - startTime;
                    this.stats.queueWaitTime.push(waitTime);

                    console.log(`[ConnectionPool] 连接已建立: ${tokenId}, 耗时: ${waitTime}ms`);
                    return true;
                } else {
                    this.stats.totalFailed++;
                    console.error(`[ConnectionPool] 连接建立失败: ${tokenId}`);
                    return false;
                }
            } else {
                // 3. 加入等待队列
                console.log(`[ConnectionPool] 连接池已满 (${this.activeConnections.size}/${this.config.maxConnections}), 加入队列: ${tokenId}`);
                return await this._enqueueAndWait(tokenId, priority, startTime);
            }
        } catch (error) {
            this.stats.totalFailed++;
            console.error(`[ConnectionPool] 获取连接异常: ${tokenId}`, error);
            return false;
        }
    }

    /**
     * 释放连接
     * @param {string} tokenId - Token ID
     * @param {boolean} disconnect - 是否断开WebSocket连接
     */
    async release(tokenId, disconnect = true) {
        console.log(`[ConnectionPool] 释放连接: ${tokenId}, 断开: ${disconnect}`);

        try {
            const conn = this.activeConnections.get(tokenId);

            if (conn) {
                // 记录连接持续时间
                const duration = Date.now() - conn.acquiredAt;
                this.stats.connectionDuration.push(duration);

                // 从活跃连接中移除
                this.activeConnections.delete(tokenId);
                this.stats.totalReleased++;

                console.log(`[ConnectionPool] 连接已从池中移除: ${tokenId}, 持续: ${duration}ms`);
            }

            // 断开WebSocket连接
            if (disconnect) {
                try {
                    await this.tokenStore.disconnectWebSocket(tokenId);
                    console.log(`[ConnectionPool] WebSocket已断开: ${tokenId}`);
                } catch (error) {
                    console.error(`[ConnectionPool] 断开WebSocket失败: ${tokenId}`, error);
                }
            }

            // 释放锁
            this.connectionLocks.delete(tokenId);

            // 处理队列中的下一个连接
            this._processQueue();

        } catch (error) {
            console.error(`[ConnectionPool] 释放连接异常: ${tokenId}`, error);
        }
    }

    /**
     * 释放所有连接
     */
    async releaseAll() {
        console.log(`[ConnectionPool] 释放所有连接, 当前: ${this.activeConnections.size}个`);

        const tokenIds = Array.from(this.activeConnections.keys());

        for (const tokenId of tokenIds) {
            await this.release(tokenId, true);
        }

        // 清空队列
        this.connectionQueue = [];

        console.log('[ConnectionPool] 所有连接已释放');
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const avgQueueWaitTime = this.stats.queueWaitTime.length > 0
            ? this.stats.queueWaitTime.reduce((a, b) => a + b, 0) / this.stats.queueWaitTime.length
            : 0;

        const avgConnectionDuration = this.stats.connectionDuration.length > 0
            ? this.stats.connectionDuration.reduce((a, b) => a + b, 0) / this.stats.connectionDuration.length
            : 0;

        return {
            activeConnections: this.activeConnections.size,
            maxConnections: this.config.maxConnections,
            queueLength: this.connectionQueue.length,
            totalAcquired: this.stats.totalAcquired,
            totalReleased: this.stats.totalReleased,
            totalFailed: this.stats.totalFailed,
            totalTimeout: this.stats.totalTimeout,
            avgQueueWaitTime: Math.round(avgQueueWaitTime),
            avgConnectionDuration: Math.round(avgConnectionDuration),
            activeConnectionIds: Array.from(this.activeConnections.keys())
        };
    }

    /**
     * 清理过期连接和超时队列
     */
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;

        // 1. 清理空闲超时的连接
        for (const [tokenId, conn] of this.activeConnections.entries()) {
            const idleTime = now - conn.lastUsed;

            if (idleTime > this.config.idleTimeout) {
                console.log(`[ConnectionPool] 清理空闲连接: ${tokenId}, 空闲: ${idleTime}ms`);
                this.release(tokenId, true);
                cleanedCount++;
            }
        }

        // 2. 清理超时的队列项
        this.connectionQueue = this.connectionQueue.filter(item => {
            const waitTime = now - item.queuedAt;

            if (waitTime > this.config.queueTimeout) {
                console.log(`[ConnectionPool] 清理超时队列项: ${item.tokenId}, 等待: ${waitTime}ms`);

                // 拒绝Promise
                if (item.reject) {
                    item.reject(new Error('Queue timeout'));
                }

                this.stats.totalTimeout++;
                return false;
            }

            return true;
        });

        if (cleanedCount > 0 || this.connectionQueue.length > 0) {
            console.log(`[ConnectionPool] 清理完成, 移除: ${cleanedCount}个连接, 队列剩余: ${this.connectionQueue.length}个`);
        }
    }

    /**
     * 启动自动清理定时器
     */
    startAutoCleanup() {
        // 每30秒执行一次清理
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 30000);

        console.log('[ConnectionPool] 自动清理定时器已启动 (30秒/次)');
    }

    /**
     * 停止自动清理
     */
    stopAutoCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('[ConnectionPool] 自动清理定时器已停止');
        }
    }

    /**
     * 销毁连接池
     */
    async destroy() {
        console.log('[ConnectionPool] 销毁连接池...');

        this.stopAutoCleanup();
        await this.releaseAll();

        this.activeConnections.clear();
        this.connectionQueue = [];
        this.connectionLocks.clear();

        console.log('[ConnectionPool] 连接池已销毁');
    }

    // ==================== 私有方法 ====================

    /**
     * 创建WebSocket连接 (内部)
     */
    async _createConnection(tokenId) {
        // 获取锁
        if (this.connectionLocks.has(tokenId)) {
            console.log(`[ConnectionPool] 连接正在创建中: ${tokenId}`);
            return false;
        }

        this.connectionLocks.set(tokenId, {
            startedAt: Date.now()
        });

        try {
            // 调用tokenStore建立连接
            console.log(`[ConnectionPool] 正在调用 tokenStore.connectWebSocket: ${tokenId}`);
            await this.tokenStore.connectWebSocket(tokenId);

            // 等待连接建立
            const maxWaitTime = this.config.connectionTimeout;
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitTime) {
                const status = this.tokenStore.getWebSocketStatus(tokenId);

                if (status === 'connected') {
                    // 连接成功，添加到活跃连接
                    this.activeConnections.set(tokenId, {
                        tokenId,
                        acquiredAt: Date.now(),
                        lastUsed: Date.now(),
                        status: 'connected'
                    });

                    return true;
                }

                if (status === 'error') {
                    const connInfo = this.tokenStore.wsConnections?.[tokenId] || {};
                    const lastError = connInfo.lastError?.error || '未知错误';
                    console.error(`[ConnectionPool] 连接错误: ${tokenId}, 原因: ${lastError}`);
                    return false;
                }

                // 等待100ms后重试
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const currentStatus = this.tokenStore.getWebSocketStatus(tokenId);
            console.error(`[ConnectionPool] 连接超时: ${tokenId}, 当前状态: ${currentStatus}, 等待时间: ${maxWaitTime}ms`);
            this.stats.totalTimeout++;
            return false;

        } catch (error) {
            console.error(`[ConnectionPool] 创建连接异常: ${tokenId}`, error);
            return false;
        } finally {
            this.connectionLocks.delete(tokenId);
        }
    }

    /**
     * 加入队列并等待
     */
    async _enqueueAndWait(tokenId, priority, startTime) {
        return new Promise((resolve, reject) => {
            const queueItem = {
                tokenId,
                priority,
                queuedAt: Date.now(),
                startTime,
                resolve,
                reject
            };

            // 按优先级插入队列
            const insertIndex = this.connectionQueue.findIndex(item => item.priority < priority);

            if (insertIndex === -1) {
                this.connectionQueue.push(queueItem);
            } else {
                this.connectionQueue.splice(insertIndex, 0, queueItem);
            }

            console.log(`[ConnectionPool] 已加入队列: ${tokenId}, 优先级: ${priority}, 队列位置: ${insertIndex === -1 ? this.connectionQueue.length : insertIndex + 1}/${this.connectionQueue.length}`);
        });
    }

    /**
     * 处理队列
     */
    async _processQueue() {
        if (this.isProcessingQueue || this.connectionQueue.length === 0) {
            return;
        }

        if (this.activeConnections.size >= this.config.maxConnections) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.connectionQueue.length > 0 && this.activeConnections.size < this.config.maxConnections) {
                const item = this.connectionQueue.shift();

                if (!item) break;

                console.log(`[ConnectionPool] 处理队列项: ${item.tokenId}`);

                const success = await this._createConnection(item.tokenId);

                if (success) {
                    this.stats.totalAcquired++;
                    const waitTime = Date.now() - item.startTime;
                    this.stats.queueWaitTime.push(waitTime);

                    // 解决Promise
                    if (item.resolve) {
                        item.resolve(true);
                    }

                    console.log(`[ConnectionPool] 队列项已完成: ${item.tokenId}, 总等待: ${waitTime}ms`);
                } else {
                    this.stats.totalFailed++;

                    // 拒绝Promise
                    if (item.reject) {
                        item.reject(new Error('Failed to create connection'));
                    }
                }

                // 延迟一下，避免过快创建连接
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }
}

export default ConnectionPoolManager;
