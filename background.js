// 添加控制台日志来调试
console.log('Background script loaded');
// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// 跟踪侧边栏状态
let isSidePanelOpen = false;

// 处理插件图标点击事件
chrome.action.onClicked.addListener(async () => {
  console.log('Icon clicked, current state:', isSidePanelOpen);
  
  // 切换侧边栏状态
  isSidePanelOpen = !isSidePanelOpen;
  
  try {
    if (isSidePanelOpen) {
      // 打开侧边栏
      await chrome.sidePanel.open();
      console.log('Sidepanel opened');
      
      // 设置图标为激活状态
      chrome.action.setIcon({
        path: "icon-active.png"
      });
    } else {
      // 关闭侧边栏
      await chrome.sidePanel.close();
      console.log('Sidepanel closed');
      
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
chrome.sidePanel.onClose.addListener(() => {
  console.log('Sidepanel closed by user');
  isSidePanelOpen = false;
  // 恢复图标为默认状态
  chrome.action.setIcon({
    path: "icon.png"
  });
});