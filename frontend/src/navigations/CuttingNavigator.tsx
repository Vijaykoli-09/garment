import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import React, { useState } from "react";

interface CuttingNavigatorProps {
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

const iconSmallStyle: React.CSSProperties = { width: "14px", height: "14px" };

const CuttingNavigator: React.FC<CuttingNavigatorProps> = ({ onNavigate }) => {
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
      {/* Cutting Entry */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("cutting")}>
        Cutting
        <span style={{ marginLeft: "auto" }}>
          {open["cutting"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>
      {open["cutting"] && (
        <div style={{ marginLeft: "15px" }}>
          {["Cutting Module"].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/cutting/${sub.toLowerCase().replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Job Work */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("job_work")}>
        Job Work
        <span style={{ marginLeft: "auto" }}>
          {open["job_work"] ? (
            <ChevronUpIcon style={iconSmallStyle} />
          ) : (
            <ChevronDownIcon style={iconSmallStyle} />
          )}
        </span>
      </button>
      {open["job_work"] && (
        <div style={{ marginLeft: "15px" }}>
          {["Outward Challan", "Inward Challan"].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(
                  `/job_work/${sub.toLowerCase().replace(/\s+/g, "-")}`
                )
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CuttingNavigator;
