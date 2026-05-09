const SCRIPT_URL = 'https://script.google.com/macros/library/d/1L86S6LInc_XXmlQME9apAZxwHKBi6N6c026mRAyS6LsyyTE99O-lKmHC/1'; 
let startTime, timerInterval;

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

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

    saveEntry(entry);
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

async function saveEntry(entry) {
    let logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    logs.push(entry);
    localStorage.setItem('workLogs', JSON.stringify(logs));
    renderDashboard(logs);

    try {
        await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(entry) });
        fetchCloudData();
    } catch (e) { console.log("Offline mode"); }
}

async function fetchCloudData() {
    try {
        const res = await fetch(SCRIPT_URL);
        const data = await res.json();
        localStorage.setItem('workLogs', JSON.stringify(data));
        renderDashboard(data);
    } catch (e) {
        renderDashboard(JSON.parse(localStorage.getItem('workLogs') || '[]'));
    }
}

function renderDashboard(data) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    const monthTotal = data.filter(l => l.month === currentMonth && l.year == currentYear)
                           .reduce((sum, l) => sum + parseFloat(l.duration), 0);
    const yearTotal = data.filter(l => l.year == currentYear)
                          .reduce((sum, l) => sum + parseFloat(l.duration), 0);

    const logList = document.getElementById('logList');
    logList.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
            <div class="card" style="margin:0; background:#252525; padding:15px;">
                <small style="color:#888">This Month</small>
                <h2 style="color:#03dac6; margin:5px 0;">${monthTotal.toFixed(1)}h</h2>
            </div>
            <div class="card" style="margin:0; background:#252525; padding:15px;">
                <small style="color:#888">This Year</small>
                <h2 style="color:#bb86fc; margin:5px 0;">${yearTotal.toFixed(1)}h</h2>
            </div>
        </div>
        <h4>Recent History</h4>
    ` + data.slice().reverse().map(log => `
        <div class="log-item">
            <span><strong>${log.workType}</strong><br><small style="color:#888">${log.start.split(',')[0]}</small></span>
            <span style="color:#bb86fc; font-weight:bold;">${log.duration}h</span>
        </div>
    `).join('');

    updateChart(data);
}

function updateChart(data) {
    const ctx = document.getElementById('workChart').getContext('2d');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const monthlyData = monthNames.map((m, i) => {
        const fullMonth = new Date(2000, i).toLocaleString('default', { month: 'long' });
        return data.filter(l => l.month === fullMonth && l.year == currentYear)
                   .reduce((sum, l) => sum + parseFloat(l.duration), 0);
    });

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthNames,
            datasets: [{
                data: monthlyData,
                borderColor: '#bb86fc',
                backgroundColor: 'rgba(187, 134, 252, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { display: false } } }
        }
    });
}

document.getElementById('exportBtn').onclick = () => {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    const ws = XLSX.utils.json_to_sheet(logs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Logs");
    XLSX.writeFile(wb, "WorkHistory.xlsx");
};

function resetUI() {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('timer').innerText = "00:00:00";
    localStorage.removeItem('startTime');
}

window.onload = fetchCloudData;