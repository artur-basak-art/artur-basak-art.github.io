
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const isBrowser = typeof window !== 'undefined';

    const href = writable(isBrowser ? window.location.href : 'https://arturbasak.art');

    const URL = isBrowser ? window.URL : require('url').URL;

    if (isBrowser) {
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const updateHref = () => href.set(window.location.href);

        history.pushState = function () {
            originalPushState.apply(this, arguments);
            updateHref();
        };

        history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            updateHref();
        };

        window.addEventListener('popstate', updateHref);
        window.addEventListener('hashchange', updateHref);
    }

    var url = {
        subscribe: derived(href, ($href) => new URL($href)).subscribe,
        ssrSet: (urlHref) => href.set(urlHref),
    };

    /* src/components/Header.svelte generated by Svelte v3.38.2 */
    const file$5 = "src/components/Header.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (23:12) {#each links as link}
    function create_each_block$1(ctx) {
    	let li;
    	let a;
    	let t0_value = /*link*/ ctx[2].name + "";
    	let t0;
    	let a_aria_current_value;
    	let a_href_value;
    	let t1;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "aria-current", a_aria_current_value = /*$url*/ ctx[1].hash === /*link*/ ctx[2].href || !/*$url*/ ctx[1].hash && /*link*/ ctx[2].href === "#/");
    			attr_dev(a, "href", a_href_value = /*link*/ ctx[2].href);
    			attr_dev(a, "class", "svelte-1hmxyvk");
    			add_location(a, file$5, 24, 20, 485);
    			attr_dev(li, "class", "svelte-1hmxyvk");
    			add_location(li, file$5, 23, 16, 460);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*links*/ 1 && t0_value !== (t0_value = /*link*/ ctx[2].name + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*$url, links*/ 3 && a_aria_current_value !== (a_aria_current_value = /*$url*/ ctx[1].hash === /*link*/ ctx[2].href || !/*$url*/ ctx[1].hash && /*link*/ ctx[2].href === "#/")) {
    				attr_dev(a, "aria-current", a_aria_current_value);
    			}

    			if (dirty & /*links*/ 1 && a_href_value !== (a_href_value = /*link*/ ctx[2].href)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(23:12) {#each links as link}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let header;
    	let img;
    	let img_src_value;
    	let t;
    	let nav;
    	let ul;
    	let each_value = /*links*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			header = element("header");
    			img = element("img");
    			t = space();
    			nav = element("nav");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (img.src !== (img_src_value = "/assets/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Artur Basak. Art Gallery");
    			attr_dev(img, "class", "svelte-1hmxyvk");
    			add_location(img, file$5, 19, 4, 327);
    			attr_dev(ul, "class", "svelte-1hmxyvk");
    			add_location(ul, file$5, 21, 8, 405);
    			attr_dev(nav, "class", "svelte-1hmxyvk");
    			add_location(nav, file$5, 20, 4, 391);
    			attr_dev(header, "class", "svelte-1hmxyvk");
    			add_location(header, file$5, 18, 0, 314);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, img);
    			append_dev(header, t);
    			append_dev(header, nav);
    			append_dev(nav, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$url, links*/ 3) {
    				each_value = /*links*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let links;
    	let $url;
    	validate_store(url, "url");
    	component_subscribe($$self, url, $$value => $$invalidate(1, $url = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ url, links, $url });

    	$$self.$inject_state = $$props => {
    		if ("links" in $$props) $$invalidate(0, links = $$props.links);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$invalidate(0, links = [
    		{ name: "PAINTINGS", href: "#/" },
    		{ name: "CONTACTS", href: "#/contacts" },
    		{ name: "ABOUT", href: "#/about" }
    	]);

    	return [links, $url];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Footer.svelte generated by Svelte v3.38.2 */

    const file$4 = "src/components/Footer.svelte";

    function create_fragment$4(ctx) {
    	let footer;
    	let p;
    	let t0;
    	let br;
    	let t1;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			p = element("p");
    			t0 = text("All images copyright Artur Basak. ");
    			br = element("br");
    			t1 = text(" All rights reserved.");
    			add_location(br, file$4, 2, 41, 51);
    			add_location(p, file$4, 2, 4, 14);
    			attr_dev(footer, "class", "svelte-qcw4qc");
    			add_location(footer, file$4, 1, 0, 1);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p);
    			append_dev(p, t0);
    			append_dev(p, br);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Gallery.svelte generated by Svelte v3.38.2 */

    const file$3 = "src/components/Gallery.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (6:4) {#each paintings as painting}
    function create_each_block(ctx) {
    	let figure;
    	let a;
    	let picture;
    	let img;
    	let img_src_value;
    	let a_href_value;
    	let t0;
    	let figcaption;
    	let span;
    	let t1;
    	let t2_value = /*painting*/ ctx[1].title + "";
    	let t2;
    	let t3;
    	let t4;
    	let t5_value = /*painting*/ ctx[1].title_eng + "";
    	let t5;
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			figure = element("figure");
    			a = element("a");
    			picture = element("picture");
    			img = element("img");
    			t0 = space();
    			figcaption = element("figcaption");
    			span = element("span");
    			t1 = text("\"");
    			t2 = text(t2_value);
    			t3 = text("\"");
    			t4 = text(" / \"");
    			t5 = text(t5_value);
    			t6 = text("\"");
    			t7 = space();
    			if (img.src !== (img_src_value = "./assets/paintings/" + /*painting*/ ctx[1].imgUrl)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "decoding", "async");
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "alt", "");
    			attr_dev(img, "class", "svelte-7g8xt6");
    			add_location(img, file$3, 9, 20, 267);
    			attr_dev(picture, "class", "svelte-7g8xt6");
    			add_location(picture, file$3, 8, 16, 237);
    			attr_dev(a, "class", "thing svelte-7g8xt6");
    			attr_dev(a, "href", a_href_value = "./assets/paintings/" + /*painting*/ ctx[1].imgUrl);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$3, 7, 12, 143);
    			attr_dev(span, "lang", "be");
    			add_location(span, file$3, 12, 24, 423);
    			attr_dev(figcaption, "class", "svelte-7g8xt6");
    			add_location(figcaption, file$3, 12, 12, 411);
    			attr_dev(figure, "class", "svelte-7g8xt6");
    			add_location(figure, file$3, 6, 8, 122);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, figure, anchor);
    			append_dev(figure, a);
    			append_dev(a, picture);
    			append_dev(picture, img);
    			append_dev(figure, t0);
    			append_dev(figure, figcaption);
    			append_dev(figcaption, span);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(figcaption, t4);
    			append_dev(figcaption, t5);
    			append_dev(figcaption, t6);
    			append_dev(figure, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*paintings*/ 1 && img.src !== (img_src_value = "./assets/paintings/" + /*painting*/ ctx[1].imgUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*paintings*/ 1 && a_href_value !== (a_href_value = "./assets/paintings/" + /*painting*/ ctx[1].imgUrl)) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty & /*paintings*/ 1 && t2_value !== (t2_value = /*painting*/ ctx[1].title + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*paintings*/ 1 && t5_value !== (t5_value = /*painting*/ ctx[1].title_eng + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(figure);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(6:4) {#each paintings as painting}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let each_value = /*paintings*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "gallery svelte-7g8xt6");
    			attr_dev(div, "role", "feed");
    			add_location(div, file$3, 4, 0, 46);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*paintings*/ 1) {
    				each_value = /*paintings*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Gallery", slots, []);
    	let { paintings } = $$props;
    	const writable_props = ["paintings"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Gallery> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("paintings" in $$props) $$invalidate(0, paintings = $$props.paintings);
    	};

    	$$self.$capture_state = () => ({ paintings });

    	$$self.$inject_state = $$props => {
    		if ("paintings" in $$props) $$invalidate(0, paintings = $$props.paintings);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [paintings];
    }

    class Gallery extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { paintings: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Gallery",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*paintings*/ ctx[0] === undefined && !("paintings" in props)) {
    			console.warn("<Gallery> was created without expected prop 'paintings'");
    		}
    	}

    	get paintings() {
    		throw new Error("<Gallery>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set paintings(value) {
    		throw new Error("<Gallery>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Contacts.svelte generated by Svelte v3.38.2 */

    const file$2 = "src/components/Contacts.svelte";

    function create_fragment$2(ctx) {
    	let address;
    	let div0;
    	let b0;
    	let br0;
    	let a0;
    	let t2;
    	let div1;
    	let b1;
    	let br1;
    	let a1;
    	let t5;
    	let div2;
    	let b2;
    	let br2;
    	let a2;
    	let t8;
    	let div3;
    	let b3;
    	let br3;
    	let a3;

    	const block = {
    		c: function create() {
    			address = element("address");
    			div0 = element("div");
    			b0 = element("b");
    			b0.textContent = "Instagram:";
    			br0 = element("br");
    			a0 = element("a");
    			a0.textContent = "@belarusian_monsters";
    			t2 = space();
    			div1 = element("div");
    			b1 = element("b");
    			b1.textContent = "Facebook:";
    			br1 = element("br");
    			a1 = element("a");
    			a1.textContent = "artur.basak";
    			t5 = space();
    			div2 = element("div");
    			b2 = element("b");
    			b2.textContent = "Linkedin:";
    			br2 = element("br");
    			a2 = element("a");
    			a2.textContent = "arturbasak";
    			t8 = space();
    			div3 = element("div");
    			b3 = element("b");
    			b3.textContent = "Email:";
    			br3 = element("br");
    			a3 = element("a");
    			a3.textContent = "artur.basak.devingrodno@gmail.com";
    			add_location(b0, file$2, 3, 9, 38);
    			add_location(br0, file$2, 3, 26, 55);
    			attr_dev(a0, "href", "https://www.instagram.com/belarusian_monsters/");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noreferrer noopener external");
    			add_location(a0, file$2, 3, 30, 59);
    			attr_dev(div0, "class", "svelte-13lc2kd");
    			add_location(div0, file$2, 3, 4, 33);
    			add_location(b1, file$2, 4, 9, 207);
    			add_location(br1, file$2, 4, 25, 223);
    			attr_dev(a1, "href", "https://www.facebook.com/artur.basak/");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noreferrer noopener external");
    			add_location(a1, file$2, 4, 29, 227);
    			attr_dev(div1, "class", "svelte-13lc2kd");
    			add_location(div1, file$2, 4, 4, 202);
    			add_location(b2, file$2, 5, 9, 357);
    			add_location(br2, file$2, 5, 25, 373);
    			attr_dev(a2, "href", "https://www.linkedin.com/in/arturbasak/");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noreferrer noopener external");
    			add_location(a2, file$2, 5, 29, 377);
    			attr_dev(div2, "class", "svelte-13lc2kd");
    			add_location(div2, file$2, 5, 4, 352);
    			add_location(b3, file$2, 6, 9, 508);
    			add_location(br3, file$2, 6, 22, 521);
    			attr_dev(a3, "href", "mailto:artur.basak.devingrodno@gmail.com");
    			attr_dev(a3, "target", "_blank");
    			add_location(a3, file$2, 6, 26, 525);
    			attr_dev(div3, "class", "svelte-13lc2kd");
    			add_location(div3, file$2, 6, 4, 503);
    			attr_dev(address, "class", "svelte-13lc2kd");
    			add_location(address, file$2, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, address, anchor);
    			append_dev(address, div0);
    			append_dev(div0, b0);
    			append_dev(div0, br0);
    			append_dev(div0, a0);
    			append_dev(address, t2);
    			append_dev(address, div1);
    			append_dev(div1, b1);
    			append_dev(div1, br1);
    			append_dev(div1, a1);
    			append_dev(address, t5);
    			append_dev(address, div2);
    			append_dev(div2, b2);
    			append_dev(div2, br2);
    			append_dev(div2, a2);
    			append_dev(address, t8);
    			append_dev(address, div3);
    			append_dev(div3, b3);
    			append_dev(div3, br3);
    			append_dev(div3, a3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(address);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contacts", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contacts> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contacts extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contacts",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/About.svelte generated by Svelte v3.38.2 */

    const file$1 = "src/components/About.svelte";

    function create_fragment$1(ctx) {
    	let article;
    	let p0;
    	let t1;
    	let hr;
    	let t2;
    	let p1;

    	const block = {
    		c: function create() {
    			article = element("article");
    			p0 = element("p");
    			p0.textContent = "Artur Basak is a self-taught artist, mainly engaged in graphics, lives in Grodno, Belarus. By profession, a programmer, UI engineer, but in his free time, between family and work affairs, he draws. Born in Baranovichi, he made his first creative steps there, later moved to Grodno. The author takes the main subjects of his drawings from belarusian folklore, folk demonology, famous belarusian legends and myths. The works presented on the site were performed in digital format using a Samsung Note 10 smartphone and stylus S Pen.";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			p1 = element("p");
    			p1.textContent = "Артур Басак - мастак-самавук, займаецца ў асноўным графікай, жыве ў Гродне, Беларусь. Па прафесіі праграміст, UI інжынер, але ў вольны час паміж сямейнымі і працоўнымі справамі малюе. Нарадзіўся ў Баранавічах, там жа рабіў свае першыя творчыя крокі, пазней пераехаў у Гродна. Асноўныя сюжэты сваіх малюнкаў аўтар бярэ з беларускага фальклору, народнай дэманалогіі, вядомых легенд і міфаў. Працы прадстаўленыя на сайце былі выкананы ў лічбавым фармаце з дапамогай смартфона Samsung Note 10 і пяра S Pen.";
    			add_location(p0, file$1, 1, 4, 14);
    			attr_dev(hr, "class", "svelte-jkjs75");
    			add_location(hr, file$1, 2, 4, 556);
    			attr_dev(p1, "lang", "be");
    			add_location(p1, file$1, 3, 4, 567);
    			attr_dev(article, "class", "svelte-jkjs75");
    			add_location(article, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, article, anchor);
    			append_dev(article, p0);
    			append_dev(article, t1);
    			append_dev(article, hr);
    			append_dev(article, t2);
    			append_dev(article, p1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(article);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const data = [
      {
        imgUrl: "/hatnik.png",
        title: "Дамавік, Хатнік",
        title_eng: "Home goblin",
      },
      {
        imgUrl: "/lida-ghost.png",
        title: "Прывід Лідскага замка",
        title_eng: "Ghost of Lida Castle",
      },
      {
        imgUrl: "/eunik.jpg",
        title: "Ёўнік, Асетнік",
        title_eng: "Goblin of grain dryer",
      },
      {
        imgUrl: "/hapun.jpg",
        title: "Хапун",
        title_eng: "Grabber",
      },
      {
        imgUrl: "/stryga.jpg",
        title: "Стрыга",
        title_eng: "Stryga, Strzyga",
      },
      {
        imgUrl: "/werewolf.png",
        title: "Ваўкалак",
        title_eng: "Werewolf",
      },
      {
        imgUrl: "/witch.png",
        title: "Ведзьмы",
        title_eng: "Witches",
      },
      {
        imgUrl: "/sheshik.png",
        title: "Шэшка",
        title_eng: "Sheshka",
      },
      {
        imgUrl: "/dwarf.png",
        title: "Красналюд",
        title_eng: "Dwarf",
      },
      {
        imgUrl: "/loima.jpg",
        title: "Лойма",
        title_eng: "Loima",
      },
      {
        imgUrl: "/hleunik.png",
        title: "Хлеўнік, Хляўнік, Дваровы",
        title_eng: "Courtyard goblin",
      },
      {
        imgUrl: "/baran.png",
        title: "Дух Мірскага замка, Абаронца Мірскага замка",
        title_eng: "Spirit of Mir Castle, Defender of Mir Castle",
      },
      {
        imgUrl: "/tsitsoha.png",
        title: "Цыцоха",
        title_eng: "Tsitsokha",
      },
      {
        imgUrl: "/kasny.png",
        title: "Касны",
        title_eng: "Kasny",
      },
      {
        imgUrl: "/laznik.png",
        title: "Лазнік",
        title_eng: "Bathhouse goblin",
      },
      {
        imgUrl: "/shkurapeya.png",
        title: "Шкурапея",
        title_eng: "Shkurapeya",
      },
      {
        imgUrl: "/ignis-fatuus.png",
        title: "Ліхтарка",
        title_eng: "Ignis Fatuus",
      },
      {
        imgUrl: "/lizdeika.png",
        title: "Жрэц Ліздзейка",
        title_eng: "Priest Lizdeika",
      },
      {
        imgUrl: "/kopsha.png",
        title: "Копша",
        title_eng: "Kopsha",
      },
      {
        imgUrl: "/padnor.png",
        title: "Паднор",
        title_eng: "Padnor, Mouse King",
      },
      {
        imgUrl: "/punnik.png",
        title: "Пуннік",
        title_eng: "Hayloft goblin",
      },
      {
        imgUrl: "/tsigra.png",
        title: "Цыгра",
        title_eng: "Tsigra",
      },
      {
        imgUrl: "/paludenica.png",
        title: "Палудніца, Палудзеніца, Ржаніца",
        title_eng: "Noon demon",
      },
      {
        imgUrl: "/palevik.png",
        title: "Жыцень, Палевік",
        title_eng: "Spirit of wheat field",
      },
      {
        imgUrl: "/turosik.png",
        title: "Туросік",
        title_eng: "Turosik",
      },
      {
        imgUrl: "/utopec.png",
        title: "Утопец, Утопца, Топелец",
        title_eng: "Drowned dead",
      },
      {
        imgUrl: "/zhabalak.png",
        title: "Жабалака, Жабалак",
        title_eng: "Werefrog",
      },
      {
        imgUrl: "/katalak.png",
        title: "Коталак, Кошкалачень",
        title_eng: "Werecat",
      },
      {
        imgUrl: "/gaeuka.png",
        title: "Гаёўка",
        title_eng: "Grove spirit",
      },
      {
        imgUrl: "/tsmok.png",
        title: "Лясны цмок",
        title_eng: "Forest dragon",
      },
      {
        imgUrl: "/wseslav.png",
        title: "Усяслаў Чарадзей — Князь Полацкі",
        title_eng: "Vseslav the Sorcerer",
      },
      {
        imgUrl: "/liasun.png",
        title: "Лясун, Лесавік",
        title_eng: "Forest spirit",
      },
      {
        imgUrl: "/kikimora.png",
        title: "Кікімара",
        title_eng: "Kikimora",
      },
      {
        imgUrl: "/balamutsen.png",
        title: "Баламуцень",
        title_eng: "Troublemaker",
      },
      {
        imgUrl: "/chornaja-panna.png",
        title: "Чорная Панна Нясвіжа",
        title_eng: "Black Maiden of Nesvizh",
      },
      {
        imgUrl: "/lepel-tsmok.png",
        title: "Лепельскі цмок",
        title_eng: "Dragon of Lyepyel Lake",
      },
      {
        imgUrl: "/bagan.png",
        title: "Баган",
        title_eng: "Cattle protector",
      },
      {
        imgUrl: "/nachnitsa.png",
        title: "Начніца",
        title_eng: "Night demon",
      },
      {
        imgUrl: "/arzhaven.png",
        title: "Аржавенік, Аржавень",
        title_eng: "Demon of rust swamp",
      },
      {
        imgUrl: "/dzedka.png",
        title: "Дзедка, Скарбнік",
        title_eng: "Dzedka, Treasurer",
      },
      {
        imgUrl: "/haber.png",
        title: "Хабёр, Цар усіх ракаў",
        title_eng: "Haber, King of crayfish",
      },
    ];

    /* src/App.svelte generated by Svelte v3.38.2 */
    const file = "src/App.svelte";

    // (19:1) {:else}
    function create_else_block(ctx) {
    	let gallery;
    	let current;

    	gallery = new Gallery({
    			props: { paintings: data },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(gallery.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(gallery, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(gallery.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(gallery.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(gallery, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(19:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:35) 
    function create_if_block_2(ctx) {
    	let about;
    	let current;
    	about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(about.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(about, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(about, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(17:35) ",
    		ctx
    	});

    	return block;
    }

    // (15:38) 
    function create_if_block_1(ctx) {
    	let contacts;
    	let current;
    	contacts = new Contacts({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(contacts.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(contacts, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(contacts.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(contacts.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(contacts, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:38) ",
    		ctx
    	});

    	return block;
    }

    // (13:1) {#if $url.hash === '' || $url.hash === '#/'}
    function create_if_block(ctx) {
    	let gallery;
    	let current;

    	gallery = new Gallery({
    			props: { paintings: data },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(gallery.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(gallery, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(gallery.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(gallery.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(gallery, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(13:1) {#if $url.hash === '' || $url.hash === '#/'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$url*/ ctx[0].hash === "" || /*$url*/ ctx[0].hash === "#/") return 0;
    		if (/*$url*/ ctx[0].hash === "#/contacts") return 1;
    		if (/*$url*/ ctx[0].hash === "#/about") return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(main, "class", "svelte-jirsbb");
    			add_location(main, file, 10, 0, 350);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			if_blocks[current_block_type_index].m(main, null);
    			append_dev(main, t1);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, t1);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			if_blocks[current_block_type_index].d();
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $url;
    	validate_store(url, "url");
    	component_subscribe($$self, url, $$value => $$invalidate(0, $url = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Header,
    		Footer,
    		Gallery,
    		Contacts,
    		About,
    		url,
    		data,
    		$url
    	});

    	return [$url];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
