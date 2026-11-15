## V 1.0.0
- First stable version.

## V 1.0.1
- Fixed some file transfer bugs

## V 1.1.0
- Added new taskbar layout

## V 1.1.1
- Various bug fixes

## V 1.1.2
- Fixed the file upload bug once and for all

## V 1.1.3
- Emergency patch

## V 1.1.4
- Fixed some bugs in zmcd.js (auth/login/signup)

## V 1.1.5
- Added a reset system option

## V 1.1.6
- Added rate limit to systemRecovery server endpoint

## V 1.1.7
- Fix quota leaks and rewrite a lot of storage quota logics

## V 1.1.8
- Organized how login/signup/auth work

## V 1.2.0
- Added 2 features for untrusted iframe apps: 1. close its own window 2. iframe apps can now launch other apps on the user's cloud device if the user give it the permission to do so.

## V 1.2.1
- When session has expired, the caller will still get a response if the user refilled the session.

## V 1.2.2
- Fixed a bug when the retry for session expired for writefile don't use the new session token

## V 1.2.3
- fixed a rate limit get IP bug, file organizations for the rate limit logic.

## V 1.2.4
- Added screenshot ability

## V 2.0.0
- New app (Terminal), the old one is removed.

## V 2.1.0
- Massive update for terminal. it has reached its 1st stable version.

## V 2.1.1
- Minor update on display for ls cmd, added resetpathperms in systemrecovery.

## V 2.1.2
- update readme, fixed a bug in terminal where you can run app custom commands without the apps name in front, fixed a security hole where app command scripts can be from files out of their app program folder

## No version increase - 1
- fixed server performance issue, various bug fixes
- remove the iframe hook after sign out

## V 2.1.3
- Dramatically increased the startup speed of the os, 8 sec to 1 sec.

## No version increase - 2
- removed the excessive loadappsfromtrees

## V 2.2.0
- Added cli file create/edit tool

## No version increase - 3
- cmd autocomplete disabled during prompt input via workers. Ctrl+C will also remove existing text in cmd input other than killing the thread.
- edited pastefile behavior
- fixed some minor bugs with app update and outdated docs
- last update cont, also fixed a bug with app update intoduced last time
- fixed a bug introduced by recent updates regarding unable to reuse pid

## V 2.2.1
- require password for app installations

## No version increase - 4
- app management settings in the settings app loads faster than before now.
- for users that have removed their app dir, the reset system app option still works now

## V 2.2.2
- Patched some security vulns via ai

## V 2.2.3
- added getbounds and setbounds for windows

## No version increase - 5
- removed support for svg app icons because png is enough also svg rendering is a huge mess
- combined some tiny systemfiles together

## V 2.2.4
- Added nested iframe creation blocks for iframe apps

## V 2.2.5
- Iframe apps will be redirected back if it tries to navigate itself. Iframe apps cannot create more Iframes. Iframe apps cannot make workers in workers. Iframe apps cannot use network api in workers.

## V 2.2.6
- Iframe apps can reference user picked files from file explorer (NOT File Picker), using window.userPickedFileHandle
- Iframe apps can also do setBounds({left, top, width, height, minimize(true/false), maximize(true/false)})
- Iframe apps can have a startup pos, which tells the runtime what its initial dimensions is

## V 2.3.0
- Patched a security vulnerability where apps can call their own function with the path argument and then enables them to access all files.
- Added maximize and minimze options for startup pos.
- Added /__public which is a folder that all apps can read and write (shared space)
- rewrite the docs via (AI slop)

## V 2.3.1
- reworked how update system works.

## V 2.3.2
- Added filesystem access key revoke menu in settings, added ping system to detect unresponsive apps, a bug fix for headless apps being able to be shown in all apps section of startmenu.

## V 2.3.3-pre
- removed some sync operations in server (WARNING: more testing required to see if theres any issues introduced)
- fixed an ai introduced bug for (File/Folder)Exists() regarding the api contract between client and server.

## V 2.3.3
- added extra key protections in file explorer open file.
- fixed a bug where zmcdpost ask for token refill when recieved 401 which it shouldn't because the endpoint requires password.

## V 2.3.4
- tweaked how paste/clipboard works.
- added notification lists and startupNotifications

## V 2.3.4
- fixed a paste file bug last update introduced, reworked how server bans work

## V 2.3.5
- Added moderator ban panel

## V 2.4.0
- Added desktop shortcuts (major feature)

## V 2.4.1
- Switching windows can now switch to minimized apps, fixed various shortcut bugs.

## V 2.4.2
- bulk update on shortcuts

## No Version Increase - 6
- Added all member mail feature

## V 2.5.0
- added invisible dragstrip, so you can still do stuff with the top of the window for iframe apps. Use element.addEventListener('pointerdown', (event) => event.stopPropagation()); on elements that dont want to be able to drag the window.

## V 2.5.1
- Fixed a thread/process termination bug in cleanup, Added Force Stop Option
- Prevent headless apps be launched in shortcuts
- Added launch app feature for headless background services
- Various bug fixes

## V 2.5.2
- Fixed some bugs.
- Close windows via keyboard shortcut now dont require focus anymore, it closes the window at top.
- Added setAskUserBeforeClose, setTitlebarVisibility, setTheme apis for iframe apps and some corresponding fields in entry.json if any.

## V 2.5.3
- Updated some system UI

## V 2.5.4
- fixed some cursor shaping bugs.

## V 2.5.5
- added set dragstrip visibility
- fixed some file picker placement bugs
- Fixed cursor change for app window when launching apps.

## No version increase - 7
- tweaked some taskbutton size
- update tip text for alt tab from switch windows to active windows.
- added friendly message for async browser features that just happens silently b4.

## V 2.5.6
- added loading screen on startup. combined with the last update into a new version.

## V 2.6.0
- perms/full system profile file purge after app deletion.
- **filesystem watchers.**

## V 2.6.1
- testing fs watchers
- added disable notifications
- added an update system button for those who dont use autoupdate
- reminder: you can take screenshot via ctrl+shift+s, it is saved in /screenshot now.

## V 2.6.2
- Fixed some memory leak to the best of my ability.
- malformed app packages will also show in the app list in settings.
- various bug fixes.
- tweaked default window sizes.

## V 2.6.3
- Fixed a docs mismatch with the real writeline api in CLI.
- removed legacy trailing /root/ in front of path more.
- added zip and unzip for zipUtility app.

## V 2.6.4
- Removed startup tree loader (expensive).
- which made goldenbody 10x faster than b4.

## V 2.7.0
- **Update Rammerhead to newest version**
- Removed excessive treedata fetch in file pickers.
- Added multiple support for file/folder picker for iframe apps.
- new normal for the compact taskbar, updated taskbar to be more compact for the compact mode.
- Added take screenshot in shortcuts tab.
- Fixed spamming login/signup creates dupe load overlays that wont clear.
- Fixed double window open in iframe apps when using ctrl+n
- File name overflow handling. 
- Fixed "All Files Loaded." style dont dynamic change
- Added __goldenbodyAPI.getAvaliableAppsToLaunch() for iframe apps.
- Updated login/signup page so users wont think they got stuck by more state feedback.
- Some annoying bugs fixed are not documented.

# FlowAway GoldenBody has reached a new stable era, It will offically enter the "Age Of Bug Fixing".

# V 2.7.1
- Removed the broken app unresponsiveness checks.
- Fixed stale rendering in file pickers.
- Added loading status for file pickers.
- Open in browser when clicking on screenshot thumbnail.
- Fixed startup notifications from app package errors not shown in notification logs.
- Added status feedback for cmd that does stuff to the cloud drive, if a cmd is taking longer than expected output xxxing...

# V 2.7.2
- Fixed this system doesn't hide startmenu when app contextmenu is clicked.
- Added loading indicator for browser file pickers.
- Fixed clicking on apps dont hide startmenu, statusmenu.
- Fixed browser download status notification arrives too late.
- update landing page so its more appropriate.
- Note: apps such as browser are "government owned businesses" meaning they are still an normal app just developed by me, FlowAway GoldenBody, it's a great example if you want to learn how to build an admin (system) app.

# V 2.7.3
- Make cancel btn work for file pickers even before items loaded, especially browser.
- Imporved security for iframe apps such as their ability to fake message itself.
- Pointer lock will exit when the iframe requests it and the user hit esc.
- Fixed how some rendering stuff to remove redundant rendering such as rerender all entries when the user selects one.
- Patched the possible exploit to create millions of empty files and folders which isnt registered in the quota.
- Fixed some server error handling

# V 2.7.4
- fixed startup notification frequently do not log in the notifications panel.
- fixed limit of display for search in file explorer, bug introduced by slop.ai.
- fixed "kill" cmd in terminal saying it killed processes that don't exist, change the wording from thread to process to make sure the wording is unified. 
- fixed iframe app windows not self closing when the process is killed for whatever reason.
- added beforeunload guards in homepage to prevent accidental navigations.
- updated the create shortcut in showUnifiedAppContextmenu() to report progress if needed.
- added search feature for file pickers, along with date and size display.
- fixed upload and then upload causes the progress bar to become funky in file explorer.
- fixed move temporary consumes quota and can cause data loss when storage is full.
- fixed writing existing files dont consume quota, bug introduced from the last update.
- the server now sends more descriptive error message whenever the server sends a non 200 code.
- fixed critical exploit with pastefile to steal js keys.
- fixed path traversal bugs for clipboard for pastefile/folder.
- tweaked error msg and trigger conditions of fs operations.
- fixed permadelete file dont clear quota on client side.
- added css for buttons in settings and text editor settings, session expired dialog.

# V 2.7.5
- Fixed recursive folder creation evading quota
- Added more error handling in writefile
- fixed the full buffering for uploading.
- fixed zmcd.js accepting bodies without limit.
- removed server clipboard persistance because its unneeded.
- fixed more filesystem bugs.
- added getperm cmd in terminal to get the path permission of the target path.
- file explorer now refreshes every fs operation automatically

# V 2.7.6
- fixed docs errors in settings.
- fixed bugs that leads to hanging promises for fs operations for iframe apps.
- added force arg for __goldenbodyAPI.closeWindow(force = true|false)
- added server storage ranges in /zmcdfiles
- updated dev docs for apps.
- added askuserbeforeclose in terminal interface.
- added account operation helpers
- fixed a long time bug where autocomplete in terminal doesn't work when inputting args
- fixed a bug where autocomplete in terminal inserts extra / in front of paths
- updated behavior to allow readfolder/(file/folder)exists api to work under all conditions in terminal

# V 2.7.7
- added user guide in settings app.
- fixed path only arguments in terminal breaks the tokenizer
- change taskbar reveal ms to default 1 ms
- cursor to wait should apply to all thats not a normal pointer, fixed some performance issues regarding looping all DOM elements when setting cursor.
- fixed arguments given to terminal workers is not object