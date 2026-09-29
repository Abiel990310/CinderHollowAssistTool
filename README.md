# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## What saves

Custom weapon designs, Studio controls (including FOV), and Value Lab catalog edits are stored in this browser's local storage. Equipped weapons and progression use Cinderhollow's normal game save. Live player values such as current HP are temporary unless the game itself saves them. Clearing browser site data removes these stored values.

## Boss Battle Forge

Open F2 → World & Bosses → Boss Battle Forge. The boss picker is generated from the game's current boss registrations, including its later regions and secret bosses.

- Add up to eight teams, give each a name and color, and build each roster from multiple boss types. Set 1–50 copies per roster row; add more rows for larger squads.
- Choose a player side: Neutral, Spectator, or one of your teams. Neutral can be attacked by all teams. Spectator is ignored by arena bosses. Friendly fire controls whether your attacks can hit allies.
- Adjust player target chance, boss health, boss damage, fight speed, and camera tracking. Health changes apply to newly spawned bosses; damage, allegiance, and friendly fire can be changed while fighting.
- Start a fresh team battle or send your saved roster as reinforcements. A one-team roster with Neutral player side is a survival fight. The random boss tournament remains available.
- Each living boss gets a separate health bar labeled by team. Bars disappear when that boss dies. Team rosters and settings are saved locally; active arena fights are temporary.

Arena bosses use simplified attacks for multi-boss fights. Defeating them does not grant story rewards or mark story bosses defeated. Turn off God mode in Quick Controls if you want their hits to damage you. Arena fights clear when you leave the room or reload.
