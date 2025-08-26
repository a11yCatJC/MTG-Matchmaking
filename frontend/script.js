const API_BASE = 'http://localhost:3000/api';

// Global state
let currentTab = 'dashboard';
let players = [];
let matches = [];
let leaderboard = [];
let currentEditingPlayer = null;
let currentReportingMatch = null;

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

    // Filters
    document.getElementById('officeFilter')?.addEventListener('change', (e) => {
        loadLeaderboard(e.target.value);
    });

    document.getElementById('matchFilter')?.addEventListener('change', (e) => {
        filterMatches(e.target.value);
    });

    // Forms
    document.getElementById('addPlayerForm').addEventListener('submit', handleAddPlayer);
    document.getElementById('editPlayerForm').addEventListener('submit', handleEditPlayer);
    document.getElementById('createMatchForm').addEventListener('submit', handleCreateMatch);
    document.getElementById('reportMatchForm').addEventListener('submit', handleReportMatch);

    // Avatar upload
    document.getElementById('avatarInput').addEventListener('change', handleAvatarUpload);

    // Modal close events
    setupModalCloseEvents();
}

function setupModalCloseEvents() {
    const modals = ['addPlayerModal', 'editPlayerModal', 'createMatchModal', 'reportMatchModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    hideModal(modalId);
                }
            });
        }
    });
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Reset forms
        const form = modal.querySelector('form');
        if (form) form.reset();
    }
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
        case 'matches':
            loadMatches();
            break;
        case 'matchmaking':
            loadMatchmakingQueue();
            break;
    }
}

async function loadDashboardData() {
    try {
        const [playersResponse, matchesResponse, leaderboardResponse] = await Promise.all([
            fetch(`${API_BASE}/players`),
            fetch(`${API_BASE}/matches/pending`),
            fetch(`${API_BASE}/players/leaderboard`)
        ]);

        const playersData = await playersResponse.json();
        const pendingMatches = await matchesResponse.json();
        const leaderboardData = await leaderboardResponse.json();

        players = playersData;
        updateDashboardStats(playersData, pendingMatches, leaderboardData);
        updateOfficeOverview(playersData);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showMessage('Error loading dashboard data', 'error');
    }
}

function updateDashboardStats(players, pendingMatches, leaderboard) {
    document.getElementById('totalPlayers').textContent = players.length;
    document.getElementById('pendingMatches').textContent = pendingMatches.length;
    document.getElementById('completedMatches').textContent = '0'; // This would need a separate API call
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

// Match Management Functions
async function loadMatches() {
    try {
        showLoadingInMatches();
        const response = await fetch(`${API_BASE}/players/matches/recent/50`);
        const matchesData = await response.json();
        
        matches = matchesData;
        displayMatches(matchesData);
    } catch (error) {
        console.error('Error loading matches:', error);
        showMessage('Error loading matches', 'error');
        showEmptyMatches();
    }
}

function showLoadingInMatches() {
    const matchesSection = document.getElementById('matchesSection');
    matchesSection.innerHTML = `
        <div class="matches-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Loading matches...</h3>
        </div>
    `;
}

function showEmptyMatches() {
    const matchesSection = document.getElementById('matchesSection');
    matchesSection.innerHTML = `
        <div class="matches-empty">
            <i class="fas fa-swords"></i>
            <h3>No matches found</h3>
            <p>Create a match to get started!</p>
        </div>
    `;
}

function displayMatches(matchesData) {
    const matchesSection = document.getElementById('matchesSection');
    
    if (matchesData.length === 0) {
        showEmptyMatches();
        return;
    }

    matchesSection.innerHTML = `
        <div class="match-list">
            ${matchesData.map(match => createMatchCard(match)).join('')}
        </div>
    `;
}

function createMatchCard(match) {
    const player1Avatar = match.player1_avatar ? 
        `<img src="${API_BASE.replace('/api', '')}${match.player1_avatar}" alt="${match.player1_name}" class="avatar">` :
        `<div class="avatar default-avatar">${match.player1_name.charAt(0).toUpperCase()}</div>`;

    const player2Avatar = match.player2_avatar ? 
        `<img src="${API_BASE.replace('/api', '')}${match.player2_avatar}" alt="${match.player2_name}" class="avatar">` :
        `<div class="avatar default-avatar">${match.player2_name.charAt(0).toUpperCase()}</div>`;

    const isPlayer1Winner = match.winner_id === match.player1_id;
    const isPlayer2Winner = match.winner_id === match.player2_id;
    const isPending = match.status === 'pending';

    return `
        <div class="match-item ${match.status}">
            <div class="match-header">
                <div class="match-stats">
                    <span class="match-date">
                        <i class="fas fa-calendar"></i> ${formatDate(match.match_date)}
                    </span>
                    <span class="match-status ${match.status}">${match.status}</span>
                </div>
            </div>
            
            <div class="match-players-section">
                <div class="match-player-info">
                    ${player1Avatar}
                    <div>
                        <strong>${match.player1_name}</strong>
                        ${isPlayer1Winner ? '<div class="winner-indicator">Winner</div>' : ''}
                    </div>
                </div>
                
                <div class="match-vs">VS</div>
                
                <div class="match-player-info">
                    ${player2Avatar}
                    <div>
                        <strong>${match.player2_name}</strong>
                        ${isPlayer2Winner ? '<div class="winner-indicator">Winner</div>' : ''}
                    </div>
                </div>
            </div>
            
            ${match.notes ? `<div class="match-notes"><em>${match.notes}</em></div>` : ''}
            
            <div class="match-actions">
                ${isPending ? `
                    <button class="btn btn-success btn-small" onclick="showReportMatchModal(${match.id})">
                        <i class="fas fa-flag-checkered"></i> Report Result
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteMatch(${match.id})">
                        <i class="fas fa-trash"></i> Cancel
                    </button>
                ` : `
                    <span class="match-completed">
                        <i class="fas fa-check-circle"></i> Completed
                    </span>
                `}
            </div>
        </div>
    `;
}

function filterMatches(filter) {
    let filteredMatches = matches;
    
    if (filter === 'pending') {
        filteredMatches = matches.filter(m => m.status === 'pending');
    } else if (filter === 'completed') {
        filteredMatches = matches.filter(m => m.status === 'completed');
    }
    
    displayMatches(filteredMatches);
}

// Match Creation
function showCreateMatchModal() {
    document.getElementById('createMatchModal').style.display = 'block';
}

function hideCreateMatchModal() {
    hideModal('createMatchModal');
}

async function loadPlayersForMatch() {
    const office = document.getElementById('matchOffice').value;
    const player1Select = document.getElementById('matchPlayer1');
    const player2Select = document.getElementById('matchPlayer2');
    
    // Reset both selects
    player1Select.innerHTML = '<option value="">Select Player 1</option>';
    player2Select.innerHTML = '<option value="">Select Player 2</option>';
    
    if (!office) return;
    
    try {
        const response = await fetch(`${API_BASE}/players/office/${office}`);
        const players = await response.json();
        
        players.forEach(player => {
            const option = `<option value="${player.id}">${player.name}</option>`;
            player1Select.innerHTML += option;
        });
        
        // Store players for player2 dropdown
        window.currentOfficePlayers = players;
    } catch (error) {
        console.error('Error loading players for match:', error);
        showMessage('Error loading players', 'error');
    }
}

function updatePlayer2Options() {
    const player1Id = parseInt(document.getElementById('matchPlayer1').value);
    const player2Select = document.getElementById('matchPlayer2');
    
    player2Select.innerHTML = '<option value="">Select Player 2</option>';
    
    if (!player1Id || !window.currentOfficePlayers) return;
    
    window.currentOfficePlayers.forEach(player => {
        if (player.id !== player1Id) {
            const option = `<option value="${player.id}">${player.name}</option>`;
            player2Select.innerHTML += option;
        }
    });
}

async function handleCreateMatch(e) {
    e.preventDefault();
    
    const matchData = {
        player1_id: parseInt(document.getElementById('matchPlayer1').value),
        player2_id: parseInt(document.getElementById('matchPlayer2').value)
    };

    try {
        const response = await fetch(`${API_BASE}/matches/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(matchData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Match created successfully!', 'success');
            hideCreateMatchModal();
            if (currentTab === 'matches') {
                loadMatches();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            throw new Error(result.error || 'Failed to create match');
        }
    } catch (error) {
        console.error('Error creating match:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Match Reporting
async function showReportMatchModal(matchId) {
    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}`);
        const match = await response.json();
        
        if (!response.ok) {
            throw new Error(match.error || 'Failed to load match details');
        }
        
        currentReportingMatch = match;
        
        // Populate match details
        const reportContent = document.getElementById('reportMatchContent');
        const player1Avatar = match.player1_avatar ? 
            `<img src="${API_BASE.replace('/api', '')}${match.player1_avatar}" alt="${match.player1_name}" class="avatar-large">` :
            `<div class="avatar-large default-avatar">${match.player1_name.charAt(0).toUpperCase()}</div>`;

        const player2Avatar = match.player2_avatar ? 
            `<img src="${API_BASE.replace('/api', '')}${match.player2_avatar}" alt="${match.player2_name}" class="avatar-large">` :
            `<div class="avatar-large default-avatar">${match.player2_name.charAt(0).toUpperCase()}</div>`;

        reportContent.innerHTML = `
            <div class="match-players-section">
                <div class="match-player-info">
                    ${player1Avatar}
                    <div><strong>${match.player1_name}</strong></div>
                </div>
                <div class="match-vs">VS</div>
                <div class="match-player-info">
                    ${player2Avatar}
                    <div><strong>${match.player2_name}</strong></div>
                </div>
            </div>
            <div class="match-date">
                <i class="fas fa-calendar"></i> ${formatDate(match.match_date)}
            </div>
        `;
        
        // Populate winner selection
        const winnerSelection = document.getElementById('winnerSelection');
        winnerSelection.innerHTML = `
            <label class="winner-option">
                <input type="radio" name="winner" value="${match.player1_id}" required>
                <div class="winner-player">
                    ${player1Avatar}
                    <strong>${match.player1_name}</strong>
                </div>
            </label>
            <label class="winner-option">
                <input type="radio" name="winner" value="${match.player2_id}" required>
                <div class="winner-player">
                    ${player2Avatar}
                    <strong>${match.player2_name}</strong>
                </div>
            </label>
        `;
        
        // Add click handlers for winner selection
        document.querySelectorAll('.winner-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.winner-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                this.querySelector('input[type="radio"]').checked = true;
            });
        });
        
        document.getElementById('reportMatchId').value = matchId;
        document.getElementById('reportMatchModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading match for reporting:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

function hideReportMatchModal() {
    hideModal('reportMatchModal');
    currentReportingMatch = null;
}

async function handleReportMatch(e) {
    e.preventDefault();
    
    const matchId = document.getElementById('reportMatchId').value;
    const winnerRadio = document.querySelector('input[name="winner"]:checked');
    const notes = document.getElementById('matchNotes').value;
    
    if (!winnerRadio) {
        showMessage('Please select a winner', 'error');
        return;
    }
    
    const reportData = {
        winnerId: parseInt(winnerRadio.value),
        reportedBy: 1, // This should be the current user's ID in a real app
        notes: notes
    };

    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reportData)
        });

        const result = await response.json();

        if (response.ok) {
            let message = 'Match result reported successfully!';
            
            // Show prize notification if applicable
            if (result.prize && result.prize.eligible) {
                showPrizeNotification(result.prize);
            }
            
            showMessage(message, 'success');
            hideReportMatchModal();
            
            if (currentTab === 'matches') {
                loadMatches();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            throw new Error(result.error || 'Failed to report match');
        }
    } catch (error) {
        console.error('Error reporting match:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

function showPrizeNotification(prize) {
    const notification = document.createElement('div');
    notification.className = 'prize-notification';
    notification.innerHTML = `
        <i class="fas fa-trophy"></i>
        <strong>🎉 ${prize.message} 🎉</strong>
        <br>
        <small>Current record: ${prize.wins} wins, ${prize.losses} losses</small>
    `;
    
    document.body.appendChild(notification);
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '1000';
    notification.style.maxWidth = '400px';
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

async function deleteMatch(matchId) {
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Match deleted successfully', 'success');
            if (currentTab === 'matches') {
                loadMatches();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            throw new Error(result.error || 'Failed to delete match');
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// ... (keep all existing functions from previous script.js) ...

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
            
            const avatarHtml = player.avatar_url ? 
                `<img src="${API_BASE.replace('/api', '')}${player.avatar_url}" alt="${player.name}" class="leaderboard-avatar">` :
                `<div class="leaderboard-avatar default-avatar" style="width: 40px; height: 40px; font-size: 1rem;">
                    ${player.name.charAt(0).toUpperCase()}
                </div>`;
            
            return `
                <div class="leaderboard-row">
                    <div class="rank">#${index + 1}</div>
                    <div class="leaderboard-player">
                        ${avatarHtml}
                        <div>
                            <strong>${player.name}</strong>
                            <br>
                            <small style="color: #666;">${player.office}</small>
                        </div>
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

    playersGrid.innerHTML = data.map(player => {
        const avatarHtml = player.avatar_url ? 
            `<img src="${API_BASE.replace('/api', '')}${player.avatar_url}" alt="${player.name}" class="player-card-avatar">` :
            `<div class="default-avatar">
                ${player.name.charAt(0).toUpperCase()}
            </div>`;

        return `
            <div class="player-card">
                ${avatarHtml}
                <h3>${player.name}</h3>
                <div class="player-office">${player.office.replace(/\b\w/g, l => l.toUpperCase())}</div>
                <p style="color: #666; font-size: 0.9rem;">
                    <i class="fas fa-envelope"></i> ${player.email || 'No email'}
                </p>
                <p style="color: #666; font-size: 0.9rem; margin-top: 0.5rem;">
                    <i class="fab fa-slack"></i> ${player.slack_user_id || 'No Slack ID'}
                </p>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-secondary" onclick="editPlayer(${player.id})" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');
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

// Player Management Functions (keep existing ones)
async function editPlayer(playerId) {
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`);
        const player = await response.json();
        
        currentEditingPlayer = player;
        
        // Populate form
        document.getElementById('editPlayerId').value = player.id;
        document.getElementById('editPlayerName').value = player.name;
        document.getElementById('editPlayerEmail').value = player.email || '';
        document.getElementById('editPlayerSlack').value = player.slack_user_id || '';
        document.getElementById('editPlayerOffice').value = player.office;
        
        // Update avatar preview
        const avatarImg = document.getElementById('currentAvatar');
        const deleteBtn = document.getElementById('deleteAvatarBtn');
        
        if (player.avatar_url) {
            avatarImg.src = `${API_BASE.replace('/api', '')}${player.avatar_url}`;
            avatarImg.style.display = 'block';
            deleteBtn.style.display = 'inline-block';
        } else {
            avatarImg.style.display = 'none';
            deleteBtn.style.display = 'none';
        }
        
        showEditPlayerModal();
    } catch (error) {
        console.error('Error loading player:', error);
        showMessage('Error loading player details', 'error');
    }
}

async function handleEditPlayer(e) {
    e.preventDefault();
    
    const playerId = document.getElementById('editPlayerId').value;
    const playerData = {
        name: document.getElementById('editPlayerName').value,
        email: document.getElementById('editPlayerEmail').value,
        slack_user_id: document.getElementById('editPlayerSlack').value,
        office: document.getElementById('editPlayerOffice').value
    };

    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playerData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Player updated successfully!', 'success');
            hideEditPlayerModal();
            if (currentTab === 'players') {
                loadPlayers();
            }
            loadDashboardData(); // Refresh dashboard stats
        } else {
            throw new Error(result.error || 'Failed to update player');
        }
    } catch (error) {
        console.error('Error updating player:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const playerId = document.getElementById('editPlayerId').value;
    if (!playerId) {
        showMessage('No player selected', 'error');
        return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showMessage('Please select a valid image file (JPEG, PNG, GIF, WebP)', 'error');
        return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('File size must be less than 5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    const avatarImg = document.getElementById('currentAvatar');
    avatarImg.classList.add('avatar-loading');
    
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}/avatar`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update preview
            avatarImg.src = `${API_BASE.replace('/api', '')}${result.avatarUrl}`;
            avatarImg.style.display = 'block';
            document.getElementById('deleteAvatarBtn').style.display = 'inline-block';
            
            showMessage('Avatar uploaded successfully!', 'success');
            
            // Refresh current tab if showing players or leaderboard
            if (currentTab === 'players') {
                loadPlayers();
            } else if (currentTab === 'leaderboard') {
                loadLeaderboard();
            }
        } else {
            throw new Error(result.error || 'Failed to upload avatar');
        }
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showMessage(`Error: ${error.message}`, 'error');
    } finally {
        avatarImg.classList.remove('avatar-loading');
        e.target.value = ''; // Reset file input
    }
}

async function deleteAvatar() {
    const playerId = document.getElementById('editPlayerId').value;
    if (!playerId) return;
    
    if (!confirm('Are you sure you want to remove this avatar?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}/avatar`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Update preview
            const avatarImg = document.getElementById('currentAvatar');
            avatarImg.style.display = 'none';
            document.getElementById('deleteAvatarBtn').style.display = 'none';
            
            showMessage('Avatar removed successfully!', 'success');
            
            // Refresh current tab if showing players or leaderboard
            if (currentTab === 'players') {
                loadPlayers();
            } else if (currentTab === 'leaderboard') {
                loadLeaderboard();
            }
        } else {
            throw new Error(result.error || 'Failed to delete avatar');
        }
    } catch (error) {
        console.error('Error deleting avatar:', error);
        showMessage(`Error: ${error.message}`, 'error');
    }
}

// Modal Functions
function showAddPlayerModal() {
    document.getElementById('addPlayerModal').style.display = 'block';
}

function hideAddPlayerModal() {
    hideModal('addPlayerModal');
}

function showEditPlayerModal() {
    document.getElementById('editPlayerModal').style.display = 'block';
}

function hideEditPlayerModal() {
    hideModal('editPlayerModal');
    currentEditingPlayer = null;
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
