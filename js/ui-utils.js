/**
 * UI工具模块 - 处理界面相关的功能
 */

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} button - 触发复制的按钮元素
 * @returns {Promise<boolean>} - 是否复制成功
 */
export async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.innerHTML;
    button.innerHTML = "已复制!";
    setTimeout(() => (button.innerHTML = originalText), 1000);
    return true;
  } catch (err) {
    console.error("复制失败:", err);
    button.innerHTML = "复制失败!";
    setTimeout(() => (button.innerHTML = originalText), 1000);
    return false;
  }
}

/**
 * 创建加载动画
 * @param {string} message - 加载提示信息
 * @returns {string} - 加载动画HTML
 */
export function createLoadingAnimation(message = "正在加载...") {
  return `
    <div class="loading-animation">
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    </div>
  `;
}

/**
 * 创建模型测试结果表格
 * @param {Array} results - 测试结果数组
 * @returns {string} - 表格HTML
 */
export function createModelTestTable(results) {
  const tableHTML = `
    <div class="model-test-results">
      <h3 class="test-results-title">模型测试结果</h3>
      <div class="model-copy-buttons">
        <button id="copyAvailableModels" class="copy-result-btn">
          <span>复制可用模型</span>
          <small>(✅状态)</small>
        </button>
        <button id="copyMatchedModels" class="copy-result-btn">
          <span>复制匹配模型</span>
          <small>(✅模型匹配)</small>
        </button>
      </div>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr>
              <th>请求模型</th>
              <th>状态</th>
              <th>响应时间</th>
              <th>返回模型</th>
              <th>模型匹配</th>
              <th>Token数</th>
              <th>错误信息</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(result => `
              <tr>
                <td>${result.model}</td>
                <td>${result.status}</td>
                <td>${result.responseTime}ms</td>
                <td>${result.returnedModel || "-"}</td>
                <td>${result.modelMatch || "-"}</td>
                <td>${result.tokens || "-"}</td>
                <td>${result.error || "-"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return tableHTML;
}

/**
 * 创建分页按钮
 * @param {number} currentPage - 当前页码
 * @param {number} totalPages - 总页数
 * @returns {string} - 分页按钮HTML
 */
export function generatePaginationButtons(currentPage, totalPages) {
  const buttons = [];
  const maxVisibleButtons = 5; // 最多显示的按钮数量

  if (totalPages <= maxVisibleButtons) {
    // 如果总页数小于等于最大显示数，显示所有页码
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`
      );
    }
  } else {
    // 总是显示第一页
    buttons.push(
      `<button class="${1 === currentPage ? "active" : ""}" data-page="1">1</button>`
    );

    // 计算中间页码的起始和结束
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    // 如果当前页靠近开始
    if (currentPage <= 3) {
      end = 4;
    }
    // 如果当前页靠近结束
    if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
    }

    // 添加开始的省略号
    if (start > 2) {
      buttons.push("<span>...</span>");
    }

    // 添加中间的页码
    for (let i = start; i <= end; i++) {
      buttons.push(
        `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`
      );
    }

    // 添加结束的省略号
    if (end < totalPages - 1) {
      buttons.push("<span>...</span>");
    }

    // 总是显示最后一页
    buttons.push(
      `<button class="${totalPages === currentPage ? "active" : ""}" data-page="${totalPages}">${totalPages}</button>`
    );
  }

  return buttons.join("");
}

/**
 * 创建历史记录筛选器
 * @param {Array} endpoints - 所有唯一的接口地址
 * @param {Array} platforms - 所有唯一的平台
 * @param {Object} platformNames - 平台名称映射
 * @returns {string} - 筛选器HTML
 */
export function createHistoryFilters(endpoints, platforms, platformNames) {
  return `
    <div class="history-filters">
      <div class="filter-group">
        <label for="endpointFilter">接口筛选：</label>
        <select id="endpointFilter">
          <option value="">全部</option>
          ${endpoints.map(endpoint => `<option value="${endpoint}">${endpoint}</option>`).join("")}
        </select>
      </div>
      <div class="filter-group">
        <label for="platformFilter">平台筛选：</label>
        <select id="platformFilter">
          <option value="">全部</option>
          ${platforms.map(platform => 
            `<option value="${platform}">${platformNames[platform] || platform}</option>`
          ).join("")}
        </select>
      </div>
    </div>
  `;
}

/**
 * 创建历史记录项
 * @param {Array} items - 历史记录项数组
 * @param {number} startIndex - 起始索引
 * @returns {string} - 历史记录项HTML
 */
export function createHistoryItems(items, startIndex = 0) {
  return items.map((item, index) => {
    const date = new Date(item.timestamp).toLocaleString("zh-CN");
    const keyPreview = `${item.key.slice(0, 8)}...${item.key.slice(-8)}`;
    const absoluteIndex = startIndex + index;

    return `
      <div class="history-item" data-key="${item.key}" data-platform="${item.platform}" ${item.endpoint ? `data-endpoint="${item.endpoint}"` : ""}>
        <div class="history-platform">${item.platformName || item.platform}</div>
        <div class="history-key">${keyPreview}</div>
        <div class="history-time">${date}</div>
        <div class="history-actions">
          <button class="copy-key-btn">复制</button>
          <button class="use-key-btn">使用</button>
          <button class="delete-key-btn" data-index="${absoluteIndex}">删除</button>
        </div>
      </div>
    `;
  }).join("");
}

/**
 * 更新请求URL预览
 * @param {string} endpoint - 接口地址
 * @returns {string} - 完整的请求URL
 */
export function getRequestUrl(endpoint) {
  if (!endpoint) return "";
  
  const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
  return `${processedEndpoint}chat/completions`;
}

/**
 * 创建密钥选择区域
 * @param {Array} keys - 密钥数组
 * @param {string} title - 标题
 * @returns {string} - 密钥选择区域HTML
 */
export function createKeySelectionArea(keys, title = "检测到的密钥：") {
  const selectionDiv = document.createElement("div");
  selectionDiv.className = "key-selection";
  selectionDiv.style.cssText = `
    margin: 5px 0;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
  `;

  // 添加标题
  const titleDiv = document.createElement("div");
  titleDiv.style.cssText = `
    padding: 5px;
    font-weight: bold;
    color: #666;
    border-bottom: 1px solid #eee;
    margin-bottom: 5px;
  `;
  titleDiv.textContent = title;
  selectionDiv.appendChild(titleDiv);

  keys.forEach((key) => {
    const keyDiv = document.createElement("div");
    keyDiv.style.cssText = `
      padding: 5px;
      margin: 2px 0;
      background: #f5f5f5;
      cursor: pointer;
      border-radius: 3px;
    `;
    keyDiv.textContent = `${key.slice(0, 30)}...`;
    keyDiv.title = key;
    selectionDiv.appendChild(keyDiv);
  });

  return selectionDiv;
}

/**
 * 创建URL选择区域
 * @param {Array} urls - URL数组
 * @param {string} title - 标题
 * @returns {HTMLElement} - URL选择区域元素
 */
export function createUrlSelectionArea(urls, title = "检测到的接口地址：") {
  const urlSelectionDiv = document.createElement("div");
  urlSelectionDiv.className = "url-selection";
  urlSelectionDiv.style.cssText = `
    margin: 5px 0;
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    max-height: 100px;
    overflow-y: auto;
    background: white;
  `;

  // 添加标题
  const titleDiv = document.createElement("div");
  titleDiv.style.cssText = `
    padding: 5px;
    font-weight: bold;
    color: #666;
    border-bottom: 1px solid #eee;
    margin-bottom: 5px;
  `;
  titleDiv.textContent = title;
  urlSelectionDiv.appendChild(titleDiv);

  urls.forEach((url) => {
    const urlDiv = document.createElement("div");
    urlDiv.style.cssText = `
      padding: 8px;
      margin: 2px 0;
      background: #f5f5f5;
      cursor: pointer;
      border-radius: 3px;
      transition: background-color 0.2s;
    `;
    urlDiv.textContent = url;
    urlDiv.title = url;
    urlSelectionDiv.appendChild(urlDiv);
  });

  return urlSelectionDiv;
}

/**
 * 显示一个自定义通知
 * @param {string} message - 通知内容
 * @param {string} type - 通知类型 (success, error, info)
 * @param {number} duration - 显示时长（毫秒）
 */
export function showNotification(message, type = "info", duration = 3000) {
  const container = document.getElementById("notification-container");
  if (!container) {
    console.error("Notification container not found!");
    return;
  }

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  container.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Animate out and remove
  setTimeout(() => {
    notification.classList.remove("show");
    notification.classList.add("hide");
    notification.addEventListener("transitionend", () => {
      notification.remove();
    });
  }, duration);
}
