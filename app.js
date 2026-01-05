const input = document.getElementById('itemInput');
const addBtn = document.getElementById('addBtn');
const listEl = document.getElementById('list');

const STORAGE_KEY = 'shopping_items_v1';

function loadItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
        return [];
    }
}

function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render(items) {
    listEl.innerHTML = '';
    for (const item of items) {
        const li = document.createElement('li');

        const left = document.createElement('span');
        left.textContent = item;

        const right = document.createElement('small');
        right.textContent = 'Usuń';

        li.appendChild(left);
        li.appendChild(right);

        li.addEventListener('click', () => {
            const next = loadItems().filter(x => x !== item);
            saveItems(next);
            render(next);
        });

        listEl.appendChild(li);
    }
}

function addItem() {
    const value = input.value.trim();
    if (!value) return;

    const items = loadItems();
    items.unshift(value);
    saveItems(items);

    input.value = '';
    input.focus();
    render(items);
}

addBtn.addEventListener('click', addItem);
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addItem();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            await navigator.serviceWorker.register('/sw.js');
        } catch (e) {
            console.log('SW register failed', e);
        }
    });
}

render(loadItems());
input.focus();
