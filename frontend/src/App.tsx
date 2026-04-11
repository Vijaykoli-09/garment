import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import RequireAuth from "./components/RequireAuth";
import SizeCreation from "./pages/Master/SizeCreation";
import PartyCreation from "./pages/Master/PartyCreation";
import CompanyDetails from "./pages/Master/CompanyDetails";
import ArtCreation from "./pages/Master/Art/ArtCreation";
import ArtGroupCreation from "./pages/Master/Art/ArtGroupCreation";
import RangeCreation from "./pages/Master/Art/RangeCreation";
import ShadeCreation from "./pages/Master/Art/ShadeCreation";
import AccessoriesCreation from "./pages/Master/Art/AccessoriesCreation";
import YarnCreation from "./pages/Master/YarnCreation";
import TransportCreation from "./pages/Master/TransportCreation";
import ProcessCreation from "./pages/Master/ProcessCreation";
import AgentCreation from "./pages/Master/AgentCreation";
import EmployeeCreation from "./pages/Master/EmployeeCreation";
import MaterialCreation from "./pages/Master/MaterialCreation";
import MaterialGroup from "./pages/Master/MaterialGroup";
import CustomerGrade from "./pages/Master/CustomerGrade";
import CategoryCreation from "./pages/Master/CategoryCreation";
import OrderRegister from "./pages/Master/OrderRegister";
import PurchaseEntry from "./pages/Knitting/PurchaseEntry";
import PurchaseOrder from "./pages/Knitting/PurchaseOrder";
import PurchaseReturn from "./pages/Knitting/PurchaseReturn";
import DispatchChallan from "./pages/Knitting/DispatchChallan";

//🧑‍🏫 finishing imports start
import FinishingOutward from "./pages/Knitting/Finishing/FinishingOutward";
import FinishingInward from "./pages/Knitting/Finishing/FinishingInward";
import FinishingAmountStatement from "./pages/Knitting/Finishing/FinishingAmountStatement";
import FinishingStockStatement from "./pages/Knitting/Finishing/FinishingStockStatement";
import FinishingInHouseStock from "./pages/Knitting/Finishing/FinishingInHouseStock";
//🧑‍🏫 finishing imports end

//🧑‍🏫 Reports imports start
import ArtReport from "./pages/Reports/ArtStockReport";
import DispatchReport from "./pages/Reports/DispatchReport";
import JobWorkReport from "./pages/Reports/JobWorkReport";
import DyeingAmountStatement from "./pages/Knitting/Dyeing/DyeingAmountStatement";
import SalaryReport from "./pages/Reports/SalaryReport";
import PaymentModeReport from "./pages/Reports/PaymentModeReport";

//🧑‍🏫 Reports imports end

// Payments Imports starts
import PaymentMethod from "./pages/Payment/Payment";
import PaymentRecipt from "./pages/Payment/Recipt";
import PaymentMode from "./pages/Payment/PaymentMode";
// Payments import End


import FabricationCreation from "./pages/Master/FabricationCreation";
import KnittingInwardChallan from "./pages/Knitting/knitting/KnittingInwardChallan";
import KnittingOutwardChallan from "./pages/Knitting/knitting/KnittingOutwardChallan";

import DyeingOutward from "./pages/Knitting/Dyeing/DyeingOutward";
import DyeingInward from "./pages/Knitting/Dyeing/DyeingInward";
import DyeingStockStatement from "./pages/Knitting/Dyeing/DyeingStockStatement";
import DyeingMaterialReturn from "./pages/Knitting/Dyeing/DyeingMaterialReturn";
import DyeingItemWiseOutstanding from "./pages/Knitting/Dyeing/DyeingItemWiseOutstanding"

import MaterialStockReport from "./pages/Knitting/MaterialStockReport";
import AmountReport from "./pages/Knitting/AmountReport";
import KnittingAmountStatement from "./pages/Knitting/knitting/KnittingAmountStatement";
import KnittingStockStatement from "./pages/Knitting/knitting/KnittingStockStatement";
import KnittingMaterialReturn from "./pages/Knitting/knitting/KnittingMaterialReturn";
import PurchasePendingOrders from "./pages/Knitting/PurchasePendingOrders";
import PackingChallan from "./pages/Knitting/PackingChallan";
import CuttingModule from "./pages/Cutting/CuttingModule";
import ProductionReceipt from "./pages/Production/ProductionReceipt";

import OutwardChallan from "./pages/Cutting/OutwardChallan";
import InwardChallan from "./pages/Cutting/InwardChallan";
import LocationCreation from "./pages/Master/LocationCreation";
import SaleOrder from "./pages/Sales/sale-order";
import SaleOrderPendency from "./pages/Sales/SaleOrderPendency";
import OrderSettle from "./pages/Sales/OrderSettle";
import SaleOrderReturn from "./pages/Sales/SaleOrderReturn";

import UserManagement from "./pages/Administration/UserManagement";

import RateList from "./pages/Reports/RateList";

import OtherDispatchChallan from "./pages/Knitting/OtherDispatchChallan";
import AccountStatement from "./pages/Reports/AccountStatement";
import StockAdjustment from "./pages/Reports/adjustment/StockAdjustment";
import PurchaseOrderItem from "./pages/PurchaseMaterial/PurchaseOrderItem";
import PurchaseEntryItem from "./pages/PurchaseMaterial/PurchaseEntryItem";
import PurchasePendingOrderItem from "./pages/PurchaseMaterial/PurchasePendingOrderItem";
import PurchaseReturnItem from "./pages/PurchaseMaterial/PurchaseReturnItem";




function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Master */}
        <Route path="/master/company" element={<CompanyDetails />} />
        <Route path="/master/size" element={<SizeCreation />} />
        <Route path="/master/party" element={<PartyCreation />} />
        <Route path="/master/grade" element={<CustomerGrade />} />
        <Route path="/master/category" element={<CategoryCreation />} />
        <Route path="/master/art/art-creation" element={<ArtCreation />} />
        <Route path="/master/art/art-group-creation" element={<ArtGroupCreation />} />
        <Route path="/master/art/range-creation" element={<RangeCreation />} />
        <Route path="/master/art/shade-creation" element={<ShadeCreation />} />
        <Route path="/master/art/accessories-creation" element={<AccessoriesCreation />} />
        <Route path="/master/order_register" element={<OrderRegister />} />
        <Route path="/master/yarn-creation" element={<YarnCreation />} />
        <Route path="/master/transport" element={<TransportCreation />} />
        <Route path="/master/agent" element={<AgentCreation />} />
        <Route path="/master/process" element={<ProcessCreation />} />
        <Route path="/master/employee" element={<EmployeeCreation />} />
        <Route path="/master/material/material-creation" element={<MaterialCreation />} />
        <Route path="/master/material/item-creation" element={<MaterialCreation />} />
        <Route path="/master/material/material-group" element={<MaterialGroup />} />
        <Route path="/master/material/item-group" element={<MaterialGroup />} />
        <Route path="/master/fabrication" element={<FabricationCreation />} />
        <Route path="/master/location" element={<LocationCreation />} />

        {/* Knitting – challan */}
        <Route path="/knitting/challan/outward-challan" element={<KnittingOutwardChallan />} />
        <Route path="/knitting/challan/inward-challan" element={<KnittingInwardChallan />} />
        <Route path="/knitting/challan/material-return" element={<KnittingMaterialReturn />} />
        <Route path="/knitting/challan/stock-statement" element={<KnittingStockStatement />} />
        <Route path="/knitting/challan/amount-statement" element={<KnittingAmountStatement />} />

        {/* Knitting – purchase */}
        <Route path="/knitting/purchase-entry" element={<PurchaseEntry />} />
        <Route path="/knitting/purchase-order" element={<PurchaseOrder />} />
        <Route path="/knitting/purchase-return" element={<PurchaseReturn />} />
        <Route path="/knitting/purchase-pending-orders" element={<PurchasePendingOrders />} />
        <Route path="/sales/dispatch-challan" element={<DispatchChallan />} />
        <Route path="/sales/other-dispatch-challan" element={<OtherDispatchChallan />} />

        {/* Knitting – dyeing */}
        <Route path="/knitting/dyeing/inward-challan" element={<DyeingInward />} />
        <Route path="/knitting/dyeing/outward-challan" element={<DyeingOutward />} />
        <Route path="/knitting/dyeing/outwar-challan" element={<DyeingOutward />} />
        <Route path="/knitting/dyeing/material-return" element={<DyeingMaterialReturn />} />
        <Route path="/knitting/dyeing/stock-statement" element={<DyeingStockStatement />} />
        <Route path="/knitting/dyeing/item-wise-outstanding" element={<DyeingItemWiseOutstanding />} />
        <Route path="/knitting/dyeing/dyeing-amount-statement" element={<DyeingAmountStatement />} />

        {/* Knitting – finishing */}
        <Route path="/knitting/finishing/outward-challan" element={<FinishingOutward />} />
        <Route path="/knitting/finishing/inward-challan" element={<FinishingInward />} />
        <Route path="/knitting/finishing/finishing-stock-statement" element={<FinishingStockStatement />} />
        <Route path="/knitting/finishing/finishing-amount-statement" element={<FinishingAmountStatement />} />
        <Route path="/knitting/finishing/in-house-stock-statement" element={<FinishingInHouseStock />} />

        {/* Knitting – packing & reports */}
        <Route path="/knitting/packing/packing-challan" element={<PackingChallan />} />
        <Route path="/knitting/purchase-reports/material-stock-report" element={<MaterialStockReport />} />
        <Route path="/knitting/purchase-reports/amount-report" element={<AmountReport />} />

        {/* Cutting / Job work */}
        <Route path="/cutting/cutting-module" element={<CuttingModule />} />
        <Route path="/job_work/outward-challan" element={<OutwardChallan />} />
        <Route path="/job_work/inward-challan" element={<InwardChallan />} />

        {/* Sales */}
        <Route path="/Sales/sales-order" element={<SaleOrder />} />
        <Route path="/sales/sale-order-settle" element={<OrderSettle />} />
        <Route path="/sales/sale-order-pendency" element={<SaleOrderPendency />} />
        <Route path="/sales/sale-order-return" element={<SaleOrderReturn />} />

        {/* Purchase Material */}
        <Route path="/purchase/order-item" element={<PurchaseOrderItem />} />
        <Route path="/purchase/entry-item" element={<PurchaseEntryItem />}/>
        <Route path="/purchase/pending-order-item" element={<PurchasePendingOrderItem /> }/>
        <Route path="/purchase/return-item" element={<PurchaseReturnItem />}/>

        {/* Administration */}
        <Route path="/administration/user-managment" element={<UserManagement />} />

        {/* Production & Payment */}
        <Route path="/production/receipt" element={<ProductionReceipt />} />
        <Route path="/payment/payment" element={<PaymentMethod />} />
        <Route path="/payment/recipt" element={<PaymentRecipt />} />
        <Route path="/payment/payment-mode" element={<PaymentMode />} />

        {/* Reports (nested) */}
        <Route path="reports">
          <Route path="art-report" element={<ArtReport />} />
          <Route path="salary-report" element={<SalaryReport/>}/>
          <Route path="dispatch-report" element={<DispatchReport />} />
          <Route path="job-work-report" element={<JobWorkReport />} />
          <Route path="rate-list-report" element={<RateList />} />
          <Route path="account-report" element={<AccountStatement />} />
          <Route path="paymentmod-report" element={<PaymentModeReport />} />
          <Route path="stock-adjustment" element={<StockAdjustment />} />
        </Route>

 
        {/* Dashboard (protected) */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard children={undefined} />
            </RequireAuth>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;