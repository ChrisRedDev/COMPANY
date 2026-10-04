"use client";

import Button from "@/components/_ui/button";
import { ScrollArea } from "@/components/_ui/scroll-area";
import SidebarNavItem from "./sidebar-nav-item";
import SidebarSection from "./sidebar-section";
import { useCompaniesStore } from "@/stores/companies-store";
import Logo from "@/public/assets/images/_common/logo.svg";
import BuildingIcon from "@/public/assets/images/companies/sidebar/building.svg";
import ClipboardIcon from "@/public/assets/images/companies/sidebar/clipboard.svg";
import BarChartIcon from "@/public/assets/images/companies/sidebar/bar-chart.svg";
import ListIcon from "@/public/assets/images/companies/sidebar/list.svg";
import BookClosedIcon from "@/public/assets/images/companies/sidebar/book-closed.svg";
import MailIcon from "@/public/assets/images/companies/sidebar/mail.svg";
import TargetIcon from "@/public/assets/images/companies/sidebar/target-05.svg";
import TargetAltIcon from "@/public/assets/images/companies/sidebar/target-03.svg";
import UsersIcon from "@/public/assets/images/companies/sidebar/users.svg";
import BarChartAltIcon from "@/public/assets/images/companies/sidebar/bar-chart-10.svg";
import AlertTriangleIcon from "@/public/assets/images/companies/sidebar/alert-triangle.svg";
import DotYellow from "@/public/assets/images/companies/sidebar/dot-yellow.svg";
import DotPink from "@/public/assets/images/companies/sidebar/dot-pink.svg";
import DotPurple from "@/public/assets/images/companies/sidebar/dot-purple.svg";
import UserPlusIcon from "@/public/assets/images/companies/sidebar/user-plus.svg";
import MessageQuestionIcon from "@/public/assets/images/companies/sidebar/message-question.svg";
import WalletIcon from "@/public/assets/images/companies/sidebar/wallet.svg";

export default function SidebarContent() {
  const companyCount = useCompaniesStore((state) => state.companies.length);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-sidebar-border bg-sidebar-accent flex shrink-0 items-center gap-2 border-b p-3">
        <Logo aria-hidden className="size-8 shrink-0 overflow-visible" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="block text-[12px] leading-tight font-bold tracking-[0.08em]">
            AI EVOLUTION
            <br />
            <span className="text-[#bca8ff]">POLSKA</span>
          </span>
          <span className="caption-style text-subtle block truncate">
            CRM · Sprzedaż i relacje
          </span>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Nawigacja główna">
          <SidebarSection className="border-sidebar-border border-b">
            <SidebarNavItem
              icon={BuildingIcon}
              label="Firmy"
              count={companyCount}
              active
            />
            <SidebarNavItem icon={ClipboardIcon} label="Tablica szans" />
            <SidebarNavItem icon={BarChartIcon} label="Prognoza" count={9} />
            <SidebarNavItem icon={ListIcon} label="Aktywności" />
            <SidebarNavItem icon={BookClosedIcon} label="Kontakty" count={38} />
            <SidebarNavItem icon={MailIcon} label="Sekwencje e-mail" />
          </SidebarSection>

          <SidebarSection
            title="Zespół"
            className="border-sidebar-border border-b"
          >
            <SidebarNavItem icon={TargetIcon} label="Klienci strategiczni" />
            <SidebarNavItem icon={TargetAltIcon} label="Średnie firmy" />
            <SidebarNavItem icon={UsersIcon} label="Pozyskiwanie klientów" />
          </SidebarSection>

          <SidebarSection
            title="Raporty"
            className="border-sidebar-border border-b"
          >
            <SidebarNavItem
              icon={BarChartAltIcon}
              label="Prognoza na I kwartał"
            />
            <SidebarNavItem icon={AlertTriangleIcon} label="Zagrożone szanse" />
          </SidebarSection>

          <SidebarSection title="Procesy sprzedaży">
            <SidebarNavItem icon={DotYellow} label="Polska" />
            <SidebarNavItem icon={DotPink} label="Duże firmy" />
            <SidebarNavItem icon={DotPurple} label="Rozwój współpracy" />
          </SidebarSection>
        </nav>
      </ScrollArea>

      <SidebarSection className="border-sidebar-border shrink-0 border-t border-b">
        <SidebarNavItem
          icon={UserPlusIcon}
          label="Zaproś do zespołu"
          tone="quiet"
        />
        <SidebarNavItem icon={MessageQuestionIcon} label="Pomoc" tone="quiet" />
      </SidebarSection>

      <div className="border-sidebar-border bg-sidebar-accent flex shrink-0 items-center justify-between gap-2 border-b p-4">
        <div className="flex flex-col gap-2">
          <span className="lead-style block font-medium tracking-[-0.01em]">
            14 dni
          </span>
          <span className="caption-style text-subtle block">
            Do końca okresu próbnego
          </span>
        </div>
        <Button variant="muted" size="md">
          <WalletIcon aria-hidden className="size-3.5" />
          Rozliczenia
        </Button>
      </div>
    </div>
  );
}
