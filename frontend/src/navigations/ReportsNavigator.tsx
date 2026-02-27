// src/navigations/ReportsNavigator.tsx
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";

interface ReportsNavigatorProps {
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
  fontSize: "0.88rem",
  paddingLeft: "18px",
};

const iconSmallStyle: React.CSSProperties = { width: "14px", height: "14px" };

const ReportsNavigator: React.FC<ReportsNavigatorProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen((prev) => !prev);

  const reports = [
    {
      key: "art-report",
      label: "Art Stock Report",
      path: "/reports/art-report",
    },
    {
      key: "salary-report",
      label: "Salary Report",
      path: "/reports/salary-report",
    },
    {
      key: "dispatch-report",
      label: "Dispatch Report",
      path: "/reports/dispatch-report",
    },
    {
      key: "job-work-report",
      label: "Job Work Report",
      path: "/reports/job-work-report",
    },
    {
      key: "Rate List report",
      label: "Rate List Report",
      path: "/reports/rate-list-report",
    },
  ];

  return (
    <div
      style={{
        marginLeft: "20px",
        marginTop: "5px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button style={sidebarSubItemStyle} onClick={toggle}>
        Reports
        <span style={{ marginLeft: "auto" }}>
          {open ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>

      {open &&
        reports.map((item) => (
          <button
            key={item.key}
            style={sidebarNestedItemStyle}
            onClick={() => onNavigate?.(item.path)}
          >
            {item.label}
          </button>
        ))}
    </div>
  );
};

export default ReportsNavigator;
