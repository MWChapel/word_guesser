import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  ThemeProvider,
  createTheme,
  CssBaseline,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import './App.css';

// Types
interface WordData {
  word: string;
  arrayVal: string[];
  uniqueLetters: Set<string>;
  score: number;
  secondWords?: string;
}

interface FilterState {
  excludedLetters: string[];
  exactLetters: string[];
  excludeLetters: string[];
}

const MONO = "'JetBrains Mono', 'Fira Code', 'Courier New', monospace";

// Hacker terminal color palette
const WORDLE_GREEN  = '#39d353';
const WORDLE_YELLOW = '#d4b400';
const WORDLE_GREY   = '#4a5a4a';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#090c09',
      paper:   '#0d120d',
    },
    primary: {
      main: '#39d353',
      contrastText: '#000',
    },
    secondary: {
      main: '#d4b400',
      contrastText: '#000',
    },
    text: {
      primary:   '#b8f0b8',
      secondary: '#4a7a4a',
    },
    divider: '#1a3a1a',
  },
  typography: {
    fontFamily: MONO,
    fontSize: 11,
    h3: { fontFamily: MONO, fontSize: '1.4rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const },
    h5: { fontFamily: MONO, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
    h6: { fontFamily: MONO, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em' },
    body1: { fontFamily: MONO, fontSize: '0.75rem' },
    body2: { fontFamily: MONO, fontSize: '0.7rem' },
    caption: { fontFamily: MONO, fontSize: '0.62rem' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid #1a3a1a', borderRadius: 2 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid #1a3a1a', borderRadius: 2 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { fontFamily: MONO, fontSize: '0.68rem', letterSpacing: '0.06em', borderRadius: 2 },
        outlined: { borderColor: '#1e3a1e' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: MONO, fontSize: '0.65rem', borderRadius: 2 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { fontFamily: MONO, fontSize: '0.68rem', borderRadius: 2 },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#1a3a1a' },
      },
    },
  },
});

function App() {
  const [masterList, setMasterList] = useState<WordData[]>([]);
  const [filteredMasterList, setFilteredMasterList] = useState<WordData[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    excludedLetters: Array(26).fill(''),
    exactLetters: ['', '', '', '', ''],
    excludeLetters: ['', '', '', '', '']
  });
  const [validAnswers, setValidAnswers] = useState<WordData[]>([]);
  const [eliminationWords, setEliminationWords] = useState<WordData[]>([]);
  const [rareWords, setRareWords] = useState<WordData[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showAllValid, setShowAllValid] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exactRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);
  const excludeRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null, null]);

  // Load and process word data
  useEffect(() => {
    const loadWords = async () => {
      try {
        const startTime = performance.now();
        const [wordsResponse, usedResponse] = await Promise.all([
          fetch('/wordlist.json'),
          fetch('/usedlist.json')
        ]);

        const wordsData = await wordsResponse.json();
        const usedData = await usedResponse.json();

        const VOWELS = new Set('aeiouy');
        const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

        // Pre-process words
        const processedWords: WordData[] = wordsData.words
          .filter((word: string) => !usedData.words.includes(word.toUpperCase()))
          .map((word: string) => ({
            word,
            arrayVal: Array.from(word),
            uniqueLetters: new Set(word),
            score: 0
          }));

        // Initialize letter scores
        const letterScores: { [key: string]: { total: number; positions: number[] } } = {};
        ALPHABET.forEach(letter => {
          letterScores[letter] = { total: 0, positions: [0, 0, 0, 0, 0] };
        });

        // Calculate letter scores
        processedWords.forEach((wordObj: WordData) => {
          wordObj.arrayVal.forEach((letter: string, position: number) => {
            letterScores[letter].total++;
            letterScores[letter].positions[position]++;
          });
        });

        // Score each word
        processedWords.forEach((wordObj: WordData) => {
          let score = 0;
          wordObj.arrayVal.forEach((letter: string, position: number) => {
            const letterData = letterScores[letter];
            let letterScore = letterData.total + letterData.positions[position];
            if (VOWELS.has(letter)) letterScore *= 2;
            score += letterScore;
          });
          wordObj.score = score;
        });

        // Filter for unique letters and sort
        const filtered = processedWords
          .filter((item: WordData) => item.uniqueLetters.size === 5)
          .sort((a: WordData, b: WordData) => b.score - a.score);

        // Add second words
        filtered.forEach((item: WordData) => {
          const firstLetters = new Set(item.arrayVal);
          const secondWords = processedWords
            .filter((secondWord: WordData) => {
              for (const letter of secondWord.arrayVal) {
                if (firstLetters.has(letter)) return false;
              }
              return true;
            })
            .sort((a: WordData, b: WordData) => b.score - a.score)
            .slice(0, 5)
            .map((word: WordData) => word.word)
            .join(', ');
          item.secondWords = secondWords;
        });

        setMasterList(processedWords);
        setFilteredMasterList(filtered);

        const endTime = performance.now();
        console.log(`🚀 Word loading completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Processed ${processedWords.length} words, ${filtered.length} unique words`);
      } catch (error) {
        console.error('Error loading words:', error);
      }
    };

    loadWords();
  }, []);

  const hasFilters =
    filterState.excludedLetters.some(l => l !== '') ||
    filterState.exactLetters.some(l => l !== '') ||
    filterState.excludeLetters.some(l => l !== '');

  // Auto-filter with debounce whenever filters or word list changes
  useEffect(() => {
    if (!masterList.length) return;
    if (!hasFilters) {
      setValidAnswers([]);
      setEliminationWords([]);
      setRareWords([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runFilters(filterState, masterList);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterState, masterList]); // eslint-disable-line react-hooks/exhaustive-deps

  const runFilters = async (state: FilterState, words: WordData[]) => {
    const { excludedLetters, exactLetters, excludeLetters } = state;

    let filtered = [...words];

    // Filter by included letters (from exact letter positions)
    const includedLetters = exactLetters.filter(letter => letter !== '').join('');
    if (includedLetters) {
      const includedSet = new Set(Array.from(includedLetters.toLowerCase()));
      filtered = filtered.filter((item: WordData) => {
        for (const letter of Array.from(includedSet)) {
          if (!item.uniqueLetters.has(letter)) return false;
        }
        return true;
      });
    }

    // Filter by excluded letters (general exclusions)
    const excludedLettersString = excludedLetters.filter(letter => letter !== '').join('');
    if (excludedLettersString) {
      const excludedSet = new Set(Array.from(excludedLettersString.toLowerCase()));
      filtered = filtered.filter((item: WordData) => {
        for (const letter of Array.from(excludedSet)) {
          if (item.uniqueLetters.has(letter)) return false;
        }
        return true;
      });
    }

    // Filter by exact letters (position-specific)
    if (exactLetters.some(letter => letter !== '')) {
      filtered = filtered.filter((item: WordData) => {
        for (let i = 0; i < 5; i++) {
          if (exactLetters[i] !== '' && item.arrayVal[i] !== exactLetters[i].toLowerCase()) return false;
        }
        return true;
      });
    }

    // Filter by exclude letters (position-specific exclusions)
    if (excludeLetters.some(letter => letter !== '')) {
      filtered = filtered.filter((item: WordData) => {
        for (let i = 0; i < 5; i++) {
          if (excludeLetters[i] !== '' && item.arrayVal[i] === excludeLetters[i].toLowerCase()) return false;
        }
        return true;
      });
    }

    // Yellow letters must still appear somewhere in the word
    const excludePositionIncludedLetters = excludeLetters.filter(letter => letter !== '').join('');
    if (excludePositionIncludedLetters) {
      const excludeIncludedSet = new Set(Array.from(excludePositionIncludedLetters.toLowerCase()));
      filtered = filtered.filter((item: WordData) => {
        for (const letter of Array.from(excludeIncludedSet)) {
          if (!item.uniqueLetters.has(letter)) return false;
        }
        return true;
      });
    }

    filtered.sort((a: WordData, b: WordData) => b.score - a.score);
    setValidAnswers(filtered);
    setShowAllValid(false);

    // Calculate elimination words
    const includedSet = new Set(Array.from(includedLetters.toLowerCase()));
    const excludedSet = new Set(Array.from(excludedLettersString.toLowerCase()));
    const remainingLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter =>
      !includedSet.has(letter) && !excludedSet.has(letter)
    );

    const elimination = words
      .filter((item: WordData) => {
        for (const letter of Array.from(includedSet)) {
          if (item.uniqueLetters.has(letter)) return false;
        }
        for (const letter of Array.from(excludedSet)) {
          if (item.uniqueLetters.has(letter)) return false;
        }
        let count = 0;
        for (const letter of item.arrayVal) {
          if (remainingLetters.includes(letter)) count++;
        }
        return count > 2 && item.uniqueLetters.size === 5;
      })
      .sort((a: WordData, b: WordData) => b.score - a.score)
      .slice(0, 40);

    setEliminationWords(elimination);

    // Always fetch rare words alongside common results
    try {
        const allWordsResponse = await fetch('/allwordlist.json');
        const allWordsData = await allWordsResponse.json();
        const masterSet = new Set(words.map(w => w.word));
        const rareWordObjs: WordData[] = allWordsData.words
          .filter((word: string) => !masterSet.has(word))
          .map((word: string) => ({
            word,
            arrayVal: Array.from(word),
            uniqueLetters: new Set(word),
            score: 0
          }));

        let rareFiltered = [...rareWordObjs];
        if (includedLetters) {
          const iSet = new Set(Array.from(includedLetters.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(iSet)) {
              if (!item.uniqueLetters.has(letter)) return false;
            }
            return true;
          });
        }
        if (excludedLettersString) {
          const eSet = new Set(Array.from(excludedLettersString.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(eSet)) {
              if (item.uniqueLetters.has(letter)) return false;
            }
            return true;
          });
        }
        if (exactLetters.some(letter => letter !== '')) {
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (let i = 0; i < 5; i++) {
              if (exactLetters[i] !== '' && item.arrayVal[i] !== exactLetters[i].toLowerCase()) return false;
            }
            return true;
          });
        }
        if (excludeLetters.some(letter => letter !== '')) {
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (let i = 0; i < 5; i++) {
              if (excludeLetters[i] !== '' && item.arrayVal[i] === excludeLetters[i].toLowerCase()) return false;
            }
            return true;
          });
        }
        if (excludePositionIncludedLetters) {
          const epSet = new Set(Array.from(excludePositionIncludedLetters.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(epSet)) {
              if (!item.uniqueLetters.has(letter)) return false;
            }
            return true;
          });
        }
        setRareWords(rareFiltered);
      } catch (err) {
        setRareWords([]);
      }
  };

  const clearFilters = () => {
    setFilterState({
      excludedLetters: Array(26).fill(''),
      exactLetters: ['', '', '', '', ''],
      excludeLetters: ['', '', '', '', '']
    });
    setValidAnswers([]);
    setEliminationWords([]);
    setRareWords([]);
    setShowAllValid(false);
  };

  const handleLetterChange = (field: 'exactLetters' | 'excludeLetters', position: number, value: string) => {
    const newValue = value.replace(/[^a-zA-Z]/g, '').slice(-1).toLowerCase();
    setFilterState(prev => ({
      ...prev,
      [field]: prev[field].map((letter, index) => index === position ? newValue : letter)
    }));
    // Auto-advance to next position when a letter is typed
    if (newValue && position < 4) {
      const refs = field === 'exactLetters' ? exactRefs : excludeRefs;
      setTimeout(() => refs.current[position + 1]?.focus(), 0);
    }
  };

  const handleLetterKeyDown = (field: 'exactLetters' | 'excludeLetters', position: number, e: React.KeyboardEvent) => {
    // Auto-retreat to previous position on backspace when field is empty
    if (e.key === 'Backspace' && filterState[field][position] === '' && position > 0) {
      const refs = field === 'exactLetters' ? exactRefs : excludeRefs;
      refs.current[position - 1]?.focus();
    }
  };

  const handleExcludedLetterChange = (position: number, value: string) => {
    setFilterState(prev => ({
      ...prev,
      excludedLetters: prev.excludedLetters.map((letter, index) => index === position ? value.toLowerCase() : letter)
    }));
  };

  const displayedValid = showAllValid ? validAnswers : validAnswers.slice(0, 50);

  const positionInputSx = (active: boolean, color: string) => ({
    width: '56px',
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: active ? color : '#1a3a1a',
        borderWidth: active ? 2 : 1,
      },
      '&:hover fieldset': { borderColor: color },
      '&.Mui-focused fieldset': {
        borderColor: color,
        boxShadow: `0 0 8px ${color}55`,
      },
      backgroundColor: active ? `${color}18` : 'transparent',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{
            color: WORDLE_GREEN,
            textShadow: `0 0 12px ${WORDLE_GREEN}88, 0 0 24px ${WORDLE_GREEN}44`,
            letterSpacing: '0.18em',
          }}>
            &gt; WORDLE_CHOOSER
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
            // find the best words for your wordle game
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              href="https://www.nytimes.com/games/wordle/index.html"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none' }}
            >
              Play Wordle
            </Button>
          </Box>
        </Box>

        {/* Filter Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            🎮 Word Filter
          </Typography>

          <Box sx={{ mb: 3 }}>
            {/* Row 1: Grey Letters (excluded entirely) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 1.5, color: WORDLE_GREY }}>
                ⬜ Grey Letters — not in the word at all:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {Array.from('abcdefghijklmnopqrstuvwxyz').map((letter, index) => (
                  <Button
                    key={index}
                    variant={filterState.excludedLetters[index] ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleExcludedLetterChange(index, filterState.excludedLetters[index] ? '' : letter)}
                    sx={{
                      minWidth: '40px',
                      width: '40px',
                      height: '40px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      fontFamily: MONO,
                      textTransform: 'uppercase',
                      backgroundColor: filterState.excludedLetters[index] ? '#160f0f' : 'transparent',
                      color: filterState.excludedLetters[index] ? '#4a2a2a' : '#4a7a4a',
                      borderColor: filterState.excludedLetters[index] ? '#2e1515' : '#1a3a1a',
                      textDecoration: filterState.excludedLetters[index] ? 'line-through' : 'none',
                      opacity: filterState.excludedLetters[index] ? 0.6 : 1,
                      '&:hover': {
                        backgroundColor: filterState.excludedLetters[index] ? '#1e1010' : '#0d1f0d',
                        borderColor: filterState.excludedLetters[index] ? '#3e1a1a' : WORDLE_GREEN,
                        color: filterState.excludedLetters[index] ? '#5a3030' : WORDLE_GREEN,
                        opacity: 1,
                      },
                    }}
                  >
                    {letter.toUpperCase()}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Row 2: Green Letters (exact position) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 1.5, color: WORDLE_GREEN }}>
                🟩 Green Letters — correct letter, correct position:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                {[0, 1, 2, 3, 4].map((position) => (
                  <Box key={position} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {position + 1}
                    </Typography>
                    <TextField
                      inputRef={el => exactRefs.current[position] = el}
                      size="small"
                      value={filterState.exactLetters[position]}
                      onChange={(e) => handleLetterChange('exactLetters', position, e.target.value)}
                      onKeyDown={(e) => handleLetterKeyDown('exactLetters', position, e)}
                      slotProps={{
                        htmlInput: {
                          maxLength: 1,
                          style: {
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            fontSize: '1.4rem',
                            fontWeight: 'bold',
                            color: WORDLE_GREEN,
                          }
                        }
                      }}
                      sx={positionInputSx(!!filterState.exactLetters[position], WORDLE_GREEN)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Row 3: Yellow Letters (in word, wrong position) */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 1.5, color: WORDLE_YELLOW }}>
                🟨 Yellow Letters — in the word, but not in this position:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                {[0, 1, 2, 3, 4].map((position) => (
                  <Box key={position} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {position + 1}
                    </Typography>
                    <TextField
                      inputRef={el => excludeRefs.current[position] = el}
                      size="small"
                      value={filterState.excludeLetters[position]}
                      onChange={(e) => handleLetterChange('excludeLetters', position, e.target.value)}
                      onKeyDown={(e) => handleLetterKeyDown('excludeLetters', position, e)}
                      slotProps={{
                        htmlInput: {
                          maxLength: 1,
                          style: {
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            fontSize: '1.4rem',
                            fontWeight: 'bold',
                            color: WORDLE_YELLOW,
                          }
                        }
                      }}
                      sx={positionInputSx(!!filterState.excludeLetters[position], WORDLE_YELLOW)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="large"
              disabled={!hasFilters}
            >
              Clear Filters
            </Button>
            {hasFilters && (
              <Typography variant="body2" color="text.secondary">
                Results update automatically as you type
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Inline Results Section — visible whenever any filter is set */}
        {hasFilters && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h2" gutterBottom>
              📊 Results
            </Typography>

            {/* Valid Answers */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                ✅ Valid Answers ({validAnswers.length} {validAnswers.length === 1 ? 'word' : 'words'})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {validAnswers.length === 0 ? (
                <Alert severity="warning">No common words match your criteria.</Alert>
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {displayedValid.map((word) => (
                      <Chip
                        key={word.word}
                        label={`${word.word.toUpperCase()} (${word.score.toLocaleString()})`}
                        variant="filled"
                        color="primary"
                        size="medium"
                      />
                    ))}
                  </Box>
                  {validAnswers.length > 50 && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setShowAllValid(v => !v)}
                      sx={{ mt: 0.5 }}
                    >
                      {showAllValid ? 'Show fewer' : `Show all ${validAnswers.length} words`}
                    </Button>
                  )}
                </>
              )}
            </Box>

            {/* Rare Words — always shown when any match */}
            {rareWords.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  🦄 Rare Words ({rareWords.length} {rareWords.length === 1 ? 'word' : 'words'})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {rareWords.slice(0, 50).map((word) => (
                    <Chip
                      key={word.word}
                      label={word.word.toUpperCase()}
                      variant="outlined"
                      color="secondary"
                      size="medium"
                    />
                  ))}
                  {rareWords.length > 50 && (
                    <Chip
                      label={`... and ${rareWords.length - 50} more`}
                      variant="outlined"
                      size="medium"
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Elimination Words */}
            <Box>
              <Typography variant="h6" gutterBottom>
                🎯 Best Elimination Words ({eliminationWords.length} {eliminationWords.length === 1 ? 'word' : 'words'})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {eliminationWords.length === 0 ? (
                <Alert severity="info">No suitable elimination words found.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {eliminationWords.slice(0, 20).map((word) => (
                    <Chip
                      key={word.word}
                      label={`${word.word.toUpperCase()} (${word.score.toLocaleString()})`}
                      variant="filled"
                      color="secondary"
                      size="medium"
                    />
                  ))}
                  {eliminationWords.length > 20 && (
                    <Chip
                      label={`... and ${eliminationWords.length - 20} more`}
                      variant="outlined"
                      size="medium"
                    />
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Top Words Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              🏆 Top 10 Best First Words
            </Typography>
            <Tooltip title="Help">
              <IconButton onClick={() => setShowHelp(!showHelp)} sx={{ ml: 1 }}>
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {showHelp && (
            <Alert severity="info" sx={{ mb: 2 }}>
              These are the best starting words based on letter frequency and position scoring.
              Each word is paired with the best second words that have no letters in common.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {filteredMasterList.slice(0, 10).map((item, index) => (
              <Box key={item.word} sx={{ flex: '1 1 280px', minWidth: 0 }}>
                <Card sx={{
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" component="span" sx={{ mr: 1, fontSize: '1.1rem' }}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </Typography>
                      <Typography variant="h6" component="span" sx={{
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        color: index < 3 ? 'primary.main' : 'text.primary'
                      }}>
                        {item.word.toUpperCase()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.85rem' }}>
                      Score: {item.score.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'text.secondary',
                      mb: 0.5
                    }}>
                      Best Second Words:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                      {item.secondWords?.split(', ').map((word, i) => (
                        <Chip
                          key={i}
                          label={word.toUpperCase()}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: '0.65rem',
                            height: '20px',
                            '& .MuiChip-label': { px: 0.8 }
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
