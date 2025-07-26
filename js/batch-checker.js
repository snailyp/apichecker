import * as api from './api-services.js';
import * as logger from './logger.js';
import { showNotification } from './ui-utils.js';

const batchApiKeysEl = document.getElementById('batchApiKeys');
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


async function startBatchCheck() {
  const keys = batchApiKeysEl.value.split('\n').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    batchResultsEl.innerHTML = '<p>请输入至少一个API密钥。</p>';
    return;
  }

  const concurrency = parseInt(concurrencyLimitEl.value, 10) || 5;
  let activeChecks = 0;
  const queue = [...keys];
  const results = [];
  let completedChecks = 0;
  let validCount = 0;
  let invalidCount = 0;

  // 重置并显示进度条和统计信息
  batchStatsEl.style.display = 'block';
  validCountEl.textContent = '0';
  invalidCountEl.textContent = '0';
  batchProgressContainer.style.display = 'block';
  batchProgressBar.style.width = '0%';
  batchProgressText.textContent = `0 / ${keys.length}`;

  batchResultsEl.innerHTML = `
    <h3>检测结果 (共 ${keys.length} 个密钥)</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>密钥 (部分)</th>
          <th>类型</th>
          <th id="status-header" style="cursor: pointer;">状态<span class="sort-indicator"></span></th>
          <th id="balance-header" style="cursor: pointer;">余额<span class="sort-indicator"></span></th>
          <th>模型</th>
          <th>信息</th>
        </tr>
      </thead>
      <tbody id="batch-results-tbody">
      </tbody>
    </table>
  `;
  const tbody = document.getElementById('batch-results-tbody');

  function renderRow(key, type, status, message, index) {
    const shortKey = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    const row = document.createElement('tr');
    row.id = `result-row-${index}`;
    row.dataset.fullKey = key; // 存储完整密钥
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${shortKey}</td>
      <td>${type || '未知'}</td>
      <td class="status-${status}">${status}</td>
      <td class="balance-cell">N/A</td>
      <td class="model-cell"></td>
      <td>${message}</td>
    `;
    tbody.appendChild(row);
    return row;
  }
  
  keys.forEach((key, index) => {
      const selectedProvider = batchProviderEl.value;
      const type = selectedProvider === 'auto' ? detectKeyType(key) : selectedProvider;
      const row = renderRow(key, type, 'pending', '等待检测...', index);
      results.push({ key, type, row, status: 'pending' });
  });


  function updateProgress() {
    completedChecks++;
    const percentage = (completedChecks / keys.length) * 100;
    batchProgressBar.style.width = `${percentage}%`;
    batchProgressText.textContent = `${completedChecks} / ${keys.length}`;
  }

  function updateStats(isValid) {
    if (isValid) {
      validCount++;
      validCountEl.textContent = validCount;
    } else {
      invalidCount++;
      invalidCountEl.textContent = invalidCount;
    }
  }

  const checkKey = async (keyData, index) => {
    const { key, type, row } = keyData;
    const statusCell = row.cells[3];
    const balanceCell = row.cells[4];
    const modelCell = row.cells[5];
    const messageCell = row.cells[6];

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
    row.dataset.isPaid = result.isPaid;
    row.dataset.balance = result.balance ?? -1; // 使用 ?? 来处理 undefined 或 null

    statusCell.textContent = result.success ? '有效' : '无效';
    statusCell.className = result.success ? 'status-valid' : 'status-invalid';
    if (result.balance !== undefined && result.balance !== null) {
        balanceCell.textContent = result.balance.toFixed(4);
    } else {
        balanceCell.textContent = 'N/A';
    }
    messageCell.innerHTML = result.message;

    // 如果是自定义类型，显示测试时使用的模型
    if (type === 'custom') {
        const model = batchModelSelectEl.style.display !== 'none'
            ? batchModelSelectEl.value
            : batchModelInputEl.value;
        modelCell.textContent = model || 'N/A';
    }

    updateProgress();
    updateStats(result.success);
  };

  const worker = async () => {
    while (queue.length > 0) {
      activeChecks++;
      const key = queue.shift();
      const keyData = results.find(r => r.key === key);
      const index = results.indexOf(keyData);
      await checkKey(keyData, index);
      activeChecks--;
    }
  };

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  logger.info('批量检测完成', { total: keys.length });

  // 隐藏进度条
  setTimeout(() => {
      batchProgressContainer.style.display = 'none';
      batchStatsEl.style.display = 'none';
  }, 1000);

  // 默认按状态和余额排序
  sortResults('status');

  // 添加排序事件监听器
  const balanceHeader = document.getElementById('balance-header');
  if (balanceHeader) {
      balanceHeader.addEventListener('click', () => sortResults('balance'));
  }
  const statusHeader = document.getElementById('status-header');
  if (statusHeader) {
      statusHeader.addEventListener('click', () => sortResults('status'));
  }
}

let sortDirection = {};

function sortResults(column) {
    const tbody = document.getElementById('batch-results-tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));

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
    
    // Update UI
    document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '');
    const header = document.getElementById(`${column}-header`);
    if (header) {
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = direction === 'asc' ? ' ▲' : ' ▼';
        }
    }

    const statusOrder = { '有效': 0, '无效': 1, '检测中...': 2, '等待检测...': 3 };

    rows.sort((a, b) => {
        // Always prioritize by status first
        const statusTextA = a.cells[3].textContent.trim();
        const statusTextB = b.cells[3].textContent.trim();
        const statusA = statusOrder[statusTextA] ?? 99;
        const statusB = statusOrder[statusTextB] ?? 99;

        if (statusA < statusB) return -1;
        if (statusA > statusB) return 1;

        // If status is the same, sort by the selected column
        let valA, valB;
        if (column === 'balance') {
            valA = parseFloat(a.dataset.balance);
            valB = parseFloat(b.dataset.balance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'status') {
            // Already sorted by status, so we can use a secondary sort, e.g. balance
            valA = parseFloat(a.dataset.balance);
            valB = parseFloat(b.dataset.balance);
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
        // When sorting by status, we want higher balance first, so descending.
        if (column === 'status') {
            effectiveDirection = 'desc';
        }

        return effectiveDirection === 'asc' ? comparison : -comparison;
    });

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}


function copyResults() {
    const rows = Array.from(batchResultsEl.querySelectorAll('tr[data-full-key]'));
    const validKeys = rows.map(row => {
        const key = row.dataset.fullKey;
        const isPaid = row.dataset.isPaid === 'true';
        const balance = row.dataset.balance;
        const isValid = row.querySelector('.status-valid');
        return isValid ? { key, isPaid, balance } : null;
    }).filter(Boolean);

    if (validKeys.length === 0) {
        showNotification('没有可复制的有效密钥。', 'error');
        return;
    }

    const paidKeys = validKeys.filter(k => k.isPaid).map(k => {
        const balanceValue = parseFloat(k.balance);
        if (!isNaN(balanceValue) && balanceValue !== -1) {
            return `${k.key} ---- 余额: ${balanceValue.toFixed(4)}`;
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

  // 去重并格式化
  const uniqueKeys = [...new Set(keys)];
  batchApiKeysEl.value = uniqueKeys.join('\n');
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

logger.info('批量检测模块已加载');