import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { useLocation } from "react-router-dom";

export interface SalesNavigatorProps {
  onNavigate?: (path: string) => void;
}

const base: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "white",
  padding: "8px 0",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

const level1: React.CSSProperties = {
  ...base,
  fontSize: "0.9rem",
  paddingLeft: "20px",
};

const level2: React.CSSProperties = {
  ...base,
  fontSize: "0.8rem",
  paddingLeft: "35px",
};

const iconStyle = { width: 14, height: 14 };

const SalesNavigator: React.FC<SalesNavigatorProps> = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<{ [key: string]: boolean }>({});

  const toggle = (key: string) =>
    setOpen((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div>
      {/* SALE */}
      <button style={level1} onClick={() => toggle("sale")}>
        Sale
        <span style={{ marginLeft: "auto" }}>
          {open.sale ? (
            <ChevronUpIcon style={iconStyle} />
          ) : (
            <ChevronDownIcon style={iconStyle} />
          )}
        </span>
      </button>

      {open.sale &&
        [
          { label: "Sales Order", path: "/sales/sales-order" },
          {
            label: "Sale Order Wise Pendency",
            path: "/sales/sale-order-pendency",
          },
          { label: "Sale Order Settle", path: "/sales/sale-order-settle" },
          { label: "Sale Order Return", path: "/sales/sale-order-return" },
        ].map((it) => {
          const active = pathname.startsWith(it.path);
          return (
            <button
              key={it.path}
              style={{
                ...level2,
                backgroundColor: active
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
                fontWeight: active ? 600 : 400,
              }}
              onClick={() => onNavigate?.(it.path)}
            >
              {it.label}
            </button>
          );
        })}

      {/* SALE CHALLAN */}
      <button style={level1} onClick={() => toggle("saleChallan")}>
        Sale Challan
        <span style={{ marginLeft: "auto" }}>
          {open.saleChallan ? (
            <ChevronUpIcon style={iconStyle} />
          ) : (
            <ChevronDownIcon style={iconStyle} />
          )}
        </span>
      </button>

      {open.saleChallan &&
        [
          { label: "Dispatch Challan", path: "/sales/dispatch-challan" },
          {
            label: "Other Dispatch Challan",
            path: "/sales/other-dispatch-challan",
          },
        ].map((it) => (
          <button
            key={it.path}
            style={level2}
            onClick={() => onNavigate?.(it.path)}
          >
            {it.label}
          </button>
        ))}
    </div>
  );
};

export default SalesNavigator;
