import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bus,
  Building2,
  Globe,
  RefreshCw,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';

const emptyStats = Object.freeze({
  totalParticipants: 0,
  lunchCount: 0,
  dinnerCount: 0,
  transportCount: 0,
  hocVienCount: 0,
  donViNgoaiCount: 0,
});

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStats(payload) {
  if (!payload) return emptyStats;
  const source = payload.stats && typeof payload.stats === 'object' ? payload.stats : payload;
  return {
    totalParticipants: toNumber(source.totalParticipants),
    lunchCount: toNumber(source.lunchCount),
    dinnerCount: toNumber(source.dinnerCount),
    transportCount: toNumber(source.transportCount),
    hocVienCount: toNumber(source.hocVienCount),
    donViNgoaiCount: toNumber(source.donViNgoaiCount),
  };
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 5) return 'vừa xong';
  if (seconds < 60) return `${seconds}s trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h trước`;
  const days = Math.floor(hours / 24);
  return `${days}d trước`;
}

function useTweenNumber(value, durationMs = 320) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    const to = value;
    previous.current = value;
    if (from === to) return;

    let raf = 0;
    const start = performance.now();
    const tick = now => {
      const t = clamp01((now - start) / durationMs);
      setDisplay(from + (to - from) * t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return display;
}

function MetricCard({ title, value, subtitle, Icon, accent }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-black/5 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md">
      <div className="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-sky-200/40 blur-2xl" />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
            {Math.round(value).toLocaleString('vi-VN')}
          </p>
          {subtitle ? <p className="mt-2 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, count, total, colorClass }) {
  const pct = percent(count, total);
  const widthPct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="font-medium text-slate-900">
          {count.toLocaleString('vi-VN')} <span className="text-slate-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const header = label || payload?.[0]?.name || '';
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-900 shadow-lg shadow-black/5">
      {header ? <div className="font-medium text-slate-700">{header}</div> : null}
      {payload.map(item => (
        <div key={`${item.dataKey || 'value'}-${item.name || ''}`} className="mt-1 flex items-center justify-between gap-6">
          <span className="text-slate-600">{item.name || item.dataKey}</span>
          <span className="font-semibold text-slate-900">{toNumber(item.value).toLocaleString('vi-VN')}</span>
        </div>
      ))}
    </div>
  );
}

export default function RealTimeConferenceAnalyticsDashboard({
  apiBaseUrl = '',
  socketUrl,
  socketPath = '/socket.io',
  socketTransports = ['websocket'],
  defaultConferenceCode = 'all',
  title = 'Conference Analytics Dashboard',
  className = '',
}) {
  const [conferences, setConferences] = useState([]);
  const [conferenceCode, setConferenceCode] = useState(defaultConferenceCode);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [pulse, setPulse] = useState(false);
  const socketRef = useRef(null);

  const total = stats.totalParticipants;
  const lunchPct = percent(stats.lunchCount, total);
  const dinnerPct = percent(stats.dinnerCount, total);
  const transportPct = percent(stats.transportCount, total);
  const internalPct = percent(stats.hocVienCount, total);
  const externalPct = percent(stats.donViNgoaiCount, total);

  const animatedTotal = useTweenNumber(stats.totalParticipants);
  const animatedLunch = useTweenNumber(stats.lunchCount);
  const animatedDinner = useTweenNumber(stats.dinnerCount);
  const animatedTransport = useTweenNumber(stats.transportCount);
  const animatedInternal = useTweenNumber(stats.hocVienCount);
  const animatedExternal = useTweenNumber(stats.donViNgoaiCount);

  const conferenceOptions = useMemo(() => {
    const base = [{ code: 'all', name: 'Tất cả hội nghị', isActive: false }];
    return base.concat(conferences);
  }, [conferences]);

  const selectedConferenceName = useMemo(() => {
    const found = conferenceOptions.find(c => c.code === conferenceCode);
    return found?.name || 'Tất cả hội nghị';
  }, [conferenceOptions, conferenceCode]);

  const serviceBars = useMemo(() => {
    const remaining = count => Math.max(0, total - count);
    return [
      { name: 'Lunch', value: stats.lunchCount, remaining: remaining(stats.lunchCount) },
      { name: 'Dinner', value: stats.dinnerCount, remaining: remaining(stats.dinnerCount) },
      { name: 'Transport', value: stats.transportCount, remaining: remaining(stats.transportCount) },
    ];
  }, [stats.lunchCount, stats.dinnerCount, stats.transportCount, total]);

  const breakdown = useMemo(() => {
    return [
      { name: 'Internal', value: stats.hocVienCount, color: '#22c55e' },
      { name: 'External', value: stats.donViNgoaiCount, color: '#60a5fa' },
    ];
  }, [stats.hocVienCount, stats.donViNgoaiCount]);

  const fetchConferences = async () => {
    const res = await fetch(`${apiBaseUrl}/api/conferences`, { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load conferences');
    setConferences(Array.isArray(data.conferences) ? data.conferences : []);
  };

  const fetchStats = async code => {
    const res = await fetch(`${apiBaseUrl}/api/stats?conferenceCode=${encodeURIComponent(code)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load stats');
    return normalizeStats(data);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchConferences();
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load conferences');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const fresh = await fetchStats(conferenceCode);
        if (cancelled) return;
        setStats(fresh);
        setLastUpdatedAt(new Date());
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, conferenceCode]);

  useEffect(() => {
    const socket = io(socketUrl ?? (apiBaseUrl || undefined), {
      path: socketPath,
      transports: socketTransports,
      timeout: 8000,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
    });
    socketRef.current = socket;

    const onStatsUpdated = payload => {
      const code = payload?.conferenceCode;
      if (!code) return;
      if (code !== conferenceCode) return;
      setStats(normalizeStats(payload));
      setLastUpdatedAt(new Date());
      setPulse(true);
      window.setTimeout(() => setPulse(false), 380);
    };

    socket.on('connect', () => setError(''));
    socket.on('connect_error', err => {
      const msg = err && err.message ? `Không thể kết nối realtime: ${err.message}` : 'Không thể kết nối realtime';
      setError(msg);
    });
    socket.on('statsUpdated', onStatsUpdated);

    return () => {
      socket.off('statsUpdated', onStatsUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBaseUrl, socketPath, socketTransports, socketUrl, conferenceCode]);

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError('');
      const fresh = await fetchStats(conferenceCode);
      setStats(fresh);
      setLastUpdatedAt(new Date());
      setPulse(true);
      window.setTimeout(() => setPulse(false), 380);
    } catch (e) {
      setError(e?.message || 'Failed to refresh');
    } finally {
      setLoading(false);
    }
  };

	  return (
	    <section
	      className={[
	        'relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-black/5',
	        className,
	      ].join(' ')}
	    >
	      <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_18%_15%,rgba(56,189,248,0.16),transparent_40%),radial-gradient(1000px_circle_at_82%_25%,rgba(167,139,250,0.14),transparent_45%),radial-gradient(900px_circle_at_55%_95%,rgba(34,197,94,0.10),transparent_45%)]" />

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
	            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
	            <p className="mt-1 text-sm text-slate-600">
	              {selectedConferenceName}
	            </p>
	            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span
	                className={[
	                  'inline-flex items-center gap-2 rounded-full border px-3 py-1',
	                  error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800',
	                ].join(' ')}
	              >
	                <span
	                  className={[
	                    'h-2 w-2 rounded-full',
	                    error ? 'bg-rose-500' : 'bg-emerald-500',
	                    pulse ? 'ring-4 ring-emerald-500/20' : 'ring-0',
	                    'transition-all duration-300',
	                  ].join(' ')}
	                  aria-hidden="true"
	                />
	                {error ? 'Realtime: lỗi kết nối' : 'Realtime: đang hoạt động'}
	              </span>
	              {lastUpdatedAt ? <span className="text-slate-500">Cập nhật {formatRelativeTime(lastUpdatedAt)}</span> : null}
	            </div>
	          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center gap-3">
	              <label className="text-sm font-medium text-slate-700" htmlFor="conference-select">
	                Hội nghị
	              </label>
              <div className="relative">
                <select
	                  id="conference-select"
	                  value={conferenceCode}
	                  onChange={e => setConferenceCode(e.target.value)}
	                  className="w-full min-w-[240px] appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-400/60 focus:ring-4 focus:ring-cyan-400/15"
	                >
	                  {conferenceOptions.map(c => (
	                    <option key={c.code} value={c.code} className="bg-white text-slate-900">
	                      {c.name} {c.isActive ? '(Đang mở)' : ''}
	                    </option>
	                  ))}
	                </select>
	                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
	                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                    <path
                      d="M7 10l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <button
	              type="button"
	              onClick={handleRefresh}
	              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-60"
	              disabled={loading}
	            >
              <RefreshCw className={['h-4 w-4', loading ? 'animate-spin' : ''].join(' ')} />
              Làm mới
            </button>
          </div>
        </div>

	        {error ? (
	          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
	            {error}. Dashboard vẫn hiển thị dữ liệu gần nhất; hãy thử làm mới hoặc kiểm tra kết nối.
	          </div>
	        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
	          {loading ? (
	            Array.from({ length: 6 }).map((_, idx) => (
	              <div key={idx} className="h-[132px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
	            ))
	          ) : (
            <>
              <MetricCard
                title="Tổng người tham dự"
                value={animatedTotal}
                subtitle="Số lượt đăng ký hợp lệ"
                Icon={Users}
                accent="bg-gradient-to-br from-cyan-500 to-blue-600"
              />
              <MetricCard
                title="Đăng ký ăn trưa"
                value={animatedLunch}
                subtitle={`${lunchPct}% trên tổng số`}
                Icon={Utensils}
                accent="bg-gradient-to-br from-amber-500 to-orange-600"
              />
              <MetricCard
                title="Đăng ký ăn tối"
                value={animatedDinner}
                subtitle={`${dinnerPct}% trên tổng số`}
                Icon={UtensilsCrossed}
                accent="bg-gradient-to-br from-violet-500 to-fuchsia-600"
              />
              <MetricCard
                title="Đăng ký xe đưa đón"
                value={animatedTransport}
                subtitle={`${transportPct}% trên tổng số`}
                Icon={Bus}
                accent="bg-gradient-to-br from-emerald-500 to-green-600"
              />
              <MetricCard
                title="Nội bộ (Học viện)"
                value={animatedInternal}
                subtitle={`${internalPct}% trên tổng số`}
                Icon={Building2}
                accent="bg-gradient-to-br from-emerald-500 to-teal-600"
              />
              <MetricCard
                title="Bên ngoài"
                value={animatedExternal}
                subtitle={`${externalPct}% trên tổng số`}
                Icon={Globe}
                accent="bg-gradient-to-br from-sky-500 to-indigo-600"
              />
            </>
          )}
        </div>

	        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
	          <div className="lg:col-span-2">
	            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5">
	              <div className="flex items-center justify-between">
	                <h3 className="text-sm font-semibold text-slate-900">Tỷ lệ đăng ký dịch vụ</h3>
	                <span className="text-xs text-slate-500">trên tổng người tham dự</span>
	              </div>
              <div className="mt-4 space-y-4">
                <ProgressRow
                  label="Ăn trưa"
                  count={stats.lunchCount}
                  total={total}
                  colorClass="bg-gradient-to-r from-amber-400 to-orange-500"
                />
                <ProgressRow
                  label="Ăn tối"
                  count={stats.dinnerCount}
                  total={total}
                  colorClass="bg-gradient-to-r from-violet-400 to-fuchsia-500"
                />
                <ProgressRow
                  label="Xe đưa đón"
                  count={stats.transportCount}
                  total={total}
                  colorClass="bg-gradient-to-r from-emerald-400 to-green-500"
                />
              </div>
            </div>
          </div>

	          <div className="lg:col-span-3">
	            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
	              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5">
	                <div className="flex items-center justify-between">
	                  <h3 className="text-sm font-semibold text-slate-900">Dinner/Lunch/Transport vs Total</h3>

	                </div>
	                <div className="mt-4 h-56">
	                  <ResponsiveContainer width="100%" height="100%">
	                    <BarChart data={serviceBars} layout="vertical" barCategoryGap={16} margin={{ left: 8, right: 12 }}>
	                      <CartesianGrid stroke="rgba(15,23,42,0.08)" horizontal={false} />
	                      <XAxis
	                        type="number"
	                        tick={{ fill: 'rgba(15,23,42,0.55)', fontSize: 12 }}
	                        axisLine={false}
	                        tickLine={false}
	                      />
	                      <YAxis
	                        type="category"
	                        dataKey="name"
	                        tick={{ fill: 'rgba(15,23,42,0.75)', fontSize: 12 }}
	                        axisLine={false}
	                        tickLine={false}
	                        width={86}
	                      />
	                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
	                      <Bar dataKey="value" name="Registered" stackId="a" fill="rgba(56,189,248,0.9)" radius={[6, 6, 6, 6]} />
	                      <Bar dataKey="remaining" name="Remaining" stackId="a" fill="rgba(15,23,42,0.08)" radius={[6, 6, 6, 6]} />
	                    </BarChart>
	                  </ResponsiveContainer>
	                </div>
	                <p className="mt-3 text-xs text-slate-500">
	                  Mỗi thanh biểu diễn số lượng đăng ký dịch vụ so với tổng người tham dự (phần còn lại).
	                </p>
	              </div>

	              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5">
	                <div className="flex items-center justify-between">
	                  <h3 className="text-sm font-semibold text-slate-900">Nội bộ vs Bên ngoài</h3>
	                </div>
                <div className="relative mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip />} />
                      <Pie
                        data={breakdown}
                        dataKey="value"
                        nameKey="name"
	                        innerRadius={62}
	                        outerRadius={92}
	                        paddingAngle={3}
	                        stroke="rgba(15,23,42,0.10)"
	                        strokeWidth={1}
	                      >
                        {breakdown.map(entry => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
	                  </ResponsiveContainer>
	                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
	                    <div className="text-sm font-medium text-slate-600">Tổng</div>
	                    <div className="text-3xl font-semibold text-slate-900">{total.toLocaleString('vi-VN')}</div>
	                    <div className="mt-1 text-xs text-slate-500">Internal {internalPct}% • External {externalPct}%</div>
	                  </div>
	                </div>
	                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
	                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
	                    <div className="text-slate-600">Nội bộ</div>
	                    <div className="mt-1 font-semibold text-slate-900">{stats.hocVienCount.toLocaleString('vi-VN')}</div>
	                  </div>
	                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
	                    <div className="text-slate-600">Bên ngoài</div>
	                    <div className="mt-1 font-semibold text-slate-900">{stats.donViNgoaiCount.toLocaleString('vi-VN')}</div>
	                  </div>
	                </div>
	              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
