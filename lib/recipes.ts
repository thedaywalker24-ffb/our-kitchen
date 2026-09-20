export type Recipe = {
  id: string;
  title: string;
  description: string;
  image: string;
  source: string;
  sourceUrl?: string;
  yield: string;
  active: string;
  total: string;
  categories: string[];
  ingredients: { section?: string; items: string[] }[];
  steps: string[];
  notes?: string;
};

export const recipes: Recipe[] = [
  {
    id: "1001",
    title: "Oven-Roasted Whole Chicken",
    description: "Juicy roast chicken with crisp skin, lemon, garlic, and rosemary.",
    image: "/images/roast-chicken.jpg",
    source: "Where Is My Spoon",
    sourceUrl: "https://whereismyspoon.co/how-to-roast-a-whole-chicken-in-the-oven/",
    yield: "4 servings",
    active: "10 min",
    total: "1 hr 30 min",
    categories: ["Chicken", "Family recipe"],
    ingredients: [
      {
        items: [
          "1 whole chicken, about 2.6 lb",
          "1 1/2 tsp fine sea salt",
          "1 lemon",
          "1 whole garlic head",
          "5 sprigs fresh rosemary",
          "2 tbsp butter",
          "Sweet paprika and black pepper",
        ],
      },
    ],
    steps: [
      "Preheat the oven to 400°F. Pat the chicken dry inside and out.",
      "Season the cavity with salt. Halve the lemon and garlic head, then place them inside with three rosemary sprigs.",
      "Place the chicken breast-side up in a roasting pan. Brush with melted butter, then season with rosemary, paprika, and pepper.",
      "Roast for about 1 hour 20 minutes, covering loosely with foil if the skin darkens too quickly.",
      "Check the thickest part of the thigh reaches 165°F, then rest 10–15 minutes before carving.",
    ],
  },
  {
    id: "1002",
    title: "Creamy Dijon Chicken",
    description: "Pan-seared chicken with herby potatoes, asparagus, and a bright Dijon sauce.",
    image: "/images/dijon-chicken.jpg",
    source: "EveryPlate",
    yield: "4 servings",
    active: "10 min",
    total: "35 min",
    categories: ["Chicken", "Weeknight"],
    ingredients: [
      { items: ["Chicken breasts", "10 Yukon Gold potatoes", "1 bunch asparagus", "2 cloves garlic", "Scallions"] },
      { section: "Dijon sauce", items: ["Chicken stock concentrate", "Sour cream", "Dijon mustard", "2 tbsp butter"] },
    ],
    steps: [
      "Heat the oven to 450°F. Dice potatoes, trim asparagus, and prepare the garlic and scallions.",
      "Roast potatoes with oil and seasoning for 20–25 minutes. Add asparagus for the final 10–12 minutes.",
      "Season and pan-sear the chicken until browned and cooked through, 5–6 minutes per side. Rest before slicing.",
      "Cook garlic and scallion whites briefly. Add stock, then stir in sour cream, mustard, and butter off heat.",
      "Plate the chicken and vegetables, spoon over the sauce, and finish with scallion greens.",
    ],
  },
  {
    id: "1003",
    title: "Pistachio Drop Cookies",
    description: "Tender pistachio cookies finished with optional brown butter icing.",
    image: "/images/pistachio-cookies.jpg",
    source: "Sally's Baking Addiction",
    sourceUrl: "https://sallysbakingaddiction.com/pistachio-cookies/",
    yield: "3 dozen",
    active: "45 min",
    total: "1 hr",
    categories: ["Dessert", "Baking"],
    ingredients: [
      { section: "Cookies", items: ["1 cup pistachios", "1 cup unsalted butter", "3/4 cup confectioners’ sugar", "2 cups all-purpose flour", "Vanilla and almond extracts"] },
      { section: "Brown butter icing", items: ["4 tbsp unsalted butter", "1 cup confectioners’ sugar", "2 tbsp milk or cream", "1/4 tsp vanilla"] },
    ],
    steps: [
      "Pulse pistachios into fine crumbs and set aside.",
      "Beat butter until creamy. Add sugar and extracts, then mix in flour and pistachio crumbs.",
      "Cover and chill the dough for 30 minutes.",
      "Heat the oven to 350°F. Roll tablespoon portions into balls and place two inches apart.",
      "Bake 14–15 minutes. Cool before dipping or drizzling with brown butter icing.",
    ],
  },
  {
    id: "1005",
    title: "Chicken Cobbler Pot Pie",
    description: "A cozy rotisserie chicken casserole with vegetables and cheddar biscuit topping.",
    image: "/images/chicken-cobbler.jpg",
    source: "Family collection",
    yield: "6 servings",
    active: "15 min",
    total: "1 hr",
    categories: ["Chicken", "Comfort food"],
    ingredients: [
      { items: ["1/2 cup butter", "4 cups shredded rotisserie chicken", "15 oz frozen mixed vegetables", "1 package cheddar biscuit mix", "2 cups milk", "1 can cream of chicken soup", "2 cups chicken stock"] },
    ],
    steps: [
      "Heat the oven to 375°F and melt the butter in a 9×13-inch baking dish.",
      "Layer chicken and frozen vegetables evenly over the butter.",
      "Mix biscuit mix with milk and pour over the chicken without stirring.",
      "Whisk soup and stock until smooth. Pour over the biscuit layer without stirring.",
      "Bake uncovered for about 45 minutes. Rest for 10 minutes before serving.",
    ],
  },
  {
    id: "1006",
    title: "High-Protein Banana Bread",
    description: "A quick single-serving banana bread made in the microwave.",
    image: "/images/banana-bread.jpg",
    source: "Family collection",
    yield: "1 serving",
    active: "5 min",
    total: "7 min",
    categories: ["Breakfast", "Quick"],
    ingredients: [
      { items: ["1/2 cup Kodiak Power Cakes mix", "1 egg", "1/2 ripe banana", "1/3 cup milk", "Cinnamon", "Chocolate chips"] },
    ],
    steps: [
      "Mash the banana in a microwave-safe bowl.",
      "Mix in the pancake mix, egg, milk, cinnamon, and chocolate chips.",
      "Microwave for 2 minutes, checking for doneness before serving.",
    ],
  },
  {
    id: "1008",
    title: "Tejuino",
    description: "A tangy-sweet traditional Mexican fermented corn drink with lime.",
    image: "/images/tejuino.jpg",
    source: "Family collection",
    yield: "4 servings",
    active: "10 min",
    total: "2 days",
    categories: ["Beverage", "Mexican"],
    ingredients: [
      { items: ["1 cup masa harina", "4 cups water, divided", "1 cone piloncillo or 3/4 cup brown sugar", "Juice of 2 limes", "Pinch of salt", "Crushed ice"] },
    ],
    steps: [
      "Mix masa harina with 2 cups warm water until smooth.",
      "Cook over medium heat, stirring constantly, until thickened, about 5–7 minutes.",
      "Add piloncillo and the remaining water. Stir until dissolved.",
      "Pour into a glass jar, cover loosely, and ferment at room temperature for 24–48 hours.",
      "Stir in lime juice, chill, and serve over crushed ice.",
    ],
  },
];

export const categoryOptions = ["All", "Chicken", "Breakfast", "Dessert", "Family recipe", "Mexican"];
