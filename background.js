/**
 * 后台脚本 - 处理浏览器扩展的后台任务
 */

// 添加控制台日志来调试
console.log('Background script loaded');

/**
 * 初始化侧边栏功能
 */
function initSidePanel() {
  // 检查 sidePanel API 是否可用
  if (!chrome.sidePanel) {
    console.warn('chrome.sidePanel API 不可用');
    return;
  }

  // 跟踪侧边栏状态
  let isSidePanelOpen = false;

  // 处理插件图标点击事件
  chrome.action.onClicked.addListener((tab) => {
    console.log('Icon clicked, current state:', isSidePanelOpen);
    
    // 切换侧边栏状态
    isSidePanelOpen = !isSidePanelOpen;
    
    try {
      if (isSidePanelOpen) {
        // 打开侧边栏
        if (chrome.sidePanel?.open) {
          chrome.sidePanel.open({
            tabId: tab.id
          }).catch(err => {
            console.error('Failed to open sidepanel:', err);
          });
          console.log('Sidepanel opened');
        }
        
        // 设置图标为激活状态
        chrome.action.setIcon({
          path: "icon.png"
        });
      } else {
        // 关闭侧边栏
        if (chrome.sidePanel?.close) {
          chrome.sidePanel.close({
            tabId: tab.id
          }).catch(err => {
            console.error('Failed to close sidepanel:', err);
          });
          console.log('Sidepanel closed');
        }
        
        // 恢复图标为默认状态
        chrome.action.setIcon({
          path: "icon.png"
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  // 监听侧边栏关闭事件
  if (chrome.sidePanel?.onClose) {
    chrome.sidePanel.onClose.addListener(() => {
      console.log('Sidepanel closed by user');
      isSidePanelOpen = false;
      // 恢复图标为默认状态
      chrome.action.setIcon({
        path: "icon.png"
      });
    });
  }
}

// 初始化扩展
function init() {
  initSidePanel();
}

// 启动扩展
init();
