import { store } from '../lib/store.js';

const template = document.createElement('template');
template.innerHTML = `
    <style>
        *, *::before, *::after { box-sizing: border-box; }

        :host {
            display: block; width: 100%; aspect-ratio: 308 / 560; 
            perspective: 1000px; cursor: pointer;
        }

        .card-inner {
            position: relative; width: 100%; height: 100%; text-align: center;
            transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transform-style: preserve-3d;
        }
        .card-inner.is-flipped { transform: rotateY(180deg); }

        .card-face {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            -webkit-backface-visibility: hidden; backface-visibility: hidden;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            border: 1px solid #333; background: #121212;
        }

        /* --- PRZÓD --- */
        .card-front { border-color: #444; }
        .card-front:hover { border-color: #d4af37; box-shadow: 0 0 15px rgba(212, 175, 55, 0.4); }

        .card-img { width: 100%; height: 100%; object-fit: cover; display: block; }

        .info {
            position: absolute; bottom: 0; left: 0; width: 100%;
            padding: 60px 10px 15px 10px;
            background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 70%, transparent 100%);
            display: flex; flex-direction: column; align-items: center;
        }

        h3 { margin: 0; color: #f0f0f0; font-size: 1.2rem; text-shadow: 0 2px 4px #000; letter-spacing: 1px; }
        .title { margin: 2px 0 8px 0; color: #d4af37; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; text-shadow: 0 1px 2px #000; }

        /* --- GRID PRZEDMIOTÓW --- */
        .items-row {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
            justify-content: center; margin-top: 5px; pointer-events: auto;
        }

        .item-slot {
            width: 38px; height: 38px; border: 1px solid #555;
            background: rgba(0,0,0,0.6); border-radius: 6px; cursor: pointer;
            display: flex; justify-content: center; align-items: center;
            overflow: hidden; transition: all 0.2s;
        }
        .item-slot:hover {
            border-color: #d4af37; background: rgba(212, 175, 55, 0.2); transform: scale(1.1);
        }
        .item-img { width: 100%; height: 100%; object-fit: cover; }

        /* --- TYŁ --- */
        .card-back {
            transform: rotateY(180deg); background: #121212;
            display: flex; flex-direction: column; justify-content: flex-start; 
            padding: 0; border: 1px solid #d4af37;
            overflow-y: auto; scrollbar-width: thin; scrollbar-color: #d4af37 #1e1e1e;
        }
        .card-back::-webkit-scrollbar { width: 8px; }
        .card-back::-webkit-scrollbar-track { background: #1e1e1e; }
        .card-back::-webkit-scrollbar-thumb { background-color: #d4af37; border-radius: 4px; border: 2px solid #1e1e1e; }

        .stats-wrapper { padding: 20px; width: 100%; }
        .back-title {
            margin: 0 0 15px 0; color: #d4af37; text-transform: uppercase;
            font-size: 1.1em; letter-spacing: 2px; border-bottom: 1px solid #333;
            padding-bottom: 10px; position: sticky; top: 0; background: #121212; z-index: 2;
        }
        .stats-table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
        .stats-table tr:nth-child(even) { background-color: rgba(255, 255, 255, 0.03); }
        .stats-table td { padding: 8px 5px; border-bottom: 1px solid #222; }
        .stat-label { text-align: left; color: #888; }
        .stat-value { text-align: right; font-weight: bold; color: #f0f0f0; }
        
        .per-level { font-size: 0.8em; color: #4cd137; font-weight: normal; } /* Przyrosty */
        .bonus-stat { font-size: 0.85em; color: #0acbe6; font-weight: normal; margin-left: 3px; } /* Przedmioty */
    </style>

    <div class="card-inner" id="card-inner">
        <div class="card-face card-front">
            <img class="card-img" id="champ-img" src="" alt="Champion">
            <div class="info">
                <h3 id="champ-name"></h3>
                <p class="title" id="champ-title"></p>
                <div class="items-row" id="items-container" style="display: none;"></div>
            </div>
        </div>
        <div class="card-face card-back">
            <div class="stats-wrapper">
                <h4 class="back-title">Pełne Statystyki</h4>
                <table class="stats-table" id="stats-container"></table>
            </div>
        </div>
    </div>
`;

export class ChampionCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        this._isFlipped = false;
    }

    get isFlipped() {
        return this._isFlipped;
    }
    get championId() {
        return this._champion ? this._champion.id : null;
    }

    set data(champion) {
        this._champion = champion;
        if (!this._champion.items)
            this._champion.items = [null, null, null, null, null, null];
        this.render();
    }

    render() {
        if (!this._champion) return;
        this.shadowRoot.getElementById('champ-name').innerText =
            this._champion.name;
        this.shadowRoot.getElementById('champ-title').innerText =
            this._champion.title;
        this.shadowRoot.getElementById(
            'champ-img'
        ).src = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${this._champion.id}_0.jpg`;

        const itemsContainer =
            this.shadowRoot.getElementById('items-container');
        if (this.hasAttribute('show-items')) {
            itemsContainer.style.display = 'grid';
            itemsContainer.innerHTML = '';
            this._champion.items.forEach((itemId, index) => {
                const slot = document.createElement('div');
                slot.className = 'item-slot';
                if (itemId) {
                    const img = document.createElement('img');
                    img.src = `https://ddragon.leagueoflegends.com/cdn/15.24.1/img/item/${itemId}.png`;
                    img.className = 'item-img';
                    slot.appendChild(img);

                    slot.addEventListener('mouseenter', (e) => {
                        this.dispatchEvent(
                            new CustomEvent('tooltip-show', {
                                detail: {
                                    itemId: itemId,
                                    x: e.clientX,
                                    y: e.clientY,
                                },
                                bubbles: true,
                                composed: true,
                            })
                        );
                    });
                    slot.addEventListener('mouseleave', () =>
                        this.dispatchEvent(
                            new CustomEvent('tooltip-hide', {
                                bubbles: true,
                                composed: true,
                            })
                        )
                    );
                    slot.addEventListener('mousemove', (e) => {
                        this.dispatchEvent(
                            new CustomEvent('tooltip-move', {
                                detail: { x: e.clientX, y: e.clientY },
                                bubbles: true,
                                composed: true,
                            })
                        );
                    });
                } else {
                    slot.innerText = '+';
                    slot.style.color = '#d4af37';
                    slot.style.fontSize = '20px';
                    slot.style.fontWeight = 'bold';
                    slot.style.lineHeight = '0';
                }
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.dispatchEvent(
                        new CustomEvent('item-click', {
                            detail: {
                                championId: this._champion.id,
                                slotIndex: index,
                            },
                            bubbles: true,
                            composed: true,
                        })
                    );
                });
                slot.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (itemId) {
                        this.dispatchEvent(
                            new CustomEvent('item-remove', {
                                detail: {
                                    championId: this._champion.id,
                                    slotIndex: index,
                                },
                                bubbles: true,
                                composed: true,
                            })
                        );
                        this.dispatchEvent(
                            new CustomEvent('tooltip-hide', {
                                bubbles: true,
                                composed: true,
                            })
                        );
                    }
                });
                itemsContainer.appendChild(slot);
            });
        } else {
            itemsContainer.style.display = 'none';
        }

        const s = this._champion.stats;

        let bonuses = {
            hp: 0,
            mp: 0,
            armor: 0,
            spellblock: 0,
            attackdamage: 0,
            attackspeed: 0,
            crit: 0,
            movespeed: 0,
            hpregen: 0,
            mpregen: 0,
        };

        const STAT_MAP = {
            FlatHPPoolMod: 'hp',
            FlatMPPoolMod: 'mp',
            FlatArmorMod: 'armor',
            FlatSpellBlockMod: 'spellblock',
            FlatPhysicalDamageMod: 'attackdamage',
            PercentAttackSpeedMod: 'attackspeed',
            FlatCritChanceMod: 'crit',
            FlatMovementSpeedMod: 'movespeed',
            FlatHPRegenMod: 'hpregen',
        };

        if (this._champion.items && store.state.itemsDatabase) {
            this._champion.items.forEach((itemId) => {
                if (!itemId) return;
                const item = store.state.itemsDatabase[itemId];
                if (item && item.stats) {
                    for (const [modName, value] of Object.entries(item.stats)) {
                        const targetStat = STAT_MAP[modName];
                        if (targetStat) {
                            bonuses[targetStat] += value;
                        }
                    }
                }
            });
        }

        const renderRow = (
            label,
            baseVal,
            bonusVal,
            perLvl,
            isPercent = false
        ) => {
            let totalVal = baseVal;
            let bonusHtml = '';

            if (label === 'Prędk. Ataku' && bonusVal > 0) {
                totalVal = baseVal;
                bonusHtml = `<span class="bonus-stat">(+${Math.round(
                    bonusVal * 100
                )}%)</span>`;
            } else if (label === 'Szansa na Kryt.') {
                totalVal = (baseVal + bonusVal) * 100;
                if (bonusVal > 0) {
                    bonusHtml = `<span class="bonus-stat">(${Math.round(
                        bonusVal * 100
                    )}% z itemów)</span>`;
                    totalVal = Math.round(totalVal) + '%';
                } else {
                    totalVal = Math.round(totalVal) + '%';
                }
            } else {
                totalVal = baseVal + bonusVal;
                if (bonusVal > 0) {
                    bonusHtml = `<span class="bonus-stat">(+${Math.round(
                        bonusVal
                    )})</span>`;
                }
                totalVal = Math.round(totalVal * 10) / 10;
            }

            const growthHtml = perLvl
                ? `<span class="per-level">(+${perLvl})</span>`
                : '';

            return `
            <tr>
                <td class="stat-label">${label}</td>
                <td class="stat-value">
                    ${totalVal} ${bonusHtml} ${growthHtml}
                </td>
            </tr>`;
        };

        const rows = [
            renderRow('Zdrowie (HP)', s.hp, bonuses.hp, s.hpperlevel),
            renderRow('Mana (MP)', s.mp, bonuses.mp, s.mpperlevel),
            renderRow('Pancerz', s.armor, bonuses.armor, s.armorperlevel),
            renderRow(
                'Odp. na Magię',
                s.spellblock,
                bonuses.spellblock,
                s.spellblockperlevel
            ),
            renderRow(
                'Atak (AD)',
                s.attackdamage,
                bonuses.attackdamage,
                s.attackdamageperlevel
            ),
            renderRow(
                'Prędk. Ataku',
                s.attackspeed,
                bonuses.attackspeed,
                s.attackspeedperlevel,
                true
            ),
            renderRow('Szansa na Kryt.', s.crit, bonuses.crit, s.critperlevel),
            renderRow('Prędk. Ruchu', s.movespeed, bonuses.movespeed, null),
            renderRow(
                'Regen. HP',
                s.hpregen,
                bonuses.hpregen,
                s.hpregenperlevel
            ),
            renderRow(
                'Regen. Many',
                s.mpregen,
                bonuses.mpregen,
                s.mpregenperlevel
            ),
            renderRow('Zasięg Ataku', s.attackrange, 0, null),
        ];

        this.shadowRoot.getElementById('stats-container').innerHTML =
            rows.join('');
    }

    toggleFlip() {
        this._isFlipped = !this._isFlipped;
        this.shadowRoot
            .getElementById('card-inner')
            .classList.toggle('is-flipped', this._isFlipped);
    }
}
customElements.define('champion-card', ChampionCard);
