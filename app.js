const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPEmnntVou300r1CAJxnKxyktmccbKi-YjLryAlFbx-bdo2juh7n8bZE6OsMAulp8/exec';
let startTime, timerInterval;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

// Update view when year changes
document.getElementById('yearSelector').addEventListener('change', () => {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    renderDashboard(logs);
});

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
    const diff = now - start;
    document.getElementById('timer').innerText = 
        String(Math.floor(diff / 3600000)).padStart(2, '0') + ":" + 
        String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0') + ":" + 
        String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
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
        <h4>${selectedYear} History</h4>
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
                label: 'Hours',
                data: monthlyData,
                backgroundColor: '#bb86fc',
                borderColor: '#bb86fc',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#333' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
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