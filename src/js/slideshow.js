(function(window, document, $, _, undefined) {
    "use strict";

    var defaults = {
        actionDelay: 300,
        prefix: 'slideshow-',
        autostart: false,
        stopAfterFrame: false
    };

    function Layer($elem, params) {
        this.moveTo = function(coords) {
            var dfd = new $.Deferred(),
                targetX,
                targetY,
                $target;

            if (_.isArray(coords)) {
                targetX = coords[0];
                targetY = coords[1];
            } else {
                $target = $(coords);
                targetX = $target.position().left;
                targetY = $target.position().top;
            }

            $elem.animate({
                top: targetX + 'px',
                left: targetY + 'px'
            }, 1000, function() {
                console.log('move ended');
                dfd.resolve();
            });

            return dfd.promise();
        };

        this.typeText = function(text) {
            var dfd = new $.Deferred();

            console.log('type started');

            setTimeout(function() {
                console.log('type ended');
                dfd.resolve();
            }, 1000);

            return dfd.promise();
        };

        this.focus = function() {
            $elem.addClass('focused');
        };

        this.blur = function() {
            $elem.removeClass('focused');
        };

        this.click = function() {
            console.log('click');
            $elem.addClass('clicked');
        }
    }

    $.Slideshow = function($root, options) {
        var that = this,
            slideshowData = $root.data();

        this.currentFrame = 0;
        this.$frames = $root.find('.' + options.prefix + 'frame');
        this.elems = {};
        this.scenario = [];

        this.played = false;

        slideshowData.slideshow = this;

        this._createScenario = function() {
            this.$frames.each(function(index, elem) {
                that.scenario.push(that._getFrameActions(elem));
            });
        };

        this._getFrameActions = function(frame) {
            var rawParams = this._extractParams(frame),
                steps = _.map(rawParams, this._parseStep, this);

            return steps;
        };

        this._parseStep = function(step) {
            var that = this,
                elem,
                result = [];

            _.forEach(step, function(actions, layerName) {
                if (layerName in that.elems) {
                    elem = that.elems[layerName];
                } else {
                    elem = new Layer($root.find('.' + layerName), {});
                    that.elems[layerName] = elem;
                }

                result.push(this._parseActions(elem, actions));
            }, this);

            return result;
        };

        this._parseActions = function(object, actions) {
            var fnArray = _.map(actions, function(action) {
                var fn,
                    args;

                if (_.isArray(action)) {
                    fn = action[0];
                    args = action[1];
                } else {
                    fn = action;
                }

                return function() {
                    return object[fn](args);
                }
            });

            return fnArray;
        };

        this._extractParams = function(elem) {
            var fn = elem.onclick || elem.ondblclick;

            return fn ? fn() : {};
        };

        this._runFrame = function(steps) {
            var dfd = new $.Deferred(),
                that = this;

            $.when(_.reduce(steps, function (prev, current) {
                    return $.when(prev).then(function () {
                        return that._runStep(current);
                    });
                }, []))
                .then(function () {
                    $root.trigger('complete', {
                        frame: that.currentFrame
                    });

                    if (!options.stopAfterFrame) {
                        that.next();
                    } else {
                        that.played = false;
                    }
                });

            return dfd.promise();
        };

        this._runStep = function(layers) {
            var that = this,
                dfd = new $.Deferred();

            $.when.apply($, _.map(layers, function (step) {
                    return this._runActions(step);
                }, that))
                .then(function () {
                    dfd.resolve();
                });

            return dfd.promise();
        };

        this._runActions = function(actions) {
            var dfd = new $.Deferred(),
                chain;

            chain = _.reduce(actions, function(prev, current) {
                return $.when(prev).then(current);
            }, $.noop, that);

            $.when(chain).then(function() {
                dfd.resolve();
            });

            return dfd.promise();
        };

        this.start = function() {
            var actions = this.scenario[this.currentFrame];

            this.played = true;
            this._runFrame(actions);
        };

        this.stop = function() {

        };

        this.goTo = function(frameNumber) {
            var actions;

            if (this.currentFrame !== frameNumber) {
                this.currentFrame = frameNumber;
            }

            actions = this.scenario[frameNumber];
            this._runFrame(actions);
        };

        this.next = function() {
            this.currentFrame++;

            if (this.currentFrame < this.scenario.length) {
                this.goTo(this.currentFrame);
            } else {
                this.currentFrame = 0;
            }
        };

        this.prev = function() {
            if (this.currentFrame > 0) {
                this.currentFrame--;
                this.goTo(this.currentFrame);
            }
        };

        this.init = function() {
            this._createScenario();

            if (options.autostart) {
                this.start();
            }
        };
    };

    $.fn.slideshow = function(options) {
        return this.each(function() {
            var $slideshow = $(this),
                slideshowData = $slideshow.data();

            return new $.Slideshow($slideshow, $.extend({}, defaults, options, slideshowData)).init();
        });
    }
})(window, document, jQuery, _, undefined);
