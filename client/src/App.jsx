import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { noteStyle } from "@/lib/board";
import { codeFromPath } from "@/lib/code";
import Home from "@/pages/Home";
import ClipboardPage from "@/pages/ClipboardPage";

// Typing just the code into the address bar — clipboard.../ABC123 — is the
// shortest way to reach a board, and it is what people do when reading a code
// off another screen. Anything that is not code-shaped falls through to Home.
function BareCode() {
  const { code } = useParams();
  const slug = codeFromPath(code);
  return slug ? <Navigate to={`/c/${slug}`} replace /> : <Home />;
}

export default function App() {
  return (
    <div className="min-h-screen">
      {/* The board's own lighting, and it must agree with the notes': a warm
          highlight where the light is (top-left) and the fall-off opposite it.
          A centred vignette would contradict every shadow on the page. */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 22% 12%, rgba(255,236,198,0.22) 0%, rgba(255,236,198,0) 55%)," +
            "radial-gradient(130% 115% at 78% 96%, rgba(38,19,4,0.52) 0%, rgba(38,19,4,0) 62%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <Link
            to="/"
            className="paper note pin inline-block px-8 py-4"
            style={noteStyle(2)}
          >
            <span className="font-serif text-2xl text-[#3b2a18]">Clipboard</span>
            <span className="mt-0.5 block text-xs uppercase tracking-[0.25em] text-[#8a6a4a]">
              One board, every device
            </span>
          </Link>
        </header>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:slug" element={<ClipboardPage />} />
            <Route path="/:code" element={<BareCode />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        <footer className="text-center text-xs text-[#f0e2d0]/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
          Cloudflare Workers + Durable Objects · notes expire on their own
        </footer>
      </div>
    </div>
  );
}
