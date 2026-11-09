'use strict';

/**
 * Projectile class.
 * Sprite-based shot from Dino's head.
 * @param {number} x
 * @param {number} y
 * @param {number} opt_speed
 * @param {number} opt_size
 * @constructor
 */
function Projectile(x, y, opt_speed, opt_size) {
    this.x = x;
    this.y = y;
    this.size = opt_size || Projectile.config.SIZE;
    this.speed = opt_speed || Projectile.config.SPEED;
    this.remove = false;
}

Projectile.config = {
    SIZE: 8,
    SPEED: 12
};

Projectile.image = new Image();
Projectile.image.addEventListener('error', function () {
    console.error('Unable to load the projectile sprite.');
});
Projectile.image.src = 'assets/default_100_percent/projectile.png';

Projectile.prototype = {
    /**
     * Update projectile position.
     * @param {number} deltaTime
     * @param {number} canvasWidth
     */
    update: function (deltaTime, canvasWidth) {
        this.x += Math.floor((this.speed * FPS / 1000) * deltaTime);
        if (this.x > canvasWidth) {
            this.remove = true;
        }
    },

    /**
     * Draw the projectile sprite on canvas.
     * @param {CanvasRenderingContext2D} canvasCtx
     */
    draw: function (canvasCtx) {
        if (Projectile.image.complete && Projectile.image.naturalWidth) {
            canvasCtx.drawImage(Projectile.image,
                Math.round(this.x), Math.round(this.y),
                this.size, this.size);
        }
    },

    /**
     * Return bounding box for collision detection.
     * @return {CollisionBox}
     */
    getCollisionBox: function () {
        return new CollisionBox(this.x, this.y, this.size, this.size);
    }
};

/**
 * SkillManager handles skills registration, cooldowns, casting,
 * active projectiles updates and collision with obstacles.
 * @param {Runner} runner
 * @constructor
 */
function SkillManager(runner) {
    this.runner = runner;
    this.projectiles = [];
    this.skills = {};
    this.init();
}

SkillManager.prototype = {
    /**
     * Initialize default skills.
     */
    init: function () {
        // Podstawowy spell: strzał pod klawisz 'z' / 'Z'
        this.registerSkill('shot', {
            key: 'KeyZ',
            keyCode: 90,
            cooldown: 250, // ms
            lastUsed: 0,
            cast: this.castShot.bind(this)
        });
    },

    /**
     * Register a new skill.
     * @param {string} name
     * @param {Object} config
     */
    registerSkill: function (name, config) {
        this.skills[name] = config;
    },

    /**
     * Cast the shot skill.
     * Creates a projectile launched from Dino's head level.
     */
    castShot: function () {
        var tRex = this.runner.tRex;
        if (!tRex) return;

        // Uruchomienie animacji ataku (2 klatki z końca spritesheetu)
        if (typeof tRex.startAttack === 'function') {
            tRex.startAttack();
        }

        // Wylot z przodu pyska Dino
        var startX = tRex.xPos + Trex.config.WIDTH - 4;

        // Wysokość dopasowana do pyska Dino
        var startY = tRex.yPos + 8;

        // Pocisk leci szybciej niż obecna prędkość horyzontu
        var projectileSpeed = Math.max(12, this.runner.currentSpeed + 6);
        var projectile = new Projectile(startX, startY, projectileSpeed);
        this.projectiles.push(projectile);
    },

    /**
     * Handle key down event to trigger bound skills.
     * @param {KeyboardEvent} e
     */
    handleKeyDown: function (e) {
        if (!this.runner.playing || this.runner.crashed) {
            return;
        }

        var now = getTimeStamp();
        for (var skillName in this.skills) {
            var skill = this.skills[skillName];
            if (e.code === skill.key || e.keyCode === skill.keyCode ||
                (skill.key === 'KeyZ' && (e.key === 'z' || e.key === 'Z'))) {
                if (now - skill.lastUsed >= skill.cooldown) {
                    skill.lastUsed = now;
                    skill.cast();
                }
                break;
            }
        }
    },

    /**
     * Update all active projectiles, draw them and test collision with obstacles.
     * @param {number} deltaTime
     */
    update: function (deltaTime) {
        var canvasCtx = this.runner.canvasCtx;
        var canvasWidth = this.runner.dimensions.WIDTH;
        var obstacles = this.runner.horizon ? this.runner.horizon.obstacles : [];

        for (var i = this.projectiles.length - 1; i >= 0; i--) {
            var proj = this.projectiles[i];
            proj.update(deltaTime, canvasWidth);
            proj.draw(canvasCtx);

            var projBox = proj.getCollisionBox();
            var hit = false;

            // Sprawdzenie kolizji z przeszkodami na planszy
            for (var j = 0; j < obstacles.length; j++) {
                var obs = obstacles[j];
                var obsBox = new CollisionBox(
                    obs.xPos + 1,
                    obs.yPos + 1,
                    obs.typeConfig.width * obs.size - 2,
                    obs.typeConfig.height - 2
                );

                if (boxCompare(projBox, obsBox)) {
                    // Trafienie: usuń przeszkodę z gry i oznacz pocisk do usunięcia
                    this.runner.horizon.removeObstacle(obs);
                    hit = true;
                    break;
                }
            }

            if (hit || proj.remove) {
                this.projectiles.splice(i, 1);
            }
        }
    },

    /**
     * Reset active projectiles and cooldowns.
     */
    reset: function () {
        this.projectiles = [];
        for (var skillName in this.skills) {
            this.skills[skillName].lastUsed = 0;
        }
    }
};
