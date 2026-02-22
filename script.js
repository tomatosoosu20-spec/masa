// Header Scroll Effect
const header = document.querySelector('header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Scroll Reveal Animation (Intersection Observer)
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Trigger only once
        }
    });
}, observerOptions);

const fadeElements = document.querySelectorAll('.fade-up');
fadeElements.forEach(el => observer.observe(el));


// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});
// Load Pong Points
window.addEventListener('DOMContentLoaded', () => {
    const totalPointsEl = document.getElementById('totalPoints');
    if (totalPointsEl) {
        const points = localStorage.getItem('pong_total_points') || 0;
        totalPointsEl.textContent = points;
    }

    // Secret M-Click Trigger
    const mTrigger = document.getElementById('m-secret-trigger');
    if (mTrigger) {
        mTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            let count = parseInt(localStorage.getItem('pong_m_secret_clicks')) || 0;
            count++;
            localStorage.setItem('pong_m_secret_clicks', count);

            // Visual feedback
            mTrigger.classList.remove('m-click-feedback');
            void mTrigger.offsetWidth; // Trigger reflow
            mTrigger.classList.add('m-click-feedback');

            console.log(`M clicked! Total: ${count}`);
        });
    }

    // Reset All Data Logic
    const resetBtn = document.getElementById('resetAllDataBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("すべてのゲームデータをリセットしますか？ (ポイントやスキンがすべて失われます)")) {
                if (confirm("本当に消していいですか？この操作は取り消せません。")) {
                    localStorage.clear();
                    alert("すべてのデータを消去しました。ページをリロードします。");
                    location.reload();
                }
            }
        });
    }

    // Game Purchase Logic
    const buyBtns = document.querySelectorAll('.buy-btn');

    function updateGamePurchaseUI() {
        buyBtns.forEach(btn => {
            const gameId = btn.dataset.gameId;
            const price = parseInt(btn.dataset.price);
            const isBought = localStorage.getItem(`game_bought_${gameId}`) === 'true';
            const priceTag = btn.querySelector('.price-tag');
            const btnText = btn.querySelector('.btn-text');

            if (isBought) {
                if (priceTag) priceTag.textContent = '0 PT (OWNED)';
                if (btnText) btnText.textContent = 'Play Game';
                btn.classList.remove('locked');
            } else {
                if (priceTag) priceTag.textContent = `${price} PT`;
                if (btnText) btnText.textContent = 'Buy Game';
                btn.classList.add('locked');
            }
        });
    }

    buyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const gameId = btn.dataset.gameId;
            const price = parseInt(btn.dataset.price);
            const isBought = localStorage.getItem(`game_bought_${gameId}`) === 'true';
            let currentPoints = parseInt(localStorage.getItem('pong_total_points')) || 0;

            if (isBought) {
                // Already bought, allow navigation
                return;
            }

            // Purchase logic
            e.preventDefault(); // Stop navigation to buy first
            if (currentPoints >= price) {
                if (confirm(`${price} ポイントを使用してこのゲームを購入しますか？`)) {
                    currentPoints -= price;
                    localStorage.setItem('pong_total_points', currentPoints);
                    localStorage.setItem(`game_bought_${gameId}`, 'true');
                    alert('購入しました！');
                    location.reload(); // Refresh to update UI and points
                }
            } else {
                alert('ポイントが足りません。ピンポンゲームでポイントを貯めてください。');
            }
        });
    });

    updateGamePurchaseUI();
});
