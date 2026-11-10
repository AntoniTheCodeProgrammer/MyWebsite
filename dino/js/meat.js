'use strict';

var MeatInventory = (function () {
    var storageKey = 'dino-inventory';
    var items = { meat: 0 };

    try {
        var savedItems = window.localStorage.getItem(storageKey);
        if (savedItems !== null) {
            var parsedItems = JSON.parse(savedItems);
            if (parsedItems && Number.isSafeInteger(parsedItems.meat) &&
                parsedItems.meat >= 0) {
                items.meat = parsedItems.meat;
            } else {
                console.error('Unable to load the saved Dino inventory: invalid data.');
            }
        }
    } catch (error) {
        console.error('Unable to load the saved Dino inventory.', error);
    }

    return {
        get: function (item) {
            return items[item] || 0;
        },

        add: function (item, quantity) {
            items[item] = (items[item] || 0) + quantity;

            try {
                window.localStorage.setItem(storageKey, JSON.stringify(items));
            } catch (error) {
                console.error('Unable to save the Dino inventory.', error);
            }
        }
    };
})();

/**
 * Spawns and updates collectible meat on the game canvas.
 * @param {!Runner} runner
 * @constructor
 */
function MeatManager(runner) {
    this.runner = runner;
    this.canvasCtx = runner.canvasCtx;
    this.image = new Image();
    this.imageLoaded = false;
    this.image.addEventListener('load', function () {
        this.imageLoaded = true;
    }.bind(this));
    this.image.addEventListener('error', function () {
        console.error('Unable to load the meat sprite.');
    });
    this.image.src = 'assets/default_100_percent/meatSheat.png';

    this.meat = null;
    this.spawnTimer = this.getSpawnDelay();
}

MeatManager.config = {
    FRAME_COUNT: 4,
    FRAME_DURATION: 150,
    HEIGHT: 32,
    MAX_SPAWN_DELAY: 9000,
    MIN_SPAWN_DELAY: 4000,
    WIDTH: 32
};

MeatManager.prototype = {
    getSpawnDelay: function () {
        return getRandomNum(MeatManager.config.MIN_SPAWN_DELAY,
            MeatManager.config.MAX_SPAWN_DELAY);
    },

    update: function (deltaTime, currentSpeed, canSpawn) {
        if (this.meat) {
            this.meat.xPos -= Math.floor((currentSpeed * FPS / 1000) * deltaTime);
            this.meat.frameTimer += deltaTime;
            if (this.meat.frameTimer >= MeatManager.config.FRAME_DURATION) {
                this.meat.frame = (this.meat.frame + 1) % MeatManager.config.FRAME_COUNT;
                this.meat.frameTimer = 0;
            }

            if (this.hasCollision()) {
                MeatInventory.add('meat', 1);
                this.runner.playSound(this.runner.soundFx.MEAT);
                this.meat = null;
                this.spawnTimer = this.getSpawnDelay();
            } else if (this.meat.xPos + MeatManager.config.WIDTH <= 0) {
                this.meat = null;
                this.spawnTimer = this.getSpawnDelay();
            }
        } else if (canSpawn) {
            this.spawnTimer -= deltaTime;
            if (this.spawnTimer <= 0) {
                this.meat = {
                    xPos: this.runner.dimensions.WIDTH,
                    yPos: this.runner.dimensions.HEIGHT - Runner.config.BOTTOM_PAD -
                        MeatManager.config.HEIGHT - 8,
                    frame: 0,
                    frameTimer: 0
                };
            }
        }

        this.draw();
    },

    hasCollision: function () {
        if (!this.meat) {
            return false;
        }

        var trex = this.runner.tRex;
        var meatBox = {
            x: this.meat.xPos,
            y: this.meat.yPos,
            width: MeatManager.config.WIDTH,
            height: MeatManager.config.HEIGHT
        };
        var trexBoxes = trex.ducking ?
            Trex.collisionBoxes.DUCKING : Trex.collisionBoxes.RUNNING;

        for (var i = 0; i < trexBoxes.length; i++) {
            var trexBox = trexBoxes[i];
            var boxX = trex.xPos + trexBox.x;
            var boxY = trex.yPos + trexBox.y;

            if (boxX < meatBox.x + meatBox.width &&
                boxX + trexBox.width > meatBox.x &&
                boxY < meatBox.y + meatBox.height &&
                boxY + trexBox.height > meatBox.y) {
                return true;
            }
        }

        return false;
    },

    draw: function () {
        if (!this.meat || !this.imageLoaded) {
            return;
        }

        this.canvasCtx.drawImage(this.image,
            this.meat.frame * MeatManager.config.WIDTH, 0,
            MeatManager.config.WIDTH, MeatManager.config.HEIGHT,
            this.meat.xPos, this.meat.yPos,
            MeatManager.config.WIDTH, MeatManager.config.HEIGHT);
    },

    reset: function () {
        this.meat = null;
        this.spawnTimer = this.getSpawnDelay();
    }
};
