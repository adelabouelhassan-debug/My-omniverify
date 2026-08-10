let currentUser = null;
let currentToken = null;
let currentRequestId = null;
let isCreatingAccount = false;

window.addEventListener('load', () => {
  const token = localStorage.getItem('token');
  if (token) {
    currentToken = token;
    loadDashboard();
  } else {
    showAuth();
  }
});

function showAuth() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('dashboard-section').style.display = 'none';
  document.getElementById('auth-btn').textContent = isCreatingAccount ? 'Create Account' : 'Login';
}

function showDashboard() {
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('dashboard-section').style.display = 'block';
  document.getElementById('user-email').textContent = currentUser.email;
  loadProjects();
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${currentToken}` } });
    if (!res.ok) throw new Error('Session expired');
    const data = await res.json();
    currentUser = data.user;
    showDashboard();
  } catch (err) {
    localStorage.removeItem('token');
    currentToken = null;
    showAuth();
  }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const messageEl = document.getElementById('auth-message');

  try {
    const endpoint = isCreatingAccount ? '/api/auth/register' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    currentUser = data.user;
    currentToken = data.token;
    localStorage.setItem('token', data.token);
    messageEl.innerHTML = `<div class="message success">✓ Success!</div>`;
    setTimeout(showDashboard, 500);
  } catch (err) {
    messageEl.innerHTML = `<div class="message error">✗ ${err.message}</div>`;
  }
});

document.getElementById('toggle-auth').addEventListener('click', () => {
  isCreatingAccount = !isCreatingAccount;
  document.getElementById('auth-form').reset();
  document.getElementById('auth-message').innerHTML = '';
  document.getElementById('auth-btn').textContent = isCreatingAccount ? 'Create Account' : 'Login';
});

async function loadProjects() {
  try {
    const res = await fetch('/api/projects', { headers: { 'Authorization': `Bearer ${currentToken}` } });
    const data = await res.json();
    const list = document.getElementById('projects-list');
    list.innerHTML = data.projects.map(p => `
      <div style="background: #f9f9f9; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
        <h3>${p.name}</h3>
        <p>Credits: <strong>${p.credits}</strong></p>
        <p style="font-size: 12px; color: #666; margin-top: 10px;">Public Key: <code>${p.publicKey}</code></p>
        <p style="font-size: 12px; color: #666;">Secret Key: <code>${p.secretKey}</code></p>
        <button onclick="topupCredits('${p.id}')" style="margin-top: 10px; background: #28a745;">+ Add Credits</button>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function createProject() {
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'New Project' })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Project created!');
      loadProjects();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function topupCredits(projectId) {
  const amount = prompt('How many credits to add? (1-10000)', '100');
  if (!amount) return;
  try {
    const res = await fetch(`/api/projects/${projectId}/topup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ amount: parseInt(amount) })
    });
    const data = await res.json();
    if (res.ok) {
      alert('Credits added!');
      loadProjects();
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function sendOtp() {
  const channel = document.getElementById('channel').value;
  const destination = document.getElementById('destination').value;
  const messageEl = document.getElementById('playground-message');

  if (!destination) {
    messageEl.innerHTML = '<div class="message error">Please enter a destination</div>';
    return;
  }

  try {
    const res = await fetch('/api/v1/otp/send', {
      method: 'POST',
      headers: {
        'X-API-Key': 'sk_demo',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, destination })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    currentRequestId = data.requestId;
    messageEl.innerHTML = `<div class="message success">✓ OTP sent! Check your ${channel.toUpperCase()}</div>`;
    document.getElementById('otp-verify').style.display = 'block';
  } catch (err) {
    messageEl.innerHTML = `<div class="message error">✗ ${err.message}</div>`;
  }
}

async function verifyOtp() {
  const code = document.getElementById('otp-code').value;
  const messageEl = document.getElementById('playground-message');

  if (!code) {
    messageEl.innerHTML = '<div class="message error">Please enter the OTP code</div>';
    return;
  }

  try {
    const res = await fetch('/api/v1/otp/verify', {
      method: 'POST',
      headers: {
        'X-API-Key': 'sk_demo',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requestId: currentRequestId, code })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    messageEl.innerHTML = `<div class="message success">✓ OTP verified successfully!</div>`;
    document.getElementById('otp-code').value = '';
    setTimeout(() => {
      document.getElementById('otp-verify').style.display = 'none';
      messageEl.innerHTML = '';
    }, 2000);
  } catch (err) {
    messageEl.innerHTML = `<div class="message error">✗ ${err.message}</div>`;
  }
}

function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  event.target.classList.add('active');
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  currentToken = null;
  document.getElementById('auth-form').reset();
  showAuth();
}
