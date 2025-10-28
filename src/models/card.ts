/**
 * Card model supporting CSV import/export.
 * Maps exactly to the following CSV headers:
 * "code","number","edition","character","series","quality","obtainedDate","obtainedTimestamp","burnValue","dye.code","dye.name","frame","morphed","trimmed","tag","alias","wishlists","fights","dropQuality","dropper","grabber","guild","worker.effort","worker.style","worker.purity","worker.grabber","worker.dropper","worker.quickness","worker.toughness","worker.vanity","worker.recoveryDate","worker.recoveryTimestamp"
 */

export const CARD_CSV_HEADERS = [
	"code",
	"number",
	"edition",
	"character",
	"series",
	"quality",
	"obtainedDate",
	"obtainedTimestamp",
	"burnValue",
	"dye.code",
	"dye.name",
	"frame",
	"morphed",
	"trimmed",
	"tag",
	"alias",
	"wishlists",
	"fights",
	"dropQuality",
	"dropper",
	"grabber",
	"guild",
	"worker.effort",
	"worker.style",
	"worker.purity",
	"worker.grabber",
	"worker.dropper",
	"worker.quickness",
	"worker.toughness",
	"worker.vanity",
	"worker.recoveryDate",
	"worker.recoveryTimestamp",
] as const;

export type CardCsvHeader = typeof CARD_CSV_HEADERS[number];

export interface Dye {
	code: string | null;
	name: string | null;
}

export interface Worker {
	effort: number | null;
	style: number | null;
	purity: number | null;
	grabber: number | null;
	dropper: number | null;
	quickness: number | null;
	toughness: number | null;
	vanity: number | null;
	/** e.g. "2025-10-27" or ISO datetime as string; kept as string to avoid TZ surprises */
	recoveryDate: string | null;
	/** epoch millis */
	recoveryTimestamp: number | null;
}

export class Card {
	// Core identity
	code: string; // e.g. card code like "AB12"
	/** string to preserve leading zeros (e.g. "007") */
	number: string;

	// Descriptors
	edition: string | null;
	character: string | null;
	series: string | null;
	quality: number | null;

	// Acquisition
	obtainedDate: string | null; // keep as string; CSV source of truth
	obtainedTimestamp: number | null; // epoch millis
	burnValue: number | null;

	// Visuals / state
	dye: Dye;
	frame: string | null;
	morphed: boolean;
	trimmed: boolean;

	// Labels
	tag: string | null;
	alias: string | null;

	// Activity / stats
	wishlists: number | null;
	fights: number | null;
	dropQuality: number | null;
	dropper: string | null;
	grabber: string | null;
	guild: string | null;

	// Worker attributes
	worker: Worker;

	constructor(init: Partial<Card> & Pick<Card, "code" | "number">) {
		this.code = init.code;
		this.number = init.number;

		this.edition = init.edition ?? null;
		this.character = init.character ?? null;
		this.series = init.series ?? null;
		this.quality = init.quality ?? null;

		this.obtainedDate = init.obtainedDate ?? null;
		this.obtainedTimestamp = init.obtainedTimestamp ?? null;
		this.burnValue = init.burnValue ?? null;

		this.dye = init.dye ?? { code: null, name: null };
		this.frame = init.frame ?? null;
		this.morphed = init.morphed ?? false;
		this.trimmed = init.trimmed ?? false;

		this.tag = init.tag ?? null;
		this.alias = init.alias ?? null;

		this.wishlists = init.wishlists ?? null;
		this.fights = init.fights ?? null;
		this.dropQuality = init.dropQuality ?? null;
		this.dropper = init.dropper ?? null;
		this.grabber = init.grabber ?? null;
		this.guild = init.guild ?? null;

		this.worker = init.worker ?? {
			effort: null,
			style: null,
			purity: null,
			grabber: null,
			dropper: null,
			quickness: null,
			toughness: null,
			vanity: null,
			recoveryDate: null,
			recoveryTimestamp: null,
		};
	}

	// region: CSV helpers
	static fromCsvRow(row: Readonly<Record<string, string | undefined>>): Card {
		const get = (k: CardCsvHeader): string => (row[k] ?? "").trim();

		const card = new Card({
			code: get("code"),
			number: get("number"),
			edition: emptyToNull(get("edition")),
			character: emptyToNull(get("character")),
			series: emptyToNull(get("series")),
			quality: parseNumber(get("quality")),

			obtainedDate: emptyToNull(get("obtainedDate")),
			obtainedTimestamp: parseNumber(get("obtainedTimestamp")),
			burnValue: parseNumber(get("burnValue")),

			dye: {
				code: emptyToNull(get("dye.code")),
				name: emptyToNull(get("dye.name")),
			},
			frame: emptyToNull(get("frame")),
			morphed: parseBoolean(get("morphed")),
			trimmed: parseBoolean(get("trimmed")),

			tag: emptyToNull(get("tag")),
			alias: emptyToNull(get("alias")),

			wishlists: parseNumber(get("wishlists")),
			fights: parseNumber(get("fights")),
			dropQuality: parseNumber(get("dropQuality")),
			dropper: emptyToNull(get("dropper")),
			grabber: emptyToNull(get("grabber")),
			guild: emptyToNull(get("guild")),

			worker: {
				effort: parseNumber(get("worker.effort")),
				style: parseNumber(get("worker.style")),
				purity: parseNumber(get("worker.purity")),
				grabber: parseNumber(get("worker.grabber")),
				dropper: parseNumber(get("worker.dropper")),
				quickness: parseNumber(get("worker.quickness")),
				toughness: parseNumber(get("worker.toughness")),
				vanity: parseNumber(get("worker.vanity")),
				recoveryDate: emptyToNull(get("worker.recoveryDate")),
				recoveryTimestamp: parseNumber(get("worker.recoveryTimestamp")),
			},
		});

		return card;
	}

	toCsvRow(): Record<CardCsvHeader, string> {
		return {
			code: this.code ?? "",
			number: this.number ?? "",
			edition: this.edition ?? "",
			character: this.character ?? "",
			series: this.series ?? "",
			quality: numToStr(this.quality),
			obtainedDate: this.obtainedDate ?? "",
			obtainedTimestamp: numToStr(this.obtainedTimestamp),
			burnValue: numToStr(this.burnValue),
			"dye.code": this.dye?.code ?? "",
			"dye.name": this.dye?.name ?? "",
			frame: this.frame ?? "",
			morphed: boolToStr(this.morphed),
			trimmed: boolToStr(this.trimmed),
			tag: this.tag ?? "",
			alias: this.alias ?? "",
			wishlists: numToStr(this.wishlists),
			fights: numToStr(this.fights),
			dropQuality: numToStr(this.dropQuality),
			dropper: this.dropper ?? "",
			grabber: this.grabber ?? "",
			guild: this.guild ?? "",
			"worker.effort": numToStr(this.worker?.effort ?? null),
			"worker.style": numToStr(this.worker?.style ?? null),
			"worker.purity": numToStr(this.worker?.purity ?? null),
			"worker.grabber": numToStr(this.worker?.grabber ?? null),
			"worker.dropper": numToStr(this.worker?.dropper ?? null),
			"worker.quickness": numToStr(this.worker?.quickness ?? null),
			"worker.toughness": numToStr(this.worker?.toughness ?? null),
			"worker.vanity": numToStr(this.worker?.vanity ?? null),
			"worker.recoveryDate": this.worker?.recoveryDate ?? "",
			"worker.recoveryTimestamp": numToStr(this.worker?.recoveryTimestamp ?? null),
		} as Record<CardCsvHeader, string>;
	}
	// endregion
}

// region: utils
function emptyToNull(v: string): string | null {
	return v === "" ? null : v;
}

function parseNumber(v: string): number | null {
	if (!v || v.trim() === "") return null;
	const n = Number(v.trim());
	return Number.isFinite(n) ? n : null;
}

function parseBoolean(v: string): boolean {
	const s = v.trim().toLowerCase();
	if (s === "1" || s === "true" || s === "yes" || s === "y") return true;
	if (s === "0" || s === "false" || s === "no" || s === "n") return false;
	// default to false when unspecified/empty
	return false;
}

function numToStr(n: number | null): string {
	return n == null ? "" : String(n);
}
function boolToStr(b: boolean): string {
	return b ? "true" : "false";
}
// endregion

