var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// builds/module.js
__export(exports, {
  default: () => module_default
});

// src/index.js
var settings = {
  mergeStrategy: "replace",
  mapDelimiter: ":"
};
function SSE(Alpine2) {
  if (Alpine2.morph)
    doMorph = Alpine2.morph;
  Alpine2.directive("sse", (el, { expression, value, modifiers }, { evaluate, cleanup }) => {
    if (!expression)
      return;
    let url;
    if (value == "dynamic") {
      url = evaluate(expression);
    } else {
      url = expression;
    }
    const focus = modifiers.includes("nofocus") ? false : void 0;
    const sync = modifiers.includes("nosync") ? false : void 0;
    const end = newSSE(el, url, void 0, focus, sync);
    if (end)
      cleanup(end);
  });
  Alpine2.magic("sse", (el) => (url, options = { target: "", targets: [], focus: false, sync: false }) => {
    if (options.target) {
      options.targets = [options.target];
    }
    const targets = options.target.map((t) => t.includes(":") ? t.split(":") : [t, t]);
    const end = newSSE(el, url, targets, options.focus, options.sync);
    if (!el._x_cleanups) {
      el._x_cleanups = [];
    }
    el._x_cleanups.push(end);
  });
}
SSE.configure = (options) => {
  settings = Object.assign(settings, options);
  return SSE;
};
function newSSE(el, url, targets = void 0, focus = void 0, sync = void 0) {
  if (!dispatch(el, "sse:before")) {
    return;
  }
  const es = new EventSource(url, { withCredentials: true });
  const htmlHandler = async (event) => {
    var _a, _b, _c, _d, _e, _f;
    const response = {
      type: event.type,
      data: event.data,
      lastEventId: event.lastEventId
    };
    if (!dispatch(el, "sse:sent", response)) {
      return;
    }
    targets = (_b = targets != null ? targets : (_a = el._ajax_target) == null ? void 0 : _a.xxx.ids) != null ? _b : [];
    focus = (_d = focus != null ? focus : (_c = el._ajax_target) == null ? void 0 : _c.xxx.focus) != null ? _d : true;
    sync = (_f = sync != null ? sync : (_e = el._ajax_target) == null ? void 0 : _e.xxx.sync) != null ? _f : true;
    let targetEls = new Set(targets.map(([id, ajax_id]) => {
      if (id == "_none")
        return;
      let el2 = document.getElementById(id);
      el2._ajax_id = ajax_id;
      return el2;
    }).filter(Boolean));
    if (sync) {
      document.querySelectorAll("[x-sync]").forEach((s) => {
        if (!s.id)
          throw new IDError(s);
        s._ajax_id = s.id;
        targetEls.add(s);
      });
    }
    const wrapper = document.createRange().createContextualFragment(`<template>${event.data}</template>`);
    const fragment = wrapper.firstElementChild.content;
    const renders = targetEls.keys().map((target) => {
      const content = fragment.getElementById(target._ajax_id);
      if (!content) {
        dispatch(el, "sse:missing", { target, response });
        return;
      }
      const strategy = target._ajax_strategy || "replace";
      const render2 = newRender(target, content, strategy, focus);
      if (!dispatch(target, "sse:merge", { strategy, content, merge: render2 })) {
        return;
      }
      return render2();
    });
    let render = await Promise.all(renders);
    if (el && el.isConnected) {
      dispatch(el, "sse:after", { response, render });
    } else {
      dispatch(window, "sse:after", { response, render });
    }
  };
  es.addEventListener("sse:html", htmlHandler);
  const storeHandler = (event) => {
    const response = {
      type: event.type,
      data: event.data,
      lastEventId: event.lastEventId
    };
    if (!dispatch(el, "sse:sent", response))
      return;
    const value = JSON.parse(event.data);
    Object.keys(value).forEach((s) => {
      Alpine.store(s, value[s]);
    });
    if (el && el.isConnected) {
      dispatch(el, "sse:after", { response });
    } else {
      dispatch(window, "sse:after", { response });
    }
  };
  es.addEventListener("sse:store", storeHandler);
  const dispatchHandler = (event) => {
    const response = {
      type: event.type,
      data: event.data,
      lastEventId: event.lastEventId
    };
    if (!dispatch(el, "sse:sent", response))
      return;
    let customEvent = {};
    try {
      customEvent = JSON.parse(event.data);
    } catch {
      customEvent.type = event.data;
    }
    dispatch(el, customEvent.type, customEvent.detail);
    if (el && el.isConnected) {
      dispatch(el, "sse:after", { response });
    } else {
      dispatch(window, "sse:after", { response });
    }
  };
  es.addEventListener("sse:dispatch", dispatchHandler);
  return () => {
    es.removeEventListener("sse:html", htmlHandler);
    es.removeEventListener("sse:store", storeHandler);
    es.removeEventListener("sse:dispatch", dispatchHandler);
    es.close();
  };
}
function newRender(target, content, strategy, focus = false) {
  return async () => {
    let focused = !focus;
    target = await merge(strategy, target, content);
    if (target) {
      let selectors = ["[x-autofocus]", "[autofocus]"];
      while (!focused && selectors.length) {
        let selector = selectors.shift();
        if (target.matches(selector)) {
          focused = focusOn(target);
        }
        focused = focused || Array.from(target.querySelectorAll(selector)).some((focusable) => focusOn(focusable));
      }
    }
    dispatch(target, "sse:merged");
    return target;
  };
}
async function merge(strategy, target, to) {
  let strategies = {
    before(from, to2) {
      from.before(...to2.childNodes);
      return from;
    },
    replace(from, to2) {
      from.replaceWith(to2);
      return to2;
    },
    update(from, to2) {
      from.replaceChildren(...to2.childNodes);
      return from;
    },
    prepend(from, to2) {
      from.prepend(...to2.childNodes);
      return from;
    },
    append(from, to2) {
      from.append(...to2.childNodes);
      return from;
    },
    after(from, to2) {
      from.after(...to2.childNodes);
      return from;
    },
    morph(from, to2) {
      doMorph(from, to2);
      return document.getElementById(to2.getAttribute("id"));
    }
  };
  if (!target._ajax_transition || !document.startViewTransition) {
    return strategies[strategy](target, to);
  }
  let transition = document.startViewTransition(() => {
    target = strategies[strategy](target, to);
    return Promise.resolve();
  });
  await transition.updateCallbackDone;
  return target;
}
var doMorph = () => {
  console.error(`You can't use the "morph" merge without first installing the Alpine "morph" plugin here: https://alpinejs.dev/plugins/morph`);
};
function focusOn(el) {
  if (!el)
    return false;
  if (!el.getClientRects().length)
    return false;
  setTimeout(() => {
    if (!el.hasAttribute("tabindex"))
      el.setAttribute("tabindex", "0");
    el.focus();
  }, 0);
  return true;
}
function dispatch(el, name, detail) {
  return el.dispatchEvent(new CustomEvent(name, {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true
  }));
}
var IDError = class extends DOMException {
  constructor(el) {
    var _a, _b;
    let description = (_b = ((_a = el.outerHTML.match(/<[^>]+>/)) != null ? _a : [])[0]) != null ? _b : "[Element]";
    super(`${description} is missing an ID to target.`, "IDError");
  }
};
var src_default = SSE;

// builds/module.js
var module_default = src_default;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {});
