import { PrismaSnapshotRepository } from './prisma/prismaSnapshotRepository.js';

/** @type {import('./interfaces/snapshotRepository.js').ISnapshotRepository | null} */
let snapshotRepository = null;

/** @returns {import('./interfaces/snapshotRepository.js').ISnapshotRepository} */
export function getSnapshotRepository() {
  if (!snapshotRepository) {
    snapshotRepository = new PrismaSnapshotRepository();
  }
  return snapshotRepository;
}

export function resetRepositories() {
  snapshotRepository = null;
}
