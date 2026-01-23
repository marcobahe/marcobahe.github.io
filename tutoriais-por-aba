<script>
(function() {
  const wId = 'tw-' + Math.random().toString(36).substr(2, 6);
  let popup = null, dragging = false, dragStart = {x: 0, y: 0};
  
  // Configuração de tutoriais por área
  const tutorialConfig = {
    conversations: {
      urlPattern: 'conversations',
      videoId: 'QbupjK_y3Q4', // Substitua pelo ID do vídeo do YouTube
      buttonText: 'Tutorial Conversas',
      popupTitle: 'Tutorial da Área de Conversas'
    },
    contacts: {
      urlPattern: 'contacts',
      videoId: 'RshxzSa8iXE', // Substitua pelo ID do vídeo do YouTube
      buttonText: 'Tutorial Contatos',
      popupTitle: 'Tutorial da Área de Contatos'
    },
    // Adicione mais áreas conforme necessário
    // dashboard: {
    //   urlPattern: 'dashboard',
    //   videoId: 'SEU_ID_DO_VIDEO_DASHBOARD',
    //   buttonText: 'Tutorial Dashboard',
    //   popupTitle: 'Tutorial do Dashboard'
    // }
  };
  
  // Função para detectar a área atual com base na URL
  function detectCurrentArea() {
    const currentUrl = window.location.href.toLowerCase();
    
    for (const [areaKey, config] of Object.entries(tutorialConfig)) {
      if (currentUrl.includes(config.urlPattern.toLowerCase())) {
        return {
          key: areaKey,
          config: config
        };
      }
    }
    
    return null; // Nenhuma área correspondente encontrada
  }
  
  function addButton() {
    // Tenta diferentes seletores para encontrar o header
    const selectors = [
      '.header-bar .container-fluid > .header--controls',
      '.header .container-fluid > .header--controls',
      '.hl_header .container-fluid > .hl_header--controls', // Se for similar ao GoHighLevel
      '.main-header .container-fluid > .header-controls',
      '.top-bar .container-fluid > .controls',
      '.navbar .container-fluid > .nav-controls',
      '.header-controls',
      '.header--controls',
      '.nav-controls',
      '.controls'
    ];
    
    let header = null;
    for (const selector of selectors) {
      header = document.querySelector(selector);
      if (header) break;
    }
    
    if (!header || document.getElementById(wId + '-btn')) return false;
    
    // Detecta a área atual
    const currentArea = detectCurrentArea();
    if (!currentArea) return false; // Não está em uma área com tutorial configurado
    
    const btn = document.createElement('button');
    btn.id = wId + '-btn';
    btn.textContent = currentArea.config.buttonText;
    btn.style.cssText = 'background: linear-gradient(135deg, #4F46E5, #7C3AED) !important; color: #fff !important; border: none !important; padding: 10px 18px !important; border-radius: 6px !important; cursor: pointer !important; font-weight: 600 !important; font-size: 14px !important; margin-right: 12px !important; transition: all 0.3s ease !important; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3) !important;';
    
    btn.onmouseenter = () => btn.style.background = 'linear-gradient(135deg, #3730A3, #6D28D9) !important';
    btn.onmouseleave = () => btn.style.background = 'linear-gradient(135deg, #4F46E5, #7C3AED) !important';
    btn.onclick = () => openPopup(currentArea.config);
    
    header.insertBefore(btn, header.firstChild);
    console.log('✅ Tutorial Widget ativo para área:', currentArea.key);
    return true;
  }
  
  function openPopup(areaConfig) {
    if (popup) return;
    
    popup = document.createElement('div');
    popup.style.cssText = 'position: fixed !important; right: 20px !important; top: 60px !important; width: 650px !important; height: 450px !important; background: #fff !important; border-radius: 12px !important; overflow: hidden !important; box-shadow: 0 25px 50px rgba(0,0,0,0.25) !important; display: flex !important; flex-direction: column !important; border: 1px solid #e2e8f0 !important; z-index: 999999 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    
    const header = document.createElement('div');
    header.style.cssText = 'background: linear-gradient(135deg, #4F46E5, #7C3AED) !important; color: #fff !important; padding: 12px 16px !important; display: flex !important; justify-content: space-between !important; align-items: center !important; font-weight: 600 !important; font-size: 14px !important; cursor: move !important; user-select: none !important;';
    
    const title = document.createElement('span');
    title.textContent = areaConfig.popupTitle;
    title.style.cssText = 'color: #fff !important;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = 'background: rgba(255,255,255,0.2) !important; border: none !important; color: #fff !important; font-size: 18px !important; cursor: pointer !important; padding: 4px 8px !important; border-radius: 4px !important; transition: background 0.2s !important;';
    closeBtn.onclick = closePopup;
    
    // Container para o vídeo do YouTube
    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = 'position: relative !important; width: 100% !important; height: 0 !important; padding-bottom: 56.25% !important; flex: 1 !important;';
    
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: none !important;';
    iframe.src = `https://www.youtube.com/embed/${areaConfig.videoId}?rel=0&modestbranding=1`;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    
    header.onmousedown = startDrag;
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    videoContainer.appendChild(iframe);
    popup.appendChild(header);
    popup.appendChild(videoContainer);
    document.body.appendChild(popup);
  }
  
  function startDrag(e) {
    dragging = true;
    const rect = popup.getBoundingClientRect();
    dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.onmousemove = drag;
    document.onmouseup = stopDrag;
    e.preventDefault();
  }
  
  function drag(e) {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth - popup.offsetWidth, e.clientX - dragStart.x));
    const y = Math.max(0, Math.min(window.innerHeight - popup.offsetHeight, e.clientY - dragStart.y));
    popup.style.right = 'auto';
    popup.style.top = 'auto';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
  }
  
  function stopDrag() {
    dragging = false;
    document.onmousemove = null;
    document.onmouseup = null;
  }
  
  function closePopup() {
    if (popup && popup.parentNode) {
      popup.remove();
      popup = null;
    }
  }
  
  // Função para verificar mudanças de URL (para SPAs)
  function checkForUrlChange() {
    // Remove botão existente se houver
    const existingBtn = document.getElementById(wId + '-btn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    // Fecha popup aberto se houver
    closePopup();
    
    // Tenta adicionar o botão novamente
    addButton();
  }
  
  // Monitora mudanças de URL
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      checkForUrlChange();
    }
  }, 500);
  
  // Tenta adicionar o botão inicialmente
  const interval = setInterval(() => {
    if (addButton()) {
      clearInterval(interval);
    }
  }, 100);
  
  // Limpa o intervalo após 10 segundos
  setTimeout(() => clearInterval(interval), 10000);
})();
</script>
