/* Локализация ForgeMetrics.
   База — русский (строки в коде как есть). t(s) возвращает перевод для текущего языка,
   а если перевода нет — исходную русскую строку (graceful fallback, ничего не ломается).
   Язык: ручной выбор (localStorage) > язык Telegram (initData) > русский. */
(function () {
    var SUPPORTED = ['ru', 'en', 'es', 'de', 'uk', 'kk', 'uz', 'be', 'az'];
    var NAMES = {
        ru: 'Русский', en: 'English', es: 'Español', de: 'Deutsch',
        uk: 'Українська', kk: 'Қазақша', uz: 'Oʻzbekcha', be: 'Беларуская', az: 'Azərbaycan'
    };
    // флаги-эмодзи для переключателя (нейтрально: язык, не политика — берём распространённые)
    var FLAGS = { ru: '🇷🇺', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', uk: '🇺🇦', kk: '🇰🇿', uz: '🇺🇿', be: '🇧🇾', az: '🇦🇿' };

    function detect() {
        try {
            var saved = localStorage.getItem('fm_lang');
            if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
        } catch (e) {}
        try {
            var tg = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
            var code = (tg && tg.language_code ? String(tg.language_code) : '').slice(0, 2).toLowerCase();
            if (SUPPORTED.indexOf(code) >= 0) return code;
        } catch (e) {}
        return 'ru';
    }

    var LANG = detect();
    // словари переводов подмешиваются в window.__I18N_DICT позже (i18n_dict.js)
    var DICT = window.__I18N_DICT || {};

    window.I18N = { supported: SUPPORTED, names: NAMES, flags: FLAGS };
    window.getLang = function () { return LANG; };
    window.setLang = function (l) {
        if (SUPPORTED.indexOf(l) < 0 || l === LANG) return false;
        LANG = l;
        try { localStorage.setItem('fm_lang', l); } catch (e) {}
        return true;
    };
    window.t = function (s) {
        if (LANG === 'ru' || s == null) return s;
        var d = (window.__I18N_DICT || DICT)[LANG];
        return (d && d[s] != null && d[s] !== '') ? d[s] : s;
    };
})();
