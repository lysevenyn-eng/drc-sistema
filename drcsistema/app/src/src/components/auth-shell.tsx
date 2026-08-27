// Fundo compartilhado das telas de login/cadastro/aguardando aprovação — foto
// do próprio rebanho (Dorper) com um gradiente escuro por cima, pra dar cara
// de site voltado para ovino sem perder a legibilidade do card e do texto.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-drc-green-950 px-4 py-12">
      <div
        className="absolute inset-0 bg-cover bg-[center_28%]"
        style={{ backgroundImage: "url(/dorper-hero.jpg)" }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-drc-green-950/90 via-drc-green-950/75 to-drc-green-950/90"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  );
}
