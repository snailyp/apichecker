import * as api from './api-services.js';
import { getDefaultModel } from './config-manager.js';
import * as logger from './logger.js';
import { showNotification } from './ui-utils.js';

/**
 * 节流函数 - 限制函数调用频率
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 节流时间间隔（毫秒）
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

const batchApiKeysEl = document.getElementById('batchApiKeys');
const batchLineNumbersEl = document.getElementById('batchLineNumbers');
const concurrencyLimitEl = document.getElementById('concurrencyLimit');
const startBatchCheckBtn = document.getElementById('startBatchCheckBtn');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const batchResultsEl = document.getElementById('batchResults');
const batchProviderEl = document.getElementById('batchProvider');
const tidyKeysBtn = document.getElementById('tidyKeysBtn');
const batchCustomProviderOptions = document.getElementById('batch-custom-provider-options');
const batchCustomEndpointEl = document.getElementById('batchCustomEndpoint');
const batchModelSelectEl = document.getElementById('batchModelSelect');
const batchModelInputEl = document.getElementById('batchModelInput');
const fetchBatchModelsBtn = document.getElementById('fetchBatchModelsBtn');
const toggleBatchModelBtn = document.getElementById('toggleBatchModelBtn');
const batchUrlPreviewEl = document.getElementById('batchUrlPreview');
const batchProgressContainer = document.getElementById('batchProgressContainer');
const batchProgressBar = document.getElementById('batchProgressBar');
const batchProgressText = document.getElementById('batchProgressText');
const batchStatsEl = document.getElementById('batch-stats');
const validCountEl = document.getElementById('valid-count');
const invalidCountEl = document.getElementById('invalid-count');

const keyCheckMap = {
  openai: api.checkOpenAIKey,
  claude: api.checkClaudeKey,
  gemini: api.checkGeminiKey,
  deepseek: api.checkDeepseekKey,
  groq: api.checkGroqKey,
  siliconflow: api.checkSiliconflowKey,
  xai: api.checkXAIKey,
  openrouter: api.checkOpenRouterKey,
  custom: (key) => {
    const endpoint = batchCustomEndpointEl.value;
    const model = batchModelSelectEl.style.display !== 'none'
                  ? batchModelSelectEl.value
                  : batchModelInputEl.value;
    if (!endpoint) {
      return { success: false, message: '请输入自定义接口地址' };
    }
    return api.checkCustomEndpoint(endpoint, key, model ? model : undefined);
  }
};

/**
 * 根据密钥格式猜测密钥类型
 * @param {string} key 
 * @returns {string|null}
 */
function detectKeyType(key) {
  for (const type in api.KEY_PATTERNS) {
    // 创建一个新的正则表达式，确保它从字符串的开头匹配到结尾
    const regex = new RegExp(`^${api.KEY_PATTERNS[type].source.replace(/\/g$/, '')}$`);
    if (type !== 'custom' && regex.test(key)) {
      return type;
    }
  }
  // 如果没有匹配到特定的提供商，但看起来像一个 sk- key，则默认为 custom
  if (/^sk-[a-zA-Z0-9]+$/.test(key)) {
      return 'openai'; // 默认为openai
  }
  return null;
}

/**
 * 获取默认API URL
 * @param {string} type - API类型
 * @returns {string} API URL
 */
function getDefaultApiUrl(type) {
  const urlMap = {
    openai: 'https://api.openai.com/v1/chat/completions',
    claude: 'https://api.anthropic.com/v1/messages',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
    xai: 'https://api.x.ai/v1/chat/completions',
    openrouter: 'https://openrouter.ai/api/v1/chat/completions'
  };
  return urlMap[type] || 'N/A';
}

/**
 * 设置批量检测的UI界面
 * @param {string[]} keys - 密钥数组
 * @returns {Object} 返回包含表格行数据和统计信息的对象
 */
function setupBatchUI(keys) {
  // 重置并显示进度条和统计信息
  batchStatsEl.style.display = 'block';
  batchStatsEl.classList.remove('completed');
  validCountEl.textContent = '0';
  invalidCountEl.textContent = '0';
  batchProgressContainer.style.display = 'block';
  batchProgressBar.style.width = '0%';
  batchProgressText.textContent = `0 / ${keys.length}`;

  // 创建结果表格
  batchResultsEl.innerHTML = `
    <h3>检测结果 (共 ${keys.length} 个密钥)</h3>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>密钥</th>
            <th>类型</th>
            <th id="status-header" style="cursor: pointer;">状态<span class="sort-indicator"></span></th>
            <th>URL</th>
            <th id="balance-header" style="cursor: pointer;">总余额<span class="sort-indicator"></span></th>
            <th id="charge-balance-header" style="cursor: pointer;">充值余额<span class="sort-indicator"></span></th>
            <th id="gift-balance-header" style="cursor: pointer;">赠送余额<span class="sort-indicator"></span></th>
            <th>模型</th>
            <th>信息</th>
          </tr>
        </thead>
        <tbody id="batch-results-tbody">
        </tbody>
      </table>
    </div>
  `;

  const tbody = document.getElementById('batch-results-tbody');
  const rowsData = [];

  // 创建表格行的辅助函数
  function renderRow(key, type, status, message, index) {
    const shortKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    const row = document.createElement('tr');
    row.id = `result-row-${index}`;
    row.dataset.fullKey = key;
    
    // 获取URL信息
    let url = 'N/A';
    if (type === 'custom') {
      const endpoint = batchCustomEndpointEl.value;
      if (endpoint) {
        const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
        url = `${processedEndpoint}chat/completions`;
      }
    } else if (type && api.getApiEndpoint) {
      // 如果api-services.js中有获取端点的函数，使用它
      url = api.getApiEndpoint(type) || getDefaultApiUrl(type);
    } else {
      url = getDefaultApiUrl(type);
    }
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${shortKey}</td>
      <td>${type || '未知'}</td>
      <td class="status-${status}">${status}</td>
      <td class="url-cell">${url}</td>
      <td class="balance-cell">N/A</td>
      <td class="charge-balance-cell">N/A</td>
      <td class="gift-balance-cell">N/A</td>
      <td class="model-cell"></td>
      <td>${message}</td>
    `;
    
    // 添加点击样式和事件监听器
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      // 从 resultsData 中找到对应的数据
      const data = resultsData[index];
      if (data) {
        const textToCopy = formatKeyForCopy(data);
        navigator.clipboard.writeText(textToCopy).then(() => {
          showNotification('已复制到剪贴板！', 'success');
        }, () => {
          showNotification('复制失败！', 'error');
        });
      }
    });
    
    tbody.appendChild(row);
    return row;
  }

  // 为每个密钥创建行
  keys.forEach((key, index) => {
    const selectedProvider = batchProviderEl.value;
    const type = selectedProvider === 'auto' ? detectKeyType(key) : selectedProvider;
    const row = renderRow(key, type, 'pending', '等待检测...', index);
    rowsData.push({ key, type, row, status: 'pending' });
  });

  return {
    rowsData,
    tbody,
    stats: {
      completedChecks: 0,
      validCount: 0,
      invalidCount: 0,
      totalKeys: keys.length
    }
  };
}

/**
 * 创建任务队列
 * @param {string[]} keys - 密钥数组
 * @param {string} apiProvider - API提供商
 * @returns {Array} 任务数组
 */
function createTaskQueue(keys, apiProvider) {
  return keys.map((key, index) => {
    const type = apiProvider === 'auto' ? detectKeyType(key) : apiProvider;
    return {
      key,
      type,
      index
    };
  });
}

/**
 * 更新批量检测进度和UI
 * @param {Object} result - 检测结果
 * @param {HTMLElement} row - 表格行元素
 * @param {Object} stats - 统计信息对象
 * @param {string} type - 密钥类型
 * @param {number} index - 密钥索引
 */
function updateBatchProgress(result, row, stats, type, index) {
  // 首先更新数据状态
  if (index !== undefined && resultsData[index]) {
    resultsData[index].status = result.success ? 'valid' : 'invalid';
    resultsData[index].message = result.message;
    resultsData[index].isPaid = result.isPaid || false;
    resultsData[index].balance = result.balance ?? -1;
    resultsData[index].chargeBalance = result.chargeBalance ?? -1;
    resultsData[index].giftBalance = result.giftBalance ?? -1;
  }

  const statusCell = row.cells[3];
  const balanceCell = row.cells[5];
  const chargeBalanceCell = row.cells[6];
  const giftBalanceCell = row.cells[7];
  const modelCell = row.cells[8];
  const messageCell = row.cells[9];

  // 更新行数据
  row.dataset.isPaid = result.isPaid;
  row.dataset.balance = result.balance ?? -1;
  row.dataset.chargeBalance = result.chargeBalance ?? -1;
  row.dataset.giftBalance = result.giftBalance ?? -1;

  // 更新状态
  statusCell.textContent = result.success ? '有效' : '无效';
  statusCell.className = result.success ? 'status-valid' : 'status-invalid';
  
  // 显示总余额
  if (result.balance !== undefined && result.balance !== null) {
    balanceCell.textContent = result.balance.toFixed(4);
  } else {
    balanceCell.textContent = 'N/A';
  }
  
  // 显示充值余额（仅对siliconflow显示）
  if (type === 'siliconflow' && result.chargeBalance !== undefined && result.chargeBalance !== null) {
    chargeBalanceCell.textContent = result.chargeBalance.toFixed(4);
  } else {
    chargeBalanceCell.textContent = type === 'siliconflow' ? '0.0000' : 'N/A';
  }
  
  // 显示赠送余额（仅对siliconflow显示）
  if (type === 'siliconflow' && result.giftBalance !== undefined && result.giftBalance !== null) {
    giftBalanceCell.textContent = result.giftBalance.toFixed(4);
  } else {
    giftBalanceCell.textContent = type === 'siliconflow' ? '0.0000' : 'N/A';
  }
  
  messageCell.innerHTML = result.message;

  // 显示测试时使用的模型
  if (type === 'custom') {
    const model = batchModelSelectEl.style.display !== 'none'
      ? batchModelSelectEl.value
      : batchModelInputEl.value;
    modelCell.textContent = model || 'N/A';
  } else {
    // 为其他API类型显示默认测试模型
    modelCell.textContent = getDefaultModel(type) || 'N/A';
  }

  // 更新进度
  stats.completedChecks++;
  const percentage = (stats.completedChecks / stats.totalKeys) * 100;
  batchProgressBar.style.width = `${percentage}%`;
  batchProgressText.textContent = `${stats.completedChecks} / ${stats.totalKeys}`;

  // 更新统计
  if (result.success) {
    stats.validCount++;
    animateCountUpdate(validCountEl, stats.validCount);
  } else {
    stats.invalidCount++;
    animateCountUpdate(invalidCountEl, stats.invalidCount);
  }
}

/**
 * 动画更新计数显示
 * @param {HTMLElement} element - 要更新的元素
 * @param {number} newValue - 新值
 */
function animateCountUpdate(element, newValue) {
  element.classList.add('updating');
  setTimeout(() => {
    element.textContent = newValue;
    element.classList.remove('updating');
  }, 200);
}

/**
 * 运行并发检测
 * @param {Array} tasks - 任务数组
 * @param {Array} rowsData - 行数据数组
 * @param {number} concurrency - 并发数
 * @param {Function} updateCallback - 更新回调函数
 * @returns {Promise} 所有任务完成的Promise
 */
async function runConcurrentChecks(tasks, rowsData, concurrency, updateCallback) {
  const queue = [...tasks];
  let activeChecks = 0;

  const checkKey = async (task) => {
    const { key, type, index } = task;
    const keyData = rowsData[index];
    const row = keyData.row;
    const statusCell = row.cells[3];

    // 更新数据状态为检测中
    if (resultsData[index]) {
      resultsData[index].status = 'checking';
    }

    statusCell.textContent = '检测中...';
    statusCell.className = 'status-checking';

    const checkFunction = type ? keyCheckMap[type] : null;
    let result;

    if (checkFunction) {
      result = await checkFunction(key);
    } else {
      result = { success: false, message: '无法识别的密钥类型' };
    }
    
    keyData.status = result.success ? 'valid' : 'invalid';
    keyData.message = result.message;
    keyData.isPaid = result.isPaid;
    keyData.balance = result.balance;
    keyData.chargeBalance = result.chargeBalance;
    keyData.giftBalance = result.giftBalance;

    updateCallback(result, row, type, index);
  };

  const worker = async () => {
    while (queue.length > 0) {
      activeChecks++;
      const task = queue.shift();
      await checkKey(task);
      activeChecks--;
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
}

/**
 * 完成批量检测的收尾工作
 * @param {Object} stats - 统计信息
 */
function finalizeBatchCheck(stats) {
  logger.info('批量检测完成', { total: stats.totalKeys });

  // 隐藏进度条，但保持统计信息显示
  setTimeout(() => {
    batchProgressContainer.style.display = 'none';
    
    // 添加完成状态的视觉反馈
    batchStatsEl.classList.add('completed');
    
    // 显示完成提示
    showCompletionSummary(stats.validCount, stats.invalidCount, stats.totalKeys);
  }, 1000);

  // 默认按充值余额优先级排序
  sortResults('chargeBalance');

  // 添加排序事件监听器
  const balanceHeader = document.getElementById('balance-header');
  if (balanceHeader) {
    balanceHeader.addEventListener('click', () => sortResults('balance'));
  }
  const chargeBalanceHeader = document.getElementById('charge-balance-header');
  if (chargeBalanceHeader) {
    chargeBalanceHeader.addEventListener('click', () => sortResults('chargeBalance'));
  }
  const giftBalanceHeader = document.getElementById('gift-balance-header');
  if (giftBalanceHeader) {
    giftBalanceHeader.addEventListener('click', () => sortResults('giftBalance'));
  }
  const statusHeader = document.getElementById('status-header');
  if (statusHeader) {
    statusHeader.addEventListener('click', () => sortResults('status'));
  }
}

// 全局变量用于维护结果数据状态
let resultsData = [];

async function startBatchCheck() {
  // 1. 验证输入
  const keys = batchApiKeysEl.value.split('\n').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    batchResultsEl.innerHTML = '<p>请输入至少一个API密钥。</p>';
    return;
  }

  // 2. 获取配置
  const concurrency = parseInt(concurrencyLimitEl.value, 10) || 5;
  const selectedProvider = batchProviderEl.value;

  // 3. 初始化结果数据数组
  resultsData = keys.map((key, index) => {
    const type = selectedProvider === 'auto' ? detectKeyType(key) : selectedProvider;
    return {
      index: index,
      key: key,
      type: type,
      status: 'pending',
      message: '等待检测...',
      isPaid: false,
      balance: -1,
      chargeBalance: -1,
      giftBalance: -1
    };
  });

  // 4. 设置UI界面
  const { rowsData, stats } = setupBatchUI(keys);

  // 5. 创建任务队列
  const tasks = createTaskQueue(keys, selectedProvider);

  // 6. 创建更新回调函数
  const updateCallback = (result, row, type, index) => {
    updateBatchProgress(result, row, stats, type, index);
  };

  // 7. 运行并发检测
  await runConcurrentChecks(tasks, rowsData, concurrency, updateCallback);

  // 8. 完成收尾工作
  finalizeBatchCheck(stats);
}

function showCompletionSummary(validCount, invalidCount, totalCount) {
  const successRate = ((validCount / totalCount) * 100).toFixed(1);
  let message = `检测完成！共检测 ${totalCount} 个密钥，`;
  message += `有效 ${validCount} 个，无效 ${invalidCount} 个`;
  message += `（成功率：${successRate}%）`;
  
  showNotification(message, validCount > 0 ? 'success' : 'info');
}

/**
 * 根据数据数组渲染表格
 * @param {Array} sortedData - 已排序的数据数组
 */
function renderTable(sortedData) {
  const tbody = document.getElementById('batch-results-tbody');
  if (!tbody) return;

  let html = '';
  sortedData.forEach((data, displayIndex) => {
    const shortKey = `${data.key.substring(0, 4)}...${data.key.substring(data.key.length - 4)}`;
    const statusText = data.status === 'valid' ? '有效' :
                      data.status === 'invalid' ? '无效' :
                      data.status === 'checking' ? '检测中...' : '等待检测...';
    const statusClass = data.status === 'valid' ? 'status-valid' :
                       data.status === 'invalid' ? 'status-invalid' :
                       data.status === 'checking' ? 'status-checking' : '';

    // 计算余额显示
    const balanceText = (data.balance !== undefined && data.balance !== null && data.balance !== -1)
      ? data.balance.toFixed(4) : 'N/A';
    
    const chargeBalanceText = data.type === 'siliconflow'
      ? ((data.chargeBalance !== undefined && data.chargeBalance !== null && data.chargeBalance !== -1)
         ? data.chargeBalance.toFixed(4) : '0.0000')
      : 'N/A';
    
    const giftBalanceText = data.type === 'siliconflow'
      ? ((data.giftBalance !== undefined && data.giftBalance !== null && data.giftBalance !== -1)
         ? data.giftBalance.toFixed(4) : '0.0000')
      : 'N/A';

    // 计算模型显示
    let modelText = 'N/A';
    if (data.type === 'custom') {
      const model = batchModelSelectEl.style.display !== 'none'
        ? batchModelSelectEl.value
        : batchModelInputEl.value;
      modelText = model || 'N/A';
    } else {
      modelText = getDefaultModel(data.type) || 'N/A';
    }

    // 计算URL显示
    let urlText = 'N/A';
    if (data.type === 'custom') {
      const endpoint = batchCustomEndpointEl.value;
      if (endpoint) {
        const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
        urlText = `${processedEndpoint}chat/completions`;
      }
    } else {
      urlText = getDefaultApiUrl(data.type);
    }

    html += `
      <tr id="result-row-${data.index}" data-full-key="${data.key}"
          data-is-paid="${data.isPaid}" data-balance="${data.balance}"
          data-charge-balance="${data.chargeBalance}" data-gift-balance="${data.giftBalance}">
        <td>${displayIndex + 1}</td>
        <td>${shortKey}</td>
        <td>${data.type || '未知'}</td>
        <td class="${statusClass}">${statusText}</td>
        <td class="url-cell">${urlText}</td>
        <td class="balance-cell">${balanceText}</td>
        <td class="charge-balance-cell">${chargeBalanceText}</td>
        <td class="gift-balance-cell">${giftBalanceText}</td>
        <td class="model-cell">${modelText}</td>
        <td>${data.message}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  
  // 为每一行添加点击复制功能
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    const data = sortedData[index];
    if (data) {
      // 添加点击样式
      row.style.cursor = 'pointer';
      
      // 添加点击事件监听器
      row.addEventListener('click', () => {
        const textToCopy = formatKeyForCopy(data);
        navigator.clipboard.writeText(textToCopy).then(() => {
          showNotification('已复制到剪贴板！', 'success');
        }, () => {
          showNotification('复制失败！', 'error');
        });
      });
    }
  });
}

let sortDirection = {};

function sortResults(column) {
    if (!resultsData || resultsData.length === 0) return;

    // Set default direction if not set
    if (!sortDirection[column]) {
        sortDirection[column] = 'desc';
    } else {
        sortDirection[column] = sortDirection[column] === 'asc' ? 'desc' : 'asc';
    }
    const direction = sortDirection[column];

    // Reset other column directions
    for (const key in sortDirection) {
        if (key !== column) {
            delete sortDirection[key];
        }
    }
    
    // Update UI indicators
    document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '');
    const header = document.getElementById(`${column}-header`);
    if (header) {
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = direction === 'asc' ? ' ▲' : ' ▼';
        }
    }

    const statusOrder = { 'valid': 0, 'invalid': 1, 'checking': 2, 'pending': 3 };

    // 对数据数组进行排序
    const sortedData = [...resultsData].sort((a, b) => {
        // Always prioritize by status first
        const statusA = statusOrder[a.status] ?? 99;
        const statusB = statusOrder[b.status] ?? 99;

        if (statusA < statusB) return -1;
        if (statusA > statusB) return 1;

        // If status is the same, sort by the selected column
        let valA, valB;
        if (column === 'balance') {
            valA = parseFloat(a.balance);
            valB = parseFloat(b.balance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'chargeBalance') {
            valA = parseFloat(a.chargeBalance);
            valB = parseFloat(b.chargeBalance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'giftBalance') {
            valA = parseFloat(a.giftBalance);
            valB = parseFloat(b.giftBalance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'status') {
            // For status sorting, use charge balance as secondary sort (siliconflow priority)
            valA = parseFloat(a.chargeBalance);
            valB = parseFloat(b.chargeBalance);
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else {
            return 0; // Not sorting by other columns in this version
        }

        let comparison = 0;
        if (valA < valB) {
            comparison = -1;
        } else if (valA > valB) {
            comparison = 1;
        }
        
        let effectiveDirection = direction;
        // When sorting by status, we want higher charge balance first, so descending.
        if (column === 'status') {
            effectiveDirection = 'desc';
        }

        return effectiveDirection === 'asc' ? comparison : -comparison;
    });

    // 使用 renderTable 函数一次性更新 DOM
    renderTable(sortedData);
}


// 用此函数替换现有的 copyResults 函数
function copyResults() {
    const copyType = document.getElementById('copy-option').value;

    if (copyType === 'valid' || copyType === 'valid_keys_only') {
        const validKeys = resultsData.filter(data => data.status === 'valid');
        if (validKeys.length === 0) {
            showNotification('没有可复制的有效结果。', 'error');
            return;
        }

        if (copyType === 'valid_keys_only') {
            const keysOnly = validKeys.map(k => k.key).join('\n');
            navigator.clipboard.writeText(keysOnly).then(() => {
                showNotification('已复制所有有效密钥！', 'success');
            }, () => {
                showNotification('复制失败！', 'error');
            });
            return;
        }

        const paidKeys = validKeys.filter(k => k.isPaid).map(k => {
            const balanceValue = parseFloat(k.balance);
            const chargeBalanceValue = parseFloat(k.chargeBalance);
            const giftBalanceValue = parseFloat(k.giftBalance);
            
            if (!isNaN(balanceValue) && balanceValue !== -1) {
                let balanceInfo = `总余额: ${balanceValue.toFixed(4)}`;
                
                // 为 siliconflow 添加详细余额信息
                if (k.type === 'siliconflow' && !isNaN(chargeBalanceValue) && chargeBalanceValue !== -1 && !isNaN(giftBalanceValue) && giftBalanceValue !== -1) {
                    balanceInfo += ` (充值: ${chargeBalanceValue.toFixed(4)}, 赠送: ${giftBalanceValue.toFixed(4)})`;
                }
                
                return `${k.key} ---- ${balanceInfo}`;
            }
            return k.key;
        });

        const freeKeys = validKeys.filter(k => !k.isPaid).map(k => k.key);

        let clipboardText = '';
        if (paidKeys.length > 0) {
            clipboardText += '付费：\n';
            clipboardText += paidKeys.join('\n') + '\n\n';
        }
        if (freeKeys.length > 0) {
            clipboardText += '免费：\n';
            clipboardText += freeKeys.join('\n');
        }

        navigator.clipboard.writeText(clipboardText.trim()).then(() => {
            showNotification('已复制并分组的有效密钥！', 'success');
        }, () => {
            showNotification('复制失败！', 'error');
        });

    } else { // For 'invalid' and 'all'
        let dataToCopy = [];
        let typeText = '';

        if (copyType === 'invalid') {
            dataToCopy = resultsData.filter(data => data.status === 'invalid');
            typeText = '无效';
        } else { // 'all'
            dataToCopy = [...resultsData];
            typeText = '全部';
        }

        if (dataToCopy.length === 0) {
            showNotification(`没有可复制的${typeText}结果。`, 'error');
            return;
        }

        const clipboardText = dataToCopy.map(formatKeyForCopy).join('\n');

        navigator.clipboard.writeText(clipboardText.trim()).then(() => {
            showNotification(`已复制${typeText}结果！`, 'success');
        }, () => {
            showNotification('复制失败！', 'error');
        });
    }
}

/**
 * 格式化单个密钥对象以用于剪贴板复制
 * @param {object} data - 单个结果对象
 * @returns {string} 格式化后的字符串
 */
function formatKeyForCopy(data) {
    if (data.status === 'valid') {
        const balanceValue = parseFloat(data.balance);
        if (!isNaN(balanceValue) && balanceValue !== -1) {
            let balanceInfo = `总余额: ${balanceValue.toFixed(4)}`;
            const chargeBalanceValue = parseFloat(data.chargeBalance);
            const giftBalanceValue = parseFloat(data.giftBalance);
            // 为 siliconflow 添加详细余额信息
            if (data.type === 'siliconflow' && !isNaN(chargeBalanceValue) && chargeBalanceValue !== -1 && !isNaN(giftBalanceValue) && giftBalanceValue !== -1) {
                balanceInfo += ` (充值: ${chargeBalanceValue.toFixed(4)}, 赠送: ${giftBalanceValue.toFixed(4)})`;
            }
            return `${data.key} ---- ${balanceInfo}`;
        }
        return data.key; // 如果没有余额信息，只返回密钥
    } else {
        // 对无效、检测中或待检测的密钥，显示其消息
        return `${data.key} ---- ${data.message}`;
    }
}


startBatchCheckBtn.addEventListener('click', startBatchCheck);
copyResultsBtn.addEventListener('click', copyResults);

/**
 * 整理密钥输入框中的内容
 */
function tidyKeys() {
  const provider = batchProviderEl.value;
  const text = batchApiKeysEl.value;
  let keys = [];

  if (provider === 'auto') {
    // 自动检测所有类型的 key
    for (const keyType in api.KEY_PATTERNS) {
      const pattern = api.KEY_PATTERNS[keyType];
      const foundKeys = text.match(pattern) || [];
      keys.push(...foundKeys);
    }
  } else {
    // 只检测指定厂商的 key
    const pattern = api.KEY_PATTERNS[provider];
    if (pattern) {
      keys = text.match(pattern) || [];
    }
  }

  // 如果没有找到匹配的密钥，则对原始文本进行基础整理和去重
  if (keys.length === 0) {
    // 按行分割，去除空行和空白字符，然后去重
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    keys = [...new Set(lines)];
  } else {
    // 对找到的密钥进行去重
    keys = [...new Set(keys)];
  }

  // 最终去重并格式化
  const uniqueKeys = [...new Set(keys)];
  batchApiKeysEl.value = uniqueKeys.join('\n');
  
  // 整理后更新行号
  setTimeout(() => {
    updateLineNumbers();
  }, 0);
  
  logger.info(`整理了 ${uniqueKeys.length} 个密钥`, { provider });
}

tidyKeysBtn.addEventListener('click', tidyKeys);

// 更新请求URL预览
function updateBatchRequestUrlPreview(endpoint) {
  if (!batchUrlPreviewEl) return;

  if (endpoint) {
    const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
    const fullUrl = `${processedEndpoint}chat/completions`;
    batchUrlPreviewEl.textContent = `实际请求地址: ${fullUrl}`;
    batchUrlPreviewEl.style.display = "block";
  } else {
    batchUrlPreviewEl.style.display = "none";
  }
}

batchProviderEl.addEventListener('change', () => {
  if (batchProviderEl.value === 'custom') {
    batchCustomProviderOptions.style.display = 'block';
  } else {
    batchCustomProviderOptions.style.display = 'none';
  }
});

// 监听自定义接口地址输入框变化
batchCustomEndpointEl.addEventListener('input', () => {
  updateBatchRequestUrlPreview(batchCustomEndpointEl.value.trim());
});

async function fetchBatchModels() {
   const endpoint = batchCustomEndpointEl.value.trim();
   const apiKey = batchApiKeysEl.value.split('\n').map(k => k.trim()).filter(Boolean)[0];

   if (!endpoint) {
       showNotification('请输入接口地址', 'error');
       return;
   }
   if (!apiKey) {
       showNotification('请输入至少一个API密钥用于获取模型', 'error');
       return;
   }

   fetchBatchModelsBtn.textContent = '获取中...';
   fetchBatchModelsBtn.disabled = true;

   try {
       const models = await api.fetchModels(endpoint, apiKey);
       batchModelSelectEl.innerHTML = '';
       if (models.length > 0) {
           models.forEach(model => {
               const option = document.createElement('option');
               option.value = model.id;
               option.textContent = model.id;
               batchModelSelectEl.appendChild(option);
           });
       } else {
           showNotification('未能获取到模型列表，您可以尝试手动输入模型名称。', 'info');
       }
   } catch (error) {
       showNotification(`获取模型失败: ${error.message}。您可以切换到手动输入模式。`, 'error');
       logger.error('获取批量检测模型失败', error);
   } finally {
       fetchBatchModelsBtn.textContent = '获取模型';
       fetchBatchModelsBtn.disabled = false;
   }
}

fetchBatchModelsBtn.addEventListener('click', fetchBatchModels);

toggleBatchModelBtn.addEventListener('click', () => {
   const isSelectVisible = batchModelSelectEl.style.display !== 'none';
   if (isSelectVisible) {
       batchModelSelectEl.style.display = 'none';
       batchModelInputEl.style.display = 'inline-block';
       toggleBatchModelBtn.textContent = '选择模型';
   } else {
       batchModelSelectEl.style.display = 'inline-block';
       batchModelInputEl.style.display = 'none';
       toggleBatchModelBtn.textContent = '手动输入';
   }
});

// 初始化时设置手动输入模型的默认值
batchModelInputEl.value = 'gpt-3.5-turbo';

// 存储上次的行数，避免不必要的更新
let lastLineCount = 0;

// 行号功能
function updateLineNumbers() {
    if (!batchLineNumbersEl || !batchApiKeysEl) return;
    
    const text = batchApiKeysEl.value;
    const lineCount = text ? text.split('\n').length : 1;
    
    // 只有行数变化时才更新行号 DOM
    if (lineCount === lastLineCount) return;
    
    const previousLineCount = lastLineCount;
    lastLineCount = lineCount;
    
    // 使用更高效的方式生成行号
    const lineNumbers = [];
    for (let i = 1; i <= lineCount; i++) {
        lineNumbers.push(i);
    }
    
    batchLineNumbersEl.textContent = lineNumbers.join('\n');
    
    // 只在行数位数发生变化时才调整宽度
    const currentDigits = lineCount.toString().length;
    const previousDigits = previousLineCount.toString().length;
    
    if (currentDigits !== previousDigits) {
        const minWidth = Math.max(35, currentDigits * 9 + 16);
        batchLineNumbersEl.style.minWidth = minWidth + 'px';
        batchLineNumbersEl.style.maxWidth = Math.min(65, minWidth) + 'px';
    }
}

/**
 * 自动识别和去重密钥（在文本框内容变化时触发）
 */
function autoDetectAndDeduplicateKeys() {
  const provider = batchProviderEl.value;
  const text = batchApiKeysEl.value;
  
  // 如果文本为空，直接返回
  if (!text.trim()) {
    return;
  }
  
  let keys = [];

  if (provider === 'auto') {
    // 自动检测所有类型的 key
    for (const keyType in api.KEY_PATTERNS) {
      const pattern = api.KEY_PATTERNS[keyType];
      const foundKeys = text.match(pattern) || [];
      keys.push(...foundKeys);
    }
  } else {
    // 只检测指定厂商的 key
    const pattern = api.KEY_PATTERNS[provider];
    if (pattern) {
      keys = text.match(pattern) || [];
    }
  }

  // 如果找到了匹配的密钥，进行去重并更新文本框
  if (keys.length > 0) {
    // 对找到的密钥进行去重
    const uniqueKeys = [...new Set(keys)];
    const newText = uniqueKeys.join('\n');
    
    // 只有当内容发生变化时才更新，避免无限循环
    if (newText !== text.trim()) {
      batchApiKeysEl.value = newText;
      // 更新行号（但不再次触发自动识别，避免递归）
      setTimeout(() => {
        updateLineNumbers();
      }, 0);
    }
  }
}

// 同步滚动
function syncScroll() {
    if (!batchLineNumbersEl || !batchApiKeysEl) return;
    batchLineNumbersEl.scrollTop = batchApiKeysEl.scrollTop;
}

// 初始化行号
function initLineNumbers() {
    if (!batchApiKeysEl || !batchLineNumbersEl) return;
    
    // 同步高度
    function syncHeight() {
        const textareaHeight = batchApiKeysEl.offsetHeight;
        batchLineNumbersEl.style.height = textareaHeight + 'px';
    }
    
    // 创建节流版本的更新函数，包含自动识别和去重
    const throttledUpdateLineNumbers = throttle(() => {
        updateLineNumbers();
        syncHeight();
        autoDetectAndDeduplicateKeys();
    }, 100);
    
    const throttledSyncHeight = throttle(syncHeight, 50);
    
    // 初始显示行号和同步高度
    updateLineNumbers();
    syncHeight();
    
    // 监听输入事件 - 使用节流优化性能
    batchApiKeysEl.addEventListener('input', throttledUpdateLineNumbers);
    
    // 监听滚动事件 - 直接同步，保持流畅性
    batchApiKeysEl.addEventListener('scroll', syncScroll, { passive: true });
    
    // 监听 textarea 大小变化
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(throttledSyncHeight);
        resizeObserver.observe(batchApiKeysEl);
    }
}

// 页面加载完成后初始化行号
document.addEventListener('DOMContentLoaded', initLineNumbers);

// 如果DOM已经加载完成，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLineNumbers);
} else {
    initLineNumbers();
}

logger.info('批量检测模块已加载');