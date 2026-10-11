/* School Management subscription panel. Manual payment verification only. */
(function () {
  'use strict';
  const URL = 'https://clivmkonzwyrnwluymkf.supabase.co';
  const KEY = 'sb_publishable_7yisPY9_ME1pDF-nxARKFw_u2VaIE-v';
  const OWNER = 'fced704d-d7ab-4970-96b2-0f6c5a76c903';
  const PAY_NUMBER = '01764972228';
  const api = window.supabase && window.supabase.createClient ? window.supabase.createClient(URL, KEY) : null;
  let user = null, isOwner = false, enabled = true, sub = null, busy = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = s => s ? new Date(s).toLocaleDateString('bn-BD') : '—';
  const active = () => !!(sub && sub.active_until && new Date(sub.active_until).getTime() > Date.now());
  function say(s, bad) { const e=$('bill-msg'); e.textContent=s; e.style.display='block'; e.style.background=bad?'#fee2e2':'#dcfce7'; e.style.color=bad?'#991b1b':'#166534'; }
  function setup() {
    if ($('bill-panel')) return;
    const css=document.createElement('style');
    css.textContent='#bill-panel{position:fixed;inset:0;z-index:99999;background:#f1f5f9;color:#172033;overflow:auto;padding:14px;font-family:Arial,sans-serif;box-sizing:border-box}#bill-panel .wrap{max-width:900px;margin:auto}#bill-panel .card{background:white;border:1px solid #dbe3ec;border-radius:12px;padding:16px;margin:12px 0}#bill-panel input,#bill-panel select{box-sizing:border-box;width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:7px;margin:5px 0 12px}#bill-panel button,#bill-open{border:0;border-radius:7px;padding:11px 14px;margin:4px;background:#0f766e;color:white;cursor:pointer}#bill-panel .red{background:#b42318}#bill-panel .msg{display:none;padding:12px;border-radius:8px}#bill-panel table{border-collapse:collapse;width:100%;min-width:560px}#bill-panel th,#bill-panel td{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:top}#bill-panel .scroll{overflow:auto}#bill-panel .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}';
    document.head.appendChild(css);
    const p=document.createElement('section'); p.id='bill-panel'; p.hidden=true;
    p.innerHTML='<div class="wrap"><h2>সাবস্ক্রিপশন ও পেমেন্ট</h2><button id="bill-close">সফটওয়্যারে ফিরুন</button><div id="bill-msg" class="msg" role="status"></div><section class="card"><h3>সাবস্ক্রিপশনের অবস্থা</h3><p id="bill-status">যাচাই হচ্ছে...</p></section><section class="card" id="bill-buy"><h3>প্যাকেজ কিনুন</h3><p>মাসিক ৫০০ টাকা | বার্ষিক ২,৫০০ টাকা</p><p><b>বিকাশ / নগদ / রকেট নম্বর: '+PAY_NUMBER+'</b></p><p>টাকা পাঠানোর আগে নম্বর ও অ্যাকাউন্টে টাকা গ্রহণের সুবিধা নিশ্চিত করুন।</p><div class="row"><label>প্যাকেজ<select id="bill-plan"><option value="monthly">মাসিক — ৫০০ টাকা</option><option value="yearly">বার্ষিক — ২,৫০০ টাকা</option></select></label><label>পেমেন্ট মাধ্যম<select id="bill-method"><option value="bkash">বিকাশ</option><option value="nagad">নগদ</option><option value="rocket">রকেট</option></select></label></div><label>Transaction ID<input id="bill-tx" maxlength="120" autocomplete="off" placeholder="Transaction ID লিখুন"></label><button id="bill-submit">পেমেন্ট আবেদন জমা দিন</button></section><section class="card"><h3>আমার আবেদন</h3><div id="bill-mine">লোড হচ্ছে...</div></section><section class="card" id="bill-owner" hidden><h3>মালিকের নিয়ন্ত্রণ</h3><p id="bill-global">অবস্থা যাচাই হচ্ছে...</p><button id="bill-toggle" class="red">সফটওয়্যার বন্ধ করুন</button><h3 style="margin-top:20px">পেমেন্ট অনুমোদন</h3><div id="bill-all">লোড হচ্ছে...</div></section><p>পেমেন্ট যাচাই ম্যানুয়াল। টাকা অ্যাকাউন্টে এসেছে নিশ্চিত হওয়ার পরেই অনুমোদন দিন। এখানে PIN/OTP দেবেন না।</p></div>';
    document.body.appendChild(p);
    const b=document.createElement('button'); b.id='bill-open'; b.textContent='সাবস্ক্রিপশন / পেমেন্ট'; b.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99990;box-shadow:0 2px 8px #0003'; document.body.appendChild(b);
    b.onclick=()=>refresh(true); $('bill-close').onclick=()=>{ if(isOwner||(enabled&&active())) p.hidden=true; else say('সফটওয়্যার ব্যবহারের জন্য চালু অবস্থা ও সক্রিয় সাবস্ক্রিপশন প্রয়োজন।',true); };
    $('bill-submit').onclick=submit; $('bill-toggle').onclick=toggle;
  }
  async function refresh(open) {
    setup();
    if (!api) { $('bill-status').textContent='Supabase লোড হয়নি। ইন্টারনেট চালু করে পেজ রিফ্রেশ করুন।'; $('bill-panel').hidden=false; return; }
    try {
      const ses=await api.auth.getSession(); user=ses.data && ses.data.session ? ses.data.session.user : null;
      if (!user) { $('bill-status').textContent='পেমেন্ট করতে আগে লগইন করুন।'; $('bill-panel').hidden=!open; return; }
      isOwner=user.id===OWNER; $('bill-buy').hidden=isOwner; $('bill-owner').hidden=!isOwner;
      const c=await api.from('software_control').select('is_enabled').eq('id',1).maybeSingle(); if(c.error) throw c.error; enabled=!c.data||c.data.is_enabled!==false;
      const s=await api.from('school_subscriptions').select('plan,active_until').eq('user_id',user.id).maybeSingle(); if(s.error) throw s.error; sub=s.data||null;
      $('bill-status').textContent=isOwner?'আপনি মালিক—সাবস্ক্রিপশন ছাড়াই প্রবেশাধিকার আছে।':!enabled?'মালিক সফটওয়্যার বন্ধ রেখেছেন।':active()?'সক্রিয়; মেয়াদ শেষ '+date(sub.active_until):'সাবস্ক্রিপশন সক্রিয় নয়। পেমেন্ট আবেদন জমা দিন।';
      $('bill-global').textContent=enabled?'সফটওয়্যার চালু আছে।':'সফটওয়্যার বন্ধ আছে।'; $('bill-toggle').textContent=enabled?'সফটওয়্যার বন্ধ করুন':'সফটওয়্যার চালু করুন'; $('bill-toggle').className=enabled?'red':'';
      await loadMine(); if(isOwner) await loadAll();
      if(open) $('bill-panel').hidden=false;
      if(!isOwner&&(!enabled||!active())) $('bill-panel').hidden=false;
      if(!isOwner&&enabled&&active()&&!open) $('bill-panel').hidden=true;
    } catch(e) { console.error('Subscription check failed',e); $('bill-status').textContent='যাচাই করা যায়নি: '+(e.message||'সমস্যা'); if(open||!isOwner) $('bill-panel').hidden=false; }
  }
  async function submit() {
    if(busy)return; if(!user){say('আগে লগইন করুন।',true);return;}
    const plan=$('bill-plan').value, method=$('bill-method').value, tx=$('bill-tx').value.trim();
    if(tx.length<4){say('সঠিক Transaction ID লিখুন।',true);return;}
    busy=true; $('bill-submit').disabled=true;
    try { const r=await api.from('subscription_payments').insert({user_id:user.id,plan,amount:plan==='yearly'?2500:500,method,transaction_id:tx,status:'pending'}); if(r.error)throw r.error; $('bill-tx').value=''; say('আবেদন জমা হয়েছে। মালিক টাকা যাচাই করে অনুমোদন দেবেন।'); await loadMine(); }
    catch(e){say('আবেদন জমা হয়নি: '+(e.code==='23505'?'এই Transaction ID আগে জমা হয়েছে.':e.message||'আবার চেষ্টা করুন'),true);} finally{busy=false;$('bill-submit').disabled=false;}
  }
  async function loadMine(){ const box=$('bill-mine'); const r=await api.from('subscription_payments').select('plan,amount,method,transaction_id,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20); if(r.error){box.textContent='লোড হয়নি: '+r.error.message;return;} if(!r.data.length){box.textContent='এখনও আবেদন নেই।';return;} box.innerHTML='<div class="scroll"><table><tr><th>তারিখ</th><th>প্যাকেজ</th><th>মাধ্যম</th><th>Transaction ID</th><th>অবস্থা</th></tr>'+r.data.map(p=>'<tr><td>'+esc(date(p.created_at))+'</td><td>'+ (p.plan==='yearly'?'বার্ষিক':'মাসিক')+' — '+esc(p.amount)+' টাকা</td><td>'+esc(p.method)+'</td><td>'+esc(p.transaction_id)+'</td><td>'+({pending:'অপেক্ষমাণ',approved:'অনুমোদিত',rejected:'বাতিল'}[p.status]||esc(p.status))+'</td></tr>').join('')+'</table></div>'; }
  async function loadAll(){ const box=$('bill-all'); const r=await api.from('subscription_payments').select('id,user_id,plan,amount,method,transaction_id,status,created_at').order('created_at',{ascending:false}).limit(100); if(r.error){box.textContent='লোড হয়নি: '+r.error.message;return;} if(!r.data.length){box.textContent='এখনও আবেদন নেই।';return;} box.innerHTML='<div class="scroll"><table><tr><th>তারিখ / User ID</th><th>প্যাকেজ</th><th>মাধ্যম / TxID</th><th>অবস্থা</th><th>কাজ</th></tr>'+r.data.map(p=>'<tr><td>'+esc(date(p.created_at))+'<br><small>'+esc(p.user_id)+'</small></td><td>'+(p.plan==='yearly'?'বার্ষিক':'মাসিক')+' — '+esc(p.amount)+'</td><td>'+esc(p.method)+'<br><b>'+esc(p.transaction_id)+'</b></td><td>'+esc(p.status)+'</td><td>'+(p.status==='pending'?'<button data-approve="'+esc(p.id)+'">অনুমোদন</button><button class="red" data-reject="'+esc(p.id)+'">বাতিল</button>':'—')+'</td></tr>').join('')+'</table></div>'; box.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>review(b.dataset.approve,true)); box.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>review(b.dataset.reject,false)); }
  async function review(id, approve){ if(!isOwner||busy)return; if(!confirm(approve?'পেমেন্ট অ্যাকাউন্টে টাকা এসেছে নিশ্চিত? অনুমোদন দেবেন?':'আবেদন বাতিল করবেন?'))return; busy=true; try{const q=await api.from('subscription_payments').select('id,user_id,plan,status').eq('id',id).single();if(q.error)throw q.error;const p=q.data;if(p.status!=='pending')throw Error('আবেদন ইতিমধ্যে পর্যালোচনা হয়েছে।');if(approve){const old=await api.from('school_subscriptions').select('active_until').eq('user_id',p.user_id).maybeSingle();if(old.error)throw old.error;const start=old.data&&new Date(old.data.active_until)>new Date()?new Date(old.data.active_until):new Date();start.setDate(start.getDate()+(p.plan==='yearly'?365:30));const w=await api.from('school_subscriptions').upsert({user_id:p.user_id,plan:p.plan,active_until:start.toISOString(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(w.error)throw w.error;}const u=await api.from('subscription_payments').update({status:approve?'approved':'rejected'}).eq('id',id);if(u.error)throw u.error;say(approve?'অনুমোদন হয়েছে এবং সাবস্ক্রিপশন চালু হয়েছে।':'আবেদন বাতিল হয়েছে।');await loadAll();}catch(e){say('কাজটি হয়নি: '+(e.message||'আবার চেষ্টা করুন'),true);}finally{busy=false;} }
  async function toggle(){if(!isOwner||busy)return;const next=!enabled;if(!confirm(next?'সফটওয়্যার আবার চালু করবেন?':'সব সাধারণ ব্যবহারকারীর জন্য সফটওয়্যার বন্ধ করবেন?'))return;busy=true;try{const r=await api.from('software_control').update({is_enabled:next,updated_at:new Date().toISOString()}).eq('id',1);if(r.error)throw r.error;enabled=next;$('bill-global').textContent=enabled?'সফটওয়্যার চালু আছে।':'সফটওয়্যার বন্ধ আছে।';$('bill-toggle').textContent=enabled?'সফটওয়্যার বন্ধ করুন':'সফটওয়্যার চালু করুন';$('bill-toggle').className=enabled?'red':'';say(enabled?'সফটওয়্যার চালু হয়েছে।':'সফটওয়্যার বন্ধ হয়েছে।');if(!enabled)$('bill-panel').hidden=false;}catch(e){say('পরিবর্তন হয়নি: '+(e.message||'আবার চেষ্টা করুন'),true);}finally{busy=false;}}
  setup();
  const shell=document.getElementById('appShell');
  if(shell)new MutationObserver(()=>{if(shell.style.display!=='none')refresh(false);}).observe(shell,{attributes:true,attributeFilter:['style']});
  window.addEventListener('online',()=>refresh(false));
  window.addEventListener('load',()=>refresh(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false);});
  setTimeout(()=>refresh(false),1500);
})();
