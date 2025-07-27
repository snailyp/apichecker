/**
 * 帮助系统模块 - 为API密钥检测器提供帮助说明功能
 */

// 厂商信息配置
const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    pattern: '/(sk-proj-\\S{156}|sk-proj-\\S{124}|sk-proj-\\S{48}|sk-[a-zA-Z0-9]{48})/g',
    example: 'sk-proj-xxx... 或 sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.openai.com',
    description: 'OpenAI官方API，支持GPT系列模型，包括GPT-4、GPT-3.5等'
  },
  claude: {
    name: 'Claude (Anthropic)',
    pattern: '/sk-ant-api03-\\S{95}/g',
    example: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.anthropic.com',
    description: 'Anthropic的Claude AI模型API，支持Claude-3.5-Sonnet等高质量对话模型'
  },
  gemini: {
    name: 'Google Gemini',
    pattern: '/AIzaSy\\S{33}/g',
    example: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://generativelanguage.googleapis.com',
    description: 'Google的Gemini AI模型API，支持多模态输入和高效推理'
  },
  deepseek: {
    name: 'DeepSeek',
    pattern: '/sk-[a-zA-Z0-9]{32}/g',
    example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.deepseek.com',
    description: 'DeepSeek AI模型API，专注于代码生成和对话，性价比高'
  },
  groq: {
    name: 'Groq',
    pattern: '/gsk_[a-zA-Z0-9]{52}/g',
    example: 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.groq.com',
    description: 'Groq高速推理API，提供超快的模型推理速度'
  },
  siliconflow: {
    name: 'SiliconFlow',
    pattern: '/sk-[a-zA-Z0-9]{48}/g',
    example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.siliconflow.cn',
    description: 'SiliconFlow AI模型API平台，提供多种开源模型服务'
  },
  xai: {
    name: 'xAI (Grok)',
    pattern: '/xai-[a-zA-Z0-9]{80}/g',
    example: 'xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://api.x.ai',
    description: 'xAI的Grok模型API，具有实时信息获取能力'
  },
  openrouter: {
    name: 'OpenRouter',
    pattern: '/sk-or-v1-[a-f0-9]{64}/g',
    example: 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    endpoint: 'https://openrouter.ai/api',
    description: 'OpenRouter多模型聚合API平台，一个密钥访问多种AI模型'
  }
};

// 帮助系统类
class HelpSystem {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    this.createModal();
    this.bindEvents();
  }

  createModal() {
    const modalHTML = `
      <div id="helpModal" class="help-modal">
        <div class="help-modal-content">
          <div class="help-modal-header">
            <h3 id="helpModalTitle">API密钥格式说明</h3>
            <span class="help-modal-close">&times;</span>
          </div>
          <div class="help-modal-body" id="helpModalBody">
            <!-- 内容将通过JavaScript动态填充 -->
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('helpModal');
  }

  bindEvents() {
    // 绑定帮助图标点击事件
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('help-icon')) {
        const provider = e.target.dataset.provider;
        this.showHelp(provider);
      }
    });

    // 绑定关闭事件
    const closeBtn = this.modal.querySelector('.help-modal-close');
    closeBtn.addEventListener('click', () => this.hideHelp());

    // 点击模态框外部关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hideHelp();
      }
    });

    // ESC键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'block') {
        this.hideHelp();
      }
    });
  }

  showHelp(provider) {
    const info = PROVIDER_INFO[provider];
    if (!info) return;

    // 获取默认模型
    const defaultModel = this.getDefaultModel(provider);

    // 更新标题
    document.getElementById('helpModalTitle').textContent = `${info.name} - 密钥格式说明`;

    // 更新内容
    const bodyHTML = `
      <div class="help-info-item">
        <div class="help-info-label">🔑 密钥格式规则</div>
        <div class="help-info-value">${info.pattern}</div>
        <div class="help-info-description">正则表达式匹配模式</div>
      </div>
      
      <div class="help-info-item">
        <div class="help-info-label">📝 密钥示例</div>
        <div class="help-info-value">${info.example}</div>
        <div class="help-info-description">正确的密钥格式示例</div>
      </div>
      
      <div class="help-info-item">
        <div class="help-info-label">🌐 API端点</div>
        <div class="help-info-value">${info.endpoint}</div>
        <div class="help-info-description">API请求的基础地址</div>
      </div>
      
      <div class="help-info-item">
        <div class="help-info-label">🤖 默认测试模型</div>
        <div class="help-info-value">${defaultModel}</div>
        <div class="help-info-description">用于验证密钥的默认模型</div>
      </div>
      
      <div class="help-info-item">
        <div class="help-info-label">ℹ️ 说明</div>
        <div class="help-info-description">${info.description}</div>
      </div>
    `;

    document.getElementById('helpModalBody').innerHTML = bodyHTML;

    // 显示模态框
    this.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  hideHelp() {
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }

  getDefaultModel(provider) {
    const defaultModels = {
      openai: 'gpt-4o',
      claude: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      groq: 'llama-3.3-70b-versatile',
      siliconflow: 'Qwen/Qwen2.5-72B-Instruct',
      xai: 'grok-3-mini',
      openrouter: 'openrouter/auto'
    };
    return defaultModels[provider] || '未配置';
  }
}

// 导出帮助系统
export { HelpSystem, PROVIDER_INFO };