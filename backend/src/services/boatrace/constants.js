/** 競艇場番号（Boatrace Open API の race_stadium_number） */
export const STADIUMS = {
  1: { code: '01', name: '桐生' },
  2: { code: '02', name: '戸田' },
  3: { code: '03', name: '江戸川' },
  4: { code: '04', name: '平和島' },
  5: { code: '05', name: '多摩川' },
  6: { code: '06', name: '浜名湖' },
  7: { code: '07', name: '蒲郡' },
  8: { code: '08', name: '常滑' },
  9: { code: '09', name: '津' },
  10: { code: '10', name: '三国' },
  11: { code: '11', name: 'びわこ' },
  12: { code: '12', name: '住之江' },
  13: { code: '13', name: '尼崎' },
  14: { code: '14', name: '鳴門' },
  15: { code: '15', name: '丸亀' },
  16: { code: '16', name: '児島' },
  17: { code: '17', name: '宮島' },
  18: { code: '18', name: '徳山' },
  19: { code: '19', name: '下関' },
  20: { code: '20', name: '若松' },
  21: { code: '21', name: '芦屋' },
  22: { code: '22', name: '福岡' },
  23: { code: '23', name: '唐津' },
  24: { code: '24', name: '大村' },
};

/** 級別（API: racer_class_number） */
export const RACER_CLASS = {
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
};

/** 天候（API: race_weather_number） */
export const WEATHER = {
  1: '晴',
  2: '曇',
  3: '雨',
  4: '雪',
  5: '霧',
};

/** 波（API: race_wave）— 公式コード簡易対応 */
export const WAVE = {
  0: '静穏',
  1: 'うねり',
  2: 'やや高',
  3: '高波',
  4: '荒れ',
  5: '大荒',
  6: '波高',
  7: '波高',
};

/**
 * 風向（API: race_wind_direction_number）
 * 公式16方位コードの代表マップ（不明値は番号表示）
 */
export const WIND_DIRECTION = {
  1: '北',
  2: '北北東',
  3: '北東',
  4: '東北東',
  5: '東',
  6: '東南東',
  7: '南東',
  8: '南南東',
  9: '南',
  10: '南南西',
  11: '南西',
  12: '西南西',
  13: '西',
  14: '西北西',
  15: '北西',
  16: '北北西',
  17: '北',
};

/** 支部番号 → 名称（主要支部。未登録はコード表示） */
export const BRANCH = {
  1: '群馬', 2: '埼玉', 3: '東京', 4: '静岡', 5: '愛知', 6: '三重',
  7: '滋賀', 8: '京都', 9: '大阪', 10: '兵庫', 11: '奈良', 12: '和歌山',
  13: '岡山', 14: '広島', 15: '山口', 16: '徳島', 17: '香川', 18: '愛媛',
  19: '高知', 20: '福岡', 21: '佐賀', 22: '長崎', 23: '熊本', 24: '大分',
  25: '宮崎', 26: '鹿児島', 27: '沖縄', 37: '福井', 40: '岐阜',
};

export function stadiumFromNumber(n) {
  return STADIUMS[n] ?? { code: String(n).padStart(2, '0'), name: `場${n}` };
}

export function branchName(n) {
  return BRANCH[n] ?? `支部${n}`;
}

export function className(n) {
  return RACER_CLASS[n] ?? `級${n}`;
}

export function formatWind(speed, directionNum) {
  const dir = WIND_DIRECTION[directionNum] ?? `向${directionNum}`;
  if (speed == null || speed === 0) return `${dir} 無風`;
  return `${dir} ${speed}m`;
}

export function formatWave(code) {
  return WAVE[code] ?? `波${code}`;
}

export function formatWeather(code) {
  return WEATHER[code] ?? `天候${code}`;
}
