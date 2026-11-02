# 绝叫路人H

纯手写 HTML 博客，mashiro 主题外观，零构建、零依赖。GitHub Pages 直接托管静态文件。

## 结构

- `index.html` —— 首页（文章列表）
- `about.html` —— About 页
- `posts/*.html` —— 每篇文章一个独立 HTML 文件
- `css/style.css` + `css/fonts/` —— 样式与字体（来自 mashiro 主题）
- `js/` —— 移动端导航、代码复制等小脚本

## 新增文章

1. 复制 `posts/` 下任意一篇，或新建 `posts/xxx.html`。
2. 改 `<title>`、`#logo` 里的标题，以及 `.article-meta` 里的日期、分类、标签。
3. 在 `.article-entry` 里直接写正文（HTML）。
4. 在 `index.html` 里复制一个 `<article>` 卡片并改链接。

## 发布

无需构建：commit 并 push 到 GitHub Pages 的部署分支即可生效。
