import { Ajax } from './lib/ajax.js';
import { store } from './lib/store.js';
import './components/champion-card.js';

const CHAMP_URL = './data/champions.json';
const ITEM_URL = './data/item.json';

const app = {
    editingChampionId: null,
    editingSlotIndex: null,

    init: async () => {
        const ajax = new Ajax();

        store.subscribe('championsLoaded', app.renderList);
        store.subscribe('stateChange', app.renderList);
        store.subscribe('teamChange', app.updateTeamView);
        const btnList = document.getElementById('nav-list');
        const btnTeam = document.getElementById('nav-team');
        if (btnList)
            btnList.addEventListener('click', () => app.changeView('list'));
        if (btnTeam)
            btnTeam.addEventListener('click', () => app.changeView('team'));
        const btnResetList = document.getElementById('btn-reset-list');
        if (btnResetList)
            btnResetList.addEventListener('click', app.handleReset);
        const btnResetTeam = document.getElementById('btn-reset-team');
        if (btnResetTeam)
            btnResetTeam.addEventListener('click', app.handleReset);
        app.updateTeamView(store.state);
        app.initDragAndDrop();
        app.initShop();

        app.initTooltip();
        try {
            console.log('Pobieranie danych...');
            const [champData, itemData] = await Promise.all([
                ajax.get(CHAMP_URL),
                ajax.get(ITEM_URL),
            ]);

            store.setChampions(champData.data);
            store.setItems(itemData.data);
            app.renderShop(itemData.data);
        } catch (error) {
            console.error(error);
            document.getElementById('champions-list').innerText =
                'Błąd wczytywania danych.';
        }

        app.initFilters();
    },

    initShop: () => {
        document.body.addEventListener('item-click', (e) => {
            app.openShop(e.detail.championId, e.detail.slotIndex);
        });
        document.body.addEventListener('item-remove', (e) => {
            store.equipItem(e.detail.championId, e.detail.slotIndex, null);
            document.getElementById('global-tooltip').classList.add('hidden');
        });

        document
            .getElementById('close-shop')
            .addEventListener('click', app.closeShop);
    },

    initTooltip: () => {
        const tooltip = document.getElementById('global-tooltip');
        const tTitle = document.getElementById('tooltip-title');
        const tImg = document.getElementById('tooltip-img');
        const tGold = document.getElementById('tooltip-gold');
        const tDesc = document.getElementById('tooltip-desc');

        const updatePosition = (x, y) => {
            const offset = 20;
            const rect = tooltip.getBoundingClientRect();
            const tooltipWidth = rect.width;
            const tooltipHeight = rect.height;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let finalX = x + offset;
            let finalY = y + offset;

            if (y + offset + tooltipHeight > viewportHeight) {
                finalY = y - tooltipHeight - offset;
            }

            if (x + offset + tooltipWidth > viewportWidth) {
                finalX = x - tooltipWidth - offset;
            }

            if (finalY < 0) finalY = 0;

            tooltip.style.left = `${finalX}px`;
            tooltip.style.top = `${finalY}px`;
        };

        document.body.addEventListener('tooltip-show', (e) => {
            const itemId = e.detail.itemId;
            const item = store.getItem(itemId);

            if (item) {
                tTitle.innerText = item.name;
                tImg.src = `https://ddragon.leagueoflegends.com/cdn/15.24.1/img/item/${item.image.full}`;
                tGold.innerText = `${item.gold.total} złota`;
                tDesc.innerHTML = item.description;
                tooltip.classList.remove('hidden');
                if (e.detail.x !== undefined && e.detail.y !== undefined) {
                    updatePosition(e.detail.x, e.detail.y);
                }
            }
        });

        document.body.addEventListener('tooltip-hide', () => {
            tooltip.classList.add('hidden');
        });

        document.body.addEventListener('tooltip-move', (e) => {
            updatePosition(e.detail.x, e.detail.y);
        });
    },

    openShop: (champId, slotIndex) => {
        app.editingChampionId = champId;
        app.editingSlotIndex = slotIndex;
        document.getElementById('item-shop-modal').classList.remove('hidden');
    },

    closeShop: () => {
        document.getElementById('item-shop-modal').classList.add('hidden');
        app.editingChampionId = null;
        app.editingSlotIndex = null;
    },

    renderShop: (items) => {
        const grid = document.getElementById('item-shop-grid');
        grid.innerHTML = '';

        const allItems = Object.values(items);
        const validItems = allItems.filter(
            (item) =>
                item.name && item.image && item.gold && item.gold.total > 0
        );

        if (validItems.length === 0) {
            grid.innerHTML =
                '<p style="color:white; padding:20px;">Brak przedmiotów do wyświetlenia.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        validItems.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            const itemId = item.image.full.replace('.png', '');

            const img = document.createElement('img');
            img.src = `https://ddragon.leagueoflegends.com/cdn/15.24.1/img/item/${item.image.full}`;
            img.alt = item.name;
            img.onerror = () => {
                img.style.display = 'none';
            };
            div.appendChild(img);

            let hoverTimeout;
            let lastX = 0;
            let lastY = 0;

            div.addEventListener('mousemove', (e) => {
                lastX = e.clientX;
                lastY = e.clientY;

                document.body.dispatchEvent(
                    new CustomEvent('tooltip-move', {
                        detail: { x: lastX, y: lastY },
                        bubbles: true,
                    })
                );
            });

            div.addEventListener('mouseenter', (e) => {
                lastX = e.clientX;
                lastY = e.clientY;

                hoverTimeout = setTimeout(() => {
                    document.body.dispatchEvent(
                        new CustomEvent('tooltip-show', {
                            detail: {
                                itemId: itemId,
                                x: lastX,
                                y: lastY,
                            },
                            bubbles: true,
                        })
                    );
                }, 1000);
            });

            div.addEventListener('mouseleave', () => {
                clearTimeout(hoverTimeout);
                document.body.dispatchEvent(new CustomEvent('tooltip-hide'));
            });

            div.addEventListener('click', () => {
                clearTimeout(hoverTimeout);
                document.body.dispatchEvent(new CustomEvent('tooltip-hide'));
                store.equipItem(
                    app.editingChampionId,
                    app.editingSlotIndex,
                    itemId
                );
                app.closeShop();
            });

            fragment.appendChild(div);
        });

        grid.appendChild(fragment);
    },

    handleReset: () => {
        const slotsCount = Object.values(store.state.slots).filter(
            (x) => x
        ).length;
        const teamCount = store.state.team.length;
        if (slotsCount === 0 && teamCount === 0) return;

        if (confirm('Czy zresetować całą drużynę?')) {
            store.resetTeam();
        }
    },

    changeView: (viewName) => {
        const viewList = document.getElementById('view-champions');
        const viewTeam = document.getElementById('view-team');
        const btnList = document.getElementById('nav-list');
        const btnTeam = document.getElementById('nav-team');

        if (viewName === 'list') {
            viewList.classList.remove('hidden');
            viewTeam.classList.add('hidden');
            btnList.classList.add('active');
            btnTeam.classList.remove('active');
            app.renderList(store.state);
        } else if (viewName === 'team') {
            viewList.classList.add('hidden');
            viewTeam.classList.remove('hidden');
            btnList.classList.remove('active');
            btnTeam.classList.add('active');
            app.renderTeamPage();
        }
    },

    renderList: (state) => {
        const listContainer = document.getElementById('champions-list');
        if (listContainer.offsetParent === null) return;
        const currentlyFlippedIds = new Set();
        const existingCards = listContainer.querySelectorAll('champion-card');

        existingCards.forEach((card) => {
            if (card.isFlipped) {
                currentlyFlippedIds.add(card.championId);
            }
        });

        listContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        state.filteredChampions.forEach((champ) => {
            const card = document.createElement('champion-card');
            if (currentlyFlippedIds.has(champ.id)) {
                card.toggleFlip();
            }

            card.data = champ;

            card.addEventListener('click', () => card.toggleFlip());

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                store.toggleTeamMember(champ);
            });

            const onBench = state.team.find((t) => t.id === champ.id);
            const inSlots = Object.values(state.slots).find(
                (s) => s && s.id === champ.id
            );

            if (onBench || inSlots) {
                card.style.opacity = '0.5';
                card.style.filter = 'grayscale(100%)';
                card.title = 'PPM: Usuń z drużyny';
            } else {
                card.title = 'PPM: Dodaj do składu';
            }
            fragment.appendChild(card);
        });

        listContainer.appendChild(fragment);
    },

    updateTeamView: (state) => {
        const slotsCount = Object.values(state.slots).filter(
            (x) => x !== null
        ).length;
        const totalCount = state.team.length + slotsCount;

        const countSpan = document.getElementById('nav-team-count');
        if (countSpan) countSpan.innerText = `(${totalCount})`;

        if (
            !document.getElementById('view-team').classList.contains('hidden')
        ) {
            app.renderTeamPage();
        }
        if (
            !document
                .getElementById('view-champions')
                .classList.contains('hidden')
        ) {
            app.renderList(state);
        }
    },

    renderTeamPage: () => {
        const state = store.state;
        const benchContainer = document.getElementById('bench-container');
        const flippedBenchIds = new Set();
        benchContainer.querySelectorAll('champion-card').forEach((c) => {
            if (c.isFlipped) flippedBenchIds.add(c.championId);
        });

        benchContainer.innerHTML = '';
        state.team.forEach((champ) => {
            const card = document.createElement('champion-card');

            if (flippedBenchIds.has(champ.id)) card.toggleFlip();

            card.setAttribute('show-items', '');
            card.setAttribute('show-items', '');
            card.setAttribute('draggable', 'true');
            card.data = champ;

            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', champ.id);
                e.dataTransfer.setData('source-type', 'bench');
                e.dataTransfer.effectAllowed = 'move';
                card.style.opacity = '0.5';
            });
            card.addEventListener('dragend', () => (card.style.opacity = '1'));

            card.addEventListener('click', () => card.toggleFlip());
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                store.removeFromTeam(champ.id);
            });

            benchContainer.appendChild(card);
        });

        const slots = document.querySelectorAll('.role-slot');
        slots.forEach((slotElement) => {
            const slotName = slotElement.dataset.slot;
            const championInSlot = state.slots[slotName];

            while (slotElement.children.length > 1) {
                slotElement.removeChild(slotElement.lastChild);
            }

            if (championInSlot) {
                const card = document.createElement('champion-card');

                card.setAttribute('show-items', '');
                card.setAttribute('draggable', 'true');

                card.data = championInSlot;

                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', championInSlot.id);
                    e.dataTransfer.setData('source-type', 'slot');
                    e.dataTransfer.setData('source-slot', slotName);
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => (card.style.opacity = '0.5'), 0);
                });

                card.addEventListener(
                    'dragend',
                    () => (card.style.opacity = '1')
                );
                card.addEventListener('click', () => card.toggleFlip());

                card.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    store.clearSlot(slotName);
                });

                slotElement.appendChild(card);
            } else {
                const div = document.createElement('div');
                div.className = 'slot-content';
                div.innerText = 'Przeciągnij tutaj';
                slotElement.appendChild(div);
            }
        });

        const activeChamps = Object.values(state.slots).filter(
            (c) => c !== null
        );

        let totalAD = 0;
        let totalHP = 0;
        let totalArmor = 0;
        let totalMR = 0;

        const roleCounts = {
            Fighter: 0,
            Tank: 0,
            Mage: 0,
            Assassin: 0,
            Support: 0,
            Marksman: 0,
        };

        const STAT_MAP = {
            FlatHPPoolMod: 'hp',
            FlatArmorMod: 'armor',
            FlatSpellBlockMod: 'spellblock',
            FlatPhysicalDamageMod: 'attackdamage',
        };

        activeChamps.forEach((champ) => {
            let currentAD = champ.stats.attackdamage;
            let currentHP = champ.stats.hp;
            let currentArmor = champ.stats.armor;
            let currentMR = champ.stats.spellblock;
            if (champ.items && store.state.itemsDatabase) {
                champ.items.forEach((itemId) => {
                    if (!itemId) return;
                    const item = store.state.itemsDatabase[itemId];
                    if (item && item.stats) {
                        for (const [modName, val] of Object.entries(
                            item.stats
                        )) {
                            const target = STAT_MAP[modName];
                            if (target === 'attackdamage') currentAD += val;
                            if (target === 'hp') currentHP += val;
                            if (target === 'armor') currentArmor += val;
                            if (target === 'spellblock') currentMR += val;
                        }
                    }
                });
            }

            totalAD += currentAD;
            totalHP += currentHP;
            totalArmor += currentArmor;
            totalMR += currentMR;
            champ.tags.forEach((tag) => {
                if (roleCounts[tag] !== undefined) roleCounts[tag]++;
            });
        });

        const pctHP = Math.min((totalHP / 15000) * 100, 100);
        const pctAD = Math.min((totalAD / 1500) * 100, 100);
        const pctArmor = Math.min((totalArmor / 800) * 100, 100);
        const pctMR = Math.min((totalMR / 600) * 100, 100);

        const dashboardHtml = `
            <div class="team-dashboard">
                <div class="dashboard-stats">
                    ${createStatRow(
                        'Atak (AD)',
                        Math.round(totalAD),
                        pctAD,
                        'fill-ad'
                    )}
                    ${createStatRow(
                        'Zdrowie',
                        Math.round(totalHP),
                        pctHP,
                        'fill-hp'
                    )}
                    ${createStatRow(
                        'Pancerz',
                        Math.round(totalArmor),
                        pctArmor,
                        'fill-armor'
                    )}
                    ${createStatRow(
                        'Odp. Magia',
                        Math.round(totalMR),
                        pctMR,
                        'fill-mr'
                    )}
                </div>

                <div class="dashboard-roles">
                    ${createRoleBadge('Wojownik', roleCounts['Fighter'])}
                    ${createRoleBadge('Czołg', roleCounts['Tank'])}
                    ${createRoleBadge('Mag', roleCounts['Mage'])}
                    ${createRoleBadge('Zabójca', roleCounts['Assassin'])}
                    ${createRoleBadge('Strzelec', roleCounts['Marksman'])}
                    ${createRoleBadge('Wsparcie', roleCounts['Support'])}
                </div>
            </div>
        `;

        document.getElementById('team-summary').innerHTML = dashboardHtml;
        document.getElementById('team-summary').className = '';
    },

    initDragAndDrop: () => {
        const slots = document.querySelectorAll('.role-slot');
        slots.forEach((slot) => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });
            slot.addEventListener('dragleave', () =>
                slot.classList.remove('drag-over')
            );

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');

                const championId = e.dataTransfer.getData('text/plain');
                const sourceType = e.dataTransfer.getData('source-type');
                const sourceSlot = e.dataTransfer.getData('source-slot');
                const targetSlot = slot.dataset.slot;

                if (sourceType === 'slot' && sourceSlot === targetSlot) return;

                if (championId) {
                    if (sourceType === 'bench')
                        store.assignToSlot(targetSlot, championId);
                    else if (sourceType === 'slot')
                        store.moveSlotToSlot(sourceSlot, targetSlot);
                }
            });

            slot.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                store.clearSlot(slot.dataset.slot);
            });
        });
    },

    initFilters: () => {
        const roleSelect = document.getElementById('role-select');
        if (roleSelect)
            roleSelect.addEventListener('change', (e) =>
                store.setRole(e.target.value)
            );

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect)
            sortSelect.addEventListener('change', (e) =>
                store.setSort(e.target.value)
            );

        const orderBtn = document.getElementById('sort-order-btn');
        if (orderBtn) {
            orderBtn.addEventListener('click', () => {
                orderBtn.classList.remove('animating');
                void orderBtn.offsetWidth;
                orderBtn.classList.add('animating');
                setTimeout(() => {
                    orderBtn.classList.remove('animating');
                }, 300);

                store.toggleSortOrder();
                const isAsc = store.state.sortAsc;

                setTimeout(() => {
                    orderBtn.innerText = isAsc ? '☰▲' : '☰▼';
                }, 100);
            });
        }
    },
};

function createStatRow(label, value, percent, colorClass) {
    return `
        <div class="stat-row">
            <span class="stat-label-dash">${label}</span>
            <div class="progress-bg">
                <div class="progress-fill ${colorClass}" style="width: ${percent}%"></div>
            </div>
            <span class="stat-val-dash">${value}</span>
        </div>
    `;
}

function createRoleBadge(polName, count) {
    const activeClass = count > 0 ? 'active' : '';
    const style = count === 0 ? 'opacity: 0.4;' : '';
    return `
        <div class="role-badge ${activeClass}" style="${style}">
            <span>${polName}</span>
            ${count > 0 ? `<div class="role-count">${count}</div>` : ''}
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', app.init);
