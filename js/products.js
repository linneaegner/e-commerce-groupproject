// Produktkatalog: lista, filter, sortering, paginering via API och create.
//
// INFO – varför buffert?
// API:et returnerar produkter från alla kategorier (Shop all) eller sökresultat.
// Vi filtrerar lokalt till temats kategorier. Om ett anrop ger fler relevanta
// produkter än PAGE_SIZE sparas resten i productBuffer och används vid nästa
// "Load more", så inga produkter hoppas över.
//
// INFO – varför requestId?
// Om användaren byter kategori/sortering medan ett anrop pågår kan det gamla
// svaret annars skriva över det nya. Efter varje await jämförs requestId;
// om det skiljer sig avbryts arbetet tyst (även i catch/finally).
//
// INFO – sorteringsbegränsning:
// Lokalt skapade produkter läggs först i listan. Redigerade produkters nya pris
// syns på kortet, men deras plats i listan följer fortfarande API:ets sortering
// (DummyJSON sorterar på originaldata). Vid lokal reservsökning sorteras allt lokalt.

import {
  fetchProductsPage,
  fetchProductsByCategory,
  searchProducts,
  addNewProduct,
} from "./api.js";
import {
  saveToProductCache,
  saveLocalProduct,
  getLocalProducts,
  getProductCache,
  applyLocalChanges,
  createLocalProductId,
  isLocalCreatedProduct,
} from "./storage.js";
import { THEME_CATEGORIES, isThemeCategory, getCategoryLabel } from "./categories.js";
import { createProductCard, handleProductCardClick } from "./productCard.js";
import { showAlert, showToast } from "./dialog.js";

// DOM ELEMENTS
const openFilterBtn = document.getElementById("open-filter-btn");
const closeFilterBtn = document.getElementById("close-filter-btn");
const applyFilterBtn = document.getElementById("apply-filter-btn");
const filterDialog = document.getElementById("filter-modal");
const activeFilterCount = document.getElementById("active-filter-count");
const filterCategoryList = document.getElementById("filter-category-list");

const sortSelect = document.getElementById("products-sort-select");

const openAddProductBtn = document.getElementById("open-add-product-btn");
const closeAddProductBtn = document.getElementById("close-add-product-btn");
const cancelAddProductBtn = document.getElementById("cancel-add-product-btn");
const addProductDialog = document.getElementById("add-product-modal");
const addProductForm = document.getElementById("add-product-form");
const addProductImageInput = document.getElementById("add-product-image");
const addProductImagePreview = document.getElementById("add-product-image-preview");

const productsGrid = document.getElementById("products-grid");
const productsHeading = document.getElementById("products-heading");
const breadcrumbCurrent = document.getElementById("breadcrumb-current");
const loadMoreBtn = document.getElementById("load-more-btn");
const catalogStatus = document.getElementById("catalog-status");

// CONSTANTS
const PAGE_SIZE = 12; // INFO: antal kort per "Load more"
const FETCH_LIMIT = 30; // INFO: antal produkter per API-anrop

// VARIABLES (samma stil som tidigare – vanliga let i stället för ett stort state-objekt)
let searchQuery = "";
let activeCategory = "";
let activeSort = "default";
let nextSkip = 0;
let apiTotal = Infinity;
let productBuffer = []; // INFO: produkter som väntar på att visas
let shownIds = []; // INFO: id:n som redan syns – för att undvika dubbletter
let knownProducts = []; // INFO: produkter vi har renderat (för toast-titel)
let requestId = 0;
let isLoading = false;
let usingLocalSearch = false;
let selectedImageDataUrl = null;

// FUNCTIONS (URL)
function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") ?? "").trim();
  const categoryParam = (params.get("category") ?? "").trim();
  const sort = params.get("sort") ?? "default";

  searchQuery = query;
  activeCategory = isThemeCategory(categoryParam) ? categoryParam : "";
  activeSort = ["price-asc", "price-desc"].includes(sort) ? sort : "default";

  if (sortSelect) {
    sortSelect.value = activeSort;
  }
}

function updateUrl() {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (activeCategory) params.set("category", activeCategory);
  if (activeSort !== "default") params.set("sort", activeSort);

  const queryString = params.toString();
  const newUrl = queryString ? `products.html?${queryString}` : "products.html";
  history.pushState(null, "", newUrl);
}

function getSortOptions() {
  if (activeSort === "price-asc") {
    return { sortBy: "price", order: "asc" };
  }
  if (activeSort === "price-desc") {
    return { sortBy: "price", order: "desc" };
  }
  return {};
}

function updateHeadingAndBreadcrumb() {
  if (!breadcrumbCurrent) return;

  if (searchQuery) {
    breadcrumbCurrent.textContent = searchQuery;
    productsHeading.textContent = `Search results for "${searchQuery}"`;
  } else if (activeCategory) {
    const label = getCategoryLabel(activeCategory);
    breadcrumbCurrent.textContent = label;
    productsHeading.textContent = label;
  } else {
    breadcrumbCurrent.textContent = "Products";
    productsHeading.textContent = "Products";
  }
}

function setCatalogStatus(message, isError = false) {
  if (!catalogStatus) return;

  if (!message) {
    catalogStatus.hidden = true;
    catalogStatus.textContent = "";
    catalogStatus.classList.remove("status-message--error");
    return;
  }

  catalogStatus.hidden = false;
  catalogStatus.textContent = message;
  catalogStatus.classList.toggle("status-message--error", isError);
}

function setLoadMoreLoading(loading) {
  isLoading = loading;
  loadMoreBtn.disabled = loading;
  loadMoreBtn.textContent = loading ? "Loading..." : "Load more";
}

function updateLoadMoreVisibility() {
  if (usingLocalSearch) {
    loadMoreBtn.hidden = true;
    return;
  }

  const hasMore = productBuffer.length > 0 || nextSkip < apiTotal;
  loadMoreBtn.hidden = !hasMore;
}

// FUNCTIONS (filter helpers)
function matchesTheme(product) {
  return isThemeCategory(product.category);
}

function matchesSearchAndCategory(product) {
  if (activeCategory && product.category !== activeCategory) {
    return false;
  }

  if (!searchQuery) return true;

  const text = `${product.title || ""} ${product.brand || ""} ${product.category || ""} ${product.description || ""}`;
  return text.toLowerCase().includes(searchQuery.toLowerCase());
}

function sortProductsLocally(products) {
  const sorted = [...products];

  if (activeSort === "price-asc") {
    sorted.sort((a, b) => a.price - b.price);
  } else if (activeSort === "price-desc") {
    sorted.sort((a, b) => b.price - a.price);
  }

  return sorted;
}

function findKnownProduct(id) {
  return knownProducts.find((product) => Number(product.id) === Number(id));
}

function rememberProducts(products) {
  products.forEach((product) => {
    const index = knownProducts.findIndex((item) => Number(item.id) === Number(product.id));
    if (index === -1) {
      knownProducts.push(product);
    } else {
      knownProducts[index] = product;
    }
  });
}

// INFO: lägger till i bufferten utan dubbletter
function addToBuffer(products) {
  products.forEach((product) => {
    const id = Number(product.id);
    const alreadyShown = shownIds.includes(id);
    const alreadyInBuffer = productBuffer.some((item) => Number(item.id) === id);

    if (alreadyShown || alreadyInBuffer) return;

    productBuffer.push(product);
  });
}

function takeFromBuffer(count) {
  const taken = productBuffer.splice(0, count);

  taken.forEach((product) => {
    shownIds.push(Number(product.id));
  });

  return taken;
}

// FUNCTIONS (API)
async function fetchCatalogPage() {
  const options = {
    skip: nextSkip,
    limit: FETCH_LIMIT,
    ...getSortOptions(),
  };

  if (searchQuery) {
    return searchProducts(searchQuery, options);
  }

  if (activeCategory) {
    return fetchProductsByCategory(activeCategory, options);
  }

  return fetchProductsPage(options);
}

function filterApiProducts(products) {
  // INFO: temafilter behövs för Shop all / sök. Vid kategori-anrop är de redan rätt kategori.
  let filtered = applyLocalChanges(products).filter(matchesTheme);

  if (searchQuery && activeCategory) {
    filtered = filtered.filter((product) => product.category === activeCategory);
  }

  return filtered;
}

// FUNCTIONS (local fallback search)
function mergeProductsById(productLists) {
  // INFO: slår ihop flera listor till en, så samma id bara finns en gång
  const merged = [];

  productLists.forEach((list) => {
    list.forEach((product) => {
      const index = merged.findIndex((item) => Number(item.id) === Number(product.id));
      if (index === -1) {
        merged.push(product);
      } else {
        merged[index] = product;
      }
    });
  });

  return merged;
}

function searchLocally() {
  const cached = getProductCache();
  const local = getLocalProducts();
  const merged = mergeProductsById([cached, local]);

  let results = applyLocalChanges(merged)
    .filter(matchesTheme)
    .filter(matchesSearchAndCategory);

  results = sortProductsLocally(results);
  return results;
}

// FUNCTIONS (render)
function appendProductCards(products) {
  rememberProducts(products);
  products.forEach((product) => {
    productsGrid.appendChild(createProductCard(product));
  });
}

function renderCategoryFilters() {
  filterCategoryList.innerHTML = "";

  const allItem = document.createElement("li");
  allItem.innerHTML = `
    <label>
      <input type="radio" name="category" value="" ${activeCategory ? "" : "checked"}>
      All
    </label>
  `;
  filterCategoryList.appendChild(allItem);

  THEME_CATEGORIES.forEach((category) => {
    const checked = activeCategory === category.slug ? "checked" : "";
    const li = document.createElement("li");
    li.innerHTML = `
      <label>
        <input type="radio" name="category" value="${category.slug}" ${checked}>
        ${category.label}
        <span class="category-group-hint">${category.group}</span>
      </label>
    `;
    filterCategoryList.appendChild(li);
  });

  activeFilterCount.textContent = activeCategory ? "(1)" : "";
}

function getMatchingLocalCreatedProducts() {
  return getLocalProducts()
    .filter(isLocalCreatedProduct)
    .filter(matchesTheme)
    .filter(matchesSearchAndCategory);
}

// FUNCTIONS (main load)
async function loadMoreProducts() {
  if (isLoading || usingLocalSearch) return;

  const currentRequestId = requestId;
  const isFirstPage = shownIds.length === 0 && productBuffer.length === 0;

  setLoadMoreLoading(true);
  if (isFirstPage) {
    setCatalogStatus("Loading products...");
  }

  try {
    // INFO: hämta tills bufferten räcker till en sida, eller tills API:et är slut
    while (productBuffer.length < PAGE_SIZE && nextSkip < apiTotal) {
      const data = await fetchCatalogPage();

      // INFO: gammalt anrop – ignorera svar, laddningsstatus och fel
      if (currentRequestId !== requestId) return;

      // INFO: nextSkip baseras på hämtade produkter, inte på filtrerade
      nextSkip += data.products.length;
      apiTotal = data.total;

      // INFO: tom sida från API → avsluta pagineringen
      if (data.products.length === 0) {
        apiTotal = nextSkip;
        break;
      }

      saveToProductCache(data.products);
      addToBuffer(filterApiProducts(data.products));
    }

    if (currentRequestId !== requestId) return;

    const page = takeFromBuffer(PAGE_SIZE);

    if (isFirstPage) {
      setCatalogStatus("");
      productsGrid.innerHTML = "";
    }

    if (page.length === 0 && shownIds.length === 0) {
      productsGrid.innerHTML = '<p class="status-message">No products found.</p>';
      loadMoreBtn.hidden = true;
      return;
    }

    appendProductCards(page);
    updateLoadMoreVisibility();
  } catch (error) {
    if (currentRequestId !== requestId) return;

    // INFO: lokal reservsökning bara vid sök-API-fel, inte vid 0 träffar
    if (searchQuery && isFirstPage) {
      showLocalSearchResults();
      return;
    }

    if (isFirstPage) {
      productsGrid.innerHTML = "";
      setCatalogStatus("Could not load products. Please try again later.", true);
      loadMoreBtn.hidden = true;
    } else {
      setCatalogStatus("Could not load more products. Please try again.", true);
      updateLoadMoreVisibility();
    }
  } finally {
    // INFO: uppdatera bara laddningsstatus om detta fortfarande är aktuellt anrop
    if (currentRequestId === requestId) {
      setLoadMoreLoading(false);
    }
  }
}

function showLocalSearchResults() {
  usingLocalSearch = true;
  const results = searchLocally();

  productsGrid.innerHTML = "";
  setCatalogStatus(
    "Search is unavailable right now. Showing products saved on this device – results may be limited."
  );

  if (results.length === 0) {
    productsGrid.innerHTML = '<p class="status-message">No products found.</p>';
    loadMoreBtn.hidden = true;
    return;
  }

  appendProductCards(results);
  results.forEach((product) => {
    shownIds.push(Number(product.id));
  });
  loadMoreBtn.hidden = true;
}

function resetCatalog() {
  // INFO: öka requestId så pågående anrop avbryts tyst
  requestId += 1;
  nextSkip = 0;
  apiTotal = Infinity;
  productBuffer = [];
  shownIds = [];
  knownProducts = [];
  usingLocalSearch = false;
  isLoading = false;

  productsGrid.innerHTML = "";
  setCatalogStatus("");
  loadMoreBtn.hidden = true;
  loadMoreBtn.disabled = false;
  loadMoreBtn.textContent = "Load more";

  updateHeadingAndBreadcrumb();
  renderCategoryFilters();

  // INFO: lokalt skapade produkter som matchar filter läggs först
  const localCreated = getMatchingLocalCreatedProducts();
  addToBuffer(sortProductsLocally(localCreated));

  loadMoreProducts();
}

function clearImagePreview() {
  selectedImageDataUrl = null;
  addProductImagePreview.src = "";
  addProductImagePreview.classList.remove("is-visible");
}

function closeAddProductModal() {
  addProductDialog.close();
  addProductForm.reset();
  clearImagePreview();
}

// EVENTS (filter and sort)
openFilterBtn.addEventListener("click", () => {
  filterDialog.showModal();
});

closeFilterBtn.addEventListener("click", () => {
  filterDialog.close();
});

applyFilterBtn.addEventListener("click", () => {
  const selected = filterDialog.querySelector("input[name='category']:checked");
  activeCategory = selected?.value ?? "";
  activeFilterCount.textContent = activeCategory ? "(1)" : "";
  filterDialog.close();
  updateUrl();
  resetCatalog();
});

sortSelect.addEventListener("change", () => {
  activeSort = sortSelect.value;
  updateUrl();
  resetCatalog();
});

window.addEventListener("popstate", () => {
  readStateFromUrl();
  resetCatalog();
});

// EVENTS (add product)
openAddProductBtn.addEventListener("click", () => {
  addProductDialog.showModal();
});

closeAddProductBtn.addEventListener("click", closeAddProductModal);
cancelAddProductBtn.addEventListener("click", closeAddProductModal);

addProductImageInput.addEventListener("change", () => {
  const file = addProductImageInput.files?.[0];
  if (!file) {
    clearImagePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedImageDataUrl = reader.result;
    addProductImagePreview.src = selectedImageDataUrl;
    addProductImagePreview.classList.add("is-visible");
  };
  reader.readAsDataURL(file);
});

addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(addProductForm);
  // INFO: skicka bara textfält till API – bilder (data-URL) ger 403 hos DummyJSON
  const product = {
    title: formData.get("title"),
    brand: formData.get("brand"),
    price: Number(formData.get("price")),
    category: formData.get("category"),
    description: formData.get("description"),
  };

  const submitBtn = addProductForm.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  try {
    const createdProduct = await addNewProduct(product);

    // INFO: DummyJSON ger alltid id 195 – ge varje skapad produkt ett unikt, beständigt id
    const localId = createLocalProductId();
    const productToSave = {
      ...createdProduct,
      ...product,
      id: localId,
      isLocalCreated: true,
      thumbnail: selectedImageDataUrl || createdProduct.thumbnail,
      images: selectedImageDataUrl
        ? [selectedImageDataUrl]
        : createdProduct.images ?? [createdProduct.thumbnail],
    };

    saveLocalProduct(productToSave);
    closeAddProductModal();
    showToast(`${productToSave.title} added`);
    resetCatalog();
  } catch (error) {
    showAlert("Could not create product. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

// EVENTS (product card actions)
productsGrid.addEventListener("click", (event) => {
  handleProductCardClick(event, findKnownProduct);
});

loadMoreBtn.addEventListener("click", () => {
  loadMoreProducts();
});

// START
readStateFromUrl();

const headerSearchInput = document.querySelector("#header-search-input");
if (headerSearchInput && searchQuery) {
  headerSearchInput.value = searchQuery;
}

resetCatalog();
