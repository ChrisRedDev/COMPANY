export type NotificationKind =
  | "mention"
  | "stage"
  | "alert"
  | "update"
  | "invite";

export type Notification = {
  id: string;
  kind: NotificationKind;
  actor?: string;
  companyId: string;
  message: string;
  quote?: string;
  time: string;
  unread: boolean;
};

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    kind: "mention",
    actor: "Marek Kamiński",
    companyId: "microsoft",
    message: "wspomina o Tobie w notatce dotyczącej Microsoft",
    quote:
      "Czy możesz dołączyć do przeglądu pilotażu w piątek? Dział zakupów chce omówić bezpieczeństwo.",
    time: "2 min temu",
    unread: true,
  },
  {
    id: "n2",
    kind: "stage",
    actor: "Anna Kowalska",
    companyId: "lvmh",
    message: "zmienia etap firmy LVMH na Odnowienie",
    time: "18 min temu",
    unread: true,
  },
  {
    id: "n3",
    kind: "alert",
    companyId: "slack",
    message: "Szansa wygranej dla Slack spadła do 23%",
    time: "1 godz. temu",
    unread: true,
  },
  {
    id: "n4",
    kind: "update",
    actor: "Ewa Jankowska",
    companyId: "shopify",
    message: "aktualizuje ocenę dopasowania biznesowego dla Shopify",
    time: "3 godz. temu",
    unread: false,
  },
  {
    id: "n5",
    kind: "update",
    actor: "Michał Piotrowski",
    companyId: "stripe",
    message: "zapisuje prezentację dla Stripe",
    time: "Wczoraj",
    unread: false,
  },
  {
    id: "n6",
    kind: "alert",
    companyId: "snowflake",
    message: "Wartość szans dla Snowflake wzrosła do 520 000 zł",
    time: "2 dni temu",
    unread: false,
  },
  {
    id: "n7",
    kind: "invite",
    actor: "Grażyna Grabowska",
    companyId: "hubspot",
    message: "dodaje Cię do zespołu obsługującego Hubspot",
    time: "3 dni temu",
    unread: false,
  },
];
