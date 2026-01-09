// ===== PWA =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try { await navigator.serviceWorker.register('./sw.js'); } catch { }
    });
}

// ===== DATA (najprościej: localStorage) =====
// (Jeśli iOS zacznie wariować przy większych danych, przejdziemy na IndexedDB/localForage)
const K_MEALS = 'meals_v1';
const K_ING = 'ingredients_v1';
const K_CAT = 'catalog_v1';

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
const norm = (s) => s.trim().toLowerCase();

function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Meals: [{id, day, name, ingredients:[string], order}]
function getMeals() { return load(K_MEALS, []); }
function setMeals(v) { save(K_MEALS, v); }

// Ingredients: [{id, name, bought, quantity, createdAt}]
function getIngredients() { return load(K_ING, []); }
function setIngredients(v) { save(K_ING, v); }

// Catalog: [string] (unikalne, do podpowiedzi)
function getCatalog() { return load(K_CAT, []); }
function setCatalog(v) { save(K_CAT, v); }

// ===== UI refs =====
const screenMeals = document.getElementById('screenMeals');
const screenIngredients = document.getElementById('screenIngredients');
const tabMeals = document.getElementById('tabMeals');
const tabIngredients = document.getElementById('tabIngredients');
const topTitle = document.getElementById('topTitle');
const openAddModalBtn = document.getElementById('openAddModalBtn');

const daysContainer = document.getElementById('daysContainer');
const clearMealsBtn = document.getElementById('clearMealsBtn');

const addModal = document.getElementById('addModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeModalBackdrop = document.getElementById('closeModalBackdrop');

const daySelect = document.getElementById('daySelect');
const mealNameInput = document.getElementById('mealNameInput');

const ingredientInputModal = document.getElementById('ingredientInputModal');
const addIngredientModalBtn = document.getElementById('addIngredientModalBtn');
const modalIngredientsList = document.getElementById('modalIngredientsList');
const suggestModal = document.getElementById('suggestModal');

const saveMealBtn = document.getElementById('saveMealBtn');

const ingredientInputMain = document.getElementById('ingredientInputMain');
const addIngredientMainBtn = document.getElementById('addIngredientMainBtn');
const ingredientsList = document.getElementById('ingredientsList');
const suggestMain = document.getElementById('suggestMain');

// ===== NAV =====
function setScreen(name) {
    const isMeals = name === 'meals';

    screenMeals.classList.toggle('screen--active', isMeals);
    screenIngredients.classList.toggle('screen--active', !isMeals);

    tabMeals.classList.toggle('tab--active', isMeals);
    tabIngredients.classList.toggle('tab--active', !isMeals);

    topTitle.textContent = isMeals ? 'Lista dań' : 'Lista składników';
    // przycisk Dodaj tylko na ekranie dań (wg canvas)
    openAddModalBtn.style.display = isMeals ? 'inline-block' : 'none';
}
tabMeals.addEventListener('click', () => setScreen('meals'));
tabIngredients.addEventListener('click', () => setScreen('ingredients'));

// ===== MODAL =====
let modalIngredients = []; // tymczasowa lista składników dla dania: [{name, quantity}]

function openModal(dayIndex = null) {
    addModal.classList.add('modal--open');
    addModal.setAttribute('aria-hidden', 'false');
    mealNameInput.value = '';
    ingredientInputModal.value = '';
    modalIngredients = [];
    renderModalIngredients();
    // domyślnie: dzisiaj lub wybrany dzień
    if (dayIndex !== null) {
        daySelect.value = String(dayIndex);
    } else {
        daySelect.value = String(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
    }
    mealNameInput.focus();
}

function closeModal() {
    addModal.classList.remove('modal--open');
    addModal.setAttribute('aria-hidden', 'true');
    hideSuggest(suggestModal);
}

openAddModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
closeModalBackdrop.addEventListener('click', closeModal);

// Esc key closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addModal.classList.contains('modal--open')) {
        closeModal();
    }
});

// ===== DAYS select =====
function initDaySelect() {
    daySelect.innerHTML = '';
    DAYS.forEach((d, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = d;
        daySelect.appendChild(opt);
    });
}

// ===== DRAG & DROP =====
let draggedMealId = null;
let draggedFromDay = null;

// Migrate old data format (dayIndex -> day)
function migrateMealData(meal) {
    if (meal.dayIndex !== undefined && meal.day === undefined) {
        meal.day = meal.dayIndex;
        delete meal.dayIndex;
    }
    return meal;
}

function setupDragAndDrop(row, mealId, dayIndex) {
    const handle = row.querySelector('.handle');

    handle.setAttribute('draggable', 'true');

    row.setAttribute('data-meal-id', mealId);
    row.setAttribute('data-day', dayIndex);

    handle.addEventListener('dragstart', (e) => {
        draggedMealId = mealId;
        draggedFromDay = dayIndex;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', mealId);
        row.classList.add('dragging');
    });

    handle.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        draggedMealId = null;
        draggedFromDay = null;
        document.querySelectorAll('.dayCard').forEach(card => {
            card.classList.remove('drag-over');
        });
    });
}

function setupDropZone(card, dayIndex, mealsContainer) {
    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!card.classList.contains('drag-over')) {
            card.classList.add('drag-over');
        }
    });

    card.addEventListener('dragleave', (e) => {
        // Only remove if we're leaving the card entirely
        if (!card.contains(e.relatedTarget)) {
            card.classList.remove('drag-over');
        }
    });

    mealsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('drag-over');

        if (!draggedMealId) return;

        const meals = getMeals().map(migrateMealData);
        const meal = meals.find(m => m.id === draggedMealId);
        if (!meal) return;

        // Ensure meal has day property
        if (meal.day === undefined && meal.dayIndex !== undefined) {
            meal.day = meal.dayIndex;
            delete meal.dayIndex;
        }

        const targetDay = dayIndex;
        const allDayMeals = meals.filter(m => {
            const mDay = m.day !== undefined ? m.day : m.dayIndex;
            return mDay === targetDay;
        }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // Remove dragged meal from list
        const dayMeals = allDayMeals.filter(m => m.id !== meal.id);

        // Find insertion point
        const dropTarget = e.target.closest('.mealRow');
        let insertIndex = dayMeals.length;

        if (dropTarget && dropTarget.getAttribute('data-meal-id') !== draggedMealId) {
            const targetMealId = dropTarget.getAttribute('data-meal-id');
            const targetMeal = dayMeals.find(m => m.id === targetMealId);
            if (targetMeal) {
                insertIndex = dayMeals.indexOf(targetMeal);
            }
        }

        // Update meal
        meal.day = targetDay;
        dayMeals.splice(insertIndex, 0, meal);

        // Recalculate orders for target day
        dayMeals.forEach((m, idx) => {
            m.order = idx;
        });

        // Recalculate orders for source day if different
        if (draggedFromDay !== targetDay) {
            const sourceDayMeals = meals.filter(m => {
                const mDay = m.day !== undefined ? m.day : m.dayIndex;
                return mDay === draggedFromDay && m.id !== meal.id;
            }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            sourceDayMeals.forEach((m, idx) => {
                m.order = idx;
            });
        }

        // Save all meals
        setMeals(meals);
        renderMeals();
    });
}

// ===== RENDER meals =====
function renderMeals() {
    const meals = getMeals().map(migrateMealData);

    daysContainer.innerHTML = '';
    DAYS.forEach((dayName, dayIndex) => {
        const card = document.createElement('div');
        card.className = 'dayCard';

        const header = document.createElement('div');
        header.className = 'dayHeader';

        const title = document.createElement('div');
        title.className = 'dayTitle';
        title.textContent = dayName;

        header.appendChild(title);
        card.appendChild(header);

        const dayMeals = meals
            .filter(m => {
                const mDay = m.day !== undefined ? m.day : m.dayIndex;
                return mDay === dayIndex;
            })
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const mealsContainer = document.createElement('div');
        mealsContainer.className = 'mealsContainer';

        dayMeals.forEach(m => {
            const row = document.createElement('div');
            row.className = 'mealRow';

            const left = document.createElement('div');
            left.className = 'mealName';
            left.textContent = m.name;

            const actions = document.createElement('div');
            actions.className = 'mealActions';

            const handle = document.createElement('div');
            handle.className = 'handle';
            handle.textContent = '≡';

            const del = document.createElement('button');
            del.className = 'deleteBtn';
            del.textContent = '🗑';
            del.addEventListener('click', (e) => {
                e.stopPropagation();
                const allMeals = getMeals().map(migrateMealData);
                const next = allMeals.filter(x => x.id !== m.id);
                setMeals(next);
                renderMeals();
            });

            actions.appendChild(handle);
            actions.appendChild(del);

            row.appendChild(left);
            row.appendChild(actions);

            setupDragAndDrop(row, m.id, dayIndex);
            mealsContainer.appendChild(row);
        });

        card.appendChild(mealsContainer);
        setupDropZone(card, dayIndex, mealsContainer);
        
        // Kliknięcie na kafelek dnia otwiera modal z ustawionym dniem
        card.addEventListener('click', (e) => {
            // Nie otwieraj modala jeśli kliknięto na mealRow lub jego elementy
            if (e.target.closest('.mealRow')) {
                return;
            }
            openModal(dayIndex);
        });
        
        daysContainer.appendChild(card);
    });
}

// ===== CLEAR meals =====
clearMealsBtn.addEventListener('click', () => {
    const ok = confirm('Wyczyścić wszystkie dania z tygodnia?');
    if (!ok) return;
    setMeals([]);
    setIngredients([]); // wyczyść też składniki (ale nie katalog)
    renderMeals();
    renderIngredients();
});

// ===== AUTOCOMPLETE (prosty) =====
function showSuggest(box, items, onPick) {
    box.innerHTML = '';
    items.slice(0, 6).forEach(name => {
        const div = document.createElement('div');
        div.className = 'suggest__item';
        div.textContent = name;
        div.addEventListener('click', () => onPick(name));
        box.appendChild(div);
    });
    box.style.display = items.length ? 'block' : 'none';
}

function hideSuggest(box) {
    box.style.display = 'none';
    box.innerHTML = '';
}

function suggestFor(query) {
    const q = norm(query);
    if (q.length < 3) return [];
    const cat = getCatalog();
    return cat
        .filter(x => norm(x).includes(q))
        .slice(0, 6);
}

function bindSuggest(inputEl, boxEl, onPick) {
    inputEl.addEventListener('input', () => {
        const list = suggestFor(inputEl.value);
        showSuggest(boxEl, list, (picked) => {
            inputEl.value = picked;
            hideSuggest(boxEl);
            onPick?.(picked);
        });
    });
    inputEl.addEventListener('blur', () => {
        // małe opóźnienie, żeby klik w sugestię zadziałał
        setTimeout(() => hideSuggest(boxEl), 120);
    });
}

bindSuggest(ingredientInputModal, suggestModal, (picked) => {
    // Po kliknięciu na podpowiedź w modalu - od razu dodaj do listy
    ingredientInputModal.value = picked;
    addIngredientToModal();
});

bindSuggest(ingredientInputMain, suggestMain, (picked) => {
    // Po kliknięciu na podpowiedź na ekranie głównym - od razu dodaj do listy
    ingredientInputMain.value = picked;
    addIngredientFromMain();
});

// ===== MODAL ingredients list =====
function renderModalIngredients() {
    modalIngredientsList.innerHTML = '';
    modalIngredients.forEach((ing, idx) => {
        const li = document.createElement('li');
        li.className = 'li';

        const quantityControls = document.createElement('div');
        quantityControls.className = 'quantityControls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantityBtn';
        minusBtn.textContent = '−';
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ing.quantity > 1) {
                ing.quantity--;
                renderModalIngredients();
            }
        });

        const quantityDisplay = document.createElement('span');
        quantityDisplay.className = 'quantityDisplay';
        quantityDisplay.textContent = ing.quantity;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantityBtn';
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            ing.quantity++;
            renderModalIngredients();
        });

        quantityControls.appendChild(minusBtn);
        quantityControls.appendChild(quantityDisplay);
        quantityControls.appendChild(plusBtn);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'ingredientName';
        nameSpan.textContent = ing.name;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'smallBtn';
        deleteBtn.textContent = '✕';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modalIngredients = modalIngredients.filter((_, i) => i !== idx);
            renderModalIngredients();
        });

        li.appendChild(quantityControls);
        li.appendChild(nameSpan);
        li.appendChild(deleteBtn);
        modalIngredientsList.appendChild(li);
    });
}

function addToCatalog(name) {
    const n = name.trim();
    if (!n) return;
    const key = norm(n);
    const cat = getCatalog();
    const exists = cat.some(x => norm(x) === key);
    if (!exists) {
        cat.unshift(n);
        setCatalog(cat);
    }
}

function addIngredientToModal() {
    const value = ingredientInputModal.value.trim();
    if (!value) return;

    // unikamy duplikatów w obrębie jednego dania
    if (!modalIngredients.some(x => norm(x.name) === norm(value))) {
        modalIngredients.push({ name: value, quantity: 1 });
    }

    addToCatalog(value);

    ingredientInputModal.value = '';
    renderModalIngredients();
    ingredientInputModal.focus();
}

addIngredientModalBtn.addEventListener('click', addIngredientToModal);
ingredientInputModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredientToModal();
});

// ===== SAVE meal =====
function ensureIngredientsAdded(ingredientList) {
    const list = getIngredients();
    const map = new Map(list.map(i => [norm(i.name), i]));

    ingredientList.forEach(ing => {
        const name = typeof ing === 'string' ? ing : ing.name;
        const quantity = typeof ing === 'string' ? 1 : (ing.quantity || 1);
        const key = norm(name);
        if (!key) return;
        if (!map.has(key)) {
            list.unshift({
                id: uid(),
                name: name.trim(),
                quantity: quantity,
                bought: false,
                createdAt: Date.now()
            });
            map.set(key, true);
        } else {
            // Jeśli składnik już istnieje, aktualizuj quantity (sumuj)
            const existing = list.find(i => norm(i.name) === key);
            if (existing) {
                existing.quantity = (existing.quantity || 1) + quantity;
            }
        }
    });

    setIngredients(list);
}

saveMealBtn.addEventListener('click', () => {
    const day = Number(daySelect.value);
    const mealName = mealNameInput.value.trim();

    if (!mealName) {
        alert('Wpisz nazwę dania.');
        mealNameInput.focus();
        return;
    }

    // dodaj do listy dań
    const meals = getMeals().map(migrateMealData);
    const dayMeals = meals.filter(m => m.day === day);
    const maxOrder = dayMeals.length > 0
        ? Math.max(...dayMeals.map(m => m.order ?? 0))
        : -1;
    const nextOrder = maxOrder + 1;

    meals.push({
        id: uid(),
        day,
        name: mealName,
        ingredients: modalIngredients.map(ing => typeof ing === 'string' ? { name: ing, quantity: 1 } : ing),
        order: nextOrder
    });

    setMeals(meals);

    // składniki z modala trafiają na listę składników
    if (modalIngredients.length) {
        ensureIngredientsAdded(modalIngredients);
    }

    closeModal();
    renderMeals();
    renderIngredients();
});

// ===== INGREDIENTS screen =====
function renderIngredients() {
    const list = getIngredients().slice();

    // niekupione na górze, kupione na dole
    list.sort((a, b) => Number(a.bought) - Number(b.bought));

    ingredientsList.innerHTML = '';
    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'li';
        if (item.bought) {
            li.classList.add('li--bought');
        }

        const quantityControls = document.createElement('div');
        quantityControls.className = 'quantityControls';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'quantityBtn';
        minusBtn.textContent = '−';
        minusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = getIngredients();
            const idx = all.findIndex(x => x.id === item.id);
            if (idx >= 0 && all[idx].quantity > 1) {
                all[idx].quantity--;
                setIngredients(all);
                renderIngredients();
            }
        });

        const quantityDisplay = document.createElement('span');
        quantityDisplay.className = 'quantityDisplay';
        quantityDisplay.textContent = item.quantity || 1;

        const plusBtn = document.createElement('button');
        plusBtn.className = 'quantityBtn';
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = getIngredients();
            const idx = all.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                all[idx].quantity = (all[idx].quantity || 1) + 1;
                setIngredients(all);
                renderIngredients();
            }
        });

        quantityControls.appendChild(minusBtn);
        quantityControls.appendChild(quantityDisplay);
        quantityControls.appendChild(plusBtn);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'ingredientName';
        nameSpan.textContent = item.name;
        if (item.bought) nameSpan.className = 'ingredientName liStrike';

        // Kliknięcie na nazwę zmienia status
        nameSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            const all = getIngredients();
            const idx = all.findIndex(x => x.id === item.id);
            if (idx >= 0) {
                all[idx].bought = !all[idx].bought;
                setIngredients(all);
                renderIngredients();
            }
        });

        li.appendChild(quantityControls);
        li.appendChild(nameSpan);
        ingredientsList.appendChild(li);
    });
}

function addIngredientFromMain() {
    const value = ingredientInputMain.value.trim();
    if (!value) return;

    addToCatalog(value);

    const list = getIngredients();
    const existingIdx = list.findIndex(x => norm(x.name) === norm(value));
    if (existingIdx >= 0) {
        // Jeśli składnik już istnieje, zwiększ quantity
        list[existingIdx].quantity = (list[existingIdx].quantity || 1) + 1;
    } else {
        list.unshift({
            id: uid(),
            name: value,
            quantity: 1,
            bought: false,
            createdAt: Date.now()
        });
    }
    setIngredients(list);
    renderIngredients();

    ingredientInputMain.value = '';
    ingredientInputMain.focus();
}

addIngredientMainBtn.addEventListener('click', addIngredientFromMain);
ingredientInputMain.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addIngredientFromMain();
});

// ===== INIT =====
initDaySelect();
setScreen('meals');
renderMeals();
renderIngredients();
