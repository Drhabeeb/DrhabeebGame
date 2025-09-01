

var gameChar_x, gameChar_y, floorPos_y;
var mobile = { zones: null, joyVec: {x:0,y:0}, jumpLatch: false, prevDir: 0, dirStickyUntil: 0, dirStickyMs: 180 };
var BASE_W = 1024, BASE_H = 576;
var viewScale = 1, viewOffsetX = 0, viewOffsetY = 0;
var prevCharY = 0;
var velY = 0;
var GRAVITY = 0.8;
var JUMP_VEL = -14;

var isLeft, isRight, isPlummeting, isFalling;

var canyons = [], trees_x, trees_y;
var landmarks = [];
var cloud_x, cloud_y, cloud_width, cloud_height;

var enemies ;

var cameraPosX = 0, collectables = [];

var game_score, flagpole, lives;

var dyingEnemy = false;
var deathStartFrame = 0;
var deathDelayFrames = 45; 
var buildingSpacingExtra = 60; 
var strikeHintUntil = 0; 

var jumpSound, stepSound, fallingSound, hitSound, bgHeartbeatSound, heartbeatSound;
var yaySound, gameoverSound, dieSound
var gameOverPlayed = false;



var TILE = 32;
var T = { EMPTY: 0, GROUND: 1, WATER: 2 };

var worldGrid = {
    originX: 0,
    cols: 0,
    rows: 0,
    data: [] 
};


var platforms = [];
var onPlatformNow = false; 

function createPlatform(x, y, length)
{
    var p = {
        x: x,
        y: y,
        length: length,
        draw: function() {
            push();
            var x = this.x;
            var y = this.y;
            var w = this.length;
            var h = 16;
            var topLip = 4;

            
            noStroke();
            fill(250, 176, 90); 
            rect(x, y - topLip, w, topLip, 2);

            
            fill(226, 130, 54); 
            rect(x, y, w, h, 3);

            stroke(170, 90, 40, 200);
            strokeWeight(1.5);
            for (var i = 24; i < w; i += 24) {
                line(x + i, y, x + i, y + h);
            }

            
            stroke(255, 220, 170, 140);
            strokeWeight(1);
            line(x + 1, y - 0.5, x + w - 1, y - 0.5);

            
            noStroke();
            fill(150, 80, 35, 200);
            for (var s = 12; s < w; s += 36) {
                ellipse(x + s, y + h * 0.35, 2, 2);
                ellipse(x + s + 8, y + h * 0.7, 2, 2);
            }

            
            fill(0, 0, 0, 40);
            rect(x + 2, y + h, w - 4, 3, 2);

            pop();
        },
        checkContact: function(gc_x, gc_y) {
            if (gc_x > this.x && gc_x < this.x + this.length) {
                var d = this.y - gc_y;
                if (d >= 0 && d < 5) {
                    return true;
                }
            }
            return false;
        }
    };
    return p;
}

var facing = 1;               
var isAttacking = false;      
var attackStartFrame = 0;     
var attackDuration = 12;      
var attackRange = 100;        

function preload()
{
    soundFormats('mp3','wav');
    
    
    jumpSound = loadSound('assets/jump.wav');
    jumpSound.setVolume(0.1);
    stepSound = loadSound('assets/step.mp3');
    stepSound.setVolume(0.15);
    stepSound.playMode('restart');
    fallingSound = loadSound('assets/fall.mp3');
    fallingSound.setVolume(0.3);
    hitSound = loadSound('assets/hit.mp3');
    hitSound.setVolume(0.25);
    heartbeatSound = loadSound('assets/heartbeat.mp3');
    heartbeatSound.setVolume(0.25);
    heartbeatSound.playMode('restart');
    yaySound = loadSound('assets/yay.mp3');
    yaySound.setVolume(0.3);
    gameoverSound = loadSound('assets/gameoverSound.mp3');
    gameoverSound.setVolume(0.35);
    bgHeartbeatSound = loadSound('assets/heartbeat1.mp3')
    bgHeartbeatSound.setVolume(0.07);
    dieSound = loadSound('assets/die.mp3')
    dieSound.setVolume(0.35)
}


function setup()
{
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    
    floorPos_y = BASE_H * 3 / 4;

    lives = 3;
    game_score = 0;
    computeView();
    startGame();
}

function windowResized()
{
    resizeCanvas(windowWidth, windowHeight);
    mobile.zones = null;
    computeView();
}

function computeView()
{
    var sx = width / BASE_W;
    var sy = height / BASE_H;
    viewScale = min(sx, sy);
    viewOffsetX = (width - BASE_W * viewScale) * 0.5;
    viewOffsetY = (height - BASE_H * viewScale) * 0.5;
}


function draw() 
{
    cameraPosX = gameChar_x - BASE_W / 2;

    background(39, 148, 191);

    if (!viewScale) computeView();
    push();
    translate(viewOffsetX, viewOffsetY);
    scale(viewScale);

    noStroke();
    fill(13, 148, 136);
    rect(0, floorPos_y, BASE_W, BASE_H - floorPos_y);

    push();
    translate(-cameraPosX, 0);

    for (var i = 0; i < canyons.length; i++) {
        drawCanyon(canyons[i]);
        checkCanyon(canyons[i]);
    }

    drawClouds();
    drawBuildingsLayer();
    drawTrees();
    drawAmbulancesLayer();

    
    for (var p = 0; p < platforms.length; p++) {
        platforms[p].draw();
    }

    
    renderFlagpole();

    
    var attackActive = isAttacking && (frameCount - attackStartFrame) < attackDuration;

    
    for (var e = 0; e < enemies.length; e++) {
        var enemy = enemies[e];
        if (enemy.isGone) continue;

        
        if (attackActive && enemy.state === 'alive' && attackHitsEnemy(enemy)) {
            enemy.kill(facing);
        }

        enemy.draw();

        if (!dyingEnemy && enemy.state === 'alive' && enemy.checkContact(gameChar_x, gameChar_y)) {
    if (dieSound) dieSound.play();   

    lives -= 1;
    if (lives > 0) {
        isLeft = false;
        isRight = false;
        isPlummeting = true; 
        dyingEnemy = true;
        deathStartFrame = frameCount;
        if (stepSound && stepSound.isPlaying()) stepSound.stop();
    } else {
        isLeft = false;
        isRight = false;
        isPlummeting = false;
    }
    break;
}


        if (!dyingEnemy && enemy.state === 'alive' && enemy.checkContact(gameChar_x, gameChar_y)) {
            
            lives -= 1;
            if (lives > 0) {
                
                isLeft = false;
                isRight = false;
                isPlummeting = true;
                dyingEnemy = true;
                deathStartFrame = frameCount;
                if (stepSound && stepSound.isPlaying()) stepSound.stop();
            } else {
                
                isLeft = false;
                isRight = false;
                isPlummeting = false;
            }
            break; 
        }
    }

    for (var j = 0; j < collectables.length; j++) {
        checkCollectable(collectables[j]);
        if (!collectables[j].isFound) {
            drawCollectable(collectables[j]);
        }
    }

    drawChar();
    pop();
    pop();

    applyTouchControls();
    drawMobileControls();

    drawLives();

    
    noStroke();
    fill(0, 0, 0, 120);
    rect(10, 26, 150, 26, 6);
    fill(255);
    text("  Score = " + game_score, 17, 45);

    

    
    (function()
    {
        var maxPerRow = 10;
        var spacingX = 26;
        var spacingY = 24;
        var startX = 18;
        var startY = 56; 
        var maxIcons = min(30, game_score);
        for (var i = 0; i < maxIcons; i++) {
            var row = int(i / maxPerRow);
            var col = i % maxPerRow;
            var x = startX + col * spacingX;
            var y = startY + row * spacingY;
            drawStethoscopeIconHUD(x, y, 0.6);
        }
    })();

    manageStepSound();

    if (lives < 1) 
        {
        if (!gameOverPlayed) {
            if (gameoverSound) gameoverSound.play();
            gameOverPlayed = true;
        }
        push();
        textAlign(CENTER, CENTER);
        textSize(48);
        fill(255);
        stroke(0);
        strokeWeight(4);
        text("Game over", width / 2, height / 2);
        drawOverlayRestartButton();
        pop();
        if (stepSound && stepSound.isPlaying()) stepSound.stop();
        return;
         }

    if (flagpole.isReached === true) 
    {
        push();
        textAlign(CENTER, CENTER);
        textSize(48);
        fill(255);
        stroke(0);
        strokeWeight(4);
        text("Level complete", width / 2, height / 2);
        drawOverlayRestartButton();
        pop();
        if (stepSound && stepSound.isPlaying()) stepSound.stop();
        return;
    }


var shouldPlayBG = (lives > 0) && !(flagpole && flagpole.isReached);
if (bgHeartbeatSound) 
{
  if (shouldPlayBG) {
    if (!bgHeartbeatSound.isPlaying()) bgHeartbeatSound.loop();
  } else {
    if (bgHeartbeatSound.isPlaying()) bgHeartbeatSound.stop();
  }
}


    
    onPlatformNow = false;
    if (!isPlummeting) {
        
        velY += GRAVITY;

        
        var nextY = gameChar_y + velY;

        
        if (velY >= 0) {
            for (var pi = 0; pi < platforms.length; pi++) {
                var p = platforms[pi];
                var withinX = (gameChar_x > p.x && gameChar_x < p.x + p.length);
                var crossingTop = (prevCharY <= p.y && nextY >= p.y);
                if (withinX && crossingTop) {
                    gameChar_y = p.y;
                    velY = 0;
                    isFalling = false;
                    onPlatformNow = true;
                    break;
                }
            }
        }

        
        if (!onPlatformNow) {
            if (nextY >= floorPos_y) {
                gameChar_y = floorPos_y;
                velY = 0;
                isFalling = false;
            } else {
                gameChar_y = nextY;
                isFalling = velY > 0;
            }
        }
    }

    if (!flagpole.isReached) 
    {
        checkFlagpole();
    }

    if (isPlummeting) 
    {
        gameChar_y += 5;
    }

    if (!isPlummeting) 
    {
        if (isLeft)  { gameChar_x -= 5; }
        if (isRight) { gameChar_x += 5; }
    }

    
    if (dyingEnemy && (frameCount - deathStartFrame) >= deathDelayFrames) {
        dyingEnemy = false;
        isPlummeting = false;
        startGame();
    }

    
    if (!attackActive) {
        isAttacking = false;
    }

    
    if (!dyingEnemy) {
        checkPlayerDie();
    }
    prevCharY = gameChar_y;
}

function keyPressed() 
{
    
    if (key === 'n' || key === 'N') {
        lives = 3;
        game_score = 0;
        if (flagpole) flagpole.isReached = false;
        if (stepSound && stepSound.isPlaying()) stepSound.stop();
        startGame();
        return;
    }

    if (lives < 1 || flagpole.isReached === true) return;

    if (!isPlummeting) {
        if (keyCode === 37) 
        {
            isLeft = true;
            facing = -1;
        } 
        else if (keyCode === 39)
        {
            isRight = true;
            facing = 1;
        } 
        else if (( key == 'w' || keyCode == UP_ARROW ) && !isFalling && (gameChar_y >= floorPos_y || onPlatformNow))
        {
            velY = JUMP_VEL;
            jumpSound.play();
        }
        else if (key == ' ' )
        {
            
            if (game_score >= 1 && !isAttacking) {
                game_score -= 1; 
                isAttacking = true;
                attackStartFrame = frameCount;
            }
        }
        
    }
}

function keyReleased() 
{
    if (lives < 1 || flagpole.isReached === true) return;

    if (keyCode === 37) {
        isLeft = false;
    } else if (keyCode === 39) {
        isRight = false;
    }
    if (!isLeft && !isRight) {
        if (stepSound && stepSound.isPlaying()) stepSound.stop();
    }
}

function drawClouds() 
{
    var names = ["فارس", "فيصل", "صيته", "غنى"]; 
    for (var i = 0; i < cloud_x.length; i++) {
        var drift = (frameCount * 0.12) % 400; 
        var cx = cloud_x[i] + drift;
        
        noStroke();
        fill(255);
        ellipse(cx,         cloud_y, cloud_width, cloud_height);
        ellipse(cx + 50,    cloud_y, cloud_width, cloud_height);
        ellipse(cx + 25, cloud_y - 20, cloud_width, cloud_height);

        
        var label = names[i % names.length];
        textAlign(CENTER, CENTER);
        textSize(20);
        if (label === "فارس") {
            fill(30, 90, 220);
        } else {
            fill(139, 69, 19);
        }
        
        text(label, cx + 25, cloud_y - 8);
    }
}

function drawCityscape()
{
    var bIndex = 0;
    for (var i = 0; i < landmarks.length; i++) {
        var lm = landmarks[i];
        if (lm.kind === 'ambulance') {
            drawAmbulance(lm.x, floorPos_y - 10, lm.label);
        } else {
            var bx = lm.x + bIndex * buildingSpacingExtra;
            drawBuilding(bx, lm.label, lm.kind);
            bIndex++;
        }
    }
}

function drawBuildingsLayer()
{
    var bIndex = 0;
    for (var i = 0; i < landmarks.length; i++) {
        var lm = landmarks[i];
        if (lm.kind !== 'ambulance') {
            var bx = lm.x + bIndex * buildingSpacingExtra;
            drawBuilding(bx, lm.label, lm.kind);
            bIndex++;
        }
    }
}

function drawAmbulancesLayer()
{
    for (var i = 0; i < landmarks.length; i++) {
        var lm = landmarks[i];
        if (lm.kind === 'ambulance') {
            drawAmbulance(lm.x, floorPos_y - 10, lm.label);
        }
    }
}

function drawBuilding(x, label, kind)
{
    var w = 132; 
    var h = 220; 
    var y = floorPos_y;

    
    noStroke();
    fill(0, 0, 0, 45);
    rect(x + w, y - h + 10, 10, h - 10);

    
    noStroke();
    if (kind === 'hospital' || kind === 'dental') {
        fill(150, 125, 105, 200);
    } else if (kind === 'school') {
        fill(150, 130, 210, 200);
    } else {
        fill(100, 115, 130, 200);
    }
    rect(x, y - h, w, h);

    
    fill(80, 90, 105, 200);
    rect(x - 4, y - h - 10, w + 8, 10);

    
    fill(245, 235, 180, 160);
    for (var r = 0; r < 4; r++) { 
        for (var c = 0; c < 4; c++) {
            rect(x + 12 + c * 24, y - h + 24 + r * 40, 16, 22, 3);
        }
    }

    
    fill(70, 80, 95, 200);
    rect(x + w/2 - 12, y - 36, 24, 36, 3);

    
    if (kind === 'hospital' || kind === 'dental') {
        var dy = h * 0.15; 
        fill(220, 90, 90, 200);
        rect(x + w - 28, y - h + 10 + dy, 18, 18, 3);
        fill(255, 255, 255, 200);
        rect(x + w - 21, y - h + 12 + dy, 4, 14);
        rect(x + w - 26, y - h + 17 + dy, 14, 4);
    } else if (kind === 'school') {
        fill(245, 235, 180, 160);
        triangle(x + 8, y - h, x + w/2, y - h - 20, x + w - 8, y - h);
    } else if (kind === 'telecom') {
        stroke(125, 211, 252, 180);
        strokeWeight(2);
        line(x + w - 12, y - h - 12, x + w - 12, y - h + 12);
        line(x + w - 12, y - h - 12, x + w - 18, y - h + 6);
        line(x + w - 12, y - h - 12, x + w - 6, y - h + 6);
        noStroke();
    } else if (kind === 'marketing' || kind === 'computer' || kind === 'tower') {
        fill(14, 165, 233, 140); 
        rect(x + 4, y - h + 4, w - 8, h - 8);
    }

    
    fill(255, 255, 255, 200);
    textAlign(CENTER, TOP);
    textSize(12);
    text(label, x + w/2, y - h + 6);
}

function drawAmbulance(x, y, label)
{
    
    var s = 1.35;
    function A(v) { return v * s; }

    
    noStroke();
    fill(40);
    ellipse(x + A(16), y, A(16), A(16));
    ellipse(x + A(64), y, A(16), A(16));

    
    fill(245);
    rect(x + A(0),  y - A(28), A(80), A(24), A(4));
    rect(x + A(50), y - A(42), A(30), A(14), A(4));

    
    fill(220, 0, 60);
    rect(x + A(30), y - A(24), A(6),  A(16));
    rect(x + A(24), y - A(18), A(18), A(6));

    
    fill(180, 220, 255);
    rect(x + A(56), y - A(38), A(18), A(10), A(2));

}

function drawTrees() 
{
    for (var i = 0; i < trees_x.length; i++) {
        
        fill(0, 0, 0, 50);
        ellipse(trees_x[i], floorPos_y + 6, 60, 14);
        fill(139, 69, 19);
        rect(trees_x[i] - 10, trees_y + 45, 20, 100);
        fill(0, 128, 0);
        ellipse(trees_x[i], trees_y, 90, 90);
    }
}

function drawCollectable(t_collectable) 
{
    push();
    translate(t_collectable.x_pos, t_collectable.y_pos);
    rotate(radians(-30));
    scale(t_collectable.size / 50);

    
    var phase = (sin(frameCount * 0.06) + 1) * 0.5;
    var plungerIn = map(phase, 0, 1, 0, 8);   
    var needleExt = map(phase, 0, 1, 0, 8);  

    fill(220);
    stroke(120);
    strokeWeight(2);
    rect(-10, -10, 20, 40, 5);

    
    noStroke();
    fill(0, 180, 255, 120);
    var fluidTop = -6 + plungerIn * 0.8; 
    rect(-8, fluidTop, 16, 32 - plungerIn * 0.8, 3);

    fill(180);
    rect(-6, -18 + plungerIn, 12, 10, 3);   
    rect(-12, -20 + plungerIn, 24, 4, 2);   

    
    
    stroke(255);
    strokeWeight(2);
    line(0, 30, 0, 50 + needleExt);

    
    stroke(200);
    strokeWeight(1);
    line(-1, 31, -1, 49 + needleExt);
    stroke(240);
    line(1, 31, 1, 49 + needleExt);

    
    stroke(170);
    strokeWeight(2);
    line(-2, 44, 2, 44);

    
    noStroke();
    fill(235);
    triangle(-2, 50 + needleExt, 2, 50 + needleExt, 0, 54 + needleExt);

    
    fill(255, 255, 255, 180);
    ellipse(0, 38, 2.5, 2);

    noStroke();
    fill(255, 180, 0);
    ellipse(0, 10, 16, 16);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text("₿", 0, 10);
    pop();
}

function drawCanyon(t_canyon) 
{
    
    noStroke();
    fill(0, 0, 160);
    rect(t_canyon.x_pos, floorPos_y, t_canyon.width, BASE_H - floorPos_y);

    
    var waveW = 24;
    var waveH = 12;
    var offset = 0;
    noStroke();
    fill(80, 160, 220, 200);
    for (var wx = -waveW; wx <= t_canyon.width + waveW; wx += waveW) {
        ellipse(t_canyon.x_pos + wx + offset, floorPos_y, waveW, waveH);
    }

    
    noFill();
    stroke(200, 240, 255, 180);
    strokeWeight(2);
    for (var wx2 = 0; wx2 <= t_canyon.width; wx2 += waveW) {
        var cx = t_canyon.x_pos + wx2;
        arc(cx, floorPos_y, waveW, waveH, PI, 0);
    }

    
    fill(0, 0, 0, 120);
    rect(t_canyon.x_pos, floorPos_y, 4, BASE_H - floorPos_y);
    rect(t_canyon.x_pos + t_canyon.width - 4, floorPos_y, 4, BASE_H - floorPos_y);
}


function buildGroundGrid()
{
    
    var minX = 0, maxX = 0;
    function upd(v){ if (v < minX) minX = v; if (v > maxX) maxX = v; }
    
    minX = 0; maxX = 0;
    
    for (var i=0;i<canyons.length;i++){ upd(canyons[i].x_pos); upd(canyons[i].x_pos + canyons[i].width); }
    
    for (var j=0;j<landmarks.length;j++){ upd(landmarks[j].x); }
    
    for (var k=0;k<trees_x.length;k++){ upd(trees_x[k]); }
    
    for (var m=0;m<cloud_x.length;m++){ upd(cloud_x[m]); }
    
    for (var n=0;n<collectables.length;n++){ upd(collectables[n].x_pos); }
    
    upd(flagpole.x_pos);

    
    minX -= 200; maxX += 200;

    
    worldGrid.originX = minX;
    worldGrid.cols = Math.ceil((maxX - minX) / TILE) + 1;
    
    var groundHeight = BASE_H - floorPos_y;
    worldGrid.rows = Math.ceil(groundHeight / TILE) + 1;
    worldGrid.data = [];
    for (var r = 0; r < worldGrid.rows; r++) {
        worldGrid.data[r] = [];
        for (var c = 0; c < worldGrid.cols; c++) {
            worldGrid.data[r][c] = T.GROUND; 
        }
    }

    
    for (var ci = 0; ci < canyons.length; ci++) {
        var cx0 = canyons[ci].x_pos;
        var cx1 = canyons[ci].x_pos + canyons[ci].width;
        var c0 = Math.floor((cx0 - worldGrid.originX) / TILE);
        var c1 = Math.floor((cx1 - worldGrid.originX) / TILE);
        for (var c = c0; c <= c1; c++) {
            for (var r = 0; r < worldGrid.rows; r++) {
                worldGrid.data[r][c] = T.WATER;
            }
        }
    }
}

function tileAtWorld(wx, wy)
{
    
    var col = Math.floor((wx - worldGrid.originX) / TILE);
    var row = Math.floor((wy - floorPos_y) / TILE);
    if (row < 0) row = 0;
    if (row >= worldGrid.rows || col < 0 || col >= worldGrid.cols) return T.EMPTY;
    return worldGrid.data[row][col];
}

function checkCollectable(t_collectable) 
{
    if (!t_collectable.isFound) {
        if (dist(gameChar_x, gameChar_y, t_collectable.x_pos, t_collectable.y_pos) < 60) {
            t_collectable.isFound = true;
            game_score += 1;
            if (game_score === 1) {
                
                strikeHintUntil = millis() + 5000;
            }
            if (heartbeatSound) heartbeatSound.play();
        }
    }
}

function checkCanyon(t_canyon) 
{
    
    var belowIsWater = tileAtWorld(gameChar_x, floorPos_y + 1) === T.WATER;
    if (belowIsWater && gameChar_y >= floorPos_y) 
    { if (!isPlummeting && fallingSound) fallingSound.play();
        isPlummeting = true;
    }
}

function renderFlagpole() 
{
    push();
    strokeWeight(5);
    stroke(100);
    line(flagpole.x_pos, floorPos_y, flagpole.x_pos, floorPos_y - 250);
    fill(200, 100, 200);
    noStroke();
    if (flagpole.isReached) {
        rect(flagpole.x_pos, floorPos_y - 250, 70, 40);
    } else {
        rect(flagpole.x_pos, floorPos_y - 50, 70, 40);
    }
    pop();
}

function checkFlagpole() 
{
    var d = abs(gameChar_x - flagpole.x_pos);
    if (d < 10 && !flagpole.isReached) {
        flagpole.isReached = true;
        if (yaySound) yaySound.play();
    }
}


function attackHitsEnemy(enemy)
{
    
    var x0 = gameChar_x;
    var x1 = gameChar_x + facing * attackRange;
    var minX = min(x0, x1);
    var maxX = max(x0, x1);

    
    var yMin = floorPos_y - 40;
    var yMax = floorPos_y + 10;

    var ex = enemy.currentX;
    var ey = enemy.y;

    return (ex >= minX && ex <= maxX && ey >= yMin && ey <= yMax);
}

function drawChar() 
{
    var moving = isLeft || isRight;
    var airborne = isFalling || isPlummeting;

    var baseScale = 0.78;
    var sx = moving ? 0.85 : 1.0;
    var sy = moving ? 1.06 : 1.0;

    var legW = 8;
    var legH = airborne ? 24 : 34;
    var bodyW = 20;
    var bodyH = 26;
    var coatH = 40;
    var headW = 24;
    var headH = 28;

    push();
    translate(gameChar_x, gameChar_y);
    scale(baseScale * sx, baseScale * sy);

    noStroke();
    fill(30);
    rect(-14, -4, 12, 5, 2);
    rect(2, -4, 12, 5, 2);

    fill(40, 70, 160);
    rect(-12, -4 - legH, legW, legH, 2);
    rect(4, -4 - legH, legW, legH, 2);

    fill(30, 160, 170);
    rect(-bodyW / 2, -4 - legH - bodyH, bodyW, bodyH, 3);

    fill(245);
    rect(-bodyW / 2 - 4, -4 - legH - bodyH, bodyW + 8, coatH, 4);

    fill(235);
    triangle(
        -bodyW / 2 - 4, -4 - legH - bodyH,
        -2,              -4 - legH - bodyH,
        -8,              -4 - legH - bodyH + 10
    );
    triangle(
         bodyW / 2 + 4, -4 - legH - bodyH,
         2,             -4 - legH - bodyH,
         8,             -4 - legH - bodyH + 10
    );

    var armY = -4 - legH - bodyH + 6;
    var outLen = 14;
    var upLen = 14;

    if (airborne) {
        push();
        translate(-bodyW / 2 - 4, armY);
        fill(245);
        rect(-outLen, -3, outLen, 6, 3);
        fill(70, 160, 230);
        rect(-outLen - 3, -upLen, 6, upLen, 3);
        ellipse(-outLen, -upLen, 8, 8);
        pop();

        push();
        translate(bodyW / 2 + 4, armY);
        fill(245);
        rect(0, -3, outLen, 6, 3);
        fill(70, 160, 230);
        rect(outLen - 3, -upLen, 6, upLen, 3);
        ellipse(outLen, -upLen, 8, 8);
        pop();
    } else {
        push();
        translate(-bodyW / 2 - 4, armY);
        fill(245);
        rect(-3, 0, 6, 18, 3);
        fill(70, 160, 230);
        ellipse(0, 18, 8, 8);
        pop();

        push();
        translate(bodyW / 2 + 4, armY);
        fill(245);
        rect(-3, 0, 6, 18, 3);
        fill(70, 160, 230);
        ellipse(0, 18, 8, 8);
        pop();
    }

    
    if (isAttacking && (frameCount - attackStartFrame) < attackDuration) {
        var dir = facing;        
        var sLen = attackRange;  
        var sag = 18 + sin(frameCount * 0.25) * 2; 
        push();
        translate(dir > 0 ? (bodyW / 2 + 4) : (-bodyW / 2 - 4), armY);
        scale(dir, 1);

        
        stroke(20);
        strokeWeight(6);
        strokeCap(ROUND);
        noFill();
        
        
        bezier(
            0, 0,
            sLen * 0.35, sag * 0.35,
            sLen * 0.70, sag,
            sLen - 12, sag + 2
        );

        
        stroke(140);
        strokeWeight(4);
        line(sLen - 12, sag + 2, sLen - 4, sag + 2);

        
        noStroke();
        fill(170);            
        ellipse(sLen, sag + 2, 22, 22);
        fill(210);            
        ellipse(sLen, sag + 2, 16, 16);
        fill(215, 230, 240);  
        ellipse(sLen, sag + 2, 12, 12);

        
        fill(255, 255, 255, 150);
        ellipse(sLen - 3, sag - 1, 4, 4);

        pop();
    }

    var headY = -4 - legH - bodyH - 18;
    fill(220, 190, 170);
    ellipse(0, headY, headW, headH);

    fill(50);
    arc(0, headY - 6, headW + 4, headH - 8, PI, 0);

    stroke(20);
    strokeWeight(1.5);
    var eyeY = headY + 2;
    line(-10, eyeY, 10, eyeY);
    noFill();
    rect(-14, eyeY - 4, 8, 8, 2);
    rect(6,  eyeY - 4, 8, 8, 2);

    noStroke();
    fill(20);
    ellipse(-10, eyeY, 2.5, 2.5);
    ellipse(10,  eyeY, 2.5, 2.5);

    fill(150, 210, 230);
    rect(-12, headY + 6, 24, 7, 2);

    stroke(60);
    strokeWeight(2);
    noFill();
    arc(0, -4 - legH - bodyH + 2, 20, 16, PI, 0);
    line(-8, -4 - legH - bodyH + 6, -8, -4 - legH - bodyH + 18);
    line( 8, -4 - legH - bodyH + 6,  8, -4 - legH - bodyH + 18);
    strokeWeight(1.6);
    fill(230);
    ellipse(2, -4 - legH - bodyH + 24, 5, 5);

    pop();
}

function manageStepSound() {
    
    var moving = isLeft || isRight;
    var onGround = !isFalling && !isPlummeting && (gameChar_y >= floorPos_y || onPlatformNow);
    var canPlay = lives > 0 && !(flagpole && flagpole.isReached);

    if (moving && onGround && canPlay) {
        if (stepSound && !stepSound.isPlaying()) {
            stepSound.loop();
        }
    } else {
        if (stepSound && stepSound.isPlaying()) {
            stepSound.stop();
        }
    }
}

function startGame() 
{
    gameChar_x = BASE_W / 2;
    gameChar_y = floorPos_y;
    velY = 0;

    isLeft = false;
    isRight = false;
    isPlummeting = false;
    isFalling = false;
    isAttacking = false;
    facing = 1;
    strikeHintUntil = 0;
    gameOverPlayed = false;

    cameraPosX = 0;

    collectables = [
        { x_pos: -600, y_pos: floorPos_y - 50, size: 50, isFound: false },
        { x_pos: -200, y_pos: floorPos_y - 50, size: 50, isFound: false },
        { x_pos:  200, y_pos: floorPos_y - 50, size: 50, isFound: false },
        { x_pos:  600, y_pos: floorPos_y - 50, size: 50, isFound: false },
        { x_pos: 1000, y_pos: floorPos_y - 50, size: 50, isFound: false }
    ];

    canyons = [
        { x_pos: -900, width: 120 },
        { x_pos: -300, width: 180 },
        { x_pos:  250, width: 140 },
        { x_pos:  900, width: 200 }
    ];

    
    (function(){
        var maxCanyonWidth = 0;
        for (var i = 0; i < canyons.length; i++) {
            if (canyons[i].width > maxCanyonWidth) maxCanyonWidth = canyons[i].width;
        }
        var bigCanyonWidth = int(maxCanyonWidth * 1.5);
        canyons.push({ x_pos: 1500, width: bigCanyonWidth });
    })();

    trees_x = [
        -1400, -1000,
          -400, 
          400,   1000,
         1200,   1800
    ];
    trees_y = floorPos_y - 145;

    cloud_x = [-2100, -1600, -1100, -600, 100, 600, 1100, 1600, 2100];
    cloud_y = 100;
    cloud_width  = 100;
    cloud_height = 50;

    
    landmarks = [
        { x: -2100, kind: 'hospital', label: 'Dr H Habeeb Hospital' },
        { x: -1820, kind: 'hospital', label: 'Dr Faris Hospital' },
        { x: -1680, kind: 'ambulance' },
        { x: -1540, kind: 'hospital', label: 'Dr Faisal Hospital' },
        { x: -1260, kind: 'hospital', label: 'Dr Seetah Hospital' },
        { x: -1120, kind: 'ambulance'},
        { x:  -980, kind: 'hospital', label: 'Dr Ghena Hospital' },
        { x:  -840, kind: 'school',   label: 'Iman School' },
        { x:  -700, kind: 'school',   label: 'Bothina School' },
        { x:  -560, kind: 'telecom',  label: 'Ahmad Telecom' },
        { x:  -420, kind: 'marketing',label: 'Moh Marketing' },
        { x:  -280, kind: 'dental',   label: 'Dr Khalid Dental' },
        { x:  -140, kind: 'computer', label: 'Abdulla Computer' },
        { x:    20, kind: 'tower',    label: 'Abdulrahman Tower' },
        { x:   180, kind: 'school',   label: 'Khetam School' },
        { x:   500, kind: 'hospital', label: 'Dr H Habeeb Hospital' },
        { x:   820, kind: 'hospital', label: 'Dr Obaid Hospital' },
        { x:   980, kind: 'ambulance' },
        { x:  1140, kind: 'hospital', label: 'Dr Faisal Hospital' },
        { x:  1460, kind: 'hospital', label: 'Dr Najah Hospital' },
        { x:  1620, kind: 'ambulance'},
        { x:  1780, kind: 'hospital', label: 'Dr Ghena Hospital' },
        { x:  -1940, kind: 'hospital', label: 'Dr Obaid Hospital' },
        { x:  -2100, kind: 'hospital', label: 'Dr Najah Hospital' }
    ];

    
    flagpole = { isReached: false, x_pos: -2500 };

    
    enemies = [];
    enemies.push(new Enemy(600, floorPos_y, 100));
    enemies.push(new Enemy(1000, floorPos_y, 100));
    enemies.push(new Enemy(1200, floorPos_y, 200));
    enemies.push(new Enemy(-600, floorPos_y, 150));
    enemies.push(new Enemy(-1000, floorPos_y, 150));
    enemies.push(new Enemy(-1400, floorPos_y, 200));    
    enemies.push(new Enemy(-1800, floorPos_y, 250));

    
    platforms = [];
    platforms.push(createPlatform( 700,  floorPos_y - 80, 120));
    platforms.push(createPlatform( -600, floorPos_y - 80,  150));
    platforms.push(createPlatform(   50, floorPos_y - 120, 140));
    platforms.push(createPlatform( 1150, floorPos_y - 100, 160));
    platforms.push(createPlatform( 1450, floorPos_y - 160, 140));
    platforms.push(createPlatform(-1200, floorPos_y - 130, 160));
    // add bridges over some canyons (every other one)
    for (var ci = 0; ci < canyons.length; ci++) {
        if (ci % 2 === 0) {
            var c = canyons[ci];
            var px = c.x_pos + 10;
            var pw = max(40, c.width - 20);
            var py = floorPos_y - 60;
            platforms.push(createPlatform(px, py, pw));
        }
    }

    
    buildGroundGrid();
    prevCharY = gameChar_y;
}

function checkPlayerDie() 
{
    if (gameChar_y > BASE_H + 50) {
        lives -= 1;

        if (lives > 0) {
            startGame();
        } else {
            isLeft = false;
            isRight = false;
            isPlummeting = false;
        }
    }
}

function drawLives() 
{
    var x = 20;
    var y = 10;
    for (var i = 0; i < lives; i++) {
        stroke(5);
        fill(220, 0, 50);
        ellipse(x + i * 30 + 8,  y, 10, 10);
        ellipse(x + i * 30 + 18, y, 10, 10);
        triangle(
            x + i * 30 + 4,  y + 4,
            x + i * 30 + 22, y + 4,
            x + i * 30 + 13, y + 16
        );
    }
}

function getMobileLayout(){
    var w = width, h = height, pad = 16;
    var sa = getSafeAreaInsets();
    var padL = pad + sa.left;
    var padR = pad + sa.right;
    var padT = pad + sa.top;
    var padB = pad + sa.bottom;
    var base = min(w, h);
    var joyR = max(56, min(96, floor(base * 0.12)));
    var knobR = floor(joyR * 0.45);
    var btn = max(60, min(84, floor(base * 0.11)));
    return {
        joy: { cx: w - padR - joyR, cy: h - padB - joyR, r: joyR, knobR: knobR },
        attack: { x: padL, y: h - padB - btn, w: btn, h: btn },
        restart: { x: w - padR - 56, y: padT, w: 56, h: 36 }
    };
}

function getSafeAreaInsets(){
    try {
        var probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;inset:0;padding:'+
            'env(safe-area-inset-top) env(safe-area-inset-right) '+
            'env(safe-area-inset-bottom) env(safe-area-inset-left);'+
            'pointer-events:none;opacity:0;';
        document.body.appendChild(probe);
        var cs = getComputedStyle(probe);
        var toNum = function(v){ var n = parseInt(v,10); return isNaN(n)?0:n; };
        var top = toNum(cs.paddingTop), right = toNum(cs.paddingRight),
            bottom = toNum(cs.paddingBottom), left = toNum(cs.paddingLeft);
        document.body.removeChild(probe);
        return { top: top, right: right, bottom: bottom, left: left };
    } catch(e) { return { top: 0, right: 0, bottom: 0, left: 0 }; }
}

function drawMobileControls(){
    var layout = getMobileLayout();
    var joy = layout.joy;
    var atk = layout.attack;
    var rst = layout.restart;
    noStroke();
    fill(255,255,255,50);
    ellipse(joy.cx, joy.cy, joy.r*2, joy.r*2);
    var kx = joy.cx + (mobile.joyVec.x || 0) * joy.r * 0.6;
    var ky = joy.cy + (mobile.joyVec.y || 0) * joy.r * 0.6;
    fill(255,255,255,90);
    ellipse(kx, ky, joy.knobR*2, joy.knobR*2);
    fill(255,255,255,60);
    rect(atk.x, atk.y, atk.w, atk.h, 12);
    fill(0,0,0,120);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('⚡', atk.x + atk.w/2, atk.y + atk.h/2);
    
    fill(255,255,255,70);
    rect(rst.x, rst.y, rst.w, rst.h, 8);
    fill(0,0,0,140);
    textSize(14);
    text('↻', rst.x + rst.w/2, rst.y + rst.h/2);
}

function _inZone(t, z){
    return t.x >= z.x && t.x <= z.x + z.w && t.y >= z.y && t.y <= z.y + z.h;
}

function applyTouchControls(){
    isLeft = false;
    isRight = false;
    var layout = getMobileLayout();
    var joy = layout.joy;
    var atk = layout.attack;
    var rst = layout.restart;
    var best = null;
    var bestD2 = joy.r * joy.r * 4;
    for (var i = 0; i < touches.length; i++){
        var t = touches[i];
        var dx = t.x - joy.cx;
        var dy = t.y - joy.cy;
        var d2 = dx*dx + dy*dy;
        if (d2 < bestD2){ bestD2 = d2; best = t; }
        if (_inZone(t, atk)){
            if (game_score >= 1 && !isAttacking){
                game_score -= 1;
                isAttacking = true;
                attackStartFrame = frameCount;
            }
        }
        if (_inZone(t, rst)){
            if (!mobile.restartLatch){
                lives = 3;
                game_score = 0;
                if (flagpole) flagpole.isReached = false;
                if (stepSound && stepSound.isPlaying()) stepSound.stop();
                startGame();
                mobile.restartLatch = true;
            }
        }
    }
    if (touches.length === 0) mobile.restartLatch = false;
    var onGround = !isFalling && !isPlummeting && (gameChar_y >= floorPos_y || onPlatformNow);
    var airborne = !onGround;
    if (best){
        var dx = best.x - joy.cx;
        var dy = best.y - joy.cy;
        var mag = sqrt(dx*dx + dy*dy);
        if (mag > joy.r){ dx = dx * joy.r / mag; dy = dy * joy.r / mag; mag = joy.r; }
        var nx = dx / joy.r;
        var ny = dy / joy.r;
        mobile.joyVec = { x: nx, y: ny };
        var X_ON = 0.20, X_OFF = 0.10;
        var hasX = false;
        if (nx > X_ON) { isRight = true; facing = 1; hasX = true; mobile.xHoldDir = 1; }
        else if (nx < -X_ON) { isLeft = true; facing = -1; hasX = true; mobile.xHoldDir = -1; }
        else if (abs(nx) < X_OFF && onGround) { mobile.xHoldDir = 0; }
        if (ny < -0.5){
            if (!mobile.jumpLatch && !isFalling && (gameChar_y >= floorPos_y || onPlatformNow)){
                velY = JUMP_VEL;
                if (jumpSound) jumpSound.play();
                mobile.jumpLatch = true;
                if (!hasX && mobile.xHoldDir){
                    if (mobile.xHoldDir > 0) { isRight = true; facing = 1; }
                    else { isLeft = true; facing = -1; }
                }
            }
        } else if (ny > -0.2){
            mobile.jumpLatch = false;
        }
        if (!hasX && airborne && mobile.xHoldDir){
            if (mobile.xHoldDir > 0) { isRight = true; facing = 1; } else { isLeft = true; facing = -1; }
        }
    } else {
        mobile.joyVec = { x: 0, y: 0 };
        mobile.jumpLatch = false;
        if (airborne && mobile.xHoldDir){
            if (mobile.xHoldDir > 0) { isRight = true; facing = 1; } else { isLeft = true; facing = -1; }
        } else if (onGround) {
            mobile.xHoldDir = 0;
        }
    }
}

function touchStarted(){
    var ctx = getAudioContext();
    if (ctx && ctx.state !== 'running') ctx.resume();
    if (typeof userStartAudio === 'function') { try { userStartAudio(); } catch(e) {} }
    
    if ((typeof lives !== 'undefined' && lives < 1) || (typeof flagpole !== 'undefined' && flagpole && flagpole.isReached === true)){
        var btn = getOverlayRestartButtonRect();
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h){
            lives = 3;
            game_score = 0;
            if (flagpole) flagpole.isReached = false;
            if (stepSound && stepSound.isPlaying()) stepSound.stop();
            startGame();
            return false;
        }
    }
    if (typeof bgHeartbeatSound !== 'undefined' && bgHeartbeatSound && !bgHeartbeatSound.isPlaying()){
        try { bgHeartbeatSound.loop(); } catch(e) {}
    }
    applyTouchControls();
    return false;
}

function mousePressed(){
    var ctx = (typeof getAudioContext === 'function') ? getAudioContext() : null;
    if (ctx && ctx.state !== 'running') { try { ctx.resume(); } catch(e) {} }
    if (typeof userStartAudio === 'function') { try { userStartAudio(); } catch(e) {} }
    
    if ((typeof lives !== 'undefined' && lives < 1) || (typeof flagpole !== 'undefined' && flagpole && flagpole.isReached === true)){
        var btn = getOverlayRestartButtonRect();
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h){
            lives = 3;
            game_score = 0;
            if (flagpole) flagpole.isReached = false;
            if (stepSound && stepSound.isPlaying()) stepSound.stop();
            startGame();
            return false;
        }
    }
}

function touchMoved(){
    applyTouchControls();
    return false;
}

function touchEnded(){
    applyTouchControls();
    return false;
}


function drawStethoscopeIconHUD(x, y, s)
{
    push();
    translate(x, y);
    scale(s);

    var len = 36;
    var sag = 10;

    
    stroke(20);
    strokeWeight(6);
    strokeCap(ROUND);
    noFill();
    bezier(0, 0, len * 0.35, sag * 0.35, len * 0.70, sag, len - 10, sag + 2);

    
    stroke(140);
    strokeWeight(4);
    line(len - 10, sag + 2, len - 4, sag + 2);

    
    noStroke();
    fill(170);
    ellipse(len, sag + 2, 16, 16);
    fill(210);
    ellipse(len, sag + 2, 12, 12);
    fill(215, 230, 240);
    ellipse(len, sag + 2, 8, 8);

    
    fill(255, 255, 255, 150);
    ellipse(len - 2, sag, 3, 3);

    pop();
}

function getOverlayRestartButtonRect(){
    var w = 180, h = 50;
    return { x: width / 2 - w / 2, y: height / 2 + 70, w: w, h: h };
}

function drawOverlayRestartButton(){
    var btn = getOverlayRestartButtonRect();
    noStroke();
    fill(255,255,255,200);
    rect(btn.x, btn.y, btn.w, btn.h, 10);
    fill(0,0,0,200);
    textAlign(CENTER, CENTER);
    textSize(22);
    text('Restart', btn.x + btn.w/2, btn.y + btn.h/2);
}

function Enemy (x, y, range) 
{
    this.x = x;
    this.y = y;
    this.range = range;
    this.currentX = x;
    this.inc = 1;
    this.state = 'alive'; 
    this.isGone = false;  
    this.deathVX = 0;
    this.deathVY = 0;
    this.deathAY = 0;
    this.deathRot = 0;
    this.deathRotInc = 0;
    this.alpha = 255;

    this.update = function()
    {
        if (this.state === 'alive') {
            this.currentX += this.inc;
            if (this.currentX >= this.x + this.range) {
                this.inc = -1;
            } else if (this.currentX < this.x) {
                this.inc = 1;
            }
        } else if (this.state === 'dying') {
            
            this.currentX += this.deathVX;
            this.y += this.deathVY;
            this.deathVY += this.deathAY;
            this.deathRot += this.deathRotInc;
            this.alpha = max(0, this.alpha - 4);
            if (this.y < -80 || this.alpha <= 0) {
                this.isGone = true;
            }
        }
    };

    this.draw = function()
    {
        this.update();

        
        var bodyW = 36;
        var bodyH = 22;
        var wobble = sin(frameCount * 0.1) * 0.15;

        push();
        translate(this.currentX, this.y);
        if (this.state === 'dying') {
            rotate(this.deathRot);
            
            drawingContext.save();
            drawingContext.globalAlpha = this.alpha / 255;
        } else {
            rotate(wobble);
        }
        noStroke();

        
        fill(230, 255, 120, 70);
        ellipse(0, 0, bodyW + 10, bodyH + 10);

        
        fill(180, 220, 60);
        ellipse(0, 0, bodyW, bodyH);

        
        fill(60, 140, 40);
        ellipse(4, -2, 10, 8);

        
        fill(255, 245, 120, 180);
        ellipse(-6, 3, 6, 5);
        ellipse(8, 4, 5, 4);
        ellipse(-2, -5, 4, 4);

        
        stroke(90, 180, 60);
        strokeWeight(2);
        for (var i = 0; i < 12; i++) {
            var ang = TWO_PI * i / 12 + wobble * 2;
            var rx = (bodyW * 0.52) * cos(ang);
            var ry = (bodyH * 0.52) * sin(ang);
            var ox = (bodyW * 0.75) * cos(ang);
            var oy = (bodyH * 0.75) * sin(ang);
            line(rx, ry, ox, oy);
        }

        
        noFill();
        stroke(90, 180, 60);
        strokeWeight(2);
        beginShape();
        var tailLen = 26;
        for (var t = 0; t <= tailLen; t++) {
            var tx = -bodyW * 0.5 - t * 0.6;
            var ty = sin((frameCount * 0.2) + t * 0.5) * 2.5;
            vertex(tx, ty);
        }
        endShape();

        if (this.state === 'dying') {
            drawingContext.restore();
        }
        pop();
    };

    this.kill = function(dir)
    {
        if (this.state !== 'alive') return;
        this.state = 'dying';
        this.deathVX = (dir >= 0 ? 1 : -1) * 6;
        this.deathVY = random(-8, -6);
        this.deathAY = -0.18; 
        this.deathRotInc = random(-0.12, 0.12);
        if (abs(this.deathRotInc) < 0.04) this.deathRotInc = 0.08 * (this.deathRotInc < 0 ? -1 : 1);
        if (hitSound) hitSound.play();
    };

    this.checkContact = function(gc_x, gc_y)
    {
        if (this.state !== 'alive') return false;
        var d = dist(gc_x, gc_y, this.currentX, this.y);
        
        if (d < 22) {
            return true;
        }
        return false;
    };
}   
