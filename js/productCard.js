// Gemensamt produktkort – används på startsidan och i katalogen.

import {
  addToCart,
  getFavorites,
  toggleFavorite,
} from "./storage.js";
import { showToast } from "./dialog.js";
import { updateCartBadge } from "./navigation.js";

export function createProductCard(product) {
  const isFavorite = getFavorites().includes(product.id);
  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.id = product.id;
  card.innerHTML = `
    <a href="product.html?id=${product.id}">
      <img src="${product.thumbnail ?? ""}" alt="${product.title ?? ""}" loading="lazy" width="300" height="400">
    </a>
    <div class="product-info">
      <div class="product-info-text">
        <a href="product.html?id=${product.id}">${product.title ?? ""}</a>
        <p>$${product.price}</p>
      </div>
      <div class="product-info-icons">
        <button type="button" class="toggle-favorite-btn${isFavorite ? " active" : ""}" aria-label="${isFavorite ? "Remove from favorites" : "Add to favorites"}">
          <img src="assets/icons/${isFavorite ? "heart-filled" : "heart"}.svg" alt="" width="18" height="18">
        </button>
        <button type="button" class="add-to-cart-btn" aria-label="Add to cart">
          <img src="assets/icons/shopping-bag.svg" alt="" width="18" height="18">
        </button>
      </div>
    </div>
  `;
  return card;
}

// INFO: findProduct(id) låter anroparen hämta produktnamn för toasten
export function handleProductCardClick(event, findProduct) {
  const cartBtn = event.target.closest(".add-to-cart-btn");
  const favBtn = event.target.closest(".toggle-favorite-btn");
  if (!cartBtn && !favBtn) return;

  const card = event.target.closest(".product-card");
  if (!card) return;

  const productId = Number(card.dataset.id);

  if (cartBtn) {
    addToCart(productId);
    updateCartBadge();
    const product = findProduct?.(productId);
    const title = product?.title ?? "Product";
    showToast(`${title} added to cart`);
  } else if (favBtn) {
    toggleFavorite(productId);
    const isFavorite = getFavorites().includes(productId);
    favBtn.classList.toggle("active", isFavorite);
    favBtn.querySelector("img").src = `assets/icons/${isFavorite ? "heart-filled" : "heart"}.svg`;
    favBtn.setAttribute(
      "aria-label",
      isFavorite ? "Remove from favorites" : "Add to favorites"
    );
  }
}
