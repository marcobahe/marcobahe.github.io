/* ===== MENUS OCULTOS PARA SUBCONTAS BLOQUEADAS ===== */
// <script>
(function () {

  // ==========================================================
  // 1) SUBCONTAS ONDE OS MENUS DEVEM SER OCULTADOS (Location IDs)
  // ==========================================================
  const blockedLocationIds = new Set([
    "IjD5WRD5XeL0KnS2GyfR",
    "kD5YsAQ7fTGu8eGzcWYX",
    "XOV7xZeFNwblOCOX7qMO",
    // adicione outros locationIds aqui, se quiser
  ]);

  // ==========================================================
  // 2) OCULTAR POR ID (quando o ID é realmente estável/único)
  // ==========================================================
  const menuIdsToHide = [
    "897ed222-3f68-45c5-bf71-d326a7a1f70b", // Full Tasks (ID ok)
    "8b3a2e3c-2966-4e58-9730-7557dcdf5edc", // Full Academy (às vezes aparece)
    "466807e5-8e64-4236-a4b1-98403020f7be", // (aparece em alguns renders)
    // Obs: NÃO use o id d7d89ce5... porque ele é reaproveitado (ex: Full Webinar / Whatsapp)
  ];

  // ==========================================================
  // 3) OCULTAR POR TEXTO (fallback à prova de SPA/IDs repetidos)
  // ==========================================================
  const menuLabelsToHide = [
    "Full Academy",
    "Full Tasks",
    "Full Webinar",
    "Whatsapp | QR Code",
    "Turbine sua conta"
  ];

  // ==========================================================
  // FUNÇÕES
  // ==========================================================
  function getLocationId() {
    const m = location.pathname.match(/\/v2\/location\/([^/]+)/i);
    return m ? m[1] : null;
  }

  function markPage(shouldHide) {
    document.documentElement.classList.toggle("ff-hide-menus", !!shouldHide);
    if (document.body) document.body.classList.toggle("ff-hide-menus", !!shouldHide);
  }

  function hideByIds() {
    menuIdsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.setProperty("display", "none", "important");
    });
  }

  function hideByLabelsInSidebar() {
    const sidebar =
      document.querySelector("#sidebar-v2, #sidebar-v2-location, aside, nav") || document;

    const spans = Array.from(sidebar.querySelectorAll("span.nav-title, span"));

    spans.forEach(span => {
      const text = (span.textContent || "").trim();
      if (!text) return;

      if (menuLabelsToHide.includes(text)) {
        const container =
          span.closest("a")?.closest("li") ||
          span.closest("li") ||
          span.closest("a") ||
          span.closest("[role='menuitem']") ||
          span.closest("div");

        if (container) container.style.setProperty("display", "none", "important");
      }
    });
  }

  function apply() {
    const locationId = getLocationId();
    const shouldHide = locationId && blockedLocationIds.has(locationId);

    markPage(shouldHide);

    if (shouldHide) {
      hideByIds();
      hideByLabelsInSidebar();
    }
  }

  // ==========================================================
  // EXECUÇÃO + SUPORTE A SPA (re-render / troca de rota)
  // ==========================================================
  apply();

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    apply();
  };
  window.addEventListener("popstate", apply);

  const start = Date.now();
  const timer = setInterval(() => {
    apply();
    if (Date.now() - start > 20000) clearInterval(timer);
  }, 400);

})();
// </script> adicionando o ID: dVAfTHjtki7pfozbuEcN.