"use client";

import React, { useEffect, useMemo, useState } from "react";
import Dashboard from "../../Dashboard";
import Swal from "sweetalert2";
import api from "../../../api/axiosInstance";

// =========================================================
// TYPES
// =========================================================

interface Party {
  id: number;
  partyName?: string;
  name?: string;
  serialNumber?: string;
  gstNo?: string;
}

interface InwardRow {
  id?: number;

  fabricLotNo?: string;
  lotNo?: string;

  // Fabric can come from either field
  fabric?: string;
  fabricName?: string;

  rolls?: string | number;
  weight?: string | number;
  receivedWeight?: string | number;
  shortage?: string | number;
  percentage?: string | number;
  knittingYarnRate?: string | number;
  dyeingRate?: string | number;
  amount?: string | number;
}

interface Inward {
  id: number;
  dated?: string;
  partyName?: string;
  challanNo?: string;
  rows?: InwardRow[];
}

interface InwardLot {
  uniqueKey: string;

  inwardId: number;
  rowId?: number;

  lotNo: string;

  // IMPORTANT
  fabric: string;

  rolls: string;
  weight: string;
  receivedWeight: string;
  shortage: string;
  percentage: string;

  dyeingRate: string;
  amount: string;

  date: string;
  challanNo: string;
  partyName: string;
}

interface BatchLot extends InwardLot {
  id?: number;
}

interface BatchRecord {
  id: number;
  batchName: string;
  partyName: string;
  createdAt: string;
  lots: BatchLot[];
}

// =========================================================
// HELPERS
// =========================================================

const toNumber = (value: any): number => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

// Amount is always calculated as Weight × Dyeing Rate
const calculateAmount = (
  weight: string | number,
  dyeingRate: string | number
): string => {
  return (
    toNumber(weight) * toNumber(dyeingRate)
  ).toFixed(2);
};

const formatDate = (
  dateString: string
) => {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const formatDateTime = (
  dateString: string
) => {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleString(
    "en-IN"
  );
};

const getPartyName = (
  party: Party
) => {
  return (
    party.partyName ||
    party.name ||
    ""
  );
};

const getErrorMessage = (
  error: any
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong"
  );
};

// =========================================================
// ESCAPE HTML FOR PRINT
// =========================================================

const escapeHtml = (
  value: any
) => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// =========================================================
// COMPONENT
// =========================================================

const DyeingBatchCreation: React.FC =
  () => {
    // =======================================================
    // PARTY
    // =======================================================

    const [partyList, setPartyList] =
      useState<Party[]>([]);

    const [partyName, setPartyName] =
      useState("");

    const [
      partySearch,
      setPartySearch,
    ] = useState("");

    const [
      showPartyModal,
      setShowPartyModal,
    ] = useState(false);

    // =======================================================
    // BATCH FORM
    // =======================================================

    const [batchName, setBatchName] =
      useState("");

    const [
      editingBatchId,
      setEditingBatchId,
    ] = useState<number | null>(
      null
    );

    // =======================================================
    // LOTS
    // =======================================================

    const [
      availableLots,
      setAvailableLots,
    ] = useState<InwardLot[]>([]);

    const [
      selectedLots,
      setSelectedLots,
    ] = useState<InwardLot[]>([]);

    const [lotSearch, setLotSearch] =
      useState("");

    const [
      showLotModal,
      setShowLotModal,
    ] = useState(false);

    // =======================================================
    // BATCH LIST
    // =======================================================

    const [batches, setBatches] =
      useState<BatchRecord[]>([]);

    const [
      batchSearch,
      setBatchSearch,
    ] = useState("");

    // =======================================================
    // LOADING
    // =======================================================

    const [
      loadingParties,
      setLoadingParties,
    ] = useState(false);

    const [
      loadingLots,
      setLoadingLots,
    ] = useState(false);

    const [
      loadingBatches,
      setLoadingBatches,
    ] = useState(false);

    const [saving, setSaving] =
      useState(false);

    // =======================================================
    // INITIAL LOAD
    // =======================================================

    useEffect(() => {
      loadParties();
      loadBatches();
    }, []);

    // =======================================================
    // LOAD PARTIES
    // =======================================================

    const loadParties = async () => {
      try {
        setLoadingParties(true);

        const response =
          await api.get(
            "/party/category/Dyeing"
          );

        const data =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setPartyList(data);
      } catch (error) {
        console.error(
          "Party loading error:",
          error
        );

        Swal.fire(
          "Error",
          "Failed to load Dyeing parties.",
          "error"
        );
      } finally {
        setLoadingParties(false);
      }
    };

    // =======================================================
    // LOAD BATCHES
    // =======================================================

    const loadBatches = async () => {
      try {
        setLoadingBatches(true);

        const response =
          await api.get(
            "/dyeing-batch"
          );

        const data =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        setBatches(data);
      } catch (error) {
        console.error(
          "Batch loading error:",
          error
        );

        Swal.fire(
          "Error",
          getErrorMessage(error),
          "error"
        );
      } finally {
        setLoadingBatches(false);
      }
    };

    // =======================================================
    // USED LOT KEYS
    // =======================================================

    const getUsedLotKeys = () => {
      const keys =
        new Set<string>();

      batches.forEach(
        (batch) => {
          if (!batch.lots) {
            return;
          }

          batch.lots.forEach(
            (lot) => {
              const key =
                lot.uniqueKey ||
                `${lot.inwardId}-${
                  lot.rowId ?? 0
                }-${lot.lotNo}`;

              keys.add(key);
            }
          );
        }
      );

      return keys;
    };

    // =======================================================
    // LOAD AVAILABLE INWARD LOTS
    // =======================================================

    const loadAvailableLots =
      async (
        selectedPartyName: string,
        currentEditingBatchId:
          | number
          | null = null
      ) => {
        if (
          !selectedPartyName
        ) {
          setAvailableLots([]);
          return;
        }

        try {
          setLoadingLots(true);

          const response =
            await api.get(
              "/dyeing-inward"
            );

          const inwardList: Inward[] =
            Array.isArray(
              response.data
            )
              ? response.data
              : [];

          const usedLotKeys =
            getUsedLotKeys();

          // =================================================
          // WHILE EDITING
          // CURRENT BATCH LOTS MUST BE AVAILABLE
          // =================================================

          if (
            currentEditingBatchId
          ) {
            const currentBatch =
              batches.find(
                (batch) =>
                  batch.id ===
                  currentEditingBatchId
              );

            currentBatch?.lots?.forEach(
              (lot) => {
                const key =
                  lot.uniqueKey ||
                  `${lot.inwardId}-${
                    lot.rowId ?? 0
                  }-${lot.lotNo}`;

                usedLotKeys.delete(
                  key
                );
              }
            );
          }

          const result: InwardLot[] =
            [];

          inwardList.forEach(
            (inward) => {
              const inwardParty =
                String(
                  inward.partyName ||
                    ""
                ).trim();

              if (
                inwardParty.toLowerCase() !==
                selectedPartyName
                  .trim()
                  .toLowerCase()
              ) {
                return;
              }

              const rows =
                Array.isArray(
                  inward.rows
                )
                  ? inward.rows
                  : [];

              rows.forEach(
                (
                  row,
                  index
                ) => {
                  // =========================================
                  // LOT NUMBER
                  // =========================================

                  const lotNo =
                    String(
                      row.fabricLotNo ??
                        row.lotNo ??
                        ""
                    ).trim();

                  if (!lotNo) {
                    return;
                  }

                  // =========================================
                  // ROW ID
                  // =========================================

                  const rowId =
                    row.id !==
                      undefined &&
                    row.id !== null
                      ? Number(row.id)
                      : undefined;

                  // =========================================
                  // UNIQUE KEY
                  // =========================================

                  const uniqueKey =
                    `${inward.id}-${
                      rowId ?? index
                    }-${lotNo}`;

                  // =========================================
                  // ALREADY USED LOT
                  // =========================================

                  if (
                    usedLotKeys.has(
                      uniqueKey
                    )
                  ) {
                    return;
                  }

                  // =========================================
                  // IMPORTANT FABRIC NAME
                  // =========================================

                  const fabricName =
                    String(
                      row.fabric ??
                        row.fabricName ??
                        ""
                    ).trim();

                  // =========================================
                  // RECEIVED WEIGHT
                  // =========================================

                  const receivedWeight =
                    String(
                      row.receivedWeight ??
                        ""
                    );

                  // =========================================
                  // DYEING RATE
                  // =========================================

                  const dyeingRate =
                    String(
                      row.dyeingRate ??
                        ""
                    );

                  // =========================================
                  // AMOUNT
                  // =========================================

                  // Amount = Weight × Dyeing Rate
                  const amount =
                    calculateAmount(
                      row.weight ?? "",
                      dyeingRate
                    );

                  // =========================================
                  // PUSH LOT
                  // =========================================

                  result.push({
                    uniqueKey,

                    inwardId:
                      Number(
                        inward.id
                      ),

                    rowId,

                    lotNo,

                    // IMPORTANT
                    fabric:
                      fabricName,

                    rolls:
                      String(
                        row.rolls ??
                          ""
                      ),

                    weight:
                      String(
                        row.weight ??
                          ""
                      ),

                    receivedWeight,

                    shortage:
                      String(
                        row.shortage ??
                          ""
                      ),

                    percentage:
                      String(
                        row.percentage ??
                          ""
                      ),

                    dyeingRate,

                    amount,

                    date:
                      String(
                        inward.dated ??
                          ""
                      ),

                    challanNo:
                      String(
                        inward.challanNo ??
                          ""
                      ),

                    partyName:
                      inwardParty,
                  });
                }
              );
            }
          );

          setAvailableLots(
            result
          );
        } catch (error) {
          console.error(
            "Inward lot loading error:",
            error
          );

          Swal.fire(
            "Error",
            "Failed to load Dyeing Inward lots.",
            "error"
          );
        } finally {
          setLoadingLots(false);
        }
      };

    // =======================================================
    // PARTY FILTER
    // =======================================================

    const filteredParties =
      useMemo(() => {
        const search =
          partySearch
            .trim()
            .toLowerCase();

        if (!search) {
          return partyList;
        }

        return partyList.filter(
          (party) =>
            getPartyName(
              party
            )
              .toLowerCase()
              .includes(search)
        );
      }, [
        partyList,
        partySearch,
      ]);

    // =======================================================
    // SELECT PARTY
    // =======================================================

    const handlePartySelect = async (
      party: Party
    ) => {
      const selectedName =
        getPartyName(party);

      setPartyName(
        selectedName
      );

      setSelectedLots([]);
      setLotSearch("");

      setShowPartyModal(false);

      await loadAvailableLots(
        selectedName,
        editingBatchId
      );
    };

    // =======================================================
    // AVAILABLE LOT SEARCH
    // =======================================================

    const filteredLots =
      useMemo(() => {
        const search =
          lotSearch
            .trim()
            .toLowerCase();

        if (!search) {
          return availableLots;
        }

        return availableLots.filter(
          (lot) => {
            const searchableText =
              [
                lot.lotNo,
                lot.fabric,
                lot.challanNo,
                lot.partyName,
                lot.date,
              ]
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
              search
            );
          }
        );
      }, [
        availableLots,
        lotSearch,
      ]);

    // =======================================================
    // IS LOT SELECTED
    // =======================================================

    const isLotSelected = (
      uniqueKey: string
    ) => {
      return selectedLots.some(
        (lot) =>
          lot.uniqueKey ===
          uniqueKey
      );
    };

    // =======================================================
    // TOGGLE LOT
    // =======================================================

    const toggleLot = (
      lot: InwardLot
    ) => {
      setSelectedLots(
        (previous) => {
          const exists =
            previous.some(
              (item) =>
                item.uniqueKey ===
                lot.uniqueKey
            );

          if (exists) {
            return previous.filter(
              (item) =>
                item.uniqueKey !==
                lot.uniqueKey
            );
          }

          return [
            ...previous,
            {
              ...lot,
            },
          ];
        }
      );
    };

    // =======================================================
    // SELECT ALL
    // =======================================================

    const selectAllFilteredLots =
      () => {
        setSelectedLots(
          (previous) => {
            const map =
              new Map<
                string,
                InwardLot
              >();

            previous.forEach(
              (lot) => {
                map.set(
                  lot.uniqueKey,
                  lot
                );
              }
            );

            filteredLots.forEach(
              (lot) => {
                map.set(
                  lot.uniqueKey,
                  lot
                );
              }
            );

            return Array.from(
              map.values()
            );
          }
        );
      };

    // =======================================================
    // CLEAR SELECTED LOTS
    // =======================================================

    const clearSelectedLots =
      () => {
        setSelectedLots([]);
      };

    // =======================================================
    // UPDATE RATE / AMOUNT
    // =======================================================

    const updateSelectedLot =
      (
        uniqueKey: string,
        field: "dyeingRate",
        value: string
      ) => {
        setSelectedLots(
          (previous) =>
            previous.map(
              (lot) => {
                if (
                  lot.uniqueKey !==
                  uniqueKey
                ) {
                  return lot;
                }

                const updated = {
                  ...lot,
                };

                if (
                  field ===
                  "dyeingRate"
                ) {
                  updated.dyeingRate =
                    value;

                  // Amount = Weight × Dyeing Rate
                  updated.amount =
                    calculateAmount(
                      updated.weight,
                      value
                    );
                }

                return updated;
              }
            )
        );
      };

    // =======================================================
    // TOTAL SELECTED
    // =======================================================

    const selectedTotals =
      useMemo(() => {
        const weight =
          selectedLots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                lot.weight
              ),
            0
          );

        const receivedWeight =
          selectedLots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                lot.receivedWeight
              ),
            0
          );

        const amount =
          selectedLots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                calculateAmount(
                  lot.weight,
                  lot.dyeingRate
                )
              ),
            0
          );

        return {
          weight,
          receivedWeight,
          amount,
        };
      }, [selectedLots]);

    // =======================================================
    // SAVE / UPDATE BATCH
    // =======================================================

    const handleSaveBatch =
      async () => {
        if (
          !partyName.trim()
        ) {
          Swal.fire(
            "Party Required",
            "Please select party.",
            "warning"
          );

          return;
        }

        if (
          !batchName.trim()
        ) {
          Swal.fire(
            "Batch Name Required",
            "Please enter batch name.",
            "warning"
          );

          return;
        }

        if (
          selectedLots.length ===
          0
        ) {
          Swal.fire(
            "Lot Required",
            "Please select at least one inward lot.",
            "warning"
          );

          return;
        }

        try {
          setSaving(true);

          // ===============================================
          // PAYLOAD
          // ===============================================

          const payload = {
            id:
              editingBatchId ||
              undefined,

            batchName:
              batchName.trim(),

            partyName:
              partyName.trim(),

            lots:
              selectedLots.map(
                (lot) => ({
                  id:
                    editingBatchId
                      ? (
                          lot as BatchLot
                        ).id
                      : undefined,

                  inwardId:
                    lot.inwardId,

                  inwardRowId:
                    lot.rowId,

                  uniqueKey:
                    lot.uniqueKey,

                  lotNo:
                    lot.lotNo,

                  // ======================================
                  // IMPORTANT FABRIC
                  // ======================================

                  fabric:
                    lot.fabric,

                  rolls:
                    lot.rolls,

                  weight:
                    lot.weight,

                  receivedWeight:
                    lot.receivedWeight,

                  shortage:
                    lot.shortage,

                  percentage:
                    lot.percentage,

                  dyeingRate:
                    lot.dyeingRate,

                  // Amount = Weight × Dyeing Rate
                  amount:
                    calculateAmount(
                      lot.weight,
                      lot.dyeingRate
                    ),

                  date:
                    lot.date,

                  challanNo:
                    lot.challanNo,

                  partyName:
                    lot.partyName,
                })
              ),
          };

          let response;

          // ===============================================
          // UPDATE
          // ===============================================

          if (
            editingBatchId
          ) {
            response =
              await api.put(
                `/dyeing-batch/${editingBatchId}`,
                payload
              );
          }

          // ===============================================
          // CREATE
          // ===============================================

          else {
            response =
              await api.post(
                "/dyeing-batch",
                payload
              );
          }

          const savedBatch =
            response.data;

          // ===============================================
          // UPDATE STATE
          // ===============================================

          if (
            editingBatchId
          ) {
            setBatches(
              (previous) =>
                previous.map(
                  (batch) =>
                    batch.id ===
                    editingBatchId
                      ? savedBatch
                      : batch
                )
            );

            Swal.fire({
              icon: "success",
              title:
                "Batch Updated",
              text: "Dyeing batch updated successfully.",
              timer: 1500,
              showConfirmButton:
                false,
            });
          } else {
            setBatches(
              (previous) => [
                savedBatch,
                ...previous,
              ]
            );

            Swal.fire({
              icon: "success",
              title:
                "Batch Saved",
              text: "Dyeing batch saved successfully.",
              timer: 1500,
              showConfirmButton:
                false,
            });
          }

          const savedParty =
            partyName;

          resetForm();

          await loadAvailableLots(
            savedParty
          );
        } catch (error) {
          console.error(
            "Save batch error:",
            error
          );

          Swal.fire(
            "Error",
            getErrorMessage(error),
            "error"
          );
        } finally {
          setSaving(false);
        }
      };

    // =======================================================
    // EDIT BATCH
    // =======================================================

    const handleEditBatch =
      async (
        batch: BatchRecord
      ) => {
        setEditingBatchId(
          batch.id
        );

        setPartyName(
          batch.partyName
        );

        setBatchName(
          batch.batchName
        );

        const mappedLots =
          (
            batch.lots || []
          ).map(
            (lot) => ({
              ...lot,

              uniqueKey:
                lot.uniqueKey ||
                `${lot.inwardId}-${
                  lot.rowId ?? 0
                }-${lot.lotNo}`,

              // Make sure old records don't lose fabric
              fabric:
                lot.fabric ||
                "",
            })
          );

        setSelectedLots(
          mappedLots
        );

        await loadAvailableLots(
          batch.partyName,
          batch.id
        );

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      };

    // =======================================================
    // DELETE BATCH
    // =======================================================

    const handleDeleteBatch =
      async (
        batch: BatchRecord
      ) => {
        const result =
          await Swal.fire({
            title:
              "Delete Batch?",
            html: `
              <div>
                <strong>
                  ${escapeHtml(
                    batch.batchName
                  )}
                </strong>
                <br/>
                Party:
                <strong>
                  ${escapeHtml(
                    batch.partyName
                  )}
                </strong>
                <br/><br/>
                ${
                  batch.lots
                    ?.length || 0
                }
                lot(s) will become available again.
              </div>
            `,
            icon: "warning",
            showCancelButton:
              true,
            confirmButtonText:
              "Yes, Delete",
            cancelButtonText:
              "Cancel",
            confirmButtonColor:
              "#dc2626",
          });

        if (
          !result.isConfirmed
        ) {
          return;
        }

        try {
          await api.delete(
            `/dyeing-batch/${batch.id}`
          );

          setBatches(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  batch.id
              )
          );

          if (
            editingBatchId ===
            batch.id
          ) {
            resetForm();
          }

          Swal.fire({
            icon: "success",
            title: "Deleted",
            text: "Batch deleted successfully. Its lots are available again.",
            timer: 1600,
            showConfirmButton:
              false,
          });

          if (
            partyName
          ) {
            await loadAvailableLots(
              partyName
            );
          }
        } catch (error) {
          console.error(
            "Delete batch error:",
            error
          );

          Swal.fire(
            "Error",
            getErrorMessage(error),
            "error"
          );
        }
      };

    // =======================================================
    // RESET FORM
    // =======================================================

    const resetForm =
      () => {
        setPartyName("");
        setBatchName("");
        setSelectedLots([]);
        setAvailableLots([]);
        setLotSearch("");
        setEditingBatchId(
          null
        );
      };

    // =======================================================
    // BATCH SEARCH
    // =======================================================

    const filteredBatches =
      useMemo(() => {
        const search =
          batchSearch
            .trim()
            .toLowerCase();

        if (!search) {
          return batches;
        }

        return batches.filter(
          (batch) => {
            const text =
              [
                batch.batchName,
                batch.partyName,

                ...(batch.lots ||
                  []
                ).flatMap(
                  (lot) => [
                    lot.lotNo,
                    lot.fabric,
                    lot.challanNo,
                  ]
                ),
              ]
                .join(" ")
                .toLowerCase();

            return text.includes(
              search
            );
          }
        );
      }, [
        batches,
        batchSearch,
      ]);

    // =======================================================
    // TOTAL SAVED LOTS
    // =======================================================

    const totalSavedLots =
      useMemo(() => {
        return batches.reduce(
          (sum, batch) =>
            sum +
            (batch.lots
              ?.length || 0),
          0
        );
      }, [batches]);

    // =======================================================
    // PRINT SINGLE BATCH
    // =======================================================

    const handlePrintBatch =
      (
        batch: BatchRecord
      ) => {
        const lots =
          batch.lots || [];

        const totalWeight =
          lots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                lot.weight
              ),
            0
          );

        const totalReceived =
          lots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                lot.receivedWeight
              ),
            0
          );

        const totalAmount =
          lots.reduce(
            (sum, lot) =>
              sum +
              toNumber(
                calculateAmount(
                  lot.weight,
                  lot.dyeingRate
                )
              ),
            0
          );

        const rowsHtml =
          lots
            .map(
              (
                lot,
                index
              ) => `
                <tr>

                  <td>
                    ${index + 1}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.lotNo
                    )}
                  </td>

                  <td>
                    ${formatDate(
                      lot.date
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.challanNo ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.partyName ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.fabric ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.weight ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.receivedWeight ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      lot.dyeingRate ||
                        "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      calculateAmount(
                        lot.weight,
                        lot.dyeingRate
                      )
                    )}
                  </td>

                </tr>
              `
            )
            .join("");

        const printWindow =
          window.open(
            "",
            "_blank",
            "width=1200,height=800"
          );

        if (!printWindow) {
          Swal.fire(
            "Error",
            "Please allow popup for printing.",
            "error"
          );

          return;
        }

        printWindow.document.write(`
          <!DOCTYPE html>

          <html>

          <head>

            <title>
              ${escapeHtml(
                batch.batchName
              )}
            </title>

            <style>

              @page {
                size: A4 landscape;
                margin: 8mm;
              }

              * {
                box-sizing: border-box;
              }

              body {
                font-family: Arial, sans-serif;
                margin: 0;
                color: #111;
              }

              .title {
                text-align: center;
                margin-bottom: 15px;
              }

              .title h1 {
                margin: 0;
                font-size: 22px;
              }

              .title h2 {
                margin: 5px 0;
                font-size: 17px;
              }

              .info {
                display: flex;
                justify-content: space-between;
                gap: 10px;
                margin-bottom: 10px;
                font-size: 10px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
              }

              th,
              td {
                border: 1px solid #777;
                padding: 4px 5px;
                font-size: 8.5px;
                text-align: center;
                vertical-align: middle;
              }

              th {
                background: #eeeeee;
              }

              .total {
                font-weight: bold;
                background: #eeeeee;
              }

            </style>

          </head>

          <body>

            <div class="title">

              <h1>
                DYEING BATCH
              </h1>

              <h2>
                ${escapeHtml(
                  batch.batchName
                )}
              </h2>

            </div>

            <div class="info">

              <div>
                <strong>
                  Party:
                </strong>

                ${escapeHtml(
                  batch.partyName
                )}
              </div>

              <div>
                <strong>
                  Created:
                </strong>

                ${formatDateTime(
                  batch.createdAt
                )}
              </div>

              <div>
                <strong>
                  Total Lots:
                </strong>

                ${lots.length}
              </div>

            </div>

            <table>

              <thead>

                 <tr>

                   <th>S.No</th>

                   <th>
                     Lot Number
                   </th>

                   <th>
                     Date
                   </th>

                   <th>
                     Challan Number
                   </th>

                   <th>
                     Party Name
                   </th>

                   <th>
                     Fabric Name
                   </th>

                   <th>
                     Weight
                   </th>

                   <th>
                     Received Weight
                   </th>

                   <th>
                     Dyeing Rate
                   </th>

                   <th>
                     Amount
                   </th>

                 </tr>

              </thead>

              <tbody>

                ${rowsHtml}

                <tr class="total">

                  <td colspan="6">
                    TOTAL
                  </td>


                  <td>
                    ${totalWeight.toFixed(
                      3
                    )}
                  </td>
                  <td>
                    ${totalReceived.toFixed(
                      3
                    )}
                  </td>

                  <td>
                    -
                  </td>

                  <td>
                    ₹${totalAmount.toFixed(
                      2
                    )}
                  </td>

                </tr>

              </tbody>

            </table>

            <script>

              window.onload =
                function() {

                  setTimeout(
                    function() {
                      window.print();
                    },
                    300
                  );

                  window.onafterprint =
                    function() {
                      window.close();
                    };

                };

            </script>

          </body>

          </html>
        `);

        printWindow.document.close();
      };

    // =======================================================
    // PRINT ALL
    // =======================================================

    const handlePrintAll =
      () => {
        if (
          filteredBatches.length ===
          0
        ) {
          Swal.fire(
            "No Batches",
            "There are no batches available to print.",
            "warning"
          );

          return;
        }

        const sections =
          filteredBatches
            .map(
              (batch) => {
                const lots =
                  batch.lots ||
                  [];

                const totalReceived =
                  lots.reduce(
                    (
                      sum,
                      lot
                    ) =>
                      sum +
                      toNumber(
                        lot.receivedWeight
                      ),
                    0
                  );

                const totalWeight =
                  lots.reduce(
                    (
                      sum,
                      lot
                    ) =>
                      sum +
                      toNumber(
                        lot.weight
                      ),
                    0
                  );

                const totalAmount =
                  lots.reduce(
                    (
                      sum,
                      lot
                    ) =>
                      sum +
                      toNumber(
                        calculateAmount(
                          lot.weight,
                          lot.dyeingRate
                        )
                      ),
                    0
                  );

                const rows =
                  lots
                    .map(
                      (
                        lot,
                        index
                      ) => `
                        <tr>

                          <td>
                            ${
                              index +
                              1
                            }
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.lotNo
                            )}
                          </td>

                          <td>
                            ${formatDate(
                              lot.date
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.challanNo ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.partyName ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.fabric ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.weight ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.receivedWeight ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              lot.dyeingRate ||
                                "-"
                            )}
                          </td>

                          <td>
                            ${escapeHtml(
                              calculateAmount(
                                lot.weight,
                                lot.dyeingRate
                              )
                            )}
                          </td>

                        </tr>
                      `
                    )
                    .join("");

                return `
                  <section class="batch-section">

                    <div class="batch-title">

                      <h2>
                        ${escapeHtml(
                          batch.batchName
                        )}
                      </h2>

                      <div class="batch-info">

                        <span>
                          <strong>
                            Party:
                          </strong>

                          ${escapeHtml(
                            batch.partyName
                          )}
                        </span>

                        <span>
                          <strong>
                            Created:
                          </strong>

                          ${formatDateTime(
                            batch.createdAt
                          )}
                        </span>

                        <span>
                          <strong>
                            Total Lots:
                          </strong>

                          ${lots.length}
                        </span>

                      </div>

                    </div>

                    <table>

                      <thead>

                        <tr>

                          <th>
                            S.No
                          </th>

                          <th>
                            Lot Number
                          </th>

                          <th>
                            Date
                          </th>

                          <th>
                            Challan Number
                          </th>

                          <th>
                            Party Name
                          </th>

                          <th>
                            Fabric Name
                          </th>

                          <th>
                            Weight
                          </th>

                          <th>
                            Received Weight
                          </th>

                          <th>
                            Dyeing Rate
                          </th>

                          <th>
                            Amount
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        ${rows}

                        <tr class="total">

                          <td colspan="6">
                            TOTAL
                          </td>

                          <td>
                            ${totalWeight.toFixed(
                              3
                            )}
                          </td>

                          <td>
                            ${totalReceived.toFixed(
                              3
                            )}
                          </td>

                          <td>
                            -
                          </td>

                          <td>
                            ₹${totalAmount.toFixed(
                              2
                            )}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </section>
                `;
              }
            )
            .join("");

        const printWindow =
          window.open(
            "",
            "_blank",
            "width=1200,height=800"
          );

        if (!printWindow) {
          Swal.fire(
            "Error",
            "Please allow popup for printing.",
            "error"
          );

          return;
        }

        printWindow.document.write(`
          <!DOCTYPE html>

          <html>

          <head>

            <title>
              Dyeing Batch Report
            </title>

            <style>

              @page {
                size: A4 landscape;
                margin: 7mm;
              }

              * {
                box-sizing: border-box;
              }

              body {
                font-family: Arial, sans-serif;
                color: #111;
                margin: 0;
                padding: 0;
              }

              .main-title {
                text-align: center;
                margin-bottom: 12px;
              }

              .main-title h1 {
                margin: 0 0 4px 0;
                font-size: 20px;
              }

              .main-title p {
                margin: 2px 0;
                font-size: 9px;
              }

              /*
               * IMPORTANT:
               *
               * No page-break-after.
               *
               * Batches will come one below another
               * until page space is available.
               */

              .batch-section {
                margin-bottom: 10px;
                break-inside: auto;
                page-break-inside: auto;
              }

              .batch-title {
                text-align: center;
                margin-bottom: 5px;
              }

              .batch-title h2 {
                margin: 0 0 4px 0;
                font-size: 14px;
              }

              .batch-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                font-size: 8px;
                margin-bottom: 5px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }

              th,
              td {
                border: 1px solid #777;
                padding: 3px 3px;
                font-size: 8px;
                text-align: center;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }

              th {
                background: #eeeeee;
                font-weight: bold;
              }

              .total {
                font-weight: bold;
                background: #eeeeee;
              }

              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              thead {
                display: table-header-group;
              }

              /*
               * Column widths
               */

              th:nth-child(1),
              td:nth-child(1) {
                width: 4%;
              }

              th:nth-child(2),
              td:nth-child(2) {
                width: 10%;
              }

              th:nth-child(3),
              td:nth-child(3) {
                width: 8%;
              }

              th:nth-child(4),
              td:nth-child(4) {
                width: 10%;
              }

              th:nth-child(5),
              td:nth-child(5) {
                width: 11%;
              }

              th:nth-child(6),
              td:nth-child(6) {
                width: 17%;
              }

              th:nth-child(7),
              td:nth-child(7) {
                width: 12%;
              }

              th:nth-child(8),
              td:nth-child(8) {
                width: 10%;
              }

              th:nth-child(9),
              td:nth-child(9) {
                width: 9%;
              }

              th:nth-child(10),
              td:nth-child(10) {
                width: 9%;
              }

              @media print {

                body {
                  margin: 0;
                }

                .batch-section {
                  margin-bottom: 8px;
                  break-inside: auto;
                  page-break-inside: auto;
                }

              }

            </style>

          </head>

          <body>

            <div class="main-title">

              <h1>
                DYEING BATCH REPORT
              </h1>

              <p>
                Total Batches:
                ${filteredBatches.length}
              </p>

              <p>
                Printed:
                ${new Date().toLocaleString(
                  "en-IN"
                )}
              </p>

            </div>

            ${sections}

            <script>

              window.onload =
                function() {

                  setTimeout(
                    function() {
                      window.print();
                    },
                    300
                  );

                  window.onafterprint =
                    function() {
                      window.close();
                    };

                };

            </script>

          </body>

          </html>
        `);

        printWindow.document.close();
      };

    // =======================================================
    // RETURN UI
    // =======================================================

    return (
      <Dashboard>

        <div className="min-h-screen bg-gray-50 p-4 md:p-6">

          <div className="max-w-[1600px] mx-auto">

            {/* =================================================
                HEADER
            ================================================== */}

            <div className="bg-white rounded-xl shadow-sm border p-5 mb-5">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                <div>

                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    Dyeing Batch Creation
                  </h1>

                  <p className="text-sm text-gray-500 mt-1">
                    Create batches from Dyeing Inward lots
                  </p>

                </div>

                <div className="flex flex-wrap gap-3">

                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-2 text-center">

                    <div className="text-xs text-blue-600">
                      Total Batches
                    </div>

                    <div className="text-xl font-bold text-blue-700">
                      {
                        batches.length
                      }
                    </div>

                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg px-5 py-2 text-center">

                    <div className="text-xs text-green-600">
                      Total Lots
                    </div>

                    <div className="text-xl font-bold text-green-700">
                      {
                        totalSavedLots
                      }
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={
                      handlePrintAll
                    }
                    disabled={
                      filteredBatches.length ===
                      0
                    }
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold"
                  >
                    🖨 Print All
                  </button>

                </div>

              </div>

            </div>

            {/* =================================================
                CREATE / EDIT FORM
            ================================================== */}

            <div className="bg-white rounded-xl shadow-sm border p-5 mb-5">

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

                <div>

                  <h2 className="text-lg font-bold text-gray-800">

                    {editingBatchId
                      ? "Edit Dyeing Batch"
                      : "Create New Batch"}

                  </h2>

                  {editingBatchId && (
                    <p className="text-sm text-yellow-600 mt-1">
                      Editing existing batch
                    </p>
                  )}

                </div>

                {editingBatchId && (
                  <button
                    type="button"
                    onClick={
                      resetForm
                    }
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                  >
                    Cancel Edit
                  </button>
                )}

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* PARTY */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Party{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <div className="flex gap-2">

                    <input
                      type="text"
                      value={
                        partyName
                      }
                      readOnly
                      onClick={() => {
                        setPartySearch(
                          ""
                        );
                        setShowPartyModal(
                          true
                        );
                      }}
                      placeholder={
                        loadingParties
                          ? "Loading parties..."
                          : "Select Party"
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 cursor-pointer bg-gray-50"
                    />

                    {partyName && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartyName(
                            ""
                          );

                          setSelectedLots(
                            []
                          );

                          setAvailableLots(
                            []
                          );
                        }}
                        className="px-4 rounded-lg bg-gray-200 hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    )}

                  </div>

                </div>

                {/* BATCH NAME */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Batch Name{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={
                      batchName
                    }
                    onChange={(e) =>
                      setBatchName(
                        e.target.value
                      )
                    }
                    placeholder="Enter batch name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />

                </div>

              </div>

              {/* LOT BUTTON */}

              <div className="mt-5 flex flex-wrap gap-3">

                <button
                  type="button"
                  disabled={
                    !partyName ||
                    loadingLots
                  }
                  onClick={async () => {
                    setLotSearch(
                      ""
                    );

                    await loadAvailableLots(
                      partyName,
                      editingBatchId
                    );

                    setShowLotModal(
                      true
                    );
                  }}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold"
                >
                  {loadingLots
                    ? "Loading Lots..."
                    : "Select Inward Lots"}
                </button>

                <button
                  type="button"
                  onClick={
                    resetForm
                  }
                  className="px-5 py-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
                >
                  Reset
                </button>

              </div>

              {/* =================================================
                  SELECTED LOTS
              ================================================== */}

              <div className="mt-6">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">

                  <div>

                    <h3 className="font-bold text-gray-800">
                      Selected Lots
                    </h3>

                    <p className="text-xs text-gray-500">
                      {
                        selectedLots.length
                      }{" "}
                      lot(s) selected
                    </p>

                  </div>

                  {selectedLots.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        clearSelectedLots
                      }
                      className="text-sm text-red-600 font-semibold"
                    >
                      Clear Selection
                    </button>
                  )}

                </div>

                <div className="border rounded-lg overflow-x-auto">

                  <table className="w-full text-sm">

                    <thead className="bg-gray-100">

                       <tr>

                         <th className="p-3 text-center">
                           S.No
                         </th>

                         <th className="p-3 text-left">
                           Lot Number
                         </th>

                         <th className="p-3 text-center">
                           Date
                         </th>

                         <th className="p-3 text-left">
                           Challan Number
                         </th>

                         <th className="p-3 text-left">
                           Party Name
                         </th>

                         <th className="p-3 text-left">
                           Fabric Name
                         </th>

                         <th className="p-3 text-right">
                           Weight
                         </th>

                         <th className="p-3 text-right">
                           Received Weight
                         </th>

                         <th className="p-3 text-right">
                           Dyeing Rate
                         </th>

                         <th className="p-3 text-right">
                           Amount
                         </th>

                         <th className="p-3 text-center">
                           Action
                         </th>

                       </tr>

                    </thead>

                    <tbody>

                      {selectedLots.length ===
                      0 ? (
                        <tr>

                          <td
                            colSpan={
                              11
                            }
                            className="p-10 text-center text-gray-500"
                          >
                            No lots selected.
                          </td>

                        </tr>
                      ) : (
                        selectedLots.map(
                          (
                            lot,
                            index
                          ) => (

                            <tr
                              key={
                                lot.uniqueKey
                              }
                              className="border-t hover:bg-gray-50"
                            >

                              <td className="p-3 text-center">
                                {
                                  index +
                                  1
                                }
                              </td>

                              <td className="p-3 font-bold text-blue-700">
                                {
                                  lot.lotNo
                                }
                              </td>

                              <td className="p-3">
                                {formatDate(
                                  lot.date
                                )}
                              </td>

                              <td className="p-3">
                                {
                                  lot.challanNo ||
                                  "-"
                                }
                              </td>

                              <td className="p-3">
                                {
                                  lot.partyName
                                }
                              </td>

                              <td className="p-3 font-medium">
                                {
                                  lot.fabric ||
                                  "-"
                                }
                              </td>

                              <td className="p-3 text-right font-semibold">
                                {
                                  lot.weight ||
                                  "-"
                                }
                              </td>

                              <td className="p-3 text-right font-semibold">
                                {
                                  lot.receivedWeight ||
                                  "-"
                                }
                              </td>

                              <td className="p-3">

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    lot.dyeingRate
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    updateSelectedLot(
                                      lot.uniqueKey,
                                      "dyeingRate",
                                      e.target.value
                                    )
                                  }
                                  className="w-28 border rounded-md px-2 py-1.5 text-right"
                                />

                              </td>

                              <td className="p-3">

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={
                                    calculateAmount(
                          lot.weight,
                          lot.dyeingRate
                        )
                                  }
                                  readOnly
                                  className="w-32 border rounded-md px-2 py-1.5 text-right"
                                />

                              </td>

                              <td className="p-3 text-center">

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedLots(
                                      (
                                        previous
                                      ) =>
                                        previous.filter(
                                          (
                                            item
                                          ) =>
                                            item.uniqueKey !==
                                            lot.uniqueKey
                                        )
                                    )
                                  }
                                  className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md font-medium"
                                >
                                  Remove
                                </button>

                              </td>

                            </tr>

                          )
                        )
                      )}

                    </tbody>

                    {selectedLots.length >
                      0 && (
                      <tfoot>

                        <tr className="bg-gray-100 font-bold">

                          <td
                            colSpan={
                              6
                            }
                            className="p-3 text-right"
                          >
                            TOTAL
                          </td>

                          <td className="p-3 text-right">
                            {selectedTotals.weight.toFixed(
                              3
                            )}
                          </td>

                          <td className="p-3 text-right">
                            {selectedTotals.receivedWeight.toFixed(
                              3
                            )}
                          </td>

                          <td className="p-3 text-right">
                            -
                          </td>

                          <td className="p-3 text-right">
                            ₹
                            {selectedTotals.amount.toFixed(
                              2
                            )}
                          </td>

                          <td></td>

                        </tr>

                      </tfoot>
                    )}

                  </table>

                </div>

                {/* SAVE BUTTON */}

                {selectedLots.length >
                  0 && (
                  <div className="flex justify-end mt-5">

                    <button
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={
                        handleSaveBatch
                      }
                      className="px-8 py-3 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold"
                    >
                      {saving
                        ? "Saving..."
                        : editingBatchId
                        ? "Update Batch"
                        : "Save Batch"}
                    </button>

                  </div>
                )}

              </div>

            </div>

            {/* =================================================
                SAVED BATCH LIST
            ================================================== */}

            <div className="bg-white rounded-xl shadow-sm border p-5">

              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">

                <div>

                  <h2 className="text-lg font-bold text-gray-800">
                    Saved Batch List
                  </h2>

                  <p className="text-sm text-gray-500">
                    {
                      filteredBatches.length
                    }{" "}
                    batch(es)
                  </p>

                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  <input
                    type="text"
                    value={
                      batchSearch
                    }
                    onChange={(e) =>
                      setBatchSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search batch / lot / fabric / party..."
                    className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={
                      handlePrintAll
                    }
                    disabled={
                      filteredBatches.length ===
                      0
                    }
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold whitespace-nowrap"
                  >
                    🖨 Print All
                  </button>

                </div>

              </div>

              {loadingBatches ? (

                <div className="text-center py-12 text-gray-500">
                  Loading batches...
                </div>

              ) : filteredBatches.length ===
                0 ? (

                <div className="text-center py-12 text-gray-500">

                  <div className="text-4xl mb-3">
                    📦
                  </div>

                  <p className="font-semibold">
                    No batches found.
                  </p>

                </div>

              ) : (

                <div className="space-y-6">

                  {filteredBatches.map(
                    (batch) => {

                      const lots =
                        batch.lots ||
                        [];

                      const totalWeight =
                        lots.reduce(
                          (
                            sum,
                            lot
                          ) =>
                            sum +
                            toNumber(
                              lot.weight
                            ),
                          0
                        );

                      const totalReceived =
                        lots.reduce(
                          (
                            sum,
                            lot
                          ) =>
                            sum +
                            toNumber(
                              lot.receivedWeight
                            ),
                          0
                        );

                      const totalAmount =
                        lots.reduce(
                          (
                            sum,
                            lot
                          ) =>
                            sum +
                            toNumber(
                              calculateAmount(
                          lot.weight,
                          lot.dyeingRate
                        )
                            ),
                          0
                        );

                      return (

                        <div
                          key={
                            batch.id
                          }
                          className="border rounded-xl overflow-hidden"
                        >

                          {/* BATCH HEADER */}

                          <div className="bg-gray-100 px-4 py-3">

                            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">

                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  <span className="text-lg font-bold text-gray-800">
                                    {
                                      batch.batchName
                                    }
                                  </span>

                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                                    {
                                      lots.length
                                    }{" "}
                                    Lots
                                  </span>

                                </div>

                                <div className="text-sm text-gray-600 mt-1">

                                  <b>
                                    Party:
                                  </b>{" "}
                                  {
                                    batch.partyName
                                  }

                                  <span className="mx-3">
                                    |
                                  </span>

                                  <b>
                                    Created:
                                  </b>{" "}
                                  {formatDateTime(
                                    batch.createdAt
                                  )}

                                </div>

                              </div>

                              <div className="flex flex-wrap gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditBatch(
                                      batch
                                    )
                                  }
                                  className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                                >
                                  ✏ Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePrintBatch(
                                      batch
                                    )
                                  }
                                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                >
                                  🖨 Print
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteBatch(
                                      batch
                                    )
                                  }
                                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
                                >
                                  🗑 Delete
                                </button>

                              </div>

                            </div>

                          </div>

                          {/* BATCH TABLE */}

                          <div className="overflow-x-auto">

                            <table className="w-full text-sm">

                              <thead className="bg-white">

                                 <tr>

                                   <th className="border-b p-3 text-center">
                                     S.No
                                   </th>

                                   <th className="border-b p-3 text-left">
                                     Lot Number
                                   </th>

                                   <th className="border-b p-3 text-left">
                                     Date
                                   </th>

                                   <th className="border-b p-3 text-left">
                                     Challan Number
                                   </th>

                                   <th className="border-b p-3 text-left">
                                     Party Name
                                   </th>

                                   <th className="border-b p-3 text-left">
                                     Fabric Name
                                   </th>

                                   <th className="border-b p-3 text-right">
                                     Weight
                                   </th>

                                   <th className="border-b p-3 text-right">
                                     Received Weight
                                   </th>

                                   <th className="border-b p-3 text-right">
                                     Dyeing Rate
                                   </th>

                                   <th className="border-b p-3 text-right">
                                     Amount
                                   </th>

                                 </tr>

                              </thead>

                              <tbody>

                                {lots.map(
                                  (
                                    lot,
                                    index
                                  ) => (

                                    <tr
                                      key={
                                        lot.id ||
                                        lot.uniqueKey
                                      }
                                      className="hover:bg-gray-50"
                                    >

                                      <td className="border-b p-3 text-center">
                                        {
                                          index +
                                          1
                                        }
                                      </td>

                                      <td className="border-b p-3 font-bold text-blue-700">
                                        {
                                          lot.lotNo
                                        }
                                      </td>

                                      <td className="border-b p-3">
                                        {formatDate(
                                          lot.date
                                        )}
                                      </td>

                                      <td className="border-b p-3">
                                        {
                                          lot.challanNo ||
                                          "-"
                                        }
                                      </td>

                                      <td className="border-b p-3">
                                        {
                                          lot.partyName
                                        }
                                      </td>

                                      <td className="border-b p-3 font-medium">
                                        {
                                          lot.fabric ||
                                          "-"
                                        }
                                      </td>

                                      <td className="border-b p-3 text-right font-semibold">
                                        {
                                          lot.weight ||
                                          "-"
                                        }
                                      </td>

                                      <td className="border-b p-3 text-right">
                                        {
                                          lot.receivedWeight ||
                                          "-"
                                        }
                                      </td>

                                      <td className="border-b p-3 text-right">
                                        {
                                          lot.dyeingRate ||
                                          "-"
                                        }
                                      </td>

                                      <td className="border-b p-3 text-right font-semibold">
                                        {`₹${calculateAmount(
                                          lot.weight,
                                          lot.dyeingRate
                                        )}`}
                                      </td>

                                    </tr>

                                  )
                                )}

                              </tbody>

                              <tfoot>

                                <tr className="bg-gray-100 font-bold">

                                  <td
                                    colSpan={
                                      6
                                    }
                                    className="p-3 text-right"
                                  >
                                    TOTAL
                                  </td>

                                  <td className="p-3 text-right">
                                    {totalWeight.toFixed(
                                      3
                                    )}
                                  </td>

                                  <td className="p-3 text-right">
                                    {totalReceived.toFixed(
                                      3
                                    )}
                                  </td>

                                  <td className="p-3 text-right">
                                    -
                                  </td>

                                  <td className="p-3 text-right">
                                    ₹
                                    {totalAmount.toFixed(
                                      2
                                    )}
                                  </td>

                                </tr>

                              </tfoot>

                            </table>

                          </div>

                        </div>

                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>

          {/* =================================================
              PARTY MODAL
          ================================================== */}

          {showPartyModal && (

            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

              <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">

                <div className="p-5 border-b flex items-center justify-between">

                  <div>

                    <h3 className="text-xl font-bold text-gray-800">
                      Select Party
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Select Dyeing Party
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPartyModal(
                        false
                      )
                    }
                    className="text-3xl text-gray-500 hover:text-gray-800"
                  >
                    ×
                  </button>

                </div>

                <div className="p-4 border-b">

                  <input
                    type="text"
                    value={
                      partySearch
                    }
                    onChange={(e) =>
                      setPartySearch(
                        e.target.value
                      )
                    }
                    placeholder="Search party..."
                    autoFocus
                    className="w-full border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                </div>

                <div className="overflow-auto p-4">

                  <table className="w-full text-sm">

                    <thead className="bg-gray-100 sticky top-0">

                      <tr>

                        <th className="border p-3 text-center">
                          S.No
                        </th>

                        <th className="border p-3 text-left">
                          Party Name
                        </th>

                        <th className="border p-3 text-left">
                          GST No
                        </th>

                        <th className="border p-3 text-center">
                          Action
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {filteredParties.length ===
                      0 ? (

                        <tr>

                          <td
                            colSpan={
                              4
                            }
                            className="p-10 text-center text-gray-500"
                          >
                            No parties found.
                          </td>

                        </tr>

                      ) : (

                        filteredParties.map(
                          (
                            party,
                            index
                          ) => (

                            <tr
                              key={
                                party.id
                              }
                              className="hover:bg-gray-50"
                            >

                              <td className="border p-3 text-center">
                                {party.serialNumber ||
                                  index +
                                    1}
                              </td>

                              <td className="border p-3 font-medium">
                                {getPartyName(
                                  party
                                )}
                              </td>

                              <td className="border p-3">
                                {
                                  party.gstNo ||
                                  "-"
                                }
                              </td>

                              <td className="border p-3 text-center">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePartySelect(
                                      party
                                    )
                                  }
                                  className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                                >
                                  Select
                                </button>

                              </td>

                            </tr>

                          )
                        )

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          )}

          {/* =================================================
              LOT MODAL
          ================================================== */}

          {showLotModal && (

            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

              <div className="bg-white rounded-xl shadow-xl w-full max-w-[1500px] max-h-[92vh] flex flex-col">

                {/* MODAL HEADER */}

                <div className="p-5 border-b">

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <h3 className="text-xl font-bold text-gray-800">
                        Select Dyeing Inward Lots
                      </h3>

                      <p className="text-sm text-gray-500 mt-1">
                        Party:{" "}
                        <span className="font-semibold text-blue-600">
                          {
                            partyName
                          }
                        </span>
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowLotModal(
                          false
                        )
                      }
                      className="text-3xl text-gray-500 hover:text-gray-800"
                    >
                      ×
                    </button>

                  </div>

                  <div className="flex flex-col md:flex-row gap-3 mt-4">

                    <input
                      type="text"
                      value={
                        lotSearch
                      }
                      onChange={(e) =>
                        setLotSearch(
                          e.target.value
                        )
                      }
                      placeholder="Search Lot Number / Fabric Name / Challan..."
                      autoFocus
                      className="flex-1 border rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                      type="button"
                      onClick={
                        selectAllFilteredLots
                      }
                      disabled={
                        filteredLots.length ===
                        0
                      }
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 font-semibold"
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearSelectedLots
                      }
                      disabled={
                        selectedLots.length ===
                        0
                      }
                      className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 font-semibold"
                    >
                      Clear
                    </button>

                  </div>

                  <div className="mt-3 flex gap-5 text-sm">

                    <span>
                      Available:{" "}
                      <b>
                        {
                          filteredLots.length
                        }
                      </b>
                    </span>

                    <span>
                      Selected:{" "}
                      <b className="text-blue-600">
                        {
                          selectedLots.length
                        }
                      </b>
                    </span>

                  </div>

                </div>

                {/* MODAL TABLE */}

                <div className="overflow-auto flex-1">

                  {filteredLots.length ===
                  0 ? (

                    <div className="text-center py-16 text-gray-500">

                      <div className="text-4xl mb-3">
                        🔍
                      </div>

                      <p className="font-semibold">
                        No available lots found.
                      </p>

                    </div>

                  ) : (

                    <table className="w-full text-sm">

                      <thead className="bg-gray-100 sticky top-0 z-10">

                         <tr>

                           <th className="p-3 text-center">
                             Select
                           </th>

                           <th className="p-3 text-center">
                             S.No
                           </th>

                           <th className="p-3 text-left">
                             Lot Number
                           </th>

                           <th className="p-3 text-center">
                             Date
                           </th>

                           <th className="p-3 text-left">
                             Challan Number
                           </th>

                           <th className="p-3 text-left">
                             Party Name
                           </th>

                           <th className="p-3 text-left">
                             Fabric Name
                           </th>

                           <th className="p-3 text-right">
                             Weight
                           </th>

                           <th className="p-3 text-right">
                             Received Weight
                           </th>

                           <th className="p-3 text-right">
                             Dyeing Rate
                           </th>

                           <th className="p-3 text-right">
                             Amount
                           </th>

                         </tr>

                      </thead>

                      <tbody>

                        {filteredLots.map(
                          (
                            lot,
                            index
                          ) => {

                            const selected =
                              isLotSelected(
                                lot.uniqueKey
                              );

                            return (

                              <tr
                                key={
                                  lot.uniqueKey
                                }
                                onClick={() =>
                                  toggleLot(
                                    lot
                                  )
                                }
                                className={`cursor-pointer border-b ${
                                  selected
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-50"
                                }`}
                              >

                                <td className="p-3 text-center">

                                  <input
                                    type="checkbox"
                                    checked={
                                      selected
                                    }
                                    onChange={() =>
                                      toggleLot(
                                        lot
                                      )
                                    }
                                    onClick={(
                                      event
                                    ) =>
                                      event.stopPropagation()
                                    }
                                    className="w-4 h-4"
                                  />

                                </td>

                                <td className="p-3 text-center">
                                  {
                                    index +
                                    1
                                  }
                                </td>

                                <td className="p-3 font-bold text-blue-700">
                                  {
                                    lot.lotNo
                                  }
                                </td>

                                <td className="p-3 text-center">
                                  {formatDate(
                                    lot.date
                                  )}
                                </td>

                                <td className="p-3">
                                  {
                                    lot.challanNo ||
                                    "-"
                                  }
                                </td>

                                <td className="p-3">
                                  {
                                    lot.partyName
                                  }
                                </td>

                                <td className="p-3 font-medium">
                                  {
                                    lot.fabric ||
                                    "-"
                                  }
                                </td>

                                <td className="p-3 text-right font-semibold">
                                  {
                                    lot.weight ||
                                    "-"
                                  }
                                </td>

                                <td className="p-3 text-right font-semibold">
                                  {
                                    lot.receivedWeight ||
                                    "-"
                                  }
                                </td>

                                <td className="p-3 text-right">
                                  {
                                    lot.dyeingRate ||
                                    "-"
                                  }
                                </td>

                                <td className="p-3 text-right">
                                  {`₹${calculateAmount(
                                    lot.weight,
                                    lot.dyeingRate
                                  )}`}
                                </td>

                              </tr>

                            );
                          }
                        )}

                      </tbody>

                    </table>

                  )}

                </div>

                {/* MODAL FOOTER */}

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setShowLotModal(
                        false
                      )
                    }
                    className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShowLotModal(
                        false
                      )
                    }
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    Add Selected Lots
                    {selectedLots.length >
                      0 &&
                      ` (${selectedLots.length})`}
                  </button>

                </div>

              </div>

            </div>

          )}

        </div>

      </Dashboard>
    );
  };

export default DyeingBatchCreation;
