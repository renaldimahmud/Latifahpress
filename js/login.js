// =============================================
// LOGIN.JS - FUNGSI LOGIN PERPUSTAKAAN
// =============================================

function handleLogoError() {
    var img = document.getElementById('logoImg');
    var placeholder = document.getElementById('logoPlaceholder');
    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
}

function handleProfileError() {
    var img = document.getElementById('profileImg');
    var placeholder = document.getElementById('photoPlaceholder');
    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
}

function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    
    var clock = document.getElementById('digitalClock');
    if (clock) {
        clock.innerHTML = h + ':' + m + '<span class="clock-seconds">' + s + '</span>';
    }
    
    var days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    var months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    var dateEl = document.getElementById('clockDate');
    if (dateEl) {
        dateEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    }
}

setInterval(updateClock, 1000);
updateClock();

function closePopup() {
    var popup = document.getElementById('popupOverlay');
    if (popup) popup.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', function() {
    var helpBtn = document.getElementById('helpFloatBtn');
    var popupOverlay = document.getElementById('popupOverlay');
    var waPopupBtn = document.getElementById('waPopupBtn');
    
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            if (popupOverlay) popupOverlay.classList.add('active');
        });
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', function(e) {
            if (e.target === popupOverlay) closePopup();
        });
    }
    if (waPopupBtn) {
        waPopupBtn.addEventListener('click', function() {
            var username = document.getElementById('username');
            var msg = 'Assalamualaikum Pak Ujang, saya mengalami kesulitan login perpustakaan.';
            if (username && username.value.trim()) {
                msg += ' Username saya: ' + username.value.trim() + '.';
            }
            msg += ' Mohon bantuannya. Terima kasih.';
            window.open('https://wa.me/6282115245732?text=' + encodeURIComponent(msg), '_blank');
            closePopup();
        });
    }
    
    var form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    var passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
});

function handleLogin() {
    var username = document.getElementById('username');
    var password = document.getElementById('password');
    var btn = document.getElementById('btnLogin');
    var errorDiv = document.getElementById('errorMsg');
    var errorText = document.getElementById('errorText');
    
    if (!username || !password || !btn || !errorDiv || !errorText) return;
    
    var usernameVal = username.value.trim();
    var passwordVal = password.value.trim();
    
    if (!usernameVal || !passwordVal) {
        errorText.textContent = 'Username dan password harus diisi!';
        errorDiv.classList.add('show');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memproses...';
    errorDiv.classList.remove('show');
    
    callAPI('verifyLogin', {
        username: usernameVal,
        password: passwordVal
    }, 'GET')
    .then(function(result) {
        btn.disabled = false;
        btn.innerHTML = 'Masuk';
        
        if (result.success && result.token) {
            localStorage.setItem('sessionToken', result.token);
            localStorage.setItem('userFullName', result.fullName || 'Pengguna');
            localStorage.setItem('isAdmin', result.isAdmin ? 'true' : 'false');
            window.location.href = 'index.html';
        } else {
            errorText.textContent = result.message || 'Username atau password salah!';
            errorDiv.classList.add('show');
            errorDiv.classList.add('shake');
            setTimeout(function() {
                errorDiv.classList.remove('shake');
            }, 500);
            password.value = '';
            password.focus();
        }
    })
    .catch(function(error) {
        btn.disabled = false;
        btn.innerHTML = 'Masuk';
        errorText.textContent = 'Error sistem: ' + error.message;
        errorDiv.classList.add('show');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    var token = getToken();
    if (token) {
        callAPI('getCurrentUser', {}, 'GET')
            .then(function(result) {
                if (result.username) {
                    window.location.href = 'index.html';
                }
            })
            .catch(function() {
                localStorage.removeItem('sessionToken');
            });
    }
    
    var usernameInput = document.getElementById('username');
    if (usernameInput) {
        setTimeout(function() {
            usernameInput.focus();
        }, 300);
    }
});
