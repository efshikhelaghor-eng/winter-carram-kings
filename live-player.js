(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof window.renderLiveStreamWidget !== 'function') return;
    const box = $('liveStreamWidgetContainer');
    if (!box) return;

    // ---------- স্টাইল ----------
    const st = document.createElement('style');
    st.textContent = `
.wck-stage{position:absolute;inset:0;container-type:inline-size;background:#000}
.wck-stage>iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.wck-full{background:#000}
.wck-full .wck-stage{inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);width:min(100%,calc(100vh*16/9));width:min(100%,calc(100dvh*16/9));height:auto;aspect-ratio:16/9}
.wck-pfs{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;z-index:2147483000;border-radius:0!important;border:0!important;aspect-ratio:auto!important;margin:0!important}
.yt-facade{position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;border:0;padding:0;cursor:pointer;overflow:hidden}
.yt-facade img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.88}
.yt-play{position:relative;width:68px;height:48px;border-radius:14px;background:#ef4444;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.6)}
.yt-facade:active .yt-play{transform:scale(.94)}
.yt-hint{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 6px #000}
.wck-fsbtn{position:absolute;top:2.5%;right:2.5%;z-index:7;width:34px;height:34px;border-radius:10px;background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.28);font-size:16px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.wck-bug{position:absolute;top:3%;left:2.2%;z-index:6;pointer-events:none;color:#fff;line-height:1;font-size:8px;font-size:clamp(8px,2.1cqw,19px)}
.wck-row{display:flex;align-items:stretch;height:2.1em;border-radius:.4em;overflow:hidden;background:#0b1224;border:.08em solid rgba(234,179,8,.9);box-shadow:0 .2em .8em rgba(0,0,0,.6)}
.wck-team{display:flex;align-items:center;gap:.35em;padding:0 .5em;min-width:0;font-weight:800;background:linear-gradient(180deg,#14213f,#0b1224)}
.wck-name{max-width:6em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wck-logo{width:1.45em;height:1.45em;border-radius:50%;object-fit:cover;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#1e293b;font-size:1em}
.wck-score{min-width:1.75em;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.15em;background:linear-gradient(180deg,#2563eb,#1e3a8a);padding:0 .25em}
.wck-win{background:linear-gradient(180deg,#facc15,#ca8a04);color:#0b1224}
.wck-mid{width:1.6em;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#fde047,#ca8a04);color:#0b1224;font-size:1.05em}
.wck-foot{margin:.2em auto 0;width:max-content;max-width:100%;display:flex;gap:.5em;align-items:center;background:rgba(0,0,0,.78);border-radius:.3em;padding:.25em .6em;font-weight:700;font-size:.8em}
.wck-dot{display:inline-block;width:.6em;height:.6em;border-radius:50%;background:#ef4444;margin-right:.3em}
.wck-title{max-width:12em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    document.head.appendChild(st);

    // ---------- ১) স্কোর ভিডিওর উপরের সেকশনে ----------
    const score = $('liveMatchContent');
    if (score && box.parentElement === score.parentElement && box.nextElementSibling === score) {
        box.parentElement.insertBefore(score, box);
    }

    // ---------- স্কোরবার ----------
    let bugEl = null, lastBugHtml = null;

    function teamLogo(name) {
        const t = (globalTeamsData || []).find(x => x && x.data && safeLower(x.data.teamName) === safeLower(name));
        const u = t ? safeImgUrl(t.data.teamImageUrl) : '';
        return u ? '<img class="wck-logo" alt="" src="' + escHtml(u) + '">' : '<span class="wck-logo">🛡️</span>';
    }

    function bugHtml(live) {
        if (!live || !live.p1Name || !live.p2Name) return '';
        const state = live.state || (live.active ? 'RUNNING' : 'FINISHED');
        if (state !== 'RUNNING') return ''; // সমাপ্ত/স্থগিত ম্যাচ ভিডিওর উপরে দেখানো হবে না
        const s1 = Number(live.p1Score) || 0, s2 = Number(live.p2Score) || 0;
        const w1 = false, w2 = false;
        const tag = '<span><span class="wck-dot"></span>LIVE</span>';
        return '<div class="wck-row">' +
            '<div class="wck-team">' + teamLogo(live.p1Name) + '<span class="wck-name">' + escHtml(live.p1Name) + '</span></div>' +
            '<div class="wck-score' + (w1 ? ' wck-win' : '') + '">' + bn(s1) + '</div>' +
            '<div class="wck-mid">👑</div>' +
            '<div class="wck-score' + (w2 ? ' wck-win' : '') + '">' + bn(s2) + '</div>' +
            '<div class="wck-team"><span class="wck-name">' + escHtml(live.p2Name) + '</span>' + teamLogo(live.p2Name) + '</div>' +
            '</div>' +
            '<div class="wck-foot">' + tag + (live.title ? '<span class="wck-title">' + escHtml(live.title) + '</span>' : '') + '</div>';
    }
    window.__wckBugHtml = bugHtml; // পরীক্ষার জন্য

    function updateOverlay() {
        if (!bugEl) return;
        const hide = !!(globalStreamConfig && globalStreamConfig.hideBug); // স্ট্রিমেই স্কোর বসানো থাকলে সাইটের বার বন্ধ
        const h = hide ? '' : bugHtml(globalLiveMatchData);
        if (h === lastBugHtml) return;
        lastBugHtml = h;
        bugEl.innerHTML = h;
        bugEl.style.display = h ? '' : 'none';
    }

    // ---------- ফুলস্ক্রিন ----------
    let curWrap = null, fsBtn = null;
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    function setIcon() { if (fsBtn) fsBtn.textContent = (curWrap && curWrap.classList.contains('wck-full')) ? '✕' : '⛶'; }
    function pseudo(on) {
        if (!curWrap) return;
        curWrap.classList.toggle('wck-pfs', on);
        curWrap.classList.toggle('wck-full', on);
        document.documentElement.style.overflow = on ? 'hidden' : '';
        setIcon();
    }
    async function enterFs() {
        if (!curWrap) return;
        const req = curWrap.requestFullscreen || curWrap.webkitRequestFullscreen;
        if (req) {
            try {
                await req.call(curWrap);
                try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
                return;
            } catch (e) { /* নিচে পূর্ণ-পর্দা মোড */ }
        }
        pseudo(true);
    }
    function exitFs() {
        if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
        if (curWrap && curWrap.classList.contains('wck-pfs')) pseudo(false);
    }
    function onFsChange() {
        if (!curWrap) return;
        const on = fsEl() === curWrap;
        curWrap.classList.toggle('wck-full', on || curWrap.classList.contains('wck-pfs'));
        if (!on) { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {} }
        setIcon();
    }
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && curWrap && curWrap.classList.contains('wck-pfs')) pseudo(false); });

    // ---------- প্লেয়ার: থাম্বনেইল + স্কোরবার + ফুলস্ক্রিন ----------
    function buildStage() {
        const ifr = box.querySelector('iframe');
        if (!ifr) { bugEl = null; curWrap = null; fsBtn = null; return; }
        const src = ifr.getAttribute('src') || '';
        const m = /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/([\w-]{6,20})/i.exec(src);
        if (!m) return;
        const wrap = ifr.parentElement;
        const allow = (ifr.getAttribute('allow') || '').replace(/;?\s*fullscreen/g, '');
        wrap.textContent = '';
        curWrap = wrap;

        const stage = document.createElement('div');
        stage.className = 'wck-stage';

        const facade = document.createElement('button');
        facade.type = 'button';
        facade.className = 'yt-facade';
        facade.setAttribute('aria-label', 'ভিডিও চালান');
        const img = document.createElement('img');
        img.alt = ''; img.loading = 'lazy';
        img.src = 'https://i.ytimg.com/vi/' + m[3] + '/hqdefault.jpg';
        img.onerror = () => img.remove();
        const play = document.createElement('span'); play.className = 'yt-play'; play.textContent = '▶';
        const hint = document.createElement('span'); hint.className = 'yt-hint'; hint.textContent = 'ভিডিও দেখতে ট্যাপ করুন';
        facade.append(img, play, hint);

        facade.addEventListener('click', () => {
            const f = document.createElement('iframe');
            let u = src;
            try {
                const url = new URL(src);
                url.searchParams.set('fs', '0');          // YouTube-এর ফুলস্ক্রিন বন্ধ; আমাদেরটা ব্যবহার হবে
                url.searchParams.set('playsinline', '1'); // iPhone-এ ইনলাইন চলবে
                url.searchParams.set('rel', '0');
                u = url.toString();
            } catch (e) {}
            f.src = u;
            f.title = 'YouTube Live Stream';
            f.setAttribute('allow', allow);
            stage.insertBefore(f, facade);
            facade.remove();
        });

        bugEl = document.createElement('div');
        bugEl.className = 'wck-bug';
        bugEl.style.display = 'none';
        lastBugHtml = null;

        fsBtn = document.createElement('button');
        fsBtn.type = 'button';
        fsBtn.className = 'wck-fsbtn';
        fsBtn.setAttribute('aria-label', 'ফুলস্ক্রিন');
        fsBtn.textContent = '⛶';
        fsBtn.addEventListener('click', () => {
            if (curWrap.classList.contains('wck-full')) exitFs(); else enterFs();
        });

        stage.append(facade, bugEl, fsBtn);
        wrap.appendChild(stage);
        updateOverlay();
    }

    // ---------- স্ট্রিম বক্স: সেটিং না বদলালে আবার আঁকা হবে না ----------
    const _rls = window.renderLiveStreamWidget;
    let lastSig = null;
    window.renderLiveStreamWidget = function () {
        let sig = '';
        try { sig = JSON.stringify(globalStreamConfig || {}); } catch (e) {}
        if (sig === lastSig && box.dataset.rendered === '1') return;
        _rls.apply(this, arguments);
        lastSig = sig;
        box.dataset.rendered = '1';
        try { buildStage(); } catch (e) { console.error(e); }
    };

    // পুরো ডাটা লোড/রেন্ডার হলেই স্কোরবার হালনাগাদ
    if (typeof window.renderData === 'function') {
        const _rd = window.renderData;
        window.renderData = function () {
            _rd.apply(this, arguments);
            try { updateOverlay(); } catch (e) {}
        };
    }

    // ---------- দ্রুত লাইভ-স্কোর পোল (শুধু ছোট একটি রো) ----------
    let lastLiveSig = '';
    try { lastLiveSig = JSON.stringify(globalLiveMatchData || null); } catch (e) {}
    async function pollLive() {
        if (document.hidden || isAdmin) return;
        try {
            const res = await fetch(REST + '/teams?id=eq.LIVE_CURRENT_MATCH&select=data', { headers: dbHeaders() });
            if (!res.ok) return;
            const rows = await res.json();
            const d = rows && rows[0] ? rows[0].data : null;
            const sig = JSON.stringify(d || null);
            if (sig === lastLiveSig) return;
            lastLiveSig = sig;
            globalLiveMatchData = d || null;
            if (typeof renderLiveMatchWidget === 'function') renderLiveMatchWidget();
            updateOverlay();
        } catch (e) { /* নেটওয়ার্ক সমস্যা: পরের বারে আবার */ }
    }
    let tick = 0;
    setInterval(() => {
        tick++;
        const live = globalLiveMatchData;
        const running = !!(live && (live.state === 'RUNNING' || live.active));
        const cfg = globalStreamConfig || {};
        const streaming = cfg.displayMode !== 'OFF' && !!(cfg.ytUrl || cfg.fbUrl);
        if (running || (streaming && tick % 3 === 0)) pollLive();
    }, 8000);

    // ---------- এডমিন: "স্ট্রিমে স্কোর বসানো আছে" চেকবক্স ----------
    // OBS দিয়ে স্কোর ভিডিওতেই বসালে সাইটের দ্বিতীয় স্কোরবার বন্ধ রাখতে এটি টিক দিন।
    const saveBtn = $('saveStreamBtn');
    if (saveBtn && !$('adminHideBug')) {
        saveBtn.insertAdjacentHTML('beforebegin',
            '<label class="flex items-start gap-2 text-xs text-gray-300 bg-slate-950 border border-slate-800 rounded-xl p-3 cursor-pointer">' +
            '<input type="checkbox" id="adminHideBug" class="mt-0.5">' +
            '<span><strong class="text-yellow-400">স্ট্রিমে স্কোর বসানো আছে (OBS ওভারলে)</strong><br>' +
            'টিক দিলে ওয়েবসাইটের ভিডিওর উপরের স্কোরবার বন্ধ থাকবে, যাতে দুটি স্কোরবার একসাথে না আসে।</span></label>');
    }
    if (typeof window.populateStreamForm === 'function') {
        const _psf = window.populateStreamForm;
        window.populateStreamForm = function () {
            _psf.apply(this, arguments);
            const c = $('adminHideBug');
            if (c && !streamFormDirty) c.checked = !!(globalStreamConfig && globalStreamConfig.hideBug);
        };
    }
    if (typeof window.dbUpsert === 'function') {
        const _dbu = window.dbUpsert;
        window.dbUpsert = function (id, group, data) {
            if (id === 'LIVE_STREAM_CONFIG' && data && typeof data === 'object') {
                const c = $('adminHideBug');
                if (c) data = Object.assign({}, data, { hideBug: c.checked });
            }
            return _dbu.call(this, id, group, data);
        };
    }

    window.renderLiveStreamWidget(); // এখনকার ডাটা দিয়ে একবার প্রয়োগ
})();


/* ===== লাইভ ম্যাচ কন্ট্রোল: ম্যাচ সিলেক্ট ড্রপডাউন (গ্রুপ পর্ব → তৃতীয় স্থান → ফাইনাল) =====
   • "ম্যাচ পর্যায় / শিরোনাম" এখন ড্রপডাউন: ১২টি গ্রুপ ম্যাচ + QF-1..4 + SF-1..2 + ৩য় স্থান + ফাইনাল
   • ম্যাচ বাছলে দুই টিম অটো বসে (গ্রুপে ফিকশ্চার থেকে, নকআউটে ফলাফল থেকে অটো-নির্ধারিত টিম)
   • ভুল টিম/অন্য গ্রুপ/২ ম্যাচের বেশি ইত্যাদি সেভের আগেই আটকানো হয়
   • "সমাপ্ত/স্থগিত" সেভ করলে ফলাফল সেই ম্যাচের আসল কোডে (G1_M1, QF-1...) সেভ হয় — তাই গ্রুপ টেবিল ও
     নকআউট ব্র্যাকেট নিজে থেকে আপডেট হয়; আলাদা নকল এন্ট্রি তৈরি হয় না
   • সব সেভ আগের মতোই Supabase-এ (LIVE_CURRENT_MATCH ও MATCH_SCORES রো) */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof GROUPS === 'undefined' || typeof window.saveLiveMatchInfo !== 'function' || typeof window.dbUpsert !== 'function') return;

    const KO_CODES = ['QF-1', 'QF-2', 'QF-3', 'QF-4', 'SF-1', 'SF-2', '3P-Match', 'FINAL'];

    function allMatches() {
        const a = [];
        GROUPS.forEach(g => g.matches.forEach((c, i) => a.push({ code: c, title: g.name + ' - ম্যাচ ' + bn(i + 1), group: g.name })));
        KO_CODES.forEach(c => a.push({ code: c, title: defaultTitleFor(c), ko: true }));
        return a;
    }
    const regNames = () => {
        const s = new Set();
        (globalTeamsData || []).forEach(t => { if (t && t.data && t.data.teamName) s.add(safeLower(t.data.teamName)); });
        return s;
    };
    const infoOf = code => { try { return getMatchInfo(code, defaultTitleFor(code)); } catch (e) { return null; } };
    function resolvedPair(code) {
        const i = infoOf(code);
        if (!i) return null;
        const r = regNames();
        return (r.has(safeLower(i.p1Name)) && r.has(safeLower(i.p2Name))) ? [i.p1Name, i.p2Name] : null;
    }
    const isDone = code => { const m = (globalMatchesData || {})[code]; return !!(m && isCompletedMatch(m)); };

    function label(m) {
        const pair = resolvedPair(m.code);
        let s = m.title + ' (' + m.code + ')' + (pair ? ' — ' + pair[0] + ' vs ' + pair[1] : ' — টিম অপেক্ষমাণ');
        if (isDone(m.code)) s = '✅ ' + s;
        return s;
    }
    function optionsHtml() {
        const opt = m => '<option value="' + escHtml(m.title) + '" data-code="' + m.code + '">' + escHtml(label(m)) + '</option>';
        let html = '<option value="">-- ম্যাচ সিলেক্ট করুন --</option>';
        GROUPS.forEach(g => {
            html += '<optgroup label="গ্রুপপর্ব — ' + escHtml(g.name) + '">' + allMatches().filter(m => m.group === g.name).map(opt).join('') + '</optgroup>';
        });
        html += '<optgroup label="নকআউট ও ফাইনাল">' + allMatches().filter(m => m.ko).map(opt).join('') + '</optgroup>';
        return html;
    }
    function selCode() {
        const s = $('adminLiveTitle');
        const o = s && s.selectedOptions && s.selectedOptions[0];
        return (o && o.dataset && o.dataset.code) || '';
    }

    // ---------- যাচাই (গ্রুপ নিয়ম + নকআউটে অটো-নির্ধারিত টিম) ----------
    function validateLive(code, p1, p2) {
        const a = safeLower(p1), b = safeLower(p2);
        const reg = regNames();
        if (!a || !b) return '⛔ দুটি টিমই সিলেক্ট করুন!';
        if (a === b) return '⛔ একই টিম নিজের বিরুদ্ধে খেলতে পারে না!';
        if (!reg.has(a) || !reg.has(b)) return '⛔ শুধু নিবন্ধিত টিম দেওয়া যাবে।';
        const g = GROUPS.find(x => x.matches.includes(code));
        if (g) {
            const gTeams = ((getGroups()[g.name]) || []).map(t => safeLower(t.teamName));
            if (!gTeams.includes(a) || !gTeams.includes(b)) return '⛔ ' + g.name + '-এর ম্যাচে শুধু ' + g.name + '-এর টিম দেওয়া যাবে। অন্য গ্রুপের টিম নেওয়া হবে না।';
            const st = (globalMatchesData || {})[code];
            const sx = safeLower(st && st.p1Name), sy = safeLower(st && st.p2Name);
            if (reg.has(sx) && reg.has(sy)) {
                if (!((sx === a && sy === b) || (sx === b && sy === a))) return '⛔ ফিকশ্চার অনুযায়ী এই ম্যাচে "' + st.p1Name + '" বনাম "' + st.p2Name + '" খেলবে।';
                return '';
            }
            let ca = 0, cb = 0;
            for (const c of g.matches) {
                if (c === code) continue;
                const m = (globalMatchesData || {})[c];
                if (!m) continue;
                const x = safeLower(m.p1Name), y = safeLower(m.p2Name);
                if ((x === a && y === b) || (x === b && y === a)) return '⛔ এই দুই টিমের ম্যাচ (' + c + ') আগেই নির্ধারিত আছে। গ্রুপে প্রতি জোড়া একবারই খেলবে।';
                if (x === a || y === a) ca++;
                if (x === b || y === b) cb++;
            }
            if (ca >= 2 || cb >= 2) return '⛔ একটি টিম গ্রুপ পর্বে সর্বোচ্চ ২টি ম্যাচ খেলবে।';
            return '';
        }
        if (KO_CODES.includes(code)) {
            const pair = resolvedPair(code);
            if (!pair) return '⛔ এই ম্যাচের টিম এখনো নির্ধারিত হয়নি। আগের ধাপের ম্যাচ শেষ হলে অটো বসবে।';
            const x = safeLower(pair[0]), y = safeLower(pair[1]);
            if (!((x === a && y === b) || (x === b && y === a))) return '⛔ এই ম্যাচে অটো-নির্ধারিত টিম: "' + pair[0] + '" বনাম "' + pair[1] + '"। অন্য টিম দেওয়া যাবে না।';
        }
        return '';
    }

    // ---------- সেভ: নিয়ম যাচাই ----------
    const _slm = window.saveLiveMatchInfo;
    window.saveLiveMatchInfo = function (e) {
        if (isAdmin) {
            const code = selCode();
            if (code) {
                const err = validateLive(code, safeStr($('adminLiveP1Select').value).trim(), safeStr($('adminLiveP2Select').value).trim());
                if (err) { e.preventDefault(); toast(err, 'err'); return; }
            }
        }
        return _slm.apply(this, arguments);
    };

    // ---------- সেভ: Supabase রো-এর রূপান্তর (পুরনো ফাংশনের ভেতরের নকল LIVE_RES_ এন্ট্রি → আসল ম্যাচ কোড) ----------
    function mapUpsert(id, group, data, code) {
        if (!code || !data || typeof data !== 'object') return [id, data];
        if (typeof id === 'string' && id.indexOf('LIVE_RES_') === 0 && group === 'MATCH_SCORES') {
            const ex = (globalMatchesData || {})[code] || {};
            const merged = Object.assign({}, ex, data, {
                id: code, matchCode: code,
                title: ex.title || data.title,
                date: ex.date || data.date,
                ts: Date.now()
            });
            return [code, merged];
        }
        if (id === 'LIVE_CURRENT_MATCH' && data.p1Name) return [id, Object.assign({}, data, { matchCode: code })];
        return [id, data];
    }
    const _dbu = window.dbUpsert;
    window.dbUpsert = function (id, group, data) {
        const r = isAdmin ? mapUpsert(id, group, data, selCode()) : [id, data];
        return _dbu.call(this, r[0], group, r[1]);
    };

    // ---------- ড্রপডাউন তৈরি ও হালনাগাদ ----------
    function build() {
        const inp = $('adminLiveTitle');
        if (!inp || inp.tagName === 'SELECT') return;
        const sel = document.createElement('select');
        sel.id = 'adminLiveTitle';
        sel.required = true;
        sel.className = 'w-full bg-slate-900 border border-yellow-500/50 rounded-xl p-2.5 text-xs text-yellow-300 font-bold';
        sel.innerHTML = optionsHtml();
        inp.replaceWith(sel);
        sel.addEventListener('change', onPick);
    }
    function refreshLabels() {
        const sel = $('adminLiveTitle');
        if (!sel || !sel.options) return;
        const byCode = {};
        allMatches().forEach(m => { byCode[m.code] = m; });
        Array.prototype.forEach.call(sel.options, o => {
            const c = o.dataset && o.dataset.code;
            if (c && byCode[c]) o.textContent = label(byCode[c]);
        });
    }

    function onPick() {
        const code = selCode();
        if (!code) return;
        const p1 = $('adminLiveP1Select'), p2 = $('adminLiveP2Select');
        const s1 = $('adminLiveP1Score'), s2 = $('adminLiveP2Score'), st = $('adminLiveStateDropdown');
        const live = globalLiveMatchData;
        if (live && live.matchCode === code && live.p1Name) { // এটাই এখনকার লাইভ ম্যাচ → আগের মান
            setSelectValue(p1, live.p1Name); setSelectValue(p2, live.p2Name);
            s1.value = live.p1Score !== undefined ? live.p1Score : 0;
            s2.value = live.p2Score !== undefined ? live.p2Score : 0;
            st.value = live.state || 'RUNNING';
            return;
        }
        const pair = resolvedPair(code);
        if (pair) {
            setSelectValue(p1, pair[0]); setSelectValue(p2, pair[1]);
            s1.value = 0; s2.value = 0; st.value = 'RUNNING';
            if (isDone(code)) toast('⚠️ এই ম্যাচের ফলাফল আগেই সেভ আছে। আবার "সমাপ্ত" করলে তা বদলে যাবে।', 'info');
        } else {
            p1.value = ''; p2.value = '';
            toast('ℹ️ এই ম্যাচের টিম এখনো নির্ধারিত নয়। গ্রুপ ম্যাচে ফিকশ্চার ট্যাব থেকে টিম সেট করুন; নকআউটে আগের ধাপ শেষ হলে অটো বসবে।', 'info');
        }
    }

    // সেভ করা লাইভ ম্যাচ ফর্মে ফিরে এলে (এমনকি পুরনো ফ্রি-টেক্সট শিরোনামও) ঠিকভাবে দেখানো
    if (typeof window.populateLiveMatchFormStandby === 'function') {
        const _pl = window.populateLiveMatchFormStandby;
        window.populateLiveMatchFormStandby = function () {
            _pl.apply(this, arguments);
            try {
                const sel = $('adminLiveTitle'), live = globalLiveMatchData;
                if (sel && sel.options && live && live.title && sel.value !== live.title && !liveFormDirty) {
                    const o = document.createElement('option');
                    o.value = live.title; o.textContent = live.title;
                    sel.appendChild(o);
                    sel.value = live.title;
                }
            } catch (e) { console.error(e); }
        };
    }

    const _rd2 = window.renderData;
    if (typeof _rd2 === 'function') {
        window.renderData = function () {
            _rd2.apply(this, arguments);
            try { refreshLabels(); } catch (e) {}
        };
    }

    window.__liveSel = { validateLive, optionsHtml, mapUpsert, allMatches };
    build();
    refreshLabels();
})();


/* ===== এডমিন "সকল ম্যাচ ... ম্যানেজমেন্ট" ফর্ম: ড্রপডাউন সিস্টেম =====
   • ম্যাচ আইডি/কোড → ড্রপডাউন (G1_M1 … G4_M3, QF-1…4, SF-1…2, 3P-Match, FINAL); বাছলেই ম্যাচের সব তথ্য ফর্মে আসে
   • ম্যাচের নাম/টাইটেল → ড্রপডাউন (গ্রুপ পর্ব থেকে ৩য় স্থান ও ফাইনাল পর্যন্ত ২০টি ম্যাচ); কোডের সাথে মিলিয়ে চলে
   • তারিখ ও সময় → ড্রপডাউন (দিন / মাস / বছর / ঘণ্টা / মিনিট / AM-PM); আগের লেখা তারিখ অক্ষত থাকে
   সেভ আগের মতোই Supabase-এর MATCH_SCORES রো-তে (মূল সেভ ফাংশন অপরিবর্তিত; ফর্মের মান একই আইডি থেকে পড়ে)। */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof GROUPS === 'undefined' || typeof window.editMatchScore !== 'function' || typeof window.resetMatchForm !== 'function') return;
    const codeInp = $('mCode'), titleInp = $('mTitle'), dateInp = $('mDate');
    if (!codeInp || !titleInp || !dateInp || codeInp.tagName === 'SELECT') return;

    const KO_CODES = ['QF-1', 'QF-2', 'QF-3', 'QF-4', 'SF-1', 'SF-2', '3P-Match', 'FINAL'];
    const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const YEARS = [2026, 2027, 2028];
    const bn2en = s => String(s == null ? '' : s).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
    const pad = n => (n < 10 ? '0' : '') + n;

    // ---------- ম্যাচ তালিকা ও লেবেল ----------
    function allMatches() {
        const a = [];
        GROUPS.forEach(g => g.matches.forEach(c => a.push({ code: c, title: defaultTitleFor(c), group: g.name })));
        KO_CODES.forEach(c => a.push({ code: c, title: defaultTitleFor(c), ko: true }));
        return a;
    }
    const regNames = () => {
        const s = new Set();
        (globalTeamsData || []).forEach(t => { if (t && t.data && t.data.teamName) s.add(safeLower(t.data.teamName)); });
        return s;
    };
    function pairOf(code) {
        let i = null;
        try { i = getMatchInfo(code, defaultTitleFor(code)); } catch (e) {}
        if (!i) return null;
        const r = regNames();
        return (r.has(safeLower(i.p1Name)) && r.has(safeLower(i.p2Name))) ? [i.p1Name, i.p2Name] : null;
    }
    const doneOf = code => { const m = (globalMatchesData || {})[code]; return !!(m && isCompletedMatch(m)); };
    const codeLabel = m => (doneOf(m.code) ? '✅ ' : '') + m.code + (pairOf(m.code) ? ' — ' + pairOf(m.code).join(' vs ') : ' — টিম অপেক্ষমাণ');
    const titleLabel = m => (doneOf(m.code) ? '✅ ' : '') + m.title + ' (' + m.code + ')';

    function opt(value, text, code) {
        const o = document.createElement('option');
        o.value = value; o.textContent = text;
        if (code) o.dataset.code = code;
        return o;
    }
    function fillMatchSelect(sel, valueFn, labelFn) {
        sel.appendChild(opt('', '-- ম্যাচ সিলেক্ট করুন --'));
        const list = allMatches();
        GROUPS.forEach(g => {
            const og = document.createElement('optgroup');
            og.label = 'গ্রুপপর্ব — ' + g.name;
            list.filter(m => m.group === g.name).forEach(m => og.appendChild(opt(valueFn(m), labelFn(m), m.code)));
            sel.appendChild(og);
        });
        const ko = document.createElement('optgroup');
        ko.label = 'নকআউট ও ফাইনাল';
        list.filter(m => m.ko).forEach(m => ko.appendChild(opt(valueFn(m), labelFn(m), m.code)));
        sel.appendChild(ko);
    }
    function ensureOption(sel, value, code) {
        if (!value) return;
        const has = Array.prototype.some.call(sel.options, o => o.value === value);
        if (!has) sel.appendChild(opt(value, value, code));
    }

    // ---------- তারিখ: পার্স ও তৈরি ----------
    function parseDate(v) {
        const s = bn2en(v).replace(/\s+/g, ' ').trim();
        const r = {};
        if (!s) return r;
        const sl = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/.exec(s);
        if (sl) { r.day = +sl[1]; r.mon = +sl[2] - 1; r.year = +sl[3]; }
        else {
            const dm = /(^|[^\d])(\d{1,2})(?!\d)/.exec(s);
            if (dm) r.day = +dm[2];
            for (let i = 0; i < 12; i++) {
                const p = MONTHS[i].slice(0, Math.min(3, MONTHS[i].length));
                if (s.indexOf(p) >= 0) { r.mon = i; break; }
            }
            const ym = /(20\d{2})/.exec(s);
            if (ym) r.year = +ym[1];
        }
        let h, mi;
        let tm = /(\d{1,2})\s*[:ঃ]\s*(\d{1,2})/.exec(s);
        if (tm) { h = +tm[1]; mi = +tm[2]; }
        else { tm = /(\d{1,2})\s*টা/.exec(s); if (tm) { h = +tm[1]; mi = 0; } }
        if (h !== undefined) {
            let ap = '';
            if (/\bAM\b/i.test(s)) ap = 'AM';
            else if (/\bPM\b/i.test(s)) ap = 'PM';
            else if (/সকাল|ভোর/.test(s)) ap = 'AM';
            else if (/দুপুর|বিকাল|সন্ধ্যা/.test(s)) ap = 'PM';
            else if (/রাত/.test(s)) ap = (h >= 6 && h < 12) ? 'PM' : 'AM';
            if (h > 12) { h -= 12; ap = 'PM'; } else if (h === 0) { h = 12; ap = 'AM'; }
            r.h = h; r.mi = mi; r.ap = ap;
        }
        return r;
    }

    // ---------- ফর্মের ফিল্ড বদলানো ----------
    const CLS = 'w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white';
    const CLS_Y = 'w-full bg-slate-900 border border-yellow-500/50 rounded-xl p-2.5 text-xs text-yellow-300 font-bold';

    const codeSel = document.createElement('select');
    codeSel.id = 'mCode'; codeSel.required = true; codeSel.className = CLS_Y;
    fillMatchSelect(codeSel, m => m.code, codeLabel);
    codeInp.replaceWith(codeSel);

    const titleSel = document.createElement('select');
    titleSel.id = 'mTitle'; titleSel.required = true; titleSel.className = CLS_Y;
    fillMatchSelect(titleSel, m => m.title, titleLabel);
    titleInp.replaceWith(titleSel);

    // তারিখ: আসল ফিল্ড (id=mDate) লুকানো থাকে — মূল সেভ ফাংশন এখান থেকেই পড়ে
    const dateParent = dateInp.parentElement;
    const hid = document.createElement('input');
    hid.type = 'hidden'; hid.id = 'mDate'; hid.value = dateInp.value || '';
    dateInp.replaceWith(hid);

    function mkPart(id, firstLabel, options) {
        const s = document.createElement('select');
        s.id = id; s.className = CLS;
        s.appendChild(opt('', firstLabel));
        options.forEach(x => s.appendChild(opt(x[0], x[1])));
        return s;
    }
    const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push([String(i), bn(i)]); return r; };
    const daySel = mkPart('mDateDay', 'দিন', range(1, 31));
    const monSel = mkPart('mDateMonth', 'মাস', MONTHS.map((m, i) => [String(i), m]));
    const yearSel = mkPart('mDateYear', 'বছর', YEARS.map(y => [String(y), bn(y)]));
    const hourSel = mkPart('mDateHour', 'ঘণ্টা', range(1, 12));
    const minSel = mkPart('mDateMin', 'মিনিট', Array.from({ length: 12 }, (_, i) => [pad(i * 5), bn(pad(i * 5))]));
    const ampSel = mkPart('mDateAmPm', 'AM/PM', [['AM', 'AM'], ['PM', 'PM']]);
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-3 gap-2';
    [daySel, monSel, yearSel, hourSel, minSel, ampSel].forEach(s => grid.appendChild(s));
    const note = document.createElement('p');
    note.id = 'mDateNote';
    note.className = 'text-[11px] text-amber-300 mt-1 hidden';
    if (dateParent) { dateParent.appendChild(grid); dateParent.appendChild(note); }

    function compose() {
        const d = daySel.value, m = monSel.value, y = yearSel.value, h = hourSel.value;
        if (!(d && m !== '' && y)) return '';
        let s = bn(d) + ' ' + MONTHS[Number(m)] + ', ' + bn(y);
        if (h) s += ' - ' + bn(h) + ':' + bn(minSel.value || '00') + (ampSel.value ? ' ' + ampSel.value : '');
        return s;
    }
    function syncDate() {
        const v = safeStr(hid.value).trim();
        [daySel, monSel, yearSel, hourSel, minSel, ampSel].forEach(s => { s.value = ''; });
        if (!v) { note.classList.add('hidden'); return; }
        const p = parseDate(v);
        if (p.day) daySel.value = String(p.day);
        if (p.mon !== undefined) monSel.value = String(p.mon);
        if (p.year) yearSel.value = String(p.year);
        if (p.h) {
            hourSel.value = String(p.h);
            if (p.mi !== undefined) minSel.value = pad(p.mi);
            if (p.ap) ampSel.value = p.ap;
        }
        if (compose() !== v) {
            note.textContent = 'ℹ️ বর্তমানে সেভ করা: "' + v + '" — নিচের ড্রপডাউন বদলালে এটি নতুন ফরম্যাটে বদলে যাবে, না বদলালে হুবহু থাকবে।';
            note.classList.remove('hidden');
        } else { note.classList.add('hidden'); }
    }
    [daySel, monSel, yearSel, hourSel, minSel, ampSel].forEach(s => s.addEventListener('change', () => {
        hid.value = compose();
        note.classList.add('hidden');
    }));

    // ---------- ম্যাচ বাছলে ফর্ম ভরা (মূল editMatchScore দিয়ে) ----------
    function pick(code) { if (code) window.editMatchScore(code); }
    codeSel.addEventListener('change', () => pick(codeSel.value));
    titleSel.addEventListener('change', () => {
        const o = titleSel.selectedOptions && titleSel.selectedOptions[0];
        pick(o && o.dataset ? o.dataset.code : '');
    });

    const _em = window.editMatchScore;
    window.editMatchScore = function (code) {
        const r = _em.apply(this, arguments);
        if (!isAdmin) return r;
        try {
            const info = getMatchInfo(code, defaultTitleFor(code));
            ensureOption(codeSel, code, code);
            codeSel.disabled = false;   // ড্রপডাউনে ম্যাচ বদলানো যাবে
            codeSel.value = code;
            const t = (info && info.title) || defaultTitleFor(code);
            ensureOption(titleSel, t, code);
            titleSel.value = t;
            hid.value = (globalMatchesData && globalMatchesData[code]) ? ((info && info.date) || '') : '';
            syncDate();
        } catch (e) { console.error(e); }
        return r;
    };
    const _rm = window.resetMatchForm;
    window.resetMatchForm = function () {
        const r = _rm.apply(this, arguments);
        try { codeSel.disabled = false; codeSel.value = ''; titleSel.value = ''; hid.value = ''; syncDate(); } catch (e) {}
        return r;
    };

    // ---------- লেবেল হালনাগাদ (টিম/✅ বদলালে) ----------
    function refreshLabels() {
        const byCode = {};
        allMatches().forEach(m => { byCode[m.code] = m; });
        Array.prototype.forEach.call(codeSel.options, o => { const c = o.dataset && o.dataset.code; if (c && byCode[c] && o.value === c) o.textContent = codeLabel(byCode[c]); });
        Array.prototype.forEach.call(titleSel.options, o => { const c = o.dataset && o.dataset.code; if (c && byCode[c] && o.value === byCode[c].title) o.textContent = titleLabel(byCode[c]); });
    }
    const _rd3 = window.renderData;
    if (typeof _rd3 === 'function') {
        window.renderData = function () {
            _rd3.apply(this, arguments);
            try { refreshLabels(); } catch (e) {}
        };
    }

    window.__matchForm = { parseDate, compose, syncDate, allMatches };
    refreshLabels();
    syncDate();
})();


/* ===== হোমপেইজ "সমাপ্ত ম্যাচসমূহ": এডমিন এডিট / মুছুন / আপডেট =====
   • এডমিন লগইন থাকলে প্রতিটি সমাপ্ত ম্যাচ কার্ডে ✏️ এডিট ও 🗑️ মুছুন বাটন আসে (দর্শকের স্ক্রিনে আসে না)
   • এডিট: নাম, তারিখ-সময় (ড্রপডাউন), দুই টিম, দুই পয়েন্ট, সমাপ্ত/স্থগিত, ফলাফলের লেখা — সব বদলানো যায়
   • মুছুন: আসল ম্যাচ-কোড (G1_M1, QF-1 …) হলে "শুধু ফলাফল মুছুন" (টিম ও তারিখ থাকে) বা "পুরো এন্ট্রি মুছুন";
     লাইভ থেকে তৈরি পুরনো এন্ট্রি হলে "এন্ট্রি মুছুন"
   • সব পরিবর্তন সরাসরি Supabase-এর teams টেবিলের সংশ্লিষ্ট রো-তে (আগে রো পড়ে, বাকি ফিল্ড অক্ষত রেখে লেখা হয়)
   • গ্রুপ টেবিল ও নকআউট ব্র্যাকেট নতুন ফলাফল থেকে নিজে থেকে আবার হিসাব হয় */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof GROUPS === 'undefined' || typeof isCompletedMatch !== 'function' || typeof dbDelete !== 'function' || typeof loadData !== 'function' || typeof REST === 'undefined') return;

    const RESULT_UNPLAYED = 'ম্যাচ এখনও শুরু হয় নাই।';
    const KO_CODES = ['QF-1', 'QF-2', 'QF-3', 'QF-4', 'SF-1', 'SF-2', '3P-Match', 'FINAL'];
    const ORDER = GROUPS.reduce((a, g) => a.concat(g.matches), []).concat(KO_CODES);
    const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const YEARS = [2026, 2027, 2028];
    const isCode = id => ORDER.indexOf(id) >= 0;
    const pad = n => (n < 10 ? '0' : '') + n;
    const phase = c => GROUPS.some(g => g.matches.indexOf(c) >= 0) ? 0 : c.indexOf('QF') === 0 ? 1 : c.indexOf('SF') === 0 ? 2 : 3;
    const doneId = c => { const m = (globalMatchesData || {})[c]; return !!(m && isCompletedMatch(m)); };

    // ---------- Supabase (সরাসরি; অন্য র‍্যাপারের প্রভাব এড়াতে) ----------
    async function fetchRow(id) {
        const res = await fetch(REST + '/teams?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: dbHeaders() });
        if (!res.ok) throw new Error('রো পড়া যায়নি (HTTP ' + res.status + ')');
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) throw new Error('এন্ট্রিটি আর পাওয়া যাচ্ছে না');
        return rows[0];
    }
    async function rawUpsert(id, group, data) {
        const res = await fetch(REST + '/teams', {
            method: 'POST',
            headers: dbHeaders({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
            body: JSON.stringify({ id: id, group_name: group, data: data })
        });
        if (!res.ok) { let t = ''; try { t = await res.text(); } catch (e) {} throw new Error(t || ('HTTP ' + res.status)); }
    }

    // ---------- লাইভ কার্ডের সাথে মিল ----------
    function liveSame(id, m) {
        const l = globalLiveMatchData;
        if (!l || !l.p1Name || !l.p2Name || !m) return false;
        if (l.state !== 'FINISHED' && l.state !== 'SUSPENDED') return false;
        if (l.matchCode && l.matchCode === id) return true;
        return safeLower(l.p1Name) === safeLower(m.p1Name) && safeLower(l.p2Name) === safeLower(m.p2Name) && safeLower(l.title) === safeLower(m.title);
    }
    function downstreamWarning(id) {
        if (!isCode(id)) return '';
        const later = ORDER.filter(c => phase(c) > phase(id) && doneId(c));
        return later.length ? '⚠️ পরবর্তী ধাপের ফলাফল (' + later.join(', ') + ') আগেই সেভ আছে — এই পরিবর্তনে সেগুলোর টিম মিলতে নাও পারে।' : '';
    }

    // ---------- যাচাই ও ফলাফলের লেখা ----------
    function autoResult(n1, n2, a, b, status) {
        if (status === 'SUSPENDED') return 'ম্যাচ স্থগিত (' + a + '-' + b + ' পয়েন্টে স্থগিত)';
        if (!n1 || !n2 || a === b || isNaN(a) || isNaN(b)) return '';
        return a > b ? n1 + ' বিজয়ী (' + a + '-' + b + ' পয়েন্টে জয়ী)' : n2 + ' বিজয়ী (' + b + '-' + a + ' পয়েন্টে জয়ী)';
    }
    function validateEdit(id, v) {
        if (!v.title) return '⛔ ম্যাচের নাম দিন।';
        if (!v.p1 || !v.p2) return '⛔ দুটি টিমই সিলেক্ট করুন।';
        if (safeLower(v.p1) === safeLower(v.p2)) return '⛔ একই টিম নিজের বিরুদ্ধে খেলতে পারে না!';
        const okPt = x => Number.isInteger(x) && x >= 0 && x <= WINNING_SCORE;
        if (!okPt(v.a) || !okPt(v.b)) return '⛔ দুই টিমের পয়েন্ট ০ থেকে ' + bn(WINNING_SCORE) + '-এর মধ্যে পূর্ণসংখ্যা হতে হবে।';
        if (v.status === 'DONE') {
            if (v.a !== WINNING_SCORE && v.b !== WINNING_SCORE) return '⛔ "সমাপ্ত" ম্যাচে একটি টিমের পয়েন্ট অবশ্যই ' + bn(WINNING_SCORE) + ' হতে হবে। (অন্যথায় স্ট্যাটাস "স্থগিত" দিন)';
            if (v.a === v.b) return '⛔ সমাপ্ত ম্যাচে দুই টিমের পয়েন্ট সমান হতে পারে না।';
            if (!/বিজয়ী|জয়ী/.test(v.result)) return '⛔ ফলাফলের লেখায় "বিজয়ী" থাকতে হবে।';
        } else if (!/স্থগিত/.test(v.result)) {
            return '⛔ স্থগিত ম্যাচের ফলাফলের লেখায় "স্থগিত" থাকতে হবে।';
        }
        if (isCode(id) && window.__liveSel && typeof window.__liveSel.validateLive === 'function') {
            const e = window.__liveSel.validateLive(id, v.p1, v.p2);
            if (e) return e;
        }
        return '';
    }

    // ---------- সংরক্ষণ ও মুছা ----------
    async function saveEdit(id, v, updateLive) {
        const row = await fetchRow(id);
        const d = Object.assign({}, row.data || {}, {
            title: v.title, date: v.date, p1Name: v.p1, p2Name: v.p2,
            p1Points: String(v.a), p2Points: String(v.b), result: v.result,
            ts: (row.data && row.data.ts) || Date.now()
        });
        await rawUpsert(row.id, row.group_name, d);
        if (updateLive) {
            await rawUpsert('LIVE_CURRENT_MATCH', 'LIVE_MATCH', Object.assign({}, globalLiveMatchData || {}, {
                active: false, state: v.status === 'DONE' ? 'FINISHED' : 'SUSPENDED',
                status: v.status === 'DONE' ? 'ম্যাচ সমাপ্ত' : 'ম্যাচ স্থগিত',
                title: v.title, p1Name: v.p1, p2Name: v.p2, p1Score: v.a, p2Score: v.b, winnerText: v.result
            }));
        }
    }
    async function doDelete(id, mode, clearLive) {
        if (mode === 'reset') {
            const row = await fetchRow(id);
            await rawUpsert(row.id, row.group_name, Object.assign({}, row.data || {}, { p1Points: '0', p2Points: '0', result: RESULT_UNPLAYED }));
        } else {
            await dbDelete(id);
        }
        if (clearLive) await rawUpsert('LIVE_CURRENT_MATCH', 'LIVE_MATCH', { active: false, state: 'SUSPENDED', title: 'ম্যাচ স্থগিত', status: 'স্থগিত' });
    }

    // ---------- তালিকা রেন্ডার (এডমিনের জন্য বাটনসহ) ----------
    function doneList() {
        const done = [];
        Object.keys(globalMatchesData || {}).forEach((k, i) => {
            const m = globalMatchesData[k];
            if (m && isCompletedMatch(m)) done.push({ id: k, m: m, i: i });
        });
        done.sort((a, b) => ((b.m.ts || 0) - (a.m.ts || 0)) || (b.i - a.i));
        return done;
    }
    function cardHtml(id, m) {
        const tag = isCode(id) ? id : 'লাইভ-এন্ট্রি';
        return '<div class="card-lift bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-2 hover:border-emerald-500/40 shadow-lg" data-mid="' + escHtml(id) + '">' +
            '<div class="flex justify-between gap-2 text-yellow-400 font-extrabold border-b border-slate-800 pb-1.5">' +
            '<span>' + escHtml(m.title || m.matchCode || id) + ' <span class="text-[10px] text-gray-500 font-bold">(' + escHtml(tag) + ')</span></span>' +
            '<span class="text-gray-400 text-[10px] font-normal text-right">📅 ' + escHtml(m.date || '') + '</span></div>' +
            '<div class="flex justify-between items-center gap-2 text-white font-bold py-1">' +
            '<span class="flex-1 break-words">' + escHtml(m.p1Name) + '</span>' +
            '<span class="text-yellow-300 font-black text-sm shrink-0">' + escHtml(m.p1Points || 0) + ' - ' + escHtml(m.p2Points || 0) + '</span>' +
            '<span class="flex-1 break-words text-right">' + escHtml(m.p2Name) + '</span></div>' +
            '<div class="bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30 text-emerald-300 text-center font-extrabold text-[11px]">🏆 ' + escHtml(m.result) + '</div>' +
            '<div class="flex gap-2 justify-end pt-1">' +
            '<button type="button" data-cm-edit="' + escHtml(id) + '" class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">✏️ এডিট</button>' +
            '<button type="button" data-cm-del="' + escHtml(id) + '" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">🗑️ মুছুন</button></div></div>';
    }
    function renderCompleted() {
        const el = $('recentMatchesList');
        if (!el || !isAdmin) return;
        const all = doneList();
        const si = $('matchSearchInput');
        const q = safeLower(si ? si.value : '');
        const list = q ? all.filter(x => [x.m.title, x.m.matchCode, x.id, x.m.p1Name, x.m.p2Name, x.m.result].some(f => safeLower(f).indexOf(q) >= 0)) : all;
        el.innerHTML = list.length ? list.map(x => cardHtml(x.id, x.m)).join('')
            : '<p class="text-xs text-gray-400 italic col-span-2 text-center py-4">' + (all.length ? 'কোনো মিল পাওয়া যায়নি।' : 'কোনো সমাপ্ত ম্যাচের ফলাফল প্রকাশিত হয়নি।') + '</p>';
        const badge = $('matchesCountBadge');
        if (badge) badge.innerText = q ? 'দেখানো: ' + bn(list.length) + ' / ' + bn(all.length) + ' টি' : 'মোট: ' + bn(all.length) + ' টি';
    }

    // ---------- মডাল (একবারই তৈরি) ----------
    const CLS = 'w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white';
    let built = false, curId = null, resultTouched = false, dateOriginal = '', dateTouched = false;
    const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    const lock = on => { document.documentElement.style.overflow = on ? 'hidden' : ''; };
    const dateParts = {};

    function build() {
        if (built) return;
        built = true;
        const ov = el('div', 'fixed inset-0 bg-black/85 hidden overflow-y-auto p-4');
        ov.id = 'cmModal';
        ov.style.zIndex = '2147483100';
        ov.innerHTML =
            '<div class="bg-slate-900 border border-yellow-500/40 rounded-3xl w-full max-w-lg mx-auto my-6 p-5 space-y-3 shadow-2xl">' +
            '<div class="flex justify-between items-center"><h3 class="text-base font-extrabold text-yellow-400">✏️ সমাপ্ত ম্যাচ এডিট</h3><button type="button" id="cmClose" class="text-gray-400 hover:text-white text-xl font-bold" aria-label="বন্ধ করুন">✕</button></div>' +
            '<p id="cmInfo" class="text-[11px] text-gray-400"></p>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">ম্যাচের নাম / টাইটেল *</label><input id="cmTitle" list="cmTitles" class="' + CLS + '"><datalist id="cmTitles"></datalist></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">তারিখ ও সময়</label><div id="cmDate" class="grid grid-cols-3 gap-2"></div><p id="cmDateNote" class="text-[11px] text-amber-300 mt-1 hidden"></p></div>' +
            '<div class="grid grid-cols-1 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">টিম ১ *</label><select id="cmT1" class="' + CLS + '"></select><input id="cmP1" type="number" min="0" max="29" inputmode="numeric" placeholder="টিম ১ পয়েন্ট (০-২৯)" class="' + CLS + ' mt-2"></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">টিম ২ *</label><select id="cmT2" class="' + CLS + '"></select><input id="cmP2" type="number" min="0" max="29" inputmode="numeric" placeholder="টিম ২ পয়েন্ট (০-২৯)" class="' + CLS + ' mt-2"></div></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">স্ট্যাটাস</label><select id="cmStatus" class="' + CLS + '"><option value="DONE">🏁 সমাপ্ত (বিজয়ী নির্ধারিত)</option><option value="SUSPENDED">⏸️ স্থগিত</option></select></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">ফলাফলের লেখা * <span class="text-gray-500 font-normal">(পয়েন্ট দিলে অটো আসে)</span></label><input id="cmResult" class="' + CLS + ' text-green-400 font-bold"></div>' +
            '<label id="cmLiveWrap" class="hidden flex items-start gap-2 text-xs text-gray-300 bg-slate-950 border border-slate-800 rounded-xl p-3"><input type="checkbox" id="cmLive" class="mt-0.5"><span>লাইভ স্কোর কার্ডেও (ম্যাচ সমাপ্ত ফলাফল) এই পরিবর্তন প্রয়োগ করুন</span></label>' +
            '<p id="cmWarn" class="text-[11px] text-amber-300 hidden"></p>' +
            '<div class="flex gap-2"><button type="button" id="cmSave" class="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-950 font-extrabold py-3 rounded-xl text-sm">💾 সেভ করুন</button><button type="button" id="cmCancel" class="bg-slate-800 text-gray-300 font-bold px-5 py-3 rounded-xl text-sm border border-slate-700">বাতিল</button></div></div>';
        document.body.appendChild(ov);

        const dl = $('cmTitles');
        ORDER.forEach(c => dl.appendChild(opt(defaultTitleFor(c), '')));

        // তারিখ ড্রপডাউন
        const wrap = $('cmDate');
        const mk = (label, items) => { const s = el('select', CLS); s.appendChild(opt('', label)); items.forEach(x => s.appendChild(opt(x[0], x[1]))); wrap.appendChild(s); return s; };
        const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push([String(i), bn(i)]); return r; };
        dateParts.day = mk('দিন', range(1, 31));
        dateParts.mon = mk('মাস', MONTHS.map((m, i) => [String(i), m]));
        dateParts.year = mk('বছর', YEARS.map(y => [String(y), bn(y)]));
        dateParts.hour = mk('ঘণ্টা', range(1, 12));
        dateParts.min = mk('মিনিট', Array.from({ length: 12 }, (_, i) => [pad(i * 5), bn(pad(i * 5))]));
        dateParts.amp = mk('AM/PM', [['AM', 'AM'], ['PM', 'PM']]);
        Object.keys(dateParts).forEach(k => dateParts[k].addEventListener('change', () => { dateTouched = true; $('cmDateNote').classList.add('hidden'); }));

        ['cmP1', 'cmP2', 'cmT1', 'cmT2', 'cmStatus'].forEach(id => $(id).addEventListener('input', regen));
        $('cmStatus').addEventListener('change', regen);
        $('cmT1').addEventListener('change', regen);
        $('cmT2').addEventListener('change', regen);
        $('cmResult').addEventListener('input', () => { resultTouched = true; });
        $('cmClose').addEventListener('click', closeAll);
        $('cmCancel').addEventListener('click', closeAll);
        $('cmSave').addEventListener('click', onSave);
        ov.addEventListener('click', e => { if (e.target === ov) closeAll(); });

        // মুছুন মডাল
        const dv = el('div', 'fixed inset-0 bg-black/85 hidden overflow-y-auto p-4');
        dv.id = 'cmDelModal';
        dv.style.zIndex = '2147483200';
        dv.innerHTML =
            '<div class="bg-slate-900 border border-red-500/50 rounded-3xl w-full max-w-md mx-auto my-10 p-5 space-y-3 shadow-2xl">' +
            '<h3 class="text-base font-extrabold text-red-400">🗑️ ম্যাচ মুছুন</h3>' +
            '<p id="cmDelInfo" class="text-xs text-gray-200 whitespace-pre-line"></p>' +
            '<p id="cmDelWarn" class="text-[11px] text-amber-300 hidden"></p>' +
            '<label id="cmDelLiveWrap" class="hidden flex items-start gap-2 text-xs text-gray-300 bg-slate-950 border border-slate-800 rounded-xl p-3"><input type="checkbox" id="cmDelLive" class="mt-0.5" checked><span>লাইভ স্কোর কার্ড থেকেও এই ফলাফল সরান</span></label>' +
            '<div class="space-y-2"><button type="button" id="cmDelReset" class="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-sm">↩️ শুধু ফলাফল মুছুন (টিম ও তারিখ থাকবে)</button>' +
            '<button type="button" id="cmDelRemove" class="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl text-sm">🗑️ পুরো এন্ট্রি স্থায়ীভাবে মুছুন</button>' +
            '<button type="button" id="cmDelCancel" class="w-full bg-slate-800 text-gray-300 font-bold py-2.5 rounded-xl text-sm border border-slate-700">বাতিল</button></div></div>';
        document.body.appendChild(dv);
        $('cmDelCancel').addEventListener('click', closeAll);
        dv.addEventListener('click', e => { if (e.target === dv) closeAll(); });
        $('cmDelReset').addEventListener('click', () => runDelete('reset'));
        $('cmDelRemove').addEventListener('click', () => runDelete('remove'));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
    }
    function closeAll() {
        ['cmModal', 'cmDelModal'].forEach(id => { const m = $(id); if (m) m.classList.add('hidden'); });
        lock(false);
        curId = null;
    }

    // ---------- তারিখ ----------
    function dateSet(str) {
        dateOriginal = str || ''; dateTouched = false;
        Object.keys(dateParts).forEach(k => { dateParts[k].value = ''; });
        const note = $('cmDateNote');
        note.classList.add('hidden');
        if (!dateOriginal) return;
        const p = (window.__matchForm && window.__matchForm.parseDate) ? window.__matchForm.parseDate(dateOriginal) : {};
        if (p.day) dateParts.day.value = String(p.day);
        if (p.mon !== undefined) dateParts.mon.value = String(p.mon);
        if (p.year) dateParts.year.value = String(p.year);
        if (p.h) { dateParts.hour.value = String(p.h); if (p.mi !== undefined) dateParts.min.value = pad(p.mi); if (p.ap) dateParts.amp.value = p.ap; }
        if (dateCompose() !== dateOriginal) {
            note.textContent = 'ℹ️ বর্তমানে সেভ করা: "' + dateOriginal + '" — ড্রপডাউন না বদলালে এটি হুবহু থাকবে।';
            note.classList.remove('hidden');
        }
    }
    function dateCompose() {
        const d = dateParts.day.value, m = dateParts.mon.value, y = dateParts.year.value, h = dateParts.hour.value;
        if (!(d && m !== '' && y)) return '';
        let s = bn(d) + ' ' + MONTHS[Number(m)] + ', ' + bn(y);
        if (h) s += ' - ' + bn(h) + ':' + bn(dateParts.min.value || '00') + (dateParts.amp.value ? ' ' + dateParts.amp.value : '');
        return s;
    }
    const dateGet = () => (dateTouched ? dateCompose() : dateOriginal);

    // ---------- এডিট ----------
    function teamOptions(sel, current) {
        sel.innerHTML = '';
        sel.appendChild(opt('', '-- টিম সিলেক্ট --'));
        const seen = new Set();
        (globalTeamsData || []).forEach(t => {
            if (!t || !t.data || !t.data.teamName) return;
            seen.add(safeLower(t.data.teamName));
            sel.appendChild(opt(t.data.teamName, '🛡️ ' + t.data.teamName + ' (' + (t.group_name || '') + ')'));
        });
        if (current && !seen.has(safeLower(current))) sel.appendChild(opt(current, current + ' (নিবন্ধিত তালিকার বাইরে)'));
        sel.value = current || '';
    }
    function curVals() {
        const num = id => { const v = String($(id).value).trim(); return v === '' ? NaN : Number(v); };
        return {
            title: safeStr($('cmTitle').value).trim(), date: dateGet(),
            p1: safeStr($('cmT1').value).trim(), p2: safeStr($('cmT2').value).trim(),
            a: num('cmP1'), b: num('cmP2'), status: $('cmStatus').value, result: safeStr($('cmResult').value).trim()
        };
    }
    function regen() {
        if (resultTouched) return;
        const v = curVals();
        const t = autoResult(v.p1, v.p2, v.a, v.b, v.status);
        if (t) $('cmResult').value = t;
    }
    function openEdit(id) {
        if (!isAdmin) return;
        const m = (globalMatchesData || {})[id];
        if (!m) { toast('❌ ম্যাচটি পাওয়া যায়নি', 'err'); return; }
        build();
        curId = id; resultTouched = false;
        $('cmInfo').textContent = 'এন্ট্রি: ' + (isCode(id) ? id + ' (ম্যাচ-কোড)' : 'লাইভ থেকে তৈরি পুরনো এন্ট্রি');
        $('cmTitle').value = m.title || '';
        dateSet(m.date || '');
        teamOptions($('cmT1'), safeStr(m.p1Name).trim());
        teamOptions($('cmT2'), safeStr(m.p2Name).trim());
        $('cmP1').value = m.p1Points === undefined ? '' : String(m.p1Points).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
        $('cmP2').value = m.p2Points === undefined ? '' : String(m.p2Points).replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
        $('cmStatus').value = /স্থগিত/.test(safeStr(m.result)) ? 'SUSPENDED' : 'DONE';
        $('cmResult').value = m.result || '';
        const lw = $('cmLiveWrap'), same = liveSame(id, m);
        lw.classList.toggle('hidden', !same);
        $('cmLive').checked = same;
        const w = downstreamWarning(id);
        $('cmWarn').textContent = w;
        $('cmWarn').classList.toggle('hidden', !w);
        $('cmModal').classList.remove('hidden');
        lock(true);
    }
    async function onSave() {
        const id = curId;
        if (!id || !isAdmin) return;
        const v = curVals();
        const err = validateEdit(id, v);
        if (err) { toast(err, 'err'); return; }
        const upLive = !$('cmLiveWrap').classList.contains('hidden') && $('cmLive').checked;
        await withBusy($('cmSave'), '⏳ সেভ হচ্ছে...', async () => {
            try {
                await saveEdit(id, v, upLive);
                toast('✅ ম্যাচের তথ্য সফলভাবে আপডেট হয়েছে!');
                closeAll();
                await loadData({ force: true });
            } catch (e) { console.error(e); toast('❌ সেভ হয়নি: ' + e.message, 'err'); }
        });
    }

    // ---------- মুছুন ----------
    function openDelete(id) {
        if (!isAdmin) return;
        const m = (globalMatchesData || {})[id];
        if (!m) { toast('❌ ম্যাচটি পাওয়া যায়নি', 'err'); return; }
        build();
        curId = id;
        const code = isCode(id);
        $('cmDelInfo').textContent = (m.title || id) + '\n' + safeStr(m.p1Name) + ' ' + safeStr(m.p1Points) + ' - ' + safeStr(m.p2Points) + ' ' + safeStr(m.p2Name) +
            (code ? '\n\n"শুধু ফলাফল মুছুন" চাপলে ম্যাচ আবার "শুরু হয়নি" অবস্থায় ফিরবে, টিম ও তারিখ থাকবে। "পুরো এন্ট্রি" চাপলে এই ম্যাচের সব তথ্য (টিম, তারিখসহ) মুছে যাবে।'
                : '\n\nএটি লাইভ স্কোর থেকে তৈরি হওয়া এন্ট্রি; মুছলে সমাপ্ত তালিকা থেকে সরে যাবে।');
        $('cmDelReset').classList.toggle('hidden', !code);
        const w = downstreamWarning(id);
        $('cmDelWarn').textContent = w;
        $('cmDelWarn').classList.toggle('hidden', !w);
        const same = liveSame(id, m);
        $('cmDelLiveWrap').classList.toggle('hidden', !same);
        $('cmDelLive').checked = same;
        $('cmDelModal').classList.remove('hidden');
        lock(true);
    }
    async function runDelete(mode) {
        const id = curId;
        if (!id || !isAdmin) return;
        const clearLive = !$('cmDelLiveWrap').classList.contains('hidden') && $('cmDelLive').checked;
        const btn = mode === 'reset' ? $('cmDelReset') : $('cmDelRemove');
        await withBusy(btn, '⏳ হচ্ছে...', async () => {
            try {
                await doDelete(id, mode, clearLive);
                toast(mode === 'reset' ? '↩️ ফলাফল মুছে ম্যাচ আবার "শুরু হয়নি" অবস্থায় ফেরানো হয়েছে' : '🗑️ এন্ট্রি মুছে ফেলা হয়েছে');
                closeAll();
                await loadData({ force: true });
            } catch (e) { console.error(e); toast('❌ ' + (mode === 'reset' ? 'ফলাফল মোছা' : 'মোছা') + ' যায়নি: ' + e.message, 'err'); }
        });
    }

    // ---------- ক্লিক ও রেন্ডার হুক ----------
    const listEl = $('recentMatchesList');
    if (listEl) listEl.addEventListener('click', e => {
        const ed = e.target.closest && e.target.closest('[data-cm-edit]');
        if (ed) { openEdit(ed.getAttribute('data-cm-edit')); return; }
        const de = e.target.closest && e.target.closest('[data-cm-del]');
        if (de) openDelete(de.getAttribute('data-cm-del'));
    });
    const si = $('matchSearchInput');
    if (si) si.addEventListener('input', () => { try { renderCompleted(); } catch (e) {} });

    const _rd4 = window.renderData;
    if (typeof _rd4 === 'function') {
        window.renderData = function () {
            _rd4.apply(this, arguments);
            try { renderCompleted(); } catch (e) { console.error(e); }
        };
    }
    window.__completedAdmin = { validateEdit, autoResult, saveEdit, doDelete, cardHtml, renderCompleted, downstreamWarning, liveSame };
    try { renderCompleted(); } catch (e) {}
})();


/* ===== "সমাপ্ত ম্যাচসমূহ": এডমিনের জন্য সম্পূর্ণ এডিট / আপডেট / মুছুন =====
   • প্রতিটি কার্ডে (শুধু এডমিনের জন্য) ✏️ এডিট ও 🗑️ মুছুন বাটন
   • এডিটে: ম্যাচের নাম, স্ট্যাটাস (সমাপ্ত/স্থগিত), দুই টিম, দুই পয়েন্ট, ফলাফল-ঘোষণা (অটো-লেখা সহ), তারিখ-সময় (ড্রপডাউন)
   • যাচাই: পয়েন্ট ০–২৯, সমাপ্তে ২৯ লাগবে ও সমান নয়, গ্রুপ-নিয়ম, নকআউটে টিম অপরিবর্তনীয়, পরের ধাপে প্রভাব সুরক্ষা
   • মুছুন: গ্রুপ/নকআউট ম্যাচে দুটি পথ — "শুধু ফলাফল মুছুন" (টিম-তারিখ থাকে) বা "সম্পূর্ণ মুছুন"; লাইভ-এন্ট্রি স্থায়ীভাবে মোছা
   • সব পরিবর্তন সরাসরি Supabase-এর teams টেবিলের মূল রো-তে (আগে রো পড়ে নতুন মানের সাথে মিলিয়ে সেভ — অন্য ফিল্ড অক্ষত) */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof GROUPS === 'undefined' || typeof dbDelete !== 'function' || typeof isCompletedMatch !== 'function' || typeof getWinnerSide !== 'function') return;
    const list = $('recentMatchesList');
    if (!list) return;

    const MF = window.__matchForm || null;
    const KO_CODES = ['QF-1', 'QF-2', 'QF-3', 'QF-4', 'SF-1', 'SF-2', '3P-Match', 'FINAL'];
    const CODES = [].concat.apply([], GROUPS.map(g => g.matches)).concat(KO_CODES);
    const DEP = { 'QF-1': ['SF-1'], 'QF-2': ['SF-1'], 'QF-3': ['SF-2'], 'QF-4': ['SF-2'], 'SF-1': ['3P-Match', 'FINAL'], 'SF-2': ['3P-Match', 'FINAL'] };
    const MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const UNPLAYED = 'ম্যাচ এখনও শুরু হয় নাই।';
    const CLS = 'w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white';
    const isCode = k => CODES.indexOf(k) >= 0;
    const pad = n => (n < 10 ? '0' : '') + n;
    const gm = () => globalMatchesData || {};

    function regTeams() {
        const a = [];
        (globalTeamsData || []).forEach(t => { if (t && t.data && t.data.teamName) a.push({ n: t.data.teamName, g: t.group_name }); });
        return a;
    }
    const regSet = () => new Set(regTeams().map(t => safeLower(t.n)));

    // ---------- কার্ড তালিকা (হিরো-ভিউয়ের তালিকার মতোই, সাথে এডমিন বাটন) ----------
    function sortedDone() {
        const done = [];
        Object.keys(gm()).forEach((k, i) => { const m = gm()[k]; if (m && isCompletedMatch(m)) done.push({ k: k, m: m, i: i }); });
        done.sort((a, b) => ((b.m.ts || 0) - (a.m.ts || 0)) || (b.i - a.i));
        return done;
    }
    function cardHtml(k, m) {
        const tag = isCode(k)
            ? '<span class="text-[10px] font-bold bg-slate-800 text-yellow-300 border border-slate-700 px-2 py-0.5 rounded-full">' + escHtml(k) + '</span>'
            : '<span class="text-[10px] font-bold bg-slate-800 text-gray-400 border border-slate-700 px-2 py-0.5 rounded-full">লাইভ এন্ট্রি</span>';
        return '<div class="card-lift bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-2 hover:border-emerald-500/40 shadow-lg" data-key="' + escHtml(k) + '">' +
            '<div class="flex justify-between gap-2 text-yellow-400 font-extrabold border-b border-slate-800 pb-1.5"><span>' + escHtml(m.title || m.matchCode || k) + '</span>' +
            '<span class="text-gray-400 text-[10px] font-normal text-right">📅 ' + escHtml(m.date || '') + '</span></div>' +
            '<div class="flex justify-between items-center gap-2 text-white font-bold py-1"><span class="flex-1 break-words">' + escHtml(m.p1Name) + '</span>' +
            '<span class="text-yellow-300 font-black text-sm shrink-0">' + escHtml(m.p1Points || 0) + ' - ' + escHtml(m.p2Points || 0) + '</span>' +
            '<span class="flex-1 break-words text-right">' + escHtml(m.p2Name) + '</span></div>' +
            '<div class="bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30 text-emerald-300 text-center font-extrabold text-[11px]">🏆 ' + escHtml(m.result) + '</div>' +
            '<div class="flex items-center justify-between gap-2 pt-1">' + tag +
            '<div class="flex gap-2">' +
            '<button type="button" data-fmact="edit" data-key="' + escHtml(k) + '" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">✏️ এডিট</button>' +
            '<button type="button" data-fmact="del" data-key="' + escHtml(k) + '" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">🗑️ মুছুন</button>' +
            '</div></div></div>';
    }
    function renderFinished() {
        if (!isAdmin) return;
        const q = safeLower(($('matchSearchInput') || {}).value || '');
        const done = sortedDone();
        const rows = q ? done.filter(x => [x.m.title, x.m.matchCode, x.m.p1Name, x.m.p2Name, x.m.result].some(f => safeLower(f).indexOf(q) >= 0)) : done;
        list.innerHTML = rows.length
            ? '<span data-fmmark hidden></span>' + rows.map(x => cardHtml(x.k, x.m)).join('')
            : '<p data-fmmark class="text-xs text-gray-400 italic col-span-2 text-center py-4">' + (done.length ? 'কোনো মিল পাওয়া যায়নি।' : 'কোনো সম্প্রতি সমাপ্ত ম্যাচের ফলাফল প্রকাশিত হয়নি।') + '</p>';
        const badge = $('matchesCountBadge');
        if (badge) badge.innerText = q ? 'দেখানো: ' + bn(rows.length) + ' / ' + bn(done.length) + ' টি' : 'মোট: ' + bn(done.length) + ' টি';
    }
    // অন্য স্ক্রিপ্ট তালিকা নতুন করে আঁকলে (এডমিন বাটন ছাড়া) আমাদেরটি আবার বসানো
    new MutationObserver(() => {
        if (isAdmin && !list.querySelector('[data-fmmark]')) renderFinished();
    }).observe(list, { childList: true });
    list.addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-fmact]');
        if (!b || !isAdmin) return;
        if (b.dataset.fmact === 'edit') openEdit(b.dataset.key); else openDelete(b.dataset.key);
    });

    // ---------- Supabase সহায়ক (মূল রো পড়ে, মিলিয়ে সেভ) ----------
    async function fetchRow(id) {
        const res = await fetch(REST + '/teams?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: dbHeaders() });
        if (!res.ok) throw new Error('রো পড়া যায়নি (' + res.status + ')');
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) throw new Error('রো পাওয়া যায়নি (আগেই মোছা হয়ে থাকতে পারে)');
        return rows[0];
    }
    async function rawUpsert(id, group, data) {
        const res = await fetch(REST + '/teams', {
            method: 'POST',
            headers: dbHeaders({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
            body: JSON.stringify({ id: id, group_name: group, data: data })
        });
        if (!res.ok) { let t = ''; try { t = await res.text(); } catch (e) {} throw new Error(t || ('HTTP ' + res.status)); }
    }

    // ---------- মোডাল ----------
    let overlay = null;
    function closeModal() { if (overlay) { overlay.remove(); overlay = null; } }
    function openModal(inner) {
        closeModal();
        overlay = document.createElement('div');
        overlay.style.zIndex = '70';
        overlay.className = 'fixed inset-0 bg-black/80 flex items-start md:items-center justify-center p-3 overflow-y-auto';
        overlay.innerHTML = '<div class="bg-slate-900 border border-yellow-500/40 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl my-6">' + inner + '</div>';
        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.body.appendChild(overlay);
        return overlay;
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ---------- তারিখ-সময় ড্রপডাউন ----------
    function datePicker(initial) {
        const wrap = document.createElement('div');
        let current = safeStr(initial).trim();
        if (!MF || !MF.parseDate) {
            const i = document.createElement('input');
            i.type = 'text'; i.className = CLS; i.value = current;
            wrap.appendChild(i);
            return { el: wrap, get: () => i.value.trim() };
        }
        const mk = (first, opts) => {
            const s = document.createElement('select');
            s.className = CLS;
            const o0 = document.createElement('option'); o0.value = ''; o0.textContent = first; s.appendChild(o0);
            opts.forEach(x => { const o = document.createElement('option'); o.value = x[0]; o.textContent = x[1]; s.appendChild(o); });
            return s;
        };
        const rng = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push([String(i), bn(i)]); return r; };
        const day = mk('দিন', rng(1, 31)), mon = mk('মাস', MONTHS.map((m, i) => [String(i), m]));
        const year = mk('বছর', [2026, 2027, 2028].map(y => [String(y), bn(y)])), hour = mk('ঘণ্টা', rng(1, 12));
        const min = mk('মিনিট', Array.from({ length: 12 }, (_, i) => [pad(i * 5), bn(pad(i * 5))])), amp = mk('AM/PM', [['AM', 'AM'], ['PM', 'PM']]);
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-3 gap-2';
        [day, mon, year, hour, min, amp].forEach(s => grid.appendChild(s));
        const note = document.createElement('p');
        note.className = 'text-[11px] text-amber-300 mt-1 hidden';
        wrap.appendChild(grid); wrap.appendChild(note);
        const compose = () => {
            if (!(day.value && mon.value !== '' && year.value)) return '';
            let s = bn(day.value) + ' ' + MONTHS[Number(mon.value)] + ', ' + bn(year.value);
            if (hour.value) s += ' - ' + bn(hour.value) + ':' + bn(min.value || '00') + (amp.value ? ' ' + amp.value : '');
            return s;
        };
        if (current) {
            const p = MF.parseDate(current);
            if (p.day) day.value = String(p.day);
            if (p.mon !== undefined) mon.value = String(p.mon);
            if (p.year) year.value = String(p.year);
            if (p.h) { hour.value = String(p.h); if (p.mi !== undefined) min.value = pad(p.mi); if (p.ap) amp.value = p.ap; }
            if (compose() !== current) {
                note.textContent = 'ℹ️ বর্তমানে সেভ করা: "' + current + '" — ড্রপডাউন না বদলালে এটিই থাকবে।';
                note.classList.remove('hidden');
            }
        }
        [day, mon, year, hour, min, amp].forEach(s => s.addEventListener('change', () => { current = compose(); note.classList.add('hidden'); }));
        return { el: wrap, get: () => current };
    }

    // ---------- যাচাই ----------
    const wname = o => { const s = getWinnerSide(o); return s === 1 ? o.p1Name : s === 2 ? o.p2Name : ''; };
    const anyDone = codes => (codes || []).filter(c => { const m = gm()[c]; return m && isCompletedMatch(m); });

    function groupRule(key, a, b) {
        const g = GROUPS.find(x => x.matches.indexOf(key) >= 0);
        if (!g) return '';
        const gTeams = ((getGroups()[g.name]) || []).map(t => safeLower(t.teamName));
        if (gTeams.indexOf(a) < 0 || gTeams.indexOf(b) < 0) return '⛔ ' + g.name + '-এর ম্যাচে শুধু ' + g.name + '-এর টিম দেওয়া যাবে।';
        let ca = 0, cb = 0;
        for (const c of g.matches) {
            if (c === key) continue;
            const m = gm()[c];
            if (!m) continue;
            const x = safeLower(m.p1Name), y = safeLower(m.p2Name);
            if ((x === a && y === b) || (x === b && y === a)) return '⛔ এই দুই টিমের ম্যাচ (' + c + ') আগেই আছে। গ্রুপে প্রতি জোড়া একবারই খেলবে।';
            if (x === a || y === a) ca++;
            if (x === b || y === b) cb++;
        }
        if (ca >= 2 || cb >= 2) return '⛔ একটি টিম গ্রুপ পর্বে সর্বোচ্চ ২টি ম্যাচ খেলবে।';
        return '';
    }
    function validateEdit(key, orig, d) {
        if (!d.title) return '⛔ ম্যাচের নাম দিন।';
        if (!d.p1Name || !d.p2Name) return '⛔ দুটি টিমই সিলেক্ট করুন।';
        const a = safeLower(d.p1Name), b = safeLower(d.p2Name);
        if (a === b) return '⛔ একই টিম নিজের বিরুদ্ধে খেলতে পারে না!';
        const reg = regSet();
        if ((!reg.has(a) && a !== safeLower(orig.p1Name)) || (!reg.has(b) && b !== safeLower(orig.p2Name))) return '⛔ শুধু নিবন্ধিত টিম দেওয়া যাবে।';
        if (!/^\d+$/.test(String(d.a)) || !/^\d+$/.test(String(d.b))) return '⛔ দুই টিমের পয়েন্ট পূর্ণসংখ্যায় দিন।';
        const pa = Number(d.a), pb = Number(d.b);
        if (pa < 0 || pb < 0 || pa > WINNING_SCORE || pb > WINNING_SCORE) return '⛔ পয়েন্ট ০ থেকে ' + bn(WINNING_SCORE) + '-এর মধ্যে হতে হবে।';
        if (d.status === 'FINISHED') {
            if (Math.max(pa, pb) !== WINNING_SCORE) return '⛔ "সমাপ্ত" ম্যাচে যেকোনো একটি টিমের পয়েন্ট ' + bn(WINNING_SCORE) + ' হতে হবে।';
            if (pa === pb) return '⛔ সমাপ্ত ম্যাচে দুই টিমের পয়েন্ট সমান হতে পারে না।';
            if (!/বিজয়ী|জয়ী/.test(d.result)) return '⛔ ফলাফলের লেখায় "বিজয়ী" থাকতে হবে।';
        } else if (!/স্থগিত/.test(d.result)) return '⛔ স্থগিত ম্যাচের ফলাফলে "স্থগিত" থাকতে হবে।';
        if (!d.result) return '⛔ ফলাফল/বিজয়ী ঘোষণা লিখুন।';
        if (!isCompletedMatch({ result: d.result })) return '⛔ এই ফলাফল-লেখা "সমাপ্ত ম্যাচ" হিসেবে ধরা হবে না (যেমন "শুরু হয় নাই/সেটআপ" শব্দ থাকলে)।';
        if (isCode(key)) {
            if (KO_CODES.indexOf(key) >= 0) {
                if (a !== safeLower(orig.p1Name) || b !== safeLower(orig.p2Name)) return '⛔ নকআউট ম্যাচের টিম এখান থেকে বদলানো যাবে না (টিম অটো-নির্ধারিত)।';
            } else {
                const e = groupRule(key, a, b);
                if (e) return e;
            }
        }
        return '';
    }

    // ---------- এডিট ----------
    function openEdit(key) {
        const m = gm()[key];
        if (!m) { toast('❌ ম্যাচটি পাওয়া যায়নি, রিফ্রেশ করে দেখুন।', 'err'); return; }
        const koLocked = KO_CODES.indexOf(key) >= 0;
        const orig = { p1Name: safeStr(m.p1Name), p2Name: safeStr(m.p2Name), title: safeStr(m.title), result: safeStr(m.result) };
        const ov = openModal(
            '<div class="flex justify-between items-center gap-2"><h3 class="text-base font-extrabold text-yellow-400">✏️ সমাপ্ত ম্যাচ এডিট</h3>' +
            '<span class="text-[10px] font-bold bg-slate-800 text-yellow-300 border border-slate-700 px-2 py-0.5 rounded-full">' + escHtml(isCode(key) ? key : 'লাইভ এন্ট্রি') + '</span></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">ম্যাচের নাম / টাইটেল *</label><select id="fmTitle" class="' + CLS + '"></select>' +
            '<input type="text" id="fmTitleCustom" placeholder="নিজের মতো নাম লিখুন" class="' + CLS + ' mt-2 hidden"></div>' +
            '<div><label class="text-xs text-yellow-400 font-bold block mb-1">স্ট্যাটাস *</label><select id="fmStatus" class="' + CLS + '"><option value="FINISHED">🏁 সমাপ্ত (বিজয়ী ঘোষণা)</option><option value="SUSPENDED">⏸️ স্থগিত</option></select></div>' +
            '<div class="grid grid-cols-1 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">' +
            '<div><label class="text-xs text-gray-400 block mb-1">টিম ১ *</label><select id="fmT1" class="' + CLS + '"></select></div>' +
            '<div><label class="text-xs text-gray-400 block mb-1">টিম ১ পয়েন্ট *</label><input type="number" id="fmP1" min="0" max="29" class="' + CLS + '"></div>' +
            '<div><label class="text-xs text-gray-400 block mb-1">টিম ২ *</label><select id="fmT2" class="' + CLS + '"></select></div>' +
            '<div><label class="text-xs text-gray-400 block mb-1">টিম ২ পয়েন্ট *</label><input type="number" id="fmP2" min="0" max="29" class="' + CLS + '"></div>' +
            (koLocked ? '<p class="text-[11px] text-amber-300">🔒 নকআউট ম্যাচের টিম অটো-নির্ধারিত, তাই বদলানো যাবে না (পয়েন্ট/ফলাফল বদলানো যাবে)।</p>' : '') +
            '</div>' +
            '<div><div class="flex justify-between items-center mb-1"><label class="text-xs text-gray-400">ফলাফল / বিজয়ী ঘোষণা *</label><button type="button" id="fmAuto" class="text-[11px] bg-slate-800 text-yellow-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold">↻ অটো লিখুন</button></div>' +
            '<input type="text" id="fmResult" class="' + CLS + ' text-green-400 font-bold"></div>' +
            '<div><label class="text-xs text-gray-400 block mb-1">তারিখ ও সময়</label><div id="fmDateBox"></div></div>' +
            '<div class="flex gap-2 pt-1"><button type="button" id="fmSave" class="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-950 font-extrabold py-3 rounded-xl text-sm">💾 আপডেট সেভ করুন</button>' +
            '<button type="button" id="fmCancel" class="bg-slate-800 text-gray-300 font-bold px-4 py-3 rounded-xl text-sm border border-slate-700">বাতিল</button></div>'
        );
        const q = id => ov.querySelector('#' + id);

        // শিরোনাম: ২০টি ম্যাচের নাম + বর্তমান (পুরনো হলেও) + নিজের মতো
        const titles = CODES.map(c => defaultTitleFor(c));
        let th = '';
        titles.forEach(t => { th += '<option value="' + escHtml(t) + '">' + escHtml(t) + '</option>'; });
        if (orig.title && titles.indexOf(orig.title) < 0) th = '<option value="' + escHtml(orig.title) + '">' + escHtml(orig.title) + ' (বর্তমান)</option>' + th;
        th += '<option value="__custom__">✏️ অন্য নাম লিখুন...</option>';
        q('fmTitle').innerHTML = th;
        q('fmTitle').value = orig.title || titles[0];
        q('fmTitle').addEventListener('change', () => q('fmTitleCustom').classList.toggle('hidden', q('fmTitle').value !== '__custom__'));

        // টিম
        const teamOpts = sel => {
            let h = '<option value="">-- টিম সিলেক্ট --</option>';
            regTeams().forEach(t => { h += '<option value="' + escHtml(t.n) + '">🛡️ ' + escHtml(t.n) + ' (' + escHtml(t.g || '') + ')</option>'; });
            if (sel && !regTeams().some(t => safeLower(t.n) === safeLower(sel))) h += '<option value="' + escHtml(sel) + '">⚠️ ' + escHtml(sel) + ' (নিবন্ধিত নয়)</option>';
            return h;
        };
        q('fmT1').innerHTML = teamOpts(orig.p1Name); q('fmT1').value = orig.p1Name;
        q('fmT2').innerHTML = teamOpts(orig.p2Name); q('fmT2').value = orig.p2Name;
        if (koLocked) { q('fmT1').disabled = true; q('fmT2').disabled = true; }
        q('fmP1').value = safeStr(m.p1Points).replace(/[^\d]/g, '') || '0';
        q('fmP2').value = safeStr(m.p2Points).replace(/[^\d]/g, '') || '0';
        q('fmStatus').value = /স্থগিত/.test(orig.result) ? 'SUSPENDED' : 'FINISHED';
        q('fmResult').value = orig.result;

        const dp = datePicker(safeStr(m.date));
        q('fmDateBox').appendChild(dp.el);

        // ফলাফল-লেখা অটো
        const auto = () => {
            const n1 = q('fmT1').value, n2 = q('fmT2').value, a = q('fmP1').value, b = q('fmP2').value;
            if (q('fmStatus').value === 'SUSPENDED') return 'ম্যাচ স্থগিত (' + a + '-' + b + ' পয়েন্টে স্থগিত)';
            if (!n1 || !n2 || a === '' || b === '' || Number(a) === Number(b)) return '';
            return Number(a) > Number(b) ? n1 + ' বিজয়ী (' + a + '-' + b + ' পয়েন্টে জয়ী)' : n2 + ' বিজয়ী (' + b + '-' + a + ' পয়েন্টে জয়ী)';
        };
        let manual = (q('fmResult').value !== auto());
        ['fmT1', 'fmT2', 'fmP1', 'fmP2', 'fmStatus'].forEach(id => {
            q(id).addEventListener('input', () => { if (!manual) q('fmResult').value = auto(); });
            q(id).addEventListener('change', () => { if (!manual) q('fmResult').value = auto(); });
        });
        q('fmResult').addEventListener('input', () => { manual = true; });
        q('fmAuto').addEventListener('click', () => { manual = false; q('fmResult').value = auto(); });
        q('fmCancel').addEventListener('click', closeModal);

        q('fmSave').addEventListener('click', async () => {
            const tv = q('fmTitle').value;
            const d = {
                title: (tv === '__custom__' ? q('fmTitleCustom').value : tv).trim(),
                status: q('fmStatus').value,
                p1Name: q('fmT1').value.trim(), p2Name: q('fmT2').value.trim(),
                a: q('fmP1').value.trim(), b: q('fmP2').value.trim(),
                result: q('fmResult').value.trim(), date: dp.get()
            };
            const err = validateEdit(key, orig, d);
            if (err) { toast(err, 'err'); return; }

            // পরের ধাপে প্রভাব
            const newObj = { p1Name: d.p1Name, p2Name: d.p2Name, p1Points: d.a, p2Points: d.b, result: d.result };
            const before = gm()[key] || {};
            const changedWinner = wname(before) !== wname(newObj);
            const changedPoints = Number(before.p1Points) !== Number(d.a) || Number(before.p2Points) !== Number(d.b);
            if (KO_CODES.indexOf(key) >= 0 && changedWinner) {
                const blocked = anyDone(DEP[key]);
                if (blocked.length) { toast('⛔ বিজয়ী বদলালে পরের ধাপের ফলাফল (' + blocked.join(', ') + ') অসঙ্গত হয়ে যাবে। আগে সেগুলো মুছে/ঠিক করুন।', 'err'); return; }
            }
            if (GROUP_OR_ANY(key) && (changedWinner || changedPoints) && anyDone(KO_CODES).length &&
                !confirm('নকআউটের কিছু ফলাফল (' + anyDone(KO_CODES).join(', ') + ') আগেই সেভ আছে। এই ফলাফল বদলালে গ্রুপের র‍্যাংকিং ও নকআউটের টিম-নির্ধারণে প্রভাব পড়তে পারে।\n\nতবুও সেভ করবেন?')) return;

            await withBusy(q('fmSave'), '⏳ সেভ হচ্ছে...', async () => {
                try {
                    const row = await fetchRow(key);
                    const old = row.data || {};
                    const data = Object.assign({}, old, {
                        title: d.title, date: d.date, p1Name: d.p1Name, p2Name: d.p2Name,
                        p1Points: String(Number(d.a)), p2Points: String(Number(d.b)),
                        result: d.result, id: key, matchCode: old.matchCode || key, ts: old.ts || Date.now()
                    });
                    await rawUpsert(key, row.group_name, data);
                    toast('✅ ম্যাচের তথ্য আপডেট হয়েছে!');
                    closeModal();
                    await loadData({ force: true });
                } catch (e2) { console.error(e2); toast('❌ আপডেট হয়নি: ' + e2.message, 'err'); }
            });
        });
    }
    const GROUP_OR_ANY = key => GROUPS.some(g => g.matches.indexOf(key) >= 0);

    // ---------- মুছুন ----------
    function openDelete(key) {
        const m = gm()[key];
        if (!m) { toast('❌ ম্যাচটি পাওয়া যায়নি, রিফ্রেশ করে দেখুন।', 'err'); return; }
        const code = isCode(key);
        const blocked = KO_CODES.indexOf(key) >= 0 ? anyDone(DEP[key]) : [];
        const warnKO = GROUP_OR_ANY(key) && anyDone(KO_CODES).length;
        const summary = escHtml(m.title || key) + ' — ' + escHtml(m.p1Name) + ' ' + escHtml(m.p1Points) + ' : ' + escHtml(m.p2Points) + ' ' + escHtml(m.p2Name);
        const ov = openModal(
            '<h3 class="text-base font-extrabold text-red-400">🗑️ ম্যাচ মুছবেন?</h3>' +
            '<p class="text-xs text-gray-300 bg-slate-950 border border-slate-800 rounded-xl p-3">' + summary + '</p>' +
            (blocked.length ? '<p class="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-xl p-3">⛔ এই ম্যাচের ওপর নির্ভর করা পরের ধাপের ফলাফল (' + escHtml(blocked.join(', ')) + ') আগে থেকেই আছে। আগে সেগুলো মুছুন, তারপর এটি।</p>' : '') +
            (warnKO ? '<p class="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 rounded-xl p-3">⚠️ নকআউটের কিছু ফলাফল আগেই সেভ আছে। এই ম্যাচ বদলালে টিম-নির্ধারণে প্রভাব পড়তে পারে।</p>' : '') +
            (code
                ? '<button type="button" id="fmDelResult" class="w-full text-left bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 rounded-xl text-xs border border-slate-700">↩️ শুধু ফলাফল মুছুন<br><span class="font-normal text-gray-400">ম্যাচ আবার "শুরু হয়নি" অবস্থায় যাবে; টিম, নাম ও তারিখ থাকবে। সমাপ্ত তালিকা থেকে সরে যাবে।</span></button>' +
                  '<button type="button" id="fmDelAll" class="w-full text-left bg-red-950/70 hover:bg-red-900 text-red-200 font-bold p-3 rounded-xl text-xs border border-red-500/40">🗑️ সম্পূর্ণ মুছুন<br><span class="font-normal text-red-300/80">টিম, তারিখ, ফলাফল সব মুছে যাবে (ফিকশ্চার আবার নতুন করে সেট করতে হবে)।</span></button>'
                : '<button type="button" id="fmDelAll" class="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold py-3 rounded-xl text-sm">🗑️ স্থায়ীভাবে মুছুন</button>') +
            '<button type="button" id="fmCancel" class="w-full bg-slate-800 text-gray-300 font-bold py-3 rounded-xl text-sm border border-slate-700">বাতিল</button>'
        );
        const q = id => ov.querySelector('#' + id);
        q('fmCancel').addEventListener('click', closeModal);
        if (blocked.length) {
            ['fmDelResult', 'fmDelAll'].forEach(id => { const b = q(id); if (b) { b.disabled = true; b.style.opacity = '.45'; } });
            return;
        }
        const rr = q('fmDelResult');
        if (rr) rr.addEventListener('click', () => withBusy(rr, '⏳ হচ্ছে...', async () => {
            try {
                const row = await fetchRow(key);
                const old = row.data || {};
                await rawUpsert(key, row.group_name, Object.assign({}, old, { p1Points: '0', p2Points: '0', result: UNPLAYED }));
                toast('↩️ ফলাফল মোছা হয়েছে, ম্যাচ আবার অসমাপ্ত অবস্থায়।');
                closeModal();
                await loadData({ force: true });
            } catch (e) { console.error(e); toast('❌ ব্যর্থ: ' + e.message, 'err'); }
        }));
        const da = q('fmDelAll');
        if (da) da.addEventListener('click', () => {
            if (!confirm('এটি স্থায়ী। সত্যিই "' + (m.title || key) + '" সম্পূর্ণ মুছবেন?')) return;
            withBusy(da, '⏳ মোছা হচ্ছে...', async () => {
                try {
                    await dbDelete(key);
                    toast('🗑️ ম্যাচ মুছে ফেলা হয়েছে।');
                    closeModal();
                    await loadData({ force: true });
                } catch (e) { console.error(e); toast('❌ মোছা যায়নি: ' + e.message, 'err'); }
            });
        });
    }

    window.__finishedAdmin = { validateEdit: validateEdit, cardHtml: cardHtml, sortedDone: sortedDone };
    if (isAdmin) renderFinished();
})();
