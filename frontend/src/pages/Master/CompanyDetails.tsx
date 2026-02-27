// src/pages/masters/CompanyDetails.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Dashboard from "../Dashboard";

const CompanyDetails: React.FC = () => {
  const navigate = useNavigate();

  const company = {
    companyName: "Ashdip IT Solutions",
    address: "123, Tech Park, Mumbai, India",
    contactNumber: "+91 9876543210",
    email: "info@ashdipitsolutions.com",
    gstNumber: "27ABCDE1234F1Z5",
    panNumber: "ABCDE1234F",
    website: "www.ashdipitsolutions.com",
    state: "Maharashtra",
    stateCode: "27",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "700px",
    margin: "50px auto",
    padding: 20,
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };

  const titleStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 24,
    fontWeight: "bold",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    marginBottom: 10,
  };

  const labelStyle: React.CSSProperties = {
    width: "150px",
    fontWeight: "bold",
  };

  const valueStyle: React.CSSProperties = {
    flex: 1,
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    marginTop: 30,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "5px",
    background: "#007bff",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  };

  return (
    <Dashboard>

      <div style={containerStyle}>
        <h2 style={titleStyle}>Company Details</h2>

        <div style={rowStyle}>
          <div style={labelStyle}>Company Name:</div>
          <div style={valueStyle}>{company.companyName}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>Address:</div>
          <div style={valueStyle}>{company.address}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>Contact Number:</div>
          <div style={valueStyle}>{company.contactNumber}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>Email:</div>
          <div style={valueStyle}>{company.email}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>GST Number:</div>
          <div style={valueStyle}>{company.gstNumber}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>PAN Number:</div>
          <div style={valueStyle}>{company.panNumber}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>Website:</div>
          <div style={valueStyle}>{company.website}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>State:</div>
          <div style={valueStyle}>{company.state}</div>
        </div>

        <div style={rowStyle}>
          <div style={labelStyle}>State Code:</div>
          <div style={valueStyle}>{company.stateCode}</div>
        </div>

        {/* Exit Button */}
        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={() => navigate("/dashboard")}>
            Exit
          </button>
        </div>
      </div>
    </Dashboard>
  );

};

export default CompanyDetails;
