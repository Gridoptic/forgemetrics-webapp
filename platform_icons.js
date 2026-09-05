(function () {
    'use strict';
    var T = function (s) { return (typeof window.t === 'function') ? window.t(s) : s; };
    window.FM_PLATFORMS = {
        telegram: { n: 'Telegram', c: 'tg', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#2AABEE"/><path d="M6.6 11.6l9.6-3.7c.45-.17.84.1.7.78l-1.63 7.7c-.12.55-.45.68-.9.42l-2.5-1.84-1.2 1.16c-.13.13-.25.25-.5.25l.18-2.55 4.63-4.18c.2-.18-.05-.28-.31-.1l-5.72 3.6-2.47-.77c-.54-.17-.55-.54.11-.8z" fill="#fff"/></svg>' },
        vk: { n: T('VK Клипы'), c: 'vk', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="#0077FF"/><path d="M6.5 8h2.1c.2 2.4 1.1 4.3 2.4 4.9V8h2v3.1c1.2-.3 2.2-1.7 2.6-3.1h2c-.4 1.9-1.5 3.3-2.6 3.9 1.3.6 2.6 2 3 4.1h-2.2c-.4-1.6-1.5-2.9-2.8-3.2V16h-.3C9.5 16 6.8 12.7 6.5 8z" fill="#fff"/></svg>' },
        dzen: { n: T('Дзен'), c: 'dz', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 2c.2 5.5 4.3 9.6 9.8 9.8v.4c-5.5.2-9.6 4.3-9.8 9.8h-.4c-.2-5.5-4.3-9.6-9.8-9.8v-.4C7.3 11.6 11.4 7.5 11.6 2z" fill="#0a0d18"/></svg>' },
        shorts: { n: 'YouTube Shorts', c: 'yt', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000"/><path d="M10 9l6 3-6 3z" fill="#fff"/></svg>' },
        tiktok: { n: 'TikTok', c: 'tt', svg: '<svg viewBox="0 0 24 24"><path d="M16 3c.4 2.3 1.9 3.8 4 4v3c-1.6 0-3-.5-4-1.3V15a5.5 5.5 0 1 1-5.5-5.5c.3 0 .7 0 1 .1v3.1a2.5 2.5 0 1 0 1.5 2.3V3z" fill="#25F4EE"/><path d="M17 4c.4 2.3 1.9 3.8 4 4v2c-1.6 0-3-.5-4-1.3z" fill="#FE2C55"/></svg>' },
        reels: { n: 'Instagram Reels', c: 'ig', svg: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="#E1306C" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.4" fill="#E1306C"/></svg>' }
    };
    window.fmPlatIcon = function (key) {
        var p = window.FM_PLATFORMS[key];
        if (!p) return '<div class="pl-sic dz"></div>';
        return '<div class="pl-sic ' + p.c + '">' + p.svg + '</div>';
    };
})();
