<!-- Support Booking - Topbar | cria iFrame só no 1º clique, depois persiste oculto (sem scroll + auto-zoom) -->
(function () {

  // =========================
  // ✅ NOVO: Subcontas onde o botão NÃO deve aparecer
  // =========================
  const HIDE_SUPPORT_BTN_LOCATION_IDS = new Set([
    "IjD5WRD5XeL0KnS2GyfR",
  ]);

  // ✅ NOVO: pega o locationId da URL (/v2/location/XXXX/)
  function getLocationIdFromUrl() {
    const m = location.pathname.match(/\/v2\/location\/([^/]+)/i);
    return m ? m[1] : null;
  }

  // ✅ NOVO: decide se deve ocultar o botão nesta subconta
  function shouldHideSupportButtonHere() {
    const locationId = getLocationIdFromUrl();
    return !!locationId && HIDE_SUPPORT_BTN_LOCATION_IDS.has(locationId);
  }

  // IDs fixos do nosso botão/popup e do "estacionamento" do iFrame
  const BTN_ID        = "ff-support-topbar-btn";
  const POPUP_ID      = "ff-support-popup";
  const BACKDROP_ID   = "ff-support-popup-backdrop";
  const STASH_ID      = "ff-support-iframe-stash";

  const LABEL = "Agende uma call de Suporte";

  // Dados do embed FullFunnel
  const BOOKING_ID       = "zivoYfVcIU3qJwjIezcw";
  const BOOKING_SRC      = `https://link.fullfunnel.app/widget/booking/${BOOKING_ID}`;
  const EMBED_SCRIPT_SRC = "https://link.fullfunnel.app/js/form_embed.js";

  // Layout e limites
  const MIN_SCALE = 0.72;
  const HEAD_FALL = 56;
  const INIT_W    = 1100;
  const INIT_H    = 700;
  const DEFAULT_HEIGHT = 650; // ⭐ NOVO: Altura padrão como fallback
  const MAX_WAIT_TIME = 8000;  // ⭐ NOVO: Timeout para forçar exibição

  // Seletores da topbar
  const HEADER_SELECTORS = [
    '.header-bar .container-fluid > .header--controls',
    '.header .container-fluid > .header--controls',
    '.hl_header .container-fluid > .hl_header--controls',
    '.main-header .container-fluid > .header-controls',
    '.top-bar .container-fluid > .controls',
    '.navbar .container-fluid > .nav-controls',
    '.header-controls', '.header--controls', '.nav-controls', '.controls'
  ];

  // Estado global
  let popup=null, head=null, content=null, spinner=null;
  let iframe=null, naturalH=0, embedReady=false, heightListener=null, moIframe=null;
  let heightDetectionTimeout=null; // ⭐ NOVO: Timer para fallback

  // ---------- utils ----------
  function findHeader() {
    for (const sel of HEADER_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function ensureStash() {
    let stash = document.getElementById(STASH_ID);
    if (!stash) {
      stash = document.createElement("div");
      stash.id = STASH_ID;
      stash.style.cssText = "position:absolute; left:-99999px; top:-99999px; width:0; height:0; overflow:hidden;";
      document.body.appendChild(stash);
    }
    return stash;
  }

  function ensureEmbedScript(cb) {
    if (embedReady) { 
      cb && cb(); 
      return; 
    }
    
    // ⭐ MELHORADO: Verifica se script já existe
    const existingScript = document.querySelector(`script[src="${EMBED_SCRIPT_SRC}"]`);
    if (existingScript) {
      embedReady = true;
      cb && cb();
      return;
    }

    const s = document.createElement("script");
    s.src = EMBED_SCRIPT_SRC; 
    s.type = "text/javascript"; 
    s.async = true;
    s.onload = () => { 
      embedReady = true; 
      cb && cb(); 
    };
    s.onerror = () => {
      console.warn("Erro ao carregar script do embed, usando fallback");
      embedReady = true;
      cb && cb();
    };
    document.body.appendChild(s);
  }

  function readNaturalHeight() {
    const s = parseInt(iframe?.style?.height || "", 10);
    if (Number.isFinite(s) && s > 0) return s;
    const g = parseInt((iframe && getComputedStyle(iframe).height) || "", 10);
    return Number.isFinite(g) && g > 0 ? g : 0;
  }

  // ⭐ NOVO: Função para forçar exibição com altura padrão
  function forceDisplay() {
    if (!iframe || !popup) return;
    
    console.log("Forçando exibição do iframe com altura padrão");
    
    if (naturalH <= 0) {
      naturalH = DEFAULT_HEIGHT;
      iframe.style.height = DEFAULT_HEIGHT + "px";
    }
    
    spinner && spinner.remove();
    iframe.style.visibility = "visible";
    fitToHeight(naturalH);
  }

  // ---------- iFrame persistente ----------
  function createPersistentIframe() {
    if (iframe) return iframe;
    
    const stash = ensureStash();
    const frameId = BOOKING_ID + "_" + Date.now();
    
    iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.src = BOOKING_SRC;
    iframe.setAttribute("scrolling", "no");
    
    // ⭐ MELHORADO: Largura responsiva desde o início
    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const initialWidth = Math.min(1200, Math.floor(vw * 0.9));
    
    iframe.style.cssText = `
      border:none; 
      background:#fff; 
      width:${initialWidth}px; 
      height:${DEFAULT_HEIGHT}px; 
      visibility:hidden;
    `;
    
    stash.appendChild(iframe);

    // ⭐ MELHORADO: Timeout para forçar exibição
    heightDetectionTimeout = setTimeout(forceDisplay, MAX_WAIT_TIME);
    
    attachHeightObservers();
    return iframe;
  }

  function attachHeightObservers() {
    // postMessage do embed (altura)
    if (!heightListener) {
      heightListener = (ev) => {
        try {
          if (!String(ev.origin).includes("link.fullfunnel.app")) return;
          
          const d = ev.data || {};
          let h = null;
          
          if (typeof d === "string") {
            const m = d.match(/height["']?\s*[:=]\s*"?(\d{3,5})"?/i) || d.match(/(\d{3,5})px/);
            if (m) h = parseInt(m[1], 10);
          } else {
            h = parseInt(d.height || d.newHeight || d.iframeHeight || "", 10);
          }
          
          if (Number.isFinite(h) && h > 100) {
            console.log("Altura detectada via postMessage:", h);
            
            naturalH = h;
            iframe.style.height = h + "px";
            
            if (heightDetectionTimeout) {
              clearTimeout(heightDetectionTimeout);
              heightDetectionTimeout = null;
            }
            
            if (popup) {
              spinner && spinner.remove();
              iframe.style.visibility = "visible";
              fitToHeight(naturalH);
            }
          }
        } catch (e) {
          console.warn("Erro no listener de altura:", e);
        }
      };
      window.addEventListener("message", heightListener, { passive: true });
    }

    // MutationObserver como fallback
    if (moIframe) moIframe.disconnect();
    moIframe = new MutationObserver(() => {
      try {
        const h = readNaturalHeight();
        if (h > 100 && h !== naturalH) {
          console.log("Altura detectada via MutationObserver:", h);
          
          naturalH = h;
          
          if (heightDetectionTimeout) {
            clearTimeout(heightDetectionTimeout);
            heightDetectionTimeout = null;
          }
          
          if (popup) {
            spinner && spinner.remove();
            iframe.style.visibility = "visible";
            fitToHeight(naturalH);
          }
        }
      } catch (e) {
        console.warn("Erro no MutationObserver:", e);
      }
    });
    moIframe.observe(iframe, { attributes: true, attributeFilter: ["style", "height"] });
  }

  // ---------- ajuste de tamanho ----------
  function fitToHeight(h) {
    if (!popup || !iframe || h <= 0) return;
    try {
      const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      const headH = Math.round(head?.getBoundingClientRect().height || HEAD_FALL);

      let popupW = Math.min(1200, Math.floor(vw * 0.95));
      const isSmallScreen = vw < 1200 || vh < 820;
      
      if (isSmallScreen) {
        popup.style.left = "50%"; 
        popup.style.top = "50%";
        popup.style.right = "auto"; 
        popup.style.transform = "translate(-50%, -50%)";
      } else {
        popup.style.left = "auto"; 
        popup.style.right = "20px";
        popup.style.top = "72px"; 
        popup.style.transform = "none";
      }
      
      popup.style.width = popupW + "px";

      const maxContentH = Math.max(300, Math.floor(vh * 0.92) - headH);
      let scale = Math.min(1, maxContentH / h);
      scale = Math.max(scale, MIN_SCALE);
      
      const finalContentH = Math.round(h * scale);
      popup.style.height = (finalContentH + headH) + "px";

      iframe.style.transformOrigin = "top left";
      if (scale < 0.999) {
        iframe.style.transform = `scale(${scale})`;
        iframe.style.width = Math.round(popupW / scale) + "px";
        iframe.style.height = h + "px";
      } else {
        iframe.style.transform = "none";
        iframe.style.width = "100%";
        iframe.style.height = h + "px";
      }
    } catch (e) {
      console.warn("Erro no fitToHeight:", e);
      iframe.style.width = "100%";
      iframe.style.height = h + "px";
      iframe.style.transform = "none";
    }
  }

  // ---------- popup ----------
  function openPopup() {
    if (popup) return;
    ensureEmbedScript(() => {
      createPersistentIframe();
      buildPopup();
      content.appendChild(iframe);

      if (naturalH <= 0) naturalH = readNaturalHeight();
      if (naturalH > 100) {
        if (heightDetectionTimeout) {
          clearTimeout(heightDetectionTimeout);
          heightDetectionTimeout = null;
        }
        spinner && spinner.remove();
        iframe.style.visibility = "visible";
        fitToHeight(naturalH);
      } else {
        iframe.style.visibility = "hidden";
        if (!heightDetectionTimeout) {
          heightDetectionTimeout = setTimeout(forceDisplay, MAX_WAIT_TIME);
        }
      }
    });
  }

  function buildPopup() {
    if (popup) return;

    const backdrop = document.createElement("div");
    backdrop.id = BACKDROP_ID;
    backdrop.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,.25); z-index:999998;`;
    backdrop.onclick = closePopup;

    popup = document.createElement("div");
    popup.id = POPUP_ID;
    popup.style.cssText = `
      position:fixed; background:#fff; border-radius:12px; overflow:hidden;
      box-shadow:0 25px 50px rgba(0,0,0,.25); display:flex; flex-direction:column;
      border:1px solid #e2e8f0; z-index:999999; 
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;`;

    head = document.createElement("div");
    head.style.cssText = `
      background:linear-gradient(135deg,#4F46E5,#7C3AED); color:#fff; padding:10px 14px;
      display:flex; justify-content:space-between; align-items:center; 
      font-weight:600; font-size:13px; flex-shrink:0;`;
    head.innerHTML = `<span>Agendar Suporte</span>`;
    
    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
      background:rgba(255,255,255,.2); border:none; color:#fff; font-size:18px; 
      cursor:pointer; padding:2px 8px; border-radius:4px; min-width:auto;`;
    closeBtn.onclick = closePopup;
    head.appendChild(closeBtn);

    content = document.createElement("div");
    content.style.cssText = `
      position:relative; width:100%; flex:0 0 auto; overflow:hidden; 
      background:#fff; min-height:300px;`;

    spinner = document.createElement("div");
    spinner.style.cssText = `
      position:absolute; inset:0; display:flex; align-items:center; 
      justify-content:center; font-size:13px; color:#64748b; 
      background:#fff; z-index:1;`;
    spinner.textContent = "Carregando calendário…";
    content.appendChild(spinner);

    document.body.appendChild(backdrop);
    document.body.appendChild(popup);
    popup.appendChild(head);
    popup.appendChild(content);

    const vw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    popup.style.width = Math.min(INIT_W, Math.floor(vw * 0.90)) + "px";
    popup.style.height = Math.min(INIT_H, Math.floor(vh * 0.80)) + "px";
    popup.style.left = "50%"; 
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize, { passive: true });
  }

  function closePopup() {
    if (!popup) return;

    if (heightDetectionTimeout) {
      clearTimeout(heightDetectionTimeout);
      heightDetectionTimeout = null;
    }
    
    const stash = ensureStash();
    if (iframe && stash) {
      stash.appendChild(iframe);
      iframe.style.visibility = "hidden";
      iframe.style.transform = "none";
    }
    
    spinner && spinner.remove();

    const bd = document.getElementById(BACKDROP_ID);
    if (bd && bd.parentNode) bd.remove();
    popup.remove();
    popup = head = content = spinner = null;

    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
  }

  function onResize() {
    if (!popup || !iframe) return;
    clearTimeout(onResize.timeout);
    onResize.timeout = setTimeout(() => {
      const h = naturalH || readNaturalHeight();
      if (h > 0) fitToHeight(h);
    }, 150);
  }

  // ---------- botão na topbar ----------
  function createBtn() {
    const btn = document.createElement("button");
    btn.id = BTN_ID; 
    btn.type = "button";
    btn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <span class="ff-label">${LABEL}</span>
      </span>`;
    btn.setAttribute("aria-label", LABEL);
    btn.style.cssText = `
      background:#2563eb; color:#fff; border:none; padding:10px 14px; 
      border-radius:6px; cursor:pointer; font-weight:600; font-size:14px; 
      margin-left:12px; transition:all .2s; 
      box-shadow:0 2px 8px rgba(37,99,235,.25);
      display:inline-flex; align-items:center;`;
    
    btn.onmouseenter = () => btn.style.background = '#1d4ed8';
    btn.onmouseleave = () => btn.style.background = '#2563eb';
    
    const mql = window.matchMedia("(max-width:1024px)");
    const toggle = () => { 
      const s = btn.querySelector(".ff-label"); 
      if (s) s.style.display = mql.matches ? "none" : "inline"; 
    };
    toggle(); 
    mql.addEventListener?.("change", toggle);
    
    btn.onclick = (e) => { 
      e.preventDefault(); 
      e.stopPropagation(); 
      openPopup(); 
    };
    
    return btn;
  }

  function isInSubAccount() {
    return location.pathname.includes('/v2/location/');
  }

  function addButton() {
    // ✅ NOVO: se esta subconta estiver bloqueada, remove e não adiciona
    if (shouldHideSupportButtonHere()) {
      console.log("🚫 Botão de suporte oculto para esta subconta:", getLocationIdFromUrl());
      removeBtn();
      return false;
    }

    // (se não estiver em subconta, não adiciona)
    if (!isInSubAccount()) return false;

    const header = findHeader();
    if (!header) return false;
    if (document.getElementById(BTN_ID)) return true;
    
    const btn = createBtn();
    const tutorialBtn = Array.from(header.querySelectorAll("button, a"))
      .find(el => (el.textContent || "").trim().toLowerCase().startsWith("tutorial"));
    
    if (tutorialBtn && tutorialBtn.parentElement) {
      tutorialBtn.insertAdjacentElement("afterend", btn);
    } else {
      header.insertBefore(btn, header.firstChild);
    }
    
    return true;
  }

  function removeBtn() { 
    const b = document.getElementById(BTN_ID); 
    if (b) b.remove(); 
  }

  // ---------- SPA watchers ----------
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;

      if (popup) closePopup();

      // ✅ NOVO: garante remoção se entrar numa subconta bloqueada
      if (shouldHideSupportButtonHere()) {
        removeBtn();
        return;
      }

      if (!isInSubAccount()) {
        removeBtn();
      } else {
        removeBtn(); 
        addButton();
      }
    }
  }, 500);

  const mo = new MutationObserver(() => { 
    // ✅ NOVO: se bloqueado, remove sempre
    if (shouldHideSupportButtonHere()) {
      if (document.getElementById(BTN_ID)) removeBtn();
      return;
    }

    if (isInSubAccount() && !document.getElementById(BTN_ID)) {
      addButton();
    } else if (!isInSubAccount() && document.getElementById(BTN_ID)) {
      removeBtn();
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // init
  if (isInSubAccount()) {
    // ✅ NOVO: se bloqueado, remove e não inicia loop de add
    if (shouldHideSupportButtonHere()) {
      removeBtn();
      return;
    }

    const startIv = setInterval(() => { 
      if (addButton()) clearInterval(startIv);
    }, 100);
    
    setTimeout(() => clearInterval(startIv), 15000);
  }

})();
