# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## What saves

Custom weapon designs, Studio controls (including FOV), and Value Lab catalog edits are stored in this browser's local storage. Equipped weapons and progression use Cinderhollow's normal game save. Live player values such as current HP are temporary unless the game itself saves them. Clearing browser site data removes these stored values.

## Boss Arena

Open F2 → World & Bosses → Boss Arena. Pick a boss and a count (1–50 per click); click again to add more. Every spawned boss has its own health bar in a scrollable stack and can be damaged by the player. Brawl mode lets bosses damage each other and the player; Hunt mode sends them after the player. You can also run a two-boss clash or an eight-boss tournament, adjust fight speed, and switch the camera between the player and the arena.

Arena fights use simplified attacks so multiple bosses can run together. They do not grant story rewards or mark bosses defeated. Turn off God mode in Quick Controls if you want boss attacks to damage you. Arena spawns are temporary and clear when you leave the room or reload.
