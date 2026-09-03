/**
 * The footer every results card shares.
 *
 * Eleven cards were each rendering their own copy of the same two buttons,
 * which is how ten of them ended up saying "Play again" after a level had
 * been cleared while one said "Play level 3". One component means a change
 * to the footer lands on every game at once.
 *
 * Three exits, in descending order of what a player usually wants: another
 * round, the games catalogue, and out of Brain Games entirely. The last one
 * is optional — a screen with nowhere further to go simply omits it rather
 * than rendering a button that does nothing.
 */
export interface ResultActionsProps {
  /** Primary button label — "Play again", or the level the round just opened. */
  replay: string;
  onReplay: () => void;
  /** Back to the Brain Games catalogue. */
  onExit: () => void;
  /** Out of Brain Games, to BrainWeave's dashboard. */
  onHome?: () => void;
}

export function ResultActions({ replay, onReplay, onExit, onHome }: ResultActionsProps) {
  return (
    <>
      <button className="btn" onClick={onReplay}>
        {replay}
      </button>
      <button className="btn btn--ghost" onClick={onExit}>
        Back to games
      </button>
      {onHome && (
        <button className="btn btn--quiet" onClick={onHome}>
          Quit to main menu
        </button>
      )}
    </>
  );
}
