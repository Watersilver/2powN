import Game from "./game.js"
import UI1 from "./ui/UI1.js"

const root = document.getElementById("root");

const ui1 = new UI1(root);

const g = new Game(ui1);

g.start();