import { getPrisma } from '../../db/client.js';

export class PrismaRacerRepository {
  /** @param {import('@prisma/client').Prisma.TransactionClient} [tx] */
  constructor(tx) {
    this.db = tx ?? getPrisma();
  }

  /**
   * @param {{ racerId: string, name: string, rank?: string, branch?: string }} entry
   */
  async upsert(entry) {
    return this.db.racer.upsert({
      where: { id: entry.racerId },
      create: {
        id: entry.racerId,
        name: entry.name,
        rank: entry.rank ?? null,
        branch: entry.branch ?? null,
      },
      update: {
        name: entry.name,
        rank: entry.rank ?? null,
        branch: entry.branch ?? null,
      },
    });
  }
}
