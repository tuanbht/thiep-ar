# Audio licences: Hai Đứa Mình — The Series (`our-sitcom`)

Every file comes from CC0 or public-domain material, or was synthesized in code. No credit line is
required, and redistribution, including serving the files publicly, is allowed. I checked each licence on its
source page on 2026-10-21. All files are mono, 44.1 kHz MP3.

**Levels.** Each file was measured with ffmpeg's EBU R128 meter after encoding.

- `music.mp3`: −16.6 LUFS integrated, true peak −1.5 dBTP.
- `music-soft.mp3`: −18.5 LUFS integrated. It is deliberately softer than the main loop.
- Effects: every effect peaks at about −20.5 LUFS momentary loudness, which is 4 dB under the music file. The
  very short transients (`clap`, `pop`) sit at about −23.5 LUFS, held by a −1.5 dBTP peak ceiling.

The player plays the music at `sound.volume` .5 (−6 dB) and the effects at full volume. At those defaults the
effects land about 2 dB above the music. Set `volume: 1` to keep them under the music.

## Music: original loops made for this card from CC0 instrument samples

No CC0 track matched the brief, so these are new compositions with no third-party melody. They may be treated
as CC0.

### `music.mp3`

A 16-bar loop: 105 BPM, C major, 36.571 s, exactly 1,612,800 samples. It loops seamlessly.

It plays ukulele strums with chucks, a whistled tune, a light bass, xylophone, egg shaker, claps and a few
glockenspiel notes.

| Part                  | Source page                                                           | Bank / entry                                                                                                                 | Author                                              | Licence line (quoted)                                                                                                                |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Ukulele               | http://freepats.zenvoid.org/GuitarFamily/ukulele.html                 | FreePats "Ukulele", version 2026-08-11                                                                                       | Mateusz Dąbrowski                                   | "Published under the terms of the Creative Commons CC0 1.0 public domain dedication."                                                |
| Bass                  | http://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html   | FreePats "Clean Electric Bass", Finger Bass YR, version 2019-09-30                                                           | Andrea Biasior                                      | "It was sent for inclusion in FreePats on September 2019, under the terms of the Creative Commons CC0 1.0 public domain dedication." |
| Xylophone             | http://freepats.zenvoid.org/ChromaticPercussion/xylophone.html        | FreePats "Xylophone" (medium mallets), version 2020-07-06, from the Versilian Community Sample Library                       | Versilian Studios; assembled by roberto@zenvoid.org | "Published under the terms of the Creative Commons CC0 1.0 public domain dedication."                                                |
| Egg shaker, hand clap | http://freepats.zenvoid.org/Percussion/world-and-rare-percussion.html | FreePats "World and Rare Percussion", version 2020-09-05                                                                     | Xavimart, Gonzalo, Roberto                          | "Published under the terms of the Creative Commons CC0 1.0 public domain dedication."                                                |
| Whistle, glockenspiel | none                                                                  | Synthesized in code. The whistle's tone was matched to a CC0 whistling recording, BigSoundBank #1162, which is not included. | none                                                | none                                                                                                                                 |

### `music-soft.mp3`

An 8-bar loop of piano with a music box: 70 BPM, C major, 27.429 s, exactly 1,209,600 samples. It is in the same
key as `music.mp3`, and its melody is the main tune's opening, slowed down.

| Part      | Source page                                                                            | Bank / entry                                          | Author           | Licence line (quoted)                                                                 |
| --------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Piano     | http://freepats.zenvoid.org/Piano/acoustic-grand-piano.html (Upright Piano KW section) | FreePats "Upright Piano KW", small version 2019-07-03 | Gonzalo, Roberto | "Published under the terms of the Creative Commons CC0 1.0 public domain dedication." |
| Music box | none                                                                                   | Synthesized in code                                   | none             | none                                                                                  |

## Effects: BigSoundBank (also known as LaSonothèque), no account needed

Each sound page states: "CC0 (public domain): Free and royalty-free".

The site-wide page at https://bigsoundbank.com/licenses.html states: "You are allowed to: Share, copy,
distribute and communicate the material by all means and in all formats. … Use, including for commercial
purposes. … This is: Creative Commons CC0 1.0 Universal … Public Domain Dedication."

| File           | Source page                                                | Entry                                               | Author                     | What was used                                                                    |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `clap.mp3`     | https://bigsoundbank.com/sound-propagation-1-m-s3262.html  | Sound propagation (1 m), a movie clapperboard       | Joseph SARDIN              | The one hit, with its room tone. The two mics were delay-aligned to make mono.   |
| `door.mp3`     | https://bigsoundbank.com/creaking-door-2-s3205.html        | Creaking Door #2                                    | Joseph SARDIN & Axeline T. | The opening creak (0.08–1.72 s) with a fade-out. The closing thud was left out.  |
| `splash.mp3`   | https://bigsoundbank.com/splash-small-1-s1529.html         | Splash, Small #1                                    | Joseph SARDIN              | The first 0.93 s, high-passed at 140 Hz so it sounds smaller.                    |
| `alarm.mp3`    | https://bigsoundbank.com/smoke-detector-alarm-s0800.html   | Smoke detector alarm #1                             | Joseph SARDIN              | Two beeps ("bíp bíp"), 1.6 s.                                                    |
| `sizzle.mp3`   | https://bigsoundbank.com/frying-pan-2-s0144.html           | Frying pan #2                                       | Joseph SARDIN              | 2.0 s taken from 6.0 s in, with fades.                                           |
| `pop.mp3`      | https://bigsoundbank.com/pop-corn-corn-bursting-s0413.html | Pop-Corn: Corn bursting                             | Joseph SARDIN              | A single clean pop, taken at 27.93 s.                                            |
| `boing.mp3`    | https://bigsoundbank.com/boing-cartoon-8-s2284.html        | Boing Cartoon #8, a harp imitating a cartoon bounce | Joseph SARDIN              | The first 1.25 s.                                                                |
| `applause.mp3` | https://bigsoundbank.com/applause-150-people-s0019.html    | Applause: 150 People                                | Joseph SARDIN              | A 1.4 s burst taken from 8.0 s in, with fades. There is no laughter (see below). |
| `ting.mp3`     | https://bigsoundbank.com/idea-2-s1399.html                 | Idea #2, a metallophone G                           | Joseph SARDIN              | The first 1.24 s, with a fade-out.                                               |
| `sparkle.mp3`  | https://bigsoundbank.com/glockenspiel-s0920.html           | Glockenspiel, a glissando up                        | Joseph SARDIN              | The last glissando, 1.79 s.                                                      |
| `shutter.mp3`  | https://bigsoundbank.com/trigger-of-camera-1-s2394.html    | Trigger of Camera #1, a Nikon D70S                  | Joseph SARDIN              | The whole sound, 0.42 s.                                                         |

**No laughter in the applause.** I found no CC0 or public-domain studio-audience laughter.

- BigSoundBank has applause but no audience laughter.
- Wikimedia Commons has "laughter and clapter" by lonemonk, but it is CC BY 3.0.
- OpenGameArt has only a close-miked voice-actor "Group giggling".

## Alternate main loop (not in `out/`)

The file is `../alt/music-alt-cozy-puzzle.mp3`. It is a 16-bar cut (35.556 s, 108 BPM) of a human-made CC0 track,
starting 8.889 s in. The seam is crossfaded over 60 ms, and the file is levelled to −16.4 LUFS.

- Source page: https://opengameart.org/content/cozy-puzzle-in-game-3
- Entry: "Cozy Puzzle In-Game 3"
- Author: MintoDog
- Licence line: "License(s): CC0"
