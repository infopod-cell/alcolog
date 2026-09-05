// БАЗА ПРОДУКТОВ (Калории на 100мл/100г)
const PRODUCTS = {
    // Алкоголь (тип 'beer' идет в счетчик пива, 'strong' в счетчик крепкого)
    beer:       { name: 'Пиво',      type: 'beer',   kcal: 45,  unit: 'ml', icon: '🍺' },
    gin:        { name: 'Джин',      type: 'strong', kcal: 220, unit: 'ml', icon: '🍸' },
    rum:        { name: 'Ром',       type: 'strong', kcal: 220, unit: 'ml', icon: '🥃' },
    whiskey:    { name: 'Виски',     type: 'strong', kcal: 220, unit: 'ml', icon: '🥃' },
    tincture:   { name: 'Настойка',  type: 'strong', kcal: 250, unit: 'ml', icon: '🍶' },
    
    // Миксеры (тип 'mixer' не идет в литры, только калории)
    tonic:      { name: 'Тоник',     type: 'mixer',  kcal: 35,  unit: 'ml', icon: '🥤' },
    cola:       { name: 'Кола',      type: 'mixer',  kcal: 42,  unit: 'ml', icon: '🥤' },
    lemonade:   { name: 'Лимонад',   type: 'mixer',  kcal: 40,  unit: 'ml', icon: '🥤' },
    juice:      { name: 'Сок',       type: 'mixer',  kcal: 45,  unit: 'ml', icon: '🧃' },
    
    // Еда (тип 'food')
    peanuts:    { name: 'Арахис',    type: 'food',   kcal: 570, unit: 'g',  icon: '🥜', defaultVolume: 200 },
    other_food: { name: 'Еда',       type: 'food',   kcal: 250, unit: 'g',  icon: '🍕', defaultVolume: 200 } // Примерная калорийность
};

let entries = JSON.parse(localStorage.getItem('drinkTrackerData')) || [];
let currentProductKey = null;

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', () => {
    render();
    
    // Кнопка очистки истории
    document.getElementById('clear-history-btn').addEventListener('click', () => {
        if(confirm('Удалить всю историю? Это действие нельзя отменить.')) {
            entries = [];
            saveData();
            render();
        }
    });

    // Обновление калорий в модалке при вводе объема
    document.getElementById('input-volume').addEventListener('input', updateModalCalories);
});

// ОТКРЫТИЕ МОДАЛКИ
function openModal(key) {
    currentProductKey = key;
    const product = PRODUCTS[key];
    
    document.getElementById('modal-title').innerText = `${product.icon} ${product.name}`;
    
    // Настройка объема по умолчанию
    // Для Арахиса ставим 200г, для остального 500мл (как ты просил)
    let defaultVol = product.defaultVolume || 500;
    document.getElementById('input-volume').value = defaultVol;
    
    // Настройка подписи (мл или г)
    document.getElementById('volume-label').innerText = product.unit === 'g' ? 'Вес (г)' : 'Объем (мл)';
    
    // Сброс цены
    document.getElementById('input-price').value = '';
    
    updateModalCalories();
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    currentProductKey = null;
}

function updateModalCalories() {
    if (!currentProductKey) return;
    const product = PRODUCTS[currentProductKey];
    const volume = parseFloat(document.getElementById('input-volume').value) || 0;
    const calories = Math.round((volume / 100) * product.kcal);
    document.getElementById('modal-calories').innerText = calories;
}

// СОХРАНЕНИЕ ЗАПИСИ
function saveEntry() {
    const volume = parseFloat(document.getElementById('input-volume').value) || 0;
    const price = parseFloat(document.getElementById('input-price').value) || 0;
    
    if (volume <= 0) {
        alert('Объем должен быть больше нуля');
        return;
    }

    const product = PRODUCTS[currentProductKey];
    const calories = Math.round((volume / 100) * product.kcal);

    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        name: product.name,
        icon: product.icon,
        type: product.type, // beer, strong, mixer, food
        volume: volume,
        unit: product.unit,
        price: price,
        calories: calories
    };

    entries.push(entry);
    saveData();
    render();
    closeModal();
}

// УДАЛЕНИЕ ЗАПИСИ
function deleteEntry(id) {
    entries = entries.filter(e => e.id !== id);
    saveData();
    render();
}

function saveData() {
    localStorage.setItem('drinkTrackerData', JSON.stringify(entries));
}

// ОТРИСОВКА ИНТЕРФЕЙСА И СТАТИСТИКИ
function render() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Фильтруем записи только за текущий месяц
    const monthEntries = entries.filter(entry => {
        const d = new Date(entry.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    // Считаем статистику
    let stats = {
        money: 0,
        calories: 0,
        strongLiters: 0,
        beerLiters: 0
    };

    monthEntries.forEach(entry => {
        stats.money += entry.price;
        stats.calories += entry.calories;
        
        if (entry.type === 'strong') {
            stats.strongLiters += entry.volume;
        } else if (entry.type === 'beer') {
            stats.beerLiters += entry.volume;
        }
        // Миксеры и еда не влияют на литры
    });

    // Обновляем карточки статистики
    document.getElementById('stat-money').innerText = `${Math.round(stats.money)} ₽`;
    document.getElementById('stat-calories').innerText = `${stats.calories} ккал`;
    document.getElementById('stat-strong').innerText = `${(stats.strongLiters / 1000).toFixed(2)} л`;
    document.getElementById('stat-beer').innerText = `${(stats.beerLiters / 1000).toFixed(2)} л`;

    // Отрисовка истории (последние 20 записей)
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    // Сортировка: новые сверху
    const recentEntries = [...entries].reverse().slice(0, 20);

    recentEntries.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + 
                        ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div class="history-details">
                <span>${entry.icon} ${entry.name} (${entry.volume} ${entry.unit})</span>
                <span class="history-meta">${dateStr} • ${entry.price} ₽ • ${entry.calories} ккал</span>
            </div>
            <button class="delete-btn" onclick="deleteEntry(${entry.id})">×</button>
        `;
        list.appendChild(li);
    });
}
