import { syncSource } from "@/services/opportunity-ingestion/sync-source";
export async function syncOpportunities() { return syncSource("grants-gov"); }
