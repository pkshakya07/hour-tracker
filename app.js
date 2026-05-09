const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPEmnntVou300r1CAJxnKxyktmccbKi-YjLryAlFbx-bdo2juh7n8bZE6OsMAulp8/exec'; 
let startTime, timerInterval;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

// Logic for Timer
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
        start: start.toISOString(),
        end: endTime.toISOString(),
        duration: duration,
        month: start.toLocaleString('default', { month: 'long' }),
        year: start.getFullYear()
    };

    saveLocal(entry);
    syncWithCloud();
    resetUI();
};

function updateTimer() {
    const now = new Date();
    const start = new Date(localStorage.getItem('startTime'));
    const diff = new Date(now - start);
    document.getElementById('timer').innerText = diff.getUTCHours().toString().padStart(2, '0') + ":" + 
        diff.getUTCMinutes().toString().padStart(2, '0') + ":" + 
        diff.getUTCSeconds().toString().padStart(2, '0');
}

function saveLocal(entry) {
    let logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    logs.push(entry);
    localStorage.setItem('workLogs', JSON.stringify(logs));
    renderLogs();
}

async function syncWithCloud() {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    document.getElementById('syncStatus').innerText = "Syncing...";
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(logs[logs.length - 1])
        });
        document.getElementById('syncStatus').innerText = "Synced";
    } catch (e) {
        document.getElementById('syncStatus').innerText = "Offline - Saved Locally";
    }
}

function renderLogs() {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    const container = document.getElementById('logList');
    container.innerHTML = logs.reverse().map((log, index) => `
        <div class="log-item">
            <span>${log.workType} <small>${log.month}</small></span>
            <span class="editable" onclick="editEntry(${index})">${log.duration}h</span>
        </div>
    `).join('');
}

function resetUI() {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('timer').innerText = "00:00:00";
    localStorage.removeItem('startTime');
}

window.onload = renderLogs;