// =============================================
// CONFIGURATION - STIE LM Digital Library
// =============================================

const CONFIG = {
    // Ganti dengan URL Web App Anda setelah deploy
    API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
};

// =============================================
// HELPER: Call API
// =============================================

function callAPI(action, params = {}, method = 'GET') {
    const token = localStorage.getItem('sessionToken');
    const url = new URL(CONFIG.API_URL);
    
    // Tambahkan parameter dasar
    url.searchParams.append('action', action);
    if (token) {
        url.searchParams.append('token', token);
    }
    
    // Tambahkan parameter untuk GET
    if (method === 'GET') {
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });
    }
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Tambahkan body untuk POST
    if (method === 'POST') {
        options.body = JSON.stringify(params);
    }
    
    return fetch(url.toString(), options)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            return data;
        });
}

// =============================================
// HELPER: Toast Notifikasi
// =============================================

function showToast(message, icon = '📢', duration = 2500) {
    // Cek apakah toast container sudah ada
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.92);
            color: white;
            padding: 14px 24px;
            border-radius: 16px;
            font-weight: 600;
            font-size: 14px;
            z-index: 99999;
            display: none;
            align-items: center;
            gap: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.06);
            font-family: 'Plus Jakarta Sans', sans-serif;
            backdrop-filter: blur(12px);
            max-width: 90%;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    toast.style.display = 'flex';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 300);
    }, duration);
}

// =============================================
// HELPER: Token Management
// =============================================

function getToken() {
    let token = localStorage.getItem('sessionToken');
    // Cek juga di URL parameter (untuk redirect setelah login)
    if (!token) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('token');
        if (urlToken) {
            token = urlToken;
            localStorage.setItem('sessionToken', token);
            // Hapus token dari URL
            const newUrl = window.location.href.split('?')[0];
            window.history.replaceState({}, document.title, newUrl);
        }
    }
    return token;
}

function logout() {
    const token = getToken();
    if (token) {
        callAPI('logout', { token: token })
            .then(() => {
                localStorage.removeItem('sessionToken');
                window.location.href = 'login.html';
            })
            .catch(() => {
                localStorage.removeItem('sessionToken');
                window.location.href = 'login.html';
            });
    } else {
        localStorage.removeItem('sessionToken');
        window.location.href = 'login.html';
    }
}

function isLoggedIn() {
    const token = getToken();
    return token !== null && token !== undefined && token !== '';
}

// =============================================
// HELPER: Loading & Error
// =============================================

function showLoading(containerId, message = 'Memuat data...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; padding:40px; gap:12px; color:rgba(255,255,255,0.8);">
                <div style="width:32px; height:32px; border:3px solid rgba(255,255,255,0.2); border-top-color:#60a5fa; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
                <span>${message}</span>
            </div>
            <style>
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        `;
    }
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.05); border-radius:20px; border:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:48px; margin-bottom:16px;">❌</div>
                <h3 style="font-size:1.2rem; font-weight:700; color:white; margin-bottom:8px;">Terjadi Kesalahan</h3>
                <p style="color:rgba(255,255,255,0.6);">${message}</p>
            </div>
        `;
    }
}

// =============================================
// HELPER: Escape HTML
// =============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// AUTO-INIT: Cek session saat load
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // Cek token di URL saat load
    getToken();
    
    // Jika di halaman yang memerlukan login dan tidak login, redirect
    const publicPages = ['login.html', '404.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (!publicPages.includes(currentPage) && !isLoggedIn()) {
        // Simpan halaman tujuan untuk redirect setelah login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
});

// =============================================
// EXPOSE FUNCTIONS KE GLOBAL SCOPE
// =============================================

window.callAPI = callAPI;
window.showToast = showToast;
window.getToken = getToken;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.showLoading = showLoading;
window.showError = showError;
window.escapeHtml = escapeHtml;
