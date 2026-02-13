<template>
  <MyCard class="club-info" :statusClass="{ active: !!club }">
    <template #icon>
      <img src="/icons/1733492491706152.png" alt="俱乐部图标" />
    </template>
    <template #title>
      <h3>蟠桃园信息</h3>
    </template>
    <template v-if="!club" #badge>
      <span v-if="!club">{{ "暂无俱乐部" }}</span>
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
          <n-tab-pane
            name="overview"
            tab="对手信息"
            display-directive="show:lazy"
          >
            <div class="overview">
              <div class="club-header">
                <n-avatar
                  :size="48"
                  :src="battleInfo?.logo || '/icons/xiaoyugan.png'"
                />
                <div class="meta">
                  <div class="name">{{ battleInfo?.name || "暂无名称" }}</div>
                  <div class="sub">
                    ID {{ battleInfo?.id || "0" }} · Lv.{{
                      battleInfo?.level || "0"
                    }}
                    · 服务器
                    {{ battleInfo?.serverId || "0" }}
                  </div>
                </div>
              </div>
              <div class="grid">
                <div class="item">
                  <div class="label">战力</div>
                  <div class="value">
                    {{ formatPower(battleInfo?.power || 0) }}
                  </div>
                </div>
                <div class="item">
                  <div class="label">红粹</div>
                  <div class="value">{{ battleInfo?.quenchNum || "0" }}</div>
                </div>
              </div>

              <div v-if="topHeroes.length > 0" class="top-heroes-section">
                <div class="label">前三车头</div>
                <div class="hero-avatars">
                  <div
                    v-for="(hero, index) in topHeroes"
                    :key="index"
                    class="hero-card"
                  >
                    <div
                      class="hero-avatar-container"
                      @click="handleHeroClick(hero)"
                    >
                      <img
                        v-if="hero.headImg"
                        :src="hero.headImg"
                        :alt="hero.name"
                        class="hero-avatar"
                      />
                      <div v-else class="hero-avatar-placeholder">
                        {{ hero.name?.charAt(0) || "?" }}
                      </div>
                      <div class="hero-holy-beast" title="四圣数">
                        <span class="holy-beast-icon">🐉</span>
                        <span class="holy-beast-count">{{
                          hero.holyBeast
                        }}</span>
                      </div>
                    </div>
                    <div class="hero-info">
                      <div class="hero-name">{{ hero.name || "未知" }}</div>
                      <div class="hero-stats">
                        <span class="hero-power">{{
                          formatPower(hero.power)
                        }}</span>
                        <span class="hero-redquench">{{ hero.red }}红</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="battleInfo?.announcement" class="announcement">
                <div class="label">公告</div>
                <div class="text">
                  {{ battleInfo?.announcement || "暂无公告" }}
                </div>
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
        </n-tabs>
      </div>
    </template>
  </MyCard>

  <!-- 玩家信息模态框 -->
  <n-modal
    v-model:show="showPlayerInfoModal"
    preset="card"
    title="对手信息"
    :style="{ width: '800px' }"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }"
    :show-close="false"
  >
    <template #header-extra>
      <span v-if="playerInfo" class="player-id">ID: {{ playerInfo.id }}</span>
    </template>

    <div v-if="playerInfo" class="player-info-content">
      <div class="player-info-main">
        <n-avatar
          round
          :size="60"
          :src="playerInfo.headImg"
          class="player-avatar"
        />
        <div class="player-info-detail">
          <h3>
            {{ playerInfo.name }}
            <n-tag
              v-if="playerInfo.legacy > 0"
              :style="{
                color: '#fff',
                backgroundColor: legacycolor[playerInfo.legacy]?.value,
              }"
              size="small"
              style="margin-left: 8px"
            >
              {{ legacycolor[playerInfo.legacy]?.name || "未知" }}
            </n-tag>
          </h3>
          <p>
            区服: {{ playerInfo.serverName || "未知" }} | 战力:
            {{ formatPower(playerInfo.power) }}
          </p>
          <p>俱乐部: {{ playerInfo.legionName || "无" }}</p>
          <p>
            总红数: {{ playerInfo.totalRedCount || 0 }} | 总开孔数:
            {{ playerInfo.totalHoleCount || 0 }} | 四圣数:
            {{ playerInfo.holyBeast || 0 }}
          </p>
        </div>
      </div>

      <div class="player-heroes">
        <h4>武将阵容</h4>
        <!-- 添加调试信息 -->
        <div
          v-if="playerInfo.heroList"
          class="debug-info"
          style="font-size: 12px; color: #999; margin-bottom: 10px"
        >
          武将数量: {{ playerInfo.heroList.length }}
        </div>
        <div
          class="hero-list"
          v-if="playerInfo.heroList && playerInfo.heroList.length > 0"
        >
          <div
            v-for="(hero, index) in playerInfo.heroList"
            :key="hero.heroId || index"
            class="hero-item"
            @click="selectHeroInfo(hero)"
          >
            <n-avatar
              round
              :size="40"
              :src="hero.heroAvate"
              style="cursor: pointer"
            />
            <div class="hero-info">
              <span class="hero-name">{{ hero.heroName }}</span>
              <div class="hero-stats">
                <span>战力: {{ formatPower(hero.power || 0) }}</span>
                <span>星级: {{ hero.star || 0 }}</span>
                <span>红数: {{ hero.red || 0 }}</span>
                <span>开孔: {{ hero.hole || 0 }}</span>
                <span :class="hero.HolyBeast ? 'opened' : 'closed'">
                  {{ hero.HolyBeast ? "已开四圣" : "未开四圣" }}
                </span>
                <span v-if="hero.HolyBeast"
                  >四圣等级: {{ hero.HBlevel || 0 }}</span
                >
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-heroes">
          <p>未查询到武将信息</p>
          <!-- 添加调试信息 -->
          <div
            v-if="playerInfo.heroList"
            style="font-size: 12px; color: #999; margin-top: 10px"
          >
            武将列表为空
          </div>
          <div v-else style="font-size: 12px; color: #999; margin-top: 10px">
            武将列表未定义
          </div>
        </div>
      </div>
    </div>
  </n-modal>

  <!-- 武将详情模态框 -->
  <n-modal
    v-model:show="showHeroModal"
    class="hero-detail-modal"
    preset="card"
    title="武将信息"
    size="large"
    :bordered="false"
    :segmented="{ content: 'soft', footer: 'soft' }"
    :style="{ width: '600px' }"
    :show-close="true"
  >
    <template #header-extra>
      <span class="hero-id">武将ID: {{ heroModealTemp?.heroId }}</span>
    </template>

    <div v-if="heroModealTemp" class="hero-modal-content">
      <div class="hero-modal-header">
        <div class="hero-modal-avatar">
          <img
            v-if="heroModealTemp.heroAvate"
            :src="heroModealTemp.heroAvate"
            :alt="heroModealTemp.heroName"
          />
          <div v-else class="hero-placeholder">
            {{ heroModealTemp.heroName?.substring(0, 2) || "?" }}
          </div>
        </div>
        <div class="hero-modal-basic">
          <h3 class="hero-modal-name">{{ heroModealTemp.heroName }}</h3>
          <div class="hero-modal-stats">
            <span class="stat-item">{{
              formatPower(heroModealTemp.power)
            }}</span>
            <span class="stat-item">等级: {{ heroModealTemp.level }}</span>
            <span class="stat-item">星级: {{ heroModealTemp.star }}</span>
            <n-tag :type="heroModealTemp.HolyBeast ? 'success' : 'warning'">
              {{ heroModealTemp.HolyBeast ? "已激活" : "未激活" }}
            </n-tag>
          </div>
        </div>
      </div>

      <div class="hero-modal-details">
        <n-descriptions label-placement="left" column="3" bordered>
          <n-descriptions-item label="战力">
            {{ formatPower(heroModealTemp.power) }}
          </n-descriptions-item>
          <n-descriptions-item label="等级">
            {{ heroModealTemp.level }}
          </n-descriptions-item>
          <n-descriptions-item label="星级">
            {{ heroModealTemp.star }}
          </n-descriptions-item>
          <n-descriptions-item label="开孔数">
            {{ heroModealTemp.hole }}
          </n-descriptions-item>
          <n-descriptions-item label="红孔数">
            {{ heroModealTemp.red }}
          </n-descriptions-item>
          <n-descriptions-item label="四圣状态">
            {{ heroModealTemp.HolyBeast ? "已激活" : "未激活" }}
          </n-descriptions-item>
          <n-descriptions-item label="四圣等级" v-if="heroModealTemp.HolyBeast">
            {{ heroModealTemp.HBlevel }}
          </n-descriptions-item>
          <n-descriptions-item label="鱼灵">
            {{
              heroModealTemp?.PearlInfo?.FishInfo?.name != undefined
                ? heroModealTemp.PearlInfo?.FishInfo?.name
                : "无"
            }}
          </n-descriptions-item>
          <n-descriptions-item label="鱼珠技能">
            {{
              heroModealTemp?.PearlInfo?.PearlSkill?.name != undefined
                ? heroModealTemp.PearlInfo?.PearlSkill?.name
                : "无"
            }}
          </n-descriptions-item>
          <n-descriptions-item label="鱼灵洗练">
            <div v-if="heroModealTemp?.PearlInfo?.slotMap?.length > 0">
              <div
                v-for="item in heroModealTemp.PearlInfo.slotMap"
                :key="item.id"
                class="ModalEquipment"
                :style="'background-color:' + item.value"
              ></div>
            </div>
            <div v-else>无</div>
          </n-descriptions-item>
        </n-descriptions>
      </div>

      <div class="hero-modal-equipment">
        <h4 class="section-title">装备详情</h4>
        <div class="equipment-grid">
          <div class="equipment-item">
            <span class="equipment-label">武器:</span>
            <div class="equipment-slots">
              <div
                v-for="(item, idx) in Object.values(
                  Object.values(heroModealTemp.equipment)[0]?.quenches || {},
                )"
                :key="idx"
                class="equipment-slot"
                :class="{ 'red-slot': item.colorId === 6 }"
              ></div>
            </div>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">衣服:</span>
            <div class="equipment-slots">
              <div
                v-for="(item, idx) in Object.values(
                  Object.values(heroModealTemp.equipment)[1]?.quenches || {},
                )"
                :key="idx"
                class="equipment-slot"
                :class="{ 'red-slot': item.colorId === 6 }"
              ></div>
            </div>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">头盔:</span>
            <div class="equipment-slots">
              <div
                v-for="(item, idx) in Object.values(
                  Object.values(heroModealTemp.equipment)[2]?.quenches || {},
                )"
                :key="idx"
                class="equipment-slot"
                :class="{ 'red-slot': item.colorId === 6 }"
              ></div>
            </div>
          </div>
          <div class="equipment-item">
            <span class="equipment-label">坐骑:</span>
            <div class="equipment-slots">
              <div
                v-for="(item, idx) in Object.values(
                  Object.values(heroModealTemp.equipment)[3]?.quenches || {},
                )"
                :key="idx"
                class="equipment-slot"
                :class="{ 'red-slot': item.colorId === 6 }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <n-button @click="showHeroModal = false">关闭</n-button>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from "vue";
import { useTokenStore } from "@/stores/tokenStore";
import { useMessage } from "naive-ui";
import { Refresh, Copy } from "@vicons/ionicons5";
import { gettoday } from "@/utils/clubWarrankUtils";
import {
  HERO_DICT,
  HeroFillInfo,
  formatWeapon,
  legacycolor,
} from "@/utils/HeroList";
import PeachBattleRecords from "./PeachBattleRecords.vue";
const tokenStore = useTokenStore();
const message = useMessage();
const info = computed(() => tokenStore.gameData?.legionInfo || null);
const club = computed(() => info.value?.info || null);
const loading = ref(false);
const battleInfo = ref(null);
const topHeroes = ref([]);
const activeTab = ref("overview");

// 模态框相关状态变量
const showPlayerInfoModal = ref(false);
const playerInfo = ref(null);
const queryLoading = ref(false);
const fightCount = ref(1);
const isFightCountValid = ref(true);

// 武将详情模态框状态
const showHeroModal = ref(false);
// 选中的武将信息
const heroModealTemp = ref(null);
// 格式化战力
const formatPower = (power) => {
  if (!power) return "0";
  if (power >= 100000000) {
    return (power / 100000000).toFixed(2) + "亿";
  }
  if (power >= 10000) {
    return (power / 10000).toFixed(2) + "万";
  }
  return power.toString();
};

const formatDateToShort = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return year.slice(2) + month + day;
};

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
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
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
        10000,
      );
      if (!payloadTaskRes) {
        message.error("未获取到对战俱乐部");
        return;
      }
      firstLegionId = payloadTaskRes.legions[0].id;
      if (club.value.id === firstLegionId) {
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
        10000,
      );
      if (!payloadTaskRes) {
        message.error("未获取到对战俱乐部");
        return;
      }
      firstLegionId =
        payloadTaskRes.enemyLegionMap[formatDateToShort(getLastSunday())]?.id;
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
      10000,
    );
    // 3. 整理对战信息
    battleInfo.value = {
      id: firstLegionId,
      level: firstLegionInfo?.legionData?.level || 0,
      power: firstLegionInfo?.legionData?.power || 0,
      name: firstLegionInfo?.legionData?.name || "",
      serverId: firstLegionInfo?.legionData?.serverId || "",
      logo: firstLegionInfo?.legionData?.logo || "",
      quenchNum: firstLegionInfo?.legionData?.quenchNum || 0,
      announcement: firstLegionInfo?.legionData?.announcement || "",
    };

    // 4. 获取前三车头信息
    topHeroes.value = [];
    const heroes = [];

    if (firstLegionInfo?.legionData?.members) {
      for (const [roleId, memberData] of Object.entries(
        firstLegionInfo.legionData.members,
      )) {
        try {
          const tempRoleInfo = await tokenStore.sendMessageWithPromise(
            tokenId,
            "rank_getroleinfo",
            {
              bottleType: 0,
              includeBottleTeam: false,
              isSearch: false,
              roleId: roleId,
            },
            5000,
          );
          const teamData = {};
          const heroAndholdAndRed = getHeroInfo(tempRoleInfo.roleInfo.heroes);
          // 处理鱼灵信息
          const fishInfo = HeroFillInfo(tempRoleInfo.roleInfo);
          // 将鱼灵信息添加到英雄列表中
          heroAndholdAndRed.heroList.forEach((hero) => {
            hero.PearlInfo = fishInfo[hero.artifactId] || {};
          });
          // 俱乐部名称
          teamData.id = roleId;
          teamData.legionName = tempRoleInfo.legionInfo?.name || "无俱乐部";
          // 俱乐部当前红数
          teamData.legionRed =
            tempRoleInfo.legionInfo?.statistics["battle:red:quench"] || "无";
          // 俱乐部历史最高红数
          teamData.legionMaxRed =
            tempRoleInfo.legionInfo?.statistics["red:quench"] || "无";
          // 俱乐部历史最高战力
          teamData.MaxPower = formatPower(
            tempRoleInfo.legionInfo?.statistics["max:power"] || "0",
          );
          // 切磋对手武将信息
          teamData.heroList = heroAndholdAndRed.heroList;
          // 切磋对手玩家头像
          teamData.headImg = tempRoleInfo.roleInfo.headImg;
          teamData.lordWeaponId = formatWeapon(
            tempRoleInfo.roleInfo.lordWeaponId,
          );
          // 切磋对手玩家名称
          ((teamData.holyBeast = heroAndholdAndRed.heroList.filter(
            (hero) => hero.HolyBeast,
          ).length),
            (teamData.name = tempRoleInfo.roleInfo.name)); // 激活四圣数
          teamData.power = formatPower(tempRoleInfo.roleInfo.power);
          teamData.serverName = tempRoleInfo.roleInfo.serverName;
          teamData.hole = heroAndholdAndRed.holeCount;
          teamData.red = heroAndholdAndRed.redCount;
          teamData.legacy = tempRoleInfo.roleInfo.legacy?.color || 0; // 功法等级
          heroes.push(teamData);
        } catch (error) {
          console.error(`获取成员 ${roleId} 信息失败:`, error);
        }
      }

      // 按红淬数量降序排序，取前三
      heroes.sort((a, b) => b.redQuench - a.redQuench);
      topHeroes.value = heroes.slice(0, 3);
    }

    message.success("查询对战信息成功");
  } catch (error) {
    console.error("查询对战信息失败:", error);
    message.error(`查询失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

/**
 * 提取数组中的英雄信息
 * @param {Object} heroObj
 */
const getHeroInfo = (heroObj) => {
  //统计总红数
  let redCount = 0;
  let holeCount = 0;
  let heroList = [];
  Object.values(heroObj).forEach((hero) => {
    let heroInfo = HERO_DICT[hero.heroId];
    let equipmentInfo = getEquipment(hero.equipment);
    let tempObj = {
      heroId: hero.heroId, //英雄ID
      heroSort: hero.battleTeamSlot, //阵容站位
      artifactId: hero.artifactId, //英雄装备ID，用于匹配鱼灵信息
      power: formatPower(hero.power), //英雄战力
      star: hero.star, //英雄星级
      equipment: hero.equipment, //英雄具体孔数和红数
      heroName: heroInfo.name, //英雄姓名
      heroAvate: heroInfo.avatar,
      level: hero.level, //英雄等级
      hole: equipmentInfo.holeCount, //英雄开孔数量
      red: equipmentInfo.redCount, //英雄红数
      HolyBeast: hero.hB?.active === true, //激活四圣数
      HBlevel: hero.hB?.order || 0, //四圣等级
    };
    redCount += tempObj.red;
    holeCount += tempObj.hole;
    heroList.push(tempObj);
  });
  return {
    redCount,
    holeCount,
    heroList: heroList.sort((a, b) => {
      return a.heroSort - b.heroSort;
    }),
  };
};

//获取装备信息红数和孔数
const getEquipment = (equipment) => {
  let redCount = 0;
  let holeCount = 0;
  let equipArr = [];
  //此处遍历4件装备
  Object.values(equipment).forEach((equ) => {
    //遍历每件装备的属性
    Object.values(equ.quenches).forEach((item) => {
      holeCount++;
      if (item.colorId == 6) {
        redCount++;
      }
    });
  });
  return { redCount, holeCount };
};

// 选择武将信息，显示详情模态框
const selectHeroInfo = (heroInfo) => {
  showHeroModal.value = true;
  heroModealTemp.value = heroInfo;
};

// 新增查询对手信息功能
const fetchTargetInfo = async (roleId) => {
  if (!tokenStore.selectedToken) {
    message.warning("请先选择游戏角色");
    return;
  }

  const tokenId = tokenStore.selectedToken.id;

  // 检查WebSocket连接
  const wsStatus = tokenStore.getWebSocketStatus(tokenId);
  if (wsStatus !== "connected") {
    message.error("WebSocket未连接，无法查询战绩");
    return;
  }

  queryLoading.value = true;

  try {
    // 先获取我方角色信息，确保我方数据可用
    await tokenStore.sendGetRoleInfo(tokenId);

    // 然后获取对手信息
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "rank_getroleinfo",
      {
        bottleType: 0,
        includeBottleTeam: false,
        isSearch: false,
        roleId: roleId,
        includeHero: true,
        includeHeroDetail: true,
        includePearl: true,
      },
      5000,
    );

    if (!result.roleInfo) {
      message.warning("未查询到对手信息");
      return;
    }

    // 处理鱼灵信息
    const fishInfo = HeroFillInfo(result.roleInfo);

    // 获取英雄信息
    let heroAndholdAndRed = { redCount: 0, holeCount: 0, heroList: [] };
    if (result.roleInfo.heroes) {
      try {
        heroAndholdAndRed = getHeroInfo(result.roleInfo.heroes);
      } catch (error) {
        console.error("处理英雄信息失败:", error);
        heroAndholdAndRed = { redCount: 0, holeCount: 0, heroList: [] };
      }
    }

    // 将鱼灵信息添加到英雄列表中
    heroAndholdAndRed.heroList.forEach((hero) => {
      hero.PearlInfo = fishInfo[hero.artifactId] || {};
    });

    // 计算总红数和总开孔数
    const totalRedCount = heroAndholdAndRed.redCount;
    const totalHoleCount = heroAndholdAndRed.holeCount;

    // 从角色信息中获取红淬数据
    const roleRedQuench = result.roleInfo.red || 0;
    const roleMaxRed = result.roleInfo.maxRed || 0;

    // 从俱乐部信息中获取红淬数据（如果有）
    const legionRedQuench =
      result.legionInfo?.statistics?.["battle:red:quench"] || roleRedQuench;
    const legionMaxRed =
      result.legionInfo?.statistics?.["red:quench"] || roleMaxRed;
    const legionMaxPower =
      result.legionInfo?.statistics?.["max:power"] ||
      result.roleInfo.maxPower ||
      0;

    const playerData = {
      id: roleId,
      name: result.roleInfo.name,
      headImg: result.roleInfo.headImg,
      power: result.roleInfo.power,
      level: result.roleInfo.level,
      serverName: result.roleInfo.serverName,
      legacy: result.roleInfo.legacy?.color || 0, // 功法等级
      legionName: result.legionInfo?.name || "无",
      // 显示角色的红淬数
      redQuench: roleRedQuench,
      // 四圣数统计
      holyBeast: heroAndholdAndRed.heroList.filter((hero) => hero.HolyBeast)
        .length,
      // 俱乐部历史最高战力
      maxPower: formatPower(legionMaxPower),
      // 当前红鼓和最大红鼓
      currentRedDrum: roleRedQuench,
      maxRedDrum: roleMaxRed,
      // 总红数和总开孔数
      totalRedCount: totalRedCount,
      totalHoleCount: totalHoleCount,
      // 俱乐部红淬数据
      legionRedQuench: legionRedQuench,
      legionMaxRed: legionMaxRed,
      // 英雄列表
      heroList: heroAndholdAndRed.heroList,
    };

    // 更新状态并显示模态框
    playerInfo.value = playerData;
    showPlayerInfoModal.value = true;

    message.success("查询成功");
  } catch (error) {
    message.error(`查询失败: ${error.message}`);
    console.error("查询失败详细信息:", error);
  } finally {
    queryLoading.value = false;
  }
};

// 车头头像点击处理
const handleHeroClick = (hero) => {
  if (hero.id && !queryLoading.value) {
    message.info(`正在查询车头信息: ${hero.name}`);
    fetchTargetInfo(hero.id);
  } else if (!hero.id) {
    message.error("车头ID不存在，无法查询信息");
    console.error("车头ID不存在", hero);
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

  .top-heroes-section {
    background: var(--bg-tertiary);
    border-radius: var(--border-radius-medium);
    padding: var(--spacing-sm);

    .label {
      color: var(--text-secondary);
      font-size: var(--font-size-xs);
      margin-bottom: 8px;
    }

    .hero-avatars {
      display: flex;
      gap: var(--spacing-xs);
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      flex-wrap: nowrap;
      padding: var(--spacing-xs) 0;
      overflow: hidden;
    }

    .hero-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: calc(var(--spacing-xs) / 2);
      padding: calc(var(--spacing-xs) / 2);
      background: var(--bg-secondary);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-light);
      transition: all var(--transition-fast);
      min-width: 100px;
      flex: 1;
      max-width: 120px;
      cursor: pointer;

      &:hover {
        background: var(--bg-primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
        border-color: var(--primary-color);
      }

      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-sm);
      }

      .hero-stats span {
        padding: 0;
        background: none;
        border: none;
        border-radius: 0;
      }

      .hero-avatar-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        cursor: pointer;
      }

      .hero-avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--border-light);
        transition: all var(--transition-fast);

        &:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &:active {
          transform: scale(0.95);
        }
      }

      .hero-avatar-placeholder {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: var(--bg-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-semibold);
        color: var(--text-secondary);
        border: 2px solid var(--border-light);
      }

      .hero-holy-beast {
        position: absolute;
        right: -5px;
        bottom: -5px;
        display: flex;
        align-items: center;
        gap: 2px;
        background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        color: white;
        padding: 2px 6px;
        border-radius: var(--border-radius-full);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 1;

        .holy-beast-icon {
          font-size: 10px;
        }

        .holy-beast-count {
          font-size: var(--font-size-xs);
        }
      }

      .hero-info {
        width: 100%;
        text-align: center;
      }

      .hero-name {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .hero-stats {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        font-size: var(--font-size-xs);
        color: var(--text-secondary);
        flex-wrap: wrap;
      }

      .hero-power {
        color: var(--text-secondary);
        font-weight: var(--font-weight-normal);
      }

      .hero-redquench {
        color: #ff6b6b;
        font-weight: var(--font-weight-medium);
      }
    }
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

/* 模态框样式 */
.player-info-content {
  padding: 20px;
}

.player-info-main {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--border-light);
}

.player-avatar {
  border: 2px solid var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.player-info-detail h3 {
  margin: 0 0 8px 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.player-info-detail p {
  margin: 0 0 4px 0;
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.action-section {
  margin: 15px 0;
  display: flex;
  justify-content: flex-start;
}

.fight-count-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
}

.fight-count-label {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.fight-count-input {
  width: 100px;
}

.fight-count-hint {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.fight-count-error {
  font-size: var(--font-size-xs);
  color: var(--error-color);
  margin-left: 4px;
}

.fight-progress {
  margin: 15px 0;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.progress-stats {
  display: flex;
  gap: 15px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.fight-result {
  margin: 15px 0;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
}

.fight-result h4 {
  margin: 0 0 12px 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}

.result-label {
  color: var(--text-secondary);
}

.result-value {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.result-value.win {
  color: var(--success-color);
}

.result-value.loss {
  color: var(--error-color);
}

.result-actions {
  margin-top: 15px;
  display: flex;
  justify-content: flex-start;
  gap: 8px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
}

/* 武将详情模态框样式 */
.hero-detail-modal {
  .hero-modal-content {
    padding: 20px 0;
  }

  .hero-modal-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
  }

  .hero-modal-avatar {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 2px solid var(--border-light);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-placeholder {
      font-size: 36px;
      font-weight: var(--font-weight-bold);
      color: var(--text-secondary);
    }
  }

  .hero-modal-basic {
    flex: 1;
  }

  .hero-modal-name {
    margin: 0 0 10px 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
  }

  .hero-modal-stats {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);

    .stat-item {
      padding: 4px 8px;
      background: var(--bg-secondary);
      border-radius: var(--border-radius-sm);
      border: 1px solid var(--border-light);
    }
  }

  .hero-modal-details {
    margin-bottom: 20px;

    :deep(.n-descriptions) {
      font-size: var(--font-size-sm);

      .n-descriptions-item-label {
        font-weight: var(--font-weight-medium);
        color: var(--text-primary);
      }

      .n-descriptions-item-content {
        color: var(--text-secondary);
      }
    }
  }

  .hero-modal-equipment {
    margin-top: 20px;
  }

  .section-title {
    margin: 0 0 15px 0;
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
  }

  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }

  .equipment-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .equipment-label {
    font-size: var(--font-size-sm);
    color: var(--text-primary);
    font-weight: var(--font-weight-medium);
    width: 60px;
  }

  .equipment-slots {
    display: flex;
    gap: 6px;
  }

  .equipment-slot {
    width: 20px;
    height: 20px;
    border: 1px solid var(--border-light);
    border-radius: var(--border-radius-sm);
    background: var(--bg-secondary);
  }

  .equipment-slot.red-slot {
    background: var(--error-color);
    border-color: var(--error-color);
  }

  /* 鱼灵洗练颜色块 */
  .ModalEquipment {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    margin-right: 4px;
    display: inline-block;
    vertical-align: middle;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-detail-modal {
    :deep(.n-modal-content) {
      padding: 0 !important;
    }

    .hero-modal-header {
      flex-direction: column;
      text-align: center;
    }

    .equipment-grid {
      grid-template-columns: 1fr;
    }
  }
}

/* 切磋结果显示样式 */
.fight-result {
  margin: 15px 0;
  padding: 15px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.result-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
}

.result-summary {
  display: flex;
  gap: 15px;
  font-size: var(--font-size-sm);
  flex-wrap: wrap;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-label {
  color: var(--text-secondary);
}

.summary-value {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.summary-value.win {
  color: var(--success-color);
}

.summary-value.loss {
  color: var(--error-color);
}

.result-list {
  margin-bottom: 15px;
}

.battle-result-item {
  margin-bottom: 10px;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  border-left: 4px solid var(--border-light);
  transition: all var(--transition-fast);
}

.battle-result-item.win {
  border-left-color: var(--success-color);
  background: rgba(var(--success-color-rgb), 0.03);
}

.battle-result-item.loss {
  border-left-color: var(--error-color);
  background: rgba(var(--error-color-rgb), 0.03);
}

.battle-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.battle-index {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.battle-details {
  display: flex;
  align-items: center;
  gap: 15px;
  width: 100%;
}

.battle-side {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.left-side {
  justify-content: flex-start;
}

.right-side {
  justify-content: flex-end;
}

.side-info {
  flex: 1;
  font-size: var(--font-size-sm);
  min-width: 0;
}

.side-name {
  display: block;
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-power {
  display: block;
  color: var(--text-secondary);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.side-die {
  display: block;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.battle-vs {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--text-secondary);
  margin: 0 10px;
  flex-shrink: 0;
}

.side-avatar {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .result-summary {
    gap: 10px;
  }

  .battle-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .battle-side {
    width: 100%;
  }

  .battle-vs {
    align-self: center;
    margin: 5px 0;
    transform: rotate(90deg);
  }
}

.player-heroes {
  margin-top: 20px;
}

.player-heroes h4 {
  margin: 0 0 12px 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.hero-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.hero-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  transition: all var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--primary-color);
  }
}

.hero-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.hero-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.hero-stats span {
  padding: 2px 6px;
  background: var(--bg-primary);
  border-radius: var(--border-radius-full);
  border: 1px solid var(--border-light);
}

.hero-stats span.opened {
  background: rgba(var(--success-color-rgb), 0.1);
  color: var(--success-color);
  border-color: var(--success-color);
}

.hero-stats span.closed {
  background: rgba(var(--warning-color-rgb), 0.1);
  color: var(--warning-color);
  border-color: var(--warning-color);
}

.empty-heroes {
  background: var(--bg-secondary);
  padding: 30px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-light);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.player-id {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.hero-id {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
</style>
