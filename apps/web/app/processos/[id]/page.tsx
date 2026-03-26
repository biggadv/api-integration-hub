import { History, CalendarClock, Bell, FileText } from "lucide-react";

export default function ProcessoDetalhe() {
  return (
    <main className="container" style={{ paddingTop: "1.5rem" }}>
      <h1>Tela de Processo</h1>
      <p>Dados completos, eventos e histórico consolidado.</p>

      <section className="grid cards" style={{ marginTop: "1rem" }}>
        <article className="card card-blue"><FileText size={18} /> Processo 0001234-12.2025.8.26.0100</article>
        <article className="card card-red"><Bell size={18} /> Prazo final: 2026-03-27</article>
        <article className="card card-orange"><CalendarClock size={18} /> Audiência: 2026-03-30</article>
      </section>

      <section className="table" style={{ marginTop: "1rem", padding: "1rem" }}>
        <h3 style={{ marginBottom: ".6rem" }}><History size={16} /> Histórico completo</h3>
        <ul>
          <li>26/03/2026 10:15 - Operador validou intimação recebida por e-mail.</li>
          <li>25/03/2026 09:03 - Sistema criou prazo automaticamente via parser.</li>
          <li>22/03/2026 16:41 - Administrador cadastrou processo.</li>
        </ul>
      </section>
    </main>
  );
}
