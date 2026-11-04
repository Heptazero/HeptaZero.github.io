# Heptazero 提问箱后端极速部署指南 (Cloudflare Worker + D1)

这套后端用于承载博客的匿名提问投递、数据库持久化存储、手机实时推送以及博主管理回答。
完全运行在 Cloudflare 终身免费额度内，无需服务器，零维护。

---

## 步骤一：创建免费 D1 数据库（1 分钟）

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)（没有账号可用常用邮箱免费注册）。
2. 在左侧菜单栏点击 **“存储与数据库” (Storage & Databases)** -> **“D1 SQL 数据库” (D1)**。
3. 点击 **“创建” (Create)**，数据库名称填写 `blog-qa`，点击创建。
4. 进入刚创建的 `blog-qa` 数据库，点击上方标签页的 **“控制台” (Console)**。
5. 复制本项目 `cloudflare/schema.sql` 里的建表 SQL 语句，粘贴并点击 **“执行” (Execute)**：
   ```sql
   CREATE TABLE IF NOT EXISTS questions (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     content TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     answer TEXT DEFAULT NULL,
     answered_at DATETIME DEFAULT NULL,
     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );
   ```

---

## 步骤二：创建 Worker 云函数（1 分钟）

1. 在 Cloudflare 左侧菜单栏点击 **“计算 (Workers & Pages)”** -> 点击 **“创建” (Create)**。
2. 选择 **“Worker”**，名称填写 `blog-qa-worker`，点击 **“部署” (Deploy)**。
3. 部署完成后，点击右上角 **“编辑代码” (Edit code)**。
4. 把项目 `cloudflare/worker.js` 中的完整代码全部复制，替换掉网页编辑器里的默认代码，点击右上角 **“保存并部署” (Save and deploy)**。

---

## 步骤三：绑定数据库与设置管理密码（30 秒）

1. 回到 Worker 的详情页，点击 **“设置” (Settings)** -> **“变量与机密” (Variables and Secrets)**：
   - 添加一个名为 `ADMIN_PASSWORD` 的变量，值填入你自设的**博主管理密码**（比如 `Heptazero2026!`）。
   - *(可选)* 如果想在 iPhone 手机上即时收到弹窗推送，添加变量 `BARK_KEY`，填入你的 Bark Key。
   - *(可选)* 如果想在微信上收到推送，添加变量 `SERVERCHAN_KEY`，填入你的 Server酱 SendKey。
   - 点击保存。
2. 在同页面左侧点击 **“绑定” (Bindings)** -> 点击 **“添加” (Add)** -> 选择 **“D1 数据库” (D1 Database)**：
   - **变量名称 (Variable name)** 必须严格填写：`DB`
   - **D1 数据库** 选择步骤一中创建的：`blog-qa`
   - 点击保存并部署。

---

## 步骤四：连接博客前端

1. 在 Worker 详情页面上方，你会看到一个公开访问域名，例如：
   `https://blog-qa-worker.<你的用户名>.workers.dev`
2. 把这个地址发给我，或者直接在 `ask.html` 第 126 行将 `API_BASE` 替换为你自己的 Worker 域名即可！
