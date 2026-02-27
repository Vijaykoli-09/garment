import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Dashboard from "../Dashboard";
import api from "../../api/axiosInstance";

const EmployeeCreation: React.FC = () => {

  const emptyForm = {
    code: "",
    employeeName: "",
    gender: "",              // ✅ instead of sex
    dateOfBirth: "",         // ✅ instead of dob
    dateOfJoining: "",       // ✅ instead of doj
    address: "",
    salaryType: "",
    monthlySalary: "",
    contractorPayment: "",
    workingHours: "",
    contact: "",
    qualification: "",
    openingBalance: "",
    asOn: "",
    under: "",
    process: { serialNo: "", processName: "" } // ✅ match backend Process entity
  };

  const [formData, setFormData] = useState<any>(emptyForm);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [processList, setProcessList] = useState<any[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState(allEmployees);

  // ⭐ helper: clear form and generate a new random employee code
  const generateNewEmployeeForm = () => {
    const prefix = "EMP";
    const randomNum = Math.floor(1000 + Math.random() * 9000); // ensures 4 digits
    const empCode = `${prefix}${randomNum}`;

    setFormData({
      ...emptyForm,
      code: empCode,
    });
  };

  // when process list becomes available, replace process object with canonical one
  useEffect(() => {
    if (!formData.process?.serialNo) return;
    if (processList.length === 0) return;
    const matched = processList.find(p => String(p.serialNo) === String(formData.process.serialNo));
    if (matched && matched.processName !== formData.process.processName) {
      setFormData((prev: any) => ({ ...prev, process: matched }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processList]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };



  // Save / Update
  const handleSave = async () => {
    if (!formData.code.trim()) {
      return Swal.fire("Validation Error", "Please fill the Code field", "warning");
    }
    if (!formData.employeeName.trim()) {
      return Swal.fire("Validation Error", "Please fill the Employee Name field", "warning");
    }
    if (!formData.process?.serialNo) {
      return Swal.fire("Validation Error", "Please select a Process", "warning");
    }

    try {
      if (formData.id) {
        await api.put(`/employees/${formData.id}`, formData);
        Swal.fire("Updated!", "Employees updated successfully", "success");
      } else {
        await api.post("/employees", formData);
        Swal.fire("Added!", "Employee saved successfully", "success");
      }
      loadAllEmployees();

      // ⭐ after save/update: clear form and generate new employee code
      generateNewEmployeeForm();

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to save Employee", "error");
    }
  };



  // Add New
  const handleAddNew = () => {
    // ⭐ use same helper so Clear also resets and generates new code
    generateNewEmployeeForm();
    Swal.fire("Info", "Form cleared for new employee", "info");
  };

  // Delete
  const handleDeleteEmployee = async (code: number) => {
    try {
      await api.delete(`/employees/${code}`);
      Swal.fire("Deleted!", "Employee deleted successfully", "success");
      loadAllEmployees(); // Refresh the list
      generateNewEmployeeForm();
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to delete employee", "error");
    }
  };



  // ✅ Load all employees
  const loadAllEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setAllEmployees(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to load employees", "error");
    }
  };

  useEffect(() => {
    loadAllEmployees();
  }, []);

  const loadProcesses = async () => {
    try {
      const res = await api.get("/process/list");
      const list = Array.isArray(res.data) ? res.data : res.data.data || [];
      setProcessList(list.map((p: any) => ({ ...p, serialNo: String(p.serialNo) })));
    } catch (err) {
      console.error("Failed to load processes", err);
    }
  };

  useEffect(() => {
    loadProcesses();
  }, []);

  //Generate Employee Code Random 
  useEffect(() => {
    const prefix = "EMP";
    const randomNum = Math.floor(1000 + Math.random() * 9000); // ensures 4 digits
    const empCode = `${prefix}${randomNum}`;

    setFormData((prev: any) => ({ ...prev, code: empCode }));
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();

    const filtered = allEmployees.filter((emp) => {
      const code = emp.code?.toLowerCase() || "";
      const name = emp.employeeName?.toLowerCase() || "";
      const process = emp.process?.processName?.toLowerCase() || "";
      const contact = emp.contact?.toLowerCase() || "";
      const salary = emp.salaryType?.toLowerCase() || "";

      return (
        code.includes(term) ||
        name.includes(term) ||
        process.includes(term) ||
        contact.includes(term) ||
        salary.includes(term)
      );
    });

    setFilteredEmployees(filtered);
  };
  useEffect(() => {
    setFilteredEmployees(allEmployees);
  }, [allEmployees]);



  // const payload = {
  //   ...formData,
  //   process: { serialNo: formData.process.serialNo }
  // };


  // --- Inline CSS like PartyCreation ---
  const containerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "30px auto",
    padding: "20px",
    background: "#fff",
    borderRadius: "8px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    fontFamily: "Arial, sans-serif",
  };
  const formRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "15px",
    alignItems: "center",
    marginBottom: "10px",
  };
  const labelStyle: React.CSSProperties = { width: "150px", fontWeight: "bold" };
  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "14px",
  };
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: "none", height: "50px" };
  const buttonStyle: React.CSSProperties = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    fontWeight: "bold",
    cursor: "pointer",
    backgroundColor: "#007bff",
    color: "white",
  };

  return (
    <Dashboard>
      <div style={containerStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>Employee Creation</h2>
        <form>
          {/* Code + Process Name */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              disabled //  disables editing
              style={{ ...inputStyle, backgroundColor: "#e9ecef" }}
            />

            <label style={labelStyle}>Process Name</label>
            <select
              name="process"
              value={formData.process?.serialNo || ""}
              onChange={(e) => {
                const selectedSerial = e.target.value;
                const matched = processList.find(p => p.serialNo === selectedSerial);
                setFormData((prev: any) => ({
                  ...prev,
                  process: matched || { serialNo: selectedSerial, processName: "" }
                }));
              }}
              style={inputStyle}
            >
              <option value="">-- Select Process --</option>
              {processList.map((proc) => (
                <option key={proc.serialNo} value={proc.serialNo}>
                  {proc.processName}
                </option>
              ))}
            </select>

          </div>

          {/* Employee Name + Address */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Employee Name</label>
            <input
              type="text"
              name="employeeName"
              value={formData.employeeName}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              style={textareaStyle}
            ></textarea>
          </div>

          {/* Gender + DOB */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              style={inputStyle} // ✅ added
            >
              <option value="">-- Select Gender --</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>

            <label style={labelStyle}>Date of Birth</label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* DOJ + Salary Type */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Date of Joining</label>
            <input
              type="date"
              name="dateOfJoining"
              value={formData.dateOfJoining}
              onChange={handleChange}
              style={inputStyle}
            />

            <label style={labelStyle}>Salary Type</label>
            <select
              name="salaryType"
              value={formData.salaryType}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select Salary Type --</option>
              <option value="PRODUCTION">Production</option>
              <option value="ATTENDENCE">Attendence</option>
            </select>
          </div>

          {/* Monthly Salary + Contractor Payment */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Monthly Salary</label>
            <input
              type="number"
              name="monthlySalary"
              value={formData.monthlySalary}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Contractor Payment</label>
            <input
              type="number"
              name="contractorPayment"
              value={formData.contractorPayment}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Working Hours + Contact */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Working Hours</label>
            <input
              type="text"
              name="workingHours"
              value={formData.workingHours}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Contact</label>
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* Qualification + Opening Balance */}
          <div style={formRowStyle}>
            <label style={labelStyle}>Qualification</label>
            <input
              type="text"
              name="qualification"
              value={formData.qualification}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Opening Balance</label>
            <input
              type="number"
              name="openingBalance"
              value={formData.openingBalance}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          {/* As On + Under */}
          <div style={formRowStyle}>
            <label style={labelStyle}>As On</label>
            <input
              type="date"
              name="asOn"
              value={formData.asOn}
              onChange={handleChange}
              style={inputStyle}
            />
            <label style={labelStyle}>Under</label>
            <input
              type="text"
              name="under"
              value={formData.under}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>



          <div
            style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "30px", flexWrap: "wrap", }}
          >
            <button type="button" onClick={handleSave} style={buttonStyle}>
              {formData.id ? "Update" : "Save"}
            </button>
            <button type="button" onClick={handleAddNew} style={buttonStyle}>
              Clear
            </button>
            <button type="button" onClick={() => setShowListModal(true)} style={buttonStyle}>
              Employee List
            </button>
          </div>
        </form>
      </div>
      {/* ✅ Employee List Modal */}
      {showListModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              width: "90%",
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            {/* 🧑‍🏫✅ Search Input */}
            <input
              type="text"
              placeholder="Search by Code, Name, Process, or Contact..."
              onChange={handleSearchChange}
              style={{
                width: "100%",
                padding: "8px 10px",
                marginBottom: 15,
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            />

            <h3>
              All Employees (S = {filteredEmployees.length}) (Total = {allEmployees.length})
            </h3>

            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                border: "1px solid #eee",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Code</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Employee Name</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Process</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Gender</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Contact</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Salary Type</th>
                    <th style={{ border: "1px solid #ccc", padding: 6 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.code}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.employeeName}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.process?.processName}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.gender}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.contact}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>{emp.salaryType}</td>
                      <td style={{ border: "1px solid #ccc", padding: 6 }}>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "green", marginRight: "5px" }}
                          onClick={() => {
                            setFormData(emp);
                            setShowListModal(false);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          style={{ ...buttonStyle, backgroundColor: "red" }}
                          onClick={() => handleDeleteEmployee(emp.code)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 10 }}>
                        No matching employees found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setShowListModal(false)}
              style={{ marginTop: 10, padding: 6 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </Dashboard>
  );
};


export default EmployeeCreation;
