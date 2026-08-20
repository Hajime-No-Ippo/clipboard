import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CopyButton } from "@/components/CopyButton";
import { noteStyle } from "@/lib/board";

// The code and the link are the same identifier: /c/<code>. Show both, because
// typing six characters wins on a laptop and scanning wins on a phone.
export function ShareCode({ slug }) {
  const [qr, setQr] = useState(null);
  const url = `${window.location.origin}/c/${slug}`;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: 160, color: { dark: "#3b2a18", light: "#fffdf6" } })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="paper note pin flex flex-col items-start gap-5 p-5 pt-7 sm:flex-row sm:items-center"
      style={noteStyle(3)}
    >
      {qr ? (
        <img src={qr} alt={`QR code for clipboard ${slug}`} className="h-32 w-32 shrink-0" />
      ) : (
        <div className="h-32 w-32 shrink-0 bg-[#f2ead9]" />
      )}
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8a6a4a]">
            Board code
          </p>
          <p className="font-mono text-4xl font-semibold tracking-[0.2em] text-[#2f2418]">{slug}</p>
        </div>
        <p className="truncate text-sm text-[#8a6a4a]">{url}</p>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={slug} label="Copy code" />
          <CopyButton value={url} label="Copy link" />
        </div>
      </div>
    </div>
  );
}
