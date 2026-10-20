/* Where the 3D cards' models come from: free packs that allow selling the cards (CC0), each read from a fixed commit so
   a rebuild gets the same bytes. A recipe names a model as "<source>/<file>", e.g. "kaykit/Knight". Nothing here needs
   an account. Credits are not required by CC0; the cards credit the authors anyway (template.json "credits"). */
const gh = (repo, sha, dir) => `https://raw.githubusercontent.com/${repo}/${sha}/${dir}/`;

export const SOURCES = {
  kaykit: {
    title: 'KayKit Adventurers', author: 'Kay Lousberg', license: 'CC0 1.0', home: 'https://kaylousberg.itch.io/kaykit-adventurers',
    base: gh('KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', '672074b73ba276876a19e8816ecdc5241817ab47',
      'addons/kaykit_character_pack_adventures/Characters/gltf'), ext: '.glb'
  },
  'kaykit-props': {
    title: 'KayKit Adventurers', author: 'Kay Lousberg', license: 'CC0 1.0', home: 'https://kaylousberg.itch.io/kaykit-adventurers',
    base: gh('KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0', '672074b73ba276876a19e8816ecdc5241817ab47',
      'addons/kaykit_character_pack_adventures/Assets/gltf'), ext: '.gltf'
  },
  furniture: {
    title: 'KayKit Furniture Bits', author: 'Kay Lousberg', license: 'CC0 1.0', home: 'https://kaylousberg.itch.io/furniture-bits',
    base: gh('KayKit-Game-Assets/KayKit-Furniture-Bits-1.0', '96d5930a8dbdb363409bbc2d3341718b00e17c9c', 'addons/kaykit_furniture_bits/Assets/gltf'),
    ext: '.gltf'
  },
  restaurant: {
    title: 'KayKit Restaurant Bits', author: 'Kay Lousberg', license: 'CC0 1.0', home: 'https://kaylousberg.itch.io/restaurant-bits',
    base: gh('KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0', '153c8a7535b48237854cb54ff6890679f8c574d1', 'addons/kaykit_restaurant_bits/Assets/gltf'),
    ext: '.gltf'
  },
  city: {
    title: 'KayKit City Builder Bits', author: 'Kay Lousberg', license: 'CC0 1.0', home: 'https://kaylousberg.itch.io/city-builder-bits',
    base: gh('KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0', '63976910ca04d16f0fc531b9c614244be8128713', 'addons/kaykit_city_builder_bits/Assets/gltf'),
    ext: '.gltf'
  },
  robot: {
    title: 'RobotExpressive', author: 'Tomás Laulhé (Quaternius), facial morphs by Don McCurdy', license: 'CC0 1.0',
    home: 'https://github.com/mrdoob/three.js/tree/r170/examples/models/gltf/RobotExpressive',
    base: gh('mrdoob/three.js', 'r170', 'examples/models/gltf/RobotExpressive'), ext: '.glb'
  }
};
