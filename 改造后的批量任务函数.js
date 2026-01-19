/**
 * 批量任务函数改造版本
 * 
 * 本文件包含所有使用 executeBatchTask 改造后的批量任务函数
 * 使用方法：复制需要的函数，替换 BatchDailyTasks.vue 中的对应函数
 * 
 * 改造时间: 2026-01-19
 */

// ============================= 高优先级任务 =============================

/**
 * 领取挂机奖励
 */
const claimHangUpRewards = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            // 1. 领取挂机奖励
            addLog({
                time: new Date().toLocaleTimeString(),
                message: `领取挂机奖励`,
                type: "info",
            });

            await tokenStore.sendMessageWithPromise(
                tokenId,
                "system_claimhangupreward",
                {},
                5000,
            );

            await new Promise((r) => setTimeout(r, 500));

            // 2. 挂机加钟 4次
            for (let i = 0; i < 4; i++) {
                addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `挂机加钟 ${i + 1}/4`,
                    type: "info",
                });

                await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "system_mysharecallback",
                    { isSkipShareCard: true, type: 2 },
                    5000,
                );

                await new Promise((r) => setTimeout(r, 500));
            }
        },
        {
            taskName: '领取挂机',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 1000,
        }
    );
};

/**
 * 重置罐子
 */
const resetBottles = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            // 停止计时
            addLog({
                time: new Date().toLocaleTimeString(),
                message: `停止计时...`,
                type: "info",
            });

            await tokenStore.sendMessageWithPromise(
                tokenId,
                "bottlehelper_stop",
                {},
                5000,
            );

            await new Promise((r) => setTimeout(r, 500));

            // 开始计时
            addLog({
                time: new Date().toLocaleTimeString(),
                message: `开始计时...`,
                type: "info",
            });

            await tokenStore.sendMessageWithPromise(
                tokenId,
                "bottlehelper_start",
                {},
                5000,
            );
        },
        {
            taskName: '重置罐子',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 800,
        }
    );
};

/**
 * 领取盐罐
 */
const batchlingguanzi = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            await tokenStore.sendMessageWithPromise(
                tokenId,
                "bottlehelper_claim",
                {},
                5000,
            );

            await new Promise((r) => setTimeout(r, 500));
        },
        {
            taskName: '领取盐罐',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 800,
        }
    );
};

// ============================= 宝库任务 =============================

/**
 * 宝库1-3层
 */
const batchbaoku13 = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            const bosstowerinfo = await tokenStore.sendMessageWithPromise(
                tokenId,
                "bosstower_getinfo",
                {},
                5000
            );

            const towerId = bosstowerinfo.bossTower.towerId;

            if (towerId >= 1 && towerId <= 3) {
                // Boss战斗 2次
                for (let i = 0; i < 2; i++) {
                    if (shouldStop.value) break;

                    await tokenStore.sendMessageWithPromise(
                        tokenId,
                        "bosstower_startboss",
                        {},
                        5000
                    );

                    await new Promise((r) => setTimeout(r, 500));
                }

                // 宝箱 9次
                for (let i = 0; i < 9; i++) {
                    if (shouldStop.value) break;

                    await tokenStore.sendMessageWithPromise(
                        tokenId,
                        "bosstower_startbox",
                        {},
                        5000
                    );

                    await new Promise((r) => setTimeout(r, 500));
                }

                addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `宝库战斗已完成，请上线手动领取奖励`,
                    type: "success",
                });
            }
        },
        {
            taskName: '一键宝库1-3',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 1000,
        }
    );
};

/**
 * 宝库4-5层
 */
const batchbaoku45 = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            const bosstowerinfo = await tokenStore.sendMessageWithPromise(
                tokenId,
                "bosstower_getinfo",
                {},
                5000
            );

            const towerId = bosstowerinfo.bossTower.towerId;

            if (towerId >= 4 && towerId <= 5) {
                // Boss战斗 2次
                for (let i = 0; i < 2; i++) {
                    if (shouldStop.value) break;

                    await tokenStore.sendMessageWithPromise(
                        tokenId,
                        "bosstower_startboss",
                        {},
                        5000
                    );

                    await new Promise((r) => setTimeout(r, 500));
                }

                addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `宝库战斗已完成`,
                    type: "success",
                });
            }
        },
        {
            taskName: '一键宝库4-5',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 1000,
        }
    );
};

// ============================= 活动任务 =============================

/**
 * 咸王梦境
 */
const batchmengjing = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            const mjbattleTeam = { 0: 107 };
            const dayOfWeek = new Date().getDay();

            if (
                dayOfWeek === 0 ||
                dayOfWeek === 1 ||
                dayOfWeek === 3 ||
                dayOfWeek === 4
            ) {
                await tokenStore.sendMessageWithPromise(
                    tokenId,
                    "dungeon_selecthero",
                    { battleTeam: mjbattleTeam },
                    5000,
                );

                await new Promise((r) => setTimeout(r, 500));

                addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `咸王梦境已完成`,
                    type: "success",
                });
            } else {
                addLog({
                    time: new Date().toLocaleTimeString(),
                    message: `当前未在开放时间`,
                    type: "warning",
                });
            }
        },
        {
            taskName: '咸王梦境',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 1000,
        }
    );
};

/**
 * 俱乐部签到
 */
const batchclubsign = async () => {
    await executeBatchTask(
        selectedTokens.value,
        async (tokenId, token) => {
            await tokenStore.sendMessageWithPromise(
                tokenId,
                "legion_dailysign",
                {},
                5000,
            );

            await new Promise((r) => setTimeout(r, 500));

            addLog({
                time: new Date().toLocaleTimeString(),
                message: `俱乐部签到完成`,
                type: "success",
            });
        },
        {
            taskName: '俱乐部签到',
            autoDisconnect: true,
            useConnectionPool: true,
            delayBetween: 800,
        }
    );
};

// 注意：以上仅为核心任务示例
// 其他任务可以参考相同模式进行改造
