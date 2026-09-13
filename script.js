// =========================================================
// VETERANS BACKBONE
// MAIN JAVASCRIPT
// =========================================================


// ---------- MOBILE MENU ----------

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("active");

    menuToggle.setAttribute("aria-expanded", isOpen);

    document.body.classList.toggle("menu-open", isOpen);
  });


  // Close menu when a nav link is clicked

  const navLinks = mainNav.querySelectorAll("a");

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    });
  });


  // Close menu with Escape key

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      mainNav.classList.remove("active");
      menuToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    }
  });
}


// ---------- CURRENT YEAR ----------

const currentYear = document.getElementById("currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}


// ---------- SIMPLE SCROLL REVEAL ----------

const revealItems = document.querySelectorAll(
  ".route-card, .about-preview, .revolving-section, .pathways-section, .rv-preview, .event-panel, .resources-preview, .licensed-preview, .flamingo-preview, .people-preview, .involved-section, .final-cta"
);

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12
    }
  );

  revealItems.forEach(item => {
    item.classList.add("reveal");
    observer.observe(item);
  });
} else {
  revealItems.forEach(item => {
    item.classList.add("revealed");
  });
}
