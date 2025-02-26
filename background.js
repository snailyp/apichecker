/**
 * 后台脚本 - 处理浏览器扩展的后台任务
 */

import * as logger from "./js/logger.js";

// 初始化时添加日志
logger.info("Background script loaded");

/**
 * 初始化侧边栏功能
 */
function initSidePanel() {
  // 检查 sidePanel API 是否可用
  if (!chrome.sidePanel) {
    console.warn("chrome.sidePanel API 不可用");
    return;
  }

  // 初始化时设置基本配置
  chrome.sidePanel.setOptions({
    enabled: true, // 确保侧边栏功能被启用
    path: "sider.html",
  });

  // 跟踪侧边栏状态
  let sidePanelOpen = false;

  // 处理插件图标点击事件
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      if (sidePanelOpen) {
        // 如果侧边栏已打开，则通过切换状态来关闭它
        chrome.sidePanel.setOptions({
          enabled: false,
        });
        logger.debug("Sidepanel disabled");
        sidePanelOpen = false;
      } else {
        // 如果侧边栏已关闭，则启用并打开它
        chrome.sidePanel.setOptions({
          enabled: true,
          path: "sider.html",
        });
        await chrome.sidePanel.open({ tabId: tab.id });
        logger.debug("Sidepanel opened", { tabId: tab.id });
        sidePanelOpen = true;
      }
    } catch (error) {
      logger.error("侧边栏操作失败", error);
    }
  });
}

// 初始化扩展
function init() {
  initSidePanel();
}

// 启动扩展
init();
