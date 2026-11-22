(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-vibe-demo]").forEach((demo) => {
    const tabs = Array.from(demo.querySelectorAll("[data-demo-tab]"));
    const panes = demo.querySelectorAll("[data-demo-pane]");
    const controls = demo.querySelectorAll("[data-demo-action]");
    const panel = demo.querySelector("[role=tabpanel]");
    const status = demo.querySelector("[data-demo-status]");
    const introTimers = [];
    let groupTimer;
    let interacted = false;

    if (!panel || !status || !tabs.length) return;

    function show(view, {
      phase = demo.dataset.phase,
      paired = demo.dataset.paired === "true",
      mode = demo.dataset.mode,
      message = "",
    } = {}) {
      Object.assign(demo.dataset, { view, phase, paired: String(paired), mode });
      tabs.forEach((tab) => {
        const key = tab.dataset.demoTab;
        tab.hidden = key === "split" ? !paired : key !== "browser" && (paired || (key === "terminal" && phase !== "joined"));
        tab.setAttribute("aria-selected", String(key === view));
        tab.tabIndex = key === view ? 0 : -1;
        if (key === view) panel.setAttribute("aria-labelledby", tab.id);
      });
      panes.forEach((pane) => {
        const key = pane.dataset.demoPane;
        pane.hidden = view === "split" ? key === "browser" : key !== view;
      });
      controls.forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.demoAction === mode));
      });
      if (message) status.textContent = message;
    }

    function group(announce) {
      window.clearTimeout(groupTimer);
      const finish = () => show("notes", {
        phase: "joined", paired: false, mode: "group",
        message: announce ? "Терминал добавлен в группу с помощью Shift." : "",
      });
      if (reducedMotion.matches) {
        finish();
        return;
      }

      show("notes", { phase: "ready", paired: false, mode: "group" });
      // A replay commits the starting position before the drag transition.
      demo.getBoundingClientRect();
      show("notes", { phase: "dragging" });
      groupTimer = window.setTimeout(finish, 770);
    }

    function switchTab(announce) {
      window.clearTimeout(groupTimer);
      const paired = demo.dataset.paired === "true";
      const current = demo.dataset.view;
      const next = paired ? (current === "browser" ? "split" : "browser")
        : current === "notes" ? "terminal" : "notes";
      show(next, {
        phase: "joined", mode: "switch",
        message: announce ? "Вкладка переключена." : "",
      });
    }

    function openSplit(announce) {
      window.clearTimeout(groupTimer);
      show("split", {
        phase: "joined", paired: true, mode: "split",
        message: announce ? "Заметки и Терминал открыты рядом в общей вкладке." : "",
      });
    }

    function stopIntro() {
      interacted = true;
      introTimers.splice(0).forEach((timer) => window.clearTimeout(timer));
    }

    function choose(tab) {
      window.clearTimeout(groupTimer);
      const phase = demo.dataset.phase === "dragging" ? "joined" : demo.dataset.phase;
      const view = tab.dataset.demoTab;
      show(view, { phase, mode: view === "split" ? "split" : "switch" });
    }

    demo.addEventListener("focusin", stopIntro);
    controls.forEach((control) => {
      control.addEventListener("click", () => {
        stopIntro();
        switch (control.dataset.demoAction) {
          case "group": group(true); break;
          case "switch": switchTab(true); break;
          case "split": openSplit(true); break;
        }
      });
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => { stopIntro(); choose(tab); });
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const visible = tabs.filter((candidate) => !candidate.hidden);
        const position = visible.indexOf(tab);
        let next = position;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = visible.length - 1;
        if (event.key === "ArrowRight") next = (position + 1) % visible.length;
        if (event.key === "ArrowLeft") next = (position + visible.length - 1) % visible.length;
        choose(visible[next]);
        visible[next].focus();
      });
    });

    if (!reducedMotion.matches && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        if (interacted || reducedMotion.matches) return;
        introTimers.push(window.setTimeout(() => group(false), 400));
        introTimers.push(window.setTimeout(() => switchTab(false), 1850));
        introTimers.push(window.setTimeout(() => openSplit(false), 3150));
      }, { threshold: 0.45 });
      observer.observe(demo);
    }
  });
})();
