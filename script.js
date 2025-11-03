const RANKS = [
  { code: '2', name: 'Two', value: 2 },
  { code: '3', name: 'Three', value: 3 },
  { code: '4', name: 'Four', value: 4 },
  { code: '5', name: 'Five', value: 5 },
  { code: '6', name: 'Six', value: 6 },
  { code: '7', name: 'Seven', value: 7 },
  { code: '8', name: 'Eight', value: 8 },
  { code: '9', name: 'Nine', value: 9 },
  { code: 'T', name: 'Ten', value: 10 },
  { code: 'J', name: 'Jack', value: 11 },
  { code: 'Q', name: 'Queen', value: 12 },
  { code: 'K', name: 'King', value: 13 },
  { code: 'A', name: 'Ace', value: 14 }
];

const SUITS = [
  { code: 'S', symbol: '♠', name: 'Spades' },
  { code: 'H', symbol: '♥', name: 'Hearts' },
  { code: 'D', symbol: '♦', name: 'Diamonds' },
  { code: 'C', symbol: '♣', name: 'Clubs' }
];

const FULL_DECK = RANKS.flatMap((rank) =>
  SUITS.map((suit) => ({
    code: `${rank.code}${suit.code}`,
    rank: rank.code,
    value: rank.value,
    suit: suit.code,
    label: `${rank.code}${suit.symbol} — ${rank.name} of ${suit.name}`
  }))
);

const rankMap = Object.fromEntries(RANKS.map((rank) => [rank.code, rank]));
const suitMap = Object.fromEntries(SUITS.map((suit) => [suit.code, suit]));
const valueRankMap = Object.fromEntries(RANKS.map((rank) => [rank.value, rank]));
const rankPluralMap = Object.fromEntries(
  RANKS.map((rank) => [rank.value, rank.name.endsWith('Six') ? `${rank.name}es` : `${rank.name}s`])
);

document.addEventListener('DOMContentLoaded', () => {
  const playerContainer = document.getElementById('player-cards');
  const communityContainer = document.getElementById('community-cards');
  const playerPreview = document.getElementById('player-preview');
  const communityPreview = document.getElementById('community-preview');
  const calculateButton = document.getElementById('calculate-button');
  const resetButton = document.getElementById('reset-button');
  const simulationSlider = document.getElementById('simulation-count');
  const simulationOutput = document.getElementById('simulation-output');
  const winDisplay = document.getElementById('win-percentage');
  const tieDisplay = document.getElementById('tie-percentage');
  const lossDisplay = document.getElementById('loss-percentage');
  const resultsMeta = document.getElementById('results-meta');
  const opponentInput = document.getElementById('opponent-count');
  const handSummary = document.getElementById('hand-summary');
  const tableSlots = Array.from(document.querySelectorAll('.table-card-slot'));
  const cardModal = document.getElementById('card-modal');
  const cardChoiceGrid = document.getElementById('card-choice-grid');
  const cardModalTitle = document.getElementById('card-modal-title');
  const cardModalSubtitle = document.getElementById('card-modal-subtitle');
  const cardClearButton = document.getElementById('card-clear-button');
  const modalCloseButtons = cardModal ? cardModal.querySelectorAll('[data-modal-close]') : [];
  const DEFAULT_STATUS_MESSAGE =
    'Select your cards to automatically estimate the Monte Carlo odds.';
  const WAITING_FOR_HOLE_MESSAGE = 'Choose both hole cards to unlock real-time odds.';

  let isCalculating = false;
  let autoSimulationHandle = null;
  let activeSlotId = null;
  let lastFocusedElement = null;

  createSelectInputs(playerContainer, 2, 'Player Card');
  createSelectInputs(communityContainer, 5, 'Board Card');

  populateSelectOptions();
  attachSelectListeners();
  buildCardChoiceGrid();
  attachTableHandlers();
  updatePreviews();
  enforceUniqueSelections();
  clearResults();
  setStatus(DEFAULT_STATUS_MESSAGE, false);
  updatePreviews();
  simulationOutput.textContent = Number(simulationSlider.value).toLocaleString();

  simulationSlider.addEventListener('input', () => {
    simulationOutput.textContent = Number(simulationSlider.value).toLocaleString();
    scheduleAutoSimulation();
  });

  calculateButton.addEventListener('click', () => {
    runSimulation(false);
  });

  opponentInput.addEventListener('input', () => {
    scheduleAutoSimulation();
  });

  calculateButton.addEventListener('click', async () => {
    const playerCards = collectCards(playerContainer);
    if (playerCards.length < 2) {
      setStatus('Please select both of your hole cards before calculating.', true);
      return;
    }

    const communityCards = collectCards(communityContainer);
    const allSelected = [...playerCards, ...communityCards];

    if (hasDuplicates(allSelected)) {
      setStatus('Duplicate cards detected. Each card can only appear once.', true);
      return;
    }

    const opponents = clamp(parseInt(opponentInput.value, 10) || 1, 1, 5);
    opponentInput.value = opponents.toString();

    const iterations = parseInt(simulationSlider.value, 10);

    toggleLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const { winRate, tieRate, lossRate } = simulateOdds(
        playerCards,
        communityCards,
        opponents,
        iterations
      );

      winDisplay.textContent = formatPercent(winRate);
      tieDisplay.textContent = formatPercent(tieRate);
      lossDisplay.textContent = formatPercent(lossRate);

      setStatus(
        `Simulated ${iterations.toLocaleString()} hands against ${opponents} opponent${
          opponents > 1 ? 's' : ''
        }.`,
        false
      );
      updateHandSummary();
    } catch (error) {
      console.error(error);
      setStatus('Something went wrong during the simulation. Please try again.', true);
    } finally {
      toggleLoading(false);
    }
  });

  resetButton.addEventListener('click', () => {
    [...playerContainer.querySelectorAll('select'), ...communityContainer.querySelectorAll('select')].forEach(
      (select) => {
        select.selectedIndex = 0;
        applySelectColor(select);
      }
    );

    opponentInput.value = '1';
    simulationSlider.value = '5000';
    simulationOutput.textContent = '5,000';
    if (autoSimulationHandle) {
      clearTimeout(autoSimulationHandle);
      autoSimulationHandle = null;
    }
    clearResults();
    enforceUniqueSelections();
    setStatus(DEFAULT_STATUS_MESSAGE, false);
    updatePreviews();
    closeCardModal();
  });

  function clearResults() {
    winDisplay.textContent = '0%';
    tieDisplay.textContent = '0%';
    lossDisplay.textContent = '0%';
  }
    winDisplay.textContent = '0%';
    tieDisplay.textContent = '0%';
    lossDisplay.textContent = '0%';
    setStatus('Provide your cards and press "Calculate" to run a Monte Carlo simulation.', false);
    updatePreviews();
  });

  function toggleLoading(isLoading) {
    calculateButton.disabled = isLoading;
    calculateButton.textContent = isLoading ? 'Calculating…' : 'Calculate Odds';
  }

  function setStatus(message, isError) {
    resultsMeta.textContent = message;
    resultsMeta.classList.toggle('error', isError);
  }

  function attachSelectListeners() {
    const selects = document.querySelectorAll('select');
    selects.forEach((select) => {
      select.addEventListener('change', (event) => {
        const { value } = event.target;
        if (value && isCardSelectedElsewhere(value, event.target)) {
          event.target.value = '';
          setStatus('That card is already selected. Choose a different card.', true);
        }

        applySelectColor(event.target);
        enforceUniqueSelections();
        updatePreviews();
        scheduleAutoSimulation();
      });

      applySelectColor(select);
      select.addEventListener('change', updatePreviews);
    });
  }

  function updatePreviews() {
    updatePreviewGroup(playerContainer, playerPreview);
    updatePreviewGroup(communityContainer, communityPreview);
    updateHandSummary();
    updateTableCards();
    if (isModalOpen()) {
      refreshCardChoices();
    }
  }

  function updatePreviewGroup(container, preview) {
    const selects = Array.from(container.querySelectorAll('select'));
    preview.innerHTML = '';
    selects.forEach((select, index) => {
      const card = cardFromCode(select.value);
      const label = select.dataset.label || `Card ${index + 1}`;
      preview.appendChild(createCardElement(card, label));
    });
  }

  function attachTableHandlers() {
    tableSlots.forEach((slot) => {
      slot.addEventListener('click', () => {
        openCardModal(slot.dataset.cardSlot);
      });
    });

    modalCloseButtons.forEach((button) => {
      button.addEventListener('click', () => {
        closeCardModal();
      });
    });

    if (cardClearButton) {
      cardClearButton.addEventListener('click', () => {
        if (!activeSlotId) return;
        const select = getSelectForSlot(activeSlotId);
        if (!select) return;
        select.value = '';
        applySelectColor(select);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closeCardModal();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isModalOpen()) {
        event.preventDefault();
        closeCardModal();
      }
    });

    if (cardModal) {
      cardModal.addEventListener('click', (event) => {
        if (event.target === cardModal) {
          closeCardModal();
        }
      });
    }
  }

  function buildCardChoiceGrid() {
    if (!cardChoiceGrid) return;
    cardChoiceGrid.innerHTML = '';

    FULL_DECK.forEach((card) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'card-choice';
      button.dataset.cardCode = card.code;
      const label = `${card.label}`;
      button.setAttribute('aria-label', label);
      button.appendChild(createCardElement(card, card.label));
      button.addEventListener('click', () => {
        if (!activeSlotId) return;
        const select = getSelectForSlot(activeSlotId);
        if (!select) return;
        select.value = card.code;
        applySelectColor(select);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closeCardModal();
      });
      cardChoiceGrid.appendChild(button);
    });
  }

  function updateTableCards() {
    tableSlots.forEach((slot) => {
      const select = getSelectForSlot(slot.dataset.cardSlot);
      const label = select?.dataset.label || 'Card';
      const card = select ? cardFromCode(select.value) : null;
      slot.innerHTML = '';
      const cardEl = createCardElement(card, label);
      slot.appendChild(cardEl);
      slot.setAttribute(
        'aria-label',
        card ? `${label}: ${describeCard(card)}` : `${label}: choose a card`
      );
    });
  }

  function refreshCardChoices() {
    if (!cardChoiceGrid || !activeSlotId) return;
    const select = getSelectForSlot(activeSlotId);
    const currentValue = select?.value || '';

    cardChoiceGrid.querySelectorAll('.card-choice').forEach((button) => {
      const { cardCode } = button.dataset;
      const isCurrent = cardCode === currentValue;
      button.disabled = !isCurrent && isCardSelectedElsewhere(cardCode, select || null);
      button.classList.toggle('selected', isCurrent);
    });

    if (cardClearButton) {
      cardClearButton.disabled = !currentValue;
    }
  }

  function openCardModal(slotId) {
    const select = getSelectForSlot(slotId);
    if (!cardModal || !select) return;
    activeSlotId = slotId;
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardModal.classList.add('is-open');
    cardModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (cardModalTitle) {
      cardModalTitle.textContent = `Choose ${select.dataset.label}`;
    }
    if (cardModalSubtitle) {
      cardModalSubtitle.textContent = 'Tap a card below to assign it to this slot.';
    }
    refreshCardChoices();
    const focusTarget =
      cardChoiceGrid?.querySelector('.card-choice:not([disabled])') || cardClearButton || null;
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  }

  function closeCardModal() {
    if (!cardModal) return;
    cardModal.classList.remove('is-open');
    cardModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    activeSlotId = null;
    if (lastFocusedElement && document.body.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  function isModalOpen() {
    return cardModal?.classList.contains('is-open');
  }

  function getSelectForSlot(slotId) {
    if (!slotId) return null;
    return document.querySelector(`select[data-slot='${slotId}']`);
  }

  function describeCard(card) {
    const rank = rankMap[card.rank]?.name || card.rank;
    const suit = suitMap[card.suit]?.name || card.suit;
    return `${rank} of ${suit}`;
  }

  function updateHandSummary() {
    const playerCards = collectCards(playerContainer);
    const communityCards = collectCards(communityContainer);

    if (playerCards.length < 2) {
      handSummary.textContent = 'Select both hole cards to begin calculating odds.';
      return;
    }

    const combined = [...playerCards, ...communityCards];
    const score = evaluateHand(combined);
    const description = describeHand(score);

    if (communityCards.length === 0) {
      handSummary.textContent = `With only your hole cards you currently have ${description}.`;
    } else if (combined.length < 5) {
      const remaining = 5 - combined.length;
      handSummary.textContent = `Best with known cards: ${description}. Add ${remaining} more community card${
        remaining > 1 ? 's' : ''
      } to see the full-board potential.`;
    } else {
      handSummary.textContent = `Current best with known cards: ${description}.`;
    }
  }
  function scheduleAutoSimulation() {
    if (autoSimulationHandle) {
      clearTimeout(autoSimulationHandle);
    }
    autoSimulationHandle = setTimeout(() => {
      autoSimulationHandle = null;
      attemptAutoSimulation();
    }, 250);
  }

  async function attemptAutoSimulation() {
    const playerCards = collectCards(playerContainer);
    const communityCards = collectCards(communityContainer);
    const allSelected = [...playerCards, ...communityCards];

    if (playerCards.length < 2) {
      clearResults();
      setStatus(WAITING_FOR_HOLE_MESSAGE, false);
      return;
    }

    if (hasDuplicates(allSelected)) {
      setStatus('Duplicate cards detected. Each card can only appear once.', true);
      return;
    }

    await runSimulation(true);
  }

  async function runSimulation(autoTriggered) {
    if (isCalculating) return;

    const playerCards = collectCards(playerContainer);
    if (playerCards.length < 2) {
      if (!autoTriggered) {
        setStatus('Please select both of your hole cards before calculating.', true);
      }
      return;
    }

    const communityCards = collectCards(communityContainer);
    const allSelected = [...playerCards, ...communityCards];

    if (hasDuplicates(allSelected)) {
      setStatus('Duplicate cards detected. Each card can only appear once.', true);
      return;
    }

    const opponents = clamp(parseInt(opponentInput.value, 10) || 1, 1, 5);
    opponentInput.value = opponents.toString();

    const iterations = parseInt(simulationSlider.value, 10);

    isCalculating = true;
    toggleLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const { winRate, tieRate, lossRate } = simulateOdds(
        playerCards,
        communityCards,
        opponents,
        iterations
      );

      winDisplay.textContent = formatPercent(winRate);
      tieDisplay.textContent = formatPercent(tieRate);
      lossDisplay.textContent = formatPercent(lossRate);

      setStatus(
        `Simulated ${iterations.toLocaleString()} hands against ${opponents} opponent${
          opponents > 1 ? 's' : ''
        }.`,
        false
      );
      updateHandSummary();
    } catch (error) {
      console.error(error);
      setStatus('Something went wrong during the simulation. Please try again.', true);
    } finally {
      isCalculating = false;
      toggleLoading(false);
    }
  }
});

function createSelectInputs(container, count, labelPrefix) {
  for (let i = 1; i <= count; i += 1) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-select';

    const label = document.createElement('label');
    label.setAttribute('for', `${container.id}-${i}`);
    label.textContent = `${labelPrefix} ${i}`;

    const select = document.createElement('select');
    select.id = `${container.id}-${i}`;
    select.dataset.slot = `${container.id}-${i}`;
    select.dataset.label = `${labelPrefix} ${i}`;

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    container.appendChild(wrapper);
  }
}

function populateSelectOptions() {
  const selects = document.querySelectorAll('select');
  selects.forEach((select) => {
    const placeholder = new Option('Select card', '');
    placeholder.style.color = 'var(--text-muted)';
    select.appendChild(placeholder);
    FULL_DECK.forEach((card) => {
      const option = new Option(card.label, card.code);
      const isRedSuit = card.suit === 'H' || card.suit === 'D';
      option.dataset.suit = card.suit;
      option.style.color = isRedSuit ? 'var(--card-red)' : 'var(--card-black)';
    select.appendChild(new Option('Select card', ''));
    FULL_DECK.forEach((card) => {
      const option = new Option(card.label, card.code);
      select.appendChild(option);
    });
  });
}

function applySelectColor(select) {
  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption || !select.value) {
    select.style.color = 'var(--text-muted)';
    return;
  }

  const suit = selectedOption.dataset?.suit;
  const isRedSuit = suit === 'H' || suit === 'D';
  select.style.color = isRedSuit ? 'var(--card-red)' : 'var(--card-black)';
}

function collectCards(container) {
  return Array.from(container.querySelectorAll('select'))
    .map((select) => cardFromCode(select.value))
    .filter(Boolean);
}

function cardFromCode(code) {
  if (!code) return null;
  const rank = rankMap[code[0]];
  const suit = suitMap[code[1]];
  return {
    code,
    rank: rank.code,
    value: rank.value,
    suit: suit.code
  };
}

function hasDuplicates(cards) {
  const seen = new Set();
  return cards.some((card) => {
    if (seen.has(card.code)) return true;
    seen.add(card.code);
    return false;
  });
}

function enforceUniqueSelections() {
  const selects = Array.from(document.querySelectorAll('select'));
  const selectedValues = new Map();

  selects.forEach((select) => {
    if (select.value) {
      selectedValues.set(select.value, (selectedValues.get(select.value) || 0) + 1);
    }
  });

  selects.forEach((select) => {
    Array.from(select.options).forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        return;
      }

      if (option.value === select.value) {
        option.disabled = false;
        return;
      }

      option.disabled = selectedValues.has(option.value);
    });
  });
}

function isCardSelectedElsewhere(value, currentSelect) {
  return Array.from(document.querySelectorAll('select')).some(
    (select) => select !== currentSelect && select.value === value
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function createCardElement(card, label) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card-visual';

  if (!card) {
    cardEl.classList.add('card-empty');
    cardEl.innerHTML = `<span class="card-slot-label">${label}</span>`;
    cardEl.innerHTML = `<span class="card-slot">${label}</span>`;
    return cardEl;
  }

  const suitInfo = suitMap[card.suit];
  const isRedSuit = card.suit === 'H' || card.suit === 'D';
  if (isRedSuit) {
    cardEl.classList.add('card-red');
  }
  cardEl.innerHTML = `
    <div class="card-corner card-corner--top">
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${suitInfo.symbol}</span>
    </div>
    <div class="card-center" aria-hidden="true">
      <span class="card-suit card-suit--large">${suitInfo.symbol}</span>
    </div>
    <div class="card-corner card-corner--bottom">
      <span class="card-rank">${card.rank}</span>
      <span class="card-suit">${suitInfo.symbol}</span>
    </div>
  cardEl.classList.toggle('card-red', card.suit === 'H' || card.suit === 'D');
  cardEl.innerHTML = `
    <span class="card-rank">${card.rank}</span>
    <span class="card-suit">${suitInfo.symbol}</span>
  `;

  return cardEl;
}

function describeHand(score) {
  const rankName = (value) => valueRankMap[value]?.name || value;
  const rankPlural = (value) => rankPluralMap[value] || `${rankName(value)}s`;

  switch (score.category) {
    case 8: {
      const high = score.tiebreakers[0];
      if (high === 14) return 'a Royal Flush';
      return `a Straight Flush (${rankName(high)} high)`;
    }
    case 7: {
      const quad = rankPlural(score.tiebreakers[0]);
      const kicker = rankName(score.tiebreakers[1]);
      return `Four of a Kind (${quad}) with a ${kicker} kicker`;
    }
    case 6: {
      const triple = rankPlural(score.tiebreakers[0]);
      const pair = rankPlural(score.tiebreakers[1]);
      return `a Full House (${triple} over ${pair})`;
    }
    case 5: {
      const highCards = score.tiebreakers.map(rankName).join(', ');
      return `a Flush (${highCards})`;
    }
    case 4: {
      const high = rankName(score.tiebreakers[0]);
      return `a Straight (${high} high)`;
    }
    case 3: {
      const triple = rankPlural(score.tiebreakers[0]);
      const kickers = score.tiebreakers.slice(1).map(rankName).join(', ');
      return `Three of a Kind (${triple}${kickers ? `) with kickers ${kickers}` : ')'}`;
    }
    case 2: {
      const [highPair, lowPair, ...rest] = score.tiebreakers;
      const kicker = rest.length ? rankName(rest[0]) : null;
      return `Two Pair (${rankPlural(highPair)} and ${rankPlural(lowPair)}${
        kicker ? `) with a ${kicker} kicker` : ')'
      }`;
    }
    case 1: {
      const [pair, ...kickers] = score.tiebreakers;
      const kickerText = kickers.length
        ? ` with kicker${kickers.length > 1 ? 's' : ''} ${kickers.map(rankName).join(', ')}`
        : '';
      return `One Pair (${rankPlural(pair)}${kickerText})`;
    }
    default: {
      const [high, ...rest] = score.tiebreakers;
      const kickerText = rest.length ? ` with kickers ${rest.map(rankName).join(', ')}` : '';
      return `High Card ${rankName(high)}${kickerText}`;
    }
  }
}

function simulateOdds(playerCards, communityCards, opponents, iterations) {
  if (playerCards.length !== 2) {
    throw new Error('Two player cards are required for simulation.');
  }

  const playerCodes = new Set(playerCards.map((card) => card.code));
  const communityCodes = new Set(communityCards.map((card) => card.code));

  const wins = { win: 0, tie: 0, loss: 0 };

  for (let i = 0; i < iterations; i += 1) {
    const deck = FULL_DECK.filter(
      (card) => !playerCodes.has(card.code) && !communityCodes.has(card.code)
    );

    const board = [...communityCards];
    while (board.length < 5) {
      board.push(drawRandomCard(deck));
    }

    const opponentHands = [];
    for (let opp = 0; opp < opponents; opp += 1) {
      opponentHands.push([drawRandomCard(deck), drawRandomCard(deck)]);
    }

    const playerScore = evaluateHand([...playerCards, ...board]);
    let hasLoss = false;
    let hasTie = false;

    for (const opponent of opponentHands) {
      const opponentScore = evaluateHand([...opponent, ...board]);
      const result = compareHands(playerScore, opponentScore);
      if (result < 0) {
        hasLoss = true;
        break;
      }
      if (result === 0) {
        hasTie = true;
      }
    }

    if (hasLoss) {
      wins.loss += 1;
    } else if (hasTie) {
      wins.tie += 1;
    } else {
      wins.win += 1;
    }
  }

  const total = wins.win + wins.tie + wins.loss;
  return {
    winRate: wins.win / total,
    tieRate: wins.tie / total,
    lossRate: wins.loss / total
  };
}

function drawRandomCard(deck) {
  const index = Math.floor(Math.random() * deck.length);
  return deck.splice(index, 1)[0];
}

function evaluateHand(cards) {
  const values = cards.map((card) => card.value);

  const valueCounts = new Map();
  const suitCounts = new Map();
  const cardsBySuit = new Map();

  cards.forEach((card) => {
    valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    if (!cardsBySuit.has(card.suit)) cardsBySuit.set(card.suit, []);
    cardsBySuit.get(card.suit).push(card);
  });

  const sortedValuesDesc = [...values].sort((a, b) => b - a);
  const uniqueValuesDesc = [...new Set(sortedValuesDesc)];

  let flushCards = null;
  for (const [suit, count] of suitCounts.entries()) {
    if (count >= 5) {
      flushCards = cardsBySuit
        .get(suit)
        .slice()
        .sort((a, b) => b.value - a.value);
      break;
    }
  }

  const straightHigh = findStraightHigh(uniqueValuesDesc);
  const straightFlushHigh = flushCards
    ? findStraightHigh(flushCards.map((card) => card.value))
    : null;

  if (straightFlushHigh) {
    return { category: 8, tiebreakers: [straightFlushHigh] };
  }

  const groups = Array.from(valueCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const fourKind = groups.find(([_, count]) => count === 4);
  if (fourKind) {
    const kicker = uniqueValuesDesc.filter((value) => value !== fourKind[0])[0];
    return { category: 7, tiebreakers: [fourKind[0], kicker] };
  }

  const triples = groups.filter(([_, count]) => count === 3).map(([value]) => value);
  const pairs = groups.filter(([_, count]) => count === 2).map(([value]) => value);

  if (triples.length > 0 && (pairs.length > 0 || triples.length > 1)) {
    const tripleValue = triples[0];
    const pairValue = triples.length > 1 ? triples[1] : pairs[0];
    return { category: 6, tiebreakers: [tripleValue, pairValue] };
  }

  if (flushCards) {
    const topFive = flushCards.slice(0, 5).map((card) => card.value);
    return { category: 5, tiebreakers: topFive };
  }

  if (straightHigh) {
    return { category: 4, tiebreakers: [straightHigh] };
  }

  if (triples.length > 0) {
    const tripleValue = triples[0];
    const kickers = uniqueValuesDesc
      .filter((value) => value !== tripleValue)
      .slice(0, 2);
    return { category: 3, tiebreakers: [tripleValue, ...kickers] };
  }

  if (pairs.length >= 2) {
    const [highPair, lowPair] = pairs.slice(0, 2);
    const kicker = uniqueValuesDesc
      .filter((value) => value !== highPair && value !== lowPair)
      .slice(0, 1);
    return { category: 2, tiebreakers: [highPair, lowPair, ...kicker] };
  }

  if (pairs.length === 1) {
    const pairValue = pairs[0];
    const kickers = uniqueValuesDesc
      .filter((value) => value !== pairValue)
      .slice(0, 3);
    return { category: 1, tiebreakers: [pairValue, ...kickers] };
  }

  return { category: 0, tiebreakers: uniqueValuesDesc.slice(0, 5) };
}

function findStraightHigh(valuesDesc) {
  if (!valuesDesc.length) return null;
  const valuesAsc = [...new Set(valuesDesc)]
    .sort((a, b) => a - b)
    .filter((value, index, arr) => index === 0 || value !== arr[index - 1]);

  if (valuesAsc.includes(14)) {
    valuesAsc.unshift(1);
  }

  let runLength = 1;
  let bestHigh = null;

  for (let i = 1; i < valuesAsc.length; i += 1) {
    if (valuesAsc[i] === valuesAsc[i - 1] + 1) {
      runLength += 1;
    } else if (valuesAsc[i] !== valuesAsc[i - 1]) {
      runLength = 1;
    }

    if (runLength >= 5) {
      const high = valuesAsc[i];
      const normalizedHigh = high === 1 ? 5 : high;
      bestHigh = Math.max(bestHigh || 0, normalizedHigh);
    }
  }

  return bestHigh;
}

function compareHands(a, b) {
  if (a.category !== b.category) {
    return a.category > b.category ? 1 : -1;
  }

  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i += 1) {
    const left = a.tiebreakers[i] || 0;
    const right = b.tiebreakers[i] || 0;
    if (left !== right) {
      return left > right ? 1 : -1;
    }
  }

  return 0;
}
