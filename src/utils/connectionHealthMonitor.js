/**
 * 连接健康监控器
 * 
 * 功能:
 * - 定时健康检查
 * - 自动重连机制
 * - 连接统计和日志
 * - 性能监控
 * - 异常检测和告警
 */

export class ConnectionHealthMonitor {
    constructor(tokenStore, connectionPool, options = {}) {
        this.tokenStore = tokenStore;
        this.connectionPool = connectionPool;

        // 配置参数
        this.config = {
            checkInterval: options.checkInterval || 30000,        // 检查间隔(ms)
            healthTimeout: options.healthTimeout || 5000,         // 健康检查超时(ms)
            reconnectDelay: options.reconnectDelay || 2000,       // 重连延迟(ms)
            maxReconnectAttempts: options.maxReconnectAttempts || 3,  // 最大重连次数
            statsRetentionTime: options.statsRetentionTime || 3600000, // 统计数据保留时间(1小时)
        };

        // 监控状态
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.healthCheckResults = new Map();  // tokenId -> health status
        this.reconnectAttempts = new Map();   // tokenId -> attempt count

        // 统计数据
        this.stats = {
            totalChecks: 0,
            totalHealthy: 0,
            totalUnhealthy: 0,
            totalReconnects: 0,
            totalReconnectFailures: 0,
            checkHistory: [],  // { timestamp, healthy, unhealthy }
            connectionEvents: []  // { timestamp, tokenId, event, details }
        };

        console.log('[HealthMonitor] 连接健康监控器已初始化', this.config);
    }

    /**
     * 启动监控
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('[HealthMonitor] 监控已在运行中');
            return;
        }

        this.isMonitoring = true;

        // 立即执行一次检查
        this.checkAllConnections();

        // 启动定时检查
        this.monitoringInterval = setInterval(() => {
            this.checkAllConnections();
        }, this.config.checkInterval);

        console.log(`[HealthMonitor] 监控已启动, 检查间隔: ${this.config.checkInterval}ms`);
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('[HealthMonitor] 监控已停止');
    }

    /**
     * 检查所有连接
     */
    async checkAllConnections() {
        if (!this.isMonitoring) {
            return;
        }

        const poolStats = this.connectionPool.getStats();
        const activeTokenIds = poolStats.activeConnectionIds || [];

        console.log(`[HealthMonitor] 开始健康检查, 活跃连接: ${activeTokenIds.length}个`);

        this.stats.totalChecks++;
        let healthyCount = 0;
        let unhealthyCount = 0;

        for (const tokenId of activeTokenIds) {
            const isHealthy = await this.checkHealth(tokenId);

            if (isHealthy) {
                healthyCount++;
                // 只有真正健康时才重置重连计数
                this.reconnectAttempts.delete(tokenId);
            } else {
                unhealthyCount++;

                // 尝试自动重连
                await this.autoReconnect(tokenId);
            }
        }

        this.stats.totalHealthy += healthyCount;
        this.stats.totalUnhealthy += unhealthyCount;

        // 记录检查历史
        this.stats.checkHistory.push({
            timestamp: Date.now(),
            healthy: healthyCount,
            unhealthy: unhealthyCount,
            total: activeTokenIds.length
        });

        // 限制历史记录数量
        if (this.stats.checkHistory.length > 100) {
            this.stats.checkHistory = this.stats.checkHistory.slice(-100);
        }

        console.log(`[HealthMonitor] 健康检查完成, 健康: ${healthyCount}, 不健康: ${unhealthyCount}`);

        // 清理过期数据
        this._cleanupOldStats();
    }

    /**
     * 检查单个连接的健康状态
     * @param {string} tokenId - Token ID
     * @returns {Promise<boolean>} 是否健康
     */
    async checkHealth(tokenId) {
        try {
            const status = this.tokenStore.getWebSocketStatus(tokenId);
            const client = this.tokenStore.getWebSocketClient(tokenId);

            // 基本检查：连接状态
            if (status !== 'connected') {
                console.log(`[HealthMonitor] 连接不健康: ${tokenId}, 状态: ${status}`);
                this._recordHealthResult(tokenId, false, `status: ${status}`);
                return false;
            }

            // 检查客户端是否存在
            if (!client) {
                console.log(`[HealthMonitor] 连接不健康: ${tokenId}, 客户端不存在`);
                this._recordHealthResult(tokenId, false, 'no client');
                return false;
            }

            // 检查连接是否真实可用（发送心跳）
            try {
                const heartbeatPromise = this.tokenStore.sendMessageWithPromise(
                    tokenId,
                    'heart_beat',
                    {},
                    this.config.healthTimeout
                );

                await Promise.race([
                    heartbeatPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Heartbeat timeout')), this.config.healthTimeout)
                    )
                ]);

                console.log(`[HealthMonitor] 连接健康: ${tokenId}`);
                this._recordHealthResult(tokenId, true);
                return true;

            } catch (heartbeatError) {
                console.log(`[HealthMonitor] 心跳失败: ${tokenId}`, heartbeatError.message);
                this._recordHealthResult(tokenId, false, `heartbeat failed: ${heartbeatError.message}`);
                return false;
            }

        } catch (error) {
            console.error(`[HealthMonitor] 健康检查异常: ${tokenId}`, error);
            this._recordHealthResult(tokenId, false, `error: ${error.message}`);
            return false;
        }
    }

    /**
     * 自动重连
     * @param {string} tokenId - Token ID
     */
    async autoReconnect(tokenId) {
        // 获取当前重连次数
        const attempts = this.reconnectAttempts.get(tokenId) || 0;

        if (attempts >= this.config.maxReconnectAttempts) {
            console.log(`[HealthMonitor] 达到最大重连次数: ${tokenId}, 放弃重连`);
            this._recordEvent(tokenId, 'reconnect_abandoned', { attempts });
            return false;
        }

        console.log(`[HealthMonitor] 开始自动重连: ${tokenId}, 第${attempts + 1}次尝试`);

        this.reconnectAttempts.set(tokenId, attempts + 1);
        this.stats.totalReconnects++;

        try {
            // 先释放旧连接
            await this.connectionPool.release(tokenId, true);

            // 延迟后重新获取连接
            await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay));

            const success = await this.connectionPool.acquire(tokenId, 10); // 高优先级

            if (success) {
                console.log(`[HealthMonitor] 重连操作成功: ${tokenId}, 等待下一次健康检查验证`);
                this._recordEvent(tokenId, 'reconnect_success', { attempts: attempts + 1 });
                return true;
            } else {
                console.log(`[HealthMonitor] 重连失败: ${tokenId}`);
                this.stats.totalReconnectFailures++;
                this._recordEvent(tokenId, 'reconnect_failed', { attempts: attempts + 1 });
                return false;
            }

        } catch (error) {
            console.error(`[HealthMonitor] 重连异常: ${tokenId}`, error);
            this.stats.totalReconnectFailures++;
            this._recordEvent(tokenId, 'reconnect_error', { attempts: attempts + 1, error: error.message });
            return false;
        }
    }

    /**
     * 收集统计数据
     */
    collectStats() {
        const poolStats = this.connectionPool.getStats();

        return {
            monitoring: {
                isActive: this.isMonitoring,
                checkInterval: this.config.checkInterval,
                totalChecks: this.stats.totalChecks,
                totalHealthy: this.stats.totalHealthy,
                totalUnhealthy: this.stats.totalUnhealthy,
                totalReconnects: this.stats.totalReconnects,
                totalReconnectFailures: this.stats.totalReconnectFailures,
                healthRate: this.stats.totalChecks > 0
                    ? ((this.stats.totalHealthy / this.stats.totalChecks) * 100).toFixed(2) + '%'
                    : 'N/A'
            },
            pool: poolStats,
            recentChecks: this.stats.checkHistory.slice(-10),
            recentEvents: this.stats.connectionEvents.slice(-20)
        };
    }

    /**
     * 获取健康报告
     */
    getHealthReport() {
        const poolStats = this.connectionPool.getStats();
        const activeConnections = poolStats.activeConnectionIds || [];

        const connectionHealth = {};
        for (const tokenId of activeConnections) {
            const healthResult = this.healthCheckResults.get(tokenId);
            connectionHealth[tokenId] = healthResult || { healthy: false, reason: 'no data' };
        }

        return {
            timestamp: Date.now(),
            totalConnections: activeConnections.length,
            healthyConnections: Array.from(this.healthCheckResults.values()).filter(r => r.healthy).length,
            unhealthyConnections: Array.from(this.healthCheckResults.values()).filter(r => !r.healthy).length,
            detailedHealth: connectionHealth,
            stats: this.collectStats()
        };
    }

    /**
     * 重置统计数据
     */
    resetStats() {
        this.stats = {
            totalChecks: 0,
            totalHealthy: 0,
            totalUnhealthy: 0,
            totalReconnects: 0,
            totalReconnectFailures: 0,
            checkHistory: [],
            connectionEvents: []
        };

        this.healthCheckResults.clear();
        this.reconnectAttempts.clear();

        console.log('[HealthMonitor] 统计数据已重置');
    }

    // ==================== 私有方法 ====================

    /**
     * 记录健康检查结果
     */
    _recordHealthResult(tokenId, healthy, reason = '') {
        this.healthCheckResults.set(tokenId, {
            healthy,
            reason,
            timestamp: Date.now()
        });
    }

    /**
     * 记录连接事件
     */
    _recordEvent(tokenId, event, details = {}) {
        this.stats.connectionEvents.push({
            timestamp: Date.now(),
            tokenId,
            event,
            details
        });

        // 限制事件数量
        if (this.stats.connectionEvents.length > 200) {
            this.stats.connectionEvents = this.stats.connectionEvents.slice(-200);
        }
    }

    /**
     * 清理过期的统计数据
     */
    _cleanupOldStats() {
        const now = Date.now();
        const cutoffTime = now - this.config.statsRetentionTime;

        // 清理过期的健康检查结果
        for (const [tokenId, result] of this.healthCheckResults.entries()) {
            if (result.timestamp < cutoffTime) {
                this.healthCheckResults.delete(tokenId);
            }
        }

        // 清理过期的事件记录
        this.stats.connectionEvents = this.stats.connectionEvents.filter(
            event => event.timestamp > cutoffTime
        );
    }
}

export default ConnectionHealthMonitor;
