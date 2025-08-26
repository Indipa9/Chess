class ChessGame {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameState = 'playing';
        this.isFlipped = false;
        this.gameMode = 'human-vs-human';
        this.aiColor = 'black';
        this.aiDifficulty = 'medium';
        this.isAiThinking = false;
        
        // Online multiplayer properties
        this.ws = null;
        this.isOnline = false;
        this.playerColor = null;
        this.roomId = null;
        this.isMyTurn = false;
        this.opponentName = 'Opponent';
        this.playerName = 'You';
        
        this.pieceSymbols = {
            white: {
                king: '♔', queen: '♕', rook: '♖',
                bishop: '♗', knight: '♘', pawn: '♙'
            },
            black: {
                king: '♚', queen: '♛', rook: '♜',
                bishop: '♝', knight: '♞', pawn: '♟'
            }
        };

        this.pieceValues = {
            pawn: 100, knight: 320, bishop: 330, 
            rook: 500, queen: 900, king: 20000
        };

        this.initializeEventListeners();
        this.renderBoard();
        this.updateGameInfo();
        this.initializeOnlineControls();
    }

    initializeOnlineControls() {
        // Add event listeners for online controls
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room').addEventListener('click', () => this.joinRoom());
        document.getElementById('room-id-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });
    }

    connectToServer() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to server');
                this.updateConnectionStatus('Connected');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleServerMessage(data);
            };

            this.ws.onclose = () => {
                console.log('Disconnected from server');
                this.updateConnectionStatus('Disconnected');
                this.isOnline = false;
                this.playerColor = null;
                this.roomId = null;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Connection Error');
            };
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.updateConnectionStatus('Connection Failed');
        }
    }

    disconnectFromServer() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isOnline = false;
        this.playerColor = null;
        this.roomId = null;
        this.updateConnectionStatus('Disconnected');
        this.updateRoomStatus('');
    }

    handleServerMessage(data) {
        switch (data.type) {
            case 'room-created':
                this.roomId = data.roomId;
                this.updateRoomStatus(`Room created: ${data.roomId}. Share this ID with your opponent.`);
                break;

            case 'room-joined':
                this.roomId = data.roomId;
                this.updateRoomStatus(`Joined room: ${data.roomId}`);
                break;

            case 'player-assigned':
                this.playerColor = data.color;
                this.isOnline = true;
                this.isMyTurn = data.color === 'white';
                this.playerName = data.playerName;
                this.updateRoomStatus(`You are playing as ${data.color}`);
                this.updatePlayerNames();
                break;

            case 'room-status':
                if (data.canStart) {
                    this.updateRoomStatus('Game ready! Both players connected.');
                    if (data.players.length === 2) {
                        const opponent = data.players.find(p => p.color !== this.playerColor);
                        if (opponent) {
                            this.opponentName = opponent.name;
                            this.updatePlayerNames();
                        }
                    }
                } else {
                    this.updateRoomStatus('Waiting for opponent...');
                }
                break;

            case 'move':
                this.receiveOpponentMove(data);
                break;

            case 'new-game':
                this.receiveNewGameRequest(data);
                break;

            case 'game-state':
                this.receiveGameState(data);
                break;

            case 'player-disconnected':
                this.updateRoomStatus('Opponent disconnected');
                break;

            case 'room-not-found':
                this.updateRoomStatus('Room not found. Check the room ID.');
                break;

            case 'room-full':
                this.updateRoomStatus('Room is full');
                break;
        }
    }

    createRoom() {
        const playerName = document.getElementById('player-name').value.trim() || 'Player 1';
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'create-room',
                playerName: playerName
            }));
        } else {
            this.updateRoomStatus('Not connected to server');
        }
    }

    joinRoom() {
        const roomId = document.getElementById('room-id-input').value.trim().toUpperCase();
        const playerName = document.getElementById('player-name').value.trim() || 'Player 2';
        
        if (!roomId) {
            this.updateRoomStatus('Please enter a room ID');
            return;
        }

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'join-room',
                roomId: roomId,
                playerName: playerName
            }));
        } else {
            this.updateRoomStatus('Not connected to server');
        }
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `connection-status ${status.toLowerCase().replace(/\s/g, '-')}`;
        }
    }

    updateRoomStatus(message) {
        const statusElement = document.getElementById('room-status');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    initializeBoard() {
        const board = Array(8).fill().map(() => Array(8).fill(null));
        
        const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
        
        for (let i = 0; i < 8; i++) {
            board[0][i] = { type: backRank[i], color: 'black' };
            board[1][i] = { type: 'pawn', color: 'black' };
            board[6][i] = { type: 'pawn', color: 'white' };
            board[7][i] = { type: backRank[i], color: 'white' };
        }
        
        return board;
    }

    initializeEventListeners() {
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        document.getElementById('undo-move').addEventListener('click', () => this.undoMove());
        document.getElementById('flip-board').addEventListener('click', () => this.flipBoard());
        
        const gameModeSelect = document.getElementById('game-mode');
        const aiDifficultySelect = document.getElementById('ai-difficulty');
        
        gameModeSelect.addEventListener('change', (e) => {
            this.gameMode = e.target.value;
            
            if (this.gameMode === 'human-vs-computer') {
                aiDifficultySelect.style.display = 'block';
                document.getElementById('online-controls').style.display = 'none';
                this.disconnectFromServer();
                this.aiColor = 'black';
                this.updatePlayerNames();
            } else if (this.gameMode === 'online-multiplayer') {
                aiDifficultySelect.style.display = 'none';
                document.getElementById('online-controls').style.display = 'block';
                this.connectToServer();
            } else {
                aiDifficultySelect.style.display = 'none';
                document.getElementById('online-controls').style.display = 'none';
                this.disconnectFromServer();
                this.updatePlayerNames();
            }
        });
        
        aiDifficultySelect.addEventListener('change', (e) => {
            this.aiDifficulty = e.target.value;
            this.updatePlayerNames();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    renderBoard() {
        const boardElement = document.getElementById('chessboard');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const displayRow = this.isFlipped ? 7 - row : row;
                const displayCol = this.isFlipped ? 7 - col : col;
                
                square.className = 'square';
                square.classList.add((displayRow + displayCol) % 2 === 0 ? 'light' : 'dark');
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('span');
                    pieceElement.className = 'piece';
                    pieceElement.textContent = this.pieceSymbols[piece.color][piece.type];
                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                boardElement.appendChild(square);
            }
        }

        this.highlightLastMove();
        this.highlightCheck();
    }

    handleSquareClick(row, col) {
        if (this.gameState !== 'playing' || this.isAiThinking) return;
        
        // Check if it's an online game and if it's the player's turn
        if (this.isOnline) {
            if (!this.isMyTurn) {
                this.updateRoomStatus("It's not your turn!");
                return;
            }
            if (this.currentPlayer !== this.playerColor) {
                return;
            }
        } else if (this.gameMode === 'human-vs-computer' && this.currentPlayer === this.aiColor) {
            return;
        }

        const piece = this.board[row][col];
        
        if (this.selectedSquare) {
            const [selectedRow, selectedCol] = this.selectedSquare;
            
            if (selectedRow === row && selectedCol === col) {
                this.clearSelection();
                return;
            }

            if (this.isValidMove(selectedRow, selectedCol, row, col)) {
                this.makeMove(selectedRow, selectedCol, row, col);
                this.clearSelection();
            } else if (piece && piece.color === this.currentPlayer) {
                this.selectSquare(row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && piece.color === this.currentPlayer) {
            this.selectSquare(row, col);
        }
    }

    selectSquare(row, col) {
        this.selectedSquare = [row, col];
        this.renderBoard();
        this.highlightSelectedSquare(row, col);
        this.highlightValidMoves(row, col);
    }

    clearSelection() {
        this.selectedSquare = null;
        this.renderBoard();
    }

    highlightSelectedSquare(row, col) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('selected');
        }
    }

    highlightValidMoves(row, col) {
        const validMoves = this.getValidMoves(row, col);
        validMoves.forEach(([moveRow, moveCol]) => {
            const square = document.querySelector(`[data-row="${moveRow}"][data-col="${moveCol}"]`);
            if (square) {
                const isCapture = this.board[moveRow][moveCol] !== null;
                square.classList.add(isCapture ? 'valid-capture' : 'valid-move');
            }
        });
    }

    highlightLastMove() {
        if (this.moveHistory.length === 0) return;
        
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        const fromSquare = document.querySelector(`[data-row="${lastMove.from.row}"][data-col="${lastMove.from.col}"]`);
        const toSquare = document.querySelector(`[data-row="${lastMove.to.row}"][data-col="${lastMove.to.col}"]`);
        
        if (fromSquare) fromSquare.classList.add('last-move');
        if (toSquare) toSquare.classList.add('last-move');
    }

    highlightCheck() {
        const kingPosition = this.findKing(this.currentPlayer);
        if (kingPosition && this.isInCheck(this.currentPlayer)) {
            const square = document.querySelector(`[data-row="${kingPosition.row}"][data-col="${kingPosition.col}"]`);
            if (square) {
                square.classList.add('in-check');
            }
        }
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return [];

        const possibleMoves = this.getPossibleMoves(row, col);
        const validMoves = possibleMoves.filter(([moveRow, moveCol]) => {
            const wouldBeInCheck = this.wouldBeInCheck(piece.color, row, col, moveRow, moveCol);
            if (piece.type === 'king') {
                console.log(`King move ${row},${col} -> ${moveRow},${moveCol}: ${wouldBeInCheck ? 'INVALID' : 'VALID'}`);
            }
            return !wouldBeInCheck;
        });

        console.log(`Piece ${piece.type} at ${row},${col}: ${possibleMoves.length} possible, ${validMoves.length} valid moves`);
        return validMoves;
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        switch (piece.type) {
            case 'pawn': return this.getPawnMoves(row, col, piece.color);
            case 'rook': return this.getRookMoves(row, col);
            case 'bishop': return this.getBishopMoves(row, col);
            case 'queen': return this.getQueenMoves(row, col);
            case 'king': return this.getKingMoves(row, col);
            case 'knight': return this.getKnightMoves(row, col);
            default: return [];
        }
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        const newRow = row + direction;
        if (this.isValidPosition(newRow, col) && !this.board[newRow][col]) {
            moves.push([newRow, col]);
            
            if (row === startRow && !this.board[newRow + direction][col]) {
                moves.push([newRow + direction, col]);
            }
        }

        for (const newCol of [col - 1, col + 1]) {
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target && target.color !== color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [rowDir, colDir] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isValidPosition(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push([newRow, newCol]);
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getBishopMoves(row, col) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [rowDir, colDir] of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + rowDir * i;
                const newCol = col + colDir * i;

                if (!this.isValidPosition(newRow, newCol)) break;

                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push([newRow, newCol]);
                } else {
                    if (target.color !== this.board[row][col].color) {
                        moves.push([newRow, newCol]);
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getQueenMoves(row, col) {
        return [...this.getRookMoves(row, col), ...this.getBishopMoves(row, col)];
    }

    getKingMoves(row, col) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [rowDir, colDir] of directions) {
            const newRow = row + rowDir;
            const newCol = col + colDir;

            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== this.board[row][col].color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    getKnightMoves(row, col) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [rowOffset, colOffset] of knightMoves) {
            const newRow = row + rowOffset;
            const newCol = col + colOffset;

            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== this.board[row][col].color) {
                    moves.push([newRow, newCol]);
                }
            }
        }

        return moves;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        const validMoves = this.getValidMoves(fromRow, fromCol);
        return validMoves.some(([row, col]) => row === toRow && col === toCol);
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];

        const moveData = {
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: { ...piece },
            capturedPiece: capturedPiece ? { ...capturedPiece } : null,
            notation: this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece)
        };

        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        this.moveHistory.push(moveData);
        this.currentPlayer = this.getOpponent(this.currentPlayer);
        
        // Send move to opponent if online
        if (this.isOnline && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                ...moveData
            }));
            this.isMyTurn = false;
        }

        this.updateGameState();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();

        // Handle AI move for local computer games
        if (!this.isOnline && 
            this.gameMode === 'human-vs-computer' && 
            this.currentPlayer === this.aiColor && 
            this.gameState === 'playing') {
            setTimeout(() => this.makeAiMove(), 500);
        }
    }

    receiveOpponentMove(moveData) {
        // Apply the opponent's move
        this.board[moveData.to.row][moveData.to.col] = moveData.piece;
        this.board[moveData.from.row][moveData.from.col] = null;

        this.moveHistory.push(moveData);
        this.currentPlayer = this.getOpponent(this.currentPlayer);
        this.isMyTurn = this.currentPlayer === this.playerColor;

        this.updateGameState();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
    }

    receiveNewGameRequest(data) {
        // Reset the game when opponent starts a new game
        this.newGameInternal();
    }

    receiveGameState(data) {
        // Handle game state updates from opponent
        if (data.gameState) {
            this.gameState = data.gameState;
            this.updateGameInfo();
        }
    }

    wouldBeInCheck(color, fromRow, fromCol, toRow, toCol) {
        if (!this.board[fromRow] || !this.board[fromRow][fromCol]) return true;
        if (!this.isValidPosition(toRow, toCol)) return true;
        
        const originalDestination = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];

        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        let wouldBeInCheck = false;
        try {
            wouldBeInCheck = this.isInCheck(color);
        } catch (error) {
            console.error('Error checking if would be in check:', error);
            wouldBeInCheck = true;
        }

        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalDestination;

        return wouldBeInCheck;
    }

    isInCheck(color) {
        const kingPosition = this.findKing(color);
        if (!kingPosition) return false;

        return this.isSquareUnderAttack(kingPosition.row, kingPosition.col, this.getOpponent(color));
    }

    isSquareUnderAttack(row, col, attackingColor) {
        if (!this.isValidPosition(row, col)) return false;
        
        try {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const piece = this.board[r][c];
                    if (piece && piece.color === attackingColor) {
                        try {
                            if (this.canPieceAttackSquare(piece, r, c, row, col)) {
                                return true;
                            }
                        } catch (error) {
                            console.error(`Error checking attack from ${r},${c}:`, error);
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in isSquareUnderAttack:', error);
        }
        return false;
    }

    canPieceAttackSquare(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        const absRowDiff = Math.abs(rowDiff);
        const absColDiff = Math.abs(colDiff);

        switch (piece.type) {
            case 'pawn':
                const direction = piece.color === 'white' ? -1 : 1;
                return rowDiff === direction && absColDiff === 1;
                
            case 'rook':
                if (rowDiff === 0 || colDiff === 0) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                return false;
                
            case 'bishop':
                if (absRowDiff === absColDiff) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                return false;
                
            case 'queen':
                if (rowDiff === 0 || colDiff === 0 || absRowDiff === absColDiff) {
                    return this.isPathClear(fromRow, fromCol, toRow, toCol);
                }
                return false;
                
            case 'king':
                return absRowDiff <= 1 && absColDiff <= 1;
                
            case 'knight':
                return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
                
            default:
                return false;
        }
    }

    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) {
                return false;
            }
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }

    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'king' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    updateGameState() {
        if (this.isCheckmate(this.currentPlayer)) {
            this.gameState = 'checkmate';
        } else if (this.isStalemate(this.currentPlayer)) {
            this.gameState = 'stalemate';
        } else if (this.isInCheck(this.currentPlayer)) {
            this.gameState = 'check';
        } else {
            this.gameState = 'playing';
        }
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return this.getAllValidMoves(color).length === 0;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return this.getAllValidMoves(color).length === 0;
    }

    getAllValidMoves(color) {
        const moves = [];
        try {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.color === color) {
                        try {
                            const validMoves = this.getValidMoves(row, col);
                            moves.push(...validMoves);
                        } catch (error) {
                            console.error(`Error getting valid moves for ${row},${col}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in getAllValidMoves:', error);
        }
        return moves;
    }

    getOpponent(color) {
        return color === 'white' ? 'black' : 'white';
    }

    updateGameInfo() {
        const turnElement = document.getElementById('current-turn');
        const stateElement = document.getElementById('game-state');
        const indicator = turnElement.querySelector('.turn-indicator');
        const text = turnElement.querySelector('.turn-text');

        indicator.className = `turn-indicator ${this.currentPlayer}-turn`;
        
        if (this.isOnline) {
            const turnText = this.isMyTurn ? 'Your turn' : "Opponent's turn";
            text.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'} - ${turnText}`;
        } else {
            text.textContent = `${this.currentPlayer === 'white' ? 'White' : 'Black'} to move`;
        }

        const playerInfos = document.querySelectorAll('.player-info');
        playerInfos.forEach(info => info.classList.remove('active'));
        
        const activePlayer = document.querySelector(`.player-${this.currentPlayer}`);
        if (activePlayer) activePlayer.classList.add('active');

        const availableMoves = this.getAllValidMoves(this.currentPlayer);
        console.log(`${this.currentPlayer} has ${availableMoves.length} valid moves`);

        switch (this.gameState) {
            case 'check':
                stateElement.textContent = `Check! (${availableMoves.length} moves available)`;
                stateElement.style.color = '#ef4444';
                break;
            case 'checkmate':
                stateElement.textContent = `Checkmate! ${this.getOpponent(this.currentPlayer)} wins!`;
                stateElement.style.color = '#ef4444';
                break;
            case 'stalemate':
                stateElement.textContent = 'Stalemate! Draw!';
                stateElement.style.color = '#f59e0b';
                break;
            default:
                stateElement.textContent = 'Game in progress';
                stateElement.style.color = '#10b981';
        }

        this.updateCapturedPieces();
    }

    updateCapturedPieces() {
        const capturedWhite = document.getElementById('captured-white');
        const capturedBlack = document.getElementById('captured-black');
        
        capturedWhite.innerHTML = '';
        capturedBlack.innerHTML = '';

        this.moveHistory.forEach(move => {
            if (move.capturedPiece) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'captured-piece';
                pieceElement.textContent = this.pieceSymbols[move.capturedPiece.color][move.capturedPiece.type];
                
                const container = move.capturedPiece.color === 'white' ? capturedWhite : capturedBlack;
                container.appendChild(pieceElement);
            }
        });
    }

    updateMoveHistory() {
        const container = document.getElementById('moves-container');
        
        if (this.moveHistory.length === 0) {
            container.innerHTML = '<div class="no-moves">No moves yet</div>';
            return;
        }

        container.innerHTML = '';
        
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];

            const moveRow = document.createElement('div');
            moveRow.className = 'move-pair';

            const numberDiv = document.createElement('div');
            numberDiv.className = 'move-number';
            numberDiv.textContent = `${moveNumber}.`;

            const whiteMoveDiv = document.createElement('div');
            whiteMoveDiv.className = 'move';
            whiteMoveDiv.textContent = whiteMove.notation;

            const blackMoveDiv = document.createElement('div');
            blackMoveDiv.className = 'move';
            if (blackMove) {
                blackMoveDiv.textContent = blackMove.notation;
            }

            moveRow.appendChild(numberDiv);
            moveRow.appendChild(whiteMoveDiv);
            moveRow.appendChild(blackMoveDiv);
            container.appendChild(moveRow);
        }

        container.scrollTop = container.scrollHeight;
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
        const from = this.getSquareNotation(fromRow, fromCol);
        const to = this.getSquareNotation(toRow, toCol);
        
        let notation = '';
        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
        }

        if (capturedPiece) {
            if (piece.type === 'pawn') {
                notation += from.charAt(0);
            }
            notation += 'x';
        }

        notation += to;
        return notation;
    }

    getSquareNotation(row, col) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        return files[col] + ranks[row];
    }

    newGame() {
        // Send new game request if online
        if (this.isOnline && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'new-game'
            }));
        }
        
        this.newGameInternal();
    }

    newGameInternal() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.moveHistory = [];
        this.gameState = 'playing';
        this.isAiThinking = false;
        
        if (!this.isOnline) {
            this.gameMode = document.getElementById('game-mode').value;
            this.aiDifficulty = document.getElementById('ai-difficulty').value;
        }
        
        if (this.isOnline) {
            this.isMyTurn = this.playerColor === 'white';
        }
        
        this.updatePlayerNames();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
        this.showAiThinking(false);
    }

    undoMove() {
        if (this.moveHistory.length === 0) return;
        if (this.isOnline) return; // Disable undo in online games

        this.moveHistory.pop();
        if (this.gameMode === 'human-vs-computer' && this.moveHistory.length > 0) {
            this.moveHistory.pop();
        }

        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        
        for (const move of this.moveHistory) {
            this.board[move.to.row][move.to.col] = move.piece;
            this.board[move.from.row][move.from.col] = null;
            this.currentPlayer = this.getOpponent(this.currentPlayer);
        }
        
        this.updateGameState();
        this.renderBoard();
        this.updateGameInfo();
        this.updateMoveHistory();
    }

    flipBoard() {
        this.isFlipped = !this.isFlipped;
        this.renderBoard();
        
        const coords = document.querySelectorAll('.coordinates');
        coords.forEach(coord => {
            if (coord.classList.contains('coordinates-top') || coord.classList.contains('coordinates-bottom')) {
                const files = Array.from(coord.children);
                files.reverse().forEach(file => coord.appendChild(file));
            } else {
                const ranks = Array.from(coord.children);
                ranks.reverse().forEach(rank => coord.appendChild(rank));
            }
        });
    }

    updatePlayerNames() {
        const whitePlayerName = document.getElementById('white-player-name') || 
                               document.querySelector('.player-white .player-details h3');
        const blackPlayerName = document.getElementById('black-player-name');
        const blackPlayerIcon = document.getElementById('black-player-icon');
        const whitePlayerIcon = document.querySelector('.player-white .player-avatar i');
        
        if (this.isOnline) {
            // Online multiplayer mode
            if (this.playerColor === 'white') {
                if (whitePlayerName) whitePlayerName.textContent = `${this.playerName} (You)`;
                if (blackPlayerName) blackPlayerName.textContent = `${this.opponentName}`;
            } else if (this.playerColor === 'black') {
                if (whitePlayerName) whitePlayerName.textContent = `${this.opponentName}`;
                if (blackPlayerName) blackPlayerName.textContent = `${this.playerName} (You)`;
            }
            if (whitePlayerIcon) whitePlayerIcon.className = 'fas fa-user';
            if (blackPlayerIcon) blackPlayerIcon.className = 'fas fa-user';
        } else if (this.gameMode === 'human-vs-computer') {
            // AI mode
            if (whitePlayerName) whitePlayerName.textContent = 'White Player';
            if (blackPlayerName) blackPlayerName.textContent = `Computer (${this.aiDifficulty})`;
            if (whitePlayerIcon) whitePlayerIcon.className = 'fas fa-user';
            if (blackPlayerIcon) blackPlayerIcon.className = 'fas fa-robot';
        } else {
            // Local human vs human
            if (whitePlayerName) whitePlayerName.textContent = 'White Player';
            if (blackPlayerName) blackPlayerName.textContent = 'Black Player';
            if (whitePlayerIcon) whitePlayerIcon.className = 'fas fa-user';
            if (blackPlayerIcon) blackPlayerIcon.className = 'fas fa-user';
        }
    }

    async makeAiMove() {
        if (this.isAiThinking || this.gameState !== 'playing') return;
        
        this.isAiThinking = true;
        this.showAiThinking(true);
        
        await this.delay(500 + Math.random() * 1000);
        
        try {
            const bestMove = this.getBestMove();
            if (bestMove) {
                this.makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
            } else {
                console.log('No valid moves found for AI');
                this.updateGameState();
            }
        } catch (error) {
            console.error('AI move error:', error);
            this.updateGameState();
        }
        
        this.isAiThinking = false;
        this.showAiThinking(false);
    }

    showAiThinking(show) {
        const thinkingElement = document.getElementById('ai-thinking');
        if (thinkingElement) {
            thinkingElement.style.display = show ? 'flex' : 'none';
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getBestMove() {
        const allMoves = this.getAllPossibleMovesForAI(this.aiColor);
        if (allMoves.length === 0) return null;

        switch (this.aiDifficulty) {
            case 'easy':
                return this.getRandomMove(allMoves);
            case 'medium':
                return this.getBestMoveWithEvaluation(allMoves, 2);
            case 'hard':
                return this.getBestMoveWithEvaluation(allMoves, 3);
            default:
                return this.getRandomMove(allMoves);
        }
    }

    getRandomMove(moves) {
        return moves[Math.floor(Math.random() * moves.length)];
    }

    getBestMoveWithEvaluation(moves, depth) {
        if (moves.length === 0) return null;
        
        let bestMove = null;
        let bestEval = this.aiColor === 'white' ? -Infinity : Infinity;

        for (const move of moves) {
            try {
                const evaluation = this.evaluateMove(move, depth);
                
                if (this.aiColor === 'white' && evaluation > bestEval) {
                    bestEval = evaluation;
                    bestMove = move;
                } else if (this.aiColor === 'black' && evaluation < bestEval) {
                    bestEval = evaluation;
                    bestMove = move;
                }
            } catch (error) {
                console.error('Error evaluating move:', move, error);
                continue;
            }
        }

        return bestMove || this.getRandomMove(moves);
    }

    evaluateMove(move, depth) {
        if (depth <= 0) {
            return this.getSimpleEvaluation(move);
        }
        
        return this.getSimpleEvaluation(move);
    }

    getSimpleEvaluation(move) {
        let evaluation = 0;
        
        const capturedPiece = this.board[move.to.row][move.to.col];
        if (capturedPiece) {
            evaluation += this.pieceValues[capturedPiece.type];
        }
        
        const movingPiece = this.board[move.from.row][move.from.col];
        if (movingPiece) {
            const centerBonus = Math.max(0, 3 - Math.max(Math.abs(3.5 - move.to.row), Math.abs(3.5 - move.to.col))) * 5;
            evaluation += centerBonus;
        }
        
        return this.aiColor === 'white' ? evaluation : -evaluation;
    }

    getAllPossibleMovesForAI(color) {
        const moves = [];
        try {
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const piece = this.board[row][col];
                    if (piece && piece.color === color) {
                        try {
                            const validMoves = this.getValidMoves(row, col);
                            validMoves.forEach(([toRow, toCol]) => {
                                moves.push({
                                    from: { row, col },
                                    to: { row: toRow, col: toCol }
                                });
                            });
                        } catch (error) {
                            console.error(`Error getting moves for piece at ${row},${col}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error in getAllPossibleMovesForAI:', error);
        }
        return moves;
    }


}

const game = new ChessGame();
