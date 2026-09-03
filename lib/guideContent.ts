import { Calendar, Flame, Users, Car, CloudSun, type LucideIcon } from "lucide-react-native";

export type GuideCategory = {
  slug: string;
  title: string;
  body: string;
  icon: LucideIcon;
  color: string;
};

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    slug: "booking-access",
    title: "Booking & Access",
    icon: Calendar,
    color: "#B8892B",
    body: `Rotorua's big paid attractions sell out. Over summer and school holidays the popular geothermal parks and cultural performances fill their entry slots for the day, so if you have your heart set on Wai-O-Tapu, Whakarewarewa or Te Puia, book ahead.

Most operators take bookings direct through their own websites, and the BookMe platform carries deals on a lot of Rotorua activities if you are chasing a discount. Either route works.`,
  },
  {
    slug: "geothermal-hot-pool-safety",
    title: "Geothermal & Hot Pool Safety",
    icon: Flame,
    color: "#C1571C",
    body: `Two rules matter more than everything else here.

Never put your head under in a natural hot spring or hot pool, and do not let water go up your nose. Warm untreated freshwater in this region can carry naegleria, a rare but serious amoeba that gets in through the nasal passage. It is not a risk in chlorinated pools or in the sea. Keep your head above the surface and you are fine.

Stay on the marked paths at geothermal parks and reserves. The crust around hot springs, mud pools and steam vents can be far thinner than it looks, with scalding water or mud sitting underneath. Stepping off track for a better photo is how people get badly burned. If something is roped off, it is roped off for a reason.

The sulphur smell that hits you on arrival is normal. It is hydrogen sulphide from the geothermal activity and it is where the Sulphur City nickname comes from. Your nose adjusts within a day or two and you stop noticing it faster than you expect.`,
  },
  {
    slug: "maori-culture-etiquette",
    title: "Māori Culture & Etiquette",
    icon: Users,
    color: "#1F4B3D",
    body: `Rotorua is one of the best places in the country to experience Māori culture directly, and a bit of care goes a long way.

At Te Puia or an evening at Te Pā Tū you are a guest at something with real significance rather than an audience at a show. Follow your host or guide, join in when you are invited.

Photography rules change by site and by moment. Landscapes and general scenery are almost always fine. People and homes are not. Ask before photographing performers, carvers at work or other visitors, and if a guide asks you to put the camera away for part of the visit, do it without negotiating.`,
  },
  {
    slug: "getting-around",
    title: "Getting Around",
    icon: Car,
    color: "#3D5A80",
    body: `Rotorua's attractions are spread around the lake and out into the surrounding forest, and public transport does not really cover them. Bay Bus Route 10 runs between the airport and downtown roughly hourly from 7am to 6pm Monday to Saturday, which covers your arrival, but most parks, walks and lookouts are a car trip away. Budget for that if you are not renting.

Renting gives you the most flexibility and works out cheapest if you are staying more than a couple of days. The trade-off is navigating and parking yourself, and some of the rural roads out to the further sites are narrow and winding. Organised shuttles and day tours cost more per visit but take the driving and parking off your plate, which is worth it on a short trip or if you would rather not drive on unfamiliar roads.

Renting a car

The airport sits about ten minutes from the city centre. You can book ahead or walk up, though walking up in peak season is a gamble.

Ezi Car Rental. One of the larger New Zealand operators with a mostly new fleet, running airport pickups plus an off-airport kiosk at 837 Te Ngae Road in Ōwhata. Baby and booster seats are available to hire but need pre-booking rather than being sorted at the counter.

RaD Car Hire. Locally owned, formerly Rent-a-Dent, and the budget option of the two with rates from around $39 a day on a week-long booking. Collect from their branch at 58 Marguerita Street, or from the airport where they leave the car in a secure park and you pick the keys up from a lockbox.

Two practical notes. After-hours returns work through a key dropbox, and the terminal locks 30 minutes after the last scheduled flight, so check your drop-off time against the flight schedule rather than the rental company's hours. And if you have only driven on the right, read up on New Zealand road rules before you collect the car. The rural roads out to Waimangu, Tarawera and Waikite are not the place to learn.

Parking

Parking at the busiest sites fills by mid morning in peak season, roughly December through February and around school holidays. Wai-O-Tapu, Whakarewarewa and the town lakefront are the worst for it. Arriving early is not just about beating the crowds inside. It is about getting a park at all.`,
  },
  {
    slug: "weather-what-to-pack",
    title: "Weather & What to Pack",
    icon: CloudSun,
    color: "#3D7A6E",
    body: `Rotorua's weather changes fast and geothermal sites add their own microclimate on top. Expect steam drifting across paths, damp ground near vents and wind that picks up suddenly around open craters. Layers are the answer. Something warm you can peel off and something wind and water resistant you can put back on, even in summer.

Footwear matters more than people expect. A lot of the best geothermal walks and forest tracks are uneven, sometimes muddy and occasionally steaming underfoot. Pack closed sturdy shoes with real grip rather than sandals or anything open-toed. Some paths are boardwalked but this is not a boardwalk-only trip.

Do not skip sun protection because the air feels damp or the sky looks grey. New Zealand's UV runs high even under cloud, and standing next to warm geothermal water does nothing to cool the sun down. Sunscreen, a hat and sunglasses go in the bag alongside the jacket, not instead of it.`,
  },
];
