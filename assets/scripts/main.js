(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}

module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;
},{}],2:[function(require,module,exports){
(function(window, factory) {
	var lazySizes = factory(window, window.document, Date);
	window.lazySizes = lazySizes;
	if(typeof module == 'object' && module.exports){
		module.exports = lazySizes;
	}
}(typeof window != 'undefined' ?
      window : {}, 
/**
 * import("./types/global")
 * @typedef { import("./types/lazysizes-config").LazySizesConfigPartial } LazySizesConfigPartial
 */
function l(window, document, Date) { // Pass in the window Date function also for SSR because the Date class can be lost
	'use strict';
	/*jshint eqnull:true */

	var lazysizes,
		/**
		 * @type { LazySizesConfigPartial }
		 */
		lazySizesCfg;

	(function(){
		var prop;

		var lazySizesDefaults = {
			lazyClass: 'lazyload',
			loadedClass: 'lazyloaded',
			loadingClass: 'lazyloading',
			preloadClass: 'lazypreload',
			errorClass: 'lazyerror',
			//strictClass: 'lazystrict',
			autosizesClass: 'lazyautosizes',
			fastLoadedClass: 'ls-is-cached',
			iframeLoadMode: 0,
			srcAttr: 'data-src',
			srcsetAttr: 'data-srcset',
			sizesAttr: 'data-sizes',
			//preloadAfterLoad: false,
			minSize: 40,
			customMedia: {},
			init: true,
			expFactor: 1.5,
			hFac: 0.8,
			loadMode: 2,
			loadHidden: true,
			ricTimeout: 0,
			throttleDelay: 125,
		};

		lazySizesCfg = window.lazySizesConfig || window.lazysizesConfig || {};

		for(prop in lazySizesDefaults){
			if(!(prop in lazySizesCfg)){
				lazySizesCfg[prop] = lazySizesDefaults[prop];
			}
		}
	})();

	if (!document || !document.getElementsByClassName) {
		return {
			init: function () {},
			/**
			 * @type { LazySizesConfigPartial }
			 */
			cfg: lazySizesCfg,
			/**
			 * @type { true }
			 */
			noSupport: true,
		};
	}

	var docElem = document.documentElement;

	var supportPicture = window.HTMLPictureElement;

	var _addEventListener = 'addEventListener';

	var _getAttribute = 'getAttribute';

	/**
	 * Update to bind to window because 'this' becomes null during SSR
	 * builds.
	 */
	var addEventListener = window[_addEventListener].bind(window);

	var setTimeout = window.setTimeout;

	var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

	var requestIdleCallback = window.requestIdleCallback;

	var regPicture = /^picture$/i;

	var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

	var regClassCache = {};

	var forEach = Array.prototype.forEach;

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var hasClass = function(ele, cls) {
		if(!regClassCache[cls]){
			regClassCache[cls] = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		}
		return regClassCache[cls].test(ele[_getAttribute]('class') || '') && regClassCache[cls];
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var addClass = function(ele, cls) {
		if (!hasClass(ele, cls)){
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').trim() + ' ' + cls);
		}
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var removeClass = function(ele, cls) {
		var reg;
		if ((reg = hasClass(ele,cls))) {
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').replace(reg, ' '));
		}
	};

	var addRemoveLoadEvents = function(dom, fn, add){
		var action = add ? _addEventListener : 'removeEventListener';
		if(add){
			addRemoveLoadEvents(dom, fn);
		}
		loadEvents.forEach(function(evt){
			dom[action](evt, fn);
		});
	};

	/**
	 * @param elem { Element }
	 * @param name { string }
	 * @param detail { any }
	 * @param noBubbles { boolean }
	 * @param noCancelable { boolean }
	 * @returns { CustomEvent }
	 */
	var triggerEvent = function(elem, name, detail, noBubbles, noCancelable){
		var event = document.createEvent('Event');

		if(!detail){
			detail = {};
		}

		detail.instance = lazysizes;

		event.initEvent(name, !noBubbles, !noCancelable);

		event.detail = detail;

		elem.dispatchEvent(event);
		return event;
	};

	var updatePolyfill = function (el, full){
		var polyfill;
		if( !supportPicture && ( polyfill = (window.picturefill || lazySizesCfg.pf) ) ){
			if(full && full.src && !el[_getAttribute]('srcset')){
				el.setAttribute('srcset', full.src);
			}
			polyfill({reevaluate: true, elements: [el]});
		} else if(full && full.src){
			el.src = full.src;
		}
	};

	var getCSS = function (elem, style){
		return (getComputedStyle(elem, null) || {})[style];
	};

	/**
	 *
	 * @param elem { Element }
	 * @param parent { Element }
	 * @param [width] {number}
	 * @returns {number}
	 */
	var getWidth = function(elem, parent, width){
		width = width || elem.offsetWidth;

		while(width < lazySizesCfg.minSize && parent && !elem._lazysizesWidth){
			width =  parent.offsetWidth;
			parent = parent.parentNode;
		}

		return width;
	};

	var rAF = (function(){
		var running, waiting;
		var firstFns = [];
		var secondFns = [];
		var fns = firstFns;

		var run = function(){
			var runFns = fns;

			fns = firstFns.length ? secondFns : firstFns;

			running = true;
			waiting = false;

			while(runFns.length){
				runFns.shift()();
			}

			running = false;
		};

		var rafBatch = function(fn, queue){
			if(running && !queue){
				fn.apply(this, arguments);
			} else {
				fns.push(fn);

				if(!waiting){
					waiting = true;
					(document.hidden ? setTimeout : requestAnimationFrame)(run);
				}
			}
		};

		rafBatch._lsFlush = run;

		return rafBatch;
	})();

	var rAFIt = function(fn, simple){
		return simple ?
			function() {
				rAF(fn);
			} :
			function(){
				var that = this;
				var args = arguments;
				rAF(function(){
					fn.apply(that, args);
				});
			}
		;
	};

	var throttle = function(fn){
		var running;
		var lastTime = 0;
		var gDelay = lazySizesCfg.throttleDelay;
		var rICTimeout = lazySizesCfg.ricTimeout;
		var run = function(){
			running = false;
			lastTime = Date.now();
			fn();
		};
		var idleCallback = requestIdleCallback && rICTimeout > 49 ?
			function(){
				requestIdleCallback(run, {timeout: rICTimeout});

				if(rICTimeout !== lazySizesCfg.ricTimeout){
					rICTimeout = lazySizesCfg.ricTimeout;
				}
			} :
			rAFIt(function(){
				setTimeout(run);
			}, true)
		;

		return function(isPriority){
			var delay;

			if((isPriority = isPriority === true)){
				rICTimeout = 33;
			}

			if(running){
				return;
			}

			running =  true;

			delay = gDelay - (Date.now() - lastTime);

			if(delay < 0){
				delay = 0;
			}

			if(isPriority || delay < 9){
				idleCallback();
			} else {
				setTimeout(idleCallback, delay);
			}
		};
	};

	//based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
	var debounce = function(func) {
		var timeout, timestamp;
		var wait = 99;
		var run = function(){
			timeout = null;
			func();
		};
		var later = function() {
			var last = Date.now() - timestamp;

			if (last < wait) {
				setTimeout(later, wait - last);
			} else {
				(requestIdleCallback || run)(run);
			}
		};

		return function() {
			timestamp = Date.now();

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}
		};
	};

	var loader = (function(){
		var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

		var eLvW, elvH, eLtop, eLleft, eLright, eLbottom, isBodyHidden;

		var regImg = /^img$/i;
		var regIframe = /^iframe$/i;

		var supportScroll = ('onscroll' in window) && !(/(gle|ing)bot/.test(navigator.userAgent));

		var shrinkExpand = 0;
		var currentExpand = 0;

		var isLoading = 0;
		var lowRuns = -1;

		var resetPreloading = function(e){
			isLoading--;
			if(!e || isLoading < 0 || !e.target){
				isLoading = 0;
			}
		};

		var isVisible = function (elem) {
			if (isBodyHidden == null) {
				isBodyHidden = getCSS(document.body, 'visibility') == 'hidden';
			}

			return isBodyHidden || !(getCSS(elem.parentNode, 'visibility') == 'hidden' && getCSS(elem, 'visibility') == 'hidden');
		};

		var isNestedVisible = function(elem, elemExpand){
			var outerRect;
			var parent = elem;
			var visible = isVisible(elem);

			eLtop -= elemExpand;
			eLbottom += elemExpand;
			eLleft -= elemExpand;
			eLright += elemExpand;

			while(visible && (parent = parent.offsetParent) && parent != document.body && parent != docElem){
				visible = ((getCSS(parent, 'opacity') || 1) > 0);

				if(visible && getCSS(parent, 'overflow') != 'visible'){
					outerRect = parent.getBoundingClientRect();
					visible = eLright > outerRect.left &&
						eLleft < outerRect.right &&
						eLbottom > outerRect.top - 1 &&
						eLtop < outerRect.bottom + 1
					;
				}
			}

			return visible;
		};

		var checkElements = function() {
			var eLlen, i, rect, autoLoadElem, loadedSomething, elemExpand, elemNegativeExpand, elemExpandVal,
				beforeExpandVal, defaultExpand, preloadExpand, hFac;
			var lazyloadElems = lazysizes.elements;

			if((loadMode = lazySizesCfg.loadMode) && isLoading < 8 && (eLlen = lazyloadElems.length)){

				i = 0;

				lowRuns++;

				for(; i < eLlen; i++){

					if(!lazyloadElems[i] || lazyloadElems[i]._lazyRace){continue;}

					if(!supportScroll || (lazysizes.prematureUnveil && lazysizes.prematureUnveil(lazyloadElems[i]))){unveilElement(lazyloadElems[i]);continue;}

					if(!(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) || !(elemExpand = elemExpandVal * 1)){
						elemExpand = currentExpand;
					}

					if (!defaultExpand) {
						defaultExpand = (!lazySizesCfg.expand || lazySizesCfg.expand < 1) ?
							docElem.clientHeight > 500 && docElem.clientWidth > 500 ? 500 : 370 :
							lazySizesCfg.expand;

						lazysizes._defEx = defaultExpand;

						preloadExpand = defaultExpand * lazySizesCfg.expFactor;
						hFac = lazySizesCfg.hFac;
						isBodyHidden = null;

						if(currentExpand < preloadExpand && isLoading < 1 && lowRuns > 2 && loadMode > 2 && !document.hidden){
							currentExpand = preloadExpand;
							lowRuns = 0;
						} else if(loadMode > 1 && lowRuns > 1 && isLoading < 6){
							currentExpand = defaultExpand;
						} else {
							currentExpand = shrinkExpand;
						}
					}

					if(beforeExpandVal !== elemExpand){
						eLvW = innerWidth + (elemExpand * hFac);
						elvH = innerHeight + elemExpand;
						elemNegativeExpand = elemExpand * -1;
						beforeExpandVal = elemExpand;
					}

					rect = lazyloadElems[i].getBoundingClientRect();

					if ((eLbottom = rect.bottom) >= elemNegativeExpand &&
						(eLtop = rect.top) <= elvH &&
						(eLright = rect.right) >= elemNegativeExpand * hFac &&
						(eLleft = rect.left) <= eLvW &&
						(eLbottom || eLright || eLleft || eLtop) &&
						(lazySizesCfg.loadHidden || isVisible(lazyloadElems[i])) &&
						((isCompleted && isLoading < 3 && !elemExpandVal && (loadMode < 3 || lowRuns < 4)) || isNestedVisible(lazyloadElems[i], elemExpand))){
						unveilElement(lazyloadElems[i]);
						loadedSomething = true;
						if(isLoading > 9){break;}
					} else if(!loadedSomething && isCompleted && !autoLoadElem &&
						isLoading < 4 && lowRuns < 4 && loadMode > 2 &&
						(preloadElems[0] || lazySizesCfg.preloadAfterLoad) &&
						(preloadElems[0] || (!elemExpandVal && ((eLbottom || eLright || eLleft || eLtop) || lazyloadElems[i][_getAttribute](lazySizesCfg.sizesAttr) != 'auto')))){
						autoLoadElem = preloadElems[0] || lazyloadElems[i];
					}
				}

				if(autoLoadElem && !loadedSomething){
					unveilElement(autoLoadElem);
				}
			}
		};

		var throttledCheckElements = throttle(checkElements);

		var switchLoadingClass = function(e){
			var elem = e.target;

			if (elem._lazyCache) {
				delete elem._lazyCache;
				return;
			}

			resetPreloading(e);
			addClass(elem, lazySizesCfg.loadedClass);
			removeClass(elem, lazySizesCfg.loadingClass);
			addRemoveLoadEvents(elem, rafSwitchLoadingClass);
			triggerEvent(elem, 'lazyloaded');
		};
		var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
		var rafSwitchLoadingClass = function(e){
			rafedSwitchLoadingClass({target: e.target});
		};

		var changeIframeSrc = function(elem, src){
			var loadMode = elem.getAttribute('data-load-mode') || lazySizesCfg.iframeLoadMode;

			// loadMode can be also a string!
			if (loadMode == 0) {
				elem.contentWindow.location.replace(src);
			} else if (loadMode == 1) {
				elem.src = src;
			}
		};

		var handleSources = function(source){
			var customMedia;

			var sourceSrcset = source[_getAttribute](lazySizesCfg.srcsetAttr);

			if( (customMedia = lazySizesCfg.customMedia[source[_getAttribute]('data-media') || source[_getAttribute]('media')]) ){
				source.setAttribute('media', customMedia);
			}

			if(sourceSrcset){
				source.setAttribute('srcset', sourceSrcset);
			}
		};

		var lazyUnveil = rAFIt(function (elem, detail, isAuto, sizes, isImg){
			var src, srcset, parent, isPicture, event, firesLoad;

			if(!(event = triggerEvent(elem, 'lazybeforeunveil', detail)).defaultPrevented){

				if(sizes){
					if(isAuto){
						addClass(elem, lazySizesCfg.autosizesClass);
					} else {
						elem.setAttribute('sizes', sizes);
					}
				}

				srcset = elem[_getAttribute](lazySizesCfg.srcsetAttr);
				src = elem[_getAttribute](lazySizesCfg.srcAttr);

				if(isImg) {
					parent = elem.parentNode;
					isPicture = parent && regPicture.test(parent.nodeName || '');
				}

				firesLoad = detail.firesLoad || (('src' in elem) && (srcset || src || isPicture));

				event = {target: elem};

				addClass(elem, lazySizesCfg.loadingClass);

				if(firesLoad){
					clearTimeout(resetPreloadingTimer);
					resetPreloadingTimer = setTimeout(resetPreloading, 2500);
					addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
				}

				if(isPicture){
					forEach.call(parent.getElementsByTagName('source'), handleSources);
				}

				if(srcset){
					elem.setAttribute('srcset', srcset);
				} else if(src && !isPicture){
					if(regIframe.test(elem.nodeName)){
						changeIframeSrc(elem, src);
					} else {
						elem.src = src;
					}
				}

				if(isImg && (srcset || isPicture)){
					updatePolyfill(elem, {src: src});
				}
			}

			if(elem._lazyRace){
				delete elem._lazyRace;
			}
			removeClass(elem, lazySizesCfg.lazyClass);

			rAF(function(){
				// Part of this can be removed as soon as this fix is older: https://bugs.chromium.org/p/chromium/issues/detail?id=7731 (2015)
				var isLoaded = elem.complete && elem.naturalWidth > 1;

				if( !firesLoad || isLoaded){
					if (isLoaded) {
						addClass(elem, lazySizesCfg.fastLoadedClass);
					}
					switchLoadingClass(event);
					elem._lazyCache = true;
					setTimeout(function(){
						if ('_lazyCache' in elem) {
							delete elem._lazyCache;
						}
					}, 9);
				}
				if (elem.loading == 'lazy') {
					isLoading--;
				}
			}, true);
		});

		/**
		 *
		 * @param elem { Element }
		 */
		var unveilElement = function (elem){
			if (elem._lazyRace) {return;}
			var detail;

			var isImg = regImg.test(elem.nodeName);

			//allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
			var sizes = isImg && (elem[_getAttribute](lazySizesCfg.sizesAttr) || elem[_getAttribute]('sizes'));
			var isAuto = sizes == 'auto';

			if( (isAuto || !isCompleted) && isImg && (elem[_getAttribute]('src') || elem.srcset) && !elem.complete && !hasClass(elem, lazySizesCfg.errorClass) && hasClass(elem, lazySizesCfg.lazyClass)){return;}

			detail = triggerEvent(elem, 'lazyunveilread').detail;

			if(isAuto){
				 autoSizer.updateElem(elem, true, elem.offsetWidth);
			}

			elem._lazyRace = true;
			isLoading++;

			lazyUnveil(elem, detail, isAuto, sizes, isImg);
		};

		var afterScroll = debounce(function(){
			lazySizesCfg.loadMode = 3;
			throttledCheckElements();
		});

		var altLoadmodeScrollListner = function(){
			if(lazySizesCfg.loadMode == 3){
				lazySizesCfg.loadMode = 2;
			}
			afterScroll();
		};

		var onload = function(){
			if(isCompleted){return;}
			if(Date.now() - started < 999){
				setTimeout(onload, 999);
				return;
			}


			isCompleted = true;

			lazySizesCfg.loadMode = 3;

			throttledCheckElements();

			addEventListener('scroll', altLoadmodeScrollListner, true);
		};

		return {
			_: function(){
				started = Date.now();

				lazysizes.elements = document.getElementsByClassName(lazySizesCfg.lazyClass);
				preloadElems = document.getElementsByClassName(lazySizesCfg.lazyClass + ' ' + lazySizesCfg.preloadClass);

				addEventListener('scroll', throttledCheckElements, true);

				addEventListener('resize', throttledCheckElements, true);

				addEventListener('pageshow', function (e) {
					if (e.persisted) {
						var loadingElements = document.querySelectorAll('.' + lazySizesCfg.loadingClass);

						if (loadingElements.length && loadingElements.forEach) {
							requestAnimationFrame(function () {
								loadingElements.forEach( function (img) {
									if (img.complete) {
										unveilElement(img);
									}
								});
							});
						}
					}
				});

				if(window.MutationObserver){
					new MutationObserver( throttledCheckElements ).observe( docElem, {childList: true, subtree: true, attributes: true} );
				} else {
					docElem[_addEventListener]('DOMNodeInserted', throttledCheckElements, true);
					docElem[_addEventListener]('DOMAttrModified', throttledCheckElements, true);
					setInterval(throttledCheckElements, 999);
				}

				addEventListener('hashchange', throttledCheckElements, true);

				//, 'fullscreenchange'
				['focus', 'mouseover', 'click', 'load', 'transitionend', 'animationend'].forEach(function(name){
					document[_addEventListener](name, throttledCheckElements, true);
				});

				if((/d$|^c/.test(document.readyState))){
					onload();
				} else {
					addEventListener('load', onload);
					document[_addEventListener]('DOMContentLoaded', throttledCheckElements);
					setTimeout(onload, 20000);
				}

				if(lazysizes.elements.length){
					checkElements();
					rAF._lsFlush();
				} else {
					throttledCheckElements();
				}
			},
			checkElems: throttledCheckElements,
			unveil: unveilElement,
			_aLSL: altLoadmodeScrollListner,
		};
	})();


	var autoSizer = (function(){
		var autosizesElems;

		var sizeElement = rAFIt(function(elem, parent, event, width){
			var sources, i, len;
			elem._lazysizesWidth = width;
			width += 'px';

			elem.setAttribute('sizes', width);

			if(regPicture.test(parent.nodeName || '')){
				sources = parent.getElementsByTagName('source');
				for(i = 0, len = sources.length; i < len; i++){
					sources[i].setAttribute('sizes', width);
				}
			}

			if(!event.detail.dataAttr){
				updatePolyfill(elem, event.detail);
			}
		});
		/**
		 *
		 * @param elem {Element}
		 * @param dataAttr
		 * @param [width] { number }
		 */
		var getSizeElement = function (elem, dataAttr, width){
			var event;
			var parent = elem.parentNode;

			if(parent){
				width = getWidth(elem, parent, width);
				event = triggerEvent(elem, 'lazybeforesizes', {width: width, dataAttr: !!dataAttr});

				if(!event.defaultPrevented){
					width = event.detail.width;

					if(width && width !== elem._lazysizesWidth){
						sizeElement(elem, parent, event, width);
					}
				}
			}
		};

		var updateElementsSizes = function(){
			var i;
			var len = autosizesElems.length;
			if(len){
				i = 0;

				for(; i < len; i++){
					getSizeElement(autosizesElems[i]);
				}
			}
		};

		var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

		return {
			_: function(){
				autosizesElems = document.getElementsByClassName(lazySizesCfg.autosizesClass);
				addEventListener('resize', debouncedUpdateElementsSizes);
			},
			checkElems: debouncedUpdateElementsSizes,
			updateElem: getSizeElement
		};
	})();

	var init = function(){
		if(!init.i && document.getElementsByClassName){
			init.i = true;
			autoSizer._();
			loader._();
		}
	};

	setTimeout(function(){
		if(lazySizesCfg.init){
			init();
		}
	});

	lazysizes = {
		/**
		 * @type { LazySizesConfigPartial }
		 */
		cfg: lazySizesCfg,
		autoSizer: autoSizer,
		loader: loader,
		init: init,
		uP: updatePolyfill,
		aC: addClass,
		rC: removeClass,
		hC: hasClass,
		fire: triggerEvent,
		gW: getWidth,
		rAF: rAF,
	};

	return lazysizes;
}
));

},{}],3:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

require("lazysizes");

var _urlRegularExpression = _interopRequireDefault(require("./util/url-regular-expression"));

var _documentQuerySelectorAll = _interopRequireDefault(require("./util/document-query-selector-all"));

/**
 * Owl Carousel v2.3.4
 * Copyright 2013-2018 David Deutsch
 * Licensed under: SEE LICENSE IN https://github.com/OwlCarousel2/OwlCarousel2/blob/master/LICENSE
 */
!function (a, b, c, d) {
  function e(b, c) {
    this.settings = null, this.options = a.extend({}, e.Defaults, c), this.$element = a(b), this._handlers = {}, this._plugins = {}, this._supress = {}, this._current = null, this._speed = null, this._coordinates = [], this._breakpoint = null, this._width = null, this._items = [], this._clones = [], this._mergers = [], this._widths = [], this._invalidated = {}, this._pipe = [], this._drag = {
      time: null,
      target: null,
      pointer: null,
      stage: {
        start: null,
        current: null
      },
      direction: null
    }, this._states = {
      current: {},
      tags: {
        initializing: ["busy"],
        animating: ["busy"],
        dragging: ["interacting"]
      }
    }, a.each(["onResize", "onThrottledResize"], a.proxy(function (b, c) {
      this._handlers[c] = a.proxy(this[c], this);
    }, this)), a.each(e.Plugins, a.proxy(function (a, b) {
      this._plugins[a.charAt(0).toLowerCase() + a.slice(1)] = new b(this);
    }, this)), a.each(e.Workers, a.proxy(function (b, c) {
      this._pipe.push({
        filter: c.filter,
        run: a.proxy(c.run, this)
      });
    }, this)), this.setup(), this.initialize();
  }

  e.Defaults = {
    items: 3,
    loop: !1,
    center: !1,
    rewind: !1,
    checkVisibility: !0,
    mouseDrag: !0,
    touchDrag: !0,
    pullDrag: !0,
    freeDrag: !1,
    margin: 0,
    stagePadding: 0,
    merge: !1,
    mergeFit: !0,
    autoWidth: !1,
    startPosition: 0,
    rtl: !1,
    smartSpeed: 250,
    fluidSpeed: !1,
    dragEndSpeed: !1,
    responsive: {},
    responsiveRefreshRate: 200,
    responsiveBaseElement: b,
    fallbackEasing: "swing",
    slideTransition: "",
    info: !1,
    nestedItemSelector: !1,
    itemElement: "div",
    stageElement: "div",
    refreshClass: "owl-refresh",
    loadedClass: "owl-loaded",
    loadingClass: "owl-loading",
    rtlClass: "owl-rtl",
    responsiveClass: "owl-responsive",
    dragClass: "owl-drag",
    itemClass: "owl-item",
    stageClass: "owl-stage",
    stageOuterClass: "owl-stage-outer",
    grabClass: "owl-grab"
  }, e.Width = {
    Default: "default",
    Inner: "inner",
    Outer: "outer"
  }, e.Type = {
    Event: "event",
    State: "state"
  }, e.Plugins = {}, e.Workers = [{
    filter: ["width", "settings"],
    run: function () {
      this._width = this.$element.width();
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function (a) {
      a.current = this._items && this._items[this.relative(this._current)];
    }
  }, {
    filter: ["items", "settings"],
    run: function () {
      this.$stage.children(".cloned").remove();
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function (a) {
      var b = this.settings.margin || "",
          c = !this.settings.autoWidth,
          d = this.settings.rtl,
          e = {
        width: "auto",
        "margin-left": d ? b : "",
        "margin-right": d ? "" : b
      };
      !c && this.$stage.children().css(e), a.css = e;
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function (a) {
      var b = (this.width() / this.settings.items).toFixed(3) - this.settings.margin,
          c = null,
          d = this._items.length,
          e = !this.settings.autoWidth,
          f = [];

      for (a.items = {
        merge: !1,
        width: b
      }; d--;) c = this._mergers[d], c = this.settings.mergeFit && Math.min(c, this.settings.items) || c, a.items.merge = c > 1 || a.items.merge, f[d] = e ? b * c : this._items[d].width();

      this._widths = f;
    }
  }, {
    filter: ["items", "settings"],
    run: function () {
      var b = [],
          c = this._items,
          d = this.settings,
          e = Math.max(2 * d.items, 4),
          f = 2 * Math.ceil(c.length / 2),
          g = d.loop && c.length ? d.rewind ? e : Math.max(e, f) : 0,
          h = "",
          i = "";

      for (g /= 2; g > 0;) b.push(this.normalize(b.length / 2, !0)), h += c[b[b.length - 1]][0].outerHTML, b.push(this.normalize(c.length - 1 - (b.length - 1) / 2, !0)), i = c[b[b.length - 1]][0].outerHTML + i, g -= 1;

      this._clones = b, a(h).addClass("cloned").appendTo(this.$stage), a(i).addClass("cloned").prependTo(this.$stage);
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function () {
      for (var a = this.settings.rtl ? 1 : -1, b = this._clones.length + this._items.length, c = -1, d = 0, e = 0, f = []; ++c < b;) d = f[c - 1] || 0, e = this._widths[this.relative(c)] + this.settings.margin, f.push(d + e * a);

      this._coordinates = f;
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function () {
      var a = this.settings.stagePadding,
          b = this._coordinates,
          c = {
        width: Math.ceil(Math.abs(b[b.length - 1])) + 2 * a,
        "padding-left": a || "",
        "padding-right": a || ""
      };
      this.$stage.css(c);
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function (a) {
      var b = this._coordinates.length,
          c = !this.settings.autoWidth,
          d = this.$stage.children();
      if (c && a.items.merge) for (; b--;) a.css.width = this._widths[this.relative(b)], d.eq(b).css(a.css);else c && (a.css.width = a.items.width, d.css(a.css));
    }
  }, {
    filter: ["items"],
    run: function () {
      this._coordinates.length < 1 && this.$stage.removeAttr("style");
    }
  }, {
    filter: ["width", "items", "settings"],
    run: function (a) {
      a.current = a.current ? this.$stage.children().index(a.current) : 0, a.current = Math.max(this.minimum(), Math.min(this.maximum(), a.current)), this.reset(a.current);
    }
  }, {
    filter: ["position"],
    run: function () {
      this.animate(this.coordinates(this._current));
    }
  }, {
    filter: ["width", "position", "items", "settings"],
    run: function () {
      var a,
          b,
          c,
          d,
          e = this.settings.rtl ? 1 : -1,
          f = 2 * this.settings.stagePadding,
          g = this.coordinates(this.current()) + f,
          h = g + this.width() * e,
          i = [];

      for (c = 0, d = this._coordinates.length; c < d; c++) a = this._coordinates[c - 1] || 0, b = Math.abs(this._coordinates[c]) + f * e, (this.op(a, "<=", g) && this.op(a, ">", h) || this.op(b, "<", g) && this.op(b, ">", h)) && i.push(c);

      this.$stage.children(".active").removeClass("active"), this.$stage.children(":eq(" + i.join("), :eq(") + ")").addClass("active"), this.$stage.children(".center").removeClass("center"), this.settings.center && this.$stage.children().eq(this.current()).addClass("center");
    }
  }], e.prototype.initializeStage = function () {
    this.$stage = this.$element.find("." + this.settings.stageClass), this.$stage.length || (this.$element.addClass(this.options.loadingClass), this.$stage = a("<" + this.settings.stageElement + ">", {
      class: this.settings.stageClass
    }).wrap(a("<div/>", {
      class: this.settings.stageOuterClass
    })), this.$element.append(this.$stage.parent()));
  }, e.prototype.initializeItems = function () {
    var b = this.$element.find(".owl-item");
    if (b.length) return this._items = b.get().map(function (b) {
      return a(b);
    }), this._mergers = this._items.map(function () {
      return 1;
    }), void this.refresh();
    this.replace(this.$element.children().not(this.$stage.parent())), this.isVisible() ? this.refresh() : this.invalidate("width"), this.$element.removeClass(this.options.loadingClass).addClass(this.options.loadedClass);
  }, e.prototype.initialize = function () {
    if (this.enter("initializing"), this.trigger("initialize"), this.$element.toggleClass(this.settings.rtlClass, this.settings.rtl), this.settings.autoWidth && !this.is("pre-loading")) {
      var a, b, c;
      a = this.$element.find("img"), b = this.settings.nestedItemSelector ? "." + this.settings.nestedItemSelector : d, c = this.$element.children(b).width(), a.length && c <= 0 && this.preloadAutoWidthImages(a);
    }

    this.initializeStage(), this.initializeItems(), this.registerEventHandlers(), this.leave("initializing"), this.trigger("initialized");
  }, e.prototype.isVisible = function () {
    return !this.settings.checkVisibility || this.$element.is(":visible");
  }, e.prototype.setup = function () {
    var b = this.viewport(),
        c = this.options.responsive,
        d = -1,
        e = null;
    c ? (a.each(c, function (a) {
      a <= b && a > d && (d = Number(a));
    }), e = a.extend({}, this.options, c[d]), "function" == typeof e.stagePadding && (e.stagePadding = e.stagePadding()), delete e.responsive, e.responsiveClass && this.$element.attr("class", this.$element.attr("class").replace(new RegExp("(" + this.options.responsiveClass + "-)\\S+\\s", "g"), "$1" + d))) : e = a.extend({}, this.options), this.trigger("change", {
      property: {
        name: "settings",
        value: e
      }
    }), this._breakpoint = d, this.settings = e, this.invalidate("settings"), this.trigger("changed", {
      property: {
        name: "settings",
        value: this.settings
      }
    });
  }, e.prototype.optionsLogic = function () {
    this.settings.autoWidth && (this.settings.stagePadding = !1, this.settings.merge = !1);
  }, e.prototype.prepare = function (b) {
    var c = this.trigger("prepare", {
      content: b
    });
    return c.data || (c.data = a("<" + this.settings.itemElement + "/>").addClass(this.options.itemClass).append(b)), this.trigger("prepared", {
      content: c.data
    }), c.data;
  }, e.prototype.update = function () {
    for (var b = 0, c = this._pipe.length, d = a.proxy(function (a) {
      return this[a];
    }, this._invalidated), e = {}; b < c;) (this._invalidated.all || a.grep(this._pipe[b].filter, d).length > 0) && this._pipe[b].run(e), b++;

    this._invalidated = {}, !this.is("valid") && this.enter("valid");
  }, e.prototype.width = function (a) {
    switch (a = a || e.Width.Default) {
      case e.Width.Inner:
      case e.Width.Outer:
        return this._width;

      default:
        return this._width - 2 * this.settings.stagePadding + this.settings.margin;
    }
  }, e.prototype.refresh = function () {
    this.enter("refreshing"), this.trigger("refresh"), this.setup(), this.optionsLogic(), this.$element.addClass(this.options.refreshClass), this.update(), this.$element.removeClass(this.options.refreshClass), this.leave("refreshing"), this.trigger("refreshed");
  }, e.prototype.onThrottledResize = function () {
    b.clearTimeout(this.resizeTimer), this.resizeTimer = b.setTimeout(this._handlers.onResize, this.settings.responsiveRefreshRate);
  }, e.prototype.onResize = function () {
    return !!this._items.length && this._width !== this.$element.width() && !!this.isVisible() && (this.enter("resizing"), this.trigger("resize").isDefaultPrevented() ? (this.leave("resizing"), !1) : (this.invalidate("width"), this.refresh(), this.leave("resizing"), void this.trigger("resized")));
  }, e.prototype.registerEventHandlers = function () {
    a.support.transition && this.$stage.on(a.support.transition.end + ".owl.core", a.proxy(this.onTransitionEnd, this)), !1 !== this.settings.responsive && this.on(b, "resize", this._handlers.onThrottledResize), this.settings.mouseDrag && (this.$element.addClass(this.options.dragClass), this.$stage.on("mousedown.owl.core", a.proxy(this.onDragStart, this)), this.$stage.on("dragstart.owl.core selectstart.owl.core", function () {
      return !1;
    })), this.settings.touchDrag && (this.$stage.on("touchstart.owl.core", a.proxy(this.onDragStart, this)), this.$stage.on("touchcancel.owl.core", a.proxy(this.onDragEnd, this)));
  }, e.prototype.onDragStart = function (b) {
    var d = null;
    3 !== b.which && (a.support.transform ? (d = this.$stage.css("transform").replace(/.*\(|\)| /g, "").split(","), d = {
      x: d[16 === d.length ? 12 : 4],
      y: d[16 === d.length ? 13 : 5]
    }) : (d = this.$stage.position(), d = {
      x: this.settings.rtl ? d.left + this.$stage.width() - this.width() + this.settings.margin : d.left,
      y: d.top
    }), this.is("animating") && (a.support.transform ? this.animate(d.x) : this.$stage.stop(), this.invalidate("position")), this.$element.toggleClass(this.options.grabClass, "mousedown" === b.type), this.speed(0), this._drag.time = new Date().getTime(), this._drag.target = a(b.target), this._drag.stage.start = d, this._drag.stage.current = d, this._drag.pointer = this.pointer(b), a(c).on("mouseup.owl.core touchend.owl.core", a.proxy(this.onDragEnd, this)), a(c).one("mousemove.owl.core touchmove.owl.core", a.proxy(function (b) {
      var d = this.difference(this._drag.pointer, this.pointer(b));
      a(c).on("mousemove.owl.core touchmove.owl.core", a.proxy(this.onDragMove, this)), Math.abs(d.x) < Math.abs(d.y) && this.is("valid") || (b.preventDefault(), this.enter("dragging"), this.trigger("drag"));
    }, this)));
  }, e.prototype.onDragMove = function (a) {
    var b = null,
        c = null,
        d = null,
        e = this.difference(this._drag.pointer, this.pointer(a)),
        f = this.difference(this._drag.stage.start, e);
    this.is("dragging") && (a.preventDefault(), this.settings.loop ? (b = this.coordinates(this.minimum()), c = this.coordinates(this.maximum() + 1) - b, f.x = ((f.x - b) % c + c) % c + b) : (b = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum()), c = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum()), d = this.settings.pullDrag ? -1 * e.x / 5 : 0, f.x = Math.max(Math.min(f.x, b + d), c + d)), this._drag.stage.current = f, this.animate(f.x));
  }, e.prototype.onDragEnd = function (b) {
    var d = this.difference(this._drag.pointer, this.pointer(b)),
        e = this._drag.stage.current,
        f = d.x > 0 ^ this.settings.rtl ? "left" : "right";
    a(c).off(".owl.core"), this.$element.removeClass(this.options.grabClass), (0 !== d.x && this.is("dragging") || !this.is("valid")) && (this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed), this.current(this.closest(e.x, 0 !== d.x ? f : this._drag.direction)), this.invalidate("position"), this.update(), this._drag.direction = f, (Math.abs(d.x) > 3 || new Date().getTime() - this._drag.time > 300) && this._drag.target.one("click.owl.core", function () {
      return !1;
    })), this.is("dragging") && (this.leave("dragging"), this.trigger("dragged"));
  }, e.prototype.closest = function (b, c) {
    var e = -1,
        f = 30,
        g = this.width(),
        h = this.coordinates();
    return this.settings.freeDrag || a.each(h, a.proxy(function (a, i) {
      return "left" === c && b > i - f && b < i + f ? e = a : "right" === c && b > i - g - f && b < i - g + f ? e = a + 1 : this.op(b, "<", i) && this.op(b, ">", h[a + 1] !== d ? h[a + 1] : i - g) && (e = "left" === c ? a + 1 : a), -1 === e;
    }, this)), this.settings.loop || (this.op(b, ">", h[this.minimum()]) ? e = b = this.minimum() : this.op(b, "<", h[this.maximum()]) && (e = b = this.maximum())), e;
  }, e.prototype.animate = function (b) {
    var c = this.speed() > 0;
    this.is("animating") && this.onTransitionEnd(), c && (this.enter("animating"), this.trigger("translate")), a.support.transform3d && a.support.transition ? this.$stage.css({
      transform: "translate3d(" + b + "px,0px,0px)",
      transition: this.speed() / 1e3 + "s" + (this.settings.slideTransition ? " " + this.settings.slideTransition : "")
    }) : c ? this.$stage.animate({
      left: b + "px"
    }, this.speed(), this.settings.fallbackEasing, a.proxy(this.onTransitionEnd, this)) : this.$stage.css({
      left: b + "px"
    });
  }, e.prototype.is = function (a) {
    return this._states.current[a] && this._states.current[a] > 0;
  }, e.prototype.current = function (a) {
    if (a === d) return this._current;
    if (0 === this._items.length) return d;

    if (a = this.normalize(a), this._current !== a) {
      var b = this.trigger("change", {
        property: {
          name: "position",
          value: a
        }
      });
      b.data !== d && (a = this.normalize(b.data)), this._current = a, this.invalidate("position"), this.trigger("changed", {
        property: {
          name: "position",
          value: this._current
        }
      });
    }

    return this._current;
  }, e.prototype.invalidate = function (b) {
    return "string" === a.type(b) && (this._invalidated[b] = !0, this.is("valid") && this.leave("valid")), a.map(this._invalidated, function (a, b) {
      return b;
    });
  }, e.prototype.reset = function (a) {
    (a = this.normalize(a)) !== d && (this._speed = 0, this._current = a, this.suppress(["translate", "translated"]), this.animate(this.coordinates(a)), this.release(["translate", "translated"]));
  }, e.prototype.normalize = function (a, b) {
    var c = this._items.length,
        e = b ? 0 : this._clones.length;
    return !this.isNumeric(a) || c < 1 ? a = d : (a < 0 || a >= c + e) && (a = ((a - e / 2) % c + c) % c + e / 2), a;
  }, e.prototype.relative = function (a) {
    return a -= this._clones.length / 2, this.normalize(a, !0);
  }, e.prototype.maximum = function (a) {
    var b,
        c,
        d,
        e = this.settings,
        f = this._coordinates.length;
    if (e.loop) f = this._clones.length / 2 + this._items.length - 1;else if (e.autoWidth || e.merge) {
      if (b = this._items.length) for (c = this._items[--b].width(), d = this.$element.width(); b-- && !((c += this._items[b].width() + this.settings.margin) > d););
      f = b + 1;
    } else f = e.center ? this._items.length - 1 : this._items.length - e.items;
    return a && (f -= this._clones.length / 2), Math.max(f, 0);
  }, e.prototype.minimum = function (a) {
    return a ? 0 : this._clones.length / 2;
  }, e.prototype.items = function (a) {
    return a === d ? this._items.slice() : (a = this.normalize(a, !0), this._items[a]);
  }, e.prototype.mergers = function (a) {
    return a === d ? this._mergers.slice() : (a = this.normalize(a, !0), this._mergers[a]);
  }, e.prototype.clones = function (b) {
    var c = this._clones.length / 2,
        e = c + this._items.length,
        f = function (a) {
      return a % 2 == 0 ? e + a / 2 : c - (a + 1) / 2;
    };

    return b === d ? a.map(this._clones, function (a, b) {
      return f(b);
    }) : a.map(this._clones, function (a, c) {
      return a === b ? f(c) : null;
    });
  }, e.prototype.speed = function (a) {
    return a !== d && (this._speed = a), this._speed;
  }, e.prototype.coordinates = function (b) {
    var c,
        e = 1,
        f = b - 1;
    return b === d ? a.map(this._coordinates, a.proxy(function (a, b) {
      return this.coordinates(b);
    }, this)) : (this.settings.center ? (this.settings.rtl && (e = -1, f = b + 1), c = this._coordinates[b], c += (this.width() - c + (this._coordinates[f] || 0)) / 2 * e) : c = this._coordinates[f] || 0, c = Math.ceil(c));
  }, e.prototype.duration = function (a, b, c) {
    return 0 === c ? 0 : Math.min(Math.max(Math.abs(b - a), 1), 6) * Math.abs(c || this.settings.smartSpeed);
  }, e.prototype.to = function (a, b) {
    var c = this.current(),
        d = null,
        e = a - this.relative(c),
        f = (e > 0) - (e < 0),
        g = this._items.length,
        h = this.minimum(),
        i = this.maximum();
    this.settings.loop ? (!this.settings.rewind && Math.abs(e) > g / 2 && (e += -1 * f * g), a = c + e, (d = ((a - h) % g + g) % g + h) !== a && d - e <= i && d - e > 0 && (c = d - e, a = d, this.reset(c))) : this.settings.rewind ? (i += 1, a = (a % i + i) % i) : a = Math.max(h, Math.min(i, a)), this.speed(this.duration(c, a, b)), this.current(a), this.isVisible() && this.update();
  }, e.prototype.next = function (a) {
    a = a || !1, this.to(this.relative(this.current()) + 1, a);
  }, e.prototype.prev = function (a) {
    a = a || !1, this.to(this.relative(this.current()) - 1, a);
  }, e.prototype.onTransitionEnd = function (a) {
    if (a !== d && (a.stopPropagation(), (a.target || a.srcElement || a.originalTarget) !== this.$stage.get(0))) return !1;
    this.leave("animating"), this.trigger("translated");
  }, e.prototype.viewport = function () {
    var d;
    return this.options.responsiveBaseElement !== b ? d = a(this.options.responsiveBaseElement).width() : b.innerWidth ? d = b.innerWidth : c.documentElement && c.documentElement.clientWidth ? d = c.documentElement.clientWidth : console.warn("Can not detect viewport width."), d;
  }, e.prototype.replace = function (b) {
    this.$stage.empty(), this._items = [], b && (b = b instanceof jQuery ? b : a(b)), this.settings.nestedItemSelector && (b = b.find("." + this.settings.nestedItemSelector)), b.filter(function () {
      return 1 === this.nodeType;
    }).each(a.proxy(function (a, b) {
      b = this.prepare(b), this.$stage.append(b), this._items.push(b), this._mergers.push(1 * b.find("[data-merge]").addBack("[data-merge]").attr("data-merge") || 1);
    }, this)), this.reset(this.isNumeric(this.settings.startPosition) ? this.settings.startPosition : 0), this.invalidate("items");
  }, e.prototype.add = function (b, c) {
    var e = this.relative(this._current);
    c = c === d ? this._items.length : this.normalize(c, !0), b = b instanceof jQuery ? b : a(b), this.trigger("add", {
      content: b,
      position: c
    }), b = this.prepare(b), 0 === this._items.length || c === this._items.length ? (0 === this._items.length && this.$stage.append(b), 0 !== this._items.length && this._items[c - 1].after(b), this._items.push(b), this._mergers.push(1 * b.find("[data-merge]").addBack("[data-merge]").attr("data-merge") || 1)) : (this._items[c].before(b), this._items.splice(c, 0, b), this._mergers.splice(c, 0, 1 * b.find("[data-merge]").addBack("[data-merge]").attr("data-merge") || 1)), this._items[e] && this.reset(this._items[e].index()), this.invalidate("items"), this.trigger("added", {
      content: b,
      position: c
    });
  }, e.prototype.remove = function (a) {
    (a = this.normalize(a, !0)) !== d && (this.trigger("remove", {
      content: this._items[a],
      position: a
    }), this._items[a].remove(), this._items.splice(a, 1), this._mergers.splice(a, 1), this.invalidate("items"), this.trigger("removed", {
      content: null,
      position: a
    }));
  }, e.prototype.preloadAutoWidthImages = function (b) {
    b.each(a.proxy(function (b, c) {
      this.enter("pre-loading"), c = a(c), a(new Image()).one("load", a.proxy(function (a) {
        c.attr("src", a.target.src), c.css("opacity", 1), this.leave("pre-loading"), !this.is("pre-loading") && !this.is("initializing") && this.refresh();
      }, this)).attr("src", c.attr("src") || c.attr("data-src") || c.attr("data-src-retina"));
    }, this));
  }, e.prototype.destroy = function () {
    this.$element.off(".owl.core"), this.$stage.off(".owl.core"), a(c).off(".owl.core"), !1 !== this.settings.responsive && (b.clearTimeout(this.resizeTimer), this.off(b, "resize", this._handlers.onThrottledResize));

    for (var d in this._plugins) this._plugins[d].destroy();

    this.$stage.children(".cloned").remove(), this.$stage.unwrap(), this.$stage.children().contents().unwrap(), this.$stage.children().unwrap(), this.$stage.remove(), this.$element.removeClass(this.options.refreshClass).removeClass(this.options.loadingClass).removeClass(this.options.loadedClass).removeClass(this.options.rtlClass).removeClass(this.options.dragClass).removeClass(this.options.grabClass).attr("class", this.$element.attr("class").replace(new RegExp(this.options.responsiveClass + "-\\S+\\s", "g"), "")).removeData("owl.carousel");
  }, e.prototype.op = function (a, b, c) {
    var d = this.settings.rtl;

    switch (b) {
      case "<":
        return d ? a > c : a < c;

      case ">":
        return d ? a < c : a > c;

      case ">=":
        return d ? a <= c : a >= c;

      case "<=":
        return d ? a >= c : a <= c;
    }
  }, e.prototype.on = function (a, b, c, d) {
    a.addEventListener ? a.addEventListener(b, c, d) : a.attachEvent && a.attachEvent("on" + b, c);
  }, e.prototype.off = function (a, b, c, d) {
    a.removeEventListener ? a.removeEventListener(b, c, d) : a.detachEvent && a.detachEvent("on" + b, c);
  }, e.prototype.trigger = function (b, c, d, f, g) {
    var h = {
      item: {
        count: this._items.length,
        index: this.current()
      }
    },
        i = a.camelCase(a.grep(["on", b, d], function (a) {
      return a;
    }).join("-").toLowerCase()),
        j = a.Event([b, "owl", d || "carousel"].join(".").toLowerCase(), a.extend({
      relatedTarget: this
    }, h, c));
    return this._supress[b] || (a.each(this._plugins, function (a, b) {
      b.onTrigger && b.onTrigger(j);
    }), this.register({
      type: e.Type.Event,
      name: b
    }), this.$element.trigger(j), this.settings && "function" == typeof this.settings[i] && this.settings[i].call(this, j)), j;
  }, e.prototype.enter = function (b) {
    a.each([b].concat(this._states.tags[b] || []), a.proxy(function (a, b) {
      this._states.current[b] === d && (this._states.current[b] = 0), this._states.current[b]++;
    }, this));
  }, e.prototype.leave = function (b) {
    a.each([b].concat(this._states.tags[b] || []), a.proxy(function (a, b) {
      this._states.current[b]--;
    }, this));
  }, e.prototype.register = function (b) {
    if (b.type === e.Type.Event) {
      if (a.event.special[b.name] || (a.event.special[b.name] = {}), !a.event.special[b.name].owl) {
        var c = a.event.special[b.name]._default;
        a.event.special[b.name]._default = function (a) {
          return !c || !c.apply || a.namespace && -1 !== a.namespace.indexOf("owl") ? a.namespace && a.namespace.indexOf("owl") > -1 : c.apply(this, arguments);
        }, a.event.special[b.name].owl = !0;
      }
    } else b.type === e.Type.State && (this._states.tags[b.name] ? this._states.tags[b.name] = this._states.tags[b.name].concat(b.tags) : this._states.tags[b.name] = b.tags, this._states.tags[b.name] = a.grep(this._states.tags[b.name], a.proxy(function (c, d) {
      return a.inArray(c, this._states.tags[b.name]) === d;
    }, this)));
  }, e.prototype.suppress = function (b) {
    a.each(b, a.proxy(function (a, b) {
      this._supress[b] = !0;
    }, this));
  }, e.prototype.release = function (b) {
    a.each(b, a.proxy(function (a, b) {
      delete this._supress[b];
    }, this));
  }, e.prototype.pointer = function (a) {
    var c = {
      x: null,
      y: null
    };
    return a = a.originalEvent || a || b.event, a = a.touches && a.touches.length ? a.touches[0] : a.changedTouches && a.changedTouches.length ? a.changedTouches[0] : a, a.pageX ? (c.x = a.pageX, c.y = a.pageY) : (c.x = a.clientX, c.y = a.clientY), c;
  }, e.prototype.isNumeric = function (a) {
    return !isNaN(parseFloat(a));
  }, e.prototype.difference = function (a, b) {
    return {
      x: a.x - b.x,
      y: a.y - b.y
    };
  }, a.fn.owlCarousel = function (b) {
    var c = Array.prototype.slice.call(arguments, 1);
    return this.each(function () {
      var d = a(this),
          f = d.data("owl.carousel");
      f || (f = new e(this, "object" == typeof b && b), d.data("owl.carousel", f), a.each(["next", "prev", "to", "destroy", "refresh", "replace", "add", "remove"], function (b, c) {
        f.register({
          type: e.Type.Event,
          name: c
        }), f.$element.on(c + ".owl.carousel.core", a.proxy(function (a) {
          a.namespace && a.relatedTarget !== this && (this.suppress([c]), f[c].apply(this, [].slice.call(arguments, 1)), this.release([c]));
        }, f));
      })), "string" == typeof b && "_" !== b.charAt(0) && f[b].apply(f, c);
    });
  }, a.fn.owlCarousel.Constructor = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (b) {
    this._core = b, this._interval = null, this._visible = null, this._handlers = {
      "initialized.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.autoRefresh && this.watch();
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this._core.$element.on(this._handlers);
  };

  e.Defaults = {
    autoRefresh: !0,
    autoRefreshInterval: 500
  }, e.prototype.watch = function () {
    this._interval || (this._visible = this._core.isVisible(), this._interval = b.setInterval(a.proxy(this.refresh, this), this._core.settings.autoRefreshInterval));
  }, e.prototype.refresh = function () {
    this._core.isVisible() !== this._visible && (this._visible = !this._visible, this._core.$element.toggleClass("owl-hidden", !this._visible), this._visible && this._core.invalidate("width") && this._core.refresh());
  }, e.prototype.destroy = function () {
    var a, c;
    b.clearInterval(this._interval);

    for (a in this._handlers) this._core.$element.off(a, this._handlers[a]);

    for (c in Object.getOwnPropertyNames(this)) "function" != typeof this[c] && (this[c] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.AutoRefresh = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (b) {
    this._core = b, this._loaded = [], this._handlers = {
      "initialized.owl.carousel change.owl.carousel resized.owl.carousel": a.proxy(function (b) {
        if (b.namespace && this._core.settings && this._core.settings.lazyLoad && (b.property && "position" == b.property.name || "initialized" == b.type)) {
          var c = this._core.settings,
              e = c.center && Math.ceil(c.items / 2) || c.items,
              f = c.center && -1 * e || 0,
              g = (b.property && b.property.value !== d ? b.property.value : this._core.current()) + f,
              h = this._core.clones().length,
              i = a.proxy(function (a, b) {
            this.load(b);
          }, this);

          for (c.lazyLoadEager > 0 && (e += c.lazyLoadEager, c.loop && (g -= c.lazyLoadEager, e++)); f++ < e;) this.load(h / 2 + this._core.relative(g)), h && a.each(this._core.clones(this._core.relative(g)), i), g++;
        }
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this._core.$element.on(this._handlers);
  };

  e.Defaults = {
    lazyLoad: !1,
    lazyLoadEager: 0
  }, e.prototype.load = function (c) {
    var d = this._core.$stage.children().eq(c),
        e = d && d.find(".owl-lazy");

    !e || a.inArray(d.get(0), this._loaded) > -1 || (e.each(a.proxy(function (c, d) {
      var e,
          f = a(d),
          g = b.devicePixelRatio > 1 && f.attr("data-src-retina") || f.attr("data-src") || f.attr("data-srcset");
      this._core.trigger("load", {
        element: f,
        url: g
      }, "lazy"), f.is("img") ? f.one("load.owl.lazy", a.proxy(function () {
        f.css("opacity", 1), this._core.trigger("loaded", {
          element: f,
          url: g
        }, "lazy");
      }, this)).attr("src", g) : f.is("source") ? f.one("load.owl.lazy", a.proxy(function () {
        this._core.trigger("loaded", {
          element: f,
          url: g
        }, "lazy");
      }, this)).attr("srcset", g) : (e = new Image(), e.onload = a.proxy(function () {
        f.css({
          "background-image": 'url("' + g + '")',
          opacity: "1"
        }), this._core.trigger("loaded", {
          element: f,
          url: g
        }, "lazy");
      }, this), e.src = g);
    }, this)), this._loaded.push(d.get(0)));
  }, e.prototype.destroy = function () {
    var a, b;

    for (a in this.handlers) this._core.$element.off(a, this.handlers[a]);

    for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.Lazy = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (c) {
    this._core = c, this._previousHeight = null, this._handlers = {
      "initialized.owl.carousel refreshed.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.autoHeight && this.update();
      }, this),
      "changed.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.autoHeight && "position" === a.property.name && this.update();
      }, this),
      "loaded.owl.lazy": a.proxy(function (a) {
        a.namespace && this._core.settings.autoHeight && a.element.closest("." + this._core.settings.itemClass).index() === this._core.current() && this.update();
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this._core.$element.on(this._handlers), this._intervalId = null;
    var d = this;
    a(b).on("load", function () {
      d._core.settings.autoHeight && d.update();
    }), a(b).resize(function () {
      d._core.settings.autoHeight && (null != d._intervalId && clearTimeout(d._intervalId), d._intervalId = setTimeout(function () {
        d.update();
      }, 250));
    });
  };

  e.Defaults = {
    autoHeight: !1,
    autoHeightClass: "owl-height"
  }, e.prototype.update = function () {
    var b = this._core._current,
        c = b + this._core.settings.items,
        d = this._core.settings.lazyLoad,
        e = this._core.$stage.children().toArray().slice(b, c),
        f = [],
        g = 0;

    a.each(e, function (b, c) {
      f.push(a(c).height());
    }), g = Math.max.apply(null, f), g <= 1 && d && this._previousHeight && (g = this._previousHeight), this._previousHeight = g, this._core.$stage.parent().height(g).addClass(this._core.settings.autoHeightClass);
  }, e.prototype.destroy = function () {
    var a, b;

    for (a in this._handlers) this._core.$element.off(a, this._handlers[a]);

    for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.AutoHeight = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (b) {
    this._core = b, this._videos = {}, this._playing = null, this._handlers = {
      "initialized.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.register({
          type: "state",
          name: "playing",
          tags: ["interacting"]
        });
      }, this),
      "resize.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.video && this.isInFullScreen() && a.preventDefault();
      }, this),
      "refreshed.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.is("resizing") && this._core.$stage.find(".cloned .owl-video-frame").remove();
      }, this),
      "changed.owl.carousel": a.proxy(function (a) {
        a.namespace && "position" === a.property.name && this._playing && this.stop();
      }, this),
      "prepared.owl.carousel": a.proxy(function (b) {
        if (b.namespace) {
          var c = a(b.content).find(".owl-video");
          c.length && (c.css("display", "none"), this.fetch(c, a(b.content)));
        }
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this._core.$element.on(this._handlers), this._core.$element.on("click.owl.video", ".owl-video-play-icon", a.proxy(function (a) {
      this.play(a);
    }, this));
  };

  e.Defaults = {
    video: !1,
    videoHeight: !1,
    videoWidth: !1
  }, e.prototype.fetch = function (a, b) {
    var c = function () {
      return a.attr("data-vimeo-id") ? "vimeo" : a.attr("data-vzaar-id") ? "vzaar" : "youtube";
    }(),
        d = a.attr("data-vimeo-id") || a.attr("data-youtube-id") || a.attr("data-vzaar-id"),
        e = a.attr("data-width") || this._core.settings.videoWidth,
        f = a.attr("data-height") || this._core.settings.videoHeight,
        g = a.attr("href");

    if (!g) throw new Error("Missing video URL.");
    if (d = g.match(/(http:|https:|)\/\/(player.|www.|app.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com|be\-nocookie\.com)|vzaar\.com)\/(video\/|videos\/|embed\/|channels\/.+\/|groups\/.+\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/), d[3].indexOf("youtu") > -1) c = "youtube";else if (d[3].indexOf("vimeo") > -1) c = "vimeo";else {
      if (!(d[3].indexOf("vzaar") > -1)) throw new Error("Video URL not supported.");
      c = "vzaar";
    }
    d = d[6], this._videos[g] = {
      type: c,
      id: d,
      width: e,
      height: f
    }, b.attr("data-video", g), this.thumbnail(a, this._videos[g]);
  }, e.prototype.thumbnail = function (b, c) {
    var d,
        e,
        f,
        g = c.width && c.height ? "width:" + c.width + "px;height:" + c.height + "px;" : "",
        h = b.find("img"),
        i = "src",
        j = "",
        k = this._core.settings,
        l = function (c) {
      e = '<div class="owl-video-play-icon"></div>', d = k.lazyLoad ? a("<div/>", {
        class: "owl-video-tn " + j,
        srcType: c
      }) : a("<div/>", {
        class: "owl-video-tn",
        style: "opacity:1;background-image:url(" + c + ")"
      }), b.after(d), b.after(e);
    };

    if (b.wrap(a("<div/>", {
      class: "owl-video-wrapper",
      style: g
    })), this._core.settings.lazyLoad && (i = "data-src", j = "owl-lazy"), h.length) return l(h.attr(i)), h.remove(), !1;
    "youtube" === c.type ? (f = "//img.youtube.com/vi/" + c.id + "/hqdefault.jpg", l(f)) : "vimeo" === c.type ? a.ajax({
      type: "GET",
      url: "//vimeo.com/api/v2/video/" + c.id + ".json",
      jsonp: "callback",
      dataType: "jsonp",
      success: function (a) {
        f = a[0].thumbnail_large, l(f);
      }
    }) : "vzaar" === c.type && a.ajax({
      type: "GET",
      url: "//vzaar.com/api/videos/" + c.id + ".json",
      jsonp: "callback",
      dataType: "jsonp",
      success: function (a) {
        f = a.framegrab_url, l(f);
      }
    });
  }, e.prototype.stop = function () {
    this._core.trigger("stop", null, "video"), this._playing.find(".owl-video-frame").remove(), this._playing.removeClass("owl-video-playing"), this._playing = null, this._core.leave("playing"), this._core.trigger("stopped", null, "video");
  }, e.prototype.play = function (b) {
    var c,
        d = a(b.target),
        e = d.closest("." + this._core.settings.itemClass),
        f = this._videos[e.attr("data-video")],
        g = f.width || "100%",
        h = f.height || this._core.$stage.height();

    this._playing || (this._core.enter("playing"), this._core.trigger("play", null, "video"), e = this._core.items(this._core.relative(e.index())), this._core.reset(e.index()), c = a('<iframe frameborder="0" allowfullscreen mozallowfullscreen webkitAllowFullScreen ></iframe>'), c.attr("height", h), c.attr("width", g), "youtube" === f.type ? c.attr("src", "//www.youtube.com/embed/" + f.id + "?autoplay=1&rel=0&v=" + f.id) : "vimeo" === f.type ? c.attr("src", "//player.vimeo.com/video/" + f.id + "?autoplay=1") : "vzaar" === f.type && c.attr("src", "//view.vzaar.com/" + f.id + "/player?autoplay=true"), a(c).wrap('<div class="owl-video-frame" />').insertAfter(e.find(".owl-video")), this._playing = e.addClass("owl-video-playing"));
  }, e.prototype.isInFullScreen = function () {
    var b = c.fullscreenElement || c.mozFullScreenElement || c.webkitFullscreenElement;
    return b && a(b).parent().hasClass("owl-video-frame");
  }, e.prototype.destroy = function () {
    var a, b;

    this._core.$element.off("click.owl.video");

    for (a in this._handlers) this._core.$element.off(a, this._handlers[a]);

    for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.Video = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (b) {
    this.core = b, this.core.options = a.extend({}, e.Defaults, this.core.options), this.swapping = !0, this.previous = d, this.next = d, this.handlers = {
      "change.owl.carousel": a.proxy(function (a) {
        a.namespace && "position" == a.property.name && (this.previous = this.core.current(), this.next = a.property.value);
      }, this),
      "drag.owl.carousel dragged.owl.carousel translated.owl.carousel": a.proxy(function (a) {
        a.namespace && (this.swapping = "translated" == a.type);
      }, this),
      "translate.owl.carousel": a.proxy(function (a) {
        a.namespace && this.swapping && (this.core.options.animateOut || this.core.options.animateIn) && this.swap();
      }, this)
    }, this.core.$element.on(this.handlers);
  };

  e.Defaults = {
    animateOut: !1,
    animateIn: !1
  }, e.prototype.swap = function () {
    if (1 === this.core.settings.items && a.support.animation && a.support.transition) {
      this.core.speed(0);
      var b,
          c = a.proxy(this.clear, this),
          d = this.core.$stage.children().eq(this.previous),
          e = this.core.$stage.children().eq(this.next),
          f = this.core.settings.animateIn,
          g = this.core.settings.animateOut;
      this.core.current() !== this.previous && (g && (b = this.core.coordinates(this.previous) - this.core.coordinates(this.next), d.one(a.support.animation.end, c).css({
        left: b + "px"
      }).addClass("animated owl-animated-out").addClass(g)), f && e.one(a.support.animation.end, c).addClass("animated owl-animated-in").addClass(f));
    }
  }, e.prototype.clear = function (b) {
    a(b.target).css({
      left: ""
    }).removeClass("animated owl-animated-out owl-animated-in").removeClass(this.core.settings.animateIn).removeClass(this.core.settings.animateOut), this.core.onTransitionEnd();
  }, e.prototype.destroy = function () {
    var a, b;

    for (a in this.handlers) this.core.$element.off(a, this.handlers[a]);

    for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.Animate = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  var e = function (b) {
    this._core = b, this._call = null, this._time = 0, this._timeout = 0, this._paused = !0, this._handlers = {
      "changed.owl.carousel": a.proxy(function (a) {
        a.namespace && "settings" === a.property.name ? this._core.settings.autoplay ? this.play() : this.stop() : a.namespace && "position" === a.property.name && this._paused && (this._time = 0);
      }, this),
      "initialized.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.autoplay && this.play();
      }, this),
      "play.owl.autoplay": a.proxy(function (a, b, c) {
        a.namespace && this.play(b, c);
      }, this),
      "stop.owl.autoplay": a.proxy(function (a) {
        a.namespace && this.stop();
      }, this),
      "mouseover.owl.autoplay": a.proxy(function () {
        this._core.settings.autoplayHoverPause && this._core.is("rotating") && this.pause();
      }, this),
      "mouseleave.owl.autoplay": a.proxy(function () {
        this._core.settings.autoplayHoverPause && this._core.is("rotating") && this.play();
      }, this),
      "touchstart.owl.core": a.proxy(function () {
        this._core.settings.autoplayHoverPause && this._core.is("rotating") && this.pause();
      }, this),
      "touchend.owl.core": a.proxy(function () {
        this._core.settings.autoplayHoverPause && this.play();
      }, this)
    }, this._core.$element.on(this._handlers), this._core.options = a.extend({}, e.Defaults, this._core.options);
  };

  e.Defaults = {
    autoplay: !1,
    autoplayTimeout: 5e3,
    autoplayHoverPause: !1,
    autoplaySpeed: !1
  }, e.prototype._next = function (d) {
    this._call = b.setTimeout(a.proxy(this._next, this, d), this._timeout * (Math.round(this.read() / this._timeout) + 1) - this.read()), this._core.is("interacting") || c.hidden || this._core.next(d || this._core.settings.autoplaySpeed);
  }, e.prototype.read = function () {
    return new Date().getTime() - this._time;
  }, e.prototype.play = function (c, d) {
    var e;
    this._core.is("rotating") || this._core.enter("rotating"), c = c || this._core.settings.autoplayTimeout, e = Math.min(this._time % (this._timeout || c), c), this._paused ? (this._time = this.read(), this._paused = !1) : b.clearTimeout(this._call), this._time += this.read() % c - e, this._timeout = c, this._call = b.setTimeout(a.proxy(this._next, this, d), c - e);
  }, e.prototype.stop = function () {
    this._core.is("rotating") && (this._time = 0, this._paused = !0, b.clearTimeout(this._call), this._core.leave("rotating"));
  }, e.prototype.pause = function () {
    this._core.is("rotating") && !this._paused && (this._time = this.read(), this._paused = !0, b.clearTimeout(this._call));
  }, e.prototype.destroy = function () {
    var a, b;
    this.stop();

    for (a in this._handlers) this._core.$element.off(a, this._handlers[a]);

    for (b in Object.getOwnPropertyNames(this)) "function" != typeof this[b] && (this[b] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.autoplay = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  "use strict";

  var e = function (b) {
    this._core = b, this._initialized = !1, this._pages = [], this._controls = {}, this._templates = [], this.$element = this._core.$element, this._overrides = {
      next: this._core.next,
      prev: this._core.prev,
      to: this._core.to
    }, this._handlers = {
      "prepared.owl.carousel": a.proxy(function (b) {
        b.namespace && this._core.settings.dotsData && this._templates.push('<div class="' + this._core.settings.dotClass + '">' + a(b.content).find("[data-dot]").addBack("[data-dot]").attr("data-dot") + "</div>");
      }, this),
      "added.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.dotsData && this._templates.splice(a.position, 0, this._templates.pop());
      }, this),
      "remove.owl.carousel": a.proxy(function (a) {
        a.namespace && this._core.settings.dotsData && this._templates.splice(a.position, 1);
      }, this),
      "changed.owl.carousel": a.proxy(function (a) {
        a.namespace && "position" == a.property.name && this.draw();
      }, this),
      "initialized.owl.carousel": a.proxy(function (a) {
        a.namespace && !this._initialized && (this._core.trigger("initialize", null, "navigation"), this.initialize(), this.update(), this.draw(), this._initialized = !0, this._core.trigger("initialized", null, "navigation"));
      }, this),
      "refreshed.owl.carousel": a.proxy(function (a) {
        a.namespace && this._initialized && (this._core.trigger("refresh", null, "navigation"), this.update(), this.draw(), this._core.trigger("refreshed", null, "navigation"));
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this.$element.on(this._handlers);
  };

  e.Defaults = {
    nav: !1,
    navText: ['<span aria-label="Previous">&#x2039;</span>', '<span aria-label="Next">&#x203a;</span>'],
    navSpeed: !1,
    navElement: 'button type="button" role="presentation"',
    navContainer: !1,
    navContainerClass: "owl-nav",
    navClass: ["owl-prev", "owl-next"],
    slideBy: 1,
    dotClass: "owl-dot",
    dotsClass: "owl-dots",
    dots: !0,
    dotsEach: !1,
    dotsData: !1,
    dotsSpeed: !1,
    dotsContainer: !1
  }, e.prototype.initialize = function () {
    var b,
        c = this._core.settings;
    this._controls.$relative = (c.navContainer ? a(c.navContainer) : a("<div>").addClass(c.navContainerClass).appendTo(this.$element)).addClass("disabled"), this._controls.$previous = a("<" + c.navElement + ">").addClass(c.navClass[0]).html(c.navText[0]).prependTo(this._controls.$relative).on("click", a.proxy(function (a) {
      this.prev(c.navSpeed);
    }, this)), this._controls.$next = a("<" + c.navElement + ">").addClass(c.navClass[1]).html(c.navText[1]).appendTo(this._controls.$relative).on("click", a.proxy(function (a) {
      this.next(c.navSpeed);
    }, this)), c.dotsData || (this._templates = [a('<button role="button">').addClass(c.dotClass).append(a("<span>")).prop("outerHTML")]), this._controls.$absolute = (c.dotsContainer ? a(c.dotsContainer) : a("<div>").addClass(c.dotsClass).appendTo(this.$element)).addClass("disabled"), this._controls.$absolute.on("click", "button", a.proxy(function (b) {
      var d = a(b.target).parent().is(this._controls.$absolute) ? a(b.target).index() : a(b.target).parent().index();
      b.preventDefault(), this.to(d, c.dotsSpeed);
    }, this));

    for (b in this._overrides) this._core[b] = a.proxy(this[b], this);
  }, e.prototype.destroy = function () {
    var a, b, c, d, e;
    e = this._core.settings;

    for (a in this._handlers) this.$element.off(a, this._handlers[a]);

    for (b in this._controls) "$relative" === b && e.navContainer ? this._controls[b].html("") : this._controls[b].remove();

    for (d in this.overides) this._core[d] = this._overrides[d];

    for (c in Object.getOwnPropertyNames(this)) "function" != typeof this[c] && (this[c] = null);
  }, e.prototype.update = function () {
    var a,
        b,
        c,
        d = this._core.clones().length / 2,
        e = d + this._core.items().length,
        f = this._core.maximum(!0),
        g = this._core.settings,
        h = g.center || g.autoWidth || g.dotsData ? 1 : g.dotsEach || g.items;

    if ("page" !== g.slideBy && (g.slideBy = Math.min(g.slideBy, g.items)), g.dots || "page" == g.slideBy) for (this._pages = [], a = d, b = 0, c = 0; a < e; a++) {
      if (b >= h || 0 === b) {
        if (this._pages.push({
          start: Math.min(f, a - d),
          end: a - d + h - 1
        }), Math.min(f, a - d) === f) break;
        b = 0, ++c;
      }

      b += this._core.mergers(this._core.relative(a));
    }
  }, e.prototype.draw = function () {
    var b,
        c = this._core.settings,
        d = this._core.items().length <= c.items,
        e = this._core.relative(this._core.current()),
        f = c.loop || c.rewind;

    this._controls.$relative.toggleClass("disabled", !c.nav || d), c.nav && (this._controls.$previous.toggleClass("disabled", !f && e <= this._core.minimum(!0)), this._controls.$next.toggleClass("disabled", !f && e >= this._core.maximum(!0))), this._controls.$absolute.toggleClass("disabled", !c.dots || d), c.dots && (b = this._pages.length - this._controls.$absolute.children().length, c.dotsData && 0 !== b ? this._controls.$absolute.html(this._templates.join("")) : b > 0 ? this._controls.$absolute.append(new Array(b + 1).join(this._templates[0])) : b < 0 && this._controls.$absolute.children().slice(b).remove(), this._controls.$absolute.find(".active").removeClass("active"), this._controls.$absolute.children().eq(a.inArray(this.current(), this._pages)).addClass("active"));
  }, e.prototype.onTrigger = function (b) {
    var c = this._core.settings;
    b.page = {
      index: a.inArray(this.current(), this._pages),
      count: this._pages.length,
      size: c && (c.center || c.autoWidth || c.dotsData ? 1 : c.dotsEach || c.items)
    };
  }, e.prototype.current = function () {
    var b = this._core.relative(this._core.current());

    return a.grep(this._pages, a.proxy(function (a, c) {
      return a.start <= b && a.end >= b;
    }, this)).pop();
  }, e.prototype.getPosition = function (b) {
    var c,
        d,
        e = this._core.settings;
    return "page" == e.slideBy ? (c = a.inArray(this.current(), this._pages), d = this._pages.length, b ? ++c : --c, c = this._pages[(c % d + d) % d].start) : (c = this._core.relative(this._core.current()), d = this._core.items().length, b ? c += e.slideBy : c -= e.slideBy), c;
  }, e.prototype.next = function (b) {
    a.proxy(this._overrides.to, this._core)(this.getPosition(!0), b);
  }, e.prototype.prev = function (b) {
    a.proxy(this._overrides.to, this._core)(this.getPosition(!1), b);
  }, e.prototype.to = function (b, c, d) {
    var e;
    !d && this._pages.length ? (e = this._pages.length, a.proxy(this._overrides.to, this._core)(this._pages[(b % e + e) % e].start, c)) : a.proxy(this._overrides.to, this._core)(b, c);
  }, a.fn.owlCarousel.Constructor.Plugins.Navigation = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  "use strict";

  var e = function (c) {
    this._core = c, this._hashes = {}, this.$element = this._core.$element, this._handlers = {
      "initialized.owl.carousel": a.proxy(function (c) {
        c.namespace && "URLHash" === this._core.settings.startPosition && a(b).trigger("hashchange.owl.navigation");
      }, this),
      "prepared.owl.carousel": a.proxy(function (b) {
        if (b.namespace) {
          var c = a(b.content).find("[data-hash]").addBack("[data-hash]").attr("data-hash");
          if (!c) return;
          this._hashes[c] = b.content;
        }
      }, this),
      "changed.owl.carousel": a.proxy(function (c) {
        if (c.namespace && "position" === c.property.name) {
          var d = this._core.items(this._core.relative(this._core.current())),
              e = a.map(this._hashes, function (a, b) {
            return a === d ? b : null;
          }).join();

          if (!e || b.location.hash.slice(1) === e) return;
          b.location.hash = e;
        }
      }, this)
    }, this._core.options = a.extend({}, e.Defaults, this._core.options), this.$element.on(this._handlers), a(b).on("hashchange.owl.navigation", a.proxy(function (a) {
      var c = b.location.hash.substring(1),
          e = this._core.$stage.children(),
          f = this._hashes[c] && e.index(this._hashes[c]);

      f !== d && f !== this._core.current() && this._core.to(this._core.relative(f), !1, !0);
    }, this));
  };

  e.Defaults = {
    URLhashListener: !1
  }, e.prototype.destroy = function () {
    var c, d;
    a(b).off("hashchange.owl.navigation");

    for (c in this._handlers) this._core.$element.off(c, this._handlers[c]);

    for (d in Object.getOwnPropertyNames(this)) "function" != typeof this[d] && (this[d] = null);
  }, a.fn.owlCarousel.Constructor.Plugins.Hash = e;
}(window.Zepto || window.jQuery, window, document), function (a, b, c, d) {
  function e(b, c) {
    var e = !1,
        f = b.charAt(0).toUpperCase() + b.slice(1);
    return a.each((b + " " + h.join(f + " ") + f).split(" "), function (a, b) {
      if (g[b] !== d) return e = !c || b, !1;
    }), e;
  }

  function f(a) {
    return e(a, !0);
  }

  var g = a("<support>").get(0).style,
      h = "Webkit Moz O ms".split(" "),
      i = {
    transition: {
      end: {
        WebkitTransition: "webkitTransitionEnd",
        MozTransition: "transitionend",
        OTransition: "oTransitionEnd",
        transition: "transitionend"
      }
    },
    animation: {
      end: {
        WebkitAnimation: "webkitAnimationEnd",
        MozAnimation: "animationend",
        OAnimation: "oAnimationEnd",
        animation: "animationend"
      }
    }
  },
      j = {
    csstransforms: function () {
      return !!e("transform");
    },
    csstransforms3d: function () {
      return !!e("perspective");
    },
    csstransitions: function () {
      return !!e("transition");
    },
    cssanimations: function () {
      return !!e("animation");
    }
  };
  j.csstransitions() && (a.support.transition = new String(f("transition")), a.support.transition.end = i.transition.end[a.support.transition]), j.cssanimations() && (a.support.animation = new String(f("animation")), a.support.animation.end = i.animation.end[a.support.animation]), j.csstransforms() && (a.support.transform = new String(f("transform")), a.support.transform3d = j.csstransforms3d());
}(window.Zepto || window.jQuery, window, document);
/* global followSocialMedia menuDropdown localStorage */

$(document).ready(function () {
  $('.owl-carousel').owlCarousel({
    loop: true,
    nav: false,
    items: 1,
    autoHeight: true,
    autoplay: true,
    animateOut: 'fadeOut',
    responsive: {
      0: {
        autoHeight: true
      },
      999: {
        autoHeight: false
      }
    }
  });
  var owl = $('.owl-carousel');
  owl.owlCarousel(); // Go to the next item

  $('.customNextBtn').click(function () {
    owl.trigger('next.owl.carousel');
  }); // Go to the previous item

  $('.customPrevBtn').click(function () {
    // With optional speed parameter
    // Parameters has to be in square bracket '[]'
    owl.trigger('prev.owl.carousel', [300]);
  });
}); // lib

const simplySetup = () => {
  const rootEl = document.documentElement;
  const documentBody = document.body;
  /* Menu DropDown
  /* ---------------------------------------------------------- */

  const dropDownMenu = () => {
    // Checking if the variable exists and if it is an object
    if (typeof menuDropdown !== 'object' || menuDropdown === null) return; // check if the box for the menu exists

    const $dropdownMenu = document.querySelector('.js-dropdown-menu');
    if (!$dropdownMenu) return;
    Object.entries(menuDropdown).forEach(_ref => {
      let [name, url] = _ref;
      if (name !== 'string' && !(0, _urlRegularExpression.default)(url)) return;
      const link = document.createElement('a');
      link.href = url;
      link.classList = 'dropdown-item block py-2 leading-tight px-5 hover:text-primary';
      link.innerText = name;
      $dropdownMenu.appendChild(link);
    });
  };

  dropDownMenu();
  /* Social Media
  /* ---------------------------------------------------------- */

  const socialMedia = () => {
    // Checking if the variable exists and if it is an object
    if (typeof followSocialMedia !== 'object' || followSocialMedia === null) return; // check if the box for the menu exists

    const $socialMedia = (0, _documentQuerySelectorAll.default)('.js-social-media');
    if (!$socialMedia.length) return;

    const linkElement = element => {
      Object.entries(followSocialMedia).forEach(_ref2 => {
        let [name, urlTitle] = _ref2;
        const url = urlTitle[0]; // The url is being validated if it is false it returns

        if (!(0, _urlRegularExpression.default)(url)) return;
        const link = document.createElement('a');
        link.href = url;
        link.title = urlTitle[1];
        link.classList = 'p-2 inline-block hover:opacity-70';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = `<svg class="icon"><use xlink:href="#icon-${name}"></use></svg>`;
        element.appendChild(link);
      });
    };

    $socialMedia.forEach(linkElement);
  };

  socialMedia();
  /*  Toggle modal
  /* ---------------------------------------------------------- */

  /*const simplyModal = () => {
    const $modals = docSelectorAll('.js-modal')
    const $modalButtons = docSelectorAll('.js-modal-button')
    const $modalCloses = docSelectorAll('.js-modal-close')
     // Modal Click Open
    if (!$modalButtons.length) return
    $modalButtons.forEach($el => $el.addEventListener('click', () => openModal($el.dataset.target)))
     // Modal Click Close
    if (!$modalCloses.length) return
    $modalCloses.forEach(el => el.addEventListener('click', () => closeModals()))
     const openModal = target => {
      documentBody.classList.remove('has-menu')
      const $target = document.getElementById(target)
      rootEl.classList.add('overflow-hidden')
      $target.classList.add('is-active')
    }
     const closeModals = () => {
      rootEl.classList.remove('overflow-hidden')
      $modals.forEach($el => $el.classList.remove('is-active'))
    }
     document.addEventListener('keydown', function (event) {
      const e = event || window.event
      if (e.keyCode === 27) {
        closeModals()
        // closeDropdowns()
      }
    })
  }
   simplyModal()
  */

  /* Header Transparency
  /* ---------------------------------------------------------- */

  const headerTransparency = () => {
    const hasCover = documentBody.closest('.has-cover');
    const $jsHeader = document.querySelector('.js-header');
    window.addEventListener('scroll', () => {
      const lastScrollY = window.scrollY;

      if (lastScrollY > 5) {
        $jsHeader.classList.add('shadow-header', 'header-bg');
      } else {
        $jsHeader.classList.remove('shadow-header', 'header-bg');
      }

      if (!hasCover) return;
      lastScrollY >= 20 ? documentBody.classList.remove('is-head-transparent') : documentBody.classList.add('is-head-transparent');
    }, {
      passive: true
    });
  };

  headerTransparency();
  /* Dark Mode
  /* ---------------------------------------------------------- */

  const darkMode = () => {
    const $toggleDarkMode = (0, _documentQuerySelectorAll.default)('.js-dark-mode');
    if (!$toggleDarkMode.length) return;
    $toggleDarkMode.forEach(item => item.addEventListener('click', function (event) {
      event.preventDefault();

      if (!rootEl.classList.contains('dark')) {
        rootEl.classList.add('dark');
        localStorage.theme = 'dark';
      } else {
        rootEl.classList.remove('dark');
        localStorage.theme = 'light';
      }
    }));
  };

  darkMode();
  /* DropDown Toggle
  /* ---------------------------------------------------------- */

  const dropDownMenuToggle = () => {
    const dropdowns = (0, _documentQuerySelectorAll.default)('.dropdown:not(.is-hoverable)');
    if (!dropdowns.length) return;
    dropdowns.forEach(function (el) {
      el.addEventListener('click', function (event) {
        event.stopPropagation();
        el.classList.toggle('is-active');
        documentBody.classList.remove('has-menu');
      });
    });

    const closeDropdowns = () => dropdowns.forEach(function (el) {
      el.classList.remove('is-active');
    });

    document.addEventListener('click', closeDropdowns);
  };

  dropDownMenuToggle();
  /* Toggle Menu
  /* ---------------------------------------------------------- */

  document.querySelector('.js-menu-toggle').addEventListener('click', function (e) {
    e.preventDefault();
    documentBody.classList.toggle('has-menu');
  });
};

document.addEventListener('DOMContentLoaded', simplySetup);

},{"./util/document-query-selector-all":4,"./util/url-regular-expression":5,"@babel/runtime/helpers/interopRequireDefault":1,"lazysizes":2}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = function _default(selector) {
  let parent = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;
  return Array.prototype.slice.call(parent.querySelectorAll(selector), 0);
};

exports.default = _default;

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = url => /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \+\.-]*)*\/?$/.test(url); //eslint-disable-line


exports.default = _default;

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGJhYmVsL3J1bnRpbWUvaGVscGVycy9pbnRlcm9wUmVxdWlyZURlZmF1bHQuanMiLCJub2RlX21vZHVsZXMvbGF6eXNpemVzL2xhenlzaXplcy5qcyIsInNyYy9qcy9tYWluLmpzIiwic3JjL2pzL3V0aWwvZG9jdW1lbnQtcXVlcnktc2VsZWN0b3ItYWxsLmpzIiwic3JjL2pzL3V0aWwvdXJsLXJlZ3VsYXItZXhwcmVzc2lvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7OztBQ3B3QkE7O0FBR0E7O0FBQ0E7O0FBN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQyxDQUFDLFVBQVMsQ0FBVCxFQUFXLENBQVgsRUFBYSxDQUFiLEVB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QUFTLENBQUMsT0FBVixDQUFrQixVQUFVLEVBQVYsRUFBYztNQUMzRCxFQUFFLENBQUMsU0FBSCxDQUFhLE1BQWIsQ0FBb0IsV0FBcEI7SUFDRCxDQUY0QixDQUE3Qjs7SUFJQSxRQUFRLENBQUMsZ0JBQVQsQ0FBMEIsT0FBMUIsRUFBbUMsY0FBbkM7RUFDRCxDQWxCRDs7RUFvQkEsa0JBQWtCO0VBRWxCO0FBQ0Y7O0VBQ0UsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsaUJBQXZCLEVBQTBDLGdCQUExQyxDQUEyRCxPQUEzRCxFQUFvRSxVQUFVLENBQVYsRUFBYTtJQUMvRSxDQUFDLENBQUMsY0FBRjtJQUNBLFlBQVksQ0FBQyxTQUFiLENBQXVCLE1BQXZCLENBQThCLFVBQTlCO0VBQ0QsQ0FIRDtBQUlELENBaExEOztBQWtMQSxRQUFRLENBQUMsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDLFdBQTlDOzs7Ozs7Ozs7O2VDbE9lLGtCQUFDLFFBQUQ7RUFBQSxJQUFXLE1BQVgsdUVBQW9CLFFBQXBCO0VBQUEsT0FBaUMsS0FBSyxDQUFDLFNBQU4sQ0FBZ0IsS0FBaEIsQ0FBc0IsSUFBdEIsQ0FBMkIsTUFBTSxDQUFDLGdCQUFQLENBQXdCLFFBQXhCLENBQTNCLEVBQThELENBQTlELENBQWpDO0FBQUEsQzs7Ozs7Ozs7Ozs7O2VDQUEsR0FBRyxJQUFJLG1FQUFtRSxJQUFuRSxDQUF3RSxHQUF4RSxDLEVBQTZFIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHtcbiAgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHtcbiAgICBcImRlZmF1bHRcIjogb2JqXG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdCwgbW9kdWxlLmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWUsIG1vZHVsZS5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IG1vZHVsZS5leHBvcnRzOyIsIihmdW5jdGlvbih3aW5kb3csIGZhY3RvcnkpIHtcblx0dmFyIGxhenlTaXplcyA9IGZhY3Rvcnkod2luZG93LCB3aW5kb3cuZG9jdW1lbnQsIERhdGUpO1xuXHR3aW5kb3cubGF6eVNpemVzID0gbGF6eVNpemVzO1xuXHRpZih0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKXtcblx0XHRtb2R1bGUuZXhwb3J0cyA9IGxhenlTaXplcztcblx0fVxufSh0eXBlb2Ygd2luZG93ICE9ICd1bmRlZmluZWQnID9cbiAgICAgIHdpbmRvdyA6IHt9LCBcbi8qKlxuICogaW1wb3J0KFwiLi90eXBlcy9nbG9iYWxcIilcbiAqIEB0eXBlZGVmIHsgaW1wb3J0KFwiLi90eXBlcy9sYXp5c2l6ZXMtY29uZmlnXCIpLkxhenlTaXplc0NvbmZpZ1BhcnRpYWwgfSBMYXp5U2l6ZXNDb25maWdQYXJ0aWFsXG4gKi9cbmZ1bmN0aW9uIGwod2luZG93LCBkb2N1bWVudCwgRGF0ZSkgeyAvLyBQYXNzIGluIHRoZSB3aW5kb3cgRGF0ZSBmdW5jdGlvbiBhbHNvIGZvciBTU1IgYmVjYXVzZSB0aGUgRGF0ZSBjbGFzcyBjYW4gYmUgbG9zdFxuXHQndXNlIHN0cmljdCc7XG5cdC8qanNoaW50IGVxbnVsbDp0cnVlICovXG5cblx0dmFyIGxhenlzaXplcyxcblx0XHQvKipcblx0XHQgKiBAdHlwZSB7IExhenlTaXplc0NvbmZpZ1BhcnRpYWwgfVxuXHRcdCAqL1xuXHRcdGxhenlTaXplc0NmZztcblxuXHQoZnVuY3Rpb24oKXtcblx0XHR2YXIgcHJvcDtcblxuXHRcdHZhciBsYXp5U2l6ZXNEZWZhdWx0cyA9IHtcblx0XHRcdGxhenlDbGFzczogJ2xhenlsb2FkJyxcblx0XHRcdGxvYWRlZENsYXNzOiAnbGF6eWxvYWRlZCcsXG5cdFx0XHRsb2FkaW5nQ2xhc3M6ICdsYXp5bG9hZGluZycsXG5cdFx0XHRwcmVsb2FkQ2xhc3M6ICdsYXp5cHJlbG9hZCcsXG5cdFx0XHRlcnJvckNsYXNzOiAnbGF6eWVycm9yJyxcblx0XHRcdC8vc3RyaWN0Q2xhc3M6ICdsYXp5c3RyaWN0Jyxcblx0XHRcdGF1dG9zaXplc0NsYXNzOiAnbGF6eWF1dG9zaXplcycsXG5cdFx0XHRmYXN0TG9hZGVkQ2xhc3M6ICdscy1pcy1jYWNoZWQnLFxuXHRcdFx0aWZyYW1lTG9hZE1vZGU6IDAsXG5cdFx0XHRzcmNBdHRyOiAnZGF0YS1zcmMnLFxuXHRcdFx0c3Jjc2V0QXR0cjogJ2RhdGEtc3Jjc2V0Jyxcblx0XHRcdHNpemVzQXR0cjogJ2RhdGEtc2l6ZXMnLFxuXHRcdFx0Ly9wcmVsb2FkQWZ0ZXJMb2FkOiBmYWxzZSxcblx0XHRcdG1pblNpemU6IDQwLFxuXHRcdFx0Y3VzdG9tTWVkaWE6IHt9LFxuXHRcdFx0aW5pdDogdHJ1ZSxcblx0XHRcdGV4cEZhY3RvcjogMS41LFxuXHRcdFx0aEZhYzogMC44LFxuXHRcdFx0bG9hZE1vZGU6IDIsXG5cdFx0XHRsb2FkSGlkZGVuOiB0cnVlLFxuXHRcdFx0cmljVGltZW91dDogMCxcblx0XHRcdHRocm90dGxlRGVsYXk6IDEyNSxcblx0XHR9O1xuXG5cdFx0bGF6eVNpemVzQ2ZnID0gd2luZG93LmxhenlTaXplc0NvbmZpZyB8fCB3aW5kb3cubGF6eXNpemVzQ29uZmlnIHx8IHt9O1xuXG5cdFx0Zm9yKHByb3AgaW4gbGF6eVNpemVzRGVmYXVsdHMpe1xuXHRcdFx0aWYoIShwcm9wIGluIGxhenlTaXplc0NmZykpe1xuXHRcdFx0XHRsYXp5U2l6ZXNDZmdbcHJvcF0gPSBsYXp5U2l6ZXNEZWZhdWx0c1twcm9wXTtcblx0XHRcdH1cblx0XHR9XG5cdH0pKCk7XG5cblx0aWYgKCFkb2N1bWVudCB8fCAhZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRpbml0OiBmdW5jdGlvbiAoKSB7fSxcblx0XHRcdC8qKlxuXHRcdFx0ICogQHR5cGUgeyBMYXp5U2l6ZXNDb25maWdQYXJ0aWFsIH1cblx0XHRcdCAqL1xuXHRcdFx0Y2ZnOiBsYXp5U2l6ZXNDZmcsXG5cdFx0XHQvKipcblx0XHRcdCAqIEB0eXBlIHsgdHJ1ZSB9XG5cdFx0XHQgKi9cblx0XHRcdG5vU3VwcG9ydDogdHJ1ZSxcblx0XHR9O1xuXHR9XG5cblx0dmFyIGRvY0VsZW0gPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG5cblx0dmFyIHN1cHBvcnRQaWN0dXJlID0gd2luZG93LkhUTUxQaWN0dXJlRWxlbWVudDtcblxuXHR2YXIgX2FkZEV2ZW50TGlzdGVuZXIgPSAnYWRkRXZlbnRMaXN0ZW5lcic7XG5cblx0dmFyIF9nZXRBdHRyaWJ1dGUgPSAnZ2V0QXR0cmlidXRlJztcblxuXHQvKipcblx0ICogVXBkYXRlIHRvIGJpbmQgdG8gd2luZG93IGJlY2F1c2UgJ3RoaXMnIGJlY29tZXMgbnVsbCBkdXJpbmcgU1NSXG5cdCAqIGJ1aWxkcy5cblx0ICovXG5cdHZhciBhZGRFdmVudExpc3RlbmVyID0gd2luZG93W19hZGRFdmVudExpc3RlbmVyXS5iaW5kKHdpbmRvdyk7XG5cblx0dmFyIHNldFRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dDtcblxuXHR2YXIgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBzZXRUaW1lb3V0O1xuXG5cdHZhciByZXF1ZXN0SWRsZUNhbGxiYWNrID0gd2luZG93LnJlcXVlc3RJZGxlQ2FsbGJhY2s7XG5cblx0dmFyIHJlZ1BpY3R1cmUgPSAvXnBpY3R1cmUkL2k7XG5cblx0dmFyIGxvYWRFdmVudHMgPSBbJ2xvYWQnLCAnZXJyb3InLCAnbGF6eWluY2x1ZGVkJywgJ19sYXp5bG9hZGVkJ107XG5cblx0dmFyIHJlZ0NsYXNzQ2FjaGUgPSB7fTtcblxuXHR2YXIgZm9yRWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoO1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0gZWxlIHtFbGVtZW50fVxuXHQgKiBAcGFyYW0gY2xzIHtzdHJpbmd9XG5cdCAqL1xuXHR2YXIgaGFzQ2xhc3MgPSBmdW5jdGlvbihlbGUsIGNscykge1xuXHRcdGlmKCFyZWdDbGFzc0NhY2hlW2Nsc10pe1xuXHRcdFx0cmVnQ2xhc3NDYWNoZVtjbHNdID0gbmV3IFJlZ0V4cCgnKFxcXFxzfF4pJytjbHMrJyhcXFxcc3wkKScpO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVnQ2xhc3NDYWNoZVtjbHNdLnRlc3QoZWxlW19nZXRBdHRyaWJ1dGVdKCdjbGFzcycpIHx8ICcnKSAmJiByZWdDbGFzc0NhY2hlW2Nsc107XG5cdH07XG5cblx0LyoqXG5cdCAqIEBwYXJhbSBlbGUge0VsZW1lbnR9XG5cdCAqIEBwYXJhbSBjbHMge3N0cmluZ31cblx0ICovXG5cdHZhciBhZGRDbGFzcyA9IGZ1bmN0aW9uKGVsZSwgY2xzKSB7XG5cdFx0aWYgKCFoYXNDbGFzcyhlbGUsIGNscykpe1xuXHRcdFx0ZWxlLnNldEF0dHJpYnV0ZSgnY2xhc3MnLCAoZWxlW19nZXRBdHRyaWJ1dGVdKCdjbGFzcycpIHx8ICcnKS50cmltKCkgKyAnICcgKyBjbHMpO1xuXHRcdH1cblx0fTtcblxuXHQvKipcblx0ICogQHBhcmFtIGVsZSB7RWxlbWVudH1cblx0ICogQHBhcmFtIGNscyB7c3RyaW5nfVxuXHQgKi9cblx0dmFyIHJlbW92ZUNsYXNzID0gZnVuY3Rpb24oZWxlLCBjbHMpIHtcblx0XHR2YXIgcmVnO1xuXHRcdGlmICgocmVnID0gaGFzQ2xhc3MoZWxlLGNscykpKSB7XG5cdFx0XHRlbGUuc2V0QXR0cmlidXRlKCdjbGFzcycsIChlbGVbX2dldEF0dHJpYnV0ZV0oJ2NsYXNzJykgfHwgJycpLnJlcGxhY2UocmVnLCAnICcpKTtcblx0XHR9XG5cdH07XG5cblx0dmFyIGFkZFJlbW92ZUxvYWRFdmVudHMgPSBmdW5jdGlvbihkb20sIGZuLCBhZGQpe1xuXHRcdHZhciBhY3Rpb24gPSBhZGQgPyBfYWRkRXZlbnRMaXN0ZW5lciA6ICdyZW1vdmVFdmVudExpc3RlbmVyJztcblx0XHRpZihhZGQpe1xuXHRcdFx0YWRkUmVtb3ZlTG9hZEV2ZW50cyhkb20sIGZuKTtcblx0XHR9XG5cdFx0bG9hZEV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKGV2dCl7XG5cdFx0XHRkb21bYWN0aW9uXShldnQsIGZuKTtcblx0XHR9KTtcblx0fTtcblxuXHQvKipcblx0ICogQHBhcmFtIGVsZW0geyBFbGVtZW50IH1cblx0ICogQHBhcmFtIG5hbWUgeyBzdHJpbmcgfVxuXHQgKiBAcGFyYW0gZGV0YWlsIHsgYW55IH1cblx0ICogQHBhcmFtIG5vQnViYmxlcyB7IGJvb2xlYW4gfVxuXHQgKiBAcGFyYW0gbm9DYW5jZWxhYmxlIHsgYm9vbGVhbiB9XG5cdCAqIEByZXR1cm5zIHsgQ3VzdG9tRXZlbnQgfVxuXHQgKi9cblx0dmFyIHRyaWdnZXJFdmVudCA9IGZ1bmN0aW9uKGVsZW0sIG5hbWUsIGRldGFpbCwgbm9CdWJibGVzLCBub0NhbmNlbGFibGUpe1xuXHRcdHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXG5cdFx0aWYoIWRldGFpbCl7XG5cdFx0XHRkZXRhaWwgPSB7fTtcblx0XHR9XG5cblx0XHRkZXRhaWwuaW5zdGFuY2UgPSBsYXp5c2l6ZXM7XG5cblx0XHRldmVudC5pbml0RXZlbnQobmFtZSwgIW5vQnViYmxlcywgIW5vQ2FuY2VsYWJsZSk7XG5cblx0XHRldmVudC5kZXRhaWwgPSBkZXRhaWw7XG5cblx0XHRlbGVtLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdHJldHVybiBldmVudDtcblx0fTtcblxuXHR2YXIgdXBkYXRlUG9seWZpbGwgPSBmdW5jdGlvbiAoZWwsIGZ1bGwpe1xuXHRcdHZhciBwb2x5ZmlsbDtcblx0XHRpZiggIXN1cHBvcnRQaWN0dXJlICYmICggcG9seWZpbGwgPSAod2luZG93LnBpY3R1cmVmaWxsIHx8IGxhenlTaXplc0NmZy5wZikgKSApe1xuXHRcdFx0aWYoZnVsbCAmJiBmdWxsLnNyYyAmJiAhZWxbX2dldEF0dHJpYnV0ZV0oJ3NyY3NldCcpKXtcblx0XHRcdFx0ZWwuc2V0QXR0cmlidXRlKCdzcmNzZXQnLCBmdWxsLnNyYyk7XG5cdFx0XHR9XG5cdFx0XHRwb2x5ZmlsbCh7cmVldmFsdWF0ZTogdHJ1ZSwgZWxlbWVudHM6IFtlbF19KTtcblx0XHR9IGVsc2UgaWYoZnVsbCAmJiBmdWxsLnNyYyl7XG5cdFx0XHRlbC5zcmMgPSBmdWxsLnNyYztcblx0XHR9XG5cdH07XG5cblx0dmFyIGdldENTUyA9IGZ1bmN0aW9uIChlbGVtLCBzdHlsZSl7XG5cdFx0cmV0dXJuIChnZXRDb21wdXRlZFN0eWxlKGVsZW0sIG51bGwpIHx8IHt9KVtzdHlsZV07XG5cdH07XG5cblx0LyoqXG5cdCAqXG5cdCAqIEBwYXJhbSBlbGVtIHsgRWxlbWVudCB9XG5cdCAqIEBwYXJhbSBwYXJlbnQgeyBFbGVtZW50IH1cblx0ICogQHBhcmFtIFt3aWR0aF0ge251bWJlcn1cblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdHZhciBnZXRXaWR0aCA9IGZ1bmN0aW9uKGVsZW0sIHBhcmVudCwgd2lkdGgpe1xuXHRcdHdpZHRoID0gd2lkdGggfHwgZWxlbS5vZmZzZXRXaWR0aDtcblxuXHRcdHdoaWxlKHdpZHRoIDwgbGF6eVNpemVzQ2ZnLm1pblNpemUgJiYgcGFyZW50ICYmICFlbGVtLl9sYXp5c2l6ZXNXaWR0aCl7XG5cdFx0XHR3aWR0aCA9ICBwYXJlbnQub2Zmc2V0V2lkdGg7XG5cdFx0XHRwYXJlbnQgPSBwYXJlbnQucGFyZW50Tm9kZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gd2lkdGg7XG5cdH07XG5cblx0dmFyIHJBRiA9IChmdW5jdGlvbigpe1xuXHRcdHZhciBydW5uaW5nLCB3YWl0aW5nO1xuXHRcdHZhciBmaXJzdEZucyA9IFtdO1xuXHRcdHZhciBzZWNvbmRGbnMgPSBbXTtcblx0XHR2YXIgZm5zID0gZmlyc3RGbnM7XG5cblx0XHR2YXIgcnVuID0gZnVuY3Rpb24oKXtcblx0XHRcdHZhciBydW5GbnMgPSBmbnM7XG5cblx0XHRcdGZucyA9IGZpcnN0Rm5zLmxlbmd0aCA/IHNlY29uZEZucyA6IGZpcnN0Rm5zO1xuXG5cdFx0XHRydW5uaW5nID0gdHJ1ZTtcblx0XHRcdHdhaXRpbmcgPSBmYWxzZTtcblxuXHRcdFx0d2hpbGUocnVuRm5zLmxlbmd0aCl7XG5cdFx0XHRcdHJ1bkZucy5zaGlmdCgpKCk7XG5cdFx0XHR9XG5cblx0XHRcdHJ1bm5pbmcgPSBmYWxzZTtcblx0XHR9O1xuXG5cdFx0dmFyIHJhZkJhdGNoID0gZnVuY3Rpb24oZm4sIHF1ZXVlKXtcblx0XHRcdGlmKHJ1bm5pbmcgJiYgIXF1ZXVlKXtcblx0XHRcdFx0Zm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZucy5wdXNoKGZuKTtcblxuXHRcdFx0XHRpZighd2FpdGluZyl7XG5cdFx0XHRcdFx0d2FpdGluZyA9IHRydWU7XG5cdFx0XHRcdFx0KGRvY3VtZW50LmhpZGRlbiA/IHNldFRpbWVvdXQgOiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUpKHJ1bik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0cmFmQmF0Y2guX2xzRmx1c2ggPSBydW47XG5cblx0XHRyZXR1cm4gcmFmQmF0Y2g7XG5cdH0pKCk7XG5cblx0dmFyIHJBRkl0ID0gZnVuY3Rpb24oZm4sIHNpbXBsZSl7XG5cdFx0cmV0dXJuIHNpbXBsZSA/XG5cdFx0XHRmdW5jdGlvbigpIHtcblx0XHRcdFx0ckFGKGZuKTtcblx0XHRcdH0gOlxuXHRcdFx0ZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0XHR2YXIgYXJncyA9IGFyZ3VtZW50cztcblx0XHRcdFx0ckFGKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0Zm4uYXBwbHkodGhhdCwgYXJncyk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdDtcblx0fTtcblxuXHR2YXIgdGhyb3R0bGUgPSBmdW5jdGlvbihmbil7XG5cdFx0dmFyIHJ1bm5pbmc7XG5cdFx0dmFyIGxhc3RUaW1lID0gMDtcblx0XHR2YXIgZ0RlbGF5ID0gbGF6eVNpemVzQ2ZnLnRocm90dGxlRGVsYXk7XG5cdFx0dmFyIHJJQ1RpbWVvdXQgPSBsYXp5U2l6ZXNDZmcucmljVGltZW91dDtcblx0XHR2YXIgcnVuID0gZnVuY3Rpb24oKXtcblx0XHRcdHJ1bm5pbmcgPSBmYWxzZTtcblx0XHRcdGxhc3RUaW1lID0gRGF0ZS5ub3coKTtcblx0XHRcdGZuKCk7XG5cdFx0fTtcblx0XHR2YXIgaWRsZUNhbGxiYWNrID0gcmVxdWVzdElkbGVDYWxsYmFjayAmJiBySUNUaW1lb3V0ID4gNDkgP1xuXHRcdFx0ZnVuY3Rpb24oKXtcblx0XHRcdFx0cmVxdWVzdElkbGVDYWxsYmFjayhydW4sIHt0aW1lb3V0OiBySUNUaW1lb3V0fSk7XG5cblx0XHRcdFx0aWYocklDVGltZW91dCAhPT0gbGF6eVNpemVzQ2ZnLnJpY1RpbWVvdXQpe1xuXHRcdFx0XHRcdHJJQ1RpbWVvdXQgPSBsYXp5U2l6ZXNDZmcucmljVGltZW91dDtcblx0XHRcdFx0fVxuXHRcdFx0fSA6XG5cdFx0XHRyQUZJdChmdW5jdGlvbigpe1xuXHRcdFx0XHRzZXRUaW1lb3V0KHJ1bik7XG5cdFx0XHR9LCB0cnVlKVxuXHRcdDtcblxuXHRcdHJldHVybiBmdW5jdGlvbihpc1ByaW9yaXR5KXtcblx0XHRcdHZhciBkZWxheTtcblxuXHRcdFx0aWYoKGlzUHJpb3JpdHkgPSBpc1ByaW9yaXR5ID09PSB0cnVlKSl7XG5cdFx0XHRcdHJJQ1RpbWVvdXQgPSAzMztcblx0XHRcdH1cblxuXHRcdFx0aWYocnVubmluZyl7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0cnVubmluZyA9ICB0cnVlO1xuXG5cdFx0XHRkZWxheSA9IGdEZWxheSAtIChEYXRlLm5vdygpIC0gbGFzdFRpbWUpO1xuXG5cdFx0XHRpZihkZWxheSA8IDApe1xuXHRcdFx0XHRkZWxheSA9IDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmKGlzUHJpb3JpdHkgfHwgZGVsYXkgPCA5KXtcblx0XHRcdFx0aWRsZUNhbGxiYWNrKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzZXRUaW1lb3V0KGlkbGVDYWxsYmFjaywgZGVsYXkpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH07XG5cblx0Ly9iYXNlZCBvbiBodHRwOi8vbW9kZXJuamF2YXNjcmlwdC5ibG9nc3BvdC5kZS8yMDEzLzA4L2J1aWxkaW5nLWJldHRlci1kZWJvdW5jZS5odG1sXG5cdHZhciBkZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcblx0XHR2YXIgdGltZW91dCwgdGltZXN0YW1wO1xuXHRcdHZhciB3YWl0ID0gOTk7XG5cdFx0dmFyIHJ1biA9IGZ1bmN0aW9uKCl7XG5cdFx0XHR0aW1lb3V0ID0gbnVsbDtcblx0XHRcdGZ1bmMoKTtcblx0XHR9O1xuXHRcdHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhc3QgPSBEYXRlLm5vdygpIC0gdGltZXN0YW1wO1xuXG5cdFx0XHRpZiAobGFzdCA8IHdhaXQpIHtcblx0XHRcdFx0c2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0KHJlcXVlc3RJZGxlQ2FsbGJhY2sgfHwgcnVuKShydW4pO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHR0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuXG5cdFx0XHRpZiAoIXRpbWVvdXQpIHtcblx0XHRcdFx0dGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH07XG5cblx0dmFyIGxvYWRlciA9IChmdW5jdGlvbigpe1xuXHRcdHZhciBwcmVsb2FkRWxlbXMsIGlzQ29tcGxldGVkLCByZXNldFByZWxvYWRpbmdUaW1lciwgbG9hZE1vZGUsIHN0YXJ0ZWQ7XG5cblx0XHR2YXIgZUx2VywgZWx2SCwgZUx0b3AsIGVMbGVmdCwgZUxyaWdodCwgZUxib3R0b20sIGlzQm9keUhpZGRlbjtcblxuXHRcdHZhciByZWdJbWcgPSAvXmltZyQvaTtcblx0XHR2YXIgcmVnSWZyYW1lID0gL15pZnJhbWUkL2k7XG5cblx0XHR2YXIgc3VwcG9ydFNjcm9sbCA9ICgnb25zY3JvbGwnIGluIHdpbmRvdykgJiYgISgvKGdsZXxpbmcpYm90Ly50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKTtcblxuXHRcdHZhciBzaHJpbmtFeHBhbmQgPSAwO1xuXHRcdHZhciBjdXJyZW50RXhwYW5kID0gMDtcblxuXHRcdHZhciBpc0xvYWRpbmcgPSAwO1xuXHRcdHZhciBsb3dSdW5zID0gLTE7XG5cblx0XHR2YXIgcmVzZXRQcmVsb2FkaW5nID0gZnVuY3Rpb24oZSl7XG5cdFx0XHRpc0xvYWRpbmctLTtcblx0XHRcdGlmKCFlIHx8IGlzTG9hZGluZyA8IDAgfHwgIWUudGFyZ2V0KXtcblx0XHRcdFx0aXNMb2FkaW5nID0gMDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIGlzVmlzaWJsZSA9IGZ1bmN0aW9uIChlbGVtKSB7XG5cdFx0XHRpZiAoaXNCb2R5SGlkZGVuID09IG51bGwpIHtcblx0XHRcdFx0aXNCb2R5SGlkZGVuID0gZ2V0Q1NTKGRvY3VtZW50LmJvZHksICd2aXNpYmlsaXR5JykgPT0gJ2hpZGRlbic7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBpc0JvZHlIaWRkZW4gfHwgIShnZXRDU1MoZWxlbS5wYXJlbnROb2RlLCAndmlzaWJpbGl0eScpID09ICdoaWRkZW4nICYmIGdldENTUyhlbGVtLCAndmlzaWJpbGl0eScpID09ICdoaWRkZW4nKTtcblx0XHR9O1xuXG5cdFx0dmFyIGlzTmVzdGVkVmlzaWJsZSA9IGZ1bmN0aW9uKGVsZW0sIGVsZW1FeHBhbmQpe1xuXHRcdFx0dmFyIG91dGVyUmVjdDtcblx0XHRcdHZhciBwYXJlbnQgPSBlbGVtO1xuXHRcdFx0dmFyIHZpc2libGUgPSBpc1Zpc2libGUoZWxlbSk7XG5cblx0XHRcdGVMdG9wIC09IGVsZW1FeHBhbmQ7XG5cdFx0XHRlTGJvdHRvbSArPSBlbGVtRXhwYW5kO1xuXHRcdFx0ZUxsZWZ0IC09IGVsZW1FeHBhbmQ7XG5cdFx0XHRlTHJpZ2h0ICs9IGVsZW1FeHBhbmQ7XG5cblx0XHRcdHdoaWxlKHZpc2libGUgJiYgKHBhcmVudCA9IHBhcmVudC5vZmZzZXRQYXJlbnQpICYmIHBhcmVudCAhPSBkb2N1bWVudC5ib2R5ICYmIHBhcmVudCAhPSBkb2NFbGVtKXtcblx0XHRcdFx0dmlzaWJsZSA9ICgoZ2V0Q1NTKHBhcmVudCwgJ29wYWNpdHknKSB8fCAxKSA+IDApO1xuXG5cdFx0XHRcdGlmKHZpc2libGUgJiYgZ2V0Q1NTKHBhcmVudCwgJ292ZXJmbG93JykgIT0gJ3Zpc2libGUnKXtcblx0XHRcdFx0XHRvdXRlclJlY3QgPSBwYXJlbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cdFx0XHRcdFx0dmlzaWJsZSA9IGVMcmlnaHQgPiBvdXRlclJlY3QubGVmdCAmJlxuXHRcdFx0XHRcdFx0ZUxsZWZ0IDwgb3V0ZXJSZWN0LnJpZ2h0ICYmXG5cdFx0XHRcdFx0XHRlTGJvdHRvbSA+IG91dGVyUmVjdC50b3AgLSAxICYmXG5cdFx0XHRcdFx0XHRlTHRvcCA8IG91dGVyUmVjdC5ib3R0b20gKyAxXG5cdFx0XHRcdFx0O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB2aXNpYmxlO1xuXHRcdH07XG5cblx0XHR2YXIgY2hlY2tFbGVtZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGVMbGVuLCBpLCByZWN0LCBhdXRvTG9hZEVsZW0sIGxvYWRlZFNvbWV0aGluZywgZWxlbUV4cGFuZCwgZWxlbU5lZ2F0aXZlRXhwYW5kLCBlbGVtRXhwYW5kVmFsLFxuXHRcdFx0XHRiZWZvcmVFeHBhbmRWYWwsIGRlZmF1bHRFeHBhbmQsIHByZWxvYWRFeHBhbmQsIGhGYWM7XG5cdFx0XHR2YXIgbGF6eWxvYWRFbGVtcyA9IGxhenlzaXplcy5lbGVtZW50cztcblxuXHRcdFx0aWYoKGxvYWRNb2RlID0gbGF6eVNpemVzQ2ZnLmxvYWRNb2RlKSAmJiBpc0xvYWRpbmcgPCA4ICYmIChlTGxlbiA9IGxhenlsb2FkRWxlbXMubGVuZ3RoKSl7XG5cblx0XHRcdFx0aSA9IDA7XG5cblx0XHRcdFx0bG93UnVucysrO1xuXG5cdFx0XHRcdGZvcig7IGkgPCBlTGxlbjsgaSsrKXtcblxuXHRcdFx0XHRcdGlmKCFsYXp5bG9hZEVsZW1zW2ldIHx8IGxhenlsb2FkRWxlbXNbaV0uX2xhenlSYWNlKXtjb250aW51ZTt9XG5cblx0XHRcdFx0XHRpZighc3VwcG9ydFNjcm9sbCB8fCAobGF6eXNpemVzLnByZW1hdHVyZVVudmVpbCAmJiBsYXp5c2l6ZXMucHJlbWF0dXJlVW52ZWlsKGxhenlsb2FkRWxlbXNbaV0pKSl7dW52ZWlsRWxlbWVudChsYXp5bG9hZEVsZW1zW2ldKTtjb250aW51ZTt9XG5cblx0XHRcdFx0XHRpZighKGVsZW1FeHBhbmRWYWwgPSBsYXp5bG9hZEVsZW1zW2ldW19nZXRBdHRyaWJ1dGVdKCdkYXRhLWV4cGFuZCcpKSB8fCAhKGVsZW1FeHBhbmQgPSBlbGVtRXhwYW5kVmFsICogMSkpe1xuXHRcdFx0XHRcdFx0ZWxlbUV4cGFuZCA9IGN1cnJlbnRFeHBhbmQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFkZWZhdWx0RXhwYW5kKSB7XG5cdFx0XHRcdFx0XHRkZWZhdWx0RXhwYW5kID0gKCFsYXp5U2l6ZXNDZmcuZXhwYW5kIHx8IGxhenlTaXplc0NmZy5leHBhbmQgPCAxKSA/XG5cdFx0XHRcdFx0XHRcdGRvY0VsZW0uY2xpZW50SGVpZ2h0ID4gNTAwICYmIGRvY0VsZW0uY2xpZW50V2lkdGggPiA1MDAgPyA1MDAgOiAzNzAgOlxuXHRcdFx0XHRcdFx0XHRsYXp5U2l6ZXNDZmcuZXhwYW5kO1xuXG5cdFx0XHRcdFx0XHRsYXp5c2l6ZXMuX2RlZkV4ID0gZGVmYXVsdEV4cGFuZDtcblxuXHRcdFx0XHRcdFx0cHJlbG9hZEV4cGFuZCA9IGRlZmF1bHRFeHBhbmQgKiBsYXp5U2l6ZXNDZmcuZXhwRmFjdG9yO1xuXHRcdFx0XHRcdFx0aEZhYyA9IGxhenlTaXplc0NmZy5oRmFjO1xuXHRcdFx0XHRcdFx0aXNCb2R5SGlkZGVuID0gbnVsbDtcblxuXHRcdFx0XHRcdFx0aWYoY3VycmVudEV4cGFuZCA8IHByZWxvYWRFeHBhbmQgJiYgaXNMb2FkaW5nIDwgMSAmJiBsb3dSdW5zID4gMiAmJiBsb2FkTW9kZSA+IDIgJiYgIWRvY3VtZW50LmhpZGRlbil7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRFeHBhbmQgPSBwcmVsb2FkRXhwYW5kO1xuXHRcdFx0XHRcdFx0XHRsb3dSdW5zID0gMDtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZihsb2FkTW9kZSA+IDEgJiYgbG93UnVucyA+IDEgJiYgaXNMb2FkaW5nIDwgNil7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRFeHBhbmQgPSBkZWZhdWx0RXhwYW5kO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0Y3VycmVudEV4cGFuZCA9IHNocmlua0V4cGFuZDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZihiZWZvcmVFeHBhbmRWYWwgIT09IGVsZW1FeHBhbmQpe1xuXHRcdFx0XHRcdFx0ZUx2VyA9IGlubmVyV2lkdGggKyAoZWxlbUV4cGFuZCAqIGhGYWMpO1xuXHRcdFx0XHRcdFx0ZWx2SCA9IGlubmVySGVpZ2h0ICsgZWxlbUV4cGFuZDtcblx0XHRcdFx0XHRcdGVsZW1OZWdhdGl2ZUV4cGFuZCA9IGVsZW1FeHBhbmQgKiAtMTtcblx0XHRcdFx0XHRcdGJlZm9yZUV4cGFuZFZhbCA9IGVsZW1FeHBhbmQ7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmVjdCA9IGxhenlsb2FkRWxlbXNbaV0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cblx0XHRcdFx0XHRpZiAoKGVMYm90dG9tID0gcmVjdC5ib3R0b20pID49IGVsZW1OZWdhdGl2ZUV4cGFuZCAmJlxuXHRcdFx0XHRcdFx0KGVMdG9wID0gcmVjdC50b3ApIDw9IGVsdkggJiZcblx0XHRcdFx0XHRcdChlTHJpZ2h0ID0gcmVjdC5yaWdodCkgPj0gZWxlbU5lZ2F0aXZlRXhwYW5kICogaEZhYyAmJlxuXHRcdFx0XHRcdFx0KGVMbGVmdCA9IHJlY3QubGVmdCkgPD0gZUx2VyAmJlxuXHRcdFx0XHRcdFx0KGVMYm90dG9tIHx8IGVMcmlnaHQgfHwgZUxsZWZ0IHx8IGVMdG9wKSAmJlxuXHRcdFx0XHRcdFx0KGxhenlTaXplc0NmZy5sb2FkSGlkZGVuIHx8IGlzVmlzaWJsZShsYXp5bG9hZEVsZW1zW2ldKSkgJiZcblx0XHRcdFx0XHRcdCgoaXNDb21wbGV0ZWQgJiYgaXNMb2FkaW5nIDwgMyAmJiAhZWxlbUV4cGFuZFZhbCAmJiAobG9hZE1vZGUgPCAzIHx8IGxvd1J1bnMgPCA0KSkgfHwgaXNOZXN0ZWRWaXNpYmxlKGxhenlsb2FkRWxlbXNbaV0sIGVsZW1FeHBhbmQpKSl7XG5cdFx0XHRcdFx0XHR1bnZlaWxFbGVtZW50KGxhenlsb2FkRWxlbXNbaV0pO1xuXHRcdFx0XHRcdFx0bG9hZGVkU29tZXRoaW5nID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGlmKGlzTG9hZGluZyA+IDkpe2JyZWFrO31cblx0XHRcdFx0XHR9IGVsc2UgaWYoIWxvYWRlZFNvbWV0aGluZyAmJiBpc0NvbXBsZXRlZCAmJiAhYXV0b0xvYWRFbGVtICYmXG5cdFx0XHRcdFx0XHRpc0xvYWRpbmcgPCA0ICYmIGxvd1J1bnMgPCA0ICYmIGxvYWRNb2RlID4gMiAmJlxuXHRcdFx0XHRcdFx0KHByZWxvYWRFbGVtc1swXSB8fCBsYXp5U2l6ZXNDZmcucHJlbG9hZEFmdGVyTG9hZCkgJiZcblx0XHRcdFx0XHRcdChwcmVsb2FkRWxlbXNbMF0gfHwgKCFlbGVtRXhwYW5kVmFsICYmICgoZUxib3R0b20gfHwgZUxyaWdodCB8fCBlTGxlZnQgfHwgZUx0b3ApIHx8IGxhenlsb2FkRWxlbXNbaV1bX2dldEF0dHJpYnV0ZV0obGF6eVNpemVzQ2ZnLnNpemVzQXR0cikgIT0gJ2F1dG8nKSkpKXtcblx0XHRcdFx0XHRcdGF1dG9Mb2FkRWxlbSA9IHByZWxvYWRFbGVtc1swXSB8fCBsYXp5bG9hZEVsZW1zW2ldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKGF1dG9Mb2FkRWxlbSAmJiAhbG9hZGVkU29tZXRoaW5nKXtcblx0XHRcdFx0XHR1bnZlaWxFbGVtZW50KGF1dG9Mb2FkRWxlbSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIHRocm90dGxlZENoZWNrRWxlbWVudHMgPSB0aHJvdHRsZShjaGVja0VsZW1lbnRzKTtcblxuXHRcdHZhciBzd2l0Y2hMb2FkaW5nQ2xhc3MgPSBmdW5jdGlvbihlKXtcblx0XHRcdHZhciBlbGVtID0gZS50YXJnZXQ7XG5cblx0XHRcdGlmIChlbGVtLl9sYXp5Q2FjaGUpIHtcblx0XHRcdFx0ZGVsZXRlIGVsZW0uX2xhenlDYWNoZTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNldFByZWxvYWRpbmcoZSk7XG5cdFx0XHRhZGRDbGFzcyhlbGVtLCBsYXp5U2l6ZXNDZmcubG9hZGVkQ2xhc3MpO1xuXHRcdFx0cmVtb3ZlQ2xhc3MoZWxlbSwgbGF6eVNpemVzQ2ZnLmxvYWRpbmdDbGFzcyk7XG5cdFx0XHRhZGRSZW1vdmVMb2FkRXZlbnRzKGVsZW0sIHJhZlN3aXRjaExvYWRpbmdDbGFzcyk7XG5cdFx0XHR0cmlnZ2VyRXZlbnQoZWxlbSwgJ2xhenlsb2FkZWQnKTtcblx0XHR9O1xuXHRcdHZhciByYWZlZFN3aXRjaExvYWRpbmdDbGFzcyA9IHJBRkl0KHN3aXRjaExvYWRpbmdDbGFzcyk7XG5cdFx0dmFyIHJhZlN3aXRjaExvYWRpbmdDbGFzcyA9IGZ1bmN0aW9uKGUpe1xuXHRcdFx0cmFmZWRTd2l0Y2hMb2FkaW5nQ2xhc3Moe3RhcmdldDogZS50YXJnZXR9KTtcblx0XHR9O1xuXG5cdFx0dmFyIGNoYW5nZUlmcmFtZVNyYyA9IGZ1bmN0aW9uKGVsZW0sIHNyYyl7XG5cdFx0XHR2YXIgbG9hZE1vZGUgPSBlbGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1sb2FkLW1vZGUnKSB8fCBsYXp5U2l6ZXNDZmcuaWZyYW1lTG9hZE1vZGU7XG5cblx0XHRcdC8vIGxvYWRNb2RlIGNhbiBiZSBhbHNvIGEgc3RyaW5nIVxuXHRcdFx0aWYgKGxvYWRNb2RlID09IDApIHtcblx0XHRcdFx0ZWxlbS5jb250ZW50V2luZG93LmxvY2F0aW9uLnJlcGxhY2Uoc3JjKTtcblx0XHRcdH0gZWxzZSBpZiAobG9hZE1vZGUgPT0gMSkge1xuXHRcdFx0XHRlbGVtLnNyYyA9IHNyYztcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIGhhbmRsZVNvdXJjZXMgPSBmdW5jdGlvbihzb3VyY2Upe1xuXHRcdFx0dmFyIGN1c3RvbU1lZGlhO1xuXG5cdFx0XHR2YXIgc291cmNlU3Jjc2V0ID0gc291cmNlW19nZXRBdHRyaWJ1dGVdKGxhenlTaXplc0NmZy5zcmNzZXRBdHRyKTtcblxuXHRcdFx0aWYoIChjdXN0b21NZWRpYSA9IGxhenlTaXplc0NmZy5jdXN0b21NZWRpYVtzb3VyY2VbX2dldEF0dHJpYnV0ZV0oJ2RhdGEtbWVkaWEnKSB8fCBzb3VyY2VbX2dldEF0dHJpYnV0ZV0oJ21lZGlhJyldKSApe1xuXHRcdFx0XHRzb3VyY2Uuc2V0QXR0cmlidXRlKCdtZWRpYScsIGN1c3RvbU1lZGlhKTtcblx0XHRcdH1cblxuXHRcdFx0aWYoc291cmNlU3Jjc2V0KXtcblx0XHRcdFx0c291cmNlLnNldEF0dHJpYnV0ZSgnc3Jjc2V0Jywgc291cmNlU3Jjc2V0KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIGxhenlVbnZlaWwgPSByQUZJdChmdW5jdGlvbiAoZWxlbSwgZGV0YWlsLCBpc0F1dG8sIHNpemVzLCBpc0ltZyl7XG5cdFx0XHR2YXIgc3JjLCBzcmNzZXQsIHBhcmVudCwgaXNQaWN0dXJlLCBldmVudCwgZmlyZXNMb2FkO1xuXG5cdFx0XHRpZighKGV2ZW50ID0gdHJpZ2dlckV2ZW50KGVsZW0sICdsYXp5YmVmb3JldW52ZWlsJywgZGV0YWlsKSkuZGVmYXVsdFByZXZlbnRlZCl7XG5cblx0XHRcdFx0aWYoc2l6ZXMpe1xuXHRcdFx0XHRcdGlmKGlzQXV0byl7XG5cdFx0XHRcdFx0XHRhZGRDbGFzcyhlbGVtLCBsYXp5U2l6ZXNDZmcuYXV0b3NpemVzQ2xhc3MpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSgnc2l6ZXMnLCBzaXplcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0c3Jjc2V0ID0gZWxlbVtfZ2V0QXR0cmlidXRlXShsYXp5U2l6ZXNDZmcuc3Jjc2V0QXR0cik7XG5cdFx0XHRcdHNyYyA9IGVsZW1bX2dldEF0dHJpYnV0ZV0obGF6eVNpemVzQ2ZnLnNyY0F0dHIpO1xuXG5cdFx0XHRcdGlmKGlzSW1nKSB7XG5cdFx0XHRcdFx0cGFyZW50ID0gZWxlbS5wYXJlbnROb2RlO1xuXHRcdFx0XHRcdGlzUGljdHVyZSA9IHBhcmVudCAmJiByZWdQaWN0dXJlLnRlc3QocGFyZW50Lm5vZGVOYW1lIHx8ICcnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZpcmVzTG9hZCA9IGRldGFpbC5maXJlc0xvYWQgfHwgKCgnc3JjJyBpbiBlbGVtKSAmJiAoc3Jjc2V0IHx8IHNyYyB8fCBpc1BpY3R1cmUpKTtcblxuXHRcdFx0XHRldmVudCA9IHt0YXJnZXQ6IGVsZW19O1xuXG5cdFx0XHRcdGFkZENsYXNzKGVsZW0sIGxhenlTaXplc0NmZy5sb2FkaW5nQ2xhc3MpO1xuXG5cdFx0XHRcdGlmKGZpcmVzTG9hZCl7XG5cdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHJlc2V0UHJlbG9hZGluZ1RpbWVyKTtcblx0XHRcdFx0XHRyZXNldFByZWxvYWRpbmdUaW1lciA9IHNldFRpbWVvdXQocmVzZXRQcmVsb2FkaW5nLCAyNTAwKTtcblx0XHRcdFx0XHRhZGRSZW1vdmVMb2FkRXZlbnRzKGVsZW0sIHJhZlN3aXRjaExvYWRpbmdDbGFzcywgdHJ1ZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZihpc1BpY3R1cmUpe1xuXHRcdFx0XHRcdGZvckVhY2guY2FsbChwYXJlbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NvdXJjZScpLCBoYW5kbGVTb3VyY2VzKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKHNyY3NldCl7XG5cdFx0XHRcdFx0ZWxlbS5zZXRBdHRyaWJ1dGUoJ3NyY3NldCcsIHNyY3NldCk7XG5cdFx0XHRcdH0gZWxzZSBpZihzcmMgJiYgIWlzUGljdHVyZSl7XG5cdFx0XHRcdFx0aWYocmVnSWZyYW1lLnRlc3QoZWxlbS5ub2RlTmFtZSkpe1xuXHRcdFx0XHRcdFx0Y2hhbmdlSWZyYW1lU3JjKGVsZW0sIHNyYyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGVsZW0uc3JjID0gc3JjO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmKGlzSW1nICYmIChzcmNzZXQgfHwgaXNQaWN0dXJlKSl7XG5cdFx0XHRcdFx0dXBkYXRlUG9seWZpbGwoZWxlbSwge3NyYzogc3JjfSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYoZWxlbS5fbGF6eVJhY2Upe1xuXHRcdFx0XHRkZWxldGUgZWxlbS5fbGF6eVJhY2U7XG5cdFx0XHR9XG5cdFx0XHRyZW1vdmVDbGFzcyhlbGVtLCBsYXp5U2l6ZXNDZmcubGF6eUNsYXNzKTtcblxuXHRcdFx0ckFGKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdC8vIFBhcnQgb2YgdGhpcyBjYW4gYmUgcmVtb3ZlZCBhcyBzb29uIGFzIHRoaXMgZml4IGlzIG9sZGVyOiBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD03NzMxICgyMDE1KVxuXHRcdFx0XHR2YXIgaXNMb2FkZWQgPSBlbGVtLmNvbXBsZXRlICYmIGVsZW0ubmF0dXJhbFdpZHRoID4gMTtcblxuXHRcdFx0XHRpZiggIWZpcmVzTG9hZCB8fCBpc0xvYWRlZCl7XG5cdFx0XHRcdFx0aWYgKGlzTG9hZGVkKSB7XG5cdFx0XHRcdFx0XHRhZGRDbGFzcyhlbGVtLCBsYXp5U2l6ZXNDZmcuZmFzdExvYWRlZENsYXNzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3dpdGNoTG9hZGluZ0NsYXNzKGV2ZW50KTtcblx0XHRcdFx0XHRlbGVtLl9sYXp5Q2FjaGUgPSB0cnVlO1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdGlmICgnX2xhenlDYWNoZScgaW4gZWxlbSkge1xuXHRcdFx0XHRcdFx0XHRkZWxldGUgZWxlbS5fbGF6eUNhY2hlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0sIDkpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChlbGVtLmxvYWRpbmcgPT0gJ2xhenknKSB7XG5cdFx0XHRcdFx0aXNMb2FkaW5nLS07XG5cdFx0XHRcdH1cblx0XHRcdH0sIHRydWUpO1xuXHRcdH0pO1xuXG5cdFx0LyoqXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gZWxlbSB7IEVsZW1lbnQgfVxuXHRcdCAqL1xuXHRcdHZhciB1bnZlaWxFbGVtZW50ID0gZnVuY3Rpb24gKGVsZW0pe1xuXHRcdFx0aWYgKGVsZW0uX2xhenlSYWNlKSB7cmV0dXJuO31cblx0XHRcdHZhciBkZXRhaWw7XG5cblx0XHRcdHZhciBpc0ltZyA9IHJlZ0ltZy50ZXN0KGVsZW0ubm9kZU5hbWUpO1xuXG5cdFx0XHQvL2FsbG93IHVzaW5nIHNpemVzPVwiYXV0b1wiLCBidXQgZG9uJ3QgdXNlLiBpdCdzIGludmFsaWQuIFVzZSBkYXRhLXNpemVzPVwiYXV0b1wiIG9yIGEgdmFsaWQgdmFsdWUgZm9yIHNpemVzIGluc3RlYWQgKGkuZS46IHNpemVzPVwiODB2d1wiKVxuXHRcdFx0dmFyIHNpemVzID0gaXNJbWcgJiYgKGVsZW1bX2dldEF0dHJpYnV0ZV0obGF6eVNpemVzQ2ZnLnNpemVzQXR0cikgfHwgZWxlbVtfZ2V0QXR0cmlidXRlXSgnc2l6ZXMnKSk7XG5cdFx0XHR2YXIgaXNBdXRvID0gc2l6ZXMgPT0gJ2F1dG8nO1xuXG5cdFx0XHRpZiggKGlzQXV0byB8fCAhaXNDb21wbGV0ZWQpICYmIGlzSW1nICYmIChlbGVtW19nZXRBdHRyaWJ1dGVdKCdzcmMnKSB8fCBlbGVtLnNyY3NldCkgJiYgIWVsZW0uY29tcGxldGUgJiYgIWhhc0NsYXNzKGVsZW0sIGxhenlTaXplc0NmZy5lcnJvckNsYXNzKSAmJiBoYXNDbGFzcyhlbGVtLCBsYXp5U2l6ZXNDZmcubGF6eUNsYXNzKSl7cmV0dXJuO31cblxuXHRcdFx0ZGV0YWlsID0gdHJpZ2dlckV2ZW50KGVsZW0sICdsYXp5dW52ZWlscmVhZCcpLmRldGFpbDtcblxuXHRcdFx0aWYoaXNBdXRvKXtcblx0XHRcdFx0IGF1dG9TaXplci51cGRhdGVFbGVtKGVsZW0sIHRydWUsIGVsZW0ub2Zmc2V0V2lkdGgpO1xuXHRcdFx0fVxuXG5cdFx0XHRlbGVtLl9sYXp5UmFjZSA9IHRydWU7XG5cdFx0XHRpc0xvYWRpbmcrKztcblxuXHRcdFx0bGF6eVVudmVpbChlbGVtLCBkZXRhaWwsIGlzQXV0bywgc2l6ZXMsIGlzSW1nKTtcblx0XHR9O1xuXG5cdFx0dmFyIGFmdGVyU2Nyb2xsID0gZGVib3VuY2UoZnVuY3Rpb24oKXtcblx0XHRcdGxhenlTaXplc0NmZy5sb2FkTW9kZSA9IDM7XG5cdFx0XHR0aHJvdHRsZWRDaGVja0VsZW1lbnRzKCk7XG5cdFx0fSk7XG5cblx0XHR2YXIgYWx0TG9hZG1vZGVTY3JvbGxMaXN0bmVyID0gZnVuY3Rpb24oKXtcblx0XHRcdGlmKGxhenlTaXplc0NmZy5sb2FkTW9kZSA9PSAzKXtcblx0XHRcdFx0bGF6eVNpemVzQ2ZnLmxvYWRNb2RlID0gMjtcblx0XHRcdH1cblx0XHRcdGFmdGVyU2Nyb2xsKCk7XG5cdFx0fTtcblxuXHRcdHZhciBvbmxvYWQgPSBmdW5jdGlvbigpe1xuXHRcdFx0aWYoaXNDb21wbGV0ZWQpe3JldHVybjt9XG5cdFx0XHRpZihEYXRlLm5vdygpIC0gc3RhcnRlZCA8IDk5OSl7XG5cdFx0XHRcdHNldFRpbWVvdXQob25sb2FkLCA5OTkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblxuXHRcdFx0aXNDb21wbGV0ZWQgPSB0cnVlO1xuXG5cdFx0XHRsYXp5U2l6ZXNDZmcubG9hZE1vZGUgPSAzO1xuXG5cdFx0XHR0aHJvdHRsZWRDaGVja0VsZW1lbnRzKCk7XG5cblx0XHRcdGFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIGFsdExvYWRtb2RlU2Nyb2xsTGlzdG5lciwgdHJ1ZSk7XG5cdFx0fTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRfOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRzdGFydGVkID0gRGF0ZS5ub3coKTtcblxuXHRcdFx0XHRsYXp5c2l6ZXMuZWxlbWVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGxhenlTaXplc0NmZy5sYXp5Q2xhc3MpO1xuXHRcdFx0XHRwcmVsb2FkRWxlbXMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKGxhenlTaXplc0NmZy5sYXp5Q2xhc3MgKyAnICcgKyBsYXp5U2l6ZXNDZmcucHJlbG9hZENsYXNzKTtcblxuXHRcdFx0XHRhZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aHJvdHRsZWRDaGVja0VsZW1lbnRzLCB0cnVlKTtcblxuXHRcdFx0XHRhZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aHJvdHRsZWRDaGVja0VsZW1lbnRzLCB0cnVlKTtcblxuXHRcdFx0XHRhZGRFdmVudExpc3RlbmVyKCdwYWdlc2hvdycsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdFx0aWYgKGUucGVyc2lzdGVkKSB7XG5cdFx0XHRcdFx0XHR2YXIgbG9hZGluZ0VsZW1lbnRzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLicgKyBsYXp5U2l6ZXNDZmcubG9hZGluZ0NsYXNzKTtcblxuXHRcdFx0XHRcdFx0aWYgKGxvYWRpbmdFbGVtZW50cy5sZW5ndGggJiYgbG9hZGluZ0VsZW1lbnRzLmZvckVhY2gpIHtcblx0XHRcdFx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRcdFx0XHRsb2FkaW5nRWxlbWVudHMuZm9yRWFjaCggZnVuY3Rpb24gKGltZykge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGltZy5jb21wbGV0ZSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR1bnZlaWxFbGVtZW50KGltZyk7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0aWYod2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpe1xuXHRcdFx0XHRcdG5ldyBNdXRhdGlvbk9ic2VydmVyKCB0aHJvdHRsZWRDaGVja0VsZW1lbnRzICkub2JzZXJ2ZSggZG9jRWxlbSwge2NoaWxkTGlzdDogdHJ1ZSwgc3VidHJlZTogdHJ1ZSwgYXR0cmlidXRlczogdHJ1ZX0gKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkb2NFbGVtW19hZGRFdmVudExpc3RlbmVyXSgnRE9NTm9kZUluc2VydGVkJywgdGhyb3R0bGVkQ2hlY2tFbGVtZW50cywgdHJ1ZSk7XG5cdFx0XHRcdFx0ZG9jRWxlbVtfYWRkRXZlbnRMaXN0ZW5lcl0oJ0RPTUF0dHJNb2RpZmllZCcsIHRocm90dGxlZENoZWNrRWxlbWVudHMsIHRydWUpO1xuXHRcdFx0XHRcdHNldEludGVydmFsKHRocm90dGxlZENoZWNrRWxlbWVudHMsIDk5OSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRhZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdGhyb3R0bGVkQ2hlY2tFbGVtZW50cywgdHJ1ZSk7XG5cblx0XHRcdFx0Ly8sICdmdWxsc2NyZWVuY2hhbmdlJ1xuXHRcdFx0XHRbJ2ZvY3VzJywgJ21vdXNlb3ZlcicsICdjbGljaycsICdsb2FkJywgJ3RyYW5zaXRpb25lbmQnLCAnYW5pbWF0aW9uZW5kJ10uZm9yRWFjaChmdW5jdGlvbihuYW1lKXtcblx0XHRcdFx0XHRkb2N1bWVudFtfYWRkRXZlbnRMaXN0ZW5lcl0obmFtZSwgdGhyb3R0bGVkQ2hlY2tFbGVtZW50cywgdHJ1ZSk7XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGlmKCgvZCR8XmMvLnRlc3QoZG9jdW1lbnQucmVhZHlTdGF0ZSkpKXtcblx0XHRcdFx0XHRvbmxvYWQoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhZGRFdmVudExpc3RlbmVyKCdsb2FkJywgb25sb2FkKTtcblx0XHRcdFx0XHRkb2N1bWVudFtfYWRkRXZlbnRMaXN0ZW5lcl0oJ0RPTUNvbnRlbnRMb2FkZWQnLCB0aHJvdHRsZWRDaGVja0VsZW1lbnRzKTtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KG9ubG9hZCwgMjAwMDApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYobGF6eXNpemVzLmVsZW1lbnRzLmxlbmd0aCl7XG5cdFx0XHRcdFx0Y2hlY2tFbGVtZW50cygpO1xuXHRcdFx0XHRcdHJBRi5fbHNGbHVzaCgpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm90dGxlZENoZWNrRWxlbWVudHMoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdGNoZWNrRWxlbXM6IHRocm90dGxlZENoZWNrRWxlbWVudHMsXG5cdFx0XHR1bnZlaWw6IHVudmVpbEVsZW1lbnQsXG5cdFx0XHRfYUxTTDogYWx0TG9hZG1vZGVTY3JvbGxMaXN0bmVyLFxuXHRcdH07XG5cdH0pKCk7XG5cblxuXHR2YXIgYXV0b1NpemVyID0gKGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGF1dG9zaXplc0VsZW1zO1xuXG5cdFx0dmFyIHNpemVFbGVtZW50ID0gckFGSXQoZnVuY3Rpb24oZWxlbSwgcGFyZW50LCBldmVudCwgd2lkdGgpe1xuXHRcdFx0dmFyIHNvdXJjZXMsIGksIGxlbjtcblx0XHRcdGVsZW0uX2xhenlzaXplc1dpZHRoID0gd2lkdGg7XG5cdFx0XHR3aWR0aCArPSAncHgnO1xuXG5cdFx0XHRlbGVtLnNldEF0dHJpYnV0ZSgnc2l6ZXMnLCB3aWR0aCk7XG5cblx0XHRcdGlmKHJlZ1BpY3R1cmUudGVzdChwYXJlbnQubm9kZU5hbWUgfHwgJycpKXtcblx0XHRcdFx0c291cmNlcyA9IHBhcmVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc291cmNlJyk7XG5cdFx0XHRcdGZvcihpID0gMCwgbGVuID0gc291cmNlcy5sZW5ndGg7IGkgPCBsZW47IGkrKyl7XG5cdFx0XHRcdFx0c291cmNlc1tpXS5zZXRBdHRyaWJ1dGUoJ3NpemVzJywgd2lkdGgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGlmKCFldmVudC5kZXRhaWwuZGF0YUF0dHIpe1xuXHRcdFx0XHR1cGRhdGVQb2x5ZmlsbChlbGVtLCBldmVudC5kZXRhaWwpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8qKlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIGVsZW0ge0VsZW1lbnR9XG5cdFx0ICogQHBhcmFtIGRhdGFBdHRyXG5cdFx0ICogQHBhcmFtIFt3aWR0aF0geyBudW1iZXIgfVxuXHRcdCAqL1xuXHRcdHZhciBnZXRTaXplRWxlbWVudCA9IGZ1bmN0aW9uIChlbGVtLCBkYXRhQXR0ciwgd2lkdGgpe1xuXHRcdFx0dmFyIGV2ZW50O1xuXHRcdFx0dmFyIHBhcmVudCA9IGVsZW0ucGFyZW50Tm9kZTtcblxuXHRcdFx0aWYocGFyZW50KXtcblx0XHRcdFx0d2lkdGggPSBnZXRXaWR0aChlbGVtLCBwYXJlbnQsIHdpZHRoKTtcblx0XHRcdFx0ZXZlbnQgPSB0cmlnZ2VyRXZlbnQoZWxlbSwgJ2xhenliZWZvcmVzaXplcycsIHt3aWR0aDogd2lkdGgsIGRhdGFBdHRyOiAhIWRhdGFBdHRyfSk7XG5cblx0XHRcdFx0aWYoIWV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpe1xuXHRcdFx0XHRcdHdpZHRoID0gZXZlbnQuZGV0YWlsLndpZHRoO1xuXG5cdFx0XHRcdFx0aWYod2lkdGggJiYgd2lkdGggIT09IGVsZW0uX2xhenlzaXplc1dpZHRoKXtcblx0XHRcdFx0XHRcdHNpemVFbGVtZW50KGVsZW0sIHBhcmVudCwgZXZlbnQsIHdpZHRoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIHVwZGF0ZUVsZW1lbnRzU2l6ZXMgPSBmdW5jdGlvbigpe1xuXHRcdFx0dmFyIGk7XG5cdFx0XHR2YXIgbGVuID0gYXV0b3NpemVzRWxlbXMubGVuZ3RoO1xuXHRcdFx0aWYobGVuKXtcblx0XHRcdFx0aSA9IDA7XG5cblx0XHRcdFx0Zm9yKDsgaSA8IGxlbjsgaSsrKXtcblx0XHRcdFx0XHRnZXRTaXplRWxlbWVudChhdXRvc2l6ZXNFbGVtc1tpXSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dmFyIGRlYm91bmNlZFVwZGF0ZUVsZW1lbnRzU2l6ZXMgPSBkZWJvdW5jZSh1cGRhdGVFbGVtZW50c1NpemVzKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRfOiBmdW5jdGlvbigpe1xuXHRcdFx0XHRhdXRvc2l6ZXNFbGVtcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUobGF6eVNpemVzQ2ZnLmF1dG9zaXplc0NsYXNzKTtcblx0XHRcdFx0YWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZGVib3VuY2VkVXBkYXRlRWxlbWVudHNTaXplcyk7XG5cdFx0XHR9LFxuXHRcdFx0Y2hlY2tFbGVtczogZGVib3VuY2VkVXBkYXRlRWxlbWVudHNTaXplcyxcblx0XHRcdHVwZGF0ZUVsZW06IGdldFNpemVFbGVtZW50XG5cdFx0fTtcblx0fSkoKTtcblxuXHR2YXIgaW5pdCA9IGZ1bmN0aW9uKCl7XG5cdFx0aWYoIWluaXQuaSAmJiBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKXtcblx0XHRcdGluaXQuaSA9IHRydWU7XG5cdFx0XHRhdXRvU2l6ZXIuXygpO1xuXHRcdFx0bG9hZGVyLl8oKTtcblx0XHR9XG5cdH07XG5cblx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdGlmKGxhenlTaXplc0NmZy5pbml0KXtcblx0XHRcdGluaXQoKTtcblx0XHR9XG5cdH0pO1xuXG5cdGxhenlzaXplcyA9IHtcblx0XHQvKipcblx0XHQgKiBAdHlwZSB7IExhenlTaXplc0NvbmZpZ1BhcnRpYWwgfVxuXHRcdCAqL1xuXHRcdGNmZzogbGF6eVNpemVzQ2ZnLFxuXHRcdGF1dG9TaXplcjogYXV0b1NpemVyLFxuXHRcdGxvYWRlcjogbG9hZGVyLFxuXHRcdGluaXQ6IGluaXQsXG5cdFx0dVA6IHVwZGF0ZVBvbHlmaWxsLFxuXHRcdGFDOiBhZGRDbGFzcyxcblx0XHRyQzogcmVtb3ZlQ2xhc3MsXG5cdFx0aEM6IGhhc0NsYXNzLFxuXHRcdGZpcmU6IHRyaWdnZXJFdmVudCxcblx0XHRnVzogZ2V0V2lkdGgsXG5cdFx0ckFGOiByQUYsXG5cdH07XG5cblx0cmV0dXJuIGxhenlzaXplcztcbn1cbikpO1xuIiwiXG4vKipcbiAqIE93bCBDYXJvdXNlbCB2Mi4zLjRcbiAqIENvcHlyaWdodCAyMDEzLTIwMTggRGF2aWQgRGV1dHNjaFxuICogTGljZW5zZWQgdW5kZXI6IFNFRSBMSUNFTlNFIElOIGh0dHBzOi8vZ2l0aHViLmNvbS9Pd2xDYXJvdXNlbDIvT3dsQ2Fyb3VzZWwyL2Jsb2IvbWFzdGVyL0xJQ0VOU0VcbiAqL1xuICFmdW5jdGlvbihhLGIsYyxkKXtmdW5jdGlvbiBlKGIsYyl7dGhpcy5zZXR0aW5ncz1udWxsLHRoaXMub3B0aW9ucz1hLmV4dGVuZCh7fSxlLkRlZmF1bHRzLGMpLHRoaXMuJGVsZW1lbnQ9YShiKSx0aGlzLl9oYW5kbGVycz17fSx0aGlzLl9wbHVnaW5zPXt9LHRoaXMuX3N1cHJlc3M9e30sdGhpcy5fY3VycmVudD1udWxsLHRoaXMuX3NwZWVkPW51bGwsdGhpcy5fY29vcmRpbmF0ZXM9W10sdGhpcy5fYnJlYWtwb2ludD1udWxsLHRoaXMuX3dpZHRoPW51bGwsdGhpcy5faXRlbXM9W10sdGhpcy5fY2xvbmVzPVtdLHRoaXMuX21lcmdlcnM9W10sdGhpcy5fd2lkdGhzPVtdLHRoaXMuX2ludmFsaWRhdGVkPXt9LHRoaXMuX3BpcGU9W10sdGhpcy5fZHJhZz17dGltZTpudWxsLHRhcmdldDpudWxsLHBvaW50ZXI6bnVsbCxzdGFnZTp7c3RhcnQ6bnVsbCxjdXJyZW50Om51bGx9LGRpcmVjdGlvbjpudWxsfSx0aGlzLl9zdGF0ZXM9e2N1cnJlbnQ6e30sdGFnczp7aW5pdGlhbGl6aW5nOltcImJ1c3lcIl0sYW5pbWF0aW5nOltcImJ1c3lcIl0sZHJhZ2dpbmc6W1wiaW50ZXJhY3RpbmdcIl19fSxhLmVhY2goW1wib25SZXNpemVcIixcIm9uVGhyb3R0bGVkUmVzaXplXCJdLGEucHJveHkoZnVuY3Rpb24oYixjKXt0aGlzLl9oYW5kbGVyc1tjXT1hLnByb3h5KHRoaXNbY10sdGhpcyl9LHRoaXMpKSxhLmVhY2goZS5QbHVnaW5zLGEucHJveHkoZnVuY3Rpb24oYSxiKXt0aGlzLl9wbHVnaW5zW2EuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkrYS5zbGljZSgxKV09bmV3IGIodGhpcyl9LHRoaXMpKSxhLmVhY2goZS5Xb3JrZXJzLGEucHJveHkoZnVuY3Rpb24oYixjKXt0aGlzLl9waXBlLnB1c2goe2ZpbHRlcjpjLmZpbHRlcixydW46YS5wcm94eShjLnJ1bix0aGlzKX0pfSx0aGlzKSksdGhpcy5zZXR1cCgpLHRoaXMuaW5pdGlhbGl6ZSgpfWUuRGVmYXVsdHM9e2l0ZW1zOjMsbG9vcDohMSxjZW50ZXI6ITEscmV3aW5kOiExLGNoZWNrVmlzaWJpbGl0eTohMCxtb3VzZURyYWc6ITAsdG91Y2hEcmFnOiEwLHB1bGxEcmFnOiEwLGZyZWVEcmFnOiExLG1hcmdpbjowLHN0YWdlUGFkZGluZzowLG1lcmdlOiExLG1lcmdlRml0OiEwLGF1dG9XaWR0aDohMSxzdGFydFBvc2l0aW9uOjAscnRsOiExLHNtYXJ0U3BlZWQ6MjUwLGZsdWlkU3BlZWQ6ITEsZHJhZ0VuZFNwZWVkOiExLHJlc3BvbnNpdmU6e30scmVzcG9uc2l2ZVJlZnJlc2hSYXRlOjIwMCxyZXNwb25zaXZlQmFzZUVsZW1lbnQ6YixmYWxsYmFja0Vhc2luZzpcInN3aW5nXCIsc2xpZGVUcmFuc2l0aW9uOlwiXCIsaW5mbzohMSxuZXN0ZWRJdGVtU2VsZWN0b3I6ITEsaXRlbUVsZW1lbnQ6XCJkaXZcIixzdGFnZUVsZW1lbnQ6XCJkaXZcIixyZWZyZXNoQ2xhc3M6XCJvd2wtcmVmcmVzaFwiLGxvYWRlZENsYXNzOlwib3dsLWxvYWRlZFwiLGxvYWRpbmdDbGFzczpcIm93bC1sb2FkaW5nXCIscnRsQ2xhc3M6XCJvd2wtcnRsXCIscmVzcG9uc2l2ZUNsYXNzOlwib3dsLXJlc3BvbnNpdmVcIixkcmFnQ2xhc3M6XCJvd2wtZHJhZ1wiLGl0ZW1DbGFzczpcIm93bC1pdGVtXCIsc3RhZ2VDbGFzczpcIm93bC1zdGFnZVwiLHN0YWdlT3V0ZXJDbGFzczpcIm93bC1zdGFnZS1vdXRlclwiLGdyYWJDbGFzczpcIm93bC1ncmFiXCJ9LGUuV2lkdGg9e0RlZmF1bHQ6XCJkZWZhdWx0XCIsSW5uZXI6XCJpbm5lclwiLE91dGVyOlwib3V0ZXJcIn0sZS5UeXBlPXtFdmVudDpcImV2ZW50XCIsU3RhdGU6XCJzdGF0ZVwifSxlLlBsdWdpbnM9e30sZS5Xb3JrZXJzPVt7ZmlsdGVyOltcIndpZHRoXCIsXCJzZXR0aW5nc1wiXSxydW46ZnVuY3Rpb24oKXt0aGlzLl93aWR0aD10aGlzLiRlbGVtZW50LndpZHRoKCl9fSx7ZmlsdGVyOltcIndpZHRoXCIsXCJpdGVtc1wiLFwic2V0dGluZ3NcIl0scnVuOmZ1bmN0aW9uKGEpe2EuY3VycmVudD10aGlzLl9pdGVtcyYmdGhpcy5faXRlbXNbdGhpcy5yZWxhdGl2ZSh0aGlzLl9jdXJyZW50KV19fSx7ZmlsdGVyOltcIml0ZW1zXCIsXCJzZXR0aW5nc1wiXSxydW46ZnVuY3Rpb24oKXt0aGlzLiRzdGFnZS5jaGlsZHJlbihcIi5jbG9uZWRcIikucmVtb3ZlKCl9fSx7ZmlsdGVyOltcIndpZHRoXCIsXCJpdGVtc1wiLFwic2V0dGluZ3NcIl0scnVuOmZ1bmN0aW9uKGEpe3ZhciBiPXRoaXMuc2V0dGluZ3MubWFyZ2lufHxcIlwiLGM9IXRoaXMuc2V0dGluZ3MuYXV0b1dpZHRoLGQ9dGhpcy5zZXR0aW5ncy5ydGwsZT17d2lkdGg6XCJhdXRvXCIsXCJtYXJnaW4tbGVmdFwiOmQ/YjpcIlwiLFwibWFyZ2luLXJpZ2h0XCI6ZD9cIlwiOmJ9OyFjJiZ0aGlzLiRzdGFnZS5jaGlsZHJlbigpLmNzcyhlKSxhLmNzcz1lfX0se2ZpbHRlcjpbXCJ3aWR0aFwiLFwiaXRlbXNcIixcInNldHRpbmdzXCJdLHJ1bjpmdW5jdGlvbihhKXt2YXIgYj0odGhpcy53aWR0aCgpL3RoaXMuc2V0dGluZ3MuaXRlbXMpLnRvRml4ZWQoMyktdGhpcy5zZXR0aW5ncy5tYXJnaW4sYz1udWxsLGQ9dGhpcy5faXRlbXMubGVuZ3RoLGU9IXRoaXMuc2V0dGluZ3MuYXV0b1dpZHRoLGY9W107Zm9yKGEuaXRlbXM9e21lcmdlOiExLHdpZHRoOmJ9O2QtLTspYz10aGlzLl9tZXJnZXJzW2RdLGM9dGhpcy5zZXR0aW5ncy5tZXJnZUZpdCYmTWF0aC5taW4oYyx0aGlzLnNldHRpbmdzLml0ZW1zKXx8YyxhLml0ZW1zLm1lcmdlPWM+MXx8YS5pdGVtcy5tZXJnZSxmW2RdPWU/YipjOnRoaXMuX2l0ZW1zW2RdLndpZHRoKCk7dGhpcy5fd2lkdGhzPWZ9fSx7ZmlsdGVyOltcIml0ZW1zXCIsXCJzZXR0aW5nc1wiXSxydW46ZnVuY3Rpb24oKXt2YXIgYj1bXSxjPXRoaXMuX2l0ZW1zLGQ9dGhpcy5zZXR0aW5ncyxlPU1hdGgubWF4KDIqZC5pdGVtcyw0KSxmPTIqTWF0aC5jZWlsKGMubGVuZ3RoLzIpLGc9ZC5sb29wJiZjLmxlbmd0aD9kLnJld2luZD9lOk1hdGgubWF4KGUsZik6MCxoPVwiXCIsaT1cIlwiO2ZvcihnLz0yO2c+MDspYi5wdXNoKHRoaXMubm9ybWFsaXplKGIubGVuZ3RoLzIsITApKSxoKz1jW2JbYi5sZW5ndGgtMV1dWzBdLm91dGVySFRNTCxiLnB1c2godGhpcy5ub3JtYWxpemUoYy5sZW5ndGgtMS0oYi5sZW5ndGgtMSkvMiwhMCkpLGk9Y1tiW2IubGVuZ3RoLTFdXVswXS5vdXRlckhUTUwraSxnLT0xO3RoaXMuX2Nsb25lcz1iLGEoaCkuYWRkQ2xhc3MoXCJjbG9uZWRcIikuYXBwZW5kVG8odGhpcy4kc3RhZ2UpLGEoaSkuYWRkQ2xhc3MoXCJjbG9uZWRcIikucHJlcGVuZFRvKHRoaXMuJHN0YWdlKX19LHtmaWx0ZXI6W1wid2lkdGhcIixcIml0ZW1zXCIsXCJzZXR0aW5nc1wiXSxydW46ZnVuY3Rpb24oKXtmb3IodmFyIGE9dGhpcy5zZXR0aW5ncy5ydGw/MTotMSxiPXRoaXMuX2Nsb25lcy5sZW5ndGgrdGhpcy5faXRlbXMubGVuZ3RoLGM9LTEsZD0wLGU9MCxmPVtdOysrYzxiOylkPWZbYy0xXXx8MCxlPXRoaXMuX3dpZHRoc1t0aGlzLnJlbGF0aXZlKGMpXSt0aGlzLnNldHRpbmdzLm1hcmdpbixmLnB1c2goZCtlKmEpO3RoaXMuX2Nvb3JkaW5hdGVzPWZ9fSx7ZmlsdGVyOltcIndpZHRoXCIsXCJpdGVtc1wiLFwic2V0dGluZ3NcIl0scnVuOmZ1bmN0aW9uKCl7dmFyIGE9dGhpcy5zZXR0aW5ncy5zdGFnZVBhZGRpbmcsYj10aGlzLl9jb29yZGluYXRlcyxjPXt3aWR0aDpNYXRoLmNlaWwoTWF0aC5hYnMoYltiLmxlbmd0aC0xXSkpKzIqYSxcInBhZGRpbmctbGVmdFwiOmF8fFwiXCIsXCJwYWRkaW5nLXJpZ2h0XCI6YXx8XCJcIn07dGhpcy4kc3RhZ2UuY3NzKGMpfX0se2ZpbHRlcjpbXCJ3aWR0aFwiLFwiaXRlbXNcIixcInNldHRpbmdzXCJdLHJ1bjpmdW5jdGlvbihhKXt2YXIgYj10aGlzLl9jb29yZGluYXRlcy5sZW5ndGgsYz0hdGhpcy5zZXR0aW5ncy5hdXRvV2lkdGgsZD10aGlzLiRzdGFnZS5jaGlsZHJlbigpO2lmKGMmJmEuaXRlbXMubWVyZ2UpZm9yKDtiLS07KWEuY3NzLndpZHRoPXRoaXMuX3dpZHRoc1t0aGlzLnJlbGF0aXZlKGIpXSxkLmVxKGIpLmNzcyhhLmNzcyk7ZWxzZSBjJiYoYS5jc3Mud2lkdGg9YS5pdGVtcy53aWR0aCxkLmNzcyhhLmNzcykpfX0se2ZpbHRlcjpbXCJpdGVtc1wiXSxydW46ZnVuY3Rpb24oKXt0aGlzLl9jb29yZGluYXRlcy5sZW5ndGg8MSYmdGhpcy4kc3RhZ2UucmVtb3ZlQXR0cihcInN0eWxlXCIpfX0se2ZpbHRlcjpbXCJ3aWR0aFwiLFwiaXRlbXNcIixcInNldHRpbmdzXCJdLHJ1bjpmdW5jdGlvbihhKXthLmN1cnJlbnQ9YS5jdXJyZW50P3RoaXMuJHN0YWdlLmNoaWxkcmVuKCkuaW5kZXgoYS5jdXJyZW50KTowLGEuY3VycmVudD1NYXRoLm1heCh0aGlzLm1pbmltdW0oKSxNYXRoLm1pbih0aGlzLm1heGltdW0oKSxhLmN1cnJlbnQpKSx0aGlzLnJlc2V0KGEuY3VycmVudCl9fSx7ZmlsdGVyOltcInBvc2l0aW9uXCJdLHJ1bjpmdW5jdGlvbigpe3RoaXMuYW5pbWF0ZSh0aGlzLmNvb3JkaW5hdGVzKHRoaXMuX2N1cnJlbnQpKX19LHtmaWx0ZXI6W1wid2lkdGhcIixcInBvc2l0aW9uXCIsXCJpdGVtc1wiLFwic2V0dGluZ3NcIl0scnVuOmZ1bmN0aW9uKCl7dmFyIGEsYixjLGQsZT10aGlzLnNldHRpbmdzLnJ0bD8xOi0xLGY9Mip0aGlzLnNldHRpbmdzLnN0YWdlUGFkZGluZyxnPXRoaXMuY29vcmRpbmF0ZXModGhpcy5jdXJyZW50KCkpK2YsaD1nK3RoaXMud2lkdGgoKSplLGk9W107Zm9yKGM9MCxkPXRoaXMuX2Nvb3JkaW5hdGVzLmxlbmd0aDtjPGQ7YysrKWE9dGhpcy5fY29vcmRpbmF0ZXNbYy0xXXx8MCxiPU1hdGguYWJzKHRoaXMuX2Nvb3JkaW5hdGVzW2NdKStmKmUsKHRoaXMub3AoYSxcIjw9XCIsZykmJnRoaXMub3AoYSxcIj5cIixoKXx8dGhpcy5vcChiLFwiPFwiLGcpJiZ0aGlzLm9wKGIsXCI+XCIsaCkpJiZpLnB1c2goYyk7dGhpcy4kc3RhZ2UuY2hpbGRyZW4oXCIuYWN0aXZlXCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpLHRoaXMuJHN0YWdlLmNoaWxkcmVuKFwiOmVxKFwiK2kuam9pbihcIiksIDplcShcIikrXCIpXCIpLmFkZENsYXNzKFwiYWN0aXZlXCIpLHRoaXMuJHN0YWdlLmNoaWxkcmVuKFwiLmNlbnRlclwiKS5yZW1vdmVDbGFzcyhcImNlbnRlclwiKSx0aGlzLnNldHRpbmdzLmNlbnRlciYmdGhpcy4kc3RhZ2UuY2hpbGRyZW4oKS5lcSh0aGlzLmN1cnJlbnQoKSkuYWRkQ2xhc3MoXCJjZW50ZXJcIil9fV0sZS5wcm90b3R5cGUuaW5pdGlhbGl6ZVN0YWdlPWZ1bmN0aW9uKCl7dGhpcy4kc3RhZ2U9dGhpcy4kZWxlbWVudC5maW5kKFwiLlwiK3RoaXMuc2V0dGluZ3Muc3RhZ2VDbGFzcyksdGhpcy4kc3RhZ2UubGVuZ3RofHwodGhpcy4kZWxlbWVudC5hZGRDbGFzcyh0aGlzLm9wdGlvbnMubG9hZGluZ0NsYXNzKSx0aGlzLiRzdGFnZT1hKFwiPFwiK3RoaXMuc2V0dGluZ3Muc3RhZ2VFbGVtZW50K1wiPlwiLHtjbGFzczp0aGlzLnNldHRpbmdzLnN0YWdlQ2xhc3N9KS53cmFwKGEoXCI8ZGl2Lz5cIix7Y2xhc3M6dGhpcy5zZXR0aW5ncy5zdGFnZU91dGVyQ2xhc3N9KSksdGhpcy4kZWxlbWVudC5hcHBlbmQodGhpcy4kc3RhZ2UucGFyZW50KCkpKX0sZS5wcm90b3R5cGUuaW5pdGlhbGl6ZUl0ZW1zPWZ1bmN0aW9uKCl7dmFyIGI9dGhpcy4kZWxlbWVudC5maW5kKFwiLm93bC1pdGVtXCIpO2lmKGIubGVuZ3RoKXJldHVybiB0aGlzLl9pdGVtcz1iLmdldCgpLm1hcChmdW5jdGlvbihiKXtyZXR1cm4gYShiKX0pLHRoaXMuX21lcmdlcnM9dGhpcy5faXRlbXMubWFwKGZ1bmN0aW9uKCl7cmV0dXJuIDF9KSx2b2lkIHRoaXMucmVmcmVzaCgpO3RoaXMucmVwbGFjZSh0aGlzLiRlbGVtZW50LmNoaWxkcmVuKCkubm90KHRoaXMuJHN0YWdlLnBhcmVudCgpKSksdGhpcy5pc1Zpc2libGUoKT90aGlzLnJlZnJlc2goKTp0aGlzLmludmFsaWRhdGUoXCJ3aWR0aFwiKSx0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5sb2FkaW5nQ2xhc3MpLmFkZENsYXNzKHRoaXMub3B0aW9ucy5sb2FkZWRDbGFzcyl9LGUucHJvdG90eXBlLmluaXRpYWxpemU9ZnVuY3Rpb24oKXtpZih0aGlzLmVudGVyKFwiaW5pdGlhbGl6aW5nXCIpLHRoaXMudHJpZ2dlcihcImluaXRpYWxpemVcIiksdGhpcy4kZWxlbWVudC50b2dnbGVDbGFzcyh0aGlzLnNldHRpbmdzLnJ0bENsYXNzLHRoaXMuc2V0dGluZ3MucnRsKSx0aGlzLnNldHRpbmdzLmF1dG9XaWR0aCYmIXRoaXMuaXMoXCJwcmUtbG9hZGluZ1wiKSl7dmFyIGEsYixjO2E9dGhpcy4kZWxlbWVudC5maW5kKFwiaW1nXCIpLGI9dGhpcy5zZXR0aW5ncy5uZXN0ZWRJdGVtU2VsZWN0b3I/XCIuXCIrdGhpcy5zZXR0aW5ncy5uZXN0ZWRJdGVtU2VsZWN0b3I6ZCxjPXRoaXMuJGVsZW1lbnQuY2hpbGRyZW4oYikud2lkdGgoKSxhLmxlbmd0aCYmYzw9MCYmdGhpcy5wcmVsb2FkQXV0b1dpZHRoSW1hZ2VzKGEpfXRoaXMuaW5pdGlhbGl6ZVN0YWdlKCksdGhpcy5pbml0aWFsaXplSXRlbXMoKSx0aGlzLnJlZ2lzdGVyRXZlbnRIYW5kbGVycygpLHRoaXMubGVhdmUoXCJpbml0aWFsaXppbmdcIiksdGhpcy50cmlnZ2VyKFwiaW5pdGlhbGl6ZWRcIil9LGUucHJvdG90eXBlLmlzVmlzaWJsZT1mdW5jdGlvbigpe3JldHVybiF0aGlzLnNldHRpbmdzLmNoZWNrVmlzaWJpbGl0eXx8dGhpcy4kZWxlbWVudC5pcyhcIjp2aXNpYmxlXCIpfSxlLnByb3RvdHlwZS5zZXR1cD1mdW5jdGlvbigpe3ZhciBiPXRoaXMudmlld3BvcnQoKSxjPXRoaXMub3B0aW9ucy5yZXNwb25zaXZlLGQ9LTEsZT1udWxsO2M/KGEuZWFjaChjLGZ1bmN0aW9uKGEpe2E8PWImJmE+ZCYmKGQ9TnVtYmVyKGEpKX0pLGU9YS5leHRlbmQoe30sdGhpcy5vcHRpb25zLGNbZF0pLFwiZnVuY3Rpb25cIj09dHlwZW9mIGUuc3RhZ2VQYWRkaW5nJiYoZS5zdGFnZVBhZGRpbmc9ZS5zdGFnZVBhZGRpbmcoKSksZGVsZXRlIGUucmVzcG9uc2l2ZSxlLnJlc3BvbnNpdmVDbGFzcyYmdGhpcy4kZWxlbWVudC5hdHRyKFwiY2xhc3NcIix0aGlzLiRlbGVtZW50LmF0dHIoXCJjbGFzc1wiKS5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoXCIrdGhpcy5vcHRpb25zLnJlc3BvbnNpdmVDbGFzcytcIi0pXFxcXFMrXFxcXHNcIixcImdcIiksXCIkMVwiK2QpKSk6ZT1hLmV4dGVuZCh7fSx0aGlzLm9wdGlvbnMpLHRoaXMudHJpZ2dlcihcImNoYW5nZVwiLHtwcm9wZXJ0eTp7bmFtZTpcInNldHRpbmdzXCIsdmFsdWU6ZX19KSx0aGlzLl9icmVha3BvaW50PWQsdGhpcy5zZXR0aW5ncz1lLHRoaXMuaW52YWxpZGF0ZShcInNldHRpbmdzXCIpLHRoaXMudHJpZ2dlcihcImNoYW5nZWRcIix7cHJvcGVydHk6e25hbWU6XCJzZXR0aW5nc1wiLHZhbHVlOnRoaXMuc2V0dGluZ3N9fSl9LGUucHJvdG90eXBlLm9wdGlvbnNMb2dpYz1mdW5jdGlvbigpe3RoaXMuc2V0dGluZ3MuYXV0b1dpZHRoJiYodGhpcy5zZXR0aW5ncy5zdGFnZVBhZGRpbmc9ITEsdGhpcy5zZXR0aW5ncy5tZXJnZT0hMSl9LGUucHJvdG90eXBlLnByZXBhcmU9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcy50cmlnZ2VyKFwicHJlcGFyZVwiLHtjb250ZW50OmJ9KTtyZXR1cm4gYy5kYXRhfHwoYy5kYXRhPWEoXCI8XCIrdGhpcy5zZXR0aW5ncy5pdGVtRWxlbWVudCtcIi8+XCIpLmFkZENsYXNzKHRoaXMub3B0aW9ucy5pdGVtQ2xhc3MpLmFwcGVuZChiKSksdGhpcy50cmlnZ2VyKFwicHJlcGFyZWRcIix7Y29udGVudDpjLmRhdGF9KSxjLmRhdGF9LGUucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbigpe2Zvcih2YXIgYj0wLGM9dGhpcy5fcGlwZS5sZW5ndGgsZD1hLnByb3h5KGZ1bmN0aW9uKGEpe3JldHVybiB0aGlzW2FdfSx0aGlzLl9pbnZhbGlkYXRlZCksZT17fTtiPGM7KSh0aGlzLl9pbnZhbGlkYXRlZC5hbGx8fGEuZ3JlcCh0aGlzLl9waXBlW2JdLmZpbHRlcixkKS5sZW5ndGg+MCkmJnRoaXMuX3BpcGVbYl0ucnVuKGUpLGIrKzt0aGlzLl9pbnZhbGlkYXRlZD17fSwhdGhpcy5pcyhcInZhbGlkXCIpJiZ0aGlzLmVudGVyKFwidmFsaWRcIil9LGUucHJvdG90eXBlLndpZHRoPWZ1bmN0aW9uKGEpe3N3aXRjaChhPWF8fGUuV2lkdGguRGVmYXVsdCl7Y2FzZSBlLldpZHRoLklubmVyOmNhc2UgZS5XaWR0aC5PdXRlcjpyZXR1cm4gdGhpcy5fd2lkdGg7ZGVmYXVsdDpyZXR1cm4gdGhpcy5fd2lkdGgtMip0aGlzLnNldHRpbmdzLnN0YWdlUGFkZGluZyt0aGlzLnNldHRpbmdzLm1hcmdpbn19LGUucHJvdG90eXBlLnJlZnJlc2g9ZnVuY3Rpb24oKXt0aGlzLmVudGVyKFwicmVmcmVzaGluZ1wiKSx0aGlzLnRyaWdnZXIoXCJyZWZyZXNoXCIpLHRoaXMuc2V0dXAoKSx0aGlzLm9wdGlvbnNMb2dpYygpLHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLnJlZnJlc2hDbGFzcyksdGhpcy51cGRhdGUoKSx0aGlzLiRlbGVtZW50LnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5yZWZyZXNoQ2xhc3MpLHRoaXMubGVhdmUoXCJyZWZyZXNoaW5nXCIpLHRoaXMudHJpZ2dlcihcInJlZnJlc2hlZFwiKX0sZS5wcm90b3R5cGUub25UaHJvdHRsZWRSZXNpemU9ZnVuY3Rpb24oKXtiLmNsZWFyVGltZW91dCh0aGlzLnJlc2l6ZVRpbWVyKSx0aGlzLnJlc2l6ZVRpbWVyPWIuc2V0VGltZW91dCh0aGlzLl9oYW5kbGVycy5vblJlc2l6ZSx0aGlzLnNldHRpbmdzLnJlc3BvbnNpdmVSZWZyZXNoUmF0ZSl9LGUucHJvdG90eXBlLm9uUmVzaXplPWZ1bmN0aW9uKCl7cmV0dXJuISF0aGlzLl9pdGVtcy5sZW5ndGgmJih0aGlzLl93aWR0aCE9PXRoaXMuJGVsZW1lbnQud2lkdGgoKSYmKCEhdGhpcy5pc1Zpc2libGUoKSYmKHRoaXMuZW50ZXIoXCJyZXNpemluZ1wiKSx0aGlzLnRyaWdnZXIoXCJyZXNpemVcIikuaXNEZWZhdWx0UHJldmVudGVkKCk/KHRoaXMubGVhdmUoXCJyZXNpemluZ1wiKSwhMSk6KHRoaXMuaW52YWxpZGF0ZShcIndpZHRoXCIpLHRoaXMucmVmcmVzaCgpLHRoaXMubGVhdmUoXCJyZXNpemluZ1wiKSx2b2lkIHRoaXMudHJpZ2dlcihcInJlc2l6ZWRcIikpKSkpfSxlLnByb3RvdHlwZS5yZWdpc3RlckV2ZW50SGFuZGxlcnM9ZnVuY3Rpb24oKXthLnN1cHBvcnQudHJhbnNpdGlvbiYmdGhpcy4kc3RhZ2Uub24oYS5zdXBwb3J0LnRyYW5zaXRpb24uZW5kK1wiLm93bC5jb3JlXCIsYS5wcm94eSh0aGlzLm9uVHJhbnNpdGlvbkVuZCx0aGlzKSksITEhPT10aGlzLnNldHRpbmdzLnJlc3BvbnNpdmUmJnRoaXMub24oYixcInJlc2l6ZVwiLHRoaXMuX2hhbmRsZXJzLm9uVGhyb3R0bGVkUmVzaXplKSx0aGlzLnNldHRpbmdzLm1vdXNlRHJhZyYmKHRoaXMuJGVsZW1lbnQuYWRkQ2xhc3ModGhpcy5vcHRpb25zLmRyYWdDbGFzcyksdGhpcy4kc3RhZ2Uub24oXCJtb3VzZWRvd24ub3dsLmNvcmVcIixhLnByb3h5KHRoaXMub25EcmFnU3RhcnQsdGhpcykpLHRoaXMuJHN0YWdlLm9uKFwiZHJhZ3N0YXJ0Lm93bC5jb3JlIHNlbGVjdHN0YXJ0Lm93bC5jb3JlXCIsZnVuY3Rpb24oKXtyZXR1cm4hMX0pKSx0aGlzLnNldHRpbmdzLnRvdWNoRHJhZyYmKHRoaXMuJHN0YWdlLm9uKFwidG91Y2hzdGFydC5vd2wuY29yZVwiLGEucHJveHkodGhpcy5vbkRyYWdTdGFydCx0aGlzKSksdGhpcy4kc3RhZ2Uub24oXCJ0b3VjaGNhbmNlbC5vd2wuY29yZVwiLGEucHJveHkodGhpcy5vbkRyYWdFbmQsdGhpcykpKX0sZS5wcm90b3R5cGUub25EcmFnU3RhcnQ9ZnVuY3Rpb24oYil7dmFyIGQ9bnVsbDszIT09Yi53aGljaCYmKGEuc3VwcG9ydC50cmFuc2Zvcm0/KGQ9dGhpcy4kc3RhZ2UuY3NzKFwidHJhbnNmb3JtXCIpLnJlcGxhY2UoLy4qXFwofFxcKXwgL2csXCJcIikuc3BsaXQoXCIsXCIpLGQ9e3g6ZFsxNj09PWQubGVuZ3RoPzEyOjRdLHk6ZFsxNj09PWQubGVuZ3RoPzEzOjVdfSk6KGQ9dGhpcy4kc3RhZ2UucG9zaXRpb24oKSxkPXt4OnRoaXMuc2V0dGluZ3MucnRsP2QubGVmdCt0aGlzLiRzdGFnZS53aWR0aCgpLXRoaXMud2lkdGgoKSt0aGlzLnNldHRpbmdzLm1hcmdpbjpkLmxlZnQseTpkLnRvcH0pLHRoaXMuaXMoXCJhbmltYXRpbmdcIikmJihhLnN1cHBvcnQudHJhbnNmb3JtP3RoaXMuYW5pbWF0ZShkLngpOnRoaXMuJHN0YWdlLnN0b3AoKSx0aGlzLmludmFsaWRhdGUoXCJwb3NpdGlvblwiKSksdGhpcy4kZWxlbWVudC50b2dnbGVDbGFzcyh0aGlzLm9wdGlvbnMuZ3JhYkNsYXNzLFwibW91c2Vkb3duXCI9PT1iLnR5cGUpLHRoaXMuc3BlZWQoMCksdGhpcy5fZHJhZy50aW1lPShuZXcgRGF0ZSkuZ2V0VGltZSgpLHRoaXMuX2RyYWcudGFyZ2V0PWEoYi50YXJnZXQpLHRoaXMuX2RyYWcuc3RhZ2Uuc3RhcnQ9ZCx0aGlzLl9kcmFnLnN0YWdlLmN1cnJlbnQ9ZCx0aGlzLl9kcmFnLnBvaW50ZXI9dGhpcy5wb2ludGVyKGIpLGEoYykub24oXCJtb3VzZXVwLm93bC5jb3JlIHRvdWNoZW5kLm93bC5jb3JlXCIsYS5wcm94eSh0aGlzLm9uRHJhZ0VuZCx0aGlzKSksYShjKS5vbmUoXCJtb3VzZW1vdmUub3dsLmNvcmUgdG91Y2htb3ZlLm93bC5jb3JlXCIsYS5wcm94eShmdW5jdGlvbihiKXt2YXIgZD10aGlzLmRpZmZlcmVuY2UodGhpcy5fZHJhZy5wb2ludGVyLHRoaXMucG9pbnRlcihiKSk7YShjKS5vbihcIm1vdXNlbW92ZS5vd2wuY29yZSB0b3VjaG1vdmUub3dsLmNvcmVcIixhLnByb3h5KHRoaXMub25EcmFnTW92ZSx0aGlzKSksTWF0aC5hYnMoZC54KTxNYXRoLmFicyhkLnkpJiZ0aGlzLmlzKFwidmFsaWRcIil8fChiLnByZXZlbnREZWZhdWx0KCksdGhpcy5lbnRlcihcImRyYWdnaW5nXCIpLHRoaXMudHJpZ2dlcihcImRyYWdcIikpfSx0aGlzKSkpfSxlLnByb3RvdHlwZS5vbkRyYWdNb3ZlPWZ1bmN0aW9uKGEpe3ZhciBiPW51bGwsYz1udWxsLGQ9bnVsbCxlPXRoaXMuZGlmZmVyZW5jZSh0aGlzLl9kcmFnLnBvaW50ZXIsdGhpcy5wb2ludGVyKGEpKSxmPXRoaXMuZGlmZmVyZW5jZSh0aGlzLl9kcmFnLnN0YWdlLnN0YXJ0LGUpO3RoaXMuaXMoXCJkcmFnZ2luZ1wiKSYmKGEucHJldmVudERlZmF1bHQoKSx0aGlzLnNldHRpbmdzLmxvb3A/KGI9dGhpcy5jb29yZGluYXRlcyh0aGlzLm1pbmltdW0oKSksYz10aGlzLmNvb3JkaW5hdGVzKHRoaXMubWF4aW11bSgpKzEpLWIsZi54PSgoZi54LWIpJWMrYyklYytiKTooYj10aGlzLnNldHRpbmdzLnJ0bD90aGlzLmNvb3JkaW5hdGVzKHRoaXMubWF4aW11bSgpKTp0aGlzLmNvb3JkaW5hdGVzKHRoaXMubWluaW11bSgpKSxjPXRoaXMuc2V0dGluZ3MucnRsP3RoaXMuY29vcmRpbmF0ZXModGhpcy5taW5pbXVtKCkpOnRoaXMuY29vcmRpbmF0ZXModGhpcy5tYXhpbXVtKCkpLGQ9dGhpcy5zZXR0aW5ncy5wdWxsRHJhZz8tMSplLngvNTowLGYueD1NYXRoLm1heChNYXRoLm1pbihmLngsYitkKSxjK2QpKSx0aGlzLl9kcmFnLnN0YWdlLmN1cnJlbnQ9Zix0aGlzLmFuaW1hdGUoZi54KSl9LGUucHJvdG90eXBlLm9uRHJhZ0VuZD1mdW5jdGlvbihiKXt2YXIgZD10aGlzLmRpZmZlcmVuY2UodGhpcy5fZHJhZy5wb2ludGVyLHRoaXMucG9pbnRlcihiKSksZT10aGlzLl9kcmFnLnN0YWdlLmN1cnJlbnQsZj1kLng+MF50aGlzLnNldHRpbmdzLnJ0bD9cImxlZnRcIjpcInJpZ2h0XCI7YShjKS5vZmYoXCIub3dsLmNvcmVcIiksdGhpcy4kZWxlbWVudC5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMuZ3JhYkNsYXNzKSwoMCE9PWQueCYmdGhpcy5pcyhcImRyYWdnaW5nXCIpfHwhdGhpcy5pcyhcInZhbGlkXCIpKSYmKHRoaXMuc3BlZWQodGhpcy5zZXR0aW5ncy5kcmFnRW5kU3BlZWR8fHRoaXMuc2V0dGluZ3Muc21hcnRTcGVlZCksdGhpcy5jdXJyZW50KHRoaXMuY2xvc2VzdChlLngsMCE9PWQueD9mOnRoaXMuX2RyYWcuZGlyZWN0aW9uKSksdGhpcy5pbnZhbGlkYXRlKFwicG9zaXRpb25cIiksdGhpcy51cGRhdGUoKSx0aGlzLl9kcmFnLmRpcmVjdGlvbj1mLChNYXRoLmFicyhkLngpPjN8fChuZXcgRGF0ZSkuZ2V0VGltZSgpLXRoaXMuX2RyYWcudGltZT4zMDApJiZ0aGlzLl9kcmFnLnRhcmdldC5vbmUoXCJjbGljay5vd2wuY29yZVwiLGZ1bmN0aW9uKCl7cmV0dXJuITF9KSksdGhpcy5pcyhcImRyYWdnaW5nXCIpJiYodGhpcy5sZWF2ZShcImRyYWdnaW5nXCIpLHRoaXMudHJpZ2dlcihcImRyYWdnZWRcIikpfSxlLnByb3RvdHlwZS5jbG9zZXN0PWZ1bmN0aW9uKGIsYyl7dmFyIGU9LTEsZj0zMCxnPXRoaXMud2lkdGgoKSxoPXRoaXMuY29vcmRpbmF0ZXMoKTtyZXR1cm4gdGhpcy5zZXR0aW5ncy5mcmVlRHJhZ3x8YS5lYWNoKGgsYS5wcm94eShmdW5jdGlvbihhLGkpe3JldHVyblwibGVmdFwiPT09YyYmYj5pLWYmJmI8aStmP2U9YTpcInJpZ2h0XCI9PT1jJiZiPmktZy1mJiZiPGktZytmP2U9YSsxOnRoaXMub3AoYixcIjxcIixpKSYmdGhpcy5vcChiLFwiPlwiLGhbYSsxXSE9PWQ/aFthKzFdOmktZykmJihlPVwibGVmdFwiPT09Yz9hKzE6YSksLTE9PT1lfSx0aGlzKSksdGhpcy5zZXR0aW5ncy5sb29wfHwodGhpcy5vcChiLFwiPlwiLGhbdGhpcy5taW5pbXVtKCldKT9lPWI9dGhpcy5taW5pbXVtKCk6dGhpcy5vcChiLFwiPFwiLGhbdGhpcy5tYXhpbXVtKCldKSYmKGU9Yj10aGlzLm1heGltdW0oKSkpLGV9LGUucHJvdG90eXBlLmFuaW1hdGU9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcy5zcGVlZCgpPjA7dGhpcy5pcyhcImFuaW1hdGluZ1wiKSYmdGhpcy5vblRyYW5zaXRpb25FbmQoKSxjJiYodGhpcy5lbnRlcihcImFuaW1hdGluZ1wiKSx0aGlzLnRyaWdnZXIoXCJ0cmFuc2xhdGVcIikpLGEuc3VwcG9ydC50cmFuc2Zvcm0zZCYmYS5zdXBwb3J0LnRyYW5zaXRpb24/dGhpcy4kc3RhZ2UuY3NzKHt0cmFuc2Zvcm06XCJ0cmFuc2xhdGUzZChcIitiK1wicHgsMHB4LDBweClcIix0cmFuc2l0aW9uOnRoaXMuc3BlZWQoKS8xZTMrXCJzXCIrKHRoaXMuc2V0dGluZ3Muc2xpZGVUcmFuc2l0aW9uP1wiIFwiK3RoaXMuc2V0dGluZ3Muc2xpZGVUcmFuc2l0aW9uOlwiXCIpfSk6Yz90aGlzLiRzdGFnZS5hbmltYXRlKHtsZWZ0OmIrXCJweFwifSx0aGlzLnNwZWVkKCksdGhpcy5zZXR0aW5ncy5mYWxsYmFja0Vhc2luZyxhLnByb3h5KHRoaXMub25UcmFuc2l0aW9uRW5kLHRoaXMpKTp0aGlzLiRzdGFnZS5jc3Moe2xlZnQ6YitcInB4XCJ9KX0sZS5wcm90b3R5cGUuaXM9ZnVuY3Rpb24oYSl7cmV0dXJuIHRoaXMuX3N0YXRlcy5jdXJyZW50W2FdJiZ0aGlzLl9zdGF0ZXMuY3VycmVudFthXT4wfSxlLnByb3RvdHlwZS5jdXJyZW50PWZ1bmN0aW9uKGEpe2lmKGE9PT1kKXJldHVybiB0aGlzLl9jdXJyZW50O2lmKDA9PT10aGlzLl9pdGVtcy5sZW5ndGgpcmV0dXJuIGQ7aWYoYT10aGlzLm5vcm1hbGl6ZShhKSx0aGlzLl9jdXJyZW50IT09YSl7dmFyIGI9dGhpcy50cmlnZ2VyKFwiY2hhbmdlXCIse3Byb3BlcnR5OntuYW1lOlwicG9zaXRpb25cIix2YWx1ZTphfX0pO2IuZGF0YSE9PWQmJihhPXRoaXMubm9ybWFsaXplKGIuZGF0YSkpLHRoaXMuX2N1cnJlbnQ9YSx0aGlzLmludmFsaWRhdGUoXCJwb3NpdGlvblwiKSx0aGlzLnRyaWdnZXIoXCJjaGFuZ2VkXCIse3Byb3BlcnR5OntuYW1lOlwicG9zaXRpb25cIix2YWx1ZTp0aGlzLl9jdXJyZW50fX0pfXJldHVybiB0aGlzLl9jdXJyZW50fSxlLnByb3RvdHlwZS5pbnZhbGlkYXRlPWZ1bmN0aW9uKGIpe3JldHVyblwic3RyaW5nXCI9PT1hLnR5cGUoYikmJih0aGlzLl9pbnZhbGlkYXRlZFtiXT0hMCx0aGlzLmlzKFwidmFsaWRcIikmJnRoaXMubGVhdmUoXCJ2YWxpZFwiKSksYS5tYXAodGhpcy5faW52YWxpZGF0ZWQsZnVuY3Rpb24oYSxiKXtyZXR1cm4gYn0pfSxlLnByb3RvdHlwZS5yZXNldD1mdW5jdGlvbihhKXsoYT10aGlzLm5vcm1hbGl6ZShhKSkhPT1kJiYodGhpcy5fc3BlZWQ9MCx0aGlzLl9jdXJyZW50PWEsdGhpcy5zdXBwcmVzcyhbXCJ0cmFuc2xhdGVcIixcInRyYW5zbGF0ZWRcIl0pLHRoaXMuYW5pbWF0ZSh0aGlzLmNvb3JkaW5hdGVzKGEpKSx0aGlzLnJlbGVhc2UoW1widHJhbnNsYXRlXCIsXCJ0cmFuc2xhdGVkXCJdKSl9LGUucHJvdG90eXBlLm5vcm1hbGl6ZT1mdW5jdGlvbihhLGIpe3ZhciBjPXRoaXMuX2l0ZW1zLmxlbmd0aCxlPWI/MDp0aGlzLl9jbG9uZXMubGVuZ3RoO3JldHVybiF0aGlzLmlzTnVtZXJpYyhhKXx8YzwxP2E9ZDooYTwwfHxhPj1jK2UpJiYoYT0oKGEtZS8yKSVjK2MpJWMrZS8yKSxhfSxlLnByb3RvdHlwZS5yZWxhdGl2ZT1mdW5jdGlvbihhKXtyZXR1cm4gYS09dGhpcy5fY2xvbmVzLmxlbmd0aC8yLHRoaXMubm9ybWFsaXplKGEsITApfSxlLnByb3RvdHlwZS5tYXhpbXVtPWZ1bmN0aW9uKGEpe3ZhciBiLGMsZCxlPXRoaXMuc2V0dGluZ3MsZj10aGlzLl9jb29yZGluYXRlcy5sZW5ndGg7aWYoZS5sb29wKWY9dGhpcy5fY2xvbmVzLmxlbmd0aC8yK3RoaXMuX2l0ZW1zLmxlbmd0aC0xO2Vsc2UgaWYoZS5hdXRvV2lkdGh8fGUubWVyZ2Upe2lmKGI9dGhpcy5faXRlbXMubGVuZ3RoKWZvcihjPXRoaXMuX2l0ZW1zWy0tYl0ud2lkdGgoKSxkPXRoaXMuJGVsZW1lbnQud2lkdGgoKTtiLS0mJiEoKGMrPXRoaXMuX2l0ZW1zW2JdLndpZHRoKCkrdGhpcy5zZXR0aW5ncy5tYXJnaW4pPmQpOyk7Zj1iKzF9ZWxzZSBmPWUuY2VudGVyP3RoaXMuX2l0ZW1zLmxlbmd0aC0xOnRoaXMuX2l0ZW1zLmxlbmd0aC1lLml0ZW1zO3JldHVybiBhJiYoZi09dGhpcy5fY2xvbmVzLmxlbmd0aC8yKSxNYXRoLm1heChmLDApfSxlLnByb3RvdHlwZS5taW5pbXVtPWZ1bmN0aW9uKGEpe3JldHVybiBhPzA6dGhpcy5fY2xvbmVzLmxlbmd0aC8yfSxlLnByb3RvdHlwZS5pdGVtcz1mdW5jdGlvbihhKXtyZXR1cm4gYT09PWQ/dGhpcy5faXRlbXMuc2xpY2UoKTooYT10aGlzLm5vcm1hbGl6ZShhLCEwKSx0aGlzLl9pdGVtc1thXSl9LGUucHJvdG90eXBlLm1lcmdlcnM9ZnVuY3Rpb24oYSl7cmV0dXJuIGE9PT1kP3RoaXMuX21lcmdlcnMuc2xpY2UoKTooYT10aGlzLm5vcm1hbGl6ZShhLCEwKSx0aGlzLl9tZXJnZXJzW2FdKX0sZS5wcm90b3R5cGUuY2xvbmVzPWZ1bmN0aW9uKGIpe3ZhciBjPXRoaXMuX2Nsb25lcy5sZW5ndGgvMixlPWMrdGhpcy5faXRlbXMubGVuZ3RoLGY9ZnVuY3Rpb24oYSl7cmV0dXJuIGElMj09MD9lK2EvMjpjLShhKzEpLzJ9O3JldHVybiBiPT09ZD9hLm1hcCh0aGlzLl9jbG9uZXMsZnVuY3Rpb24oYSxiKXtyZXR1cm4gZihiKX0pOmEubWFwKHRoaXMuX2Nsb25lcyxmdW5jdGlvbihhLGMpe3JldHVybiBhPT09Yj9mKGMpOm51bGx9KX0sZS5wcm90b3R5cGUuc3BlZWQ9ZnVuY3Rpb24oYSl7cmV0dXJuIGEhPT1kJiYodGhpcy5fc3BlZWQ9YSksdGhpcy5fc3BlZWR9LGUucHJvdG90eXBlLmNvb3JkaW5hdGVzPWZ1bmN0aW9uKGIpe3ZhciBjLGU9MSxmPWItMTtyZXR1cm4gYj09PWQ/YS5tYXAodGhpcy5fY29vcmRpbmF0ZXMsYS5wcm94eShmdW5jdGlvbihhLGIpe3JldHVybiB0aGlzLmNvb3JkaW5hdGVzKGIpfSx0aGlzKSk6KHRoaXMuc2V0dGluZ3MuY2VudGVyPyh0aGlzLnNldHRpbmdzLnJ0bCYmKGU9LTEsZj1iKzEpLGM9dGhpcy5fY29vcmRpbmF0ZXNbYl0sYys9KHRoaXMud2lkdGgoKS1jKyh0aGlzLl9jb29yZGluYXRlc1tmXXx8MCkpLzIqZSk6Yz10aGlzLl9jb29yZGluYXRlc1tmXXx8MCxjPU1hdGguY2VpbChjKSl9LGUucHJvdG90eXBlLmR1cmF0aW9uPWZ1bmN0aW9uKGEsYixjKXtyZXR1cm4gMD09PWM/MDpNYXRoLm1pbihNYXRoLm1heChNYXRoLmFicyhiLWEpLDEpLDYpKk1hdGguYWJzKGN8fHRoaXMuc2V0dGluZ3Muc21hcnRTcGVlZCl9LGUucHJvdG90eXBlLnRvPWZ1bmN0aW9uKGEsYil7dmFyIGM9dGhpcy5jdXJyZW50KCksZD1udWxsLGU9YS10aGlzLnJlbGF0aXZlKGMpLGY9KGU+MCktKGU8MCksZz10aGlzLl9pdGVtcy5sZW5ndGgsaD10aGlzLm1pbmltdW0oKSxpPXRoaXMubWF4aW11bSgpO3RoaXMuc2V0dGluZ3MubG9vcD8oIXRoaXMuc2V0dGluZ3MucmV3aW5kJiZNYXRoLmFicyhlKT5nLzImJihlKz0tMSpmKmcpLGE9YytlLChkPSgoYS1oKSVnK2cpJWcraCkhPT1hJiZkLWU8PWkmJmQtZT4wJiYoYz1kLWUsYT1kLHRoaXMucmVzZXQoYykpKTp0aGlzLnNldHRpbmdzLnJld2luZD8oaSs9MSxhPShhJWkraSklaSk6YT1NYXRoLm1heChoLE1hdGgubWluKGksYSkpLHRoaXMuc3BlZWQodGhpcy5kdXJhdGlvbihjLGEsYikpLHRoaXMuY3VycmVudChhKSx0aGlzLmlzVmlzaWJsZSgpJiZ0aGlzLnVwZGF0ZSgpfSxlLnByb3RvdHlwZS5uZXh0PWZ1bmN0aW9uKGEpe2E9YXx8ITEsdGhpcy50byh0aGlzLnJlbGF0aXZlKHRoaXMuY3VycmVudCgpKSsxLGEpfSxlLnByb3RvdHlwZS5wcmV2PWZ1bmN0aW9uKGEpe2E9YXx8ITEsdGhpcy50byh0aGlzLnJlbGF0aXZlKHRoaXMuY3VycmVudCgpKS0xLGEpfSxlLnByb3RvdHlwZS5vblRyYW5zaXRpb25FbmQ9ZnVuY3Rpb24oYSl7aWYoYSE9PWQmJihhLnN0b3BQcm9wYWdhdGlvbigpLChhLnRhcmdldHx8YS5zcmNFbGVtZW50fHxhLm9yaWdpbmFsVGFyZ2V0KSE9PXRoaXMuJHN0YWdlLmdldCgwKSkpcmV0dXJuITE7dGhpcy5sZWF2ZShcImFuaW1hdGluZ1wiKSx0aGlzLnRyaWdnZXIoXCJ0cmFuc2xhdGVkXCIpfSxlLnByb3RvdHlwZS52aWV3cG9ydD1mdW5jdGlvbigpe3ZhciBkO3JldHVybiB0aGlzLm9wdGlvbnMucmVzcG9uc2l2ZUJhc2VFbGVtZW50IT09Yj9kPWEodGhpcy5vcHRpb25zLnJlc3BvbnNpdmVCYXNlRWxlbWVudCkud2lkdGgoKTpiLmlubmVyV2lkdGg/ZD1iLmlubmVyV2lkdGg6Yy5kb2N1bWVudEVsZW1lbnQmJmMuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoP2Q9Yy5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg6Y29uc29sZS53YXJuKFwiQ2FuIG5vdCBkZXRlY3Qgdmlld3BvcnQgd2lkdGguXCIpLGR9LGUucHJvdG90eXBlLnJlcGxhY2U9ZnVuY3Rpb24oYil7dGhpcy4kc3RhZ2UuZW1wdHkoKSx0aGlzLl9pdGVtcz1bXSxiJiYoYj1iIGluc3RhbmNlb2YgalF1ZXJ5P2I6YShiKSksdGhpcy5zZXR0aW5ncy5uZXN0ZWRJdGVtU2VsZWN0b3ImJihiPWIuZmluZChcIi5cIit0aGlzLnNldHRpbmdzLm5lc3RlZEl0ZW1TZWxlY3RvcikpLGIuZmlsdGVyKGZ1bmN0aW9uKCl7cmV0dXJuIDE9PT10aGlzLm5vZGVUeXBlfSkuZWFjaChhLnByb3h5KGZ1bmN0aW9uKGEsYil7Yj10aGlzLnByZXBhcmUoYiksdGhpcy4kc3RhZ2UuYXBwZW5kKGIpLHRoaXMuX2l0ZW1zLnB1c2goYiksdGhpcy5fbWVyZ2Vycy5wdXNoKDEqYi5maW5kKFwiW2RhdGEtbWVyZ2VdXCIpLmFkZEJhY2soXCJbZGF0YS1tZXJnZV1cIikuYXR0cihcImRhdGEtbWVyZ2VcIil8fDEpfSx0aGlzKSksdGhpcy5yZXNldCh0aGlzLmlzTnVtZXJpYyh0aGlzLnNldHRpbmdzLnN0YXJ0UG9zaXRpb24pP3RoaXMuc2V0dGluZ3Muc3RhcnRQb3NpdGlvbjowKSx0aGlzLmludmFsaWRhdGUoXCJpdGVtc1wiKX0sZS5wcm90b3R5cGUuYWRkPWZ1bmN0aW9uKGIsYyl7dmFyIGU9dGhpcy5yZWxhdGl2ZSh0aGlzLl9jdXJyZW50KTtjPWM9PT1kP3RoaXMuX2l0ZW1zLmxlbmd0aDp0aGlzLm5vcm1hbGl6ZShjLCEwKSxiPWIgaW5zdGFuY2VvZiBqUXVlcnk/YjphKGIpLHRoaXMudHJpZ2dlcihcImFkZFwiLHtjb250ZW50OmIscG9zaXRpb246Y30pLGI9dGhpcy5wcmVwYXJlKGIpLDA9PT10aGlzLl9pdGVtcy5sZW5ndGh8fGM9PT10aGlzLl9pdGVtcy5sZW5ndGg/KDA9PT10aGlzLl9pdGVtcy5sZW5ndGgmJnRoaXMuJHN0YWdlLmFwcGVuZChiKSwwIT09dGhpcy5faXRlbXMubGVuZ3RoJiZ0aGlzLl9pdGVtc1tjLTFdLmFmdGVyKGIpLHRoaXMuX2l0ZW1zLnB1c2goYiksdGhpcy5fbWVyZ2Vycy5wdXNoKDEqYi5maW5kKFwiW2RhdGEtbWVyZ2VdXCIpLmFkZEJhY2soXCJbZGF0YS1tZXJnZV1cIikuYXR0cihcImRhdGEtbWVyZ2VcIil8fDEpKToodGhpcy5faXRlbXNbY10uYmVmb3JlKGIpLHRoaXMuX2l0ZW1zLnNwbGljZShjLDAsYiksdGhpcy5fbWVyZ2Vycy5zcGxpY2UoYywwLDEqYi5maW5kKFwiW2RhdGEtbWVyZ2VdXCIpLmFkZEJhY2soXCJbZGF0YS1tZXJnZV1cIikuYXR0cihcImRhdGEtbWVyZ2VcIil8fDEpKSx0aGlzLl9pdGVtc1tlXSYmdGhpcy5yZXNldCh0aGlzLl9pdGVtc1tlXS5pbmRleCgpKSx0aGlzLmludmFsaWRhdGUoXCJpdGVtc1wiKSx0aGlzLnRyaWdnZXIoXCJhZGRlZFwiLHtjb250ZW50OmIscG9zaXRpb246Y30pfSxlLnByb3RvdHlwZS5yZW1vdmU9ZnVuY3Rpb24oYSl7KGE9dGhpcy5ub3JtYWxpemUoYSwhMCkpIT09ZCYmKHRoaXMudHJpZ2dlcihcInJlbW92ZVwiLHtjb250ZW50OnRoaXMuX2l0ZW1zW2FdLHBvc2l0aW9uOmF9KSx0aGlzLl9pdGVtc1thXS5yZW1vdmUoKSx0aGlzLl9pdGVtcy5zcGxpY2UoYSwxKSx0aGlzLl9tZXJnZXJzLnNwbGljZShhLDEpLHRoaXMuaW52YWxpZGF0ZShcIml0ZW1zXCIpLHRoaXMudHJpZ2dlcihcInJlbW92ZWRcIix7Y29udGVudDpudWxsLHBvc2l0aW9uOmF9KSl9LGUucHJvdG90eXBlLnByZWxvYWRBdXRvV2lkdGhJbWFnZXM9ZnVuY3Rpb24oYil7Yi5lYWNoKGEucHJveHkoZnVuY3Rpb24oYixjKXt0aGlzLmVudGVyKFwicHJlLWxvYWRpbmdcIiksYz1hKGMpLGEobmV3IEltYWdlKS5vbmUoXCJsb2FkXCIsYS5wcm94eShmdW5jdGlvbihhKXtjLmF0dHIoXCJzcmNcIixhLnRhcmdldC5zcmMpLGMuY3NzKFwib3BhY2l0eVwiLDEpLHRoaXMubGVhdmUoXCJwcmUtbG9hZGluZ1wiKSwhdGhpcy5pcyhcInByZS1sb2FkaW5nXCIpJiYhdGhpcy5pcyhcImluaXRpYWxpemluZ1wiKSYmdGhpcy5yZWZyZXNoKCl9LHRoaXMpKS5hdHRyKFwic3JjXCIsYy5hdHRyKFwic3JjXCIpfHxjLmF0dHIoXCJkYXRhLXNyY1wiKXx8Yy5hdHRyKFwiZGF0YS1zcmMtcmV0aW5hXCIpKX0sdGhpcykpfSxlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dGhpcy4kZWxlbWVudC5vZmYoXCIub3dsLmNvcmVcIiksdGhpcy4kc3RhZ2Uub2ZmKFwiLm93bC5jb3JlXCIpLGEoYykub2ZmKFwiLm93bC5jb3JlXCIpLCExIT09dGhpcy5zZXR0aW5ncy5yZXNwb25zaXZlJiYoYi5jbGVhclRpbWVvdXQodGhpcy5yZXNpemVUaW1lciksdGhpcy5vZmYoYixcInJlc2l6ZVwiLHRoaXMuX2hhbmRsZXJzLm9uVGhyb3R0bGVkUmVzaXplKSk7Zm9yKHZhciBkIGluIHRoaXMuX3BsdWdpbnMpdGhpcy5fcGx1Z2luc1tkXS5kZXN0cm95KCk7dGhpcy4kc3RhZ2UuY2hpbGRyZW4oXCIuY2xvbmVkXCIpLnJlbW92ZSgpLHRoaXMuJHN0YWdlLnVud3JhcCgpLHRoaXMuJHN0YWdlLmNoaWxkcmVuKCkuY29udGVudHMoKS51bndyYXAoKSx0aGlzLiRzdGFnZS5jaGlsZHJlbigpLnVud3JhcCgpLHRoaXMuJHN0YWdlLnJlbW92ZSgpLHRoaXMuJGVsZW1lbnQucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLnJlZnJlc2hDbGFzcykucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxvYWRpbmdDbGFzcykucmVtb3ZlQ2xhc3ModGhpcy5vcHRpb25zLmxvYWRlZENsYXNzKS5yZW1vdmVDbGFzcyh0aGlzLm9wdGlvbnMucnRsQ2xhc3MpLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5kcmFnQ2xhc3MpLnJlbW92ZUNsYXNzKHRoaXMub3B0aW9ucy5ncmFiQ2xhc3MpLmF0dHIoXCJjbGFzc1wiLHRoaXMuJGVsZW1lbnQuYXR0cihcImNsYXNzXCIpLnJlcGxhY2UobmV3IFJlZ0V4cCh0aGlzLm9wdGlvbnMucmVzcG9uc2l2ZUNsYXNzK1wiLVxcXFxTK1xcXFxzXCIsXCJnXCIpLFwiXCIpKS5yZW1vdmVEYXRhKFwib3dsLmNhcm91c2VsXCIpfSxlLnByb3RvdHlwZS5vcD1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9dGhpcy5zZXR0aW5ncy5ydGw7c3dpdGNoKGIpe2Nhc2VcIjxcIjpyZXR1cm4gZD9hPmM6YTxjO2Nhc2VcIj5cIjpyZXR1cm4gZD9hPGM6YT5jO2Nhc2VcIj49XCI6cmV0dXJuIGQ/YTw9YzphPj1jO2Nhc2VcIjw9XCI6cmV0dXJuIGQ/YT49YzphPD1jfX0sZS5wcm90b3R5cGUub249ZnVuY3Rpb24oYSxiLGMsZCl7YS5hZGRFdmVudExpc3RlbmVyP2EuYWRkRXZlbnRMaXN0ZW5lcihiLGMsZCk6YS5hdHRhY2hFdmVudCYmYS5hdHRhY2hFdmVudChcIm9uXCIrYixjKX0sZS5wcm90b3R5cGUub2ZmPWZ1bmN0aW9uKGEsYixjLGQpe2EucmVtb3ZlRXZlbnRMaXN0ZW5lcj9hLnJlbW92ZUV2ZW50TGlzdGVuZXIoYixjLGQpOmEuZGV0YWNoRXZlbnQmJmEuZGV0YWNoRXZlbnQoXCJvblwiK2IsYyl9LGUucHJvdG90eXBlLnRyaWdnZXI9ZnVuY3Rpb24oYixjLGQsZixnKXt2YXIgaD17aXRlbTp7Y291bnQ6dGhpcy5faXRlbXMubGVuZ3RoLGluZGV4OnRoaXMuY3VycmVudCgpfX0saT1hLmNhbWVsQ2FzZShhLmdyZXAoW1wib25cIixiLGRdLGZ1bmN0aW9uKGEpe3JldHVybiBhfSkuam9pbihcIi1cIikudG9Mb3dlckNhc2UoKSksaj1hLkV2ZW50KFtiLFwib3dsXCIsZHx8XCJjYXJvdXNlbFwiXS5qb2luKFwiLlwiKS50b0xvd2VyQ2FzZSgpLGEuZXh0ZW5kKHtyZWxhdGVkVGFyZ2V0OnRoaXN9LGgsYykpO3JldHVybiB0aGlzLl9zdXByZXNzW2JdfHwoYS5lYWNoKHRoaXMuX3BsdWdpbnMsZnVuY3Rpb24oYSxiKXtiLm9uVHJpZ2dlciYmYi5vblRyaWdnZXIoail9KSx0aGlzLnJlZ2lzdGVyKHt0eXBlOmUuVHlwZS5FdmVudCxuYW1lOmJ9KSx0aGlzLiRlbGVtZW50LnRyaWdnZXIoaiksdGhpcy5zZXR0aW5ncyYmXCJmdW5jdGlvblwiPT10eXBlb2YgdGhpcy5zZXR0aW5nc1tpXSYmdGhpcy5zZXR0aW5nc1tpXS5jYWxsKHRoaXMsaikpLGp9LGUucHJvdG90eXBlLmVudGVyPWZ1bmN0aW9uKGIpe2EuZWFjaChbYl0uY29uY2F0KHRoaXMuX3N0YXRlcy50YWdzW2JdfHxbXSksYS5wcm94eShmdW5jdGlvbihhLGIpe3RoaXMuX3N0YXRlcy5jdXJyZW50W2JdPT09ZCYmKHRoaXMuX3N0YXRlcy5jdXJyZW50W2JdPTApLHRoaXMuX3N0YXRlcy5jdXJyZW50W2JdKyt9LHRoaXMpKX0sZS5wcm90b3R5cGUubGVhdmU9ZnVuY3Rpb24oYil7YS5lYWNoKFtiXS5jb25jYXQodGhpcy5fc3RhdGVzLnRhZ3NbYl18fFtdKSxhLnByb3h5KGZ1bmN0aW9uKGEsYil7dGhpcy5fc3RhdGVzLmN1cnJlbnRbYl0tLX0sdGhpcykpfSxlLnByb3RvdHlwZS5yZWdpc3Rlcj1mdW5jdGlvbihiKXtpZihiLnR5cGU9PT1lLlR5cGUuRXZlbnQpe2lmKGEuZXZlbnQuc3BlY2lhbFtiLm5hbWVdfHwoYS5ldmVudC5zcGVjaWFsW2IubmFtZV09e30pLCFhLmV2ZW50LnNwZWNpYWxbYi5uYW1lXS5vd2wpe3ZhciBjPWEuZXZlbnQuc3BlY2lhbFtiLm5hbWVdLl9kZWZhdWx0O2EuZXZlbnQuc3BlY2lhbFtiLm5hbWVdLl9kZWZhdWx0PWZ1bmN0aW9uKGEpe3JldHVybiFjfHwhYy5hcHBseXx8YS5uYW1lc3BhY2UmJi0xIT09YS5uYW1lc3BhY2UuaW5kZXhPZihcIm93bFwiKT9hLm5hbWVzcGFjZSYmYS5uYW1lc3BhY2UuaW5kZXhPZihcIm93bFwiKT4tMTpjLmFwcGx5KHRoaXMsYXJndW1lbnRzKX0sYS5ldmVudC5zcGVjaWFsW2IubmFtZV0ub3dsPSEwfX1lbHNlIGIudHlwZT09PWUuVHlwZS5TdGF0ZSYmKHRoaXMuX3N0YXRlcy50YWdzW2IubmFtZV0/dGhpcy5fc3RhdGVzLnRhZ3NbYi5uYW1lXT10aGlzLl9zdGF0ZXMudGFnc1tiLm5hbWVdLmNvbmNhdChiLnRhZ3MpOnRoaXMuX3N0YXRlcy50YWdzW2IubmFtZV09Yi50YWdzLHRoaXMuX3N0YXRlcy50YWdzW2IubmFtZV09YS5ncmVwKHRoaXMuX3N0YXRlcy50YWdzW2IubmFtZV0sYS5wcm94eShmdW5jdGlvbihjLGQpe3JldHVybiBhLmluQXJyYXkoYyx0aGlzLl9zdGF0ZXMudGFnc1tiLm5hbWVdKT09PWR9LHRoaXMpKSl9LGUucHJvdG90eXBlLnN1cHByZXNzPWZ1bmN0aW9uKGIpe2EuZWFjaChiLGEucHJveHkoZnVuY3Rpb24oYSxiKXt0aGlzLl9zdXByZXNzW2JdPSEwfSx0aGlzKSl9LGUucHJvdG90eXBlLnJlbGVhc2U9ZnVuY3Rpb24oYil7YS5lYWNoKGIsYS5wcm94eShmdW5jdGlvbihhLGIpe2RlbGV0ZSB0aGlzLl9zdXByZXNzW2JdfSx0aGlzKSl9LGUucHJvdG90eXBlLnBvaW50ZXI9ZnVuY3Rpb24oYSl7dmFyIGM9e3g6bnVsbCx5Om51bGx9O3JldHVybiBhPWEub3JpZ2luYWxFdmVudHx8YXx8Yi5ldmVudCxhPWEudG91Y2hlcyYmYS50b3VjaGVzLmxlbmd0aD9hLnRvdWNoZXNbMF06YS5jaGFuZ2VkVG91Y2hlcyYmYS5jaGFuZ2VkVG91Y2hlcy5sZW5ndGg/YS5jaGFuZ2VkVG91Y2hlc1swXTphLGEucGFnZVg/KGMueD1hLnBhZ2VYLGMueT1hLnBhZ2VZKTooYy54PWEuY2xpZW50WCxjLnk9YS5jbGllbnRZKSxjfSxlLnByb3RvdHlwZS5pc051bWVyaWM9ZnVuY3Rpb24oYSl7cmV0dXJuIWlzTmFOKHBhcnNlRmxvYXQoYSkpfSxlLnByb3RvdHlwZS5kaWZmZXJlbmNlPWZ1bmN0aW9uKGEsYil7cmV0dXJue3g6YS54LWIueCx5OmEueS1iLnl9fSxhLmZuLm93bENhcm91c2VsPWZ1bmN0aW9uKGIpe3ZhciBjPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywxKTtyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uKCl7dmFyIGQ9YSh0aGlzKSxmPWQuZGF0YShcIm93bC5jYXJvdXNlbFwiKTtmfHwoZj1uZXcgZSh0aGlzLFwib2JqZWN0XCI9PXR5cGVvZiBiJiZiKSxkLmRhdGEoXCJvd2wuY2Fyb3VzZWxcIixmKSxhLmVhY2goW1wibmV4dFwiLFwicHJldlwiLFwidG9cIixcImRlc3Ryb3lcIixcInJlZnJlc2hcIixcInJlcGxhY2VcIixcImFkZFwiLFwicmVtb3ZlXCJdLGZ1bmN0aW9uKGIsYyl7Zi5yZWdpc3Rlcih7dHlwZTplLlR5cGUuRXZlbnQsbmFtZTpjfSksZi4kZWxlbWVudC5vbihjK1wiLm93bC5jYXJvdXNlbC5jb3JlXCIsYS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmYS5yZWxhdGVkVGFyZ2V0IT09dGhpcyYmKHRoaXMuc3VwcHJlc3MoW2NdKSxmW2NdLmFwcGx5KHRoaXMsW10uc2xpY2UuY2FsbChhcmd1bWVudHMsMSkpLHRoaXMucmVsZWFzZShbY10pKX0sZikpfSkpLFwic3RyaW5nXCI9PXR5cGVvZiBiJiZcIl9cIiE9PWIuY2hhckF0KDApJiZmW2JdLmFwcGx5KGYsYyl9KX0sYS5mbi5vd2xDYXJvdXNlbC5Db25zdHJ1Y3Rvcj1lfSh3aW5kb3cuWmVwdG98fHdpbmRvdy5qUXVlcnksd2luZG93LGRvY3VtZW50KSxmdW5jdGlvbihhLGIsYyxkKXt2YXIgZT1mdW5jdGlvbihiKXt0aGlzLl9jb3JlPWIsdGhpcy5faW50ZXJ2YWw9bnVsbCx0aGlzLl92aXNpYmxlPW51bGwsdGhpcy5faGFuZGxlcnM9e1wiaW5pdGlhbGl6ZWQub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmdGhpcy5fY29yZS5zZXR0aW5ncy5hdXRvUmVmcmVzaCYmdGhpcy53YXRjaCgpfSx0aGlzKX0sdGhpcy5fY29yZS5vcHRpb25zPWEuZXh0ZW5kKHt9LGUuRGVmYXVsdHMsdGhpcy5fY29yZS5vcHRpb25zKSx0aGlzLl9jb3JlLiRlbGVtZW50Lm9uKHRoaXMuX2hhbmRsZXJzKX07ZS5EZWZhdWx0cz17YXV0b1JlZnJlc2g6ITAsYXV0b1JlZnJlc2hJbnRlcnZhbDo1MDB9LGUucHJvdG90eXBlLndhdGNoPWZ1bmN0aW9uKCl7dGhpcy5faW50ZXJ2YWx8fCh0aGlzLl92aXNpYmxlPXRoaXMuX2NvcmUuaXNWaXNpYmxlKCksdGhpcy5faW50ZXJ2YWw9Yi5zZXRJbnRlcnZhbChhLnByb3h5KHRoaXMucmVmcmVzaCx0aGlzKSx0aGlzLl9jb3JlLnNldHRpbmdzLmF1dG9SZWZyZXNoSW50ZXJ2YWwpKX0sZS5wcm90b3R5cGUucmVmcmVzaD1mdW5jdGlvbigpe3RoaXMuX2NvcmUuaXNWaXNpYmxlKCkhPT10aGlzLl92aXNpYmxlJiYodGhpcy5fdmlzaWJsZT0hdGhpcy5fdmlzaWJsZSx0aGlzLl9jb3JlLiRlbGVtZW50LnRvZ2dsZUNsYXNzKFwib3dsLWhpZGRlblwiLCF0aGlzLl92aXNpYmxlKSx0aGlzLl92aXNpYmxlJiZ0aGlzLl9jb3JlLmludmFsaWRhdGUoXCJ3aWR0aFwiKSYmdGhpcy5fY29yZS5yZWZyZXNoKCkpfSxlLnByb3RvdHlwZS5kZXN0cm95PWZ1bmN0aW9uKCl7dmFyIGEsYztiLmNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWwpO2ZvcihhIGluIHRoaXMuX2hhbmRsZXJzKXRoaXMuX2NvcmUuJGVsZW1lbnQub2ZmKGEsdGhpcy5faGFuZGxlcnNbYV0pO2ZvcihjIGluIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMpKVwiZnVuY3Rpb25cIiE9dHlwZW9mIHRoaXNbY10mJih0aGlzW2NdPW51bGwpfSxhLmZuLm93bENhcm91c2VsLkNvbnN0cnVjdG9yLlBsdWdpbnMuQXV0b1JlZnJlc2g9ZX0od2luZG93LlplcHRvfHx3aW5kb3cualF1ZXJ5LHdpbmRvdyxkb2N1bWVudCksZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGU9ZnVuY3Rpb24oYil7dGhpcy5fY29yZT1iLHRoaXMuX2xvYWRlZD1bXSx0aGlzLl9oYW5kbGVycz17XCJpbml0aWFsaXplZC5vd2wuY2Fyb3VzZWwgY2hhbmdlLm93bC5jYXJvdXNlbCByZXNpemVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYil7aWYoYi5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MmJnRoaXMuX2NvcmUuc2V0dGluZ3MubGF6eUxvYWQmJihiLnByb3BlcnR5JiZcInBvc2l0aW9uXCI9PWIucHJvcGVydHkubmFtZXx8XCJpbml0aWFsaXplZFwiPT1iLnR5cGUpKXt2YXIgYz10aGlzLl9jb3JlLnNldHRpbmdzLGU9Yy5jZW50ZXImJk1hdGguY2VpbChjLml0ZW1zLzIpfHxjLml0ZW1zLGY9Yy5jZW50ZXImJi0xKmV8fDAsZz0oYi5wcm9wZXJ0eSYmYi5wcm9wZXJ0eS52YWx1ZSE9PWQ/Yi5wcm9wZXJ0eS52YWx1ZTp0aGlzLl9jb3JlLmN1cnJlbnQoKSkrZixoPXRoaXMuX2NvcmUuY2xvbmVzKCkubGVuZ3RoLGk9YS5wcm94eShmdW5jdGlvbihhLGIpe3RoaXMubG9hZChiKX0sdGhpcyk7Zm9yKGMubGF6eUxvYWRFYWdlcj4wJiYoZSs9Yy5sYXp5TG9hZEVhZ2VyLGMubG9vcCYmKGctPWMubGF6eUxvYWRFYWdlcixlKyspKTtmKys8ZTspdGhpcy5sb2FkKGgvMit0aGlzLl9jb3JlLnJlbGF0aXZlKGcpKSxoJiZhLmVhY2godGhpcy5fY29yZS5jbG9uZXModGhpcy5fY29yZS5yZWxhdGl2ZShnKSksaSksZysrfX0sdGhpcyl9LHRoaXMuX2NvcmUub3B0aW9ucz1hLmV4dGVuZCh7fSxlLkRlZmF1bHRzLHRoaXMuX2NvcmUub3B0aW9ucyksdGhpcy5fY29yZS4kZWxlbWVudC5vbih0aGlzLl9oYW5kbGVycyl9O2UuRGVmYXVsdHM9e2xhenlMb2FkOiExLGxhenlMb2FkRWFnZXI6MH0sZS5wcm90b3R5cGUubG9hZD1mdW5jdGlvbihjKXt2YXIgZD10aGlzLl9jb3JlLiRzdGFnZS5jaGlsZHJlbigpLmVxKGMpLGU9ZCYmZC5maW5kKFwiLm93bC1sYXp5XCIpOyFlfHxhLmluQXJyYXkoZC5nZXQoMCksdGhpcy5fbG9hZGVkKT4tMXx8KGUuZWFjaChhLnByb3h5KGZ1bmN0aW9uKGMsZCl7dmFyIGUsZj1hKGQpLGc9Yi5kZXZpY2VQaXhlbFJhdGlvPjEmJmYuYXR0cihcImRhdGEtc3JjLXJldGluYVwiKXx8Zi5hdHRyKFwiZGF0YS1zcmNcIil8fGYuYXR0cihcImRhdGEtc3Jjc2V0XCIpO3RoaXMuX2NvcmUudHJpZ2dlcihcImxvYWRcIix7ZWxlbWVudDpmLHVybDpnfSxcImxhenlcIiksZi5pcyhcImltZ1wiKT9mLm9uZShcImxvYWQub3dsLmxhenlcIixhLnByb3h5KGZ1bmN0aW9uKCl7Zi5jc3MoXCJvcGFjaXR5XCIsMSksdGhpcy5fY29yZS50cmlnZ2VyKFwibG9hZGVkXCIse2VsZW1lbnQ6Zix1cmw6Z30sXCJsYXp5XCIpfSx0aGlzKSkuYXR0cihcInNyY1wiLGcpOmYuaXMoXCJzb3VyY2VcIik/Zi5vbmUoXCJsb2FkLm93bC5sYXp5XCIsYS5wcm94eShmdW5jdGlvbigpe3RoaXMuX2NvcmUudHJpZ2dlcihcImxvYWRlZFwiLHtlbGVtZW50OmYsdXJsOmd9LFwibGF6eVwiKX0sdGhpcykpLmF0dHIoXCJzcmNzZXRcIixnKTooZT1uZXcgSW1hZ2UsZS5vbmxvYWQ9YS5wcm94eShmdW5jdGlvbigpe2YuY3NzKHtcImJhY2tncm91bmQtaW1hZ2VcIjondXJsKFwiJytnKydcIiknLG9wYWNpdHk6XCIxXCJ9KSx0aGlzLl9jb3JlLnRyaWdnZXIoXCJsb2FkZWRcIix7ZWxlbWVudDpmLHVybDpnfSxcImxhenlcIil9LHRoaXMpLGUuc3JjPWcpfSx0aGlzKSksdGhpcy5fbG9hZGVkLnB1c2goZC5nZXQoMCkpKX0sZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3ZhciBhLGI7Zm9yKGEgaW4gdGhpcy5oYW5kbGVycyl0aGlzLl9jb3JlLiRlbGVtZW50Lm9mZihhLHRoaXMuaGFuZGxlcnNbYV0pO2ZvcihiIGluIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMpKVwiZnVuY3Rpb25cIiE9dHlwZW9mIHRoaXNbYl0mJih0aGlzW2JdPW51bGwpfSxhLmZuLm93bENhcm91c2VsLkNvbnN0cnVjdG9yLlBsdWdpbnMuTGF6eT1lfSh3aW5kb3cuWmVwdG98fHdpbmRvdy5qUXVlcnksd2luZG93LGRvY3VtZW50KSxmdW5jdGlvbihhLGIsYyxkKXt2YXIgZT1mdW5jdGlvbihjKXt0aGlzLl9jb3JlPWMsdGhpcy5fcHJldmlvdXNIZWlnaHQ9bnVsbCx0aGlzLl9oYW5kbGVycz17XCJpbml0aWFsaXplZC5vd2wuY2Fyb3VzZWwgcmVmcmVzaGVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuYXV0b0hlaWdodCYmdGhpcy51cGRhdGUoKX0sdGhpcyksXCJjaGFuZ2VkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuYXV0b0hlaWdodCYmXCJwb3NpdGlvblwiPT09YS5wcm9wZXJ0eS5uYW1lJiZ0aGlzLnVwZGF0ZSgpfSx0aGlzKSxcImxvYWRlZC5vd2wubGF6eVwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuYXV0b0hlaWdodCYmYS5lbGVtZW50LmNsb3Nlc3QoXCIuXCIrdGhpcy5fY29yZS5zZXR0aW5ncy5pdGVtQ2xhc3MpLmluZGV4KCk9PT10aGlzLl9jb3JlLmN1cnJlbnQoKSYmdGhpcy51cGRhdGUoKX0sdGhpcyl9LHRoaXMuX2NvcmUub3B0aW9ucz1hLmV4dGVuZCh7fSxlLkRlZmF1bHRzLHRoaXMuX2NvcmUub3B0aW9ucyksdGhpcy5fY29yZS4kZWxlbWVudC5vbih0aGlzLl9oYW5kbGVycyksdGhpcy5faW50ZXJ2YWxJZD1udWxsO3ZhciBkPXRoaXM7YShiKS5vbihcImxvYWRcIixmdW5jdGlvbigpe2QuX2NvcmUuc2V0dGluZ3MuYXV0b0hlaWdodCYmZC51cGRhdGUoKX0pLGEoYikucmVzaXplKGZ1bmN0aW9uKCl7ZC5fY29yZS5zZXR0aW5ncy5hdXRvSGVpZ2h0JiYobnVsbCE9ZC5faW50ZXJ2YWxJZCYmY2xlYXJUaW1lb3V0KGQuX2ludGVydmFsSWQpLGQuX2ludGVydmFsSWQ9c2V0VGltZW91dChmdW5jdGlvbigpe2QudXBkYXRlKCl9LDI1MCkpfSl9O2UuRGVmYXVsdHM9e2F1dG9IZWlnaHQ6ITEsYXV0b0hlaWdodENsYXNzOlwib3dsLWhlaWdodFwifSxlLnByb3RvdHlwZS51cGRhdGU9ZnVuY3Rpb24oKXt2YXIgYj10aGlzLl9jb3JlLl9jdXJyZW50LGM9Yit0aGlzLl9jb3JlLnNldHRpbmdzLml0ZW1zLGQ9dGhpcy5fY29yZS5zZXR0aW5ncy5sYXp5TG9hZCxlPXRoaXMuX2NvcmUuJHN0YWdlLmNoaWxkcmVuKCkudG9BcnJheSgpLnNsaWNlKGIsYyksZj1bXSxnPTA7YS5lYWNoKGUsZnVuY3Rpb24oYixjKXtmLnB1c2goYShjKS5oZWlnaHQoKSl9KSxnPU1hdGgubWF4LmFwcGx5KG51bGwsZiksZzw9MSYmZCYmdGhpcy5fcHJldmlvdXNIZWlnaHQmJihnPXRoaXMuX3ByZXZpb3VzSGVpZ2h0KSx0aGlzLl9wcmV2aW91c0hlaWdodD1nLHRoaXMuX2NvcmUuJHN0YWdlLnBhcmVudCgpLmhlaWdodChnKS5hZGRDbGFzcyh0aGlzLl9jb3JlLnNldHRpbmdzLmF1dG9IZWlnaHRDbGFzcyl9LGUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYSxiO2ZvcihhIGluIHRoaXMuX2hhbmRsZXJzKXRoaXMuX2NvcmUuJGVsZW1lbnQub2ZmKGEsdGhpcy5faGFuZGxlcnNbYV0pO2ZvcihiIGluIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMpKVwiZnVuY3Rpb25cIiE9dHlwZW9mIHRoaXNbYl0mJih0aGlzW2JdPW51bGwpfSxhLmZuLm93bENhcm91c2VsLkNvbnN0cnVjdG9yLlBsdWdpbnMuQXV0b0hlaWdodD1lfSh3aW5kb3cuWmVwdG98fHdpbmRvdy5qUXVlcnksd2luZG93LGRvY3VtZW50KSxmdW5jdGlvbihhLGIsYyxkKXt2YXIgZT1mdW5jdGlvbihiKXt0aGlzLl9jb3JlPWIsdGhpcy5fdmlkZW9zPXt9LHRoaXMuX3BsYXlpbmc9bnVsbCx0aGlzLl9oYW5kbGVycz17XCJpbml0aWFsaXplZC5vd2wuY2Fyb3VzZWxcIjphLnByb3h5KGZ1bmN0aW9uKGEpe2EubmFtZXNwYWNlJiZ0aGlzLl9jb3JlLnJlZ2lzdGVyKHt0eXBlOlwic3RhdGVcIixuYW1lOlwicGxheWluZ1wiLHRhZ3M6W1wiaW50ZXJhY3RpbmdcIl19KX0sdGhpcyksXCJyZXNpemUub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmdGhpcy5fY29yZS5zZXR0aW5ncy52aWRlbyYmdGhpcy5pc0luRnVsbFNjcmVlbigpJiZhLnByZXZlbnREZWZhdWx0KCl9LHRoaXMpLFwicmVmcmVzaGVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuaXMoXCJyZXNpemluZ1wiKSYmdGhpcy5fY29yZS4kc3RhZ2UuZmluZChcIi5jbG9uZWQgLm93bC12aWRlby1mcmFtZVwiKS5yZW1vdmUoKX0sdGhpcyksXCJjaGFuZ2VkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJlwicG9zaXRpb25cIj09PWEucHJvcGVydHkubmFtZSYmdGhpcy5fcGxheWluZyYmdGhpcy5zdG9wKCl9LHRoaXMpLFwicHJlcGFyZWQub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihiKXtpZihiLm5hbWVzcGFjZSl7dmFyIGM9YShiLmNvbnRlbnQpLmZpbmQoXCIub3dsLXZpZGVvXCIpO2MubGVuZ3RoJiYoYy5jc3MoXCJkaXNwbGF5XCIsXCJub25lXCIpLHRoaXMuZmV0Y2goYyxhKGIuY29udGVudCkpKX19LHRoaXMpfSx0aGlzLl9jb3JlLm9wdGlvbnM9YS5leHRlbmQoe30sZS5EZWZhdWx0cyx0aGlzLl9jb3JlLm9wdGlvbnMpLHRoaXMuX2NvcmUuJGVsZW1lbnQub24odGhpcy5faGFuZGxlcnMpLHRoaXMuX2NvcmUuJGVsZW1lbnQub24oXCJjbGljay5vd2wudmlkZW9cIixcIi5vd2wtdmlkZW8tcGxheS1pY29uXCIsYS5wcm94eShmdW5jdGlvbihhKXt0aGlzLnBsYXkoYSl9LHRoaXMpKX07ZS5EZWZhdWx0cz17dmlkZW86ITEsdmlkZW9IZWlnaHQ6ITEsdmlkZW9XaWR0aDohMX0sZS5wcm90b3R5cGUuZmV0Y2g9ZnVuY3Rpb24oYSxiKXt2YXIgYz1mdW5jdGlvbigpe3JldHVybiBhLmF0dHIoXCJkYXRhLXZpbWVvLWlkXCIpP1widmltZW9cIjphLmF0dHIoXCJkYXRhLXZ6YWFyLWlkXCIpP1widnphYXJcIjpcInlvdXR1YmVcIn0oKSxkPWEuYXR0cihcImRhdGEtdmltZW8taWRcIil8fGEuYXR0cihcImRhdGEteW91dHViZS1pZFwiKXx8YS5hdHRyKFwiZGF0YS12emFhci1pZFwiKSxlPWEuYXR0cihcImRhdGEtd2lkdGhcIil8fHRoaXMuX2NvcmUuc2V0dGluZ3MudmlkZW9XaWR0aCxmPWEuYXR0cihcImRhdGEtaGVpZ2h0XCIpfHx0aGlzLl9jb3JlLnNldHRpbmdzLnZpZGVvSGVpZ2h0LGc9YS5hdHRyKFwiaHJlZlwiKTtpZighZyl0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIHZpZGVvIFVSTC5cIik7aWYoZD1nLm1hdGNoKC8oaHR0cDp8aHR0cHM6fClcXC9cXC8ocGxheWVyLnx3d3cufGFwcC4pPyh2aW1lb1xcLmNvbXx5b3V0dShiZVxcLmNvbXxcXC5iZXxiZVxcLmdvb2dsZWFwaXNcXC5jb218YmVcXC1ub2Nvb2tpZVxcLmNvbSl8dnphYXJcXC5jb20pXFwvKHZpZGVvXFwvfHZpZGVvc1xcL3xlbWJlZFxcL3xjaGFubmVsc1xcLy4rXFwvfGdyb3Vwc1xcLy4rXFwvfHdhdGNoXFw/dj18dlxcLyk/KFtBLVphLXowLTkuXyUtXSopKFxcJlxcUyspPy8pLGRbM10uaW5kZXhPZihcInlvdXR1XCIpPi0xKWM9XCJ5b3V0dWJlXCI7ZWxzZSBpZihkWzNdLmluZGV4T2YoXCJ2aW1lb1wiKT4tMSljPVwidmltZW9cIjtlbHNle2lmKCEoZFszXS5pbmRleE9mKFwidnphYXJcIik+LTEpKXRocm93IG5ldyBFcnJvcihcIlZpZGVvIFVSTCBub3Qgc3VwcG9ydGVkLlwiKTtjPVwidnphYXJcIn1kPWRbNl0sdGhpcy5fdmlkZW9zW2ddPXt0eXBlOmMsaWQ6ZCx3aWR0aDplLGhlaWdodDpmfSxiLmF0dHIoXCJkYXRhLXZpZGVvXCIsZyksdGhpcy50aHVtYm5haWwoYSx0aGlzLl92aWRlb3NbZ10pfSxlLnByb3RvdHlwZS50aHVtYm5haWw9ZnVuY3Rpb24oYixjKXt2YXIgZCxlLGYsZz1jLndpZHRoJiZjLmhlaWdodD9cIndpZHRoOlwiK2Mud2lkdGgrXCJweDtoZWlnaHQ6XCIrYy5oZWlnaHQrXCJweDtcIjpcIlwiLGg9Yi5maW5kKFwiaW1nXCIpLGk9XCJzcmNcIixqPVwiXCIsaz10aGlzLl9jb3JlLnNldHRpbmdzLGw9ZnVuY3Rpb24oYyl7ZT0nPGRpdiBjbGFzcz1cIm93bC12aWRlby1wbGF5LWljb25cIj48L2Rpdj4nLGQ9ay5sYXp5TG9hZD9hKFwiPGRpdi8+XCIse2NsYXNzOlwib3dsLXZpZGVvLXRuIFwiK2osc3JjVHlwZTpjfSk6YShcIjxkaXYvPlwiLHtjbGFzczpcIm93bC12aWRlby10blwiLHN0eWxlOlwib3BhY2l0eToxO2JhY2tncm91bmQtaW1hZ2U6dXJsKFwiK2MrXCIpXCJ9KSxiLmFmdGVyKGQpLGIuYWZ0ZXIoZSl9O2lmKGIud3JhcChhKFwiPGRpdi8+XCIse2NsYXNzOlwib3dsLXZpZGVvLXdyYXBwZXJcIixzdHlsZTpnfSkpLHRoaXMuX2NvcmUuc2V0dGluZ3MubGF6eUxvYWQmJihpPVwiZGF0YS1zcmNcIixqPVwib3dsLWxhenlcIiksaC5sZW5ndGgpcmV0dXJuIGwoaC5hdHRyKGkpKSxoLnJlbW92ZSgpLCExO1wieW91dHViZVwiPT09Yy50eXBlPyhmPVwiLy9pbWcueW91dHViZS5jb20vdmkvXCIrYy5pZCtcIi9ocWRlZmF1bHQuanBnXCIsbChmKSk6XCJ2aW1lb1wiPT09Yy50eXBlP2EuYWpheCh7dHlwZTpcIkdFVFwiLHVybDpcIi8vdmltZW8uY29tL2FwaS92Mi92aWRlby9cIitjLmlkK1wiLmpzb25cIixqc29ucDpcImNhbGxiYWNrXCIsZGF0YVR5cGU6XCJqc29ucFwiLHN1Y2Nlc3M6ZnVuY3Rpb24oYSl7Zj1hWzBdLnRodW1ibmFpbF9sYXJnZSxsKGYpfX0pOlwidnphYXJcIj09PWMudHlwZSYmYS5hamF4KHt0eXBlOlwiR0VUXCIsdXJsOlwiLy92emFhci5jb20vYXBpL3ZpZGVvcy9cIitjLmlkK1wiLmpzb25cIixqc29ucDpcImNhbGxiYWNrXCIsZGF0YVR5cGU6XCJqc29ucFwiLHN1Y2Nlc3M6ZnVuY3Rpb24oYSl7Zj1hLmZyYW1lZ3JhYl91cmwsbChmKX19KX0sZS5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMuX2NvcmUudHJpZ2dlcihcInN0b3BcIixudWxsLFwidmlkZW9cIiksdGhpcy5fcGxheWluZy5maW5kKFwiLm93bC12aWRlby1mcmFtZVwiKS5yZW1vdmUoKSx0aGlzLl9wbGF5aW5nLnJlbW92ZUNsYXNzKFwib3dsLXZpZGVvLXBsYXlpbmdcIiksdGhpcy5fcGxheWluZz1udWxsLHRoaXMuX2NvcmUubGVhdmUoXCJwbGF5aW5nXCIpLHRoaXMuX2NvcmUudHJpZ2dlcihcInN0b3BwZWRcIixudWxsLFwidmlkZW9cIil9LGUucHJvdG90eXBlLnBsYXk9ZnVuY3Rpb24oYil7dmFyIGMsZD1hKGIudGFyZ2V0KSxlPWQuY2xvc2VzdChcIi5cIit0aGlzLl9jb3JlLnNldHRpbmdzLml0ZW1DbGFzcyksZj10aGlzLl92aWRlb3NbZS5hdHRyKFwiZGF0YS12aWRlb1wiKV0sZz1mLndpZHRofHxcIjEwMCVcIixoPWYuaGVpZ2h0fHx0aGlzLl9jb3JlLiRzdGFnZS5oZWlnaHQoKTt0aGlzLl9wbGF5aW5nfHwodGhpcy5fY29yZS5lbnRlcihcInBsYXlpbmdcIiksdGhpcy5fY29yZS50cmlnZ2VyKFwicGxheVwiLG51bGwsXCJ2aWRlb1wiKSxlPXRoaXMuX2NvcmUuaXRlbXModGhpcy5fY29yZS5yZWxhdGl2ZShlLmluZGV4KCkpKSx0aGlzLl9jb3JlLnJlc2V0KGUuaW5kZXgoKSksYz1hKCc8aWZyYW1lIGZyYW1lYm9yZGVyPVwiMFwiIGFsbG93ZnVsbHNjcmVlbiBtb3phbGxvd2Z1bGxzY3JlZW4gd2Via2l0QWxsb3dGdWxsU2NyZWVuID48L2lmcmFtZT4nKSxjLmF0dHIoXCJoZWlnaHRcIixoKSxjLmF0dHIoXCJ3aWR0aFwiLGcpLFwieW91dHViZVwiPT09Zi50eXBlP2MuYXR0cihcInNyY1wiLFwiLy93d3cueW91dHViZS5jb20vZW1iZWQvXCIrZi5pZCtcIj9hdXRvcGxheT0xJnJlbD0wJnY9XCIrZi5pZCk6XCJ2aW1lb1wiPT09Zi50eXBlP2MuYXR0cihcInNyY1wiLFwiLy9wbGF5ZXIudmltZW8uY29tL3ZpZGVvL1wiK2YuaWQrXCI/YXV0b3BsYXk9MVwiKTpcInZ6YWFyXCI9PT1mLnR5cGUmJmMuYXR0cihcInNyY1wiLFwiLy92aWV3LnZ6YWFyLmNvbS9cIitmLmlkK1wiL3BsYXllcj9hdXRvcGxheT10cnVlXCIpLGEoYykud3JhcCgnPGRpdiBjbGFzcz1cIm93bC12aWRlby1mcmFtZVwiIC8+JykuaW5zZXJ0QWZ0ZXIoZS5maW5kKFwiLm93bC12aWRlb1wiKSksdGhpcy5fcGxheWluZz1lLmFkZENsYXNzKFwib3dsLXZpZGVvLXBsYXlpbmdcIikpfSxlLnByb3RvdHlwZS5pc0luRnVsbFNjcmVlbj1mdW5jdGlvbigpe3ZhciBiPWMuZnVsbHNjcmVlbkVsZW1lbnR8fGMubW96RnVsbFNjcmVlbkVsZW1lbnR8fGMud2Via2l0RnVsbHNjcmVlbkVsZW1lbnQ7cmV0dXJuIGImJmEoYikucGFyZW50KCkuaGFzQ2xhc3MoXCJvd2wtdmlkZW8tZnJhbWVcIil9LGUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYSxiO3RoaXMuX2NvcmUuJGVsZW1lbnQub2ZmKFwiY2xpY2sub3dsLnZpZGVvXCIpO2ZvcihhIGluIHRoaXMuX2hhbmRsZXJzKXRoaXMuX2NvcmUuJGVsZW1lbnQub2ZmKGEsdGhpcy5faGFuZGxlcnNbYV0pO2ZvcihiIGluIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMpKVwiZnVuY3Rpb25cIiE9dHlwZW9mIHRoaXNbYl0mJih0aGlzW2JdPW51bGwpfSxhLmZuLm93bENhcm91c2VsLkNvbnN0cnVjdG9yLlBsdWdpbnMuVmlkZW89ZX0od2luZG93LlplcHRvfHx3aW5kb3cualF1ZXJ5LHdpbmRvdyxkb2N1bWVudCksZnVuY3Rpb24oYSxiLGMsZCl7dmFyIGU9ZnVuY3Rpb24oYil7dGhpcy5jb3JlPWIsdGhpcy5jb3JlLm9wdGlvbnM9YS5leHRlbmQoe30sZS5EZWZhdWx0cyx0aGlzLmNvcmUub3B0aW9ucyksdGhpcy5zd2FwcGluZz0hMCx0aGlzLnByZXZpb3VzPWQsdGhpcy5uZXh0PWQsdGhpcy5oYW5kbGVycz17XCJjaGFuZ2Uub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmXCJwb3NpdGlvblwiPT1hLnByb3BlcnR5Lm5hbWUmJih0aGlzLnByZXZpb3VzPXRoaXMuY29yZS5jdXJyZW50KCksdGhpcy5uZXh0PWEucHJvcGVydHkudmFsdWUpfSx0aGlzKSxcImRyYWcub3dsLmNhcm91c2VsIGRyYWdnZWQub3dsLmNhcm91c2VsIHRyYW5zbGF0ZWQub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmKHRoaXMuc3dhcHBpbmc9XCJ0cmFuc2xhdGVkXCI9PWEudHlwZSl9LHRoaXMpLFwidHJhbnNsYXRlLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuc3dhcHBpbmcmJih0aGlzLmNvcmUub3B0aW9ucy5hbmltYXRlT3V0fHx0aGlzLmNvcmUub3B0aW9ucy5hbmltYXRlSW4pJiZ0aGlzLnN3YXAoKX0sdGhpcyl9LHRoaXMuY29yZS4kZWxlbWVudC5vbih0aGlzLmhhbmRsZXJzKX07ZS5EZWZhdWx0cz17YW5pbWF0ZU91dDohMSxcbiBhbmltYXRlSW46ITF9LGUucHJvdG90eXBlLnN3YXA9ZnVuY3Rpb24oKXtpZigxPT09dGhpcy5jb3JlLnNldHRpbmdzLml0ZW1zJiZhLnN1cHBvcnQuYW5pbWF0aW9uJiZhLnN1cHBvcnQudHJhbnNpdGlvbil7dGhpcy5jb3JlLnNwZWVkKDApO3ZhciBiLGM9YS5wcm94eSh0aGlzLmNsZWFyLHRoaXMpLGQ9dGhpcy5jb3JlLiRzdGFnZS5jaGlsZHJlbigpLmVxKHRoaXMucHJldmlvdXMpLGU9dGhpcy5jb3JlLiRzdGFnZS5jaGlsZHJlbigpLmVxKHRoaXMubmV4dCksZj10aGlzLmNvcmUuc2V0dGluZ3MuYW5pbWF0ZUluLGc9dGhpcy5jb3JlLnNldHRpbmdzLmFuaW1hdGVPdXQ7dGhpcy5jb3JlLmN1cnJlbnQoKSE9PXRoaXMucHJldmlvdXMmJihnJiYoYj10aGlzLmNvcmUuY29vcmRpbmF0ZXModGhpcy5wcmV2aW91cyktdGhpcy5jb3JlLmNvb3JkaW5hdGVzKHRoaXMubmV4dCksZC5vbmUoYS5zdXBwb3J0LmFuaW1hdGlvbi5lbmQsYykuY3NzKHtsZWZ0OmIrXCJweFwifSkuYWRkQ2xhc3MoXCJhbmltYXRlZCBvd2wtYW5pbWF0ZWQtb3V0XCIpLmFkZENsYXNzKGcpKSxmJiZlLm9uZShhLnN1cHBvcnQuYW5pbWF0aW9uLmVuZCxjKS5hZGRDbGFzcyhcImFuaW1hdGVkIG93bC1hbmltYXRlZC1pblwiKS5hZGRDbGFzcyhmKSl9fSxlLnByb3RvdHlwZS5jbGVhcj1mdW5jdGlvbihiKXthKGIudGFyZ2V0KS5jc3Moe2xlZnQ6XCJcIn0pLnJlbW92ZUNsYXNzKFwiYW5pbWF0ZWQgb3dsLWFuaW1hdGVkLW91dCBvd2wtYW5pbWF0ZWQtaW5cIikucmVtb3ZlQ2xhc3ModGhpcy5jb3JlLnNldHRpbmdzLmFuaW1hdGVJbikucmVtb3ZlQ2xhc3ModGhpcy5jb3JlLnNldHRpbmdzLmFuaW1hdGVPdXQpLHRoaXMuY29yZS5vblRyYW5zaXRpb25FbmQoKX0sZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3ZhciBhLGI7Zm9yKGEgaW4gdGhpcy5oYW5kbGVycyl0aGlzLmNvcmUuJGVsZW1lbnQub2ZmKGEsdGhpcy5oYW5kbGVyc1thXSk7Zm9yKGIgaW4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcykpXCJmdW5jdGlvblwiIT10eXBlb2YgdGhpc1tiXSYmKHRoaXNbYl09bnVsbCl9LGEuZm4ub3dsQ2Fyb3VzZWwuQ29uc3RydWN0b3IuUGx1Z2lucy5BbmltYXRlPWV9KHdpbmRvdy5aZXB0b3x8d2luZG93LmpRdWVyeSx3aW5kb3csZG9jdW1lbnQpLGZ1bmN0aW9uKGEsYixjLGQpe3ZhciBlPWZ1bmN0aW9uKGIpe3RoaXMuX2NvcmU9Yix0aGlzLl9jYWxsPW51bGwsdGhpcy5fdGltZT0wLHRoaXMuX3RpbWVvdXQ9MCx0aGlzLl9wYXVzZWQ9ITAsdGhpcy5faGFuZGxlcnM9e1wiY2hhbmdlZC5vd2wuY2Fyb3VzZWxcIjphLnByb3h5KGZ1bmN0aW9uKGEpe2EubmFtZXNwYWNlJiZcInNldHRpbmdzXCI9PT1hLnByb3BlcnR5Lm5hbWU/dGhpcy5fY29yZS5zZXR0aW5ncy5hdXRvcGxheT90aGlzLnBsYXkoKTp0aGlzLnN0b3AoKTphLm5hbWVzcGFjZSYmXCJwb3NpdGlvblwiPT09YS5wcm9wZXJ0eS5uYW1lJiZ0aGlzLl9wYXVzZWQmJih0aGlzLl90aW1lPTApfSx0aGlzKSxcImluaXRpYWxpemVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuYXV0b3BsYXkmJnRoaXMucGxheSgpfSx0aGlzKSxcInBsYXkub3dsLmF1dG9wbGF5XCI6YS5wcm94eShmdW5jdGlvbihhLGIsYyl7YS5uYW1lc3BhY2UmJnRoaXMucGxheShiLGMpfSx0aGlzKSxcInN0b3Aub3dsLmF1dG9wbGF5XCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmdGhpcy5zdG9wKCl9LHRoaXMpLFwibW91c2VvdmVyLm93bC5hdXRvcGxheVwiOmEucHJveHkoZnVuY3Rpb24oKXt0aGlzLl9jb3JlLnNldHRpbmdzLmF1dG9wbGF5SG92ZXJQYXVzZSYmdGhpcy5fY29yZS5pcyhcInJvdGF0aW5nXCIpJiZ0aGlzLnBhdXNlKCl9LHRoaXMpLFwibW91c2VsZWF2ZS5vd2wuYXV0b3BsYXlcIjphLnByb3h5KGZ1bmN0aW9uKCl7dGhpcy5fY29yZS5zZXR0aW5ncy5hdXRvcGxheUhvdmVyUGF1c2UmJnRoaXMuX2NvcmUuaXMoXCJyb3RhdGluZ1wiKSYmdGhpcy5wbGF5KCl9LHRoaXMpLFwidG91Y2hzdGFydC5vd2wuY29yZVwiOmEucHJveHkoZnVuY3Rpb24oKXt0aGlzLl9jb3JlLnNldHRpbmdzLmF1dG9wbGF5SG92ZXJQYXVzZSYmdGhpcy5fY29yZS5pcyhcInJvdGF0aW5nXCIpJiZ0aGlzLnBhdXNlKCl9LHRoaXMpLFwidG91Y2hlbmQub3dsLmNvcmVcIjphLnByb3h5KGZ1bmN0aW9uKCl7dGhpcy5fY29yZS5zZXR0aW5ncy5hdXRvcGxheUhvdmVyUGF1c2UmJnRoaXMucGxheSgpfSx0aGlzKX0sdGhpcy5fY29yZS4kZWxlbWVudC5vbih0aGlzLl9oYW5kbGVycyksdGhpcy5fY29yZS5vcHRpb25zPWEuZXh0ZW5kKHt9LGUuRGVmYXVsdHMsdGhpcy5fY29yZS5vcHRpb25zKX07ZS5EZWZhdWx0cz17YXV0b3BsYXk6ITEsYXV0b3BsYXlUaW1lb3V0OjVlMyxhdXRvcGxheUhvdmVyUGF1c2U6ITEsYXV0b3BsYXlTcGVlZDohMX0sZS5wcm90b3R5cGUuX25leHQ9ZnVuY3Rpb24oZCl7dGhpcy5fY2FsbD1iLnNldFRpbWVvdXQoYS5wcm94eSh0aGlzLl9uZXh0LHRoaXMsZCksdGhpcy5fdGltZW91dCooTWF0aC5yb3VuZCh0aGlzLnJlYWQoKS90aGlzLl90aW1lb3V0KSsxKS10aGlzLnJlYWQoKSksdGhpcy5fY29yZS5pcyhcImludGVyYWN0aW5nXCIpfHxjLmhpZGRlbnx8dGhpcy5fY29yZS5uZXh0KGR8fHRoaXMuX2NvcmUuc2V0dGluZ3MuYXV0b3BsYXlTcGVlZCl9LGUucHJvdG90eXBlLnJlYWQ9ZnVuY3Rpb24oKXtyZXR1cm4obmV3IERhdGUpLmdldFRpbWUoKS10aGlzLl90aW1lfSxlLnByb3RvdHlwZS5wbGF5PWZ1bmN0aW9uKGMsZCl7dmFyIGU7dGhpcy5fY29yZS5pcyhcInJvdGF0aW5nXCIpfHx0aGlzLl9jb3JlLmVudGVyKFwicm90YXRpbmdcIiksYz1jfHx0aGlzLl9jb3JlLnNldHRpbmdzLmF1dG9wbGF5VGltZW91dCxlPU1hdGgubWluKHRoaXMuX3RpbWUlKHRoaXMuX3RpbWVvdXR8fGMpLGMpLHRoaXMuX3BhdXNlZD8odGhpcy5fdGltZT10aGlzLnJlYWQoKSx0aGlzLl9wYXVzZWQ9ITEpOmIuY2xlYXJUaW1lb3V0KHRoaXMuX2NhbGwpLHRoaXMuX3RpbWUrPXRoaXMucmVhZCgpJWMtZSx0aGlzLl90aW1lb3V0PWMsdGhpcy5fY2FsbD1iLnNldFRpbWVvdXQoYS5wcm94eSh0aGlzLl9uZXh0LHRoaXMsZCksYy1lKX0sZS5wcm90b3R5cGUuc3RvcD1mdW5jdGlvbigpe3RoaXMuX2NvcmUuaXMoXCJyb3RhdGluZ1wiKSYmKHRoaXMuX3RpbWU9MCx0aGlzLl9wYXVzZWQ9ITAsYi5jbGVhclRpbWVvdXQodGhpcy5fY2FsbCksdGhpcy5fY29yZS5sZWF2ZShcInJvdGF0aW5nXCIpKX0sZS5wcm90b3R5cGUucGF1c2U9ZnVuY3Rpb24oKXt0aGlzLl9jb3JlLmlzKFwicm90YXRpbmdcIikmJiF0aGlzLl9wYXVzZWQmJih0aGlzLl90aW1lPXRoaXMucmVhZCgpLHRoaXMuX3BhdXNlZD0hMCxiLmNsZWFyVGltZW91dCh0aGlzLl9jYWxsKSl9LGUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYSxiO3RoaXMuc3RvcCgpO2ZvcihhIGluIHRoaXMuX2hhbmRsZXJzKXRoaXMuX2NvcmUuJGVsZW1lbnQub2ZmKGEsdGhpcy5faGFuZGxlcnNbYV0pO2ZvcihiIGluIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMpKVwiZnVuY3Rpb25cIiE9dHlwZW9mIHRoaXNbYl0mJih0aGlzW2JdPW51bGwpfSxhLmZuLm93bENhcm91c2VsLkNvbnN0cnVjdG9yLlBsdWdpbnMuYXV0b3BsYXk9ZX0od2luZG93LlplcHRvfHx3aW5kb3cualF1ZXJ5LHdpbmRvdyxkb2N1bWVudCksZnVuY3Rpb24oYSxiLGMsZCl7XCJ1c2Ugc3RyaWN0XCI7dmFyIGU9ZnVuY3Rpb24oYil7dGhpcy5fY29yZT1iLHRoaXMuX2luaXRpYWxpemVkPSExLHRoaXMuX3BhZ2VzPVtdLHRoaXMuX2NvbnRyb2xzPXt9LHRoaXMuX3RlbXBsYXRlcz1bXSx0aGlzLiRlbGVtZW50PXRoaXMuX2NvcmUuJGVsZW1lbnQsdGhpcy5fb3ZlcnJpZGVzPXtuZXh0OnRoaXMuX2NvcmUubmV4dCxwcmV2OnRoaXMuX2NvcmUucHJldix0bzp0aGlzLl9jb3JlLnRvfSx0aGlzLl9oYW5kbGVycz17XCJwcmVwYXJlZC5vd2wuY2Fyb3VzZWxcIjphLnByb3h5KGZ1bmN0aW9uKGIpe2IubmFtZXNwYWNlJiZ0aGlzLl9jb3JlLnNldHRpbmdzLmRvdHNEYXRhJiZ0aGlzLl90ZW1wbGF0ZXMucHVzaCgnPGRpdiBjbGFzcz1cIicrdGhpcy5fY29yZS5zZXR0aW5ncy5kb3RDbGFzcysnXCI+JythKGIuY29udGVudCkuZmluZChcIltkYXRhLWRvdF1cIikuYWRkQmFjayhcIltkYXRhLWRvdF1cIikuYXR0cihcImRhdGEtZG90XCIpK1wiPC9kaXY+XCIpfSx0aGlzKSxcImFkZGVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuZG90c0RhdGEmJnRoaXMuX3RlbXBsYXRlcy5zcGxpY2UoYS5wb3NpdGlvbiwwLHRoaXMuX3RlbXBsYXRlcy5wb3AoKSl9LHRoaXMpLFwicmVtb3ZlLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJnRoaXMuX2NvcmUuc2V0dGluZ3MuZG90c0RhdGEmJnRoaXMuX3RlbXBsYXRlcy5zcGxpY2UoYS5wb3NpdGlvbiwxKX0sdGhpcyksXCJjaGFuZ2VkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYSl7YS5uYW1lc3BhY2UmJlwicG9zaXRpb25cIj09YS5wcm9wZXJ0eS5uYW1lJiZ0aGlzLmRyYXcoKX0sdGhpcyksXCJpbml0aWFsaXplZC5vd2wuY2Fyb3VzZWxcIjphLnByb3h5KGZ1bmN0aW9uKGEpe2EubmFtZXNwYWNlJiYhdGhpcy5faW5pdGlhbGl6ZWQmJih0aGlzLl9jb3JlLnRyaWdnZXIoXCJpbml0aWFsaXplXCIsbnVsbCxcIm5hdmlnYXRpb25cIiksdGhpcy5pbml0aWFsaXplKCksdGhpcy51cGRhdGUoKSx0aGlzLmRyYXcoKSx0aGlzLl9pbml0aWFsaXplZD0hMCx0aGlzLl9jb3JlLnRyaWdnZXIoXCJpbml0aWFsaXplZFwiLG51bGwsXCJuYXZpZ2F0aW9uXCIpKX0sdGhpcyksXCJyZWZyZXNoZWQub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihhKXthLm5hbWVzcGFjZSYmdGhpcy5faW5pdGlhbGl6ZWQmJih0aGlzLl9jb3JlLnRyaWdnZXIoXCJyZWZyZXNoXCIsbnVsbCxcIm5hdmlnYXRpb25cIiksdGhpcy51cGRhdGUoKSx0aGlzLmRyYXcoKSx0aGlzLl9jb3JlLnRyaWdnZXIoXCJyZWZyZXNoZWRcIixudWxsLFwibmF2aWdhdGlvblwiKSl9LHRoaXMpfSx0aGlzLl9jb3JlLm9wdGlvbnM9YS5leHRlbmQoe30sZS5EZWZhdWx0cyx0aGlzLl9jb3JlLm9wdGlvbnMpLHRoaXMuJGVsZW1lbnQub24odGhpcy5faGFuZGxlcnMpfTtlLkRlZmF1bHRzPXtuYXY6ITEsbmF2VGV4dDpbJzxzcGFuIGFyaWEtbGFiZWw9XCJQcmV2aW91c1wiPiYjeDIwMzk7PC9zcGFuPicsJzxzcGFuIGFyaWEtbGFiZWw9XCJOZXh0XCI+JiN4MjAzYTs8L3NwYW4+J10sbmF2U3BlZWQ6ITEsbmF2RWxlbWVudDonYnV0dG9uIHR5cGU9XCJidXR0b25cIiByb2xlPVwicHJlc2VudGF0aW9uXCInLG5hdkNvbnRhaW5lcjohMSxuYXZDb250YWluZXJDbGFzczpcIm93bC1uYXZcIixuYXZDbGFzczpbXCJvd2wtcHJldlwiLFwib3dsLW5leHRcIl0sc2xpZGVCeToxLGRvdENsYXNzOlwib3dsLWRvdFwiLGRvdHNDbGFzczpcIm93bC1kb3RzXCIsZG90czohMCxkb3RzRWFjaDohMSxkb3RzRGF0YTohMSxkb3RzU3BlZWQ6ITEsZG90c0NvbnRhaW5lcjohMX0sZS5wcm90b3R5cGUuaW5pdGlhbGl6ZT1mdW5jdGlvbigpe3ZhciBiLGM9dGhpcy5fY29yZS5zZXR0aW5nczt0aGlzLl9jb250cm9scy4kcmVsYXRpdmU9KGMubmF2Q29udGFpbmVyP2EoYy5uYXZDb250YWluZXIpOmEoXCI8ZGl2PlwiKS5hZGRDbGFzcyhjLm5hdkNvbnRhaW5lckNsYXNzKS5hcHBlbmRUbyh0aGlzLiRlbGVtZW50KSkuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKSx0aGlzLl9jb250cm9scy4kcHJldmlvdXM9YShcIjxcIitjLm5hdkVsZW1lbnQrXCI+XCIpLmFkZENsYXNzKGMubmF2Q2xhc3NbMF0pLmh0bWwoYy5uYXZUZXh0WzBdKS5wcmVwZW5kVG8odGhpcy5fY29udHJvbHMuJHJlbGF0aXZlKS5vbihcImNsaWNrXCIsYS5wcm94eShmdW5jdGlvbihhKXt0aGlzLnByZXYoYy5uYXZTcGVlZCl9LHRoaXMpKSx0aGlzLl9jb250cm9scy4kbmV4dD1hKFwiPFwiK2MubmF2RWxlbWVudCtcIj5cIikuYWRkQ2xhc3MoYy5uYXZDbGFzc1sxXSkuaHRtbChjLm5hdlRleHRbMV0pLmFwcGVuZFRvKHRoaXMuX2NvbnRyb2xzLiRyZWxhdGl2ZSkub24oXCJjbGlja1wiLGEucHJveHkoZnVuY3Rpb24oYSl7dGhpcy5uZXh0KGMubmF2U3BlZWQpfSx0aGlzKSksYy5kb3RzRGF0YXx8KHRoaXMuX3RlbXBsYXRlcz1bYSgnPGJ1dHRvbiByb2xlPVwiYnV0dG9uXCI+JykuYWRkQ2xhc3MoYy5kb3RDbGFzcykuYXBwZW5kKGEoXCI8c3Bhbj5cIikpLnByb3AoXCJvdXRlckhUTUxcIildKSx0aGlzLl9jb250cm9scy4kYWJzb2x1dGU9KGMuZG90c0NvbnRhaW5lcj9hKGMuZG90c0NvbnRhaW5lcik6YShcIjxkaXY+XCIpLmFkZENsYXNzKGMuZG90c0NsYXNzKS5hcHBlbmRUbyh0aGlzLiRlbGVtZW50KSkuYWRkQ2xhc3MoXCJkaXNhYmxlZFwiKSx0aGlzLl9jb250cm9scy4kYWJzb2x1dGUub24oXCJjbGlja1wiLFwiYnV0dG9uXCIsYS5wcm94eShmdW5jdGlvbihiKXt2YXIgZD1hKGIudGFyZ2V0KS5wYXJlbnQoKS5pcyh0aGlzLl9jb250cm9scy4kYWJzb2x1dGUpP2EoYi50YXJnZXQpLmluZGV4KCk6YShiLnRhcmdldCkucGFyZW50KCkuaW5kZXgoKTtiLnByZXZlbnREZWZhdWx0KCksdGhpcy50byhkLGMuZG90c1NwZWVkKX0sdGhpcykpO2ZvcihiIGluIHRoaXMuX292ZXJyaWRlcyl0aGlzLl9jb3JlW2JdPWEucHJveHkodGhpc1tiXSx0aGlzKX0sZS5wcm90b3R5cGUuZGVzdHJveT1mdW5jdGlvbigpe3ZhciBhLGIsYyxkLGU7ZT10aGlzLl9jb3JlLnNldHRpbmdzO2ZvcihhIGluIHRoaXMuX2hhbmRsZXJzKXRoaXMuJGVsZW1lbnQub2ZmKGEsdGhpcy5faGFuZGxlcnNbYV0pO2ZvcihiIGluIHRoaXMuX2NvbnRyb2xzKVwiJHJlbGF0aXZlXCI9PT1iJiZlLm5hdkNvbnRhaW5lcj90aGlzLl9jb250cm9sc1tiXS5odG1sKFwiXCIpOnRoaXMuX2NvbnRyb2xzW2JdLnJlbW92ZSgpO2ZvcihkIGluIHRoaXMub3ZlcmlkZXMpdGhpcy5fY29yZVtkXT10aGlzLl9vdmVycmlkZXNbZF07Zm9yKGMgaW4gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcykpXCJmdW5jdGlvblwiIT10eXBlb2YgdGhpc1tjXSYmKHRoaXNbY109bnVsbCl9LGUucHJvdG90eXBlLnVwZGF0ZT1mdW5jdGlvbigpe3ZhciBhLGIsYyxkPXRoaXMuX2NvcmUuY2xvbmVzKCkubGVuZ3RoLzIsZT1kK3RoaXMuX2NvcmUuaXRlbXMoKS5sZW5ndGgsZj10aGlzLl9jb3JlLm1heGltdW0oITApLGc9dGhpcy5fY29yZS5zZXR0aW5ncyxoPWcuY2VudGVyfHxnLmF1dG9XaWR0aHx8Zy5kb3RzRGF0YT8xOmcuZG90c0VhY2h8fGcuaXRlbXM7aWYoXCJwYWdlXCIhPT1nLnNsaWRlQnkmJihnLnNsaWRlQnk9TWF0aC5taW4oZy5zbGlkZUJ5LGcuaXRlbXMpKSxnLmRvdHN8fFwicGFnZVwiPT1nLnNsaWRlQnkpZm9yKHRoaXMuX3BhZ2VzPVtdLGE9ZCxiPTAsYz0wO2E8ZTthKyspe2lmKGI+PWh8fDA9PT1iKXtpZih0aGlzLl9wYWdlcy5wdXNoKHtzdGFydDpNYXRoLm1pbihmLGEtZCksZW5kOmEtZCtoLTF9KSxNYXRoLm1pbihmLGEtZCk9PT1mKWJyZWFrO2I9MCwrK2N9Yis9dGhpcy5fY29yZS5tZXJnZXJzKHRoaXMuX2NvcmUucmVsYXRpdmUoYSkpfX0sZS5wcm90b3R5cGUuZHJhdz1mdW5jdGlvbigpe3ZhciBiLGM9dGhpcy5fY29yZS5zZXR0aW5ncyxkPXRoaXMuX2NvcmUuaXRlbXMoKS5sZW5ndGg8PWMuaXRlbXMsZT10aGlzLl9jb3JlLnJlbGF0aXZlKHRoaXMuX2NvcmUuY3VycmVudCgpKSxmPWMubG9vcHx8Yy5yZXdpbmQ7dGhpcy5fY29udHJvbHMuJHJlbGF0aXZlLnRvZ2dsZUNsYXNzKFwiZGlzYWJsZWRcIiwhYy5uYXZ8fGQpLGMubmF2JiYodGhpcy5fY29udHJvbHMuJHByZXZpb3VzLnRvZ2dsZUNsYXNzKFwiZGlzYWJsZWRcIiwhZiYmZTw9dGhpcy5fY29yZS5taW5pbXVtKCEwKSksdGhpcy5fY29udHJvbHMuJG5leHQudG9nZ2xlQ2xhc3MoXCJkaXNhYmxlZFwiLCFmJiZlPj10aGlzLl9jb3JlLm1heGltdW0oITApKSksdGhpcy5fY29udHJvbHMuJGFic29sdXRlLnRvZ2dsZUNsYXNzKFwiZGlzYWJsZWRcIiwhYy5kb3RzfHxkKSxjLmRvdHMmJihiPXRoaXMuX3BhZ2VzLmxlbmd0aC10aGlzLl9jb250cm9scy4kYWJzb2x1dGUuY2hpbGRyZW4oKS5sZW5ndGgsYy5kb3RzRGF0YSYmMCE9PWI/dGhpcy5fY29udHJvbHMuJGFic29sdXRlLmh0bWwodGhpcy5fdGVtcGxhdGVzLmpvaW4oXCJcIikpOmI+MD90aGlzLl9jb250cm9scy4kYWJzb2x1dGUuYXBwZW5kKG5ldyBBcnJheShiKzEpLmpvaW4odGhpcy5fdGVtcGxhdGVzWzBdKSk6YjwwJiZ0aGlzLl9jb250cm9scy4kYWJzb2x1dGUuY2hpbGRyZW4oKS5zbGljZShiKS5yZW1vdmUoKSx0aGlzLl9jb250cm9scy4kYWJzb2x1dGUuZmluZChcIi5hY3RpdmVcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIiksdGhpcy5fY29udHJvbHMuJGFic29sdXRlLmNoaWxkcmVuKCkuZXEoYS5pbkFycmF5KHRoaXMuY3VycmVudCgpLHRoaXMuX3BhZ2VzKSkuYWRkQ2xhc3MoXCJhY3RpdmVcIikpfSxlLnByb3RvdHlwZS5vblRyaWdnZXI9ZnVuY3Rpb24oYil7dmFyIGM9dGhpcy5fY29yZS5zZXR0aW5ncztiLnBhZ2U9e2luZGV4OmEuaW5BcnJheSh0aGlzLmN1cnJlbnQoKSx0aGlzLl9wYWdlcyksY291bnQ6dGhpcy5fcGFnZXMubGVuZ3RoLHNpemU6YyYmKGMuY2VudGVyfHxjLmF1dG9XaWR0aHx8Yy5kb3RzRGF0YT8xOmMuZG90c0VhY2h8fGMuaXRlbXMpfX0sZS5wcm90b3R5cGUuY3VycmVudD1mdW5jdGlvbigpe3ZhciBiPXRoaXMuX2NvcmUucmVsYXRpdmUodGhpcy5fY29yZS5jdXJyZW50KCkpO3JldHVybiBhLmdyZXAodGhpcy5fcGFnZXMsYS5wcm94eShmdW5jdGlvbihhLGMpe3JldHVybiBhLnN0YXJ0PD1iJiZhLmVuZD49Yn0sdGhpcykpLnBvcCgpfSxlLnByb3RvdHlwZS5nZXRQb3NpdGlvbj1mdW5jdGlvbihiKXt2YXIgYyxkLGU9dGhpcy5fY29yZS5zZXR0aW5ncztyZXR1cm5cInBhZ2VcIj09ZS5zbGlkZUJ5PyhjPWEuaW5BcnJheSh0aGlzLmN1cnJlbnQoKSx0aGlzLl9wYWdlcyksZD10aGlzLl9wYWdlcy5sZW5ndGgsYj8rK2M6LS1jLGM9dGhpcy5fcGFnZXNbKGMlZCtkKSVkXS5zdGFydCk6KGM9dGhpcy5fY29yZS5yZWxhdGl2ZSh0aGlzLl9jb3JlLmN1cnJlbnQoKSksZD10aGlzLl9jb3JlLml0ZW1zKCkubGVuZ3RoLGI/Yys9ZS5zbGlkZUJ5OmMtPWUuc2xpZGVCeSksY30sZS5wcm90b3R5cGUubmV4dD1mdW5jdGlvbihiKXthLnByb3h5KHRoaXMuX292ZXJyaWRlcy50byx0aGlzLl9jb3JlKSh0aGlzLmdldFBvc2l0aW9uKCEwKSxiKX0sZS5wcm90b3R5cGUucHJldj1mdW5jdGlvbihiKXthLnByb3h5KHRoaXMuX292ZXJyaWRlcy50byx0aGlzLl9jb3JlKSh0aGlzLmdldFBvc2l0aW9uKCExKSxiKX0sZS5wcm90b3R5cGUudG89ZnVuY3Rpb24oYixjLGQpe3ZhciBlOyFkJiZ0aGlzLl9wYWdlcy5sZW5ndGg/KGU9dGhpcy5fcGFnZXMubGVuZ3RoLGEucHJveHkodGhpcy5fb3ZlcnJpZGVzLnRvLHRoaXMuX2NvcmUpKHRoaXMuX3BhZ2VzWyhiJWUrZSklZV0uc3RhcnQsYykpOmEucHJveHkodGhpcy5fb3ZlcnJpZGVzLnRvLHRoaXMuX2NvcmUpKGIsYyl9LGEuZm4ub3dsQ2Fyb3VzZWwuQ29uc3RydWN0b3IuUGx1Z2lucy5OYXZpZ2F0aW9uPWV9KHdpbmRvdy5aZXB0b3x8d2luZG93LmpRdWVyeSx3aW5kb3csZG9jdW1lbnQpLGZ1bmN0aW9uKGEsYixjLGQpe1widXNlIHN0cmljdFwiO3ZhciBlPWZ1bmN0aW9uKGMpe3RoaXMuX2NvcmU9Yyx0aGlzLl9oYXNoZXM9e30sdGhpcy4kZWxlbWVudD10aGlzLl9jb3JlLiRlbGVtZW50LHRoaXMuX2hhbmRsZXJzPXtcImluaXRpYWxpemVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYyl7Yy5uYW1lc3BhY2UmJlwiVVJMSGFzaFwiPT09dGhpcy5fY29yZS5zZXR0aW5ncy5zdGFydFBvc2l0aW9uJiZhKGIpLnRyaWdnZXIoXCJoYXNoY2hhbmdlLm93bC5uYXZpZ2F0aW9uXCIpfSx0aGlzKSxcInByZXBhcmVkLm93bC5jYXJvdXNlbFwiOmEucHJveHkoZnVuY3Rpb24oYil7aWYoYi5uYW1lc3BhY2Upe3ZhciBjPWEoYi5jb250ZW50KS5maW5kKFwiW2RhdGEtaGFzaF1cIikuYWRkQmFjayhcIltkYXRhLWhhc2hdXCIpLmF0dHIoXCJkYXRhLWhhc2hcIik7aWYoIWMpcmV0dXJuO3RoaXMuX2hhc2hlc1tjXT1iLmNvbnRlbnR9fSx0aGlzKSxcImNoYW5nZWQub3dsLmNhcm91c2VsXCI6YS5wcm94eShmdW5jdGlvbihjKXtpZihjLm5hbWVzcGFjZSYmXCJwb3NpdGlvblwiPT09Yy5wcm9wZXJ0eS5uYW1lKXt2YXIgZD10aGlzLl9jb3JlLml0ZW1zKHRoaXMuX2NvcmUucmVsYXRpdmUodGhpcy5fY29yZS5jdXJyZW50KCkpKSxlPWEubWFwKHRoaXMuX2hhc2hlcyxmdW5jdGlvbihhLGIpe3JldHVybiBhPT09ZD9iOm51bGx9KS5qb2luKCk7aWYoIWV8fGIubG9jYXRpb24uaGFzaC5zbGljZSgxKT09PWUpcmV0dXJuO2IubG9jYXRpb24uaGFzaD1lfX0sdGhpcyl9LHRoaXMuX2NvcmUub3B0aW9ucz1hLmV4dGVuZCh7fSxlLkRlZmF1bHRzLHRoaXMuX2NvcmUub3B0aW9ucyksdGhpcy4kZWxlbWVudC5vbih0aGlzLl9oYW5kbGVycyksYShiKS5vbihcImhhc2hjaGFuZ2Uub3dsLm5hdmlnYXRpb25cIixhLnByb3h5KGZ1bmN0aW9uKGEpe3ZhciBjPWIubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoMSksZT10aGlzLl9jb3JlLiRzdGFnZS5jaGlsZHJlbigpLGY9dGhpcy5faGFzaGVzW2NdJiZlLmluZGV4KHRoaXMuX2hhc2hlc1tjXSk7ZiE9PWQmJmYhPT10aGlzLl9jb3JlLmN1cnJlbnQoKSYmdGhpcy5fY29yZS50byh0aGlzLl9jb3JlLnJlbGF0aXZlKGYpLCExLCEwKX0sdGhpcykpfTtlLkRlZmF1bHRzPXtVUkxoYXNoTGlzdGVuZXI6ITF9LGUucHJvdG90eXBlLmRlc3Ryb3k9ZnVuY3Rpb24oKXt2YXIgYyxkO2EoYikub2ZmKFwiaGFzaGNoYW5nZS5vd2wubmF2aWdhdGlvblwiKTtmb3IoYyBpbiB0aGlzLl9oYW5kbGVycyl0aGlzLl9jb3JlLiRlbGVtZW50Lm9mZihjLHRoaXMuX2hhbmRsZXJzW2NdKTtmb3IoZCBpbiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzKSlcImZ1bmN0aW9uXCIhPXR5cGVvZiB0aGlzW2RdJiYodGhpc1tkXT1udWxsKX0sYS5mbi5vd2xDYXJvdXNlbC5Db25zdHJ1Y3Rvci5QbHVnaW5zLkhhc2g9ZX0od2luZG93LlplcHRvfHx3aW5kb3cualF1ZXJ5LHdpbmRvdyxkb2N1bWVudCksZnVuY3Rpb24oYSxiLGMsZCl7ZnVuY3Rpb24gZShiLGMpe3ZhciBlPSExLGY9Yi5jaGFyQXQoMCkudG9VcHBlckNhc2UoKStiLnNsaWNlKDEpO3JldHVybiBhLmVhY2goKGIrXCIgXCIraC5qb2luKGYrXCIgXCIpK2YpLnNwbGl0KFwiIFwiKSxmdW5jdGlvbihhLGIpe2lmKGdbYl0hPT1kKXJldHVybiBlPSFjfHxiLCExfSksZX1mdW5jdGlvbiBmKGEpe3JldHVybiBlKGEsITApfXZhciBnPWEoXCI8c3VwcG9ydD5cIikuZ2V0KDApLnN0eWxlLGg9XCJXZWJraXQgTW96IE8gbXNcIi5zcGxpdChcIiBcIiksaT17dHJhbnNpdGlvbjp7ZW5kOntXZWJraXRUcmFuc2l0aW9uOlwid2Via2l0VHJhbnNpdGlvbkVuZFwiLE1velRyYW5zaXRpb246XCJ0cmFuc2l0aW9uZW5kXCIsT1RyYW5zaXRpb246XCJvVHJhbnNpdGlvbkVuZFwiLHRyYW5zaXRpb246XCJ0cmFuc2l0aW9uZW5kXCJ9fSxhbmltYXRpb246e2VuZDp7V2Via2l0QW5pbWF0aW9uOlwid2Via2l0QW5pbWF0aW9uRW5kXCIsTW96QW5pbWF0aW9uOlwiYW5pbWF0aW9uZW5kXCIsT0FuaW1hdGlvbjpcIm9BbmltYXRpb25FbmRcIixhbmltYXRpb246XCJhbmltYXRpb25lbmRcIn19fSxqPXtjc3N0cmFuc2Zvcm1zOmZ1bmN0aW9uKCl7cmV0dXJuISFlKFwidHJhbnNmb3JtXCIpfSxjc3N0cmFuc2Zvcm1zM2Q6ZnVuY3Rpb24oKXtyZXR1cm4hIWUoXCJwZXJzcGVjdGl2ZVwiKX0sY3NzdHJhbnNpdGlvbnM6ZnVuY3Rpb24oKXtyZXR1cm4hIWUoXCJ0cmFuc2l0aW9uXCIpfSxjc3NhbmltYXRpb25zOmZ1bmN0aW9uKCl7cmV0dXJuISFlKFwiYW5pbWF0aW9uXCIpfX07ai5jc3N0cmFuc2l0aW9ucygpJiYoYS5zdXBwb3J0LnRyYW5zaXRpb249bmV3IFN0cmluZyhmKFwidHJhbnNpdGlvblwiKSksYS5zdXBwb3J0LnRyYW5zaXRpb24uZW5kPWkudHJhbnNpdGlvbi5lbmRbYS5zdXBwb3J0LnRyYW5zaXRpb25dKSxqLmNzc2FuaW1hdGlvbnMoKSYmKGEuc3VwcG9ydC5hbmltYXRpb249bmV3IFN0cmluZyhmKFwiYW5pbWF0aW9uXCIpKSxhLnN1cHBvcnQuYW5pbWF0aW9uLmVuZD1pLmFuaW1hdGlvbi5lbmRbYS5zdXBwb3J0LmFuaW1hdGlvbl0pLGouY3NzdHJhbnNmb3JtcygpJiYoYS5zdXBwb3J0LnRyYW5zZm9ybT1uZXcgU3RyaW5nKGYoXCJ0cmFuc2Zvcm1cIikpLGEuc3VwcG9ydC50cmFuc2Zvcm0zZD1qLmNzc3RyYW5zZm9ybXMzZCgpKX0od2luZG93LlplcHRvfHx3aW5kb3cualF1ZXJ5LHdpbmRvdyxkb2N1bWVudCk7XG4vKiBnbG9iYWwgZm9sbG93U29jaWFsTWVkaWEgbWVudURyb3Bkb3duIGxvY2FsU3RvcmFnZSAqL1xuXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpe1xuICAkKCcub3dsLWNhcm91c2VsJykub3dsQ2Fyb3VzZWwoe1xuICAgICAgbG9vcDp0cnVlLFxuICAgICAgbmF2OmZhbHNlLFxuICAgICAgaXRlbXM6MSxcbiAgICAgIGF1dG9IZWlnaHQ6dHJ1ZSxcbiAgICAgIGF1dG9wbGF5OnRydWUsXG4gICAgICBhbmltYXRlT3V0OiAnZmFkZU91dCcsXG4gICAgICByZXNwb25zaXZlIDoge1xuICAgICAgICAwOntcbiAgICAgICAgICBhdXRvSGVpZ2h0OnRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIDk5OSA6IHtcbiAgICAgICAgICBhdXRvSGVpZ2h0OmZhbHNlLFxuICAgICAgICB9XG4gICAgfVxuICB9KVxuICB2YXIgb3dsID0gJCgnLm93bC1jYXJvdXNlbCcpO1xuICBvd2wub3dsQ2Fyb3VzZWwoKTtcbiAgLy8gR28gdG8gdGhlIG5leHQgaXRlbVxuICAkKCcuY3VzdG9tTmV4dEJ0bicpLmNsaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgb3dsLnRyaWdnZXIoJ25leHQub3dsLmNhcm91c2VsJyk7XG4gIH0pXG4gIC8vIEdvIHRvIHRoZSBwcmV2aW91cyBpdGVtXG4gICQoJy5jdXN0b21QcmV2QnRuJykuY2xpY2soZnVuY3Rpb24oKSB7XG4gICAgICAvLyBXaXRoIG9wdGlvbmFsIHNwZWVkIHBhcmFtZXRlclxuICAgICAgLy8gUGFyYW1ldGVycyBoYXMgdG8gYmUgaW4gc3F1YXJlIGJyYWNrZXQgJ1tdJ1xuICAgICAgb3dsLnRyaWdnZXIoJ3ByZXYub3dsLmNhcm91c2VsJywgWzMwMF0pO1xuICB9KVxuXG59KTtcbi8vIGxpYlxuaW1wb3J0ICdsYXp5c2l6ZXMnXG5cbi8vIGltcG9ydCBsb2FkU2NyaXB0IGZyb20gJy4vdXRpbC9sb2FkLXNjcmlwdCdcbmltcG9ydCB1cmxSZWdleHAgZnJvbSAnLi91dGlsL3VybC1yZWd1bGFyLWV4cHJlc3Npb24nXG5pbXBvcnQgZG9jU2VsZWN0b3JBbGwgZnJvbSAnLi91dGlsL2RvY3VtZW50LXF1ZXJ5LXNlbGVjdG9yLWFsbCdcblxuY29uc3Qgc2ltcGx5U2V0dXAgPSAoKSA9PiB7XG4gIGNvbnN0IHJvb3RFbCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICBjb25zdCBkb2N1bWVudEJvZHkgPSBkb2N1bWVudC5ib2R5XG5cbiAgLyogTWVudSBEcm9wRG93blxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gIGNvbnN0IGRyb3BEb3duTWVudSA9ICgpID0+IHtcbiAgICAvLyBDaGVja2luZyBpZiB0aGUgdmFyaWFibGUgZXhpc3RzIGFuZCBpZiBpdCBpcyBhbiBvYmplY3RcbiAgICBpZiAodHlwZW9mIG1lbnVEcm9wZG93biAhPT0gJ29iamVjdCcgfHwgbWVudURyb3Bkb3duID09PSBudWxsKSByZXR1cm5cblxuICAgIC8vIGNoZWNrIGlmIHRoZSBib3ggZm9yIHRoZSBtZW51IGV4aXN0c1xuICAgIGNvbnN0ICRkcm9wZG93bk1lbnUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuanMtZHJvcGRvd24tbWVudScpXG4gICAgaWYgKCEkZHJvcGRvd25NZW51KSByZXR1cm5cblxuICAgIE9iamVjdC5lbnRyaWVzKG1lbnVEcm9wZG93bikuZm9yRWFjaCgoW25hbWUsIHVybF0pID0+IHtcbiAgICAgIGlmIChuYW1lICE9PSAnc3RyaW5nJyAmJiAhdXJsUmVnZXhwKHVybCkpIHJldHVyblxuXG4gICAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpXG4gICAgICBsaW5rLmhyZWYgPSB1cmxcbiAgICAgIGxpbmsuY2xhc3NMaXN0ID0gJ2Ryb3Bkb3duLWl0ZW0gYmxvY2sgcHktMiBsZWFkaW5nLXRpZ2h0IHB4LTUgaG92ZXI6dGV4dC1wcmltYXJ5J1xuICAgICAgbGluay5pbm5lclRleHQgPSBuYW1lXG5cbiAgICAgICRkcm9wZG93bk1lbnUuYXBwZW5kQ2hpbGQobGluaylcbiAgICB9KVxuICB9XG5cbiAgZHJvcERvd25NZW51KClcblxuICAvKiBTb2NpYWwgTWVkaWFcbiAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuICBjb25zdCBzb2NpYWxNZWRpYSA9ICgpID0+IHtcbiAgICAvLyBDaGVja2luZyBpZiB0aGUgdmFyaWFibGUgZXhpc3RzIGFuZCBpZiBpdCBpcyBhbiBvYmplY3RcbiAgICBpZiAodHlwZW9mIGZvbGxvd1NvY2lhbE1lZGlhICE9PSAnb2JqZWN0JyB8fCBmb2xsb3dTb2NpYWxNZWRpYSA9PT0gbnVsbCkgcmV0dXJuXG5cbiAgICAvLyBjaGVjayBpZiB0aGUgYm94IGZvciB0aGUgbWVudSBleGlzdHNcbiAgICBjb25zdCAkc29jaWFsTWVkaWEgPSBkb2NTZWxlY3RvckFsbCgnLmpzLXNvY2lhbC1tZWRpYScpXG4gICAgaWYgKCEkc29jaWFsTWVkaWEubGVuZ3RoKSByZXR1cm5cblxuICAgIGNvbnN0IGxpbmtFbGVtZW50ID0gZWxlbWVudCA9PiB7XG4gICAgICBPYmplY3QuZW50cmllcyhmb2xsb3dTb2NpYWxNZWRpYSkuZm9yRWFjaCgoW25hbWUsIHVybFRpdGxlXSkgPT4ge1xuICAgICAgICBjb25zdCB1cmwgPSB1cmxUaXRsZVswXVxuXG4gICAgICAgIC8vIFRoZSB1cmwgaXMgYmVpbmcgdmFsaWRhdGVkIGlmIGl0IGlzIGZhbHNlIGl0IHJldHVybnNcbiAgICAgICAgaWYgKCF1cmxSZWdleHAodXJsKSkgcmV0dXJuXG5cbiAgICAgICAgY29uc3QgbGluayA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKVxuICAgICAgICBsaW5rLmhyZWYgPSB1cmxcbiAgICAgICAgbGluay50aXRsZSA9IHVybFRpdGxlWzFdXG4gICAgICAgIGxpbmsuY2xhc3NMaXN0ID0gJ3AtMiBpbmxpbmUtYmxvY2sgaG92ZXI6b3BhY2l0eS03MCdcbiAgICAgICAgbGluay50YXJnZXQgPSAnX2JsYW5rJ1xuICAgICAgICBsaW5rLnJlbCA9ICdub29wZW5lciBub3JlZmVycmVyJ1xuICAgICAgICBsaW5rLmlubmVySFRNTCA9IGA8c3ZnIGNsYXNzPVwiaWNvblwiPjx1c2UgeGxpbms6aHJlZj1cIiNpY29uLSR7bmFtZX1cIj48L3VzZT48L3N2Zz5gXG5cbiAgICAgICAgZWxlbWVudC5hcHBlbmRDaGlsZChsaW5rKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICAkc29jaWFsTWVkaWEuZm9yRWFjaChsaW5rRWxlbWVudClcbiAgfVxuXG4gIHNvY2lhbE1lZGlhKClcblxuICAvKiAgVG9nZ2xlIG1vZGFsXG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgLypjb25zdCBzaW1wbHlNb2RhbCA9ICgpID0+IHtcbiAgICBjb25zdCAkbW9kYWxzID0gZG9jU2VsZWN0b3JBbGwoJy5qcy1tb2RhbCcpXG4gICAgY29uc3QgJG1vZGFsQnV0dG9ucyA9IGRvY1NlbGVjdG9yQWxsKCcuanMtbW9kYWwtYnV0dG9uJylcbiAgICBjb25zdCAkbW9kYWxDbG9zZXMgPSBkb2NTZWxlY3RvckFsbCgnLmpzLW1vZGFsLWNsb3NlJylcblxuICAgIC8vIE1vZGFsIENsaWNrIE9wZW5cbiAgICBpZiAoISRtb2RhbEJ1dHRvbnMubGVuZ3RoKSByZXR1cm5cbiAgICAkbW9kYWxCdXR0b25zLmZvckVhY2goJGVsID0+ICRlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IG9wZW5Nb2RhbCgkZWwuZGF0YXNldC50YXJnZXQpKSlcblxuICAgIC8vIE1vZGFsIENsaWNrIENsb3NlXG4gICAgaWYgKCEkbW9kYWxDbG9zZXMubGVuZ3RoKSByZXR1cm5cbiAgICAkbW9kYWxDbG9zZXMuZm9yRWFjaChlbCA9PiBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IGNsb3NlTW9kYWxzKCkpKVxuXG4gICAgY29uc3Qgb3Blbk1vZGFsID0gdGFyZ2V0ID0+IHtcbiAgICAgIGRvY3VtZW50Qm9keS5jbGFzc0xpc3QucmVtb3ZlKCdoYXMtbWVudScpXG4gICAgICBjb25zdCAkdGFyZ2V0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQodGFyZ2V0KVxuICAgICAgcm9vdEVsLmNsYXNzTGlzdC5hZGQoJ292ZXJmbG93LWhpZGRlbicpXG4gICAgICAkdGFyZ2V0LmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpXG4gICAgfVxuXG4gICAgY29uc3QgY2xvc2VNb2RhbHMgPSAoKSA9PiB7XG4gICAgICByb290RWwuY2xhc3NMaXN0LnJlbW92ZSgnb3ZlcmZsb3ctaGlkZGVuJylcbiAgICAgICRtb2RhbHMuZm9yRWFjaCgkZWwgPT4gJGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpKVxuICAgIH1cblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGNvbnN0IGUgPSBldmVudCB8fCB3aW5kb3cuZXZlbnRcbiAgICAgIGlmIChlLmtleUNvZGUgPT09IDI3KSB7XG4gICAgICAgIGNsb3NlTW9kYWxzKClcbiAgICAgICAgLy8gY2xvc2VEcm9wZG93bnMoKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBzaW1wbHlNb2RhbCgpXG4gICovXG5cbiAgLyogSGVhZGVyIFRyYW5zcGFyZW5jeVxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gIGNvbnN0IGhlYWRlclRyYW5zcGFyZW5jeSA9ICgpID0+IHtcbiAgICBjb25zdCBoYXNDb3ZlciA9IGRvY3VtZW50Qm9keS5jbG9zZXN0KCcuaGFzLWNvdmVyJylcbiAgICBjb25zdCAkanNIZWFkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuanMtaGVhZGVyJylcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCAoKSA9PiB7XG4gICAgICBjb25zdCBsYXN0U2Nyb2xsWSA9IHdpbmRvdy5zY3JvbGxZXG5cbiAgICAgIGlmIChsYXN0U2Nyb2xsWSA+IDUpIHtcbiAgICAgICAgJGpzSGVhZGVyLmNsYXNzTGlzdC5hZGQoJ3NoYWRvdy1oZWFkZXInLCAnaGVhZGVyLWJnJylcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICRqc0hlYWRlci5jbGFzc0xpc3QucmVtb3ZlKCdzaGFkb3ctaGVhZGVyJywgJ2hlYWRlci1iZycpXG4gICAgICB9XG5cbiAgICAgIGlmICghaGFzQ292ZXIpIHJldHVyblxuXG4gICAgICBsYXN0U2Nyb2xsWSA+PSAyMCA/IGRvY3VtZW50Qm9keS5jbGFzc0xpc3QucmVtb3ZlKCdpcy1oZWFkLXRyYW5zcGFyZW50JykgOiBkb2N1bWVudEJvZHkuY2xhc3NMaXN0LmFkZCgnaXMtaGVhZC10cmFuc3BhcmVudCcpXG4gICAgfSwgeyBwYXNzaXZlOiB0cnVlIH0pXG4gIH1cblxuICBoZWFkZXJUcmFuc3BhcmVuY3koKVxuXG4gIC8qIERhcmsgTW9kZVxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gIGNvbnN0IGRhcmtNb2RlID0gKCkgPT4ge1xuICAgIGNvbnN0ICR0b2dnbGVEYXJrTW9kZSA9IGRvY1NlbGVjdG9yQWxsKCcuanMtZGFyay1tb2RlJylcblxuICAgIGlmICghJHRvZ2dsZURhcmtNb2RlLmxlbmd0aCkgcmV0dXJuXG5cbiAgICAkdG9nZ2xlRGFya01vZGUuZm9yRWFjaChpdGVtID0+IGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgICAgaWYgKCFyb290RWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYXJrJykpIHtcbiAgICAgICAgcm9vdEVsLmNsYXNzTGlzdC5hZGQoJ2RhcmsnKVxuICAgICAgICBsb2NhbFN0b3JhZ2UudGhlbWUgPSAnZGFyaydcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJvb3RFbC5jbGFzc0xpc3QucmVtb3ZlKCdkYXJrJylcbiAgICAgICAgbG9jYWxTdG9yYWdlLnRoZW1lID0gJ2xpZ2h0J1xuICAgICAgfVxuICAgIH0pKVxuICB9XG5cbiAgZGFya01vZGUoKVxuXG4gIC8qIERyb3BEb3duIFRvZ2dsZVxuICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gIGNvbnN0IGRyb3BEb3duTWVudVRvZ2dsZSA9ICgpID0+IHtcbiAgICBjb25zdCBkcm9wZG93bnMgPSBkb2NTZWxlY3RvckFsbCgnLmRyb3Bkb3duOm5vdCguaXMtaG92ZXJhYmxlKScpXG5cbiAgICBpZiAoIWRyb3Bkb3ducy5sZW5ndGgpIHJldHVyblxuXG4gICAgZHJvcGRvd25zLmZvckVhY2goZnVuY3Rpb24gKGVsKSB7XG4gICAgICBlbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKVxuICAgICAgICBlbC5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnKVxuICAgICAgICBkb2N1bWVudEJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnaGFzLW1lbnUnKVxuICAgICAgfSlcbiAgICB9KVxuXG4gICAgY29uc3QgY2xvc2VEcm9wZG93bnMgPSAoKSA9PiBkcm9wZG93bnMuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdGl2ZScpXG4gICAgfSlcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgY2xvc2VEcm9wZG93bnMpXG4gIH1cblxuICBkcm9wRG93bk1lbnVUb2dnbGUoKVxuXG4gIC8qIFRvZ2dsZSBNZW51XG4gIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmpzLW1lbnUtdG9nZ2xlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGRvY3VtZW50Qm9keS5jbGFzc0xpc3QudG9nZ2xlKCdoYXMtbWVudScpXG4gIH0pXG59XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBzaW1wbHlTZXR1cClcblxuIiwiZXhwb3J0IGRlZmF1bHQgKHNlbGVjdG9yLCBwYXJlbnQgPSBkb2N1bWVudCkgPT4gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwocGFyZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpLCAwKVxuIiwiZXhwb3J0IGRlZmF1bHQgdXJsID0+IC9eKGh0dHBzPzpcXC9cXC8pPyhbXFxkYS16XFwuLV0rKVxcLihbYS16XFwuXXsyLDZ9KShbXFwvXFx3IFxcK1xcLi1dKikqXFwvPyQvLnRlc3QodXJsKSAvL2VzbGludC1kaXNhYmxlLWxpbmVcbiJdfQ==

//# sourceMappingURL=map/main.js.map
