/**
 * Heptazero Blog Q&A Backend (Cloudflare Worker + D1)
 * 纯静态博客专属的匿名提问箱与精选问答边缘服务
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. CORS 跨域响应头设置
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 辅助函数：统一 JSON 响应
    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
      });
    };

    // 鉴权函数：验证管理员密钥
    const checkAuth = () => {
      const auth = request.headers.get('Authorization');
      if (!auth || !env.ADMIN_PASSWORD) return false;
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      return token === env.ADMIN_PASSWORD.trim();
    };

    try {
      // -----------------------------------------------------------------------
      // 路由 1: GET /api/questions (公开获取所有已回答的问答列表)
      // -----------------------------------------------------------------------
      if (request.method === 'GET' && path === '/api/questions') {
        const { results } = await env.DB.prepare(
          `SELECT id, content, answer, answered_at, created_at 
           FROM questions 
           WHERE status = 'answered' 
           ORDER BY answered_at DESC`
        ).all();

        return json({
          success: true,
          questions: results || [],
        });
      }

      // -----------------------------------------------------------------------
      // 路由 2: POST /api/ask (访客匿名提交新提问)
      // -----------------------------------------------------------------------
      if (request.method === 'POST' && path === '/api/ask') {
        const body = await request.json().catch(() => ({}));
        const content = (body.content || '').trim();

        if (!content) {
          return json({ success: false, error: '提问内容不能为空' }, 400);
        }
        if (content.length > 1000) {
          return json({ success: false, error: '提问字数超出 1000 字限制' }, 400);
        }

        // 写入 D1 数据库
        const result = await env.DB.prepare(
          `INSERT INTO questions (content, status, created_at) 
           VALUES (?, 'pending', CURRENT_TIMESTAMP)`
        ).bind(content).run();

        // 发送即时推送提醒（静默异步，不阻塞访客响应）
        sendNotification(env, content).catch(err => console.error('Notification error:', err));

        return json({
          success: true,
          message: '提问已匿名投递成功，待博主作答后将沉淀在问答墙中。',
        });
      }

      // -----------------------------------------------------------------------
      // 路由 3: GET /api/admin/pending (博主拉取所有待回复的提问)
      // -----------------------------------------------------------------------
      if (request.method === 'GET' && path === '/api/admin/pending') {
        if (!checkAuth()) {
          return json({ success: false, error: '未授权或管理密码错误' }, 401);
        }

        const { results } = await env.DB.prepare(
          `SELECT id, content, created_at 
           FROM questions 
           WHERE status = 'pending' 
           ORDER BY created_at DESC`
        ).all();

        return json({
          success: true,
          pending: results || [],
        });
      }

      // -----------------------------------------------------------------------
      // 路由 4: POST /api/admin/reply (博主回答并公开发布问题)
      // -----------------------------------------------------------------------
      if (request.method === 'POST' && path === '/api/admin/reply') {
        if (!checkAuth()) {
          return json({ success: false, error: '未授权或管理密码错误' }, 401);
        }

        const body = await request.json().catch(() => ({}));
        const id = body.id;
        const answer = (body.answer || '').trim();

        if (!id || !answer) {
          return json({ success: false, error: '请提供问题 ID 与回答内容' }, 400);
        }

        await env.DB.prepare(
          `UPDATE questions 
           SET answer = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP 
           WHERE id = ?`
        ).bind(answer, id).run();

        return json({ success: true, message: '回答已公开发布至问答墙' });
      }

      // -----------------------------------------------------------------------
      // 路由 5: POST /api/admin/delete (博主忽略或删除某条提问)
      // -----------------------------------------------------------------------
      if (request.method === 'POST' && path === '/api/admin/delete') {
        if (!checkAuth()) {
          return json({ success: false, error: '未授权或管理密码错误' }, 401);
        }

        const body = await request.json().catch(() => ({}));
        const id = body.id;

        if (!id) {
          return json({ success: false, error: '缺少问题 ID' }, 400);
        }

        await env.DB.prepare(`DELETE FROM questions WHERE id = ?`).bind(id).run();

        return json({ success: true, message: '该问题已删除' });
      }

      // 默认 404
      return json({ error: 'Endpoint not found' }, 404);

    } catch (err) {
      console.error('Worker error:', err);
      return json({ success: false, error: err.message || 'Server Internal Error' }, 500);
    }
  },
};

/**
 * 手机即时提醒派发器（支持 Bark iOS 推送、Server酱微信推送、Telegram 与邮件）
 */
async function sendNotification(env, questionContent) {
  const preview = questionContent.length > 80 ? questionContent.slice(0, 80) + '...' : questionContent;
  const title = '博客收到一条新的匿名提问';

  // 1. Bark (iOS 原生弹窗推送)
  if (env.BARK_KEY) {
    const barkUrl = `https://api.day.app/${encodeURIComponent(env.BARK_KEY)}/${encodeURIComponent(title)}/${encodeURIComponent(questionContent)}?group=HeptazeroBlog&icon=https://heptazero.github.io/favicon.ico`;
    await fetch(barkUrl);
  }

  // 2. Server酱 (微信服务号通知)
  if (env.SERVERCHAN_KEY) {
    const scUrl = `https://sctapi.ftqq.com/${encodeURIComponent(env.SERVERCHAN_KEY)}.send?title=${encodeURIComponent(title)}&desp=${encodeURIComponent(questionContent)}`;
    await fetch(scUrl);
  }

  // 3. Telegram 机器人
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    const tgUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📬 *${title}*\n\n${questionContent}`,
        parse_mode: 'Markdown',
      }),
    });
  }
}
