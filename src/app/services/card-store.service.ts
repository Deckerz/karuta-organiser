import { Injectable, Signal, computed, signal } from '@angular/core';
import { Card } from '../../models/card';

export type ChangeEventPayload =
    | { type: 'imported'; timestamp: number; count: number }
    | { type: 'group.added'; timestamp: number; name: string }
    | { type: 'group.removed'; timestamp: number; name: string; affected: number; cards: { code: string; number: string }[] }
    | { type: 'card.tag.assigned'; timestamp: number; code: string; number: string; toTag: string; fromTag?: string | null }
    | { type: 'card.tag.unassigned'; timestamp: number; code: string; number: string; fromTag?: string | null };

export type ChangeEvent = ChangeEventPayload & { id: number };

@Injectable({ providedIn: 'root' })
export class CardStoreService {
    private readonly _cards = signal<Card[]>([]);
    readonly cards: Signal<Card[]> = this._cards.asReadonly();
    readonly count = computed(() => this._cards().length);

    // Managed groups (tags). Can include empty groups to allow pre-creation.
    private readonly _groups = signal<string[]>([]);
    readonly groups: Signal<string[]> = this._groups.asReadonly();

    // Change events
    private readonly _events = signal<ChangeEvent[]>([]);
    readonly events = this._events.asReadonly();

    private _nextEventId = 1;
    private pushEvent(ev: ChangeEventPayload) {
        // Keep full history in memory
        const withId: ChangeEvent = { id: this._nextEventId++, ...ev };
        this._events.update(list => [...list, withId]);
    }

    // Baseline tags snapshot at import time to reconstruct state for undos
    private _baselineTags = new Map<string, string | null>();
    private keyFor(code: string) { return `${code}`; }

    // region: persistence
    private readonly STORAGE_KEYS = {
        version: 'kco.version',
        cards: 'kco.cards',
        groups: 'kco.groups',
        events: 'kco.events',
        baseline: 'kco.baseline',
        nextId: 'kco.nextEventId',
    } as const;
    private readonly STORAGE_VERSION = '1';

    private hasStorage(): boolean {
        try {
            return typeof window !== 'undefined' && !!window.localStorage;
        } catch {
            return false;
        }
    }

    private persist() {
        if (!this.hasStorage()) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.version, this.STORAGE_VERSION);
            // Cards as plain objects
            const plainCards = this._cards().map(c => ({
                code: c.code,
                number: c.number,
                edition: c.edition,
                character: c.character,
                series: c.series,
                quality: c.quality,
                obtainedDate: c.obtainedDate,
                obtainedTimestamp: c.obtainedTimestamp,
                burnValue: c.burnValue,
                dye: { code: c.dye?.code ?? null, name: c.dye?.name ?? null },
                frame: c.frame,
                morphed: c.morphed,
                trimmed: c.trimmed,
                tag: c.tag,
                alias: c.alias,
                wishlists: c.wishlists,
                fights: c.fights,
                dropQuality: c.dropQuality,
                dropper: c.dropper,
                grabber: c.grabber,
                guild: c.guild,
                worker: {
                    effort: c.worker?.effort ?? null,
                    style: c.worker?.style ?? null,
                    purity: c.worker?.purity ?? null,
                    grabber: c.worker?.grabber ?? null,
                    dropper: c.worker?.dropper ?? null,
                    quickness: c.worker?.quickness ?? null,
                    toughness: c.worker?.toughness ?? null,
                    vanity: c.worker?.vanity ?? null,
                    recoveryDate: c.worker?.recoveryDate ?? null,
                    recoveryTimestamp: c.worker?.recoveryTimestamp ?? null,
                },
            }));
            localStorage.setItem(this.STORAGE_KEYS.cards, JSON.stringify(plainCards));
            localStorage.setItem(this.STORAGE_KEYS.groups, JSON.stringify(this._groups()));
            localStorage.setItem(this.STORAGE_KEYS.events, JSON.stringify(this._events()));
            localStorage.setItem(this.STORAGE_KEYS.nextId, String(this._nextEventId));
            localStorage.setItem(this.STORAGE_KEYS.baseline, JSON.stringify(Array.from(this._baselineTags.entries())));
        } catch {
            // best-effort persist
        }
    }

    private hydrateFromStorage() {
        if (!this.hasStorage()) return;
        try {
            const ver = localStorage.getItem(this.STORAGE_KEYS.version);
            if (ver !== this.STORAGE_VERSION) return;
            const rawCards = localStorage.getItem(this.STORAGE_KEYS.cards);
            const rawGroups = localStorage.getItem(this.STORAGE_KEYS.groups);
            const rawEvents = localStorage.getItem(this.STORAGE_KEYS.events);
            const rawNext = localStorage.getItem(this.STORAGE_KEYS.nextId);
            const rawBaseline = localStorage.getItem(this.STORAGE_KEYS.baseline);
            if (!rawCards || !rawGroups || !rawEvents || !rawNext || !rawBaseline) return;
            const parsedCards = JSON.parse(rawCards) as Array<Partial<Card> & { code: string; number: string }>;
            const parsedGroups = JSON.parse(rawGroups) as string[];
            const parsedEvents = JSON.parse(rawEvents) as ChangeEvent[];
            const parsedNext = Number(rawNext) || 1;
            const parsedBaseline = new Map<string, string | null>(JSON.parse(rawBaseline) as [string, string | null][]);
            // Apply
            const cards = parsedCards.map(pc => new Card({ ...pc, code: pc.code, number: pc.number }));
            this._cards.set(cards);
            this._groups.set(parsedGroups);
            this._events.set(parsedEvents);
            this._nextEventId = parsedNext;
            this._baselineTags = parsedBaseline;
        } catch {
            // Corrupt storage; ignore
        }
    }
    // endregion

    constructor() {
        this.hydrateFromStorage();
    }

    setCards(list: Card[]) {
        // Wipe entire store and start fresh
        this._cards.set([]);
        this._groups.set([]);
        this._events.set([]);
        this._nextEventId = 1;
        this._baselineTags.clear();
        // Load new cards
        this._cards.set(list);
        // Baseline tags at import
        for (const c of list) this._baselineTags.set(this.keyFor(c.code), c.tag ?? null);
        // Derive groups from tags present in the new list only
        const present = new Set<string>();
        for (const c of list) {
            const t = c.tag?.trim();
            if (t) present.add(t);
        }
        this._groups.set(Array.from(present).sort((a, b) => a.localeCompare(b)));
        this.pushEvent({ type: 'imported', timestamp: Date.now(), count: list.length });
        this.persist();
    }

    clear() {
        this._cards.set([]);
        this._groups.set([]);
        this._events.set([]);
        this._nextEventId = 1;
        this._baselineTags.clear();
        // Clear storage
        if (this.hasStorage()) {
            try {
                localStorage.removeItem(this.STORAGE_KEYS.cards);
                localStorage.removeItem(this.STORAGE_KEYS.groups);
                localStorage.removeItem(this.STORAGE_KEYS.events);
                localStorage.removeItem(this.STORAGE_KEYS.nextId);
                localStorage.removeItem(this.STORAGE_KEYS.baseline);
                localStorage.removeItem(this.STORAGE_KEYS.version);
            } catch {
                // ignore
            }
        }
    }

    addGroup(name: string) {
        const n = name.trim();
        if (!n) return;
        const existed = this._groups().includes(n);
        if (existed) return;
        this._groups.update(g => [...g, n].sort((a, b) => a.localeCompare(b)));
        this.pushEvent({ type: 'group.added', timestamp: Date.now(), name: n });
        this.persist();
    }

    removeGroup(name: string) {
        const n = name.trim();
        if (!n) return;
        // Unassign cards from this group
        const toUnassign: { code: string; number: string; fromTag: string | null | undefined }[] = [];
        this._cards.update(list =>
            list.map(c => {
                if (c.tag?.trim() === n) {
                    toUnassign.push({ code: c.code, number: c.number, fromTag: c.tag });
                    return new Card({ ...c, tag: null, code: c.code, number: c.number });
                }
                return c;
            })
        );
        // Remove the group name
        this._groups.update(g => g.filter(x => x !== n));
        const ts = Date.now();
        this.pushEvent({ type: 'group.removed', timestamp: ts, name: n, affected: toUnassign.length, cards: toUnassign.map(u => ({ code: u.code, number: u.number })) });
        for (const u of toUnassign) {
            this.pushEvent({ type: 'card.tag.unassigned', timestamp: ts, code: u.code, number: u.number, fromTag: u.fromTag });
        }
        this.persist();
    }

    assignCardTag(code: string, number: string, toTag: string) {
        const tag = toTag.trim();
        if (!tag) return;
        let fromTag: string | null | undefined = null;
        let updated = false;
        this._cards.update(list =>
            list.map(c => {
                if (c.code === code && c.number === number) {
                    fromTag = c.tag;
                    updated = true;
                    return new Card({ ...c, tag, code: c.code, number: c.number });
                }
                return c;
            })
        );
        if (updated) {
            this.addGroup(tag);
            this.pushEvent({ type: 'card.tag.assigned', timestamp: Date.now(), code, number, toTag: tag, fromTag });
            this.persist();
        }
    }

    unassignCardTag(code: string, number: string) {
        let fromTag: string | null | undefined = null;
        let updated = false;
        this._cards.update(list =>
            list.map(c => {
                if (c.code === code && c.number === number) {
                    fromTag = c.tag;
                    if (c.tag != null) updated = true;
                    return new Card({ ...c, tag: null, code: c.code, number: c.number });
                }
                return c;
            })
        );
        if (updated) {
            this.pushEvent({ type: 'card.tag.unassigned', timestamp: Date.now(), code, number, fromTag });
            this.persist();
        }
    }

    // Compute the tag for a card after applying all events strictly before indexExclusive
    private computeTagForCardUntil(code: string, number: string, indexExclusive: number): string | null {
        const key = this.keyFor(code);
        let tag = this._baselineTags.get(key) ?? null;
        const list = this._events();
        for (let i = 0; i < indexExclusive && i < list.length; i++) {
            const e = list[i];
            if (e.type === 'card.tag.assigned' && e.code === code && e.number === number) tag = e.toTag;
            else if (e.type === 'card.tag.unassigned' && e.code === code && e.number === number) tag = null;
        }
        return tag;
    }

    // Set card tag without emitting events
    private setCardTagSilently(code: string, number: string, tag: string | null) {
        if (tag) this.addGroupSilently(tag);
        this._cards.update(list =>
            list.map(c => (c.code === code && c.number === number ? new Card({ ...c, tag, code: c.code, number: c.number }) : c))
        );
    }

    // Add group without emitting an event
    private addGroupSilently(name: string) {
        const n = name.trim();
        if (!n) return;
        this._groups.update(g => (g.includes(n) ? g : [...g, n].sort((a, b) => a.localeCompare(b))));
    }

    // Undo an event by id for card tag changes; also removes subsequent events for the same card
    undoEvent(id: number) {
        const events = this._events();
        const idx = events.findIndex(e => e.id === id);
        if (idx < 0) return;
        const target = events[idx];
        if (target.type === 'card.tag.assigned' || target.type === 'card.tag.unassigned') {
            const code = target.code;
            const number = target.number;
            // Compute desired tag by replaying up to the target index
            const desiredTag = this.computeTagForCardUntil(code, number, idx);
            this.setCardTagSilently(code, number, desiredTag);
            // Prune all events from target index onward that refer to this card
            const pruned: ChangeEvent[] = [];
            for (let i = 0; i < events.length; i++) {
                const e = events[i];
                if (i >= idx && ((e.type === 'card.tag.assigned' || e.type === 'card.tag.unassigned') && e.code === code && e.number === number)) {
                    continue; // drop
                }
                pruned.push(e);
            }
            this._events.set(pruned);
            this.persist();
            return;
        }
        if (target.type === 'group.removed') {
            // Restore group silently
            this.addGroupSilently(target.name);
            // Restore tags for affected cards
            for (const c of target.cards) {
                this.setCardTagSilently(c.code, c.number, target.name);
            }
            // Prune subsequent tag events for affected cards
            const affectedKeys = new Set(target.cards.map(c => this.keyFor(c.code)));
            const pruned: ChangeEvent[] = [];
            for (let i = 0; i < events.length; i++) {
                const e = events[i];
                // Drop the group.removed event itself
                if (i === idx) continue;
                if (i >= idx && (e.type === 'card.tag.assigned' || e.type === 'card.tag.unassigned')) {
                    if (affectedKeys.has(this.keyFor(e.code))) continue; // drop
                }
                pruned.push(e);
            }
            this._events.set(pruned);
            this.persist();
            return;
        }
    }

    // Generate commands from the activity log
    // Mapping:
    //  - group.added => ktc <group> <emoji>
    //  - group.removed => ktd <group>
    //  - card.tag.assigned => kt <group> <code-list max 20>
    //  - card.tag.unassigned => kut <code-list max 20>
    // Rules:
    //  - If a card's final state is assigned to a group, skip emitting its unassign command
    generateCommands(): string[] {
        const commands: string[] = [];

        // Cards that end up assigned (skip unassign for these)
        const finalAssignedKeys = new Set<string>();
        for (const c of this._cards()) {
            const t = c.tag?.trim();
            if (t) finalAssignedKeys.add(this.keyFor(c.code));
        }

        // Accumulators for batching
        const assignedByGroup = new Map<string, string[]>();
        let unassignedCodes: string[] = [];

        const flush = () => {
            // Flush assigned per group, in chunks of 20
            for (const [group, codes] of assignedByGroup) {
                let i = 0;
                while (i < codes.length) {
                    const chunk = codes.slice(i, i + 20);
                    commands.push(`kt ${group} ${chunk.join(' ')}`);
                    i += 20;
                }
            }
            assignedByGroup.clear();
            // Flush unassigned in chunks of 20
            let j = 0;
            while (j < unassignedCodes.length) {
                const chunk = unassignedCodes.slice(j, j + 20);
                commands.push(`kut ${chunk.join(' ')}`);
                j += 20;
            }
            unassignedCodes = [];
        };

        const emojiFor = (name: string): string => {
            const emojis = ['🔥', '✨', '⭐', '🎯', '🧩', '🟦', '🟪', '💫', '🛡️', '🎴'];
            let h = 0;
            for (let i = 0; i < name.length; i++) {
                h = (h * 31 + name.charCodeAt(i)) >>> 0;
            }
            return emojis[h % emojis.length];
        };

        const evts = this._events();
        for (const e of evts) {
            switch (e.type) {
                case 'group.added': {
                    flush();
                    commands.push(`ktc ${e.name} ${emojiFor(e.name)}`);
                    break;
                }
                case 'group.removed': {
                    flush();
                    commands.push(`ktd ${e.name}`);
                    break;
                }
                case 'card.tag.assigned': {
                    const list = assignedByGroup.get(e.toTag) ?? [];
                    list.push(e.code);
                    assignedByGroup.set(e.toTag, list);
                    break;
                }
                case 'card.tag.unassigned': {
                    const key = this.keyFor(e.code);
                    if (!finalAssignedKeys.has(key)) {
                        unassignedCodes.push(e.code);
                    }
                    break;
                }
                case 'imported':
                default:
                    // No command
                    break;
            }
        }

        // Final flush
        flush();
        return commands;
    }
}
