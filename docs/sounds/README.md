# Shared sounds

The birthday cards share one set of sounds, kept once in `public/templates/_sounds/`. A phone that has played one
birthday card already holds them for the next. A template names them in its `template.json` like its own files:

```json
"sound": {
  "music": "../_sounds/birthday.mp3",
  "soft": "../_sounds/birthday-soft.mp3",
  "volume": 0.5,
  "effects": { "blow": "../_sounds/blow.mp3", "horn": "../_sounds/horn.mp3", "shutter": "../_sounds/shutter.mp3" }
}
```

List only the effects the story plays, plus `shutter`: the kit plays it when a tap opens a photo. Nothing is fetched
until the viewer turns sound on. The story switches loops with `kit.music('soft' | 'music')` and plays an effect with
`kit.sfx(name, { volume, rate })`, usually behind `kit.once(key)`.

## Music

Both loops are "Happy Birthday" in C major, 3/4. Each plays the tune twice and loops seamlessly (a whole number of
samples, checked at the join).

| File                | What                                                                                                | Length   |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------- |
| `birthday.mp3`      | Party: xylophone tune over ukulele waltz strums, bass and shaker, then a whistled tune with claps   | 25.714 s |
| `birthday-soft.mp3` | Gentle: a music box plays the tune over a soft piano waltz, then the piano plays it under a descant | 34.286 s |

`birthday.mp3` is 112 BPM at −16.5 LUFS; `birthday-soft.mp3` is 84 BPM at −18.6 LUFS, a little quieter. The tune is
"Good Morning to All" (Mildred and Patty Hill, 1893), in the public domain. The arrangements are new, made in code for
these cards from CC0 instrument samples. They may be treated as CC0.

| Instrument                       | Source                                                                                                      | Licence |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------- |
| Ukulele                          | FreePats "Ukulele", http://freepats.zenvoid.org/GuitarFamily/ukulele.html                                   | CC0 1.0 |
| Bass                             | FreePats "Clean Electric Bass", http://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html         | CC0 1.0 |
| Xylophone                        | FreePats "Xylophone", http://freepats.zenvoid.org/ChromaticPercussion/xylophone.html                        | CC0 1.0 |
| Egg shaker, hand clap            | FreePats "World and Rare Percussion", http://freepats.zenvoid.org/Percussion/world-and-rare-percussion.html | CC0 1.0 |
| Piano                            | FreePats "Upright Piano KW", http://freepats.zenvoid.org/Piano/acoustic-grand-piano.html                    | CC0 1.0 |
| Whistle, glockenspiel, music box | Synthesized in code                                                                                         | none    |

## Effects

Every effect is levelled to the same loudness (about −20.5 LUFS at its loudest moment), under the music.

| File           | Sound                                        | Source (BigSoundBank, CC0)                                  |
| -------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `blow.mp3`     | Blowing out candles, 0.44 s                  | https://bigsoundbank.com/blow-hard-1-s1602.html             |
| `horn.mp3`     | A party horn (blower), 0.87 s                | https://bigsoundbank.com/party-horn-1-s1553.html            |
| `toot.mp3`     | A train whistle, "toot, toot, tooot", 2.2 s  | https://bigsoundbank.com/train-whistle-foley-7-s3321.html   |
| `firework.mp3` | One firework: launch, whistle, burst, 4.7 s  | https://bigsoundbank.com/fireworks-s0831.html (181.15 s in) |
| `sparkler.mp3` | A sparkler's crackle, 2.5 s                  | https://bigsoundbank.com/sparkling-candle-1-s1278.html      |
| `pop.mp3`      | A single pop                                 | https://bigsoundbank.com/pop-corn-corn-bursting-s0413.html  |
| `sparkle.mp3`  | A glockenspiel glissando up                  | https://bigsoundbank.com/glockenspiel-s0920.html            |
| `ting.mp3`     | A metallophone note                          | https://bigsoundbank.com/idea-2-s1399.html                  |
| `applause.mp3` | A burst of applause                          | https://bigsoundbank.com/applause-150-people-s0019.html     |
| `boing.mp3`    | A cartoon boing                              | https://bigsoundbank.com/boing-cartoon-8-s2284.html         |
| `shutter.mp3`  | A camera shutter (played when a photo opens) | https://bigsoundbank.com/trigger-of-camera-1-s2394.html     |
| `door.mp3`     | A creaking door opening                      | https://bigsoundbank.com/creaking-door-2-s3205.html         |
| `whoosh.mp3`   | A quick swoosh, 0.47 s                       | https://bigsoundbank.com/whoosh-8-s1801.html                |

Each BigSoundBank page states "CC0 (public domain): Free and royalty-free"; the site-wide licence page
(https://bigsoundbank.com/licenses.html) adds that the sounds may be shared, changed and used commercially. Checked
on 2026-10-22. No credit is needed on a card.
