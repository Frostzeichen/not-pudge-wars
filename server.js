// PACKAGES
const express = require("express");

// VARIABLES
const app = express();
const PORT = 5173;

// Simulates class-based functions in export.
let players = {}; // TODO: Include into class.
const custom = { // Is simulated output.
    createPlayer: (name, socket) => {
        // TODO: Should be a function to edit players.
        players[socket] = { // TODO: Change to this.players.
            name: name,
            id: socket,
            stats: {
                attack: 20,
                hp: 100,
                move: 10,
            },
            position: {
                x: 0,
                y: 0
            },
            afflictions: {
                stunned: false,
                hook_immobile: false,
            }
        }
    },

    // REFACTOR: Too many if-else statements. Might slow down the game.
    // BUG: Values sometimes dip to -10.
    movePlayer: (id, x, y) => {
        if (players[id].position.x + x > 0) {
            players[id].position.x += x;
        } else {
            players[id].position.x = 0;
        }

        if (players[id].position.y + y > 0) {
            players[id].position.y += y;
        } else {
            players[id].position.y = 0;
        }

        if (players[id].position.x + x < 180) {
            players[id].position.x += x;
        } else {
            players[id].position.x = 180;
        }

        if (players[id].position.y + y < 190) {
            players[id].position.y += y;
        } else {
            players[id].position.y = 180;
        }
    }
}

// MIDDLEWARES
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

// ROUTES
app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/styles.css", (req, res) => {
    res.sendFile("styles.css");
});

// SERVER
const server = app.listen(PORT, () => {
    console.log(`Listening! @ port ${PORT}`);
});

// SOCKET
const io = require("socket.io")(server);

// TODO: Add support for sessions.
io.on("connection", (socket) => {
    socket.emit("manager", {
        type: "new",
        value: socket.id
    });

    socket.on("action", (data) => {
        if (data.type == "new") {
            custom.createPlayer(data.value.name, socket.id);
            socket.emit("manager", {
                type: "new player emit",
                value: players
            })
            socket.broadcast.emit("manager", {
                source: socket.id,
                type: "new player broadcast",
                value: players[socket.id]
            })
        }

        else if (data.type == "move") {
            if (
                !players[socket.id].afflictions.hook_immobile &&
                !players[socket.id].afflictions.stunned
            ) {
                custom.movePlayer(socket.id, data.value.x, data.value.y);
            }
            socket.emit("manager", {
                type: "player move",
                source: socket.id,
                value: players[socket.id].position
            })
            socket.broadcast.emit("manager", {
                type: "player move",
                source: socket.id,
                value: players[socket.id].position
            })
        }

        else if (data.type == "skill") {
            if (data.value.name == "hook") {
                players[socket.id].afflictions.hook_immobile = !players[socket.id].afflictions.hook_immobile;
                console.log(players[socket.id].afflictions.hook_immobile)
            }

            else if (data.value.name == "hook mouse") {
                if (players[socket.id].afflictions.hook_immobile) {
                    console.log(data.value.mouse.x - 50, data.value.mouse.x + 50)
                    console.log(data.value.mouse.y - 50, data.value.mouse.y + 50)

                    for (let player in players) {
                        if (
                            players[player].position.x > data.value.mouse.x - 50 &&
                            players[player].position.x < data.value.mouse.x + 50 &&
                            players[player].position.y > data.value.mouse.y - 50 &&
                            players[player].position.y < data.value.mouse.y + 50
                        ) {
                            players[player].stats.hp -= players[socket.id].stats.attack;
                            if (players[player].stats.hp < 0) {
                                socket.emit("manager", {
                                    source: socket.id,
                                    type: "player kill",
                                    value: {
                                        id: player
                                    }
                                });
                                socket.broadcast.emit("manager", {
                                    source: socket.id,
                                    type: "player kill",
                                    value: {
                                        id: player // id:player is killed by source:socket.id.
                                    }
                                });
                                delete players[player]; // Got this from: https://medium.com/knowledge-pills/how-do-i-remove-a-property-from-a-json-object-fd7ec14d37bd
                                console.log(players)
                            }
                        }
                    }

                    socket.emit("manager", {
                        source: socket.id,
                        type: "hook fire animation self own",
                        value: {
                            position: {
                                x: data.value.mouse.x,
                                y: data.value.mouse.y
                            }
                        }
                    });

                    socket.broadcast.emit("manager", {
                        source: socket.id,
                        type: "hook fire animation other own",
                        value: {
                            position: {
                                x: data.value.mouse.x,
                                y: data.value.mouse.y
                            }
                        }
                    });
                }
                if (players[socket.id]) {
                    players[socket.id].afflictions.hook_immobile = false;
                }
            }
        }
    });
})