//to increase difficulty adjust the blocks per tetromino, movement lag, score increment

var Game = {};

var blocksPerTetromino = 1;
var nbBlockTypes = 7; 
var blockSize = 32;
var numBlocksY = 19; 
var numBlocksX = 19; 

var gameWidth = numBlocksX*blockSize; 
var menuWidth = 300;

var movementLag = 100; 

var scoreX = gameWidth+90; 

var nbNext = 1; 
var blockValue = 1; 
var occupiedValue = 2; 

var score = 0; 
var scoreIncrement = 50; 
var completedLines = 0;
var linesThreshold = 3; 
var speedUp = 100; 
var scorePlus = 25; 
var timeOut = Phaser.Timer.SECOND; 

var queue = []; 
var pauseState = false;
var gameOverState = false;



var offsets = {
    0 : [[0,-1],[0,0],[0,1],[1,1]], // L
    1 : [[0,-1],[0,0],[0,1],[-1,1]], // J
    2 : [[-1,0],[0,0],[1,0],[2,0]], // I
    3 : [[-1,-1],[0,-1],[0,0],[-1,0]], // 0
    4 : [[-1,0],[0,0],[0,-1],[1,-1]],// S
    5 : [[-1,0],[0,0],[1,0],[0,1]], // T
    6 : [[-1,-1],[0,-1],[0,0],[1,0]] // Z
};


var y_start = {
    0 : 1,
    1 : 1,
    2 : 0,
    3 : 1,
    4 : 1,
    5 : 0,
    6 : 1
};

var move_offsets = {
    "left" : [-1,0],
    "down" : [0,1],
    "right" : [1,0]
};


var tetromino, cursors, rotates, pause, pauseText, scoreTitle, scoreText, linesText, scene, sceneSprites, timer, loop,  shade;
var currentMovementTimer = 0; 


function Tetromino(){
    this.shape = Math.floor(Math.random() * nbBlockTypes);
    this.color = Math.floor(Math.random() * nbBlockTypes);
    this.sprites = []; 
    this.cells = []; 
    this.center = [0,0];
    
    this.materialize = function(c_x,c_y,inGame) {
        this.center = [c_x,c_y];
        this.cells = [];
        
        for(var j = 0; j < this.sprites.length; j++){
            this.sprites[j].destroy();
        }
        this.sprites = [];
        var conflict = false;
        for(var i = 0; i < blocksPerTetromino; i++) {
            
            var x = c_x + offsets[this.shape][i][0];
            var y = c_y + offsets[this.shape][i][1];
            var sprite = game.add.sprite(x * blockSize, y * blockSize, 'blocks', this.color);
            this.sprites.push(sprite);
            this.cells.push([x, y]);
            if (inGame) {
                if(!validateCoordinates(x,y)){
                    conflict = true;
                }
                scene[x][y] = blockValue; 
            }
        }
        return conflict;
    };
}

Game.radio = { 
    soundOn : true,
    moveSound : null,
    gameOverSound : null,
    winSound : null,
    music : null,
    
    playMusic : function(){
        if(Game.radio.soundOn && !pauseState){
            Game.radio.music.resume();
        }
    },
    
    manageSound : function(sprite){
        sprite.frame = 1- sprite.frame;
        Game.radio.soundOn = !Game.radio.soundOn;
        if(Game.radio.soundOn){
            Game.radio.playMusic();
        }else{
            Game.radio.music.pause();
        }
    },
    
    playSound : function(sound) {
        if (Game.radio.soundOn && !pauseState) {
            sound.play();
        }
    }
};

Game.preload = function() {
    game.load.spritesheet('blocks','assets/blocks.png',blockSize,blockSize,nbBlockTypes+1);
    game.load.spritesheet('sound','assets/sound.png',32,32); 
    game.load.audio('move','assets/sound/move.mp3','assets/sound/move.ogg');
    game.load.audio('win','assets/sound/win.mp3','assets/sound/win.ogg');
    game.load.audio('gameover','assets/sound/gameover.mp3','assets/sound/gameover.ogg');
};

Game.create = function(){
    
    
    scene = [];
    sceneSprites = []; 
    
    for(var i = 0; i < numBlocksX; i++){
        var col = [];
        var spriteCol = [];
        for(var j = 0; j < numBlocksY; j++) {
            col.push(0);
            spriteCol.push(null);
        }
        scene.push(col);
        sceneSprites.push(spriteCol);
    }

    pauseState = false;
    gameOverState = false;

    
    var middleSeparator = game.add.graphics(gameWidth, 0);
    middleSeparator.lineStyle(3, 0xffffff, 1);
    middleSeparator.lineTo(0,game.world.height);
    placeSeparators();

    game.add.tileSprite(0,game.world.height-blockSize,gameWidth,blockSize,'blocks',0); // ground
    
    var sound = game.add.sprite(game.world.width-38, 0, 'sound', 0);
    sound.inputEnabled = true;
    sound.events.onInputDown.add(Game.radio.manageSound, this);

    
    scoreTitle = game.add.bitmapText(gameWidth+50, 0, 'desyrel', 'Score',64);
    scoreText = game.add.bitmapText(scoreX, 60, 'desyrel', '0', 64);
    var linesTitle = game.add.bitmapText(gameWidth+50, 140, 'desyrel', 'Lines',64);
    linesText = game.add.bitmapText(scoreX, 200, 'desyrel', '0', 64);
    var nextTitle = game.add.bitmapText(gameWidth+75, 300, 'desyrel', 'Next',64);
    alignText();
    nextTitle.x = scoreTitle.x + scoreTitle.textWidth/2 - (nextTitle.textWidth * 0.5);
    linesTitle.x = scoreTitle.x + scoreTitle.textWidth/2 - (linesTitle.textWidth * 0.5);

    
    manageTetrominos();

    
    
    game.input.keyboard.enabled = true;
    
    cursors = {
        right : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("moveright").value]),
        left : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("moveleft").value]),
        down : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("movedown").value])
    };
    
    rotates = {
        counterClockwise : game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("rotateright").value]),
        clockwise: game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("rotateleft").value])
    };
    pause = game.input.keyboard.addKey(Phaser.Keyboard[document.getElementById("pause").value]);

    
    timer = game.time.events;
    loop = timer.loop(timeOut, fall, this);
    timer.start();

    
    Game.radio.moveSound = game.add.audio('move');
    Game.radio.winSound = game.add.audio('win');
    Game.radio.gameOverSound = game.add.audio('gameover');
    Game.radio.music = game.add.audio('music');
    Game.radio.music.volume = 0.2;
    Game.radio.music.loopFull();
};


function updateScore(){
    score += scoreIncrement;
    completedLines++;
    scoreText.text = score;
    linesText.text = completedLines;
    alignText();
    updateTimer();
}

function updateTimer(){
    if(completedLines%linesThreshold == 0){
        loop.delay -= speedUp; 
        scoreIncrement += scorePlus; 
    }
}

function alignText(){
    var center = scoreTitle.x + scoreTitle.textWidth/2;
    scoreText.x = center - (scoreText.textWidth * 0.5);
    linesText.x = center - (linesText.textWidth * 0.5);
}

function manageTetrominos(){
    
    while(queue.length < nbNext+1) {
        queue.unshift(new Tetromino()); 
    }
    tetromino = queue.pop(); 
    var start_x = Math.floor(numBlocksX/2);
    var start_y = y_start[tetromino.shape];
    var conflict = tetromino.materialize(start_x,start_y,true);
    if(conflict){
        gameOver();
    }else{
        
        for (var i = 0; i < queue.length; i++) {
            var s_x = Math.floor((scoreTitle.x + scoreTitle.textWidth / 2) / 32);
            var s_y = 14;
            queue[i].materialize(s_x, s_y, false);
        }
    }
}

// Send the score to the database
function sendScore(){
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "server.php", true);
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xhr.onload = function(){};
    
    var data = "add=1&name="+document.getElementById('playername').value+"&score="+score;
    xhr.send(data);
}


function slide(block,dir){
    var new_x = tetromino.cells[block][0] + move_offsets[dir][0];
    var new_y = tetromino.cells[block][1] + move_offsets[dir][1];
    return [new_x,new_y];
}


function slideCenter(dir){
    var new_center_x = tetromino.center[0] + move_offsets[dir][0];
    var new_center_y = tetromino.center[1] + move_offsets[dir][1];
    return [new_center_x,new_center_y];
}


function rotate(block,dir){
    var c_x = tetromino.center[0];
    var c_y = tetromino.center[1];
    var offset_x = tetromino.cells[block][0] - c_x;
    var offset_y = tetromino.cells[block][1] - c_y;
    offset_y = -offset_y; 
    var new_offset_x = ((dir == "clockwise")) ? offset_y : -offset_y;
    var new_offset_y = ((dir == "clockwise")) ? -offset_x : offset_x;
    new_offset_y = -new_offset_y;
    var new_x = c_x + new_offset_x;
    var new_y = c_y + new_offset_y;
    return [new_x,new_y];
}


function canMove(coordinatesCallback,dir){
    if(pauseState){
        return false;
    }
    for(var i = 0; i < tetromino.cells.length; i++){
        var new_coord = coordinatesCallback(i,dir); 
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        if(!validateCoordinates(new_x,new_y)){
            return false;
        }
    }
    return true;
}

function validateCoordinates(new_x,new_y){
    if(new_x < 0 || new_x > numBlocksX-1){
        
        return false;
    }
    if(new_y < 0 || new_y > numBlocksY-1){
        
        return false;
    }
    if(scene[new_x][new_y] == occupiedValue){
        
        return false;
    }
    return true;
}


function move(coordinatesCallback,centerCallback,dir,soundOnMove){
    for(var i = 0; i < tetromino.cells.length; i++){
        var old_x = tetromino.cells[i][0];
        var old_y = tetromino.cells[i][1];
        var new_coord = coordinatesCallback(i,dir);
        var new_x = new_coord[0];
        var new_y = new_coord[1];
        tetromino.cells[i][0] = new_x;
        tetromino.cells[i][1] = new_y;
        tetromino.sprites[i].x = new_x*blockSize;
        tetromino.sprites[i].y = new_y*blockSize;
        scene[old_x][old_y] = 0;
        scene[new_x][new_y] = blockValue;
    }
    if(centerCallback) {
        var center_coord = centerCallback(dir);
        tetromino.center = [center_coord[0],center_coord[1]];
    }
    if(soundOnMove) {
        Game.radio.playSound(Game.radio.moveSound);
    }
}

function lineSum(l){
    var sum = 0;
    for(var k = 0; k < numBlocksX; k++){
        sum += scene[k][l];
    }
    return sum
}


function checkLines(lines) {
    var collapsedLines = [];
    for(var j = 0; j < lines.length; j++){
        var sum = lineSum(lines[j]);
        // A line is completed if all the cells of that line are marked as occupied
        if(sum == (numBlocksX*occupiedValue)) { // the line is full
            updateScore();
            collapsedLines.push(lines[j]);
            Game.radio.playSound(Game.radio.winSound);
            cleanLine(lines[j]);
        }
    }
    if(collapsedLines.length){
        collapse(collapsedLines);
    }
}


function cleanLine(line){
    var delay = 0;
    for (var k = 0; k < numBlocksX; k++) {
        
        var tween = game.add.tween(sceneSprites[k][line]);
        tween.to({ y: 0}, 500,null,false,delay);
        tween.onComplete.add(destroy, this);
        tween.start();
        sceneSprites[k][line] = null;
        scene[k][line] = 0;
        delay += 50; 
    }
}

function destroy(sprite){
    sprite.destroy();
}



function collapse(lines){
    
    var min = 999;
    for(var k = 0; k < lines.length; k++){
        if(lines[k] < min){
            min = lines[k];
        }
    }
    
    for(var i = min-1; i >= 0; i--){
        for(var j = 0; j < numBlocksX; j++){
            if(sceneSprites[j][i]) {
                
                sceneSprites[j][i+ lines.length] = sceneSprites[j][i];
                sceneSprites[j][i] = null;
                scene[j][i + lines.length] = occupiedValue;
                scene[j][i] = 0;
                
                var tween = game.add.tween(sceneSprites[j][i+ lines.length]);
                var new_y = sceneSprites[j][i+ lines.length].y + (lines.length * blockSize);
                tween.to({ y: new_y}, 500,null,false);
                tween.start();
            }
        }
    }
}


function fall(){
    if(pauseState || gameOverState){return;}
    if(canMove(slide,"down")){
        move(slide,slideCenter,"down",0);
    }else{ 
       
        var lines = [];
        for(var i = 0; i < tetromino.cells.length; i++){
            
            
            if(lines.indexOf(tetromino.cells[i][1]) == -1) { 
                lines.push(tetromino.cells[i][1]);
            }
            var x = tetromino.cells[i][0];
            var y = tetromino.cells[i][1];
            scene[x][y] = occupiedValue;
            sceneSprites[tetromino.cells[i][0]][tetromino.cells[i][1]] = tetromino.sprites[i];
        }
        checkLines(lines); 
        manageTetrominos(); 
    }
}


function makeShade(){
    shade = game.add.graphics(0, 0);
    shade.beginFill(0x000000,0.6);
    shade.drawRect(0,0,game.world.width,game.world.height);
    shade.endFill();
}

function managePauseScreen(){
    pauseState = !pauseState;
    if(pauseState){
        Game.radio.music.pause();
        makeShade();
        pauseText = game.add.bitmapText(game.world.centerX, game.world.centerY, 'videogame', 'PAUSE',64);
        pauseText.anchor.setTo(0.5);

    }else{
        timer.resume();
        Game.radio.playMusic();
        shade.clear();
        pauseText.destroy();
    }
}

function gameOver(){
    gameOverState = true;
    game.input.keyboard.enabled = false;
    Game.radio.music.pause();
    Game.radio.playSound(Game.radio.gameOverSound);
    makeShade();
    var gameover = game.add.bitmapText(game.world.centerX, game.world.centerY, 'gameover', 'GAME OVER',64);
    gameover.anchor.setTo(0.5);
    
    document.getElementById("name").style.display =  "block";
}

Game.update = function(){
    currentMovementTimer += this.time.elapsed;
    if (currentMovementTimer > movementLag) { 
        if(pause.isDown){
            managePauseScreen();
        }
        if (cursors.left.isDown)
        {
            if(canMove(slide,"left")){
                move(slide,slideCenter,"left",1);
            }
        }
        else if (cursors.right.isDown)
        {
            if(canMove(slide,"right")){
                move(slide,slideCenter,"right",1);
            }
        }
        else if (cursors.down.isDown)
        {
            if(canMove(slide,"down")){
                move(slide,slideCenter,"down",1);
            }
        }
        else if (rotates.clockwise.isDown)
        {
            if(canMove(rotate,"clockwise")){
                move(rotate,null,"clockwise",1);
            }else{
                
            }
        }
        else if (rotates.counterClockwise.isDown)
        {
            if(canMove(rotate,"counterclockwise")){
                move(rotate,null,"counterclockwise",1);
            }else{
                
            }
        }
        currentMovementTimer = 0;
    }
};

Game.shutdown = function(){
    document.getElementById('name').style.display = "none";
};