# 箭头出发！独立源码版

这是原生 HTML + CSS + JavaScript ES Modules 项目，**没有第三方运行或构建依赖**。
无需 Sites SDK、ChatGPT 登录、API Key、数据库或付费服务。

## 本地运行

安装 Node.js 20 或更高版本（建议 Node.js 22），在解压后的目录运行：

```bash
npm ci
npm run dev
```

打开 `http://localhost:5173`。无第三方依赖，`npm ci` 可省略。
修改源码后刷新页面即可；开发服务器不提供热更新，也不注册离线缓存。
不要直接双击 `index.html`：ES Modules 需要 HTTP 服务。

同一 Wi-Fi 下让手机 / 平板访问：

```bash
npm run dev -- --host 0.0.0.0
```

在设备上打开 `http://电脑的局域网IP:5173`。
局域网 HTTP 可测试游戏和布局；PWA 安装与 Service Worker 请使用 HTTPS，
或在电脑自身的 `localhost` 上验证。

## 构建与预览

```bash
npm run build
npm run preview
```

打开 `http://localhost:4173`。`dist/` 是完整可部署的静态文件。
压缩包也附有已经构建好的 `dist/`；修改代码后需要重新构建。

构建只复制源码和静态文件，不压缩或混淆代码，因此部署产物也便于阅读。
构建脚本按照文件内容计算缓存版本，并把资源清单写入 `dist/sw.js`。

## 目录

```text
arrow-garden-source/
├── package.json
├── package-lock.json
├── index.html                  # 开发入口
├── src/
│   ├── main.mjs                # 游戏交互、SVG、选关、缩放和本地存档
│   ├── engine.mjs              # 随机生成、箭头形状、阻挡关系与有解校验
│   ├── styles.css              # 手机、平板横竖屏布局
│   └── pwa.mjs                 # 安装提示、全屏、SW 注册与更新提示
├── public/
│   ├── manifest.webmanifest    # 相对路径，支持 GitHub Pages 子目录
│   ├── sw.js                  # SW 源码；资源清单由 build 注入
│   ├── icons/                 # 192、512 与 Android maskable 图标
│   └── .nojekyll
├── scripts/
│   ├── build.mjs              # 无依赖构建
│   └── serve.mjs              # 本地开发 / 预览 HTTP 服务
├── tests/
│   ├── engine.test.mjs        # 500 关 × 4 种种子，共 2000 局
│   └── package.test.mjs       # 构建、资源、子路径、离线与缓存更新检查
├── .github/workflows/pages.yml
├── .gitignore
└── dist/                      # 已构建的独立静态站点
```

## 平板布局

平板视口（宽度至少 600、高度至少 500 CSS 像素）按当前可用屏幕高度布局。
关卡选择合并到顶栏，操作按钮占用各自空间，正方形棋盘使用剩余空间；
横屏采用棋盘与操作区左右排列。旋转屏幕或切换全屏后自动重新计算。
放大棋盘时只在棋盘内部拖动，选关和帮助弹窗可独立滚动。
右上角“？”集中显示玩法、安装方法、离线状态与更新提示，不再占用游戏底部。
游戏区域阻止浏览器右键菜单，并禁用长按文字选择及 WebKit 长按菜单。

## PWA 与离线行为

- 安装清单使用 `display: fullscreen`、`orientation: any`。
- 支持全屏的普通浏览器打开时显示“全屏开始”，点一次进入全屏；也可选“直接玩”。
  网页不能绕过浏览器的用户点击要求自动进入全屏。主动退出后不会强制再次全屏。
- Chrome Android 安装后可以全屏启动；其他系统按其支持的显示模式运行。
- 没有浏览器安装提示时，右上角“？”中仍提供“添加到主屏幕 · 查看方法”。
  iPad 使用 Safari 分享菜单；安卓查看浏览器菜单，没有入口时可换用 Chrome。
  网页不能为不支持安装的浏览器增加系统安装能力。
- 不安装也可离线玩：打开 HTTPS 发布版本，在右上角“？”中确认显示“已准备好离线游玩”，
  再断网，并在同一浏览器打开原网址。开发服务器、局域网 HTTP 不提供离线准备。
- 清除网站数据、浏览器回收存储或无痕会话结束可能丢失缓存和进度；之后需要重新联网。
  如果需要完全不依赖浏览器缓存的安卓版本，可另行封装内置游戏资源的 APK。
- 首次联网打开生产版本并完成缓存后，可以离线进入游戏和生成新关卡。
- 缓存范围仅限当前应用的文件，不拦截其他网站或任意 API 请求。
- 有更新时后台下载完整新版本；不强制刷新正在玩的关卡。
  关闭该应用的所有标签页 / PWA 窗口，再打开即可启用新版本。
- 修改文件后必须重新 `npm run build`，不要只替换一个文件而保留旧的 `sw.js`。
- 若曾在相同本地端口测试生产版本，再切回开发模式，建议改用另一个端口，
  例如 `npm run dev -- --port 5174`，避免已有 SW 缓存影响开发。

## 发布到 GitHub Pages

1. 在你的 GitHub 账号下创建一个仓库，例如 `arrow-garden`。
2. 将**整个项目目录中的内容**提交到仓库根目录，默认分支设为 `main`。
   `.github/workflows/pages.yml` 也需要提交。
3. 在仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
4. 推送 `main`，或在 Actions 页面手动运行 `Deploy Arrow Garden to Pages`。
5. 工作流自动执行检查、构建并发布 `dist/`，部署网址以 Actions 输出为准。

示例命令（先在 GitHub 创建对应的空仓库）：

```bash
git init -b main
git add .
git commit -m "Import Arrow Garden game"
git remote add origin https://github.com/YOUR_USERNAME/arrow-garden.git
git push -u origin main
```

替换 `YOUR_USERNAME`，使用你自己的 GitHub 登录方式完成推送。
普通项目站点位于 `/仓库名/`；本项目的 manifest、资源路径和 SW scope
都使用相对路径，不需要为仓库名改配置。测试同样覆盖 `/arrow-garden/` 子路径。
若默认分支不是 `main`，同时修改工作流的 `on.push.branches`。

也可以把 `dist/` 的内容上传到其他 HTTPS 静态托管服务。
本项目不自带登录系统，最终谁能访问取决于所选托管服务。

GitHub 官方说明：
- [配置 Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [使用自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## 测试与进度

```bash
npm test
```

测试包括 2000 局棋盘的合法性与随机合法移除顺序验证，以及独立构建、
全屏启动与失败回退、安装说明、离线准备状态、HTTP 资源、根路径 / 子目录与模拟离线缓存测试。
这些自动化检查不替代 Android / iPad 真机安装与触屏测试。

进度、音效偏好使用浏览器 `localStorage`，键为 `arrow-unlocked`、
`arrow-level`、`arrow-progress-version`、`arrow-sound`。
刷新或重新构建不会主动清理它们；更换设备、浏览器或网站域名不会自动迁移。
源码包不包含任何手机 / 平板存档、Sites 登录信息、凭据或 Git 历史。
