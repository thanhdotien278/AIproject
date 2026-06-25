import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  Globe,
  Info,
  RefreshCw,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

const DEFAULT_SOCKET_TRANSPORTS = ['websocket'];
const DEFAULT_QR_TTL_SECONDS = 30;

const emptyStats = Object.freeze({
  totalRegisteredFromParticipants: 0,
  expectedParticipants: 0,
  maxAttendees: 0,
  totalParticipants: 0,
  totalSource: 'manual',
  checkedInCount: 0,
  notCheckedInCount: 0,
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
  const totalParticipants = toNumber(source.totalParticipants);
  const expectedParticipants = toNumber(source.expectedParticipants);
  const checkedInCount = toNumber(source.checkedInCount);
  return {
    totalRegisteredFromParticipants: toNumber(source.totalRegisteredFromParticipants),
    expectedParticipants,
    maxAttendees: toNumber(source.maxAttendees),
    totalParticipants,
    totalSource: source.totalSource === 'participants' ? 'participants' : 'manual',
    checkedInCount,
    notCheckedInCount: toNumber(source.notCheckedInCount) || Math.max((expectedParticipants || totalParticipants) - checkedInCount, 0),
    lunchCount: toNumber(source.lunchCount),
    dinnerCount: toNumber(source.dinnerCount),
    transportCount: toNumber(source.transportCount),
    hocVienCount: toNumber(source.hocVienCount),
    donViNgoaiCount: toNumber(source.donViNgoaiCount),
  };
}

function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatNumber(value) {
  return Math.round(toNumber(value)).toLocaleString('vi-VN');
}

function formatRelativeTime(date) {
  if (!date) return 'chưa có';
  const d = date instanceof Date ? date : new Date(date);
  const seconds = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (seconds < 5) return 'vừa xong';
  if (seconds < 60) return `${seconds}s trước`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m trước`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h trước`;
}

function formatClock(date) {
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function getQrTtlSeconds(data) {
  const ttlSeconds = toNumber(data?.ttlSeconds);
  if (ttlSeconds > 0) return ttlSeconds;
  const ttlMs = toNumber(data?.ttlMs);
  if (ttlMs > 0) return Math.ceil(ttlMs / 1000);
  return DEFAULT_QR_TTL_SECONDS;
}

function getQrExpiryMs(data) {
  const expiresAt = toNumber(data?.expiresAt);
  if (expiresAt > 0) return expiresAt;
  return Date.now() + getQrTtlSeconds(data) * 1000;
}

function StatCard({ label, value, percentText, Icon, accent }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.07)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-4xl font-bold leading-none tracking-tight text-slate-950">{formatNumber(value)}</p>
          <p className="mt-3 text-sm text-slate-500">{percentText}</p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ProgressRow({ label, count, total, colorClass }) {
  const pct = percent(count, total);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-bold text-slate-950">
          {formatNumber(count)} <span className="font-semibold text-slate-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ServiceProgressCard({ stats, total }) {
  return (
    <Card
      title="Tỷ lệ đăng ký dịch vụ"
      aside={<span className="text-xs font-medium text-slate-500">trên tổng người tham dự</span>}
      className="h-full"
    >
      <div className="space-y-7">
        <ProgressRow label="Ăn trưa" count={stats.lunchCount} total={total} colorClass="bg-gradient-to-r from-amber-400 to-orange-500" />
        <ProgressRow label="Ăn tối" count={stats.dinnerCount} total={total} colorClass="bg-gradient-to-r from-violet-400 to-fuchsia-500" />
        <ProgressRow label="Xe đưa đón" count={stats.transportCount} total={total} colorClass="bg-gradient-to-r from-emerald-400 to-green-500" />
      </div>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-lg">
      {label ? <div className="font-semibold">{label}</div> : null}
      {payload.map(item => (
        <div key={`${item.dataKey}-${item.name}`} className="mt-1 flex justify-between gap-6">
          <span className="text-slate-600">{item.name || item.dataKey}</span>
          <span className="font-bold">{formatNumber(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function InternalExternalDonut({ stats, total }) {
  const internalPct = percent(stats.hocVienCount, total);
  const externalPct = percent(stats.donViNgoaiCount, total);
  const data = [
    { name: 'Nội bộ', value: stats.hocVienCount, color: '#22c55e' },
    { name: 'Bên ngoài', value: stats.donViNgoaiCount, color: '#60a5fa' },
  ];

  return (
    <Card title="Nội bộ vs Bên ngoài" className="h-full">
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} stroke="white" strokeWidth={3}>
              {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold text-slate-500">Tổng</div>
          <div className="text-3xl font-bold text-slate-950">{formatNumber(total)}</div>
          <div className="mt-1 text-xs text-slate-500">Internal {internalPct}% • External {externalPct}%</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-slate-600">Nội bộ</div>
          <div className="mt-1 text-xl font-bold text-slate-950">{formatNumber(stats.hocVienCount)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-slate-600">Bên ngoài</div>
          <div className="mt-1 text-xl font-bold text-slate-950">{formatNumber(stats.donViNgoaiCount)}</div>
        </div>
      </div>
    </Card>
  );
}

function CheckInQrCard({ qr, countdown, loading, error, onDownload }) {
  const active = Boolean(qr?.qrCodeDataUrl && countdown > 0 && !error);
  const status = error
    ? `Không tải được QR code: ${error}`
    : active
      ? 'QR code đang hoạt động'
      : 'QR đã hết hạn, đang tạo mã mới';

  return (
    <section className="rounded-[20px] border border-blue-400 bg-white p-5 shadow-[0_14px_38px_rgba(37,99,235,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl font-extrabold tracking-wide text-blue-600">QR CODE CHECK-IN</h3>
        <Info className="h-5 w-5 text-slate-500" aria-label="Thông tin QR check-in" />
      </div>

      <div className={`mt-4 flex items-start gap-2 text-sm font-semibold ${active ? 'text-emerald-700' : 'text-rose-700'}`} role="status">
        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden="true" />
        <span>{loading ? 'Đang tải QR code...' : status}</span>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="rounded-2xl border-4 border-blue-500 bg-white p-3">
          {qr?.qrCodeDataUrl ? (
            <img src={qr.qrCodeDataUrl} alt="QR code check-in tham dự hội nghị" className="h-[260px] w-[260px] object-contain sm:h-[300px] sm:w-[300px]" />
          ) : (
            <div className="flex h-[260px] w-[260px] items-center justify-center rounded-xl bg-slate-100 text-center text-sm text-slate-500 sm:h-[300px] sm:w-[300px]">
              Chưa có QR code
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-base font-bold text-slate-700">Quét mã để check-in tham dự</p>
      <p className="mt-2 flex items-center justify-center gap-2 text-base font-bold text-blue-600">
        <Clock3 className="h-5 w-5" aria-hidden="true" />
        QR hết hạn sau: {String(Math.max(countdown, 0)).padStart(2, '0')}s
      </p>

      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={!qr?.qrCodeDataUrl}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Tải QR code
        </button>
      </div>
    </section>
  );
}

function QuickSummaryCard({ stats, total, notCheckedInCount, lastUpdatedAt }) {
  return (
    <Card title="Tổng quan nhanh" aside={<Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />}>
      <dl className="space-y-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Tổng người tham dự</dt>
          <dd className="font-bold text-slate-950">{formatNumber(total)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Đã check-in</dt>
          <dd className="font-bold text-emerald-600">{formatNumber(stats.checkedInCount)} ({percent(stats.checkedInCount, total)}%)</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Chưa check-in</dt>
          <dd className="font-bold text-orange-600">{formatNumber(notCheckedInCount)} ({percent(notCheckedInCount, total)}%)</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-600">Cập nhật cuối</dt>
          <dd className="font-bold text-slate-950">{formatClock(lastUpdatedAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function RecentCheckInsTable() {
  return (
    <Card
      title="5 lượt check-in gần nhất"
      aside={<a href="/admin/dashboard" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Xem tất cả</a>}
    >
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-800">Dashboard công khai chỉ hiển thị số liệu tổng hợp.</p>
        <p className="mt-1 text-sm text-slate-500">Dữ liệu từng người tham dự được giữ trong khu vực quản trị đã đăng nhập.</p>
      </div>
    </Card>
  );
}

export default function RealTimeConferenceAnalyticsDashboard({
  apiBaseUrl = '',
  socketUrl,
  socketPath = '/socket.io',
  socketTransports = DEFAULT_SOCKET_TRANSPORTS,
  defaultConferenceCode = 'all',
  title = 'Real-time Conference Dashboard',
  className = '',
}) {
  const [conferences, setConferences] = useState([]);
  const [conferenceCode, setConferenceCode] = useState(defaultConferenceCode);
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [qr, setQr] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');
  const [countdown, setCountdown] = useState(DEFAULT_QR_TTL_SECONDS);
  const socketRef = useRef(null);
  const qrRequestRef = useRef(0);

  const displayTotal = stats.expectedParticipants || stats.totalParticipants;
  const notCheckedInCount = Math.max(displayTotal - stats.checkedInCount, 0);
  const checkedInPct = percent(stats.checkedInCount, displayTotal);
  const notCheckedInPct = percent(notCheckedInCount, displayTotal);
  const internalPct = percent(stats.hocVienCount, displayTotal);
  const externalPct = percent(stats.donViNgoaiCount, displayTotal);

  const conferenceOptions = useMemo(() => [{ code: 'all', name: 'Tất cả hội nghị', isActive: false }].concat(conferences), [conferences]);
  const selectedConferenceName = useMemo(() => {
    const found = conferenceOptions.find(c => c.code === conferenceCode);
    return found?.name || 'Tất cả hội nghị';
  }, [conferenceOptions, conferenceCode]);

  const fetchStats = useCallback(async code => {
    const res = await fetch(`${apiBaseUrl}/api/stats?conferenceCode=${encodeURIComponent(code)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load stats');
    return normalizeStats(data);
  }, [apiBaseUrl]);

  const refreshStats = useCallback(async ({ spin = false } = {}) => {
    try {
      if (spin) setLoading(true);
      setError('');
      const fresh = await fetchStats(conferenceCode);
      setStats(fresh);
      setLastUpdatedAt(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to refresh');
    } finally {
      if (spin) setLoading(false);
    }
  }, [conferenceCode, fetchStats]);

  const fetchQr = useCallback(async code => {
    const requestId = qrRequestRef.current + 1;
    qrRequestRef.current = requestId;
    setQrLoading(true);
    setQrError('');
    try {
      const res = await fetch(`${apiBaseUrl}/api/attendance-qr?code=${encodeURIComponent(code)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load QR code');
      if (qrRequestRef.current !== requestId) return;
      const expiresAtMs = getQrExpiryMs(data);
      setQr({
        qrCodeDataUrl: data.qrCodeDataUrl || data.qrUrl || '',
        expiresAtMs,
      });
      setCountdown(Math.max(Math.ceil((expiresAtMs - Date.now()) / 1000), 0));
    } catch (e) {
      if (qrRequestRef.current === requestId) setQrError(e?.message || 'Failed to load QR code');
    } finally {
      if (qrRequestRef.current === requestId) setQrLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/conferences`, { headers: { Accept: 'application/json' } });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.message || 'Failed to load conferences');
        if (!cancelled) {
          const loadedConferences = Array.isArray(data.conferences) ? data.conferences : [];
          setConferences(loadedConferences);
          const activeConference = loadedConferences.find(c => c.isActive);
          if (activeConference?.code) {
            setConferenceCode(current => (current === 'all' ? activeConference.code : current));
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load conferences');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  useEffect(() => {
    refreshStats({ spin: true });
    fetchQr(conferenceCode);
  }, [conferenceCode, fetchQr, refreshStats]);

  useEffect(() => {
    const expiresAtMs = qr?.expiresAtMs;
    if (!expiresAtMs) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(Math.ceil((expiresAtMs - Date.now()) / 1000), 0);
      setCountdown(remaining);
      if (remaining === 0 && !qrLoading) fetchQr(conferenceCode);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [conferenceCode, fetchQr, qr?.expiresAtMs, qrLoading]);

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
      if (conferenceCode !== 'all' && code && code !== conferenceCode) return;
      if (conferenceCode === 'all' && code && code !== 'all') {
        refreshStats();
        return;
      }
      if (!payload?.stats && typeof payload?.checkedInCount === 'undefined') {
        refreshStats();
        return;
      }
      setStats(normalizeStats(payload));
      setLastUpdatedAt(new Date());
    };

    socket.on('connect', () => {
      setRealtimeConnected(true);
      setError('');
    });
    socket.on('disconnect', () => setRealtimeConnected(false));
    socket.on('connect_error', err => {
      setRealtimeConnected(false);
      setError(err?.message ? `Không thể kết nối realtime: ${err.message}` : 'Không thể kết nối realtime');
    });
    socket.on('statsUpdated', onStatsUpdated);

    return () => {
      socket.off('statsUpdated', onStatsUpdated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [apiBaseUrl, conferenceCode, refreshStats, socketPath, socketTransports, socketUrl]);

  useEffect(() => {
    if (realtimeConnected) return undefined;
    const timer = window.setInterval(() => refreshStats(), 30000);
    return () => window.clearInterval(timer);
  }, [realtimeConnected, refreshStats]);

  const handleRefresh = () => {
    refreshStats({ spin: true });
    fetchQr(conferenceCode);
  };

  const handleDownloadQr = () => {
    if (!qr?.qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qr.qrCodeDataUrl;
    link.download = `attendance-qr-${conferenceCode}.png`;
    link.click();
  };

  return (
    <section className={`relative overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] sm:p-7 ${className}`}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{selectedConferenceName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-end">
          <label className="relative block min-w-[280px] lg:min-w-[520px]" htmlFor="conference-select">
            <span className="sr-only">Chọn hội nghị</span>
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <select
              id="conference-select"
              value={conferenceCode}
              onChange={e => setConferenceCode(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-200"
            >
              {conferenceOptions.map(c => (
                <option key={c.code} value={c.code}>
                  {c.name} {c.isActive ? '(Đang mở)' : ''}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Làm mới
          </button>

          <div className="text-left lg:text-right">
            <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${realtimeConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
              <span className={`h-3 w-3 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden="true" />
              {realtimeConnected ? 'Realtime: đang hoạt động' : 'Realtime: mất kết nối'}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Cập nhật: {formatRelativeTime(lastUpdatedAt)}</p>
          </div>
        </div>
      </header>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
          {error}. Dashboard vẫn hiển thị dữ liệu gần nhất; hãy thử làm mới hoặc kiểm tra kết nối.
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Tổng người tham dự" value={displayTotal} percentText="Số lượt đăng ký hợp lệ" Icon={Users} accent="bg-gradient-to-br from-sky-500 to-blue-600" />
        <StatCard label="Đã check-in" value={stats.checkedInCount} percentText={`${checkedInPct}% trên tổng số`} Icon={UserCheck} accent="bg-gradient-to-br from-orange-400 to-orange-600" />
        <StatCard label="Chưa check-in" value={notCheckedInCount} percentText={`${notCheckedInPct}% trên tổng số`} Icon={UserX} accent="bg-gradient-to-br from-violet-500 to-fuchsia-600" />
        <StatCard label="Nội bộ (Học viện)" value={stats.hocVienCount} percentText={`${internalPct}% trên tổng số`} Icon={Building2} accent="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="Khách ngoài Học viện" value={stats.donViNgoaiCount} percentText={`${externalPct}% trên tổng số`} Icon={Globe} accent="bg-gradient-to-br from-sky-500 to-indigo-600" />
      </div>

      <div className="mt-7 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2.5fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ServiceProgressCard stats={stats} total={displayTotal} />
            <InternalExternalDonut stats={stats} total={displayTotal} />
          </div>
          <RecentCheckInsTable />
        </div>

        <aside className="space-y-5">
          <CheckInQrCard
            qr={qr}
            countdown={countdown}
            loading={qrLoading}
            error={qrError}
            onDownload={handleDownloadQr}
          />
          <QuickSummaryCard stats={stats} total={displayTotal} notCheckedInCount={notCheckedInCount} lastUpdatedAt={lastUpdatedAt} />
        </aside>
      </div>

      <div className="sr-only" aria-live="polite">Dashboard realtime event statsUpdated</div>
    </section>
  );
}
