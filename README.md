# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## What saves

Custom weapon designs, Studio controls (including FOV), and Value Lab catalog edits are stored in this browser's local storage. Equipped weapons and progression use Cinderhollow's normal game save. Live player values such as current HP are temporary unless the game itself saves them. Clearing browser site data removes these stored values.

## Boss controls

Open F2 → World & Bosses. The picker lists the boss types available in the current game build, including later regions and secret bosses.

- **Native Boss Spawn:** Put one boss into the game's original boss slot with its native AI. Clear the spawned boss separately. Some bosses depend on their story arena. Exhibition deaths do not grant story rewards.
- **Quick Boss Arena:** Choose a boss, 1–50 copies, and Free-for-all or Hunt player. Start a fresh fight or add another wave.
- **One-on-One Duel:** Pick the two bosses yourself.
- **Team Battle Forge:** Build mixed rosters with up to eight named, colored teams. Set 1–50 copies per roster row, player allegiance, player target chance, boss health and damage, fight speed, camera, and friendly fire. Start a new battle or send reinforcements. Team setup is saved locally.
- **Random Tournament:** Choose 2, 4, 8, or 16 unique random entrants. Matches advance automatically.
- **Active Arena:** Pause or resume arena AI, heal living fighters, or clear the arena. Every living arena fighter has a separate health bar; bars disappear when that fighter dies.

Arena fighters use simplified attacks for multi-boss fights and give no story rewards. Turn off God mode in Quick Controls if you want their hits to damage you. Arena fights clear when you leave the room or reload.
