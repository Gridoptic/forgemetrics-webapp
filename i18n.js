/* Локализация ForgeMetrics.
   База — русский (строки в коде как есть). t(s) возвращает перевод для текущего языка,
   а если перевода нет — исходную русскую строку (graceful fallback, ничего не ломается).
   Язык: ручной выбор (localStorage) > язык Telegram (initData) > русский. */
(function () {
    // 'uk' временно отключён (удалён из списка) — не показывается в переключателе и не
    // автоопределяется. Переводы украинского сохранены в git-истории; вернуть = добавить
    // 'uk' сюда, в NAMES/FLAGS и восстановить блок "uk" в i18n_dict.js.
    var SUPPORTED = ['ru', 'en', 'es', 'de', 'kk', 'uz', 'be', 'az'];
    var NAMES = {
        ru: 'Русский', en: 'English', es: 'Español', de: 'Deutsch',
        kk: 'Қазақша', uz: 'Oʻzbekcha', be: 'Беларуская', az: 'Azərbaycan'
    };
    // флаги-эмодзи для переключателя (нейтрально: язык, не политика — берём распространённые)
    var FLAGS = { ru: '🇷🇺', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', kk: '🇰🇿', uz: '🇺🇿', be: '🇧🇾', az: '🇦🇿' };

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

    // Шаблоны строк с подстановкой значений (числа, имена, цены). Локализатор берёт целый
    // текстовый узел; для таких строк точного ключа нет, поэтому сопоставляем по регулярке и
    // подставляем захваченные значения в переведённый шаблон. Ключ перевода (k) — та же
    // токенизированная русская строка, лежит в __I18N_DICT, значение — перевод с %1/%2.
    // Порядок важен: более конкретные шаблоны идут раньше общих.
    var TEMPLATES = [
        { re: /^Привет, (.+)$/, k: 'Привет, %1' },
        { re: /^в ForgeMetrics с ([А-Яа-яЁё]+) (\d{4})$/, k: 'в ForgeMetrics с %1 %2' },
        { re: /^подключён (\d+) (янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек)$/, k: 'подключён %1 %2' },
        { re: /^([\d\s  .,]+) символов$/, k: '%1 символов' },
        { re: /^Тариф (.+?) · \+(\d+) дн\.$/, k: 'Тариф %1 · +%2 дн.' },
        { re: /^Тариф (.+?)\. Больше каналов — на тарифе Pro$/, k: 'Тариф %1. Больше каналов — на тарифе Pro' },
        { re: /^Тариф (.+?)\. Это максимум для твоего тарифа$/, k: 'Тариф %1. Это максимум для твоего тарифа' },
        { re: /^Тариф ([^.·]+)$/, k: 'Тариф %1' },
        { re: /^Лимит каналов: (\d+) из (\d+)$/, k: 'Лимит каналов: %1 из %2' },
        { re: /^(.+?) · базовый доступ$/, k: '%1 · базовый доступ' },
        { re: /^(.+?) · максимум$/, k: '%1 · максимум' },
        { re: /^Оформить (.+?) — (.+?) ₽\/мес$/, k: 'Оформить %1 — %2 ₽/мес' },
        { re: /^Забронировать (.+?) — (.+?) ₽$/, k: 'Забронировать %1 — %2 ₽' },
        { re: /^Пробный период · осталось (\d+) (?:день|дня|дней)\. Закрепи тариф, чтобы не потерять аудит, конкурентов и каналы после триала\.$/, k: 'Пробный период · осталось %1 дней. Закрепи тариф, чтобы не потерять аудит, конкурентов и каналы после триала.' },
        { re: /^осталось (\d+) (?:день|дня|дней)$/, k: 'осталось %1 дней' },
        { re: /^кредитов на балансе · заработано (.+?) ₽$/, k: 'кредитов на балансе · заработано %1 ₽' },
        { re: /^до (.+?) — (\d+) платящих$/, k: 'до %1 — %2 платящих' },
        { re: /^([\d\s  .,]+) подписчиков$/, k: '%1 подписчиков' },
        { re: /^Будет стёрт из системы через (.+)$/, k: 'Будет стёрт из системы через %1' },
        { re: /^\+(\d+)₽ за каждого$/, k: '+%1₽ за каждого' },
        { re: /^Файл больше (\d+) МБ или превышает квоту хранилища$/, k: 'Файл больше %1 МБ или превышает квоту хранилища' },
        { re: /^Файл больше (\d+) МБ$/, k: 'Файл больше %1 МБ' },
        { re: /^Видео длиннее (\d+) секунд — сократи ролик до 30 секунд$/, k: 'Видео длиннее %1 секунд — сократи ролик до 30 секунд' },
        { re: /^Слишком часто\. Повтори через (\d+) с\.$/, k: 'Слишком часто. Повтори через %1 с.' },
        { re: /^Сменить промокод можно через (\d+) дней$/, k: 'Сменить промокод можно через %1 дней' },
        { re: /^Лимит аудитов исчерпан \((\d+)\/(\d+)\)\. Обновится при наступлении нового периода\.$/, k: 'Лимит аудитов исчерпан (%1/%2). Обновится при наступлении нового периода.' },
        { re: /^Лимит анализов исчерпан \((\d+)\/(\d+)\)\. Обновится при наступлении нового периода или купи разовый анализ\.$/, k: 'Лимит анализов исчерпан (%1/%2). Обновится при наступлении нового периода или купи разовый анализ.' },
        { re: /^Лимит обновлений стиля на месяц исчерпан \((\d+)\/(\d+)\)\. Обновится при наступлении нового периода\.$/, k: 'Лимит обновлений стиля на месяц исчерпан (%1/%2). Обновится при наступлении нового периода.' },
        { re: /^Лимит обновлений стиля исчерпан \((\d+)\/(\d+)\)\. Обновится при наступлении нового периода\.$/, k: 'Лимит обновлений стиля исчерпан (%1/%2). Обновится при наступлении нового периода.' },
        { re: /^Ошибка: (.+)$/, k: 'Ошибка: %1' },
        { re: /^Анализировать \((\d+)\)$/, k: 'Анализировать (%1)' },
        // единицы «число + единица» (склейка в коде, не ${}) — не матчатся целым узлом
        { re: /^([\d\s  .,]+) подп\.$/, k: '%1 подп.' },
        { re: /^([\d\s  .,]+) подп$/, k: '%1 подп' },
        { re: /^(\d+) актив\.$/, k: '%1 актив.' },
        { re: /^(\d+) форм\. · от (.+) ₽$/, k: '%1 форм. · от %2 ₽' },
        { re: /^обновлено (\d+) мин назад$/, k: 'обновлено %1 мин назад' },
        { re: /^обновлено (\d+) ч назад$/, k: 'обновлено %1 ч назад' },
        { re: /^обновлено (\d+) дн назад$/, k: 'обновлено %1 дн назад' },
        { re: /^(\d+) мин назад$/, k: '%1 мин назад' },
        { re: /^(\d+) ч назад$/, k: '%1 ч назад' },
        { re: /^(\d+) дн назад$/, k: '%1 дн назад' },
        { re: /^\/ (\d+) в мес$/, k: '/ %1 в мес' },
        { re: /^(.+) · нажми, чтобы управлять$/, k: '%1 · нажми, чтобы управлять' },
        // бэкенд-строки с подстановкой (здоровье/охват/лимиты) — приходят как данные, рендерятся текстом
        { re: /^Охват ([\d.,]+)% — выше 100%$/, k: 'Охват %1% — выше 100%' },
        { re: /^Охват ([\d.,]+)%$/, k: 'Охват %1%' },
        { re: /^Бонус за (.+)$/, k: 'Бонус за %1' },
        { re: /^В канале слишком мало подписчиков для анализа аудитории \(нужно хотя бы (\d+)\)\. Набери аудиторию и возвращайся\.$/, k: 'В канале слишком мало подписчиков для анализа аудитории (нужно хотя бы %1). Набери аудиторию и возвращайся.' },
        { re: /^Достигнут лимит размещений для твоего тарифа \((\d+)\)\. Повысь тариф или сними другой канал с Площадки\.$/, k: 'Достигнут лимит размещений для твоего тарифа (%1). Повысь тариф или сними другой канал с Площадки.' },
        { re: /^У тебя уже (\d+) активных заявок — это максимум\. Закрой неактуальную, чтобы разместить новую\.$/, k: 'У тебя уже %1 активных заявок — это максимум. Закрой неактуальную, чтобы разместить новую.' },
        { re: /^Скрыто автоматически: (\d+) жалоб\(ы\)\. Ждёт ручного разбора\.$/, k: 'Скрыто автоматически: %1 жалоб(ы). Ждёт ручного разбора.' },
        { re: /^Ссылка не из канала оффера\. Пост должен быть в @(.+)\.$/, k: 'Ссылка не из канала оффера. Пост должен быть в @%1.' },
        { re: /^При ([\d\s .,]+) подписчиках посты собирают ~([\d\s .,]+) просмотров\. Здоровая вовлечённость\.$/, k: 'При %1 подписчиках посты собирают ~%2 просмотров. Здоровая вовлечённость.' },
        { re: /^~([\d\s .,]+) просмотров на ([\d\s .,]+) подписчиков\. Средне — часть аудитории может быть неактивной\.$/, k: '~%1 просмотров на %2 подписчиков. Средне — часть аудитории может быть неактивной.' },
        { re: /^~([\d\s .,]+) просмотров при ([\d\s .,]+) подписчиках\. Очень низко — вероятна накрутка подписчиков\.$/, k: '~%1 просмотров при %2 подписчиках. Очень низко — вероятна накрутка подписчиков.' },
        { re: /^Просмотры прыгают до x([\d.,]+) между постами — признак точечного закупа просмотров на отдельные посты\.$/, k: 'Просмотры прыгают до x%1 между постами — признак точечного закупа просмотров на отдельные посты.' },
        { re: /^Разброс просмотров до x([\d.,]+) — бывает у живых каналов, но стоит присмотреться\.$/, k: 'Разброс просмотров до x%1 — бывает у живых каналов, но стоит присмотреться.' },
        { re: /^Разброс просмотров небольшой \(до x([\d.,]+)\) — закупа просмотров не видно\.$/, k: 'Разброс просмотров небольшой (до x%1) — закупа просмотров не видно.' },
        { re: /^Около (\d+)% постов рекламные — аудитория может быть выжжена, охват твоей рекламы ниже\.$/, k: 'Около %1% постов рекламные — аудитория может быть выжжена, охват твоей рекламы ниже.' },
        { re: /^Примерно (\d+)% постов рекламные — умеренно\.$/, k: 'Примерно %1% постов рекламные — умеренно.' }
    ];
    // Возвращает перевод строки с подстановкой, если она подошла под шаблон; иначе исходную строку.
    // Захваченные части тоже переводятся через t() (числа/имена остаются как есть — их в словаре нет),
    // поэтому составные узлы вида «На проверке · нажми, чтобы управлять» переводятся целиком.
    window.translateTemplate = function (text) {
        if (LANG === 'ru' || text == null) return text;
        for (var i = 0; i < TEMPLATES.length; i++) {
            var m = TEMPLATES[i].re.exec(text);
            if (!m) continue;
            var out = window.t(TEMPLATES[i].k);
            if (out == null || out === '') out = TEMPLATES[i].k;
            for (var g = m.length - 1; g >= 1; g--) {
                var val = m[g];
                var tv = window.t(val);            // переводим захваченную часть, если она точно есть в словаре
                out = out.split('%' + g).join(tv != null ? tv : val);
            }
            return out;
        }
        return text;
    };
    // Перевод отрезка: точный ключ → шаблон. edge НЕ используем (рискует задеть данные —
    // названия/описания каналов); для конкретных склеек есть точные шаблоны.
    function _segTr(seg) {
        if (!seg) return null;
        var r = window.t(seg);
        if (r && r !== seg) return r;
        if (window.translateTemplate) { var x = window.translateTemplate(seg); if (x && x !== seg) return x; }
        return null;
    }
    // Перевод КРАЙНИХ словарных фраз (голова + хвост) составного узла; середину НЕ трогаем —
    // чтобы не перевести слово-данные внутри описания/имени канала. Переводит самую длинную
    // ведущую фразу и самую длинную хвостовую фразу, что есть в словаре.
    // Ловит «подключён 15 июн» (голова «подключён» + хвост «июн»), «Жирный ·» (голова), «0 / 5000 символов» (хвост).
    window.edgeTranslate = function (trimmed) {
        if (LANG === 'ru' || trimmed == null) return null;
        var words = trimmed.split(' ');
        if (words.length < 2) return null;
        var lo = 0, hi = words.length, head = null, tail = null, take, p, tv;
        for (take = Math.min(8, words.length - 1); take >= 1; take--) {   // голова
            p = words.slice(0, take).join(' ');
            if (take === 1 && p.length < 3) continue;
            tv = window.t(p);
            if (tv && tv !== p) { head = tv; lo = take; break; }
        }
        for (take = Math.min(8, words.length - lo - 1); take >= 1; take--) {  // хвост (не залезая на голову)
            p = words.slice(words.length - take).join(' ');
            if (take === 1 && p.length < 3) continue;
            tv = window.t(p);
            if (tv && tv !== p) { tail = tv; hi = words.length - take; break; }
        }
        if (head === null && tail === null) return null;
        var mid = words.slice(lo, hi).join(' ');
        return [head, mid, tail].filter(function (x) { return x !== null && x !== ''; }).join(' ');
    };
    // Составной узел с разделителями (· — / |): делим, переводим каждый отрезок, разделители сохраняем.
    // Ловит «приватный · подключён 15 июн», «На проверке · нажми, чтобы управлять» и т.п.
    window.segmentTranslate = function (trimmed) {
        if (LANG === 'ru' || trimmed == null) return null;
        var parts = trimmed.split(/(\s[·—–|/]\s)/);
        if (parts.length < 3) return null;
        var changed = false, out = '';
        for (var i = 0; i < parts.length; i++) {
            if (/^\s[·—–|/]\s$/.test(parts[i])) { out += parts[i]; continue; }
            var seg = parts[i].trim();
            var tr = seg ? _segTr(seg) : null;
            if (tr && tr !== seg) { out += parts[i].replace(seg, tr); changed = true; }
            else out += parts[i];
        }
        return changed ? out : null;
    };
    // Разделитель по краям («— X», «· X», «X ·»): переводим ядро (exact/шаблон), разделитель
    // сохраняем. Ядро переводится только если оно точно в словаре — данные не заденет.
    window.stripSepTranslate = function (trimmed) {
        if (LANG === 'ru' || trimmed == null) return null;
        var m = trimmed.match(/^([—–\-·|/]+\s+)(.+)$/);   // ведущий
        if (m) { var ct = _segTr(m[2]); if (ct) return m[1] + ct; }
        var e = trimmed.match(/^(.+?)(\s+[—–·|/]+)$/);    // хвостовой («Жирный ·»)
        if (e) { var ct2 = _segTr(e[1]); if (ct2) return ct2 + e[2]; }
        return null;
    };

    // Самодостаточный авто-локализатор для отдельных документов (напр. iframe редактора постера).
    // opts.skip — CSS-селектор поддерева, которое НЕ трогать (напр. '#poster' — замороженный макет).
    // Для серверного рендера LANG='ru' → тихо выходит, ничего не переводит.
    window.autoLocalize = function (opts) {
        opts = opts || {};
        var skipSel = opts.skip || null;
        if (LANG === 'ru' || typeof document === 'undefined') return;
        function tr1(s) {
            var r = window.t(s);
            if (r && r !== s) return r;
            if (window.translateTemplate) { var t2 = window.translateTemplate(s); if (t2 && t2 !== s) return t2; }
            if (window.stripSepTranslate) { var t3 = window.stripSepTranslate(s); if (t3) return t3; }
            if (window.segmentTranslate) { var t4 = window.segmentTranslate(s); if (t4) return t4; }
            return null;
        }
        function inSkip(node) {
            if (!skipSel) return false;
            var e = node.nodeType === 3 ? node.parentElement : node;
            return !!(e && e.closest && e.closest(skipSel));
        }
        function locText(n) {
            try {
                if (inSkip(n)) return;
                var raw = n.nodeValue; if (!raw) return;
                var tm = raw.trim(); if (!tm) return;
                var r = tr1(tm); if (r) n.nodeValue = raw.replace(tm, r);
            } catch (e) {}
        }
        var ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
        function locAttrs(el) {
            try {
                if (!el || el.nodeType !== 1 || !el.getAttribute || inSkip(el)) return;
                for (var i = 0; i < ATTRS.length; i++) {
                    var v = el.getAttribute(ATTRS[i]); if (!v) continue;
                    var tm = v.trim(); if (!tm) continue;
                    var r = tr1(tm); if (r) el.setAttribute(ATTRS[i], v.replace(tm, r));
                }
            } catch (e) {}
        }
        function locTree(root) {
            try {
                if (!root) return;
                if (root.nodeType === 3) { locText(root); return; }
                if (root.nodeType !== 1) return;
                var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
                while ((n = w.nextNode())) nodes.push(n);
                for (var i = 0; i < nodes.length; i++) locText(nodes[i]);
                locAttrs(root);
                if (root.querySelectorAll) { var els = root.querySelectorAll('[title],[placeholder],[aria-label],[alt]'); for (var j = 0; j < els.length; j++) locAttrs(els[j]); }
            } catch (e) {}
        }
        function run() {
            locTree(document.body);
            try {
                var obs = new MutationObserver(function (muts) {
                    muts.forEach(function (m) {
                        if (m.type === 'characterData') { locText(m.target); return; }
                        if (!m.addedNodes) return;
                        m.addedNodes.forEach(function (nd) {
                            if (nd.nodeType === 1) locTree(nd); else if (nd.nodeType === 3) locText(nd);
                        });
                    });
                });
                obs.observe(document.body, { childList: true, subtree: true, characterData: true });
            } catch (e) {}
        }
        if (document.body) run(); else document.addEventListener('DOMContentLoaded', run);
    };
})();
