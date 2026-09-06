import db from "@/utils/db";
import HeroCarouselClient, { HeroSlide } from "./HeroCarouselClient";

const defaultHeroImages: HeroSlide[] = [
  {
    id: "default-1",
    title: "High Performance Gaming PCs",
    image: "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg",
  },
  {
    id: "default-2",
    title: "Next-Gen Graphics & Processors",
    image: "https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg",
  },
  // {
  //   id: "default-3",
  //   title: "Premium PC Accessories & Gear",
  //   image: "/img-1.jpg",
  // },
];

async function HeroCarousel() {
  let heroes: HeroSlide[] = [];
  try {
    heroes = await db.hero.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (error) {
    console.error("Error fetching hero images:", error);
  }

  const items = heroes && heroes.length > 0 ? heroes : defaultHeroImages;

  return <HeroCarouselClient items={items} />;
}

export default HeroCarousel;
