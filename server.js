// DOMINIO/JS/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: '*',
        methods: ['GET', 'POST']
    } 
});

// Servir arquivos estáticos da pasta DOMINIO
app.use(express.static('.'));

// Configuração do mapa (copiada do seu game.js)
const territoriesConfig = [
    { 
        id: 1, 
        name: "Centro Financeiro", 
        defense: 12, 
        production: { gold: 3, influence: 1 }, 
        connections: [2, 3], 
        position: { x: '50%', y: '40%' },
        size: { width: '120px', height: '100px' }
    },
    { 
        id: 2, 
        name: "Praia do Sol", 
        defense: 10, 
        production: { gold: 2, influence: 2 }, 
        connections: [1, 4], 
        position: { x: '20%', y: '70%' },
        size: { width: '100px', height: '90px' }
    },
    { 
        id: 3, 
        name: "Distrito Industrial", 
        defense: 15, 
        production: { gold: 4, influence: 0 }, 
        connections: [1, 4, 5], 
        position: { x: '80%', y: '50%' },
        size: { width: '110px', height: '95px' }
    },
    { 
        id: 4, 
        name: "Zona Norte", 
        defense: 14, 
        production: { gold: 2, influence: 1 }, 
        connections: [2, 3, 6], 
        position: { x: '50%', y: '80%' },
        size: { width: '130px', height: '110px' }
    },
    { 
        id: 5, 
        name: "Porto Marítimo", 
        defense: 11, 
        production: { gold: 3, influence: 2 }, 
        connections: [3, 6], 
        position: { x: '85%', y: '25%' },
        size: { width: '95px', height: '85px' }
    },
    { 
        id: 6, 
        name: "Centro Histórico", 
        defense: 13, 
        production: { gold: 2, influence: 3 }, 
        connections: [4, 5, 7], 
        position: { x: '65%', y: '70%' },
        size: { width: '105px', height: '95px' }
    },
    { 
        id: 7, 
        name: "Área Verde", 
        defense: 9, 
        production: { gold: 1, influence: 4 }, 
        connections: [6, 8], 
        position: { x: '30%', y: '30%' },
        size: { width: '100px', height: '100px' }
    },
    { 
        id: 8, 
        name: "Periferia", 
        defense: 8, 
        production: { gold: 1, influence: 1 }, 
        connections: [7], 
        position: { x: '10%', y: '20%' },
        size: { width: '90px', height: '80px' }
    }
];

// Facções
const factions = {
    sentinels: {
        name: "Os Sentinela",
        color: "#2E86AB",
        bonus: "+2 Defesa",
        description: "Especialistas em defesa"
    },
    heralds: {
        name: "Os Arautos",
        color: "#A23B72",
        bonus: "Mobilidade +50%",
        description: "Mestres da mobilidade"
    },
    council: {
        name: "O Conselho",
        color: "#F18F01",
        bonus: "+1 carta/turno",
        description: "Manipuladores políticos"
    },
    magnates: {
        name: "Os Magnatas",
        color: "#73AB84",
        bonus: "+30% Ouro",
        description: "Poder econômico"
    }
};

// Cartas disponíveis
const availableCards = [
    {
        id: 1,
        name: "Reforço Surpresa",
        description: "Ganha 3 Pontos de Controle em um território",
        cost: 0,
        type: "reinforcement"
    },
    {
        id: 2,
        name: "Bloqueio de Rota",
        description: "Impede movimentação inimiga por 1 turno",
        cost: 2,
        type: "blockade"
    },
    {
        id: 3,
        name: "Espionagem",
        description: "Revela informações do inimigo",
        cost: 1,
        type: "intel"
    }
];

// Agentes disponíveis
const availableAgents = [
    {
        id: 1,
        name: "Estrategista",
        ability: "+3 força no próximo ataque",
        cost: 3
    },
    {
        id: 2,
        name: "Defensor",
        ability: "Dobra defesa por 1 turno",
        cost: 4
    }
];

// Salas de jogo
const rooms = {};

// Utilitários
function generateRoomId() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Criar estado inicial do jogo
function createInitialGameState(players, factions) {
    const [p1Id, p2Id] = players;
    
    // Embaralhar territórios
    const shuffled = [...territoriesConfig].sort(() => Math.random() - 0.5);
    
    // Distribuir territórios alternadamente (4 cada)
    const territories = shuffled.map((t, index) => ({
        ...t,
        owner: index < 4 ? p1Id : p2Id, // Primeiros 4 para jogador 1, últimos 4 para jogador 2
        pc: 3,
        defenseBonus: 0
    }));

    return {
        turn: 1,
        phase: 'income',
        players: {
            [p1Id]: {
                faction: factions[p1Id] || 'sentinels',
                gold: 10,
                influence: 5,
                territories: territories.filter(t => t.owner === p1Id).map(t => t.id),
                cards: [availableCards[0], availableCards[1]],
                agents: [availableAgents[0]],
                victoryPoints: 0
            },
            [p2Id]: {
                faction: factions[p2Id] || 'heralds',
                gold: 10,
                influence: 5,
                territories: territories.filter(t => t.owner === p2Id).map(t => t.id),
                cards: [availableCards[0], availableCards[1]],
                agents: [availableAgents[0]],
                victoryPoints: 0
            }
        },
        territories: territories,
        gameOver: false,
        winner: null
    };
}

// Processar fase de receita
function processIncome(roomId, playerId) {
    const room = rooms[roomId];
    if (!room) return;
    
    const state = room.gameState;
    const player = state.players[playerId];
    
    let goldIncome = 0;
    let influenceIncome = 0;
    
    player.territories.forEach(terId => {
        const territory = state.territories.find(t => t.id === terId);
        if (territory) {
            goldIncome += territory.production.gold;
            influenceIncome += territory.production.influence;
        }
    });
    
    // Bônus da facção
    if (player.faction === 'magnates') {
        goldIncome = Math.floor(goldIncome * 1.3);
    }
    
    player.gold += goldIncome;
    player.influence += influenceIncome;
    
    // Avançar para fase de reforço
    state.phase = 'reinforce';
    
    io.to(roomId).emit('gameStateUpdate', state);
    io.to(roomId).emit('log', {
        message: `Fase de Receita: +${goldIncome} Ouro, +${influenceIncome} Influência`,
        type: 'player',
        playerId: playerId
    });
}

// Processar reforço
function processReinforce(roomId, playerId, territoryId) {
    const room = rooms[roomId];
    if (!room) return { success: false, message: 'Sala não encontrada' };
    
    const state = room.gameState;
    const player = state.players[playerId];
    const territory = state.territories.find(t => t.id === territoryId);
    
    // Validações
    if (state.phase !== 'reinforce') {
        return { success: false, message: 'Não está na fase de reforço' };
    }
    
    if (territory.owner !== playerId) {
        return { success: false, message: 'Este território não é seu' };
    }
    
    if (player.gold < 1) {
        return { success: false, message: 'Ouro insuficiente' };
    }
    
    // Processar reforço
    territory.pc += 1;
    player.gold -= 1;
    
    io.to(roomId).emit('gameStateUpdate', state);
    io.to(roomId).emit('log', {
        message: `Reforçou ${territory.name}: +1 PC`,
        type: 'player',
        playerId: playerId
    });
    
    return { success: true };
}

// Processar ataque
function processAttack(roomId, attackerId, attackerTerId, defenderTerId) {
    const room = rooms[roomId];
    if (!room) return { success: false, message: 'Sala não encontrada' };
    
    const state = room.gameState;
    const attacker = state.players[attackerId];
    const defenderId = Object.keys(state.players).find(id => id !== attackerId);
    const defender = state.players[defenderId];
    
    const attTer = state.territories.find(t => t.id === attackerTerId);
    const defTer = state.territories.find(t => t.id === defenderTerId);
    
    // Validações
    if (state.phase !== 'action') {
        return { success: false, message: 'Não está na fase de ação' };
    }
    
    if (!attTer || !defTer) {
        return { success: false, message: 'Território não encontrado' };
    }
    
    if (attTer.owner !== attackerId) {
        return { success: false, message: 'Você não controla este território' };
    }
    
    if (defTer.owner !== defenderId) {
        return { success: false, message: 'Este território não pertence ao oponente' };
    }
    
    if (!attTer.connections.includes(defTer.id)) {
        return { success: false, message: 'Territórios não são adjacentes' };
    }
    
    // Processar combate (RNG no servidor)
    const attackRoll = Math.floor(Math.random() * 3) + 1;
    const attackPower = attTer.pc * attackRoll;
    const defensePower = defTer.defense + defTer.pc * 2;
    
    let result;
    
    if (attackPower > defensePower) {
        // Vitória
        defTer.owner = attackerId;
        defTer.pc = Math.floor(attTer.pc / 2);
        attTer.pc = Math.floor(attTer.pc / 2);
        
        // Atualizar listas de territórios
        attacker.territories.push(defTer.id);
        defender.territories = defender.territories.filter(id => id !== defTer.id);
        
        result = {
            success: true,
            victory: true,
            message: `VITÓRIA! Conquistou ${defTer.name}`,
            attackerTerId: attackerTerId,
            defenderTerId: defenderTerId
        };
        
    } else {
        // Derrota
        attTer.pc = Math.floor(attTer.pc / 3);
        
        result = {
            success: true,
            victory: false,
            message: `DERROTA! Não conseguiu conquistar ${defTer.name}`,
            attackerTerId: attackerTerId,
            defenderTerId: defenderTerId
        };
    }
    
    // Verificar vitória/derrota
    if (attacker.territories.length === state.territories.length) {
        state.gameOver = true;
        state.winner = attackerId;
        io.to(roomId).emit('gameOver', { winner: attackerId });
    } else if (defender.territories.length === 0) {
        state.gameOver = true;
        state.winner = attackerId;
        io.to(roomId).emit('gameOver', { winner: attackerId });
    }
    
    io.to(roomId).emit('gameStateUpdate', state);
    io.to(roomId).emit('log', {
        message: result.message,
        type: result.victory ? 'player' : 'system',
        playerId: attackerId
    });
    
    return result;
}

// Avançar para próxima fase
function nextPhase(roomId, playerId) {
    const room = rooms[roomId];
    if (!room) return;
    
    const state = room.gameState;
    
    if (state.phase === 'income') {
        processIncome(roomId, playerId);
    } else if (state.phase === 'reinforce') {
        state.phase = 'action';
        io.to(roomId).emit('gameStateUpdate', state);
        io.to(roomId).emit('log', {
            message: 'Fase de Ação - Ataque territórios inimigos',
            type: 'system'
        });
    }
}

// Finalizar turno
function endTurn(roomId, playerId) {
    const room = rooms[roomId];
    if (!room) return;
    
    const state = room.gameState;
    
    if (state.phase !== 'action') {
        return;
    }
    
    // Trocar jogador
    room.currentPlayerIndex = room.currentPlayerIndex === 0 ? 1 : 0;
    
    // Incrementar turno global quando voltar para o primeiro jogador
    if (room.currentPlayerIndex === 0) {
        state.turn++;
    }
    
    state.phase = 'income';
    
    io.to(roomId).emit('gameStateUpdate', state);
    io.to(roomId).emit('log', {
        message: `Turno do jogador ${room.currentPlayerIndex + 1}`,
        type: 'system'
    });
}

// Socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    // Entrar no jogo (matchmaking automático) - CORRIGIDO
    socket.on('joinGame', ({ faction }, callback) => {
        console.log(`Jogador ${socket.id} tentando entrar com facção ${faction}`);
        
        // Procurar sala aguardando
        let roomId = Object.keys(rooms).find(id => rooms[id].players.length === 1 && !rooms[id].gameState);
        
        if (!roomId) {
            // Criar nova sala
            roomId = generateRoomId();
            rooms[roomId] = {
                players: [socket.id],
                factions: { [socket.id]: faction },
                gameState: null,
                currentPlayerIndex: 0
            };
            socket.join(roomId);
            console.log(`Nova sala criada: ${roomId}`);
            callback({ roomId, status: 'waiting' });
        } else {
            // Entrar em sala existente
            const room = rooms[roomId];
            room.players.push(socket.id);
            room.factions[socket.id] = faction;
            socket.join(roomId);
            
            // Criar estado do jogo
            room.gameState = createInitialGameState(room.players, room.factions);
            
            console.log(`Jogador entrou na sala ${roomId}. Jogo iniciado!`);
            
            // Notificar o jogador que entrou
            callback({ roomId, status: 'start' });
            
            // NOTIFICAR O JOGADOR QUE CRIOU A SALA
            const firstPlayerId = room.players[0];
            io.to(firstPlayerId).emit('gameStart', {
                roomId: roomId,
                message: 'Um oponente entrou! O jogo vai começar!'
            });
            
            // Notificar ambos com o estado do jogo
            io.to(roomId).emit('gameStateUpdate', room.gameState);
            io.to(roomId).emit('log', {
                message: 'Jogo iniciado! Boa sorte!',
                type: 'system'
            });
        }
    });
    
    // Entrar em sala específica com código - CORRIGIDO
    socket.on('joinRoomWithCode', ({ roomCode, faction }) => {
        console.log(`Jogador ${socket.id} tentando entrar na sala ${roomCode}`);
        
        // Verificar se a sala existe
        const room = rooms[roomCode];
        
        if (!room) {
            socket.emit('roomJoinResponse', { 
                success: false, 
                message: 'Sala não encontrada!' 
            });
            return;
        }
        
        if (room.players.length >= 2) {
            socket.emit('roomJoinResponse', { 
                success: false, 
                message: 'Sala já está cheia!' 
            });
            return;
        }
        
        if (room.gameState) {
            socket.emit('roomJoinResponse', { 
                success: false, 
                message: 'Jogo já iniciou!' 
            });
            return;
        }
        
        // Entrar na sala
        room.players.push(socket.id);
        room.factions[socket.id] = faction;
        socket.join(roomCode);
        
        // Criar estado do jogo
        room.gameState = createInitialGameState(room.players, room.factions);
        
        console.log(`Jogador entrou na sala ${roomCode}. Jogo iniciado!`);
        
        // NOTIFICAR O JOGADOR QUE ENTROU
        socket.emit('roomJoinResponse', { 
            success: true, 
            roomId: roomCode,
            status: 'start' 
        });
        
        // NOTIFICAR O JOGADOR QUE CRIOU A SALA
        const firstPlayerId = room.players[0];
        io.to(firstPlayerId).emit('gameStart', {
            roomId: roomCode,
            message: 'Um oponente entrou! O jogo vai começar!'
        });
        
        // Notificar TODOS na sala com o estado do jogo
        io.to(roomCode).emit('gameStateUpdate', room.gameState);
        io.to(roomCode).emit('log', {
            message: 'Jogo iniciado! Boa sorte!',
            type: 'system'
        });
    });
    
    // Sair da sala
    socket.on('leaveRoom', (roomId) => {
        const room = rooms[roomId];
        if (room) {
            const index = room.players.indexOf(socket.id);
            if (index !== -1) {
                room.players.splice(index, 1);
                if (room.players.length === 0) {
                    delete rooms[roomId];
                }
            }
        }
        socket.leave(roomId);
    });
    
    // Ações do jogo
    socket.on('gameAction', ({ type, data }) => {
        // Encontrar sala do jogador
        const roomEntry = Object.entries(rooms).find(([_, room]) => 
            room.players.includes(socket.id)
        );
        
        if (!roomEntry) {
            socket.emit('error', 'Você não está em uma sala');
            return;
        }
        
        const [roomId, room] = roomEntry;
        
        if (room.gameState.gameOver) {
            socket.emit('error', 'O jogo já acabou');
            return;
        }
        
        // Verificar se é o turno do jogador
        const currentPlayerId = room.players[room.currentPlayerIndex];
        if (socket.id !== currentPlayerId) {
            socket.emit('error', 'Não é seu turno');
            return;
        }
        
        // Processar ação
        let result;
        switch (type) {
            case 'reinforce':
                result = processReinforce(roomId, socket.id, data.territoryId);
                if (!result.success) {
                    socket.emit('error', result.message);
                }
                break;
                
            case 'attack':
                result = processAttack(roomId, socket.id, data.attackerId, data.defenderId);
                if (!result.success) {
                    socket.emit('error', result.message);
                }
                break;
                
            case 'nextPhase':
                nextPhase(roomId, socket.id);
                break;
                
            case 'endTurn':
                endTurn(roomId, socket.id);
                break;
                
            default:
                socket.emit('error', 'Ação desconhecida');
        }
    });
    
    // Desconexão
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        
        // Remover jogador das salas
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const index = room.players.indexOf(socket.id);
            
            if (index !== -1) {
                room.players.splice(index, 1);
                
                if (room.players.length === 0) {
                    delete rooms[roomId];
                } else {
                    io.to(roomId).emit('opponentLeft');
                }
                break;
            }
        }
    });
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📱 Acesse o jogo em http://localhost:${PORT}/game.html`);
});