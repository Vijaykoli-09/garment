import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../api/axiosInstance"; // ✅ adjust if needed

// ================= CONFIG =================
const OVERDUE_DAYS = 60;

// ================= Types =================
type NotificationKind =
  | "OVERDUE_60";
  // future add: | "LOW_STOCK" | "NEW_ORDER" | ...

type Severity = "info" | "warning" | "danger";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string; // used for sort/time
  read: boolean;
  severity?: Severity;
  link?: string; // e.g. "/notifications"
  payload?: Record<string, any>;
};

// ================= Utils =================
const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const toTime = (val: string) => {
  const d = new Date(val);
  return isNaN(d.getTime()) ? -Infinity : d.getTime();
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysDiff = (isoDate: string, now: Date) => {
  const t = toTime(isoDate);
  if (t === -Infinity) return null;
  const a = startOfDay(now).getTime();
  const b = startOfDay(new Date(t)).getTime();
  const diff = a - b;
  return diff >= 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
};

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}/${d.getFullYear()}`;
};

export const timeAgo = (iso: string) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
};

const makeId = (...parts: any[]) => parts.map((p) => String(p ?? "").trim()).join("|");

// ================= Read/Unread + Dismiss Storage =================
const READ_IDS_KEY = "app.notifications.read.v1";
const DISMISSED_IDS_KEY = "app.notifications.dismissed.v1";

const loadReadIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const saveReadIds = (set: Set<string>) => {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const loadDismissedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_IDS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const saveDismissedIds = (set: Set<string>) => {
  try {
    localStorage.setItem(DISMISSED_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const applyReadStatus = (list: AppNotification[]) => {
  const readIds = loadReadIds();
  return list.map((n) => ({ ...n, read: readIds.has(n.id) }));
};

// ================= Generator System (future-proof) =================
type GeneratorContext = { now: Date };
type GeneratorFn = (ctx: GeneratorContext) => Promise<AppNotification[]>;

async function safeGet<T>(url: string): Promise<T> {
  try {
    const res = await api.get<T>(url);
    return res.data as T;
  } catch {
    return [] as any;
  }
}

async function safeGetReceipts(): Promise<any[]> {
  try {
    const r1 = await api.get<any[]>("/recipt");
    return Array.isArray(r1.data) ? r1.data : [];
  } catch {
    try {
      const r2 = await api.get<any[]>("/receipt");
      return Array.isArray(r2.data) ? r2.data : [];
    } catch {
      return [];
    }
  }
}

type TxType =
  | "Dispatch"
  | "OtherDispatch"
  | "PurchaseOrder"
  | "PurchaseEntry"
  | "PurchaseReturn"
  | "JobOutward"
  | "JobInward"
  | "Payment"
  | "Receipt";

const typeLabel = (t: TxType): string => {
  switch (t) {
    case "OtherDispatch":
      return "Other Dispatch";
    case "PurchaseOrder":
      return "Purchase Order";
    case "PurchaseEntry":
      return "Purchase Entry";
    case "PurchaseReturn":
      return "Purchase Return";
    case "JobOutward":
      return "Job Outward";
    case "JobInward":
      return "Job Inward";
    case "Payment":
      return "Payment";
    case "Receipt":
      return "Receipt";
    case "Dispatch":
    default:
      return "Dispatch";
  }
};

// same DR/CR rules like your statement
const getDrCr = (source: TxType, amount: number) => {
  const amt = toNum(amount);

  if (source === "Payment") return { debit: amt, credit: 0 };
  if (source === "Receipt") return { debit: 0, credit: amt };

  if (source === "PurchaseOrder") return { debit: 0, credit: amt };
  if (source === "PurchaseEntry") return { debit: 0, credit: amt };

  if (source === "OtherDispatch") return { debit: 0, credit: amt };

  if (source === "PurchaseReturn") return { debit: amt, credit: 0 };

  if (source === "JobInward") return { debit: 0, credit: amt };

  if (source === "JobOutward") return { debit: 0, credit: 0 };

  return { debit: amt, credit: 0 };
};

// -------- Generator #1: Overdue 60+ days ----------
const generateOverdue60: GeneratorFn = async ({ now }) => {
  const [
    dcRaw,
    odcRaw,
    poRaw,
    peRaw,
    prRaw,
    payRaw,
    jobOutRaw,
    jobInRaw,
  ] = await Promise.all([
    safeGet<any[]>("/dispatch-challan"),
    safeGet<any[]>("/other-dispatch-challan"),
    safeGet<any[]>("/purchase-orders"),
    safeGet<any[]>("/purchase-entry"),
    safeGet<any[]>("/purchase-returns"),
    safeGet<any[]>("/payment"),
    safeGet<any[]>("/job-outward-challan"),
    safeGet<any[]>("/job-inward-challan"),
  ]);
  const recRaw = await safeGetReceipts();

  type Doc = {
    type: TxType;
    docNo: string;
    date: string;
    partyName: string;
    brokerName: string;
    amount: number;
  };

  const docs: Doc[] = [];

  (Array.isArray(dcRaw) ? dcRaw : []).forEach((dc: any) => {
    docs.push({
      type: "Dispatch",
      docNo: String(dc.challanNo ?? "").trim(),
      date: String(dc.date || dc.dated || "").trim(),
      partyName: String(dc.partyName || "").trim(),
      brokerName: String(dc.brokerName || dc.agentName || "").trim(),
      amount: toNum(dc.netAmt),
    });
  });

  (Array.isArray(odcRaw) ? odcRaw : []).forEach((od: any) => {
    docs.push({
      type: "OtherDispatch",
      docNo: String(od.challanNo ?? "").trim(),
      date: String(od.date || "").trim(),
      partyName: String(od.partyName || "").trim(),
      brokerName: String(od.brokerName || od.agentName || "").trim(),
      amount: toNum(od.netAmt),
    });
  });

  (Array.isArray(poRaw) ? poRaw : []).forEach((po: any) => {
    const items: any[] = Array.isArray(po.items) ? po.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);

    docs.push({
      type: "PurchaseOrder",
      docNo: String(po.orderNo ?? "").trim(),
      date: String(po.date || "").trim(),
      partyName: String(po.partyName || po.party?.partyName || "").trim(),
      brokerName: String(po.brokerName || po.agentName || "").trim(),
      amount: toNum(amount),
    });
  });

  (Array.isArray(peRaw) ? peRaw : []).forEach((e: any) => {
    const items: any[] = Array.isArray(e.items) ? e.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);

    docs.push({
      type: "PurchaseEntry",
      docNo: String(e.challanNo ?? "").trim(),
      date: String(e.date || "").trim(),
      partyName: String(e.partyName || e.party?.partyName || "").trim(),
      brokerName: String(e.brokerName || e.agentName || "").trim(),
      amount: toNum(amount),
    });
  });

  (Array.isArray(prRaw) ? prRaw : []).forEach((r: any) => {
    const items: any[] = Array.isArray(r.items) ? r.items : [];
    const amount = items.reduce((s, it) => s + (parseFloat(it.amount ?? 0) || 0), 0);

    docs.push({
      type: "PurchaseReturn",
      docNo: String(r.challanNo ?? "").trim(),
      date: String(r.date || "").trim(),
      partyName: String(r.partyName || r.party?.partyName || "").trim(),
      brokerName: String(r.brokerName || r.agentName || "").trim(),
      amount: toNum(amount),
    });
  });

  (Array.isArray(jobOutRaw) ? jobOutRaw : []).forEach((d: any) => {
    docs.push({
      type: "JobOutward",
      docNo: String(d.orderChallanNo ?? d.challanNo ?? "").trim(),
      date: String(d.date || "").trim(),
      partyName: String(d.partyName || "").trim(),
      brokerName: String(d.brokerName || d.agentName || "").trim(),
      amount: 0,
    });
  });

  (Array.isArray(jobInRaw) ? jobInRaw : []).forEach((d: any) => {
    const rows: any[] = Array.isArray(d.rows) ? d.rows : [];
    const amount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    docs.push({
      type: "JobInward",
      docNo: String(d.challanNo ?? "").trim(),
      date: String(d.date || "").trim(),
      partyName: String(d.partyName || "").trim(),
      brokerName: String(d.brokerName || d.agentName || "").trim(),
      amount: toNum(amount),
    });
  });

  (Array.isArray(payRaw) ? payRaw : []).forEach((p: any) => {
    docs.push({
      type: "Payment",
      docNo: `PAY-${p.id}`,
      date: String(p.paymentDate || p.date || "").trim(),
      partyName: String(p.partyName || "").trim(),
      brokerName: String(p.agentName || p.brokerName || "").trim(),
      amount: toNum(p.amount),
    });
  });

  (Array.isArray(recRaw) ? recRaw : []).forEach((r: any) => {
    docs.push({
      type: "Receipt",
      docNo: `REC-${r.id}`,
      date: String(r.receiptDate || r.paymentDate || r.date || "").trim(),
      partyName: String(r.partyName || "").trim(),
      brokerName: String(r.agentName || r.brokerName || "").trim(),
      amount: toNum(r.amount),
    });
  });

  const notifications: AppNotification[] = docs
    .map((d) => {
      if (!d.date) return null;
      const days = daysDiff(d.date, now);
      if (days === null || days < OVERDUE_DAYS) return null;

      const { debit, credit } = getDrCr(d.type, d.amount);

      const id = makeId("OVERDUE_60", d.type, d.docNo, d.partyName, String(d.date).slice(0, 10));

      return {
        id,
        kind: "OVERDUE_60",
        title: `${days} Days Overdue • ${typeLabel(d.type)}`,
        message: `Party: ${d.partyName || "-"} | Broker: ${d.brokerName || "-"} | Doc: ${
          d.docNo || "-"
        } | Dr:${debit.toFixed(2)} Cr:${credit.toFixed(2)}`,
        createdAt: d.date,
        read: false,
        severity: "warning",
        link: "/notifications",
        payload: { ...d, days, debit, credit },
      } satisfies AppNotification;
    })
    .filter(Boolean) as AppNotification[];

  // sort most overdue first
  notifications.sort((a, b) => (b.payload?.days ?? 0) - (a.payload?.days ?? 0));
  return notifications;
};

// Future add new notification types here:
// 1) create a generator fn
// 2) push into this array
const GENERATORS: { key: string; fn: GeneratorFn }[] = [{ key: "overdue60", fn: generateOverdue60 }];

// ================= Context =================
type NotificationCtx = {
  notifications: AppNotification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;

  refresh: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void; // ✅ new
};

const NotificationContext = createContext<NotificationCtx | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      const results = await Promise.all(
        GENERATORS.map(async (g) => {
          try {
            return await g.fn({ now });
          } catch {
            return [];
          }
        }),
      );

      // merge + dedupe
      const map = new Map<string, AppNotification>();
      results.flat().forEach((n) => map.set(n.id, n));

      const merged = Array.from(map.values()).sort((a, b) => {
        const ta = new Date(a.createdAt).getTime() || 0;
        const tb = new Date(b.createdAt).getTime() || 0;
        return tb - ta;
      });

      // ✅ apply dismissed filter
      const dismissed = loadDismissedIds();
      const filtered = merged.filter((n) => !dismissed.has(n.id));

      setNotifications(applyReadStatus(filtered));
    } catch (e: any) {
      setError(e?.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const set = loadReadIds();
    set.add(id);
    saveReadIds(set);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    const set = loadReadIds();
    notifications.forEach((n) => set.add(n.id));
    saveReadIds(set);
  }, [notifications]);

  // ✅ remove per notification (and keep removed after refresh)
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const dismissed = loadDismissedIds();
    dismissed.add(id);
    saveDismissedIds(dismissed);

    // optional: also mark as read to keep counts clean
    const readSet = loadReadIds();
    readSet.add(id);
    saveReadIds(readSet);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value: NotificationCtx = {
    notifications,
    loading,
    error,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return ctx;
};

// ================= Page content only =================
// NOTE: is component ko aap App routes me <Dashboard> ke andar wrap karna.
const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, error, refresh, markAllAsRead, markAsRead, removeNotification } =
    useNotifications();

  return (
    <div className="p-6 bg-gray-100">
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Notifications</h2>
            <div className="text-sm text-gray-600 mt-1">
              Unread: <b>{unreadCount}</b> | Total: <b>{notifications.length}</b>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-3 py-2 border rounded text-sm hover:bg-gray-50" onClick={refresh} disabled={loading}>
              Refresh
            </button>

            <button className="px-3 py-2 border rounded text-sm hover:bg-gray-50" onClick={markAllAsRead} disabled={notifications.length === 0}>
              Mark all as read
            </button>
          </div>
        </div>

        {loading && <div className="mt-3 text-sm text-gray-600">Loading...</div>}
        {error && <div className="mt-3 text-sm text-red-600">Error: {error}</div>}

        <div className="mt-4 overflow-auto border rounded">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left">Status</th>
                <th className="border px-3 py-2 text-left">Kind</th>
                <th className="border px-3 py-2 text-left">Title</th>
                <th className="border px-3 py-2 text-left">Message</th>
                <th className="border px-3 py-2 text-left">Date</th>
                <th className="border px-3 py-2 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} className={n.read ? "bg-white" : "bg-indigo-50"}>
                  <td className="border px-3 py-2">{n.read ? "Read" : "Unread"}</td>
                  <td className="border px-3 py-2">{n.kind}</td>
                  <td className="border px-3 py-2 font-semibold">{n.title}</td>
                  <td className="border px-3 py-2">{n.message}</td>
                  <td className="border px-3 py-2">
                    {fmtDate(n.createdAt)} <span className="text-gray-400">({timeAgo(n.createdAt)})</span>
                  </td>
                  <td className="border px-3 py-2">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <button className="px-2 py-1 border rounded text-xs hover:bg-white" onClick={() => markAsRead(n.id)}>
                          Mark read
                        </button>
                      )}
                      <button
                        className="px-2 py-1 border rounded text-xs hover:bg-white text-red-600"
                        onClick={() => removeNotification(n.id)}
                        title="Remove"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {notifications.length === 0 && (
                <tr>
                  <td colSpan={6} className="border px-3 py-6 text-center text-gray-500">
                    No notifications
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Current rule: Overdue = Date ≥ {OVERDUE_DAYS} days.
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;