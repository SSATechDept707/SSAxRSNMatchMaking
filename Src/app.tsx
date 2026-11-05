import { Routes, Route } from "react-router-dom";

import LandingPage from "./login&Register/LandingPage";
import CandidateLogin from "./login&Register/CandidateLogin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/CandidateLogin" element={<CandidateLogin />} />
    </Routes>
  );
}