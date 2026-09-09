import type { GameOptions, Snapshot } from '../Types/game.ts';
import { createGame } from '../Method/game.ts';

/** Non-neural module: static capability exposure only. */
export class RunOnShoes {
  static createGame(
    host: HTMLElement,
    emit: (snapshot: Snapshot) => void,
    options: GameOptions,
  ) {
    return createGame(host, emit, options);
  }
}
