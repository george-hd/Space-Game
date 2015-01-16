var RAF = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();


    var canvas = document.createElement('canvas');
    canvas.width = window.innerWidth - 30;
    canvas.height = window.innerHeight - 80;
    var ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    document.getElementById('play-again').addEventListener('click', function () {
        $('#game-over').css('display', 'none');
        $('#game-over-overlay').css('display', 'none');
        init();
    });

    var lastTime;
    //the game loop
    function main() {
        var now = Date.now();
        var dt = (now - lastTime) / 1000.0;
        update(dt);
        render();
        lastTime = now;
        if (enemies.length == 0 && explosions == 0 && enemyBullets == 0) {
            nextLevel();
        }
        else if (health <= 0 && lives <= 0) {
            enemies = [];
            gameOver();
        }
        else if (health <= 0 && lives > 0) {
            var liv = lives -= 1;
            var scor = score;
            var l = level;
            enemies = [];
            init();
            lives = liv;
            score = scor;
            level = l;
        }else{
            RAF(main);
        }
    }

    function init() {
        reset();
        lastTime = Date.now();
        main();
    }

    resources.load([
        'Images/sprite.png',
        'Images/firesprite.png'
    ]);
    resources.onReady(init);

    var player = {
        pos: [0, 0],
        sprite: new Sprite('Images/sprite.png', [0, 224], [45, 43])
    };

    var myBullets = [];
    var enemyBullets = [];
    var enemies = [];
    
    var explosions = [];

    var lastFire = Date.now();
    var gameTime = 0;
    var isGameOver;
    var lastKilled;

    var difficulty = 8;
    var score = 0;
    var scoreEl = document.getElementById('score');

    var health = 100;
    var healthEl = document.getElementById('health');

    var lives = 3;
    var liveEl = document.getElementById('lives');

    var level = 0;
    var levelEl = document.getElementById('level');

    // Speed in pixels per second
    var playerSpeed = 200;
    var bulletSpeed = 200;
    var enemySpeed = 50;

    function createEnemies() {
        var y = 0;
        for (var i = 0; i < 6; i++) {
            var x = 20;
            for (var j = 0; j < 15; j++) {
                enemies.push({ pos: [x, y], sprite: new Sprite('Images/sprite.png', [0, 150], [33, 42]) });
                x += 35;
            }
            y += 44;
        }
    }

    function update(dt) {
        
        gameTime += dt;
        handleInput(dt);

        scoreEl.innerHTML = score;
        healthEl.innerHTML = health;
        liveEl.innerHTML = lives;

        updateEntities(dt);
        checkCollisions();

        var rand = Math.floor(Math.random() * 100);
        var len = enemies.length;
        if (len > 0) {
            var randomEnemy = Math.floor(Math.random() * len);
            if (enemies[randomEnemy] && rand < difficulty) {
                enemyBullets.push({
                    pos: [enemies[randomEnemy].pos[0] + 7, enemies[randomEnemy].pos[1] + 12],
                    dir: 'down',
                    sprite: new Sprite('Images/sprite.png', [0, 202], [13, 12])
                });
            }
        }
    }

    function reset() {
        isGameOver = false;
        gameTime = 0;
        score = 0;
        health = 100;
        lives = 3;
        level = 1;
        enemySpeed = 50;
        difficulty = 8;

        createEnemies();
        enemyBullets = [];
        myBullets = [];

        player.pos = [canvas.width / 2, canvas.height - 50];
    }

    function handleInput(dt) {

        if (input.isDown('LEFT') || input.isDown('a')) {
            player.pos[0] -= playerSpeed * dt;
        }

        if (input.isDown('RIGHT') || input.isDown('d')) {
            player.pos[0] += playerSpeed * dt;
        }

        if (input.isDown('SPACE') &&
           !isGameOver &&
           Date.now() - lastFire > 300) {
            var x = player.pos[0] + player.sprite.size[0] / 2 - 3;
            var y = player.pos[1];

            var shoot = document.getElementById('shoot');
            shoot.src = "../sounds/shoot.wav";
            shoot.play();
            myBullets.push({
                pos: [x, y],
                dir: 'up',
                sprite: new Sprite('Images/sprite.png', [0, 202], [13, 12])
            });

            lastFire = Date.now();
        }
    }

    function updateEntities(dt) {
        player.sprite.update(dt);

        // Update all the bullets
        for (var i = 0; i < enemyBullets.length; i++) {
            var enemyBullet = enemyBullets[i];
            enemyBullet.pos[1] += bulletSpeed * dt;
            
            // Remove the bullet if it goes offscreen
            if (enemyBullet.pos[1] < 0 || enemyBullet.pos[1] > canvas.height ||
               enemyBullet.pos[0] > canvas.width) {
                enemyBullets.splice(i, 1);
                i--;
            }
        }

        for (var i = 0; i < myBullets.length; i++) {
            var myBullet = myBullets[i];
            myBullet.pos[1] -= bulletSpeed * dt;
            // Remove the bullet if it goes offscreen
            if (myBullet.pos[1] < 0 || myBullet.pos[1] > canvas.height ||
                myBullet.pos[0] > canvas.width) {
                myBullets.splice(i, 1);
                i--;
            }
        }
        
        // Update all the enemies
        reverseEnemiesDirection();
        if(enemies.length > 0 && health > 0){
            for (var i = 0; i < enemies.length; i++) {
                if (direction == 'right') {
                    enemies[i].pos[0] += enemySpeed * dt;
                } else {
                    enemies[i].pos[0] -= enemySpeed * dt;
                }

                // Remove if offscreen
                if (enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
                    enemies.splice(i, 1);
                    i--;
                }
            }
        }
        
        // Update all the explosions
        for (var i = 0; i < explosions.length; i++) {
            explosions[i].sprite.update(dt); 

            // Remove if animation is done
            if (explosions[i].sprite.done) {
                explosions.splice(i, 1);
                i--;
            }
        }
    }

    //reverse the enemies direction
    var direction = 'right';
    function reverseEnemiesDirection() {
        for (var i in enemies) {
            if (enemies[i].pos[0] >= canvas.width - 30) {
                moveEnemiesDown();
                direction = 'left';
                return;
            }
            if (enemies[i].pos[0] < 5) {
                moveEnemiesDown();
                direction = 'right';
                return;
            }
        }
    }

    function moveEnemiesDown(dt) {
        for (var i in enemies) {
            enemies[i].pos[1] = enemies[i].pos[1] + 20;
        }
    }

    function collides(x, y, r, b, x2, y2, r2, b2) {
        return !(r <= x2 || x > r2 ||
                 b <= y2 || y > b2);
    }

    function boxCollides(pos, size, pos2, size2) {
        return collides(pos[0], pos[1],
                        pos[0] + size[0], pos[1] + size[1],
                        pos2[0], pos2[1],
                        pos2[0] + size2[0], pos2[1] + size2[1]);
    }

    // collision detection
    function checkCollisions() {
        checkPlayerBounds();
        
        for (var k = 0; k < enemyBullets.length; k++) {
            var enemyBulletPos = enemyBullets[k].pos;
            var enemyBulletSize = enemyBullets[k].sprite.size;

            if (boxCollides(player.pos, player.sprite.size, enemyBulletPos, enemyBulletSize)) {
                health -= 10;
                enemyBullets.splice(k, 1);
                k--;
           }
        }

        for (var i = 0; i < enemies.length; i++) {
            var pos = enemies[i].pos;
            var size = enemies[i].sprite.size;

            for (var j = 0; j < myBullets.length; j++) {
                var pos2 = myBullets[j].pos;
                var size2 = myBullets[j].sprite.size;

                if (boxCollides(pos, size, pos2, size2)) {
                    // Remove the enemy
                    enemies.splice(i, 1);
                    i--;

                    // Add score
                    score += 20;

                    //play sound
                    var boom = document.getElementById('boom');
                    boom.src = "../sounds/boom.wav";
                    boom.play();

                   //add an explosion
                    explosions.push({
                        pos: pos,
                        sprite: new Sprite('Images/firesprite.png',
                                           [0, 117],
                                           [39, 39],
                                           16,
                                           [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
                                           null,
                                           true)
                    });

                    // Remove the bullet and stop this iteration
                    myBullets.splice(j, 1);
                    break;
                }
            }

            if (boxCollides(pos, size, player.pos, player.sprite.size)) {
                gameOver();
            }
        }
    }

    function checkPlayerBounds() {
        // Check bounds
        if (player.pos[0] < 0) {
            player.pos[0] = 0;
        }
        else if (player.pos[0] > canvas.width - player.sprite.size[0]) {
            player.pos[0] = canvas.width - player.sprite.size[0];
        }
    }

    function render() {
        // Render the player if the game isn't over
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!isGameOver) {
            renderEntity(player);
        }
        renderEntities(enemyBullets);
        renderEntities(myBullets);
        renderEntities(enemies);
        renderEntities(explosions);
    };

    function renderEntities(list) {
        for (var i = 0; i < list.length; i++) {
            renderEntity(list[i]);
        }
    }

    function renderEntity(entity) {
        ctx.save();
        ctx.translate(entity.pos[0], entity.pos[1]);
        entity.sprite.render(ctx);
        ctx.restore();
    }

    function gameOver() {
        health = 0;
        var scoreDiv = document.createElement('div');
        var levelDiv = document.createElement('div');
        levelDiv.innerHTML = 'Level ' + level;
        scoreDiv.innerHTML = 'Score ' + score;
        var gameEnd = document.getElementById('result');
        gameEnd.innerHTML = '';
        gameEnd.appendChild(levelDiv);
        gameEnd.appendChild(scoreDiv);
        
        $('#game-over').css('display', 'block');
        $('#game-over-overlay').css('display', 'block');
        isGameOver = true;
    }

    function nextLevel() {
        difficulty += 5;
        enemySpeed += 5;
        level += 1;
        levelEl.innerHTML = 'Level ' + level;
        $('#level').css('display', 'block');

        setTimeout(function () {
            $('#level').css('display', 'none');
            var p = score;
            var lvs = lives;
            var l = level;
            var h = health;
            var ens = enemySpeed;
            init();
            health = h;
            level = l;
            score = p;
            lives = lvs;
            enemySpeed = ens;
        }, 2000);
    }