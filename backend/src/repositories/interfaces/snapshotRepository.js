/**
 * @typedef {Object} SaveLiveDatasetResult
 * @property {number} racesProcessed
 * @property {number} snapshotsCreated
 * @property {number} aiScoresCreated
 * @property {string} capturedAt
 */

/**
 * @typedef {Object} SnapshotStats
 * @property {boolean} persistenceEnabled
 * @property {number} totalSnapshots
 * @property {number} totalAiScores
 * @property {number} totalRaces
 * @property {string|null} latestCapturedAt
 * @property {object|null} latestByRace
 */

/**
 * ISnapshotRepository — 将来 ApiSnapshotRepository 等に差し替え可能
 * @typedef {Object} ISnapshotRepository
 * @property {(races: object[], meta: object) => Promise<SaveLiveDatasetResult>} saveLiveDataset
 * @property {() => Promise<SnapshotStats>} getStats
 * @property {(externalRaceId: string) => Promise<SnapshotStats>} getStatsForRace
 * @property {(externalRaceId: string) => Promise<RaceHistoryResult>} getRaceHistory
 */

/**
 * @typedef {Object} RaceHistoryEntry
 * @property {number} lane
 * @property {string} racerId
 * @property {string} name
 * @property {{ total: number } & object} aiScore
 * @property {number|null} previousTotal
 * @property {object|null} scoreDelta
 * @property {number|null} st
 * @property {number|null} exhibitionTime
 * @property {number|null} tilt
 */

/**
 * @typedef {Object} RaceHistorySnapshot
 * @property {number} sequence
 * @property {string} capturedAt
 * @property {string|null} status
 * @property {RaceHistoryEntry[]} entries
 */

/**
 * @typedef {Object} RaceHistoryResult
 * @property {boolean} found
 * @property {string} raceId
 * @property {string|null} venueName
 * @property {number|null} raceNo
 * @property {RaceHistorySnapshot[]} snapshots
 */

export {};
