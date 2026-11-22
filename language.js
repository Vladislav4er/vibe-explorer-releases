(() => {
    const links = [...document.querySelectorAll(".language-switch a")];
    const destinations = links.map(link => new URL(link.href));

    function syncSection() {
        links.forEach((link, index) => {
            const destination = destinations[index];
            destination.hash = location.hash;
            link.href = destination.href;
        });
    }

    syncSection();
    window.addEventListener("hashchange", syncSection);
})();
