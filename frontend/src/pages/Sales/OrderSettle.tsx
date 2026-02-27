"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";

/* =============== Types from API =============== */
interface PartyFromApi {
  id?: number;
  partyName: string;
  serialNumber?: string;
  gstNo?: string;
  station?: string;
  agent?: { agentName?: string };
  transport?: { transportName?: string };
}

interface SizeDetailDto {
  sizeName: string;
  qty?: number | string;
}
interface SaleOrderRowFromApi {
  id?: number;
  artSerial?: string;
  artNo?: string;
  description?: string;
  shadeName?: string;
  sizeDetails?: SizeDetailDto[];
}
interface SaleOrderDTO {
  id?: number;
  orderNo?: string;
  dated?: string;
  partyId?: number;
  partyName?: string;
  rows?: SaleOrderRowFromApi[];
}

/* Order Settle row: per-size settleBox + pending reference */
interface OrderSettleRow {
  id: number;
  saleOrderId?: number | null;
  saleOrderNo?: string;
  saleOrderRowId?: number | null;

  barCode: string;
  artNo: string;
  artName: string;
  shade: string;

  sizeSettleBox: Record<string, string>;
  sizePending?: Record<string, number>;
}

/* Payload for backend */
interface OrderSettleSizeDetailPayload {
  sizeName: string;
  settleBox: number;
}
interface OrderSettleRowPayload {
  saleOrderId?: number | null;
  saleOrderNo?: string;
  saleOrderRowId?: number | null;
  barCode: string;
  artNo: string;
  description: string;
  shade: string;
  sizeDetails: OrderSettleSizeDetailPayload[];
}
interface OrderSettlePayload {
  id?: number;
  challanNo: string;
  dated: string;
  partyId?: number | null;
  partyName: string;
  broker: string;
  transport: string;
  remarks1: string;
  rows: OrderSettleRowPayload[];
}

/* =============== Utils =============== */
const todayStr = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};
const sanitizeNumber = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  return cleaned;
};
const toNum = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const sizeSort = (a: string, b: string) => {
  const known = [
    "3XS",
    "XXXS",
    "2XS",
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "2XL",
    "3XL",
    "4XL",
    "5XL",
  ];
  const ai = known.indexOf(a.toUpperCase());
  const bi = known.indexOf(b.toUpperCase());
  if (ai !== -1 && bi !== -1) return ai - bi;
  const an = Number(a);
  const bn = Number(b);
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  if (!isNaN(an)) return -1;
  if (!isNaN(bn)) return 1;
  return a.localeCompare(b);
};
const norm = (s: any) =>
  String(s ?? "")
    .trim()
    .toLowerCase();

// YYYY‑MM‑DD
const inRange = (dStr: string, from: string, to: string) => {
  const d = String(dStr || "").slice(0, 10);
  if (!d) return false;
  return d >= from && d <= to;
};

/* Optional: fallback to master sizes */
const fetchArtSizesFromMaster = async (
  artNo?: string,
  artSerial?: string
): Promise<string[]> => {
  try {
    const { data } = await api.get("/articles/sizes", {
      params: { artNo, artSerial },
    });
    const arr = Array.isArray(data?.sizes)
      ? data.sizes
      : Array.isArray(data)
      ? data
      : [];
    return arr.map((x: any) => String(x?.sizeName ?? x).trim()).filter(Boolean);
  } catch {
    return [];
  }
};

/* Pending map: artNo -> size -> pending */
type PendingMap = Record<string, Record<string, number>>;

/**
 * Pending = SO (opening+receipt) − Dispatch − Settle
 */
const fetchPendingMapFor = async (
  partyId?: number | null,
  artNos: string[] = [],
  toDate?: string
): Promise<PendingMap> => {
  if (!partyId || !artNos.length) return {};
  const to = toDate || todayStr();
  const from = "1970-01-01";

  try {
    // 1) Sale order pendency (Opening + Receipt)
    const { data } = await api.get<any[]>("/sale-orders/pendency", {
      params: {
        fromDate: from,
        toDate: to,
        partyIds: String(partyId),
        artNos: artNos.join(","),
      },
    });
    const list = Array.isArray(data) ? data : [];

    type AggKey = string;
    type AggRow = {
      partyName: string;
      artNo: string;
      size: string;
      opening: number;
      receipt: number;
    };

    const aggMap = new Map<AggKey, AggRow>();

    for (const r of list) {
      const partyName = String(r.partyName || "").trim();
      const artNo = String(r.artNo || "").trim();
      const size = String(r.size || "").trim();
      if (!artNo || !size) continue;

      const key: AggKey = `${norm(partyName)}|${norm(artNo)}|${norm(size)}`;
      const opening = Number(r.opening || 0);
      const receipt = Number(r.receipt || 0);

      const existing = aggMap.get(key);
      if (!existing) {
        aggMap.set(key, {
          partyName,
          artNo,
          size,
          opening,
          receipt,
        });
      } else {
        existing.opening += opening;
        existing.receipt += receipt;
      }
    }

    if (aggMap.size === 0) return {};

    // 2) Dispatch challan se dispatch
    const dispatchMap = new Map<AggKey, number>();
    try {
      const { data: dcData } = await api.get<any[]>("/dispatch-challan");
      const challans = Array.isArray(dcData) ? dcData : [];

      for (const ch of challans) {
        const chDate = ch.date || ch.dated || "";
        if (!inRange(chDate, from, to)) continue;

        const pName = String(ch.partyName || "").trim();
        if (!pName) continue;

        const rowsDc = Array.isArray(ch.rows) ? ch.rows : [];
        for (const row of rowsDc) {
          const artNo = String(row.artNo || "").trim();
          const size = String(row.size || "").trim();
          if (!artNo || !size) continue;

          if (
            !artNos
              .map((a) => a.trim().toUpperCase())
              .includes(artNo.toUpperCase())
          )
            continue;

          const pcs =
            row.pcs != null
              ? Number(row.pcs)
              : Number(row.box || 0) * Number(row.pcsPerBox || 0);
          if (!pcs || isNaN(pcs)) continue;

          const key: AggKey = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
          const prev = dispatchMap.get(key) || 0;
          dispatchMap.set(key, prev + pcs);
        }
      }
    } catch (e) {
      console.error("Dispatch-challan fetch error in fetchPendingMapFor:", e);
    }

    // 3) Order settle se settle qty
    const settleMap = new Map<AggKey, number>();
    try {
      const { data: osData } = await api.get<any[]>("/order-settles");
      const docs = Array.isArray(osData) ? osData : [];

      for (const doc of docs) {
        const docDate = doc.dated || doc.date || "";
        if (!inRange(docDate, from, to)) continue;

        const pName = String(doc.partyName || "").trim();
        if (!pName) continue;

        const rowsOs = Array.isArray(doc.rows) ? doc.rows : [];
        for (const row of rowsOs) {
          const artNo = String(row.artNo || "").trim();
          if (!artNo) continue;

          if (
            !artNos
              .map((a) => a.trim().toUpperCase())
              .includes(artNo.toUpperCase())
          )
            continue;

          const dets = Array.isArray(row.sizeDetails) ? row.sizeDetails : [];
          for (const sd of dets) {
            const size = String(sd.sizeName || "").trim();
            if (!size) continue;

            const qty = Number(sd.settleBox ?? sd.box ?? sd.qty ?? 0);
            if (!qty || isNaN(qty)) continue;

            const key: AggKey = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
            const prev = settleMap.get(key) || 0;
            settleMap.set(key, prev + qty);
          }
        }
      }
    } catch (e) {
      console.error("Order-settles fetch error in fetchPendingMapFor:", e);
    }

    // 4) Pending = opening + receipt − dispatch − settle
    const result: PendingMap = {};

    aggMap.forEach((agg, key) => {
      const dispatch = dispatchMap.get(key) || 0;
      const settled = settleMap.get(key) || 0;
      const pending = agg.opening + agg.receipt - dispatch - settled;

      if (!result[agg.artNo]) result[agg.artNo] = {};
      result[agg.artNo][agg.size] =
        (result[agg.artNo][agg.size] || 0) + pending;
    });

    return result;
  } catch (e) {
    console.error("Error in fetchPendingMapFor:", e);
    return {};
  }
};

/* =============== Component =============== */
const OrderSettle: React.FC = () => {
  const [rows, setRows] = useState<OrderSettleRow[]>([]);

  // Header
  const [serialNo, setSerialNo] = useState("");
  const [date, setDate] = useState(todayStr());
  const [partyName, setPartyName] = useState("");
  const [brokerName, setBrokerName] = useState("");
  const [transportName, setTransportName] = useState("");
  const [challanNo, setChallanNo] = useState("");
  const [remarks1, setRemarks1] = useState("");
  const [isEditing, setIsEditing] = useState<number | null>(null);

  // Masters
  const [partyList, setPartyList] = useState<PartyFromApi[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartyFromApi | null>(null);

  // Party Modal
  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");

  // List Modal
  const [showList, setShowList] = useState(false);
  const [settleList, setSettleList] = useState<any[]>([]);
  const [listSearch, setListSearch] = useState("");

  const artTimers = useRef<Record<number, number | undefined>>({});
  const printRef = useRef<HTMLDivElement | null>(null);

  /* Dynamic size columns */
  const sizeColumns = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      Object.keys(r.sizeSettleBox || {}).forEach((k) => s.add(k));
    });
    return Array.from(s).sort(sizeSort);
  }, [rows]);

  /* Init */
  useEffect(() => {
    const generatedSerial =
      "OS-" + String(Math.floor(Math.random() * 9000 + 1000));
    setSerialNo(generatedSerial);

    (async () => {
      try {
        const res = await api.get<PartyFromApi[]>("/party/all");
        setPartyList(Array.isArray(res.data) ? res.data : []);
      } catch {
        setPartyList([]);
        Swal.fire("Error", "Failed to load party list", "error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!partyName) {
      setSelectedParty(null);
      setBrokerName("");
      setTransportName("");
      return;
    }
    const found = partyList.find((p) => norm(p.partyName) === norm(partyName));
    setSelectedParty(found || null);
    setBrokerName(found?.agent?.agentName || "");
    setTransportName(found?.transport?.transportName || "");
  }, [partyName, partyList]);

  const createNewRow = (): OrderSettleRow => ({
    id: Date.now() + Math.random(),
    saleOrderId: null,
    saleOrderNo: "",
    saleOrderRowId: null,
    barCode: "",
    artNo: "",
    artName: "",
    shade: "",
    sizeSettleBox: {},
    sizePending: {},
  });

  const addMainRow = useCallback(() => {
    setRows((prev) => [...prev, createNewRow()]);
  }, []);

  useEffect(() => {
    if (rows.length === 0) addMainRow();
  }, [addMainRow, rows.length]);

  const openPartyModal = () => {
    setPartySearch("");
    setIsPartyModalOpen(true);
  };

  const filteredParties = useMemo(() => {
    const s = partySearch.toLowerCase();
    return partyList.filter(
      (p) =>
        (p.partyName || "").toLowerCase().includes(s) ||
        (p.serialNumber || "").toLowerCase().includes(s) ||
        (p.gstNo || "").toLowerCase().includes(s)
    );
  }, [partyList, partySearch]);

  /* API: Party → Sale Orders */
  const fetchSaleOrdersForParty = async (
    partyId?: number | null,
    pName?: string
  ) => {
    const { data } = await api.get<SaleOrderDTO[]>("/sale-orders");
    const list = Array.isArray(data) ? data : [];
    return list.filter((so) => {
      if (partyId != null && so.partyId != null)
        return Number(so.partyId) === Number(partyId);
      return pName ? norm(so.partyName) === norm(pName) : false;
    });
  };

  const mapSaleOrdersToSettleRows = (sos: SaleOrderDTO[]): OrderSettleRow[] => {
    const out: OrderSettleRow[] = [];
    for (const so of sos) {
      const soId = so.id ?? null;
      const soNo = so.orderNo || "";
      const list = Array.isArray(so.rows) ? so.rows : [];
      for (const r of list) {
        out.push({
          id: Date.now() + Math.random(),
          saleOrderId: soId,
          saleOrderNo: soNo,
          saleOrderRowId: r.id ?? null,
          barCode: "",
          artNo: r.artNo || "",
          artName: r.description || "",
          shade: r.shadeName || "",
          sizeSettleBox: {},
          sizePending: {},
        });
      }
    }
    return out;
  };

  const applyPendingToRows = async (
    baseRows: OrderSettleRow[],
    partyId?: number | null
  ) => {
    if (!partyId) return baseRows;
    const arts = Array.from(
      new Set(baseRows.map((r) => r.artNo).filter(Boolean))
    );
    if (!arts.length) return baseRows;

    const pendMap = await fetchPendingMapFor(partyId, arts, date);

    return baseRows.map((row) => {
      const pm = pendMap[row.artNo] || {};
      const box: Record<string, string> = {};
      Object.entries(pm).forEach(([s, pend]) => {
        box[s] = String(pend ?? 0);
      });
      return { ...row, sizeSettleBox: box, sizePending: pm };
    });
  };

  const selectParty = async (p: PartyFromApi) => {
    setPartyName(p.partyName);
    setSelectedParty(p);
    setBrokerName(p.agent?.agentName || "");
    setTransportName(p.transport?.transportName || "");
    setIsPartyModalOpen(false);

    const hasAnyRow = rows.some(
      (r) =>
        (r.artNo || "").trim() !== "" ||
        Object.keys(r.sizeSettleBox).length > 0
    );
    if (hasAnyRow) {
      const res = await Swal.fire({
        title: "Auto-fill with pending boxes?",
        text: "Current rows will be replaced.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Yes",
      });
      if (!res.isConfirmed) return;
    }

    try {
      const sos = await fetchSaleOrdersForParty(p.id ?? null, p.partyName);
      if (!sos.length) {
        setRows([createNewRow()]);
        Swal.fire("Info", "No sale order found for this party.", "info");
        return;
      }

      const baseRows = mapSaleOrdersToSettleRows(sos);
      const withPending = await applyPendingToRows(baseRows, p.id ?? null);
      setRows(withPending.length ? withPending : [createNewRow()]);
      setIsEditing(null); // naya challan
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to load Sale Orders or pending", "error");
    }
  };

  const scheduleFetchRowPending = useCallback(
    (rowId: number, artNo: string) => {
      if (artTimers.current[rowId]) {
        window.clearTimeout(artTimers.current[rowId]);
      }
      artTimers.current[rowId] = window.setTimeout(async () => {
        if (!selectedParty || !selectedParty.id || !artNo.trim()) {
          const sizeList = await fetchArtSizesFromMaster(artNo);
          setRows((prev) =>
            prev.map((r) => {
              if (r.id !== rowId) return r;
              const box: Record<string, string> = {};
              sizeList.forEach((s) => (box[s] = r.sizeSettleBox[s] ?? "0"));
              return { ...r, sizeSettleBox: box, sizePending: {} };
            })
          );
          return;
        }

        const pendMap = await fetchPendingMapFor(
          selectedParty.id,
          [artNo],
          date
        );
        const pm = pendMap[artNo] || {};
        setRows((prev) =>
          prev.map((r) => {
            if (r.id !== rowId) return r;
            const box: Record<string, string> = {};
            Object.entries(pm).forEach(([s, pend]) => {
              box[s] = String(pend ?? 0);
            });
            return { ...r, sizeSettleBox: box, sizePending: pm };
          })
        );
      }, 400);
    },
    [selectedParty, date]
  );

  const handleChangeTopField = (
    id: number,
    field: keyof OrderSettleRow,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? ({ ...r, [field]: value } as OrderSettleRow) : r
      )
    );
    if (field === "artNo") {
      scheduleFetchRowPending(id, value);
    }
  };

  const handleSettleBox = (id: number, size: string, value: string) => {
    const v = sanitizeNumber(value);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (
          !Object.prototype.hasOwnProperty.call(r.sizeSettleBox || {}, size)
        ) {
          return r;
        }

        const pendingAllowed = r.sizePending?.[size];
        let next = v;

        if (typeof pendingAllowed === "number") {
          const limit = Math.abs(pendingAllowed);
          if (limit > 0 && toNum(v) > limit) {
            next = String(limit);
          }
        }

        return { ...r, sizeSettleBox: { ...r.sizeSettleBox, [size]: next } };
      })
    );
  };

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const refreshAllPending = async () => {
    if (!selectedParty?.id) {
      Swal.fire("Info", "Please select a party first.", "info");
      return;
    }
    const arts = Array.from(new Set(rows.map((r) => r.artNo).filter(Boolean)));
    if (!arts.length) {
      Swal.fire("Info", "No arts found to refresh.", "info");
      return;
    }

    const pendMap = await fetchPendingMapFor(selectedParty.id, arts, date);
    const updated = rows.map((row) => {
      const pm = pendMap[row.artNo] || {};
      const box: Record<string, string> = {};
      Object.entries(pm).forEach(([s, pend]) => {
        box[s] = String(pend ?? 0);
      });
      return { ...row, sizeSettleBox: box, sizePending: pm };
    });

    setRows(updated.length ? updated : [createNewRow()]);
    Swal.fire("Done", "Pending boxes refreshed.", "success");
  };

  /* List modal */
  const openList = async () => {
    try {
      const { data } = await api.get<any[]>("/order-settles");
      setSettleList(Array.isArray(data) ? data : []);
    } catch {
      setSettleList([]);
    } finally {
      setShowList(true);
    }
  };

  const filteredSettleList = useMemo(() => {
    const s = listSearch.toLowerCase();
    return (Array.isArray(settleList) ? settleList : []).filter((x: any) => {
      return (
        !s ||
        (x.challanNo || "").toLowerCase().includes(s) ||
        (x.partyName || "").toLowerCase().includes(s)
      );
    });
  }, [settleList, listSearch]);

  const handleEdit = async (id: number) => {
    try {
      const { data } = await api.get<any>(`/order-settles/${id}`);
      setIsEditing(data.id || id);
      setChallanNo(data.challanNo || "");
      setDate(data.dated || todayStr());
      setPartyName(data.partyName || "");
      setBrokerName(data.broker || data.agent?.agentName || "");
      setTransportName(data.transport || data.transport?.transportName || "");
      setRemarks1(data.remarks1 || data.remarks || "");

      const rws = Array.isArray(data.rows) ? data.rows : [];
      const mapped: OrderSettleRow[] = rws.map((r: any, idx: number) => {
        const sizeSettleBox: Record<string, string> = {};
        const dets = Array.isArray(r.sizeDetails) ? r.sizeDetails : [];
        dets.forEach((sd: any) => {
          if (!sd.sizeName) return;
          sizeSettleBox[sd.sizeName] = String(
            sd.settleBox ?? sd.box ?? sd.qty ?? "0"
          );
        });
        return {
          id: Date.now() + idx + Math.random(),
          saleOrderId: r.saleOrderId ?? null,
          saleOrderNo: r.saleOrderNo || "",
          saleOrderRowId: r.saleOrderRowId ?? null,
          barCode: r.barCode || "",
          artNo: r.artNo || "",
          artName: r.description || r.artName || "",
          shade: r.shade || r.shadeName || "",
          sizeSettleBox,
          sizePending: {},
        };
      });

      const partyId =
        selectedParty?.id ||
        partyList.find((p) => norm(p.partyName) === norm(data.partyName))?.id ||
        null;
      const withPending = await applyPendingToRows(mapped, partyId ?? null);

      setRows(withPending.length ? withPending : [createNewRow()]);
      setShowList(false);
      Swal.fire("Loaded", "Challan loaded for editing.", "success");
    } catch {
      Swal.fire("Error", "Failed to load record", "error");
    }
  };

  const handleDeleteChallan = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete?",
      text: "This will delete the record permanently",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/order-settles/${id}`);
      Swal.fire("Deleted!", "Record deleted successfully", "success");
      openList();
    } catch {
      Swal.fire("Error", "Failed to delete", "error");
    }
  };

  /* Payload builder */
  const buildPayload = (): OrderSettlePayload | null => {
    if (!partyName) {
      Swal.fire("Error", "Please select a Party", "error");
      return null;
    }
    // NOTE: challanNo optional – koi validation nahi

    const cleanRows: OrderSettleRowPayload[] = rows
      .map((r) => {
        const sizeDetails: OrderSettleSizeDetailPayload[] = Object.entries(
          r.sizeSettleBox || {}
        )
          .map(([sizeName, val]) => ({
            sizeName,
            settleBox: Number(val || 0),
          }))
          .filter((sd) => sd.settleBox && !isNaN(sd.settleBox));

        const hasData =
          sizeDetails.length > 0 ||
          r.barCode.trim() ||
          r.artNo.trim() ||
          r.artName.trim();
        if (!hasData) return null;

        return {
          saleOrderId: r.saleOrderId ?? null,
          saleOrderNo: r.saleOrderNo || "",
          saleOrderRowId: r.saleOrderRowId ?? null,
          barCode: r.barCode || "",
          artNo: r.artNo || "",
          description: r.artName || "",
          shade: r.shade || "",
          sizeDetails,
        } as OrderSettleRowPayload;
      })
      .filter((x): x is OrderSettleRowPayload => x !== null);

    if (!cleanRows.length) {
      Swal.fire("Error", "No data to save", "error");
      return null;
    }

    return {
      id: isEditing ?? undefined,
      challanNo: challanNo.trim(), // ho sakta hai empty string
      dated: date,
      partyId: selectedParty?.id ?? null,
      partyName,
      broker: brokerName,
      transport: transportName,
      remarks1,
      rows: cleanRows,
    };
  };

  /* Save/Update/Delete */
  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      const { data } = await api.post<OrderSettlePayload>(
        "/order-settles",
        payload
      );
      setIsEditing(data.id || null); // save ke baad Update dikhega
      Swal.fire("Success", "Order Settle saved successfully", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to save Order Settle", "error");
    }
  };

  const handleUpdate = async () => {
    if (!isEditing) return handleSave(); // safety

    const payload = buildPayload();
    if (!payload) return;

    try {
      await api.put<OrderSettlePayload>(
        `/order-settles/${isEditing}`,
        payload
      );
      Swal.fire("Success", "Order Settle updated successfully", "success");
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to update Order Settle", "error");
    }
  };

  const handleDelete = async () => {
    if (!isEditing) {
      Swal.fire("Error", "No Challan loaded for deletion.", "error");
      return;
    }
    const result = await Swal.fire({
      title: "Delete?",
      text: `Challan ID ${isEditing} will be deleted permanently.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/order-settles/${isEditing}`);
      Swal.fire("Deleted", "Order Settle deleted.", "success");
      setIsEditing(null);
      setPartyName("");
      setBrokerName("");
      setTransportName("");
      setRemarks1("");
      setChallanNo("");
      setRows([createNewRow()]);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Failed to delete", "error");
    }
  };

  /* Print – header jaisa screenshot me hai */
  const handlePrint = () => {
    const container = printRef.current;
    if (!container) return window.print();

    const tableEl = container.querySelector("table");
    if (!tableEl) return window.print();

    const tableHtml = (tableEl as HTMLElement).outerHTML;

    const printWindow = window.open("", "_blank", "width=1000,height=700");
    if (!printWindow) return window.print();

    const titleText = "Order Settle Challan"; // yahan aap "Knitting Inward Challan" bhi likh sakte ho

    const styles = `
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      .top-info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      .top-info-table td { padding: 2px 4px; border: none; font-size: 12px; }
      .title { text-align: center; font-size: 20px; font-weight: bold; margin: 10px 0 15px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 4px; }
      th { background: #f0f0f0; }
      @page { margin: 15mm; }
    `;

    const headerHtml = `
      <table class="top-info-table">
        <tr>
          <td><b>Challan No:</b> ${challanNo || "-"}</td>
          <td style="text-align:right"><b>Date:</b> ${date || "-"}</td>
        </tr>
        <tr>
          <td colspan="2"><b>Party:</b> ${partyName || "-"}</td>
        </tr>
      </table>
      <div class="title">${titleText}</div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${titleText}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${headerHtml}
          ${tableHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function(){ window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  /* UI */
  return (
    <Dashboard>
      {/* Party Modal */}
      {isPartyModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-5">
            <h3 className="text-xl font-bold text-center mb-4">Select Party</h3>
            <input
              type="text"
              placeholder="Search party name / serial / GST..."
              value={partySearch}
              onChange={(e) => setPartySearch(e.target.value)}
              className="border p-2 rounded w-full mb-3"
            />
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">Serial</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">GST</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParties.map((p, i) => (
                    <tr key={`${p.serialNumber}-${i}`}>
                      <td className="border p-2">{p.serialNumber}</td>
                      <td className="border p-2">{p.partyName}</td>
                      <td className="border p-2">{p.gstNo}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => selectParty(p)}
                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParties.length === 0 && (
                    <tr>
                      <td
                        className="border p-4 text-center text-gray-500"
                        colSpan={4}
                      >
                        No parties found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setIsPartyModalOpen(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-5 flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-center mb-4">
              Order Settle List
            </h3>

            <input
              placeholder="Search by Challan No / Party"
              className="border p-2 rounded w-full mb-3"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />

            <div className="overflow-auto max-h-[70vh] mt-2">
              <table className="w-full text-sm border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="border p-2">#</th>
                    <th className="border p-2">Challan No</th>
                    <th className="border p-2">Date</th>
                    <th className="border p-2">Party</th>
                    <th className="border p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSettleList.map((doc: any, i: number) => (
                    <tr key={doc.id}>
                      <td className="border p-2 text-center">{i + 1}</td>
                      <td className="border p-2">{doc.challanNo || ""}</td>
                      <td className="border p-2">{doc.dated || ""}</td>
                      <td className="border p-2">{doc.partyName || ""}</td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => handleEdit(doc.id)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteChallan(doc.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSettleList.length === 0 && (
                    <tr>
                      <td
                        className="border p-4 text-center text-gray-500"
                        colSpan={5}
                      >
                        No records
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowList(false)}
                className="px-5 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-3">
        <div
          className="bg-white p-6 rounded-lg shadow-md"
          ref={printRef}
        >
          <h2 className="text-2xl font-bold text-center mb-6 text-blue-800">
            Order Settle
          </h2>

          {/* Header */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div>
              <label className="block font-semibold">Serial No.</label>
              <input
                type="text"
                value={serialNo}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-semibold">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Challan No.</label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="Enter Challan No (optional)"
                className={`border p-2 rounded w-full ${
                  isEditing ? "bg-yellow-100" : ""
                }`}
              />
            </div>
            <div>
              <label className="block font-semibold">Party Name</label>
              <input
                type="text"
                value={partyName}
                readOnly
                onClick={openPartyModal}
                placeholder="Click to select party"
                className="border p-2 rounded w-full bg-gray-50 cursor-pointer hover:bg-gray-100"
              />
            </div>

            <div>
              <label className="block font-semibold">Remarks 1</label>
              <input
                type="text"
                value={remarks1}
                onChange={(e) => setRemarks1(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block font-semibold">Broker Name</label>
              <input
                type="text"
                value={brokerName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
            <div>
              <label className="block font-semibold">Transport Name</label>
              <input
                type="text"
                value={transportName}
                readOnly
                className="border p-2 rounded w-full bg-gray-100"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border text-sm min-w-[900px]">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2">S.N</th>
                  <th className="border p-2">Bar Code</th>
                  <th className="border p-2">Art No</th>
                  <th className="border p-2">Art Name</th>
                  <th className="border p-2">Shade</th>
                  {sizeColumns.map((s) => (
                    <th key={s} className="border p-2">
                      <div className="flex flex-col items-center">
                        <div>{s}</div>
                        <div className="text-[10px] font-normal text-gray-600">
                          Box
                        </div>
                      </div>
                    </th>
                  ))}
                  <th className="border p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  return (
                    <tr key={row.id} className="odd:bg-white even:bg-gray-50">
                      <td className="border p-1 text-center">{index + 1}</td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.barCode}
                          onChange={(e) =>
                            handleChangeTopField(
                              row.id,
                              "barCode",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.artNo}
                          onChange={(e) =>
                            handleChangeTopField(
                              row.id,
                              "artNo",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                          placeholder="Art No"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.artName}
                          onChange={(e) =>
                            handleChangeTopField(
                              row.id,
                              "artName",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                          placeholder="Art Name"
                        />
                      </td>
                      <td className="border p-1">
                        <input
                          type="text"
                          value={row.shade}
                          onChange={(e) =>
                            handleChangeTopField(
                              row.id,
                              "shade",
                              e.target.value
                            )
                          }
                          className="border p-1 rounded w-full"
                          placeholder="Shade"
                        />
                      </td>

                      {sizeColumns.map((s) => {
                        const hasSize = Object.prototype.hasOwnProperty.call(
                          row.sizeSettleBox || {},
                          s
                        );
                        const boxVal = hasSize ? row.sizeSettleBox[s] ?? "" : "";
                        const pend = row.sizePending?.[s];

                        return (
                          <td key={s} className="border p-1">
                            {hasSize ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  value={boxVal}
                                  onChange={(e) =>
                                    handleSettleBox(row.id, s, e.target.value)
                                  }
                                  className="border p-1 rounded w-full text-right focus:ring-2 focus:ring-blue-500"
                                  placeholder="Box"
                                  title={`Box (${s})`}
                                />
                                {typeof pend === "number" && (
                                  <div className="text-[10px] text-gray-500 text-right">
                                    {/* Pending: {pend} */}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <input
                                type="text"
                                value=""
                                disabled
                                className="border p-1 rounded w-full bg-gray-100 text-gray-400 cursor-not-allowed"
                                placeholder="N/A"
                                title={`Size ${s} is not applicable`}
                              />
                            )}
                          </td>
                        );
                      })}

                      <td className="border p-1">
                        <div className="flex gap-2">
                          <button
                            onClick={() => removeRow(row.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center mt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={addMainRow}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Row
              </button>

              {/* NEW: Save / Update toggle */}
              {!isEditing && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Save
                </button>
              )}
              {isEditing && (
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Update
                </button>
              )}

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={openList}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                View List
              </button>
              <button
                onClick={refreshAllPending}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Refresh Pending
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
};

export default OrderSettle;