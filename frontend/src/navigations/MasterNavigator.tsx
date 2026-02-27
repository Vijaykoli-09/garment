// src/pages/MasterNavigator.tsx
import React, { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

interface MasterNavigatorProps {
  onNavigate?: (path: string) => void;
}

const MasterNavigator: React.FC<MasterNavigatorProps> = ({ onNavigate }) => {
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
      {/* Simple menus */}
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/company")}>
        Company Details
      </button>
     
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/party")}>
        Party Creation
      </button>

      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/order_register")}>
        Order Register
      </button>

      {/* Art & Groups Submenu */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("artGroups")}>
        Art Creation
        <span style={{ marginLeft: "auto" }}>
          {open["artGroups"] ? <ChevronUpIcon style={iconSmallStyle} /> : <ChevronDownIcon style={iconSmallStyle} />}
        </span>
      </button>
      {open["artGroups"] && (
        <div style={{ marginLeft: "15px" }}>
          {[
            "Art Group Creation",
            "Art Creation",
            "Range Creation",
            "Shade Creation",
            "Accessories Creation"

          ].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(`/master/art/${sub.toLowerCase().replace(/\s+/g, "-")}`)
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}
       <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/size")}>
        Size Creation
      </button>


      {/* Items Submenu */}
      

      {/* <button style={sidebarSubItemStyle} onClick={() => toggle("items")}>
        Raw Creation
        <span style={{ marginLeft: "auto" }}>
          {open["items"] ? <ChevronUpIcon style={iconSmallStyle} /> : <ChevronDownIcon style={iconSmallStyle} />}
        </span>
      </button> */}
      {open["items"] && (
        <div style={{ marginLeft: "15px" }}>
          {[ "Yarn Creation", "Finish Fabric Creation"].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() => onNavigate?.(`/master/raw/${sub.toLowerCase().replace(/\s+/g, "-")}`)}
            >
              {sub}
            </button>
          ))}
        </div>
      )} 
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/grade")}>
        Customer Grade
      </button>
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/category")}>
        Category Creation
      </button>
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/process")}>
        Process Creation
      </button>

      
      {/* Other clickable menus */}
      
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/employee")}>
        Employee Creation
      </button>
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/agent")}>
        Agent Creation
      </button>

      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/transport")}>
        Transport Creation 
      </button>
      

      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/yarn-creation")}>
        Yarn Creation
      </button>

      {/* Item(Material) Creation Submenu */}
      <button style={sidebarSubItemStyle} onClick={() => toggle("item")}>
        Item Creation
        <span style={{ marginLeft: "auto" }}>
          {open["item"] ? <ChevronUpIcon style={iconSmallStyle} /> : <ChevronDownIcon style={iconSmallStyle} />}
        </span>
      </button>
      {open["item"] && (
        <div style={{ marginLeft: "15px" }}>
          {["Item group", "Item Creation"].map((sub, i) => (
            <button
              key={i}
              style={sidebarNestedItemStyle}
              onClick={() =>
                onNavigate?.(`/master/material/${sub.toLowerCase().replace(/\s+/g, "-")}`)
              }
            >
              {sub}
            </button>
          ))}
        </div>
      )}
<button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/fabrication")}>
        Fabrication Creation
      </button>
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/location")}>
        Location Creation
      </button>
      <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/narration")}>
        
      </button>
      {/* <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/parameter")}>
        Parameter Master
      </button>
      {/* <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/master/location")}>
        Location Creation
      </button> */} 
    </div>
  );
};

// Styles
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

export default MasterNavigator;
