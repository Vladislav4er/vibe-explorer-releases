(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const examples = {
        notes: {
            label: "Заметки", glyph: "≡",
            body: '<h3>План запуска</h3><ul class="wg-task-list"><li>Собрать материалы</li><li>Проверить макет</li><li>Опубликовать сборку</li></ul>',
        },
        terminal: {
            label: "Терминал", glyph: "›",
            body: '<p class="wg-terminal-code"><strong>❯</strong> swift build<br><span class="wg-build-result">Сборка завершена</span><br><strong>❯</strong> ▍</p>',
        },
        browser: {
            label: "Браузер", glyph: "◉",
            body: '<h3>Материалы проекта</h3><p>Коллекция ссылок и макетов</p><span class="wg-bookmark">Референсы интерфейса</span>',
        },
        docs: {
            label: "Документы", glyph: "▤",
            body: '<h3>Гайд по выпуску</h3><p>Открыть перечень проверок перед публикацией.</p>',
        },
    };

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function button(className, label) {
        const node = element("button", className, label);
        node.type = "button";
        return node;
    }

    function icon(id) {
        const node = element("span", "wg-icon", examples[id]?.glyph);
        node.dataset.icon = id;
        node.setAttribute("aria-hidden", "true");
        return node;
    }

    function titleBar(label, control) {
        const bar = element("div", "wg-titlebar");
        const lights = element("span", "wg-lights");
        lights.setAttribute("aria-hidden", "true");
        lights.append(element("i"), element("i"), element("i"));
        bar.append(lights, element("span", "wg-window-title", label));
        if (control) bar.append(control);
        return bar;
    }

    function surface(id, control) {
        const app = examples[id];
        const pane = element("div", "wg-window");
        pane.dataset.app = id;
        const content = element("div", "wg-window-content");
        // Sample markup is fixed. Interactive labels are set as text.
        content.innerHTML = app.body;
        pane.append(titleBar(app.label, control), content);
        return pane;
    }

    function tabStrip(label, panelID) {
        const strip = element("div", "wg-strip");
        const list = element("div", "wg-tabs");
        list.setAttribute("role", "tablist");
        list.setAttribute("aria-label", "Вкладки · " + label);
        list.dataset.panel = panelID;
        strip.append(element("span", "wg-group-name", label), list);
        return { strip, list };
    }

    function tab(list, id, label, active) {
        const node = button("wg-tab");
        node.id = list.dataset.panel + "-" + id;
        node.setAttribute("role", "tab");
        node.setAttribute("aria-controls", list.dataset.panel);
        node.setAttribute("aria-selected", String(active));
        node.tabIndex = active ? 0 : -1;
        node.append(icon(id), element("span", "", label));
        list.append(node);
        return node;
    }

    function tabPanel(node, id, selected) {
        node.id = id;
        node.setAttribute("role", "tabpanel");
        node.setAttribute("aria-labelledby", id + "-" + selected);
        node.tabIndex = 0;
    }

    function navigateTabs(event, repaint) {
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return false;
        const target = event.target.closest("[role=tab]");
        if (!target) return false;
        const tabs = Array.from(target.closest("[role=tablist]").querySelectorAll("[role=tab]"));
        const index = tabs.indexOf(target);
        const step = event.key === "ArrowLeft" ? -1 : 1;
        const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1)
            : tabs[(index + step + tabs.length) % tabs.length];
        event.preventDefault();
        repaint(next);
        return true;
    }

    function windowPositions(demo) {
        return new Map(Array.from(demo.querySelectorAll("[data-window-key]"), (node) => [
            node.dataset.windowKey, node.getBoundingClientRect(),
        ]));
    }

    function animateWindows(demo, previous) {
        if (!previous || reducedMotion.matches) return;
        demo.querySelectorAll("[data-window-key]").forEach((node) => {
            const old = previous.get(node.dataset.windowKey);
            if (!old || !node.animate) return;
            const now = node.getBoundingClientRect();
            const dx = old.left - now.left;
            const dy = old.top - now.top;
            if (Math.abs(dx) + Math.abs(dy) < 2) return;
            node.animate([{ transform: "translate(" + dx + "px, " + dy + "px)" }, { transform: "translate(0, 0)" }],
                { duration: 290, easing: "cubic-bezier(.2,.75,.25,1)" });
        });
    }

    function groupsDemo(demo) {
        const desk = demo.querySelector(".wg-groups-desk");
        const loose = demo.querySelector("[data-loose-windows]");
        const status = demo.querySelector("[data-groups-status]");
        const frames = {
            work: demo.querySelector('[data-groups-target="work"]'),
            reference: demo.querySelector('[data-groups-target="reference"]'),
        };
        const commands = Object.fromEntries(Array.from(demo.querySelectorAll("[data-groups-action]"),
            (node) => [node.dataset.groupsAction, node]));
        const names = { work: "Проект", reference: "Справка" };
        const instructions = "Перетащите отдельное окно с Shift или нажмите «Сгруппировать».";
        let model, drag, dropTarget;

        function reset() {
            model = {
                windows: { work: ["notes"], reference: ["docs"], outside: ["browser", "terminal"] },
                selected: { work: "notes", reference: "docs" }, active: "work",
                looseChoice: "browser", grouped: false, locked: { work: false, reference: false }, picker: null,
            };
            render(instructions);
        }

        function grouped(id) { return id === "reference" || model.grouped; }

        function renderGroup(id) {
            const frame = frames[id];
            const current = model.selected[id];
            frame.dataset.active = String(model.active === id);
            const body = surface(current);
            if (!grouped(id)) {
                frame.replaceChildren(body);
                return;
            }
            const panelID = "wg-groups-" + id;
            const { strip, list } = tabStrip(names[id] + (model.locked[id] ? " · 🔒" : ""), panelID);
            model.windows[id].forEach((member) => {
                const node = tab(list, member, examples[member].label, member === current);
                node.dataset.windowKey = member;
                node.dataset.groupsTab = id;
                node.draggable = !model.locked[id] && model.windows[id].length > 1;
            });
            const add = button("wg-plus", "+");
            add.dataset.groupsPlus = id;
            add.setAttribute("aria-label", "Добавить окно в группу " + names[id]);
            add.setAttribute("aria-expanded", String(model.picker === id));
            add.disabled = model.locked[id] || !model.windows.outside.length;
            strip.append(add);
            tabPanel(body, panelID, current);
            frame.replaceChildren(strip, body);
            if (model.picker === id) {
                const picker = element("div", "wg-picker");
                picker.setAttribute("role", "group");
                picker.setAttribute("aria-label", "Выбор открытого окна");
                picker.append(element("p", "", "Открытые окна"));
                model.windows.outside.forEach((member) => {
                    const option = button("", examples[member].label);
                    option.dataset.groupsPick = member;
                    option.prepend(icon(member));
                    picker.append(option);
                });
                frame.append(picker);
            }
        }

        function render(message, previous) {
            renderGroup("work");
            renderGroup("reference");
            const looseWindows = model.windows.outside.map((id) => {
                const node = button("wg-loose-window", examples[id].label);
                node.prepend(icon(id));
                node.dataset.windowKey = id;
                node.dataset.groupsLoose = id;
                node.draggable = true;
                node.setAttribute("aria-pressed", String(id === model.looseChoice));
                return node;
            });
            loose.replaceChildren(...(looseWindows.length ? looseWindows : [element("p", "wg-loose-empty", "Все окна распределены")]));

            const { active, windows, selected, locked } = model;
            const index = windows[active].indexOf(selected[active]);
            const other = active === "work" ? "reference" : "work";
            commands.group.disabled = !windows.outside.length || locked[active];
            commands.left.disabled = locked[active] || index <= 0;
            commands.right.disabled = locked[active] || index >= windows[active].length - 1;
            commands.detach.disabled = locked[active] || windows[active].length <= 1;
            commands.transfer.disabled = commands.detach.disabled || locked[other] || !grouped(other);
            commands.lock.disabled = !grouped(active);
            commands.lock.setAttribute("aria-pressed", String(locked[active]));
            if (message) status.textContent = message;
            animateWindows(demo, previous);
        }

        function selectTab(node, focus = false) {
            const group = node.dataset.groupsTab;
            const id = node.dataset.windowKey;
            model.active = group;
            model.selected[group] = id;
            model.picker = null;
            render();
            if (focus) document.getElementById("wg-groups-" + group + "-" + id)?.focus();
        }

        function shiftCue() {
            if (reducedMotion.matches) return;
            desk.classList.remove("wg-shift");
            desk.getBoundingClientRect();
            desk.classList.add("wg-shift");
        }

        function move(id, from, to, anchor = {}) {
            const source = model.windows[from];
            const destination = model.windows[to];
            if (!source?.includes(id) || !destination || model.locked[from] || model.locked[to]) return;
            if (from !== "outside" && from !== to && source.length === 1) return;
            if (to !== "outside" && !grouped(to) && from !== "outside") return;
            if (anchor.id === id && from === to) return;
            const previous = windowPositions(demo);
            source.splice(source.indexOf(id), 1);
            const anchorIndex = destination.indexOf(anchor.id);
            destination.splice(anchorIndex < 0 ? destination.length : anchorIndex + (anchor.after ? 1 : 0), 0, id);
            model.picker = null;

            const label = "«" + examples[id].label + "»";
            const wasGrouped = grouped(to);
            if (to === "work") model.grouped = true;
            if (from !== to && from !== "outside" && model.selected[from] === id) model.selected[from] = source[0];
            if (to !== "outside") {
                model.active = to;
                model.selected[to] = id;
            }
            if (from === "outside") model.looseChoice = source[0];
            if (to === "outside") model.looseChoice = id;
            const message = from === to ? "Порядок вкладок изменён."
                : to === "outside" ? label + " стало отдельным окном."
                : wasGrouped ? label + " в группе «" + names[to] + "»."
                : "Окна собраны в группу «" + names[to] + "».";
            render(message, previous);
        }

        function command(action) {
            if (commands[action].disabled) return;
            const from = model.active;
            const id = model.selected[from];
            const index = model.windows[from].indexOf(id);
            if (action === "reset") reset();
            if (action === "group") {
                shiftCue();
                move(model.looseChoice || model.windows.outside[0], "outside", from);
            }
            if (action === "left" || action === "right") {
                const after = action === "right";
                move(id, from, from, { id: model.windows[from][index + (after ? 1 : -1)], after });
            }
            if (action === "transfer") move(id, from, from === "work" ? "reference" : "work");
            if (action === "detach") move(id, from, "outside");
            if (action === "lock") {
                model.locked[from] = !model.locked[from];
                model.picker = null;
                const state = model.locked[from] ? "заблокирован" : "разблокирован";
                render("Состав группы «" + names[from] + "» " + state + ".");
            }
        }

        function closePicker(focus = false) {
            const previous = model.picker;
            if (previous === null) return;
            model.picker = null;
            render();
            if (focus) frames[previous].querySelector("[data-groups-plus]")?.focus();
        }

        demo.addEventListener("click", (event) => {
            const node = event.target.closest("button");
            if (node?.dataset.groupsAction) command(node.dataset.groupsAction);
            else if (node?.dataset.groupsTab) selectTab(node, true);
            else if (node?.dataset.groupsPlus && !node.disabled) {
                const id = node.dataset.groupsPlus;
                if (model.picker === id) closePicker(true);
                else {
                    model.picker = id;
                    model.active = id;
                    render();
                    frames[id].querySelector("[data-groups-pick]")?.focus();
                }
            } else if (node?.dataset.groupsPick && model.picker) {
                move(node.dataset.groupsPick, "outside", model.picker);
                document.getElementById("wg-groups-" + model.active + "-" + model.selected[model.active])?.focus();
            } else if (node?.dataset.groupsLoose) {
                model.looseChoice = node.dataset.groupsLoose;
                render("Выбрано отдельное окно «" + examples[model.looseChoice].label + "».");
                loose.querySelector('[data-groups-loose="' + model.looseChoice + '"]')?.focus();
            } else {
                const target = event.target.closest("[data-groups-target]")?.dataset.groupsTarget;
                const changesGroup = target && target !== "outside" && target !== model.active;
                if (changesGroup) model.active = target;
                if (model.picker) closePicker();
                else if (changesGroup) render();
            }
        });

        demo.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && model.picker) {
                event.preventDefault();
                closePicker(true);
            } else navigateTabs(event, (node) => selectTab(node, true));
        });

        function clearTarget() {
            dropTarget?.classList.remove("wg-target");
            dropTarget = null;
        }

        function canDrop(to) {
            if (!drag || !to || model.locked[to]) return false;
            if (drag.from === "outside") return to !== "outside";
            return to === "outside" || grouped(to);
        }

        desk.addEventListener("dragstart", (event) => {
            const source = event.target.closest("[data-window-key]");
            if (!source?.draggable || !event.dataTransfer) return;
            drag = { id: source.dataset.windowKey, from: source.dataset.groupsTab || "outside" };
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", examples[drag.id].label);
        });
        desk.addEventListener("dragover", (event) => {
            const target = event.target.closest("[data-groups-target]");
            const to = target?.dataset.groupsTarget;
            if (!canDrop(to)) {
                clearTarget();
                return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            if (dropTarget !== target) {
                clearTarget();
                target.classList.add("wg-target");
                dropTarget = target;
            }
        });
        desk.addEventListener("drop", (event) => {
            const to = event.target.closest("[data-groups-target]")?.dataset.groupsTarget;
            clearTarget();
            if (!canDrop(to)) return;
            event.preventDefault();
            const current = drag;
            drag = null;
            if (current.from === "outside" && !event.shiftKey) {
                status.textContent = "Удерживайте Shift до отпускания окна.";
                return;
            }
            if (current.from === "outside") shiftCue();
            const targetTab = event.target.closest("[data-groups-tab]");
            const bounds = targetTab?.getBoundingClientRect();
            move(current.id, current.from, to, {
                id: targetTab?.dataset.windowKey,
                after: bounds && event.clientX > bounds.left + bounds.width / 2,
            });
        });
        desk.addEventListener("dragend", () => { clearTarget(); drag = null; });

        reset();
    }

    function splitDemo(demo) {
        const frame = demo.querySelector("[data-split-window]");
        const status = demo.querySelector("[data-split-status]");
        const range = demo.querySelector("[data-split-range]");
        const commands = Object.fromEntries(Array.from(demo.querySelectorAll("[data-split-action]"),
            (node) => [node.dataset.splitAction, node]));
        const members = ["notes", "terminal", "browser"];
        const minimum = Number(range.min);
        const maximum = Number(range.max);
        let pair = ["notes", "terminal"];
        let draft = null;
        let view = "pair";
        let vertical = false;
        let ratio = Number(range.value);
        let dragging;

        function showRatio(value) {
            ratio = Math.round(Math.max(minimum, Math.min(maximum, value)));
            range.value = String(ratio);
            const split = frame.querySelector(".wg-split-body");
            split?.style.setProperty("--wg-ratio", ratio / 100);
            split?.querySelector("[role=separator]")?.setAttribute("aria-valuenow", ratio);
        }

        function picker(index, slots) {
            const select = element("select", "wg-picker-select");
            select.dataset.splitPick = index;
            const position = vertical ? (index === 0 ? "верхней" : "нижней") : (index === 0 ? "левой" : "правой");
            select.setAttribute("aria-label", pair ? "Заменить окно " + position + " области" : "Выбрать окно для " + position + " области");
            if (!pair) {
                const placeholder = element("option", "", "Выбрать окно");
                placeholder.value = "";
                placeholder.disabled = true;
                select.append(placeholder);
            }
            members.filter((id) => id !== slots[1 - index]).forEach((id) => {
                const option = element("option", "", examples[id].label);
                option.value = id;
                select.append(option);
            });
            select.value = slots[index] || "";
            return select;
        }

        function splitPane(index, slots) {
            const id = slots[index];
            const select = picker(index, slots);
            if (id) {
                const pane = surface(id, select);
                pane.dataset.windowKey = id;
                return pane;
            }
            const pane = element("div", "wg-empty-pane");
            pane.append(element("p", "", "Окно для области"), select);
            return pane;
        }

        function splitBody(slots) {
            const body = element("div", "wg-split-body wg-pane");
            body.dataset.orientation = vertical ? "stack" : "side";
            const divider = element("div", "wg-divider");
            divider.setAttribute("role", "separator");
            divider.setAttribute("aria-label", "Разделитель окон");
            divider.setAttribute("aria-orientation", vertical ? "horizontal" : "vertical");
            divider.setAttribute("aria-valuemin", minimum);
            divider.setAttribute("aria-valuemax", maximum);
            divider.tabIndex = 0;
            body.append(splitPane(0, slots), divider, splitPane(1, slots));
            return body;
        }

        function render(message, animate = false) {
            const previous = animate && !reducedMotion.matches ? windowPositions(demo) : null;
            const activeSplit = view === "pair" || view === "draft";
            const panelID = "wg-split-panel";
            const { strip, list } = tabStrip("Проект", panelID);
            if (pair) {
                const name = pair.map((id) => examples[id].label).join(" + ");
                tab(list, "pair", name, view === "pair").dataset.splitTab = "pair";
            }
            members.filter((id) => !pair?.includes(id)).forEach((id) => {
                tab(list, id, examples[id].label, view === id).dataset.splitTab = id;
            });
            const node = activeSplit ? splitBody(pair || draft) : surface(view);
            if (view !== "draft") tabPanel(node, panelID, view);
            else {
                node.id = panelID;
                node.setAttribute("role", "region");
                node.setAttribute("aria-label", "Настройка областей сплита");
                list.firstElementChild.tabIndex = 0;
            }
            frame.replaceChildren(strip, node);
            commands.rotate.disabled = !activeSplit;
            commands.swap.disabled = view !== "pair";
            commands.rotate.textContent = vertical ? "Рядом" : "Сверху и снизу";
            commands.toggle.textContent = activeSplit ? (pair ? "Разъединить" : "Отменить сплит")
                : pair ? "Открыть сплит" : "Создать сплит";
            range.disabled = !activeSplit;
            showRatio(ratio);
            if (message) status.textContent = message;
            animateWindows(demo, previous);
        }

        function selectTab(node) {
            view = node.dataset.splitTab;
            draft = null;
            const message = view === "pair" ? "Сплит открыт с прежними пропорциями." : "Открыта вкладка «" + examples[view].label + "».";
            render(message);
            document.getElementById("wg-split-panel-" + view)?.focus();
        }

        function command(action) {
            if (commands[action].disabled) return;
            if (action === "rotate") {
                vertical = !vertical;
                render(vertical ? "Окна расположены одно над другим." : "Окна расположены рядом.", true);
            }
            if (action === "swap") {
                pair.reverse();
                render("Окна поменялись местами.", true);
            }
            if (action === "toggle") {
                if (view === "pair" || view === "draft") {
                    view = pair?.[0] || draft?.find(Boolean) || "notes";
                    pair = null;
                    draft = null;
                    render("Окна снова открываются на отдельных вкладках.");
                } else if (pair) {
                    view = "pair";
                    render("Сплит открыт с прежними пропорциями.");
                } else {
                    view = "draft";
                    draft = [null, null];
                    ratio = 50;
                    render("Назначьте окно для каждой области.");
                    frame.querySelector("[data-split-pick]")?.focus();
                }
            }
        }

        demo.addEventListener("click", (event) => {
            const node = event.target.closest("button");
            if (node?.dataset.splitAction) command(node.dataset.splitAction);
            if (node?.dataset.splitTab) selectTab(node);
        });
        frame.addEventListener("change", (event) => {
            const select = event.target.closest("[data-split-pick]");
            if (!select?.value) return;
            const index = Number(select.dataset.splitPick);
            const slots = pair || draft;
            if (!slots || slots[1 - index] === select.value) return;
            slots[index] = select.value;
            if (!pair && slots.every(Boolean)) {
                pair = slots;
                draft = null;
                view = "pair";
                render("Окна собраны в одну вкладку сплита.");
            } else render("Выбрано окно «" + examples[select.value].label + "».");
            frame.querySelector('[data-split-pick="' + index + '"]')?.focus();
        });

        range.addEventListener("input", () => showRatio(Number(range.value)));
        frame.addEventListener("keydown", (event) => {
            if (navigateTabs(event, selectTab)) return;
            if (event.target.getAttribute("role") !== "separator") return;
            const smaller = vertical ? "ArrowUp" : "ArrowLeft";
            const larger = vertical ? "ArrowDown" : "ArrowRight";
            if (![smaller, larger, "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            showRatio(event.key === "Home" ? minimum : event.key === "End" ? maximum : ratio + (event.key === smaller ? -2 : 2));
        });

        frame.addEventListener("pointerdown", (event) => {
            const divider = event.target.closest(".wg-divider");
            if (!divider || event.button !== 0) return;
            const body = divider.parentElement.getBoundingClientRect();
            dragging = {
                pointer: event.pointerId, ratio,
                origin: vertical ? event.clientY : event.clientX,
                extent: vertical ? body.height : body.width,
            };
            divider.classList.add("wg-dragging");
            divider.setPointerCapture(event.pointerId);
        });
        frame.addEventListener("pointermove", (event) => {
            if (dragging?.pointer !== event.pointerId) return;
            const position = vertical ? event.clientY : event.clientX;
            showRatio(dragging.ratio + (position - dragging.origin) * 100 / dragging.extent);
        });
        frame.addEventListener("lostpointercapture", (event) => {
            if (dragging?.pointer !== event.pointerId) return;
            dragging = null;
            event.target.classList.remove("wg-dragging");
        });

        render();
    }

    document.querySelectorAll("[data-window-groups]").forEach(groupsDemo);
    document.querySelectorAll("[data-window-split]").forEach(splitDemo);
})();
