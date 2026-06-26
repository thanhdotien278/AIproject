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
  UserX,
} from 'lucide-react';

const DEFAULT_SOCKET_TRANSPORTS = ['websocket'];
const DEFAULT_QR_TTL_SECONDS = 30;
const DEFAULT_QR_REFRESH_MS = DEFAULT_QR_TTL_SECONDS * 1000;

const emptyStats = Object.freeze({
  totalRegisteredFromParticipants: 0,
  expectedParticipants: 0,
  maxAttendees: 0,
  totalParticipants: 0,
  totalSource: 'manual',
  checkedInCount: 0,
  notCheckedInCount: 0,
  checkedInPercent: 0,
  notCheckedInPercent: 0,
  internalCount: 0,
  externalCount: 0,
  lunchCount: 0,
  dinnerCount: 0,
  transportCount: 0,
  hocVienCount: 0,
  donViNgoaiCount: 0,
  recentCheckIns: [],
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
  const notCheckedInCount = source.notCheckedInCount === undefined
    ? Math.max(expectedParticipants - checkedInCount, 0)
    : Math.max(toNumber(source.notCheckedInCount), 0);
  const internalCount = toNumber(source.internalCount ?? source.hocVienCount);
  const externalCount = source.externalCount === undefined && source.donViNgoaiCount === undefined
    ? Math.max(checkedInCount - internalCount, 0)
    : toNumber(source.externalCount ?? source.donViNgoaiCount);
  return {
    totalRegisteredFromParticipants: toNumber(source.totalRegisteredFromParticipants),
    expectedParticipants,
    maxAttendees: toNumber(source.maxAttendees),
    totalParticipants,
    totalSource: source.totalSource === 'participants' ? 'participants' : 'manual',
    checkedInCount,
    notCheckedInCount,
    checkedInPercent: toNumber(source.checkedInPercent) || percent(checkedInCount, expectedParticipants),
    notCheckedInPercent: toNumber(source.notCheckedInPercent) || percent(notCheckedInCount, expectedParticipants),
    internalCount,
    externalCount,
    lunchCount: toNumber(source.lunchCount),
    dinnerCount: toNumber(source.dinnerCount),
    transportCount: toNumber(source.transportCount),
    hocVienCount: internalCount,
    donViNgoaiCount: externalCount,
    recentCheckIns: Array.isArray(source.recentCheckIns) ? source.recentCheckIns : [],
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

function formatShortTime(value) {
  if (!value) return '--:--';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function displayText(value, fallback = '—') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatParticipantDisplayName(participant) {
  return [participant.rank, participant.academic, participant.fullName || participant.name]
    .map(value => (value === undefined || value === null ? '' : String(value).trim()))
    .filter(Boolean)
    .join(', ') || '—';
}

function formatServices(services = {}) {
  const labels = [];
  if (services.lunch) labels.push('Ăn trưa');
  if (services.dinner) labels.push('Ăn tối');
  if (services.transport) labels.push('Xe đưa đón');
  return labels.length ? labels.join(', ') : '—';
}

function getQrRefreshDelayMs(data) {
  const expiresAt = toNumber(data?.expiresAt);
  const openAt = toNumber(data?.openAt);
  const serverNow = toNumber(data?.serverNow);
  if (serverNow > 0) {
    if (expiresAt > 0) return Math.max(expiresAt - serverNow, 0);
    if (data?.state === 'not_available_yet' && openAt > 0) return Math.max(openAt - serverNow, 0);
  }

  const rotationTtlSeconds = toNumber(data?.rotationTtlSeconds);
  if (rotationTtlSeconds > 0) return rotationTtlSeconds * 1000;
  const ttlSeconds = toNumber(data?.ttlSeconds);
  if (ttlSeconds > 0) return ttlSeconds * 1000;
  const ttlMs = toNumber(data?.ttlMs);
  if (ttlMs > 0) return ttlMs;
  return DEFAULT_QR_REFRESH_MS;
}

function getQrStateMessage(data) {
  if (data?.state === 'window_closed') return 'Đã hết thời gian đăng ký';
  if (data?.state === 'not_available_yet') return 'Chưa đến thời gian mở QR Check-in';
  return data?.message || 'Chưa có QR code';
}

function StatCard({ label, value, percentText, Icon, accent }) {
  return (
    <div className="min-h-[96px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight text-slate-950">{formatNumber(value)}</p>
          <p className="mt-2 text-xs text-slate-500">{percentText}</p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, aside, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
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

function ServiceProgressCard({ stats, total, className = '' }) {
  return (
    <Card
      title="Tỷ lệ đăng ký dịch vụ"
      aside={<span className="text-xs font-medium text-slate-500">trên số đã ghi nhận</span>}
      className={`h-full ${className}`}
    >
      <div className="space-y-4">
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

function InternalExternalDonut({ stats, total, className = '' }) {
  const internalPct = percent(stats.internalCount, total);
  const externalPct = percent(stats.externalCount, total);
  const data = [
    { name: 'Nội bộ', value: stats.internalCount, color: '#22c55e' },
    { name: 'Bên ngoài', value: stats.externalCount, color: '#60a5fa' },
  ];

  return (
    <Card title="Nội bộ vs Bên ngoài" className={`h-full ${className}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(96px,0.8fr)] items-center gap-2">
        <div className="relative h-32 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={35} outerRadius={54} paddingAngle={3} stroke="white" strokeWidth={3}>
                {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-sm font-semibold text-slate-500">Tổng</div>
            <div className="text-2xl font-bold text-slate-950">{formatNumber(total)}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-slate-600">Nội bộ</div>
            <div className="mt-1 text-xl font-bold leading-none text-slate-950">{formatNumber(stats.internalCount)}</div>
            <div className="mt-1 text-xs font-semibold text-emerald-600">{internalPct}%</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-slate-600">Bên ngoài</div>
            <div className="mt-1 text-xl font-bold leading-none text-slate-950">{formatNumber(stats.externalCount)}</div>
            <div className="mt-1 text-xs font-semibold text-sky-600">{externalPct}%</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CheckInQrCard({ qr, countdown, onDownload, className = '' }) {
  const hasQr = qr?.state === 'available' && qr?.qrCodeDataUrl;

  return (
    <section className={`rounded-2xl border border-blue-400 bg-white p-4 shadow-[0_12px_32px_rgba(37,99,235,0.10)] ${className}`}>
      <div className="flex justify-end">
        <Info className="h-5 w-5 text-slate-500" aria-label="Thông tin QR check-in" />
      </div>

      <div className="mt-3 flex justify-center">
        <div className="rounded-2xl border-4 border-blue-500 bg-white p-2">
          {hasQr ? (
            <img src={qr.qrCodeDataUrl} alt="QR code check-in tham dự hội nghị" className="h-[188px] w-[188px] object-contain sm:h-[200px] sm:w-[200px]" />
          ) : (
            <div className="flex h-[188px] w-[188px] items-center justify-center rounded-xl bg-slate-100 px-4 text-center text-sm font-semibold text-slate-600 sm:h-[200px] sm:w-[200px]">
              {getQrStateMessage(qr)}
            </div>
          )}
        </div>
      </div>

      {hasQr ? (
        <>
          <p className="mt-3 text-center text-sm font-bold text-slate-700">Quét mã để check-in tham dự</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-blue-600">
            <Clock3 className="h-5 w-5" aria-hidden="true" />
            QR hết hạn sau: {String(Math.max(countdown, 0)).padStart(2, '0')}s
          </p>

          <div className="mt-3 space-y-3">
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Tải QR code
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function QuickSummaryCard({ stats, lastUpdatedAt, className = '' }) {
  return (
    <Card title="Tổng quan nhanh" aside={<Clock3 className="h-5 w-5 text-slate-400" aria-hidden="true" />} className={className}>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-600">Số dự kiến</dt>
          <dd className="mt-1 font-bold text-slate-950">{formatNumber(stats.expectedParticipants)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Đã check-in</dt>
          <dd className="mt-1 font-bold text-emerald-600">{formatNumber(stats.checkedInCount)} ({stats.checkedInPercent}%)</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Chưa check-in</dt>
          <dd className="mt-1 font-bold text-orange-600">{formatNumber(stats.notCheckedInCount)} ({stats.notCheckedInPercent}%)</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Cập nhật cuối</dt>
          <dd className="mt-1 font-bold text-slate-950">{formatClock(lastUpdatedAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function RecentCheckInsTable({ rows, conferenceCode }) {
  const adminUrl = `/admin/dashboard?conferenceCode=${encodeURIComponent(conferenceCode || 'all')}`;
  return (
    <Card
      title="5 lượt check-in gần nhất"
      aside={<a href={adminUrl} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">Xem tất cả</a>}
    >
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 py-2 pr-3">TT</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Họ tên</th>
                  <th className="py-2 pr-3">Chức vụ</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2">Dịch vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => (
                  <tr key={row.id || `${row.fullName}-${row.time}`} className="align-top">
                    <td className="py-2 pr-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                      <span className="sr-only">Đã ghi nhận</span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-slate-600">{formatShortTime(row.time)}</td>
                    <td className="py-2 pr-3 font-semibold text-slate-900">{formatParticipantDisplayName(row)}</td>
                    <td className="py-2 pr-3 text-slate-600">{displayText(row.position)}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${row.type === 'Nội bộ' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {displayText(row.type)}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{formatServices(row.services)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map(row => (
              <div key={row.id || `${row.fullName}-${row.time}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="sr-only">Đã ghi nhận</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{formatParticipantDisplayName(row)}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatShortTime(row.time)} · {displayText(row.position)}</div>
                    <div className="mt-2 text-xs text-slate-600">{displayText(row.type)} · {formatServices(row.services)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          Chưa có lượt check-in cho hội nghị này.
        </div>
      )}
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
  const [countdown, setCountdown] = useState(DEFAULT_QR_TTL_SECONDS);
  const socketRef = useRef(null);
  const qrRequestRef = useRef(0);

  const expectedParticipants = stats.expectedParticipants;
  const checkedInCount = stats.checkedInCount;
  const notCheckedInCount = stats.notCheckedInCount;
  const checkedInPct = stats.checkedInPercent;
  const notCheckedInPct = stats.notCheckedInPercent;
  const internalPct = percent(stats.internalCount, checkedInCount);
  const externalPct = percent(stats.externalCount, checkedInCount);
  const overExpected = expectedParticipants > 0 && checkedInCount > expectedParticipants;

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
    if (!code || code === 'all') {
      setQr({
        state: 'not_selected',
        qrCodeDataUrl: '',
        message: 'Chọn hội nghị để hiển thị QR Check-in',
      });
      setCountdown(0);
      return;
    }

    setQrLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/attendance-qr?code=${encodeURIComponent(code)}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json();
      if (qrRequestRef.current !== requestId) return;
      if (!res.ok || !data?.success) {
        setQr({
          state: data?.state || 'error',
          qrCodeDataUrl: '',
          message: data?.message || 'Failed to load QR code',
        });
        setCountdown(0);
        return;
      }

      const refreshDelayMs = getQrRefreshDelayMs(data);
      const expiresAtMs = data.state === 'available' ? Date.now() + refreshDelayMs : null;
      const refreshAtMs = data.state === 'not_available_yet' ? Date.now() + refreshDelayMs : null;
      setQr({
        state: data.state || 'available',
        qrCodeDataUrl: data.state === 'available' ? data.qrCodeDataUrl || data.qrUrl || '' : '',
        expiresAtMs,
        refreshAtMs,
        message: getQrStateMessage(data),
      });
      setCountdown(expiresAtMs ? Math.max(Math.ceil((expiresAtMs - Date.now()) / 1000), 0) : 0);
    } catch {
      if (qrRequestRef.current === requestId) {
        setQr({
          state: 'error',
          qrCodeDataUrl: '',
          message: 'Không thể tải QR Check-in',
        });
        setCountdown(0);
      }
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
    if (qr?.state !== 'available' || !expiresAtMs) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(Math.ceil((expiresAtMs - Date.now()) / 1000), 0);
      setCountdown(remaining);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qr?.expiresAtMs, qr?.state]);

  useEffect(() => {
    const refreshAtMs = qr?.refreshAtMs || qr?.expiresAtMs;
    if (!refreshAtMs || qr?.state === 'window_closed') return undefined;
    const timer = window.setTimeout(() => fetchQr(conferenceCode), Math.max(refreshAtMs - Date.now(), 0));
    return () => window.clearTimeout(timer);
  }, [conferenceCode, fetchQr, qr?.expiresAtMs, qr?.refreshAtMs, qr?.state]);

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
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{selectedConferenceName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
          <label className="relative block min-w-[260px] lg:min-w-[380px]" htmlFor="conference-select">
            <span className="sr-only">Chọn hội nghị</span>
            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <select
              id="conference-select"
              value={conferenceCode}
              onChange={e => setConferenceCode(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-12 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-200"
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-600 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Làm mới
          </button>

          <div className="text-left lg:text-right">
            <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${realtimeConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
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

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,340px)] xl:items-stretch">
        <div className="flex flex-col gap-4">
          <StatCard label="Đã check-in" value={checkedInCount} percentText={`${checkedInPct}% trên số dự kiến`} Icon={UserCheck} accent="bg-gradient-to-br from-orange-400 to-orange-600" />
          <StatCard label="Nội bộ (Học viện)" value={stats.internalCount} percentText={`${internalPct}% trên số đã check-in`} Icon={Building2} accent="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <ServiceProgressCard stats={stats} total={checkedInCount} className="flex-1" />
        </div>

        <div className="flex flex-col gap-4">
          <StatCard label="Chưa check-in" value={notCheckedInCount} percentText={`${notCheckedInPct}% còn lại${overExpected ? ' · Vượt dự kiến' : ''}`} Icon={UserX} accent="bg-gradient-to-br from-violet-500 to-fuchsia-600" />
          <StatCard label="Khách ngoài Học viện" value={stats.externalCount} percentText={`${externalPct}% trên số đã check-in`} Icon={Globe} accent="bg-gradient-to-br from-sky-500 to-indigo-600" />
          <InternalExternalDonut stats={stats} total={checkedInCount} className="flex-1" />
        </div>

        <aside className="flex flex-col gap-4">
          <CheckInQrCard
            qr={qr}
            countdown={countdown}
            onDownload={handleDownloadQr}
          />
          <QuickSummaryCard stats={stats} lastUpdatedAt={lastUpdatedAt} className="flex-1" />
        </aside>
      </div>

      <div className="mt-4">
        <RecentCheckInsTable rows={stats.recentCheckIns} conferenceCode={conferenceCode} />
      </div>

      <div className="sr-only" aria-live="polite">Dashboard realtime event statsUpdated</div>
    </section>
  );
}
