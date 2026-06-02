const now = new Date().toISOString();

/**
 * テスト・学習スクリプト専用（本番UI/APIでは使用しない）
 * entries から仮着順を生成
 */
export function buildMockOfficialResult(entries, winnerLane = 1) {
  const lanes = entries.map((e) => e.lane);
  const ordered = [
    winnerLane,
    ...lanes.filter((l) => l !== winnerLane),
  ];
  return {
    available: true,
    source: 'mock',
    fetchedAt: now,
    placements: ordered.map((lane, idx) => {
      const e = entries.find((x) => x.lane === lane);
      return {
        place: idx + 1,
        lane,
        racerId: e.racerId,
        name: e.name,
      };
    }),
  };
}

const rawRaces = [
  {
    id: '20260601-toda-10',
    venueCode: '03',
    venueName: '戸田',
    raceNo: 10,
    grade: '一般',
    status: '展示済',
    startTime: '15:10',
    lastMinute: {
      weather: '晴',
      wind: '向い風 1m',
      wave: '静穏',
      remark: null,
      updatedAt: now,
    },
    entries: [
      {
        lane: 1,
        racerId: '4101',
        name: '検証一郎',
        rank: 'A1',
        branch: '東京',
        st: 0.1,
        exhibitionTime: 6.6,
        tilt: 0,
        motor: { rate2nd: 48, rate3rd: 60, score: 75, note: null },
      },
      {
        lane: 2,
        racerId: '4102',
        name: '検証二郎',
        rank: 'A2',
        branch: '埼玉',
        st: 0.14,
        exhibitionTime: 6.65,
        tilt: 0,
        motor: { rate2nd: 42, rate3rd: 55, score: 70, note: null },
      },
      {
        lane: 3,
        racerId: '4103',
        name: '検証三郎',
        rank: 'B1',
        branch: '千葉',
        st: 0.12,
        exhibitionTime: 6.58,
        tilt: 0,
        motor: { rate2nd: 40, rate3rd: 52, score: 68, note: null },
      },
      {
        lane: 4,
        racerId: '4104',
        name: '検証四郎',
        rank: 'A1',
        branch: '神奈川',
        st: 0.16,
        exhibitionTime: 6.7,
        tilt: 0,
        motor: { rate2nd: 38, rate3rd: 50, score: 65, note: null },
      },
      {
        lane: 5,
        racerId: '4105',
        name: '検証五郎',
        rank: 'B1',
        branch: '茨城',
        st: 0.18,
        exhibitionTime: 6.72,
        tilt: 0,
        motor: { rate2nd: 35, rate3rd: 48, score: 60, note: null },
      },
      {
        lane: 6,
        racerId: '4106',
        name: '検証六郎',
        rank: 'A2',
        branch: '群馬',
        st: 0.11,
        exhibitionTime: 6.64,
        tilt: 0,
        motor: { rate2nd: 44, rate3rd: 56, score: 72, note: null },
      },
    ],
  },
  {
    id: '20260601-toda-11',
    venueCode: '03',
    venueName: '戸田',
    raceNo: 11,
    grade: '一般',
    status: '展示済',
    startTime: '15:42',
    lastMinute: {
      weather: '晴',
      wind: '向い風 2m',
      wave: '静穏',
      remark: '水面やや張り',
      updatedAt: now,
    },
    entries: [
      {
        lane: 1,
        racerId: '4123',
        name: '山田太郎',
        rank: 'A1',
        branch: '群馬',
        st: 0.12,
        exhibitionTime: 6.68,
        tilt: -0.5,
        motor: { rate2nd: 42.5, rate3rd: 58.0, score: 72, note: null },
      },
      {
        lane: 2,
        racerId: '3891',
        name: '鈴木一郎',
        rank: 'A2',
        branch: '埼玉',
        st: 0.08,
        exhibitionTime: 6.55,
        tilt: 0.0,
        motor: { rate2nd: 48.2, rate3rd: 61.5, score: 78, note: null },
      },
      {
        lane: 3,
        racerId: '4512',
        name: '佐藤次郎',
        rank: 'B1',
        branch: '東京',
        st: 0.15,
        exhibitionTime: 6.61,
        tilt: 0.5,
        motor: { rate2nd: 38.0, rate3rd: 52.0, score: 65, note: null },
      },
      {
        lane: 4,
        racerId: '3678',
        name: '田中三郎',
        rank: 'A1',
        branch: '静岡',
        st: 0.18,
        exhibitionTime: 6.59,
        tilt: 0.0,
        motor: { rate2nd: 45.0, rate3rd: 55.0, score: null, note: 'データ取得中' },
      },
      {
        lane: 5,
        racerId: '4234',
        name: '高橋四郎',
        rank: 'B1',
        branch: '愛知',
        st: 0.22,
        exhibitionTime: 6.74,
        tilt: -0.5,
        motor: { rate2nd: 35.5, rate3rd: 48.0, score: 58, note: null },
      },
      {
        lane: 6,
        racerId: '3901',
        name: '伊藤五郎',
        rank: 'A2',
        branch: '三重',
        st: 0.1,
        exhibitionTime: 6.63,
        tilt: 0.0,
        motor: { rate2nd: 41.0, rate3rd: 54.0, score: 70, note: null },
      },
    ],
  },
  {
    id: '20260601-toda-12',
    venueCode: '03',
    venueName: '戸田',
    raceNo: 12,
    grade: '一般',
    status: '直前',
    startTime: '16:14',
    lastMinute: {
      weather: '晴',
      wind: '追い風 3m',
      wave: 'やや高',
      remark: null,
      updatedAt: now,
    },
    entries: [
      {
        lane: 1,
        racerId: '4011',
        name: '渡辺六郎',
        rank: 'A1',
        branch: '福岡',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 50.0, rate3rd: 62.0, score: 80, note: null },
      },
      {
        lane: 2,
        racerId: '4022',
        name: '中村七郎',
        rank: 'A2',
        branch: '山口',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 44.0, rate3rd: 56.0, score: 74, note: null },
      },
      {
        lane: 3,
        racerId: '4033',
        name: '小林八郎',
        rank: 'B1',
        branch: '広島',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 36.0, rate3rd: 49.0, score: 60, note: null },
      },
      {
        lane: 4,
        racerId: '4044',
        name: '加藤九郎',
        rank: 'A1',
        branch: '岡山',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 47.0, rate3rd: 59.0, score: 76, note: null },
      },
      {
        lane: 5,
        racerId: '4055',
        name: '吉田十郎',
        rank: 'B1',
        branch: '香川',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 33.0, rate3rd: 45.0, score: 55, note: null },
      },
      {
        lane: 6,
        racerId: '4066',
        name: '山本十一郎',
        rank: 'A2',
        branch: '徳島',
        st: null,
        exhibitionTime: null,
        tilt: null,
        motor: { rate2nd: 40.0, rate3rd: 53.0, score: 68, note: null },
      },
    ],
  },
  {
    id: '20260601-edogawa-10',
    venueCode: '04',
    venueName: '江戸川',
    raceNo: 10,
    grade: 'G1',
    status: '展示済',
    startTime: '15:28',
    lastMinute: {
      weather: '曇',
      wind: '逆風 1m',
      wave: '静穏',
      remark: 'イン有利想定',
      updatedAt: now,
    },
    entries: [
      {
        lane: 1,
        racerId: '5001',
        name: '選手A',
        rank: 'A1',
        branch: '東京',
        st: 0.06,
        exhibitionTime: 6.51,
        tilt: 0.0,
        motor: { rate2nd: 52.0, rate3rd: 65.0, score: 82, note: null },
      },
      {
        lane: 2,
        racerId: '5002',
        name: '選手B',
        rank: 'A1',
        branch: '東京',
        st: 0.09,
        exhibitionTime: 6.54,
        tilt: -0.5,
        motor: { rate2nd: 49.0, rate3rd: 60.0, score: 79, note: null },
      },
      {
        lane: 3,
        racerId: '5003',
        name: '選手C',
        rank: 'A2',
        branch: '神奈川',
        st: 0.11,
        exhibitionTime: 6.57,
        tilt: 0.0,
        motor: { rate2nd: 46.0, rate3rd: 58.0, score: 75, note: null },
      },
      {
        lane: 4,
        racerId: '5004',
        name: '選手D',
        rank: 'B1',
        branch: '千葉',
        st: 0.14,
        exhibitionTime: 6.6,
        tilt: 0.5,
        motor: { rate2nd: 40.0, rate3rd: 52.0, score: 68, note: null },
      },
      {
        lane: 5,
        racerId: '5005',
        name: '選手E',
        rank: 'B1',
        branch: '茨城',
        st: 0.19,
        exhibitionTime: 6.66,
        tilt: 0.0,
        motor: { rate2nd: 37.0, rate3rd: 50.0, score: 62, note: null },
      },
      {
        lane: 6,
        racerId: '5006',
        name: '選手F',
        rank: 'A2',
        branch: '埼玉',
        st: 0.13,
        exhibitionTime: 6.62,
        tilt: -0.5,
        motor: { rate2nd: 43.0, rate3rd: 55.0, score: 71, note: null },
      },
    ],
  },
  {
    id: '20260601-edogawa-11',
    venueCode: '04',
    venueName: '江戸川',
    raceNo: 11,
    grade: 'G1',
    status: '展示済',
    startTime: '15:55',
    lastMinute: { weather: '晴', wind: '向い風', wave: '静穏', updatedAt: now },
    entries: [
      { lane: 1, racerId: '5101', name: '江戸A', rank: 'A1', branch: '東京', st: 0.07, exhibitionTime: 6.52, tilt: 0, motor: { rate2nd: 51, rate3rd: 64, score: 81, note: null } },
      { lane: 2, racerId: '5102', name: '江戸B', rank: 'A2', branch: '東京', st: 0.1, exhibitionTime: 6.56, tilt: 0, motor: { rate2nd: 46, rate3rd: 58, score: 74, note: null } },
      { lane: 3, racerId: '5103', name: '江戸C', rank: 'B1', branch: '千葉', st: 0.12, exhibitionTime: 6.59, tilt: 0, motor: { rate2nd: 39, rate3rd: 51, score: 66, note: null } },
      { lane: 4, racerId: '5104', name: '江戸D', rank: 'A1', branch: '神奈川', st: 0.15, exhibitionTime: 6.61, tilt: 0, motor: { rate2nd: 44, rate3rd: 57, score: 72, note: null } },
      { lane: 5, racerId: '5105', name: '江戸E', rank: 'B1', branch: '茨城', st: 0.17, exhibitionTime: 6.65, tilt: 0, motor: { rate2nd: 36, rate3rd: 49, score: 61, note: null } },
      { lane: 6, racerId: '5106', name: '江戸F', rank: 'A2', branch: '埼玉', st: 0.11, exhibitionTime: 6.58, tilt: 0, motor: { rate2nd: 42, rate3rd: 54, score: 70, note: null } },
    ],
  },
  {
    id: '20260601-toda-13',
    venueCode: '03',
    venueName: '戸田',
    raceNo: 13,
    grade: '一般',
    status: '展示済',
    startTime: '16:40',
    lastMinute: { weather: '晴', wind: '追い風', wave: 'やや高', updatedAt: now },
    entries: [
      { lane: 1, racerId: '4201', name: '戸田A', rank: 'A1', branch: '埼玉', st: 0.09, exhibitionTime: 6.57, tilt: 0, motor: { rate2nd: 49, rate3rd: 61, score: 77, note: null } },
      { lane: 2, racerId: '4202', name: '戸田B', rank: 'A2', branch: '東京', st: 0.11, exhibitionTime: 6.6, tilt: 0, motor: { rate2nd: 45, rate3rd: 57, score: 73, note: null } },
      { lane: 3, racerId: '4203', name: '戸田C', rank: 'B1', branch: '群馬', st: 0.13, exhibitionTime: 6.63, tilt: 0, motor: { rate2nd: 37, rate3rd: 50, score: 62, note: null } },
      { lane: 4, racerId: '4204', name: '戸田D', rank: 'A1', branch: '静岡', st: 0.08, exhibitionTime: 6.55, tilt: 0, motor: { rate2nd: 50, rate3rd: 63, score: 80, note: null } },
      { lane: 5, racerId: '4205', name: '戸田E', rank: 'B1', branch: '愛知', st: 0.16, exhibitionTime: 6.68, tilt: 0, motor: { rate2nd: 34, rate3rd: 47, score: 58, note: null } },
      { lane: 6, racerId: '4206', name: '戸田F', rank: 'A2', branch: '三重', st: 0.1, exhibitionTime: 6.59, tilt: 0, motor: { rate2nd: 41, rate3rd: 53, score: 69, note: null } },
    ],
  },
];

/** モック: 号機+2連/3連（選手勝率は racerStats へ） */
function normalizeMockMotor(motor, lane) {
  if (!motor) return motor;
  const rate2nd = motor.rate2nd ?? null;
  const rate3rd = motor.rate3rd ?? null;
  return {
    motorNo: motor.motorNo ?? 20 + lane * 7,
    rate2nd,
    rate3rd,
    note: motor.note ?? null,
  };
}

function mockRacerStatsFromEntry(entry) {
  const m = entry.motor ?? {};
  const rate2nd = m.rate2nd ?? 35;
  const rate3rd = m.rate3rd ?? 48;
  const win =
    m.winRate ?? (rate2nd != null ? Math.round(rate2nd * 0.11 * 10) / 10 : 5);
  return {
    nationalWin: win,
    national2nd: Math.min(75, Math.round(rate2nd * 0.72)),
    national3rd: Math.min(85, Math.round(rate3rd * 0.85)),
    localWin: m.localWinRate ?? Math.max(0, win - 1.5),
    local2nd: Math.min(70, Math.round(rate2nd * 0.65)),
    local3rd: Math.min(80, Math.round(rate3rd * 0.78)),
  };
}

/** フォールバック用モック（AIスコア未適用の生データ） */
export function getMockRaces() {
  return rawRaces.map((r) => {
    const copy = {
      ...r,
      entries: r.entries.map((e) => ({
        ...e,
        motor: normalizeMockMotor(e.motor, e.lane),
        racerStats: e.racerStats ?? mockRacerStatsFromEntry(e),
      })),
    };
    copy.officialResult = {
      available: false,
      reason: 'pending',
      message: '結果未確定（レース前 / 開催中）',
      source: null,
      placements: [],
    };
    return copy;
  });
}
