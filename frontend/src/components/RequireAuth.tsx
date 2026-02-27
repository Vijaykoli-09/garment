import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface Props {
  children: React.ReactNode;
}

const RequireAuth: React.FC<Props> = ({ children }) => {
  const token = localStorage.getItem("token");
  const location = useLocation();

// testing
  
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
