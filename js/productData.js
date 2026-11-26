// Hämtar EN produkt och tar hänsyn till lokala create/update/delete.
// Används av produktsidan, varukorgen och favoriterna.

import { fetchSingleProduct } from "./api.js";
import {
  getLocalProduct,
  isProductDeleted,
  isLocalCreatedProduct,
  applyLocalChanges,
} from "./storage.js";

// INFO: returnerar null om produkten är borttagen
export async function getProductById(id) {
  const productId = Number(id);

  if (isProductDeleted(productId)) {
    return null;
  }

  const localProduct = getLocalProduct(productId);

  // INFO: skapade produkter finns inte i API:et – ett anrop skulle bara ge 404
  if (localProduct && isLocalCreatedProduct(localProduct)) {
    return localProduct;
  }

  try {
    const apiProduct = await fetchSingleProduct(productId);
    const withLocalChanges = applyLocalChanges([apiProduct]);
    if (withLocalChanges.length === 0) {
      return null;
    }
    return withLocalChanges[0];
  } catch (error) {
    // INFO: API:et svarar inte – visa vår lokala version om vi har en
    if (localProduct) {
      return localProduct;
    }
    throw error;
  }
}
