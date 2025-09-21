/**
 * API服务模块 - 处理各种API的请求和验证
 */

import { getDefaultModel } from './config-manager.js';
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
 * 通用的API请求函数
 * @param {Object} config - 请求配置对象
 * @param {string} config.url - 请求的URL
 * @param {string} config.method - HTTP方法 (e.g., 'POST', 'GET')
 * @param {Object} config.headers - 请求头对象
 * @param {string|Object} [config.body] - 请求体 (如果需要)
 * @param {string} [config.successProperty] - 用于判断成功的属性路径
 * @param {string} [config.errorMessagePath] - 从错误响应中提取错误信息的路径
 * @returns {Promise<Object>} - 标准化的结果对象 { success: boolean, data?: any, error?: string }
 */
async function sendApiRequest(config) {
  const { url, method, headers, body, successProperty, errorMessagePath } = config;
  
  try {
    const fetchOptions = {
      method,
      headers,
    };
    
    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    const response = await fetch(url, fetchOptions);
    
    if (response.ok) {
      const data = await response.json();
      
      // 如果指定了成功属性路径，检查该属性是否存在
      if (successProperty) {
        const propertyExists = getNestedProperty(data, successProperty) !== undefined;
        if (!propertyExists) {
          return { success: false, error: `响应中缺少预期的属性: ${successProperty}` };
        }
      }
      
      return { success: true, data, response };
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorMessagePath
        ? getNestedProperty(errorData, errorMessagePath) || "未知错误"
        : errorData.error?.message || "未知错误";
      
      return { success: false, error: errorMessage, errorData, response };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 获取嵌套对象属性的辅助函数
 * @param {Object} obj - 目标对象
 * @param {string} path - 属性路径，如 'error.message' 或 'usage.total_tokens'
 * @returns {any} - 属性值或 undefined
 */
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * 检测OpenAI API密钥
 * @param {string} apiKey - OpenAI API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkOpenAIKey(apiKey) {
  const defaultModel = getDefaultModel('openai');
  
  const result = await sendApiRequest({
    url: "https://api.openai.com/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return { success: false, message: `❌ OpenAI API 错误：${result.error}` };
  }

  // 处理成功响应的特殊逻辑
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

  const rateLimit = result.response.headers.get("x-ratelimit-limit-tokens");
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
}

/**
 * 检测Claude API密钥
 * @param {string} apiKey - Claude API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkClaudeKey(apiKey) {
  const defaultModel = getDefaultModel('claude');
  
  const result = await sendApiRequest({
    url: "https://api.anthropic.com/v1/messages",
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return {
      success: false,
      message: `❌ Claude API 错误：${result.error}`
    };
  }

  // 获取速率限制
  const rateLimit = result.response.headers.get("anthropic-ratelimit-input-tokens-limit");
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
}

/**
 * 检测Gemini API密钥
 * @param {string} apiKey - Gemini API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkGeminiKey(apiKey) {
  const defaultModel = getDefaultModel('gemini');
  
  // 检测付费模型的函数
  const checkProModel = async () => {
    return await sendApiRequest({
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-06-05:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        contents: [
          {
            parts: [{ text: "Hi" }],
          },
        ],
      },
      errorMessagePath: "error.message"
    });
  };

  // 检测免费模型的函数
  const checkFreeModel = async () => {
    return await sendApiRequest({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${defaultModel}:generateContent?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        contents: [
          {
            parts: [{ text: "Hi" }],
          },
        ],
      },
      errorMessagePath: "error.message"
    });
  };

  // 并行发起两个请求
  const results = await Promise.allSettled([checkProModel(), checkFreeModel()]);
  
  const [proResult, freeResult] = results;

  // 优先处理Pro模型结果
  if (proResult.status === 'fulfilled' && proResult.value.success) {
    return {
      success: true,
      message: "✅ Gemini API 密钥有效。(Paid)",
      isPaid: true
    };
  }

  // 处理免费模型结果
  if (freeResult.status === 'fulfilled' && freeResult.value.success) {
    return {
      success: true,
      message: "✅ Gemini API 密钥有效。(Free)",
      isPaid: false
    };
  }

  // 如果两个请求都失败，处理错误
  const proErrorValue = proResult.status === 'fulfilled' ? proResult.value : null;
  const freeErrorValue = freeResult.status === 'fulfilled' ? freeResult.value : null;

  // 优先检查限速错误 (429)
  if ((proErrorValue?.response?.status === 429) || (freeErrorValue?.response?.status === 429)) {
    const ratelimitedError = proErrorValue?.response?.status === 429 ? proErrorValue : freeErrorValue;
    return {
      success: false,
      status: 'ratelimited',
      message: `🚧 Gemini API 限速: ${ratelimitedError.error}`
    };
  }

  // 如果两个请求都失败，返回免费模型的错误信息（更具代表性）
  const freeError = freeErrorValue
    ? freeErrorValue.error
    : (freeResult.reason?.message || "免费模型检测失败");

  return {
    success: false,
    message: `❌ Gemini API 错误：${freeError}`
  };
}

/**
 * 检测Deepseek API密钥
 * @param {string} apiKey - Deepseek API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkDeepseekKey(apiKey) {
  const defaultModel = getDefaultModel('deepseek');
  
  const result = await sendApiRequest({
    url: "https://api.deepseek.com/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return { success: false, message: `❌ Deepseek API 错误：${result.error}` };
  }

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
}

/**
 * 检测Groq API密钥
 * @param {string} apiKey - Groq API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkGroqKey(apiKey) {
  const defaultModel = getDefaultModel('groq');
  
  const result = await sendApiRequest({
    url: "https://api.groq.com/openai/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return {
      success: false,
      message: `❌ Groq API 错误：${result.error}`
    };
  }

  // 获取速率限制
  const rateLimit = result.response.headers.get("x-ratelimit-limit-tokens");
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
}

/**
 * 检测Siliconflow API密钥
 * @param {string} apiKey - Siliconflow API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkSiliconflowKey(apiKey) {
  const defaultModel = getDefaultModel('siliconflow');
  
  const result = await sendApiRequest({
    url: "https://api.siliconflow.cn/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return { success: false, message: `❌ Siliconflow API 错误：${result.error}` };
  }

  let balance = null;
  let chargeBalance = null;
  let giftBalance = null;
  let message = "✅ Siliconflow API 密钥有效。";
  
  try {
    const balanceResult = await checkSiliconflowBalance(apiKey);
    if (balanceResult.success) {
      balance = parseFloat(balanceResult.data.totalBalance);
      chargeBalance = parseFloat(balanceResult.data.chargeBalance);
      giftBalance = parseFloat(balanceResult.data.giftBalance);
      message += ` 总余额: ${balanceResult.data.totalBalance} CNY (充值: ${balanceResult.data.chargeBalance} CNY, 赠送: ${balanceResult.data.giftBalance} CNY)`;
    }
  } catch (e) {
    logger.warn('查询Siliconflow余额失败', e);
  }
  
  return {
    success: true,
    message,
    isPaid: true,
    balance,
    chargeBalance,
    giftBalance
  };
}

/**
 * 检测xAI API密钥
 * @param {string} apiKey - xAI API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkXAIKey(apiKey) {
  const defaultModel = getDefaultModel('xai');
  
  const result = await sendApiRequest({
    url: "https://api.x.ai/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return {
      success: false,
      message: `❌ xAI API 错误：${result.error}`
    };
  }

  return {
    success: true,
    message: "✅ xAI API 密钥有效。",
    isPaid: true
  };
}

/**
 * 检测OpenRouter API密钥
 * @param {string} apiKey - OpenRouter API密钥
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkOpenRouterKey(apiKey) {
  const defaultModel = getDefaultModel('openrouter');
  
  const result = await sendApiRequest({
    url: "https://openrouter.ai/api/v1/chat/completions",
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: defaultModel,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return { success: false, message: `❌ OpenRouter API 错误：${result.error}` };
  }

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
}

/**
 * 检测自定义OpenAI兼容接口
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} - 检测结果
 */
export async function checkCustomEndpoint(endpoint, apiKey, model = "gpt-3.5-turbo") {
  // 处理endpoint的结尾斜杠
  const processedEndpoint = endpoint.endsWith("/") ? endpoint : endpoint + "/v1/";
  
  const result = await sendApiRequest({
    url: `${processedEndpoint}chat/completions`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: model,
      messages: [{ role: "user", content: "Hi" }],
      max_tokens: 10,
    },
    errorMessagePath: "error.message"
  });

  if (!result.success) {
    return {
      success: false,
      message: `❌ 自定义接口错误：${result.error}`
    };
  }

  let balance = null;
  let message = "✅ 自定义 OpenAI 兼容接口可用。";
  let isPaid = false; // 默认不是付费

  try {
    const balanceData = await getStandardBalance(apiKey, endpoint);
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
 * 通用的标准余额查询函数
 * @param {string} apiKey - API密钥
 * @param {string} baseUrl - 基础URL
 * @returns {Promise<Object>} - 余额信息
 */
async function getStandardBalance(apiKey, baseUrl) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const startDate = `${year}-${month}-01`;
  
  // 获取当月的最后一天
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const lastDay = new Date(nextMonth - 1);
  const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, "0")}`;

  const headers = { Authorization: `Bearer ${apiKey}` };
  
  // 处理URL格式，确保兼容不同的端点格式
  const processedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const subUrl = `${processedBaseUrl}/v1/dashboard/billing/subscription`;
    const usageUrl = `${processedBaseUrl}/v1/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`;

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
    logger.error('查询余额时出错', error);
    return { success: false, message: error.message };
  }
}

/**
 * 获取OpenAI兼容接口的余额信息
 * @param {string} apiKey
 * @param {string} baseUrl
 * @returns {Promise<Object>}
 */
async function getOpenAIBalance(apiKey, baseUrl) {
  return getStandardBalance(apiKey, 'https://api.openai.com');
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
 * 查询自定义OpenAI兼容接口额度
 * @param {string} endpoint - 接口地址
 * @param {string} apiKey - API密钥
 * @returns {Promise<Object>} - 额度信息
 */
export async function checkCustomEndpointQuota(endpoint, apiKey) {
  try {
    const balanceResult = await getStandardBalance(apiKey, endpoint);

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
