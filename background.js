chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "openSettings") {
    chrome.tabs.create({'url': 'settings.html'});
  }
});

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  await chrome.sidePanel.setOptions({
    tabId,
    path: 'side_panel.html',
    enabled: true
  });
});


chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "downloadSubtitles",
    title: "下载视频字幕文件(SRT)",
    contexts: ["all"],
    documentUrlPatterns: [
      "*://*.youtube.com/watch*",
      "*://*.bilibili.com/video/*",
      "*://*.bilibili.com/list/watchlater*"
    ]
  });
  chrome.contextMenus.create({
    id: "copyPurePageContent",
    title: "复制网页正文(纯文本)",
    contexts: ["all"]
  });
  chrome.contextMenus.create({
    id: "copyPageContent",
    title: "复制网页正文(HTML)",
    contexts: ["all"]
  });
  
});

// 监听菜单项的点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "copyPageContent") {
    chrome.tabs.sendMessage(tab.id, {action: 'copyPageContent'});
  } else if(info.menuItemId === "copyPurePageContent") {
    chrome.tabs.sendMessage(tab.id, {action: 'copyPurePageContent'});
  } else if(info.menuItemId === "downloadSubtitles") {
    chrome.tabs.sendMessage(tab.id, {action: 'downloadSubtitles'});
  }
});
