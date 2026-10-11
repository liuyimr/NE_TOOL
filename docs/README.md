# 工程师工具箱 · 单文件版

这个目录是**单文件版工具箱**，同时作为 GitHub Pages 的站点根目录。

- `index.html` 就是整个应用：JS、CSS、图标（favicon / 触控图标 / 关于页标识）全部内联在这一个文件里，**没有外部依赖**。拷走这一个文件，双击即用，断网也能用。
- 它是**构建产物，请不要手动修改**。需要重新生成时，在仓库根目录执行：

  ```bash
  npm run build:standalone
  ```

- 该文件由 `npm run build:single` 生成后复制而来（复制脚本：`scripts/copy-standalone.mjs`，复制时会做自包含校验）。完整源码工程在同一仓库的根目录。

在线地址：<https://liuyimr.github.io/NE_TOOL/>
