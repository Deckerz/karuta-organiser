import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';

export interface CommandsDialogData { commands: string[] }

@Component({
  selector: 'app-commands-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, ClipboardModule],
  templateUrl: './commands-dialog.html',
  styleUrls: ['./commands-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandsDialogComponent {
  private readonly ref = inject(MatDialogRef<CommandsDialogComponent>);
  readonly data = inject<CommandsDialogData>(MAT_DIALOG_DATA);

  close() { this.ref.close(); }
}
