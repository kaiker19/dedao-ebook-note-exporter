console.log("Content script loaded on:", window.location.href);
console.log("Page title:", document.title);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);
  
  if (message.action === "exportNotes") {
    exportNotes();
    sendResponse({success: true});
  } else if (message.action === "downloadStarted") {
    alert('笔记导出成功！');
    sendResponse({success: true});
  } else if (message.action === "downloadError") {
    alert(`导出失败：${message.error}`);
    sendResponse({success: false});
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
    
    // 构建目录映射
    const catalogMap = buildCatalogMap();
    
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
      const noteTitle = note.querySelector('.reader-note-item-title').textContent.trim();
      
      // 查找匹配的目录项
      const catalogItem = findCatalogMatch(noteTitle, catalogMap);
      
      if (catalogItem) {
        // 根据目录层级设置Markdown标题级别
        const markdownLevel = '#'.repeat(catalogItem.level);
        markdown += `${markdownLevel} ${noteTitle}\n\n`;
      } else {
        markdown += `## ${noteTitle}\n\n`;
      }
      
      // 获取笔记内容
      const contents = note.querySelectorAll('.reader-note-contents-item');
      contents.forEach((content) => {
        markdown += `${content.textContent.trim()}\n\n`;
      });
    });

    console.log("Sending markdown to background script");
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

// 构建完整目录映射
function buildCatalogMap() {
  const catalogItems = document.querySelectorAll('.iget-reader-catalog-content li');
  const catalogMap = [];
  
  catalogItems.forEach(item => {
    const text = item.querySelector('.iget-reader-catalog-item-text')?.textContent.trim();
    const style = item.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    
    if (text) {
      // 根据padding-left确定层级：56px=1级，76px=2级，96px=3级
      let level = 2; // 默认二级
      if (padding === 56) level = 1;
      else if (padding === 76) level = 2;
      else if (padding === 96) level = 3;
      
      catalogMap.push({
        title: text,
        level: level,
        padding: padding
      });
    }
  });
  
  console.log(`Built catalog with ${catalogMap.length} items`);
  return catalogMap;
}

// 查找匹配的目录项
function findCatalogMatch(noteTitle, catalogMap) {
  // 精确匹配
  let match = catalogMap.find(item => item.title === noteTitle);
  if (match) return match;
  
  // 模糊匹配
  match = catalogMap.find(item => 
    item.title.includes(noteTitle) || noteTitle.includes(item.title)
  );
  
  return match;
}
