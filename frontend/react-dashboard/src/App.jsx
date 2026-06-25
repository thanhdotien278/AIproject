import React from 'react';
import RealTimeConferenceAnalyticsDashboard from '../../components/RealTimeConferenceAnalyticsDashboard.jsx';

const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';

export default function App() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <RealTimeConferenceAnalyticsDashboard
          apiBaseUrl={apiBaseUrl}
          title="Real-time Conference Dashboard"
        />
        <p className="mt-6 text-center text-xs text-slate-500">
          Data source:{' '}
          <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-slate-700">/api/stats</code> • Realtime
          event:{' '}
          <code className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-slate-700">statsUpdated</code>
        </p>
      </div>
    </main>
  );
}
