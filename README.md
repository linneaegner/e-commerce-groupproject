# ELLUNE – E-commerce group project

Vanilla HTML, CSS and JavaScript store for beauty and style products. Product data comes from [DummyJSON Products API](https://dummyjson.com/docs/products).

**Live site:** [linneaegner.github.io/e-commerce-groupproject](https://linneaegner.github.io/e-commerce-groupproject/)

## Features

- Home page with hero, category tiles and featured products
- Product catalog with API search, category filter, price sort, Load more and Create
- Product detail page with Update / Delete (CRUD continues there)
- Favorites and cart stored in `localStorage`
- Simulated checkout with toast / confirmation (`setTimeout`)
- Responsive layout and keyboard-friendly navigation

## How catalog pagination works

- Each Load more click shows up to 12 cards (`PAGE_SIZE`)
- Each API call asks for 30 products (`FETCH_LIMIT`) with `skip` / `limit`
- Theme filtering happens locally; leftover matching products stay in a buffer for the next click
- `nextSkip` always follows how many products the API returned, not how many were shown

## Sorting limitation

Locally created products are shown first. Edited products show their new price on the card, but their position in the list still follows the API sort order (DummyJSON sorts on its own data). Local fallback search sorts everything in the browser.

## LocalStorage keys

| Key | Purpose |
| --- | --- |
| `cart` | Cart items and quantities |
| `favorites` | Favorite product ids |
| `productCache` | Products seen from the API (fallback search) |
| `localProducts` | Created or edited products (`isLocalCreated: true` for new ones) |
| `deletedProductIds` | Ids removed by the user so they do not reappear from the API |

Locally created products get a unique id from `Date.now()` because DummyJSON always returns id `195` for create.

## Image credits

Hero and category images are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license).

Approximate sources used for the landing page:

- Beauty / makeup lifestyle photography (hero and makeup tile)
- Fragrance bottle photography
- Skincare product photography
- Fashion dress photography
- Handbag photography
- Men’s shirt / fashion photography

If you replace images, keep credit + license notes here.
