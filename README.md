# Cinderhollow Studio browser loader

Open [Cinderhollow](https://p4zox.github.io/cinderhollow/), open Developer Tools → Console, and paste this same snippet each time:

```js
fetch('https://raw.githubusercontent.com/Abiel990310/CinderHollowAssistTool/main/cinderhollow-op-loader.js?'+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Loader '+r.status);return r.text()}).then(code=>(0,eval)(code)).catch(console.error)
```

The snippet fetches the current `main` version of `cinderhollow-op-loader.js` with a cache-busting timestamp, so updates to that file do not change what you paste. Press F2 to open the editor.

The loader runs only on the Cinderhollow page or a local test host. It modifies the current tab and may change the browser's local Cinderhollow save.

## Boss fights

Open **World & Bosses → Original Boss Fight** to fight a boss using the game's own Training Grounds summoner. It runs the original boss AI in its home arena, including its built-in attacks, phase changes, healing, teleporting, and effects where that boss has them. Pick a boss, click **Fight original boss**, then close the Studio panel with F2. You can choose another boss afterward. **Exit Training to title** restores your saved game; continue from the title screen.

**Original Boss Fight** is one boss against the player. The game uses one native boss slot and its boss AI targets the player. **Adapted Boss Arena**, duels, team battles, and tournaments remain available for boss-versus-boss fights with simulated combat moves. The experimental **Native Boss Spawn** puts one original AI boss in the current room and may miss arena-specific behavior; use Original Boss Fight for the intended player encounter.

### Experimental original-AI teams

In **Team Battle Forge**, set each team's boss types and counts, then click **Start original-AI teams**. This runs each spawned boss's original update, attack, animation, and phase methods while routing direct hits, projectiles, and hazards toward opposing bosses. It supports up to 100 fighters in the current room, including a Training Grounds room. The panel closes when the fight starts. Errors appear immediately beneath the button when you reopen it with F2. Cutscenes, rewards, and saving are suppressed during the battle; **Clear arena** restores the prior boss flags. Start with a 1v1 match to check the selected bosses before trying large groups.

This is an experimental compatibility layer, not a guarantee that every home-arena move works in every room. Bosses with special room scripts may fail and will be marked as needing an arena adapter. The existing adapted modes remain available, and the built-in Training Grounds remains the option for a complete player-versus-boss encounter.

**Original-AI team balance:** Boss health is each boss's game HP multiplied by **Boss health %** when spawned. Direct attacks and hazards use the game's original attack damage multiplied by **Boss damage %**; the game's global boss damage scale is already part of that original value. Redirected projectiles use their original projectile damage multiplied by **Boss damage %**, without player weapon bonuses. The sliders default to 100%. Phase changes and game-specific hit reactions may change the final damage.
