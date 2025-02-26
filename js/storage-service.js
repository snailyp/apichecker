/**
 * 存储服务模块 - 处理历史记录和密钥存储
 */

import * as logger from './logger.js';

/**
 * 保存有效的API密钥到历史记录
 * @param {string} platform - 平台名称
 * @param {string} key - API密钥
 * @param {string} endpoint - 接口地址（可选）
 * @returns {Promise<void>}
 */
export async function saveValidKey(platform, key, endpoint = "") {
  try {
    const history = (await chrome.storage.local.get("validKeys")) || { validKeys: [] };
    const validKeys = history.validKeys || [];

    // 检查是否已存在相同的key
    const existingIndex = validKeys.findIndex((item) => item.key === key);

    const newEntry = {
      platform,
      key,
      endpoint,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // 更新现有记录的时间戳
      validKeys[existingIndex].timestamp = newEntry.timestamp;
    } else {
      // 添加新记录
      validKeys.push(newEntry);
    }

    // 按时间戳降序排序
    validKeys.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 限制历史记录数量为500条
    const trimmedKeys = validKeys.slice(0, 500);

    await chrome.storage.local.set({ validKeys: trimmedKeys });

    logger.info('保存API密钥', { platform, endpoint });
  } catch (error) {
    logger.error('保存历史记录失败', error);
  }
}

/**
 * 获取所有历史记录
 * @returns {Promise<Array>} - 历史记录数组
 */
export async function getHistoryKeys() {
  try {
    const history = await chrome.storage.local.get("validKeys");
    logger.debug('获取历史记录');
    return history.validKeys || [];
  } catch (error) {
    logger.error('获取历史记录失败', error);
    return [];
  }
}

/**
 * 删除指定索引的历史记录
 * @param {number} index - 要删除的记录索引
 * @returns {Promise<boolean>} - 是否删除成功
 */
export async function deleteHistoryKey(index) {
  try {
    const history = await chrome.storage.local.get("validKeys");
    const validKeys = history.validKeys || [];
    
    if (index >= 0 && index < validKeys.length) {
      validKeys.splice(index, 1);
      await chrome.storage.local.set({ validKeys });
      return true;
    }
    return false;
  } catch (error) {
    logger.error("删除历史记录失败:", error);
    return false;
  }
}

/**
 * 清空所有历史记录
 * @returns {Promise<boolean>} - 是否清空成功
 */
export async function clearAllHistory() {
  try {
    await chrome.storage.local.set({ validKeys: [] });
    return true;
  } catch (error) {
    logger.error("清空历史记录失败:", error);
    return false;
  }
}

/**
 * 根据平台和接口地址筛选历史记录
 * @param {Array} keys - 历史记录数组
 * @param {string} endpoint - 接口地址筛选条件
 * @param {string} platform - 平台筛选条件
 * @returns {Array} - 筛选后的历史记录
 */
export function filterKeys(keys, endpoint, platform) {
  return keys.filter((key) => {
    const endpointMatch = !endpoint || key.endpoint === endpoint;
    const platformMatch = !platform || key.platform === platform;
    return endpointMatch && platformMatch;
  });
}

/**
 * 平台名称映射
 */
export const PLATFORM_NAMES = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  deepseek: "Deepseek",
  groq: "Groq",
  siliconflow: "Siliconflow",
  xai: "xAI",
  custom: "自定义接口",
};
