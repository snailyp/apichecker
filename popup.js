document
  .getElementById("checkButton")
  .addEventListener("click", async function (e) {
    e.preventDefault();

    const openaiKey = document.getElementById("openaiKey").value.trim();
    const claudeKey = document.getElementById("claudeKey").value.trim();
    const geminiKey = document.getElementById("geminiKey").value.trim();
    const deepseekKey = document.getElementById("deepseekKey").value.trim();
    const groqKey = document.getElementById("groqKey").value.trim();
    const siliconflowKey = document
      .getElementById("siliconflowKey")
      .value.trim();
    const customEndpoint = document
      .getElementById("customEndpoint")
      .value.trim();
    const xaiKey = document.getElementById("xaiKey").value.trim();

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "正在检测，请稍候...";

    const results = [];

    // 检测 OpenAI API 密钥
    if (openaiKey) {
      try {
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }
        );
        if (openaiResponse.ok) {
          results.push("✅ OpenAI API 密钥有效。");
          await saveValidKey("openai", openaiKey);
        } else {
          const errorData = await openaiResponse.json();
          results.push(
            `❌ OpenAI API 错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ OpenAI API 错误：${error.message}`);
      }
    }

    // 检测 Claude API 密钥
    if (claudeKey) {
      try {
        const claudeResponse = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "x-api-key": claudeKey,
              "anthropic-version": "2023-06-01",
              "Content-Type": "application/json",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: "claude-3-sonnet-20240229",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }
        );
        if (claudeResponse.ok) {
          results.push("✅ Claude API 密钥有效。");
          await saveValidKey("claude", claudeKey);
        } else {
          const errorData = await claudeResponse.json();
          results.push(
            `❌ Claude API 错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ Claude API 错误：${error.message}`);
      }
    }

    // 检测 Gemini API 密钥
    if (geminiKey) {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: "Hi" }],
                },
              ],
            }),
          }
        );
        if (geminiResponse.ok) {
          results.push("✅ Gemini API 密钥有效。");
          await saveValidKey("gemini", geminiKey);
        } else {
          const errorData = await geminiResponse.json();
          results.push(
            `❌ Gemini API 错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ Gemini API 错误：${error.message}`);
      }
    }

    // 检测 Deepseek API 密钥
    if (deepseekKey) {
      try {
        // 并行发送两个请求
        const [completionResponse, balanceResponse] = await Promise.all([
          // 原有的 API 可用性检测
          fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${deepseekKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }),
          // 新增余额查询
          fetch("https://api.deepseek.com/user/balance", {
            headers: {
              Authorization: `Bearer ${deepseekKey}`,
              Accept: "application/json",
            },
          }),
        ]);

        if (completionResponse.ok && balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          const balanceInfo = balanceData.balance_infos[0];
          results.push(
            "✅ Deepseek API 密钥有效。",
            `💰 余额信息：`,
            `- 总余额：${balanceInfo.total_balance} ${balanceInfo.currency}`,
            `- 赠送余额：${balanceInfo.granted_balance} ${balanceInfo.currency}`,
            `- 充值余额：${balanceInfo.topped_up_balance} ${balanceInfo.currency}`
          );
          await saveValidKey("deepseek", deepseekKey);
        } else {
          if (!completionResponse.ok) {
            const errorData = await completionResponse.json();
            results.push(
              `❌ Deepseek API 错误：${errorData.error?.message || "未知错误"}`
            );
          }
          if (!balanceResponse.ok) {
            const balanceError = await balanceResponse.json();
            results.push(
              `❌ Deepseek 余额查询错误：${
                balanceError.error?.message || "未知错误"
              }`
            );
          }
        }
      } catch (error) {
        results.push(`❌ Deepseek API 错误：${error.message}`);
      }
    }

    // 检测 Groq API 密钥
    if (groqKey) {
      try {
        const groqResponse = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "mixtral-8x7b-32768",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }
        );
        if (groqResponse.ok) {
          results.push("✅ Groq API 密钥有效。");
          await saveValidKey("groq", groqKey);
        } else {
          const errorData = await groqResponse.json();
          results.push(
            `❌ Groq API 错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ Groq API 错误：${error.message}`);
      }
    }

    // 检测 Siliconflow API 密钥
    if (siliconflowKey) {
      try {
        // 并行发送两个请求
        const [completionResponse, userInfoResponse] = await Promise.all([
          // 原有的 API 可用性检测
          fetch("https://api.siliconflow.cn/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${siliconflowKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "Qwen/Qwen2-72B-Instruct",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }),
          // 新增用户信息查询
          fetch("https://api.siliconflow.cn/v1/user/info", {
            headers: {
              Authorization: `Bearer ${siliconflowKey}`,
            },
          }),
        ]);

        if (completionResponse.ok && userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          if (userInfo.status && userInfo.code === 20000) {
            const data = userInfo.data;
            results.push(
              "✅ Siliconflow API 密钥有效。",
              `💰 余额信息：`,
              `- 总余额：${data.totalBalance} CNY`,
              `- 充值余额：${data.chargeBalance} CNY`,
              `- 赠送余额：${data.balance} CNY`
            );
            await saveValidKey("siliconflow", siliconflowKey);
          } else {
            results.push(
              `❌ Siliconflow 用户信息查询失败：${userInfo.message}`
            );
          }
        } else {
          if (!completionResponse.ok) {
            const errorData = await completionResponse.json();
            results.push(
              `❌ Siliconflow API 错误：${
                errorData.error?.message || "未知错误"
              }`
            );
          }
          if (!userInfoResponse.ok) {
            const userInfoError = await userInfoResponse.json();
            results.push(
              `❌ Siliconflow 用户信息查询错误：${
                userInfoError.message || "未知错误"
              }`
            );
          }
        }
      } catch (error) {
        results.push(`❌ Siliconflow API 错误：${error.message}`);
      }
    }

    // xAI API 检测
    if (xaiKey) {
      try {
        const xaiResponse = await fetch(
          "https://api.x.ai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${xaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-beta",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 10,
            }),
          }
        );
        if (xaiResponse.ok) {
          results.push("✅ xAI API 密钥有效。");
          await saveValidKey("xai", xaiKey);
        } else {
          const errorData = await xaiResponse.json();
          results.push(
            `❌ xAI API 错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ xAI API 错误：${error.message}`);
      }
    }

    // 检测自定义 OpenAI 兼容接口
    if (customEndpoint) {
      try {
        const modelSelect = document.getElementById("modelSelect");
        const selectedModel = modelSelect.value || "gpt-3.5-turbo";
        const customApiKey = document
          .getElementById("customApiKey")
          .value.trim();

        // 处理 endpoint 的结尾斜杠
        const processedEndpoint = customEndpoint.endsWith("/")
          ? customEndpoint
          : customEndpoint + "/v1/";

        // 并行发送请求：API 可用性检测、额度查询和使用情况查询
        const [completionResponse, quotaResponse, usageResponse] =
          await Promise.all([
            // 原有的 API 可用性检测
            fetch(`${processedEndpoint}chat/completions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${customApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: "user", content: "Hi" }],
                max_tokens: 10,
              }),
            }),
            // 额度查询
            fetch(`${customEndpoint}/dashboard/billing/subscription`, {
              headers: {
                Authorization: `Bearer ${customApiKey}`,
              },
            }),
            // 使用情况查询
            fetch(
              `${customEndpoint}/dashboard/billing/usage?start_date=${getStartDate()}&end_date=${getEndDate()}`,
              {
                headers: {
                  Authorization: `Bearer ${customApiKey}`,
                },
              }
            ),
          ]);

        if (completionResponse.ok) {
          results.push("✅ 自定义 OpenAI 兼容接口可用。");
          await saveValidKey("custom", customApiKey, customEndpoint);

          // 处理额度信息
          if (quotaResponse.ok && usageResponse.ok) {
            const quotaData = await quotaResponse.json();
            const usageData = await usageResponse.json();

            const quotaInfo = quotaData.hard_limit_usd
              ? `${quotaData.hard_limit_usd.toFixed(2)} $`
              : "无法获取";
            const usedInfo = `${(usageData.total_usage / 100).toFixed(2)} $`;
            const remainInfo = quotaData.hard_limit_usd
              ? `${(
                  quotaData.hard_limit_usd -
                  usageData.total_usage / 100
                ).toFixed(2)} $`
              : "无法计算";

            results.push(
              `💰 额度信息：`,
              `- 总额度：${quotaInfo}`,
              `- 已用额度：${usedInfo}`,
              `- 剩余额度：${remainInfo}`
            );
          }
        } else {
          const errorData = await completionResponse.json();
          results.push(
            `❌ 自定义接口错误：${errorData.error?.message || "未知错误"}`
          );
        }
      } catch (error) {
        results.push(`❌ 自定义接口错误：${error.message}`);
      }
    }

    // 辅助函数：获取当月开始日期
    function getStartDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      return `${year}-${month}-01`;
    }

    // 辅助函数：获取当前日期
    function getEndDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    // 如果没有输入任何 API 密钥
    if (
      !openaiKey &&
      !claudeKey &&
      !geminiKey &&
      !deepseekKey &&
      !groqKey &&
      !siliconflowKey &&
      !xaiKey &&
      !customEndpoint
    ) {
      results.push("⚠️ 请至少输入一个 API 密钥进行检测。");
    }

    resultDiv.innerHTML = results.join("<br />");
  });

// 修改清空按钮功能
document.getElementById("clearButton").addEventListener("click", function () {
  // 清空所有输入框
  document.getElementById("openaiKey").value = "";
  document.getElementById("claudeKey").value = "";
  document.getElementById("geminiKey").value = "";
  document.getElementById("deepseekKey").value = "";
  document.getElementById("groqKey").value = "";
  document.getElementById("siliconflowKey").value = "";
  document.getElementById("customEndpoint").value = "";
  document.getElementById("customApiKey").value = "";
  document.getElementById("xaiKey").value = "";
  document.getElementById("result").innerHTML = "";

  // 清空所有密钥选择区域
  document.querySelectorAll(".key-selection").forEach((el) => el.remove());
});

// 获取模型列表的函数
async function fetchModels(endpoint, apiKey) {
  const modelSelect = document.getElementById("modelSelect");
  const resultDiv = document.getElementById("result");

  // 处理 endpoint 的结尾���
  const processedEndpoint = endpoint.endsWith("/")
    ? endpoint
    : endpoint + "/v1/";

  try {
    const response = await fetch(`${processedEndpoint}models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("获取模型列表失败");
    }

    const data = await response.json();
    const models = data.data || [];

    modelSelect.innerHTML = "";

    if (models.length > 0) {
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });
      resultDiv.innerHTML = "✅ 成功获取模型列表";
    } else {
      modelSelect.innerHTML =
        '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
      throw new Error("未找到可用模型");
    }
  } catch (error) {
    console.error("获取模型列表错误:", error);
    modelSelect.innerHTML =
      '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
    resultDiv.innerHTML = `❌ 获取模型列表失败：${error.message}`;
    return [];
  }
}

// 处理模型列表更新的函数
function handleModelListUpdate() {
  const endpoint = document.getElementById("customEndpoint").value.trim();
  const customApiKey = document.getElementById("customApiKey").value.trim();

  if (endpoint && customApiKey) {
    fetchModels(endpoint, customApiKey);
  } else {
    const modelSelect = document.getElementById("modelSelect");
    modelSelect.innerHTML =
      '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
  }
}

// 监听两个输入框的变化
document
  .getElementById("customEndpoint")
  .addEventListener("input", handleModelListUpdate);
document
  .getElementById("customApiKey")
  .addEventListener("input", handleModelListUpdate);

// 添加显示实际请求地址的函数
function updateRequestUrl() {
  const customEndpoint = document.getElementById("customEndpoint").value.trim();
  const urlPreviewDiv = document.getElementById("urlPreview");

  if (customEndpoint) {
    const processedEndpoint = customEndpoint.endsWith("/")
      ? customEndpoint
      : customEndpoint + "/v1/";
    const fullUrl = `${processedEndpoint}chat/completions`;
    urlPreviewDiv.textContent = `实际请求地址: ${fullUrl}`;
    urlPreviewDiv.style.display = "block";
  } else {
    urlPreviewDiv.style.display = "none";
  }
}

// 监听自定义接口输入框的变化
document
  .getElementById("customEndpoint")
  .addEventListener("input", updateRequestUrl);

// 定义 API 密钥的正则表达式
const KEY_PATTERNS = {
  siliconflow: /sk-[a-zA-Z0-9]{48}/g,
  claude: /sk-ant-api03-\S{95}/g,
  gemini: /AIzaSy\S{33}/g,
  deepseek: /sk-[a-zA-Z0-9]{32}/g,
  openai:
    /(sk-[a-zA-Z0-9]{48}|sk-proj-\S{48}|sk-proj-\S{124}|sk-proj-\S{156})/g,
  groq: /gsk_[a-zA-Z0-9]{52}/g,
  xai: /xai-[a-zA-Z0-9]{80}/g,
  custom: /sk-[a-zA-Z0-9]+/g,
};

// 修改自动识别功能
document
  .getElementById("autoFillButton")
  .addEventListener("click", async function () {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "正在搜索 API 密钥...";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.innerText,
      });

      // 存储找到的所有密钥
      const foundKeys = {};

      // 搜索所有类型的密钥
      for (const [platform, pattern] of Object.entries(KEY_PATTERNS)) {
        const matches = [...new Set(result.match(pattern) || [])]; // 使用 Set 去重
        if (matches.length > 0) {
          foundKeys[platform] = matches;
        }
      }

      // 为每个平台创建密钥选择区域
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

          // 创建选择区域
          const selectionDiv = document.createElement("div");
          selectionDiv.className = "key-selection";
          selectionDiv.style.cssText = `
          margin: 5px 0;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
        `;

          keys.forEach((key, index) => {
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

            keyDiv.addEventListener("click", () => {
              input.value = key;
              // 高亮选中的密钥
              selectionDiv.querySelectorAll("div").forEach((div) => {
                div.style.background = "#f5f5f5";
              });
              keyDiv.style.background = "#e3f2fd";
            });

            selectionDiv.appendChild(keyDiv);
          });

          // 将选择区域插入到输入框后面
          input.parentNode.insertBefore(selectionDiv, input.nextSibling);
        }
      }

      // 显示结果
      const totalKeys = Object.values(foundKeys).reduce(
        (sum, keys) => sum + keys.length,
        0
      );
      if (totalKeys > 0) {
        resultDiv.innerHTML = `✅ 已找到 ${totalKeys} 个 API 密钥，请点击选择要使用的密钥`;
      } else {
        resultDiv.innerHTML = "⚠️ 未在页面中找到任何 API 密钥";
      }
    } catch (error) {
      resultDiv.innerHTML = `❌ 自动识别失败：${error.message}`;
      console.error("自动识别错误:", error);
    }
  });

// 添加滚动按钮功能
document.getElementById("scrollTopBtn").addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

document.getElementById("scrollBottomBtn").addEventListener("click", () => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: "smooth",
  });
});

// 添加保存有效key的函数
async function saveValidKey(platform, key, endpoint = "") {
  try {
    const history = (await chrome.storage.local.get("validKeys")) || {
      validKeys: [],
    };
    const validKeys = history.validKeys || [];

    // 检查是否已存在相同的key
    const existingIndex = validKeys.findIndex((item) => item.key === key);

    const newEntry = {
      platform,
      key,
      endpoint,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // 更新现有记录的时间戳
      validKeys[existingIndex].timestamp = newEntry.timestamp;
    } else {
      // 添加新记录
      validKeys.push(newEntry);
    }

    // 按时间戳降序排序
    validKeys.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 限制历史记录数量为20条
    const trimmedKeys = validKeys.slice(0, 20);

    await chrome.storage.local.set({ validKeys: trimmedKeys });
  } catch (error) {
    console.error("保存历史记录失败:", error);
  }
}

// 修改查看历史记录的功能
document.getElementById("historyButton").addEventListener("click", async function () {
  const resultDiv = document.getElementById("result");
  const ITEMS_PER_PAGE = 5; // 每页显示5条记录
  let currentPage = 1;
  
  try {
    const history = await chrome.storage.local.get("validKeys");
    const validKeys = history.validKeys || [];

    if (validKeys.length === 0) {
      resultDiv.innerHTML = "暂无历史记录";
      return;
    }

    function renderPage(page) {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const pageItems = validKeys.slice(startIndex, endIndex);
      const totalPages = Math.ceil(validKeys.length / ITEMS_PER_PAGE);

      const platformNames = {
        openai: "OpenAI",
        claude: "Claude",
        gemini: "Gemini",
        deepseek: "Deepseek",
        groq: "Groq",
        siliconflow: "Siliconflow",
        xai: "xAI",
        custom: "自定义接口",
      };

      const historyHtml = pageItems
        .map((item, index) => {
          const date = new Date(item.timestamp).toLocaleString("zh-CN");
          const keyPreview = `${item.key.slice(0, 8)}...${item.key.slice(-8)}`;
          const platformName = platformNames[item.platform] || item.platform;
          const absoluteIndex = startIndex + index;

          return `
            <div class="history-item" data-key="${item.key}" data-platform="${item.platform}" ${
            item.endpoint ? `data-endpoint="${item.endpoint}"` : ""
          }>
              <div class="history-platform">${platformName}</div>
              <div class="history-key">${keyPreview}</div>
              <div class="history-time">${date}</div>
              <div class="history-actions">
                <button class="copy-key-btn">复制</button>
                <button class="use-key-btn">使用</button>
                <button class="delete-key-btn" data-index="${absoluteIndex}">删除</button>
              </div>
            </div>
          `;
        })
        .join("");

      // 生成分页按钮
      const paginationHtml = `
        <div class="pagination">
          <button ${page === 1 ? 'disabled' : ''} id="prevPage">上一页</button>
          ${Array.from({ length: totalPages }, (_, i) => i + 1)
            .map(
              (num) =>
                `<button class="${num === page ? 'active' : ''}" data-page="${num}">${num}</button>`
            )
            .join('')}
          <button ${page === totalPages ? 'disabled' : ''} id="nextPage">下一页</button>
        </div>
      `;

      resultDiv.innerHTML = `
        <div class="history-container">
          <div class="history-header">
            <h3>历史有效密钥</h3>
            <div class="history-header-buttons">
              <button id="copyAllKeysBtn" title="复制所有密钥">复制全部</button>
              <button id="clearHistoryBtn">清空历史</button>
            </div>
          </div>
          ${historyHtml}
          ${paginationHtml}
        </div>
      `;

      // 添加分页事件监听
      document.querySelectorAll('.pagination button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          renderPage(currentPage);
        });
      });

      document.getElementById('prevPage')?.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderPage(currentPage);
        }
      });

      document.getElementById('nextPage')?.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderPage(currentPage);
        }
      });

      // 添加复制单个密钥的按钮事件
      document.querySelectorAll(".history-item").forEach((item) => {
        const key = item.dataset.key;
        const platform = item.dataset.platform;
        const endpoint = item.dataset.endpoint;

        const actionsDiv = item.querySelector(".history-actions");
        const copyBtn = actionsDiv.querySelector(".copy-key-btn");
      

        copyBtn.addEventListener("click", async () => {
          try {
            // 构建包含平台信息和endpoint的复制文本
            let copyText = `Platform: ${platform}\nKey: ${key}`;
            if (endpoint) {
              copyText += `\nEndpoint: ${endpoint}`;
            }
            
            await navigator.clipboard.writeText(copyText);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "已复制!";
            setTimeout(() => (copyBtn.textContent = originalText), 1000);
          } catch (err) {
            console.error("复制失败:", err);
          }
        });

        actionsDiv.insertBefore(copyBtn, actionsDiv.firstChild);
      });

      // 添加复制所有密钥的功能
      document
        .getElementById("copyAllKeysBtn")
        .addEventListener("click", async function () {
          try {
            const keysText = validKeys
              .map((item) => {
                let text = `${item.platform}: ${item.key}`;
                if (item.endpoint) {
                  text += `\nEndpoint: ${item.endpoint}`;
                }
                return text;
              })
              .join("\n\n");

            await navigator.clipboard.writeText(keysText);
            this.textContent = "已复制!";
            setTimeout(() => (this.textContent = "复制全部"), 1000);
          } catch (err) {
            console.error("复制失败:", err);
          }
        });

      // 添加使用按钮的点击事件
      document.querySelectorAll(".use-key-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const item = this.closest(".history-item");
          const key = item.dataset.key;
          const platform = item.dataset.platform;
          const endpoint = item.dataset.endpoint;

          // 填充对应的输入框
          if (platform === "custom") {
            document.getElementById("customApiKey").value = key;
            document.getElementById("customEndpoint").value = endpoint;
            // 手动触发模型列表更新
            handleModelListUpdate();
          } else {
            document.getElementById(`${platform}Key`).value = key;
          }
        });
      });

      // 添加删除按钮的点击事件
      document.querySelectorAll(".delete-key-btn").forEach((btn) => {
        btn.addEventListener("click", async function () {
          const index = parseInt(this.dataset.index);
          const history = await chrome.storage.local.get("validKeys");
          const validKeys = history.validKeys || [];

          validKeys.splice(index, 1);
          await chrome.storage.local.set({ validKeys });

          // 重新加载历史记录
          document.getElementById("historyButton").click();
        });
      });

      // 添加清空历史的点击事件
      document
        .getElementById("clearHistoryBtn")
        .addEventListener("click", async function () {
          if (confirm("确定要清空所有历史记录吗？")) {
            await chrome.storage.local.set({ validKeys: [] });
            resultDiv.innerHTML = "暂无历史记录";
          }
        });
    }

    // 初始渲染第一页
    renderPage(currentPage);
    
  } catch (error) {
    resultDiv.innerHTML = `获取历史记录失败：${error.message}`;
  }
});
