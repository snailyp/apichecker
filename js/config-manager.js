/**
 * 配置管理模块 - 处理默认测试模型的配置
 */

import { showNotification } from './ui-utils.js';
import * as logger from './logger.js';

// 默认模型配置
const DEFAULT_MODELS = {
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  siliconflow: 'Qwen/Qwen2.5-72B-Instruct',
  xai: 'grok-3-mini',
  openrouter: 'openrouter/auto'
};

// 配置存储键名
const CONFIG_STORAGE_KEY = 'apiChecker_defaultModels';

/**
 * 获取默认模型配置
 * @returns {Object} 模型配置对象
 */
export function getDefaultModels() {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // 合并默认配置和存储的配置，确保新增的厂商有默认值
      return { ...DEFAULT_MODELS, ...config };
    }
  } catch (error) {
    logger.error('读取模型配置失败', error);
  }
  return { ...DEFAULT_MODELS };
}

/**
 * 保存默认模型配置
 * @param {Object} config - 模型配置对象
 * @returns {boolean} 是否保存成功
 */
export function saveDefaultModels(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    logger.info('模型配置已保存', config);
    return true;
  } catch (error) {
    logger.error('保存模型配置失败', error);
    return false;
  }
}

/**
 * 重置为默认配置
 * @returns {boolean} 是否重置成功
 */
export function resetToDefaultModels() {
  try {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    logger.info('模型配置已重置为默认值');
    return true;
  } catch (error) {
    logger.error('重置模型配置失败', error);
    return false;
  }
}

/**
 * 获取指定厂商的默认模型
 * @param {string} provider - 厂商名称
 * @returns {string} 默认模型名称
 */
export function getDefaultModel(provider) {
  const config = getDefaultModels();
  return config[provider] || DEFAULT_MODELS[provider] || 'gpt-3.5-turbo';
}

/**
 * 初始化配置模态框
 */
export function initConfigModal() {
  const modal = document.getElementById('configModal');
  const configBtn = document.getElementById('configButton');
  const closeBtn = modal.querySelector('.close');
  const saveBtn = document.getElementById('saveConfigBtn');
  const resetBtn = document.getElementById('resetConfigBtn');

  // 打开模态框
  configBtn.addEventListener('click', () => {
    loadConfigToModal();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
  });

  // 关闭模态框
  const closeModal = () => {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  };

  closeBtn.addEventListener('click', closeModal);

  // 点击模态框外部关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC键关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'block') {
      closeModal();
    }
  });

  // 保存配置
  saveBtn.addEventListener('click', () => {
    if (saveConfigFromModal()) {
      showNotification('配置保存成功！', 'success');
      closeModal();
    } else {
      showNotification('配置保存失败！', 'error');
    }
  });

  // 添加下拉框变化监听，控制自定义输入框显示
  Object.keys(DEFAULT_MODELS).forEach(provider => {
    const select = document.getElementById(`${provider}Model`);
    const customInput = document.getElementById(`${provider}ModelCustom`);
    
    if (select && customInput) {
      select.addEventListener('change', () => {
        if (select.value === 'custom') {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
        }
      });
    }
  });

  // 重置配置
  resetBtn.addEventListener('click', () => {
    if (confirm('确定要重置为默认配置吗？')) {
      if (resetToDefaultModels()) {
        loadConfigToModal(); // 重新加载默认配置到界面
        showNotification('配置已重置为默认值！', 'success');
      } else {
        showNotification('重置配置失败！', 'error');
      }
    }
  });
}

/**
 * 将配置加载到模态框
 */
function loadConfigToModal() {
  const config = getDefaultModels();
  
  Object.keys(config).forEach(provider => {
    const select = document.getElementById(`${provider}Model`);
    const customInput = document.getElementById(`${provider}ModelCustom`);
    
    if (select && customInput) {
      const modelValue = config[provider];
      
      // 检查是否是预设选项
      const isPresetOption = Array.from(select.options).some(option =>
        option.value === modelValue && option.value !== 'custom'
      );
      
      if (isPresetOption) {
        select.value = modelValue;
        customInput.style.display = 'none';
      } else {
        // 自定义模型
        select.value = 'custom';
        customInput.value = modelValue;
        customInput.style.display = 'block';
      }
    }
  });
}

/**
 * 从模态框保存配置
 * @returns {boolean} 是否保存成功
 */
function saveConfigFromModal() {
  const config = {};
  
  // 收集所有厂商的配置
  Object.keys(DEFAULT_MODELS).forEach(provider => {
    const select = document.getElementById(`${provider}Model`);
    const customInput = document.getElementById(`${provider}ModelCustom`);
    
    if (select) {
      if (select.value === 'custom' && customInput) {
        const customValue = customInput.value.trim();
        if (customValue) {
          config[provider] = customValue;
        } else {
          // 如果自定义输入为空，使用默认值
          config[provider] = DEFAULT_MODELS[provider];
        }
      } else {
        config[provider] = select.value;
      }
    }
  });

  return saveDefaultModels(config);
}

/**
 * 导出配置到文件
 */
export function exportConfig() {
  try {
    const config = getDefaultModels();
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'api-checker-config.json';
    link.click();
    
    showNotification('配置导出成功！', 'success');
  } catch (error) {
    logger.error('导出配置失败', error);
    showNotification('配置导出失败！', 'error');
  }
}

/**
 * 从文件导入配置
 * @param {File} file - 配置文件
 */
export function importConfig(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        
        // 验证配置格式
        if (typeof config === 'object' && config !== null) {
          // 只保留有效的厂商配置
          const validConfig = {};
          Object.keys(DEFAULT_MODELS).forEach(provider => {
            if (config[provider]) {
              validConfig[provider] = config[provider];
            }
          });
          
          if (saveDefaultModels(validConfig)) {
            showNotification('配置导入成功！', 'success');
            resolve(validConfig);
          } else {
            throw new Error('保存配置失败');
          }
        } else {
          throw new Error('配置文件格式无效');
        }
      } catch (error) {
        logger.error('导入配置失败', error);
        showNotification('配置导入失败：' + error.message, 'error');
        reject(error);
      }
    };
    
    reader.onerror = () => {
      const error = new Error('读取文件失败');
      logger.error('读取配置文件失败', error);
      showNotification('读取配置文件失败！', 'error');
      reject(error);
    };
    
    reader.readAsText(file);
  });
}