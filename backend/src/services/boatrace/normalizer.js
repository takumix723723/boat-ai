import {
  stadiumFromNumber,
  branchName,
  className,
  formatWind,
  formatWave,
  formatWeather,
} from './constants.js';

export function raceKey(program) {
  return `${program.race_date}-${program.race_stadium_number}-${program.race_number}`;
}

export function buildRaceId(program) {
  const d = program.race_date.replace(/-/g, '');
  const stadium = String(program.race_stadium_number).padStart(2, '0');
  const rno = String(program.race_number).padStart(2, '0');
  return `${d}-${stadium}-${rno}`;
}

function parseStartTime(closedAt) {
  if (!closedAt) return '—';
  const m = closedAt.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : '—';
}

function previewBoatsList(preview) {
  if (!preview?.boats) return [];
  if (Array.isArray(preview.boats)) return preview.boats;
  return Object.values(preview.boats);
}

function hasExhibitionData(preview) {
  const boats = previewBoatsList(preview);
  return boats.some((b) => b.racer_exhibition_time != null && b.racer_exhibition_time > 0);
}

function deriveStatus(preview) {
  if (!preview) return '出走前';
  if (hasExhibitionData(preview)) return '展示済';
  return '直前';
}

function mapMotorFromProgram(boat) {
  const rate2nd = boat.racer_assigned_motor_top_2_percent ?? null;
  const rate3rd = boat.racer_assigned_motor_top_3_percent ?? null;
  return {
    rate2nd,
    rate3rd,
    score: rate2nd != null ? Math.round(Math.min(100, rate2nd * 1.5)) : null,
    note: rate2nd == null ? 'モーター率未取得' : null,
  };
}

function mapEntry(programBoat, previewBoat) {
  const lane = programBoat.racer_boat_number;
  return {
    lane,
    racerId: String(programBoat.racer_number),
    name: (programBoat.racer_name || '').replace(/\s+/g, ' ').trim(),
    rank: className(programBoat.racer_class_number),
    branch: branchName(programBoat.racer_branch_number),
    st: previewBoat?.racer_start_timing ?? null,
    exhibitionTime: previewBoat?.racer_exhibition_time ?? null,
    tilt: previewBoat?.racer_tilt_adjustment ?? null,
    motor: mapMotorFromProgram(programBoat),
    aiScore: null,
    previousAiScore: null,
  };
}

function mapLastMinute(preview) {
  if (!preview) {
    return {
      weather: null,
      wind: null,
      wave: null,
      remark: null,
      updatedAt: new Date().toISOString(),
      temperature: null,
      waterTemperature: null,
    };
  }
  const remarkParts = [];
  if (preview.race_temperature != null) {
    remarkParts.push(`気温${preview.race_temperature}℃`);
  }
  if (preview.race_water_temperature != null) {
    remarkParts.push(`水温${preview.race_water_temperature}℃`);
  }

  return {
    weather: formatWeather(preview.race_weather_number),
    wind: formatWind(preview.race_wind, preview.race_wind_direction_number),
    wave: formatWave(preview.race_wave),
    remark: remarkParts.length ? remarkParts.join(' / ') : null,
    updatedAt: new Date().toISOString(),
    temperature: preview.race_temperature ?? null,
    waterTemperature: preview.race_water_temperature ?? null,
  };
}

/**
 * programs + previews を統合 Race モデルへ
 * @param {object[]} programs
 * @param {object[]} previews
 * @param {object} metaBase
 */
export function normalizeRaceDataset(programs, previews, metaBase = {}) {
  const previewMap = new Map();
  for (const p of previews) {
    previewMap.set(raceKey(p), p);
  }

  const races = programs.map((program) => {
    const key = raceKey(program);
    const preview = previewMap.get(key) ?? null;
    const stadium = stadiumFromNumber(program.race_stadium_number);
    const previewByLane = new Map(
      previewBoatsList(preview).map((b) => [b.racer_boat_number, b])
    );

    const entries = (program.boats || [])
      .sort((a, b) => a.racer_boat_number - b.racer_boat_number)
      .map((boat) => mapEntry(boat, previewByLane.get(boat.racer_boat_number)));

    return {
      id: buildRaceId(program),
      venueCode: stadium.code,
      venueName: stadium.name,
      raceNo: program.race_number,
      grade: program.race_subtitle || program.race_title || '一般',
      status: deriveStatus(preview),
      startTime: parseStartTime(program.race_closed_at),
      lastMinute: mapLastMinute(preview),
      entries,
      meta: {
        ...metaBase,
        raceDate: program.race_date,
        raceTitle: program.race_title ?? null,
        raceClosedAt: program.race_closed_at ?? null,
        stadiumNumber: program.race_stadium_number,
      },
    };
  });

  races.sort((a, b) => {
    if (a.venueName !== b.venueName) return a.venueName.localeCompare(b.venueName, 'ja');
    return a.raceNo - b.raceNo;
  });

  return races;
}
