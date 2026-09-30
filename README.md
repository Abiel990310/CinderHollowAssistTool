# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## Automatic loading in Firefox

1. Install [Violentmonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/).
2. Open the [Cinderhollow Studio auto loader userscript](https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-auto.user.js) and choose **Install** in Violentmonkey. If the browser displays the script as text, use Violentmonkey → Dashboard → **Install from URL** with that same link.
3. Visit or reload [Cinderhollow](https://p4zox.github.io/cinderhollow/). The Studio loader fetches the latest `main` version automatically on every visit. Press **F2** to open the panel.

Disable the userscript in Violentmonkey to return to the unmodified game. Do not also paste the console snippet on the same visit.

## What saves

Custom weapon designs, Studio controls (including FOV), and Value Lab catalog edits are stored in this browser's local storage. Equipped weapons and progression use Cinderhollow's normal game save. Live player values such as current HP are temporary unless the game itself saves them. Clearing browser site data removes these stored values.

## Boss controls

Open F2 → World & Bosses. The picker lists the boss types available in the current game build, including later regions and secret bosses.

- **Native Boss Spawn:** Put one boss into the game's original boss slot with its native AI. Clear the spawned boss separately. Some bosses depend on their story arena. Exhibition deaths do not grant story rewards.
- **Quick Boss Arena:** Choose a boss, 1–50 copies, and Free-for-all or Hunt player. Start a fresh fight or add another wave.
- **One-on-One Duel:** Pick the two bosses yourself.
- **Team Battle Forge:** Build mixed rosters with up to eight named, colored teams. Set 1–50 copies per roster row, player allegiance, player target chance, boss health and damage, fight speed, camera, and friendly fire. Start a new battle or send reinforcements. Team setup is saved locally.
- **Random Tournament:** Choose 2, 4, 8, or 16 unique random entrants. Matches advance automatically.
- **Active Arena:** Pause or resume arena AI, heal living fighters, or clear the arena. Every living arena fighter has a separate health bar; bars disappear when that fighter dies. Defeated fighters play a short death animation, fade, and leave the arena after about two seconds.

Arena fighters use each boss's original sprite art and available attack animations, with scripted targeting and damage for multi-boss fights. Ground bosses spawn on the room floor beneath their position and follow nearby terrain as they move; bosses designed to float keep their intended height. The single native boss mode uses the game's original AI. Arena fights give no story rewards. If a sprite asset is missing, a visible stand-in appears instead. Turn off God mode in Quick Controls if you want their hits to damage you. Arena fights clear when you leave the room or reload.
