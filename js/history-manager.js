/**
 * 历史记录管理模块 - 处理历史记录的显示和交互 (重构版)
 */

import { getHistoryKeys, deleteHistoryKey, clearAllHistory, filterKeys, PLATFORM_NAMES } from './storage-service.js';
import { copyToClipboard, generatePaginationButtons, createHistoryFilters, createHistoryItems, showNotification } from './ui-utils.js';
import * as logger from './logger.js';

const ITEMS_PER_PAGE = 5;

// 模块级状态
let allHistoryKeys = [];
let filteredHistoryKeys = [];
let currentPage = 1;
let historyDiv = null;

/**
 * 渲染历史记录页面
 */
function renderHistoryPage() {
  if (!historyDiv || !historyDiv.querySelector('.history-container')) {
    return; // 如果历史面板未打开，则不渲染
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageItems = filteredHistoryKeys.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredHistoryKeys.length / ITEMS_PER_PAGE);

  const itemsWithPlatformNames = pageItems.map(item => ({
    ...item,
    platformName: PLATFORM_NAMES[item.platform] || item.platform
  }));

  const historyItemsHtml = createHistoryItems(itemsWithPlatformNames);
  const paginationHtml = `
    <div class="pagination">
      <button ${currentPage === 1 ? "disabled" : ""} data-action="prev-page">上一页</button>
      ${generatePaginationButtons(currentPage, totalPages)}
      <button ${currentPage === totalPages ? "disabled" : ""} data-action="next-page">下一页</button>
    </div>
  `;

  const uniqueEndpoints = [...new Set(allHistoryKeys.filter(k => k.endpoint).map(k => k.endpoint))];
  const uniquePlatforms = [...new Set(allHistoryKeys.map(k => k.platform))];

  historyDiv.innerHTML = `
    <div class="history-container">
      <div class="history-header">
        <h3>历史有效密钥</h3>
        <div class="history-header-buttons">
          <button data-action="copy-all" title="复制所有筛选后的密钥">复制筛选结果</button>
          <button data-action="clear-all" class="danger">清空全部历史</button>
        </div>
      </div>
      ${createHistoryFilters(uniqueEndpoints, uniquePlatforms, PLATFORM_NAMES)}
      <div class="history-list">${historyItemsHtml}</div>
      ${paginationHtml}
    </div>
  `;

  // 恢复筛选器的选中状态
  const endpointFilter = historyDiv.querySelector("#endpointFilter");
  const platformFilter = historyDiv.querySelector("#platformFilter");
  if (endpointFilter) endpointFilter.value = localStorage.getItem('history_endpoint_filter') || '';
  if (platformFilter) platformFilter.value = localStorage.getItem('history_platform_filter') || '';
}

/**
 * 处理筛选逻辑
 */
function handleFilterChange() {
  const endpointFilter = historyDiv.querySelector("#endpointFilter")?.value || '';
  const platformFilter = historyDiv.querySelector("#platformFilter")?.value || '';

  // 保存筛选状态
  localStorage.setItem('history_endpoint_filter', endpointFilter);
  localStorage.setItem('history_platform_filter', platformFilter);

  filteredHistoryKeys = filterKeys(allHistoryKeys, endpointFilter, platformFilter);
  currentPage = 1;
  renderHistoryPage();
}

/**
 * 处理事件委托
 * @param {Event} e - 事件对象
 */
async function handleHistoryEvents(e) {
  const target = e.target;
  const action = target.dataset.action || target.closest('[data-action]')?.dataset.action;
  const historyItem = target.closest('.history-item');

  if (e.type === 'change' && target.matches('#endpointFilter, #platformFilter')) {
    handleFilterChange();
    return;
  }

  if (target.matches('.pagination button[data-page]')) {
    currentPage = parseInt(target.dataset.page);
    renderHistoryPage();
    return;
  }
  
  if (action) {
    e.preventDefault();
    switch (action) {
      case 'prev-page':
        if (currentPage > 1) {
          currentPage--;
          renderHistoryPage();
        }
        break;
      case 'next-page':
        const totalPages = Math.ceil(filteredHistoryKeys.length / ITEMS_PER_PAGE);
        if (currentPage < totalPages) {
          currentPage++;
          renderHistoryPage();
        }
        break;
      case 'copy-all':
        copyAllFilteredKeys(target);
        break;
      case 'clear-all':
        if (target.dataset.confirming) {
          delete target.dataset.confirming;
          await clearAllHistory();
          await initializeHistoryPanel();
          showNotification("所有历史记录已清空", "info");
        } else {
          target.dataset.confirming = true;
          const originalText = target.textContent;
          target.textContent = "确认清空?";
          target.style.backgroundColor = "#f8d7da";

          setTimeout(() => {
            if (target.dataset.confirming) {
              delete target.dataset.confirming;
              target.textContent = originalText;
              target.style.backgroundColor = "";
            }
          }, 3000);
        }
        break;
    }
  } else if (historyItem) {
    const timestamp = historyItem.dataset.timestamp;
    const keyData = allHistoryKeys.find(k => k.timestamp === timestamp);
    if (!keyData) return;

    if (target.classList.contains('delete-key-btn')) {
      if (target.dataset.confirming) {
        // Second click: delete
        delete target.dataset.confirming;
        const success = await deleteHistoryKey(timestamp);
        if (success) {
          allHistoryKeys = allHistoryKeys.filter(k => k.timestamp !== timestamp);
          handleFilterChange();
          showNotification("记录已删除", "info");
        }
      } else {
        // First click: ask for confirmation
        target.dataset.confirming = true;
        const originalText = target.textContent;
        target.textContent = "确认删除?";
        target.style.backgroundColor = "#f8d7da"; // Highlight color

        // Reset after 3 seconds
        setTimeout(() => {
          if (target.dataset.confirming) {
            delete target.dataset.confirming;
            target.textContent = originalText;
            target.style.backgroundColor = ""; // Reset color
          }
        }, 3000);
      }
    } else if (target.classList.contains('copy-key-btn')) {
      const platformName = PLATFORM_NAMES[keyData.platform] || keyData.platform;
      let copyText = `Platform: ${platformName}\nKey: ${keyData.key}`;
      if (keyData.endpoint) copyText += `\nEndpoint: ${keyData.endpoint}`;
      if (keyData.model) copyText += `\nModel: ${keyData.model}`;
      await copyToClipboard(copyText, target);
    } else if (target.classList.contains('use-key-btn')) {
      fillInputsWithKey(keyData);
    } else if (target.classList.contains('history-key')) {
      const success = await copyToClipboard(keyData.key);
      if (success) {
        showNotification("密钥已复制!", "success");
      } else {
        showNotification("复制失败!", "error");
      }
    }
  }
}

/**
 * 复制所有筛选后的密钥
 * @param {HTMLElement} button - 触发复制的按钮
 */
async function copyAllFilteredKeys(button) {
  try {
    if (filteredHistoryKeys.length === 0) {
      await copyToClipboard("没有可复制的密钥。", button);
      return;
    }
    const keysText = filteredHistoryKeys.map((item) => {
      const platformName = PLATFORM_NAMES[item.platform] || item.platform;
      let text = `${platformName}: ${item.key}`;
      if (item.endpoint) text += `\nEndpoint: ${item.endpoint}`;
      if (item.model) text += `\nModel: ${item.model}`;
      return text;
    }).join("\n\n");

    await copyToClipboard(keysText, button);
  } catch (err) {
    logger.error("复制失败:", err);
  }
}

/**
 * 使用指定的密钥数据填充主界面的输入框
 * @param {object} keyData - 历史记录项的数据
 */
function fillInputsWithKey(keyData) {
  const { platform, key, endpoint, model } = keyData;
  
  // 激活对应的区段
  const sectionId = `${platform}-section`;
  const navLinkSelector = `.nav-menu a[href='#${sectionId}']`;
  const section = document.getElementById(sectionId);
  const navLink = document.querySelector(navLinkSelector);
  
  if (section && navLink) {
    document.querySelectorAll('.section, .nav-menu a').forEach(el => el.classList.remove('active'));
    section.classList.add('active');
    navLink.classList.add('active');
  }

  // 填充输入框
  if (platform === "custom") {
    const customApiKeyInput = document.getElementById("customApiKey");
    const customEndpointInput = document.getElementById("customEndpoint");
    if (customApiKeyInput) customApiKeyInput.value = key;
    if (customEndpointInput) customEndpointInput.value = endpoint || "";
    
    // 手动触发模型列表更新
    const event = new Event('input', { bubbles: true });
    if (customEndpointInput) customEndpointInput.dispatchEvent(event);
    
    // 尝试设置模型
    if (model) {
        setTimeout(() => {
            const modelSelect = document.getElementById("modelSelect");
            if(modelSelect) {
                const option = Array.from(modelSelect.options).find(opt => opt.value === model);
                if (option) {
                    modelSelect.value = model;
                }
            }
        }, 500); // 延迟以等待模型列表加载
    }

  } else {
    const inputId = `${platform}Key`;
    const input = document.getElementById(inputId);
    if (input) input.value = key;
  }
}

/**
 * 初始化历史记录面板
 */
async function initializeHistoryPanel() {
  try {
    allHistoryKeys = await getHistoryKeys();
    handleFilterChange(); // 初始筛选和渲染
  } catch (error) {
    logger.error('获取历史记录失败', error);
    historyDiv.innerHTML = `<div class="history-container"><div class="history-empty">获取历史记录失败：${error.message}</div></div>`;
  }
}

/**
 * 切换历史记录面板的显示状态
 * @param {HTMLElement} historyContainer - 历史记录容器元素
 */
export async function toggleHistoryPanel(historyContainer) {
  historyDiv = historyContainer;
  const existingHistory = historyDiv.querySelector(".history-container");

  if (existingHistory) {
    historyDiv.innerHTML = "";
    historyDiv.removeEventListener('change', handleHistoryEvents);
    historyDiv.removeEventListener('click', handleHistoryEvents);
  } else {
    historyDiv.innerHTML = '<div class="history-container"><div class="history-empty">正在加载历史记录...</div></div>';
    historyDiv.addEventListener('change', handleHistoryEvents);
    historyDiv.addEventListener('click', handleHistoryEvents);
    await initializeHistoryPanel();
  }
}
