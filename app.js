// БАЗА ПРОДУКТОВ (тип: beer / wine / strong / mixer)
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

let viewYear, viewMonth;
let selectedDayKey = null;

// Шторка
let sheet = { dateKey: null, rows: [] };
let rowSeq = 0;
let pickerTarget = null;

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();

    setMonthTitle();
    render();

    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if (confirm('Удалить всю историю? Это действие нельзя отменить.')) {
            entries = [];
            saveData();
            render();
        }
    });

    document.getElementById('sheet-overlay').addEventListener('click', e => {
        if (e.target.id === 'sheet-overlay') closeSheet();
    });
    document.getElementById('picker-overlay').addEventListener('click', e => {
        if (e.target.id === 'picker-overlay') closePicker();
    });
});

function setMonthTitle() {
    const name = new Date().toLocaleDateString('ru-RU', { month: 'long' });
    document.getElementById('month-title').textContent =
        name.charAt(0).toUpperCase() + name.slice(1);
}

function switchTab(tab) {
    ['home', 'calendar', 'history'].forEach(t => {
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

function fmtEntryVol(e) {
    const l = entryLiters(e);
    return (Math.round(l * 100) / 100) + ' л';
}

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
            items += '<li class="history-item"><div class="history-details">' +
                '<span class="history-name">' + e.name + ', ' + fmtEntryVol(e) + '</span>' +
                '<span class="history-meta">' + formatNumber(e.price) + ' ₽</span>' +
                '</div>' +
                '<button class="delete-btn" onclick="deleteEntry(' + e.id + ')">×</button></li>';
        });
        html += '<ul class="day-list">' + items + '</ul>';
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
    const keys = getDayEntries(key).map(e => e.id);
    entries = entries.filter(e => !keys.includes(e.id));
    saveData();
    render();
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

            // Продукт
            const prodBtn = document.createElement('button');
            prodBtn.className = 'field-pick row-product';
            prodBtn.textContent = r.product ? PRODUCTS[r.product].name : 'Выбрать ▾';
            prodBtn.onclick = () => openPicker(r.id, 'product');

            // Объем
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

            // Цена
            const priceIn = document.createElement('input');
            priceIn.className = 'row-price';
            priceIn.placeholder = '₽';
            priceIn.inputMode = 'numeric';
            priceIn.value = r.price;
            priceIn.oninput = () => { r.price = priceIn.value; updateTotal(); };

            // Удалить строку
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
            // Память: подставляем прошлые объем и цену
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

// ========== СОХРАНЕНИЕ ==========

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

        // Запоминаем объем и цену для продукта
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

    document.getElementById('stat-money').textContent = formatNumber(stats.money) + ' ₽';
    document.getElementById('stat-beer').textContent = stats.beer.toFixed(2) + ' л';
    document.getElementById('stat-wine').textContent = stats.wine.toFixed(2) + ' л';
    document.getElementById('stat-strong').textContent = stats.strong.toFixed(2) + ' л';

    const counts = computeMonthCounts(now.getFullYear(), now.getMonth());
    document.getElementById('home-summary').innerHTML =
        'Дней с алкоголем: <b>' + counts.drinking + '</b> · Трезвых: <b>' + counts.sober + '</b>';

    // История
    const list = document.getElementById('history-list');
    list.innerHTML = '';

    const sorted = [...entries].reverse();
    document.getElementById('history-empty').style.display = sorted.length ? 'none' : 'block';

    sorted.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) +
            ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-details">
                <span class="history-name">${entry.name}, ${fmtEntryVol(entry)}</span>
                <span class="history-meta">${dateStr} · ${formatNumber(entry.price)} ₽</span>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        list.appendChild(li);
    });

    renderCalendar();
    renderDayDetails();
}
