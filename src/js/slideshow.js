(function(window, document, $, _, undefined) {
    var defaults = {
        actionDelay: 300,
        prefix: 'slideshow-',
        autostart: false
    };

    function Layer($elem, params) {
        var that = this;

        this.moveTo = function(coords) {
            var dfd = new $.Deferred();
            var targetX;
            var targetY;
            var $target;

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
            }, 1000, dfd.resolve);

            return dfd.promise();
        };

        this.typeText = function(text) {
            var dfd = new $.Deferred();

            console.log('typing started');

            setTimeout(function() {
                console.log('typing ended');
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
            $elem.addClass('clicked');
        }
    }

    $.Slideshow = function($root, options) {
        var that = this;
        var slideshowData = $root.data();
        var slideshow = $root[0];

        this.currentFrame = 0;
        this.$frames = $root.find('.' + options.prefix + 'frame');
        this.elems = {};
        this.scenario = [];

        slideshowData.slideshow = this;

        this._createScenario = function() {
            this.$frames.each(function(index, elem) {
                that.scenario.push(that._extractParams(elem));
            });
        };

        this._extractParams = function(elem) {
            var fn = elem.onclick || elem.ondblclick;

            return fn ? fn() : {};
        };

        this.start = function() {
            var that = this;
            var actions = this.scenario[this.currentFrame];

            _.forEach(actions, function(action) {
                _.forEach(action, function(actions, object) {
                    var elem;
                    var dfd = new $.Deferred();
                    var actionsList;

                    if (object in that.elems) {
                        elem = that.elems[object];
                    } else {
                        elem = new Layer($root.find('.' + object), {});
                        that.elems[object] = elem;
                    }

                    actionsList = _.map(actions, function(actionName) {
                        var fn;
                        var args;
                        if (_.isArray(actionName)) {
                            fn = actionName[0];
                            args = actionName[1];
                        } else {
                            fn = actionName;
                        }

                        return {
                            fn: elem[fn] || function() {},
                            args: args
                        };
                    });

                    _.reduce(actionsList, function(prev, current) {
                        $.when(prev.fn.call(elem, prev.args)).then(current.fn.call(elem, current.args));
                        return current;
                    }, {fn: function(){}});

                    $.when.apply(actionsList).then(function() {
                        console.log('done');
                    });

                    return dfd.promise();
                });
            });
        };

        this.stop = function() {

        };

        this.goTo = function() {

        };

        this.next = function() {

        };

        this.prev = function() {

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
            var that = this;
            var $slideshow = $(this);
            var slideshowData = $slideshow.data();

            return new $.Slideshow($slideshow, $.extend({}, defaults, options, slideshowData)).init();
        });
    }
})(window, document, jQuery, _, undefined);
