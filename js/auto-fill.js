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
  if (!resultDiv) return;
  
  resultDiv.innerHTML = "正在搜索 API 密钥和接口地址...";

  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    
    // 在页面上执行脚本获取文本内容
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // 只获取 body 内的文本内容
        const bodyText = document.body.innerText;
        return {
          text: document.documentElement.innerText,
          bodyText: bodyText,
        };
      },
    });

    // 存储找到的所有密钥
    const foundKeys = {};

    // 搜索所有类型的密钥
    for (const [platform, pattern] of Object.entries(KEY_PATTERNS)) {
      const matches = [...new Set(result.text.match(pattern) || [])];
      if (matches.length > 0) {
        foundKeys[platform] = matches;
      }
    }

    // 搜索接口地址
    const foundUrls = [...new Set(result.bodyText.match(URL_PATTERN) || [])];

    // 处理找到的接口地址
    if (foundUrls.length > 0) {
      // 激活自定义接口区段
      activateSection("custom-section");

      const customEndpointInput = document.getElementById("customEndpoint");
      if (customEndpointInput) {
        // 创建URL选择区域
        const urlSelectionDiv = createUrlSelectionArea(foundUrls);
        
        // 移除已存在的URL选择区域（如果有）
        const existingUrlSelection = customEndpointInput.parentNode.querySelector(".url-selection");
        if (existingUrlSelection) {
          existingUrlSelection.remove();
        }

        // 将新的URL选择区域插入到输入框后面
        customEndpointInput.parentNode.insertBefore(
          urlSelectionDiv,
          customEndpointInput.nextSibling
        );

        // 为URL选择区域中的每个URL添加点击事件
        addUrlSelectionListeners(urlSelectionDiv, customEndpointInput);
      }
    }

    // 处理找到的密钥
    const platformMap = {
      openai: "openaiKey",
      claude: "claudeKey",
      gemini: "geminiKey",
      deepseek: "deepseekKey",
      groq: "groqKey",
      siliconflow: "siliconflowKey",
      xai: "xaiKey",
      custom: "customApiKey",
    };

    // 清除之前的选择区域
    document.querySelectorAll(".key-selection").forEach((el) => el.remove());

    // 为每个平台创建密钥选择区域
    for (const [platform, keys] of Object.entries(foundKeys)) {
      if (keys.length > 0) {
        const inputId = platformMap[platform];
        const input = document.getElementById(inputId);
        
        if (input) {
          // 创建选择区域
          const selectionDiv = createKeySelectionArea(keys);
          
          // 将选择区域插入到输入框后面
          input.parentNode.insertBefore(selectionDiv, input.nextSibling);
          
          // 为密钥选择区域中的每个密钥添加点击事件
          addKeySelectionListeners(selectionDiv, input, platform);
        }
      }
    }

    // 更新结果显示
    const totalKeys = Object.values(foundKeys).reduce(
      (sum, keys) => sum + keys.length,
      0
    );
    
    const message = [];
    if (totalKeys > 0) {
      message.push(`✅ 已找到 ${totalKeys} 个 API 密钥`);
    }
    if (foundUrls.length > 0) {
      message.push(`✅ 已找到 ${foundUrls.length} 个接口地址`);
    }
    
    if (message.length > 0) {
      message.push("请点击选择要使用的项目");
      resultDiv.innerHTML = message.join("，");
    } else {
      resultDiv.innerHTML = "⚠️ 未在页面中找到任何 API 密钥或接口地址";
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
