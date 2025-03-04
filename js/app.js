/**
 * 主应用模块 - 整合所有功能并初始化应用
 */

import * as ApiService from "./api-services.js";
import { autoDetectKeysAndUrls } from "./auto-fill.js";
import { getConfig, resetConfig, saveConfig } from "./config-service.js";
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
  // 加载配置
  loadConfig();

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
    
  // 添加配置按钮事件监听
  document.getElementById("configButton")?.addEventListener("click", toggleConfigPanel);
  
  // 添加配置弹出层关闭按钮事件监听
  document.querySelector(".config-popup-close")?.addEventListener("click", closeConfigPanel);
  
  // 添加配置弹出层遮罩层点击关闭事件
  document.querySelector(".config-overlay")?.addEventListener("click", closeConfigPanel);

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

  // 添加配置保存按钮事件监听
  document.getElementById("saveConfigBtn")?.addEventListener("click", saveUserConfig);

  // 添加配置重置按钮事件监听
  document.getElementById("resetConfigBtn")?.addEventListener("click", resetUserConfig);

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
 * 加载配置
 */
async function loadConfig() {
  try {
    const config = await getConfig();
    
    // 填充默认模型配置
    document.getElementById("defaultOpenAIModel").value = config.defaultModels.openai || "";
    document.getElementById("defaultClaudeModel").value = config.defaultModels.claude || "";
    document.getElementById("defaultGeminiModel").value = config.defaultModels.gemini || "";
    document.getElementById("defaultDeepseekModel").value = config.defaultModels.deepseek || "";
    document.getElementById("defaultGroqModel").value = config.defaultModels.groq || "";
    document.getElementById("defaultSiliconflowModel").value = config.defaultModels.siliconflow || "";
    document.getElementById("defaultXAIModel").value = config.defaultModels.xai || "";
    // 填充NewAPI系统访问地址
    document.getElementById("newAPIUrl").value = config.newAPIUrl || "";
    // 填充NewAPI系统访问令牌
    document.getElementById("newAPIToken").value = config.newAPIToken || "";
    
    logger.info("配置加载成功");
  } catch (error) {
    logger.error("配置加载失败", error);
  }
}

/**
 * 保存用户配置
 */
async function saveUserConfig() {
  try {
    const config = {
      defaultModels: {
        openai: document.getElementById("defaultOpenAIModel").value.trim(),
        claude: document.getElementById("defaultClaudeModel").value.trim(),
        gemini: document.getElementById("defaultGeminiModel").value.trim(),
        deepseek: document.getElementById("defaultDeepseekModel").value.trim(),
        groq: document.getElementById("defaultGroqModel").value.trim(),
        siliconflow: document.getElementById("defaultSiliconflowModel").value.trim(),
        xai: document.getElementById("defaultXAIModel").value.trim()
      },
      newAPIUrl: document.getElementById("newAPIUrl").value.trim(),
      newAPIToken: document.getElementById("newAPIToken").value.trim()
    };
    
    const success = await saveConfig(config);
    
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      if (success) {
        resultDiv.innerHTML = "✅ 配置保存成功";
      } else {
        resultDiv.innerHTML = "❌ 配置保存失败";
      }
    }
  } catch (error) {
    logger.error("保存配置失败", error);
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      resultDiv.innerHTML = `❌ 配置保存失败: ${error.message}`;
    }
  }
}

/**
 * 重置用户配置
 */
async function resetUserConfig() {
  try {
    const success = await resetConfig();
    
    if (success) {
      // 重新加载配置到界面
      await loadConfig();
      
      const resultDiv = document.getElementById("result");
      if (resultDiv) {
        resultDiv.innerHTML = "✅ 配置已重置为默认值";
      }
    } else {
      const resultDiv = document.getElementById("result");
      if (resultDiv) {
        resultDiv.innerHTML = "❌ 配置重置失败";
      }
    }
  } catch (error) {
    logger.error("重置配置失败", error);
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      resultDiv.innerHTML = `❌ 配置重置失败: ${error.message}`;
    }
  }
}

/**
 * 初始化导航菜单
 */
function initNavigation() {
  logger.debug("开始初始化导航菜单");

  // 先隐藏所有区段和取消所有导航链接的激活状态
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
    logger.debug(`取消区段激活状态`, { sectionId: section.id });
  });

  document.querySelectorAll(".nav-menu a").forEach((link) => {
    link.classList.remove("active");
    logger.debug(`取消导航链接激活状态`, { href: link.getAttribute("href") });
  });

  // 再激活自定义接口区段
  const customSection = document.getElementById("custom-section");
  if (customSection) {
    customSection.classList.add("active");
    logger.debug("已激活自定义接口区段");
  } else {
    logger.warn("未找到自定义接口区段元素", { selector: "#custom-section" });
  }

  // 激活导航菜单中的自定义接口链接
  const customNavLink = document.querySelector(
    ".nav-menu a[href='#custom-section']"
  );
  if (customNavLink) {
    customNavLink.classList.add("active");
    logger.debug("已激活自定义接口导航链接");
  } else {
    logger.warn("未找到自定义接口导航链接", {
      selector: ".nav-menu a[href='#custom-section']",
    });
  }

  // 添加导航菜单点击事件
  const navLinks = document.querySelectorAll(".nav-menu a");
  logger.debug("找到导航链接", { count: navLinks.length });

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const href = this.getAttribute("href");
      logger.debug("点击导航链接", { href });

      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
      logger.debug("已激活导航链接", { href });

      const targetId = href.substring(1);

      document.querySelectorAll(".section").forEach((section) => {
        section.classList.remove("active");
        logger.debug("取消区段激活状态", { sectionId: section.id });
      });

      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.add("active");
        logger.debug("已激活目标区段", { targetId });
      } else {
        logger.warn("未找到目标区段", { targetId });
      }
    });
    logger.debug("已为导航链接添加点击事件", {
      href: link.getAttribute("href"),
    });
  });

  logger.info("导航菜单初始化完成");
}

/**
 * 切换配置面板显示状态
 */
function toggleConfigPanel() {
  logger.debug("切换配置面板显示状态");
  const configPopup = document.querySelector(".config-popup");
  const configOverlay = document.querySelector(".config-overlay");
  
  if (configPopup && configOverlay) {
    configPopup.classList.add("active");
    configOverlay.classList.add("active");
    logger.debug("配置面板已显示");
  } else {
    logger.warn("未找到配置面板元素");
  }
}

/**
 * 关闭配置面板
 */
function closeConfigPanel() {
  logger.debug("关闭配置面板");
  const configPopup = document.querySelector(".config-popup");
  const configOverlay = document.querySelector(".config-overlay");
  
  if (configPopup && configOverlay) {
    configPopup.classList.remove("active");
    configOverlay.classList.remove("active");
    logger.debug("配置面板已关闭");
  } else {
    logger.warn("未找到配置面板元素");
  }
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
  const customEndpoint = document.getElementById("customEndpoint")?.value.trim();
  const customApiKey = document.getElementById("customApiKey")?.value.trim();

  const resultDiv = document.getElementById("result");
  if (!resultDiv) return;

  resultDiv.innerHTML = "正在检测，请稍候...";

  const results = [];

  // 检测 OpenAI API 密钥
  if (openaiKey) {
    const result = await ApiService.checkOpenAIKey(openaiKey);
    
    // 如果API密钥有效，添加保存到NewAPI的按钮
    if (result.success) {
      await saveValidKey("openai", openaiKey);
      
      // 获取NewAPI系统访问令牌
      const config = await getConfig();
      const newAPIToken = config.newAPIToken;
      const newAPIUrl = config.newAPIUrl;

      
      // 添加保存到NewAPI的选项
      if (newAPIToken && newAPIUrl) {
        const saveToNewAPIButton = `<button type="button" class="save-to-newapi-btn" data-key="${openaiKey}" data-name="openai">保存到NewAPI</button>`;
        results.push(result.message + " " + saveToNewAPIButton);
      } else {
        results.push(result.message + " <span class='warning'>(配置NewAPI系统访问地址和令牌后可保存到NewAPI)</span>");
      }
    } else {
      results.push(result.message);
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
    !customEndpoint
  ) {
    results.push("⚠️ 请至少输入一个 API 密钥进行检测。");
  }

  resultDiv.innerHTML = results.join("<br />");
  
  // 添加保存到NewAPI按钮的事件监听
  document.querySelectorAll(".save-to-newapi-btn").forEach(button => {
    button.addEventListener("click", saveKeyToNewAPI);
  });
}

/**
 * 保存API密钥到NewAPI
 * @param {Event} event - 点击事件
 */
async function saveKeyToNewAPI(event) {
  const button = event.target;
  const apiKey = button.getAttribute("data-key");
  const name = button.getAttribute("data-name");
  
  // 禁用按钮，防止重复点击
  button.disabled = true;
  button.textContent = "保存中...";
  
  try {
    // 获取NewAPI系统访问令牌
    const config = await getConfig();
    const newAPIToken = config.newAPIToken;
    const newAPIUrl = config.newAPIUrl;
    
    if (!newAPIToken) {
      throw new Error("未配置NewAPI系统访问令牌");
    }

    if (!newAPIUrl) {
      throw new Error("未配置NewAPI系统访问地址");
    }
    
    // 默认模型列表
    const defaultModels = "gpt-3.5-turbo,gpt-3.5-turbo-0613,gpt-3.5-turbo-1106,gpt-3.5-turbo-0125,gpt-3.5-turbo-16k,gpt-3.5-turbo-16k-0613,gpt-3.5-turbo-instruct,gpt-4,gpt-4-0613,gpt-4-1106-preview,gpt-4-0125-preview,gpt-4-32k,gpt-4-32k-0613,gpt-4-turbo-preview,gpt-4-turbo,gpt-4-turbo-2024-04-09,gpt-4-vision-preview,chatgpt-4o-latest,gpt-4o,gpt-4o-2024-05-13,gpt-4o-2024-08-06,gpt-4o-2024-11-20,gpt-4o-mini,gpt-4o-mini-2024-07-18,gpt-4.5-preview,gpt-4.5-preview-2025-02-27,o1-preview,o1-preview-2024-09-12,o1-mini,o1-mini-2024-09-12,o3-mini,o3-mini-2025-01-31,o3-mini-high,o3-mini-2025-01-31-high,o3-mini-low,o3-mini-2025-01-31-low,o3-mini-medium,o3-mini-2025-01-31-medium,o1,o1-2024-12-17,gpt-4o-audio-preview,gpt-4o-audio-preview-2024-10-01,gpt-4o-realtime-preview,gpt-4o-realtime-preview-2024-10-01,gpt-4o-realtime-preview-2024-12-17,gpt-4o-mini-realtime-preview,gpt-4o-mini-realtime-preview-2024-12-17,text-embedding-ada-002,text-embedding-3-small,text-embedding-3-large,text-curie-001,text-babbage-001,text-ada-001,text-moderation-latest,text-moderation-stable,text-davinci-edit-001,davinci-002,babbage-002,dall-e-3,whisper-1,tts-1,tts-1-1106,tts-1-hd,tts-1-hd-1106";
    
    // 保存到NewAPI
    const result = await ApiService.saveToNewAPI(name, apiKey, defaultModels, newAPIToken);
    
    // 更新结果显示
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      const resultHtml = resultDiv.innerHTML;
      const updatedHtml = resultHtml.replace(
        `<button type="button" class="save-to-newapi-btn" data-key="${apiKey}" data-name="${name}">保存到NewAPI</button>`,
        result.success ? 
          `<span class="success-text">已保存到NewAPI</span>` : 
          `<span class="error-text">保存失败: ${result.message}</span>`
      );
      resultDiv.innerHTML = updatedHtml;
    }
  } catch (error) {
    logger.error("保存到NewAPI失败", error);
    
    // 恢复按钮状态
    button.disabled = false;
    button.textContent = "保存到NewAPI";
    
    // 显示错误信息
    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      const errorMessage = `<span class="error-text">保存到NewAPI失败: ${error.message}</span>`;
      resultDiv.innerHTML += `<br />${errorMessage}`;
    }
  }
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

  // 清空结果显示区域
  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.innerHTML = "";
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
