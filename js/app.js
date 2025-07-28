/**
 * 主应用模块 - 整合所有功能并初始化应用
 */

import * as ApiService from "./api-services.js";
import { autoDetectKeysAndUrls } from "./auto-fill.js";
import { getDefaultModel, initConfigModal } from "./config-manager.js";
import { toggleHistoryPanel, refreshHistoryPanel } from "./history-manager.js";
import { HelpSystem } from './help-system.js';
import * as logger from "./logger.js";
import {
  copySelectedModels,
  loadModelList,
  testSelectedModels,
} from "./model-manager.js";
import { saveValidKey } from "./storage-service.js";
import { getRequestUrl } from "./ui-utils.js";

// API 提供商配置
const apiProviders = [
  {
    id: 'openai',
    keyInputId: 'openaiKey',
    checkFunction: ApiService.checkOpenAIKey,
    balanceFunction: null, // 余额查询在 checkOpenAIKey 内部处理
    balanceNotSupported: false
  },
  {
    id: 'claude',
    keyInputId: 'claudeKey',
    checkFunction: ApiService.checkClaudeKey,
    balanceFunction: null,
    balanceNotSupported: true
  },
  {
    id: 'gemini',
    keyInputId: 'geminiKey',
    checkFunction: ApiService.checkGeminiKey,
    balanceFunction: null,
    balanceNotSupported: true
  },
  {
    id: 'deepseek',
    keyInputId: 'deepseekKey',
    checkFunction: ApiService.checkDeepseekKey,
    balanceFunction: ApiService.checkDeepseekBalance,
    balanceNotSupported: false
  },
  {
    id: 'groq',
    keyInputId: 'groqKey',
    checkFunction: ApiService.checkGroqKey,
    balanceFunction: null,
    balanceNotSupported: true
  },
  {
    id: 'siliconflow',
    keyInputId: 'siliconflowKey',
    checkFunction: ApiService.checkSiliconflowKey,
    balanceFunction: ApiService.checkSiliconflowBalance,
    balanceNotSupported: false
  },
  {
    id: 'xai',
    keyInputId: 'xaiKey',
    checkFunction: ApiService.checkXAIKey,
    balanceFunction: null,
    balanceNotSupported: true
  },
  {
    id: 'openrouter',
    keyInputId: 'openrouterKey',
    checkFunction: ApiService.checkOpenRouterKey,
    balanceFunction: ApiService.checkOpenRouterCredits,
    balanceNotSupported: false
  }
];

/**
 * 处理单个API提供商的密钥检查
 * @param {Object} provider - API提供商配置对象
 * @param {Array} results - 结果数组
 */
async function processApiCheck(provider, results) {
  const keyInput = document.getElementById(provider.keyInputId);
  const apiKey = keyInput?.value.trim();
  
  if (apiKey) {
    const result = await provider.checkFunction(apiKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey(provider.id, apiKey, "", getDefaultModel(provider.id));
    }
  }
}

/**
 * 处理单个API提供商的余额查询
 * @param {Object} provider - API提供商配置对象
 * @param {Array} results - 结果数组
 */
async function processBalanceCheck(provider, results) {
  const keyInput = document.getElementById(provider.keyInputId);
  const apiKey = keyInput?.value.trim();
  
  if (apiKey) {
    if (provider.balanceNotSupported) {
      results.push(`❌ ${provider.id.charAt(0).toUpperCase() + provider.id.slice(1)} 暂不支持余额查询`);
    } else if (provider.balanceFunction) {
      const result = await provider.balanceFunction(apiKey);
      results.push(result.message);
    }
  }
}

/**
 * 添加事件监听器的辅助函数
 * @param {Array} eventListeners - 事件监听器配置数组
 */
function addEventListeners(eventListeners) {
  eventListeners.forEach(({ selector, event, handler }) => {
    const element = document.getElementById(selector);
    if (element) {
      element.addEventListener(event, handler);
    }
  });
}

/**
 * 初始化应用
 */
function initApp() {
  // 初始化配置模态框
  initConfigModal();

  // 初始化帮助系统
  new HelpSystem();

  // 添加导航菜单事件监听
  initNavigation();

  // 事件监听器配置数组
  const eventListeners = [
    { selector: 'checkButton', event: 'click', handler: checkApiKeys },
    { selector: 'clearButton', event: 'click', handler: clearAllInputs },
    { selector: 'autoFillButton', event: 'click', handler: autoDetectKeysAndUrls },
    { selector: 'checkBalanceBtn', event: 'click', handler: checkBalance },
    {
      selector: 'historyButton',
      event: 'click',
      handler: () => {
        const historyDiv = document.getElementById("history");
        if (historyDiv) {
          toggleHistoryPanel(historyDiv);
        }
      }
    },
    {
      selector: 'copyModelsBtn',
      event: 'click',
      handler: () => {
        const button = document.getElementById("copyModelsBtn");
        if (button) {
          copySelectedModels(button);
        }
      }
    },
    {
      selector: 'testModelsBtn',
      event: 'click',
      handler: () => {
        const endpoint = document.getElementById("customEndpoint")?.value.trim();
        const apiKey = document.getElementById("customApiKey")?.value.trim();

        if (endpoint && apiKey) {
          testSelectedModels(endpoint, apiKey);
        } else {
          const resultDiv = document.getElementById("result");
          if (resultDiv) {
            resultDiv.innerHTML = "⚠️ 请先填写接口地址和API密钥";
          }
        }
      }
    },
    {
      selector: 'scrollTopBtn',
      event: 'click',
      handler: () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    },
    {
      selector: 'scrollBottomBtn',
      event: 'click',
      handler: () => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  ];

  // 批量添加事件监听器
  addEventListeners(eventListeners);

  // 监听自定义接口输入框变化（保留原有逻辑，因为涉及特殊的条件判断和多个事件）
  const customEndpoint = document.getElementById("customEndpoint");
  const customApiKey = document.getElementById("customApiKey");

  if (customEndpoint && customApiKey) {
    // 处理模型列表更新
    function handleModelListUpdate() {
      const endpoint = customEndpoint.value.trim();
      const apiKey = customApiKey.value.trim();

      if (endpoint && apiKey) {
        loadModelList(endpoint, apiKey);
      } else {
        const modelSelect = document.getElementById("modelSelect");
        if (modelSelect) {
          modelSelect.innerHTML =
            '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
        }
      }
    }

    customEndpoint.addEventListener("input", handleModelListUpdate);
    customApiKey.addEventListener("input", handleModelListUpdate);

    // 更新请求URL预览
    customEndpoint.addEventListener("input", () => {
      updateRequestUrlPreview(customEndpoint.value.trim());
    });
  }
}

/**
 * 显示指定的区段，并隐藏所有其他区段
 * @param {string} sectionId 要显示的区段的ID
 */
function showSection(sectionId) {
  logger.debug(`尝试显示区段: ${sectionId}`);

  // 隐藏所有区段
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  // 如果目标不是批量检测区段，则清空其结果
  if (sectionId !== "batch-check-section") {
    const batchResultsEl = document.getElementById("batchResults");
    if (batchResultsEl) {
      batchResultsEl.innerHTML = "";
      logger.debug("已清空批量检测结果");
    }
  }

  // 显示目标区段
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
    logger.debug(`已激活区段: ${sectionId}`);
  } else {
    logger.warn(`未找到目标区段: ${sectionId}`);
  }
}

/**
 * 初始化导航菜单
 */
function initNavigation() {
  logger.debug("开始初始化导航菜单");

  const navLinks = document.querySelectorAll(".nav-menu a");

  // 设置初始状态
  const initialSectionId = "custom-section";
  showSection(initialSectionId);

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${initialSectionId}`) {
      link.classList.add("active");
    }
  });

  // 添加点击事件
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);

      // 更新导航链接的激活状态
      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");

      // 显示目标区段
      showSection(targetId);
    });
  });

  logger.info("导航菜单初始化完成");
}

/**
 * 检测所有API密钥
 */
async function checkApiKeys() {
  const resultDiv = document.getElementById("result");
  if (!resultDiv) return;

  resultDiv.innerHTML = "正在检测，请稍候...";

  const results = [];

  // 使用配置数组处理所有标准API提供商
  for (const provider of apiProviders) {
    await processApiCheck(provider, results);
  }

  // 处理自定义 OpenAI 兼容接口
  const customEndpoint = document.getElementById("customEndpoint")?.value.trim();
  const customApiKey = document.getElementById("customApiKey")?.value.trim();
  
  if (customEndpoint && customApiKey) {
    const modelSelect = document.getElementById("modelSelect");
    const selectedModel = modelSelect?.value || "gpt-3.5-turbo";

    const result = await ApiService.checkCustomEndpoint(
      customEndpoint,
      customApiKey,
      selectedModel
    );
    results.push(result.message);
    if (result.success) {
      await saveValidKey("custom", customApiKey, customEndpoint, selectedModel);
    }

    // 检查是否已经显示历史记录，如果是则刷新
    await refreshHistoryPanel();
  }

  // 检查是否至少输入了一个密钥
  const allKeys = apiProviders.map(provider =>
    document.getElementById(provider.keyInputId)?.value.trim()
  ).concat([customEndpoint]);
  
  if (!allKeys.some(key => key)) {
    results.push("⚠️ 请至少输入一个 API 密钥进行检测。");
  }

  resultDiv.innerHTML = results.join("<br />");
}

/**
 * 清空所有输入
 */
function clearAllInputs() {
  // 清空所有输入框
  const openaiKeyEl = document.getElementById("openaiKey");
  if (openaiKeyEl) openaiKeyEl.value = "";

  const claudeKeyEl = document.getElementById("claudeKey");
  if (claudeKeyEl) claudeKeyEl.value = "";

  const geminiKeyEl = document.getElementById("geminiKey");
  if (geminiKeyEl) geminiKeyEl.value = "";

  const deepseekKeyEl = document.getElementById("deepseekKey");
  if (deepseekKeyEl) deepseekKeyEl.value = "";

  const groqKeyEl = document.getElementById("groqKey");
  if (groqKeyEl) groqKeyEl.value = "";

  const siliconflowKeyEl = document.getElementById("siliconflowKey");
  if (siliconflowKeyEl) siliconflowKeyEl.value = "";

  const customEndpointEl = document.getElementById("customEndpoint");
  if (customEndpointEl) customEndpointEl.value = "";

  const customApiKeyEl = document.getElementById("customApiKey");
  if (customApiKeyEl) customApiKeyEl.value = "";

  const xaiKeyEl = document.getElementById("xaiKey");
  if (xaiKeyEl) xaiKeyEl.value = "";

  const openrouterKeyEl = document.getElementById("openrouterKey");
  if (openrouterKeyEl) openrouterKeyEl.value = "";

  // 清空批量检测输入框
  const batchApiKeysEl = document.getElementById("batchApiKeys");
  if (batchApiKeysEl) batchApiKeysEl.value = "";

  // 清空结果显示区域
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.innerHTML = "";
  }

  // 清空批量检测结果区域
  const batchResultsEl = document.getElementById("batchResults");
  if (batchResultsEl) {
    batchResultsEl.innerHTML = "";
  }

  // 清空所有密钥选择区域
  document.querySelectorAll(".key-selection").forEach((el) => el.remove());

  // 清空URL选择区域
  document.querySelectorAll(".url-selection").forEach((el) => el.remove());

  // 清空模型下拉列表
  const modelSelect = document.getElementById("modelSelect");
  if (modelSelect) {
    modelSelect.innerHTML =
      '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
  }

  // 清空模型复选框区域
  const modelCheckboxes = document.getElementById("modelCheckboxes");
  if (modelCheckboxes) {
    modelCheckboxes.innerHTML = "";
  }

  // 清空url预览
  const urlPreview = document.getElementById("urlPreview");
  if (urlPreview) {
    urlPreview.textContent = "";
  }
}

/**
 * 更新请求URL预览
 * @param {string} endpoint - 接口地址
 */
function updateRequestUrlPreview(endpoint) {
  const urlPreviewDiv = document.getElementById("urlPreview");
  if (!urlPreviewDiv) return;

  if (endpoint) {
    const fullUrl = getRequestUrl(endpoint);
    urlPreviewDiv.textContent = `实际请求地址: ${fullUrl}`;
    urlPreviewDiv.style.display = "block";
  } else {
    urlPreviewDiv.style.display = "none";
  }
}

/**
 * 查询API余额
 */
async function checkBalance() {
  const results = [];

  // 使用配置数组处理所有标准API提供商
  for (const provider of apiProviders) {
    await processBalanceCheck(provider, results);
  }

  // 处理自定义 OpenAI 兼容接口的额度查询
  const customEndpoint = document.getElementById("customEndpoint")?.value.trim();
  const customApiKey = document.getElementById("customApiKey")?.value.trim();
  
  if (customEndpoint && customApiKey) {
    const result = await ApiService.checkCustomEndpointQuota(
      customEndpoint,
      customApiKey
    );
    results.push(result.message);
  }

  // 更新结果显示
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.innerHTML = results.join("<br />");
  }
}

// 当DOM加载完成后初始化应用
document.addEventListener("DOMContentLoaded", initApp);
