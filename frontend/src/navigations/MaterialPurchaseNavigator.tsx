import React from "react";

interface MaterialPurchaseNavigatorProps {
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

const MaterialPurchaseNavigator: React.FC<MaterialPurchaseNavigatorProps> = ({ onNavigate }) => {
    return (
        <div
            style={{
                marginLeft: "20px",
                marginTop: "5px",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/purchase/order-item")}>
                Material Purchase Order
            </button>
            <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/purchase/entry-item")}>
                Material Purchase Entry
            </button>
            <button
                style={sidebarSubItemStyle}
                onClick={() => onNavigate?.("/purchase/pending-order-item")}>
                Material Purcahse Pending
            </button>
             <button
                style={sidebarSubItemStyle}
                onClick={() => onNavigate?.("/purchase/return-item")}>
                Material Purcahse Return
            </button>
        </div>
    );
};

export default MaterialPurchaseNavigator;