import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CardStoreService } from '../../services/card-store.service';
import { Card } from '../../../models/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
// Dialog opened within CardEntry; no dialog needed here
// import { MatDialogModule } from '@angular/material/dialog';
import { CardEntryComponent } from './card-entry/card-entry';
import type { ChangeEvent } from '../../services/card-store.service';

@Component({
  selector: 'app-cards-page',
  imports: [CommonModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDialogModule, CardEntryComponent],
  templateUrl: './cards.page.html',
  styleUrl: './cards.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardsPage {
  private readonly store = inject(CardStoreService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  readonly cards = computed(() => this.store.cards());

  readonly untagged = computed(() => {
    const byNewest = (a: Card, b: Card) => {
      const ta = a.obtainedTimestamp ?? (a.obtainedDate ? Date.parse(a.obtainedDate) : 0);
      const tb = b.obtainedTimestamp ?? (b.obtainedDate ? Date.parse(b.obtainedDate) : 0);
      if (tb !== ta) return tb - ta; // newest first
      // deterministic fallback
      const ak = `${a.code}:${a.number}`;
      const bk = `${b.code}:${b.number}`;
      return bk.localeCompare(ak);
    };
    return this.cards()
      .filter(c => !c.tag || c.tag.trim() === '')
      .sort(byNewest);
  });
  
  // Untagged search
  readonly untaggedSearch = signal('');
  readonly filteredUntagged = computed(() => {
    const q = this.untaggedSearch().trim().toLowerCase();
    if (!q) return this.untagged();
    return this.untagged().filter(c => {
      const name = (c.character ?? '').toLowerCase();
      const series = (c.series ?? '').toLowerCase();
      return name.includes(q) || series.includes(q);
    });
  });

  // Multi-select for untagged
  readonly selectedUntagged = signal(new Set<string>());
  isSelectedUntagged(c: Card) { return this.selectedUntagged().has(`${c.code}:${c.number}`); }
  toggleSelectUntagged(c: Card) {
    const key = `${c.code}:${c.number}`;
    this.selectedUntagged.update(set => {
      const next = new Set(set);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  clearSelectedUntagged() { this.selectedUntagged.set(new Set()); }
  bulkAssignUntagged(tag: string) {
    const t = (tag ?? '').trim();
    if (!t) return;
    for (const c of this.filteredUntagged()) {
      if (this.isSelectedUntagged(c)) this.store.assignCardTag(c.code, c.number, t);
    }
    this.clearSelectedUntagged();
  }

  // UI model for the bulk-assign dropdown so we can reset it after use
  readonly bulkAssignGroup = signal('');
  onBulkAssignChange(value: string) {
    const v = (value ?? '').trim();
    if (v) this.bulkAssignUntagged(v);
    // Reset select back to placeholder via signal
    this.bulkAssignGroup.set('');
  }

  readonly groups = computed(() => {
    const map = new Map<string, Card[]>();
    for (const c of this.cards()) {
      const t = c.tag?.trim();
      if (!t) continue;
      const list = map.get(t) ?? [];
      list.push(c);
      map.set(t, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, list]) => ({ tag, list }));
  });

  // Fast lookup of counts per group for manager display
  readonly groupCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const c of this.cards()) {
      const t = c.tag?.trim();
      if (!t) continue;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return counts;
  });
  countForGroup(name: string): number { return this.groupCounts().get(name) ?? 0; }

  // Search within grouped (tagged) cards by name or series
  readonly groupSearch = signal('');
  readonly filteredGroups = computed(() => {
    const q = this.groupSearch().trim().toLowerCase();
    if (!q) return this.groups();
    return this.groups()
      .map(g => {
        const tagMatch = g.tag.toLowerCase().includes(q);
        const list = tagMatch
          ? g.list
          : g.list.filter(c => (c.character ?? '').toLowerCase().includes(q) || (c.series ?? '').toLowerCase().includes(q));
        return { tag: g.tag, list };
      })
      .filter(g => g.list.length > 0);
  });
  readonly groupedCount = computed(() => this.groups().reduce((acc, g) => acc + g.list.length, 0));
  readonly filteredGroupedCount = computed(() => this.filteredGroups().reduce((acc, g) => acc + g.list.length, 0));

  trackBy(c: { code: string; number: string }) {
    return `${c.code}:${c.number}`;
  }

  trackGroup(g: { tag: string; list: Card[] }) {
    return g.tag;
  }

  // UI state for group creation
  newGroupName = signal('');

  addGroup() {
    const name = this.newGroupName().trim();
    if (!name) return;
    this.store.addGroup(name);
    this.newGroupName.set('');
  }

  addGroupFromInput(value: string) {
    const name = (value ?? '').trim();
    if (!name) return;
    this.store.addGroup(name);
  }

  deleteGroup(name: string) {
    this.store.removeGroup(name);
  }

  readonly managedGroups = computed(() => this.store.groups());

  // Recent activity (latest first)
  readonly activity = computed<ChangeEvent[]>(() => [...this.store.events()].slice(-50).reverse());

  undoEvent(e: ChangeEvent) {
    if (
      e.type === 'card.tag.assigned' ||
      e.type === 'card.tag.unassigned' ||
      e.type === 'group.removed'
    ) {
      this.store.undoEvent(e.id);
    }
  }

  // Group assignment actions
  assignToGroup(card: Card, group: string) {
    const tag = (group ?? '').trim();
    if (!tag) return;
    this.store.assignCardTag(card.code, card.number, tag);
  }

  unassign(card: Card) {
    this.store.unassignCardTag(card.code, card.number);
  }

  moveToGroup(card: Card, group: string) {
    const tag = (group ?? '').trim();
    if (!tag || tag === (card.tag ?? '').trim()) return;
    this.store.assignCardTag(card.code, card.number, tag);
  }

  openCommandsDialog() {
    const commands = this.store.generateCommands();
    import('./commands-dialog/commands-dialog').then(m => {
      this.dialog.open(m.CommandsDialogComponent, {
        data: { commands },
        autoFocus: false,
        panelClass: 'commands-dialog-panel',
      });
    });
  }

  // Confirm and clear all imported data, then navigate back to Import page
  confirmClear() {
    const ok = typeof window !== 'undefined' && window.confirm(
      'This will remove all imported cards, groups, and activity. This cannot be undone. Continue?'
    );
    if (!ok) return;
    this.store.clear();
    // Navigate to import page
    this.router.navigateByUrl('/');
  }
}
