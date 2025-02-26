/**
 * 历史记录管理模块 - 处理历史记录的显示和交互
 */

import { getHistoryKeys, deleteHistoryKey, clearAllHistory, filterKeys, PLATFORM_NAMES } from './storage-service.js';
import { copyToClipboard, generatePaginationButtons, createHistoryFilters, createHistoryItems } from './ui-utils.js';

// 每页显示的历史记录数量
const ITEMS_PER_PAGE = 5;

/**
 * 渲染历史记录页面
 * @param {HTMLElement} historyDiv - 历史记录容器元素
 * @param {number} currentPage - 当前页码
 * @param {Array} filteredKeys - 筛选后的历史记录
 */
function renderHistoryPage(historyDiv, currentPage, filteredKeys) {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageItems = filteredKeys.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredKeys.length / ITEMS_PER_PAGE);

  // 为每个历史记录项添加平台名称
  const itemsWithPlatformNames = pageItems.map(item => ({
    ...item,
    platformName: PLATFORM_NAMES[item.platform] || item.platform
  }));

  // 生成历史记录项HTML
  const historyItemsHtml = createHistoryItems(itemsWithPlatformNames, startIndex);

  // 生成分页HTML
  const paginationHtml = `
    <div class="pagination">
      <button ${currentPage === 1 ? "disabled" : ""} id="prevPage">上一页</button>
      ${generatePaginationButtons(currentPage, totalPages)}
      <button ${currentPage === totalPages ? "disabled" : ""} id="nextPage">下一页</button>
    </div>
  `;

  historyDiv.innerHTML = `
    <div class="history-container">
      <div class="history-header">
        <h3>历史有效密钥</h3>
        <div class="history-header-buttons">
          <button id="copyAllKeysBtn" title="复制所有密钥">复制全部</button>
          <button id="clearHistoryBtn">清空历史</button>
        </div>
      </div>
      ${createHistoryFilters(
        [...new Set(filteredKeys.filter(k => k.endpoint).map(k => k.endpoint))],
        [...new Set(filteredKeys.map(k => k.platform))],
        PLATFORM_NAMES
      )}
      ${historyItemsHtml}
      ${paginationHtml}
    </div>
  `;

  // 添加事件监听器
  addHistoryEventListeners(historyDiv, filteredKeys, currentPage);
}

/**
 * 为历史记录页面添加事件监听器
 * @param {HTMLElement} historyDiv - 历史记录容器元素
 * @param {Array} filteredKeys - 筛选后的历史记录
 * @param {number} currentPage - 当前页码
 */
function addHistoryEventListeners(historyDiv, filteredKeys, currentPage) {
  // 添加筛选器事件监听
  const endpointFilter = document.getElementById("endpointFilter");
  const platformFilter = document.getElementById("platformFilter");

  if (endpointFilter && platformFilter) {
    endpointFilter.addEventListener("change", () => {
      const newFilteredKeys = filterKeys(filteredKeys, endpointFilter.value, platformFilter.value);
      renderHistoryPage(historyDiv, 1, newFilteredKeys);
    });

    platformFilter.addEventListener("change", () => {
      const newFilteredKeys = filterKeys(filteredKeys, endpointFilter.value, platformFilter.value);
      renderHistoryPage(historyDiv, 1, newFilteredKeys);
    });
  }

  // 添加分页事件监听
  document.querySelectorAll(".pagination button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const newPage = parseInt(btn.dataset.page);
      renderHistoryPage(historyDiv, newPage, filteredKeys);
    });
  });

  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        renderHistoryPage(historyDiv, currentPage - 1, filteredKeys);
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredKeys.length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) {
        renderHistoryPage(historyDiv, currentPage + 1, filteredKeys);
      }
    });
  }

  // 添加复制单个密钥的按钮事件
  document.querySelectorAll(".history-item").forEach((item) => {
    const key = item.dataset.key;
    const platform = item.dataset.platform;
    const endpoint = item.dataset.endpoint;
    const platformName = PLATFORM_NAMES[platform] || platform;

    const copyBtn = item.querySelector(".copy-key-btn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        // 构建包含平台信息和endpoint的复制文本
        let copyText = `Platform: ${platformName}\nKey: ${key}`;
        if (endpoint) {
          copyText += `\nEndpoint: ${endpoint}`;
        }

        await copyToClipboard(copyText, copyBtn);
      });
    }

    // 添加使用按钮的点击事件
    const useBtn = item.querySelector(".use-key-btn");
    if (useBtn) {
      useBtn.addEventListener("click", function() {
        // 获取对应的区段和导航链接
        let sectionId = `${platform}-section`;
        let navLinkSelector = `.nav-menu a[href='#${platform}-section']`;

        // 如果区段未激活,则激活它
        const section = document.getElementById(sectionId);
        const navLink = document.querySelector(navLinkSelector);
        if (section && navLink && !section.classList.contains("active")) {
          section.classList.add("active");
          navLink.classList.add("active");
        }

        // 填充对应的输入框
        if (platform === "custom") {
          const customApiKeyInput = document.getElementById("customApiKey");
          const customEndpointInput = document.getElementById("customEndpoint");
          
          if (customApiKeyInput) customApiKeyInput.value = key;
          if (customEndpointInput && endpoint) customEndpointInput.value = endpoint;
          
          // 手动触发模型列表更新
          const event = new Event('input');
          if (customEndpointInput) customEndpointInput.dispatchEvent(event);
        } else {
          const inputId = `${platform}Key`;
          const input = document.getElementById(inputId);
          if (input) input.value = key;
        }
      });
    }

    // 添加删除按钮的点击事件
    const deleteBtn = item.querySelector(".delete-key-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function() {
        const index = parseInt(this.dataset.index);
        await deleteHistoryKey(index);
        
        // 重新加载历史记录
        toggleHistoryPanel(historyDiv);
        toggleHistoryPanel(historyDiv);
      });
    }
  });

  // 添加复制所有密钥的功能
  const copyAllKeysBtn = document.getElementById("copyAllKeysBtn");
  if (copyAllKeysBtn) {
    copyAllKeysBtn.addEventListener("click", async function() {
      try {
        const keysText = filteredKeys.map((item) => {
          const platformName = PLATFORM_NAMES[item.platform] || item.platform;
          let text = `${platformName}: ${item.key}`;
          if (item.endpoint) {
            text += `\nEndpoint: ${item.endpoint}`;
          }
          return text;
        }).join("\n\n");

        await copyToClipboard(keysText, this);
      } catch (err) {
        console.error("复制失败:", err);
      }
    });
  }

  // 添加清空历史的点击事件
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", async function() {
      if (confirm("确定要清空所有历史记录吗？")) {
        await clearAllHistory();
        historyDiv.innerHTML = "暂无历史记录";
      }
    });
  }
}

/**
 * 切换历史记录面板的显示状态
 * @param {HTMLElement} historyDiv - 历史记录容器元素
 */
export async function toggleHistoryPanel(historyDiv) {
  // 检查是否已经显示历史记录
  const existingHistory = historyDiv.querySelector(".history-container");
  if (existingHistory) {
    historyDiv.innerHTML = "";
    return;
  }

  try {
    const validKeys = await getHistoryKeys();

    if (validKeys.length === 0) {
      historyDiv.innerHTML = "暂无历史记录";
      return;
    }

    // 初始渲染第一页
    renderHistoryPage(historyDiv, 1, validKeys);
  } catch (error) {
    historyDiv.innerHTML = `获取历史记录失败：${error.message}`;
  }
}
