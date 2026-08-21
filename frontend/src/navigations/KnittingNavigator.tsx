import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";

interface KnittingNavigatorProps {
  onNavigate?: (path: string) => void;
}

const sidebarSubItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "white",
  padding: "8px 0",
  fontSize: "0.95rem",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const sidebarNestedItemStyle: React.CSSProperties = {
  ...sidebarSubItemStyle,
  fontSize: "0.85rem",
  paddingLeft: "15px",
};

const iconSmallStyle: React.CSSProperties = {
  width: "14px",
  height: "14px",
};

const KnittingNavigator: React.FC<KnittingNavigatorProps> = ({
  onNavigate,
}) => {
  const [open, setOpen] = useState<{ [key: string]: boolean }>({});

  const toggle = (key: string) => {
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      style={{
        marginLeft: "20px",
        marginTop: "5px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Purchase Entry */}
      <button
        style={sidebarSubItemStyle}
        onClick={() => toggle("purchase-entry")}
      >
        Purchase Entry
        <span style={{ marginLeft: "auto" }}>
          {open["purchase-entry"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["purchase-entry"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Purchase Order",
            "Purchase Entry",
            "Purchase Pending Orders",
            "Purchase Return",
          ].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/knitting/${sub.toLowerCase().replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Knitting */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("knitting")}>
        Knitting
        <span style={{ marginLeft: "auto" }}>
          {open["knitting"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["knitting"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Outward Challan",
            "Inward Challan",
            "Material Return",
            "Stock Statement",
            "Amount Statement",
          ].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/knitting/challan/${sub
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Dyeing */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("dyeing")}>
        Dyeing
        <span style={{ marginLeft: "auto" }}>
          {open["dyeing"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["dyeing"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Outward Challan",
            "Inward Challan",
            "Material Return",
            "Item Wise Outstanding",
            "Dyeing Amount Statement",
            "Stock Statement",
          ].map((sub, i) => {
            const path =
              sub === "Material Return"
                ? "/knitting/dyeing/material-return"
                : `/knitting/dyeing/${sub
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`;

            return (
              <button
                key={i}
                style={sidebarNestedItemStyle}
                onClick={() => onNavigate?.(path)}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* Finishing */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("finishing")}>
        Finishing
        <span style={{ marginLeft: "auto" }}>
          {open["finishing"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["finishing"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Outward Challan",
            "Inward Challan",
            "Finishing Stock Statement",
            "Finishing Amount Statement",
            "In House Stock Statement",
          ].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/knitting/finishing/${sub
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Knitting Reports */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("reports")}>
        Knitting Reports
        <span style={{ marginLeft: "auto" }}>
          {open["reports"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["reports"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Party Lot Wise",
            "Fabricator Wise Report",
            "Part Item Wise Statement",
          ].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/knitting/reports/${sub
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Purchase Reports */}
      <button
        style={sidebarSubItemStyle}
        onClick={() => toggle("purchase-reports")}
      >
        Purchase Reports
        <span style={{ marginLeft: "auto" }}>
          {open["purchase-reports"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["purchase-reports"] && (
        <div style={{ marginLeft: "15px" }}>
          {["Material Stock Report", "Amount Report"].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/knitting/purchase-reports/${sub
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Packing */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("packing")}>
        Packing
        <span style={{ marginLeft: "auto" }}>
          {open["packing"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open["packing"] && (
        <div style={{ marginLeft: "15px" }}>
          <button
            style={sidebarNestedItemStyle}
            onClick={() =>
              onNavigate?.("/knitting/packing/packing-challan")
            }
          >
            Packing Challan
          </button>
        </div>
      )}
    </div>
  );
};

export default KnittingNavigator;
