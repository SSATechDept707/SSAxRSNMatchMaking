import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { PublicOnly, RequireRole } from "./auth/RouteGuards";


import LandingPage from "./login&Register/LandingPage";
import CandidateLogin from "./login&Register/CandidateLogin";
import MemberLogin from "./login&Register/MemberLogin";
import CandidateRegister from "./login&Register/CandidateRegister";
import MemberRegister from "./login&Register/MemberRegister"
import MemberHome from "./Members/Homepage";

export default function App() {
  return (
      <AuthProvider>
          <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route element={<PublicOnly />}>
                  <Route path="/CandidateLogin" element={<CandidateLogin />} />
                  <Route path="/CandidateRegister" element={<CandidateRegister />} />
                  <Route path="/MemberLogin" element={<MemberLogin />} />
                  <Route path="/MemberRegister" element={<MemberRegister />} />
              </Route>

              <Route element={<RequireRole role="member" />}>
                  <Route path="/Members/Homepage" element={<MemberHome />} />
              </Route>
          </Routes>
      </AuthProvider>
  );
}