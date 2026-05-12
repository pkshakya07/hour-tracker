const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPEmnntVou300r1CAJxnKxyktmccbKi-YjLryAlFbx-bdo2juh7n8bZE6OsMAulp8/exec';
let timerInterval;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

// 1. PERSISTENCE CHECK: When app opens, check if a timer was already running
window.onload = () => {
    fetchCloudData();
    const savedStartTime = localStorage.getItem('startTime');
    if (savedStartTime) {
        console.log("Resuming session from storage...");
        startVisualTimer();
    }
};

document.getElementById('yearSelector').addEventListener('change', () => {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    renderDashboard(logs);
});

document.getElementById('startBtn').onclick = () => {
    // Save start time to browser's permanent Local Storage
    const startTime = new Date().toISOString();
    localStorage.setItem('startTime', startTime); 
    startVisualTimer();
};

function startVisualTimer() {
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    // Update every second
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // Run once immediately
}

function updateTimer() {
    const startTimeStr = localStorage.getItem('startTime');
    if (!startTimeStr) return;

    const now = new Date();
    const start = new Date(startTimeStr);
    const diff = now - start;
    
    if (isNaN(diff) || diff < 0) return;

    const hours = String(Math.floor(diff / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    document.getElementById('timer').innerText = `${hours}:${minutes}:${seconds}`;
}

document.getElementById('stopBtn').onclick = async () => {
    clearInterval(timerInterval);
    const endTime = new Date();
    const startTimeStr = localStorage.getItem('startTime');
    const start = new Date(startTimeStr);
    const duration = ((endTime - start) / 3600000).toFixed(2);
    
    const entry = {
        workType: document.getElementById('workType').value,
        start: start.toLocaleString(),
        end: endTime.toLocaleString(),
        duration: duration,
        month: start.toLocaleString('default', { month: 'long' }),
        year: start.getFullYear()
    };

    // Clear the storage so a new session can start later
    localStorage.removeItem('startTime');
    saveEntry(entry);
    resetUI();
};

async function saveEntry(entry) {
    let logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    logs.push(entry);
    localStorage.setItem('workLogs', JSON.stringify(logs));
    renderDashboard(logs);

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(entry) });
        fetchCloudData();
    } catch (e) { console.log("Offline mode - will sync later"); }
}

async function fetchCloudData() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        if (Array.isArray(data)) {
            localStorage.setItem('workLogs', JSON.stringify(data));
            renderDashboard(data);
        }
    } catch (e) {
        renderDashboard(JSON.parse(localStorage.getItem('workLogs') || '[]'));
    }
}

function renderDashboard(data) {
    const selectedYear = document.getElementById('yearSelector').value;
    const yearData = data.filter(l => l.year == selectedYear);
    const yearTotal = yearData.reduce((sum, l) => sum + parseFloat(l.duration || 0), 0);

    const logList = document.getElementById('logList');
    logList.innerHTML = `
        <div class="card" style="background:#252525; text-align:center;">
            <small style="color:#888">Total Hours in ${selectedYear}</small>
            <h2 style="color:#03dac6; margin:5px 0;">${yearTotal.toFixed(1)}h</h2>
        </div>
    ` + yearData.slice().reverse().map(log => `
        <div class="log-item">
            <span><strong>${log.workType}</strong><br><small style="color:#888">${log.start}</small></span>
            <span style="color:#bb86fc; font-weight:bold;">${log.duration}h</span>
        </div>
    `).join('');

    updateChart(data, selectedYear);
}

function updateChart(data, year) {
    const ctx = document.getElementById('workChart').getContext('2d');
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const monthlyData = months.map(m => {
        return data.filter(l => l.month === m && l.year == year)
                   .reduce((sum, l) => sum + parseFloat(l.duration || 0), 0);
    });

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: monthlyData,
                backgroundColor: '#bb86fc',
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function resetUI() {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('timer').innerText = "00:00:00";
}
