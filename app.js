const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPEmnntVou300r1CAJxnKxyktmccbKi-YjLryAlFbx-bdo2juh7n8bZE6OsMAulp8/exec'; // <--- KEEP YOUR URL HERE
let startTime, timerInterval;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

// Timer Logic
document.getElementById('startBtn').onclick = () => {
    startTime = new Date();
    localStorage.setItem('startTime', startTime);
    timerInterval = setInterval(updateTimer, 1000);
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
};

document.getElementById('stopBtn').onclick = async () => {
    clearInterval(timerInterval);
    const endTime = new Date();
    const start = new Date(localStorage.getItem('startTime'));
    const duration = ((endTime - start) / 3600000).toFixed(2);
    
    const entry = {
        workType: document.getElementById('workType').value,
        start: start.toLocaleString(),
        end: endTime.toLocaleString(),
        duration: duration,
        month: start.toLocaleString('default', { month: 'long' }),
        year: start.getFullYear()
    };

    await saveEntry(entry);
    resetUI();
};

function updateTimer() {
    const now = new Date();
    const start = new Date(localStorage.getItem('startTime'));
    const diff = new Date(now - start);
    document.getElementById('timer').innerText = 
        diff.getUTCHours().toString().padStart(2, '0') + ":" + 
        diff.getUTCMinutes().toString().padStart(2, '0') + ":" + 
        diff.getUTCSeconds().toString().padStart(2, '0');
}

// Data Handling
async function saveEntry(entry) {
    // Save locally first (Offline support)
    let logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    logs.push(entry);
    localStorage.setItem('workLogs', JSON.stringify(logs));
    
    renderDashboard(logs);

    // Sync to Cloud
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(entry)
        });
        fetchCloudData(); // Refresh to get official data
    } catch (e) {
        console.log("Offline mode: saved locally");
    }
}

async function fetchCloudData() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        localStorage.setItem('workLogs', JSON.stringify(data));
        renderDashboard(data);
    } catch (e) {
        const local = JSON.parse(localStorage.getItem('workLogs') || '[]');
        renderDashboard(local);
    }
}

function renderDashboard(data) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    // 1. Monthly Totals
    const monthTotal = data
        .filter(l => l.month === currentMonth && l.year == currentYear)
        .reduce((sum, l) => sum + parseFloat(l.duration), 0);
    
    // 2. Yearly Total
    const yearTotal = data
        .filter(l => l.year == currentYear)
        .reduce((sum, l) => sum + parseFloat(l.duration), 0);

    // Update UI Stats
    const logList = document.getElementById('logList');
    logList.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
            <div class="card" style="margin:0; background:#252525;">
                <small>Total ${currentMonth}</small>
                <h2 style="color:#03dac6">${monthTotal.toFixed(1)}h</h2>
            </div>
            <div class="card" style="margin:0; background:#252525;">
                <small>Total ${currentYear}</small>
                <h2 style="color:#bb86fc">${yearTotal.toFixed(1)}h</h2>
            </div>
        </div>
        <h4>History</h4>
    ` + data.slice().reverse().map(log => `
        <div class="log-item">
            <span><strong>${log.workType}</strong><br><small>${log.start.split(',')[0]}</small></span>
            <span style="color:#bb86fc">${log.duration} hrs</span>
        </div>
    `).join('');

    updateChart(data);
}

function updateChart(data) {
    const ctx = document.getElementById('workChart').getContext('2d');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentYear = new Date().getFullYear();
    
    const monthlyData = monthNames.map(m => {
        return data
            .filter(l => l.month === m && l.year == currentYear)
            .reduce((sum, l) => sum + parseFloat(l.duration), 0);
    });

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthNames.map(m => m.substring(0, 3)),
            datasets: [{
                label: 'Hours Worked',
                data: monthlyData,
                borderColor: '#bb86fc',
                backgroundColor: 'rgba(187, 134, 252, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false } }
        }
    });
}

function resetUI() {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('timer').innerText = "00:00:00";
}

window.onload = fetchCloudData;