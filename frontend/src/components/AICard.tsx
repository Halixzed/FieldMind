import type { AIResponse } from '../types';

interface Props {
  data: AIResponse | null;
}

export default function AICard({ data }: Props) {
  const ai = data?.ai;

  return (
    <div className="ai-card">
      <div className="ai-card-header">
        <div className="ai-chip">AI RECOMMENDATION</div>
        <div className="ai-source">{data?.source ?? 'loading…'}</div>
      </div>

      <div className="ai-text">
        {ai?.recommendation ?? 'Analysing soil conditions and weather forecast…'}
      </div>

      {ai?.crops && ai.crops.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {ai.crops.map(c => {
            const yPct = Math.round(c.yield_pct);
            const color = yPct >= 75 ? '#3B6D11' : yPct >= 55 ? '#BA7517' : '#A32D2D';
            const actionClass = c.action.includes('now')
              ? 'action-now'
              : c.action.includes('delay')
              ? 'action-delay'
              : 'action-no';
            return (
              <div className="crop-row" key={c.name}>
                <div>
                  <div className="crop-name">{c.name}</div>
                  <div className={`crop-action ${actionClass}`}>
                    {c.action} · {c.days_to_harvest}d
                  </div>
                </div>
                <div className="crop-right">
                  <div className="yield-pct" style={{ color }}>{yPct}%</div>
                  <div className="yield-bar-wrap">
                    <div className="yield-bar-fill" style={{ width: `${yPct}%`, background: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ai?.amendments && ai.amendments.length > 0 && (
        <div className="amendments">
          <div className="amendments-label">Soil amendments needed</div>
          {ai.amendments.map(a => (
            <span className="amendment-pill" key={a}>{a}</span>
          ))}
        </div>
      )}

      {ai?.market_note && (
        <div className="market-note">{ai.market_note}</div>
      )}
    </div>
  );
}
