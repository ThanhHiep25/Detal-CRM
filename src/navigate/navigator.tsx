import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../page/home/Home";
import SettingsDetail from "../page/setting/SettingsDetail";
import NotFound from "../components/notFound/pageNotFound";
import TermsAndConditionsPage from "../page/termsAndConditionsPage/TermsAndConditionsPage";
import PaymentSuccess from "../page/Payment/PaymentSuccess";
import GooglePaySuccess from "../page/Payment/GooglePaySuccess";
import ProfilePage from "@/page/profile/page";
import DentalInfoManagement from "@/page/setting/DentalInfoManagement";




const NavigatorBrowser: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element= {<SettingsDetail />} />
        <Route path="/dental-info" element= {<DentalInfoManagement />} />
        <Route path="/profile" element= {<ProfilePage />} />
        <Route path="/policy" element={<TermsAndConditionsPage/>}/>
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/google-pay-success" element={<GooglePaySuccess />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default NavigatorBrowser;
