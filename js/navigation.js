// Header-navigation, hamburgermeny och sökfält.

import { getCartCount } from "./storage.js";
import { THEME_GROUPS, getCategoriesByGroup } from "./categories.js";

const openMenuBtn = document.querySelector("#open-menu-btn");
const closeMenuBtn = document.querySelector("#close-menu-btn");
const menuDialog = document.querySelector("#menu-modal");
const menuList = document.querySelector("#menu-list");
const desktopNav = document.querySelector("#desktop-nav");
const searchToggleBtn = document.querySelector("#search-toggle-btn");
const searchPanel = document.querySelector("#header-search");
const searchInput = document.querySelector("#header-search-input");

// Varukorgs-badge i headern
export function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;

  const count = getCartCount();
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

function createCategoryLinksHtml(group) {
  return getCategoriesByGroup(group)
    .map(
      (category) =>
        `<li><a href="products.html?category=${category.slug}">${category.label}</a></li>`
    )
    .join("");
}

// INFO: menyn byggs från categories.js så länkarna alltid är giltiga slugs
export function renderMenuCategories() {
  if (!menuList) return;

  const groupsHtml = THEME_GROUPS.map(
    (group) => `
      <li class="menu-group">
        <h3 class="menu-group-title">${group}</h3>
        <ul class="menu-sublist">
          ${createCategoryLinksHtml(group)}
        </ul>
      </li>
    `
  ).join("");

  menuList.innerHTML = `
    <li><a href="products.html">Shop all</a></li>
    ${groupsHtml}
  `;
}

function renderDesktopNav() {
  if (!desktopNav) return;

  const groupsHtml = THEME_GROUPS.map(
    (group) => `
      <li class="desktop-nav-item">
        <button type="button" class="desktop-nav-trigger" aria-expanded="false" aria-haspopup="true">
          ${group}
        </button>
        <ul class="desktop-nav-dropdown" hidden>
          ${createCategoryLinksHtml(group)}
        </ul>
      </li>
    `
  ).join("");

  desktopNav.innerHTML = `
    <ul class="desktop-nav-list">
      <li><a href="products.html">Shop all</a></li>
      ${groupsHtml}
    </ul>
  `;

  desktopNav.querySelectorAll(".desktop-nav-trigger").forEach((button) => {
    const dropdown = button.nextElementSibling;

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";

      // Stäng andra dropdowns först
      desktopNav.querySelectorAll(".desktop-nav-trigger").forEach((other) => {
        other.setAttribute("aria-expanded", "false");
        other.nextElementSibling.hidden = true;
      });

      button.setAttribute("aria-expanded", String(!isOpen));
      dropdown.hidden = isOpen;
    });
  });

  // Stäng dropdown när man klickar utanför
  document.addEventListener("click", (event) => {
    if (!desktopNav.contains(event.target)) {
      desktopNav.querySelectorAll(".desktop-nav-trigger").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
        button.nextElementSibling.hidden = true;
      });
    }
  });
}

function openMenu() {
  if (!menuDialog) return;
  menuDialog.showModal();
  openMenuBtn?.setAttribute("aria-expanded", "true");
}

function closeMenu() {
  if (!menuDialog?.open) return;
  menuDialog.close();
  openMenuBtn?.setAttribute("aria-expanded", "false");
}

function toggleSearch() {
  if (!searchPanel) return;

  const isHidden = searchPanel.hidden;
  searchPanel.hidden = !isHidden;
  searchToggleBtn?.setAttribute("aria-expanded", String(isHidden));

  if (isHidden) {
    searchInput?.focus();
  }
}

function markCurrentPage() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");

  document.querySelectorAll("[data-nav-page]").forEach((link) => {
    const page = link.getAttribute("data-nav-page");
    if (page === path) {
      link.setAttribute("aria-current", "page");
    }
  });

  // Markera kategori i meny om den är aktiv
  if (category) {
    document.querySelectorAll(`a[href="products.html?category=${category}"]`).forEach((link) => {
      link.setAttribute("aria-current", "page");
    });
  }
}

// Event listeners (bara om elementen finns på sidan)
if (openMenuBtn && menuDialog) {
  openMenuBtn.addEventListener("click", openMenu);
}

if (closeMenuBtn) {
  closeMenuBtn.addEventListener("click", closeMenu);
}

if (menuDialog) {
  menuDialog.addEventListener("close", () => {
    openMenuBtn?.setAttribute("aria-expanded", "false");
  });
}

if (searchToggleBtn) {
  searchToggleBtn.addEventListener("click", toggleSearch);
}

renderMenuCategories();
renderDesktopNav();
markCurrentPage();
updateCartBadge();
