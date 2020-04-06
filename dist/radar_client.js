var RadarClient=function(t){var e={};function n(r){if(e[r])return e[r].exports;var i=e[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(r,i,function(e){return t[e]}.bind(null,i));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=4)}([function(t,e){t.exports=Minilog},function(t,e){function n(){this._events={}}n.prototype={on:function(t,e){this._events||(this._events={});var n=this._events;return(n[t]||(n[t]=[])).push(e),this},removeListener:function(t,e){var n,r=this._events[t]||[];for(n=r.length-1;n>=0&&r[n];n--)r[n]!==e&&r[n].cb!==e||r.splice(n,1)},removeAllListeners:function(t){t?this._events[t]&&(this._events[t]=[]):this._events={}},listeners:function(t){return this._events&&this._events[t]||[]},emit:function(t){this._events||(this._events={});var e,n=Array.prototype.slice.call(arguments,1),r=this._events[t]||[];for(e=r.length-1;e>=0&&r[e];e--)r[e].apply(this,n);return this},when:function(t,e){return this.once(t,e,!0)},once:function(t,e,n){if(!e)return this;function r(){n||this.removeListener(t,r),e.apply(this,arguments)&&n&&this.removeListener(t,r)}return r.cb=e,this.on(t,r),this}},n.mixin=function(t){var e,r=n.prototype;for(e in r)r.hasOwnProperty(e)&&(t.prototype[e]=r[e])},t.exports=n},function(t,e){function n(){this.failures=0}n.durations=[1e3,2e3,4e3,8e3,16e3,32e3],n.fallback=6e4,n.maxSplay=5e3,n.prototype.get=function(){return Math.ceil(Math.random()*n.maxSplay)+(n.durations[this.failures]||n.fallback)},n.prototype.increment=function(){this.failures++},n.prototype.success=function(){this.failures=0},n.prototype.isUnavailable=function(){return n.durations.length<=this.failures},t.exports=n},function(t,e,n){const r=n(11),i=n(12),s=n(13),o={};o.Batch=s,o.Request=r,o.Response=i,t.exports=o},function(t,e,n){var r=new(n(5)),i=n(2);r._log=n(0),r.Backoff=i,t.exports=r},function(t,e,n){var r=n(1),i=n(6),s=n(7),o=n(8),a="undefined"!=typeof setImmediate?setImmediate:function(t){setTimeout(t,1)},c=n(10),u=n(3).Request,h=n(3).Response;function f(t){this.logger=n(0)("radar_client"),this._ackCounter=1,this._channelSyncTimes={},this._uses={},this._presences={},this._subscriptions={},this._restoreRequired=!1,this._queuedRequests=[],this._identitySetRequired=!0,this._isConfigured=!1,this._createManager(),this.configure(!1),this._addListeners(),this.backend=t||i}r.mixin(f),f.prototype.alloc=function(t,e){var n=this;return this._uses[t]||(this.logger().info("alloc: ",t),this.once("ready",(function(){n.logger().info("ready: ",t)})),this._uses[t]=!0),e&&this.once("ready",(function(){Object.prototype.hasOwnProperty.call(n._uses,t)&&e()})),this._isConfigured?this.manager.start():this._waitingForConfigure=!0,this},f.prototype.dealloc=function(t){this.logger().info({op:"dealloc",useName:t}),delete this._uses[t];var e,n=!1;for(e in this._uses)if(Object.prototype.hasOwnProperty.call(this._uses,e)){n=!0;break}n||(this.logger().info("closing the connection"),this.manager.close())},f.prototype.currentState=function(){return this.manager.current},f.prototype.configure=function(t){var e=t||this._configuration||{accountName:"",userId:0,userType:0};return e.userType=e.userType||0,this._configuration=this._me=e,this._isConfigured=this._isConfigured||!!t,this._isConfigured&&this._waitingForConfigure&&(this._waitingForConfigure=!1,this.manager.start()),this},f.prototype.configuration=function(t){return t in this._configuration?JSON.parse(JSON.stringify(this._configuration[t])):null},f.prototype.attachStateMachineErrorHandler=function(t){this.manager.attachErrorHandler(t)},f.prototype.currentUserId=function(){return this._configuration&&this._configuration.userId},f.prototype.currentClientId=function(){return this._socket&&this._socket.id},f.prototype.message=function(t){return new s("message",t,this)},f.prototype.presence=function(t){return new s("presence",t,this)},f.prototype.status=function(t){return new s("status",t,this)},f.prototype.stream=function(t){return new s("stream",t,this)},f.prototype.control=function(t){return new s("control",t,this)},f.prototype.nameSync=function(t,e,n){var r=u.buildNameSync(t,e);return this._write(r,n)},f.prototype.push=function(t,e,n,r,i){var s=u.buildPush(t,e,n,r);return this._write(s,i)},f.prototype.set=function(t,e,n,r){var i;return r=p(n,r),n=l(n),i=u.buildSet(t,e,this._configuration.userId,this._configuration.userType,n),this._write(i,r)},f.prototype.publish=function(t,e,n){var r=u.buildPublish(t,e);return this._write(r,n)},f.prototype.subscribe=function(t,e,n){n=p(e,n),e=l(e);var r=u.buildSubscribe(t,e);return this._write(r,n)},f.prototype.unsubscribe=function(t,e){var n=u.buildUnsubscribe(t);return this._write(n,e)},f.prototype.sync=function(t,e,n){var r,i,s;return n=p(e,n),e=l(e),r=u.buildSync(t,e),s=!e&&r.isPresence(),i=function(t){var e=new h(t);return!(!e||!e.isFor(r))&&(s&&e.forceV1Response(),n&&n(e.getMessage()),!0)},this.when("get",i),this._write(r)},f.prototype.get=function(t,e,n){var r;n=p(e,n),e=l(e),r=u.buildGet(t,e);return this.when("get",(function(t){var e=new h(t);return!(!e||!e.isFor(r))&&(n&&n(e.getMessage()),!0)})),this._write(r)};var p=function(t,e){return"function"==typeof t?t:e},l=function(t){return"function"==typeof t?null:t};f.prototype._addListeners=function(){this.on("authenticateMessage",(function(t){var e=new u(t);e.setAuthData(this._configuration),this.emit("messageAuthenticated",e.getMessage())})),this.on("messageAuthenticated",(function(t){var e=new u(t);this._sendMessage(e)}))},f.prototype._write=function(t,e){var n=this;return e&&(t.setAttr("ack",this._ackCounter++),this.when("ack",(function(r){var i=new h(r);return n.logger().debug("ack",i),!!i.isAckFor(t)&&(e(t.getMessage()),!0)}))),this.emit("authenticateMessage",t.getMessage()),this},f.prototype._batch=function(t){var e=t.getAttr("to"),n=t.getAttr("value"),r=t.getAttr("time");if(!t.isValid())return this.logger().info("response is invalid:",t.getMessage()),!1;for(var i,s=0,o=n.length,a=r,c=this._channelSyncTimes[e]||0;s<o;s+=2)i=JSON.parse(n[s]),(r=n[s+1])>c&&this.emitNext(e,i),r>a&&(a=r);this._channelSyncTimes[e]=a},f.prototype._createManager=function(){var t=this,e=this.manager=o.create();e.on("enterState",(function(e){t.emit(e)})),e.on("event",(function(e){t.emit(e)})),e.on("connect",(function(n){var r=t._socket=new t.backend.Socket(t._configuration);r.once("open",(function(){if(r!==t._socket)return r.removeAllListeners("message"),r.removeAllListeners("open"),r.removeAllListeners("close"),void r.close();t.logger().debug("socket open",r.id),e.established()})),r.once("close",(function(n,i){t.logger().debug("socket closed",r.id,n,i),r.removeAllListeners("message"),r.transport&&r.transport.close(),r===t._socket&&(t._socket=null,e.is("closed")||e.disconnect())})),r.on("message",(function(e){if(r!==t._socket)return r.removeAllListeners("message"),r.removeAllListeners("open"),r.removeAllListeners("close"),void r.close();t._messageReceived(e)})),r.on("error",(function(e){t.emit("socketError",e)})),e.removeAllListeners("close"),e.once("close",(function(){r.close()}))})),e.on("activate",(function(){null===t._socket?e.disconnect():(t._identitySet(),t._restore(),t.emit("ready"))})),e.on("authenticate",(function(){e.activate()})),e.on("disconnect",(function(){t._restoreRequired=!0,t._identitySetRequired=!0;var e=t._socket;e&&(e.removeAllListeners("message"),e.removeAllListeners("open"),e.removeAllListeners("close"),e.once("open",(function(){t.logger().debug("socket open, closing it",e.id),e.close()})),t._socket=null)})),e.on("backoff",(function(e,n){t.emit("backoff",e,n)}))},f.prototype._memorize=function(t){var e=t.getAttr("op"),n=t.getAttr("to"),r=t.getAttr("value");switch(e){case"unsubscribe":return this._subscriptions[n]&&delete this._subscriptions[n],!0;case"sync":case"subscribe":return"sync"!==this._subscriptions[n]&&(this._subscriptions[n]=e),!0;case"set":if(t.isPresence())return"offline"!==r?this._presences[n]=r:delete this._presences[n],!0}return!1},f.prototype._restore=function(){var t,e={subscriptions:0,presences:0,messages:0};if(this._restoreRequired){for(t in this._restoreRequired=!1,this._subscriptions)Object.prototype.hasOwnProperty.call(this._subscriptions,t)&&(this[this._subscriptions[t]](t),e.subscriptions+=1);for(t in this._presences)Object.prototype.hasOwnProperty.call(this._presences,t)&&(this.set(t,this._presences[t]),e.presences+=1);for(;this._queuedRequests.length;)this._write(this._queuedRequests.shift()),e.messages+=1;this.logger().debug("restore-subscriptions",e)}},f.prototype._sendMessage=function(t){var e=this._memorize(t),n=t.getAttr("ack");this.emit("message:out",t.getMessage()),this._socket&&this.manager.is("activated")?this._socket.sendPacket("message",t.payload()):this._isConfigured&&(this._restoreRequired=!0,this._identitySetRequired=!0,e&&!n||this._queuedRequests.push(t),this.manager.connectWhenAble())},f.prototype._messageReceived=function(t){var e=new h(JSON.parse(t)),n=e.getAttr("op"),r=e.getAttr("to");switch(this.emit("message:in",e.getMessage()),n){case"err":case"ack":case"get":this.emitNext(n,e.getMessage());break;case"sync":this._batch(e);break;default:this.emitNext(r,e.getMessage())}},f.prototype.emitNext=function(){var t=this,e=Array.prototype.slice.call(arguments);a((function(){t.emit.apply(t,e)}))},f.prototype._identitySet=function(){if(this._identitySetRequired){this._identitySetRequired=!1,this.name||(this.name=this._uuidV4Generate());var t={association:{id:this._socket.id,name:this.name},clientVersion:c()},e=this;this.control("clientName").nameSync(t,(function(t){e.logger("nameSync message: "+JSON.stringify(t))}))}};for(var g=[],d=0;d<256;d++)g[d]=(d<16?"0":"")+d.toString(16);f.prototype._uuidV4Generate=function(){var t=4294967295*Math.random()|0,e=4294967295*Math.random()|0,n=4294967295*Math.random()|0,r=4294967295*Math.random()|0;return g[255&t]+g[t>>8&255]+g[t>>16&255]+g[t>>24&255]+"-"+g[255&e]+g[e>>8&255]+"-"+g[e>>16&15|64]+g[e>>24&255]+"-"+g[63&n|128]+g[n>>8&255]+"-"+g[n>>16&255]+g[n>>24&255]+g[255&r]+g[r>>8&255]+g[r>>16&255]+g[r>>24&255]},f.setBackend=function(t){i=t},t.exports=f},function(t,e){t.exports=eio},function(t,e){function n(t,e,n){this.client=n,this.prefix=this._buildScopePrefix(t,e,n.configuration("accountName"))}for(var r=["set","get","subscribe","unsubscribe","publish","push","sync","on","once","when","removeListener","removeAllListeners","nameSync"],i=function(t){n.prototype[t]=function(){var e=Array.prototype.slice.apply(arguments);return e.unshift(this.prefix),this.client[t].apply(this.client,e),this}},s=0;s<r.length;s++)i(r[s]);n.prototype._buildScopePrefix=function(t,e,n){return t+":/"+n+"/"+e},t.exports=n},function(t,e,n){var r=n(0)("radar_state"),i=n(1),s=n(2),o=n(9);t.exports={create:function(){var t=new s,e=o.create({error:function(t,e,n,i,s,o,a){if(r.warn("state-machine-error",arguments),a){if(!this.errorHandler)throw a;this.errorHandler(t,e,n,i,s,o,a)}},events:[{name:"connect",from:["opened","disconnected"],to:"connecting"},{name:"established",from:"connecting",to:"connected"},{name:"authenticate",from:"connected",to:"authenticating"},{name:"activate",from:["authenticating","activated"],to:"activated"},{name:"disconnect",from:o.WILDCARD,to:"disconnected"},{name:"close",from:o.WILDCARD,to:"closed"},{name:"open",from:["none","closed"],to:"opened"}],callbacks:{onevent:function(t,e,n){r.debug("from "+e+" -> "+n+", event: "+t),this.emit("event",t),this.emit(t,arguments)},onstate:function(t,e,n){this.emit("enterState",n),this.emit(n,arguments)},onconnecting:function(){this.startGuard()},onestablished:function(){this.cancelGuard(),t.success(),this.authenticate()},onclose:function(){this.cancelGuard()},ondisconnected:function(n,i,s){this._timer&&(clearTimeout(this._timer),delete this._timer);var o=t.get();t.increment(),this.emit("backoff",o,t.failures),r.debug("reconnecting in "+o+"msec"),this._timer=setTimeout((function(){delete e._timer,e.is("disconnected")&&e.connect()}),o),t.isUnavailable()&&(r.info("unavailable"),this.emit("unavailable"))}}});for(var n in e._backoff=t,e._connectTimeout=1e4,i.prototype)Object.prototype.hasOwnProperty.call(i.prototype,n)&&(e[n]=i.prototype[n]);return e.open(),e.start=function(){this.is("closed")&&this.open(),this.is("activated")?this.activate():this.connectWhenAble()},e.startGuard=function(){e.cancelGuard(),e._guard=setTimeout((function(){r.info("startGuard: disconnect from timeout"),e.disconnect()}),e._connectTimeout)},e.cancelGuard=function(){e._guard&&(clearTimeout(e._guard),delete e._guard)},e.connectWhenAble=function(){this.is("connected")||this.is("activated")||(this.can("connect")?this.connect():this.once("enterState",(function(){e.connectWhenAble()})))},e.attachErrorHandler=function(t){"function"==typeof t?this.errorHandler=t:r.warn("errorHandler must be a function")},e}}},function(t,e){var n=n=t.exports={VERSION:"2.2.0",Result:{SUCCEEDED:1,NOTRANSITION:2,CANCELLED:3,PENDING:4},Error:{INVALID_TRANSITION:100,PENDING_TRANSITION:200,INVALID_CALLBACK:300},WILDCARD:"*",ASYNC:"async",create:function(t,e){var r,i="string"==typeof t.initial?{state:t.initial}:t.initial,s=t.terminal||t.final,o=e||t.target||{},a=t.events||[],c=t.callbacks||{},u={},h=function(t){var e=t.from instanceof Array?t.from:t.from?[t.from]:[n.WILDCARD];u[t.name]=u[t.name]||{};for(var r=0;r<e.length;r++)u[t.name][e[r]]=t.to||e[r]};i&&(i.event=i.event||"startup",h({name:i.event,from:"none",to:i.state}));for(var f=0;f<a.length;f++)h(a[f]);for(r in u)u.hasOwnProperty(r)&&(o[r]=n.buildEvent(r,u[r]));for(r in c)c.hasOwnProperty(r)&&(o[r]=c[r]);return o.current="none",o.is=function(t){return t instanceof Array?t.indexOf(this.current)>=0:this.current===t},o.can=function(t){return!this.transition&&(u[t].hasOwnProperty(this.current)||u[t].hasOwnProperty(n.WILDCARD))},o.cannot=function(t){return!this.can(t)},o.error=t.error||function(t,e,n,r,i,s,o){throw o||s},o.isFinished=function(){return this.is(s)},i&&!i.defer&&o[i.event](),o},doCallback:function(t,e,r,i,s,o){if(e)try{return e.apply(t,[r,i,s].concat(o))}catch(e){return t.error(r,i,s,o,n.Error.INVALID_CALLBACK,"an exception occurred in a caller-provided callback function",e)}},beforeAnyEvent:function(t,e,r,i,s){return n.doCallback(t,t.onbeforeevent,e,r,i,s)},afterAnyEvent:function(t,e,r,i,s){return n.doCallback(t,t.onafterevent||t.onevent,e,r,i,s)},leaveAnyState:function(t,e,r,i,s){return n.doCallback(t,t.onleavestate,e,r,i,s)},enterAnyState:function(t,e,r,i,s){return n.doCallback(t,t.onenterstate||t.onstate,e,r,i,s)},changeState:function(t,e,r,i,s){return n.doCallback(t,t.onchangestate,e,r,i,s)},beforeThisEvent:function(t,e,r,i,s){return n.doCallback(t,t["onbefore"+e],e,r,i,s)},afterThisEvent:function(t,e,r,i,s){return n.doCallback(t,t["onafter"+e]||t["on"+e],e,r,i,s)},leaveThisState:function(t,e,r,i,s){return n.doCallback(t,t["onleave"+r],e,r,i,s)},enterThisState:function(t,e,r,i,s){return n.doCallback(t,t["onenter"+i]||t["on"+i],e,r,i,s)},beforeEvent:function(t,e,r,i,s){if(!1===n.beforeThisEvent(t,e,r,i,s)||!1===n.beforeAnyEvent(t,e,r,i,s))return!1},afterEvent:function(t,e,r,i,s){n.afterThisEvent(t,e,r,i,s),n.afterAnyEvent(t,e,r,i,s)},leaveState:function(t,e,r,i,s){var o=n.leaveThisState(t,e,r,i,s),a=n.leaveAnyState(t,e,r,i,s);return!1!==o&&!1!==a&&(n.ASYNC===o||n.ASYNC===a?n.ASYNC:void 0)},enterState:function(t,e,r,i,s){n.enterThisState(t,e,r,i,s),n.enterAnyState(t,e,r,i,s)},buildEvent:function(t,e){return function(){var r=this.current,i=e[r]||e[n.WILDCARD]||r,s=Array.prototype.slice.call(arguments);if(this.transition)return this.error(t,r,i,s,n.Error.PENDING_TRANSITION,"event "+t+" inappropriate because previous transition did not complete");if(this.cannot(t))return this.error(t,r,i,s,n.Error.INVALID_TRANSITION,"event "+t+" inappropriate in current state "+this.current);if(!1===n.beforeEvent(this,t,r,i,s))return n.Result.CANCELLED;if(r===i)return n.afterEvent(this,t,r,i,s),n.Result.NOTRANSITION;var o=this;this.transition=function(){return o.transition=null,o.current=i,n.enterState(o,t,r,i,s),n.changeState(o,t,r,i,s),n.afterEvent(o,t,r,i,s),n.Result.SUCCEEDED},this.transition.cancel=function(){o.transition=null,n.afterEvent(o,t,r,i,s)};var a=n.leaveState(this,t,r,i,s);return!1===a?(this.transition=null,n.Result.CANCELLED):n.ASYNC===a?n.Result.PENDING:this.transition?this.transition():void 0}}}},function(t,e){t.exports=function(){return"0.16.7"}},function(t,e,n){const r=n(0)("message:request"),i={control:["nameSync","disconnect"],message:["publish","subscribe","sync","unsubscribe"],presence:["get","set","subscribe","sync","unsubscribe"],status:["get","set","subscribe","sync","unsubscribe"],stream:["get","push","subscribe","sync","unsubscribe"]},s=function(t){this.message=t,this._isValid()||(r.error("invalid request. op: "+this.message.op+"; to: "+this.message.to),this.message={})};s.buildGet=function(t,e,n={op:"get",to:t}){return new s(n).setOptions(e)},s.buildPublish=function(t,e,n={op:"publish",to:t}){const r=new s(n);return r.setAttr("value",e),r},s.buildPush=function(t,e,n,r,i={op:"push",to:t}){const o=new s(i);return o.setAttr("resource",e),o.setAttr("action",n),o.setAttr("value",r),o},s.buildNameSync=function(t,e,n={op:"nameSync",to:t}){return new s(n).setOptions(e)},s.buildSet=function(t,e,n,r,i,o={op:"set",to:t}){const a=new s(o);return a.setAttr("value",e),a.setAttr("key",n),a.setAttr("type",r),i&&a.setAttr("clientData",i),a},s.buildSync=function(t,e,n={op:"sync",to:t}){const r=new s(n).setOptions(e);return r.isPresence()&&r.forceV2Sync(e),r},s.buildSubscribe=function(t,e,n={op:"subscribe",to:t}){return new s(n).setOptions(e)},s.buildUnsubscribe=function(t,e={op:"unsubscribe",to:t}){return new s(e)},s.prototype.forceV2Sync=function(t={}){(t=t||{}).version=2,this.setAttr("options",t)},s.prototype.setAuthData=function(t){this.setAttr("userData",t.userData),t.auth&&(this.setAttr("auth",t.auth),this.setAttr("userId",t.userId),this.setAttr("userType",t.userType),this.setAttr("accountName",t.accountName))},s.prototype.getMessage=function(){return this.message},s.prototype.setOptions=function(t){return t&&this.setAttr("options",t),this},s.prototype.isPresence=function(){return"presence"===this.type},s.prototype.setAttr=function(t,e){this.message[t]=e},s.prototype.getAttr=function(t){return this.message[t]},s.prototype.payload=function(){return JSON.stringify(this.getMessage())},s.prototype.getType=function(){return this.type},s.prototype._isValid=function(){if(!this.message.op||!this.message.to)return!1;const t=this._getType();if(t){if(this._isValidType(t)&&this._isValidOperation(t))return this.type=t,!0}else r.error("missing type");return!1},s.prototype._isValidType=function(t){for(const e in i)if(Object.prototype.hasOwnProperty.call(i,e)&&e===t)return!0;return this.errMsg="invalid type: "+t,r.error(this.errMsg),!1},s.prototype._isValidOperation=function(t,e=i[t]){const n=e&&e.indexOf(this.message.op)>=0;return n||(this.errMsg="invalid operation: "+this.message.op+" for type: "+t,r.error(this.errMsg)),n},s.prototype._getType=function(){return this.message.to.substring(0,this.message.to.indexOf(":"))},t.exports=s},function(t,e,n){const r=n(0)("message:response");function i(t){this.message=t,this._validate()||(r.error("invalid response. message: "+JSON.stringify(t)),this.message={})}i.prototype.getMessage=function(){return this.message},i.prototype._validate=function(){if(!this.message.op)return this.errMsg="missing op",!1;switch(this.message.op){case"ack":if(!this.message.value)return this.errMsg="missing value",r.error(this.errMsg),!1;break;default:if("err"!==this.message.op&&!this.message.to)return this.errMsg="missing to",r.error(this.errMsg),!1}return!0},i.prototype.isValid=function(){return!!this.message.to&&!!this.message.value&&!!this.message.time},i.prototype.isFor=function(t){return this.getAttr("to")===t.getAttr("to")},i.prototype.isAckFor=function(t){return this.getAttr("value")===t.getAttr("ack")},i.prototype.getAttr=function(t){return this.message[t]},i.prototype.forceV1Response=function(){const t=this.message,e={};for(const n in t.value)if(Object.prototype.hasOwnProperty.call(t.value,n)){if(!t.value[n])continue;e[n]=t.value[n].userType}t.value=e,t.op="online",this.message=t},t.exports=i},function(t,e){t.exports=class{constructor(){const t=[...arguments];this.value=t,this.op="batch"}add(t){this.value.push(t)}get length(){return this.value.length}toJSON(){return{op:this.op,length:this.length,value:this.value}}}}]);