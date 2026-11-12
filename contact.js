(function () {
    const K_TPL = 'carrom_wa_template';
    const K_SENT = 'carrom_wa_sent';

    const TEMPLATES = [
        { label: 'সাধারণ বার্তা', text: 'আসসালামু আলাইকুম {name}, উইন্টার কিংস ক্যারাম ব্যাটল-২০২৬ সম্পর্কে জানানো যাচ্ছে: ' },
        { label: 'নিবন্ধন নিশ্চিতকরণ', text: 'আসসালামু আলাইকুম {name}, উইন্টার কিংস ক্যারাম ব্যাটল-২০২৬-এ আপনার নিবন্ধন সফলভাবে সম্পন্ন হয়েছে। আপনার টিম: {team}।' },
        { label: 'ম্যাচ রিমাইন্ডার', text: 'আসসালামু আলাইকুম {name}, আপনার টিম {team}-এর ম্যাচ শিগগিরই শুরু হবে। অনুগ্রহ করে সময়মতো উপস্থিত থাকুন।' }
    ];

    const ls = {
        get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const admin = () => (typeof isAdmin !== 'undefined') && isAdmin === true;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const bn2en = s => String(s || '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

    // বাংলাদেশি নম্বর → আন্তর্জাতিক ফরম্যাট (8801XXXXXXXXX)
    function intl(raw) {
        let n = bn2en(raw).replace(/\D/g, '');
        if (n.startsWith('00')) n = n.slice(2);
        if (n.startsWith('880')) return n.length === 13 ? n : '';
        if (n.startsWith('0') && n.length === 11) return '880' + n.slice(1);
        if (n.length === 10 && n.startsWith('1')) return '880' + n;
        return '';
    }

    function sentSet() { try { return new Set(JSON.parse(ls.get(K_SENT) || '[]')); } catch (e) { return new Set(); } }
    function saveSent(set) { ls.set(K_SENT, JSON.stringify([...set])); }

    function teamOf(p) {
        try {
            const t = (globalTeamsData || []).find(x => x && x.data &&
                [String(x.data.player1Id), String(x.data.player2Id)].some(id => id === String(p.id) || id === String(p.db_id)));
            return t ? t.data.teamName : '';
        } catch (e) { return ''; }
    }
    function playersList() {
        try {
            const list = (globalPlayersData || []).filter(p => p && (p.name || p.phone));
            return typeof sortPlayers === 'function' ? sortPlayers(list) : list;
        } catch (e) { return []; }
    }

    let search = '';

    function buildMsg(p) {
        const tpl = (document.getElementById('ctTpl') || {}).value || TEMPLATES[0].text;
        return tpl.replace(/\{name\}/g, p.name || '').replace(/\{team\}/g, teamOf(p) || 'নির্ধারিত হয়নি');
    }

    function render() {
        const box = document.getElementById('ctList');
        const count = document.getElementById('ctCount');
        if (!box) return;
        if (!admin()) { box.innerHTML = ''; return; }
        const sent = sentSet();
        let list = playersList();
        const total = list.length;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p => [p.name, p.phone, p.address, p.cat].some(f => String(f || '').toLowerCase().includes(q)));
        }
        if (count) count.textContent = 'মোট ' + total + ' জন' + (search ? ' • দেখানো ' + list.length : '') + ' • পাঠানো ✓ ' + [...sent].filter(ph => list.some(p => intl(p.phone) === ph)).length;
        if (!list.length) { box.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">কোনো খেলোয়াড় পাওয়া যায়নি।</p>'; return; }

        const catCls = { HIGH: 'bg-red-500/20 text-red-400 border-red-500/30', MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', LOW: 'bg-green-500/20 text-green-400 border-green-500/30' };
        box.innerHTML = list.map(p => {
            const ph = intl(p.phone);
            const team = teamOf(p);
            const done = ph && sent.has(ph);
            const cat = String(p.cat || 'HIGH').toUpperCase();
            const btns = ph
                ? `<a data-ph="${ph}" href="https://wa.me/${ph}?text=${encodeURIComponent(buildMsg(p))}" target="_blank" rel="noopener" class="ct-wa bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-2 rounded-xl text-xs">💬 হোয়াটসঅ্যাপ</a>
                   <a href="tel:+${ph}" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-xl text-xs">📞 কল</a>`
                : `<span class="text-[11px] text-red-400 font-bold">⚠️ নম্বর সঠিক নয়</span>`;
            return `
            <div class="bg-slate-950 p-3 rounded-2xl border ${done ? 'border-green-500/50' : 'border-slate-800'} flex items-center justify-between gap-3 flex-wrap">
                <div class="min-w-0 space-y-0.5">
                    <p class="text-sm font-extrabold text-white truncate">${done ? '✅ ' : '👤 '}${esc(p.name || 'নামহীন')}
                        <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] border font-bold ${catCls[cat] || catCls.HIGH}">${esc(cat)}</span></p>
                    <p class="text-[11px] text-gray-400">📱 ${esc(p.phone || 'N/A')}${team ? ' • 🛡️ ' + esc(team) : ''}</p>
                </div>
                <div class="flex gap-2 flex-wrap">${btns}</div>
            </div>`;
        }).join('');
    }

    function inject() {
        const dash = document.getElementById('tabDashboard');
        if (!dash || document.getElementById('ctCard')) return;
        dash.insertAdjacentHTML('afterbegin', `
        <div id="ctCard" class="bg-slate-900 p-6 rounded-3xl border border-green-500/40 space-y-4 shadow-xl">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                <h3 class="text-base font-bold text-green-400">📞 যোগাযোগ কেন্দ্র (হোয়াটসঅ্যাপ ও কল)</h3>
                <span id="ctCount" class="text-[11px] bg-slate-800 text-yellow-300 px-3 py-1 rounded-full border border-slate-700 font-bold"></span>
            </div>
            <div class="space-y-2">
                <label class="text-xs text-yellow-400 font-bold block">মেসেজ টেমপ্লেট বেছে নিন</label>
                <select id="ctTplSel" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-yellow-300 font-bold">
                    ${TEMPLATES.map((t, i) => `<option value="${i}">${esc(t.label)}</option>`).join('')}
                    <option value="custom">✏️ নিজের মতো লিখব</option>
                </select>
                <textarea id="ctTpl" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white"></textarea>
                <p class="text-[11px] text-gray-400">{name} = খেলোয়াড়ের নাম, {team} = টিমের নাম। 💬 বাটনে চাপলে হোয়াটসঅ্যাপ খুলবে, মেসেজ লেখা থাকবে — আপনি শুধু Send চাপবেন।</p>
            </div>
            <input type="search" id="ctSearch" placeholder="🔍 নাম বা মোবাইল দিয়ে খুঁজুন..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white">
            <div id="ctList" class="space-y-2 max-h-[28rem] overflow-y-auto pr-1"></div>
            <div class="flex justify-between items-center gap-2 flex-wrap">
                <p class="text-[11px] text-gray-500">✅ = এই ডিভাইস থেকে হোয়াটসঅ্যাপ বাটনে চাপা হয়েছে।</p>
                <button type="button" id="ctReset" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-gray-300 px-3 py-1.5 rounded-lg border border-slate-700 font-bold">↺ ✅ চিহ্ন মুছুন</button>
            </div>
        </div>`);

        const tpl = document.getElementById('ctTpl');
        const sel = document.getElementById('ctTplSel');
        tpl.value = ls.get(K_TPL) || TEMPLATES[0].text;
        const match = TEMPLATES.findIndex(t => t.text === tpl.value);
        sel.value = match >= 0 ? String(match) : 'custom';

        sel.addEventListener('change', () => {
            if (sel.value !== 'custom') { tpl.value = TEMPLATES[Number(sel.value)].text; ls.set(K_TPL, tpl.value); render(); }
            else tpl.focus();
        });
        tpl.addEventListener('input', () => { sel.value = 'custom'; ls.set(K_TPL, tpl.value); render(); });
        document.getElementById('ctSearch').addEventListener('input', e => { search = e.target.value.trim(); render(); });
        document.getElementById('ctReset').addEventListener('click', () => {
            if (confirm('সব ✅ চিহ্ন মুছে ফেলতে চান?')) { saveSent(new Set()); render(); }
        });
        // হোয়াটসঅ্যাপ বাটনে চাপলে ✅ চিহ্ন
        document.getElementById('ctList').addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('.ct-wa');
            if (!a) return;
            const s = sentSet(); s.add(a.dataset.ph); saveSent(s);
            setTimeout(render, 400);
        });
    }

    // ডাটা বা এডমিন স্টেট বদলালে লিস্ট নতুন করে আঁকা
    let lastSig = '';
    function tick() {
        if (!document.getElementById('ctCard')) inject();
        const sig = (admin() ? '1' : '0') + '|' + playersList().map(p => [p.id, p.name, p.phone, p.cat, teamOf(p)].join(',')).join(';');
        if (sig !== lastSig) { lastSig = sig; render(); }
    }
    function start() { inject(); tick(); setInterval(tick, 1500); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
