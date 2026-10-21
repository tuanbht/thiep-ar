# Shared models

The 3D love cards share one couple, kept once in `public/templates/_models/`. A phone that has opened one love card
already holds the couple for the next. A template names them in its `template.json` like any other model:

```json
"models": { "boy": "../_models/boy.glb", "girl": "../_models/girl.glb" }
```

The same file under two names (for example `"boy2": "../_models/boy.glb"`) gives a second copy that shares the
geometry and textures. The sitcom card uses one so that each room on its revolving stage arrives with its pair already
in place.

## The couple

| File       | Who                                                                                   | Size   | Triangles |
| ---------- | ------------------------------------------------------------------------------------- | ------ | --------- |
| `boy.glb`  | Anh: Grab3D "Casual Man" (brown hair, light beard, olive bomber, jeans), 1.80 m       | 2.0 MB | 24,992    |
| `girl.glb` | Em: Grab3D "Casual Woman" (wavy auburn hair, rust blazer, wide navy trousers), 1.70 m | 2.0 MB | 24,992    |

Each has one material, one draw call and a single 1024 px WebP base-colour map. The files are plain glTF: no Draco, no
meshopt compression, no KTX2. The originals were 244k triangles and 13 MB each. They were cut down region by region
(face, hair, hands, body), and their texture was re-projected onto the cut-down mesh.

## Size in a story

Fit by height, because the rest pose is an A-pose. To keep their real heights, fit her at 0.945 of his:

```js
boy = kit.model("boy").fit({ height: H });
girl = kit.model("girl").fit({ height: H * 0.945 });
```

## Clips

They have 34 clips, retargeted from Quaternius's Universal Animation Library and named like KayKit's, so the love kit's
stories play on them:

- **Standing and moving:** `Idle`, `Walking_A`, `Walking_Backwards`, `Running_A`, `Running_B`, `Jump_Full_Short`.
- **Sitting and lying:** `Sit_Chair_Down` / `Sit_Chair_Idle` / `Sit_Chair_StandUp` / `Sit_Chair_Talk`, `Sit_Floor_Down` /
  `Sit_Floor_Idle` / `Sit_Floor_StandUp`, `Lie_Down` / `Lie_Idle` / `Lie_StandUp`.
- **Handling things:** `PickUp`, `PickUp_Table`, `Interact`, `Use_Item`, `Throw`.
- **Gestures and dances:** `Cheer`, `Wave`, `Clap`, `Point`, `Talk`, `Phone_Call`, `Look_Around`, `Idle_FoldArms`,
  `Dance_A`, `Dance_B`.
- **Kneeling:** `Kneel` / `Kneel_Idle` / `Kneel_StandUp`.

Play these once with `{ once: true }`: `Cheer`, `Sit_Chair_Down` / `StandUp`, `Sit_Floor_Down` / `StandUp`, `PickUp`,
`PickUp_Table`, `Interact`, `Use_Item`, `Throw`, `Lie_Down` / `StandUp`, `Jump_Full_Short`, `Kneel`, `Kneel_StandUp`.

KayKit clips that have no counterpart: `Hit_A`, `Hit_B`, `Jump_Idle`, `Running_Strafe_Right`, `Sit_Chair_Pose`,
`Spellbook_open`, and every weapon, spell and block clip. Nothing laughs or acts shy: use `Clap` or `Cheer`, or a
gesture made with `aim` / `bend`.

## What each file carries for the love kit

Each file's glTF scene `extras` carry two things:

- **`aliases`:** KayKit's bone names mapped to the couple's Mixamo-style ones, so a story written for KayKit (`aim('upperarm.r', …)`,
  `bend('chest', …)`, `node('head')`) still moves the right bone.

  | KayKit name                 | Bone                                     |
  | --------------------------- | ---------------------------------------- |
  | `upperarm.r` / `upperarm.l` | `RightArm` / `LeftArm`                   |
  | `lowerarm.r` / `lowerarm.l` | `RightForeArm` / `LeftForeArm`           |
  | `hand.r` / `hand.l`         | `RightHand` / `LeftHand`                 |
  | `chest`                     | `Spine`                                  |
  | `spine`                     | `Spine01`                                |
  | `head`                      | `Head`                                   |
  | `neck`                      | `Neck`                                   |
  | `hips`                      | `Hips`                                   |
  | legs                        | `RightUpLeg`, `RightLeg`, `RightFoot`, … |

  Each bone's +y runs to its child, as `aim` expects.

- **`pace`:** how much to slow each walk and run, so a speed written for KayKit's stride moves the couple's feet as far.
  KayKit's stride is 0.1 card widths a second for a 0.3-tall character at speed 1; the couple's legs are longer.

  | Clip                | Boy   | Girl  |
  | ------------------- | ----- | ----- |
  | `Walking_A`         | 0.684 | 0.594 |
  | `Walking_Backwards` | 0.684 | 0.594 |
  | `Running_A`         | 0.744 | 0.651 |
  | `Running_B`         | 0.483 | 0.424 |

  The kit applies these in `play()`. So keep writing speeds as `distance / seconds / (.1 * H / .3)`.

## Hands, chairs, floors

- **Hand slots** (`handslot.r`, `handslot.l`) sit inside the fist and use KayKit's axes: +y runs out of the thumb side
  (forward when the arms hang), +z is the back of the hand, and +x points to the fingertips on the right hand and to
  the wrist on the left. A prop built along +y at 0 sits in the fist. To stand a cup up while the arm hangs, turn it a
  quarter about z.
- **Chairs:** for `Sit_Chair_*`, the seat top is at 0.098 × H / 0.4 card widths for him and 0.102 × H / 0.4 for her.
  The hips settle 0.066 × H / 0.4 behind where they stood, so stand them that far in front of the seat.
- **Floor:** `Sit_Floor_*` leans back on both hands with the knees up, the hips about 0.21 m (at file scale) behind
  where they stood. `Lie_*` lies on the back, head towards −z.
- **Kneeling:** `Kneel` ends on the left knee, both hands together palms up in front of the chest: a ring box goes in a
  hand slot.
- **Faces:** no morph targets; the faces are texture only.

## What fitting the old cards taught

- **No clip reaches the floor.** `PickUp`'s hand stops about 0.33 m up, `Kneel`'s about 0.39 m: raise a prop to meet the
  hand. `PickUp` is about twice KayKit's length, so play it faster (about 1.9×).
- **`Sit_Floor_*` leans back 35–50°** and splays the left leg sideways, into anyone sitting on that side: give them room,
  or seat them on something (a bench, a log with space under it).
- **Heels.** Standing, the heels are about 5 cm behind the root, so a seat needs open space under its front edge; a solid
  log cuts into them.
- **`bend` about +z tips a bone to the character's own right.** Check a lean's sign by looking: several KayKit-era
  stories had it the wrong way round.
- **Hugs need them close,** with one pair of arms over the other (his over hers), or the arms cross.
- **A prop in an aimed hand points sideways:** after `aim` turns the arm, turn the prop in the hand slot back (or set its
  rotation each frame) so a cup stays upright.
- **Bend before you aim.** A `bend` of the back after an `aim` of the arms swings the aimed arm: bend first, then aim.
- **Chibi-height scenery** (railings, a ship's bow, seats, a bike) sits at the adults' knees: resize or raise it.
- **The bones are in centimetres.** A prop parented straight onto a bone and placed in card widths lands about 100× off.
  Use `model.hold(prop, slot)`, which keeps the prop's stage size, or divide by the bone's world scale.
- **Clip facts:** `Throw` lets go about 0.33 s in, `Cheer` raises only the left arm, and `Use_Item` gives with the left
  hand (a right-hand prop would be handed over by an empty hand), and `Jump_Full_Short` lands in a crouch about 41 cm deep.
- **Leftover KayKit code:** recolouring that paints squares on the clothes, and hats or flowers sized for KayKit's big
  heads. Remove the first; refit the second.

## Licences

- **Grab3D Casual Man and Casual Woman: CC0 1.0.** "To the extent possible under law, Grab3D has waived all copyright
  and related or neighboring rights to the 3D models, textures and images in this package." They were made with an AI
  image-to-3D tool (Meshy). Sources: https://grab3d.com/models/characters/man/ and https://grab3d.com/models/characters/woman/.
- **Quaternius Universal Animation Library 1 and 2 (Standard): CC0 1.0.** Sources:
  https://quaternius.itch.io/universal-animation-library and https://quaternius.itch.io/universal-animation-library-2.
  Quaternius's site moved to a new licence on 28 August 2026; these copies were released as CC0 and stay CC0.

The licence files are in `docs/models/licenses/`. No credit is needed on a card.
