console.log("Content script loaded on:", window.location.href);
console.log("Page title:", document.title);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
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
    
    // 展开所有层级的目录，然后构建映射
    expandAllLevels(() => {
      // 展开完成后的回调
      const catalogMap = buildCatalogMap();
      processNotes(catalogMap, bookTitle);
    });
    
  } catch (error) {
    console.error("Error in exportNotes:", error);
    alert('导出过程中发生错误，请查看控制台获取详细信息');
  }
}

// 动态构建多级目录映射
function buildCatalogMap() {
  const catalogItems = document.querySelectorAll('.iget-reader-catalog-content li');
  const catalogMap = [];
  const paddingLevels = new Set();
  
  // 第一遍：收集所有padding值
  catalogItems.forEach(item => {
    const style = item.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    paddingLevels.add(padding);
  });
  
  // 将padding值排序，建立动态层级映射
  const sortedPaddings = Array.from(paddingLevels).sort((a, b) => a - b);
  const paddingToLevel = {};
  sortedPaddings.forEach((padding, index) => {
    paddingToLevel[padding] = index + 1; // 从1级开始
  });
  
  console.log("动态检测到的层级结构:", paddingToLevel);
  
  // 第二遍：构建目录映射
  catalogItems.forEach(item => {
    const text = item.querySelector('.iget-reader-catalog-item-text')?.textContent.trim();
    const style = item.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    
    if (text) {
      const level = paddingToLevel[padding] || 1;
      
      catalogMap.push({
        title: text,
        level: level,
        padding: padding
      });
    }
  });
  
  console.log(`Built catalog with ${catalogMap.length} items:`);
  catalogMap.forEach((item, index) => {
    if (index < 10) { // 只显示前10个，避免日志过长
      console.log(`  ${index + 1}. "${item.title}" (level ${item.level}, padding: ${item.padding}px)`);
    }
  });
  if (catalogMap.length > 10) {
    console.log(`  ... and ${catalogMap.length - 10} more items`);
  }
  
  return catalogMap;
}

// 处理笔记的主要逻辑
function processNotes(catalogMap, bookTitle) {
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
    
    // 对前3个笔记显示详细的匹配信息
    if (index < 3) {
      console.log(`\n📝 Note ${index + 1}: "${noteTitle}"`);
      if (catalogItem) {
        console.log(`✓ Match: "${noteTitle}" → level ${catalogItem.level} (padding: ${catalogItem.padding}px)`);
      } else {
        console.log(`✗ No match: "${noteTitle}"`);
      }
    }
    
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
}

// 动态分批逐层展开目录：自动检测所有层级
function expandAllLevels(callback) {
  try {
    console.log("开始动态分批展开目录...");
    
    // 动态检测所有层级
    const allPaddings = detectAllLevels();
    console.log("检测到的所有层级:", allPaddings);
    
    // 递归展开每个层级
    expandLevelsRecursively(allPaddings, 0, callback);
    
  } catch (error) {
    console.warn("展开目录失败:", error);
    callback();
  }
}

// 检测当前页面的所有层级
function detectAllLevels() {
  const items = document.querySelectorAll('.iget-reader-catalog-content li');
  const paddingSet = new Set();
  
  items.forEach(li => {
    const style = li.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    paddingSet.add(padding);
  });
  
  // 按padding值排序，从小到大（层级从浅到深）
  return Array.from(paddingSet).sort((a, b) => a - b);
}

// 递归展开各层级
function expandLevelsRecursively(paddingLevels, currentIndex, callback) {
  if (currentIndex >= paddingLevels.length) {
    console.log("所有层级展开完成");
    callback();
    return;
  }
  
  const currentPadding = paddingLevels[currentIndex];
  const levelNumber = currentIndex + 1;
  const levelName = getLevelName(levelNumber);
  
  expandLevel(currentPadding, levelName, () => {
    // 展开下一层级
    expandLevelsRecursively(paddingLevels, currentIndex + 1, callback);
  });
}

// 获取层级名称
function getLevelName(levelNumber) {
  const levelNames = ["一级", "二级", "三级", "四级", "五级", "六级", "七级", "八级"];
  return levelNames[levelNumber - 1] || `${levelNumber}级`;
}

// 展开指定层级的函数
function expandLevel(targetPadding, levelName, callback) {
  console.log(`\n--- 展开${levelName}标题 (${targetPadding}px) ---`);
  
  const items = document.querySelectorAll('.iget-reader-catalog-content li');
  let expandedCount = 0;
  
  items.forEach(li => {
    const style = li.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    
    if (padding === targetPadding) {
      const expandIcon = li.querySelector('.iget-icon-play');
      const text = li.querySelector('.iget-reader-catalog-item-text')?.textContent.trim();
      
      // 检查是否已展开（避免重复点击）
      const isAlreadyExpanded = expandIcon?.classList.contains('catalog-item-icon-actived');
      
      if (expandIcon && !isAlreadyExpanded && typeof expandIcon.click === 'function') {
        console.log(`展开: "${text}"`);
        expandIcon.click();
        expandedCount++;
      } else if (isAlreadyExpanded) {
        console.log(`跳过已展开: "${text}"`);
      }
    }
  });
  
  console.log(`${levelName}标题展开完成，新展开 ${expandedCount} 个项目`);
  
  // 等待DOM更新后执行下一批
  setTimeout(callback, 300);
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
