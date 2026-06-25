import React from 'react';
import RealTimeConferenceAnalyticsDashboard from '../../components/RealTimeConferenceAnalyticsDashboard.jsx';

const apiBaseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';

export default function App() {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-5">
      <div className="mx-auto w-full max-w-[1440px]">
        <RealTimeConferenceAnalyticsDashboard
          apiBaseUrl={apiBaseUrl}
          title="Real-time Conference Dashboard"
        />
        <p className="mt-3 text-center text-xs font-medium text-slate-500">
          Hệ thống Quản lý Hội nghị của Học viện Quân y - K80
        </p>
      </div>
    </main>
  );
}
