import React, { useEffect, useState } from "react";
import "./index.css";

// Tipi minimi
type Scores = {
  overall: number;
  seo: number;
  performance: number;
  accessibility: number;
  content: number;
  uxDesign: number;
};

type AuditStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;

type Audit = {
  id: string;
  url: string;
  status: AuditStatus;
  createdAt: string;
  completedAt?: string;
  scores?: Scores;
};

function App() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [url, setUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica audit esistenti
  useEffect(() => {
    fetch("/api/audits")
      .then((res) => res.json())
      .then((data) => setAudits(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Errore nel fetch degli audit:", err);
        setError("Impossibile caricare gli audit.");
      });
  }, []);

  async function handleCreateAudit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError("Inserisci un URL.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, maxPages: 20 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Errore nella creazione dell'audit");
      }

      const newAudit: Audit = await res.json();
      setAudits((prev) => [newAudit, ...prev]);
      setUrl("");
    } catch (err: any) {
      console.error("Errore creando audit:", err);
      setError(err.message || "Errore creando audit");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        <header style={{ marginBottom: "24px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            Audit Forge · MVP
          </h1>
          <p style={{ fontSize: "14px", color: "#9ca3af" }}>
            Inserisci un URL. Il backend crawlerà il sito e calcolerà gli score.
          </p>
        </header>

        <section
          style={{
            marginBottom: "24px",
            padding: "16px",
            borderRadius: "8px",
            background: "#020617",
            border: "1px solid #1f2933",
          }}
        >
          <form
            onSubmit={handleCreateAudit}
            style={{ display: "flex", gap: "8px", alignItems: "center" }}
          >
            <input
              type="url"
              placeholder="https://esempio.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #374151",
                backgroundColor: "#020617",
                color: "#e5e7eb",
              }}
            />
            <button
              type="submit"
              disabled={isCreating}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                border: "none",
                background:
                  "linear-gradient(135deg, #38bdf8 0%, #22c55e 50%, #eab308 100%)",
                color: "#020617",
                fontWeight: 600,
                cursor: isCreating ? "default" : "pointer",
                opacity: isCreating ? 0.7 : 1,
              }}
            >
              {isCreating ? "In corso..." : "Lancia audit"}
            </button>
          </form>
          {error && (
            <p
              style={{
                marginTop: "8px",
                fontSize: "13px",
                color: "#f97373",
              }}
            >
              {error}
            </p>
          )}
        </section>

        <section
          style={{
            padding: "16px",
            borderRadius: "8px",
            background: "#020617",
            border: "1px solid #1f2933",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            Audit recenti
          </h2>

          {audits.length === 0 ? (
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>
              Nessun audit. Lancia il primo dal form sopra.
            </p>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "#9ca3af" }}>
                  <th style={{ padding: "8px 4px" }}>URL</th>
                  <th style={{ padding: "8px 4px" }}>Status</th>
                  <th style={{ padding: "8px 4px" }}>Overall</th>
                  <th style={{ padding: "8px 4px" }}>SEO</th>
                  <th style={{ padding: "8px 4px" }}>UX</th>
                  <th style={{ padding: "8px 4px" }}>Creato</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    style={{ borderTop: "1px solid #111827" }}
                  >
                    <td style={{ padding: "8px 4px" }}>{audit.url}</td>
                    <td style={{ padding: "8px 4px" }}>{audit.status}</td>
                    <td style={{ padding: "8px 4px" }}>
                      {audit.scores?.overall ?? "-"}
                    </td>
                    <td style={{ padding: "8px 4px" }}>
                      {audit.scores?.seo ?? "-"}
                    </td>
                    <td style={{ padding: "8px 4px" }}>
                      {audit.scores?.uxDesign ?? "-"}
                    </td>
                    <td style={{ padding: "8px 4px", color: "#6b7280" }}>
                      {new Date(audit.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;