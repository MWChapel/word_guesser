import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Help as HelpIcon,
  Close as CloseIcon
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
  includedLetters: string;
  excludedLetters: string[];
  exactLetters: string[];
  excludeLetters: string[];
}

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  const [masterList, setMasterList] = useState<WordData[]>([]);
  const [filteredMasterList, setFilteredMasterList] = useState<WordData[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    includedLetters: '',
    excludedLetters: Array(26).fill(''),
    exactLetters: ['', '', '', '', ''],
    excludeLetters: ['', '', '', '', '']
  });
  const [validAnswers, setValidAnswers] = useState<WordData[]>([]);
  const [eliminationWords, setEliminationWords] = useState<WordData[]>([]);
  const [rareWords, setRareWords] = useState<WordData[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load and process word data
  useEffect(() => {
    const loadWords = async () => {
      try {
        // Add performance timing
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
          letterScores[letter] = {
            total: 0,
            positions: [0, 0, 0, 0, 0]
          };
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
            
            if (VOWELS.has(letter)) {
              letterScore *= 2;
            }
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
        
        // Log performance metrics
        const endTime = performance.now();
        console.log(`🚀 Word loading completed in ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`📊 Processed ${processedWords.length} words, ${filtered.length} unique words`);
      } catch (error) {
        console.error('Error loading words:', error);
      }
    };

    loadWords();
  }, []);

  // Apply filters
  const applyFilters = async () => {
    const { excludedLetters, exactLetters, excludeLetters } = filterState;
    
    let filtered = [...masterList];
    
    // Filter by included letters (from exact letters positions)
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
    
    // Filter by exclude letters (position-specific exclusions only)
    if (excludeLetters.some(letter => letter !== '')) {
      filtered = filtered.filter((item: WordData) => {
        for (let i = 0; i < 5; i++) {
          if (excludeLetters[i] !== '' && item.arrayVal[i] === excludeLetters[i].toLowerCase()) return false;
        }
        return true;
      });
    }
    
    // Add included letters from exclude positions (they must be in the word somewhere)
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
    
    // Sort by score
    filtered.sort((a: WordData, b: WordData) => b.score - a.score);
    setValidAnswers(filtered);
    
    // Calculate elimination words
    const includedSet = new Set(Array.from(includedLetters.toLowerCase()));
    const excludedSet = new Set(Array.from(excludedLettersString.toLowerCase())); // Only general excluded letters
    const remainingLetters = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(letter => 
      !includedSet.has(letter) && !excludedSet.has(letter)
    );
    
    const elimination = masterList
      .filter((item: WordData) => {
        // No included letters (from both exact and exclude positions)
        for (const letter of Array.from(includedSet)) {
          if (item.uniqueLetters.has(letter)) return false;
        }
        // No general excluded letters (position-specific exclusions don't count here)
        for (const letter of Array.from(excludedSet)) {
          if (item.uniqueLetters.has(letter)) return false;
        }
        // At least 3 remaining letters
        let count = 0;
        for (const letter of item.arrayVal) {
          if (remainingLetters.includes(letter)) count++;
        }
        return count > 2 && item.uniqueLetters.size === 5;
      })
      .sort((a: WordData, b: WordData) => b.score - a.score)
      .slice(0, 40);
    
    setEliminationWords(elimination);

    // If no valid answers, check allwordlist.json for rare words
    if (filtered.length === 0) {
      try {
        const allWordsResponse = await fetch('/allwordlist.json');
        const allWordsData = await allWordsResponse.json();
        // Remove words already in masterList
        const masterSet = new Set(masterList.map(w => w.word));
        // Build WordData for rare words
        const rareWordObjs: WordData[] = allWordsData.words
          .filter((word: string) => !masterSet.has(word))
          .map((word: string) => ({
            word,
            arrayVal: Array.from(word),
            uniqueLetters: new Set(word),
            score: 0
          }));
        // Apply the same filter logic to rareWordObjs
        let rareFiltered = [...rareWordObjs];
        const includedLetters = exactLetters.filter(letter => letter !== '').join('');
        if (includedLetters) {
          const includedSet = new Set(Array.from(includedLetters.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(includedSet)) {
              if (!item.uniqueLetters.has(letter)) return false;
            }
            return true;
          });
        }
        const excludedLettersString = excludedLetters.filter(letter => letter !== '').join('');
        if (excludedLettersString) {
          const excludedSet = new Set(Array.from(excludedLettersString.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(excludedSet)) {
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
        const excludePositionIncludedLetters = excludeLetters.filter(letter => letter !== '').join('');
        if (excludePositionIncludedLetters) {
          const excludeIncludedSet = new Set(Array.from(excludePositionIncludedLetters.toLowerCase()));
          rareFiltered = rareFiltered.filter((item: WordData) => {
            for (const letter of Array.from(excludeIncludedSet)) {
              if (!item.uniqueLetters.has(letter)) return false;
            }
            return true;
          });
        }
        setRareWords(rareFiltered);
      } catch (err) {
        setRareWords([]);
      }
    } else {
      setRareWords([]);
    }
    setShowResults(true);
  };

  const clearFilters = () => {
    setFilterState({
      includedLetters: '',
      excludedLetters: Array(26).fill(''),
      exactLetters: ['', '', '', '', ''],
      excludeLetters: ['', '', '', '', '']
    });
    setValidAnswers([]);
    setEliminationWords([]);
    setRareWords([]);
    setShowResults(false);
  };

  const handleInputChange = (field: keyof FilterState, value: string | string[]) => {
    setFilterState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLetterChange = (field: 'exactLetters' | 'excludeLetters', position: number, value: string) => {
    setFilterState(prev => ({
      ...prev,
      [field]: prev[field].map((letter, index) => index === position ? value.toLowerCase() : letter)
    }));
  };

  const handleExcludedLetterChange = (position: number, value: string) => {
    setFilterState(prev => ({
      ...prev,
      excludedLetters: prev.excludedLetters.map((letter, index) => index === position ? value.toLowerCase() : letter)
    }));
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            🎯 Wordle Chooser
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Find the best words for your Wordle game
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
          
          {/* Filter inputs - each on separate rows */}
          <Box sx={{ mb: 3 }}>
            {/* Row 1: Excluded Letters */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Excluded Letters (click to exclude letters that cannot appear anywhere in the word):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                {Array.from('abcdefghijklmnopqrstuvwxyz').map((letter, index) => (
                  <Button
                    key={index}
                    variant={filterState.excludedLetters[index] ? "contained" : "outlined"}
                    size="small"
                    onClick={() => handleExcludedLetterChange(index, filterState.excludedLetters[index] ? '' : letter)}
                    sx={{
                      minWidth: '45px',
                      width: '45px',
                      height: '45px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: filterState.excludedLetters[index] ? 'error.main' : 'transparent',
                      color: filterState.excludedLetters[index] ? 'white' : 'text.primary',
                      borderColor: filterState.excludedLetters[index] ? 'error.main' : 'grey.300',
                      '&:hover': {
                        backgroundColor: filterState.excludedLetters[index] ? 'error.dark' : 'grey.100',
                        borderColor: 'error.main',
                      }
                    }}
                  >
                    {letter.toUpperCase()}
                  </Button>
                ))}
              </Box>
            </Box>
            
            {/* Row 2: Exact Letters */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Exact Letters (letters that must be in these positions):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {[0, 1, 2, 3, 4].map((position) => (
                  <TextField
                    key={position}
                    size="small"
                    value={filterState.exactLetters[position]}
                    onChange={(e) => handleLetterChange('exactLetters', position, e.target.value)}
                    placeholder=""
                    inputProps={{
                      maxLength: 1,
                      style: { 
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }
                    }}
                    sx={{
                      width: '60px',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: filterState.exactLetters[position] ? 'primary.main' : 'grey.300',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
            
            {/* Row 3: Exclude Letters */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Included Letters (but letters that cannot be in these specific positions):
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {[0, 1, 2, 3, 4].map((position) => (
                  <TextField
                    key={position}
                    size="small"
                    value={filterState.excludeLetters[position]}
                    onChange={(e) => handleLetterChange('excludeLetters', position, e.target.value)}
                    placeholder=""
                    inputProps={{
                      maxLength: 1,
                      style: { 
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                      }
                    }}
                    sx={{
                      width: '60px',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: filterState.excludeLetters[position] ? 'error.main' : 'grey.300',
                        },
                        '&:hover fieldset': {
                          borderColor: 'error.main',
                        },
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={applyFilters}
              size="large"
            >
              Find Words
            </Button>
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={clearFilters}
              size="large"
            >
              Clear Filters
            </Button>
          </Box>
        </Paper>

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
                            '& .MuiChip-label': {
                              px: 0.8
                            }
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

        {/* Results Dialog */}
        <Dialog 
          open={showResults} 
          onClose={handleCloseResults}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { maxHeight: '80vh' }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 1
          }}>
            <Typography variant="h5" component="span">
              📊 Wordle Results
            </Typography>
            <IconButton onClick={handleCloseResults} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 1 }}>
            {/* Valid Answers */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                ✅ Valid Available Answers ({validAnswers.length} words)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {validAnswers.length === 0 ? (
                <Alert severity="warning">No words match your criteria!</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {validAnswers.slice(0, 20).map((word, index) => (
                    <Chip
                      key={word.word}
                      label={`${word.word.toUpperCase()} (${word.score.toLocaleString()})`}
                      variant="filled"
                      color="primary"
                      size="medium"
                    />
                  ))}
                  {validAnswers.length > 20 && (
                    <Chip
                      label={`... and ${validAnswers.length - 20} more`}
                      variant="outlined"
                      size="medium"
                    />
                  )}
                </Box>
              )}
            </Box>

            {/* Rare Words section moved here, above Elimination Words */}
            {validAnswers.length === 0 && rareWords.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  🦄 Rare Words ({rareWords.length} words)
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {rareWords.slice(0, 20).map((word, index) => (
                    <Chip
                      key={word.word}
                      label={word.word.toUpperCase()}
                      variant="outlined"
                      color="secondary"
                      size="medium"
                    />
                  ))}
                  {rareWords.length > 20 && (
                    <Chip
                      label={`... and ${rareWords.length - 20} more`}
                      variant="outlined"
                      size="medium"
                    />
                  )}
                </Box>
              </Box>
            )}

            {/* Elimination Words section remains below */}
            <Box>
              <Typography variant="h6" gutterBottom>
                🎯 Best Elimination Words ({eliminationWords.length} words)
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {eliminationWords.length === 0 ? (
                <Alert severity="info">No suitable elimination words found!</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {eliminationWords.slice(0, 20).map((word, index) => (
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
          </DialogContent>
          
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={handleCloseResults} variant="outlined">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
}

export default App;
