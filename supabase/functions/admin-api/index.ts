import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
};

const SESSION_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const { action, token } = body;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (action === 'login') {
      return await handleLogin(supabase, body);
    }

    const user = await verifyToken(supabase, token);
    if (!user) return json({ error: '登录已过期，请重新登录' }, 401);

    switch (action) {
      case 'list':
        return await handleList(supabase);
      case 'detail':
        return await handleDetail(supabase, body.id);
      case 'updateStatus':
        return await handleUpdateStatus(supabase, user, body);
      case 'updateExtra':
        return await handleUpdateExtra(supabase, user, body);
      default:
        return json({ error: '未知操作' }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: e.message || '服务器错误' }, 500);
  }
});

async function handleLogin(supabase: ReturnType<typeof createClient>, body: { username?: string; password?: string }) {
  const { username, password } = body;
  if (!username || !password) return json({ error: '请输入用户名和密码' }, 400);

  const { data: user } = await supabase
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return json({ error: '用户名或密码错误' }, 401);
  }

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await supabase.from('admin_sessions').insert({ token, user_id: user.id, expires_at: expires });

  return json({
    token,
    user: { username: user.username, display_name: user.display_name },
  });
}

async function verifyToken(supabase: ReturnType<typeof createClient>, token?: string) {
  if (!token) return null;
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*, admin_users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!session) return null;
  return session.admin_users as { id: string; username: string; display_name: string };
}

async function handleList(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return json({ leads: data });
}

async function handleDetail(supabase: ReturnType<typeof createClient>, id: string) {
  if (!id) return json({ error: '缺少 id' }, 400);
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
  if (error) throw error;
  return json({ lead: data });
}

async function handleUpdateStatus(
  supabase: ReturnType<typeof createClient>,
  user: { display_name: string },
  body: { id?: string; status?: string },
) {
  const { id, status } = body;
  if (!id || !status) return json({ error: '参数不完整' }, 400);

  const allowed = [
    '意向待联系', '已联系', '已预约查勘', '已查勘', '方案已报价',
    '维修中', '待平台付款', '已完成', '已取消',
  ];
  if (!allowed.includes(status)) return json({ error: '无效状态' }, 400);

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single();
  if (!lead) return json({ error: '记录不存在' }, 404);

  if (status === '已完成') {
    if (lead.status !== '待平台付款') {
      return json({ error: '请先将状态改为「待平台付款」' }, 400);
    }
  }

  const patch: Record<string, unknown> = {
    status,
    last_operator: user.display_name,
  };

  if (status === '已完成') {
    patch.payment_status = 'paid';
    patch.paid_at = new Date().toISOString();
  }

  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
  return json({ ok: true });
}

async function handleUpdateExtra(
  supabase: ReturnType<typeof createClient>,
  user: { display_name: string },
  body: {
    id?: string;
    survey_note?: string;
    solution?: string;
    quote_amount?: string | number;
    final_amount?: string | number;
  },
) {
  const { id, survey_note, solution, quote_amount, final_amount } = body;
  if (!id) return json({ error: '缺少 id' }, 400);

  const patch: Record<string, unknown> = {
    last_operator: user.display_name,
  };
  if (survey_note !== undefined) patch.survey_note = survey_note;
  if (solution !== undefined) patch.solution = solution;
  if (quote_amount !== '' && quote_amount != null) patch.quote_amount = Number(quote_amount);
  if (final_amount !== '' && final_amount != null) patch.final_amount = Number(final_amount);

  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw error;
  return json({ ok: true });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
