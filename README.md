# Chess Game with Online Multiplayer

A modern, interactive chess game with support for online multiplayer gameplay, AI opponents, and local human vs human matches.

## Features

- **Online Multiplayer**: Play against friends over the internet
- **AI Opponents**: Play against computer with adjustable difficulty levels
- **Local Multiplayer**: Play with a friend on the same device
- **Move History**: Track all moves with algebraic notation
- **Visual Highlights**: See valid moves, last moves, and check states
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Setup and Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```
   
   The server will start on port 3000 by default.

3. **Open in Browser**:
   Navigate to `http://localhost:3000` in your web browser.

## How to Play Online Multiplayer

### Creating a Room
1. Select "Online Multiplayer" from the game mode dropdown
2. Enter your name (optional)
3. Click "Create Room"
4. Share the generated Room ID with your opponent

### Joining a Room
1. Select "Online Multiplayer" from the game mode dropdown
2. Enter your name (optional)
3. Enter the Room ID provided by your opponent
4. Click "Join Room"

### Gameplay
- Once both players are connected, the game will begin automatically
- The player assigned White moves first
- Take turns making moves by clicking on pieces and their destination squares
- The game will automatically sync moves between both players
- Turn indicators show whose turn it is

## Game Modes

### Online Multiplayer
- Real-time gameplay over the internet
- Room-based matchmaking system
- Automatic move synchronization
- Connection status indicators

### Human vs Computer
- Play against AI with three difficulty levels:
  - **Easy**: Random moves with basic piece values
  - **Medium**: Strategic evaluation with 2-ply depth
  - **Hard**: Advanced evaluation with 3-ply depth

### Human vs Human (Local)
- Play with a friend on the same device
- Take turns making moves
- Perfect for quick local games

## Controls

- **Click**: Select pieces and make moves
- **Escape**: Deselect current piece
- **New Game**: Start a fresh game
- **Undo**: Take back the last move (not available in online games)
- **Flip Board**: Rotate the board view

## Technical Details

### Server Architecture
- Node.js with WebSocket support
- Real-time communication using `ws` library
- Room-based game management
- Automatic cleanup of empty rooms

### Client Features
- Responsive web interface
- Real-time move validation
- Check/checkmate/stalemate detection
- Move history with algebraic notation
- Visual feedback for game states

## Deployment

### Local Development
```bash
npm run dev
```

### Production
For production deployment, ensure:
1. WebSocket support is enabled
2. The server can handle persistent connections
3. Proper firewall configuration for the chosen port

### Hosting Platforms
- **Heroku**: Supports WebSockets
- **DigitalOcean**: Full server control
- **AWS EC2**: Complete flexibility
- **Railway**: Easy deployment with WebSocket support

*Note*: Vercel and similar serverless platforms don't support persistent WebSocket connections needed for real-time gameplay.

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting

### Connection Issues
- Ensure the server is running
- Check firewall settings
- Verify WebSocket support in your browser

### Game Synchronization
- Refresh the page if moves aren't syncing
- Check the connection status indicator
- Ensure both players are in the same room

### Performance
- Close unnecessary browser tabs
- Ensure stable internet connection
- Use modern browsers for best performance

## Contributing

Feel free to contribute to this project by:
- Reporting bugs
- Suggesting new features  
- Submitting pull requests
- Improving documentation

## License

This project is licensed under the MIT License.
