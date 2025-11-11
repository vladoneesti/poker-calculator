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

// AnimationManager class for smooth visual transitions
class AnimationManager {
  // Animate number from old value to new value with easing
  animateValue(element, start, end, duration = 500) {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = start + (end - start) * eased;
      element.textContent = `${current.toFixed(1)}%`;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Animate strength bar width with smooth transition
  animateBar(element, targetWidth, duration = 500) {
    element.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    element.style.width = `${targetWidth}%`;
  }
  
  // Pulse animation for card selection feedback
  pulseCard(element) {
    element.style.animation = 'pulse 0.3s ease-out';
    setTimeout(() => {
      element.style.animation = '';
    }, 300);
  }
}

// Global animation manager instance
const animationManager = new AnimationManager();

document.addEventListener('DOMContentLoaded', () => {
  const playerContainer = document.getElementById('player-cards');
  const communityContainer = document.getElementById('community-cards');
  const playerPreview = document.getElementById('player-preview');
  const communityPreview = document.getElementById('community-preview');

  const resetButton = document.getElementById('reset-button');
  const simulationSlider = document.getElementById('simulation-count');
  const simulationOutput = document.getElementById('simulation-output');
  const winDisplay = document.getElementById('win-percentage');
  const tieDisplay = document.getElementById('tie-percentage');
  const lossDisplay = document.getElementById('loss-percentage');
  const resultsMeta = document.getElementById('results-meta');
  const opponentInput = document.getElementById('opponent-count');
  const handSummary = document.getElementById('hand-summary');
  const saveHandButton = document.getElementById('save-hand-button');
  const viewHistoryButton = document.getElementById('view-history-button');
  const historyModal = document.getElementById('history-modal');
  const historyModalBody = document.getElementById('history-modal-body');
  const historyModalClose = historyModal.querySelector('.history-modal-close');
  const clearHistoryButton = document.getElementById('clear-history-button');

  const DEFAULT_STATUS_MESSAGE =
    'Select your cards to automatically estimate the Monte Carlo odds.';
  const WAITING_FOR_HOLE_MESSAGE = 'Choose both hole cards to unlock real-time odds.';

  let isCalculating = false;
  let autoSimulationHandle = null;
  let lastSimulationResults = null; // Store last simulation results for saving


  createSelectInputs(playerContainer, 2, 'Player Card');
  createSelectInputs(communityContainer, 5, 'Board Card');

  populateSelectOptions();
  attachSelectListeners();

  updatePreviews();
  enforceUniqueSelections();
  clearResults();
  setStatus(DEFAULT_STATUS_MESSAGE, false);
  updatePreviews();
  simulationOutput.textContent = Number(simulationSlider.value).toLocaleString();

  // Initialize keyboard shortcuts
  keyboardManager.init(resetButton, opponentInput);

  simulationSlider.addEventListener('input', () => {
    simulationOutput.textContent = Number(simulationSlider.value).toLocaleString();
    scheduleAutoSimulation();
  });



  // Input validation for opponent count
  opponentInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value, 10);
    
    // Handle NaN cases by defaulting to 1
    if (isNaN(value) || e.target.value === '') {
      e.target.value = 1;
      scheduleAutoSimulation();
      return;
    }
    
    // Clamp to valid range (1-5)
    if (value < 1) {
      e.target.value = 1;
    } else if (value > 5) {
      e.target.value = 5;
    }
    
    scheduleAutoSimulation();
  });

  // Reject non-numeric characters
  opponentInput.addEventListener('keypress', (e) => {
    // Allow only numeric keys (0-9) and Enter
    if (!/[0-9]/.test(e.key) && e.key !== 'Enter') {
      e.preventDefault();
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
    
    // Clear cache when resetting
    evaluationCache.clear();
    
    clearResults();
    enforceUniqueSelections();
    setStatus(DEFAULT_STATUS_MESSAGE, false);
    updatePreviews();
    closeCardModal();
  });

  // Save Hand button
  saveHandButton.addEventListener('click', () => {
    const playerCards = collectCards(playerContainer);
    const communityCards = collectCards(communityContainer);
    
    // Validate that we have at least player cards and simulation results
    if (playerCards.length < 2) {
      setStatus('Please select both hole cards before saving.', true);
      return;
    }
    
    if (!lastSimulationResults) {
      setStatus('Please run a simulation before saving.', true);
      return;
    }
    
    // Get current hand description
    const combined = [...playerCards, ...communityCards];
    let handDescription = 'Unknown Hand';
    try {
      const score = evaluateHand(combined);
      handDescription = describeHand(score);
    } catch (error) {
      console.error('Error evaluating hand for save:', error);
    }
    
    // Save the hand
    const opponents = parseInt(opponentInput.value, 10) || 1;
    const savedHand = handHistoryManager.saveHand(
      playerCards,
      communityCards,
      opponents,
      lastSimulationResults,
      handDescription
    );
    
    if (savedHand) {
      setStatus('Hand saved successfully!', false);
      // Add fade-in animation
      resultsMeta.style.animation = 'fadeIn 0.2s ease-out';
      setTimeout(() => {
        resultsMeta.style.animation = '';
      }, 200);
    } else {
      setStatus('Failed to save hand. Please check your browser storage settings.', true);
    }
  });

  // View History button
  viewHistoryButton.addEventListener('click', () => {
    openHistoryModal();
  });

  // Close history modal
  historyModalClose.addEventListener('click', () => {
    closeHistoryModal();
  });

  // Close modal when clicking overlay
  historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
      closeHistoryModal();
    }
  });

  // Clear all history button
  clearHistoryButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all saved hands? This cannot be undone.')) {
      const success = handHistoryManager.clearHistory();
      if (success) {
        renderHistoryList();
        setStatus('Hand history cleared.', false);
      } else {
        setStatus('Failed to clear history.', true);
      }
    }
  });

  // Escape key to close history modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyModal.classList.contains('active')) {
      closeHistoryModal();
    }
  });

  function openHistoryModal() {
    renderHistoryList();
    historyModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeHistoryModal() {
    historyModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderHistoryList() {
    const hands = handHistoryManager.loadHands();
    
    if (hands.length === 0) {
      historyModalBody.innerHTML = '<p class="helper-text">No saved hands yet. Save your current hand to see it here.</p>';
      return;
    }
    
    historyModalBody.innerHTML = hands.map(hand => {
      const playerCardsHTML = hand.playerCards.map(code => {
        const card = cardFromCode(code);
        const isRed = card.suit === 'H' || card.suit === 'D';
        const suitSymbol = suitMap[card.suit].symbol;
        return `<span class="history-card-mini ${isRed ? 'red' : 'black'}">${card.rank}${suitSymbol}</span>`;
      }).join('');
      
      const communityCardsHTML = hand.communityCards.length > 0
        ? '<span class="history-card-divider">vs</span>' + hand.communityCards.map(code => {
            const card = cardFromCode(code);
            const isRed = card.suit === 'H' || card.suit === 'D';
            const suitSymbol = suitMap[card.suit].symbol;
            return `<span class="history-card-mini ${isRed ? 'red' : 'black'}">${card.rank}${suitSymbol}</span>`;
          }).join('')
        : '';
      
      const winPercent = (hand.results.winRate * 100).toFixed(1);
      const tiePercent = (hand.results.tieRate * 100).toFixed(1);
      const lossPercent = (hand.results.lossRate * 100).toFixed(1);
      
      return `
        <div class="history-item" data-hand-id="${hand.id}">
          <div class="history-item-header">
            <div>
              <h3 class="history-item-title">${hand.handDescription}</h3>
              <p class="history-item-timestamp">${handHistoryManager.formatTimestamp(hand.timestamp)}</p>
            </div>
            <button class="history-item-delete" data-hand-id="${hand.id}" onclick="event.stopPropagation()">Delete</button>
          </div>
          <div class="history-item-cards">
            ${playerCardsHTML}
            ${communityCardsHTML}
          </div>
          <div class="history-item-results">
            <div class="history-result-stat">
              <span class="history-result-label">Win</span>
              <span class="history-result-value">${winPercent}%</span>
            </div>
            <div class="history-result-stat">
              <span class="history-result-label">Tie</span>
              <span class="history-result-value">${tiePercent}%</span>
            </div>
            <div class="history-result-stat">
              <span class="history-result-label">Lose</span>
              <span class="history-result-value">${lossPercent}%</span>
            </div>
          </div>
          <div class="history-item-meta">
            ${hand.opponentCount} opponent${hand.opponentCount > 1 ? 's' : ''}
          </div>
        </div>
      `;
    }).join('');
    
    // Attach event listeners to history items
    historyModalBody.querySelectorAll('.history-item').forEach(item => {
      const handId = item.dataset.handId;
      
      // Click on item to restore hand
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('history-item-delete')) {
          restoreHand(handId);
        }
      });
      
      // Click on delete button
      const deleteButton = item.querySelector('.history-item-delete');
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(handId);
      });
    });
  }

  function restoreHand(handId) {
    const hands = handHistoryManager.loadHands();
    const hand = hands.find(h => h.id === handId);
    
    if (!hand) {
      setStatus('Hand not found.', true);
      return;
    }
    
    // Restore player cards
    const playerSelects = Array.from(playerContainer.querySelectorAll('select'));
    hand.playerCards.forEach((code, index) => {
      if (playerSelects[index]) {
        playerSelects[index].value = code;
        applySelectColor(playerSelects[index]);
      }
    });
    
    // Restore community cards
    const communitySelects = Array.from(communityContainer.querySelectorAll('select'));
    hand.communityCards.forEach((code, index) => {
      if (communitySelects[index]) {
        communitySelects[index].value = code;
        applySelectColor(communitySelects[index]);
      }
    });
    
    // Clear remaining community cards
    for (let i = hand.communityCards.length; i < communitySelects.length; i++) {
      communitySelects[i].value = '';
      applySelectColor(communitySelects[i]);
    }
    
    // Restore opponent count
    opponentInput.value = hand.opponentCount.toString();
    
    // Update UI
    enforceUniqueSelections();
    updatePreviews();
    
    // Close modal
    closeHistoryModal();
    
    // Run simulation
    scheduleAutoSimulation();
    
    setStatus('Hand restored from history.', false);
  }

  function deleteHistoryItem(handId) {
    const success = handHistoryManager.deleteHand(handId);
    if (success) {
      renderHistoryList();
    } else {
      setStatus('Failed to delete hand.', true);
    }
  }

  function closeCardModal() {
    // Placeholder function for future card modal implementation
    // Currently does nothing as card modal is not yet implemented
  }

  function clearResults() {
    winDisplay.textContent = '0%';
    tieDisplay.textContent = '0%';
    lossDisplay.textContent = '0%';
    
    // Store current values for future animations
    winDisplay.dataset.currentValue = '0';
    tieDisplay.dataset.currentValue = '0';
    lossDisplay.dataset.currentValue = '0';
  }

  function toggleLoading(isLoading) {
    // Auto-calculation - no button to disable
  }

  function setStatus(message, isError) {
    resultsMeta.textContent = message;
    resultsMeta.classList.toggle('error', isError);
    
    // Add fade-in animation for error messages
    if (isError) {
      resultsMeta.style.animation = 'fadeIn 0.2s ease-out';
      setTimeout(() => {
        resultsMeta.style.animation = '';
      }, 200);
    }
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

        // Clear cache when cards change
        evaluationCache.clear();

        applySelectColor(event.target);
        enforceUniqueSelections();
        updatePreviews();
        scheduleAutoSimulation();
        
        // Add pulse animation to the corresponding card preview
        if (value) {
          pulseCardPreview(event.target);
        }
      });

      applySelectColor(select);
      select.addEventListener('change', updatePreviews);
    });
  }

  function updatePreviews() {
    updatePreviewGroup(playerContainer, playerPreview);
    updatePreviewGroup(communityContainer, communityPreview);
    updateHandSummary();

  }

  function updatePreviewGroup(container, preview) {
    const selects = Array.from(container.querySelectorAll('select'));
    preview.innerHTML = '';
    selects.forEach((select, index) => {
      const card = cardFromCode(select.value);
      const label = select.dataset.label || `Card ${index + 1}`;
      const cardElement = createCardElement(card, label);
      // Store reference to select for animation
      cardElement.dataset.selectId = select.id;
      preview.appendChild(cardElement);
    });
  }

  function pulseCardPreview(selectElement) {
    // Find the corresponding card preview element
    const preview = selectElement.closest('.card-inputs').querySelector('.card-preview');
    if (preview) {
      const cardElements = preview.querySelectorAll('.card-visual');
      cardElements.forEach((cardEl) => {
        if (cardEl.dataset.selectId === selectElement.id) {
          animationManager.pulseCard(cardEl);
        }
      });
    }
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
      updateCombinationsTable(null);
      hideHandAnalysis();
      return;
    }

    try {
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

      updateCombinationsTable(score.category);
      updateHandAnalysis(playerCards, communityCards, score);
    } catch (error) {
      console.error('Hand evaluation error in updateHandSummary:', error);
      handSummary.textContent = 'Unable to evaluate hand. Please check your card selection.';
      updateCombinationsTable(null);
      hideHandAnalysis();
    }
  }

  function updateHandAnalysis(playerCards, communityCards, currentScore) {
    const analysisSection = document.getElementById('hand-analysis-inline');
    const currentHandName = document.getElementById('current-hand-name');
    const currentHandStrength = document.getElementById('current-hand-strength');
    const improvementList = document.getElementById('improvement-list');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    if (playerCards.length < 2) {
      hideHandAnalysis();
      return;
    }

    analysisSection.style.display = 'block';

    // Update current hand info
    const handName = getHandName(currentScore.category);
    currentHandName.textContent = handName;
    
    const handStrength = getHandStrength(currentScore.category);
    currentHandStrength.textContent = `Rank ${10 - currentScore.category} of 10`;

    // Update strength meter - Fixed formula: (category / 8) * 100
    const strengthPercent = (currentScore.category / 8) * 100;
    animationManager.animateBar(strengthBar, strengthPercent);
    strengthText.textContent = `${strengthPercent.toFixed(1)}% strength`;

    // Calculate draw odds using DrawCalculator if not a complete hand
    if (communityCards.length < 5) {
      const drawCalculator = new DrawCalculator(playerCards, communityCards);
      const draws = drawCalculator.calculateDraws();
      updateImprovementList(draws);
    } else {
      improvementList.innerHTML = '<p class="helper-text">Final hand - no more cards to come</p>';
    }
  }

  function hideHandAnalysis() {
    const analysisSection = document.getElementById('hand-analysis-inline');
    analysisSection.style.display = 'none';
  }

  function getHandName(category) {
    const handNames = {
      8: 'Straight Flush',
      7: 'Four of a Kind',
      6: 'Full House',
      5: 'Flush',
      4: 'Straight',
      3: 'Three of a Kind',
      2: 'Two Pair',
      1: 'One Pair',
      0: 'High Card'
    };
    return handNames[category] || 'Unknown';
  }

  function getHandStrength(category) {
    const strengths = {
      8: 'Excellent',      // 100%
      7: 'Very Strong',    // 87.5%
      6: 'Strong',         // 75%
      5: 'Good',           // 62.5%
      4: 'Good',           // 50%
      3: 'Moderate',       // 37.5%
      2: 'Weak',           // 25%
      1: 'Very Weak',      // 12.5%
      0: 'Poor'            // 0%
    };
    return strengths[category] || 'Unknown';
  }



  function updateImprovementList(draws) {
    const improvementList = document.getElementById('improvement-list');
    
    if (draws.length === 0) {
      improvementList.innerHTML = '<p class="helper-text">No significant draws detected</p>';
      return;
    }

    improvementList.innerHTML = draws.map(draw => `
      <div class="improvement-item">
        <span class="improvement-name">${draw.name}</span>
        <span class="improvement-odds">${draw.probability.toFixed(1)}% (${draw.outs} outs)</span>
      </div>
    `).join('');
  }

  function updateCombinationsTable(currentHandCategory) {
    const combinationRows = document.querySelectorAll('.combination-row:not(.combination-header)');
    
    combinationRows.forEach(row => {
      row.classList.remove('current-hand');
      const handCategory = parseInt(row.dataset.handCategory);
      
      if (currentHandCategory !== null && handCategory === currentHandCategory) {
        row.classList.add('current-hand');
      }
    });
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

      // Store results for saving
      lastSimulationResults = { winRate, tieRate, lossRate };

      // Animate percentage updates
      const oldWin = parseFloat(winDisplay.dataset.currentValue || '0');
      const oldTie = parseFloat(tieDisplay.dataset.currentValue || '0');
      const oldLoss = parseFloat(lossDisplay.dataset.currentValue || '0');
      
      const newWin = winRate * 100;
      const newTie = tieRate * 100;
      const newLoss = lossRate * 100;
      
      animationManager.animateValue(winDisplay, oldWin, newWin);
      animationManager.animateValue(tieDisplay, oldTie, newTie);
      animationManager.animateValue(lossDisplay, oldLoss, newLoss);
      
      // Store new values for next animation
      winDisplay.dataset.currentValue = newWin.toString();
      tieDisplay.dataset.currentValue = newTie.toString();
      lossDisplay.dataset.currentValue = newLoss.toString();

      setStatus(
        `Simulated ${iterations.toLocaleString()} hands against ${opponents} opponent${
          opponents > 1 ? 's' : ''
        }.`,
        false
      );
      updateHandSummary();
    } catch (error) {
      // Log detailed error to console for debugging
      console.error('Simulation error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        playerCards: playerCards.map(c => c.code),
        communityCards: communityCards.map(c => c.code),
        opponents: opponents,
        iterations: iterations
      });
      
      // Display specific error message to user
      let userMessage = 'Simulation failed: ';
      if (error.message.includes('player cards')) {
        userMessage += 'Invalid player cards. Please check your card selection.';
      } else if (error.message.includes('evaluation')) {
        userMessage += 'Hand evaluation error. Please try different cards.';
      } else if (error.message.includes('deck')) {
        userMessage += 'Deck generation error. Please reset and try again.';
      } else {
        userMessage += error.message || 'An unexpected error occurred. Please try again.';
      }
      
      setStatus(userMessage, true);
      // UI remains functional - don't clear previous results
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
      option.style.color = isRedSuit ? 'var(--card-red)' : 'var(--select-card-black)';
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
  select.style.color = isRedSuit ? 'var(--card-red)' : 'var(--select-card-black)';
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
    return cardEl;
  }

  const suitInfo = suitMap[card.suit];
  const isRedSuit = card.suit === 'H' || card.suit === 'D';
  
  // Apply consistent red/black color styling
  if (isRedSuit) {
    cardEl.classList.add('card-red');
  } else {
    cardEl.classList.add('card-black');
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

  // Start performance timing
  const startTime = performance.now();

  const playerCodes = new Set(playerCards.map((card) => card.code));
  const communityCodes = new Set(communityCards.map((card) => card.code));

  const wins = { win: 0, tie: 0, loss: 0 };

  for (let i = 0; i < iterations; i += 1) {
    try {
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

      // Use cache for player hand evaluation with error handling
      const playerScore = evaluationCache.evaluate([...playerCards, ...board], evaluateHand);
      let hasLoss = false;
      let hasTie = false;

      for (const opponent of opponentHands) {
        // Use cache for opponent hand evaluation with error handling
        const opponentScore = evaluationCache.evaluate([...opponent, ...board], evaluateHand);
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
    } catch (error) {
      // Log error but continue simulation
      console.error(`Error in simulation iteration ${i + 1}:`, error);
      // Count as a loss to be conservative
      wins.loss += 1;
    }
  }

  // End performance timing and log results
  const endTime = performance.now();
  const duration = endTime - startTime;
  console.log(`Simulation completed: ${iterations.toLocaleString()} iterations in ${duration.toFixed(2)}ms (${(iterations / duration * 1000).toFixed(0)} iterations/sec)`);
  console.log(`Cache stats: ${evaluationCache.cache.size} entries cached`);

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
  // Input validation
  if (!cards) {
    throw new Error('Hand evaluation failed: cards parameter is required');
  }
  
  if (!Array.isArray(cards)) {
    throw new Error('Hand evaluation failed: cards must be an array');
  }
  
  if (cards.length < 2) {
    throw new Error('Hand evaluation failed: at least 2 cards are required for evaluation');
  }
  
  if (cards.length > 7) {
    throw new Error('Hand evaluation failed: maximum 7 cards allowed for evaluation');
  }
  
  // Validate card structure
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card || typeof card !== 'object') {
      throw new Error(`Hand evaluation failed: invalid card at position ${i + 1} - card must be an object`);
    }
    
    if (!card.rank || typeof card.rank !== 'string') {
      throw new Error(`Hand evaluation failed: invalid card at position ${i + 1} - missing or invalid rank`);
    }
    
    if (!card.suit || typeof card.suit !== 'string') {
      throw new Error(`Hand evaluation failed: invalid card at position ${i + 1} - missing or invalid suit`);
    }
    
    if (typeof card.value !== 'number' || card.value < 2 || card.value > 14) {
      throw new Error(`Hand evaluation failed: invalid card at position ${i + 1} - value must be a number between 2 and 14`);
    }
    
    if (!card.code || typeof card.code !== 'string') {
      throw new Error(`Hand evaluation failed: invalid card at position ${i + 1} - missing or invalid code`);
    }
  }
  
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

  // Check for full house: need at least one triple and either a pair or second triple
  if (triples.length > 0 && (pairs.length > 0 || triples.length > 1)) {
    // Sort triples in descending order to get the best full house
    const sortedTriples = [...triples].sort((a, b) => b - a);
    const tripleValue = sortedTriples[0];
    // For the pair, use the second triple if available, otherwise use the highest pair
    const pairValue = triples.length > 1 ? sortedTriples[1] : pairs[0];
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
  // Remove duplicates and sort ascending - no redundant filtering needed
  const valuesAsc = [...new Set(valuesDesc)].sort((a, b) => a - b);

  // Add Ace as 1 for wheel straight detection (A-2-3-4-5)
  if (valuesAsc.includes(14)) {
    valuesAsc.unshift(1);
  }

  let runLength = 1;
  let bestHigh = null;

  for (let i = 1; i < valuesAsc.length; i += 1) {
    if (valuesAsc[i] === valuesAsc[i - 1] + 1) {
      runLength += 1;
      
      if (runLength >= 5) {
        const high = valuesAsc[i];
        // For wheel straight (1-2-3-4-5), return 5 as the high card
        if (high === 5 && valuesAsc[i - 4] === 1) {
          bestHigh = 5;
        } else {
          bestHigh = Math.max(bestHigh || 0, high);
        }
      }
    } else {
      runLength = 1;
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

// EvaluationCache class for caching hand evaluation results
class EvaluationCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 10000; // Limit cache size to 10,000 entries
  }

  // Generate unique cache key from card array
  getCacheKey(cards) {
    // Sort card codes to ensure consistent keys regardless of order
    return cards.map(c => c.code).sort().join('-');
  }

  // Evaluate hand with caching
  evaluate(cards, evaluateFunc) {
    const key = this.getCacheKey(cards);
    
    // Check if result is already cached
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Compute result using provided evaluation function
    const result = evaluateFunc(cards);
    
    // Implement FIFO eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry (first key in Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    // Store result in cache
    this.cache.set(key, result);
    return result;
  }

  // Clear cache (useful when user changes cards)
  clear() {
    this.cache.clear();
  }
}

// Global evaluation cache instance
const evaluationCache = new EvaluationCache();

// DrawCalculator class for calculating draw probabilities and outs
class DrawCalculator {
  constructor(playerCards, communityCards) {
    this.playerCards = playerCards;
    this.communityCards = communityCards;
    this.knownCards = [...playerCards, ...communityCards];
    this.remainingDeck = this.getRemainingDeck();
    this.cardsTocome = 5 - communityCards.length;
  }

  getRemainingDeck() {
    const knownCodes = new Set(this.knownCards.map(card => card.code));
    return FULL_DECK.filter(card => !knownCodes.has(card.code));
  }

  calculateDraws() {
    const draws = [];
    
    if (this.cardsTocome > 0) {
      draws.push(...this.checkFlushDraws());
      draws.push(...this.checkStraightDraws());
      draws.push(...this.checkPairDraws());
      draws.push(...this.checkSetDraws());
    }
    
    return draws;
  }

  checkFlushDraws() {
    const draws = [];
    const suitCounts = new Map();
    
    // Count cards by suit
    this.knownCards.forEach(card => {
      suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    });
    
    // Check for flush draws (4 cards of same suit)
    for (const [suit, count] of suitCounts.entries()) {
      if (count === 4) {
        // Count remaining cards of that suit
        const outs = this.remainingDeck.filter(card => card.suit === suit).length;
        const probability = this.calculateProbability(outs, this.cardsTocome);
        
        draws.push({
          type: 'flush',
          name: `Flush Draw (${suitMap[suit].name})`,
          outs: outs,
          probability: probability
        });
      }
    }
    
    return draws;
  }

  checkStraightDraws() {
    const draws = [];
    const values = [...new Set(this.knownCards.map(card => card.value))].sort((a, b) => a - b);
    
    // Add Ace as 1 for wheel straight detection
    if (values.includes(14)) {
      values.unshift(1);
    }
    
    // Check all possible straight patterns
    const straightPatterns = this.findStraightPatterns(values);
    
    for (const pattern of straightPatterns) {
      if (pattern.type === 'open-ended') {
        const outs = this.countStraightOuts(pattern.needed);
        const probability = this.calculateProbability(outs, this.cardsTocome);
        
        draws.push({
          type: 'straight-open',
          name: 'Open-Ended Straight Draw',
          outs: outs,
          probability: probability
        });
      } else if (pattern.type === 'gutshot') {
        const outs = this.countStraightOuts(pattern.needed);
        const probability = this.calculateProbability(outs, this.cardsTocome);
        
        draws.push({
          type: 'straight-gutshot',
          name: 'Gutshot Straight Draw',
          outs: outs,
          probability: probability
        });
      }
    }
    
    return draws;
  }

  findStraightPatterns(values) {
    const patterns = [];
    
    // Check for 4-card sequences (open-ended and gutshot)
    for (let i = 0; i <= values.length - 4; i++) {
      const sequence = values.slice(i, i + 4);
      
      // Check if it's a 4-card run (open-ended)
      if (sequence[3] - sequence[0] === 3) {
        // Can complete on either end
        const lowNeeded = sequence[0] - 1;
        const highNeeded = sequence[3] + 1;
        const needed = [];
        
        if (lowNeeded >= 1) needed.push(lowNeeded);
        if (highNeeded <= 14) needed.push(highNeeded);
        
        if (needed.length > 0) {
          patterns.push({ type: 'open-ended', needed: needed });
        }
      }
      
      // Check for 3-card run with 1 gap (gutshot)
      if (i <= values.length - 3) {
        for (let j = i; j <= values.length - 3; j++) {
          const seq = values.slice(j, j + 3);
          
          // Check if we have 3 cards that could form a straight with 1 card
          if (seq[2] - seq[0] === 4) {
            // Gap in the middle
            const needed = [seq[0] + 2];
            patterns.push({ type: 'gutshot', needed: needed });
          }
        }
      }
    }
    
    return patterns;
  }

  countStraightOuts(neededValues) {
    let outs = 0;
    
    for (const value of neededValues) {
      // Count how many cards with this value are still in the deck
      outs += this.remainingDeck.filter(card => card.value === value).length;
    }
    
    return outs;
  }

  checkPairDraws() {
    const draws = [];
    const valueCounts = new Map();
    
    // Count card values
    this.knownCards.forEach(card => {
      valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
    });
    
    const pairs = Array.from(valueCounts.entries()).filter(([_, count]) => count === 2);
    
    if (pairs.length > 0) {
      // Calculate odds of improving pair to trips
      const pairValue = pairs[0][0];
      const outsToTrips = this.remainingDeck.filter(card => card.value === pairValue).length;
      
      if (outsToTrips > 0) {
        const probability = this.calculateProbability(outsToTrips, this.cardsTocome);
        draws.push({
          type: 'pair-to-trips',
          name: 'Pair to Three of a Kind',
          outs: outsToTrips,
          probability: probability
        });
      }
      
      // Calculate odds of improving to two pair
      const otherValues = Array.from(valueCounts.keys()).filter(v => v !== pairValue);
      const outsToTwoPair = this.remainingDeck.filter(card => 
        otherValues.includes(card.value) && valueCounts.get(card.value) === 1
      ).length;
      
      if (outsToTwoPair > 0 && this.cardsTocome > 0) {
        const probability = this.calculateProbability(outsToTwoPair, this.cardsTocome);
        draws.push({
          type: 'pair-to-two-pair',
          name: 'Pair to Two Pair',
          outs: outsToTwoPair,
          probability: probability
        });
      }
    }
    
    return draws;
  }

  checkSetDraws() {
    const draws = [];
    const valueCounts = new Map();
    
    // Count card values
    this.knownCards.forEach(card => {
      valueCounts.set(card.value, (valueCounts.get(card.value) || 0) + 1);
    });
    
    const trips = Array.from(valueCounts.entries()).filter(([_, count]) => count === 3);
    
    if (trips.length > 0) {
      const tripValue = trips[0][0];
      
      // Calculate odds of improving to quads
      const outsToQuads = this.remainingDeck.filter(card => card.value === tripValue).length;
      
      if (outsToQuads > 0) {
        const probability = this.calculateProbability(outsToQuads, this.cardsTocome);
        draws.push({
          type: 'trips-to-quads',
          name: 'Three of a Kind to Four of a Kind',
          outs: outsToQuads,
          probability: probability
        });
      }
      
      // Calculate odds of improving to full house
      const pairs = Array.from(valueCounts.entries()).filter(([v, count]) => count === 2 && v !== tripValue);
      const otherValues = Array.from(valueCounts.keys()).filter(v => v !== tripValue);
      
      let outsToFullHouse = 0;
      
      // Outs from pairing any other card
      for (const value of otherValues) {
        const count = valueCounts.get(value) || 0;
        if (count === 1) {
          // 3 outs to pair this card
          outsToFullHouse += this.remainingDeck.filter(card => card.value === value).length;
        }
      }
      
      if (outsToFullHouse > 0) {
        const probability = this.calculateProbability(outsToFullHouse, this.cardsTocome);
        draws.push({
          type: 'trips-to-full-house',
          name: 'Three of a Kind to Full House',
          outs: outsToFullHouse,
          probability: probability
        });
      }
    }
    
    return draws;
  }

  calculateProbability(outs, cardsTocome) {
    if (outs === 0 || cardsTocome === 0) return 0;
    
    const deckSize = this.remainingDeck.length;
    
    if (cardsTocome === 1) {
      // Turn or river only
      return (outs / deckSize) * 100;
    } else if (cardsTocome === 2) {
      // Turn and river - probability of hitting at least once
      const missFirst = (deckSize - outs) / deckSize;
      const missSecond = (deckSize - outs - 1) / (deckSize - 1);
      return (1 - (missFirst * missSecond)) * 100;
    } else {
      // Multiple cards (flop scenarios) - use approximation
      // Rule of thumb: outs * cardsTocome * 2 (capped at reasonable values)
      const approx = Math.min(outs * cardsTocome * 2, 100);
      return approx;
    }
  }
}

// KeyboardManager class for handling keyboard shortcuts
class KeyboardManager {
  constructor() {
    this.shortcuts = {
      'r': () => this.resetAll(),
      'R': () => this.resetAll(),
      'Escape': () => this.closeDropdowns(),
      '1': () => this.setOpponents(1),
      '2': () => this.setOpponents(2),
      '3': () => this.setOpponents(3),
      '4': () => this.setOpponents(4),
      '5': () => this.setOpponents(5)
    };
    this.resetButton = null;
    this.opponentInput = null;
  }

  init(resetButton, opponentInput) {
    this.resetButton = resetButton;
    this.opponentInput = opponentInput;
    
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if user is typing in an input or select
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        // Allow Escape key to blur inputs even when focused
        if (e.key === 'Escape') {
          e.target.blur();
          this.closeDropdowns();
        }
        return;
      }
      
      const handler = this.shortcuts[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    });
  }

  resetAll() {
    if (this.resetButton) {
      this.resetButton.click();
    }
  }

  closeDropdowns() {
    // Close all select dropdowns by blurring them
    document.querySelectorAll('select').forEach(select => {
      select.blur();
    });
    
    // Also blur any focused inputs
    if (document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'SELECT' ||
         document.activeElement.tagName === 'TEXTAREA')) {
      document.activeElement.blur();
    }
  }

  setOpponents(count) {
    if (this.opponentInput && document.activeElement !== this.opponentInput) {
      this.opponentInput.value = count;
      // Trigger input event to update the simulation
      this.opponentInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

// Global keyboard manager instance
const keyboardManager = new KeyboardManager();

// HandHistoryManager class for saving and loading hand scenarios
class HandHistoryManager {
  constructor() {
    this.storageKey = 'poker-calculator-history';
    this.maxHands = 10; // Limit to 10 most recent hands
  }

  /**
   * Save current hand to history
   * @param {Array} playerCards - Player's hole cards
   * @param {Array} communityCards - Community cards
   * @param {number} opponentCount - Number of opponents
   * @param {Object} results - Simulation results (winRate, tieRate, lossRate)
   * @param {string} handDescription - Human-readable hand description
   * @returns {Object} The saved hand object
   */
  saveHand(playerCards, communityCards, opponentCount, results, handDescription) {
    const hands = this.loadHands();
    
    const newHand = {
      id: this.generateId(),
      timestamp: Date.now(),
      playerCards: playerCards.map(c => c.code),
      communityCards: communityCards.map(c => c.code),
      opponentCount: opponentCount,
      results: {
        winRate: results.winRate,
        tieRate: results.tieRate,
        lossRate: results.lossRate
      },
      handDescription: handDescription
    };
    
    // Add to beginning of array (most recent first)
    hands.unshift(newHand);
    
    // Keep only most recent maxHands
    if (hands.length > this.maxHands) {
      hands.length = this.maxHands;
    }
    
    // Save to localStorage using helper
    const success = LocalStorageHelper.setItem(this.storageKey, hands);
    
    if (success) {
      return newHand;
    } else {
      return null;
    }
  }

  /**
   * Load all saved hands from localStorage
   * @returns {Array} Array of saved hand objects
   */
  loadHands() {
    return LocalStorageHelper.getItem(this.storageKey, []);
  }

  /**
   * Delete a specific hand by ID
   * @param {string} id - The hand ID to delete
   * @returns {boolean} True if successful
   */
  deleteHand(id) {
    const hands = this.loadHands();
    const filtered = hands.filter(h => h.id !== id);
    return LocalStorageHelper.setItem(this.storageKey, filtered);
  }

  /**
   * Clear all saved hands
   * @returns {boolean} True if successful
   */
  clearHistory() {
    return LocalStorageHelper.removeItem(this.storageKey);
  }

  /**
   * Generate a unique ID for a hand
   * @returns {string} Unique hand ID
   */
  generateId() {
    return `hand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp in milliseconds
   * @returns {string} Formatted date string
   */
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Global hand history manager instance
const handHistoryManager = new HandHistoryManager();

// LocalStorage error handling utilities
const LocalStorageHelper = {
  /**
   * Safely get an item from localStorage with error handling
   * @param {string} key - The localStorage key
   * @param {*} defaultValue - Default value to return if retrieval fails
   * @returns {*} The parsed value or defaultValue
   */
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`LocalStorage getItem error for key "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Safely set an item in localStorage with error handling
   * @param {string} key - The localStorage key
   * @param {*} value - The value to store (will be JSON stringified)
   * @returns {boolean} True if successful, false otherwise
   */
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded. Attempting to clear old data...');
        
        // Try to clear some space by removing old entries
        try {
          // Clear items that start with 'poker-calculator-' prefix (our app data)
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i);
            if (storageKey && storageKey.startsWith('poker-calculator-')) {
              keysToRemove.push(storageKey);
            }
          }
          
          // Remove oldest entries (keep only the most recent one)
          if (keysToRemove.length > 1) {
            keysToRemove.slice(0, -1).forEach(k => localStorage.removeItem(k));
            
            // Try again after clearing
            try {
              localStorage.setItem(key, JSON.stringify(value));
              console.log('Successfully saved after clearing old data');
              return true;
            } catch (retryError) {
              console.error('Still unable to save after clearing:', retryError);
              this.showStorageError('Storage is full and could not be cleared. Please free up space in your browser.');
              return false;
            }
          } else {
            this.showStorageError('Storage quota exceeded. Please clear your browser data or use a different browser.');
            return false;
          }
        } catch (clearError) {
          console.error('Error while trying to clear storage:', clearError);
          this.showStorageError('Storage quota exceeded and automatic cleanup failed.');
          return false;
        }
      } else {
        console.error(`LocalStorage setItem error for key "${key}":`, error);
        this.showStorageError('Unable to save data. Your browser may have storage disabled.');
        return false;
      }
    }
  },

  /**
   * Safely remove an item from localStorage with error handling
   * @param {string} key - The localStorage key
   * @returns {boolean} True if successful, false otherwise
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`LocalStorage removeItem error for key "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isAvailable() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage is not available:', error);
      return false;
    }
  },

  /**
   * Display a user-friendly error message for storage issues
   * @param {string} message - The error message to display
   */
  showStorageError(message) {
    // Try to find the status display element
    const statusElement = document.getElementById('results-meta');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.classList.add('error');
      
      // Add fade-in animation
      statusElement.style.animation = 'fadeIn 0.2s ease-out';
      setTimeout(() => {
        statusElement.style.animation = '';
      }, 200);
    } else {
      // Fallback to console if status element not found
      console.error('Storage error:', message);
    }
  }
};
