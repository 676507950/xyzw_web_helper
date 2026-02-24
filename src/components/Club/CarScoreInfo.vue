<template>
  <div>
    <!-- Inline 模式：卡片渲染 -->
    <div v-if="inline" class="inline-wrapper">
      <div class="inline-header">
        <div class="inline-title">俱乐部赛车信息</div>
        <div class="header-actions">
          <n-button size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
          <n-button type="primary" size="small" :disabled="!memberScores || loading" @click="handleExport">
            <template #icon>
              <n-icon>
                <Copy />
              </n-icon>
            </template>
            导出
          </n-button>
        </div>
      </div>

      <div class="weird-tower-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <n-spin size="large">
            <template #description>正在加载赛车数据...</template>
          </n-spin>
        </div>

        <!-- 赛车列表 -->
        <div v-else-if="memberScores.length > 0" ref="exportDom" class="records-list">
          <div class="records-info">
            <n-tag type="success">总成员: {{ memberScores.length }}</n-tag>
          </div>

          <div v-for="(member, index) in memberScores" :key="member.roleId" class="member-card">
            <div class="member-header">
              <div class="member-info">
                <div class="ranking-number">{{ index + 1 }}</div>
                <img v-if="member.headImg" :src="member.headImg" :alt="member.name" class="member-avatar"
                  @error="handleImageError">
                <div v-else class="member-avatar-placeholder">{{ member.name?.charAt(0) || '?' }}</div>
                <span class="member-name">{{ member.name }}</span>
              </div>
              <div class="member-stats-inline">
                <span class="stat-inline tower-count">积分 {{ member.score || '0' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 模式 -->
    <n-modal v-else v-model:show="showModal" preset="card" title="俱乐部赛车信息" style="width: 90%; max-width: 800px"
      @after-leave="handleClose">
      <template #header-extra>
        <div class="header-actions">
          <n-button size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
          <n-button type="primary" size="small" :disabled="!memberScores || loading" @click="handleExport">
            <template #icon>
              <n-icon>
                <Copy />
              </n-icon>
            </template>
            导出
          </n-button>
        </div>
      </template>

      <div class="weird-tower-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <n-spin size="large">
            <template #description>正在加载赛车数据...</template>
          </n-spin>
        </div>

        <!-- 赛车列表 -->
        <div v-else-if="memberScores.length > 0" ref="exportDom" class="records-list">
          <div class="records-info">
            <n-tag type="success">总成员: {{ memberScores.length }}</n-tag>
          </div>

          <div v-for="(member, index) in memberScores" :key="member.roleId" class="member-card">
            <div class="member-header">
              <div class="member-info">
                <div class="ranking-number">{{ index + 1 }}</div>
                <img v-if="member.headImg" :src="member.headImg" :alt="member.name" class="member-avatar"
                  @error="handleImageError">
                <div v-else class="member-avatar-placeholder">{{ member.name?.charAt(0) || '?' }}</div>
                <span class="member-name">{{ member.name }}</span>
              </div>
              <div class="member-stats-inline">
                <span class="stat-inline tower-count">积分 {{ member.score || '0' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useTokenStore } from '@/stores/tokenStore'
import html2canvas from 'html2canvas';
import { downloadCanvasAsImage } from "@/utils/imageExport";
import {
  Trophy,
  Refresh,
  Copy,
  ChevronDown,
  ChevronUp,
  DocumentText
} from '@vicons/ionicons5'
import { gettoday } from '@/utils/clubWarrankUtils'
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

const exportDom = ref(null)
const emit = defineEmits(['update:visible'])

const message = useMessage()
const tokenStore = useTokenStore()

const showModal = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const memberScores = ref([])

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

// 获取赛车数据
const fetchWeirdTowerInfo = async () => {
  if (!tokenStore.selectedToken) {
    message.warning('请先选择游戏角色')
    return
  }

  const tokenId = tokenStore.selectedToken.id

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId)
  if (wsStatus !== 'connected') {
    message.error('WebSocket未连接，无法查询爬塔数据')
    return
  }

  loading.value = true

  try {
    // 获取赛车数据
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      'car_getmemberrank',
      {},
      10000
    )

    if (result && result.list) {
      // 转换数据格式
      const members = result.list.map((member) => ({
        roleId: member.roleId,
        name: member.name,
        headImg: member.headImg?.replace(/`/g, '').trim(), // 移除可能的反引号和空格
        score: member.score,
        power: member.power,
        rank: member.rank,
        serverId: member.serverId
      }))

      // 按积分从高到低排序
      members.sort((a, b) => b.score - a.score)

      memberScores.value = members
      message.success('赛车数据加载成功，已按积分从高到低排序')
    } else {
      memberScores.value = []
      message.warning('未查询到赛车数据')
    }
  } catch (error) {
      console.error('查询赛车数据失败:', error)
      message.error(`查询失败: ${error.message}`)
      memberScores.value = []
    } finally {
      loading.value = false
    }
}

// 刷新爬塔数据
const handleRefresh = () => {
  fetchWeirdTowerInfo()
}

// 导出数据
const handleExport = async () => {
  if (!memberScores.value) {
    message.warning('没有可导出的数据')
    return
  }

  try {
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
    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: '#ffffff', // 避免透明背景（默认透明）
      logging: false // 关闭控制台日志
    });

    // 6. Canvas转图片链接并下载
    const dateStr = gettoday();
    const filename = dateStr.replace("/",'年').replace("/",'月')+'日俱乐部赛车数据.png';
    downloadCanvasAsImage(canvas, filename);
  } catch (err) {
    console.error('DOM转图片失败：', err);
    alert('导出图片失败，请重试');
  }
};

// 关闭弹窗
const handleClose = () => {
  // 可以在这里清理资源
}

// 暴露方法给父组件
defineExpose({
  fetchWeirdTowerInfo
})

// Inline 模式：挂载后自动拉取
onMounted(() => {
  if (props.inline) {
    fetchWeirdTowerInfo()
  }
})
</script>

<style scoped lang="scss">
.inline-wrapper {
  background: var(--bg-primary);
  border-radius: var(--border-radius-medium);
  border: 1px solid var(--border-light);
  padding: var(--spacing-md);
}

.inline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
  flex-wrap: wrap;
}

.inline-title {
  font-weight: var(--font-weight-semibold);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.weird-tower-content {
  min-height: 200px;
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

.records-info {
  display: flex;
  gap: var(--spacing-md);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.member-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-sm);
  transition: all var(--transition-fast);

  &:hover {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  &+& {
    margin-top: var(--spacing-sm);
  }
}

.member-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.member-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 200px;
  max-width: 200px;
  flex-shrink: 0;
}

.ranking-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.member-stats-inline {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  flex: 1;
}

.stat-inline {
  padding: 4px 8px;
  border-radius: var(--border-radius-small);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tower-count {
  background: rgba(32, 192, 80, 0.1);
  color: var(--color-success);
}
</style>