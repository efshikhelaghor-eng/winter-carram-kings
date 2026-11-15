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
