const API_BASE = 'http://localhost:3000/api';

// Global state
let currentTab = 'dashboard';
let players = [];
let leaderboard = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    loadDashboardData();
    showTab('dashboard');
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            showTab(tab);
        });
    });

    // Office filter
    document.getElementById('officeFilter').addEventListener('change', (e) => {
        loadLeaderboard(e.target.value);
    });

    // Add player form
    document.getElementById('addPlayerForm').addEventListener('submit', handleAddPlayer);

    // Modal close events
    document.getElementById('addPlayerModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            hideAddPlayerModal();
        }
    });
}

function showTab(tabName) {
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Show/hide tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });

    currentTab = tabName;

    // Load data for the current tab
    switch (tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'leaderboard':
            loadLeaderboard();
            break;
        case 'players':
            loadPlayers();
            break;
        case 'matchmaking':
            loadMatchmakingQueue();
            break;
    }
}

async function loadDashboardData() {
    try {
        const [playersResponse, leaderboardResponse] = await Promise.all([
            fetch(`${API_BASE}/players`),
            fetch(`${API_BASE}/players/leaderboard`)
        ]);

        const playersData = await playersResponse.json();
        const leaderboardData = await leaderboardResponse.json();

        players = playersData;
        updateDashboardStats(playersData, leaderboardData);
        updateOfficeOverview(playersData);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Error loading dashboard data', 'error');
    }
}

function updateDashboardStats(players, leaderboard) {
    document.getElementById('totalPlayers').textContent = players.length;
    document.getElementById('activeMatches').textContent = '0'; // This would come from matches API
    document.getElementById('prizesAwarded').textContent = '0'; // This would come from prizes API
}

function updateOfficeOverview(players) {
    const offices = ['chicago', 'new york', 'tempe'];
    const officeGrid = document.getElementById('officeGrid');
    
    officeGrid.innerHTML = offices.map(office => {
        const officePlayers = players.filter(p => p.office === office);
        return `
            <div class="office-card">
                <h3><i class="fas fa-building"></i> ${office.replace(' ', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <div class="office-stat">
                    <span>Total Players:</span>
                    <strong>${officePlayers.length}</strong>
                </div>
                <div class="office-stat">
                    <span>Active Players:</span>
                    <strong>${officePlayers.filter(p => p.is_active).length}</strong>
                </div>
                <div class="office-stat">
                    <span>In Queue:</span>
                    <strong>0</strong>
                </div>
            </div>
        `;
    }).join('');
}

async function loadLeaderboard(office = '') {
    try {
        const url = office ? `${API_BASE}/players/leaderboard/${office}` : `${API_BASE}/players/leaderboard`;
        const response = await fetch(url);
        const data = await response.json();
        
        leaderboard = data;
        updateLeaderboardDisplay(data);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showMessage('Error loading leaderboard', 'error');
    }
}

function updateLeaderboardDisplay(data) {
    const tableContainer = document.getElementById('leaderboardTable');
    
    if (data.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-trophy"></i>
                <h3>No data available</h3>
                <p>Play some matches to see the leaderboard!</p>
            </div>
        `;
        return;
    }

    tableContainer.innerHTML = `
        <div class="leaderboard-header">
            <div>Rank</div>
            <div>Player</div>
            <div>Wins</div>
            <div>Losses</div>
            <div>Win Rate</div>
        </div>
        ${data.map((player, index) => {
            const winRate = player.total_games > 0 ? 
                ((player.wins / player.total_games) * 100).toFixed(1) : '0.0';
            
            return `
                <div class="leaderboard-row">
                    <div class="rank">#${index + 1}</div>
                    <div>
                        <strong>${player.name}</strong>
                        <br>
                        <small style="color: #666;">${player.office}</small>
                    </div>
                    <div>${player.wins}</div>
                    <div>${player.losses}</div>
                    <div>${winRate}%</div>
                </div>
            `;
        }).join('')}
    `;
}

async function loadPlayers() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        const data = await response.json();
        
        players = data;
        updatePlayersDisplay(data);
    } catch (error) {
        console.error('Error loading players:', error);
        showMessage('Error loading players', 'error');
    }
}

function updatePlayersDisplay(data) {
    const playersGrid = document.getElementById('playersGrid');
    
    if (data.length === 0) {
        playersGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No players registered</h3>
                <p>Add some players to get started!</p>
            </div>
        `;
        return;
    }

    playersGrid.innerHTML = data.map(player => `
        <div class="player-card">
            <i class="fas fa-user-circle" style="font-size: 3rem; color: #667eea; margin-bottom: 1rem;"></i>
            <h3>${player.name}</h3>
            <div class="player-office">${player.office.replace(/\b\w/g, l => l.toUpperCase())}</div>
            <p style="color: #666; font-size: 0.9rem;">
                <i class="fas fa-envelope"></i> ${player.email || 'No email'}
            </p>
            <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                <i class="fab fa-slack"></i> ${player.slack_user_id || 'No Slack ID'}
            </p>
        </div>
    `).join('');
}

async function loadMatchmakingQueue() {
    const queueSection = document.getElementById('queueSection');
    
    queueSection.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Loading queue status...</h3>
        </div>
    `;

    // Simulate queue data (in a real app, this would come from the API)
    setTimeout(() => {
        queueSection.innerHTML = `
            <i class="fas fa-clock" style="font-size: 4rem; color: #667eea; margin-bottom: 1rem;"></i>
            <h3>Matchmaking Queue</h3>
            <p>Connect your Slack to join the matchmaking queue!</p>
            <div style="margin: 2rem 0;">
                <h4>Available Commands:</h4>
                <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <p><code>/mtg join</code> - Join matchmaking queue</p>
                    <p><code>/mtg leave</code> - Leave queue</p>
                    <p><code>/mtg stats</code> - View your statistics</p>
                    <p><code>/mtg leaderboard</code> - See office rankings</p>
                </div>
            </div>
        `;
    }, 1000);
}

function showAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
}

function hideAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'none';
    document.getElementById('addPlayerForm').reset();
}

async function handleAddPlayer(e) {
    e.preventDefault();
    
    const playerData = {
        name: document.getElementById('playerName').value,
        email: document.getElementById('playerEmail').value,
        slack_user_id: document.getElementById('playerSlack').value,
        office: document.getElementById('playerOffice').value
    };

    try {
        const response = await fetch(`${API_BASE}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playerData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Player added successfully!', 'success');
            hideAddPlayerModal();
            if (currentTab === 'players') {
                loadPlayers();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            throw new Error(result.error || 'Failed to add player');
        }
    } catch (error) {
        console.error('Error adding player:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

function showMessage(text, type = 'info') {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    
    const container = document.querySelector('.container');
    container.insertBefore(message, container.firstChild);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        message.remove();
    }, 5000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function capitalize(str) {
    return str.replace(/\b\w/g, l => l.toUpperCase());
}
