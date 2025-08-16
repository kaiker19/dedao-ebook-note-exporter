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
    
    // 展开所有层级的目录，然后构建树形结构并生成上下文笔记
    expandAllLevels(() => {
      const catalogTree = buildCatalogTree();
      processNotesWithContext(catalogTree, bookTitle);
    });
    
  } catch (error) {
    console.error("Error in exportNotes:", error);
    alert('导出过程中发生错误，请查看控制台获取详细信息');
  }
}

// 构建目录树结构
function buildCatalogTree() {
  const catalogItems = document.querySelectorAll('.iget-reader-catalog-content li');
  const paddingLevels = new Set();
  
  // 收集所有padding值并建立层级映射
  catalogItems.forEach(item => {
    const style = item.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    paddingLevels.add(padding);
  });
  
  const sortedPaddings = Array.from(paddingLevels).sort((a, b) => a - b);
  const paddingToLevel = {};
  sortedPaddings.forEach((padding, index) => {
    paddingToLevel[padding] = index + 1;
  });
  
  // 构建扁平的节点列表
  const nodes = [];
  catalogItems.forEach(item => {
    const text = item.querySelector('.iget-reader-catalog-item-text')?.textContent.trim();
    const style = item.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    
    if (text) {
      nodes.push({
        title: text,
        level: paddingToLevel[padding] || 1,
        padding: padding
      });
    }
  });
  
  // 构建树形结构
  const tree = buildTreeFromNodes(nodes);
  console.log(`构建目录树完成，共 ${nodes.length} 个节点`);
  
  return tree;
}

// 从扁平节点列表构建树形结构
function buildTreeFromNodes(nodes) {
  const tree = [];
  const stack = []; // 存储各级父节点
  
  nodes.forEach(node => {
    const newNode = {
      ...node,
      children: []
    };
    
    // 找到正确的父节点
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    
    if (stack.length === 0) {
      // 根节点
      tree.push(newNode);
    } else {
      // 子节点
      stack[stack.length - 1].children.push(newNode);
    }
    
    stack.push(newNode);
  });
  
  return tree;
}

// 带上下文处理笔记的主要逻辑
function processNotesWithContext(catalogTree, bookTitle) {
  const noteList = document.querySelector('.reader-note-list');
  
  if (!noteList) {
    alert('未找到笔记内容，请确保你在得到读书的笔记页面。');
    return;
  }

  const notes = noteList.querySelectorAll('.reader-note-item');
  console.log(`开始处理 ${notes.length} 个笔记，构建上下文结构`);
  
  // 收集笔记路径和内容
  const notePathsMap = new Map();
  notes.forEach(note => {
    const noteTitle = note.querySelector('.reader-note-item-title').textContent.trim();
    const contents = note.querySelectorAll('.reader-note-contents-item');
    const noteContent = Array.from(contents).map(c => c.textContent.trim()).join('\n\n');
    
    // 在目录树中找到完整路径
    const fullPath = findNotePathInTree(noteTitle, catalogTree);
    if (fullPath) {
      notePathsMap.set(noteTitle, {
        path: fullPath,
        content: noteContent
      });
    } else {
      // 未匹配的笔记使用默认处理
      notePathsMap.set(noteTitle, {
        path: [noteTitle],
        content: noteContent,
        level: 2
      });
    }
  });
  
  // 构建最小必要的目录结构
  const contextStructure = buildContextStructure(notePathsMap);
  
  // 生成带上下文的Markdown
  const markdown = generateContextualMarkdown(contextStructure);
  
  console.log("笔记上下文处理完成");
  chrome.runtime.sendMessage({
    action: "downloadMarkdown",
    markdown: markdown,
    bookTitle: bookTitle
  });
}

// 动态分批逐层展开目录：自动检测所有层级
function expandAllLevels(callback) {
  try {
    console.log("展开目录中...");
    
    // 动态检测所有层级
    const allPaddings = detectAllLevels();
    
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
    console.log("目录展开完成");
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
  const items = document.querySelectorAll('.iget-reader-catalog-content li');
  let expandedCount = 0;
  
  items.forEach(li => {
    const style = li.getAttribute('style') || '';
    const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
    const padding = paddingMatch ? parseInt(paddingMatch[1]) : 56;
    
    if (padding === targetPadding) {
      const expandIcon = li.querySelector('.iget-icon-play');
      
      // 检查是否已展开（避免重复点击）
      const isAlreadyExpanded = expandIcon?.classList.contains('catalog-item-icon-actived');
      
      if (expandIcon && !isAlreadyExpanded && typeof expandIcon.click === 'function') {
        expandIcon.click();
        expandedCount++;
      }
    }
  });
  
  if (expandedCount > 0) {
    console.log(`展开${levelName} ${expandedCount}项`);
  }
  
  // 等待DOM更新后执行下一批
  setTimeout(callback, 300);
}



// 在目录树中查找笔记的完整路径
function findNotePathInTree(noteTitle, tree) {
  function searchNode(node, currentPath) {
    const newPath = [...currentPath, {title: node.title, level: node.level}];
    
    // 检查当前节点是否匹配
    if (fuzzyMatch(node.title, noteTitle)) {
      return newPath;
    }
    
    // 递归搜索子节点
    for (const child of node.children) {
      const result = searchNode(child, newPath);
      if (result) return result;
    }
    
    return null;
  }
  
  // 从所有根节点开始搜索
  for (const rootNode of tree) {
    const result = searchNode(rootNode, []);
    if (result) return result;
  }
  
  return null;
}

// 模糊匹配函数
function fuzzyMatch(catalogTitle, noteTitle) {
  // 精确匹配
  if (catalogTitle === noteTitle) return true;
  
  // 包含匹配
  if (catalogTitle.includes(noteTitle) || noteTitle.includes(catalogTitle)) return true;
  
  return false;
}

// 构建最小必要的上下文结构
function buildContextStructure(notePathsMap) {
  const structure = {};
  
  for (const [noteTitle, {path, content}] of notePathsMap) {
    if (path.length === 1 && path[0] === noteTitle) {
      // 未匹配的笔记，直接添加
      if (!structure['未分类']) {
        structure['未分类'] = {level: 1, children: {}, notes: []};
      }
      structure['未分类'].notes.push({title: noteTitle, content});
    } else {
      // 有完整路径的笔记，构建层级结构
      let current = structure;
      
      path.forEach((segment, index) => {
        if (!current[segment.title]) {
          current[segment.title] = {
            level: segment.level,
            children: {},
            notes: []
          };
        }
        
        // 如果是最后一级，添加笔记
        if (index === path.length - 1) {
          current[segment.title].notes.push({title: noteTitle, content});
        }
        
        current = current[segment.title].children;
      });
    }
  }
  
  return structure;
}

// 生成带上下文的Markdown
function generateContextualMarkdown(structure) {
  let markdown = '';
  
  function renderNode(node, title, level) {
    const hasNotes = node.notes.length > 0;
    const hasChildren = Object.keys(node.children).length > 0;
    
    if (hasNotes || hasChildren) {
      // 生成标题
      const prefix = '#'.repeat(level);
      markdown += `${prefix} ${title}\n\n`;
      
      // 渲染当前级别的笔记
      node.notes.forEach(note => {
        markdown += `${note.content}\n\n`;
      });
      
      // 递归渲染子节点
      for (const [childTitle, childNode] of Object.entries(node.children)) {
        renderNode(childNode, childTitle, level + 1);
      }
    }
  }
  
  // 从根级别开始渲染
  for (const [title, node] of Object.entries(structure)) {
    renderNode(node, title, node.level);
  }
  
  return markdown;
}
