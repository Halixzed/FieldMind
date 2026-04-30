import type { AIAlert } from '../types';

export default function AlertBox({ alert }: { alert: AIAlert | null | undefined }) {
  const level = alert?.level ?? 'ok';
  const message = alert?.message ?? 'All conditions nominal.';
  return (
    <div className={`alert alert-${level}`}>
      <div className="alert-text">{message}</div>
    </div>
  );
}
