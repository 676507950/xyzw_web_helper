<template>
  <div class="club-month-battle-records-container">
    <div class="club-month-battle-records-card">
      <!-- 头部信息区 -->
      <div class="header-section">
        <div class="header-left">
          <img src="/icons/moonPalace.png" alt="俱乐部图标" class="header-icon">
          <div class="header-title">
            <h2>俱乐部盐场本月战绩</h2>
            <p>俱乐部盐场本月战斗记录详情</p>
          </div>
        </div>
        
        <!-- 功能操作区 -->
        <div class="header-actions">
          <n-button size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
          <n-button type="primary" size="small" :disabled="!monthlyBattleRecords || loading" @click="handleExport">
            <template #icon>
              <n-icon>  
                <Copy />
              </n-icon>
            </template>
            导出
          </n-button>
        </div>
      </div>

      <div class="battle-records-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <n-spin size="large">
            <template #description>正在加载本月战绩数据...</template>
          </n-spin>
        </div>

        <!-- 本月战绩列表 -->
        <div v-else-if="monthlyBattleRecords && Object.keys(monthlyBattleRecords).length > 0" ref="exportDom" class="records-list">
          <!-- 本月统计概览 -->
          <div class="monthly-stats-overview">
            <div class="stats-header">
              <h3>本月统计概览</h3>
              <div class="stats-tags">
                <n-tag type="info">统计日期: {{ currentMonthDisplay }}</n-tag>
                <n-tag type="warning">总参战成员: {{ monthlyStats.totalMembers }}</n-tag>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-item">
                <div class="stat-label">总击杀</div>
                <div class="stat-value win">{{ monthlyStats.totalKills }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">总死亡</div>
                <div class="stat-value loss">{{ monthlyStats.totalDeaths }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">总K/D</div>
                <div class="stat-value KD">{{ parseFloat((monthlyStats.totalKills && monthlyStats.totalDeaths ? monthlyStats.totalKills/monthlyStats.totalDeaths : 0.00)).toFixed(2) }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">总复活丹</div>
                <div class="stat-value Sscore">{{ monthlyStats.totalResurrection }}</div>
              </div>
            </div>
          </div>

          <!-- 成员总战绩列表 -->
          <div class="members-list">
            <h3>成员战绩详情</h3>
            <div class="members-table-wrapper">
              <table class="members-table">
                <thead>
                  <tr>
                    <th class="rank-col">排名</th>
                    <th class="member-col">成员</th>
                    <th v-for="date in battleDates" :key="date" class="battle-date-col">
                      <div class="date-label">{{ formatShortDate(date) }}</div>
                      <div class="date-full">{{ date }}</div>
                    </th>
                    <th class="total-col">本月总计</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(member, index) in sortedMembers" :key="member.roleId" class="member-row">
                    <td class="rank-col">{{ index + 1 }}</td>
                    <td class="member-col">
                      <div class="member-info">
                        <img v-if="member.headImg" :src="member.headImg" :alt="member.name" class="member-avatar"
                          @error="handleImageError">
                        <div v-else class="member-avatar-placeholder">{{ member.name?.charAt(0) || '?' }}</div>
                        <span class="member-name">{{ member.name }}</span>
                      </div>
                    </td>
                    <td v-for="date in battleDates" :key="date" class="battle-date-col">
                      <div class="daily-stats">
                        <div class="stat-item win">击杀: {{ getMemberDailyStat(member, date, 'winCnt') }}</div>
                        <div class="stat-item loss">死亡: {{ getMemberDailyStat(member, date, 'loseCnt') }}</div>
                        <div class="stat-item KD">KD: {{ parseFloat((getMemberDailyStat(member, date, 'winCnt') && getMemberDailyStat(member, date, 'loseCnt') ? getMemberDailyStat(member, date, 'winCnt')/getMemberDailyStat(member, date, 'loseCnt') : 0.00)).toFixed(2) }}</div>
                        <div class="stat-item Sscore">复活丹: {{ Math.max((getMemberDailyStat(member, date, 'loseCnt') || 0) - 6, 0) }}</div>
                      </div>
                    </td>
                    <td class="total-col">
                      <div class="total-stats">
                        <div class="stat-item win">击杀: {{ member.totalWinCnt || 0 }}</div>
                        <div class="stat-item loss">死亡: {{ member.totalLoseCnt || 0 }}</div>
                        <div class="stat-item KD">KD: {{ parseFloat((member.totalWinCnt && member.totalLoseCnt ? member.totalWinCnt/member.totalLoseCnt : 0.00)).toFixed(2) }}</div>
                        <div class="stat-item Sscore">复活丹: {{ member.totalResurrection || 0 }}</div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <n-empty description="暂无战绩数据" size="large">
            <template #icon>
              <n-icon>
                <DocumentText />
              </n-icon>
            </template>
          </n-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage, NCheckboxGroup, NCheckbox } from 'naive-ui'
import { useTokenStore } from '@/stores/tokenStore'
import html2canvas from 'html2canvas';
import {
  Trophy,
  Refresh,
  Copy,
  ChevronDown,
  ChevronUp,
  DocumentText
} from '@vicons/ionicons5'
import {
  formatTimestamp,
  parseBattleResult,
  parseAttackType,
  formatBattleRecordsForExport,
  copyToClipboard
} from '@/utils/clubBattleUtils'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  inline: {
    type: Boolean,
    default: false
  }
})

const exportDom = ref(null);
const emit = defineEmits(['update:visible'])

const message = useMessage()
const tokenStore = useTokenStore()

const showModal = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const monthlyBattleRecords = ref({})
const expandedMembers = ref(new Set())
const battleDates = ref([])

// 计算当月的5个战斗日期
const getCurrentMonthBattleDates = () => {
  const dateObj = new Date();
  
  const dates = [];
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  
  // 获取本月的所有周六
  const saturdays = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  for (let i = firstDay.getDate(); i <= lastDay.getDate(); i++) {
    const currentDate = new Date(year, month, i);
    if (currentDate.getDay() === 6) { // 6 = 周六
      saturdays.push(currentDate);
    }
  }
  
  // 取前4个周六
  for (let i = 0; i < Math.min(4, saturdays.length); i++) {
    dates.push(saturdays[i]);
  }
  
  // 计算第四周的周日
  if (saturdays.length >= 4) {
    const fourthSaturday = saturdays[3];
    const fourthSunday = new Date(fourthSaturday);
    fourthSunday.setDate(fourthSunday.getDate() + 1);
    dates.push(fourthSunday);
  }
  
  // 格式化日期为 YYYY/MM/DD
  const formattedDates = dates.map(date => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}/${m}/${d}`;
  });
  
  // 过滤掉当前日期之后的战斗日期
  const currentDate = new Date();
  const currentDateStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
  
  return formattedDates.filter(date => date <= currentDateStr);
};

// 格式化短日期显示 (MM/DD)
const formatShortDate = (date) => {
  return date.split('/').slice(1).join('/');
};

// 本月统计数据
const monthlyStats = computed(() => {
  const stats = {
    totalMembers: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalResurrection: 0
  };
  
  if (!monthlyBattleRecords.value || Object.keys(monthlyBattleRecords.value).length === 0) {
    return stats;
  }
  
  // 计算所有成员的统计数据
  const memberStats = {};
  
  Object.values(monthlyBattleRecords.value).forEach(dailyRecords => {
    if (dailyRecords && dailyRecords.roleDetailsList) {
      dailyRecords.roleDetailsList.forEach(member => {
        if (!memberStats[member.roleId]) {
          memberStats[member.roleId] = {
            roleId: member.roleId,
            name: member.name,
            headImg: member.headImg,
            totalWinCnt: 0,
            totalLoseCnt: 0,
            totalResurrection: 0,
            dailyRecords: {}
          };
        }
        
        memberStats[member.roleId].totalWinCnt += member.winCnt || 0;
        memberStats[member.roleId].totalLoseCnt += member.loseCnt || 0;
        memberStats[member.roleId].totalResurrection += Math.max((member.loseCnt || 0) - 6, 0);
        
        // 保存每日记录
        memberStats[member.roleId].dailyRecords[dailyRecords.date] = member;
      });
    }
  });
  
  // 计算总统计
  stats.totalMembers = Object.keys(memberStats).length;
  
  Object.values(memberStats).forEach(member => {
    stats.totalKills += member.totalWinCnt;
    stats.totalDeaths += member.totalLoseCnt;
    stats.totalResurrection += member.totalResurrection;
  });
  
  return stats;
});

// 获取成员每日统计数据
const getMemberDailyStat = (member, date, statType) => {
  if (member.dailyRecords && member.dailyRecords[date]) {
    return member.dailyRecords[date][statType] || 0;
  }
  return 0;
};

// 排序后的成员列表
const sortedMembers = computed(() => {
  const memberStats = {};
  
  if (!monthlyBattleRecords.value || Object.keys(monthlyBattleRecords.value).length === 0) {
    return [];
  }
  
  // 收集所有成员数据
  Object.values(monthlyBattleRecords.value).forEach(dailyRecords => {
    if (dailyRecords && dailyRecords.roleDetailsList) {
      dailyRecords.roleDetailsList.forEach(member => {
        if (!memberStats[member.roleId]) {
          memberStats[member.roleId] = {
            roleId: member.roleId,
            name: member.name,
            headImg: member.headImg,
            totalWinCnt: 0,
            totalLoseCnt: 0,
            totalResurrection: 0,
            dailyRecords: {}
          };
        }
        
        memberStats[member.roleId].totalWinCnt += member.winCnt || 0;
        memberStats[member.roleId].totalLoseCnt += member.loseCnt || 0;
        memberStats[member.roleId].totalResurrection += Math.max((member.loseCnt || 0) - 6, 0);
        
        // 保存每日记录
        memberStats[member.roleId].dailyRecords[dailyRecords.date] = member;
      });
    }
  });
  
  // 按击杀数排序
  return Object.values(memberStats).sort((a, b) => b.totalWinCnt - a.totalWinCnt);
});

// 当前月份显示
const currentMonthDisplay = computed(() => {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  return `${year}年${month}月`;
});

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.style.display = 'none'
};

// 查询单日战绩
const fetchBattleRecords = async (date) => {
  if (!tokenStore.selectedToken) {
    message.warning('请先选择游戏角色')
    return null
  }

  const tokenId = tokenStore.selectedToken.id

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId)
  if (wsStatus !== 'connected') {
    message.error('WebSocket未连接，无法查询战绩')
    return null
  }

  try {
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      'legionwar_getdetails',
      { date },
      10000
    )

    if (result && result.roleDetailsList) {
      // 按击杀数从高到低排序
      const sortedRoleDetailsList = [...result.roleDetailsList].sort((a, b) => {
        return (b.winCnt || 0) - (a.winCnt || 0)
      })
      return {
        ...result,
        roleDetailsList: sortedRoleDetailsList,
        date
      };
    } else {
      return {
        roleDetailsList: [],
        date
      };
    }
  } catch (error) {
    console.error(`查询${date}战绩失败:`, error)
    message.error(`查询${date}战绩失败: ${error.message}`)
    return {
      roleDetailsList: [],
      date
    };
  }
}

// 查询本月战绩
const fetchMonthlyBattleRecords = async () => {
  if (!tokenStore.selectedToken) {
    message.warning('请先选择游戏角色')
    return
  }

  const tokenId = tokenStore.selectedToken.id
  const wsStatus = tokenStore.getWebSocketStatus(tokenId)
  if (wsStatus !== 'connected') {
    message.error('WebSocket未连接，无法查询战绩')
    return
  }

  loading.value = true
  
  try {
    // 获取本月5个战斗日期
    battleDates.value = getCurrentMonthBattleDates();
    
    // 并行获取所有日期的战绩
    const promises = battleDates.value.map(date => fetchBattleRecords(date));
    const results = await Promise.all(promises);
    
    // 整理结果
    const records = {};
    results.forEach(result => {
      if (result) {
        records[result.date] = result;
      }
    });
    
    monthlyBattleRecords.value = records;
    message.success('本月战绩加载成功')
  } catch (error) {
    console.error('查询本月战绩失败:', error)
    message.error(`查询本月战绩失败: ${error.message}`)
    monthlyBattleRecords.value = {}
  } finally {
    loading.value = false
  }
}

// 刷新战绩
const handleRefresh = () => {
  fetchMonthlyBattleRecords()
}

// 导出战绩
const handleExport = async () => {
  if (!monthlyBattleRecords.value || Object.keys(monthlyBattleRecords.value).length === 0) {
    message.warning('没有可导出的数据')
    return
  }

  try {
    // 导出图片
    exportToImage()
    message.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败，请重试')
  }
}

const exportToImage = async () => {
  // 校验：确保DOM已正确绑定
  if (!exportDom.value) {
    alert('未找到要导出的DOM元素');
    return;
  }

  try {
    // 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: '#ffffff', // 避免透明背景（默认透明）
      logging: false // 关闭控制台日志
    });

    // Canvas转图片链接（支持PNG/JPG）
    const imgUrl = canvas.toDataURL('image/png'); // 若要JPG，改为'image/jpeg'

    // 创建下载链接，触发浏览器下载
    const link = document.createElement('a');
    link.href = imgUrl;
    const monthYear = currentMonthDisplay.value.replace('年', '-').replace('月', '');
    link.download = `${monthYear}月盐场战绩总览.png`; // 下载文件名
    document.body.appendChild(link);
    link.click(); // 触发点击下载
    document.body.removeChild(link); // 下载后清理DOM
  } catch (err) {
    console.error('DOM转图片失败：', err);
    alert('导出图片失败，请重试');
  }
};

// 关闭弹窗
const handleClose = () => {
  expandedMembers.value.clear()
}

// 暴露方法给父组件
defineExpose({
  fetchMonthlyBattleRecords
})

// 组件挂载时自动拉取数据
onMounted(() => {
  fetchMonthlyBattleRecords()
})
</script>

<style scoped lang="scss">
.club-month-battle-records-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.club-month-battle-records-card {
  background: var(--bg-primary);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.header-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

.header-title h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.header-title p {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.battle-records-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

// 本月统计概览样式
.monthly-stats-overview {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.stats-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.stats-tags {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.stat-item {
  text-align: center;
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  
  &.win {
    color: #059669;
  }
  
  &.loss {
    color: #dc2626;
  }
  
  &.siege {
    color: #d97706;
  }
  
  &.KD {
    color: #858585;
  }
  
  &.Sscore {
    color: #FA79CE;
  }
}

.members-list {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.members-list h3 {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.members-table-wrapper {
  overflow-x: auto;
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
  background: var(--bg-primary);
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.members-table th,
.members-table td {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
}

.members-table th {
  background: var(--bg-secondary);
  font-weight: var(--font-weight-semibold);
  position: sticky;
  top: 0;
  z-index: 10;
}

.rank-col {
  width: 60px;
  text-align: center;
}

.member-col {
  min-width: 150px;
}

.battle-date-col {
  min-width: 120px;
  text-align: center;
}

.total-col {
  min-width: 120px;
  text-align: center;
  font-weight: var(--font-weight-bold);
}

.date-label {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.date-full {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.member-row {
  transition: background-color var(--transition-fast);
  
  &:hover {
    background-color: var(--bg-secondary);
  }
}

.member-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.member-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.member-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.daily-stats,
.total-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.daily-stats .stat-item,
.total-stats .stat-item {
  padding: 2px 0;
  font-size: var(--font-size-xs);
  text-align: center;
  border-radius: 0;
  border: none;
  background: transparent;
  
  &.win {
    color: #059669;
  }
  
  &.loss {
    color: #dc2626;
  }
  
  &.siege {
    color: #d97706;
  }
  
  &.KD {
    color: #858585;
  }
  
  &.Sscore {
    color: #FA79CE;
  }
}

/* 移除总计列字体大小覆盖，保持与日期列一致 */
/* .total-stats .stat-item {
  font-size: var(--font-size-sm);
} */

// 响应式设计
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .members-table-wrapper {
    font-size: var(--font-size-xs);
  }
  
  .member-avatar,
  .member-avatar-placeholder {
    width: 24px;
    height: 24px;
  }
  
  .daily-stats .stat-item,
  .total-stats .stat-item {
    font-size: 10px;
  }
  
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>