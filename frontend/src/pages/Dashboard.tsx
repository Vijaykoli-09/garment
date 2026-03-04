// src/pages/Dashboard.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  HomeIcon,
  CreditCardIcon,
} from "@heroicons/react/24/solid";
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useLocation, useNavigate } from "react-router-dom";
import MasterNavigator from "../navigations/MasterNavigator";
import KnittingNavigator from "../navigations/KnittingNavigator";
import ReportsNavigator from "../navigations/ReportsNavigator";
import CuttingNavigator from "../navigations/CuttingNavigator";
import PaymentNavigator from "../navigations/PaymentNavigator";
import SalesNavigator from "../navigations/SalesNavigator";
import AdministrationNavigator from "../navigations/AdministrationNavigator";

interface DashboardProps {
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ children }) => {
  const [openMaster, setOpenMaster] = useState(false);
  const [openKnitting, setOpenKnitting] = useState(false);
  const [openReport, setOpenReport] = useState(false);

  const [openCutting, setOpenCutting] = useState(false);
  const [openPayments, setOpenPayments] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [companyName] = useState<string>("Shri Uday Garments");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [openSales, setOpenSales] = useState(false);
  const [openAdministration, setOpenAdministration] = useState(false);
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "User" };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // dropdown outside click close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // auto open sections based on path
  useEffect(() => {
    if (location.pathname.startsWith("/master")) setOpenMaster(true);
    if (location.pathname.startsWith("/reports")) setOpenReport(true);
    const p = location.pathname;
    if (p.startsWith("/knitting") && !p.startsWith("/knitting/cutting"))
      setOpenKnitting(true);
    if (p.startsWith("/knitting/cutting") || p.startsWith("/cutting"))
      setOpenCutting(true);
  }, [location.pathname]);

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith("/sales")) setOpenSales(true);
  }, [location.pathname]);

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith("/administration")) setOpenAdministration(true);
  }, [location.pathname]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        backgroundImage: "url('/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "flex",
          height: "100%",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: "220px",
            backgroundColor: "rgba(31,41,55,0.95)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "2rem",
            }}
          >
            Dashboard
          </h2>

          {/* MASTER */}
          <button
            style={buttonStyle}
            onClick={() => setOpenMaster(!openMaster)}
          >
            <HomeIcon style={iconStyle} /> Master
            <span style={{ marginLeft: "auto" }}>
              {openMaster ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openMaster && (
            <MasterNavigator onNavigate={(p: string) => navigate(p)} />
          )}

          {/* KNITTING */}
          <button
            style={buttonStyle}
            onClick={() => setOpenKnitting(!openKnitting)}
          >
            <HomeIcon style={iconStyle} /> Knitting
            <span style={{ marginLeft: "auto" }}>
              {openKnitting ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openKnitting && (
            <KnittingNavigator onNavigate={(p: string) => navigate(p)} />
          )}

          {/* CUTTING */}
          <button
            style={buttonStyle}
            onClick={() => setOpenCutting(!openCutting)}
          >
            <HomeIcon style={iconStyle} /> Cutting
            <span style={{ marginLeft: "auto" }}>
              {openCutting ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openCutting && (
            <CuttingNavigator onNavigate={(p: string) => navigate(p)} />
          )}

          {/* PRODUCTION */}
          <button
            style={buttonStyle}
            onClick={() => navigate("/production/receipt")}
          >
            <HomeIcon style={iconStyle} /> Production
          </button>

          

          {/* REPORTS */}
          <button
            style={buttonStyle}
            onClick={() => setOpenReport(!openReport)}
          >
            <DocumentTextIcon style={iconStyle} /> Reports
            <span style={{ marginLeft: "auto" }}>
              {openReport ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openReport && (
            <ReportsNavigator onNavigate={(p: string) => navigate(p)} />
          )}

          {/* Sales */}
          <button style={buttonStyle} onClick={() => setOpenSales(!openSales)}>
            <HomeIcon style={iconStyle} /> Sales
            <span style={{ marginLeft: "auto" }}>
              {openSales ? (
                <ChevronUpIcon style={{ width: 16, height: 16 }} />
              ) : (
                <ChevronDownIcon style={{ width: 16, height: 16 }} />
              )}
            </span>
          </button>
          {openSales && (
            <SalesNavigator onNavigate={(path) => navigate(path)} />
          )}

          {/* Payments Button */}
          <button
            style={buttonStyle}
            onClick={() => setOpenPayments(!openPayments)}
          >
            <CreditCardIcon style={iconStyle} /> Payments
            <span style={{ marginLeft: "auto" }}>
              {openPayments ? (
                <ChevronUpIcon style={{ width: "16px", height: "16px" }} />
              ) : (
                <ChevronDownIcon style={{ width: "16px", height: "16px" }} />
              )}
            </span>
          </button>
          {openPayments && (
            <PaymentNavigator onNavigate={(path) => navigate(path)} />
          )}
           {/* Administration */}
          <button style={buttonStyle} onClick={() => setOpenAdministration(!openAdministration)}>
            <AdminPanelSettingsIcon style={iconStyle} /> Administration
            <span style={{ marginLeft: "auto" }}>
              {openAdministration ? (
                <ChevronUpIcon style={{ width: 16, height: 16 }} />
              ) : (
                <ChevronDownIcon style={{ width: 16, height: 16 }} />
              )}
            </span>
          </button>
          {openAdministration && (
            <AdministrationNavigator onNavigate={(path) => navigate(path)} />
          )}


          {/* Customer Requests */}
<button
  style={buttonStyle}
  onClick={() => navigate("/app/CustomerRequests")}
>
  <HomeIcon style={iconStyle} /> Customer Requests
</button>

{/* Add Product */}
<button
  style={buttonStyle}
  onClick={() => navigate("/app/AddProduct")}
>
  <HomeIcon style={iconStyle} /> Add Product
</button>

{/* View Sales */}
<button
  style={buttonStyle}
  onClick={() => navigate("/app/ViewSales")}
>
  <HomeIcon style={iconStyle} /> View Sales
</button>




        </div>

        {/* Right side */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <div
            style={{
              height: "60px",
              backgroundColor: "rgba(243,244,246,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              boxShadow: "0px 1px 4px rgba(0,0,0,0.1)",
              position: "relative",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "1.1rem",
                color: "#111827",
              }}
            >
              {companyName}
            </div>

            {/* User dropdown */}
            <div
              ref={dropdownRef}
              style={{
                display: "flex",
                alignItems: "center",
                position: "relative",
              }}
            >
              <UserCircleIcon
                style={{
                  width: "30px",
                  height: "30px",
                  color: "#374151",
                  cursor: "pointer",
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              />
              <span
                style={{
                  marginLeft: "10px",
                  fontWeight: "bold",
                  color: "#111827",
                  cursor: "pointer",
                }}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {user.name}
              </span>

              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "50px",
                    right: "0",
                    backgroundColor: "white",
                    boxShadow: "0px 2px 8px rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    zIndex: 100,
                    minWidth: "150px",
                  }}
                >
                  <button
                    style={dropdownItemStyle}
                    onClick={() => navigate("/profile")}
                  >
                    Profile
                  </button>
                  <button style={dropdownItemStyle} onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, padding: "20px" }}>{children}</div>
        </div>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  backgroundColor: "transparent",
  border: "none",
  color: "white",
  padding: "10px 0",
  fontSize: "1rem",
  cursor: "pointer",
  marginBottom: "5px",
};

const iconStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  marginRight: "10px",
};

const chevronStyle: React.CSSProperties = { width: "16px", height: "16px" };

const dropdownItemStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 15px",
  background: "white",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontSize: "0.95rem",
};

export default Dashboard;
