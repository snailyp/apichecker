import * as api from './api-services.js';
import * as logger from './logger.js';

const batchApiKeysEl = document.getElementById('batchApiKeys');
const concurrencyLimitEl = document.getElementById('concurrencyLimit');
const startBatchCheckBtn = document.getElementById('startBatchCheckBtn');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const batchResultsEl = document.getElementById('batchResults');
const batchProviderEl = document.getElementById('batchProvider');

const keyCheckMap = {
  openai: api.checkOpenAIKey,
  claude: api.checkClaudeKey,
  gemini: api.checkGeminiKey,
  deepseek: api.checkDeepseekKey,
  groq: api.checkGroqKey,
  siliconflow: api.checkSiliconflowKey,
  xai: api.checkXAIKey,
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
    const messageCell = row.cells[4];

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
    row.dataset.isPaid = result.isPaid;

    statusCell.textContent = result.success ? '有效' : '无效';
    statusCell.className = result.success ? 'status-valid' : 'status-invalid';
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
}

function copyResults() {
    const rows = Array.from(batchResultsEl.querySelectorAll('tr[data-full-key]'));
    const validKeys = rows.map(row => {
        const key = row.dataset.fullKey;
        const isPaid = row.dataset.isPaid === 'true';
        const isValid = row.querySelector('.status-valid');
        return isValid ? { key, isPaid } : null;
    }).filter(Boolean);

    if (validKeys.length === 0) {
        alert('没有可复制的有效密钥。');
        return;
    }

    const paidKeys = validKeys.filter(k => k.isPaid).map(k => k.key);
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

logger.info('批量检测模块已加载');