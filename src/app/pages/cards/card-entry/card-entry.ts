import { ChangeDetectionStrategy, Component, computed, input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Card } from '../../../../models/card';
import { CardStoreService } from '../../../services/card-store.service';

@Component({
  selector: 'app-card-entry',
  imports: [CommonModule, MatDialogModule],
  templateUrl: './card-entry.html',
  styleUrls: ['./card-entry.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardEntryComponent {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(CardStoreService);

  card = input.required<Card>();
  current = input<string | null>(null);
  selectable = input(false);
  selected = input(false);
  toggleSelect = output<void>();

  readonly character = computed(() => this.card().character ?? 'Unknown');
  readonly series = computed(() => this.card().series ?? '-');
  readonly edition = computed(() => this.card().edition ?? '-');
  readonly appearance = computed(() => {
    const c = this.card();
    const frame = typeof c.frame === 'string' ? c.frame.trim() : '';
    const dye = c.dye?.name?.trim() || c.dye?.code?.trim() || '';
    if (!frame && !dye) return null;
    const parts: string[] = [];
    if (frame) parts.push(`Frame: ${frame}`);
    if (dye) parts.push(`Dye: ${dye}`);
    return parts.join(' - ');
  });

  openAssign() {
    // Reuse the existing actions dialog for assignment/move
    import('../actions-dialog/actions-dialog').then(m => {
      this.dialog.open(m.ActionsDialogComponent, {
        data: { card: this.card(), current: this.current() },
        panelClass: 'actions-dialog-panel',
        autoFocus: false,
      });
    });
  }

  unassign() {
    const c = this.card();
    if (!this.current()) return;
    this.store.unassignCardTag(c.code, c.number);
  }

  onTileClick(ev: MouseEvent) {
    if (!this.selectable()) return;
    const target = ev.target as HTMLElement | null;
    // Ignore clicks on the menu button or checkbox itself
    if (target && (target.closest('.tile__menu-btn') || target.closest('.tile__delete-btn') || target.closest('.tile__checkbox'))) {
      return;
    }
    this.toggleSelect.emit();
  }
}
