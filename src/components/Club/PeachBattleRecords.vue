<template>
  <div>
    <!-- Inline 模式：卡片渲染 -->
    <div v-if="inline" class="inline-wrapper">
      <div class="inline-header">
        <div class="inline-title">蟠桃园战绩</div>
        <div class="header-actions">
          <a-date-picker v-model:value="queryDate" @change="fetchBattleRecordsByDate" valueFormat="YYYY/MM/DD" :disabled-date="disabledDate"/>
          <n-button size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
        </div>
        <div class="header-actions">
          <n-button type="primary" size="small" :disabled="!battleRecords || loading" @click="handleExport">
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
            <template #description>正在加载战绩数据...</template>
          </n-spin>
        </div>

        <!-- 战绩列表 -->
        <div v-else-if="battleRecords && battleRecords.ownClub && battleRecords.opponentClub" ref="exportDom" class="records-list">
          <!-- 头部对战信息 -->
          <div class="battle-header">
            <h2>{{ queryDate }} {{ battleRecords.ownClub.name }} VS {{ battleRecords.opponentClub.name }} 蟠桃大会对战战绩</h2>
            <div class="club-info">
              <div class="club-side own">
                <img v-if="battleRecords.ownClub.logo" :src="battleRecords.ownClub.logo" :alt="battleRecords.ownClub.name" class="club-logo">
                <div class="club-name">{{ battleRecords.ownClub.serverId }}服 {{ battleRecords.ownClub.name }}</div>
                <div class="club-id">ID: {{ battleRecords.ownClub.id }}</div>
                <div class="club-power">{{ battleRecords.ownClub.memberCount }}人 | {{ formatPower(battleRecords.ownClub.totalPower) }}</div>
              </div>
              <div class="vs">VS</div>
              <div class="club-side opponent">
                <img v-if="battleRecords.opponentClub.logo" :src="battleRecords.opponentClub.logo" :alt="battleRecords.opponentClub.name" class="club-logo">
                <div class="club-name">{{ battleRecords.opponentClub.serverId }}服 {{ battleRecords.opponentClub.name }}</div>
                <div class="club-id">ID: {{ battleRecords.opponentClub.id }}</div>
                <div class="club-power">{{ battleRecords.opponentClub.memberCount }}人 | {{ formatPower(battleRecords.opponentClub.totalPower) }}</div>
              </div>
            </div>
          </div>

          <!-- 总体数据统计 -->
          <div class="overall-stats">
            <div class="stats-side own">
              <div class="stats-title">我方总体数据</div>
              <div class="stats-grid">
                <div class="stat-item stat-kills">
                  <div class="stat-label">总击杀</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalKills || 0 }}</div>
                </div>
                <div class="stat-item stat-revives">
                  <div class="stat-label">总复活</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalRevives || 0 }}</div>
                </div>
                <div class="stat-item stat-kd">
                  <div class="stat-label">总K/D</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalKD || 0 }}</div>
                </div>
              </div>
            </div>
            <div class="stats-side opponent">
              <div class="stats-title">敌方总体数据</div>
              <div class="stats-grid">
                <div class="stat-item stat-kills">
                  <div class="stat-label">总击杀</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalKills || 0 }}</div>
                </div>
                <div class="stat-item stat-revives">
                  <div class="stat-label">总复活</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalRevives || 0 }}</div>
                </div>
                <div class="stat-item stat-kd">
                  <div class="stat-label">总K/D</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalKD || 0 }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 各种榜单 -->
          <div class="battle-rankings">
            <!-- 击杀榜 -->
            <div class="ranking-card">
              <div class="ranking-title">击杀榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.killRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.killCnt || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.killRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.killCnt || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- K/D榜 -->
            <div class="ranking-card">
              <div class="ranking-title">K/D榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.kdRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.kd || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.kdRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.kd || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 复活榜 -->
            <div class="ranking-card">
              <div class="ranking-title">复活榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.reviveRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.reviveCnt || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.reviveRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.reviveCnt || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 战神榜 -->
          <div class="god-rankings">
            <div class="god-ranking own">
              <div class="god-ranking-title">我方战神榜</div>
              <div class="god-ranking-content">
                <div class="god-ranking-header">
                  <div class="god-rank-number">排名</div>
                  <div class="header-avatar"></div>
                  <div class="header-player">玩家</div>
                  <div class="header-stat">击杀</div>
                  <div class="header-stat">连杀</div>
                  <div class="header-stat">抢船</div>
                  <div class="header-stat">复活</div>
                  <div class="header-stat">K/D</div>
                </div>
                <div v-for="(player, index) in battleRecords.ownClub.godRank" :key="index" class="god-ranking-item">
                  <div class="god-rank-number">{{ index + 1 }}</div>
                  <div class="player-avatar-cell">
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                  </div>
                  <span class="header-player">{{ player.roleInfo.name }}</span>
                  <span class="player-stat">{{ player.killCnt || 0 }}</span>
                  <span class="player-stat">{{ player.mCKCnt || 0 }}</span>
                  <span class="player-stat">{{ player.carCnt || 0 }}</span>
                  <span class="player-stat">{{ player.reviveCnt || 0 }}</span>
                  <span class="player-stat">{{ player.kd || 0 }}</span>
                </div>
              </div>
            </div>
            <div class="god-ranking opponent">
              <div class="god-ranking-title">敌方战神榜</div>
              <div class="god-ranking-content">
                <div class="god-ranking-header">
                  <div class="god-rank-number">排名</div>
                  <div class="header-avatar"></div>
                  <div class="header-player">玩家</div>
                  <div class="header-stat">击杀</div>
                  <div class="header-stat">连杀</div>
                  <div class="header-stat">抢船</div>
                  <div class="header-stat">复活</div>
                  <div class="header-stat">K/D</div>
                </div>
                <div v-for="(player, index) in battleRecords.opponentClub.godRank" :key="index" class="god-ranking-item">
                  <div class="god-rank-number">{{ index + 1 }}</div>
                  <div class="player-avatar-cell">
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                  </div>
                  <span class="header-player">{{ player.roleInfo.name }}</span>
                  <span class="player-stat">{{ player.killCnt || 0 }}</span>
                  <span class="player-stat">{{ player.mCKCnt || 0 }}</span>
                  <span class="player-stat">{{ player.carCnt || 0 }}</span>
                  <span class="player-stat">{{ player.reviveCnt || 0 }}</span>
                  <span class="player-stat">{{ player.kd || 0 }}</span>
                </div>
              </div>
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

    <!-- Modal 模式 -->
    <n-modal v-else v-model:show="showModal" preset="card" title="蟠桃园战绩" style="width: 90%; max-width: 1200px"
      @after-leave="handleClose">
      <template #header-extra>
        <div class="header-actions">
          <a-date-picker v-model:value="queryDate" @change="fetchBattleRecordsByDate" valueFormat="YYYY/MM/DD" :disabled-date="disabledDate"/>
          <n-button size="small" :disabled="loading" @click="handleRefresh">
            <template #icon>
              <n-icon>
                <Refresh />
              </n-icon>
            </template>
            刷新
          </n-button>
          <n-button type="primary" size="small" :disabled="!battleRecords || loading" @click="handleExport">
            <template #icon>
              <n-icon>
                <Copy />
              </n-icon>
            </template>
            导出
          </n-button>
        </div>
      </template>

      <div class="battle-records-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <n-spin size="large">
            <template #description>正在加载战绩数据...</template>
          </n-spin>
        </div>

        <!-- 战绩列表 -->
        <div v-else-if="battleRecords && battleRecords.ownClub && battleRecords.opponentClub" ref="exportDom" class="records-list">
          <!-- 头部对战信息 -->
          <div class="battle-header">
            <h2>{{ queryDate }} {{ battleRecords.ownClub.name }} VS {{ battleRecords.opponentClub.name }} 蟠桃大会对战战绩</h2>
            <div class="club-info">
              <div class="club-side own">
                <img v-if="battleRecords.ownClub.logo" :src="battleRecords.ownClub.logo" :alt="battleRecords.ownClub.name" class="club-logo">
                <div class="club-name">{{ battleRecords.ownClub.serverId }}服 {{ battleRecords.ownClub.name }}</div>
                <div class="club-id">ID: {{ battleRecords.ownClub.id }}</div>
                <div class="club-power">{{ battleRecords.ownClub.memberCount }}人 | {{ formatPower(battleRecords.ownClub.totalPower) }}</div>
              </div>
              <div class="vs">VS</div>
              <div class="club-side opponent">
                <img v-if="battleRecords.opponentClub.logo" :src="battleRecords.opponentClub.logo" :alt="battleRecords.opponentClub.name" class="club-logo">
                <div class="club-name">{{ battleRecords.opponentClub.serverId }}服 {{ battleRecords.opponentClub.name }}</div>
                <div class="club-id">ID: {{ battleRecords.opponentClub.id }}</div>
                <div class="club-power">{{ battleRecords.opponentClub.memberCount }}人 | {{ formatPower(battleRecords.opponentClub.totalPower) }}</div>
              </div>
            </div>
          </div>

          <!-- 总体数据统计 -->
          <div class="overall-stats">
            <div class="stats-side own">
              <div class="stats-title">我方总体数据</div>
              <div class="stats-grid">
                <div class="stat-item stat-kills">
                  <div class="stat-label">总击杀</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalKills || 0 }}</div>
                </div>
                <div class="stat-item stat-revives">
                  <div class="stat-label">总复活</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalRevives || 0 }}</div>
                </div>
                <div class="stat-item stat-kd">
                  <div class="stat-label">总K/D</div>
                  <div class="stat-value">{{ battleRecords.ownClub.totalKD || 0 }}</div>
                </div>
              </div>
            </div>
            <div class="stats-side opponent">
              <div class="stats-title">敌方总体数据</div>
              <div class="stats-grid">
                <div class="stat-item stat-kills">
                  <div class="stat-label">总击杀</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalKills || 0 }}</div>
                </div>
                <div class="stat-item stat-revives">
                  <div class="stat-label">总复活</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalRevives || 0 }}</div>
                </div>
                <div class="stat-item stat-kd">
                  <div class="stat-label">总K/D</div>
                  <div class="stat-value">{{ battleRecords.opponentClub.totalKD || 0 }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 各种榜单 -->
          <div class="battle-rankings">
            <!-- 击杀榜 -->
            <div class="ranking-card">
              <div class="ranking-title">击杀榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.killRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.killCnt || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.killRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.killCnt || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- K/D榜 -->
            <div class="ranking-card">
              <div class="ranking-title">K/D榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.kdRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.kd || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.kdRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.kd || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 复活榜 -->
            <div class="ranking-card">
              <div class="ranking-title">复活榜</div>
              <div class="ranking-content">
                <div class="ranking-side own">
                  <div class="ranking-subtitle">我方 Top3</div>
                  <div v-for="(player, index) in battleRecords.ownClub.reviveRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.reviveCnt || 0 }}</span>
                  </div>
                </div>
                <div class="ranking-side opponent">
                  <div class="ranking-subtitle">敌方 Top3</div>
                  <div v-for="(player, index) in battleRecords.opponentClub.reviveRank" :key="index" class="ranking-item">
                    <div class="rank-number">{{ index + 1 }}</div>
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                    <span class="player-name">{{ player.roleInfo.name }}</span>
                    <span class="player-value">{{ player.reviveCnt || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 战神榜 -->
          <div class="god-rankings">
            <div class="god-ranking own">
              <div class="god-ranking-title">我方战神榜</div>
              <div class="god-ranking-content">
                <div class="god-ranking-header">
                  <div class="god-rank-number">排名</div>
                  <div class="header-avatar"></div>
                  <div class="header-player">玩家</div>
                  <div class="header-stat">击杀</div>
                  <div class="header-stat">连杀</div>
                  <div class="header-stat">抢船</div>
                  <div class="header-stat">复活</div>
                  <div class="header-stat">K/D</div>
                </div>
                <div v-for="(player, index) in battleRecords.ownClub.godRank" :key="index" class="god-ranking-item">
                  <div class="god-rank-number">{{ index + 1 }}</div>
                  <div class="player-avatar-cell">
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                  </div>
                  <span class="header-player">{{ player.roleInfo.name }}</span>
                  <span class="player-stat">{{ player.killCnt || 0 }}</span>
                  <span class="player-stat">{{ player.mCKCnt || 0 }}</span>
                  <span class="player-stat">{{ player.carCnt || 0 }}</span>
                  <span class="player-stat">{{ player.reviveCnt || 0 }}</span>
                  <span class="player-stat">{{ player.kd || 0 }}</span>
                </div>
              </div>
            </div>
            <div class="god-ranking opponent">
              <div class="god-ranking-title">敌方战神榜</div>
              <div class="god-ranking-content">
                <div class="god-ranking-header">
                  <div class="god-rank-number">排名</div>
                  <div class="header-avatar"></div>
                  <div class="header-player">玩家</div>
                  <div class="header-stat">击杀</div>
                  <div class="header-stat">连杀</div>
                  <div class="header-stat">抢船</div>
                  <div class="header-stat">复活</div>
                  <div class="header-stat">K/D</div>
                </div>
                <div v-for="(player, index) in battleRecords.opponentClub.godRank" :key="index" class="god-ranking-item">
                  <div class="god-rank-number">{{ index + 1 }}</div>
                  <div class="player-avatar-cell">
                    <img v-if="player.roleInfo.headImg" :src="player.roleInfo.headImg" :alt="player.roleInfo.name" class="player-avatar" @error="handleImageError">
                    <div v-else class="player-avatar-placeholder">{{ player.roleInfo.name?.charAt(0) || '?' }}</div>
                  </div>
                  <span class="header-player">{{ player.roleInfo.name }}</span>
                  <span class="player-stat">{{ player.killCnt || 0 }}</span>
                  <span class="player-stat">{{ player.mCKCnt || 0 }}</span>
                  <span class="player-stat">{{ player.carCnt || 0 }}</span>
                  <span class="player-stat">{{ player.reviveCnt || 0 }}</span>
                  <span class="player-stat">{{ player.kd || 0 }}</span>
                </div>
              </div>
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
    </n-modal>
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
  getLastSaturday,
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

const exportmethod = ref(['1']);
const exportDom = ref(null);
const emit = defineEmits(['update:visible'])

const message = useMessage()
const tokenStore = useTokenStore()
const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);
const showModal = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const loading = ref(false)
const battleRecords = ref(null)
const expandedMembers = ref(new Set())
const queryDate = ref('');


const legionMatch = ref({
  isRegistered: false
})

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

// 获取战斗样式类
const getBattleClass = (battle) => {
  const classes = []
  if (battle.newWinFlag === 2) {
    classes.push('battle-win')
  } else {
    classes.push('battle-loss')
  }
  if (battle.attackType === 0) {
    classes.push('battle-attack')
  } else {
    classes.push('battle-defend')
  }
  return classes.join(' ')
}

// 切换成员详情展开状态
const toggleMemberDetails = (roleId) => {
  if (expandedMembers.value.has(roleId)) {
    expandedMembers.value.delete(roleId)
  } else {
    expandedMembers.value.add(roleId)
  }
}

// 处理图片加载错误
const handleImageError = (event) => {
  event.target.style.display = 'none'
}

const disabledDate = current => {
  return (current.getDay() != 0) || current > Date.now()
}

//日期选择时调用查询战绩方法
const fetchBattleRecordsByDate = (val)=>{
  if(undefined != val){
    queryDate.value = val
  }else{
    queryDate.value = getLastSunday();
  }
  fetchBattleRecords();
} 

// 查询战绩
  const fetchBattleRecords = async () => {
    if (!tokenStore.selectedToken) {
      message.warning('请先选择游戏角色')
      return
    }
    const tokenId = tokenStore.selectedToken.id
    // 检查WebSocket连接
    const wsStatus = tokenStore.getWebSocketStatus(tokenId)
    if (wsStatus !== 'connected') {
      message.error('WebSocket未连接，无法查询战绩')
      return
    }
    loading.value = true
    try {
      const payloadTaskRes = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getpayloadtask",
      {},
      10000
      );
      if (!payloadTaskRes) {
        message.error("未获取到对战俱乐部");
        return;
      }
      const firstLegionId = payloadTaskRes.firstLegionId
      const payloadrecord = await tokenStore.sendMessageWithPromise(
      tokenId,
      "legion_getpayloadrecord",
      {},
      10000
      );
      if (!payloadrecord) {
        message.error("未获取到对战俱乐部");
        return;
      }
      const secondLegionId = payloadrecord.enemyLegionMap[formatDateToShort(queryDate.value)].id
      if (!firstLegionId || !secondLegionId) {
        message.error("未获取到对战俱乐部ID");
        return;
      }
      // 获取俱乐部的详细信息
      const firstLegionIdInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: firstLegionId },
        10000
      );
      const secondLegionIdInfo = await tokenStore.sendMessageWithPromise(
        tokenId,
        "legion_getinfobyid",
        { legionId: secondLegionId },
        10000
      );
      const result = await tokenStore.sendMessageWithPromise(
        tokenId,
        'legion_getpayloadkillrecord',
        { date: formatDateToShort(queryDate.value) },
        10000
      );
      if (!result) {
        message.error("未获取到对战俱乐部战绩");
        return;
      }
      
      // 处理我方战绩
      const ownRecords = result.recordsMap && result.recordsMap[Number(firstLegionId)] ? [...result.recordsMap[Number(firstLegionId)]] : []
      // 处理敌方战绩
      const opponentRecords = result.recordsMap && result.recordsMap[Number(secondLegionId)] ? [...result.recordsMap[Number(secondLegionId)]] : []
      
      // 计算每个玩家的K/D值
      const calculateKD = (player) => {
        const killCnt = player.killCnt || 0
        const reviveCnt = player.reviveCnt || 0
        return reviveCnt > 0 ? parseFloat((killCnt / reviveCnt).toFixed(2)) : 0
      }
      
      // 处理我方数据
      const processedOwnRecords = ownRecords.map(player => ({
        ...player,
        kd: calculateKD(player)
      }))
      
      // 处理敌方数据
      const processedOpponentRecords = opponentRecords.map(player => ({
        ...player,
        kd: calculateKD(player)
      }))
      
      // 生成我方榜单
      const ownKillRank = [...processedOwnRecords].sort((a, b) => (b.killCnt || 0) - (a.killCnt || 0)).slice(0, 3)
      const ownKdRank = [...processedOwnRecords].sort((a, b) => b.kd - a.kd).slice(0, 3)
      const ownReviveRank = [...processedOwnRecords].sort((a, b) => (b.reviveCnt || 0) - (a.reviveCnt || 0)).slice(0, 3)
      const ownGodRank = [...processedOwnRecords].sort((a, b) => (b.killCnt || 0) - (a.killCnt || 0))
      
      // 生成敌方榜单
      const opponentKillRank = [...processedOpponentRecords].sort((a, b) => (b.killCnt || 0) - (a.killCnt || 0)).slice(0, 3)
      const opponentKdRank = [...processedOpponentRecords].sort((a, b) => b.kd - a.kd).slice(0, 3)
      const opponentReviveRank = [...processedOpponentRecords].sort((a, b) => (b.reviveCnt || 0) - (a.reviveCnt || 0)).slice(0, 3)
      const opponentGodRank = [...processedOpponentRecords].sort((a, b) => (b.killCnt || 0) - (a.killCnt || 0))
      
      // 计算我方总体数据
      const ownTotalKills = processedOwnRecords.reduce((sum, player) => sum + (player.killCnt || 0), 0)
      const ownTotalRevives = processedOwnRecords.reduce((sum, player) => sum + (player.reviveCnt || 0), 0)
      const ownTotalKD = ownTotalRevives > 0 ? parseFloat((ownTotalKills / ownTotalRevives).toFixed(2)) : 0
      const ownTotalPower = processedOwnRecords.reduce((sum, player) => sum + (player.roleInfo.power || 0), 0)
      
      // 计算敌方总体数据
      const opponentTotalKills = processedOpponentRecords.reduce((sum, player) => sum + (player.killCnt || 0), 0)
      const opponentTotalRevives = processedOpponentRecords.reduce((sum, player) => sum + (player.reviveCnt || 0), 0)
      const opponentTotalKD = opponentTotalRevives > 0 ? parseFloat((opponentTotalKills / opponentTotalRevives).toFixed(2)) : 0
      const opponentTotalPower = processedOpponentRecords.reduce((sum, player) => sum + (player.roleInfo.power || 0), 0)
      
      // 构建最终数据结构
      battleRecords.value = {
        ownClub: {
          id: firstLegionId,
          name: firstLegionIdInfo?.legionData?.name || '我方俱乐部',
          level: firstLegionIdInfo?.legionData?.level || 0,
          power: firstLegionIdInfo?.legionData?.power || 0,
          serverId: firstLegionIdInfo?.legionData?.serverId || '',
          logo: firstLegionIdInfo?.legionData?.logo || '',
          quenchNum: firstLegionIdInfo?.legionData?.quenchNum || 0,
          announcement: firstLegionIdInfo?.legionData?.announcement || '',
          memberCount: processedOwnRecords.length,
          totalPower: ownTotalPower,
          totalKills: ownTotalKills,
          totalRevives: ownTotalRevives,
          totalKD: ownTotalKD,
          killRank: ownKillRank,
          kdRank: ownKdRank,
          reviveRank: ownReviveRank,
          godRank: ownGodRank
        },
        opponentClub: {
          id: secondLegionId,
          name: secondLegionIdInfo?.legionData?.name || '敌方俱乐部',
          level: secondLegionIdInfo?.legionData?.level || 0,
          power: secondLegionIdInfo?.legionData?.power || 0,
          serverId: secondLegionIdInfo?.legionData?.serverId || '',
          logo: secondLegionIdInfo?.legionData?.logo || '',
          quenchNum: secondLegionIdInfo?.legionData?.quenchNum || 0,
          announcement: secondLegionIdInfo?.legionData?.announcement || '',
          memberCount: processedOpponentRecords.length,
          totalPower: opponentTotalPower,
          totalKills: opponentTotalKills,
          totalRevives: opponentTotalRevives,
          totalKD: opponentTotalKD,
          killRank: opponentKillRank,
          kdRank: opponentKdRank,
          reviveRank: opponentReviveRank,
          godRank: opponentGodRank
        }
      }
      
      message.success('战绩加载成功')
    } catch (error) {
      console.error('查询战绩失败:', error)
      message.error(`查询失败: ${error.message}`)
      battleRecords.value = null
    } finally {
      loading.value = false
    }
  }

// 刷新战绩
const handleRefresh = () => {
  fetchBattleRecords()
}

// 导出战绩
const handleExport = async () => {
  if (!battleRecords.value) {
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
    // 临时移除战神榜内容区域的最大高度限制，确保所有内容都可见
    const godRankingContents = exportDom.value.querySelectorAll('.god-ranking-content');
    const originalStyles = [];
    
    godRankingContents.forEach(content => {
      originalStyles.push({
        element: content,
        maxHeight: content.style.maxHeight,
        overflow: content.style.overflow
      });
      content.style.maxHeight = 'none';
      content.style.overflow = 'visible';
    });

    // 5. 用html2canvas渲染DOM为Canvas
    const canvas = await html2canvas(exportDom.value, {
      scale: 2, // 放大2倍，解决图片模糊问题
      useCORS: true, // 允许跨域图片（若DOM内有远程图片，需开启）
      backgroundColor: '#ffffff', // 避免透明背景（默认透明）
      logging: false // 关闭控制台日志
    });

    // 恢复战神榜内容区域的原始样式
    originalStyles.forEach(({ element, maxHeight, overflow }) => {
      element.style.maxHeight = maxHeight;
      element.style.overflow = overflow;
    });

    // 6. Canvas转图片链接（支持PNG/JPG）
    const imgUrl = canvas.toDataURL('image/png'); // 若要JPG，改为'image/jpeg'

    // 7. 创建下载链接，触发浏览器下载
    const link = document.createElement('a');
    link.href = imgUrl;
    link.download = queryDate.value.replace("/",'年').replace("/",'月')+'日蟠桃园战报.png'; // 下载文件名
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
  fetchBattleRecords
})

// Inline 模式：挂载后自动拉取
onMounted(() => {
  if (props.inline) {
    queryDate.value = getLastSunday()
    fetchBattleRecords()
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

.battle-records-content {
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
  gap: var(--spacing-md);
}

/* 头部对战信息 */
.battle-header {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.battle-header h2 {
  text-align: center;
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  padding: var(--spacing-md);
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.club-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  margin-top: var(--spacing-md);
}

/* 确保VS图标垂直居中 */
.vs {
  align-self: center;
}

.club-side {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  flex: 1;
}

.club-side.own {
  align-items: flex-end;
  text-align: right;
}

.club-side.opponent {
  align-items: flex-start;
  text-align: left;
}

/* 确保logo和文字对齐 */
.club-side.own .club-logo {
  align-self: flex-end;
}

.club-side.opponent .club-logo {
  align-self: flex-start;
}

.club-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}

.club-logo {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-light);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  margin-bottom: var(--spacing-sm);
}

.club-id {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.club-power {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.vs {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xl);
  color: var(--text-secondary);
  margin: 0 var(--spacing-lg);
}

/* 总体数据统计 */
.overall-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stats-side {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.stats-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-sm);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.stat-value {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
}

/* 统计项颜色区分 */
.stat-kills {
  border-left: 4px solid var(--error-color);
}

.stat-kills .stat-value {
  color: var(--error-color);
}

.stat-revives {
  border-left: 4px solid var(--warning-color);
}

.stat-revives .stat-value {
  color: var(--warning-color);
}

.stat-kd {
  border-left: 4px solid var(--success-color);
}

.stat-kd .stat-value {
  color: var(--success-color);
}

/* 各种榜单 */
.battle-rankings {
  margin-bottom: var(--spacing-md);
}

.ranking-card {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ranking-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  text-align: center;
}

.ranking-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.ranking-side {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.ranking-subtitle {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--spacing-sm);
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.rank-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.ranking-item:nth-of-type(2) .rank-number {
  background: #FFD700;
  color: #000;
}

.ranking-item:nth-of-type(3) .rank-number {
  background: #C0C0C0;
  color: #000;
}

.ranking-item:nth-of-type(4) .rank-number {
  background: #CD7F32;
  color: #000;
}

.player-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.player-avatar-placeholder {
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

.player-name {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-value {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
}

/* 战神榜 */
.god-rankings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.god-ranking {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-medium);
  padding: var(--spacing-md);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.god-ranking-title {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--spacing-md);
  padding-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--border-light);
  text-align: center;
}

.god-ranking-content {
  max-height: 400px;
  overflow-y: auto;
  padding-right: var(--spacing-xs);
}

.god-ranking-content::-webkit-scrollbar {
  width: 6px;
}



.god-ranking-header {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
}

.header-avatar {
  width: 32px;
  flex-shrink: 0;
}

.player-avatar-cell {
  width: 32px;
  flex-shrink: 0;
}

.header-player {
  width: 140px;
  padding-left: var(--spacing-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.header-id {
  flex: 0 0 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-stat {
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.god-ranking-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
  border-radius: var(--border-radius-sm);
  background: var(--bg-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.god-rank-number {
  width: 32px;
  height: 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  background: #696969;
  color: #fff;
}

.god-ranking-header > .god-rank-number {
  background: transparent !important;
  color: var(--text-secondary) !important;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
}

.god-ranking-item:nth-of-type(2) .god-rank-number {
  background: #FFD700;
  color: #000;
}

.god-ranking-item:nth-of-type(3) .god-rank-number {
  background: #C0C0C0;
  color: #000;
}

.god-ranking-item:nth-of-type(4) .god-rank-number {
  background: #CD7F32;
  color: #000;
}

.player-id {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  flex: 0 0 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-name {
  width: 140px;
  padding-left: var(--spacing-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.player-stat {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.god-ranking-content::-webkit-scrollbar-track {
  background: var(--bg-primary);
  border-radius: 3px;
}

.god-ranking-content::-webkit-scrollbar-thumb {
  background: var(--border-light);
  border-radius: 3px;
}

.god-ranking-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .overall-stats {
    grid-template-columns: 1fr;
  }
  
  .ranking-content {
    grid-template-columns: 1fr;
  }
  
  .god-rankings {
    grid-template-columns: 1fr;
  }
  
  .club-info {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .club-side.own {
    align-items: center;
  }
  
  .club-side.opponent {
    align-items: center;
  }
}

@media (max-width: 768px) {
  .inline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .ranking-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .god-ranking-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
  
  .player-stat {
    min-width: auto;
    text-align: left;
  }
}
</style>