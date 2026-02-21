import { BrowserRouter, Route, Routes } from "react-router-dom";
import BlogDemo from "./pages/blog-demo";
import { ThemeProvider } from "@/components/theme-provider";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BlogDemo />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
