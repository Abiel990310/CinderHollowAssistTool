# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## Boss fights

Open **World & Bosses → Original Boss Fight** to fight a boss using the game's own Training Grounds summoner. It runs the original boss AI in its home arena, including its built-in attacks, phase changes, healing, teleporting, and effects where that boss has them. Pick a boss, click **Fight original boss**, then close the Studio panel with F2. You can choose another boss afterward. **Exit Training to title** restores your saved game; continue from the title screen.

Original fights are one boss against the player. The game uses one native boss slot and its boss AI targets the player. **Adapted Boss Arena**, duels, team battles, and tournaments remain available for boss-versus-boss fights, with simulated combat moves. The experimental **Native Boss Spawn** puts original AI in the current room and may miss arena-specific behavior; use Original Boss Fight for the intended encounter.
