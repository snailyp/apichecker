import * as api from './api-services.js';
import * as logger from './logger.js';

const batchApiKeysEl = document.getElementById('batchApiKeys');
const concurrencyLimitEl = document.getElementById('concurrencyLimit');
const startBatchCheckBtn = document.getElementById('startBatchCheckBtn');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const batchResultsEl = document.getElementById('batchResults');
const batchProviderEl = document.getElementById('batchProvider');
const tidyKeysBtn = document.getElementById('tidyKeysBtn');

const keyCheckMap = {
  openai: api.checkOpenAIKey,
  claude: api.checkClaudeKey,
  gemini: api.checkGeminiKey,
  deepseek: api.checkDeepseekKey,
  groq: api.checkGroqKey,
  siliconflow: api.checkSiliconflowKey,
  xai: api.checkXAIKey,
  openrouter: api.checkOpenRouterKey,
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

  batchResultsEl.innerHTML = `
    <h3>检测结果 (共 ${keys.length} 个密钥)</h3>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>密钥 (部分)</th>
          <th>类型</th>
          <th>状态</th>
          <th id="balance-header" style="cursor: pointer;">余额 ↕️</th>
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


  const checkKey = async (keyData, index) => {
    const { key, type, row } = keyData;
    const statusCell = row.cells[3];
    const balanceCell = row.cells[4];
    const messageCell = row.cells[5];

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

  // 添加排序事件监听器
  const balanceHeader = document.getElementById('balance-header');
  if (balanceHeader) {
      balanceHeader.addEventListener('click', () => sortResults('balance'));
  }
}

let sortDirection = {};

function sortResults(column) {
    const tbody = document.getElementById('batch-results-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // 初始化或切换排序方向
    sortDirection[column] = sortDirection[column] === 'asc' ? 'desc' : 'asc';
    const direction = sortDirection[column];

    rows.sort((a, b) => {
        let valA, valB;

        if (column === 'balance') {
            valA = parseFloat(a.dataset.balance);
            valB = parseFloat(b.dataset.balance);
            // 将 N/A (-1) 视为最低优先级
            if (valA === -1) valA = direction === 'asc' ? -Infinity : Infinity;
            if (valB === -1) valB = direction === 'asc' ? -Infinity : Infinity;
        } else {
            // 可以扩展到其他列的排序
            const cellIndex = Array.from(a.parentElement.children).indexOf(a);
            valA = a.cells[cellIndex].textContent.trim();
            valB = b.cells[cellIndex].textContent.trim();
        }

        if (valA < valB) {
            return direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    // 重新渲染表格
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
        alert('没有可复制的有效密钥。');
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
        alert('已复制并分组的有效密钥！');
    }, () => {
        alert('复制失败！');
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

logger.info('批量检测模块已加载');