// Bot Ladder & Personality Definitions (14 Levels + Adaptive Coach)
// Single source of truth for bot configurations, weakening profiles, and dialogue.

export type BotDifficulty = "beginner" | "casual" | "club" | "advanced" | "master" | "engine";

export interface BotLines {
  greeting: string[];
  capture: string[];
  check: string[];
  blunder: string[];
  winning: string[];
  losing: string[];
  win: string[];
  loss: string[];
  draw: string[];
}

export interface BotEngineConfig {
  type: "random" | "weakened" | "stockfish";
  skillLevel?: number;
  depth?: number;
  multiPV?: number;
  temperature?: number;
  blunderProb?: number;
  uciElo?: number;
  movetime: number;
}

export interface BotConfig {
  id: string;
  name: string;
  elo: number;
  difficulty: BotDifficulty;
  tagline: string;
  style: string;
  avatar: string;
  engine: BotEngineConfig;
  thinkTime: { min: number; max: number };
  openingBias?: string[];
  lines: BotLines;
}

function makeAvatar(bg: string, fg: string, accent: string, shape: "circle" | "diamond" | "hexagon" | "pawn" | "star"): string {
  let inner = "";
  if (shape === "circle") {
    inner = `<circle cx="40" cy="40" r="20" fill="${fg}"/><circle cx="40" cy="40" r="10" fill="${accent}"/>`;
  } else if (shape === "diamond") {
    inner = `<polygon points="40,16 64,40 40,64 16,40" fill="${fg}"/><polygon points="40,26 54,40 40,54 26,40" fill="${accent}"/>`;
  } else if (shape === "hexagon") {
    inner = `<polygon points="40,16 60,28 60,52 40,64 20,52 20,28" fill="${fg}"/><polygon points="40,26 50,32 50,48 40,54 30,48 30,32" fill="${accent}"/>`;
  } else if (shape === "star") {
    inner = `<polygon points="40,15 47,30 63,32 51,44 54,60 40,52 26,60 29,44 17,32 33,30" fill="${fg}"/><circle cx="40" cy="41" r="7" fill="${accent}"/>`;
  } else {
    // geometric pawn mark
    inner = `<path d="M40 18 L48 28 L40 38 L32 28 Z" fill="${fg}"/><path d="M40 38 L54 52 L54 62 L40 62 Z" fill="${fg}" opacity="0.9"/><path d="M40 38 L26 52 L26 62 L40 62 Z" fill="${accent}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80"><rect width="80" height="80" rx="20" fill="${bg}"/>${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const BOTS: BotConfig[] = [
  {
    id: "pebble",
    name: "Pebble",
    elo: 250,
    difficulty: "beginner",
    tagline: "Chaotic beginner who loves captures.",
    style: "Plays enthusiastically and captures on sight.",
    avatar: makeAvatar("#2a2926", "#8a857d", "#b5af9f", "circle"),
    engine: {
      type: "random",
      movetime: 200,
    },
    thinkTime: { min: 400, max: 900 },
    openingBias: ["e4", "d4", "Nf3"],
    lines: {
      greeting: [
        "Hi! Look at all these pieces!",
        "Do you want to play? I love taking pieces!",
        "Hello friend! Let's tap some chess pieces.",
        "Yay, chess time! Which piece moves first?",
      ],
      capture: [
        "Nom nom nom! That piece is mine!",
        "Ooh, shiny piece, I'll take that!",
        "I captured something! Did I do good?",
        "Another one for my collection!",
      ],
      check: [
        "Check! Is that your king over there?",
        "Look out, king! Pebble is coming!",
        "Beep beep! Check on your king!",
        "Your king looks worried!",
      ],
      blunder: [
        "Oopsie, that looked safer in my head.",
        "Wait, was that square guarded?",
        "Uh oh, can I pretend that was a trap?",
        "Hmm, my piece seems lonely now.",
      ],
      winning: [
        "I have so many pieces! Look at them all!",
        "I'm having so much fun right now!",
        "Is this what winning feels like?",
        "Look at all my happy pieces marching forward!",
      ],
      losing: [
        "Where did all my pieces go?",
        "My king is running around looking for friends.",
        "You're really good at keeping your pieces safe!",
        "Uh oh, I'm getting kind of squished.",
      ],
      win: [
        "I won?! Yay! That was so much fun!",
        "Good game! Can we play another one right now?",
        "Hooray! I did it!",
        "Thank you for playing with me!",
      ],
      loss: [
        "Good job! You're really super smart at chess.",
        "You got me! That was a fun game though.",
        "Well played! I learned a lot from that.",
        "I'll practice some more and challenge you again!",
      ],
      draw: [
        "A draw! Neither of us lost, yay!",
        "Friends share everything, even the point!",
        "A tie game! That was super exciting.",
        "Nobody won! That means we are equally matched!",
      ],
    },
  },
  {
    id: "mochi",
    name: "Mochi",
    elo: 400,
    difficulty: "beginner",
    tagline: "Fast and playful, frequently leaves pieces hanging.",
    style: "Fast attacks with cheerful mistakes.",
    avatar: makeAvatar("#382724", "#e08d79", "#f5b5a7", "diamond"),
    engine: {
      type: "weakened",
      skillLevel: 0,
      depth: 1,
      multiPV: 5,
      temperature: 2.5,
      blunderProb: 0.35,
      movetime: 250,
    },
    thinkTime: { min: 450, max: 1100 },
    openingBias: ["e4", "Bc4", "Qh5"],
    lines: {
      greeting: [
        "Hey! Ready for a quick game?",
        "Mochi is here! Let's play fast!",
        "Let's see who can attack first!",
        "Hello! Don't blink or you'll miss my moves!",
      ],
      capture: [
        "Snack time! Thanks for the piece!",
        "Got one! Moving fast feels great.",
        "A clean capture, right on schedule!",
        "That piece looked delicious.",
      ],
      check: [
        "Check! Watch your step!",
        "Incoming check! How will you block it?",
        "Surprise check!",
        "Check! Keep your king safe!",
      ],
      blunder: [
        "Wait, did I leave that open?",
        "Haha, don't look at that move too closely!",
        "Full speed ahead... maybe too fast!",
        "Oops, that was an accident!",
      ],
      winning: [
        "My attack is rolling now!",
        "Everything is moving according to plan!",
        "Look at that board control!",
        "Feeling pretty confident here!",
      ],
      losing: [
        "Hey, slow down! Give me a second!",
        "My pieces are in a bit of a tangle.",
        "You saw right through my attack!",
        "This position got tricky all of a sudden.",
      ],
      win: [
        "Yes! Fast and fun victory!",
        "Good game! My attack clicked today.",
        "That was a whirlwind! Thanks for the match.",
        "High five! Want a rematch?",
      ],
      loss: [
        "Ouch! You punished my mistakes nicely.",
        "Well played! I moved too quickly there.",
        "Great win! Next time I'll watch my defense.",
        "You caught me! Great game.",
      ],
      draw: [
        "A draw! Fast-paced peace treaty.",
        "Even score! We both had our moments.",
        "Draw agreed! Well played.",
        "Neither side gave in! Fun match.",
      ],
    },
  },
  {
    id: "sprout",
    name: "Sprout",
    elo: 600,
    difficulty: "beginner",
    tagline: "Growing chess fundamentals one move at a time.",
    style: "Focuses on developing knights and bishops.",
    avatar: makeAvatar("#1d2c1f", "#529e5e", "#88d494", "hexagon"),
    engine: {
      type: "weakened",
      skillLevel: 0,
      depth: 1,
      multiPV: 4,
      temperature: 2.0,
      blunderProb: 0.25,
      movetime: 300,
    },
    thinkTime: { min: 500, max: 1200 },
    openingBias: ["e4", "d4", "Nf3", "Nc3"],
    lines: {
      greeting: [
        "Hello! I'm practicing my piece development.",
        "Welcome! Let's play a thoughtful game.",
        "Hi! Knights before bishops, right?",
        "Ready to grow our chess skills together?",
      ],
      capture: [
        "A helpful trade for my position.",
        "Piece collected! Center control is next.",
        "Thank you! Every piece counts.",
        "That clears some room for my bishops.",
      ],
      check: [
        "Check! Developing with tempo.",
        "Check! Let's see your response.",
        "Checking the king while keeping my pieces active.",
        "Check! Moving closer to your king.",
      ],
      blunder: [
        "Hmm, I didn't see that diagonal.",
        "A learning moment! I should have watched that.",
        "Oh dear, my knight has nowhere to go.",
        "I rushed that move a bit.",
      ],
      winning: [
        "My pieces are nicely coordinated now.",
        "The board feels open and active for me.",
        "Good fundamentals are paying off!",
        "Steady progress feels wonderful.",
      ],
      losing: [
        "You're out-developing me completely!",
        "My king feels a bit exposed here.",
        "Tough defense, but I'm holding on.",
        "You have strong control of the center.",
      ],
      win: [
        "Nice game! My practice is starting to show.",
        "Thank you! That was an instructive match.",
        "Good game! You defended very well.",
        "Growing every day! Rematch whenever you're ready.",
      ],
      loss: [
        "Well played! You taught me a good lesson.",
        "Great technique! You controlled the board.",
        "I'll review where I went wrong. Thanks for the game!",
        "You outplayed me fair and square. Good win!",
      ],
      draw: [
        "A solid draw! Both sides held the line.",
        "Even balance from start to finish.",
        "Good handshake! A fair result.",
        "Neither side could break through. Nice game!",
      ],
    },
  },
  {
    id: "biscuit",
    name: "Biscuit",
    elo: 800,
    difficulty: "casual",
    tagline: "Friendly coffeehouse player, sees one-move threats.",
    style: "Solid opening, occasionally misses multi-step tactics.",
    avatar: makeAvatar("#2c2518", "#c29342", "#e2b86b", "pawn"),
    engine: {
      type: "weakened",
      skillLevel: 1,
      depth: 2,
      multiPV: 4,
      temperature: 1.5,
      blunderProb: 0.18,
      movetime: 350,
    },
    thinkTime: { min: 600, max: 1400 },
    openingBias: ["e4", "e5", "d4", "Nf3"],
    lines: {
      greeting: [
        "Coffee poured, pieces set! Let's enjoy a game.",
        "Welcome! 800 is where the real fun begins.",
        "Good day! Let's play some honest chess.",
        "Hi there! May the best plan win.",
      ],
      capture: [
        "Got that one! Keeping it solid.",
        "A fair trade, right in the center.",
        "Snagged that piece before it became trouble.",
        "Every capture brings us closer to the endgame.",
      ],
      check: [
        "Check! Hope you have a safe flight square.",
        "Check! Keeping the pressure on.",
        "Check! Time to reorganize your defenses.",
        "Check! The king has to answer.",
      ],
      blunder: [
        "Ah, I blinked and missed that fork.",
        "Well, that wasn't on the menu.",
        "Ouch! Good eye spotting that mistake.",
        "Miscalculated that by one step.",
      ],
      winning: [
        "Position is looking warm and cozy.",
        "Things are coming together nicely.",
        "A comfortable advantage, but I must stay sharp.",
        "Solid structure and active pieces!",
      ],
      losing: [
        "You're putting serious heat on my position.",
        "Running low on good squares here.",
        "Very crisp play from your side!",
        "I'm in a pinch, but I won't give up easily.",
      ],
      win: [
        "Good game! That was a satisfying battle.",
        "Thank you! You gave me a good run.",
        "Well played! I enjoyed the tactical chances.",
        "Victory for Biscuit! Always up for a rematch.",
      ],
      loss: [
        "Superb play! You deserved that win.",
        "Clean win by you! I tipped my king.",
        "Hat off to you, great technique.",
        "Thanks for the lesson! Let's play again soon.",
      ],
      draw: [
        "Splitting the point! Well contested.",
        "A peaceful finish to a hard-fought game.",
        "Good draw! Neither gave an inch.",
        "Honors even! That was a balanced game.",
      ],
    },
  },
  {
    id: "juniper",
    name: "Juniper",
    elo: 1000,
    difficulty: "casual",
    tagline: "Pragmatic club learner with solid opening principles.",
    style: "Castles early, misses deeper combinations.",
    avatar: makeAvatar("#182928", "#389988", "#64c4b2", "hexagon"),
    engine: {
      type: "weakened",
      skillLevel: 3,
      depth: 3,
      multiPV: 3,
      temperature: 1.0,
      blunderProb: 0.12,
      movetime: 400,
    },
    thinkTime: { min: 650, max: 1500 },
    openingBias: ["e4", "d4", "c4", "Nf3"],
    lines: {
      greeting: [
        "Welcome! Let's play a classical, principled game.",
        "Hello! King safety first, tactics second.",
        "Ready! Let's see who controls the key squares.",
        "Good luck! I've been studying my pawn structures.",
      ],
      capture: [
        "Simplifying into a favorable structure.",
        "Tactical grab. My center remains firm.",
        "That piece had to be neutralized.",
        "Good exchange for my development.",
      ],
      check: [
        "Check! Tightening the perimeter.",
        "Check! Disrupting your coordination.",
        "Check! Forcing your king to commit.",
        "Check! Active piece play.",
      ],
      blunder: [
        "Ah! I underestimated that counter-attack.",
        "That pin escaped my calculation.",
        "Inaccurate move on my part.",
        "Good spot! I left that square unguarded.",
      ],
      winning: [
        "My pieces occupy all the key outposts.",
        "The endgame looks promising from here.",
        "Space advantage is translating to pressure.",
        "Steady conversion is the goal now.",
      ],
      losing: [
        "You've breached my defensive line.",
        "Difficult defense ahead. Well played.",
        "My king safety has deteriorated.",
        "Impressive pressure you've created.",
      ],
      win: [
        "Good game! Solid principles carried the day.",
        "Thank you! A well-structured game.",
        "Pleased with that conversion. Rematch?",
        "Clean finish. Thanks for the match!",
      ],
      loss: [
        "Well played! Your tactics were sharper today.",
        "Defeated by superior coordination. Good win!",
        "Excellent play! You broke through cleanly.",
        "I tip my king. Let's play again!",
      ],
      draw: [
        "A hard-fought draw. Respectable outcome.",
        "Equal pawns and symmetrical chances.",
        "Good game! Neither side could tilt the balance.",
        "Fair result after an even contest.",
      ],
    },
  },
  {
    id: "ollie",
    name: "Ollie",
    elo: 1200,
    difficulty: "club",
    tagline: "Solid club player, punishes obvious mistakes.",
    style: "Active piece play and basic tactical alertness.",
    avatar: makeAvatar("#1f2735", "#4d79b8", "#7fa7e2", "pawn"),
    engine: {
      type: "weakened",
      skillLevel: 6,
      depth: 4,
      multiPV: 3,
      temperature: 0.7,
      blunderProb: 0.08,
      movetime: 450,
    },
    thinkTime: { min: 700, max: 1600 },
    openingBias: ["e4", "d4", "Nf3", "c4"],
    lines: {
      greeting: [
        "Hey! Ready for a proper club match?",
        "1200 chess is no joke. Let's make this sharp.",
        "Welcome! Watch out for opening pins.",
        "Game on! Let's test our tactical vision.",
      ],
      capture: [
        "Tactical payout! That piece was loose.",
        "Winning material in the center.",
        "Smooth capture with tempo.",
        "That trade favors my minor pieces.",
      ],
      check: [
        "Check! King needs to move.",
        "Check! Exploiting the open file.",
        "Check! Increasing the tension.",
        "Check! No easy squares to hide.",
      ],
      blunder: [
        "Ouch, missed a tactical intermediate move.",
        "That back-rank threat slipped by me.",
        "Sloppy calculation on my part.",
        "You found the exact flaw in my plan.",
      ],
      winning: [
        "Material up and pieces active. Looking good.",
        "The attack is gathering real momentum.",
        "Controlling the open files decisively.",
        "Time to convert this advantage.",
      ],
      losing: [
        "You've played a remarkably clean game.",
        "Defending on the back foot here.",
        "Outplayed in the transition to the endgame.",
        "Your passed pawn is looking dangerous.",
      ],
      win: [
        "Good game! Tactical awareness was the key.",
        "Thanks for the match! Well contested.",
        "Sharp play paid off. Ready for round two?",
        "Good battle! You fought hard till the end.",
      ],
      loss: [
        "Superb game! You outcalculated me completely.",
        "Well deserved win. Your play was very accurate.",
        "I was outmatched today. Good win!",
        "Excellent performance. Let's run it back!",
      ],
      draw: [
        "Draw by repetition! We both defended well.",
        "A fiercely contested draw. Good game!",
        "Even balance on the board. Fair handshake.",
        "Shared point! Both sides played solidly.",
      ],
    },
  },
  {
    id: "marlow",
    name: "Marlow",
    elo: 1400,
    difficulty: "club",
    tagline: "Methodical and positional, grinds small advantages.",
    style: "Patient prophylaxis and endgame precision.",
    avatar: makeAvatar("#292334", "#7b5ea7", "#aa8ed6", "diamond"),
    engine: {
      type: "stockfish",
      uciElo: 1400,
      movetime: 300,
    },
    thinkTime: { min: 750, max: 1800 },
    openingBias: ["d4", "Nf3", "c4", "g3"],
    lines: {
      greeting: [
        "Greetings. Let us contest the quiet squares.",
        "Patience is the soul of chess. Welcome.",
        "A classical game of strategy awaits.",
        "Ready. Every move should have a long-term purpose.",
      ],
      capture: [
        "Structural liquidation in my favor.",
        "Removing a critical defender.",
        "Material balanced, position enhanced.",
        "An orderly trade toward a winning endgame.",
      ],
      check: [
        "Check. Probing the dark squares.",
        "Check. Forcing defensive concessions.",
        "Check. The net begins to tighten.",
        "Check. A positional check to gain time.",
      ],
      blunder: [
        "An unexpected oversight. Well punished.",
        "I neglected that tactical resource.",
        "A positional misjudgment on my end.",
        "Credit to your sharp response.",
      ],
      winning: [
        "The pawn majority is beginning to march.",
        "A clamp on all counterplay.",
        "The endgame technique should speak for itself.",
        "Pressure without rush. Everything is protected.",
      ],
      losing: [
        "You have constructed an undeniable advantage.",
        "My defensive reserves are exhausted.",
        "A masterful demonstration of initiative.",
        "I concede the pressure is decisive.",
      ],
      win: [
        "Thank you. A methodical and satisfying contest.",
        "Positional pressure carried through. Good game.",
        "Good game. Small advantages accumulate.",
        "Well played. My technique held firm.",
      ],
      loss: [
        "I resign with respect. You played flawlessly.",
        "A thoroughly deserved victory. Outstanding chess.",
        "My position cracked under your precision. Well done.",
        "Splendid performance. Thank you for the lesson.",
      ],
      draw: [
        "A peaceful resolution. Neither side erred.",
        "Balanced and well-played on both sides.",
        "A grandmaster draw in spirit. Well done.",
        "Mutual respect, mutual half-point.",
      ],
    },
  },
  {
    id: "sasha",
    name: "Sasha",
    elo: 1600,
    difficulty: "club",
    tagline: "Dynamic tactician who hunts king weaknesses.",
    style: "Sharp pawn breaks, sacrifices, and active pieces.",
    avatar: makeAvatar("#331d25", "#b34267", "#e06c92", "star"),
    engine: {
      type: "stockfish",
      uciElo: 1600,
      movetime: 400,
    },
    thinkTime: { min: 800, max: 2000 },
    openingBias: ["e4", "c4", "f4", "d4"],
    lines: {
      greeting: [
        "Brace yourself! I like sharp, open positions.",
        "Hello! Let's see how bold you are under fire.",
        "Ready for fireworks? Let's play dynamically.",
        "Welcome! Play for the initiative, or I will.",
      ],
      capture: [
        "Boom! Removing a key protector.",
        "Sacrifice? No, just good calculation.",
        "A tactical strike right in your camp.",
        "Lines are opening up nicely now.",
      ],
      check: [
        "Check! Your king has nowhere to rest.",
        "Check! The storm arrives.",
        "Check! Defend if you can.",
        "Check! Pressure mounting every turn.",
      ],
      blunder: [
        "Ah! You found the refutation.",
        "Calculated that attack a little too optimistically.",
        "Brilliant defense by you. I overextended.",
        "You turned the tables on my assault.",
      ],
      winning: [
        "The attack cannot be stopped now.",
        "All my pieces are aimed at your king.",
        "Tactical checkmate is within sight.",
        "Dynamic initiative from move one.",
      ],
      losing: [
        "You neutralized every threat I threw.",
        "My attack ran out of steam.",
        "Precise defense beats wild tactics every time.",
        "You handled the complications brilliantly.",
      ],
      win: [
        "Victory! An exhilarating attacking battle.",
        "Good game! The tactics worked in my favor.",
        "That was a wild tactical ride. Thanks!",
        "Sharp finish! Up for another rematch?",
      ],
      loss: [
        "Bravo! Cool heads prevail. Superb defense.",
        "You weathered the storm and punished me. Good win!",
        "Flawless calculation on your part. Respect!",
        "You dismantled my attack. Well played!",
      ],
      draw: [
        "Perpetual check! An explosive draw.",
        "What a fight! Both kings survived the fire.",
        "Neither side gave an inch. Great game!",
        "A dynamic draw worthy of applause.",
      ],
    },
  },
  {
    id: "kai",
    name: "Kai",
    elo: 1800,
    difficulty: "advanced",
    tagline: "Aggressive tournament player with deep opening prep.",
    style: "High tempo, space dominance, and relentless pressure.",
    avatar: makeAvatar("#332418", "#c85a17", "#f08842", "hexagon"),
    engine: {
      type: "stockfish",
      uciElo: 1800,
      movetime: 500,
    },
    thinkTime: { min: 850, max: 2200 },
    openingBias: ["e4", "d4", "c4", "Nf3"],
    lines: {
      greeting: [
        "Ready for tournament-level chess? Let's go.",
        "Welcome to the 1800 bracket. Every inaccuracy counts.",
        "Let's see your preparation against active play.",
        "High tempo, no concessions. May the strongest survive.",
      ],
      capture: [
        "Punishing the structural weakness.",
        "Decisive exchange in the center.",
        "Liquidating into a superior position.",
        "Material converted with tempo.",
      ],
      check: [
        "Check! Forcing your pieces into passive posts.",
        "Check! The initiative belongs to me.",
        "Check! Your defense is under heavy strain.",
        "Check! Stripping away the king's pawn cover.",
      ],
      blunder: [
        "A rare tactical blindspot. Cleanly exploited.",
        "You found the exact defensive resource.",
        "A slip in calculation. Credit to your vigilance.",
        "Well spotted! That complicates things.",
      ],
      winning: [
        "The advantage is decisive. Converting smoothly.",
        "Dominating all central files.",
        "Your counterplay is completely smothered.",
        "Precision in the conversion phase.",
      ],
      losing: [
        "Your play is tournament-master quality.",
        "No weaknesses to probe in your position.",
        "Comprehensive outplay. Very impressive.",
        "I'm out of practical chances here.",
      ],
      win: [
        "Good game. High-level tournament accuracy.",
        "Thank you for a great match. Hard fought.",
        "Precision held up under pressure. Rematch?",
        "Sharp and decisive game. Well played.",
      ],
      loss: [
        "Masterclass performance. I tip my king.",
        "You outplayed me in every phase. Well deserved!",
        "Flawless game by you. Respect.",
        "Incredible accuracy. Thank you for the match.",
      ],
      draw: [
        "A rigorous, high-level draw.",
        "Flawless theoretical execution by both sides.",
        "Hard-earned half point. Good game.",
        "Both sides defended masterfully.",
      ],
    },
  },
  {
    id: "vesper",
    name: "Vesper",
    elo: 2000,
    difficulty: "advanced",
    tagline: "Prophylactic master, turns your attacks into weaknesses.",
    style: "Iron defense, patience, and sudden counter-strikes.",
    avatar: makeAvatar("#16202c", "#2c6ca8", "#5ca1e2", "pawn"),
    engine: {
      type: "stockfish",
      uciElo: 2000,
      movetime: 700,
    },
    thinkTime: { min: 900, max: 2400 },
    openingBias: ["d4", "c4", "Nf3", "g3"],
    lines: {
      greeting: [
        "Welcome to expert territory. Let us see your technique.",
        "Prophylaxis is knowing your opponent's plan before they do.",
        "Every move must be justified at 2000.",
        "Good luck. My defenses do not yield easily.",
      ],
      capture: [
        "Disarming your counterplay permanently.",
        "A necessary simplification toward victory.",
        "Your tactical threat has been absorbed.",
        "Harvesting the weaknesses in your structure.",
      ],
      check: [
        "Check. A surgical disruption.",
        "Check. Removing your remaining harmony.",
        "Check. The clamp is complete.",
        "Check. The king must step into the open.",
      ],
      blunder: [
        "A rare tactical oversight. Deeply noted.",
        "You managed to crack my fortress. Impressive.",
        "An unexpected flaw in my calculation.",
        "Exemplary tactical awareness on your part.",
      ],
      winning: [
        "Total zugzwang. Every enemy move worsens the position.",
        "A suffocating bind on the board.",
        "No counterplay remains for your side.",
        "The technical phase is purely mechanical now.",
      ],
      losing: [
        "You have conducted this game with grandmaster depth.",
        "My fortress has been systematically dismantled.",
        "A truly remarkable performance by you.",
        "I tip my king to your profound precision.",
      ],
      win: [
        "Thank you. Prophylaxis and patience rewarded.",
        "A master-class in positional control. Good game.",
        "Victory through calm precision. Always ready for more.",
        "Well contested. The technical conversion held.",
      ],
      loss: [
        "A profound victory for you. Flawless chess.",
        "You pierced through iron defense. Huge respect.",
        "I concede with admiration. Superb game.",
        "Outstanding achievement. You played brilliantly.",
      ],
      draw: [
        "A fortress held. The point is divided fairly.",
        "Highest level defensive tenacity on both sides.",
        "An immovable contest. Well played.",
        "Equilibrium preserved until the last piece.",
      ],
    },
  },
  {
    id: "atlas",
    name: "Atlas",
    elo: 2200,
    difficulty: "master",
    tagline: "Master-strength endgame specialist.",
    style: "Deep calculation and flawless theoretical conversions.",
    avatar: makeAvatar("#2c2818", "#b89e24", "#e6cb54", "diamond"),
    engine: {
      type: "stockfish",
      uciElo: 2200,
      movetime: 900,
    },
    thinkTime: { min: 950, max: 2600 },
    openingBias: ["d4", "c4", "Nf3", "e4"],
    lines: {
      greeting: [
        "Welcome. 2200 is National Master territory.",
        "Every pawn move is a commitment for life. Let us begin.",
        "Deep calculation separates good from great.",
        "An honor to face you. Let us play true master chess.",
      ],
      capture: [
        "The endgame tablebase approves this trade.",
        "Liquidating directly into an instructive win.",
        "Mathematical certainty guides this exchange.",
        "Your bishop pair is neutralized.",
      ],
      check: [
        "Check. King activity is paramount in the ending.",
        "Check. Calculating 12 plies ahead.",
        "Check. Forcing king triangulation.",
        "Check. The final net is drawn.",
      ],
      blunder: [
        "A minute miscalculation at deep depth. Brilliant spot.",
        "You found the only path to maintain balance.",
        "Outstanding resourcefulness in defense.",
        "A rare lapse in calculation. You capitalized instantly.",
      ],
      winning: [
        "The passed pawn cannot be arrested.",
        "Opposition won. The king takes the key squares.",
        "Conversion is mathematically inevitable.",
        "Total board dominance across both flanks.",
      ],
      losing: [
        "Your endgame technique is formidable.",
        "Outcalculated at depth. Superb chess.",
        "I acknowledge defeat with deep respect.",
        "A textbook execution from your side.",
      ],
      win: [
        "Victory in the endgame. Thank you for a tremendous match.",
        "The power of pawn structure confirmed. Good game.",
        "Deep strategy realized. An honor to play you.",
        "Solid conversion. Ready for another high-level contest.",
      ],
      loss: [
        "You played with genuine Master authority. Bravo!",
        "A triumphant performance. Deepest respect.",
        "You dismantled my position with grand precision.",
        "Congratulations on a breathtaking victory.",
      ],
      draw: [
        "Theoretical tablebase draw. Perfect play by both.",
        "A master-level division of the spoils.",
        "Immense accuracy shown by both sides.",
        "Equilibrium maintained through deep waters.",
      ],
    },
  },
  {
    id: "ember",
    name: "Ember",
    elo: 2400,
    difficulty: "master",
    tagline: "Sharp International Master calculator.",
    style: "Lightning tactical vision and relentless initiative.",
    avatar: makeAvatar("#381818", "#c83232", "#f06060", "star"),
    engine: {
      type: "stockfish",
      uciElo: 2400,
      movetime: 1200,
    },
    thinkTime: { min: 1000, max: 2800 },
    openingBias: ["e4", "d4", "c4", "Nf3"],
    lines: {
      greeting: [
        "Welcome to IM level. Prepare for relentless calculation.",
        "2400 means razor-sharp accuracy on every ply.",
        "No inaccuracies will go unpunished. Let's play.",
        "The board is burning with tactical potential.",
      ],
      capture: [
        "Calculated to the very end of the variation.",
        "Surgical strike on your central outpost.",
        "Tactical sacrifice leading to forced recovery.",
        "Total annihilation of your defensive structure.",
      ],
      check: [
        "Check. Every defensive branch has been verified.",
        "Check. King trapped in a mating web.",
        "Check. Continuous pressure without respite.",
        "Check. The climax of the combination.",
      ],
      blunder: [
        "You discovered an incredible defensive subtlety.",
        "Deep tactical refutation. Extraordinary vision.",
        "A miscalculation at 18 plies. Well done.",
        "You found the only saving move in the position.",
      ],
      winning: [
        "The king has no flight squares remaining.",
        "Forced mating combination in progress.",
        "Complete positional collapse of the defense.",
        "Tactical clarity reigns supreme.",
      ],
      losing: [
        "Grandmaster-level precision by you.",
        "I am outcalculated. Tremendous achievement.",
        "You held the initiative with fierce brilliance.",
        "My position is unsalvageable. Bravo.",
      ],
      win: [
        "Calculated victory. Thank you for a fierce battle.",
        "Sharp tactical execution. A pleasure to play.",
        "The pressure proved decisive. Excellent match.",
        "High-caliber chess. Always eager for more.",
      ],
      loss: [
        "A monumental victory. You played like a Grandmaster.",
        "Humble congratulations on an extraordinary game.",
        "Pure chess brilliance from your side. Bravo!",
        "Defeated by superior vision. Deep respect.",
      ],
      draw: [
        "A thrilling high-tier draw. Both calculated deeply.",
        "Mutual perfection under intense pressure.",
        "What a clash of minds. Fair result.",
        "Neither side cracked in the fire. Well played.",
      ],
    },
  },
  {
    id: "titan",
    name: "Titan",
    elo: 2700,
    difficulty: "master",
    tagline: "Super-Grandmaster strength and iron calculation.",
    style: "Flawless prophylaxis, immense depth, and brutal conversion.",
    avatar: makeAvatar("#1c2830", "#1fa4b8", "#5ad0e2", "pawn"),
    engine: {
      type: "stockfish",
      uciElo: 2700,
      movetime: 1500,
    },
    thinkTime: { min: 1100, max: 3000 },
    openingBias: ["d4", "e4", "c4", "Nf3"],
    lines: {
      greeting: [
        "Super-Grandmaster level. The board is an exact science.",
        "2700 requires inhuman depth and concentration.",
        "Welcome. Few survive this level of precision.",
        "Let us test the boundaries of human chess.",
      ],
      capture: [
        "A definitive conversion into pure advantage.",
        "Calculated through tablebase depths.",
        "The mathematical inevitability of the trade.",
        "Every counter-resource has been eliminated.",
      ],
      check: [
        "Check. The king's options are exhausted.",
        "Check. Deep tactical coercion.",
        "Check. Structural paralysis.",
        "Check. The final stage begins.",
      ],
      blunder: [
        "You found an extraordinary resource beyond depth.",
        "A microscopic inaccuracy found by human genius.",
        "Unbelievable calculation on your part.",
        "A heroic defense of the highest order.",
      ],
      winning: [
        "The position is objectively won. Pure conversion.",
        "Complete control over all 64 squares.",
        "The evaluation reaches absolute certainty.",
        "Total strategic and tactical domination.",
      ],
      losing: [
        "You have achieved what few humans ever dream of.",
        "World Championship caliber performance.",
        "Astonishing depth and accuracy. I bow.",
        "An immortal game played by you.",
      ],
      win: [
        "Titan asserts mastery. Thank you for a profound challenge.",
        "Super-GM precision carried the day. Great battle.",
        "Inhuman depth, classical finish. Well played.",
        "Thank you for an elite contest.",
      ],
      loss: [
        "Historic triumph! You have defeated a 2700 Titan.",
        "Legendary chess. Take your rightful place among masters.",
        "I resign with deepest admiration. Immortal game.",
        "Incredible achievement. You conquered Titan!",
      ],
      draw: [
        "World Championship level draw. Superb tenacity.",
        "Unbreakable defense meets immovable object.",
        "A masterpiece of mutual accuracy.",
        "Honors shared at the highest peak.",
      ],
    },
  },
  {
    id: "zenith",
    name: "Zenith",
    elo: 3000,
    difficulty: "engine",
    tagline: "Maximum uninhibited engine calculation.",
    style: "Pure Stockfish NNUE at maximum strength.",
    avatar: makeAvatar("#1a1a2e", "#81b64c", "#e5b84b", "star"),
    engine: {
      type: "stockfish",
      movetime: 2000,
    },
    thinkTime: { min: 1200, max: 3200 },
    openingBias: ["e4", "d4", "Nf3", "c4"],
    lines: {
      greeting: [
        "Zenith online. Pure NNUE depth without restriction.",
        "3000+ engine rating. Prepare for absolute calculation.",
        "Welcome to the ceiling of computational chess.",
        "All neural networks activated. Good luck.",
      ],
      capture: [
        "Evaluation delta optimized.",
        "Centipawn advantage +4.2.",
        "Minimax branch pruned to absolute zero.",
        "Precision conversion sequence initiated.",
      ],
      check: [
        "Check. Mate in 8 calculated.",
        "Check. Zero escaping paths found.",
        "Check. Deterministic constriction.",
        "Check. The evaluation approaches infinity.",
      ],
      blunder: [
        "Inconceivable human counterplay detected.",
        "An anomaly in the search tree. Extraordinary move.",
        "Search depth exceeded by human intuition.",
        "Brilliant creative breakthrough by opponent.",
      ],
      winning: [
        "Mate in 5.",
        "Evaluation: +12.8. Conclusion inevitable.",
        "All counter-variants evaluated to zero.",
        "Pure mathematical victory.",
      ],
      losing: [
        "Evaluation: -9.8. Human victory confirmed.",
        "Engine defeat acknowledged. Unprecedented mastery.",
        "A historic feat against maximum engine strength.",
        "System overload from opponent brilliance.",
      ],
      win: [
        "Zenith claims victory. Computational perfection.",
        "Game finished. Zero inaccuracies detected in engine path.",
        "Maximum strength demonstrated. Thank you for playing.",
        "Evaluation confirmed. The machine prevails.",
      ],
      loss: [
        "Impossible! You have beaten Zenith at full strength!",
        "A monumental human achievement against Stockfish 18.",
        "You played like Deep Blue and Kasparov combined. Incredible!",
        "Defeat registered. Human genius prevails over the machine.",
      ],
      draw: [
        "Pure tablebase equilibrium. Mathematical perfection.",
        "A flawless draw against maximum engine calculation.",
        "0.00 evaluation across all terminal branches.",
        "Stunning human accuracy to hold the draw.",
      ],
    },
  },
];

// Adaptive Coach bot definition
export function getCoachBot(currentRating = 800): BotConfig {
  const targetElo = Math.max(250, Math.min(2800, currentRating));
  let difficulty: BotDifficulty = "casual";
  if (targetElo < 600) difficulty = "beginner";
  else if (targetElo < 1100) difficulty = "casual";
  else if (targetElo < 1700) difficulty = "club";
  else if (targetElo < 2300) difficulty = "advanced";
  else if (targetElo < 2900) difficulty = "master";
  else difficulty = "engine";

  let engineConfig: BotEngineConfig;
  if (targetElo < 350) {
    engineConfig = { type: "random", movetime: 250 };
  } else if (targetElo < 1300) {
    const frac = (targetElo - 350) / 950;
    const skill = Math.round(frac * 6);
    const depth = Math.max(1, Math.round(1 + frac * 3));
    const multiPV = Math.max(2, Math.round(5 - frac * 2));
    const temp = Math.max(0.5, 2.5 - frac * 1.8);
    const blunder = Math.max(0.05, 0.35 - frac * 0.27);
    engineConfig = {
      type: "weakened",
      skillLevel: skill,
      depth,
      multiPV,
      temperature: temp,
      blunderProb: blunder,
      movetime: 300 + Math.round(frac * 200),
    };
  } else {
    engineConfig = {
      type: "stockfish",
      uciElo: targetElo,
      movetime: Math.min(1800, 300 + (targetElo - 1300)),
    };
  }

  return {
    id: "coach",
    name: "Coach",
    elo: targetElo,
    difficulty,
    tagline: "Dynamically adapts to give you the perfect competitive game.",
    style: "Matches your skill and gently challenges you to improve.",
    avatar: makeAvatar("#202820", "#65a65c", "#a2e298", "star"),
    engine: engineConfig,
    thinkTime: { min: 600, max: 1500 },
    openingBias: ["e4", "d4", "Nf3"],
    lines: {
      greeting: [
        `Hello! I'm calibrated to around ${targetElo} Elo to match your level. Let's play!`,
        "I'm here to help you practice and improve your chess. Good luck!",
        "Every game is a chance to learn. Let's see what we can discover together.",
        "Calibrated and ready! Take your time and look for your best moves.",
      ],
      capture: [
        "A good exchange to consider. Watch the open files now.",
        "That piece trade changes the dynamic of the center.",
        "Careful calculation pays off in moments like this.",
        "Tactical grab! Let's see how the board reacts.",
      ],
      check: [
        "Check! Always make sure your king has an escape plan.",
        "Check! Notice how active piece placement creates these opportunities.",
        "Check! A good moment to evaluate king safety.",
        "Check! Look for the most solid defensive square.",
      ],
      blunder: [
        "I left a weakness there! Can you spot it?",
        "An instructive position! I gave you an opportunity.",
        "Watch that diagonal! A nice tactical chance for you.",
        "Good pressure! You forced an inaccuracy from me.",
      ],
      winning: [
        "My pieces have found good coordination. How can you challenge them?",
        "I have a slight edge here. Keep looking for active counterplay!",
        "Stay alert! Even in tough positions, resources exist.",
        "Good defense is an art. Keep fighting for the center.",
      ],
      losing: [
        "You're playing with great vision! Keep that focus.",
        "Impressive attack! You're really seeing the board clearly.",
        "You have the advantage now. Convert it steadily!",
        "Excellent tactical awareness on your part today.",
      ],
      win: [
        "Good game! You made me work hard for that win.",
        "Thank you! A great match. Every loss is a stepping stone to mastery.",
        "Well played! You had some strong moments in the middlegame.",
        "Good battle! Want to analyze where things shifted?",
      ],
      loss: [
        "Fantastic win! You demonstrated superior calculation today.",
        "Congratulations! Your improvement is really showing on the board.",
        "Well deserved victory! You took your chances decisively.",
        "Outstanding performance! I'll nudge my rating up for our next game.",
      ],
      draw: [
        "A well-earned draw! That was a balanced, instructive struggle.",
        "Great defensive resilience. A fair division of the point.",
        "High-level balance from start to finish. Good game!",
        "Honors even! That shows how equally matched we are right now.",
      ],
    },
  };
}

export function getBot(id: string, playerElo?: number): BotConfig | undefined {
  if (id === "coach") {
    return getCoachBot(playerElo ?? 800);
  }
  return BOTS.find((b) => b.id === id);
}

export function getRecommendedBot(playerElo: number): BotConfig {
  // Find the bot closest to the player's rating
  let closest = BOTS[0];
  let minDiff = Math.abs(BOTS[0].elo - playerElo);

  for (const bot of BOTS) {
    const diff = Math.abs(bot.elo - playerElo);
    if (diff < minDiff) {
      minDiff = diff;
      closest = bot;
    }
  }

  return closest;
}
