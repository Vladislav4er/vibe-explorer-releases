(() => {
    const english = document.documentElement.lang === "en";
    const zoomLabels = english ? ["Maximize", "Restore size"] : ["Развернуть", "Вернуть размер"];
    const index = document.querySelector(".guide-index");
    const links = [...index.querySelectorAll("a")];
    const chapters = links.map(link => document.querySelector(link.hash));

    // Keep the index aligned with both deep links and ordinary scrolling.
    function highlightChapter() {
        const mobile = getComputedStyle(index).display === "flex";
        const top = parseFloat(getComputedStyle(index).top) + (mobile ? index.offsetHeight : 0) + 16;
        let current = 0;
        chapters.forEach((chapter, position) => {
            if (chapter.getBoundingClientRect().top <= top) current = position;
        });
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = links.length - 1;
        if (links[current].hasAttribute("aria-current")) return;
        for (const link of links) link.removeAttribute("aria-current");
        const selected = links[current];
        selected.setAttribute("aria-current", "location");
        if (mobile) {
            const outside = selected.offsetLeft < index.scrollLeft || selected.offsetLeft + selected.offsetWidth > index.scrollLeft + index.clientWidth;
            if (outside) index.scrollLeft = selected.offsetLeft - (index.clientWidth - selected.offsetWidth) / 2;
        }
    }

    let frame = 0;
    function scheduleHighlight() {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            highlightChapter();
        });
    }

    window.addEventListener("scroll", scheduleHighlight, { passive: true });
    window.addEventListener("resize", scheduleHighlight);
    window.addEventListener("load", scheduleHighlight);
    highlightChapter();

    const lab = document.querySelector(".size-lab");
    const stage = lab.querySelector(".size-stage");
    const win = lab.querySelector(".size-window");
    const slider = lab.querySelector("input");
    const zoom = lab.querySelector(".size-zoom");
    const grip = lab.querySelector(".size-grip");
    let expanded = false;
    let initialDrag = null;

    function setGeometry() {
        const fraction = Number(slider.value) / 100;
        win.style.width = expanded ? "100%" : (64 + 28 * fraction) + "%";
        win.style.height = expanded ? "100%" : (67 + 24 * fraction) + "%";
        win.style.left = expanded ? "0" : "6%";
        win.style.top = expanded ? "0" : "5%";
        win.style.borderRadius = expanded ? "0" : "";
        zoom.setAttribute("aria-pressed", String(expanded));
        zoom.textContent = zoomLabels[expanded ? 1 : 0];
        grip.hidden = expanded;
    }

    function toggleZoom() {
        expanded = !expanded;
        setGeometry();
    }

    lab.querySelector(".size-bar").addEventListener("dblclick", event => {
        if (!event.target.closest("button")) toggleZoom();
    });
    zoom.addEventListener("click", toggleZoom);
    slider.addEventListener("input", () => { expanded = false; setGeometry(); });
    grip.addEventListener("pointerdown", event => {
        if (!event.isPrimary || event.button !== 0) return;
        event.preventDefault();
        initialDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, value: Number(slider.value) };
        grip.setPointerCapture(event.pointerId);
    });
    grip.addEventListener("pointermove", event => {
        if (!initialDrag || initialDrag.id !== event.pointerId) return;
        const dx = (event.clientX - initialDrag.x) / (stage.clientWidth * .28);
        const dy = (event.clientY - initialDrag.y) / (stage.clientHeight * .24);
        slider.value = String(initialDrag.value + 100 * (Math.abs(dx) > Math.abs(dy) ? dx : dy));
        setGeometry();
    });
    grip.addEventListener("lostpointercapture", () => { initialDrag = null; });

    const tabs = lab.querySelectorAll("[data-size-app]");
    tabs.forEach(tab => tab.addEventListener("click", () => {
        tabs.forEach(candidate => candidate.setAttribute("aria-pressed", String(candidate === tab)));
        lab.querySelectorAll("[data-size-pane]").forEach(pane => { pane.hidden = pane.dataset.sizePane !== tab.dataset.sizeApp; });
    }));
    const nameField = lab.querySelector("[data-size-name]");
    const groupName = lab.querySelector(".size-bar b");
    nameField.addEventListener("input", () => { groupName.textContent = nameField.value.trim() || nameField.defaultValue; });
    nameField.addEventListener("blur", () => { nameField.value = groupName.textContent; });
    const swatches = lab.querySelectorAll("[data-swatch]");
    for (const swatch of swatches) {
        swatch.addEventListener("click", () => {
            lab.style.setProperty("--size-accent", swatch.style.getPropertyValue("--swatch"));
            swatches.forEach(button => button.setAttribute("aria-pressed", String(button === swatch)));
        });
    }
    setGeometry();

    const update = document.querySelector(".update-lab");
    const updateAction = update.querySelector("[data-update-action]");
    const installed = update.querySelector("[data-update-installed]");
    const status = update.querySelector("[data-update-message]");
    const nextVersion = english
        ? ["Version 1.0.1", "Version 1.0.2 is available.", "Install and Restart"]
        : ["Версия 1.0.1", "Доступна версия 1.0.2.", "Установить и перезапустить"];
    const updated = english
        ? ["Version 1.0.2", "Update installed. Your groups are available after restart.", "Replay Demo"]
        : ["Версия 1.0.2", "Обновление установлено. Группы доступны после перезапуска.", "Повторить демо"];
    const updateSteps = [
        [installed.textContent, status.textContent, updateAction.textContent],
        nextVersion,
        updated
    ];
    let step = 0;
    updateAction.addEventListener("click", () => {
        step = (step + 1) % updateSteps.length;
        [installed.textContent, status.textContent, updateAction.textContent] = updateSteps[step];
    });
})();
