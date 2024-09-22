class Sections {
  constructor(idClassMap) {
    this.sections = new Map();
    for (const [id, cls] of Object.entries(idClassMap)) {
      const elem = document.getElementById(id);
      if (elem === null) {
        throw new Error(`Failed to find element ${id}`);
      }
      this.sections.set(id, new cls(elem, this));
    }
  }

  get(id) {
    return this.sections.get(id);
  }

  hideAll(showId) {
    for (const obj of this.sections.values()) {
      obj.hide();
    }
  }
}

class Section {
  constructor(elem, sections) {
    this.elem = elem;
    this.sections = sections;
  }

  show() {
    this.sections.hideAll();
    this.elem.hidden = false;
  }

  hide() {
    this.elem.hidden = true;
  }

  init(options) {}
}

class Setup extends Section {
  constructor(elem, sections) {
    super(elem, sections);
    this.tables = Array.from(document.querySelectorAll("#tables-select input"));
    this.tables.forEach(input => input.addEventListener("change", () => this.setStartEnabled()));

    this.selectAllButton = document.getElementById("setup-select-all");
    this.selectAllButton.addEventListener("click", () => this.tables.forEach(elem => elem.checked = true));

    this.selectNoneButton = document.getElementById("setup-select-none");
    this.selectNoneButton.addEventListener("click", () => this.tables.forEach(elem => elem.checked = false));

    this.totalQuestions = document.getElementById("setup-total-questions");
    this.allowCorrections = document.getElementById("setup-allow-corrections");

    this.practiceButton = document.getElementById("setup-practice");
    this.practiceButton.addEventListener("click", () => this.startPractice());

    this.startButton = document.getElementById("setup-start");
    this.startButton.addEventListener("click", () => this.startQuiz());
  }

  init() {
    this.setStartEnabled();
  }

  selectedTables() {
    return Array.from(this.tables).filter(x => x.checked).map(x => parseInt(x.value));
  }

  setStartEnabled() {
      this.startButton.disabled = this.selectedTables().length === 0;
  }

  getOptions() {
    return {totalQuestions: parseInt(this.totalQuestions.value),
            allowCorrections: this.allowCorrections.checked,
            tables: this.selectedTables()};
  }

  startQuiz() {
    const questions = this.sections.get("questions");
    questions.init(this.getOptions());
    questions.show();
  }

  startPractice() {
    const practice = this.sections.get("practice");
    practice.init(this.getOptions());
    practice.show();
  }
}

class Practice extends Section {
  constructor(elem, sections) {
    super(elem, sections);
    this.template = document.getElementById("practice-question");
    this.questionsContainer = document.getElementById("practice-questions");

    this.checkButton = document.getElementById("practice-check");
    this.checkButton.addEventListener("click", () => this.check());

    this.correctContainer = document.getElementById("practice-correct");
    this.nextContainer = document.getElementById("practice-next");

    this.restartButton = document.getElementById("practice-restart");
    this.restartButton.addEventListener("click", () => this.restart());

    this.startButton = document.getElementById("practice-start");
    this.startButton.addEventListener("click", () => this.startQuiz());
    this.questions = null;
    this.options = null;
  }

  init(options) {
    this.options = options;
    this.questions = [];
    this.correctContainer.hidden = true;
    this.nextContainer.hidden = true;
    for (const table of options.tables) {
      for (var i=2; i<=12; i++) {
        const question = this.addQuestion([i, table]);
        this.questions.push(question);
        this.questionsContainer.appendChild(question.elem);
      }
    }
    this.questions[0].answerElem.focus();
  }

  addQuestion(operands) {
    const question = this.template.content.cloneNode("true");
    const answer = question.querySelector("input");
    const [numberOne, numberTwo, incorrect] = Array.from(question.querySelectorAll("output"));
    numberOne.textContent = operands[0];
    numberTwo.textContent = operands[1];
    answer.addEventListener("keypress", () => incorrect.hidden = true);
    return {elem: question.children[0],
            answerElem: answer,
            incorrectElem: incorrect,
            answer: operands[0] * operands[1]};
  }

  check() {
    let allCorrect = true;
    for (const question of this.questions) {
      if (parseInt(question.answerElem.value) !== question.answer) {
        question.incorrectElem.hidden = false;
        allCorrect = false;
      }
    }
    if (allCorrect) {
      this.correctContainer.hidden = false;
      this.nextContainer.hidden = false;
    }
  }

  restart() {
    this.correctContainer.hidden = true;
    this.nextContainer.hidden = true;
    for (const question of this.questions) {
      question.answerElem.textContent = "";
    }
    this.questions[0].answerElem.focus();
  }

  startQuiz() {
    for (const question of this.questions) {
      this.questionsContainer.removeChild(question.elem);
    }
    this.questions = null;
    const questions = this.sections.get("questions");
    questions.init({totalQuestions: this.options.totalQuestions,
                    allowCorrections: this.options.allowCorrections,
                    tables: this.options.tables});
    questions.show();
  }
}

class Questions extends Section {
  constructor(elem, sections) {
    super(elem, sections);
    this.currentQuestion = null;
    this.totalQuestions = null;
    this.tables = null;
    this.allowCorrections = null;
    this.startTime = null;
    this.questionsCorrect = null;
    this.numberOne = document.getElementById("questions-number-1");
    this.numberTwo = document.getElementById("questions-number-2");
    this.answer = document.getElementById("questions-answer");
    this.incorrect = document.getElementById("questions-incorrect");
    this.currentQuestionControl = document.getElementById("questions-current-question");
    this.totalQuestionsControl = document.getElementById("questions-total-questions");
    this.answer.addEventListener("keypress", e => {
      this.incorrect.hidden = true;
      if (e.keyCode == 13) {
        this.check();
      }
    });
  }

  init(options) {
    this.currentQuestion = 0;
    this.totalQuestions = options.totalQuestions;
    this.totalQuestionsControl.value = this.totalQuestions;
    this.tables = options.tables;
    this.allowCorrections = options.allowCorrections;
    this.questionsCorrect = 0;
    this.isRepeat = false;
    this.startTime = new Date();
    this.next();
  }

  next() {
    this.answer.value = "";
    this.isRepeat = false;
    if (this.currentQuestion == this.totalQuestions) {
      this.end();
    }
    this.currentQuestion++;
    this.currentQuestionControl.value = this.currentQuestion;
    this.numberOne.value = this.getRandomInt(2, 12);
    this.numberTwo.value = this.tables[this.getRandomInt(0, this.tables.length - 1)];
    this.answer.focus();
  }

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  check() {
    if (parseInt(this.numberOne.value) * parseInt(this.numberTwo.value) ===
        parseInt(this.answer.value)) {
      if (!this.isRepeat) {
        this.questionsCorrect++;
      }
      this.next();
    } else {
      if (this.allowCorrections) {
        this.incorrect.hidden = false;
        this.isRepeat = true;
      } else {
        this.next();
      }
    }
  }

  end() {
    const endTime = new Date();
    const results = this.sections.get("results");
    results.init({correctCount: this.questionsCorrect,
                  totalQuestions: this.totalQuestions,
                  time: (endTime - this.startTime) / 1000,
                  targetTime: this.totalQuestions * 6,
                 });
    results.show();
  }
}

class Results extends Section {
  constructor(elem, sections) {
    super(elem, sections);
    this.correctCount = document.getElementById("results-correct-count");
    this.totalQuestions = document.getElementById("results-total-questions");
    this.time = document.getElementById("results-time");
    this.targetTime = document.getElementById("results-target-time");
    this.restartControl = document.getElementById("results-restart");
    this.restartControl.addEventListener("click", () => this.restart());
  }

  init(options) {
    this.correctCount.value = options.correctCount;
    this.totalQuestions.value = options.totalQuestions;
    this.time.value = Math.round(options.time);
    this.targetTime.value = options.targetTime;
  }

  restart() {
    const setup = this.sections.get("setup");
    setup.init();
    setup.show();
  }
}

function init() {
  const sections = new Sections({"setup": Setup,
                                 "practice": Practice,
                                 "questions": Questions,
                                 "results": Results});
  const setup = sections.get("setup");
  setup.init();
  setup.show();
}

window.addEventListener("load", init);
