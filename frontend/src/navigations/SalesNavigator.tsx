import React from "react";
import { useLocation } from "react-router-dom";

export interface SalesNavigatorProps {
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

const SalesNavigator: React.FC<SalesNavigatorProps> = ({ onNavigate }) => {
  const { pathname } = useLocation();

  const items = [
    { label: "Sales Order", path: "/sales/sales-order" },
    { label: "Sale Order Wise Pendency", path: "/sales/sale-order-pendency" },
    { label: "Sale Order Settle", path: "/sales/sale-order-settle"},
    { label: "Sale Order Return", path: "/sales/sale-order-return" },
    // future:
    // { label: "Sales Dispatch", path: "/sales/dispatch" },
    // { label: "Sales Invoice", path: "/sales/invoice" },
  ];

  return (
    <div style={{ marginLeft: "20px", marginTop: "5px", display: "flex", flexDirection: "column" }}>
      {items.map((it) => {
        const active = pathname.toLowerCase().startsWith(it.path.toLowerCase());
        return (
          <button
            key={it.path}
            style={{
              ...sidebarNestedItemStyle,
              backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent",
              fontWeight: active ? 600 as any : 400,
            }}
            onClick={() => onNavigate?.(it.path)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
};

export default SalesNavigator;