const settings = {
  mergeStrategy: "replace",
  mapDelimiter: ":",
};

function SSE(Alpine) {
  if (Alpine.morph) doMorph = Alpine.morph;

  Alpine.directive("sse", (el, { expression, value, modifiers }, { evaluate, cleanup }) => {
    if (!expression) return;

    let url;
    if (value == "dynamic") {
      url = evaluate(expression);
    } else {
      url = expression;
    }
    const focus = modifiers.includes("nofocus") ? false : undefined;
    const sync = modifiers.includes("nosync") ? false : undefined;

    const end = newSSE(el, url, undefined, focus, sync);
    if (end) cleanup(end);
  });

  Alpine.magic(
    "sse",
    (el) =>
      (url, options = { target: "", targets: [], focus: false, sync: false }) => {
        if (options.target) {
          options.targets = [options.target];
        }
        const targets = options.target.map((t) => (t.includes(":") ? t.split(":") : [t, t]));
        const end = newSSE(el, url, targets, options.focus, options.sync);
        if (!el._x_cleanups) {
          el._x_cleanups = [];
        }
        el._x_cleanups.push(end);
      },
  );
}

SSE.configure = (options) => {
  settings = Object.assign(settings, options);
  return SSE;
};

function newSSE(el, url, targets = undefined, focus = undefined, sync = undefined) {
  if (!dispatch(el, "sse:before")) {
    return;
  }
  const es = new EventSource(url, { withCredentials: true });

  const htmlHandler = async (event) => {
    const response = {
      type: event.type,
      data: event.data,
      lastEventId: event.lastEventId,
    };
    if (!dispatch(el, "sse:sent", response)) {
      return;
    }
    targets = targets ?? el._ajax_target?.xxx.ids ?? [];
    focus = focus ?? el._ajax_target?.xxx.focus ?? true;
    sync = sync ?? el._ajax_target?.xxx.sync ?? true;

    let targetEls = new Set(
      targets
        .map(([id, ajax_id]) => {
          if (id == "_none") return;
          let el = document.getElementById(id);
          el._ajax_id = ajax_id;
          return el;
        })
        .filter(Boolean),
    );
    if (sync) {
      document.querySelectorAll("[x-sync]").forEach((s) => {
        if (!s.id) throw new IDError(s);
        s._ajax_id = s.id;
        targetEls.add(s);
      });
    }

    const wrapper = document
      .createRange()
      .createContextualFragment(`<template>${event.data}</template>`);
    const fragment = wrapper.firstElementChild.content;
    const renders = targetEls.keys().map((target) => {
      const content = fragment.getElementById(target._ajax_id);
      if (!content) {
        dispatch(el, "sse:missing", { target, response });
        return;
      }

      const strategy = target._ajax_strategy || "replace"; // No way to access ajax config settings.
      const render = newRender(target, content, strategy, focus);
      if (!dispatch(target, "sse:merge", { strategy, content, merge: render })) {
        return;
      }
      return render();
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
      lastEventId: event.lastEventId,
    };
    if (!dispatch(el, "sse:sent", response)) return;
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
      lastEventId: event.lastEventId,
    };
    if (!dispatch(el, "sse:sent", response)) return;
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
      // target.dataset.source = url;
      // PendingTargets.delete(target);
      let selectors = ["[x-autofocus]", "[autofocus]"];
      while (!focused && selectors.length) {
        let selector = selectors.shift();
        if (target.matches(selector)) {
          focused = focusOn(target);
        }
        focused =
          focused ||
          Array.from(target.querySelectorAll(selector)).some((focusable) => focusOn(focusable));
      }
    }

    dispatch(target, "sse:merged");

    return target;
  };
}

async function merge(strategy, target, to) {
  let strategies = {
    before(from, to) {
      from.before(...to.childNodes);

      return from;
    },
    replace(from, to) {
      from.replaceWith(to);

      return to;
    },
    update(from, to) {
      from.replaceChildren(...to.childNodes);

      return from;
    },
    prepend(from, to) {
      from.prepend(...to.childNodes);

      return from;
    },
    append(from, to) {
      from.append(...to.childNodes);

      return from;
    },
    after(from, to) {
      from.after(...to.childNodes);

      return from;
    },
    morph(from, to) {
      doMorph(from, to);

      return document.getElementById(to.getAttribute("id"));
    },
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

let doMorph = () => {
  console.error(
    `You can't use the "morph" merge without first installing the Alpine "morph" plugin here: https://alpinejs.dev/plugins/morph`,
  );
};

function focusOn(el) {
  if (!el) return false;
  if (!el.getClientRects().length) return false;
  setTimeout(() => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.focus();
  }, 0);

  return true;
}

function dispatch(el, name, detail) {
  return el.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
}

class IDError extends DOMException {
  constructor(el) {
    let description = (el.outerHTML.match(/<[^>]+>/) ?? [])[0] ?? "[Element]";
    super(`${description} is missing an ID to target.`, "IDError");
  }
}

export default SSE;
