// ===== Cài đặt =====
const SETTINGS_ROOT = document.documentElement;

// Bật/tắt animation (lưu lại lựa chọn)
function setFabAnimation(on) {
    SETTINGS_ROOT.dataset.animationOn = String(on);
    try { localStorage.setItem('animationOn', String(on)); } catch (e) {}
}
window.setFabAnimation = setFabAnimation;

function openSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    // đồng bộ checkbox với giá trị hiện tại
    document.getElementById('setting-anim').checked =
        SETTINGS_ROOT.dataset.animationOn !== 'false';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
}

function closeSettings() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettings();
});