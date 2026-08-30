import type { Metadata } from "next";
import Map from "@/components/map/Map";
import { SITE_NAME } from "@/lib/site";

// The map is the landing page and the tab is just the site. `absolute` opts out
// of the root layout's "%s · ErasmusMap" template, which would otherwise repeat
// the name; the tagline stays where it is useful, in the description and the
// Open Graph card.
export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
};

export default function HomePage() {
  return <Map />;
}
