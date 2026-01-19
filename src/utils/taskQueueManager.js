/**
 * 任务队列管理器
 * 
 * 功能:
 * - 优先级任务队列
 * - 任务调度和执行
 * - 并发控制
 * - 任务重试机制
 * - 任务取消和暂停
 */

export class TaskQueueManager {
    constructor(options = {}) {
        // 配置参数
        this.config = {
            maxConcurrency: options.maxConcurrency || 1,      // 最大并发任务数
            taskTimeout: options.taskTimeout || 60000,        // 任务超时时间(ms)
            retryDelay: options.retryDelay || 2000,           // 重试延迟(ms)
            maxRetries: options.maxRetries || 2,              // 最大重试次数
        };

        // 队列状态
        this.queue = [];                    // 待执行任务队列
        this.runningTasks = new Map();      // 正在执行的任务
        this.completedTasks = [];           // 已完成任务历史
        this.isPaused = false;              // 是否暂停
        this.isProcessing = false;          // 是否正在处理

        // 统计信息
        this.stats = {
            totalEnqueued: 0,
            totalCompleted: 0,
            totalFailed: 0,
            totalRetried: 0,
            totalCancelled: 0,
            executionTimes: []
        };

        console.log('[TaskQueue] 任务队列管理器已初始化', this.config);
    }

    /**
     * 添加任务到队列
     * @param {Object} task - 任务对象
     * @param {Function} task.execute - 任务执行函数
     * @param {string} task.id - 任务ID
     * @param {string} task.name - 任务名称
     * @param {number} task.priority - 优先级 (0-10)
     * @param {Object} task.data - 任务数据
     */
    enqueue(task, priority = 5) {
        const taskItem = {
            id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: task.name || 'Unnamed Task',
            execute: task.execute,
            data: task.data || {},
            priority: priority,
            retryCount: 0,
            enqueuedAt: Date.now(),
            status: 'queued'
        };

        // 按优先级插入队列
        const insertIndex = this.queue.findIndex(item => item.priority < priority);

        if (insertIndex === -1) {
            this.queue.push(taskItem);
        } else {
            this.queue.splice(insertIndex, 0, taskItem);
        }

        this.stats.totalEnqueued++;

        console.log(`[TaskQueue] 任务已加入队列: ${taskItem.name} (ID: ${taskItem.id}), 优先级: ${priority}, 队列位置: ${insertIndex === -1 ? this.queue.length : insertIndex + 1}/${this.queue.length}`);

        // 自动开始处理
        this.process();

        return taskItem.id;
    }

    /**
     * 取出下一个任务
     */
    dequeue() {
        if (this.queue.length === 0) {
            return null;
        }

        const task = this.queue.shift();
        console.log(`[TaskQueue] 取出任务: ${task.name} (ID: ${task.id})`);

        return task;
    }

    /**
     * 处理队列
     */
    async process() {
        if (this.isPaused) {
            console.log('[TaskQueue] 队列已暂停，等待恢复...');
            return;
        }

        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            while (this.queue.length > 0 && this.runningTasks.size < this.config.maxConcurrency && !this.isPaused) {
                const task = this.dequeue();

                if (!task) break;

                // 执行任务（不等待，允许并发）
                this._executeTask(task);

                // 短暂延迟，避免过快启动任务
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * 暂停队列处理
     */
    pause() {
        this.isPaused = true;
        console.log('[TaskQueue] 队列已暂停');
    }

    /**
     * 恢复队列处理
     */
    resume() {
        this.isPaused = false;
        console.log('[TaskQueue] 队列已恢复');
        this.process();
    }

    /**
     * 取消任务
     * @param {string} taskId - 任务ID
     */
    cancel(taskId) {
        // 1. 从队列中移除
        const queueIndex = this.queue.findIndex(t => t.id === taskId);
        if (queueIndex !== -1) {
            const task = this.queue.splice(queueIndex, 1)[0];
            task.status = 'cancelled';
            this.stats.totalCancelled++;
            console.log(`[TaskQueue] 任务已从队列取消: ${task.name} (ID: ${taskId})`);
            return true;
        }

        // 2. 标记正在运行的任务为取消
        if (this.runningTasks.has(taskId)) {
            const task = this.runningTasks.get(taskId);
            task.status = 'cancelling';
            console.log(`[TaskQueue] 正在运行的任务已标记取消: ${task.name} (ID: ${taskId})`);
            return true;
        }

        console.log(`[TaskQueue] 未找到任务: ${taskId}`);
        return false;
    }

    /**
     * 清空队列
     */
    clear() {
        const count = this.queue.length;
        this.queue = [];
        this.stats.totalCancelled += count;
        console.log(`[TaskQueue] 队列已清空, 取消: ${count}个任务`);
    }

    /**
     * 获取队列状态
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            runningTasks: this.runningTasks.size,
            completedTasks: this.completedTasks.length,
            isPaused: this.isPaused,
            stats: { ...this.stats }
        };
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const avgExecutionTime = this.stats.executionTimes.length > 0
            ? this.stats.executionTimes.reduce((a, b) => a + b, 0) / this.stats.executionTimes.length
            : 0;

        return {
            ...this.stats,
            avgExecutionTime: Math.round(avgExecutionTime),
            successRate: this.stats.totalEnqueued > 0
                ? ((this.stats.totalCompleted / this.stats.totalEnqueued) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 执行任务 (内部)
     */
    async _executeTask(task) {
        const startTime = Date.now();

        task.status = 'running';
        task.startedAt = startTime;
        this.runningTasks.set(task.id, task);

        console.log(`[TaskQueue] 开始执行任务: ${task.name} (ID: ${task.id})`);

        try {
            // 创建带超时的Promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Task timeout')), this.config.taskTimeout);
            });

            // 执行任务
            const result = await Promise.race([
                task.execute(task.data),
                timeoutPromise
            ]);

            // 检查是否被取消
            if (task.status === 'cancelling') {
                throw new Error('Task cancelled');
            }

            // 任务成功
            task.status = 'completed';
            task.result = result;
            task.completedAt = Date.now();

            const executionTime = task.completedAt - startTime;
            this.stats.executionTimes.push(executionTime);
            this.stats.totalCompleted++;

            console.log(`[TaskQueue] 任务完成: ${task.name} (ID: ${task.id}), 耗时: ${executionTime}ms`);

            // 移到已完成列表
            this.runningTasks.delete(task.id);
            this.completedTasks.push(task);

            // 限制历史记录数量
            if (this.completedTasks.length > 100) {
                this.completedTasks = this.completedTasks.slice(-100);
            }

        } catch (error) {
            console.error(`[TaskQueue] 任务执行失败: ${task.name} (ID: ${task.id})`, error);

            // 检查是否需要重试
            if (task.retryCount < this.config.maxRetries && task.status !== 'cancelling') {
                task.retryCount++;
                this.stats.totalRetried++;

                console.log(`[TaskQueue] 任务将重试: ${task.name} (ID: ${task.id}), 第${task.retryCount}次重试`);

                // 延迟后重新加入队列
                setTimeout(() => {
                    task.status = 'queued';
                    this.queue.unshift(task);  // 优先重试
                    this.process();
                }, this.config.retryDelay);

            } else {
                // 重试次数已用完或被取消
                task.status = task.status === 'cancelling' ? 'cancelled' : 'failed';
                task.error = error.message;
                task.completedAt = Date.now();

                this.stats.totalFailed++;
                if (task.status === 'cancelled') {
                    this.stats.totalCancelled++;
                }

                this.runningTasks.delete(task.id);
                this.completedTasks.push(task);
            }
        } finally {
            // 继续处理队列
            this.process();
        }
    }
}

export default TaskQueueManager;
