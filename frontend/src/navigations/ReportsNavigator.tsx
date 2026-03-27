// src/navigations/ReportsNavigator.tsx
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";

interface ReportsNavigatorProps {
  onNavigate?: (path: string) => void;
}

const sidebarNestedItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "white",
  padding: "8px 0",
  fontSize: "0.9rem",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  paddingLeft: "20px",
};

const iconSmallStyle: React.CSSProperties = {
  width: "14px",
  height: "14px",
};

const ReportsNavigator: React.FC<ReportsNavigatorProps> = ({ onNavigate }) => {
  const [reportOpen, setReportOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);

  const reportList = [
    { key: "art-report", label: "Art Stock Report", path: "/reports/art-report" },
    { key: "salary-report", label: "Salary Report", path: "/reports/salary-report" },
    { key: "dispatch-report", label: "Dispatch Report", path: "/reports/dispatch-report" },
    { key: "job-work-report", label: "Job Work Report", path: "/reports/job-work-report" },
    { key: "rate-list-report", label: "Rate List Report", path: "/reports/rate-list-report" },
    { key: "account-report", label: "Account Report", path: "/reports/account-report" },
    { key: "paymentMod-report", label: "PaymentMod Report", path: "/reports/paymentmod-report" },
  ];

  const adjustmentList = [
    { key: "stock-adjustment", label: "Stock Adjustment", path: "/reports/stock-adjustment" },
    
  ];

  return (
    <div style={{ marginLeft: "15px", display: "flex", flexDirection: "column" }}>
      
      {/* REPORT SUBMENU */}
      <button
        style={sidebarNestedItemStyle}
        onClick={() => setReportOpen(!reportOpen)}
      >
        Report
        <span style={{ marginLeft: "auto" }}>
          {reportOpen ? <ChevronUpIcon style={iconSmallStyle} /> : <ChevronDownIcon style={iconSmallStyle} />}
        </span>
      </button>

      {reportOpen &&
        reportList.map((item) => (
          <button
            key={item.key}
            style={{ ...sidebarNestedItemStyle, paddingLeft: "35px" }}
            onClick={() => onNavigate?.(item.path)}
          >
            {item.label}
          </button>
        ))}

      {/* ADJUSTMENT SUBMENU */}
      <button
        style={sidebarNestedItemStyle}
        onClick={() => setAdjustmentOpen(!adjustmentOpen)}
      >
        Adjustment
        <span style={{ marginLeft: "auto" }}>
          {adjustmentOpen ? <ChevronUpIcon style={iconSmallStyle} /> : <ChevronDownIcon style={iconSmallStyle} />}
        </span>
      </button>

      {adjustmentOpen &&
        adjustmentList.map((item) => (
          <button
            key={item.key}
            style={{ ...sidebarNestedItemStyle, paddingLeft: "35px" }}
            onClick={() => onNavigate?.(item.path)}
          >
            {item.label}
          </button>
        ))}
    </div>
  );
};

export default ReportsNavigator;