// LocalStorage-hjälpare för favoriter, varukorg och Create/Update/Delete-ändringar.
//
// INFO: tre separata nycklar behövs eftersom DummyJSON inte sparar CRUD permanent.
// - productCache: produkter hämtade från API (för lokal reservsökning)
// - localProducts: skapade/redigerade produkter som ska överleva sidladdning
// - deletedProductIds: id:n som användaren raderat (så de inte dyker upp igen från API)

const CART_KEY = "cart";
const FAVORITES_KEY = "favorites";
const PRODUCT_CACHE_KEY = "productCache";
const LOCAL_PRODUCTS_KEY = "localProducts";
const DELETED_IDS_KEY = "deletedProductIds";

// ---- Cart ----

export function getCart() {
  return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
}

// INFO: totalt antal varor (summan av quantity), för badge i headern
export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

export function addToCart(productId) {
  const cart = getCart();
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ id: productId, quantity: 1 });
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([]));
}

export function setQuantityInCart(productId, quantity) {
  const newQuantity = Number(quantity);

  // INFO: ogiltigt antal eller ≤ 0 → ta bort raden
  if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }

  const cart = getCart();
  const item = cart.find((item) => item.id === productId);

  if (item) {
    item.quantity = newQuantity;
  } else {
    cart.push({ id: productId, quantity: newQuantity });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// ---- Favorites ----

export function getFavorites() {
  return JSON.parse(localStorage.getItem(FAVORITES_KEY)) ?? [];
}

export function addToFavorites(productId) {
  const favorites = getFavorites();
  if (!favorites.includes(productId)) {
    favorites.push(productId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

export function removeFromFavorites(productId) {
  const favorites = getFavorites().filter((id) => id !== productId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function toggleFavorite(productId) {
  if (getFavorites().includes(productId)) {
    removeFromFavorites(productId);
  } else {
    addToFavorites(productId);
  }
}

// ---- Product cache (API-data för reservsökning) ----

export function getProductCache() {
  return JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY)) ?? [];
}

// INFO: slår ihop nya produkter med befintliga (samma id skrivs över) i stället för att ersätta hela listan
export function saveToProductCache(products) {
  const cached = getProductCache();

  products.forEach((product) => {
    const index = cached.findIndex((item) => Number(item.id) === Number(product.id));
    if (index === -1) {
      cached.push(product);
    } else {
      cached[index] = product;
    }
  });

  localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(cached));
}

// ---- Local products (Create / Update) ----

export function getLocalProducts() {
  return JSON.parse(localStorage.getItem(LOCAL_PRODUCTS_KEY)) ?? [];
}

export function getLocalProduct(id) {
  return getLocalProducts().find((product) => Number(product.id) === Number(id)) ?? null;
}

// INFO: lokalt skapade produkter markeras med isLocalCreated: true
// och får ett unikt id (Date.now) eftersom DummyJSON alltid returnerar id 195.
export function createLocalProductId() {
  return Date.now();
}

export function isLocalCreatedProduct(product) {
  return Boolean(product?.isLocalCreated);
}

export function saveLocalProduct(product) {
  const products = getLocalProducts();
  const index = products.findIndex((item) => Number(item.id) === Number(product.id));

  if (index === -1) {
    products.push(product);
  } else {
    products[index] = { ...products[index], ...product };
  }

  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
}

// ---- Deleted products ----

export function getDeletedProductIds() {
  return JSON.parse(localStorage.getItem(DELETED_IDS_KEY)) ?? [];
}

export function markProductAsDeleted(id) {
  const numericId = Number(id);
  const deletedIds = getDeletedProductIds();

  if (!deletedIds.includes(numericId)) {
    deletedIds.push(numericId);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deletedIds));
  }

  // INFO: ta bort eventuell lokal kopia också
  const remaining = getLocalProducts().filter((product) => Number(product.id) !== numericId);
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(remaining));
}

export function isProductDeleted(id) {
  return getDeletedProductIds().includes(Number(id));
}

// ---- Apply local CRUD on top of API results ----

// INFO: filtrerar bort raderade och byter ut redigerade mot lokal version.
// Används på alla API-resultat så CRUD syns överallt (katalog, startsida, cart, favorites).
export function applyLocalChanges(products) {
  const deletedIds = getDeletedProductIds();
  const localProducts = getLocalProducts();

  return products
    .filter((product) => !deletedIds.includes(Number(product.id)))
    .map((product) => {
      const local = localProducts.find((item) => Number(item.id) === Number(product.id));
      // INFO: lokal version vinner (DummyJSON sparar inte Create/Update permanent)
      return local ? { ...product, ...local } : product;
    });
}

// INFO: hämtar en produkt med lokal CRUD först, annars null (anropare får då fråga API)
export function resolveProductFromStorage(id) {
  const numericId = Number(id);

  if (isProductDeleted(numericId)) {
    return null;
  }

  return getLocalProduct(numericId);
}
