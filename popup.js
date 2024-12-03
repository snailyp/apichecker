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
        ]);

        if (completionResponse.ok) {
          results.push("✅ Deepseek API 密钥有效。");
          await saveValidKey("deepseek", deepseekKey);
        } else {
          if (!completionResponse.ok) {
            const errorData = await completionResponse.json();
            results.push(
              `❌ Deepseek API 错误：${errorData.error?.message || "未知错误"}`
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
        const [completionResponse] = await Promise.all([
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
        ]);

        if (completionResponse.ok) {
          results.push("✅ Siliconflow API 密钥有效。");
          await saveValidKey("siliconflow", siliconflowKey);
        } else {
          if (!completionResponse.ok) {
            const errorData = await completionResponse.json();
            results.push(
              `❌ Siliconflow API 错误：${
                errorData.error?.message || "未知错误"
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
        const [completionResponse] = await Promise.all([
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
        ]);

        if (completionResponse.ok) {
          results.push("✅ 自定义 OpenAI 兼容接口可用。");
          await saveValidKey("custom", customApiKey, customEndpoint);
        } else {
          const errorData = await completionResponse.json();
          results.push(
            `❌ 自定义接口错误：${errorData.error?.message || "未知错误"}`
          );
        }

        const historyDiv = document.getElementById("history");

        // 检查是否已经显示历史记录
        const existingHistory = historyDiv.querySelector(".history-container");
        
        // 重新渲染历史面板
        if (existingHistory) {
          document.getElementById("historyButton").click();
          document.getElementById("historyButton").click();
        }

      } catch (error) {
        results.push(`❌ 自定义接口错误：${error.message}`);
      }
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

// 清空按钮功能
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

  // 清空结果显示区域
  document.getElementById("result").innerHTML = "";

  // 清空所有密钥选择区域
  document.querySelectorAll(".key-selection").forEach((el) => el.remove());

  // 清空URL选择区域
  document.querySelectorAll(".url-selection").forEach((el) => el.remove());

  // 清空模型下拉列表
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.innerHTML =
    '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';

  // 清空模型复选框区域
  const modelCheckboxes = document.getElementById("modelCheckboxes");
  modelCheckboxes.innerHTML = "";

  // 清空url预览
  document.getElementById("urlPreview").textContent = "";
});

// 修改 fetchModels 函数，在添加复选框后添加全选/取消全选功能
async function fetchModels(endpoint, apiKey) {
  const modelSelect = document.getElementById("modelSelect");
  const modelCheckboxes = document.getElementById("modelCheckboxes");
  const resultDiv = document.getElementById("result");

  // 添加加载动画
  modelCheckboxes.innerHTML = `
    <div class="loading-animation">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在获取模型列表...</div>
    </div>
  `;

  // 处理 endpoint 的结尾斜杠
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

    // 清空现有选项
    modelSelect.innerHTML = "";
    modelCheckboxes.innerHTML = `
      <div class="model-select-all">
        <button type="button" id="selectAllModels">全选</button>
        <button type="button" id="deselectAllModels">取消全选</button>
      </div>
    `;

    if (models.length > 0) {
      // 添加下拉选项和复选框
      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);

        // 添加复选框
        const checkboxDiv = document.createElement("div");
        checkboxDiv.className = "model-checkbox-item";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `model-${model.id}`;
        checkbox.value = model.id;

        const label = document.createElement("label");
        label.htmlFor = `model-${model.id}`;
        label.textContent = model.id;

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        modelCheckboxes.appendChild(checkboxDiv);
      });

      // 添加全选/取消全选功能
      document
        .getElementById("selectAllModels")
        .addEventListener("click", () => {
          const checkboxes = modelCheckboxes.querySelectorAll(
            'input[type="checkbox"]'
          );
          checkboxes.forEach((checkbox) => (checkbox.checked = true));
        });

      document
        .getElementById("deselectAllModels")
        .addEventListener("click", () => {
          const checkboxes = modelCheckboxes.querySelectorAll(
            'input[type="checkbox"]'
          );
          checkboxes.forEach((checkbox) => (checkbox.checked = false));
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

// 添加复制模型按钮的事件监听
document
  .getElementById("copyModelsBtn")
  .addEventListener("click", async function () {
    const checkboxes = document.querySelectorAll(
      "#modelCheckboxes input[type='checkbox']:checked"
    );
    if (checkboxes.length === 0) {
      document.getElementById("result").innerHTML = "⚠️ 请先选择要复制的模型";
      return;
    }

    const selectedModels = Array.from(checkboxes).map((cb) => cb.value);
    const modelText = selectedModels.join(",");

    try {
      await navigator.clipboard.writeText(modelText);
      this.textContent = "已复制!";
      setTimeout(() => (this.textContent = "复制选中模型"), 1000);
    } catch (err) {
      document.getElementById("result").innerHTML =
        "❌ 复制失败：" + err.message;
    }
  });

// 测试按钮点击事件
document.getElementById("testModelsBtn").addEventListener("click", async () => {
  const endpoint = document.getElementById("customEndpoint").value.trim();
  const apiKey = document.getElementById("customApiKey").value.trim();
  const selectedModels = Array.from(
    document.querySelectorAll("#modelCheckboxes input[type='checkbox']:checked")
  ).map((cb) => cb.value);

  if (!selectedModels.length) {
    document.getElementById("result").innerHTML = "⚠️ 请先选择要测试的模型";
    return;
  }

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = "正在测试选中的模型，请稍候...";

  const results = await testModels(endpoint, apiKey, selectedModels);

  // 生成按钮和表格的HTML
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
            ${results
              .map(
                (result) => `
              <tr>
                <td>${result.model}</td>
                <td>${result.status}</td>
                <td>${result.responseTime}ms</td>
                <td>${result.returnedModel || "-"}</td>
                <td>${result.modelMatch || "-"}</td>
                <td>${result.tokens || "-"}</td>
                <td>${result.error || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  resultDiv.innerHTML = tableHTML;

  // 添加复制按钮的事件监听
  document
    .getElementById("copyAvailableModels")
    .addEventListener("click", function () {
      const availableModels = results
        .filter((result) => result.status === "✅")
        .map((result) => result.model);

      copyToClipboard(availableModels.join(","), this);
    });

  document
    .getElementById("copyMatchedModels")
    .addEventListener("click", function () {
      const matchedModels = results
        .filter((result) => result.modelMatch === "✅")
        .map((result) => result.model);

      copyToClipboard(matchedModels.join(","), this);
    });
});

// 添加复制到剪贴板的辅助函数
async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.innerHTML;
    button.innerHTML = "已复制!";
    setTimeout(() => (button.innerHTML = originalText), 1000);
  } catch (err) {
    console.error("复制失败:", err);
    button.innerHTML = "复制失败!";
    setTimeout(() => (button.innerHTML = originalText), 1000);
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

// 添加 URL 匹配的正则表达式
const URL_PATTERN =
  /https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?::\d+)?(?=\/|$)/g;

document
  .getElementById("autoFillButton")
  .addEventListener("click", async function () {
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "正在搜索 API 密钥和接口地址...";

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
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

      // 为接口地址创建选择区域
      if (foundUrls.length > 0) {
        // 激活自定义接口区段
        const customSection = document.getElementById("custom-section");
        if (!customSection.classList.contains("active")) {
          customSection.classList.add("active");

          // 取消其他区段的激活状态
          document.querySelectorAll(".section").forEach((section) => {
            if (section.id !== "custom-section") {
              section.classList.remove("active");
            }
          });
        }

        const customEndpointInput = document.getElementById("customEndpoint");
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
        titleDiv.textContent = "检测到的接口地址：";
        urlSelectionDiv.appendChild(titleDiv);

        foundUrls.forEach((url) => {
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
            customEndpointInput.value = url;
            // 高亮选中的 URL
            urlSelectionDiv.querySelectorAll("div").forEach((div) => {
              if (div !== titleDiv) {
                div.style.background = "#f5f5f5";
              }
            });
            urlDiv.style.background = "#e3f2fd";
            // 触发模型列表更新
            handleModelListUpdate();
            // 更新请求地址预览
            updateRequestUrl();
          });

          urlSelectionDiv.appendChild(urlDiv);
        });

        // 移除已存在的 URL 选择区域（如果有）
        const existingUrlSelection =
          customEndpointInput.parentNode.querySelector(".url-selection");
        if (existingUrlSelection) {
          existingUrlSelection.remove();
        }

        // 将新的 URL 选择区域插入到输入框后面
        customEndpointInput.parentNode.insertBefore(
          urlSelectionDiv,
          customEndpointInput.nextSibling
        );
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

          // 添加标题
          const titleDiv = document.createElement("div");
          titleDiv.style.cssText = `
        padding: 5px;
        font-weight: bold;
        color: #666;
        border-bottom: 1px solid #eee;
        margin-bottom: 5px;
      `;
          titleDiv.textContent = "检测到的密钥：";
          selectionDiv.appendChild(titleDiv);

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
              // 触发模型列表更新
              handleModelListUpdate();
              keyDiv.style.background = "#e3f2fd";
            });

            selectionDiv.appendChild(keyDiv);
          });

          // 将选择区域插入到输入框后面
          input.parentNode.insertBefore(selectionDiv, input.nextSibling);
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

    // 限制历史记录数量为100条
    const trimmedKeys = validKeys.slice(0, 100);

    await chrome.storage.local.set({ validKeys: trimmedKeys });
  } catch (error) {
    console.error("保存历史记录失败:", error);
  }
}

// 历史记录按钮的点击事件处理
document
  .getElementById("historyButton")
  .addEventListener("click", async function () {
    const historyDiv = document.getElementById("history");

    // 检查是否已经显示历史记录
    const existingHistory = historyDiv.querySelector(".history-container");
    if (existingHistory) {
      historyDiv.innerHTML = "";
      return;
    }

    const ITEMS_PER_PAGE = 5;
    let currentPage = 1;

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

    try {
      const history = await chrome.storage.local.get("validKeys");
      let validKeys = history.validKeys || [];

      if (validKeys.length === 0) {
        historyDiv.innerHTML = "暂无历史记录";
        return;
      }

      // 获取所有唯一的endpoint和platform
      const endpoints = [
        ...new Set(validKeys.filter((k) => k.endpoint).map((k) => k.endpoint)),
      ];
      const platforms = [...new Set(validKeys.map((k) => k.platform))];

      // 创建筛选器HTML
      const filterHtml = `
    <div class="history-filters">
      <div class="filter-group">
        <label for="endpointFilter">接口筛选：</label>
        <select id="endpointFilter">
          <option value="">全部</option>
          ${endpoints
            .map(
              (endpoint) => `<option value="${endpoint}">${endpoint}</option>`
            )
            .join("")}
        </select>
      </div>
      <div class="filter-group">
        <label for="platformFilter">平台筛选：</label>
        <select id="platformFilter">
          <option value="">全部</option>
          ${platforms
            .map(
              (platform) =>
                `<option value="${platform}">${
                  platformNames[platform] || platform
                }</option>`
            )
            .join("")}
        </select>
      </div>
    </div>
  `;

      function filterKeys(endpoint, platform) {
        return validKeys.filter((key) => {
          const endpointMatch = !endpoint || key.endpoint === endpoint;
          const platformMatch = !platform || key.platform === platform;
          return endpointMatch && platformMatch;
        });
      }

      function renderPage(page, filteredKeys = validKeys) {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const pageItems = filteredKeys.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredKeys.length / ITEMS_PER_PAGE);

        const historyHtml = pageItems
          .map((item, index) => {
            const date = new Date(item.timestamp).toLocaleString("zh-CN");
            const keyPreview = `${item.key.slice(0, 8)}...${item.key.slice(
              -8
            )}`;
            const platformName = platformNames[item.platform] || item.platform;
            const absoluteIndex = startIndex + index;

            return `
          <div class="history-item" data-key="${item.key}" data-platform="${
              item.platform
            }" ${item.endpoint ? `data-endpoint="${item.endpoint}"` : ""}>
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

        // 修改分页按钮生成逻辑
        function generatePaginationButtons(currentPage, totalPages) {
          const buttons = [];
          const maxVisibleButtons = 5; // 最多显示的按钮数量

          if (totalPages <= maxVisibleButtons) {
            // 如果总页数小于等于最大显示数，显示所有页码
            for (let i = 1; i <= totalPages; i++) {
              buttons.push(
                `<button class="${
                  i === currentPage ? "active" : ""
                }" data-page="${i}">${i}</button>`
              );
            }
          } else {
            // 总是显示第一页
            buttons.push(
              `<button class="${
                1 === currentPage ? "active" : ""
              }" data-page="1">1</button>`
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
                `<button class="${
                  i === currentPage ? "active" : ""
                }" data-page="${i}">${i}</button>`
              );
            }

            // 添加结束的省略号
            if (end < totalPages - 1) {
              buttons.push("<span>...</span>");
            }

            // 总是显示最后一页
            buttons.push(
              `<button class="${
                totalPages === currentPage ? "active" : ""
              }" data-page="${totalPages}">${totalPages}</button>`
            );
          }

          return buttons.join("");
        }

        // 生成分页HTML
        const paginationHtml = `
      <div class="pagination">
        <button ${page === 1 ? "disabled" : ""} id="prevPage">上一页</button>
        ${generatePaginationButtons(page, totalPages)}
        <button ${
          page === totalPages ? "disabled" : ""
        } id="nextPage">下一页</button>
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
        ${filterHtml}
        ${historyHtml}
        ${paginationHtml}
      </div>
    `;

        // 添加筛选器事件监听
        const endpointFilter = document.getElementById("endpointFilter");
        const platformFilter = document.getElementById("platformFilter");

        endpointFilter.addEventListener("change", () => {
          const filteredKeys = filterKeys(
            endpointFilter.value,
            platformFilter.value
          );
          currentPage = 1;
          renderPage(currentPage, filteredKeys);
        });

        platformFilter.addEventListener("change", () => {
          const filteredKeys = filterKeys(
            endpointFilter.value,
            platformFilter.value
          );
          currentPage = 1;
          renderPage(currentPage, filteredKeys);
        });

        // 添加分页事件监听
        document
          .querySelectorAll(".pagination button[data-page]")
          .forEach((btn) => {
            btn.addEventListener("click", () => {
              currentPage = parseInt(btn.dataset.page);
              renderPage(currentPage);
            });
          });

        document.getElementById("prevPage")?.addEventListener("click", () => {
          if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
          }
        });

        document.getElementById("nextPage")?.addEventListener("click", () => {
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

            // 获取对应的区段和导航链接
            let sectionId = `${platform}-section`;
            let navLinkSelector = `.nav-menu a[href='#${platform}-section']`;

            // 如果区段未激活,则激活它
            const section = document.getElementById(sectionId);
            const navLink = document.querySelector(navLinkSelector);
            if (!section.classList.contains("active")) {
              section.classList.add("active");
              navLink.classList.add("active");
            }

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

            // 重新渲染历史面板
            document.getElementById("historyButton").click();
            document.getElementById("historyButton").click();
          });
        });

        // 添加清空历史的点击事件
        document
          .getElementById("clearHistoryBtn")
          .addEventListener("click", async function () {
            if (confirm("确定要清空所有历史记录吗？")) {
              await chrome.storage.local.set({ validKeys: [] });
              historyDiv.innerHTML = "暂无历史记录";
            }
          });
      }

      // 初始渲染第一页
      renderPage(currentPage);
    } catch (error) {
      historyDiv.innerHTML = `获取历史记录失败：${error.message}`;
    }
  });

// 添加导航菜单控制逻辑
document.addEventListener("DOMContentLoaded", function () {
  // 默认激活自定义接口区段
  const customSection = document.getElementById("custom-section");
  customSection.classList.add("active");

  // 默认激活导航菜单中的自定义接口链接
  const customNavLink = document.querySelector(
    ".nav-menu a[href='#custom-section']"
  );
  customNavLink.classList.add("active");

  const navLinks = document.querySelectorAll(".nav-menu a");

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      // 切换当前链接的激活状态
      this.classList.toggle("active");

      // 获取目标区域的ID
      const targetId = this.getAttribute("href").substring(1);
      const targetSection = document.getElementById(targetId);

      // 切换目标区域的显示状态
      if (targetSection) {
        targetSection.classList.toggle("active");
      }
    });
  });
});

// 多模型检测功能
async function testModels(endpoint, apiKey, selectedModels) {
  const results = [];
  const processedEndpoint = endpoint.endsWith("/")
    ? endpoint
    : endpoint + "/v1/";

  for (const model of selectedModels) {
    try {
      const startTime = performance.now();
      const response = await fetch(`${processedEndpoint}chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 10,
        }),
      });

      const endTime = performance.now();
      const responseTime = (endTime - startTime).toFixed(2);

      if (response.ok) {
        const data = await response.json();
        const modelMatch = data.model === model;

        results.push({
          model,
          status: "✅",
          responseTime,
          returnedModel: data.model,
          modelMatch: modelMatch ? "✅" : "❌",
          tokens: data.usage?.total_tokens || "-",
        });
      } else {
        const errorData = await response.json();
        results.push({
          model,
          status: "❌",
          responseTime,
          returnedModel: "-",
          modelMatch: "-",
          tokens: "-",
          error: errorData.error?.message || "未知错误",
        });
      }
    } catch (error) {
      results.push({
        model,
        status: "❌",
        responseTime: "-",
        returnedModel: "-",
        modelMatch: "-",
        tokens: "-",
        error: error.message,
      });
    }
  }

  return results;
}

// 添加余额查询按钮的事件监听
document
  .getElementById("checkBalanceBtn")
  .addEventListener("click", async function () {
    const openaiKey = document.getElementById("openaiKey").value.trim();
    const claudeKey = document.getElementById("claudeKey").value.trim();
    const geminiKey = document.getElementById("geminiKey").value.trim();
    const deepseekKey = document.getElementById("deepseekKey").value.trim();
    const groqKey = document.getElementById("groqKey").value.trim();
    const siliconflowKey = document
      .getElementById("siliconflowKey")
      .value.trim();
    const xaiKey = document.getElementById("xaiKey").value.trim();
    const customEndpoint = document.getElementById("customEndpoint").value.trim();
    const customApiKey = document.getElementById("customApiKey").value.trim();

    const results = [];

    // 添加不支持平台的提示
    if (openaiKey) {
      results.push("❌ OpenAI 暂不支持余额查询");
    }

    if (claudeKey) {
      results.push("❌ Claude 暂不支持余额查询");
    }
    
    if (geminiKey) {
      results.push("❌ Gemini 暂不支持余额查询");
    }

    if (groqKey) {
      results.push("❌ Groq 暂不支持余额查询");
    }

    if (xaiKey) {
      results.push("❌ xAI 暂不支持余额查询"); 
    }

    // 辅助函数：获当月开始日期
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

    // Deepseek 余额查询
    if (deepseekKey) {
      try {
        const balanceResponse = await fetch(
          "https://api.deepseek.com/user/balance",
          {
            headers: {
              Authorization: `Bearer ${deepseekKey}`,
              Accept: "application/json",
            },
          }
        );
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          const balanceInfo = balanceData.balance_infos[0];
          results.push(
            `💰 Deepseek 余额信息：`,
            `- 总余额：${balanceInfo.total_balance} ${balanceInfo.currency}`,
            `- 赠送余额：${balanceInfo.granted_balance} ${balanceInfo.currency}`,
            `- 充值余额：${balanceInfo.topped_up_balance} ${balanceInfo.currency}`
          );
        } else {
          const balanceError = await balanceResponse.json();
          results.push(
            `❌ Deepseek 余额查询错误：${
              balanceError.error?.message || "未知错误"
            }`
          );
        }
      } catch (error) {
        results.push(`❌ Deepseek 余额查询错误：${error.message}`);
      }
    }

    // Siliconflow 余额查询
    if (siliconflowKey) {
      try {
        const userInfoResponse = await fetch(
          "https://api.siliconflow.cn/v1/user/info",
          {
            headers: {
              Authorization: `Bearer ${siliconflowKey}`,
            },
          }
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          if (userInfo.status && userInfo.code === 20000) {
            const data = userInfo.data;
            results.push(
              `💰 Siliconflow 余额信息：`,
              `- 总余额：${data.totalBalance} CNY`,
              `- 充值余额：${data.chargeBalance} CNY`,
              `- 赠送余额：${data.balance} CNY`
            );
          } else {
            results.push(
              `❌ Siliconflow 用户信息查询失败：${userInfo.message}`
            );
          }
        } else {
          const userInfoError = await userInfoResponse.json();
          results.push(
            `❌ Siliconflow 用户信息查询错误：${
              userInfoError.message || "未知错误"
            }`
          );
        }
      } catch (error) {
        results.push(`❌ Siliconflow 余额查询错误：${error.message}`);
      }
    }

    // 自定义 OpenAI 兼容接口的额度查询
    if (customEndpoint && customApiKey) {
      try {
        const quotaResponse = await fetch(
          `${customEndpoint}/dashboard/billing/subscription`,
          {
            headers: {
              Authorization: `Bearer ${customApiKey}`,
            },
          }
        );
        const usageResponse = await fetch(
          `${customEndpoint}/dashboard/billing/usage?start_date=${getStartDate()}&end_date=${getEndDate()}`,
          {
            headers: {
              Authorization: `Bearer ${customApiKey}`,
            },
          }
        );

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
            `💰 自定义接口额度信息：`,
            `- 总额度：${quotaInfo}`,
            `- 已用额度：${usedInfo}`,
            `- 剩余额度：${remainInfo}`
          );
        } else {
          const errorData = await quotaResponse.json();
          results.push(
            `❌ 自定义接口额度查询错误：${
              errorData.error?.message || "未知错误"
            }`
          );
        }
      } catch (error) {
        results.push(`❌ 自定义接口额度查询错误：${error.message}`);
      }
    }

    // 更新结果显示
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = results.join("<br />");
  });
