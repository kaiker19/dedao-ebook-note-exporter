browser.runtime.onMessage.addListener((message, sender) => {
  console.log("Background script received message:", message);
  
  if (message.action === "downloadMarkdown") {
    console.log("Processing download request");
    try {
      const blob = new Blob([message.markdown], {type: 'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      browser.downloads.download({
        url: url,
        filename: `dedao-notes-${timestamp}.txt`,
        saveAs: true
      }).then(() => {
        console.log("Download started");
        browser.tabs.sendMessage(sender.tab.id, {
          action: "downloadStarted"
        }).catch(console.error);
      }).catch((error) => {
        console.error("Download error:", error);
        browser.tabs.sendMessage(sender.tab.id, {
          action: "downloadError",
          error: error.message
        }).catch(console.error);
      });
    } catch (error) {
      console.error("Error in background script:", error);
      browser.tabs.sendMessage(sender.tab.id, {
        action: "downloadError",
        error: error.message
      }).catch(console.error);
    }
  }
});
