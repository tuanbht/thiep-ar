# Audio licences: Suất Chiếu Đặc Biệt (`drive-in`)

**Where the files live.** The two loops are in `public/templates/drive-in/sound/`; the nine effects are shared by every card, in `public/templates/_sounds/` (see `docs/sounds/README.md`).

Every file comes from CC0 material or was synthesized in code. No credit line is required, and redistribution,
including serving the files publicly, is allowed. I checked each licence on its source page on 2026-10-23. All files
are mono, 44.1 kHz MP3.

**Levels.** Each file was measured with ffmpeg's EBU R128 meter after encoding.

- `drive-in.mp3`: −16.0 LUFS integrated, true peak −1.6 dBTP, 96 kbps.
- `drive-in-soft.mp3`: −18.0 LUFS integrated, true peak −1.7 dBTP, 80 kbps. It is deliberately 2 dB softer than the
  main loop.
- Effects: each peaks at −20.4 to −20.8 LUFS momentary loudness, most at −20.5, with true peaks of −1.7 dBTP or
  lower; 64 kbps.

LAME 3.100 encodes mono about 0.45 dB quieter than its input, so both loops were levelled on the encoded MP3 itself.

The player plays the music at `sound.volume` .5 (−6 dB) and the effects at full volume. At those defaults the main
loop plays at about −22 LUFS, and the effects land about 1.5 dB above it.

## Music: an original ballad made for this card from CC0 instrument samples

No CC0 track matched the brief, so this is a new composition with no third-party melody. The tune, harmony, bass
line and arrangement were written for this card. It may be treated as CC0.

### `drive-in.mp3`

A 10-bar loop in 12/8 at 70 dotted-quarter BPM, in C major. It lasts 34.286 s, exactly 1,512,000 samples (151,200 per
bar), and it loops seamlessly.

| Bars | Time          | Chords             | What happens                                                                               |
| ---- | ------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| 1–4  | 0.00–13.71 s  | C – Am – F – G7    | The tune asks its question on the vibraphone and ends on the leading tone, B4.             |
| 5–8  | 13.71–27.43 s | C – Am – F Fm – G7 | The answer climbs to D6, then falls A–A♭–G over the borrowed minor iv and comes home to C. |
| 9–10 | 27.43–34.29 s | C Am – F G7        | The turnaround: I–vi–IV–V at two chords a bar. The brushes swell into the top.             |

The parts:

- **Vibraphone:** the tune, B4–D6, with the motor on (171 tremolo cycles a loop, 4.99 Hz). Each bar is damped as the
  next one is struck.
- **Piano:** rolling triplet arpeggios (root, fifth, octave, tenth and back) under every bar, with the pedal changed at
  each chord.
- **Upright bass:** a walking line in dotted quarters, with chromatic approach notes into each chord.
- **Drums:** brushes on a snare, slapped on beats 2 and 4, tapped lightly on the last triplet of each beat, and
  stirred continuously. A soft felt kick plays on beats 1 and 3.
- **Room:** a 1.5 s reverb, 12 LU under the dry mix.
- **Car radio:** the mix is band-limited at 75 Hz and 7.2 kHz (12 dB per octave), with +1 dB at 230 Hz, +2.5 dB at
  1.8 kHz for a small speaker's forward middle, and a trace of second-harmonic warmth. It is mono.

Every sample was retuned to equal temperament from its own measured sustain. The piano's stretch tuning was up to 15
cents off, and the bass samples up to 20 cents. The lead-in before each attack was trimmed, and the samples' levels
were matched.

| Part          | Source page                           | Bank / entry                                                                                                                                     | Author                                                                                         | Licence line (quoted)                                                                                                                                                                                                                                    |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vibraphone    | https://github.com/sgossner/VCSL      | Versilian Community Sample Library, `Idiophones/Struck Idiophones/Vibraphone/Soft Mallets`, the v2 layer: 11 notes, F3–E6                        | Versilian Studios LLC                                                                          | README: "This collection is under a Creative Commons 0 license. Essentially it's Public Domain- you can do whatever you want with these sounds (even make commercial software), no royalties, no credit, no special terms." LICENSE: "CC0 1.0 Universal" |
| Piano         | https://github.com/sgossner/VCSL      | Versilian Community Sample Library, `Chordophones/Zithers/Upright Piano, Knight`, the soft layer (vl1): 24 notes, F2–D♯6, sampled in whole tones | Simon Dalzell of Ivy Audio ("Sampled by Simon Dalzell of Ivy Audio for VSCO 2 Pro sample set") | The same README and LICENSE as above                                                                                                                                                                                                                     |
| Upright bass  | https://github.com/sgossner/VSCO-2-CE | VS Chamber Orchestra: Community Edition, `Strings/Solo Contrabass/Pizz`, the soft layer (v1), both round robins: 9 notes, A♯1–E3                 | Versilian Studios: recorded by Sam Gossner and Simon Dalzell, cut by Elan Hickler/Soundemote   | LICENSE: "CC0 1.0 Universal". The readme adds a request that is not a licence term: "Please provide credit to Versilian Studios/Sam Gossner, and/or Ivy Audio/Simon Dalzell where applicable". This file gives that credit.                              |
| Brushes, kick | none                                  | Synthesized in code                                                                                                                              | none                                                                                           | none                                                                                                                                                                                                                                                     |

### `drive-in-soft.mp3`

The same 10 bars at the same tempo and length, exactly 1,512,000 samples, so the two loops line up bar for bar.

- **Music box:** the tune, an octave above the vibraphone (B5–D7).
- **Piano:** the same arpeggios, played more softly with lighter roots. In bars 5–8 it also plays the tune at the
  vibraphone's octave.
- **Room and radio:** a 1.6 s reverb, 11 LU under the dry mix. The radio colour is gentler: a high-pass at 120 Hz and
  +1.5 dB at 1.2 kHz.

| Part      | Source page                      | Bank / entry                                           | Author                     | Licence line (quoted)                     |
| --------- | -------------------------------- | ------------------------------------------------------ | -------------------------- | ----------------------------------------- |
| Piano     | https://github.com/sgossner/VCSL | The Knight upright, as in `drive-in.mp3`               | Simon Dalzell of Ivy Audio | The VCSL README and LICENSE, quoted above |
| Music box | none                             | Synthesized in code: a comb-tine model with a pin tick | none                       | none                                      |

### Checks

- **The tune, note by note:** the strongest pitch in the tune's band just after each of the 57 onsets matches the
  score in both files. The main loop is within 3 cents. In the soft loop, one note in bar 6 reads as the piano's
  doubling an octave below the music box.
- **The seam:** each loop was rendered over three cycles and the middle one kept. Everything after that (reverb, EQ,
  tremolo, limiter) treats it as periodic. The MP3 was encoded with the loop's own last and first 576 samples around
  it. The LAME header's encoder delay and padding were then widened by 576, so decoders drop exactly that context; the
  header's CRC was recomputed. Decoded with ffmpeg, the join measures 0.0117 against 0.1186 elsewhere (99th
  percentile) in the main loop, and 0.0044 against 0.0305 in the soft loop.

**Safari note.** Chrome, Firefox and ffmpeg read the LAME header and decode exactly 1,512,000 samples. Apple's
AudioToolbox (`afconvert` on macOS) ignores the header, as it does for the shop's existing loops. It decodes
1,514,880 samples, with the loop starting at sample 1,152. If Safari behaves the same, the player can loop seamlessly
there by setting `loopStart = 1152 / 44100` and `loopEnd = (1152 + 1512000) / 44100` whenever the decoded buffer is
longer than 1,512,000 samples.

## Effects: BigSoundBank (also known as LaSonothèque), no account needed

Each sound page states: "CC0 (public domain): Free and royalty-free".

The site-wide page at https://bigsoundbank.com/licenses.html states: "You are allowed to: Share, copy, distribute and
communicate the material by all means and in all formats. … Use, including for commercial purposes. … This is:
Creative Commons CC0 1.0 Universal … Public Domain Dedication."

| File            | Source page                                                    | Entry                                                             | Author                     | What was used                                                                                                                                |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `projector.mp3` | https://bigsoundbank.com/8mm-projector-5-s2827.html            | 8mm projector, #5, a Magnon Duomatic DX87                         | Joseph SARDIN              | 0.20–2.45 s, starting on the switch's click. The motor runs up to full clatter by 0.9 s. A 0.55 s fade-out. 2.23 s.                          |
| `car.mp3`       | https://bigsoundbank.com/car-arrival-stop-departure-s0187.html | Car (Arrival, Stop, Departure), a Citroën Saxo                    | Joseph SARDIN              | The car braking to a stop, 17.15–19.95 s, with a 0.1 s fade-in and a 0.6 s fade-out. 2.85 s in all, with the handbrake below.                |
|                 | https://bigsoundbank.com/handbrake-activated-1-s3100.html      | Handbrake, activated #1, a Citroën C3                             | Joseph SARDIN & Axeline T. | The ratchet, 0.40–0.72 s, layered in at 2.30 s.                                                                                              |
| `rain.mp3`      | https://bigsoundbank.com/rain-and-storm-in-a-tent-s0820.html   | Rain and thunder in a tent                                        | Joseph SARDIN              | Rain on the tent's fabric roof, 18–25 s, a stretch with no thunder. High-passed at 70 Hz, with a 0.6 s fade-in and a 1.6 s fade-out. 7.00 s. |
| `thunder.mp3`   | https://bigsoundbank.com/thunder-5-s3116.html                  | Thunder #5, a single thunderclap without rain                     | Joseph SARDIN & Axeline T. | 0.75–3.75 s: a rolling rumble with no near crack and little above 2 kHz. A 1.0 s fade-out. 3.00 s.                                           |
| `softtop.mp3`   | https://bigsoundbank.com/flag-4-s1790.html                     | Flag #4, a shaken nylon flag                                      | Joseph SARDIN              | 0.21–1.15 s: a short flutter, one full "fwump" as the cloth opens, and two small flaps. 0.92 s.                                              |
| `flash.mp3`     | https://bigsoundbank.com/old-camera-trigger-s3022.html         | Old camera trigger, a Fex camera with a flashbulb                 | Cyanid Films               | 0.895–1.10 s: the shutter's tick, then the bulb's pop, after a synthesized charging whine (see below). 0.64 s.                               |
| `strip.mp3`     | https://bigsoundbank.com/old-calculator-ticket-1-s3264.html    | Old calculator, ticket #1, an Olivetti Logos 49 printing a ticket | Joseph SARDIN              | 0.00–1.42 s, low-passed at 7 kHz so the paper feed reads as a whirr. A 0.15 s fade-out. 1.38 s.                                              |
| `honk.mp3`      | https://bigsoundbank.com/old-car-horn-2-s0255.html             | Old car horn #2                                                   | DenisChardonnet            | One press, 0.035–0.47 s, used twice: a 0.24 s "bíp", then the full press at 0.36 s ("bíp bíp"). 0.80 s.                                      |

**Synthesized in code.**

- `beep.mp3`: a countdown-leader beep, a 1 kHz sine for 0.20 s with 4 ms and 6 ms raised-cosine edges.
- The charging whine in `flash.mp3`: a tone rising like a charging capacitor from 1.5 kHz to about 4 kHz over 0.5 s,
  with a little inverter buzz, 23 dB under the pop's peak.

**Flash timing.** The bulb pops about 0.52 s into `flash.mp3`. Start the sound about 0.5 s before the visual flash.

**Checks.** Every effect reaches −20 dB of its peak within 45 ms, so none starts with silence. Every effect ends at
zero, and none clips. The two sharp transients are part of the recordings: a tick at 0.41 s in `car.mp3`, which is in
the source at 17.56 s, and the shutter's tick at 0.44 s in `flash.mp3`.
