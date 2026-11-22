(() => {
    const locale = document.documentElement.lang === "en" ? "en" : "ru";
    const english = locale === "en";
    const labels = english ? {
        noWindows: "No windows found.",
        inFront: title => `“${title}” is in front.`,
        minimized: "Window minimized",
        minimizeStatus: "Window minimized. You can restore the group’s tab bar.",
        waiting: "Waiting for the window to open",
        waitingDescription: " — waiting for the window to open",
        groupOpened: group => `“${group.title}” opened. ${group.availability}.`,
        groupRestored: group => `The “${group.title}” group’s tab bar has been restored.`,
        restart: "Restarting…",
        restartComplete: group => `Groups saved. “${group.title}” is available again.`,
    } : {
        noWindows: "Окна не найдены.",
        inFront: title => `Окно «${title}» на переднем плане.`,
        minimized: "Окно свёрнуто",
        minimizeStatus: "Окно свёрнуто. Можно вернуть панель группы.",
        waiting: "Ожидает открытия окна",
        waitingDescription: " — ожидает открытия",
        groupOpened: group => `Группа «${group.title}» открыта. ${group.availability}.`,
        groupRestored: group => `Панель группы «${group.title}» восстановлена.`,
        restart: "Перезапуск…",
        restartComplete: group => `Группы сохранены. Группа «${group.title}» снова доступна.`,
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    document.querySelectorAll("[data-wf-search]").forEach((lab) => {
        const form = lab.querySelector("[data-wf-search-form]");
        const input = form.querySelector("input");
        const results = form.querySelector("[role=listbox]");
        const empty = form.querySelector("[data-wf-empty]");
        const windows = Array.from(results.querySelectorAll("[data-wf-window]"));
        const target = lab.querySelector("[data-wf-open-window]");
        const targetGroup = target.querySelector("[data-wf-open-group]");
        const targetApp = target.querySelector("[data-wf-open-app]");
        const targetTitle = target.querySelector("[data-wf-open-title]");
        const status = lab.querySelector("[data-wf-search-status]");
        let options = windows;
        let selected = windows[0];
        let activeWindow = windows[0];

        function select(option) {
            selected = option;
            windows.forEach((row) => row.setAttribute("aria-selected", String(row === option)));
            if (option) input.setAttribute("aria-activedescendant", option.id);
            else input.removeAttribute("aria-activedescendant");
        }

        function filter() {
            const terms = input.value.toLocaleLowerCase(locale).trim().split(/\s+/).filter(Boolean);
            options = windows.filter((row) => {
                const label = row.textContent.toLocaleLowerCase(locale);
                const matches = terms.every((term) => label.includes(term));
                row.hidden = !matches;
                return matches;
            });
            results.hidden = options.length === 0;
            empty.hidden = options.length !== 0;
            input.setAttribute("aria-expanded", String(options.length > 0));
            select(options.includes(selected) ? selected : options[0]);
            if (!options.length) status.textContent = labels.noWindows;
        }

        function showWindow(option) {
            if (!option) return;
            activeWindow = option;
            if (options.includes(option)) select(option);
            const title = option.querySelector(".wf-search-names strong").textContent;
            target.dataset.glyph = option.dataset.glyph;
            targetGroup.textContent = option.dataset.group;
            targetApp.textContent = option.dataset.app;
            targetTitle.textContent = title;
            status.textContent = labels.inFront(title);
            if (!reduceMotion.matches) {
                target.classList.remove("wf-raised");
                void target.offsetWidth;
                target.classList.add("wf-raised");
            }
        }

        function step(direction) {
            const siblings = windows.filter((row) => row.dataset.group === activeWindow.dataset.group);
            const index = siblings.indexOf(activeWindow);
            showWindow(siblings[(index + direction + siblings.length) % siblings.length]);
        }

        function focusSearch() {
            input.focus();
            input.select();
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();
            showWindow(selected);
        });
        input.addEventListener("input", filter);
        form.addEventListener("keydown", (event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            if (event.key === "Escape" && input.value) {
                input.value = "";
                filter();
                return;
            }
            if (!options.length || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            const direction = event.key === "ArrowUp" ? -1 : 1;
            const index = (options.indexOf(selected) + direction + options.length) % options.length;
            input.focus();
            select(options[index]);
        });
        windows.forEach((row) => row.addEventListener("click", () => showWindow(row)));
        lab.querySelector("[data-wf-find]").addEventListener("click", focusSearch);
        lab.querySelectorAll("[data-wf-step]").forEach((button) => {
            button.addEventListener("click", () => step(Number(button.dataset.wfStep)));
        });
        lab.addEventListener("keydown", (event) => {
            if (!event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey) return;
            if (event.code === "KeyS") {
                event.preventDefault();
                focusSearch();
            } else if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
                event.preventDefault();
                step(event.key === "ArrowLeft" ? -1 : 1);
            }
        });
    });

    const apps = english
        ? { notes: "Notes", terminal: "Terminal", browser: "Browser", messages: "Messages" }
        : { notes: "Заметки", terminal: "Терминал", browser: "Браузер", messages: "Сообщения" };
    const samples = english ? {
        launch: { title: "Launch", document: "Launch plan", availability: "3 windows open" },
        research: { title: "Research", document: "Reading list", availability: "1 open · 1 waiting" },
        team: { title: "Team", document: "Team chat", availability: "2 windows open" },
    } : {
        launch: { title: "Запуск", document: "План запуска", availability: "3 окна открыты" },
        research: { title: "Исследование", document: "Материалы", availability: "1 открыто · 1 ожидает" },
        team: { title: "Команда", document: "Командный чат", availability: "2 окна открыты" },
    };
    const groups = {
        launch: {
            ...samples.launch,
            app: apps.notes,
            tabs: [{ title: apps.notes }, { title: apps.terminal }, { title: apps.browser }],
        },
        research: {
            ...samples.research,
            app: apps.browser,
            tabs: [{ title: apps.browser }, { title: apps.notes, waiting: true }],
        },
        team: {
            ...samples.team,
            app: apps.messages,
            tabs: [{ title: apps.messages, badge: 3 }, { title: apps.notes }],
        },
    };

    document.querySelectorAll("[data-wf-workspace]").forEach((lab) => {
        const menu = lab.querySelector("[data-wf-menu]");
        const menuButton = lab.querySelector("[data-wf-menu-button]");
        const groupButtons = Array.from(menu.querySelectorAll("[data-wf-group]"));
        const window = lab.querySelector("[data-wf-work-window]");
        const empty = lab.querySelector("[data-wf-work-empty]");
        const emptyLabel = empty.querySelector("[data-wf-work-empty-label]");
        const title = window.querySelector("[data-wf-work-title]");
        const app = window.querySelector("[data-wf-work-app]");
        const context = window.querySelector("[data-wf-work-context]");
        const documentTitle = window.querySelector("[data-wf-work-document]");
        const tabs = window.querySelector("[data-wf-work-tabs]");
        const restore = lab.querySelector("[data-wf-restore]");
        const status = lab.querySelector("[data-wf-workspace-status]");
        let current = "launch";
        let restartTimer;

        function showMenu(shown) {
            menu.hidden = !shown;
            menuButton.setAttribute("aria-expanded", String(shown));
        }

        function showPanel(shown, message = labels.minimized) {
            window.hidden = !shown;
            empty.hidden = shown;
            emptyLabel.textContent = message;
        }

        function makeTab({ title: name, waiting, badge }) {
            const tab = document.createElement("span");
            const label = document.createElement("span");
            tab.className = "wf-work-tab";
            label.textContent = name;
            tab.append(label);
            if (waiting) {
                tab.classList.add("is-waiting");
                tab.title = labels.waiting;
                const state = document.createElement("span");
                state.className = "wf-sr";
                state.textContent = labels.waitingDescription;
                tab.append(state);
            }
            if (badge) {
                const count = document.createElement("span");
                count.className = "wf-mini-badge";
                count.textContent = badge;
                tab.append(count);
            }
            return tab;
        }

        function openGroup(key) {
            const group = groups[key];
            current = key;
            window.dataset.groupTone = key;
            title.textContent = group.title;
            app.textContent = group.app;
            context.textContent = group.availability;
            documentTitle.textContent = group.document;
            tabs.replaceChildren(...group.tabs.map(makeTab));
            groupButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.wfGroup === key)));
            showPanel(true);
        }

        function stopRestart() {
            clearTimeout(restartTimer);
        }

        menuButton.addEventListener("click", () => showMenu(menu.hidden));
        groupButtons.forEach((button) => button.addEventListener("click", () => {
            stopRestart();
            openGroup(button.dataset.wfGroup);
            showMenu(false);
            menuButton.focus();
            status.textContent = labels.groupOpened(groups[current]);
        }));
        lab.querySelector("[data-wf-minimize]").addEventListener("click", () => {
            stopRestart();
            showPanel(false);
            restore.focus();
            status.textContent = labels.minimizeStatus;
        });
        restore.addEventListener("click", () => {
            stopRestart();
            openGroup(current);
            status.textContent = labels.groupRestored(groups[current]);
        });
        lab.querySelector("[data-wf-restart]").addEventListener("click", () => {
            stopRestart();
            const finish = () => {
                openGroup(current);
                showMenu(true);
                status.textContent = labels.restartComplete(groups[current]);
            };
            if (reduceMotion.matches) finish();
            else {
                showPanel(false, labels.restart);
                showMenu(false);
                restartTimer = setTimeout(finish, 420);
            }
        });
        lab.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !menu.hidden) {
                event.preventDefault();
                showMenu(false);
                menuButton.focus();
            }
        });
    });
})();
