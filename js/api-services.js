/**
 * API服务模块 - 处理各种API的请求和验证
 */

import * as logger from './logger.js';

// API密钥的正则表达式
export const KEY_PATTERNS = {
  siliconflow: /sk-[a-zA-Z0-9]{48}/g,
  claude: /sk-ant-api03-\S{95}/g,
  gemini: /AIzaSy\S{33}/g,
  deepseek: /sk-[a-zA-Z0-9]{32}/g,
  openai: /(sk-proj-\S{156}|sk-proj-\S{124}|sk-proj-\S{48}|sk-[a-zA-Z0-9]{48})/g,
  groq: /gsk_[a-zA-Z0-9]{52}/g,
  xai: /xai-[a-zA-Z0-9]{80}/g,
  openrouter: /sk-or-v1-[a-f0-9]{64}/g,
  custom: /sk-[a-zA-Z0-9]+/g,
};

// URL匹配的正则表达式
export const URL_PATTERN = /https?:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*(?::\d+)?(?=\/|$)/g;

/**
 * 检测OpenAI API密钥
 * @param {string} apiKey - OpenAI API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkOpenAIKey(apiKey) {
  try {
    const completionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    if (completionResponse.ok) {
      let balance = null;
      let message = "✅ OpenAI API 密钥有效。";
      try {
        const balanceData = await getOpenAIBalance(apiKey, "https://api.openai.com");
        if (balanceData.success) {
          balance = balanceData.remaining;
          message += ` 剩余额度: $${balance.toFixed(4)}`;
        }
      } catch (e) {
        logger.warn('查询OpenAI余额失败', e);
      }

      const rateLimit = completionResponse.headers.get("x-ratelimit-limit-tokens");
      let tier = "";
      if (rateLimit) {
        const tokens = parseInt(rateLimit);
        if (tokens === 30000) tier = "Tier1";
        else if (tokens === 450000) tier = "Tier2";
        else if (tokens === 800000) tier = "Tier3";
        else if (tokens === 2000000) tier = "Tier4";
        else if (tokens === 30000000) tier = "Tier5";
        message += tier ? ` (${tier})` : "";
      }

      return { success: true, message, tier, isPaid: true, balance };
    } else {
      const errorData = await completionResponse.json();
      return { success: false, message: `❌ OpenAI API 错误：${errorData.error?.message || "未知错误"}` };
    }
  } catch (error) {
    return { success: false, message: `❌ OpenAI API 错误：${error.message}` };
  }
}

/**
 * 检测Claude API密钥
 * @param {string} apiKey - Claude API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkClaudeKey(apiKey) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    
    if (response.ok) {
      // 获取速率限制
      const rateLimit = response.headers.get("anthropic-ratelimit-input-tokens-limit");
      let tier = "";
      if (rateLimit) {
        const tokens = parseInt(rateLimit);
        if (tokens === 40000) tier = "Tier1";
        else if (tokens === 80000) tier = "Tier2";
        else if (tokens === 160000) tier = "Tier3";
        else if (tokens === 400000) tier = "Tier4";
      }
      
      return {
        success: true,
        message: `✅ Claude API 密钥有效。${tier ? ` (${tier})` : ""}`,
        tier,
        isPaid: true
      };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        message: `❌ Claude API 错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `❌ Claude API 错误：${error.message}`
    };
  }
}

/**
 * 检测Gemini API密钥
 * @param {string} apiKey - Gemini API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkGeminiKey(apiKey) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    
    if (response.ok) {
      // 检测是否为付费密钥
      const paidCheckResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${apiKey}`,
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

      if (paidCheckResponse.ok) {
        return {
          success: true,
          message: "✅ Gemini API 密钥有效。(Paid)",
          isPaid: true
        };
      } else {
        return {
          success: true,
          message: "✅ Gemini API 密钥有效。(Free)",
          isPaid: false
        };
      }
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `❌ Gemini API 错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Gemini API 错误：${error.message}`
    };
  }
}

/**
 * 检测Deepseek API密钥
 * @param {string} apiKey - Deepseek API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkDeepseekKey(apiKey) {
  try {
    const completionResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    if (completionResponse.ok) {
      let balance = null;
      let message = "✅ Deepseek API 密钥有效。";
      try {
        const balanceResult = await checkDeepseekBalance(apiKey);
        if (balanceResult.success) {
          balance = parseFloat(balanceResult.data.totalBalance);
          message += ` 总余额: ${balanceResult.data.totalBalance} ${balanceResult.data.currency}`;
        }
      } catch (e) {
        logger.warn('查询Deepseek余额失败', e);
      }
      return { success: true, message, isPaid: true, balance };
    } else {
      const errorData = await completionResponse.json();
      return { success: false, message: `❌ Deepseek API 错误：${errorData.error?.message || "未知错误"}` };
    }
  } catch (error) {
    return { success: false, message: `❌ Deepseek API 错误：${error.message}` };
  }
}

/**
 * 检测Groq API密钥
 * @param {string} apiKey - Groq API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkGroqKey(apiKey) {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    
    if (response.ok) {
      // 获取速率限制
      const rateLimit = response.headers.get("x-ratelimit-limit-tokens");
      if(rateLimit == 6000){
        return {
          success: true,
          message: "✅ Groq API 密钥有效。(free)",
          isPaid: false
        };
      } else {
        return {
          success: true,
          message: "✅ Groq API 密钥有效。(paid)",
          isPaid: true
        };
      }
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        message: `❌ Groq API 错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `❌ Groq API 错误：${error.message}`
    };
  }
}

/**
 * 检测Siliconflow API密钥
 * @param {string} apiKey - Siliconflow API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkSiliconflowKey(apiKey) {
  try {
    const completionResponse = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    if (completionResponse.ok) {
      let balance = null;
      let message = "✅ Siliconflow API 密钥有效。";
      try {
        const balanceResult = await checkSiliconflowBalance(apiKey);
        if (balanceResult.success) {
          balance = parseFloat(balanceResult.data.totalBalance);
          message += ` 总余额: ${balanceResult.data.totalBalance} CNY`;
        }
      } catch (e) {
        logger.warn('查询Siliconflow余额失败', e);
      }
      return { success: true, message, isPaid: true, balance };
    } else {
      const errorData = await completionResponse.json();
      return { success: false, message: `❌ Siliconflow API 错误：${errorData.error?.message || "未知错误"}` };
    }
  } catch (error) {
    return { success: false, message: `❌ Siliconflow API 错误：${error.message}` };
  }
}

/**
 * 检测xAI API密钥
 * @param {string} apiKey - xAI API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkXAIKey(apiKey) {
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    
    if (response.ok) {
      return {
        success: true,
        message: "✅ xAI API 密钥有效。",
        isPaid: true
      };
    } else {
      const errorData = await response.json();
      return { 
        success: false, 
        message: `❌ xAI API 错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `❌ xAI API 错误：${error.message}`
    };
  }
}

/**
 * 检测OpenRouter API密钥
 * @param {string} apiKey - OpenRouter API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkOpenRouterKey(apiKey) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/auto",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });
    
    if (response.ok) {
      let balance = null;
      let message = "✅ OpenRouter API 密钥有效。";
      try {
        const creditsResult = await checkOpenRouterCredits(apiKey);
        if (creditsResult.success) {
          balance = creditsResult.data.total_credits - creditsResult.data.total_usage;
          message += ` 剩余信用: $${balance.toFixed(4)}`;
        }
      } catch (e) {
        logger.warn('查询OpenRouter额度失败', e);
      }
      return { success: true, message, isPaid: true, balance };
    } else {
      const errorData = await response.json();
      return { success: false, message: `❌ OpenRouter API 错误：${errorData.error?.message || "未知错误"}` };
    }
  } catch (error) {
    return { success: false, message: `❌ OpenRouter API 错误：${error.message}` };
  }
}

/**
 * 检测自定义OpenAI兼容接口
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkCustomEndpoint(endpoint, apiKey, model = "gpt-3.5-turbo") {
  try {
    // 处理endpoint的结尾斜杠
    const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
    
    const completionResponse = await fetch(`${processedEndpoint}chat/completions`, {
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

    if (completionResponse.ok) {
      let balance = null;
      let message = "✅ 自定义 OpenAI 兼容接口可用。";
      let isPaid = false; // 默认不是付费

      try {
        const balanceData = await getCustomBalance(endpoint, apiKey);
        if (balanceData.success) {
          balance = balanceData.remaining;
          message += ` 剩余额度: $${balance.toFixed(4)}`;
          isPaid = true; // 查到余额就认为是付费
        }
      } catch (e) {
        logger.warn('查询自定义接口余额失败', e);
      }

      return { 
        success: true, 
        message,
        balance,
        isPaid
      };
    } else {
      const errorData = await completionResponse.json();
      return { 
        success: false, 
        message: `❌ 自定义接口错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `❌ 自定义接口错误：${error.message}`
    };
  }
}

/**
 * 获取自定义接口的模型列表
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @returns {Promise<Array>} - 模型列表
 */
export async function fetchModels(endpoint, apiKey) {
  // 处理endpoint的结尾斜杠
  const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";

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
    return data.data || [];
  } catch (error) {
    console.error("获取模型列表错误:", error);
    throw error;
  }
}

/**
 * 测试特定模型
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} - 测试结果
 */
export async function testModel(endpoint, apiKey, model) {
  const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";

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

      return {
        model,
        status: "✅",
        responseTime,
        returnedModel: data.model,
        modelMatch: modelMatch ? "✅" : "❌",
        tokens: data.usage?.total_tokens || "-",
      };
    } else {
      const errorData = await response.json();
      return {
        model,
        status: "❌",
        responseTime,
        returnedModel: "-",
        modelMatch: "-",
        tokens: "-",
        error: errorData.error?.message || "未知错误",
      };
    }
  } catch (error) {
    return {
      model,
      status: "❌",
      responseTime: "-",
      returnedModel: "-",
      modelMatch: "-",
      tokens: "-",
      error: error.message,
    };
  }
}

/**
 * 获取OpenAI兼容接口的余额信息
 * @param {string} apiKey
 * @param {string} baseUrl
 * @returns {Promise<Object>}
 */
async function getOpenAIBalance(apiKey, baseUrl) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  endDate.setDate(endDate.getDate() - 1);
  const endDateStr = `${year}-${month}-${String(endDate.getDate()).padStart(2, "0")}`;

  const headers = { Authorization: `Bearer ${apiKey}` };

  try {
    const subUrl = `${baseUrl}/v1/dashboard/billing/subscription`;
    const usageUrl = `${baseUrl}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDateStr}`;

    const [subResponse, usageResponse] = await Promise.all([
      fetch(subUrl, { headers }),
      fetch(usageUrl, { headers })
    ]);

    if (!subResponse.ok || !usageResponse.ok) {
      return { success: false, message: "无法获取额度信息" };
    }

    const subData = await subResponse.json();
    const usageData = await usageResponse.json();
    
    const totalGranted = subData.hard_limit_usd;
    const totalUsed = usageData.total_usage / 100;
    const remaining = totalGranted - totalUsed;

    return { success: true, totalGranted, totalUsed, remaining };
  } catch (error) {
    logger.error('查询OpenAI余额时出错', error);
    return { success: false, message: error.message };
  }
}

/**
 * 查询Deepseek余额
 * @param {string} apiKey - Deepseek API密钥
 * @returns {Promise<Object>} - 余额信息
 */
export async function checkDeepseekBalance(apiKey) {
  try {
    const balanceResponse = await fetch("https://api.deepseek.com/user/balance", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const balanceInfo = balanceData.balance_infos[0];
      return {
        success: true,
        data: {
          totalBalance: balanceInfo.total_balance,
          grantedBalance: balanceInfo.granted_balance,
          toppedUpBalance: balanceInfo.topped_up_balance,
          currency: balanceInfo.currency
        },
        message: [
          `💰 Deepseek 余额信息：`,
          `- 总余额：${balanceInfo.total_balance} ${balanceInfo.currency}`,
          `- 赠送余额：${balanceInfo.granted_balance} ${balanceInfo.currency}`,
          `- 充值余额：${balanceInfo.topped_up_balance} ${balanceInfo.currency}`
        ].join("<br />")
      };
    } else {
      const balanceError = await balanceResponse.json();
      return {
        success: false,
        message: `❌ Deepseek 余额查询错误：${balanceError.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Deepseek 余额查询错误：${error.message}`
    };
  }
}

/**
 * 查询Siliconflow余额
 * @param {string} apiKey - Siliconflow API密钥
 * @returns {Promise<Object>} - 余额信息
 */
export async function checkSiliconflowBalance(apiKey) {
  try {
    const userInfoResponse = await fetch("https://api.siliconflow.cn/v1/user/info", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      if (userInfo.status && userInfo.code === 20000) {
        const data = userInfo.data;
        return {
          success: true,
          data: {
            totalBalance: data.totalBalance,
            chargeBalance: data.chargeBalance,
            giftBalance: data.balance
          },
          message: [
            `💰 Siliconflow 余额信息：`,
            `- 总余额：${data.totalBalance} CNY`,
            `- 充值余额：${data.chargeBalance} CNY`,
            `- 赠送余额：${data.balance} CNY`
          ].join("<br />")
        };
      } else {
        return {
          success: false,
          message: `❌ Siliconflow 用户信息查询失败：${userInfo.message}`
        };
      }
    } else {
      const userInfoError = await userInfoResponse.json();
      return {
        success: false,
        message: `❌ Siliconflow 用户信息查询错误：${userInfoError.message || "未知错误"}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Siliconflow 余额查询错误：${error.message}`
    };
  }
}

/**
 * 查询OpenRouter额度
 * @param {string} apiKey - OpenRouter API密钥
 * @returns {Promise<Object>} - 额度信息
 */
export async function checkOpenRouterCredits(apiKey) {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const credits = data.data;
      return {
        success: true,
        data: {
          total_credits: credits.total_credits,
          total_usage: credits.total_usage,
        },
        message: [
          `💰 OpenRouter 额度信息：`,
          `- 信用额度：$${credits.total_credits.toFixed(4)}`,
          `- 已用额度：$${credits.total_usage.toFixed(4)}`
        ].join("<br />")
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: `❌ OpenRouter 额度查询错误：${errorData.error?.message || "未知错误"}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ OpenRouter 额度查询错误：${error.message}`
    };
  }
}

/**
 * 获取自定义OpenAI兼容接口的余额信息
 * @param {string} endpoint
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
export async function getCustomBalance(endpoint, apiKey) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const startDate = `${year}-${month}-01`;
  
  // 获取当月的最后一天
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastDay = new Date(nextMonth - 1);
  const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const headers = { Authorization: `Bearer ${apiKey}` };
  const baseUrl = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;

  try {
    const subUrl = `${baseUrl}/v1/dashboard/billing/subscription`;
    const usageUrl = `${baseUrl}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`;

    const [subResponse, usageResponse] = await Promise.all([
      fetch(subUrl, { headers }),
      fetch(usageUrl, { headers })
    ]);

    if (!subResponse.ok) {
        // 如果/subscription接口404，说明可能是不支持该方式的接口，静默失败
        if(subResponse.status === 404) {
            return { success: false, message: "不支持的余额查询接口" };
        }
      const errorData = await subResponse.json().catch(() => ({}));
      return { success: false, message: `获取订阅信息失败: ${errorData.error?.message || subResponse.statusText}` };
    }
    
    if (!usageResponse.ok) {
        const errorData = await usageResponse.json().catch(() => ({}));
        return { success: false, message: `获取使用量信息失败: ${errorData.error?.message || usageResponse.statusText}` };
    }

    const subData = await subResponse.json();
    const usageData = await usageResponse.json();
    
    const totalGranted = subData.hard_limit_usd;
    const totalUsed = usageData.total_usage / 100;
    const remaining = totalGranted - totalUsed;

    return { success: true, totalGranted, totalUsed, remaining };
  } catch (error) {
    logger.error('查询自定义接口余额时出错', error);
    return { success: false, message: error.message };
  }
}

/**
 * 查询自定义OpenAI兼容接口额度
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @returns {Promise<Object>} - 额度信息
 */
export async function checkCustomEndpointQuota(endpoint, apiKey) {
  try {
    const balanceResult = await getCustomBalance(endpoint, apiKey);

    if (balanceResult.success) {
      const { totalGranted, totalUsed, remaining } = balanceResult;
      const quotaInfo = totalGranted ? `${totalGranted.toFixed(2)} $` : "无法获取";
      const usedInfo = `${totalUsed.toFixed(2)} $`;
      const remainInfo = remaining !== null ? `${remaining.toFixed(2)} $` : "无法计算";

      return {
        success: true,
        data: {
          quota: totalGranted,
          used: totalUsed,
          remaining: remaining
        },
        message: [
          `💰 自定义接口额度信息：`,
          `- 总额度：${quotaInfo}`,
          `- 已用额度：${usedInfo}`,
          `- 剩余额度：${remainInfo}`
        ].join("<br />")
      };
    } else {
      return {
        success: false,
        message: `❌ 自定义接口额度查询错误：${balanceResult.message || "未知错误"}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ 自定义接口额度查询错误：${error.message}`
    };
  }
}
