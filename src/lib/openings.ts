interface OpeningRule {
  moves: string[];
  name: string;
  eco?: string;
}

const OPENINGS: OpeningRule[] = [
  // Ruy Lopez
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"], name: "Ruy Lopez: Morphy Defense", eco: "C70" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"], name: "Ruy Lopez: Berlin Defense", eco: "C65" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy Lopez", eco: "C60" },

  // Italian & Scotch
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], name: "Italian Game: Giuoco Piano", eco: "C50" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"], name: "Italian Game: Two Knights Defense", eco: "C55" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game", eco: "C50" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "d4"], name: "Scotch Game", eco: "C45" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Nc3"], name: "Four Knights Game", eco: "C47" },
  { moves: ["e4", "e5", "Nf3", "Nf6"], name: "Petrov's Defense", eco: "C42" },
  { moves: ["e4", "e5", "f4"], name: "King's Gambit", eco: "C30" },

  // Sicilian Defense
  { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"], name: "Sicilian Defense: Najdorf", eco: "B90" },
  { moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"], name: "Sicilian Defense: Dragon", eco: "B70" },
  { moves: ["e4", "c5", "Nf3", "Nc6"], name: "Sicilian Defense: Old Sicilian", eco: "B30" },
  { moves: ["e4", "c5", "Nf3", "e6"], name: "Sicilian Defense: French Variation", eco: "B40" },
  { moves: ["e4", "c5", "c3"], name: "Sicilian Defense: Alapin Variation", eco: "B22" },
  { moves: ["e4", "c5", "Nc3"], name: "Closed Sicilian", eco: "B23" },
  { moves: ["e4", "c5"], name: "Sicilian Defense", eco: "B20" },

  // French Defense
  { moves: ["e4", "e6", "d4", "d5", "Nc3", "Bb4"], name: "French Defense: Winawer Variation", eco: "C15" },
  { moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6"], name: "French Defense: Classical", eco: "C11" },
  { moves: ["e4", "e6", "d4", "d5", "e5"], name: "French Defense: Advance Variation", eco: "C02" },
  { moves: ["e4", "e6", "d4", "d5", "Nd2"], name: "French Defense: Tarrasch Variation", eco: "C03" },
  { moves: ["e4", "e6", "d4", "d5"], name: "French Defense", eco: "C00" },
  { moves: ["e4", "e6"], name: "French Defense", eco: "C00" },

  // Caro-Kann
  { moves: ["e4", "c6", "d4", "d5", "e5"], name: "Caro-Kann Defense: Advance Variation", eco: "B12" },
  { moves: ["e4", "c6", "d4", "d5", "Nc3"], name: "Caro-Kann Defense: Classical", eco: "B15" },
  { moves: ["e4", "c6", "d4", "d5"], name: "Caro-Kann Defense", eco: "B12" },
  { moves: ["e4", "c6"], name: "Caro-Kann Defense", eco: "B10" },

  // Other 1. e4
  { moves: ["e4", "d5"], name: "Scandinavian Defense", eco: "B01" },
  { moves: ["e4", "d6", "d4", "Nf6"], name: "Pirc Defense", eco: "B07" },
  { moves: ["e4", "g6"], name: "Modern Defense", eco: "B06" },
  { moves: ["e4", "e5"], name: "Open Game", eco: "C20" },
  { moves: ["e4"], name: "King's Pawn Opening", eco: "B00" },

  // 1. d4 Openings
  { moves: ["d4", "d5", "c4", "e6"], name: "Queen's Gambit Declined", eco: "D30" },
  { moves: ["d4", "d5", "c4", "c6"], name: "Slav Defense", eco: "D10" },
  { moves: ["d4", "d5", "c4", "dxc4"], name: "Queen's Gambit Accepted", eco: "D20" },
  { moves: ["d4", "d5", "c4"], name: "Queen's Gambit", eco: "D06" },
  { moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], name: "Nimzo-Indian Defense", eco: "E20" },
  { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"], name: "King's Indian Defense", eco: "E60" },
  { moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"], name: "Grünfeld Defense", eco: "D80" },
  { moves: ["d4", "Nf6", "c4", "c5"], name: "Benoni Defense", eco: "A56" },
  { moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"], name: "Queen's Indian Defense", eco: "E12" },
  { moves: ["d4", "Nf6", "Bf4"], name: "London System", eco: "D02" },
  { moves: ["d4", "Nf6", "Nf3"], name: "Indian Defense", eco: "A46" },
  { moves: ["d4", "Nf6"], name: "Indian Defense", eco: "A45" },
  { moves: ["d4", "f5"], name: "Dutch Defense", eco: "A80" },
  { moves: ["d4", "d5"], name: "Closed Game", eco: "D00" },
  { moves: ["d4"], name: "Queen's Pawn Opening", eco: "D00" },

  // Flank Openings
  { moves: ["c4", "e5"], name: "English Opening: King's English", eco: "A20" },
  { moves: ["c4"], name: "English Opening", eco: "A10" },
  { moves: ["Nf3", "d5", "g3"], name: "King's Indian Attack", eco: "A07" },
  { moves: ["Nf3"], name: "Réti Opening", eco: "A04" },
  { moves: ["b3"], name: "Nimzo-Larsen Attack", eco: "A01" },
  { moves: ["f4"], name: "Bird's Opening", eco: "A02" },
];

export function detectOpening(moves: { san: string }[]): { name: string; eco?: string } {
  if (!moves || moves.length === 0) {
    return { name: "Starting Position" };
  }

  const sanList = moves.map((m) => m.san);

  // Find longest matching prefix
  for (const o of OPENINGS) {
    if (o.moves.length <= sanList.length) {
      const match = o.moves.every((move, idx) => {
        // Strip check/mate symbols for robust comparison
        const m1 = move.replace(/[+#]/g, "");
        const m2 = sanList[idx].replace(/[+#]/g, "");
        return m1 === m2;
      });
      if (match) {
        return { name: o.name, eco: o.eco };
      }
    }
  }

  return { name: "Open Game" };
}
