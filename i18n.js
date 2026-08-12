(function () {
    var SUPPORTED = ['ru', 'en', 'ar', 'hi', 'id', 'pt', 'es', 'fr', 'de', 'it',
                     'tr', 'fa', 'vi', 'bn', 'kk', 'uz', 'be', 'az', 'am', 'sw'];
    var NAMES = {
        ru: 'Русский', en: 'English', ar: 'العربية', hi: 'हिन्दी',
        id: 'Bahasa Indonesia', pt: 'Português (BR)', es: 'Español', fr: 'Français',
        de: 'Deutsch', it: 'Italiano', tr: 'Türkçe', fa: 'فارسی',
        vi: 'Tiếng Việt', bn: 'বাংলা', kk: 'Қазақша', uz: 'Oʻzbekcha',
        be: 'Беларуская', az: 'Azərbaycan', am: 'አማርኛ', sw: 'Kiswahili'
    };
    var FLAGS = {
        ru: '🇷🇺', en: '🇬🇧', ar: '🇸🇦', hi: '🇮🇳', id: '🇮🇩', pt: '🇧🇷', es: '🇪🇸', fr: '🇫🇷',
        de: '🇩🇪', it: '🇮🇹', tr: '🇹🇷', fa: '🇮🇷', vi: '🇻🇳', bn: '🇧🇩', kk: '🇰🇿', uz: '🇺🇿',
        be: '🇧🇾', az: '🇦🇿', am: '🇪🇹', sw: '🇹🇿'
    };
    var _fl = function (inner) { return '<svg class="flsvg" viewBox="0 0 24 18" preserveAspectRatio="none">' + inner + '</svg>'; };
    var FLAG_SVG = {
        ru: _fl('<rect width="24" height="6" fill="#fff"/><rect y="6" width="24" height="6" fill="#0039A6"/><rect y="12" width="24" height="6" fill="#D52B1E"/>'),
        en: _fl('<rect width="24" height="18" fill="#012169"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#fff" stroke-width="3.6"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#C8102E" stroke-width="1.6"/><rect x="9.5" width="5" height="18" fill="#fff"/><rect y="6.5" width="24" height="5" fill="#fff"/><rect x="10.5" width="3" height="18" fill="#C8102E"/><rect y="7.5" width="24" height="3" fill="#C8102E"/>'),
        es: _fl('<rect width="24" height="18" fill="#AA151B"/><rect y="4.5" width="24" height="9" fill="#F1BF00"/>'),
        de: _fl('<rect width="24" height="6" fill="#000"/><rect y="6" width="24" height="6" fill="#DD0000"/><rect y="12" width="24" height="6" fill="#FFCE00"/>'),
        kk: _fl('<rect width="24" height="18" fill="#00AFCA"/><circle cx="12" cy="8" r="3.4" fill="#FEC50C"/><rect x="7" y="14" width="10" height="1.4" fill="#FEC50C"/>'),
        uz: _fl('<rect width="24" height="6" fill="#0099B5"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#1EB53A"/><rect y="5.3" width="24" height="0.7" fill="#CE1126"/><rect y="12" width="24" height="0.7" fill="#CE1126"/>'),
        be: _fl('<rect width="24" height="12" fill="#D22730"/><rect y="12" width="24" height="6" fill="#009739"/><rect width="4" height="18" fill="#fff"/>'),
        az: _fl('<rect width="24" height="6" fill="#0092BC"/><rect y="6" width="24" height="6" fill="#EF3340"/><rect y="12" width="24" height="6" fill="#509E2F"/><circle cx="11.5" cy="9" r="2.6" fill="#fff"/><circle cx="12.4" cy="9" r="2.2" fill="#EF3340"/>'),
        ar: _fl('<rect width="24" height="18" fill="#165d31"/><rect x="4" y="7" width="16" height="1.6" fill="#fff"/><rect x="4" y="10.4" width="12" height="1.2" fill="#fff"/>'),
        hi: _fl('<rect width="24" height="6" fill="#FF9933"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#138808"/><circle cx="12" cy="9" r="2.2" fill="none" stroke="#000080" stroke-width="0.8"/>'),
        id: _fl('<rect width="24" height="9" fill="#CE1126"/><rect y="9" width="24" height="9" fill="#fff"/>'),
        pt: _fl('<rect width="24" height="18" fill="#009B3A"/><polygon points="12,2.5 21.5,9 12,15.5 2.5,9" fill="#FEDF00"/><circle cx="12" cy="9" r="3.4" fill="#002776"/>'),
        fr: _fl('<rect width="8" height="18" fill="#0055A4"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#EF4135"/>'),
        it: _fl('<rect width="8" height="18" fill="#009246"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#CE2B37"/>'),
        tr: _fl('<rect width="24" height="18" fill="#E30A17"/><circle cx="10" cy="9" r="4" fill="#fff"/><circle cx="11.2" cy="9" r="3.2" fill="#E30A17"/><polygon points="15.6,9 18.4,9.9 16.7,7.5 16.7,10.5 18.4,8.1" fill="#fff"/>'),
        fa: _fl('<rect width="24" height="6" fill="#239F40"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#DA0000"/><circle cx="12" cy="9" r="1.8" fill="none" stroke="#DA0000" stroke-width="0.9"/>'),
        vi: _fl('<rect width="24" height="18" fill="#DA251D"/><polygon points="12,4.6 13.4,8.4 17.4,8.4 14.2,10.8 15.4,14.6 12,12.3 8.6,14.6 9.8,10.8 6.6,8.4 10.6,8.4" fill="#FFFF00"/>'),
        bn: _fl('<rect width="24" height="18" fill="#006A4E"/><circle cx="10.5" cy="9" r="4.4" fill="#F42A41"/>'),
        am: _fl('<rect width="24" height="6" fill="#078930"/><rect y="6" width="24" height="6" fill="#FCDD09"/><rect y="12" width="24" height="6" fill="#DA121A"/><circle cx="12" cy="9" r="3.4" fill="#0F47AF"/><polygon points="12,6.6 12.7,8.4 14.6,8.4 13.1,9.6 13.7,11.4 12,10.3 10.3,11.4 10.9,9.6 9.4,8.4 11.3,8.4" fill="#FCDD09"/>'),
        sw: _fl('<rect width="24" height="18" fill="#1EB53A"/><polygon points="0,18 24,0 24,18" fill="#00A3DD"/><polygon points="0,18 0,13 17,0 24,0 24,5 7,18" fill="#000"/><polygon points="0,13 0,11.6 15.4,0 17,0" fill="#FCD116"/><polygon points="7,18 8.6,18 24,6.4 24,5" fill="#FCD116"/>'),
    };

    function detect() {
        try {
            var saved = localStorage.getItem('fm_lang');
            if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
        } catch (e) {}
        try {
            var srv = localStorage.getItem('fm_lang_srv');
            if (srv && SUPPORTED.indexOf(srv) >= 0) return srv;
        } catch (e) {}
        try {
            var tg = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user;
            var code = (tg && tg.language_code ? String(tg.language_code) : '').slice(0, 2).toLowerCase();
            if (SUPPORTED.indexOf(code) >= 0) return code;
        } catch (e) {}
        return 'ru';
    }

    var LANG = detect();
    var DICT = window.__I18N_DICT || {};

    window.I18N = { supported: SUPPORTED, names: NAMES, flags: FLAGS, flagSvg: FLAG_SVG };
    window.getLang = function () { return LANG; };
    window.setLang = function (l) {
        if (SUPPORTED.indexOf(l) < 0 || l === LANG) return false;
        LANG = l;
        try { localStorage.setItem('fm_lang', l); } catch (e) {}
        return true;
    };
    window.applyServerLang = function (l) {
        try { if (localStorage.getItem('fm_lang')) return false; } catch (e) {}
        if (!l || SUPPORTED.indexOf(l) < 0 || l === LANG) return false;
        try { localStorage.setItem('fm_lang_srv', l); } catch (e) { return false; }
        return true;
    };
    window.t = function (s) {
        if (LANG === 'ru' || s == null) return s;
        var d = (window.__I18N_DICT || DICT)[LANG];
        return (d && d[s] != null && d[s] !== '') ? d[s] : s;
    };

    var TEMPLATES = [
        { re: /^Баланса хватит на (\d+) (.+)$/, k: 'Баланса хватит на %1 %2' },
        { re: /^Каналов подключено: (\d+) из (\d+)$/, k: 'Каналов подключено: %1 из %2' },
        { re: /^Начисляем ([\d\s\u00a0\u202f.,]+) бесплатно каждый месяц$/, k: 'Начисляем %1 бесплатно каждый месяц' },
        { re: /^Начисляем с коэффициентом 1\.5 — на 50% больше номинала\. Другу −(\d+)% на первое пополнение Forge\.$/, k: 'Начисляем с коэффициентом 1.5 — на 50% больше номинала. Другу −%1% на первое пополнение Forge.' },
        { re: /^из пакета ([\d\s\u00a0\u202f.,]+) Forge · следующий пакет даст ([\d\s\u00a0\u202f.,]+)$/, k: 'из пакета %1 Forge · следующий пакет даст %2' },
        { re: /^из пакета ([\d\s\u00a0\u202f.,]+) Forge$/, k: 'из пакета %1 Forge' },
        { re: /^Достигнут предел размещений \((\d+)\)\. Сними один из офферов с Площадки, чтобы создать новый\.$/, k: 'Достигнут предел размещений (%1). Сними один из офферов с Площадки, чтобы создать новый.' },
        { re: /^Привет, (.+)$/, k: 'Привет, %1' },
        { re: /^в ForgeMetrics с ([А-Яа-яЁё]+) (\d{4})$/, k: 'в ForgeMetrics с %1 %2' },
        { re: /^подключён (\d+) (янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек)$/, k: 'подключён %1 %2' },
        { re: /^(\d+) (янв|фев|мар|апр|мая|июн|июл|авг|сен|окт|ноя|дек) в (\d\d:\d\d)$/, k: '%1 %2 в %3' },
        { re: /^([\d\s  .,]+) символов$/, k: '%1 символов' },
        { re: /^([\d\s  .,]+) постов$/, k: '%1 постов' },
        { re: /^([\d\s  .,]+) событие$/, k: '%1 событие' },
        { re: /^([\d\s  .,]+) события$/, k: '%1 события' },
        { re: /^([\d\s  .,]+) событий$/, k: '%1 событий' },
        { re: /^([\d\s  .,]+) охват$/, k: '%1 охват' },
        { re: /^(.+?) · базовый доступ$/, k: '%1 · базовый доступ' },
        { re: /^(.+?) · максимум$/, k: '%1 · максимум' },
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
        { re: /^Охват ([\d.,]+)% — выше 100%$/, k: 'Охват %1% — выше 100%' },
        { re: /^Охват ([\d.,]+)%$/, k: 'Охват %1%' },
        { re: /^Бонус за (.+)$/, k: 'Бонус за %1' },
        { re: /^В канале слишком мало подписчиков для анализа аудитории \(нужно хотя бы (\d+)\)\. Набери аудиторию и возвращайся\.$/, k: 'В канале слишком мало подписчиков для анализа аудитории (нужно хотя бы %1). Набери аудиторию и возвращайся.' },
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
        { re: /^Примерно (\d+)% постов рекламные — умеренно\.$/, k: 'Примерно %1% постов рекламные — умеренно.' },
        { re: /^Авто — как в канале \(~([\d\s  .,]+) знаков\)$/, k: 'Авто — как в канале (~%1 знаков)' },
        { re: /^(\d+)% с первого платежа друга — кредитами$/, k: '%1% с первого платежа друга — кредитами' },
        { re: /^(\d+)% с первых (\d+) платежей — кредитами$/, k: '%1% с первых %2 платежей — кредитами' },
        { re: /^(\d+)% с первого платежа друга плюс бонусы$/, k: '%1% с первого платежа друга плюс бонусы' },
        { re: /^(\d+)% от первых (\d+) платежей — кредитами$/, k: '%1% от первых %2 платежей — кредитами' },
        { re: /^(\d+)% от платежей$/, k: '%1% от платежей' },
        { re: /^от первых (\d+) платежей каждого приглашённого — кредитами на баланс$/, k: 'от первых %1 платежей каждого приглашённого — кредитами на баланс' },
        { re: /^С каждого из его первых (\d+) платежей тебе идут кредиты — тем больше, чем выше уровень\.$/, k: 'С каждого из его первых %1 платежей тебе идут кредиты — тем больше, чем выше уровень.' },
        { re: /^([\d\s  .,]+) мест$/, k: '%1 мест' },
        { re: /^([\d\s  .,]+) оплативших$/, k: '%1 оплативших' },
        { re: /^([\d\s  .,]+) оплативший$/, k: '%1 оплативший' },
        { re: /^Всплески 24 и 48 ч вместе — не больше (\d+) раз в месяц\. Платные офферы занимают не более 20% ленты — органику не топит\.$/, k: 'Всплески 24 и 48 ч вместе — не больше %1 раз в месяц. Платные офферы занимают не более 20% ленты — органику не топит.' },
        { re: /^(\d+)% от платежей приглашённых — кредитами$/, k: '%1% от платежей приглашённых — кредитами' },
        { re: /^(\d+) \/ (\d+) символов$/, k: '%1 / %2 символов' },
        { re: /^Приз лучшему — (.+)\. Считаются приглашённые, подключившие живой канал за 7 дней\.$/, k: 'Приз лучшему — %1. Считаются приглашённые, подключившие живой канал за 7 дней.' },
        { re: /^Здоровье канала: (.+)$/, k: 'Здоровье канала: %1' },
        { re: /^Написать: ([\d\s  .,]+)$/, k: 'Написать: %1' },
        { re: /^Развороты: ([\d\s  .,]+)$/, k: 'Развороты: %1' },
        { re: /^Удалить канал «(.+)»\?\n\nКанал переедет в «Недавно удалённые», данные сохранятся 7 дней\. Переподключить можно в любой момент\.$/, k: 'Удалить канал «%1»?\n\nКанал переедет в «Недавно удалённые», данные сохранятся 7 дней. Переподключить можно в любой момент.' },
        { re: /^Заявка в перечне РКН № (\d+)$/, k: 'Заявка в перечне РКН № %1' },
        { re: /^в нише «(.+)»: \+(\d+)% за (\d+) дн — охват растёт вместе с базой$/, k: 'в нише «%1»: +%2% за %3 дн — охват растёт вместе с базой' },
        { re: /^в нише «(.+)»: \+(\d+)% за (\d+) дн — охват не растёт, возможна накрутка$/, k: 'в нише «%1»: +%2% за %3 дн — охват не растёт, возможна накрутка' },
        { re: /^в нише «(.+)»: \+(\d+)% за (\d+) дн — стоит проверить охват$/, k: 'в нише «%1»: +%2% за %3 дн — стоит проверить охват' },
        { re: /^в нише «(.+)» — охват растёт вместе с базой$/, k: 'в нише «%1» — охват растёт вместе с базой' },
        { re: /^в нише «(.+)» — охват не растёт, возможна накрутка$/, k: 'в нише «%1» — охват не растёт, возможна накрутка' },
        { re: /^в нише «(.+)» — стоит проверить охват$/, k: 'в нише «%1» — стоит проверить охват' },
        { re: /^в нише «(.+)» — от ([\d\s  .,]+) ₽$/, k: 'в нише «%1» — от %2 ₽' },
        { re: /^в нише «(.+)»$/, k: 'в нише «%1»' },
        { re: /^на размещение в нише «(.+)»$/, k: 'на размещение в нише «%1»' },
        { re: /^: канал в нише «(.+)» — подозрительная кривая просмотров$/, k: ': канал в нише «%1» — подозрительная кривая просмотров' },
        { re: /^Интерес к нише «(.+)» ×([\d.,]+)$/, k: 'Интерес к нише «%1» ×%2' },
        { re: /^Горящая скидка −(\d+)%$/, k: 'Горящая скидка −%1%' },
        { re: /^: помечено (\d+) канал(?:|а|ов) — (.+?)( и ещё \d+)?$/, k: ': помечено %1 каналов — %2%3' },
        { re: /^в нише «(.+)» — ([\d\s  .,КМ]+) подписчиков$/, k: 'в нише «%1» — %2 подписчиков' },
        { re: /^в нише «(.+)»: ([\d\s  .,]+) → ([\d\s  .,]+) ₽$/, k: 'в нише «%1»: %2 → %3 ₽' },
        { re: /^CPM в нише «(.+)»$/, k: 'CPM в нише «%1»' },
        { re: /^ и ещё (\d+)$/, k: ' и ещё %1' },
        { re: /^данных (\d+) дн из (\d+)$/, k: 'данных %1 дн из %2' },
        { re: /^за (\d+) дн$/, k: 'за %1 дн' },
        { re: /^за (\d+) ч$/, k: 'за %1 ч' },
        { re: /^Осталось запусков: (\d+) из (\d+) в месяц$/, k: 'Осталось запусков: %1 из %2 в месяц' },
        { re: /^разовый запуск ([\d\s  .,]+) ₽$/, k: 'разовый запуск %1 ₽' },
        { re: /^Лимит исчерпан \((\d+)\/(\d+)\)$/, k: 'Лимит исчерпан (%1/%2)' },
        { re: /^(\d+) канал(?:|а|ов)$/, k: '%1 каналов' },
        { re: /^(\d+) (января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)$/, k: '%1 %2' },
        { re: /^(\d+) (янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)$/, k: '%1 %2' },
        { re: /^Пауза: (\d+)$/, k: 'Пауза: %1' },
        { re: /^Возобновлено: (\d+)$/, k: 'Возобновлено: %1' },
        { re: /^Пропущено: (\d+)$/, k: 'Пропущено: %1' },
        { re: /^Цены обновлены: (\d+)$/, k: 'Цены обновлены: %1' },
        { re: /^Применить к (\d+)$/, k: 'Применить к %1' }
    ];
    window.translateTemplate = function (text) {
        if (LANG === 'ru' || text == null) return text;
        for (var i = 0; i < TEMPLATES.length; i++) {
            var m = TEMPLATES[i].re.exec(text);
            if (!m) continue;
            var out = window.t(TEMPLATES[i].k);
            if (out == null || out === '') out = TEMPLATES[i].k;
            for (var g = m.length - 1; g >= 1; g--) {
                var val = m[g];
                var tv = window.t(val);
                out = out.split('%' + g).join(tv != null ? tv : val);
            }
            return out;
        }
        return text;
    };
    function _segTr(seg) {
        if (!seg) return null;
        var r = window.t(seg);
        if (r && r !== seg) return r;
        if (window.translateTemplate) { var x = window.translateTemplate(seg); if (x && x !== seg) return x; }
        if (window.stripSepTranslate) { var y = window.stripSepTranslate(seg); if (y) return y; }
        return null;
    }
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
    window.stripSepTranslate = function (trimmed) {
        if (LANG === 'ru' || trimmed == null) return null;
        var m = trimmed.match(/^([—–\-·|/]+\s+)(.+)$/);
        if (m) { var ct = _segTr(m[2]); if (ct) return m[1] + ct; }
        var e = trimmed.match(/^(.+?)(\s+[—–·|/]+)$/);
        if (e) { var ct2 = _segTr(e[1]); if (ct2) return ct2 + e[2]; }
        return null;
    };

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
