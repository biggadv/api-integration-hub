import Link from "next/link";

export default function HomePage() {
  return (
    <main className="login-wrap">
      <section className="login-card">
        <h1>Gestor Legal</h1>
        <p>Nunca mais perca um prazo</p>
        <input className="input" placeholder="E-mail" />
        <input className="input" placeholder="Senha" type="password" />
        <Link href="/dashboard"><button className="btn">Entrar</button></Link>
      </section>
    </main>
  );
}
