(function(window, document, $, _, undefined) {
    "use strict";

    // Лучше пока это не использовать. Андер констракшн, все дела
    var defaults = {
        actionDelay: 300,
        prefix: 'screencast-',
        autostart: false,
        stopAfterFrame: false
    };

    function calculateDistance(x, y) {
        return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    }

    function Layer($elem, params) {
        var $BODY = $('body'),
            defaults = {
                offsetx: 0,
                offsety: 0,
                moveSpeed: 200,
                easing: 'easeInCubicOutSine'
            };

        this._stopped = false;
        this._paused = false;
        this._left = parseInt($elem.css('left')) || 0;
        this._right = parseInt($elem.css('right')) || 0;
        this._top = parseInt($elem.css('top')) || 0;
        this._bottom = parseInt($elem.css('bottom')) || 0;
        this._opacity = $elem.css('opacity');
        this._text = $elem.text();
        this.params = $.extend({}, defaults, params);
        this.elemData = $elem.data();

        this.pause = function() {
            if (!this._paused) {
                $elem.trigger('layer.pause');
                this._paused = true;
            }
        };

        this.resume = function() {
            if (this._paused) {
                $elem.trigger('layer.resume');
                this._paused = false;
            }
        };

        this.stopAction = function() {
            if (!this._stopped) {
                $elem.trigger('layer.stop');
                this._paused = false;
                this._stopped = true;
            }
        };

        this.play = function() {
            this._stopped = false;
            this._paused = false;
        };

        this._getCoords = function(coords) {
            var x,
                y,
                $target;

            if (_.isArray(coords)) {
                return coords;
            } else {
                if (coords[0] !== '.' && coords[0] !== "#") {
                    $target = this.params.root.find('.' + coords);
                } else {
                    $target = $(coords);
                }

                x = $target.position().left + ($target.outerWidth(true) / 2) - this.params.offsetx;
                y = $target.position().top + ($target.outerHeight(true) / 2) - this.params.offsety;

                return [x, y];
            }
        };

        this.moveTo = function(coords, params) {
            var that = this,
                dfd = new $.Deferred(),
                x = $elem.position().left,
                y = $elem.position().top,
                duration,
                speed,
                easing,
                action;

            coords = this._getCoords(coords);
            params = params || {};

            speed = params.moveSpeed || defaults.moveSpeed;

            duration = params.duration || calculateDistance(coords[0] - x, coords[1] - y) / speed * 1000;
            easing = params.easing || defaults.easing;

            action = function() {
                $elem.animate({
                        top: coords[1] + 'px',
                        left: coords[0] + 'px'
                    },
                    duration,
                    easing,
                    function() {
                        $elem.off('layer.resume', action);
                        dfd.resolve();
                    });
            };

            $elem.on('layer.pause', function() {
                $elem.stop();
            });

            $elem.on('layer.resume', action);

            $elem.on('layer.stop', function() {
                $elem.stop();
                $elem.css({
                    left: that._left,
                    top: that._top
                });

                $elem.off('layer.resume', action);
                dfd.reject();
            });

            action();

            return dfd.promise();
        };

        this.circleAround = function(coords, params) {
            var dfd = new $.Deferred(),
                that = this,
                r,
                angle = 0,
                easing,
                duration,
                action;

            coords = this._getCoords(coords);
            params = params || {};

            easing = params.easing || defaults.easing;
            duration = params.duration || 1500;
            r = params.radius || 20;

            action = function() {
                that.moveTo([coords[0], coords[1] + r])
                    .then(function () {
                        $elem.animate({
                            angle: 360
                        }, {
                            duration: duration,
                            easing: easing,
                            step: function (val) {

                                angle = val / 180 * Math.PI;

                                // считаем новые координаты
                                $elem.css('left', coords[0] + Math.sin(angle) * r);
                                $elem.css('top', coords[1] + Math.cos(angle) * r);
                            },
                            complete: function () {
                                $elem[0].angle = 0;

                                $elem.off('layer.resume', action);
                                dfd.resolve();
                            }
                        });
                    });
            };

            $elem.on('layer.resume', action);

            $elem.on('layer.pause', function() {
                $elem.stop();
            });

            $elem.on('layer.stop', function() {
                $elem[0].angle = 0;
                $elem.stop();
                $elem.css({
                    left: that._left,
                    top: that._top
                });

                $elem.off('layer.resume', action);
                dfd.reject();
            });

            action();

            return dfd.promise();
        };

        this.typeText = function(text, params) {
            var dfd = new $.Deferred(),
                that = this,
                interval,
                overflow,
                defaults = {
                    'mask': false
                },
                $dummy = $("<div />"),
                $textField = $elem.find(".type-text").length && $elem.find(".type-text") || $elem,
                currentText = "",
                fieldWidth = $textField.width();

            params = $.extend({}, defaults, params);

            $dummy.css({
                'position': 'absolute',
                'left': '-2000px',
                'top': '-2000px',
                'visibility': 'hidden',
                'font-size': $elem.css('font-size')
            });

            $dummy.appendTo($BODY);
            $elem.addClass('typed');

            interval = setInterval(function() {

                if (that._paused) {
                    return;
                }

                if (text.length) {
                    $textField.text(function(index, content) {
                        if (!params.mask) {
                            currentText = content + text[0];
                        } else {
                            currentText = content + "•";
                        }
                        text = text.substr(1);
                        return currentText;
                    });
                    $dummy.text(currentText);
                    overflow = $dummy.width() - fieldWidth;

                    if (overflow > 0 && !that.elemData.noindent) {
                        $textField.css('text-indent', '-' + (overflow + 2) + 'px');
                    }
                } else {
                    $dummy.remove();
                    $elem.removeClass('typed');
                    $textField.animate({'text-indent': 0});
                    clearInterval(interval);
                    dfd.resolve();
                }
            }, 100);

            $elem.on('layer.stop', function() {
                $dummy.remove();
                clearInterval(interval);
                $elem.removeClass('typed');
                $textField.text(that._text);
                dfd.reject();
            });

            return dfd.promise();
        };

        this.popup = function(method, params) {
            var dfd = new $.Deferred(),
                x,
                y,
                $popup,
                classNames,
                duration,
                action;

            params = params || {};

            duration = params.duration || 400;
            classNames = params.extraClasses || [];
            classNames.push('popup-' + params.position);

            action = function() {
                if (method === 'show') {
                    $popup = $('<div class="popup"><div class="popup-arrow"></div><div class="popup-content">' + params.text  + '</div></div>');

                    $popup.addClass(classNames.join(" ")).appendTo($elem);
                    $popup.css({'opacity': 0, display: 'block'});

                    switch(params.position) {
                        case 'top':
                            x = params.coords[0] - $popup.width() / 2;
                            y = params.coords[1] - $popup.height();

                            break;

                        case 'bottom':
                            x = params.coords[0] - $popup.width() / 2;
                            y = params.coords[1];

                            break;

                        case 'left':
                            x = params.coords[0] - $popup.width();
                            y = params.coords[1] - $popup.height() / 2;

                            break;

                        case 'right':
                            x = params.coords[0];
                            y = params.coords[1] - $popup.height() / 2;

                            break;
                    }

                    $popup
                        .css({
                            left: x,
                            top: y
                        })
                        .animate({
                            opacity: 1
                        },
                        duration,
                        function () {
                            $elem.off('layer.resume', action);
                            dfd.resolve()
                        });
                } else {
                    $elem
                        .find('.popup')
                        .animate({
                            'opacity': 0
                        },
                        duration,
                        function() {
                            $(this).remove();
                            $elem.off('layer.resume', action);
                            dfd.resolve();
                        });
                }
            };

            $elem.on('layer.stop', function() {
                $elem.find('.popup').remove();
                $elem.off('layer.resume', action);
                dfd.reject();
            });

            $elem.on('layer.pause', function() {
                $elem.stop();
            });

            $elem.on('layer.resume', action);

            action();

            return dfd.promise();
        };

        this.fadeTo = function(opacity, duration, easing) {
            var dfd = $.Deferred(),
                that = this,
                action;

            duration = duration || 400;

            action = function() {
                $elem.fadeTo(duration, opacity, function() {
                    $elem.off('layer.resume', action);
                    dfd.resolve();
                });
            };

            $elem.on('layer.stop', function() {
                $elem.css('opacity', that._opacity);
                $elem.off('layer.resume', action);
                dfd.reject();
            });

            $elem.on('layer.pause', function() {
                $elem.stop();
            });

            $elem.on('layer.resume', action);

            action();

            return dfd.promise();
        };

        this.wait = function(delay) {
            var dfd = $.Deferred(),
                timeout,
                action;

            action = function() {
                timeout = setTimeout(function() {
                    $elem.off('layer.resume', action);
                    dfd.resolve();
                }, delay);
            };

            $elem.on('layer.stop', function() {
                clearTimeout(timeout);
                $elem.off('layer.resume', action);
                dfd.reject();
            });

            $elem.on('layer.pause', function() {
                clearTimeout(timeout);
            });

            $elem.on('layer.resume', action);

            action();

            return dfd.promise();
        };

        this.click = function() {
            var dfd = $.Deferred(),
                timeout,
                action,
                $clicker = $('<div class="cursor-click"></div>');

            action = function() {
                $elem.append($clicker);
                timeout = setTimeout(function() {
                    $clicker.remove();
                    dfd.resolve();
                }, 500);
            };

            $elem.on('layer.stop', function() {
                clearTimeout(timeout);
                $clicker.remove();
                dfd.reject();
            });

            $elem.on('layer.pause', function() {
                $clicker.remove();
                clearTimeout(timeout);
            });

            $elem.on('layer.resume', action);

            action();

            return dfd.promise();
        };

        this.addClass = this.setClass = function(className) {
            $elem.addClass(className);

            $elem.on('layer.stop', function() {
                $elem.removeClass(className);
            });
        };

        this.removeClass = this.deleteClass = function(className) {
            $elem.removeClass(className);
        };
    }

    $.Screencast = function($root, options) {
        var that = this,
            screencastData = $root.data();

        this.currentFrame = 0;
        this.$frames = $root.find('.' + options.prefix + 'frame');
        this.elems = {};
        this.scenario = [];
        this._played = false;
        this._bump = $root.html();

        screencastData.screencast = this;

        this._createScenario = function() {
            if (screencastData.skip) {
                return;
            }
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
                $layer,
                elem,
                params,
                result = [];

            _.forEach(step, function(actions, layerName) {
                if (layerName in that.elems) {
                    elem = that.elems[layerName];
                } else {
                    if (layerName.indexOf(".") === 0 || layerName.indexOf("#") === 0) {
                        $layer = $(layerName);
                    } else {
                        $layer = $root.find('.' + layerName);
                    }
                    params = $.extend({}, $layer.data(), {root: $root});
                    elem = new Layer($layer, params);
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
                        args = action.slice(1) || [];
                    } else {
                        fn = action;
                        args = [];
                    }

                    return function () {
                        $root.on('stop', function() {
                            object.stopAction();
                        });

                        $root.on('pause', function() {
                            object.pause();
                        });

                        $root.on('resume', function() {
                            object.resume();
                        });

                        $root.on('play', function() {
                            object.play();
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

            if (!this._played) {
                this._played = true;
                this._runFrame(actions);
                $root
                    .trigger('play')
                    .removeClass('screencast-paused');
            }
        };

        this.pause = function() {
            $root
                .trigger('pause')
                .addClass('screencast-paused');
            this._played = false;
        };

        this.resume = function() {
            this._played = true;
            $root
                .trigger('resume')
                .removeClass('screencast-paused');
        };

        this.stop = function() {
            $root.trigger('stop');
            this._played = false;
            $root.html(this._bump);
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
