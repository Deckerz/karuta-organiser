import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Card } from '../../../../models/card';
import { CardStoreService } from '../../../services/card-store.service';

export interface ActionsDialogData {
  card: Card;
  current?: string | null;
}

@Component({
  selector: 'app-actions-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './actions-dialog.html',
  styleUrls: ['./actions-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ActionsDialogComponent>);
  private readonly data = inject<ActionsDialogData>(MAT_DIALOG_DATA);
  private readonly store = inject(CardStoreService);

  readonly groups = computed(() => this.store.groups());
  readonly current = this.data.current ?? '';
  readonly card = this.data.card;

  close() {
    this.dialogRef.close();
  }

  assign(group: string) {
    const tag = (group ?? '').trim();
    if (!tag) return;
    this.store.assignCardTag(this.card.code, this.card.number, tag);
    this.close();
  }

  unassign() {
    this.store.unassignCardTag(this.card.code, this.card.number);
    this.close();
  }

  move(group: string) {
    const tag = (group ?? '').trim();
    if (!tag || tag === (this.current ?? '').trim()) return;
    this.store.assignCardTag(this.card.code, this.card.number, tag);
    this.close();
  }
}
