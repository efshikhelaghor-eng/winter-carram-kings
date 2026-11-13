const AUTH = SUPABASE_URL + '/auth/v1';
const IDLE_LIMIT = 15 * 60 * 1000;          // ১৫ মিনিট নিষ্ক্রিয় থাকলে অটো লগআউট
const AUTH_KEYS = ['carrom_admin_session', 'carrom_token', 'carrom_refresh', 'carrom_token_exp', 'carrom_last_active'];
const LS = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} },
    del: k => { try { localStorage.removeItem(k); } catch (e) {} }
};

// লগইন করা থাকলে ইউজার টোকেন, নাহলে সাধারণ anon key
function dbHeaders(extra) {
    const token = (isAdmin && LS.get('carrom_token')) || SUPABASE_ANON_KEY;
    return Object.assign({ 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, extra || {});
}

function saveAuthSession(d) {
    LS.set('carrom_token', d.access_token);
    if (d.refresh_token) LS.set('carrom_refresh', d.refresh_token);
    LS.set('carrom_token_exp', Date.now() + (Number(d.expires_in) || 3600) * 1000);
    LS.set('carrom_last_active', Date.now());
    LS.set('carrom_admin_session', 'true');
}

function forceLogout(msg) {
    isAdmin = false;
    AUTH_KEYS.forEach(LS.del);
    applyPublicUIState();
    switchTab('home');
    renderData();
    if (msg) toast(msg, 'info');
}

async function refreshAuthSession() {
    const rt = LS.get('carrom_refresh');
    if (!rt) return false;
    try {
        const res = await fetch(AUTH + '/token?grant_type=refresh_token', {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rt })
        });
        if (!res.ok) return false;
        const d = await res.json();
        const last = LS.get('carrom_last_active');
        saveAuthSession(d);
        if (last) LS.set('carrom_last_active', last); // রিফ্রেশ মানে অ্যাক্টিভিটি নয়
        return true;
    } catch (e) { return false; }
}

// পেজ লোডে: টোকেন আছে এবং ১৫ মিনিটের বেশি নিষ্ক্রিয় না থাকলেই এডমিন
function checkAdminSession() {
    const ok = LS.get('carrom_admin_session') === 'true' && !!LS.get('carrom_token');
    const last = Number(LS.get('carrom_last_active')) || 0;
    if (ok && Date.now() - last <= IDLE_LIMIT) { isAdmin = true; applyAdminUIState(); }
    else { isAdmin = false; AUTH_KEYS.forEach(LS.del); applyPublicUIState(); }
}

async function handleLogin() {
    const email = safeStr(document.getElementById('loginEmail').value).trim();
    const pass = document.getElementById('loginPass').value;
    const errElem = document.getElementById('loginError');
    const btn = document.getElementById('loginSubmitBtn');
    if (!email || !pass) { errElem.innerText = 'ইমেইল ও পাসওয়ার্ড দিন!'; errElem.classList.remove('hidden'); return; }
    if (btn) { btn.disabled = true; btn.innerText = '⏳ যাচাই হচ্ছে...'; }
    try {
        const res = await fetch(AUTH + '/token?grant_type=password', {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        });
        if (!res.ok) throw new Error('bad');
        saveAuthSession(await res.json());
        isAdmin = true;
        applyAdminUIState();
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('loginPass').value = '';
        errElem.classList.add('hidden');
        await loadData({ force: true });
        populateTeamDropdowns(); populatePlayerDropdowns(); populateStreamForm();
        switchTab('dashboard');
    } catch (e) {
        errElem.innerText = 'ভুল ইমেইল বা পাসওয়ার্ড!';
        errElem.classList.remove('hidden');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'লগইন করুন'; }
    }
}

function toggleAdminModal() {
    if (isAdmin) { forceLogout('✅ লগআউট হয়েছে'); return; }
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginModal').classList.toggle('hidden');
}

// ---------- পাসওয়ার্ড ভুলে গেলে (ইমেইলে রিসেট লিংক) ----------
async function forgotPassword() {
    const email = safeStr(document.getElementById('loginEmail').value).trim();
    if (!email) { toast('আগে ইমেইল ঘরে আপনার এডমিন ইমেইল লিখুন', 'err'); return; }
    try {
        const redirect = encodeURIComponent(location.origin + location.pathname);
        const res = await fetch(AUTH + '/recover?redirect_to=' + redirect, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        if (!res.ok) throw new Error('fail');
        toast('📧 পাসওয়ার্ড রিসেট লিংক ইমেইলে পাঠানো হয়েছে (স্প্যামও দেখুন)', 'ok');
    } catch (e) { toast('❌ ইমেইল পাঠানো যায়নি, কিছুক্ষণ পর আবার চেষ্টা করুন', 'err'); }
}

// ইমেইলের রিসেট লিংকে ক্লিক করে ফিরে এলে অটো লগইন + পাসওয়ার্ড ফর্মে নিয়ে যাওয়া
function handleRecoveryHash() {
    if (!location.hash.includes('type=recovery')) return;
    const p = new URLSearchParams(location.hash.slice(1));
    const at = p.get('access_token');
    if (!at) return;
    saveAuthSession({ access_token: at, refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') });
    history.replaceState(null, '', location.pathname + location.search);
    isAdmin = true;
    applyAdminUIState();
    switchTab('dashboard');
    toast('🔐 এখন নিচের ফর্মে নতুন পাসওয়ার্ড সেট করুন', 'info');
    const card = document.getElementById('pwChangeCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- পাসওয়ার্ড পরিবর্তন (ইমেইল কনফার্মেশন কোডসহ) ----------
let _codeCooldownTimer = null;

function pwValidate() {
    const np = document.getElementById('pwNew').value;
    const cp = document.getElementById('pwConfirm').value;
    if (np.length < 8) { toast('⛔ পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'err'); return null; }
    if (np !== cp) { toast('⛔ দুটি পাসওয়ার্ড মিলছে না', 'err'); return null; }
    return np;
}

// ধাপ ১: এডমিনের ইমেইলে কনফার্মেশন কোড পাঠানো
async function sendPasswordCode() {
    if (!isAdmin) return;
    if (!pwValidate()) return;
    const btn = document.getElementById('pwSendCodeBtn');
    await withBusy(btn, '⏳ কোড পাঠানো হচ্ছে...', async () => {
        try {
            await refreshAuthSession();
            const res = await fetch(AUTH + '/reauthenticate', { method: 'GET', headers: dbHeaders() });
            if (!res.ok) {
                let m = ''; try { m = (await res.json()).msg || ''; } catch (x) {}
                throw new Error(m || ('HTTP ' + res.status));
            }
            document.getElementById('pwCodeWrap').classList.remove('hidden');
            document.getElementById('pwCode').value = '';
            document.getElementById('pwCode').focus();
            toast('📧 ৬ সংখ্যার কনফার্মেশন কোড এডমিন ইমেইলে পাঠানো হয়েছে (স্প্যামও দেখুন)', 'ok');
            startCodeCooldown();
        } catch (err) { toast('❌ কোড পাঠানো যায়নি: ' + err.message, 'err'); }
    });
    if (_codeCooldownTimer) btn.disabled = true; // withBusy শেষে আবার চালু করে, তাই কুলডাউনে বন্ধ রাখা
}

function startCodeCooldown() {
    const btn = document.getElementById('pwSendCodeBtn');
    let left = 60;
    clearInterval(_codeCooldownTimer);
    btn.disabled = true;
    _codeCooldownTimer = setInterval(() => {
        left--;
        if (left <= 0) {
            clearInterval(_codeCooldownTimer); _codeCooldownTimer = null;
            btn.disabled = false; btn.innerText = '🔁 আবার কোড পাঠান';
        } else {
            btn.innerText = '⏳ আবার পাঠাতে ' + left + ' সেকেন্ড';
        }
    }, 1000);
    btn.innerText = '⏳ আবার পাঠাতে ' + left + ' সেকেন্ড';
}

// ধাপ ২: কোডসহ নতুন পাসওয়ার্ড সেভ
async function changeAdminPassword(e) {
    e.preventDefault();
    if (!isAdmin) return;
    const np = pwValidate();
    if (!np) return;
    const code = safeStr(document.getElementById('pwCode').value).trim();
    if (!code) { toast('⛔ আগে ইমেইলে কোড পাঠান এবং কোডটি লিখুন', 'err'); return; }
    const btn = document.getElementById('pwSaveBtn');
    await withBusy(btn, '⏳ সেভ হচ্ছে...', async () => {
        try {
            await refreshAuthSession();
            const res = await fetch(AUTH + '/user', { method: 'PUT', headers: dbHeaders(), body: JSON.stringify({ password: np, nonce: code }) });
            if (!res.ok) {
                let m = ''; try { m = (await res.json()).msg || ''; } catch (x) {}
                throw new Error(m || ('HTTP ' + res.status));
            }
            document.getElementById('pwNew').value = '';
            document.getElementById('pwConfirm').value = '';
            document.getElementById('pwCode').value = '';
            forceLogout('✅ পাসওয়ার্ড বদলেছে। নতুন পাসওয়ার্ড দিয়ে আবার লগইন করুন');
        } catch (err) { toast('❌ পাসওয়ার্ড বদলানো যায়নি (কোড ভুল বা মেয়াদোত্তীর্ণ হতে পারে): ' + err.message, 'err'); }
    });
}

// ---------- UI ইনজেক্ট + মোবাইল Enter ফিক্স ----------
document.addEventListener('DOMContentLoaded', () => {
    // ১) পুরনো Enter→লগইন লিসেনার মুছতে ঘর দুটি ক্লোন করে বদলানো
    ['loginEmail', 'loginPass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.replaceWith(el.cloneNode(true));
    });
    document.getElementById('loginEmail').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('loginPass').focus(); }
    });
    document.getElementById('loginPass').addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        // ডেস্কটপে Enter = লগইন, টাচ ডিভাইসে শুধু কিবোর্ড বন্ধ
        if (window.matchMedia('(pointer: coarse)').matches) e.target.blur(); else handleLogin();
    });

    // ২) লগইন বাটনে id দেওয়া + "পাসওয়ার্ড ভুলে গেছেন?" লিংক
    const loginBtn = document.querySelector('#loginModal button[onclick="handleLogin()"]');
    if (loginBtn) {
        loginBtn.id = 'loginSubmitBtn';
        loginBtn.insertAdjacentHTML('afterend',
            '<button type="button" onclick="forgotPassword()" class="w-full text-xs text-yellow-400 hover:text-yellow-300 font-bold pt-1">🔑 পাসওয়ার্ড ভুলে গেছেন?</button>');
    }

    // ৩) এডমিন প্যানেলের শুরুতে পাসওয়ার্ড পরিবর্তন কার্ড
    const dash = document.getElementById('tabDashboard');
    if (dash) dash.insertAdjacentHTML('afterbegin', `
        <div id="pwChangeCard" class="bg-slate-900 p-6 rounded-3xl border border-emerald-500/40 space-y-4 shadow-xl">
            <h3 class="text-base font-bold text-emerald-400 border-b border-slate-800 pb-3">🔐 এডমিন পাসওয়ার্ড পরিবর্তন</h3>
            <form onsubmit="changeAdminPassword(event)" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="password" id="pwNew" autocomplete="new-password" minlength="8" required placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white">
                <input type="password" id="pwConfirm" autocomplete="new-password" minlength="8" required placeholder="নতুন পাসওয়ার্ড আবার লিখুন" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-sm text-white">
                <button type="button" id="pwSendCodeBtn" onclick="sendPasswordCode()" class="md:col-span-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 rounded-xl text-sm transition shadow-lg">📧 এডমিন ইমেইলে কনফার্মেশন কোড পাঠান</button>
                <div id="pwCodeWrap" class="md:col-span-2 space-y-3 hidden">
                    <input type="text" id="pwCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="ইমেইলে পাওয়া কোডটি লিখুন" class="w-full bg-slate-950 border border-yellow-500/50 rounded-xl p-2.5 text-sm text-yellow-300 font-bold tracking-widest text-center">
                    <button type="submit" id="pwSaveBtn" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 rounded-xl text-sm transition shadow-lg">💾 পাসওয়ার্ড পরিবর্তন করুন</button>
                </div>
            </form>
            <p class="text-[11px] text-gray-400">📧 পাসওয়ার্ড বদলাতে এডমিনের ইমেইলে পাঠানো কোড লাগবে। শুধু প্যানেলে লগইন থাকলেই পাসওয়ার্ড বদলানো যাবে না।</p>
            <p class="text-[11px] text-gray-400">⏱️ ১৫ মিনিট নিষ্ক্রিয় থাকলে এডমিন অটো লগআউট হবে।</p>
        </div>`);

    handleRecoveryHash();
});

// ---------- অটো লগআউট ----------
let _lastTouch = 0;
function touchActivity() {
    if (!isAdmin) return;
    const now = Date.now();
    if (now - _lastTouch < 5000) return; // প্রতি ৫ সেকেন্ডে একবার লিখবে
    _lastTouch = now;
    LS.set('carrom_last_active', now);
}
['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(ev =>
    document.addEventListener(ev, touchActivity, { passive: true }));

setInterval(async () => {
    if (!isAdmin) return;
    const last = Number(LS.get('carrom_last_active')) || 0;
    if (Date.now() - last > IDLE_LIMIT) { forceLogout('⏱️ ১৫ মিনিট নিষ্ক্রিয় থাকায় অটো লগআউট হয়েছে'); return; }
    // টোকেন মেয়াদ (ডিফল্ট ১ ঘণ্টা) শেষের আগেই রিফ্রেশ
    const exp = Number(LS.get('carrom_token_exp')) || 0;
    if (exp - Date.now() < 5 * 60 * 1000) {
        const ok = await refreshAuthSession();
        if (!ok) forceLogout('⏱️ সেশনের মেয়াদ শেষ, আবার লগইন করুন');
    }
}, 30000);

// অন্য ট্যাবে লগআউট হলে এই ট্যাবেও লগআউট
window.addEventListener('storage', e => {
    if (e.key === 'carrom_admin_session' && e.newValue !== 'true' && isAdmin) forceLogout();
});

// আলাদা ফাইল হিসেবে লোড হলে: পুরনো সেশন চেক নতুন নিয়মে আবার চালানো
checkAdminSession();
