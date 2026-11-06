<script lang="ts">
  type Tile = {
    resource: string;
    number: number;
    className: string;
  };

  const resources = [
    'Lumber', 'Lumber', 'Lumber', 'Lumber',
    'Wool', 'Wool', 'Wool', 'Wool',
    'Grain', 'Grain', 'Grain', 'Grain',
    'Brick', 'Brick', 'Brick',
    'Ore', 'Ore', 'Ore',
    'Desert'
  ];

  const numbers = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

  const layout = [
    [0, 1, 2],
    [3, 4, 5, 6],
    [7, 8, 9, 10, 11],
    [12, 13, 14, 15],
    [16, 17, 18]
  ];

  let board: Tile[][] = [];

  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getTileClass(resource: string) {
    switch (resource) {
      case 'Lumber':
        return 'hex-forest';
      case 'Wool':
        return 'hex-sheep';
      case 'Grain':
        return 'hex-grain';
      case 'Brick':
        return 'hex-brick';
      case 'Ore':
        return 'hex-ore';
      case 'Desert':
        return 'hex-desert';
      default:
        return 'hex-default';
    }
  }

  function generateBoard() {
    const resourceTiles = shuffle(resources);
    const numberTiles = shuffle(numbers);

    let numberIndex = 0;

    board = layout.map((row) =>
      row.map((hexIndex) => {
        const resource = resourceTiles[hexIndex];
        const number = resource === 'Desert' ? 0 : numberTiles[numberIndex++];

        return {
          resource,
          number,
          className: getTileClass(resource)
        };
      })
    );
  }

  generateBoard();
</script>

<div class="board" on:click={generateBoard} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && generateBoard()}>
  {#each board as row}
    <div class="row">
      {#each row as tile}
        <div class="hex {tile.className}">
          <span class="hex-number">{tile.number}</span>
          <span class="hex-resource">{tile.resource}</span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style>
  :root {
    --hex-w: 110px;
    --hex-h: 96px;
  }

  .board {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    padding: 1rem 0 2rem;
  }

  .row {
    display: flex;
    justify-content: center;
    margin-top: -12px;
  }

  .row:first-child {
    margin-top: 0;
  }

  .row:nth-child(even) {
    margin-left: calc(var(--hex-w) / 2);
  }

  .row:nth-child(odd) {
    margin-left: 0;
  }

  .hex {
    width: var(--hex-w);
    height: var(--hex-h);
    margin: 0 calc(var(--hex-w) * -0.18);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    clip-path: polygon(
      25% 6%, 75% 6%,
      100% 50%, 75% 94%,
      25% 94%, 0% 50%
    );
    border: 2px solid rgba(0, 0, 0, 0.35);
    box-sizing: border-box;
    transition: transform 0.15s ease;
  }

  .hex:hover {
    transform: scale(1.02);
  }

  .hex-number {
    font-size: 1.1rem;
    background: rgba(255, 255, 255, 0.7);
    width: 32px;
    height: 32px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #111;
    margin-bottom: 0.35rem;
  }

  .hex-resource {
    font-size: 0.8rem;
    line-height: 1.1;
    padding: 0 0.35rem;
  }

  .hex-forest {
    background: #4d9d4d;
    color: #f1f7f1;
  }

  .hex-sheep {
    background: #cfdc8c;
    color: #1d2a13;
  }

  .hex-grain {
    background: #e9d76e;
    color: #332a00;
  }

  .hex-brick {
    background: #b76d40;
    color: #fff4ee;
  }

  .hex-ore {
    background: #8d9198;
    color: #f2f4f7;
  }

  .hex-desert {
    background: #d9b97c;
    color: #2d1d00;
  }
</style>