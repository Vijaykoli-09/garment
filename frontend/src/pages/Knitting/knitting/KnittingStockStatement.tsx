import React, { useState, useRef, useEffect, useMemo } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

interface YarnConsumption {
  yarnName: string;
  yarnSerialNo?: string;
  fabricName: string;
  fabricSerialNo?: string;
  percent: number;
  kgs: number;
  amount: number;
}

interface StockRow {
  id?: number;
  date: string;
  narration: string;
  itemName?: string;
  lotNo?: string;
  issuePcs?: number;
  issueKgs?: number;
  issueAmount?: number;
  receiptPcs?: number;
  receiptKgs?: number;
  receiptAmount?: number;
  shortage?: number;
  balancePcs?: number;
  balanceKgs?: number;
  balanceAmount?: number;
  // For inward fabric rows: yarns consumed according to Fabrication composition.
  yarnConsumption?: YarnConsumption[];
}

interface Party {
  id: number;
  name?: string;
  partyName?: string;
}

type KnittingOutward = {
  id: number;
  challanNo: string;
  date: string; // yyyy-mm-dd
  party?: { id: number; partyName: string };
  items?: any[];
};

type KnittingInward = {
  id: number;
  challanNo: string;
  dated: string; // yyyy-mm-dd
  party?: { id: number; partyName: string };
  totalRolls?: number;
  totalWeight?: number;
  totalAmount?: number;
};

const toNum = (v: any) =>
  v === null || v === undefined || v === "" || isNaN(Number(v)) ? 0 : Number(v);

// includesAllTokens: "Mat - Shade" jaisi input ko break karke sab tokens match karta hai
const includesAllTokens = (hay: string, needle: string) => {
  const s = (hay || "").toLowerCase();
  const tokens = (needle || "")
    .toLowerCase()
    .split(/[-,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => s.includes(t));
};

// Date helpers: compare DATE ONLY (YYYY-MM-DD), not browser timezone/time.
// This prevents entries outside the selected range from appearing.
const dateKey = (value?: any): string => {
  if (value === null || value === undefined || value === "") return "";
  const raw = String(value).trim();

  // API may return 2026-09-02 or 2026-09-02T10:30:00...
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getOutwardDate = (entry: any) =>
  dateKey(entry?.date || entry?.dated || entry?.challanDate || entry?.createdDate);

const getInwardDate = (entry: any) =>
  dateKey(entry?.dated || entry?.date || entry?.challanDate || entry?.createdDate);

const KnittingStockStatement: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [partyList, setPartyList] = useState<Party[]>([]);
  const [partyId, setPartyId] = useState("");
  const [itemName, setItemName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Item suggestions
  const [itemOptions, setItemOptions] = useState<string[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [includeInwardItems, setIncludeInwardItems] = useState(false);

  // Resolve selected party name once (used in modal header and print)
  const selectedPartyName = useMemo(() => {
    const p = partyList.find((x) => x.id.toString() === partyId);
    return p?.partyName || p?.name || "-";
  }, [partyId, partyList]);

  // Parties
  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await api.get("/party/category/Knitting");
        setPartyList(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        Swal.fire("Error", "Failed to load party list", "error");
      }
    };
    fetchParties();
  }, []);

  const collectOutwardTokens = (outs: KnittingOutward[], tokens: Set<string>) => {
    outs.forEach((e) =>
      (e.items || []).forEach((it: any) => {
        // Yarn is also supported because Knitting Outward can be created
        // directly from Purchase Entry with Yarn only (without Material).
        const yarn =
          it.yarnName ||
          it.yarn?.yarnName ||
          it.yarn?.name ||
          it.yarn?.yarn ||
          "";

        const mat =
          it.material?.materialName || it.materialName || it?.material?.name || "";
        const shade = it.shadeName || it.shade?.shadeName || it.shadeCode || "";

        // Add Yarn separately so it is available in the Item/Yarn suggestion list.
        if (yarn) tokens.add(yarn);
        if (mat) tokens.add(mat);
        if (shade) tokens.add(shade);

        // Keep combined Material-Shade suggestions for existing entries.
        if (mat && shade) tokens.add(`${mat} - ${shade}`);

        // Yarn + Shade suggestion when shade exists.
        if (yarn && shade) tokens.add(`${yarn} - ${shade}`);
      })
    );
  };

  const collectInwardTokens = async (ins: KnittingInward[], tokens: Set<string>) => {
    // Throttle detail calls for performance
    const ids = ins.map((x) => x.id).slice(0, 25);
    const batchSize = 10;
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const detailRes = await Promise.all(
        batch.map((id) => api.get(`/knitting/${id}`).catch(() => null))
      );
      detailRes.forEach((resp) => {
        const listRows = resp?.data?.rows || [];
        listRows.forEach((r: any) => {
          const fab = r.fabrication?.fabricName || r.item || "";
          const shade = r.shade || "";
          const lot = r.fabricLotNo || "";
          const proc = r.processing || "";
          if (fab) tokens.add(fab);
          if (shade) tokens.add(shade);
          if (lot) tokens.add(lot);
          if (proc) tokens.add(proc);
          if (fab && shade) tokens.add(`${fab} - ${shade}`);
        });
      });
    }
  };

  // Fetch item suggestions whenever party/date/toggle changes
  useEffect(() => {
    const fetchItemOptions = async () => {
      if (!partyId) {
        setItemOptions([]);
        return;
      }
      setLoadingItems(true);
      try {
        const [outsRes, insRes] = await Promise.all([
          api.get("/knitting-outward-challan"),
          api.get("/knitting/list"),
        ]);

        let outs: KnittingOutward[] = Array.isArray(outsRes.data) ? outsRes.data : [];
        let ins: KnittingInward[] = Array.isArray(insRes.data) ? insRes.data : [];

        outs = outs.filter((e) => String(e.party?.id) === String(partyId));
        ins = ins.filter((e) => String(e.party?.id) === String(partyId));

        // Apply the selected date range to suggestions too.
        if (fromDate || toDate) {
          const fromKey = fromDate || "0000-01-01";
          const toKey = toDate || "9999-12-31";
          outs = outs.filter((e) => {
            const key = getOutwardDate(e);
            return !!key && key >= fromKey && key <= toKey;
          });
          ins = ins.filter((e) => {
            const key = getInwardDate(e);
            return !!key && key >= fromKey && key <= toKey;
          });
        }

        const tokens = new Set<string>();
        collectOutwardTokens(outs, tokens);

        if (includeInwardItems) {
          await collectInwardTokens(ins, tokens);
        }

        const list = Array.from(tokens).sort((a, b) => a.localeCompare(b));
        setItemOptions(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItemOptions();
  }, [partyId, fromDate, toDate, includeInwardItems]);

  // Matchers for filters (support "Mat - Shade" or multiple tokens)
  const outwardItemMatches = (it: any, needle: string) => {
    if (!needle) return true;
    // Support Yarn-only outward entries as well as Material/Shade entries.
    const yarn =
      it.yarnName ||
      it.yarn?.yarnName ||
      it.yarn?.name ||
      it.yarn?.yarn ||
      "";
    const mat = it.material?.materialName || it.materialName || it?.material?.name || "";
    const shade = it.shadeName || it.shade?.shadeName || it.shadeCode || "";

    const subject = `${yarn} ${mat} ${shade}`;
    return includesAllTokens(subject, needle);
  };

  const inwardRowMatches = (r: any, needle: string) => {
    if (!needle) return true;
    const fab = r.fabrication?.fabricName || r.item || "";
       const shade = r.shade || "";
    const lot = r.fabricLotNo || "";
    const proc = r.processing || "";
    const subject = `${fab} ${shade} ${lot} ${proc}`;
    return includesAllTokens(subject, needle);
  };

  const handleShowReport = async () => {
    if (!partyId || !fromDate || !toDate) {
      Swal.fire("Missing Fields", "Please select party and date range", "warning");
      return;
    }

    try {
      setLoading(true);

      const [outwardRes, inwardRes, fabricationRes, yarnRes] = await Promise.all([
        api.get("/knitting-outward-challan"),
        api.get("/knitting/list"),
        api.get("/fabrication").catch(() => ({ data: [] })),
        api.get("/yarn/list").catch(() => ({ data: [] })),
      ]);

      const outwards: KnittingOutward[] = Array.isArray(outwardRes.data)
        ? outwardRes.data
        : [];
      const inwards: KnittingInward[] = Array.isArray(inwardRes.data)
        ? inwardRes.data
        : [];

      // Fabrication master tells us which yarn(s) make each fabric and in what percentage.
      // Yarn master gives the display name/rate for each yarn serial number.
      const fabricationList: any[] = Array.isArray(fabricationRes.data)
        ? fabricationRes.data
        : [];
      const yarnList: any[] = Array.isArray(yarnRes.data)
        ? yarnRes.data
        : [];

      const yarnBySerial = new Map<string, any>();
      const yarnByName = new Map<string, any>();
      yarnList.forEach((y: any) => {
        const serial = String(y?.serialNo ?? y?.id ?? "").trim();
        const name = String(y?.yarnName ?? y?.name ?? y?.yarn ?? "").trim();
        if (serial) yarnBySerial.set(serial, y);
        if (name) yarnByName.set(name.toLowerCase(), y);
      });

      const fabricationBySerial = new Map<string, any>();
      const fabricationByName = new Map<string, any>();
      fabricationList.forEach((f: any) => {
        const serial = String(f?.serialNo ?? f?.id ?? "").trim();
        const name = String(f?.fabricName ?? f?.name ?? "").trim();
        if (serial) fabricationBySerial.set(serial, f);
        if (name) fabricationByName.set(name.toLowerCase(), f);
      });

      const getFabricationComposition = (r: any) => {
        const fabObj = r?.fabrication;
        const fabSerial = String(
          fabObj?.serialNo ?? fabObj?.id ?? r?.fabricationSerialNo ?? r?.item ?? ""
        ).trim();
        const fabName = String(
          fabObj?.fabricName ?? fabObj?.name ?? r?.fabricationName ?? r?.item ?? ""
        ).trim();

        const master =
          (fabSerial && fabricationBySerial.get(fabSerial)) ||
          (fabName && fabricationByName.get(fabName.toLowerCase())) ||
          fabObj ||
          null;

        const compositions = Array.isArray(master?.yarns)
          ? master.yarns
          : Array.isArray(r?.fabrication?.yarns)
          ? r.fabrication.yarns
          : [];

        // Always prefer the actual Fabrication master name. This prevents
        // a fabrication serial number from appearing as the Fabric Name.
        const resolvedFabricName = String(
          master?.fabricName ?? master?.name ?? fabName ?? fabSerial ?? "Unknown Fabric"
        ).trim();
        const resolvedFabricSerial = String(
          master?.serialNo ?? master?.id ?? fabSerial ?? ""
        ).trim();

        return compositions
          .map((c: any) => {
            const serial = String(c?.yarnSerialNo ?? c?.serialNo ?? c?.yarn?.serialNo ?? "").trim();
            const y =
              (serial && yarnBySerial.get(serial)) ||
              (c?.yarn && yarnBySerial.get(String(c.yarn.serialNo ?? "").trim())) ||
              (c?.yarnName && yarnByName.get(String(c.yarnName).trim().toLowerCase()));
            const yarnName = String(
              y?.yarnName ?? y?.name ?? y?.yarn ?? c?.yarnName ?? c?.yarn?.yarnName ?? serial
            ).trim();
            // Fabrication percent is a percentage value (0-100).
            // Some existing records can contain it in basis-point style
            // (e.g. 4300 for 43%) because the value was multiplied by 100
            // before being persisted. Normalize all common representations.
            let rawPercent = toNum(c?.percent);
            let percent = rawPercent;
            if (percent > 100) {
              percent = percent / 100;
            } else if (percent > 0 && percent < 1) {
              percent = percent * 100;
            }
            percent = Number(percent.toFixed(4));
            if (!yarnName || percent <= 0 || percent > 100) return null;
            return {
              yarnName,
              yarnSerialNo: serial || undefined,
              fabricName: resolvedFabricName,
              fabricSerialNo: resolvedFabricSerial || undefined,
              percent,
              rate: toNum(y?.rate ?? c?.rate),
            };
          })
          .filter(Boolean) as Array<{
            yarnName: string;
            yarnSerialNo?: string;
            fabricName: string;
            fabricSerialNo?: string;
            percent: number;
            rate: number;
          }>;

      };

      const outsByParty = outwards.filter(
        (e) => String(e.party?.id) === String(partyId)
      );
      const insByParty = inwards.filter(
        (e) => String(e.party?.id) === String(partyId)
      );

      // IMPORTANT: keep only entries up to the selected TO date.
      // Earlier entries are used only to calculate ONE opening balance per item+lot.
      // Entries after TO date can never enter the report.
      const fromKey = dateKey(fromDate);
      const toKey = dateKey(toDate);

      const filteredOutsByParty = outsByParty.filter((e: any) => {
        const key = getOutwardDate(e);
        return !!key && key <= toKey;
      });

      const filteredInsByParty = insByParty.filter((e: any) => {
        const key = getInwardDate(e);
        return !!key && key <= toKey;
      });

      const makeOutwardLines = (entry: KnittingOutward) => {
        return (Array.isArray(entry.items) ? entry.items : [])
          .filter((it: any) => outwardItemMatches(it, itemName))
          .map((it: any) => {
            const yarn = it.yarnName || it.yarn?.yarnName || it.yarn?.name || "";
            const material = it.material?.materialName || it.materialName || it?.material?.name || "";
            const shade = it.shadeName || it.shade?.shadeName || it.shadeCode || "";
            const item = yarn || [material, shade].filter(Boolean).join(" - ") || "-";
            const lot = it.lotNo || it.fabricLotNo || it.orderNo || "-";
            const pcs = toNum(it.roll ?? it.receivedRolls);
            const kgs = toNum(it.wtPerBox) || toNum(it.weight);
            const amount = toNum(it.amount) || kgs * toNum(it.rate);
            return { item, lot, pcs, kgs, amount };
          });
      };

      const makeInwardLines = async (entry: KnittingInward) => {
        try {
          const det = await api.get(`/knitting/${entry.id}`);
          const listRows = Array.isArray(det.data?.rows) ? det.data.rows : [];
          return listRows
            .filter((r: any) => inwardRowMatches(r, itemName))
            .map((r: any) => {
              const item =
                r.fabrication?.fabricName ||
                r.fabricationName ||
                r.yarnName ||
                r.materialName ||
                r.item ||
                "-";
              const lot = r.fabricLotNo || r.lotNo || "-";
              const receivedKgs = toNum(
                r.receivedWeight !== undefined &&
                  r.receivedWeight !== null &&
                  r.receivedWeight !== ""
                  ? r.receivedWeight
                  : r.weight
              );

              // IMPORTANT: a fabric receipt is not a separate yarn stock.
              // Its weight must be allocated back to the yarn(s) defined by the
              // selected Fabrication's composition. Example: 2000 Kg fabric with
              // 100% yarn A consumes 2000 Kg yarn A; with 60/40 composition it
              // consumes 1200/800 Kg respectively.
              const composition = getFabricationComposition(r);
              // One fabric can contain 3-4 (or more) yarns.
              // Each yarn gets only its percentage share of the received fabric weight.
              // If the same yarn appears more than once in the composition, combine it.
              const yarnConsumptionMap = new Map<string, YarnConsumption>();
              composition.forEach((c) => {
                const consumedKgs = Number((receivedKgs * c.percent / 100).toFixed(3));
                const consumedAmount = Number((consumedKgs * c.rate).toFixed(2));
                const yarnKey = String(c.yarnSerialNo || c.yarnName).trim().toLowerCase();
                const fabricName = c.fabricName || item || "Unknown Fabric";
                const key = `${yarnKey}||${String(c.fabricSerialNo || fabricName).trim().toLowerCase()}`;
                const existing = yarnConsumptionMap.get(key);

                if (existing) {
                  existing.percent = Number((existing.percent + c.percent).toFixed(4));
                  existing.kgs = Number((existing.kgs + consumedKgs).toFixed(3));
                  existing.amount = Number((existing.amount + consumedAmount).toFixed(2));
                } else {
                  yarnConsumptionMap.set(key, {
                    yarnName: c.yarnName,
                    yarnSerialNo: c.yarnSerialNo,
                    fabricName,
                    fabricSerialNo: c.fabricSerialNo,
                    percent: c.percent,
                    kgs: consumedKgs,
                    amount: consumedAmount,
                  });
                }
              });

              const yarnConsumption = Array.from(yarnConsumptionMap.values());

              return {
                item,
                lot,
                pcs: toNum(r.rolls),
                // Actual inward stock quantity = Received Weight.
                // Old records without receivedWeight fall back to Weight.
                kgs: receivedKgs,
                amount: toNum(r.weight) * toNum(r.knittingRate),
                shortage: toNum(r.shortage),
                yarnConsumption,
              };
            });
        } catch {
          return [];
        }
      };

      // Build one stock movement per Material/Yarn + Lot. Date filtering is enforced before movements are created.
      const allMovements: Array<StockRow & { key: string; sortDate: string }> = [];

      for (const e of filteredOutsByParty) {
        const entryDate = getOutwardDate(e);
        if (!entryDate) continue;
        const lines = makeOutwardLines(e);
        for (const line of lines) {
          const key = `${line.item}||${line.lot}`;
          if (entryDate < fromKey) {
            allMovements.push({
              key,
              sortDate: entryDate,
              date: entryDate,
              narration: `Opening Issue - ${e.challanNo || ""}`,
              itemName: line.item,
              lotNo: line.lot,
              issuePcs: line.pcs,
              issueKgs: line.kgs,
              issueAmount: Number(line.amount.toFixed(2)),
            });
          } else if (entryDate >= fromKey && entryDate <= toKey) {
            allMovements.push({
              key,
              sortDate: entryDate,
              date: entryDate,
              narration: `Issue - ${e.challanNo || ""}`,
              itemName: line.item,
              lotNo: line.lot,
              issuePcs: line.pcs,
              issueKgs: line.kgs,
              issueAmount: Number(line.amount.toFixed(2)),
            });
          }
        }
      }

      // Fetch inward detail rows because shortage and lot number are row-level values.
      const inwardDetailResults = await Promise.all(
        filteredInsByParty.map(async (e) => ({ entry: e, lines: await makeInwardLines(e) }))
      );

      for (const { entry, lines } of inwardDetailResults) {
        const entryDate = getInwardDate(entry);
        if (!entryDate) continue;
        for (const line of lines) {
          const key = `${line.item}||${line.lot}`;
          if (entryDate < fromKey) {
            allMovements.push({
              key,
              sortDate: entryDate,
              date: entryDate,
              narration: `Opening Receipt - ${entry.challanNo || ""}`,
              itemName: line.item,
              lotNo: line.lot,
              receiptPcs: line.pcs,
              receiptKgs: line.kgs,
              receiptAmount: Number(line.amount.toFixed(2)),
              shortage: line.shortage || undefined,
              yarnConsumption: line.yarnConsumption,
            });
          } else if (entryDate >= fromKey && entryDate <= toKey) {
            allMovements.push({
              key,
              sortDate: entryDate,
              date: entryDate,
              narration: `Receipt - ${entry.challanNo || ""}`,
              itemName: line.item,
              lotNo: line.lot,
              receiptPcs: line.pcs,
              receiptKgs: line.kgs,
              receiptAmount: Number(line.amount.toFixed(2)),
              shortage: line.shortage || undefined,
              yarnConsumption: line.yarnConsumption,
            });
          }
        }
      }

      if (allMovements.length === 0) {
        Swal.fire("No Data", "No records found for selected filters", "info");
        return;
      }

      // REPORT LOGIC
      // 1. Current-period movements are shown Material/Yarn + Lot wise.
      // 2. Opening Balance is calculated Material/Yarn wise from ALL transactions
      //    before From Date (all previous lots of that item are included).
      // 3. Opening Balance is shown only for items that have at least one
      //    movement inside the selected date range.
      // 4. This keeps opening stock correct (e.g. previous issues can make it -)
      //    without bringing unrelated old items into the selected report.
      const byItem = new Map<
        string,
        { itemName: string; before: typeof allMovements; inRangeRows: typeof allMovements }
      >();

      allMovements.forEach((m) => {
        const itemKey = (m.itemName || "-").trim().toLowerCase();
        if (!byItem.has(itemKey)) {
          byItem.set(itemKey, {
            itemName: m.itemName || "-",
            before: [],
            inRangeRows: [],
          });
        }

        const bucket = byItem.get(itemKey)!;
        const key = dateKey(m.sortDate);
        if (key < fromKey) bucket.before.push(m);
        else if (key >= fromKey && key <= toKey) bucket.inRangeRows.push(m);
      });

      const finalRows: StockRow[] = [];
      let rowId = 1;

      const bucketsWithTransactions = Array.from(byItem.values())
        .filter((bucket) => bucket.inRangeRows.length > 0)
        .sort((a, b) => a.itemName.localeCompare(b.itemName));

      // When NO Material/Yarn/Item is selected:
      // show ONE common Opening Balance row for the party/date range.
      // IMPORTANT: opening must include ALL historical movements before
      // From Date, not only items which also have a transaction in the
      // selected period.
      if (!itemName.trim()) {
        // ALL mode:
        // 1) One common opening balance for the selected party.
        // 2) All transactions in the selected period stay Material/Yarn + Lot wise.
        // 3) Running balance is ONE common stock balance, starting from opening.
        //    This matches the production/ledger calculation:
        //    Closing = Opening + Issue - Receipt.
        const allBeforeRows = allMovements.filter(
          (m) => dateKey(m.sortDate) < fromKey
        );

        const openingIssuePcs = allBeforeRows.reduce(
          (s, r) => s + toNum(r.issuePcs),
          0
        );
        const openingIssueKgs = allBeforeRows.reduce(
          (s, r) => s + toNum(r.issueKgs),
          0
        );
        const openingIssueAmt = allBeforeRows.reduce(
          (s, r) => s + toNum(r.issueAmount),
          0
        );

        const openingReceiptPcs = allBeforeRows.reduce(
          (s, r) => s + toNum(r.receiptPcs),
          0
        );
        const openingReceiptKgs = allBeforeRows.reduce(
          (s, r) => s + toNum(r.receiptKgs),
          0
        );
        const openingReceiptAmt = allBeforeRows.reduce(
          (s, r) => s + toNum(r.receiptAmount),
          0
        );

        let balPcs = openingIssuePcs - openingReceiptPcs;
        let balKgs = openingIssueKgs - openingReceiptKgs;
        let balAmt = openingIssueAmt - openingReceiptAmt;

        finalRows.push({
          id: rowId++,
          date: fromDate,
          narration: "Opening Balance",
          itemName: "-",
          lotNo: "-",
          balancePcs: balPcs,
          balanceKgs: balKgs,
          balanceAmount: Number(balAmt.toFixed(2)),
        });

        // Only current-period transactions are displayed.
        // Sort chronologically and keep the common running balance.
        const currentPeriodRows = bucketsWithTransactions
          .flatMap((bucket) => bucket.inRangeRows)
          .sort((a, b) => {
            const dateCompare = a.sortDate.localeCompare(b.sortDate);
            if (dateCompare !== 0) return dateCompare;

            const itemCompare = `${a.itemName || ""}`.localeCompare(
              `${b.itemName || ""}`
            );
            if (itemCompare !== 0) return itemCompare;

            return `${a.lotNo || ""}-${a.narration || ""}`.localeCompare(
              `${b.lotNo || ""}-${b.narration || ""}`
            );
          });

        currentPeriodRows.forEach((r) => {
          balPcs += toNum(r.issuePcs) - toNum(r.receiptPcs);
          balKgs += toNum(r.issueKgs) - toNum(r.receiptKgs);
          balAmt += toNum(r.issueAmount) - toNum(r.receiptAmount);

          finalRows.push({
            ...r,
            id: rowId++,
            balancePcs: balPcs,
            balanceKgs: balKgs,
            balanceAmount: Number(balAmt.toFixed(2)),
          });
        });
      } else {
        // Specific Material/Yarn mode:
        // Opening and running balance are calculated for that selected item.
        bucketsWithTransactions.forEach((bucket) => {
          const { itemName: reportItem, before, inRangeRows } = bucket;

          const openingIssuePcs = before.reduce(
            (s, r) => s + toNum(r.issuePcs),
            0
          );
          const openingIssueKgs = before.reduce(
            (s, r) => s + toNum(r.issueKgs),
            0
          );
          const openingIssueAmt = before.reduce(
            (s, r) => s + toNum(r.issueAmount),
            0
          );

          const openingReceiptPcs = before.reduce(
            (s, r) => s + toNum(r.receiptPcs),
            0
          );
          const openingReceiptKgs = before.reduce(
            (s, r) => s + toNum(r.receiptKgs),
            0
          );
          const openingReceiptAmt = before.reduce(
            (s, r) => s + toNum(r.receiptAmount),
            0
          );

          let balPcs = openingIssuePcs - openingReceiptPcs;
          let balKgs = openingIssueKgs - openingReceiptKgs;
          let balAmt = openingIssueAmt - openingReceiptAmt;

          finalRows.push({
            id: rowId++,
            date: fromDate,
            narration: "Opening Balance",
            itemName: reportItem,
            lotNo: "-",
            balancePcs: balPcs,
            balanceKgs: balKgs,
            balanceAmount: Number(balAmt.toFixed(2)),
          });

          inRangeRows
            .sort((a, b) => {
              const dateCompare = a.sortDate.localeCompare(b.sortDate);
              if (dateCompare !== 0) return dateCompare;
              return `${a.lotNo || ""}-${a.narration || ""}`.localeCompare(
                `${b.lotNo || ""}-${b.narration || ""}`
              );
            })
            .forEach((r) => {
              balPcs += toNum(r.issuePcs) - toNum(r.receiptPcs);
              balKgs += toNum(r.issueKgs) - toNum(r.receiptKgs);
              balAmt += toNum(r.issueAmount) - toNum(r.receiptAmount);

              finalRows.push({
                ...r,
                id: rowId++,
                balancePcs: balPcs,
                balanceKgs: balKgs,
                balanceAmount: Number(balAmt.toFixed(2)),
              });
            });
        });
      }

      if (finalRows.length === 0) {
        Swal.fire("No Data", "No records found for selected filters", "info");
        return;
      }

      setRows(finalRows);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to build stock statement", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "", "width=900,height=650");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Knitting Stock Statement</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h2 { text-align: center; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; }
              th, td { border: 1px solid #999; padding: 6px; text-align: right; }
              th { background-color: #f1f1f1; }
              td:nth-child(1), td:nth-child(2), td:nth-child(3) { text-align: left; }
              .section-title { margin-top: 20px; margin-bottom: 8px; font-weight: bold; }
              @media print { .overflow-x-auto { overflow: visible !important; } }
            </style>
          </head>
          <body>${content.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const totals = useMemo(() => {
    const movRows = rows.filter((r) => r.narration !== "Opening Balance");
    const t = {
      issuePcs: 0,
      issueKgs: 0,
      issueAmt: 0,
      receiptPcs: 0,
      receiptKgs: 0,
      receiptAmt: 0,
      closingPcs: 0,
      closingKgs: 0,
      closingAmt: 0,
      shortage: 0,
    };
    movRows.forEach((r) => {
      t.issuePcs += toNum(r.issuePcs);
      t.issueKgs += toNum(r.issueKgs);
      t.issueAmt += toNum(r.issueAmount);
      t.receiptPcs += toNum(r.receiptPcs);
      t.receiptKgs += toNum(r.receiptKgs);
      t.receiptAmt += toNum(r.receiptAmount);
      t.shortage += toNum(r.shortage);
    });
    // Closing balance is the FINAL running balance of the report.
    // Do not sum every row's balance; that double-counts stock.
    const last = rows.length > 0 ? rows[rows.length - 1] : undefined;
    t.closingPcs = toNum(last?.balancePcs);
    t.closingKgs = toNum(last?.balanceKgs);
    t.closingAmt = toNum(last?.balanceAmount);
    return t;
  }, [rows]);

  // Summary block (Opening, Issue, Receipt, Closing)
  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const openingRows = rows.filter((r) => r.narration === "Opening Balance");

    const opening = {
      pcs: openingRows.reduce((s, r) => s + toNum(r.balancePcs), 0),
      kgs: openingRows.reduce((s, r) => s + toNum(r.balanceKgs), 0),
      amt: openingRows.reduce((s, r) => s + toNum(r.balanceAmount), 0),
    };

    return {
      opening,
      issue: {
        pcs: totals.issuePcs,
        kgs: totals.issueKgs,
        amt: totals.issueAmt,
      },
      receipt: {
        pcs: totals.receiptPcs,
        kgs: totals.receiptKgs,
        amt: totals.receiptAmt,
        shortage: totals.shortage,
      },
      closing: {
        pcs: totals.closingPcs,
        kgs: totals.closingKgs,
        amt: totals.closingAmt,
      },
    };
  }, [rows, totals]);

  // Material-wise summary: Yarn is the stock being tracked.
  // One yarn is kept in ONE consolidated row even when that yarn is used
  // in multiple different fabrics. The row also keeps a fabric-wise breakdown
  // so the user can see exactly where that yarn was consumed.
  const materialSummary = useMemo(() => {
    type FabricBreakdown = {
      fabricName: string;
      fabricSerialNo?: string;
      percent: number;
      consumedKgs: number;
      consumedAmount: number;
    };

    type SummaryItem = {
      itemName: string;
      issuePcs: number;
      issueKgs: number;
      issueAmount: number;
      consumedKgs: number;
      consumedAmount: number;
      fabricPcs: number;
      fabricKgs: number;
      shortage: number;
      fabricBreakdown: Map<string, FabricBreakdown>;
    };

    const grouped = new Map<string, SummaryItem>();

    const addYarn = (name: string) => {
      const item = (name || "-").trim() || "-";
      const key = item.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, {
          itemName: item,
          issuePcs: 0,
          issueKgs: 0,
          issueAmount: 0,
          consumedKgs: 0,
          consumedAmount: 0,
          fabricPcs: 0,
          fabricKgs: 0,
          shortage: 0,
          fabricBreakdown: new Map(),
        });
      }
      return grouped.get(key)!;
    };

    rows
      .filter((r) => r.narration !== "Opening Balance")
      .forEach((r) => {
        // Outward yarn issue goes directly into the yarn row.
        const issueItem = (r.itemName || "-").trim() || "-";
        if (
          toNum(r.issueKgs) !== 0 ||
          toNum(r.issuePcs) !== 0 ||
          toNum(r.issueAmount) !== 0
        ) {
          const itemTotal = addYarn(issueItem);
          itemTotal.issuePcs += toNum(r.issuePcs);
          itemTotal.issueKgs += toNum(r.issueKgs);
          itemTotal.issueAmount += toNum(r.issueAmount);
        }

        // Inward fabric is converted into consumption of its component yarns.
        const consumption = Array.isArray(r.yarnConsumption) ? r.yarnConsumption : [];

        if (consumption.length > 0) {
          consumption.forEach((c) => {
            const itemTotal = addYarn(c.yarnName);
            const consumedKgs = toNum(c.kgs);
            const consumedAmount = toNum(c.amount);
            const fabricName = (c.fabricName || r.itemName || "Unknown Fabric").trim();
            const fabricKey = String(c.fabricSerialNo || fabricName).trim().toLowerCase();

            itemTotal.consumedKgs += consumedKgs;
            itemTotal.consumedAmount += consumedAmount;
            itemTotal.fabricPcs += toNum(r.receiptPcs) * (toNum(c.percent) / 100);
            itemTotal.fabricKgs += toNum(r.receiptKgs) * (toNum(c.percent) / 100);
            itemTotal.shortage += toNum(r.shortage) * (toNum(c.percent) / 100);

            const existingFabric = itemTotal.fabricBreakdown.get(fabricKey);
            if (existingFabric) {
              // Percentage belongs to the Fabrication recipe, not to each inward
              // transaction. Do NOT add it for every receipt. Only consumed Kg
              // and amount are accumulated. This prevents 43% becoming 4300%
              // when the same fabric is received many times.
              existingFabric.consumedKgs = Number((existingFabric.consumedKgs + consumedKgs).toFixed(3));
              existingFabric.consumedAmount = Number((existingFabric.consumedAmount + consumedAmount).toFixed(2));
            } else {
              itemTotal.fabricBreakdown.set(fabricKey, {
                fabricName,
                fabricSerialNo: c.fabricSerialNo,
                percent: toNum(c.percent),
                consumedKgs,
                consumedAmount,
              });
            }
          });
        } else if (
          toNum(r.receiptKgs) !== 0 ||
          toNum(r.receiptPcs) !== 0 ||
          toNum(r.receiptAmount) !== 0
        ) {
          // Old records without a Fabrication composition are kept visible.
          const unknownName = r.itemName || "Fabric / Unknown Yarn";
          const itemTotal = addYarn(unknownName);
          itemTotal.consumedKgs += toNum(r.receiptKgs);
          itemTotal.consumedAmount += toNum(r.receiptAmount);
          itemTotal.fabricPcs += toNum(r.receiptPcs);
          itemTotal.fabricKgs += toNum(r.receiptKgs);
          itemTotal.shortage += toNum(r.shortage);

          const fabricName = (r.itemName || "Unknown Fabric").trim();
          const fabricKey = fabricName.toLowerCase();
          const existingFabric = itemTotal.fabricBreakdown.get(fabricKey);
          if (existingFabric) {
            existingFabric.consumedKgs = Number((existingFabric.consumedKgs + toNum(r.receiptKgs)).toFixed(3));
            existingFabric.consumedAmount = Number((existingFabric.consumedAmount + toNum(r.receiptAmount)).toFixed(2));
          } else {
            itemTotal.fabricBreakdown.set(fabricKey, {
              fabricName,
              percent: 0,
              consumedKgs: toNum(r.receiptKgs),
              consumedAmount: toNum(r.receiptAmount),
            });
          }
        }
      });

    return Array.from(grouped.values())
      .map((r) => ({
        ...r,
        fabricBreakdownList: Array.from(r.fabricBreakdown.values()).sort((a, b) =>
          a.fabricName.localeCompare(b.fabricName)
        ),
        remainingKgs: Number((r.issueKgs - r.consumedKgs).toFixed(3)),
        remainingAmount: Number((r.issueAmount - r.consumedAmount).toFixed(2)),
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [rows]);

  const materialSummaryTotals = useMemo(
    () =>
      materialSummary.reduce(
        (t, r) => ({
          issuePcs: t.issuePcs + r.issuePcs,
          issueKgs: t.issueKgs + r.issueKgs,
          issueAmount: t.issueAmount + r.issueAmount,
          consumedKgs: t.consumedKgs + r.consumedKgs,
          consumedAmount: t.consumedAmount + r.consumedAmount,
          fabricPcs: t.fabricPcs + r.fabricPcs,
          fabricKgs: t.fabricKgs + r.fabricKgs,
          shortage: t.shortage + r.shortage,
          remainingKgs: t.remainingKgs + r.remainingKgs,
          remainingAmount: t.remainingAmount + r.remainingAmount,
        }),
        {
          issuePcs: 0,
          issueKgs: 0,
          issueAmount: 0,
          consumedKgs: 0,
          consumedAmount: 0,
          fabricPcs: 0,
          fabricKgs: 0,
          shortage: 0,
          remainingKgs: 0,
          remainingAmount: 0,
        }
      ),
    [materialSummary]
  );

  return (
    <Dashboard>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">
            Knitting Stock Statement
          </h2>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Party</label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">-- Select Party --</option>
                {partyList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partyName || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Yarn / Item (optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  list="itemOptionList"
                  placeholder="Yarn / Material / Fabrication / Shade... (type or pick)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="border p-2 rounded w-full"
                  disabled={!partyId}
                />
                {itemName && (
                  <button
                    onClick={() => setItemName("")}
                    className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    title="Clear item"
                  >
                    Clear
                  </button>
                )}
              </div>
              <datalist id="itemOptionList">
                {itemOptions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
              <div className="flex items-center justify-between mt-1 text-xs text-gray-600">
                <span>{loadingItems ? "Loading items..." : `${itemOptions.length} item(s) found`}</span>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={includeInwardItems}
                    onChange={() => setIncludeInwardItems((s) => !s)}
                  />
                  <span>Include inward suggestions</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          <div className="text-center">
            <button
              disabled={loading}
              onClick={handleShowReport}
              className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
            >
              {loading ? "Loading..." : "Show Report"}
            </button>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-auto p-5">
              <div ref={printRef}>
                <div className="mb-4 border-b pb-3">
                  <h2 className="text-lg font-bold text-center mb-2">
                    Knitting Stock Report
                  </h2>
                  <div className="text-sm font-semibold space-y-1 text-left">
                    <div>
                      Party: <span className="font-normal">{selectedPartyName}</span>
                    </div>
                    <div>
                      Material / Yarn / Item: <span className="font-normal">{itemName || "All"}</span>
                    </div>
                    <div>
                      Date: <span className="font-normal">{fromDate || "-"}</span>
                      {toDate ? <span> to {toDate}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th rowSpan={2} className="border p-2 text-center">#</th>
                        <th rowSpan={2} className="border p-2 text-center">Date</th>
                        <th rowSpan={2} className="border p-2 text-left">Material / Yarn</th>
                        <th rowSpan={2} className="border p-2 text-left">Lot No.</th>
                        <th rowSpan={2} className="border p-2 text-left">Narration</th>
                        <th colSpan={3} className="border p-2 text-center">Issue</th>
                        <th colSpan={4} className="border p-2 text-center">Receipt</th>
                        <th colSpan={3} className="border p-2 text-center">Balance</th>
                      </tr>
                      <tr>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Received Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                        <th className="border p-2 text-right">Shortage</th>
                        <th className="border p-2 text-right">Pcs</th>
                        <th className="border p-2 text-right">Kgs</th>
                        <th className="border p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="odd:bg-white even:bg-gray-50">
                          <td className="border p-2 text-center">{r.id}</td>
                          <td className="border p-2 text-center">{r.date}</td>
                          <td className="border p-2 text-left">{r.itemName || "-"}</td>
                          <td className="border p-2 text-left">{r.lotNo || "-"}</td>
                          <td className="border p-2 text-left">{r.narration}</td>
                          <td className="border p-2 text-right">{r.issuePcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.issueKgs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.issueAmount === "number" ? r.issueAmount.toFixed(2) : ""}
                          </td>
                          <td className="border p-2 text-right">{r.receiptPcs ?? ""}</td>
                          <td className="border p-2 text-right">{r.receiptKgs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.receiptAmount === "number" ? r.receiptAmount.toFixed(2) : ""}
                          </td>
                          <td className="border p-2 text-right">{r.shortage ?? ""}</td>
                          <td className="border p-2 text-right">{r.balancePcs ?? ""}</td>
                          <td className="border p-2 text-right">
                            {typeof r.balanceKgs === "number" ? r.balanceKgs.toFixed(3) : ""}
                          </td>
                          <td className="border p-2 text-right">
                            {typeof r.balanceAmount === "number" ? r.balanceAmount.toFixed(2) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {rows.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-100 font-semibold">
                          <td className="border p-2 text-right" colSpan={5}>Totals</td>
                          <td className="border p-2 text-right">{totals.issuePcs}</td>
                          <td className="border p-2 text-right">{totals.issueKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.issueAmt.toFixed(2)}</td>
                          <td className="border p-2 text-right">{totals.receiptPcs}</td>
                          <td className="border p-2 text-right">{totals.receiptKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.receiptAmt.toFixed(2)}</td>
                          <td className="border p-2 text-right">{totals.shortage.toFixed(3)}</td>
                          <td className="border p-2 text-right">{totals.closingPcs}</td>
                          <td className="border p-2 text-right">{totals.closingKgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{totals.closingAmt.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Material-wise Summary for selected date range */}
                {rows.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-bold mb-2">Material-wise Summary</h3>
                    <p className="text-xs text-gray-600 mb-2">
                      Yarn issued in Knitting Outward is combined into one yarn row. Inward fabric is converted into yarn consumption using its Fabrication composition.
                      The Fabric Name / Usage column shows every fabric using that yarn, with its composition percentage and consumed Kg.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="border p-2 text-center">#</th>
                            <th className="border p-2 text-left">Yarn / Material</th>
                            <th className="border p-2 text-left">Fabric Name / Usage</th>
                            <th className="border p-2 text-right">Issued Pcs</th>
                            <th className="border p-2 text-right">Issued Kgs</th>
                            <th className="border p-2 text-right">Issued Amount</th>
                            <th className="border p-2 text-right">Fabric Consumed Kgs</th>
                            <th className="border p-2 text-right">Consumed Amount</th>
                            <th className="border p-2 text-right">Shortage</th>
                            <th className="border p-2 text-right">Remaining Kgs</th>
                            <th className="border p-2 text-right">Remaining Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialSummary.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="border p-4 text-center text-gray-500">
                                No material movement found for the selected date range.
                              </td>
                            </tr>
                          ) : (
                            materialSummary.map((item, index) => (
                              <tr key={item.itemName} className="odd:bg-white even:bg-blue-50">
                                <td className="border p-2 text-center">{index + 1}</td>
                                <td className="border p-2 font-semibold">{item.itemName}</td>
                                <td className="border p-2 align-top">
                                  {item.fabricBreakdownList.length === 0 ? (
                                    <span className="text-gray-400">—</span>
                                  ) : (
                                    <div className="space-y-1">
                                      {item.fabricBreakdownList.map((fab) => (
                                        <div key={`${item.itemName}-${fab.fabricSerialNo || fab.fabricName}`} className="whitespace-nowrap">
                                          <span className="font-medium">{fab.fabricName}</span>
                                          {fab.percent > 0 && (
                                            <span className="text-gray-600"> — {fab.percent.toFixed(2)}%</span>
                                          )}
                                          <span className="text-blue-700"> ({fab.consumedKgs.toFixed(3)} Kg)</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="border p-2 text-right">{item.issuePcs.toFixed(3)}</td>
                                <td className="border p-2 text-right font-semibold">{item.issueKgs.toFixed(3)}</td>
                                <td className="border p-2 text-right">₹{item.issueAmount.toFixed(2)}</td>
                                <td className="border p-2 text-right">{item.consumedKgs.toFixed(3)}</td>
                                <td className="border p-2 text-right">₹{item.consumedAmount.toFixed(2)}</td>
                                <td className="border p-2 text-right">{item.shortage.toFixed(3)}</td>
                                <td className="border p-2 text-right font-bold">{item.remainingKgs.toFixed(3)}</td>
                                <td className="border p-2 text-right font-semibold">₹{item.remainingAmount.toFixed(2)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {materialSummary.length > 0 && (
                          <tfoot className="bg-blue-100 font-bold">
                            <tr>
                              <td className="border p-2" colSpan={3}>GRAND TOTAL</td>
                              <td className="border p-2 text-right">{materialSummaryTotals.issuePcs.toFixed(3)}</td>
                              <td className="border p-2 text-right">{materialSummaryTotals.issueKgs.toFixed(3)}</td>
                              <td className="border p-2 text-right">₹{materialSummaryTotals.issueAmount.toFixed(2)}</td>
                              <td className="border p-2 text-right">{materialSummaryTotals.consumedKgs.toFixed(3)}</td>
                              <td className="border p-2 text-right">₹{materialSummaryTotals.consumedAmount.toFixed(2)}</td>
                              <td className="border p-2 text-right">{materialSummaryTotals.shortage.toFixed(3)}</td>
                              <td className="border p-2 text-right">{materialSummaryTotals.remainingKgs.toFixed(3)}</td>
                              <td className="border p-2 text-right">₹{materialSummaryTotals.remainingAmount.toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary below table (included in print) */}
                {rows.length > 0 && summary && (
                  <div className="mt-6">
                    <h3 className="text-md font-bold mb-2">Summary</h3>
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border p-2 text-left">Particulars</th>
                          <th className="border p-2 text-right">Pcs</th>
                          <th className="border p-2 text-right">Kgs</th>
                          <th className="border p-2 text-right">Amount</th>
                          <th className="border p-2 text-right">Shortage</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border p-2">Opening Balance</td>
                          <td className="border p-2 text-right">{summary.opening.pcs}</td>
                          <td className="border p-2 text-right">{summary.opening.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.opening.amt.toFixed(2)}</td>
                          <td className="border p-2 text-right">-</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Issued during period</td>
                          <td className="border p-2 text-right">{summary.issue.pcs}</td>
                          <td className="border p-2 text-right">{summary.issue.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.issue.amt.toFixed(2)}</td>
                          <td className="border p-2 text-right">-</td>
                        </tr>
                        <tr>
                          <td className="border p-2">Received during period</td>
                          <td className="border p-2 text-right">{summary.receipt.pcs}</td>
                          <td className="border p-2 text-right">{summary.receipt.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.receipt.amt.toFixed(2)}</td>
                          <td className="border p-2 text-right">{summary.receipt.shortage.toFixed(3)}</td>
                        </tr>
                        <tr className="font-semibold bg-gray-50">
                          <td className="border p-2">Closing Balance</td>
                          <td className="border p-2 text-right">{summary.closing.pcs}</td>
                          <td className="border p-2 text-right">{summary.closing.kgs.toFixed(3)}</td>
                          <td className="border p-2 text-right">₹{summary.closing.amt.toFixed(2)}</td>
                          <td className="border p-2 text-right">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Back
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dashboard>
  );
};

export default KnittingStockStatement;