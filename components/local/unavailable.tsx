import { Empty } from "../crm/ui";
export default function LocalUnavailable() {
  return (
    <section className="crm-card">
      <Empty
        title="Włącz lokalną bazę na swoim komputerze"
        description="Company Brain, konektory i AI Brain działają w trybie SQLite. Uruchom npm run dev:localdb lub użyj skryptu URUCHOM-BAZA.bat. Szczegóły znajdziesz w README. Tryb przeglądarkowy i Supabase pozostają dostępne."
      />
    </section>
  );
}
