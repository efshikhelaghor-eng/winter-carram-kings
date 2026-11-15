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
