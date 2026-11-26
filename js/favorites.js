// Favoritsida: visa och ta bort favoriter från LocalStorage.

import {
  getFavorites,
  removeFromFavorites,
  getLocalProduct,
  isProductDeleted,
  isLocalCreatedProduct,
  applyLocalChanges,
} from "./storage.js";
import { fetchSingleProduct } from "./api.js";

const favoriteItems = document.querySelector("#favorite-items");
const favoritesEmpty = document.querySelector("#favorites-empty");
const backLink = document.querySelector("#back-link");

const favorites = getFavorites();

// INFO: lokal CRUD först – skapade produkter finns inte på DummyJSON
async function loadFavoriteProduct(id) {
  if (isProductDeleted(id)) return null;

  const localProduct = getLocalProduct(id);
  if (localProduct && isLocalCreatedProduct(localProduct)) {
    return localProduct;
  }

  try {
    const fromApi = await fetchSingleProduct(id);
    return applyLocalChanges([fromApi])[0] ?? null;
  } catch (error) {
    return localProduct;
  }
}

async function showFavorites() {
  favoritesEmpty.hidden = false;
  favoritesEmpty.textContent = "Loading favorites...";

  try {
    for (const id of favorites) {
      const product = await loadFavoriteProduct(id);

      if (!product) {
        removeFromFavorites(id);
        continue;
      }

      const card = document.createElement("li");
      card.className = "favorite-item";

      const image = document.createElement("img");
      image.className = "favorite-image";
      image.src = product.thumbnail;
      image.alt = product.title;

      const imageLink = document.createElement("a");
      imageLink.href = `product.html?id=${product.id}`;
      imageLink.append(image);

      const info = document.createElement("div");
      info.className = "favorite-info";

      const name = document.createElement("p");
      name.textContent = product.title;

      const nameLink = document.createElement("a");
      nameLink.href = `product.html?id=${product.id}`;
      nameLink.append(name);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-product-btn";
      removeButton.textContent = "Remove";

      info.append(nameLink, removeButton);
      card.append(imageLink, info);
      favoriteItems.append(card);

      removeButton.addEventListener("click", () => {
        removeFromFavorites(id);
        card.remove();
        favoritesEmpty.hidden = getFavorites().length > 0;
      });
    }

    favoritesEmpty.textContent = "You haven’t added any favorites yet.";
    favoritesEmpty.hidden = getFavorites().length > 0;
  } catch (error) {
    favoritesEmpty.hidden = false;
    favoritesEmpty.textContent = "Could not load all favorites. Please reload the page.";
  }
}

showFavorites();

backLink.addEventListener("click", (e) => {
  if (history.length > 1) {
    e.preventDefault();
    history.back();
  }
});
