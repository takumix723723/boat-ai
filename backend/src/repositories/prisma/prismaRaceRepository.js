import { getPrisma } from '../../db/client.js';
import { isRealOfficialResult } from '../../services/results/officialResultPolicy.js';
import { settleBetAdviceForRace } from '../../services/prediction/raceBetAdviceService.js';
import { isPersistenceEnabled } from '../../config/persistence.js';

/**
 * @param {string} externalId e.g. 20260601-03-11
 */
export function parseRaceDateFromExternalId(externalId) {
  const m = externalId.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return new Date();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
}

/**
 * @param {string|null|undefined} closedAtStr
 */
export function parseClosedAt(closedAtStr) {
  if (!closedAtStr) return null;
  const normalized = closedAtStr.includes('T')
    ? closedAtStr
    : closedAtStr.replace(' ', 'T');
  const withTz = /[Z+-]\d/.test(normalized) ? normalized : `${normalized}+09:00`;
  const d = new Date(withTz);
  return Number.isNaN(d.getTime()) ? null : d;
}

export class PrismaRaceRepository {
  /** @param {import('@prisma/client').Prisma.TransactionClient} [tx] */
  constructor(tx) {
    this.db = tx ?? getPrisma();
    this.inTransaction = Boolean(tx);
  }

  /**
   * @param {object} race - 正規化済み Race
   */
  async upsert(race) {
    const raceDate = race.meta?.raceDate
      ? new Date(`${race.meta.raceDate}T00:00:00.000Z`)
      : parseRaceDateFromExternalId(race.id);

    const officialResult = isRealOfficialResult(race.officialResult)
      ? race.officialResult
      : undefined;

    const row = await this.db.race.upsert({
      where: { externalId: race.id },
      create: {
        externalId: race.id,
        raceDate,
        venueCode: race.venueCode,
        venueName: race.venueName,
        raceNo: race.raceNo,
        grade: race.grade ?? null,
        closedAt: parseClosedAt(race.meta?.raceClosedAt),
        officialResult,
      },
      update: {
        venueName: race.venueName,
        grade: race.grade ?? null,
        closedAt: parseClosedAt(race.meta?.raceClosedAt),
        ...(officialResult ? { officialResult } : {}),
      },
    });

    if (isPersistenceEnabled() && officialResult && !this.inTransaction) {
      settleBetAdviceForRace(row.id, officialResult).catch((err) => {
        console.warn('[race] bet advice settle skipped', {
          raceId: race.id,
          message: err.message,
        });
      });
    }

    return row;
  }
}
