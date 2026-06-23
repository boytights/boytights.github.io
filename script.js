document.addEventListener('DOMContentLoaded', () => {
    const parent = document.querySelector('.card');
    if (!parent) return;
    const initialImgs = Array.from(parent.querySelectorAll('img'));
    const total = initialImgs.length;
    const pool = initialImgs.map(img => {
        try {
            parent.removeChild(img);
        } catch (e) {}
        img.dataset._inserted = 'false';
        return img;
    });
    const rand = () => {
        if (window.crypto && crypto.getRandomValues) {
            return crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1);
        }
        return Math.random();
    };

    function layoutAll() {
        const style = getComputedStyle(parent);
        const rowHeight = parseFloat(style.getPropertyValue('grid-auto-rows')) || 8;
        let gapVal = style.getPropertyValue('gap') || style.getPropertyValue('grid-row-gap') || '0';
        if (gapVal.indexOf(' ') !== -1) gapVal = gapVal.split(' ')[0];
        const gap = parseFloat(gapVal) || 0;
        let cols = 1;
        const template = style.getPropertyValue('grid-template-columns');
        if (template && template !== 'none') {
            cols = template.trim().split(/\s+/).length;
        } else {
            const parentW = parent.getBoundingClientRect().width || parent.clientWidth || 1;
            const minColPx = parseFloat(getComputedStyle(document.documentElement).fontSize || 16) * 12;
            cols = Math.max(1, Math.floor(parentW / Math.max(1, minColPx)));
        }
        const imgs = Array.from(parent.querySelectorAll('img'));
        imgs.forEach(img => {
            const nw = img.naturalWidth || img.width || 0;
            const nh = img.naturalHeight || img.height || 0;
            if (nw > nh && cols >= 2) {
                img.classList.add('landscape');
                img.style.gridColumn = 'span 2';
            } else {
                img.classList.remove('landscape');
                img.style.gridColumn = 'span 1';
            }
            const renderedH = Math.ceil(img.getBoundingClientRect().height) || 0;
            const h = renderedH || Math.ceil((nh && nw) ? (img.clientWidth * (nh / nw)) : img.clientHeight || 1);
            const span = Math.max(1, Math.ceil((h + gap) / (rowHeight + gap)));
            img.style.gridRowEnd = 'span ' + span;
        });
    }

    function waitForSingleImageLoad(img) {
        return new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) {
                return resolve(true);
            }
            const onDone = (ev) => {
                img.removeEventListener('load', onDone);
                img.removeEventListener('error', onDone);
                resolve(ev.type === 'load');
            };
            img.addEventListener('load', onDone);
            img.addEventListener('error', onDone);
        });
    }
    let loadedCount = 0;

    function onOneLoaded(img) {
        img.dataset._inserted = 'true';
        const w = img.naturalWidth || img.width || 1;
        const h = img.naturalHeight || img.height || 1;
        try {
            img.setAttribute('width', w);
            img.setAttribute('height', h);
        } catch (e) {}
        img.style.aspectRatio = `${w}/${h}`;
        img.style.opacity = '0';
        const existingTransformTransition = 'transform .2s ease-in-out';
        img.style.transition = `opacity .5s ease, ${existingTransformTransition}`;
        parent.appendChild(img);
        layoutAll();
        requestAnimationFrame(() => {
            img.style.opacity = '1';
            setTimeout(layoutAll, 60);
        });
        loadedCount++;
        if (loadedCount === total) {
            showNotificationAndShuffle();
        }
    }

    function onOneFailed(img) {
        console.warn('Image failed to load. Skipping append:', img.src);
        loadedCount++;
        if (loadedCount === total) {
            showNotificationAndShuffle();
        }
    }

    function revealWhenLoaded(img) {
        return waitForSingleImageLoad(img).then(loaded => {
            if (loaded) {
                onOneLoaded(img);
            } else {
                onOneFailed(img);
            }
        });
    }

    function shuffleInsertedImages() {
        const imgs = Array.from(parent.querySelectorAll('img'));
        for (let i = imgs.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
        }
        imgs.forEach(img => parent.appendChild(img));
    }
    pool.forEach(img => {
        revealWhenLoaded(img);
    });
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layoutAll, 120);
    });
    layoutAll();
    const notify = document.getElementById('notify');
    const notifyCountEl = document.getElementById('notify-count');
    const notifyText = document.getElementById('notify-text');
    const notifySuffix = document.getElementById('notify-suffix');
    let notifInterval = null;
    let notifShown = false;

    function showNotificationAndShuffle() {
        if (!notify) {
            shuffleInsertedImages();
            layoutAll();
            return;
        }
        clearInterval(notifInterval);
        let countdown = 3;
        notifyCountEl.textContent = countdown;
        notifyText.textContent = 'Loading complete. Shuffling content in:';
        notifySuffix.textContent = 's';
        notify.hidden = false;
        requestAnimationFrame(() => {
            notify.classList.add('show');
            notifShown = true;
        });
        notifInterval = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(notifInterval);
                notifyCountEl.textContent = '0';
                setTimeout(() => {
                    shuffleInsertedImages();
                    layoutAll();
                    requestAnimationFrame(() => {
                        notify.classList.remove('show');
                    });
                    setTimeout(() => {
                        notify.hidden = true;
                        notifShown = false;
                    }, 500);
                }, 120);
            } else {
                notifyCountEl.textContent = String(countdown);
            }
        }, 1000);
    }
});