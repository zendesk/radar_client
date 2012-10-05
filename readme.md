# Radar Client

## Resource types

Radar has three different resource types:

1. Status = "a hash that you can subscribe to, like the last updated date of a ticket in agent collision". Status resources can have multiple values (e.g. browser, phone, unavailable).
2. Presence = "an (active) user that can receive push notifications about this scope, like a indicator that a user is available for chat or for voice calls". Presence is tied to the current user.
3. Message = "a ordered stream of messages about a scope, like a chat message stream". Message lists contain ordered information that can be appended to, and can be synchronized. In the event of a connection loss, any messages sent while disconnected are sent when the connection is re-established.

### Getting started

Here's a quick example that shows how you can get started with the Radar client:

    RadarClient
      .alloc('my_functionality', function() {
         RadarClient.status("invite/1234")
            .on(function(msg) { console.log(msg) })
            .sync();
      });

"my_functionality" is an arbitrary name for your functionality, which is used to determine whether to keep the connection alive or not.

API calls - see api/readme.md for more examples:

    curl -k -H "Content-Type: application/json" -X POST -d '{"accountName":"support","scope":"invite/1234","key":"greeting","value":"hello"}' https://support.localhost/node/stalker/status

### Safe connection API: .alloc() .dealloc()

The problem: multiple pieces of functionality within a single app can need a persistent connection. If connect() and disconnect() directly control the connection state, then the different pieces of functionality need to coordinate so that disconnects() only happen when the last piece needing a connection calls disconnect.

The solution: alloc(name, callback) and dealloc(name).

- .alloc(name, callback)
  - Ensures that a connection is established, then calls callback
  - The name any string, associated with the functionality (e.g. chat, agent_collision, voice etc.)

- .dealloc(name)
  - Indicates that the functionality "name" doesn't need the connection anymore
  - When no-one needs the functionality, issues a disconnect

Unlike a simple counter, alloc() and dealloc() can be safely called multiple times.

### Event handlers

All scopes accept event handlers. You have three choices:

- on(callback): attach a handler (until explicitly removed)
- once(callback): only executes once; e.g. on the next message it is removed
- when(callback): should a boolean. If the return value is true, then the handler is removed. Useful for waiting for a specific message.

Callbacks generally accept one argument, which is the message returned from the backend.

### Acknowledgement messages & callbacks

Many functions take an optional [ack] argument, which is a callback function. If the ack callback is specified, the client requests an acknowledgement (ACK) from the server, and runs the callback when the ACK is received. This is useful for tests and when you want to be sure that an operation has completed before going to the next one.

### Status API methods .status("scope").*

- .get(callback)
  - Immediately retrieves the status resource content and returns it.
  - callback(message): message is a JSON object, which looks like this:

    {
      "op": "get"
      "value": { "123": "foo" }
    }

Here, 123 is the user ID, and "foo" is the value set by calling status('abc').set('foo');

You can set the value to an arbitrary JSON object: ```.status('voice/status').set({ hello: "world" });```

- .set('foo', [ack])
  - Sets status
- .subscribe([ack])
  - Subscribes to notifications
- .unsubscribe([ack])
  - Removes a subscription

### Presence API methods .presence("scope").*

- .get(callback)
  - Immediately retrieves the presence resource content and returns it.
  - callback(message): message is a JSON object, which looks like this:

    {
      "op": "get"
      "value": { "123": 0 }
    }

Here, 123 is the user ID, and 0 is the user's type (0 = enduser, 2 = agent, 4 = admin).

If the user is offline, they will not be included in the result.

- .set('online', [ack]) / .set('offline', [ack])
  - Sets presence
- .subscribe([ack])
  - Subscribes to notifications on the current presence resource (which includes the current user and other users that act on that presence resource)
  - Note: the callback
- .unsubscribe([ack])
  - Removes a subscription

### Message list API methods

Note: the API here conforms to the Drone API so that we can transition from Drone to Radar_client fairly easily.

- .subscribe('channel')
- .unsubscribe('channel')
- .sync('channel')
- .publish('channel', message)

## Client states

There are a few states that the client UI should handle gracefully:

- "connected" AKA "ready": This should be a once() callback, and set up the basic UI.
- "disconnected": If this state occurs, then the UI should be set in a state that 1) makes it clear that communication is currently not possible and 2) allows the user to perform a reconnection. For example, gray out all users in a chat and show a yellow notification stating "reconnecting".
- "reconnecting": the notification should change to show that a reconnection is in progress or is pending:
  reconnecting(in_seconds) events should occur.
- "reconnected": the notification should change to show that the user is now connected again.
- "unavailable": If this state occurs, then the UI should show a message that the connection could not be established.
