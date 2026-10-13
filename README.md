# 云·鸣潮 Windows 客户端

这是一个个人制作的非官方 Windows 桌面封装，会在独立应用窗口中打开《云·鸣潮》官方网页，登录状态保存在客户端自己的配置目录中。

## 功能

- 独立 Windows 窗口、桌面和开始菜单快捷方式
- 在客户端内完成官方登录，保留登录状态
- 游戏鼠标锁定及按住 Alt 显示指针
- F11 切换客户端原生全屏，Esc 留给游戏处理
- 使用 Chromium 浏览器标识，兼容官方登录 SDK

当前版本：1.0.4。主要面向 Windows x64；需要网络连接和官方云游戏账号。

## 运行

需要 Node.js 20.19 或更新版本。首次在项目目录运行：

```powershell
npm ci
npm start
```

## 生成 Windows 安装包

```powershell
npm run dist
```

安装程序会生成在 `windows-installer-1.0.4` 目录中，安装时可以创建桌面和开始菜单快捷方式。当前构建未签名，Windows 可能会提示发布者未知。

如果 Windows 打包时出现 Electron 解压目录重命名的 `EPERM` 错误，可以使用已经安装的 Electron 运行时：

```powershell
npm run dist -- --config.electronDist=node_modules/electron/dist
```

## 快捷键

- `F11`：进入 / 退出客户端原生全屏；`Esc` 交给游戏处理，不退出窗口全屏
- `Ctrl+R` / `F5`：刷新页面
- `Ctrl+Shift+R`：忽略缓存并刷新
- `Alt+←` / `Alt+→`：后退 / 前进
- `Ctrl+0`：恢复网页缩放

网页内容来自 `https://mc.kurogames.com/cloud/#/`。客户端需要联网使用；账号、云游戏时长及服务状态仍由官方站点管理。卸载时默认保留登录数据；如需清除，可在 Windows“设置 → 应用 → 已安装的应用”中卸载后手动删除 `%APPDATA%\YunMingchaoDesktop`。

## 项目结构

- `main.js`：窗口、权限、快捷键和诊断日志
- `package.json` / `package-lock.json`：依赖和安装包配置
- `assets/icon.png`：应用图标

仓库只包含客户端封装源码，不包含登录数据、日志、构建产物或官方网页的源代码。

## 许可证

本项目原创代码采用 [MIT License](LICENSE)。官方名称、商标、美术及依赖的许可见 [第三方内容说明](NOTICE.md)。本项目与库洛游戏没有隶属或授权关系。

## 网络诊断

每次启动会更新 `%APPDATA%\YunMingchaoDesktop\network-diagnostics.log`，仅记录失败请求的接口路径、HTTP 状态或网络错误码，不记录手机号、验证码、令牌、请求参数或响应内容。

## 更新到 1.0.3

关闭正在运行的客户端后，运行新版安装包覆盖安装。升级沿用原有应用标识、`YunMingchaoDesktop` 数据目录和 `persist:yun-mingchao-cloud` 会话，保留现有登录数据。

1.0.3 允许官方游戏页面使用鼠标锁定，由游戏网页控制隐藏指针、连续转动视角和按住 Alt 显示指针。

## 更新到 1.0.4

关闭客户端后覆盖安装，沿用现有登录数据目录和会话。F11 切换客户端原生窗口全屏，Esc 交给游戏处理。网页进入或退出 HTML 全屏时不再改变客户端窗口的全屏状态。
