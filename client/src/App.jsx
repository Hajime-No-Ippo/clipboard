import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import { noteStyle } from "@/lib/board";
import { codeFromPath } from "@/lib/code";
import Home from "@/pages/Home";
import ClipboardPage from "@/pages/ClipboardPage";

function BareCode() {
  const { code } = useParams();
  const slug = codeFromPath(code);
  return slug ? <Navigate to={`/c/${slug}`} replace /> : <Home />;
}

export default function App() {
  return (
    <div className="relative min-h-screen w-full">
      {/* First in the DOM on purpose: Safari 26 tints its bars from a sampled
          fixed element near the viewport edge, and which candidate wins is
          undocumented — being first, nearest the edge, and highest in z covers
          every plausible precedence rule. */}
      <div className="tint-cap tint-cap--bottom" aria-hidden="true" />
      {/* Cork extended past both ends of the viewport — see .board-bg. */}
      <div className="board-bg" aria-hidden="true" />
      {/* 1. 光影層：淡化漸變，避免跟 HTML 底色差距過大導致 Safari 採樣斷層 */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 22% 12%, rgba(255,236,198,0.15) 0%, rgba(255,236,198,0) 55%)," +
            "radial-gradient(130% 115% at 78% 96%, rgba(38,19,4,0.35) 0%, rgba(38,19,4,0) 62%)",
        }}
      />



      {/* 2. 內容主要容器：自然滾動，頂底給足 Safe Area */}
      {/* Bottom clearance: env(safe-area-inset-bottom) is only the home
          indicator (~34px); Safari's floating pill (~54px) sits above it and no
          env() reports it. Without the +4.5rem the footer lands inside the pill
          and its text gets blurred — the original complaint. */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4
                      pt-[max(1.5rem,env(safe-area-inset-top))]
                      pb-[max(3rem,calc(env(safe-area-inset-bottom)+4.5rem))] gap-8">

        {/* Header：去掉 sticky，讓它作為紙板自然排在最頂端 */}
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

        {/* Main 區塊 */}
        <main className="w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/c/:slug" element={<ClipboardPage />} />
            <Route path="/:code" element={<BareCode />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </main>

        {/* Footer：永遠穩居最後，不被任何浮動膠囊遮擋 */}
        <footer className="text-center text-xs text-[#f0e2d0]/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
          Cloudflare Workers + Durable Objects · notes expire on their own
        </footer>
      </div>
    </div>
  );
}
