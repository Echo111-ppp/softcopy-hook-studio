在线使用：[https://echo111-ppp.github.io/softcopy-hook-studio/](https://echo111-ppp.github.io/softcopy-hook-studio/)

# 钩子工坊

软文钩子分析、发布前风险检查和写作历史工作台。前端是纯静态网页，可以部署到 GitHub Pages；登录与跨设备同步使用 Supabase。

## 现在能做什么

- 从竞品软文里识别场景、踩坑、反差、身份标签、数字和情绪等钩子。
- 检查医疗功效、未经证实的机制、拉踩、绝对化表达、缺少就医边界和篇幅问题。
- 按“人群 / 痛点 / 原做法 / 产品 / 真实依据”组合六个开头。
- 保存软文、日期、产品、状态、风险结果、复盘记录和历史版本。
- 按标题、产品或正文搜索，并按状态筛选。
- 本机 IndexedDB 存储、JSON 导出与导入。
- Supabase 邮箱登录和跨手机、电脑同步。
- 响应式移动端和 PWA 应用壳。

## 本地打开

不要直接双击 `index.html`，因为浏览器对模块和服务工作线程有限制。在项目目录运行：

```bash
python -m http.server 8080
```

然后打开 `http://localhost:8080`。

不配置 Supabase 时，工具会使用本机保存，所有核心功能都能使用。

## 配置手机与电脑同步

1. 在 [Supabase](https://supabase.com/) 创建项目。
2. 打开 SQL Editor，完整执行 `supabase-schema.sql`。
3. 在 Authentication 的 Providers 中启用 Email。
4. 复制 Project URL 和浏览器可用的 Publishable key（旧版界面叫 anon public key）。
5. 打开工具右下角的设置，填入这两项并保存。
6. 注册账号并完成邮箱验证，然后登录。

登录状态会自动保存在当前设备。正常情况下只在首次使用、主动退出、清除浏览器数据或登录过期时重新登录。

只把 **Publishable key / anon public key** 填进网页。不要填写 secret key 或 `service_role` 密钥，也不要把它提交到 GitHub。

## 部署到 GitHub Pages

这个项目不需要构建，直接把以下文件放进 GitHub 仓库根目录：

```text
index.html
styles.css
app.js
core.js
storage.js
manifest.webmanifest
sw.js
icon.svg
```

然后在仓库 Settings → Pages 中选择 `Deploy from a branch`，发布根目录。

## 数据边界

- 开源的是代码，不是 Supabase 里的私人数据。
- 数据表启用了 Row Level Security，每个账号只能读写自己的记录。
- 公开演示时不要填入公司未发布的产品资料、内部截稿要求或用户隐私。
- 建议每周导出一次 JSON 备份。浏览器清理缓存或更换域名时，本机 IndexedDB 数据不会自动迁移。

## 当前局限

钩子识别和风险检查是本地规则引擎，擅长抓明显问题，不理解全部上下文，也不能判断一条事实是否真实。数字、功效、医学表述和竞品信息仍需人工核对来源。

