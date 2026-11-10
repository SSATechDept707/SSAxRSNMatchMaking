import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireRole } from "./auth/RouteGuards";


import LandingPage from "./login&Register/LandingPage";
import CandidateLogin from "./login&Register/CandidateLogin";
import MemberLogin from "./login&Register/MemberLogin";
import CandidateRegister from "./login&Register/CandidateRegister";
import MemberRegister from "./login&Register/MemberRegister"
import MemberHome from "./Members/Homepage";
import CandidateHome from "./Candidates/Homepage";
import AdminDashboard from "/Admin/Dashboard";


export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />


          <Route path="/CandidateLogin" element={<CandidateLogin />} />
          <Route path="/CandidateRegister" element={<CandidateRegister />} />
          <Route path="/MemberLogin" element={<MemberLogin />} />
          <Route path="/MemberRegister" element={<MemberRegister />} />
    
        <Route element={<RequireRole role="candidate" />}>
          <Route path="/Candidates/Homepage" element={<CandidateHome />} />
        </Route>

        <Route element={<RequireRole role="member" />}>
          <Route path="/Members/Homepage" element={<MemberHome />} />
        </Route>
        <Route element={<RequireRole role="admin" />}>
          <Route path="/Admin/Dashboard" element={<AdminDashboard />} />
        </Route>

      </Routes>
    </AuthProvider>
  );
}