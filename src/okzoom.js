/*
 * OKZoom by OKFocus v1.2
 * http://okfoc.us // @okfocus
 * Copyright 2012 OKFocus
 * Licensed under the MIT License
 *
 * Modified by Noone404
 * Repo: https://github.com/Noone-404/okzoom
 **/

$(function ($) {

    // Identify browser based on useragent string
    var browser = (function (ua) {
        ua = ua.toLowerCase();
        var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
            /(webkit)[ \/]([\w.]+)/.exec(ua) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
            /(msie) ([\w.]+)/.exec(ua) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
            [];
        var matched = {
            browser: match[1] || "",
            version: match[2] || "0"
        };
        browser = {};
        if (matched.browser) {
            browser[matched.browser] = true;
            browser.version = matched.version;
        }
        // Chrome is Webkit, but Webkit is also Safari.
        if (browser.chrome) {
            browser.webkit = true;
        } else if (browser.webkit) {
            browser.safari = true;
        }
        if (window.$) $.browser = browser;
        return browser;
    })(navigator.userAgent);

    var is_iphone = (navigator.userAgent.match(/iPhone/i)) || (navigator.userAgent.match(/iPod/i));
    var is_ipad = (navigator.userAgent.match(/iPad/i));
    var is_android = (navigator.userAgent.match(/Android/i));
    var is_mobile = is_iphone || is_ipad || is_android;
    var is_desktop = !is_mobile;
    var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    var transitionProp = browser.safari ? "WebkitTransition" : "transition";
    var transformProp = browser.safari ? "WebkitTransform" : "transform";
    var longTransformProp = browser.safari ? "-webkit-transform" : "transform";
    var transformOriginProp = browser.safari ? "WebkitTransformOrigin" : "transformOrigin";


    $.fn.okzoom = function (options) {
        options = $.extend({}, $.fn.okzoom.defaults, options);

        return this.each(function () {
            var base = {};
            var el = this;
            base.options = options;
            base.$el = $(el);
            base.el = el;


            var loupe = document.createElement("div");
            loupe.id = "ok-loupe";
            loupe.style.position = "absolute";
            loupe.style.backgroundRepeat = "no-repeat";
            loupe.style.pointerEvents = "none";
            loupe.style.opacity = 0;
            loupe.style.zIndex = 7879;
            $('body').append(loupe);
            base.loupe = loupe;

            base.$el.data("okzoom", base);

            base.options = options;

            if (is_mobile) {
                base.$el
                    .bind('touchstart', (function (b) {
                        return function (e) {
                            //console.log("TS", e);
                            e.preventDefault();
                            $.fn.okzoom.build(b, e.originalEvent.touches[0]);
                        };
                    }(base)))
                    .bind('touchmove', (function (b) {
                        return function (e) {
                            //console.log("TM");
                            e.preventDefault();
                            $.fn.okzoom.mousemove(b, e.originalEvent.touches[0]);
                        };
                    }(base)))
                    .bind('touchend', (function (b) {
                        return function (e) {
                            //console.log("TE");
                            e.preventDefault();
                            $.fn.okzoom.mouseout(b, e);
                        };
                    }(base)));
            }
            else {
                base.$el
                    .bind('mouseover', function (e) {
                        $.fn.okzoom.build($(this).data("okzoom"), e);
                    })
                    .bind('mousemove', function (e) {
                        $.fn.okzoom.mousemove($(this).data("okzoom"), e);
                    })
                    .bind('mouseout', function (e) {
                        $.fn.okzoom.mouseout($(this).data("okzoom"), e);
                    });
            }

            base.options.height = base.options.height || base.options.width;

            base.image_from_data = base.$el.data("okimage");
            base.has_data_image = typeof base.image_from_data !== "undefined";
            base.timeout = null;

            if (base.has_data_image) {
                base.img = new Image();
                base.img.src = base.image_from_data;
            }

            base.msie = -1; // Return value assumes failure.
            if (navigator.appName == 'Microsoft Internet Explorer') {
                var ua = navigator.userAgent;
                var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
                if (re.exec(ua) != null)
                    base.msie = parseFloat(RegExp.$1);
            }

            $(base.el).on('mousewheel', function (e) {
                var okZoom = $(this).data("okzoom");

                // If zoom not enabled or magnifier isn't showing don't do anything
                if (okZoom.options.zoom && e.shiftKey && parseInt($(loupe).css("opacity")) > 0) {
                    // Calculate & set new zoom level difference
                    // Default zoom step is 15
                    okZoom.setZoomLevel(
                        Math.max(
                            50,
                            Math.min(
                                1000,
                                (okZoom.options.scaleWidth ? okZoom.options.scaleWidth : 100)
                                + (e.deltaY ? e.deltaY : e.deltaX) * 15 * (is_chrome ? -1 : 1)
                            )
                        )
                    );

                    // Prevent page from scrolling
                    e.stopPropagation();
                    e.preventDefault();
                    e.cancelBubble = true;
                    return false;
                }
            });

            if (base.options.scrollContainer) {
                $(base.options.scrollContainer).scroll(function (b) {
                    return function (e) {
                        if (parseInt($(b.loupe).css("opacity")) > 0) {
                            $.fn.okzoom.mouseout(b, null);
                            $.fn.okzoom.build(b, null);
                        }
                    }
                }(base));
            }

            base.setZoomLevel = function (zoomLevel) {
                if (base.options.zoom)
                    $.fn.okzoom.setZoomLevel(base, zoomLevel);
            }
        });
    };

    $.fn.okzoom.defaults = {
        "width": 150,
        "height": null,
        "scaleWidth": null,
        "round": true,
        "background": "#fff",
        "backgroundRepeat": "no-repeat",
        "shadow": "0 0 5px #000",
        "inset": 0,
        "border": 0,
        "transform": is_mobile ? ["scale(0)", "scale(1)"] : null,
        "transformOrigin": is_mobile ? "50% 100%" : "50% 50%",
        "transitionTime": 200,
        "transitionTimingFunction": "cubic-bezier(0,0,0,1)",
        "zoom": false,
        "scrollContainer": null,
        "magnifierShown": null,
        "magnifierHidden": null
    };

    $.fn.okzoom.build = function (base, e) {
        if (!base.has_data_image) {
            base.img = base.el;
        }
        else if (base.image_from_data != base.$el.attr('data-okimage')) {
            // data() returns cached values, whereas attr() returns from the dom.
            base.image_from_data = base.$el.attr('data-okimage');

            $(base.img).remove();
            base.img = new Image();
            base.img.src = base.image_from_data;
        }

        if (base.msie > -1 && base.msie < 9.0 && !base.img.naturalized) {
            var naturalize = function (img) {
                img = img || this;
                var io = new Image();

                io.el = img;
                io.src = img.src;

                img.naturalWidth = io.width;
                img.naturalHeight = io.height;
                img.naturalized = true;
            };
            if (base.img.complete) naturalize(base.img);
            else return;
        }

        base.offset = base.$el.offset();
        base.width = base.$el.width();
        base.height = base.$el.height();

        if (base.options.scaleWidth) {
            base.naturalWidth = base.img.naturalWidth * base.options.scaleWidth / 100;
            base.naturalHeight = Math.round(base.img.naturalHeight * base.naturalWidth / base.img.naturalWidth);
        } else {
            base.naturalWidth = base.img.naturalWidth;
            base.naturalHeight = base.img.naturalHeight;
        }

        base.widthRatio = base.naturalWidth / base.width;
        base.heightRatio = base.naturalHeight / base.height;

        base.loupe.style.width = base.options.width + "px";
        base.loupe.style.height = base.options.height + "px";
        base.loupe.style.border = base.options.border;
        base.loupe.style.background = base.options.background + " url(" + base.img.src + ")";
        base.loupe.style.backgroundRepeat = base.options.backgroundRepeat;
        base.loupe.style.backgroundSize = base.options.scaleWidth ?
        base.naturalWidth + "px " + base.naturalHeight + "px" : "auto";
        base.loupe.style.borderRadius =
            base.loupe.style.MozBorderRadius =
                base.loupe.style.WebkitBorderRadius = base.options.round ? "50%" : 0;
        base.loupe.style.boxShadow = base.options.shadow;
        base.loupe.style.opacity = 0;
        if (base.options.transform) {
            base.loupe.style[transformProp] = base.options.transform[0];
            base.loupe.style[transformOriginProp] = base.options.transformOrigin;
            base.loupe.style[transitionProp] = longTransformProp + " " + base.options.transitionTime;
        }
        base.initialized = true;
        $.fn.okzoom.mousemove(base, e);
        if (e && base.options.magnifierShown) {
            base.options.magnifierShown(base);
        }
    };

    $.fn.okzoom.mousemove = function (base, e) {
        if (!base.initialized) return;
        if (!e) e = base.lastMoveEvent;
        if (!e) return;
        base.lastMoveEvent = e;

        var shimLeft = base.options.width / 2;
        var shimTop = base.options.height / 2;
        var offsetTop = is_mobile ? base.options.height : shimTop;
        var pageX = typeof e.pageX !== 'undefined'
            ? e.pageX
            : (e.clientX + document.documentElement.scrollLeft);
        var pageY = typeof e.pageY !== 'undefined'
            ? e.pageY
            : (e.clientY + document.documentElement.scrollTop);
        var scaleLeft = -1 * Math.floor((pageX - base.offset.left) * base.widthRatio - shimLeft);
        var scaleTop = -1 * Math.floor((pageY - base.offset.top) * base.heightRatio - shimTop);

        document.body.style.cursor = "none";
        // base.loupe.style.display = "block";
        base.loupe.style.left = pageX - shimLeft + "px";
        base.loupe.style.top = pageY - offsetTop + "px";
        base.loupe.style.backgroundPosition = scaleLeft + "px " + scaleTop + "px";
        base.loupe.style.opacity = 1;
        if (base.options.transform) {
            base.loupe.style[transformProp] = base.options.transform[1];
            base.loupe.style[transformProp] = base.options.transform[1];
            base.loupe.style[transitionProp] = longTransformProp + " " + base.options.transitionTime + "ms " + base.options.transitionTimingFunction;
        }
        clearTimeout(base.timeout);
    };

    $.fn.okzoom.mouseout = function (base, e) {
        // base.loupe.style.display = "none";
        if (base.options.transform) {
            base.loupe.style[transformProp] = base.options.transform[0];
            base.timeout = setTimeout(function () {
                base.loupe.style.opacity = 0;
            }, base.options.transitionTime);
        }
        else {
            base.loupe.style.opacity = 0;
        }

        document.body.style.cursor = "auto";
        if (e && base.options.magnifierHidden) {
            base.options.magnifierHidden(base);
        }
    };

    $.fn.okzoom.setZoomLevel = function (base, zoomLevel) {
        base.options.scaleWidth = zoomLevel;

        // update dom view
        $.fn.okzoom.mouseout(base, null);
        $.fn.okzoom.build(base, null);
    }
});
