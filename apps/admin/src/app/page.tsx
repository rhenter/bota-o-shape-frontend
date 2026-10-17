import Image from "next/image";

export default function HomePage() {
  return (
    <main className="foundation-page">
      <Image src="/brand/logo.png" alt="Bota o Shape!" width={240} height={89} priority className="brand-logo" />
      <p className="demo-label">Ambiente de demonstração · dados fictícios</p>
      <h1>Sua academia, mais perto de cada aluno.</h1>
      <p>Acompanhe treinos, avaliações e orientações em um só lugar.</p>
      <p>Base do painel profissional e administrativo.</p>
    </main>
  );
}
