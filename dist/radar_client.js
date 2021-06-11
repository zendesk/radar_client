var RadarClient;!function(){var t={323:function(t){function e(){this.failures=0}e.durations=[1e3,2e3,4e3,8e3,16e3,32e3],e.fallback=6e4,e.maxSplay=5e3,e.prototype.get=function(){return Math.ceil(Math.random()*e.maxSplay)+(e.durations[this.failures]||e.fallback)},e.prototype.increment=function(){this.failures++},e.prototype.success=function(){this.failures=0},e.prototype.isUnavailable=function(){return e.durations.length<=this.failures},t.exports=e},371:function(t){t.exports=function(){return"0.16.9"}},568:function(t,e,n){var s=new(n(47)),i=n(323);s._log=n(489),s.Backoff=i,t.exports=s},47:function(t,e,n){var s=n(203),i=n(413),r=n(394),o=n(585),a="undefined"!=typeof setImmediate?setImmediate:function(t){setTimeout(t,1)},c=n(371),u=n(984).Request,h=n(984).Response;function p(t){this.logger=n(489)("radar_client"),this._ackCounter=1,this._channelSyncTimes={},this._uses={},this._presences={},this._subscriptions={},this._restoreRequired=!1,this._queuedRequests=[],this._identitySetRequired=!0,this._isConfigured=!1,this._createManager(),this.configure(!1),this._addListeners(),this.backend=t||i}s.mixin(p),p.prototype.alloc=function(t,e){var n=this;return this._uses[t]||(this.logger().info("alloc: ",t),this.once("ready",(function(){n.logger().info("ready: ",t)})),this._uses[t]=!0),e&&this.once("ready",(function(){Object.prototype.hasOwnProperty.call(n._uses,t)&&e()})),this._isConfigured?this.manager.start():this._waitingForConfigure=!0,this},p.prototype.dealloc=function(t){this.logger().info({op:"dealloc",useName:t}),delete this._uses[t];var e,n=!1;for(e in this._uses)if(Object.prototype.hasOwnProperty.call(this._uses,e)){n=!0;break}n||(this.logger().info("closing the connection"),this.manager.close())},p.prototype.currentState=function(){return this.manager.current},p.prototype.configure=function(t){var e=t||this._configuration||{accountName:"",userId:0,userType:0};return e.userType=e.userType||0,this._configuration=this._me=e,this._isConfigured=this._isConfigured||!!t,this._isConfigured&&this._waitingForConfigure&&(this._waitingForConfigure=!1,this.manager.start()),this},p.prototype.configuration=function(t){return t in this._configuration?JSON.parse(JSON.stringify(this._configuration[t])):null},p.prototype.attachStateMachineErrorHandler=function(t){this.manager.attachErrorHandler(t)},p.prototype.currentUserId=function(){return this._configuration&&this._configuration.userId},p.prototype.currentClientId=function(){return this._socket&&this._socket.id},p.prototype.message=function(t){return new r("message",t,this)},p.prototype.presence=function(t){return new r("presence",t,this)},p.prototype.status=function(t){return new r("status",t,this)},p.prototype.stream=function(t){return new r("stream",t,this)},p.prototype.control=function(t){return new r("control",t,this)},p.prototype.nameSync=function(t,e,n){var s=u.buildNameSync(t,e);return this._write(s,n)},p.prototype.push=function(t,e,n,s,i){var r=u.buildPush(t,e,n,s);return this._write(r,i)},p.prototype.set=function(t,e,n,s){var i;return s=f(n,s),n=l(n),i=u.buildSet(t,e,this._configuration.userId,this._configuration.userType,n),this._write(i,s)},p.prototype.publish=function(t,e,n){var s=u.buildPublish(t,e);return this._write(s,n)},p.prototype.subscribe=function(t,e,n){n=f(e,n),e=l(e);var s=u.buildSubscribe(t,e);return this._write(s,n)},p.prototype.unsubscribe=function(t,e){var n=u.buildUnsubscribe(t);return this._write(n,e)},p.prototype.sync=function(t,e,n){var s,i,r;return n=f(e,n),e=l(e),s=u.buildSync(t,e),r=!e&&s.isPresence(),i=function(t){var e=new h(t);return!(!e||!e.isFor(s)||(r&&e.forceV1Response(),n&&n(e.getMessage()),0))},this.when("get",i),this._write(s)},p.prototype.get=function(t,e,n){var s;return n=f(e,n),e=l(e),s=u.buildGet(t,e),this.when("get",(function(t){var e=new h(t);return!(!e||!e.isFor(s)||(n&&n(e.getMessage()),0))})),this._write(s)};var f=function(t,e){return"function"==typeof t?t:e},l=function(t){return"function"==typeof t?null:t};p.prototype._addListeners=function(){this.on("authenticateMessage",(function(t){var e=new u(t);e.setAuthData(this._configuration),this.emit("messageAuthenticated",e.getMessage())})),this.on("messageAuthenticated",(function(t){var e=new u(t);this._sendMessage(e)}))},p.prototype._write=function(t,e){var n=this;return e&&(t.setAttr("ack",this._ackCounter++),this.when("ack",(function(s){var i=new h(s);return n.logger().debug("ack",i),!!i.isAckFor(t)&&(e(t.getMessage()),!0)}))),this.emit("authenticateMessage",t.getMessage()),this},p.prototype._batch=function(t){var e=t.getAttr("to"),n=t.getAttr("value"),s=t.getAttr("time");if(!t.isValid())return this.logger().info("response is invalid:",t.getMessage()),!1;for(var i,r=0,o=n.length,a=s,c=this._channelSyncTimes[e]||0;r<o;r+=2)i=JSON.parse(n[r]),(s=n[r+1])>c&&this.emitNext(e,i),s>a&&(a=s);this._channelSyncTimes[e]=a},p.prototype._createManager=function(){var t=this,e=this.manager=o.create();e.on("enterState",(function(e){t.emit(e)})),e.on("event",(function(e){t.emit(e)})),e.on("connect",(function(n){var s=t._socket=new t.backend.Socket(t._configuration);s.once("open",(function(){if(s!==t._socket)return s.removeAllListeners("message"),s.removeAllListeners("open"),s.removeAllListeners("close"),void s.close();t.logger().debug("socket open",s.id),e.established()})),s.once("close",(function(n,i){t.logger().debug("socket closed",s.id,n,i),s.removeAllListeners("message"),s.transport&&s.transport.close(),s===t._socket&&(t._socket=null,e.is("closed")||e.disconnect())})),s.on("message",(function(e){if(s!==t._socket)return s.removeAllListeners("message"),s.removeAllListeners("open"),s.removeAllListeners("close"),void s.close();t._messageReceived(e)})),s.on("error",(function(e){t.emit("socketError",e)})),e.removeAllListeners("close"),e.once("close",(function(){s.close()}))})),e.on("activate",(function(){null===t._socket?e.disconnect():(t._identitySet(),t._restore(),t.emit("ready"))})),e.on("authenticate",(function(){e.activate()})),e.on("disconnect",(function(){t._restoreRequired=!0,t._identitySetRequired=!0;var e=t._socket;e&&(e.removeAllListeners("message"),e.removeAllListeners("open"),e.removeAllListeners("close"),e.once("open",(function(){t.logger().debug("socket open, closing it",e.id),e.close()})),t._socket=null)})),e.on("backoff",(function(e,n){t.emit("backoff",e,n)}))},p.prototype._memorize=function(t){var e=t.getAttr("op"),n=t.getAttr("to"),s=t.getAttr("value");switch(e){case"unsubscribe":return this._subscriptions[n]&&delete this._subscriptions[n],!0;case"sync":case"subscribe":return"sync"!==this._subscriptions[n]&&(this._subscriptions[n]=e),!0;case"set":if(t.isPresence())return"offline"!==s?this._presences[n]=s:delete this._presences[n],!0}return!1},p.prototype._restore=function(){var t,e={subscriptions:0,presences:0,messages:0};if(this._restoreRequired){for(t in this._restoreRequired=!1,this._subscriptions)Object.prototype.hasOwnProperty.call(this._subscriptions,t)&&(this[this._subscriptions[t]](t),e.subscriptions+=1);for(t in this._presences)Object.prototype.hasOwnProperty.call(this._presences,t)&&(this.set(t,this._presences[t]),e.presences+=1);for(;this._queuedRequests.length;)this._write(this._queuedRequests.shift()),e.messages+=1;this.logger().debug("restore-subscriptions",e)}},p.prototype._sendMessage=function(t){var e=this._memorize(t),n=t.getAttr("ack");this.emit("message:out",t.getMessage()),this._socket&&this.manager.is("activated")?this._socket.sendPacket("message",t.payload()):this._isConfigured&&(this._restoreRequired=!0,this._identitySetRequired=!0,e&&!n||this._queuedRequests.push(t),this.manager.connectWhenAble())},p.prototype._messageReceived=function(t){var e=new h(JSON.parse(t)),n=e.getAttr("op"),s=e.getAttr("to");switch(this.emit("message:in",e.getMessage()),n){case"err":case"ack":case"get":this.emitNext(n,e.getMessage());break;case"sync":this._batch(e);break;default:this.emitNext(s,e.getMessage())}},p.prototype.emitNext=function(){var t=this,e=Array.prototype.slice.call(arguments);a((function(){t.emit.apply(t,e)}))},p.prototype._identitySet=function(){if(this._identitySetRequired){this._identitySetRequired=!1,this.name||(this.name=this._uuidV4Generate());var t={association:{id:this._socket.id,name:this.name},clientVersion:c()},e=this;this.control("clientName").nameSync(t,(function(t){e.logger("nameSync message: "+JSON.stringify(t))}))}};for(var g=[],d=0;d<256;d++)g[d]=(d<16?"0":"")+d.toString(16);p.prototype._uuidV4Generate=function(){var t=4294967295*Math.random()|0,e=4294967295*Math.random()|0,n=4294967295*Math.random()|0,s=4294967295*Math.random()|0;return g[255&t]+g[t>>8&255]+g[t>>16&255]+g[t>>24&255]+"-"+g[255&e]+g[e>>8&255]+"-"+g[e>>16&15|64]+g[e>>24&255]+"-"+g[63&n|128]+g[n>>8&255]+"-"+g[n>>16&255]+g[n>>24&255]+g[255&s]+g[s>>8&255]+g[s>>16&255]+g[s>>24&255]},p.setBackend=function(t){i=t},t.exports=p},394:function(t){function e(t,e,n){this.client=n,this.prefix=this._buildScopePrefix(t,e,n.configuration("accountName"))}for(var n=["set","get","subscribe","unsubscribe","publish","push","sync","on","once","when","removeListener","removeAllListeners","nameSync"],s=function(t){e.prototype[t]=function(){var e=Array.prototype.slice.apply(arguments);return e.unshift(this.prefix),this.client[t].apply(this.client,e),this}},i=0;i<n.length;i++)s(n[i]);e.prototype._buildScopePrefix=function(t,e,n){return t+":/"+n+"/"+e},t.exports=e},585:function(t,e,n){var s=n(489)("radar_state"),i=n(203),r=n(323),o=n(828);t.exports={create:function(){var t=new r,e=o.create({error:function(t,e,n,i,r,o,a){if(s.warn("state-machine-error",arguments),a){if(!this.errorHandler)throw a;this.errorHandler(t,e,n,i,r,o,a)}},events:[{name:"connect",from:["opened","disconnected"],to:"connecting"},{name:"established",from:"connecting",to:"connected"},{name:"authenticate",from:"connected",to:"authenticating"},{name:"activate",from:["authenticating","activated"],to:"activated"},{name:"disconnect",from:o.WILDCARD,to:"disconnected"},{name:"close",from:o.WILDCARD,to:"closed"},{name:"open",from:["none","closed"],to:"opened"}],callbacks:{onevent:function(t,e,n){s.debug("from "+e+" -> "+n+", event: "+t),this.emit("event",t),this.emit(t,arguments)},onstate:function(t,e,n){this.emit("enterState",n),this.emit(n,arguments)},onconnecting:function(){this.startGuard()},onestablished:function(){this.cancelGuard(),t.success(),this.authenticate()},onclose:function(){this.cancelGuard()},ondisconnected:function(n,i,r){this._timer&&(clearTimeout(this._timer),delete this._timer);var o=t.get();t.increment(),this.emit("backoff",o,t.failures),s.debug("reconnecting in "+o+"msec"),this._timer=setTimeout((function(){delete e._timer,e.is("disconnected")&&e.connect()}),o),t.isUnavailable()&&(s.info("unavailable"),this.emit("unavailable"))}}});for(var n in e._backoff=t,e._connectTimeout=1e4,i.prototype)Object.prototype.hasOwnProperty.call(i.prototype,n)&&(e[n]=i.prototype[n]);return e.open(),e.start=function(){this.is("closed")&&this.open(),this.is("activated")?this.activate():this.connectWhenAble()},e.startGuard=function(){e.cancelGuard(),e._guard=setTimeout((function(){s.info("startGuard: disconnect from timeout"),e.disconnect()}),e._connectTimeout)},e.cancelGuard=function(){e._guard&&(clearTimeout(e._guard),delete e._guard)},e.connectWhenAble=function(){this.is("connected")||this.is("activated")||(this.can("connect")?this.connect():this.once("enterState",(function(){e.connectWhenAble()})))},e.attachErrorHandler=function(t){"function"==typeof t?this.errorHandler=t:s.warn("errorHandler must be a function")},e}}},203:function(t){function e(){this._events={}}e.prototype={on:function(t,e){this._events||(this._events={});var n=this._events;return(n[t]||(n[t]=[])).push(e),this},removeListener:function(t,e){var n,s=this._events[t]||[];for(n=s.length-1;n>=0&&s[n];n--)s[n]!==e&&s[n].cb!==e||s.splice(n,1)},removeAllListeners:function(t){t?this._events[t]&&(this._events[t]=[]):this._events={}},listeners:function(t){return this._events&&this._events[t]||[]},emit:function(t){this._events||(this._events={});var e,n=Array.prototype.slice.call(arguments,1),s=this._events[t]||[];for(e=s.length-1;e>=0&&s[e];e--)s[e].apply(this,n);return this},when:function(t,e){return this.once(t,e,!0)},once:function(t,e,n){if(!e)return this;function s(){n||this.removeListener(t,s),e.apply(this,arguments)&&n&&this.removeListener(t,s)}return s.cb=e,this.on(t,s),this}},e.mixin=function(t){var n,s=e.prototype;for(n in s)s.hasOwnProperty(n)&&(t.prototype[n]=s[n])},t.exports=e},26:function(t){t.exports=class{constructor(){const t=[...arguments];this.value=t,this.op="batch"}add(t){this.value.push(t)}get length(){return this.value.length}toJSON(){return{op:this.op,length:this.length,value:this.value}}}},984:function(t,e,n){const s=n(137),i=n(821),r=n(26),o={};o.Batch=r,o.Request=s,o.Response=i,t.exports=o},137:function(t,e,n){const s=n(489)("message:request"),i={control:["nameSync","disconnect"],message:["publish","subscribe","sync","unsubscribe"],presence:["get","set","subscribe","sync","unsubscribe"],status:["get","set","subscribe","sync","unsubscribe"],stream:["get","push","subscribe","sync","unsubscribe"]},r=function(t){this.message=t,this._isValid()||(s.error("invalid request. op: "+this.message.op+"; to: "+this.message.to),this.message={})};r.buildGet=function(t,e,n={op:"get",to:t}){return new r(n).setOptions(e)},r.buildPublish=function(t,e,n={op:"publish",to:t}){const s=new r(n);return s.setAttr("value",e),s},r.buildPush=function(t,e,n,s,i={op:"push",to:t}){const o=new r(i);return o.setAttr("resource",e),o.setAttr("action",n),o.setAttr("value",s),o},r.buildNameSync=function(t,e,n={op:"nameSync",to:t}){return new r(n).setOptions(e)},r.buildSet=function(t,e,n,s,i,o={op:"set",to:t}){const a=new r(o);return a.setAttr("value",e),a.setAttr("key",n),a.setAttr("type",s),i&&a.setAttr("clientData",i),a},r.buildSync=function(t,e,n={op:"sync",to:t}){const s=new r(n).setOptions(e);return s.isPresence()&&s.forceV2Sync(e),s},r.buildSubscribe=function(t,e,n={op:"subscribe",to:t}){return new r(n).setOptions(e)},r.buildUnsubscribe=function(t,e={op:"unsubscribe",to:t}){return new r(e)},r.prototype.forceV2Sync=function(t={}){(t=t||{}).version=2,this.setAttr("options",t)},r.prototype.setAuthData=function(t){this.setAttr("userData",t.userData),t.auth&&(this.setAttr("auth",t.auth),this.setAttr("userId",t.userId),this.setAttr("userType",t.userType),this.setAttr("accountName",t.accountName))},r.prototype.getMessage=function(){return this.message},r.prototype.setOptions=function(t){return t&&this.setAttr("options",t),this},r.prototype.isPresence=function(){return"presence"===this.type},r.prototype.setAttr=function(t,e){this.message[t]=e},r.prototype.getAttr=function(t){return this.message[t]},r.prototype.payload=function(){return JSON.stringify(this.getMessage())},r.prototype.getType=function(){return this.type},r.prototype._isValid=function(){if(!this.message.op||!this.message.to)return!1;const t=this._getType();if(t){if(this._isValidType(t)&&this._isValidOperation(t))return this.type=t,!0}else s.error("missing type");return!1},r.prototype._isValidType=function(t){for(const e in i)if(Object.prototype.hasOwnProperty.call(i,e)&&e===t)return!0;return this.errMsg="invalid type: "+t,s.error(this.errMsg),!1},r.prototype._isValidOperation=function(t,e=i[t]){const n=e&&e.indexOf(this.message.op)>=0;return n||(this.errMsg="invalid operation: "+this.message.op+" for type: "+t,s.error(this.errMsg)),n},r.prototype._getType=function(){return this.message.to.substring(0,this.message.to.indexOf(":"))},t.exports=r},821:function(t,e,n){const s=n(489)("message:response");function i(t){this.message=t,this._validate()||(s.error("invalid response. message: "+JSON.stringify(t)),this.message={})}i.prototype.getMessage=function(){return this.message},i.prototype._validate=function(){if(!this.message.op)return this.errMsg="missing op",!1;switch(this.message.op){case"ack":if(!this.message.value)return this.errMsg="missing value",s.error(this.errMsg),!1;break;default:if("err"!==this.message.op&&!this.message.to)return this.errMsg="missing to",s.error(this.errMsg),!1}return!0},i.prototype.isValid=function(){return!!this.message.to&&!!this.message.value&&!!this.message.time},i.prototype.isFor=function(t){return this.getAttr("to")===t.getAttr("to")},i.prototype.isAckFor=function(t){return this.getAttr("value")===t.getAttr("ack")},i.prototype.getAttr=function(t){return this.message[t]},i.prototype.forceV1Response=function(){const t=this.message,e={};for(const n in t.value)if(Object.prototype.hasOwnProperty.call(t.value,n)){if(!t.value[n])continue;e[n]=t.value[n].userType}t.value=e,t.op="online",this.message=t},t.exports=i},828:function(t){var e=e=t.exports={VERSION:"2.2.0",Result:{SUCCEEDED:1,NOTRANSITION:2,CANCELLED:3,PENDING:4},Error:{INVALID_TRANSITION:100,PENDING_TRANSITION:200,INVALID_CALLBACK:300},WILDCARD:"*",ASYNC:"async",create:function(t,n){var s,i="string"==typeof t.initial?{state:t.initial}:t.initial,r=t.terminal||t.final,o=n||t.target||{},a=t.events||[],c=t.callbacks||{},u={},h=function(t){var n=t.from instanceof Array?t.from:t.from?[t.from]:[e.WILDCARD];u[t.name]=u[t.name]||{};for(var s=0;s<n.length;s++)u[t.name][n[s]]=t.to||n[s]};i&&(i.event=i.event||"startup",h({name:i.event,from:"none",to:i.state}));for(var p=0;p<a.length;p++)h(a[p]);for(s in u)u.hasOwnProperty(s)&&(o[s]=e.buildEvent(s,u[s]));for(s in c)c.hasOwnProperty(s)&&(o[s]=c[s]);return o.current="none",o.is=function(t){return t instanceof Array?t.indexOf(this.current)>=0:this.current===t},o.can=function(t){return!this.transition&&(u[t].hasOwnProperty(this.current)||u[t].hasOwnProperty(e.WILDCARD))},o.cannot=function(t){return!this.can(t)},o.error=t.error||function(t,e,n,s,i,r,o){throw o||r},o.isFinished=function(){return this.is(r)},i&&!i.defer&&o[i.event](),o},doCallback:function(t,n,s,i,r,o){if(n)try{return n.apply(t,[s,i,r].concat(o))}catch(n){return t.error(s,i,r,o,e.Error.INVALID_CALLBACK,"an exception occurred in a caller-provided callback function",n)}},beforeAnyEvent:function(t,n,s,i,r){return e.doCallback(t,t.onbeforeevent,n,s,i,r)},afterAnyEvent:function(t,n,s,i,r){return e.doCallback(t,t.onafterevent||t.onevent,n,s,i,r)},leaveAnyState:function(t,n,s,i,r){return e.doCallback(t,t.onleavestate,n,s,i,r)},enterAnyState:function(t,n,s,i,r){return e.doCallback(t,t.onenterstate||t.onstate,n,s,i,r)},changeState:function(t,n,s,i,r){return e.doCallback(t,t.onchangestate,n,s,i,r)},beforeThisEvent:function(t,n,s,i,r){return e.doCallback(t,t["onbefore"+n],n,s,i,r)},afterThisEvent:function(t,n,s,i,r){return e.doCallback(t,t["onafter"+n]||t["on"+n],n,s,i,r)},leaveThisState:function(t,n,s,i,r){return e.doCallback(t,t["onleave"+s],n,s,i,r)},enterThisState:function(t,n,s,i,r){return e.doCallback(t,t["onenter"+i]||t["on"+i],n,s,i,r)},beforeEvent:function(t,n,s,i,r){if(!1===e.beforeThisEvent(t,n,s,i,r)||!1===e.beforeAnyEvent(t,n,s,i,r))return!1},afterEvent:function(t,n,s,i,r){e.afterThisEvent(t,n,s,i,r),e.afterAnyEvent(t,n,s,i,r)},leaveState:function(t,n,s,i,r){var o=e.leaveThisState(t,n,s,i,r),a=e.leaveAnyState(t,n,s,i,r);return!1!==o&&!1!==a&&(e.ASYNC===o||e.ASYNC===a?e.ASYNC:void 0)},enterState:function(t,n,s,i,r){e.enterThisState(t,n,s,i,r),e.enterAnyState(t,n,s,i,r)},buildEvent:function(t,n){return function(){var s=this.current,i=n[s]||n[e.WILDCARD]||s,r=Array.prototype.slice.call(arguments);if(this.transition)return this.error(t,s,i,r,e.Error.PENDING_TRANSITION,"event "+t+" inappropriate because previous transition did not complete");if(this.cannot(t))return this.error(t,s,i,r,e.Error.INVALID_TRANSITION,"event "+t+" inappropriate in current state "+this.current);if(!1===e.beforeEvent(this,t,s,i,r))return e.Result.CANCELLED;if(s===i)return e.afterEvent(this,t,s,i,r),e.Result.NOTRANSITION;var o=this;this.transition=function(){return o.transition=null,o.current=i,e.enterState(o,t,s,i,r),e.changeState(o,t,s,i,r),e.afterEvent(o,t,s,i,r),e.Result.SUCCEEDED},this.transition.cancel=function(){o.transition=null,e.afterEvent(o,t,s,i,r)};var a=e.leaveState(this,t,s,i,r);return!1===a?(this.transition=null,e.Result.CANCELLED):e.ASYNC===a?e.Result.PENDING:this.transition?this.transition():void 0}}}},489:function(t){"use strict";t.exports=Minilog},413:function(t){"use strict";t.exports=eio}},e={},n=function n(s){var i=e[s];if(void 0!==i)return i.exports;var r=e[s]={exports:{}};return t[s](r,r.exports,n),r.exports}(568);RadarClient=n}();