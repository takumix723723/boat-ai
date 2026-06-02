import './RaceVerdictBanner.css';

const VERDICT_CLASS = {
  bet: 'race-verdict--bet',
  watch: 'race-verdict--watch',
  skip: 'race-verdict--skip',
};

export default function RaceVerdictBanner({ betAdvice }) {
  if (!betAdvice?.available) return null;

  const {
    verdict,
    verdictLabel,
    verdictSubtitle,
    stakePlan,
    stakeDisclaimer,
    verdictReasons,
    evHonmei,
  } = betAdvice;
  const stakeNote =
    stakeDisclaimer ?? stakePlan?.disclaimer ?? '配分はおすすめ例です（固定の賭け金ではありません）';

  const cls = VERDICT_CLASS[verdict] ?? 'race-verdict--watch';

  return (
    <section className={`race-verdict card ${cls}`} aria-live="polite">
      <div className="race-verdict-main">
        <span className="race-verdict-label">{verdictLabel}</span>
        <span className="race-verdict-sub">{verdictSubtitle}</span>
      </div>
      {verdict !== 'skip' && stakePlan?.totalYen > 0 && (
        <p className="race-verdict-stake">
          配分の例 {stakePlan.totalYen}円（本命{stakePlan.honmei} / 抑え
          {stakePlan.osae}
          {stakePlan.box > 0 ? ` / BOX${stakePlan.box}` : ''}）
        </p>
      )}
      {verdict !== 'skip' && stakePlan?.totalYen > 0 && (
        <p className="race-verdict-disclaimer">{stakeNote}</p>
      )}
      {verdict === 'skip' && (
        <p className="race-verdict-stake">購入推奨なし · 下記は参考買い目です</p>
      )}
      {evHonmei != null && (
        <p className="race-verdict-ev">推定EV（本命）: {evHonmei >= 0 ? '+' : ''}{evHonmei}</p>
      )}
      {verdictReasons?.length > 0 && (
        <ul className="race-verdict-reasons">
          {verdictReasons.slice(0, 3).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
