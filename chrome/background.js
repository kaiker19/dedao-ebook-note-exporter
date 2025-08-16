chrome.runtime.onMessage.addListener((message, sender) => {
  
  if (message.action === "downloadMarkdown") {
    try {
      // 在Manifest V3的Service Worker中，使用FileReader将Blob转换为Data URL
      const blob = new Blob([message.markdown], {type: 'text/plain;charset=utf-8'});
      
      // 使用书籍标题作为文件名，如果没有则使用默认名称
      let filename = "得到笔记.txt";
      if (message.bookTitle && message.bookTitle.trim()) {
        // 清理文件名中的非法字符
        const cleanTitle = message.bookTitle.trim()
          .replace(/[<>:"/\\|?*]/g, '') // 移除Windows非法字符
          .replace(/\s+/g, ' '); // 多个空格合并为一个
        filename = `${cleanTitle}.txt`;
      }

      
      const reader = new FileReader();
      reader.onload = function() {
        const dataUrl = reader.result;
        
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        }).then((downloadId) => {
          // 文件保存对话框本身就是用户反馈，不需要额外的成功提示
          
        }).catch((error) => {
          console.error("Download error:", error);
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "downloadError",
            error: error.message
          }).catch(console.error);
        });
      };
      
      reader.onerror = function(error) {
        console.error("FileReader error:", error);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "downloadError",
          error: "文件读取失败"
        }).catch(console.error);
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error("Error in background script:", error);
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "downloadError",
        error: error.message
      }).catch(console.error);
    }
  }
});
