// Fetch-funktioner för produkter (GET, POST, PUT, DELETE) mot DummyJSON.

const BASE_URL = "https://dummyjson.com/products";
const select = "id,title,price,thumbnail,category,brand,description,rating";

// INFO: bygger query-sträng med skip, limit och sortering
function buildQuery(options = {}) {
  const params = new URLSearchParams();

  if (options.limit != null) params.set("limit", String(options.limit));
  if (options.skip != null) params.set("skip", String(options.skip));
  if (options.sortBy) params.set("sortBy", options.sortBy);
  if (options.order) params.set("order", options.order);
  if (options.select) params.set("select", options.select);
  if (options.q != null) params.set("q", options.q);

  return params.toString();
}

async function fetchProductList(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch products (${response.status})`);
  }

  const data = await response.json();
  return {
    products: data.products ?? [],
    total: data.total ?? 0,
  };
}

// INFO: hämta en sida från hela katalogen (används för Shop all)
export async function fetchProductsPage(options = {}) {
  const query = buildQuery({
    ...options,
    select: options.select ?? select,
  });
  return fetchProductList(`${BASE_URL}?${query}`);
}

// INFO: hämta en sida från en kategori
export async function fetchProductsByCategory(slug, options = {}) {
  const query = buildQuery({
    ...options,
    select: options.select ?? select,
  });
  return fetchProductList(`${BASE_URL}/category/${encodeURIComponent(slug)}?${query}`);
}

// INFO: sök via API. Användaren får lokal reservsökning om detta misslyckas.
export async function searchProducts(searchQuery, options = {}) {
  const query = buildQuery({
    ...options,
    q: searchQuery,
    select: options.select ?? select,
  });
  return fetchProductList(`${BASE_URL}/search?${query}`);
}

export async function fetchSingleProduct(id) {
  const response = await fetch(`${BASE_URL}/${id}`);
  if (!response.ok) {
    throw new Error(`Product ${id} not found (${response.status})`);
  }

  return response.json();
}

export async function addNewProduct(product) {
  const response = await fetch(`${BASE_URL}/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    throw new Error(`Failed to create product (${response.status})`);
  }

  return response.json();
}

export async function updateProduct(id, product) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    throw new Error(`Failed to update product ${id} (${response.status})`);
  }

  return response.json();
}

export async function deleteProduct(id) {
  const response = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete product ${id} (${response.status})`);
  }

  return response.json();
}
