import Button from "@/components/_ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="text-primary text-[48px] font-bold">404</span>
      <h1>Nie znaleziono strony</h1>
      <p className="text-soft">
        Ta strona nie istnieje lub została przeniesiona.
      </p>
      <Button variant="primary" href="/">
        Wróć do CRM
      </Button>
      <span className="text-subtle text-[12px] tracking-widest">
        AI EVOLUTION POLSKA
      </span>
    </main>
  );
}
