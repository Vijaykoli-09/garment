import React from "react";


interface PurchaseNavigatorProps {
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

const PurchaseNavigator: React.FC<PurchaseNavigatorProps> = ({ onNavigate }) => {
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
                Purchase Order Item
            </button>
            <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/purchase/entry-item")}>
                Purchase Entry Item
            </button>
            <button
                style={sidebarSubItemStyle}
                onClick={() => onNavigate?.("/purchase/pending-order-item")}>
                Purchase Pending Order
            </button>
            <button
                style={sidebarSubItemStyle}
                onClick={() => onNavigate?.("/purchase/return-item")}>
                Purchase Return
            </button>
        </div>
    );
};

export default PurchaseNavigator;