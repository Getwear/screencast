(function(window, document, $, _, undefined) {
    "use strict";

    var defaults = {
        actionDelay: 300,
        prefix: 'screencast-',
        autostart: false,
        stopAfterFrame: false,
        moveSpeed: 100
    };

    function calculateDistance(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    function Layer($elem, params) {
        var $BODY = $('body');
        this.stopped = false;

        this.stopAction = function() {
            if (!this.stopped) {
                $elem.trigger('stopAction');
                this.stopped = true;
            }
        };

        this.moveTo = function(coords, params) {
            var dfd = new $.Deferred(),
                x = $elem.position().left,
                y = $elem.position().top,
                targetX,
                targetY,
                $target,
                selector,
                duration;

            params = params || {};

            if (_.isArray(coords)) {
                targetX = coords[0];
                targetY = coords[1];
            } else {
                if (coords[0] !== '.' && coords[0] !== "#") {
                    selector = '.' + coords;
                } else {
                    selector = coords;
                }

                $target = $(selector);
                targetX = $target.position().left + ($target.width() / 2);
                targetY = $target.position().top + ($target.height() / 2);
            }

            duration = params.duration || calculateDistance(targetX - x, targetY - y) / defaults.moveSpeed * 1000;

            $elem.animate({
                top: targetY + 'px',
                left: targetX + 'px'
            }, duration, function() {
                dfd.resolve();
            });

            $elem.on('stopAction', function() {
                $elem.stop(true);

                dfd.reject();
            });

            return dfd.promise();
        };

        this.typeText = function(text, params) {
            var dfd = new $.Deferred(),
                interval,
                overflow,
                defaults = {
                    'mask': false
                },
                immediatelyStop = false,
                $dummy = $("<div />").appendTo($BODY);

            params = $.extend({}, defaults, params);

            interval = setInterval(function() {

                $dummy.css({
                    'position': 'absolute',
                    'left': '-2000px',
                    'visibility': 'hidden'
                });

                $elem.addClass('typed');

                if (text.length && !immediatelyStop) {
                    $elem.text(function(index, content) {
                        if (!params.mask) {
                            content += text[0];
                        } else {
                            content += "•";
                        }
                        text = text.substr(1);
                        return content;
                    });
                    $dummy.text($elem.text());
                    overflow = $dummy.width() - $elem.width();

                    if (overflow > 0) {
                        $elem.css('text-indent', '-' + (overflow + 2) + 'px');
                    }
                } else {
                    $dummy.remove();
                    $elem.
                        removeClass('typed').
                        animate({'text-indent': 0});
                    clearInterval(interval);
                    dfd.resolve();
                }
            }, 100);

            $elem.on('stopAction', function() {
                immediatelyStop = true;
                dfd.reject();
            });

            return dfd.promise();
        };

        this.fadeTo = function(duration, opacity, easing) {
            var dfd = $.Deferred();

            if (typeof opacity === 'undefined') {
                opacity = duration;
                duration = 400;
            }

            $elem.fadeTo(duration, opacity, function() {
                dfd.resolve();
            });

            $elem.on('stopAction', function() {
                dfd.reject();
            });

            return dfd.promise();
        };

        this.wait = function(delay) {
            var dfd = $.Deferred(),
                timeout;

            timeout = setTimeout(function() {
                dfd.resolve();
            }, delay);

            $elem.on('stopAction', function() {
                clearTimeout(timeout);
                dfd.reject();
            });

            return dfd.promise();
        };

        this.click = function() {
            var dfd = $.Deferred(),
                timeout;

            $elem.addClass('cursor-click');
            timeout = setTimeout(function() {
                $elem.removeClass('cursor-click');
                dfd.resolve();
            }, 500);

            $elem.on('stopAction', function() {
                clearTimeout(timeout);
                $elem.removeClass('cursor-click');
                dfd.reject();
            });

            return dfd.promise();
        };

        this.addClass = this.setClass = function(className) {
            $elem.addClass(className);
        };

        this.removeClass = this.deleteClass = function(className) {
            $elem.removeClass(className);
        }
    }

    $.Screencast = function($root, options) {
        var that = this,
            screencastData = $root.data();

        this.currentFrame = 0;
        this.$frames = $root.find('.' + options.prefix + 'frame');
        this.elems = {};
        this.scenario = [];
        this._played = false;

        screencastData.screencast = this;

        this._createScenario = function() {
            if (this.$frames.length) {
                this.$frames.each(function(index, elem) {
                    that.scenario.push(that._getFrameActions(elem));
                });
            } else {
                that.scenario.push(that._getFrameActions($root[0]));
            }
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
            var that = this,
                fnArray = _.map(actions, function (action) {
                    var fn,
                        args;

                    if (_.isArray(action)) {
                        fn = action[0];
                        args = action.slice(1);
                    } else {
                        fn = action;
                    }

                    return function () {
                        $root.on('stop', function() {
                            object.stopAction();
                        });

                        return object[fn].apply(object, args);
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
                        that._played = false;
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
            }, $.noop);

            $.when(chain).then(function() {
                dfd.resolve();
            });

            return dfd.promise();
        };

        this.start = function() {
            var actions = this.scenario[this.currentFrame];

            this._played = true;
            this._runFrame(actions);
        };

        this.stop = function() {
            $root.trigger('stop');
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

        this.status = function() {
            if (this._played) {
                return "played";
            } else {
                if (this.currentFrame === 0) {
                    return "stopped";
                } else {
                    return "paused";
                }
            }
        };

        this.init = function() {
            this._createScenario();

            if (options.autostart) {
                this.start();
            }
        };
    };

    $.fn.screencast = function(options) {
        return this.each(function() {
            var $screencast = $(this),
                screencastData = $screencast.data();

            return new $.Screencast($screencast, $.extend({}, defaults, options, screencastData)).init();
        });
    }
})(window, document, jQuery, _, undefined);
