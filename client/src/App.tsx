import { BrowserRouter, Route, Routes } from "react-router-dom";
import NavBar from "@/components/molecules/NavBar";
import PeoplePage from "./pages/PeoplePage";
import StreamPage from "./pages/StreamPage";
import WorkerPage from "./pages/WorkerPage";

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<PeoplePage />} />
        <Route path="/stream" element={<StreamPage />} />
        <Route path="/worker" element={<WorkerPage />} />
      </Routes>
    </BrowserRouter>
  );
}
