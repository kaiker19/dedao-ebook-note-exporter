console.log("Content script loaded on:", window.location.href);
console.log("Page title:", document.title);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "exportNotes") {
    exportNotes();
  } else if (message.action === "downloadStarted") {
    alert('笔记导出成功！');
  } else if (message.action === "downloadError") {
    alert(`导出失败：${message.error}`);
  }
  
  return true;
});

function exportNotes() {
  console.log("Starting to export notes");
  try {
    // 首先获取书籍标题用于文件命名
    let bookTitle = "得到笔记";
    const catalogElement = document.querySelector('.iget-reader-catalog-name');
    if (catalogElement) {
      const bookNameElement = catalogElement.querySelector('.iget-reader-catalog-book-name');
      if (bookNameElement) {
        bookTitle = bookNameElement.textContent.trim();
        console.log("Found book title:", bookTitle);
      }
    }
    
    const noteList = document.querySelector('.reader-note-list');
    console.log("Note list element:", noteList);
    
    if (!noteList) {
      alert('未找到笔记内容，请确保你在得到读书的笔记页面。');
      return;
    }

    let markdown = '';
    const notes = noteList.querySelectorAll('.reader-note-item');
    console.log(`Found ${notes.length} notes`);
    
    notes.forEach((note, index) => {
      console.log(`Processing note ${index + 1}`);
      // 获取标题
      const title = note.querySelector('.reader-note-item-title').textContent.trim();
      markdown += `## ${title}\n\n`;
      
      // 获取笔记内容
      const contents = note.querySelectorAll('.reader-note-contents-item');
      contents.forEach((content) => {
        markdown += `${content.textContent.trim()}\n\n`;
      });
    });

    console.log("Sending markdown to background script");
    // 发送数据到background script处理下载，包含书籍标题
    chrome.runtime.sendMessage({
      action: "downloadMarkdown",
      markdown: markdown,
      bookTitle: bookTitle
    });
    
  } catch (error) {
    console.error("Error in exportNotes:", error);
    alert('导出过程中发生错误，请查看控制台获取详细信息');
  }
}
