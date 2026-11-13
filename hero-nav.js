(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const home = $('tabHome');
    const main = document.querySelector('main');
    if (!home || !main || typeof window.switchTab !== 'function' || typeof window.renderData !== 'function') return;

    const _st = window.switchTab;
    const _rd = window.renderData;

    const KINDS = [
        { k: 'groups',  ic: '🏆', t: 'মোট গ্রুপ',          stat: 'statGroups' },
        { k: 'teams',   ic: '🛡️', t: 'নিবন্ধিত টিম',       stat: 'statTeams' },
        { k: 'players', ic: '👥', t: 'নিবন্ধিত খেলোয়াড়', stat: 'statPlayers' },
        { k: 'matches', ic: '🏁', t: 'সমাপ্ত ম্যাচ',       stat: 'statMatches' }
    ];
    const paneId = k => 'pane' + k.charAt(0).toUpperCase() + k.slice(1);

    let currentKind = null;
    let heroPushed = false;
    let skipPop = false;
    let teamSearch = '', teamGroup = '', matchSearch = '';

    // ---------- ভিউ কাঠামো ----------
    const view = document.createElement('div');
    view.id = 'tabHeroView';
    view.className = 'space-y-6 hidden';
    view.innerHTML = `
        <div class="bg-slate-900 p-3 rounded-2xl border border-yellow-500/30 shadow-lg space-y-3">
            <button type="button" id="heroBackBtn" class="bg-slate-800 hover:bg-slate-700 text-yellow-400 text-xs px-4 py-2 rounded-xl font-bold border border-slate-700 transition">← হোমে ফিরুন</button>
            <div id="heroPills" class="flex gap-2 overflow-x-auto no-scrollbar pb-1"></div>
        </div>
        <div id="paneGroups" class="space-y-4 hidden"></div>
        <div id="paneTeams" class="hidden"></div>
        <div id="panePlayers" class="hidden"></div>
        <div id="paneMatches" class="hidden"></div>`;
    home.insertAdjacentElement('afterend', view);

    // ---------- ১) গ্রুপ: হোমপেইজ থেকে সরানো (হেডার লেখাগুলো বাদ) ----------
    const gSel = $('groupsSelectionView'), gDet = $('singleGroupDetailView');
    if (gSel) {
        const hdr = gSel.previousElementSibling;
        if (hdr && hdr.textContent.includes('টুর্নামেন্টের গ্রুপসমূহ')) hdr.remove();
        $('paneGroups').append(gSel);
        if (gDet) $('paneGroups').append(gDet);
    }

    // ---------- ২) টিম: নতুন ভিউ ----------
    $('paneTeams').innerHTML = `
        <div class="bg-slate-900 p-6 rounded-3xl border border-yellow-500/40 shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                <h2 class="text-lg font-extrabold text-yellow-400">🛡️ নিবন্ধিত টিমসমূহ</h2>
                <span id="teamsCountBadge" class="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-yellow-300 font-extrabold border border-slate-700">মোট: ০ টি</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="search" id="teamSearchInput" placeholder="🔍 টিম বা খেলোয়াড়ের নাম দিয়ে খুঁজুন..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500">
                <select id="teamGroupFilter" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-yellow-300 font-bold">
                    <option value="">সকল গ্রুপ</option>
                    <option value="গ্রুপ এ">গ্রুপ এ</option>
                    <option value="গ্রুপ বি">গ্রুপ বি</option>
                    <option value="গ্রুপ সি">গ্রুপ সি</option>
                    <option value="গ্রুপ ডি">গ্রুপ ডি</option>
                </select>
            </div>
            <div id="teamsListBox" class="space-y-5"></div>
        </div>`;

    // ---------- ৩) খেলোয়াড়: উপরের বার থেকে পুরো সেকশন স্থানান্তর ----------
    const tg = $('tabGroups');
    if (tg && tg.firstElementChild) $('panePlayers').append(tg.firstElementChild);
    const navPlayers = $('navGroups');
    if (navPlayers) navPlayers.remove();

    // ---------- ৪) সমাপ্ত ম্যাচ: ড্যাশবোর্ড থেকে সরানো; ড্যাশবোর্ডে শুধু আগামী ম্যাচ ----------
    const rec = $('dashContentRecent'), up = $('dashContentUpcoming');
    const toggleBtn = $('dashBtnRecent');
    if (toggleBtn && toggleBtn.parentElement) toggleBtn.parentElement.remove();
    if (up) {
        up.classList.remove('hidden');
        const box = up.parentElement;
        if (box) box.querySelectorAll('p').forEach(p => {
            if (p.textContent.includes('সাম্প্রতিক ফলাফল ও আগামী সময়সূচী')) p.textContent = 'আগামী ম্যাচের সময়সূচী';
        });
    }
    $('paneMatches').innerHTML = `
        <div class="bg-slate-900 p-6 rounded-3xl border border-yellow-500/40 shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                <h2 class="text-lg font-extrabold text-yellow-400">🏁 সমাপ্ত ম্যাচসমূহ</h2>
                <span id="matchesCountBadge" class="text-xs bg-slate-800 px-3 py-1.5 rounded-full text-yellow-300 font-extrabold border border-slate-700">মোট: ০ টি</span>
            </div>
            <input type="search" id="matchSearchInput" placeholder="🔍 টিম, ম্যাচের নাম বা ফলাফল দিয়ে খুঁজুন..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-500">
            <div id="matchesHost"></div>
        </div>`;
    if (rec) { rec.classList.remove('hidden'); $('matchesHost').append(rec); }

    // ---------- রেন্ডার ----------
    function renderTeamsPane() {
        const box = $('teamsListBox');
        if (!box) return;
        const groups = getGroups();
        const order = GROUPS.map(g => g.name).concat(Object.keys(groups).filter(n => !GROUPS.some(g => g.name === n)));
        const q = safeLower(teamSearch);
        let total = 0, shown = 0, html = '';
        order.forEach(gName => {
            const list = groups[gName] || [];
            total += list.length;
            if (teamGroup && teamGroup !== gName) return;
            list.forEach((t, i) => {
                if (q) {
                    const hay = [t.teamName, t.player1Name, t.player2Name].some(f => safeLower(f).includes(q));
                    if (!hay) return;
                }
                shown++;
                const adminBtns = isAdmin ? `
                    <div class="flex gap-2 justify-end border-t border-slate-800 pt-3">
                        <button data-id="${escHtml(t.db_id)}" onclick="editTeamSetup(this.dataset.id)" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow">✏️ এডিট টিম</button>
                        <button data-id="${escHtml(t.db_id)}" onclick="deleteTeamSetup(this.dataset.id)" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow">🗑️ টিম মুছুন</button>
                    </div>` : '';
                html += `
                    <div class="bg-slate-950/60 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                        <div class="flex justify-between items-center border-b border-slate-800 pb-3 gap-3">
                            <div class="flex items-center gap-3.5 min-w-0">
                                ${teamLogoHtml(t, 'lg')}
                                <div class="min-w-0">
                                    <h5 class="font-extrabold text-yellow-400 text-base md:text-lg break-words">🛡️ ${escHtml(t.teamName || 'N/A')}</h5>
                                    <span class="text-[11px] text-gray-400">${escHtml(gName)} | দ্বৈত টিম</span>
                                </div>
                            </div>
                            <span class="bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold shrink-0">${escHtml(gName)} • #${bn(i + 1)}</span>
                        </div>
                        ${teamBioInner(t, 'lg')}
                        ${adminBtns}
                    </div>`;
            });
        });
        if (!shown) html = `<p class="text-xs text-gray-400 italic text-center py-6">${total ? 'কোনো মিল পাওয়া যায়নি।' : 'এখনো কোনো টিম নিবন্ধিত হয়নি।'}</p>`;
        box.innerHTML = html;
        const badge = $('teamsCountBadge');
        if (badge) badge.innerText = (teamSearch || teamGroup) ? `দেখানো: ${bn(shown)} / ${bn(total)} টি` : `মোট: ${bn(total)} টি`;
    }

    function renderMatchesPane() {
        const el = $('recentMatchesList');
        if (!el) return;
        const done = [];
        Object.keys(globalMatchesData || {}).forEach((k, i) => {
            const m = globalMatchesData[k];
            if (m && isCompletedMatch(m)) done.push({ m: m, i: i });
        });
        done.sort((a, b) => ((b.m.ts || 0) - (a.m.ts || 0)) || (b.i - a.i));
        const q = safeLower(matchSearch);
        const list = q ? done.filter(({ m }) => [m.title, m.matchCode, m.p1Name, m.p2Name, m.result].some(f => safeLower(f).includes(q))) : done;
        if (!list.length) {
            el.innerHTML = `<p class="text-xs text-gray-400 italic col-span-2 text-center py-4">${done.length ? 'কোনো মিল পাওয়া যায়নি।' : 'কোনো সম্প্রতি সমাপ্ত ম্যাচের ফলাফল প্রকাশিত হয়নি।'}</p>`;
        } else {
            el.innerHTML = list.map(({ m }) => `
                <div class="card-lift bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-2 hover:border-emerald-500/40 shadow-lg">
                    <div class="flex justify-between gap-2 text-yellow-400 font-extrabold border-b border-slate-800 pb-1.5">
                        <span>${escHtml(m.title || m.matchCode)}</span>
                        <span class="text-gray-400 text-[10px] font-normal text-right">📅 ${escHtml(m.date || '')}</span>
                    </div>
                    <div class="flex justify-between items-center gap-2 text-white font-bold py-1">
                        <span class="flex-1 break-words">${escHtml(m.p1Name)}</span>
                        <span class="text-yellow-300 font-black text-sm shrink-0">${escHtml(m.p1Points || 0)} - ${escHtml(m.p2Points || 0)}</span>
                        <span class="flex-1 break-words text-right">${escHtml(m.p2Name)}</span>
                    </div>
                    <div class="bg-emerald-950/60 p-2 rounded-xl border border-emerald-500/30 text-emerald-300 text-center font-extrabold text-[11px]">🏆 ${escHtml(m.result)}</div>
                </div>`).join('');
        }
        const badge = $('matchesCountBadge');
        if (badge) badge.innerText = q ? `দেখানো: ${bn(list.length)} / ${bn(done.length)} টি` : `মোট: ${bn(done.length)} টি`;
    }

    const PILL_ON = 'shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-950 shadow-lg shadow-yellow-500/20';
    const PILL_OFF = 'shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap bg-slate-800 text-gray-300 hover:bg-slate-700';
    function updatePills() {
        const box = $('heroPills');
        if (!box) return;
        box.innerHTML = KINDS.map(o => {
            const n = ($(o.stat) || {}).innerText || '';
            return `<button type="button" data-hero="${o.k}" class="${o.k === currentKind ? PILL_ON : PILL_OFF}">${o.ic} ${o.t} <span class="font-black">${n}</span></button>`;
        }).join('');
    }

    // ---------- খোলা / বন্ধ ----------
    function isOpen() { return !view.classList.contains('hidden'); }

    function openHero(kind) {
        const wasOpen = isOpen();
        currentKind = kind;
        if (kind === 'groups' && typeof backToGroupsList === 'function') backToGroupsList();
        if (!wasOpen) {
            _st('home');
            home.classList.add('hidden');
            view.classList.remove('hidden');
            view.classList.remove('reveal'); void view.offsetWidth; view.classList.add('reveal');
        }
        KINDS.forEach(o => $(paneId(o.k)).classList.toggle('hidden', o.k !== kind));
        renderTeamsPane(); renderMatchesPane(); updatePills();
        if (!heroPushed) { history.pushState({ hero: 1 }, ''); heroPushed = true; }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function popClose() { // ব্যাক বাটন / ← হোমে ফিরুন
        heroPushed = false;
        if (!isOpen()) return;
        view.classList.add('hidden');
        currentKind = null;
        _st('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('popstate', () => {
        if (skipPop) { skipPop = false; return; }
        popClose();
    });

    // অন্য ট্যাবে গেলে হিরো ভিউ বন্ধ
    window.switchTab = function (tab) {
        if (tab === 'groups') { openHero('players'); return; } // পুরনো switchTab('groups') কল
        if (isOpen()) {
            view.classList.add('hidden');
            currentKind = null;
            if (heroPushed) { heroPushed = false; skipPop = true; history.back(); }
        }
        _st(tab);
    };

    window.renderData = function () {
        _rd.apply(this, arguments);
        try { renderTeamsPane(); renderMatchesPane(); updatePills(); } catch (e) { console.error(e); }
    };

    // ---------- ইভেন্ট ----------
    $('heroBackBtn').addEventListener('click', () => { if (heroPushed) history.back(); else popClose(); });
    $('heroPills').addEventListener('click', e => {
        const b = e.target.closest && e.target.closest('[data-hero]');
        if (b) openHero(b.dataset.hero);
    });
    $('teamSearchInput').addEventListener('input', e => { teamSearch = e.target.value.trim(); renderTeamsPane(); });
    $('teamGroupFilter').addEventListener('change', e => { teamGroup = e.target.value; renderTeamsPane(); });
    $('matchSearchInput').addEventListener('input', e => { matchSearch = e.target.value.trim(); renderMatchesPane(); });

    // ---------- হিরো কার্ডগুলো ক্লিকযোগ্য ----------
    KINDS.forEach(o => {
        const s = $(o.stat);
        const card = s && s.closest('.stat-card');
        if (!card) return;
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.classList.add('cursor-pointer', 'card-lift', 'hover:border-yellow-400');
        card.insertAdjacentHTML('beforeend', '<div class="text-[10px] text-yellow-400/80 font-bold mt-1.5">বিস্তারিত দেখুন →</div>');
        card.addEventListener('click', () => openHero(o.k));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHero(o.k); } });
    });

    renderTeamsPane(); renderMatchesPane(); updatePills();
})();
