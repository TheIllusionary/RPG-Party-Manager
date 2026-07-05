export interface ConditionDefinition {
  id: string;
  name: string;
  description: string;
  implies: string[];
}

export const CONDITIONS_DICT: Record<string, ConditionDefinition> = {
  'Blind 🕶️': {
    id: 'Blind 🕶️',
    name: 'Blind',
    description: "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
    implies: [],
  },
  'Charmed ✨': {
    id: 'Charmed ✨',
    name: 'Charmed',
    description: "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
    implies: [],
  },
  'Deafened 🔇': {
    id: 'Deafened 🔇',
    name: 'Deafened',
    description: "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
    implies: [],
  },
  'Frightened 😨': {
    id: 'Frightened 😨',
    name: 'Frightened',
    description: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
    implies: [],
  },
  'Grappled ✊': {
    id: 'Grappled ✊',
    name: 'Grappled',
    description: "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler.",
    implies: ['Restrained 🕸️'],
  },
  'Incapacitated 😵': {
    id: 'Incapacitated 😵',
    name: 'Incapacitated',
    description: "An incapacitated creature can't take actions or reactions.",
    implies: [],
  },
  'Paralyzed ⏳': {
    id: 'Paralyzed ⏳',
    name: 'Paralyzed',
    description: "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Str and Dex saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
    implies: ['Incapacitated 😵'],
  },
  'Petrified 🗿': {
    id: 'Petrified 🗿',
    name: 'Petrified',
    description: "A petrified creature is transformed into a solid inanimate substance. Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can't move or speak, and is unaware of its surroundings. Attack rolls against the creature have advantage. The creature automatically fails Str and Dex saving throws. The creature has resistance to all damage. The creature is immune to poison and disease.",
    implies: ['Incapacitated 😵'],
  },
  'Poisoned 🤢': {
    id: 'Poisoned 🤢',
    name: 'Poisoned',
    description: "A poisoned creature has disadvantage on attack rolls and ability checks.",
    implies: [],
  },
  'Prone 🛏️': {
    id: 'Prone 🛏️',
    name: 'Prone',
    description: "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.",
    implies: [],
  },
  'Restrained 🕸️': {
    id: 'Restrained 🕸️',
    name: 'Restrained',
    description: "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage. The creature has disadvantage on Dex saving throws.",
    implies: [],
  },
  'Stunned 🌀': {
    id: 'Stunned 🌀',
    name: 'Stunned',
    description: "A stunned creature is incapacitated, can't move, and can speak only falteringly. The creature automatically fails Str and Dex saving throws. Attack rolls against the creature have advantage.",
    implies: ['Incapacitated 😵'],
  },
  'Asleep 💤': {
    id: 'Asleep 💤',
    name: 'Asleep',
    description: "An asleep creature is unconscious. The creature is incapacitated, can't move or speak, and is unaware of its surroundings. The creature drops whatever it's holding and falls prone. The creature automatically fails Str and Dex saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet.",
    implies: ['Incapacitated 😵', 'Prone 🛏️'],
  },
  'Slowed 🐢': {
    id: 'Slowed 🐢',
    name: 'Slowed',
    description: "A slowed creature's speed is halved, it takes a -2 penalty to AC and Dex saving throws, and it can't use reactions. On its turn, it can use either an action or a bonus action, not both. Regardless of the creature's abilities or magic items, it can't make more than one melee or ranged attack during its turn.",
    implies: [],
  }
};

/**
 * Recursively resolves all explicit and implied conditions.
 * @param baseConditions Array of condition string IDs (e.g. ['Grappled ✊'])
 * @returns Array of unique condition string IDs, including all implied children.
 */
export function deriveConditions(baseConditions: string[]): string[] {
  const result = new Set<string>();

  function traverse(conditionId: string) {
    if (result.has(conditionId)) return; // Prevents infinite loops
    result.add(conditionId);

    const def = CONDITIONS_DICT[conditionId];
    if (def && def.implies) {
      for (const implied of def.implies) {
        traverse(implied);
      }
    }
  }

  for (const c of baseConditions) {
    traverse(c);
  }

  return Array.from(result);
}
