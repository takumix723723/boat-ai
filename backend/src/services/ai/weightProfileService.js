import { getPrisma } from '../../db/client.js';
import {
  DEFAULT_WEIGHTS,
  normalizeWeights,
  validateWeights,
  profileRowToDto,
  profileRowToWeights,
  profileRowToCalibration,
  WEIGHT_FACTOR_LABELS,
} from './weightConfig.js';
import { DEFAULT_CALIBRATION } from './rankCalibration.js';

/** @type {Record<string, number>} */
let cachedActiveWeights = { ...DEFAULT_WEIGHTS };

/** @type {object} */
let cachedActiveCalibration = { ...DEFAULT_CALIBRATION };

/** @type {import('@prisma/client').AiWeightProfile | null} */
let cachedActiveProfile = null;

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getActiveWeightsSync() {
  return cachedActiveWeights;
}

export function getActiveCalibrationSync() {
  return cachedActiveCalibration;
}

export function getActiveProfileCache() {
  return cachedActiveProfile;
}

export async function refreshActiveWeightsCache() {
  if (!isDatabaseConfigured()) {
    cachedActiveWeights = { ...DEFAULT_WEIGHTS };
    cachedActiveCalibration = { ...DEFAULT_CALIBRATION };
    cachedActiveProfile = null;
    return cachedActiveWeights;
  }

  try {
    const prisma = getPrisma();
    let row = await prisma.aiWeightProfile.findFirst({
      where: { isActive: true },
    });
    if (!row) {
      row = await prisma.aiWeightProfile.findUnique({
        where: { name: 'default' },
      });
    }
    if (row) {
      cachedActiveWeights = profileRowToWeights(row);
      cachedActiveCalibration = profileRowToCalibration(row);
      cachedActiveProfile = row;
    } else {
      cachedActiveWeights = { ...DEFAULT_WEIGHTS };
      cachedActiveCalibration = { ...DEFAULT_CALIBRATION };
      cachedActiveProfile = null;
    }
  } catch (err) {
    console.error('[weightProfile] cache refresh failed', err.message);
    cachedActiveWeights = { ...DEFAULT_WEIGHTS };
    cachedActiveCalibration = { ...DEFAULT_CALIBRATION };
  }

  return cachedActiveWeights;
}

export async function listWeightProfiles() {
  if (!isDatabaseConfigured()) {
    return {
      available: false,
      reason: 'database_unavailable',
      message: 'DATABASE_URL が未設定のため重みプロファイルを DB 管理できません。',
      activeProfile: null,
      profiles: [],
      factorLabels: WEIGHT_FACTOR_LABELS,
      defaultWeights: DEFAULT_WEIGHTS,
      defaultCalibration: DEFAULT_CALIBRATION,
    };
  }

  await refreshActiveWeightsCache();
  const prisma = getPrisma();
  const rows = await prisma.aiWeightProfile.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });

  return {
    available: true,
    reason: null,
    message: null,
    activeProfile: rows.find((r) => r.isActive)
      ? profileRowToDto(rows.find((r) => r.isActive))
      : rows[0]
        ? profileRowToDto(rows[0])
        : null,
    profiles: rows.map(profileRowToDto),
    factorLabels: WEIGHT_FACTOR_LABELS,
    defaultWeights: DEFAULT_WEIGHTS,
    defaultCalibration: DEFAULT_CALIBRATION,
  };
}

/**
 * @param {{ id?: string, name?: string, label?: string, weights?: object, calibration?: object, setActive?: boolean }} body
 */
export async function upsertWeightProfile(body) {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }

  const name = (body.name || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!name || !/^[a-z0-9-]+$/.test(name)) {
    throw new Error('name は英数字とハイフンのみ（例: profile-b）');
  }

  const label = (body.label || name).trim();
  const validation = validateWeights(body.weights ?? {});
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  const weights = validation.normalized ?? normalizeWeights(body.weights ?? {});

  const calibration =
    body.calibration && typeof body.calibration === 'object'
      ? {
          version: body.calibration.version ?? 1,
          rankScores: body.calibration.rankScores ?? null,
        }
      : undefined;

  const prisma = getPrisma();
  const data = {
    name,
    label,
    weightSt: weights.st,
    weightExhibition: weights.exhibitionTime,
    weightLane: weights.lane,
    weightMotor: weights.motor,
    weightCourse: weights.course,
    weightLastMinute: weights.lastMinute,
    weightRank: weights.rank,
    weightRacer: weights.racer,
    ...(calibration !== undefined ? { calibrationJson: calibration } : {}),
    ...(body.setActive ? { isActive: true } : {}),
  };

  let row;
  if (body.id) {
    row = await prisma.aiWeightProfile.update({
      where: { id: body.id },
      data,
    });
  } else {
    row = await prisma.aiWeightProfile.upsert({
      where: { name },
      create: {
        ...data,
        isActive: Boolean(body.setActive),
        calibrationJson: calibration ?? DEFAULT_CALIBRATION,
      },
      update: data,
    });
  }

  if (body.setActive) {
    await prisma.aiWeightProfile.updateMany({
      where: { id: { not: row.id } },
      data: { isActive: false },
    });
    row = await prisma.aiWeightProfile.findUnique({ where: { id: row.id } });
  }

  await refreshActiveWeightsCache();
  return profileRowToDto(row);
}
