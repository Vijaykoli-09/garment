import React, { useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "../../Dashboard";
import api from "../../../api/axiosInstance";
import Swal from "sweetalert2";

interface RowData {
  materialId: number | null;
  materialName: string;
  shadeCode: string;
  shadeName: string;
  rolls: string;
  wtBox: string;
  weight: string;
  rate: string;
  amount: string;
  unit: string;

  // NEW
  selected: boolean;
}

const KnittingMaterialReturn: React.FC = () => {
  // =========================================================
  // PARTY
  // =========================================================

  // Material Party = Only Knitting category
  const [partyList, setPartyList] = useState<any[]>([]);

  // Received Return Party = ALL parties
  const [allPartyList, setAllPartyList] = useState<any[]>([]);

  const [selectedParty, setSelectedParty] =
    useState<string>("");

  const [selectedReceivedParty, setSelectedReceivedParty] =
    useState<string>("");

  // =========================================================
  // FORM
  // =========================================================

  const [rows, setRows] = useState<RowData[]>([]);

  // Challan is OPTIONAL now
  const [challanNo, setChallanNo] =
    useState<string>("");

  const [date, setDate] =
    useState<string>("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  // =========================================================
  // LIST
  // =========================================================

  const [showList, setShowList] =
    useState<boolean>(false);

  const [returns, setReturns] =
    useState<any[]>([]);

  const [, setLoadingList] =
    useState<boolean>(false);

  const [searchText, setSearchText] =
    useState<string>("");

  const [loadingPartyItems, setLoadingPartyItems] =
    useState<boolean>(false);

  // When Edit loads an existing return, the party changes as part of
  // the edit operation. We must NOT let the party-fetch effect replace
  // the edited rows with the current outstanding-party rows.
  const skipNextPartyFetchRef = useRef<boolean>(false);

  // =========================================================
  // LOAD KNITTING PARTIES
  // =========================================================

  useEffect(() => {
    const loadKnittingParties = async () => {
      try {
        const res = await api.get(
          "/party/category/Knitting"
        );

        setPartyList(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load knitting parties",
          error
        );

        setPartyList([]);
      }
    };

    loadKnittingParties();
  }, []);

  // =========================================================
  // LOAD ALL PARTIES
  // RECEIVED RETURN PARTY
  // =========================================================

  useEffect(() => {
    const loadAllParties = async () => {
      try {
        const res = await api.get(
          "/party/all"
        );

        setAllPartyList(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load all parties",
          error
        );

        setAllPartyList([]);
      }
    };

    loadAllParties();
  }, []);

  // =========================================================
  // PARTY SUMMARY / OUTSTANDING SUMMARY
  // =========================================================
  // Outward API data is challan-wise. The return screen must show the
  // party-wise outstanding quantity, not every challan separately.
  // Therefore:
  //   1. Merge outward entries by Material + Shade + Unit.
  //   2. Merge already-returned entries by the same key.
  //   3. Subtract returned quantities from outward quantities.
  //   4. While editing, exclude the current return from the subtraction
  //      so the original available quantity is visible for that edit.
  //
  // Example: 1222 rolls outward - 1000 rolls already returned = 222
  // rolls available.
  // =========================================================

  useEffect(() => {
    if (!selectedParty) {
      setRows([]);
      return;
    }

    // Edit operation already loaded the saved rows. Do not overwrite
    // them with the party outstanding rows.
    if (skipNextPartyFetchRef.current) {
      skipNextPartyFetchRef.current = false;
      return;
    }

    const fetchOutstandingPartyEntries = async () => {
      setLoadingPartyItems(true);

      try {
        const [outwardRes, returnRes] = await Promise.all([
          api.get(
            `/knitting-material-return/outwards/items/by-party/${selectedParty}`
          ),
          api.get("/knitting-material-return"),
        ]);

        const outwardData = Array.isArray(outwardRes.data)
          ? outwardRes.data
          : [];

        const allReturns = Array.isArray(returnRes.data)
          ? returnRes.data
          : returnRes.data?.content || [];

        // Current edit must not reduce the available quantity.
        const partyReturns = allReturns.filter((ret: any) => {
          const returnPartyId =
            ret.partyId ?? ret.party?.id ?? ret.materialPartyId;

          if (String(returnPartyId) !== String(selectedParty)) {
            return false;
          }

          if (editingId && String(ret.id) === String(editingId)) {
            return false;
          }

          return true;
        });

        type SummaryBucket = {
          materialId: number | null;
          materialName: string;
          shadeCode: string;
          shadeName: string;
          rolls: number;
          wtBox: number;
          weight: number;
          amount: number;
          unit: string;
        };

        const getItemValues = (item: any) => {
          const materialId =
            item.material?.id ?? item.materialId ?? null;

          const materialName =
            item.material?.materialName ?? item.materialName ?? "";

          const shadeCode =
            item.shade?.shadeCode ?? item.shadeCode ?? "";

          const shadeName =
            item.shade?.shadeName ?? item.shadeName ?? "";

          const unit =
            item.unit ?? item.material?.materialUnit ?? "";

          const rolls = Number(item.rolls ?? item.roll ?? 0) || 0;
          const wtBox = Number(item.wtPerBox ?? item.wtBox ?? 0) || 0;
          const weight = Number(item.weight ?? 0) || 0;
          const rate = Number(item.rate ?? 0) || 0;
          const amount =
            Number(item.amount ?? (wtBox * rate)) || 0;

          const materialKey =
            materialId !== null
              ? String(materialId)
              : materialName.trim().toLowerCase();

          // Prefer shade code for the key, then shade name.
          const shadeKey = (shadeCode || shadeName)
            .trim()
            .toLowerCase();

          const unitKey = unit.trim().toLowerCase();

          return {
            materialId,
            materialName,
            shadeCode,
            shadeName,
            unit,
            rolls,
            wtBox,
            weight,
            amount,
            key: [materialKey, shadeKey, unitKey].join("||"),
          };
        };

        const buildSummary = (items: any[]) => {
          const map = new Map<string, SummaryBucket>();

          items.forEach((item) => {
            const v = getItemValues(item);
            const existing = map.get(v.key);

            if (existing) {
              existing.rolls += v.rolls;
              existing.wtBox += v.wtBox;
              existing.weight += v.weight;
              existing.amount += v.amount;
            } else {
              map.set(v.key, {
                materialId: v.materialId,
                materialName: v.materialName,
                shadeCode: v.shadeCode,
                shadeName: v.shadeName,
                rolls: v.rolls,
                wtBox: v.wtBox,
                weight: v.weight,
                amount: v.amount,
                unit: v.unit,
              });
            }
          });

          return map;
        };

        const outwardSummary = buildSummary(outwardData);
        const returnedSummary = buildSummary(
          partyReturns.flatMap((ret: any) => ret.items || [])
        );

        const outstandingRows: RowData[] = [];

        outwardSummary.forEach((outward, key) => {
          const returned = returnedSummary.get(key);

          const rolls = Math.max(0, outward.rolls - (returned?.rolls || 0));
          const wtBox = Math.max(0, outward.wtBox - (returned?.wtBox || 0));
          const weight = Math.max(0, outward.weight - (returned?.weight || 0));
          const amount = Math.max(0, outward.amount - (returned?.amount || 0));

          // Do not show a fully consumed item.
          const hasBalance =
            rolls > 0 ||
            wtBox > 0 ||
            weight > 0 ||
            amount > 0;

          if (!hasBalance) {
            return;
          }

          const summaryRate =
            wtBox > 0
              ? amount / wtBox
              : outward.amount > 0 && outward.wtBox > 0
                ? outward.amount / outward.wtBox
                : 0;

          outstandingRows.push({
            materialId: outward.materialId,
            materialName: outward.materialName,
            shadeCode: outward.shadeCode,
            shadeName: outward.shadeName,
            rolls: Number.isInteger(rolls) ? String(rolls) : rolls.toFixed(2),
            wtBox: wtBox.toFixed(2),
            weight: weight.toFixed(2),
            rate: summaryRate.toFixed(2),
            amount: amount.toFixed(2),
            unit: outward.unit,
            selected: false,
          });
        });

        setRows(outstandingRows);
      } catch (error) {
        console.error(
          "Failed to fetch outstanding party material entries",
          error
        );

        setRows([]);

        Swal.fire(
          "Error",
          "Unable to fetch material summary for selected party.",
          "error"
        );
      } finally {
        setLoadingPartyItems(false);
      }
    };

    fetchOutstandingPartyEntries();
  }, [selectedParty, editingId]);

  // =========================================================
  // INPUT CHANGE
  // =========================================================

  const handleInputChange = (
    index: number,
    field: keyof RowData,
    value: string
  ) => {
    const updated =
      [...rows];

    (updated[index] as any)[field] =
      value;

    if (
      field === "weight" ||
      field === "rate"
    ) {
      const wt =
        parseFloat(
          updated[index].weight
        ) || 0;

      const rt =
        parseFloat(
          updated[index].rate
        ) || 0;

      updated[index].amount =
        (wt * rt).toFixed(2);
    }

    setRows(updated);
  };

  // =========================================================
  // CHECKBOX CHANGE
  // =========================================================

  const handleRowCheck = (
    index: number,
    checked: boolean
  ) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              selected: checked,
            }
          : row
      )
    );
  };

  // =========================================================
  // SELECT ALL
  // =========================================================

  const selectAllRows = () => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: true,
      }))
    );
  };

  // =========================================================
  // UNSELECT ALL
  // =========================================================

  const unselectAllRows = () => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: false,
      }))
    );
  };

  // =========================================================
  // SELECTED SUMMARY ROW COUNT
  // =========================================================

  const selectedRows =
    rows.filter(
      (row) => row.selected
    );

  const selectedRowCount =
    selectedRows.length;

  // =========================================================
  // ADD MANUAL ROW
  // =========================================================

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        materialId: null,
        materialName: "",
        shadeCode: "",
        shadeName: "",
        rolls: "",
        wtBox: "",
        weight: "",
        rate: "",
        amount: "",
        unit: "",

        // Manual row selected by default
        selected: true,
      },
    ]);
  };

  // =========================================================
  // RESET
  // =========================================================

  const clearForm = () => {
    setSelectedParty("");

    setSelectedReceivedParty("");

    setChallanNo("");

    setDate("");

    setRows([]);

    setEditingId(null);
  };

  // =========================================================
  // PRINT
  // ONLY SELECTED ROWS WILL PRINT
  // =========================================================

  const handlePrint = () => {
    if (selectedRows.length === 0) {
      return Swal.fire(
        "Select Entries",
        "Please select at least one entry to print.",
        "warning"
      );
    }

    const partyName =
      partyList.find(
        (p) =>
          String(p.id) ===
          String(selectedParty)
      )?.partyName || "-";

    const receivedPartyName =
      allPartyList.find(
        (p) =>
          String(p.id) ===
          String(
            selectedReceivedParty
          )
      )?.partyName || "-";

    const challanNoDisplay =
      challanNo || "-";

    const dateDisplay =
      date || "-";

    const totalWeight =
      selectedRows.reduce(
        (sum, r) =>
          sum +
          (parseFloat(
            r.weight
          ) || 0),
        0
      );

    const totalAmount =
      selectedRows.reduce(
        (sum, r) => {
          const wt =
            parseFloat(
              r.weight || "0"
            ) || 0;

          const rt =
            parseFloat(
              r.rate || "0"
            ) || 0;

          const amt =
            !isNaN(
              parseFloat(
                r.amount
              )
            )
              ? parseFloat(
                  r.amount
                )
              : wt * rt;

          return (
            sum +
            (amt || 0)
          );
        },
        0
      );

    const rowsHtml =
      selectedRows.length > 0
        ? selectedRows
            .map((r, i) => {
              const wt =
                parseFloat(
                  r.weight || "0"
                ) || 0;

              const rt =
                parseFloat(
                  r.rate || "0"
                ) || 0;

              const amt =
                !isNaN(
                  parseFloat(
                    r.amount
                  )
                )
                  ? parseFloat(
                      r.amount
                    )
                  : wt * rt;

              return `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.materialName || "-"}</td>
                  <td>${
                    r.shadeName ||
                    r.shadeCode ||
                    "-"
                  }</td>
                  <td>${r.rolls || "-"}</td>
                  <td>${r.wtBox || "-"}</td>
                  <td>${r.weight || "-"}</td>
                  <td>${r.rate || "-"}</td>
                  <td>${
                    isNaN(amt)
                      ? "-"
                      : amt.toFixed(2)
                  }</td>
                  <td>${r.unit || "-"}</td>
                </tr>
              `;
            })
            .join("")
        : `
            <tr>
              <td
                colspan="9"
                style="text-align:center;padding:10px;"
              >
                No items
              </td>
            </tr>
          `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>

          <title>
            Knitting Material Return
          </title>

          <meta charset="utf-8" />

          <style>

            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }

            h2 {
              text-align: center;
              margin: 0 0 10px;
            }

            .header-info {
              margin-top: 8px;
              font-size: 14px;
            }

            .header-info .row {
              margin: 4px 0;
            }

            .header-info .label {
              font-weight: bold;
              display: inline-block;
              width: 190px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }

            th,
            td {
              border: 1px solid #999;
              padding: 6px 8px;
              text-align: center;
              font-size: 12px;
            }

            th {
              background-color: #f2f2f2;
            }

            tfoot td {
              font-weight: bold;
              background: #fafafa;
            }

            .footer {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              font-size: 13px;
            }

            @media print {

              @page {
                size: A4;
                margin: 12mm;
              }

            }

          </style>

        </head>

        <body>

          <h2>
            Knitting Material Return
          </h2>

          <div class="header-info">

            <div class="row">
              <span class="label">
                Return Challan No:
              </span>

              ${challanNoDisplay}
            </div>

            <div class="row">
              <span class="label">
                Date:
              </span>

              ${dateDisplay}
            </div>

            <div class="row">
              <span class="label">
                Material Party:
              </span>

              ${partyName}
            </div>

            <div class="row">
              <span class="label">
                Received Return Party:
              </span>

              ${receivedPartyName}
            </div>

          </div>

          <table>

            <thead>

              <tr>
                <th>#</th>
                <th>Material</th>
                <th>Shade</th>
                <th>Rolls</th>
                <th>Wt/Box</th>
                <th>Weight</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>Unit</th>
              </tr>

            </thead>

            <tbody>
              ${rowsHtml}
            </tbody>

            <tfoot>

              <tr>

                <td
                  colspan="5"
                  style="text-align:right"
                >
                  Totals:
                </td>

                <td>
                  ${totalWeight.toFixed(2)}
                </td>

                <td></td>

                <td>
                  ${totalAmount.toFixed(2)}
                </td>

                <td></td>

              </tr>

            </tfoot>

          </table>

          <div class="footer">

            <div>
              Receiver Signature
            </div>

            <div>
              Authorized Signatory
            </div>

          </div>

          <script>

            window.addEventListener(
              "load",
              () => {

                setTimeout(
                  () => {
                    window.print();
                  },
                  50
                );

              }
            );

            window.onafterprint =
              () => {
                window.close();
              };

          </script>

        </body>

      </html>
    `;

    const printWindow =
      window.open(
        "",
        "_blank"
      );

    if (
      printWindow &&
      printWindow.document
    ) {
      printWindow.document.open();

      printWindow.document.write(
        html
      );

      printWindow.document.close();

      printWindow.onload =
        () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        };
    } else {

      const iframe =
        document.createElement(
          "iframe"
        );

      iframe.style.position =
        "fixed";

      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";

      document.body.appendChild(
        iframe
      );

      const doc =
        iframe.contentDocument ||
        iframe.contentWindow?.document;

      if (!doc) {
        Swal.fire(
          "Unable to open print preview.",
          "Please allow pop-ups.",
          "error"
        );

        return;
      }

      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {

        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {

          setTimeout(() => {

            if (
              document.body.contains(
                iframe
              )
            ) {
              document.body.removeChild(
                iframe
              );
            }

          }, 1000);

        }

      }, 100);
    }
  };

  // =========================================================
  // FETCH SAVED RETURNS
  // =========================================================

  const fetchReturns =
    async () => {

      setLoadingList(true);

      try {

        const { data } =
          await api.get(
            "/knitting-material-return"
          );

        setReturns(
          Array.isArray(data)
            ? data
            : data?.content || []
        );

      } catch (error) {

        console.error(
          error
        );

        setReturns([]);

      } finally {

        setLoadingList(false);

      }
    };

  // =========================================================
  // OPEN LIST
  // =========================================================

  const openList = () => {
    setShowList(true);
    fetchReturns();
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete =
    async (
      id: string | number
    ) => {

      const result =
        await Swal.fire({

          title:
            "Delete this entry?",

          text:
            "This action cannot be undone.",

          icon:
            "warning",

          showCancelButton:
            true,

          confirmButtonText:
            "Yes, Delete",

          cancelButtonText:
            "Cancel",
        });

      if (
        !result.isConfirmed
      ) {
        return;
      }

      try {

        await api.delete(
          `/knitting-material-return/${id}`
        );

        setReturns(
          (prev) =>
            prev.filter(
              (x) =>
                String(x.id) !==
                String(id)
            )
        );

        Swal.fire(
          "Deleted",
          "Entry deleted successfully.",
          "success"
        );

      } catch (error) {

        console.error(
          error
        );

        Swal.fire(
          "Error",
          "Failed to delete entry.",
          "error"
        );
      }
    };

  // =========================================================
  // EDIT
  // =========================================================

  const handleEdit =
    async (
      id: string | number
    ) => {

      try {

        const { data } =
          await api.get(
            `/knitting-material-return/${id}`
          );

        setEditingId(
          String(id)
        );

        // The rows below are the saved return rows. Prevent the
        // party auto-fetch effect from replacing them with outstanding rows.
        skipNextPartyFetchRef.current = true;

        setSelectedParty(
          String(
            data.partyId ??
            data.party?.id ??
            ""
          )
        );

        setSelectedReceivedParty(
          String(
            data.receivedPartyId ??
            data.receivedParty?.id ??
            ""
          )
        );

        setChallanNo(
          data.challanNo ??
          ""
        );

        setDate(
          (
            data.date ??
            ""
          ).slice(0, 10)
        );

        const mapped: RowData[] =
          (
            data.items ||
            []
          ).map(
            (i: any) => ({

              materialId:
                i.material?.id ??
                i.materialId ??
                null,

              materialName:
                i.material?.materialName ??
                i.materialName ??
                "",

              shadeCode:
                i.shade?.shadeCode ??
                i.shadeCode ??
                "",

              shadeName:
                i.shade?.shadeName ??
                i.shadeName ??
                "",

              rolls: String(
                i.rolls ??
                i.roll ??
                ""
              ),

              wtBox: String(
                i.wtPerBox ??
                ""
              ),

              weight: String(
                i.weight ??
                ""
              ),

              rate: String(
                i.rate ??
                ""
              ),

              amount: (
                Number(
                  i.amount ??
                  (
                    Number(
                      i.weight || 0
                    ) *
                    Number(
                      i.rate || 0
                    )
                  )
                ) || 0
              ).toFixed(2),

              unit:
                i.unit ??
                i.material?.materialUnit ??
                "",

              // Existing saved rows
              // should be checked
              selected: true,
            })
          );

        setRows(mapped);

        setShowList(false);

      } catch (error) {

        console.error(
          error
        );

        Swal.fire(
          "Error",
          "Failed to load entry.",
          "error"
        );
      }
    };

  // =========================================================
  // SAVE / UPDATE
  // =========================================================

  const save =
    async () => {

      // -----------------------------------------
      // PARTY REQUIRED
      // -----------------------------------------

      if (!selectedParty) {

        return Swal.fire(
          "Select Party",
          "Please select Material Party.",
          "warning"
        );
      }

      // -----------------------------------------
      // DATE REQUIRED
      // -----------------------------------------

      if (!date) {

        return Swal.fire(
          "Select Date",
          "Please select date.",
          "warning"
        );
      }

      // -----------------------------------------
      // CHECKED ROWS REQUIRED
      // -----------------------------------------

      const rowsToSave =
        rows.filter(
          (row) =>
            row.selected
        );

      if (
        rowsToSave.length === 0
      ) {

        return Swal.fire(
          "Select Entries",
          "Please select at least one material entry.",
          "warning"
        );
      }

      // -----------------------------------------
      // DTO
      // -----------------------------------------

      const dto = {

        date,

        // Material Party
        partyId:
          Number(
            selectedParty
          ),

        // Optional Received Return Party
        receivedPartyId:
          selectedReceivedParty
            ? Number(
                selectedReceivedParty
              )
            : null,

        // OPTIONAL CHALLAN
        // blank is allowed
        challanNo:
          challanNo.trim()
            ? challanNo.trim()
            : null,

        // ONLY CHECKED ROWS
        items:
          rowsToSave.map(
            (r) => ({

              materialId:
                r.materialId,

              shadeCode:
                r.shadeCode ||
                null,

              rolls:
                r.rolls ||
                "",

              wtPerBox:
                Number(
                  r.wtBox
                ) || 0,

              weight:
                Number(
                  r.weight
                ) || 0,

              rate:
                Number(
                  r.rate
                ) || 0,

              amount:
                Number(
                  r.amount
                ) || 0,

              unit:
                r.unit ||
                null,
            })
          ),
      };

      try {

        // ---------------------------------------
        // UPDATE
        // ---------------------------------------

        if (editingId) {

          await api.put(
            `/knitting-material-return/${editingId}`,
            dto
          );

          Swal.fire(
            "Updated ✅",
            "Knitting material return updated successfully.",
            "success"
          );

        }

        // ---------------------------------------
        // NEW SAVE
        // ---------------------------------------

        else {

          await api.post(
            "/knitting-material-return",
            dto
          );

          Swal.fire(
            "Saved ✅",
            `${rowsToSave.length} selected summary entr${
              rowsToSave.length === 1
                ? "y"
                : "ies"
            } saved successfully.`,
            "success"
          );
        }

        setEditingId(null);

        // Reset selection after save
        setRows([]);

        setSelectedParty("");

        setSelectedReceivedParty("");

        setChallanNo("");

      } catch (
        error: any
      ) {

        console.error(
          error
        );

        Swal.fire(
          "Error",
          error?.response?.data?.message ||
            "Failed to save knitting material return.",
          "error"
        );
      }
    };

  // =========================================================
  // SEARCH
  // =========================================================

  const filtered =
    useMemo(() => {

      const s =
        searchText
          .trim()
          .toLowerCase();

      if (!s) {
        return returns;
      }

      return returns.filter(
        (r: any) => {

          const receivedParty =
            r.receivedParty
              ?.partyName ||
            "";

          return (

            String(
              r.challanNo ||
              ""
            )
              .toLowerCase()
              .includes(s) ||

            String(
              r.party
                ?.partyName ||
                ""
            )
              .toLowerCase()
              .includes(s) ||

            String(
              receivedParty
            )
              .toLowerCase()
              .includes(s)
          );
        }
      );

    }, [
      returns,
      searchText,
    ]);

  // =========================================================
  // TOTAL AMOUNT
  // =========================================================

  const getTotalAmount =
    (r: any) =>

      (r.items || [])
        .reduce(
          (
            sum: number,
            it: any
          ) =>

            sum +
            Number(
              it.amount ??
              (
                Number(
                  it.weight || 0
                ) *
                Number(
                  it.rate || 0
                )
              )
            ),

          0
        );

  // =========================================================
  // UI
  // =========================================================

  return (
    <Dashboard>

      <div className="p-6 bg-gray-100 min-h-screen">

        <div className="bg-white shadow-md rounded-2xl p-6 max-w-7xl mx-auto">

          <h2 className="text-2xl font-bold mb-6 text-center">
            Knitting Material Return
          </h2>

          {/* =================================================
              FORM
          ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

            {/* MATERIAL PARTY */}

            <div>

              <label className="block font-bold mb-1">

                Material Party

                <span className="text-red-500 ml-1">
                  *
                </span>

              </label>

              <select
                value={
                  selectedParty
                }
                onChange={(e) =>
                  setSelectedParty(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              >

                <option value="">
                  Select Party
                </option>

                {partyList.map(
                  (p) => (

                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.partyName}
                    </option>

                  )
                )}

              </select>

            </div>

            {/* RECEIVED RETURN PARTY */}

            <div>

              <label className="block font-bold mb-1">

                Received Return Party

                <span className="text-gray-500 text-xs ml-1">
                  (Optional)
                </span>

              </label>

              <select
                value={
                  selectedReceivedParty
                }
                onChange={(e) =>
                  setSelectedReceivedParty(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              >

                <option value="">
                  Select Received Return Party
                </option>

                {allPartyList.map(
                  (p) => (

                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {p.partyName}
                    </option>

                  )
                )}

              </select>

              <p className="text-xs text-gray-500 mt-1">
                Optional — blank hone par bhi Save hoga.
              </p>

            </div>

            {/* RETURN CHALLAN */}

            <div>

              <label className="block font-bold mb-1">

                Return Challan No

                <span className="text-gray-500 text-xs ml-1">
                  (Optional)
                </span>

              </label>

              <input
                value={
                  challanNo
                }
                onChange={(e) =>
                  setChallanNo(
                    e.target.value
                  )
                }
                placeholder="Enter Return Challan No (Optional)"
                className="border p-2 rounded w-full"
              />

            </div>

            {/* DATE */}

            <div>

              <label className="block font-bold mb-1">

                Date

                <span className="text-red-500 ml-1">
                  *
                </span>

              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
                className="border p-2 rounded w-full"
              />

            </div>

          </div>

          {/* =================================================
              AUTO FETCH MESSAGE
          ================================================= */}

          {loadingPartyItems && (

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded text-center">

              Fetching and summarizing all material entries for selected party...

            </div>

          )}

          {/* =================================================
              SELECTION CONTROLS
          ================================================= */}

          {rows.length > 0 && (

            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">

              <div className="font-semibold text-gray-700">

                Total Entries:
                <span className="ml-1">
                  {rows.length}
                </span>

                <span className="ml-4">

                  Selected:
                  <span className="text-green-600 ml-1">
                    {selectedRowCount}
                  </span>

                </span>

              </div>

              <div className="flex gap-2">

                <button
                  type="button"
                  onClick={
                    selectAllRows
                  }
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={
                    unselectAllRows
                  }
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Unselect All
                </button>

              </div>

            </div>

          )}

          {/* =================================================
              PARTY-WISE MATERIAL SUMMARY TABLE
          ================================================= */}

          {/* {rows.length > 0 && !loadingPartyItems && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              <strong>Summary:</strong> Challan-wise entries have been
              combined material-wise and shade-wise for the selected party.
              Rolls, Wt/Box, Weight and Amount are totaled, and Rate is
              calculated from the summarized Amount ÷ Wt/Box.
            </div>
          )} */}

          <div className="overflow-x-auto">

            <table className="w-full border mb-6 text-sm">

              <thead className="bg-gray-200">

                <tr>

                  <th className="border p-2 w-12">
                    Select
                  </th>

                  <th className="border p-2">
                    #
                  </th>

                  <th className="border p-2">
                    Material
                  </th>

                  <th className="border p-2">
                    Shade
                  </th>

                  <th className="border p-2">
                    Rolls
                  </th>

                  <th className="border p-2">
                    Wt/Box
                  </th>

                  <th className="border p-2">
                    Weight
                  </th>

                  <th className="border p-2">
                    Rate
                  </th>

                  <th className="border p-2">
                    Amount
                  </th>

                  <th className="border p-2">
                    Unit
                  </th>

                </tr>

              </thead>

              <tbody>

                {rows.length > 0 ? (

                  rows.map(
                    (
                      row,
                      i
                    ) => (

                      <tr
                        key={i}
                        className={
                          row.selected
                            ? "bg-green-50"
                            : ""
                        }
                      >

                        {/* CHECKBOX */}

                        <td className="border p-2 text-center">

                          <input
                            type="checkbox"
                            checked={
                              row.selected
                            }
                            onChange={(e) =>
                              handleRowCheck(
                                i,
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 cursor-pointer"
                          />

                        </td>

                        {/* NUMBER */}

                        <td className="border text-center p-1">
                          {i + 1}
                        </td>

                        {/* MATERIAL */}

                        <td className="border p-1">
                          {row.materialName}
                        </td>

                        {/* SHADE */}

                        <td className="border p-1">
                          {row.shadeName ||
                            row.shadeCode}
                        </td>

                        {/* ROLLS */}

                        <td className="border p-1">

                          <input
                            value={
                              row.rolls
                            }
                            onChange={(e) =>
                              handleInputChange(
                                i,
                                "rolls",
                                e.target.value
                              )
                            }
                            className="w-full border p-1 rounded"
                          />

                        </td>

                        {/* WT BOX */}

                        <td className="border p-1">

                          <input
                            value={
                              row.wtBox
                            }
                            onChange={(e) =>
                              handleInputChange(
                                i,
                                "wtBox",
                                e.target.value
                              )
                            }
                            className="w-full border p-1 rounded"
                          />

                        </td>

                        {/* WEIGHT */}

                        <td className="border p-1">

                          <input
                            value={
                              row.weight
                            }
                            onChange={(e) =>
                              handleInputChange(
                                i,
                                "weight",
                                e.target.value
                              )
                            }
                            className="w-full border p-1 rounded"
                          />

                        </td>

                        {/* RATE */}

                        <td className="border p-1">

                          <input
                            value={
                              row.rate
                            }
                            onChange={(e) =>
                              handleInputChange(
                                i,
                                "rate",
                                e.target.value
                              )
                            }
                            className="w-full border p-1 rounded"
                          />

                        </td>

                        {/* AMOUNT */}

                        <td className="border text-right p-2 bg-gray-100">

                          {row.amount}

                        </td>

                        {/* UNIT */}

                        <td className="border text-center p-1">

                          {row.unit}

                        </td>

                      </tr>

                    )
                  )

                ) : (

                  <tr>

                    <td
                      colSpan={10}
                      className="text-center p-6 text-gray-500"
                    >

                      {selectedParty
                        ? "No material entries found for this party."
                        : "Select Material Party to automatically fetch all entries."}

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="flex flex-wrap gap-3 justify-center mb-6">

            <button
              onClick={
                addRow
              }
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              Add Row
            </button>

            <button
              onClick={
                save
              }
              disabled={
                loadingPartyItems
              }
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
            >
              {editingId
                ? "Update"
                : "Save Selected"}
            </button>

            <button
              onClick={
                handlePrint
              }
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded"
            >
              Print Selected
            </button>

            <button
              onClick={
                openList
              }
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-2 rounded"
            >
              View List
            </button>

            <button
              onClick={
                clearForm
              }
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
            >
              Reset
            </button>

          </div>

          {/* =================================================
              LIST MODAL
          ================================================= */}

          {showList && (

            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">

              <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-5 flex flex-col">

                <div className="flex justify-between items-center mb-3">

                  <h3 className="text-xl font-bold">
                    Knitting Material Return List
                  </h3>

                  <button
                    onClick={() =>
                      setShowList(false)
                    }
                    className="bg-gray-500 text-white px-4 py-2 rounded"
                  >
                    Close
                  </button>

                </div>

                <input
                  value={
                    searchText
                  }
                  onChange={(e) =>
                    setSearchText(
                      e.target.value
                    )
                  }
                  placeholder="Search Return Challan / Material Party / Received Return Party..."
                  className="border p-2 rounded mb-3 w-full"
                />

                <div className="overflow-auto max-h-[60vh]">

                  <table className="w-full text-sm border">

                    <thead className="bg-gray-200">

                      <tr>

                        <th className="border p-2">
                          #
                        </th>

                        <th className="border p-2">
                          Return Challan
                        </th>

                        <th className="border p-2">
                          Date
                        </th>

                        <th className="border p-2">
                          Material Party
                        </th>

                        <th className="border p-2">
                          Received Return Party
                        </th>

                        <th className="border p-2">
                          Items
                        </th>

                        <th className="border p-2">
                          Amount
                        </th>

                        <th className="border p-2">
                          Actions
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filtered.length >
                      0 ? (

                        filtered.map(
                          (
                            r: any,
                            i
                          ) => (

                            <tr
                              key={
                                r.id
                              }
                            >

                              <td className="border p-2 text-center">
                                {i + 1}
                              </td>

                              <td className="border p-2">
                                {r.challanNo ||
                                  "-"}
                              </td>

                              <td className="border p-2">
                                {(
                                  r.date ||
                                  ""
                                ).slice(
                                  0,
                                  10
                                )}
                              </td>

                              <td className="border p-2">
                                {r.party
                                  ?.partyName ||
                                  "-"}
                              </td>

                              <td className="border p-2">
                                {r.receivedParty
                                  ?.partyName ||
                                  "-"}
                              </td>

                              <td className="border p-2 text-center">

                                {
                                  (
                                    r.items ||
                                    []
                                  ).length
                                }

                              </td>

                              <td className="border p-2 text-right">

                                {getTotalAmount(
                                  r
                                ).toFixed(
                                  2
                                )}

                              </td>

                              <td className="border p-2 text-center whitespace-nowrap">

                                <button
                                  onClick={() =>
                                    handleEdit(
                                      r.id
                                    )
                                  }
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                                >
                                  Edit
                                </button>

                                <button
                                  onClick={() =>
                                    handleDelete(
                                      r.id
                                    )
                                  }
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 ml-2 rounded"
                                >
                                  Delete
                                </button>

                              </td>

                            </tr>

                          )
                        )

                      ) : (

                        <tr>

                          <td
                            colSpan={8}
                            className="text-center p-5 text-gray-500"
                          >
                            No entries found.
                          </td>

                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>

                <button
                  onClick={() =>
                    setShowList(false)
                  }
                  className="mt-4 bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded self-center"
                >
                  Close
                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </Dashboard>
  );
};

export default KnittingMaterialReturn;