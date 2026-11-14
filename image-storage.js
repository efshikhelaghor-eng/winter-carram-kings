(function () {
    'use strict';
    const BUCKET = 'carrom-images';
    if (typeof SUPABASE_URL === 'undefined' || typeof dbUpsert !== 'function') return;

    const STORAGE = SUPABASE_URL + '/storage/v1/object';
    const publicUrl = path => STORAGE + '/public/' + BUCKET + '/' + path;
    const isData = u => /^data:image\//i.test(String(u || ''));
    const isUrl = u => /^https?:\/\//i.test(String(u || ''));

    function extFor(type) { return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'; }
    function newPath(type) { return 'img/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + extFor(type); }

    // blob → Storage; সফল হলে পাবলিক URL ফেরত দেয়, নাহলে এরর ছোড়ে
    async function uploadBlob(blob) {
        const type = blob.type || 'image/jpeg';
        const path = newPath(type);
        const h = dbHeaders();
        h['Content-Type'] = type;
        h['x-upsert'] = 'false';
        h['cache-control'] = 'max-age=31536000';
        const res = await fetch(STORAGE + '/' + BUCKET + '/' + path, { method: 'POST', headers: h, body: blob });
        if (!res.ok) {
            let t = ''; try { t = await res.text(); } catch (e) {}
            throw new Error('আপলোড ব্যর্থ (' + res.status + ') ' + t.slice(0, 120));
        }
        return publicUrl(path);
    }

    async function urlWorks(url) {
        try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch (e) { return false; }
    }

    // ---------- ১) নতুন ছবি আপলোড (পুরনো ফাংশনটির জায়গায়) ----------
    const _oldCompress = window.compressImageToBase64;

    function compressToBlob(file) {
        return new Promise(resolve => {
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    const maxW = 600; // Storage-এ থাকায় একটু বেশি স্পষ্ট ছবি রাখা যায়
                    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    canvas.toBlob(b => resolve(b), 'image/jpeg', 0.78);
                };
                img.onerror = () => resolve(null);
                img.src = ev.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    window.compressImageToBase64 = async function (file) {
        if (!file) return '';
        try {
            const blob = await compressToBlob(file);
            if (!blob) throw new Error('ছবি পড়া যায়নি');
            const url = await uploadBlob(blob);
            return url; // ডাটাবেজে এই লিংকই সেভ হবে
        } catch (err) {
            console.error('Storage upload failed, falling back to inline image:', err);
            if (typeof toast === 'function') toast('⚠️ ছবি Storage-এ যায়নি, সাময়িকভাবে সরাসরি সেভ হচ্ছে', 'info');
            return typeof _oldCompress === 'function' ? _oldCompress(file) : '';
        }
    };

    // ---------- ২) পুরনো ছবি মাইগ্রেশন ----------
    function pendingList() {
        const out = [];
        (globalPlayersData || []).forEach(p => {
            if (p && isData(p.imageUrl || p.image_url)) out.push({ kind: 'player', id: p.db_id, label: p.name || p.db_id });
        });
        (globalTeamsData || []).forEach(t => {
            if (t && t.data && isData(t.data.teamImageUrl)) out.push({ kind: 'team', id: t.id, label: t.data.teamName || t.id });
        });
        return out;
    }

    async function fetchRow(id) {
        const res = await fetch(REST + '/teams?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: dbHeaders() });
        if (!res.ok) throw new Error('রো পড়া যায়নি (' + res.status + ')');
        const rows = await res.json();
        if (!Array.isArray(rows) || !rows.length) throw new Error('রো পাওয়া যায়নি');
        return rows[0];
    }

    async function migrateOne(item) {
        const row = await fetchRow(item.id);
        const data = Object.assign({}, row.data || {});
        const field = item.kind === 'team' ? 'teamImageUrl'
            : (isData(data.imageUrl) ? 'imageUrl' : (isData(data.image_url) ? 'image_url' : ''));
        if (!field || !isData(data[field])) return 'skip'; // ইতিমধ্যে লিংক বা ছবি নেই
        const blob = await (await fetch(data[field])).blob();
        if (!blob || !blob.size) throw new Error('ছবির ডাটা খালি');
        const url = await uploadBlob(blob);
        if (!(await urlWorks(url))) throw new Error('আপলোড করা লিংক খুলছে না');
        data[field] = url;
        await dbUpsert(row.id, row.group_name, data); // বাকি সব ফিল্ড অপরিবর্তিত
        return 'ok';
    }

    let running = false;
    async function runMigration() {
        if (!isAdmin || running) return;
        const list = pendingList();
        if (!list.length) { toast('✅ মাইগ্রেট করার মতো কোনো পুরনো ছবি নেই', 'ok'); refreshCard(); return; }
        if (!confirm('মোট ' + list.length + 'টি ছবি Storage-এ সরানো হবে।\nআগে Supabase থেকে teams টেবিলের ব্যাকআপ (CSV) নিয়েছেন তো?\n\nশুরু করবেন?')) return;
        running = true;
        const btn = document.getElementById('imgMigBtn');
        const log = document.getElementById('imgMigLog');
        if (btn) btn.disabled = true;
        let ok = 0, fail = 0, skip = 0;
        if (log) log.innerHTML = '';
        for (let i = 0; i < list.length; i++) {
            const it = list[i];
            if (btn) btn.innerText = '⏳ ' + (i + 1) + '/' + list.length + ' চলছে...';
            try {
                const r = await migrateOne(it);
                if (r === 'ok') ok++; else skip++;
                if (log) log.insertAdjacentHTML('beforeend', '<p class="text-emerald-400">✅ ' + escHtml(it.label) + '</p>');
            } catch (err) {
                fail++;
                console.error(err);
                if (log) log.insertAdjacentHTML('beforeend', '<p class="text-red-400">❌ ' + escHtml(it.label) + ': ' + escHtml(err.message) + '</p>');
            }
        }
        running = false;
        if (btn) btn.disabled = false;
        toast('মাইগ্রেশন শেষ: ✅ ' + ok + ' সফল' + (fail ? ' • ❌ ' + fail + ' ব্যর্থ' : '') + (skip ? ' • ⏭️ ' + skip + ' বাদ' : ''), fail ? 'err' : 'ok');
        await loadData({ force: true });
        refreshCard();
    }

    function refreshCard() {
        const btn = document.getElementById('imgMigBtn');
        const info = document.getElementById('imgMigInfo');
        if (!btn || running) return;
        const n = pendingList().length;
        if (info) info.textContent = n ? 'পুরনো পদ্ধতিতে (ডাটাবেজের ভেতরে) আছে: ' + n + 'টি ছবি' : '✅ সব ছবি Storage-এ আছে';
        btn.innerText = n ? '🚀 ' + n + 'টি ছবি Storage-এ সরান' : '✅ কিছু সরানোর নেই';
        btn.disabled = !n;
    }

    function inject() {
        const dash = document.getElementById('tabDashboard');
        if (!dash || document.getElementById('imgMigCard')) return;
        dash.insertAdjacentHTML('afterbegin', `
        <div id="imgMigCard" class="bg-slate-900 p-6 rounded-3xl border border-cyan-500/40 space-y-3 shadow-xl">
            <h3 class="text-base font-bold text-cyan-400 border-b border-slate-800 pb-3">🖼️ ছবি মাইগ্রেশন (ডাটাবেজ → Storage)</h3>
            <p id="imgMigInfo" class="text-xs text-gray-300"></p>
            <p class="text-[11px] text-gray-400">প্রতিটি ছবি আগে আপলোড ও যাচাই হয়, তারপর লিংক সেভ হয়। কোনো ডাটা মোছা হয় না। ব্যর্থ হলে সেই ছবি আগের মতোই থাকে, আবার চেষ্টা করা যাবে।</p>
            <button type="button" id="imgMigBtn" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold py-3 rounded-xl text-sm transition shadow-lg disabled:opacity-50">🚀 ছবি Storage-এ সরান</button>
            <div id="imgMigLog" class="text-[11px] space-y-0.5 max-h-40 overflow-y-auto"></div>
        </div>`);
        document.getElementById('imgMigBtn').addEventListener('click', runMigration);
        refreshCard();
    }

    // ডাটা লোড বা এডমিন স্টেট বদলালে কার্ড হালনাগাদ
    const _rd = window.renderData;
    if (typeof _rd === 'function') {
        window.renderData = function () {
            _rd.apply(this, arguments);
            try { inject(); refreshCard(); } catch (e) {}
        };
    }
    inject();
})();
