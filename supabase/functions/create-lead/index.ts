import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const URGENCY_PRIORITY: Record<string, number> = {
  '紧急（需尽快处理）': 1,
  '较急（希望这几天看）': 2,
  '一般（可预约时间）': 3,
};

/** 同一手机号提交间隔（毫秒） */
const SUBMIT_COOLDOWN_MS = 60 * 1000;

const PROBLEM_TYPE_PRIORITY: Record<string, number> = {
  '卫生间/厨房漏水': 2,
  '屋面/顶层漏水': 2,
  '外墙/窗户渗雨': 2,
  '地下室/潮湿发霉': 2,
  '楼下投诉/邻里纠纷': 1,
  '不确定，需先看现场': 3,
};

function computePriority(urgency: string | undefined, problemType: string): number {
  if (urgency && URGENCY_PRIORITY[urgency]) {
    return URGENCY_PRIORITY[urgency];
  }
  return PROBLEM_TYPE_PRIORITY[problemType] ?? 3;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const { name, phone, location, problem_type, urgency, description, source } = body;

    if (
      !/^1[3-9]\d{9}$/.test(phone) ||
      !location?.trim() ||
      !problem_type?.trim() ||
      !description?.trim()
    ) {
      return json({ error: '请填写完整信息' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const cooldownAgo = new Date(Date.now() - SUBMIT_COOLDOWN_MS).toISOString();
    const { data: recent } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', cooldownAgo)
      .limit(1);

    if (recent?.length) {
      return json({ error: '提交过于频繁，请1分钟后再试（可补充说明后重新提交）' }, 429);
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: seqRow } = await supabase
      .from('lead_daily_seq')
      .select('seq')
      .eq('day', today)
      .maybeSingle();

    let seq = (seqRow?.seq ?? 0) + 1;
    await supabase.from('lead_daily_seq').upsert({ day: today, seq });

    const leadNo = `YX${today.replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
    const priority = computePriority(urgency, problem_type.trim());

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        lead_no: leadNo,
        name: (name || '').trim(),
        phone,
        location: location.trim(),
        problem_type: problem_type.trim(),
        urgency: urgency || '',
        priority,
        description: description.trim(),
        source: source || 'direct',
        status: '意向待联系',
      })
      .select()
      .single();

    if (error) throw error;

    await notifyServerChan(lead);

    return json({ lead_no: leadNo, id: lead.id });
  } catch (e) {
    console.error(e);
    return json({ error: e.message || '服务器错误' }, 500);
  }
});

async function notifyServerChan(lead: Record<string, unknown>) {
  const base = Deno.env.get('ADMIN_BASE_URL') || '';
  const link = base ? `${base}?lead_no=${lead.lead_no}` : '';
  const pri = lead.priority === 1 ? '🔴紧急' : lead.priority === 2 ? '🟡较急' : '⚪一般';
  const title = `【新意向单】${pri} ${lead.lead_no}`;
  const desp = [
    `姓名：${lead.name || '未留名'}`,
    `电话：${lead.phone}`,
    `位置：${lead.location}`,
    `问题：${lead.problem_type}`,
    lead.urgency ? `程度：${lead.urgency}` : '',
    `描述：${lead.description}`,
    link ? `\n👉 处理：${link}` : '',
  ].filter(Boolean).join('\n');

  const keys = [Deno.env.get('SERVER_CHAN_KEY_1'), Deno.env.get('SERVER_CHAN_KEY_2')].filter(Boolean);
  await Promise.all(
    keys.map((key) =>
      fetch(`https://sctapi.ftqq.com/${key}.send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp }),
      }).catch(console.error)
    ),
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
