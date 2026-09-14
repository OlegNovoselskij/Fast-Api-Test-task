export const HISTORY_SIZE = 50_000;
export const HISTORY_SEED = 20_260_914;
const HISTORY_START = Date.UTC(2026, 0, 1, 9, 0, 0);

const WORDS = [
  'hey',
  'thanks',
  'love',
  'the',
  'new',
  'video',
  'so',
  'much',
  'today',
  'shoot',
  'behind',
  'scenes',
  'coming',
  'soon',
  'what',
  'did',
  'you',
  'think',
  'about',
  'it',
  'lighting',
  'was',
  'amazing',
  'can',
  'we',
  'see',
  'more',
  'of',
  'that',
  'set',
  'next',
  'week',
  'working',
  'on',
  'something',
  'special',
  'haha',
  'yes',
  'totally',
  'agree',
  'camera',
  'lens',
  'edit',
  'tonight',
  'live',
  'stream',
  'at',
  'eight',
  'see',
  'there',
];

export type SeedMessage = { author: 'fan' | 'creator'; text: string; createdAt: number };

/** mulberry32: tiny deterministic PRNG so every install generates the same history. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function createSentence(random: () => number): string {
  const length = 3 + Math.floor(random() * 10);
  const words = Array.from({ length }, () => WORDS[Math.floor(random() * WORDS.length)]);
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function* generateHistory(
  count = HISTORY_SIZE,
  seed = HISTORY_SEED,
): Generator<SeedMessage> {
  const random = createRandom(seed);
  let createdAt = HISTORY_START;
  for (let index = 0; index < count; index += 1) {
    createdAt += 30_000 + Math.floor(random() * 570_000);
    yield {
      author: random() < 0.55 ? 'creator' : 'fan',
      text: createSentence(random),
      createdAt,
    };
  }
}
