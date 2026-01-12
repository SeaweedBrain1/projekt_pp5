class Store {
    constructor() {
        this.events = {};
        this.state = {
            champions: [],
            itemsDatabase: {},
            filteredChampions: [],
            favorites: [],
            role: 'all',
            sortBy: 'name',
            sortAsc: true,

            team: [],
            slots: {
                top: null,
                jungle: null,
                mid: null,
                support: null,
                bottom: null,
            },
        };

        const savedTeam = localStorage.getItem('lolTeam');
        if (savedTeam) this.state.team = JSON.parse(savedTeam);

        const savedSlots = localStorage.getItem('lolSlots');
        if (savedSlots) this.state.slots = JSON.parse(savedSlots);
    }

    subscribe(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    notify(event, data = null) {
        if (this.events[event]) {
            this.events[event].forEach((cb) => cb(this.state, data));
        }
    }

    _saveTeamState() {
        localStorage.setItem('lolTeam', JSON.stringify(this.state.team));
        localStorage.setItem('lolSlots', JSON.stringify(this.state.slots));
    }

    setChampions(data) {
        this.state.champions = Object.values(data);
        this._processData();
    }

    setItems(data) {
        this.state.itemsDatabase = data;
    }

    getItem(id) {
        return this.state.itemsDatabase[id];
    }

    setRole(role) {
        this.state.role = role;
        this._processData();
    }

    setSort(key) {
        this.state.sortBy = key;
        this._processData();
    }

    toggleSortOrder() {
        this.state.sortAsc = !this.state.sortAsc;
        this._processData();
    }

    toggleTeamMember(champion) {
        const onBench = this.state.team.some((c) => c.id === champion.id);
        const slotKey = Object.keys(this.state.slots).find(
            (key) =>
                this.state.slots[key] &&
                this.state.slots[key].id === champion.id
        );

        if (onBench) {
            this.removeFromTeam(champion.id);
        } else if (slotKey) {
            this.state.slots[slotKey] = null;
            this._saveTeamState();
            this.notify('teamChange');
        } else {
            this.addToTeam(champion);
        }
        this.notify('stateChange');
    }

    addToTeam(champion) {
        const champCopy = JSON.parse(JSON.stringify(champion));

        const onBench = this.state.team.find((c) => c.id === champCopy.id);
        const inSlots = Object.values(this.state.slots).find(
            (c) => c && c.id === champCopy.id
        );

        if (onBench || inSlots) {
            alert('Ten bohater jest już wybrany!');
            return;
        }

        this.state.team.push(champCopy);
        this._saveTeamState();
        this.notify('teamChange');
    }

    removeFromTeam(championId) {
        this.state.team = this.state.team.filter((c) => c.id !== championId);
        this._saveTeamState();
        this.notify('teamChange');
        this.notify('stateChange');
    }

    resetTeam() {
        this.state.team = [];
        for (const key in this.state.slots) {
            this.state.slots[key] = null;
        }
        this._saveTeamState();
        this.notify('teamChange');
        this.notify('stateChange');
    }

    assignToSlot(slotName, championId) {
        const championIndex = this.state.team.findIndex(
            (c) => c.id === championId
        );
        if (championIndex === -1) return;

        const champion = this.state.team[championIndex];

        if (this.state.slots[slotName]) {
            this.state.team.push(this.state.slots[slotName]);
        }

        this.state.slots[slotName] = champion;
        this.state.team.splice(championIndex, 1);

        this._saveTeamState();
        this.notify('teamChange');
    }

    clearSlot(slotName) {
        if (!this.state.slots[slotName]) return;

        this.state.team.push(this.state.slots[slotName]);
        this.state.slots[slotName] = null;

        this._saveTeamState();
        this.notify('teamChange');
    }

    moveSlotToSlot(fromSlot, toSlot) {
        const charFrom = this.state.slots[fromSlot];
        const charTo = this.state.slots[toSlot];

        if (!charFrom) return;

        this.state.slots[toSlot] = charFrom;
        this.state.slots[fromSlot] = charTo;

        this._saveTeamState();
        this.notify('teamChange');
    }

    equipItem(championId, slotIndex, itemId) {
        let champ = this.state.team.find((c) => c.id === championId);

        if (!champ) {
            champ = Object.values(this.state.slots).find(
                (c) => c && c.id === championId
            );
        }

        if (champ) {
            if (!champ.items)
                champ.items = [null, null, null, null, null, null];
            champ.items[slotIndex] = itemId;

            this._saveTeamState();
            this.notify('teamChange');
        }
    }

    _processData() {
        let result = [...this.state.champions];
        if (this.state.role !== 'all') {
            result = result.filter((c) => c.tags.includes(this.state.role));
        }
        result.sort((a, b) => {
            let valA =
                this.state.sortBy === 'name'
                    ? a.name
                    : a.stats[this.state.sortBy];
            let valB =
                this.state.sortBy === 'name'
                    ? b.name
                    : b.stats[this.state.sortBy];

            if (valA === undefined) valA = 0;
            if (valB === undefined) valB = 0;

            if (valA < valB) return this.state.sortAsc ? -1 : 1;
            if (valA > valB) return this.state.sortAsc ? 1 : -1;
            return 0;
        });
        this.state.filteredChampions = result;
        this.notify('stateChange');
    }
}

export const store = new Store();
