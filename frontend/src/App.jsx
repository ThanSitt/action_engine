import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const addEvent = (msg) => {
    setEvents((prev) => [...prev, msg]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setEvents([]);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      startSSE(data.file_id);
    } catch (err) {
      addEvent("Upload failed");
      setLoading(false);
    }
  };

  const startSSE = (id) => {
  const es = new EventSource(`http://localhost:8000/stream/${id}`);

  es.addEventListener("status", (e) => {
    try {
      const msg = JSON.parse(e.data);
      addEvent(typeof msg === "string" ? msg : JSON.stringify(msg));
    } catch {
      addEvent(e.data);
    }
  });

  es.addEventListener("result", (e) => {
    try {
      const parsed = JSON.parse(e.data);
      setResult(parsed);
    } catch {
      console.error("Failed to parse result", e.data);
    }
    setLoading(false);
    es.close();
  });

  es.onerror = () => {
    addEvent("Connection lost");
    setLoading(false);
    es.close();
  };
};

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="logo">Action</h2>
        <button className="primary-btn" onClick={() => {
          setFile(null);
          setEvents([]);
          setResult(null);
          setLoading(false);
        }}>
          Process New
        </button>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <h1>Action Engine</h1>
          <button className="theme-toggle" onClick={toggleTheme}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </header>

        <section className="content">
          <h2>Upload Center</h2>
          <p className="subtitle">
            Upload documents and watch real-time AI processing
          </p>

          {/* Upload */}
          <div className="upload-card">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button
              className="primary-btn"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? "Processing..." : "Upload & Process"}
            </button>
          </div>

          {/* Events */}
          <div className="card">
            <h3>Processing Steps</h3>

            {events.length === 0 && !loading && (
              <p className="muted">No activity yet</p>
            )}

            {events.map((e, i) => (
              <div key={i} className="event">
                <span className="dot" />
                {e}
              </div>
            ))}

            {loading && <p className="muted">Working...</p>}
          </div>

          {/* Result */}
          {result && (
            <div className="card success">
              <h3>Result</h3>

              {result?.action && (
                <>
                  <p><strong>Action:</strong> {result.action.title}</p>
                  <p><strong>Type:</strong> {result.action.action_type}</p>
                  <p><strong>Description:</strong> {result.action.description}</p>
                  <p><strong>Date:</strong> {result.action.date ?? "No date found"}</p>
                  <p><strong>Time:</strong> {result.action.time ?? "No time found"}</p>
                  <p><strong>Confidence:</strong> {(result.action.confidence * 100).toFixed(0)}%</p>
                </>
              )}

              {result?.decision && (
                <p><strong>Decision:</strong> {result.decision.reason}</p>
              )}

              {result?.result && (
                <p>
                  <strong>Calendar:</strong>{" "}
                  {result.result.link
                    ? <a href={result.result.link} target="_blank" rel="noreferrer">View Event</a>
                    : "Created"
                  }
                </p>
              )}

              {!result?.action && !result?.decision && !result?.result && (
                <p className="muted">No structured result returned.</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}