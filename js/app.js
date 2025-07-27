/**
 * 主应用模块 - 整合所有功能并初始化应用
 */

import * as ApiService from "./api-services.js";
import { autoDetectKeysAndUrls } from "./auto-fill.js";
import { initConfigModal } from "./config-manager.js";
import { toggleHistoryPanel } from "./history-manager.js";
import * as logger from "./logger.js";
import {
  copySelectedModels,
  loadModelList,
  testSelectedModels,
} from "./model-manager.js";
import { saveValidKey } from "./storage-service.js";
import { getRequestUrl } from "./ui-utils.js";

/**
 * 初始化应用
 */
function initApp() {
  // 初始化配置模态框
  initConfigModal();

  // 添加导航菜单事件监听
  initNavigation();

  // 添加检测按钮事件监听
  document
    .getElementById("checkButton")
    ?.addEventListener("click", checkApiKeys);

  // 添加清空按钮事件监听
  document
    .getElementById("clearButton")
    ?.addEventListener("click", clearAllInputs);

  // 添加自动填充按钮事件监听
  document
    .getElementById("autoFillButton")
    ?.addEventListener("click", autoDetectKeysAndUrls);

  // 添加历史记录按钮事件监听
  document.getElementById("historyButton")?.addEventListener("click", () => {
    const historyDiv = document.getElementById("history");
    if (historyDiv) {
      toggleHistoryPanel(historyDiv);
    }
  });

  // 添加余额查询按钮事件监听
  document
    .getElementById("checkBalanceBtn")
    ?.addEventListener("click", checkBalance);

  // 添加复制模型按钮事件监听
  document.getElementById("copyModelsBtn")?.addEventListener("click", () => {
    const button = document.getElementById("copyModelsBtn");
    if (button) {
      copySelectedModels(button);
    }
  });

  // 添加测试模型按钮事件监听
  document.getElementById("testModelsBtn")?.addEventListener("click", () => {
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
  });

  // 添加滚动按钮事件监听
  document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  document.getElementById("scrollBottomBtn")?.addEventListener("click", () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  });

  // 监听自定义接口输入框变化
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
  const openaiKey = document.getElementById("openaiKey")?.value.trim();
  const claudeKey = document.getElementById("claudeKey")?.value.trim();
  const geminiKey = document.getElementById("geminiKey")?.value.trim();
  const deepseekKey = document.getElementById("deepseekKey")?.value.trim();
  const groqKey = document.getElementById("groqKey")?.value.trim();
  const siliconflowKey = document.getElementById("siliconflowKey")?.value.trim();
  const xaiKey = document.getElementById("xaiKey")?.value.trim();
  const openrouterKey = document.getElementById("openrouterKey")?.value.trim();
  const customEndpoint = document.getElementById("customEndpoint")?.value.trim();
  const customApiKey = document.getElementById("customApiKey")?.value.trim();

  const resultDiv = document.getElementById("result");
  if (!resultDiv) return;

  resultDiv.innerHTML = "正在检测，请稍候...";

  const results = [];

  // 检测 OpenAI API 密钥
  if (openaiKey) {
    const result = await ApiService.checkOpenAIKey(openaiKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("openai", openaiKey);
    }
  }

  // 检测 Claude API 密钥
  if (claudeKey) {
    const result = await ApiService.checkClaudeKey(claudeKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("claude", claudeKey);
    }
  }

  // 检测 Gemini API 密钥
  if (geminiKey) {
    const result = await ApiService.checkGeminiKey(geminiKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("gemini", geminiKey);
    }
  }

  // 检测 Deepseek API 密钥
  if (deepseekKey) {
    const result = await ApiService.checkDeepseekKey(deepseekKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("deepseek", deepseekKey);
    }
  }

  // 检测 Groq API 密钥
  if (groqKey) {
    const result = await ApiService.checkGroqKey(groqKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("groq", groqKey);
    }
  }

  // 检测 Siliconflow API 密钥
  if (siliconflowKey) {
    const result = await ApiService.checkSiliconflowKey(siliconflowKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("siliconflow", siliconflowKey);
    }
  }

  // 检测 xAI API 密钥
  if (xaiKey) {
    const result = await ApiService.checkXAIKey(xaiKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("xai", xaiKey);
    }
  }

  // 检测 OpenRouter API 密钥
  if (openrouterKey) {
    const result = await ApiService.checkOpenRouterKey(openrouterKey);
    results.push(result.message);
    if (result.success) {
      await saveValidKey("openrouter", openrouterKey);
    }
  }

  // 检测自定义 OpenAI 兼容接口
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
      await saveValidKey("custom", customApiKey, customEndpoint);
    }

    // 检查是否已经显示历史记录，如果是则刷新
    const historyDiv = document.getElementById("history");
    const existingHistory = historyDiv?.querySelector(".history-container");
    if (existingHistory) {
      toggleHistoryPanel(historyDiv);
      toggleHistoryPanel(historyDiv);
    }
  }

  // 如果没有输入任何 API 密钥
  if (
    !openaiKey &&
    !claudeKey &&
    !geminiKey &&
    !deepseekKey &&
    !groqKey &&
    !siliconflowKey &&
    !xaiKey &&
    !openrouterKey &&
    !customEndpoint
  ) {
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
  const openaiKey = document.getElementById("openaiKey")?.value.trim();
  const claudeKey = document.getElementById("claudeKey")?.value.trim();
  const geminiKey = document.getElementById("geminiKey")?.value.trim();
  const deepseekKey = document.getElementById("deepseekKey")?.value.trim();
  const groqKey = document.getElementById("groqKey")?.value.trim();
  const siliconflowKey = document.getElementById("siliconflowKey")?.value.trim();
  const xaiKey = document.getElementById("xaiKey")?.value.trim();
  const openrouterKey = document.getElementById("openrouterKey")?.value.trim();
  const customEndpoint = document.getElementById("customEndpoint")?.value.trim();
  const customApiKey = document.getElementById("customApiKey")?.value.trim();

  const results = [];

  // 添加不支持平台的提示
  if (openaiKey) {
    results.push("❌ OpenAI 暂不支持余额查询");
  }

  if (claudeKey) {
    results.push("❌ Claude 暂不支持余额查询");
  }

  if (geminiKey) {
    results.push("❌ Gemini 暂不支持余额查询");
  }

  if (groqKey) {
    results.push("❌ Groq 暂不支持余额查询");
  }

  if (xaiKey) {
    results.push("❌ xAI 暂不支持余额查询");
  }

  // OpenRouter 余额查询
  if (openrouterKey) {
    const result = await ApiService.checkOpenRouterCredits(openrouterKey);
    results.push(result.message);
  }

  // Deepseek 余额查询
  if (deepseekKey) {
    const result = await ApiService.checkDeepseekBalance(deepseekKey);
    results.push(result.message);
  }

  // Siliconflow 余额查询
  if (siliconflowKey) {
    const result = await ApiService.checkSiliconflowBalance(siliconflowKey);
    results.push(result.message);
  }

  // 自定义 OpenAI 兼容接口的额度查询
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
