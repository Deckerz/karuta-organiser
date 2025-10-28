import { Card, CARD_CSV_HEADERS } from './card';

describe('Card CSV', () => {
  it('fromCsvRow parses and toCsvRow serializes correctly (happy path)', () => {
    const row: Record<string, string> = {
      code: 'AB12',
      number: '007',
      edition: 'Limited',
      character: 'Hero',
      series: 'S1',
      quality: '95',
      obtainedDate: '2025-10-27',
      obtainedTimestamp: '1761523200000',
      burnValue: '123',
      'dye.code': 'D01',
      'dye.name': 'Crimson',
      frame: 'Gold',
      morphed: '1',
      trimmed: 'false',
      tag: 'fav',
      alias: 'The Hero',
      wishlists: '10',
      fights: '3',
      dropQuality: '80',
      dropper: 'Alice',
      grabber: 'Bob',
      guild: 'GuildX',
      'worker.effort': '20',
      'worker.style': '30',
      'worker.purity': '40',
      'worker.grabber': '50',
      'worker.dropper': '60',
      'worker.quickness': '70',
      'worker.toughness': '80',
      'worker.vanity': '90',
      'worker.recoveryDate': '2025-12-01',
      'worker.recoveryTimestamp': '1764547200000',
    } as const;

    const card = Card.fromCsvRow(row);

    // Parse checks
    expect(card.code).toBe('AB12');
    expect(card.number).toBe('007');
    expect(card.quality).toBe(95);
    expect(card.obtainedTimestamp).toBe(1761523200000);
    expect(card.dye.code).toBe('D01');
    expect(card.morphed).toBeTrue(); // from '1'
    expect(card.trimmed).toBeFalse(); // from 'false'
    expect(card.worker.toughness).toBe(80);

    const out = card.toCsvRow();

    // Ensure all headers exist
    for (const h of CARD_CSV_HEADERS) {
      expect(out[h]).withContext(`missing header ${h}`).toBeDefined();
    }

    // Selected field round-trip (note boolean normalization to 'true'/'false')
    expect(out.code).toBe('AB12');
    expect(out.number).toBe('007');
    expect(out.quality).toBe('95');
    expect(out.obtainedTimestamp).toBe('1761523200000');
    expect(out['dye.code']).toBe('D01');
    expect(out.morphed).toBe('true');
    expect(out.trimmed).toBe('false');
    expect(out['worker.toughness']).toBe('80');
  });

  it('handles empty/invalid values gracefully', () => {
    const row: Record<string, string> = {
      code: 'ZZ99',
      number: '000',
      edition: '',
      character: '',
      series: '',
      quality: '',
      obtainedDate: '',
      obtainedTimestamp: 'not_a_number',
      burnValue: '',
      'dye.code': '',
      'dye.name': '',
      frame: '',
      morphed: 'maybe', // unknown -> false
      trimmed: '', // empty -> false
      tag: '',
      alias: '',
      wishlists: '',
      fights: '',
      dropQuality: '',
      dropper: '',
      grabber: '',
      guild: '',
      'worker.effort': '',
      'worker.style': '',
      'worker.purity': '',
      'worker.grabber': '',
      'worker.dropper': '',
      'worker.quickness': '',
      'worker.toughness': '',
      'worker.vanity': '',
      'worker.recoveryDate': '',
      'worker.recoveryTimestamp': '',
    } as const;

    const card = Card.fromCsvRow(row);
    expect(card.quality).toBeNull();
    expect(card.obtainedTimestamp).toBeNull();
    expect(card.morphed).toBeFalse();
    expect(card.trimmed).toBeFalse();
    expect(card.edition).toBeNull();
    expect(card.dye.name).toBeNull();

    const out = card.toCsvRow();
    // All empty/null numbers should become '' in CSV
    expect(out.quality).toBe('');
    expect(out.obtainedTimestamp).toBe('');
    expect(out['dye.name']).toBe('');
    expect(out.morphed).toBe('false');
  });
});
