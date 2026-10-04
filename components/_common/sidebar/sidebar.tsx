"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/_ui/sheet";
import SidebarContent from "./sidebar-content";
import SidebarResizer from "./sidebar-resizer";
import { useCompaniesStore } from "@/stores/companies-store";

export default function Sidebar() {
  const sidebarOpen = useCompaniesStore((state) => state.sidebarOpen);
  const setSidebarOpen = useCompaniesStore((state) => state.setSidebarOpen);

  return (
    <>
      <aside className="border-sidebar-border bg-sidebar relative hidden w-(--sidebar-width) shrink-0 border-r lg:flex lg:flex-col">
        <SidebarContent />
        <SidebarResizer />
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="border-sidebar-border bg-sidebar w-[254px] max-w-[85vw]"
        >
          <SheetTitle className="sr-only">Nawigacja</SheetTitle>
          <SheetDescription className="sr-only">
            Sekcje CRM i procesy sprzedaży AI EVOLUTION POLSKA
          </SheetDescription>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
