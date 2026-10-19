export default function Loading() {
  return (
    <div
      className="container page-wrapper"
      aria-busy="true"
      aria-label="Loading content"
    >
      <div
        className="cx-skeleton"
        style={{ width: "55%", maxWidth: 520, height: 50, marginBottom: 32 }}
      />
      <div className="grid">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index}>
            <div className="cx-skeleton" style={{ aspectRatio: "2/3" }} />
            <div
              className="cx-skeleton"
              style={{ width: "70%", height: 12, marginTop: 14 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
