(() => {
  const english = document.documentElement.lang === 'en';

  function setPressed(buttons, selected) {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
  }

  function setupAppearance(section) {
    const windowView = section.querySelector('.view-window');
    const themes = [...section.querySelectorAll('[data-view-mode]')];
    const tabs = [...section.querySelectorAll('[data-view-app]')];
    const contents = section.querySelectorAll('[data-view-content]');
    const width = section.querySelector('input[type="range"]');
    const preview = section.querySelector('.view-preview');
    const previewCaption = section.querySelector('.view-preview-copy');
    const previewButton = section.querySelector('.view-preview-button');

    let activeTab = tabs[0];
    let hoverTab = null;
    let focusedTab = null;
    let explicitPreview = false;

    function updatePreview() {
      const tab = hoverTab || focusedTab || (explicitPreview ? activeTab : null);
      preview.hidden = !tab;
      previewButton.setAttribute('aria-pressed', String(explicitPreview));
      if (!tab) return;
      preview.dataset.preview = tab.dataset.viewApp;
      const name = tab.querySelector('em').textContent;
      previewCaption.textContent = english ? `“${name}” preview` : `Превью «${name}»`;
      preview.style.setProperty('--view-preview-left', `${tab.offsetLeft}px`);
    }

    function clearPreview() {
      hoverTab = null;
      focusedTab = null;
      explicitPreview = false;
      updatePreview();
    }

    for (const theme of themes) {
      theme.addEventListener('click', () => {
        windowView.dataset.mode = theme.dataset.viewMode;
        setPressed(themes, theme);
      });
    }

    width.addEventListener('input', () => {
      windowView.style.setProperty('--view-tab-width', `${width.valueAsNumber}px`);
      updatePreview();
    });

    for (const tab of tabs) {
      tab.addEventListener('click', () => {
        activeTab = tab;
        const app = tab.dataset.viewApp;
        windowView.dataset.current = app;
        setPressed(tabs, tab);
        for (const content of contents) content.hidden = content.dataset.viewContent !== app;
        clearPreview();
      });

      tab.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        hoverTab = tab;
        updatePreview();
      });
      tab.addEventListener('pointerleave', () => {
        if (hoverTab === tab) hoverTab = null;
        updatePreview();
      });
      tab.addEventListener('focus', () => {
        if (tab.matches(':focus-visible')) focusedTab = tab;
        updatePreview();
      });
      tab.addEventListener('blur', () => {
        if (focusedTab === tab) focusedTab = null;
        updatePreview();
      });
    }

    previewButton.addEventListener('click', () => {
      explicitPreview = !explicitPreview;
      updatePreview();
    });

    section.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || preview.hidden) return;
      clearPreview();
    });
  }

  function setupDesktops(section) {
    const places = section.querySelector('.view-places');
    const kinds = [...section.querySelectorAll('[data-view-kind]')];
    const destinations = [...section.querySelectorAll('.view-destination')];
    const targets = destinations.map((destination) => destination.querySelector('.view-target'));
    const names = destinations.map((destination) => destination.querySelector('.view-destination-name'));
    const windowView = section.querySelector('.view-drag-window');
    const location = section.querySelector('.view-location');
    const groupName = english ? 'Studio' : 'Студия';
    const labels = english
      ? { space: ['Desktop 1', 'Desktop 2'], monitor: ['Built-in display', 'External monitor'] }
      : { space: ['Рабочий стол 1', 'Рабочий стол 2'], monitor: ['Встроенный экран', 'Внешний монитор'] };
    const locations = english
      ? { space: ['on Desktop 1', 'on Desktop 2'], monitor: ['on the built-in display', 'on the external monitor'] }
      : { space: ['на рабочем столе 1', 'на рабочем столе 2'], monitor: ['на встроенном экране', 'на внешнем мониторе'] };
    const currentPlaces = { space: 0, monitor: 0 };
    let kind = 'space';

    function clearDrag() {
      delete windowView.dataset.dragging;
      for (const destination of destinations) delete destination.dataset.drop;
    }

    function updateLocation() {
      const index = currentPlaces[kind];
      const destination = destinations[index];
      if (windowView.parentElement !== destination) destination.append(windowView);
      setPressed(targets, targets[index]);
      location.textContent = english ? `The “${groupName}” group is ${locations[kind][index]}` : `Группа «${groupName}» ${locations[kind][index]}`;
    }

    function moveTo(index) {
      clearDrag();
      if (index === currentPlaces[kind]) return;
      currentPlaces[kind] = index;
      updateLocation();
    }

    windowView.addEventListener('dragstart', (event) => {
      if (!event.dataTransfer) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', groupName);
      windowView.dataset.dragging = '';
    });
    windowView.addEventListener('dragend', clearDrag);

    destinations.forEach((destination, index) => {
      targets[index].addEventListener('click', () => moveTo(index));
      destination.addEventListener('dragover', (event) => {
        if (!('dragging' in windowView.dataset) || index === currentPlaces[kind]) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        destination.dataset.drop = '';
      });
      destination.addEventListener('dragleave', (event) => {
        if (destination.contains(event.relatedTarget)) return;
        delete destination.dataset.drop;
      });
      destination.addEventListener('drop', (event) => {
        if (!('dragging' in windowView.dataset)) return;
        event.preventDefault();
        moveTo(index);
      });
    });

    for (const button of kinds) {
      button.addEventListener('click', () => {
        const next = button.dataset.viewKind;
        if (next === kind) return;
        clearDrag();
        kind = next;
        places.dataset.kind = kind;
        setPressed(kinds, button);
        names.forEach((name, index) => { name.textContent = labels[kind][index]; });
        updateLocation();
      });
    }
  }

  const appearance = document.querySelector('#appearance .view-lab');
  const desktops = document.querySelector('#desktops .view-lab');
  if (appearance) setupAppearance(appearance);
  if (desktops) setupDesktops(desktops);
})();
