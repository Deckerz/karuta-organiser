import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Card, CARD_CSV_HEADERS } from '../../../models/card';
import { CardStoreService } from '../../services/card-store.service';
import { NgxCsvParser, NgxCSVParserError, NgxCsvParserModule } from 'ngx-csv-parser';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-import-page',
  imports: [CommonModule, RouterLink, NgxCsvParserModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './import.page.html',
  styleUrl: './import.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportPage {
  private readonly store = inject(CardStoreService);
  private readonly csv = inject(NgxCsvParser);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly previewCount = signal(0);
  readonly selectedFileName = signal('');

  async onFileSelected(ev: Event) {
    this.error.set(null);
    const inputEl = ev.target as HTMLInputElement;
  const file = inputEl.files?.[0];
  this.selectedFileName.set(file?.name ?? '');
  if (!file) return;

    try {
      const rows = (await firstValueFrom(
        this.csv.parse(file, { header: true, delimiter: ',', encoding: 'utf8' })
      )) as Array<Record<string, string>>;
      // Validate headers exist in first row
      if (!rows || rows.length === 0) {
        this.store.clear();
        this.previewCount.set(0);
        return;
      }
      const row0 = rows[0];
      const headers = Object.keys(row0);
      const expected = Array.from(CARD_CSV_HEADERS);
      const headersOk = expected.every(h => headers.includes(h));
      if (!headersOk) {
        throw new Error('CSV headers do not match expected schema.');
      }

      const cards = rows.map(r => Card.fromCsvRow(r));
      this.store.setCards(cards);
      this.previewCount.set(cards.length);
      // Navigate to cards page after successful import
      await this.router.navigate(['/cards']);
    } catch (e: unknown) {
      const msg = (e as NgxCSVParserError)?.message ?? (e instanceof Error ? e.message : 'Failed to parse file');
      this.error.set(msg);
      this.previewCount.set(0);
      this.store.clear();
    }
  }
}
