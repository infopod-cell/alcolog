// БАЗА ПРОДУКТОВ
const PRODUCTS = {
    beer:      { name: 'Пиво',      type: 'beer',   defVol: 1 },
    gin:       { name: 'Джин',      type: 'strong', defVol: 0.5 },
    rum:       { name: 'Ром',       type: 'strong', defVol: 0.5 },
    whiskey:   { name: 'Виски',     type: 'strong', defVol: 0.5 },
    tincture:  { name: 'Настойка',  type: 'strong', defVol: 0.5 },
    wine:      { name: 'Вино',      type: 'wine',   defVol: 0.7 },
    cognac:    { name: 'Коньяк',    type: 'strong', defVol: 0.5 },

    tonic:     { name: 'Тоник',     type: 'mixer',  defVol: 0.5 },
    cola:      { name: 'Кола',      type: 'mixer',  defVol: 0.5 },
    lemonade:  { name: 'Лимонад',   type: 'mixer',  defVol: 0.5 },
    juice:     { name: 'Сок',       type: 'mixer',  defVol: 0.5 },
    energy:    { name: 'Энергетик', type: 'mixer',  defVol: 0.45 }
};

const ALC_KEYS = ['beer', 'gin', 'rum', 'whiskey', 'tincture', 'wine', 'cognac'];
const MIX_KEYS = ['tonic', 'cola', 'lemonade', 'juice', 'energy'];
const VOL_OPTIONS = [0.33, 0.5, 0.7, 1, 1.5, 2, 3];

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                     'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

let entries = JSON.parse(localStorage.getItem('drinkTrackerData')) || [];
let memory = JSON.parse(localStorage.getItem('drinkTrackerMemory')) || {};

let viewYear, viewMonth;          // календарь
let viewYearA;                    // аналитика
let selectedDayKey = null;

let sheet = { dateKey: null, rows: [] };
let rowSeq = 0;
let pickerTarget = null;

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    viewYearA = now.getFullYear();

    render();

    document.getElementById('sheet-overlay').addEventListener('click', e => {
        if (e.target.id === 'sheet-overlay') closeSheet();
    });
    document.getElementById('picker-overlay').addEventListener('click', e => {
        if (e.target.id === 'picker-overlay') closePicker();
    });
    document.getElementById('restore-file').addEventListener('change', handleRestore);
});

function switchTab(tab) {
    ['home', 'calendar', 'analytics', 'save'].forEach(t => {
        document.getElementById('screen-' + t).classList.toggle('active', t === tab);
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
    });
    window.scrollTo(0, 0);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========

function dateKey(y, m, d) { return y + '-' + m + '-' + d; }

function parseKey(key) {
    const p = key.split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
}

function entryLiters(e) { return e.unit === 'l' ? e.volume : e.volume / 1000; }

function fmtEntryVol(e) { return (Math.round(entryLiters(e) * 100) / 100) + ' л'; }

function fmtL(l) { return Math.round(l * 100) / 100; }

function formatNumber(n) { return Math.round(n).toLocaleString('ru-RU'); }

function saveData() { localStorage.setItem('drinkTrackerData', JSON.stringify(entries)); }

// ========== КАЛЕНДАРЬ ==========

function getMarkerMap() {
    const map = {};
    entries.forEach(e => {
        if (e.type !== 'beer' && e.type !== 'wine' && e.type !== 'strong') return;
        const d = new Date(e.timestamp);
        const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        if (!map[key]) map[key] = { beer: false, wine: false, strong: false };
        map[key][e.type] = true;
    });
    return map;
}

function getDayEntries(key) {
    const { y, m, d } = parseKey(key);
    return entries.filter(e => {
        const dt = new Date(e.timestamp);
        return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
    });
}

function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    selectedDayKey = null;
    renderCalendar();
    renderDayDetails();
}

function renderCalendar() {
    document.getElementById('cal-title').textContent =
        MONTH_NAMES[viewMonth] + ' ' + viewYear;

    const grid = document.getElementById('cal-grid');
    grid.innerHTML = '';

    const firstDow = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const markerMap = getMarkerMap();
    const now = new Date();

    for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement('span');
        empty.className = 'day-empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(viewYear, viewMonth, d);
        const marker = markerMap[key];

        const btn = document.createElement('button');
        btn.className = 'day-tile';

        if (now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === d) {
            btn.classList.add('today');
        }
        if (selectedDayKey === key) btn.classList.add('selected');

        let segs = '';
        if (marker) {
            ['beer', 'wine', 'strong'].forEach(t => {
                if (marker[t]) segs += '<span class="seg ' + t + '"></span>';
            });
        }

        btn.innerHTML = '<span class="day-num">' + d + '</span>' +
            '<span class="day-bar' + (segs ? '' : ' none') + '">' + segs + '</span>';
        btn.onclick = () => selectDay(key);
        grid.appendChild(btn);
    }
}

function selectDay(key) {
    if (selectedDayKey === key) {
        selectedDayKey = null;
        renderCalendar();
        renderDayDetails();
        return;
    }
    selectedDayKey = key;
    renderCalendar();
    renderDayDetails();

    if (getDayEntries(key).length === 0) openSheet(key);
}

function renderDayDetails() {
    const box = document.getElementById('day-details');

    if (!selectedDayKey) {
        box.innerHTML = '<div class="day-hint">Нажми на день, чтобы посмотреть или добавить записи</div>';
        return;
    }

    const { y, m, d } = parseKey(selectedDayKey);
    let title = new Date(y, m, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' });
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const dayEntries = getDayEntries(selectedDayKey);
    let html = '<h2>' + title + '</h2>';

    if (dayEntries.length) {
        let money = 0, items = '';
        dayEntries.forEach(e => {
            money += e.price;
            items += '<li><span class="dp-text">' + e.name + ', ' + fmtEntryVol(e) + '</span>' +
                '<span class="dp-right">' + formatNumber(e.price) + ' ₽' +
                '<button class="delete-btn" onclick="deleteEntry(' + e.id + ')">×</button></span></li>';
        });
        html += '<ul class="day-plain">' + items + '</ul>';
        html += '<div class="day-totals">Итого: ' + formatNumber(money) + ' ₽</div>';
    } else {
        html += '<div class="day-hint">В этот день записей нет.</div>';
    }

    html += '<button class="add-btn" onclick="openSheet(\'' + selectedDayKey + '\')">+ Добавить запись</button>';
    if (dayEntries.length) {
        html += '<button class="delete-day-btn" onclick="deleteDay(\'' + selectedDayKey + '\')">Удалить день</button>';
    }
    box.innerHTML = html;
}

function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id);
    saveData();
    render();
}

function deleteDay(key) {
    if (!confirm('Удалить все записи за этот день?')) return;
    const ids = getDayEntries(key).map(e => e.id);
    entries = entries.filter(e => !ids.includes(e.id));
    saveData();
    render();
}

// ========== АНАЛИТИКА ==========

function changeYear(delta) {
    viewYearA += delta;
    renderAnalytics();
}

function monthStats(year, month) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const isCurrent = year === now.getFullYear() && month === now.getMonth();
    const elapsed = isCurrent ? now.getDate() : daysInMonth;

    let money = 0, beer = 0, wine = 0, strong = 0;
    const daySet = new Set();

    entries.forEach(e => {
        const d = new Date(e.timestamp);
        if (d.getFullYear() !== year || d.getMonth() !== month) return;
        money += e.price;
        const l = entryLiters(e);
        if (e.type === 'beer') beer += l;
        if (e.type === 'wine') wine += l;
        if (e.type === 'strong') strong += l;
        if (e.type === 'beer' || e.type === 'wine' || e.type === 'strong') daySet.add(d.getDate());
    });

    const drinking = daySet.size;
    return {
        month, money, beer, wine, strong,
        liters: beer + wine + strong,
        drinking,
        sober: Math.max(0, elapsed - drinking)
    };
}

function renderAnalytics() {
    document.getElementById('year-title').textContent = viewYearA;
    const box = document.getElementById('months-list');
    box.innerHTML = '';

    const now = new Date();

    if (viewYearA > now.getFullYear()) {
        box.innerHTML = '<div class="day-hint">В этом году данных пока нет.</div>';
        return;
    }

    const maxMonth = (viewYearA === now.getFullYear()) ? now.getMonth() : 11;

    let months = [];
    let maxLiters = 0;
    for (let m = 0; m <= maxMonth; m++) {
        const md = monthStats(viewYearA, m);
        months.push(md);
        if (md.liters > maxLiters) maxLiters = md.liters;
    }

    // Свежие месяцы сверху
    months.reverse().forEach(md => {
        const max = maxLiters > 0 ? maxLiters : 1;
        const wBeer = (md.beer / max) * 100;
        const wWine = (md.wine / max) * 100;
        const wStrong = (md.strong / max) * 100;

        let bar = '';
        if (md.beer) bar += '<span class="seg beer" style="width:' + wBeer + '%"></span>';
        if (md.wine) bar += '<span class="seg wine" style="width:' + wWine + '%"></span>';
        if (md.strong) bar += '<span class="seg strong" style="width:' + wStrong + '%"></span>';

        const tile = document.createElement('div');
        tile.className = 'month-tile';
        tile.innerHTML =
            '<div class="month-head"><span class="month-name">' + MONTH_NAMES[md.month] + '</span>' +
            '<span class="month-money">' + formatNumber(md.money) + ' ₽</span></div>' +
            '<div class="month-bar-row"><div class="month-bar">' + bar + '</div>' +
            '<span class="month-liters">' + fmtL(md.liters) + ' л</span></div>' +
            '<div class="month-types">Пиво ' + fmtL(md.beer) + ' · Вино ' + fmtL(md.wine) + ' · Крепкое ' + fmtL(md.strong) + '</div>' +
            '<div class="month-days">Дней с алкоголем: ' + md.drinking + ' · Трезвых: ' + md.sober + '</div>';
        box.appendChild(tile);
    });
}

// ========== СОХРАНЕНИЕ / ВОССТАНОВЛЕНИЕ ==========

function exportData() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = 'alkogolik-backup-' + d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem('drinkTrackerLastBackup', String(Date.now()));
    renderBackupInfo();
}

function handleRestore(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (!Array.isArray(data)) throw new Error('bad format');

            const ids = new Set(entries.map(x => x.id));
            let added = 0;
            data.forEach(item => {
                if (item && item.timestamp && item.name && !ids.has(item.id)) {
                    entries.push(item);
                    ids.add(item.id);
                    added++;
                }
            });

            saveData();
            render();
            alert('Готово! Добавлено записей: ' + added);
        } catch (err) {
            alert('Не удалось прочитать файл. Убедись, что это файл резервной копии.');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
}

// ========== ШТОРКА ЗАПИСИ ==========

function openSheet(key) {
    sheet.dateKey = key;
    sheet.rows = [];
    rowSeq = 0;
    addRow('alc');

    const { y, m, d } = parseKey(key);
    const dateTitle = new Date(y, m, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    document.getElementById('sheet-title').innerText = 'Запись за ' + dateTitle;

    document.getElementById('sheet-overlay').style.display = 'flex';
}

function closeSheet() {
    document.getElementById('sheet-overlay').style.display = 'none';
}

function addRow(kind) {
    sheet.rows.push({ id: ++rowSeq, kind, product: null, volume: null, customVol: false, price: '' });
    renderSheetRows();
}

function removeRow(id) {
    sheet.rows = sheet.rows.filter(r => r.id !== id);
    renderSheetRows();
}

function renderSheetRows() {
    ['alc', 'mix'].forEach(kind => {
        const box = document.getElementById(kind === 'alc' ? 'alc-rows' : 'mix-rows');
        box.innerHTML = '';

        sheet.rows.filter(r => r.kind === kind).forEach(r => {
            const div = document.createElement('div');
            div.className = 'entry-row';

            const prodBtn = document.createElement('button');
            prodBtn.className = 'field-pick row-product';
            prodBtn.textContent = r.product ? PRODUCTS[r.product].name : 'Выбрать ▾';
            prodBtn.onclick = () => openPicker(r.id, 'product');

            let volEl;
            if (r.customVol) {
                volEl = document.createElement('input');
                volEl.type = 'number';
                volEl.step = '0.1';
                volEl.min = '0';
                volEl.inputMode = 'decimal';
                volEl.placeholder = 'литры';
                volEl.className = 'row-price row-volume';
                volEl.value = r.volume || '';
                volEl.oninput = () => { r.volume = parseFloat(volEl.value) || 0; updateTotal(); };
            } else {
                volEl = document.createElement('button');
                volEl.className = 'field-pick row-volume';
                volEl.textContent = r.volume ? r.volume + ' ▾' : 'Объем ▾';
                volEl.onclick = () => openPicker(r.id, 'volume');
            }

            const priceIn = document.createElement('input');
            priceIn.className = 'row-price';
            priceIn.placeholder = '₽';
            priceIn.inputMode = 'numeric';
            priceIn.value = r.price;
            priceIn.oninput = () => { r.price = priceIn.value; updateTotal(); };

            const del = document.createElement('button');
            del.className = 'row-del';
            del.textContent = '×';
            del.onclick = () => removeRow(r.id);

            div.append(prodBtn, volEl, priceIn, del);
            box.appendChild(div);
        });
    });
    updateTotal();
}

function updateTotal() {
    let total = 0;
    sheet.rows.forEach(r => { total += parseFloat(r.price) || 0; });
    document.getElementById('sheet-total').textContent = formatNumber(total) + ' ₽';
}

// ========== ПИКЕР ==========

function openPicker(rowId, field) {
    pickerTarget = { rowId, field };
    const row = sheet.rows.find(r => r.id === rowId);
    const list = document.getElementById('picker-list');
    list.innerHTML = '';

    let options = [];
    if (field === 'product') {
        options = (row.kind === 'alc' ? ALC_KEYS : MIX_KEYS)
            .map(k => ({ value: k, label: PRODUCTS[k].name }));
    } else {
        options = VOL_OPTIONS.map(v => ({ value: v, label: v + ' л' }));
        options.push({ value: 'custom', label: 'Свой объем…' });
    }

    options.forEach(o => {
        const b = document.createElement('button');
        b.className = 'picker-item';
        b.textContent = o.label;
        const current = field === 'product' ? row.product : (row.customVol ? 'custom' : row.volume);
        if (String(current) === String(o.value)) b.classList.add('selected');
        b.onclick = () => pickOption(o.value);
        list.appendChild(b);
    });

    document.getElementById('picker-overlay').style.display = 'flex';
}

function closePicker() {
    document.getElementById('picker-overlay').style.display = 'none';
    pickerTarget = null;
}

function pickOption(value) {
    const row = sheet.rows.find(r => r.id === pickerTarget.rowId);

    if (pickerTarget.field === 'product') {
        row.product = value;
        const mem = memory[value];
        if (mem && mem.volume) {
            row.customVol = false;
            row.volume = mem.volume;
            row.price = mem.price || '';
        } else {
            row.customVol = false;
            row.volume = PRODUCTS[value].defVol;
        }
    } else {
        if (value === 'custom') {
            row.customVol = true;
            row.volume = null;
        } else {
            row.customVol = false;
            row.volume = value;
        }
    }

    closePicker();
    renderSheetRows();
}

function saveSheet() {
    const valid = sheet.rows.filter(r => r.product && r.volume > 0);
    if (!valid.length) {
        alert('Заполни хотя бы одну строку: продукт и объем');
        return;
    }

    const { y, m, d } = parseKey(sheet.dateKey);
    const nowT = new Date();

    valid.forEach((r, i) => {
        const p = PRODUCTS[r.product];
        const price = parseFloat(r.price) || 0;

        entries.push({
            id: Date.now() + i,
            timestamp: new Date(y, m, d, nowT.getHours(), nowT.getMinutes()).toISOString(),
            name: p.name,
            type: p.type,
            volume: r.volume,
            unit: 'l',
            price: price
        });

        memory[r.product] = { volume: r.volume, price: price };
    });

    localStorage.setItem('drinkTrackerMemory', JSON.stringify(memory));
    saveData();
    render();
    closeSheet();
}

// ========== ОТРИСОВКА ==========

function computeMonthCounts(year, month) {
    const markerMap = getMarkerMap();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();

    let drinking = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        if (markerMap[dateKey(year, month, d)]) drinking++;
    }

    const isCurrent = year === now.getFullYear() && month === now.getMonth();
    const isFuture = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());
    const elapsed = isFuture ? 0 : (isCurrent ? now.getDate() : daysInMonth);

    return { drinking, sober: Math.max(0, elapsed - drinking) };
}

function render() {
    const now = new Date();

    const monthEntries = entries.filter(entry => {
        const d = new Date(entry.timestamp);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    let stats = { money: 0, beer: 0, wine: 0, strong: 0 };

    monthEntries.forEach(entry => {
        stats.money += entry.price;
        if (entry.type === 'beer') stats.beer += entryLiters(entry);
        if (entry.type === 'wine') stats.wine += entryLiters(entry);
        if (entry.type === 'strong') stats.strong += entryLiters(entry);
    });

    let moneyAll = 0;
    entries.forEach(e => { moneyAll += e.price; });

    document.getElementById('stat-money-month').textContent = formatNumber(stats.money) + ' ₽';
    document.getElementById('stat-money-all').textContent = formatNumber(moneyAll) + ' ₽';
    document.getElementById('stat-beer').textContent = stats.beer.toFixed(2) + ' л';
    document.getElementById('stat-wine').textContent = stats.wine.toFixed(2) + ' л';
    document.getElementById('stat-strong').textContent = stats.strong.toFixed(2) + ' л';

    const counts = computeMonthCounts(now.getFullYear(), now.getMonth());
    document.getElementById('home-summary').innerHTML =
        'Дней с алкоголем: <b>' + counts.drinking + '</b> · Трезвых: <b>' + counts.sober + '</b>';

    renderCalendar();
    renderDayDetails();
    renderAnalytics();
}
