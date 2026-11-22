(() => {
    const repository = "Vladislav4er/vibe-explorer-releases";
    const endpoint = `https://api.github.com/repos/${repository}/releases/latest`;
    const releases = `https://github.com/${repository}/releases`;

    async function refreshDownload() {
        const response = await fetch(endpoint, { cache: "no-cache", headers: { Accept: "application/vnd.github+json" } });
        if (!response.ok) return;

        const release = await response.json();
        const tag = release.tag_name;
        if (typeof tag !== "string" || !/^v\d+\.\d+(?:\.\d+)?$/.test(tag) || release.draft || release.prerelease) return;

        const filename = `vibe-explorer-${tag.slice(1)}-arm64.zip`;
        const url = `${releases}/download/${tag}/${filename}`;
        if (!Array.isArray(release.assets) || !release.assets.some(asset => asset.name === filename && asset.browser_download_url === url)) return;

        document.querySelectorAll("[data-download]").forEach(link => { link.href = url; });
        document.querySelectorAll("[data-version]").forEach(label => { label.textContent = tag; });
    }

    // A verified release is already in the HTML for offline/rate-limited visitors.
    refreshDownload().catch(() => {});
})();
