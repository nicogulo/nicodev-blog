import { BrowserRouter, Route, Routes } from "react-router-dom";
import BlogDemo from "./pages/blog-demo";
import Admin from "./pages/admin";
import { ThemeProvider } from "@/components/theme-provider";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BlogDemo />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
