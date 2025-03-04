/**
 * 配置服务模块 - 处理系统配置的保存和检索
 */

import * as logger from './logger.js';

// 默认配置
const DEFAULT_CONFIG = {
  // 默认测试模型
  defaultModels: {
    openai: 'gpt-4o',
    claude: 'claude-3-5-sonnet-20241022',
    gemini: 'gemini-1.5-flash',
    deepseek: 'deepseek-chat',
    groq: 'mixtral-8x7b-32768',
    siliconflow: 'Qwen/Qwen2.5-72B-Instruct',
    xai: 'grok-beta'
  },
  // NewAPI 系统访问地址
  newAPIUrl: '',
  // NewAPI 系统访问令牌
  newAPIToken: ''
};

/**
 * 保存配置到本地存储
 * @param {Object} config - 配置对象
 * @returns {Promise<boolean>} - 是否保存成功
 */
export async function saveConfig(config) {
  try {
    await chrome.storage.local.set({ appConfig: config });
    logger.info('保存配置成功');
    return true;
  } catch (error) {
    logger.error('保存配置失败', error);
    return false;
  }
}

/**
 * 获取配置
 * @returns {Promise<Object>} - 配置对象
 */
export async function getConfig() {
  try {
    const result = await chrome.storage.local.get('appConfig');
    if (result.appConfig) {
      logger.debug('获取配置成功');
      return result.appConfig;
    }
    // 如果没有保存过配置，返回默认配置
    logger.debug('使用默认配置');
    return DEFAULT_CONFIG;
  } catch (error) {
    logger.error('获取配置失败', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 重置配置为默认值
 * @returns {Promise<boolean>} - 是否重置成功
 */
export async function resetConfig() {
  try {
    await chrome.storage.local.set({ appConfig: DEFAULT_CONFIG });
    logger.info('重置配置成功');
    return true;
  } catch (error) {
    logger.error('重置配置失败', error);
    return false;
  }
}

/**
 * 获取特定平台的默认测试模型
 * @param {string} platform - 平台名称
 * @returns {Promise<string>} - 默认测试模型
 */
export async function getDefaultModel(platform) {
  try {
    const config = await getConfig();
    return config.defaultModels[platform] || DEFAULT_CONFIG.defaultModels[platform];
  } catch (error) {
    logger.error(`获取${platform}默认模型失败`, error);
    return DEFAULT_CONFIG.defaultModels[platform];
  }
}

/**
 * 获取NewAPI系统访问令牌
 * @returns {Promise<string>} - NewAPI系统访问令牌
 */
export async function getNewAPIToken() {
  try {
    const config = await getConfig();
    return config.newAPIToken || '';
  } catch (error) {
    logger.error('获取NewAPI系统访问令牌失败', error);
    return '';
  }
}

/**
 * 获取NewAPI系统访问地址
 * @returns {Promise<string>} - NewAPI系统访问地址
 */
export async function getNewAPIUrl() {
    try {
      const config = await getConfig();
      return config.newAPIUrl || '';
    } catch (error) {
      logger.error('获取NewAPI系统访问地址失败', error);
      return '';
    }
  }
