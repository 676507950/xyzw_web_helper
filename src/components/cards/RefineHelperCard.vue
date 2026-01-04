<template>
  <MyCard class="refine-helper" :statusClass="{ active: state.isRunning }">
    <template #icon>
      <img src="/icons/ta.png" alt="洗练图标" />
    </template>
    <template #title>
      <h3>洗练助手</h3>
      <p>装备洗练、锁定孔位、自动洗练</p>
    </template>
    <template #badge>
      <span>{{ state.isRunning ? "运行中" : "已停止" }}</span>
    </template>
    <template #default>
      <div class="refine-container">
        <!-- 工具栏 -->
        <div class="toolbar">
          <n-button type="primary" size="small" @click="refreshHeroes"
            >刷新阵容</n-button
          >
          <n-button size="small" @click="resetCount">清零</n-button>
          <div class="jade-info">
            <span>白玉: {{ jadeCount }}</span>
            <span>彩玉: {{ colorJadeCount }}</span>
          </div>
        </div>

        <!-- 武将列表 -->
        <div class="hero-list-section">
          <h4>选择武将</h4>
          <div class="hero-list">
            <div v-if="loading" class="loading">加载中...</div>
            <div v-else-if="heroes.length === 0" class="empty">
              暂无武将数据
            </div>
            <div
              v-for="hero in heroes"
              :key="hero.id"
              class="hero-item"
              :class="{ active: selectedHeroId === hero.id }"
              @click="selectHero(hero.id)"
            >
              {{ hero.name }} Lv.{{ hero.level }}
            </div>
          </div>
        </div>

        <!-- 装备列表 -->
        <div v-if="selectedHeroId" class="equip-section">
          <h4>选择装备</h4>
          <div class="equip-tabs">
            <div
              v-for="part in equipParts"
              :key="part.id"
              class="equip-tab"
              :class="{ active: selectedPart === part.id }"
              @click="selectPart(part.id)"
            >
              <div class="tab-name">{{ part.name }}</div>
              <div class="tab-level">Lv.{{ part.level }}</div>
            </div>
          </div>
        </div>

        <!-- 洗练详情 -->
        <div v-if="selectedPart" class="refine-detail">
          <!-- 洗练统计 -->
          <div class="stats">
            <div class="stat-item">
              <span class="stat-label">淬炼次数</span>
              <span class="stat-value">{{ quenchTimes }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ equipBonusName }}</span>
              <span class="stat-value">+{{ equipBonusValue }}</span>
            </div>
          </div>

          <!-- 洗练孔位 -->
          <div class="slots-section">
            <h4>孔位锁定</h4>
            <div class="slots">
              <div
                v-for="slot in slots"
                :key="slot.id"
                class="slot"
                :class="{ locked: slot.isLocked }"
              >
                <n-checkbox
                  v-model:checked="slot.isLocked"
                  @change="handleSlotLock(slot.id, slot.isLocked)"
                ></n-checkbox>
                <span class="slot-label">孔{{ slot.id }}</span>
                <div v-if="slot.attrId" class="slot-attr">
                  <span>{{ getAttrName(slot.attrId) }}</span>
                  <span>+{{ slot.attrNum }}</span>
                </div>
                <div v-else class="slot-empty">未淬炼</div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="actions">
            <n-button
              type="primary"
              size="small"
              :disabled="state.isRunning"
              @click="quenchOnce"
            >
              淬炼一次
            </n-button>
            <n-button
              type="success"
              size="small"
              :disabled="state.isRunning"
              @click="quenchContinuous"
            >
              连续淬炼
            </n-button>
            <n-button
              type="warning"
              size="small"
              :disabled="state.isRunning"
              @click="startAutoQuench"
            >
              自动淬炼
            </n-button>
            <n-button
              type="error"
              size="small"
              :disabled="!state.isRunning"
              @click="stopQuench"
            >
              停止
            </n-button>
            <div class="count-info">
              已淬炼: <strong>{{ quenchCount }}</strong>
            </div>
          </div>

          <!-- 自动淬炼设置 -->
          <div class="auto-section">
            <h4>自动淬炼设置</h4>
            <div class="auto-form">
              <div class="form-item">
                <span class="form-label">属性</span>
                <n-select
                  v-model:value="targetAttrId"
                  :options="attrOptions"
                  placeholder="选择属性"
                  size="small"
                  style="width: 120px"
                ></n-select>
              </div>
              <div class="form-item">
                <span class="form-label">≥</span>
                <n-input-number
                  v-model:value="targetAttrValue"
                  :min="1"
                  :max="100"
                  size="small"
                  style="width: 80px"
                ></n-input-number>
              </div>
              <div class="form-item">
                <span class="form-label">延迟(ms)</span>
                <n-input-number
                  v-model:value="delay"
                  :min="0"
                  :step="100"
                  size="small"
                  style="width: 100px"
                ></n-input-number>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </MyCard>
</template>

<script setup>
import { ref, computed } from "vue";
import { useMessage } from "naive-ui";
import { useTokenStore } from "@/stores/tokenStore";
import MyCard from "../Common/MyCard.vue";

const tokenStore = useTokenStore();
const message = useMessage();

// 响应式数据
const loading = ref(false);
const heroes = ref([]);
const selectedHeroId = ref(null);
const selectedPart = ref(null);
const quenchCount = ref(0);
const delay = ref(350);
const targetAttrId = ref(null);
const targetAttrValue = ref(null);
const jadeCount = ref(0);
const colorJadeCount = ref(0);

// 状态
const state = ref({
  isRunning: false,
  continuousQuenching: false,
  autoQuenching: false,
  stopRequested: false,
});

// WebSocket相关
let continuousTimer = null;
let autoTimer = null;

// 属性映射
const attrMap = {
  1: "攻击",
  2: "血量",
  3: "防御",
  4: "速度",
  5: "破甲",
  6: "破甲抵抗",
  7: "精准",
  8: "格挡",
  9: "减伤",
  10: "暴击",
  11: "暴击抵抗",
  12: "爆伤",
  13: "爆伤抵抗",
  14: "技能伤害",
  15: "免控",
  16: "眩晕免疫",
  17: "冰冻免疫",
  18: "沉默免疫",
  19: "流血免疫",
  20: "中毒免疫",
  21: "灼烧免疫",
};

// 装备部位映射
const partMap = {
  1: "武器",
  2: "铠甲",
  3: "头冠",
  4: "坐骑",
};

// 英雄数据
const allHeroesData = ref({});
const heroEquipment = ref({});
const slots = ref([]);
const quenchTimes = ref(0);
const equipBonusName = ref("攻击");
const equipBonusValue = ref(0);

// 属性选项
const attrOptions = computed(() => {
  return Object.entries(attrMap).map(([id, name]) => ({
    label: name,
    value: Number(id),
  }));
});

// 装备部位列表
const equipParts = computed(() => {
  if (!heroEquipment.value) return [];
  return Object.entries(heroEquipment.value).map(([id, equip]) => ({
    id: Number(id),
    name: partMap[Number(id)] || `装备${id}`,
    level: equip?.level || 1,
  }));
});

// 刷新阵容
const refreshHeroes = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法刷新阵容");
    return;
  }

  loading.value = true;
  try {
    // 获取预设队伍信息和角色信息
    const [presetTeamInfo, roleInfo] = await Promise.all([
      tokenStore.sendMessageWithPromise(tokenId, "presetteam_getinfo", {}),
      tokenStore.sendMessageWithPromise(tokenId, "role_getroleinfo", {}),
    ]);

    // 解析队伍数据
    const teamData = parseTeamData(presetTeamInfo);
    const role = roleInfo?.role || roleInfo;
    const heroData = role?.heroes || {};
    const items = role?.items || {};

    // 更新白玉和彩玉数量
    jadeCount.value = items["1022"]?.quantity || 0;
    colorJadeCount.value = items["1023"]?.quantity || 0;

    // 构建英雄列表
    const heroList = buildHeroList(teamData, heroData);
    heroes.value = heroList;
    allHeroesData.value = heroData;

    message.success("阵容刷新成功");
  } catch (error) {
    message.error(`刷新阵容失败: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 解析队伍数据
const parseTeamData = (presetTeamInfo) => {
  if (!presetTeamInfo) {
    return { useTeamId: 1, teams: {} };
  }

  const data = presetTeamInfo.presetTeamInfo || presetTeamInfo;
  const useTeamId = data.useTeamId || 1;
  const teams = {};

  // 获取所有数字键对应的队伍
  const teamKeys = Object.keys(data).filter((key) => /^\d+$/.test(key));

  for (const key of teamKeys) {
    const teamId = Number(key);
    const team = data[key];
    if (!team) {
      teams[teamId] = { teamInfo: {} };
      continue;
    }

    if (team.teamInfo) {
      teams[teamId] = { teamInfo: team.teamInfo };
    } else if (team.heroes) {
      // 将数组转换为对象
      const teamInfo = {};
      team.heroes.forEach((hero, index) => {
        teamInfo[String(index + 1)] = hero;
      });
      teams[teamId] = { teamInfo };
    } else if (typeof team === "object") {
      const hasHeroes = Object.values(team).some(
        (item) => item && typeof item === "object" && "heroId" in item,
      );
      teams[teamId] = { teamInfo: hasHeroes ? team : {} };
    } else {
      teams[teamId] = { teamInfo: {} };
    }
  }

  return { useTeamId, teams };
};

// 构建英雄列表
const buildHeroList = (teamData, heroData) => {
  const { useTeamId, teams } = teamData;
  const currentTeam = teams[useTeamId] || { teamInfo: {} };
  const teamInfo = currentTeam.teamInfo;

  const heroList = [];

  // 从当前队伍中获取英雄
  for (const [position, hero] of Object.entries(teamInfo)) {
    const heroId = hero?.heroId || hero?.id;
    if (!heroId) continue;

    const heroDetail = heroData[String(heroId)] || {};
    heroList.push({
      id: heroId,
      name: getHeroName(heroId),
      position: Number(position),
      level: hero?.level || heroDetail?.level || 1,
      equipment: heroDetail?.equipment || {},
    });
  }

  // 如果队伍中没有英雄，从所有英雄中获取
  if (heroList.length === 0 && Object.keys(heroData).length > 0) {
    for (const [id, hero] of Object.entries(heroData)) {
      if (hero && hero.equipment) {
        heroList.push({
          id: Number(id),
          name: getHeroName(Number(id)),
          position: heroList.length + 1,
          level: hero?.level || 1,
          equipment: hero?.equipment || {},
        });
        if (heroList.length >= 5) break;
      }
    }
  }

  // 按位置排序
  return heroList.sort((a, b) => a.position - b.position);
};

// 获取英雄名称
const heroNameMap = {
  101: "司马懿",
  102: "郭嘉",
  103: "关羽",
  104: "诸葛亮",
  105: "周瑜",
  106: "太史慈",
  107: "吕布",
  108: "华佗",
  109: "甄姬",
  110: "黄月英",
  111: "孙策",
  112: "贾诩",
  113: "曹仁",
  114: "姜维",
  115: "孙坚",
  116: "公孙瓒",
  117: "典韦",
  118: "赵云",
  119: "大乔",
  120: "张角",
  201: "徐晃",
  202: "荀彧",
  203: "小典韦",
  204: "张飞",
  205: "小赵云",
  206: "庞统",
  207: "鲁肃",
  208: "陆逊",
  209: "甘宁",
  210: "貂蝉",
  211: "董卓",
  212: "小张角",
  213: "张辽",
  214: "夏侯惇",
  215: "许褚",
  216: "夏侯渊",
  217: "魏延",
  218: "黄忠",
  219: "马超",
  220: "马岱",
  221: "吕蒙",
  222: "黄盖",
  223: "蔡文姬",
  224: "小乔",
  225: "袁绍",
  226: "华雄",
  227: "颜良",
  228: "文丑",
  301: "周泰",
  302: "许攸",
  303: "于禁",
  304: "张星彩",
  305: "关银屏",
  306: "关平",
  307: "程普",
  308: "张昭",
  309: "陆绩",
  310: "吕玲绮",
  311: "潘凤",
  312: "邢道荣",
  313: "祝融夫人",
  314: "孟获",
};

const getHeroName = (heroId) => {
  return heroNameMap[heroId] || `武将${heroId}`;
};

// 选择英雄
const selectHero = (heroId) => {
  selectedHeroId.value = heroId;
  selectedPart.value = null;
  quenchCount.value = 0;

  // 获取英雄装备
  const heroDetail = allHeroesData.value[String(heroId)] || {};
  heroEquipment.value = heroDetail?.equipment || {};
};

// 选择装备部位
const selectPart = (partId) => {
  selectedPart.value = partId;
  quenchCount.value = 0;

  // 获取装备详情
  const equip = heroEquipment.value[partId];
  if (equip) {
    // 更新洗练次数和加成
    quenchTimes.value = equip.quenchTimes || 0;

    // 根据部位类型更新加成名称
    const bonusType =
      partId === 1
        ? "quenchAttackExt"
        : partId === 3
          ? "quenchDefenseExt"
          : "quenchHpExt";
    equipBonusName.value =
      partId === 1 ? "攻击" : partId === 3 ? "防御" : "血量";
    equipBonusValue.value = equip[bonusType] || 0;

    // 更新孔位信息
    updateSlots(equip.quenches || {});
  } else {
    quenchTimes.value = 0;
    equipBonusValue.value = 0;
    slots.value = [];
  }
};

// 更新孔位信息
const updateSlots = (quenches) => {
  const slotList = [];
  const slotKeys = Object.keys(quenches).sort((a, b) => Number(a) - Number(b));

  for (const key of slotKeys) {
    const slotId = Number(key);
    const slot = quenches[key];
    slotList.push({
      id: slotId,
      attrId: slot.attrId || null,
      attrNum: slot.attrNum || 0,
      isLocked: slot.isLocked || slot.locked || false,
    });
  }

  slots.value = slotList;
};

// 获取属性名称
const getAttrName = (attrId) => {
  return attrMap[attrId] || `属性${attrId}`;
};

// 处理孔位锁定
const handleSlotLock = async (slotId, isLocked) => {
  const token = tokenStore.selectedToken;
  if (!token || !selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备");
    return;
  }

  const tokenId = token.id;
  try {
    await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_updatequenchlock",
      {
        heroId: selectedHeroId.value,
        part: selectedPart.value,
        slot: slotId,
        isLocked,
      },
    );

    // 更新孔位状态
    const slot = slots.value.find((s) => s.id === slotId);
    if (slot) {
      slot.isLocked = isLocked;
    }

    message.success(isLocked ? "孔位已锁定" : "孔位已解锁");
  } catch (error) {
    message.error(`锁定孔位失败: ${error.message}`);
  }
};

// 淬炼一次
const quenchOnce = async () => {
  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  await executeQuench();
};

// 连续淬炼
const quenchContinuous = () => {
  if (state.value.continuousQuenching) return;

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  state.value.continuousQuenching = true;
  state.value.isRunning = true;
  message.info("开始连续淬炼，出现橙色或红色属性时自动暂停");

  const continuousQuench = async () => {
    if (!state.value.continuousQuenching) return;

    try {
      const result = await executeQuench();
      if (result && checkHighQualityAttr(result)) {
        message.success("发现橙色或红色属性，已自动暂停");
        stopQuench();
        return;
      }

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      continuousTimer = setTimeout(continuousQuench, randomDelay);
    } catch (error) {
      message.error(`连续淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  continuousQuench();
};

// 自动淬炼
const startAutoQuench = () => {
  if (!targetAttrId.value || !targetAttrValue.value) {
    message.warning("请设置目标属性和数值");
    return;
  }

  if (!selectedHeroId.value || !selectedPart.value) {
    message.warning("请先选择武将和装备部位");
    return;
  }

  state.value.autoQuenching = true;
  state.value.isRunning = true;
  message.info(
    `开始自动淬炼，目标：${getAttrName(targetAttrId.value)} ≥ ${targetAttrValue.value}`,
  );

  const autoQuench = async () => {
    if (!state.value.autoQuenching) return;

    try {
      const result = await executeQuench();
      if (result && checkTargetAttr(result)) {
        message.success(
          `已达到目标：${getAttrName(targetAttrId.value)} ≥ ${targetAttrValue.value}`,
        );
        stopQuench();
        return;
      }

      // 随机延迟
      const randomDelay = Math.floor(Math.random() * 150) + delay.value;
      autoTimer = setTimeout(autoQuench, randomDelay);
    } catch (error) {
      message.error(`自动淬炼失败: ${error.message}`);
      stopQuench();
    }
  };

  autoQuench();
};

// 执行淬炼
const executeQuench = async () => {
  const token = tokenStore.selectedToken;
  if (!token) {
    message.warning("请先选择Token");
    return null;
  }

  const tokenId = token.id;
  const status = tokenStore.getWebSocketStatus(tokenId);
  if (status !== "connected") {
    message.error("WebSocket未连接，无法执行淬炼");
    return null;
  }

  // 检查武器等级（如果是武器）
  if (selectedPart.value === 1) {
    const equip = heroEquipment.value[selectedPart.value];
    if (equip?.level < 4000) {
      message.warning(
        `武器等级不足，需要4000级以上（当前${equip?.level || 0}级）`,
      );
      return null;
    }
  }

  try {
    // 获取当前锁定的孔位
    const lockedSlots = slots.value
      .filter((slot) => slot.isLocked)
      .map((slot) => slot.id);

    // 发送淬炼请求（设置更长的超时时间，淬炼操作可能较慢）
    const result = await tokenStore.sendMessageWithPromise(
      tokenId,
      "equipment_quench",
      {
        heroId: selectedHeroId.value,
        part: selectedPart.value,
        lockedSlot: lockedSlots,
      },
      15000,
    );

    // 更新淬炼次数
    quenchCount.value++;

    // 更新装备信息
    if (result?.role?.heroes) {
      const updatedHero = result.role.heroes[String(selectedHeroId.value)];
      if (updatedHero?.equipment) {
        // 更新英雄装备数据
        const updatedEquip = updatedHero.equipment[selectedPart.value];
        if (updatedEquip) {
          // 更新装备对象
          heroEquipment.value[selectedPart.value] = updatedEquip;

          // 更新淬炼次数和加成
          quenchTimes.value = updatedEquip.quenchTimes || 0;
          const bonusType =
            selectedPart.value === 1
              ? "quenchAttackExt"
              : selectedPart === 3
                ? "quenchDefenseExt"
                : "quenchHpExt";
          equipBonusValue.value = updatedEquip[bonusType] || 0;

          // 更新孔位信息
          if (updatedEquip.quenches) {
            updateSlots(updatedEquip.quenches);
          }
        }
      }
    }

    // 更新白玉和彩玉数量
    if (result?.role?.items) {
      const items = result.role.items;
      jadeCount.value = items["1022"]?.quantity || jadeCount.value;
      colorJadeCount.value = items["1023"]?.quantity || colorJadeCount.value;
    }

    return result;
  } catch (error) {
    message.error(`淬炼失败: ${error.message}`);
    return null;
  }
};

// 检查高品质属性（橙色或红色）
const checkHighQualityAttr = (result) => {
  if (!result?.role?.heroes) return false;

  const hero = result.role.heroes[String(selectedHeroId.value)];
  if (!hero?.equipment) return false;

  const equip = hero.equipment[String(selectedPart.value)];
  if (!equip?.quenches) return false;

  // 检查是否有高品质属性（colorId >= 5）
  for (const slot of Object.values(equip.quenches)) {
    if (slot.colorId && slot.colorId >= 5) {
      return true;
    }
  }

  return false;
};

// 检查目标属性
const checkTargetAttr = (result) => {
  if (!result?.role?.heroes || !targetAttrId.value || !targetAttrValue.value)
    return false;

  const hero = result.role.heroes[String(selectedHeroId.value)];
  if (!hero?.equipment) return false;

  const equip = hero.equipment[String(selectedPart.value)];
  if (!equip?.quenches) return false;

  // 检查是否达到目标属性
  for (const slot of Object.values(equip.quenches)) {
    if (
      slot.attrId === targetAttrId.value &&
      slot.attrNum >= targetAttrValue.value
    ) {
      return true;
    }
  }

  return false;
};

// 停止淬炼
const stopQuench = () => {
  state.value.continuousQuenching = false;
  state.value.autoQuenching = false;
  state.value.isRunning = false;

  if (continuousTimer) {
    clearTimeout(continuousTimer);
    continuousTimer = null;
  }

  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }

  message.success("淬炼已停止");
};

// 重置淬炼次数
const resetCount = () => {
  quenchCount.value = 0;
  message.success("已清零");
};
</script>

<style scoped lang="scss">
.refine-container {
  padding: var(--spacing-sm);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.jade-info {
  margin-left: auto;
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.hero-list-section,
.equip-section {
  margin-bottom: var(--spacing-md);
}

h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.hero-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  max-height: 100px;
  overflow-y: auto;
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.hero-item {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-primary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all 0.2s;
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.hero-item:hover {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
}

.hero-item.active {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
  color: var(--primary-color);
}

.loading,
.empty {
  padding: var(--spacing-md);
  color: var(--text-secondary);
  text-align: center;
  font-size: var(--font-size-sm);
}

.equip-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.equip-tab {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border: 2px solid transparent;
  border-radius: var(--border-radius-medium);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
}

.equip-tab:hover {
  border-color: var(--border-light);
}

.equip-tab.active {
  border-color: var(--primary-color);
  background: var(--primary-color-light);
}

.tab-name {
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--text-primary);
}

.tab-level {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-top: var(--spacing-xs);
}

.stats {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  margin-bottom: var(--spacing-md);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.stat-value {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-md);
  color: var(--primary-color);
}

.slots-section {
  margin-bottom: var(--spacing-md);
}

.slots {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.slot {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
  border-left: 4px solid var(--border-light);
  transition: all 0.2s;
}

.slot:hover {
  background: var(--bg-secondary);
}

.slot.locked {
  border-left-color: var(--primary-color);
  background: var(--primary-color-light);
}

.slot-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  min-width: 40px;
  font-weight: var(--font-weight-medium);
}

.slot-attr {
  flex: 1;
  display: flex;
  justify-content: space-between;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
}

.slot-empty {
  flex: 1;
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.count-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.count-info strong {
  color: var(--primary-color);
  font-size: var(--font-size-md);
}

.auto-section {
  padding: var(--spacing-sm);
  background: var(--bg-tertiary);
  border-radius: var(--border-radius-medium);
}

.auto-form {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.form-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}
</style>
