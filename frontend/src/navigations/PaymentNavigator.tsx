import React from "react";

interface PaymentNavigatorProps {
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

const PaymentNavigator: React.FC<PaymentNavigatorProps> = ({ onNavigate }) => {
    return (
        <div
            style={{
                marginLeft: "20px",
                marginTop: "5px",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/payment/payment")}>
                Payment
            </button>
            <button style={sidebarSubItemStyle} onClick={() => onNavigate?.("/payment/recipt")}>
                Recipt
            </button>
            <button
                style={sidebarSubItemStyle}
                onClick={() => onNavigate?.("/payment/payment-mode")}>
                Payment Mode
            </button>
        </div>
    );
};

export default PaymentNavigator;