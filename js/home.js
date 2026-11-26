// Startsida: utvalda produkter från API och kategori-länkar.

import { fetchProductsByCategory } from "./api.js";
import { applyLocalChanges } from "./storage.js";
import { createProductCard, handleProductCardClick } from "./productCard.js";

let knownProducts = [];

function findKnownProduct(id) {
  return knownProducts.find((product) => Number(product.id) === Number(id));
}

function renderFeaturedProducts(container, products) {
  container.innerHTML = "";
  products.forEach((product) => {
    knownProducts.push(product);
    container.appendChild(createProductCard(product));
  });
}

async function loadFeaturedSection(sectionElement) {
  const slug = sectionElement.dataset.category;
  const status = sectionElement.querySelector(".section-status");
  const grid = sectionElement.querySelector(".home-grid");

  try {
    const data = await fetchProductsByCategory(slug, {
      limit: 4,
      sortBy: "rating",
      order: "desc",
    });

    const products = applyLocalChanges(data.products);

    if (products.length === 0) {
      status.textContent = "No products to show right now.";
      return;
    }

    status.hidden = true;
    renderFeaturedProducts(grid, products);
  } catch (error) {
    status.textContent = "Could not load products. Please try again later.";
    status.classList.add("status-message--error");
  }
}

document.querySelectorAll(".home-section[data-category]").forEach((section) => {
  const grid = section.querySelector(".home-grid");
  grid.addEventListener("click", (event) => {
    handleProductCardClick(event, findKnownProduct);
  });
  loadFeaturedSection(section);
});
