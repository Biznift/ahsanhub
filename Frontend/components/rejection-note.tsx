export function RejectionNote({ note, image }: { note: string; image: string | null }) {
  if (!note && !image) return null;
  return (
    <div className="mt-3 rounded-xl border border-[#f5c2c0] bg-danger-soft px-4 py-3">
      <p className="text-[13px] font-semibold text-danger">Why this was not approved</p>
      {note && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-ink">{note}</p>}
      {image && (
        <a href={image} target="_blank" rel="noreferrer" className="mt-3 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-64 max-w-full rounded-lg border border-line object-contain" />
        </a>
      )}
    </div>
  );
}
