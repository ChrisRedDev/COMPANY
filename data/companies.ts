export const SEGMENTS = [
  "Duże firmy",
  "Średnie firmy",
  "MŚP",
  "Strategiczne",
] as const;

export const STAGES = [
  "Nowy klient",
  "Dosprzedaż",
  "Rozwój",
  "Odnowienie",
  "Pilotaż",
  "Wspólna sprzedaż",
  "Pozyskanie i rozwój",
] as const;

export type Segment = (typeof SEGMENTS)[number];
export type Stage = (typeof STAGES)[number];
export type Tag = Segment | Stage;

export type TagTone =
  | "blue"
  | "purple"
  | "green"
  | "moss"
  | "red"
  | "orange"
  | "amber"
  | "teal"
  | "yellow"
  | "neutral";

export const TAG_TONES: Record<Tag, TagTone> = {
  "Duże firmy": "blue",
  "Średnie firmy": "moss",
  MŚP: "yellow",
  Strategiczne: "red",
  "Nowy klient": "green",
  Dosprzedaż: "purple",
  Rozwój: "green",
  Odnowienie: "green",
  Pilotaż: "orange",
  "Wspólna sprzedaż": "amber",
  "Pozyskanie i rozwój": "teal",
};

export type Owner = {
  name: string;
  avatar: string;
  email: string;
  phone: string;
  role: string;
};

const AVATARS = Array.from(
  { length: 10 },
  (_, i) => `/assets/images/_common/avatars/avatar-${i + 1}.png`,
);

const OWNER_NAMES = [
  "Anna Kowalska",
  "Jan Nowak",
  "Maria Wiśniewska",
  "Natalia Wójcik",
  "Aleksander Kowalczyk",
  "Marek Kamiński",
  "Andrzej Lewandowski",
  "Karolina Zielińska",
  "Jakub Szymański",
  "Katarzyna Woźniak",
  "Ryszard Dąbrowski",
  "Hanna Kozłowska",
  "Ewa Jankowska",
  "Oliwier Mazur",
  "Agnieszka Krawczyk",
  "Michał Piotrowski",
  "Grażyna Grabowska",
  "Zofia Pawłowska",
];

export const OWNERS: Owner[] = OWNER_NAMES.map((name, i) => ({
  name,
  avatar: AVATARS[i % AVATARS.length],
  email: `${name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(" ", ".")}@example.com`,
  phone: `+48 500 ${String(100 + i).padStart(3, "0")} ${String(200 + i * 7).padStart(3, "0")}`,
  role: i % 3 === 0 ? "Starszy opiekun klienta" : "Opiekun klienta",
}));

export const CURRENT_USER: Owner = {
  name: "Tomasz Nowak",
  avatar: "/assets/images/_common/avatars/jensen.png",
  email: "tomasz.nowak@example.com",
  phone: "+48 500 100 200",
  role: "Dyrektor sprzedaży",
};

export function ownerByName(name: string): Owner {
  return OWNERS.find((owner) => owner.name === name) ?? OWNERS[0];
}

export function profileByName(name: string): Owner {
  return name === CURRENT_USER.name ? CURRENT_USER : ownerByName(name);
}

export type Company = {
  id: string;
  name: string;
  tags: Tag[];
  owner: string;
  openDeals: number;
  pipelineValue: number;
  winProbability: number;
  trend: number[];
  lastInteraction: { date: string; label: string };
  activityDays: number;
  logo?: string;
};

export const TREND_PATTERN = [
  false,
  true,
  true,
  false,
  true,
  true,
  false,
  true,
  false,
  true,
  false,
  true,
  true,
  false,
];

export const DEFAULT_TREND = [4, 4, 5, 5, 2, 7, 11, 7, 5, 7, 5, 3, 7, 14];

const TREND_A = [4, 4, 10, 3, 2, 4, 7, 4, 11, 4, 11, 7, 4, 14];
const TREND_B = [4, 4, 5, 5, 2, 7, 11, 7, 5, 7, 5, 3, 7, 14];
const TREND_C = [4, 4, 10, 5, 2, 7, 11, 7, 11, 7, 11, 7, 7, 14];
const TREND_D = [4, 4, 5, 12, 5, 7, 11, 3, 11, 3, 11, 3, 7, 14];

const COMPANY_RECORDS: Omit<Company, "logo">[] = [
  {
    id: "lvmh",
    name: "LVMH",
    tags: ["Duże firmy", "Dosprzedaż", "Rozwój", "Odnowienie"],
    owner: "Anna Kowalska",
    openDeals: 7,
    pipelineValue: 420000,
    winProbability: 70,
    trend: TREND_A,
    lastInteraction: { date: "2026-02-21", label: "Przegląd kwartalny" },
    activityDays: 88,
  },
  {
    id: "disney",
    name: "Disney",
    tags: ["Duże firmy", "Nowy klient"],
    owner: "Jan Nowak",
    openDeals: 4,
    pipelineValue: 311242,
    winProbability: 51,
    trend: TREND_B,
    lastInteraction: { date: "2026-02-22", label: "Prezentacja" },
    activityDays: 87,
  },
  {
    id: "paypal",
    name: "Paypal",
    tags: ["Duże firmy"],
    owner: "Maria Wiśniewska",
    openDeals: 5,
    pipelineValue: 124232,
    winProbability: 22,
    trend: TREND_C,
    lastInteraction: { date: "2026-03-12", label: "Bezpieczeństwo" },
    activityDays: 84,
  },
  {
    id: "united-airlines",
    name: "United Airlines",
    tags: ["Odnowienie"],
    owner: "Natalia Wójcik",
    openDeals: 2,
    pipelineValue: 221231,
    winProbability: 77,
    trend: TREND_D,
    lastInteraction: { date: "2026-03-17", label: "Kwestie prawne" },
    activityDays: 81,
  },
  {
    id: "apple",
    name: "Apple",
    tags: ["Pilotaż"],
    owner: "Aleksander Kowalczyk",
    openDeals: 6,
    pipelineValue: 530111,
    winProbability: 82,
    trend: TREND_C,
    lastInteraction: { date: "2026-03-12", label: "Spotkanie z zarządem" },
    activityDays: 83,
  },
  {
    id: "microsoft",
    name: "Microsoft",
    tags: ["Strategiczne", "Rozwój"],
    owner: "Marek Kamiński",
    openDeals: 8,
    pipelineValue: 320222,
    winProbability: 86,
    trend: TREND_C,
    lastInteraction: { date: "2026-03-15", label: "Pilotaż" },
    activityDays: 79,
  },
  {
    id: "airbnb",
    name: "Airbnb",
    tags: ["Dosprzedaż", "Rozwój", "MŚP", "Pilotaż"],
    owner: "Andrzej Lewandowski",
    openDeals: 3,
    pipelineValue: 122230,
    winProbability: 51,
    trend: TREND_B,
    lastInteraction: { date: "2026-03-18", label: "Wycena" },
    activityDays: 78,
  },
  {
    id: "intercom",
    name: "Intercom",
    tags: ["Duże firmy", "Średnie firmy"],
    owner: "Karolina Zielińska",
    openDeals: 5,
    pipelineValue: 230112,
    winProbability: 61,
    trend: TREND_C,
    lastInteraction: { date: "2026-03-28", label: "Produkt" },
    activityDays: 74,
  },
  {
    id: "attio",
    name: "Attio",
    tags: ["Średnie firmy", "Dosprzedaż", "Odnowienie", "Wspólna sprzedaż"],
    owner: "Jakub Szymański",
    openDeals: 2,
    pipelineValue: 420222,
    winProbability: 38,
    trend: TREND_C,
    lastInteraction: { date: "2026-06-14", label: "Wycena" },
    activityDays: 58,
  },
  {
    id: "google",
    name: "Google",
    tags: ["MŚP", "Duże firmy", "Rozwój", "Pilotaż"],
    owner: "Katarzyna Woźniak",
    openDeals: 8,
    pipelineValue: 112277,
    winProbability: 24,
    trend: TREND_B,
    lastInteraction: { date: "2026-06-07", label: "Odnowienie" },
    activityDays: 62,
  },
  {
    id: "netflix",
    name: "Netflix",
    tags: ["Średnie firmy"],
    owner: "Ryszard Dąbrowski",
    openDeals: 3,
    pipelineValue: 221221,
    winProbability: 72,
    trend: TREND_C,
    lastInteraction: { date: "2026-06-18", label: "Pilotaż" },
    activityDays: 55,
  },
  {
    id: "spotify",
    name: "Spotify",
    tags: ["Pozyskanie i rozwój", "Rozwój", "Strategiczne"],
    owner: "Hanna Kozłowska",
    openDeals: 5,
    pipelineValue: 170991,
    winProbability: 55,
    trend: TREND_C,
    lastInteraction: { date: "2026-07-01", label: "Rozwój" },
    activityDays: 48,
  },
  {
    id: "shopify",
    name: "Shopify",
    tags: ["Wspólna sprzedaż", "Rozwój"],
    owner: "Ewa Jankowska",
    openDeals: 9,
    pipelineValue: 139007,
    winProbability: 45,
    trend: TREND_C,
    lastInteraction: { date: "2026-07-18", label: "Odnowienie" },
    activityDays: 40,
  },
  {
    id: "zoom",
    name: "Zoom",
    tags: ["Rozwój", "Pozyskanie i rozwój", "Odnowienie"],
    owner: "Oliwier Mazur",
    openDeals: 8,
    pipelineValue: 289921,
    winProbability: 38,
    trend: TREND_D,
    lastInteraction: { date: "2026-08-08", label: "Partner" },
    activityDays: 27,
  },
  {
    id: "slack",
    name: "Slack",
    tags: ["Średnie firmy", "Wspólna sprzedaż"],
    owner: "Agnieszka Krawczyk",
    openDeals: 4,
    pipelineValue: 333221,
    winProbability: 23,
    trend: TREND_C,
    lastInteraction: { date: "2026-08-12", label: "Rozpoznanie potrzeb" },
    activityDays: 24,
  },
  {
    id: "stripe",
    name: "Stripe",
    tags: ["Rozwój", "MŚP", "Dosprzedaż", "Pilotaż"],
    owner: "Michał Piotrowski",
    openDeals: 3,
    pipelineValue: 442231,
    winProbability: 44,
    trend: TREND_C,
    lastInteraction: { date: "2026-09-09", label: "Prezentacja" },
    activityDays: 8,
  },
  {
    id: "snowflake",
    name: "Snowflake",
    tags: ["Duże firmy", "Średnie firmy"],
    owner: "Grażyna Grabowska",
    openDeals: 6,
    pipelineValue: 520000,
    winProbability: 24,
    trend: TREND_C,
    lastInteraction: { date: "2026-09-11", label: "Wycena" },
    activityDays: 6,
  },
  {
    id: "hubspot",
    name: "Hubspot",
    tags: ["Rozwój", "Wspólna sprzedaż", "Odnowienie", "Pilotaż"],
    owner: "Zofia Pawłowska",
    openDeals: 2,
    pipelineValue: 210123,
    winProbability: 52,
    trend: TREND_C,
    lastInteraction: { date: "2026-09-18", label: "Przegląd kwartalny" },
    activityDays: 2,
  },
];

export const COMPANIES: Company[] = COMPANY_RECORDS.map((company) => ({
  ...company,
  logo: `/assets/images/companies/logos/${company.id}.svg`,
}));

export const SORT_OPTIONS = [
  { value: "pipelineValue", label: "Wartość szans" },
  { value: "winProbability", label: "Szansa wygranej" },
  { value: "openDeals", label: "Otwarte szanse" },
  { value: "lastInteraction", label: "Ostatni kontakt" },
  { value: "name", label: "Nazwa firmy" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const INTERACTION_TYPES = [
  "Rozpoznanie potrzeb",
  "Prezentacja",
  "Wycena",
  "Bezpieczeństwo",
  "Kwestie prawne",
  "Produkt",
  "Pilotaż",
  "Spotkanie z zarządem",
  "Przegląd kwartalny",
  "Partner",
  "Odnowienie",
  "Rozwój",
] as const;

export const ACTIVITY_WINDOWS = [7, 30, 60, 90] as const;

export type ActivityWindow = (typeof ACTIVITY_WINDOWS)[number];

export const TREND_WINDOWS = [
  "Ostatnie 7 dni",
  "Ostatnie 30 dni",
  "Ostatnie 90 dni",
];

export type ScoreCard = {
  title: string;
  description: string;
  reviewer: string;
  reviewerAvatar: string;
  updated: string;
  verdict: string;
  stars: number;
};

export const SCORE_CARDS: ScoreCard[] = [
  {
    title: "Dopasowanie biznesowe",
    description:
      "Ocena dopasowania firmy do profilu naszego idealnego klienta.",
    reviewer: "Ewa Jankowska",
    reviewerAvatar: "/assets/images/_common/avatars/detail-2.png",
    updated: "Aktualizacja 2 godz. temu",
    verdict: "Wysoki potencjał",
    stars: 4,
  },
  {
    title: "Dopasowanie techniczne",
    description:
      "Ocena zgodności technicznej, wymagań bezpieczeństwa i gotowości do integracji.",
    reviewer: "Ryszard Dąbrowski",
    reviewerAvatar: "/assets/images/_common/avatars/detail-3.png",
    updated: "Aktualizacja 2 godz. temu",
    verdict: "Wysoki potencjał",
    stars: 4,
  },
  {
    title: "Dopasowanie techniczne",
    description:
      "Ocena zgodności technicznej, wymagań bezpieczeństwa i gotowości do integracji.",
    reviewer: "Paweł Król",
    reviewerAvatar: "/assets/images/_common/avatars/detail-1.png",
    updated: "Aktualizacja 2 godz. temu",
    verdict: "Wysoki potencjał",
    stars: 4,
  },
];
