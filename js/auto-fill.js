/**
 * 自动填充模块 - 处理页面内容的自动识别功能
 */

import { KEY_PATTERNS, URL_PATTERN } from './api-services.js';
import { createKeySelectionArea, createUrlSelectionArea, getRequestUrl } from './ui-utils.js';
import { loadModelList } from './model-manager.js';

/**
 * 从页面内容中自动识别API密钥和接口地址
 * @returns {Promise<void>}
 */
export async function autoDetectKeysAndUrls() {
  const resultDiv = document.getElementById("result");
  const batchApiKeysEl = document.getElementById('batchApiKeys');
  const batchProviderEl = document.getElementById('batchProvider');

  if (!resultDiv || !batchApiKeysEl || !batchProviderEl) return;
  
  resultDiv.innerHTML = "正在从当前页面搜索 API 密钥...";

  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    
    // 在页面上执行脚本获取文本内容
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.documentElement.innerText,
    });

    const pageText = result;
    const provider = batchProviderEl.value;
    let foundKeys = [];

    if (provider === 'auto') {
      // 自动检测所有类型的 key
      for (const keyType in KEY_PATTERNS) {
        const pattern = KEY_PATTERNS[keyType];
        const matches = pageText.match(pattern) || [];
        foundKeys.push(...matches);
      }
    } else {
      // 只检测指定厂商的 key
      const pattern = KEY_PATTERNS[provider];
      if (pattern) {
        foundKeys = pageText.match(pattern) || [];
      }
    }

    // 去重并填充到批量检测输入框
    const uniqueKeys = [...new Set(foundKeys)];
    
    if (uniqueKeys.length > 0) {
      // 激活批量检测区段
      activateSection("batch-check-section");
      batchApiKeysEl.value = uniqueKeys.join('\n');
      
      // 触发行号更新
      const inputEvent = new Event('input', { bubbles: true });
      batchApiKeysEl.dispatchEvent(inputEvent);
      
      resultDiv.innerHTML = `✅ 已找到并填充 ${uniqueKeys.length} 个密钥到批量检测框。`;
    } else {
      resultDiv.innerHTML = `⚠️ 在页面中未找到与所选厂商 [${provider}] 匹配的 API 密钥。`;
    }

  } catch (error) {
    resultDiv.innerHTML = `❌ 自动识别失败：${error.message}`;
    console.error("自动识别错误:", error);
  }
}

/**
 * 激活指定的区段
 * @param {string} sectionId - 要激活的区段ID
 */
function activateSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  
  // 取消其他区段的激活状态
  document.querySelectorAll(".section").forEach((s) => {
    if (s.id !== sectionId) {
      s.classList.remove("active");
    }
  });
  
  // 激活指定区段
  section.classList.add("active");
  
  // 激活对应的导航链接
  const navLink = document.querySelector(`.nav-menu a[href='#${sectionId}']`);
  if (navLink) {
    document.querySelectorAll(".nav-menu a").forEach((link) => {
      link.classList.remove("active");
    });
    navLink.classList.add("active");
  }
}

/**
 * 为URL选择区域添加事件监听器
 * @param {HTMLElement} urlSelectionDiv - URL选择区域元素
 * @param {HTMLElement} customEndpointInput - 自定义接口地址输入框
 */
function addUrlSelectionListeners(urlSelectionDiv, customEndpointInput) {
  const urlDivs = urlSelectionDiv.querySelectorAll("div");
  
  // 跳过标题div
  for (let i = 1; i < urlDivs.length; i++) {
    const urlDiv = urlDivs[i];
    
    urlDiv.addEventListener("mouseover", () => {
      if (urlDiv.style.background !== "#e3f2fd") {
        urlDiv.style.background = "#eee";
      }
    });

    urlDiv.addEventListener("mouseout", () => {
      if (urlDiv.style.background !== "#e3f2fd") {
        urlDiv.style.background = "#f5f5f5";
      }
    });

    urlDiv.addEventListener("click", () => {
      const url = urlDiv.textContent;
      customEndpointInput.value = url;
      
      // 高亮选中的URL
      urlSelectionDiv.querySelectorAll("div").forEach((div, index) => {
        if (index !== 0) { // 跳过标题div
          div.style.background = "#f5f5f5";
        }
      });
      urlDiv.style.background = "#e3f2fd";
      
      // 触发模型列表更新
      const customApiKey = document.getElementById("customApiKey");
      if (customApiKey && customApiKey.value) {
        loadModelList(url, customApiKey.value);
      }
      
      // 更新请求地址预览
      updateUrlPreview(url);
    });
  }
}

/**
 * 为密钥选择区域添加事件监听器
 * @param {HTMLElement} selectionDiv - 密钥选择区域元素
 * @param {HTMLElement} input - 对应的输入框
 * @param {string} platform - 平台名称
 */
function addKeySelectionListeners(selectionDiv, input, platform) {
  const keyDivs = selectionDiv.querySelectorAll("div");
  
  // 跳过标题div
  for (let i = 1; i < keyDivs.length; i++) {
    const keyDiv = keyDivs[i];
    
    keyDiv.addEventListener("click", () => {
      const key = keyDiv.title;
      input.value = key;
      
      // 高亮选中的密钥
      selectionDiv.querySelectorAll("div").forEach((div, index) => {
        if (index !== 0) { // 跳过标题div
          div.style.background = "#f5f5f5";
        }
      });
      keyDiv.style.background = "#e3f2fd";
      
      // 如果是自定义接口的API密钥，触发模型列表更新
      if (platform === "custom") {
        const customEndpoint = document.getElementById("customEndpoint");
        if (customEndpoint && customEndpoint.value) {
          loadModelList(customEndpoint.value, key);
        }
      }
    });
  }
}

/**
 * 更新URL预览
 * @param {string} endpoint - 接口地址
 */
function updateUrlPreview(endpoint) {
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
