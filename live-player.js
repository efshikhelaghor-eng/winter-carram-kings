(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    if (typeof window.renderLiveStreamWidget !== 'function') return;
    const box = $('liveStreamWidgetContainer');
    if (!box) return;

    // স্টাইল (এই ফাইল একাই স্বয়ংসম্পূর্ণ)
    const st = document.createElement('style');
    st.textContent =
        '.yt-facade{position:absolute;inset:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;border:0;padding:0;cursor:pointer;overflow:hidden}' +
        '.yt-facade img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.88}' +
        '.yt-play{position:relative;width:68px;height:48px;border-radius:14px;background:#ef4444;color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,.6)}' +
        '.yt-facade:active .yt-play{transform:scale(.94)}' +
        '.yt-hint{position:absolute;left:0;right:0;bottom:10px;text-align:center;font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 6px #000}';
    document.head.appendChild(st);

    // ১) স্কোর ভিডিওর উপরে (শুধু DOM ক্রম বদলায়; আইডি/রেন্ডার একই)
    const score = $('liveMatchContent');
    if (score && box.parentElement === score.parentElement && box.nextElementSibling === score) {
        box.parentElement.insertBefore(score, box);
    }

    // ২) প্লেয়ারকে থাম্বনেইল + প্লে বাটনে বদলানো
    function makeFacade() {
        const ifr = box.querySelector('iframe');
        if (!ifr) return;
        const src = ifr.getAttribute('src') || '';
        const m = /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\/([\w-]{6,20})/i.exec(src);
        if (!m) return;
        const wrap = ifr.parentElement;
        const allow = ifr.getAttribute('allow') || '';
        wrap.textContent = '';

        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'yt-facade';
        b.setAttribute('aria-label', 'ভিডিও চালান');

        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.src = 'https://i.ytimg.com/vi/' + m[3] + '/hqdefault.jpg';
        img.onerror = () => img.remove();

        const play = document.createElement('span');
        play.className = 'yt-play';
        play.textContent = '▶';
        const hint = document.createElement('span');
        hint.className = 'yt-hint';
        hint.textContent = 'ভিডিও দেখতে ট্যাপ করুন';
        b.append(img, play, hint);

        b.addEventListener('click', () => {
            const f = document.createElement('iframe');
            f.src = src; // মূল URL-এ autoplay=1 আছে; ট্যাপের পর শব্দসহ চলবে
            f.title = 'YouTube Live Stream';
            f.className = 'w-full h-full border-0';
            f.setAttribute('allow', allow);
            f.setAttribute('allowfullscreen', '');
            wrap.textContent = '';
            wrap.appendChild(f);
        });
        wrap.appendChild(b);
    }

    // ৩) স্ট্রিম সেটিং না বদলালে আবার আঁকা হবে না (চলমান ভিডিও রিলোড হবে না)
    const _rls = window.renderLiveStreamWidget;
    let lastSig = null;
    window.renderLiveStreamWidget = function () {
        let sig = '';
        try { sig = JSON.stringify(globalStreamConfig || {}); } catch (e) {}
        if (sig === lastSig && box.dataset.rendered === '1') return;
        _rls.apply(this, arguments);
        lastSig = sig;
        box.dataset.rendered = '1';
        try { makeFacade(); } catch (e) { console.error(e); }
    };

    window.renderLiveStreamWidget(); // এখনকার ডাটা দিয়ে একবার প্রয়োগ
})();
