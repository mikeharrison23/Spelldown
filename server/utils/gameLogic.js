const fs = require('fs');
const path = require('path');

// Load the word list
const wordList = fs.readFileSync(path.join(__dirname, '../../words.txt'), 'utf8')
  .split('\n')
  .map(word => word.trim().toLowerCase())
  .filter(word => word.length === 5);

console.log(`Loaded ${wordList.length} valid 5-letter words`);

function validateWord(word) {
  if (!word || typeof word !== 'string' || word.length !== 5) {
    return false;
  }
  return wordList.includes(word.toLowerCase());
}

function checkGuess(guess, targetWord) {
  // Convert both words to uppercase for comparison
  guess = guess.toUpperCase();
  targetWord = targetWord.toUpperCase();
  
  const result = Array(5).fill('');
  const targetLetters = targetWord.split('');
  const guessLetters = guess.split('');
  
  // First pass: mark correct letters
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      targetLetters[i] = null;
      guessLetters[i] = null;
    }
  }
  
  // Second pass: mark present letters
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === null) continue;
    
    const targetIndex = targetLetters.indexOf(guessLetters[i]);
    if (targetIndex !== -1) {
      result[i] = 'present';
      targetLetters[targetIndex] = null;
    } else {
      result[i] = 'absent';
    }
  }
  
  return result;
}

function makeComputerGuess(previousGuesses, targetLength = 5) {
  // Filter words based on previous guesses
  let possibleWords = [...wordList];
  
  for (const { guess, result } of previousGuesses) {
    possibleWords = possibleWords.filter(word => {
      const testResult = checkGuess(guess, word);
      return testResult.every((r, i) => r === result[i]);
    });
  }
  
  // If no valid words remain, return a random word
  if (possibleWords.length === 0) {
    return wordList[Math.floor(Math.random() * wordList.length)];
  }
  
  // Return a random word from possible words
  return possibleWords[Math.floor(Math.random() * possibleWords.length)].toUpperCase();
}

function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = {
  wordList,
  validateWord,
  checkGuess,
  makeComputerGuess,
  generateGameCode
};
