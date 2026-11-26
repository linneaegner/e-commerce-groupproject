// Produktdetalj: visa produkt, favorit, varukorg, update och delete.

import { fetchSingleProduct, updateProduct, deleteProduct } from "./api.js";
import {
  addToCart,
  getFavorites,
  toggleFavorite,
  getLocalProduct,
  saveLocalProduct,
  markProductAsDeleted,
  isProductDeleted,
  isLocalCreatedProduct,
} from "./storage.js";
import { showAlert, showConfirm, showToast } from "./dialog.js";
import { updateCartBadge } from "./navigation.js";

const productId = Number(new URLSearchParams(location.search).get("id"));
const productContainer = document.getElementById("product-container");
const reviewsList = document.getElementById("reviews-list");
const breadcrumbTitle = document.getElementById("breadcrumb-title");

let currentProduct = null;

function getStars(rating) {
  const filled = Math.round(Number(rating) || 0);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function formatReviewDate(dateText) {
  return new Date(dateText).toLocaleDateString("sv-SE");
}

function showEditMode() {
  const editForm = document.getElementById("edit-product-form");
  const productView = document.getElementById("product-view");
  const editBtn = document.getElementById("edit-product-btn");
  const actions = document.getElementById("product-details-actions");

  productView.style.display = "none";
  editForm.style.display = "flex";
  editBtn.style.display = "none";
  actions.style.display = "none";
}

function createProductDetail(product) {
  const isFavorite = getFavorites().includes(product.id);
  const images = product.images?.length ? product.images : [product.thumbnail];
  const thumbnailsHtml =
    images.length > 1
      ? `<div class="product-thumbnails">
            ${images
              .map(
                (src, i) => `
              <button type="button" class="product-thumbnail${i === 0 ? " is-active" : ""}" data-src="${src}" aria-label="Show image ${i + 1}">
                <img src="${src}" alt="">
              </button>
            `
              )
              .join("")}
          </div>`
      : "";

  const article = document.createElement("article");
  article.className = "product";
  article.id = "product";
  article.dataset.id = product.id;

  article.innerHTML = `
        <div class="product-gallery">
            <img id="product-main-image" class="product-main-image" src="${images[0] ?? ""}" alt="${product.title ?? ""}">
            ${thumbnailsHtml}
        </div>

        <div class="product-details">
            <button type="button" id="edit-product-btn" class="edit-product-btn">Edit</button>

            <div class="product-details-text" id="product-view">
                <h1>${product.title ?? ""}</h1>
                <p class="brand">${product.brand ?? ""}</p>
                <p class="price">$${product.price}</p>
                ${
                  product.stock != null
                    ? `<p class="stock">${product.availabilityStatus ?? "In Stock"} · ${product.stock} left</p>`
                    : ""
                }
                <span class="category">${product.category ?? ""}</span>
                <p class="description">${product.description ?? ""}</p>
            </div>

            <form id="edit-product-form" class="product-form product-edit-form">
                <label>
                    Title
                    <input type="text" name="title" value="${product.title ?? ""}" required>
                </label>
                <label>
                    Brand
                    <input type="text" name="brand" value="${product.brand ?? ""}">
                </label>
                <label>
                    Price
                    <input type="number" name="price" value="${product.price ?? ""}" min="0" step="0.01" required>
                </label>
                <label>
                    Category
                    <input type="text" name="category" value="${product.category ?? ""}" required>
                </label>
                <label>
                    Description
                    <textarea name="description" rows="4">${product.description ?? ""}</textarea>
                </label>
                <div class="product-form-actions">
                    <button type="submit" id="save-edit-btn" class="save-btn">Save</button>
                    <button type="button" id="cancel-edit-btn" class="cancel-btn">Cancel</button>
                    <button type="button" id="delete-product-btn" class="delete-btn">Delete product</button>
                </div>
            </form>

            <div class="product-details-actions" id="product-details-actions">
                <button type="button" id="add-to-cart-btn" class="add-to-cart-btn">
                    <img src="assets/icons/shopping-bag-white.svg" alt="" width="18" height="18">
                    <span>Add to cart</span>
                </button>
                <button type="button" id="toggle-favorite-btn" class="toggle-favorite-btn${isFavorite ? " active" : ""}" aria-label="${isFavorite ? "Remove from favorites" : "Save as favorite"}">
                    <img src="assets/icons/${isFavorite ? "heart-filled" : "heart"}.svg" alt="" width="18" height="18">
                    <span>${isFavorite ? "Remove from favorites" : "Save as favorite"}</span>
                </button>
            </div>
        </div>
    `;

  return article;
}

function createReviewItem(review) {
  const li = document.createElement("li");
  li.className = "review";
  li.innerHTML = `
        <p class="review-name">${review.reviewerName ?? "Anonymous"}</p>
        <p class="review-rating">${getStars(review.rating)}</p>
        <p class="review-comment">${review.comment ?? ""}</p>
        <p class="review-date">${formatReviewDate(review.date)}</p>
    `;
  return li;
}

function renderProduct() {
  productContainer.innerHTML = "";
  productContainer.appendChild(createProductDetail(currentProduct));

  breadcrumbTitle.textContent = currentProduct.title ?? "Product Details";
  document.title = currentProduct.title
    ? `${currentProduct.title} – ELLUNE`
    : "Product Details – ELLUNE";
}

function renderReviews(reviews) {
  reviewsList.innerHTML = "";

  if (!reviews || reviews.length === 0) {
    const empty = document.createElement("li");
    empty.className = "review";
    empty.textContent = "No reviews yet.";
    reviewsList.appendChild(empty);
    return;
  }

  reviews.forEach((review) => {
    reviewsList.appendChild(createReviewItem(review));
  });
}

async function loadProduct() {
  if (!productId) {
    window.location.href = "products.html";
    return;
  }

  if (isProductDeleted(productId)) {
    productContainer.innerHTML =
      '<p class="status-message status-message--error">This product has been deleted.</p>';
    return;
  }

  productContainer.innerHTML = '<p class="status-message">Loading product...</p>';
  const localProduct = getLocalProduct(productId);

  // INFO: lokalt skapade produkter finns bara i localStorage (DummyJSON sparar dem inte)
  if (localProduct && isLocalCreatedProduct(localProduct)) {
    currentProduct = localProduct;
    renderProduct();
    renderReviews(currentProduct.reviews ?? []);
    return;
  }

  try {
    currentProduct = await fetchSingleProduct(productId);
    // INFO: lokala create/update vinner (DummyJSON sparar inte permanent)
    if (localProduct) {
      currentProduct = {
        ...currentProduct,
        ...localProduct,
        reviews: currentProduct.reviews ?? localProduct.reviews ?? [],
      };
    }
  } catch (error) {
    if (!localProduct) {
      productContainer.innerHTML =
        '<p class="status-message status-message--error">Could not load product. Please try again later.</p>';
      return;
    }
    currentProduct = localProduct;
  }

  renderProduct();
  renderReviews(currentProduct.reviews ?? []);
}

productContainer.addEventListener("click", async (event) => {
  const thumbnailBtn = event.target.closest(".product-thumbnail");
  const editBtn = event.target.closest("#edit-product-btn");
  const cancelBtn = event.target.closest("#cancel-edit-btn");
  const deleteBtn = event.target.closest("#delete-product-btn");
  const cartBtn = event.target.closest("#add-to-cart-btn");
  const favBtn = event.target.closest("#toggle-favorite-btn");

  if (thumbnailBtn) {
    document.getElementById("product-main-image").src = thumbnailBtn.dataset.src;
    productContainer.querySelectorAll(".product-thumbnail").forEach((btn) => {
      btn.classList.toggle("is-active", btn === thumbnailBtn);
    });
    return;
  }

  if (editBtn) {
    showEditMode();
    return;
  }

  if (cancelBtn) {
    renderProduct();
    return;
  }

  if (deleteBtn) {
    const shouldDelete = await showConfirm("Delete this product?");
    if (!shouldDelete) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = "Deleting...";

    try {
      // INFO: lokalt skapade produkter finns inte på servern – hoppa över API-anrop
      if (!isLocalCreatedProduct(currentProduct)) {
        await deleteProduct(currentProduct.id);
      }
      markProductAsDeleted(currentProduct.id);
      window.location.href = "products.html";
    } catch (error) {
      deleteBtn.disabled = false;
      deleteBtn.textContent = "Delete product";
      showAlert("Could not delete product. Please try again.");
    }
    return;
  }

  if (cartBtn) {
    addToCart(currentProduct.id);
    updateCartBadge();
    showToast(`${currentProduct.title ?? "Product"} added to cart`);
    return;
  }

  if (favBtn) {
    toggleFavorite(currentProduct.id);
    const isFavorite = getFavorites().includes(currentProduct.id);
    const favoriteLabel = isFavorite ? "Remove from favorites" : "Save as favorite";
    favBtn.classList.toggle("active", isFavorite);
    favBtn.querySelector("img").src = `assets/icons/${isFavorite ? "heart-filled" : "heart"}.svg`;
    favBtn.querySelector("span").textContent = favoriteLabel;
    favBtn.setAttribute("aria-label", favoriteLabel);
  }
});

productContainer.addEventListener("submit", async (event) => {
  if (event.target.id !== "edit-product-form") return;

  event.preventDefault();

  const formData = new FormData(event.target);
  const updatedFields = {
    title: formData.get("title"),
    brand: formData.get("brand"),
    price: Number(formData.get("price")),
    category: formData.get("category"),
    description: formData.get("description"),
  };

  const saveBtn = event.target.querySelector("#save-edit-btn");
  const originalLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    let updatedProduct = updatedFields;

    // INFO: lokalt skapade produkter uppdateras bara i localStorage
    if (!isLocalCreatedProduct(currentProduct)) {
      updatedProduct = await updateProduct(currentProduct.id, updatedFields);
    }

    currentProduct = {
      ...currentProduct,
      ...updatedProduct,
      ...updatedFields,
    };

    saveLocalProduct(currentProduct);
    renderProduct();
  } catch (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = originalLabel;
    showAlert("Could not update product. Please try again.");
  }
});

loadProduct();
