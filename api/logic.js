const WEAK_CARDS = [
  { name: 'بطاقة خصم', description: 'تخفض سمعة لاعب مستهدف نقطة واحدة. خطرها منخفض.', rarity: 'ضعيفة', cost: 1, tier: 'WEAK', effectType: 'DAMAGE', targetRequired: true, value: 1, risk: 1 },
  { name: 'بطاقة تعزيز نفوذ', description: 'تمنحك نقطة سمعة إضافية، لكن أثرها الهادئ قد يثير الشك قليلًا.', rarity: 'ضعيفة', cost: 1, tier: 'WEAK', effectType: 'GAIN', targetRequired: false, value: 1, risk: 1 },
  { name: 'بطاقة رسالة سرية', description: 'أرسل رسالة سرية إلى لاعب آخر. قد تغيّر قراره، لكن المحادثات السرية تترك أثرًا بسيطًا في التحقيق.', rarity: 'ضعيفة', cost: 1, tier: 'WEAK', effectType: 'MESSAGE', targetRequired: true, risk: 1 },
  { name: 'بطاقة طلب تحالف', description: 'أرسل طلب تحالف. قبوله يمنح الطرفين منفعة، لكنه يربطكما بمسؤولية مشتركة.', rarity: 'ضعيفة', cost: 1, tier: 'WEAK', effectType: 'ALLIANCE_REQUEST', targetRequired: true, risk: 1 },
  { name: 'بطاقة درع', description: 'تحميك من أول تأثير سلبي في الجولة. الدفاع القوي يترك أثرًا صغيرًا في تقرير التحقيق.', rarity: 'ضعيفة', cost: 1, tier: 'WEAK', effectType: 'SHIELD', targetRequired: false, risk: 1 }
];

const STRONG_CARDS = [
  { name: 'بطاقة تشويه سمعة', description: 'تخفض سمعة لاعب مستهدف 4 نقاط. قوية جدًا، لكنها ترفع مستوى الشبهة عليك.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'DAMAGE', targetRequired: true, value: 4, risk: 4 },
  { name: 'بطاقة كشف الأوراق', description: 'تكشف يد لاعب مستهدف أمامك فقط. فائدتها معلوماتية، لكن أثرها يرفع الشبهة.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'REVEAL_CARDS', targetRequired: true, risk: 4, extraTurn: true },
  { name: 'بطاقة تبديل', description: 'استبدل هذه البطاقة ببطاقة عشوائية. يمكنك بعد ذلك لعب بطاقة أخرى أو إنهاء الدور.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'SWAP_CARD', targetRequired: false, risk: 4, extraTurn: true },
  { name: 'بطاقة قلب الضرر', description: 'فعّل درعًا يعكس أول ضربة سلبية تصلك إلى المهاجم. قوة دفاعية عالية مع خطر مرتفع.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'REFLECT', targetRequired: false, value: 4, risk: 4 },
  { name: 'بطاقة تسريب وكشف جرم', description: 'تجعل اللاعب المستهدف أكثر عرضة للاشتباه في تقرير الجولة. فائدتها كبيرة لكن آثارها تثير التساؤلات.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'ACCUSATION', targetRequired: true, value: 4, risk: 4 },
  { name: 'بطاقة تدمير تحالف', description: 'يفك تحالفًا قائمًا بالكامل. تأثير شديد على الطاولة مع خطر كبير على من يستخدمها.', rarity: 'قوية', cost: 4, tier: 'STRONG', effectType: 'BREAK_ALLIANCE', targetRequired: true, risk: 4 }
];

const CARD_TEMPLATES = [...WEAK_CARDS, ...STRONG_CARDS];

function randomId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneCard(template) { return { ...template, id: randomId('card') }; }
function drawRandomCard(tier) {
  const pool = tier === 'STRONG' ? STRONG_CARDS : WEAK_CARDS;
  return cloneCard(pool[Math.floor(Math.random() * pool.length)]);
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function normalizePlayers(players) {
  return Array.isArray(players) ? players.map(p => ({
    id: String(p.id), name: String(p.name || 'لاعب'), reputation: Math.max(0, Number(p.reputation) || 0),
    allyId: p.allyId || null, allyRoundsLeft: Math.max(0, Number(p.allyRoundsLeft) || 0),
    shield: Boolean(p.shield), reflect: Boolean(p.reflect), suspicion: Math.max(0, Number(p.suspicion) || 0),
    accusationBonus: Number(p.accusationBonus) || 0
  })) : [];
}
function findPlayer(players, id) { return players.find(p => p.id === id); }
function safeTarget(players, id, actorId) { const t = findPlayer(players, id); return !t || t.id === actorId ? null : t; }

function anonymizedInvestigationFacts(players, actions, round, allianceRequests, defamationCount) {
  const facts = [];
  const result = { round, playersAlive: players.filter(p => p.reputation > 0).length, publicSignals: [] };
  for (const a of actions || []) {
    const c = a.generatedCard || {};
    if (c.effectType === 'DAMAGE') facts.push('حدث انخفاض مفاجئ في سمعة أحد المشاركين.');
    if (c.effectType === 'GAIN') facts.push('أحد المشاركين تحسن وضعه بصورة غير متوقعة.');
    if (c.effectType === 'MESSAGE') facts.push('سُجل تواصل سري بين مشاركين.');
    if (c.effectType === 'REVEAL_CARDS') facts.push('حدثت محاولة للحصول على معلومات مخفية.');
    if (c.effectType === 'SWAP_CARD') facts.push('حدث تبديل غير معلن في الموارد.');
    if (c.effectType === 'SHIELD' || c.effectType === 'REFLECT') facts.push('ظهر أثر دفاعي غير معتاد.');
    if (c.effectType === 'ACCUSATION') facts.push('زادت الشبهة المحيطة بأحد المشاركين.');
    if (c.effectType === 'BREAK_ALLIANCE') facts.push('انهار رابط بين مشاركين.');
    if (c.effectType === 'ALLIANCE_REQUEST') facts.push('ظهر طلب تعاون بين مشاركين.');
  }
  if ((allianceRequests || []).length) facts.push('كانت هناك تحركات دبلوماسية هذا الدور.');
  if (defamationCount > 0) facts.push('وقعت حملة تشويه أثرت في صورة بعض المشاركين.');
  result.publicSignals = [...new Set(facts)].slice(0, 8);
  return result;
}


function chooseRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function applyPublicRoundEvent(players, round, voteContext = {}) {
  const ps = normalizePlayers(players).filter(p => p.reputation > 0);
  if (ps.length < 2) {
    return { players: normalizePlayers(players), roundEvent: { title: 'هدوء استثنائي', description: 'لم يتبق عدد كافٍ من المشاركين لإقامة حدث جماعي.', type: 'NEUTRAL', changes: [] } };
  }

  const working = normalizePlayers(players);
  const alive = working.filter(p => p.reputation > 0);
  const pickOne = () => chooseRandom(alive);
  const pickTwo = () => {
    const a = pickOne();
    const others = alive.filter(p => p.id !== a.id);
    return [a, chooseRandom(others)];
  };
  const clamp = (p, delta) => {
    const before = p.reputation;
    p.reputation = Math.max(0, p.reputation + delta);
    return p.reputation - before;
  };

  // The event pool intentionally mixes positive, negative, and transfer/swap outcomes.
  const types = [
    'TRANSFER', 'POINT_SWAP', 'GROUP_PENALTY', 'GROUP_REWARD',
    'SINGLE_REWARD', 'SINGLE_PENALTY', 'RISK_REWARD', 'PUBLIC_BURDEN'
  ];
  const type = chooseRandom(types);
  const changes = [];
  let title = '';
  let description = '';

  if (type === 'TRANSFER') {
    const [from, to] = pickTwo();
    const amount = 1 + Math.floor(Math.random() * 3);
    const moved = Math.min(amount, from.reputation);
    from.reputation -= moved;
    to.reputation += moved;
    title = '💰 تحويل موارد مفاجئ';
    description = `وصلت موارد من ${from.name} إلى ${to.name} في نهاية الجولة.`;
    changes.push(`${from.name}: -${moved} سمعة`, `${to.name}: +${moved} سمعة`);
  } else if (type === 'POINT_SWAP') {
    const [a, b] = pickTwo();
    const aBefore = a.reputation, bBefore = b.reputation;
    a.reputation = Math.max(0, bBefore);
    b.reputation = Math.max(0, aBefore);
    title = '🔄 قلب النقاط';
    description = `حدثت تسوية غير متوقعة قلبت نقاط ${a.name} و${b.name} بينهما.`;
    changes.push(`${a.name}: ${aBefore} → ${a.reputation}`, `${b.name}: ${bBefore} → ${b.reputation}`);
  } else if (type === 'GROUP_PENALTY') {
    const amount = round >= 3 ? 2 : 1;
    for (const p of alive) {
      const d = clamp(p, -amount);
      changes.push(`${p.name}: ${d}`);
    }
    title = '⚠️ عقوبة جماعية';
    description = 'صدر قرار جماعي أدى إلى اقتطاع جزء من موارد جميع المشاركين.';
  } else if (type === 'GROUP_REWARD') {
    const amount = round >= 3 ? 2 : 1;
    for (const p of alive) {
      clamp(p, amount);
      changes.push(`${p.name}: +${amount} سمعة`);
    }
    title = '🎁 مكافأة جماعية';
    description = 'انتهت الجولة بإعلان مكافأة وصلت إلى جميع المشاركين.';
  } else if (type === 'SINGLE_REWARD') {
    const target = pickOne();
    const amount = 3 + Math.floor(Math.random() * 2);
    clamp(target, amount);
    title = '⭐ مكافأة مفاجئة';
    description = `حصل ${target.name} وحده على مكافأة خاصة بعد انتهاء الجولة.`;
    changes.push(`${target.name}: +${amount} سمعة`);
  } else if (type === 'SINGLE_PENALTY') {
    const target = pickOne();
    const amount = Math.min(target.reputation, 2 + Math.floor(Math.random() * 2));
    clamp(target, -amount);
    title = '⛔ خصم مفاجئ';
    description = `فُرض خصم خاص على ${target.name} في ختام الجولة.`;
    changes.push(`${target.name}: -${amount} سمعة`);
  } else if (type === 'RISK_REWARD') {
    const scored = [...alive].sort((a,b) => (b.suspicion + (b.accusationBonus||0)) - (a.suspicion + (a.accusationBonus||0)));
    const target = scored[0] || pickOne();
    const bonus = 3;
    clamp(target, bonus);
    title = '🎭 مكافأة على الجرأة';
    description = `حصل ${target.name} على مكافأة بسبب أكثر سلوك أثار الانتباه خلال الجولة.`;
    changes.push(`${target.name}: +${bonus} سمعة`);
  } else if (type === 'PUBLIC_BURDEN') {
    const target = pickOne();
    const amount = 2;
    clamp(target, amount);
    const rest = alive.filter(p => p.id !== target.id);
    let shared = 0;
    for (const p of rest) shared += clamp(p, -1);
    title = '⚖️ عبء مقابل امتياز';
    description = `${target.name} حصل على امتياز، بينما تحمل بقية المشاركين كلفة صغيرة.`;
    changes.push(`${target.name}: +${amount} سمعة`, ...rest.map(p => `${p.name}: -1 سمعة`));
  }

  return {
    players: working,
    roundEvent: {
      id: randomId('event'),
      round,
      title,
      description,
      type,
      changes,
      voteContext: { majorityId: voteContext.majorityId || null, guiltyFound: Boolean(voteContext.guiltyFound) }
    }
  };
}

async function generateAiReport({ players, actions, round, allianceRequests, defamationCount, reputationChanges }) {
  const facts = anonymizedInvestigationFacts(players, actions, round, allianceRequests, defamationCount);
  const key = process.env.OPENROUTER_KEY;
  if (!key) return {
    title: `تقرير الجولة ${round}`,
    clue: 'تراكمت إشارات متناقضة هذه الجولة. هناك تحركات خفية أثرت في السمعة والعلاقات، لكن التقرير لا يكشف أي فعل سري أو هوية الجاني مباشرة.',
    tension: Math.min(5, 1 + facts.publicSignals.length),
    note: 'ضع OPENROUTER_KEY في Vercel لإنتاج تقرير متجدد بالذكاء الاصطناعي.'
  };

  const prompt = [
    'اكتب تقرير تحقيق قصير للعبة اجتماعية سرية باللغة العربية.',
    'مهم جدًا: لا تكشف أي فعل سري حرفيًا، ولا تقل إن لاعبًا بعينه فعل بطاقة معينة، ولا تكشف هوية الجاني.',
    'استعمل الإشارات العامة التالية فقط لتكوين تقرير يتكيف مع الجولة:',
    JSON.stringify(facts),
    'تغيّرات السمعة المجمعة:', JSON.stringify(reputationChanges),
    'اجعل التقرير من 2 إلى 4 جمل، مع عنوان قصير، ويجب أن يترك مساحة حقيقية للاستنتاج والتضليل.',
    'أعد JSON فقط بالشكل: {"title":"...","clue":"...","tension":1-5}'
  ].join('\n');

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-Title': 'المحكمة السرية' },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'openrouter/auto', temperature: 0.9, messages: [
        { role: 'system', content: 'أنت محقق روائي في لعبة اجتماعية. لا تكشف الأفعال السرية أو الجاني.' },
        { role: 'user', content: prompt }
      ] })
    });
    if (!response.ok) throw new Error(`OpenRouter ${response.status}`);
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return { title: String(parsed.title || `تقرير الجولة ${round}`), clue: String(parsed.clue || 'توجد مؤشرات متناقضة في القضية.'), tension: Math.max(1, Math.min(5, Number(parsed.tension) || 3)) };
  } catch {
    return {
      title: `تقرير الجولة ${round}`,
      clue: `اجتمعت ${facts.publicSignals.length} إشارات عامة مختلفة هذه الجولة. توجد تناقضات في السلوك والسمعة، لكن الحقيقة الكاملة ما زالت مخفية.`,
      tension: Math.min(5, 1 + facts.publicSignals.length)
    };
  }
}

function applyRoundActions(players, hands, pendingMessages, pendingAllianceRequests, actions) {
  const working = normalizePlayers(players);
  const handMap = { ...(hands || {}) };
  const messages = { ...(pendingMessages || {}) };
  const alliances = Array.isArray(pendingAllianceRequests) ? [...pendingAllianceRequests] : [];
  const reputationChanges = {};
  let defamationCount = 0;

  for (const player of working) {
    if (player.allyRoundsLeft > 0) player.allyRoundsLeft -= 1;
    if (player.allyRoundsLeft === 0) player.allyId = null;
    player.accusationBonus = 0;
  }

  const changeRep = (player, delta) => {
    if (!player) return;
    const before = player.reputation;
    player.reputation = Math.max(0, player.reputation + delta);
    reputationChanges[player.id] = (reputationChanges[player.id] || 0) + (player.reputation - before);
  };

  for (const action of Array.isArray(actions) ? actions : []) {
    const actor = findPlayer(working, action.playerId);
    if (!actor || actor.reputation <= 0) continue;
    const target = action.targetId ? safeTarget(working, action.targetId, actor.id) : null;
    const card = action.generatedCard || {};
    actor.suspicion += Number(card.risk) || 0;

    if (card.effectType === 'DAMAGE') {
      if (!target) continue;
      if (target.shield) { target.shield = false; continue; }
      if (target.reflect) { target.reflect = false; changeRep(actor, -(Number(card.value) || 1)); continue; }
      changeRep(target, -(Number(card.value) || 1));
      if (card.name === 'بطاقة تشويه سمعة') defamationCount += 1;
      if (actor.allyId === target.id) { changeRep(actor, -1); actor.suspicion += 1; }
    } else if (card.effectType === 'GAIN') {
      changeRep(actor, Number(card.value) || 1);
    } else if (card.effectType === 'MESSAGE') {
      if (!target) continue;
      messages[target.id] ||= [];
      messages[target.id].push({ id: randomId('msg'), type: 'MESSAGE', fromId: actor.id, fromName: actor.name, text: String(action.text || 'رسالة سرية بلا نص') });
    } else if (card.effectType === 'SHIELD') actor.shield = true;
    else if (card.effectType === 'REFLECT') actor.reflect = true;
    else if (card.effectType === 'ALLIANCE_REQUEST') {
      if (!target) continue;
      if (!alliances.some(r => r.fromId === actor.id && r.toId === target.id && r.status === 'PENDING')) {
        alliances.push({ id: randomId('allyreq'), fromId: actor.id, fromName: actor.name, toId: target.id, toName: target.name, status: 'PENDING' });
        messages[target.id] ||= [];
        messages[target.id].push({ id: randomId('msg'), type: 'ALLIANCE_REQUEST', requestId: alliances[alliances.length - 1].id, fromId: actor.id, fromName: actor.name, text: `${actor.name} أرسل لك طلب تحالف.` });
      }
    } else if (card.effectType === 'BREAK_ALLIANCE') {
      if (!target) continue;
      const partner = target.allyId ? findPlayer(working, target.allyId) : null;
      target.allyId = null; target.allyRoundsLeft = 0;
      if (partner) { partner.allyId = null; partner.allyRoundsLeft = 0; }
    } else if (card.effectType === 'ACCUSATION') {
      if (!target) continue;
      target.accusationBonus += Number(card.value) || 1;
      target.suspicion += 1;
    }
  }

  return { players: working, hands: handMap, pendingMessages: messages, pendingAllianceRequests: alliances, reputationChanges, defamationCount };
}

export async function handleGameRequest(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: true, message: 'الطلب يجب أن يكون POST.' });
  let body = req.body;
  if (body == null) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    try { body = raw ? JSON.parse(raw) : {}; } catch { return json(res, 400, { error: true, message: 'JSON غير صالح.' }); }
  }
  const action = body?.action;

  if (action === 'buy_card') {
    const players = normalizePlayers(body.players); const player = findPlayer(players, body.playerId);
    const cost = Number(body.cost); const tier = cost === 4 ? 'STRONG' : cost === 1 ? 'WEAK' : null;
    if (!player || !tier) return json(res, 400, { error: true, message: 'فئة شراء غير صالحة.' });
    if (player.reputation < cost) return json(res, 400, { error: true, message: 'رصيد السمعة غير كافٍ.' });
    player.reputation -= cost;
    return json(res, 200, { players, boughtCard: drawRandomCard(tier) });
  }

  if (action === 'instant_reveal_cards') {
    const hands = body.hands || {};
    return json(res, 200, { targetCards: Array.isArray(hands[body.targetId]) ? hands[body.targetId].map(c => ({ name: c.name, rarity: c.rarity })) : [] });
  }

  if (action === 'instant_swap_card') {
    const hands = { ...(body.hands || {}) }; const hand = Array.isArray(hands[body.playerId]) ? [...hands[body.playerId]] : [];
    const index = hand.findIndex(c => c.id === body.cardId);
    if (index < 0) return json(res, 400, { error: true, message: 'البطاقة غير موجودة في اليد.' });
    hand.splice(index, 1); hand.push(drawRandomCard('STRONG')); hands[body.playerId] = hand;
    return json(res, 200, { hands });
  }

  if (action === 'resolve_round') {
    const result = applyRoundActions(body.players, body.hands, body.pendingMessages, body.pendingAllianceRequests, body.actions);
    const culpritCandidates = result.players.filter(p => p.reputation > 0);
    const weighted = culpritCandidates.reduce((sum, p) => sum + 1 + p.suspicion + p.accusationBonus, 0);
    let roll = Math.random() * Math.max(1, weighted); let culprit = culpritCandidates[0] || null;
    for (const p of culpritCandidates) { roll -= 1 + p.suspicion + p.accusationBonus; if (roll <= 0) { culprit = p; break; } }
    const aiReport = await generateAiReport({ players: result.players, actions: body.actions || [], round: Number(body.round) || 1, allianceRequests: result.pendingAllianceRequests, defamationCount: result.defamationCount, reputationChanges: result.reputationChanges });
    return json(res, 200, { ...result, courtCase: { id: randomId('case'), trueCulpritId: culprit?.id || null, ...aiReport } });
  }

  if (action === 'respond_alliance') {
    const players = normalizePlayers(body.players); const requests = Array.isArray(body.pendingAllianceRequests) ? [...body.pendingAllianceRequests] : [];
    const reqItem = requests.find(r => r.id === body.requestId && r.status === 'PENDING');
    if (!reqItem) return json(res, 404, { error: true, message: 'طلب التحالف غير موجود.' });
    const from = findPlayer(players, reqItem.fromId); const to = findPlayer(players, reqItem.toId);
    reqItem.status = body.accept ? 'ACCEPTED' : 'DECLINED';
    if (body.accept && from && to) {
      from.allyId = to.id; to.allyId = from.id; from.allyRoundsLeft = 2; to.allyRoundsLeft = 2;
      from.reputation += 2; to.reputation += 2; from.suspicion += 1; to.suspicion += 1;
    } else if (!body.accept && from && to) {
      from.reputation = Math.max(0, from.reputation - 1); to.reputation += 1;
    }
    return json(res, 200, { players, pendingAllianceRequests: requests });
  }

  if (action === 'resolve_vote') {
    const players = normalizePlayers(body.players); const votes = Array.isArray(body.votes) ? body.votes : [];
    const counts = {}; for (const v of votes) if (v?.voterId && v.accusedId && v.accusedId !== 'NONE') counts[v.accusedId] = (counts[v.accusedId] || 0) + 1;
    const highest = Object.entries(counts).sort((a,b) => b[1]-a[1]);
    const winner = highest[0]; const totalVoters = votes.filter(v => v?.voterId).length;
    const majority = winner && winner[1] > totalVoters / 2 ? winner[0] : null;
    const culprit = body.trueCulpritId;
    let verdictMsg = '';
    let guiltyFound = false;
    if (majority && majority === culprit) {
      const target = findPlayer(players, majority); if (target) target.reputation = Math.max(0, target.reputation - 4);
      guiltyFound = true;
      verdictMsg = `أصابت الأغلبية الجاني. ${target?.name || 'المتهم'} تلقى العقوبة.`;
    } else {
      const wrongVoters = votes.filter(v => v?.voterId).map(v => findPlayer(players, v.voterId)).filter(Boolean);
      for (const voter of wrongVoters) voter.reputation = Math.max(0, voter.reputation - 2);
      verdictMsg = 'أفلت الجاني من أغلبية حاسمة. عوقب المشاركون الذين أخطؤوا في التصويت.';
    }
    const eventResult = applyPublicRoundEvent(players, Number(body.round) || 1, { majorityId: majority, guiltyFound });
    return json(res, 200, { ...eventResult, verdictMsg, voteCounts: counts, majorityId: majority });
  }

  return json(res, 400, { error: true, message: `إجراء غير معروف: ${action || 'بدون action'}` });
}
