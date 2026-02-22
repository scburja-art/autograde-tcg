import { v4 as uuidv4 } from "uuid";
import db, { initializeDatabase } from "./index";

interface CardSeed {
  name: string;
  number: string;
  set_name: string;
  set_code: string;
  rarity: string;
}

const cards: CardSeed[] = [
  // Base Set (BS)
  { name: "Charizard", number: "4/102", set_name: "Base Set", set_code: "BS", rarity: "holo rare" },
  { name: "Blastoise", number: "2/102", set_name: "Base Set", set_code: "BS", rarity: "holo rare" },
  { name: "Venusaur", number: "15/102", set_name: "Base Set", set_code: "BS", rarity: "holo rare" },
  { name: "Alakazam", number: "1/102", set_name: "Base Set", set_code: "BS", rarity: "holo rare" },
  { name: "Machamp", number: "8/102", set_name: "Base Set", set_code: "BS", rarity: "holo rare" },
  { name: "Pikachu", number: "58/102", set_name: "Base Set", set_code: "BS", rarity: "common" },
  { name: "Charmeleon", number: "24/102", set_name: "Base Set", set_code: "BS", rarity: "uncommon" },
  { name: "Bulbasaur", number: "44/102", set_name: "Base Set", set_code: "BS", rarity: "common" },

  // Jungle (JU)
  { name: "Flareon", number: "3/64", set_name: "Jungle", set_code: "JU", rarity: "holo rare" },
  { name: "Jolteon", number: "4/64", set_name: "Jungle", set_code: "JU", rarity: "holo rare" },
  { name: "Vaporeon", number: "12/64", set_name: "Jungle", set_code: "JU", rarity: "holo rare" },
  { name: "Scyther", number: "10/64", set_name: "Jungle", set_code: "JU", rarity: "holo rare" },
  { name: "Pikachu", number: "60/64", set_name: "Jungle", set_code: "JU", rarity: "common" },

  // Fossil (FO)
  { name: "Gengar", number: "5/62", set_name: "Fossil", set_code: "FO", rarity: "holo rare" },
  { name: "Dragonite", number: "4/62", set_name: "Fossil", set_code: "FO", rarity: "holo rare" },
  { name: "Lapras", number: "10/62", set_name: "Fossil", set_code: "FO", rarity: "holo rare" },
  { name: "Aerodactyl", number: "1/62", set_name: "Fossil", set_code: "FO", rarity: "holo rare" },
  { name: "Kabuto", number: "50/62", set_name: "Fossil", set_code: "FO", rarity: "common" },

  // Team Rocket (TR)
  { name: "Dark Charizard", number: "4/82", set_name: "Team Rocket", set_code: "TR", rarity: "holo rare" },
  { name: "Dark Blastoise", number: "3/82", set_name: "Team Rocket", set_code: "TR", rarity: "holo rare" },
  { name: "Dark Dragonite", number: "5/82", set_name: "Team Rocket", set_code: "TR", rarity: "holo rare" },
  { name: "Dark Gyarados", number: "8/82", set_name: "Team Rocket", set_code: "TR", rarity: "holo rare" },
  { name: "Dark Raichu", number: "83/82", set_name: "Team Rocket", set_code: "TR", rarity: "secret rare" },

  // Neo Genesis (N1)
  { name: "Lugia", number: "9/111", set_name: "Neo Genesis", set_code: "N1", rarity: "holo rare" },
  { name: "Typhlosion", number: "17/111", set_name: "Neo Genesis", set_code: "N1", rarity: "holo rare" },
  { name: "Feraligatr", number: "5/111", set_name: "Neo Genesis", set_code: "N1", rarity: "holo rare" },
  { name: "Meganium", number: "10/111", set_name: "Neo Genesis", set_code: "N1", rarity: "holo rare" },
  { name: "Pichu", number: "12/111", set_name: "Neo Genesis", set_code: "N1", rarity: "holo rare" },

  // Scarlet & Violet (SV1)
  { name: "Koraidon ex", number: "124/198", set_name: "Scarlet & Violet", set_code: "SV1", rarity: "ultra rare" },
  { name: "Miraidon ex", number: "126/198", set_name: "Scarlet & Violet", set_code: "SV1", rarity: "ultra rare" },
  { name: "Gardevoir ex", number: "086/198", set_name: "Scarlet & Violet", set_code: "SV1", rarity: "ultra rare" },
  { name: "Arcanine ex", number: "032/198", set_name: "Scarlet & Violet", set_code: "SV1", rarity: "ultra rare" },
  { name: "Spidops ex", number: "019/198", set_name: "Scarlet & Violet", set_code: "SV1", rarity: "ultra rare" },

  // Paldea Evolved (SV2)
  { name: "Chien-Pao ex", number: "061/193", set_name: "Paldea Evolved", set_code: "SV2", rarity: "ultra rare" },
  { name: "Ting-Lu ex", number: "105/193", set_name: "Paldea Evolved", set_code: "SV2", rarity: "ultra rare" },
  { name: "Palafin ex", number: "052/193", set_name: "Paldea Evolved", set_code: "SV2", rarity: "ultra rare" },
  { name: "Dedenne ex", number: "093/193", set_name: "Paldea Evolved", set_code: "SV2", rarity: "ultra rare" },
  { name: "Slowking", number: "053/193", set_name: "Paldea Evolved", set_code: "SV2", rarity: "rare" },

  // Obsidian Flames (SV3)
  { name: "Charizard ex", number: "125/197", set_name: "Obsidian Flames", set_code: "SV3", rarity: "ultra rare" },
  { name: "Tyranitar ex", number: "134/197", set_name: "Obsidian Flames", set_code: "SV3", rarity: "ultra rare" },
  { name: "Dragonite ex", number: "159/197", set_name: "Obsidian Flames", set_code: "SV3", rarity: "ultra rare" },
  { name: "Eevee", number: "130/197", set_name: "Obsidian Flames", set_code: "SV3", rarity: "common" },
  { name: "Pidgeot ex", number: "164/197", set_name: "Obsidian Flames", set_code: "SV3", rarity: "ultra rare" },

  // 151 (SV3.5 / MEW)
  { name: "Mew ex", number: "151/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },
  { name: "Charizard ex", number: "006/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },
  { name: "Alakazam ex", number: "065/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },
  { name: "Zapdos ex", number: "145/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },
  { name: "Erika's Invitation", number: "160/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },
  { name: "Bulbasaur", number: "001/165", set_name: "151", set_code: "MEW", rarity: "common" },
  { name: "Gengar ex", number: "094/165", set_name: "151", set_code: "MEW", rarity: "ultra rare" },

  // Paradox Rift (SV4)
  { name: "Roaring Moon ex", number: "109/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "ultra rare" },
  { name: "Iron Valiant ex", number: "089/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "ultra rare" },
  { name: "Garchomp ex", number: "120/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "ultra rare" },
  { name: "Counter Catcher", number: "160/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "uncommon" },
  { name: "Iron Hands ex", number: "070/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "ultra rare" },
  { name: "Maushold ex", number: "121/182", set_name: "Paradox Rift", set_code: "SV4", rarity: "ultra rare" },
];

initializeDatabase();

const insert = db.prepare(`
  INSERT OR IGNORE INTO cards_master (id, name, number, set_name, set_code, rarity)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((cards: CardSeed[]) => {
  let inserted = 0;
  for (const card of cards) {
    const result = insert.run(
      uuidv4(),
      card.name,
      card.number,
      card.set_name,
      card.set_code,
      card.rarity
    );
    if (result.changes > 0) inserted++;
  }
  return inserted;
});

const inserted = insertMany(cards);
const total = db.prepare("SELECT COUNT(*) as count FROM cards_master").get() as { count: number };

console.log(`Seed complete: ${inserted} new cards inserted (${total.count} total in database)`);