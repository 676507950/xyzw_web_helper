<template>
  <MyCard class="club-info" :statusClass="{ active: !!club }">
    <template #icon>
      <img src="/icons/1733492491706152.png" alt="俱乐部图标" />
    </template>
    <template #title>
      <h3>蟠桃园信息</h3>
    </template>
    <template v-if="!club" #badge >
      <span v-if="!club">{{"暂无俱乐部" }}</span>
    </template>
    <template #default>
      <div v-if="!club" class="empty-club">
        <n-empty description="暂无俱乐部" />
        <div class="actions">
          <n-button size="small" @click="refreshClub">刷新</n-button>
        </div>
      </div>
      <div v-else>
        <div class="toolbar">
          <n-space size="small">
            <n-button size="small" @click="refreshClub">刷新</n-button>
          </n-space>
        </div>

        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="overview" tab="对手信息" display-directive="show:lazy">
            <div class="overview">
              <div class="club-header">
                <n-avatar
                  :size="48"
                  :src="battleInfo.logo || '/icons/xiaoyugan.png'"
                />
                <div class="meta">
                  <div class="name">{{ battleInfo.name }}</div>
                  <div class="sub">
                    ID {{ battleInfo.id }} · Lv.{{ battleInfo.level }} · 服务器
                    {{ battleInfo.serverId }}
                  </div>
                </div>
              </div>
              <div class="grid">
                <div class="item">
                  <div class="label">战力</div>
                  <div class="value">
                    {{ formatPower(battleInfo.power) }}
                  </div>
                </div>
                <div class="item">
                  <div class="label">红粹</div>
                  <div class="value">{{ battleInfo.quenchNum }}</div>
                </div>
              </div>
              <div v-if="club.announcement" class="announcement">
                <div class="label">公告</div>
                <div class="text">{{ battleInfo.announcement }}</div>
              </div>
            </div>
          </n-tab-pane>

          <n-tab-pane
            name="records"
            tab="蟠桃园战绩"
            display-directive="show:lazy"
          >
            <PeachBattleRecords inline />
          </n-tab-pane>
          <n-tab-pane
            name="recordsopponent"
            tab="蟠桃园对手战绩"
            display-directive="show:lazy"
          >
            <PeachOpponentBattleRecords inline />
          </n-tab-pane>
        </n-tabs>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { useMessage } from "naive-ui";
import { Refresh, Copy } from "@vicons/ionicons5";
import { gettoday } from '@/utils/clubWarrankUtils'
import PeachBattleRecords from "./PeachBattleRecords.vue";
import PeachOpponentBattleRecords from "./PeachOpponentBattleRecords.vue";
const tokenStore = useTokenStore();
const message = useMessage();
const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);
const loading = ref(false);
const battleInfo = ref(null);
// 格式化战力
const formatPower = (power) => {
  if (!power) return '0'
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + '亿'
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + '万'
  }
  return power.toString()
}

const formatDateToShort = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('/')
  if (parts.length !== 3) return dateStr
  const [year, month, day] = parts
  return year.slice(2) + month + day
}

// 获取最近的周日日期
// 如果今天是周日，返回今天的日期；否则返回上周日的日期
const getLastSunday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
  
  let daysToSubtract = 0;
  if (dayOfWeek === 0) {
    // 今天是周日，返回今天
    daysToSubtract = 0;
  } else {
    // 周一到周六，计算距离上周日的天数
    daysToSubtract = dayOfWeek;
  }

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - daysToSubtract);

  const targetYear = targetDate.getFullYear();
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
  const targetDay = String(targetDate.getDate()).padStart(2, "0");

  return `${targetYear}/${targetMonth}/${targetDay}`;
};

const refreshClub = async () => {
  if (!tokenStore.selectedToken) {
    message.warning('请先选择游戏角色');
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== 'connected') {
    message.error('WebSocket未连接，无法查询战绩');
    return;
  }
    loading.value = true;
    try {
      // 1. 查询蟠桃园对战俱乐部ID
      let firstLegionId;
      if (getLastSunday() === gettoday()) {
        const payloadTaskRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadbf",
          {},
          10000
        );
        if (!payloadTaskRes) {
          message.error("未获取到对战俱乐部");
          return;
        }
        firstLegionId = payloadTaskRes.legions[0].id;
        if(club.value.id === firstLegionId) {
          firstLegionId = payloadTaskRes.legions[1].id;
        }
        if (!firstLegionId) {
          message.error("未获取到对战俱乐部ID");
          return;
        }
      } else {
        const payloadTaskRes = await tokenStore.sendMessageWithPromise(
          tokenId,
          "legion_getpayloadrecord",
          {},
          10000
        );
        if (!payloadTaskRes) {
          message.error("未获取到对战俱乐部");
          return;
        }
        firstLegionId = payloadTaskRes.enemyLegionMap[formatDateToShort(getLastSunday())].id;
        if (!firstLegionId) {
          message.error("未获取到对战俱乐部ID");
          return;
        }
      }
      
      // 2. 获取俱乐部的详细信息
      const firstLegionInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: firstLegionId },
        10000
      );
      // 3. 整理对战信息
      battleInfo.value = {
        id: firstLegionId,
        level: firstLegionInfo?.legionData?.level || 0,
        power: firstLegionInfo?.legionData?.power || 0,
        name: firstLegionInfo?.legionData?.name || '',
        serverId: firstLegionInfo?.legionData?.serverId || '',
        logo: firstLegionInfo?.legionData?.logo || '',
        quenchNum: firstLegionInfo?.legionData?.quenchNum || 0,
        announcement: firstLegionInfo?.legionData?.announcement || ''
      };
      message.success("查询对战信息成功");
    } catch (error) {
      console.error("查询对战信息失败:", error);
      message.error(`查询失败: ${error.message}`);
    } finally {
      loading.value = false;
    }
  };

// 页面加载时自动执行查询
onMounted(() => {
  refreshClub();
});
</script>

<style scoped lang="scss">
.club-info {
  .toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: var(--spacing-sm);
  }

  .overview {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .overview-actions {
    display: flex;
    justify-content: flex-start;
  }

  .club-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
  }

  .meta {
    .name {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
    }

    .sub {
      color: var(--text-secondary);
      font-size: var(--font-size-sm);
    }
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--spacing-md);
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--spacing-sm);
    }

    .member-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }

    .member-row .right {
      width: 100%;
      justify-content: space-between;
      font-size: 12px;
    }
  }

  .item {
    background: var(--bg-tertiary);
    border-radius: var(--border-radius-medium);
    padding: var(--spacing-sm);

    .label {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      margin-bottom: 2px;
    }

    .value {
      font-weight: var(--font-weight-medium);
    }
  }

  .announcement .label,
  .leader .label {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: 4px;
  }

  .announcement .text {
    white-space: pre-wrap;
  }

  .leader .leader-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .member-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 8px;
    border-radius: 8px;
    background: var(--bg-tertiary);
  }

  .member-row .left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .member-row .right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-secondary);
  }

  .member-row .name {
    font-weight: var(--font-weight-medium);
  }

  .member-row .power {
    font-feature-settings: "tnum" 1;
    font-variant-numeric: tabular-nums;
  }

  .member-row .red-quench {
    font-feature-settings: "tnum" 1;
    font-variant-numeric: tabular-nums;
  }

  .hint {
    margin-top: 8px;
    color: var(--text-tertiary);
    font-size: var(--font-size-xs);
  }

  .empty-club {
    text-align: center;
  }

  .empty-club .actions {
    margin-top: var(--spacing-sm);
  }
}

.status-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
  margin-right: var(--spacing-md);
}

.status-info {
  flex: 1;

  h3 {
    margin: 0;
    font-size: var(--font-size-lg);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);

  &.active {
    background: rgba(24, 160, 88, 0.12);
    color: var(--success-color);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
</style>
