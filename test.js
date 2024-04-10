let game;
let gameBackground;
const missiles = [];
class GameObject {
  constructor(x, y, width, height, sprite) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.sprite = sprite;
  }
  draw(context) {
    const image = new Image();
    image.src = this.sprite;
    context.drawImage(image, this.x, this.y, this.width, this.height);
  }
}
class Missile extends GameObject {
  constructor(x, y, targetX, targetY, speed, isEnemy = false) {
    super(x, y, 15, 30);
    this.targetX = targetX;
    this.targetY = targetY;
    this.speed = speed;
    this.isEnemy = isEnemy;
    this.isExploded = false;
    this.explosionRadius = 50;
    this.explosionFrames = [
      'resources/exp_1.svg',
      'resources/exp_2.svg',
      'resources/exp_3.svg',
      'resources/exp_4.svg',
      'resources/exp_5.svg',
      'resources/exp_6.svg',
      'resources/exp_7.svg',
      'resources/exp_8.svg',
      'resources/exp_9.svg',
      'resources/exp_10.svg',
      'resources/exp_11.svg',
      'resources/exp_12.svg'
    ];
    this.missileSprite = new Image();
    this.missileSprite.src = isEnemy ? 'resources/ms_en.svg' : 'resources/ms_pl.svg';
    this.currentFrameIndex = 0;
    this.explosionFrameDuration = 100;
    this.lastFrameChangeTime = 0;
    this.explosionComplete = false;
  }
  draw(context) {
    if (this.isExploded) {
      const currentFrame = this.explosionFrames[this.currentFrameIndex];
      const explosionImage = new Image();
      explosionImage.src = currentFrame;
      context.drawImage(explosionImage, this.x - this.explosionRadius, this.y - this.explosionRadius, this.explosionRadius * 2, this.explosionRadius * 2);
    } else {
      const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
      context.save();
      context.translate(this.x, this.y);
      context.rotate(angle + Math.PI / 2);
      context.drawImage(this.missileSprite, -this.width / 2, -this.height / 2, this.width, this.height);
      context.restore();
    }
  }
update() {
    if (!this.isExploded) {
      const angle = Math.atan2(this.targetY - this.y, this.targetX - this.x);
      this.x += this.speed * Math.cos(angle);
      this.y += this.speed * Math.sin(angle);
      if (this.isEnemy && this.y >= 800) {
        this.explode();
      } else {
        const distanceToTarget = Math.sqrt((this.targetX - this.x)**2 + (this.targetY - this.y)**2);
        if (distanceToTarget < this.speed) {
          this.explode();
        }
      }
    } else {
      this.updateExplosionAnimation();
    }
  }
  explode() {
    this.isExploded = true;
    this.lastFrameChangeTime = Date.now();
  }
  updateExplosionAnimation() {
    if (!this.explosionComplete) {
      const currentTime = Date.now();
      if (currentTime - this.lastFrameChangeTime > this.explosionFrameDuration) {
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.explosionFrames.length;
        this.lastFrameChangeTime = currentTime;
        if (this.currentFrameIndex === this.explosionFrames.length - 1) {
          this.explosionComplete = true;
        }
      }
    } else {
      this.destroy();
    }
  }
  destroy() {
    const missileIndex = missiles.indexOf(this);
    if (missileIndex !== -1) {
      missiles.splice(missileIndex, 1);
    }
    const enemyMissileIndex = game.enemyMissiles.indexOf(this);
    if (enemyMissileIndex !== -1) {
      game.enemyMissiles.splice(enemyMissileIndex, 1);
    }
  }
}
class Ground extends GameObject {
  constructor(x, y, width, height) {
    super(x, y, width, height, 'resources/ground.png');
  }
}
class Base extends GameObject {
  constructor(x, y) {
    super(x, y, 100, 100, 'resources/base_1.png');
    this.spriteReload = 'resources/base_2.png';
    this.isReloaded = true;
  }
  draw(context) {
    const baseImage = new Image();
    baseImage.src = this.isReloaded ? this.sprite : this.spriteReload;
    context.drawImage(baseImage, this.x, this.y, this.width, this.height);
  }
  updateReloadStatus(reloaded) {
    this.isReloaded = reloaded;
  }
}
class City extends GameObject {
  constructor(x, y) {
    super(x, y, 200, 100, 'resources/city_1.png');
    this.isDestroyed = false;
  }
  destroy() {
    this.isDestroyed = true;
    this.sprite = 'resources/ruins_1.png';
  }
  getHitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}
class MissileCommandGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.context = this.canvas.getContext('2d');
    this.backgroundImage = new Image();
    this.backgroundImage.src = 'resources/sky.png'
    this.enemyMissiles = [];
    this.cities = [
      new City(30, 700),
      new City(260, 700),
      new City(490, 700),
      new City(910, 700),
      new City(1140, 700),
      new City(1370, 700),
    ];
    this.score = 0;
    this.enemySpeed = 1;
    this.gameOver = false;
    this.base = new Base(750, 700);
    this.ground = new Ground(0, 800, this.canvas.width, 32);
    this.playerMissileCooldown = 1000;
    this.lastPlayerMissileTime = 0;
    this.canvas.removeEventListener('click', this.launchMissile.bind(this));
    this.canvas.addEventListener('click', this.launchMissile.bind(this));
    this.gameLoop();
    this.spawnEnemyMissile();
    this.scoreElement = document.createElement('div');
    this.scoreElement.id = 'score';
    this.scoreElement.innerText = 'Score: 0';
    this.canvas.parentNode.appendChild(this.scoreElement);
  }
  drawBackground() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(this.currentBackground, 0, 0, this.canvas.width, this.canvas.height);
  }
  drawGameScreen() {
    this.currentBackground = this.gameBackground;
    this.drawBackground();
  }
  increaseEnemySpeed() {
    if (this.enemySpeed < 3) {
      this.enemySpeed += 0.2;
    }
  }
  launchMissile(event) {
    const currentTime = Date.now();
    if (currentTime - this.lastPlayerMissileTime >= this.playerMissileCooldown) {
      const mouseX = event.clientX - this.canvas.getBoundingClientRect().left;
      const mouseY = event.clientY - this.canvas.getBoundingClientRect().top;
      const missile = new Missile(800, 750, mouseX, mouseY, 5);
      missiles.push(missile);
      this.base.updateReloadStatus(false);
      this.lastPlayerMissileTime = currentTime;
    }
  }
  spawnEnemyMissile() {
    const startX = Math.random() * this.canvas.width;
    const enemyMissile = new Missile(startX, 0, Math.random() * this.canvas.width, this.canvas.height, this.enemySpeed, true);
    this.enemyMissiles.push(enemyMissile);
    setTimeout(() => {
      this.spawnEnemyMissile();
    }, 2000);
  }
  updateMissiles() {
    const currentTime = Date.now();
    missiles.forEach(missile => {
      missile.update();
    });

    this.enemyMissiles.forEach(missile => {
      missile.update();
    });
    if (currentTime - this.lastPlayerMissileTime >= this.playerMissileCooldown) {
      this.base.updateReloadStatus(true);
    }
  }
  drawMissiles() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
    missiles.forEach(missile => {
      missile.draw(this.context);
    });

    this.enemyMissiles.forEach(missile => {
      missile.draw(this.context);
    });
  }
  checkCollisions() {
    missiles.forEach((playerMissile) => {
      this.enemyMissiles.forEach((enemyMissile, enemyIndex) => {
        if (!playerMissile.isExploded && !playerMissile.explosionComplete) {
          const distance = Math.sqrt((playerMissile.x - enemyMissile.x)**2 + (playerMissile.y - enemyMissile.y)**2);
          if (distance < playerMissile.explosionRadius) {
            this.enemyMissiles.splice(enemyIndex, 1);
            playerMissile.explode();
            this.score++;
            document.getElementById('score').innerText = `Score: ${this.score}`;
            if (this.score % 20 === 0) {
              this.increaseEnemySpeed();
            }
          }
        }
      });
    });
  }
  drawCities() {
    this.cities.forEach(city => {
      city.draw(this.context);
    });
    this.base.draw(this.context);
    this.ground.draw(this.context);
  }
  checkCityCollisions() {
    this.enemyMissiles.forEach((enemyMissile) => {
      this.cities.forEach((city) => {
        if (!city.isDestroyed) {
          const hitbox = city.getHitbox();
          if (
            enemyMissile.x > hitbox.x &&
            enemyMissile.x < hitbox.x + hitbox.width &&
            enemyMissile.y > hitbox.y &&
            enemyMissile.y < hitbox.y + hitbox.height
          ) {
            city.destroy();
            enemyMissile.explode()
          }
        }
      });
    });
  }
  showGameOverScreen() {
    if (this.gameOver) return;
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    document.getElementById('score').style.display = 'none';
    const canvas = document.getElementById('gameCanvas');
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gameOverBackground = new Image();
    gameOverBackground.src = 'resources/go_sc.png';
    gameOverBackground.onload = () => {
      context.drawImage(gameOverBackground, 0, 0, canvas.width, canvas.height);
      gameOverScreen.style.display = 'block';
      finalScoreElement.innerText = `Score: ${this.score}`;
    };
  }
  resetGame() {
    this.gameOver = false;
    this.score = 0;
    this.enemySpeed = 1;
    this.enemyMissiles = [];
    this.scoreElement.innerText = 'Score: 0';
    this.cities.forEach(city => {
      city.isDestroyed = false;
      city.sprite = 'resources/city_1.png';
    });
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
    this.gameLoop();
  }
  checkGameLost() {
    if (this.cities.every(city => city.isDestroyed)) {
      setTimeout(() => {
        this.showGameOverScreen();
        this.gameOver = true;
      }, 1300);
    }
  }
  gameLoop() {
    if (this.gameOver) return;
    this.updateMissiles();
    this.checkCollisions();
    this.checkCityCollisions();
    this.drawMissiles();
    this.drawCities();
    this.checkGameLost();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}
function menu() {
  const canvas = document.getElementById('gameCanvas');
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  const backgroundImage = new Image();
  backgroundImage.src = 'resources/st_sc.png';
  backgroundImage.onload = () => {
    context.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    gameBackground = backgroundImage;
  };
}
function startGame() {
  document.getElementById('startScreen').style.display = 'none';
  if (game != undefined) {
    playAgain();
  } else {
    game = new MissileCommandGame('gameCanvas');
  }
}
function playAgain() {
  game.resetGame();
}
function saveHighScore() {
  const playerNameInput = document.getElementById('playerName');
  const saveButton = document.getElementById('saveScore');
  const messageParagraph = document.getElementById('alert');
  const scoreData = document.getElementById('score');
  const score = scoreData.innerText
  playerNameInput.addEventListener('focus', function () {
    messageParagraph.innerText = '';
  });

  playerNameInput.addEventListener('blur', function () {
    const isValid = /^[a-zA-Z0-9]+$/.test(playerNameInput.value);
    if (!isValid) {
      messageParagraph.innerText = 'Symbols are not allowed.';
    } else {
      messageParagraph.innerText = '';
    }
  });
  saveButton.addEventListener('click', function () {
    const isValid = /^[a-zA-Z0-9]+$/.test(playerNameInput.value);
    if (!isValid) {
      messageParagraph.innerText = 'Invalid characters in input.';
      playerNameInput.focus();
    } else {
      const playerName = playerNameInput.value.trim();
      const highScore = {
        playerName,
        score,
      };
      console.log(highScore)
      // server side ნაწილი. ობიექტი წესით იგზავნება სერვერზე, JS არ აქვს წვდომა ფაილებზე
      messageParagraph.innerText =`High score saved for ${playerName}!`;
      playerNameInput.value = '';
      playerNameInput.blur();
    }
  });
}
async function showHighScores() {
  try {
    const response = await fetch('scores.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const scores = await response.json();
    const highScoresBody = document.getElementById('highScoresBody');
    highScoresBody.innerHTML = '';
    scores.forEach((score, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `<td>${index + 1}</td><td>${score.playerName}</td><td>${score.score}</td>`;
      highScoresBody.appendChild(row);
    });
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('highScoresScreen').style.display = 'block';
  } catch (error) {
    console.error('Error fetching high scores:', error);
  }
}
function goBack() {
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'block';
  menu();
}
function goBackScores() {
  document.getElementById('highScoresScreen').style.display = 'none';
  document.getElementById('startScreen').style.display = 'block';
}