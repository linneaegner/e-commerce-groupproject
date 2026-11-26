// Temats tillåtna kategorier (beauty + mode). Allt annat (teknik, bilar, etc.) filtreras bort.

export const THEME_CATEGORIES = [
  { slug: "beauty", label: "Makeup", group: "Beauty" },
  { slug: "fragrances", label: "Fragrances", group: "Beauty" },
  { slug: "skin-care", label: "Skin care", group: "Beauty" },
  { slug: "womens-dresses", label: "Dresses", group: "Women" },
  { slug: "tops", label: "Tops", group: "Women" },
  { slug: "womens-shoes", label: "Shoes", group: "Women" },
  { slug: "womens-bags", label: "Bags", group: "Women" },
  { slug: "womens-jewellery", label: "Jewellery", group: "Women" },
  { slug: "womens-watches", label: "Watches", group: "Women" },
  { slug: "sunglasses", label: "Sunglasses", group: "Women" },
  { slug: "mens-shirts", label: "Shirts", group: "Men" },
  { slug: "mens-shoes", label: "Shoes", group: "Men" },
  { slug: "mens-watches", label: "Watches", group: "Men" },
];

export const THEME_GROUPS = ["Beauty", "Women", "Men"];

export function isThemeCategory(slug) {
  return THEME_CATEGORIES.some((category) => category.slug === slug);
}

export function getCategoriesByGroup(group) {
  return THEME_CATEGORIES.filter((category) => category.group === group);
}

export function getCategoryLabel(slug) {
  const match = THEME_CATEGORIES.find((category) => category.slug === slug);
  return match ? match.label : slug;
}
