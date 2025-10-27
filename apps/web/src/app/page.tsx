import { HomePage } from "@/components/home-page";
import { getMeasurementSummary, listMeasurements } from "@/server/measurements";

export const dynamic = "force-dynamic";

export default async function Home() {
  const measurements = await listMeasurements();
  const summary = await getMeasurementSummary();

  return <HomePage measurements={measurements} summary={summary} />;
}
