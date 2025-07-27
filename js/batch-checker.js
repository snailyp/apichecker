import * as api from './api-services.js';
import * as logger from './logger.js';
import { showNotification } from './ui-utils.js';

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
  batchStatsEl.classList.remove('completed'); // 移除完成状态
  validCountEl.textContent = '0';
  invalidCountEl.textContent = '0';
  batchProgressContainer.style.display = 'block';
  batchProgressBar.style.width = '0%';
  batchProgressText.textContent = `0 / ${keys.length}`;

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

  function renderRow(key, type, status, message, index) {
    const shortKey = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    const row = document.createElement('tr');
    row.id = `result-row-${index}`;
    row.dataset.fullKey = key; // 存储完整密钥
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${shortKey}</td>
      <td>${type || '未知'}</td>
      <td class="status-${status}">${status}</td>
      <td class="balance-cell">N/A</td>
      <td class="charge-balance-cell">N/A</td>
      <td class="gift-balance-cell">N/A</td>
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
      animateCountUpdate(validCountEl, validCount);
    } else {
      invalidCount++;
      animateCountUpdate(invalidCountEl, invalidCount);
    }
  }

  function animateCountUpdate(element, newValue) {
    element.classList.add('updating');
    setTimeout(() => {
      element.textContent = newValue;
      element.classList.remove('updating');
    }, 200);
  }

  const checkKey = async (keyData, index) => {
    const { key, type, row } = keyData;
    const statusCell = row.cells[3];
    const balanceCell = row.cells[4];
    const chargeBalanceCell = row.cells[5];
    const giftBalanceCell = row.cells[6];
    const modelCell = row.cells[7];
    const messageCell = row.cells[8];

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
    
    row.dataset.isPaid = result.isPaid;
    row.dataset.balance = result.balance ?? -1;
    row.dataset.chargeBalance = result.chargeBalance ?? -1;
    row.dataset.giftBalance = result.giftBalance ?? -1;

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
        const defaultModels = {
            'openai': 'gpt-4o',
            'claude': 'claude-3-5-sonnet-20241022',
            'gemini': 'gemini-1.5-flash',
            'deepseek': 'deepseek-chat',
            'groq': 'llama-3.3-70b-versatile',
            'siliconflow': 'Qwen/Qwen2.5-72B-Instruct',
            'xai': 'grok-3-mini',
            'openrouter': 'openrouter/auto'
        };
        modelCell.textContent = defaultModels[type] || 'N/A';
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

  // 隐藏进度条，但保持统计信息显示
  setTimeout(() => {
      batchProgressContainer.style.display = 'none';
      // 不隐藏统计信息，让用户能看到最终结果
      // batchStatsEl.style.display = 'none';
      
      // 添加完成状态的视觉反馈
      batchStatsEl.classList.add('completed');
      
      // 显示完成提示
      showCompletionSummary(validCount, invalidCount, keys.length);
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

function showCompletionSummary(validCount, invalidCount, totalCount) {
  const successRate = ((validCount / totalCount) * 100).toFixed(1);
  let message = `检测完成！共检测 ${totalCount} 个密钥，`;
  message += `有效 ${validCount} 个，无效 ${invalidCount} 个`;
  message += `（成功率：${successRate}%）`;
  
  showNotification(message, validCount > 0 ? 'success' : 'info');
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
        } else if (column === 'chargeBalance') {
            valA = parseFloat(a.dataset.chargeBalance);
            valB = parseFloat(b.dataset.chargeBalance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'giftBalance') {
            valA = parseFloat(a.dataset.giftBalance);
            valB = parseFloat(b.dataset.giftBalance);
            // N/A (-1) is always at the bottom
            if (valA === -1) valA = -Infinity;
            if (valB === -1) valB = -Infinity;
        } else if (column === 'status') {
            // For status sorting, use charge balance as secondary sort (siliconflow priority)
            valA = parseFloat(a.dataset.chargeBalance);
            valB = parseFloat(b.dataset.chargeBalance);
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

    tbody.innerHTML = '';
    rows.forEach(row => tbody.appendChild(row));
}


function copyResults() {
    const rows = Array.from(batchResultsEl.querySelectorAll('tr[data-full-key]'));
    const validKeys = rows.map(row => {
        const key = row.dataset.fullKey;
        const isPaid = row.dataset.isPaid === 'true';
        const balance = row.dataset.balance;
        const chargeBalance = row.dataset.chargeBalance;
        const giftBalance = row.dataset.giftBalance;
        const isValid = row.querySelector('.status-valid');
        return isValid ? { key, isPaid, balance, chargeBalance, giftBalance } : null;
    }).filter(Boolean);

    if (validKeys.length === 0) {
        showNotification('没有可复制的有效密钥。', 'error');
        return;
    }

    const paidKeys = validKeys.filter(k => k.isPaid).map(k => {
        const balanceValue = parseFloat(k.balance);
        const chargeBalanceValue = parseFloat(k.chargeBalance);
        const giftBalanceValue = parseFloat(k.giftBalance);
        
        if (!isNaN(balanceValue) && balanceValue !== -1) {
            let balanceInfo = `总余额: ${balanceValue.toFixed(4)}`;
            
            // 如果有充值余额和赠送余额信息（siliconflow），则显示详细信息
            if (!isNaN(chargeBalanceValue) && chargeBalanceValue !== -1 &&
                !isNaN(giftBalanceValue) && giftBalanceValue !== -1) {
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
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // 只有行数变化时才更新行号
    if (lineCount === lastLineCount) return;
    lastLineCount = lineCount;
    
    let lineNumbersHtml = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersHtml += i + '\n';
    }
    
    batchLineNumbersEl.textContent = lineNumbersHtml;
    
    // 根据行数动态调整行号区域宽度
    const maxDigits = lineCount.toString().length;
    const minWidth = Math.max(35, maxDigits * 9 + 16); // 调整宽度计算
    batchLineNumbersEl.style.minWidth = minWidth + 'px';
    batchLineNumbersEl.style.maxWidth = Math.min(65, minWidth) + 'px';
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
    
    // 初始显示行号和同步高度
    updateLineNumbers();
    syncHeight();
    
    // 监听输入事件 - 只在行数变化时更新
    batchApiKeysEl.addEventListener('input', () => {
        updateLineNumbers();
        syncHeight();
    });
    
    // 监听滚动事件 - 直接同步，不使用requestAnimationFrame避免延迟
    batchApiKeysEl.addEventListener('scroll', syncScroll, { passive: true });
    
    // 监听键盘事件（处理回车、删除等可能改变行数的操作）
    batchApiKeysEl.addEventListener('keydown', (e) => {
        // 只在可能改变行数的按键时延迟更新
        if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
            setTimeout(() => {
                updateLineNumbers();
                syncHeight();
            }, 0);
        }
    });
    
    // 监听粘贴事件
    batchApiKeysEl.addEventListener('paste', () => {
        setTimeout(() => {
            updateLineNumbers();
            syncHeight();
        }, 0);
    });
    
    // 监听剪切事件
    batchApiKeysEl.addEventListener('cut', () => {
        setTimeout(() => {
            updateLineNumbers();
            syncHeight();
        }, 0);
    });
    
    // 监听 textarea 大小变化
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            syncHeight();
        });
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