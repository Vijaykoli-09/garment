import React, { useEffect, useRef, useState } from "react";
import {
  UserCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  HomeIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  PresentationChartBarIcon,
  ScissorsIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useLocation, useNavigate } from "react-router-dom";

import MasterNavigator from "../navigations/MasterNavigator";
import KnittingNavigator from "../navigations/KnittingNavigator";
import ReportsNavigator from "../navigations/ReportsNavigator";
import CuttingNavigator from "../navigations/CuttingNavigator";
import PaymentNavigator from "../navigations/PaymentNavigator";
import SalesNavigator from "../navigations/SalesNavigator";
import AdministrationNavigator from "../navigations/AdministrationNavigator";
import MaterialPurchaseNavigator from "../navigations/MaterialPurchaseNavigator";

// ✅ use notifications from single file
import { useNotifications, timeAgo } from "./Notifications"; // adjust path if needed

interface DashboardProps {
  children?: React.ReactNode;
}

const Dashboard: React.FC<DashboardProps> = ({ children }) => {
  const [openMaster, setOpenMaster] = useState(false);
  const [openKnitting, setOpenKnitting] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [openCutting, setOpenCutting] = useState(false);
  const [openPayments, setOpenPayments] = useState(false);
  const [openSales, setOpenSales] = useState(false);
  const [openMaterialPurchase, setOpenMaterialPurchase] = useState(false);
  const [openAdministration, setOpenAdministration] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const [companyName] = useState<string>("Shri Uday Garments");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "User" };

  // ✅ real notifications
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    refresh,
    removeNotification, // ✅ remove per notification
  } = useNotifications();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith("/master")) setOpenMaster(true);
    if (p.startsWith("/reports")) setOpenReport(true);

    if (p.startsWith("/knitting") && !p.startsWith("/knitting/cutting")) setOpenKnitting(true);
    if (p.startsWith("/knitting/cutting") || p.startsWith("/cutting")) setOpenCutting(true);

    if (p.startsWith("/sales")) setOpenSales(true);
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
          overflow: "hidden",
        }}
      >
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div
          style={{
            width: "220px",
            minWidth: "220px",
            flexShrink: 0,
            backgroundColor: "rgba(31,41,55,0.95)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            overflowY: "auto",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "2rem" }}>
            Dashboard
          </h2>

          {/* MASTER */}
          <button style={buttonStyle} onClick={() => setOpenMaster(!openMaster)}>
            <HomeIcon style={iconStyle} /> Master
            <span style={{ marginLeft: "auto" }}>
              {openMaster ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openMaster && <MasterNavigator onNavigate={(p: string) => navigate(p)} />}

          {/* KNITTING */}
          <button style={buttonStyle} onClick={() => setOpenKnitting(!openKnitting)}>
            <WrenchScrewdriverIcon style={iconStyle} /> Knitting
            <span style={{ marginLeft: "auto" }}>
              {openKnitting ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openKnitting && <KnittingNavigator onNavigate={(p: string) => navigate(p)} />}

          {/* CUTTING */}
          <button style={buttonStyle} onClick={() => setOpenCutting(!openCutting)}>
            <ScissorsIcon style={iconStyle} /> Cutting
            <span style={{ marginLeft: "auto" }}>
              {openCutting ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openCutting && <CuttingNavigator onNavigate={(p: string) => navigate(p)} />}

          {/* PRODUCTION */}
          <button style={buttonStyle} onClick={() => navigate("/production/receipt")}>
            <CubeIcon style={iconStyle} /> Production
          </button>

          {/* REPORTS */}
          <button style={buttonStyle} onClick={() => setOpenReport(!openReport)}>
            <DocumentTextIcon style={iconStyle} /> Reports
            <span style={{ marginLeft: "auto" }}>
              {openReport ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openReport && <ReportsNavigator onNavigate={(p: string) => navigate(p)} />}

          {/* SALES */}
          <button style={buttonStyle} onClick={() => setOpenSales(!openSales)}>
            <PresentationChartBarIcon style={iconStyle} /> Sales
            <span style={{ marginLeft: "auto" }}>
              {openSales ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openSales && <SalesNavigator onNavigate={(path) => navigate(path)} />}

          {/* PAYMENTS */}
          <button style={buttonStyle} onClick={() => setOpenPayments(!openPayments)}>
            <CreditCardIcon style={iconStyle} /> Payments
            <span style={{ marginLeft: "auto" }}>
              {openPayments ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openPayments && <PaymentNavigator onNavigate={(path) => navigate(path)} />}

          {/* Material Purchase */}
          <button
            style={buttonStyle}
            onClick={() => setOpenMaterialPurchase(!openMaterialPurchase)}
          >
            <ShoppingCartIcon style={iconStyle} /> Material Purchase
            <span style={{ marginLeft: "auto" }}>
              {openMaterialPurchase ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openMaterialPurchase && (
            <MaterialPurchaseNavigator onNavigate={(path) => navigate(path)} />
          )}

          {/* ADMINISTRATION */}
          <button
            style={buttonStyle}
            onClick={() => setOpenAdministration(!openAdministration)}
          >
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <AdminPanelSettingsIcon sx={{ fontSize: 20, mr: 1.25 }} />
            </span>
            Administration
            <span style={{ marginLeft: "auto" }}>
              {openAdministration ? (
                <ChevronUpIcon style={chevronStyle} />
              ) : (
                <ChevronDownIcon style={chevronStyle} />
              )}
            </span>
          </button>
          {openAdministration && (
            <AdministrationNavigator onNavigate={(path) => navigate(path)} />
          )}

          {/* CUSTOMER REQUESTS */}
          <button style={buttonStyle} onClick={() => navigate("/app/CustomerRequests")}>
            <HomeIcon style={iconStyle} /> Customer Requests
          </button>

          {/* ADD PRODUCT */}
          <button style={buttonStyle} onClick={() => navigate("/app/AddProduct")}>
            <HomeIcon style={iconStyle} /> Add Product
          </button>

          {/* VIEW SALES */}
          <button style={buttonStyle} onClick={() => navigate("/app/ViewSales")}>
            <HomeIcon style={iconStyle} /> View Sales
          </button>
        </div>

        {/* ── Right side ─────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: "bold", fontSize: "1.1rem", color: "#111827" }}>
              {companyName}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              {/* ── Notification Bell ─────────────────────────────── */}
              <div ref={notificationRef} style={{ position: "relative" }}>
                <button
                  onClick={() => {
                    setNotificationOpen(!notificationOpen);
                    setDropdownOpen(false);
                    refresh(); // ✅ load latest
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Notifications"
                >
                  <BellIcon style={{ width: "26px", height: "26px", color: "#374151" }} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: "0px",
                        right: "0px",
                        backgroundColor: "#EF4444",
                        color: "white",
                        fontSize: "0.65rem",
                        fontWeight: "bold",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #f3f4f6",
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "45px",
                      right: "0",
                      width: "400px",
                      height: "400px",
                      backgroundColor: "#ffffff",
                      boxShadow: "0px 4px 20px rgba(0,0,0,0.2)",
                      borderRadius: "12px",
                      zIndex: 200,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid #e5e7eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontWeight: "bold", fontSize: "1.05rem", color: "#111827" }}>
                        Notifications
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{ fontSize: "0.8rem", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}
                          onClick={() => refresh()}
                        >
                          Refresh
                        </span>

                        <span
                          style={{ fontSize: "0.8rem", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}
                          onClick={() => markAllAsRead()}
                        >
                          Mark all as read
                        </span>
                      </div>
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: "auto" }}>
                      {notifications.length === 0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#9ca3af",
                            fontSize: "0.95rem",
                          }}
                        >
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: "14px 20px",
                              borderBottom: "1px solid #f3f4f6",
                              backgroundColor: n.read ? "#ffffff" : "#f0f4ff",
                              cursor: "pointer",
                              transition: "background-color 0.15s",
                            }}
                            onClick={() => {
                              markAsRead(n.id);
                              setNotificationOpen(false);
                              navigate(n.link || "/notifications");
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              {!n.read && (
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: "#6366f1",
                                    marginTop: "6px",
                                    flexShrink: 0,
                                  }}
                                />
                              )}

                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "0.9rem", color: "#111827", fontWeight: n.read ? 400 : 700 }}>
                                  {n.title}
                                </div>
                                <div style={{ fontSize: "0.82rem", color: "#374151", marginTop: 4 }}>
                                  {n.message}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
                                  {timeAgo(n.createdAt)}
                                </div>
                              </div>

                              {/* ✅ Remove button per notification */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // don't navigate
                                  removeNotification(n.id);
                                }}
                                title="Remove"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  color: "#EF4444",
                                  fontSize: "18px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  lineHeight: 1,
                                  padding: "0 4px",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div
                      style={{
                        padding: "12px 20px",
                        borderTop: "1px solid #e5e7eb",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "#6366f1",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        onClick={() => {
                          setNotificationOpen(false);
                          navigate("/notifications");
                        }}
                      >
                        View all notifications
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* ── User Dropdown ──────────────────────────────────── */}
              <div ref={dropdownRef} style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <UserCircleIcon
                  style={{ width: "30px", height: "30px", color: "#374151", cursor: "pointer" }}
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotificationOpen(false);
                  }}
                />
                <span
                  style={{ marginLeft: "10px", fontWeight: "bold", color: "#111827", cursor: "pointer" }}
                  onClick={() => {
                    setDropdownOpen(!dropdownOpen);
                    setNotificationOpen(false);
                  }}
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
                    <button style={dropdownItemStyle} onClick={() => navigate("/profile")}>
                      Profile
                    </button>
                    <button style={dropdownItemStyle} onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", overflowX: "hidden" }}>
            {children}
          </div>
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