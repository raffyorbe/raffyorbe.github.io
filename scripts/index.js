document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".floating-navbar a");

  function getCurrentSectionId() {
    let scrollPos = window.scrollY + window.innerHeight / 3;

    for (let section of sections) {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (scrollPos >= top && scrollPos < bottom) {
        return section.id;
      }
    }

    return null;
  }

  function onScroll() {
    const currentSectionId = getCurrentSectionId();

    navLinks.forEach(link => {
      const dataTargets = link.getAttribute("data-targets");

      // If data-targets is present, split and check
      if (dataTargets) {
        const targets = dataTargets.split(",");
        if (targets.includes(currentSectionId)) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      } else {
        // Fallback to href-based matching
        const href = link.getAttribute("href");
        const targetId = href.startsWith("#") ? href.slice(1) : null;

        if (targetId === currentSectionId) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      }
    });
  }

  window.addEventListener("scroll", onScroll);
  onScroll(); // run on page load
});
