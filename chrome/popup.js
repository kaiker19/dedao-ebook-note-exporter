document.getElementById('exportBtn').addEventListener('click', async () => {
  try {
    console.log("Export button clicked");
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    console.log("Current tab:", tabs[0]);
    
    if (!tabs[0].url.includes("dedao.cn")) {
      alert("请在得到读书页面使用此功能");
      return;
    }
    
    await chrome.tabs.sendMessage(tabs[0].id, {action: "exportNotes"});
    console.log("Message sent to content script");
  } catch (error) {
    console.error("Error in popup script:", error);
    alert("导出失败，请查看控制台获取详细信息");
  }
});
