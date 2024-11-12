const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");  // Importando o axios

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const NUM_QUESTIONS = 10;  // O número de perguntas que você quer fazer

let players = [];
let currentQuestion = 0;
let questions = [];  // Aqui vamos armazenar as perguntas da API

app.use(express.static("public"));

// Função para buscar perguntas da API
async function fetchQuestions() {
    try {
        const response = await axios.get("https://opentdb.com/api.php", {
            params: {
                amount: NUM_QUESTIONS,
                type: "medium",  
                type: "multiple",       
            },
        });
        questions = response.data.results;
       
        console.log(`Carregadas ${questions.length} perguntas.`);
    } catch (error) {
        console.error("Erro ao buscar perguntas da API:", error);
    }
}

// Chama fetchQuestions quando o servidor iniciar
fetchQuestions();

io.on("connection", (socket) => {
    console.log(`Novo jogador conectado: ${socket.id}`);
    
    socket.on("joinGame", (name) => {
        players.push({ id: socket.id, name, points: 0 });
        console.log(`Jogador ${name} entrou no jogo.`);
        
        if (players.length === 2) {
            io.emit("startGame", players.map(p => p.name));
            askQuestion();
        }
    });

    socket.on("answer", (answer) => {
        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        const correctAnswer = questions[currentQuestion]?.correct_answer;
        if (answer.trim().toLowerCase() === correctAnswer.toLowerCase()) {
            player.points += 10;
            socket.emit("feedback", "Correto! +10 pontos");
        } else {
            socket.emit("feedback", `Errado! Resposta correta: ${correctAnswer}`);
        }

        if (players.every(p => p.answered)) {
            players.forEach(p => (p.answered = false));
            currentQuestion++;
            askQuestion();
            // if (currentQuestion < NUM_QUESTIONS) {
            //     askQuestion();
            // } else {
            //     endGame();
            // }
        }
    });

    socket.on("disconnect", () => {
        console.log(`Jogador desconectado: ${socket.id}`);
        players = players.filter(p => p.id !== socket.id);
    });
});

function askQuestion() {
    players.forEach((p) => (p.answered = true));
    const currentQ = questions[currentQuestion];
    io.emit("question", {
        question: currentQ.question,
        options: [...currentQ.incorrect_answers, currentQ.correct_answer].sort(),
    });
    console.log(`Pergunta ${currentQuestion + 1}: ${currentQ.question}`);
}

function endGame() {
    const result = players.map(p => `${p.name}: ${p.points} pontos`);
    io.emit("gameOver", result);
    console.log("Jogo finalizado!");
    players = [];
    currentQuestion = 0;
}

server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));


// function askQuestion() {
//     players.forEach((p) => (p.answered = true));

//     const currentQ = questions[currentQuestion];
//     const questionText = currentQ.question;
//     const options = [...currentQ.incorrect_answers, currentQ.correct_answer].sort();

//     // Enviar a pergunta e as opções para o cliente de forma correta
//     io.emit("question", {
//         question: questionText,
//         options: options,
//     });

//     // Exibe a pergunta e as opções no servidor (para depuração)
//     console.log(`Pergunta ${currentQuestion + 1}: ${questionText}`);
//     console.log(`Opções: ${options.join(", ")}`);
// }
