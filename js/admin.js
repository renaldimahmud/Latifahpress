// =============================================
// ADMIN.JS - FUNGSI KELOLA USER
// =============================================

var userData = [];

function loadUsers() {
    var wrap = document.getElementById('tableWrap');
    if (wrap) {
        wrap.innerHTML = '<div class="loading-msg">Memuat data user...</div>';
    }
    
    callAPI('getUserList', {}, 'GET')
        .then(function(users) {
            userData = users || [];
            renderTable();
        })
        .catch(function(error) {
            if (wrap) {
                wrap.innerHTML = '<div class="empty-msg">❌ Gagal memuat: ' + error.message + '</div>';
            }
            showToast('Gagal memuat user: ' + error.message, '❌');
        });
}

function renderTable() {
    var wrap = document.getElementById('tableWrap');
    if (!wrap) return;
    
    if (!userData || userData.length === 0) {
        wrap.innerHTML = '<div class="empty-msg">📭 Belum ada user terdaftar.</div>';
        return;
    }
    
    var html = '<div class="table-responsive"><table><thead><tr><th>Username</th><th>Password</th><th>Nama</th><th>Aksi</th></tr></thead><tbody>';
    
    userData.forEach(function(u) {
        var displayPassword = u.username === 'admin' ? '••••••••' : u.password;
        html += '<tr><td><strong>' + escapeHtml(u.username) + '</strong></td><td>' + escapeHtml(displayPassword) + '</td><td>' + escapeHtml(u.nama) + '</td><td class="actions"><button class="btn btn-edit btn-small" onclick="editUser(' + u.row + ')">✏️ Edit</button><button class="btn btn-delete btn-small" onclick="removeUser(' + u.row + ', \'' + escapeHtml(u.username) + '\')">🗑️ Hapus</button></td></tr>';
    });
    
    html += '</tbody></table></div>';
    wrap.innerHTML = html;
}

function editUser(row) {
    var u = userData.find(function(x) { return x.row === row; });
    if (!u) {
        showToast('User tidak ditemukan!', '❌');
        return;
    }
    
    document.getElementById('editRow').value = u.row;
    document.getElementById('fUsername').value = u.username;
    document.getElementById('fPassword').value = u.password;
    document.getElementById('fNama').value = u.nama;
    
    document.getElementById('formTitle').textContent = '✏️ Edit User: ' + u.username;
    document.getElementById('btnSubmit').textContent = 'Update User';
    document.getElementById('btnCancel').style.display = 'inline-block';
    
    document.querySelector('.card:first-child').scrollIntoView({ behavior: 'smooth' });
    setTimeout(function() {
        document.getElementById('fUsername').focus();
    }, 300);
}

function cancelEdit() {
    document.getElementById('editRow').value = '';
    document.getElementById('fUsername').value = '';
    document.getElementById('fPassword').value = '';
    document.getElementById('fNama').value = '';
    
    document.getElementById('formTitle').textContent = '➕ Tambah User Baru';
    document.getElementById('btnSubmit').textContent = 'Tambah User';
    document.getElementById('btnCancel').style.display = 'none';
    
    setTimeout(function() {
        document.getElementById('fUsername').focus();
    }, 100);
}

function submitForm() {
    var row = document.getElementById('editRow').value;
    var username = document.getElementById('fUsername').value.trim();
    var password = document.getElementById('fPassword').value.trim();
    var nama = document.getElementById('fNama').value.trim() || 'Pengguna';
    
    if (!username || !password) {
        showToast('Username dan password harus diisi!', '⚠️');
        document.getElementById('fUsername').focus();
        return;
    }
    
    var btn = document.getElementById('btnSubmit');
    var originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Memproses...';
    
    var action, params;
    if (row) {
        action = 'updateUser';
        params = { rowNumber: parseInt(row), username: username, password: password, nama: nama };
    } else {
        action = 'addUser';
        params = { username: username, password: password, nama: nama };
    }
    
    callAPI(action, params, 'POST')
        .then(function(result) {
            btn.disabled = false;
            btn.textContent = originalText;
            showToast(result.message, result.success ? '✅' : '❌');
            if (result.success) {
                cancelEdit();
                loadUsers();
            }
        })
        .catch(function(error) {
            btn.disabled = false;
            btn.textContent = originalText;
            showToast('Error: ' + error.message, '❌');
        });
}

function removeUser(row, username) {
    if (username === 'admin') {
        showToast('Akun admin tidak bisa dihapus!', '🚫');
        return;
    }
    if (!confirm('⚠️ Hapus user "' + username + '" ?\nTindakan ini tidak bisa dibatalkan!')) {
        return;
    }
    
    showToast('Menghapus user...', '⏳');
    callAPI('deleteUser', { rowNumber: row, username: username }, 'POST')
        .then(function(result) {
            showToast(result.message, result.success ? '✅' : '❌');
            if (result.success) {
                loadUsers();
            }
        })
        .catch(function(error) {
            showToast('Error: ' + error.message, '❌');
        });
}

function showToast(message, icon) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = (icon || '📢') + ' ' + message;
    toast.className = 'toast show';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
        toast.className = 'toast';
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    getToken();
    var token = getToken();
    if (token) {
        callAPI('checkAdmin', {}, 'GET')
            .then(function(result) {
                if (!result.isAdmin) {
                    showToast('Akses ditolak. Halaman ini hanya untuk admin.', '🚫');
                    setTimeout(function() {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            })
            .catch(function() {
                showToast('Session tidak valid. Silakan login ulang.', '❌');
                setTimeout(function() {
                    window.location.href = 'login.html';
                }, 2000);
            });
    } else {
        window.location.href = 'login.html';
    }
    loadUsers();
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            var target = e.target;
            if (target.id === 'fUsername' || target.id === 'fPassword' || target.id === 'fNama') {
                e.preventDefault();
                submitForm();
            }
        }
    });
});

window.loadUsers = loadUsers;
window.renderTable = renderTable;
window.editUser = editUser;
window.cancelEdit = cancelEdit;
window.submitForm = submitForm;
window.removeUser = removeUser;
window.showToast = showToast;
