import { useState, useEffect, useRef } from "react";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("upload");
  const [file, setFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (page === "history") fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:8000/history");
      const data = await res.json();
      setHistory(data);
    } catch {
      setHistory([]);
    }
  };

  const deleteHistoryItem = async (file_id) => {
    try {
      await fetch(`http://localhost:8000/history/${file_id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((item) => item.file_id !== file_id));
    } catch {
      console.error("Delete failed");
    }
  };

  const addEvent = (msg) => setEvents((prev) => [...prev, msg]);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = [".pdf", ".docx", ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp"];
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) { addEvent(`Unsupported file type: ${ext}`); return; }
    setFile(f);
    setEvents([]);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setEvents([]);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", { method: "POST", body: formData });
      const data = await res.json();
      startSSE(data.file_id);
    } catch {
      addEvent("Upload failed — is the backend running?");
      setLoading(false);
    }
  };

  const startSSE = (id) => {
    const es = new EventSource(`http://localhost:8000/stream/${id}`);

    es.addEventListener("status", (e) => {
      try {
        const msg = JSON.parse(e.data);
        addEvent(typeof msg === "string" ? msg : JSON.stringify(msg));
      } catch { addEvent(e.data); }
    });

    es.addEventListener("result", (e) => {
      try { setResult(JSON.parse(e.data)); }
      catch { console.error("Failed to parse result", e.data); }
      setLoading(false);
      es.close();
    });

    es.onerror = () => {
      addEvent("Connection lost");
      setLoading(false);
      es.close();
    };
  };

  const confidence = result?.action ? Math.round(result.action.confidence * 100) : 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <span className="logo">Action Engine</span>
        <div className={`nav-item ${page === "upload" ? "active" : ""}`} onClick={() => setPage("upload")}>Upload</div>
        <div className={`nav-item ${page === "history" ? "active" : ""}`} onClick={() => setPage("history")}>History</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span className="topbar-title">{page === "upload" ? "Document processor" : "Processed documents"}</span>
          <button className="theme-btn" onClick={() => setDarkMode((p) => !p)}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        {page === "upload" && (
          <section className="content">
            <div className="page-header">
              <p className="page-title">Upload a document</p>
              <p className="page-sub">Supports PDF, DOCX, and images — watch it process in real time</p>
            </div>

            <div
              className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !file && fileInputRef.current.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.bmp,.tiff,.webp"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="file-selected">
                  <div className="file-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <button className="file-clear" onClick={(e) => { e.stopPropagation(); setFile(null); setEvents([]); setResult(null); }}>✕</button>
                </div>
              ) : (
                <div className="drop-prompt">
                  <div className="drop-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="17,8 12,3 7,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="drop-main">Drop your file here</p>
                  <p className="drop-sub">or <span className="drop-browse">click to browse</span></p>
                  <p className="drop-types">PDF · DOCX · JPG · PNG · TIFF · WEBP</p>
                </div>
              )}
            </div>

            <button className="upload-btn" onClick={handleUpload} disabled={!file || loading}>
              {loading ? "Processing..." : "Upload & process"}
            </button>

            <div className="card">
              <div className="card-label">Processing steps</div>
              <div className="event-list">
                {events.length === 0 && !loading && <p className="empty">No activity yet</p>}
                {events.map((e, i) => (
                  <div key={i} className="event-row">
                    <span className="dot-circle" />
                    <span>{e}</span>
                  </div>
                ))}
                {loading && <p className="working">Working...</p>}
              </div>
            </div>

            {result && (
              <div className="card">
                <div className="card-label">Result</div>
                {result.error && <div className="error-row">{result.error}</div>}
                {result.action && (
                  <div className="result-grid">
                    <div className="rcell full">
                      <div className="rlabel">Action</div>
                      <div className="rval">{result.action.title || "Untitled"}</div>
                    </div>
                    <div className="rcell full">
                      <div className="rlabel">Description</div>
                      <div className="rval desc">{result.action.description || "—"}</div>
                    </div>
                    <div className="rcell">
                      <div className="rlabel">Type</div>
                      <div className="rval mono">{result.action.action_type}</div>
                    </div>
                    <div className="rcell">
                      <div className="rlabel">Date / Time</div>
                      <div className="rval">
                        {result.action.date || "No date"}
                        {result.action.time ? ` · ${result.action.time}` : ""}
                      </div>
                    </div>
                    <div className="rcell full">
                      <div className="rlabel">Confidence · {confidence}%</div>
                      <div className="conf-bar">
                        <div className="conf-fill" style={{ width: `${confidence}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {result.decision && (
                  <div className="decision-row">
                    <span className={`badge ${result.decision.execute ? "badge-ok" : "badge-no"}`}>
                      {result.decision.execute ? "Approved" : "Rejected"}
                    </span>
                    <span className="decision-reason">{result.decision.reason}</span>
                  </div>
                )}
                {result.result?.link && (
                  <a className="cal-link" href={result.result.link} target="_blank" rel="noreferrer">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    View calendar event
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {page === "history" && (
          <section className="content">
            <div className="page-header">
              <p className="page-title">Processed documents</p>
              <p className="page-sub">Documents processed in this session</p>
            </div>

            {history.length === 0 ? (
              <div className="card">
                <p className="empty">No documents processed yet</p>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.file_id} className="card">
                  <div className="hist-header">
                    <div className="hist-meta">
                      <span className="file-name">{item.filename}</span>
                      <span className="file-size">{item.processed_at}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className={`badge ${
                          item.result?.decision?.execute ? "badge-ok" : "badge-no"
                        }`}
                      >
                        {item.result?.decision?.execute ? "Approved" : "Rejected"}
                      </span>

                      <button
                        className="delete-btn"
                        onClick={() => deleteHistoryItem(item.file_id)}
                      >
                        x
                      </button>
                    </div>
                  </div>
                  {item.result?.action && (
                    <div className="hist-detail">
                      <span className="rlabel-inline">Action</span> {item.result.action.title}
                    </div>
                  )}
                  {item.result?.decision && (
                    <div className="hist-detail">
                      <span className="rlabel-inline">Decision</span> {item.result.decision.reason}
                    </div>
                  )}
                  {item.result?.result?.link && (
                    <a className="cal-link" href={item.result.result.link} target="_blank" rel="noreferrer" style={{ marginTop: "0.6rem" }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      View calendar event
                    </a>
                  )}
                </div>
              ))
            )}
          </section>
        )}
      </main>
    </div>
  );
}