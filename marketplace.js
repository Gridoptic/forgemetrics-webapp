(function () {
    'use strict';

    var MEDIA_MAX_BYTES = 64 * 1024 * 1024;
    var _root = null, _opened = false;
    var _mainTab = 'market';
    var _subTab = 'buy';
    var _view = 'cards';
    var _sort = 'match';
    var _feed = null, _catalog = null, _feedState = 'idle', _catState = 'idle';
    var _adultOk = false;
    var _q = '', _sortBuy = 'smart', _fPriceMin = null, _fPriceMax = null, _fSubsMin = null, _fAud = null;
    function _audLabel(l) {
        if (l.audience_source === 'commenters' && l.female_pct != null && (l.gender_sample || 0) >= 15) {
            var fp = l.female_pct, fem = fp >= 50;
            return { icon: fem ? 'ti-gender-female' : 'ti-gender-male', color: fem ? '#ff6fae' : '#5b9dff',
                short: (fem ? 'жен' : 'муж') + ' ≈' + (fem ? fp : 100 - fp) + '%',
                text: '≈' + fp + '% комментаторов — женщины', note: 'оценка по ' + l.gender_sample + ' именам' };
        }
        return null;
    }
    function _audChip(l) {
        var lab = _audLabel(l); if (!lab) return '';
        return '<span class="fmx-aud" style="color:' + lab.color + ';border-color:' + lab.color + '55;background:' + lab.color + '1a;"><i class="ti ' + lab.icon + '"></i>' + lab.short + '</span>';
    }
    var _feedTotal = 0, _feedOffset = 0, _FEED_PAGE = 30;
    var _deepCard = (function () { try { var sp = window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param; var m = sp && /^card_(\d+)(?:_r_[A-Za-z0-9_-]+)?$/.exec(sp); return m ? parseInt(m[1], 10) : null; } catch (e) { return null; } })();
    if (_deepCard) {
        var _deepTry = 0;
        var _deepT = setInterval(function () {
            _deepTry++;
            if (document.body && document.readyState !== 'loading') {
                clearInterval(_deepT);
                setTimeout(function () { try { window.__openMarketplace(); setTimeout(function () { setMainTab('market'); }, 200); } catch (e) {} }, 350);
            } else if (_deepTry > 20) { clearInterval(_deepT); }
        }, 300);
    }
    var _reqs = null, _reqState = 'idle';
    var _pulse = null, _pulseTs = 0;
    var _channels = [], _myListings = [], _bookmarks = {};
    var _chLoaded = false, _chLoading = false, _nicheSel = null;
    var _faqTab = 'rules';
    var _ss = null, _sfmts = null, _secCreate = 'cover';
    var _stickers = null;

    var FMT_CATALOG = [
        { k: 'h1_24',  n: '1/24',         sub: '1 ч в топе · 24 ч в ленте',           core: true,  base: true, preset: 5500 },
        { k: 'h2_48',  n: '2/48',         sub: '2 ч в топе · 48 ч в ленте · охват выше', core: true,             preset: 5900 },
        { k: 'h3_72',  n: '3/72',         sub: '3 ч в топе · 72 ч в ленте',           core: true,             preset: 6200 },
        { k: 'd7',     n: '7 дней',       sub: '3 ч в топе · 7 дней в ленте',         core: true,             preset: 9000 },
        { k: 'perm',   n: 'Без удаления', sub: '3 ч в топе · остаётся 30 дней или навсегда · премиум', core: true, preset: 11000 },
        { k: 'native', n: 'Нативный',     sub: 'Автор пишет сам по ТЗ · доверие и конверсия выше', core: true, preset: 11000 },
        { k: 'repost', n: 'Репост',       sub: 'Пересылка вашего поста · по правилам 1/24', core: true,        preset: 5000 },
        { k: 'pinned', n: 'Закреп',       sub: 'Закрепление в шапке · надбавка к формату', core: false,       preset: 2500 },
        { k: 'circle', n: 'Кружок',       sub: 'Видеосообщение внутри поста',         core: false,            preset: 5000 },
        { k: 'stories', n: 'Сторис',      sub: 'Отдельный тип площадки, не пост в ленте', core: false,        preset: 3000 }
    ];
    var FMT_LEGACY = { post_24h: 'h1_24', feed_native: 'native' };
    var _FMT_BY_K = {}; FMT_CATALOG.forEach(function (f) { _FMT_BY_K[f.k] = f; });
    function _fmtKey(k) { return FMT_LEGACY[k] || k; }
    function _fmtMeta(k) { return _FMT_BY_K[_fmtKey(k)] || null; }
    function _isCode(n) { return /^\d+\/\d+$/.test(n || ''); }
    function onTap(node, fn) {
        var t = 0;
        node.addEventListener('touchend', function (e) { t = Date.now(); e.preventDefault(); fn(e); }, { passive: false });
        node.addEventListener('click', function (e) { if (Date.now() - t < 600) return; fn(e); });
    }

    var COVERS = [
        'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#5DCAA5,#10b981)',
        'linear-gradient(135deg,#F0997B,#ec4899)', 'linear-gradient(135deg,#3b82f6,#06b6d4)',
        'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#8b5cf6,#ec4899)'
    ];
    var COVER_NAMES = ['Фиолет', 'Изумруд', 'Закат', 'Океан', 'Огонь', 'Магента'];
    var COLORS = ['#818cf8', '#3b82f6', '#22d3ee', '#5DCAA5', '#a3e635', '#facc15', '#f59e0b', '#F0997B', '#ef4444', '#ec4899', '#a78bfa', '#f5bf4f'];
    var FONTS = [['normal', 'Обычный'], ['bold', 'Жирный'], ['wide', 'Широкий'], ['mono', 'Моно']];
    var FX_GLOW = [['none', 'Без'], ['neon', 'Тонкое'], ['gold', 'Золото']];
    var FX_GLASS = [['none', 'Без'], ['frost', 'Матовое'], ['dark', 'Дымка'], ['tint', 'Цветное']];
    var FX_KEEP = { move: ['none'], over: ['none'], part: ['none'], orbit: ['none'], glow: ['none', 'neon', 'gold'], glass: ['none', 'frost', 'dark'] };
    function fxAllow(group, v) { return (v && FX_KEEP[group] && FX_KEEP[group].indexOf(v) >= 0) ? v : 'none'; }
    var FX_VIP = { glow: ['neon', 'gold'], glass: ['frost', 'dark'] };
    var GR = '#5DCAA5';

    var TERMS = [
        ['Подписчики', 'Общее число подписок на канал. Само по себе почти ничего не значит: подписчиков накручивают, закупают и прогоняют ботами. 50 000 живых читателей и 50 000 накрученных стоят по-разному и дают разный результат. Всегда смотри подписчиков в паре с охватом и ER: важно не сколько подписано, а сколько человек фактически видит и читает посты.'],
        ['Средний охват поста', 'Сколько человек в среднем видит один пост (берут медиану за 20–50 постов, кроме самых свежих — за 1–2 суток они ещё недобрали охват и занижают среднее). Ключевое число при закупке: через него считаются CPM и цена контакта. Важно: рекламный пост почти всегда собирает меньше органического — его листают, а в формате с удалением он живёт ограниченное время. Планируй по охвату недавних рекламных постов, а не обычных, и проси эту статистику у владельца — иначе фактический CPM окажется выше ожидаемого.'],
        ['ERR · вовлечённость по охвату', 'Engagement Rate by Reach — доля читателей, которые реагируют (реакции, репосты, комментарии, голоса) относительно охвата поста. Не путать с ER: тот считается от числа подписчиков и занижен теми, кто пост вообще не видел. Норма зависит от ниши: для новостных каналов 2–4% уже хорошо, для узких экспертных — 8–15%. Высокий охват при ER около нуля — тревожный сигнал: аудиторию привели, но канал ей неинтересен, и реклама пройдёт мимо.'],
        ['ERR · охват к базе', 'Какая доля подписчиков видит посты: охват ÷ подписчики × 100%. Норма зависит от размера канала: микро до 5к — 25–50%, малый 5–10к — 18–35%, средний 10к–100к — 7–22%, крупный 100к–1М — 6–16%, миллионник — 3–10%. У больших каналов процент всегда ниже, и это нормально. Сильно ниже своей нормы — признак выгоревшей или накрученной базы. Пример: 100 000 подписчиков при охвате 1 000 — это 1%, база выгоревшая, а число в шапке — витрина. Поправка на размер: у небольших каналов процент естественно выше (40–100%), у очень крупных 10–15% — уже норма, а не тревога.'],
        ['CPM · цена за 1000 просмотров', 'Стоимость тысячи показов рекламы: цена размещения ÷ показы (просмотры поста) × 1000. Главный инструмент сравнения каналов. Пример: пост за 5 000 ₽ при охвате 20 000 — CPM 250 ₽; пост за 8 000 ₽ при охвате 50 000 — CPM 160 ₽. Второй дороже на ценнике, но контакт в нём более чем в полтора раза дешевле. Сравнивай каналы одной ниши по CPM, а не по сумме размещения.'],
        ['CPA · цена целевого действия', 'Сколько стоило одно нужное действие: потрачено ÷ число результатов (подписка, заявка, продажа, установка). CPM показывает цену показа, CPA — цену результата, и именно он говорит, окупилась реклама или нет. Дешёвый по CPM канал с плохой аудиторией даёт дорогой CPA; узкий релевантный канал с виду дорогим CPM — дешёвый CPA. Считай CPA по каждому размещению через метки в ссылке (UTM, разные deep-link).'],
        ['ROI · окупаемость', 'Главный итоговый показатель: чистая прибыль ÷ затраты на размещение × 100%. Пример: пост за 5 000 ₽ принёс продаж на 12 000 ₽ при себестоимости 4 000 ₽ — прибыль 3 000 ₽, ROI 60%. Выше нуля — размещение в плюсе, ниже — в минусе. Считай ROI по каждому каналу отдельно: усреднённая цифра по кампании прячет убыточные каналы, которые тянут бюджет вниз.'],
        ['CTR · кликабельность', 'Доля увидевших пост, которые кликнули по ссылке: клики ÷ охват поста × 100%. В размещениях в каналах ориентир 0,5–2%: выше — креатив и аудитория попали друг в друга, ниже — пост не цепляет или аудитория не та. CTR — метрика твоего креатива, а не канала: один и тот же канал даст разный CTR разным объявлениям. Измеряется только метками в ссылке.'],
        ['CR · конверсия', 'Доля кликнувших, которые дошли до целевого действия: действия ÷ клики × 100%. Это метрика твоей посадочной — лендинга, бота или канала-прокладки. Если CTR высокий, а CR около нуля — канал привёл людей, но посадочная их теряет: чини воронку, а не меняй канал.'],
        ['CPC · цена клика', 'Стоимость одного перехода: цена размещения ÷ клики. Мост между ценой показа и ценой результата: CPM показывает цену внимания, CPC — цену заинтересованного человека. Сравнивай CPC каналов только при одинаковых креативах — иначе сравниваешь не каналы, а объявления.'],
        ['CPF · цена подписчика', 'Потрачено ÷ новые подписчики с размещения. Главная метрика, когда цель закупки — рост собственного канала. Пример: пост за 5 000 ₽ привёл 250 подписчиков — CPF 20 ₽. Смотри не только цену, но и качество: дешёвый мотивированный трафик отваливается за неделю и снижает охват канала. Прирост замеряй в первые 24–48 часов после выхода поста — дальше вклад размещения уже не отделить.'],
        ['eCPM · фактический CPM', 'Пересчёт уже вышедшего размещения в цену тысячи показов: потрачено ÷ реальные показы рекламного поста × 1000. Прайсовый CPM считается от среднего охвата канала, фактический — от того, что пост собрал на самом деле. Расхождение более 30–40% — предмет разговора с владельцем и аргумент к скидке на следующее размещение.'],
        ['Частота контакта', 'Сколько раз один и тот же человек увидел твою рекламу. В каналах возникает при повторных размещениях в одном канале и при закупке нескольких каналов одной ниши с пересекающейся аудиторией: второй контакт работает слабее первого, четвёртый — уже раздражает. Перед серией размещений оцени пересечение аудиторий, чтобы не оплачивать показы одним и тем же людям дважды.'],
        ['Отписки после размещения', 'Обратная сторона любой рекламы. Продавцу: сколько своих подписчиков потерял канал после выхода чужого поста — регулярно высокий отток означает, что реклама пережимает или не попадает в аудиторию. Закупщику на подписку: какая доля пришедших отвалилась в первые дни; отвал свежего трафика в 10–25% — норма, заметно выше — креатив обещает не то, что человек находит в канале.'],
        ['Форматы размещения', 'Как именно выходит реклама — это меняет и охват, и цену. Рыночная нотация «часы в топе / часы до удаления»: «1/24» — 1 час вверху ленты и удаление через 24 часа, «2/48» — 2 часа вверху и удаление через 48 часов, «3/72» — 3 часа и 72. Первая цифра (часы в топе) — главный параметр охвата, за неё и доплачивают; вторая — сколько пост живёт до удаления. Другие форматы: пост без удаления (на биржах его обычно называют «30 дней», не «вечный»), закреп сверху канала, нативная интеграция в авторский пост, формат-кружок. Дольше в топе и дольше до удаления — выше охват и цена. Сравнивай CPM только между одинаковыми форматами и уточняй у владельца часы в топе и срок удаления.'],
        ['Гео и язык аудитории', 'Из каких стран и на каком языке аудитория канала. Для перелива и арбитража это решает не меньше ниши: оффер платит по конкретным гео, и канал с отличными метриками, но аудиторией из недорогого гео или на другом языке сольёт бюджет. Перед закупкой сверь топ-страны и язык аудитории со своим оффером — уточни у владельца или в статистике канала.'],
        ['Прирост за 30 дней', 'Насколько изменилось число подписчиков за месяц. Плавный органический рост — признак живого канала. Резкий скачок вверх без вирусного повода почти всегда означает закупку или накрутку: после неё охват проседает, и реклама, купленная сразу после разгона, выходит на спаде. Заметный отток — тоже сигнал: аудитория теряет интерес.'],
        ['Частота постов', 'Сколько публикаций выходит в неделю. Слишком редко (1–2 в неделю) — аудитория отвыкает и слабее реагирует; слишком часто (5+ в день) — реклама быстро тонет в потоке и живёт считаные часы. Оптимум зависит от ниши. Частота напрямую влияет на то, как долго твой пост держится на виду у читателя до того, как его перекроют новыми. Отдельно оценивай рекламную нагрузку: канал с 4–5 рекламными постами в день выжигает аудиторию, и твоё объявление в нём тонет — это важнее общей частоты.'],
        ['Просмотры в месяц', 'Суммарные просмотры всех постов за месяц — общий трафик канала. Помогает прикинуть масштаб: сколько всего показов канал даёт за пределами одного поста и сколько размещений способен продать, не перегружая аудиторию рекламой. На цену контакта напрямую не влияет — для сравнения каналов используй охват и CPM.'],
        ['Медиана CPM ниши', 'Серединная рыночная цена контакта в конкретной нише (половина офферов дешевле, половина дороже) — ориентир справедливой цены. Если медиана CPM в нише 300 ₽, а канал просит эквивалент 600 ₽ — размещение переоценено вдвое; 150 ₽ — недооценено, для закупщика это окно. Медианы по нишам показываются в Рыночном терминале. Считаются на реальных ценах офферов Площадки и на нашей расчётной оценке каналов Радара — по Радару это ориентир от таблицы CPM ниши, а не подтверждённые сделки. Пока офферов мало, медиана Радара говорит в основном о нашей же модели цены.'],
        ['Накрутка', 'Искусственные подписчики, просмотры или реакции. Признаки: большая база при крошечном охвате (низкий ERR), резкие скачки просмотров без причины, ровные «полки» и ночные пики на графике, ER около нуля. Как проверить вручную: открой комментарии — живые ли профили с историей и осмысленные ли тексты; сопоставь реакции с комментариями — много реакций при пустом обсуждении часто означает купленные реакции (они дешевле просмотров и встречаются чаще, чем думают). Индикатор здоровья подсвечивает подозрительные каналы жёлтым или красным, а бейдж «Фрод-контроль пройден» выдаётся только когда проверки реально отработали и ни одна не сработала. Это результат наших проверок, а не гарантия качества канала: полностью исключить накрутку по публичным данным нельзя.'],
        ['Маркировка · erid', 'В ряде стран интернет-реклама подлежит обязательной маркировке (в России — токен erid, присваивается через оператора рекламных данных). Поле erid в оффере опциональное: заполняй для сделок, где маркировка обязательна. Площадка — посредник и сводит стороны; ответственность за маркировку несут стороны сделки. Согласуй erid и текст пометки до выхода поста.']
    ];
    var RULES = [
        ['Запрещено полностью', 'Наркотики и их пропаганда; оружие и взрывчатка; порнография; терроризм, экстремизм и символика запрещённых организаций; призывы к суициду и селф-харму; шок-контент — кровь, увечья, жестокость к людям и животным; торговля людьми, документами и краденым.'],
        ['Финансы и «схемы»', 'Пирамиды, скам-проекты, «бинарные опционы» и обещания гарантированного дохода — блокировка. Азартные игры — только лицензированные операторы с предупреждением о рисках. Кредитные продукты — только с полными и честными условиями.'],
        ['Здоровье и «чудо-средства»', 'Обещания вылечить болезни, «минус 20 кг за неделю» и псевдомедицина запрещены. Медицина, лекарства и добавки — только с корректными оговорками и без гарантий результата.'],
        ['Алкоголь, табак, вейпы', 'Реклама алкоголя, табака, вейпов и жидкостей для них на Площадке не размещается — в любом виде, включая «обзоры» с промокодами.'],
        ['Картинки, GIF и видео', 'Без чужих брендов, логотипов и персонажей — это чужая интеллектуальная собственность. Без реальных людей без их согласия, включая дипфейки. Без строб-вспышек чаще 3 раз в секунду. Дети в рекламе — только когда это оправдано самим товаром.'],
        ['Эмодзи и стикеры', 'Стикер или эмодзи с запрещённой символикой, наркотиками или 18+ — то же нарушение, что и картинка. Комбинации эмодзи, маскирующие запрещённые товары, тоже считаются нарушением.'],
        ['18+ и серая зона', 'Эротика 18+ — только в отдельном разделе с подтверждением возраста. Лицензируемые ниши — азартные игры, финансы, крипта — проверяются строже и дольше.'],
        ['Маркировка рекламы', 'В некоторых странах интернет-реклама подлежит обязательной маркировке (например, в России — токен erid). Это ответственность сторон сделки. Поле erid в оффере — опциональное: заполняй, если работаешь с аудиторией, где маркировка обязательна.'],
        ['Ответственность', 'За контент оффера отвечает тот, кто его разместил — это фиксируется при публикации. Также запрещено всё, что запрещено законами страны, на аудиторию которой направлена реклама. Нарушение — снятие оффера, повторное или грубое — бан. Пожаловаться на любой оффер можно в один тап.']
    ];
    var TIPS = [
        ['Закупщику · считай цену контакта, а не размещения', 'Ориентир — не цена поста, а CPM (цена ÷ охват × 1000). Пример: пост за 5 000 ₽ при охвате 20 000 даёт CPM 250 ₽; пост за 3 000 ₽ при охвате 8 000 — CPM 375 ₽. Второй дешевле на ценнике, но каждая тысяча показов обходится в полтора раза дороже. Сравнивай каналы одной ниши по CPM — это единственная честная база для сравнения.'],
        ['Закупщику · проверяй охват к подписчикам', 'Раздели средний охват поста на число подписчиков и сравни с нормой для размера канала: микро до 5к — 25–50%, малый 5–10к — 18–35%, средний 10к–100к — 7–22%, крупный 100к–1М — 6–16%, миллионник — 3–10%. Сравнивать канал на 3 000 подписчиков с миллионником по одной шкале бессмысленно. Канал со 100 000 подписчиков и охватом 2 000 (2%) — почти всегда выгоревшая или накрученная база: платишь за число в шапке, а рекламу увидят единицы. Поправка: у небольших каналов процент естественно выше, у очень крупных ниже — это нормально.'],
        ['Закупщику · читай ER в паре с охватом', 'Высокий охват при ER около нуля означает, что аудиторию привели, но канал ей неинтересен. Живой канал с ER 5–10% нередко конвертирует лучше крупного с ER 1%. Реакции — лайки, репосты, комментарии — подделать дороже, чем просмотры, поэтому ER точнее показывает вовлечённость.'],
        ['Закупщику · проверяй метрики вживую, не по скриншотам', 'Скриншот статистики легко нарисовать или показать удачный день. Ориентируйся на живые метрики в оффере и на разворот канала, а не на присланные картинки. Если продавец отказывается показать актуальный охват и просит верить на слово — это повод насторожиться.'],
        ['Закупщику · оценивай динамику, а не снимок дня', 'Резкий скачок подписчиков за 30 дней без вирусного повода — частый признак закупки или накрутки; после него охват проседает, и реклама выходит на спаде. Плавный органический рост надёжнее. Жёлтый или красный светофор — сигнал открыть «Развернуть» и проверить график просмотров вручную.'],
        ['Закупщику · релевантность ниши важнее размера', 'Реклама финансового оффера в профильном канале о финансах отработает лучше, чем во вдвое большем канале о рецептах. Бейдж «В нише» помечает каналы твоей ниши. Узкий, но релевантный канал обычно даёт более дешёвую и качественную конверсию, чем широкий, но нерелевантный охват.'],
        ['Закупщику · сверяй гео и язык аудитории с оффером', 'Отличные ER и охват на аудитории из недорогого гео или на чужом языке денег не принесут — оффер платит по конкретным странам. Перед закупкой уточни топ-страны и язык аудитории (у владельца или в статистике канала) и бери канал под гео и язык своего оффера, а не только под нишу.'],
        ['Закупщику · оценивай сам рекламный пост, не только канал', 'Даже в сильном канале слабый креатив не даст результата. Продумай пост: понятная выгода в первой строке, один призыв к действию, ссылка с меткой. Один и тот же канал на разных креативах даёт разный CPA — тестируй заход и формулировку, а не только площадку.'],
        ['Закупщику · начинай с теста, масштабируй по результату', 'Первое размещение в новом канале бери минимальным форматом. Замерь по одному посту переходы, подписки и продажи в окне 24–48 часов после выхода (за час рано — пост не добрал, через неделю поздно) и посчитай стоимость целевого действия (потрачено ÷ результат). Сработало — бери пакет и повторяй; нет — потеря невелика, а вывод получен. Не вкладывай весь бюджет в непроверенный канал.'],
        ['Закупщику · веди список проверенных и чёрный список', 'Сработавшие каналы записывай и возвращайся к ним пакетами — предсказуемый результат дешевле постоянного поиска. Каналы с завышенной ценой, накруткой или невыполненными договорённостями держи в чёрном списке. Со временем свой проверенный пул важнее любого каталога.'],
        ['Закупщику · учитывай сезонность цен', 'CPM не постоянен: в высокий сезон (например, ноябрь–декабрь) спрос на рекламу и цены растут, летом часто проседают. Планируй закуп заранее и сравнивай цену не только между каналами, но и с медианой ниши на текущий момент — то, что весной было дорого, осенью может оказаться в рынке.'],
        ['Закупщику · учитывай рекламную нагрузку и пересечение аудиторий', 'Смотри, сколько рекламы в день даёт канал: частые размещения выжигают отклик, и твой пост теряется среди других. При пакетной закупке нескольких каналов одной ниши аудитории пересекаются — рискуешь дважды заплатить за одних и тех же людей. Разноси такие закупки по времени и по разным сегментам.'],
        ['Закупщику · цена в оффере стартовая — торгуйся', 'За пакет и повторные размещения уместно просить скидку, для первого теста — сниженную цену или минимальный формат. Опирайся в торге на медиану CPM ниши из Рыночного терминала: если просят заметно выше рынка, это аргумент снизить цену. Фиксированной цены в закупе рекламы обычно нет.'],
        ['Владельцу · заполняй оффер полностью', 'Оффер с обложкой, чётким форматом, ценой и живыми метриками собирает больше откликов, чем пустой. Рекламодатель отсеивает каналы за секунды: не видит охват, ER и цену — переходит к следующему. Каждое незаполненное поле — это потерянный клиент.'],
        ['Владельцу · назначай цену от реального охвата', 'Считай стоимость размещения через CPM своей ниши. При медиане CPM 300 ₽ и среднем охвате 10 000 ориентировочная цена поста — около 3 000 ₽. Завысишь вдвое — оффер провисит без сделок; занизишь — недозаработаешь. Ориентиры по нишам смотри в Рыночном терминале.'],
        ['Владельцу · наращивай подтверждённую репутацию', 'Бейдж «Владелец подтверждён» (бот — администратор канала) и подтверждённые сделки с рейтингом снимают у покупателя главный вопрос «заплачу — и что получу». Канал с тремя сделками и рейтингом 4,8 продаёт дороже и быстрее безымянного. Репутация копится только по сделкам, проведённым через Площадку.'],
        ['Владельцу · держи метрики честными', 'Накрутка подписчиков роняет ERR и включает красный светофор — опытный закупщик это видит и уходит. Живой канал с бейджем «Фрод-контроль пройден» вызывает больше доверия, чем формально крупный с выгоревшей базой. Честные метрики — это актив, который работает на цену размещения.'],
        ['Обеим сторонам · согласуй условия до оплаты и фиксируй сделку', 'Площадка сводит стороны, но условия ведёте вы: дата выхода, формат, длительность закрепа, маркировка — обсуди их до перевода денег. С новым продавцом безопаснее постоплата или дробление оплаты, с проверенным можно предоплату; заранее оговори возврат или бесплатное переразмещение при недоборе охвата. Оформляй размещение через сделку на Площадке: так фиксируется факт и копится рейтинг, а на случай спора сохрани ссылку на пост и скриншот и сверь фактическую длительность размещения с договорённостью.'],
        ['Обеим сторонам · не забывай о маркировке рекламы', 'Если реклама направлена на аудиторию страны, где действует обязательная маркировка (в России — токен erid), заполни поле erid в оффере и согласуй маркировку со второй стороной до выхода поста. Ответственность за маркировку несут стороны сделки, а не Площадка.']
    ];

    function _esc(s) { if (s == null) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function _short(n) {
        if (n == null) return '—';
        if (n >= 1000000) return (Math.round(n / 100000) / 10 + '').replace('.', ',') + 'М';
        if (n >= 1000) return (Math.round(n / 100) / 10 + '').replace('.', ',') + 'К';
        return String(n);
    }
    function _num(n) { if (n == null || isNaN(n)) return '—'; return Number(n).toLocaleString('ru-RU'); }
    function _kmNum(n) { if (n == null || isNaN(n)) return '—'; n = Number(n); return Math.abs(n) >= 100000 ? _short(n) : _num(Math.round(n)); }
    function uiAlert(msg) {
        var t = el('fmx-toastEl');
        if (!t) { t = document.createElement('div'); t.id = 'fmx-toastEl'; t.className = 'fmx-toast'; document.body.appendChild(t); }
        t.innerHTML = '<i class="ti ti-alert-circle" style="color:#ef4444;"></i> ' + _esc(String(msg));
        t.classList.add('on', 'err');
        clearTimeout(_toastTo);
        _toastTo = setTimeout(function () { t.classList.remove('on', 'err'); }, 3600);
    }
    function uiConfirm(msg, cb) {
        var old = el('fmx-cfmBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-cfmBg'; bg.className = 'fmx-cfm solid';
        bg.innerHTML = '<div class="fmx-cfm-box"><div class="fmx-cfm-t">' + _esc(String(msg)) + '</div>' +
            '<div class="fmx-cfm-r"><button class="fmx-btn" data-no>Отмена</button><button class="fmx-btn" data-yes style="background:#818cf8;color:#fff;border-color:transparent;">Да</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.querySelector('[data-no]').addEventListener('click', done);
        bg.querySelector('[data-yes]').addEventListener('click', function () { done(); cb(); });
    }
    function _haptic(k) { try { if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) { if (k === 'success' || k === 'error' || k === 'warning') tg.HapticFeedback.notificationOccurred(k); else tg.HapticFeedback.impactOccurred(k || 'light'); } } catch (e) {} }
    function apiGet(p) { return apiRequest(p); }
    function apiPost(p, b) { var o = { method: 'POST' }; if (b !== undefined) { o.body = JSON.stringify(b); o.headers = { 'Content-Type': 'application/json' }; } return apiRequest(p, o); }
    function apiPatch(p, b) { var o = { method: 'PATCH' }; if (b !== undefined) { o.body = JSON.stringify(b); o.headers = { 'Content-Type': 'application/json' }; } return apiRequest(p, o); }
    function apiDelete(p) { return apiRequest(p, { method: 'DELETE' }); }
    function el(id) { return document.getElementById(id); }
    function qsa(scope, sel) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }
    function _hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; } return h; }
    function _minPrice(l) {
        if (typeof l.min_price === 'number' && l.min_price > 0) return l.min_price;
        var m = null;
        if (l.formats && l.formats.length) {
            for (var i = 0; i < l.formats.length; i++) {
                var p = l.formats[i].price;
                if (p && (m === null || p < m)) m = p;
            }
        }
        return m;
    }
    function _reachRate(l) { if (l.reach_rate != null) return Math.round(l.reach_rate); if (l.er != null) return Math.round(l.er); if (!l.subscribers || !l.avg_views) return null; return Math.round(l.avg_views / l.subscribers * 100); }
    function _basePrice(l) {
        if (typeof l.base_price === 'number' && l.base_price > 0) return l.base_price;
        if (l.formats && l.formats.length) {
            for (var i = 0; i < l.formats.length; i++) {
                if (_fmtKey(l.formats[i].format) === 'h1_24' && l.formats[i].price) return l.formats[i].price;
            }
        }
        return _minPrice(l);
    }
    function _reach(l) { return (typeof l.ad_reach_24h === 'number' && l.ad_reach_24h > 0) ? l.ad_reach_24h : l.avg_views; }
    function _cpm(l) { var v = _reach(l), p = _basePrice(l); if (!p || !v) return null; return Math.round(p / v * 1000); }
    var _nicheMap = null;
    function loadNicheMap() {
        if (_nicheMap !== null) return;
        _nicheMap = {};
        apiGet('/api/v1/marketplace/niche_map').then(function (r) {
            if (r && r.ok && r.map) _nicheMap = r.map;
        }).catch(function () {});
    }
    function _canonSet(text) {
        var norm = String(text || '').toLowerCase().replace(/ё/g, 'е').trim();
        var toks = norm.match(/[a-zа-я0-9+]+/g) || [];
        var out = {};
        var map = _nicheMap || {};
        for (var canon in map) {
            var roots = map[canon];
            for (var i = 0; i < roots.length; i++) {
                var r = roots[i];
                if (r.indexOf(' ') >= 0) { if (norm.indexOf(r) >= 0) { out[canon] = 1; break; } }
                else if (r.length <= 3) { if (toks.indexOf(r) >= 0) { out[canon] = 1; break; } }
                else if (toks.some(function (t) { return t.indexOf(r) === 0; })) { out[canon] = 1; break; }
            }
        }
        toks.forEach(function (t) { if (t.length >= 4) out['~' + t.slice(0, 6)] = 1; });
        return out;
    }
    function nichesMatch(a, b) {
        if (!a || !b) return false;
        var sa = _canonSet(a), sb = _canonSet(b);
        for (var k in sa) if (sb[k]) return true;
        return false;
    }
    function _myNichesStr() {
        var actId = null;
        try { actId = (typeof window !== 'undefined' && window.__fmActiveChannelId != null) ? window.__fmActiveChannelId : null; } catch (e) {}
        if (actId != null) {
            for (var i = 0; i < (_channels || []).length; i++) {
                if (String(_channels[i].id) === String(actId) && _channels[i].niche) return String(_channels[i].niche);
            }
        }
        if (_channels && _channels.length === 1 && _channels[0].niche) return String(_channels[0].niche);
        return '';
    }

    window.__fmxActiveChannelChanged = function () {
        try {
            _chLoaded = false;
            _chLoading = false;
            if (_mainTab === 'market' && _subTab === 'buy') {
                loadChannels().then(function () {
                    _chLoaded = true;
                    if (typeof loadFeed === 'function') loadFeed(true);
                    else if (typeof paintBuyBody === 'function') paintBuyBody();
                }).catch(function () { _chLoaded = true; });
            }
        } catch (e) {}
    };
    function _nicheMatch(l) {
        if (!l || !l.niche) return false;
        return nichesMatch(_myNichesStr(), l.niche);
    }
    function _applySort(arr) {
        if (_sort === 'match') return arr.filter(_nicheMatch);
        if (_sort === 'niche' && _nicheSel) return arr.filter(function (l) { return l.niche && _nicheHit(_nicheSel, l.niche); });
        return arr;
    }
    function _hlInfo(l) {
        var m = { green: ['#5DCAA5', 'Здоровый'], amber: ['#f59e0b', 'Средний'], yellow: ['#f59e0b', 'Средний'], red: ['#ef4444', 'Риск'] };
        var cls = l.health_class && m[l.health_class] ? (l.health_class === 'yellow' ? 'amber' : l.health_class) : null;
        if (!cls && l.reach_status) { var st = l.reach_status; cls = (st === 'норма' || st === 'выше нормы') ? 'green' : (st === 'низковат') ? 'amber' : 'red'; }
        if (!cls) return { cls: 'none', color: '#565b73', word: 'Нет данных' };
        return { cls: cls, color: m[cls][0], word: m[cls][1] };
    }
    function trafficLight(l) {
        var h = _hlInfo(l);
        var dots = ['red', 'amber', 'green'].map(function (c) {
            return '<i class="' + c + (h.cls === c ? ' on' : '') + '"></i>';
        }).join('');
        return '<span class="fmx-tl">' + dots + '<b style="color:' + h.color + ';">' + h.word + '</b></span>';
    }
    function _healthColor(l) { var m = { green: '#5DCAA5', amber: '#f59e0b', yellow: '#f59e0b', red: '#ef4444' }; if (l.health_class && m[l.health_class]) return m[l.health_class]; if (l.reach_status) { var st = l.reach_status; return (st === 'норма' || st === 'выше нормы') ? '#5DCAA5' : (st === 'низковат') ? '#f59e0b' : '#ef4444'; } return '#565b73'; }
    function _warnTri(sz) { sz = sz || 14; return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" style="vertical-align:-2px;flex:0 0 auto;"><path d="M12 3.4 L21.7 20.2 A1.35 1.35 0 0 1 20.55 22.2 L3.45 22.2 A1.35 1.35 0 0 1 2.3 20.2 Z" fill="#f5b23d" stroke="#0a0d18" stroke-width="1.4" stroke-linejoin="round"/><rect x="10.9" y="8.4" width="2.2" height="6.2" rx="1.1" fill="#0a0d18"/><circle cx="12" cy="17.8" r="1.3" fill="#0a0d18"/></svg>'; }
    function mediaAbs(u) { if (!u) return u; if (/^(https?:|blob:|data:)/.test(u)) return u; var b = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : ''; return b + u; }
    function _posStyle(a) { if (!a || typeof a !== 'object') return 'object-position:center;'; return 'object-position:' + (a.x != null ? a.x : 50) + '% ' + (a.y != null ? a.y : 50) + '%;transform:scale(' + (a.s || 1) + ');transform-origin:' + (a.x != null ? a.x : 50) + '% ' + (a.y != null ? a.y : 50) + '%;'; }
    function _coverBg(l) { if (l.cover_type && l.cover_type !== 'grad' && l.cover_url) return "url('" + mediaAbs(l.cover_url) + "')"; if (l.cover_gradient) return l.cover_gradient; return COVERS[Math.abs(_hash(l.username || '')) % COVERS.length]; }
    function _accent(l) { return l.accent_color || '#818cf8'; }
    function _isTop(l) { if (l.is_vip || l.is_top) return true; if (l.top_until && new Date(l.top_until) > new Date()) return true; return false; }
    function _isMod() { try { return !!window.__fmIsMod; } catch (e) { return false; } }
    function _isBoost(l) { return !!(l.boost_until && new Date(l.boost_until) > new Date()); }
    function _priceFrom(l) { var p = _basePrice(l); return p ? _num(p) + ' ₽' : 'по запросу'; }

    function injectStyles() {
        if (el('fmx-style')) return;
        var s = document.createElement('style');
        s.id = 'fmx-style';
        s.textContent = [
            '#fmx-screen{position:fixed;inset:0;z-index:9000;display:none;flex-direction:column;background:#0a0d18;background-image:radial-gradient(900px 520px at 85% -12%,rgba(99,102,241,0.13),transparent 60%),radial-gradient(700px 520px at -12% 22%,rgba(93,202,165,0.07),transparent 55%);color:#e8e8ed;font-family:-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;overflow:hidden;}',
            '#fmx-screen.fmx-show{display:flex;}',
            '#fmx-screen *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}',
            '#fmx-screen .ti{line-height:1;}',
            '.fmx-head{display:flex;align-items:center;gap:9px;padding:14px 14px 12px;flex-shrink:0;min-width:0;max-width:640px;margin:0 auto;width:100%;}',
            '.fmx-hic{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05));border:1px solid rgba(99,102,241,0.32);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:20px;flex-shrink:0;}',
            '.fmx-head h1{margin:0;font-size:16px;font-weight:700;}',
            '.fmx-head p{margin:1px 0 0;font-size:11px;color:#8990a8;}',
            '.fmx-ibtn{width:34px;height:34px;border-radius:9px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;}',
            '@keyframes fmxPulse{0%{transform:scale(1);opacity:.55;}70%,100%{transform:scale(1.45);opacity:0;}}',
            '.fmx-ibtn.fmx-pulse{color:#818cf8;border-color:rgba(129,140,248,0.6);position:relative;}',
            '.fmx-ibtn.fmx-pulse::after{content:"";position:absolute;inset:-1px;border-radius:inherit;border:1.5px solid rgba(129,140,248,0.55);animation:fmxPulse 1.5s ease-out infinite;pointer-events:none;will-change:transform,opacity;}',
            '.fmx-ibtn.fmx-has{color:#f59e0b;border-color:rgba(245,158,11,0.3);}',
            '.fmx-bmc{position:absolute;top:-5px;right:-5px;background:#6366f1;color:#fff;font-size:9px;font-weight:700;min-width:15px;height:15px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px;}',
            '.fmx-pillbar{position:relative;display:flex;margin:0 16px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.10);border-radius:13px;padding:4px;flex-shrink:0;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}',
            '.fmx-pill{position:absolute;top:4px;left:4px;height:calc(100% - 8px);border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);transition:transform 380ms cubic-bezier(.2,.85,.25,1),width 380ms cubic-bezier(.2,.85,.25,1);box-shadow:0 4px 14px rgba(99,102,241,0.4);z-index:0;}',
            '.fmx-pb{flex:1;position:relative;z-index:1;border:none;background:transparent;color:#8990a8;padding:10px 3px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:color 260ms;white-space:nowrap;min-width:0;overflow:hidden;}',
            '.fmx-pb.on{color:#fff;}',
            '.fmx-sellcta{display:flex;align-items:center;gap:12px;padding:13px;border-radius:15px;margin:0 0 9px;cursor:pointer;background:linear-gradient(135deg,rgba(93,202,165,0.14),rgba(16,185,129,0.05));border:1px solid rgba(93,202,165,0.34);transition:transform 0.15s,box-shadow 0.15s;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
            '.fmx-sellcta:active{transform:scale(0.99);}',
            '.fmx-sellcta-ic{width:44px;height:44px;border-radius:13px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(93,202,165,0.15),rgba(93,202,165,0.05));border:1px solid rgba(93,202,165,0.32);color:#5DCAA5;font-size:22px;}',
            '.fmx-sellcta-t{flex:1;min-width:0;}',
            '.fmx-sellcta-t .n{font-size:13.5px;font-weight:800;color:#5DCAA5;overflow-wrap:anywhere;}',
            '.fmx-sellcta-t .s{font-size:11px;color:#8990a8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-sellcta-go{color:#5DCAA5;font-size:20px;flex:0 0 auto;}',
            '.fmx-mkhelper{font-size:11.5px;color:#8990a8;line-height:1.45;margin:0 2px 11px;}',
            '.fmx-mkhelper b{color:#e8e8ed;font-weight:700;}',
            '.fmx-reqlink{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:transparent;border:none;color:#8990a8;font-size:11.5px;font-weight:600;padding:2px 0 13px;cursor:pointer;}',
            '.fmx-reqlink i{font-size:14px;}',
            '.fmx-scroll{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(129,140,248,0.35) transparent;scrollbar-gutter:stable;}',
            '.fmx-scroll::-webkit-scrollbar{width:5px;}',
            '.fmx-scroll::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-scroll::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.22);border-radius:99px;}',
            '.fmx-scroll:hover::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.55);}',
            '.fmx-scroll::-webkit-scrollbar-thumb:hover{background:rgba(165,173,255,0.8);}',
            '.fmx-hscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(129,140,248,0.35) transparent;}',
            '.fmx-hscroll::-webkit-scrollbar{height:5px;}',
            '.fmx-hscroll::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-hscroll::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.22);border-radius:99px;}',
            '.fmx-hscroll:hover::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.55);}',
            '.fmx-hscroll::-webkit-scrollbar-thumb:hover{background:rgba(165,173,255,0.8);}',
            '.fmx-pad{padding:14px 16px 28px;max-width:640px;margin:0 auto;width:100%;min-width:0;}',
            '@keyframes fmxFade{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}',
            '.fmx-fade{animation:fmxFade 320ms cubic-bezier(.2,.8,.2,1);}',
            '.fmx-note{font-size:11.5px;line-height:1.5;color:#8990a8;background:rgba(99,102,241,0.07);border:0.5px solid rgba(99,102,241,0.22);border-radius:10px;padding:10px 12px;margin-bottom:14px;display:flex;gap:7px;align-items:flex-start;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
            '.fmx-note i{color:#818cf8;flex-shrink:0;margin-top:1px;}',
            '.fmx-note.fmx-gr{background:rgba(93,202,165,0.08);border-color:rgba(93,202,165,0.25);}.fmx-note.fmx-gr i{color:#5DCAA5;}',
            '.fmx-nichebtn{display:flex;align-items:center;gap:9px;width:100%;margin-bottom:9px;padding:12px 14px;border-radius:12px;cursor:pointer;font-family:inherit;font-size:13.5px;font-weight:650;color:#c7ccf7;background:linear-gradient(135deg,rgba(129,140,248,0.18),rgba(129,140,248,0.06));border:1px solid rgba(129,140,248,0.4);transition:all 160ms;}',
            '.fmx-nichebtn i:first-child{font-size:17px;color:#818cf8;}',
            '.fmx-nichebtn span{flex:1;text-align:left;}',
            '.fmx-nichebtn-chev{color:#818cf8;font-size:16px;}',
            '.fmx-picks{display:flex;gap:7px;align-items:stretch;margin-bottom:9px;}',
            '.fmx-picks>.fmx-nichebtn{width:auto;flex:1 1 0;min-width:0;margin-bottom:0;padding:11px 12px;gap:7px;font-size:12.5px;}',
            '.fmx-picks>.fmx-nichebtn>span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-picks .fmx-nichebtn-chev{display:none;}',
            '.fmx-campbtn{flex:1 1 0;min-width:0;display:flex;align-items:center;gap:7px;padding:11px 12px;border-radius:12px;cursor:pointer;font-family:inherit;font-size:12.5px;font-weight:650;color:#9fe3cc;background:linear-gradient(135deg,rgba(93,202,165,0.16),rgba(93,202,165,0.05));border:1px solid rgba(93,202,165,0.34);transition:all 160ms;}',
            '.fmx-campbtn>i{font-size:15px;flex:0 0 auto;color:#5DCAA5;}',
            '.fmx-campbtn>span{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-bellbtn{flex:0 0 auto;width:46px;padding:0;border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;color:#818cf8;font-family:inherit;background:linear-gradient(135deg,rgba(129,140,248,0.18),rgba(129,140,248,0.06));border:1px solid rgba(129,140,248,0.4);transition:all 160ms;}',
            '.fmx-bellbtn:active{background:linear-gradient(135deg,rgba(129,140,248,0.3),rgba(129,140,248,0.12));}',
            '.fmx-nichebtn.on{background:linear-gradient(135deg,rgba(129,140,248,0.3),rgba(129,140,248,0.12));border-color:rgba(129,140,248,0.6);color:#fff;}',
            '.fmx-sortbar{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;}',
            '.fmx-seg{flex-shrink:0;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:99px;padding:8px 13px;font-size:11.5px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 160ms;}',
            '.fmx-seg.on{background:rgba(99,102,241,0.14);color:#818cf8;border-color:rgba(99,102,241,0.3);}',
            '.fmx-search{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:9px 11px;margin-bottom:14px;}',
            '.fmx-search input{flex:1;background:transparent;border:none;outline:none;color:#e8e8ed;font-size:13px;font-family:inherit;}',
            '.fmx-search i{color:#565b73;}',
            '.fmx-toprow{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:10px;}',
            '.fmx-divrow{display:flex;align-items:center;gap:9px;margin-bottom:12px;}',
            '.fmx-divlbl{font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:#565b73;font-weight:700;flex:0 1 auto;min-width:0;overflow-wrap:anywhere;}',
            '.fmx-divline{flex:1;height:1px;background:rgba(255,255,255,0.09);min-width:8px;}',
            '.fmx-vtog{display:flex;gap:3px;background:rgba(255,255,255,0.04);padding:3px;border-radius:9px;}',
            '.fmx-vt{border:none;background:transparent;color:#8990a8;border-radius:7px;padding:7px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all 150ms;}',
            '.fmx-vt.on{background:rgba(99,102,241,0.14);color:#818cf8;}',
            '.fmx-promo{border:0.5px solid rgba(245,191,79,0.4);background:rgba(245,191,79,0.1);color:#f5bf4f;border-radius:10px;padding:8px 12px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;}',
            '.fmx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,350px));gap:12px;justify-content:center;}',
            '.fmx-empty{text-align:center;padding:54px 20px;color:#8990a8;}',
            '.fmx-empty .ti{font-size:40px;opacity:0.3;}',
            '.fmx-empty h3{margin:14px 0 5px;font-size:15px;font-weight:700;color:#e8e8ed;}',
            '.fmx-empty p{margin:0;font-size:12.5px;line-height:1.5;max-width:300px;margin-left:auto;margin-right:auto;}',
            '.fmx-load{text-align:center;padding:54px;color:#8990a8;}',
            '.fmx-cwrap{width:100%;position:relative;overflow:visible;}',
            ".fmx-cwrap>.fmx-card,.fmx-zw>*{font-family:'Inter',-apple-system,'Segoe UI',Roboto,sans-serif;}",
            '.fmx-lprice{font-variant-numeric:tabular-nums;}',
            '.fmx-cwrap>.fmx-card{width:350px;transform-origin:top left;}',
            '.fmx-zw{width:100%;position:relative;}',
            '.fmx-zw>*{width:350px;max-width:none;transform-origin:top left;box-sizing:border-box;}',
            '.fmx-zw>.fmx-li{width:100%;max-width:350px;margin-left:auto;margin-right:auto;transform:none;}',
            '.fmx-card{position:relative;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 200ms,transform 200ms;}',
            '.fmx-card:hover{border-color:rgba(255,255,255,0.14);transform:translateY(-2px);}',
            '@keyframes fmxGoldGlow{0%,100%{opacity:.25;}50%{opacity:1;}}',
            '.fmx-card.fmx-prem{border-color:transparent;box-shadow:0 4px 16px rgba(0,0,0,0.45),0 0 12px -4px rgba(245,191,79,0.42),0 6px 20px -14px rgba(245,191,79,0.38);}',
            '.fmx-card.fmx-prem::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 20px -4px rgba(245,191,79,0.55),0 8px 28px -14px rgba(245,191,79,0.45);opacity:.25;animation:fmxGoldGlow 4.6s ease-in-out infinite;pointer-events:none;will-change:opacity;z-index:0;}',
            '.fmx-card.fmx-prem::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.3px;background:linear-gradient(135deg,rgba(255,236,175,0.98),rgba(245,191,79,0.6) 26%,rgba(168,120,40,0.5) 50%,rgba(245,191,79,0.62) 74%,rgba(255,232,160,0.95));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;z-index:5;}',
            '@media (prefers-reduced-motion:reduce){.fmx-card.fmx-prem::after{animation:none;}}',
            '.fmx-cov{height:84px;position:relative;overflow:hidden;z-index:1;}',
            '.fmx-cov-sep{box-shadow:0 1px 0 rgba(255,255,255,0.16),0 5px 12px -4px rgba(0,0,0,0.6);}',
            '.fmx-fullbg .fmx-crow{margin-top:0;}',
            '.fmx-fullbg .fmx-cb{padding-top:34px;}',
            '.fmx-fullbg .fmx-cbg-s{background:linear-gradient(180deg,rgba(10,13,24,0.5),rgba(10,13,24,0.55) 35%,rgba(10,13,24,0.9));}',
            '.fmx-cov,.fmx-cov *,.fmx-av,.fmx-av *,.fmx-avw,.fmx-avw *{-webkit-touch-callout:none;-webkit-user-drag:none;user-drag:none;user-select:none;-webkit-user-select:none;}',
            '.fmx-cov img,.fmx-av img,.fmx-avw img{pointer-events:none;}',
            '.fmx-cov-bg{position:absolute;inset:0;background-size:cover;background-position:center;}',
            '.fmx-cov-bg::before{content:"";position:absolute;inset:-20%;background:radial-gradient(120% 130% at 22% 8%,rgba(255,255,255,0.4),transparent 55%);animation:fmxBreathe 7s ease-in-out infinite;}',
            '@keyframes fmxBreathe{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(8%,6%) scale(1.12);}}',
            '.fmx-tag{position:absolute;top:9px;left:9px;font-size:9px;font-weight:700;padding:4px 8px;border-radius:6px;background:rgba(10,13,24,0.5);color:#5DCAA5;backdrop-filter:blur(5px);z-index:7;display:flex;align-items:center;gap:4px;}',
            '.fmx-tag.gold{background:linear-gradient(135deg,#fde68a,#f5bf4f);color:#2a1c00;}',
            '.fmx-star{position:absolute;bottom:9px;right:9px;width:30px;height:30px;border-radius:8px;background:rgba(10,13,24,0.45);border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);z-index:2;}',
            '.fmx-star.on{color:#f59e0b;}',
            '.fmx-btn.on{color:#f59e0b;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.08);}',
            '.fmx-cb{padding:11px 13px 12px;position:relative;z-index:3;}',
            '.fmx-crow{display:flex;align-items:center;gap:10px;margin-top:-32px;margin-bottom:9px;position:relative;z-index:2;}',
            '.fmx-av{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#fff;border:2.5px solid #0d1019;flex-shrink:0;}',
            '.fmx-nm{font-size:14px;font-weight:700;display:flex;align-items:center;gap:5px;padding-top:20px;}',
            '.fmx-seal{color:#818cf8;font-size:14px;}',
            '.fmx-meta{font-size:10.5px;color:#8990a8;margin-top:2px;}',
            '.fmx-badges{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}',
            '.fmx-aud{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:7px;border:0.5px solid;white-space:nowrap;line-height:1.5;}',
            '.fmx-aud i{font-size:12px;}',
            '.fmx-covbdg{position:absolute;left:9px;bottom:8px;right:46px;display:flex;gap:5px;flex-wrap:wrap;z-index:7;}',
            '.fmx-covbdg .fmx-bdg,.fmx-covbdg .fmx-tl{background:rgba(10,13,24,0.55);border-color:rgba(255,255,255,0.14);}',
            '.fmx-bfree{position:absolute;z-index:6;background:rgba(10,13,24,0.55);border:0.5px solid rgba(255,255,255,0.14);}',
            '.fmx-bslot{position:absolute;border:1.5px dashed rgba(255,255,255,0.4);border-radius:10px;background:rgba(255,255,255,0.05);z-index:8;pointer-events:none;display:flex;align-items:center;justify-content:center;}',
            '.fmx-bslot i{font-style:normal;font-size:9px;color:#8990a8;letter-spacing:0.3px;}',
            '.fmx-bslot.hot{border-color:#5DCAA5;background:rgba(93,202,165,0.14);}',
            '.fmx-bslot.hot i{color:#5DCAA5;}',
            '.fmx-bdg{font-size:10px;font-weight:600;padding:4px 8px;border-radius:7px;display:inline-flex;align-items:center;gap:4px;}',
            '.fmx-bdg i{font-size:11px;}',
            '.fmx-bgd-card{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:12px 13px;margin-bottom:9px;}',
            '.fmx-bgd-badge{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:9px;}',
            '.fmx-bgd-badge .fmx-bdg{white-space:nowrap;}',
            '.fmx-tlrow .fmx-bgd-badge{flex:0 0 134px;margin-bottom:0;}',
            '@media (max-width:359px){.fmx-tlrow .fmx-bgd-badge{flex:0 0 118px;}}',
            '.fmx-bgd-txt{flex:1;min-width:0;}',
            '.fmx-bgd-title{font-size:13px;font-weight:700;color:#e8e8ed;margin-bottom:4px;}',
            '.fmx-bgd-desc{font-size:12px;color:#a9aec0;line-height:1.5;}',
            '.fmx-bgd-desc .fmx-hp{margin:5px 0 0;text-indent:12px;}',
            '.fmx-bgd-badge .fmx-bdg{font-size:11px;padding:5px 10px;font-weight:700;}',
            '.fmx-bgd-badge .fmx-bdg i{font-size:14px;}',
            '.fmx-bgd-health{flex-direction:column;align-items:stretch;gap:0;}',
            '.fmx-tlrow{display:flex;gap:10px;align-items:flex-start;margin-top:9px;}',
            '.fmx-tlcell{flex-shrink:0;}',
            '.fmx-bgd-health .fmx-tl{width:112px;box-sizing:border-box;justify-content:flex-start;padding:5px 10px;white-space:nowrap;}',
            '.fmx-bgd-health .fmx-tl i{width:8px;height:8px;}',
            '.fmx-bgd-health .fmx-tl b{font-size:10px;}',
            '.fmx-tldesc{flex:1;min-width:0;font-size:12px;color:#a9aec0;line-height:1.4;}',
            '.fmx-bp{background:transparent;border:1px solid;}',
            '.fmx-bp.p1{color:#5dcaa5;border-color:rgba(93,202,165,0.34);}',
            '.fmx-bp.p2{color:#a9cb5c;border-color:rgba(169,203,92,0.34);}',
            '.fmx-bp.p3{color:#f5bf4f;border-color:rgba(245,191,79,0.34);}',
            '.fmx-bp.p4{color:#f08a3c;border-color:rgba(240,138,60,0.34);}',
            '.fmx-bp.p5{color:#ef4444;border-color:rgba(239,68,68,0.36);}',
            '.fmx-bp svg{display:block;flex:0 0 auto;}',
            '.fmr-pulse{margin-top:6px;display:flex;}',
            '.fmx-b-safe{background:rgba(99,102,241,0.13);color:#818cf8;}',
            '.fmx-b-owner{background:rgba(56,150,220,0.15);color:#5ab0e6;}',
            '.fmx-b-nofraud{background:rgba(93,202,165,0.13);color:#5DCAA5;}',
            '.fmx-b-big{background:rgba(245,158,11,0.13);color:#f59e0b;}',
            '.fmx-b-match{background:rgba(139,92,246,0.16);color:#a78bfa;}',
            '.fmx-desc{font-size:12px;color:#b9bdcf;line-height:1.45;margin-bottom:9px;}',
            '.fmx-kmh{display:flex;justify-content:space-between;align-items:center;margin:12px 1px 7px;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#565b73;}',
            '.fmx-kmg{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.07);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;overflow:hidden;margin-bottom:12px;}',
            '.fmx-kmt{background:#12162a;padding:9px 10px;min-width:0;}',
            '.fmx-kmt .l{font-size:8.5px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:#565b73;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-kmt .v{font-size:17px;font-weight:750;letter-spacing:-0.02em;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8e8ed;font-variant-numeric:tabular-nums;}',
            '.fmx-kmt .s{font-size:9.5px;color:#9aa0b8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmr-sec.num{font-size:12.5px;letter-spacing:0.02em;text-transform:none;font-weight:700;color:#c7cdfb;margin:0 0 8px;}',
            '.fmr-gline{display:flex;align-items:center;gap:8px;margin-top:4px;}',
            '.fmr-gline .gl{font-size:10.5px;font-weight:700;flex:0 0 auto;white-space:nowrap;}',
            '.fmr-gline .gl.m{color:#6ea8ff;}',
            '.fmr-gline .gl.f{color:#f08bb4;}',
            '.fmr-gbar{flex:1;height:12px;border-radius:7px;overflow:hidden;display:flex;background:rgba(255,255,255,0.05);}',
            '.fmr-gbar .gm{background:linear-gradient(90deg,#4f7ef0,#6ea8ff);}',
            '.fmr-gbar .gf{background:linear-gradient(90deg,#e26a99,#f08bb4);}',
            '.fmr-gsrc{font-size:9px;color:#565b73;margin-top:4px;}',
            '.fmr-gtab{margin-top:8px;}',
            '.fmr-gtab .r{display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:11px;border-bottom:0.5px solid rgba(255,255,255,0.05);}',
            '.fmr-gtab .r:last-child{border-bottom:0;}',
            '.fmr-gtab .l{color:#8990a8;}',
            '.fmx-cfm-box.fmx-tpbox{max-width:480px;width:calc(100vw - 24px);left:50%;transform:translateX(-50%);margin-left:0;bottom:14px;}',
            '.fmx-tpx{margin-left:auto;color:#565b73;cursor:pointer;padding:4px;}',
            '.fmx-tptabs{display:flex;gap:6px;background:rgba(255,255,255,0.04);border-radius:11px;padding:4px;margin:10px 0 11px;}',
            '.fmx-tptab{flex:1;text-align:center;padding:8px 4px;border-radius:8px;font-size:12px;font-weight:700;color:#8990a8;cursor:pointer;border:1px solid transparent;}',
            '.fmx-tptab.on{background:rgba(129,140,248,0.16);color:#c3c9f4;border-color:rgba(129,140,248,0.3);}',
            '.fmx-tpbody{max-height:min(56vh, 460px);overflow-y:auto;overscroll-behavior:contain;}',
            '.fmx-tpsec{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:11px 12px;margin-bottom:8px;}',
            '.fmx-tpsec .t{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:750;color:#e8e8ed;margin-bottom:5px;}',
            '.fmx-tpsec p{margin:0;font-size:11.5px;color:#a9aec0;line-height:1.5;overflow-wrap:anywhere;}',
            '.fmx-tpsec p + p{margin-top:5px;}',
            '.fmx-tpfoot{font-size:9.5px;color:#565b73;text-align:center;margin-top:9px;line-height:1.5;}',
            '.fmx-tplink{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;padding:9px;font-size:11.5px;color:#8990a8;cursor:pointer;border:0.5px dashed rgba(255,255,255,0.14);border-radius:11px;min-height:40px;}',
            '.fmx-tplink i{color:#818cf8;}',
            '.fmr-agerow{font-size:11px;color:#a9aec0;margin-top:6px;}',
            '.fmr-agerow b{color:#e8e8ed;}',
            '.fmr-cvwrap{display:flex;align-items:flex-end;gap:3px;height:78px;margin-top:9px;}',
            '.fmr-cvcol{flex:1 1 0;min-width:0;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:2px;}',
            '.fmr-cvbar{width:100%;max-width:26px;border-radius:4px 4px 0 0;min-height:4px;}',
            '.fmr-cvlb{font-size:8.5px;color:#565b73;white-space:nowrap;}',
            '.fmr-cvvl{font-size:9px;color:#a9aec0;font-variant-numeric:tabular-nums;white-space:nowrap;}',
            '.fmr-cvwarn{font-size:10px;color:#f0a24f;margin-top:7px;line-height:1.35;overflow-wrap:anywhere;}',
            '.fmr-sbwrap{margin-top:9px;}',
            '.fmr-sbchart{display:flex;align-items:stretch;gap:2px;height:64px;overflow:hidden;position:relative;}',
            '.fmr-sbaxis{position:absolute;left:0;right:0;height:0;border-top:1px dashed rgba(255,255,255,0.26);pointer-events:none;z-index:1;}',
            '.fmr-sbcol{flex:1 1 0;min-width:0;display:flex;flex-direction:column;}',
            '.fmr-sbslot{flex:0 0 auto;display:flex;align-items:flex-end;}',
            '.fmr-sbslot.dn{align-items:flex-start;}',
            '.fmr-sbbar{width:100%;min-height:3px;}',
            '.fmr-sbbar.up{background:linear-gradient(180deg,#5DCAA5 0%,rgba(93,202,165,0.45) 55%,rgba(93,202,165,0.06) 100%);border-radius:3px 3px 0 0;border-top:2px solid #7ceec4;}',
            '.fmr-sbbar.dn{background:linear-gradient(0deg,#ef4444 0%,rgba(239,68,68,0.4) 55%,rgba(239,68,68,0.05) 100%);border-radius:0 0 3px 3px;border-bottom:2px solid #ff7a76;}',
            '.fmr-sbtip{display:none;position:absolute;top:2px;transform:translateX(-50%);background:rgba(16,19,31,0.96);border:0.5px solid rgba(255,255,255,0.16);border-radius:8px;padding:4px 9px;font-size:10px;color:#a9aec0;white-space:nowrap;pointer-events:none;z-index:6;font-variant-numeric:tabular-nums;box-shadow:0 6px 18px rgba(0,0,0,0.45);}',
            '.fmr-sbcol.act{background:rgba(255,255,255,0.07);border-radius:3px;}',
            '.fmr-tp{display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:0.5px solid rgba(255,255,255,0.05);cursor:pointer;}',
            '.fmr-tp:last-of-type{border-bottom:0;}',
            '.fmr-tp .n{width:15px;flex:0 0 auto;font-size:9.5px;font-weight:800;color:#565b73;}',
            '.fmr-tp .t{flex:1;min-width:0;font-size:11px;color:#c9cede;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmr-tp .v{flex:0 0 auto;font-size:11px;font-weight:750;color:#e8e8ed;font-variant-numeric:tabular-nums;}',
            '.fmr-tp .d{flex:0 0 auto;font-size:9.5px;color:#565b73;width:34px;text-align:right;}',
            '.fmr-blk{border-radius:14px;padding:12px 13px;margin-bottom:10px;backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);}',
            '.fmr-blk.b1{background:linear-gradient(180deg,rgba(245,191,79,0.09),rgba(245,191,79,0.03));border:1px solid rgba(245,191,79,0.26);}',
            '.fmr-blk.b2{background:linear-gradient(180deg,rgba(129,140,248,0.09),rgba(129,140,248,0.03));border:1px solid rgba(129,140,248,0.26);}',
            '.fmr-blk.b3{background:linear-gradient(180deg,rgba(93,202,165,0.09),rgba(93,202,165,0.03));border:1px solid rgba(93,202,165,0.26);}',
            '.fmr-blk.b1 .fmr-sec.num{color:#f5bf4f;}',
            '.fmr-blk.b2 .fmr-sec.num{color:#a9b2fb;}',
            '.fmr-blk.b3 .fmr-sec.num{color:#7fdcbd;}',
            '.fmr-blk.b1 .fmr-sec.num .kn{background:rgba(245,191,79,0.2);color:#f5bf4f;}',
            '.fmr-blk.b2 .fmr-sec.num .kn{background:rgba(129,140,248,0.2);color:#c7cdfb;}',
            '.fmr-blk.b3 .fmr-sec.num .kn{background:rgba(93,202,165,0.2);color:#7fdcbd;}',
            '.fmr-sec.num .kn{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:7px;background:rgba(129,140,248,0.16);color:#c7cdfb;font-size:11px;font-weight:750;margin-right:2px;}',
            '.fmx-segw{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;}',
            '.fmx-alhd{display:flex;align-items:center;gap:10px;margin-bottom:12px;}',
            '.fmx-alic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;font-size:17px;flex:0 0 auto;}',
            '.fmx-alback,.fmx-alx{width:34px;height:34px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:#c2c6d2;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;font-size:16px;font-family:inherit;}',
            '.fmx-alsub{font-size:10.5px;color:#8990a8;line-height:1.45;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-algrid{display:grid;grid-template-columns:1fr 1fr;gap:11px 10px;margin-top:2px;}',
            '.fmx-albody{min-height:296px;}',
            '#fmx-ae-nw .fmx-fx{padding:12px 13px;font-size:11.5px;}',
            '.fmx-algrid .fmx-lbl{margin:0 0 5px;font-size:9.5px;letter-spacing:0.3px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-algrid .fmx-inp{width:100%;min-width:0;padding:9px 10px;font-size:12.5px;min-height:38px;}',
            '.fmx-alnew{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px;font-weight:700;padding:14px;border-radius:14px;background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;border:0;cursor:pointer;box-shadow:0 6px 20px rgba(99,102,241,0.3);font-family:inherit;}',
            '.fmx-alnew[disabled]{opacity:0.45;box-shadow:none;}',
            '.fmx-allim{font-size:11px;color:#565b73;text-align:center;margin:9px 0 20px;}',
            '.fmx-al{border:0.5px solid rgba(255,255,255,0.08);border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018));padding:15px 16px;margin-bottom:12px;}',
            '.fmx-al.off{opacity:0.5;}',
            '.fmx-al-top{display:flex;align-items:center;gap:9px;}',
            '.fmx-al-name{font-weight:700;font-size:15px;color:#e8e8ed;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;letter-spacing:-0.01em;}',
            '.fmx-al-scope{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;padding:3px 8px;border-radius:7px;flex:0 0 auto;white-space:nowrap;}',
            '.fmx-al-scope.both{background:rgba(129,140,248,0.16);color:#c7cdfb;}',
            '.fmx-al-scope.market{background:rgba(245,191,79,0.15);color:#f5bf4f;}',
            '.fmx-al-scope.radar{background:rgba(93,202,165,0.14);color:#5DCAA5;}',
            '.fmx-tgl{margin-left:auto;width:42px;height:25px;border-radius:13px;background:linear-gradient(145deg,#818cf8,#6366f1);position:relative;flex:0 0 auto;cursor:pointer;transition:all 180ms;}',
            '.fmx-tgl::after{content:"";position:absolute;top:2.5px;right:2.5px;width:20px;height:20px;border-radius:50%;background:#fff;transition:all 180ms;box-shadow:0 1px 4px rgba(0,0,0,0.35);}',
            '.fmx-tgl.off{background:rgba(255,255,255,0.13);}',
            '.fmx-tgl.off::after{right:auto;left:2.5px;}',
            '.fmx-al-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}',
            '.fmx-alc{font-size:11px;font-weight:600;padding:5px 9px;border-radius:8px;background:rgba(129,140,248,0.1);border:0.5px solid rgba(129,140,248,0.22);color:#c7cdfb;}',
            '.fmx-alc.g{background:rgba(93,202,165,0.11);border-color:rgba(93,202,165,0.28);color:#9fe3cc;}',
            '.fmx-alc.mut{background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.07);color:#8990a8;}',
            '.fmx-al-match{display:flex;align-items:center;gap:6px;font-size:11.5px;color:#9aa0b8;margin-top:13px;}',
            '.fmx-al-acts{display:flex;gap:7px;margin-top:13px;}',
            '.fmx-al-b{flex:1;text-align:center;font-size:12px;font-weight:600;padding:9px 6px;border-radius:11px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.09);color:#c2c6d2;cursor:pointer;font-family:inherit;}',
            '.fmx-al-b.pr{background:rgba(129,140,248,0.14);border-color:rgba(129,140,248,0.28);color:#c7cdfb;}',
            '.fmx-al-b.dz{flex:0 0 auto;width:42px;color:#ef4444;}',
            '.fmx-ae-sec{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#565b73;margin:20px 3px 9px;}',
            '.fmx-am-it{display:flex;align-items:center;gap:11px;padding:12px 13px;border:0.5px solid rgba(255,255,255,0.07);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015));margin-bottom:9px;text-decoration:none;color:inherit;}',
            '.fmx-am-av{width:40px;height:40px;border-radius:12px;flex:0 0 auto;object-fit:cover;background:linear-gradient(145deg,#818cf8,#6366f1);display:grid;place-items:center;font-weight:750;color:#0b0c16;font-size:16px;}',
            '.fmx-sp{margin-left:auto;display:flex;flex-direction:column;align-items:flex-start;}',
            '.fmx-sp svg{display:block;margin-top:-1px;}',
            '.fmx-acts{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap;}',
            '.fmx-btn{flex:1;border-radius:10px;padding:10px 6px;font-size:11.5px;font-weight:600;cursor:pointer;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;display:flex;align-items:center;justify-content:center;gap:4px;transition:all 150ms;white-space:nowrap;}',
            '.fmx-btn-p{border:none;color:#fff;}',
            '.fmx-scard{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:13px;transition:border-color 200ms;}',
            '.fmx-scard:hover{border-color:rgba(255,255,255,0.14);}',
            '.fmx-srow{display:flex;align-items:center;gap:11px;}',
            '.fmx-sav{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmr-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}',
            '.fmr-head{display:flex;align-items:center;gap:11px;margin-bottom:10px;}',
            '.fmr-av{width:40px;height:40px;border-radius:11px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:17px;overflow:hidden;}',
            '.fmr-av img{width:100%;height:100%;object-fit:cover;}',
            '.fmr-id{flex:1;min-width:0;}',
            '.fmr-name{font-size:15px;font-weight:700;color:#e8e8ed;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.25;}',
            '.fmr-user{font-size:11px;color:#8990a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}',
            '.fmr-nicherow{margin-bottom:2px;}',
            '.fmr-niche{display:inline-flex;align-items:center;gap:6px;background:rgba(129,140,248,0.14);border:0.5px solid rgba(129,140,248,0.3);color:#c7ccf7;font-size:12px;font-weight:600;border-radius:8px;padding:5px 10px;}',
            '.fmr-niche i{color:#818cf8;font-size:14px;}',
            '.fmr-score{display:flex;flex-direction:column;align-items:center;gap:2px;flex:0 0 auto;}',
            '.fmr-scorelbl{font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:#565b73;display:flex;align-items:center;gap:4px;}',
            '.fmr-sec{font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#565b73;margin:13px 1px 5px;display:flex;align-items:center;gap:6px;}',
            '.fmr-more{margin-top:10px;border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;background:rgba(255,255,255,0.02);}',
            '.fmr-more summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:7px;padding:10px 12px;font-size:12.5px;font-weight:700;color:#c7cdfb;min-height:44px;}',
            '.fmr-more summary::-webkit-details-marker{display:none;}',
            '.fmr-more summary .sub{min-width:0;font-size:10px;font-weight:400;color:#565b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmr-more summary .chev{margin-left:auto;color:#565b73;flex:0 0 auto;transition:transform 200ms;}',
            '.fmr-more[open] summary .chev{transform:rotate(180deg);}',
            '.fmr-morebody{padding:0 12px 12px;}',
            '.fmx-georow{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:8px 10px;min-height:40px;cursor:pointer;}',
            '.fmx-georow .gf{flex:0 0 22px;display:flex;align-items:center;}',
            '.fmx-bf-compact{scrollbar-width:thin;scrollbar-color:rgba(129,140,248,0.35) transparent;}',
            '.fmx-bf-compact::-webkit-scrollbar{width:5px;}',
            '.fmx-bf-compact::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-bf-compact::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.22);border-radius:99px;}',
            '.fmx-bf-compact:hover::-webkit-scrollbar-thumb{background:rgba(129,140,248,0.55);}',
            '.fmx-bf-compact::-webkit-scrollbar-thumb:hover{background:rgba(165,173,255,0.8);}',
            '.fmx-georow .gc{font-size:10px;color:#8990a8;font-weight:750;flex:0 0 28px;letter-spacing:0.04em;}',
            '.fmx-georow .gn{flex:1;min-width:0;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-georow .gk{opacity:0;color:#818cf8;flex:0 0 auto;font-size:14px;}',
            '.fmx-georow.on{border-color:rgba(129,140,248,0.4);background:rgba(129,140,248,0.1);}',
            '.fmx-georow.on .gk{opacity:1;}',
            '.fmr-line{font-size:13px;color:#8990a8;line-height:1.6;}',
            '.fmr-line b{color:#e8e8ed;font-weight:700;}',
            '.fmr-line .fmr-big{font-size:18px;}',
            '.fmr-line .fdot{color:#565b73;margin:0 6px;}',
            '.fmr-sub{font-size:10px;color:#565b73;margin-top:3px;line-height:1.5;}',
            '.fmr-sub b{color:#8990a8;}',
            '.fmr-i{display:inline-flex;align-items:center;justify-content:center;font-size:14px;color:#6b7488;cursor:pointer;flex:0 0 auto;vertical-align:-2px;letter-spacing:0;}',
            '.fmr-i.push{margin-left:2px;}',
            '.fmr-info{display:none;font-size:10px;color:#8990a8;line-height:1.55;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;margin-top:6px;}',
            '.fmx-anom{display:flex;gap:9px;align-items:flex-start;margin-top:11px;padding:10px 12px;border-radius:12px;background:linear-gradient(160deg,rgba(245,178,61,0.15),rgba(245,178,61,0.05));border:0.5px solid rgba(245,178,61,0.34);font-size:11.5px;line-height:1.5;color:#ecd6ac;-webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);box-shadow:0 6px 18px -10px rgba(245,178,61,0.35);}',
            '.fmx-anom .fmx-anom-i{flex:0 0 auto;margin-top:1px;}',
            '.fmx-anom b{color:#f5b23d;font-weight:700;}',
            '.fmr-info.on{display:block;}',
            '.fmr-conv{width:52px;background:rgba(129,140,248,0.14);border:0.5px solid rgba(129,140,248,0.4);border-radius:7px;color:#c7ccf7;font-family:inherit;font-size:13px;font-weight:700;text-align:center;padding:3px 4px;-moz-appearance:textfield;}',
            '.fmr-conv::-webkit-outer-spin-button,.fmr-conv::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}',
            '.fmr-warn{display:none;font-size:10px;color:#f59e0b;background:rgba(245,158,11,0.08);border:0.5px solid rgba(245,158,11,0.22);border-radius:8px;padding:7px 10px;margin-top:7px;line-height:1.5;}',
            '.fmr-warn.on{display:block;}',
            '.fmr-pills{display:flex;flex-wrap:wrap;gap:6px;margin:13px 0 11px;}',
            '.fmr-pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#c2c6d2;background:rgba(255,255,255,0.035);border:0.5px solid rgba(255,255,255,0.08);border-radius:8px;padding:5px 9px;}',
            '.fmr-pill i{font-size:13px;}',
            '.fmx-lrow{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:11px 13px;cursor:pointer;transition:border-color 160ms,background 160ms,box-shadow 160ms;}',
            '.fmx-lrow:hover{border-color:rgba(255,255,255,0.14);}',
            '.fmx-ldot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}',
            '.fmx-lname{font-size:13px;font-weight:600;display:flex;align-items:center;gap:5px;min-width:0;}',
            '.fmx-lt{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;}',
            '.fmx-lmid{flex:1 1 auto;min-width:0;overflow:hidden;}',
            '.fmx-lm{display:inline-flex;align-items:center;gap:3px;flex:0 0 auto;}',
            '.fmx-lm i{font-size:10px;color:#565b73;}',
            '.fmx-lcpm{font-size:10px;color:#8990a8;white-space:nowrap;font-variant-numeric:tabular-nums;}',
            '.fmx-lcpm b{color:#c2c6d2;font-weight:650;}',
            '.fmx-lsub{font-size:10.5px;color:#8990a8;}',
            '.fmx-lprice{margin-left:auto;font-size:13px;font-weight:700;color:#5DCAA5;}',
            '.fmx-hero{display:flex;align-items:flex-start;justify-content:center;padding:4px 0 18px;min-width:0;}.fmx-hero>.fmx-card{min-width:0;}',
            '.fmx-chsel{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:4px 4px 4px 13px;margin-bottom:6px;}',
            '.fmx-chsel i.lead{color:#818cf8;font-size:16px;}',
            '.fmx-chsel select{flex:1;background:transparent;border:none;color:#e8e8ed;font-size:13px;font-family:inherit;outline:none;padding:9px 4px;appearance:none;cursor:pointer;}',
            '.fmx-chnote{font-size:11px;color:#8990a8;margin:0 0 16px 4px;}',
            '.fmx-panes{position:relative;transition:height 360ms cubic-bezier(.2,.8,.2,1);}',
            '.fmx-pane{position:absolute;top:0;left:0;width:100%;opacity:0;transform:translateY(12px) scale(.99);transition:opacity 320ms,transform 360ms cubic-bezier(.2,.8,.2,1);pointer-events:none;}',
            '.fmx-pane.on{opacity:1;transform:none;pointer-events:auto;}',
            '.fmx-lbl{font-size:11px;color:#8990a8;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 9px;font-weight:600;display:block;}',
            '.fmx-mtabs{display:flex;gap:6px;margin-bottom:14px;}',
            '.fmx-mt{flex:1;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:9px;padding:9px;font-size:11.5px;cursor:pointer;transition:all 160ms;display:flex;align-items:center;justify-content:center;gap:5px;}',
            '.fmx-mt.on{background:rgba(99,102,241,0.13);color:#818cf8;border-color:rgba(99,102,241,0.28);}',
            '.fmx-grads{display:flex;gap:9px;flex-wrap:wrap;}',
            '.fmx-gd{width:36px;height:36px;border-radius:50%;cursor:pointer;position:relative;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-gd:hover{transform:scale(1.06);}',
            '.fmx-gd.on{border-color:rgba(255,255,255,0.95);}',
            '.fmx-gd.on::after{content:"\\2713";position:absolute;right:-5px;top:-5px;width:16px;height:16px;border-radius:50%;background:#fff;color:#0a0d18;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.45);}',
            '.fmx-dots{display:flex;gap:10px;flex-wrap:wrap;}',
            '.fmx-dot{width:34px;height:34px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:transform 140ms;}',
            '.fmx-dot:hover{transform:scale(1.1);}',
            '.fmx-dot.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,0.3);}',
            '.fmx-emg{display:grid;grid-template-columns:repeat(auto-fill,minmax(36px,1fr));gap:6px;margin-top:6px;}',
            '.fmx-em{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:18px;background:rgba(255,255,255,0.04);border:1px solid transparent;border-radius:9px;cursor:pointer;transition:all 140ms;}',
            '.fmx-em.on{border-color:#6366f1;background:rgba(99,102,241,0.15);}',
            '.fmx-inp{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;font-size:13px;color:#e8e8ed;font-family:inherit;outline:none;transition:border-color 160ms;}',
            '.fmx-inp:focus{border-color:rgba(99,102,241,0.28);}',
            'textarea.fmx-inp{resize:none;min-height:74px;}',
            '.fmx-mt2{margin-top:14px;}',
            '.fmx-row2{display:flex;gap:8px;flex-wrap:wrap;}.fmx-row2>*{flex:1;min-width:0;}',
            '.fmx-sel{width:100%;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;padding:11px;font-size:12.5px;color:#e8e8ed;font-family:inherit;outline:none;appearance:none;cursor:pointer;}',
            '.fmx-chk{display:flex;align-items:center;gap:11px;padding:11px;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:9px;cursor:pointer;transition:all 150ms;}',
            '.fmx-chk.on{background:rgba(99,102,241,0.12);border-color:rgba(99,102,241,0.28);}',
            '.fmx-box{width:20px;height:20px;border-radius:6px;border:1.5px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0;transition:all 150ms;}',
            '.fmx-chk.on .fmx-box{background:#6366f1;border-color:#6366f1;}',
            '.fmx-pinp{width:96px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px;font-size:12px;color:#e8e8ed;text-align:right;outline:none;}',
            '.fmx-fgrp{margin-bottom:13px;}',
            '.fmx-fghd{font-size:10px;text-transform:uppercase;letter-spacing:0.5px;font-weight:800;color:#565b73;margin:2px 2px 8px;}',
            '.fmx-ft{display:flex;align-items:center;gap:11px;padding:11px 12px;border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;margin-bottom:8px;cursor:pointer;transition:border-color .15s,background .15s;background:rgba(255,255,255,0.02);}',
            '.fmx-ft.on{background:linear-gradient(135deg,rgba(129,140,248,0.1),rgba(129,140,248,0.02));border-color:rgba(129,140,248,0.4);}',
            '.fmx-fsw{width:38px;height:22px;border-radius:99px;background:rgba(255,255,255,0.1);position:relative;flex:0 0 auto;transition:background .16s;}',
            '.fmx-fsw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .16s;}',
            '.fmx-ft.on .fmx-fsw{background:#818cf8;}',
            '.fmx-ft.on .fmx-fsw::after{left:19px;}',
            '.fmx-ftm{flex:1;min-width:0;}',
            '.fmx-ftt{display:flex;align-items:baseline;gap:7px;flex-wrap:wrap;}',
            '.fmx-ftcode{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;font-weight:800;color:#818cf8;letter-spacing:-0.3px;}',
            '.fmx-ftnm{font-size:13.5px;font-weight:700;color:#e8e8ed;letter-spacing:-0.2px;}',
            '.fmx-ftbase{font-size:8.5px;font-weight:800;letter-spacing:0.3px;color:#5DCAA5;background:rgba(93,202,165,0.13);border-radius:5px;padding:1px 5px;}',
            '.fmx-fts{font-size:10px;color:#8990a8;margin-top:2px;line-height:1.35;}',
            '.fmx-ftr{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:3px;}',
            '.fmx-ftpr{display:flex;align-items:center;gap:3px;}',
            '.fmx-ftp{width:80px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:8px;padding:7px 8px;font-size:12.5px;font-weight:700;color:#e8e8ed;text-align:right;outline:none;font-family:inherit;}',
            '.fmx-ft.on .fmx-ftp{border-color:rgba(129,140,248,0.35);}',
            '.fmx-ft:not(.on) .fmx-ftp{opacity:0.55;}',
            '.fmx-ftpr .cur{font-size:11px;color:#8990a8;}',
            '.fmx-ftc{font-size:9.5px;color:#5DCAA5;font-family:ui-monospace,Menlo,Consolas,monospace;min-height:12px;white-space:nowrap;}',
            '.fmx-ft:not(.on) .fmx-ftc{color:#565b73;}',
            '.fmx-eridseg{display:flex;gap:7px;margin-top:2px;}',
            '.fmx-eridb{flex:1;min-width:0;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);color:#8990a8;font-family:inherit;font-size:11px;font-weight:700;padding:10px 5px;border-radius:11px;cursor:pointer;line-height:1.25;transition:all .15s;}',
            '.fmx-eridb.on{background:rgba(129,140,248,0.14);border-color:rgba(129,140,248,0.4);color:#c7cdff;}',
            '.fmx-tog{display:flex;align-items:center;gap:10px;padding:11px;border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;margin-bottom:9px;cursor:pointer;}',
            '.fmx-sw{width:38px;height:22px;border-radius:99px;background:rgba(255,255,255,0.12);position:relative;transition:background 180ms;flex-shrink:0;}',
            '.fmx-sw i{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left 180ms;}',
            '.fmx-tog.on .fmx-sw{background:#5DCAA5;}.fmx-tog.on .fmx-sw i{left:18px;}',
            '.fmx-save{width:100%;border:none;background:linear-gradient(135deg,#5DCAA5,#34d399);color:#04342c;border-radius:14px;padding:15px;font-size:13.5px;font-weight:700;cursor:pointer;box-shadow:0 8px 22px rgba(93,202,165,0.35);display:flex;align-items:center;justify-content:center;gap:7px;transition:transform 140ms;}',
            '.fmx-save:active{transform:scale(0.98);}.fmx-save:disabled{opacity:0.6;}',
            '.fmx-savenote{font-size:10.5px;color:#565b73;line-height:1.5;text-align:center;margin-top:10px;}',
            '.fmx-mbg{position:fixed;inset:0;z-index:9100;background:rgba(5,7,14,0.72);backdrop-filter:blur(4px);display:none;align-items:flex-end;justify-content:center;}',
            '.fmx-mbg.fmx-show{display:flex;}',
            '@media(min-width:640px){.fmx-mbg{align-items:center;}}',
            '.fmx-modal{width:100%;max-width:480px;max-height:88vh;background:rgba(17,20,31,0.86);border:0.5px solid rgba(255,255,255,0.12);border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;animation:fmxUp 320ms cubic-bezier(.2,.8,.2,1);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);}',
            '@media(min-width:640px){.fmx-modal{border-radius:20px;}}',
            '@keyframes fmxUp{from{transform:translateY(40px);opacity:0;}to{transform:none;opacity:1;}}',
            '.fmx-mhead{display:flex;align-items:flex-start;gap:10px;padding:18px 18px 12px;flex-shrink:0;border-bottom:0.5px solid rgba(255,255,255,0.06);}',
            '.fmx-mhead h2{margin:0;font-size:16px;font-weight:700;flex:1;display:flex;align-items:center;gap:8px;}',
            '.fmx-mhead h2>i:first-child,.fmx-po-nm>i:first-child,.fmx-note>i:first-child{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;font-size:15px;background:rgba(255,255,255,0.09);background:color-mix(in srgb,currentColor 20%,transparent);border:1px solid rgba(255,255,255,0.14);border:1px solid color-mix(in srgb,currentColor 38%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,0.10);}',
            '.fmx-mhead p{margin:3px 0 0;font-size:11.5px;color:#8990a8;line-height:1.5;}',
            '.fmx-mclose{width:30px;height:30px;border-radius:8px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:16px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}',
            '.fmx-mbody{padding:16px 18px 22px;overflow-y:auto;-webkit-overflow-scrolling:touch;}',
            '.fmx-ftabs{display:flex;gap:6px;margin-bottom:14px;}',
            '.fmx-ftab{flex:1;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:9px;padding:9px;font-size:12px;cursor:pointer;transition:all 150ms;}',
            '.fmx-ftab.on{background:rgba(99,102,241,0.13);color:#818cf8;border-color:rgba(99,102,241,0.28);}',
            '.fmx-term{padding:11px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);}',
            '.fmx-term h4{margin:0 0 4px;font-size:13px;font-weight:700;}',
            '.fmx-term p{margin:0;font-size:12px;color:#8990a8;line-height:1.5;}',
            '.fmx-tip{display:flex;gap:9px;align-items:flex-start;padding:9px 0;font-size:12.5px;color:#cdd0de;line-height:1.5;}',
            '.fmx-tip i{color:#5DCAA5;flex-shrink:0;margin-top:2px;}',
            '.fmx-po{border:0.5px solid rgba(255,255,255,0.1);border-radius:13px;padding:14px;margin-bottom:11px;background:rgba(255,255,255,0.02);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
            '.fmx-po.gold{border-color:rgba(245,191,79,0.45);background:radial-gradient(130% 90% at 50% -10%,rgba(245,191,79,0.08),transparent 60%);}',
            '.fmx-po-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}',
            '.fmx-po-nm{font-size:14px;font-weight:700;display:flex;align-items:center;gap:7px;}',
            '.fmx-po-pr{font-size:15px;font-weight:700;}',
            '.fmx-po-pr.gold{color:#f5bf4f;}',
            '.fmx-po-li{font-size:12px;color:#a9aec0;line-height:1.5;display:flex;gap:7px;align-items:flex-start;margin-bottom:6px;}',
            '.fmx-po-li i{flex-shrink:0;margin-top:2px;color:#818cf8;}',
            '.fmx-po-li.gold i{color:#f5bf4f;}',
            '.fmx-po-buy{width:100%;margin-top:10px;border:none;border-radius:10px;padding:12px;font-size:12.5px;font-weight:700;cursor:pointer;color:#fff;background:rgba(99,102,241,0.85);}',
            '.fmx-po-buy.gold{background:linear-gradient(135deg,#f5bf4f,#d4a017);color:#231600;}',
            '.fmx-limit{font-size:11px;color:#f5bf4f;background:rgba(245,191,79,0.08);border:0.5px solid rgba(245,191,79,0.25);border-radius:9px;padding:9px 11px;margin-bottom:11px;display:flex;gap:7px;align-items:flex-start;line-height:1.5;}',
            '.fmx-limit i{flex-shrink:0;margin-top:1px;}',
            '.fmx-toast{position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:rgba(20,24,40,0.96);border:0.5px solid rgba(93,202,165,0.3);color:#5DCAA5;padding:13px 20px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:all 300ms;backdrop-filter:blur(10px);z-index:100030;display:flex;align-items:center;gap:8px;pointer-events:none;}',
            '.fmx-toast.on{opacity:1;transform:translateX(-50%) translateY(0);}',
            '.fmx-fxg{margin-top:10px;}',
            '.fmx-fxl{font-size:12.5px;font-weight:700;color:#d6dae8;letter-spacing:0.3px;margin-bottom:7px;display:flex;align-items:center;gap:6px;}',
            '.fmx-fxl .ti-lock{font-size:11px;}',
            '.fmx-fxlock{font-size:9.5px;color:#b9964d;margin:-3px 0 8px;line-height:1.45;}',
            '.fmx-fxl.vipc{color:#f5bf4f;}',
            '.fmx-fxw{display:flex;gap:6px;flex-wrap:wrap;}',
            '.fmx-fx{border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:99px;padding:7px 11px;font-size:11px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all 150ms;font-family:inherit;}',
            '.fmx-fx.on{background:rgba(99,102,241,0.14);color:#818cf8;border-color:rgba(99,102,241,0.3);}',
            '.fmx-fx.vip{border-color:rgba(245,191,79,0.3);color:#b9964d;}',
            '.fmx-npg{font-size:10px;letter-spacing:0.11em;text-transform:uppercase;color:#565b73;margin:14px 2px 8px;display:flex;align-items:center;gap:8px;}',
            '.fmx-npg:first-child{margin-top:2px;}',
            '.fmx-npg::after{content:"";flex:1;height:1px;background:rgba(255,255,255,0.06);}',
            '.fmx-npg+.fmx-fxw .fmx-fx .fmx-npn{margin-left:5px;font-size:9.5px;font-weight:700;color:#818cf8;}',
            '.fmx-fx.on .fmx-npn{color:#a5b4fc;}',
            '.fmx-fx.vip.on{background:rgba(245,191,79,0.12);color:#f5bf4f;border-color:rgba(245,191,79,0.5);}',
            '.fmx-fx .ti-lock{font-size:10px;}',
            '.fmx-avw{position:relative;width:46px;height:46px;flex-shrink:0;}',
            '.fmx-avw .fmx-av{position:relative;z-index:2;}',
            '.fmx-avhalo{position:absolute;inset:-5px;border-radius:17px;z-index:1;pointer-events:none;}',
            '.fx-g-neon{box-shadow:0 0 10px var(--fxa),0 0 20px var(--fxa);opacity:.55;}',
            '.fx-g-gold{box-shadow:0 0 10px rgba(245,191,79,.5),0 0 22px rgba(245,191,79,.28);}',
            '@keyframes fmxSpin{to{transform:rotate(360deg);}}',
            '.fmx-chrow.dis{opacity:.55;}',
            '.fmx-lav{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmx-lav-fx{width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:11px;}',
            '.fmx-lav-fx .fmx-avw{transform:scale(0.74);}',
            '.fmx-lchev{transition:transform 200ms;color:#565b73;flex-shrink:0;font-size:15px;}',
            '.fmx-li.on .fmx-lchev{transform:rotate(180deg);}',
            '.fmx-li.on>.fmx-lrow{border-color:rgba(129,140,248,0.65);background:linear-gradient(rgba(129,140,248,0.14),rgba(129,140,248,0.06));box-shadow:inset 0 0 0 1px rgba(129,140,248,0.4),0 8px 22px -10px rgba(129,140,248,0.5);}',
            '.fmx-lbox{margin-top:8px;}',
            '.fmx-chdd{position:relative;margin-bottom:6px;}',
            '.fmx-chbtn{width:100%;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);border-radius:11px;padding:11px 13px;color:#e8e8ed;font-size:13px;font-family:inherit;cursor:pointer;text-align:left;}',
            '.fmx-chbtn i.lead{color:#818cf8;font-size:16px;flex-shrink:0;}',
            '.fmx-chbtn .chev{margin-left:auto;color:#8990a8;transition:transform 200ms;flex-shrink:0;}',
            '.fmx-chdd.on .chev{transform:rotate(180deg);}',
            '.fmx-chlist{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#141828;border:0.5px solid rgba(255,255,255,0.1);border-radius:13px;box-shadow:0 14px 34px rgba(0,0,0,0.55);z-index:60;display:none;max-height:264px;overflow-y:auto;}',
            '.fmx-chdd.on .fmx-chlist{display:block;}',
            '.fmx-chrow{display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;transition:background 130ms;}',
            '.fmx-chrow:hover{background:rgba(255,255,255,0.05);}',
            '.fmx-chrow.sel{background:rgba(99,102,241,0.12);}',
            '.fmx-chav{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;}',
            '.fmx-chtt{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-chuu{font-size:10.5px;color:#8990a8;}',
            '.fmx-upl{border:0.5px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);color:#e8e8ed;border-radius:10px;padding:10px 13px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;transition:border-color 150ms;}',
            '.fmx-upl:hover{border-color:rgba(255,255,255,0.25);}',
            '.fmx-upl.sec{color:#8990a8;}',
            '.fmx-uplrow{display:flex;gap:7px;flex-wrap:wrap;}',
            '#fmx-cropBox{position:relative;width:100%;background:#0a0d18;border-radius:12px;overflow:hidden;touch-action:none;cursor:grab;border:0.5px solid rgba(255,255,255,0.1);}',
            '#fmx-cropBox:active{cursor:grabbing;}',
            '.fmx-zoomrow{display:flex;align-items:center;gap:10px;margin-top:12px;}',
            '.fmx-zoomrow input{flex:1;accent-color:#818cf8;}',
            '.fmx-safeT,.fmx-safeB{position:absolute;left:0;right:0;background:rgba(5,7,14,0.6);pointer-events:none;transition:height 60ms linear,top 60ms linear;}',
            '.fmx-safeT{top:0;}',
            '.fmx-safeF{position:absolute;left:0;right:0;border-top:1.5px dashed rgba(255,255,255,0.75);border-bottom:1.5px dashed rgba(255,255,255,0.75);pointer-events:none;transition:top 60ms linear;}',
            '.fmx-safeF span{position:absolute;right:0;top:0;font-size:9px;background:rgba(10,13,24,0.75);padding:2px 7px;border-radius:0 0 0 7px;color:#e8e8ed;}',
            '.fmx-safeR{position:absolute;inset:0;border-radius:28%;border:1.5px dashed rgba(255,255,255,0.75);box-shadow:0 0 0 999px rgba(5,7,14,0.6);pointer-events:none;}',
            '.fmx-dot-rb{border-radius:50%;border:2px solid rgba(255,255,255,0.85);background:conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);}',
            '.fmx-cbg{position:absolute;inset:0;z-index:0;overflow:hidden;border-radius:inherit;}',
            '.fmx-cbg-s{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,13,24,0.35),rgba(10,13,24,0.86) 72%);}',
            '.fmx-fchips{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px;}',
            '.fmx-fchips span{font-size:9.5px;color:#8990a8;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.07);padding:3px 8px;border-radius:6px;}',
            '.fmx-lsp{flex-shrink:0;display:flex;align-items:center;}',
            '.fmx-lmet{font-size:10px;color:#8990a8;margin-top:3px;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;white-space:nowrap;min-width:0;overflow:hidden;line-height:1.45;}',
            '.fmx-lmet b{color:#c9cbe0;font-weight:600;}',
            '.fmx-lmet s{width:3px;height:3px;border-radius:50%;background:#3a3f55;text-decoration:none;flex-shrink:0;display:inline-block;}',
            '.fmx-lright{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:0 0 auto;max-width:40%;}',
            '.fmx-li.prem>.fmx-lrow{position:relative;border-color:rgba(245,191,79,0.62);box-shadow:0 0 12px -4px rgba(245,191,79,0.42),0 6px 16px -10px rgba(245,191,79,0.38),inset 0 1px 0 rgba(255,228,160,0.28);}',
            '.fmx-li.prem>.fmx-lrow::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:0 0 18px -4px rgba(245,191,79,0.55),0 8px 24px -12px rgba(245,191,79,0.45);opacity:.25;animation:fmxGoldGlow 4.6s ease-in-out infinite;pointer-events:none;will-change:opacity;z-index:0;}',
            '.fmx-chk .fmx-box i{opacity:0;transition:opacity 130ms;}',
            '.fmx-chk.on .fmx-box i{opacity:1;}',
            '.fmx-huerow{display:none;align-items:center;gap:10px;margin-top:10px;}',
            '.fmx-huerow input{flex:1;-webkit-appearance:none;appearance:none;height:10px;border-radius:99px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);outline:none;border:0.5px solid rgba(255,255,255,0.15);}',
            '.fmx-huerow input::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;background:#fff;border:2.5px solid rgba(10,13,24,0.85);box-shadow:0 2px 7px rgba(0,0,0,0.45);cursor:pointer;}',
            '.fmx-hueprev{width:24px;height:24px;border-radius:50%;flex-shrink:0;border:2px solid rgba(255,255,255,0.85);}',
            '.fmx-req{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 13px;}',
            '.fmx-req.mine{border-color:rgba(129,140,248,0.35);}',
            '.fmx-reqh{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px;}',
            '.fmx-reqn{font-size:10px;font-weight:700;color:#818cf8;background:rgba(129,140,248,0.12);padding:3px 9px;border-radius:7px;}',
            '.fmx-reqf{font-size:10px;color:#8990a8;background:rgba(255,255,255,0.05);padding:3px 9px;border-radius:7px;}',
            '.fmx-reqb{margin-left:auto;font-size:12px;font-weight:700;color:#5DCAA5;}',
            '.fmx-reqt{font-size:12.5px;line-height:1.55;color:#c9cbe0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;}',
            '.fmx-reqft{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px;padding-top:10px;border-top:0.5px solid rgba(255,255,255,0.06);font-size:10px;color:#565b73;}',
            '.fmx-reqft>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-reqft .fmx-btn{flex:0 0 auto;width:auto;}',
            '.fmx-reqb.na{color:#565b73;font-weight:500;}',
            'textarea.fmx-inp{resize:vertical;min-height:84px;font-family:inherit;line-height:1.5;}',
            '.fmx-toast.err{border-color:rgba(239,68,68,0.4);color:#f87171;}',
            '.fmx-cfm{position:fixed;inset:0;z-index:100005;pointer-events:none;}',
            '.fmx-cfm.solid{pointer-events:auto;background:rgba(5,7,14,0.5);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);}',
            '.fmx-cfm-box{position:fixed;left:50%;bottom:18px;margin-left:-126px;width:252px;max-width:calc(100vw - 20px);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#141826;border:0.5px solid rgba(255,255,255,0.14);border-radius:16px;padding:14px;box-shadow:0 18px 55px rgba(0,0,0,0.6);pointer-events:auto;}',
            '.fmx-cp-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;}',
            '.fmx-cp-ttl{font-size:13px;font-weight:700;color:#e8e8ed;}',
            '.fmx-cp-x{cursor:pointer;color:#8990a8;font-size:13px;padding:2px 7px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:#141828;font-family:inherit;touch-action:auto;}',
            '.fmx-cp-pt{font-size:12px;font-weight:600;color:#e8e8ed;}',
            '.fmx-cp-pt b{color:#5DCAA5;}',
            '.fmx-cfm-t{font-size:13px;line-height:1.55;color:#e8e8ed;margin-bottom:14px;}',
            '.fmx-cfm-r{display:flex;gap:8px;}',
            '.fmx-cp-sv{position:relative;width:100%;height:130px;border-radius:10px;overflow:hidden;cursor:crosshair;touch-action:none;}',
            '.fmx-cp-sv canvas{width:100%;height:100%;display:block;}',
            '.fmx-cp-dot{position:absolute;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(0,0,0,0.6);transform:translate(-50%,-50%);pointer-events:none;}',
            '.fmx-cp-hue{width:100%;margin-top:10px;-webkit-appearance:none;appearance:none;height:13px;border-radius:8px;background:linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);outline:none;border:0.5px solid rgba(255,255,255,0.15);}',
            '.fmx-cp-hue::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;border:2.5px solid rgba(10,13,24,0.85);box-shadow:0 2px 7px rgba(0,0,0,0.45);cursor:pointer;}',
            '.fmx-cp-row{display:flex;gap:6px;margin-top:10px;align-items:flex-end;}',
            '.fmx-cp-fld{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;}',
            '.fmx-cp-fld.hexf{flex:1.6;}',
            '.fmx-cp-cap{font-size:9px;letter-spacing:0.8px;color:#8990a8;text-transform:uppercase;font-weight:600;text-align:center;}',
            '.fmx-cp-fld input{width:100%;background:#0f1322;border:0.5px solid rgba(255,255,255,0.12);color:#e8e8ed;font-size:12.5px;padding:9px 2px;border-radius:10px;text-align:center;outline:none;font-family:inherit;-moz-appearance:textfield;appearance:textfield;}',
            '.fmx-cp-fld input::-webkit-outer-spin-button,.fmx-cp-fld input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}',
            '.fmx-cp-fld input:focus{border-color:rgba(93,202,165,0.5);}',
            '.fmx-cp-presets{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;}',
            '.fmx-cp-pd{width:22px;height:22px;border-radius:7px;cursor:pointer;border:1.5px solid rgba(255,255,255,0.18);padding:0;}',
            '#fmx-buysort .fmx-seg{min-height:40px;}',
            '.fmx-sortbar{scrollbar-width:none;-ms-overflow-style:none;}',
            '.fmx-sortbar::-webkit-scrollbar{display:none;}',
            '#fmx-buysort{scrollbar-width:none;padding-bottom:2px;margin-bottom:4px;touch-action:pan-x;}',
            '#fmx-buysort::-webkit-scrollbar{display:none;}',
            '.fmx-ps{width:100%;max-width:580px;max-height:92vh;overflow-y:auto;background:#0b0e18;border:0.5px solid rgba(255,255,255,0.12);border-bottom:none;border-radius:18px 18px 0 0;padding:14px 14px 22px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) transparent;scrollbar-gutter:stable;}',
            '.fmx-ps::-webkit-scrollbar{width:9px;}',
            '.fmx-ps::-webkit-scrollbar-track{background:transparent;}',
            '.fmx-ps::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:6px;border:2px solid transparent;background-clip:padding-box;}',
            '.fmx-ps-scroll{scrollbar-width:none;-ms-overflow-style:none;}',
            '.fmx-ps-scroll::-webkit-scrollbar{display:none;}',
            '.fmx-ps .fmx-fx{min-height:40px;}',
            '.fmx-tl{display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.09);padding:4px 9px;border-radius:8px;vertical-align:middle;}',
            '.fmx-tl i{width:7px;height:7px;border-radius:50%;background:#262b40;flex-shrink:0;}',
            '.fmx-tl i.red.on{background:#ef4444;box-shadow:0 0 7px rgba(239,68,68,0.8);}',
            '.fmx-tl i.amber.on{background:#f59e0b;box-shadow:0 0 7px rgba(245,158,11,0.8);}',
            '.fmx-tl i.green.on{background:#5DCAA5;box-shadow:0 0 7px rgba(93,202,165,0.8);}',
            '.fmx-tl b{font-size:9.5px;font-weight:700;margin-left:2px;}',
            '.fmx-stk{position:absolute;z-index:2;pointer-events:none;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.35));}',
            '.fmx-stkGrab{position:absolute;z-index:9;cursor:grab;touch-action:none;}',
            '.fmx-stkGrab:active{cursor:grabbing;}',
            '.fmx-stkGrab.sel{outline:1.5px dashed rgba(129,140,248,0.9);outline-offset:3px;}',
            '.fmx-stkh{position:absolute;width:15px;height:15px;border-radius:50%;background:#818cf8;border:2px solid #0b0e18;box-shadow:0 1px 4px rgba(0,0,0,0.5);pointer-events:auto;z-index:9;}',
            '.fmx-stkh.rot{top:-23px;left:50%;margin-left:-8px;cursor:grab;}',
            '.fmx-stkh.rsz{right:-9px;bottom:-9px;cursor:nwse-resize;border-radius:4px;}',
            '.fmx-stkh.del{right:-9px;top:-9px;display:flex;align-items:center;justify-content:center;background:#ef4444;color:#fff;font-size:9px;cursor:pointer;}',
            '.fmx-stk.m-top{z-index:5;}',
            '.fmx-stk.m-blend{z-index:5;opacity:0.55;}',
            '.fmx-stkGrab .fmx-stkh{display:none;}',
            '.fmx-stkGrab.sel .fmx-stkh{display:flex;align-items:center;justify-content:center;}',
            '.fmx-stkmodes{position:absolute;bottom:-38px;left:50%;transform:translateX(-50%);display:none;gap:4px;pointer-events:auto;}',
            '.fmx-stkGrab.sel .fmx-stkmodes{display:flex;}',
            '.fmx-stkmd{width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none;padding:0;}',
            '.fmx-stkmd i{width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.35);background:#0d1120;}',
            '.fmx-stkmd.on i{border-color:#5DCAA5;background:rgba(93,202,165,0.35);}',
            '.fmx-stkModeLabel{position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(10,13,24,0.85);border:0.5px solid rgba(93,202,165,0.4);color:#5DCAA5;font-size:11px;font-weight:600;padding:5px 12px;border-radius:999px;z-index:9;opacity:0;transition:opacity 0.2s;pointer-events:none;white-space:nowrap;}',
            '.fmx-stkModeLabel.show{opacity:1;}',
            '.fmx-stkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(52px,1fr));gap:7px;max-width:100%;}',
            '.fmx-stkcell{min-width:0;}',
            '.fmx-stkcell{position:relative;aspect-ratio:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:11px;padding:5px;cursor:pointer;transition:border-color 150ms;}',
            '.fmx-stkcell.on{border-color:#818cf8;box-shadow:0 0 0 1px #818cf8;}',
            '.fmx-stkcell img,.fmx-stkcell video{width:100%;height:100%;object-fit:contain;pointer-events:none;}',
            '.fmx-stkdel{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;background:#1a1f30;border:1px solid rgba(255,255,255,0.18);color:#8990a8;font-size:11px;line-height:1;cursor:pointer;display:none;align-items:center;justify-content:center;padding:0;}',
            '.fmx-stkcell:hover .fmx-stkdel{display:flex;}',
            '.fmx-stk-tgs{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:22px;}',
            '.fmx-stk-anim{position:absolute;bottom:3px;left:0;right:0;text-align:center;font-size:8px;color:#f59e0b;}',
            '.fmx-stkrow{display:flex;align-items:center;gap:10px;margin-top:10px;font-size:11px;color:#8990a8;}',
            '.fmx-stkrow span{width:52px;flex-shrink:0;}',
            '.fmx-stkrow input{flex:1;}',
            '.fmx-pday{font-size:11.5px;color:#c9cbe0;background:rgba(245,158,11,0.07);border:0.5px solid rgba(245,158,11,0.2);border-radius:11px;padding:10px 12px;margin-bottom:14px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}',
            '.fmx-pday b{color:#f59e0b;}',
            '.fmx-thead{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;}',
            '.fmx-tlive{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;letter-spacing:0.6px;text-transform:uppercase;color:#22c55e;background:rgba(34,197,94,0.1);border:0.5px solid rgba(34,197,94,0.28);border-radius:20px;padding:4px 9px 4px 8px;}',
            '.fmx-tdot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,0.6);animation:fmxTpulse 1.8s infinite;}',
            '@keyframes fmxTpulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.5);}70%{box-shadow:0 0 0 6px rgba(34,197,94,0);}100%{box-shadow:0 0 0 0 rgba(34,197,94,0);}}',
            '.fmx-tstamp{font-size:10.5px;color:#565b73;margin-left:auto;display:inline-flex;align-items:center;gap:4px;}',
            '.fmx-tstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:6px;}',
            '.fmx-tcell{background:linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015));border:0.5px solid rgba(255,255,255,0.08);border-radius:13px;padding:10px 11px;min-width:0;}',
            '.fmx-tcl{font-size:8.5px;font-weight:700;color:#8990a8;text-transform:uppercase;letter-spacing:0.3px;line-height:1.25;min-height:22px;}',
            '.fmx-tcv{font-size:18px;font-weight:800;color:#fff;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-tcv small{font-size:11px;font-weight:700;color:#8990a8;}',
            '.fmx-tvol{font-size:10.5px;color:#8990a8;display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:2px 0 6px;}',
            '.fmx-tvol b{color:#c9cbe0;font-weight:700;font-variant-numeric:tabular-nums;}',
            '.fmx-tvol i{font-size:12px;}',
            '.fmx-psec{font-size:11px;font-weight:700;color:#8990a8;text-transform:uppercase;letter-spacing:0.4px;margin:18px 0 9px;display:flex;align-items:center;gap:6px;}',
            '.fmx-pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}',
            '.fmx-ptile{border:0.5px solid;border-radius:13px;padding:11px 12px;background:rgba(255,255,255,0.018);min-width:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}',
            '.fmx-pthead{display:flex;align-items:center;gap:6px;min-width:0;}',
            '.fmx-ptdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}',
            '.fmx-ptn{font-size:11px;font-weight:700;color:#e8e8ed;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;}',
            '.fmx-ptv{font-size:16px;font-weight:800;color:#fff;margin:6px 0 4px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-ptu{font-size:10px;font-weight:700;color:#8990a8;}',
            '.fmx-pbar{height:3px;border-radius:3px;background:rgba(255,255,255,0.07);overflow:hidden;margin:0 0 7px;}',
            '.fmx-pbarf{height:100%;border-radius:3px;}',
            '.fmx-ptmeta{display:flex;flex-wrap:wrap;gap:4px 8px;font-size:9.5px;color:#8990a8;font-variant-numeric:tabular-nums;}',
            '.fmx-pts{font-size:9.5px;color:#8990a8;}',
            '.fmx-bmrow{position:relative;margin-bottom:9px;cursor:pointer;}',
            '.fmx-bmrow.frz .fmx-zw{filter:grayscale(1);opacity:0.5;pointer-events:none;}',
            '.fmx-frzTag{position:absolute;top:8px;right:36px;font-size:9px;font-weight:700;color:#8fb6ff;background:rgba(99,140,255,0.14);border:0.5px solid rgba(99,140,255,0.3);padding:3px 7px;border-radius:6px;display:flex;align-items:center;gap:4px;z-index:3;}',
            '.fmx-bmdel{position:absolute;top:10px;right:7px;width:40px;height:40px;border-radius:11px;background:rgba(10,13,24,0.6);border:0.5px solid rgba(239,68,68,0.3);color:#ef4444;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;z-index:3;transition:all 140ms;}',
            '.fmx-bmdel.arm{background:#ef4444;border-color:#ef4444;color:#fff;transform:scale(1.1);}',
            '.fmx-bmrow .fmx-lrow{padding-right:52px;}',
            '.fmx-bmrow .fmx-lchev{display:none;}',
            '@media (max-width:375px){' +
            '.fmx-bmrow .fmx-lrow{padding-right:44px;padding-left:10px;gap:8px;}' +
            '.fmx-bmrow .fmx-lmet{gap:5px;}' +
            '.fmx-bmdel{width:36px;height:36px;top:12px;right:5px;}' +
            '}',
            '@media (max-width:330px){' +
            '.fmx-bmrow .fmx-lrow{padding-right:40px;padding-left:9px;}' +
            '.fmx-bmrow .fmx-lmet .fmx-lm:first-child i{display:none;}' +
            '.fmx-bmdel{width:34px;height:34px;top:13px;right:4px;}' +
            '}',
            '.fmx-b-deal{color:#f59e0b;background:rgba(245,158,11,0.1);}',
            '.fmx-dealline{font-size:11px;color:#8990a8;margin-top:10px;display:flex;align-items:center;gap:6px;justify-content:center;}',
            '.fmx-proof{margin-top:10px;background:rgba(90,176,230,0.08);border:0.5px solid rgba(90,176,230,0.25);border-radius:10px;padding:10px 12px;font-size:12px;color:#c9cbe0;line-height:1.5;}',
            '.fmx-proof-t{font-size:11px;font-weight:700;color:#5ab0e6;display:flex;align-items:center;gap:5px;}',
            '.fmx-proof a{color:#5ab0e6;}',
            '.fmx-plc{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);border-radius:9px;padding:9px 10px;margin-top:6px;}',
            '.fmx-plc-in{margin:0;flex:1;font-size:12px;padding:8px;}',
            '.fmx-revs{margin-top:12px;padding:11px 12px;background:rgba(245,158,11,0.05);border:0.5px solid rgba(245,158,11,0.15);border-radius:11px;}',
            '.fmx-revs-t{font-size:11px;font-weight:700;color:#e8e8ed;margin-bottom:7px;display:flex;align-items:center;gap:5px;}',
            '.fmx-rev{display:flex;flex-direction:column;gap:2px;padding:7px 0;border-top:0.5px solid rgba(255,255,255,0.05);}',
            '.fmx-rev:first-of-type{border-top:none;padding-top:0;}',
            '.fmx-rev-s{color:#f59e0b;font-size:11px;letter-spacing:1px;}',
            '.fmx-rev-x{font-size:11.5px;color:#c9cbe0;line-height:1.5;overflow-wrap:anywhere;}',
            '.fmx-rev-a{font-size:9.5px;color:#565b73;}',
            '.fmx-dealtgl{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#c9cbe0;margin-top:12px;cursor:pointer;}',
            '.fmx-dealtgl input{accent-color:#818cf8;width:15px;height:15px;}',
            '.fmx-pend{margin-top:12px;padding:11px 12px;background:rgba(245,158,11,0.06);border:0.5px solid rgba(245,158,11,0.2);border-radius:12px;}',
            '.fmx-pend-t{font-size:11px;font-weight:700;color:#e8e8ed;margin-bottom:8px;display:flex;align-items:center;gap:6px;}',
            '.fmx-pend-r{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;font-size:11px;color:#8990a8;border-top:0.5px solid rgba(255,255,255,0.05);}',
            '.fmx-pend-r:first-of-type{border-top:none;}',
            '.fmx-leads{margin-top:11px;padding:10px 11px;background:rgba(129,140,248,0.06);border:0.5px solid rgba(129,140,248,0.18);border-radius:11px;}',
            '.fmx-leads-t{font-size:10px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:0.3px;display:flex;align-items:center;gap:5px;margin-bottom:8px;}',
            '.fmx-lead{display:flex;flex-direction:column;gap:1px;padding:7px 0;border-top:0.5px solid rgba(255,255,255,0.05);text-decoration:none;}',
            '.fmx-lead:first-of-type{border-top:none;padding-top:0;}',
            '.fmx-lead b{font-size:12px;color:#e8e8ed;font-weight:600;}',
            '.fmx-lead span{font-size:10px;color:#8990a8;}',
            '.fmx-acc{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;margin-bottom:9px;overflow:hidden;}',
            '.fmx-acc.open{border-color:rgba(99,102,241,0.3);}',
            '.fmx-acch{display:flex;align-items:center;gap:11px;padding:12px 13px;cursor:pointer;user-select:none;}',
            '.fmx-accic{width:30px;height:30px;border-radius:9px;background:rgba(129,140,248,0.12);display:flex;align-items:center;justify-content:center;color:#818cf8;font-size:15px;flex-shrink:0;}',
            '.fmx-acct{font-size:13px;font-weight:600;letter-spacing:-0.2px;}',
            '.fmx-accv{font-size:10.5px;color:#8990a8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
            '.fmx-accc{color:#565b73;font-size:17px;transition:transform 240ms;flex-shrink:0;}',
            '.fmx-acc.open .fmx-accc{transform:rotate(180deg);}',
            '.fmx-accb{max-height:0;overflow:hidden;transition:max-height 320ms ease;}',
            '.fmx-acc.open .fmx-accb{max-height:1400px;}',
            '.fmx-acci{padding:2px 13px 15px;}',
            '.fmx-entq{font-size:13px;color:#8990a8;margin-bottom:12px;}',
            '.fmx-ent{display:flex;align-items:center;gap:14px;padding:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:16px;cursor:pointer;margin-bottom:11px;transition:border-color 160ms,transform 160ms,background 160ms;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
            '.fmx-ent:active{transform:scale(0.99);}',
            '.fmx-ent:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.10);}',
            '.fmx-entic{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:25px;color:#fff;flex-shrink:0;}',
            '.fmx-entn{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
            '.fmx-enttag{font-size:9.5px;font-weight:600;padding:2px 8px;border-radius:99px;}',
            '.fmx-entd{font-size:11.5px;color:#8990a8;line-height:1.4;margin-top:4px;}',
            '.fmx-mq{overflow:hidden;}',
            '.fmx-mqi{display:inline-block;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;vertical-align:top;}',
            '.fmx-mqc{display:inline-block;}',
            '.fmx-mq-on .fmx-mqi{max-width:none;overflow:visible;text-overflow:clip;will-change:transform;backface-visibility:hidden;}',
            '.fmx-mq-on .fmx-mqc + .fmx-mqc{margin-left:var(--mqg,80px);}',
            '.fmx-mtabs{display:flex;gap:6px;margin-bottom:14px;}',
            '.fmx-mtab{flex:1;padding:9px 4px;border-radius:10px;border:0.5px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);color:#8990a8;font-size:12px;font-weight:600;cursor:pointer;}',
            '.fmx-mtab.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;}',
            '.fmx-mcard{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;padding:13px 14px;margin-bottom:11px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
            '.fmx-mtitle{font-size:13.5px;font-weight:700;color:#e8e8ed;overflow-wrap:anywhere;}',
            '.fmx-msub{font-size:12px;color:#c5c8d6;margin-top:3px;overflow-wrap:anywhere;line-height:1.4;}',
            '.fmx-mmeta{font-size:11px;color:#8990a8;margin-top:5px;overflow-wrap:anywhere;}',
            '.fmx-mai{font-size:11px;color:#f59e0b;margin-top:6px;line-height:1.4;overflow-wrap:anywhere;}',
            '.fmx-mbadge{font-size:9px;font-weight:700;color:#ef4444;border:1px solid rgba(239,68,68,0.4);border-radius:5px;padding:1px 4px;margin-left:4px;}',
            '.fmx-mrow{display:flex;gap:8px;margin-top:11px;}',
            '.fmx-mbtn{flex:1;padding:10px 4px;border-radius:10px;border:none;font-size:12.5px;font-weight:700;cursor:pointer;min-height:40px;}',
            '.fmx-mbtn.ok{background:rgba(93,202,165,0.16);color:#5DCAA5;border:1px solid rgba(93,202,165,0.34);}',
            '.fmx-mbtn.no{background:rgba(239,68,68,0.13);color:#f87171;border:1px solid rgba(239,68,68,0.32);}',
            '.fmx-mbtn:active{transform:scale(0.98);}',
            '.fmx-mopen{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;padding:9px;border-radius:10px;border:0.5px solid rgba(129,140,248,0.35);background:rgba(129,140,248,0.10);color:#a5b4fc;font-size:12px;font-weight:600;cursor:pointer;min-height:40px;}',
            '.fmx-mopen:active{transform:scale(0.98);}',
            '.fmx-macat{font-size:11px;color:#8990a8;margin-top:5px;}',
            '.fmx-macat b{color:#c5c8d6;font-weight:600;}',
            '.fmx-mstatrow{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12px;color:#8990a8;padding:6px 0;border-top:0.5px solid rgba(255,255,255,0.06);margin-top:6px;}',
            '.fmx-mstatrow b{color:#e8e8ed;font-weight:700;text-align:right;overflow-wrap:anywhere;}',
            '.fmx-mgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:11px;}',
            '.fmx-stile{background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.10);border-radius:14px;padding:13px;}',
            '.fmx-stv{font-size:19px;font-weight:800;color:#e8e8ed;overflow-wrap:anywhere;}',
            '.fmx-stl{font-size:11px;color:#8990a8;margin-top:3px;}',
            '.fmx-sts{font-size:10px;color:#565b73;margin-top:1px;}',

            '.fmx-slh{display:flex;align-items:center;gap:8px;margin-bottom:4px;}',
            '.fmx-slh .t{font-size:12px;font-weight:700;color:#e8e8ed;display:flex;align-items:center;gap:6px;}',
            '.fmx-slh .t i{color:#5DCAA5;font-size:14px;}',
            '.fmx-slfree{margin-left:auto;font-size:10.5px;font-weight:700;color:#5DCAA5;background:rgba(93,202,165,0.12);border:0.5px solid rgba(93,202,165,0.3);border-radius:999px;padding:3px 9px;white-space:nowrap;}',
            '.fmx-slhint{font-size:10.5px;color:#8990a8;line-height:1.45;margin-bottom:10px;}',
            '.fmx-slgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}',
            '.fmx-slw{font-size:9.5px;color:#565b73;text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;padding-bottom:2px;}',
            '.fmx-sd{min-height:40px;border-radius:9px;border:0.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);color:#c9cbe0;font-size:12px;font-weight:600;font-family:inherit;font-variant-numeric:tabular-nums;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0;line-height:1.1;}',
            '.fmx-sdm{font-size:8px;font-weight:800;letter-spacing:0.4px;text-transform:uppercase;color:#818cf8;margin-bottom:1px;}',
            '.fmx-sd.free{color:#5DCAA5;background:rgba(93,202,165,0.09);border-color:rgba(93,202,165,0.22);}',
            '.fmx-sd.busy{color:#8990a8;background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06);}',
            '.fmx-sd.busy .fmx-sdn{text-decoration:line-through;text-decoration-color:rgba(239,128,128,0.75);}',
            '.fmx-sd.past{color:#3a3f52;background:transparent;border-color:transparent;}',
            '.fmx-sd.past .fmx-sdm{color:#3a3f52;}',
            '.fmx-sd.today{box-shadow:0 0 0 1.5px rgba(129,140,248,0.75);}',
            '.fmx-sd.own{cursor:pointer;}',
            '.fmx-sd.own:active{transform:scale(0.94);}',
            '.fmx-sleg{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:10px;color:#8990a8;}',
            '.fmx-sleg span{display:inline-flex;align-items:center;gap:5px;}',
            '.fmx-sleg i{width:8px;height:8px;border-radius:3px;display:inline-block;}',
            '.fmx-slnote{margin-top:9px;font-size:11px;color:#5DCAA5;display:flex;align-items:flex-start;gap:6px;line-height:1.4;}',
            '.fmx-cmpb.on{background:rgba(93,202,165,0.9);color:#06281e;}',
            '.fmx-cmpBar{position:fixed;left:12px;right:12px;bottom:12px;z-index:60;display:none;align-items:center;gap:8px;padding:9px 10px;border-radius:14px;background:rgba(16,19,32,0.92);border:0.5px solid rgba(255,255,255,0.12);backdrop-filter:blur(12px);box-shadow:0 8px 28px rgba(0,0,0,0.5);}',
            '.fmx-cmpBar.on{display:flex;}',
            '.fmx-cmpn{font-size:11px;color:#8990a8;white-space:nowrap;}',
            '.fmx-cmpclr{margin-left:auto;background:transparent;border:0;color:#8990a8;font-size:11px;font-family:inherit;cursor:pointer;padding:6px;min-height:40px;}',
            '.fmx-cmpgo{background:rgba(93,202,165,0.14);border:0.5px solid rgba(93,202,165,0.35);color:#5DCAA5;font-size:11.5px;font-weight:700;font-family:inherit;border-radius:10px;padding:0 12px;min-height:40px;cursor:pointer;display:flex;align-items:center;gap:6px;white-space:nowrap;}',
            '.fmx-cmpgo[disabled]{opacity:0.45;}',
            '.fmx-cmpwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -2px;}',
            '.fmx-cmpt{width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums;}',
            '.fmx-cmpt th,.fmx-cmpt td{padding:8px 4px;text-align:center;border-bottom:0.5px solid rgba(255,255,255,0.07);}',
            '.fmx-cmpt th{vertical-align:bottom;}',
            '.fmx-cmph{text-align:left!important;color:#8990a8;font-size:10px;font-weight:600;line-height:1.25;width:70px;min-width:70px;white-space:normal;position:sticky;left:0;background:#0f1220;z-index:1;}',
            '.fmx-cmpav{width:34px;height:34px;margin:0 auto 5px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;}',
            '.fmx-cmpav img{width:100%;height:100%;object-fit:cover;display:block;}',
            '.fmx-cmpnm{font-size:10.5px;font-weight:700;color:#e8e8ed;max-width:72px;margin:0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-cmpu{font-size:9px;color:#565b73;max-width:72px;margin:0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-cmpt td{color:#c9cbe0;font-weight:600;}',
            '.fmx-cmpw{color:#5DCAA5!important;background:rgba(93,202,165,0.09);}',
            '.fmx-cmpw i{font-size:10px;margin-left:3px;vertical-align:1px;}',
            '.fmx-cmpna{color:#565b73!important;font-weight:400!important;}',
            '.fmx-cmpleg{margin-top:10px;font-size:10px;color:#8990a8;line-height:1.45;display:flex;gap:6px;align-items:flex-start;}',
            '.fmx-cmpleg i{color:#5DCAA5;flex:0 0 auto;margin-top:1px;}',
            '.fmx-nslist{display:flex;flex-direction:column;gap:6px;margin-bottom:4px;}',
            '.fmx-nsrow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);min-height:40px;}',
            '.fmx-nsn{flex:1;min-width:0;font-size:11.5px;font-weight:600;color:#e8e8ed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-nscpm{font-size:11.5px;font-weight:700;color:#c9cbe0;font-variant-numeric:tabular-nums;white-space:nowrap;flex:0 0 auto;}',
            '.fmx-nsd{font-size:10px;font-weight:700;border-radius:999px;padding:2px 6px;display:inline-flex;align-items:center;gap:2px;white-space:nowrap;flex:0 0 auto;}',
            '.fmx-nsd.good{color:#5DCAA5;background:rgba(93,202,165,0.12);}',
            '.fmx-nsd.bad{color:#ef8080;background:rgba(239,128,128,0.12);}',
            '.fmx-nsna{font-size:10px;color:#565b73;white-space:nowrap;flex:0 0 auto;}',
            '.fmx-nsx{flex:0 0 auto;width:26px;height:26px;border-radius:8px;border:0;background:transparent;color:#565b73;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;}',
            '.fmx-nsx:active{background:rgba(255,255,255,0.06);}',
            '.fmx-minecard{background:rgba(255,255,255,0.025);border:0.5px solid rgba(255,255,255,0.09);border-radius:14px;padding:13px;margin-bottom:10px;}',
            '.fmx-minehead{display:flex;align-items:center;gap:10px;}',
            '.fmx-mineav{width:38px;height:38px;border-radius:11px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex:0 0 auto;}',
            '.fmx-mineav img{width:100%;height:100%;object-fit:cover;display:block;}',
            '.fmx-minenm{font-size:13px;font-weight:700;color:#e8e8ed;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-mineu{font-size:10.5px;color:#565b73;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-mine-st{flex:0 0 auto;font-size:10px;font-weight:700;border-radius:999px;padding:3px 9px;border:0.5px solid;white-space:nowrap;}',
            '.fmx-minerej{margin-top:9px;font-size:11px;color:#ef8080;line-height:1.45;background:rgba(239,68,68,0.07);border:0.5px solid rgba(239,68,68,0.2);border-radius:10px;padding:8px 10px;}',
            '.fmx-minemet{margin-top:9px;font-size:11px;color:#8990a8;font-variant-numeric:tabular-nums;}',
            '.fmx-minemet b{color:#c9cbe0;}',
            '.fmx-mineacts{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px;}',
            '.fmx-mineacts .fmx-btn{min-height:40px;font-size:11px;}',
            '.fmx-avail{display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:10px;border-top:0.5px solid rgba(255,255,255,0.06);font-size:11px;}',
            '.fmx-avail .fr{color:#5DCAA5;font-weight:600;}.fmx-avail .bs{color:#ef8080;font-weight:600;}.fmx-avail .nd{color:#565b73;}',
            '.fmx-avail .new{margin-left:auto;color:#565b73;white-space:nowrap;}',
            '.fmx-dpill{display:inline-flex;align-items:center;border-radius:99px;padding:2px 7px;font-size:9.5px;font-weight:700;margin-left:5px;vertical-align:2px;white-space:nowrap;}',
            '.fmx-dpill.gr{background:rgba(93,202,165,0.15);color:#5DCAA5;}.fmx-dpill.am{background:rgba(245,191,79,0.15);color:#f5bf4f;}',
            '.fmx-calhead{display:flex;align-items:center;gap:8px;margin-bottom:9px;}',
            '.fmx-calhead b{flex:1;text-align:center;font-size:13px;}',
            '.fmx-calnav{min-height:30px;min-width:44px;padding:4px 12px;flex:0 0 auto;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;border-radius:99px;cursor:pointer;font-family:inherit;font-size:13px;}',
            '.fmx-sd{position:relative;}',
            '.fmx-sd .dm{position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#818cf8;}',
            '.fmx-sd.hot{border-color:rgba(245,191,79,0.6);background:rgba(245,191,79,0.1);color:#f5bf4f;}',
            '.fmx-sd.sel{border:1.5px solid transparent;background:linear-gradient(145deg,#8b93ff,#6d63f0);color:#fff;font-weight:800;box-shadow:0 0 0 2px rgba(139,147,255,0.35),0 4px 14px rgba(109,99,240,0.55);transform:scale(1.07);z-index:1;animation:fmxSelPop .18s ease-out;}',
            '.fmx-sd.sel .fmx-sdn{color:#fff;}',
            '@keyframes fmxSelPop{0%{transform:scale(0.92);}100%{transform:scale(1.07);}}',
            '@keyframes fmxJustFlash{0%{box-shadow:0 0 0 3px rgba(245,191,79,0.9);}100%{box-shadow:0 0 0 3px rgba(245,191,79,0);}}',
            '.fmx-sd.just,.fmx-dd.just .c{animation:fmxJustFlash .8s ease-out;}',
            '.fmx-sd.watch{box-shadow:inset 0 0 0 1.5px rgba(245,191,79,0.65);}',
            '.fmx-sd.busy2{cursor:pointer;}',
            '.fmx-sd.free{background:rgba(93,202,165,0.05);border-color:rgba(93,202,165,0.14);color:#7fbfa8;}',
            '.fmx-sd.free.hot{background:rgba(245,191,79,0.1);border-color:rgba(245,191,79,0.6);color:#f5bf4f;}',
            '.fmx-dd.sel .c{border:1.5px solid transparent;background:linear-gradient(145deg,#8b93ff,#6d63f0);color:#fff;font-weight:800;box-shadow:0 0 0 2px rgba(139,147,255,0.35),0 3px 10px rgba(109,99,240,0.5);animation:fmxSelPop2 .18s ease-out;}',
            '@keyframes fmxSelPop2{0%{transform:scale(0.9);}100%{transform:scale(1);}}',
            '.fmx-dd.hot .c{background:rgba(245,191,79,0.12);color:#f5bf4f;border-color:rgba(245,191,79,0.5);}',
            '.fmx-dd.watch .c{box-shadow:inset 0 0 0 1.5px rgba(245,191,79,0.65);}',
            '.fmx-slmore{width:100%;margin-top:10px;}',
            '.fmx-tslots{margin-top:11px;border-top:0.5px solid rgba(255,255,255,0.06);padding-top:10px;}',
            '.fmx-tslh{font-size:10.5px;font-weight:800;color:#c9cbe0;display:flex;align-items:center;gap:6px;margin-bottom:8px;}',
            '.fmx-tslh i{color:#818cf8;}',
            '.fmx-tsl{display:flex;align-items:center;gap:10px;padding:10px 11px;border-radius:11px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.08);margin-bottom:6px;cursor:pointer;}',
            '.fmx-tsl .tm{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;font-weight:800;width:46px;flex:0 0 auto;}',
            '.fmx-tsl .st{margin-left:auto;font-size:10px;font-weight:700;color:#5DCAA5;}',
            '.fmx-tsl.sel{border-color:rgba(129,140,248,0.5);background:rgba(129,140,248,0.1);}',
            '.fmx-tsl.sel .st{color:#c7cdff;}',
            '.fmx-tsl.bs{opacity:0.5;cursor:default;}',
            '.fmx-tsl.bs .st{color:#565b73;}',
            '.fmx-tsl.hot{border-color:rgba(245,191,79,0.45);background:rgba(245,191,79,0.07);}',
            '.fmx-hottag{font-size:9.5px;font-weight:800;color:#f5bf4f;background:rgba(245,191,79,0.14);border:0.5px solid rgba(245,191,79,0.4);border-radius:6px;padding:2px 6px;flex:0 0 auto;}',
            '#fmx-calMode .fmx-fx,#fmx-hotPcts .fmx-fx,#fmx-hotTimes .fmx-fx{min-height:40px;padding:9px 12px;}',
            '.fmx-sd.off{opacity:0.22;cursor:default;}',
            '.fmx-dd.off{opacity:0.22;pointer-events:none;}',
            '.fmx-dd.off2{opacity:0.35;}',
            '.fmx-calnav:disabled{opacity:0.25;cursor:default;}',
            'html.fmx-bgfreeze,body.fmx-bgfreeze{overflow:hidden!important;}',
            'body.fmx-bgfreeze #fmx-main,body.fmx-bgfreeze #app{pointer-events:none;}',
            'body.fmx-bgfreeze #drawer.active,body.fmx-bgfreeze #drawer-overlay.active{pointer-events:auto;}',
            'body.fmx-bgfreeze #fmx-main *,body.fmx-bgfreeze #app *{animation-play-state:paused!important;}',
            '#fmx-catGrid>.fmx-scard{content-visibility:auto;contain-intrinsic-size:auto 620px;}',
            'body.fmx-bgfreeze #fmx-main img[src*=".gif"],body.fmx-bgfreeze #app img[src*=".gif"]{visibility:hidden;}',
            'body.fmx-bgfull #fmx-main,body.fmx-bgfull #app{visibility:hidden;}',
            '.fmx-tsl[data-otog] .st{margin-left:0;}',
            '.fmx-osw{width:34px;height:20px;border-radius:99px;background:rgba(93,202,165,0.4);position:relative;flex:0 0 auto;margin-left:auto;}',
            '.fmx-osw::after{content:"";position:absolute;top:3px;left:17px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s;}',
            '.fmx-osw.busy{background:rgba(255,255,255,0.12);}',
            '.fmx-osw.busy::after{left:3px;}',
            '.fmx-tsetup{margin-top:12px;border-top:0.5px solid rgba(255,255,255,0.08);padding-top:12px;}',
            '.fmx-tsh{font-size:11px;font-weight:800;color:#c9cbe0;display:flex;align-items:center;gap:7px;margin-bottom:6px;}',
            '.fmx-tsh i{color:#818cf8;}',
            '.fmx-tshint{font-size:10px;color:#8990a8;line-height:1.5;margin-bottom:10px;}',
            '.fmx-tchips{display:flex;flex-wrap:wrap;gap:6px;}',
            '.fmx-tchip{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:700;padding:7px 11px;border-radius:9px;border:0.5px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.02);color:#8990a8;cursor:pointer;}',
            '.fmx-tchip.on{background:rgba(129,140,248,0.15);border-color:rgba(129,140,248,0.4);color:#c7cdff;}',
            '.fmx-tswrow{display:flex;align-items:center;gap:10px;margin-top:11px;font-size:12px;color:#c9cbe0;}',
            '.fmx-tswrow span{flex:1;font-weight:600;}',
            '.fmx-tswrow span i{display:block;font-size:9.5px;color:#8990a8;font-style:normal;font-weight:400;margin-top:1px;}',
            '.fmx-tsw2{width:40px;height:23px;border-radius:99px;background:rgba(255,255,255,0.1);position:relative;flex:0 0 auto;cursor:pointer;}',
            '.fmx-tsw2::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:left .15s;}',
            '.fmx-tsw2.on{background:#818cf8;}',
            '.fmx-tsw2.on::after{left:20px;}',
            '.fmx-tsave{width:100%;margin-top:11px;}',
            '.fmx-sdots{display:flex;gap:1.5px;justify-content:center;align-items:center;line-height:0;margin-top:1px;}',
            '.fmx-sdots i{width:3px;height:3px;border-radius:50%;display:inline-block;}',
            '.fmx-sdots i.f{background:#5DCAA5;}',
            '.fmx-sdots i.b{background:rgba(255,255,255,0.2);}',
            '.fmx-sd{position:relative;}',
            '.fmx-sd .fmx-sdots{position:absolute;bottom:2px;left:0;right:0;}',
            '.fmx-basket{margin-top:10px;}',
            '.fmx-bchips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px;}',
            '.fmx-blbl{font-size:10px;font-weight:800;color:#8990a8;}',
            '.fmx-bchip{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#c7cdff;background:rgba(129,140,248,0.14);border:0.5px solid rgba(129,140,248,0.35);border-radius:8px;padding:5px 9px;cursor:pointer;}',
            '.fmx-bchip i{font-size:12px;color:#8990a8;}',
            '.fmx-baddbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:10px;border:1px dashed rgba(129,140,248,0.35);background:rgba(129,140,248,0.05);color:#a7b0f0;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer;}',
            '.fmx-peak{display:flex;align-items:center;gap:9px;margin-top:11px;padding:10px 12px;border-radius:12px;background:linear-gradient(135deg,rgba(90,176,230,0.12),rgba(90,176,230,0.03));border:0.5px solid rgba(90,176,230,0.3);font-size:11.5px;color:#c9cbe0;}',
            '.fmx-peak i{color:#5ab0e6;font-size:15px;flex:0 0 auto;}',
            '.fmx-peak b{color:#e8e8ed;font-family:ui-monospace,Menlo,Consolas,monospace;}',
            '.fmx-peaktag{font-size:8px;font-weight:800;letter-spacing:0.3px;color:#5ab0e6;background:rgba(90,176,230,0.14);border-radius:5px;padding:1px 6px;}',
            '.fmx-tsl.peak{border-color:rgba(90,176,230,0.4);background:rgba(90,176,230,0.06);}',
            '.fmx-tsl.sel.peak{border-color:rgba(129,140,248,0.5);background:rgba(129,140,248,0.1);}',
            '.fmx-htog{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.08);margin-top:2px;}',
            '.fmx-htl{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:#e8e8ed;}',
            '.fmx-htl i{display:block;font-size:9.5px;color:#8990a8;font-style:normal;font-weight:400;margin-top:2px;}',
            '.fmx-hsw{width:42px;height:24px;border-radius:99px;background:rgba(255,255,255,0.12);position:relative;flex:0 0 auto;cursor:pointer;transition:background .16s;}',
            '.fmx-hsw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .16s;}',
            '.fmx-hsw.on{background:#818cf8;}',
            '.fmx-hsw.on::after{left:21px;}',
            '.fmx-shbg{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9400;display:none;}',
            '.fmx-shbg.on{display:block;}',
            '.fmx-sheet{position:fixed;bottom:0;left:50%;transform:translate(-50%,105%);width:100%;max-width:520px;z-index:9410;background:rgba(20,24,40,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:20px 20px 0 0;border:0.5px solid rgba(255,255,255,0.1);border-bottom:none;padding:10px 16px 22px;transition:transform 240ms cubic-bezier(0.3,0.9,0.3,1);max-height:84dvh;overflow-y:auto;}',
            '.fmx-sheet.on{transform:translate(-50%,0);}',
            '.fmx-sheet .grip{width:38px;height:4px;border-radius:4px;background:rgba(255,255,255,0.18);margin:2px auto 12px;}',
            '.fmx-sheet h3{margin:0 0 4px;font-size:14.5px;}',
            '.fmx-pwc{background:linear-gradient(160deg,rgba(255,255,255,0.045),rgba(255,255,255,0.014));border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:14px;position:relative;overflow:hidden;}',
            '.fmx-pwc::before{content:"";position:absolute;top:-50px;right:-40px;width:180px;height:180px;background:radial-gradient(circle,rgba(16,185,129,0.18),transparent 66%);pointer-events:none;}',
            '.fmx-mdim .pw-mv{opacity:0.4;}.fmx-mdim .pw-ml{opacity:0.6;}',
            '.fmx-pwc .pw-hlab{font-size:10px;color:#8990a8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;position:relative;}',
            '.fmx-pwc .pw-hbig{display:flex;align-items:baseline;gap:8px;margin-top:2px;position:relative;flex-wrap:wrap;}',
            '.fmx-pwc .pw-hbig .v{font-size:27px;font-weight:800;letter-spacing:-0.9px;line-height:1;background:linear-gradient(135deg,#fff,#a7f0d4);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}',
            '.fmx-pwc .pw-hbig .u{font-size:10.5px;color:#565b73;}',
            '.pw-spark{margin:9px 0 3px;position:relative;}',
            '.pw-spark svg{display:block;width:100%;height:auto;overflow:visible;}',
            '.pw-spark svg text{font-family:inherit;}',
            '.pw-sphead{display:flex;align-items:center;justify-content:space-between;font-size:9.5px;color:#565b73;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;margin-bottom:4px;}',
            '.pw-sphead b{font-size:11px;letter-spacing:0;}',
            '.fmx-pwc .pw-mrow{display:flex;align-items:stretch;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);position:relative;}',
            '.fmx-pwc .pw-mcell{flex:1;min-width:0;}',
            '.fmx-pwc .pw-ml{font-size:9px;color:#565b73;text-transform:uppercase;letter-spacing:0.1px;font-weight:600;line-height:1.15;min-height:2.2em;display:flex;align-items:flex-end;}',
            '.fmx-pwc .pw-mv{font-size:15px;font-weight:800;margin-top:3px;letter-spacing:-0.4px;display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;color:#e8e8ed;}',
            '.fmx-pwc .pw-mdiv{width:1px;background:rgba(255,255,255,0.07);margin:1px 7px;flex-shrink:0;}',
            '.fmx-trust .row{display:flex;align-items:center;gap:9px;padding:10px 12px;border-bottom:0.5px solid rgba(255,255,255,0.05);cursor:pointer;}',
            '.fmx-trust .row:last-child{border-bottom:none;}',
            '.fmx-trust .t{flex:1;font-size:11.5px;line-height:1.45;color:#e8e8ed;}',
            '.fmx-trust .arr{color:#565b73;}',
            '.fmx-fmt{display:flex;align-items:center;gap:8px;padding:11px 12px;border-bottom:0.5px solid rgba(255,255,255,0.05);cursor:pointer;font-size:12px;}',
            '.fmx-fmt:last-child{border-bottom:none;}',
            '.fmx-fmt.on{background:rgba(129,140,248,0.08);}',
            '.fmx-fmt .pr{margin-left:auto;font-weight:700;white-space:nowrap;}',
            '.fmx-fmt .cp{color:#8990a8;font-size:10.5px;width:78px;text-align:right;white-space:nowrap;}',
            '.fmx-fmt .bd{width:7px;height:7px;border-radius:50%;background:#5DCAA5;flex:0 0 auto;}',
            '.fmx-fmtnm{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1;}',
            '.fmx-fmtnm>span{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-fmtsub{font-size:9px;color:#565b73;font-style:normal;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-terms{margin-top:2px;}',
            '.fmx-tline{display:flex;align-items:center;gap:8px;font-size:11.5px;color:#c9cbe0;padding:5px 0;}',
            '.fmx-tline i{color:#8990a8;font-size:13px;flex:0 0 auto;}',
            '.fmx-lsfoot{position:sticky;bottom:-15px;margin:14px -16px -15px;padding:12px 16px 15px;background:linear-gradient(180deg,transparent,rgba(18,21,35,0.97) 35%);display:flex;gap:8px;z-index:5;}',
            '.fmx-lsfoot .bm{flex:0 0 48px;}',
            '.fmx-lsfoot .go{flex:1;}',
            '.fmx-tabvp{position:relative;overflow:hidden;border-radius:16px;border:0.5px solid rgba(255,255,255,0.08);padding-top:75%;transition:padding-top 380ms cubic-bezier(0.3,0.9,0.3,1);}',
            '.fmx-tabvp.open{padding-top:150%;}',
            '.fmx-tabvp:not(.open){border-bottom-left-radius:0;border-bottom-right-radius:0;-webkit-mask-image:linear-gradient(180deg,#000 52%,rgba(0,0,0,0.4) 80%,transparent 99%);mask-image:linear-gradient(180deg,#000 52%,rgba(0,0,0,0.4) 80%,transparent 99%);}',
            '.fmx-tabvp.noext{padding-top:150%;-webkit-mask-image:none;mask-image:none;border-radius:16px;}',
            '.fmx-tab{position:absolute;top:0;left:0;width:100%;aspect-ratio:2/3;min-height:100%;background:linear-gradient(150deg,#131a30,#0c1020 45%,#0e1526 70%,#101a2c);}',
            '.tbg-g1{background:radial-gradient(120% 90% at 80% -10%, rgba(93,202,165,0.55), transparent 55%),radial-gradient(120% 100% at 0% 110%, rgba(20,90,70,0.5), transparent 55%),#0a0d18;}',
            '.tbg-g2{background:radial-gradient(90% 70% at 85% -5%, rgba(168,85,247,0.60), rgba(109,40,217,0.22) 45%, transparent 66%),radial-gradient(100% 80% at -5% 110%, rgba(217,70,239,0.38), transparent 60%),radial-gradient(60% 40% at 50% 115%, rgba(139,92,246,0.28), transparent 62%),radial-gradient(45% 30% at 20% 8%, rgba(88,28,235,0.30), transparent 65%),linear-gradient(170deg, #170433 0%, #0d0224 48%, #060112 100%);}',
            '.tbg-mid{background:radial-gradient(140% 90% at 50% -30%, #131a2e, #0a0d18 60%);}',
            '.tbg-net{background:linear-gradient(rgba(93,202,165,0.055) 1px, transparent 1px),linear-gradient(90deg, rgba(93,202,165,0.055) 1px, transparent 1px),radial-gradient(120% 100% at 50% -20%, #10182b, #0a0d18 65%);background-size:34px 34px,34px 34px,100% 100%;}',
            '.tbg-aur{background:radial-gradient(60% 45% at 22% 8%, rgba(93,202,165,0.5), transparent 60%),radial-gradient(55% 45% at 85% 30%, rgba(129,140,248,0.45), transparent 65%),radial-gradient(60% 50% at 55% 105%, rgba(245,191,79,0.22), transparent 60%),#0a0d18;}',
            '.tbg-coal{background:linear-gradient(160deg,#101318,#07090f 70%);}',
            '.tbg-ocean{background:radial-gradient(110% 90% at 20% -10%, rgba(56,150,220,0.5), transparent 55%),radial-gradient(120% 100% at 90% 110%, rgba(45,212,191,0.35), transparent 55%),#081120;}',
            '.tbg-sunset{background:radial-gradient(110% 80% at 80% -10%, rgba(251,146,60,0.5), transparent 55%),radial-gradient(110% 90% at 10% 110%, rgba(236,72,153,0.4), transparent 55%),#140a14;}',
            '.tbg-lime{background:radial-gradient(110% 90% at 75% -10%, rgba(163,230,53,0.42), transparent 55%),radial-gradient(120% 100% at 5% 110%, rgba(34,197,94,0.32), transparent 55%),#0a1208;}',
            '.tbg-rose{background:radial-gradient(110% 90% at 80% -10%, rgba(244,63,94,0.45), transparent 55%),radial-gradient(120% 100% at 10% 115%, rgba(251,113,133,0.3), transparent 55%),#160a10;}',
            '.tbg-steel{background:linear-gradient(150deg,#1c2430 0%,#0d1420 55%,#0a0f1a 100%);}',
            '.tbg-space{background:radial-gradient(3.2px 3.2px at 432px 88px, rgba(255,255,255,1) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(2.6px 2.6px at 96px 236px, rgba(255,255,255,0.93) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(2.2px 2.2px at 268px 484px, rgba(255,255,255,0.96) 18%, rgba(186,196,255,0.45) 48%, transparent 72%),radial-gradient(1.4px 1.4px at 10px 20px, rgba(255,255,255,0.96), transparent),radial-gradient(1.1px 1.1px at 60px 150px, rgba(255,255,255,0.68), transparent),radial-gradient(1.7px 1.7px at 120px 40px, rgba(255,255,255,0.96), transparent),radial-gradient(1.1px 1.1px at 170px 110px, rgba(255,255,255,0.72), transparent),radial-gradient(1.3px 1.3px at 200px 180px, rgba(255,255,255,0.93), transparent),radial-gradient(1.0px 1.0px at 90px 90px, rgba(255,255,255,0.78), transparent),radial-gradient(1.2px 1.2px at 150px 15px, rgba(255,255,255,0.78), transparent),radial-gradient(1.2px 1.2px at 30px 220px, rgba(255,255,255,0.78), transparent),radial-gradient(1.5px 1.5px at 100px 60px, rgba(255,255,255,0.93), transparent),radial-gradient(1.1px 1.1px at 180px 190px, rgba(255,255,255,0.68), transparent),radial-gradient(1.8px 1.8px at 250px 90px, rgba(255,255,255,0.96), transparent),radial-gradient(1.2px 1.2px at 290px 240px, rgba(255,255,255,0.72), transparent),radial-gradient(1.0px 1.0px at 210px 30px, rgba(255,255,255,0.68), transparent),radial-gradient(1.6px 1.6px at 50px 300px, rgba(255,255,255,0.88), transparent),radial-gradient(1.1px 1.1px at 140px 120px, rgba(255,255,255,0.68), transparent),radial-gradient(1.3px 1.3px at 260px 330px, rgba(255,255,255,0.96), transparent),radial-gradient(2.0px 2.0px at 350px 60px, rgba(255,255,255,1), transparent),radial-gradient(1.2px 1.2px at 410px 180px, rgba(255,255,255,0.68), transparent),radial-gradient(1.4px 1.4px at 320px 260px, rgba(255,255,255,0.78), transparent),radial-gradient(1.1px 1.1px at 80px 30px, rgba(255,255,255,0.78), transparent),radial-gradient(70% 45% at 78% 18%, rgba(124,58,237,0.42), transparent 65%),radial-gradient(55% 40% at 15% 45%, rgba(56,189,248,0.20), transparent 65%),radial-gradient(65% 45% at 60% 85%, rgba(217,70,239,0.22), transparent 65%),linear-gradient(115deg, transparent 28%, rgba(148,163,255,0.12) 42%, rgba(226,232,255,0.16) 50%, rgba(148,163,255,0.12) 58%, transparent 72%),radial-gradient(130% 100% at 50% 120%, #16204a 0%, #070b1a 55%, #030512 100%);background-size:100% 100%,100% 100%,100% 100%,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,233px 197px,317px 263px,317px 263px,317px 263px,317px 263px,317px 263px,317px 263px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,439px 353px,100% 100%,100% 100%,100% 100%,100% 100%,100% 100%;background-repeat:no-repeat,no-repeat,no-repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,repeat,no-repeat,no-repeat,no-repeat,no-repeat,no-repeat;}',
            '.tbg-waves{background:repeating-linear-gradient(115deg, rgba(93,202,165,0.07) 0 2px, transparent 2px 26px),linear-gradient(180deg,#0c1322,#0a0d18);}',
            '.tbg-amber{background:radial-gradient(110% 90% at 78% -10%, rgba(245,191,79,0.45), transparent 55%),radial-gradient(120% 100% at 8% 112%, rgba(217,119,6,0.3), transparent 55%),#140f06;}',
            '.fmx-tab .el{position:absolute;overflow:hidden;}',
            '.fmx-tab .el.ttl{font-weight:800;line-height:1.28;letter-spacing:-0.2px;color:#e8e8ed;overflow:visible;}',
            '.fmx-tab .el.txt{color:#b9c1d9;line-height:1.5;overflow:visible;}',
            '.fmx-tab .el.med{border-radius:12px;box-shadow:0 10px 26px rgba(0,0,0,0.45);}',
            '.fmx-tab .el img,.fmx-tab .el video{width:100%;height:100%;object-fit:cover;display:block;}',
            '.fmx-tab .el.stk{overflow:visible;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.45));display:flex;align-items:center;justify-content:center;color:#fff;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;line-height:1;}',
            '.fmx-tabfade{position:absolute;left:0;right:0;bottom:0;height:42%;z-index:5;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);-webkit-mask-image:linear-gradient(180deg,transparent,#000 55%);mask-image:linear-gradient(180deg,transparent,#000 55%);pointer-events:none;transition:opacity 250ms;}',
            '.fmx-tabvp.open .fmx-tabfade,.fmx-tabvp.noext .fmx-tabfade{opacity:0;}',
            '.fmx-tabmw{display:flex;justify-content:center;margin-top:-34px;position:relative;z-index:6;}',
            '.fmx-tabmore{border:0.5px solid rgba(255,255,255,0.22);background:rgba(16,20,34,0.72);color:#fff;border-radius:99px;padding:9px 20px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit;backdrop-filter:blur(10px);min-height:38px;box-shadow:0 8px 24px rgba(0,0,0,0.45);}',
            '#fmx-peek{position:fixed;inset:0;z-index:9500;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);pointer-events:none;}',
            '#fmx-peek .in{width:82%;max-width:340px;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.18);box-shadow:0 30px 80px rgba(0,0,0,0.7);}',
            '.fmx-sumrow{display:flex;justify-content:space-between;padding:13px 14px;}',
            '.fmx-sumrow .l{font-size:9px;color:#565b73;text-transform:uppercase;letter-spacing:0.3px;}',
            '.fmx-sumrow .v{font-size:14.5px;font-weight:800;margin-top:2px;white-space:nowrap;}',
            '.fmx-limbar{height:6px;border-radius:6px;background:rgba(255,255,255,0.08);overflow:hidden;margin-top:9px;}',
            '.fmx-limbar i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#5DCAA5,#34d399);}',
            '.fmx-d14{display:flex;gap:5px;overflow-x:auto;padding:4px 0 2px;scrollbar-width:none;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;}',
            '.fmx-d14::-webkit-scrollbar{display:none;}',
            '.fmx-dd{flex:0 0 auto;width:36px;text-align:center;cursor:pointer;}',
            '.fmx-dd .c{width:32px;height:32px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;border:1px solid;position:relative;}',
            '.fmx-dd.fr .c{background:rgba(93,202,165,0.12);color:#5DCAA5;border-color:rgba(93,202,165,0.35);}',
            '.fmx-dd.bs .c{background:rgba(239,128,128,0.14);color:#ef8080;border-color:rgba(239,128,128,0.35);}',
            '.fmx-dd .w{font-size:8.5px;color:#565b73;margin-top:3px;}',
            '.fmx-dd .dm{position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#818cf8;}',
            '.fmx-tgl{display:flex;align-items:center;gap:9px;font-size:11.5px;padding:10px 0 2px;cursor:pointer;color:#c9cbe0;}',
            '.fmx-tgl .sw{width:38px;height:22px;border-radius:99px;background:rgba(255,255,255,0.1);position:relative;flex:0 0 auto;transition:background 160ms;}',
            '.fmx-tgl .sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 160ms;}',
            '.fmx-tgl.on .sw{background:#5DCAA5;}',
            '.fmx-tgl.on .sw::after{left:19px;}',
            'input,textarea,[contenteditable]{user-select:text;-webkit-user-select:text;}',
            '.fmx-tabed .el{outline:1.5px dashed transparent;outline-offset:3px;cursor:move;touch-action:none;user-select:none;-webkit-user-select:none;z-index:2;will-change:left,top,width,height,transform;}',
            '.fmx-tabed .el.sel{outline-color:rgba(129,140,248,0.85);z-index:6;}',
            '.fmx-tabed.moving::before{content:"";position:absolute;inset:0;background:rgba(5,7,14,0.42);z-index:1;pointer-events:none;transform:translateZ(0);}',
            '.fmx-tabed.moving::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(rgba(255,255,255,0.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.09) 1px,transparent 1px);background-size:5% 3.3333%;transform:translateZ(0);}',
            '.fmx-tmodes{position:absolute;bottom:-42px;left:50%;transform:translateX(-50%);display:flex;gap:4px;z-index:9;}',
            '.fmx-tmd{width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:none;border:none;padding:0;}',
            '.fmx-tmd i{width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.35);background:#0d1120;pointer-events:none;}',
            '.fmx-tmd.on i{border-color:#5DCAA5;background:rgba(93,202,165,0.35);}',
            '.fmx-tab .el.mb{opacity:0.55;}',
            '.fmx-tab .el.mt{z-index:4;}',
            '.fmx-tab .el.stkm{overflow:visible;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.45));}',
            '.fmx-tab .el.stkm img,.fmx-tab .el.stkm video,.fmx-tab .el.stkm .fmx-stk-lot{width:100%;height:100%;object-fit:contain;display:block;}',
            '.fmx-tab .el.stkm .fmx-stk-lot{display:flex;align-items:center;justify-content:center;color:#565b73;}',
            '.fmx-tedbar .fmx-seg{background:linear-gradient(135deg,rgba(129,140,248,0.16),rgba(129,140,248,0.05));border:1px solid rgba(129,140,248,0.38);color:#c7cdff;font-weight:700;min-height:40px;padding:8px 13px;flex:0 0 auto;}',
            '.fmx-tedbar .fmx-seg i{color:#818cf8;}',
            '.fmx-tedhelp{margin-top:12px;padding:13px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(129,140,248,0.14),rgba(129,140,248,0.05));border:1px solid rgba(129,140,248,0.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}',
            '.fmx-tedhelp .th{display:flex;align-items:center;gap:8px;font-size:11.5px;font-weight:800;color:#c7cdff;margin-bottom:8px;}',
            '.fmx-tedhelp ol,.fmx-tedhelp ul{margin:0;padding-left:18px;font-size:10.5px;line-height:1.65;color:#c9cbe0;}',
            '.fmx-tedhelp ul{margin-top:7px;list-style:disc;}',
            '.fmx-tedhelp li{margin-bottom:3px;}',
            '.fmx-tedhelp b{color:#e8e8ed;}',
            '.fmx-tabed .el.med{overflow:visible;}',
            '.fmx-tabed .el.med img,.fmx-tabed .el.med video{border-radius:12px;}',
            '.fmx-tabed .el img,.fmx-tabed .el video{pointer-events:none;-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none;}',
            '.fmx-hnd{position:absolute;width:15px;height:15px;border-radius:4px;background:#818cf8;border:2px solid #0b0e18;box-shadow:0 1px 4px rgba(0,0,0,0.5);right:-9px;bottom:-9px;z-index:11;touch-action:none;cursor:nwse-resize;}',
            '.fmx-hnd::before{content:"";position:absolute;inset:-11px;}',
            '.fmx-hnd.rot{right:auto;left:50%;margin-left:-8px;top:-23px;bottom:auto;border-radius:50%;cursor:grab;}',
            '.fmx-hnd.del{right:-9px;top:-9px;bottom:auto;left:auto;border-radius:50%;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;cursor:pointer;}',
            '.fmx-tbgw{display:flex;gap:9px 7px;flex-wrap:wrap;margin-top:10px;}',
            '.fmx-tbgc{background:none;border:none;padding:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;width:56px;font-family:inherit;}',
            '.fmx-tbgt{width:44px;height:66px;border-radius:10px;border:1.5px solid rgba(255,255,255,0.12);overflow:hidden;position:relative;display:block;flex:0 0 auto;}',
            '.fmx-tbgt .mini{position:absolute;top:0;left:0;width:176px;height:264px;transform:scale(0.25);transform-origin:0 0;display:block;}',
            '.fmx-tbgt .mini.tbg-net{background:linear-gradient(rgba(93,202,165,0.4) 3px, transparent 3px),linear-gradient(90deg, rgba(93,202,165,0.4) 3px, transparent 3px),radial-gradient(120% 100% at 50% -20%, #10182b, #0a0d18 65%);background-size:34px 34px,34px 34px,100% 100%;}',
            '.fmx-tbgt .mini.tbg-waves{background:repeating-linear-gradient(115deg, rgba(93,202,165,0.32) 0 6px, transparent 6px 26px),linear-gradient(180deg,#0c1322,#0a0d18);}',
            '.fmx-tbgc em{font-style:normal;font-size:8.5px;color:#8990a8;max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
            '.fmx-tbgc.on .fmx-tbgt{border-color:#818cf8;box-shadow:0 0 0 1.5px #818cf8;}',
            '.fmx-tbgc.on em{color:#c7cdff;}',
            '.fmx-emwrap{overflow:hidden;max-height:122px;transition:max-height 300ms cubic-bezier(0.3,0.9,0.3,1);-webkit-mask-image:linear-gradient(180deg,#000 58%,rgba(0,0,0,0.35) 84%,transparent 99%);mask-image:linear-gradient(180deg,#000 58%,rgba(0,0,0,0.35) 84%,transparent 99%);}',
            '.fmx-emwrap.open{max-height:640px;-webkit-mask-image:none;mask-image:none;}',
            '.fmx-tedbar{display:flex;gap:6px;overflow-x:auto;padding:10px 0 4px;touch-action:pan-x;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:none;}',
            '.fmx-tedbar::-webkit-scrollbar{display:none;}',
            '.fmx-hsb{height:4px;border-radius:4px;background:rgba(255,255,255,0.08);position:relative;margin:2px 2px 10px;cursor:pointer;touch-action:none;}',
            '.fmx-hsb::before{content:"";position:absolute;left:0;right:0;top:-12px;bottom:-12px;}',
            '.fmx-hsb i{position:absolute;top:0;bottom:0;left:0;border-radius:4px;background:linear-gradient(90deg,#5DCAA5,#34d399);box-shadow:0 0 8px rgba(93,202,165,0.35);opacity:0.85;pointer-events:none;}',
            '.fmx-hsb.tight{margin-bottom:0;}',
            '.fmx-hfade.more{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 36px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 36px),transparent);}',
            '.fmx-tedbar::-webkit-scrollbar{display:none;}',
            '.fmx-lssect{font-size:10.5px;color:#565b73;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;margin:16px 0 8px;display:flex;align-items:center;gap:8px;}',
            '.fmx-lssect::after{content:"";flex:1;height:1px;background:rgba(255,255,255,0.06);}',
            '.fmx-bf-compact{max-height:calc(100dvh - 16px);overflow-y:auto;overscroll-behavior:contain;}',
            '.fmx-bf-compact .fmx-lbl{margin:0 0 4px;font-size:9.5px;}',
            '.fmx-bf-compact .fmx-lbl.fmx-mt2{margin-top:9px;}',
            '.fmx-bf-compact .fmx-inp{padding:8px 9px;font-size:12px;min-height:36px;min-width:0;width:100%;}',
            '.fmx-bf-compact .fmx-fx{padding:9px 11px;min-height:40px;font-size:11px;}',
            '.fmx-bf-compact .fmx-tgl{font-size:10.5px;line-height:1.3;}',
            '.fmx-bf-compact .fmx-cfm-r{margin-top:11px;}',
            '.fmx-bfgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px 10px;}',
            '.fmx-bfcell{min-width:0;}',
            '.fmx-bfrow{display:flex;gap:6px;min-width:0;}',
            '.fmx-bf-compact input[type=date]{font-size:10.5px;padding:8px 6px;}',
            '@media (max-width:379px){.fmx-cmpt{font-size:10.5px;}' +
            '.fmx-cmpt th,.fmx-cmpt td{padding:7px 2px;}' +
            '.fmx-cmph{width:52px;min-width:52px;font-size:9.5px;}' +
            '.fmx-cmpnm{font-size:10px;max-width:58px;}.fmx-cmpu{font-size:8.5px;max-width:58px;}' +
            '.fmx-cmpav{width:30px;height:30px;font-size:12px;}}'
        ].join('');
        document.head.appendChild(s);
    }

    function ensureRoot() {
        if (_root) return;
        injectStyles();
        var d = document.createElement('div');
        d.id = 'fmx-screen';
        d.innerHTML =
            '<div class="fmx-head"><button class="fmx-ibtn" id="fmx-back" title="Назад" style="margin-right:2px;"><i class="ti ti-arrow-left"></i></button>' +
            '<div style="flex:1;min-width:0;overflow:hidden;"><h1 id="fmx-htitle" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Рынок рекламы</h1><p id="fmx-hsub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:none;"></p></div>' +
            '<button class="fmx-ibtn" id="fmx-faq" title="Справка"><i class="ti ti-help"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bhelp" style="margin-left:7px;" title="Что значат бейджи"><i class="ti ti-rosette-discount-check"></i></button>' +
            '<button class="fmx-ibtn" id="fmx-bm" style="margin-left:7px;"><i class="ti ti-star"></i><span class="fmx-bmc" id="fmx-bmc" style="display:none;">0</span></button></div>' +
            '<div class="fmx-scroll" id="fmx-scrollEl"><div class="fmx-pad" id="fmx-main"></div></div>';
        document.body.appendChild(d);
        _root = d;
        el('fmx-faq').addEventListener('click', openFaq);
        el('fmx-bhelp').addEventListener('click', openBadgeGuide);
        el('fmx-bm').addEventListener('click', openBookmarks);
        _pulseHint('fmx-faq', 'fmx_seen_faq');
        _pulseHint('fmx-bhelp', 'fmx_seen_badges');
        el('fmx-back').addEventListener('click', function () {
            _haptic('light');
            if (_mainTab === 'market' && _subTab === 'create' && _backTo === 'mine') { _backTo = null; setSubTab('mine'); return; }
            if (_mainTab === 'market' && (_subTab === 'create' || _subTab === 'sell' || _subTab === 'mine')) { setSubTab('buy'); return; }
            if (_mainTab !== 'enter') setMainTab('enter'); else close();
        });
        document.addEventListener('click', function (e) { var dd = el('fmx-chdd'); if (dd && dd.classList.contains('on') && !dd.contains(e.target)) dd.classList.remove('on'); });
        buildModals();
        window.addEventListener('resize', function () { if (el('fmx-subtabs')) movePill('fmx-subtabs', 'fmx-subpill'); if (el('fmx-pult')) movePill('fmx-pult', 'fmx-pultpill'); if (el('fmx-panes')) sizePanes(); _mqMeasure(el('fmx-htitle')); _mqMeasure(el('fmx-hsub')); _mqMeasure(el('fmx-sellcta-s')); });
    }

    var _prevOverflow = null;
    function lockPage() {
        if (_prevOverflow !== null) return;
        _prevOverflow = [document.documentElement.style.overflow || '', document.body.style.overflow || ''];
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
    function unlockPage() {
        if (_prevOverflow === null) return;
        document.documentElement.style.overflow = _prevOverflow[0];
        document.body.style.overflow = _prevOverflow[1];
        _prevOverflow = null;
    }
    function open(channelId) {
        ensureRoot();
        _opened = true;
        _root.classList.add('fmx-show');
        lockPage();
        loadBookmarks();
        setMainTab('enter', true);
        _mqStart();
    }
    function close() { if (_root) _root.classList.remove('fmx-show'); _opened = false; unlockPage(); }

    function movePill(barId, pillId) {
        var bar = el(barId); if (!bar) return;
        var pill = el(pillId), b = bar.querySelector('.fmx-pb.on');
        if (!pill || !b) return;
        pill.style.width = b.offsetWidth + 'px';
        pill.style.transform = 'translateX(' + (b.offsetLeft - 4) + 'px)';
    }

    var _mqActive = [], _mqRaf = null, _mqLast = 0;
    function _mqUnreg(elm) { for (var i = 0; i < _mqActive.length; i++) { if (_mqActive[i].el === elm) { _mqActive.splice(i, 1); i--; } } }
    function _mqTick(ts) {
        _mqRaf = null;
        if (!_opened) { _mqLast = 0; return; }
        if (!_mqLast) _mqLast = ts;
        var dt = ts - _mqLast; _mqLast = ts;
        if (dt > 100) dt = 16;
        for (var i = 0; i < _mqActive.length; i++) {
            var m = _mqActive[i];
            if (!m.el.isConnected) { _mqActive.splice(i, 1); i--; continue; }
            if (m.el.offsetParent === null) continue;
            m.offset += m.speed * dt / 1000;
            if (m.offset >= m.period) m.offset -= m.period;
            m.inner.style.transform = 'translate3d(' + (-m.offset).toFixed(2) + 'px,0,0)';
        }
        if (_mqActive.length) _mqRaf = requestAnimationFrame(_mqTick); else _mqLast = 0;
    }
    function _mqStart() { if (_mqRaf == null && _mqActive.length && _opened) { _mqLast = 0; _mqRaf = requestAnimationFrame(_mqTick); } }
    function _mqText(elm, text) {
        if (!elm) return;
        _mqUnreg(elm);
        elm.classList.add('fmx-mq');
        elm.setAttribute('data-mqt', text);
        elm._mqSig = null;
        elm.classList.remove('fmx-mq-on');
        elm.style.removeProperty('--mqg');
        elm.textContent = '';
        var inner = document.createElement('span'); inner.className = 'fmx-mqi';
        var c = document.createElement('span'); c.className = 'fmx-mqc'; c.textContent = text;
        inner.appendChild(c); elm.appendChild(inner);
        requestAnimationFrame(function () { _mqMeasure(elm); });
    }
    function _mqMeasure(elm) {
        try {
            if (!elm || !elm.querySelector) return;
            var text = elm.getAttribute('data-mqt'); if (text == null) return;
            var inner = elm.querySelector('.fmx-mqi'); if (!inner) return;
            var contW = elm.clientWidth;
            var sig = contW + '|' + text;
            if (elm._mqSig === sig) return;
            elm._mqSig = sig;
            _mqUnreg(elm);
            elm.classList.remove('fmx-mq-on');
            elm.style.removeProperty('--mqg'); inner.style.transform = '';
            var copies = inner.querySelectorAll('.fmx-mqc');
            for (var i = 1; i < copies.length; i++) copies[i].remove();
            var first = copies[0]; if (!first) return;
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            var copyW = inner.scrollWidth;
            if (copyW > contW + 3 && contW > 0) {
                var gap = contW + 20;
                var second = first.cloneNode(true); second.setAttribute('aria-hidden', 'true');
                inner.appendChild(second);
                elm.style.setProperty('--mqg', gap + 'px');
                elm.classList.add('fmx-mq-on');
                _mqActive.push({ el: elm, inner: inner, offset: 0, period: copyW + gap, speed: 46 });
                _mqStart();
            }
        } catch (e) {}
    }

    function setMainTab(t, force) {
        if (!force && t === _mainTab) return;
        _mainTab = t;
        try { if (window.__fmTrack) window.__fmTrack('mx_' + t); } catch (e) {}
        var ti = el('fmx-htitle'), su = el('fmx-hsub');
        if (ti && su) {
            if (t === 'catalog') { _mqText(ti, 'Радар каналов'); _mqText(su, 'Все каналы, собранные ботом'); su.style.display = ''; }
            else if (t === 'market') { _mqText(ti, 'Площадка'); _mqText(su, 'ForgeMetrics · живые офферы'); su.style.display = ''; }
            else if (t === 'pulse') { _mqText(ti, 'Рыночный терминал'); _mqText(su, 'Медианы CPM по нишам'); su.style.display = ''; }
            else if (t === 'mod') { _mqText(ti, 'Модерация'); _mqText(su, 'Только для владельца'); su.style.display = ''; }
            else { _mqText(ti, 'Рынок рекламы'); _mqText(su, ''); su.style.display = 'none'; }
        }
        var host = el('fmx-main');
        host.classList.remove('fmx-fade'); void host.offsetWidth; host.classList.add('fmx-fade');
        if (t === 'catalog') { _sort = 'all'; _nicheSel = null; renderCatalog(); }
        else if (t === 'market') { _subTab = 'buy'; _sort = 'match'; _nicheSel = null; renderMarket(); }
        else if (t === 'pulse') renderPulse();
        else if (t === 'mod') { _modTab = 'queue'; renderMod(); }
        else renderEnter();
        if (t !== 'market') _cmp = {};
        drawCmpBar();
    }

    function loadPulse(cb) {
        if (_pulse && Date.now() - _pulseTs < 300000) { if (cb) cb(); return; }
        apiGet('/api/v1/marketplace/pulse').then(function (r) {
            if (r && r.ok) { _pulse = r; _pulseTs = Date.now(); }
            if (cb) cb();
        }).catch(function () { if (cb) cb(); });
    }
    function _heatBorder(v, min, max) {
        if (v == null || max <= min) return 'rgba(255,255,255,0.08)';
        var t = (v - min) / (max - min);
        return 'hsla(' + Math.round(145 - t * 145) + ',65%,55%,0.45)';
    }
    function _pmedian(arr) {
        var a = arr.filter(function (v) { return v != null; }).sort(function (x, y) { return x - y; });
        if (!a.length) return null;
        var m = Math.floor(a.length / 2);
        return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    }
    function pulseTiles(items, kindLabel) {
        var cpms = items.map(function (x) { return x.median_cpm; }).filter(function (v) { return v != null; });
        var mn = cpms.length ? Math.min.apply(null, cpms) : 0, mx = cpms.length ? Math.max.apply(null, cpms) : 1;
        return '<div class="fmx-pgrid">' + items.map(function (x) {
            var has = x.median_cpm != null;
            var col = _heatBorder(x.median_cpm, mn, mx);
            var gauge = has ? (mx > mn ? Math.round((mx - x.median_cpm) / (mx - mn) * 100) : 100) : 0;
            var meta = [];
            if (x.median_price) meta.push('<span>от ' + _num(x.median_price) + ' ₽</span>');
            if (x.median_er != null && has) meta.push('<span>ER ' + x.median_er + '%</span>');
            meta.push('<span>' + x.count + ' ' + kindLabel + '</span>');
            return '<div class="fmx-ptile" style="border-color:' + col + ';">' +
                '<div class="fmx-pthead"><span class="fmx-ptdot" style="background:' + (has ? col : 'rgba(255,255,255,0.15)') + ';"></span><span class="fmx-ptn">' + _esc(x.niche) + '</span></div>' +
                '<div class="fmx-ptv">' + (has ? _num(x.median_cpm) + ' <span class="fmx-ptu">₽ · CPM' + (x.cpm_own === false ? ' · оценка' : '') + '</span>' : (x.median_er != null ? x.median_er + ' <span class="fmx-ptu">% · ER</span>' : '<span class="fmx-ptu">нет данных</span>')) + '</div>' +
                (has ? '<div class="fmx-pbar"><div class="fmx-pbarf" style="width:' + gauge + '%;background:' + col + ';"></div></div>' : '') +
                '<div class="fmx-ptmeta">' + meta.join('') + '</div>' +
                '</div>';
        }).join('') + '</div>';
    }
    function _termHead() {
        var ago = '';
        if (_pulse.generated_at) {
            var gm = Math.round((Date.now() - Date.parse(_pulse.generated_at)) / 60000);
            if (isNaN(gm) || gm < 0) gm = 0;
            ago = gm <= 0 ? 'обновлено только что' : 'обновлено ' + gm + ' мин назад';
        }
        var allC = [], niches = {};
        (_pulse.market || []).concat(_pulse.base || []).forEach(function (x) {
            if (x.median_cpm != null) allC.push(x.median_cpm);
            if (x.niche) niches[String(x.niche).toLowerCase()] = 1;
        });
        var medCpm = _pmedian(allC), nCount = Object.keys(niches).length;
        var t = _pulse.today || {}, todayTotal = (t.listings || 0) + (t.requests || 0) + (t.contacts || 0);
        var h = '<div class="fmx-thead"><span class="fmx-tlive"><span class="fmx-tdot"></span>live</span>' +
            (ago ? '<span class="fmx-tstamp"><i class="ti ti-refresh"></i>' + ago + '</span>' : '') + '</div>';
        h += '<div class="fmx-tstrip">' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Медиана CPM</div><div class="fmx-tcv">' + (medCpm != null ? _num(medCpm) + ' <small>₽</small>' : '—') + '</div></div>' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Ниш в анализе</div><div class="fmx-tcv">' + (nCount || '—') + '</div></div>' +
            '<div class="fmx-tcell"><div class="fmx-tcl">Событий сегодня</div><div class="fmx-tcv">' + (todayTotal || '—') + '</div></div>' +
            '</div>';
        var vol = [];
        if (_pulse.market_total) vol.push('<i class="ti ti-building-store" style="color:#5DCAA5;"></i> Площадка · <b>' + _num(_pulse.market_total) + '</b> ' + _plural(_pulse.market_total, 'оффер', 'оффера', 'офферов'));
        if (_pulse.base_total) vol.push('<i class="ti ti-radar-2" style="color:#818cf8;"></i> Радар · <b>' + _num(_pulse.base_total) + '</b> ' + _plural(_pulse.base_total, 'канал', 'канала', 'каналов'));
        if (vol.length) h += '<div class="fmx-tvol">' + vol.join('<span style="color:#3a3f52;">|</span>') + '</div>';
        return h;
    }
    var _pulseHide = false;
    function todayLine() {
        if (_pulseHide) return '';
        if (!_pulse) return '';
        var t = _pulse.today || {};
        var total = (t.listings || 0) + (t.requests || 0) + (t.contacts || 0);
        if (!total) return '';
        var bits = [];
        if (t.listings) bits.push('<b>' + t.listings + '</b> ' + _plural(t.listings, 'новый оффер', 'новых оффера', 'новых офферов'));
        if (t.requests) bits.push('<b>' + t.requests + '</b> ' + _plural(t.requests, 'заявка', 'заявки', 'заявок'));
        if (t.contacts) bits.push('<b>' + t.contacts + '</b> ' + _plural(t.contacts, 'отклик', 'отклика', 'откликов'));
        return '<div class="fmx-pday" style="position:relative;padding-right:30px;"><i class="ti ti-discount-2" style="color:#f59e0b;"></i> Сегодня на Площадке: ' + bits.join(' · ') + '<button data-phide style="position:absolute;top:50%;right:7px;transform:translateY(-50%);width:20px;height:20px;border-radius:6px;background:transparent;border:none;color:#8990a8;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;"><i class="ti ti-x"></i></button></div>';
    }
    function renderPulse() {
        var host = el('fmx-main');
        host.innerHTML = loadHtml();
        loadPulse(function () {
            if (_mainTab !== 'pulse') return;
            if (!_pulse) { host.innerHTML = emptyHtml('ti-cloud-off', 'Терминал недоступен', 'Не удалось загрузить данные — попробуй позже.'); return; }
            var hasData = (_pulse.market && _pulse.market.length) || (_pulse.base && _pulse.base.length);
            if (!hasData) { host.innerHTML = _termHead() + emptyHtml('ti-chart-candle', 'Рынок набирает обороты', 'Как только на Площадке и в Радаре появятся каналы с нишами, здесь отобразятся цены, CPM и ликвидность по нишам.'); return; }
            var html = _termHead();
            html += '<button class="fmx-btn" id="fmx-pbell" style="width:100%;margin:2px 0 14px;"><i class="ti ti-bell"></i> Следить за нишей — сообщим о сдвиге CPM</button>';
            if (_pulse.market && _pulse.market.length) {
                html += '<div class="fmx-psec"><i class="ti ti-building-store" style="color:#5DCAA5;"></i> Площадка · точные данные</div>' + pulseTiles(_pulse.market, 'карт.');
            }
            if (_pulse.base && _pulse.base.length) {
                html += '<div class="fmx-psec"><i class="ti ti-radar-2" style="color:#818cf8;"></i> Радар каналов · публичная статистика</div>' + pulseTiles(_pulse.base, 'кан.');
            }
            html += '<div style="font-size:10px;color:#565b73;line-height:1.65;margin-top:16px;">Показаны медианы по нишам. <b style="color:#8990a8;">Зелёные</b> — CPM ниже медианы (выгоднее покупателю), <b style="color:#8990a8;">красные</b> — выше. Площадка — реальные цены владельцев офферов. Радар — наш расчёт цены по нише и охвату канала, а не сделки: это ориентир, а не рыночная статистика. Обновление раз в 5 минут. Тренды и история цен появятся с накоплением данных.</div>';
            host.innerHTML = html;
            var pb = el('fmx-pbell'); if (pb) pb.addEventListener('click', openNicheSubs);
        });
    }
    function renderEnter() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-entq">Выбери, где искать:</div>' +
            '<div class="fmx-ent" data-go="catalog"><div class="fmx-entic" style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.05));border:1px solid rgba(99,102,241,0.32);color:#818cf8;"><i class="ti ti-radar-2"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Радар каналов <span class="fmx-enttag" style="background:rgba(99,102,241,0.18);color:#818cf8;">весь Telegram</span></div>' +
            '<div class="fmx-entd">Каталог каналов со всего Telegram: подписчики, охват, ER и индекс здоровья по каждому, оценка цены и ниша. Ищешь по нишам и фильтрам и пишешь владельцу напрямую — даже тем, кто ещё не выставил оффер на Площадке.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-ent" data-go="market"><div class="fmx-entic" style="background:linear-gradient(135deg,rgba(93,202,165,0.15),rgba(93,202,165,0.05));border:1px solid rgba(93,202,165,0.32);color:#5DCAA5;"><i class="ti ti-building-store"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Площадка ForgeMetrics <span class="fmx-enttag" style="background:rgba(93,202,165,0.18);color:#5DCAA5;">живые офферы</span></div>' +
            '<div class="fmx-entd">Каналы сами выставили рекламу: цена, форматы, реальные метрики и прямая связь с владельцем — всё собрано в готовом оффере. Рейтинг и подтверждённые сделки сразу показывают, кому можно доверять, а свой канал ты оформляешь оффером здесь же.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>' +
            '<div class="fmx-ent" data-go="pulse"><div class="fmx-entic" style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05));border:1px solid rgba(245,158,11,0.32);color:#fbbf24;"><i class="ti ti-chart-candle"></i></div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-entn">Рыночный терминал <span class="fmx-enttag" style="background:rgba(245,158,11,0.18);color:#f59e0b;">live</span></div>' +
            '<div class="fmx-entd">Медианный CPM, цены, объёмы и активность по каждой нише в реальном времени — теплокарта всего рынка Telegram-рекламы. Видно, где трафик дешевеет, а где перегрет: оцениваешь ситуацию до закупа.</div></div>' +
            '<i class="ti ti-chevron-right" style="color:#565b73;"></i></div>';
        if (_isMod()) {
            host.insertAdjacentHTML('beforeend',
                '<div class="fmx-ent" data-go="mod"><div class="fmx-entic" style="background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.05));border:1px solid rgba(239,68,68,0.32);color:#f87171;"><i class="ti ti-shield-check"></i></div>' +
                '<div style="flex:1;min-width:0;"><div class="fmx-entn">Модерация <span class="fmx-enttag" style="background:rgba(239,68,68,0.18);color:#f87171;">только владелец</span></div>' +
                '<div class="fmx-entd">Очередь офферов и заявок на проверке и с жалобами: одобрение и отклонение, сводная статистика по продукту, карточка пользователя.</div></div>' +
                '<i class="ti ti-chevron-right" style="color:#565b73;font-size:20px;"></i></div>');
        }
        qsa(host, '.fmx-ent').forEach(function (c) { c.addEventListener('click', function () { _haptic('light'); setMainTab(c.getAttribute('data-go')); }); });
    }

    var _modTab = 'queue';
    function renderMod() {
        var host = el('fmx-main');
        host.innerHTML =
            '<div class="fmx-mtabs">' +
            '<button class="fmx-mtab' + (_modTab === 'queue' ? ' on' : '') + '" data-mt="queue">Очередь</button>' +
            '<button class="fmx-mtab' + (_modTab === 'stats' ? ' on' : '') + '" data-mt="stats">Сводка</button>' +
            '<button class="fmx-mtab' + (_modTab === 'user' ? ' on' : '') + '" data-mt="user">Пользователь</button>' +
            '</div><div id="fmx-modbody"></div>';
        qsa(host, '[data-mt]').forEach(function (b) { b.addEventListener('click', function () { _modTab = b.getAttribute('data-mt'); _haptic('light'); renderMod(); }); });
        if (_modTab === 'queue') renderModQueue();
        else if (_modTab === 'stats') renderModStats();
        else renderModUser();
    }
    function _modFail(box) { box.innerHTML = emptyHtml('ti-cloud-off', 'Не загрузилось', 'Проверь связь и повтори попытку.'); }
    function _modAfter(r) {
        if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось'); return; }
        _haptic('success'); toast((r && r.message) || 'Готово');
        renderModQueue();
    }
    var _TERMS_B = [
        ['ti-brand-telegram', '#5DCAA5', 'Сделка — напрямую с владельцем', [
            'Кнопка «Написать» открывает личный диалог с владельцем канала: в сообщении уже подставлены оффер, формат и выбранная дата.',
            'Договорённость и оплата — напрямую между вами, без комиссии. Площадка деньги не держит и гарантом расчётов не выступает.']],
        ['ti-heart-handshake', '#818cf8', 'Фиксация сделки — обеими сторонами', [
            'После договорённости отметьте сделку в развороте оффера. Она засчитывается, когда владелец подтвердит её со своей стороны. Счётчик сделок в оффере растёт только по подтверждённым.']],
        ['ti-chart-bar', '#818cf8', 'Замер результата — автоматический', [
            'Владелец присылает ссылку на вышедший рекламный пост — не старше 72 часов. Охват поста замеряется автоматически через 12, 24 и 48 часов, отчёты придут в бот.',
            'Из замеров складывается «Рекламный охват» оффера и точность заявленных цифр.']],
        ['ti-star', '#818cf8', 'Отзыв и рейтинг', [
            'После подтверждённой сделки можно оставить отзыв и оценку — они видны всем в оффере.']],
        ['ti-file-certificate', '#818cf8', 'Маркировка рекламы', [
            'В каждом оффере указано, кто оформляет erid: рекламодатель, канал или по договорённости. Уточните это до выхода поста.']],
        ['ti-shield-check', '#f5bf4f', 'Что гарантируется, а что нет', [
            'Метрики офферов обновляются автоматически, признаки накрутки помечаются, жалобу можно отправить одним нажатием из оффера.',
            'Результат размещения не гарантируется: подписчики и продажи зависят от креатива и совпадения аудитории. Оценивайте канал по метрикам до сделки.']],
    ];
    var _TERMS_S = [
        ['ti-door-enter', '#5DCAA5', 'Вход — публичный канал, без порогов', [
            'Нужен канал с публичным @именем, подключённый к боту. Минимума подписчиков нет — решают метрики, а не размер.']],
        ['ti-coin', '#5DCAA5', 'Цены и форматы — только ваши', [
            'Форматы вы включаете сами, обязательных нет. Цену каждого формата назначаете вы — Площадка её не диктует и не корректирует.',
            'Комиссии нет: оплата приходит напрямую от рекламодателя.']],
        ['ti-shield-search', '#818cf8', 'Модерация — до публикации', [
            'Оффер выходит на витрину после проверки. Правка содержимого живого оффера — текст, обложка, стикер, фон, витрина — отправляет его на повторную проверку, на это время оффер снимается с витрины. Лимит — 10 отправок в день.',
            'Цены, форматы и календарь правятся без повторной проверки.']],
        ['ti-heart-handshake', '#818cf8', 'Сделки и замеры', [
            'Сделку вы подтверждаете в разделе «Мои офферы» — заявки покупателей появляются там в блоке сделок. После выхода поста вставьте туда же ссылку на него, не позднее 72 часов. Больше ничего присылать не нужно: охват замерится автоматически через 12, 24 и 48 часов, появится в оффере как «Рекламный охват», а отчёт уйдёт покупателю.']],
        ['ti-activity', '#818cf8', 'Метрики — автоматические и честные', [
            'Цифры оффера поддерживаются без вашего участия. Признаки накрутки помечаются в оффере — честные метрики поднимают доверие и цену размещения.']],
        ['ti-alert-triangle', '#f5bf4f', 'Ограничения тематик', [
            'Контент 18+ не показывается в общей ленте. Запрещённые законом тематики не публикуются — причина отказа приходит с результатом проверки, оффер можно исправить и отправить снова.']],
    ];
    function _termsSecs(list) {
        return list.map(function (x) {
            return '<div class="fmx-tpsec"><div class="t"><span class="ictile" style="width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:linear-gradient(135deg,' + x[1] + '26,' + x[1] + '0d);border:1px solid ' + x[1] + '52;color:' + x[1] + ';"><i class="ti ' + x[0] + '" style="font-size:13px;"></i></span><span>' + x[2] + '</span></div>' +
                x[3].map(function (t) { return '<p>' + t + '</p>'; }).join('') + '</div>';
        }).join('');
    }
    function openTermsPassport(tab) {
        var old = el('fmx-tpBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-tpBg'; bg.className = 'fmx-cfm solid';
        bg.innerHTML = '<div class="fmx-cfm-box fmx-tpbox">' +
            '<div class="fmx-cfm-t" style="display:flex;align-items:center;gap:8px;"><i class="ti ti-clipboard-text" style="color:#818cf8;"></i><span>Как работает Площадка</span><span class="fmx-tpx"><i class="ti ti-x"></i></span></div>' +
            '<div class="fmx-tptabs"><div class="fmx-tptab" data-tt="b">Покупателю рекламы</div><div class="fmx-tptab" data-tt="s">Владельцу канала</div></div>' +
            '<div class="fmx-tpbody" id="fmx-tpbody"></div>' +
            '<div class="fmx-tpfoot">Условия описывают действующие механики Площадки и обновляются вместе с ними.</div></div>';
        document.body.appendChild(bg);
        function show(t) {
            qsa(bg, '.fmx-tptab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-tt') === t); });
            el('fmx-tpbody').innerHTML = _termsSecs(t === 's' ? _TERMS_S : _TERMS_B);
            el('fmx-tpbody').scrollTop = 0;
            try { if (window.autoLocalize) window.autoLocalize(); } catch (e) {}
        }
        qsa(bg, '.fmx-tptab').forEach(function (x) { x.addEventListener('click', function () { _haptic('light'); show(x.getAttribute('data-tt')); }); });
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        bg.querySelector('.fmx-tpx').addEventListener('click', function () { bg.remove(); });
        show(tab === 's' ? 's' : 'b');
        try { if (window.autoLocalize) window.autoLocalize(); } catch (e) {}
    }
    function modPrompt(opts, cb) {
        var old = el('fmx-cfmBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-cfmBg'; bg.className = 'fmx-cfm solid';
        bg.innerHTML = '<div class="fmx-cfm-box"><div class="fmx-cfm-t">' + _esc(opts.title) + '</div>' +
            '<textarea class="fmx-inp" id="fmx-mpr" rows="3" maxlength="500" placeholder="' + _esc(opts.placeholder || '') + '" style="margin-top:10px;"></textarea>' +
            '<div class="fmx-cfm-r" style="margin-top:12px;"><button class="fmx-btn" data-no>Отмена</button>' +
            '<button class="fmx-btn" data-yes style="background:#818cf8;color:#fff;border-color:transparent;">' + _esc(opts.btn || 'ОК') + '</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.querySelector('[data-no]').addEventListener('click', done);
        bg.querySelector('[data-yes]').addEventListener('click', function () {
            var v = el('fmx-mpr').value.trim();
            if (!opts.optional && !v) { _haptic('warning'); el('fmx-mpr').focus(); return; }
            done(); cb(v);
        });
        setTimeout(function () { try { el('fmx-mpr').focus(); } catch (e) {} }, 50);
    }
    function modApprove(id) {
        uiConfirm('Одобрить оффер #' + id + ' и опубликовать?', function () {
            apiPost('/api/v1/admin/listing/' + id + '/approve').then(_modAfter).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        });
    }
    function modAdultOff(id) {
        uiConfirm('Снять метку 18+ с оффера #' + id + '? Если оффер уже одобрен, он сразу выйдет в общую ленту.', function () {
            apiPost('/api/v1/admin/listing/' + id + '/adult', { adult: false }).then(_modAfter).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        });
    }
    function modReject(id) {
        modPrompt({ title: 'Отклонить оффер #' + id, placeholder: 'Причина (необязательно) — автор увидит и сможет исправить', btn: 'Отклонить', optional: true }, function (reason) {
            apiPost('/api/v1/admin/listing/' + id + '/reject', { reason: reason }).then(_modAfter).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        });
    }
    var _CATRU = { white: 'белый', grey: 'серый', black: 'чёрный' };
    function _openChannel(url) {
        _haptic('light');
        try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) { tg.openTelegramLink(url); return; } } catch (e) {}
        try { if (typeof tg !== 'undefined' && tg && tg.openLink) { tg.openLink(url); return; } } catch (e) {}
        try { window.open(url, '_blank'); } catch (e) {}
    }
    function modRestore(id) {
        uiConfirm('Вернуть заявку R' + id + ' и снять жалобы?', function () {
            apiPost('/api/v1/admin/request/' + id + '/restore').then(_modAfter).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        });
    }
    function modRemove(id) {
        modPrompt({ title: 'Снять заявку R' + id, placeholder: 'Причина (необязательно)', btn: 'Снять', optional: true }, function (reason) {
            apiPost('/api/v1/admin/request/' + id + '/remove', { reason: reason }).then(_modAfter).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        });
    }
    function renderModQueue() {
        var box = el('fmx-modbody'); if (!box) return;
        box.innerHTML = loadHtml();
        apiGet('/api/v1/admin/queue').then(function (r) {
            if (_mainTab !== 'mod' || _modTab !== 'queue') return;
            if (!r || r.ok === false) { _modFail(box); return; }
            if (r.empty) { box.innerHTML = emptyHtml('ti-checks', 'Очередь пуста', 'Офферов на проверке и открытых жалоб нет.'); return; }
            var h = '';
            (r.listings || []).forEach(function (l) {
                var acat = '';
                if (l.ai_category || l.ai_confidence != null) {
                    var bits = [];
                    if (l.ai_category) bits.push('<b>' + _esc(_CATRU[l.ai_category] || l.ai_category) + '</b>');
                    if (l.ai_confidence != null) bits.push('уверенность ' + l.ai_confidence + '%');
                    acat = '<div class="fmx-macat">Автопроверка: ' + bits.join(' · ') + '</div>';
                }
                h += '<div class="fmx-mcard">' +
                    '<div class="fmx-mtitle">#' + l.id + ' @' + _esc(l.username) + (l.is_adult ? '<span class="fmx-mbadge">18+</span>' : '') + '</div>' +
                    (l.title ? '<div class="fmx-msub">' + _esc(l.title) + '</div>' : '') +
                    '<div class="fmx-mmeta">' + _esc(l.note) + (l.complaints ? ' · жалоб: ' + l.complaints : '') + '</div>' +
                    acat +
                    (l.ai_reason ? '<div class="fmx-mai">ИИ: ' + _esc(l.ai_reason) + '</div>' : '') +
                    (l.link ? '<button class="fmx-mopen" data-open="' + _esc(l.link) + '"><i class="ti ti-external-link"></i> Открыть канал</button>' : '') +
                    '<div class="fmx-mrow"><button class="fmx-mbtn ok" data-appr="' + l.id + '">Одобрить</button>' +
                    '<button class="fmx-mbtn no" data-rej="' + l.id + '">Отклонить</button>' +
                    (l.is_adult ? '<button class="fmx-mbtn" data-adoff="' + l.id + '">Снять 18+</button>' : '') + '</div>' +
                    '</div>';
            });
            (r.requests || []).forEach(function (q) {
                h += '<div class="fmx-mcard">' +
                    '<div class="fmx-mtitle">заявка R' + q.id + '</div>' +
                    '<div class="fmx-msub">«' + _esc(q.text) + '»</div>' +
                    '<div class="fmx-mmeta">' + _esc(q.note) + (q.complaints ? ' · жалоб: ' + q.complaints : '') + '</div>' +
                    '<div class="fmx-mrow"><button class="fmx-mbtn ok" data-rest="' + q.id + '">Вернуть</button>' +
                    '<button class="fmx-mbtn no" data-rem="' + q.id + '">Снять</button></div>' +
                    '</div>';
            });
            if (r.listings_overflow) h += '<div class="fmx-mmeta" style="text-align:center;margin-top:8px;">…и ещё ' + r.listings_overflow + ' офферов с жалобами — обнови после разбора</div>';
            if (r.requests_overflow) h += '<div class="fmx-mmeta" style="text-align:center;margin-top:8px;">…и ещё ' + r.requests_overflow + ' заявок с жалобами</div>';
            box.innerHTML = h;
            qsa(box, '[data-appr]').forEach(function (b) { b.addEventListener('click', function () { modApprove(+b.getAttribute('data-appr')); }); });
            qsa(box, '[data-rej]').forEach(function (b) { b.addEventListener('click', function () { modReject(+b.getAttribute('data-rej')); }); });
            qsa(box, '[data-adoff]').forEach(function (b) { b.addEventListener('click', function () { modAdultOff(+b.getAttribute('data-adoff')); }); });
            qsa(box, '[data-open]').forEach(function (b) { b.addEventListener('click', function () { _openChannel(b.getAttribute('data-open')); }); });
            qsa(box, '[data-rest]').forEach(function (b) { b.addEventListener('click', function () { modRestore(+b.getAttribute('data-rest')); }); });
            qsa(box, '[data-rem]').forEach(function (b) { b.addEventListener('click', function () { modRemove(+b.getAttribute('data-rem')); }); });
        }).catch(function () { _modFail(box); });
    }
    function _modStatTile(label, val, sub) {
        return '<div class="fmx-stile"><div class="fmx-stv">' + (val == null ? '—' : val) + '</div>' +
            '<div class="fmx-stl">' + _esc(label) + '</div>' + (sub ? '<div class="fmx-sts">' + _esc(sub) + '</div>' : '') + '</div>';
    }
    function renderModStats() {
        var box = el('fmx-modbody'); if (!box) return;
        box.innerHTML = loadHtml();
        apiGet('/api/v1/admin/overview').then(function (r) {
            if (_mainTab !== 'mod' || _modTab !== 'stats') return;
            if (!r || r.ok === false) { _modFail(box); return; }
            var u = r.users || {}, s = r.spend || {}, rf = r.referrals || {};
            var h = '<div class="fmx-mgrid">' +
                _modStatTile('Пользователей', _num(u.total), 'всего') +
                _modStatTile('Платных', _num(u.paid), 'light/pro/pro+') +
                _modStatTile('На Trial', _num(u.trial), 'пробный период') +
                _modStatTile('Выручка / мес', _num(r.revenue_month_rub) + ' ₽', 'оплачено') +
                '</div>';
            h += '<div class="fmx-mcard"><div class="fmx-mtitle">Расходы на ИИ</div>' +
                '<div class="fmx-mstatrow"><span>За день</span><b>$' + (s.day_usd || 0).toFixed(2) + '</b></div>' +
                '<div class="fmx-mstatrow"><span>За месяц</span><b>$' + (s.month_usd || 0).toFixed(2) + ' / $' + (s.month_budget_usd || 0) + '</b></div></div>';
            h += '<div class="fmx-mcard"><div class="fmx-mtitle">Рефералы</div>' +
                '<div class="fmx-mstatrow"><span>Всего</span><b>' + _num(rf.total) + '</b></div>' +
                '<div class="fmx-mstatrow"><span>Оплаченных</span><b>' + _num(rf.paid) + '</b></div></div>';
            if (r.top_spenders && r.top_spenders.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Топ по расходу за месяц</div>';
                r.top_spenders.forEach(function (t, i) {
                    h += '<div class="fmx-mstatrow" data-uid="' + t.user_id + '" style="cursor:pointer;"><span>' + (i + 1) + '. ID <u>' + t.user_id + '</u></span><b>$' + t.spent_usd.toFixed(2) + ' · ' + t.calls + ' выз.</b></div>';
                });
                h += '</div>';
            }
            box.innerHTML = h;
            _modWireUids(box);
            _modRenderActivity(box);
        }).catch(function () { _modFail(box); });
    }
    var _muPending = null;
    function _modOpenUser(id) { _muPending = String(id); _modTab = 'user'; _haptic('light'); renderMod(); }
    function _modWireUids(scope) {
        qsa(scope, '[data-uid]').forEach(function (n) {
            if (n.__uidWired) return;
            n.__uidWired = 1;
            n.addEventListener('click', function () { _modOpenUser(n.getAttribute('data-uid')); });
        });
    }
    var _EVN = { app_open: 'Вход в приложение', tariffs: 'Тарифы', fn_create_post: 'Создать пост', fn_rewrite_post: 'Рерайт поста', fn_content_plan: 'Контент-план', fn_ai_audit: 'ИИ-аудит', fn_ai_strategy: 'ИИ-стратегия', fn_competitor_analysis: 'Анализ конкурентов', fn_my_channels: 'Мои каналы', fn_add_channel: 'Подключение канала', fn_radar: 'Радар', fn_marketplace: 'Рынок рекламы', fn_referral: 'Друзья и промокод', fn_profile: 'Кабинет', fn_find_advertisers: 'Поиск рекламодателей', fn_post_price: 'Цена поста', fn_negotiation_templates: 'Шаблоны переговоров', fn_voice_settings: 'Голос канала', mx_catalog: 'Радар (раздел)', mx_market: 'Площадка (раздел)', mx_mod: 'Админ-панель', mxs_buy: 'Площадка · Купить', mxs_sell: 'Площадка · Продать', mxs_mine: 'Мои офферы', mxs_create: 'Конструктор оффера', mxs_deals: 'Сделки' };
    var _OPN = { generate: 'Генерация поста', modify: 'Правка поста', intent: 'Уточняющие вопросы', suggest: 'Подсказки правок', ideas: 'Идеи тем', rewrite: 'Рерайт (ИИ)', voice: 'Голос канала (ИИ)', audit: 'ИИ-аудит', strategy: 'ИИ-стратегия', strategy_chat: 'Чат стратегии', competitors: 'Анализ конкурентов', ad_exchange: 'Биржа (ИИ)', content_plan: 'Контент-план: идея', content_plan_day: 'Контент-план: день', moderation: 'Модерация (платформа)', niche: 'Ниша (платформа)' };
    var _TIERN = { free: 'Free', trial: 'Trial', light: 'Лайт', pro: 'Pro', pro_plus: 'Pro+', agency: 'Agency', network: 'Network' };
    function _modRenderActivity(box) {
        apiGet('/api/v1/admin/activity').then(function (a) {
            if (_mainTab !== 'mod' || _modTab !== 'stats' || !a || a.ok === false) return;
            var h = '';
            if (a.all_users && a.all_users.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Все пользователи · ' + _num(a.all_users.length) + '</div>';
                a.all_users.forEach(function (v) {
                    var nm = (v.name ? _esc(v.name) + ' · ' : '') + (v.username ? '@' + _esc(v.username) + ' · ' : '');
                    h += '<div class="fmx-mstatrow" data-uid="' + v.user_id + '" style="cursor:pointer;"><span>' + nm + 'ID <u>' + v.user_id + '</u></span><b>' + _esc(_TIERN[v.tier] || v.tier) + ' · ' + _esc(v.at) + '</b></div>';
                });
                h += '</div>';
            }
            if (a.visitors_7d && a.visitors_7d.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Кто заходил · 7 дней</div>';
                a.visitors_7d.forEach(function (v) {
                    var nm = (v.name ? _esc(v.name) + ' · ' : '') + (v.username ? '@' + _esc(v.username) + ' · ' : '');
                    h += '<div class="fmx-mstatrow" data-uid="' + v.user_id + '" style="cursor:pointer;"><span>' + nm + 'ID <u>' + v.user_id + '</u> · ' + _esc(_TIERN[v.tier] || v.tier) + '</span><b>' + _num(v.events) + ' действ. · ' + _esc(v.last_at) + '</b></div>';
                });
                h += '</div>';
            }
            var evs = (a.client_events_7d || []).map(function (x) { return { l: _EVN[x.event] || x.event, c: x.count }; });
            var ops = (a.ai_ops_7d || []).map(function (x) { return { l: _OPN[x.op] || x.op, c: x.count }; });
            if (evs.length || ops.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Популярность функций · 7 дней</div>';
                evs.forEach(function (x) { h += '<div class="fmx-mstatrow"><span>' + _esc(x.l) + '</span><b>' + _num(x.c) + '</b></div>'; });
                if (ops.length) {
                    h += '<div class="fmx-mmeta" style="margin:8px 0 4px;">ИИ-операции (факт по серверу):</div>';
                    ops.forEach(function (x) { h += '<div class="fmx-mstatrow"><span>' + _esc(x.l) + '</span><b>' + _num(x.c) + '</b></div>'; });
                }
                h += '</div>';
            }
            var tiers = a.tiers || {};
            h += '<div class="fmx-mcard"><div class="fmx-mtitle">Тарифы сейчас</div>';
            ['network', 'agency', 'pro_plus', 'pro', 'light', 'trial', 'free'].forEach(function (k) {
                if (tiers[k]) h += '<div class="fmx-mstatrow"><span>' + _esc(_TIERN[k] || k) + '</span><b>' + _num(tiers[k]) + '</b></div>';
            });
            (a.paid_users || []).forEach(function (p) {
                h += '<div class="fmx-mstatrow" data-uid="' + p.user_id + '" style="cursor:pointer;"><span>ID <u>' + p.user_id + '</u> · ' + _esc(_TIERN[p.tier] || p.tier) + '</span><b>' + (p.until ? 'до ' + _esc(p.until) : 'без срока') + '</b></div>';
            });
            h += '</div>';
            if (a.bookings && a.bookings.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Брони тарифов (лист ожидания)</div>';
                a.bookings.forEach(function (b) {
                    h += '<div class="fmx-mstatrow" data-uid="' + b.user_id + '" style="cursor:pointer;"><span>ID <u>' + b.user_id + '</u> · ' + _esc(_TIERN[b.plan] || b.plan) + '</span><b>' + _num(b.price) + ' ₽/мес · ' + _esc(b.at) + '</b></div>';
                });
                h += '</div>';
            }
            if (a.purchases && a.purchases.length) {
                h += '<div class="fmx-mcard"><div class="fmx-mtitle">Покупки (оплачено)</div>';
                a.purchases.forEach(function (p) {
                    h += '<div class="fmx-mstatrow" data-uid="' + p.user_id + '" style="cursor:pointer;"><span>ID <u>' + p.user_id + '</u> · ' + _esc(p.product || '') + (p.product_id ? ' (' + _esc(p.product_id) + ')' : '') + '</span><b>' + _num(p.amount) + ' ₽ · ' + _esc(p.at) + '</b></div>';
                });
                h += '</div>';
            }
            box.innerHTML = h;
            _modWireUids(box);
        }).catch(function () {});
    }
    function renderModUser() {
        var box = el('fmx-modbody'); if (!box) return;
        box.innerHTML =
            '<div class="fmx-mcard"><span class="fmx-lbl">Telegram ID пользователя</span>' +
            '<div style="display:flex;gap:8px;margin-top:8px;"><input class="fmx-inp" id="fmx-muid" inputmode="numeric" placeholder="например, 100000000" style="flex:1;">' +
            '<button class="fmx-btn" id="fmx-mufind" style="flex:0 0 auto;padding:0 16px;background:#818cf8;color:#fff;border-color:transparent;"><i class="ti ti-search"></i></button></div></div>' +
            '<div id="fmx-mures"></div>';
        var find = function () {
            var v = el('fmx-muid').value.trim();
            if (!/^\d+$/.test(v)) { uiAlert('Введи числовой Telegram ID'); return; }
            var res = el('fmx-mures'); res.innerHTML = loadHtml();
            apiGet('/api/v1/admin/user/' + v).then(function (r) {
                if (!r || r.ok === false) { res.innerHTML = emptyHtml('ti-user-off', (r && r.error) || 'Пользователь не найден', 'Проверь ID и повтори.'); return; }
                var u = r.user;
                res.innerHTML = '<div class="fmx-mcard">' +
                    '<div class="fmx-mtitle">' + _esc(u.first_name || '') + ' @' + _esc(u.username) + '</div>' +
                    '<div class="fmx-mstatrow"><span>ID</span><b>' + u.id + '</b></div>' +
                    '<div class="fmx-mstatrow"><span>Тариф</span><b>' + _esc(u.tier) + '</b></div>' +
                    '<div class="fmx-mstatrow"><span>Промокод</span><b>' + _esc(u.promo_code) + '</b></div>' +
                    '<div class="fmx-mstatrow"><span>Уровень</span><b>' + _esc(u.referral_level) + '</b></div>' +
                    '<div class="fmx-mstatrow"><span>Платных рефералов</span><b>' + _num(u.paid_referrals) + '</b></div>' +
                    '<div class="fmx-mstatrow"><span>Кредиты</span><b>' + _num(u.credits_rub) + ' ₽</b></div>' +
                    '<div class="fmx-mstatrow"><span>Расход за месяц</span><b>$' + (u.spend_month_usd || 0).toFixed(4) + ' · ' + u.calls_month + ' выз.</b></div>' +
                    '<div class="fmx-mstatrow"><span>Регистрация</span><b>' + _esc(u.created_at) + '</b></div>' +
                    '<a class="fmx-btn" href="tg://user?id=' + u.id + '" style="display:block;text-align:center;margin-top:10px;text-decoration:none;"><i class="ti ti-brand-telegram"></i> Открыть профиль в Telegram</a>' +
                    (u.username && u.username !== '—' ? '<a class="fmx-btn" href="https://t.me/' + _esc(u.username) + '" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:6px;text-decoration:none;"><i class="ti ti-external-link"></i> t.me/' + _esc(u.username) + '</a>' : '') +
                    '</div>';
            }).catch(function () { _modFail(res); });
        };
        el('fmx-mufind').addEventListener('click', find);
        el('fmx-muid').addEventListener('keydown', function (e) { if (e.key === 'Enter') find(); });
        if (_muPending) { el('fmx-muid').value = _muPending; _muPending = null; find(); }
    }

    function feedQuery() {
        var p = ['limit=' + _FEED_PAGE, 'offset=' + _feedOffset];
        if (!_regionAll && !_regionFb) p.push('region=' + _uiSeg());
        if (_q) p.push('q=' + encodeURIComponent(_q));
        if (_sortBuy && _sortBuy !== 'smart') p.push('sort=' + _sortBuy);
        if (_fPriceMin != null) p.push('price_min=' + _fPriceMin);
        if (_fPriceMax != null) p.push('price_max=' + _fPriceMax);
        if (_fSubsMin != null) p.push('subs_min=' + _fSubsMin);
        if (_fAud) p.push('audience=' + _fAud);
        if (_fCpmMax != null) p.push('cpm_max=' + _fCpmMax);
        if (_fCpmMin != null) p.push('cpm_min=' + _fCpmMin);
        if (_fErMin != null) p.push('er_min=' + _fErMin);
        if (_fErMax != null) p.push('er_max=' + _fErMax);
        if (_fSubsMax != null) p.push('subs_max=' + _fSubsMax);
        if (_fFreeFrom) p.push('free_from=' + _fFreeFrom + (_fFreeTo ? '&free_to=' + _fFreeTo : ''));
        if (_fDeals) p.push('deals_only=1');
        if (_fClean) p.push('clean_only=1');
        if (_fVerified) p.push('verified_only=1');
        if (_fReachMin != null) p.push('reach_min=' + _fReachMin);
        if (_fReachMax != null) p.push('reach_max=' + _fReachMax);
        if (_fEngMin != null) p.push('eng_min=' + _fEngMin);
        if (_fEngMax != null) p.push('eng_max=' + _fEngMax);
        if (_fHealthMin != null) p.push('health_min=' + _fHealthMin);
        if (_fHealthMax != null) p.push('health_max=' + _fHealthMax);
        if (_fAgeMin != null) p.push('age_min=' + _fAgeMin);
        if (_fAgeMax != null) p.push('age_max=' + _fAgeMax);
        if (_fAdpMin != null) p.push('adp_min=' + _fAdpMin);
        if (_fAdpMax != null) p.push('adp_max=' + _fAdpMax);
        return '/api/v1/marketplace/listings?' + p.join('&');
    }
    var _feedReq = 0, _feedMore = false;
    function loadFeed(more) {
        if (!more) _feedOffset = 0;
        var rid = ++_feedReq;
        _feedState = 'loading';
        _feedMore = !!more;
        if (!more) paintBuyBody();
        apiGet(feedQuery()).then(function (r) {
            if (rid !== _feedReq) return;
            var items = (r && r.listings) ? r.listings : [];
            if (more && _feed) {
                var seen = {};
                _feed.forEach(function (x) { seen[x.id] = 1; });
                var fresh = items.filter(function (x) { return !seen[x.id]; });
                _feed = _feed.concat(fresh);
                _feedTotal = (r && typeof r.total === 'number') ? r.total : _feed.length;
                if (!fresh.length) _feedTotal = _feed.length;
            } else {
                _feed = items;
                _feedTotal = (r && typeof r.total === 'number') ? r.total : _feed.length;
                if (!_regionAll && !_regionFb && !_q && !_buyFiltersCount() && _feedTotal < 6) {
                    _regionFb = true; _regionFbBase = _feedTotal;
                    loadFeed(false);
                    return;
                }
            }
            _feedState = 'ready';
            if (_deepCard) {
                var did = _deepCard; _deepCard = null;
                var dl = _feed.filter(function (x) { return x.id === did; })[0];
                if (dl) setTimeout(function () { openListing(dl.username); }, 250);
                else apiGet('/api/v1/marketplace/listings?id=' + did).then(function (rr) {
                    var one = rr && rr.listings && rr.listings[0];
                    if (!one) return;
                    if (!_feed.some(function (x) { return x.id === one.id; })) {
                        _feed.unshift(one);
                        if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
                    }
                    setTimeout(function () { openListing(one.username); }, 250);
                }).catch(function () {});
            }
            if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
        }).catch(function () {
            if (rid !== _feedReq) return;
            if (more) {
                _feedOffset = Math.max(0, _feedOffset - _FEED_PAGE);
                _feedState = 'ready';
                toast('Не удалось загрузить продолжение. Повтори попытку.');
                if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
                return;
            }
            _feedState = 'error';
            if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody();
        });
    }
    function loadCatalog() {
        _catState = 'loading';
        apiGet('/api/v1/marketplace/base').then(function (r) {
            _catalog = (r && r.channels) ? r.channels : []; _catState = 'ready';
            _adultOk = !!(r && r.adult_ok);
            if (_mainTab === 'catalog') renderCatalog();
        }).catch(function () { _catState = 'error'; if (_mainTab === 'catalog') renderCatalog(); });
    }
    function loadChannels() { return apiGet('/api/v1/channels').then(function (r) { _channels = (r && r.channels) ? r.channels : []; return _channels; }).catch(function () { _channels = []; return []; }); }
    var _myLimit = null, _myUsed = null;
    function loadMyListings() { return apiGet('/api/v1/marketplace/my').then(function (r) { _myListings = (r && r.listings) ? r.listings : []; _myLimit = (r && r.limit != null) ? r.limit : null; _myUsed = (r && r.used != null) ? r.used : _myListings.length; return _myListings; }).catch(function () { _myListings = []; return []; }); }
    var _pubPollT = null;
    function _pollPublish(lid) {
        if (_pubPollT) { clearInterval(_pubPollT); _pubPollT = null; }
        var tries = 0;
        _pubPollT = setInterval(function () {
            tries++;
            if (tries > 12) { clearInterval(_pubPollT); _pubPollT = null; return; }
            loadMyListings().then(function (list) {
                var mine = (list || []).filter(function (x) { return x.id === lid; })[0];
                if (mine && mine.status === 'published') {
                    clearInterval(_pubPollT); _pubPollT = null;
                    _feed = null; _feedState = 'idle';
                    toast('Оффер прошёл проверку и опубликован — уже в ленте');
                    if (_subTab === 'buy') { try { renderBuy(); } catch (e) {} }
                }
            }).catch(function () {});
        }, 6000);
    }

    function loadBookmarks() { apiGet('/api/v1/marketplace/bookmarks').then(function (r) { _bookmarks = {}; ((r && r.bookmarks) ? r.bookmarks : []).forEach(function (b) { _bookmarks[b.username || b] = true; }); updateBmCount(); }).catch(function () {}); }

    function updateBmCount() {
        var n = Object.keys(_bookmarks).length, c = el('fmx-bmc'), b = el('fmx-bm');
        if (c) { c.textContent = n; c.style.display = n > 0 ? 'flex' : 'none'; }
        if (b) b.classList.toggle('fmx-has', n > 0);
    }

    var _catQ = '', _catQTimer = null;
    function _catList() {
        var list = _applySort(_catalog || []).filter(_rfPass);
        _regionNote = false;
        if (!_regionAll) {
            var seg = list.filter(_segPass);
            if (seg.length >= 6) list = seg;
            else if (seg.length < list.length) _regionNote = true;
        }
        var q = (_catQ || '').toLowerCase();
        if (q) list = list.filter(function (l) { return (((l.title || '') + ' @' + (l.username || '') + ' ' + (l.niche || '')).toLowerCase()).indexOf(q) >= 0; });
        return list;
    }
    function paintCatalogBody() {
        var box = el('fmx-catBody'); if (!box) return;
        if (_catState === 'loading') { box.innerHTML = loadHtml(); return; }
        if (_catState === 'error') { box.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.'); return; }
        if (!_catalog || !_catalog.length) { box.innerHTML = emptyHtml('ti-radar-2', 'Радар скоро наполнится', 'Здесь будет каталог каналов со всего Telegram — ищи по нише и договаривайся с владельцами напрямую.'); return; }
        var list = _catList();
        if (!list.length) {
            if (_sort === 'match' && !_catQ) {
                var myn = _myNichesStr();
                if (myn) box.innerHTML = emptyHtml('ti-target-arrow', 'В твоей нише пока пусто', 'В Радаре пока нет каналов ниши «' + _esc(myn) + '». Открой «Все каналы» или подбери близкую нишу через «Выбрать нишу».');
                else box.innerHTML = emptyHtml('ti-target-arrow', 'Ниша не определена', 'Выбери активный канал в главном меню — и Радар подберёт площадки твоей ниши. Пока открой «Все каналы».');
                return;
            }
            box.innerHTML = emptyHtml('ti-search-off', 'Ничего не найдено', 'Измени запрос или фильтр — подходящих каналов в каталоге пока нет.');
            return;
        }
        var _renderOne = (_view === 'cards') ? simpleCard : function (x) { return zw(listItem(x, false, true)); };
        var FIRST = 120, CHUNK = 60;
        var head = list.slice(0, FIRST).map(_renderOne).join('');
        box.innerHTML = (_regionNote ? _regionNoteHtml() : '') + (_view === 'cards'
            ? '<div class="fmx-grid" id="fmx-catGrid">' + head + '</div>'
            : '<div style="display:flex;flex-direction:column;gap:8px;" id="fmx-catGrid">' + head + '</div>') +
            '<div id="fmx-catTail"></div>';
        bindCards(box); if (_view === 'list') bindList(box); _bindAgeGate(box);
        var grid = el('fmx-catGrid'), token = (box._paintToken = (box._paintToken || 0) + 1);
        (function drawTail(i) {
            if (!grid || box._paintToken !== token || !grid.isConnected) return;
            if (i >= list.length) {
                var t = el('fmx-catTail');
                if (t && list.length > FIRST) t.innerHTML = '<div style="text-align:center;color:#565b73;font-size:11.5px;padding:12px 8px 2px;">' + list.length + ' ' + _plural(list.length, 'канал', 'канала', 'каналов') + ' — показаны все, что нашлись по фильтру</div>';
                return;
            }
            var tmp = document.createElement('div');
            tmp.innerHTML = list.slice(i, i + CHUNK).map(_renderOne).join('');
            var added = [];
            while (tmp.firstChild) { added.push(tmp.firstChild); grid.appendChild(tmp.firstChild); }
            added.forEach(function (n) {
                if (!n || n.nodeType !== 1) return;
                bindCards(n); if (_view === 'list') bindList(n); _bindAgeGate(n);
            });
            requestAnimationFrame(function () { drawTail(i + CHUNK); });
        })(FIRST);
    }
    function renderCatalog() {
        var host = el('fmx-main');
        if (_catalog == null && _catState === 'idle') loadCatalog();
        var bar = sortBarHtml() + searchHtml('Поиск канала по теме…') + '<div class="fmx-toprow" style="justify-content:flex-end;">' + vtogHtml() + '</div>';
        host.innerHTML = '<div class="fmx-note fmx-gr"><i class="ti ti-world-search"></i> Каналы со всего Telegram. Находи площадки под свою нишу и договаривайся с владельцами напрямую — сделки проходят между вами.</div>' + bar + '<div id="fmx-catBody"></div>';
        bindSort(); bindView();
        var _rfb = el('fmx-rfbtn'); if (_rfb) _rfb.addEventListener('click', openRadarFilters);
        _bindRegionChip(host, paintCatalogBody);
        var si = host.querySelector('.fmx-search input');
        if (si) { si.value = _catQ; si.addEventListener('input', function () { var v = si.value; clearTimeout(_catQTimer); _catQTimer = setTimeout(function () { _catQ = v.trim(); paintCatalogBody(); }, 300); }); }
        paintCatalogBody();
    }

    function renderMarket() {
        var host = el('fmx-main');
        if (_subTab === 'create' || _subTab === 'sell' || _subTab === 'mine') {
            host.innerHTML = '<div id="fmx-sub"></div>';
            if (_subTab === 'create') renderCreate(); else if (_subTab === 'sell') renderSell(); else renderMine();
            return;
        }
        _subTab = 'buy';
        host.innerHTML =
            searchHtml('Поиск по каналу или нише…') +
            '<div class="fmx-mkhelper"><b>Покупаешь рекламу</b> — выбирай канал в ленте ниже.<br><b>Продаёшь</b> — выстави свой оффер:</div>' +
            _sellCtaHtml() +
            '<div id="fmx-sub"></div>';
        (function () { var si = host.querySelector('.fmx-search input'); if (si) { si.value = _q; si.addEventListener('input', function () { var v = si.value; clearTimeout(_qTimer); _qTimer = setTimeout(function () { _q = v.trim(); loadFeed(false); }, 350); }); } })();
        el('fmx-sellcta').addEventListener('click', function () {
            _haptic('light'); _backTo = null;
            setSubTab(_myListings && _myListings.length ? 'mine' : 'create');
        });
        updateSellCta();
        renderBuy();
    }
    function _sellCtaSub() {
        if (_myListings && _myListings.length) {
            var st = _myListings.length > 1
                ? _myListings.length + ' ' + _plural(_myListings.length, 'оффер', 'оффера', 'офферов')
                : (_myListings[0].status_human || 'Оффер');
            return st + ' · нажми, чтобы управлять';
        }
        return 'Оформи оффер — его увидят покупатели';
    }
    function _sellCtaHtml() {
        var has = _myListings && _myListings.length;
        return '<div class="fmx-sellcta" id="fmx-sellcta">' +
            '<div class="fmx-sellcta-ic"><i class="ti ' + (has ? 'ti-adjustments-horizontal' : 'ti-plus') + '"></i></div>' +
            '<div class="fmx-sellcta-t"><div class="n" id="fmx-sellcta-n">' + (has ? 'Мой оффер' : 'Выставить свой канал') + '</div>' +
            '<div class="s" id="fmx-sellcta-s">' + _esc(_sellCtaSub()) + '</div></div>' +
            '<i class="ti ti-chevron-right fmx-sellcta-go"></i></div>';
    }
    function _paintSellCta() {
        if (_mainTab !== 'market' || _subTab !== 'buy') return;
        var n = el('fmx-sellcta-n'), s = el('fmx-sellcta-s'), cta = el('fmx-sellcta');
        if (!n || !s || !cta) return;
        var has = _myListings && _myListings.length;
        n.textContent = has ? 'Мой оффер' : 'Выставить свой канал';
        var ic = cta.querySelector('.fmx-sellcta-ic i');
        if (ic) ic.className = 'ti ' + (has ? 'ti-adjustments-horizontal' : 'ti-plus');
        _mqText(s, _sellCtaSub());
    }
    function updateSellCta() {
        if (typeof loadMyListings !== 'function') return;
        _paintSellCta();
        loadMyListings().then(_paintSellCta).catch(function () {});
    }
    function setSubTab(t, force) {
        if (!force && t === _subTab && el('fmx-sub')) return;
        _subTab = t;
        try { if (window.__fmTrack) window.__fmTrack('mxs_' + t); } catch (e) {}
        var host = el('fmx-main');
        if (host) { host.classList.remove('fmx-fade'); void host.offsetWidth; host.classList.add('fmx-fade'); }
        renderMarket();
    }

    var _fCpmMax = null, _fErMin = null, _fFreeFrom = null, _fFreeTo = null, _fDeals = false, _fClean = false, _fVerified = false;
    var _fSubsMax = null, _fCpmMin = null, _fErMax = null;
    var _fReachMin = null, _fReachMax = null, _fEngMin = null, _fEngMax = null, _fHealthMin = null, _fHealthMax = null;
    var _fAgeMin = null, _fAgeMax = null, _fAdpMin = null, _fAdpMax = null;
    function _buyFiltersCount() { return (_fPriceMin != null ? 1 : 0) + (_fPriceMax != null ? 1 : 0) + (_fSubsMin != null ? 1 : 0) + (_fAud ? 1 : 0) + ((_sort === 'niche' && _nicheSel) ? 1 : 0) + (_fCpmMax != null || _fCpmMin != null ? 1 : 0) + (_fErMin != null || _fErMax != null ? 1 : 0) + (_fFreeFrom ? 1 : 0) + (_fDeals ? 1 : 0) + (_fClean ? 1 : 0) + (_fVerified ? 1 : 0) + (_fSubsMax != null ? 1 : 0) + (_fReachMin != null || _fReachMax != null ? 1 : 0) + (_fEngMin != null || _fEngMax != null ? 1 : 0) + (_fHealthMin != null || _fHealthMax != null ? 1 : 0) + (_fAgeMin != null || _fAgeMax != null ? 1 : 0) + (_fAdpMin != null || _fAdpMax != null ? 1 : 0); }
    function buySortRowHtml() {
        var opts = [['smart', 'Умная'], ['price_asc', 'Цена ↑'], ['price_desc', 'Цена ↓'], ['reach', 'Охват'], ['cpm', 'CPM'], ['fresh', 'Свежие']];
        var nf = _buyFiltersCount();
        return '<div class="fmx-sortbar" id="fmx-buysort" style="display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;">' +
            _regionChipHtml() +
            opts.map(function (o) { return '<button class="fmx-seg' + (_sortBuy === o[0] ? ' on' : '') + '" data-bsort="' + o[0] + '" style="flex:0 0 auto;">' + o[1] + '</button>'; }).join('') +
            '<button class="fmx-seg' + (nf ? ' on' : '') + '" id="fmx-bfilters" style="flex:0 0 auto;"><i class="ti ti-adjustments-horizontal"></i> Фильтры' + (nf ? ' · ' + nf : '') + '</button></div>';
    }
    function _refreshFilterChip() {
        var bf = el('fmx-bfilters'); if (!bf) return;
        var nf = _buyFiltersCount();
        bf.classList.toggle('on', nf > 0);
        bf.innerHTML = '<i class="ti ti-adjustments-horizontal"></i> Фильтры' + (nf ? ' · ' + nf : '');
    }
    var _qTimer = null;
    function bindBuyControls() {
        var sub = el('fmx-sub'); if (!sub) return;
        _hscrollify(el('fmx-buysort'));
        qsa(sub, '[data-bsort]').forEach(function (b) {
            b.addEventListener('click', function () {
                var v = b.getAttribute('data-bsort');
                if (v === _sortBuy) return;
                _sortBuy = v; _haptic('light');
                if (v !== 'smart' && _sort === 'match') {
                    _sort = 'all';
                    toast('Подбор «Под мою нишу» работает только в умной сортировке — снят');
                }
                qsa(el('fmx-buysort'), '[data-bsort]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-bsort') === v); });
                loadFeed(false);
            });
        });
        var bf = el('fmx-bfilters');
        if (bf) bf.addEventListener('click', openBuyFilters);
        _bindRegionChip(sub, function () { loadFeed(false); });
    }
    function pickNiche() {
        var arr = (_mainTab === 'catalog' ? _catalog : _feed) || [];
        var seen = {}, niches = [];
        arr.forEach(function (l) { var nn = l.niche && String(l.niche).trim(); if (nn && !seen[nn.toLowerCase()]) { seen[nn.toLowerCase()] = 1; niches.push(nn); } });
        if (!niches.length) { toast('В ленте пока нет каналов с указанной нишей'); return; }
        openNichePick(niches);
    }
    function openBuyFilters() {
        var old = el('fmx-bfBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-bfBg'; bg.className = 'fmx-cfm solid';
        var _bfPair = function (lbl, id1, v1, id2, v2, step) {
            var st = step ? ' step="0.1" inputmode="decimal"' : ' inputmode="numeric"';
            return '<div class="fmx-bfcell"><span class="fmx-lbl">' + lbl + '</span>' +
                '<div class="fmx-bfrow"><input class="fmx-inp" id="' + id1 + '" type="number" min="0"' + st + ' placeholder="от" value="' + (v1 != null ? v1 : '') + '">' +
                '<input class="fmx-inp" id="' + id2 + '" type="number" min="0"' + st + ' placeholder="до" value="' + (v2 != null ? v2 : '') + '"></div></div>';
        };
        bg.innerHTML = '<div class="fmx-cfm-box fmx-bf-compact" style="left:50%;transform:translateX(-50%);margin-left:0;width:calc(100vw - 20px);max-width:480px;bottom:12px;"><div class="fmx-cfm-t" style="margin-bottom:10px;display:flex;align-items:center;gap:8px;"><i class="ti ti-adjustments-horizontal" style="color:#818cf8;"></i> Фильтры' +
            '<button id="fmx-bf-x" style="margin-left:auto;width:40px;height:40px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;"><i class="ti ti-x"></i></button></div>' +
            '<span class="fmx-lbl" style="margin-top:2px;">Быстро</span>' +
            '<div class="fmx-fxw" id="fmx-bf-pre" style="margin-bottom:10px;"><button class="fmx-fx' + ((_fSubsMin != null && _fSubsMin >= 100000) ? ' on' : '') + '" data-pre="large">Только крупные 100k+</button><button class="fmx-fx' + (_fDeals ? ' on' : '') + '" data-pre="deals">Со сделками</button><button class="fmx-fx' + (_fClean ? ' on' : '') + '" data-pre="clean">Прошли фрод-контроль</button><button class="fmx-fx' + (_fVerified ? ' on' : '') + '" data-pre="verified">Проверенный владелец</button></div>' +
            '<span class="fmx-lbl fmx-mt2">Точная настройка — от / до</span>' +
            '<div class="fmx-bfgrid">' +
            _bfPair('Подписчики', 'fmx-bf-smin', _fSubsMin, 'fmx-bf-smax', _fSubsMax) +
            _bfPair('Цена, ₽', 'fmx-bf-pmin', _fPriceMin, 'fmx-bf-pmax', _fPriceMax) +
            _bfPair('Охват', 'fmx-bf-rmin', _fReachMin, 'fmx-bf-rmax', _fReachMax) +
            _bfPair('ERR, %', 'fmx-bf-er', _fErMin, 'fmx-bf-erx', _fErMax, true) +
            _bfPair('ER, %', 'fmx-bf-emin', _fEngMin, 'fmx-bf-emax', _fEngMax, true) +
            _bfPair('CPM, ₽', 'fmx-bf-cpmn', _fCpmMin, 'fmx-bf-cpm', _fCpmMax) +
            _bfPair('Индекс', 'fmx-bf-hmin', _fHealthMin, 'fmx-bf-hmax', _fHealthMax) +
            _bfPair('Возраст, мес', 'fmx-bf-agmin', _fAgeMin, 'fmx-bf-agmax', _fAgeMax) +
            _bfPair('Реклама, %', 'fmx-bf-admin', _fAdpMin, 'fmx-bf-admax', _fAdpMax) +
            '<div class="fmx-bfcell"><span class="fmx-lbl">Свободно · с / по</span>' +
            '<div class="fmx-bfrow"><input class="fmx-inp" id="fmx-bf-df" type="date" value="' + (_fFreeFrom || '') + '">' +
            '<input class="fmx-inp" id="fmx-bf-dt" type="date" value="' + (_fFreeTo || '') + '"></div></div>' +
            '</div>' +
            '<span class="fmx-lbl fmx-mt2">Ниша</span>' +
            '<div class="fmx-fxw" id="fmx-bf-niche">' +
            '<button class="fmx-fx' + ((_sort !== 'match' && _sort !== 'niche') ? ' on' : '') + '" data-nf="all">Все каналы</button>' +
            '<button class="fmx-fx' + (_sort === 'match' ? ' on' : '') + '" data-nf="match">Под мою нишу</button>' +
            '<button class="fmx-fx' + (_sort === 'niche' && _nicheSel ? ' on' : '') + '" data-nf="pick">' + (_sort === 'niche' && _nicheSel ? 'Ниша: ' + _esc(_nicheSel) : 'Выбрать нишу…') + '</button>' +
            '</div>' +
            '<div class="fmx-cfm-r" style="margin-top:14px;"><button class="fmx-btn" data-reset>Сбросить</button><button class="fmx-btn" data-apply style="background:#818cf8;color:#0a0d18;border-color:transparent;font-weight:700;">Применить</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) applyClose(); });
        var bfx = bg.querySelector('#fmx-bf-x');
        if (bfx) bfx.addEventListener('click', applyClose);
        qsa(bg, '#fmx-bf-aud [data-aud]').forEach(function (b) {
            b.addEventListener('click', function () { qsa(bg, '#fmx-bf-aud [data-aud]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
        });
        qsa(bg, '#fmx-bf-pre [data-pre]').forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('on'); }); });
        qsa(bg, '#fmx-bf-niche [data-nf]').forEach(function (b) {
            b.addEventListener('click', function () {
                if (b.getAttribute('data-nf') === 'pick') { done(); pickNiche(); return; }
                qsa(bg, '#fmx-bf-niche [data-nf]').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on');
            });
        });
        function val(id) { var n = el(id); var v = n && n.value !== '' ? parseInt(n.value, 10) : null; return (v == null || isNaN(v) || v < 0) ? null : Math.min(v, 100000000); }
        function valF(id) { var n = el(id); var v = n && n.value !== '' ? parseFloat(n.value) : null; return (v == null || isNaN(v) || v < 0) ? null : Math.min(v, 100000000); }
        function applyClose() {
            _fPriceMin = val('fmx-bf-pmin'); _fPriceMax = val('fmx-bf-pmax'); _fSubsMin = val('fmx-bf-smin');
            _fCpmMax = val('fmx-bf-cpm'); _fErMin = valF('fmx-bf-er');
            _fSubsMax = val('fmx-bf-smax'); _fCpmMin = val('fmx-bf-cpmn'); _fErMax = valF('fmx-bf-erx');
            if (_fSubsMin != null && _fSubsMax != null && _fSubsMin > _fSubsMax) { var t2 = _fSubsMin; _fSubsMin = _fSubsMax; _fSubsMax = t2; }
            if (_fCpmMin != null && _fCpmMax != null && _fCpmMin > _fCpmMax) { var t3 = _fCpmMin; _fCpmMin = _fCpmMax; _fCpmMax = t3; }
            if (_fErMin != null && _fErMax != null && _fErMin > _fErMax) { var t4 = _fErMin; _fErMin = _fErMax; _fErMax = t4; }
            _fReachMin = val('fmx-bf-rmin'); _fReachMax = val('fmx-bf-rmax');
            _fEngMin = valF('fmx-bf-emin'); _fEngMax = valF('fmx-bf-emax');
            _fHealthMin = val('fmx-bf-hmin'); _fHealthMax = val('fmx-bf-hmax');
            if (_fReachMin != null && _fReachMax != null && _fReachMin > _fReachMax) { var t5 = _fReachMin; _fReachMin = _fReachMax; _fReachMax = t5; }
            if (_fEngMin != null && _fEngMax != null && _fEngMin > _fEngMax) { var t6 = _fEngMin; _fEngMin = _fEngMax; _fEngMax = t6; }
            if (_fHealthMin != null && _fHealthMax != null && _fHealthMin > _fHealthMax) { var t7 = _fHealthMin; _fHealthMin = _fHealthMax; _fHealthMax = t7; }
            _fAgeMin = val('fmx-bf-agmin'); _fAgeMax = val('fmx-bf-agmax');
            _fAdpMin = val('fmx-bf-admin'); _fAdpMax = val('fmx-bf-admax');
            if (_fAgeMin != null && _fAgeMax != null && _fAgeMin > _fAgeMax) { var t8 = _fAgeMin; _fAgeMin = _fAgeMax; _fAgeMax = t8; }
            if (_fAdpMin != null && _fAdpMax != null && _fAdpMin > _fAdpMax) { var t9 = _fAdpMin; _fAdpMin = _fAdpMax; _fAdpMax = t9; }
            var _df = el('fmx-bf-df'), _dt2 = el('fmx-bf-dt');
            _fFreeFrom = (_df && _df.value) ? _df.value : null;
            _fFreeTo = (_fFreeFrom && _dt2 && _dt2.value && _dt2.value >= _fFreeFrom) ? _dt2.value : null;
            var _preD = bg.querySelector('#fmx-bf-pre [data-pre="deals"]'), _preL = bg.querySelector('#fmx-bf-pre [data-pre="large"]');
            _fDeals = !!(_preD && _preD.classList.contains('on'));
            var _preC = bg.querySelector('#fmx-bf-pre [data-pre="clean"]'), _preV = bg.querySelector('#fmx-bf-pre [data-pre="verified"]');
            _fClean = !!(_preC && _preC.classList.contains('on'));
            _fVerified = !!(_preV && _preV.classList.contains('on'));
            if (_preL && _preL.classList.contains('on')) _fSubsMin = (_fSubsMin != null) ? Math.max(_fSubsMin, 100000) : 100000;
            if (_fPriceMin != null && _fPriceMax != null && _fPriceMin > _fPriceMax) { var t = _fPriceMin; _fPriceMin = _fPriceMax; _fPriceMax = t; }
            var au = bg.querySelector('#fmx-bf-aud [data-aud].on');
            _fAud = (au && au.getAttribute('data-aud')) ? au.getAttribute('data-aud') : null;
            var nf = bg.querySelector('#fmx-bf-niche [data-nf].on');
            if (nf) {
                var nv = nf.getAttribute('data-nf');
                if (nv === 'match') {
                    _sort = 'match'; _nicheSel = null;
                    if (_sortBuy !== 'smart') {
                        _sortBuy = 'smart';
                        qsa(el('fmx-buysort'), '[data-bsort]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-bsort') === 'smart'); });
                        toast('Включена умная сортировка — подбор под твою нишу работает в ней');
                    }
                } else if (nv === 'all') { _sort = 'all'; _nicheSel = null; }
            }
            done(); _haptic('light'); _refreshFilterChip(); loadFeed(false);
        }
        bg.querySelector('[data-apply]').addEventListener('click', applyClose);
        bg.querySelector('[data-reset]').addEventListener('click', function () {
            _fPriceMin = _fPriceMax = _fSubsMin = null; _fAud = null; _sort = 'match'; _nicheSel = null;
            _fCpmMax = _fErMin = _fFreeFrom = _fFreeTo = null; _fDeals = false; _fClean = false; _fVerified = false;
            _fSubsMax = _fCpmMin = _fErMax = null;
            _fReachMin = _fReachMax = _fEngMin = _fEngMax = _fHealthMin = _fHealthMax = null;
            _fAgeMin = _fAgeMax = _fAdpMin = _fAdpMax = null;
            done(); _refreshFilterChip(); loadFeed(false);
        });
    }
    function _applyBuyFilter(arr) {
        if (_sort === 'niche' && _nicheSel) return arr.filter(function (l) { return l.niche && _nicheHit(_nicheSel, l.niche); });
        if (_sort === 'match' && _sortBuy === 'smart') return arr.slice().sort(function (a, b) { return (_nicheMatch(b) ? 1 : 0) - (_nicheMatch(a) ? 1 : 0); });
        return arr;
    }
    function paintBuyBody() {
        var host = el('fmx-buyBody');
        if (!host) { if (_mainTab === 'market' && _subTab === 'buy') renderBuy(); return; }
        var body;
        var hasFilters = !!_q || _buyFiltersCount() > 0;
        var left = _feed ? Math.max(0, _feedTotal - _feed.length) : 0;
        var nicheOn = _sort === 'niche' && _nicheSel;
        var loadingMore = _feedState === 'loading' && _feedMore && _feed && _feed.length;
        var moreBtn = '';
        if (loadingMore) moreBtn = '<button class="fmx-btn" id="fmx-more" disabled style="width:100%;margin-top:12px;min-height:40px;"><i class="ti ti-loader-2"></i> Загружаю…</button>';
        else if (left > 0) moreBtn = '<button class="fmx-btn" id="fmx-more" style="width:100%;margin-top:12px;min-height:40px;"><i class="ti ti-chevron-down"></i> ' + (nicheOn ? 'Показать ещё — искать нишу дальше' : 'Показать ещё (' + left + ')') + '</button>';
        if (_feedState === 'loading' && !loadingMore) body = loadHtml();
        else if (_feedState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.');
        else if (!_feed || !_feed.length) body = hasFilters
            ? emptyHtml('ti-search-off', 'Ничего не найдено', 'Измени запрос или сбрось фильтры.')
            : emptyHtml('ti-building-store', 'Пока пусто', 'Здесь появятся оформленные офферы каналов от наших пользователей. Размести первый оффер кнопкой «Выставить свой канал».');
        else {
            var feed = _applyBuyFilter(_feed);
            var rnote = (_regionFb && _regionFbBase != null && _feedTotal > _regionFbBase) ? _regionNoteHtml() : '';
            if (!feed.length) body = emptyHtml('ti-filter-off', 'По фильтру пусто', 'В выбранной нише пока нет карточек. Попробуй «Все каналы» — или догрузи ленту дальше.') + moreBtn;
            else body = rnote + (_view === 'cards' ? '<div class="fmx-grid">' + feed.map(fullCard).join('') + '</div>' : '<div style="display:flex;flex-direction:column;gap:8px;">' + feed.map(function (x) { return zw(listItem(x)); }).join('') + '</div>') + moreBtn;
        }
        host.innerHTML = body;
        bindCards(host); if (_view === 'list') bindList(host);
        observeViews(host);
        bindPeek(host);
        var more = el('fmx-more');
        if (more) more.addEventListener('click', function () {
            more.disabled = true; more.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю…';
            _feedOffset += _FEED_PAGE;
            loadFeed(true);
        });
    }
    function renderBuy() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (!_chLoaded && !_chLoading) {
            _chLoading = true;
            loadChannels().then(function () { _chLoaded = true; _chLoading = false; if (_mainTab === 'market' && _subTab === 'buy') paintBuyBody(); }).catch(function () { _chLoading = false; _chLoaded = true; });
        }
        sub.innerHTML =
            '<div id="fmx-todayLine">' + todayLine() + '</div>' +
            '<div class="fmx-picks"><button class="fmx-campbtn" id="fmx-campCta" title="Собрать кампанию под бюджет"><i class="ti ti-calculator"></i><span>Кампания</span></button>' +
            _nicheBtnHtml() + _bellBtnHtml() + '</div>' +
            topRowHtml() + buySortRowHtml() +
            '<div id="fmx-buyBody"></div>';
        var cc = el('fmx-campCta');
        if (cc) cc.addEventListener('click', function () { _haptic('light'); openCampaign(); });
        bindSort(); bindView(); bindBuyControls();
        if (_feed == null && _feedState === 'idle') loadFeed(); else paintBuyBody();
        if (!_pulse) loadPulse(function () { var tl = el('fmx-todayLine'); if (tl && _pulse) tl.innerHTML = todayLine(); });
    }

    var REQ_FMT = { any: 'Любой формат' };
    FMT_CATALOG.forEach(function (f) { REQ_FMT[f.k] = f.n; });
    function loadRequests() {
        _reqState = 'loading';
        apiGet('/api/v1/marketplace/requests').then(function (r) {
            _reqs = (r && r.requests) ? r.requests : []; _reqState = 'ready';
            if (_mainTab === 'market' && _subTab === 'sell') renderSell();
        }).catch(function () { _reqState = 'error'; if (_mainTab === 'market' && _subTab === 'sell') renderSell(); });
    }
    function _ago(iso) {
        if (!iso) return '';
        var m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
        if (m < 60) return m + ' мин назад';
        var h = Math.round(m / 60); if (h < 24) return h + ' ч назад';
        var d = Math.round(h / 24); return d + ' дн назад';
    }
    function _plural(n, a, b, c) { var m = n % 100; if (m >= 11 && m <= 14) return c; m = n % 10; if (m === 1) return a; if (m >= 2 && m <= 4) return b; return c; }
    function reqCard(r) {
        var head = [];
        if (r.niche) head.push('<span class="fmx-reqn">' + _esc(r.niche) + '</span>');
        head.push('<span class="fmx-reqf">' + (REQ_FMT[_fmtKey(r.format)] || REQ_FMT.any) + '</span>');
        var cts = r.contacts ? ' · <span style="color:#f59e0b;">' + r.contacts + ' ' + _plural(r.contacts, 'отклик', 'отклика', 'откликов') + '</span>' : '';
        var leads = '';
        if (r.mine && r.leads && r.leads.length) {
            leads = '<div class="fmx-leads"><div class="fmx-leads-t"><i class="ti ti-users-group"></i> Заинтересовались:</div>' +
                r.leads.map(function (ld) {
                    return '<a class="fmx-lead" href="https://t.me/' + _esc(ld.username) + '" target="_blank" rel="noopener noreferrer"><b>' + _esc(ld.title || '@' + ld.username) + '</b><span>@' + _esc(ld.username) + (ld.subscribers ? ' · ' + _short(ld.subscribers) + ' подп' : '') + '</span></a>';
                }).join('') + '</div>';
        }
        return '<div class="fmx-req' + (r.mine ? ' mine' : '') + '">' +
            '<div class="fmx-reqh">' + head.join('') + '<span class="fmx-reqb' + (r.budget ? '' : ' na') + '">' + (r.budget ? 'до ' + _num(r.budget) + ' ₽' : 'бюджет не указан') + '</span></div>' +
            '<div class="fmx-reqt">' + _esc(r.text) + '</div>' + leads +
            '<div class="fmx-reqft"><span>' + _ago(r.created_at) + (r.mine ? ' · твоя заявка' : '') + cts + '</span>' +
            (r.mine
                ? '<button class="fmx-btn" data-rclose="' + r.id + '" style="padding:7px 12px;"><i class="ti ti-x"></i>Закрыть</button>'
                : '<span style="display:flex;gap:6px;align-items:center;"><button class="fmx-btn" data-rrep="' + r.id + '" title="Пожаловаться" style="padding:7px 9px;"><i class="ti ti-flag"></i></button><button class="fmx-btn fmx-btn-p" data-rwrite="' + _esc(r.contact_username) + '" data-rid="' + r.id + '" style="padding:7px 14px;background:#818cf8;color:#fff;"><i class="ti ti-brand-telegram"></i>Написать</button></span>') +
            '</div></div>';
    }
    function renderSell() {
        var sub = el('fmx-sub'); if (!sub) return;
        if (_reqs == null && _reqState === 'idle') loadRequests();
        var body;
        if (_reqState === 'loading') body = loadHtml();
        else if (_reqState === 'error') body = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.');
        else if (!_reqs || !_reqs.length) body = emptyHtml('ti-speakerphone', 'Заявок пока нет', 'Размести заявку — владельцы подходящих каналов напишут сами.');
        else body = '<div style="display:flex;flex-direction:column;gap:9px;">' + _reqs.map(function (r) { return zw(reqCard(r)); }).join('') + '</div>';
        sub.innerHTML = '<div class="fmx-note"><i class="ti ti-speakerphone"></i> Заявки рекламодателей: здесь ищут каналы для размещения. Твоя ниша подошла — пиши первым.</div>' +
            '<div style="display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap;"><button class="fmx-save" id="fmx-newreq" style="margin:0;flex:1;min-width:170px;"><i class="ti ti-plus"></i> Разместить заявку</button>' +
            '<button class="fmx-btn" id="fmx-nbell" style="flex:0 0 auto;padding:0 13px;min-height:40px;"><i class="ti ti-bell"></i> Следить за нишей</button></div>' + body;
        scaleCards(sub);
        el('fmx-newreq').addEventListener('click', openReqForm);
        el('fmx-nbell').addEventListener('click', openNicheSubs);
        qsa(sub, '[data-rrep]').forEach(function (b) { b.addEventListener('click', function () { openComplaint({ request_id: +b.getAttribute('data-rrep') }); }); });
        qsa(sub, '[data-rwrite]').forEach(function (b) {
            b.addEventListener('click', function () {
                var rid = b.getAttribute('data-rid');
                if (rid) apiPost('/api/v1/marketplace/requests/' + rid + '/contact', {}).then(function (r) {
                    if (r && r.ok && typeof r.contacts === 'number' && _reqs) {
                        var it = _reqs.filter(function (x) { return String(x.id) === String(rid); })[0];
                        if (it && it.contacts !== r.contacts) { it.contacts = r.contacts; renderSell(); }
                    }
                }).catch(function () {});
                openTg(b.getAttribute('data-rwrite'));
            });
        });
        qsa(sub, '[data-rclose]').forEach(function (b) {
            b.addEventListener('click', function () {
                uiConfirm('Закрыть заявку? Она исчезнет из ленты.', function () {
                    apiPost('/api/v1/marketplace/requests/' + b.getAttribute('data-rclose') + '/close', {}).then(function (r) {
                        if (r && r.ok === false) { uiAlert(r.error || 'Не удалось закрыть'); return; }
                        toast('Заявка закрыта'); _reqs = null; _reqState = 'idle'; renderSell();
                    }).catch(function () { uiAlert('Не удалось закрыть. Повтори попытку.'); });
                });
            });
        });
    }
    var _backTo = null;
    var _mineEditCh = null;

    function _mineChannelOf(l) {
        for (var i = 0; i < _channels.length; i++) {
            var c = _channels[i];
            if (c.username && l.username && c.username.toLowerCase() === l.username.toLowerCase()) return c;
        }
        return null;
    }

    function _mineStatus(l) {
        var m = {
            published: ['#5DCAA5', 'Опубликовано'],
            paused: ['#8990a8', 'Заморожен'],
            rejected: ['#ef8080', 'Отклонён'],
            pending: ['#f5bf4f', 'На проверке']
        };
        var s = m[l.status] || ['#8990a8', l.status_human || l.status || '—'];
        return '<span class="fmx-mine-st" style="color:' + s[0] + ';border-color:' + s[0] + '33;background:' + s[0] + '14;">' + _esc(l.status_human || s[1]) + '</span>';
    }

    var _TEAM_ROLE_RU = { owner: 'Владелец', trustee: 'Доверенный', manager: 'Управляющий', editor: 'Редактор', viewer: 'Наблюдатель' };
    function mineCard(l) {
        var t = l.title || l.username || '?';
        var av = l.avatar_url
            ? '<img src="' + _esc(mediaAbs(l.avatar_url)) + '" alt="">'
            : _esc(t.charAt(0));
        var frozen = l.status === 'paused';
        var tp = l.team_perms || null;
        var own = !tp || !!l.team_self;
        var can = tp ? function (k) { return !!tp[k]; } : function () { return true; };
        var roleChip = l.team_role
            ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:9.5px;font-weight:800;color:#5DCAA5;background:rgba(93,202,165,0.1);border:0.5px solid rgba(93,202,165,0.35);border-radius:7px;padding:2px 7px;margin-left:6px;vertical-align:1px;"><i class="ti ti-users"></i>' + (_TEAM_ROLE_RU[l.team_role] || l.team_role) + '</span>'
            : '';
        return '<div class="fmx-minecard" data-mine="' + l.id + '">' +
            '<div class="fmx-minehead"><div class="fmx-mineav" style="background:' + _esc(_accent(l)) + ';">' + av + '</div>' +
            '<div style="flex:1;min-width:0;"><div class="fmx-minenm">' + _esc(t) + roleChip + '</div>' +
            '<div class="fmx-mineu">@' + _esc(l.username || '') + '</div></div>' + _mineStatus(l) + '</div>' +
            (l.status === 'rejected' && l.reject_reason
                ? '<div class="fmx-minerej">Причина: ' + _esc(l.reject_reason) + ' — исправь и сохрани, оффер уйдёт на повторную проверку.</div>' : '') +
            '<div class="fmx-minemet" id="fmx-mst-' + l.id + '">За 7 дней: считаем…</div>' +
            (can('edit') ? '<div style="margin-top:11px;padding-top:11px;border-top:0.5px solid rgba(255,255,255,0.06);">' +
            '<div style="font-size:10px;color:#565b73;text-transform:uppercase;letter-spacing:0.3px;font-weight:700;margin-bottom:6px;">Календарь занятости · 45 дней</div>' +
            '<div class="fmx-d14 num" id="fmx-strip-' + l.id + '"></div>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:7px;">' +
            '<span style="font-size:10px;color:#565b73;flex:1;line-height:1.4;">Тап по дню — занято/свободно. Точка — спрос на дату</span>' +
            '<button class="fmx-seg" data-mcal="' + l.id + '" style="flex:0 0 auto;min-height:30px;padding:5px 12px;">Весь календарь</button></div>' +
            '<button class="fmx-seg" data-mhotadv="' + l.id + '" style="width:100%;margin-top:6px;min-height:34px;padding:6px 12px;color:#f5bf4f;border-color:rgba(245,191,79,0.35);"><i class="ti ti-discount-2"></i> Точечные скидки — свои даты, время и процент' + (l.hot_manual ? ' · вкл' : '') + '</button></div>' : '') +
            '<div class="fmx-mineacts">' +
            (own && can('edit') ? '<button class="fmx-btn" data-medit="' + l.id + '"><i class="ti ti-pencil"></i>Редактировать</button>' : '') +
            '<button class="fmx-btn" data-mstat="' + l.id + '"><i class="ti ti-chart-bar"></i>Статистика</button>' +
            (can('edit') ? '<button class="fmx-btn" data-mtablo="' + l.id + '" style="color:#f5bf4f;border-color:rgba(245,191,79,0.35);"><i class="ti ti-layout-collage"></i>Витрина</button>' : '') +
            (own ? '<button class="fmx-btn" data-mshare="' + l.id + '"><i class="ti ti-share-2"></i>Поделиться</button>' +
                '<button class="fmx-btn" data-mposter="' + l.id + '"><i class="ti ti-photo-star"></i>Постер</button>' : '') +
            (can('pub') ? '<button class="fmx-btn" data-mpause="' + l.id + '">' + (frozen ? '<i class="ti ti-player-play"></i>Возобновить' : '<i class="ti ti-snowflake"></i>Заморозить') + '</button>' : '') +
            (can('del') ? '<button class="fmx-btn" data-mdel="' + l.id + '" style="grid-column:1/-1;color:#ef4444;border-color:rgba(239,68,68,0.3);"><i class="ti ti-trash"></i>Удалить оффер</button>' : '') +
            '</div></div>';
    }

    function _mineById(id) { for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === id) return _myListings[i]; return null; }

    function _mineStrip(l) {
        var box = el('fmx-strip-' + l.id); if (!box) return;
        function draw(r) {
            var busy = {}; (r.busy || []).forEach(function (x) { busy[x] = 1; });
            var demand = r.demand || {};
            var WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            var MO = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
            var h = '';
            var d = new Date(); d.setHours(12, 0, 0, 0);
            var om = r.open_months || [];
            for (var i = 0; i < 45; i++) {
                var iso = _isoOf(d);
                var offD = om.indexOf(iso.slice(0, 7)) < 0;
                var wlab = d.getDate() === 1 ? '<div class="w" style="color:#c9cbe0;font-weight:800;">' + MO[d.getMonth()] + '</div>' : '<div class="w">' + WD[d.getDay()] + '</div>';
                h += '<div class="fmx-dd ' + (offD ? 'off2' : (busy[iso] ? 'bs' : 'fr')) + '" data-sd="' + iso + '"' + (offD ? ' data-off="1"' : '') + '>' +
                    '<div class="c num">' + d.getDate() + (demand[iso] ? '<i class="dm"></i>' : '') + '</div>' +
                    wlab + '</div>';
                d.setDate(d.getDate() + 1);
            }
            box.innerHTML = h;
            _hscrollify(box, true);
            qsa(box, '[data-sd]').forEach(function (dd) {
                dd.addEventListener('click', function () {
                    var iso = dd.getAttribute('data-sd');
                    if (dd.getAttribute('data-off')) { _haptic('light'); toast('Месяц закрыт для рекламы — открой его в «Весь календарь»'); return; }
                    apiPost('/api/v1/marketplace/listings/' + l.id + '/slots/toggle', { day: iso }).then(function (rr) {
                        if (!rr || !rr.ok) { _haptic('error'); uiAlert('Не удалось изменить день'); return; }
                        _haptic('light');
                        if (rr.busy) r.busy.push(iso); else r.busy = r.busy.filter(function (x) { return x !== iso; });
                        r.slots_updated_at = new Date().toISOString();
                        _calData[l.id] = r;
                        draw(r);
                        var _jd = box.querySelector('[data-sd="' + iso + '"]'); if (_jd) _jd.classList.add('just');
                        toast('Календарь обновлён — закупщики уже видят новые даты');
                    }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
                });
            });
        }
        if (_calData[l.id]) { draw(_calData[l.id]); return; }
        apiGet('/api/v1/marketplace/listings/' + l.id + '/slots').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = ''; return; }
            _calData[l.id] = r;
            draw(r);
        }).catch(function () { box.innerHTML = ''; });
    }

    function paintMine() {
        var sub = el('fmx-sub'); if (!sub) return;
        var lim = _myLimit, used = _myUsed != null ? _myUsed : _myListings.length;
        var avail = (lim != null) ? Math.max(0, lim - used) : null;
        sub.innerHTML = '<div class="fmx-note"><i class="ti ti-briefcase"></i> Кабинет продавца: статус, статистика и управление офферами. Занятые даты отмечай в календаре — покупатели видят свободные.</div>' +
            (lim != null ? '<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.09);border-radius:14px;padding:12px 13px;margin-bottom:10px;">' +
                '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:12.5px;font-weight:700;">Мои офферы</span>' +
                '<span class="num" style="margin-left:auto;font-size:11px;color:#8990a8;">размещено: ' + used + ' из ' + lim + '</span></div>' +
                '<div class="fmx-limbar"><i style="width:' + Math.min(100, Math.round(used / lim * 100)) + '%;"></i></div></div>' : '') +
            (_channels.length >= 2 ?
                '<button id="fmx-netOpen" style="width:100%;display:flex;align-items:center;gap:10px;background:rgba(129,140,248,0.08);border:0.5px solid rgba(129,140,248,0.25);border-radius:14px;padding:12px 13px;margin-bottom:10px;cursor:pointer;color:#e8e8ed;font-family:inherit;text-align:left;">' +
                '<i class="ti ti-sitemap" style="font-size:18px;color:#818cf8;flex:0 0 auto;"></i>' +
                '<span style="flex:1;min-width:0;"><span style="display:block;font-size:12.5px;font-weight:700;">Сетка</span><span style="display:block;font-size:10.5px;color:#8990a8;">Все каналы: сводка, пакетные цены и пауза</span></span>' +
                '<span class="num" style="font-size:11px;color:#8990a8;flex:0 0 auto;">' + _channels.length + '</span><i class="ti ti-chevron-right" style="color:#565b73;flex:0 0 auto;"></i></button>' : '') +
            '<div id="fmx-dealsPend"></div>' +
            _myListings.map(mineCard).join('') +
            '<button class="fmx-save" id="fmx-mineNew" style="margin-top:14px;"' + (avail === 0 ? ' disabled style="margin-top:14px;opacity:0.5;"' : '') + '><i class="ti ti-plus"></i> Разместить ещё оффер' + (avail != null ? ' · ' + (avail > 0 ? 'доступен ещё ' + avail : 'лимит тарифа исчерпан') : '') + '</button>' +
            '<div style="font-size:10px;color:#565b73;margin-top:7px;text-align:center;">Один канал — один оффер. Доступное количество зависит от тарифа</div>';
        loadPendingDeals();
        var netBtn = el('fmx-netOpen');
        if (netBtn) netBtn.addEventListener('click', function () { netOpen(); });
        el('fmx-mineNew').addEventListener('click', function () {
            if (avail === 0) { _haptic('error'); uiAlert('Лимит тарифа исчерпан. Повысь тариф или удали один из офферов.'); return; }
            _haptic('light'); _backTo = 'mine'; _mineEditCh = null; setSubTab('create');
        });
        qsa(sub, '[data-medit]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-medit')); if (!l) return;
                var ch = _mineChannelOf(l);
                if (!ch) { _haptic('error'); uiAlert('Канал этого оффера не найден в приложении — проверь список каналов.'); return; }
                _haptic('light'); _mineEditCh = ch.id; _backTo = 'mine'; setSubTab('create');
            });
        });
        qsa(sub, '[data-mstat]').forEach(function (b) {
            b.addEventListener('click', function () { _haptic('light'); openListingStats(+b.getAttribute('data-mstat')); });
        });
        qsa(sub, '[data-mcal]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mcal')); if (!l) return;
                _haptic('light'); _ownerCalHot = false; openOwnerCalendar(l);
            });
        });
        qsa(sub, '[data-mhotadv]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mhotadv')); if (!l) return;
                _haptic('light'); _ownerCalHot = true; _ownerHotDay = null; _ownerHotPct = null; _ownerHotTimes = null;
                openOwnerCalendar(l);
            });
        });
        qsa(sub, '[data-mtablo]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mtablo')); if (!l) return;
                _haptic('light'); openTabloEditor(l);
            });
        });
        _myListings.forEach(function (l) { _mineStrip(l); });
        qsa(sub, '[data-mshare]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mshare')); if (!l) return;
                shareCard(l.id, l.username);
            });
        });
        qsa(sub, '[data-mposter]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mposter')); if (!l) return;
                var ch = _mineChannelOf(l);
                if (!ch) { _haptic('error'); uiAlert('Канал этого оффера не найден в приложении.'); return; }
                if (!_ss) { _ss = defaultState(); _sfmts = defaultFmts(); _ss.sticker = null; _ss.showDeals = true; }
                _haptic('light'); _ss.channelId = ch.id;
                openPosterStudio();
            });
        });
        qsa(sub, '[data-mpause]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mpause')); if (!l) return;
                var act = l.status === 'paused' ? 'resume' : 'pause';
                b.disabled = true;
                apiPost('/api/v1/marketplace/listings/' + l.id + '/' + act, {}).then(function (r) {
                    b.disabled = false;
                    if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось'); return; }
                    _haptic('success');
                    l.status = act === 'pause' ? 'paused' : 'published';
                    l.status_human = act === 'pause' ? 'Заморожен' : 'Опубликовано';
                    toast(act === 'pause' ? 'Оффер заморожен — с Площадки убран, вернёшь в любой момент' : 'Оффер снова на Площадке');
                    _feed = null; _feedState = 'idle';
                    if (_subTab === 'mine') paintMine();
                }).catch(function () { b.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
            });
        });
        qsa(sub, '[data-mdel]').forEach(function (b) {
            b.addEventListener('click', function () {
                var l = _mineById(+b.getAttribute('data-mdel')); if (!l) return;
                uiConfirm('Удалить оффер «' + (l.title || l.username || '') + '» с Площадки навсегда? Оформление и продвижение не сохранятся.', function () {
                    b.disabled = true;
                    apiRequest('/api/v1/marketplace/listings/' + l.id, { method: 'DELETE' }).then(function (r) {
                        b.disabled = false;
                        if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось удалить'); return; }
                        _haptic('success'); toast('Оффер удалён');
                        _myListings = _myListings.filter(function (x) { return x.id !== l.id; });
                        if (_ss && _ss.listingId === l.id) { _ss.listingId = null; _ss._status = null; }
                        _feed = null; _feedState = 'idle';
                        if (!_myListings.length) { setSubTab('buy', true); return; }
                        if (_subTab === 'mine') paintMine();
                    }).catch(function () { b.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
                });
            });
        });
        _myListings.forEach(function (l) {
            apiGet('/api/v1/marketplace/my/' + l.id + '/stats').then(function (r) {
                var n = el('fmx-mst-' + l.id); if (!n) return;
                if (!r || !r.ok) { n.textContent = 'За 7 дней: статистика недоступна'; return; }
                var t = r.totals || {};
                n.innerHTML = 'За 7 дней: <b>' + (t.views || 0) + '</b> показов · <b>' + (t.expands || 0) + '</b> разворотов · <b>' + (t.writes || 0) + '</b> перешли в чат';
            }).catch(function () { var n = el('fmx-mst-' + l.id); if (n) n.textContent = 'За 7 дней: статистика недоступна'; });
        });
    }

    var _net = { ch: [], my: [], chLim: null, lim: null, used: null, mode: false, sel: {}, filter: 'all', busy: false };

    function netShort(n) {
        if (n == null || isNaN(n)) return '—';
        n = Number(n);
        if (n >= 1e6) return (Math.round(n / 1e5) / 10) + 'M';
        if (n >= 1000) return Math.round(n / 1000) + 'K';
        return String(Math.round(n));
    }

    function netListingOf(ch) {
        if (!ch || !ch.username) return null;
        var u = String(ch.username).toLowerCase();
        for (var i = 0; i < _net.my.length; i++) {
            if ((_net.my[i].username || '').toLowerCase() === u) return _net.my[i];
        }
        return null;
    }

    function netAttn(ch, l) {
        if (ch.bot_status !== 'connected') return { lvl: 'r', text: 'Бот не подключён к каналу' };
        if (l && (l.status === 'rejected' || l.status === 'banned')) return { lvl: 'a', text: 'Оффер отклонён модерацией' };
        return null;
    }

    function netSelIds() {
        return Object.keys(_net.sel).filter(function (k) { return _net.sel[k]; }).map(Number);
    }

    function netOpen() {
        _haptic('light');
        var old = el('fmx-netBg'); if (old) old.remove();
        _net.mode = false; _net.sel = {}; _net.filter = 'all'; _net.busy = false;
        var bg = document.createElement('div'); bg.id = 'fmx-netBg'; bg.className = 'fmx-mbg fmx-show';
        bg.innerHTML = '<div class="fmx-modal">' +
            '<div class="fmx-mhead"><div style="flex:1;min-width:0;"><h2><i class="ti ti-sitemap" style="color:#818cf8;"></i> <span>Сетка</span></h2><p id="fmx-netSub"><span>Каналы, офферы и пакетные операции</span></p></div>' +
            '<button id="fmx-netAll" style="display:none;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);color:#a9aec0;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;flex:0 0 auto;"></button>' +
            '<button id="fmx-netSel" style="background:rgba(129,140,248,0.12);border:0.5px solid rgba(129,140,248,0.3);color:#818cf8;border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;flex:0 0 auto;"><span>Выбрать</span></button>' +
            '<button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-mbody" id="fmx-netBody"><div class="fmx-empty" style="padding:36px 0;"><i class="ti ti-loader-2" style="animation:fmxSpin 0.9s linear infinite;"></i></div></div>' +
            '<div id="fmx-netBar" style="display:none;gap:8px;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:0.5px solid rgba(255,255,255,0.08);"></div></div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        bg.querySelector('[data-c]').addEventListener('click', function () { bg.remove(); });
        el('fmx-netSel').addEventListener('click', function () { netMode(!_net.mode); });
        netReload();
    }

    function netMode(on) {
        _haptic('light');
        _net.mode = !!on;
        if (!on) _net.sel = {};
        var sb = el('fmx-netSel');
        if (sb) sb.innerHTML = '<span>' + (on ? 'Отмена' : 'Выбрать') + '</span>';
        netPaint();
    }

    function netReload() {
        Promise.all([apiGet('/api/v1/channels'), apiGet('/api/v1/marketplace/my'), apiGet('/api/v1/marketplace/network/batch').catch(function () { return null; })]).then(function (rr) {
            if (!el('fmx-netBody')) return;
            var chR = rr[0] || {}, myR = rr[1] || {};
            _net.ch = chR.channels || [];
            _net.chLim = chR.channel_limit != null ? chR.channel_limit : null;
            _net.my = myR.listings || [];
            _net.lim = myR.limit != null ? myR.limit : null;
            _net.used = myR.used != null ? myR.used : _net.my.length;
            _net.ov = rr[2] && rr[2].ok ? rr[2] : null;
            netPaint();
        }).catch(function () {
            var body = el('fmx-netBody');
            if (body) body.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.');
        });
    }

    function netEligible() {
        return _net.ch.filter(function (ch) {
            return ch.username && ch.bot_status === 'connected' && !netListingOf(ch);
        });
    }

    function netPaint() {
        var body = el('fmx-netBody'); if (!body) return;
        var rows = _net.ch.map(function (ch) { return { ch: ch, l: netListingOf(ch) }; });
        var pub = 0, paus = 0, none = 0, attn = 0, reach = 0, erSum = 0, erN = 0, pend = 0;
        rows.forEach(function (r) {
            if (r.ch.avg_views) reach += r.ch.avg_views;
            if (r.ch.er_percent != null) { erSum += Number(r.ch.er_percent) || 0; erN++; }
            if (netAttn(r.ch, r.l)) attn++;
            if (!r.l) { if (r.ch.username) none++; return; }
            if (r.l.status === 'published') pub++;
            else if (r.l.status === 'paused') paus++;
            else if (r.l.status === 'pending') pend++;
        });
        var er = erN ? Math.round(erSum / erN * 10) / 10 : null;
        function tile(icon, color, bgc, label, val, hint) {
            return '<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:11px 12px;min-width:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);">' +
                '<div style="display:flex;align-items:center;gap:7px;min-width:0;">' +
                '<span style="width:24px;height:24px;border-radius:8px;flex:0 0 24px;display:flex;align-items:center;justify-content:center;background:' + bgc + ';"><i class="ti ' + icon + '" style="font-size:13px;color:' + color + ';"></i></span>' +
                '<span style="font-size:9.5px;color:#8990a8;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><span>' + label + '</span></span></div>' +
                '<div class="num" style="font-size:19px;font-weight:800;margin-top:7px;white-space:nowrap;">' + val + '</div>' +
                (hint ? '<div style="font-size:10px;color:#565b73;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + hint + '</div>' : '') +
                '</div>';
        }
        var tiles = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">' +
            tile('ti-broadcast', '#818cf8', 'rgba(129,140,248,0.15)', 'Каналы', _num(_net.ch.length) + (_net.chLim != null ? ' <span style="font-size:11px;font-weight:600;color:#565b73;">/ ' + _num(_net.chLim) + '</span>' : ''), '') +
            tile('ti-eye', '#60a5fa', 'rgba(59,130,246,0.15)', 'Суммарный охват', netShort(reach), '') +
            tile('ti-activity', '#5DCAA5', 'rgba(93,202,165,0.15)', 'Средний ER', er != null ? String(er).replace('.', ',') + '%' : '—', '') +
            tile('ti-briefcase', '#f5bf4f', 'rgba(245,191,79,0.15)', 'Офферы', _num(_net.used) + (_net.lim != null ? ' <span style="font-size:11px;font-weight:600;color:#565b73;">/ ' + _num(_net.lim) + '</span>' : ''),
                pend ? '<span>На модерации:</span> <b class="num">' + pend + '</b>' : '') +
            '</div>';
        var chipDefs = [
            { k: 'all', t: 'Все', n: rows.length },
            { k: 'pub', t: 'Опубликованы', n: pub },
            { k: 'paused', t: 'Пауза', n: paus },
            { k: 'none', t: 'Без оффера', n: none },
            { k: 'attn', t: 'Внимание', n: attn }
        ];
        var chips = '<div id="fmx-netChips" class="fmx-hscroll" style="display:flex;gap:6px;padding-bottom:7px;margin:0 -2px 3px;cursor:grab;">' + chipDefs.map(function (c) {
            var on = _net.filter === c.k;
            var warn = c.k === 'attn' && c.n > 0;
            return '<button data-netchip="' + c.k + '" style="flex:0 0 auto;font-size:11.5px;font-family:inherit;cursor:pointer;border-radius:999px;padding:6px 11px;' +
                (on ? 'background:rgba(255,255,255,0.09);border:0.5px solid rgba(255,255,255,0.18);color:#e8e8ed;font-weight:700;'
                    : warn ? 'background:rgba(245,158,11,0.1);border:0.5px solid rgba(245,158,11,0.3);color:#f5bf4f;'
                        : 'background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);color:#8990a8;') +
                '"><span>' + c.t + '</span> <span class="num">' + c.n + '</span></button>';
        }).join('') + '</div>';
        var list = rows.filter(function (r) {
            if (_net.filter === 'pub') return r.l && r.l.status === 'published';
            if (_net.filter === 'paused') return r.l && r.l.status === 'paused';
            if (_net.filter === 'none') return !r.l && r.ch.username;
            if (_net.filter === 'attn') return !!netAttn(r.ch, r.l);
            return true;
        });
        var html = list.map(function (r) {
            var ch = r.ch, l = r.l, a = netAttn(ch, l);
            var live = l && (l.status === 'published' || l.status === 'paused');
            var checked = !!(l && _net.sel[l.id]);
            var reachV = (l && (l.ad_reach_24h || l.avg_views)) || ch.avg_views;
            var cpm = (l && l.base_price && reachV) ? Math.round(l.base_price / reachV * 1000) : null;
            var av = _net.mode
                ? '<span style="width:22px;height:22px;border-radius:7px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;' + (checked ? 'background:#6366f1;box-shadow:0 0 10px rgba(99,102,241,0.5);' : 'border:2px solid #4a4d61;') + '">' + (checked ? '<i class="ti ti-check" style="font-size:13px;color:#fff;"></i>' : '') + '</span>'
                : '<span style="position:relative;width:38px;height:38px;border-radius:12px;flex:0 0 38px;display:flex;align-items:center;justify-content:center;background:rgba(129,140,248,0.16);color:#818cf8;font-weight:800;font-size:15px;box-shadow:inset 0 0 0 0.5px rgba(255,255,255,0.1);overflow:hidden;">' + _esc((ch.title || ch.username || '?').charAt(0).toUpperCase()) +
                    (ch.avatar_url ? '<img data-netav src="' + _esc(mediaAbs(ch.avatar_url)) + '" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">' : '') + '</span>';
            var right;
            if (l) {
                right = '<span style="text-align:right;flex:0 0 auto;">' +
                    '<span class="num" style="display:block;font-size:13px;font-weight:800;">' + (l.base_price != null ? _num(l.base_price) + ' ₽' : '—') + '</span>' +
                    '<span class="num" style="display:block;font-size:10.5px;color:#8990a8;">' + netShort(reachV) + (cpm != null ? ' · CPM ' + _num(cpm) : '') + '</span></span>';
            } else if (ch.username) {
                right = '<button data-netmk="' + ch.id + '" style="flex:0 0 auto;font-size:11.5px;font-weight:700;font-family:inherit;cursor:pointer;color:#818cf8;background:rgba(129,140,248,0.12);border:0.5px solid rgba(129,140,248,0.3);border-radius:999px;padding:6px 12px;"><span>Создать</span></button>';
            } else {
                right = '<span style="font-size:10px;color:#565b73;flex:0 0 auto;max-width:92px;text-align:right;"><span>Нужен публичный @username</span></span>';
            }
            var dotC = !l ? '#60a5fa' : l.status === 'published' ? '#5DCAA5' : l.status === 'paused' ? '#565b73' : (l.status === 'rejected' || l.status === 'banned') ? '#ef4444' : '#f5bf4f';
            return '<div data-netrow="' + (l ? l.id : '') + '" data-netch="' + ch.id + '" style="display:flex;align-items:center;gap:10px;min-height:44px;background:' + (checked ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.03)') + ';border:0.5px solid ' + (checked ? 'rgba(129,140,248,0.4)' : a ? (a.lvl === 'r' ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.3)') : 'rgba(255,255,255,0.07)') + ';border-radius:14px;padding:9px 12px;margin-bottom:8px;' + (_net.mode && !live ? 'opacity:0.4;' : 'cursor:pointer;') + '">' +
                av +
                '<span style="flex:1;min-width:0;">' +
                '<span style="display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(ch.title || (ch.username ? '@' + ch.username : '')) + '</span>' +
                '<span class="num" style="display:block;font-size:11px;color:#8990a8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (ch.username ? '@' + _esc(ch.username) + ' · ' : '') + netShort(ch.subscribers) + '</span>' +
                (a ? '<span style="display:block;font-size:10.5px;color:' + (a.lvl === 'r' ? '#f87171' : '#f5bf4f') + ';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><span>' + a.text + '</span></span>' : '') +
                '</span>' + right +
                '<span style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:' + dotC + ';box-shadow:0 0 8px ' + dotC + '55;"></span></div>';
        }).join('');
        if (!html) html = '<div class="fmx-empty" style="padding:26px 0;"><i class="ti ti-inbox"></i><div><span>Здесь пока пусто</span></div></div>';
        var batchRunning = !!(_net.ov && _net.ov.batch && _net.ov.batch.status === 'running');
        var plate = '';
        if (batchRunning) {
            var bb = _net.ov.batch;
            plate = '<div id="fmx-nbPlate" style="display:flex;align-items:center;gap:10px;background:rgba(129,140,248,0.08);border:0.5px solid rgba(129,140,248,0.3);border-radius:14px;padding:11px 13px;margin-bottom:10px;cursor:pointer;">' +
                '<i class="ti ti-loader-2" style="color:#818cf8;font-size:16px;animation:fmxSpin 0.9s linear infinite;flex:0 0 auto;"></i>' +
                '<span style="flex:1;min-width:0;"><span style="display:block;font-size:12.5px;font-weight:700;">Создание офферов</span>' +
                '<span style="display:block;height:5px;border-radius:99px;background:rgba(255,255,255,0.06);margin-top:6px;overflow:hidden;"><i style="display:block;height:100%;width:' + Math.round(bb.done / Math.max(1, bb.total) * 100) + '%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:99px;"></i></span></span>' +
                '<span class="num" style="font-size:12px;color:#8990a8;flex:0 0 auto;">' + bb.done + ' / ' + bb.total + '</span></div>';
        }
        var elig = netEligible();
        var mkBtn = '';
        if (!_net.mode && elig.length && !batchRunning) {
            mkBtn = '<button id="fmx-nbStart" class="fmx-save" style="margin-top:4px;"><i class="ti ti-stack-2"></i> <span>Создать офферы</span> <span class="num">· ' + elig.length + '</span></button>';
        }
        body.innerHTML = plate + tiles + chips + html + mkBtn;
        var plEl = el('fmx-nbPlate');
        if (plEl) plEl.addEventListener('click', function () { nbOpen(); });
        var mkEl = el('fmx-nbStart');
        if (mkEl) mkEl.addEventListener('click', function () { nbOpen(); });
        qsa(body, '[data-netav]').forEach(function (im) {
            im.addEventListener('error', function () { im.remove(); });
        });
        var chRow = el('fmx-netChips');
        if (chRow) {
            var updFade = function () {
                var canL = chRow.scrollLeft > 2;
                var canR = chRow.scrollLeft < chRow.scrollWidth - chRow.clientWidth - 2;
                var m = 'linear-gradient(90deg,' + (canL ? 'transparent 0,#000 22px' : '#000 0') + ',' + (canR ? '#000 calc(100% - 26px),transparent 100%' : '#000 100%') + ')';
                chRow.style.webkitMaskImage = m;
                chRow.style.maskImage = m;
            };
            updFade();
            chRow.addEventListener('scroll', updFade, { passive: true });
            chRow.addEventListener('wheel', function (e) {
                var d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
                if (d && chRow.scrollWidth > chRow.clientWidth) { e.preventDefault(); chRow.scrollLeft += d; }
            }, { passive: false });
            var drag = { on: false, x: 0, sl: 0, moved: false };
            chRow.addEventListener('pointerdown', function (e) {
                if (e.pointerType !== 'mouse') return;
                drag.on = true; drag.x = e.clientX; drag.sl = chRow.scrollLeft; drag.moved = false;
            });
            chRow.addEventListener('pointermove', function (e) {
                if (!drag.on) return;
                var dx = e.clientX - drag.x;
                if (Math.abs(dx) > 5) drag.moved = true;
                if (drag.moved) chRow.scrollLeft = drag.sl - dx;
            });
            var endDrag = function () { drag.on = false; setTimeout(function () { drag.moved = false; }, 0); };
            chRow.addEventListener('pointerup', endDrag);
            chRow.addEventListener('pointerleave', endDrag);
            chRow.addEventListener('click', function (e) { if (drag.moved) { e.stopPropagation(); e.preventDefault(); } }, true);
        }
        var sub = el('fmx-netSub');
        if (sub) sub.innerHTML = _net.mode ? '<span>Выбрано:</span> <b class="num">' + netSelIds().length + '</b>' : '<span>Каналы, офферы и пакетные операции</span>';
        var ab = el('fmx-netAll');
        if (ab) {
            if (_net.mode) {
                var selectable = list.filter(function (r) { return r.l && (r.l.status === 'published' || r.l.status === 'paused'); });
                var allSel = selectable.length > 0 && selectable.every(function (r) { return _net.sel[r.l.id]; });
                ab.style.display = '';
                ab.innerHTML = allSel ? '<span>Сброс</span>' : '<span>Все</span>' + (selectable.length ? ' <b class="num" style="font-weight:800;">' + selectable.length + '</b>' : '');
                ab.onclick = function () {
                    _haptic('light');
                    if (allSel) _net.sel = {};
                    else selectable.forEach(function (r) { _net.sel[r.l.id] = true; });
                    netPaint();
                };
            } else { ab.style.display = 'none'; ab.onclick = null; }
        }
        qsa(body, '[data-netchip]').forEach(function (b) {
            b.addEventListener('click', function () { _haptic('light'); _net.filter = b.getAttribute('data-netchip'); netPaint(); });
        });
        qsa(body, '[data-netmk]').forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var bgEl = el('fmx-netBg'); if (bgEl) bgEl.remove();
                _haptic('light'); _mineEditCh = +b.getAttribute('data-netmk'); _backTo = 'mine'; setSubTab('create');
            });
        });
        qsa(body, '[data-netrow]').forEach(function (rowEl) {
            rowEl.addEventListener('click', function () {
                var lid = +rowEl.getAttribute('data-netrow') || 0;
                if (_net.mode) {
                    if (!lid) return;
                    var l = null;
                    for (var i = 0; i < _net.my.length; i++) { if (_net.my[i].id === lid) { l = _net.my[i]; break; } }
                    if (!l || (l.status !== 'published' && l.status !== 'paused')) return;
                    _haptic('light');
                    if (_net.sel[lid]) delete _net.sel[lid]; else _net.sel[lid] = true;
                    netPaint();
                    return;
                }
                if (!lid) return;
                var chId = +rowEl.getAttribute('data-netch') || 0;
                var bgEl = el('fmx-netBg'); if (bgEl) bgEl.remove();
                _haptic('light'); _mineEditCh = chId; _backTo = 'mine'; setSubTab('create');
            });
        });
        var bar = el('fmx-netBar');
        if (bar) {
            if (_net.mode) {
                var n = netSelIds().length;
                var dis = n === 0 ? 'opacity:0.45;pointer-events:none;' : '';
                bar.style.display = 'flex';
                bar.innerHTML =
                    '<button data-netact="price" style="' + dis + 'flex:1.3;font-family:inherit;cursor:pointer;font-size:12.5px;font-weight:700;border-radius:12px;padding:11px 4px;background:#6366f1;border:0.5px solid #6366f1;color:#fff;"><i class="ti ti-tag"></i> <span>Цены</span></button>' +
                    '<button data-netact="pause" style="' + dis + 'flex:1;font-family:inherit;cursor:pointer;font-size:12.5px;font-weight:700;border-radius:12px;padding:11px 4px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);color:#e8e8ed;"><i class="ti ti-player-pause"></i> <span>Пауза</span></button>' +
                    '<button data-netact="resume" style="' + dis + 'flex:1;font-family:inherit;cursor:pointer;font-size:12.5px;font-weight:700;border-radius:12px;padding:11px 4px;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);color:#e8e8ed;"><i class="ti ti-player-play"></i> <span>Возобновить</span></button>';
                qsa(bar, '[data-netact]').forEach(function (b) {
                    b.addEventListener('click', function () {
                        var ids = netSelIds(); if (!ids.length) return;
                        var act = b.getAttribute('data-netact');
                        if (act === 'price') netPriceSheet(ids);
                        else netState(ids, act);
                    });
                });
            } else { bar.style.display = 'none'; bar.innerHTML = ''; }
        }
    }

    var _NET_REASONS = {
        not_found: 'оффер не найден',
        moderation: 'на модерации',
        no_price: 'нет цены',
        currency: 'цены не в рублях',
        no_estimate: 'нет рекомендованной цены',
        no_change: 'без изменений',
        channel_gone: 'канал удалён',
        state: 'статус не подходит'
    };

    function netAfterApply() {
        _feed = null; _feedState = 'idle';
        _net.mode = false; _net.sel = {};
        var sb = el('fmx-netSel'); if (sb) sb.innerHTML = '<span>Выбрать</span>';
        var ab = el('fmx-netAll'); if (ab) ab.style.display = 'none';
        netReload();
        loadMyListings().then(function () { if (_subTab === 'mine') paintMine(); }).catch(function () {});
    }

    function netState(ids, action) {
        if (_net.busy) return;
        _net.busy = true;
        apiPost('/api/v1/marketplace/network/state', { ids: ids, action: action }).then(function (r) {
            _net.busy = false;
            if (!r || r.ok === false) { _haptic('error'); toast('Не удалось. Повтори попытку.', true); return; }
            _haptic('success');
            var m = (action === 'pause' ? 'Пауза: ' : 'Возобновлено: ') + r.applied;
            if (r.skipped && r.skipped.length) m += ' · ' + 'Пропущено: ' + r.skipped.length;
            toast(m);
            netAfterApply();
        }).catch(function () { _net.busy = false; _haptic('error'); toast('Не удалось. Повтори попытку.', true); });
    }

    function netPriceSheet(ids) {
        var old = el('fmx-netPr'); if (old) old.remove();
        var st = { op: 'plus', val: 10, ready: 0 };
        var bg = document.createElement('div'); bg.id = 'fmx-netPr'; bg.className = 'fmx-mbg fmx-show';
        bg.innerHTML = '<div class="fmx-modal">' +
            '<div class="fmx-mhead"><div style="flex:1;min-width:0;"><h2><i class="ti ti-tag" style="color:#5DCAA5;"></i> <span>Пакетные цены</span></h2><p><span>Выбрано:</span> <b class="num">' + ids.length + '</b></p></div>' +
            '<button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-mbody">' +
            '<div style="display:flex;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:12px;padding:3px;margin-bottom:10px;">' +
            '<button data-netop="plus" style="flex:1;font-family:inherit;cursor:pointer;font-size:12px;padding:9px 4px;border-radius:9px;border:0;background:transparent;color:#8990a8;"><span>Повысить</span></button>' +
            '<button data-netop="minus" style="flex:1;font-family:inherit;cursor:pointer;font-size:12px;padding:9px 4px;border-radius:9px;border:0;background:transparent;color:#8990a8;"><span>Снизить</span></button>' +
            '<button data-netop="suggested" style="flex:1;font-family:inherit;cursor:pointer;font-size:12px;padding:9px 4px;border-radius:9px;border:0;background:transparent;color:#8990a8;"><span>К рекомендованной</span></button>' +
            '</div>' +
            '<div id="fmx-netPrVal" style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
            '<span style="font-size:12px;color:#8990a8;"><span>Изменение, %</span></span>' +
            '<input id="fmx-netPct" type="number" min="1" max="50" value="10" inputmode="numeric" style="width:76px;font-family:inherit;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);border-radius:10px;color:#e8e8ed;font-size:14px;font-weight:700;padding:8px 10px;text-align:center;">' +
            '<span style="display:flex;gap:5px;">' + [5, 10, 15, 25].map(function (p) { return '<button data-netpct="' + p + '" class="num" style="font-family:inherit;cursor:pointer;font-size:11.5px;color:#a9aec0;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:999px;padding:6px 10px;">' + p + '%</button>'; }).join('') + '</span>' +
            '</div>' +
            '<div style="font-size:11px;color:#5DCAA5;background:rgba(93,202,165,0.08);border:0.5px solid rgba(93,202,165,0.22);border-radius:11px;padding:9px 11px;margin-bottom:10px;"><i class="ti ti-circle-check"></i> <span>Смена цены применяется сразу и не требует повторной модерации</span></div>' +
            '<div id="fmx-netPrev"></div>' +
            '</div>' +
            '<div style="padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:0.5px solid rgba(255,255,255,0.08);display:grid;gap:8px;">' +
            '<button class="fmx-save" id="fmx-netCalc"><i class="ti ti-calculator"></i> <span>Показать расчёт</span></button>' +
            '<button class="fmx-save" id="fmx-netGo" style="display:none;"></button>' +
            '</div></div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        bg.querySelector('[data-c]').addEventListener('click', function () { bg.remove(); });
        function paintOps() {
            qsa(bg, '[data-netop]').forEach(function (b) {
                var on = b.getAttribute('data-netop') === st.op;
                b.style.background = on ? 'rgba(129,140,248,0.15)' : 'transparent';
                b.style.color = on ? '#818cf8' : '#8990a8';
                b.style.fontWeight = on ? '700' : '400';
            });
            var vr = el('fmx-netPrVal');
            if (vr) vr.style.display = st.op === 'suggested' ? 'none' : 'flex';
            var go = el('fmx-netGo');
            if (go) go.style.display = 'none';
            st.ready = 0;
            var pv = el('fmx-netPrev'); if (pv) pv.innerHTML = '';
        }
        qsa(bg, '[data-netop]').forEach(function (b) {
            b.addEventListener('click', function () { _haptic('light'); st.op = b.getAttribute('data-netop'); paintOps(); });
        });
        qsa(bg, '[data-netpct]').forEach(function (b) {
            b.addEventListener('click', function () { _haptic('light'); var i = el('fmx-netPct'); if (i) i.value = b.getAttribute('data-netpct'); paintOps(); });
        });
        var pctIn = el('fmx-netPct');
        if (pctIn) pctIn.addEventListener('input', function () { paintOps(); });
        paintOps();
        function reqBody(dry) {
            var v = 0;
            if (st.op !== 'suggested') {
                v = Math.max(1, Math.min(50, parseInt((el('fmx-netPct') || {}).value, 10) || 0));
                if (st.op === 'minus') v = -v;
            }
            return { ids: ids, op: st.op === 'suggested' ? 'suggested' : 'pct', value: v, dry_run: !!dry };
        }
        el('fmx-netCalc').addEventListener('click', function () {
            if (_net.busy) return;
            var b = reqBody(true);
            if (b.op === 'pct' && !b.value) { toast('Укажи процент от 1 до 50', true); return; }
            _net.busy = true;
            apiPost('/api/v1/marketplace/network/prices', b).then(function (r) {
                _net.busy = false;
                var pv = el('fmx-netPrev'); if (!pv) return;
                if (!r || r.ok === false) { _haptic('error'); toast('Не удалось. Повтори попытку.', true); return; }
                var items = r.items || [], skipped = r.skipped || [];
                var hot = items.filter(function (it) { return it.hot_cleared; }).length;
                var html = items.map(function (it) {
                    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;padding:8px 11px;margin-bottom:6px;">' +
                        '<span style="font-size:12px;color:#a9aec0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(it.title || '') + '</span>' +
                        '<span class="num" style="font-size:12px;flex:0 0 auto;white-space:nowrap;"><s style="color:#565b73;">' + _num(it.old) + '</s> → <b style="color:#5DCAA5;">' + _num(it.new) + ' ₽</b></span></div>';
                }).join('');
                if (skipped.length) {
                    html += '<div style="font-size:11px;color:#8990a8;margin-top:8px;"><span>Пропущено:</span> <b class="num">' + skipped.length + '</b></div>' +
                        skipped.map(function (s) {
                            return '<div style="font-size:11px;color:#565b73;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(s.title || ('#' + s.id)) + ' — <span>' + (_NET_REASONS[s.reason] || s.reason) + '</span></div>';
                        }).join('');
                }
                if (hot) {
                    html = '<div style="font-size:11px;color:#f5bf4f;background:rgba(245,158,11,0.08);border:0.5px solid rgba(245,158,11,0.25);border-radius:11px;padding:9px 11px;margin-bottom:8px;"><i class="ti ti-alert-triangle"></i> <span>У части офферов действует горящая скидка — при смене цены она будет снята</span></div>' + html;
                }
                if (!items.length) {
                    html += '<div style="font-size:12px;color:#8990a8;text-align:center;padding:10px 0;"><span>Ничего не рассчитано — офферы пропущены</span></div>';
                }
                pv.innerHTML = html;
                st.ready = items.length;
                var go = el('fmx-netGo');
                if (go) {
                    go.style.display = items.length ? '' : 'none';
                    go.innerHTML = '<i class="ti ti-check"></i> <span>' + 'Применить к ' + items.length + '</span>';
                }
            }).catch(function () { _net.busy = false; _haptic('error'); toast('Не удалось. Повтори попытку.', true); });
        });
        el('fmx-netGo').addEventListener('click', function () {
            if (_net.busy || !st.ready) return;
            _net.busy = true;
            apiPost('/api/v1/marketplace/network/prices', reqBody(false)).then(function (r) {
                _net.busy = false;
                if (!r || r.ok === false) { _haptic('error'); toast('Не удалось. Повтори попытку.', true); return; }
                _haptic('success');
                toast('Цены обновлены: ' + (r.applied || 0));
                bg.remove();
                netAfterApply();
            }).catch(function () { _net.busy = false; _haptic('error'); toast('Не удалось. Повтори попытку.', true); });
        });
    }

    var _nb = { step: 1, sel: {}, text: '', ov: null, poll: null };

    function nbStop() {
        if (_nb.poll) { clearInterval(_nb.poll); _nb.poll = null; }
    }

    function nbClose() {
        nbStop();
        var bg = el('fmx-nbBg'); if (bg) bg.remove();
        if (el('fmx-netBody')) netReload();
    }

    function nbOpen() {
        _haptic('light');
        var old = el('fmx-nbBg'); if (old) old.remove();
        nbStop();
        _nb.step = 1; _nb.sel = {}; _nb.text = '';
        var bg = document.createElement('div'); bg.id = 'fmx-nbBg'; bg.className = 'fmx-mbg fmx-show';
        bg.innerHTML = '<div class="fmx-modal">' +
            '<div class="fmx-mhead"><div style="flex:1;min-width:0;"><h2 id="fmx-nbTtl"></h2><p id="fmx-nbStp"></p></div>' +
            '<button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-mbody" id="fmx-nbBody"><div class="fmx-empty" style="padding:36px 0;"><i class="ti ti-loader-2" style="animation:fmxSpin 0.9s linear infinite;"></i></div></div>' +
            '<div id="fmx-nbFoot" style="display:grid;gap:8px;padding:10px 14px calc(12px + env(safe-area-inset-bottom,0px));border-top:0.5px solid rgba(255,255,255,0.08);"></div></div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) nbClose(); });
        bg.querySelector('[data-c]').addEventListener('click', function () { nbClose(); });
        apiGet('/api/v1/marketplace/network/batch').then(function (r) {
            if (!el('fmx-nbBody')) return;
            _nb.ov = r && r.ok ? r : null;
            if (_nb.ov && _nb.ov.batch && _nb.ov.batch.status === 'running') { nbProgress(); nbPoll(); }
            else nbPaint();
        }).catch(function () {
            var b = el('fmx-nbBody');
            if (b) b.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.');
        });
    }

    function nbHead(step) {
        var t = el('fmx-nbTtl'), s = el('fmx-nbStp');
        if (t) t.innerHTML = '<i class="ti ti-stack-2" style="color:#818cf8;"></i> <span>' + (step ? 'Новые офферы' : 'Создание офферов') + '</span>';
        if (s) s.innerHTML = step ? '<span>' + (step === 1 ? 'Шаг 1 из 3' : step === 2 ? 'Шаг 2 из 3' : 'Шаг 3 из 3') + '</span>' : '';
    }

    function nbBar(step) {
        var h = '<div style="display:flex;gap:6px;margin-bottom:12px;">';
        for (var i = 1; i <= 3; i++) h += '<span style="flex:1;height:3px;border-radius:99px;background:' + (i <= step ? '#6366f1' : 'rgba(255,255,255,0.07)') + ';"></span>';
        return h + '</div>';
    }

    function nbLimits() {
        var ov = _nb.ov || {};
        var ll = (ov.listings_limit != null && ov.listings_used != null) ? Math.max(0, ov.listings_limit - ov.listings_used) : 50;
        var ml = (ov.mod_limit != null && ov.mod_used != null) ? Math.max(0, ov.mod_limit - ov.mod_used) : 10;
        return { listings: ll, mod: ml, max: Math.max(0, Math.min(ll, ml, 50)) };
    }

    function nbSelIds() {
        return Object.keys(_nb.sel).filter(function (k) { return _nb.sel[k]; }).map(Number);
    }

    function nbPaint() {
        var body = el('fmx-nbBody'), foot = el('fmx-nbFoot');
        if (!body || !foot) return;
        nbHead(_nb.step);
        var lim = nbLimits();
        if (_nb.step === 1) {
            var elig = netEligible();
            var rest = _net.ch.filter(function (ch) {
                return !netListingOf(ch) && !(ch.username && ch.bot_status === 'connected');
            });
            var n = nbSelIds().length;
            var over = n > lim.max;
            var rows = elig.map(function (ch) {
                var on = !!_nb.sel[ch.id];
                return '<div data-nbrow="' + ch.id + '" style="display:flex;align-items:center;gap:10px;min-height:44px;background:' + (on ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.03)') + ';border:0.5px solid ' + (on ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.07)') + ';border-radius:14px;padding:9px 12px;margin-bottom:8px;cursor:pointer;">' +
                    '<span style="width:22px;height:22px;border-radius:7px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;' + (on ? 'background:#6366f1;' : 'border:2px solid #4a4d61;') + '">' + (on ? '<i class="ti ti-check" style="font-size:13px;color:#fff;"></i>' : '') + '</span>' +
                    '<span style="flex:1;min-width:0;"><span style="display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(ch.title || '@' + ch.username) + '</span>' +
                    '<span class="num" style="display:block;font-size:11px;color:#8990a8;">@' + _esc(ch.username) + ' · ' + netShort(ch.subscribers) + '</span></span></div>';
            }).join('');
            rows += rest.map(function (ch) {
                var why = !ch.username ? 'Нужен публичный @username' : 'Бот не подключён к каналу';
                return '<div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);border-radius:14px;padding:9px 12px;margin-bottom:8px;opacity:0.42;">' +
                    '<span style="width:22px;height:22px;border-radius:7px;border:2px solid #4a4d61;flex:0 0 22px;"></span>' +
                    '<span style="flex:1;min-width:0;"><span style="display:block;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(ch.title || 'Канал') + '</span>' +
                    '<span style="display:block;font-size:10.5px;color:#565b73;"><span>' + why + '</span></span></span></div>';
            }).join('');
            body.innerHTML = nbBar(1) +
                '<div style="display:flex;gap:8px;font-size:12px;background:rgba(59,130,246,0.08);border:0.5px solid rgba(59,130,246,0.25);border-radius:11px;padding:9px 11px;margin-bottom:10px;color:#60a5fa;"><i class="ti ti-info-circle"></i> <span><span>Офферов свободно по тарифу:</span> <b class="num">' + lim.listings + '</b> · <span>Показаны каналы без оффера</span></span></div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
                '<span style="font-size:12px;color:#8990a8;"><span>Выбрано:</span> <b class="num" style="color:#e8e8ed;">' + n + '</b><span class="num"> / ' + elig.length + '</span></span>' +
                '<button id="fmx-nbAll" style="font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;color:#a9aec0;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.12);border-radius:999px;padding:6px 12px;"><span>' + (n >= Math.min(elig.length, lim.max) && n > 0 ? 'Сброс' : 'Все') + '</span>' + (n >= Math.min(elig.length, lim.max) && n > 0 ? '' : ' <b class="num">' + Math.min(elig.length, lim.max) + '</b>') + '</button></div>' +
                rows +
                (over ? '<div style="display:flex;gap:8px;font-size:12px;background:rgba(245,158,11,0.08);border:0.5px solid rgba(245,158,11,0.25);border-radius:11px;padding:9px 11px;color:#f5bf4f;"><i class="ti ti-alert-triangle"></i> <span><span>Доступно сейчас:</span> <b class="num">' + lim.max + '</b> · <span>сними лишние отметки</span></span></div>' : '');
            foot.innerHTML = '<button class="fmx-save" id="fmx-nbNext"' + (!n || over ? ' disabled style="opacity:0.5;"' : '') + '><span>Дальше</span>' + (n ? ' <span class="num">· ' + n + '</span>' : '') + '</button>';
            qsa(body, '[data-nbrow]').forEach(function (r) {
                r.addEventListener('click', function () {
                    var id = +r.getAttribute('data-nbrow');
                    _haptic('light');
                    if (_nb.sel[id]) delete _nb.sel[id]; else _nb.sel[id] = true;
                    nbPaint();
                });
            });
            var ab = el('fmx-nbAll');
            if (ab) ab.addEventListener('click', function () {
                _haptic('light');
                var full = nbSelIds().length >= Math.min(elig.length, lim.max) && nbSelIds().length > 0;
                _nb.sel = {};
                if (!full) elig.slice(0, lim.max).forEach(function (ch) { _nb.sel[ch.id] = true; });
                nbPaint();
            });
            var nx = el('fmx-nbNext');
            if (nx) nx.addEventListener('click', function () { if (!nbSelIds().length) return; _haptic('light'); _nb.step = 2; nbPaint(); });
        } else if (_nb.step === 2) {
            body.innerHTML = nbBar(2) +
                '<div style="display:flex;gap:8px;font-size:12px;background:rgba(93,202,165,0.08);border:0.5px solid rgba(93,202,165,0.22);border-radius:11px;padding:9px 11px;margin-bottom:12px;color:#5DCAA5;"><i class="ti ti-circle-check"></i> <span>Цены рассчитаются автоматически для каждого канала: охват и CPM ниши. После создания любую цену можно поменять на экране «Сетка» или в карточке.</span></div>' +
                '<div style="font-size:11px;color:#8990a8;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;"><span>Текст оффера · один на все каналы</span></div>' +
                '<textarea id="fmx-nbText" maxlength="400" style="width:100%;min-height:96px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.12);border-radius:12px;color:#e8e8ed;font-family:inherit;font-size:13px;padding:11px 12px;resize:vertical;">' + _esc(_nb.text) + '</textarea>' +
                '<div style="display:flex;gap:8px;font-size:12px;background:rgba(59,130,246,0.08);border:0.5px solid rgba(59,130,246,0.25);border-radius:11px;padding:9px 11px;margin-top:10px;color:#60a5fa;"><i class="ti ti-info-circle"></i> <span>Можно оставить пустым — текст возьмётся стандартный. Оформление у всех будет базовое: доведёшь позже в карточке любого оффера.</span></div>';
            foot.innerHTML = '<button class="fmx-save" id="fmx-nbNext"><span>Дальше</span></button>' +
                '<button class="fmx-btn" id="fmx-nbBack" style="width:100%;color:#8990a8;"><span>Назад</span></button>';
            el('fmx-nbNext').addEventListener('click', function () {
                _nb.text = (el('fmx-nbText') || {}).value || '';
                _haptic('light'); _nb.step = 3; nbPaint();
            });
            el('fmx-nbBack').addEventListener('click', function () {
                _nb.text = (el('fmx-nbText') || {}).value || '';
                _haptic('light'); _nb.step = 1; nbPaint();
            });
        } else {
            var cnt = nbSelIds().length;
            body.innerHTML = nbBar(3) +
                '<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px 14px;display:grid;gap:8px;margin-bottom:10px;">' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#8990a8;"><span>Каналов</span></span><b class="num">' + cnt + '</b></div>' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;gap:12px;"><span style="color:#8990a8;"><span>Цены</span></span><b style="text-align:right;"><span>автоматически · охват и CPM ниши</span></b></div>' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#8990a8;"><span>Текст</span></span><b><span>' + (_nb.text.trim() ? 'свой, один на все' : 'стандартный') + '</span></b></div>' +
                '<div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:#8990a8;"><span>На модерацию сегодня</span></span><b class="num">' + cnt + ' / ' + lim.mod + '</b></div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;font-size:12px;background:rgba(59,130,246,0.08);border:0.5px solid rgba(59,130,246,0.25);border-radius:11px;padding:9px 11px;color:#60a5fa;"><i class="ti ti-info-circle"></i> <span>Офферы создадутся сразу и уйдут на модерацию по очереди в фоне. Приложение можно закрыть — бот пришлёт итог.</span></div>';
            foot.innerHTML = '<button class="fmx-save" id="fmx-nbGo"><i class="ti ti-rocket"></i> <span>Создать офферы</span> <span class="num">· ' + cnt + '</span></button>' +
                '<button class="fmx-btn" id="fmx-nbBack" style="width:100%;color:#8990a8;"><span>Назад</span></button>';
            el('fmx-nbBack').addEventListener('click', function () { _haptic('light'); _nb.step = 2; nbPaint(); });
            el('fmx-nbGo').addEventListener('click', function () {
                var ids = nbSelIds(); if (!ids.length) return;
                var btn = el('fmx-nbGo'); btn.disabled = true; btn.style.opacity = '0.5';
                apiPost('/api/v1/marketplace/network/batch', { channel_ids: ids, custom_text: _nb.text.trim() || null }).then(function (r) {
                    if (!r || r.ok === false) {
                        btn.disabled = false; btn.style.opacity = '';
                        _haptic('error'); toast(r && r.error ? r.error : 'Не удалось. Повтори попытку.', true);
                        return;
                    }
                    _haptic('success');
                    _nb.ov = r;
                    nbProgress();
                    nbPoll();
                }).catch(function () {
                    btn.disabled = false; btn.style.opacity = '';
                    _haptic('error'); toast('Не удалось. Повтори попытку.', true);
                });
            });
        }
    }

    function nbPoll() {
        nbStop();
        _nb.poll = setInterval(function () {
            if (!el('fmx-nbBg')) { nbStop(); return; }
            apiGet('/api/v1/marketplace/network/batch').then(function (r) {
                if (!el('fmx-nbBg')) { nbStop(); return; }
                if (r && r.ok) {
                    _nb.ov = r;
                    nbProgress();
                    if (!r.batch || r.batch.status !== 'running') nbStop();
                }
            }).catch(function () {});
        }, 4000);
    }

    function nbProgress() {
        var body = el('fmx-nbBody'), foot = el('fmx-nbFoot');
        if (!body || !foot) return;
        nbHead(0);
        var b = (_nb.ov || {}).batch;
        if (!b) { body.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.'); return; }
        var c = b.counts || {};
        var running = b.status === 'running';
        var pubItems = (b.items || []).filter(function (it) { return it.status === 'published'; });
        var badItems = (b.items || []).filter(function (it) { return it.status === 'rejected' || it.status === 'failed'; });
        var revItems = (b.items || []).filter(function (it) { return it.status === 'review'; });
        var qN = (c.queued || 0) + (c.moderating || 0);
        function group(icon, iconStyle, title, n, sub, extra) {
            return '<div ' + (extra || '') + ' style="display:flex;align-items:flex-start;gap:10px;font-size:13px;background:rgba(255,255,255,0.03);border:0.5px solid ' + iconStyle.br + ';border-radius:12px;padding:10px 12px;margin-bottom:8px;' + (extra ? 'cursor:pointer;' : '') + '">' +
                '<span style="width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;flex:0 0 26px;background:' + iconStyle.bg + ';color:' + iconStyle.c + ';">' + icon + '</span>' +
                '<span style="flex:1;min-width:0;"><span style="display:block;font-weight:700;font-size:13px;"><span>' + title + '</span> <span class="num">— ' + n + '</span></span>' +
                (sub ? '<span style="display:block;font-size:11.5px;color:#8990a8;margin-top:2px;">' + sub + '</span>' : '') + '</span></div>';
        }
        var html = '<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px;margin-bottom:12px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;"><span><span>' + (running ? 'Модерация в фоне' : 'Готово') + '</span></span><b class="num">' + b.done + ' / ' + b.total + '</b></div>' +
            '<div style="height:8px;border-radius:99px;background:rgba(255,255,255,0.06);overflow:hidden;"><i style="display:block;height:100%;width:' + Math.round(b.done / Math.max(1, b.total) * 100) + '%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:99px;"></i></div></div>';
        if (pubItems.length) {
            var names = pubItems.slice(0, 3).map(function (it) { return _esc(it.title || ''); }).join(' · ');
            if (pubItems.length > 3) names += ' <span class="num">+' + (pubItems.length - 3) + '</span>';
            html += group('✓', { bg: 'rgba(16,185,129,0.15)', c: '#34d399', br: 'rgba(16,185,129,0.3)' }, 'Опубликовано', pubItems.length, names);
        }
        if (revItems.length) {
            html += group('👁', { bg: 'rgba(245,158,11,0.15)', c: '#fbbf24', br: 'rgba(245,158,11,0.3)' }, 'На ручной проверке', revItems.length, '<span>Проверим и опубликуем — обычно до суток</span>');
        }
        badItems.forEach(function (it) {
            html += group('✕', { bg: 'rgba(239,68,68,0.15)', c: '#f87171', br: 'rgba(239,68,68,0.35)' }, _esc(it.title || 'Канал'), 1,
                (it.reason ? _esc(it.reason) + ' · ' : '') + '<span>Открыть и исправить</span>', 'data-nbfix="' + it.channel_id + '"');
        });
        if (qN) {
            html += group('…', { bg: 'rgba(59,130,246,0.15)', c: '#60a5fa', br: 'rgba(59,130,246,0.3)' }, 'В очереди', qN, '');
        }
        html += '<div style="display:flex;gap:9px;align-items:flex-start;background:rgba(59,130,246,0.08);border:0.5px solid rgba(59,130,246,0.25);border-radius:12px;padding:10px 12px;font-size:12px;color:#60a5fa;margin-top:2px;">🤖 <span>Можно закрыть приложение — по завершении бот пришлёт итог: сколько опубликовано и что требует правок.</span></div>';
        body.innerHTML = html;
        qsa(body, '[data-nbfix]').forEach(function (r) {
            r.addEventListener('click', function () {
                var cid = +r.getAttribute('data-nbfix'); if (!cid) return;
                nbStop();
                var nbg = el('fmx-nbBg'); if (nbg) nbg.remove();
                var netbg = el('fmx-netBg'); if (netbg) netbg.remove();
                _haptic('light'); _mineEditCh = cid; _backTo = 'mine'; setSubTab('create');
            });
        });
        foot.innerHTML = '<button class="fmx-btn" id="fmx-nbToNet" style="width:100%;color:#a9aec0;"><i class="ti ti-sitemap"></i> <span>К экрану «Сетка»</span></button>';
        el('fmx-nbToNet').addEventListener('click', function () { _haptic('light'); nbClose(); });
    }

    function renderMine() {
        var sub = el('fmx-sub'); if (!sub) return;
        sub.innerHTML = loadHtml();
        Promise.all([loadChannels(), loadMyListings()]).then(function () {
            if (_subTab !== 'mine') return;
            if (!_myListings.length) { setSubTab('create', true); return; }
            paintMine();
        }).catch(function () {
            sub.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Проверь связь и повтори попытку.');
        });
    }

    function openOwnerCalendar(l) {
        var box = el('fmx-calBox'); if (!box) return;
        _ownerSelDay = null;
        var s = el('fmx-calSub'); if (s) s.textContent = '@' + (l.username || '') + (_ownerCalHot ? ' — выбери день и назначь скидку, покупатели увидят её жёлтой' : ' — отмечай занятые дни, покупатели увидят свободные');
        box.innerHTML = loadHtml();
        showModal('fmx-calBg');
        renderSlotsBox(l, box);
    }

    var NICHE_TAX = [
        ['Арбитраж · Нутра', [['Нутра — вся', 'нутра'], 'Похудение', 'Потенция', 'Суставы', 'Диабет', 'Зрение', 'Слух', ['Паразиты / детокс', 'Паразиты'], 'Гипертония', 'Простатит', 'Грибок', 'Варикоз', 'Геморрой', 'Омоложение', 'Иммунитет', 'БАДы / витамины', 'Спортпит', 'Кожа / волосы', 'Щитовидка / ЛОР']],
        ['Арбитраж · Гемблинг и беттинг', [['Гемблинг — весь', 'гемблинг'], ['Беттинг — весь', 'беттинг'], 'Онлайн-казино', 'Слоты', 'Краш-игры', 'Live-казино', 'Крипто-казино', 'Покер', 'Ставки на спорт', 'Прогнозы / каперы']],
        ['Арбитраж · Крипта и Web3', [['Крипта — вся', 'крипта'], 'Трейдинг', 'Сигналы / боты', 'Биржи / обменники', 'P2P', 'DeFi / стейкинг', 'NFT', 'Майнинг', ['Airdrop / launchpad', 'Airdrop'], 'Кошельки', 'Обучение трейдингу']],
        ['Арбитраж · Финансы и займы', [['Финансы — все', 'финансы'], 'Займы / МФО', 'Кредиты', 'Кредитные карты', 'Дебетовые карты', 'Ипотека', 'Автокредиты', 'Банкротство', 'Страхование', 'Кэшбэк', 'РКО']],
        ['Арбитраж · Трейдинг и инвест', ['Форекс', 'Брокеры / акции', 'Инвест-платформы', 'Копитрейдинг', 'ПАММ / ДУ']],
        ['Арбитраж · Товарка и e-commerce', [['Товарка — вся', 'товарка'], ['COD / наложенный платёж', 'COD'], 'Wow-товары', 'Одежда / обувь', 'Товары для дома', 'Реплики', 'Дропшиппинг', 'Маркетплейсы WB / Ozon', 'Обучение селлеров', 'Инструменты для продавцов', 'Скидки / промокоды']],
        ['Арбитраж · Дейтинг, adult, прочее', ['Дейтинг', 'Знакомства СНГ', 'Adult · вебкам', 'Adult · подписки / OnlyFans', 'Adult · секс-товары', 'Свипстейки / розыгрыши', 'Установки приложений / PWA', 'Мобильные игры', 'VPN / утилиты', 'Эссе / дипломы', 'Инфобизнес / заработок', 'MLM / сетевой']],
        ['Сервисы для арбитража', ['Сервисы для арбитража', 'Антидетект-браузеры', 'Прокси-сервисы', 'Трекеры / аналитика', 'Платёжки / антифрод', 'CPA-сети / партнёрки', 'Обмен / P2P-крипта']],
        ['Маркетинг и трафик', ['Арбитраж трафика', 'SMM / маркетинг', 'SMM / таргет', 'Контекстная реклама', 'Маркетинг / бренд', 'PR / реклама', 'Инфлюенс / блогеры', 'Копирайтинг', 'Медиабаинг', 'Лидген']],
        ['Бизнес и деньги', ['Бизнес', 'Недвижимость', 'Работа / вакансии', 'Фриланс / удалёнка', 'Стартапы', 'Продажи', 'Менеджмент', 'Личные финансы', 'Инвестиции', 'Заработок', 'Малый бизнес', 'Франшизы', 'Оптовая торговля']],
        ['IT и технологии', ['IT', 'Программирование', 'Нейросети / AI', 'Дизайн UX / UI', 'Кибербезопасность', 'Гаджеты / девайсы', 'Софт / приложения', 'Игры / гейминг', 'Киберспорт', 'Web3-разработка', 'No-code', 'DevOps', 'Data / ML']],
        ['Новости и общество', ['Новости', 'Политика', 'Экономика', 'Расследования', 'Региональные новости', 'Военное / СВО', 'Право / юриспруденция', 'Общество', 'Международные отношения', 'История']],
        ['Образование и развитие', ['Образование', 'Наука / научпоп', 'Языки / английский', 'Психология', 'Саморазвитие', 'Мотивация', 'Книги / литература', 'Цитаты', 'Философия', 'Продуктивность', 'Финграмотность']],
        ['Здоровье, спорт, ЗОЖ', ['Здоровье / медицина', 'Биохакинг и добавки', 'Ментальное здоровье', 'Фитнес', 'Питание / диетология', 'Спорт', 'Футбол', 'Хоккей', 'Баскетбол', 'Единоборства / ММА', 'Бег', 'Йога / медитация', 'Бодибилдинг']],
        ['Стиль жизни и красота', ['Мода / стиль', 'Красота / бьюти', 'Косметология', 'Лайфстайл / блог', 'Свадьбы / ивенты', 'Знаменитости', 'Лайфхаки', 'Люкс', 'Для женщин', 'Для мужчин']],
        ['Развлечения и медиа', ['Юмор / мемы', 'Кино / сериалы', 'Музыка', 'Аниме / манга', 'Видео / клипы', 'Подкасты', 'Афиша / события', 'Искусство', 'Фотография', 'Стикеры / гифки', 'Шок-контент']],
        ['Дом, хобби, увлечения', ['Путешествия / туризм', 'Кулинария / рецепты', 'Дом / интерьер', 'Ремонт / строительство', 'Сад / огород / дача', 'Растения', 'Рукоделие', 'Охота / рыбалка', 'Авто / мото', 'Транспорт', 'Коллекционирование', 'Настольные игры']],
        ['Люди и отношения', ['Отношения', 'Знакомства', 'Семья', 'Дети / родительство', 'Беременность / материнство', 'Питомцы / животные', 'Психология отношений']],
        ['Эзотерика и религия', [['Астрология / эзотерика', 'Астрология / эзотерика'], 'Астрология / гороскоп', 'Таро / гадания', 'Эзотерика', 'Религия', 'Духовность', 'Магия / ритуалы']],
        ['B2B и отрасли', ['Госзакупки / тендеры', 'HoReCa / общепит', 'Бухгалтерия / налоги', '1С / учёт', 'HR / подбор', 'Логистика / ВЭД', 'Промышленность', 'Строительство', 'Коммерческая недвижимость', 'Сельское хозяйство / агро', 'Энергетика', 'Медицина для врачей', 'Фармацевтика', 'IT-B2B / SaaS', 'Оптовые поставки', 'Оценка бизнеса / M&A']],
        ['Гео и релокация', ['Каналы по городам', 'Региональные', 'Каналы по странам', 'Диаспоры', 'Эмиграция / релокация', 'ВНЖ / гражданство', 'Недвижимость за рубежом', 'Жизнь за границей', 'Городские афиши', 'Барахолки / объявления']],
        ['Служебное', ['Каталоги каналов', 'Агрегаторы / переходники', 'Объявления / барахолка', 'Утилиты / сервисы', 'Прочее']]
    ];
    function _chipLM(c) { return (typeof c === 'string') ? { l: c, m: c } : { l: c[0], m: c[1] }; }
    function _nicheHit(sel, niche) {
        if (!sel || !niche) return false;
        var s = String(sel).toLowerCase().replace(/ё/g, 'е').trim();
        var n = String(niche).toLowerCase().replace(/ё/g, 'е').trim();
        if (s === n) return true;
        if (n.indexOf(s + ' · ') === 0) return true;
        if (s.indexOf(n + ' · ') === 0) return true;
        return s.split(' · ').pop() === n.split(' · ').pop();
    }
    function _nicheCounts(arr) {
        var uniq = {};
        (arr || []).forEach(function (l) { var nn = l.niche && String(l.niche).trim(); if (nn) uniq[nn] = (uniq[nn] || 0) + 1; });
        var keys = Object.keys(uniq);
        return function countFor(match) {
            var total = 0;
            for (var i = 0; i < keys.length; i++) if (_nicheHit(match, keys[i])) total += uniq[keys[i]];
            return total;
        };
    }
    function openNichePick(onPick) {
        var arr = (_mainTab === 'catalog' ? _catalog : _feed) || [];
        var countFor = _nicheCounts(arr);
        var _taxSet = {};
        NICHE_TAX.forEach(function (g) { g[1].forEach(function (c) { _taxSet[String(_chipLM(c).m).toLowerCase().replace(/ё/g, 'е')] = 1; }); });
        var _extra = {};
        (arr || []).forEach(function (l) {
            var nn = l.niche && String(l.niche).trim(); if (!nn) return;
            var key = nn.toLowerCase().replace(/ё/g, 'е');
            var covered = !!_taxSet[key];
            if (!covered) { for (var t in _taxSet) { if (key.indexOf(t + ' · ') === 0) { covered = true; break; } } }
            if (!covered) _extra[nn] = (_extra[nn] || 0) + 1;
        });
        var _extraNiches = Object.keys(_extra).sort(function (a, b) { return _extra[b] - _extra[a]; });
        var old = el('fmx-npBg'); if (old) old.remove();
        var bg = document.createElement('div');
        bg.id = 'fmx-npBg'; bg.className = 'fmx-cfm solid';
        bg.innerHTML = '<div class="fmx-cfm-box" style="left:50%;transform:translateX(-50%);margin-left:0;width:calc(100vw - 20px);max-width:520px;">' +
            '<div class="fmx-cfm-t" style="margin-bottom:10px;"><i class="ti ti-list-search" style="color:#818cf8;"></i> Ниши</div>' +
            '<div class="fmx-search" style="margin-bottom:10px;"><i class="ti ti-search"></i><input id="fmx-nq" placeholder="Найти нишу — «нутра», «тендер», «казино»…"></div>' +
            '<div id="fmx-nlist" style="max-height:56vh;overflow-y:auto;margin:0 -4px;padding:0 4px;"></div>' +
            '<div class="fmx-cfm-r" style="margin-top:12px;gap:8px;">' + ((_nicheSel && !onPick) ? '<button class="fmx-btn" data-clear>Сбросить фильтр</button>' : '') + '<button class="fmx-btn" data-no>Закрыть</button></div></div>';
        document.body.appendChild(bg);
        function done() { bg.remove(); }
        function pick(m) {
            done(); _haptic('light');
            if (onPick) { onPick(m); return; }
            _nicheSel = m; _sort = 'niche';
            if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
        }
        function draw(q) {
            q = (q || '').toLowerCase().replace(/ё/g, 'е').trim();
            var html = '', hits = 0;
            NICHE_TAX.forEach(function (g) {
                var chips = g[1].map(_chipLM).filter(function (c) { return !q || c.l.toLowerCase().replace(/ё/g, 'е').indexOf(q) >= 0 || g[0].toLowerCase().indexOf(q) >= 0; });
                if (!chips.length) return;
                hits += chips.length;
                html += '<div class="fmx-npg">' + _esc(g[0]) + '</div><div class="fmx-fxw">' + chips.map(function (c) {
                    var n = countFor(c.m), sel = (!onPick && _nicheSel && String(_nicheSel).toLowerCase() === String(c.m).toLowerCase());
                    return '<button class="fmx-fx' + (sel ? ' on' : '') + '" data-m="' + _esc(c.m) + '">' + _esc(c.l) + (n ? '<span class="fmx-npn">' + n + '</span>' : '') + '</button>';
                }).join('') + '</div>';
            });
            var _ex = _extraNiches.filter(function (nm) { return !q || nm.toLowerCase().replace(/ё/g, 'е').indexOf(q) >= 0; });
            if (_ex.length) {
                hits += _ex.length;
                html += '<div class="fmx-npg">Найдено в каталоге</div><div class="fmx-fxw">' + _ex.map(function (nm) {
                    var n = countFor(nm), sel = (!onPick && _nicheSel && String(_nicheSel).toLowerCase() === String(nm).toLowerCase());
                    return '<button class="fmx-fx' + (sel ? ' on' : '') + '" data-m="' + _esc(nm) + '">' + _esc(nm) + (n ? '<span class="fmx-npn">' + n + '</span>' : '') + '</button>';
                }).join('') + '</div>';
            }
            var box = el('fmx-nlist'); if (box) box.innerHTML = hits ? html : '<div style="color:#565b73;font-size:12.5px;text-align:center;padding:22px 4px;">Ничего не нашлось. Попробуй другое слово.</div>';
            qsa(bg, '[data-m]').forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-m')); }); });
        }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        bg.querySelector('[data-no]').addEventListener('click', done);
        var cl = bg.querySelector('[data-clear]'); if (cl) cl.addEventListener('click', function () { _nicheSel = null; _sort = 'all'; done(); if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy(); });
        var inp = bg.querySelector('#fmx-nq'); if (inp) inp.addEventListener('input', function () { draw(inp.value); });
        draw('');
    }

    var _regionAll = false, _regionFb = false, _regionFbBase = null, _regionNote = false;
    try { _regionAll = localStorage.getItem('fm_region_all') === '1'; } catch (e) {}
    var _CIS_UI = { ru: 1, be: 1, kk: 1, uz: 1, az: 1 };
    var _CIS_LANGS = { ru: 1, uk: 1, be: 1, kk: 1, uz: 1 };
    function _uiSeg() { try { return _CIS_UI[window.getLang ? getLang() : 'ru'] ? 'cis' : 'intl'; } catch (e) { return 'cis'; } }
    function _segPass(l) { var lc = l.lang_code || null; return _uiSeg() === 'cis' ? (lc == null || !!_CIS_LANGS[lc]) : (lc != null && !_CIS_LANGS[lc]); }
    function _regionChipHtml() { return '<button class="fmx-seg' + (_regionAll ? '' : ' on') + '" data-region style="flex:0 0 auto;"><i class="ti ti-world"></i> <span>' + (_regionAll ? 'Все регионы' : 'Мой регион') + '</span></button>'; }
    function _regionNoteHtml() { return '<div class="fmx-note"><i class="ti ti-world"></i> <span>В твоём регионе площадок пока немного — показаны все регионы.</span></div>'; }
    function _bindRegionChip(scope, after) {
        var rc = scope.querySelector('[data-region]');
        if (!rc) return;
        rc.addEventListener('click', function () {
            _regionAll = !_regionAll; _regionFb = false; _regionFbBase = null; _haptic('light');
            try { localStorage.setItem('fm_region_all', _regionAll ? '1' : '0'); } catch (e) {}
            rc.classList.toggle('on', !_regionAll);
            var sp = rc.querySelector('span'); if (sp) sp.textContent = _regionAll ? 'Все регионы' : 'Мой регион';
            after();
        });
    }
    var _rf = { presets: {}, aud: {}, geo: {}, mn: {}, mx: {} };
    function _rfCount() {
        return Object.keys(_rf.presets).filter(function (k) { return _rf.presets[k]; }).length
            + Object.keys(_rf.aud).filter(function (k) { return _rf.aud[k]; }).length
            + Object.keys(_rf.mn).filter(function (k) { return _rf.mn[k] != null; }).length
            + Object.keys(_rf.mx).filter(function (k) { return _rf.mx[k] != null; }).length;
    }
    function _rfPass(l) {
        var P = _rf.presets;
        if (P.large && !(l.subscribers >= 100000)) return false;
        if (P.alive && l.activity !== 'high' && l.activity !== 'mid') return false;
        if (P.clean && l.antifraud !== 'clean') return false;
        if (P.grow && l.trend !== 'growing') return false;
        var av = Object.keys(_rf.aud).filter(function (k) { return _rf.aud[k]; });
        if (av.length && av.indexOf(l.audience) < 0) return false;
        var _nowSec = Date.now() / 1000;
        var map = { s: l.subscribers, p: l.price_low, r: l.avg_views,
            err: (l.reach_rate != null ? l.reach_rate : l.er), er: l.engagement_percent,
            cpm: _cpm(l), h: l.health_score,
            age: (l.channel_created_ts ? Math.round((_nowSec - l.channel_created_ts) / 2629800) : null),
            adp: (l.ad_density != null ? Math.round(l.ad_density * 100) : null) };
        var _gsel = [];
        for (var gk in (_rf.geo || {})) { if (_rf.geo[gk]) _gsel.push(gk); }
        if (_gsel.length && _gsel.indexOf(l.geo) < 0) return false;
        var k;
        for (k in _rf.mn) { if (_rf.mn[k] != null && (map[k] == null || map[k] < _rf.mn[k])) return false; }
        for (k in _rf.mx) { if (_rf.mx[k] != null && (map[k] == null || map[k] > _rf.mx[k])) return false; }
        return true;
    }
    var _RF_PRESETS = [['large', 'Только крупные 100k+'], ['alive', 'Активные'], ['clean', 'Прошли фрод-контроль'], ['grow', 'Растут']];
    var _RF_RANGES = [['s', 'Подписчики'], ['p', 'Цена поста, ₽'], ['r', 'Охват'], ['err', 'ERR, %'], ['er', 'ER, %'], ['cpm', 'CPM, ₽'], ['h', 'Индекс'], ['age', 'Возраст, мес'], ['adp', 'Реклама, %']];
    var _RF_AUD = [['male', 'Мужская'], ['female', 'Женская'], ['mixed', 'Смешанная']];
    var _GEO_NAMES = { ru: 'Россия', ua: 'Украина', by: 'Беларусь', kz: 'Казахстан', uz: 'Узбекистан', kg: 'Киргизия', az: 'Азербайджан', ge: 'Грузия', am: 'Армения', us: 'США', gb: 'Великобритания', de: 'Германия', at: 'Австрия', ch: 'Швейцария', es: 'Испания', mx: 'Мексика', ar: 'Аргентина', br: 'Бразилия', pt: 'Португалия', fr: 'Франция', it: 'Италия', tr: 'Турция', ae: 'ОАЭ', sa: 'Саудовская Аравия', eg: 'Египет', ir: 'Иран', tj: 'Таджикистан', 'in': 'Индия', bd: 'Бангладеш', id: 'Индонезия', vn: 'Вьетнам', et: 'Эфиопия', tz: 'Танзания', ke: 'Кения', int: 'Международный' };
    var _gflw = function (inner) { return '<svg viewBox="0 0 24 18" preserveAspectRatio="none" style="width:22px;height:16px;border-radius:3px;display:block;">' + inner + '</svg>'; };
    var _GEO_FLAGS = {
        ru: _gflw('<rect width="24" height="6" fill="#fff"/><rect y="6" width="24" height="6" fill="#0039A6"/><rect y="12" width="24" height="6" fill="#D52B1E"/>'),
        ua: _gflw('<rect width="24" height="9" fill="#005BBB"/><rect y="9" width="24" height="9" fill="#FFD500"/>'),
        by: _gflw('<rect width="24" height="12" fill="#CE1720"/><rect y="12" width="24" height="6" fill="#007C30"/><rect width="3" height="18" fill="#fff"/>'),
        kz: _gflw('<rect width="24" height="18" fill="#00AFCA"/><circle cx="12" cy="8" r="3.4" fill="#FEC50C"/><rect x="7" y="14" width="10" height="1.4" fill="#FEC50C"/>'),
        uz: _gflw('<rect width="24" height="6" fill="#0099B5"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#1EB53A"/><rect y="5.3" width="24" height="0.7" fill="#CE1126"/><rect y="12" width="24" height="0.7" fill="#CE1126"/>'),
        kg: _gflw('<rect width="24" height="18" fill="#E8112D"/><circle cx="12" cy="9" r="4" fill="#FFEF00"/><circle cx="12" cy="9" r="2" fill="#E8112D"/>'),
        az: _gflw('<rect width="24" height="6" fill="#0092BC"/><rect y="6" width="24" height="6" fill="#EF3340"/><rect y="12" width="24" height="6" fill="#509E2F"/><circle cx="11.5" cy="9" r="2.6" fill="#fff"/><circle cx="12.4" cy="9" r="2.2" fill="#EF3340"/>'),
        ge: _gflw('<rect width="24" height="18" fill="#fff"/><rect x="10" width="4" height="18" fill="#F00"/><rect y="7" width="24" height="4" fill="#F00"/>'),
        am: _gflw('<rect width="24" height="6" fill="#D90012"/><rect y="6" width="24" height="6" fill="#0033A0"/><rect y="12" width="24" height="6" fill="#F2A800"/>'),
        tj: _gflw('<rect width="24" height="5" fill="#C00"/><rect y="5" width="24" height="8" fill="#fff"/><rect y="13" width="24" height="5" fill="#060"/><circle cx="12" cy="9" r="1.8" fill="#F8C300"/>'),
        tr: _gflw('<rect width="24" height="18" fill="#E30A17"/><circle cx="10" cy="9" r="4" fill="#fff"/><circle cx="11.2" cy="9" r="3.2" fill="#E30A17"/><polygon points="15.6,9 18.4,9.9 16.7,7.5 16.7,10.5 18.4,8.1" fill="#fff"/>'),
        ae: _gflw('<rect width="24" height="6" fill="#00732F"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#000"/><rect width="7" height="18" fill="#F00"/>'),
        sa: _gflw('<rect width="24" height="18" fill="#165d31"/><rect x="4" y="7" width="16" height="1.6" fill="#fff"/><rect x="4" y="10.4" width="12" height="1.2" fill="#fff"/>'),
        eg: _gflw('<rect width="24" height="6" fill="#CE1126"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#000"/><circle cx="12" cy="9" r="1.8" fill="#C09300"/>'),
        ir: _gflw('<rect width="24" height="6" fill="#239F40"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#DA0000"/><circle cx="12" cy="9" r="1.8" fill="none" stroke="#DA0000" stroke-width="0.9"/>'),
        'in': _gflw('<rect width="24" height="6" fill="#FF9933"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#138808"/><circle cx="12" cy="9" r="2.2" fill="none" stroke="#000080" stroke-width="0.8"/>'),
        bd: _gflw('<rect width="24" height="18" fill="#006A4E"/><circle cx="10.5" cy="9" r="4.4" fill="#F42A41"/>'),
        id: _gflw('<rect width="24" height="9" fill="#CE1126"/><rect y="9" width="24" height="9" fill="#fff"/>'),
        vn: _gflw('<rect width="24" height="18" fill="#DA251D"/><polygon points="12,4.6 13.4,8.4 17.4,8.4 14.2,10.8 15.4,14.6 12,12.3 8.6,14.6 9.8,10.8 6.6,8.4 10.6,8.4" fill="#FFFF00"/>'),
        us: _gflw('<rect width="24" height="18" fill="#B22234"/><g fill="#fff"><rect y="2.6" width="24" height="1.4"/><rect y="5.4" width="24" height="1.4"/><rect y="8.2" width="24" height="1.4"/><rect y="11" width="24" height="1.4"/><rect y="13.8" width="24" height="1.4"/><rect y="16.6" width="24" height="1.4"/></g><rect width="10" height="9" fill="#3C3B6E"/>'),
        gb: _gflw('<rect width="24" height="18" fill="#012169"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#fff" stroke-width="3.6"/><path d="M0,0 L24,18 M24,0 L0,18" stroke="#C8102E" stroke-width="1.6"/><rect x="9.5" width="5" height="18" fill="#fff"/><rect y="6.5" width="24" height="5" fill="#fff"/><rect x="10.5" width="3" height="18" fill="#C8102E"/><rect y="7.5" width="24" height="3" fill="#C8102E"/>'),
        de: _gflw('<rect width="24" height="6" fill="#000"/><rect y="6" width="24" height="6" fill="#DD0000"/><rect y="12" width="24" height="6" fill="#FFCE00"/>'),
        at: _gflw('<rect width="24" height="6" fill="#ED2939"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#ED2939"/>'),
        ch: _gflw('<rect width="24" height="18" fill="#D52B1E"/><rect x="10" y="4" width="4" height="10" fill="#fff"/><rect x="7" y="7" width="10" height="4" fill="#fff"/>'),
        fr: _gflw('<rect width="8" height="18" fill="#0055A4"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#EF4135"/>'),
        it: _gflw('<rect width="8" height="18" fill="#009246"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#CE2B37"/>'),
        es: _gflw('<rect width="24" height="18" fill="#AA151B"/><rect y="4.5" width="24" height="9" fill="#F1BF00"/>'),
        pt: _gflw('<rect width="9" height="18" fill="#060"/><rect x="9" width="15" height="18" fill="#F00"/><circle cx="9" cy="9" r="3" fill="#FF0"/>'),
        br: _gflw('<rect width="24" height="18" fill="#009B3A"/><polygon points="12,2.5 21.5,9 12,15.5 2.5,9" fill="#FEDF00"/><circle cx="12" cy="9" r="3.4" fill="#002776"/>'),
        mx: _gflw('<rect width="8" height="18" fill="#006847"/><rect x="8" width="8" height="18" fill="#fff"/><rect x="16" width="8" height="18" fill="#CE1126"/><circle cx="12" cy="9" r="2" fill="#8a6d3b"/>'),
        ar: _gflw('<rect width="24" height="6" fill="#74ACDF"/><rect y="6" width="24" height="6" fill="#fff"/><rect y="12" width="24" height="6" fill="#74ACDF"/><circle cx="12" cy="9" r="1.8" fill="#F6B40E"/>'),
        et: _gflw('<rect width="24" height="6" fill="#078930"/><rect y="6" width="24" height="6" fill="#FCDD09"/><rect y="12" width="24" height="6" fill="#DA121A"/><circle cx="12" cy="9" r="3.4" fill="#0F47AF"/><polygon points="12,6.6 12.7,8.4 14.6,8.4 13.1,9.6 13.7,11.4 12,10.3 10.3,11.4 10.9,9.6 9.4,8.4 11.3,8.4" fill="#FCDD09"/>'),
        tz: _gflw('<rect width="24" height="18" fill="#1EB53A"/><polygon points="0,18 24,0 24,18" fill="#00A3DD"/><polygon points="0,18 0,13 17,0 24,0 24,5 7,18" fill="#000"/><polygon points="0,13 0,11.6 15.4,0 17,0" fill="#FCD116"/><polygon points="7,18 8.6,18 24,6.4 24,5" fill="#FCD116"/>'),
        ke: _gflw('<rect width="24" height="5" fill="#000"/><rect y="5" width="24" height="1.4" fill="#fff"/><rect y="6.4" width="24" height="5.2" fill="#B00"/><rect y="11.6" width="24" height="1.4" fill="#fff"/><rect y="13" width="24" height="5" fill="#060"/>'),
        int: _gflw('<rect width="24" height="18" fill="#1c2340"/><circle cx="12" cy="9" r="6" fill="none" stroke="#818cf8" stroke-width="1.2"/><ellipse cx="12" cy="9" rx="2.6" ry="6" fill="none" stroke="#818cf8" stroke-width="0.9"/><path d="M6 9h12M7.6 5.6h8.8M7.6 12.4h8.8" stroke="#818cf8" stroke-width="0.9" fill="none"/>'),
    };
    function _geoFlag(cc) {
        return _GEO_FLAGS[cc] || _GEO_FLAGS.int;
    }
    var _RF_GEO = [['ru', 'Россия'], ['kz', 'Казахстан'], ['by', 'Беларусь'], ['ua', 'Украина'], ['uz', 'Узбекистан'], ['kg', 'Киргизия'], ['az', 'Азербайджан'], ['ge', 'Грузия'], ['am', 'Армения'], ['tj', 'Таджикистан'], ['tr', 'Турция'], ['ae', 'ОАЭ'], ['sa', 'Саудовская Аравия'], ['eg', 'Египет'], ['ir', 'Иран'], ['in', 'Индия'], ['bd', 'Бангладеш'], ['id', 'Индонезия'], ['vn', 'Вьетнам'], ['us', 'США'], ['gb', 'Великобритания'], ['de', 'Германия'], ['at', 'Австрия'], ['ch', 'Швейцария'], ['fr', 'Франция'], ['it', 'Италия'], ['es', 'Испания'], ['pt', 'Португалия'], ['br', 'Бразилия'], ['mx', 'Мексика'], ['ar', 'Аргентина'], ['et', 'Эфиопия'], ['tz', 'Танзания'], ['ke', 'Кения'], ['int', 'Международный']];
    function _rfBtnLabel() {
        var b = el('fmx-rfbtn'); if (!b) return;
        var n = _rfCount();
        b.innerHTML = '<i class="ti ti-adjustments-horizontal"></i> Фильтры' + (n ? ' · ' + n : '');
        b.classList.toggle('on', n > 0);
    }
    function openRadarFilters() {
        _haptic('light');
        var old = el('fmx-rfBg'); if (old) old.remove();
        var bg = document.createElement('div'); bg.id = 'fmx-rfBg'; bg.className = 'fmx-cfm solid';
        var rows = _RF_RANGES.map(function (r) {
            var mn = _rf.mn[r[0]] != null ? _rf.mn[r[0]] : '', mx = _rf.mx[r[0]] != null ? _rf.mx[r[0]] : '';
            var i2 = '<input class="fmx-inp" type="number" inputmode="numeric" min="0" placeholder="до" value="' + mx + '" data-mx="' + r[0] + '">';
            return '<div class="fmx-bfcell"><span class="fmx-lbl">' + r[1] + '</span><div class="fmx-bfrow"><input class="fmx-inp" type="number" inputmode="numeric" min="0" placeholder="от" value="' + mn + '" data-mn="' + r[0] + '">' + i2 + '</div></div>';
        }).join('');
        bg.innerHTML = '<div class="fmx-cfm-box fmx-bf-compact" style="left:50%;transform:translateX(-50%);margin-left:0;width:calc(100vw - 20px);max-width:480px;bottom:12px;">' +
            '<div class="fmx-cfm-t" style="margin-bottom:10px;display:flex;align-items:center;gap:8px;"><i class="ti ti-adjustments-horizontal" style="color:#818cf8;"></i> Фильтры' +
            '<button id="fmx-rf-x" style="margin-left:auto;width:40px;height:40px;border-radius:11px;border:0.5px solid rgba(255,255,255,0.12);background:transparent;color:#8990a8;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;"><i class="ti ti-x"></i></button></div>' +
            '<span class="fmx-lbl">Быстро</span><div class="fmx-fxw" id="fmx-rf-pre">' + _RF_PRESETS.map(function (p) { return '<button class="fmx-fx' + (_rf.presets[p[0]] ? ' on' : '') + '" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
            (function () {
                var selN = 0;
                for (var gk in (_rf.geo || {})) { if (_rf.geo[gk]) selN++; }
                var rows = _RF_GEO.map(function (g) {
                    var on = !!(_rf.geo && _rf.geo[g[0]]);
                    return '<div class="fmx-georow' + (on ? ' on' : '') + '" data-g="' + g[0] + '">' +
                        '<span class="gf">' + _geoFlag(g[0]) + '</span>' +
                        '<span class="gc num">' + (g[0] === 'int' ? 'INT' : g[0].toUpperCase()) + '</span>' +
                        '<span class="gn">' + g[1] + '</span>' +
                        '<span class="gk"><i class="ti ti-check"></i></span></div>';
                }).join('');
                return '<details class="fmr-more" style="margin-top:12px;"' + (selN ? ' open' : '') + '><summary><i class="ti ti-world" style="color:#818cf8;"></i> <span>Страна аудитории</span>' +
                    (selN ? ' <b class="num" style="color:#818cf8;">· ' + selN + '</b>' : '') +
                    '<i class="ti ti-chevron-down chev"></i></summary>' +
                    '<div class="fmr-morebody" id="fmx-rf-geo" style="display:grid;gap:6px;">' + rows + '</div></details>';
            })() +
            '<span class="fmx-lbl fmx-mt2">Точная настройка — от / до</span><div class="fmx-bfgrid" style="margin-top:6px;">' + rows + '</div>' +
            '<div class="fmx-cfm-r" style="margin-top:14px;"><button class="fmx-btn" data-reset>Сбросить</button><button class="fmx-btn" data-apply style="background:#818cf8;color:#0a0d18;border-color:transparent;font-weight:700;">Применить</button></div></div>';
        document.body.appendChild(bg);
        function upd() { var c = el('fmx-rf-cnt'); if (c) c.textContent = 'Показать ' + (_catalog || []).filter(_rfPass).length; }
        function done() { bg.remove(); _rfBtnLabel(); paintCatalogBody(); }
        bg.addEventListener('click', function (e) { if (e.target === bg) done(); });
        el('fmx-rf-x').addEventListener('click', done);
        qsa(bg, '#fmx-rf-pre [data-p]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-p'); _rf.presets[k] = !_rf.presets[k]; b.classList.toggle('on', _rf.presets[k]); upd(); }); });
        qsa(bg, '#fmx-rf-aud [data-a]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-a'); _rf.aud[k] = !_rf.aud[k]; b.classList.toggle('on', _rf.aud[k]); upd(); }); });
        qsa(bg, '#fmx-rf-geo [data-g]').forEach(function (b) { b.addEventListener('click', function () { if (!_rf.geo) _rf.geo = {}; var k = b.getAttribute('data-g'); _rf.geo[k] = !_rf.geo[k]; b.classList.toggle('on', _rf.geo[k]); upd(); }); });
        qsa(bg, '[data-mn]').forEach(function (i) { i.addEventListener('input', function () { var v = i.value.trim(); _rf.mn[i.getAttribute('data-mn')] = v === '' ? null : +v; upd(); }); });
        qsa(bg, '[data-mx]').forEach(function (i) { i.addEventListener('input', function () { var v = i.value.trim(); _rf.mx[i.getAttribute('data-mx')] = v === '' ? null : +v; upd(); }); });
        bg.querySelector('[data-reset]').addEventListener('click', function () { _rf = { presets: {}, aud: {}, geo: {}, mn: {}, mx: {} }; qsa(bg, '.fmx-fx.on').forEach(function (x) { x.classList.remove('on'); }); qsa(bg, '.fmx-inp').forEach(function (x) { x.value = ''; }); upd(); });
        bg.querySelector('[data-apply]').addEventListener('click', done);
        upd();
    }

    var REP_REASONS = [['scam', 'Скам / обман'], ['fake_metrics', 'Накрутка метрик'], ['illegal', 'Запрещённый контент'], ['other', 'Другое']];
    function openComplaint(target) {
        var chips = REP_REASONS.map(function (r, i) { return '<button class="fmx-fx' + (i === 0 ? ' on' : '') + '" data-rr="' + r[0] + '">' + r[1] + '</button>'; }).join('');
        el('fmx-repBody').innerHTML =
            '<span class="fmx-lbl">Причина</span><div class="fmx-fxw" id="fmx-rep-r">' + chips + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Комментарий <span style="color:#565b73;text-transform:none;">(для «Другое» — обязателен)</span></span>' +
            '<textarea class="fmx-inp" id="fmx-rep-c" rows="3" maxlength="300" placeholder="Опиши проблему. Чем конкретнее — тем быстрее разберём."></textarea>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">Жалобы анонимны для владельца. Несколько жалоб от разных людей скрывают цель до ручной проверки.</div>' +
            '<button class="fmx-save" id="fmx-rep-send" style="margin-top:14px;"><i class="ti ti-flag"></i> Отправить жалобу</button>';
        var sel = { v: 'scam' };
        qsa(el('fmx-rep-r'), '[data-rr]').forEach(function (b) { b.addEventListener('click', function () { sel.v = b.getAttribute('data-rr'); qsa(el('fmx-rep-r'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); });
        el('fmx-rep-send').addEventListener('click', function () {
            var btn = this; btn.disabled = true;
            var body = { reason: sel.v, comment: el('fmx-rep-c').value };
            if (target.listing_id) body.listing_id = target.listing_id; else body.request_id = target.request_id;
            apiPost('/api/v1/marketplace/complaints', body).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось отправить'); return; }
                _haptic('success'); hideModal('fmx-repBg');
                toast(r && r.hidden ? 'Скрыто до проверки' : 'Жалоба отправлена — проверим');
                if (r && r.hidden) {
                    if (target.listing_id) { _feed = null; _feedState = 'idle'; if (_subTab === 'buy') renderBuy(); }
                    else { _reqs = null; _reqState = 'idle'; if (_subTab === 'sell') renderSell(); }
                }
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось отправить. Повтори попытку.'); });
        });
        showModal('fmx-repBg');
    }
    var _nsubs = null, _nsMetrics = {}, _nsThr = 12;
    function _nsRow(n) {
        var m = _nsMetrics ? _nsMetrics[n] : null;
        var right;
        if (!m) {
            right = '<span class="fmx-nsna">данных мало</span>';
        } else {
            var d = '';
            if (m.pct != null && Math.abs(m.pct) >= 0.1) {
                var down = m.pct < 0;
                d = '<span class="fmx-nsd ' + (down ? 'good' : 'bad') + '"><i class="ti ti-arrow-' +
                    (down ? 'down' : 'up') + '-right"></i>' + Math.abs(Math.round(m.pct)) + '%</span>';
            }
            right = '<span class="fmx-nscpm">' + _num(m.cpm) + ' ₽</span>' + d;
        }
        return '<div class="fmx-nsrow"><span class="fmx-nsn">' + _esc(n) + '</span>' + right +
            '<button class="fmx-nsx" data-nsdel="' + _esc(n) + '" title="Отписаться"><i class="ti ti-x"></i></button></div>';
    }

    function renderNsBody() {
        var box = el('fmx-nsBody'); if (!box) return;
        var chips = (_nsubs && _nsubs.length)
            ? '<div class="fmx-nslist">' + _nsubs.map(_nsRow).join('') + '</div>'
            : '<div style="font-size:11px;color:#8990a8;line-height:1.6;margin-bottom:4px;">Подписок пока нет. Ниша твоего оффера подписывается автоматически при публикации.</div>';
        box.innerHTML = chips +
            '<span class="fmx-lbl fmx-mt2">Добавить нишу</span>' +
            '<div style="display:flex;gap:8px;"><input class="fmx-inp" id="fmx-ns-inp" maxlength="64" placeholder="например, Криптовалюты" style="flex:1;">' +
            '<button class="fmx-btn" id="fmx-ns-add" style="flex:0 0 auto;padding:0 16px;background:#818cf8;color:#fff;border-color:transparent;"><i class="ti ti-plus"></i></button></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:10px;">CPM — медиана по нише за сегодня. Сообщим в @ForgeMetricsBot, когда он сдвинется больше чем на ' + Math.round(_nsThr) + '% за неделю, и когда рекламодатель будет искать каналы этой ниши.</div>';
        var addFn = function () {
            var v = el('fmx-ns-inp').value.trim();
            if (!v) return;
            apiPost('/api/v1/marketplace/niche_subs', { niche: v, on: true }).then(function (r) {
                if (r && r.ok === false) { uiAlert(r.error || 'Не удалось'); return; }
                var lv = v.toLowerCase();
                if (_nsubs.indexOf(lv) < 0) _nsubs.push(lv);
                _nsubs.sort(); _haptic('success'); renderNsBody();
                apiGet('/api/v1/marketplace/niche_subs').then(function (rr) {
                    if (!rr || !rr.niches) return;
                    _nsubs = rr.niches; _nsMetrics = rr.metrics || {};
                    renderNsBody();
                }).catch(function () {});
            }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
        };
        el('fmx-ns-add').addEventListener('click', addFn);
        el('fmx-ns-inp').addEventListener('keydown', function (e) { if (e.key === 'Enter') addFn(); });
        qsa(box, '[data-nsdel]').forEach(function (x) {
            x.addEventListener('click', function () {
                var n = x.getAttribute('data-nsdel');
                apiPost('/api/v1/marketplace/niche_subs', { niche: n, on: false }).then(function () {
                    _nsubs = _nsubs.filter(function (v) { return v !== n; });
                    _haptic('light'); renderNsBody();
                }).catch(function () {});
            });
        });
    }
    function openNicheSubs() {
        el('fmx-nsBody').innerHTML = loadHtml();
        showModal('fmx-nsBg');
        apiGet('/api/v1/marketplace/niche_subs').then(function (r) {
            _nsubs = (r && r.niches) ? r.niches : [];
            _nsMetrics = (r && r.metrics) ? r.metrics : {};
            if (r && r.threshold) _nsThr = r.threshold;
            renderNsBody();
        }).catch(function () { _nsubs = []; _nsMetrics = {}; renderNsBody(); });
    }
    var _SCOPE_LBL = { both: 'Радар + Площадка', radar: 'Радар', market: 'Площадка' };
    var _AL_RANGES = [['p', 'Цена не дороже, ₽', 'mx'], ['cpm', 'CPM не дороже, ₽', 'mx'], ['s', 'Подписчиков от', 'mn'],
        ['r', 'Охват от', 'mn'], ['err', 'ERR от, %', 'mn'], ['er', 'ER от, %', 'mn'],
        ['h', 'Индекс от', 'mn'], ['age', 'Возраст от, мес', 'mn'], ['adp', 'Рекламы не больше, %', 'mx']];
    function _alertChips(f) {
        f = f || {}; var out = [];
        (f.niches || []).forEach(function (n) { out.push('<span class="fmx-alc">' + _esc(n) + '</span>'); });
        var mx = f.mx || {}, mn = f.mn || {};
        if (mx.p != null) out.push('<span class="fmx-alc">≤ ' + _num(mx.p) + ' ₽</span>');
        if (mx.cpm != null) out.push('<span class="fmx-alc">CPM ≤ ' + _num(mx.cpm) + '</span>');
        if (mn.s != null) out.push('<span class="fmx-alc">' + _short(mn.s) + '+ подп</span>');
        if (mn.r != null) out.push('<span class="fmx-alc">охват ' + _short(mn.r) + '+</span>');
        if (mn.err != null) out.push('<span class="fmx-alc">Reach ≥ ' + mn.err + '%</span>');
        if (mn.er != null) out.push('<span class="fmx-alc">ERR ≥ ' + mn.er + '%</span>');
        if (mn.h != null) out.push('<span class="fmx-alc">индекс ≥ ' + mn.h + '</span>');
        if (mn.age != null) out.push('<span class="fmx-alc">от ' + mn.age + ' мес</span>');
        if (mx.adp != null) out.push('<span class="fmx-alc">рекламы ≤ ' + mx.adp + '%</span>');
        var P = f.presets || {};
        if (P.clean) out.push('<span class="fmx-alc g">без накрутки</span>');
        if (P.grow) out.push('<span class="fmx-alc">растут</span>');
        if (P.large) out.push('<span class="fmx-alc">100k+</span>');
        var aud = Object.keys(f.aud || {}).filter(function (k) { return f.aud[k]; });
        if (aud.length) out.push('<span class="fmx-alc">' + aud.map(function (a) { return { male: 'муж', female: 'жен', mixed: 'смеш' }[a] || a; }).join('/') + '</span>');
        return out.length ? out.join('') : '<span class="fmx-alc mut">любые каналы</span>';
    }
    function _alertFilterFromRf() {
        var f = { niches: [], presets: {}, aud: {}, mn: {}, mx: {} };
        if (_nicheSel) f.niches = [_nicheSel];
        var k;
        if (_mainTab === 'market') {
            if (_fPriceMax != null) f.mx.p = _fPriceMax;
            if (_fCpmMax != null) f.mx.cpm = _fCpmMax;
            if (_fAdpMax != null) f.mx.adp = _fAdpMax;
            if (_fSubsMin != null) f.mn.s = _fSubsMin;
            if (_fReachMin != null) f.mn.r = _fReachMin;
            if (_fErMin != null) f.mn.err = _fErMin;
            if (_fEngMin != null) f.mn.er = _fEngMin;
            if (_fHealthMin != null) f.mn.h = _fHealthMin;
            if (_fAgeMin != null) f.mn.age = _fAgeMin;
            if (_fClean) f.presets.clean = true;
            if (_fAud) f.aud[_fAud] = true;
            return f;
        }
        for (k in _rf.presets) if (_rf.presets[k]) f.presets[k] = true;
        for (k in _rf.aud) if (_rf.aud[k]) f.aud[k] = true;
        for (k in _rf.mn) if (_rf.mn[k] != null) f.mn[k] = _rf.mn[k];
        for (k in _rf.mx) if (_rf.mx[k] != null) f.mx[k] = _rf.mx[k];
        return f;
    }
    function _alertAutoName(f) {
        var parts = [];
        if (f.niches && f.niches.length) parts.push(f.niches.join(', '));
        if (f.mx && f.mx.p != null) parts.push('до ' + _short(f.mx.p));
        if (f.mx && f.mx.cpm != null) parts.push('CPM≤' + f.mx.cpm);
        if (!parts.length) parts.push('Все каналы');
        return parts.join(' · ').slice(0, 60);
    }
    function _alSheet(html) {
        _ensureSheets();
        var sh = el('fmx-writeSheet');
        var wasOpen = sh.classList.contains('on');
        sh.innerHTML = html;
        sh.scrollTop = 0;
        _sheetOwn('alerts');
        if (!wasOpen) {
            el('fmx-shbg').classList.add('on');
            sh.offsetHeight;
            requestAnimationFrame(function () { sh.classList.add('on'); });
        }
        return sh;
    }
    function _alHead(title, sub, withBack) {
        return '<div class="grip"></div><div class="fmx-alhd">' +
            (withBack ? '<button class="fmx-alback" id="fmx-al-back" title="Назад"><i class="ti ti-chevron-left"></i></button>'
                : '<span class="fmx-alic"><i class="ti ti-bell"></i></span>') +
            '<div style="min-width:0;flex:1;"><h3 style="margin:0;">' + title + '</h3>' +
            '<div class="fmx-alsub">' + sub + '</div></div>' +
            '<button class="fmx-alx" id="fmx-al-close" title="Закрыть"><i class="ti ti-x"></i></button></div>';
    }
    function _alBindHead(onBack) {
        var b = el('fmx-al-back'); if (b) b.addEventListener('click', function () { _haptic('light'); onBack(); });
        var x = el('fmx-al-close'); if (x) x.addEventListener('click', closeSheet);
    }
    function openAlerts() {
        _haptic('light');
        _alSheet(_alHead('Умные уведомления', 'Появится нужный канал — сообщим в бот', false) +
            '<div id="fmx-al-body" class="fmx-albody">' + loadHtml() + '</div>');
        _alBindHead(function () {});
        loadAlerts();
    }
    function loadAlerts() {
        apiGet('/api/v1/marketplace/alerts').then(function (r) {
            if (!el('fmx-al-body')) return;
            renderAlertsList(r || { alerts: [] });
        }).catch(function () { var b = el('fmx-al-body'); if (b) b.innerHTML = emptyHtml('ti-cloud-off', 'Не загрузилось', 'Проверь связь и повтори.'); });
    }
    function renderAlertsList(r) {
        var body = el('fmx-al-body'); if (!body) return;
        var alerts = r.alerts || [], lim = r.limit || 1, used = r.used != null ? r.used : alerts.length;
        var canAdd = used < lim;
        var h = '<button class="fmx-alnew" id="fmx-al-new"' + (canAdd ? '' : ' disabled') + '><i class="ti ti-plus"></i> Новое уведомление</button>' +
            '<div class="fmx-allim">Активно ' + used + ' из ' + (lim >= 100 ? '∞' : lim) + (canAdd ? '' : ' · достигнут лимит тарифа') + '</div>';
        if (!alerts.length) {
            h += emptyHtml('ti-bell-plus', 'Пока нет уведомлений', 'Задай нишу, потолок цены и качество — подходящие каналы придут сами.');
        } else {
            alerts.forEach(function (a) {
                var sc = a.scope || 'both';
                h += '<div class="fmx-al' + (a.enabled ? '' : ' off') + '">' +
                    '<div class="fmx-al-top"><span class="fmx-al-name">' + _esc(a.name) + '</span>' +
                    '<span class="fmx-al-scope ' + sc + '">' + _SCOPE_LBL[sc] + '</span>' +
                    '<span class="fmx-tgl' + (a.enabled ? '' : ' off') + '" data-tgl="' + a.id + '"></span></div>' +
                    '<div class="fmx-al-chips">' + _alertChips(a.filter) + '</div>' +
                    '<div class="fmx-al-match">' + (a.enabled ? '<span style="color:' + (a.mode === 'digest' ? '#f5bf4f' : '#5DCAA5') + ';">●</span> ' + (a.seen_count ? a.seen_count + ' найдено · ' : '') + (a.mode === 'digest' ? 'сводка раз в день' : 'мгновенно') : '<span style="color:#565b73;">выключено</span>') + '</div>' +
                    '<div class="fmx-al-acts"><button class="fmx-al-b pr" data-edit="' + a.id + '">Изменить</button>' +
                    '<button class="fmx-al-b" data-mts="' + a.id + '" data-msc="' + sc + '">Совпадения</button>' +
                    '<button class="fmx-al-b dz" data-del="' + a.id + '"><i class="ti ti-trash"></i></button></div></div>';
            });
        }
        body.innerHTML = h;
        var nb = el('fmx-al-new'); if (nb && canAdd) nb.addEventListener('click', function () { openAlertEditor(null); });
        qsa(body, '[data-tgl]').forEach(function (x) { x.addEventListener('click', function () { apiPost('/api/v1/marketplace/alerts/' + x.getAttribute('data-tgl') + '/toggle').then(function () { _haptic('light'); loadAlerts(); }); }); });
        qsa(body, '[data-edit]').forEach(function (x) { x.addEventListener('click', function () { var a = (alerts.filter(function (z) { return z.id == x.getAttribute('data-edit'); })[0]); openAlertEditor(a); }); });
        qsa(body, '[data-del]').forEach(function (x) {
            x.addEventListener('click', function () {
                var id = x.getAttribute('data-del');
                uiConfirm('Удалить это уведомление?', function () {
                    apiDelete('/api/v1/marketplace/alerts/' + id).then(function (rr) {
                        if (rr && rr.ok === false) { uiAlert(rr.error || 'Не удалось удалить'); return; }
                        _haptic('success'); loadAlerts();
                    }).catch(function () { uiAlert('Не удалось удалить. Повтори попытку.'); });
                });
            });
        });
        qsa(body, '[data-mts]').forEach(function (x) { x.addEventListener('click', function () { openAlertMatches(x.getAttribute('data-mts'), x.getAttribute('data-msc')); }); });
    }
    var _aEdit = null;
    function openAlertEditor(a) {
        _aEdit = a ? { id: a.id, name: a.name, scope: a.scope, mode: a.mode, enabled: a.enabled !== false, f: JSON.parse(JSON.stringify(a.filter || {})) }
            : { id: null, name: '', scope: 'both', mode: 'instant', enabled: true, f: _alertFilterFromRf() };
        var f = _aEdit.f; f.niches = f.niches || []; f.presets = f.presets || {}; f.aud = f.aud || {}; f.mn = f.mn || {}; f.mx = f.mx || {};
        if (!_aEdit.name) _aEdit.name = _alertAutoName(f);
        function seg(cur, opts) { return opts.map(function (o) { return '<button class="fmx-seg' + (cur === o[0] ? ' on' : '') + '" data-seg="' + o[0] + '">' + o[1] + '</button>'; }).join(''); }
        var rangesHtml = _AL_RANGES.map(function (r) {
            var v = (_aEdit.f[r[2]] || {})[r[0]]; v = (v != null ? v : '');
            return '<div class="fmx-bfcell"><span class="fmx-lbl">' + r[1] + '</span>' +
                '<input class="fmx-inp" type="number" inputmode="numeric" min="0" placeholder="не важно" value="' + v + '" data-rng="' + r[0] + '" data-bnd="' + r[2] + '"></div>';
        }).join('');
        var sh = _alSheet(_alHead((_aEdit.id ? 'Изменить уведомление' : 'Новое уведомление'), 'Условия закупки', true) +
            '<div class="fmx-ae-sec">Название</div><input class="fmx-inp" id="fmx-ae-name" maxlength="60" value="' + _esc(_aEdit.name) + '">' +
            '<div class="fmx-ae-sec">Где искать</div><div class="fmx-segw" id="fmx-ae-scope">' + seg(_aEdit.scope, [['both', 'Обе'], ['radar', 'Радар'], ['market', 'Площадка']]) + '</div>' +
            '<div class="fmx-ae-sec">Ниши <span style="text-transform:none;letter-spacing:0;color:#565b73;font-weight:500;">— пусто = любые</span></div><div class="fmx-fxw" id="fmx-ae-nw">' +
            (f.niches || []).map(function (n) { return '<button class="fmx-fx on" data-nrm="' + _esc(n) + '">' + _esc(n) + ' <i class="ti ti-x" style="font-size:11px;opacity:0.7;"></i></button>'; }).join('') +
            '<button class="fmx-fx" id="fmx-ae-nadd"><i class="ti ti-plus" style="font-size:11px;"></i> Добавить нишу</button></div>' +
            '<div class="fmx-ae-sec">Параметры канала</div><div class="fmx-algrid">' + rangesHtml + '</div>' +
            '<div class="fmx-ae-sec">Пол аудитории</div><div class="fmx-segw" id="fmx-ae-aud">' + seg((f.aud.male ? 'male' : f.aud.female ? 'female' : ''), [['male', 'Муж'], ['female', 'Жен'], ['', 'Любой']]) + '</div>' +
            '<div class="fmx-ae-sec">Только</div><div class="fmx-fxw" id="fmx-ae-pre"><button class="fmx-fx' + (f.presets.clean ? ' on' : '') + '" data-pp="clean">Прошли фрод-контроль</button><button class="fmx-fx' + (f.presets.grow ? ' on' : '') + '" data-pp="grow">Растут</button><button class="fmx-fx' + (f.presets.large ? ' on' : '') + '" data-pp="large">100k+</button></div>' +
            '<div class="fmx-ae-sec">Как часто уведомлять</div><div class="fmx-segw" id="fmx-ae-mode">' + seg(_aEdit.mode, [['instant', 'Мгновенно'], ['digest', 'Сводка раз в день']]) + '</div>' +
            '<button class="fmx-alnew" id="fmx-ae-save" style="margin-top:20px;"><i class="ti ti-bell"></i> Сохранить уведомление</button>');
        _alBindHead(openAlerts);
        qsa(el('fmx-ae-scope'), '[data-seg]').forEach(function (b) { b.addEventListener('click', function () { _aEdit.scope = b.getAttribute('data-seg'); qsa(el('fmx-ae-scope'), '[data-seg]').forEach(function (z) { z.classList.remove('on'); }); b.classList.add('on'); }); });
        qsa(el('fmx-ae-mode'), '[data-seg]').forEach(function (b) { b.addEventListener('click', function () { _aEdit.mode = b.getAttribute('data-seg'); qsa(el('fmx-ae-mode'), '[data-seg]').forEach(function (z) { z.classList.remove('on'); }); b.classList.add('on'); }); });
        qsa(el('fmx-ae-aud'), '[data-seg]').forEach(function (b) { b.addEventListener('click', function () { qsa(el('fmx-ae-aud'), '[data-seg]').forEach(function (z) { z.classList.remove('on'); }); b.classList.add('on'); }); });
        qsa(el('fmx-ae-pre'), '[data-pp]').forEach(function (b) { b.addEventListener('click', function () { b.classList.toggle('on'); }); });
        function collect() {
            var _keep = _aEdit.f || {}, _vis = {};
            _AL_RANGES.forEach(function (r) { _vis[r[2] + ':' + r[0]] = 1; });
            var f2 = { niches: (_keep.niches || []).slice(), presets: {}, aud: {}, mn: {}, mx: {} };
            ['mn', 'mx'].forEach(function (b) { var src = _keep[b] || {}; for (var k in src) { if (!_vis[b + ':' + k] && src[k] != null) f2[b][k] = src[k]; } });
            qsa(el('fmx-ae-pre'), '[data-pp].on').forEach(function (b) { f2.presets[b.getAttribute('data-pp')] = true; });
            var av = qsa(el('fmx-ae-aud'), '[data-seg].on')[0]; var avv = av ? av.getAttribute('data-seg') : '';
            if (avv) f2.aud[avv] = true;
            qsa(sh, '[data-rng]').forEach(function (i) { var val = i.value.trim(); if (val !== '') { var num = parseFloat(val.replace(',', '.')); if (!isNaN(num)) f2[i.getAttribute('data-bnd')][i.getAttribute('data-rng')] = num; } });
            return f2;
        }
        function reopen(f2) {
            var nm = el('fmx-ae-name').value.trim();
            if (nm === _alertAutoName(_aEdit.f)) nm = '';
            openAlertEditor({ id: _aEdit.id, name: nm, scope: _aEdit.scope,
                mode: _aEdit.mode, enabled: _aEdit.enabled, filter: f2 });
        }
        el('fmx-ae-nadd').addEventListener('click', function () {
            var f2 = collect();
            openNichePick(function (m) {
                if ((f2.niches || []).indexOf(m) < 0) f2.niches.push(m);
                reopen(f2);
            });
        });
        qsa(el('fmx-ae-nw'), '[data-nrm]').forEach(function (b) {
            b.addEventListener('click', function () {
                var nm = b.getAttribute('data-nrm'), f2 = collect();
                f2.niches = (f2.niches || []).filter(function (x) { return x !== nm; });
                _haptic('light'); reopen(f2);
            });
        });
        el('fmx-ae-save').addEventListener('click', function () {
            var f2 = collect();
            var nm = el('fmx-ae-name').value.trim() || _alertAutoName(f2);
            var payload = { id: _aEdit.id, name: nm, scope: _aEdit.scope, mode: _aEdit.mode, filter: f2, enabled: _aEdit.enabled !== false };
            var sv = el('fmx-ae-save'); sv.disabled = true;
            apiPost('/api/v1/marketplace/alerts', payload).then(function (r) {
                if (r && r.ok === false) { uiAlert(r.message || r.error || 'Не удалось'); sv.disabled = false; return; }
                _haptic('success'); openAlerts();
            }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); sv.disabled = false; });
        });
    }
    var _amSeq = 0;
    function openAlertMatches(id, scope) {
        _haptic('light');
        var cur = (scope === 'radar' || scope === 'market' || scope === 'both') ? scope : 'both';
        function draw() {
            _alSheet(_alHead('Совпадения сейчас', 'Каналы под этот фильтр', true) +
                '<div class="fmx-segw" id="fmx-am-sc">' +
                [['both', 'Обе'], ['radar', 'Радар'], ['market', 'Площадка']].map(function (o) {
                    return '<button class="fmx-seg' + (cur === o[0] ? ' on' : '') + '" data-msc="' + o[0] + '">' + o[1] + '</button>';
                }).join('') + '</div>' +
                '<div id="fmx-am-body" class="fmx-albody" style="margin-top:12px;">' + loadHtml() + '</div>');
            _alBindHead(openAlerts);
            qsa(el('fmx-am-sc'), '[data-msc]').forEach(function (b) {
                b.addEventListener('click', function () { cur = b.getAttribute('data-msc'); _haptic('light'); draw(); });
            });
            var _req = ++_amSeq;
            apiGet('/api/v1/marketplace/alerts/' + id + '/matches?scope=' + cur).then(function (r) {
                var b = el('fmx-am-body'); if (!b || _req !== _amSeq) return;
                var items = (r && r.items) || [];
                if (!items.length) { b.innerHTML = emptyHtml('ti-search', 'Пока пусто', 'Здесь нет каналов под фильтр. Уведомление придёт, как только появится.'); return; }
                var h = '<div class="fmx-allim" style="margin:0 0 10px;">Подходит ' + (r.count || items.length) + ' ' + _plural(r.count || items.length, 'канал', 'канала', 'каналов') + ' — нажми, чтобы открыть в Telegram</div>';
                items.forEach(function (it) {
                    var av = it.avatar_url ? '<img class="fmx-am-av" src="' + _esc(mediaAbs(it.avatar_url)) + '" alt="">' : '<div class="fmx-am-av">' + _esc((it.title || it.username || '?').charAt(0).toUpperCase()) + '</div>';
                    var src = it.source === 'market' ? '<span class="fmx-al-scope market">Площадка</span>' : '<span class="fmx-al-scope radar">Радар</span>';
                    h += '<a href="https://t.me/' + _esc(it.username) + '" target="_blank" rel="noopener" class="fmx-am-it">' + av +
                        '<div style="min-width:0;flex:1;"><div style="font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(it.title || ('@' + it.username)) + '</div>' +
                        '<div style="font-size:11.5px;color:#9aa0b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">' + src + ' @' + _esc(it.username) + (it.niche ? ' · ' + _esc(it.niche) : '') + '</div></div>' +
                        '<div style="text-align:right;font-size:11px;color:#c2c6d2;white-space:nowrap;flex:0 0 auto;">' + (it.subscribers ? _short(it.subscribers) : '') + (it.cpm != null ? '<br>CPM ' + _short(it.cpm) + ' ₽' : '') + '</div></a>';
                });
                b.innerHTML = h;
            }).catch(function () { var b = el('fmx-am-body'); if (b) b.innerHTML = emptyHtml('ti-cloud-off', 'Не загрузилось', 'Повтори попытку.'); });
        }
        draw();
    }
    function _proofHtml(r) {
        if (!r || !r.post_url) return '';
        var lines = '';
        if (r.reach_12h != null) lines += '<div>Охват за 12 ч: <b style="color:#5ab0e6;">' + _num(r.reach_12h) + '</b></div>';
        if (r.reach_24h != null) lines += '<div>Охват за 24 ч: <b style="color:#5ab0e6;">' + _num(r.reach_24h) + '</b></div>';
        if (r.reach_48h != null) lines += '<div>Охват за 48 ч: <b style="color:#5ab0e6;">' + _num(r.reach_48h) + '</b></div>';
        var note;
        if (r.proof_status === 'measured') note = (r.reach_12h == null && r.reach_24h == null && r.reach_48h == null) ? '<div style="color:#8990a8;">Охват замерить не удалось — пост не в публичной ленте.</div>' : '';
        else note = '<div style="color:#8990a8;">Замеряем охват — отчёт придёт через 12, 24 и 48 часов.</div>';
        return '<div class="fmx-proof"><div class="fmx-proof-t"><i class="ti ti-chart-line"></i> Доказательство размещения</div>' +
            '<div style="font-size:11.5px;margin-top:3px;">Пост: <a href="' + _esc(r.post_url) + '" target="_blank" rel="noopener">открыть</a></div>' + lines + note + '</div>';
    }

    var _calData = {};
    function _isoOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

    function calDraw(box, l, mode) {
        var r = _calData[l.id];
        if (!box || !r) return;
        if (!box._ym) { var n0 = new Date(); box._ym = { y: n0.getFullYear(), m: n0.getMonth() }; }
        var y = box._ym.y, m = box._ym.m;
        var busy = {}; (r.busy || []).forEach(function (s) { busy[s] = 1; });
        var demand = r.demand || {};
        var watch = {}; (r.watch || []).forEach(function (s) { watch[s] = 1; });
        var hot = {}; ((r.hot && r.hot.days) || []).forEach(function (s) { hot[s] = 1; });
        var today = new Date(); today.setHours(12, 0, 0, 0);
        var todayIso = _isoOf(today);
        var first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate();
        var off = (first.getDay() + 6) % 7;
        var om = r.open_months || [];
        var hm = r.months_horizon || null;
        var mKey = y + '-' + String(m + 1).padStart(2, '0');
        var monthOpen = om.indexOf(mKey) >= 0;
        var inHorizon = !hm || hm.indexOf(mKey) >= 0;
        var navPrevOff = hm && mKey <= hm[0], navNextOff = hm && mKey >= hm[hm.length - 1];
        var h = '<div class="fmx-calhead">' +
            '<button class="fmx-calnav" data-nav="-1"' + (navPrevOff ? ' disabled' : '') + '>‹</button>' +
            '<b>' + MON_IM[m] + ' ' + y + '</b>' +
            '<button class="fmx-calnav" data-nav="1"' + (navNextOff ? ' disabled' : '') + '>›</button></div>' +
            (mode === 'edit' && inHorizon ? '<div class="fmx-tgl' + (monthOpen ? ' on' : '') + '" id="fmx-mopen" style="margin:2px 0 8px;"><span class="sw"></span><span style="flex:1;">Месяц открыт для рекламы</span></div>' : '') +
            '<div class="fmx-slgrid">' + ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(function (w) { return '<span class="fmx-slw">' + w + '</span>'; }).join('');
        for (var i = 0; i < off; i++) h += '<span></span>';
        var freeCount = 0;
        for (var d = 1; d <= dim; d++) {
            var iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            var past = iso < todayIso, isBusy = !!busy[iso];
            var offD = !past && (!monthOpen || !inHorizon);
            if (!past && !isBusy && !offD) freeCount++;
            var cls = 'fmx-sd ' + (past ? 'past' : (offD ? 'off' : (isBusy ? 'busy' : 'free')));
            if (!past && !offD && !isBusy && hot[iso]) cls += ' hot';
            if (iso === todayIso) cls += ' today';
            if (!past && !offD && mode === 'view' && _lsSel && _lsSel.day === iso) cls += ' sel';
            if (!past && !offD && mode === 'edit' && !_ownerCalHot && _ownerSelDay === iso) cls += ' sel';
            if (!past && !offD && mode === 'edit' && _ownerCalHot && _ownerHotDay === iso) cls += ' sel';
            if (!offD && isBusy && watch[iso]) cls += ' watch';
            if (!offD && isBusy && mode === 'view' && !r.is_owner) cls += ' busy2';
            var clickable = !past && !offD && (mode === 'edit' || (mode === 'view' && (!isBusy || !r.is_owner)));
            h += '<button class="' + cls + '"' + (clickable ? ' data-cd="' + iso + '"' : ' disabled') + '>' +
                '<span class="fmx-sdn">' + d + '</span>' + ((demand[iso] && !offD) ? '<i class="dm"></i>' : '') + ((past || isBusy || offD) ? '' : _dayDots(r, iso)) + '</button>';
        }
        h += '</div>' +
            '<div class="fmx-sleg"><span><i style="background:rgba(93,202,165,0.5);"></i>свободно</span>' +
            '<span><i style="background:rgba(239,128,128,0.5);"></i>занято</span>' +
            (r.hot ? '<span><i style="background:rgba(245,191,79,0.6);"></i>горящие ' + (r.hot.map ? 'до ' : '') + '−' + r.hot.pct + '%</span>' : '') +
            '<span style="margin-left:auto;">' + freeCount + ' своб.</span></div>' +
            (!inHorizon ? '<div class="fmx-slnote"><i class="ti ti-calendar-off"></i><span>Календарь ведётся на ' + (r.horizon_days || 180) + ' дней вперёд</span></div>'
                : (!monthOpen && mode === 'view' ? '<div class="fmx-slnote"><i class="ti ti-lock"></i><span>Владелец не открыл этот месяц для продажи</span></div>' : '')) +
            (r.hot && r.hot.days && r.hot.days.length ? '<div class="fmx-slnote" style="color:#f5bf4f;"><i class="ti ti-discount-2"></i><span>Точечные скидки: ' + r.hot.days.length + ' ' + _plural(r.hot.days.length, 'дата', 'даты', 'дат') + ' · до −' + r.hot.pct + '%</span></div>' : '') +
            (r.slots_updated_at ? '<div style="font-size:10px;color:#565b73;margin-top:6px;">Обновлён ' + _agoDay(r.slots_updated_at) + '</div>' : '') +
            (mode === 'edit' ? '<div id="fmx-ownerExtra">' + _calModeHtml() + (_ownerCalHot ? _ownerHotHtml(l, r) : _ownerSlotsHtml(l, r)) + '</div>' : '');
        box.innerHTML = h;
        if (mode === 'edit') {
            _bindOwnerSlots(box, l);
            var _mo = box.querySelector('#fmx-mopen');
            if (_mo) _mo.addEventListener('click', function () {
                apiPost('/api/v1/marketplace/listings/' + l.id + '/months', { month: mKey, open: !monthOpen }).then(function (rr) {
                    if (!rr || !rr.ok) { _haptic('error'); uiAlert(rr && rr.error === 'forbidden' ? 'Управлять календарём может только владелец оффера' : 'Не удалось изменить месяц'); return; }
                    _haptic('success');
                    var rd = _calData[l.id]; if (rd) rd.open_months = rr.open_months;
                    toast(!monthOpen ? 'Месяц открыт — покупатели видят свободные дни' : ('Месяц закрыт — покупатели его не видят' + (rr.removed_hot_days ? '. Сняты точечные скидки: ' + rr.removed_hot_days : '')));
                    calDraw(box, l, 'edit');
                }).catch(function () { _haptic('error'); uiAlert('Не удалось изменить месяц'); });
            });
            qsa(box, '#fmx-calMode [data-cm]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var hotOn = b.getAttribute('data-cm') === 'hot';
                    if (hotOn === _ownerCalHot) return;
                    _ownerCalHot = hotOn; _ownerHotDay = null; _ownerHotPct = null; _ownerHotTimes = null;
                    var _cs = el('fmx-calSub');
                    if (_cs) _cs.textContent = '@' + (l.username || '') + (hotOn ? ' — выбери день и назначь скидку, покупатели увидят её жёлтой' : ' — отмечай занятые дни, покупатели увидят свободные');
                    _haptic('light'); calDraw(box, l, 'edit');
                });
            });
            if (_ownerCalHot) _bindOwnerHot(box, l);
        }
        qsa(box, '[data-nav]').forEach(function (b) {
            b.addEventListener('click', function () {
                var nm = m + parseInt(b.getAttribute('data-nav'), 10);
                box._ym = { y: y + Math.floor(nm / 12), m: (nm % 12 + 12) % 12 };
                _haptic('light'); calDraw(box, l, mode);
            });
        });
        qsa(box, '[data-cd]').forEach(function (b) {
            b.addEventListener('click', function () {
                var iso = b.getAttribute('data-cd');
                if (mode === 'edit') {
                    if (_ownerCalHot) {
                        var _hmap = (r.hot && r.hot.map) || {};
                        if (busy[iso] && !_hmap[iso]) { _haptic('error'); uiAlert('День занят — на занятые даты скидка не ставится'); return; }
                        var _lim = new Date(); _lim.setDate(_lim.getDate() + (r.horizon_days || 180));
                        if (iso > _isoOf(_lim)) { _haptic('error'); uiAlert('Скидку можно назначить максимум на ' + (r.horizon_days || 180) + ' дней вперёд'); return; }
                        _ownerHotDay = (_ownerHotDay === iso) ? null : iso;
                        _ownerHotPct = null; _ownerHotTimes = null;
                        _haptic('light'); calDraw(box, l, 'edit');
                        return;
                    }
                    if (_slotCfg(r) && !busy[iso]) { _ownerSelDay = (_ownerSelDay === iso) ? null : iso; _haptic('light'); calDraw(box, l, 'edit'); }
                    else { _calToggleDay(box, l, iso); }
                    return;
                }
                if (busy[iso]) { _calWatchDay(box, l, iso); return; }
                if (_lsSel.day !== iso) _lsSel.time = null;
                if ((_lsSel.basket || []).some(function (x) { return x.day === iso; })) {
                    _lsSel.day = null; toast('Эта дата уже в заявке'); _haptic('light');
                    calDraw(box, l, 'view');
                    var host0 = box.closest ? box.closest('#fmx-slotsBox') : null;
                    if (host0) { _refreshBuyerExtra(host0, l); _redrawFullIfOpen(host0, l); }
                    _syncWriteBtn(l); return;
                }
                _lsSel.day = iso;
                _haptic('light');
                calDraw(box, l, 'view');
                var host = box.closest ? box.closest('#fmx-slotsBox') : null;
                if (host) _refreshBuyerExtra(host, l);
                var dq = demand[iso];
                toast(dq ? 'Дата выбрана. На неё уже ' + dq + ' ' + _plural(dq, 'запрос', 'запроса', 'запросов') + ' за неделю'
                         : 'Дата выбрана — кнопка «Написать» обновилась');
            });
        });
    }
    function _agoDay(iso) {
        try {
            var d = new Date(iso), now = new Date();
            var days = Math.floor((now - d) / 86400000);
            if (days <= 0) return 'сегодня';
            if (days === 1) return 'вчера';
            return days + ' ' + _plural(days, 'день', 'дня', 'дней') + ' назад';
        } catch (e) { return ''; }
    }
    function _calToggleDay(box, l, iso) {
        apiPost('/api/v1/marketplace/listings/' + l.id + '/slots/toggle', { day: iso }).then(function (rr) {
            if (!rr || !rr.ok) { _haptic('error'); uiAlert(rr && rr.error === 'forbidden' ? 'Управлять датами может только владелец оффера' : 'Не удалось изменить день'); return; }
            _haptic('light');
            var r = _calData[l.id];
            if (rr.busy) { r.busy.push(iso); } else { r.busy = r.busy.filter(function (x) { return x !== iso; }); }
            r.slots_updated_at = new Date().toISOString();
            calDraw(box, l, 'edit');
            var _jc = box.querySelector('[data-cd="' + iso + '"]'); if (_jc) _jc.classList.add('just');
            toast('Календарь обновлён — закупщики уже видят новые даты');
        }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
    }
    function _calWatchDay(box, l, iso) {
        apiPost('/api/v1/marketplace/listings/' + l.id + '/date_watch', { day: iso }).then(function (rr) {
            if (!rr || !rr.ok) { if (rr && rr.error === 'self') toast('Это твой оффер — даты меняются в кабинете', true); return; }
            var r = _calData[l.id];
            if (rr.on) { (r.watch = r.watch || []).push(iso); toast('Сообщим в бота, когда владелец освободит эту дату'); }
            else { r.watch = (r.watch || []).filter(function (x) { return x !== iso; }); toast('Слежение за датой снято'); }
            _haptic('light');
            calDraw(box, l, 'view');
        }).catch(function () {});
    }
    var _ownerSelDay = null;
    var _ownerCalHot = false, _ownerHotDay = null, _ownerHotPct = null, _ownerHotTimes = null;
    var _SLOT_PRESETS = ['09:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '21:00'];
    function _tmin(t) { var p = String(t || '').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
    function _fmtT(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    function _slotCfg(r) { return (r && r.slot_config && r.slot_config.times && r.slot_config.times.length) ? r.slot_config : null; }
    function _busyTimes(r) { var s = {}; (r.busy_times || []).forEach(function (x) { s[x] = 1; }); return s; }
    function _daySlot(r, iso) {
        var cfg = _slotCfg(r); if (!cfg) return null;
        var bt = _busyTimes(r), busy = 0;
        cfg.times.forEach(function (t) { if (bt[iso + '|' + _tmin(t.t)]) busy++; });
        return { n: cfg.times.length, free: cfg.times.length - busy };
    }
    function _dayDots(r, iso) {
        var s = _daySlot(r, iso); if (!s || !s.n) return '';
        var show = Math.min(s.n, 4), fShow = Math.round(s.free / s.n * show);
        if (s.free < s.n && fShow >= show) fShow = show - 1;
        if (s.free > 0 && fShow <= 0) fShow = 1;
        var d = ''; for (var i = 0; i < show; i++) d += '<i class="' + (i < fShow ? 'f' : 'b') + '"></i>';
        return '<span class="fmx-sdots">' + d + '</span>';
    }

    function _peakWin(l) { return (l && l.peak_hours && typeof l.peak_hours.from === 'number') ? l.peak_hours : null; }
    function _peakLabel(l) { var p = _peakWin(l); return p ? (String(p.from).padStart(2, '0') + ':00–' + String(p.to).padStart(2, '0') + ':00') : ''; }
    function _inPeak(l, tmin) { var p = _peakWin(l); if (!p) return false; var h = Math.floor(tmin / 60); return p.from <= p.to ? (h >= p.from && h < p.to) : (h >= p.from || h < p.to); }
    function _peakBlock(l) { var lab = _peakLabel(l); if (!lab) return ''; return '<div class="fmx-peak"><i class="ti ti-chart-line"></i><span>Час пик просмотров · <b>' + lab + '</b></span></div>'; }
    function _termsBlock(l) {
        var em = { advertiser: 'ставит рекламодатель', channel: 'ставит канал', discuss: 'обсуждается' };
        var lines = [];
        if (l.erid_who && em[l.erid_who]) lines.push('Маркировка (erid) — ' + em[l.erid_who]);
        lines.push('Оплата напрямую с владельцем канала');
        lines.push('Сделка и отзыв фиксируются в приложении после подтверждения сторонами');
        return '<div class="fmx-lssect">Условия размещения</div><div class="fmx-terms">' +
            lines.map(function (t) { return '<div class="fmx-tline"><i class="ti ti-point-filled"></i>' + _esc(t) + '</div>'; }).join('') + '</div>';
    }

    function _buyerSlotsHtml(l, r) {
        var cfg = _slotCfg(r); if (!cfg || !_lsSel || !_lsSel.day) return '';
        var bt = _busyTimes(r), day = _lsSel.day;
        var rows = cfg.times.map(function (t) {
            var tm = _tmin(t.t), isBusy = !!bt[day + '|' + tm], sel = (_lsSel.time === tm), pk = _inPeak(l, tm);
            var hp = isBusy ? null : _hotPct(l, day, tm);
            return '<div class="fmx-tsl' + (isBusy ? ' bs' : (sel ? ' sel' : '')) + (pk ? ' peak' : '') + (hp ? ' hot' : '') + '"' + (isBusy ? '' : ' data-ts="' + tm + '"') + '>' +
                '<span class="tm">' + _esc(t.t) + '</span>' +
                (pk ? '<span class="fmx-peaktag">час пик</span>' : '') +
                (hp ? '<span class="fmx-hottag">−' + hp + '%</span>' : '') +
                '<span class="st">' + (isBusy ? 'Занято' : (sel ? 'Выбрано ✓' : 'Свободно')) + '</span></div>';
        }).join('');
        var _he = (_calData[l.id] && _calData[l.id].hot && _calData[l.id].hot.map) ? _calData[l.id].hot.map[day] : null;
        var hotHint = (_he && _he.times && _he.times.length)
            ? '<div style="font-size:10px;color:#f5bf4f;margin-bottom:6px;line-height:1.45;"><i class="ti ti-discount-2" style="font-size:11px;"></i> Скидка −' + _he.pct + '% действует на отдельное время — выбери жёлтый слот</div>' : '';
        return '<div class="fmx-tslots"><div class="fmx-tslh"><i class="ti ti-clock"></i> Время выхода · ' + _fmtDayRu(day) + '</div>' + hotHint + rows + '</div>';
    }
    function _bindBuyerSlots(box, l) {
        qsa(box, '.fmx-tsl[data-ts]').forEach(function (b) {
            b.addEventListener('click', function () {
                var tm = +b.getAttribute('data-ts');
                _lsSel.time = (_lsSel.time === tm) ? null : tm;
                _haptic('light'); _refreshBuyerExtra(box, l);
            });
        });
    }
    function _refreshBuyerExtra(box, l) {
        var ex = box.querySelector('#fmx-buyerExtra');
        if (!ex) { drawBuyerSlots(box, l); _syncWriteBtn(l); return; }
        var r = _calData[l.id];
        ex.innerHTML = _buyerSlotsHtml(l, r) + _basketHtml(l);
        _bindBuyerSlots(box, l); _bindBasket(box, l);
        qsa(box, '.fmx-dd.sel').forEach(function (c) { c.classList.remove('sel'); });
        if (_lsSel.day) { var cell = box.querySelector('.fmx-dd[data-bd="' + _lsSel.day + '"]'); if (cell) cell.classList.add('sel'); }
        _syncWriteBtn(l);
    }

    function _calModeHtml() {
        return '<div class="fmx-fxw" id="fmx-calMode" style="margin-top:10px;">' +
            '<button class="fmx-fx' + (!_ownerCalHot ? ' on' : '') + '" data-cm="busy"><i class="ti ti-calendar-x"></i> Занятость</button>' +
            '<button class="fmx-fx' + (_ownerCalHot ? ' on' : '') + '" data-cm="hot"><i class="ti ti-discount-2"></i> Скидки</button></div>';
    }
    function _ownerHotHtml(l, r) {
        var map = (r.hot && r.hot.map) || {};
        var h = '';
        if (!_ownerHotDay) {
            if (!((r.open_months || []).length)) return h + '<div style="font-size:11px;color:#f5bf4f;line-height:1.5;margin-top:9px;">Сначала открой месяц для рекламы в режиме «Занятость» — скидки назначаются в открытых месяцах.</div>';
            h += '<div style="font-size:11px;color:#8990a8;line-height:1.5;margin-top:9px;">Выбери свободный день в календаре — назначь скидку на дату и, при желании, на конкретное время. Дни и времена со скидкой покупатель видит жёлтыми, цена в его заявке считается со скидкой автоматически. Горизонт — ' + ((r && r.horizon_days) || 180) + ' дней вперёд.</div>';
            var keys = Object.keys(map).sort();
            if (keys.length) {
                h += '<span class="fmx-lbl fmx-mt2">Назначено</span><div style="display:flex;flex-direction:column;gap:5px;">' + keys.map(function (d) {
                    var e = map[d];
                    return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;"><span style="color:#f5bf4f;font-weight:800;flex:0 0 44px;">−' + e.pct + '%</span><span>' + _fmtDayRu(d) + '</span>' +
                        (e.times && e.times.length ? '<span style="color:#8990a8;font-size:10.5px;">' + e.times.map(_fmtT).join(', ') + '</span>' : '<span style="color:#565b73;font-size:10.5px;">весь день</span>') + '</div>';
                }).join('') + '</div>';
            }
            return h;
        }
        var cur = map[_ownerHotDay] || null;
        if (_ownerHotPct == null) _ownerHotPct = cur ? cur.pct : 15;
        if (_ownerHotTimes == null) _ownerHotTimes = (cur && cur.times) ? cur.times.slice() : [];
        var pcts = [5, 10, 15, 20, 25, 30, 40, 50];
        h += '<div style="font-size:12.5px;font-weight:700;margin-top:10px;">' + _fmtDayRu(_ownerHotDay) + (cur ? ' <span style="color:#f5bf4f;font-weight:600;font-size:11px;">· сейчас −' + cur.pct + '%</span>' : '') + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Размер скидки</span><div class="fmx-fxw" id="fmx-hotPcts">' + pcts.map(function (p) {
                return '<button class="fmx-fx' + (p === _ownerHotPct ? ' on' : '') + '" data-hp="' + p + '">−' + p + '%</button>';
            }).join('') + '</div>';
        var cfg = _slotCfg(r);
        if (cfg && cfg.times && cfg.times.length) {
            h += '<span class="fmx-lbl fmx-mt2">Время со скидкой</span><div class="fmx-fxw" id="fmx-hotTimes">' + cfg.times.map(function (t) {
                var tm = _tmin(t.t);
                return '<button class="fmx-fx' + (_ownerHotTimes.indexOf(tm) >= 0 ? ' on' : '') + '" data-ht="' + tm + '">' + _esc(t.t) + '</button>';
            }).join('') + '</div>' +
                '<div style="font-size:10px;color:#565b73;margin-top:4px;">Не выбрано время — скидка на весь день</div>';
        }
        h += '<div style="display:flex;gap:8px;margin-top:12px;">' +
            (cur ? '<button class="fmx-btn" id="fmx-hotDel" style="color:#f7a58c;border-color:rgba(247,165,140,0.3);">Убрать скидку</button>' : '') +
            '<button class="fmx-btn" id="fmx-hotSave" style="flex:1;background:#f5bf4f;color:#1c1503;border-color:transparent;font-weight:800;">Сохранить −' + _ownerHotPct + '%</button></div>';
        return h;
    }
    function _bindOwnerHot(box, l) {
        qsa(box, '#fmx-hotPcts [data-hp]').forEach(function (b) {
            b.addEventListener('click', function () { _ownerHotPct = +b.getAttribute('data-hp'); _haptic('light'); calDraw(box, l, 'edit'); });
        });
        qsa(box, '#fmx-hotTimes [data-ht]').forEach(function (b) {
            b.addEventListener('click', function () {
                var tm = +b.getAttribute('data-ht'), i = _ownerHotTimes.indexOf(tm);
                if (i >= 0) _ownerHotTimes.splice(i, 1); else _ownerHotTimes.push(tm);
                _haptic('light'); calDraw(box, l, 'edit');
            });
        });
        var sv = box.querySelector('#fmx-hotSave');
        if (sv) sv.addEventListener('click', function () { _hotDaySave(box, l, _ownerHotPct); });
        var dl = box.querySelector('#fmx-hotDel');
        if (dl) dl.addEventListener('click', function () { _hotDaySave(box, l, 0); });
    }
    function _hotDaySave(box, l, pct) {
        apiPost('/api/v1/marketplace/listings/' + l.id + '/hot-day', {
            day: _ownerHotDay, pct: pct,
            times: (pct && _ownerHotTimes && _ownerHotTimes.length) ? _ownerHotTimes : null,
        }).then(function (rr) {
            if (!rr || !rr.ok) {
                _haptic('error');
                var m = { forbidden: 'Управлять скидками может только владелец оффера',
                    out_of_horizon: 'Скидку можно назначить максимум на ' + ((_calData[l.id] || {}).horizon_days || 180) + ' дней вперёд',
                    no_slots: 'У оффера не настроены слоты по времени — назначь скидку на весь день',
                    bad_times: 'Выбранные времена не совпадают со слотами оффера',
                    month_closed: 'Месяц закрыт для рекламы — открой его в режиме «Занятость»',
                    day_busy: 'День занят — скидка на проданную дату не ставится' };
                uiAlert(m[rr && rr.error] || 'Не удалось сохранить скидку');
                return;
            }
            _haptic('success'); toast(pct ? 'Скидка сохранена — покупатели увидят дату жёлтой' : 'Скидка с даты убрана');
            _ownerHotDay = null; _ownerHotPct = null; _ownerHotTimes = null;
            delete _calData[l.id];
            var ds = rr.days || {};
            l.hot_manual = !!Object.keys(ds).length;
            if (l.hot_manual) { l.hot_discount_pct = Math.max.apply(null, Object.keys(ds).map(function (k) { return ds[k].pct || 0; })); }
            loadCal(box, l, 'edit');
            if (_subTab === 'mine') { try { paintMine(); } catch (e) { } }
        }).catch(function () { _haptic('error'); uiAlert('Не удалось сохранить'); });
    }
    function _ownerSlotsHtml(l, r) {
        var cfg = r.slot_config || null;
        var onSet = {}; ((cfg && cfg.times) || []).forEach(function (t) { onSet[t.t] = 1; });
        var presets = _SLOT_PRESETS.slice();
        Object.keys(onSet).forEach(function (t) { if (presets.indexOf(t) < 0) presets.push(t); });
        presets.sort();
        var chips = presets.map(function (t) {
            return '<button type="button" class="fmx-tchip' + (onSet[t] ? ' on' : '') + '" data-tc="' + t + '">' + t + '</button>';
        }).join('');
        var h = '<div class="fmx-tsetup"><div class="fmx-tsh"><i class="ti ti-clock"></i> Слоты по времени</div>' +
            '<div class="fmx-tshint">Отметь времена, в которые продаёшь размещения — покупатель выберет свободный слот.</div>' +
            '<div class="fmx-tchips">' + chips + '</div>' +
            '<div class="fmx-tswrow"><span>Только 1 выход в сутки<i>эксклюзив для премиум-каналов</i></span><div class="fmx-tsw2' + (cfg && cfg.one_per_day ? ' on' : '') + '" id="fmx-oneDay"></div></div>';
        if (Object.keys(onSet).length) {
            h += '<button class="fmx-btn fmx-tsave" id="fmx-slotSave"><i class="ti ti-check"></i> Сохранить слоты</button>';
            if (_ownerSelDay) {
                var bt = _busyTimes(r);
                var rows = cfg.times.map(function (t) {
                    var tm = _tmin(t.t), isBusy = !!bt[_ownerSelDay + '|' + tm], pk = _inPeak(l, tm);
                    return '<div class="fmx-tsl' + (pk ? ' peak' : '') + '" data-otog="' + tm + '"><span class="tm">' + t.t + '</span>' +
                        (pk ? '<span class="fmx-peaktag">час пик</span>' : '') +
                        '<span class="st">' + (isBusy ? 'Занято' : 'Свободно') + '</span>' +
                        '<div class="fmx-osw' + (isBusy ? ' busy' : '') + '"></div></div>';
                }).join('');
                h += '<div class="fmx-tslots" style="margin-top:10px;"><div class="fmx-tslh"><i class="ti ti-calendar"></i> Занятость · ' + _fmtDayRu(_ownerSelDay) + '</div>' + rows + '</div>';
            } else {
                h += '<div class="fmx-tshint" style="margin-top:8px;"><i class="ti ti-hand-finger"></i> Тапни день в календаре — отметишь занятые слоты этого дня.</div>';
            }
        } else {
            h += '<button class="fmx-btn fmx-tsave" id="fmx-slotSave"><i class="ti ti-plus"></i> Включить слоты по времени</button>';
        }
        return h + '</div>';
    }
    function _saveSlotConfig(box, l) {
        var times = qsa(box, '.fmx-tchip.on').map(function (c) { return { t: c.getAttribute('data-tc'), prime: false }; });
        var od = box.querySelector('#fmx-oneDay');
        var oneDay = !!(od && od.classList.contains('on'));
        apiPost('/api/v1/marketplace/listings/' + l.id + '/slots/config', { times: times, one_per_day: oneDay, prime_pct: 0 }).then(function (rr) {
            if (!rr || !rr.ok) { _haptic('error'); uiAlert('Не удалось сохранить слоты'); return; }
            _calData[l.id].slot_config = rr.slot_config;
            if (!rr.slot_config) _ownerSelDay = null;
            _haptic('light'); toast(rr.slot_config ? 'Слоты по времени сохранены' : 'Слоты по времени выключены');
            calDraw(box, l, 'edit');
        }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
    }
    function _bindOwnerSlots(box, l) {
        qsa(box, '.fmx-tchip').forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('on'); _haptic('light'); }); });
        var od = box.querySelector('#fmx-oneDay'); if (od) od.addEventListener('click', function () { od.classList.toggle('on'); _haptic('light'); });
        var sv = box.querySelector('#fmx-slotSave'); if (sv) sv.addEventListener('click', function () { _saveSlotConfig(box, l); });
        qsa(box, '.fmx-tsl[data-otog]').forEach(function (b) {
            b.addEventListener('click', function () {
                var tm = +b.getAttribute('data-otog');
                apiPost('/api/v1/marketplace/listings/' + l.id + '/slots/time-toggle', { day: _ownerSelDay, tmin: tm }).then(function (rr) {
                    if (!rr || !rr.ok) { _haptic('error'); uiAlert('Не удалось изменить слот'); return; }
                    var r = _calData[l.id]; r.busy_times = r.busy_times || [];
                    var key = _ownerSelDay + '|' + tm;
                    if (rr.busy) { if (r.busy_times.indexOf(key) < 0) r.busy_times.push(key); }
                    else { r.busy_times = r.busy_times.filter(function (x) { return x !== key; }); }
                    _haptic('light'); _refreshOwnerExtra(box, l);
                }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
            });
        });
    }
    function _refreshOwnerExtra(box, l) {
        var ex = box.querySelector('#fmx-ownerExtra');
        if (!ex) { calDraw(box, l, 'edit'); return; }
        var r = _calData[l.id];
        ex.innerHTML = _ownerSlotsHtml(l, r);
        _bindOwnerSlots(box, l);
        if (_ownerSelDay) {
            var cell = box.querySelector('.fmx-sd[data-cd="' + _ownerSelDay + '"]');
            if (cell) { var old = cell.querySelector('.fmx-sdots'); if (old) old.remove(); var h = _dayDots(r, _ownerSelDay); if (h) cell.insertAdjacentHTML('beforeend', h); }
        }
    }

    function loadBuyerSlots(box, l, done) {
        if (!box || !l.id) return;
        apiGet('/api/v1/marketplace/listings/' + l.id + '/slots').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = ''; return; }
            _calData[l.id] = r;
            drawBuyerSlots(box, l);
            if (done) done(r);
        }).catch(function () { box.innerHTML = ''; });
    }
    function drawBuyerSlots(box, l) {
        var r = _calData[l.id];
        if (!r) return;
        var kept = !!(r.slots_updated_at || (r.busy && r.busy.length));
        if (!kept) {
            box.innerHTML = '<div style="display:flex;gap:8px;align-items:flex-start;font-size:11.5px;color:#8990a8;line-height:1.5;">' +
                '<i class="ti ti-calendar-question" style="color:#565b73;flex:0 0 auto;margin-top:1px;"></i>' +
                '<span>Владелец не заполнил календарь — уточни даты в сообщении.</span></div>';
            return;
        }
        var busy = {}; (r.busy || []).forEach(function (x) { busy[x] = 1; });
        var demand = r.demand || {};
        var watch = {}; (r.watch || []).forEach(function (x) { watch[x] = 1; });
        var hot = {}; ((r.hot && r.hot.days) || []).forEach(function (x) { hot[x] = 1; });
        var om = r.open_months || [];
        var _dOpen = function (iso) { return om.indexOf(iso.slice(0, 7)) >= 0; };
        var _hz = r.horizon_days || 180;
        var d0 = new Date(); d0.setHours(12, 0, 0, 0);
        var freeFrom = null, dd = new Date(d0);
        for (var k = 0; k < _hz; k++) { var isoK = _isoOf(dd); if (!busy[isoK] && _dOpen(isoK)) { freeFrom = isoK; break; } dd.setDate(dd.getDate() + 1); }
        var WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        var h = '<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;margin-bottom:9px;">' +
            (freeFrom ? '<span style="color:#5DCAA5;">●</span><span id="fmx-freeFrom" style="color:#5DCAA5;font-weight:600;cursor:pointer;text-decoration:underline dotted rgba(93,202,165,0.5);">Свободно с ' + _fmtDayRu(freeFrom) + ' ›</span>' : (!om.length ? '<span style="color:#8990a8;">●</span><span style="color:#8990a8;font-weight:600;">Владелец пока не открыл даты для продажи</span>' : '<span style="color:#ef8080;">●</span><span style="color:#ef8080;font-weight:600;">Открытые даты заняты</span>')) +
            (r.slots_updated_at ? '<span style="margin-left:auto;font-size:10px;color:#565b73;">Обновлён ' + _agoDay(r.slots_updated_at) + '</span>' : '') + '</div>';
        h += '<div class="fmx-d14 num">';
        var MO = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        var d = new Date(d0);
        for (var i = 0; i < 45; i++) {
            var iso = _isoOf(d);
            var isBusy = !!busy[iso];
            var offD = !_dOpen(iso);
            var cls = 'fmx-dd ' + (offD ? 'off' : (isBusy ? 'bs' : 'fr'));
            if (!offD && !isBusy && hot[iso]) cls += ' hot';
            if (!offD && !isBusy && _lsSel && _lsSel.day === iso) cls += ' sel';
            if (!offD && isBusy && watch[iso]) cls += ' watch';
            var wlab = d.getDate() === 1 ? '<div class="w" style="color:#c9cbe0;font-weight:800;">' + MO[d.getMonth()] + '</div>' : '<div class="w">' + WD[d.getDay()] + '</div>';
            h += '<div class="' + cls + '"' + (offD ? '' : ' data-bd="' + iso + '"') + '><div class="c">' + d.getDate() + (!offD && demand[iso] ? '<i class="dm" style="position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#818cf8;"></i>' : '') + '</div>' +
                ((isBusy || offD) ? '' : _dayDots(r, iso)) + wlab + '</div>';
            d.setDate(d.getDate() + 1);
        }
        h += '</div>' +
            '<div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:#8990a8;flex-wrap:wrap;">' +
            '<span><i style="display:inline-block;width:8px;height:8px;border-radius:3px;background:rgba(93,202,165,0.5);"></i> свободно</span>' +
            '<span><i style="display:inline-block;width:8px;height:8px;border-radius:3px;background:rgba(239,128,128,0.5);"></i> занято</span>' +
            (r.hot ? '<span><i style="display:inline-block;width:8px;height:8px;border-radius:3px;background:rgba(245,191,79,0.6);"></i> горящие ' + (r.hot.map ? 'до ' : '') + '−' + r.hot.pct + '%</span>' : '') +
            '<span style="margin-left:auto;">тап по дню → дата в сообщении</span></div>' +
            '<div id="fmx-buyerExtra">' + _buyerSlotsHtml(l, r) + _basketHtml(l) + '</div>' +
            '<button class="fmx-btn fmx-slmore" id="fmx-calMonth"><i class="ti ti-calendar-month"></i> Весь месяц</button>' +
            '<div id="fmx-calFull" style="display:none;margin-top:10px;"></div>';
        var prevStrip = box.querySelector('.fmx-d14');
        var prevScroll = prevStrip ? prevStrip.scrollLeft : 0;
        box.innerHTML = h;
        var strip = box.querySelector('.fmx-d14');
        if (strip) {
            _hscrollify(strip, true);
            if (prevScroll) strip.scrollLeft = prevScroll;
        }
        _bindBuyerSlots(box, l);
        _bindBasket(box, l);
        qsa(box, '[data-bd]').forEach(function (b) {
            b.addEventListener('click', function () {
                var iso = b.getAttribute('data-bd');
                if (busy[iso]) { _calWatchBuyer(box, l, iso); return; }
                if (_lsSel.day !== iso) _lsSel.time = null;
                if ((_lsSel.basket || []).some(function (x) { return x.day === iso; })) {
                    _lsSel.day = null; toast('Эта дата уже в заявке'); _haptic('light'); _refreshBuyerExtra(box, l); _redrawFullIfOpen(box, l); return;
                }
                _lsSel.day = iso;
                _haptic('light');
                _refreshBuyerExtra(box, l);
                _redrawFullIfOpen(box, l);
                var dq = demand[iso];
                toast(dq ? 'Дата выбрана. На неё уже ' + dq + ' ' + _plural(dq, 'запрос', 'запроса', 'запросов') + ' за неделю'
                         : 'Дата выбрана — кнопка «Написать» обновилась');
            });
        });
        var mBtn = box.querySelector('#fmx-calMonth');
        if (mBtn) mBtn.addEventListener('click', function () {
            var full = box.querySelector('#fmx-calFull');
            var open = full.style.display !== 'none';
            if (open) { full.style.display = 'none'; mBtn.innerHTML = '<i class="ti ti-calendar-month"></i> Весь месяц'; }
            else {
                if (!full._ym && freeFrom) full._ym = { y: +freeFrom.slice(0, 4), m: +freeFrom.slice(5, 7) - 1 };
                full.style.display = 'block';
                mBtn.innerHTML = '<i class="ti ti-chevron-up"></i> Свернуть месяц';
                calDraw(full, l, 'view');
            }
            _haptic('light');
        });
        var ffEl = box.querySelector('#fmx-freeFrom');
        if (ffEl) ffEl.addEventListener('click', function () {
            var full = box.querySelector('#fmx-calFull'); if (!full || !freeFrom) return;
            full._ym = { y: +freeFrom.slice(0, 4), m: +freeFrom.slice(5, 7) - 1 };
            full.style.display = 'block';
            var mb = box.querySelector('#fmx-calMonth'); if (mb) mb.innerHTML = '<i class="ti ti-chevron-up"></i> Свернуть месяц';
            calDraw(full, l, 'view');
            _haptic('light');
        });
    }
    function _redrawFullIfOpen(box, l) {
        var full = box.querySelector('#fmx-calFull');
        if (full && full.style.display !== 'none') calDraw(full, l, 'view');
    }
    function _calWatchBuyer(box, l, iso) {
        apiPost('/api/v1/marketplace/listings/' + l.id + '/date_watch', { day: iso }).then(function (rr) {
            if (!rr || !rr.ok) { if (rr && rr.error === 'self') toast('Это твой оффер — даты меняются в кабинете', true); return; }
            var r = _calData[l.id];
            if (rr.on) { (r.watch = r.watch || []).push(iso); toast('Сообщим в бота, когда владелец освободит эту дату'); }
            else { r.watch = (r.watch || []).filter(function (x) { return x !== iso; }); toast('Слежение за датой снято'); }
            _haptic('light');
            var _wasOpen = (function () { var f = box.querySelector('#fmx-calFull'); return f && f.style.display !== 'none'; })();
            drawBuyerSlots(box, l);
            if (_wasOpen) { var _f2 = box.querySelector('#fmx-calFull'); if (_f2) _f2.style.display = 'block'; var _mb = box.querySelector('#fmx-calMonth'); if (_mb) _mb.innerHTML = '<i class="ti ti-chevron-up"></i> Свернуть месяц'; }
            _redrawFullIfOpen(box, l);
        }).catch(function () {});
    }

    function loadCal(box, l, mode, done) {
        if (!box || !l.id) return;
        apiGet('/api/v1/marketplace/listings/' + l.id + '/slots').then(function (r) {
            if (!r || !r.ok) { box.innerHTML = ''; return; }
            _calData[l.id] = r;
            calDraw(box, l, mode);
            if (done) done(r);
        }).catch(function () { box.innerHTML = ''; });
    }
    function renderSlotsBox(l, boxEl) { loadCal(boxEl || el('fmx-slotsBox'), l, 'edit'); }

    function _tabBg(json) {
        var bg = json && json.bg;
        if (bg && bg.k === 'p' && /^[a-z0-9]{2,8}$/.test(String(bg.id || ''))) return { cls: ' tbg-' + bg.id, st: '' };
        if (bg && bg.k === 'c' && /^#[0-9a-fA-F]{6}$/.test(String(bg.c || ''))) return { cls: '', st: 'background:' + bg.c + ';' };
        return { cls: '', st: '' };
    }
    function _elColor(e) {
        return (e.c && /^#[0-9a-fA-F]{6}$/.test(String(e.c))) ? 'color:' + e.c + ';' : '';
    }
    function _elMode(e) { return e.m === 'b' ? ' mb' : (e.m === 't' ? ' mt' : ''); }
    function _tabStkInner(e) {
        if (!e.s || String(e.s).indexOf('/media/') !== 0) return null;
        if (e.sk === 'webm') return '<video src="' + _esc(mediaAbs(e.s)) + '" muted playsinline loop autoplay preload="auto"></video>';
        if (e.sk === 'tgs') return '<span class="fmx-stk-lot" data-tgs="' + _esc(e.s) + '" data-anim="1"><i class="ti ti-sticker"></i></span>';
        return '<img src="' + _esc(mediaAbs(e.s)) + '" alt="" draggable="false">';
    }
    function renderTablo(json, mount, opts) {
        opts = opts || {};
        var els = (json && json.els) || [];
        if (!els.length) { mount.innerHTML = ''; return false; }
        var bg = _tabBg(json);
        var h = '<div class="fmx-tabvp' + (opts.cut === false ? ' noext' : '') + '"><div class="fmx-tab' + bg.cls + '" style="' + bg.st + '">';
        els.forEach(function (e) {
            var st = 'left:' + e.x + '%;top:' + e.y + '%;width:' + e.w + '%;' +
                (e.rot ? 'transform:rotate(' + e.rot + 'deg);' : '');
            var md = _elMode(e);
            if (e.t === 'title') h += '<div class="el ttl' + md + '" style="' + st + _elColor(e) + 'font-size:' + (e.fs || 16) + 'px;">' + _esc(e.s) + '</div>';
            else if (e.t === 'text') h += '<div class="el txt' + md + '" style="' + st + _elColor(e) + 'font-size:' + (e.fs || 11) + 'px;">' + _esc(e.s) + '</div>';
            else if (e.t === 'stk') {
                var sm = _tabStkInner(e);
                if (sm) h += '<div class="el stkm' + md + '" style="' + st + 'height:' + e.h + '%;">' + sm + '</div>';
                else h += '<div class="el stk' + md + '" style="' + st + 'font-size:' + Math.round((e.fs || 12) * 2.6) + 'px;">' + _esc(e.s) + '</div>';
            }
            else if (e.t === 'img') h += '<div class="el med' + md + '" style="' + st + 'height:' + e.h + '%;"><img loading="lazy" decoding="async" src="' + _esc(mediaAbs(e.u)) + '" alt=""></div>';
            else if (e.t === 'video') h += '<div class="el med' + md + '" style="' + st + 'height:' + e.h + '%;"><video src="' + _esc(mediaAbs(e.u)) + '" muted autoplay loop playsinline preload="metadata"></video></div>';
        });
        h += '<div class="fmx-tabfade"></div></div></div>';
        if (opts.cut !== false) h += '<div class="fmx-tabmw"><button class="fmx-tabmore">Развернуть</button></div>' +
            '<button class="fmx-btn fmx-tabless" style="display:none;margin:8px auto 0;"><i class="ti ti-chevron-up"></i> Свернуть витрину</button>';
        mount.innerHTML = h;
        try { hydrateTgs(mount); } catch (e9) {}
        _forcePlay(mount);
        var vp = mount.querySelector('.fmx-tabvp');
        var more = mount.querySelector('.fmx-tabmore'), less = mount.querySelector('.fmx-tabless');
        if (more) more.addEventListener('click', function () {
            vp.classList.add('open'); more.parentNode.style.display = 'none';
            if (less) less.style.display = 'flex'; _haptic('light');
        });
        if (less) less.addEventListener('click', function () {
            vp.classList.remove('open'); less.style.display = 'none';
            var mw = mount.querySelector('.fmx-tabmw'); if (mw) mw.style.display = 'flex'; _haptic('light');
        });
        return true;
    }

    function _ensurePeek() {
        if (el('fmx-peek')) return;
        var pk = document.createElement('div'); pk.id = 'fmx-peek';
        pk.innerHTML = '<div class="in"><div id="fmx-peekIn"></div></div>';
        document.body.appendChild(pk);
    }
    function bindPeek(host) {
        _ensurePeek();
        var t = null;
        qsa(host, '.fmx-card[data-u], .fmx-li[data-u]').forEach(function (c) {
            c.addEventListener('pointerdown', function () {
                clearTimeout(t);
                t = setTimeout(function () {
                    var l = findListing(c.getAttribute('data-u'));
                    if (!l) return;
                    var ok = renderTablo(l.expand_content_json, el('fmx-peekIn'), { cut: false });
                    if (!ok) el('fmx-peekIn').innerHTML = '<div style="padding:28px 20px;text-align:center;background:#10131f;"><div style="font-size:22px;">🎬</div><div style="font-size:12px;color:#8990a8;margin-top:8px;line-height:1.5;">Владелец пока не оформил витрину оффера</div></div>';
                    el('fmx-peek').style.display = 'flex';
                    c.__peeked = true;
                    _haptic('light');
                }, 450);
            });
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
                c.addEventListener(ev, function () { clearTimeout(t); el('fmx-peek').style.display = 'none'; });
            });
        });
    }

    var _lsSel = { fmt: null, price: null, day: null, l: null, edited: false };
    function _ensureSheets() {
        if (el('fmx-shbg')) return;
        var bg = document.createElement('div'); bg.className = 'fmx-shbg'; bg.id = 'fmx-shbg';
        document.body.appendChild(bg);
        bg.addEventListener('click', closeSheet);
        var sh = document.createElement('div'); sh.className = 'fmx-sheet'; sh.id = 'fmx-writeSheet';
        document.body.appendChild(sh);
    }
    function _sheetOwn(name) {
        var sh = el('fmx-writeSheet');
        if (sh) sh.setAttribute('data-own', name);
    }
    function _sheetIs(name) {
        var sh = el('fmx-writeSheet');
        return !!(sh && sh.classList.contains('on') && sh.getAttribute('data-own') === name);
    }
    function closeSheet() {
        var b = el('fmx-shbg'); if (b) b.classList.remove('on');
        qsa(document, '.fmx-sheet').forEach(function (x) { x.classList.remove('on'); });
    }
    function _slotLabel(x) { return _fmtDayRu(x.day) + (x.time != null ? ' ' + _fmtT(x.time) : ''); }
    function _writeText() {
        var f = _lsSel;
        var items = (f.basket || []).slice();
        if (f.day) items.push({ day: f.day, time: f.time });
        var t = 'Здравствуйте. Интересует размещение в вашем канале: формат ' + f.fmt;
        if (items.length > 1) {
            t += '. Интересуют даты: ' + items.map(_slotLabel).join(', ') + '.';
            var anyHot = f.l && items.some(function (x) { return _hotPct(f.l, x.day, x.time) != null; });
            t += f.price ? ' Ориентир по прайсу ' + _num(f.price) + ' ₽ за размещение' + (anyHot ? ' (на части дат действует скидка — итог уточним)' : '') + '. Подтвердите свободные слоты.' : ' Пришлите условия размещения.';
        } else if (items.length === 1) {
            var tm = items[0].time != null ? _fmtT(items[0].time) : null;
            t += ', дата ' + _fmtDayRu(items[0].day) + (tm ? ', время ' + tm : '');
            var _p1 = f.price != null && f.l ? _hotPrice(f.l, f.price, items[0].day, items[0].time) : f.price;
            var _hp1 = f.price != null && f.l ? _hotPct(f.l, items[0].day, items[0].time) : null;
            t += f.price ? ', по прайсу ' + _num(_p1) + ' ₽' + (_hp1 ? ' (с учётом скидки −' + _hp1 + '%)' : '') + '.' : '. Пришлите условия размещения.';
            if (f.price) t += ' Подтвердите, свободн' + (tm ? ' ли слот' : 'а ли дата') + '.';
        } else {
            t += f.price ? ', по прайсу ' + _num(f.price) + ' ₽.' : '. Пришлите условия размещения.';
            t += ' Какие даты свободны в ближайшие две недели?';
        }
        return t;
    }
    function _basketHtml(l) {
        var f = _lsSel, chips = (f.basket || []).map(function (x, i) {
            return '<span class="fmx-bchip" data-bi="' + i + '">' + _slotLabel(x) + ' <i class="ti ti-x"></i></span>';
        }).join('');
        var addBtn = f.day ? '<button class="fmx-baddbtn" id="fmx-badd"><i class="ti ti-plus"></i> Добавить ещё дату к заявке</button>' : '';
        if (!chips && !addBtn) return '';
        return '<div class="fmx-basket">' + (chips ? '<div class="fmx-bchips"><span class="fmx-blbl">Заявка на ' + ((f.basket || []).length + (f.day ? 1 : 0)) + ':</span>' + chips + '</div>' : '') + addBtn + '</div>';
    }
    function _bindBasket(box, l) {
        var addB = box.querySelector('#fmx-badd');
        if (addB) addB.addEventListener('click', function () {
            if (!_lsSel.day) return;
            _lsSel.basket = _lsSel.basket || [];
            var key = _lsSel.day + '|' + (_lsSel.time == null ? '' : _lsSel.time);
            if (!_lsSel.basket.some(function (x) { return (x.day + '|' + (x.time == null ? '' : x.time)) === key; }))
                _lsSel.basket.push({ day: _lsSel.day, time: _lsSel.time });
            _lsSel.day = null; _lsSel.time = null;
            _haptic('light'); _refreshBuyerExtra(box, l);
            toast('Дата добавлена в заявку — выбери ещё или нажми «Написать»');
        });
        qsa(box, '.fmx-bchip').forEach(function (c) {
            c.addEventListener('click', function () {
                _lsSel.basket.splice(+c.getAttribute('data-bi'), 1);
                _haptic('light'); _refreshBuyerExtra(box, l);
            });
        });
    }
    function _hotPct(l, dayIso, tmin) {
        var r = _calData[l.id];
        if (!r || !r.hot || !r.hot.map || !dayIso) return null;
        var e = r.hot.map[dayIso];
        if (!e || !e.pct) return null;
        if (e.times && e.times.length) { if (tmin == null || e.times.indexOf(+tmin) < 0) return null; }
        return e.pct;
    }
    function _hotPrice(l, price, dayIso, tmin) {
        var p = _hotPct(l, dayIso, tmin);
        return p ? Math.round(price * (100 - p) / 100) : price;
    }
    function openWriteSheet(l) {
        _ensureSheets();
        var f = _lsSel;
        if (f.l !== l) { _initSel(l); f = _lsSel; }
        var sh = el('fmx-writeSheet');
        var fmts = (l.formats || []).filter(function (x) { return x.price; });
        var priceNow = f.price != null ? _hotPrice(l, f.price, f.day, f.time) : null;
        var _wpHtml = function (full, now) {
            if (now == null) return '';
            if (full != null && now < full) {
                var _pp = _hotPct(l, f.day, f.time);
                return 'По прайсу: <s style="color:#565b73;">' + _num(full) + '</s> <b style="color:#f5bf4f;">' + _num(now) + ' ₽</b>' + (_pp ? ' <span style="color:#f5bf4f;font-size:10px;">−' + _pp + '%</span>' : '');
            }
            return 'По прайсу: <b>' + _num(now) + ' ₽</b>';
        };
        sh.innerHTML = '<div class="grip"></div><h3>Сообщение владельцу канала</h3>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12px;font-weight:700;">' + _esc(l.title || l.username) +
            '<span style="font-size:10px;color:#8990a8;font-weight:500;">@' + _esc(l.username) + '</span></div>' +
            (fmts.length ? '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:12px;" id="fmx-wf">' + fmts.map(function (x) {
                var lb = x.label || x.format;
                return '<button class="fmx-seg' + ((lb === f.fmt) ? ' on' : '') + '" data-f="' + _esc(lb) + '" data-p="' + x.price + '">' + _esc(lb) + ' · ' + _num(x.price) + ' ₽</button>';
            }).join('') + '</div>' : '') +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;" class="num">' +
            '<span>Дата: <b id="fmx-wd">' + ((f.basket && f.basket.length) ? (f.basket.length + (f.day ? 1 : 0)) + ' ' + _plural(f.basket.length + (f.day ? 1 : 0), 'дата', 'даты', 'дат') : (f.day ? _fmtDayRu(f.day) + (f.time != null ? ' ' + _fmtT(f.time) : '') : 'уточню в чате')) + '</b></span>' +
            '<button class="fmx-seg" id="fmx-wchg" style="min-height:28px;padding:4px 10px;">Изменить</button>' +
            '<span style="margin-left:auto;" id="fmx-wp">' + _wpHtml(f.price, priceNow) + '</span></div>' +
            '<textarea class="fmx-inp" id="fmx-wtext" rows="4" style="margin-top:10px;width:100%;line-height:1.55;resize:none;"></textarea>' +
            '<button class="fmx-save" id="fmx-wgo" style="margin-top:10px;"><i class="ti ti-brand-telegram"></i> Скопировать и открыть чат</button>' +
            '<button class="fmx-btn" id="fmx-wcopy" style="width:100%;margin-top:8px;">Скопировать текст</button>' +
            '<div style="font-size:10px;color:#565b73;text-align:center;margin-top:8px;line-height:1.5;">Текст скопируется — вставь его в чате. Оффер добавится в закладки со статусом «Написал»</div>';
        el('fmx-wtext').value = _writeText();
        el('fmx-wtext').addEventListener('input', function () { _lsSel.edited = true; });
        qsa(sh, '#fmx-wf .fmx-seg').forEach(function (b) {
            b.addEventListener('click', function () {
                qsa(sh, '#fmx-wf .fmx-seg').forEach(function (x) { x.classList.remove('on'); });
                b.classList.add('on');
                _lsSel.fmt = b.getAttribute('data-f'); _lsSel.price = parseInt(b.getAttribute('data-p'), 10);
                var pn = _hotPrice(l, _lsSel.price, _lsSel.day, _lsSel.time);
                el('fmx-wp').innerHTML = _wpHtml(_lsSel.price, pn);
                if (!_lsSel.edited) el('fmx-wtext').value = _writeText();
                _syncWriteBtn(l);
            });
        });
        el('fmx-wchg').addEventListener('click', function () {
            closeSheet();
            var cb = el('fmx-slotsBox');
            if (cb) cb.scrollIntoView({ behavior: 'smooth', block: 'center' });
            toast('Выбери свободный день в календаре');
        });
        function _send(openChat) {
            var txt = el('fmx-wtext').value;
            copyText(txt);
            trackListing(l.id, 'write');
            if (_lsSel.day) apiPost('/api/v1/marketplace/listings/' + l.id + '/date_demand', { day: _lsSel.day }).catch(function () {});
            apiPost('/api/v1/marketplace/bookmarks/status', { username: l.username, status: 'wrote' }).then(function () {
                _bookmarks[l.username] = true; updateBmCount();
            }).catch(function () {});
            if (openChat) { closeSheet(); openTg(l.username); }
            else toast('Текст скопирован');
        }
        el('fmx-wgo').addEventListener('click', function () { _send(true); });
        el('fmx-wcopy').addEventListener('click', function () { _send(false); });
        el('fmx-shbg').classList.add('on');
        sh.classList.add('on');
    }
    function _initSel(l) {
        var best = null, _rv = _reach(l);
        (l.formats || []).forEach(function (x) {
            if (!x.price || !_rv) return;
            var cpm = x.price / _rv * 1000;
            if (!best || cpm < best.cpm) best = { fmt: x.label || x.format, price: x.price, cpm: cpm };
        });
        var f0 = (l.formats || [])[0] || {};
        _lsSel = {
            l: l, edited: false, day: null, time: null, basket: [],
            fmt: (best ? best.fmt : (f0.label || f0.format || 'размещение')),
            price: (best ? best.price : (f0.price || null))
        };
    }
    function _syncWriteBtn(l) {
        var b = el('fmx-lsGo'); if (!b) return;
        var f = _lsSel, tm = (f.time != null) ? _fmtT(f.time) : null, bn = (f.basket || []).length;
        var label = 'Написать';
        if (bn > 0) { var total = bn + (f.day ? 1 : 0); label += ': ' + total + ' ' + _plural(total, 'дата', 'даты', 'дат'); }
        else if (f.day || f.fmt) label += ': ' + [(f.day ? _fmtDayRu(f.day) + (tm ? ' ' + tm : '') : null), f.fmt].filter(Boolean).join(' · ');
        b.innerHTML = '<i class="ti ti-brand-telegram"></i> ' + label;
    }

    var _ted = { l: null, els: [], sel: -1, bg: null };
    var _TED_STK = ['🚀', '🔥', '💎', '⚡', '🎯', '📈', '💰', '🏆', '⭐', '✅',
        '💼', '📊', '📣', '🧲', '🎁', '🛒', '👑', '💡', '🔔', '🤝',
        '📌', '✨', '💯', '🎉', '📅', '🔗', '🎬', '🧠', '🧬', '🌐',
        '💳', '🏦', '📱', '💻', '🤖', '🎮', '⚽', '💪', '🎓', '📚',
        '🎵', '🎤', '🎥', '📷', '🍕', '☕', '👗', '💄', '✈️', '🏝️',
        '🚗', '🏠', '🧸', '🐶', '📰', '🎲', '📦', '🌿'];
    var _TED_BG = [
        { id: 'g1', n: 'Изумруд' }, { id: 'g2', n: 'Ультрафиолет' }, { id: 'mid', n: 'Полночь' },
        { id: 'net', n: 'Сетка' }, { id: 'aur', n: 'Аврора' }, { id: 'coal', n: 'Уголь' },
        { id: 'ocean', n: 'Океан' }, { id: 'sunset', n: 'Закат' }, { id: 'lime', n: 'Лайм' },
        { id: 'rose', n: 'Роза' }, { id: 'steel', n: 'Сталь' }, { id: 'space', n: 'Космос' },
        { id: 'waves', n: 'Волны' }, { id: 'amber', n: 'Янтарь' }
    ];

    function openTabloEditor(l) {
        _ted.l = l;
        _ted.els = ((l.expand_content_json && l.expand_content_json.els) || []).map(function (e) {
            return JSON.parse(JSON.stringify(e));
        });
        _ted.bg = (l.expand_content_json && l.expand_content_json.bg) ? JSON.parse(JSON.stringify(l.expand_content_json.bg)) : null;
        _ted.sel = -1;
        if (!el('fmx-tedBg')) {
            var bg = document.createElement('div'); bg.className = 'fmx-mbg'; bg.id = 'fmx-tedBg';
            bg.innerHTML = '<div class="fmx-modal" style="max-width:440px;">' +
                '<div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-layout-collage" style="color:#f5bf4f;"></i> Витрина оффера</h2>' +
                '<p>Свободный холст: перетаскивай, растягивай за угол, поворачивай за верхнюю точку, крестик — удалить</p></div>' +
                '<button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
                '<div class="fmx-mbody" id="fmx-tedBody"></div></div>';
            document.body.appendChild(bg);
            bg.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-tedBg'); });
        }
        _tedPaint();
        showModal('fmx-tedBg');
    }

    function _tedPaint() {
        var body = el('fmx-tedBody'); if (!body) return;
        body.innerHTML =
            '<div class="fmx-tedhelp fmx-tedwhy" style="margin:0 0 12px;"><div class="th"><i class="ti ti-sparkles" style="color:#818cf8;"></i> Витрина — презентация твоего оффера</div>' +
            '<div style="font-size:10.5px;line-height:1.6;color:#c9cbe0;">Закупщик видит её в развороте сразу после метрик. Это твоё рекламное пространство: покажи, почему размещение у тебя окупится.</div>' +
            '<ul>' +
            '<li>скриншоты статистики: охваты, прирост, вовлечённость;</li>' +
            '<li>примеры интеграций и их результаты в цифрах;</li>' +
            '<li>сильные стороны аудитории: гео, платёжеспособность, ниша;</li>' +
            '<li>форматы, условия, бонус при заказе серии размещений;</li>' +
            '<li>короткое видео-знакомство с каналом.</li>' +
            '</ul></div>' +
            '<div class="fmx-tedbar">' +
            '<button class="fmx-seg" id="fmx-tedBgBtn"><i class="ti ti-palette"></i> Фон</button>' +
            '<button class="fmx-seg" data-tadd="title"><i class="ti ti-h-1"></i> Заголовок</button>' +
            '<button class="fmx-seg" data-tadd="text"><i class="ti ti-text-caption"></i> Текст</button>' +
            '<button class="fmx-seg" data-tadd="img"><i class="ti ti-photo"></i> Фото/гиф</button>' +
            '<button class="fmx-seg" data-tadd="video"><i class="ti ti-video"></i> Видео</button>' +
            '<button class="fmx-seg" data-tadd="stk"><i class="ti ti-sticker"></i> Стикер</button>' +
            '</div>' +
            '<div class="fmx-tabvp noext" style="margin-top:10px;"><div class="fmx-tab fmx-tabed" id="fmx-tedCv"></div></div>' +
            '<div id="fmx-tedRow" style="display:flex;gap:7px;margin-top:10px;align-items:center;flex-wrap:wrap;"></div>' +
            '<button class="fmx-save" id="fmx-tedSave" style="margin-top:12px;"><i class="ti ti-device-floppy"></i> Сохранить витрину</button>' +
            '<div style="font-size:10px;color:#565b73;margin-top:7px;line-height:1.5;">До 12 элементов. Закупщик видит верхнюю половину, остальное — по «Развернуть»</div>' +
            '<div class="fmx-tedhelp"><div class="th"><i class="ti ti-info-circle" style="color:#818cf8;"></i> Как оформить витрину</div><ol>' +
            '<li><b>Фон</b> — первая кнопка: 14 готовых градиентов или свой цвет через палитру.</li>' +
            '<li><b>Добавь элемент</b>: заголовок, текст, фото/гиф, видео или стикер.</li>' +
            '<li><b>Стикеры</b> — твоя коллекция из бота: отправь боту стикер в личные сообщения, и он появится в списке. Плюс набор эмодзи.</li>' +
            '<li><b>Тап по элементу</b> — выбрать. Перетаскивай прямо пальцем: фон затемнится и появится сетка для ровной расстановки.</li>' +
            '<li><b>Угловая ручка</b> — размер, <b>верхняя точка</b> — поворот, <b>красный крестик</b> — удалить. Щипок двумя пальцами: размер и поворот одновременно.</li>' +
            '<li><b>Три точки под рамкой</b> — режим отображения: обычный, «Слияние» (полупрозрачный, вписывается в фон) и «Поверх» (выше всех элементов).</li>' +
            '<li><b>Повторный тап по выбранному тексту</b> — правка надписи; то же делает кнопка «Изменить текст» под холстом.</li>' +
            '<li><b>Зажми текст на секунду</b> — откроется передвижное окно цвета: спектр, оттенок, HEX и RGB; цветовые точки есть и под холстом.</li>' +
            '<li>Закупщик видит верхнюю половину витрины сразу, остальное — по кнопке «Развернуть». Самое важное размещай сверху.</li>' +
            '<li>Жми <b>«Сохранить витрину»</b> — изменения сразу видны в развороте оффера.</li>' +
            '</ol></div>' +
            '<input type="file" id="fmx-tedFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime" style="display:none;">';
        _tedDrawCanvas();
        qsa(body, '[data-tadd]').forEach(function (b) {
            b.addEventListener('click', function () { _tedAdd(b.getAttribute('data-tadd')); });
        });
        el('fmx-tedBgBtn').addEventListener('click', _tedBgSheet);
        el('fmx-tedSave').addEventListener('click', _tedSave);
        _hscrollify(body.querySelector('.fmx-tedbar'), true);
    }
    var _hsBars = [], _hsResizeBound = false;
    function _hscrollify(bar, tight) {
        if (!bar || bar.__hsb) return;
        bar.__hsb = true;
        bar.classList.add('fmx-hfade');
        var sb = document.createElement('div');
        sb.className = 'fmx-hsb' + (tight ? ' tight' : '');
        sb.innerHTML = '<i></i>';
        bar.parentNode.insertBefore(sb, bar.nextSibling);
        var th = sb.firstChild;
        function upd() {
            var need = bar.scrollWidth > bar.clientWidth + 4;
            sb.style.display = need ? 'block' : 'none';
            bar.classList.toggle('more', need && bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
            if (!need) return;
            th.style.width = Math.max(10, bar.clientWidth / bar.scrollWidth * 100) + '%';
            th.style.left = (bar.scrollLeft / bar.scrollWidth * 100) + '%';
        }
        bar.addEventListener('scroll', upd);
        setTimeout(upd, 0); setTimeout(upd, 400);
        bar.__hsUpd = upd;
        _hsBars.push(bar);
        if (!_hsResizeBound) {
            _hsResizeBound = true;
            try {
                window.addEventListener('resize', function () {
                    _hsBars = _hsBars.filter(function (b) { return b.isConnected; });
                    _hsBars.forEach(function (b) { if (b.__hsUpd) b.__hsUpd(); });
                });
            } catch (e) {}
        }
        var sbDrag = false;
        function sbTo(clientX) {
            var r = sb.getBoundingClientRect();
            var max = bar.scrollWidth - bar.clientWidth;
            if (max <= 0 || r.width <= 0) return;
            var thW = r.width * Math.max(0.1, bar.clientWidth / bar.scrollWidth);
            var f = (clientX - r.left - thW / 2) / Math.max(1, r.width - thW);
            bar.scrollLeft = Math.max(0, Math.min(max, f * max));
        }
        sb.addEventListener('pointerdown', function (ev) {
            ev.preventDefault();
            sbDrag = true;
            try { sb.setPointerCapture(ev.pointerId); } catch (e) {}
            sbTo(ev.clientX);
        });
        sb.addEventListener('pointermove', function (ev) { if (sbDrag) sbTo(ev.clientX); });
        ['pointerup', 'pointercancel'].forEach(function (evn) {
            sb.addEventListener(evn, function () { sbDrag = false; });
        });
        bar.addEventListener('wheel', function (ev) {
            if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)) { bar.scrollLeft += ev.deltaY; ev.preventDefault(); }
        }, { passive: false });
        var st = null, sw = false;
        bar.addEventListener('pointerdown', function (ev) { st = { x: ev.clientX, l: bar.scrollLeft }; sw = false; });
        bar.addEventListener('pointermove', function (ev) {
            if (!st) return;
            var dx = ev.clientX - st.x;
            if (Math.abs(dx) > 6) sw = true;
            if (sw) bar.scrollLeft = st.l - dx;
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evn) {
            bar.addEventListener(evn, function () { st = null; });
        });
        bar.addEventListener('click', function (ev) {
            if (sw) { ev.stopPropagation(); ev.preventDefault(); sw = false; }
        }, true);
    }
    function _tedApplyBg() {
        var cv = el('fmx-tedCv'); if (!cv) return;
        var bg = _tabBg({ bg: _ted.bg });
        cv.className = 'fmx-tab fmx-tabed' + bg.cls;
        cv.style.background = '';
        if (bg.st) cv.style.background = _ted.bg.c;
    }

    function _tedDrawCanvas() {
        var cv = el('fmx-tedCv'); if (!cv) return;
        _tedApplyBg();
        var h = '';
        _ted.els.forEach(function (e, i) {
            var st = 'left:' + e.x + '%;top:' + e.y + '%;width:' + e.w + '%;' +
                (e.rot ? 'transform:rotate(' + e.rot + 'deg);' : '');
            var sel = (i === _ted.sel ? ' sel' : '') + _elMode(e);
            if (e.t === 'title') h += '<div class="el ttl' + sel + '" data-i="' + i + '" style="' + st + _elColor(e) + 'font-size:' + (e.fs || 16) + 'px;">' + _esc(e.s) + _tedHnd(i) + '</div>';
            else if (e.t === 'text') h += '<div class="el txt' + sel + '" data-i="' + i + '" style="' + st + _elColor(e) + 'font-size:' + (e.fs || 11) + 'px;">' + _esc(e.s) + _tedHnd(i) + '</div>';
            else if (e.t === 'stk') {
                var sm = _tabStkInner(e);
                if (sm) h += '<div class="el stkm' + sel + '" data-i="' + i + '" style="' + st + 'height:' + e.h + '%;">' + sm + _tedHnd(i) + '</div>';
                else h += '<div class="el stk' + sel + '" data-i="' + i + '" style="' + st + 'font-size:' + Math.round((e.fs || 12) * 2.6) + 'px;">' + _esc(e.s) + _tedHnd(i) + '</div>';
            }
            else if (e.t === 'img') h += '<div class="el med' + sel + '" data-i="' + i + '" style="' + st + 'height:' + e.h + '%;"><img src="' + _esc(mediaAbs(e.u)) + '" alt="" draggable="false">' + _tedHnd(i) + '</div>';
            else if (e.t === 'video') h += '<div class="el med' + sel + '" data-i="' + i + '" style="' + st + 'height:' + e.h + '%;"><video src="' + _esc(mediaAbs(e.u)) + '" muted loop autoplay playsinline></video>' + _tedHnd(i) + '</div>';
        });
        cv.innerHTML = h;
        try { hydrateTgs(cv); } catch (e9) {}
        _forcePlay(cv);
        _tedRow();
        _tedBindCanvas(cv);
    }
    function _forcePlay(root) {
        qsa(root, 'video').forEach(function (v) {
            try { v.muted = true; v.playsInline = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
        });
    }
    function _tedHnd(i) {
        if (i !== _ted.sel) return '';
        var e = _ted.els[i];
        return '<span class="fmx-hnd" data-hz="' + i + '"></span>' +
            '<span class="fmx-hnd rot" data-hr="' + i + '"></span>' +
            '<span class="fmx-hnd del" data-hd="' + i + '"><i class="ti ti-x"></i></span>' +
            '<span class="fmx-tmodes">' +
            '<button class="fmx-tmd' + (!e.m ? ' on' : '') + '" data-tm="" title="Обычный"><i></i></button>' +
            '<button class="fmx-tmd' + (e.m === 'b' ? ' on' : '') + '" data-tm="b" title="Слияние"><i></i></button>' +
            '<button class="fmx-tmd' + (e.m === 't' ? ' on' : '') + '" data-tm="t" title="Поверх"><i></i></button>' +
            '</span>';
    }
    function _tedMarkPick(box, v) {
        var rb = box.querySelector('[data-rb]');
        var preset = COLORS.indexOf(v) >= 0;
        qsa(box, '.fmx-dot').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-cv') === v || (d === rb && !preset)); });
        if (rb) rb.style.boxShadow = preset ? '' : '0 0 0 2px ' + v;
        box.setAttribute('data-cur', v);
    }
    function _tedBindPick(idBase, cur, set, title) {
        var box = el(idBase); if (!box) return;
        var rb = box.querySelector('[data-rb]');
        qsa(box, '[data-cv]').forEach(function (d) {
            d.addEventListener('click', function () { var v = d.getAttribute('data-cv'); set(v); _tedMarkPick(box, v); _haptic('light'); });
        });
        if (rb) rb.addEventListener('click', function () {
            openColorStudio(box.getAttribute('data-cur') || cur, function (hex) { set(hex); _tedMarkPick(box, hex); }, title || 'Свой');
        });
    }
    function _tedRow() {
        var row = el('fmx-tedRow'); if (!row) return;
        var e = _ted.els[_ted.sel];
        if (!e) { row.innerHTML = ''; return; }
        var isTxt = (e.t === 'title' || e.t === 'text');
        row.innerHTML =
            (isTxt ? '<button class="fmx-btn" id="fmx-tedTxt" style="flex:1;min-width:150px;"><i class="ti ti-pencil"></i> Изменить текст</button>' : '') +
            (e.t === 'stk' ? '<button class="fmx-btn" id="fmx-tedStk" style="flex:1;"><i class="ti ti-sticker"></i> Сменить стикер</button>' : '') +
            (isTxt ? '<div style="flex-basis:100%;">' + colorPick('fmx-tedc', e.c || (e.t === 'title' ? '#e8e8ed' : '#b9c1d9'), 22) + '</div>' : '');
        var tb = el('fmx-tedTxt');
        if (tb) tb.addEventListener('click', function () { _tedEditText(e); });
        var sb = el('fmx-tedStk');
        if (sb) sb.addEventListener('click', function () { _tedPickStk(e); });
        if (isTxt) _tedBindPick('fmx-tedc', e.c || '#e8e8ed', function (hex) {
            e.c = hex;
            var cv = el('fmx-tedCv');
            var node = cv && cv.querySelector('.el[data-i="' + _ted.sel + '"]');
            if (node) node.style.color = hex;
        }, e.t === 'title' ? 'Заголовок' : 'Текст');
    }
    function _tedEditText(e) {
        _ensureSheets();
        var sh = el('fmx-writeSheet');
        sh.innerHTML = '<div class="grip"></div><h3>' + (e.t === 'title' ? 'Заголовок' : 'Текст') + ' витрины</h3>' +
            '<textarea class="fmx-inp" id="fmx-tedTa" rows="3" maxlength="' + (e.t === 'title' ? 200 : 600) + '" style="margin-top:10px;width:100%;line-height:1.5;resize:none;"></textarea>' +
            '<button class="fmx-save" id="fmx-tedTaOk" style="margin-top:10px;">Готово</button>';
        el('fmx-tedTa').value = e.s || '';
        el('fmx-tedTaOk').addEventListener('click', function () {
            var v = el('fmx-tedTa').value.trim();
            if (v) e.s = v;
            closeSheet(); _tedDrawCanvas();
        });
        el('fmx-shbg').classList.add('on'); sh.classList.add('on');
        setTimeout(function () { var ta = el('fmx-tedTa'); if (ta) try { ta.focus(); } catch (e2) {} }, 280);
    }
    function _tedBgSheet() {
        _ensureSheets();
        var sh = el('fmx-writeSheet');
        var curP = (_ted.bg && _ted.bg.k === 'p') ? _ted.bg.id : null;
        var curC = (_ted.bg && _ted.bg.k === 'c') ? _ted.bg.c : null;
        sh.innerHTML = '<div class="grip"></div><h3>Фон витрины</h3>' +
            '<div class="fmx-tbgw">' +
            '<button class="fmx-tbgc' + (!_ted.bg ? ' on' : '') + '" data-tbg=""><span class="fmx-tbgt"><span class="mini" style="background:linear-gradient(150deg,#131a30,#0c1020 45%,#0e1526 70%,#101a2c);"></span></span><em>Стандарт</em></button>' +
            _TED_BG.map(function (p) { return '<button class="fmx-tbgc' + (curP === p.id ? ' on' : '') + '" data-tbg="' + p.id + '"><span class="fmx-tbgt"><span class="mini tbg-' + p.id + '"></span></span><em>' + p.n + '</em></button>'; }).join('') +
            '</div>' +
            '<span class="fmx-lbl fmx-mt2">Свой цвет фона</span>' + colorPick('fmx-tedbgc', curC || '#0a0d18', 22) +
            '<button class="fmx-save" id="fmx-tedBgOk" style="margin-top:12px;">Готово</button>';
        qsa(sh, '[data-tbg]').forEach(function (b) {
            b.addEventListener('click', function () {
                var id = b.getAttribute('data-tbg');
                _ted.bg = id ? { k: 'p', id: id } : null;
                qsa(sh, '.fmx-tbgc').forEach(function (x) { x.classList.toggle('on', x === b); });
                qsa(sh, '#fmx-tedbgc .fmx-dot').forEach(function (x) { x.classList.remove('on'); });
                _tedApplyBg(); _haptic('light');
            });
        });
        _tedBindPick('fmx-tedbgc', curC || '#0a0d18', function (hex) {
            _ted.bg = { k: 'c', c: hex };
            qsa(sh, '.fmx-tbgc').forEach(function (x) { x.classList.remove('on'); });
            _tedApplyBg();
        }, 'Фон витрины');
        el('fmx-tedBgOk').addEventListener('click', closeSheet);
        el('fmx-shbg').classList.add('on'); sh.classList.add('on');
    }
    function _tedPickStk(e) {
        _ensureSheets();
        var sh = el('fmx-writeSheet');
        function put(s, sk) {
            if (!e) {
                e = { t: 'stk', x: 70, y: 4, w: sk ? 26 : 20, h: sk ? 17 : 12, rot: 0, fs: 16, s: s };
                _ted.els.push(e); _ted.sel = _ted.els.length - 1;
            } else {
                e.s = s; delete e.sk;
                if (sk && e.w < 14) e.w = 18;
            }
            if (sk) e.sk = sk;
            closeSheet(); _haptic('light'); _tedDrawCanvas();
        }
        function paint() {
            if (!_sheetIs('sticker')) return;
            var lst = _stickers || [];
            _sheetOwn('sticker');
            sh.innerHTML = '<div class="grip"></div><h3>Стикер</h3>' +
                '<span class="fmx-lbl fmx-mt2">Твоя коллекция из бота</span>' +
                (lst.length ? '<div class="fmx-stkgrid" style="margin-top:8px;">' +
                    lst.map(function (st, j) { return '<button class="fmx-stkcell" data-stm="' + j + '">' + stkMedia(st, true) + '</button>'; }).join('') + '</div>'
                    : '<div style="font-size:10.5px;color:#8990a8;line-height:1.5;margin-top:4px;">Коллекция пуста: отправь боту стикер в личные сообщения — он появится здесь.</div>') +
                '<span class="fmx-lbl fmx-mt2">Эмодзи</span>' +
                '<div class="fmx-emwrap" id="fmx-emw"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
                _TED_STK.map(function (x) { return '<button class="fmx-seg" data-stx="' + x + '" style="font-size:20px;min-width:46px;">' + x + '</button>'; }).join('') + '</div></div>' +
                '<div style="display:flex;justify-content:center;margin-top:-26px;position:relative;z-index:2;">' +
                '<button class="fmx-tabmore" id="fmx-emMore" style="min-height:32px;padding:6px 16px;font-size:10.5px;">Развернуть</button></div>';
            qsa(sh, '[data-stx]').forEach(function (b) {
                b.addEventListener('click', function () { put(b.getAttribute('data-stx'), null); });
            });
            qsa(sh, '[data-stm]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var st = lst[+b.getAttribute('data-stm')]; if (!st) return;
                    put(st.url, (st.kind === 'webm' || st.kind === 'tgs') ? st.kind : 'img');
                });
            });
            var emw = sh.querySelector('#fmx-emw'), emb = sh.querySelector('#fmx-emMore');
            if (emb) emb.addEventListener('click', function () {
                var open = emw.classList.toggle('open');
                emb.textContent = open ? 'Свернуть' : 'Развернуть';
                emb.parentNode.style.marginTop = open ? '8px' : '-26px';
                _haptic('light');
            });
            try { hydrateTgs(sh); } catch (e9) {}
            _forcePlay(sh);
        }
        if (_stickers) paint();
        else {
            _sheetOwn('sticker');
            sh.innerHTML = '<div class="grip"></div><h3>Стикер</h3><div style="font-size:11px;color:#8990a8;padding:14px 0;">Загружаю коллекцию…</div>';
            apiGet('/api/v1/marketplace/stickers').then(function (r) {
                _stickers = (r && r.stickers) ? r.stickers : [];
                paint();
            }).catch(function () { _stickers = _stickers || []; paint(); });
        }
        el('fmx-shbg').classList.add('on'); sh.classList.add('on');
    }
    function _tedAdd(t) {
        if (_ted.els.length >= 12) { uiAlert('На витрине помещается до 12 элементов — удали лишний.'); return; }
        if (t === 'img' || t === 'video') { _tedUpload(t); return; }
        if (t === 'stk') { _tedPickStk(null); return; }
        var e;
        if (t === 'title') e = { t: 'title', x: 6, y: 4, w: 70, h: 10, rot: 0, fs: 16, s: 'Заголовок витрины' };
        else e = { t: 'text', x: 6, y: 20, w: 55, h: 12, rot: 0, fs: 11, s: 'Расскажи, что получает рекламодатель' };
        _ted.els.push(e); _ted.sel = _ted.els.length - 1;
        _haptic('light'); _tedDrawCanvas();
        _tedEditText(e);
    }
    function _tedUpload(kind) {
        var inp = el('fmx-tedFile'); if (!inp) return;
        inp.accept = kind === 'video' ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif';
        inp.onchange = function () {
            var f = inp.files && inp.files[0]; inp.value = '';
            if (!f) return;
            if (f.size > MEDIA_MAX_BYTES) { uiAlert('Файл ' + Math.round(f.size / 1048576) + ' МБ — больше лимита. Выбери файл меньше.'); return; }
            var fd = new FormData();
            fd.append('file', f); fd.append('target', 'tablo');
            var base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
            var headers = {};
            try { if (typeof tg !== 'undefined' && tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData; } catch (e2) {}
            toast('Загружаю файл…');
            fetch(base + '/api/v1/marketplace/upload', { method: 'POST', headers: headers, body: fd })
                .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('код ' + r.status)); }); return r.json(); })
                .then(function (j) {
                    if (!j || !j.url) throw new Error('сервер не вернул адрес файла');
                    _ted.els.push({ t: (j.kind === 'video' || kind === 'video') ? 'video' : 'img', x: 50, y: 30, w: 42, h: 18, rot: 0, fs: 12, u: j.url });
                    _ted.sel = _ted.els.length - 1;
                    _haptic('success'); _tedDrawCanvas();
                })
                .catch(function (e3) { uiAlert('Не удалось загрузить: ' + e3.message); });
        };
        inp.click();
    }
    var _tedDrag = null;
    var _tedPts = {};
    var _tedLpT = null;
    function _tedBindCanvas(cv) {
        function pct(ev) {
            var r = cv.getBoundingClientRect();
            return { x: (ev.clientX - r.left) / r.width * 100, y: (ev.clientY - r.top) / r.height * 100 };
        }
        function centerPx(e) {
            var r = cv.getBoundingClientRect();
            return { x: r.left + (e.x + e.w / 2) / 100 * r.width, y: r.top + (e.y + (e.h || 10) / 2) / 100 * r.height };
        }
        function applyScale(e, d, scale) {
            scale = Math.max(0.2, Math.min(5, scale));
            e.w = Math.max(6, Math.min(100, d.w0 * scale));
            if (e.x + e.w > 100) e.x = Math.max(0, 100 - e.w);
            var k = e.w / d.w0;
            if (e.t === 'title' || e.t === 'text') e.fs = Math.max(8, Math.min(28, d.fs0 * k));
            else if (e.t === 'stk' && !e.sk) e.fs = Math.max(8, Math.min(96, d.fs0 * scale));
            else {
                e.h = Math.max(4, Math.min(100, (d.h0 || 18) * k));
                if (e.y + e.h > 100) e.y = Math.max(0, 100 - e.h);
            }
        }
        function setRot(e, deg) {
            var r = Math.round(deg) % 360;
            if (r > 180) r -= 360; if (r < -180) r += 360;
            e.rot = r;
        }
        cv.onpointerdown = function (ev) {
            var t = ev.target;
            _tedPts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
            var tm = t.closest ? t.closest('[data-tm]') : null;
            if (tm) {
                delete _tedPts[ev.pointerId];
                var eM = _ted.els[_ted.sel];
                if (eM) { eM.m = tm.getAttribute('data-tm') || undefined; if (!eM.m) delete eM.m; _haptic('light'); _tedDrawCanvas(); }
                return;
            }
            var hd = t.closest ? t.closest('[data-hd]') : null;
            var hz = t.closest ? t.closest('[data-hz]') : null;
            var hr = t.closest ? t.closest('[data-hr]') : null;
            var elN = t.closest ? t.closest('.el') : null;
            var ids = Object.keys(_tedPts);
            if (_tedDrag && (_tedDrag.kind === 'move' || _tedDrag.kind === 'pinch') && ids.length === 2 && elN) {
                var ee = _tedDrag.e;
                var a = _tedPts[ids[0]], b = _tedPts[ids[1]];
                var d0 = Math.hypot(a.x - b.x, a.y - b.y);
                if (d0 > 8) _tedDrag = {
                    kind: 'pinch', e: ee, p1: ids[0], p2: ids[1], d0: d0,
                    a0: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
                    w0: ee.w, h0: ee.h, fs0: ee.fs || 12, r0: ee.rot || 0, x0: ee.x, y0: ee.y
                };
                ev.preventDefault();
                try { cv.setPointerCapture(ev.pointerId); } catch (e9) {}
                return;
            }
            if (hd) {
                var iD = +hd.getAttribute('data-hd');
                delete _tedPts[ev.pointerId];
                _ted.els.splice(iD, 1); _ted.sel = -1;
                _haptic('light'); _tedDrawCanvas();
                return;
            }
            if (hz) {
                var e1 = _ted.els[+hz.getAttribute('data-hz')];
                var c1 = centerPx(e1);
                _tedDrag = { kind: 'resize', e: e1, cx: c1.x, cy: c1.y, dist0: Math.max(8, Math.hypot(ev.clientX - c1.x, ev.clientY - c1.y)), w0: e1.w, fs0: e1.fs || 12, h0: e1.h };
            } else if (hr) {
                var e2 = _ted.els[+hr.getAttribute('data-hr')];
                var c2 = centerPx(e2);
                _tedDrag = { kind: 'rotate', e: e2, cx: c2.x, cy: c2.y };
            } else if (elN) {
                var i = +elN.getAttribute('data-i');
                var wasSel = _ted.sel === i;
                if (!wasSel) { _ted.sel = i; _tedDrawCanvas(); }
                var e3 = _ted.els[i];
                _tedDrag = { kind: 'move', e: e3, start: pct(ev), x0: e3.x, y0: e3.y, wasSel: wasSel };
                if (e3.t === 'title' || e3.t === 'text') {
                    clearTimeout(_tedLpT);
                    _tedLpT = setTimeout(function () {
                        if (!_tedDrag || _tedDrag.kind !== 'move' || _tedDrag.e !== e3 || _tedDrag.moved) return;
                        _tedDrag = null;
                        cv.classList.remove('moving');
                        _haptic('light');
                        openColorStudio(e3.c || (e3.t === 'title' ? '#e8e8ed' : '#b9c1d9'), function (hex) {
                            e3.c = hex;
                            var node = cv.querySelector('.el[data-i="' + _ted.els.indexOf(e3) + '"]');
                            if (node) node.style.color = hex;
                            var dots = el('fmx-tedc'); if (dots) _tedMarkPick(dots, hex);
                        }, e3.t === 'title' ? 'Заголовок' : 'Текст');
                    }, 480);
                }
            } else {
                if (_ted.sel !== -1) { _ted.sel = -1; _tedDrawCanvas(); }
                return;
            }
            ev.preventDefault();
            try { cv.setPointerCapture(ev.pointerId); } catch (e4) {}
        };
        cv.onpointermove = function (ev) {
            if (_tedPts[ev.pointerId]) _tedPts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
            if (!_tedDrag) return;
            var e = _tedDrag.e;
            if (_tedDrag.kind === 'move') {
                var p = pct(ev);
                var dx = p.x - _tedDrag.start.x, dy = p.y - _tedDrag.start.y;
                if (!_tedDrag.moved && Math.abs(dx) + Math.abs(dy) > 1.2) {
                    _tedDrag.moved = true;
                    clearTimeout(_tedLpT);
                }
                if (_tedDrag.moved) {
                    cv.classList.add('moving');
                    e.x = Math.max(0, Math.min(96, _tedDrag.x0 + dx));
                    e.y = Math.max(0, Math.min(96, _tedDrag.y0 + dy));
                }
            } else if (_tedDrag.kind === 'resize') {
                cv.classList.add('moving');
                applyScale(e, _tedDrag, Math.hypot(ev.clientX - _tedDrag.cx, ev.clientY - _tedDrag.cy) / _tedDrag.dist0);
            } else if (_tedDrag.kind === 'rotate') {
                cv.classList.add('moving');
                setRot(e, Math.atan2(ev.clientY - _tedDrag.cy, ev.clientX - _tedDrag.cx) * 180 / Math.PI + 90);
            } else if (_tedDrag.kind === 'pinch') {
                var a = _tedPts[_tedDrag.p1], b = _tedPts[_tedDrag.p2];
                if (!a || !b) return;
                cv.classList.add('moving');
                var d = Math.hypot(a.x - b.x, a.y - b.y);
                applyScale(e, _tedDrag, d / _tedDrag.d0);
                setRot(e, _tedDrag.r0 + (Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI - _tedDrag.a0));
            }
            _tedApply(e);
        };
        cv.onpointerup = cv.onpointercancel = function (ev) {
            delete _tedPts[ev.pointerId];
            clearTimeout(_tedLpT);
            cv.classList.remove('moving');
            if (_tedDrag && _tedDrag.kind === 'move' && !_tedDrag.moved && _tedDrag.wasSel) {
                var eT = _tedDrag.e;
                _tedDrag = null;
                _haptic('light');
                if (eT.t === 'title' || eT.t === 'text') { _tedEditText(eT); return; }
                _ted.sel = -1;
                _tedDrawCanvas();
                return;
            }
            if (_tedDrag && _tedDrag.kind === 'pinch') {
                var left = Object.keys(_tedPts);
                if (left.length === 1) { _tedDrag = { kind: 'move', e: _tedDrag.e, start: { x: 0, y: 0 }, x0: _tedDrag.e.x, y0: _tedDrag.e.y }; var pp = _tedPts[left[0]]; var r = cv.getBoundingClientRect(); _tedDrag.start = { x: (pp.x - r.left) / r.width * 100, y: (pp.y - r.top) / r.height * 100 }; return; }
            }
            if (_tedDrag) { _tedDrag = null; _tedDrawCanvas(); }
        };
    }
    function _tedApply(e) {
        var cv = el('fmx-tedCv'); if (!cv) return;
        var node = cv.querySelector('.el[data-i="' + _ted.els.indexOf(e) + '"]');
        if (!node) return;
        node.style.left = e.x + '%'; node.style.top = e.y + '%'; node.style.width = e.w + '%';
        node.style.transform = e.rot ? 'rotate(' + e.rot + 'deg)' : '';
        if (e.t === 'stk' && !e.sk) node.style.fontSize = ((e.fs || 12) * 2.6).toFixed(1) + 'px';
        else if (e.t === 'title' || e.t === 'text') node.style.fontSize = (e.fs || 12) + 'px';
        else node.style.height = e.h + '%';
    }
    function _tedSave() {
        var btn = el('fmx-tedSave'); btn.disabled = true;
        apiPost('/api/v1/marketplace/listings/' + _ted.l.id + '/tablo', { els: _ted.els, bg: _ted.bg }).then(function (r) {
            btn.disabled = false;
            if (!r || !r.ok) { _haptic('error'); uiAlert((r && r.error) || 'Не удалось сохранить витрину'); return; }
            _ted.l.expand_content_json = { v: 2, els: _ted.els, bg: _ted.bg };
            _haptic('success');
            toast(r.resubmitted ? 'Витрина отправлена на проверку — оффер вернётся на Площадку после модерации'
                : 'Витрина сохранена — закупщики видят её в развороте оффера');
            hideModal('fmx-tedBg');
        }).catch(function () { btn.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
    }

    function openCampaign() {
        _ensureSheets();
        var sh = el('fmx-writeSheet');
        var niches = [];
        var seen = {};
        (_feed || []).forEach(function (l) { var nn = l.niche && String(l.niche).trim(); if (nn && !seen[nn.toLowerCase()]) { seen[nn.toLowerCase()] = 1; niches.push(nn); } });
        _sheetOwn('campaign');
        sh.innerHTML = '<div class="grip"></div><h3>Собрать кампанию под бюджет</h3>' +
            '<div style="font-size:10.5px;color:#8990a8;line-height:1.5;">Готовый медиаплан из офферов со свободными датами — без ручного перебора</div>' +
            '<span class="fmx-lbl fmx-mt2">Бюджет, ₽</span>' +
            '<input class="fmx-inp" id="fmx-cbud" type="number" min="500" inputmode="numeric" value="50000" style="width:100%;">' +
            '<span class="fmx-lbl fmx-mt2">Ниша</span>' +
            '<div style="display:flex;gap:7px;flex-wrap:wrap;" id="fmx-cnich">' +
            '<button class="fmx-seg on" data-n="">Все ниши</button>' +
            niches.slice(0, 6).map(function (n) { return '<button class="fmx-seg" data-n="' + _esc(n) + '">' + _esc(n) + '</button>'; }).join('') + '</div>' +
            '<button class="fmx-save" id="fmx-cgo" style="margin-top:14px;"><i class="ti ti-calculator"></i> Собрать медиаплан</button>' +
            '<div id="fmx-cres"></div>';
        var selN = '';
        qsa(sh, '#fmx-cnich .fmx-seg').forEach(function (b) {
            b.addEventListener('click', function () {
                qsa(sh, '#fmx-cnich .fmx-seg').forEach(function (x) { x.classList.remove('on'); });
                b.classList.add('on'); selN = b.getAttribute('data-n');
            });
        });
        el('fmx-cgo').addEventListener('click', function () {
            var bud = parseInt(el('fmx-cbud').value, 10);
            if (!bud || bud < 500) { uiAlert('Укажи бюджет от 500 ₽'); return; }
            var btn = el('fmx-cgo'); btn.disabled = true;
            apiPost('/api/v1/marketplace/campaign', { budget: Math.min(bud, 100000000), niche: selN || null }).then(function (r) {
                if (!_sheetIs('campaign')) return;
                btn.disabled = false;
                if (!r || !r.ok) { uiAlert((r && r.error) || 'Не удалось собрать план'); return; }
                _haptic('success');
                var t = r.totals || {};
                if (!r.items || !r.items.length) {
                    el('fmx-cres').innerHTML = '<div class="fmx-empty" style="padding:22px 10px;"><i class="ti ti-filter-off"></i><h3>Под этот бюджет и нишу офферов нет</h3><p>Попробуй другую нишу или измени бюджет.</p></div>';
                    return;
                }
                el('fmx-cres').innerHTML =
                    '<div class="fmx-glassbox fmx-sumrow num" style="margin-top:14px;background:rgba(255,255,255,0.035);border:0.5px solid rgba(255,255,255,0.09);border-radius:14px;">' +
                    '<div><div class="l">Офферов</div><div class="v">' + t.count + '</div></div>' +
                    '<div><div class="l">Сумма</div><div class="v">' + _num(t.sum) + ' ₽</div></div>' +
                    '<div><div class="l">Показы</div><div class="v">~' + _num(t.impressions != null ? t.impressions : t.reach) + '</div></div>' +
                    '<div><div class="l">Ср. CPM</div><div class="v" style="color:#5DCAA5;">' + (t.avg_cpm != null ? _num(t.avg_cpm) + ' ₽' : '—') + '</div></div></div>' +
                    '<div style="margin-top:8px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:4px 12px;">' +
                    r.items.map(function (it) {
                        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 0;border-bottom:0.5px solid rgba(255,255,255,0.05);font-size:11.5px;" class="num">' +
                            '<div style="flex:1;min-width:0;"><b>' + _esc(it.title || it.username) + '</b> · ' + _esc(it.format) +
                            (it.day ? ' · ' + _fmtDayRu(it.day) : ' · дата уточняется') +
                            (it.hot_pct ? ' <span style="color:#f5bf4f;">−' + it.hot_pct + '%</span>' : '') + '</div>' +
                            '<b style="white-space:nowrap;">' + _num(it.price_final) + ' ₽</b></div>';
                    }).join('') + '</div>' +
                    '<div style="font-size:10px;color:#565b73;margin-top:8px;line-height:1.45;">Остаток бюджета ' + _num(t.rest) + ' ₽<br>' +
                    'Показы — сумма просмотров всех размещений. Уникальных людей будет меньше: аудитории каналов одной ниши пересекаются.</div>' +
                    '<div style="display:flex;gap:8px;margin-top:12px;">' +
                    '<button class="fmx-btn" id="fmx-cbm" style="flex:1;">В закладки весь план</button>' +
                    '<button class="fmx-btn" id="fmx-ccopy" style="flex:1;">Скопировать план</button></div>';
                el('fmx-cbm').addEventListener('click', function () {
                    var chain = Promise.resolve();
                    r.items.forEach(function (it) {
                        chain = chain.then(function () {
                            return apiPost('/api/v1/marketplace/bookmarks', { username: it.username, source: 'market', listing_id: it.listing_id }).catch(function () {});
                        });
                    });
                    chain.then(function () {
                        r.items.forEach(function (it) { _bookmarks[it.username] = true; });
                        updateBmCount(); _haptic('success');
                        toast('Все офферы плана добавлены в закладки');
                    });
                });
                el('fmx-ccopy').addEventListener('click', function () {
                    var lines = ['План кампании · бюджет ' + _num(bud) + ' ₽'];
                    r.items.forEach(function (it) {
                        lines.push('@' + it.username + ' — ' + it.format + (it.day ? ' — ' + _fmtDayRu(it.day) : '') + ' — ' + _num(it.price_final) + ' ₽');
                    });
                    lines.push('Итого: ' + _num(t.sum) + ' ₽ · показы ~' + _num(t.impressions != null ? t.impressions : t.reach) + ' · средний CPM ' + (t.avg_cpm != null ? _num(t.avg_cpm) + ' ₽' : '—'));
                    lines.push('Показы — сумма просмотров; уникальный охват меньше из-за пересечения аудиторий.');
                    copyText(lines.join('\n'));
                    toast('Скопировано: план кампании');
                });
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
        });
        el('fmx-shbg').classList.add('on');
        sh.classList.add('on');
    }

    var CMP_MAX = 3;
    var _cmp = {};
    function _cmpCount() { return Object.keys(_cmp).length; }

    function toggleCmp(u) {
        var l = findListing(u);
        if (_cmp[u]) { delete _cmp[u]; }
        else {
            if (_cmpCount() >= CMP_MAX) { _haptic('error'); toast('Можно сравнить не больше ' + CMP_MAX + ' каналов — сними лишний.'); return; }
            if (!l) { _haptic('error'); toast('Не удалось добавить канал к сравнению.'); return; }
            _cmp[u] = l;
        }
        _haptic('light');
        qsa(document, '.fmx-cmpb[data-cmp="' + (window.CSS && CSS.escape ? CSS.escape(u) : u) + '"]').forEach(function (b) { b.classList.toggle('on', !!_cmp[u]); });
        drawCmpBar();
    }

    function drawCmpBar() {
        var bar = el('fmx-cmpBar');
        if (!bar) return;
        var n = _cmpCount();
        bar.classList.toggle('on', n > 0 && _mainTab === 'market');
        if (!n) return;
        bar.innerHTML = '<span class="fmx-cmpn">Выбрано ' + n + ' из ' + CMP_MAX + '</span>' +
            '<button class="fmx-cmpclr" id="fmx-cmpClr">Сбросить</button>' +
            '<button class="fmx-cmpgo" id="fmx-cmpGo"' + (n < 2 ? ' disabled' : '') + '><i class="ti ti-columns-3"></i> ' +
            (n < 2 ? 'Выбери ещё один' : 'Сравнить') + '</button>';
        el('fmx-cmpClr').addEventListener('click', function () {
            _cmp = {}; _haptic('light');
            qsa(document, '.fmx-cmpb.on').forEach(function (b) { b.classList.remove('on'); });
            drawCmpBar();
        });
        el('fmx-cmpGo').addEventListener('click', function () { if (_cmpCount() >= 2) openCompare(); });
    }

    var CMP_ROWS = [
        { k: 'subs', label: 'Подписчики', dir: null, get: function (l) { return l.subscribers || null; }, fmt: function (v) { return _num(v); } },
        { k: 'views', label: 'Охват', dir: 'up', get: function (l) { return l.avg_views || null; }, fmt: function (v) { return '~' + _num(v); } },
        { k: 'er', label: 'ERR', dir: 'up', get: function (l) { return l.er != null ? l.er : null; }, fmt: function (v) { return (Math.round(v * 10) / 10) + '%'; } },
        { k: 'reach', label: 'Охват к подп.', dir: 'up', get: _reachRate, fmt: function (v) { return v + '%'; } },
        { k: 'cpm', label: 'CPM', dir: 'down', get: _cpm, fmt: function (v) { return _num(v) + ' ₽'; } },
        { k: 'price', label: 'Цена от', dir: 'down', get: _minPrice, fmt: function (v) { return _num(v) + ' ₽'; } },
        { k: 'health', label: 'Здоровье', dir: 'up', get: function (l) { return l.health_score != null ? l.health_score : null; }, fmt: function (v) { return Math.round(v); } }
    ];

    function openCompare() {
        var items = Object.keys(_cmp).map(function (u) { return _cmp[u]; });
        if (items.length < 2) return;
        var body = el('fmx-cmpBody'); if (!body) return;
        var h = '<div class="fmx-cmpwrap"><table class="fmx-cmpt"><thead><tr><th class="fmx-cmph"></th>' +
            items.map(function (l) {
                var t = l.title || l.username || '?';
                var av = l.avatar_url
                    ? '<img src="' + _esc(mediaAbs(l.avatar_url)) + '" alt="">'
                    : _esc(t.charAt(0));
                return '<th><div class="fmx-cmpav" style="background:' + _esc(_accent(l)) + ';">' + av + '</div>' +
                    '<div class="fmx-cmpnm">' + _esc(t) + '</div>' +
                    '<div class="fmx-cmpu">@' + _esc(l.username || '') + '</div></th>';
            }).join('') + '</tr></thead><tbody>';
        CMP_ROWS.forEach(function (row) {
            var vals = items.map(row.get);
            var known = vals.filter(function (v) { return v != null; });
            var best = null;
            if (row.dir && known.length >= 2 && Math.min.apply(null, known) !== Math.max.apply(null, known)) {
                best = row.dir === 'up' ? Math.max.apply(null, known) : Math.min.apply(null, known);
            }
            h += '<tr><td class="fmx-cmph">' + row.label + '</td>' + vals.map(function (v) {
                if (v == null) return '<td class="fmx-cmpna">—</td>';
                var win = (best !== null && v === best);
                return '<td' + (win ? ' class="fmx-cmpw"' : '') + '>' + row.fmt(v) + (win ? '<i class="ti ti-check"></i>' : '') + '</td>';
            }).join('') + '</tr>';
        });
        h += '</tbody></table></div>' +
            '<div class="fmx-cmpleg"><i class="ti ti-check"></i> Лучшее в строке. Подписчиков не отмечаем: размер канала сам по себе не говорит о качестве.</div>' +
            '<div class="fmx-acts" style="margin-top:12px;">' + items.map(function (l) {
                return '<button class="fmx-btn" data-cmpw="' + _esc(l.username) + '"><i class="ti ti-brand-telegram"></i>' + _esc((l.title || l.username || '').slice(0, 14)) + '</button>';
            }).join('') + '</div>';
        body.innerHTML = h;
        qsa(body, '[data-cmpw]').forEach(function (b) {
            b.addEventListener('click', function () { hideModal('fmx-cmpBg'); openListing(b.getAttribute('data-cmpw')); });
        });
        showModal('fmx-cmpBg');
    }

    function _dealTrackHtml() {
        return '<div id="fmx-dealTrk"><button class="fmx-btn" id="fmx-dealTrkGo" style="width:100%;margin-top:8px;color:#5ab0e6;border-color:rgba(90,176,230,0.35);"><i class="ti ti-route"></i> <span>Ссылка отслеживания в рекламный пост</span></button></div>';
    }
    function _dealTrackBind(dealId) {
        var go = el('fmx-dealTrkGo');
        if (go) go.addEventListener('click', function () { _haptic('light'); _dealTrackCreate(dealId, null); });
    }
    var _trkBusy = false;
    function _dealTrackCreate(dealId, channelId) {
        var boxT = el('fmx-dealTrk'); if (!boxT || _trkBusy) return;
        _trkBusy = true;
        var body = channelId ? { deal_id: dealId, channel_id: channelId } : { deal_id: dealId };
        apiPost('/api/v1/placements/from-deal', body).then(function (r) {
            _trkBusy = false;
            if (!r || r.ok === false) { _haptic('error'); uiAlert((r && r.message) || 'Не удалось. Повтори попытку.'); return; }
            if (r.need_channel) {
                boxT.innerHTML = '<div class="fmx-dealline" style="justify-content:flex-start;margin-top:8px;"><i class="ti ti-route"></i> <span>В какой канал вести подписчиков?</span></div>' +
                    r.need_channel.map(function (c) { return '<button class="fmx-btn" data-trkch="' + c.id + '" style="width:100%;margin-top:6px;">' + _esc(c.title || ('@' + (c.username || ''))) + '</button>'; }).join('');
                qsa(boxT, '[data-trkch]').forEach(function (b) { b.addEventListener('click', function () { _dealTrackCreate(dealId, +b.getAttribute('data-trkch')); }); });
                return;
            }
            var it = r.item || {};
            var url = it.click_code ? ('https://fmtr.click/r/' + it.click_code) : (it.invite_link || '');
            _haptic('success');
            boxT.innerHTML = '<div class="fmx-proof" style="margin-top:8px;"><div class="fmx-proof-t"><i class="ti ti-route"></i> <span>Отслеживание готово — запись уже в Трекере</span></div>' +
                '<div style="font-size:11px;color:#8990a8;margin-top:4px;"><span>Эта ссылка — в рекламный пост: подписки, показы и цена подписчика посчитаются автоматически</span></div>' +
                '<div style="display:flex;gap:6px;margin-top:7px;align-items:center;"><code style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;">' + _esc(url) + '</code>' +
                '<button class="fmx-btn" id="fmx-trkCopy" style="flex:0 0 auto;padding:6px 10px;"><span>Скопировать</span></button></div></div>';
            var cp = el('fmx-trkCopy');
            if (cp) cp.addEventListener('click', function () {
                try { navigator.clipboard.writeText(url); } catch (e) {}
                _haptic('light'); toast('Ссылка скопирована — вставь её в рекламный пост');
            });
        }).catch(function () { _trkBusy = false; uiAlert('Не удалось. Повтори попытку.'); });
    }
    function _cardDealMark(lid) {
        if (!lid) return;
        _haptic('light');
        apiGet('/api/v1/marketplace/deals/state?listing_id=' + lid).then(function (r) {
            var st = r && r.ok ? r.state : null;
            if (st === 'pending') { toast('Сделка уже отмечена — ждём подтверждения владельца'); return; }
            if (st === 'confirmed' || st === 'reviewed') { toast('Сделка по этому офферу уже есть — статус в развороте карточки'); return; }
            uiConfirm('Отмечай только реальную сделку. Сразу появится ссылка отслеживания для рекламного поста; владелец получит запрос на подтверждение — после него добавятся автозамеры охвата и возможность отзыва.', function () {
                apiPost('/api/v1/marketplace/deals', { listing_id: lid }).then(function (rr) {
                    if (rr && rr.ok === false) { _haptic('error'); uiAlert(rr.error || 'Не удалось'); return; }
                    _haptic('success'); toast('Отправлено владельцу на подтверждение');
                }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
            });
        }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
    }
    function renderDealBox(l) {
        var box = el('fmx-dealBox'); if (!box) return;
        apiGet('/api/v1/marketplace/deals/state?listing_id=' + l.id).then(function (r) {
            if (!r || !r.ok) return;
            if (r.state === 'pending') {
                box.innerHTML = '<div class="fmx-dealline"><i class="ti ti-hourglass"></i> Сделка отмечена — ждём подтверждения владельца.</div>' + _dealTrackHtml();
                _dealTrackBind(r.deal_id);
            } else if (r.state === 'confirmed') {
                box.innerHTML = _proofHtml(r) + _dealTrackHtml() + '<button class="fmx-btn" id="fmx-dealRev" style="width:100%;margin-top:10px;color:#f59e0b;border-color:rgba(245,158,11,0.35);"><i class="ti ti-star"></i> Оставить отзыв о сделке</button>';
                _dealTrackBind(r.deal_id);
                el('fmx-dealRev').addEventListener('click', function () { hideModal('fmx-listBg'); openReviewForm(r.deal_id); });
            } else if (r.state === 'reviewed') {
                box.innerHTML = _proofHtml(r) + '<div class="fmx-dealline" style="color:#5DCAA5;"><i class="ti ti-circle-check"></i> Сделка подтверждена, отзыв оставлен.</div>';
            } else {
                box.innerHTML = '<button class="fmx-btn" id="fmx-dealGo" style="width:100%;margin-top:10px;color:#5ab0e6;border-color:rgba(90,176,230,0.35);"><i class="ti ti-heart-handshake"></i> Отметить сделку</button>';
                el('fmx-dealGo').addEventListener('click', function () {
                    uiConfirm('Отмечай только реальную сделку. Сразу появится ссылка отслеживания для рекламного поста; владелец получит запрос на подтверждение — после него добавятся автозамеры охвата и возможность отзыва.', function () {
                        apiPost('/api/v1/marketplace/deals', { listing_id: l.id }).then(function (rr) {
                            if (rr && rr.ok === false) { _haptic('error'); uiAlert(rr.error || 'Не удалось'); return; }
                            _haptic('success'); toast('Отправлено владельцу на подтверждение');
                            renderDealBox(l);
                        }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
                    });
                });
            }
        }).catch(function () {});
    }
    function renderReviews(l) {
        var box = el('fmx-lsRev'); if (!box) return;
        apiGet('/api/v1/marketplace/listings/' + l.id + '/reviews').then(function (r) {
            if (!r || !r.ok || !r.reviews || !r.reviews.length) return;
            box.innerHTML = '<div class="fmx-revs"><div class="fmx-revs-t"><i class="ti ti-star-filled" style="color:#f59e0b;"></i> ' + (l.rating_avg || '') + ' · ' + l.reviews_count + ' ' + _plural(l.reviews_count, 'отзыв', 'отзыва', 'отзывов') + '</div>' +
                r.reviews.map(function (rv) {
                    var stars = '★★★★★'.slice(0, rv.rating) + '☆☆☆☆☆'.slice(0, 5 - rv.rating);
                    return '<div class="fmx-rev"><span class="fmx-rev-s">' + stars + '</span> <span style="font-size:9px;font-weight:700;border-radius:99px;padding:2px 7px;background:rgba(93,202,165,0.15);color:#5DCAA5;white-space:nowrap;">Сделка подтверждена</span>' + (rv.text ? '<span class="fmx-rev-x">' + _esc(rv.text) + '</span>' : '') + '<span class="fmx-rev-a">' + _ago(rv.created_at) + '</span></div>';
                }).join('') + '</div>';
        }).catch(function () {});
    }
    function openReviewForm(dealId) {
        var sel = { v: 0 };
        el('fmx-revBody').innerHTML =
            '<span class="fmx-lbl">Оценка</span><div class="fmx-fxw" id="fmx-rev-r">' +
            [1, 2, 3, 4, 5].map(function (n) { return '<button class="fmx-fx" data-rv="' + n + '" style="font-size:15px;padding:8px 12px;">' + '★'.repeat(n) + '</button>'; }).join('') + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Пара слов (необязательно)</span><textarea class="fmx-inp" id="fmx-rev-t" rows="3" maxlength="300" placeholder="Как прошла сделка? Вышел ли пост вовремя, честные ли охваты."></textarea>' +
            '<button class="fmx-save" id="fmx-rev-send" style="margin-top:14px;opacity:0.5;" disabled><i class="ti ti-send"></i> Поставь оценку</button>';
        qsa(el('fmx-rev-r'), '[data-rv]').forEach(function (b) { b.addEventListener('click', function () { sel.v = +b.getAttribute('data-rv'); qsa(el('fmx-rev-r'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); var sb = el('fmx-rev-send'); if (sb) { sb.disabled = false; sb.style.opacity = '1'; sb.innerHTML = '<i class="ti ti-send"></i> Отправить отзыв'; } }); });
        el('fmx-rev-send').addEventListener('click', function () {
            var btn = this; if (!sel.v) return; btn.disabled = true;
            apiPost('/api/v1/marketplace/deals/' + dealId + '/review', { rating: sel.v, text: el('fmx-rev-t').value }).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось'); return; }
                _haptic('success'); hideModal('fmx-revBg'); toast('Отзыв отправлен');
                _feed = null; _feedState = 'idle';
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
        });
        showModal('fmx-revBg');
    }
    function openReqForm() {
        var uname = '';
        try { uname = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.username) || ''; } catch (e) {}
        var fchips = Object.keys(REQ_FMT).map(function (k) { return '<button class="fmx-fx' + (k === 'any' ? ' on' : '') + '" data-rf="' + k + '">' + REQ_FMT[k] + '</button>'; }).join('');
        el('fmx-reqBody').innerHTML =
            '<span class="fmx-lbl">Ниша каналов</span><input class="fmx-inp" id="fmx-rq-niche" maxlength="64" placeholder="например, Биохакинг">' +
            '<span class="fmx-lbl fmx-mt2">Бюджет, ₽ (необязательно)</span><input class="fmx-inp" id="fmx-rq-budget" type="number" min="0" step="500" placeholder="например, 15000">' +
            '<span class="fmx-lbl fmx-mt2">Формат размещения</span><div class="fmx-fxw" id="fmx-rq-fmt">' + fchips + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Что рекламируем и требования</span><textarea class="fmx-inp" id="fmx-rq-text" rows="4" maxlength="500" placeholder="Продукт, гео аудитории, пожелания к каналам. Минимум 20 символов."></textarea>' +
            '<span class="fmx-lbl fmx-mt2">Контакт для связи</span><div class="fmx-chbtn" style="cursor:text;"><span style="color:#8990a8;">@</span><input class="fmx-inp" id="fmx-rq-contact" style="border:none;background:transparent;padding:0 0 0 4px;flex:1;" maxlength="64" value="' + _esc(uname) + '" placeholder="username"></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">Заявка видна всем владельцам каналов — они напишут на указанный контакт. Максимум 3 активных заявки. Правила площадки действуют и здесь.</div>' +
            '<button class="fmx-save" id="fmx-rq-send" style="margin-top:14px;"><i class="ti ti-send"></i> Опубликовать заявку</button>';
        var fsel = { v: 'any' };
        qsa(el('fmx-rq-fmt'), '[data-rf]').forEach(function (b) { b.addEventListener('click', function () { fsel.v = b.getAttribute('data-rf'); qsa(el('fmx-rq-fmt'), '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }); });
        el('fmx-rq-send').addEventListener('click', function () {
            var txtEl = el('fmx-rq-text'), cEl = el('fmx-rq-contact');
            var bad = null;
            if (txtEl.value.trim().length < 20) bad = txtEl;
            else if (!cEl.value.trim()) bad = cEl;
            qsa(el('fmx-reqBody'), '.fmx-inp').forEach(function (i) { i.style.borderColor = ''; });
            var hint = el('fmx-rq-hint'); if (hint) hint.remove();
            if (bad) {
                _haptic('error');
                bad.style.borderColor = '#ef4444';
                bad.insertAdjacentHTML('afterend', '<div id="fmx-rq-hint" style="font-size:10.5px;color:#ef4444;margin-top:5px;">' + (bad === txtEl ? 'Опиши задачу подробнее — минимум 20 символов.' : 'Укажи @username — сюда будут писать владельцы каналов.') + '</div>');
                bad.focus();
                return;
            }
            var btn = this; btn.disabled = true;
            apiPost('/api/v1/marketplace/requests', {
                contact_username: el('fmx-rq-contact').value,
                niche: el('fmx-rq-niche').value,
                budget: +el('fmx-rq-budget').value || null,
                format: fsel.v,
                text: el('fmx-rq-text').value
            }).then(function (r) {
                btn.disabled = false;
                if (r && r.ok === false) { _haptic('error'); uiAlert(r.error || 'Не удалось опубликовать'); return; }
                _haptic('success'); hideModal('fmx-reqBg'); toast('Заявка размещена');
                _reqs = null; _reqState = 'idle'; renderSell();
            }).catch(function () { btn.disabled = false; uiAlert('Не удалось опубликовать. Повтори попытку.'); });
        });
        showModal('fmx-reqBg');
    }

    function renderCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        sub.innerHTML = '<div class="fmx-load"><i class="ti ti-loader-2"></i><div style="font-size:12px;margin-top:10px;">Загружаю конструктор…</div></div>';
        Promise.all([loadChannels(), loadMyListings()]).then(function () {
            var pubs = _channels.filter(function (c) { return c.username; });
            if (!pubs.length) { sub.innerHTML = emptyHtml('ti-plus', 'Нет подходящих каналов', 'Чтобы выставить канал на Площадку, у него должен быть публичный @username. Добавь или настрой канал в приложении.'); return; }
            var def = null;
            if (_mineEditCh != null) {
                for (var k = 0; k < pubs.length; k++) if (pubs[k].id === _mineEditCh) { def = _mineEditCh; break; }
                _mineEditCh = null;
            }
            if (def == null) {
                var _actId = null;
                try { _actId = window.__fmActiveChannelId; } catch (e) {}
                if (_actId != null) for (var a = 0; a < pubs.length; a++) if (String(pubs[a].id) === String(_actId)) { def = pubs[a].id; break; }
            }
            if (def == null) for (var i = 0; i < pubs.length; i++) if (listingForChannel(pubs[i].id)) { def = pubs[i].id; break; }
            if (def == null) def = pubs[0].id;
            selectChannel(def);
        }).catch(function () {
            sub.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить конструктор', 'Проверь связь и повтори попытку.');
        });
    }
    function channelById(id) { for (var i = 0; i < _channels.length; i++) if (_channels[i].id === id) return _channels[i]; return null; }
    function listingForChannel(id) { var ch = channelById(id); if (!ch || !ch.username) return null; for (var j = 0; j < _myListings.length; j++) { var u = _myListings[j].username; if (u && u.toLowerCase() === ch.username.toLowerCase()) return _myListings[j]; } return null; }

    function defaultState() {
        return { cover: 1, covType: 'grad', avatar: 'tg', avEmoji: '🧬', color: '#5DCAA5', font: 'bold',
            move: 'none', over: 'none', glow: 'none', orbit: 'none', part: 'none', atomColor: '#5DCAA5', glowCard: false, fullBg: false, glass: 'none', btns: 'std',
            coverGrad: null, att: { avatar: '', cover: '', body: [], list: [] }, _media: {}, _desc: '', _tags: '', _erid: null, _hideInsights: false, _title: null, listingId: null, channelId: null };
    }
    function _suggestBase() {
        var id = _ss && _ss.channelId;
        var arr = _channels || [];
        for (var i = 0; i < arr.length; i++) {
            if (id != null && String(arr[i].id) === String(id) && arr[i].suggested_base) return arr[i].suggested_base;
        }
        if (arr.length === 1 && arr[0].suggested_base) return arr[0].suggested_base;
        return null;
    }
    function defaultFmts() {
        var b = _suggestBase();
        return FMT_CATALOG.map(function (f) {
            var p = b ? Math.round(b * f.preset / 5500 / 50) * 50 : f.preset;
            return { on: !!f.base, format: f.k, n: f.n, p: (p > 0 ? p : f.preset), core: f.core, sub: f.sub, base: !!f.base };
        });
    }
    function hydrate(l) {
        _ss.listingId = l.id;
        _ss._status = l.status || null;
        _ss.sticker = l.sticker_json || l.sticker || null;
        _ss.showDeals = l.show_deals !== false;
        if (l.accent_color) _ss.color = l.accent_color;
        if (l.cover_gradient) { var gi = COVERS.indexOf(l.cover_gradient); if (gi >= 0) { _ss.cover = gi; _ss.coverGrad = null; } else _ss.coverGrad = l.cover_gradient; }
        if (l.cover_type) _ss.covType = (l.cover_type === 'gif') ? 'img' : l.cover_type;
        var fx = l.effects_json || {};
        ['move', 'over', 'glow', 'orbit', 'part'].forEach(function (k) { if (fx[k]) _ss[k] = fxAllow(k, fx[k]); });
        _ss.glowCard = !!fx.glowCard;
        _ss.fullBg = !!fx.fullBg;
        _ss.glass = fxAllow('glass', (fx.glass === true) ? 'frost' : (typeof fx.glass === 'string' ? fx.glass : 'none'));
        _ss.btns = fx.btns === 'accent' ? 'accent' : 'std';
        if (fx.atomColor) _ss.atomColor = fx.atomColor;

        _ss.topTag = fx.topTag || 'on';
        _ss.badgeFree = fx.badgeFree || null;
        if (l.title_style) _ss.font = l.title_style;
        _ss.avatar = 'tg';
        if (l.formats && l.formats.length) {
            _sfmts.forEach(function (f) { f.on = false; });
            l.formats.forEach(function (rf) {
                var key = _fmtKey(rf.format), found = false;
                _sfmts.forEach(function (f) { if (f.format === key) { f.on = true; f.p = rf.price; found = true; } });
                if (!found) {
                    var m = _fmtMeta(key);
                    _sfmts.push({ on: true, format: key, n: m ? m.n : (rf.label || key), p: rf.price, core: m ? m.core : false, sub: m ? m.sub : '', base: m ? !!m.base : false });
                }
            });
        }
        _ss._desc = l.custom_text || '';
        if (l.emoji_attachments_json) { var _at = l.emoji_attachments_json; ['cover', 'avatar', 'cardbg'].forEach(function (k) { if (_at[k] && typeof _at[k] === 'object') _ss.att[k] = _at[k]; }); }
        ['cover', 'avatar', 'cardbg'].forEach(function (k) {
            var a = (typeof _ss.att[k] === 'object' && _ss.att[k]) ? _ss.att[k] : null;
            var srvUrl = (k === 'cover') ? l.cover_url : (k === 'avatar' ? l.avatar_url : (a && a.url));
            if (a && a.url) srvUrl = a.url;
            if (!srvUrl) return;
            if (!a) { a = { x: 50, y: 50, s: 1 }; _ss.att[k] = a; }
            if (!a.url) a.url = srvUrl;
            var kk = a.kind || (/\.mp4($|\?)/.test(srvUrl) ? 'video' : (/\.gif($|\?)/.test(srvUrl) ? 'gif' : 'img'));
            _ss._media[k] = { url: mediaAbs(srvUrl), kind: kk, name: a.name || 'файл на сервере' };
        });
        _ss._tags = (l.tags_json || []).join(', ');
        _ss._erid = l.erid_who || null;
        _ss._hideInsights = !!l.hide_insights;
    }
    function selectChannel(id) {
        _ss = defaultState(); _sfmts = defaultFmts(); _ss.sticker = null; _ss.showDeals = true; _ss.channelId = id;
        var l = listingForChannel(id); if (l) hydrate(l);
        _ss.channelId = id; _secCreate = 'cover';
        paintCreate();
    }
    function curChannel() { return channelById(_ss.channelId) || { title: 'Твой канал', username: 'your_channel', subscribers: null }; }

    function _chSortForPicker(list, hasListing) {
        return list.slice().sort(function (a, b) {
            function rank(c) {
                if (!c.username) return 2;
                return hasListing(c.id) ? 0 : 1;
            }
            var ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            var ta = String(a.title || a.username || ''), tb = String(b.title || b.username || '');
            return ta.localeCompare(tb, undefined, { sensitivity: 'base' });
        });
    }
    function paintCreate() {
        var sub = el('fmx-sub'); if (!sub) return;
        var existing = listingForChannel(_ss.channelId);
        var cur = channelById(_ss.channelId);
        var rows = _chSortForPicker(_channels, function (cid) { return !!listingForChannel(cid); }).map(function (c) {
            var pub = !!c.username;
            return '<div class="fmx-chrow' + (c.id === _ss.channelId ? ' sel' : '') + (pub ? '' : ' dis') + '" data-cid="' + c.id + '" data-pub="' + (pub ? 1 : 0) + '"><div class="fmx-chav"' + (pub ? '' : ' style="background:rgba(255,255,255,0.08);color:#8990a8;"') + '>' + (c.avatar_url ? '<img src="' + mediaAbs(c.avatar_url) + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">' : _esc((c.title || c.username || '?').charAt(0))) + '</div><div style="flex:1;min-width:0;"><div class="fmx-chtt">' + _esc(c.title || (pub ? '@' + c.username : 'Канал')) + '</div><div class="fmx-chuu">' + (pub ? '@' + _esc(c.username) : 'приватный — нужен публичный @username') + '</div></div>' + (pub ? (listingForChannel(c.id) ? '<i class="ti ti-circle-check-filled" style="color:#5DCAA5;flex-shrink:0;"></i>' : '') : '<i class="ti ti-lock" style="color:#565b73;flex-shrink:0;"></i>') + '</div>';
        }).join('');
        sub.innerHTML =
            '<div class="fmx-hero" id="fmx-hero"></div>' +
            '<div style="font-size:10px;color:#565b73;text-align:center;margin:8px 0 10px;line-height:1.35;"><i class="ti ti-hand-click"></i> Нажми на часть оффера, чтобы изменить его</div>' +
            '<button class="fmx-btn" id="fmx-resetAll" style="width:100%;margin:0 0 12px;color:#8990a8;"><i class="ti ti-restore"></i> Сброс настроек</button>' +
            '<div id="fmx-hlist" style="margin:-4px 0 16px;"></div>' +
            '<div class="fmx-chdd" id="fmx-chdd"><button class="fmx-chbtn" id="fmx-chbtn" type="button"><i class="ti ti-broadcast lead"></i><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + _esc(cur ? ('@' + cur.username + (cur.title ? ' · ' + cur.title : '')) : 'Выбери канал') + '</span><i class="ti ti-chevron-down chev"></i></button><div class="fmx-chlist">' + rows + '</div></div>' +
            (function () {
                if (!existing) return '<div class="fmx-chnote">Новое размещение для этого канала</div>';
                var ms = existing.moderation_status || '';
                if (existing.status === 'rejected') return '<div class="fmx-chnote" style="color:#ef8080;border:0.5px solid rgba(239,68,68,0.3);border-radius:10px;padding:9px 12px;">Оффер отклонён' + (existing.reject_reason ? ': ' + _esc(existing.reject_reason) : '') + '<br>Исправь и нажми «Сохранить оффер» — он уйдёт на повторную проверку.</div>';
                if (existing.status === 'pending' && (ms === 'needs_review' || ms === 'complaints_hold')) return '<div class="fmx-chnote" style="color:#f5bf4f;border:0.5px solid rgba(245,191,79,0.3);border-radius:10px;padding:9px 12px;"><span>Оффер на ручной проверке — это не блокировка</span>' + (existing.reject_reason ? '. <span>' + _esc(existing.reject_reason) + '</span>' : '') + '<br>Проверим и опубликуем — обычно до суток.</div>';
                return '<div class="fmx-chnote">Редактируешь оффер · статус:' + _esc(existing.status_human || existing.status || '—') + '</div>';
            })() +
            accSec('cover', 'ti-photo', 'Обложка', paneCover()) +
            accSec('fx', 'ti-sparkles', 'Эффекты и анимация', paneFx()) +
            accSec('sticker', 'ti-sticker', 'Стикер', '<div id="fmx-stkBody">' + loadHtml() + '</div>') +
            accSec('style', 'ti-palette', 'Стиль', paneStyleMin()) +
            accSec('price', 'ti-cash', 'Форматы и цены', panePrice()) +
            accSec('text', 'ti-text-caption', 'Текст', paneText()) +
            '<button class="fmx-save" id="fmx-save" style="margin-top:18px;"><i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить оффер' : 'Опубликовать на Площадке') + '</button>' +
            '<div class="fmx-tplink" data-terms="s"><i class="ti ti-clipboard-text"></i> <span>Условия размещения</span></div>' +
            (_ss.listingId ? '<button class="fmx-btn" id="fmx-toMine" style="width:100%;margin-top:10px;"><i class="ti ti-briefcase"></i> Кабинет «Мои офферы»</button>' : '') +
            '<label class="fmx-dealtgl"><input type="checkbox" id="fmx-showdeals"' + (_ss.showDeals !== false ? ' checked' : '') + '> Показывать сделки и рейтинг на оффере</label>' +
            '<div class="fmx-savenote">После публикации оффер пройдёт проверку по смыслу. Опции с замком применяются при активном продвижении на 30 дней.</div>';
        var dd = el('fmx-chdd');
        el('fmx-chbtn').addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('on'); });
        qsa(dd, '.fmx-chrow').forEach(function (r) { r.addEventListener('click', function () { if (r.getAttribute('data-pub') !== '1') { toast('Нужен публичный @username — включи его в настройках канала в Telegram'); return; } dd.classList.remove('on'); _haptic('light'); selectChannel(+r.getAttribute('data-cid')); }); });
        qsa(sub, '.fmx-acc .fmx-acch').forEach(function (h) { h.addEventListener('click', function () { var id = h.parentNode.getAttribute('data-ac'); openAcc(_secCreate === id ? null : id, false); }); });
        el('fmx-save').addEventListener('click', saveStudio);
        var ra = el('fmx-resetAll');
        if (ra) ra.addEventListener('click', function () {
            uiConfirm('Сбросить все настройки оформления к стандартным? На Площадке изменения появятся после сохранения оффера.', function () {
                var keepCh = _ss.channelId, keepId = _ss.listingId, keepSt = _ss._status;
                _ss = defaultState(); _sfmts = defaultFmts();
                _ss.channelId = keepCh; _ss.listingId = keepId; _ss._status = keepSt;
                _ss.sticker = null; _ss.showDeals = true;
                _haptic('success'); toast('Настройки сброшены к стандартным');
                paintCreate();
            });
        });
        loadStickerPane();
        var sdT = el('fmx-showdeals');
        if (sdT) sdT.addEventListener('change', function () { _ss.showDeals = sdT.checked; renderHero(); });
        var tm = el('fmx-toMine');
        if (tm) tm.addEventListener('click', function () { _haptic('light'); _backTo = null; setSubTab('mine'); });
        bindCover(); bindStyle(); bindPrice(); bindText();
        renderHero();
        openAcc(_secCreate || 'cover', false);
        if (window.__fmxCdDock) { try { window.__fmxCdDock.destroy(); } catch (e) {} }
        window.__fmxCdDock = _fmxBuildCardDock({
            scroll: el('fmx-scrollEl'), dockParent: sub, wrap: el('fmx-hero'), root: sub,
            tr: function (s2) { return (typeof window.t === 'function') ? window.t(s2) : s2; },
            sections: [['cover', 'Обложка'], ['fx', 'Эффекты'], ['sticker', 'Стикер'], ['style', 'Стиль'], ['price', 'Цены'], ['text', 'Текст']],
            openSection: function (id) { openAcc(id, false); },
            renderPreview: function (box) {
                var pl = _previewListing();
                if (_ss && _ss.sticker && _ss.sticker.url) pl.sticker_json = _ss.sticker;
                box.innerHTML = fullCard(pl) + '<div style="margin-top:12px;">' + listItem(pl) + '</div>';
                try { hydrateTgs(box); } catch (e2) {}
            },
            stateKey: function () { try { return JSON.stringify(_previewListing()) + '|' + JSON.stringify(_sfmts) + '|' + JSON.stringify((_ss && _ss.sticker) || null); } catch (e2) { return String(Date.now()); } }
        });
    }
    function accSec(id, icon, title, body) {
        return '<div class="fmx-acc" data-ac="' + id + '"><div class="fmx-acch"><div class="fmx-accic"><i class="ti ' + icon + '"></i></div><div style="flex:1;min-width:0;"><div class="fmx-acct">' + title + '</div><div class="fmx-accv" id="fmx-accv-' + id + '"></div></div><i class="ti ti-chevron-down fmx-accc"></i></div><div class="fmx-accb"><div class="fmx-acci">' + body + '</div></div></div>';
    }
    function openAcc(id, scroll) {
        _secCreate = id;
        qsa(el('fmx-main'), '.fmx-acc').forEach(function (a) { a.classList.toggle('open', a.getAttribute('data-ac') === id); });
        updateAccSummaries();
        if (id && scroll) { var a = qsa(el('fmx-main'), '.fmx-acc').filter(function (x) { return x.getAttribute('data-ac') === id; })[0]; if (a && a.scrollIntoView) setTimeout(function () { a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); }
    }
    function updateAccSummaries() {
        var m = {
            cover: _ss.covType === 'grad' ? (_ss.coverGrad ? 'Свой градиент' : (COVER_NAMES[_ss.cover] || 'Градиент')) : ((_ss._media && _ss._media.cover && _ss._media.cover.name) || 'Свой файл'),
            fx: (function () { var n = (_ss.glow !== 'none' ? 1 : 0); if (_ss.glass !== 'none') n++; if (_ss.glowCard) n++; return n ? n + ' актив.' : 'Выключены'; })(),
            style: (FONTS.filter(function (f) { return f[0] === _ss.font; })[0] || ['', 'Обычный'])[1] + ' · <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + _ss.color + ';vertical-align:-1px;"></span>',
            price: (function () { var on = _sfmts.filter(function (f) { return f.on; }); if (!on.length) return 'Не выбраны'; return on.length + ' форм. · от ' + _num(Math.min.apply(null, on.map(function (f) { return f.p; }))) + ' ₽'; })(),
            text: (_ss._desc ? 'Описание готово' : 'Заголовок и описание')
        };
        Object.keys(m).forEach(function (k) { var e = el('fmx-accv-' + k); if (e) e.innerHTML = m[k]; });
    }

    function sizePanes() { var p = el('fmx-panes'); if (!p) return; var a = p.querySelector('.fmx-pane.on'); if (a) p.style.height = a.offsetHeight + 'px'; }

    function mediaBoxHtml(target, hint) {
        var m = _ss._media && _ss._media[target];
        var row = m
            ? '<div class="fmx-note fmx-gr" style="margin-bottom:9px;"><i class="ti ' + (m.kind === 'video' ? 'ti-video' : 'ti-photo-check') + '"></i> ' + _esc(m.name || 'файл выбран') + '</div>' +
              '<div class="fmx-uplrow"><button class="fmx-upl" data-mp="' + target + '"><i class="ti ti-refresh"></i> Заменить</button>' +
              '<button class="fmx-upl sec" data-me="' + target + '"><i class="ti ti-crop"></i> Кадрирование</button>' +
              '<button class="fmx-upl sec" data-md="' + target + '"><i class="ti ti-trash"></i></button></div>'
            : '<button class="fmx-upl" data-mp="' + target + '"><i class="ti ti-cloud-upload"></i> Выбрать файл</button>';
        return row + '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:8px;">' + hint + '</div>';
    }
    function bindMediaBox(scope) {
        qsa(scope, '[data-mp]').forEach(function (b) { b.addEventListener('click', function () { pickMedia(b.getAttribute('data-mp')); }); });
        qsa(scope, '[data-me]').forEach(function (b) { b.addEventListener('click', function () { editMedia(b.getAttribute('data-me')); }); });
        qsa(scope, '[data-md]').forEach(function (b) { b.addEventListener('click', function () { delMedia(b.getAttribute('data-md')); }); });
    }
    function paneCover() {
        var seg = '<div class="fmx-mtabs" id="fmx-covtype">' +
            '<button class="fmx-mt' + (_ss.covType === 'grad' ? ' on' : '') + '" data-ct="grad"><i class="ti ti-color-swatch"></i> Градиент</button>' +
            '<button class="fmx-mt' + (_ss.covType !== 'grad' ? ' on' : '') + '" data-ct="img"><i class="ti ti-cloud-upload"></i> Загрузить</button></div>';
        var custom = !!_ss.coverGrad;
        var grads = '<div id="fmx-gradbox" style="' + (_ss.covType === 'grad' ? '' : 'display:none;') + '"><span class="fmx-lbl">Фон обложки</span><div class="fmx-grads" id="fmx-grads">' +
            COVERS.map(function (g, i) { return '<div class="fmx-gd' + (!custom && i === _ss.cover ? ' on' : '') + '" data-g="' + i + '" style="background:' + g + '" title="' + COVER_NAMES[i] + '"></div>'; }).join('') +
            '<div class="fmx-gd fmx-dot-rb' + (custom ? ' on' : '') + '" data-grb="1" title="Свой градиент"></div></div>' +
            '<div class="fmx-huerow" id="fmx-grads-hue" style="' + (custom ? '' : 'display:none;') + '"><input type="range" min="0" max="359" step="1" value="200"><div class="fmx-hueprev" style="background:' + (_ss.coverGrad || COVERS[0]) + ';"></div></div></div>';
        var upl = '<div id="fmx-uplbox" style="' + (_ss.covType === 'grad' ? 'display:none;' : '') + '">' +
            mediaBoxHtml('cover', 'Картинка, GIF или видео до 30 секунд, до 64 МБ. Лучше всего смотрится от 1600×800 — подгонишь кадрированием. Что нельзя использовать — в Справке, раздел «Правила».') + '</div>';
        return seg + grads + upl;
    }
    function bindCover() {
        qsa(el('fmx-covtype'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.covType = b.getAttribute('data-ct'); qsa(el('fmx-covtype'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); var gb = el('fmx-gradbox'), ub = el('fmx-uplbox'); if (gb) gb.style.display = _ss.covType === 'grad' ? '' : 'none'; if (ub) ub.style.display = _ss.covType === 'grad' ? 'none' : ''; renderHero(); sizePanes(); }); });
        var gr = el('fmx-grads'), ghue = el('fmx-grads-hue'), gsl = ghue ? ghue.querySelector('input') : null, gprev = ghue ? ghue.querySelector('.fmx-hueprev') : null;
        function gradOf(h) { return 'linear-gradient(135deg,' + hslHex(h) + ',' + hslHex((h + 55) % 360) + ')'; }
        qsa(gr, '[data-g]').forEach(function (g) { g.addEventListener('click', function () { _ss.cover = +g.getAttribute('data-g'); _ss.coverGrad = null; if (ghue) ghue.style.display = 'none'; qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); g.classList.add('on'); renderHero(); }); });
        var grb = gr ? gr.querySelector('[data-grb]') : null;
        if (grb) grb.addEventListener('click', function () { if (!ghue) return; var open = ghue.style.display !== 'none'; ghue.style.display = open ? 'none' : 'flex'; if (!open && gsl) { _ss.coverGrad = gradOf(+gsl.value); qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); grb.classList.add('on'); if (gprev) gprev.style.background = _ss.coverGrad; renderHero(); } });
        if (gsl) gsl.addEventListener('input', function () { _ss.coverGrad = gradOf(+this.value); if (gprev) gprev.style.background = _ss.coverGrad; qsa(gr, '.fmx-gd').forEach(function (x) { x.classList.remove('on'); }); if (grb) grb.classList.add('on'); _liveCover(_ss.coverGrad); _heroDebounced(); });
        bindMediaBox(qsa(el('fmx-main'), '[data-ac="cover"]')[0]);
    }

    function paneFx() {
        return fxChips('glow', FX_GLOW, 'Свечение', 'Доступно при любом продвижении или на тарифе Pro+') +
            fxChips('glass', FX_GLASS, 'Стеклянные кнопки', 'Доступно при продвижении от недели или на тарифе Agency') +
            '<div class="fmx-tog' + (_ss.glowCard ? ' on' : '') + '" id="fmx-glowcard" style="margin-top:12px;"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Золотое свечение оффера <i class="ti ti-lock" style="font-size:10px;color:#f5bf4f;"></i></span></div>' +
            '<div style="margin-top:10px;">' +
            '<div style="font-size:10.5px;color:#8990a8;margin-bottom:2px;">Тег «Продвигается» в шапке <i class="ti ti-lock" style="font-size:10px;color:#f5bf4f;"></i></div>' +
            '<div class="fmx-fxlock" style="margin:0 0 6px;">Только при продвижении «Месяц в ленте»</div>' +
            '<div style="display:flex;gap:6px;" data-fxg="topTag">' +
            '<button class="fmx-fx' + (_ss.topTag === 'on' ? ' on' : '') + '" data-v="on">Видна</button>' +
            '<button class="fmx-fx' + (_ss.topTag === 'ghost' ? ' on' : '') + '" data-v="ghost">Прозрачная</button>' +
            '<button class="fmx-fx' + (_ss.topTag === 'off' ? ' on' : '') + '" data-v="off">Скрыта</button>' +
            '</div></div>' +
            '<div style="font-size:10px;color:#565b73;line-height:1.5;margin-top:6px;"><i class="ti ti-info-circle"></i> <span style="color:#f5bf4f;">Золотое свечение и тег «Продвигается» — только при продвижении «Месяц в ленте». Всё с замком можно примерить в предпросмотре.</span></div>' +
            (_isMod() ? '<button class="fmx-btn" id="fmx-modboost" style="width:100%;margin-top:10px;border-color:rgba(245,191,79,0.5);color:#f5bf4f;"><i class="ti ti-crown"></i> Мод-режим: включить Топ на 30 дней</button>' : '');
    }
    function paneStyleMin() {
        return '<span class="fmx-lbl">Цвет кнопки</span>' + colorPick('fmx-colors', _ss.color) +
            '<span class="fmx-lbl fmx-mt2">Фон кнопок карточки</span><div class="fmx-mtabs" id="fmx-btns">' +
            '<button class="fmx-mt' + (_ss.btns !== 'accent' ? ' on' : '') + '" data-b="std">Стандарт</button>' +
            '<button class="fmx-mt' + (_ss.btns === 'accent' ? ' on' : '') + '" data-b="accent">Все — в цвет</button></div>' +
            '<div class="fmx-fxlock" style="margin:6px 0 0;color:#8990a8;">«Все — в цвет» красит все три кнопки карточки в выбранный цвет: главная — заливкой, остальные — полупрозрачным фоном.</div>' +
            '<span class="fmx-lbl fmx-mt2">Шрифт заголовка</span><div class="fmx-mtabs" id="fmx-font">' +
            FONTS.map(function (f) { return '<button class="fmx-mt' + (f[0] === _ss.font ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>' +
            '<span class="fmx-lbl fmx-mt2">Фон оффера</span>' +
            '<div id="fmx-bodybox">' + mediaBoxHtml('cardbg', 'Картинка-фон — доступна всем. GIF и MP4-анимация — только при продвижении «Месяц в ленте». Подложка под цифрами затемняется автоматически, читаемость не страдает.') + '</div>' +
            '<div class="fmx-tog' + (_ss.fullBg ? ' on' : '') + '" id="fmx-fullbg" style="margin-top:12px;"><div class="fmx-sw"><i></i></div><span style="font-size:12.5px;">Фон во всю карточку — без шапки</span></div>' +
            '<div class="fmx-fxlock" style="margin:6px 0 0;color:#8990a8;">Обложка скрывается, фон занимает всю карточку — доступно всем. Анимированный фон (GIF/MP4) — только при продвижении «Месяц в ленте».</div>';
    }
    function hslHex(h) {
        var s = 0.85, l = 0.62, c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        function q(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
        return '#' + q(r) + q(g) + q(b);
    }
    function hsv2rgb(h, s, v) {
        var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
    function rgb2hsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
        if (d) {
            if (mx === r) h = 60 * (((g - b) / d) % 6);
            else if (mx === g) h = 60 * ((b - r) / d + 2);
            else h = 60 * ((r - g) / d + 4);
        }
        if (h < 0) h += 360;
        return [h, mx ? d / mx : 0, mx];
    }
    function rgb2hex(r, g, b) {
        return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
    }
    function hex2rgb(hx) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(hx || '').trim());
        if (!m) return null;
        var n = parseInt(m[1], 16);
        return [n >> 16, (n >> 8) & 255, n & 255];
    }
    function hsl2rgb(h, s, l) {
        s /= 100; l /= 100;
        var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
        else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
        return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
    }
    function colorPick(idBase, cur, sz) {
        var st = sz ? 'width:' + sz + 'px;height:' + sz + 'px;' : '';
        var custom = COLORS.indexOf(cur) < 0;
        return '<div class="fmx-dots" id="' + idBase + '" data-cur="' + _esc(cur) + '">' +
            COLORS.map(function (c) { return '<div class="fmx-dot' + (c === cur ? ' on' : '') + '" data-cv="' + c + '" style="background:' + c + ';' + st + '"></div>'; }).join('') +
            '<div class="fmx-dot fmx-dot-rb' + (custom ? ' on' : '') + '" data-rb="1" style="' + st + (custom ? 'box-shadow:0 0 0 2px ' + cur + ';' : '') + '" title="Свой цвет"></div></div>';
    }
    function bindColorPick(idBase, set, title) {
        var box = el(idBase); if (!box) return;
        var rb = box.querySelector('[data-rb]');
        function mark(v) {
            var preset = COLORS.indexOf(v) >= 0;
            qsa(box, '.fmx-dot').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-cv') === v || (d === rb && !preset)); });
            if (rb) rb.style.boxShadow = preset ? '' : '0 0 0 2px ' + v;
            box.setAttribute('data-cur', v);
        }
        qsa(box, '[data-cv]').forEach(function (d) { d.addEventListener('click', function () { var v = d.getAttribute('data-cv'); set(v); mark(v); _liveAccent(v); _heroDebounced(); }); });
        if (rb) rb.addEventListener('click', function () {
            openColorStudio(box.getAttribute('data-cur') || '#5DCAA5', function (hex) { set(hex); mark(hex); _liveAccent(hex); _heroDebounced(); }, title || 'Свой');
        });
    }
    function gradFromHex(hex) {
        var c = hex2rgb(hex); if (!c) return 'linear-gradient(135deg,' + hex + ',' + hex + ')';
        var hv = rgb2hsv(c[0], c[1], c[2]);
        var c2 = hsv2rgb((hv[0] + 28) % 360, Math.min(1, hv[1] * 1.05 + 0.05), Math.max(0.18, hv[2] * 0.6));
        return 'linear-gradient(135deg,' + hex + ',' + rgb2hex(c2[0], c2[1], c2[2]) + ')';
    }
    function coverSeedColor() {
        var g = _ss.coverGrad || COVERS[_ss.cover] || '';
        var m = /#([0-9a-fA-F]{6})/.exec(g);
        return m ? '#' + m[1] : '#5DCAA5';
    }
    var _heroColorT = null;
    function _heroDebounced() { clearTimeout(_heroColorT); _heroColorT = setTimeout(function () { _heroColorT = null; renderHero(); }, 150); }
    function _liveAccent(hex) { var h = el('fmx-hero'); if (h) qsa(h, '.fmx-kmg .v.pr').forEach(function (n) { n.style.color = hex; }); }
    function _liveCover(grad) { var h = el('fmx-hero'); if (h) qsa(h, '.fmx-cov-bg').forEach(function (n) { n.style.background = grad; }); }
    function setAccentColor(hex) {
        _ss.color = hex;
        var box = el('fmx-colors');
        if (box) {
            var preset = COLORS.indexOf(hex) >= 0, rb = box.querySelector('[data-rb]');
            qsa(box, '.fmx-dot').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-cv') === hex || (d === rb && !preset)); });
            if (rb) rb.style.boxShadow = preset ? '' : '0 0 0 2px ' + hex;
            box.setAttribute('data-cur', hex);
        }
        _liveAccent(hex); _heroDebounced();
    }
    function openColorStudio(cur, onPick, title) {
        var old = el('fmx-cpBg'); if (old) old.remove();
        try { if (typeof tg !== 'undefined' && tg) { if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); if (tg.expand) tg.expand(); } } catch (e) {}
        var st = { h: 160, s: 0.6, v: 0.8, mode: 'sv', px: 0.5, py: 0.5, ss: 1 };
        var c0 = hex2rgb(cur);
        if (c0) { var hv = rgb2hsv(c0[0], c0[1], c0[2]); st.h = hv[0]; st.s = hv[1]; st.v = hv[2]; }
        var bg = document.createElement('div');
        bg.id = 'fmx-cpBg'; bg.className = 'fmx-cfm';
        bg.innerHTML = '<div class="fmx-cfm-box" id="fmx-cp-box">' +
            '<div class="fmx-cp-head" id="fmx-cp-head"><div class="fmx-cp-pt">Цвет: <b>' + (title || 'Свой') + '</b></div>' +
            '<div style="display:flex;gap:6px;"><button class="fmx-cp-x" id="fmx-cp-mode" title="Стиль палитры">⇄</button><button class="fmx-cp-x" id="fmx-cp-close" aria-label="Закрыть">✕</button></div></div>' +
            '<div class="fmx-cp-sv" id="fmx-cp-sv"><canvas id="fmx-cp-cv" width="252" height="130"></canvas><div class="fmx-cp-dot" id="fmx-cp-dot"></div></div>' +
            '<div class="fmx-cp-cap" id="fmx-cp-huecap" style="text-align:left;margin:10px 0 3px;">Оттенок</div>' +
            '<input type="range" class="fmx-cp-hue" id="fmx-cp-hue" min="0" max="359" step="1" style="margin-top:0;">' +
            '<div class="fmx-cp-row">' +
            '<div class="fmx-cp-fld hexf"><span class="fmx-cp-cap">HEX</span><input type="text" id="fmx-cp-hex" maxlength="7" autocomplete="off" autocapitalize="off" spellcheck="false"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">R</span><input type="number" id="fmx-cp-r" min="0" max="255" inputmode="numeric"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">G</span><input type="number" id="fmx-cp-g" min="0" max="255" inputmode="numeric"></div>' +
            '<div class="fmx-cp-fld"><span class="fmx-cp-cap">B</span><input type="number" id="fmx-cp-b" min="0" max="255" inputmode="numeric"></div></div>' +
            '<div class="fmx-cp-presets">' + ['#5DCAA5', '#f5bf4f', '#b9a5ff', '#7fb8ff', '#ff9db1', '#f2f3f8', '#fb923c', '#a3e635'].map(function (c) { return '<button class="fmx-cp-pd" data-cpp="' + c + '" style="background:' + c + ';" title="' + c + '"></button>'; }).join('') + '</div>' +
            '</div>';
        document.body.appendChild(bg);
        (function () {
            var box = el('fmx-cp-box'), head = el('fmx-cp-head');
            function dstart(e) {
                if (e.target.closest && e.target.closest('#fmx-cp-close')) return;
                var t = e.touches ? e.touches[0] : e, r = box.getBoundingClientRect();
                var ox = t.clientX - r.left, oy = t.clientY - r.top;
                box.style.left = r.left + 'px'; box.style.top = r.top + 'px'; box.style.bottom = 'auto'; box.style.marginLeft = '0';
                function mv(ev) {
                    var p = ev.touches ? ev.touches[0] : ev; if (ev.cancelable) ev.preventDefault(); ev.stopPropagation();
                    var x = Math.max(4, Math.min(window.innerWidth - r.width - 4, p.clientX - ox));
                    var y = Math.max(4, Math.min(window.innerHeight - 44, p.clientY - oy));
                    box.style.left = x + 'px'; box.style.top = y + 'px';
                }
                function up() { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up); }
                document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
                document.addEventListener('touchmove', mv, { passive: false }); document.addEventListener('touchend', up);
            }
            head.addEventListener('mousedown', dstart); head.addEventListener('touchstart', dstart, { passive: false });
            el('fmx-cp-close').addEventListener('click', function () { done(); });
        })();
        var cv = el('fmx-cp-cv'), cx = cv.getContext('2d'), dot = el('fmx-cp-dot'), hue = el('fmx-cp-hue'), svb = el('fmx-cp-sv');
        function specApply() {
            var c = hsl2rgb(st.px * 360, Math.round(st.ss * 100), 92 - st.py * 84);
            var h = rgb2hsv(c[0], c[1], c[2]);
            st.h = h[0]; st.s = h[1]; st.v = h[2];
        }
        function specFromRgb(r, g, b) {
            var rr = r / 255, gg = g / 255, bb = b / 255;
            var mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb), d = mx - mn, h = 0;
            if (d) {
                if (mx === rr) h = 60 * (((gg - bb) / d) % 6);
                else if (mx === gg) h = 60 * ((bb - rr) / d + 2);
                else h = 60 * ((rr - gg) / d + 4);
            }
            if (h < 0) h += 360;
            var l = (mx + mn) / 2, den = 1 - Math.abs(2 * l - 1);
            st.px = h / 360;
            st.py = Math.max(0, Math.min(1, (92 - l * 100) / 84));
            st.ss = den ? Math.max(0, Math.min(1, d / den)) : 0;
        }
        function draw() {
            if (st.mode === 'spec') {
                var sat = Math.round(st.ss * 100);
                for (var x = 0; x < cv.width; x++) {
                    var hh = x / cv.width * 360;
                    var g = cx.createLinearGradient(0, 0, 0, cv.height);
                    g.addColorStop(0, 'hsl(' + hh + ',' + sat + '%,92%)');
                    g.addColorStop(0.5, 'hsl(' + hh + ',' + sat + '%,50%)');
                    g.addColorStop(1, 'hsl(' + hh + ',' + sat + '%,8%)');
                    cx.fillStyle = g; cx.fillRect(x, 0, 1, cv.height);
                }
                return;
            }
            var base = hsv2rgb(st.h, 1, 1);
            var g1 = cx.createLinearGradient(0, 0, cv.width, 0);
            g1.addColorStop(0, '#fff'); g1.addColorStop(1, 'rgb(' + base.join(',') + ')');
            cx.fillStyle = g1; cx.fillRect(0, 0, cv.width, cv.height);
            var g2 = cx.createLinearGradient(0, 0, 0, cv.height);
            g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000');
            cx.fillStyle = g2; cx.fillRect(0, 0, cv.width, cv.height);
        }
        var live = false;
        function sync(keepHex) {
            var c = hsv2rgb(st.h, st.s, st.v), hex = rgb2hex(c[0], c[1], c[2]);
            if (!keepHex) el('fmx-cp-hex').value = hex;
            el('fmx-cp-r').value = c[0]; el('fmx-cp-g').value = c[1]; el('fmx-cp-b').value = c[2];
            if (st.mode === 'spec') {
                dot.style.left = (st.px * 100) + '%'; dot.style.top = (st.py * 100) + '%';
                hue.value = Math.round(st.ss * 100);
                var hh2 = Math.round(st.px * 360);
                hue.style.background = 'linear-gradient(90deg,hsl(' + hh2 + ',0%,62%),hsl(' + hh2 + ',100%,50%))';
            } else {
                dot.style.left = (st.s * 100) + '%'; dot.style.top = ((1 - st.v) * 100) + '%';
                hue.value = Math.round(st.h);
                hue.style.background = '';
            }
            dot.style.background = hex;
            if (live) onPick(hex);
        }
        function setMode(m) {
            st.mode = m;
            if (m === 'spec') { var cc = hsv2rgb(st.h, st.s, st.v); specFromRgb(cc[0], cc[1], cc[2]); }
            hue.max = m === 'spec' ? 100 : 359;
            var hc = el('fmx-cp-huecap'); if (hc) hc.textContent = m === 'spec' ? 'Насыщенность' : 'Оттенок';
            draw(); sync();
        }
        el('fmx-cp-mode').addEventListener('click', function () { setMode(st.mode === 'sv' ? 'spec' : 'sv'); });
        function svPoint(e) {
            var t = e.touches ? e.touches[0] : e;
            var r = svb.getBoundingClientRect();
            var fx = Math.max(0, Math.min(1, (t.clientX - r.left) / r.width));
            var fy = Math.max(0, Math.min(1, (t.clientY - r.top) / r.height));
            if (st.mode === 'spec') {
                st.px = fx; st.py = fy;
                specApply(); sync();
            } else { st.s = fx; st.v = 1 - fy; sync(); }
        }
        function svStart(e) {
            e.preventDefault();
            svPoint(e);
            var mv = function (ev) { ev.preventDefault(); ev.stopPropagation(); svPoint(ev); };
            var up = function () {
                document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up);
            };
            document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mv, { passive: false }); document.addEventListener('touchend', up);
        }
        svb.addEventListener('mousedown', svStart);
        svb.addEventListener('touchstart', svStart, { passive: false });
        hue.addEventListener('input', function () {
            if (st.mode === 'spec') { st.ss = Math.max(0, Math.min(1, (+this.value) / 100)); specApply(); draw(); }
            else { st.h = +this.value; draw(); }
            sync();
        });
        el('fmx-cp-hex').addEventListener('input', function () {
            var c = hex2rgb(this.value); if (!c) return;
            var hv2 = rgb2hsv(c[0], c[1], c[2]);
            st.h = hv2[0]; st.s = hv2[1]; st.v = hv2[2];
            if (st.mode === 'spec') specFromRgb(c[0], c[1], c[2]);
            draw(); sync(true);
        });
        ['r', 'g', 'b'].forEach(function (k) {
            el('fmx-cp-' + k).addEventListener('input', function () {
                var r = Math.max(0, Math.min(255, parseInt(el('fmx-cp-r').value, 10) || 0));
                var g = Math.max(0, Math.min(255, parseInt(el('fmx-cp-g').value, 10) || 0));
                var b = Math.max(0, Math.min(255, parseInt(el('fmx-cp-b').value, 10) || 0));
                var hv3 = rgb2hsv(r, g, b);
                st.h = hv3[0]; st.s = hv3[1]; st.v = hv3[2];
                if (st.mode === 'spec') specFromRgb(r, g, b);
                el('fmx-cp-hex').value = rgb2hex(r, g, b);
                draw(); sync(true);
            });
        });
        qsa(bg, '[data-cpp]').forEach(function (p) {
            p.addEventListener('click', function () {
                var c = hex2rgb(p.getAttribute('data-cpp')); if (!c) return;
                var hv4 = rgb2hsv(c[0], c[1], c[2]);
                st.h = hv4[0]; st.s = hv4[1]; st.v = hv4[2];
                if (st.mode === 'spec') specFromRgb(c[0], c[1], c[2]);
                draw(); sync(); _haptic('light');
            });
        });
        function done() { document.removeEventListener('mousedown', _outside); document.removeEventListener('touchstart', _outside); bg.remove(); }
        function _outside(e) { if (!e.target.closest('#fmx-cp-box')) done(); }
        setTimeout(function () { document.addEventListener('mousedown', _outside); document.addEventListener('touchstart', _outside); }, 0);
        draw(); sync(); live = true;
    }
    function isVipFx(key, v) { return !!(FX_VIP[key] && FX_VIP[key].indexOf(v) >= 0); }
    function fxChips(key, arr, label, lockNote) {
        var paid = !!lockNote;
        return '<div class="fmx-fxg"><div class="fmx-fxl' + (paid ? ' vipc' : '') + '">' + label + (paid ? ' <i class="ti ti-lock"></i>' : '') + '</div>' +
            (paid ? '<div class="fmx-fxlock">' + lockNote + '</div>' : '') +
            '<div class="fmx-fxw" data-fxg="' + key + '">' +
            arr.map(function (o) { var vip = isVipFx(key, o[0]); return '<button class="fmx-fx' + (o[0] === _ss[key] ? ' on' : '') + (vip ? ' vip' : '') + '" data-v="' + o[0] + '">' + (vip ? '<i class="ti ti-lock"></i>' : '') + o[1] + '</button>'; }).join('') +
            '</div></div>';
    }
    function bindStyle() {
        bindColorPick('fmx-colors', function (v) { _ss.color = v; }, 'Цвет кнопки');
        qsa(el('fmx-btns'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.btns = b.getAttribute('data-b'); qsa(el('fmx-btns'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-font'), 'button').forEach(function (b) { b.addEventListener('click', function () { _ss.font = b.getAttribute('data-f'); qsa(el('fmx-font'), 'button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); renderHero(); }); });
        qsa(el('fmx-main'), '[data-fxg]').forEach(function (g) { var key = g.getAttribute('data-fxg'); qsa(g, '.fmx-fx').forEach(function (b) { b.addEventListener('click', function () { _ss[key] = b.getAttribute('data-v'); qsa(g, '.fmx-fx').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); if (key === 'orbit') { var ar = el('fmx-atomrow'); if (ar) ar.style.display = _ss.orbit !== 'none' ? 'block' : 'none'; } renderHero(); sizePanes(); }); }); });
        el('fmx-glowcard').addEventListener('click', function () { _ss.glowCard = !_ss.glowCard; this.classList.toggle('on'); renderHero(); });
        var _fbEl = el('fmx-fullbg'); if (_fbEl) _fbEl.addEventListener('click', function () { _ss.fullBg = !_ss.fullBg; this.classList.toggle('on'); renderHero(); });
        var mb = el('fmx-modboost');
        if (mb) mb.addEventListener('click', function () {
            var base = listingForChannel(_ss.channelId);
            if (!base) { toast('Сначала сохрани оффер — топ включается для опубликованного'); return; }
            mb.disabled = true;
            apiPost('/api/v1/marketplace/mod/boost', { listing_id: base.id }).then(function (r) {
                if (r && r.ok) {
                    toast('Тег «Продвигается» включён на 30 дней');
                    loadMyListings().then(function () { renderHero(); });
                } else { toast((r && r.error) || 'Не удалось'); }
                mb.disabled = false;
            }).catch(function () { toast('Сервер не ответил: проверь, что бэкенд-файлы залиты и forgemetrics-api перезапущен'); mb.disabled = false; });
        });
        bindMediaBox(qsa(el('fmx-main'), '[data-ac="style"]')[0]);
    }

    function _fmtTile(f, i, av) {
        var c = (f.on && av && f.p) ? Math.round(f.p / av * 1000) : null;
        var title = _isCode(f.n)
            ? '<span class="fmx-ftcode">' + _esc(f.n) + '</span>'
            : '<span class="fmx-ftnm">' + _esc(f.n) + '</span>';
        if (f.base) title += '<span class="fmx-ftbase">база</span>';
        return '<div class="fmx-ft' + (f.on ? ' on' : '') + '" data-fi="' + i + '">' +
            '<div class="fmx-fsw"></div>' +
            '<div class="fmx-ftm"><div class="fmx-ftt">' + title + '</div>' +
            (f.sub ? '<div class="fmx-fts">' + _esc(f.sub) + '</div>' : '') + '</div>' +
            '<div class="fmx-ftr"><div class="fmx-ftpr"><input class="fmx-ftp" type="number" data-pi="' + i + '" value="' + f.p + '" step="100" min="0" max="999999" inputmode="numeric"><span class="cur">₽</span></div>' +
            '<div class="fmx-ftc">' + (c != null ? 'CPM ' + _num(c) + ' ₽' : (f.on ? '' : 'выкл')) + '</div></div></div>';
    }
    function fmtRows() {
        var av = (curChannel() || {}).avg_views || 0, core = [], sec = [];
        _sfmts.forEach(function (f, i) { (f.core ? core : sec).push(_fmtTile(f, i, av)); });
        var h = '<div class="fmx-fgrp"><div class="fmx-fghd">Основные форматы</div>' + core.join('') + '</div>';
        if (sec.length) h += '<div class="fmx-fgrp"><div class="fmx-fghd">Доп-опции</div>' + sec.join('') + '</div>';
        return h;
    }
    function panePrice() {
        var note = '<div class="fmx-note" style="margin-top:6px;"><i class="ti ti-bulb"></i> Нотация <b>X/Y</b> — часов в топе / часов в ленте. Цену задаёшь сам, <b>CPM</b> считается от охвата канала; верхний CPM оффера — по формату 1/24.</div>';
        var eridOpts = [['advertiser', 'Ставит рекламодатель'], ['channel', 'Ставит канал'], ['discuss', 'Обсуждается']];
        var erid = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-tag"></i> Маркировка рекламы (erid)</span>' +
            '<div class="fmx-eridseg" id="fmx-erid">' + eridOpts.map(function (o) {
                return '<button type="button" class="fmx-eridb' + (_ss._erid === o[0] ? ' on' : '') + '" data-erid="' + o[0] + '">' + o[1] + '</button>';
            }).join('') + '</div>' +
            '<div class="fmx-note" style="margin-top:6px;"><i class="ti ti-info-circle"></i> Кто ставит токен ОРД — условие размещения, видно закупщику. Авто-маркировка подключится с оплатой через площадку.</div>';
        var ins = '<span class="fmx-lbl fmx-mt2"><i class="ti ti-chart-line"></i> Аналитика в витрине</span>' +
            '<div class="fmx-htog" id="fmx-hideIns"><div class="fmx-htl">Показывать час пик и рекл. охват<i>' + (_ss._hideInsights ? 'Скрыто · видно только тебе' : 'Считает площадка по метрикам канала') + '</i></div><div class="fmx-hsw' + (_ss._hideInsights ? '' : ' on') + '"></div></div>';
        return '<span class="fmx-lbl">Что продаёшь и почём</span><div id="fmx-fmts">' + fmtRows() + '</div>' + note + erid + ins;
    }
    function bindFmtRows() {
        qsa(el('fmx-fmts'), '.fmx-ft').forEach(function (c) {
            c.addEventListener('click', function (ev) {
                if (ev.target && ev.target.classList && (ev.target.classList.contains('fmx-ftp') || ev.target.classList.contains('cur'))) return;
                var i = +c.getAttribute('data-fi'); _sfmts[i].on = !_sfmts[i].on; _haptic('light');
                c.classList.toggle('on', _sfmts[i].on);
                var cc = c.querySelector('.fmx-ftc'), av = (curChannel() || {}).avg_views || 0, p = _sfmts[i].p;
                if (cc) cc.textContent = (_sfmts[i].on && av && p) ? 'CPM ' + _num(Math.round(p / av * 1000)) + ' ₽' : (_sfmts[i].on ? '' : 'выкл');
                _heroDebounced();
            });
        });
        qsa(el('fmx-fmts'), '.fmx-ftp').forEach(function (inp) {
            inp.addEventListener('click', function (e) { e.stopPropagation(); });
            inp.addEventListener('input', function () {
                var v = Math.max(0, Math.min(999999, +inp.value || 0)), idx = +inp.getAttribute('data-pi');
                _sfmts[idx].p = v; if ((+inp.value || 0) > 999999) inp.value = v;
                var cell = inp.closest('.fmx-ft'), cc = cell ? cell.querySelector('.fmx-ftc') : null;
                var av = (curChannel() || {}).avg_views || 0;
                if (cc && _sfmts[idx].on) cc.textContent = (av && v) ? 'CPM ' + _num(Math.round(v / av * 1000)) + ' ₽' : '';
                _heroDebounced();
            });
        });
    }
    function bindPrice() {
        bindFmtRows();
        qsa(el('fmx-erid'), '.fmx-eridb').forEach(function (b) {
            b.addEventListener('click', function () {
                var v = b.getAttribute('data-erid');
                _ss._erid = (_ss._erid === v) ? null : v;
                qsa(el('fmx-erid'), '.fmx-eridb').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-erid') === _ss._erid); });
                _haptic('light');
            });
        });
        var hi = el('fmx-hideIns');
        if (hi) hi.addEventListener('click', function () {
            _ss._hideInsights = !_ss._hideInsights; _haptic('light');
            var sw = hi.querySelector('.fmx-hsw'); if (sw) sw.classList.toggle('on', !_ss._hideInsights);
            var sub = hi.querySelector('.fmx-htl i'); if (sub) sub.textContent = _ss._hideInsights ? 'Скрыто · видно только тебе' : 'Считает площадка по метрикам канала';
        });
    }

    function paneText() {
        return '<span class="fmx-lbl">О канале (видно при «Развернуть»)</span><textarea class="fmx-inp" id="fmx-desc" maxlength="200" placeholder="Чем хорош канал и какая аудитория…">' + _esc(_ss._desc || '') + '</textarea>' +
            '<span class="fmx-lbl fmx-mt2">Теги (через запятую)</span><input class="fmx-inp" id="fmx-tags" value="' + _esc(_ss._tags || '') + '" maxlength="60" placeholder="ниша, тема, аудитория">';
    }
    function bindText() {
        el('fmx-desc').addEventListener('input', function () { _ss._desc = this.value; _heroDebounced(); });
        el('fmx-tags').addEventListener('input', function () { _ss._tags = this.value; _heroDebounced(); });
    }

    function glassKindStyles(g, accent) {
        if (g === 'frost') return { s: 'background:rgba(255,255,255,0.10);border:0.5px solid rgba(255,255,255,0.25);backdrop-filter:blur(10px);color:#fff;', p: 'background:linear-gradient(135deg,' + accent + 'e6,' + accent + '99);border:0.5px solid ' + accent + 'aa;backdrop-filter:blur(10px);color:#fff;' };
        if (g === 'dark') return { s: 'background:rgba(8,10,20,0.55);border:0.5px solid rgba(255,255,255,0.14);backdrop-filter:blur(10px);color:#e8e8ed;', p: 'background:linear-gradient(135deg,rgba(8,10,20,0.75),' + accent + '77);border:0.5px solid ' + accent + '66;backdrop-filter:blur(10px);color:#fff;' };
        return { s: '', p: 'background:' + accent + ';color:#fff;' };
    }
    var _crop = null;
    function pickMedia(target) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = target === 'avatar' ? 'image/*' : 'image/*,video/mp4,video/quicktime';
        inp.addEventListener('change', function () {
            var fl = inp.files && inp.files[0]; if (!fl) return;
            var t = (fl.type || '').toLowerCase();
            var isImg = t.indexOf('image/') === 0;
            var isVid = t === 'video/mp4' || t === 'video/quicktime';
            if (target === 'avatar' && !isImg) { uiAlert('Для аватара подойдёт только фото или GIF.'); return; }
            if (!isImg && !isVid) { uiAlert('Можно загрузить только фото (JPG, PNG, WebP, GIF) или видео (MP4, MOV). Этот файл не подходит.'); return; }
            if (fl.size > MEDIA_MAX_BYTES) { uiAlert('Файл больше 64 МБ — сожми его или выбери другой.'); return; }
            var kind = isVid ? 'video' : (t === 'image/gif' ? 'gif' : 'img');
            var url = URL.createObjectURL(fl);
            if (kind === 'video') {
                var v = document.createElement('video');
                v.preload = 'metadata';
                v.onloadedmetadata = function () {
                    if (v.duration > 30.5) { uiAlert('Видео длиннее 30 секунд — сократи ролик до 30 сек.'); URL.revokeObjectURL(url); return; }
                    startCrop(target, url, kind, fl.name, 50, 50, 1, fl);
                };
                v.onerror = function () { uiAlert('Не удалось прочитать видео.'); URL.revokeObjectURL(url); };
                v.src = url;
            } else startCrop(target, url, kind, fl.name, 50, 50, 1, fl);
        });
        inp.click();
    }
    function editMedia(target) {
        var m = _ss._media && _ss._media[target];
        if (!m) { pickMedia(target); return; }
        var a = (_ss.att && typeof _ss.att[target] === 'object') ? _ss.att[target] : {};
        startCrop(target, m.url, m.kind, m.name, a.x != null ? a.x : 50, a.y != null ? a.y : 50, a.s || 1, m.file || null);
    }
    function delMedia(target) {
        if (_ss._media && _ss._media[target]) { try { URL.revokeObjectURL(_ss._media[target].url); } catch (e) {} delete _ss._media[target]; }
        _ss.att[target] = '';
        if (target === 'cover') _ss.covType = 'grad';
        if (target === 'avatar') _ss.avatar = 'tg';
        if (target === 'cardbg') _ss.fullBg = false;
        paintCreate();
    }
    function startCrop(target, url, kind, name, x, y, s, file) {
        _crop = { target: target, url: url, kind: kind, name: name, x: x, y: y, s: s, drag: null, file: file || null };
        var box = el('fmx-cropBox');
        box.style.aspectRatio = target === 'avatar' ? '1 / 1' : (target === 'cardbg' ? '4 / 5' : '2 / 1');
        box.innerHTML = (kind === 'video' ? '<video src="' + url + '" autoplay muted loop playsinline></video>' : '<img src="' + url + '">') +
            (target === 'cover' ? '<div class="fmx-safeT"></div><div class="fmx-safeB"></div><div class="fmx-safeF"><span>Зона шапки — видна на 100%</span></div>' : '') +
            (target === 'cardbg' ? '<div class="fmx-safeT"></div><div class="fmx-safeB"></div><div class="fmx-safeF"><span>Зона оффера — видна на 100%</span></div>' : '') +
            (target === 'avatar' ? '<div class="fmx-safeR"></div>' : '');
        el('fmx-cropHint').textContent = target === 'avatar' ? 'Пунктирный контур — видимая зона аватара, углы срежутся скруглением.' : (target === 'cardbg' ? 'Пунктирная полоса — видимая часть тела оффера. Цифры затемняются подложкой автоматически.' : 'Пунктирная полоса — то, что видно в шапке оффера. Затемнённое сверху и снизу в шапку не попадает.');
        el('fmx-cropZoom').value = s;
        cropApply();
        showModal('fmx-cropBg');
    }
    function cropApply() {
        var box = el('fmx-cropBox'); if (!box || !_crop) return;
        var m = box.firstChild; if (!m) return;
        m.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:' + _crop.x + '% ' + _crop.y + '%;transform:scale(' + _crop.s + ');transform-origin:' + _crop.x + '% ' + _crop.y + '%;pointer-events:none;display:block;';
        if (_crop.target === 'cover' || _crop.target === 'cardbg') {
            var band = _crop.target === 'cover' ? 48.2 : 52, top = (100 - band) * (_crop.y / 100);
            var st = box.querySelector('.fmx-safeT'), sb = box.querySelector('.fmx-safeB'), sf = box.querySelector('.fmx-safeF');
            if (st) st.style.height = top + '%';
            if (sf) { sf.style.top = top + '%'; sf.style.height = band + '%'; }
            if (sb) { sb.style.top = (top + band) + '%'; sb.style.height = (100 - top - band) + '%'; }
        }
    }
    function finishCrop() {
        if (!_crop) return;
        if (!_ss._media) _ss._media = {};
        var _old = _ss._media[_crop.target];
        if (_old && _old.url && _old.url !== _crop.url && String(_old.url).indexOf('blob:') === 0) {
            try { URL.revokeObjectURL(_old.url); } catch (e) {}
        }
        _ss._media[_crop.target] = { url: _crop.url, kind: _crop.kind, name: _crop.name, file: _crop.file || (_ss._media[_crop.target] ? _ss._media[_crop.target].file : null) };
        _ss.att[_crop.target] = { kind: _crop.kind, name: _crop.name, x: Math.round(_crop.x * 10) / 10, y: Math.round(_crop.y * 10) / 10, s: Math.round(_crop.s * 100) / 100 };
        if (_crop.target === 'cover') _ss.covType = _crop.kind === 'video' ? 'video' : (_crop.kind === 'gif' ? 'gif' : 'img');
        if (_crop.target === 'avatar') _ss.avatar = 'img';
        _crop = null;
        hideModal('fmx-cropBg');
        paintCreate();
    }
    function _cancelCrop() {
        if (_crop && _crop.url && String(_crop.url).indexOf('blob:') === 0) {
            var m = _ss._media && _ss._media[_crop.target];
            if (!m || m.url !== _crop.url) { try { URL.revokeObjectURL(_crop.url); } catch (e) {} }
        }
        _crop = null;
        hideModal('fmx-cropBg');
    }
    function fontStyle(f) { var m = { normal: 'font-weight:600;', bold: 'font-weight:800;', wide: 'font-weight:700;letter-spacing:0.5px;', mono: 'font-family:monospace;font-weight:600;' }; return m[f] || m.normal; }
    function listingAvatar(l, accent) {
        var fx = l.effects_json || {}, at = l.emoji_attachments_json || {}, top = _isTop(l);
        var gl = fxAllow('glow', fx.glow);
        if (!l._preview) {
            var _fx = l.fx || null, _boost = _isBoost(l);
            var _canGlow = _fx ? !!_fx.glow : (top || _boost);
            if (!_canGlow && FX_VIP.glow.indexOf(gl) >= 0) gl = 'none';
        }
        var halo = gl !== 'none' ? '<i class="fmx-avhalo fx-g-' + gl + '" style="--fxa:' + accent + ';"></i>' : '';
        var t = l.title || l.username || '?', core;
        if (l.avatar_url) core = '<div class="fmx-av" style="background:' + accent + ';overflow:hidden;"><img loading="lazy" decoding="async" src="' + _esc(mediaAbs(l.avatar_url)) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + (l.avatar_type === 'img' ? _posStyle(at.avatar) : 'object-position:center;') + '"></div>';
        else core = '<div class="fmx-av" style="background:' + accent + ';">' + _esc(t.charAt(0)) + '</div>';
        return '<div class="fmx-avw">' + halo + core + '</div>';
    }
    function avatarInner(accent, goto) {
        var c = curChannel();
        var core;
        var av = _ss._media && _ss._media.avatar, ap = (_ss.att && typeof _ss.att.avatar === 'object') ? _ss.att.avatar : null;
        if (_ss.avatar === 'img' && av && ap) core = '<div class="fmx-av" style="background:' + accent + ';overflow:hidden;"><img src="' + av.url + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:' + ap.x + '% ' + ap.y + '%;transform:scale(' + ap.s + ');transform-origin:' + ap.x + '% ' + ap.y + '%;"></div>';
        else if (c.avatar_url) core = '<div class="fmx-av" style="background:' + accent + ';overflow:hidden;"><img src="' + mediaAbs(c.avatar_url) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"></div>';
        else core = '<div class="fmx-av" style="background:' + accent + ';">' + _esc((c.title || c.username || '?').charAt(0)) + '</div>';
        var halo = _ss.glow !== 'none' ? '<i class="fmx-avhalo fx-g-' + _ss.glow + '" style="--fxa:' + accent + ';"></i>' : '';
        return '<div class="fmx-avw"' + (goto ? ' data-goto="fx" style="cursor:pointer;"' : '') + '>' + halo + core + '</div>';
    }
    var SEAM = 84;
    function stkSize(s, W) { return Math.max(32, Math.min(64 * (s.scale || 1), Math.min(220, W * 0.62))); }
    function stkPos(s, W) {
        var size = stkSize(s, W);
        var odx = _touchDev ? STK_PHONE_DX : 0, ody = _touchDev ? STK_PHONE_DY : 0;
        if ((s.mode || 'slot') === 'slot') return { size: size, left: W - size - 12 + odx, top: SEAM - size * 0.55 + ody };
        var cx = Math.max(10, Math.min((s.x != null ? s.x : 0.82) * W, W - 10));
        var cy = Math.max(10, SEAM + (s.dy != null ? s.dy : 0));
        return { size: size, left: cx - size / 2 + odx, top: cy - size / 2 + ody };
    }
    function stkMedia(s, animate) {
        if (s.kind === 'webm') return '<video src="' + _esc(mediaAbs(s.url)) + '" muted playsinline loop autoplay preload="auto"' + (animate ? '' : ' onloadeddata="this.pause()"') + ' style="width:100%;height:100%;object-fit:contain;pointer-events:none;"></video>';
        if (s.kind === 'tgs') return '<span class="fmx-stk-lot" data-tgs="' + _esc(s.url) + '" data-anim="' + (animate ? 1 : 0) + '"><i class="ti ti-sticker"></i></span>';
        return '<img src="' + _esc(mediaAbs(s.url)) + '" alt="" style="width:100%;height:100%;object-fit:contain;pointer-events:none;">';
    }
    function stkOverlay(s, W, animate, draggable) {
        if (!s || !s.url) return '';
        var p = stkPos(s, W);
        var dm = s.dmode || 'bg';
        if (dm === 'top') dm = 'blend';
        var mcls = dm === 'blend' ? ' m-blend' : '';
        var boxSt;
        if (draggable) {
            boxSt = 'left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (Number(s.rot) || 0) + 'deg);';
        } else if ((s.mode || 'slot') === 'slot') {
            boxSt = 'right:' + (12 - (_touchDev ? STK_PHONE_DX : 0)) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (Number(s.rot) || 0) + 'deg);';
        } else {
            boxSt = 'left:' + p.left.toFixed(1) + 'px;top:' + p.top.toFixed(1) + 'px;width:' + p.size + 'px;height:' + p.size + 'px;transform:rotate(' + (Number(s.rot) || 0) + 'deg);';
        }
        var core = '<div class="fmx-stk' + mcls + '" ' + (draggable ? 'id="fmx-stkPrev" ' : '') + 'style="' + boxSt + '">' + stkMedia(s, animate) + '</div>';
        if (!draggable || (s.mode || 'slot') !== 'free') return core;
        var selCls = (_ss && _ss.stickerSel !== false) ? ' sel' : '';
        var modeDots = '<div class="fmx-stkmodes">' + [['blend', 'Слияние'], ['bg', 'Задний фон']].map(function (m) {
            return '<button class="fmx-stkmd' + (dm === m[0] ? ' on' : '') + '" data-stkmd="' + m[0] + '" data-stkmdn="' + m[1] + '" title="' + m[1] + '"><i></i></button>';
        }).join('') + '</div>';
        return core + '<div class="fmx-stkGrab' + selCls + '" id="fmx-stkGrab" style="' + boxSt + '" title="Перемещение, размер, поворот"><i class="fmx-stkh rot" title="Крутить"></i><i class="fmx-stkh rsz" title="Размер"></i><i class="ti ti-x fmx-stkh del" title="Убрать с оффера"></i>' + modeDots + '</div>';
    }
    var _lotLibs = null;
    function _script(u) {
        return new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = u; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }
    function loadLottie() {
        if (_lotLibs) return _lotLibs;
        _lotLibs = Promise.all([
            (typeof pako !== 'undefined') ? Promise.resolve() : _script('https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'),
            (typeof lottie !== 'undefined') ? Promise.resolve() : _script('https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js')
        ]);
        return _lotLibs;
    }
    var _tgsData = {};
    var _touchDev = (function () { try { return matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } })();
    var STK_PHONE_DX = -0.5, STK_PHONE_DY = -2.5;
    var _lotAnims = [];
    function hydrateTgs(root) {
        _lotAnims = _lotAnims.filter(function (a) {
            if (a.el && a.el.isConnected) return true;
            try { a.anim.destroy(); } catch (e) {}
            return false;
        });
        var nodes = qsa(root || document, '.fmx-stk-lot[data-tgs]:not([data-done])');
        if (!nodes.length) return;
        loadLottie().then(function () {
            nodes.forEach(function (n) {
                if (n.getAttribute('data-done')) return;
                n.setAttribute('data-done', '1');
                var url = n.getAttribute('data-tgs'), anim = n.getAttribute('data-anim') === '1';
                var play = function (data) {
                    n.innerHTML = '';
                    try {
                        var a = lottie.loadAnimation({ container: n, renderer: 'svg', loop: true, autoplay: anim, animationData: data });
                        if (!anim) a.goToAndStop(0, true);
                        _lotAnims.push({ el: n, anim: a });
                        try { _mediaApply(n); } catch (e) { }
                    } catch (e) {}
                };
                if (_tgsData[url]) { play(_tgsData[url]); return; }
                fetch(mediaAbs(url)).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
                    var json = JSON.parse(pako.inflate(new Uint8Array(buf), { to: 'string' }));
                    _tgsData[url] = json; play(json);
                }).catch(function () { n.removeAttribute('data-done'); });
            });
        }).catch(function () {});
    }
    function loadPendingDeals() {
        var box = el('fmx-dealsPend'); if (!box) return;
        apiGet('/api/v1/marketplace/deals/mine').then(function (r) {
            if (!r || !r.ok || !r.deals || !r.deals.length) { box.innerHTML = ''; return; }
            var pend = r.deals.filter(function (d) { return d.status === 'pending'; });
            var conf = r.deals.filter(function (d) { return d.status === 'confirmed'; });
            var who = function (d) { return d.buyer_username ? '@' + _esc(d.buyer_username) : 'Рекламодатель'; };
            var html = '<div class="fmx-pend">';
            if (pend.length) {
                html += '<div class="fmx-pend-t"><i class="ti ti-heart-handshake" style="color:#f59e0b;"></i> Подтверждение сделок</div>' +
                    pend.map(function (d) {
                        return '<div class="fmx-pend-r" data-did="' + d.deal_id + '"><span>' + who(d) + ' · ' + _ago(d.created_at) + '</span>' +
                            '<span style="display:flex;gap:6px;"><button class="fmx-btn" data-dacc="' + d.deal_id + '" style="padding:6px 11px;color:#5DCAA5;border-color:rgba(93,202,165,0.35);"><i class="ti ti-check"></i>Да</button>' +
                            '<button class="fmx-btn" data-ddec="' + d.deal_id + '" style="padding:6px 11px;"><i class="ti ti-x"></i>Нет</button></span></div>';
                    }).join('') +
                    '<div style="font-size:10px;color:#565b73;margin:6px 0;">Подтверждай только реальные сделки: счётчик — твоя репутация.</div>';
            }
            if (conf.length) {
                html += '<div class="fmx-pend-t" style="margin-top:' + (pend.length ? '12px' : '0') + ';"><i class="ti ti-chart-line" style="color:#5ab0e6;"></i> Размещение и охват</div>' +
                    conf.map(function (d) {
                        if (!d.proof_status) {
                            return '<div class="fmx-plc"><div style="font-size:11.5px;color:#c9cbe0;">' + who(d) + ' ' + (window.t ? window.t('— отметь вышедший рекламный пост') : '— отметь вышедший рекламный пост') + '</div>' +
                                '<div style="display:flex;gap:6px;margin-top:6px;"><input class="fmx-inp fmx-plc-in" placeholder="https://t.me/канал/123"><button class="fmx-btn fmx-plc-go" data-pdid="' + d.deal_id + '" style="padding:6px 11px;color:#5ab0e6;border-color:rgba(90,176,230,0.4);flex:0 0 auto;"><i class="ti ti-send"></i></button></div></div>';
                        }
                        var _lt = window.t || function (s) { return s; };
                        var rr = '';
                        if (d.reach_12h != null) rr += ' ' + _lt('· 12ч:') + ' ' + _num(d.reach_12h);
                        if (d.reach_24h != null) rr += ' ' + _lt('· 24ч:') + ' ' + _num(d.reach_24h);
                        if (d.reach_48h != null) rr += ' ' + _lt('· 48ч:') + ' ' + _num(d.reach_48h);
                        if (d.proof_status === 'measured' && d.report_token) {
                            var ru = 'https://fmtr.click/p/' + d.report_token;
                            return '<div class="fmx-plc"><div style="font-size:11.5px;color:#8990a8;"><i class="ti ti-file-check" style="color:#5DCAA5;"></i> ' + who(d) + ' <span>' + _lt('— замеры завершены') + '</span>' + rr +
                                (d.post_deleted ? ' <span style="color:#f87171;">' + _lt('· пост был удалён') + '</span>' : '') + '</div>' +
                                '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;"><button class="fmx-btn" data-repopen="' + _esc(ru) + '" style="padding:6px 11px;color:#818cf8;border-color:rgba(129,140,248,0.4);"><i class="ti ti-report-analytics"></i> <span>' + _lt('Отчёт') + '</span></button>' +
                                '<button class="fmx-btn" data-repcopy="' + _esc(ru) + '" style="padding:6px 11px;"><i class="ti ti-copy"></i> <span>' + _lt('Ссылка для рекламодателя') + '</span></button></div></div>';
                        }
                        return '<div class="fmx-plc"><div style="font-size:11.5px;color:#8990a8;"><i class="ti ti-circle-check" style="color:#5DCAA5;"></i> ' + who(d) + ' ' + _lt('— замеряем охват') + rr + '</div></div>';
                    }).join('') +
                    '<div style="font-size:10px;color:#565b73;margin-top:6px;">Пришли ссылку на пост — платформа сама замерит охват через 12, 24 и 48 часов и подготовит отчёт обеим сторонам.</div>';
            }
            html += '</div>';
            box.innerHTML = html;
            function respond(id, acc) {
                apiPost('/api/v1/marketplace/deals/' + id + '/respond', { accept: acc }).then(function (r2) {
                    if (r2 && r2.ok === false) { uiAlert(r2.error || 'Не удалось'); return; }
                    _haptic('success');
                    toast(acc ? 'Сделка подтверждена — счётчик вырос' : 'Отклонено');
                    if (acc) { _feed = null; _feedState = 'idle'; }
                    loadPendingDeals();
                }).catch(function () { uiAlert('Не удалось. Повтори попытку.'); });
            }
            qsa(box, '[data-dacc]').forEach(function (b) { b.addEventListener('click', function () { respond(+b.getAttribute('data-dacc'), true); }); });
            qsa(box, '[data-ddec]').forEach(function (b) { b.addEventListener('click', function () { respond(+b.getAttribute('data-ddec'), false); }); });
            qsa(box, '.fmx-plc-go').forEach(function (b) {
                b.addEventListener('click', function () {
                    var wrap = b.parentNode, inp = wrap ? wrap.querySelector('.fmx-plc-in') : null, url = inp ? inp.value.trim() : '';
                    if (!url) { uiAlert('Вставь ссылку на вышедший пост.'); return; }
                    b.disabled = true;
                    apiPost('/api/v1/marketplace/deals/' + b.getAttribute('data-pdid') + '/placement', { post_url: url }).then(function (r2) {
                        if (r2 && r2.ok === false) { b.disabled = false; _haptic('error'); uiAlert(r2.error || 'Не удалось'); return; }
                        _haptic('success');
                        toast('Размещение отмечено — замерим охват и подготовим отчёт обеим сторонам');
                        loadPendingDeals();
                    }).catch(function () { b.disabled = false; uiAlert('Не удалось. Повтори попытку.'); });
                });
            });
            qsa(box, '[data-repopen]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var u = b.getAttribute('data-repopen');
                    _haptic('light');
                    try { if (typeof tg !== 'undefined' && tg && tg.openLink) tg.openLink(u); else window.open(u, '_blank'); } catch (e) { window.open(u, '_blank'); }
                });
            });
            qsa(box, '[data-repcopy]').forEach(function (b) {
                b.addEventListener('click', function () {
                    _haptic('light');
                    try { navigator.clipboard.writeText(b.getAttribute('data-repcopy')); toast('Ссылка скопирована'); } catch (e) { uiAlert(b.getAttribute('data-repcopy')); }
                });
            });
        }).catch(function () {});
    }
    function loadStickerPane() {
        var box = el('fmx-stkBody'); if (!box) return;
        if (_stickers) { renderStickerPane(); return; }
        apiGet('/api/v1/marketplace/stickers').then(function (r) {
            _stickers = (r && r.stickers) ? r.stickers : [];
            renderStickerPane();
        }).catch(function () { _stickers = []; renderStickerPane(); });
    }
    function renderStickerPane() {
        var box = el('fmx-stkBody'); if (!box) return;
        var s = _ss.sticker;
        var html = '';
        if (!_stickers.length) {
            html = '<div style="font-size:11.5px;color:#8990a8;line-height:1.6;">Коллекция пуста. Отправь боту в личных сообщениях любой стикер или премиум-эмодзи — он появится здесь.</div>' +
                '<button class="fmx-btn" id="fmx-stk-bot" style="margin-top:10px;"><i class="ti ti-brand-telegram"></i>Открыть бота</button>';
        } else {
            html = '<div class="fmx-stkgrid">' + _stickers.map(function (st) {
                var sel = s && s.sticker_id === st.id;
                return '<div class="fmx-stkcell' + (sel ? ' on' : '') + '" data-sid="' + st.id + '">' + stkMedia(st, true) +
                    (st.kind === 'tgs' ? '<span class="fmx-stk-anim">аним.</span>' : '') +
                    '<button class="fmx-stkdel" data-sdel="' + st.id + '" title="Удалить из коллекции">&times;</button></div>';
            }).join('') + '</div>' +
                '<div style="font-size:10px;color:#565b73;margin-top:8px;">Пополнение — отправкой стикера боту в личных сообщениях.<span> ' + _stickers.length + '/30</span></div>';
            if (s) {
                var free = (s.mode || 'slot') === 'free';
                html += '<div class="fmx-fxw" style="margin-top:12px;">' +
                    '<button class="fmx-fx' + (!free ? ' on' : '') + '" data-smode="slot">В слоте</button>' +
                    '<button class="fmx-fx' + (free ? ' on' : '') + '" data-smode="free">Свободно</button>' +
                    '<button class="fmx-fx" data-sclear="1" style="margin-left:auto;color:#ef4444;">Убрать</button></div>';
                if (free) {
                    html += '<div style="font-size:10px;color:#565b73;margin-top:8px;line-height:1.6;"><i class="ti ti-hand-move"></i> Всё управление — на оффере-превью: касание стикера — рамка; верхняя точка — поворот, угол — размер, крестик — удалить, три точки под рамкой — режим (слияние · задний фон).</div>';
                }
                if (s.kind !== 'webp') html += '<div style="font-size:10px;color:#f59e0b;margin-top:8px;"><i class="ti ti-lock"></i> Анимация в публичной ленте — при продвижении. Без него покажем стоп-кадр.</div>';
            }
        }
        box.innerHTML = html;
        var bo = el('fmx-stk-bot'); if (bo) onTap(bo, function () { openTg('ForgeMetricsBot'); });
        qsa(box, '[data-sid]').forEach(function (cell) {
            onTap(cell, function (e) {
                if (e.target.getAttribute && e.target.getAttribute('data-sdel')) return;
                if (e.target.closest && e.target.closest('[data-sdel]')) return;
                var st = _stickers.filter(function (x) { return x.id === +cell.getAttribute('data-sid'); })[0];
                if (!st) return;
                var prev = _ss.sticker || { mode: 'slot', x: 0.82, anchor: 'seam', dy: 0, scale: 1, rot: 0, dmode: 'bg' };
                _ss.sticker = { sticker_id: st.id, url: st.url, kind: st.kind, mode: prev.mode, x: prev.x, anchor: 'seam', dy: prev.dy, scale: prev.scale, rot: prev.rot, dmode: prev.dmode || 'bg' };
                _ss.stickerSel = true;
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        qsa(box, '[data-sdel]').forEach(function (b) {
            onTap(b, function (e) {
                e.stopPropagation();
                var id = +b.getAttribute('data-sdel');
                uiConfirm('Удалить стикер из коллекции?', function () {
                    apiRequest('/api/v1/marketplace/stickers/' + id, { method: 'DELETE' }).then(function () {
                        _stickers = _stickers.filter(function (x) { return x.id !== id; });
                        if (_ss.sticker && _ss.sticker.sticker_id === id) { _ss.sticker = null; renderHero(); }
                        renderStickerPane();
                    }).catch(function () { uiAlert('Не удалось удалить. Повтори попытку.'); });
                });
            });
        });
        qsa(box, '[data-smode]').forEach(function (b) {
            onTap(b, function () {
                _ss.sticker.mode = b.getAttribute('data-smode');
                _haptic('light'); renderStickerPane(); renderHero();
            });
        });
        var cl = qsa(box, '[data-sclear]')[0];
        if (cl) onTap(cl, function () { _ss.sticker = null; _haptic('light'); renderStickerPane(); renderHero(); });
        var av = el('fmx-accv-sticker'); if (av) av.textContent = s ? ((s.mode || 'slot') === 'slot' ? 'В слоте' : 'Свободно') : 'Нет';
        hydrateTgs(box);
    }
    function bindBadgeDrag(cardEl) {
        return;
        var vip = !!_ss.glowCard || (function () { var b = listingForChannel(_ss.channelId); return b ? _isTop(b) : false; })();
        qsa(cardEl, '[data-bkey]').forEach(function (bd) {
            bd.style.cursor = vip ? 'grab' : 'pointer';
            function dims() { var r = cardEl.getBoundingClientRect(); return { rect: r, k: r.width ? r.width / 350 : 1 }; }
            function _zr(e, d) { var r = e.getBoundingClientRect(); return { x1: (r.left - d.rect.left) / d.k, y1: (r.top - d.rect.top) / d.k, x2: (r.right - d.rect.left) / d.k, y2: (r.bottom - d.rect.top) / d.k }; }
            function zones() {
                var d = dims(), ban = [];
                ['.fmx-avw', '.fmx-nm', '.fmx-meta'].forEach(function (sel) {
                    var e = cardEl.querySelector(sel); if (e) ban.push(_zr(e, d));
                });
                var met = cardEl.querySelector('.fmx-kmg');
                if (met) { var mr = _zr(met, d); ban.push({ x1: 0, y1: mr.y1 - 5, x2: 350, y2: (cardEl.offsetHeight || 500) + 10 }); }
                var row = cardEl.querySelector('.fmx-cb .fmx-badges');
                var home;
                if (row) { home = _zr(row, d); home.y1 -= 4; home.y2 += 4; home.x1 = 8; home.x2 = 342; }
                else {
                    var crow = cardEl.querySelector('.fmx-crow');
                    var cy = crow ? _zr(crow, d).y2 + 2 : 150;
                    home = { x1: 8, y1: cy, x2: 342, y2: cy + 27 };
                }
                return { ban: ban, home: home };
            }
            var ghost = null, dragging = false, sx = 0, sy = 0, zs = null, homeEl = null;
            function begin(cx, cy) {
                dragging = true; bd.style.opacity = '0.25'; zs = zones();
                cardEl.insertAdjacentHTML('beforeend', '<div class="fmx-bslot" style="left:' + zs.home.x1 + 'px;top:' + zs.home.y1 + 'px;width:' + (zs.home.x2 - zs.home.x1) + 'px;height:' + (zs.home.y2 - zs.home.y1) + 'px;"><i>вернуть в ряд</i></div>');
                homeEl = cardEl.querySelector('.fmx-bslot');
                ghost = bd.cloneNode(true);
                ghost.style.cssText = 'position:absolute;z-index:99;pointer-events:none;margin:0;opacity:0.95;';
                cardEl.appendChild(ghost);
                follow(cx, cy);
            }
            function follow(cx, cy) {
                var d = dims();
                var lx = (cx - d.rect.left) / d.k, ly = (cy - d.rect.top) / d.k;
                var w = ghost.offsetWidth, h = ghost.offsetHeight;
                var x = Math.max(4, Math.min(lx - w / 2, 346 - w));
                var y = Math.max(4, Math.min(ly - h / 2, (cardEl.offsetHeight || 400) - h - 4));
                ghost.style.left = x + 'px'; ghost.style.top = y + 'px';
                var inHome = lx >= zs.home.x1 && lx <= zs.home.x2 && ly >= zs.home.y1 - 6 && ly <= zs.home.y2 + 6;
                var bad = !inHome && zs.ban.some(function (z) { return lx >= z.x1 - 4 && lx <= z.x2 + 4 && ly >= z.y1 - 4 && ly <= z.y2 + 4; });
                ghost.style.filter = bad ? 'grayscale(1) brightness(0.7)' : '';
                if (homeEl) homeEl.classList.toggle('hot', inHome);
                return { x: x, y: y, bad: bad, home: inHome };
            }
            function finish(cx, cy) {
                var p = follow(cx, cy);
                ghost.remove(); ghost = null;
                if (homeEl) { homeEl.remove(); homeEl = null; }
                bd.style.opacity = '';
                dragging = false;
                var key = bd.getAttribute('data-bkey');
                if (p.home) {
                    if (_ss.badgeFree) { delete _ss.badgeFree[key]; if (!Object.keys(_ss.badgeFree).length) _ss.badgeFree = null; }
                    _haptic('light'); renderHero(); return;
                }
                if (p.bad) { toast('Сюда нельзя: имя, аватар и низ оффера — запретная зона'); return; }
                if (!_ss.badgeFree) _ss.badgeFree = {};
                _ss.badgeFree[key] = { x: p.x, y: p.y };
                _haptic('light');
                renderHero();
            }
            function onDown(e) {
                var t = e.touches ? e.touches[0] : e;
                sx = t.clientX; sy = t.clientY; dragging = false;
                var mm = function (ev) {
                    var p = ev.touches ? ev.touches[0] : ev;
                    if (!vip) return;
                    if (!dragging && Math.abs(p.clientX - sx) + Math.abs(p.clientY - sy) > 7) begin(p.clientX, p.clientY);
                    if (dragging) { ev.preventDefault(); follow(p.clientX, p.clientY); }
                };
                var up = function (ev) {
                    document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                    document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                    if (dragging) { var p = (ev.changedTouches && ev.changedTouches[0]) || ev; finish(p.clientX, p.clientY); }
                    else if (!vip) { toast('Свободное перемещение блоков — опция продвижения на 30 дней'); }
                };
                document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
                document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
            }
            bd.addEventListener('mousedown', onDown);
            bd.addEventListener('touchstart', onDown, { passive: true });
        });
    }
    function bindStickerDrag(cardEl) {
        var grab = el('fmx-stkGrab'), vis = el('fmx-stkPrev');
        if (!grab || !vis || !cardEl) return;
        function dims() { var r = cardEl.getBoundingClientRect(); var k = r.width ? r.width / 350 : 1; return { W: 350, H: Math.max(cardEl.offsetHeight || 0, SEAM + 40), rect: r, k: k }; }
        function applyBox() {
            var d = dims(), p = stkPos(_ss.sticker, d.W);
            [vis, grab].forEach(function (e) {
                e.style.left = p.left + 'px'; e.style.top = p.top + 'px';
                e.style.width = p.size + 'px'; e.style.height = p.size + 'px';
                e.style.transform = 'rotate(' + (_ss.sticker.rot || 0) + 'deg)';
            });
        }
        function setScale(want) { _ss.sticker.scale = Math.max(0.5, Math.min(3.4, want)); applyBox(); }
        function setRot(deg) {
            var r = Math.round(deg) % 360;
            if (r > 180) r -= 360; if (r < -180) r += 360;
            _ss.sticker.rot = r; applyBox();
        }
        function center() { var d = dims(); return { cx: (_ss.sticker.x || 0.82) * d.W, cy: SEAM + (_ss.sticker.dy || 0) }; }
        function move(clientX, clientY) {
            var d = dims();
            var cx = Math.max(10, Math.min((clientX - d.rect.left) / d.k, d.W - 10));
            var cy = Math.max(10, Math.min((clientY - d.rect.top) / d.k, d.H - 10));
            _ss.sticker.x = cx / d.W; _ss.sticker.dy = Math.round(cy - SEAM); _ss.sticker.anchor = 'seam';
            applyBox();
        }
        function start(e) {
            if (e.target && e.target.classList && e.target.classList.contains('fmx-stkh')) return;
            e.preventDefault();
            if (e.touches && e.touches.length === 2) {
                var t0 = e.touches;
                var d0 = Math.hypot(t0[0].clientX - t0[1].clientX, t0[0].clientY - t0[1].clientY);
                var a0 = Math.atan2(t0[1].clientY - t0[0].clientY, t0[1].clientX - t0[0].clientX) * 180 / Math.PI;
                var s0 = _ss.sticker.scale || 1, r0 = _ss.sticker.rot || 0;
                if (d0 < 8) return;
                var pm = function (ev) {
                    if (ev.touches.length < 2) return;
                    ev.preventDefault();
                    var t = ev.touches;
                    var d = Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
                    var a = Math.atan2(t[1].clientY - t[0].clientY, t[1].clientX - t[0].clientX) * 180 / Math.PI;
                    setScale(s0 * d / d0); setRot(r0 + (a - a0));
                };
                var pu = function () {
                    document.removeEventListener('touchmove', pm); document.removeEventListener('touchend', pu);
                    _haptic('light');
                };
                document.addEventListener('touchmove', pm, { passive: false });
                document.addEventListener('touchend', pu);
                return;
            }
            var t0p = e.touches ? e.touches[0] : e;
            var sx = t0p.clientX, sy = t0p.clientY, movedPx = false;
            var mm = function (ev) {
                var t = ev.touches ? ev.touches[0] : ev;
                if (!movedPx && Math.hypot(t.clientX - sx, t.clientY - sy) > 6) movedPx = true;
                if (movedPx) move(t.clientX, t.clientY);
            };
            var up = function () {
                document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', up);
                document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', up);
                if (!movedPx) {
                    var selNow = _ss.stickerSel !== false;
                    _ss.stickerSel = !selNow;
                    grab.classList.toggle('sel', !selNow);
                }
                _haptic('light');
            };
            document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up);
            document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up);
        }
        function bindHandle(sel, onMove) {
            var h = grab.querySelector(sel); if (!h) return;
            function hs(e) {
                e.preventDefault(); e.stopPropagation();
                var mm = function (ev) {
                    var t = ev.touches ? ev.touches[0] : ev;
                    var d = dims(), c = center();
                    onMove((t.clientX - d.rect.left) / d.k - c.cx, (t.clientY - d.rect.top) / d.k - c.cy, d);
                };
                var mu = function () {
                    document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu);
                    document.removeEventListener('touchmove', mm); document.removeEventListener('touchend', mu);
                    _haptic('light');
                };
                document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
                document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', mu);
            }
            h.addEventListener('mousedown', hs);
            h.addEventListener('touchstart', hs, { passive: false });
        }
        bindHandle('.fmx-stkh.rsz', function (dx, dy, d) {
            var dist = Math.hypot(dx, dy);
            var base = 64 * 0.72;
            if (base > 4) setScale(dist / base);
        });
        bindHandle('.fmx-stkh.rot', function (dx, dy) {
            setRot(Math.atan2(dy, dx) * 180 / Math.PI + 90);
        });
        var del = grab.querySelector('.fmx-stkh.del');
        if (del) {
            var ds = function (e) {
                e.preventDefault(); e.stopPropagation();
                _ss.sticker = null; _haptic('light');
                renderStickerPane(); renderHero();
            };
            del.addEventListener('mousedown', ds);
            del.addEventListener('touchstart', ds, { passive: false });
        }
        var _mlT = null;
        function showModeLabel(name) {
            var lbl = cardEl.querySelector('.fmx-stkModeLabel');
            if (!lbl) { cardEl.insertAdjacentHTML('beforeend', '<div class="fmx-stkModeLabel"></div>'); lbl = cardEl.querySelector('.fmx-stkModeLabel'); }
            lbl.textContent = name;
            lbl.classList.add('show');
            clearTimeout(_mlT);
            _mlT = setTimeout(function () { lbl.classList.remove('show'); }, 1200);
        }
        qsa(grab, '[data-stkmd]').forEach(function (b) {
            var hs = function (e) {
                e.preventDefault(); e.stopPropagation();
                var v = b.getAttribute('data-stkmd');
                _ss.sticker.dmode = v;
                qsa(grab, '.fmx-stkmd').forEach(function (x) { x.classList.toggle('on', x === b); });
                vis.className = 'fmx-stk' + (v === 'top' ? ' m-top' : (v === 'blend' ? ' m-blend' : ''));
                showModeLabel(b.getAttribute('data-stkmdn'));
                _haptic('light');
            };
            b.addEventListener('mousedown', hs);
            b.addEventListener('touchstart', hs, { passive: false });
        });
        grab.addEventListener('mousedown', start);
        grab.addEventListener('touchstart', start, { passive: false });
    }

    function _previewListing() {
        var c = curChannel() || {};
        var base = listingForChannel(_ss.channelId);
        var pl = {};
        if (base) for (var k in base) pl[k] = base[k];
        pl.username = c.username || pl.username || 'channel';
        pl.title = ((_ss._title != null ? _ss._title : (c.title || pl.title)) || 'Твой канал');
        if (c.subscribers != null) pl.subscribers = c.subscribers;
        if (c.avg_views != null) pl.avg_views = c.avg_views;
        if (c.er_percent != null) pl.er = c.er_percent;
        if (c.health_class) pl.health_class = c.health_class;
        if (c.niche) pl.niche = c.niche;
        if (c.audience) pl.audience = c.audience;
        pl.accent_color = _ss.color;
        pl._preview = true;
        pl.is_top = !!_ss.glowCard || (base ? _isTop(base) : false); pl.is_vip = false; pl.top_until = null; pl.boost_until = null;
        pl._realTop = base ? _isTop(base) : false;
        var act = (_sfmts || []).filter(function (x) { return x.on; });
        pl.formats = act.map(function (x) { return { format: x.k || x.format || '', label: x.n || x.label || x.k || '', price: x.p }; });
        var cm = _ss._media && _ss._media.cover;
        if (_ss.covType !== 'grad' && cm && cm.url) { pl.cover_type = cm.kind === 'video' ? 'video' : 'img'; pl.cover_url = cm.url; }
        else { pl.cover_type = 'grad'; pl.cover_url = null; }
        pl.cover_gradient = _ss.coverGrad || COVERS[_ss.cover];
        pl.avatar_type = 'tg';
        pl.avatar_url = c.avatar_url || null;
        pl.avatar_emoji = null;
        pl.effects_json = { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, part: _ss.part, atomColor: _ss.atomColor, glowCard: _ss.glowCard, fullBg: _ss.fullBg, glass: _ss.glass, btns: _ss.btns || 'std', topTag: _ss.topTag || 'on', badgeFree: _ss.badgeFree || null };
        var _att = {}; for (var _ak in (_ss.att || {})) _att[_ak] = _ss.att[_ak];
        var _cbg = _ss._media && _ss._media.cardbg;
        if (_cbg && _cbg.url) {
            var _cba = (typeof _att.cardbg === 'object' && _att.cardbg) ? _att.cardbg : { x: 50, y: 50, s: 1 };
            _att.cardbg = { x: _cba.x, y: _cba.y, s: _cba.s, url: _cbg.url, kind: _cbg.kind || 'img' };
        }
        pl.emoji_attachments_json = _att;
        pl.custom_text = _ss._desc || '';
        pl.title_style = _ss.font;
        pl.sticker_json = null;
        if (_ss.showDeals === false) pl.show_deals = false;
        return pl;
    }
    function renderHero() {
        var hero = el('fmx-hero'); if (!hero) return;
        var pl = _previewListing();
        hero.innerHTML = fullCard(pl);
        var card = hero.querySelector('.fmx-card'); if (!card) return;
        scaleCards(hero);
        try {
            requestAnimationFrame(function () { scaleCards(hero); });
            setTimeout(function () { scaleCards(hero); }, 300);
            setTimeout(function () { scaleCards(hero); }, 900);
            qsa(card, 'img').forEach(function (im) {
                if (im && !im.complete) im.addEventListener('load', function () { scaleCards(hero); }, { once: true });
            });
        } catch (e) {}
        if (_ss.sticker) {
            card.insertAdjacentHTML('beforeend', stkOverlay(_ss.sticker, 350, true, true));
            bindStickerDrag(card);
        }
        var st = card.querySelector('.fmx-star');
        if (st) {
            st.removeAttribute('data-bm');
        }
        [['.fmx-avw', 'cover'], ['.fmx-crow', 'text'], ['.fmx-desc', 'text'], ['.fmx-kmg', 'price']].forEach(function (z) {
            qsa(card, z[0]).forEach(function (n) {
                n.style.cursor = 'pointer';
                n.addEventListener('click', function (e) {
                    if (e.target.closest && (e.target.closest('.fmx-stkGrab') || e.target.closest('.fmx-star') || e.target.closest('[data-cedit]'))) return;
                    e.stopPropagation(); _haptic('light'); openAcc(z[1], true);
                });
            });
        });
        function bindCEdit(sel, kind) {
            qsa(card, sel).forEach(function (n) {
                n.setAttribute('data-cedit', kind);
                n.style.cursor = 'pointer';
                n.addEventListener('click', function (e) {
                    e.stopPropagation(); _haptic('light');
                    if (kind === 'cover') openColorStudio(coverSeedColor(), function (hex) { _ss.covType = 'grad'; _ss.coverGrad = gradFromHex(hex); _liveCover(_ss.coverGrad); _heroDebounced(); }, 'Шапка');
                    else openColorStudio(_ss.color, function (hex) { setAccentColor(hex); }, 'Цвет кнопки');
                });
            });
        }
        bindCEdit('.fmx-cov', 'cover');
        bindCEdit('.fmx-btn', 'accent');
        qsa(card, '[data-act]').forEach(function (b) { b.removeAttribute('data-act'); });
        bindBadgeDrag(card);
        var hl = el('fmx-hlist');
        if (hl) {
            hl.innerHTML = '<div style="font-size:10px;font-weight:700;color:#565b73;letter-spacing:0.6px;margin:0 0 7px;">ВИД В СПИСКЕ</div>' + zw(listItem(pl));
            scaleCards(hl);
        }
        hydrateTgs(hero);
    }
    var PS_GLUE_V = '20260729b';
    function _psInjectStyle() {
        if (el('fmx-ps-style')) return;
        var s = document.createElement('style'); s.id = 'fmx-ps-style';
        s.textContent = '.fmx-psFull{position:fixed;inset:0;z-index:100005;background:#05070e;display:flex;flex-direction:column;}' +
            '.fmx-psTop{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:0.5px solid rgba(255,255,255,0.08);flex-shrink:0;}' +
            '.fmx-psTop .t{font-size:15px;font-weight:800;color:#e8e8ed;display:flex;align-items:center;gap:7px;}' +
            '.fmx-psTop .t i{color:#5DCAA5;}' +
            '.fmx-psX{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);border:0.5px solid rgba(255,255,255,0.14);color:#c9cede;font-size:17px;cursor:pointer;flex-shrink:0;padding:0;line-height:1;}' +
            '.fmx-psX:active{background:rgba(255,255,255,0.14);}' +
            '.fmx-psScroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.28) transparent;scrollbar-gutter:stable;}' +
            '.fmx-psScroll::-webkit-scrollbar{width:9px;}' +
            '.fmx-psScroll::-webkit-scrollbar-track{background:transparent;}' +
            '.fmx-psScroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.28);border-radius:6px;border:2px solid transparent;background-clip:padding-box;}' +
            '.fmx-psScroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.42);background-clip:padding-box;}' +
            '.fmx-psBottom{padding:10px 14px calc(10px + env(safe-area-inset-bottom));border-top:0.5px solid rgba(255,255,255,0.08);flex-shrink:0;background:#05070e;}' +
            '#fmx-psFrame{border:0;display:block;background:#05070e;}' +
            '@keyframes fmxSpin{to{transform:rotate(360deg);}}' +
            '#fmx-fmtpick{position:fixed;inset:0;z-index:100020;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.55);}' +
            '.fmx-fmtcard{width:100%;max-width:440px;margin:0 8px calc(8px + env(safe-area-inset-bottom));background:#0d1120;border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:14px;box-shadow:0 -12px 44px rgba(0,0,0,0.55);animation:fmxUp .2s ease-out;}' +
            '.fmx-fmttitle{font-size:15px;font-weight:700;color:#e8e8ed;text-align:center;padding:6px 0 12px;}' +
            '.fmx-fmtrow{display:flex;align-items:center;gap:12px;width:100%;text-align:left;background:#141828;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;font-family:inherit;-webkit-tap-highlight-color:transparent;}' +
            '.fmx-fmtrow:active{background:#1a2030;}' +
            '.fmx-fmtrow .ic{width:38px;height:38px;flex-shrink:0;border-radius:11px;background:rgba(93,202,165,0.15);color:#5DCAA5;display:flex;align-items:center;justify-content:center;font-size:19px;}' +
            '.fmx-fmtrow .tx{display:flex;flex-direction:column;gap:2px;min-width:0;}' +
            '.fmx-fmtrow .tx b{font-size:13.5px;color:#e8e8ed;font-weight:600;}' +
            '.fmx-fmtrow .tx i{font-size:11.5px;color:#8990a8;font-style:normal;line-height:1.35;}' +
            '.fmx-fmtcancel{width:100%;background:transparent;border:0;color:#8990a8;font-size:13px;font-weight:600;padding:10px;cursor:pointer;font-family:inherit;margin-top:2px;-webkit-tap-highlight-color:transparent;}' +
            '.fmx-fmtpro{display:inline-block;margin-left:6px;font-size:9.5px;font-weight:800;letter-spacing:0.5px;color:#f5bf4f;background:rgba(245,191,79,0.16);border:1px solid rgba(245,191,79,0.4);border-radius:6px;padding:1px 5px;vertical-align:middle;}' +
            '.fmx-fmtrow.locked{opacity:0.6;}' +
            '.fmx-ring{display:inline-block;width:20px;height:20px;vertical-align:middle;margin-right:8px;}' +
            '.fmx-ring svg{width:100%;height:100%;display:block;}' +
            '.fmx-ring .fg{transition:stroke-dashoffset .45s linear;}' +
            '@keyframes fmxUp{from{transform:translateY(24px);opacity:0;}to{transform:translateY(0);opacity:1;}}';
        document.head.appendChild(s);
    }
    function _posterPickFormat(liveOk) {
        return new Promise(function (resolve) {
            var prev = el('fmx-fmtpick'); if (prev) prev.remove();
            var pro = liveOk ? '' : '<span class="fmx-fmtpro">PRO</span>';
            var lk = liveOk ? '' : ' locked';
            var m = document.createElement('div'); m.id = 'fmx-fmtpick';
            m.innerHTML = '<div class="fmx-fmtcard">' +
                '<div class="fmx-fmttitle">Как прислать постер?</div>' +
                '<button class="fmx-fmtrow' + lk + '" data-f="mp4"><span class="ic"><i class="ti ti-player-play"></i></span><span class="tx"><b>Живой постер (MP4)' + pro + '</b><i>Анимация играет прямо в чате · пришлю через минуту</i></span></button>' +
                '<button class="fmx-fmtrow' + lk + '" data-f="gif"><span class="ic"><i class="ti ti-gif"></i></span><span class="tx"><b>Живой постер (GIF)' + pro + '</b><i>Анимация без звука · для площадок, где MP4 неудобен</i></span></button>' +
                '<button class="fmx-fmtrow" data-f="png"><span class="ic"><i class="ti ti-photo"></i></span><span class="tx"><b>Картинка (PNG)</b><i>Статичный постер · мгновенно · на всех тарифах</i></span></button>' +
                '<button class="fmx-fmtcancel" data-f="">Отмена</button></div>';
            document.body.appendChild(m);
            function done(f) { m.remove(); resolve(f || null); }
            m.addEventListener('click', function (e) {
                if (e.target === m) return done(null);
                var b = e.target.closest('[data-f]'); if (!b) return;
                var f = b.getAttribute('data-f');
                if ((f === 'mp4' || f === 'gif') && !liveOk) {
                    try { _haptic('warning'); } catch (e2) {}
                    toast('Живой постер (MP4/GIF) — на тарифах Pro+, Agency и Network. Картинка (PNG) доступна всем');
                    return;
                }
                done(f);
            });
        });
    }
    function _fmxEnsureDockCss() {
        if (document.getElementById('fmx-dkCss')) return;
        var st = document.createElement('style'); st.id = 'fmx-dkCss';
        st.textContent =
            '#fmx-psDock,#fmx-cdDock{position:fixed;z-index:30;box-sizing:border-box;background:rgba(11,14,24,0.9);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-top:0;border-radius:0 0 18px 18px;box-shadow:0 18px 40px -18px rgba(0,0,0,0.75);padding:7px 11px;' +
                'opacity:0;transform:translateY(-10px);transition:opacity 190ms ease,transform 190ms ease;pointer-events:none;}' +
            '#fmx-psDock.dk-on,#fmx-cdDock.dk-on{opacity:1;transform:none;pointer-events:auto;}' +
            '.fmx-dkIn{max-width:560px;margin:0 auto;display:flex;gap:10px;align-items:center;}' +
            '#fmx-dkPrev,.fmx-cdTile{width:86px;height:107px;flex:0 0 auto;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.12);cursor:pointer;background:#0a0d18;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation;}' +
            '.fmx-cdTile{position:relative;}' +
            '#fmx-dkFrame{width:540px;height:675px;border:0;transform:scale(0.159);transform-origin:top left;pointer-events:none;}' +
            '.fmx-cdScale{position:absolute;left:0;top:50%;width:350px;transform-origin:left top;pointer-events:none;}' +
            '.fmx-dkCol{flex:1;min-width:0;max-height:107px;display:flex;flex-direction:column;justify-content:center;gap:5px;}' +
            '.fmx-dkNav{display:flex;flex-wrap:wrap;gap:5px;min-width:0;}' +
            '.fmx-dkChip{font-size:10.5px;font-weight:600;color:#a7aec6;padding:4px 9px;border-radius:99px;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.09);cursor:pointer;font-family:inherit;line-height:1.3;}' +
            '.fmx-dkChip.on{color:#8b8ff8;background:rgba(129,140,248,0.13);border-color:rgba(129,140,248,0.42);}' +
            '.fmx-dkHint{font-size:9.5px;color:#7c86a3;letter-spacing:0.2px;line-height:1.35;}';
        document.head.appendChild(st);
    }

    function _fmxBuildCardDock(env) {
        _fmxEnsureDockCss();
        var dock = document.createElement('div');
        dock.id = 'fmx-cdDock';
        dock.innerHTML = '<div class="fmx-dkIn">' +
            '<div id="fmx-cdPrev" class="fmx-cdTile" title="К карточке"><div class="fmx-cdScale"></div></div>' +
            '<div class="fmx-dkCol"><div class="fmx-dkNav"></div></div></div>';
        env.dockParent.insertBefore(dock, env.wrap);
        var prevOA = env.scroll.style.overflowAnchor;
        env.scroll.style.overflowAnchor = 'none';
        var prev = dock.querySelector('#fmx-cdPrev');
        var box = prev.querySelector('.fmx-cdScale');
        var nav = dock.querySelector('.fmx-dkNav');
        var destroyed = false, lastKey = '';
        function layoutTile(tile, bx) {
            bx.style.top = '50%';
            bx.style.transform = 'none';
            var nh = bx.offsetHeight || 1;
            var s2 = Math.min(tile.clientWidth / 350, tile.clientHeight / nh);
            var offX = (tile.clientWidth - 350 * s2) / 2;
            bx.style.transform = 'translate(' + offX.toFixed(1) + 'px,' + (-(nh * s2) / 2).toFixed(1) + 'px) scale(' + s2.toFixed(4) + ')';
        }
        function renderMini() {
            try {
                env.renderPreview(box);
                layoutTile(prev, box);
            } catch (e) {}
        }
        env.sections.forEach(function (sc, i) {
            var a = document.createElement('button'); a.type = 'button';
            a.className = 'fmx-dkChip' + (i === 0 ? ' on' : '');
            a.textContent = env.tr(sc[1]);
            a.addEventListener('click', function () {
                try {
                    var bodies = env.root.querySelectorAll('.fmx-accb');
                    bodies.forEach(function (b) { b.style.transition = 'none'; });
                    env.openSection(sc[0]);
                    void env.root.offsetHeight;
                    requestAnimationFrame(function () {
                        bodies.forEach(function (b) { b.style.transition = ''; });
                    });
                    nav.querySelectorAll('.fmx-dkChip').forEach(function (x) { x.classList.toggle('on', x === a); });
                    function anchorAbs() {
                        var sec = env.root.querySelector('.fmx-acc[data-ac="' + sc[0] + '"]'); if (!sec) return null;
                        var prevEl = sec.previousElementSibling;
                        while (prevEl && prevEl.getBoundingClientRect().height === 0) prevEl = prevEl.previousElementSibling;
                        var scR = env.scroll.getBoundingClientRect();
                        var y = prevEl ? prevEl.getBoundingClientRect().bottom : (sec.getBoundingClientRect().top - 12);
                        return env.scroll.scrollTop + (y - scR.top);
                    }
                    function dockHeight() {
                        var h = dock.offsetHeight;
                        if (!h) {
                            dock.style.visibility = 'hidden'; dock.style.display = 'block';
                            h = dock.offsetHeight;
                            dock.style.display = 'none'; dock.style.visibility = '';
                        }
                        return h;
                    }
                    var y0 = anchorAbs();
                    if (y0 != null) {
                        env.scroll.scrollTo({ top: y0 - dockHeight(), behavior: 'smooth' });
                        setTimeout(function () {
                            var yFin = anchorAbs(); if (yFin == null) return;
                            var tFin = yFin - dockHeight();
                            var maxS = env.scroll.scrollHeight - env.scroll.clientHeight;
                            tFin = Math.max(0, Math.min(tFin, maxS));
                            if (Math.abs(env.scroll.scrollTop - tFin) > 4) env.scroll.scrollTo({ top: tFin });
                        }, 480);
                    }
                } catch (e) {}
            });
            nav.appendChild(a);
        });
        var dkHint = document.createElement('div');
        dkHint.className = 'fmx-dkHint';
        dkHint.textContent = env.tr('Зажми превью — развернётся на весь экран · быстрый тап — к карточке');
        dock.querySelector('.fmx-dkCol').appendChild(dkHint);
        function bindPeek(tile, bx) {
            var peek = { on: false, timer: null, held: false, bd: null, saved: '', dockBF: null };
            function peekStart() {
                peek.timer = null;
                if (peek.on) return;
                peek.on = true; peek.held = true;
                peek.bd = document.createElement('div');
                peek.bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:89;';
                document.body.appendChild(peek.bd);
                peek.saved = tile.getAttribute('style') || '';
                peek.dockBF = [dock.style.backdropFilter, dock.style.webkitBackdropFilter];
                dock.style.backdropFilter = 'none'; dock.style.webkitBackdropFilter = 'none';
                var vw = window.innerWidth || 360, vh = window.innerHeight || 640;
                bx.style.transform = 'none';
                var ch = Math.max(bx.offsetHeight, 40);
                var sc2 = Math.min((vw * 0.92) / 350, (vh * 0.86) / ch, 460 / 350);
                tile.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
                    'width:' + (350 * sc2).toFixed(0) + 'px;height:' + (ch * sc2).toFixed(0) + 'px;border-radius:16px;' +
                    'overflow:hidden;border:1px solid rgba(255,255,255,0.16);z-index:90;' +
                    'box-shadow:0 30px 80px rgba(0,0,0,0.7);background:#0a0d18;cursor:pointer;';
                bx.style.top = '0';
                bx.style.transform = 'scale(' + sc2.toFixed(4) + ')';
            }
            function peekEnd() {
                if (peek.timer) { clearTimeout(peek.timer); peek.timer = null; }
                if (!peek.on) return;
                peek.on = false;
                if (peek.bd) { try { peek.bd.remove(); } catch (e) {} peek.bd = null; }
                if (peek.dockBF) { dock.style.backdropFilter = peek.dockBF[0] || ''; dock.style.webkitBackdropFilter = peek.dockBF[1] || ''; peek.dockBF = null; }
                tile.setAttribute('style', peek.saved || '');
                layoutTile(tile, bx);
            }
            tile.addEventListener('contextmenu', function (e) { e.preventDefault(); });
            tile.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                peek.held = false;
                try { tile.setPointerCapture(e.pointerId); } catch (e2) {}
                if (peek.timer) clearTimeout(peek.timer);
                peek.timer = setTimeout(peekStart, 260);
            });
            function peekUp(e) {
                var wasHold = peek.held;
                peekEnd();
                if (!wasHold && e.type === 'pointerup') env.scroll.scrollTo({ top: 0, behavior: 'smooth' });
            }
            tile.addEventListener('pointerup', peekUp);
            tile.addEventListener('pointercancel', peekUp);
            return peekEnd;
        }
        var _peekEnd = bindPeek(prev, box) || function () {};
        function onScroll() {
            try {
                if (!document.contains(dock)) { destroy(); return; }
                var wR = env.wrap.getBoundingClientRect(), scR = env.scroll.getBoundingClientRect();
                var on = dock.classList.contains('dk-on');
                var d = wR.bottom - scR.top;
                var vis = wR.height > 0 && (on ? d < 25 : d < -15);
                var W = Math.min(scR.width - 20, 560);
                dock.style.top = scR.top.toFixed(1) + 'px';
                dock.style.left = (scR.left + (scR.width - W) / 2).toFixed(1) + 'px';
                dock.style.width = W.toFixed(1) + 'px';
                dock.classList.toggle('dk-on', vis);
                if (vis && !on) { lastKey = env.stateKey(); renderMini(); }
            } catch (e) {}
        }
        env.scroll.addEventListener('scroll', onScroll);
        var iv = setInterval(function () {
            if (!document.contains(dock)) { destroy(); return; }
            if (!dock.classList.contains('dk-on')) return;
            try {
                var k3 = env.stateKey();
                if (k3 !== lastKey) { lastKey = k3; renderMini(); }
            } catch (e) {}
        }, 800);
        function destroy() {
            if (destroyed) return;
            destroyed = true;
            _peekEnd();
            clearInterval(iv);
            env.scroll.style.overflowAnchor = prevOA || '';
            env.scroll.removeEventListener('scroll', onScroll);
            try { if (dock.parentNode) dock.parentNode.removeChild(dock); } catch (e) {}
        }
        onScroll();
        return { destroy: destroy };
    }
    function _fmxBuildPosterDock(env) {
        _fmxEnsureDockCss();
        var dock = document.createElement('div');
        dock.id = 'fmx-psDock';
        dock.innerHTML = '<div class="fmx-dkIn"><div id="fmx-dkPrev" title="К постеру"></div><div class="fmx-dkCol"><div class="fmx-dkNav" id="fmx-dkNav"></div></div></div>';
        env.dockParent.insertBefore(dock, env.wrap);
        var mini = null, miniWin = null, lastState = '', destroyed = false;
        function ensureMini() {
            if (mini || destroyed) return;
            mini = document.createElement('iframe');
            mini.id = 'fmx-dkFrame'; mini.setAttribute('scrolling', 'no');
            mini.src = env.pageUrl;
            document.getElementById('fmx-dkPrev').appendChild(mini);
            mini.addEventListener('load', function () {
                try {
                    var idoc = mini.contentDocument;
                    var g = idoc.createElement('script'); g.src = env.glueSrc;
                    g.onload = function () {
                        try {
                            miniWin = mini.contentWindow;
                            miniWin.__fmxPosterRender(env.getData(), env.getState(), env.api, { render: true });
                            lastState = JSON.stringify(env.getState() || {});
                        } catch (e) {}
                    };
                    idoc.head.appendChild(g);
                } catch (e) {}
            });
        }
        var NAV = [['fmxPsLang', 'Язык'], ['ordBox', 'Блоки'], ['bgChips', 'Фон'], ['mChips', 'Метрики'], ['prInp', 'Цена'], ['eChips', 'Стикеры'], ['hookInp', 'Текст']];
        var nav = dock.querySelector('#fmx-dkNav');
        NAV.forEach(function (nv) {
            var a = document.createElement('button'); a.type = 'button'; a.className = 'fmx-dkChip';
            a.textContent = env.tr(nv[1]);
            a.addEventListener('click', function () {
                try {
                    var idoc = env.frame.contentDocument;
                    var t = idoc.getElementById(nv[0]); if (!t) return;
                    var sec = (t.closest && t.closest('.fmx-sec')) || t;
                    var body = idoc.body.getBoundingClientRect();
                    var prevEl = sec.previousElementSibling;
                    while (prevEl && prevEl.getBoundingClientRect().height === 0) prevEl = prevEl.previousElementSibling;
                    var yTop = prevEl
                        ? (prevEl.getBoundingClientRect().bottom - body.top)
                        : (sec.getBoundingClientRect().top - body.top - 12);
                    var fR = env.frame.getBoundingClientRect(), scR = env.scroll.getBoundingClientRect();
                    var anchorAbs = env.scroll.scrollTop + (fR.top - scR.top) + yTop * env.getK();
                    env.scroll.scrollTo({ top: anchorAbs - dock.offsetHeight, behavior: 'smooth' });
                    nav.querySelectorAll('.fmx-dkChip').forEach(function (x) { x.classList.toggle('on', x === a); });
                } catch (e) {}
            });
            nav.appendChild(a);
        });
        var dkHint = document.createElement('div');
        dkHint.className = 'fmx-dkHint';
        dkHint.textContent = env.tr('Зажми превью — развернётся на весь экран · быстрый тап — к постеру');
        dock.querySelector('.fmx-dkCol').appendChild(dkHint);
        var prev = dock.querySelector('#fmx-dkPrev');
        var peek = { on: false, timer: null, held: false, bd: null, saved: '' };
        function peekStart() {
            peek.timer = null;
            if (peek.on || !mini) return;
            peek.on = true; peek.held = true;
            peek.bd = document.createElement('div');
            peek.bd.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:89;';
            document.body.appendChild(peek.bd);
            peek.saved = prev.getAttribute('style') || '';
            peek.dockBF = [dock.style.backdropFilter, dock.style.webkitBackdropFilter];
            dock.style.backdropFilter = 'none'; dock.style.webkitBackdropFilter = 'none';
            var vw = window.innerWidth || 360, vh = window.innerHeight || 640;
            var w = Math.min(vw * 0.92, (vh * 0.86) * (540 / 675), 460);
            var sc = w / 540;
            prev.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
                'width:' + w.toFixed(0) + 'px;height:' + (675 * sc).toFixed(0) + 'px;border-radius:16px;' +
                'overflow:hidden;border:1px solid rgba(255,255,255,0.16);z-index:90;' +
                'box-shadow:0 30px 80px rgba(0,0,0,0.7);background:#0a0d18;cursor:pointer;';
            mini.style.transform = 'scale(' + sc.toFixed(4) + ')';
        }
        function peekEnd() {
            if (peek.timer) { clearTimeout(peek.timer); peek.timer = null; }
            if (!peek.on) return;
            peek.on = false;
            if (peek.bd) { try { peek.bd.remove(); } catch (e) {} peek.bd = null; }
            if (peek.dockBF) { dock.style.backdropFilter = peek.dockBF[0] || ''; dock.style.webkitBackdropFilter = peek.dockBF[1] || ''; peek.dockBF = null; }
            prev.setAttribute('style', peek.saved || '');
            if (mini) mini.style.transform = '';
        }
        prev.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        prev.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            peek.held = false;
            try { prev.setPointerCapture(e.pointerId); } catch (e2) {}
            if (peek.timer) clearTimeout(peek.timer);
            peek.timer = setTimeout(peekStart, 260);
        });
        function peekUp(e) {
            var wasHold = peek.held;
            peekEnd();
            if (!wasHold && e.type === 'pointerup') env.scroll.scrollTo({ top: 0, behavior: 'smooth' });
        }
        prev.addEventListener('pointerup', peekUp);
        prev.addEventListener('pointercancel', peekUp);
        function onScroll() {
            try {
                var fR = env.frame.getBoundingClientRect(), scR = env.scroll.getBoundingClientRect();
                var on = dock.classList.contains('dk-on');
                var base = -675 * env.getK() * 0.8;
                var d = fR.top - scR.top;
                var vis = on ? d < base + 40 : d < base;
                var W = Math.min(scR.width - 20, 560);
                dock.style.top = scR.top.toFixed(1) + 'px';
                dock.style.left = (scR.left + (scR.width - W) / 2).toFixed(1) + 'px';
                dock.style.width = W.toFixed(1) + 'px';
                dock.classList.toggle('dk-on', vis);
                if (vis && !on) ensureMini();
            } catch (e) {}
        }
        env.scroll.addEventListener('scroll', onScroll);
        var iv = setInterval(function () {
            try {
                if (destroyed || !miniWin || !dock.classList.contains('dk-on')) return;
                var st = env.getState(); if (!st) return;
                var js = JSON.stringify(st);
                if (js !== lastState) {
                    lastState = js;
                    miniWin.__fmxPosterApply(st);
                    if (st.lang && miniWin.__fmxPosterSetLang) miniWin.__fmxPosterSetLang(st.lang);
                }
            } catch (e) {}
        }, 700);
        return {
            destroy: function () {
                destroyed = true; clearInterval(iv);
                env.scroll.removeEventListener('scroll', onScroll);
                try { dock.remove(); } catch (e) {}
            }
        };
    }
    function openPosterStudio() {
        var base = listingForChannel(_ss.channelId);
        if (!base || !base.id) { toast('Сначала сохрани оффер — постер строится по нему'); return; }
        var chan = channelById(_ss.channelId) || {};
        var realAvatar = chan.avatar_url || null;
        var realNiche = base.niche || chan.niche || '';
        var minPrice = base.min_price || (function () { var ps = (base.formats || []).map(function (f) { return f.price; }).filter(Boolean); return ps.length ? Math.min.apply(null, ps) : 0; })();
        var saved = base.poster_json || {};
        var defaultState = {
            bg: 'blur', niche: true, chart: true,
            metrics: { subs: true, reach: true, er: true, cpm: true, err: true, grow: true, freq: true, mv: true },
            price: { on: true, val: minPrice || 0 }, qr: 'both', hook: '',
            order: ['hook', 'chart', 'mgrid'], colors: { cells: {} }, stickers: []
        };
        var hasSaved = saved && Object.keys(saved).length > 0;
        var oldm = el('fmx-psBg'); if (oldm) { if (oldm.__fmxCleanup) oldm.__fmxCleanup(); oldm.remove(); }
        _psInjectStyle();
        var apiBase = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
        var bg = document.createElement('div');
        bg.id = 'fmx-psBg'; bg.className = 'fmx-psFull';
        bg.innerHTML =
            '<div class="fmx-psTop"><div class="t"><i class="ti ti-photo-star"></i> Промо-постер</div>' +
            '<button class="fmx-psX" id="fmx-ps-x" aria-label="Закрыть"><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-psScroll"><div id="fmx-psLoad" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 0;color:#8990a8;"><i class="ti ti-loader-2" style="font-size:26px;animation:fmxSpin 0.9s linear infinite;"></i><div style="font-size:12px;margin-top:10px;">Открываю редактор…</div></div>' +
            '<div id="fmx-psWrap" style="width:100%;max-width:560px;margin:0 auto;overflow:hidden;">' +
            '<iframe id="fmx-psFrame" scrolling="no" src="poster_render.html?v=' + PS_GLUE_V + '" style="opacity:0;transition:opacity 0.25s;overflow:hidden;"></iframe></div></div>' +
            '<div class="fmx-psBottom"><button class="fmx-save" id="fmx-ps-send" style="margin:0;"><i class="ti ti-send"></i> Прислать постер в чат с ботом</button></div>';
        document.body.appendChild(bg);
        var frame = el('fmx-psFrame'), wrap = el('fmx-psWrap');
        var LW = 560, glueReady = false, chartDone = false, extra = {};

        function fitFrame() {
            try {
                var idoc = frame.contentDocument; if (!idoc || !idoc.body) return;
                var k = Math.min(1, (wrap.clientWidth || 360) / LW);
                try { if (frame.contentWindow.__fmxPosterPanelScale) frame.contentWindow.__fmxPosterPanelScale(k); } catch (e) {}
                var lh = Math.max(idoc.body.scrollHeight, 700);
                frame.style.width = LW + 'px'; frame.style.height = lh + 'px';
                frame.style.transform = 'scale(' + k + ')'; frame.style.transformOrigin = 'top left';
                wrap.style.height = Math.round(lh * k) + 'px';
            } catch (e) {}
        }
        function posterData() {
            return {
                id: base.id, username: base.username, title: base.title, niche: realNiche || extra.niche || '',
                niche_tr: extra.niche_tr || null, ref_code: extra.ref_code || null,
                avatar_url: realAvatar, subscribers: base.subscribers, avg_views: base.avg_views,
                er: (base.engagement_percent != null ? base.engagement_percent : null), reach_rate: base.er, min_price: minPrice,
                grow: extra.grow, freq: extra.freq, mv: extra.mv, chart: extra.chart
            };
        }
        function uploadPosterBg(file) {
            if (file && file.size > MEDIA_MAX_BYTES) {
                return Promise.reject(new Error('Файл ' + Math.round(file.size / 1048576) + ' МБ — это больше 64 МБ'));
            }
            var fd = new FormData(); fd.append('file', file); fd.append('target', 'posterbg');
            var headers = {};
            try { if (typeof tg !== 'undefined' && tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData; } catch (e) {}
            return fetch(apiBase + '/api/v1/marketplace/upload', { method: 'POST', headers: headers, body: fd })
                .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('код ' + r.status)); }); return r.json(); });
        }
        var stickersDone = false, revealed = false;
        function reveal() {
            if (revealed) return; revealed = true;
            var ld = el('fmx-psLoad'); if (ld) ld.style.display = 'none';
            frame.style.opacity = '1';
        }
        function maybeInit() {
            if (!glueReady || !chartDone || !stickersDone) return;
            var win = frame.contentWindow;
            try { win.__fmxPosterInit(posterData(), apiBase); } catch (e) {}
            try { win.__fmxPosterUploader = uploadPosterBg; } catch (e) {}
            try { win.__fmxPosterNotify = function (m) { toast(m, true); }; } catch (e) {}
            try { if (win.__fmxPosterApply) win.__fmxPosterApply(hasSaved ? saved : defaultState); } catch (e) {}
            try { if (win.__fmxPosterSetLang) win.__fmxPosterSetLang((hasSaved && saved && saved.lang) ? saved.lang : ((typeof getLang === 'function') ? getLang() : 'ru')); } catch (e) {}
            try { if (win.__fmxPosterEditorMode) win.__fmxPosterEditorMode({ stickers: _stickers || [], defaultState: defaultState }); } catch (e) {}
            try {
                if (!bg.__fmxDock) {
                    bg.__fmxDock = _fmxBuildPosterDock({
                        scroll: bg.querySelector('.fmx-psScroll'), dockParent: bg.querySelector('.fmx-psScroll'),
                        wrap: wrap, frame: frame,
                        pageUrl: 'poster_render.html?v=' + PS_GLUE_V, glueSrc: 'poster_glue.js?v=' + PS_GLUE_V, api: apiBase,
                        getData: posterData,
                        getState: function () { try { return frame.contentWindow.__fmxPosterState(); } catch (e) { return null; } },
                        tr: function (s2) { try { return (typeof _t === 'function') ? _t(s2) : s2; } catch (e) { return s2; } },
                        getK: function () { return Math.min(1, (wrap.clientWidth || 360) / LW); }
                    });
                }
            } catch (e) {}
            fitFrame();
            requestAnimationFrame(function () { fitFrame(); reveal(); });
            setTimeout(fitFrame, 300); setTimeout(fitFrame, 900);
        }
        frame.addEventListener('load', function () {
            try {
                var idoc = frame.contentDocument;
                var g = idoc.createElement('script'); g.src = 'poster_glue.js?v=' + PS_GLUE_V;
                g.onload = function () { glueReady = true; maybeInit(); };
                g.onerror = function () { toast('Не удалось загрузить редактор постера'); };
                idoc.head.appendChild(g);
                idoc.addEventListener('click', function () { setTimeout(fitFrame, 60); });
            } catch (e) { toast('Редактор недоступен'); }
        });
        apiGet('/api/v1/marketplace/poster/chart?listing_id=' + base.id).then(function (r) {
            if (r && r.ok) extra = { chart: r.chart, grow: r.grow, freq: r.freq, mv: r.mv, niche: r.niche, niche_tr: r.niche_tr || null, live_ok: r.live_ok, ref_code: r.ref_code || null };
            chartDone = true; maybeInit();
        }).catch(function () { chartDone = true; maybeInit(); });
        if (_stickers) { stickersDone = true; }
        else apiGet('/api/v1/marketplace/stickers').then(function (r) { _stickers = (r && r.stickers) ? r.stickers : []; stickersDone = true; maybeInit(); }).catch(function () { _stickers = _stickers || []; stickersDone = true; maybeInit(); });

        function onResize() { fitFrame(); }
        window.addEventListener('resize', onResize);
        bg.__fmxCleanup = function () { window.removeEventListener('resize', onResize); clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo); clearTimeout(bg.__fmxProgTo2); clearTimeout(bg.__fmxProgDone); clearTimeout(bg.__fmxSendCd); if (bg.__fmxDock) { try { bg.__fmxDock.destroy(); } catch (e) {} bg.__fmxDock = null; } };
        function close() {
            var win = frame.contentWindow;
            bg.style.pointerEvents = 'none'; bg.style.opacity = '0';
            var pend = null;
            try { pend = (win && win.__fmxPosterBgPending) ? win.__fmxPosterBgPending() : null; } catch (e) {}
            var done = false;
            function finish() {
                if (done) return; done = true;
                try {
                    var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                    if (state) {
                        if (_myListings) for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === base.id) _myListings[i].poster_json = state;
                        apiPost('/api/v1/marketplace/poster', { listing_id: base.id, poster: state, save_only: true }).catch(function () {});
                    }
                } catch (e) {}
                if (bg.__fmxCleanup) bg.__fmxCleanup(); bg.remove();
            }
            if (pend && pend.then) { pend.then(finish, finish); setTimeout(finish, 15000); }
            else finish();
        }
        el('fmx-ps-x').addEventListener('click', close);
        var SEND_LABEL = '<i class="ti ti-send"></i> Прислать постер в чат с ботом';
        function sendBtn() { return el('fmx-ps-send'); }
        function restoreSend() { clearTimeout(bg.__fmxSendCd); var b = sendBtn(); if (b) { b.disabled = false; b.innerHTML = SEND_LABEL; } }
        function waitSend(sec) {
            var b = sendBtn();
            if (!b) return;
            b.disabled = true;
            (function tick() {
                if (sec <= 0) { restoreSend(); return; }
                b.innerHTML = '<i class="ti ti-clock"></i> Можно через ' + sec + ' с';
                sec--;
                bg.__fmxSendCd = setTimeout(tick, 1000);
            })();
        }
        window.__fmxPosterJob = window.__fmxPosterJob || {};

        function _startPosterProgress(job, fmt) {
            var b = sendBtn(); if (!b || !job) return;
            var C = 97.4, pct = 0, done = false, t0 = Date.now();
            window.__fmxPosterJob[base.id] = job;
            b.disabled = true;
            b.innerHTML = '<span class="fmx-ring"><svg viewBox="0 0 36 36">' +
                '<circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="4"></circle>' +
                '<circle class="fg" id="fmx-ring-fg" cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" transform="rotate(-90 18 18)"></circle>' +
                '</svg></span> Готовлю живой постер… <b id="fmx-pct">0%</b>';
            function setPct(p) {
                p = Math.max(pct, Math.min(100, p)); pct = p;
                var fg = el('fmx-ring-fg'); if (fg) fg.style.strokeDashoffset = (C * (1 - p / 100)).toFixed(1);
                var pc = el('fmx-pct'); if (pc) pc.textContent = Math.round(p) + '%';
            }
            function stop() { clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo); clearTimeout(bg.__fmxProgTo2); clearTimeout(bg.__fmxProgDone); }
            setPct(2);
            clearInterval(bg.__fmxProgIv);
            bg.__fmxProgIv = setInterval(function () {
                if (done) return;
                var warm = 2 + Math.min(1, (Date.now() - t0) / 10000) * 8;
                if (warm > pct) setPct(warm);
            }, 700);
            function poll() {
                if (done) return;
                apiGet('/api/v1/marketplace/poster/status?job=' + job).then(function (r) {
                    if (done) return;
                    if (r && r.done) {
                        done = true; clearInterval(bg.__fmxProgIv); clearTimeout(bg.__fmxProgPoll); clearTimeout(bg.__fmxProgTo2);
                        setPct(100); _haptic('success');
                        delete window.__fmxPosterJob[base.id];
                        var msg = r.sent ? '<i class="ti ti-circle-check"></i> Готово — постер в чате' : '<i class="ti ti-photo"></i> Прислал картинкой';
                        bg.__fmxProgDone = setTimeout(function () { var b2 = sendBtn(); if (b2) b2.innerHTML = msg; }, 650);
                        toast(r.sent ? 'Живой постер в чате с ботом, можно переслать' : 'Живой постер не удалось создать — отправлен изображением');
                        bg.__fmxProgTo = setTimeout(restoreSend, 5300);
                    } else {
                        if (r && r.pct) setPct(r.pct);
                        bg.__fmxProgPoll = setTimeout(poll, 1200);
                    }
                }).catch(function () { bg.__fmxProgPoll = setTimeout(poll, 3000); });
            }
            bg.__fmxProgPoll = setTimeout(poll, 1500);
            bg.__fmxProgTo2 = setTimeout(function () { if (!done) { done = true; stop(); delete window.__fmxPosterJob[base.id]; restoreSend(); } }, 240000);
        }

        el('fmx-ps-send').addEventListener('click', function () {
            var btn = this, win = frame.contentWindow;
            function send(fmt) {
                var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                if (!state) { restoreSend(); toast('Редактор ещё загружается — секунду'); return; }
                var live = (fmt === 'mp4' || fmt === 'gif');
                btn.disabled = true;
                btn.innerHTML = live ? '<i class="ti ti-loader-2"></i> Отправляю…' : '<i class="ti ti-loader-2"></i> Рисую постер… ~10 сек';
                apiPost('/api/v1/marketplace/poster', { listing_id: base.id, poster: state, format: fmt || 'png' }).then(function (r) {
                    if (r && r.ok) {
                        _haptic('success');
                        if (r.queued && r.job) {
                            _startPosterProgress(r.job, fmt);
                        } else if (r.queued) {
                            btn.disabled = true; btn.innerHTML = '<i class="ti ti-clock"></i> Идёт обработка…';
                        } else {
                            toast('Постер в чате с ботом, можно переслать'); restoreSend();
                        }
                        if (_myListings) for (var i = 0; i < _myListings.length; i++) if (_myListings[i].id === base.id) _myListings[i].poster_json = r.poster || state;
                    } else {
                        var msg = (r && r.error) || 'Не удалось';
                        var wait = /через\s+(\d+)\s*с/.exec(msg);
                        if (wait) waitSend(parseInt(wait[1], 10)); else restoreSend();
                        toast(msg, true);
                    }
                }).catch(function () { restoreSend(); toast('Сервер не ответил', true); });
            }
            function proceed() {
                var state = (win && win.__fmxPosterState) ? win.__fmxPosterState() : null;
                if (!state) { restoreSend(); toast('Редактор ещё загружается — секунду'); return; }
                var bgErr = null;
                try { bgErr = win.__fmxPosterBgError ? win.__fmxPosterBgError() : null; } catch (e) {}
                if (bgErr) {
                    restoreSend();
                    var big = /больше|\b413\b|превыш|64 МБ|fetch/i.test(bgErr);
                    toast(big ? 'Фон слишком большой: до 64 МБ. Для видео нужен короткий ролик — в постер идёт первый отрезок 20 сек' : ('Фон не загрузился: ' + bgErr), true);
                    return;
                }
                var hasMotion = !!(state.bg && typeof state.bg === 'object' && state.bg.kind === 'video')
                    || (state.stickers || []).some(function (s) { return s && (s.kind === 'tgs' || s.kind === 'webm'); });
                if (!hasMotion) { send('png'); return; }
                btn.disabled = true;
                _posterPickFormat(extra && extra.live_ok).then(function (fmt) { if (fmt) send(fmt); else restoreSend(); });
            }
            var pend = null;
            try { pend = (win && win.__fmxPosterBgPending) ? win.__fmxPosterBgPending() : null; } catch (e) {}
            if (pend && pend.then) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю фон…'; pend.then(proceed, proceed); }
            else proceed();
        });
        if (window.__fmxPosterJob[base.id]) _startPosterProgress(window.__fmxPosterJob[base.id], null);
    }
    function uploadPending() {
        var chain = Promise.resolve();
        ['cover', 'avatar', 'cardbg'].forEach(function (t) {
            chain = chain.then(function () {
                var m = _ss._media && _ss._media[t];
                if (!m || !m.file) return;
                if (m.file.size > MEDIA_MAX_BYTES) {
                    throw new Error('Файл «' + t + '» ' + Math.round(m.file.size / 1048576) + ' МБ — больше 64 МБ. Выбери файл меньше');
                }
                var fd = new FormData();
                fd.append('file', m.file);
                fd.append('target', t);
                var base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '';
                var headers = {};
                try { if (typeof tg !== 'undefined' && tg && tg.initData) headers['X-Telegram-Init-Data'] = tg.initData; } catch (e) {}
                return fetch(base + '/api/v1/marketplace/upload', { method: 'POST', headers: headers, body: fd })
                    .then(function (r) { if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.detail || ('код ' + r.status)); }); return r.json(); })
                    .then(function (j) {
                        if (!j || !j.url) throw new Error('сервер не вернул адрес файла');
                        if (typeof _ss.att[t] !== 'object' || !_ss.att[t]) _ss.att[t] = { x: 50, y: 50, s: 1 };
                        _ss.att[t].url = j.url;
                        _ss.att[t].kind = j.kind || m.kind;
                        delete m.file;
                    });
            });
        });
        return chain;
    }
    function saveStudio() {
        var btn = el('fmx-save'); btn.disabled = true;
        var hasFiles = ['cover', 'avatar', 'cardbg'].some(function (t) { return _ss._media && _ss._media[t] && _ss._media[t].file; });
        if (hasFiles) btn.innerHTML = '<i class="ti ti-loader-2"></i> Загружаю файлы…';
        uploadPending().then(function () { _saveListing(btn); }).catch(function (e) {
            _haptic('error'); btn.disabled = false;
            btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (_ss.listingId ? 'Сохранить оффер' : 'Опубликовать на Площадке');
            uiAlert('Не удалось загрузить файл: ' + (e && e.message ? e.message : 'ошибка'));
        });
    }
    function _saveListing(btn) {
        var de = el('fmx-desc'), ta = el('fmx-tags');
        var body = {
            formats: _sfmts.filter(function (f) { return f.on; }).map(function (f) { return { format: f.format, price: f.p, unit: 'RUB' }; }),
            erid_who: _ss._erid || null,
            hide_insights: !!_ss._hideInsights,
            custom_text: (de ? de.value : _ss._desc) || null,
            accent_color: _ss.color,
            cover_type: _ss.covType,
            cover_gradient: _ss.covType === 'grad' ? (_ss.coverGrad || COVERS[_ss.cover]) : null,
            cover_url: (_ss.covType !== 'grad' && typeof _ss.att.cover === 'object' && _ss.att.cover && _ss.att.cover.url) ? _ss.att.cover.url : null,
            avatar_url: (function () { var c = curChannel(); return (c && c.avatar_url) || null; })(),
            avatar_type: 'tg',
            avatar_emoji: null,
            sticker_json: (function () { if (!_ss.sticker) return null; var hc = el('fmx-hero') && el('fmx-hero').querySelector('.fmx-card'); if (hc && hc.offsetHeight) _ss.sticker.h0 = hc.offsetHeight; return _ss.sticker; })(),
            show_deals: _ss.showDeals !== false,
            title_style: _ss.font,
            tags_json: ((ta ? ta.value : _ss._tags) || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
            effects_json: { move: _ss.move, over: _ss.over, glow: _ss.glow, orbit: _ss.orbit, part: _ss.part, atomColor: _ss.atomColor, glowCard: _ss.glowCard, fullBg: _ss.fullBg, glass: _ss.glass, btns: _ss.btns || 'std', topTag: _ss.topTag || 'on', badgeFree: _ss.badgeFree || null, stickerRot: _ss.sticker ? (_ss.sticker.rot || 0) : null, stickerMode: _ss.sticker ? ((_ss.sticker.dmode === 'top' ? 'blend' : _ss.sticker.dmode) || 'bg') : null },
            emoji_attachments_json: _ss.att
        };
        var wasCreate = !_ss.listingId, p;
        var savingCh = _ss.channelId, savingId = _ss.listingId;
        if (savingId) p = apiPatch('/api/v1/marketplace/listings/' + savingId, body);
        else { if (!savingCh) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-rocket"></i> Опубликовать на Площадке'; uiAlert('Сначала выбери канал.'); return; } body.channel_id = savingCh; p = apiPost('/api/v1/marketplace/listings', body); }
        p.then(function (r) {
            var sameCtx = !!(_ss && _ss.channelId === savingCh);
            if (r && r.ok === false) { _haptic('error'); btn.disabled = false; btn.innerHTML = '<i class="ti ti-rocket"></i> ' + (savingId ? 'Сохранить оффер' : 'Опубликовать на Площадке'); uiAlert('Не удалось сохранить: ' + (r.error || 'ошибка')); return; }
            _haptic('success');
            var savedId = (r && r.listing_id) || savingId;
            if (r && r.listing_id) { if (sameCtx) _ss.listingId = r.listing_id; if (wasCreate) { var ch = channelById(savingCh); _myListings.push({ id: r.listing_id, username: ch ? ch.username : null, status: 'pending', status_human: 'На модерации' }); } loadMyListings(); }
            if (r && (r.resubmitted || r.needs_review)) {
                if (sameCtx) _ss._status = 'pending';
                var nm = r.needs_review;
                for (var ri = 0; ri < _myListings.length; ri++) if (_myListings[ri].id === savedId) {
                    _myListings[ri].status = 'pending';
                    _myListings[ri].status_human = nm ? 'На проверке' : 'На модерации';
                    _myListings[ri].moderation_status = nm ? 'needs_review' : 'pending';
                    if (!nm) _myListings[ri].reject_reason = null;
                }
            }
            btn.innerHTML = '<i class="ti ti-check"></i> Сохранено';
            toast(r && r.needs_review ? 'Оффер ушёл на ручную проверку — проверим и вернём' : (r && r.resubmitted ? 'Оффер отправлен на повторную проверку' : 'Оффер сохранён'));
            _feed = null; _feedState = 'idle';
            if (wasCreate && r && r.listing_id) _pollPublish(r.listing_id);
            setTimeout(function () {
                if (!(_ss && _ss.channelId === savingCh)) return;
                if (wasCreate) { paintCreate(); }
                else { btn.innerHTML = '<i class="ti ti-rocket"></i> Сохранить оффер'; btn.disabled = false; }
            }, 1600);
        }).catch(function (e) { _haptic('error'); btn.disabled = false; uiAlert('Не удалось сохранить: ' + (e && e.message ? e.message : 'ошибка')); });
    }

    function _bk(k, h) { return h.replace('<span', '<span data-bkey="' + k + '"'); }
    var _ACT = {
        high: ['p1', '#5DCAA5', 'Активный'],
        mid: ['p2', '#a9cb5c', 'Регулярный'],
        rare: ['p3', '#f5bf4f', 'Редкие посты'],
        low: ['p4', '#f08a3c', 'Единичные посты'],
        none: ['p5', '#ef4444', 'Не публикует']
    };
    function _ensurePulseMask() {
        if (document.getElementById('fmxPulseCut')) return;
        var d = document.createElement('div');
        d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
        d.innerHTML = '<svg width="0" height="0"><defs><mask id="fmxPulseCut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">' +
            '<rect x="0" y="0" width="24" height="24" fill="#fff"/>' +
            '<path d="M6.6 12.4h2.9l1.5-3.4 2.2 6.6 1.6-3.2h2.6" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</mask></defs></svg>';
        document.body.appendChild(d);
    }
    function _pulseSvg(size, color) {
        _ensurePulseMask();
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" style="display:block;flex:0 0 auto;">' +
            '<path d="M12 20.9 4.3 13.2a5.1 5.1 0 1 1 7.7-6.7 5.1 5.1 0 1 1 7.7 6.7z" fill="' + (color || 'currentColor') + '" mask="url(#fmxPulseCut)"/></svg>';
    }
    var _PULSE_SVG = _pulseSvg(13);
    function _actInfo(l) { var a = l && l.activity; return (a && _ACT[a]) ? _ACT[a] : null; }
    function _actBadge(l) {
        var a = _actInfo(l);
        if (!a) return '';
        return '<span class="fmx-bdg fmx-bp ' + a[0] + '">' + _PULSE_SVG + a[2] + '</span>';
    }
    function _deltaPill(l) {
        var d = l.niche_delta_pct;
        if (d == null || !isFinite(d)) return '';
        var neg = d < 0;
        return '<span class="fmx-dpill ' + (neg ? 'gr' : 'am') + '">' + (neg ? '−' : '+') + Math.abs(Math.round(d)) + '% к нише</span>';
    }

        var MON_RD = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var MON_IM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    function _fmtDayRu(iso) {
        try { var p = String(iso).split('-'); return parseInt(p[2], 10) + ' ' + MON_RD[parseInt(p[1], 10) - 1]; }
        catch (e) { return iso; }
    }

    function badgeItems(l) {
        var items = [];
        items.push({ k: 'tl', h: _bk('tl', trafficLight(l)) });
        if (l.niche) items.push({ k: 'niche', h: _bk('niche', '<span class="fmx-bdg" style="color:#c7ccf7;border-color:rgba(129,140,248,0.35);background:rgba(129,140,248,0.12);"><i class="ti ti-tag" style="color:#818cf8;"></i>' + _esc(l.niche) + '</span>') });
        if (l.owner_verified) items.push({ k: 'owner', h: _bk('owner', '<span class="fmx-bdg fmx-b-owner"><i class="ti ti-user-check"></i>Владелец</span>') });
        if (l.antifraud === 'clean') items.push({ k: 'nofraud', h: _bk('nofraud', '<span class="fmx-bdg fmx-b-nofraud"><i class="ti ti-shield-check"></i>Фрод-контроль пройден</span>') });
        var dealN = l.deals_count || 0;
        if (l.show_deals !== false && dealN >= 1) items.push({ k: 'deal', h: _bk('deal', '<span class="fmx-bdg fmx-b-deal"><i class="ti ti-heart-handshake"></i>' + (l.rating_avg ? '★ ' + l.rating_avg + ' · ' : '') + dealN + ' ' + _plural(dealN, 'сделка', 'сделки', 'сделок') + '</span>') });
        if (_nicheMatch(l)) items.push({ k: 'match', h: _bk('match', '<span class="fmx-bdg fmx-b-match"><i class="ti ti-target-arrow"></i>В нише</span>') });
        if (l.hot_discount_pct) items.push({ k: 'hot', h: _bk('hot', '<span class="fmx-bdg" style="color:#f5bf4f;border-color:rgba(245,191,79,0.45);background:rgba(245,191,79,0.1);"><i class="ti ti-discount-2"></i>Горящие даты до −' + l.hot_discount_pct + '%</span>') });
        var _ab = _actBadge(l);
        if (_ab) items.push({ k: 'live', h: _bk('live', _ab) });
        if (l.badges && l.badges.length) {
            var m = { safe: ['fmx-b-safe', 'ti-shield-check', 'Безопасный'], big: ['fmx-b-big', 'ti-crown', 'Крупный'],
                risk: ['fmx-b-dead', 'ti-alert-triangle', 'Требует проверки'] };
            l.badges.filter(function (b) { return b !== 'match'; }).forEach(function (b) {
                var x = m[b]; if (x) items.push({ k: b, h: _bk(b, '<span class="fmx-bdg ' + x[0] + '"><i class="ti ' + x[1] + '"></i>' + x[2] + '</span>') });
            });
        } else if (l.subscribers && l.subscribers >= 100000) {
            items.push({ k: 'big', h: _bk('big', '<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>') });
        }
        return items;
    }
    function _freeStyleInject(h, pos) {
        h = h.replace('class="', 'class="fmx-bfree ');
        return h.replace('<span', '<span style="left:' + pos.x.toFixed(1) + 'px;top:' + pos.y.toFixed(1) + 'px;"');
    }
    function badges(l, part) {
        var items = badgeItems(l);
        if (part === 'deal') return items.filter(function (i) { return i.k === 'deal'; }).map(function (i) { return i.h; }).join('');
        if (part === 'status') return items.filter(function (i) { return i.k !== 'deal'; }).map(function (i) { return i.h; }).join('');
        return items.map(function (i) { return i.h; }).join('');
    }
    function _fmrBlocksBuy(l) {
        var subs = l.subscribers, av = l.avg_views;
        var rr = (l.er != null) ? l.er : null, rstat = l.reach_status, rtier = l.reach_tier, rnorm = l.reach_norm;
        var pp = _basePrice(l);
        var cpm = _cpm(l);
        var conv = 0.5, _grw = av ? av * conv / 100 : 0, gained = Math.round(_grw), cps = (pp && _grw > 0) ? Math.round(pp / _grw) : null;
        var rrHtml = '';
        if (rr != null && rstat) {
            var rrCol = (rstat === 'норма') ? '#5DCAA5' : ((rstat === 'очень низкий' || rstat === 'аномальный') ? '#ef4444' : '#f59e0b');
            var normTxt = (rnorm && rnorm.length === 2) ? (' <span style="font-size:10px;color:#565b73;">норма для этого размера ' + rnorm[0] + '–' + rnorm[1] + '%</span>') : '';
            var rrWarn = (rstat === 'аномальный') ? (_warnTri(14) + ' ') : '';
            var rrAnom = (rstat === 'аномальный') ? ' Когда охват стабильно выше подписчиков (за 100%) почти на каждом посте без явной причины — цифру стоит перепроверить: обычно это докрученные просмотры (имитация активности под продажу рекламы) либо закуп в непрофильных каналах с ботовым трафиком. Опровергнуть или подтвердить помогает вовлечённость (реакции): заметные реакции при большом охвате — просмотры живые; почти полное их отсутствие — охват докручен, боты реакций не ставят.' : '';
            rrHtml = '<div class="fmr-line" style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + rrWarn + 'ERR <b style="color:' + rrCol + ';">' + rr + '%</b> <span style="font-size:11px;color:' + rrCol + ';font-weight:600;">' + _esc(rstat) + '</span>' + normTxt + '<i class="fmr-i ti ti-info-circle push" data-fi="rr"></i></div>' +
                '<div class="fmr-info" data-finfo="rr">ERR = охват ÷ подписчики — какой процент подписчиков видит пост. Норму смотрим по размеру канала (у больших она ниже — это нормально): микро до 5к 25–50%, малый 5–10к 18–35%, средний 10к–100к 7–22%, крупный 100к–1М 6–16%, миллионник 3–10%. Нормы выведены из реальной базы каналов. Слишком низко для своего размера — признак мёртвой базы; в разы выше нормы — повод проверить источник охвата.' + rrAnom + '</div>';
        }
        var erHtml = '';
        if (l.engagement_percent != null) {
            var erBits = [];
            if (l.react_count) erBits.push('~' + _num(l.react_count) + ' ' + _plural(l.react_count, 'реакция', 'реакции', 'реакций'));
            if (l.forward_count) erBits.push(_num(l.forward_count) + ' ' + _plural(l.forward_count, 'репост', 'репоста', 'репостов'));
            if (l.comment_count) erBits.push(_num(l.comment_count) + ' ' + _plural(l.comment_count, 'комментарий', 'комментария', 'комментариев'));
            var erSub = erBits.length ? ' <span style="font-size:11px;color:#565b73;">— по ' + erBits.join(', ') + ' на пост</span>' : '';
            if (l.data_source === 'scrape') erSub += ' <span style="font-size:11px;color:#f59e0b;">— только реакции, репосты и комментарии недоступны</span>';
            var _erv = l.engagement_percent;
            var _erStat = _erv >= 3.5 ? 'высокая' : (_erv >= 1 ? 'норма' : 'низкая');
            var _erCol = _erv >= 3.5 ? '#5DCAA5' : (_erv >= 1 ? '#818cf8' : '#f59e0b');
            var _ervTxt = (_erv === 0 && (l.react_count || l.forward_count || l.comment_count)) ? '<0,1' : String(_erv).replace('.', ',');
            erHtml = '<div class="fmr-line" style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">Вовлечённость (ER) <b style="color:' + _erCol + ';">' + _ervTxt + '%</b> <span style="font-size:11px;color:' + _erCol + ';font-weight:600;">' + _erStat + '</span>' + erSub + '<i class="fmr-i ti ti-info-circle push" data-fi="er"></i></div>' +
                '<div class="fmr-info" data-finfo="er">ER (вовлечённость по охвату) = (реакции + репосты + комментарии) ÷ охват — какая доля увидевших пост взаимодействует с ним. Считаем от тех, кто реально увидел пост (от охвата), а не от всех подписчиков — в TGStat эта метрика так и называется ER. Живой сигнал: просмотры накрутить дёшево, взаимодействия — нет. Ориентир: до 1% — низкая, 1–3.5% — норма, выше 3.5% — высокая (у новостных ниже, они живут репостами). Если взаимодействия скрыты — ER не показываем.</div>';
        }
        var facts = rrHtml + erHtml + _spikeLine(l) +
            (_chAge(l.channel_created_ts) ? '<div class="fmr-line" style="color:#9aa0b8;"><i class="ti ti-calendar" style="font-size:12px;color:#818cf8;"></i> На рынке <b style="color:#c2c6d2;">' + _chAge(l.channel_created_ts) + '</b> <span style="font-size:11px;color:#565b73;">— возраст канала</span></div>' : '');
        var ad = '';
        if (pp) {
            ad = '<div class="fmr-sec num"><span class="kn">1</span>Стоимость размещения <i class="fmr-i ti ti-info-circle push" data-fi="ad"></i></div>' +
                '<div class="fmr-line">Пост <b class="fmr-big">от ' + _num(pp) + ' ₽</b></div>' +
                '<div class="fmr-sub"><b>1 час в топе</b> канала, потом <b>сутки в ленте</b> · формат 1/24</div>' +
                (cpm != null ? '<div class="fmr-sub">CPM ≈' + _num(cpm) + ' ₽ за 1000 просмотров</div>' : '') +

                '<div class="fmr-info" data-finfo="ad">Формат 1/24 — стандартное размещение: пост час висит закреплённым сверху канала, потом сутки живёт в общей ленте. Первые цифры — часы: сколько в топе / сколько в ленте. CPM = цена ÷ показы (просмотры поста) × 1000, для сравнения каналов. Цена названа владельцем оффера — точные условия и другие форматы смотри в развороте.</div>';
        }
        var flow = '';
        if (pp && av) {
            flow = '<div class="fmr-sec num"><span class="kn">3</span>Перелив · набрать подписчиков <i class="fmr-i ti ti-info-circle push" data-fi="flow"></i></div>' +
                '<div class="fmr-line" data-flow="1" data-pp="' + pp + '" data-av="' + av + '">Конверсия <input class="fmr-conv" type="number" min="0.1" max="100" step="0.5" value="' + conv + '"> % → <b class="fmr-cps" style="color:#5DCAA5;">≈' + _num(cps) + ' ₽</b> <span style="font-size:11px;color:#565b73;">CPF · цена подписчика</span></div>' +
                '<div class="fmr-sub"><span class="fmr-gained">' + _gainTxt(_grw) + '</span> за <b>≈' + _num(pp) + ' ₽</b> (цена формата 1/24)</div>' +
                '<div class="fmr-warn">Ниже 0.3% — стоимость подписчика непропорционально высока. Для холодного трафика норма 0.3–1.5%, для прогретой аудитории — выше.</div>' +
                '<div class="fmr-info" data-finfo="flow">Конверсия — какая доля увидевших пост подпишется именно к тебе. Впиши свою. Её задают прогрев аудитории, прелендинг (прокладка) и ниша: холодный трафик — единицы процентов, прогретая тёплая аудитория — десятки. Прогноз, не гарантия: точную цену подписчика видно только по итогам размещения.</div>';
        }
        var struct = '';
        (function () {
            var sr = [];
            if (l.spike_ratio != null) {
                var sp = l.spike_ratio, spct = Math.round(sp * 100), st, sc;
                if (spct === 0) { st = 'Просмотры ровные — резких всплесков нет'; sc = '#5DCAA5'; }
                else if (sp < 0.2) { st = 'Отдельные вирусные посты (~' + spct + '%) — обычная органика'; sc = '#818cf8'; }
                else { st = 'Кластер всплесков (~' + spct + '% постов) — возможен закуп просмотров, проверь'; sc = '#f59e0b'; }
                sr.push('<div class="fmr-sub" style="color:' + sc + ';">' + st + '</div>');
            }
            if (l.ad_density != null && l.struct_posts) {
                var apct = Math.round(l.ad_density * 100);
                var acol = l.ad_density >= 0.35 ? '#f59e0b' : (l.ad_density > 0 && l.ad_density < 0.05 ? '#5DCAA5' : '#c2c6d2');
                sr.push('<div class="fmr-sub" style="color:' + acol + ';">' + apct + '% рекламных · ' + l.struct_posts + ' ' + _plural(l.struct_posts, 'пост', 'поста', 'постов') + (l.ad_density >= 0.35 ? ' — лента подвыжжена, охват твоей рекламы ниже' : '') + '</div>');
            }
            if (sr.length) struct = sr.join('');
        })();
        var pills = [];
        if (l.antifraud === 'clean') pills.push('<span class="fmr-pill" style="color:#5DCAA5;"><i class="ti ti-shield-check"></i><span style="color:#c2c6d2;">Фрод-контроль пройден</span></span>');
        if (subs && subs >= 100000) pills.push('<span class="fmr-pill" style="color:#f5bf4f;"><i class="ti ti-crown"></i><span style="color:#c2c6d2;">Крупный канал</span></span>');
        var qualHdr = (facts || struct) ? '<div class="fmr-sec num"><span class="kn">2</span>Качество аудитории</div>' : '';
        return _blk(1, ad) + _blk(2, qualHdr + facts + struct) + _blk(3, flow) +
            (pills.length ? '<div class="fmr-pills">' + pills.join('') + '</div>' : '');
    }
    function _htile(label, val, valCol, sub, subCol, isPrice) {
        return '<div class="fmx-kmt"><div class="l">' + label + '</div>' +
            '<div class="v' + (isPrice ? ' pr' : '') + '"' + (valCol ? ' style="color:' + valCol + ';"' : '') + '>' + val + '</div>' +
            (sub ? '<div class="s"' + (subCol ? ' style="color:' + subCol + ';"' : '') + '>' + sub + '</div>' : '') + '</div>';
    }
    function _heroTiles(l, mode) {
        var subs = l.subscribers, av = _reach(l), cpm = _cpm(l), pp = _basePrice(l);
        var rr = (l.reach_rate != null) ? l.reach_rate : (l.er != null ? l.er : null);
        var rstat = l.reach_status;
        var rrCol = (rstat === 'норма') ? '#5DCAA5' : ((rstat === 'очень низкий' || rstat === 'аномальный') ? '#ef4444' : (rstat ? '#f59e0b' : '#c2c6d2'));
        var erv = l.engagement_percent;
        var erCol = (erv == null) ? '#c2c6d2' : (erv >= 3.5 ? '#5DCAA5' : (erv >= 1 ? '#818cf8' : '#f59e0b'));
        var erStat = (erv == null) ? '' : (erv >= 3.5 ? 'высокая' : (erv >= 1 ? 'норма' : 'низкая'));
        var ervTxt = (erv == null) ? '—' : (((erv === 0 && (l.react_count || l.forward_count || l.comment_count)) ? '<0,1' : String(erv).replace('.', ',')) + '%');
        var isOwner = !!l.owner_price || mode === 'market';
        var g = (l.subs_d30 != null) ? l.subs_d30 : ((l.subs_d7 != null) ? l.subs_d7 : null);
        var gDays = (l.subs_d30 != null) ? 30 : 7;
        var subsSub, subsSubCol = '';
        if (typeof g === 'number' && g !== 0) {
            subsSub = ((Math.abs(g) % 1000 === 0) ? '≈' : '') + (g > 0 ? '+' : '−') + _kmNum(Math.abs(g)) + ' за ' + gDays + ' дн';
            subsSubCol = g > 0 ? '#5DCAA5' : '#f59e0b';
        } else if (typeof g === 'number') { subsSub = 'стабильно'; subsSubCol = '#8990a8'; }
        else subsSub = '';
        var priceLabel, priceVal, priceCol = '#5DCAA5', priceSub;
        if (mode === 'market') {
            priceLabel = 'Цена от, ₽'; priceVal = pp ? _kmNum(pp) : '—'; priceSub = 'формат 1/24';
        } else {
            var plo = (l.price_low != null) ? l.price_low : (l.min_price != null ? l.min_price : null);
            var phi = (l.price_low != null && l.price_high != null && l.price_high > l.price_low) ? l.price_high : null;
            priceLabel = 'Цена, ₽'; priceVal = plo ? (phi ? '≈' + _short(plo) + '–' + _short(phi) : (l.owner_price ? _kmNum(plo) : '≈' + _kmNum(plo))) : '—';
            priceSub = (l.owner_price ? 'цена владельца' : (l.price_negotiable ? 'договорная' : (l.price_floored ? 'минимум ниши' : 'оценка ниши')));
        }
        var tiles =
            _htile('Подписчики', _num(subs), '#e8e8ed', subsSub, subsSubCol) +
            _htile('Охват', av ? '~' + _kmNum(av) : '—', '#e8e8ed',
                (typeof l.ad_reach_24h === 'number' && l.ad_reach_24h > 0) ? 'замер рекламных постов' : 'медиана постов', '') +
            _htile('ERR', rr != null ? rr + '%' : '—', rrCol, rstat || 'уточняется', rstat ? rrCol : '') +
            _htile('ER', ervTxt, erCol, erStat, erStat ? erCol : '') +
            _htile('CPM, ₽', (cpm != null && !l.price_floored) ? _kmNum(cpm) : '—', '#e8e8ed',
                l.price_floored ? 'охват мал' : (isOwner ? 'от цены владельца' : 'ориентир ниши'), '') +
            _htile(priceLabel, priceVal, priceCol, priceSub, '', true);
        return '<div class="fmx-kmh"><span>Ключевые метрики</span><span style="color:' + (l.owner_price || mode === 'market' ? '#5DCAA5' : '#565b73') + ';">' + (l.owner_price || mode === 'market' ? 'цена владельца' : 'оценка') + '</span></div>' +
            '<div class="fmx-kmg">' + tiles + '</div>';
    }
    function fullCard(l) {
        var top = _isTop(l), accent = _accent(l), hc = _healthColor(l);
        var _fxG = l.fx || null;
        var _gold = _fxG ? !!_fxG.gold : top;
        var realTop = l._preview ? !!l._realTop : _gold;
        var glowOn = l._preview ? ((l.effects_json || {}).glowCard === true) : (_gold && (l.effects_json || {}).glowCard !== false);
        var topTag = ((l.effects_json || {}).topTag) || 'on';
        var bItems = badgeItems(l);
        var freeMap = null;
        var flowArr = [], covBdg = '';
        bItems.forEach(function (it) {
            if (freeMap && freeMap[it.k]) covBdg += _freeStyleInject(it.h, freeMap[it.k]);
            else flowArr.push(it.h);
        });
        var _ab = _audChip(l); var bodyBdg = (flowArr.length || _ab) ? '<div class="fmx-badges">' + flowArr.join('') + _ab + '</div>' : '';
        var bodyBdg2 = '';
        var stk = l.sticker_json || l.sticker;
        if (stk && l.effects_json) {
            if (stk.dmode == null && l.effects_json.stickerMode) stk.dmode = l.effects_json.stickerMode;
            if (stk.rot == null && l.effects_json.stickerRot != null) stk.rot = l.effects_json.stickerRot;
        }
        var _fxL = l.fx || null;
        var _canStkAnim = _fxL ? !!_fxL.anim_sticker : top;
        var stkHtml = (stk && stk.url) ? stkOverlay(stk, 350, (_canStkAnim || !!l._preview) && stk.kind !== 'webp', false) : '';
        var star = _bookmarks[l.username] ? ' on' : '';
        var t = l.title || l.username || '?';
        var at = l.emoji_attachments_json || {};
        var _cbRaw = (at.cardbg && typeof at.cardbg === 'object' && at.cardbg.url && (at.cardbg.kind === 'img' || at.cardbg.kind === 'gif' || at.cardbg.kind === 'video')) ? at.cardbg : null;
        var _canAnimBg = _fxL ? !!_fxL.anim_bg : top;
        var cb = (_cbRaw && (_cbRaw.kind === 'img' || _canAnimBg || l._preview)) ? _cbRaw : null;
        var cbgHtml = cb ? '<div class="fmx-cbg">' + (cb.kind === 'video'
            ? '<video src="' + _esc(mediaAbs(cb.url)) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(cb) + '" muted loop playsinline autoplay preload="metadata"></video>'
            : '<img loading="lazy" decoding="async" src="' + _esc(mediaAbs(cb.url)) + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(cb) + '">') + '<i class="fmx-cbg-s"></i></div>' : '';
        var fullBg = !!(cb && (l.effects_json || {}).fullBg);
        var fts = cb ? 'text-shadow:0 1px 3px rgba(0,0,0,0.65);' : '';
        var fmet = cb ? 'background:rgba(10,13,24,0.55);border-radius:10px;padding:9px 11px;border-top:none;margin-top:11px;' : '';
        var covHtml;
        if (l.cover_type && l.cover_type !== 'grad' && l.cover_url) {
            var cpc = (at.cover && typeof at.cover === 'object') ? at.cover : null;
            var cst = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;' + _posStyle(cpc);
            var cu = _esc(mediaAbs(l.cover_url));
            covHtml = '<div class="fmx-cov-bg" style="overflow:hidden;background:#11141f;">' + (l.cover_type === 'video' ? '<video src="' + cu + '" style="' + cst + '" muted playsinline preload="metadata"></video>' : '<img src="' + cu + '" style="' + cst + '">') + '</div>';
        } else covHtml = '<div class="fmx-cov-bg" style="background:' + _coverBg(l) + ';"></div>';
        var avHtml = listingAvatar(l, accent);
        var _canGlass = _fxL ? !!_fxL.glass : top;
        var gk = (_canGlass || l._preview) ? ((l.effects_json || {}).glass || 'none') : 'none';
        if (FX_VIP.glass.indexOf(gk) < 0) gk = 'none';
        var gs = glassKindStyles(gk, accent);
        if (gk === 'none' && (l.effects_json || {}).btns === 'accent') gs = { s: 'background:' + accent + '1f;border:0.5px solid ' + accent + '55;color:' + accent + ';', p: 'background:' + accent + ';color:#fff;' };
        return '<div class="fmx-cwrap"><div class="fmx-card' + (glowOn ? ' fmx-prem' : '') + (fullBg ? ' fmx-fullbg' : '') + '" data-u="' + _esc(l.username) + '">' + cbgHtml + stkHtml + covBdg +
            (fullBg ? '' : '<div class="fmx-cov' + (cb ? ' fmx-cov-sep' : '') + '">' + covHtml + '</div>') +
            (realTop ? (topTag === 'off' ? '' : '<span class="fmx-tag gold"' + (topTag === 'ghost' ? ' style="background:rgba(10,13,24,0.22);color:#f5d78a;border:0.5px solid rgba(245,191,79,0.4);"' : '') + '><i class="ti ti-speakerphone"></i> Продвигается</span>') : '<span class="fmx-tag"><i class="ti ti-circle-check-filled"></i> на продаже</span>') +
            '<button class="fmx-star' + star + '" data-bm="' + _esc(l.username) + '" style="bottom:auto;top:8px;z-index:7;"><i class="ti ti-star"></i></button>' +
            '<div class="fmx-cb"><div class="fmx-crow">' + avHtml +
            '<div style="min-width:0;"><div class="fmx-nm" style="' + fts + fontStyle(l.title_style) + '">' + _esc(t) + '</div><div class="fmx-meta" style="' + fts + '">@' + _esc(l.username) + ' · ' + _num(l.subscribers) + ' подп.</div></div>' +
            (function () {
                if (l.health_score == null) return '';
                var _r0 = 17, _circ = Math.round(2 * Math.PI * _r0 * 100) / 100, _off = Math.round(_circ * (1 - l.health_score / 100) * 100) / 100;
                return '<div class="fmr-score" style="margin-left:auto;">' +
                    '<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="' + _r0 + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="4"/><circle cx="21" cy="21" r="' + _r0 + '" fill="none" stroke="' + hc + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + _circ + '" stroke-dashoffset="' + _off + '" transform="rotate(-90 21 21)"/><text x="21" y="25" text-anchor="middle" font-size="12" font-weight="700" fill="#e8e8ed">' + l.health_score + '</text></svg>' +
                    '<div class="fmr-scorelbl">индекс <i class="fmr-i ti ti-info-circle" data-fi="health"></i></div></div>';
            })() + '</div>' +
            (l.health_score != null ? '<div class="fmr-info" data-finfo="health">Индекс здоровья канала (0–100): насколько канал живой и качественный как площадка — вовлечённость, ERR, стабильность охватов, нет ли накрутки. Считается из тех же метрик, что видны выше, поэтому не противоречит им. Зелёный — хорошо, жёлтый — средне, красный — с осторожностью.</div>' : '') +
            bodyBdg +
            (l.custom_text ? '<div class="fmx-desc" style="' + fts + '">' + _esc(l.custom_text) + '</div>' : '') +
            (l.formats && l.formats.length ? '<div class="fmx-fchips">' + l.formats.slice(0, 4).map(function (ff) { return '<span>' + _esc(ff.label || ff.format) + '</span>'; }).join('') + '</div>' : '') + bodyBdg2 +
            _heroTiles(l, 'market') +
            (cb ? '<div style="background:rgba(10,13,24,0.55);border-radius:10px;padding:2px 11px 9px;margin-top:9px;">' + _fmrBlocksBuy(l) + '</div>' : _fmrBlocksBuy(l)) +
            _ctcLinesHtml(l) +
            _moreBlock(l) +
            '<div class="fmx-acts"><button class="fmx-btn" style="' + gs.s + '" data-act="analyze" data-u="' + _esc(l.username) + '"><i class="ti ti-report-analytics"></i>Разбор</button>' +
            '<button class="fmx-btn" style="' + gs.s + '" data-act="expand" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-arrow-up-right"></i>Развернуть</button>' +
            '<button class="fmx-btn fmx-btn-p" style="' + gs.p + '" data-act="write" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-brand-telegram"></i>Открыть канал</button></div>' +
            (!l.id ? '<div class="fmx-acts" style="margin-top:6px;"><button class="fmx-btn" style="' + gs.s + 'flex:1;color:#5ab0e6;border-color:rgba(90,176,230,0.35);" data-act="track" data-u="' + _esc(l.username) + '"><i class="ti ti-route"></i>Ссылка отслеживания в рекламный пост</button></div>'
                : '<div class="fmx-acts" style="margin-top:6px;"><button class="fmx-btn" style="' + gs.s + 'flex:1;color:#5ab0e6;border-color:rgba(90,176,230,0.35);" data-act="deal" data-lid="' + l.id + '"><i class="ti ti-route"></i>Ссылка отслеживания в рекламный пост</button></div>') +
            '</div></div></div>';
    }
    function _ageTile() {
        return '<div class="fmx-scard fmx-agel" data-agegate="1" style="cursor:pointer;text-align:center;padding:22px 14px;">' +
            '<div style="font-size:24px;line-height:1;color:#f5bf4f;"><i class="ti ti-eye-off"></i></div>' +
            '<div style="font-weight:650;margin-top:7px;">Канал 18+</div>' +
            '<div style="font-size:11.5px;color:#8990a8;margin-top:3px;">Нажми, чтобы подтвердить возраст и открыть</div></div>';
    }
    function _askAge() {
        uiConfirm('В этом разделе есть каналы с контентом 18+. Подтвердите, что вам исполнилось 18 лет.', function () {
            apiPost('/api/v1/marketplace/confirm-age', {}).then(function () {
                _adultOk = true;
                if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
            }).catch(function () { toast('Не удалось. Повтори попытку.'); });
        });
    }
    function _bindAgeGate(scope) {
        qsa(scope || el('fmx-main'), '[data-agegate]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); _askAge(); }); });
    }
    function _ctcUser(c) {
        if (!c) return null;
        c = String(c).trim();
        var m = c.match(/(?:t\.me|telegram\.me)\/([A-Za-z][A-Za-z0-9_]{3,31})/i);
        if (m) return m[1];
        m = c.match(/@([A-Za-z][A-Za-z0-9_]{3,31})\b/);
        if (m) return m[1];
        if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(c)) return c;
        return null;
    }
    function _ctcInfo(c) {
        if (!c) return null;
        c = String(c).trim();
        var u = _ctcUser(c);
        if (u) return { kind: 'tg', label: '@' + u, val: u };
        var em = c.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
        if (em) return { kind: 'mail', label: em[0], val: em[0] };
        var url = c.match(/https?:\/\/\S+/i);
        if (url) return { kind: 'url', label: url[0].replace(/^https?:\/\//i, '').replace(/\/+$/, ''), val: url[0] };
        var dom = c.match(/(?:www\.)?[A-Za-z0-9\-]+\.[A-Za-z]{2,}(?:\/\S*)?/);
        if (dom) return { kind: 'url', label: dom[0].replace(/\/+$/, ''), val: 'https://' + dom[0] };
        return { kind: 'text', label: c, val: null };
    }
    function _openCtc(kind, val) {
        _haptic('light');
        if (kind === 'tg') { openTg(val); return; }
        var url = kind === 'mail' ? 'mailto:' + val : val;
        try { if (typeof tg !== 'undefined' && tg && tg.openLink) { tg.openLink(url); return; } } catch (e) {}
        try { window.open(url, '_blank'); } catch (e) {}
    }
    function _ctcLinesHtml(l) {
        function line(labelTxt, val) {
            var ci = val ? _ctcInfo(val) : null;
            if (!ci) return '';
            var ic = ci.kind === 'tg' ? 'ti-brand-telegram' : ci.kind === 'mail' ? 'ti-mail' : ci.kind === 'url' ? 'ti-link' : 'ti-address-book';
            var body = (ci.kind === 'text')
                ? '<b style="color:#c2c6d2;word-break:break-all;">' + _esc(ci.label) + '</b>'
                : '<b class="fmr-ctc" data-ctc="' + _esc(ci.val) + '" data-ctk="' + ci.kind + '" style="color:#818cf8;cursor:pointer;text-decoration:underline;text-underline-offset:2px;word-break:break-all;">' + _esc(ci.label) + '</b>';
            return '<div style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:#9aa0b8;margin:2px 0 2px;"><i class="ti ' + ic + '" style="font-size:12px;color:#818cf8;flex:0 0 auto;"></i> ' + labelTxt + ': ' + body + '</div>';
        }
        var adc = l.contact_ad, coop = l.contact_coop;
        if (!adc && !coop && l.contact) adc = l.contact;
        return line('Реклама', adc) + line('Сотрудничество', coop);
    }
    function simpleCard(l) {
        if (l.is_adult && !_adultOk) return _ageTile();
        var hc = _healthColor(l);
        var subs = l.subscribers, av = l.avg_views;
        var score = (l.health_score != null) ? l.health_score : null;
        var rr = (l.reach_rate != null) ? l.reach_rate : (l.er != null ? l.er : null);
        var rstat = l.reach_status, rtier = l.reach_tier, rnorm = l.reach_norm;
        var pp = (l.price_low != null) ? l.price_low : (l.min_price != null ? l.min_price : null);
        var est = (l.price_low != null) && !l.owner_price;
        var ph = (est && l.price_high != null && l.price_high > l.price_low) ? l.price_high : null;
        var cpm = _cpm(l);
        var cpmHi = (cpm != null && ph && _reach(l)) ? Math.round(ph / _reach(l) * 1000) : null;
        var conv = 0.5, _grw = av ? av * conv / 100 : 0, gained = Math.round(_grw), cps = (pp && _grw > 0) ? Math.round(pp / _grw) : null;
        var ring = '';
        if (score != null) {
            var rr0 = 17, circ = Math.round(2 * Math.PI * rr0 * 100) / 100, off = Math.round(circ * (1 - score / 100) * 100) / 100;
            ring = '<svg width="42" height="42" viewBox="0 0 42 42"><circle cx="21" cy="21" r="' + rr0 + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="4"/><circle cx="21" cy="21" r="' + rr0 + '" fill="none" stroke="' + hc + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '" transform="rotate(-90 21 21)"/><text x="21" y="25" text-anchor="middle" font-size="12" font-weight="700" fill="#e8e8ed">' + score + '</text></svg>';
        }
        var rrCol = (rstat === 'норма') ? '#5DCAA5' : ((rstat === 'очень низкий' || rstat === 'аномальный') ? '#ef4444' : '#f59e0b');
        var rrHtml = '';
        if (rr != null && rstat) {
            var normTxt = (rnorm && rnorm.length === 2) ? (' <span style="font-size:10px;color:#565b73;">норма для этого размера ' + rnorm[0] + '–' + rnorm[1] + '%</span>') : '';
            var rrWarn = (rstat === 'аномальный') ? (_warnTri(14) + ' ') : '';
            var rrAnom = (rstat === 'аномальный') ? ' Когда охват стабильно выше подписчиков (за 100%) почти на каждом посте без явной причины — цифру стоит перепроверить: обычно это докрученные просмотры (имитация активности под продажу рекламы) либо закуп в непрофильных каналах с ботовым трафиком. Опровергнуть или подтвердить помогает вовлечённость (реакции): заметные реакции при большом охвате — просмотры живые; почти полное их отсутствие — охват докручен, боты реакций не ставят.' : '';
            rrHtml = '<div class="fmr-line" style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' + rrWarn + 'ERR <b style="color:' + rrCol + ';">' + rr + '%</b> <span style="font-size:11px;color:' + rrCol + ';font-weight:600;">' + _esc(rstat) + '</span>' + normTxt + '<i class="fmr-i ti ti-info-circle push" data-fi="rr"></i></div>' +
                '<div class="fmr-info" data-finfo="rr">ERR = охват ÷ подписчики — какой процент подписчиков видит пост. Норму смотрим по размеру канала (у больших она ниже — это нормально): микро до 5к 25–50%, малый 5–10к 18–35%, средний 10к–100к 7–22%, крупный 100к–1М 6–16%, миллионник 3–10%. Нормы выведены из реальной базы каналов. Слишком низко для своего размера — признак мёртвой базы; в разы выше нормы — повод проверить источник охвата.' + rrAnom + '</div>';
        }
        var erHtml = '';
        if (l.engagement_percent != null) {
            var erBits = [];
            if (l.react_count) erBits.push('~' + _num(l.react_count) + ' ' + _plural(l.react_count, 'реакция', 'реакции', 'реакций'));
            if (l.forward_count) erBits.push(_num(l.forward_count) + ' ' + _plural(l.forward_count, 'репост', 'репоста', 'репостов'));
            if (l.comment_count) erBits.push(_num(l.comment_count) + ' ' + _plural(l.comment_count, 'комментарий', 'комментария', 'комментариев'));
            var erSub = erBits.length ? ' <span style="font-size:11px;color:#565b73;">— по ' + erBits.join(', ') + ' на пост</span>' : '';
            if (l.data_source === 'scrape') erSub += ' <span style="font-size:11px;color:#f59e0b;">— только реакции, репосты и комментарии недоступны</span>';
            var _erv = l.engagement_percent;
            var _erStat = _erv >= 3.5 ? 'высокая' : (_erv >= 1 ? 'норма' : 'низкая');
            var _erCol = _erv >= 3.5 ? '#5DCAA5' : (_erv >= 1 ? '#818cf8' : '#f59e0b');
            var _ervTxt = (_erv === 0 && (l.react_count || l.forward_count || l.comment_count)) ? '<0,1' : String(_erv).replace('.', ',');
            erHtml = '<div class="fmr-line" style="margin-top:5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">Вовлечённость (ER) <b style="color:' + _erCol + ';">' + _ervTxt + '%</b> <span style="font-size:11px;color:' + _erCol + ';font-weight:600;">' + _erStat + '</span>' + erSub + '<i class="fmr-i ti ti-info-circle push" data-fi="er"></i></div>' +
                '<div class="fmr-info" data-finfo="er">ER (вовлечённость по охвату) = (реакции + репосты + комментарии) ÷ охват — какая доля увидевших пост взаимодействует с ним. Считаем от тех, кто реально увидел пост (от охвата), а не от всех подписчиков — в TGStat эта метрика так и называется ER. Живой сигнал: просмотры накрутить дёшево, взаимодействия — нет. Ориентир: до 1% — низкая, 1–3.5% — норма, выше 3.5% — высокая (у новостных ниже, они живут репостами). Если взаимодействия скрыты — ER не показываем.</div>';
        }
        var reachEst = (l.reach_preliminary || (l.reach_posts != null && l.reach_posts < 8)) ? '<span style="font-size:10px;color:#565b73;"> · оценка</span>' : '';
        var facts = rrHtml + erHtml + _spikeLine(l) +
            (_chAge(l.channel_created_ts) ? '<div class="fmr-line" style="color:#9aa0b8;"><i class="ti ti-calendar" style="font-size:12px;color:#818cf8;"></i> На рынке <b style="color:#c2c6d2;">' + _chAge(l.channel_created_ts) + '</b> <span style="font-size:11px;color:#565b73;">— возраст канала</span></div>' : '');
        var ad = '';
        if (pp) {
            var priceTag = (est || l.price_negotiable) ? '' : ' <span style="font-size:10px;color:#5DCAA5;background:rgba(93,202,165,.12);border:1px solid rgba(93,202,165,.28);border-radius:6px;padding:1px 6px;white-space:nowrap;">цена владельца</span>';
            ad = '<div class="fmr-sec num"><span class="kn">1</span>Стоимость размещения <span style="font-size:10px;color:#565b73;text-transform:none;letter-spacing:0;font-weight:600;">' + (est ? '· оценка ниши' : '· цена владельца') + '</span> <i class="fmr-i ti ti-info-circle push" data-fi="ad"></i></div>' +
                '<div class="fmr-line">Пост <b class="fmr-big">' + (l.price_negotiable ? 'от ≈' + _num(pp) + ' ₽ · договорная' : (ph ? '≈' + _num(pp) + '–' + _num(ph) + ' ₽' : (est ? 'от ≈' + _num(pp) + ' ₽' : 'от ' + _num(pp) + ' ₽'))) + '</b>' + priceTag + '</div>' +
                (l.owner_price && l.mkt_low ? '<div class="fmr-line" style="margin-top:1px;color:#9aa0b8;">Рыночная оценка <b style="color:#c2c6d2;">≈' + _num(l.mkt_low) + (l.mkt_high ? '–' + _num(l.mkt_high) : '') + ' ₽</b> <span style="font-size:10px;color:#f59e0b;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.28);border-radius:6px;padding:1px 6px;white-space:nowrap;">≈ оценка ниши</span></div>' : '') +
                '<div class="fmr-sub"><b>1 час в топе</b> канала, потом <b>сутки в ленте</b> · формат 1/24</div>' +
                (l.price_floored
                    ? '<div class="fmr-sub" style="color:#f59e0b;">Это минимальный чек ниши, а не расчёт от охвата: при ' + _num(av) + ' просмотрах размещение по нише дешевле не продают. CPM здесь неинформативен.</div>'
                    : (cpm ? '<div class="fmr-sub">CPM ≈' + _num(cpm) + (cpmHi ? '–' + _num(cpmHi) : '') + ' ₽ за 1000 просмотров' + (est ? ' · ориентир ниши' : '') + '</div>' : '') +
                      '') +
                '<div class="fmr-info" data-finfo="ad">Формат 1/24 — стандартное размещение: пост час висит закреплённым сверху канала, потом сутки живёт в общей ленте. Первые цифры — часы: сколько в топе / сколько в ленте. Закреп, кружок, сторис, нативный — отдельные форматы со своими ценами (выбираются в конструкторе оффера и видны в развороте). CPM = цена ÷ показы (просмотры поста) × 1000, для сравнения каналов.' + (est ? ' Цена и CPM здесь — расчётный ориентир по нише, охвату и вовлечённости канала, а не названная владельцем цена. Это ВЕРХНИЙ ориентир: считаем от охвата поста (рекламного за 24 ч, если он известен, иначе среднего). Реальная цена сделки обычно ниже. Точные условия — у владельца.' : ' Эту цену назвал сам владелец канала (перенесено с Площадки) — это его прайс, а не наш расчёт по нише. CPM посчитан от этой реальной цены.') + (l.price_negotiable ? ' В этой нише сделки договорные — открытых прайсов нет, вилка ориентировочная.' : '') + '</div>';
        }
        var flow = '';
        if (pp && av) {
            flow = '<div class="fmr-sec num"><span class="kn">3</span>Перелив · набрать подписчиков <i class="fmr-i ti ti-info-circle push" data-fi="flow"></i></div>' +
                '<div class="fmr-line" data-flow="1" data-pp="' + pp + '" data-av="' + av + '">Конверсия <input class="fmr-conv" type="number" min="0.1" max="100" step="0.5" value="' + conv + '"> % → <b class="fmr-cps" style="color:#5DCAA5;">≈' + _num(cps) + ' ₽</b> <span style="font-size:11px;color:#565b73;">CPF · цена подписчика</span></div>' +
                '<div class="fmr-sub"><span class="fmr-gained">' + _gainTxt(_grw) + '</span> за <b>≈' + _num(pp) + ' ₽</b> (' + (est ? 'нижняя граница цены' : 'минимальная цена') + ')</div>' +
                '<div class="fmr-warn">Ниже 0.3% — стоимость подписчика непропорционально высока. Для холодного трафика норма 0.3–1.5%, для прогретой аудитории — выше.</div>' +
                '<div class="fmr-info" data-finfo="flow">Конверсия — какая доля увидевших пост подпишется именно к тебе. Впиши свою. Её задают прогрев аудитории, прелендинг (прокладка) и ниша: холодный трафик — единицы процентов, прогретая тёплая аудитория — десятки. Прогноз, не гарантия: точную цену подписчика видно только по итогам размещения.</div>';
        }
        var struct = '';
        (function () {
            var sr = [];
            if (l.spike_ratio != null) {
                var sp = l.spike_ratio, spct = Math.round(sp * 100), st, sc;
                if (spct === 0) { st = 'Просмотры ровные — резких всплесков нет'; sc = '#5DCAA5'; }
                else if (sp < 0.2) { st = 'Отдельные вирусные посты (~' + spct + '%) — обычная органика'; sc = '#818cf8'; }
                else { st = 'Кластер всплесков (~' + spct + '% постов) — возможен закуп просмотров, проверь'; sc = '#f59e0b'; }
                sr.push('<div class="fmr-sub" style="color:' + sc + ';">' + st + '</div>');
            }
            if (l.ad_density != null && l.struct_posts) {
                var apct = Math.round(l.ad_density * 100);
                var acol = l.ad_density >= 0.35 ? '#f59e0b' : (l.ad_density > 0 && l.ad_density < 0.05 ? '#5DCAA5' : '#c2c6d2');
                sr.push('<div class="fmr-sub" style="color:' + acol + ';">' + apct + '% рекламных · ' + l.struct_posts + ' ' + _plural(l.struct_posts, 'пост', 'поста', 'постов') + (l.ad_density >= 0.35 ? ' — лента подвыжжена, охват твоей рекламы ниже' : '') + '</div>');
            }
            if (sr.length) struct = sr.join('');
        })();
        var pills = [];
        if (l.antifraud === 'clean') pills.push('<span class="fmr-pill" style="color:#5DCAA5;"><i class="ti ti-shield-check"></i><span style="color:#c2c6d2;">Фрод-контроль пройден</span></span>');
        if (subs && subs >= 100000) pills.push('<span class="fmr-pill" style="color:#f5bf4f;"><i class="ti ti-crown"></i><span style="color:#c2c6d2;">Крупный канал</span></span>');
        var al = _audLabel(l);
        if (al) pills.push('<span class="fmr-pill" style="color:' + al.color + ';"><i class="ti ' + al.icon + '"></i><span style="color:#c2c6d2;">' + al.text + '</span></span>');
        var pillsHtml = pills.length ? '<div class="fmr-pills">' + pills.join('') + '</div>' : '<div style="height:11px;"></div>';
        var _t = l.title || l.username || 'Канал', _acc = _accent(l);
        var avHtml = l.avatar_url
            ? '<div class="fmr-av"><img src="' + _esc(mediaAbs(l.avatar_url)) + '" alt=""></div>'
            : '<div class="fmr-av" style="background:' + _esc(_acc) + ';">' + _esc(_t.charAt(0).toUpperCase()) + '</div>';
        var scoreHtml = ring ? '<div class="fmr-score">' + ring + '<div class="fmr-scorelbl">индекс <i class="fmr-i ti ti-info-circle" data-fi="health"></i></div></div>' : '';
        var _pb = _actBadge(l);
        var headHtml = '<div class="fmr-head">' + avHtml +
            '<div class="fmr-id"><div class="fmr-name">' + _esc(_t) + '</div>' +
            (l.username ? '<div class="fmr-user">@' + _esc(l.username) + '</div>' : '') +
            (_pb ? '<div class="fmr-pulse">' + _pb + '</div>' : '') + '</div>' + scoreHtml + '</div>';
        var nicheHtml = l.niche ? '<div class="fmr-nicherow"><span class="fmr-niche"><i class="ti ti-tag"></i>' + _esc(l.niche) + '</span></div>' : '';
        return '<div class="fmx-scard" data-u="' + _esc(l.username) + '">' +
            headHtml +
            (ring ? '<div class="fmr-info" data-finfo="health">Индекс здоровья канала (0–100): насколько канал живой и качественный как площадка — вовлечённость, ERR, стабильность охватов, нет ли накрутки. Считается из тех же метрик, что видны выше, поэтому не противоречит им. Зелёный — хорошо, жёлтый — средне, красный — с осторожностью.</div>' : '') +
            nicheHtml +
            _heroTiles(l, 'radar') + _blk(1, ad) +
            _blk(2, ((facts || struct) ? '<div class="fmr-sec num"><span class="kn">2</span>Качество аудитории</div>' : '') + facts + struct) +
            _blk(3, flow) + pillsHtml +
            _ctcLinesHtml(l) +
            _moreBlock(l) +
            '<div class="fmx-acts"><button class="fmx-btn" data-act="analyze" data-u="' + _esc(l.username) + '"><i class="ti ti-report-analytics"></i>Разбор</button>' +
            '<button class="fmx-btn fmx-btn-p" style="background:linear-gradient(145deg,#818cf8,#6366f1);color:#0b0c16;" data-act="write" data-u="' + _esc(l.username) + '" data-lid="' + (l.id || '') + '"><i class="ti ti-brand-telegram"></i>Открыть канал</button>' +
            '<button class="fmx-btn' + (_bookmarks[l.username] ? ' on' : '') + '" style="flex:0 0 auto;width:44px;" data-bm="' + _esc(l.username) + '"><i class="ti ti-star"></i></button></div>' +
            '<div class="fmx-acts" style="margin-top:6px;"><button class="fmx-btn" style="flex:1;color:#5ab0e6;border-color:rgba(90,176,230,0.35);" data-act="track" data-u="' + _esc(l.username) + '"><i class="ti ti-route"></i>Ссылка отслеживания в рекламный пост</button></div></div>';
    }
    function _blk(n, html) {
        return html ? '<div class="fmr-blk b' + n + '">' + html + '</div>' : '';
    }
    var _DASH = '<span style="color:#565b73;">—</span>';
    var _COLLECT = ' <span style="color:#565b73;">· <span>данные копятся</span></span>';
    function _audBlock(l) {
        var out = '';
        if (l.geo && _GEO_NAMES[l.geo]) {
            out += '<div class="fmr-agerow"><span>Страна аудитории</span>: <b>' + _esc(_GEO_NAMES[l.geo]) + '</b>' +
                (l.lang_code && l.lang_code !== 'ru' ? ' <span style="color:#565b73;">· язык: ' + _esc(l.lang_code) + '</span>' : '') + '</div>';
        } else {
            out += '<div class="fmr-agerow"><span>Страна аудитории</span>: ' + _DASH + '</div>';
        }
        var female = null, male = null, approx = false;
        if (l.female_pct != null) { female = Math.max(0, Math.min(100, l.female_pct)); male = 100 - female; }
        else if (l.audience === 'female') { female = 70; male = 30; approx = true; }
        else if (l.audience === 'male') { female = 30; male = 70; approx = true; }
        else if (l.audience === 'mixed') { female = 50; male = 50; approx = true; }
        if (male != null) {
            var src = (l.audience_source === 'commenters' && !approx)
                ? ('<span>по комментаторам</span>' + (l.gender_sample ? ' · <span>выборка</span> ' + l.gender_sample : ''))
                : '<span>оценка по нише</span>';
            out += '<div class="fmr-gline"><span class="gl m">М ' + (approx ? '≈' : '') + male + '%</span>' +
                '<div class="fmr-gbar"><div class="gm" style="width:' + male + '%;"></div><div class="gf" style="width:' + female + '%;"></div></div>' +
                '<span class="gl f">Ж ' + (approx ? '≈' : '') + female + '%</span></div>' +
                '<div class="fmr-gsrc">' + src + '</div>';
        } else {
            out += '<div class="fmr-agerow"><span>Пол аудитории</span>: ' + _DASH + _COLLECT + '</div>';
        }
        var gv = function (v) {
            if (v == null) return _DASH;
            var c = v > 0 ? '#5DCAA5' : (v < 0 ? '#ef4444' : '#8990a8');
            var ap = (v !== 0 && v % 1000 === 0) ? '≈' : '';
            return '<span style="color:' + c + ';font-weight:750;font-variant-numeric:tabular-nums;">' + ap + (v > 0 ? '+' : '') + _num(v) + '</span>';
        };
        out += '<div class="fmr-gtab">' +
            '<div class="r"><span class="l">Сегодня</span>' + gv(l.subs_d1) + '</div>' +
            '<div class="r"><span class="l">Неделя</span>' + gv(l.subs_d7) + '</div>' +
            '<div class="r"><span class="l">Месяц</span>' + gv(l.subs_d30) + '</div></div>';
        if (l.channel_created_ts) {
            var months = Math.floor((Date.now() / 1000 - l.channel_created_ts) / 2629800);
            var yrs = Math.floor(months / 12), rm = months % 12;
            var age = yrs > 0 ? (yrs + ' г' + (rm ? ' ' + rm + ' мес' : '')) : (months >= 1 ? (months + ' мес') : 'меньше месяца');
            var d = new Date(l.channel_created_ts * 1000);
            out += '<div class="fmr-agerow"><span>Возраст канала</span>: <b>' + age + '</b> · <span>создан</span> ' +
                ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear() + '</div>';
        } else {
            out += '<div class="fmr-agerow"><span>Возраст канала</span>: ' + _DASH + '</div>';
        }
        var p24ok = false;
        if (l.reach_24h_median && l.subscribers) {
            var p24 = Math.round(l.reach_24h_median / l.subscribers * 1000) / 10;
            if (p24 > 0 && p24 <= 100) {
                p24ok = true;
                out += '<div class="fmr-agerow"><span>Читают за сутки</span>: <b>' + String(p24).replace('.', ',') +
                    '%</b> <span style="color:#565b73;">(' + _num(l.reach_24h_median) + ' из ' + _num(l.subscribers) + ')</span></div>';
            }
        }
        if (!p24ok) {
            out += '<div class="fmr-agerow"><span>Читают за сутки</span>: ' + _DASH + _COLLECT + '</div>';
        }
        out += _reachWinRows(l);
        return '<div class="fmr-sec num"><span class="kn"><i class="ti ti-users" style="font-size:11px;"></i></span>Аудитория и динамика</div>' + out;
    }
    function _reachWinRows(l) {
        var w = [['12 часов', l.reach_12h_median], ['24 часа', l.reach_24h_median], ['48 часов', l.reach_48h_median]];
        var have = w.filter(function (x) { return x[1]; });
        if (!have.length) {
            return '<div class="fmr-agerow" style="margin-top:8px;"><span>Сколько наберёт рекламная публикация</span>: ' + _DASH + _COLLECT + '</div>';
        }
        return '<div class="fmr-agerow" style="margin-top:8px;"><span>Сколько наберёт рекламная публикация</span></div>' +
            '<div class="fmr-gtab">' + w.map(function (x) {
                return '<div class="r"><span class="l">' + x[0] + '</span>' +
                    (x[1] ? '<span style="font-weight:750;font-variant-numeric:tabular-nums;">' + _num(x[1]) + '</span>'
                          : _DASH) + '</div>';
            }).join('') + '</div>';
    }
    function _curveBlock(l) {
        var head = '<div class="fmr-sec num"><span class="kn"><i class="ti ti-chart-histogram" style="font-size:11px;"></i></span>Как набирается охват</div>';
        var c = l && l.view_curve;
        var marks = ['1', '3', '6', '12', '24', '48'];
        var pts = c ? marks.filter(function (m) { return c[m] != null; }) : [];
        if (pts.length < 4) {
            if (l && l.days_since_last_post != null && l.days_since_last_post > 2) {
                return head + '<div class="fmr-gsrc" style="margin-top:0;"><span>Кривая строится по свежим публикациям — появится после новых постов канала</span></div>';
            }
            return head + '<div class="fmr-gsrc" style="margin-top:0;"><span>Данные копятся: замеров пока мало для графика</span></div>';
        }
        var mx = Math.max(100, Math.max.apply(null, pts.map(function (m) { return c[m]; })));
        var bars = marks.map(function (m) {
            if (c[m] == null) {
                return '<div class="fmr-cvcol"><span class="fmr-cvlb">' + m + ' ч</span><span class="fmr-cvvl" style="color:#565b73;">—</span></div>';
            }
            var h = Math.max(4, Math.round(c[m] / mx * 100));
            var col = (m === '48' && c[m] > 130) ? '#ef4444' : '#5ab0e6';
            return '<div class="fmr-cvcol"><div class="fmr-cvbar" style="height:' + h + '%;background:' + col + ';"></div>' +
                '<span class="fmr-cvlb">' + m + ' ч</span><span class="fmr-cvvl">' + Math.round(c[m]) + '%</span></div>';
        }).join('');
        var note = '';
        if (l.curve_flag === 'step') {
            note = '<div class="fmr-cvwarn">Просмотры прибавляются ступенью — так растёт закупленный охват, а не читательский интерес.</div>';
        } else if (l.curve_flag === 'night') {
            note = '<div class="fmr-cvwarn">Просмотры прибавляются преимущественно ночью — так ведёт себя автоматический трафик, а не живая аудитория.</div>';
        } else if (l.curve_flag === 'late') {
            note = '<div class="fmr-cvwarn">Публикации продолжают набирать просмотры спустя сутки после выхода. У живой аудитории охват к этому времени выходит на плато.</div>';
        }
        return head +
            '<div class="fmr-cvwrap">' + bars + '</div>' +
            '<div class="fmr-gsrc"><span>За 100% принят охват за первые сутки</span>' +
            (c.posts ? ' · <span>публикаций</span>: ' + c.posts : '') + '</div>' + note;
    }
    function _subsChart(l) {
        var uname = (l && (l.username || l.channel_username) || '').replace('@', '');
        if (!uname) return '';
        return '<div class="fmr-sec num fmr-sbsec"><span class="kn"><i class="ti ti-chart-bar" style="font-size:11px;"></i></span>Прирост подписчиков</div>' +
            '<div class="fmr-sbwrap" data-u="' + _esc(uname) + '"></div>';
    }
    var _sbCache = {};
    var _sbIO = null, _sbMO = null, _sbPend = false;
    function _sbEnsureObs() {
        if (!_sbIO && typeof IntersectionObserver !== 'undefined') {
            _sbIO = new IntersectionObserver(function (ents) {
                ents.forEach(function (en) {
                    if (en.isIntersecting) { _sbIO.unobserve(en.target); _drawOneSubs(en.target); }
                });
            }, { rootMargin: '300px 0px' });
        }
        if (!_sbMO && typeof MutationObserver !== 'undefined' && document.body) {
            _sbMO = new MutationObserver(function () {
                if (_sbPend) return; _sbPend = true;
                window.requestAnimationFrame(function () { _sbPend = false; _drawSubsChart(); });
            });
            _sbMO.observe(document.body, { childList: true, subtree: true });
        }
    }
    function _drawSubsChart() {
        _sbEnsureObs();
        qsa(document, '.fmr-sbwrap[data-u]').forEach(function (b) {
            if (b.getAttribute('data-done') || b.__sbObs) return;
            if (_sbCache[b.getAttribute('data-u')] !== undefined || !_sbIO) { _drawOneSubs(b); return; }
            b.__sbObs = 1; _sbIO.observe(b);
        });
    }
    if (document.body) { _sbEnsureObs(); } else { document.addEventListener('DOMContentLoaded', _sbEnsureObs); }
    function _drawOneSubs(box) {
        try {
            if (!box || box.getAttribute('data-done')) return;
            box.setAttribute('data-done', '1');
            var uname = box.getAttribute('data-u');
            if (_sbCache[uname] !== undefined) { _sbRenderTrend(box, _sbCache[uname]); return; }
            apiGet('/api/v1/channels/' + encodeURIComponent(uname) + '/subs-trend').then(function (r) {
                if (r && r.ok) _sbCache[uname] = r;
                _sbRenderTrend(box, r);
            }).catch(function () { _sbRenderTrend(box, null); });
        } catch (e) {}
    }
    function _sbRenderTrend(box, r) {
        (function (r) {
            var pts = (r && r.ok && r.points) || [];
            var g = pts.filter(function (p) { return p.g != null || p.j != null || p.l != null; });
            if (g.length < 3) {
                if (pts.length >= 3 && !g.length) {
                    var emsg;
                    if (r.span) {
                        emsg = '<span>За месяц</span>: ≈' + (r.span > 0 ? '+' : '−') + _num(Math.abs(r.span)) +
                            (r.noise ? ' · <span>колебания по дням меньше</span> ±' + _num(r.noise) : '');
                    } else if (r.noise) {
                        emsg = '<span>Колебания за месяц меньше</span> ±' + _num(r.noise);
                    } else {
                        emsg = '<span>За месяц число подписчиков не менялось</span>';
                    }
                    box.innerHTML = '<div class="fmr-gsrc" style="margin-top:0;">' + emsg + '</div>';
                    return;
                }
                box.innerHTML = '<div class="fmr-gsrc" style="margin-top:0;">' +
                    '<span>Данные копятся: замеров пока мало для графика</span></div>';
                return;
            }
            var hasEv = g.some(function (p) { return p.j != null || p.l != null; });
            var mxUp = 0, mxDn = 0;
            g.forEach(function (p) {
                var ev = p.j != null || p.l != null;
                var nn = (!ev && p.n > 1) ? p.n : 1;
                var uv = ev ? (p.j || 0) : (p.g > 0 ? p.g / nn : 0);
                var dv = ev ? (p.l || 0) : (p.g < 0 ? -p.g / nn : 0);
                if (uv > mxUp) mxUp = uv;
                if (dv > mxDn) mxDn = dv;
            });
            var upH = (mxUp || mxDn) ? Math.round(mxUp / (mxUp + mxDn) * 100) : 50;
            if (mxUp && upH < 18) upH = 18;
            if (mxDn && upH > 82) upH = 82;
            var bars = g.slice(-30).map(function (p) {
                var ev = p.j != null || p.l != null;
                var nn = (!ev && p.n > 1) ? p.n : 1;
                var uv = ev ? (p.j || 0) : (p.g > 0 ? p.g / nn : 0);
                var dv = ev ? (p.l || 0) : (p.g < 0 ? -p.g / nn : 0);
                var hu = (uv && mxUp) ? Math.max(4, Math.round(uv / mxUp * 100)) : 0;
                var hd = (dv && mxDn) ? Math.max(4, Math.round(dv / mxDn * 100)) : 0;
                var d = p.d.slice(8) + '.' + p.d.slice(5, 7);
                if (nn > 1) {
                    var t0 = new Date(p.d + 'T00:00:00Z');
                    t0.setUTCDate(t0.getUTCDate() - (nn - 1));
                    d = ('0' + t0.getUTCDate()).slice(-2) + '.' + ('0' + (t0.getUTCMonth() + 1)).slice(-2) + '\u2013' + d;
                }
                var attrs = ev ? (' data-j="' + uv + '" data-l="' + dv + '"') : (' data-g="' + p.g + '"' + (p.a ? ' data-a="1"' : ''));
                return '<div class="fmr-sbcol" data-d="' + d + '"' + attrs + '>' +
                    '<div class="fmr-sbslot" style="height:' + upH + '%;">' + (hu ? '<div class="fmr-sbbar up" style="height:' + hu + '%;"></div>' : '') + '</div>' +
                    '<div class="fmr-sbslot dn" style="height:' + (100 - upH) + '%;">' + (hd ? '<div class="fmr-sbbar dn" style="height:' + hd + '%;"></div>' : '') + '</div>' +
                    '</div>';
            }).join('');
            var tot = r.total;
            var cap = hasEv
                ? '<span>зелёное — подписались, красное — отписались</span>' +
                  (r.joins != null ? ' · <b style="color:#5DCAA5;">+' + _num(r.joins) + '</b> / <b style="color:#ef4444;">−' + _num(r.leaves || 0) + '</b>' : '')
                : '<span>чистый прирост за месяц: подписки минус отписки</span>' +
                  (tot != null ? ' · <span>итог</span>: ' + (r.approx ? '≈ ' : '') + (tot > 0 ? '+' : '') + _num(tot) : '') +
                  (r.best != null && r.best > 0 ? ' · <span>лучший день</span>: ' + (r.approx ? '≈ ' : '') + '+' + _num(r.best) : '') +
                  (r.approx ? ' · <span>мелкие колебания могут не отображаться</span>' : '');
            box.innerHTML = '<div class="fmr-sbchart"><div class="fmr-sbaxis" style="top:' + upH + '%;"></div>' + bars + '</div>' +
                '<div class="fmr-gsrc">' + cap + '</div>';
            _sbTipBind(box);
            window.requestAnimationFrame(function () { try { scaleCards(document); } catch (e) {} });
        })(r);
    }
    function _sbTipBind(box) {
        var chart = box.querySelector('.fmr-sbchart');
        if (!chart) return;
        box.style.position = 'relative';
        var tip = document.createElement('div');
        tip.className = 'fmr-sbtip';
        box.appendChild(tip);
        var cur = null, hideT = null;
        function place(col) {
            var br = box.getBoundingClientRect(), cr = col.getBoundingClientRect();
            var x = cr.left - br.left + cr.width / 2;
            var w = tip.offsetWidth || 60;
            x = Math.max(w / 2 + 2, Math.min(br.width - w / 2 - 2, x));
            tip.style.left = x + 'px';
        }
        function show(col) {
            if (hideT) { clearTimeout(hideT); hideT = null; }
            if (col !== cur) {
                if (cur) cur.classList.remove('act');
                cur = col; col.classList.add('act');
                var j = col.getAttribute('data-j');
                if (j != null) {
                    tip.innerHTML = col.getAttribute('data-d') + ' <b style="color:#5DCAA5;">+' + j + '</b> / <b style="color:#ef4444;">−' + col.getAttribute('data-l') + '</b>';
                } else {
                    var gv = +col.getAttribute('data-g');
                    tip.innerHTML = col.getAttribute('data-d') + ' <b style="color:' + (gv >= 0 ? '#5DCAA5' : '#ef4444') + ';">' + (col.getAttribute('data-a') ? '≈ ' : '') + (gv > 0 ? '+' : '') + _num(gv) + '</b>';
                }
                tip.style.display = 'block';
            }
            place(col);
        }
        function hide() {
            if (cur) cur.classList.remove('act');
            cur = null; tip.style.display = 'none';
        }
        function colAt(e) {
            var t = e.touches && e.touches[0] ? e.touches[0] : e;
            var el2 = document.elementFromPoint(t.clientX, t.clientY);
            return el2 && el2.closest ? el2.closest('.fmr-sbcol') : null;
        }
        function onMove(e) { var c = colAt(e); if (c) show(c); }
        chart.addEventListener('touchstart', onMove, { passive: true });
        chart.addEventListener('touchmove', onMove, { passive: true });
        chart.addEventListener('touchend', function () { hideT = setTimeout(hide, 1200); });
        chart.addEventListener('mousemove', function (e) { var c = colAt(e); if (c) show(c); else hide(); });
        chart.addEventListener('mouseleave', hide);
    }
    function _tpClean(t) {
        t = String(t || '').replace(/\uFE0F/g, '');
        try { t = t.replace(new RegExp('([^\\p{L}\\p{N}\\s])(?:\\s*\\1){2,}', 'gu'), '$1'); } catch (e) {}
        return t.replace(/\s{2,}/g, ' ').trim();
    }
    function _topPostsBlock(l) {
        var tp = l && l.top_posts;
        if (!tp || !tp.length) return '';
        var rows = tp.slice(0, 5).map(function (p, i) {
            var d = p.date ? new Date(p.date) : null;
            var ds = d ? (('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2)) : '';
            var txt = _tpClean(p.text) || 'Публикация без текста';
            var open = p.link ? ' data-toppost="' + _esc(p.link) + '"' : '';
            return '<div class="fmr-tp"' + open + '><span class="n">' + (i + 1) + '</span>' +
                '<span class="t">' + _esc(txt) + '</span>' +
                '<span class="v">' + _kmNum(p.views) + '</span>' +
                '<span class="d"' + (ds ? '' : ' style="color:#3c3f52;"') + '>' + (ds || '—') + '</span></div>';
        }).join('');
        return '<div class="fmr-sec num"><span class="kn"><i class="ti ti-flame" style="font-size:11px;"></i></span>Топ публикаций</div>' +
            rows + '<div class="fmr-gsrc"><span>топ последних публикаций по просмотрам</span> · <span>нажми, чтобы открыть пост</span></div>';
    }
    function _moreBlock(l) {
        var inner = _blk(2, _audBlock(l)) + _blk(2, _subsChart(l)) + _blk(2, _curveBlock(l)) + _blk(2, _topPostsBlock(l));
        if (!inner) return '';
        return '<details class="fmr-more"><summary><i class="ti ti-chart-dots" style="color:#818cf8;"></i> <span>Подробная статистика</span>' +
            '<i class="ti ti-chevron-down chev"></i></summary>' +
            '<div class="fmr-morebody">' + inner + '</div></details>';
    }
    function _spikeLine(l) {
        var sp = l && l.subs_spike;
        if (!sp || sp.pct == null) return '';
        var col = sp.level === 'bad' ? '#ef4444' : (sp.level === 'ok' ? '#5DCAA5' : '#f59e0b');
        var ic = sp.level === 'bad' ? 'ti-alert-triangle' : (sp.level === 'ok' ? 'ti-trending-up' : 'ti-info-circle');
        var when = sp.days <= 1.5 ? 'за сутки' : ('за ' + Math.round(sp.days) + ' дн');
        var head = sp.level === 'ok' ? 'Резкий рост подписчиков' : 'Скачок подписчиков';
        var reach = (sp.reach_pct == null) ? '' :
            ' · <span style="color:#9aa0b8;">охват</span> <b style="color:' + (sp.reach_pct >= 0 ? '#c2c6d2' : '#ef4444') + ';">' +
            (sp.reach_pct >= 0 ? '+' : '−') + Math.abs(Math.round(sp.reach_pct * 10) / 10) + '%</b>';
        return '<div class="fmr-line" style="color:#9aa0b8;"><i class="ti ' + ic + '" style="font-size:12px;color:' + col + ';"></i> ' +
            head + ' <b style="color:' + col + ';">+' + (Math.round(sp.pct * 10) / 10) + '%</b> ' + when + reach + '</div>' +
            '<div class="fmr-sub">' + _esc(sp.hint || '') + '</div>';
    }
    function _liIcons(l) {
        var out = [];
        var _ai = _actInfo(l);
        if (_ai) out.push([_pulseSvg(13, _ai[1]), _ai[1], _ai[2], 1]);
        if (_nicheMatch(l)) out.push(['ti-target-arrow', '#818cf8', 'В твою нишу']);
        var _alx = _audLabel(l);
        if (_alx) out.push([_alx.icon, _alx.color, _alx.text]);
        if (l.antifraud === 'clean') out.push(['ti-shield-check', '#5DCAA5', 'Фрод-контроль пройден']);
        else if (l.antifraud === 'suspect') out.push(['ti-alert-triangle', '#ef4444', 'Требует проверки']);
        if (l.owner_verified) out.push(['ti-user-check', '#5DCAA5', 'Владелец подтверждён']);
        if (l.subscribers && l.subscribers >= 100000) out.push(['ti-crown', '#f5bf4f', 'Крупный канал']);
        var dealN = l.deals_count || 0;
        if (l.show_deals !== false && dealN >= 1) out.push(['ti-heart-handshake', '#f5bf4f', dealN + ' ' + _plural(dealN, 'сделка', 'сделки', 'сделок')]);
        if (l.hot_discount_pct) out.push(['ti-discount-2', '#f5bf4f', 'Горящие даты до −' + l.hot_discount_pct + '%']);
        return out.slice(0, 3).map(function (x) {
            if (x[3]) return '<span title="' + _esc(x[2]) + '" style="display:flex;flex:0 0 auto;">' + x[0] + '</span>';
            return '<i class="ti ' + x[0] + '" title="' + _esc(x[2]) + '" style="color:' + x[1] + ';font-size:11.5px;flex:0 0 auto;"></i>';
        }).join('');
    }
    function _cleanTitle(t) {
        t = String(t || '');
        var i = t.search(/\s[|·—–]\s/);
        return (i >= 8) ? t.slice(0, i).trim() : t;
    }
    function _rrColor(l) {
        var st = l.reach_status;
        if (st === 'норма') return '#5DCAA5';
        if (st === 'аномальный' || st === 'очень низкий') return '#ef4444';
        return st ? '#f59e0b' : '#8990a8';
    }
    function listItem(l, fx, plain) {
        if (l.is_adult && !_adultOk) return _ageTile();
        var hc = _healthColor(l), accent = _accent(l), t = _cleanTitle(l.title || l.username || '?');
        var prem = !plain && (l._preview ? ((l.effects_json || {}).glowCard === true) : (_isTop(l) && (l.effects_json || {}).glowCard !== false));
        var rr = _reachRate(l), rrc = _rrColor(l), warn = (l.reach_status === 'аномальный') ? '⚠ ' : '';
        var mets = '<span class="fmx-lm"><i class="ti ti-users"></i><b>' + _short(l.subscribers) + '</b></span>';
        if (l.avg_views) {
            mets += '<s></s><span class="fmx-lm"><i class="ti ti-eye"></i><b>~' + _short(l.avg_views) + '</b>' +
                (rr != null ? ' <b style="color:' + rrc + ';">(' + warn + rr + '%)</b>' : '') + '</span>';
        } else if (rr != null) {
            mets += '<s></s><span class="fmx-lm"><b style="color:' + rrc + ';">' + warn + rr + '%</b></span>';
        }
        var cpm = _cpm(l), estPrice = !l.owner_price;
        var right = (plain ? '' : '<span class="fmx-lprice">' + _priceFrom(l) + '</span>') +
            (cpm != null ? '<span class="fmx-lcpm">CPM <b>' + (estPrice ? '≈' : '') + _short(cpm) + ' ₽</b></span>' : '');
        return '<div class="fmx-li' + (prem ? ' prem' : '') + '" data-u="' + _esc(l.username) + '"' + (plain ? ' data-b="1"' : '') + '>' +
            '<div class="fmx-lrow">' +
            '<span class="fmx-lav-fx" style="box-shadow:0 0 0 2px ' + hc + ';">' + (fx ? avatarInner(accent) : listingAvatar(l, accent)) + '</span>' +
            '<div class="fmx-lmid"><div class="fmx-lname"><span class="fmx-lt">' + _esc(t) + '</span>' + _liIcons(l) + '</div>' +
            '<div class="fmx-lmet">' + mets + '</div></div>' +
            '<div class="fmx-lright">' + right + '</div>' +
            '<i class="ti ti-chevron-down fmx-lchev"></i></div>' +
            '<div class="fmx-lbox" style="display:none;"></div></div>';
    }
    function bindList(scope) {
        var ro = _ensureRowRO();
        if (ro) ro.disconnect();
        qsa(scope || el('fmx-main'), '.fmx-li').forEach(function (li) {
            var row = li.querySelector('.fmx-lrow'); if (!row) return;
            row.addEventListener('click', function () {
                if (li.__peeked) { li.__peeked = false; return; }
                var box = li.querySelector('.fmx-lbox');
                if (li.classList.contains('on')) {
                    li.classList.remove('on'); box.style.display = 'none'; box.innerHTML = ''; _rescaleRow(li); return;
                }
                var l = findListing(li.getAttribute('data-u')); if (!l) return;
                _haptic('light');
                box.innerHTML = li.getAttribute('data-b') ? simpleCard(l) : fullCard(l);
                box.style.display = 'block'; li.classList.add('on'); bindCards(box); _rescaleRow(li);
                _drawSubsChart();
                window.requestAnimationFrame(_drawSubsChart);
            });
        });
    }
    document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target.closest('[data-terms]') : null;
        if (t) { _haptic('light'); openTermsPassport(t.getAttribute('data-terms')); }
    });
    var _rowRO = null;
    function _ensureRowRO() {
        if (_rowRO || typeof ResizeObserver === 'undefined') return _rowRO;
        _rowRO = new ResizeObserver(function (entries) {
            var jobs = [];
            for (var i = 0; i < entries.length; i++) {
                var li = entries[i].target;
                var w = (li.closest) ? li.closest('.fmx-zw') : null;
                if (!w) continue;
                var ww = w.clientWidth; if (!ww) continue;
                jobs.push({ w: w, px: Math.round(li.offsetHeight * Math.min(1, ww / 350)) });
            }
            for (var j = 0; j < jobs.length; j++) {
                if (jobs[j].w.style.height !== jobs[j].px + 'px') jobs[j].w.style.height = jobs[j].px + 'px';
            }
        });
        return _rowRO;
    }
    function _rescaleRow(li) {
        var w = (li && li.closest) ? li.closest('.fmx-zw') : null;
        if (!w) return;
        var card = w.firstElementChild; if (!card) return;
        card.style.transform = ''; card.style.marginLeft = ''; w.style.height = '';
    }

    function zw(html) { return '<div class="fmx-zw">' + html + '</div>'; }
    function scaleCards(scope) {
        var list = [];
        qsa(scope || document, '.fmx-cwrap,.fmx-zw').forEach(function (w) {
            var card = w.firstElementChild; if (!card) return;
            if (w.classList.contains('fmx-zw')) {
                if (card.classList && card.classList.contains('fmx-li')) {
                    card.style.transform = ''; card.style.marginLeft = ''; w.style.height = '';
                    return;
                }
            }
            var ww = w.clientWidth; if (!ww) return;
            var k = Math.min(1, ww / 350);
            list.push({ w: w, card: card, k: k, off: Math.max(0, (ww - 350 * k) / 2) });
        });
        list.forEach(function (it) {
            it.card.style.transform = it.k < 0.9995 ? 'scale(' + it.k + ')' : '';
            it.card.style.marginLeft = it.off > 0.05 ? it.off.toFixed(2) + 'px' : '';
        });
        list.forEach(function (it) { it.h = it.card.offsetHeight; });
        list.forEach(function (it) { it.w.style.height = Math.round(it.h * it.k) + 'px'; });
    }
    document.addEventListener('click', function (e) {
        var t = e.target; if (!t || !t.closest) return;
        var b = t.closest('[data-phide]');
        if (b) { _pulseHide = true; var d = b.closest('.fmx-pday'); if (d) d.remove(); return; }
        var del = t.closest('#fmx-bmBody [data-del]');
        if (del) {
            e.stopPropagation();
            if (!del.classList.contains('arm')) {
                del.classList.add('arm'); _haptic('light');
                setTimeout(function () { del.classList.remove('arm'); }, 2200);
                return;
            }
            var _u = del.getAttribute('data-del');
            var _row = del.closest('.fmx-bmrow');
            toggleBm(_u);
            if (_bmMap) delete _bmMap[_u];
            if (_row) _row.remove();
            var _box = el('fmx-bmBody');
            if (_box && !_box.querySelector('.fmx-bmrow')) {
                _box.innerHTML = '<div class="fmx-empty"><i class="ti ti-star"></i><h3>Пусто</h3><p>Отмечай ★ на офферах, чтобы сохранить канал.</p></div>';
            }
            return;
        }
        var row = t.closest('#fmx-bmBody .fmx-bmrow');
        if (row && row.classList.contains('frz') && !t.closest('.fmx-lbox')) {
            toast('Оффер в заморозке — владелец приостановил продажу');
        }
    });
    var _rsT = null;
    window.addEventListener('resize', function () {
        clearTimeout(_rsT);
        _rsT = setTimeout(function () { scaleCards(document); }, 120);
    });
    function bindCards(scope) {
        hydrateTgs(scope);
        scaleCards(scope);
        mediaWatch(scope);
        var host = scope || el('fmx-main');
        qsa(host, '[data-bm]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); toggleBm(b.getAttribute('data-bm')); }); });
        qsa(host, '[data-toppost]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var u = b.getAttribute('data-toppost'); if (!u) return; try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) return tg.openTelegramLink(u); } catch (err) {} window.open(u, '_blank'); }); });
        qsa(host, '[data-act="write"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); trackListing(b.getAttribute('data-lid'), 'write'); openTg(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="expand"]').forEach(function (b) { b.addEventListener('click', function () { trackListing(b.getAttribute('data-lid'), 'expand'); openListing(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="analyze"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); openAnalyze(b.getAttribute('data-u')); }); });
        qsa(host, '[data-act="track"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); try { window.__openPlacementsCreate(b.getAttribute('data-u')); } catch (er) {} }); });
        qsa(host, '[data-act="deal"]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); _cardDealMark(+b.getAttribute('data-lid')); }); });
        qsa(host, '[data-ctc]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); _openCtc(b.getAttribute('data-ctk') || 'tg', b.getAttribute('data-ctc')); }); });
        qsa(host, '.fmr-i[data-fi]').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); var card = b.closest('.fmx-scard') || b.closest('.fmx-card'); if (!card) return; var box = card.querySelector('.fmr-info[data-finfo="' + b.getAttribute('data-fi') + '"]'); if (box) box.classList.toggle('on'); }); });
        qsa(host, '.fmr-conv').forEach(function (inp) {
            inp.addEventListener('click', function (e) { e.stopPropagation(); });
            inp.addEventListener('input', function (e) {
                e.stopPropagation();
                var line = inp.closest('[data-flow]'); if (!line) return;
                var pp = +line.getAttribute('data-pp'), av = +line.getAttribute('data-av');
                var c = parseFloat(inp.value); if (isNaN(c) || c <= 0) return; if (c > 100) c = 100;
                var _grw = av * c / 100, gained = Math.round(_grw), cps = Math.round(pp / Math.max(0.01, _grw));
                var card = inp.closest('.fmx-scard') || inp.closest('.fmx-card'); if (!card) return;
                var cpsEl = card.querySelector('.fmr-cps'); if (cpsEl) { cpsEl.textContent = '≈' + _num(cps) + ' ₽'; cpsEl.style.color = c < 0.3 ? '#f59e0b' : '#5DCAA5'; }
                var gEl = card.querySelector('.fmr-gained'); if (gEl) gEl.textContent = _gainTxt(_grw);
                var warn = card.querySelector('.fmr-warn'); if (warn) warn.classList.toggle('on', c < 0.3);
            });
        });
    }
    function bindView() { qsa(el('fmx-main'), '[data-view]').forEach(function (b) { b.addEventListener('click', function () { _view = b.getAttribute('data-view'); if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy(); }); }); }
    function bindSort() {
        qsa(el('fmx-main'), '[data-sort]').forEach(function (b) {
            b.addEventListener('click', function () {
                var v = b.getAttribute('data-sort');
                if (v === 'niche') { openNichePick(); return; }
                _nicheSel = null;
                _sort = v;
                if (_mainTab === 'catalog') renderCatalog(); else if (_subTab === 'buy') renderBuy();
            });
        });
        qsa(el('fmx-main'), '[data-alerts]').forEach(function (b) { b.addEventListener('click', function () { openAlerts(); }); });
    }

    function _nicheBtnHtml() {
        var pickActive = (_sort === 'niche' && _nicheSel);
        var s = String(_nicheSel || '');
        var pickLabel = pickActive ? ('Ниша: ' + _esc(s.length > 14 ? s.slice(0, 13) + '…' : s)) : 'Выбрать нишу';
        return '<button class="fmx-nichebtn' + (pickActive ? ' on' : '') + '" data-sort="niche"><i class="ti ti-list-search"></i><span>' + pickLabel + '</span><i class="ti ti-chevron-right fmx-nichebtn-chev"></i></button>';
    }
    function _bellBtnHtml() {
        return '<button class="fmx-bellbtn" data-alerts="1" title="Умные уведомления"><i class="ti ti-bell"></i></button>';
    }
    function sortBarHtml() {
        return '<div class="fmx-picks">' + _nicheBtnHtml() + _bellBtnHtml() + '</div>' +
            '<div class="fmx-sortbar">' +
            '<button class="fmx-seg' + (_sort === 'all' ? ' on' : '') + '" data-sort="all"><i class="ti ti-layout-grid"></i> Все каналы</button>' +
            '<button class="fmx-seg' + (_sort === 'match' ? ' on' : '') + '" data-sort="match"><i class="ti ti-target-arrow"></i> Под мою нишу</button>' +
            '<button class="fmx-seg' + (_rfCount() ? ' on' : '') + '" id="fmx-rfbtn"><i class="ti ti-adjustments-horizontal"></i> Фильтры' + (_rfCount() ? ' · ' + _rfCount() : '') + '</button>' +
            _regionChipHtml() +
            '</div>';
    }
    function searchHtml(ph) { return '<div class="fmx-search"><i class="ti ti-search"></i><input placeholder="' + ph + '"></div>'; }
    function vtogHtml() {
        return '<div class="fmx-vtog"><button class="fmx-vt' + (_view === 'cards' ? ' on' : '') + '" data-view="cards"><i class="ti ti-layout-grid"></i></button>' +
            '<button class="fmx-vt' + (_view === 'list' ? ' on' : '') + '" data-view="list"><i class="ti ti-list"></i></button></div>';
    }
    function topRowHtml() {
        return '<div class="fmx-divrow"><span class="fmx-divlbl">Каналы, где можно купить рекламу</span><span class="fmx-divline"></span>' + vtogHtml() + '</div>';
    }
    function emptyHtml(icon, title, sub) { return '<div class="fmx-empty"><i class="ti ' + icon + '"></i><h3>' + _esc(title) + '</h3><p>' + _esc(sub) + '</p></div>'; }
    function loadHtml() { return '<div class="fmx-load"><i class="ti ti-loader-2"></i><div style="font-size:12px;margin-top:10px;">Загружаю…</div></div>'; }

    function findListing(u) { var arr = (_feed || []).concat(_catalog || []); for (var i = 0; i < arr.length; i++) if (arr[i].username === u) return arr[i]; return _bmMap && _bmMap[u] ? _bmMap[u] : null; }
    var _trackedWrite = {};
    function trackListing(lid, kind) {
        lid = parseInt(lid, 10); if (!lid) return;
        if (kind === 'write') { if (_trackedWrite[lid]) return; _trackedWrite[lid] = 1; }
        try { apiPost('/api/v1/marketplace/listings/' + lid + '/track', { kind: kind }).catch(function () {}); } catch (e) {}
    }
    var _seenView = {}, _viewObs = null;
    function observeViews(scope) {
        if (typeof IntersectionObserver === 'undefined' || !scope) return;
        if (!_viewObs) {
            _viewObs = new IntersectionObserver(function (ents) {
                ents.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    _viewObs.unobserve(en.target);
                    var lid = en.target.getAttribute('data-lid');
                    if (!lid || _seenView[lid]) return;
                    _seenView[lid] = 1;
                    trackListing(lid, 'view');
                });
            }, { threshold: 0.5 });
        }
        qsa(scope, '[data-act="expand"][data-lid]').forEach(function (b) {
            var lid = b.getAttribute('data-lid');
            if (lid && !_seenView[lid]) _viewObs.observe(b);
        });
    }
    function openListingStats(lid) {
        lid = parseInt(lid, 10); if (!lid) { toast('Сначала сохрани оффер'); return; }
        var old = el('fmx-statsBg'); if (old) old.remove();
        var bg = document.createElement('div'); bg.id = 'fmx-statsBg'; bg.className = 'fmx-cfm solid';
        bg.innerHTML = '<div class="fmx-cfm-box" style="max-width:440px;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;">' +
            '<div style="font-size:15px;font-weight:800;"><i class="ti ti-chart-bar" style="color:#5DCAA5;"></i> Статистика за 7 дней</div>' +
            '<button class="fmx-mclose" id="fmx-stx" style="position:static;"><i class="ti ti-x"></i></button></div>' +
            '<div id="fmx-statsBody"><div class="fmx-empty" style="padding:30px 0;"><i class="ti ti-loader-2" style="animation:fmxSpin 0.9s linear infinite;"></i></div></div></div>';
        document.body.appendChild(bg);
        el('fmx-stx').addEventListener('click', function () { bg.remove(); });
        bg.addEventListener('click', function (e) { if (e.target === bg) bg.remove(); });
        apiGet('/api/v1/marketplace/my/' + lid + '/stats').then(function (r) {
            var body = el('fmx-statsBody'); if (!body) return;
            if (!r || !r.ok) { body.innerHTML = emptyHtml('ti-cloud-off', 'Не удалось загрузить', 'Попробуй ещё раз позже.'); return; }
            var t = r.totals || { expands: 0, writes: 0, views: 0 };
            var maxW = Math.max(1, Math.max.apply(null, (r.series || []).map(function (d) { return Math.max(d.expands, d.writes); })));
            var WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            var _series = r.series || [];
            var bars = _series.map(function (d, i) {
                var he = Math.round(d.expands / maxW * 46), hw = Math.round(d.writes / maxW * 46);
                var dd = new Date(d.day + 'T00:00:00');
                var today = i === _series.length - 1;
                return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0;">' +
                    '<div style="display:flex;align-items:flex-end;gap:2px;height:48px;">' +
                    '<div title="Развороты: ' + d.expands + '" style="width:7px;height:' + Math.max(2, he) + 'px;background:#5DCAA5;border-radius:2px;opacity:' + (d.expands ? 1 : 0.25) + ';"></div>' +
                    '<div title="Написать: ' + d.writes + '" style="width:7px;height:' + Math.max(2, hw) + 'px;background:#818cf8;border-radius:2px;opacity:' + (d.writes ? 1 : 0.25) + ';"></div></div>' +
                    '<div style="font-size:10px;font-weight:' + (today ? '700' : '400') + ';color:' + (today ? '#5DCAA5' : '#8990a8') + ';white-space:nowrap;">' + WD[dd.getDay()] + '</div></div>';
            }).join('');
            body.innerHTML =
                '<div style="display:flex;gap:8px;margin-bottom:16px;">' +
                '<div style="flex:1;background:rgba(245,191,79,0.08);border:1px solid rgba(245,191,79,0.22);border-radius:12px;padding:12px 8px;text-align:center;">' +
                '<div style="font-size:24px;font-weight:800;color:#f5bf4f;">' + (t.views || 0) + '</div><div style="font-size:10.5px;color:#a9aec0;margin-top:2px;">Показы в ленте</div></div>' +
                '<div style="flex:1;background:rgba(93,202,165,0.1);border:1px solid rgba(93,202,165,0.25);border-radius:12px;padding:12px 8px;text-align:center;">' +
                '<div style="font-size:24px;font-weight:800;color:#5DCAA5;">' + t.expands + '</div><div style="font-size:10.5px;color:#a9aec0;margin-top:2px;">Развернули</div></div>' +
                '<div style="flex:1;background:rgba(129,140,248,0.1);border:1px solid rgba(129,140,248,0.25);border-radius:12px;padding:12px 8px;text-align:center;">' +
                '<div style="font-size:24px;font-weight:800;color:#818cf8;">' + t.writes + '</div><div style="font-size:10.5px;color:#a9aec0;margin-top:2px;">Написали</div></div></div>' +
                '<div style="display:flex;align-items:flex-end;gap:3px;padding:6px 2px;">' + bars + '</div>' +
                '<div style="display:flex;gap:14px;justify-content:center;margin-top:10px;font-size:11px;color:#8990a8;">' +
                '<span><span style="display:inline-block;width:8px;height:8px;background:#5DCAA5;border-radius:2px;margin-right:4px;"></span>Развороты</span>' +
                '<span><span style="display:inline-block;width:8px;height:8px;background:#818cf8;border-radius:2px;margin-right:4px;"></span>Написать</span></div>' +
                (t.expands + t.writes === 0 ? '<div style="font-size:12px;color:#8990a8;text-align:center;margin-top:14px;">Пока данных нет. Как только оффер начнут смотреть на Площадке — здесь появятся цифры.</div>' : '');
        }).catch(function () { var b = el('fmx-statsBody'); if (b) b.innerHTML = emptyHtml('ti-cloud-off', 'Ошибка', 'Проверь связь.'); });
    }
    function openTg(u) { _haptic('light'); var url = 'https://t.me/' + u; try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); } }
    var _myPromo = null;
    function shareCard(listingId, username) {
        _haptic('light');
        var doShare = function () {
            var _t = (typeof window !== 'undefined' && window.t) ? window.t : function (s) { return s; };
            var cardLink = 'https://t.me/ForgeMetricsBot?startapp=card_' + listingId;
            var text = _t('Оффер канала на ForgeMetrics: реальные метрики и цена размещения.') + (username ? ' @' + username : '');
            if (_myPromo) text += '\n' + _t('Бонус по приглашению — скидка на первый месяц и расширенный триал:') + ' https://t.me/ForgeMetricsBot?start=' + _myPromo;
            var url = 'https://t.me/share/url?url=' + encodeURIComponent(cardLink) + '&text=' + encodeURIComponent(text);
            try { if (typeof tg !== 'undefined' && tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank'); } catch (e) { window.open(url, '_blank'); }
        };
        if (_myPromo) return doShare();
        apiGet('/api/v1/referral/stats').then(function (r) {
            if (r && r.promo_code) _myPromo = r.promo_code;
            doShare();
        }).catch(doShare);
    }
    function _bmPaint(u, on) {
        qsa(document, '[data-bm="' + u + '"]').forEach(function (s) {
            s.classList.toggle('on', on);
            if (s.style) { s.style.color = ''; s.style.borderColor = ''; }
        });
    }
    function toggleBm(u) {
        if (!u) return; _haptic('light');
        var on;
        function _revert(prev) {
            if (prev) _bookmarks[u] = true; else delete _bookmarks[u];
            updateBmCount();
            _bmPaint(u, prev);
            toast('Не удалось обновить закладку. Повтори попытку.');
        }
        if (_bookmarks[u]) { on = false; delete _bookmarks[u]; apiDelete('/api/v1/marketplace/bookmarks/' + encodeURIComponent(u)).catch(function () { _revert(true); }); }
        else { on = true; _bookmarks[u] = true; apiPost('/api/v1/marketplace/bookmarks', { username: u, source: _mainTab === 'catalog' ? 'base' : 'market' }).catch(function () { _revert(false); }); }
        updateBmCount();
        _bmPaint(u, on);
    }

    function buildModals() {
        var faq = document.createElement('div'); faq.className = 'fmx-mbg'; faq.id = 'fmx-faqBg';
        faq.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-help-circle" style="color:#818cf8;"></i> Справка</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-faqBody"></div></div>';
        document.body.appendChild(faq);
        faq.addEventListener('click', function (e) { if (e.target === faq) hideModal('fmx-faqBg'); });
        faq.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-faqBg'); });
        var promo = document.createElement('div'); promo.className = 'fmx-mbg'; promo.id = 'fmx-promoBg';
        promo.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-rocket" style="color:#f5bf4f;"></i> Продвинуть оффер</h2><p>Поднимает оффер выше в умной сортировке — его видит больше рекламодателей. Топ смешанный: платные и обычные офферы чередуются.</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-promoBody"></div></div>';
        document.body.appendChild(promo);
        promo.addEventListener('click', function (e) { if (e.target === promo) hideModal('fmx-promoBg'); });
        promo.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-promoBg'); });

        var lst = document.createElement('div'); lst.className = 'fmx-mbg'; lst.id = 'fmx-listBg';
        lst.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2 id="fmx-listTitle" style="font-size:15px;"></h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-listBody"></div></div>';
        document.body.appendChild(lst);
        lst.addEventListener('click', function (e) { if (e.target === lst) hideModal('fmx-listBg'); });
        lst.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-listBg'); });

        var cal = document.createElement('div'); cal.className = 'fmx-mbg'; cal.id = 'fmx-calBg';
        cal.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-calendar-check" style="color:#5DCAA5;"></i> Календарь занятости</h2><p id="fmx-calSub"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div id="fmx-calBox"></div></div></div>';
        document.body.appendChild(cal);
        cal.addEventListener('click', function (e) { if (e.target === cal) hideModal('fmx-calBg'); });
        qsa(cal, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-calBg'); }); });

        var cmp = document.createElement('div'); cmp.className = 'fmx-mbg'; cmp.id = 'fmx-cmpBg';
        cmp.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-columns-3" style="color:#5DCAA5;"></i> Сравнение каналов</h2><p>Метрики бок о бок — лучшее в строке подсвечено</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-cmpBody"></div></div>';
        document.body.appendChild(cmp);
        cmp.addEventListener('click', function (e) { if (e.target === cmp) hideModal('fmx-cmpBg'); });
        qsa(cmp, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-cmpBg'); }); });

        var cbar = document.createElement('div'); cbar.className = 'fmx-cmpBar'; cbar.id = 'fmx-cmpBar';
        _root.appendChild(cbar);

        var an = document.createElement('div'); an.className = 'fmx-mbg'; an.id = 'fmx-anBg';
        an.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-report-analytics" style="color:#818cf8;"></i> AI-разбор канала</h2><p id="fmx-anName"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div class="fmx-note fmx-gr"><i class="ti ti-sparkles"></i> Нейросеть изучит канал целиком: реальный охват и его динамику, вовлечённость, признаки накрутки и качество аудитории — и честно скажет, стоит ли покупать здесь рекламу.</div><div class="fmx-empty" style="padding:24px 20px;"><i class="ti ti-hourglass-high"></i><h3>Скоро</h3><p>Глубокий разбор подключается. Пока смотри метрики в «Развернуть» и бейджи здоровья в оффере.</p></div></div></div>';
        document.body.appendChild(an);
        an.addEventListener('click', function (e) { if (e.target === an) hideModal('fmx-anBg'); });
        an.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-anBg'); });

        var rv = document.createElement('div'); rv.className = 'fmx-mbg'; rv.id = 'fmx-revBg';
        rv.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> Отзыв о сделке</h2><p>Виден всем в развороте оффера</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-revBody"></div></div>';
        document.body.appendChild(rv);
        rv.addEventListener('click', function (e) { if (e.target === rv) hideModal('fmx-revBg'); });
        qsa(rv, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-revBg'); }); });

        var ns = document.createElement('div'); ns.className = 'fmx-mbg'; ns.id = 'fmx-nsBg';
        ns.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-bell" style="color:#f59e0b;"></i> Отслеживание ниш</h2><p>CPM ниши и заявки рекламодателей — в бота</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-nsBody"></div></div>';
        document.body.appendChild(ns);
        ns.addEventListener('click', function (e) { if (e.target === ns) hideModal('fmx-nsBg'); });
        qsa(ns, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-nsBg'); }); });

        var rp = document.createElement('div'); rp.className = 'fmx-mbg'; rp.id = 'fmx-repBg';
        rp.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-flag" style="color:#ef4444;"></i> Пожаловаться</h2><p>Разберём вручную, автор жалобу не увидит</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-repBody"></div></div>';
        document.body.appendChild(rp);
        rp.addEventListener('click', function (e) { if (e.target === rp) hideModal('fmx-repBg'); });
        qsa(rp, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-repBg'); }); });

        var rq = document.createElement('div'); rq.className = 'fmx-mbg'; rq.id = 'fmx-reqBg';
        rq.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-speakerphone" style="color:#818cf8;"></i> Заявка на покупку рекламы</h2><p>Владельцы подходящих каналов напишут тебе сами</p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-reqBody"></div></div>';
        document.body.appendChild(rq);
        rq.addEventListener('click', function (e) { if (e.target === rq) hideModal('fmx-reqBg'); });
        qsa(rq, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { hideModal('fmx-reqBg'); }); });

        var cr = document.createElement('div'); cr.className = 'fmx-mbg'; cr.id = 'fmx-cropBg';
        cr.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><div style="flex:1;"><h2><i class="ti ti-crop" style="color:#818cf8;"></i> Кадрирование</h2><p id="fmx-cropHint"></p></div><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody"><div id="fmx-cropBox"></div><div class="fmx-zoomrow"><i class="ti ti-zoom-out" style="color:#8990a8;"></i><input type="range" id="fmx-cropZoom" min="1" max="3" step="0.01" value="1"><i class="ti ti-zoom-in" style="color:#8990a8;"></i></div><div class="fmx-acts" style="margin-top:14px;"><button class="fmx-btn" data-c>Отмена</button><button class="fmx-btn fmx-btn-p" id="fmx-cropOk" style="background:#5DCAA5;color:#04342c;"><i class="ti ti-check"></i>Готово</button></div></div></div>';
        document.body.appendChild(cr);
        cr.addEventListener('click', function (e) { if (e.target === cr) { _cancelCrop(); } });
        qsa(cr, '[data-c]').forEach(function (b) { b.addEventListener('click', function () { _cancelCrop(); }); });
        cr.querySelector('#fmx-cropOk').addEventListener('click', finishCrop);
        cr.querySelector('#fmx-cropZoom').addEventListener('input', function () { if (_crop) { _crop.s = parseFloat(this.value) || 1; cropApply(); } });
        var cbx = cr.querySelector('#fmx-cropBox');
        cbx.addEventListener('pointerdown', function (e) { if (!_crop) return; e.preventDefault(); _crop.drag = { x: e.clientX, y: e.clientY, ox: _crop.x, oy: _crop.y, w: cbx.offsetWidth || 1, h: cbx.offsetHeight || 1 }; try { cbx.setPointerCapture(e.pointerId); } catch (err) {} });
        cbx.addEventListener('pointermove', function (e) { if (!_crop || !_crop.drag) return; var d = _crop.drag; _crop.x = Math.max(0, Math.min(100, d.ox - (e.clientX - d.x) / d.w * 100 / _crop.s)); _crop.y = Math.max(0, Math.min(100, d.oy - (e.clientY - d.y) / d.h * 100 / _crop.s)); cropApply(); });
        cbx.addEventListener('pointerup', function () { if (_crop) _crop.drag = null; });
        cbx.addEventListener('pointercancel', function () { if (_crop) _crop.drag = null; });

        var bm = document.createElement('div'); bm.className = 'fmx-mbg'; bm.id = 'fmx-bmBg';
        bm.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-star" style="color:#f59e0b;"></i> Закладки</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div><div class="fmx-mbody" id="fmx-bmBody"></div></div>';
        document.body.appendChild(bm);
        bm.addEventListener('click', function (e) { if (e.target === bm) hideModal('fmx-bmBg'); });
        bm.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bmBg'); });
    }
    function showModal(id) { var m = el(id); if (m) { document.body.appendChild(m); m.classList.add('fmx-show'); } }
    function hideModal(id) { var m = el(id); if (m) m.classList.remove('fmx-show'); }

    var _OV_SEL = '.fmx-mbg.fmx-show,.fmx-cfm.solid,.pw-sheet-ov.show,#fmx-listBg.fmx-show,.bs-overlay.visible';
    var _OV_FULL = '.fmx-psFull';
    var _frozenVids = [];
    function _fmVisMatch(sel) {
        var nodes = document.querySelectorAll(sel);
        for (var i = 0; i < nodes.length; i++) {
            try {
                var cs = getComputedStyle(nodes[i]);
                if (cs.display !== 'none' && cs.visibility !== 'hidden' && nodes[i].getBoundingClientRect().width > 0) return true;
            } catch (e) { return true; }
        }
        return false;
    }
    function _fmSyncFreeze() {
        var anyOv = _fmVisMatch(_OV_SEL) || _fmVisMatch(_OV_FULL);
        var anyFull = _fmVisMatch(_OV_FULL);
        var b = document.body, was = b.classList.contains('fmx-bgfreeze');
        b.classList.toggle('fmx-bgfreeze', anyOv);
        b.classList.toggle('fmx-bgfull', anyFull);
        document.documentElement.classList.toggle('fmx-bgfreeze', anyOv);
        if (anyOv && !was) {
            _frozenVids = [];
            qsa(document, 'video').forEach(function (v) {
                if (!v.paused && !v.closest(_OV_SEL) && !v.closest(_OV_FULL)) { _frozenVids.push(v); try { v.pause(); } catch (e) { } }
            });
            _frozenLots = [];
            (typeof _lotAnims !== 'undefined' ? _lotAnims : []).forEach(function (a) {
                try {
                    if (a.el && a.el.isConnected && !a.el.closest(_OV_SEL) && !a.el.closest(_OV_FULL) && a.anim && !a.anim.isPaused) {
                        a.anim.pause(); _frozenLots.push(a);
                    }
                } catch (e) { }
            });
        } else if (!anyOv && was) {
            _frozenVids.forEach(function (v) { try { if (v._fmVis !== false) v.play(); } catch (e) { } });
            _frozenVids = [];
            _frozenLots.forEach(function (a) { try { if (a.el && a.el._fmVis !== false) a.anim.play(); } catch (e) { } });
            _frozenLots = [];
        }
    }
    var _frozenLots = [];

    var _mediaIO = null;
    function _mediaApply(el) {
        var frozen = document.body.classList.contains('fmx-bgfreeze');
        var inOv = !!(el.closest && (el.closest(_OV_SEL) || el.closest(_OV_FULL)));
        var want = el._fmVis !== false && (!frozen || inOv);
        if (el.tagName === 'VIDEO') { try { if (want) { el.play(); } else { el.pause(); } } catch (e) { } return; }
        var rec = null;
        (typeof _lotAnims !== 'undefined' ? _lotAnims : []).some(function (a) { if (a.el === el) { rec = a; return true; } return false; });
        if (rec && rec.anim) {
            try { if (want && el.getAttribute('data-anim') === '1') { rec.anim.play(); } else { rec.anim.pause(); } } catch (e) { }
        }
    }
    function mediaWatch(scope) {
        if (typeof IntersectionObserver === 'undefined') return;
        if (!_mediaIO) _mediaIO = new IntersectionObserver(function (ents) {
            ents.forEach(function (en) { en.target._fmVis = en.isIntersecting; _mediaApply(en.target); });
        }, { rootMargin: '120% 0px' });
        qsa(scope || document, 'video, .fmx-stk-lot[data-anim="1"]').forEach(function (n) { _mediaIO.observe(n); });
    }
    if (!window.__fmFreezeObs) {
        try {
            window.__fmFreezeObs = new MutationObserver(function () {
                if (window.__fmFreezeRaf) return;
                window.__fmFreezeRaf = requestAnimationFrame(function () { window.__fmFreezeRaf = null; _fmSyncFreeze(); });
            });
            window.__fmFreezeObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        } catch (e) { }
    }

    function _pulseHint(id, key) {
        var b = el(id); if (!b) return;
        try { if (localStorage.getItem(key)) return; } catch (e) {}
        b.classList.add('fmx-pulse');
        b.addEventListener('click', function () {
            b.classList.remove('fmx-pulse');
            try { localStorage.setItem(key, '1'); } catch (e) {}
        });
    }

    function openBadgeGuide() {
        var old = el('fmx-bgdBg'); if (old) old.remove();
        var card = function (badge, title, desc) {
            var bt = String(badge).replace(/<[^>]*>/g, '').trim();
            var head = (title && title.trim() !== bt) ? '<div class="fmx-bgd-title">' + title + '</div>' : '';
            return '<div class="fmx-bgd-card">' +
                '<div class="fmx-bgd-badge">' + badge + '</div>' +
                '<div class="fmx-bgd-txt">' + head +
                '<div class="fmx-bgd-desc">' + desc + '</div></div></div>';
        };
        var pulseRow = function (state, name, text) {
            var a = _ACT[state];
            return '<div class="fmx-tlrow"><div class="fmx-bgd-badge">' +
                '<span class="fmx-bdg fmx-bp ' + a[0] + '">' + _PULSE_SVG + name + '</span></div>' +
                '<div class="fmx-tldesc">' + text + '</div></div>';
        };
        var tlRow = function (state, name, hex, text) {
            return '<div class="fmx-tlrow"><div class="fmx-tlcell">' + trafficLight({ health_class: state }) + '</div>' +
                '<div class="fmx-tldesc"><b style="color:' + hex + ';">' + name + '</b> — ' + text + '</div></div>';
        };
        var healthCard = '<div class="fmx-bgd-card fmx-bgd-health">' +
            '<div class="fmx-bgd-title">Здоровье канала · светофор</div>' +
            '<div class="fmx-bgd-desc">Сводная оценка канала как площадки: охват относительно подписчиков с поправкой на размер, вовлечённость, ровность просмотров по постам, тренд и рекламная нагрузка.</div>' +
            tlRow('green', 'Зелёный', '#5DCAA5', 'метрики в норме для своего размера, следов накрутки проверки не нашли.') +
            tlRow('amber', 'Жёлтый', '#f59e0b', 'что-то ниже нормы для своего размера или данных не хватило для уверенного вывода.') +
            tlRow('red', 'Красный', '#ef4444', 'охват сильно ниже нормы для такого размера либо просмотры ведут себя аномально — проверь вручную.') +
            '<div class="fmx-bgd-desc" style="margin-top:9px;">Жёлтый и красный — не приговор: открой «Развернуть» и проверь охват, ER и динамику вручную.</div>' +
            '</div>';
        var body =
            healthCard +
            card('<span class="fmx-bdg fmx-b-owner"><i class="ti ti-user-check"></i>Владелец</span>', 'Владелец подтверждён',
                'Наш бот — администратор этого канала: продавец действительно управляет размещением и может опубликовать твою рекламу. Это техническая проверка доступа, а не самоназвание — без бейджа доступ не подтверждён.') +
            card('<span class="fmx-bdg fmx-b-nofraud"><i class="ti ti-shield-check"></i>Фрод-контроль пройден</span>', 'Фрод-контроль пройден',
                'Наш фрод-контроль отработал и ничего не нашёл: охват в норме относительно подписчиков, просмотры по постам не прыгают, резкого наплыва подписчиков во времени нет. Выдаётся только когда проверки реально выполнены — не меньше 8 зрелых постов в выборке и есть данные о реакциях. Если данных мало, бейджа нет вовсе: это отсутствие вердикта, а не подтверждение чистоты. Полностью исключить накрутку по публичным данным невозможно.') +
            '<div class="fmx-bgd-card fmx-bgd-health">' +
            '<div class="fmx-bgd-title">Пульс канала · как часто выходят посты</div>' +
            '<div class="fmx-bgd-desc">Считается по датам публикаций: когда был последний пост и сколько постов в неделю выходит в среднем.</div>' +
            pulseRow('high', 'Активный', 'публикует ежедневно — от 7 постов в неделю, последний не старше недели.') +
            pulseRow('mid', 'Регулярный', 'от 3 до 7 постов в неделю — несколько раз в неделю, без больших пауз.') +
            pulseRow('rare', 'Редкие посты', 'от 1 до 3 постов в неделю либо пауза дольше недели.') +
            pulseRow('low', 'Единичные посты', 'публикует реже раза в неделю либо пауза дольше двух недель. Канал живой, но выходит редко.') +
            pulseRow('none', 'Не публикует', 'новых публикаций больше месяца — размещение здесь охвата не даст.') +
            '<div class="fmx-bgd-desc" style="margin-top:9px;">Редкие посты — не приговор: у нишевых и авторских каналов такой ритм нормален. Но размещение в молчащем канале охвата почти не даст.</div>' +
            '</div>' +
            card('<span class="fmx-bdg fmx-b-big"><i class="ti ti-crown"></i>Крупный</span>', 'Крупный',
                'В канале от 100 000 подписчиков. Большой охват за размещение — подходит для масштабных запусков и широких проливов.') +
            card('<span class="fmx-bdg fmx-b-match"><i class="ti ti-target-arrow"></i>В нише</span>', 'В нише',
                'Ниша канала совпадает с нишей твоего канала. Аудитории близки — реклама попадёт точнее, конверсия выше. Показывается только тебе, под твой канал.') +
            card('<span class="fmx-bdg fmx-b-deal"><i class="ti ti-heart-handshake"></i>★ 4,8 · 3 сделки</span>', 'Сделки и рейтинг',
                'Число подтверждённых сделок через Площадку и средний рейтинг от рекламодателей. Обе стороны подтверждают сделку вручную — цифры не накручиваются. Прямой показатель репутации канала.') +
            card('<span class="fmx-aud" style="color:#5b9dff;border:0.5px solid #5b9dff55;background:#5b9dff1a;border-radius:99px;padding:3px 9px;font-size:10px;font-weight:700;"><i class="ti ti-gender-male"></i> Мужская</span>', 'Аудитория: мужская',
                'Больше половины читателей канала — мужчины. Подходит под офферы с мужской целевой аудиторией: трейдинг, авто, спорт, техника, беттинг.') +
            card('<span class="fmx-aud" style="color:#ff6fae;border:0.5px solid #ff6fae55;background:#ff6fae1a;border-radius:99px;padding:3px 9px;font-size:10px;font-weight:700;"><i class="ti ti-gender-female"></i> Женская</span>', 'Аудитория: женская',
                'Больше половины читателей — женщины. Подходит под офферы с женской целевой аудиторией: красота, мода, дети, дом, маркетплейсы.') +
            card('<span class="fmx-aud" style="color:#9aa0b5;border:0.5px solid #9aa0b555;background:#9aa0b51a;border-radius:99px;padding:3px 9px;font-size:10px;font-weight:700;"><i class="ti ti-users-group"></i> Смешанная</span>', 'Аудитория: смешанная',
                'Заметной перекоса по полу нет — канал читают и мужчины, и женщины. Универсальный вариант под широкие офферы: финансы, новости, развлечения.');
        var bg = document.createElement('div'); bg.className = 'fmx-mbg'; bg.id = 'fmx-bgdBg';
        bg.innerHTML = '<div class="fmx-modal"><div class="fmx-mhead"><h2><i class="ti ti-rosette-discount-check" style="color:#818cf8;"></i> Что значат бейджи</h2><button class="fmx-mclose" data-c><i class="ti ti-x"></i></button></div>' +
            '<div class="fmx-mbody"><div style="font-size:12px;color:#8990a8;margin-bottom:6px;">Бейджи в оффере помогают быстро оценить канал ещё до разворота.</div>' + body + '</div></div>';
        document.body.appendChild(bg);
        bg.addEventListener('click', function (e) { if (e.target === bg) hideModal('fmx-bgdBg'); });
        bg.querySelector('[data-c]').addEventListener('click', function () { hideModal('fmx-bgdBg'); });
        showModal('fmx-bgdBg');
    }

    function openFaq() {
        var body;
        if (_faqTab === 'terms') body = TERMS.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else if (_faqTab === 'rules') body = '<div class="fmx-note" style="margin-bottom:6px;"><i class="ti ti-scale"></i> Единые правила Площадки. За контент отвечает разместивший; дополнительно действуют законы страны, на аудиторию которой направлена реклама.</div>' + RULES.map(function (t) { return '<div class="fmx-term"><h4>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        else body = '<div class="fmx-note" style="margin-bottom:6px;"><i class="ti ti-bulb"></i> Практический разбор для обеих сторон: как закупать рекламу и как продавать размещения в своём канале.</div>' + TIPS.map(function (t) { return '<div class="fmx-term"><h4><i class="ti ti-circle-check" style="color:#5DCAA5;margin-right:5px;"></i>' + _esc(t[0]) + '</h4><p>' + _esc(t[1]) + '</p></div>'; }).join('');
        el('fmx-faqBody').innerHTML = '<div class="fmx-ftabs"><button class="fmx-ftab' + (_faqTab === 'rules' ? ' on' : '') + '" data-t="rules">Правила</button><button class="fmx-ftab' + (_faqTab === 'terms' ? ' on' : '') + '" data-t="terms">Метрики</button><button class="fmx-ftab' + (_faqTab === 'tips' ? ' on' : '') + '" data-t="tips">Советы</button></div>' + body;
        qsa(el('fmx-faqBody'), '[data-t]').forEach(function (b) { b.addEventListener('click', function () { _faqTab = b.getAttribute('data-t'); openFaq(); }); });
        showModal('fmx-faqBg');
    }
    var _PROMO_DESC = {
        burst24: 'Кратковременный подъём оффера в платной полосе ленты на сутки. Открывает стиль «Свечение» на время продвижения.',
        burst48: 'Подъём в платной полосе на двое суток. Открывает стиль «Свечение» на время продвижения.',
        week: 'Присутствие оффера в платной полосе на 7 дней. Открывает «Свечение», «Стекло» и анимированные стикеры.',
        month: 'Присутствие 30 дней — выгоднее за день, чем недельное. Эксклюзив: золотое свечение и тег «Продвигается» — их не даёт ни один тариф.',
        pack5: '5 недельных размещений со скидкой за объём. Каждая активная неделя открывает стили уровня «Неделя».',
        pack15: '15 недельных размещений со скидкой за объём. Каждая активная неделя открывает стили уровня «Неделя».'
    };
    function openPromo() {
        var body = el('fmx-promoBody');
        body.innerHTML = '<div style="text-align:center;color:var(--fmx-dim,#8d92a8);padding:28px 0;">Загрузка…</div>';
        showModal('fmx-promoBg');
        apiGet('/api/v1/marketplace/promo-options').then(function (r) {
            if (!r || !r.ok) { body.innerHTML = '<div style="text-align:center;color:var(--fmx-dim,#8d92a8);padding:28px 0;">Не удалось загрузить.</div>'; return; }
            var opts = r.options || [], disc = r.discount_pct || 0, html = '';
            if (disc > 0) html += '<div class="fmx-limit" style="border-color:rgba(52,211,153,.4);color:#34d399;"><i class="ti ti-discount-2"></i> Скидка твоего тарифа на всё продвижение: −' + disc + '%</div>';
            opts.forEach(function (o) {
                var ic = o.kind === 'credits' ? 'ti-package' : (o.in_burst_cap ? 'ti-bolt' : 'ti-rocket');
                var pr = '<b>' + _num(o.price) + ' ₽</b>';
                if (o.base_price && o.base_price > o.price) pr = '<span style="text-decoration:line-through;opacity:.45;font-weight:600;margin-right:6px;">' + _num(o.base_price) + '</span>' + pr;
                html += '<div class="fmx-po"><div class="fmx-po-top"><div class="fmx-po-nm"><i class="ti ' + ic + '" style="color:#818cf8;"></i> ' + _esc(o.label) + '</div><div class="fmx-po-pr">' + pr + '</div></div>' +
                    '<div class="fmx-po-li"><i class="ti ti-arrow-up"></i> ' + _esc(_PROMO_DESC[o.product] || '') + '</div>' +
                    '<button class="fmx-po-buy" data-buy="' + _esc(o.product) + '">Выбрать</button></div>';
            });
            html += '<div class="fmx-limit"><i class="ti ti-info-circle"></i> Всплески 24 и 48 ч вместе — не больше ' + (r.burst_cap || 3) + ' раз в месяц. Платные офферы занимают не более 20% ленты — органику не топит.</div>';
            body.innerHTML = html;
            qsa(body, '[data-buy]').forEach(function (b) { b.addEventListener('click', function () { _haptic('light'); uiAlert('Оплата продвижения — подключим при запуске (ЮKassa).'); }); });
        }).catch(function () { body.innerHTML = '<div style="text-align:center;color:var(--fmx-dim,#8d92a8);padding:28px 0;">Не удалось загрузить.</div>'; });
    }
    function openAnalyze(u) {
        _haptic('light');
        var nm = el('fmx-anName'); if (nm) nm.textContent = '@' + u;
        showModal('fmx-anBg');
    }
    function _gainTxt(g) {
        if (!(g > 0)) return 'подписчиков не будет';
        if (g < 1) return 'меньше одного подписчика';
        var v = Math.round(g);
        return 'получишь ≈' + _num(v) + ' ' + _plural(v, 'подписчик', 'подписчика', 'подписчиков');
    }
    function _chAge(ts) { if (!ts) return null; var mo = Math.floor((Date.now() / 1000 - ts) / 2629800); if (mo < 2) return null; if (mo < 12) return mo + ' ' + _plural(mo, 'месяц', 'месяца', 'месяцев'); var y = Math.floor(mo / 12), r = mo % 12; return y + ' ' + _plural(y, 'год', 'года', 'лет') + (r >= 1 ? ' ' + r + ' мес' : ''); }
    function _reachStructBlock(l) {
        var sp = l.spike_ratio, ad = l.ad_density, rows = [];
        if (sp != null) {
            var pct = Math.round(sp * 100), t, c, ic;
            if (pct === 0) { t = 'Просмотры ровные — резких всплесков нет'; c = '#5DCAA5'; ic = 'ti-wave-sine'; }
            else if (sp < 0.2) { t = 'Отдельные вирусные посты (~' + pct + '%) — обычная органика'; c = '#818cf8'; ic = 'ti-chart-line'; }
            else { t = 'Кластер всплесков (~' + pct + '% постов) — возможен закуп просмотров, проверь'; c = '#f59e0b'; ic = 'ti-alert-triangle'; }
            rows.push('<div class="fmx-tline" style="color:' + c + ';"><i class="ti ' + ic + '"></i>' + t + '</div>');
        }
        if (ad != null && l.struct_posts) {
            var apct = Math.round(ad * 100);
            rows.push('<div class="fmx-tline" style="color:' + (ad >= 0.35 ? '#f59e0b' : (ad < 0.05 ? '#5DCAA5' : '#c2c6d2')) + ';"><i class="ti ti-ad"></i>' + apct + '% рекламных · ' + l.struct_posts + ' ' + _plural(l.struct_posts, 'пост', 'поста', 'постов') + (ad >= 0.35 ? ' — лента подвыжжена, охват твоей рекламы ниже' : '') + '</div>');
        }
        if (!rows.length) return '';
        return '<div class="fmx-lssect">Структура охвата</div><div class="fmx-terms">' + rows.join('') + '</div>';
    }
    function _flowBlock(l) {
        var pp = _basePrice(l), av = l.avg_views;
        if (!pp || !av) return '';
        var conv = 0.5, _grw = av * conv / 100, gained = Math.round(_grw), cps = Math.round(pp / Math.max(0.01, _grw));
        return '<div class="fmx-lssect">Перелив · набрать подписчиков</div>' +
            '<div class="fmx-terms" id="fmx-flowBox">' +
            '<div class="fmr-line" data-flow="1" data-pp="' + pp + '" data-av="' + av + '" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">Конверсия <input class="fmr-conv" type="number" min="0.1" max="100" step="0.5" value="0.5"> % → <b class="fmr-cps" style="color:#5DCAA5;">≈' + _num(cps) + ' ₽</b> <span style="font-size:11px;color:#565b73;">CPF · цена подписчика</span></div>' +
            '<div class="fmr-sub"><span class="fmr-gained">' + _gainTxt(_grw) + '</span> за <b>≈' + _num(pp) + ' ₽</b> (цена формата 1/24)</div>' +
            '<div class="fmr-warn">Ниже 0.3% — стоимость подписчика непропорционально высока. Для холодного трафика норма 0.3–1.5%, для прогретой аудитории — выше.</div>' +
            '</div>';
    }
    function _pwMetrics(l) {
        var cpm = _cpm(l);
        var ad = (typeof l.ad_reach_24h === 'number' && l.ad_reach_24h > 0) ? l.ad_reach_24h : null;
        function cell(label, val, dim) {
            return '<div class="pw-mcell' + (dim ? ' fmx-mdim' : '') + '"><div class="pw-ml">' + label + '</div>' +
                '<div class="pw-mv num">' + val + '</div></div>';
        }
        var _al = _audLabel(l), audTx = _al ? _al.text : null;
        var _ring = '';
        if (l.health_score != null) {
            var _hcol = l.health_class === 'green' ? '#5DCAA5' : (l.health_class === 'red' ? '#ef4444' : '#f59e0b');
            var _r0 = 17, _circ = Math.round(2 * Math.PI * _r0 * 100) / 100, _off = Math.round(_circ * (1 - l.health_score / 100) * 100) / 100;
            _ring = '<svg width="42" height="42" viewBox="0 0 42 42" style="flex:0 0 auto;"><circle cx="21" cy="21" r="' + _r0 + '" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="4"/><circle cx="21" cy="21" r="' + _r0 + '" fill="none" stroke="' + _hcol + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + _circ + '" stroke-dashoffset="' + _off + '" transform="rotate(-90 21 21)"/><text x="21" y="25" text-anchor="middle" font-size="12" font-weight="700" fill="#e8e8ed">' + l.health_score + '</text></svg>';
        }
        var _xtra = '';
        if (l.er != null && l.reach_status) {
            var _rc = (l.reach_status === 'норма') ? '#5DCAA5' : ((l.reach_status === 'очень низкий' || l.reach_status === 'аномальный') ? '#ef4444' : '#f59e0b');
            var _nrm = (l.reach_norm && l.reach_norm.length === 2) ? ' <span style="color:#565b73;">· норма для ' + _esc(l.reach_tier || '') + ' ' + l.reach_norm[0] + '–' + l.reach_norm[1] + '%</span>' : '';
            _xtra += '<div style="font-size:11px;color:#9aa0b8;margin-top:6px;">ERR — <b style="color:' + _rc + ';">' + _esc(l.reach_status) + '</b>' + _nrm + '</div>';
        }
        if (l.engagement_percent != null) {
            var _eb = [];
            if (l.react_count) _eb.push('~' + _num(l.react_count) + ' ' + _plural(l.react_count, 'реакция', 'реакции', 'реакций'));
            if (l.forward_count) _eb.push(_num(l.forward_count) + ' ' + _plural(l.forward_count, 'репост', 'репоста', 'репостов'));
            if (l.comment_count) _eb.push(_num(l.comment_count) + ' ' + _plural(l.comment_count, 'комментарий', 'комментария', 'комментариев'));
            var _ev = l.engagement_percent;
            var _es = _ev >= 3.5 ? 'высокая' : (_ev >= 1 ? 'норма' : 'низкая');
            var _ec = _ev >= 3.5 ? '#5DCAA5' : (_ev >= 1 ? '#818cf8' : '#f59e0b');
            _xtra += '<div style="font-size:11px;color:#9aa0b8;margin-top:4px;">ER — <b style="color:' + _ec + ';">' + _es + '</b>' + (_eb.length ? ' <span style="color:#565b73;">— по ' + _eb.join(', ') + ' на пост</span>' : '') + '</div>';
        }
        if (l.niche_median_cpm && (ad || l.avg_views)) {
            var _mrv = ad || l.avg_views;
            var _mlo = Math.max(50, Math.round(l.niche_median_cpm * 0.85 * _mrv / 1000 / 50) * 50);
            var _mhi = Math.max(_mlo, Math.round(l.niche_median_cpm * 1.15 * _mrv / 1000 / 50) * 50);
            var _md = l.niche_delta_pct, _mv, _mc;
            if (_md == null || Math.abs(_md) <= 15) { _mv = '<span>в рынке</span>'; _mc = '#5DCAA5'; }
            else if (_md > 0) { _mv = '<span>выше рынка на</span> <span class="num">' + Math.round(_md) + '%</span>'; _mc = '#f59e0b'; }
            else { _mv = '<span>ниже рынка на</span> <span class="num">' + Math.abs(Math.round(_md)) + '%</span>'; _mc = '#818cf8'; }
            _xtra += '<div style="font-size:11px;color:#9aa0b8;margin-top:4px;"><span>Похожие каналы ниши</span>: <b class="num" style="color:#cdd0de;">' + _num(_mlo) + '–' + _num(_mhi) + ' ₽</b> <span>за 1/24</span> — <b style="color:' + _mc + ';">' + _mv + '</b></div>';
        }
        if (typeof l.subs_growth_30d === 'number') {
            var _sg = l.subs_growth_30d;
            var _sgc = _sg > 0 ? '#5DCAA5' : (_sg < 0 ? '#ef4444' : '#8990a8');
            var _sgs = (_sg > 0 ? '+' : (_sg < 0 ? '−' : '')) + _num(Math.abs(_sg));
            _xtra += '<div style="font-size:11px;color:#9aa0b8;margin-top:4px;"><span>Прирост за 30 дней</span> — <b class="num" style="color:' + _sgc + ';">' + _sgs + '</b> <span style="color:#565b73;">подписчиков</span></div>';
        }
        return '<div class="fmx-pwc">' +
            '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">' +
            '<div style="min-width:0;"><div class="pw-hlab">Охват поста</div>' +
            '<div class="pw-hbig num"><span class="v">' + (l.avg_views != null ? _num(l.avg_views) : '—') + '</span><span class="u">на пост</span></div></div>' +
            _ring + '</div>' +
            '<div class="pw-spark" id="fmx-pwspark"></div>' +
            (_chAge(l.channel_created_ts) ? '<div style="font-size:11px;color:#8990a8;margin:-2px 0 8px;"><i class="ti ti-calendar" style="font-size:11px;"></i> На рынке ' + _chAge(l.channel_created_ts) + '</div>' : '') +
            '<div class="pw-mrow num">' +
            cell('Подписчики', l.subscribers != null ? _num(l.subscribers) : '—', l.subscribers == null) +
            '<div class="pw-mdiv"></div>' +
            cell('ERR', l.er != null ? (l.er > 100 ? _warnTri(13) + ' ' : '') + String(l.er).replace('.', ',') + '%' : '—', l.er == null) +
            '<div class="pw-mdiv"></div>' +
            cell('CPM' + (ad ? ' · ERR24' : ''), cpm != null ? _num(cpm) + ' ₽' + _deltaPill(l) : '—', cpm == null) +
            '</div>' +
            '<div class="pw-mrow num" style="border-top:none;padding-top:4px;margin-top:4px;">' +

            '<div class="pw-mdiv"></div>' +
            cell('Аудитория', audTx || '—', !audTx) +
            '<div class="pw-mdiv"></div>' +
            (ad ? cell('Рекл. охват 24ч', '~' + _num(ad), false) : (l.engagement_percent != null ? cell('Вовлечённость (ERR)', String(l.engagement_percent).replace('.', ',') + '%', false) : cell('Прогноз охвата', '—', true))) +
            '</div>' +
            _xtra +
            (l.er != null && l.er > 100 ?
                '<div class="fmx-anom"><span class="fmx-anom-i">' + _warnTri(17) + '</span>' +
                '<div><b>ERR ' + String(l.er).replace('.', ',') + '%</b> — просмотров у постов больше, чем подписчиков в канале. ' +
                'Разовый вирусный пост — не беда, но когда так почти всегда и без явной причины, цифру стоит перепроверить. ' +
                'Обычно за этим стоят докрученные просмотры (канал изображает активность, чтобы дороже продавать рекламу) ' +
                'либо закуп размещений в непрофильных каналах, куда стекается ботовый трафик. ' +
                '<span style="display:block;margin-top:6px;">' + _erCheckTxt(l) + '</span></div></div>' : '') +
            '</div>';
    }
    function _erCheckTxt(l) {
        if (l.engagement_percent != null) {
            return 'Проверить помогает вовлечённость: сейчас ER <b>' + String(l.engagement_percent).replace('.', ',') + '%</b>. ' +
                'Заметные реакции при таком охвате — знак, что просмотры живые; почти полное их отсутствие — что охват докручен ' +
                '(боты просмотр открывают, а реакцию не ставят).';
        }
        return 'Проверить это по вовлечённости не выйдет — реакции у канала скрыты. Настоящий ли охват, ' +
            'здесь показывают только реакции: их нет — значит, нужна ручная проверка источников охвата.';
    }
    function _pwTrend(l) {
        var box = el('fmx-pwspark'); if (!box || !l.id) return;
        apiGet('/api/v1/marketplace/listings/' + l.id + '/trend').then(function (r) {
            var pts = (r && r.ok && r.points) || [];
            if (pts.length < 3 || typeof window.drawReachChart !== 'function') { box.innerHTML = ''; return; }
            var series = pts.map(function (p) { return p.s; });
            var dates = pts.map(function (p) { return p.d; });
            var endLabel = r.stale ? (r.last_date || dates[dates.length - 1] || '') : 'сегодня';
            window.requestAnimationFrame(function () { try { window.drawReachChart(box, series, dates, r.days || 30, endLabel); } catch (e) { box.innerHTML = ''; } });
        }).catch(function () { box.innerHTML = ''; });
    }
    function _trustRows(l) {
        var dealN = l.deals_count || 0;
        var rows = [];
        rows.push({ i: 'ti-heart-handshake', c: '#f5bf4f',
            t: dealN ? 'Подтверждённых сделок: <b>' + dealN + '</b>' + (l.ad_reach_24h ? ' · охват замерен' : '')
                     : 'Сделок пока нет. Отзывы появятся после первой подтверждённой сделки',
            e: 'Обе стороны подтверждают сделку вручную. Ссылку на рекламный пост даёт продавец, дальше охват этого поста мы замеряем сами через 24 и 48 часов. Счётчик растёт только по сделкам, подтверждённым обеими сторонами через Площадку. Оплата идёт напрямую между вами: сервис не держит деньги и не выступает гарантом расчётов.' });
        rows.push({ i: 'ti-target-arrow', c: '#5DCAA5', id: 'fmx-tr-acc',
            t: 'Точность заявленного охвата: <b id="fmx-tr-accv">…</b>',
            e: 'Сравниваем заявленный охват оффера с фактическим охватом рекламных постов из подтверждённых сделок. Чем ближе к нулю — тем честнее заявка.' });
        rows.push({ i: 'ti-calendar-check', c: '#818cf8',
            t: 'Календарь обновлён: <b id="fmx-tr-cal">…</b>',
            e: 'Свежий календарь — признак живого канала: датам на оффере можно доверять.' });
        rows.push({ i: 'ti-activity', c: '#5ab0e6',
            t: 'Метрики обновляются автоматически',
            e: 'Цифры оффера поддерживаются в актуальном состоянии без участия владельца.' });
        return '<div class="fmx-trust" style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;">' +
            rows.map(function (r, i) {
                return '<div class="row" data-tr="' + i + '"><span class="ictile" style="width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:linear-gradient(135deg,' + r.c + '26,' + r.c + '0d);border:1px solid ' + r.c + '52;color:' + r.c + ';"><i class="ti ' + r.i + '"></i></span>' +
                    '<div class="t">' + r.t + '</div><span class="arr">›</span></div>';
            }).join('') + '</div>';
    }
    var _TRUST_EXPL = [];
    function openListing(u, known) {
        var l = known || findListing(u); if (!l) { openTg(u); return; }
        var accent = _isTop(l) ? '#f5bf4f' : _accent(l);
        _initSel(l);
        var dealN = l.deals_count || 0;
        _TRUST_EXPL = [
            'Обе стороны подтверждают сделку вручную. Ссылку на рекламный пост даёт продавец, дальше охват этого поста мы замеряем сами через 24 и 48 часов. Счётчик растёт только по сделкам, подтверждённым обеими сторонами через Площадку. Оплата идёт напрямую между вами: сервис не держит деньги и не выступает гарантом расчётов.',
            'Сравниваем заявленный охват оффера с фактическим охватом рекламных постов из подтверждённых сделок. Чем ближе к нулю — тем честнее заявка.',
            'Свежий календарь — признак живого канала: датам на оффере можно доверять.',
            'Цифры оффера поддерживаются в актуальном состоянии без участия владельца.'
        ];
        var fmtsHtml = '';
        if (l.formats && l.formats.length) {
            var bestCpm = null, _rv = _reach(l);
            l.formats.forEach(function (f) { if (f.price && _rv) { var c = f.price / _rv * 1000; if (bestCpm == null || c < bestCpm) bestCpm = c; } });
            fmtsHtml = '<div class="fmx-lssect">Форматы и цены</div>' +
                '<div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;" id="fmx-fmtl" class="num">' +
                l.formats.map(function (f) {
                    var lb = _esc(f.label || f.format);
                    var m = _fmtMeta(f.format), sub = m && m.sub ? _esc(m.sub) : '';
                    var c = (f.price && _rv) ? Math.round(f.price / _rv * 1000) : null;
                    var isBest = c != null && bestCpm != null && Math.abs(c - Math.round(bestCpm)) < 1 && l.formats.length > 1;
                    return '<div class="fmx-fmt' + ((f.label || f.format) === _lsSel.fmt ? ' on' : '') + '" data-fmt="' + lb + '" data-p="' + (f.price || '') + '">' +
                        (isBest ? '<span class="bd"></span>' : '') +
                        '<div class="fmx-fmtnm"><span>' + lb + '</span>' + (sub ? '<i class="fmx-fmtsub">' + sub + '</i>' : '') + '</div>' +
                        '<span class="pr">' + (f.price ? _num(f.price) + ' ₽' : 'по договорённости') + '</span>' +
                        '<span class="cp">' + (c != null ? 'CPM ' + _num(c) + ' ₽' : '') + '</span></div>';
                }).join('') + '</div>' +
                '<div style="font-size:10px;color:#565b73;margin-top:5px;">Зелёная точка — лучший CPM. ' + (l.ad_reach_24h ? 'CPM по <b style="color:#5DCAA5;">охвату рекламного поста за первые 24 часа (ERR24)</b> — по фактическим замерам сделок.' : 'Тап по строке подставит формат в сообщение') + '</div>' +
                _termsBlock(l);
        }
        el('fmx-listTitle').innerHTML = '<span style="display:flex;align-items:center;gap:7px;">' + _esc(l.title || u) + '</span>';
        el('fmx-listBody').innerHTML =
            '<div style="font-size:12px;color:#8990a8;margin-bottom:12px;">@' + _esc(u) + ' · ' + _num(l.subscribers) + ' подп.' + (l.niche ? ' · ' + _esc(l.niche) : '') + '</div>' +
            '<div class="fmx-badges">' + badges(l) + '</div>' +
            '<div class="fmx-lssect">Метрики канала</div>' +
            _pwMetrics(l) +
            _reachStructBlock(l) +
            _flowBlock(l) +
            _peakBlock(l) +
            (l.id ? '<div id="fmx-tabloBox"></div>' : '') +
            (l.id ? '<div class="fmx-lssect">Доверие</div>' + _trustRows(l) +
                '<div class="fmx-tplink" data-terms="b"><i class="ti ti-clipboard-text"></i> <span>Как проходит сделка</span></div>' : '') +
            (l.custom_text ? '<div style="font-size:13px;color:#cdd0de;line-height:1.55;margin:14px 0 0;">' + _esc(l.custom_text) + '</div>' : '') +
            fmtsHtml +
            (l.id ? '<div class="fmx-lssect">Свободные даты</div><div id="fmx-slotsBox" style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;"></div>' : '') +
            (l.id ? '<div id="fmx-lsRev"></div><div id="fmx-dealBox"></div>' : '') +
            (l.id ? '<div style="display:flex;gap:8px;margin-top:14px;">' +
                '<button class="fmx-btn" id="fmx-lsShare" style="flex:1;color:#5DCAA5;border-color:rgba(93,202,165,0.3);"><i class="ti ti-share-2"></i> Поделиться оффером</button>' +
                '<button class="fmx-btn" id="fmx-ls-rep" style="flex:1;color:#8990a8;"><i class="ti ti-flag"></i> Пожаловаться</button></div>' : '') +
            (!l.id ? '<button class="fmx-btn" id="fmx-lsTrack" style="width:100%;margin-top:14px;color:#5ab0e6;border-color:rgba(90,176,230,0.35);"><i class="ti ti-route"></i> Ссылка отслеживания в рекламный пост</button>' : '') +
            '<div class="fmx-lsfoot">' +
            '<button class="fmx-btn bm" id="fmx-lsBm" data-bm="' + _esc(u) + '"' + (_bookmarks[u] ? ' style="color:#f59e0b;border-color:rgba(245,158,11,0.4);"' : '') + '><i class="ti ti-star"></i></button>' +
            '<button class="fmx-btn fmx-btn-p go" id="fmx-lsGo" style="background:' + accent + ';color:#fff;"><i class="ti ti-brand-telegram"></i> Написать</button></div>';
        if (l.id && l.expand_content_json && l.expand_content_json.els && l.expand_content_json.els.length) {
            var tb = el('fmx-tabloBox');
            tb.innerHTML = '<div class="fmx-lssect">Витрина</div><div id="fmx-tabloIn"></div>';
            renderTablo(l.expand_content_json, el('fmx-tabloIn'), { cut: true });
        }
        qsa(el('fmx-listBody'), '[data-tr]').forEach(function (r) {
            r.addEventListener('click', function () { uiAlert(_TRUST_EXPL[+r.getAttribute('data-tr')] || ''); });
        });
        qsa(el('fmx-listBody'), '.fmr-conv').forEach(function (inp) {
            inp.addEventListener('click', function (e) { e.stopPropagation(); });
            inp.addEventListener('input', function (e) {
                e.stopPropagation();
                var line = inp.closest('[data-flow]'); if (!line) return;
                var pp = +line.getAttribute('data-pp'), av = +line.getAttribute('data-av');
                var c = parseFloat(inp.value); if (isNaN(c) || c <= 0) return; if (c > 100) c = 100;
                var _grw = av * c / 100, gained = Math.round(_grw), cps = Math.round(pp / Math.max(0.01, _grw));
                var box = el('fmx-flowBox'); if (!box) return;
                var cpsEl = box.querySelector('.fmr-cps'); if (cpsEl) { cpsEl.textContent = '≈' + _num(cps) + ' ₽'; cpsEl.style.color = c < 0.3 ? '#f59e0b' : '#5DCAA5'; }
                var gEl = box.querySelector('.fmr-gained'); if (gEl) gEl.textContent = _gainTxt(_grw);
                var warn = box.querySelector('.fmr-warn'); if (warn) warn.classList.toggle('on', c < 0.3);
            });
        });
        qsa(el('fmx-listBody'), '.fmx-fmt').forEach(function (f) {
            f.addEventListener('click', function () {
                qsa(el('fmx-listBody'), '.fmx-fmt').forEach(function (x) { x.classList.remove('on'); });
                f.classList.add('on');
                _lsSel.fmt = f.getAttribute('data-fmt');
                _lsSel.price = parseInt(f.getAttribute('data-p'), 10) || null;
                _lsSel.edited = false;
                _haptic('light');
                _syncWriteBtn(l);
            });
        });
        var lsSh = el('fmx-lsShare');
        if (lsSh) lsSh.addEventListener('click', function () { shareCard(l.id, l.username); });
        el('fmx-lsBm').addEventListener('click', function () {
            toggleBm(u);
            var on = !!_bookmarks[u];
            this.style.color = on ? '#f59e0b' : '';
            this.style.borderColor = on ? 'rgba(245,158,11,0.4)' : '';
            toast(on ? 'Добавлено в закладки' : 'Убрано из закладок');
        });
        el('fmx-lsGo').addEventListener('click', function () {
            if (!l.id) { trackListing(l.id, 'write'); openTg(u); return; }
            openWriteSheet(l);
        });
        var _lsRep = el('fmx-ls-rep');
        if (_lsRep) _lsRep.addEventListener('click', function () { hideModal('fmx-listBg'); openComplaint({ listing_id: l.id }); });
        var _lsTrk = el('fmx-lsTrack');
        if (_lsTrk) _lsTrk.addEventListener('click', function () {
            hideModal('fmx-listBg');
            try { window.__openPlacementsCreate(u); } catch (e) {}
        });
        if (l.id) {
            _pwTrend(l);
            _drawSubsChart();
            window.requestAnimationFrame(_drawSubsChart);
            loadBuyerSlots(el('fmx-slotsBox'), l, function (r) {
                var av = el('fmx-tr-accv');
                if (av) av.textContent = (r.accuracy_pct != null)
                    ? ((r.accuracy_pct > 0 ? '+' : (r.accuracy_pct < 0 ? '−' : '')) + Math.abs(r.accuracy_pct) + '%')
                    : 'появится после первой сделки с замером';
                var cv = el('fmx-tr-cal');
                if (cv) cv.textContent = r.slots_updated_at ? _agoDay(r.slots_updated_at) : 'не заполнялся';
                if (r.slots_updated_at && !_lsSel.day) {
                    var busy = {}; (r.busy || []).forEach(function (x) { busy[x] = 1; });
                    var d = new Date(); d.setHours(12, 0, 0, 0);
                    for (var k = 0; k < 90; k++) {
                        var iso = _isoOf(d);
                        if (!busy[iso]) { _lsSel.day = iso; break; }
                        d.setDate(d.getDate() + 1);
                    }
                    drawBuyerSlots(el('fmx-slotsBox'), l);
                }
                _syncWriteBtn(l);
            });
            renderDealBox(l);
            if (l.reviews_count) renderReviews(l);
        }
        _syncWriteBtn(l);
        hydrateTgs(el('fmx-listBody'));
        showModal('fmx-listBg');
    }
    var _bmMap = {};
    function openBookmarks() {
        var box = el('fmx-bmBody');
        box.innerHTML = loadHtml();
        showModal('fmx-bmBg');
        apiGet('/api/v1/marketplace/bookmarks/cards').then(function (r) {
            var items = (r && r.items) || [];
            _bookmarks = {}; _bmMap = {};
            items.forEach(function (it) { _bookmarks[it.listing.username] = true; _bmMap[it.listing.username] = it.listing; });
            updateBmCount();
            if (!items.length) {
                box.innerHTML = '<div class="fmx-empty"><i class="ti ti-star"></i><h3>Пусто</h3><p>Отмечай ★ на офферах, чтобы сохранить канал.</p></div>';
                return;
            }
            box.innerHTML = items.map(function (it) {
                var l = it.listing, u = l.username;
                return '<div class="fmx-bmrow' + (it.frozen ? ' frz' : '') + '" data-open="' + _esc(u) + '" data-src="' + it.source + '" data-frz="' + (it.frozen ? 1 : 0) + '">' +
                    zw(listItem(l, false, it.source === 'base')) +
                    (it.frozen ? '<span class="fmx-frzTag"><i class="ti ti-snowflake"></i> Заморожена</span>' : '') +
                    '<button class="fmx-bmdel" data-del="' + _esc(u) + '" title="Удалить из закладок (два нажатия)"><i class="ti ti-trash"></i></button></div>';
            }).join('');
            bindList(box);
            scaleCards(box);
            hydrateTgs(box);
        }).catch(function () {
            box.innerHTML = '<div class="fmx-empty"><i class="ti ti-cloud-off"></i><h3>Не загрузилось</h3><p>Попробуй открыть закладки ещё раз.</p></div>';
        });
    }

    var _toastTo = null;
    function toast(msg, err) {
        var t = el('fmx-toastEl');
        if (!t) { t = document.createElement('div'); t.id = 'fmx-toastEl'; t.className = 'fmx-toast'; document.body.appendChild(t); }
        t.classList.toggle('err', !!err);
        t.innerHTML = '<i class="ti ' + (err ? 'ti-alert-circle' : 'ti-circle-check') + '"></i> ' + _esc(msg);
        t.classList.add('on');
        clearTimeout(_toastTo);
        _toastTo = setTimeout(function () { t.classList.remove('on', 'err'); }, 2400);
    }

    var _open0 = open;
    window.__openMarketplace = function (cid) { loadNicheMap(); return _open0(cid); };
    window.__openRadar = function (cid) { loadNicheMap(); _open0(cid); setTimeout(function () { try { setMainTab('catalog'); } catch (e) {} }, 220); };
    window.__openTerminal = function (cid) { loadNicheMap(); _open0(cid); setTimeout(function () { try { setMainTab('pulse'); } catch (e) {} }, 220); };
})();