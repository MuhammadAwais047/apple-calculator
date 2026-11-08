(function() {
  'use strict';

  // ── State ────────────────────────────────────────────────
  const state = {
    display: '0',
    expression: '',
    operand: null,
    operator: null,
    waitingForOperand: false,
    justEvaluated: false,
    memory: 0,
    sciMode: false,
    parenDepth: 0,
  };

  // ── DOM refs ─────────────────────────────────────────────
  const resultEl = document.getElementById('result');
  const expressionEl = document.getElementById('expression');
  const buttonsEl = document.getElementById('buttons');
  const sciPanel = document.getElementById('sciPanel');
  const modeToggle = document.getElementById('modeToggle');
  const modeIndicator = document.getElementById('modeIndicator');

  // ── Formatting ───────────────────────────────────────────
  function formatNumber(n) {
    if (n === Infinity || n === -Infinity) return 'Error';
    if (isNaN(n)) return 'Error';
    const str = String(n);
    if (str.includes('e')) return str;
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  function updateDisplay(value) {
    const str = String(value);
    resultEl.textContent = str;
    resultEl.className = 'result';
    if (str.length > 12) resultEl.classList.add('xxsmall');
    else if (str.length > 9) resultEl.classList.add('xsmall');
    else if (str.length > 7) resultEl.classList.add('small');
  }

  function updateExpression() {
    expressionEl.textContent = state.expression;
  }

  // ── Calculator Logic ─────────────────────────────────────
  function calculate(a, op, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    switch (op) {
      case 'add':      return numA + numB;
      case 'subtract': return numA - numB;
      case 'multiply': return numA * numB;
      case 'divide':   return numB !== 0 ? numA / numB : 'Error';
      default:         return numB;
    }
  }

  function getOperatorSymbol(op) {
    switch (op) {
      case 'add':      return '+';
      case 'subtract': return '−';
      case 'multiply': return '×';
      case 'divide':   return '÷';
      default:         return '';
    }
  }

  // ── Scientific operations ────────────────────────────────
  function applyUnary(fn) {
    const num = parseFloat(state.display);
    if (isNaN(num) || state.display === 'Error') return;
    let result;
    switch (fn) {
      case 'sin':
        result = Math.sin(num * Math.PI / 180);
        break;
      case 'cos':
        result = Math.cos(num * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(num * Math.PI / 180);
        if (!isFinite(result)) { updateDisplay('Error'); return; }
        break;
      case 'log':
        if (num <= 0) { updateDisplay('Error'); return; }
        result = Math.log10(num);
        break;
      case 'ln':
        if (num <= 0) { updateDisplay('Error'); return; }
        result = Math.log(num);
        break;
      case 'sqrt':
        if (num < 0) { updateDisplay('Error'); return; }
        result = Math.sqrt(num);
        break;
      case 'square':
        result = num * num;
        break;
      case 'cube':
        result = num * num * num;
        break;
      case 'inverse':
        if (num === 0) { updateDisplay('Error'); return; }
        result = 1 / num;
        break;
      case 'factorial':
        if (num < 0 || num > 170 || !Number.isInteger(num)) { updateDisplay('Error'); return; }
        result = factorial(Math.round(num));
        break;
      case 'tenpow':
        result = Math.pow(10, num);
        break;
      case 'abs':
        result = Math.abs(num);
        break;
      default:
        return;
    }
    state.expression = `${fn}(${formatNumber(parseFloat(state.display))})`;
    updateExpression();
    state.display = String(result);
    updateDisplay(formatNumber(result));
    state.justEvaluated = true;
  }

  function factorial(n) {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  // ── Visual helpers ───────────────────────────────────────
  function clearActiveOperator() {
    document.querySelectorAll('.btn-op.active').forEach(el => el.classList.remove('active'));
  }

  function setActiveOperator(op) {
    clearActiveOperator();
    if (op) {
      const btn = document.querySelector(`[data-action="${op}"]`);
      if (btn) btn.classList.add('active');
    }
  }

  function showClearLabel() {
    const clearBtn = document.querySelector('[data-action="clear"]');
    if (clearBtn) {
      clearBtn.textContent = state.display !== '0' ? 'C' : 'AC';
    }
  }

  function createRipple(e, btn) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX || e.touches?.[0]?.clientX || rect.left + rect.width/2) - rect.left - size/2;
    const y = (e.clientY || e.touches?.[0]?.clientY || rect.top + rect.height/2) - rect.top - size/2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ── Mode toggle ──────────────────────────────────────────
  function setMode(mode) {
    const isSci = mode === 'scientific';
    state.sciMode = isSci;
    document.querySelectorAll('.mode-opt').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === mode);
      el.setAttribute('aria-selected', el.dataset.mode === mode);
    });
    sciPanel.classList.toggle('open', isSci);
    modeIndicator.classList.toggle('hidden', !isSci);
  }

  // ── Input handlers ───────────────────────────────────────
  function inputDigit(digit) {
    if (state.justEvaluated) {
      state.display = digit === '.' ? '0.' : digit;
      state.expression = '';
      state.justEvaluated = false;
      state.operand = null;
      state.operator = null;
      clearActiveOperator();
      updateDisplay(state.display);
      showClearLabel();
      return;
    }
    if (state.waitingForOperand) {
      state.display = digit === '.' ? '0.' : digit;
      state.waitingForOperand = false;
      updateDisplay(state.display);
      showClearLabel();
      return;
    }
    if (digit === '.') {
      if (state.display.includes('.')) return;
      state.display += '.';
    } else {
      if (state.display === '0') {
        state.display = digit;
      } else {
        state.display += digit;
      }
    }
    updateDisplay(state.display);
    showClearLabel();
  }

  function inputOperator(op) {
    const current = parseFloat(state.display);
    if (isNaN(current) && state.display !== 'Error') return;

    if (state.justEvaluated) {
      state.justEvaluated = false;
      state.operator = op;
      state.operand = current;
      state.waitingForOperand = true;
      state.expression = formatNumber(current) + ' ' + getOperatorSymbol(op);
      updateExpression();
      setActiveOperator(op);
      return;
    }
    if (state.operator && !state.waitingForOperand) {
      const result = calculate(state.operand, state.operator, current);
      if (result === 'Error') {
        updateDisplay('Error');
        setActiveOperator(null);
        state.operator = null;
        state.operand = null;
        state.waitingForOperand = false;
        return;
      }
      state.display = String(result);
      state.operand = result;
      updateDisplay(formatNumber(result));
    } else {
      state.operand = current;
    }
    state.operator = op;
    state.waitingForOperand = true;
    state.expression = formatNumber(state.operand) + ' ' + getOperatorSymbol(op);
    updateExpression();
    setActiveOperator(op);
  }

  function inputEquals() {
    if (state.operator && !state.waitingForOperand) {
      const current = parseFloat(state.display);
      const result = calculate(state.operand, state.operator, current);
      if (result === 'Error') {
        updateDisplay('Error');
        state.expression = formatNumber(state.operand) + ' ' + getOperatorSymbol(state.operator) + ' ' + formatNumber(current) + ' =';
        updateExpression();
        state.operator = null;
        state.operand = null;
        state.waitingForOperand = false;
        state.justEvaluated = true;
        clearActiveOperator();
        return;
      }
      state.expression = formatNumber(state.operand) + ' ' + getOperatorSymbol(state.operator) + ' ' + formatNumber(current) + ' =';
      updateExpression();
      state.display = String(result);
      updateDisplay(formatNumber(result));
      state.operand = null;
      state.operator = null;
      state.waitingForOperand = true;
      state.justEvaluated = true;
      clearActiveOperator();
    } else if (state.operator && state.waitingForOperand) {
      const current = parseFloat(state.display);
      const result = calculate(state.operand, state.operator, current);
      if (result === 'Error') {
        updateDisplay('Error');
        return;
      }
      state.expression = formatNumber(state.operand) + ' ' + getOperatorSymbol(state.operator) + ' ' + formatNumber(current) + ' =';
      updateExpression();
      state.display = String(result);
      updateDisplay(formatNumber(result));
      state.justEvaluated = true;
    }
  }

  function inputClear() {
    if (state.display !== '0' && !state.justEvaluated && !state.waitingForOperand) {
      state.display = '0';
      updateDisplay('0');
      showClearLabel();
      return;
    }
    state.display = '0';
    state.expression = '';
    state.operand = null;
    state.operator = null;
    state.waitingForOperand = false;
    state.justEvaluated = false;
    state.parenDepth = 0;
    updateDisplay('0');
    updateExpression();
    clearActiveOperator();
    showClearLabel();
  }

  function inputNegate() {
    if (state.display === '0') return;
    if (state.display.startsWith('-')) {
      state.display = state.display.slice(1);
    } else if (state.display !== 'Error') {
      state.display = '-' + state.display;
    }
    updateDisplay(state.display);
  }

  function inputPercent() {
    const num = parseFloat(state.display);
    if (isNaN(num) || state.display === 'Error') return;
    const result = num / 100;
    state.display = String(result);
    updateDisplay(formatNumber(result));
  }

  // ── Scientific input ─────────────────────────────────────
  function inputSci(action) {
    if (action === 'paren-open') {
      state.parenDepth++;
      state.expression += '(';
      updateExpression();
      return;
    }
    if (action === 'paren-close') {
      if (state.parenDepth <= 0) return;
      state.parenDepth--;
      state.expression += ')';
      updateExpression();
      return;
    }
    if (action === 'pi') {
      if (state.justEvaluated || state.waitingForOperand) {
        // Allow using π as a value
      }
      state.display = String(Math.PI);
      state.justEvaluated = true;
      updateDisplay(formatNumber(Math.PI));
      return;
    }
    if (action === 'euler') {
      state.display = String(Math.E);
      state.justEvaluated = true;
      updateDisplay(formatNumber(Math.E));
      return;
    }
    // Unary scientific operations
    applyUnary(action);
  }

  // ── Button click ─────────────────────────────────────────
  function handleButtonClick(e) {
    const btn = e.currentTarget;
    createRipple(e, btn);
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (value !== undefined) {
      inputDigit(value);
    } else if (action === 'clear') {
      inputClear();
    } else if (action === 'negate') {
      inputNegate();
    } else if (action === 'percent') {
      inputPercent();
    } else if (action === 'equals') {
      inputEquals();
    } else if (['sin','cos','tan','log','ln','sqrt','square','cube','inverse','factorial','tenpow','abs','paren-open','paren-close','pi','euler'].includes(action)) {
      inputSci(action);
    } else if (action) {
      inputOperator(action);
    }
  }

  // ── Keyboard support ─────────────────────────────────────
  const KEY_MAP = {
    '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
    '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
    '.': '.',
    '+': 'add',
    '-': 'subtract',
    '*': 'multiply',
    '/': 'divide',
    'Enter': 'equals',
    '=': 'equals',
    'Escape': 'clear',
    'Backspace': 'backspace',
    '%': 'percent',
    '(': 'paren-open',
    ')': 'paren-close',
    'p': 'pi',
    'e': 'euler',
  };

  document.addEventListener('keydown', (e) => {
    const key = e.key;
    const mapped = KEY_MAP[key];
    if (!mapped) return;
    e.preventDefault();

    if (mapped === 'backspace') {
      if (state.justEvaluated || state.waitingForOperand) {
        inputClear();
        return;
      }
      if (state.display.length > 1) {
        state.display = state.display.slice(0, -1);
      } else {
        state.display = '0';
      }
      updateDisplay(state.display);
      showClearLabel();
      return;
    }

    let btn = null;
    const sciActions = ['sin','cos','tan','log','ln','sqrt','square','cube','inverse','factorial','tenpow','abs','paren-open','paren-close','pi','euler'];
    if (['add','subtract','multiply','divide','equals','clear','percent'].includes(mapped)) {
      btn = document.querySelector(`[data-action="${mapped}"]`);
    } else if (sciActions.includes(mapped)) {
      btn = document.querySelector(`[data-action="${mapped}"]`);
    } else if (mapped === 'pi' || mapped === 'euler') {
      btn = document.querySelector(`[data-action="${mapped}"]`);
    } else {
      btn = document.querySelector(`[data-value="${mapped}"]`);
    }
    if (btn) {
      btn.click();
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 100);
    }
  });

  // ── Initialize ───────────────────────────────────────────
  // Mode toggle
  modeToggle.addEventListener('click', (e) => {
    const opt = e.target.closest('.mode-opt');
    if (!opt || opt.classList.contains('active')) return;
    setMode(opt.dataset.mode);
  });
  modeToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const opt = e.target.closest('.mode-opt');
      if (!opt || opt.classList.contains('active')) return;
      setMode(opt.dataset.mode);
    }
  });

  // All buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', handleButtonClick);
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--x', ((e.clientX - rect.left) / rect.width * 100) + '%');
      btn.style.setProperty('--y', ((e.clientY - rect.top) / rect.height * 100) + '%');
    });
  });

  // Prevent double-tap zoom on mobile
  document.addEventListener('dblclick', (e) => e.preventDefault());

  showClearLabel();
})();
