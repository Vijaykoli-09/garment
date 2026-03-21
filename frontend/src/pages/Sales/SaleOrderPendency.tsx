"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../Dashboard";
import Swal from "sweetalert2";
import api from "../../api/axiosInstance";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type Destination = { id: number; name: string }; // Station
type Broker = { id: number; name: string }; // Broker = Agent
type Party = {
  id: number;
  partyName: string;
  station?: string | null;
  broker?: string | null; // agent.agentName
};
type Art = { id: number; artNo: string; artName: string };
type Shade = { id: number; name: string };

type SaleOrderLite = {
  partyId?: number;
  partyName?: string;
  dated?: string;
  rows?: { artNo?: string; description?: string; artName?: string }[];
};

type SORow = {
  id: number;
  destinationId: number;
  partyId: number;
  artId: number;
  size: string;

  partyName: string;
  artNo: string;
  artName: string;

  shade?: string;

  brokerName?: string;
  brokerId?: number;

  // used only for separating rows internally (NOT shown as column)
  orderRef?: string;

  opening: number;
  receipt: number;
  dispatch: number; // BOXES
  pending: number; // BOXES
};

const fmt = (n: number, d = 0) => (isFinite(n) ? Number(n).toFixed(d) : "0");
const norm = (s: any) => String(s ?? "").trim().toUpperCase();

const inRange = (dStr: string, from: string, to: string) => {
  const d = String(dStr || "").slice(0, 10);
  if (!d) return false;
  return d >= from && d <= to;
};

// Size sorting helper
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

  const au = a.toUpperCase();
  const bu = b.toUpperCase();
  const ai = known.indexOf(au);
  const bi = known.indexOf(bu);

  if (ai !== -1 && bi !== -1) return ai - bi;

  const an = Number(a);
  const bn = Number(b);
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  if (!isNaN(an)) return -1;
  if (!isNaN(bn)) return 1;

  return a.localeCompare(b);
};

type SizeAgg = {
  opening: number;
  receipt: number;
  dispatch: number;
  pending: number;
};

type GroupedRow = {
  key: string;
  partyId: number;
  partyName: string;
  artId: number;
  artNo: string;
  artName: string;
  shade?: string;
  brokerId?: number;
  brokerName?: string;

  // internal separation (NOT shown)
  orderRef?: string;

  perSize: Record<string, SizeAgg>;
  openingTotal: number;
  receiptTotal: number;
  dispatchTotal: number;
  pendingTotal: number;
};

// robust order/challan ref extractor
const getOrderRef = (x: any) => {
  const ref = String(
    x?.orderRef ??
      x?.saleOrderNo ??
      x?.saleOrderNumber ??
      x?.soNo ??
      x?.soNumber ??
      x?.orderNo ??
      x?.orderNumber ??
      x?.challanNo ??
      x?.challanNumber ??
      x?.serialNo ??
      x?.SerialNo ??
      x?._id ??
      ""
  ).trim();
  return ref;
};

const SaleOrderPendencyArtSizeWise: React.FC = () => {
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );

  // Masters
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [arts, setArts] = useState<Art[]>([]);
  const [allSizes, setAllSizes] = useState<string[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrderLite[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);

  // Selections
  const [selBrokerIds, setSelBrokerIds] = useState<number[]>([]);
  const [selDestIds, setSelDestIds] = useState<number[]>([]);
  const [selPartyIds, setSelPartyIds] = useState<number[]>([]);
  const [selArtIds, setSelArtIds] = useState<number[]>([]);
  const [selSizes, setSelSizes] = useState<string[]>([]);
  const [selShadeIds, setSelShadeIds] = useState<number[]>([]);

  // Search inputs
  const [brokerSearch, setBrokerSearch] = useState<string>("");
  const [destSearch, setDestSearch] = useState<string>("");
  const [partySearch, setPartySearch] = useState<string>("");
  const [artSearch, setArtSearch] = useState<string>("");
  const [sizeSearch, setSizeSearch] = useState<string>("");
  const [shadeSearch, setShadeSearch] = useState<string>("");

  // Data
  const [rows, setRows] = useState<SORow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReportView, setShowReportView] = useState(false);

  // Per-row fulfill loading
  const [fulfillingKey, setFulfillingKey] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement | null>(null);

  // Load Masters + Sale Orders
  useEffect(() => {
    (async () => {
      // Parties + Destinations + Brokers
      try {
        const { data } = await api.get<any[]>("/party/all");
        const list = Array.isArray(data) ? data : [];

        const mappedParties: Party[] = list.map((p, i) => ({
          id: Number(p.id ?? i + 1),
          partyName: String(p.partyName ?? ""),
          station: p.station ?? null,
          broker: p.agent?.agentName ?? p.brokerName ?? null,
        }));
        setParties(mappedParties);

        const stationNames = mappedParties
          .map((p) => String(p.station || "").trim())
          .filter(Boolean);
        const uniqueStations = Array.from(new Set(stationNames));
        setDestinations(
          uniqueStations.map((name, idx) => ({ id: idx + 1, name }))
        );

        const brokerNames = mappedParties
          .map((p) => String(p.broker || "").trim())
          .filter(Boolean);
        const uniqueBrokers = Array.from(new Set(brokerNames));
        setBrokers(uniqueBrokers.map((name, idx) => ({ id: idx + 1, name })));
      } catch (e) {
        console.error("Error loading parties/brokers:", e);
        setParties([]);
        setDestinations([]);
        setBrokers([]);
      }

      // Arts master
      try {
        const { data } = await api.get<any[]>("/arts");
        const list = Array.isArray(data) ? data : [];
        setArts(
          list.map((a, i) => ({
            id: Number(a.id ?? i + 1),
            artNo: String(a.artNo ?? ""),
            artName: String(a.artName ?? a.artNo ?? ""),
          }))
        );
      } catch (e) {
        console.error("Error loading arts:", e);
        setArts([]);
      }

      // Sizes
      try {
        const { data } = await api.get<any[]>("/packing-challans/sizes");
        const list = Array.isArray(data) ? data : [];
        const names = list
          .map((x) => String(x.sizeName ?? x.name ?? "").trim())
          .filter(Boolean);
        const uniq = Array.from(new Set(names));
        setAllSizes(uniq.length ? uniq : ["S", "M", "L", "XL", "XXL"]);
      } catch (e) {
        console.error("Error loading sizes:", e);
        setAllSizes(["S", "M", "L", "XL", "XXL"]);
      }

      // Sale Orders
      try {
        const { data } = await api.get<any[]>("/sale-orders");
        setSaleOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Error loading sale orders:", e);
        setSaleOrders([]);
      }

      // Shades master (supports wrapped responses)
      try {
        const res = await api.get<any>("/shade/list");
        const d = res.data;

        const list = Array.isArray(d)
          ? d
          : Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d?.rows)
          ? d.rows
          : Array.isArray(d?.result)
          ? d.result
          : Array.isArray(d?.shades)
          ? d.shades
          : [];

        const mappedShades: Shade[] = list
          .map((s: any, i: number) => ({
            id: Number(s.id ?? s.shadeId ?? s.shade_id ?? i + 1),
            name: String(
              s.name ??
                s.shade ??
                s.shadeName ??
                s.shadeCode ??
                s.code ??
                s.shade_name ??
                s.shade_code ??
                ""
            ).trim(),
          }))
          .filter((x: Shade) => x.name);

        setShades(mappedShades);
      } catch (e) {
        console.error("Error loading shades:", e);
        setShades([]);
      }
    })();
  }, []);

  const availableBrokers = brokers;

  // destinations by broker
  const availableDestinations = useMemo(() => {
    if (!destinations.length) return [];
    if (!brokers.length) return destinations;
    if (!selBrokerIds.length) return [];

    const selBrokerNames = new Set(
      brokers
        .filter((b) => selBrokerIds.includes(b.id))
        .map((b) => norm(b.name))
    );

    const stationNormSet = new Set(
      parties
        .filter((p) => p.broker && p.station && selBrokerNames.has(norm(p.broker)))
        .map((p) => norm(p.station))
    );

    return destinations.filter((d) => stationNormSet.has(norm(d.name)));
  }, [destinations, brokers, selBrokerIds, parties]);

  // parties by destination + broker
  const availableParties = useMemo(() => {
    if (selDestIds.length === 0 || destinations.length === 0) return [];

    const selDestNames = new Set(
      destinations
        .filter((d) => selDestIds.includes(d.id))
        .map((d) => d.name.trim().toUpperCase())
    );

    if (brokers.length === 0) {
      return parties.filter((p) => p.station && selDestNames.has(norm(p.station)));
    }

    if (selBrokerIds.length === 0) return [];

    const selBrokerNames = new Set(
      brokers
        .filter((b) => selBrokerIds.includes(b.id))
        .map((b) => b.name.trim().toUpperCase())
    );

    return parties.filter((p) => {
      if (!p.station || !p.broker) return false;
      return selDestNames.has(norm(p.station)) && selBrokerNames.has(norm(p.broker));
    });
  }, [selDestIds, destinations, parties, brokers, selBrokerIds]);

  // arts available (from saleOrders)
  const availableArts = useMemo<Art[]>(() => {
    if (selDestIds.length === 0 || selPartyIds.length === 0 || saleOrders.length === 0) return [];

    const selPartySet = new Set(selPartyIds.map(Number));
    const selDestNames = new Set(
      destinations.filter((d) => selDestIds.includes(d.id)).map((d) => d.name.trim().toUpperCase())
    );

    const allowedPartyIds = new Set<number>();
    parties.forEach((p) => {
      if (!selPartySet.has(p.id)) return;
      if (!p.station) return;
      if (!selDestNames.has(String(p.station).trim().toUpperCase())) return;
      allowedPartyIds.add(p.id);
    });
    if (!allowedPartyIds.size) return [];

    const artNoSet = new Set<string>();
    saleOrders.forEach((so: any) => {
      const pid = Number(so.partyId ?? 0);
      if (!allowedPartyIds.has(pid)) return;

      const dStr = so.dated || so.datedStr || "";
      const d = String(dStr || "").slice(0, 10);
      if (!d || d < fromDate || d > toDate) return;

      const rs = Array.isArray(so.rows) ? so.rows : [];
      rs.forEach((r: any) => {
        const an = String(r.artNo || "").trim();
        if (an) artNoSet.add(an.toLowerCase());
      });
    });

    if (!artNoSet.size) return [];

    const result: Art[] = [];
    artNoSet.forEach((anLower) => {
      const master = arts.find((a) => a.artNo.trim().toLowerCase() === anLower);
      if (master) result.push(master);
      else result.push({ id: result.length + 1, artNo: anLower, artName: anLower });
    });

    result.sort((a, b) => a.artNo.localeCompare(b.artNo));
    return result;
  }, [selDestIds, selPartyIds, destinations, parties, saleOrders, arts, fromDate, toDate]);

  const availableSizes = useMemo(() => {
    if (selDestIds.length === 0 || selPartyIds.length === 0 || selArtIds.length === 0) return [];
    return allSizes;
  }, [selDestIds, selPartyIds, selArtIds, allSizes]);

  const availableShades = shades;

  // filtered lists
  const filteredBrokers = useMemo(() => {
    const q = norm(brokerSearch);
    if (!q) return availableBrokers;
    return availableBrokers.filter((b) => norm(b.name).includes(q));
  }, [availableBrokers, brokerSearch]);

  const filteredDestinations = useMemo(() => {
    const q = norm(destSearch);
    if (!q) return availableDestinations;
    return availableDestinations.filter((d) => norm(d.name).includes(q));
  }, [availableDestinations, destSearch]);

  const filteredParties = useMemo(() => {
    const q = norm(partySearch);
    if (!q) return availableParties;
    return availableParties.filter((p) => norm(p.partyName).includes(q));
  }, [availableParties, partySearch]);

  const filteredArts = useMemo(() => {
    const q = norm(artSearch);
    if (!q) return availableArts;
    return availableArts.filter((a) => norm(a.artNo).includes(q) || norm(a.artName).includes(q));
  }, [availableArts, artSearch]);

  const filteredSizes = useMemo(() => {
    const q = norm(sizeSearch);
    if (!q) return availableSizes;
    return availableSizes.filter((s) => norm(s).includes(q));
  }, [availableSizes, sizeSearch]);

  const filteredShades = useMemo(() => {
    const q = norm(shadeSearch);
    if (!q) return availableShades;
    return availableShades.filter((s) => norm(s.name).includes(q));
  }, [availableShades, shadeSearch]);

  // prune selections when options change
  useEffect(() => {
    setSelBrokerIds((prev) => prev.filter((id) => availableBrokers.some((b) => b.id === id)));
  }, [availableBrokers]);

  useEffect(() => {
    setSelDestIds((prev) => prev.filter((id) => availableDestinations.some((d) => d.id === id)));
  }, [availableDestinations]);

  useEffect(() => {
    setSelPartyIds((prev) => prev.filter((id) => availableParties.some((p) => p.id === id)));
  }, [availableParties]);

  useEffect(() => {
    setSelArtIds((prev) => prev.filter((id) => availableArts.some((a) => a.id === id)));
  }, [availableArts]);

  useEffect(() => {
    setSelSizes((prev) => prev.filter((s) => availableSizes.includes(s)));
  }, [availableSizes]);

  useEffect(() => {
    setSelShadeIds((prev) => prev.filter((id) => availableShades.some((s) => s.id === id)));
  }, [availableShades]);

  // toggle helpers
  const toggleAllBroker = (checked: boolean) =>
    setSelBrokerIds(checked ? availableBrokers.map((b) => b.id) : []);
  const toggleAllDest = (checked: boolean) =>
    setSelDestIds(checked ? availableDestinations.map((d) => d.id) : []);
  const toggleAllParty = (checked: boolean) =>
    setSelPartyIds(checked ? availableParties.map((p) => p.id) : []);
  const toggleAllArt = (checked: boolean) =>
    setSelArtIds(checked ? availableArts.map((a) => a.id) : []);
  const toggleAllSize = (checked: boolean) =>
    setSelSizes(checked ? availableSizes.slice() : []);
  const toggleAllShade = (checked: boolean) =>
    setSelShadeIds(checked ? availableShades.map((s) => s.id) : []);

  const toggleBroker = (id: number) =>
    setSelBrokerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleDest = (id: number) =>
    setSelDestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleParty = (id: number) =>
    setSelPartyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleArt = (id: number) =>
    setSelArtIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSize = (s: string) =>
    setSelSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleShade = (id: number) =>
    setSelShadeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allBrokerSelected =
    availableBrokers.length > 0 && selBrokerIds.length === availableBrokers.length;
  const allDestSelected =
    availableDestinations.length > 0 && selDestIds.length === availableDestinations.length;
  const allPartySelected =
    availableParties.length > 0 && selPartyIds.length === availableParties.length;
  const allArtSelected = availableArts.length > 0 && selArtIds.length === availableArts.length;
  const allSizeSelected = availableSizes.length > 0 && selSizes.length === availableSizes.length;
  const allShadeSelected =
    availableShades.length > 0 && selShadeIds.length === availableShades.length;

  // ===== Report (data load) =====
  const showReport = async () => {
    if (brokers.length > 0 && selBrokerIds.length === 0)
      return Swal.fire("Select at least one Broker (Agent)", "", "warning");
    if (selDestIds.length === 0) return Swal.fire("Select at least one Destination", "", "warning");
    if (selPartyIds.length === 0) return Swal.fire("Select at least one Party", "", "warning");
    if (selArtIds.length === 0) return Swal.fire("Select at least one Art", "", "warning");
    if (selSizes.length === 0) return Swal.fire("Select at least one Size", "", "warning");

    const selectedArts = availableArts.filter((a) => selArtIds.includes(a.id));
    const selectedArtNos = selectedArts.map((a) => a.artNo.trim());
    const selectedArtNosSet = new Set(selectedArtNos.map((x) => x.toLowerCase()));

    const selectedShades = availableShades.filter((s) => selShadeIds.includes(s.id));
    const selectedShadeNameSet = new Set(selectedShades.map((s) => norm(s.name)));
    const shadesStr = selectedShades.map((s) => s.name).join(",");

    try {
      setLoading(true);

      const destNames = destinations
        .filter((d) => selDestIds.includes(d.id))
        .map((d) => d.name)
        .join(",");

      const partyIdsStr = selPartyIds.join(",");
      const artNos = selectedArtNos.join(",");
      const sizesStr = selSizes.join(",");

      const { data } = await api.get<any[]>("/sale-orders/pendency", {
        params: {
          fromDate,
          toDate,
          destinations: destNames,
          partyIds: partyIdsStr,
          artNos,
          sizes: sizesStr,
          shades: shadesStr,
        },
      });

      const list = Array.isArray(data) ? data : [];

      let baseRows: SORow[] = list.map((r: any, i: number) => {
        const destId =
          destinations.find((d) => norm(d.name) === norm(r.destination || r.station || ""))?.id ?? 0;

        const party: Party =
          (parties.find((p) => Number(p.id) === Number(r.partyId)) as Party) || {
            id: 0,
            partyName: String(r.partyName || ""),
            station: null,
            broker: r.brokerName ?? r.agentName ?? r.agent ?? null,
          };

        const brokerName = String(party.broker || "");
        const brokerId = brokers.find((b) => norm(b.name) === norm(brokerName))?.id ?? undefined;

        const artNoApi = String(r.artNo || "").trim();
        const artNameApi = String(r.artName || r.artNo || "").trim();

        const masterArt = arts.find((a) => a.artNo.trim().toLowerCase() === artNoApi.toLowerCase());
        const finalArtNo = artNoApi || masterArt?.artNo || "";
        const finalArtName = masterArt?.artName || artNameApi || finalArtNo;

        const shadeVal = String(
          r.shade ?? r.shadeName ?? r.shadeCode ?? r.color ?? r.colour ?? ""
        ).trim();

        const orderRef = getOrderRef(r);

        const num = (v: any) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };

        const opening = num(r.opening ?? 0);
        const receipt = num(r.receipt ?? 0);

        return {
          id: i + 1,
          destinationId: destId,
          partyId: Number(party.id),
          artId: masterArt?.id ?? 0,
          size: String(r.size || ""),
          partyName: String(party.partyName || r.partyName || ""),
          artNo: finalArtNo,
          artName: finalArtName,
          shade: shadeVal,
          brokerName,
          brokerId,
          orderRef,
          opening,
          receipt,
          dispatch: 0,
          pending: opening + receipt,
        };
      });

      // strict art filter
      if (selectedArtNosSet.size > 0) {
        baseRows = baseRows.filter((r) => selectedArtNosSet.has(r.artNo.trim().toLowerCase()));
      }

      // shade filter
      if (selectedShadeNameSet.size > 0) {
        baseRows = baseRows.filter((r) => selectedShadeNameSet.has(norm(r.shade || "")));
      }

      // ---------- Dispatch Challan (shade + orderRef aware, with fallbacks) ----------
      const dispatchMap = new Map<string, number>(); // party|art|order|shade|size
      const dispatchMapNoShade = new Map<string, number>(); // party|art|order|size
      const dispatchMapNoOrder = new Map<string, number>(); // party|art|shade|size
      const dispatchMapNoOrderNoShade = new Map<string, number>(); // party|art|size

      try {
        const { data: dcData } = await api.get<any[]>("/dispatch-challan");
        const challans = Array.isArray(dcData) ? dcData : [];

        challans.forEach((ch: any) => {
          const chDate = ch.date || ch.dated || "";
          if (!inRange(chDate, fromDate, toDate)) return;

          const pName = ch.partyName || "";
          if (!pName) return;

          const partyMatch = availableParties.some((p) => norm(p.partyName) === norm(pName));
          if (!partyMatch) return;

          const docOrderRef = getOrderRef(ch);

          const rowsDc = Array.isArray(ch.rows) ? ch.rows : [];
          rowsDc.forEach((rr: any) => {
            const artNo = String(rr.artNo || "").trim();
            const size = String(rr.size || "").trim();
            const shade = String(rr.shade ?? rr.shadeName ?? rr.shadeCode ?? "").trim();
            const rowOrderRef = getOrderRef(rr) || docOrderRef;

            if (!artNo || !size) return;
            if (!selectedArtNosSet.has(artNo.toLowerCase())) return;
            if (!selSizes.map((s) => s.toUpperCase()).includes(size.toUpperCase())) return;

            const box =
              rr.box != null
                ? Number(rr.box)
                : rr.pcs != null && rr.pcsPerBox
                ? Number(rr.pcs) / Number(rr.pcsPerBox)
                : 0;

            if (!box || isNaN(box)) return;

            if (rowOrderRef) {
              const k1 = `${norm(pName)}|${norm(artNo)}|${norm(rowOrderRef)}|${norm(shade)}|${norm(size)}`;
              dispatchMap.set(k1, (dispatchMap.get(k1) || 0) + box);

              const k2 = `${norm(pName)}|${norm(artNo)}|${norm(rowOrderRef)}|${norm(size)}`;
              dispatchMapNoShade.set(k2, (dispatchMapNoShade.get(k2) || 0) + box);
            }

            const k3 = `${norm(pName)}|${norm(artNo)}|${norm(shade)}|${norm(size)}`;
            dispatchMapNoOrder.set(k3, (dispatchMapNoOrder.get(k3) || 0) + box);

            const k4 = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
            dispatchMapNoOrderNoShade.set(k4, (dispatchMapNoOrderNoShade.get(k4) || 0) + box);
          });
        });

        baseRows = baseRows.map((row) => {
          const partyKey = norm(row.partyName);
          const artKey = norm(row.artNo);
          const shadeKey = norm(row.shade || "");
          const sizeKey = norm(row.size);
          const orderKey = norm(row.orderRef || "");

          let disp = 0;

          if (row.orderRef) {
            const k1 = `${partyKey}|${artKey}|${orderKey}|${shadeKey}|${sizeKey}`;
            const k2 = `${partyKey}|${artKey}|${orderKey}|${sizeKey}`;
            disp = dispatchMap.get(k1) ?? dispatchMapNoShade.get(k2) ?? 0;
          }

          if (!disp) {
            const k3 = `${partyKey}|${artKey}|${shadeKey}|${sizeKey}`;
            const k4 = `${partyKey}|${artKey}|${sizeKey}`;
            disp = dispatchMapNoOrder.get(k3) ?? dispatchMapNoOrderNoShade.get(k4) ?? 0;
          }

          const pending = row.opening + row.receipt - disp;
          return { ...row, dispatch: disp, pending };
        });
      } catch (e) {
        console.error("Dispatch-challan fetch error:", e);
      }

      // ---------- Order Settle minus (shade + orderRef aware, with fallbacks) ----------
      try {
        const { data: osData } = await api.get<any[]>("/order-settles");
        const settles = Array.isArray(osData) ? osData : [];

        const settleMap = new Map<string, number>(); // party|art|order|shade|size
        const settleMapNoShade = new Map<string, number>(); // party|art|order|size
        const settleMapNoOrder = new Map<string, number>(); // party|art|shade|size
        const settleMapNoOrderNoShade = new Map<string, number>(); // party|art|size

        settles.forEach((doc: any) => {
          const docDate = doc.dated || doc.date || "";
          if (!inRange(docDate, fromDate, toDate)) return;

          const pName = doc.partyName || "";
          if (!pName) return;

          const partyMatch = availableParties.some((p) => norm(p.partyName) === norm(pName));
          if (!partyMatch) return;

          const docOrderRef = getOrderRef(doc);

          const rowsOs = Array.isArray(doc.rows) ? doc.rows : [];
          rowsOs.forEach((rr: any) => {
            const artNo = String(rr.artNo || "").trim();
            const shade = String(rr.shade ?? rr.shadeName ?? rr.shadeCode ?? "").trim();
            const rowOrderRef = getOrderRef(rr) || docOrderRef;

            if (!artNo) return;
            if (!selectedArtNosSet.has(artNo.toLowerCase())) return;

            const dets = Array.isArray(rr.sizeDetails) ? rr.sizeDetails : [];
            dets.forEach((sd: any) => {
              const size = String(sd.sizeName || "").trim();
              if (!size) return;
              if (!selSizes.map((s) => s.toUpperCase()).includes(size.toUpperCase())) return;

              const qty = Number(sd.settleBox ?? sd.box ?? sd.qty ?? 0);
              if (!qty || isNaN(qty)) return;

              if (rowOrderRef) {
                const k1 = `${norm(pName)}|${norm(artNo)}|${norm(rowOrderRef)}|${norm(shade)}|${norm(size)}`;
                settleMap.set(k1, (settleMap.get(k1) || 0) + qty);

                const k2 = `${norm(pName)}|${norm(artNo)}|${norm(rowOrderRef)}|${norm(size)}`;
                settleMapNoShade.set(k2, (settleMapNoShade.get(k2) || 0) + qty);
              }

              const k3 = `${norm(pName)}|${norm(artNo)}|${norm(shade)}|${norm(size)}`;
              settleMapNoOrder.set(k3, (settleMapNoOrder.get(k3) || 0) + qty);

              const k4 = `${norm(pName)}|${norm(artNo)}|${norm(size)}`;
              settleMapNoOrderNoShade.set(k4, (settleMapNoOrderNoShade.get(k4) || 0) + qty);
            });
          });
        });

        baseRows = baseRows.map((row) => {
          const partyKey = norm(row.partyName);
          const artKey = norm(row.artNo);
          const shadeKey = norm(row.shade || "");
          const sizeKey = norm(row.size);
          const orderKey = norm(row.orderRef || "");

          let settled = 0;

          if (row.orderRef) {
            const k1 = `${partyKey}|${artKey}|${orderKey}|${shadeKey}|${sizeKey}`;
            const k2 = `${partyKey}|${artKey}|${orderKey}|${sizeKey}`;
            settled = settleMap.get(k1) ?? settleMapNoShade.get(k2) ?? 0;
          }

          if (!settled) {
            const k3 = `${partyKey}|${artKey}|${shadeKey}|${sizeKey}`;
            const k4 = `${partyKey}|${artKey}|${sizeKey}`;
            settled = settleMapNoOrder.get(k3) ?? settleMapNoOrderNoShade.get(k4) ?? 0;
          }

          const pending = row.opening + row.receipt - row.dispatch - settled;
          return { ...row, pending };
        });
      } catch (e) {
        console.error("Order-settles fetch error (pendency report):", e);
      }

      baseRows = baseRows.filter((r) => (r.pending ?? 0) !== 0);

      setRows(baseRows);
      setShowReportView(true);
    } catch (e: any) {
      console.error("Report error:", e?.response?.data || e?.message);
      Swal.fire("Info", "Report API not available. Showing empty report.", "info");
      setRows([]);
      setShowReportView(true);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    const brokerOk = brokers.length === 0 || selBrokerIds.length > 0;
    if (brokerOk && selDestIds.length && selPartyIds.length && selArtIds.length && selSizes.length) {
      showReport();
    } else {
      Swal.fire(
        "Info",
        "Please select Broker (Agent), Destination, Party, Art and Size, then click Show",
        "info"
      );
    }
  };

  const handleBack = () => setShowReportView(false);
  const handleExit = () => window.history.back();

  // totals
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.opening += r.opening || 0;
          acc.receipt += r.receipt || 0;
          acc.dispatch += r.dispatch || 0;
          acc.pending += r.pending || 0;
          return acc;
        },
        { opening: 0, receipt: 0, dispatch: 0, pending: 0 }
      ),
    [rows]
  );

  const sizeTotals = useMemo<Record<string, SizeAgg>>(() => {
    const res: Record<string, SizeAgg> = {};
    rows.forEach((r) => {
      if (!res[r.size]) res[r.size] = { opening: 0, receipt: 0, dispatch: 0, pending: 0 };
      const t = res[r.size];
      t.opening += r.opening || 0;
      t.receipt += r.receipt || 0;
      t.dispatch += r.dispatch || 0;
      t.pending += r.pending || 0;
    });
    return res;
  }, [rows]);

  const sizeColumns = useMemo(() => {
    const cols: string[] = [];
    const selUpper = new Set(selSizes.map((s) => s.toUpperCase()));

    Object.entries(sizeTotals).forEach(([size, agg]) => {
      const total =
        (agg.opening || 0) + (agg.receipt || 0) + (agg.dispatch || 0) + (agg.pending || 0);
      if (total === 0) return;
      if (selUpper.size && !selUpper.has(size.toUpperCase())) return;
      cols.push(size);
    });

    return cols.sort(sizeSort);
  }, [sizeTotals, selSizes]);

  // ✅ group includes orderRef internally so multiple challans show separately
  // ❌ but we will NOT display orderRef column in report
  const groupedRows = useMemo<GroupedRow[]>(() => {
    const map = new Map<string, GroupedRow>();

    rows.forEach((r) => {
      const key = [
        norm(r.brokerName || ""),
        String(r.partyId ?? 0),
        norm(r.partyName),
        norm(r.artNo),
        norm(r.shade || ""),
        norm(r.orderRef || ""), // internal separation
      ].join("|");

      let g = map.get(key);
      if (!g) {
        g = {
          key,
          partyId: r.partyId,
          partyName: r.partyName,
          artId: r.artId,
          artNo: r.artNo,
          artName: r.artName,
          shade: r.shade || "",
          brokerId: r.brokerId,
          brokerName: r.brokerName || "",
          orderRef: r.orderRef || "",
          perSize: {},
          openingTotal: 0,
          receiptTotal: 0,
          dispatchTotal: 0,
          pendingTotal: 0,
        };
        map.set(key, g);
      }

      const existing = g.perSize[r.size] || { opening: 0, receipt: 0, dispatch: 0, pending: 0 };
      existing.opening += r.opening || 0;
      existing.receipt += r.receipt || 0;
      existing.dispatch += r.dispatch || 0;
      existing.pending += r.pending || 0;

      g.perSize[r.size] = existing;

      g.openingTotal += r.opening || 0;
      g.receiptTotal += r.receipt || 0;
      g.dispatchTotal += r.dispatch || 0;
      g.pendingTotal += r.pending || 0;
    });

    const arr = Array.from(map.values()).filter((g) => (g.pendingTotal ?? 0) !== 0);

    return arr.sort((a, b) => {
      const bcmp = (a.brokerName || "").localeCompare(b.brokerName || "");
      if (bcmp !== 0) return bcmp;
      const p = a.partyName.localeCompare(b.partyName);
      if (p !== 0) return p;
      // still sort by orderRef internally to keep separate groups nicely
      const o = (a.orderRef || "").localeCompare(b.orderRef || "");
      if (o !== 0) return o;
      const aCmp = a.artNo.localeCompare(b.artNo);
      if (aCmp !== 0) return aCmp;
      return (a.shade || "").localeCompare(b.shade || "");
    });
  }, [rows]);

  // Print
  const handlePrint = () => {
    const content = reportRef.current;
    if (!content) return window.print();

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return window.print();

    const title = `Sale-Order-Pendency-ArtSize_${fromDate}_to_${toDate}`;
    const styles = `
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #111827; }
      th, td { border: 1px solid #111827; padding: 5px 7px; }
      thead th { background: #E5E7EB; position: sticky; top: 0; }
      tbody tr:nth-child(even) { background: #F9FAFB; }
      tfoot td { background: #F3F4F6; font-weight: 700; }
      th, td { white-space: nowrap; }
      @media print { .no-print { display: none !important; } }
    `;

    const header = `
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:18px;font-weight:700;letter-spacing:0.5px">
          Sale Order Pendency (Art + Size Wise)
        </div>
        <div style="font-size:11px;margin-top:4px">
          <b>From:</b> ${fromDate} &nbsp; | &nbsp; <b>To:</b> ${toDate}
        </div>
        <hr style="margin-top:8px"/>
      </div>
    `;

    const html = content.outerHTML;

    printWindow.document.write(`
      <html>
        <head><title>${title}</title><style>${styles}</style></head>
        <body>${header}${html}
          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 100);
              setTimeout(() => window.close(), 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // PDF
  const handleExportPDF = async () => {
    if (!rows.length) return Swal.fire("Info", "No rows to export", "info");
    const content = reportRef.current;
    if (!content) return Swal.fire("Info", "Nothing to export", "info");

    const fileName = `Sale-Order-Pendency-ArtSize_${fromDate}_to_${toDate}.pdf`;

    const pdfRoot = document.createElement("div");
    pdfRoot.style.position = "fixed";
    pdfRoot.style.left = "-99999px";
    pdfRoot.style.top = "0";
    pdfRoot.style.background = "#ffffff";
    pdfRoot.style.zIndex = "-1";
    pdfRoot.style.padding = "12px";

    const header = document.createElement("div");
    header.innerHTML = `
      <style>.no-print{display:none !important;}</style>
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:18px;font-weight:bold">
          Sale Order Pendency (Art + Size Wise)
        </div>
        <div style="font-size:11px;margin-top:4px">
          <b>From:</b> ${fromDate} &nbsp; | &nbsp; <b>To:</b> ${toDate}
        </div>
        <hr style="margin-top:8px"/>
      </div>
    `;

    const cloned = content.cloneNode(true) as HTMLElement;
    cloned.style.overflow = "visible";
    cloned.style.maxHeight = "none";

    cloned.querySelectorAll(".no-print").forEach((el) => el.remove());
    cloned.querySelectorAll<HTMLElement>("[class*='overflow-']").forEach((el) => {
      el.style.overflow = "visible";
      el.style.maxHeight = "none";
    });

    pdfRoot.appendChild(header);
    pdfRoot.appendChild(cloned);
    document.body.appendChild(pdfRoot);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const canvas = await html2canvas(pdfRoot, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    pdf.save(fileName);
    pdfRoot.remove();
  };

  // fulfill (per row)
  const buildPayloadForGroup = (g: GroupedRow) => {
    const payloadRows: any[] = [];
    sizeColumns.forEach((s) => {
      const cell = g.perSize[s];
      const pending = cell?.pending ?? 0;
      if (!pending) return;

      payloadRows.push({
        destination: "",
        partyId: g.partyId,
        partyName: g.partyName,

        // keep for backend if supported (not displayed)
        orderRef: g.orderRef || "",

        artNo: g.artNo,
        artName: g.artName,
        shade: g.shade || "",
        size: s,
        pending,
      });
    });
    return payloadRows;
  };

  const handleFulfillGroup = async (g: GroupedRow) => {
    const payloadRows = buildPayloadForGroup(g);
    if (!payloadRows.length) return Swal.fire("Info", "No pending quantity in this row.", "info");

    const confirm = await Swal.fire({
      title: "Fulfill this row?",
      html: `
        <div style="text-align:left;font-size:13px">
          <div><b>Party:</b> ${g.partyName}</div>
          <div><b>Art:</b> ${g.artNo}</div>
          <div><b>Shade:</b> ${g.shade || "-"}</div>
          <div style="margin-top:6px"><b>Pending Boxes:</b> ${fmt(g.pendingTotal)}</div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Fulfill",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    try {
      setFulfillingKey(g.key);
      setLoading(true);

      await api.post("/sale-orders/pendency/fulfill", {
        fromDate,
        toDate,
        rows: payloadRows,
      });

      Swal.fire("Done", "This row fulfilled successfully.", "success");
      await showReport();
    } catch (e: any) {
      console.error("Fulfill row error:", e?.response?.data || e?.message);
      Swal.fire("Error", "Could not fulfill this row. Please try again.", "error");
    } finally {
      setFulfillingKey(null);
      setLoading(false);
    }
  };

  return (
    <Dashboard>
      <div className="min-h-screen bg-slate-100/80 pb-10">
        <div className="max-w-7xl mx-auto px-4 pt-6">
          {/* FILTER VIEW */}
          {!showReportView && (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    Sale Order Pendency (Art + Size Wise)
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Broker (Agent) → Destination → Party → Art → Size → Shade wise pending quantity.
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 w-full text-sm"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
                {/* Broker */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Broker (Agent)</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allBrokerSelected}
                          onChange={(e) => toggleAllBroker(e.target.checked)}
                          disabled={availableBrokers.length === 0}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllBroker(false)}
                        disabled={selBrokerIds.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={brokerSearch}
                    onChange={(e) => setBrokerSearch(e.target.value)}
                    placeholder="Search Broker"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableBrokers.length === 0}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {availableBrokers.length === 0 ? (
                      <div className="text-xs text-slate-500">No brokers found</div>
                    ) : filteredBrokers.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching broker</div>
                    ) : (
                      filteredBrokers.map((b) => (
                        <label key={b.id} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selBrokerIds.includes(b.id)}
                            onChange={() => toggleBroker(b.id)}
                          />
                          {b.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Destination */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Destination</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allDestSelected}
                          onChange={(e) => toggleAllDest(e.target.checked)}
                          disabled={availableDestinations.length === 0 || (brokers.length > 0 && selBrokerIds.length === 0)}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllDest(false)}
                        disabled={selDestIds.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={destSearch}
                    onChange={(e) => setDestSearch(e.target.value)}
                    placeholder="Search Destination"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableDestinations.length === 0 || (brokers.length > 0 && selBrokerIds.length === 0)}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {brokers.length > 0 && selBrokerIds.length === 0 ? (
                      <div className="text-xs text-slate-500">Select Broker first</div>
                    ) : availableDestinations.length === 0 ? (
                      <div className="text-xs text-slate-500">No stations found</div>
                    ) : filteredDestinations.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching destination</div>
                    ) : (
                      filteredDestinations.map((d) => (
                        <label key={d.id} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selDestIds.includes(d.id)}
                            onChange={() => toggleDest(d.id)}
                          />
                          {d.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Party */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Party</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allPartySelected}
                          onChange={(e) => toggleAllParty(e.target.checked)}
                          disabled={availableParties.length === 0}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllParty(false)}
                        disabled={selPartyIds.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    placeholder="Search Party"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableParties.length === 0}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {availableParties.length === 0 ? (
                      <div className="text-xs text-slate-500">Select Destination first</div>
                    ) : filteredParties.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching party</div>
                    ) : (
                      filteredParties.map((p) => (
                        <label key={p.id} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selPartyIds.includes(p.id)}
                            onChange={() => toggleParty(p.id)}
                          />
                          {p.partyName}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Art */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Art</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allArtSelected}
                          onChange={(e) => toggleAllArt(e.target.checked)}
                          disabled={availableArts.length === 0}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllArt(false)}
                        disabled={selArtIds.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={artSearch}
                    onChange={(e) => setArtSearch(e.target.value)}
                    placeholder="Search Art"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableArts.length === 0}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {availableArts.length === 0 ? (
                      <div className="text-xs text-slate-500">Select Party</div>
                    ) : filteredArts.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching art</div>
                    ) : (
                      filteredArts.map((a) => (
                        <label key={a.id} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selArtIds.includes(a.id)}
                            onChange={() => toggleArt(a.id)}
                          />
                          {a.artNo}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Size */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Size</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allSizeSelected}
                          onChange={(e) => toggleAllSize(e.target.checked)}
                          disabled={availableSizes.length === 0}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllSize(false)}
                        disabled={selSizes.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={sizeSearch}
                    onChange={(e) => setSizeSearch(e.target.value)}
                    placeholder="Search Size"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableSizes.length === 0}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {availableSizes.length === 0 ? (
                      <div className="text-xs text-slate-500">Select Art</div>
                    ) : filteredSizes.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching size</div>
                    ) : (
                      filteredSizes.map((s) => (
                        <label key={s} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selSizes.includes(s)}
                            onChange={() => toggleSize(s)}
                          />
                          {s}
                        </label>
                      ))
                    )}
                  </div>
                </div>

                {/* Shade */}
                <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800">Shade</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <label>
                        <input
                          type="checkbox"
                          className="mr-1 align-middle"
                          checked={allShadeSelected}
                          onChange={(e) => toggleAllShade(e.target.checked)}
                          disabled={availableShades.length === 0}
                        />
                        All
                      </label>
                      <button
                        type="button"
                        className="text-[11px] text-red-600 underline"
                        onClick={() => toggleAllShade(false)}
                        disabled={selShadeIds.length === 0}
                      >
                        Unselect
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={shadeSearch}
                    onChange={(e) => setShadeSearch(e.target.value)}
                    placeholder="Search Shade"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 w-full text-xs mb-2"
                    disabled={availableShades.length === 0}
                  />

                  <div className="border border-slate-200 rounded-lg h-48 overflow-auto bg-white p-2">
                    {availableShades.length === 0 ? (
                      <div className="text-xs text-slate-500">No shades found</div>
                    ) : filteredShades.length === 0 ? (
                      <div className="text-xs text-slate-500">No matching shade</div>
                    ) : (
                      filteredShades.map((s) => (
                        <label key={s.id} className="flex items-center py-0.5 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={selShadeIds.includes(s.id)}
                            onChange={() => toggleShade(s.id)}
                          />
                          {s.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={showReport}
                  className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  Show Report
                </button>
                <button
                  onClick={handleExit}
                  className="px-6 py-2 rounded-lg bg-slate-500 text-white text-sm font-semibold hover:bg-slate-600"
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* REPORT VIEW */}
          {showReportView && (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 p-5 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Sale Order Pendency (Art + Size Wise)
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                      <span className="font-semibold text-slate-700">From:</span>
                      {fromDate}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                      <span className="font-semibold text-slate-700">To:</span>
                      {toDate}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleBack}
                    className="bg-slate-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-600"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700"
                  >
                    Print
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700"
                    title="Export to PDF"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-6 text-center text-slate-600 text-sm">Loading...</div>
              ) : groupedRows.length === 0 ? (
                <div className="text-center text-slate-600 py-10 text-sm">
                  No data found for selected filters.
                </div>
              ) : (
                <div ref={reportRef} className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="border border-slate-200 p-2">S.No</th>
                        <th className="border border-slate-200 p-2">Broker</th>
                        <th className="border border-slate-200 p-2">Party Name</th>
                        <th className="border border-slate-200 p-2">Art No</th>
                        <th className="border border-slate-200 p-2">Shade</th>

                        {sizeColumns.map((s) => (
                          <th key={s} className="border border-slate-200 p-2 text-right">
                            {s}
                          </th>
                        ))}

                        <th className="border border-slate-200 p-2 text-right">Opening</th>
                        <th className="border border-slate-200 p-2 text-right">Receipt</th>
                        <th className="border border-slate-200 p-2 text-right">Dispatch</th>
                        <th className="border border-slate-200 p-2 text-right">Pending</th>
                        <th className="border border-slate-200 p-2 no-print">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {groupedRows.map((g, i) => (
                        <tr key={g.key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="border border-slate-200 p-1.5 text-center">{i + 1}</td>
                          <td className="border border-slate-200 p-1.5">{g.brokerName}</td>
                          <td className="border border-slate-200 p-1.5">{g.partyName}</td>
                          <td className="border border-slate-200 p-1.5">{g.artNo}</td>
                          <td className="border border-slate-200 p-1.5">{g.shade}</td>

                          {sizeColumns.map((s) => {
                            const cell = g.perSize[s];
                            return (
                              <td key={s} className="border border-slate-200 p-1.5 text-right">
                                {cell ? fmt(cell.pending) : ""}
                              </td>
                            );
                          })}

                          <td className="border border-slate-200 p-1.5 text-right">{fmt(g.openingTotal)}</td>
                          <td className="border border-slate-200 p-1.5 text-right">{fmt(g.receiptTotal)}</td>
                          <td className="border border-slate-200 p-1.5 text-right">{fmt(g.dispatchTotal)}</td>
                          <td className="border border-slate-200 p-1.5 text-right font-semibold text-slate-800">
                            {fmt(g.pendingTotal)}
                          </td>

                          <td className="border border-slate-200 p-1.5 no-print">
                            <button
                              type="button"
                              disabled={g.pendingTotal === 0 || fulfillingKey === g.key || loading}
                              onClick={() => handleFulfillGroup(g)}
                              className={`px-3 py-1 rounded-md text-xs font-semibold ${
                                g.pendingTotal === 0
                                  ? "bg-slate-300 text-white cursor-not-allowed"
                                  : fulfillingKey === g.key || loading
                                  ? "bg-red-400 text-white cursor-wait"
                                  : "bg-red-600 text-white hover:bg-red-700"
                              }`}
                            >
                              {fulfillingKey === g.key ? "Fulfilling..." : "Fulfill"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="bg-slate-100 font-semibold text-slate-800">
                        {/* ✅ colSpan back to 5 (since challan/order column removed) */}
                        <td className="border border-slate-200 p-1.5 text-right" colSpan={5}>
                          Total
                        </td>

                        {sizeColumns.map((s) => (
                          <td key={s} className="border border-slate-200 p-1.5 text-right">
                            {sizeTotals[s] ? fmt(sizeTotals[s].pending) : ""}
                          </td>
                        ))}

                        <td className="border border-slate-200 p-1.5 text-right">{fmt(totals.opening)}</td>
                        <td className="border border-slate-200 p-1.5 text-right">{fmt(totals.receipt)}</td>
                        <td className="border border-slate-200 p-1.5 text-right">{fmt(totals.dispatch)}</td>
                        <td className="border border-slate-200 p-1.5 text-right">{fmt(totals.pending)}</td>
                        <td className="border border-slate-200 p-1.5 no-print" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-5">
                <button
                  onClick={refresh}
                  className="bg-indigo-600 text-white px-5 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dashboard>
  );
};

export default SaleOrderPendencyArtSizeWise;