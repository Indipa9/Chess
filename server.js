const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server });

class GameRoom {
    constructor(id) {
        this.id = id;
        this.players = [];
        this.gameState = null;
        this.currentPlayer = 'white';
        this.spectators = [];
        this.moveHistory = [];
    }

    addPlayer(ws, playerName) {
        if (this.players.length < 2) {
            const color = this.players.length === 0 ? 'white' : 'black';
            const player = { ws, color, name: playerName };
            this.players.push(player);
            
            // Notify player of their color
            ws.send(JSON.stringify({
                type: 'player-assigned',
                color: color,
                roomId: this.id,
                playerName: playerName
            }));

            // Notify all players about room status
            this.broadcastToRoom({
                type: 'room-status',
                players: this.players.map(p => ({ name: p.name, color: p.color })),
                canStart: this.players.length === 2
            });

            return true;
        }
        return false;
    }

    removePlayer(ws) {
        this.players = this.players.filter(player => player.ws !== ws);
        this.spectators = this.spectators.filter(spectator => spectator !== ws);
        
        if (this.players.length > 0) {
            this.broadcastToRoom({
                type: 'player-disconnected',
                players: this.players.map(p => ({ name: p.name, color: p.color }))
            });
        }
    }

    broadcastToRoom(message, excludeWs = null) {
        const messageStr = JSON.stringify(message);
        [...this.players, ...this.spectators].forEach(player => {
            const ws = player.ws || player;
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                ws.send(messageStr);
            }
        });
    }

    handleMove(ws, moveData) {
        const player = this.players.find(p => p.ws === ws);
        if (!player || player.color !== this.currentPlayer) {
            return false;
        }

        // Store the move
        this.moveHistory.push(moveData);

        // Broadcast move to other players
        this.broadcastToRoom({
            type: 'move',
            ...moveData,
            player: player.color
        }, ws);

        // Switch current player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        return true;
    }

    handleNewGame(ws) {
        const player = this.players.find(p => p.ws === ws);
        if (!player) return false;

        // Reset game state
        this.currentPlayer = 'white';
        this.moveHistory = [];

        // Broadcast new game to all players
        this.broadcastToRoom({
            type: 'new-game',
            initiatedBy: player.color
        });

        return true;
    }
}

const rooms = new Map();

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'create-room':
                    const roomId = generateRoomId();
                    const room = new GameRoom(roomId);
                    rooms.set(roomId, room);
                    
                    room.addPlayer(ws, data.playerName || 'Player 1');
                    
                    ws.send(JSON.stringify({
                        type: 'room-created',
                        roomId: roomId
                    }));
                    break;

                case 'join-room':
                    const targetRoom = rooms.get(data.roomId);
                    if (targetRoom) {
                        if (targetRoom.addPlayer(ws, data.playerName || 'Player 2')) {
                            ws.send(JSON.stringify({
                                type: 'room-joined',
                                roomId: data.roomId
                            }));
                        } else {
                            ws.send(JSON.stringify({
                                type: 'room-full',
                                roomId: data.roomId
                            }));
                        }
                    } else {
                        ws.send(JSON.stringify({
                            type: 'room-not-found',
                            roomId: data.roomId
                        }));
                    }
                    break;

                case 'move':
                    // Find the room this player is in
                    for (const [roomId, room] of rooms) {
                        if (room.players.some(p => p.ws === ws)) {
                            room.handleMove(ws, data);
                            break;
                        }
                    }
                    break;

                case 'new-game':
                    // Find the room this player is in
                    for (const [roomId, room] of rooms) {
                        if (room.players.some(p => p.ws === ws)) {
                            room.handleNewGame(ws);
                            break;
                        }
                    }
                    break;

                case 'game-state':
                    // Broadcast game state updates
                    for (const [roomId, room] of rooms) {
                        if (room.players.some(p => p.ws === ws)) {
                            room.broadcastToRoom({
                                type: 'game-state',
                                ...data
                            }, ws);
                            break;
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        
        // Remove player from all rooms
        for (const [roomId, room] of rooms) {
            room.removePlayer(ws);
            
            // Clean up empty rooms
            if (room.players.length === 0 && room.spectators.length === 0) {
                rooms.delete(roomId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Chess server running on port ${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT} to play!`);
});
