# 得到读书笔记导出插件

一个简单的浏览器扩展，用于将得到读书PC版的笔记导出为Markdown格式的文本文件。支持Firefox和Chrome浏览器。

## 功能特性

- 一键导出当前页面的读书笔记
- 保持原有的笔记结构（标题和内容）
- 导出为易于阅读的Markdown格式
- 自动保存为带时间戳的txt文件

## 安装说明

### Firefox版本

1. 在Firefox地址栏输入 `about:debugging`
2. 点击"此Firefox"（This Firefox）
3. 点击"临时载入附加组件"（Load Temporary Add-on）
4. 选择`firefox`目录中的 `manifest.json` 文件

### Chrome版本

1. 打开Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择`chrome`目录

## 使用方法

1. 访问得到读书的笔记页面
2. 点击浏览器工具栏中的插件图标
3. 在弹出窗口中点击"导出笔记"按钮
4. 选择保存位置并保存文件

## 导出格式

导出的文件格式如下：

```markdown
## 章节标题1

笔记内容1

笔记内容2

## 章节标题2

笔记内容1

笔记内容2
```

## 注意事项

- 使用前请确保已登录得到读书
- 请确保在笔记页面使用此插件
- 导出的文件默认包含时间戳，便于区分不同时间的导出

## 目录结构

```
DedaoNotesExporter/
├── chrome/                 # Chrome版本
│   ├── manifest.json      # Chrome配置文件 (Manifest V3)
│   ├── popup.html        # 弹出窗口界面
│   ├── popup.js         # 弹出窗口逻辑
│   ├── content.js       # 内容脚本
│   └── background.js    # 后台脚本
├── firefox/                # Firefox版本
│   ├── manifest.json      # Firefox配置文件 (Manifest V2)
│   ├── popup.html        # 弹出窗口界面
│   ├── popup.js         # 弹出窗口逻辑
│   ├── content.js       # 内容脚本
│   └── background.js    # 后台脚本
└── README.md              # 说明文档
```

## 技术说明

### 浏览器兼容性

- Firefox版本使用WebExtension API的`browser.*`命名空间
- Chrome版本使用Chrome Extensions API的`chrome.*`命名空间
- Firefox使用Manifest V2，Chrome使用Manifest V3

### 主要功能模块

- `popup.js`: 处理用户界面交互
- `content.js`: 提取页面笔记内容
- `background.js`: 处理文件下载

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进此插件。
