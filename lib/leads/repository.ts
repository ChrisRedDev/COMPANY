import type { Lead, LeadBundle, LeadFilters, LeadPage } from "./model";
export type LeadWrite = { lead: Lead; duplicate: boolean };
export interface LeadRepository {
  list(wid: string, filters: LeadFilters): Promise<LeadPage>;
  read(wid: string, lid: string): Promise<LeadBundle>;
  identity(wid: string, email: string, phone: string): Promise<Lead[]>;
  write(
    wid: string,
    bundle: LeadBundle,
    expected: number,
    create: boolean,
  ): Promise<LeadWrite>;
}
