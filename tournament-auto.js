(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const NEED = ['getMatchInfo', 'editMatchScore', 'saveMatchScoreData', 'renderData', 'getGroups',
        'computeStandings', 'isCompletedMatch', 'getWinnerSide', 'defaultTitleFor', 'dbUpsert', 'loadData', 'toast'];
    if (NEED.some(n => typeof window[n] !== 'function')) { console.warn('tournament-auto: প্রয়োজনীয় ফাংশন পাওয়া যায়নি'); return; }

    const RESULT_UNPLAYED = 'ম্যাচ এখনও শুরু হয় নাই।';
    const ORD = ['১ম', '২য়'];

    // নকআউট কাঠামো: কে কোথা থেকে আসবে (GROUPS ক্রম: এ=0, বি=1, সি=2, ডি=3)
    const KO = {
        'QF-1': [{ t: 'grp', gi: 0, pos: 0 }, { t: 'grp', gi: 1, pos: 1 }],   // এ ১ম  vs বি ২য়
        'QF-2': [{ t: 'grp', gi: 2, pos: 0 }, { t: 'grp', gi: 3, pos: 1 }],   // সি ১ম vs ডি ২য়
        'QF-3': [{ t: 'grp', gi: 1, pos: 0 }, { t: 'grp', gi: 0, pos: 1 }],   // বি ১ম vs এ ২য়
        'QF-4': [{ t: 'grp', gi: 3, pos: 0 }, { t: 'grp', gi: 2, pos: 1 }],   // ডি ১ম vs সি ২য়
        'SF-1': [{ t: 'win', c: 'QF-1' }, { t: 'win', c: 'QF-2' }],
        'SF-2': [{ t: 'win', c: 'QF-3' }, { t: 'win', c: 'QF-4' }],
        '3P-Match': [{ t: 'lose', c: 'SF-1' }, { t: 'lose', c: 'SF-2' }],
        'FINAL': [{ t: 'win', c: 'SF-1' }, { t: 'win', c: 'SF-2' }]
    };

    const codeGroup = code => GROUPS.find(g => g.matches.includes(code)) || null;
    const pairKey = (a, b) => [safeLower(a), safeLower(b)].sort().join('|');

    // ================= গ্রুপ র‍্যাংকিং =================
    // গ্রুপের ৩টি ম্যাচই শেষ (বিজয়ী সহ) হলে র‍্যাংকিং দেয়, নাহলে null
    function groupRanking(gi) {
        const g = GROUPS[gi];
        const teams = getGroups()[g.name] || [];
        if (teams.length !== 3) return null;
        const names = teams.map(t => safeLower(t.teamName));
        for (const code of g.matches) {
            const m = globalMatchesData[code];
            if (!m || !isCompletedMatch(m) || !getWinnerSide(m)) return null;
            if (!names.includes(safeLower(m.p1Name)) || !names.includes(safeLower(m.p2Name))) return null;
        }
        const rows = computeStandings(teams, g.matches); // জয় → পয়েন্ট ব্যবধান → মোট পয়েন্ট
        const key = r => r.w + '|' + (r.pf - r.pa) + '|' + r.pf;
        return rows.map(r => {
            const blk = rows.filter(x => key(x) === key(r));
            return { name: r.name, tie: blk.length > 1 ? blk.map(x => x.name) : null };
        });
    }

    // একটি স্লটের (ম্যাচের এক পাশের) টিম নির্ধারণ
    function resolve(spec, code, idx) {
        if (spec.t === 'grp') {
            const g = GROUPS[spec.gi];
            const label = g.name + ' ' + ORD[spec.pos] + ' স্থান';
            const rk = groupRanking(spec.gi);
            if (!rk) return { pending: true, label: label };
            const r = rk[spec.pos];
            if (!r.tie) return { name: r.name, label: label };
            // সম্পূর্ণ টাই: এডমিন আগে যে টিম সেভ করেছে (টাই-গ্রুপের ভেতরে) সেটিই ধরা হয়
            const st = globalMatchesData[code];
            const sn = st ? safeStr(idx === 0 ? st.p1Name : st.p2Name).trim() : '';
            if (sn && r.tie.some(n => safeLower(n) === safeLower(sn))) return { name: sn, label: label };
            return { tie: r.tie, label: label + ' (টাই-ব্রেক বাকি)' };
        }
        const m = globalMatchesData[spec.c];
        const lab = defaultTitleFor(spec.c) + (spec.t === 'win' ? '-এর বিজয়ী' : '-এর পরাজিত');
        if (m && isCompletedMatch(m)) {
            const s = getWinnerSide(m);
            if (s) {
                const w = s === 1 ? m.p1Name : m.p2Name, l = s === 1 ? m.p2Name : m.p1Name;
                return { name: safeStr(spec.t === 'win' ? w : l).trim(), label: lab };
            }
        }
        return { pending: true, label: lab };
    }

    function participants(code) {
        return KO[code].map((s, i) => resolve(s, code, i));
    }

    // ================= getMatchInfo: নকআউটে অটো টিম =================
    const _gmi = window.getMatchInfo;
    window.getMatchInfo = function (code, def) {
        const base = _gmi(code, def);
        if (!KO[code]) return base;
        const stored = globalMatchesData[code];
        if (stored && isCompletedMatch(stored)) return base; // সমাপ্ত ম্যাচের ইতিহাস অপরিবর্তিত
        const r = participants(code);
        return Object.assign({}, base, { p1Name: r[0].name || r[0].label, p2Name: r[1].name || r[1].label });
    };

    // ================= যাচাই =================
    function validateGroupMatch(code, p1, p2) {
        const g = codeGroup(code);
        if (!g) return '';
        const a = safeLower(p1), b = safeLower(p2);
        if (!a || !b) return '⛔ দুটি টিমই সিলেক্ট করুন!';
        if (a === b) return '⛔ একই টিম নিজের বিরুদ্ধে খেলতে পারে না!';
        const teams = (getGroups()[g.name] || []).map(t => safeLower(t.teamName));
        if (!teams.includes(a) || !teams.includes(b)) return '⛔ ' + g.name + '-এর ম্যাচে শুধু ' + g.name + '-এর নিবন্ধিত টিম দেওয়া যাবে। অন্য গ্রুপের টিম নেওয়া হবে না।';
        let ca = 0, cb = 0;
        for (const c of g.matches) {
            if (c === code) continue;
            const m = globalMatchesData[c];
            if (!m) continue;
            const x = safeLower(m.p1Name), y = safeLower(m.p2Name);
            if ((x === a && y === b) || (x === b && y === a)) return '⛔ এই দুই টিমের ম্যাচ (' + c + ') আগেই নির্ধারিত আছে। গ্রুপে প্রতি জোড়া টিম একবারই খেলবে।';
            if (x === a || y === a) ca++;
            if (x === b || y === b) cb++;
        }
        if (ca >= 2) return '⛔ "' + p1 + '" টিম ইতিমধ্যে ২টি ম্যাচে আছে। গ্রুপ পর্বে একটি টিম সর্বোচ্চ ২টি ম্যাচ খেলবে।';
        if (cb >= 2) return '⛔ "' + p2 + '" টিম ইতিমধ্যে ২টি ম্যাচে আছে। গ্রুপ পর্বে একটি টিম সর্বোচ্চ ২টি ম্যাচ খেলবে।';
        return '';
    }

    function validateKnockout(code, p1, p2) {
        const stored = globalMatchesData[code];
        const exp = (stored && isCompletedMatch(stored))
            ? [{ name: safeStr(stored.p1Name).trim() }, { name: safeStr(stored.p2Name).trim() }]
            : participants(code);
        const given = [p1, p2];
        for (let i = 0; i < 2; i++) {
            const e = exp[i], gn = safeLower(given[i]);
            if (e.name) {
                if (safeLower(e.name) !== gn) return '⛔ এই ম্যাচের ' + (i === 0 ? '১ম' : '২য়') + ' টিম অটো-নির্ধারিত: "' + e.name + '"। অন্য টিম দেওয়া যাবে না।';
            } else if (e.tie) {
                if (!e.tie.some(n => safeLower(n) === gn)) return '⛔ ' + e.label + ': টাই হওয়া টিমগুলোর একটি বেছে নিন (' + e.tie.join(' / ') + ')';
            } else {
                return '⛔ এই ম্যাচের টিম এখনো নির্ধারিত হয়নি (' + e.label + ')। আগের ধাপ শেষ হলে অটো বসবে।';
            }
        }
        return '';
    }

    function validateMatch(code, p1, p2) {
        if (codeGroup(code)) return validateGroupMatch(code, p1, p2);
        if (KO[code]) return validateKnockout(code, p1, p2);
        return '';
    }

    // ম্যাচ সেভ ফর্ম: আগে নিয়ম যাচাই, ঠিক থাকলে পুরনো ফাংশন
    const _sms = window.saveMatchScoreData;
    window.saveMatchScoreData = function (e) {
        if (isAdmin) {
            const code = safeStr($('mCode').value).trim();
            const p1 = safeStr($('mP1RegSelect').value || $('mP1Name').value).trim();
            const p2 = safeStr($('mP2RegSelect').value || $('mP2Name').value).trim();
            const err = validateMatch(code, p1, p2);
            if (err) { e.preventDefault(); toast(err, 'err'); return; }
        }
        return _sms.apply(this, arguments);
    };

    // আগামী ম্যাচ ফর্ম: গ্রুপ ম্যাচের কোড থাকলে গ্রুপ-নিয়ম যাচাই
    if (typeof window.saveUpcomingMatch === 'function') {
        const _su = window.saveUpcomingMatch;
        window.saveUpcomingMatch = function (e) {
            if (isAdmin) {
                const m = /\((G\d_M\d)\)/.exec(safeStr($('upTitle').value));
                if (m) {
                    const err = validateGroupMatch(m[1], safeStr($('upTeam1Select').value).trim(), safeStr($('upTeam2Select').value).trim());
                    if (err) { e.preventDefault(); toast(err, 'err'); return; }
                }
            }
            return _su.apply(this, arguments);
        };
    }

    // নকআউট ম্যাচ এডিট ফর্ম খুললে অটো-নির্ধারিত টিম বসিয়ে দেওয়া
    const _em = window.editMatchScore;
    window.editMatchScore = function (code) {
        _em.apply(this, arguments);
        if (!isAdmin || !KO[code]) return;
        const stored = globalMatchesData[code];
        if (stored && isCompletedMatch(stored)) return;
        const r = participants(code);
        const put = (selId, hidId, res) => {
            const sel = $(selId), hid = $(hidId);
            const nm = res.name || '';
            if (nm) setSelectValue(sel, nm); else sel.value = '';
            hid.value = nm;
        };
        put('mP1RegSelect', 'mP1Name', r[0]);
        put('mP2RegSelect', 'mP2Name', r[1]);
        if (!(r[0].name && r[1].name)) toast('ℹ️ এই ম্যাচের টিম এখনো নির্ধারিত হয়নি — আগের ধাপের ম্যাচ শেষ হলে অটো বসবে।', 'info');
    };

    // ================= ফিকশ্চার ট্যাব: গ্রুপভিত্তিক ড্রপডাউন সেটআপ =================
    async function writeFixture(code, p1, p2) {
        const ex = globalMatchesData[code] || null;
        const data = Object.assign(
            { id: code, matchCode: code, title: defaultTitleFor(code), date: '', p1Points: '0', p2Points: '0', result: RESULT_UNPLAYED },
            ex || {},
            { p1Name: p1, p2Name: p2, ts: (ex && ex.ts) || Date.now() }
        );
        await dbUpsert(code, 'MATCH_SCORES', data);
    }

    async function saveFixture(code, btn) {
        if (!isAdmin) return;
        let p1 = '', p2 = '';
        document.querySelectorAll('#fixturesContainer select[data-fx="' + code + '"]').forEach(s => {
            if (s.dataset.side === '1') p1 = s.value; else p2 = s.value;
        });
        const ex = globalMatchesData[code];
        if (ex && isCompletedMatch(ex)) { toast('🔒 সমাপ্ত ম্যাচের টিম বদলানো যাবে না।', 'err'); return; }
        const err = validateGroupMatch(code, p1, p2);
        if (err) { toast(err, 'err'); return; }
        await withBusy(btn, '⏳ সেভ হচ্ছে...', async () => {
            try {
                await writeFixture(code, p1, p2);
                toast('✅ ' + code + ' ফিকশ্চার সেভ হয়েছে');
                await loadData({ force: true });
            } catch (e) { console.error(e); toast('❌ সেভ হয়নি: ' + e.message, 'err'); }
        });
    }

    // ফাঁকা ম্যাচগুলোতে অটো জুটি বসানো (বিদ্যমান কিছু বদলায় না)
    async function autoFixtures(gi, btn) {
        if (!isAdmin) return;
        const g = GROUPS[gi];
        const teams = getGroups()[g.name] || [];
        if (teams.length !== 3) { toast('⛔ আগে ' + g.name + '-এ ৩টি টিম অ্যাসাইন করুন।', 'err'); return; }
        const names = teams.map(t => t.teamName);
        const nameSet = names.map(safeLower);
        const pairs = [[0, 1], [2, 1], [0, 2]].map(p => [names[p[0]], names[p[1]]]);
        const used = new Set(), empties = [];
        let attention = 0;
        g.matches.forEach(code => {
            const m = globalMatchesData[code];
            const x = m ? safeStr(m.p1Name).trim() : '', y = m ? safeStr(m.p2Name).trim() : '';
            if (!x && !y) { empties.push(code); return; }
            if (nameSet.includes(safeLower(x)) && nameSet.includes(safeLower(y))) used.add(pairKey(x, y));
            else attention++;
        });
        const remaining = pairs.filter(p => !used.has(pairKey(p[0], p[1])));
        if (!empties.length) { toast('ℹ️ ' + g.name + '-এর সব ম্যাচে আগেই টিম সেট করা আছে।', 'info'); return; }
        const n = Math.min(empties.length, remaining.length);
        if (!n) { toast('ℹ️ বসানোর মতো নতুন জুটি নেই।', 'info'); return; }
        const lines = empties.slice(0, n).map((c, i) => c + ': ' + remaining[i][0] + ' vs ' + remaining[i][1]).join('\n');
        if (!confirm(g.name + '-এর ফাঁকা ম্যাচগুলোতে এই জুটি বসানো হবে (বিদ্যমান ম্যাচ বদলাবে না):\n\n' + lines + '\n\nনিশ্চিত?')) return;
        await withBusy(btn, '⏳ হচ্ছে...', async () => {
            try {
                for (let i = 0; i < n; i++) {
                    const err = validateGroupMatch(empties[i], remaining[i][0], remaining[i][1]);
                    if (err) { toast(err, 'err'); continue; }
                    await writeFixture(empties[i], remaining[i][0], remaining[i][1]);
                }
                toast('✅ অটো ফিকশ্চার বসানো হয়েছে' + (attention ? ' (⚠️ ' + attention + 'টি ম্যাচের টিম গ্রুপের সাথে মিলছে না, সেগুলো ছোঁয়া হয়নি)' : ''));
                await loadData({ force: true });
            } catch (e) { console.error(e); toast('❌ অটো ফিকশ্চার ব্যর্থ: ' + e.message, 'err'); }
        });
    }

    function renderFixturePanels() {
        const container = $('fixturesContainer');
        if (!container || !isAdmin) return;
        const groups = getGroups();
        GROUPS.forEach((g, gi) => {
            const block = container.children[gi];
            if (!block || block.querySelector('.fx-panel')) return;
            const teams = groups[g.name] || [];
            let rows = '';
            g.matches.forEach((code, i) => {
                const m = globalMatchesData[code];
                const done = !!(m && isCompletedMatch(m));
                const s1 = m ? safeLower(m.p1Name) : '', s2 = m ? safeLower(m.p2Name) : '';
                const opts = sel => '<option value="">-- টিম সিলেক্ট --</option>' + teams.map(t =>
                    '<option value="' + escHtml(t.teamName) + '"' + (safeLower(t.teamName) === sel ? ' selected' : '') + '>🛡️ ' + escHtml(t.teamName) + '</option>').join('');
                const dis = done ? ' disabled' : '';
                const cls = 'w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-yellow-300 font-bold disabled:opacity-60';
                rows += '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">' +
                    '<p class="text-[11px] font-bold text-yellow-400">' + code + ' • ম্যাচ #' + bn(i + 1) + (done ? ' <span class="text-emerald-400">🔒 সমাপ্ত</span>' : '') + '</p>' +
                    '<div class="grid grid-cols-2 gap-2">' +
                    '<select data-fx="' + code + '" data-side="1" class="' + cls + '"' + dis + '>' + opts(s1) + '</select>' +
                    '<select data-fx="' + code + '" data-side="2" class="' + cls + '"' + dis + '>' + opts(s2) + '</select>' +
                    '</div>' +
                    (done ? '' : '<button type="button" data-fxsave="' + code + '" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition">💾 টিম সেভ করুন</button>') +
                    '</div>';
            });
            block.insertAdjacentHTML('beforeend',
                '<div class="fx-panel bg-slate-900/80 border border-purple-500/40 rounded-2xl p-4 space-y-3">' +
                '<div class="flex justify-between items-center gap-2 flex-wrap">' +
                '<span class="text-xs font-extrabold text-purple-300">⚙️ ফিকশ্চার সেটআপ (এডমিন) • ' + escHtml(g.name) + '</span>' +
                '<button type="button" data-fxauto="' + gi + '" class="bg-slate-800 hover:bg-slate-700 text-yellow-300 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-700">⚡ অটো ফিকশ্চার</button>' +
                '</div>' +
                '<p class="text-[11px] text-gray-400">ড্রপডাউনে শুধু এই গ্রুপের টিম আসে • প্রতি টিম সর্বোচ্চ ২টি ম্যাচ • নিজের বিরুদ্ধে নয় • প্রতি জোড়া একবারই।</p>' +
                rows + '</div>');
        });
    }

    const fx = $('fixturesContainer');
    if (fx) fx.addEventListener('click', e => {
        const s = e.target.closest && e.target.closest('[data-fxsave]');
        if (s) { saveFixture(s.dataset.fxsave, s); return; }
        const a = e.target.closest && e.target.closest('[data-fxauto]');
        if (a) autoFixtures(Number(a.dataset.fxauto), a);
    });

    // ================= নকআউট ট্যাবে ব্যাখ্যা =================
    function injectNote() {
        const tk = $('tabKnockout');
        if (!tk || $('koAutoNote')) return;
        const card = tk.firstElementChild, head = card && card.firstElementChild;
        if (!head) return;
        head.insertAdjacentHTML('afterend',
            '<div id="koAutoNote" class="bg-slate-950 border border-yellow-500/30 rounded-2xl p-4 text-[11px] text-gray-300 space-y-1">' +
            '<p class="font-extrabold text-yellow-400 text-xs">🤖 অটো-সেটআপ: টিম নিজে থেকে বসে যায়</p>' +
            '<p>• প্রতি গ্রুপের ৩টি ম্যাচ শেষ হলে শীর্ষ ২ টিম কোয়ার্টার ফাইনালে যায় (র‍্যাংকিং: বেশি জয় → পয়েন্ট ব্যবধান → মোট পয়েন্ট)।</p>' +
            '<p>• QF-1: গ্রুপ এ ১ম বনাম গ্রুপ বি ২য় • QF-2: গ্রুপ সি ১ম বনাম গ্রুপ ডি ২য় • QF-3: গ্রুপ বি ১ম বনাম গ্রুপ এ ২য় • QF-4: গ্রুপ ডি ১ম বনাম গ্রুপ সি ২য়</p>' +
            '<p>• SF-1: QF-1 বিজয়ী বনাম QF-2 বিজয়ী • SF-2: QF-3 বিজয়ী বনাম QF-4 বিজয়ী • ৩য় স্থান: দুই সেমিফাইনালের পরাজিত • ফাইনাল: দুই সেমিফাইনালের বিজয়ী</p>' +
            '</div>');
    }

    // ================= রেন্ডার হুক =================
    const _rd = window.renderData;
    window.renderData = function () {
        _rd.apply(this, arguments);
        try { injectNote(); renderFixturePanels(); } catch (e) { console.error(e); }
    };
    window.renderData();
})();
