import Map from "@/components/map/Map";
import { getCities } from "@/lib/cities";

export default async function HomePage() {
  const cities = await getCities();
  return <Map cities={cities} />;
}
