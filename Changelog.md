### 0.14.5
* Presence resource can set online and include client data (to be broadcasted
  as part of the client_online and client_updated events). 

### 0.14.4
* One change to the modfified set of build steps
  - use "npm version --no-git-tag-version patch" to bump the version locally
    but not create a git commit and tag
  - "npm run build" to update getClientVersion(), and update dist/
  - commit changes to GH
  - git tag version && git push --tags
  - npm publish

### 0.14.3
* No new code, but use a modified set of build steps
  - use "npm version --no-git-tag-version patch" to bump the version locally
    but not create a git commit and tag
  - "npm run version-build" to update getClientVersion()
  - commit changes to GH
  - git tag && git push --tags
  - npm publish

### 0.14.2
* Update package.json version to 0.14.2 and tag
  - getClientVersion() still returns 0.14.1

### 0.14.1
* Update package.json version to 0.14.1 and tag

### 0.14.0
* Code changes to support server side client state
  - generate client UUID; send to server as client name
  - auto-generate getClientVersion() and its source file
  - add nameSync method and new *control* scope

### 0.13.1
* Code cleanup
  - comment capitalization, comment line length, code line length
  - minor code standardization

### 0.13.0
* server version bump

### 0.12.1
* fix for bug created by using Work Offline mode in FF

### 0.12.0
* engine.io-client updated to v1.4.2

### 0.11.0
* Stream resource API added

### 0.10.0
* emit message events in a new context to avoid errors

### 0.9.3
* Perform a prepublish check for outdated dependencies and dirty working tree

### 0.9.1
* server version bump

### 0.9.0
* engine.io-client upgrade to v1.3.1

### 0.8.1
 - when using presence v1 (without message options)
    - internally use presence v2 for v1
    - translate v2 results to v1 format
 - alloc/ready logs only print when actually allocing

### 0.8.0
 - radar bump to v0.8.0

### 0.7.3
 - Update logging more

### v0.6.0
 - More logging fixes
 - Upgrade engine.io-client to 0.7.9

### v0.3.1
 - Update minilog to 2.0.5
 - Fix logging and reduce verbosity
