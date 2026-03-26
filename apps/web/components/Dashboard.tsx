import Link from "next/link";

const rows = [
  { type: "prazo", processo: "0001234-12.2025.8.26.0100", data: "2026-03-27", status: "urgente" },
  { type: "audiencia", processo: "0007788-11.2024.8.19.0001", data: "2026-03-30", status: "normal" },
  { type: "intimacao", processo: "0009182-98.2023.8.13.0700", data: "2026-03-25", status: "normal" }
];

export function Dashboard() {
  return (
    <main className="container" style={{ paddingTop: "2rem" }}>
      <header style={{ marginBottom: "1rem" }}>
        <h2>Olá, equipe jurídica 👋</h2>
        <p>Resumo inteligente de hoje</p>
      </header>

      <section className="grid cards">
        <article className="card card-red"><h3>🔴 Prazos urgentes</h3><p style={{ fontSize: "1.7rem", marginTop: ".5rem" }}>12</p></article>
        <article className="card card-orange"><h3>🟠 Audiências próximas</h3><p style={{ fontSize: "1.7rem", marginTop: ".5rem" }}>8</p></article>
        <article className="card card-blue"><h3>🔵 Intimações recentes</h3><p style={{ fontSize: "1.7rem", marginTop: ".5rem" }}>23</p></article>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h3>Agenda inteligente</h3>
        <table className="table" style={{ marginTop: ".6rem" }}>
          <thead>
            <tr><th>Tipo</th><th>Processo</th><th>Data</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>{row.type}</td>
                <td>{row.processo}</td>
                <td>{row.data}</td>
                <td><span className={`badge ${row.status}`}>{row.status}</span></td>
                <td><Link href={`/processos/${index + 1}`}>Ver processo</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
