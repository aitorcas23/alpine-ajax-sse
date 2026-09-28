# Alpine AJAX SSE

Adds `x-sse` directive and `$sse()` magic to [alpine.js](https://alpinejs.dev/).
This plugin also requires [alpine AJAX](https://alpine-ajax.js.org/).
To learn more about how SSE works visit [Using server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

## Installation
You can install this plugin via CDN.
```html
<script defer src="https://cdn.jsdelivr.net/npm/@aitorcas23/alpine-ajax-sse/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@imacrayon/alpine-ajax/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs/dist/cdn.min.js"></script>
```
Or add the specific version for each part.
```html
<script defer src="https://cdn.jsdelivr.net/npm/@aitorcas23/alpine-ajax-sse@0.1.1/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/@imacrayon/alpine-ajax@0.12.7/dist/cdn.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.17.4/dist/cdn.min.js"></script>
```

You can also install it as an npm module.
```bash
npm install @aitorcas23/alpine-ajax-sse
```

```javascript
import Alpine from "alpinejs"
import ajax from "@imacrayon/alpine-ajax"
import sse from "@aitorcas23/alpine-ajax-sse"

window.Alpine = Alpine
Alpine.plugin(ajax)
Alpine.plugin(sse)
```

## Usage
> [!NOTE]
> This usage guide assumes you already know how to use [Alpine](https://alpinejs.dev/) and [Alpine AJAX](https://alpine-ajax.js.org/).

```html
<div x-data>
    <ul id="comments" x-sse="/comments" x-target x-merge="append">
        <li>Comment1</li>
        <li>Comment2</li>
        ...
    </ul>

    <button @click="$sse('/comments')" x-target="comments">Start SSE</button>
</div>
```
Use the `x-sse` directive to start a connection with a SSE endpoint.
Or use the `$sse` magic to start the connection.

There are three types of SSE events `x-sse` accepts.
- **sse:html**: Update the html with the received html in the event data.
- **sse:store**: Update the global `$store` with the values in the event data.
- **sse:dispatch**: Dispatch an event from the element.
To see how the server responses should look go to the **Server** section.

### x-sse
This directive starts a connection to a SSE endpoint using the javascript `EventSource()` api.
Set the url of the SSE endpoint in the value of the `x-sse` directive (e.g. `x-sse="/events"`).

The sse request is made as soon as the element with the `x-sse` directive is loaded.

#### Modifiers
- **:dynamic**:
    You can use `:dynamic` to evaluate an expression which sets the url for the SSE.
    Same as `x-target:dynamic`.
    ```html
    <div x-data="{url: '/comments'}">
        <ul id="comments" x-sse:dynamic="url" x-target></ul>
    </div>
    ```
- **.nofocus**:
    Disable `autofocus` and `x-autofocus` functionality.
    Same as `x-target.nofocus`.
    Focus defaults to `true` and can be disabled with `x-target.nofocus` or `x-sse.nofocus`.
- **.nosync**:
    Disable `x-sync` functionality.

#### x-target
This sets the target or targets for the SSE `sse:html` events.
It mostly works the same as on alpine AJAX.

Unlike with alpine AJAX, there is no error when a target is missing from the server response.
Although a `sse:missing` event is dispatched when that happens.
This way you can define all the targets you would like to modify and only respond with the one that changed on each response.
```html
<div x-data>
    <ul id="comments"></ul>
    <ul id="chat"></ul>
    <div x-sse="/events" x-target="comments chat"></div>
</div>
```
Alpine AJAX supported and unsupported `x-target` features:

| Feature                        | Example                   | Support                | Notes                                                                                  |
|--------------------------------|---------------------------|------------------------|----------------------------------------------------------------------------------------|
| Multiple Targets               | `x-target="one two"`      | ✅ Supported           | No error when a target is missing                                                      |
| Target aliases                 | `x-target="my_id:sse_id"` | ✅ Supported           | Same as alpine AJAX                                                                    |
| Response status targets        | `x-target.4xx="my_id"`    | ❌ Unsupported         | Once SSE connection is made status is always 200                                       |
| Special targets                | `x-target="_none"`        | ⚠️ Partially supported | Only `_none` is supported, although it would be the same as not having any `x-target`  |
| Dynamic target names           | `x-target:dynamic="name"` | ⚠️ Partially supported | Supported, although only evaluated when first connecting to the SSE endpoint           |
| History & URL                  | `x-target.push`           | ❌ Unsupported         | You wouldn't want to set the navigation url to the SSE endpoint                        |
| Disable AJAX per submit button | `formnoajax`              | ❌ Unsupported         | SSE isn't really related to forms                                                      |

#### x-sync
This can be used to update elements not included in targets on `sse:html` SSE events.
This is very useful in the case of SSE since the idea is to send html fragments from the server.
```html
<div x-data>
    <ul id="comments" x-sync></ul>
    <ul id="chat" x-sync></ul>
    <div x-sse="/events"></div>
</div>
```

It can be disabled with `x-sse.nosync`.

#### Other directives
Not all directives make sense in the context of SSE messages.
Here is a table of support for other Alpine AJAX directives.

| Directive     | Support        | Notes                                                                           |
|---------------|----------------|---------------------------------------------------------------------------------|
| `x-headers`   | ❌ Unsupported | Javascript `EventSource()` api doesn't support Headers                          |
| `x-merge`     | ✅ Supported   | Same as Alpine AJAX, including morph and View transitions                       |
| `x-autofocus` | ✅ Supported   | Same as Alpine AJAX. Can be disabled with `x-sse.nofocus` or `x-target.nofocus` |

### $sse()
`x-sse` makes the request as soon as the element is loaded.
If you want to manually trigger the request you can use the `$sse()` magic function.
```html
<div x-data>
    <ul id="chat" x-merge="append"></ul>
    <button @click="$sse('/chat', {target: 'chat'})">Start chat</button>
</div>
```

This function takes two arguments:
- The url of the endpoint.
- Optional **options**.

#### $sse() options

| Option  | Default | Description         |
|---------|---------|---------------------|
| target  | `''`    | Same as Alpine AJAX |
| targets | `[]`    | Same as Alpine AJAX |
| focus   | `false` | Same as Alpine AJAX |
| sync    | `false` | Same as Alpine AJAX |

### Events
As with Alpine AJAX, you can listen for events to perform additional actions during the lifecycle of a SSE request:

| Name          | Description |
|---------------|-------------|
| `sse:before`  | Fired before the SSE requests is made. If this event is canceled using `$event.preventDefault()` the request will be aborted. |
| `sse:sent`    | Fired when a SSE response is received. `$event.detail` conteins the **response** object. If this event is canceled using `$event.preventDefault()` the action will be aborted. This could be used to cancel the action depending on the `$event.detail.type` for example. |
| `sse:missing` | Fired when a target is missing from the SSE response. Only fired for `sse:html` events. Unlike Alpine AJAX this can't be cancelled, since no error is throwed when this happens. |
| `sse:merge`   | Fired when the `sse:html` event data is being merged. You may override a merge using `$event.preventDefault()`. `$event.detail` contains the **html element** to be merged, the **merge strategy** and a `merge()` method to continue the merge. |
| `sse:merged`  | Fired after the `sse:html` event data was merged. |
| `sse:after`   | Fired after all SSE events ended. `$event.target` contains the **response** object. In the case of a `sse:html` event it also containes a render array that contains the rendered targets. |

#### Response object

| Key         | Example                                   | Description                                                                                                                       |
|-------------|-------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| type        | `sse:html`                                | The type of the event. Can be `sse:html`, `sse:store` or `sse:dispatch`.                                                          |
| data        | `<ul id="comments"><li>Comment</li></ul>` | The data of the event as a **string**. It can be an html string, a json object or a regular string depending on the event `type`. |
| lastEventId | `event-id`                                | The id of the event. Normally not used. If not set from the server the `lastEventId` is `""`.                                     |

### Server
If you don't know how the server should work visit [Sending events from server](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#sending_events_from_the_server).
The server has three possible response types: **sse:html**, **sse:store** and **sse:dispatch**.

#### sse:html
Respond with the html to replace in the final document.
```
event: sse:html
data: <ul id="comments">
data:   <li>Comment3</li>
data: </ul>
```
Multiple html element can also be returned at the same time.

#### sse:store
Respond with a JSON object representing the stores to update and their values.
```
event: sse:store
data: {
data:   "myStore": "New value"
data: }
```

```html
<script>
    document.addEventListener("alpine:init", () => {
        Alpine.store("myStore", "A value")
    })
</script>
<span x-text="$store.myStore" x-sse="/events"></span>
```

#### sse:dispatch
Respond with the name of the event you want to dispatch from the element.
The events are sent from the element hosting the `x-sse` directive.
```
event: sse:dispatch
data: my-event
```
Or the response can also be a json object with `"type"` and `"detail"` keys.
```
event: sse:dispatch
data: {"type": "my-event", "detail": {"extra": "Some extra details"}}
```
And then listen to it on the frontend.
The event is sent from the element with `x-sse`, so using the modifier `.window` on the event may be needed.
```html
<div x-sse="/events" @my-event="console.log($event.detail.extra)"></div>
```

## Configuration
Unfortunately, this plugin can't read Alpine AJAX configuration, so you'll have to re-configure some parts.
Alpine AJAX SSE only support `mergeStrategy` and `mapDelimiter` (only for `$sse()`) options.

```javascript
Alpine.plugin(sse.configure({
    mergeStrategy: "morph", // default "replace"
    mapDelimiter: "|", // default ":"
}))
```

## Thanks
Special thanks to [Alpine.js](https://alpinejs.dev/) and [Alpine AJAX](https://alpine-ajax.js.org/).
Most of the code was taken and adapted from the Alpine AJAX codebase.
The build scripts where also taken from Alpine AJAX.
