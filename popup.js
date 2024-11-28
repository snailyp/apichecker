document
  .getElementById("apiKeyForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const openaiKey = document.getElementById("openaiKey").value.trim();
    const claudeKey = document.getElementById("claudeKey").value.trim();
    const geminiKey = document.getElementById("geminiKey").value.trim();
    const deepseekKey = document.getElementById("deepseekKey").value.trim();
    const groqKey = document.getElementById("groqKey").value.trim();
    const siliconflowKey = document.getElementById("siliconflowKey").value.trim();
    const customEndpoint = document.getElementById("customEndpoint").value.trim();

    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "正在检测，请稍候...";

    const results = [];

    // 检测 OpenAI API 密钥
    if (openaiKey) {
      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (openaiResponse.ok) {
          results.push("✅ OpenAI API 密钥有效。");
        } else {
          const errorData = await openaiResponse.json();
          results.push(`❌ OpenAI API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ OpenAI API 错误：${error.message}`);
      }
    }

    // 检测 Claude API 密钥
    if (claudeKey) {
      try {
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: 'POST',
          headers: { 
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (claudeResponse.ok) {
          results.push("✅ Claude API 密钥有效。");
        } else {
          const errorData = await claudeResponse.json();
          results.push(`❌ Claude API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ Claude API 错误：${error.message}`);
      }
    }

    // 检测 Gemini API 密钥
    if (geminiKey) {
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: 'Hi' }]
            }]
          })
        });
        if (geminiResponse.ok) {
          results.push("✅ Gemini API 密钥有效。");
        } else {
          const errorData = await geminiResponse.json();
          results.push(`❌ Gemini API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ Gemini API 错误：${error.message}`);
      }
    }

    // 检测 Deepseek API 密钥
    if (deepseekKey) {
      try {
        const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${deepseekKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (deepseekResponse.ok) {
          results.push("✅ Deepseek API 密钥有效。");
        } else {
          const errorData = await deepseekResponse.json();
          results.push(`❌ Deepseek API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ Deepseek API 错误：${error.message}`);
      }
    }

    // 检测 Groq API 密钥
    if (groqKey) {
      try {
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (groqResponse.ok) {
          results.push("✅ Groq API 密钥有效。");
        } else {
          const errorData = await groqResponse.json();
          results.push(`❌ Groq API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ Groq API 错误：${error.message}`);
      }
    }

    // 检测 Siliconflow API 密钥
    if (siliconflowKey) {
      try {
        const siliconflowResponse = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${siliconflowKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'Qwen/Qwen2-72B-Instruct',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (siliconflowResponse.ok) {
          results.push("✅ Siliconflow API 密钥有效。");
        } else {
          const errorData = await siliconflowResponse.json();
          results.push(`❌ Siliconflow API 错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ Siliconflow API 错误：${error.message}`);
      }
    }

    // 检测自定义 OpenAI 兼容接口
    if (customEndpoint) {
      try {
        const modelSelect = document.getElementById("modelSelect");
        const selectedModel = modelSelect.value || 'gpt-3.5-turbo';
        const customApiKey = document.getElementById("customApiKey").value.trim();
        
        // 处理 endpoint 的结尾斜杠
        const processedEndpoint = customEndpoint.endsWith('/') 
          ? customEndpoint 
          : customEndpoint + '/v1/';
        
        const customResponse = await fetch(`${processedEndpoint}chat/completions`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${customApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        });
        if (customResponse.ok) {
          results.push("✅ 自定义 OpenAI 兼容接口可用。");
        } else {
          const errorData = await customResponse.json();
          results.push(`❌ 自定义接口错误：${errorData.error?.message || '未知错误'}`);
        }
      } catch (error) {
        results.push(`❌ 自定义接口错误：${error.message}`);
      }
    }

    // 如果没有输入任何 API 密钥
    if (!openaiKey && !claudeKey && !geminiKey && !deepseekKey && !groqKey && !siliconflowKey && !customEndpoint) {
      results.push("⚠️ 请至少输入一个 API 密钥进行检测。");
    }

    resultDiv.innerHTML = results.join("<br />");
  });

// 添加清空按钮功能
document.getElementById("clearButton").addEventListener("click", function() {
  document.getElementById("openaiKey").value = "";
  document.getElementById("claudeKey").value = "";
  document.getElementById("geminiKey").value = "";
  document.getElementById("deepseekKey").value = "";
  document.getElementById("groqKey").value = "";
  document.getElementById("siliconflowKey").value = "";
  document.getElementById("customEndpoint").value = "";
  document.getElementById("customApiKey").value = "";
  document.getElementById("result").innerHTML = "";
});

// 修改获取模型列表的函数
async function fetchModels(endpoint, apiKey) {
  const modelSelect = document.getElementById("modelSelect");
  const resultDiv = document.getElementById("result");
  
  // 处理 endpoint 的结尾斜杠
  const processedEndpoint = endpoint.endsWith('/') 
    ? endpoint 
    : endpoint + '/v1/';
  
  try {
    const response = await fetch(`${processedEndpoint}models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取模型列表失败');
    }
    
    const data = await response.json();
    const models = data.data || [];
    
    modelSelect.innerHTML = '';
    
    if (models.length > 0) {
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        modelSelect.appendChild(option);
      });
      resultDiv.innerHTML = "✅ 成功获取模型列表";
    } else {
      modelSelect.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
      throw new Error('未找到可用模型');
    }
  } catch (error) {
    console.error('获取模型列表错误:', error);
    modelSelect.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
    resultDiv.innerHTML = `❌ 获取模型列表失败：${error.message}`;
    return [];
  }
}

// 修改处理模型列表更新的函数
function handleModelListUpdate() {
  const endpoint = document.getElementById("customEndpoint").value.trim();
  const customApiKey = document.getElementById("customApiKey").value.trim();
  
  if (endpoint && customApiKey) {
    fetchModels(endpoint, customApiKey);
  } else {
    const modelSelect = document.getElementById("modelSelect");
    modelSelect.innerHTML = '<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>';
  }
}

// 监听两个输入框的变化
document.getElementById("customEndpoint").addEventListener("input", handleModelListUpdate);
document.getElementById("customApiKey").addEventListener("input", handleModelListUpdate);
