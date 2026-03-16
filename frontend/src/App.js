import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PronunciationCoach from "@/components/PronunciationCoach";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PronunciationCoach />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

export default App;
