/**
 * @typedef {Object} MotorEvaluation
 * @property {number|null} motorNo     - モーター号機（強さではない）
 * @property {number|null} rate2nd     - モーター2連対率 %
 * @property {number|null} rate3rd     - モーター3連対率 %
 * @property {string} [note]
 */

/**
 * @typedef {Object} RacerStats
 * @property {number|null} nationalWin
 * @property {number|null} national2nd
 * @property {number|null} national3rd
 * @property {number|null} localWin
 * @property {number|null} local2nd
 * @property {number|null} local3rd
 */

/**
 * @typedef {Object} LastMinuteInfo
 * @property {string|null} weather
 * @property {string|null} wind
 * @property {string|null} wave
 * @property {string|null} remark
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} AiScoreBreakdown
 * @property {number} st
 * @property {number} exhibitionTime
 * @property {number} lane
 * @property {number} motor
 * @property {number} racer
 * @property {number} rank
 * @property {number} course
 * @property {number} lastMinute
 * @property {number} total
 */

/**
 * @typedef {Object} RacerEntry
 * @property {number} lane
 * @property {string} racerId
 * @property {string} name
 * @property {string} rank
 * @property {string} branch
 * @property {number|null} st
 * @property {number|null} exhibitionTime
 * @property {number|null} tilt
 * @property {MotorEvaluation} motor
 * @property {RacerStats} [racerStats]
 * @property {AiScoreBreakdown} aiScore
 * @property {number|null} previousAiScore
 */

/**
 * @typedef {Object} DataMeta
 * @property {'live'|'mock'} dataSource
 * @property {string} sourceProvider
 * @property {string} [sourceNote]
 * @property {string} fetchedAt
 * @property {string} raceDate
 * @property {string} [fallbackReason]
 * @property {number} [programsCount]
 * @property {number} [previewsCount]
 */

/**
 * @typedef {Object} Race
 * @property {string} id
 * @property {string} venueCode
 * @property {string} venueName
 * @property {number} raceNo
 * @property {string} grade
 * @property {string} status
 * @property {string} startTime
 * @property {LastMinuteInfo} lastMinute
 * @property {RacerEntry[]} entries
 * @property {DataMeta} [meta]
 */

export {};
