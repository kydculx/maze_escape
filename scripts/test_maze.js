
import { MazeGenerator } from '../src/maps/MazeGenerator.js';

console.log("=== Testing Maze Generator (Size: 15x15) ===");
const mazeGen = new MazeGenerator(15, 15);
mazeGen.applyShapeMask('RECTANGLE');
mazeGen.generateData();

console.log(`Grid Size: ${mazeGen.width}x${mazeGen.height}`);
console.log("Entrance:", mazeGen.entrance);
console.log("Exit:", mazeGen.exit);

console.log("\n[Maze Visual]");
let gridStr = "";
for (let y = 0; y < mazeGen.height; y++) {
    for (let x = 0; x < mazeGen.width; x++) {
        if (x === mazeGen.entrance.x && y === mazeGen.entrance.y) {
            gridStr += "S "; // Start
        } else if (x === mazeGen.exit.x && y === mazeGen.exit.y) {
            gridStr += "E "; // End
        } else if (mazeGen.grid[y][x] === 1) {
            gridStr += "##"; // Wall
        } else {
            gridStr += "  "; // Path
        }
    }
    gridStr += "\n";
}
console.log(gridStr);

if (mazeGen.entrance.x === 0 && mazeGen.entrance.y === 1 && mazeGen.grid[1][1] === 0) {
    console.log("SUCCESS: Entrance is valid and connected.");
} else if (mazeGen.entrance && mazeGen.grid[mazeGen.entrance.y][mazeGen.entrance.x] === 0) {
    console.log("SUCCESS: Entrance exists at", mazeGen.entrance);
} else {
    console.error("FAILURE: Entrance is blocked or missing!");
}
