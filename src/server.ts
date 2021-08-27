import path from "path";
import express, { Express } from "express";
import WebSocket from "ws";

const players: any = { };

const app: Express = express();
app.use("/", express.static(path.join(__dirname, "../../client/dist")));
app.listen(80, () => {
    console.log("JongWars Express server ready");
});

const wsServer = new WebSocket.Server({ port : 8080 }, function() {
    console.log("JongWars WebSocket server ready");
});
wsServer.on("connection", (socket: WebSocket) => {
    socket.on("message", (inMsg: string) => {
        const msgParts: string[] = inMsg.toString().split("_");
        const message: string = msgParts[0];
        const pid: string = msgParts[1];
        players[pid] = { score : 0, stillPlaying : true }
        switch (message) {
            /** Message when matching tiles. Form: "match_<pid>_<score>". **/
            case "match":
                players[pid].score += parseInt(msgParts[2]);
                wsServer.clients.forEach(
                    function each(inClient: WebSocket) {
                        inClient.send(`update_${pid}_${players[pid].score}`);
                    }
                );
            break;

            /** When either player clears board, or board no longer has valid moves.
             * Message form: "done_<pid>". **/
            case "done":
                players[pid].stillPlaying = false;
                let playersDone: number = 0;
                for (const player in players) {
                    if (players.hasOwnProperty(player)) {
                        if (!players[player].stillPlaying) {
                            playersDone++;
                        }
                    }
                }
                if (playersDone === 2) {
                    let winningPID: string;
                    const pids: string[] = Object.keys(players);
                    if (players[pids[0]].score > players[pids[1]].score) {
                        winningPID = pids[0];
                    } else {
                        winningPID = pids[1];
                    }
                    wsServer.clients.forEach(
                        function each(inClient: WebSocket) {
                            inClient.send(`gameOver_${winningPID}`);
                        }
                    );
                }
            break;
        } /* End switch.  */
    }); /* End message handler. */

    const pid : string = `pid${new Date().getTime()}`;

    players[pid] = { score : 0, stillPlaying : true };

    /* Inform user of the PID, with a "connected_<pid>" message, done as follows */
    socket.send(`connected_${pid}`);

    /* Transition state on clients if two players are present.
    * A "start_<layout>" message needs to be broadcast-ed. Both players receive a shuffled layout. */
    if (Object.keys(players).length === 2) {
        // shuffle tiles in layout so that layout can be sent to both clients.
        const shuffledLayout: number[][][] = shuffle();
        wsServer.clients.forEach(
            function each(inClient: WebSocket) {
                inClient.send(
                    `start_${JSON.stringify(shuffledLayout)}`
                );
            }
        );
    }
}); /* End of WebSocket Implementation */


// ---------------------------------------- Game Code ------------------------------------

/* Layout of the board */

// 0 = no tile, 1 = tile
// Each layer is 15x9 (135 per layer, 675 total). Tiles are 36 x 44.
// When board is shuffled, all 1's become 101-142 (matching the 42 type filenames).
// Tile 101 is wildcard.

const layout : number[][][] = [
    /* Layer: 1 */
    [
        [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ],
        [ 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ],
        [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ],
        [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ],
        [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
        [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ],
        [ 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0 ],
        [ 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0 ],
        [ 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0 ],
    ],
    /* Layer: 2 */
    [
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    ],
    /* Layer: 3 */
    [
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    ],
    /* Layer: 4 */
    [
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    ],
    /* Layer: 5 */
    [
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
        [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
    ],
]; /* End of layout */

/**
 * Shuffles tiles in layout. Randomizes tile placement.
 * Takes underlying layout and change all 1's to other values corresponding to tile type.
 * Uses "American Style", meaning not every shuffle is winnable. Can lead to unsolvable arrangement.
 *
 * @return a shuffled layout
 */
function shuffle(): number[][][] {

    // clone layout array.
    const cl : number[][][] = layout.slice(0);

    // Initialize count for wildcards. Note that there may not be more
    // than 4 wildcards.
    let numWildCards: number = 0;

    // Iterate over entire board. Every time a '1' is encountered, a random tile
    // is to be selected.
    const numTileTypes: number = 42;
    for (let l: number = 0; l < cl.length; l++) {
        const layer : number[][] = cl[1];
        for (let r: number = 0; r < layer.length; r++) {
            const row: number[] = layer[r];
            for (let c: number = 0; c < row.length; c++) {
                const tileVal: number = row[c];
                // tileVal > 0 indicates that there is supposed to be a tile in this position
                if(tileVal === 1) {
                    row[c] = (Math.floor(Math.random() * numTileTypes)) + 101;
                    // If this is a wildcard and no more is allowed, bump to next tile type. Else, increase
                    // wildcard count by 1.
                    if (row[c] === 101 && numWildCards === 3) {
                        row[c] = 102;
                    } else {
                        numWildCards += numWildCards;
                    }
                }
            }
        }
    }
    return cl;
} /* End shuffle implementation */


